# 测试脚本说明（约会小故事 · 纯静态网页游戏）

本目录（`tools/`）下提供只读、零侵入的测试/审计脚本，用于验证游戏"全流程能否跑通"。
**不修改任何游戏源码**（`index.html` / `js/` / `assets/` / `data/` 一律不动）。

> ⚠️ **不要用硬编码的 Node 路径启动脚本**。managed node 的版本目录后缀会变
> （`22.12.0` → `22.22.2-3` → `22.22.2-6`…），写死必然在某天失效——历史上曾导致 A 组 44 项
> 语法检查全部打成 ENOENT。脚本内部已统一使用 `process.execPath`；命令行直接用 `node` 即可。

---

## 1. `test-flow-static.mjs` — 静态全流程冒烟（必跑，零依赖）

`node tools/test-flow-static.mjs`

纯 Node 内置模块实现，共 7 块校验，任一关键块失败则 `process.exit(1)`。**当前基线 133/133 PASS**。

| 块 | 校验内容 |
|----|----------|
| (A) 语法 | 对 `js/*.js`、`assets/asset-map.js`、`serve.mjs`、`gen-playlist.mjs`、`tools/*.mjs` 逐个 `node --check` |
| (B) story.json | 可 `JSON.parse`；含 `meta.weatherGroups` 与 `weathers`；每种中文天气下每条变体线的每个事件都有 `name`/`prompt`/`options`（兼容归一化别名 `title`/`description`/`choices`），选项文案非空；收集所有事件名 |
| (C) asset-map | 用 `new Function` 取出 `ASSET_MAP`；`cnToSubs` 中文键集合与 `meta.weatherGroups` 完全一致；`eventImages` 与 `gf` 头像的**每个图片路径文件实际存在** |
| (D) playlist.json | 嵌套结构 `{artists:[{name,albums:[{name,cover,songs:[…]}]}]}`；提取所有 `.mp3` 路径，断言文件存在于 `video/` 下 |
| (E) 道具引用 | `reward`/`useItem`/`requireItem`/`photo` 引用的道具 id 均已登记 |
| (F) requireItem 门控 | `hasItem` 语义回归（对象 `{count:n}` / 数字 / null 等多种形态） |
| (G) 商店赠予连通性 | `shopGifts` 顶层可见；每件在售礼物都能在事件中注入赠予按钮（`injectItemChoices`） |

在项目根目录执行即可。**判断原则**：若失败是测试脚本自身问题则修脚本；若是真实资源缺失，
**不改游戏数据迁就**，而是作为"真实发现"列出。

---

## 2. `test-e2e.mjs` — Playwright 浏览器端 E2E（实跑通过）

`node tools/test-e2e.mjs`

用无头 Chromium 真实加载 `http://localhost:8088`，自动打通四种天气（晴天/多云/雨天/雪天）
的约会主流程直到结局屏，并对成就/恋爱手册/相册/商店/音乐馆做子系统冒烟，外加 12 项道具联动验证。
当前实测：天气失败 0 / 子系统失败 0 / 道具联动失败 0。

需先安装依赖（装在独立 workspace，保持游戏目录干净）：

```bat
cd C:\Users\Pengcheng_Li\.workbuddy\binaries\node\workspace
npm.cmd install playwright
node node_modules\playwright\cli.js install chromium
```

脚本内部用 `createRequire` 从 managed workspace 定位 playwright，**不需要设 `NODE_PATH`**。
仍支持 `TEST_NODE=/path/to/node` 覆盖用于临时验证。

### 关键处理

- 用 `child_process.spawn` 起 `serve.mjs`（`PORT=8088`，cwd=项目根），轮询就绪后开始。
  启动前会探测端口，若被占用（残留服务）则 fail-fast，避免"测错对象"。
- 拦截 `cdnjs` 的 `Tone.js`（返回空）并 `addInitScript` 注入 `window.Tone` 桩，规避无头环境 CDN 被墙导致 `hoverBeep()` 抛 `ReferenceError`。
- 注入 `localStorage._visited=1` 跳过约 3s 加载屏。
- 每局独立 `context`（localStorage 隔离）。
- 确定性策略：每步读取当前事件的 choices，过滤被 `reqLike`/`requireItem` 隐藏项，按
  `score=(like||0)+(heart||0)*1.5 - Math.abs(money||0)*0.1` 选最高者，点击对应 `.choice-btn`（排除物品按钮）。
- 报错容忍：忽略 favicon 404 / Tone / BGM mp3 404（`SoundManager.playBgm` 内部已 `.catch`）；其余 `pageerror` / `console.error` 一律判 FAIL。

---

## 3. `audit-project.mjs` — 静态架构审计（按需）

`node tools/audit-project.mjs`

零依赖，输出五类报告，用于改造/重构前后自查：

| 项 | 内容 |
|----|------|
| (A) 加载顺序 | 顶层执行语句是否引用了"更晚才加载"的模块符号（排查 ReferenceError 崩溃风险） |
| (B) DOM id | JS 引用的 `getElementById` / `#id` 是否能在 HTML 或 JS 模板中找到 |
| (C) 全局定义 | 被调用但无定义的全局函数、跨文件的重复全局定义（后者覆盖前者） |
| (D) CSS 死代码 | 类选择器中在 HTML/JS 字符串里搜不到的（瘦身候选，动态拼接需人工确认） |
| (E) PWA/资源 | sw.js 缓存版本、PRECACHE 文件存在性、manifest icons、孤立 `data/*.json` |

---

## 4. 结论口径

- 静态测试 **必须**通过（数据/资源/语法层面齐备），建议作为 Git pre-commit 质量门。
- E2E 用于确认"真的能玩通"，较重，改动主流程后手动跑一次。
- 改了 `index.html` / `css` / `js` 资源后，**记得同步 bump 版本戳**（`index.html` 里 script 的 `?v=YYMMDD`）
  和 `sw.js` 的 `CACHE` 版本号，否则线上老用户会被 HTTP/PWA 缓存挡住看不到更新。
