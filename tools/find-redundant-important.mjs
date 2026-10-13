// tools/find-redundant-important.mjs — 找出可能多余的 !important
// 判断：同一选择器+属性在整个文件中只出现一次，则 !important 不参与竞争，可能多余。
// 用法：node tools/find-redundant-important.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'css', 'style.css'), 'utf8');

// 去掉注释
const noComment = css.replace(/\/\*[\s\S]*?\*\//g, '');

// 逐个规则块解析（选择器 { 声明 }）
const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
const map = new Map(); // key: `selector|prop` → [{value, important}]
let m;
while ((m = ruleRe.exec(noComment))) {
  const selector = m[1].trim().replace(/\s+/g, ' ');
  const body = m[2];
  const decls = body.split(';');
  for (const d of decls) {
    const idx = d.indexOf(':');
    if (idx < 0) continue;
    const prop = d.slice(0, idx).trim();
    const val = d.slice(idx + 1).trim();
    if (!prop || !val) continue;
    const key = `${selector}|${prop}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ value: val, important: /!important/.test(val) });
  }
}

// 找出「同选择器+属性只有一条声明且带 !important」的情况
const candidates = [];
for (const [key, list] of map) {
  if (list.length === 1 && list[0].important) {
    candidates.push(key);
  }
}

console.log(`扫描到规则键 ${map.size} 个`);
console.log(`单次声明且带 !important 的选择器+属性：${candidates.length} 个`);
console.log('\n（这些 !important 不参与同选择器竞争，但可能用于压制其他选择器，删除前需逐一验证）\n');
candidates.slice(0, 60).forEach((c) => console.log('  ' + c));
if (candidates.length > 60) console.log(`  ... 另 ${candidates.length - 60} 个`);
