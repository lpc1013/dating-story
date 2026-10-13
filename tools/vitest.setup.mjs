/**
 * tools/vitest.setup.mjs — 把真实浏览器源码注入 jsdom 全局，使函数可供测试调用。
 * 这样既测试「真实代码」（而非副本），又无需把游戏脚本改写成 ES Module。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 在全局上下文执行真实脚本：顶层 function / var 会挂载到 globalThis，供测试以全局名调用。
function loadScript(rel) {
  const code = readFileSync(join(ROOT, rel), 'utf8');
  vm.runInThisContext(code, { filename: rel });
}

// makeChoice / showEvent 等依赖的全局桩（仅在调用时触发）
const stubs = {
  updateStats: () => {},
  updateMood: () => {},
  showToast: () => {},
  showEvent: () => {},
  checkStatsAchievements: () => {},
  handleChoiceAchievements: () => {},
  feedbackDwell: () => 0,
  unlockAchievement: () => {},
  SoundManager: { playSfx() {}, playBgm() {} }
};
for (const [k, v] of Object.entries(stubs)) {
  if (globalThis[k] === undefined) globalThis[k] = v;
}

// makeChoice 会读取这些 DOM 元素，提供最小化的 jsdom 结构
if (typeof document !== 'undefined' && document.body) {
  document.body.innerHTML =
    '<div id="feedback"></div><div id="choices"></div>' +
    '<div id="event-description"></div><div id="like-stat-item"></div>' +
    '<div id="game-content"></div><div id="money-value"></div>';
}

// 按 index.html 的加载顺序注入真实源码（game-rules 先于 choice，使 commitStats 先可用）
loadScript('js/game-rules.js');
loadScript('js/story-loader.js');
loadScript('js/choice.js');
