// tools/migrate-chat-stats.mjs — 把 js/chat.js 中 onEnter 内的直接数值修改迁移到 commitStats
// 模式：gameState.money += N  →  commitStats({ money: N })
//       gameState.money -= N  →  commitStats({ money: -N })
// 支持 like / heart / money。仅处理 `gameState.X += 数字` 与 `gameState.X -= 数字` 两种固定形式。
// 用法：node tools/migrate-chat-stats.mjs [--apply]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'js', 'chat.js');
const apply = process.argv.includes('--apply');

let code = readFileSync(FILE, 'utf8');
const counts = { plus: 0, minus: 0 };
const samples = [];

// gameState.<prop> += <number>   /   -= <number>
const re = /gameState\.(money|like|heart)\s*([+-])=\s*(\d+(?:\.\d+)?)\s*;/g;

code = code.replace(re, (match, prop, op, num) => {
  const val = op === '-' ? `-${num}` : num;
  if (op === '-') counts.minus++; else counts.plus++;
  const rep = `commitStats({ ${prop}: ${val} });`;
  if (samples.length < 8) samples.push(`  ${match.trim()}  →  ${rep}`);
  return rep;
});

console.log(`替换 += 写法：${counts.plus} 处`);
console.log(`替换 -= 写法：${counts.minus} 处`);
console.log('示例：');
samples.forEach((s) => console.log(s));

if (apply) {
  writeFileSync(FILE, code, 'utf8');
  console.log('\n已写入 js/chat.js');
} else {
  console.log('\n(dry-run，未写入。加 --apply 执行)');
}
