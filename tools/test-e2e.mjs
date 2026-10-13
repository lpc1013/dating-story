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

const NODE = process.env.TEST_NODE || process.execPath;
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
  // fail-fast：spawn 前探测 PORT 是否已被占用。若此时就能 fetch 到内容，
  // 说明是别人的/残留的服务器（EADDRINUSE 场景），继续跑会"测错对象"。
  try {
    const probe = await fetch(BASE + '/', { signal: AbortSignal.timeout(1500) });
    if (probe) {
      throw new Error(`端口 ${PORT} 已被占用（探测到已有 HTTP 响应），请先结束残留 node/serve 进程再重跑`);
    }
  } catch (e) {
    if (/已被占用/.test(String(e && e.message))) throw e;
    // fetch 失败（连接拒绝/超时）= 端口空闲，正常继续
  }
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
    // 持有判定必须复用**游戏自身**的 hasItem（js/event-render.js），不能在测试里
    // 另写一份。inventory[id] 存的是对象 { icon, count, ... }，历史上这里抄的是
    // `inventory[id] > 0`（对象与数字比较恒 false）——一旦与游戏侧判定漂移，
    // filtered 的长度就会与 DOM 中实际渲染的按钮数不一致，导致下方 findIndex
    // 算出的序号指向**另一个**按钮（静默点错选项，且测试仍然"通过"）。
    const has = (id) => (typeof window.hasItem === 'function')
      ? window.hasItem(id)
      : (function () { // 兜底：游戏侧未导出时按正确语义判定
          const inv = gs && gs.inventory; if (!inv) return false;
          const e = inv[id]; if (e == null) return false;
          if (typeof e === 'number') return e > 0;
          return (Number(e.count) || 0) > 0;
        })();
    const filtered = ev.choices
      .map((c, idx) => ({ c, idx }))
      .filter(({ c }) => {
        if (c.reqLike != null && gs.like < c.reqLike) return false;
        if (c.requireItem && !has(c.requireItem)) return false;
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
    // 返回 best 在「过滤后可见列表 filtered」中的序号（0..filtered.length-1），
    // 与 DOM 中按可见顺序渲染的 .choice-btn:not([data-item]) 按钮下标一一对应。
    // 注意不能返回 best.idx（ev.choices 数据层原始索引）：当 requireItem/reqLike
    // 隐藏了排在前面的选项时，原始索引会相对可见按钮数组错位甚至越界。
    return filtered.findIndex((f) => f.idx === best.idx);
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
    const btns = await page.$$('#choices .choice-btn:not([data-item]):not(.choice-locked)');
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
// 道具联动真实浏览器验证（T2 三处修复的浏览器侧自证）
// -----------------------------------------------------------------------------
// 静态测试的 (F)(G) 块用的是沙箱 + DOM 桩；本块在**真实 Chromium + 真实 DOM**里复验：
//   1. hasItem 对真实 acquireItem 写入格式（对象 {icon,count}）判定正确
//   2. requireItem 门控：未持有→选项不渲染；持有→选项渲染（真实 #choices DOM）
//   3. bestIdx 提示与实际渲染一致（不会"提示指向看不见的选项"）
//   4. 商店礼物买入后，事件内赠予按钮真实注入
// 用真实剧情内容 sunny2「没电的窘境」（全库唯一 requireItem 事件）。
// -----------------------------------------------------------------------------
async function smokeItemLinkage(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail: detail || '' });

  await setupPage(page, errors);
  await page.goto(BASE, { waitUntil: 'load' });
  await waitGameReady(page);

  // --- 开局并强制切到 sunny2 变体线（全库唯一含 requireItem 的线）---
  await page.evaluate(() => {
    if (typeof selectWeather === 'function') selectWeather('晴天');
    if (typeof selectDifficulty === 'function') selectDifficulty('简单', 30, false);
    if (typeof startGame === 'function') startGame();
  });
  await page.waitForFunction(() => window.gameState && window.gameState.currentEvent === 0, { timeout: 8000 });

  const forced = await page.evaluate(() => {
    const keys = (window.StoryLoader && StoryLoader.variantKeys && StoryLoader.variantKeys['晴天']) || [];
    const idx = keys.indexOf('sunny2');
    if (idx < 0) return { ok: false, keys };
    window.gameData['晴天'] = StoryLoader.variants['晴天'][idx];
    window.selectData.variantKey = 'sunny2';
    // 定位全库唯一的 requireItem 选项所在事件
    const evs = window.gameData['晴天'];
    let evIdx = -1, chText = null, reqId = null;
    for (let i = 0; i < evs.length; i++) {
      const c = (evs[i].choices || []).find((x) => x.requireItem);
      if (c) { evIdx = i; chText = (c.text || '').split('\n')[0]; reqId = c.requireItem; break; }
    }
    return { ok: true, keys, total: evs.length, evIdx, chText, reqId, evTitle: evIdx >= 0 ? evs[evIdx].title : null };
  });

  add('强制切换到 sunny2 变体线', forced.ok, forced.ok ? `变体键=[${forced.keys}] 共 ${forced.total} 事件` : `未找到 sunny2，keys=[${forced.keys}]`);
  if (!forced.ok || forced.evIdx < 0) {
    add('定位 requireItem 事件', false, '在 sunny2 中未找到任何 requireItem 选项');
    await ctx.close();
    return { checks, errors };
  }
  add('定位 requireItem 事件', true, `事件[${forced.evIdx}]「${forced.evTitle}」选项「${forced.chText}」requireItem=${forced.reqId}`);

  // --- 1) hasItem 在真实页面存在且语义正确 ---
  const hasItemProbe = await page.evaluate((reqId) => {
    if (typeof window.hasItem !== 'function') return { exists: false };
    const gs = window.gameState;
    const backup = gs.inventory;
    const r = {};
    gs.inventory = null;                                   r.nullInv = window.hasItem(reqId);
    gs.inventory = {};                                     r.emptyInv = window.hasItem(reqId);
    gs.inventory = { [reqId]: { icon: '🔋', count: 1 } };   r.objCount1 = window.hasItem(reqId);
    gs.inventory = { [reqId]: { icon: '🔋', count: 0 } };   r.objCount0 = window.hasItem(reqId);
    gs.inventory = { [reqId]: { icon: '🔋' } };             r.objNoCount = window.hasItem(reqId);
    gs.inventory = { [reqId]: 1 };                         r.legacyNum = window.hasItem(reqId);
    // 旧写法在同一份数据上的判定（缺陷复现对照）
    r.legacyVerdictOnObj = !!({ [reqId]: { icon: '🔋', count: 1 } }[reqId] > 0);
    gs.inventory = backup;
    return { exists: true, ...r };
  }, forced.reqId);

  add('页面暴露全局 hasItem()', hasItemProbe.exists, hasItemProbe.exists ? 'OK' : 'window.hasItem 不存在');
  if (hasItemProbe.exists) {
    const semOk = hasItemProbe.nullInv === false && hasItemProbe.emptyInv === false &&
      hasItemProbe.objCount1 === true && hasItemProbe.objCount0 === false &&
      hasItemProbe.objNoCount === false && hasItemProbe.legacyNum === true;
    add('hasItem 六种形态语义正确（真实浏览器）', semOk,
      `null=${hasItemProbe.nullInv} 空={${hasItemProbe.emptyInv}} 对象count1=${hasItemProbe.objCount1} ` +
      `count0=${hasItemProbe.objCount0} 无count=${hasItemProbe.objNoCount} 数字1=${hasItemProbe.legacyNum}`);
    add('缺陷复现对照：旧写法对同一对象判定为未持有', hasItemProbe.legacyVerdictOnObj === false,
      `旧 inventory[id]>0 = ${hasItemProbe.legacyVerdictOnObj}（false 即证明旧代码会隐藏该选项）`);
  }

  // 渲染指定事件并读取真实 DOM 中的选项
  const renderAndRead = async (evIdx, inventory) => {
    await page.evaluate(({ evIdx, inventory }) => {
      window.gameState.inventory = inventory;
      window.gameState.currentEvent = evIdx;
      window.gameState.isHintRevealed = true;   // 同时验证 bestIdx 求解与渲染一致
      showEvent(evIdx);
    }, { evIdx, inventory });
    await sleep(600); // showEvent 内有 300ms 淡入 setTimeout
    return page.evaluate(() => {
      const btns = [...document.querySelectorAll('#choices .choice-btn')];
      return {
        plain: btns.filter((b) => !b.hasAttribute('data-item') && !b.classList.contains('choice-locked')).map((b) => b.textContent.trim().slice(0, 40)),
        items: btns.filter((b) => b.hasAttribute('data-item')).map((b) => b.getAttribute('data-item')),
        locked: btns.filter((b) => b.classList.contains('choice-locked')).map((b) => b.textContent.trim().slice(0, 40)),
        hintBest: btns.findIndex((b) => b.classList.contains('hint-best')),
        hintBestText: (btns.find((b) => b.classList.contains('hint-best')) || {}).textContent
          ? btns.find((b) => b.classList.contains('hint-best')).textContent.trim().slice(0, 40) : null,
      };
    });
  };

  // --- 2) 未持有 powerbank → 门控选项必须缺席 ---
  const without = await renderAndRead(forced.evIdx, {});
  const key = forced.chText.slice(0, 8);
  // 真实设计：未持有道具时门控选项以「锁定态」显示（可见不可点，露伏笔），而非完全隐藏
  const lockedOk = without.locked.some((t) => t.includes(key)) && !without.plain.some((t) => t.includes(key));
  add('未持有道具时门控选项以锁定态显示(可见不可点)', lockedOk,
    lockedOk ? `锁定选项含「${key}」且不在可点列表中（设计：可见伏笔）`
             : `期望锁定显示却未找到：${JSON.stringify(without.locked)}`);

  // --- 3) 持有 powerbank（真实对象格式）→ 门控选项必须出现 ---
  const withIt = await renderAndRead(forced.evIdx, { [forced.reqId]: { icon: '🔋', count: 1, description: 'x', quote: '' } });
  const presentOk = withIt.plain.some((t) => t.includes(key));
  add('持有道具时门控选项正常渲染（核心回归）', presentOk,
    presentOk ? `渲染 ${withIt.plain.length} 个选项，含「${key}」—— 修复前此项恒为 false`
              : `应出现却缺席：${JSON.stringify(withIt.plain)}`);
  // 核心门控验证：未持有时锁定、持有时变为可点（plain 出现且 locked 消失）
  const unlockedOk = without.locked.some((t) => t.includes(key)) && withIt.plain.some((t) => t.includes(key)) && !withIt.locked.some((t) => t.includes(key));
  add('持有后门控选项由锁定变为可点(核心门控验证)', unlockedOk,
    `未持有时锁定、持有时可点（plain含key=${withIt.plain.some((t) => t.includes(key))}，locked含key=${withIt.locked.some((t) => t.includes(key))}）`);

  // --- 4) 心花怒放提示指向的选项必须真实可见（两处判定一致性）---
  const hintOk = withIt.hintBest >= 0 && withIt.hintBest < withIt.plain.length + withIt.items.length;
  add('hint-best 指向真实存在的按钮', hintOk,
    hintOk ? `hint-best 位于第 ${withIt.hintBest} 个按钮：「${withIt.hintBestText}」` : '未找到 hint-best 或索引越界');

  // --- 5) 商店礼物 → 事件内赠予按钮真实注入 ---
  const giftProbe = await page.evaluate(() => {
    const sg = (typeof shopGifts !== 'undefined') ? shopGifts : null;
    if (!sg) return { ok: false, reason: 'shopGifts 在页面顶层不可见' };
    const target = sg.find((g) => !g.isCustom);
    return { ok: true, name: target.name, id: target.id, icon: target.icon, count: sg.length };
  });
  add('shopGifts 在页面运行时顶层可见', giftProbe.ok, giftProbe.ok ? `${giftProbe.count} 件商品，样例「${giftProbe.name}」` : giftProbe.reason);

  if (giftProbe.ok) {
    // 模拟真实购买路径：addToInventory 以**中文名**为键写入
    await page.evaluate(({ name, icon }) => {
      window.gameState.inventory = {};
      addToInventory(name, icon, 'desc', 'quote');
      window.gameState.currentEvent = 0;
      showEvent(0);
    }, giftProbe);
    await sleep(600);
    const injected = await page.evaluate(() => [...document.querySelectorAll('#choices .choice-btn[data-item]')]
      .map((b) => ({ id: b.getAttribute('data-item'), text: b.textContent.trim().slice(0, 30) })));
    const hit = injected.find((x) => x.id === giftProbe.id);
    add(`买入「${giftProbe.name}」后事件内出现赠予按钮`, !!hit,
      hit ? `data-item="${hit.id}" 文案「${hit.text}」—— 修复前反查失败恒不注入`
          : `未注入任何匹配按钮，实际注入=${JSON.stringify(injected)}`);
  }

  // --- 6) 剧情道具不应混入商店赠予入口 ---
  await page.evaluate((reqId) => {
    window.gameState.inventory = { [reqId]: { icon: '🔋', count: 1 } };
    window.gameState.currentEvent = 0;
    showEvent(0);
  }, forced.reqId);
  await sleep(600);
  const storyItemBtns = await page.evaluate(() =>
    [...document.querySelectorAll('#choices .choice-btn[data-item]')].map((b) => b.getAttribute('data-item')));
  add('剧情道具不混入商店赠予入口', storyItemBtns.length === 0,
    storyItemBtns.length === 0 ? 'OK（powerbank 走 requireItem 通道）' : `意外注入 ${JSON.stringify(storyItemBtns)}`);

  await ctx.close();
  return { checks, errors };
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

    console.log('[4/5] 子系统冒烟 ...');
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

    console.log('[5/5] 道具联动真实浏览器验证 ...');
    const linkage = await smokeItemLinkage(browser);
    for (const c of linkage.checks) {
      console.log(`         ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? '\n             → ' + c.detail : ''}`);
    }
    if (linkage.errors.length) {
      console.log('       道具联动验证期间未预期报错:');
      linkage.errors.forEach((e) => console.log('         ✗ ' + e));
    }
    const linkageFails = linkage.checks.filter((c) => !c.ok).length;

    // 汇总
    console.log('\n' + '='.repeat(60));
    const allWeatherOk = weatherResults.every((r) => r.ok);
    const smokeFails = smoke.results.filter((s) => s.ok === false);
    const anySmokeErr = smoke.errors.length > 0;
    const totalFail = weatherResults.filter((r) => !r.ok).length + smokeFails.length + (anySmokeErr ? 1 : 0)
      + linkageFails + (linkage.errors.length ? 1 : 0);

    console.log('天气主流程:');
    weatherResults.forEach((r) =>
      console.log(`   ${r.ok ? '✓' : '✗'} ${r.weather} → ${r.which}${r.errors.length ? '  [' + r.errors.length + ' 错误]' : ''}`));
    console.log('子系统冒烟:');
    smoke.results.forEach((s) =>
      console.log(`   ${s.ok === true ? '✓' : s.ok === null ? '○' : '✗'} ${s.name}${s.note ? '  (' + s.note + ')' : ''}`));
    console.log('道具联动验证:');
    linkage.checks.forEach((c) => console.log(`   ${c.ok ? '✓' : '✗'} ${c.name}`));

    console.log('\n汇总: 天气失败 ' + weatherResults.filter((r) => !r.ok).length +
      ' / 子系统失败 ' + smokeFails.length +
      ' / 道具联动失败 ' + linkageFails + '（共 ' + linkage.checks.length + ' 项）' +
      (anySmokeErr ? ' / 另有未预期报错' : ''));

    if (totalFail === 0) {
      console.log('结论: PASS — 四种天气均能跑通到结局，子系统冒烟无未预期报错，道具联动在真实浏览器中验证通过。');
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
