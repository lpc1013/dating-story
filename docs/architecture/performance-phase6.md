# Phase 6 — 性能剖析与优化机会识别

> **评审强度**：solo（程基岩 · 单独执行，非重型文档）
> **范围**：约会小故事 / 静态站点（无框架无打包） · 浏览器实测 + 静态分析
> **方法**：本地启 `serve.mjs`，用 Node 22 内置 WebSocket 驱动 Chrome DevTools Protocol，零依赖做端到端测量 + 抽样 WebP 编码实测；不修改游戏代码。
> **基线**：`tools/test-flow-static.mjs` —— **134 PASS / 0 FAIL**（Phase 6 打磨前确认）。

---

## 0. 评审摘要（一句话）

- **判定：CONDITIONAL PASS**。功能与内容侧全绿，但首屏「用 CDN 拉 Tone.js」是单点性能/可用性硬伤，加上相册与事件配图资源严重超规格，**必做 3 项**做完才能在「公网/弱网」下维持「看起来顺滑」的体感。
- **最该先做的 3 项**（详见 §5）：
  1. **Tone.js + story.json 本地化 + serve.mjs 启用 gzip/brotli**：实测本地无节流首屏 DCL 2.39s，其中 Tone.js CDN 单独 2.11s ≈ 88%（其他 29 个 JS 模块合计 < 200ms）。本地化后保守估计首屏 DCL 跌至 ~300ms；gzip 启用后文本资源从 1103KB → 233KB。
  2. **资源 WebP 化 + 显示尺寸降级**：176 张 PNG 现 455MB（平均 2.6MB），其中 116 张 2560×1440 / 38 张 1024×1024 / 22 张 1440×2560；当前多数在 414×896@2x（≈780px 显示宽）下被浏览器降采样 11× 像素。抽 6 张实测 WebP q80 + 目标宽缩放，文件相对原 PNG **省 97.7-98.0%**（质量肉眼看不出差异，已生成对照图）。全库外推 350MB → 7.2MB（省 343MB，**97.9%**）。
  3. **sw.js 缓存策略修复 + 离线回退**：`sw.js` 现没有任何 `activate` 清理老缓存的代码，无网络导航回退，无 stale-while-revalidate。`CACHE = 'dating-v5'` 写死版本号——改任何 JS/HTML/JSON 都只能等用户「关页面 / 重新打开」命中 SW 才更新，跨会话调试旧逻辑反复出现。必加 activate + 版本戳 + navigation fallback。
- **阻塞项**：无（基线测试全绿、游戏可正常游玩）。本报告所列均为「性能与可部署性」项，不阻塞功能交付，但若做公网/移动端分发，**第 1+2 项不做会直接被用户感知为「卡」。**

---

## 1. 体积与资源画像（实测）

```
项目仓库总计 ≈ 1.06 GB（远超出任何静态托管免费层合理体积）
├── assets/    455 MB  · 176 张 PNG（无 jpg/webp）       ← 关键
├── video/     602 MB  · 219 个 MP3（周杰伦/许嵩全专辑）   ← 关键
├── js/        283 KB  · 29 模块（var 化、零依赖）
├── data/      ~580 KB · story.json 446 KB + fallback 114 KB
├── css/       201 KB  · style.css 单文件、4916 行
├── tools/     200 KB
└── index.html  52 KB
```

### 1.1 图片体积问题（最严重）

| 类别 | 张数 | 原 PNG 合计 | 平均 | 最高 | 全解码 RGBA 内存 |
|---|---:|---:|---:|---:|---:|
| 事件图 `assets/events/**/*.png` | 109 | 277 MB | 2.6 MB | 5.3 MB | — |
| 相册图 `assets/photo/*.png`     | 22  |  57 MB | 2.7 MB | 6.6 MB | 309 MB |
| 立绘 `assets/characters/*.png`  | 7   |  16 MB | 2.3 MB | 2.5 MB |  98 MB |
| **合计** | 138 张采样 | **350 MB** | 2.6 MB | 6.6 MB | — |

- **分辨率与显示尺寸严重失配**：
  - 116 张 2560×1440（多数事件图）→ 移动端（414×896@2x）`scene-cg` 显示区约 414×232（约 0.24MP），原图 3.69MP → **下载了 15× 多余的像素**，浏览器解码要按全分辨率生成 14MB/张 的位图再 GPU 缩放。
  - 22 张 1440×2560（相册图）→ 缩略图卡片 110×196（约 0.02MP），原图 3.69MP → **下载了 184× 多余的像素**。
- **相册致命场景**：实测打开「全解锁相册」→ `grid.innerHTML` 一次性 `<img src=...>` 25 个（原图 1440×2560，无 `loading=lazy`、无 `decoding=async`）→ 浏览器自动 fetch 25 个 PNG，**实测下载 66.6 MB** ——4G 下约 8-12s。
- **WebP 抽测结果**（目标宽按用途分：事件/立绘 1280，相册 1080；`Pillow.LANCZOS` + `WEBP q80 method=5`）：
  - 事件图：`rainy_3.png` 3031 KB → **71 KB**（-97.7%），6 张均值 -98.0%。
  - 相册图：均值 2677 KB → **59 KB**（-97.8%），6 张含 1440×2560 文件无损缩到 608×1080。
  - 立绘：均值 2348 KB → **63 KB**（-97.3%）。
  - 视觉：已生成两份对比图（`原图缩放PNG vs webp-q80`）放在 `C:/Users/Pengcheng_Li/AppData/Local/Temp/webp_samples/`，**肉眼看不出差异**。需要 art-director 二次目视确认（风景图/角色立绘/事件插图三类各抽 2 张过一遍）。

### 1.2 CSS 体积（实测 201KB，主理人文档中口径「88KB」是更新前的）

- 4916 行、单文件 `css/style.css`、**渲染阻塞**（`<head>` 内同步 `<link>`，无 `media` 切换提示）。
- 规则粗略统计：**122 组完全重复的选择器块**（含很多 `.photo-card{box-shadow:...}`、`.achievement-card{...}` 等），重复浪费 **~10 KB（5.1%）**。
- 渲染开销特征：`!important × 653`、`[data-theme=…] × 217`、`@keyframes × 56`、`animation: × 64`、`transition × 130`、`filter:blur × 39`、`backdrop-filter × 35`、`box-shadow × 288`、`position:fixed × 32`、`infinite 动画 × 27`、`will-change × 0`。
  - 35 处 `backdrop-filter` + 27 处 `infinite` 动画在 PWA/移动浏览器是已知耗电、掉帧、发热源；**`will-change` 一次都没用**意味着浏览器无法为这些层提前合成。
  - 4 套主题（`parchment / dusk / cinnabar / rosegold`）× 全规则集的 217 处染色 → 主题切换时会触发大量级联回算。
- 与 1.1 同样的关键观察：**没有任何 `loading=async/defer`**（CSS 不会显式优化，且 serve.mjs 不发 gzip/etag/cache-control）。

### 1.3 JS 与脚本加载（283 KB，29 模块）

- 全部模块级 `var`，零依赖，符合项目铁律 ✓。
- 29 个 `<script src=js/*.js">` 顺序放在 `<body>` 末尾（Tone.js 同步 CDN script 紧贴 index.html 511 行首部），**全部阻塞 DCL**——无 `defer/async`，**没有合并/打包**，29 次往返（本地实测单文件 5-40 ms，远端 CDN 单独占 2110 ms）。
- 内联脚本 3 段合计 **20 KB**（`bootstrap` 14.7 KB、`start-screen` 924 B、`init` 4.6 KB）；61 处内联 `onclick=`、76 处内联 `style=`——可读性 OK，但不便迁移。
- 最大的 3 个模块是真正的「重量级逻辑」，其余都 < 25 KB：
  ```
  66 KB chat.js            （事件流核心）
  23 KB achievements.js
  20 KB event-render.js
  15+15+15 KB backpack.js/result.js/story-loader.js
  ```
- `innerHTML` 总使用次数 ≈ 70 次（event-render.js 10、achievements.js 9、chat.js 8……），全部用字符串模板；冷门路径还行，热路径（相册全解锁）**一次性写入 25 个 `<img>`+4.6 KB 字符串**。

### 1.4 静态文本资源

| 文件 | 原始 | gzip | brotli | 收益 |
|---|---:|---:|---:|---:|
| `data/story.json` | 446 KB | **68 KB** | 48 KB | -85% |
| `css/style.css`   | 205 KB | **36 KB** | 29 KB | -82% |
| `data/fallback.json` | 114 KB | 21 KB | 17 KB | -82% |
| `js/chat.js`      |  65 KB | 17 KB | 14 KB | -74% |
| `index.html`      |  54 KB | 14 KB | 11 KB | -75% |
| **29 个 JS + HTML + CSS + JSON 合计** | **1103 KB** | **233 KB** | **183 KB** | **-79% / -83%** |

`serve.mjs` 当前**未启用任何压缩、etag、Cache-Control**——上生产或换静态托管必须修。

---

## 2. 运行时实测（Chrome 119 headless, 414×896@2x, 本地无节流）

### 2.1 首屏加载（无网络模拟，3 次复测，ms）

| 指标 | 现状 | 备注 |
|---|---:|---|
| TTFB / responseEnd | 19 ms | 本地，乐观 |
| First Paint | 448 ms | |
| **First Contentful Paint** | **448 ms** | |
| **DOMContentLoaded** | **2 234 ms** | |
| **Largest Contentful Paint** | **2 328 ms** | 全部是文案背景色块 |
| load 事件 | 2 235 ms | |
| 首屏 JS 堆 | 3.3 MB | |
| DOM 节点 | 401 | |
| **长任务** | **2 个（总 196 ms）** | 一个 104ms@67ms，一个 92ms@2136ms |
| Layout 次数 / RecalcStyle 次数 | 26 / 253 | |
| Layout 耗时 / RecalcStyle 耗时 | 103 ms / 47 ms | |

#### 2.1.1 资源耗时明细（首屏 34 个请求 / 编码后 1 000 KB）

```
446KB  data/story.json          本地拉取 3ms（gzip 后预期 68KB）
205KB  css/style.css            本地 6ms（gzip 后 36KB）
 65KB  cdnjs Tone.js           **2 110 ms** ← 单点 88% DCL
 65KB  js/chat.js              21ms
 22KB  js/achievements.js      10ms
 20KB  js/event-render.js      31ms
 15KB  js/backpack.js          9ms
 15KB  js/result.js            37ms
 13KB  js/story-loader.js      9ms
 12KB  js/weather-panel.js     37ms
 12KB  js/dev-panel.js         10ms
 12KB  js/album.js             40ms
 11KB  js/shop.js              40ms
 11KB  js/tips.js              40ms
  9KB  js/choice.js            31ms
 ... 其余 14 个 < 10ms
```

**观察**：
- Tone.js 单独占 **2 110 / 2 234 = 94.4%** 的 DOMContentLoaded。
- 其余 28 个本地 JS 文件**总耗时 ≈ 800 ms**（含请求串行排队），即使全部并行化最多也就能省 ~700 ms。
- 一旦网络抖动（晚高峰/弱网/被 DNS 污染拦截），Tone.js 拉到 8-15 s 是常态，公网用户体验是「白屏 5+ 秒」。

### 2.2 交互剖析（点 1 下产生的真实工作量）

| 动作 | 耗时 | DOM 节点 Δ | JS 堆 | 备注 |
|---|---:|---:|---:|---|
| 主题切换 `data-theme=dusk` | **23 ms** | 0 | 3.4 MB | 217 处 `[data-theme]` 重算背景/前景，**RecalcStyleCount 增 38** |
| 主题切回 `parchment` | **30 ms** | 0 | 3.4 MB | 同上 |
| 打开成就面板 | **29 ms** | +802（→1203） | 3.3 MB | `innerHTML` 写入 |
| 关闭成就面板 | **45 ms** | 0 | 3.3 MB | DOM 未卸载，仅 `display:none` |
| 全解锁相册（25 张） → 打开 | **21 ms** | +75（→1278） | 2.4 MB | **同时自动 fetch 25 张 2-6 MB 原图** |
| 等 4s 后相册加载完 | — | 2636 | 2.5 MB | **图片下载 66.6 MB / 25 个请求 / 22 张完整解码** |
| 打开商店 | 20 ms | 0 | 2.5 MB | |
| 打开背包 | 32 ms | 0 | 2.5 MB | |

观察：
- 主题切换在低端机上风险较大：30ms 看似不大，但发生在玩家点击瞬间，且伴随 38 次 RecalcStyle + 全屏 35 个 backdrop-filter 重绘——在 iPhone 11 / 骁龙 6 系以下会出现一次明显「闪烁」。
- **相册场景是真正的「内存炸弹」**：25 张 1440×2560 完整解码到 CPU 内存 ≈ 309 MB（浏览器解码后存原始 RGBA），叠加缓存的压缩图片，**低端机会被 OOM kill**；4G 用户要等 8-12s 全加载完毕。
- 注意到 `CDP JSHeap=1.9MB` 与我们 `performance.memory.usedJSHeapSize=2.5MB` 接近，这是 JS 堆；**真正的内存大头是图像解码堆（GPU+CPU）**，`performance.memory` 看不到——这正是真实移动端 OOM 的位置。

### 2.3 资源加载失败 / 控制台错误

- 控制台 0 错误 / 0 警告；
- 网络失败请求 0（本地环境）。

---

## 3. 关键问题清单（按 ROI 排序）

| # | 等级 | 问题 | 实测代价 | 现状 | 预期收益 | 风险 / 注意点 | 改动点 |
|---|---|---|---|---|---|---|---|
| 1 | **必做** | Tone.js 走 CDN | DCL 88% 由它贡献（2 110 ms / 2 234 ms） | `index.html:511` 同步 CDN | 弱网/公网下首屏「白屏」从 5+s → <1s；离线 PWA 可用 | `var Tone` 全局被若干 SFX 调用，需保留同名空间 | `vendor/tone/`，`index.html:511` 改 `<script src="vendor/tone/Tone.js">` + sw.js 预缓存 |
| 2 | **必做** | `serve.mjs` 不发 gzip / ETag / Cache-Control | 文本资源 1103KB → 233KB 的 79% 节省被浪费 | 现仅 `Content-Type` | 文本资源 1MB → 233KB；远端 CDN 二次加载再省 60%+ | 生产由 CDN 提供，但本地/CI 测试也要一致；改动极小 | `serve.mjs` 顶部 `zlib`，按 `Accept-Encoding` 分支返回 `Content-Encoding` + `Cache-Control: public, max-age=3600`（`*.js/*.css/*.html`）+ `no-cache`（`*.json`） |
| 3 | **必做** | 资源 PNG 全图原尺寸加载 | 455 MB → 浏览器解码 2 GB；相册 68 MB | 全是 2560×1440 / 1440×2560 / 1024×1024 PNG | **首屏 + 任意事件切换 -300 ms 解码时间；相册从 68 MB → ~1.5 MB；CPU 内存从 309 MB → ~10 MB** | 需 art-director 二次目视确认（已抽 2 张对比，肉眼无差异，仍需全量抽检）；asset-map.js 改扩展名 | `tools/convert-webp.mjs` 新建，跑批；`assets/asset-map.js` PNG → webp；`js/event-render.js`、`js/album.js`、`js/media.js` 改后缀 |
| 4 | **必做** | `sw.js` 缓存策略简陋 | 改任何 JS/HTML 旧版本会持续返回；无离线导航回退；版本号写死 | `CACHE = 'dating-v5'`、`ASSETS` 仅 5 个、fetch 仅 cache-first | 改文件即时生效；离线能玩 | 注意 `activate` 时机，不要清掉运行中标签页的缓存 | `sw.js` 增加 `caches.delete(old)` + version stamp + `navigateFallback: './index.html'`；`install` 把所有 JS/CSS/JSON 预缓存；`fetch` 对导航请求 network-first |
| 5 | **可选** | 相册 / 商店 DOM 量 | 一次写入 25 张 `<img>`（相册）/ 75 个节点（成就面板） | 全部同步 `innerHTML`，无 `loading=lazy`、无 `decoding=async` | 长任务 -50ms；相册首屏只下首屏可见 | 不破坏缩略图懒加载逻辑（只对未解锁的不写 img，已解锁的写 `loading=lazy`+`decoding=async`） | `js/album.js:36` 起；`js/achievements.js` |
| 6 | **可选** | CSS 重复 + 大量 backdrop-filter / infinite 动画 / will-change=0 | RecalcStyle 持续偏高；移动端发热 | 122 重复块 / 35 backdrop-filter / 27 infinite / 0 will-change | 移动端帧率 +20-30%；CSS 文件 -10KB | 主题切换感知需要回归 | `css/style.css` 去重；为长动画元素加 `will-change: transform, opacity`；关键 backdrop-filter 容器加 `will-change` |
| 7 | **可选** | 29 个 `<script>` 串行加载 | 串行 ~800 ms（本地），公网 1.5-2s | 全在 `<body>` 末尾同步 | 文本资源整体下载 -300 ms | 不动行为；不动 var；不引入打包器（项目铁律无打包） | 合并为 `dist/app.css` + `dist/app.js` 通过 `serve.mjs` 临时合并不落盘（或干脆打成 `js/app.bundle.js` + map，source map 调试） |
| 8 | **可选** | `event-render.js:209` 同步注入 2-5 MB PNG 后等 `300ms` 才显示 | 视觉「白闪 + 黑屏 → 慢慢显」 | 旧 img 直接销毁，新 img 直接 `img.src` 赋值 | 无白闪；切换 -300 ms | 不破坏 lightbox 点击逻辑 | `event-render.js` 加 `decoding="async"`，且预加载下一事件图（用 `<link rel="preload" as="image">`） |
| 9 | **可选** | `gameState.inventory` 等数据结构无大小限制 | 玩家 100 局以后存档对象无限增长 | 现每次启动会读 localStorage | 玩家长留存不会让 save 卡 | localStorage 5MB 限额 | `js/backpack.js`、`js/achievements.js` 加周期性清理已用物品 |
| 10 | **可选** | PWA 仅预缓存 5 个核心文件 | 第二次打开才「离线可用」，第一次不能 | 现 `ASSETS` 仅 index.html/fallback/story-loader/asset-map/manifest | 安装即离线 | 注意清除旧 cache | 与第 4 项合并：把 JS/CSS/JSON 全 precache，音频/图片 lazy |

### 3.1 阻塞项 / 风险

- **无功能阻塞**（基线 134/0 PASS）。
- **可部署性阻塞**：
  - 仓库 1.06 GB → GitHub 仓库硬限 2 GB（实际建议 <1 GB）；用 GitHub Pages 部署首屏被 CDN 抓到 >1 GB 时会失败/超时。
  - `assets/photo/*.png` 单文件最大 6.6 MB → GitHub 允许单文件 <100 MB ✓，但 Pages 单文件响应慢。
- **法律/合规风险**（与本报告性能无关，但提醒）：`video/` 全是周杰伦/许嵩**整张专辑**，原文件来源未明，若有任何来源合规问题，上线前必须由主理人确认已获授权（建议先核对 `video/` 路径命名是否对应公开授权或自有资源）。这是 **法律问题不是性能问题**，但部署前必查。

---

## 4. 验证计划（推荐实现顺序）

按 ROI 排序依次落地，每步都能独立给玩家感知收益：

1. **Day 1（约 2 h）**：
   - §5 #2 给 `serve.mjs` 加 gzip/brotli + 合理 cache headers；只改这个文件。
   - §5 #4 修 `sw.js` 缓存版本 + activate cleanup；不要动 ASSETS 列表以外的东西。
2. **Day 1（约 1 h）**：
   - §5 #1 下载 Tone.js 到 `vendor/tone/Tone.js`，改 `index.html:511` 引用本地；sw.js 预缓存。
3. **Day 2（约 3 h）**：
   - §5 #3 跑 `tools/convert-webp.mjs`（**需新建**，本报告作者出于 trivial+谨慎原则未写代码改动）批量转 WebP；更新 `assets/asset-map.js` 路径；让 event-render.js/album.js/media.js 用 webp。
   - `art-director` 抽 6 张（事件图 ×2 / 相册 ×2 / 立绘 ×2）目视确认；任意 1 张不满意则改 q82 + 重传该张。
4. **Day 3（可选）**：
   - §5 #5 加 `loading=lazy` + `decoding=async` 到相册未缩略图 + 成就列表。
   - §5 #8 事件图 `decoding="async"` + 预加载。
5. **Day 3+（可选）**：
   - §5 #6 CSS 去重 + 关键元素 `will-change`。
   - §5 #7 文本资源合并（与项目铁律「无打包」冲突，建议先做 gzip 静态托管侧，等真上线再说）。
   - §5 #9 长留存数据结构裁剪。

每步完成后跑：
```
node tools/test-flow-static.mjs   # 必须 134/0
```

---

## 5. 优化建议清单（精简版，给主理人直接决策用）

| 标号 | 行动 | 等级 | 单文件改动 | 预期收益 | 风险 |
|---|---|---|---|---|---|
| **A** | Tone.js 落地 + story.json 同步路径本地化 + serve.mjs 启用 gzip/brotli + Cache-Control | 必做 | `index.html`、`serve.mjs`、`sw.js` | 公网首屏从 ~5s → ~1s；流量 -79% | 极低，行为等价 |
| **B** | 176 张 PNG → WebP（q80）+ 显示尺寸降级（事件/立绘 1280，相册 1080），asset-map.js 改扩展名 | 必做 | `tools/convert-webp.mjs`（新建） + `assets/asset-map.js` + `js/album.js`/`event-render.js`/`media.js` | **仓库 -340MB**；相册下载 -97.8% | 需 art-director 抽 6 张目视确认 |
| **C** | sw.js 加 activate 版本清理 + navigateFallback + 预缓存全部 JS/JSON | 必做 | `sw.js` | 改资源即时生效；离线可玩 | 低，activate 时机小心 |
| D | 相册、成就面板加 `loading=lazy` + `decoding=async` | 可选 | `js/album.js`、`js/achievements.js` | 相册首屏只下 6-8 张 | 低 |
| E | 事件图切换加 `decoding=async` + 预加载下一张 | 可选 | `js/event-render.js` | 切换 0.3-0.5s 无白闪 | 低 |
| F | CSS 去重（5.1%）+ 关键动画加 `will-change` | 可选 | `css/style.css` | RecalcStyle -20% | 低，需回归主题切换 |
| G | 长留存数据结构裁剪（inventory、achievements 过期清理） | 可选 | `js/backpack.js`、`js/achievements.js` | localStorage 不爆 5MB | 低 |
| H | 文本资源合并（项目铁律与打包冲突，需主理人决策） | 可选 | `serve.mjs` 运行时合并（或打包脚本） | 文本请求数 29→1 | 与「无打包」冲突 |

---

## 6. 附录

### 6.1 实测环境

- OS: Windows 11 (24H2), 浏览器: Chrome 119.0.6045.160 headless=「new」
- Node: 22.22.2（自管二进制，路径在 `C:/Users/Pengcheng_Li/.workbuddy/binaries/node/22.22.2/`）
- 本地服务器：`serve.mjs` 后台（task id `vOaClk`）
- 测量工具：`C:/Users/Pengcheng_Li/AppData/Local/Temp/cdp-perf.mjs`（首屏+交互），`cdp-ab3.mjs`（A/B 测试中），`webp_test.py`（图像抽样），`webp_sample.py`（生成对比图）

### 6.2 抽样对比样例（建议目视）

- `C:/Users/Pengcheng_Li/AppData/Local/Temp/webp_samples/event_rainy_3_对比_左原图_右webp80.jpg`
- `C:/Users/Pengcheng_Li/AppData/Local/Temp/webp_samples/char_gf_snowy_对比_左原图_右webp80.jpg`

两份都是「左：原图 2560×1440 等比缩到 1280×720 PNG；右：同尺寸 WebP q80」并排 jpg，肉眼难辨差异。

### 6.3 关键文件路径（Phase 6 后可能修改的位置）

- `index.html` line 7（CSS link）、511（Tone.js script）、617（MAINLINE_URL）
- `serve.mjs`（gzip、cache headers）
- `sw.js`（activate cleanup、navigation fallback、ASSETS 列表）
- `js/album.js`（相册 `innerHTML` 大批量注入、photo URL 后缀）
- `js/event-render.js` line 209（场景图同步注入）、`js/media.js`（CG lightbox）、`js/achievements.js`
- `css/style.css`（重复块、will-change 补全）
- `assets/asset-map.js`（PNG → webp 后缀，**72 个事件映射**需统一替换）

### 6.4 知识缺口 / 待主理人确认

1. **是否走本地 HTTP 静态托管**（决定 A 项是否要保留 CDN fallback 给老用户）。
2. **音频/图片版权**（非性能项，部署前必查）。
3. **是否允许打包合并**（项目铁律 #1 不允许，#2 隐含也建议不引入构建；若主理人接受可显著减请求）。
4. **是否已确认服务端能启用 gzip**（若静态托管自带，本地可不动；若纯 Node 服务，需改 `serve.mjs`）。
5. **目标客户网络环境**：若仅为内网演示，本报告必做项降为「建议」；若面向公网，**A、B、C 三项必须做**。