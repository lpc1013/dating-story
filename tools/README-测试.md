# 测试脚本说明（约会小故事 · 纯静态网页游戏）

本目录（`tools/`）下提供两个**只读、零侵入**的测试脚本，用于验证游戏“全流程能否跑通”。
**不修改任何游戏源码**（`index.html` / `js/` / `assets/` / `data/` 一律不动）。

---

## 1. `test-flow-static.mjs` — 静态全流程冒烟（必跑，零依赖）

纯 Node 内置模块实现，做四块校验，任一关键块失败则 `process.exit(1)`：

| 块 | 校验内容 |
|----|----------|
| (A) 语法 | 对 `js/*.js`、`assets/asset-map.js`、`serve.mjs`、`gen-playlist.mjs`、`tools/*.mjs` 逐个 `node --check` |
| (B) story.json | 可 `JSON.parse`；含 `meta.weatherGroups` 与 `weathers`；每种中文天气下每条变体线的每个事件都有 `name`/`prompt`/`options`（兼容归一化别名 `title`/`description`/`choices`），选项文案非空；收集所有事件名 |
| (C) asset-map | 用 `new Function` 取出 `ASSET_MAP`；`cnToSubs` 中文键集合与 `meta.weatherGroups` 完全一致；`eventImages` 与 `gf` 头像的**每个图片路径文件实际存在** |
| (D) playlist.json | 嵌套结构 `{artists:[{name,albums:[{name,cover,songs:[…]}]}]}`；提取所有 `.mp3` 路径，断言文件存在于 `video/` 下 |

运行：

```bat
C:\Users\Pengcheng_Li\.workbuddy\binaries\node\versions\22.22.2\node.exe tools\test-flow-static.mjs
```

（在项目根目录执行；脚本内部已硬编码该 Node 路径，也可用环境变量 `TEST_NODE` 覆盖。）

---

## 2. `test-e2e.mjs` — Playwright 浏览器端 E2E（尽力实跑）

用无头 Chromium 真实加载 `http://localhost:8088`，自动打通四种天气（晴天/多云/雨天/雪天）
的约会主流程直到某个结局屏，并对成就/恋爱手册/相册/商店/音乐馆做子系统冒烟（打开不抛未预期报错）。

### 首次运行前安装依赖（保持游戏目录干净，装在独立 workspace）

```bat
cd C:\Users\Pengcheng_Li\.workbuddy\binaries\node\workspace
npm.cmd install playwright
node node_modules\playwright\cli.js install chromium
```

### 运行 E2E

```bat
set NODE_PATH=C:\Users\Pengcheng_Li\.workbuddy\binaries\node\workspace/node_modules
C:\Users\Pengcheng_Li\.workbuddy\binaries\node\versions\22.22.2\node.exe tools\test-e2e.mjs
```

### 关键处理

- 用 `child_process.spawn` 起 `serve.mjs`（`PORT=8088`，cwd=项目根），轮询就绪后开始。
- 拦截 `cdnjs` 的 `Tone.js`（返回空）并 `addInitScript` 注入 `window.Tone` 桩，规避无头环境 CDN 被墙导致 `hoverBeep()` 抛 `ReferenceError`。
- 注入 `localStorage._visited=1` 跳过约 3s 加载屏。
- 每局独立 `context`（localStorage 隔离）。
- 确定性策略：每步读取 `gameData[weather][currentEvent].choices`，过滤被 `reqLike`/`requireItem` 隐藏项，按
  `score=(like||0)+(heart||0)*1.5 - Math.abs(money||0)*0.1` 选最高者，点击对应 `.choice-btn`（排除物品按钮）。
- 报错容忍：忽略 favicon 404 / Tone / BGM mp3 404（`SoundManager.playBgm` 内部已 `.catch`）；其余 `pageerror` / `console.error` 一律判 FAIL。

---

## 3. 结论口径

- 静态测试 **必须**通过（数据/资源/语法层面齐备）。若失败是测试逻辑问题则修脚本；
  若是真实资源缺失（如某事件图确实没生成），**不改游戏数据迁就**，而是作为“真实发现”列出。
- E2E 尽力安装并实跑；若安装/下载失败或耗时过长，则交付脚本并说明本次未执行、原因，静态测试已通过即可。
