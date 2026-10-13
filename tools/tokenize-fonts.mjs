// tools/tokenize-fonts.mjs — 把 CSS 中的高频硬编码 font-size 替换为字号令牌
// 用法：node tools/tokenize-fonts.mjs [--apply]（默认 dry-run 仅统计）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'css', 'style.css');
const apply = process.argv.includes('--apply');

// 映射：像素值 → 令牌
const MAP = {
  '11px': 'var(--fs-xs)',
  '12px': 'var(--fs-sm)',
  '13px': 'var(--fs-base)',
  '14px': 'var(--fs-md)',
  '16px': 'var(--fs-lg)',
  '18px': 'var(--fs-xl)'
};

let css = readFileSync(FILE, 'utf8');
const counts = {};

// 逐行处理：跳过根字号 html{font-size:16px}（它是 rem 基准，语义上不属于标题令牌）
const lines = css.split('\n');
const outLines = lines.map((line) => {
  if (/^\s*html\s*\{/.test(line)) return line; // 保留根字号
  let l = line;
  for (const [px, token] of Object.entries(MAP)) {
    const re = new RegExp(`(font-size:\\s*)${px.replace('px', '')}px(\\s*!important)?`, 'g');
    l = l.replace(re, (m, p1, imp) => {
      counts[px] = (counts[px] || 0) + 1;
      return `${p1}${token}${imp || ''}`;
    });
  }
  return l;
});
css = outLines.join('\n');

console.log('替换统计：');
for (const [px, tok] of Object.entries(MAP)) {
  console.log(`  ${px.padEnd(6)} → ${tok.padEnd(16)} : ${counts[px] || 0} 处`);
}

if (apply) {
  writeFileSync(FILE, css, 'utf8');
  console.log('\n已写入 css/style.css');
} else {
  console.log('\n(dry-run，未写入。加 --apply 执行)');
}
