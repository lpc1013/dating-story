// mark_cut_flags.mjs — 一次性审计：给 story.json 中确认的敷衍/复制粘贴选项加 `_flag:"cut"`
// 只标记，不改语义；运行时引擎忽略未知字段，静态测试不校验字段白名单，安全。
// 运行：node tools/mark_cut_flags.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NODE = 'C:////Users////Pengcheng_Li////.workbuddy////binaries////node////versions////22.22.2////node.exe';
const p = path.join(ROOT, 'data', 'story.json');

// 命中的精确重复 result（已人工确认是复制粘贴模板）。JS 源里内层对话引号用 \" 转义，
// Set 内存值即 option.result 解码后的真实字符串。
const WL = new Set([
  '她撇撇嘴："你真扫兴..."',                                                          // 9 处裸 filler
  '她撇撇嘴："你真不懂浪漫..."她失望地看着你。',                                        // 3 处
  '她撇撇嘴："好吧...下次再来..."她依依不舍地看着橱窗，但还是跟着你走了。一路上，她时不时回头看照相馆，眼神里充满了遗憾...', // 照相馆模板(1069/2737)
  '她撇撇嘴："好吧...下次再来..."她依依不舍地看着远处的古建筑，但还是跟着你走了。一路上，她时不时回头看，眼神里充满了遗憾...', // 古建筑变体(7999)
  '你摇摇头，拉着她走了。她回头看了一眼摊位，眼神里充满了遗憾："好吧...下次再来..."雾气中，她的背影显得有些落寞。',         // 雾气变体(7477)
]);

const data = JSON.parse(fs.readFileSync(p, 'utf8'));

// 1) 标记命中的选项，收集结构化报告
const marked = [];
for (const [sub, variant] of Object.entries(data.weathers || {})) {
  (variant.events || []).forEach((ev) => {
    (ev.options || ev.choices || []).forEach((o) => {
      if (o && WL.has(o.result) && !o._flag) {
        o._flag = 'cut';
        marked.push({
          weather: sub,
          event: ev.name || ev.title || '(未命名)',
          key: o.key || '(无 key)',
          label: o.label || o.text || '(无 label)',
          resultSnippet: (o.result || '').slice(0, 28) + '…',
        });
      }
    });
  });
}

// 2) 全库精确重复 result 统计（透明列出，供人工决定是否扩展标记）
const freq = new Map();
for (const variant of Object.values(data.weathers || {})) {
  for (const ev of variant.events || []) {
    for (const o of ev.options || ev.choices || []) {
      if (o && typeof o.result === 'string') {
        freq.set(o.result, (freq.get(o.result) || 0) + 1);
      }
    }
  }
}
const dupes = [...freq.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);

// 3) 写回（2 空格缩进，与原文件一致）
fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');

// 4) 报告
console.log('=== 已标记 _flag:"cut" 的选项（共 ' + marked.length + ' 项）===');
for (const m of marked) {
  console.log(`  [${m.weather}] ${m.event} | 选项${m.key}「${m.label}」 → ${m.resultSnippet}`);
}
console.log('\n=== 全库精确重复 result（count>=2，共 ' + dupes.length + ' 组）===');
for (const [s, n] of dupes) {
  const flagged = WL.has(s) ? ' [已标 cut]' : '';
  console.log(`  ×${n}  ${s.slice(0, 40)}…${flagged}`);
}

// 5) 顺带跑静态测试确认没破坏结构
try {
  const out = execFileSync(NODE, [path.join(ROOT, 'tools', 'test-flow-static.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const last = out.trim().split('\n').slice(-3).join(' | ');
  console.log('\n[静态测试] ' + last);
} catch (e) {
  console.log('\n[静态测试] 失败：' + (e.stdout || e.stderr || e.message).toString().split('\n').slice(-5).join(' | '));
}
