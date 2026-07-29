// =============================================================================
// test-e2e.mjs — Playwright 浏览器端「全流程跑通」E2E 测试
// -----------------------------------------------------------------------------
// 用途：用无头 Chromium 真实加载 http://localhost:8088，自动打通四种天气的
//       约会主流程到达某个结局屏，并对成就/贴士/相册/商店/音乐馆等子系统做
//       冒烟（打开不抛错）。
//
// 运行方式（先安装依赖，再跑）：
//   cd C:\Users\Pengcheng_Li\.workbuddy\binaries\node\workspace
//   npm.cmd install playwright
//   node node_modules/playwright/cli.js install chromium
//
//   NODE_PATH=C:\Users\Pengcheng_Li\.workbuddy\binaries\node\workspace/node_modules ^
//   C:\Users\Pengcheng_Li\.workbuddy\binaries\node\versions\22.22.2\node.exe ^
//   tools/test-e2e.mjs
//
// 关键坑处理：
//   * index.html 从 cdnjs 加载 Tone.js，仅在 hoverBeep() 用到且无 undefined 保护；
//     无头环境 CDN 可能被墙 → 用 page.route 拦截返回空，并用 addInitScript 注入
//     window.Tone 桩，避免 mouseenter 抛 ReferenceError。
//   * 通过注入 localStorage._visited=1 跳过 ~3s 加载屏。
//   * 每个天气用独立 context（localStorage 隔离）。
// =============================================================================
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 解析 playwright：ESM 的 import 不读取 NODE_PATH，因此用 createRequire 从
// 独立的 workspace（C:\Users\...\binaries\node\workspace）定位，避免污染游戏目录。
const PLAYWRIGHT_WORKSPACE = 'C:\\Users\\Pengcheng_Li\\.workbuddy\\binaries\\node\\workspace';
let chromium = null;
try {
  const req = createRequire(path.join(PLAYWRIGHT_WORKSPACE, 'package.json'));
  chromium = req('playwright').chromium;
} catch (e) {
  // 兜底：直接用绝对路径动态导入
  chromium = (await import(path.join(PLAYWRIGHT_WORKSPACE, 'node_modules', 'playwright', 'index.js'))).chromium;
}

const NODE = process.env.TEST_NODE || 'C:\\Users\\Pengcheng_Li\\.workbuddy\\binaries\\node\\versions\\22.22.2\\node.exe';
const PORT = 8088;
const BASE = `http://localhost:${PORT}`;

// 确定性策略：greedy 选分最高且“不会立即触底”的选项，简单难度降低衰减风险。
const WEATHERS = ['晴天', '多云', '雨天', '雪天'];

// 子系统冒烟：尝试调用的全局打开函数（存在才调用，否则跳过并备注）
const SMOKE_OPENERS = [
  { name: '成就面板', fn: 'showAchievements' },
  { name: '恋爱手册(贴士)', fn: 'showLoveTips' },
  { name: '相册', fn: 'showAlbum' },
  { name: '商店', fn: 'showGiftShop' },
  { name: '音乐馆', fn: 'showMusicHall' },
];

// 良性报错（忽略）：favicon 404 / Tone / BGM mp3 404（SoundManager.playBgm 内部 .catch）
function isBenign(text) {
  const t = String(text || '');
  return /favicon|Tone|\.mp3|playBgm|SoundManager/i.test(t);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// -----------------------------------------------------------------------------
// 启动静态服务器并等待就绪
// -----------------------------------------------------------------------------
async function startServer() {
  const server = spawn(NODE, ['serve.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => {
    const s = d.toString();
    if (/Serving/i.test(s)) console.log('  [serve] ' + s.trim());
  });
  server.stderr.on('data', (d) => console.error('  [serve:err] ' + d.toString()));

  // 轮询就绪
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok) return server;
    } catch (e) { /* not ready */ }
    await sleep(200);
  }
  throw new Error('静态服务器在 15s 内未就绪');
}

// -----------------------------------------------------------------------------
// 为页面装配通用拦截 / 桩 / 错误收集
// -----------------------------------------------------------------------------
async function setupPage(page, errors) {
  // 拦截 Tone.js（返回空），避免 CDN 被墙导致 hover 抛错
  await page.route('**/Tone.js', (r) =>
    r.fulfill({ contentType: 'application/javascript', body: '' }));
  // 注入 Tone 桩 + 跳过加载屏
  await page.addInitScript(() => {
    window.Tone = {
      Synth: function () {
        return {
          toDestination() { return this; },
          triggerAttackRelease() {},
          connect() {},
          start() {},
          stop() {},
        };
      },
    };
    try { localStorage.setItem('_visited', '1'); } catch (e) {}
  });
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!isBenign(t)) errors.push('console.error: ' + t);
    }
  });
  page.on('pageerror', (e) => {
    const t = (e && e.message) || String(e);
    if (!isBenign(t)) errors.push('pageerror: ' + t);
  });
}

const isEndingVisible = (sel) =>
  `(function(){var el=document.querySelector(${JSON.stringify(sel)});` +
  `if(!el)return false;return getComputedStyle(el).display!=='none';})()`;

async function waitGameReady(page) {
  await page.waitForFunction(() => {
    const ls = document.getElementById('loading-screen');
    const hidden = !ls || getComputedStyle(ls).display === 'none' || ls.offsetParent === null;
    return hidden;
  }, { timeout: 8000 });
  await page.waitForFunction(
    () => window.gameData && Object.keys(window.gameData).length > 0,
    { timeout: 8000 });
}

// 在 #choices 中选取“可见选项按钮”（排除物品按钮），返回索引
async function pickBestChoiceIndex(page) {
  return page.evaluate(() => {
    const w = window.selectData.weather;
    const evs = window.gameData[w];
    const i = window.gameState.currentEvent;
    const ev = evs && evs[i];
    if (!ev) return null;
    const gs = window.gameState;
    const filtered = ev.choices
      .map((c, idx) => ({ c, idx }))
      .filter(({ c }) => {
        if (c.reqLike != null && gs.like < c.reqLike) return false;
        if (c.requireItem && !(gs.inventory && gs.inventory[c.requireItem] > 0)) return false;
        return true;
      });
    if (!filtered.length) return null;
    // 评分（与任务给定公式一致）
    const scored = filtered.map(({ c, idx }) => ({
      idx,
      c,
      score: (c.like || 0) + (c.heart || 0) * 1.5 - Math.abs(c.money || 0) * 0.1,
    }));
    // 资金安全：若最高分选项会让 money<=0，则优先在“不会触底”的选项中取最高分
    // （简单难度下 c.money 即实际变动，安全子集非空时尽量不自杀，提升好结局概率）
    const safe = scored.filter((x) => (gs.money + (x.c.money || 0)) > 0);
    const pool = safe.length ? safe : scored;
    let best = pool[0];
    for (const x of pool) if (x.score > best.score) best = x;
    return best.idx;
  });
}

async function endingState(page) {
  return page.evaluate(() => {
    const vis = (sel) => {
      const el = document.querySelector(sel);
      return !!el && getComputedStyle(el).display !== 'none';
    };
    return {
      result: vis('#result'),
      bad: vis('#bad-end'),
      mood: vis('#mood-end'),
      any: vis('#result') || vis('#bad-end') || vis('#mood-end'),
    };
  });
}

// -----------------------------------------------------------------------------
// 跑通一局（指定天气）
// -----------------------------------------------------------------------------
async function playWeather(browser, weather) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  await setupPage(page, errors);

  await page.goto(BASE, { waitUntil: 'load' });
  await waitGameReady(page);

  // 选天气 + 简单难度（默认已是 简单/白天，这里再显式选一次天气以防偏差）
  await page.evaluate((w) => {
    if (typeof selectWeather === 'function') selectWeather(w);
    if (typeof selectDifficulty === 'function') selectDifficulty('简单', 30, false);
  }, weather);

  await page.evaluate(() => { if (typeof startGame === 'function') startGame(); });

  // 等待首屏选项渲染
  await page.waitForFunction(
    () => window.gameState && window.gameState.currentEvent === 0 &&
      document.querySelectorAll('#choices .choice-btn:not([data-item])').length > 0,
    { timeout: 8000 });

  let guard = 0;
  let reached = null;
  while (guard++ < 120) {
    const st = await endingState(page);
    if (st.any) { reached = st; break; }
    // 等待选项或结局出现
    try {
      await page.waitForFunction(() => {
        const vis = (sel) => { const el = document.querySelector(sel); return !!el && getComputedStyle(el).display !== 'none'; };
        if (vis('#result') || vis('#bad-end') || vis('#mood-end')) return true;
        return document.querySelectorAll('#choices .choice-btn:not([data-item])').length > 0;
      }, { timeout: 8000 });
    } catch (e) {
      errors.push(`[${weather}] 等待选项/结局超时 (guard=${guard})`);
      break;
    }
    const st2 = await endingState(page);
    if (st2.any) { reached = st2; break; }

    const pick = await pickBestChoiceIndex(page);
    if (pick == null) { await sleep(200); continue; }

    const before = await page.evaluate(() => window.gameState.currentEvent);
    const btns = await page.$$('#choices .choice-btn:not([data-item])');
    if (pick >= btns.length) {
      errors.push(`[${weather}] 选项索引越界 pick=${pick} len=${btns.length}`);
      break;
    }
    await btns[pick].click();

    try {
      await page.waitForFunction((prev) => {
        const gs = window.gameState;
        if (gs && gs.currentEvent !== prev) return true;
        const vis = (sel) => { const el = document.querySelector(sel); return !!el && getComputedStyle(el).display !== 'none'; };
        return vis('#result') || vis('#bad-end') || vis('#mood-end');
      }, before, { timeout: 8000 });
    } catch (e) {
      errors.push(`[${weather}] 点击后等待下一事件/结局超时`);
      break;
    }
  }

  const result = {
    weather,
    reached,
    errors,
  };
  await ctx.close();
  return result;
}

// -----------------------------------------------------------------------------
// 子系统冒烟：打开各面板，断言不抛未预期报错
// -----------------------------------------------------------------------------
async function smokeSubsystems(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  await setupPage(page, errors);

  await page.goto(BASE, { waitUntil: 'load' });
  await waitGameReady(page);
  // 开局以确保 gameState 存在（相册/成就等依赖它）
  await page.evaluate(() => { if (typeof startGame === 'function') startGame(); });
  await page.waitForFunction(
    () => window.gameState && window.gameState.currentEvent === 0,
    { timeout: 8000 });

  const results = [];
  for (const opener of SMOKE_OPENERS) {
    const before = errors.length;
    let called = false, note = '';
    try {
      const exists = await page.evaluate((fn) => typeof window[fn] === 'function', opener.fn);
      if (!exists) {
        results.push({ name: opener.name, ok: null, note: `全局函数 ${opener.fn}() 不存在，跳过` });
        continue;
      }
      await page.evaluate((fn) => window[fn](), opener.fn);
      called = true;
      await sleep(150);
    } catch (e) {
      errors.push(`[smoke:${opener.name}] 调用 ${opener.fn} 抛错: ${e.message}`);
    }
    const after = errors.length;
    const ok = after === before;
    // 关闭所有已打开的弹层，避免叠加
    await page.evaluate(() => {
      document.querySelectorAll('.show').forEach((e) => e.classList.remove('show'));
    });
    await sleep(80);
    results.push({
      name: opener.name,
      ok: called ? ok : false,
      note: ok ? '' : (errors.slice(before).join(' ; ') || '未知错误'),
    });
  }

  await ctx.close();
  return { results, errors };
}

// -----------------------------------------------------------------------------
// 主流程
// -----------------------------------------------------------------------------
async function main() {
  console.log('========================================================');
  console.log(' 约会小故事 · E2E 全流程跑通测试 (Playwright)');
  console.log(' 项目根: ' + ROOT);
  console.log('========================================================\n');

  let server;
  try {
    console.log('[1/4] 启动静态服务器 ...');
    server = await startServer();
    console.log('       服务就绪: ' + BASE);
  } catch (e) {
    console.error('       启动失败: ' + e.message);
    process.exit(1);
  }

  let browser;
  try {
    console.log('[2/4] 启动 Chromium (headless) ...');
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.error('       Chromium 启动失败: ' + e.message);
    console.error('       （可能未安装：先 `npm install playwright` 再 `playwright install chromium`）');
    server.kill();
    process.exit(1);
  }

  const weatherResults = [];
  try {
    console.log('[3/4] 跑通四种天气主流程 ...');
    for (const w of WEATHERS) {
      process.stdout.write(`       · ${w} ... `);
      const r = await playWeather(browser, w);
      const ok = r.reached && r.reached.any && r.errors.length === 0;
      const which = r.reached
        ? (r.reached.result ? '好结局' : r.reached.bad ? '坏结局' : r.reached.mood ? '挑战失败结局' : '?')
        : '未到达结局';
      console.log(ok ? `OK (${which})` : `FAIL (${which})` + (r.errors.length ? ` 错误:${r.errors.length}` : ''));
      weatherResults.push({ weather: w, ok, which, errors: r.errors });
    }

    console.log('[4/4] 子系统冒烟 ...');
    const smoke = await smokeSubsystems(browser);
    console.log('       · 面板打开结果:');
    for (const s of smoke.results) {
      const tag = s.ok === true ? 'OK' : s.ok === null ? 'SKIP' : 'FAIL';
      console.log(`         - ${s.name}: ${tag}${s.note ? '  (' + s.note + ')' : ''}`);
    }
    if (smoke.errors.length) {
      console.log('       冒烟期间未预期报错:');
      smoke.errors.forEach((e) => console.log('         ✗ ' + e));
    }

    // 汇总
    console.log('\n' + '='.repeat(60));
    const allWeatherOk = weatherResults.every((r) => r.ok);
    const smokeFails = smoke.results.filter((s) => s.ok === false);
    const anySmokeErr = smoke.errors.length > 0;
    const totalFail = weatherResults.filter((r) => !r.ok).length + smokeFails.length + (anySmokeErr ? 1 : 0);

    console.log('天气主流程:');
    weatherResults.forEach((r) =>
      console.log(`   ${r.ok ? '✓' : '✗'} ${r.weather} → ${r.which}${r.errors.length ? '  [' + r.errors.length + ' 错误]' : ''}`));
    console.log('子系统冒烟:');
    smoke.results.forEach((s) =>
      console.log(`   ${s.ok === true ? '✓' : s.ok === null ? '○' : '✗'} ${s.name}${s.note ? '  (' + s.note + ')' : ''}`));

    console.log('\n汇总: 天气失败 ' + weatherResults.filter((r) => !r.ok).length +
      ' / 子系统失败 ' + smokeFails.length +
      (anySmokeErr ? ' / 另有未预期报错' : ''));

    if (totalFail === 0) {
      console.log('结论: PASS — 四种天气均能跑通到结局，子系统冒烟无未预期报错。');
      await browser.close();
      server.kill();
      process.exit(0);
    } else {
      console.log('结论: FAIL — 见上方明细。');
      await browser.close();
      server.kill();
      process.exit(1);
    }
  } catch (e) {
    console.error('E2E 运行异常: ' + e.stack);
    if (browser) await browser.close().catch(() => {});
    if (server) server.kill();
    process.exit(1);
  }
}

main();
