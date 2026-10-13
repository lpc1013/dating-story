// rebuild-from-bak.js — 从干净的 bak 文件重建 index.html，一次性完成所有拆分
const fs = require('fs');
const bak = fs.readFileSync('index.html.bak', 'utf8');

// ===== 1. 替换内联样式 =====
let h = bak;
const styleMatch = h.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  fs.writeFileSync('css/style.css', styleMatch[1].trim() + '\n', 'utf8');
  h = h.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="css/style.css">');
  console.log('✓ CSS extracted → css/style.css (' + styleMatch[1].length + ' chars)');
}

// ===== 2. 定义模块提取边界（按源码出现顺序） =====
// 每个模块: [标记起始的字符串, 标记结束的字符串, 输出文件名]
// 注意：结束标记应该是"模块结束后下一个内容的开头"
const modules = [
  // ---- 在 <head> 内 ----
  ['const ARTIST_COVER', '// ===== 游戏核心数据', 'js/music-gallery.js'],
  
  // ---- 核心 inline script 内 ----
  ['const gifts = [', 'const loveTipsData', 'js/shop.js'],
  ['const loveTipsData = [', 'const achievementsList', 'js/tips.js'],
  ['const achievementsList = [', '// ===== 成就导出', 'js/achievements.js'],
  ['const WEATHER_META = {', 'function hideWeatherPanel()', 'js/weather-panel.js'],
  ['const albumPhotos = [', '// ===== 开始屏', 'js/album.js'],
  ['function resolveGameRules(rulesJson)', '// ===== 存档修复', 'js/game-rules.js'],
  ['function showSettings()', '// ===== TTS', 'js/settings.js'],
];

// ===== 3. 逐个提取 =====
const extracted = {};
for (const [startMark, endMark, outFile] of modules) {
  const start = h.indexOf(startMark);
  const end = h.indexOf(endMark, start);
  
  if (start < 0 || end < 0) {
    console.log('✗ NOT FOUND: ' + outFile + ' (start:' + (start>=0) + ' end:' + (end>=0) + ')');
    continue;
  }
  
  // 提取代码块
  let code = h.substring(start, end);
  
  // 对于 weather-panel，需要包含完整的 hideWeatherPanel 函数体
  if (outFile === 'js/weather-panel.js') {
    // hideWeatherPanel body is a short function, find its closing }
    const fnStart = h.indexOf('function hideWeatherPanel()');
    let depth = 0;
    let fnEnd = fnStart;
    for (let i = fnStart; i < h.length; i++) {
      if (h[i] === '{') depth++;
      else if (h[i] === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    code = h.substring(start, fnEnd);
    console.log('  weather-panel extended to include hideWeatherPanel body (' + code.length + ' chars)');
  }
  
  // 对 music-gallery，需要包含完整的 MusicGallery 对象（它引用 ARTIST_COVER/ALBUM_UNLOCK）
  if (outFile === 'js/music-gallery.js') {
    // 找到 MusicGallery = { 的结束 }
    const mgStart = h.indexOf('var MusicGallery = {');
    let depth = 0;
    let mgEnd = mgStart;
    for (let i = mgStart + 20; i < h.length; i++) {
      if (h[i] === '{') depth++;
      else if (h[i] === '}') { depth--; if (depth === 0) { mgEnd = i + 1; break; } }
    }
    // 也要包含 ARTIST_COVER 和 ALBUM_UNLOCK 常量
    const artStart = h.indexOf('var ARTIST_COVER');
    code = h.substring(artStart, mgEnd);
    console.log('  music-gallery extended to include full MusicGallery object (' + code.length + ' chars)');
  }
  
  extracted[outFile] = code;
  
  // 将 const/let → var（避免跨 script 作用域问题）
  code = code.replace(/^(const |let )/gm, 'var ');
  
  fs.writeFileSync(outFile, code, 'utf8');
  console.log('✓ ' + outFile + ' (' + code.length + ' chars)');
}

// ===== 4. 在 index.html 中替换为 script 标签 =====
// 从后往前替换，避免位置偏移
const replaceOrder = [
  ['js/settings.js', modules[7]],
  ['js/game-rules.js', modules[6]],
  ['js/album.js', modules[5]],
  ['js/weather-panel.js', modules[4]],
  ['js/achievements.js', modules[3]],
  ['js/tips.js', modules[2]],
  ['js/shop.js', modules[1]],
];

for (const [file, [startMark, endMark]] of replaceOrder) {
  const code = extracted[file];
  if (!code) continue;
  
  let start = h.indexOf(startMark);
  let end;
  
  // 特殊处理 weather-panel（包含 hideWeatherPanel 函数体）
  if (file === 'js/weather-panel.js') {
    const fnStart = h.indexOf('function hideWeatherPanel()');
    let depth = 0;
    let fnEnd = fnStart;
    for (let i = fnStart; i < h.length; i++) {
      if (h[i] === '{') depth++;
      else if (h[i] === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
    }
    end = fnEnd;
  } else {
    end = h.indexOf(endMark, start);
  }
  
  if (start < 0 || end < 0) {
    console.log('✗ Replace failed: ' + file);
    continue;
  }
  
  const replacement = '</script>\n    <script src="' + file + '"></script>\n    <script>';
  h = h.substring(0, start) + replacement + h.substring(end);
  console.log('✓ Replaced: ' + file);
}

// ===== 5. 处理 music-gallery（在 head 中） =====
const mgCode = extracted['js/music-gallery.js'];
if (mgCode) {
  let artStart = h.indexOf('var ARTIST_COVER');
  let mgStart = h.indexOf('var MusicGallery = {');
  let depth = 0;
  let mgEnd = mgStart;
  for (let i = mgStart + 20; i < h.length; i++) {
    if (h[i] === '{') depth++;
    else if (h[i] === '}') { depth--; if (depth === 0) { mgEnd = i + 1; break; } }
  }
  const replacement = '</script>\n    <script src="js/music-gallery.js"></script>\n    <script>';
  h = h.substring(0, artStart) + replacement + h.substring(mgEnd);
  console.log('✓ Replaced: js/music-gallery.js (in head)');
}

// ===== 6. 清理 =====
// 移除空 <script></script>
h = h.replace(/<script>\s*<\/script>/g, '');
// 移除连续空行
h = h.replace(/\n\n\n+/g, '\n\n');

fs.writeFileSync('index.html', h, 'utf8');

// ===== 7. 验证 =====
const opens = (h.match(/<script[^>]*>/g) || []).length;
const closes = (h.match(/<\/script>/g) || []).length;
const doCount = (h.match(/DOCTYPE html/g) || []).length;
const bodyCount = (h.match(/<body/g) || []).length;
const bodyClose = (h.match(/<\/body>/g) || []).length;

console.log('\n===== VERIFICATION =====');
console.log('Script balance: ' + opens + '/' + closes + ' ' + (opens === closes ? '✓' : '✗ UNBALANCED'));
console.log('DOCTYPE count: ' + doCount + ' ' + (doCount === 1 ? '✓' : '✗'));
console.log('<body> count: ' + bodyCount + ' ' + (bodyCount === 1 ? '✓' : '✗'));
console.log('</body> count: ' + bodyClose + ' ' + (bodyClose === 1 ? '✓' : '✗'));
console.log('File size: ' + h.length + ' chars');

// 检查关键元素
for (const el of ['start-screen', 'game-container', 'game-content', 'event-title', 'event-description', 'choices', 'feedback', 'result', 'bad-end']) {
  console.log(el + ': ' + (h.indexOf('id="' + el + '"') >= 0 ? '✓' : '✗ MISSING'));
}
