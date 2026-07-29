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

  let totalPass = 0, totalFail = 0;
  for (const k of ['A', 'B', 'C', 'D']) {
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
