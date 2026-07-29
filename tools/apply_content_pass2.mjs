// =============================================================================
// tools/apply_content_pass2.mjs — 第二轮「你真扫兴」残留模板 cleanup
// -----------------------------------------------------------------------------
// 背景：上轮 apply_content_pass.mjs 已重写 20 处并接线 12 个道具（静态 57/0）。
//       但 data/story.json 仍残留 6 处「你真扫兴」懒人模板变体（与已清的 9 处同模板，
//       仅尾句不同）。本脚本将这 6 处重写为有温度、贴合语境、调暖数值的选项，
//       与 docs/内容pass设计.md A 节同基调、同质量。
//
// 设计约束（来自任务与红线）：
//   1. 仅匹配 6 处精确 result 字符串 → 不触碰「松开了你的手」的 7 处刻意负面/失败分支。
//   2. 不重命名任何事件 name（接图安全）。
//   3. 中文叙事不夹英文词。
//   4. 保留 key/label/money/moneyRaw/romantic/achievement/reqLike/reward 等字段；
//      仅改 result + like/heart(调暖) + mood/moodRaw。
//   5. 可重跑、幂等：靠精确 result 匹配，已改则跳过；JSON.parse→walk→JSON.stringify 保证合法。
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STORY = path.join(ROOT, 'data', 'story.json');

// 6 处精确匹配表：oldResult 必须唯一（grep 已确认恰好 6 处）。
// 数值收为「轻微代价 + 有温度」：like 1~3、heart 0~2，mood neutral/happy。
const REWRITES = [
  {
    // 商场抽奖 · 选项 C（label: 说抽奖都是套路，拉她直接走）— 她想玩一下抽奖
    oldResult: '她撇撇嘴："你真扫兴...就玩一下嘛..."',
    newResult: '你嘴上念叨"都是套路"，手却没真把她拽走，反倒蹲下来陪她研究转盘："中奖概率低归低，可你跃跃欲试的样子，比中奖还好看。"她眼睛一亮，戳戳你肩膀："那…下回你给我买单？"你揉揉她发顶："成，下回咱专挑那台最花哨的。"没抽成奖，却把一颗想玩的心轻轻接住了。',
    mood: 'neutral', moodRaw: '😐 一般', like: 2, heart: 1,
  },
  {
    // 路边花摊（晴天）· 选项 D（label: 说花很快就谢了，不买）— 她想买束花
    oldResult: '她撇撇嘴："你真扫兴...阳光这么好，买束花多浪漫..."',
    newResult: '你低头凑近花香嗅了嗅："真花确实留不住，可你站在阳光里挑花的样子，比花还经看。"她耳尖微红，把脸别过去："你这人…怎么连拒绝都带糖。"你笑着牵起她："走，下回挑盆不会谢的，摆你书桌上。"花没买成，春风却把这句约定稳稳吹进了心里。',
    mood: 'neutral', moodRaw: '😐 一般', like: 2, heart: 1,
  },
  {
    // 面包店 · 选项 D（label: 说家里有面包，别浪费钱）— 她想买刚出炉的面包
    oldResult: '她撇撇嘴："你真扫兴...刚出炉的多香啊。"',
    newResult: '你吸了吸鼻子："是挺香…可家里那袋还没吃完，浪费了可惜。"她撇撇嘴刚要闹，你却凑近她耳边："等周末，我带你来买刚出炉的第一炉，热乎乎的都归你。"她眼睛弯起来："那说好了，第一炉得有我的份。"香味没带回家，约定却先揣进了兜里。',
    mood: 'neutral', moodRaw: '😐 一般', like: 2, heart: 1,
  },
  {
    // 彩虹 · 选项 C（label: 说彩虹没意思不看）— 她想看彩虹
    oldResult: '她撇撇嘴："你真扫兴...这么美的彩虹你都不看..."',
    newResult: '你原本低着头，听见她的惋惜才抬眼——彩虹正横跨半边天。你放下手机，把她的手拢进掌心："不是没意思，是怕一抬头，就先忘了看你。"她噗嗤笑了，用力掐了下你胳膊："酸不酸…那彩虹，得陪我一起看。"两人并肩望着那道弧，连风都甜了几分。',
    mood: 'happy', moodRaw: '😊 开心', like: 3, heart: 2,
  },
  {
    // 充电/拍照 · 选项 C（label: 说拍照太麻烦，不充也行）— 她想拍照，手机电量低
    oldResult: '她撇撇嘴："你真扫兴...我明明想拍照的..."手机电量越来越低...',
    newResult: '你看着她电量标红的手机，嘴上说"麻烦"，却把她的小拇指勾进自己手心："拍什么拍，先把人记我心里不就得了。"她噗嗤笑了，电量还在掉，可她把头轻轻靠过来："那你可得记清楚，别赖账。"没拍成照，这一刻却被你俩悄悄收进了回忆。',
    mood: 'neutral', moodRaw: '😐 一般', like: 2, heart: 1,
  },
  {
    // 玻璃画（雪天）· 选项 C（label: 觉得无聊别乱画）— 她想一起玩/画
    oldResult: '她撇撇嘴："你真扫兴...我就想和你一起玩嘛..."她轻轻叹了口气，看着窗外的雪',
    newResult: '你把指尖贴上冰凉的玻璃，本想说"幼稚"，却跟着她在雾气上描了只歪歪的小猫："无聊归无聊，陪你幼稚一回，倒也不亏。"她眼睛一亮，挨着你又画了颗心："那这颗，算咱俩的。"窗外雪落无声，玻璃上的小猫和心，却暖得不像话。',
    mood: 'happy', moodRaw: '😊 开心', like: 3, heart: 2,
  },
];

function walkOptions(data) {
  const out = [];
  const weathers = data && data.weathers;
  if (!weathers || typeof weathers !== 'object') return out;
  for (const variant of Object.values(weathers)) {
    const events = variant && variant.events;
    if (!Array.isArray(events)) continue;
    for (const ev of events) {
      const opts = ev && (ev.options != null ? ev.options : ev.choices);
      if (Array.isArray(opts)) out.push(opts);
    }
  }
  return out;
}

const raw = fs.readFileSync(STORY, 'utf8');
const data = JSON.parse(raw);

let changed = 0;
const changedLog = [];
const missing = [];

for (const opts of walkOptions(data)) {
  for (const o of opts) {
    if (typeof o.result !== 'string') continue;
    const rw = REWRITES.find(r => r.oldResult === o.result);
    if (!rw) continue;
    // 重写 result + 调暖数值；保留 key/label/money/romantic/achievement/reqLike/reward 等
    o.result = rw.newResult;
    o.mood = rw.mood;
    o.moodRaw = rw.moodRaw;
    o.like = { type: 'fixed', value: rw.like };
    o.heart = { type: 'fixed', value: rw.heart };
    changed++;
    changedLog.push({ old: rw.oldResult, like: rw.like, heart: rw.heart, mood: rw.mood });
  }
}

// 幂等校验：6 个 oldResult 在改写后不应再存在
for (const r of REWRITES) {
  let stillThere = false;
  for (const opts of walkOptions(data)) {
    for (const o of opts) if (o.result === r.oldResult) stillThere = true;
  }
  if (stillThere) missing.push(r.oldResult);
}

fs.writeFileSync(STORY, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log('[apply_content_pass2] 重写命中: ' + changed + ' / 6 处');
for (const c of changedLog) {
  console.log('  · like=' + c.like + ' heart=' + c.heart + ' mood=' + c.mood + '  ← ' + c.old.slice(0, 18) + '…');
}
if (missing.length) {
  console.log('[apply_content_pass2] ⚠ 以下 oldResult 改写后仍残留（异常）:');
  for (const s of missing) console.log('    - ' + s);
  process.exit(2);
} else {
  console.log('[apply_content_pass2] ✔ 6 处全部命中并已重写；「松开了你的手」分支未触碰。');
}
