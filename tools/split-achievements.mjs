// tools/split-achievements.mjs  (acorn-driven: 用真实 JS 解析器精确切分顶层节点)
//
// 拆分策略：
//   1) 用 acorn 解析整个文件，得到 AST；逐层只取【顶层 program.body】节点
//      （嵌套函数/变量是父节点的子节点，随父节点一起被整段保留，绝不破坏作用域）。
//   2) 每个顶层节点用其精确的 node.start / node.end 从原始源码切片——注释、缩进、结构零失真。
//   3) 按节点名查 ROUTE 路由到 16 个功能模块；查 DROP 的丢弃（与 album.js 重复死代码）；
//      未路由的顶层 var/func 留在 achievements.js（保持全局可见）；
//      无名顶层语句（IIFE / window.addEventListener / showEvent= 等）归 bootstrap / event-render。
//   4) 节点之间的“空隙”只含注释与空白，原样按 showEvent 提及路由到 bootstrap / event-render。
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'js', 'achievements.js');
let src = readFileSync(SRC, 'utf8');

// ---- 加载 acorn（安装在 managed node workspace）----
const wsModules = join(os.homedir(), '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules');
const require = createRequire(import.meta.url);
let acorn;
try {
  acorn = require(require.resolve('acorn', { paths: [wsModules] }));
} catch (e) {
  console.error('无法加载 acorn，请先安装：', e.message);
  process.exit(2);
}

// ---- 路由表（与拆分意图一致）----
const ROUTE = {
  selectWeather: 'start-screen', selectDifficulty: 'start-screen', startRandomGame: 'start-screen',
  updateGfAvatar: 'chat', showChat: 'chat', showContactList: 'chat', renderContactList: 'chat',
  startChat: 'chat', hideChat: 'chat', updateContactStatuses: 'chat', loadChatNode: 'chat',
  showBrowser: 'chat', renderBrowserHistory: 'chat', showBrowserPage: 'chat',
  showLoveTips: 'tips', unlockLoveTip: 'tips', hideLoveTips: 'tips',
  provideWarmth: 'stats', updateMood: 'stats', updateStats: 'stats',
  updateDaytimeIndicator: 'stats', handleLikeClick: 'stats',
  showRedeemModal: 'redeem', hideRedeemModal: 'redeem', redeemCode: 'redeem',
  startGame: 'game-init', initGame: 'game-init',
  showInventory: 'inventory', hideInventory: 'inventory', updateInventoryUI: 'inventory',
  showItemDetail: 'inventory', addToInventory: 'inventory',
  showMoodInfo: 'mood', hideMoodInfo: 'mood',
  triggerCamera: 'media', showCgLightbox: 'media',
  feedbackDwell: 'util', escAttr: 'util', shareStory: 'util',
  injectItemChoices: 'event-render', renderParticles: 'event-render', showEvent: 'event-render',
  origShowEvent: 'event-render',
  restaurantBranch: 'choice', handleChoiceAchievements: 'choice', makeChoice: 'choice',
  triggerRandomDrop: 'gift', showCustomGiftModal: 'gift', hideCustomGift: 'gift',
  createCustomGift: 'gift', setupCustomGiftListeners: 'gift', updateGiftPreview: 'gift',
  showResult: 'result', renderSlideshow: 'result',
  showBadEnd: 'endings', showMoodEnd: 'endings', spawnEndingParticles: 'endings', showEndingGallery: 'endings',
  showJournal: 'journal',
  showAchievementToast: '__KEEP__', unlockAchievement: '__KEEP__', checkStatsAchievements: '__KEEP__',
  showAchievements: '__KEEP__', hideAchievements: '__KEEP__', filterAchievements: '__KEEP__',
  sortAchievements: '__KEEP__', renderAchievements: '__KEEP__', openAchievementModal: '__KEEP__',
  closeAchievementModal: '__KEEP__', updateAchievementFoot: '__KEEP__',
  achievementsList: '__KEEP__',
  contacts: 'chat', currentContactId: 'chat', currentChatNodeId: 'chat', chatData: 'chat', browserHistory: 'chat',
  cgLightboxEl: 'media', RESTAURANT_SEQUENCE: 'choice', customGiftData: 'gift', SFX: 'sfx',
};
const DROP = new Set(['showAlbum', 'showMusicHall', 'switchAlbumTab', 'fmtTime', 'viewPhoto', 'hideAlbum', 'unlockPhoto', 'showResultFromJournal', 'hideAllPanels', 'restartGame', 'albumPhotos']);
const MOD_DESC = {
  'start-screen': '开始界面：天气/难度/随机开局', 'chat': '聊天系统', 'tips': '恋爱贴士展示',
  'stats': '数值/心情/温暖', 'redeem': '兑换码', 'game-init': '游戏启动', 'inventory': '背包面板',
  'mood': '心情弹窗', 'media': '相机/CG', 'util': '通用工具', 'event-render': '事件渲染',
  'choice': '选项结算', 'gift': '礼物系统', 'result': '结算页', 'endings': '结局', 'journal': '日记',
  'sfx': '音效', 'bootstrap': '页面初始化/全局事件',
};

// ---- 解析（第一遍：递归收集 DROP 死代码区间）----
let ast;
try {
  ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
} catch (e) {
  console.error('acorn 解析失败：', e.message);
  process.exit(2);
}
// 递归遍历所有节点（含嵌套在 IIFE 内的声明），把 DROP 名字的声明区间从源码中整段删除
function walk(node, cb) {
  if (!node || typeof node !== 'object') return;
  cb(node);
  for (const key of Object.keys(node)) {
    if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
    const val = node[key];
    if (Array.isArray(val)) { for (const v of val) if (v && typeof v === 'object' && v.type) walk(v, cb); }
    else if (val && typeof val === 'object' && v_type_ok(val)) walk(val, cb);
  }
}
function v_type_ok(v) { return typeof v.type === 'string'; }
const dropRanges = [];
walk(ast, node => {
  let names = [];
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') { if (node.id) names.push(node.id.name); }
  else if (node.type === 'VariableDeclaration') { for (const d of node.declarations) if (d.id && d.id.type === 'Identifier') names.push(d.id.name); }
  if (names.some(n => DROP.has(n))) dropRanges.push([node.start, node.end]);
});
if (dropRanges.length) {
  dropRanges.sort((a, b) => b[0] - a[0]);
  for (const [s, e] of dropRanges) src = src.slice(0, s) + src.slice(e);
  // 重新解析清理后的源码
  ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
}
const body = ast.body.slice().sort((a, b) => a.start - b.start);

// ---- 取顶层节点名 / 是否丢弃 ----
function nodeNames(node) {
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
    return node.id ? [node.id.name] : [];
  }
  if (node.type === 'VariableDeclaration') {
    const out = [];
    for (const d of node.declarations) {
      if (d.id && d.id.type === 'Identifier') out.push(d.id.name);
    }
    return out;
  }
  return [];
}
function isDrop(node) {
  return nodeNames(node).some(n => DROP.has(n));
}
function routeOf(node) {
  const names = nodeNames(node);
  for (const n of names) {
    if (ROUTE[n]) return ROUTE[n];
  }
  return null; // null → 顶层语句/无名声明：走 gap 路由或留 achievements.js
}

// 顶层节点序列（丢弃 DROP）
const kept = [];
const dropped = [];
for (const node of body) {
  if (isDrop(node)) { dropped.push(...nodeNames(node)); continue; }
  kept.push(node);
}

// ---- 切分 ----
const files = {};
let keepTexts = [];
const unrouted = [];

// 先处理各节点
for (const node of kept) {
  const text = src.slice(node.start, node.end);
  const r = routeOf(node);
  if (r === '__KEEP__') { keepTexts.push(text); }
  else if (r) { (files[r] = files[r] || []).push(text); }
  else {
    // 顶层语句（IIFE / 赋值 / window.xxx）：按内容路由到 event-render / bootstrap
    const target = text.includes('showEvent') ? 'event-render' : 'bootstrap';
    (files[target] = files[target] || []).push(text);
  }
}

// ---- 节点间空隙（仅注释 + 空白；纯注释的空隙丢弃，避免把原文件小节注释塞进 bootstrap）----
function gapHasCode(gap) {
  const stripped = gap.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  return stripped.trim().length > 0;
}
let prevEnd = 0;
for (const node of kept) {
  const gap = src.slice(prevEnd, node.start);
  if (gapHasCode(gap)) {
    const target = gap.includes('showEvent') ? 'event-render' : 'bootstrap';
    (files[target] = files[target] || []).push(gap);
  }
  prevEnd = node.end;
}
const tailGap = src.slice(prevEnd);
if (gapHasCode(tailGap)) {
  const target = tailGap.includes('showEvent') ? 'event-render' : 'bootstrap';
  (files[target] = files[target] || []).push(tailGap);
}

// ---- 写出 ----
// tips.js 是既有模块（已内含从 achievements.js 拆出的 showLoveTips/unlockLoveTip/hideLoveTips），
// 绝不覆盖，避免丢失其独有内容。这三个函数已合并进既有 tips.js，无需再写。
if (files['tips'] && existsSync(join(ROOT, 'js', 'tips.js'))) {
  delete files['tips'];
}
let total = 0;
const written = [];
for (const [mod, texts] of Object.entries(files)) {
  const header = `// js/${mod}.js — 从 achievements.js 拆分（功能：${MOD_DESC[mod] || mod}）\n\n`;
  const body2 = header + texts.join('\n\n') + '\n';
  writeFileSync(join(ROOT, 'js', `${mod}.js`), body2);
  total += body2.length;
  written.push(`js/${mod}.js(n=${texts.length},${body2.length}B)`);
}
const aHeader = `// js/achievements.js — 成就本体（已从原"挂羊头"大文件拆分，其余功能见各 js/ 模块）\n\n`;
const aBody = aHeader + keepTexts.join('\n\n') + '\n';
writeFileSync(SRC, aBody);
total += aBody.length;

console.log('WROTE:', written.join('  '));
console.log(`KEPT achievements.js nodes=${keepTexts.length} bytes=${aBody.length}`);
console.log(`DROPPED: ${[...new Set(dropped)].join(', ') || '(none)'}`);
console.log(`src=${src.length} out=${total} diff=${src.length - total} (应≈被丢弃死代码体积)`);

// ---- 语法校验 ----
console.log('\n--- node --check ---');
let ok = 0, fail = 0;
const allFiles = [...written.map(w => w.split('(')[0]), 'js/achievements.js'];
const { execSync } = require('child_process');
for (const f of allFiles) {
  try {
    execSync(`"${process.execPath}" --check "${join(ROOT, f)}"`, { stdio: 'pipe' });
    ok++;
  } catch (e) {
    fail++;
    console.log(`FAIL ${f}:\n${e.stderr ? e.stderr.toString() : e.message}`);
  }
}
console.log(`syntax check: ${ok} OK, ${fail} FAIL`);
