// tools/audit-project.mjs — 约会小故事 · 静态架构审计
//
// 检查项：
//   A. 脚本加载顺序：顶层执行语句引用的全局符号，是否定义在"更晚才加载"的模块里（崩溃风险）
//   B. HTML↔JS 的 DOM id 是否存在（含 JS 动态注入的模板）
//   C. 被调用但全局未定义的函数（ReferenceError 风险）+ 重复全局定义（互相覆盖）
//   D. CSS 未被任何 HTML/JS 使用的类（瘦身依据）
//   E. 孤儿文件（未被引用的 js/json）、sw.js 预缓存列表存在性、PWA 版本戳
//
// 用法： node tools/audit-project.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(f, 'utf8');
const J = p => path.join(ROOT, p);

const BUILTIN = new Set(`Math JSON Object Array String Number Boolean Date RegExp Map Set WeakMap WeakSet
Symbol Promise Error TypeError RangeError console window document localStorage sessionStorage
setTimeout setInterval clearTimeout clearInterval requestAnimationFrame cancelAnimationFrame
parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI
alert confirm prompt fetch XMLHttpRequest Audio Image Blob URL FileReader FormData Intl
navigator location history screen performance structureClone crypto TextEncoder TextDecoder
if for while switch catch function return typeof new delete void in of do else try finally
var let const class extends super this instanceof yield await async throw case default break
continue get set static null undefined true false NaN Infinity arguments eval Result.Fn Proxy Reflect`.split(/\s+/).filter(Boolean));

// ─────────── 读取源 ───────────
const html = read(J('index.html'));
const css = read(J('css/style.css'));
const assetMap = fs.existsSync(J('assets/asset-map.js')) ? read(J('assets/asset-map.js')) : '';
const jsFiles = fs.readdirSync(J('js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
const extraFiles = ['sw.js', 'manifest.json'];
const jsMap = new Map(jsFiles.map(f => [f, read(J(f))]));
const allText = [html, css, assetMap, ...jsMap.values()].join('\n');

const line = t => console.log('\n' + '─'.repeat(64) + '\n' + t + '\n' + '─'.repeat(64));

// ─────────── A. 加载顺序 ───────────
line('A. 脚本加载顺序 / 顶层崩溃风险');
const srcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
const clean = srcs.map(s => s.replace(/\?.*$/, ''));

const missing = clean.filter(s => !fs.existsSync(J(s)));
console.log(`index.html 引用脚本 ${clean.length} 个` + (missing.length ? `，❌ 缺失: ${missing.join(', ')}` : '，✅ 全部存在'));

const orphan = jsFiles.filter(f => !clean.includes(f));
if (orphan.length) console.log(`❌ 孤儿 js（存在但 index.html 未加载）: ${orphan.join(', ')}`);
else console.log('✅ 无孤儿 js 模块');

// 版本戳
const vs = new Set(srcs.map(s => (/\?v=([^&"]+)/.exec(s) || [])[1]).filter(Boolean));
console.log(`版本戳: ${vs.size ? [...vs].join(', ') : '（无）'}${vs.size > 1 ? '  ⚠️ 不统一' : ''}`);

// 剥离注释与字符串，按字符计算花括号深度
function strip(code) {
  let s = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
  s = s.replace(/`(?:\\.|[^`\\])*`/g, '``').replace(/'(?:\\.|[^'\\\n])*'/g, "''").replace(/"(?:\\.|[^"\\\n])*"/g, '""');
  return s;
}
function depthsOf(s) {
  const d = new Int16Array(s.length);
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    d[i] = depth;
    const c = s[i];
    if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
  }
  return d;
}
// 收集某文件的顶层（depth===0）标识符引用
function topLevelRefs(code) {
  const s = strip(code);
  const d = depthsOf(s);
  const out = new Set();
  const re = /([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(s))) {
    const name = m[1];
    if (BUILTIN.has(name)) continue;
    const i = m.index;
    if ((d[i] || 0) !== 0) continue;          // 非顶层
    const prev = s.slice(Math.max(0, i - 30), i);
    if (/[\.]\s*$/.test(prev)) continue;       // 是属性访问的成员名，跳过
    out.add(name);
  }
  return out;
}
// 全局定义收集 —— 只收**顶层**（depth===0）定义，
// 否则函数体内的局部变量（btn/el/p…）会被当成"全局"，导致 A/C 两项全是噪音。
function globalDefs(code) {
  const s = strip(code);
  const d = depthsOf(s);
  const out = new Set();
  const pats = [
    /\bfunction\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g,
    /\bwindow\.([A-Za-z_$][\w$]*)\s*=/g,
    /\bclass\s+([A-Za-z_$][\w$]*)/g,
  ];
  for (const p of pats) {
    let m; const re = new RegExp(p.source, p.flags);
    while ((m = re.exec(s))) {
      const idx = m.index + Math.max(0, m[0].lastIndexOf(m[1]));
      if ((d[idx] || 0) !== 0) continue; // 非顶层：是局部变量/闭包，忽略
      out.add(m[1]);
    }
  }
  return out;
}
const defsBy = new Map();
for (const f of clean) {
  const rel = f.replace(/^\.\//, '');
  if (!jsMap.has(rel)) continue;
  for (const n of globalDefs(jsMap.get(rel))) {
    if (!defsBy.has(n)) defsBy.set(n, new Set());
    defsBy.get(n).add(rel);
  }
}

const order = clean.filter(f => jsMap.has(f.replace(/^\.\//, ''))).map(f => f.replace(/^\.\//, ''));
let risk = 0;
for (let i = 0; i < order.length; i++) {
  const f = order[i];
  const later = new Set(order.slice(i + 1));
  const refs = topLevelRefs(jsMap.get(f));
  const bad = [...refs].filter(n => {
    const providers = defsBy.get(n);
    if (!providers) return false;
    return [...providers].some(p => later.has(p)) && ![...providers].some(p => order.slice(0, i).includes(p) || p === f);
  });
  if (bad.length) {
    risk++;
    console.log(`  ⚠️ ${f.padEnd(22)} 顶层引用了更晚加载的符号: ${bad.join(', ')}`);
  }
}
if (!risk) console.log('✅ 未发现顶层跨模块顺序风险');

// ─────────── C. 未定义调用 / 重复定义 ───────────
line('C. 全局函数 定义 vs 调用');
const allCalls = new Map();
for (const [f, code] of jsMap) {
  const s = strip(code);
  const re = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(s))) {
    const n = m[2];
    if (BUILTIN.has(n)) continue;
    if (!allCalls.has(n)) allCalls.set(n, new Set());
    allCalls.get(n).add(f);
  }
}
const undefinedRefs = [...allCalls.keys()].filter(n => !defsBy.has(n));
if (undefinedRefs.length) {
  console.log(`⚠️ 被调用但无任何全局定义（可能来自 ${BASELINE_HTML_INLINE()} 内联 script / 对象方法 / 动态 evaluate）:`);
  console.log('   ' + undefinedRefs.join(', '));
} else console.log('✅ 所有调用都能找到定义');

const dup = [...defsBy.entries()].filter(([, files]) => files.size > 1);
if (dup.length) {
  console.log(`\n⚠️ 重复全局定义（后者覆盖前者，潜在冲突）共 ${dup.length} 个:`);
  for (const [n, files] of dup.slice(0, 30)) console.log(`   ${n.padEnd(24)} ← ${[...files].join(' , ')}`);
} else console.log('\n✅ 无重复全局定义');

function BASELINE_HTML_INLINE() {
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  if (!inlineScripts.length) return '未知来源';
  const inlineText = inlineScripts.map(m => m[1]).join('\n');
  const id = new Set(globalDefs(inlineText));
  const covered = undefinedRefs.filter(n => id.has(n)).length;
  return `index.html 内联 script(覆盖${covered})`;
}

// ─────────── B. DOM id 存在性 ───────────
line('B. DOM id 存在性');
// 注意：id 可能由 JS 动态注入，所以同时扫描 html 与所有 js 模板里的 id="..."
const allIds = new Set([...allText.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const missingIds = new Map();
for (const [f, code] of jsMap) {
  const refs = new Set();
  for (const m of code.matchAll(/getElementById\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) refs.add(m[1]);
  for (const m of code.matchAll(/["'`]#([A-Za-z][\w-]*)["'`]/g)) {
    // 排除十六进制颜色字面量（#ff7a18 / #fff / #ffffffaa），它们不是 DOM id
    if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{4}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(m[1])) continue;
    refs.add(m[1]);
  }
  for (const r of refs) {
    if (!allIds.has(r)) {
      if (!missingIds.has(f)) missingIds.set(f, new Set());
      missingIds.get(f).add(r);
    }
  }
}
if (missingIds.size) {
  console.log('⚠️ JS 引用了全项目任何地方都找不到的 id:');
  for (const [f, s] of missingIds) console.log(`   ${f.padEnd(22)} → ${[...s].join(', ')}`);
} else console.log('✅ 所有 JS 引用的 id 都能在 HTML/模板中找到');

// ─────────── D. CSS 死代码 ───────────
line('D. CSS 瘦身依据');
const cssClasses = new Set([...css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map(m => m[1]));
const nonCss = [html, assetMap, ...jsMap.values()].join('\n');
const deadClasses = [...cssClasses].filter(c => !nonCss.includes(c));
console.log(`CSS 类选择器总数 ${cssClasses.size}，疑似未在 HTML/JS 中出现 ${deadClasses.length} 个`);
if (deadClasses.length) console.log('   ' + deadClasses.slice(0, 60).join(', ') + (deadClasses.length > 60 ? ' …' : ''));
console.log(`CSS 体积 ${(Buffer.byteLength(css) / 1024).toFixed(0)} KB`);

// ─────────── E. PWA / 资源 ───────────
line('E. PWA 与资源');
const sw = read(J('sw.js'));
const cacheName = (/(?:const|var|let)\s+CACHE\s*=\s*['"`]([^'"`]+)/.exec(sw) || [])[1];
const pre = (/(?:const|var|let)\s+PRECACHE\s*=\s*\[([\s\S]*?)\]/.exec(sw) || [])[1] || '';
const preList = [...pre.matchAll(/['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
console.log(`sw.js 缓存版本号: ${cacheName}`);
const badPre = preList.filter(p => !fs.existsSync(J(p.replace(/^\.\//, ''))));
console.log(`PRECACHE ${preList.length} 项` + (badPre.length ? `  ❌ 不存在: ${badPre.join(', ')}` : '  ✅ 全部存在'));
const mj = JSON.parse(read(J('manifest.json')));
const icons = (mj.icons || []).map(i => i.src);
const badIcon = icons.filter(p => !fs.existsSync(J(p.replace(/^\.\//, ''))));
console.log(`manifest icons ${icons.length} 个` + (badIcon.length ? `  ❌ 缺失: ${badIcon.join(', ')}` : '  ✅ 存在'));

// data/*.json 引用情况
const dataJsons = fs.readdirSync(J('data')).filter(f => f.endsWith('.json'));
const unusedJson = dataJsons.filter(f => !allText.includes(f));
console.log(`data/*.json ${dataJsons.length} 个` + (unusedJson.length ? `，⚠️ 未被引用: ${unusedJson.join(', ')}` : '，✅ 均被引用'));

// ─────────── F. HTML 内联脚本 ↔ js 模块 顶层函数同名 ───────────
// 背景：拆分后 index.html 仍保留内联 script（主题/引导/特效等需最早执行）。
// 本项只认「行首无缩进」的函数声明为顶层（缩进的是嵌套局部函数，不进全局、不算冲突）。
line('F. HTML 内联脚本 ↔ js 模块 顶层函数同名');
// ⚠️ 判断"是否顶层(全局)"必须用【括号深度】，不能看缩进——
//    JS 缩进不代表作用域：IIFE 内部照样可以顶格写 function，但它仍是局部的。
function maskCode(s) { // 把字符串/注释内容抹成等长空格，避免其中的 {} 干扰深度统计
  let out = '', i = 0, mode = null;
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (mode === 'str') { if (c === '\\') { i += 2; out += '  '; continue; } if (c === mode) mode = null; out += ' '; i++; continue; }
    if (mode === 'line') { if (c === '\n') mode = null; out += ' '; i++; continue; }
    if (mode === 'blk') { if (c === '*' && n === '/') { mode = null; out += '  '; i += 2; continue; } out += ' '; i++; continue; }
    if (c === '/' && n === '/') { mode = 'line'; out += '  '; i += 2; continue; }
    if (c === '/' && n === '*') { mode = 'blk'; out += '  '; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { mode = 'str'; out += ' '; i++; continue; }
    out += c; i++;
  }
  return out;
}
// 已知局限：正则字面量（如 /\{/g）里的 {} 会让深度统计偏移，属保守误报方向。
// 要 100% 确定的结论请跑：node tools/check-globals.mjs（真实浏览器问 window）。
function topLevelFns(code) {
  const m = maskCode(code);
  const dep = []; let d = 0;
  for (const ch of m) { if (ch === '{') d++; else if (ch === '}') d--; dep.push(d); }
  const out = new Map();
  const re = /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g; let k;
  while ((k = re.exec(m))) if (dep[k.index] === 0 && !out.has(k[1])) out.set(k[1], fnBody(code, k.index));
  return out;
}
function fnBody(code, start) {
  const i = code.indexOf('{', start);
  if (i < 0) return '';
  let d = 0, j = i;
  for (; j < code.length; j++) {
    if (code[j] === '{') d++;
    else if (code[j] === '}') { d--; if (!d) break; }
  }
  return code.slice(i, j + 1).replace(/\s+/g, '');
}
const inlineText = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const inlineFns = topLevelFns(inlineText);
const modTopFns = new Map();
for (const [f, code] of jsMap) {
  for (const [n, body] of topLevelFns(code)) {
    if (!modTopFns.has(n)) modTopFns.set(n, []);
    modTopFns.get(n).push([f, body]);
  }
}
const conflicts = [...inlineFns.keys()].filter(n => modTopFns.has(n));
console.log(`index.html 内联顶层函数 ${inlineFns.size} 个；js/ 模块顶层函数 ${modTopFns.size} 个`);
if (!conflicts.length) {
  console.log('✅ 无同名冲突');
} else {
  let real = 0;
  for (const n of conflicts) {
    const same = modTopFns.get(n).some(([, b]) => b === inlineFns.get(n));
    const where = modTopFns.get(n).map(([f]) => f).join(', ');
    if (same) console.log(`   ⚪ 无害重复  ${n.padEnd(22)} 内联 ≡ ${where}（实现一致，后者覆盖无行为差异）`);
    else { real++; console.log(`   🔴 真冲突    ${n.padEnd(22)} 内联 ✗ ${where}（实现不同！后加载者覆盖内联，需人工确认）`); }
  }
  console.log(real ? `\n   ❌ ${real} 个真冲突（行为可能被覆盖）` : '\n   ✅ 同名者实现均一致，无实际风险');
}
console.log('   ℹ️ 本项用括号深度法估算，正则字面量可能造成保守偏差；');
console.log('      要 100% 确定的"onclick 能否解析到全局函数"结论，请跑：node tools/check-globals.mjs');

console.log('\n审计结束。');
