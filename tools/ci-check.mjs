#!/usr/bin/env node
/**
 * tools/ci-check.mjs — 零依赖发布前检查门禁（审计建议七）
 * ------------------------------------------------------------------
 * 直接复用仓库内真实的 js/story-loader.js（在 vm 沙箱中运行，无需浏览器），覆盖审计要求的：
 *   1) 资源完整性：index.html 引用的本地 script/link 目标均存在（去掉 ?v= 版本参数后核验）
 *   2) 数据契约：data/story.json 通过 StoryLoader.validate 深层校验
 *   3) 状态不变量：normalizeGroups 后所有 choice 数值字段有限（无 NaN）
 *   4) 健壮性：每个天气都有非空事件线（防止空 weather 触发 showEvent 崩溃）
 *   5) 自带单元测试：validateStoryJson 能正确识别合法/非法样本
 *
 * 退出码：全部通过 0；存在 FAIL 则 1（可直接作为 CI 步骤）。
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
let failed = 0;

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
}

// ---------- 1. 资源完整性 ----------
function checkResources() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const re = /(?:src|href)\s*=\s*"([^"]+)"/g;
  const seen = new Set();
  const missing = [];
  let m;
  while ((m = re.exec(html))) {
    const p = m[1];
    if (/^(https?:|data:|#|mailto:)/i.test(p)) continue; // 外链 / 内联 / 锚点 跳过
    const clean = p.split('?')[0];                        // 去掉 ?v= 版本参数
    if (seen.has(clean)) continue;
    seen.add(clean);
    if (!existsSync(join(ROOT, clean))) missing.push(p);
  }
  check('资源完整性：index.html 本地引用均存在', missing.length === 0,
    missing.length ? '缺失 → ' + missing.join(', ') : `已校验 ${seen.size} 个本地资源`);
}

// ---------- 加载真实 StoryLoader（vm 沙箱，无浏览器依赖）----------
function loadStoryLoader() {
  const code = readFileSync(join(ROOT, 'js', 'story-loader.js'), 'utf8');
  const sandbox = {
    console, Math, JSON, Object, Array, String, Number, isFinite,
    parseInt, parseFloat, Date, RegExp
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window.StoryLoader || sandbox.StoryLoader;
}

// ---------- 2/3/4. 数据契约 + 状态不变量 + 健壮性 ----------
function checkStory() {
  const SL = loadStoryLoader();
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'story.json'), 'utf8'));

  const v = SL.validate(raw);
  check('数据契约：story.json 通过 StoryLoader.validate', v.ok,
    v.ok
      ? `天气${v.stats.weathers} 变体${v.stats.variants} 事件${v.stats.events} 选项${v.stats.choices}`
      : '错误 → ' + v.errors.slice(0, 5).join('; '));
  if (v.warnings.length) console.log('       ⚠ 告警：' + v.warnings.slice(0, 5).join('; '));

  const groups = SL.normalizeGroups(raw);
  let badNum = 0, totalChoices = 0;
  for (const lines of Object.values(groups))
    for (const line of lines)
      for (const e of line)
        for (const c of e.choices) {
          totalChoices++;
          for (const f of ['money', 'like', 'heart'])
            if (typeof c[f] !== 'number' || !isFinite(c[f])) badNum++;
        }
  check('状态不变量：归一化后数值字段均有限（无 NaN）', badNum === 0,
    `检查 ${totalChoices} 个选项，异常 ${badNum} 处`);

  let emptyWeather = 0;
  for (const lines of Object.values(groups)) {
    if (!lines.length || !lines.some(l => l.length)) emptyWeather++;
  }
  check('健壮性：每个天气都有非空事件线', emptyWeather === 0,
    emptyWeather ? `${emptyWeather} 个天气为空` : `天气 ${Object.keys(groups).length} 个均有效`);
}

// ---------- 5. validateStoryJson 自带单元测试 ----------
function selfTestValidate() {
  const SL = loadStoryLoader();
  const good = {
    weathers: { sunny: { name: '晴天', events: [ { title: 't', description: 'd', options: [ { label: 'a', like: 5 } ] } ] } }
  };
  const r1 = SL.validate(good);

  const bad = {
    weathers: { rainy: { name: '雨天', events: [
      { title: '', description: 'd', options: [ { label: 'a', like: 'x' } ] }, // title 缺失 + like 非法
      { title: 't', description: '', options: [] }                              // 空选项 → 错误
    ] } }
  };
  const r2 = SL.validate(bad);

  const ok = r1.ok === true && r2.ok === false && r2.errors.length >= 2;
  check('单元测试：validateStoryJson 识别合法/非法样本', ok,
    `good.ok=${r1.ok} bad.ok=${r2.ok} bad.errors=${r2.errors.length}`);
}

// ---------- 运行 ----------
console.log('═══ dating-story 发布前检查门禁 ═══');
checkResources();
checkStory();
selfTestValidate();
console.log('══════════════════════════════════');

if (failed) {
  console.log(`结果：${failed} 项未通过 ❌`);
  process.exit(1);
} else {
  console.log('结果：全部通过 ✅');
  process.exit(0);
}
