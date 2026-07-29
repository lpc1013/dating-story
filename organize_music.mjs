// organize_music.mjs — 归一化整理 video/ 下的歌曲
// 用法：node organize_music.mjs            (dry-run，仅打印计划)
//       node organize_music.mjs --go       (实际执行移动+重命名)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();
const VIDEO = path.join(ROOT, 'video');
const GO = process.argv.includes('--go');

// 已知歌手（用于判断 dash 文件名里哪边是歌手）
const KNOWN_ARTISTS = new Set([
  '周杰伦', '许嵩', '邓紫棋', '杨丞琳', '李玟', 'Penny', 'G.E.M. 邓紫棋',
]);
// 歌手名规范化（G.E.M. 邓紫棋 -> 邓紫棋）
const ARTIST_CANON = { 'G.E.M. 邓紫棋': '邓紫棋' };
// 把 "A & B" / "A & B " 规范成 "A&B"
function normArtist(a) {
  let s = a.trim().replace(/\s*&\s*/g, '&');
  return ARTIST_CANON[s] || s;
}
// 合作曲归入主歌手文件夹（文件名仍保留完整合作信息）
const PRIMARY = {
  '周杰伦&Lara梁心颐': '周杰伦',
  '周杰伦&张惠妹': '周杰伦',
  '周杰伦&杨瑞代': '周杰伦',
  '许嵩&何曼婷': '许嵩',
  '许嵩&石头剪子布': '许嵩',
  '李玟&周杰伦': '李玟',
};

// 特殊文件（编号 / 乱命名），直接用规则匹配
const SPECIAL = [
  { re: /爱你没差/, artist: '周杰伦', song: '爱你没差', album: '12新作' },
  { re: /^Penny/i, artist: 'Penny', song: '打火机', album: '打火机' },
  { re: /^10\./, artist: '周杰伦', song: '龙卷风', album: '杰伦' },
  { re: /^16\./, artist: '邓紫棋', song: '新的心跳', album: '新的心跳' },
  { re: /^24\./, artist: '邓紫棋', song: '冰河时代', album: '启示录' },
  { re: /^5\./, artist: '邓紫棋', song: '光年之外', album: '光年之外' },
  { re: /^6\./, artist: '邓紫棋', song: '句号', album: '摩天动物园' },
  { re: /^7\./, artist: '邓紫棋', song: '倒数', album: '另一个童话' },
  { re: /^9\./, artist: '邓紫棋', song: '来自天堂的魔鬼', album: '新的心跳' },
  { re: /^98\./, artist: '李玟&周杰伦', song: '刀马旦', album: 'Promise' },
];

// 专辑查找表： "歌手|歌曲" -> 专辑名
const ALBUM = {
  // 周杰伦
  '周杰伦|一路向北': '十一月的萧邦',
  '周杰伦|七里香': '七里香',
  '周杰伦|不能说的秘密': '不能说的秘密 电影原声带',
  '周杰伦|东风破': '叶惠美',
  '周杰伦|乌克丽丽': '12新作',
  '周杰伦|以父之名': '叶惠美',
  '周杰伦|兰亭序': '魔杰座',
  '周杰伦|半岛铁盒': '八度空间',
  '周杰伦|发如雪': '十一月的萧邦',
  '周杰伦|可爱女人': '杰伦',
  '周杰伦|听妈妈的话': '依然范特西',
  '周杰伦|听见下雨的声音': '哎呦不错哦',
  '周杰伦|告白气球': '周杰伦的床边故事',
  '周杰伦|园游会': '七里香',
  '周杰伦|夜曲': '十一月的萧邦',
  '周杰伦|她的睫毛': '叶惠美',
  '周杰伦|安静': '范特西',
  '周杰伦|彩虹': '我很忙',
  '周杰伦|心雨': '依然范特西',
  '周杰伦|我不配': '我很忙',
  '周杰伦|手写的从前': '哎呦不错哦',
  '周杰伦|搁浅': '七里香',
  '周杰伦|断了的弦': '寻找周杰伦',
  '周杰伦|明明就': '12新作',
  '周杰伦|星晴': '杰伦',
  '周杰伦|晴天': '叶惠美',
  '周杰伦|最长的电影': '我很忙',
  '周杰伦|枫': '十一月的萧邦',
  '周杰伦|浪漫手机': '十一月的萧邦',
  '周杰伦|烟花易冷': '跨时代',
  '周杰伦|爱在西元前': '范特西',
  '周杰伦|甜甜的': '我很忙',
  '周杰伦|稻香': '魔杰座',
  '周杰伦|等你下课': '最伟大的作品',
  '周杰伦|简单爱': '范特西',
  '周杰伦|红尘客栈': '12新作',
  '周杰伦|给我一首歌的时间': '魔杰座',
  '周杰伦|花海': '魔杰座',
  '周杰伦|菊花台': '依然范特西',
  '周杰伦|蒲公英的约定': '我很忙',
  '周杰伦|轨迹': '寻找周杰伦',
  '周杰伦|退后': '依然范特西',
  '周杰伦|阳光宅男': '我很忙',
  '周杰伦|青花瓷': '我很忙',
  '周杰伦|黑色幽默': '杰伦',
  '周杰伦|黑色毛衣': '十一月的萧邦',
  '周杰伦|龙卷风': '杰伦',
  '周杰伦&Lara梁心颐|珊瑚海': '十一月的萧邦',
  '周杰伦&张惠妹|不该': '周杰伦的床边故事',
  '周杰伦&杨瑞代|爱的飞行日记': '跨时代',
  // 许嵩
  '许嵩|幻听': '梦游计',
  '许嵩|最佳歌手': '青年晚报',
  '许嵩|清明雨上': '自定义',
  '许嵩|灰色头像': '寻雾启示',
  '许嵩|如果当时': '自定义',
  '许嵩|有何不可': '自定义',
  '许嵩&何曼婷|素颜': '素颜',
  '许嵩&石头剪子布|你若成风': '你若成风',
  // 邓紫棋
  '邓紫棋|多远都要在一起': '新的心跳',
  '邓紫棋|天空没有极限': '启示录',
  '邓紫棋|光年之外': '光年之外',
  '邓紫棋|句号': '摩天动物园',
  '邓紫棋|倒数': '另一个童话',
  '邓紫棋|来自天堂的魔鬼': '新的心跳',
  '邓紫棋|新的心跳': '新的心跳',
  '邓紫棋|冰河时代': '启示录',
  // 杨丞琳
  '杨丞琳|雨爱': 'Rainie & Love 雨爱',
  // Penny
  'Penny|打火机': '打火机',
  // 李玟
  '李玟&周杰伦|刀马旦': 'Promise',
};

function parseDash(fn) {
  const base = fn.replace(/\.[^.]+$/, '');
  const parts = base.split(/\s+[-–—]+\s+/);
  if (parts.length < 2) return null;
  let left = parts[0].trim();
  let right = parts[parts.length - 1].trim();
  const leftKnown = KNOWN_ARTISTS.has(left) || [...KNOWN_ARTISTS].some((a) => left.includes(a));
  const rightKnown = KNOWN_ARTISTS.has(right) || [...KNOWN_ARTISTS].some((a) => right.includes(a));
  let artistRaw, song;
  if (leftKnown && !rightKnown) { artistRaw = left; song = right; }
  else if (rightKnown && !leftKnown) { artistRaw = right; song = left; }
  else { artistRaw = left; song = right; } // 默认左边是歌手
  return { artist: normArtist(artistRaw), song };
}

// 收集 video/ 顶层 mp3（排除 纯音乐 目录与 playlist.json）
const files = fs.readdirSync(VIDEO).filter((f) => {
  const full = path.join(VIDEO, f);
  return fs.statSync(full).isFile() && f.toLowerCase().endsWith('.mp3');
});

const plan = [];
const warnings = [];
for (const f of files) {
  let artist, song, album;
  const sp = SPECIAL.find((s) => s.re.test(f));
  if (sp) {
    artist = sp.artist; song = sp.song; album = sp.album;
  } else {
    const p = parseDash(f);
    if (!p) { warnings.push(`无法解析文件名，跳过：${f}`); continue; }
    artist = p.artist; song = p.song;
    const key = `${artist}|${song}`;
    album = ALBUM[key];
    if (!album) { warnings.push(`缺少专辑映射，跳过：${f}  ->  ${key}`); continue; }
  }
  const folderArtist = PRIMARY[artist] || artist;
  const target = path.join(VIDEO, folderArtist, album, `${artist}_${song}.mp3`);
  plan.push({ src: path.join(VIDEO, f), target, artist, folderArtist, album, song, name: f });
}

// 重复目标检测
const byTarget = new Map();
for (const p of plan) {
  if (!byTarget.has(p.target)) byTarget.set(p.target, []);
  byTarget.get(p.target).push(p);
}
const dups = [];
for (const [t, arr] of byTarget) {
  if (arr.length > 1) {
    // 比较源文件大小判断是否一致
    const sizes = arr.map((p) => fs.statSync(p.src).size);
    const identical = sizes.every((s) => s === sizes[0]);
    dups.push({ target: t, files: arr.map((p) => p.name), identical, size: sizes[0] });
  }
}

// 处理重复：保留第一个，其余若完全一致则标记删除源，否则加 _2 后缀移动
const skip = new Set();
const renameDup = [];
for (const d of dups) {
  if (d.identical) {
    // 保留 plan 中第一个，删除其余源文件（已有一致副本）
    for (let i = 1; i < d.files.length; i++) {
      const idx = plan.findIndex((p) => p.name === d.files[i]);
      if (idx >= 0) { skip.add(plan[idx].name); }
    }
    dups.push; // noop
  } else {
    for (let i = 1; i < d.files.length; i++) {
      const p = plan.find((q) => q.name === d.files[i]);
      p.target = p.target.replace(/\.mp3$/, ' (2).mp3');
      renameDup.push(p.name);
    }
  }
}

const finalPlan = plan.filter((p) => !skip.has(p.name));

console.log(`\n=== DRY RUN: ${GO ? '(实际执行)' : '(预览)'} ===`);
console.log(`待整理文件数: ${finalPlan.length}  (原 ${plan.length}，跳过重复 ${skip.size})`);
console.log('\n--- 歌手 / 专辑 / 文件 ---');
const byArtist = {};
for (const p of finalPlan) (byArtist[p.folderArtist] ||= new Set()).add(p.album);
for (const a of Object.keys(byArtist).sort()) {
  console.log(`📂 ${a}/`);
  for (const al of [...byArtist[a]].sort()) {
    const cnt = finalPlan.filter((p) => p.folderArtist === a && p.album === al).length;
    console.log(`   📁 ${al}/  (${cnt} 首)`);
  }
}
console.log('\n--- 移动明细 ---');
for (const p of finalPlan) {
  console.log(`${p.name}\n   -> ${path.relative(ROOT, p.target)}`);
}
if (warnings.length) {
  console.log('\n⚠️ 警告:');
  warnings.forEach((w) => console.log('  ' + w));
}
if (dups.length) {
  console.log('\n🔁 重复目标:');
  for (const d of dups) {
    console.log(`  ${path.relative(ROOT, d.target)}  x${d.files.length}  一致=${d.identical}  大小=${d.size}`);
    d.files.forEach((f) => console.log(`     - ${f}`));
  }
}

if (!GO) {
  console.log('\n(预览结束，未做任何改动。加 --go 执行)');
  process.exit(0);
}

// 执行
let ok = 0, fail = 0;
for (const p of finalPlan) {
  try {
    fs.mkdirSync(path.dirname(p.target), { recursive: true });
    fs.renameSync(p.src, p.target);
    ok++;
  } catch (e) {
    console.error(`❌ 失败 ${p.name}: ${e.message}`);
    fail++;
  }
}
// 删除完全一致的多余源文件
for (const d of dups) {
  if (d.identical) {
    for (let i = 1; i < d.files.length; i++) {
      const src = path.join(VIDEO, d.files[i]);
      try { fs.unlinkSync(src); console.log(`🗑️ 删除完全一致副本: ${d.files[i]}`); }
      catch (e) { console.error(`❌ 删除失败 ${d.files[i]}: ${e.message}`); }
    }
  }
}
console.log(`\n✅ 移动成功 ${ok} 个，失败 ${fail} 个`);
