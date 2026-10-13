// =============================================================================
// tools/check-globals.mjs — 真实浏览器校验：HTML 事件属性(onclick 等)调用的函数
//                          是否真的挂在 window 上（防 ReferenceError 隐患）
// -----------------------------------------------------------------------------
// 为什么需要它：静态扫描很难判断函数是否真在全局作用域（正则字面量、模板字符串
// 里的 {} 会让括号深度法误判）。这里用无头浏览器直接问 window，结论 100% 可信。
//
// 依赖：playwright（NODE_PATH 指向 workspace/node_modules）
// 用法：node tools/check-globals.mjs
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8089; // 与 E2E 的 8088 错开，避免端口占用

// ── 1. 从 index.html 提取所有事件属性调用的函数名 ──
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const calls = [...new Set(
  [...html.matchAll(/on(?:click|change|input|submit|focus|blur)="([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1])
)].sort();

// 内联 JS 里以字符串形式调用的名字（如 addEventListener('xxx')）不在此列，
// 本脚本只关心 HTML 事件属性——它们的查找发生在运行时全局作用域，最容易出问题。
console.log(`HTML 事件属性共调用 ${calls.length} 个函数\n`);

// ── 2. 起静态服务 ──
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, r));

// ── 3. 无头浏览器实测 ──
let result;
try {
  // ESM 的 import 不读取 NODE_PATH，必须用 createRequire（与 test-e2e.mjs 同款写法）
  const PW_WS = process.env.PLAYWRIGHT_WORKSPACE || 'C:/Users/Pengcheng_Li/.workbuddy/binaries/node/workspace';
  const req = createRequire(path.join(PW_WS, 'package.json'));
  const { chromium } = req('playwright');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--allow-file-access-from-files', '--mute-audio'],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500); // 等所有 js 模块加载完

  result = await page.evaluate((names) => {
    const out = {};
    for (const n of names) out[n] = typeof window[n];
    return out;
  }, calls);

  const bad = calls.filter(n => result[n] !== 'function');
  const ok = calls.filter(n => result[n] === 'function');
  console.log(`✅ 解析为 function : ${ok.length}/${calls.length}`);
  if (bad.length) {
    console.log(`\n❌ 非 function（点击会抛 ReferenceError / 静默失效）共 ${bad.length} 个:`);
    for (const n of bad) console.log(`   ${n.padEnd(24)} typeof = ${result[n]}`);
  } else {
    console.log('✅ 全部可解析，无 onclick 失效隐患');
  }
  if (pageErrors.length) {
    console.log(`\n⚠️ 页面加载期捕获到 ${pageErrors.length} 个错误:`);
    pageErrors.slice(0, 10).forEach(e => console.log('   ' + e.slice(0, 140)));
  } else console.log('\n✅ 页面加载期零 JS 错误');

  await browser.close();
} catch (e) {
  console.log('❌ 浏览器校验失败: ' + e.message);
  console.log('   提示：确认 NODE_PATH 已指向含 playwright 的 node_modules，且本机 Chrome 路径正确');
  process.exitCode = 1;
}

server.close();
