// tools/visual-baseline.mjs — 视觉基线快照
// 用法：node tools/visual-baseline.mjs <输出目录>
// 对启动页 / 游戏主页 / 成就面板 截图，用于 CSS 重构前后结构对比。
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(ROOT, '.shots-baseline');
const BASE = 'http://localhost:8088';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
// 使用 prefers-reduced-motion 让页面走静态分支（天气粒子仅绘制一帧），消除动画带来的非确定性
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce'
});

// 冻结随机数，避免随机事件/粒子造成差异
await page.addInitScript(() => {
  let s = 42;
  Math.random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
});

await page.goto(BASE + '/');
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, '1-start.png') });

// 进入游戏
await page.locator('.start-btn').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, '2-game.png') });

// 打开工具抽屉
await page.locator('.tool-drawer-btn').click();
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, '3-drawer.png') });

// 打开成就面板
await page.locator('.tool-item', { hasText: '我的成就' }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, '4-achievements.png') });

// 关闭成就面板，打开贴士
await page.keyboard.press('Escape').catch(() => {});
await page.evaluate(() => { const p = document.getElementById('achievements-panel'); if (p) p.classList.remove('show'); });
await page.waitForTimeout(200);
await page.evaluate(() => showLoveTips());
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, '5-tips.png') });

await browser.close();
console.log('[visual-baseline] 截图已保存到', OUT);
