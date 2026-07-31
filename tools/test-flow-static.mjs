// =============================================================================
// test-flow-static.mjs — 纯静态「全流程」冒烟测试（零依赖，仅用 Node 内置模块）
// -----------------------------------------------------------------------------
// 用途：在不启动浏览器的情况下，对游戏做四块静态校验，确认“全流程能否跑通”的
//       数据/资源/语法基础是否齐备。输出结构化 PASS/FAIL，任意关键块失败则
//       process.exit(1)。
//
// 运行（在项目根目录下）：
//   C:\Users\Pengcheng_Li\.workbuddy\binaries\node\versions\22.22.2\node.exe tools/test-flow-static.mjs
//
// 设计说明：
//   * 游戏源码（index.html / js / assets / data）一律不改动；本脚本只“读”。
//   * story.json 的“原始 schema”为 { meta.weatherGroups, weathers:{<subKey>:{name,emoji,events:[{name,prompt,options}]}} }，
//     运行时 story-loader.js 会把它归一化成 { title, description, choices }。
//     为兼容两种命名，B 块按“归一化别名”解析（name||title / prompt||description / options||choices），
//     这样无论数据用哪套字段名都能正确校验，且不修改任何游戏数据。
// =============================================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 给定 Node 路径（与任务环境一致）
const NODE = 'C:////Users////Pengcheng_Li////.workbuddy////binaries////node////versions////22.22.2////node.exe';

// ---- 报告结构 ----------------------------------------------------------------
const report = {
  A: { title: '(A) 语法检查 (node --check)', pass: 0, fail: 0, items: [] },
  B: { title: '(B) data/story.json 结构/事件完整性', pass: 0, fail: 0, items: [] },
  C: { title: '(C) assets/asset-map.js 一致性/图片资源存在性', pass: 0, fail: 0, items: [] },
  D: { title: '(D) video/playlist.json 结构/mp3 资源存在性', pass: 0, fail: 0, items: [] },
  E: { title: '(E) 道具 reward/useItem/requireItem/photo 引用一致性', pass: 0, fail: 0, items: [] },
  F: { title: '(F) requireItem 门控行为回归（hasItem 语义）', pass: 0, fail: 0, items: [] },
  G: { title: '(G) 商店礼物 → 事件内赠予入口连通性（injectItemChoices）', pass: 0, fail: 0, items: [] },
};
const eventNames = new Set();

function rec(block, name, ok, detail = '') {
  if (ok) report[block].pass++;
  else report[block].fail++;
  report[block].items.push({ name, ok, detail });
}

// =============================================================================
// (A) 语法检查：对指定文件逐个 `node --check`
// =============================================================================
function blockA() {
  const targets = [];
  // js/*.js
  const jsDir = path.join(ROOT, 'js');
  if (fs.existsSync(jsDir)) {
    for (const f of fs.readdirSync(jsDir)) {
      if (f.endsWith('.js')) targets.push(path.join(jsDir, f));
    }
  }
  // assets/asset-map.js
  targets.push(path.join(ROOT, 'assets', 'asset-map.js'));
  // serve.mjs, gen-playlist.mjs（根目录）
  targets.push(path.join(ROOT, 'serve.mjs'));
  targets.push(path.join(ROOT, 'gen-playlist.mjs'));
  // tools/*.mjs（含本脚本与 e2e 脚本，仅做语法校验，不解析 import）
  const toolsDir = path.join(ROOT, 'tools');
  if (fs.existsSync(toolsDir)) {
    for (const f of fs.readdirSync(toolsDir)) {
      if (f.endsWith('.mjs')) targets.push(path.join(toolsDir, f));
    }
  }

  for (const file of targets) {
    if (!fs.existsSync(file)) {
      rec('A', file, false, '文件不存在');
      continue;
    }
    try {
      execFileSync(NODE, ['--check', file], { stdio: ['ignore', 'pipe', 'pipe'] });
      rec('A', file, true, 'OK');
    } catch (e) {
      const stderr = (e.stderr && e.stderr.toString()) || e.message || '';
      rec('A', file, false, stderr.split('\n').slice(0, 3).join(' | ').slice(0, 300));
    }
  }
}

// =============================================================================
// (B) data/story.json：可解析 + 结构 + 每种天气每条变体线每个事件完整
// =============================================================================
function blockB() {
  const storyPath = path.join(ROOT, 'data', 'story.json');
  let raw;
  try {
    raw = fs.readFileSync(storyPath, 'utf8');
  } catch (e) {
    rec('B', 'data/story.json', false, '读取失败: ' + e.message);
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
    rec('B', 'JSON.parse', true, 'OK');
  } catch (e) {
    rec('B', 'JSON.parse', false, e.message);
    return;
  }

  // meta.weatherGroups / weathers 存在性
  const wg = data.meta && data.meta.weatherGroups;
  if (wg && typeof wg === 'object') rec('B', 'meta.weatherGroups', true, Object.keys(wg).join(','));
  else rec('B', 'meta.weatherGroups', false, '缺失或非对象');

  if (data.weathers && typeof data.weathers === 'object') rec('B', 'weathers', true, Object.keys(data.weathers).join(','));
  else { rec('B', 'weathers', false, '缺失或非对象'); return; }

  if (!wg) return;

  // 遍历中文天气 → 变体子键 → 事件
  for (const [cn, subKeys] of Object.entries(wg)) {
    if (!Array.isArray(subKeys) || !subKeys.length) {
      rec('B', `天气[${cn}]`, false, '变体子键为空');
      continue;
    }
    for (const sub of subKeys) {
      const variant = data.weathers[sub];
      if (!variant || !Array.isArray(variant.events)) {
        rec('B', `变体线 ${cn}->${sub}`, false, 'weathers 中缺失该变体线或 events 非数组');
        continue;
      }
      const events = variant.events;
      if (!events.length) {
        rec('B', `变体线 ${cn}->${sub}`, false, 'events 为空数组');
        continue;
      }
      let lineOk = true;
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const name = (ev && (ev.name != null ? ev.name : ev.title)) || '';
        const desc = (ev && (ev.prompt != null ? ev.prompt : ev.description)) || '';
        const opts = ev && (ev.options != null ? ev.options : ev.choices);
        if (typeof name !== 'string' || !name.trim()) {
          rec('B', `事件 ${cn}->${sub}[${i}]`, false, 'name/title 缺失或为空');
          lineOk = false;
          continue;
        }
        if (typeof desc !== 'string' || !desc.trim()) {
          rec('B', `事件[${name}]`, false, 'prompt/description 缺失或为空');
          lineOk = false;
          continue;
        }
        if (!Array.isArray(opts) || opts.length === 0) {
          rec('B', `事件[${name}]`, false, 'options/choices 为空');
          lineOk = false;
          continue;
        }
        // 每个选项需有非空文案
        const badOpt = opts.findIndex(o => {
          const t = o && (o.label != null ? o.label : o.text);
          return !(typeof t === 'string' && t.trim());
        });
        if (badOpt >= 0) {
          rec('B', `事件[${name}]`, false, `第 ${badOpt} 个选项缺少非空 label/text`);
          lineOk = false;
          continue;
        }
        eventNames.add(name);
      }
      if (lineOk) rec('B', `变体线 ${cn}->${sub}`, true, `${events.length} 个事件均完整`);
    }
  }
}

// =============================================================================
// (C) assets/asset-map.js：取出 ASSET_MAP，校验 cnToSubs 与中文键一致 + 图片存在
// =============================================================================
function blockC() {
  const assetMapPath = path.join(ROOT, 'assets', 'asset-map.js');
  if (!fs.existsSync(assetMapPath)) {
    rec('C', 'assets/asset-map.js', false, '文件不存在');
    return;
  }
  const code = fs.readFileSync(assetMapPath, 'utf8');
  let ASSET_MAP;
  try {
    ASSET_MAP = new Function('window', code + '\n;return window.ASSET_MAP;')({});
    rec('C', '解析 ASSET_MAP', true, 'OK');
  } catch (e) {
    rec('C', '解析 ASSET_MAP', false, e.message);
    return;
  }
  if (!ASSET_MAP || typeof ASSET_MAP !== 'object') {
    rec('C', 'ASSET_MAP 结构', false, '非对象');
    return;
  }

  // cnToSubs 键集合 == meta.weatherGroups 中文键
  const storyPath = path.join(ROOT, 'data', 'story.json');
  let cnKeys = null;
  try {
    const sd = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    cnKeys = Object.keys((sd.meta && sd.meta.weatherGroups) || {}).sort();
  } catch (e) { /* 忽略，B 块会报告 */ }
  if (cnKeys) {
    const mapKeys = Object.keys(ASSET_MAP.cnToSubs || {}).sort();
    const same = JSON.stringify(cnKeys) === JSON.stringify(mapKeys);
    rec('C', 'cnToSubs 键 == 中文天气键', same,
      same ? cnKeys.join(',') : `asset-map=[${mapKeys}] vs story=[${cnKeys}]`);
  }

  // eventImages：每个路径文件实际存在
  const eventImages = ASSET_MAP.eventImages || {};
  let imgOk = true, imgCount = 0, imgMiss = 0;
  for (const [sub, map] of Object.entries(eventImages)) {
    for (const [evName, rel] of Object.entries(map)) {
      imgCount++;
      const full = path.join(ROOT, rel);
      if (fs.existsSync(full)) {
        // 计入，不逐个列项以免刷屏
      } else {
        imgOk = false; imgMiss++;
        rec('C', `事件图缺失 ${sub}/${evName}`, false, rel);
      }
    }
  }
  rec('C', `事件图存在性 (${imgCount} 张)`, imgOk, imgMiss ? `缺失 ${imgMiss} 张` : '全部存在');

  // gf 头像：gf_<子键>.png 存在
  const gf = ASSET_MAP.gf || {};
  let gfOk = true, gfMiss = 0;
  for (const [sub, rel] of Object.entries(gf)) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) { gfOk = false; gfMiss++; rec('C', `头像缺失 ${sub}`, false, rel); }
  }
  rec('C', `女友头像存在性 (${Object.keys(gf).length} 张)`, gfOk, gfMiss ? `缺失 ${gfMiss} 张` : '全部存在');
}

// =============================================================================
// (D) video/playlist.json：嵌套结构 + 所有 .mp3 路径文件存在于 video/ 下
// =============================================================================
function blockD() {
  const plPath = path.join(ROOT, 'video', 'playlist.json');
  let raw;
  try {
    raw = fs.readFileSync(plPath, 'utf8');
  } catch (e) {
    rec('D', 'video/playlist.json', false, '读取失败: ' + e.message);
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
    rec('D', 'JSON.parse', true, 'OK');
  } catch (e) {
    rec('D', 'JSON.parse', false, e.message);
    return;
  }

  // 结构：{ artists:[{name, albums:[{name, cover, songs:[{...}]}]}] }
  if (Array.isArray(data.artists)) rec('D', 'artists[]', true, `${data.artists.length} 位歌手`);
  else { rec('D', 'artists[]', false, '缺失或非数组'); return; }

  const mp3Paths = [];
  let structOk = true;
  for (const artist of data.artists) {
    if (!artist || typeof artist.name !== 'string') { structOk = false; continue; }
    if (!Array.isArray(artist.albums)) { structOk = false; continue; }
    for (const album of artist.albums) {
      if (!album || typeof album.name !== 'string') { structOk = false; continue; }
      if (!Array.isArray(album.songs)) { structOk = false; continue; }
      for (const song of album.songs) {
        // 深度扫描所有字符串字段，提取以 .mp3 结尾的路径
        const walk = (val) => {
          if (typeof val === 'string') {
            if (val.toLowerCase().endsWith('.mp3')) mp3Paths.push(val);
          } else if (Array.isArray(val)) {
            val.forEach(walk);
          } else if (val && typeof val === 'object') {
            Object.values(val).forEach(walk);
          }
        };
        walk(song);
      }
    }
  }
  rec('D', '嵌套结构 artists→albums→songs', structOk, structOk ? 'OK' : '存在非法结构');

  // 断言 mp3 文件存在于 video/ 下（路径相对项目根）
  let mp3Ok = true, mp3Miss = 0;
  // 去重
  const uniq = [...new Set(mp3Paths)];
  for (const rel of uniq) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) { mp3Ok = false; mp3Miss++; rec('D', `mp3 缺失`, false, rel); }
  }
  rec('D', `mp3 资源存在性 (${uniq.length} 个)`, mp3Ok, mp3Miss ? `缺失 ${mp3Miss} 个` : '全部存在');
}

// =============================================================================
// (E) 道具 reward/useItem/requireItem 引用一致性
//     校验 story.json 中引用的道具 id 是否都在 js/backpack.js 的 ITEMS 中登记，
//     防止新增文案/道具时漏登记导致“静默”缺失（配合 backpack.js 的兜底，虽不崩但图标/描述会缺）。
//     兼容 options/choices 两套字段名；事件级 giveItem 一并纳入。
// =============================================================================
function blockE() {
  // 1) 读取 story.json，复用 blockB 的解析方式（name||title / prompt||description / options||choices）
  const storyPath = path.join(ROOT, 'data', 'story.json');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    rec('E', 'JSON.parse', true, 'OK');
  } catch (e) {
    rec('E', 'data/story.json', false, '读取/解析失败: ' + e.message);
    return;
  }

  const wg = data.meta && data.meta.weatherGroups;
  const weathers = data.weathers;
  if (!wg || typeof wg !== 'object' || !weathers || typeof weathers !== 'object') {
    rec('E', 'weathers/meta.weatherGroups', false, 'story.json 结构异常（缺 weatherGroups/weathers）');
    return;
  }

  // 递归遍历：天气→变体子键→事件→options，收集所有引用 id（去重）
  const refIds = new Set();
  const photoRefs = new Set();
  // id → 该 id 出现过的字段类型集合（reward/useItem/requireItem/giveItem），用于精准报错
  const refKinds = new Map();
  const collectStr = (v, kind) => {
    if (typeof v === 'string' && v.trim()) {
      const id = v.trim();
      refIds.add(id);
      if (!refKinds.has(id)) refKinds.set(id, new Set());
      refKinds.get(id).add(kind || 'reward');
    }
  };
  const kindOf = (id) => [...(refKinds.get(id) || ['reward'])].sort().join('/');

  for (const subKeys of Object.values(wg)) {
    if (!Array.isArray(subKeys)) continue;
    for (const sub of subKeys) {
      const variant = weathers[sub];
      if (!variant || !Array.isArray(variant.events)) continue;
      for (const ev of variant.events) {
        if (!ev || typeof ev !== 'object') continue;
        if (ev.giveItem) collectStr(ev.giveItem, 'giveItem'); // 事件级 giveItem
        const opts = ev.options != null ? ev.options : ev.choices; // 兼容 options/choices
        if (!Array.isArray(opts)) continue;
        for (const o of opts) {
          if (!o || typeof o !== 'object') continue;
          if (o.reward) collectStr(o.reward, 'reward');
          if (o.useItem) collectStr(o.useItem, 'useItem');
          if (o.requireItem) collectStr(o.requireItem, 'requireItem');
          if (o.photo) photoRefs.add(o.photo);
        }
      }
    }
  }

  // 2) 读取 js/backpack.js 文本，提取 ITEMS 注册表里的所有键
  const bpPath = path.join(ROOT, 'js', 'backpack.js');
  let bpCode;
  try {
    bpCode = fs.readFileSync(bpPath, 'utf8');
  } catch (e) {
    rec('E', 'js/backpack.js', false, '读取失败: ' + e.message);
    return;
  }
  const startIdx = bpCode.indexOf('var ITEMS = {');
  if (startIdx < 0) {
    rec('E', 'ITEMS 注册表', false, '未在 js/backpack.js 找到 "var ITEMS = {"');
    return;
  }
  // 从起始位置向后，截取第一个 2 空格缩进闭合的 "};" 之间的内容
  const afterStart = bpCode.slice(startIdx);
  const closeMatch = afterStart.match(/\n\s{2}\};/);
  if (!closeMatch) {
    rec('E', 'ITEMS 注册表闭合', false, '未找到 ITEMS 的 "};" 闭合');
    return;
  }
  const itemsBlock = afterStart.slice(0, closeMatch.index + closeMatch[0].length);

  const registeredIds = new Set();
  const keyRe = /\n\s{4}([a-zA-Z_]\w*):/g;
  let m;
  while ((m = keyRe.exec(itemsBlock)) !== null) {
    registeredIds.add(m[1]);
  }
  rec('E', 'ITEMS 注册表键提取', true, [...registeredIds].sort().join(',') + ` (共 ${registeredIds.size} 个)`);

  // 3) 对 refIds 中每个 id 校验是否在 registeredIds 中
  let allPass = true;
  for (const id of refIds) {
    const kind = kindOf(id);
    if (!registeredIds.has(id)) {
      rec('E', kind + ' 引用缺失: ' + id, false,
        'story.json 的 ' + kind + ' 引用了未注册的道具，请在 js/backpack.js 的 ITEMS 补登记。' +
        '（运行时静默无报错：requireItem 拼错 → 选项永远不出现；useItem 拼错 → 道具消耗不掉）');
      allPass = false;
    } else {
      rec('E', kind + ' 引用 ' + id, true, 'OK');
    }
  }

  // 4) 额外一条：仅当全部通过
  if (refIds.size === 0) {
    rec('E', '引用总数', true, 'story.json 未引用任何道具');
  } else if (allPass) {
    rec('E', '引用总数', true, refIds.size + ' 个均已在 ITEMS 注册');
  }

  // 5) 校验 choice.photo 引用是否都在 albumPhotos 注册
  const albumPath = path.join(ROOT, 'js', 'album.js');
  let albumCode;
  try {
    albumCode = fs.readFileSync(albumPath, 'utf8');
  } catch (e) {
    rec('E', 'js/album.js', false, '读取失败: ' + e.message);
    return;
  }
  const albumIds = new Set();
  const idRe = /id:\s*'([^']+)'/g;
  let m2;
  while ((m2 = idRe.exec(albumCode)) !== null) albumIds.add(m2[1]);
  rec('E', 'albumPhotos id 提取', true, [...albumIds].sort().join(',') + ` (共 ${albumIds.size} 个)`);
  let photoAllPass = true;
  for (const id of photoRefs) {
    if (!albumIds.has(id)) {
      rec('E', 'photo 引用缺失: ' + id, false, 'story.json 的 choice.photo 指向了 album.js 未登记的相册照');
      photoAllPass = false;
    } else {
      rec('E', 'photo 引用 ' + id, true, 'OK');
    }
  }
  if (photoRefs.size === 0) {
    rec('E', 'photo 引用总数', true, 'story.json 未引用任何 choice.photo');
  } else if (photoAllPass) {
    rec('E', 'photo 引用总数', true, photoRefs.size + ' 个均已在 albumPhotos 注册');
  }
}

// =============================================================================
// (F) requireItem 门控行为回归（hasItem 语义）
//     背景：gameState.inventory[id] 存的是**对象** { icon, count, ... }（见 backpack.js
//     acquireItem / inventory.js addToInventory）。历史缺陷是 event-render.js 写成
//     `inventory[id] > 0` —— 对象与数字比较恒为 false，导致所有带 requireItem 的选项
//     被永久隐藏，且运行时静默无任何报错。
//     本块把 js/event-render.js 真实加载进沙箱、调用真实的 hasItem 做行为断言，
//     而不是靠"看代码觉得对"。同时锁死两处调用点必须共用同一判定，防止再次漂移。
// =============================================================================
function blockF() {
  const erPath = path.join(ROOT, 'js', 'event-render.js');
  let code;
  try {
    code = fs.readFileSync(erPath, 'utf8');
  } catch (e) {
    rec('F', 'js/event-render.js', false, '读取失败: ' + e.message);
    return;
  }

  // --- F1. 源码层：禁止回退到"对象与数字比较"的错误写法 ---
  const badPattern = /inventory\s*\[[^\]]*requireItem[^\]]*\]\s*>\s*0/;
  rec('F', '未回退到 inventory[requireItem] > 0 的错误比较', !badPattern.test(code),
    badPattern.test(code) ? '检测到对象与数字直接比较，requireItem 门控会恒判为"未持有"' : 'OK');

  // --- F2. 源码层：两处门控必须共用 hasItem（求解最优项 / 实际渲染） ---
  const gateCalls = (code.match(/requireItem\s*&&\s*!hasItem\(/g) || []).length;
  rec('F', '两处 requireItem 门控共用 hasItem', gateCalls === 2,
    gateCalls === 2 ? '找到 2 处（bestIdx 求解 + 实际渲染），判定一致'
                    : `期望 2 处，实际 ${gateCalls} 处 —— 判定不一致会导致"提示指向一个看不见的选项"`);

  // --- F3. 行为层：在沙箱中加载真实源码并调用真实的 hasItem ---
  let hasItem;
  const sandboxState = { inventory: null };
  try {
    // event-render.js 顶层只有函数声明与一次函数引用赋值，加载时不触碰 DOM。
    // 用 new Function 注入 gameState 桩，把 hasItem 取出来。
    const factory = new Function('gameState', 'document', 'window', code + '\n;return hasItem;');
    hasItem = factory(sandboxState, undefined, {});
    rec('F', '沙箱加载 event-render.js 并取出 hasItem', typeof hasItem === 'function',
      typeof hasItem === 'function' ? 'OK' : '未导出 hasItem 函数');
  } catch (e) {
    rec('F', '沙箱加载 event-render.js', false, e.message);
    return;
  }
  if (typeof hasItem !== 'function') return;

  // 用例表：[说明, inventory 值, 期望判定]
  const cases = [
    ['inventory 未初始化(null) → 未持有',            null,                                     false],
    ['inventory 为空对象 → 未持有',                  {},                                       false],
    ['条目不存在（只有别的道具）→ 未持有',            { scarf: { icon: '🧣', count: 1 } },       false],
    ['对象 {icon,count:1} → 已持有（核心回归）',      { powerbank: { icon: '🔋', count: 1 } },   true],
    ['对象 count:0 → 未持有',                        { powerbank: { icon: '🔋', count: 0 } },   false],
    ['对象 count 为 undefined → 未持有（安全兜底）',  { powerbank: { icon: '🔋' } },             false],
    ['对象 count 为 NaN → 未持有（安全兜底）',        { powerbank: { icon: '🔋', count: NaN } }, false],
    ['条目为 null → 未持有',                         { powerbank: null },                      false],
    ['遗留数字格式 1 → 已持有（兼容 aiGiftGen 兜底）', { powerbank: 1 },                        true],
    ['遗留数字格式 0 → 未持有',                      { powerbank: 0 },                         false],
  ];

  for (const [label, invValue, expected] of cases) {
    sandboxState.inventory = invValue;
    let actual;
    try { actual = hasItem('powerbank'); } catch (e) { actual = 'THROW: ' + e.message; }
    rec('F', label, actual === expected, `hasItem('powerbank') = ${actual}（期望 ${expected}）`);
  }

  // --- F4. 对照：证明旧写法在同一份数据上确实判错（缺陷复现，锁死不可回退） ---
  const legacyInv = { powerbank: { icon: '🔋', count: 1 } };
  const legacyVerdict = !!(legacyInv && legacyInv['powerbank'] > 0); // 旧代码的判定表达式
  sandboxState.inventory = legacyInv;
  const fixedVerdict = hasItem('powerbank');
  rec('F', '缺陷复现对照：旧写法误判 / 新写法正确',
    legacyVerdict === false && fixedVerdict === true,
    `同一条目 {icon:'🔋',count:1} → 旧 inventory[id]>0 判定=${legacyVerdict}（错，选项被隐藏）` +
    ` / 新 hasItem 判定=${fixedVerdict}（对，选项可渲染）`);
}

// =============================================================================
// (G) 商店礼物 → 事件内赠予入口连通性
//     背景：玩家在商店买到的礼物以**中文名**为键写进 inventory（inventory.js addToInventory），
//     injectItemChoices 需要靠"中文名 → 礼物 id"反查表才能注入赠予按钮。历史缺陷是该反查表
//     用了 shop.js 顶层的**遗留** gifts（8 件旧商品），与实际在售的 shopGifts（6 件）商品名
//     几乎零重叠 → 反查恒失败 → 赠予按钮从不出现，且运行时无任何报错。
//     本块把 shop.js + event-render.js 一起加载进沙箱，用假 DOM 真实调用 injectItemChoices，
//     断言"买得到的礼物一定给得出去"。
// =============================================================================
function blockG() {
  let shopCode, erCode;
  try {
    shopCode = fs.readFileSync(path.join(ROOT, 'js', 'shop.js'), 'utf8');
    erCode = fs.readFileSync(path.join(ROOT, 'js', 'event-render.js'), 'utf8');
  } catch (e) {
    rec('G', '读取 js/shop.js + js/event-render.js', false, e.message);
    return;
  }

  // --- 极简 DOM 桩：只实现 injectItemChoices 用到的那几个方法 ---
  function makeEl() {
    return {
      className: '', innerHTML: '', onclick: null,
      style: {}, _attrs: {}, children: [],
      setAttribute(k, v) { this._attrs[k] = v; },
      getAttribute(k) { return this._attrs[k]; },
      appendChild(c) { this.children.push(c); },
      querySelector(sel) {
        const m = /\[data-item="([^"]+)"\]/.exec(sel);
        if (!m) return null;
        return this.children.find(c => c._attrs && c._attrs['data-item'] === m[1]) || null;
      },
    };
  }
  const documentStub = { createElement: () => makeEl() };

  let api;
  try {
    // shop.js 在前（提供 shopGifts / gifts / selectData / gameState），event-render.js 在后。
    // 两者顶层均无 DOM 副作用，可安全加载。
    api = new Function('document', 'window', 'showToast', 'updateStats', 'makeChoice',
      shopCode + '\n' + erCode +
      '\n;return { inject: injectItemChoices, setInv: function(i){ gameState.inventory = i; },' +
      ' shopGifts: (typeof shopGifts !== "undefined" ? shopGifts : null),' +
      ' legacyGifts: (typeof gifts !== "undefined" ? gifts : null) };'
    )(documentStub, {}, () => {}, () => {}, () => {});
    rec('G', '沙箱加载 shop.js + event-render.js', true, 'OK');
  } catch (e) {
    rec('G', '沙箱加载 shop.js + event-render.js', false, e.message);
    return;
  }

  // --- G1. shopGifts 必须是顶层可见的数组（曾被困在 renderShopList() 内部） ---
  const sg = api.shopGifts;
  rec('G', 'shopGifts 已提升为 shop.js 顶层变量', Array.isArray(sg) && sg.length > 0,
    Array.isArray(sg) ? `${sg.length} 件商品，外部可读` : '顶层不可见 —— 事件内赠予反查将退回遗留表');
  if (!Array.isArray(sg)) return;

  // --- G2. 每件"可入包"的在售礼物，都必须能在事件中注入赠予按钮 ---
  const givable = sg.filter(g => g && g.name && !g.isCustom);
  for (const g of givable) {
    // 模拟：玩家买下该礼物 → addToInventory 以**中文名**为键写入
    api.setInv({ [g.name]: { icon: g.icon, count: 1, description: g.desc, quote: g.quote } });
    const container = makeEl();
    let err = null;
    try { api.inject({ title: 'T', choices: [] }, container); } catch (e) { err = e.message; }
    const btn = container.children.find(c => c._attrs && c._attrs['data-item'] === g.id);
    rec('G', `在售礼物「${g.name}」可在事件中赠予`, !err && !!btn,
      err ? 'inject 抛错: ' + err
          : btn ? `已注入按钮 data-item="${g.id}"`
                : `未注入任何按钮 —— 中文名「${g.name}」反查不到礼物 id，赠予入口是死链`);
  }

  // --- G3. 定制礼物入包名是动态的（定制的🎁），不应误注入 ---
  api.setInv({ '定制的🎁': { icon: '🎁', count: 1 } });
  const c3 = makeEl();
  try { api.inject({ title: 'T', choices: [] }, c3); } catch (e) { /* ignore */ }
  rec('G', '动态命名的定制礼物不产生赠予按钮', c3.children.length === 0,
    c3.children.length === 0 ? 'OK（按预期跳过）' : `意外注入 ${c3.children.length} 个按钮`);

  // --- G4. 剧情道具（backpack.js 以 id 为键）不应出现在商店赠予入口 ---
  api.setInv({ powerbank: { icon: '🔋', count: 1 } });
  const c4 = makeEl();
  try { api.inject({ title: 'T', choices: [] }, c4); } catch (e) { /* ignore */ }
  rec('G', '剧情道具(powerbank)不混入商店赠予入口', c4.children.length === 0,
    c4.children.length === 0 ? 'OK（剧情道具走 requireItem/useItem 通道）' : `意外注入 ${c4.children.length} 个按钮`);

  // --- G5. 覆盖文案不得张冠李戴：necklace 在新旧两表同 id 不同名 ---
  const nk = sg.find(g => g.id === 'necklace');
  if (nk) {
    api.setInv({ [nk.name]: { icon: nk.icon, count: 1 } });
    const c5 = makeEl();
    try { api.inject({ title: 'T', choices: [] }, c5); } catch (e) { /* ignore */ }
    const b5 = c5.children[0];
    const usesWrongName = !!(b5 && /纯银项链/.test(b5.innerHTML));
    rec('G', `同 id 不同名时不套用旧文案（${nk.name}）`, !usesWrongName,
      usesWrongName ? '按钮文案仍是遗留的「纯银项链」，与在售商品名不符' : `按钮文案取自在售商品「${nk.name}」`);
  }
}

// =============================================================================
// 主流程
// =============================================================================
function main() {
  console.log('========================================================');
  console.log(' 约会小故事 · 静态全流程冒烟测试');
  console.log(' 项目根: ' + ROOT);
  console.log('========================================================\n');

  blockA();
  blockB();
  blockC();
  blockD();
  blockE();
  blockF();
  blockG();

  let totalPass = 0, totalFail = 0;
  for (const k of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
    const b = report[k];
    console.log('\n' + b.title);
    console.log('-'.repeat(60));
    // 仅打印失败项 + 计数；成功项过多时折叠
    const fails = b.items.filter(i => !i.ok);
    if (fails.length) {
      for (const it of fails) {
        console.log(`  ✗ ${it.name}${it.detail ? '  →  ' + it.detail : ''}`);
      }
    }
    console.log(`  ✓ 通过 ${b.pass} 项 / ✗ 失败 ${b.fail} 项` +
      (b.items.length > b.pass + b.fail ? ` （共 ${b.items.length} 项，成功项已折叠）` : ''));
    totalPass += b.pass;
    totalFail += b.fail;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`汇总: 通过 ${totalPass} 项 / 失败 ${totalFail} 项`);
  console.log(`收集到的事件名共 ${eventNames.size} 个（详见各天气变体线）`);
  if (totalFail === 0) {
    console.log('结论: PASS — 静态基础齐备，全流程数据/资源/语法层面可跑通。');
    process.exit(0);
  } else {
    console.log('结论: FAIL — 存在上述问题，需修复后再判定全流程可跑通。');
    process.exit(1);
  }
}

main();
