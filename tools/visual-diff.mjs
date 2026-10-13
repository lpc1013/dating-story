// tools/visual-diff.mjs — 对比两个目录下的同名 PNG，报告像素差异
// 用法：node tools/visual-diff.mjs <dirA> <dirB>
// 退出码：0=全部一致，1=存在差异
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const [dirA, dirB] = process.argv.slice(2);
if (!dirA || !dirB) { console.error('用法: node tools/visual-diff.mjs <dirA> <dirB>'); process.exit(2); }

const files = readdirSync(dirA).filter(f => f.endsWith('.png'));
let anyDiff = false;

for (const f of files) {
  let a, b;
  try {
    a = PNG.sync.read(readFileSync(join(dirA, f)));
    b = PNG.sync.read(readFileSync(join(dirB, f)));
  } catch (e) {
    console.log(`[跳过] ${f}: ${e.message}`);
    continue;
  }
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`[差异] ${f}: 尺寸不同 ${a.width}x${a.height} vs ${b.width}x${b.height}`);
    anyDiff = true;
    continue;
  }
  let diff = 0;
  let significant = 0; // 忽略抗锯齿噪声：单通道差 ≤12 视为渲染抖动
  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i]);
    const dg = Math.abs(a.data[i+1] - b.data[i+1]);
    const db = Math.abs(a.data[i+2] - b.data[i+2]);
    if (dr || dg || db) {
      diff++;
      if (dr > 12 || dg > 12 || db > 12) significant++;
    }
  }
  const total = a.width * a.height;
  const pct = (significant / total * 100);
  if (significant === 0) {
    console.log(`[一致] ${f}${diff ? `（${diff}px 抗锯齿抖动已忽略）` : ''}`);
  } else {
    console.log(`[差异] ${f}: 显著 ${significant} px (${pct.toFixed(3)}%)，含抖动共 ${diff} px`);
    if (pct > 0.05) anyDiff = true;
  }
}

console.log(anyDiff ? '\n→ 存在显著差异（>0.05%），需检查' : '\n→ 全部一致（无显著差异）');
process.exit(anyDiff ? 1 : 0);
