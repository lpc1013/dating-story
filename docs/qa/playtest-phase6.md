# Phase 6 打磨阶段 · Playtest 与质量门报告

- **任务编号**：PH6-QA-01（P0）
- **执行人**：严守真（quality-lead）
- **评审强度**：solo（单人项目 — 质量门照跑，聚焦可落地清单）
- **测试日期**：2026-07-31
- **被测版本**：工作区当前状态（`index.html` 22:32 / `data/story.json` 21:43 / `js/result.js` 21:57 之后）
- **测试环境**：Node 22.22.2 + Playwright(Chromium headless) + 本地静态服 `http://localhost:8088`

---

## 一、质量门判定

> ### 🟡 CONCERNS（有条件放行）
>
> 主干功能全绿：**7/7 天气变体线全部可通关到结局，109 个事件块零未预期报错**，道具/商店/成就/相册/音乐馆五大子系统冒烟全通。
> 但存在 **1 个用户可见的资源缺失（3 张相册照片 404）**，以及若干数据一致性问题。
> **无 Blocker、无 Critical，不阻塞继续打磨；但发布签字前应先修 BUG-01。**

**阻塞项（发布前必须清零）**

| # | 阻塞项 | 严重度 | 现状 |
|---|--------|--------|------|
| 1 | BUG-01 三张相册照片文件缺失，玩家解锁后看到裂图 + 控制台 404 | Major | ❌ 未修复 |

> 说明：BUG-01 之外的条目均为 Minor/Trivial，可排入常规迭代，不构成放行阻塞。
> 质量门为**建议性门控**，最终放行由主理人/用户决定。

---

## 二、测试基线：静态冒烟（必跑项）

命令：`node tools/test-flow-static.mjs`

| 分块 | 校验内容 | 结果 |
|------|----------|------|
| A | 语法检查 `node --check`（41 个文件） | ✓ 41 / ✗ 0 |
| B | `data/story.json` 结构与事件完整性 | ✓ 10 / ✗ 0 |
| C | `assets/asset-map.js` 一致性 + 事件图/头像存在性 | ✓ 4 / ✗ 0 |
| D | `video/playlist.json` 结构 + mp3 存在性 | ✓ 4 / ✗ 0 |
| E | 道具 reward/useItem/requireItem/photo 引用一致性 | ✓ 51 / ✗ 0 |
| F | requireItem 门控行为回归（hasItem 语义） | ✓ 14 / ✗ 0 |
| G | 商店礼物 → 事件内赠予入口连通性（injectItemChoices） | ✓ 10 / ✗ 0 |

**汇总：通过 134 / 失败 0 —— 基线维持全绿 ✅**（任务书基线 134/0，本次复跑一致；测试前、测试后各跑一次均为 134/0）

> ⚠️ 注意：静态套件覆盖了事件图、女友头像、BGM mp3，但**未覆盖 `assets/photo/` 相册照片** —— BUG-01 正是从这个缺口漏出去的。修复建议见 BUG-07。

---

## 三、Playtest 计划

### 3.1 覆盖目标

| 维度 | 目标 | 实际达成 |
|------|------|----------|
| 天气变体线 | 7 条（sunny/sunny2/cloudy/cloudy2/rainy/rainy2/snowy） | **7/7 ✅** |
| 主题 | 4 套（parchment/cinnabar/rosegold/dusk） | **4/4 ✅** |
| 事件块 | 全量 | **109/109 ✅** |
| 结局类型 | 好结局 + 坏结局 | 好结局 ✅ / 坏结局 ✅ / 挑战失败结局 ⚠️未覆盖 |
| 子系统 | 道具、成就、相册、商店、音乐馆、背包 | **6/6 ✅** |

> 📌 关于「112 事件块」：任务书按 16×7=112 估算，**实际为 109**（`meta.counts.events` 亦为 109）。
> 各线事件数不均：cloudy 18、sunny/sunny2/rainy/snowy 各 16、cloudy2 14、rainy2 13。详见 BUG-05。

### 3.2 三轮测试设计

| 轮次 | 名称 | 方法 | 关注点 |
|------|------|------|--------|
| R1 | 全变体主线通关 | 自动化（真实浏览器，最优解策略） | 7 变体 × 4 主题跑到结局，主题生效，终局数值 |
| R2 | 子系统深检 | 自动化（真实浏览器，定向断言） | 商店买入→赠予注入→消耗、相册解锁与图片加载、音乐馆播放 |
| R3 | 逆向路径与数据闭环 | 自动化（最差解策略）+ 静态审计 | 坏结局可达性、道具经济闭环、门控死锁、资源/ID 一致性 |

### 3.3 关于 `tools/test-e2e.mjs`

Playwright 环境**可用**（`playwright` + `chromium-1234` 均已就位），但原 E2E 脚本在本次会话中**无法跑完**：
每次选择后 `feedbackDwell()` 会停留 1000–5000ms，四条天气线累计远超 2 分钟的执行预算，脚本稳定卡在「多云」（18 事件，最长线）后被中断。

**这不是产品缺陷** —— 已用等价方式验证并确认多云线可正常通关（18 步 → 好结局）。
为取得实证，另建轻量 harness（**放在游戏目录之外**，保持仓库干净）：

- `<workspace>/qa-phase6-variant.mjs` —— 单变体通关 + 主题 + 子系统取证
- `<workspace>/qa-phase6-deep.mjs` —— 商店注入 / 相册 / 坏结局深检
- `<workspace>/qa-audit-photos.mjs`、`qa-audit-photoids.mjs`、`qa-audit-ach-rules.mjs` —— 只读静态审计

harness 仅在**页面运行时**覆写 `window.feedbackDwell` 提速，**不改动任何游戏源码文件**。
原 E2E 脚本的提速建议见 BUG-06。

---

## 四、R1 · 全变体主线通关（7 变体 × 4 主题）

**方法**：自动浏览器（Chromium headless）真实加载 `http://localhost:8088`，运行时覆写 `window.feedbackDwell = () => 40` 提速；每步用策略分 `score = like + heart*1.5 - |money|*0.1` 选最优选项，直到达成结局。每变体固定跑一种主题，7 次跑批覆盖全部 4 套主题（parchment×2、dusk×2、cinnabar×2、rosegold×1）。

| 变体 | 主题 | 步数 | 结局 | 解锁成就 | 主题生效 | 异常 |
|------|------|------|------|----------|----------|------|
| sunny | parchment | 16 | 好结局 | 13 | ✓ | 无 |
| sunny2 | dusk | 16 | 好结局 | 17 | ✓ | 无 |
| cloudy | cinnabar | 18 | 好结局 | 9 | ✓ | 无 |
| cloudy2 | rosegold | 14 | 好结局 | 12 | ✓ | 无 |
| rainy | dusk | 16 | 好结局 | 13 | ✓ | 无 |
| rainy2 | parchment | 13 | 好结局 | 10 | ✓ | 无 |
| snowy | cinnabar | 16 | 好结局 | 11 | ✓ | 无 |

**判定**：7/7 变体线全部可通关到好结局，零未预期 JS 报错；4/4 主题均被实际加载并验证生效 ✅。

**主题系统验证（点击 `.theme-dot` 真实用户路径，非调用不存在的 `window.applyTheme`）**

| 主题 | 取色结果 | 生效 |
|------|----------|------|
| parchment | 默认米黄底，注入后保持 | ✓ |
| cinnabar | 朱砂墨色切换：`--ink` 由 `#5c4a32` → `#5c2a1e`（实测） | ✓ |
| rosegold | 玫瑰金配色切换 | ✓ |
| dusk | 暮色配色切换 | ✓ |

> 注意：`applyTheme()` 是 `index.html` 内的 IIFE，未挂到 `window`；直接调用 `window.applyTheme` 会得到 `undefined`。正确路径是点击 `.theme-dot[data-set-theme=...]`，已验证四套主题均可切换且无报错。双 localStorage 键的潜在隐患见 BUG-04。

---

## 五、R2 · 子系统深检

自动化定向断言，覆盖「道具 / 商店 / 成就 / 相册 / 音乐馆」五大子系统：

| 子系统 | 取证动作 | 结果 |
|--------|----------|------|
| 商店注入 | 商店买入「奶茶」→ 进入含赠予事件 → `injectItemChoices` 生成 5 个赠予按钮 → 选赠予 | like 40→44；奶茶被消耗 ✓ |
| 道具经济闭环 | 统计 `reward` / `useItem` / `requireItem` 三类引用 | 26 = 26 = 26，闭环一致 ✓ |
| 成就 | 运行时合并 `achievementsList` + `StoryLoader.achievementRegistry` | 共 **108** 个成就（registry 探针实测 64 键）✓ |
| 相册 | 遍历 `albumPhotos`（25 条）并校验文件存在性 | 22/25 文件存在，**3 缺失 → BUG-01** ✗ |
| 音乐馆 | `audio.play()` 播放列表 219 首 BGM | 219 首均可触发播放，无报错 ✓ |

**判定**：商店→买入→赠予→消耗链路、道具经济闭环、成就解锁、音乐馆播放全部冒烟通过；相册因 3 张照片文件缺失而裂图（BUG-01）。

---

## 六、R3 · 逆向路径与边界

| 检查项 | 方法 | 结果 |
|--------|------|------|
| 坏结局可达 | 雪天线全程选减 `like`/`heart` 的最差选项 | like=0、heart=0 → 触发**坏结局** ✓ |
| 门控死锁 | 遍历所有 `requireItem` 门控，核对是否有对应 `reward` 产出 | 无死锁，门控均可被满足 ✓ |
| 成就/照片 ID 一致性 | 审计 `unlockPhoto('X')`、story 内 photo 引用、init 初值 vs 相册注册表 | 3 张照片指向缺失文件（BUG-01）；phantom id `park_date`(chat.js)、`first_meet`(game-init) 无害（BUG-02） |
| 资源文件审计 | 读 `albumPhotos` 25 条 + 磁盘文件比对 | 22 存在 / 3 缺失；另有 5 个有代码触发但未在 story 引用的照片（备注，非缺陷） |

**未覆盖项**：**挑战失败结局**（非好/坏结局的第三类结局）未在本轮实证 —— 该路径依赖特定数值阈值，本次最优/最差两条策略均未触发，留待后续补测（见 §八 已知限制）。

---

## 七、Bug 分级清单

> 严重度：Blocker > Critical > Major > Minor > Trivial。归属模块以 `js/*.js` / `index.html` / `css/style.css` / `data/*.json` / `tools/*.mjs` 标注。

### BUG-01 · 三张相册照片文件缺失（Major）⛔ 阻塞项
- **严重度**：Major
- **复现步骤**：游戏内解锁相册中 `雾中古建筑(foggy_ruin)` / `台风之眼(typhoon_eye)` / `雾中海滨(foggy_shore)` 任一张 → 相册页显示裂图，浏览器控制台报 404。
- **影响范围**：用户可见资源缺失；三位玩家解锁对应剧情后会看到裂图，破坏相册完整体验。三张均为 placeholder 前缀 `jimeng-2026-07-28-0000-*.png`，磁盘实际只有 22 张带真实 4 位编码的照片。
- **建议修复方**：补 `assets/photo/jimeng-2026-07-28-0000-雾中古建筑.png`、`...台风之眼.png`、`...雾中海滨.png` 三张图；或把 `js/album.js` 第 24–26 行 `url` 改指向已存在的照片。
- **归属模块**：`js/album.js`（第 24–26 行 `albumPhotos` 定义）/ `assets/photo/`（资源缺失）

### BUG-02 · 相册 phantom 照片 ID（Minor）
- **严重度**：Minor
- **复现步骤**：静态审计 `unlockPhoto('X')` 与 init 初值，发现 `park_date`（来源 `js/chat.js`）、`first_meet`（来源 `js/game-init` init）两 id 未在任何相册注册表中定义。
- **影响范围**：无害 —— 不会崩溃，仅属死引用/误引用，长期拖慢代码可读性。
- **建议修复方**：删除两处误引用，或将对应解锁逻辑正确接入相册注册表。
- **归属模块**：`js/chat.js`、`js/game-init.js`

### BUG-03 · 成就总数声明不符（Minor）
- **严重度**：Minor
- **复现步骤**：`data/story.json` 中 `meta.counts.achievements = 73`，但运行时合并 `achievementsList` + `StoryLoader.achievementRegistry` 实测为 **108**。
- **影响范围**：成就统计面板/进度条可能显示错误的总数（73 vs 108），造成玩家认知偏差。
- **建议修复方**：统一计数来源 —— 改为加载时由注册表动态计算总数，或同步更新 `meta.counts.achievements`。
- **归属模块**：`data/story.json`（`meta.counts.achievements`）/ 成就加载逻辑（`js/achievement*.js`）

### BUG-04 · 主题 localStorage 双键 + 死代码（Minor / 潜在）
- **严重度**：Minor（潜在）
- **复现步骤**：`index.html` 内 `applyTheme()` IIFE 使用 `localStorage['dating-theme']`；而 `setThemeDirect()` / `loadSavedTheme()` 使用 `localStorage['theme']`（死代码，无调用方）。
- **影响范围**：两套键并存，主题恢复逻辑混乱，未来若误用死代码会导致主题不生效。
- **建议修复方**：统一为单一键（建议 `dating-theme`），删除 `setThemeDirect` / `loadSavedTheme` 死代码。
- **归属模块**：`index.html`（`applyTheme` IIFE）/ `js/theme*.js`（如存在）

### BUG-05 · 事件块数量声明不符（Trivial）
- **严重度**：Trivial
- **复现步骤**：任务书按 16×7 = **112** 估算事件块；实测 `meta.counts.events = 109`，各线不均（cloudy 18、sunny/sunny2/rainy/snowy 各 16、cloudy2 14、rainy2 13）。
- **影响范围**：仅文档/规格不符，无运行时影响。
- **建议修复方**：更新任务书或 `meta` 注释为 109。
- **归属模块**：`data/story.json`（`meta.counts.events`）/ 任务文档

### BUG-06 · 原 E2E 脚本超时（Minor）
- **严重度**：Minor
- **复现步骤**：`tools/test-e2e.mjs`（Playwright）每步后 `feedbackDwell()` 停留 1000–5000ms，四条天气线累计远超 ~2 分钟执行预算，稳定卡在「多云」（18 事件，最长线）后被中断。
- **影响范围**：CI 自动化 E2E 无法跑完，存在自动化覆盖缺口。
- **建议修复方**：测试环境覆写 `window.feedbackDwell`（如加 `--fast` 开关或读 `process.env.QA_FAST`），将停留压到 ≤50ms；本次已用等价轻量 harness 在运行时覆写 `feedbackDwell` 取得实证，未改动任何源码。
- **归属模块**：`tools/test-e2e.mjs`

### BUG-07 · 静态测试未覆盖相册照片（Minor）
- **严重度**：Minor
- **复现步骤**：`tools/test-flow-static.mjs` 的 E 块校验了事件图/女友头像/BGM mp3，但**未校验 `assets/photo/` 相册照片** —— BUG-01 正是从这个缺口漏出。
- **影响范围**：质量门基线无法拦截相册资源缺失，降低静态门有效性。
- **建议修复方**：扩展 E 块，遍历 `albumPhotos` 的 `url`，断言对应文件在磁盘存在。
- **归属模块**：`tools/test-flow-static.mjs`

---

## 八、测试结论与质量门判定

### 8.1 最终判定

> ### 🟡 CONCERNS（有条件放行）
>
> 主干全绿：7/7 天气变体线通关到好结局、109 事件块零未预期报错、五大子系统冒烟通过、坏结局路径可达、道具经济闭环一致、静态基线 134/0 全绿。
> **唯一阻塞项 = BUG-01（3 张相册照片 404）**，属用户可见资源缺失，发布签字前必须清零。
> 无 Blocker、无 Critical，不阻塞继续打磨。

### 8.2 发布签字前必须清零的阻塞项

| # | 阻塞项 | 严重度 | 状态 |
|---|--------|--------|------|
| 1 | BUG-01 三张相册照片文件缺失（foggy_ruin / typhoon_eye / foggy_shore） | Major | ❌ 未修复 |

> 质量门为**建议性门控**，最终放行由主理人/用户决定。BUG-02 ~ BUG-07 均为 Minor/Trivial，可排入常规迭代，不构成放行阻塞。

### 8.3 测试结论与已知限制

1. **112 vs 109 事件块差异**：任务书按 16×7=112 估算，实测 109（`meta.counts.events=109`）。不影响功能，仅规格口径差异，见 BUG-05。
2. **挑战失败结局未覆盖**：本轮仅实证「好结局」与「坏结局」两类；第三类「挑战失败结局」依赖特定数值阈值，最优/最差策略均未触发，建议后续补一条定向用例。
3. **原 E2E 超时原因与提速建议**：瓶颈为 `feedbackDwell()`（1000–5000ms/步）。已用等价轻量 harness 在运行时覆写 `feedbackDwell` 取得全量实证，且**未改动任何游戏源码**；长期修复见 BUG-06（给 E2E 加 `--fast` 开关）。
4. **主题覆盖口径**：7 次变体跑批覆盖全部 4 套主题（每主题至少 1 次），属冒烟级覆盖，非 28 种组合穷举。
5. **静态基线缺口**：静态套件未覆盖 `assets/photo/`，导致 BUG-01 漏出；修复见 BUG-07。
6. **本次未改动任何游戏代码、未执行 git commit**，所有测试 harness 置于游戏目录之外（仓库保持干净）。

### 8.4 建议优先修复顺序

1. **BUG-01**（Major，阻塞发布）— 补三张相册照片或改指向。
2. **BUG-03**（Minor）— 统一成就总数声明，避免玩家看到错误进度。
3. **BUG-07**（Minor）— 扩展静态测试覆盖相册照片，防止同类资源缺失再次漏出。

---

*报告完。质量门判定以本节 8.1 / 8.2 为准。*
