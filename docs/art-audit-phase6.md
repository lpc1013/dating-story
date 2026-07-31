# Phase 6 · 美术资产审计与可访问性复核

> 任务 ID：PH6-ART-01（P1）· 评审强度 solo
> 审计人：林绘澄（art-director）
> 项目：约会小故事（纯静态 HTML/CSS/JS）
> 范围：资产覆盖度 / 配图一致性 / 四主题可访问性 / 移动壳可读性
> 约束：本轮**只审计、只出规格与缺口清单**，未改动任何代码与图片素材

---

## 0. 基线确认

```
tools/test-flow-static.mjs
汇总: 通过 134 项 / 失败 0 项
结论: PASS — 静态基础齐备，全流程数据/资源/语法层面可跑通
```

基线全绿，本审计在此基线上进行。**本轮未产生任何代码改动，测试状态保持 134/0。**

---

## 1. 总判定

### **CONCERNS**

| 维度 | 判定 | 说明 |
|---|---|---|
| 事件场景图覆盖度 | **PASS** | 109/109 全覆盖，0 缺失、0 孤立、0 尺寸异类 |
| 女友头像覆盖度 | **PASS** | 7/7 全覆盖（含三条 `*_2` 变体线） |
| 音乐封面覆盖度 | **CONCERNS** | 29/33 专辑有封面，4 张缺 `cover` 字段 |
| 相册照片覆盖度 | **FAIL** | 25 条目中 **3 张照片文件不存在**（`0000` 占位文件名） |
| 配图一致性（兜底） | **CONCERNS** | 多云线 2 处重名，vk 失效时会取错图（非缺图） |
| 资产体积/性能预算 | **FAIL** | 图片总量 **454 MB**，事件图 2560×1440 显示在 384px 宽容器内 |
| 字号规范符合度 | **FAIL** | 规范要求的 `.event-description 18px` / `.event-title 22px/800` **规则完全未生效**（选择器与 DOM 不匹配） |
| 四主题对比度 | **CONCERNS** | rosegold 多项 FAIL；dusk 事件描述 2.88:1 FAIL |
| 可访问性分级 | **未达 Basic** | 全局 `outline:none` 无 focus 替代、0 处 aria/role、无 reduced-motion |

**一句话结论：接图逻辑与事件图/头像资产是干净的（这部分可以放心），但"规范写了却没生效的字号"、"相册 3 张缺图"、"454MB 图片体积"、"键盘焦点不可见"这四项在打磨阶段必须处理，其中只有相册 3 张需要用户补图，其余全部可工程修复。**

---

## 2. 资产审计清单

### 2.1 事件场景图 — PASS

三方交叉核对：`data/story.json` 事件名 × `assets/asset-map.js` 映射 × 磁盘文件。

| 天气子键 | story 事件数 | asset-map 条目 | 磁盘文件 | 缺失 | 孤立 |
|---|---|---|---|---|---|
| sunny | 16 | 16 | 16 | 0 | 0 |
| sunny2 | 16 | 16 | 16 | 0 | 0 |
| cloudy | 18 | 18 | 18 | 0 | 0 |
| cloudy2 | 14 | 14 | 14 | 0 | 0 |
| rainy | 16 | 16 | 16 | 0 | 0 |
| rainy2 | 13 | 13 | 13 | 0 | 0 |
| snowy | 16 | 16 | 16 | 0 | 0 |
| **合计** | **109** | **109** | **109** | **0** | **0** |

- story 事件未映射：**0**
- 映射了但磁盘无文件：**0**
- asset-map 有条目但 story 无事件（孤立映射）：**0**
- 磁盘有文件但 asset-map 未引用（孤立文件）：**0**

> ✅ 已知风险 `*_2 天气线事件图可能缺失` — **实测不成立**，sunny2 / cloudy2 / rainy2 三条线的图与映射全部齐备。
> ✅ 命名规范统一为 `<子键>_<序号>.png`，全部合规，无破例。

### 2.2 女友头像 — PASS

| 子键 | 映射 | 文件 |
|---|---|---|
| sunny / sunny2 / cloudy / cloudy2 / rainy / rainy2 / snowy | 7/7 ✓ | 7/7 ✓ |

孤立头像文件：0。三条 `*_2` 线头像均已就位。

### 2.3 道具图标 — 全部孤立（已知延后项，不计为缺陷）

`assets/objects/` 共 **38 个 PNG（1024×1024，合计 44.23 MB）**，全仓检索结果：

> **代码中零引用。** `js/` / `index.html` / `data/*.json` 均未出现 `assets/objects` 路径。

这与历史决策一致（记忆记载：*"暂不把 objects 接进相册"*）。因此判定为**已知延后项**而非缺陷，但需要主理人确认口径：

- 若确认继续延后 → 建议在 `docs/` 留一份"待接入资产台账"，避免后续误删；
- 若确认不再使用 → 44 MB 死重可直接移出仓库（**需用户拍板，我不擅自删图**）。

### 2.4 相册照片 — FAIL（3 张缺图）

`js/album.js` 共 25 条相册条目，磁盘 `assets/photo/` 仅 22 个文件。

**缺失 3 张（文件名带 `0000` 占位序号，说明当时未生成即先写了引用）：**

| # | id | 标题 | 引用路径 | 解锁条件 | 对应剧情线 |
|---|---|---|---|---|---|
| 1 | `foggy_ruin` | 雾中古建筑 | `assets/photo/jimeng-2026-07-28-0000-雾中古建筑，唯美氛围感画面，高级质感.png` | 在若隐若现的古建筑拍下雾中合影解锁 | cloudy2 |
| 2 | `typhoon_eye` | 台风之眼 | `assets/photo/jimeng-2026-07-28-0000-台风之眼，唯美氛围感画面，高级质感.png` | 在台风眼记录下罕见奇景解锁 | rainy2 |
| 3 | `foggy_shore` | 雾中海滨 | `assets/photo/jimeng-2026-07-28-0000-雾中海滨，唯美氛围感画面，高级质感.png` | 在雾中循水声走到海滨公园解锁 | cloudy2 |

**影响**：玩家在 cloudy2 / rainy2 线达成对应条件后，相册会出现 3 个破图（无 `onerror` 兜底，`js/album.js:41` 的 `<img>` 未设降级）。

> ⚠️ 这正是任务书提到的 `*_2 天气线` 风险的真实落点 —— 不在事件图，而在**相册照片**。

**这 3 张需要用户补图**，规格见 §5。
**另可工程修复**：给相册 `<img>` 加 `onerror` 占位降级，避免破图裂图标（与补图并行，互不冲突）。

孤立照片文件：0（22 张全部被引用）。

### 2.5 音乐封面 — CONCERNS（4 张缺封面字段）

`video/playlist.json`：7 位歌手 / 33 张专辑 / 219 首曲目。
`data/covers/`：29 个 `cover.jpg`（100×100 上下，4–8 KB，体积健康）。

- `cover` 字段指向的文件缺失：**0**（已有字段的全部有文件）
- 孤立封面（磁盘有、playlist 未引用）：**0**
- **无 `cover` 字段的专辑：4 个**

| 歌手 | 专辑 | 状态 |
|---|---|---|
| 纯音乐 | luokewangguo | 无 cover 字段 |
| 纯音乐 | moerzhuangyuan | 无 cover 字段 |
| 纯音乐 | qqchongwu | 无 cover 字段 |
| 许嵩 | 你若成风 | 无 cover 字段 |

`js/music-gallery.js:89` 写法是 `if (al.cover) h+='<img ...>'`，无封面时不渲染 `<img>`，**不会破图**，只是留白。属"视觉不完整"而非"报错"。

- 3 张纯音乐属自制/无版权封面 → 可用统一占位设计（工程可做，不必用户出图）
- 许嵩《你若成风》属正规专辑 → 与其余 29 张同源补齐即可（用户/脚本 `tools/fetch_covers.mjs` 均可）

### 2.6 尺寸 / 比例 / 体积一致性 — FAIL（体积严重超预算）

| 目录 | 数量 | 尺寸 | 比例 | 单张 KB（min/中/max） | 小计 |
|---|---|---|---|---|---|
| assets/events/sunny | 16 | 2560×1440 | 16:9 | 1516 / 2797 / 3715 | 43.19 MB |
| assets/events/sunny2 | 16 | 2560×1440 | 16:9 | 2525 / 3362 / 5203 | 52.89 MB |
| assets/events/cloudy | 18 | 2560×1440 | 16:9 | 2008 / 3260 / 3901 | 55.73 MB |
| assets/events/cloudy2 | 14 | 2560×1440 | 16:9 | 1720 / 2925 / 3627 | 37.66 MB |
| assets/events/rainy | 16 | 2560×1440 | 16:9 | 2581 / 3215 / 4354 | 50.80 MB |
| assets/events/rainy2 | 13 | 2560×1440 | 16:9 | 1941 / 2756 / 3825 | 35.90 MB |
| assets/events/snowy | 16 | 2560×1440 | 16:9 | 2522 / 3196 / 3846 | 50.97 MB |
| assets/characters | 7 | 2560×1440 | 16:9 | 2150 / 2319 / 2530 | 15.86 MB |
| assets/objects | 38 | 1024×1024 | 1:1 | 953 / 1205 / 1390 | 44.23 MB |
| assets/photo | 22 | 1440×2560 | 9:16 | 1446 / 3165 / 6487 | 66.61 MB |
| data/covers | 29 | ~100×100 | ≈1:1 | 4 / 6 / 8 | 0.17 MB |
| **总计** | **209** | — | — | — | **≈ 454 MB** |

**尺寸一致性本身很好**：每个目录内尺寸 100% 统一，"非主流尺寸异类" 检出 **0 项**，无比例混乱。问题**全部出在体积**：

**问题 A｜事件图过采样 ~11 倍**
- 显示容器：`.container max-width:420px`，`#game-content padding:16px 18px` → 图片实际渲染宽 **384 CSS px**
- `.scene-cg img { width:100%; height:auto; max-height:320px }` → 16:9 图渲染为 **384×216 CSS px**
- 2× DPR 下所需像素 = 768×432；实际提供 **2560×1440**
- 线性过采样 **3.33×**，像素量过采样 **11.1×**，每张 ~3 MB

**问题 B｜头像用 16:9 大图裁圆**
- `assets/characters/gf_*.png` 是 **2560×1440 的 16:9 横图**，但消费端是 `.her-avatar`（40–48 px 圆形头像）与聊天联系人头像（`border-radius:50%; object-fit:cover`）
- 用 2.3 MB / 2560×1440 横图去渲染 48px 圆形 → 过采样倍数以千计，且 16:9 横图裁 1:1 圆会**裁掉两侧构图**
- 这是**规格错配**（横构图 CG 被当竖/方构图头像用），不只是体积问题

**问题 C｜相册照片 9:16 竖图 66.61 MB**
- 单张最大 6487 KB（`晴日公园`）。相册是网格缩略图 + 点击看大图两级消费，却只有一份原图。

**问题 D｜首屏/切事件时的加载体感**
- 每次 `showEvent` 换一张 ~3 MB PNG，无 `loading="lazy"`、无预加载、无 `decoding="async"`
- `.scene-cg` 有骨架屏样式，但 **`.scene-cg.loaded` 类全仓从未被添加**（见 §4.4），骨架 shimmer 动画 `infinite` 永不停止

**预算建议（美术侧给出，实施属工程）**
| 类别 | 现状 | 建议目标 | 手段 |
|---|---|---|---|
| 事件图 | 2560×1440 PNG ~3 MB | 1280×720 WebP ≤ 220 KB | 转 WebP + 降采样，保留 PNG 原图于 `backup/` |
| 头像 | 2560×1440 PNG ~2.3 MB | 256×256 WebP ≤ 30 KB（1:1 重裁） | **需按面部重新构图裁切，建议用户确认裁切框** |
| 相册照 | 1440×2560 PNG ~3 MB | 缩略 480×854 ≤ 80 KB + 大图 1080×1920 WebP ≤ 400 KB | 双档 |
| 道具图 | 1024×1024 PNG ~1.2 MB | 256×256 WebP ≤ 40 KB（若接入） | 接入前统一处理 |
| **总量** | **454 MB** | **≤ 40 MB** | 约降 91% |

> 注：转码/降采样属"工程可修复"，但**是否接受画质取舍需要用户拍板**；头像重裁涉及构图，属"需用户确认"。我不擅自替换任何图片。

---

## 3. 配图一致性核查

### 3.1 weatherGroups ↔ cnToSubs 对齐 — PASS

`data/story.json · meta.weatherGroups`：

```json
{ "晴天": ["sunny","sunny2"], "多云": ["cloudy","cloudy2"],
  "雨天": ["rainy","rainy2"], "雪天": ["snowy"] }
```

`assets/asset-map.js · cnToSubs`：**逐键逐值完全一致**，无遗漏、无多余、顺序相同。
`meta.weatherOrder` 的 7 个子键与 `eventImages` 的 7 个子键集合亦一致。

> ✅ 任务书担心的"变体子键未并入中文键导致 `*_2` 线全部缺图"—— **未发生**，四组映射齐备。

### 3.2 接图链路复核 — 符合铁律③

`js/event-render.js:192-206` 的解析顺序：

1. **优先**：`ASSET_MAP.eventImages[variantKey][event.title]` —— 按（英文子键 + 事件名）精确匹配 ✓
2. **兜底**：`variantKey` 缺失时，遍历 `cnToSubs[中文天气]`，取**第一条命中**该事件名的子键

全链路**按事件名索引，未按编号索引**，符合项目铁律③。

### 3.3 兜底误配 — CONCERNS（多云 2 处）

`vk = null` 时逐线模拟命中结果：

| 中文天气 | 子键 | 事件数 | 正确 | **误配** | 无图 |
|---|---|---|---|---|---|
| 晴天 | sunny | 16 | 16 | 0 | 0 |
| 晴天 | sunny2 | 16 | 16 | 0 | 0 |
| 多云 | cloudy | 18 | 18 | 0 | 0 |
| **多云** | **cloudy2** | **14** | **12** | **2** | **0** |
| 雨天 | rainy | 16 | 16 | 0 | 0 |
| 雨天 | rainy2 | 13 | 13 | 0 | 0 |
| 雪天 | snowy | 16 | 16 | 0 | 0 |

**误配明细（任务书点名的"多云两条线重名"，已定位到具体 2 条）：**

| 事件名 | 应取（cloudy2 线） | 兜底实际取到 | 后果 |
|---|---|---|---|
| 接女友出行 | `assets/events/cloudy2/cloudy2_1.png` | `assets/events/cloudy/cloudy_1.png` | 雾天剧情配了普通多云图 |
| 奶茶店 | `assets/events/cloudy2/cloudy2_2.png` | `assets/events/cloudy/cloudy_2.png` | 同上 |

- 晴天线的 `奶茶店` 只存在于 sunny2、不存在于 sunny → 无冲突；雨天两线事件名完全不重叠 → 无冲突。**冲突仅此 2 处。**
- **注意**：这是**取错图**而非**缺图**，玩家不会看到破图，只会看到"氛围对不上"（雾景剧情配了普通阴天图）。严重度中。

**触发条件评估**：
- 正常 http 开局：`js/game-init.js:53` 会写入 `selectData.variantKey`，走精确匹配，**不触发**
- `js/chat.js:596` 切换天气时也会刷新 `variantKey`，**不触发**
- 仅当 `StoryLoader.getVariantKey()` 返回 null 时才走兜底

**关于 `file://` 兜底事件图的独立发现（超出美术范围，转交主理人）**

`index.html:524` 现为 `var gameData = {};`，`bootstrapStoryData()` 在 fetch 失败时 `fallback` 即这个空对象 → `file://` 下 `gameData` 恒为 `{}`，游戏取不到任何事件，**在进入配图逻辑之前就已经无法开局**。
因此"file:// 兜底事件图缺失"这个风险项，实测结论是：**该分支不可达（更上游就断了）**，不构成美术缺口。
另：`data/fallback.json`（含四天气 66 事件）**全仓零引用**，是一份孤立数据文件。
`index.html:635` 的 file:// 警告文案仍写"只显示内置 41 个成就"，与"内置数据已清空"的现状不符，属**文案过期**。

> 以上三点属数据/工程层，**建议主理人转交程基岩判断**，我不越界处理。

**修复建议（工程侧，二选一）**
- 方案 A（推荐，改动最小）：兜底遍历时**优先匹配 `selectData` 已知的子键**，或让 `cnToSubs["多云"]` 在兜底场景下按"事件总数最接近当前线"排序
- 方案 B（更稳）：给 story 事件加 `imageKey` 显式字段，彻底摆脱按名匹配的歧义（改动较大，Phase 6 不建议）
- 方案 C（零成本）：接受现状，仅在 `docs` 记录已知限制 —— 因为触发条件在正常流程下不可达

---

## 4. 可访问性复核

### 4.1 ⚠️ 关键前提：规范字号的选择器与真实 DOM 不匹配

任务书列出的字号规范（`.event-description 18px` / `.event-title 22px/800`）在 CSS 中确实存在，但**这两条规则的选择器在当前 DOM 里根本没有对应元素**：

`index.html:249-262` 实际结构：

```html
<div class="scene-cg"  id="scene-cg"></div>
<div class="event-meta">
    <span id="event-info">事件 1/16</span>
    <span class="meta-dot">·</span>
    <span id="event-title"></span>      <!-- 无 class="event-title" -->
</div>
<div class="her-row">
    <div class="her-avatar" id="her-avatar">👧</div>
    <div class="her-bub" id="event-description"></div>  <!-- class 是 her-bub -->
</div>
<div class="feedback" id="feedback"></div>
<div class="choices"  id="choices"></div>
```

| 规范条目 | 规范值 | CSS 规则位置 | 是否命中 DOM | **实际生效值** | 判定 |
|---|---|---|---|---|---|
| `.event-title` | 22px / 800 / 居中 / #ff6b6b | `style.css:359` | ❌ 无此 class | 继承 `.event-meta` → **13px / 400 / `var(--sub)`** | **FAIL** |
| `.event-description` | 18px | `style.css:369` | ❌ 无此 class | `.her-bub` → **15px !important** | **FAIL** |
| `.feedback` | 15px | `style.css:414` | ✅ 命中 | **15px** | **PASS** |
| `.choice-btn` | 15px | `style.css:388` | ✅ 命中，但被覆盖 | **14px**（`:1951` / `:4172` / `:4196`）；`<400px` 屏 **13px** | **FAIL** |
| 事件名行全局居中 | 居中 | `.event-meta{justify-content:center}` `:3206` | ✅ 命中 | **居中生效** | **PASS** |

**层叠链实测（按文件顺序 = 层叠顺序）：**

```
L1949  [GLOBAL] .event-description → 13.5px   ← 覆盖 L369 的 18px（但 DOM 无此 class，两者都不生效）
L1951  [GLOBAL] .choice-btn        → 14px     ← 覆盖 L388 的 15px
L3420  [GLOBAL] #event-description → 15px
L4170  [GLOBAL] .her-bub           → 15px !important   ← 事件描述最终值
L4172  [GLOBAL] .choice-btn        → 14px
L4194  [GLOBAL] .her-bub           → 15px !important   ← 与 L4170 重复
L4196  [GLOBAL] .choice-btn        → 14px               ← 与 L4172 重复
```

> 附带发现：`style.css:4166-4177` 与 `:4190-4200` 是**几乎逐行重复的"全局排版优化"块**（`html{font-size:16px}` / `.her-bub{...!important}` / `#event-description{line-height:1.7!important}` / `.choice-btn{...}` 等各写了两遍）。属可安全清理的重复代码。

**结论**：不是"字号设小了"，而是**规范定义的规则从未作用到元素上**。修复应改选择器（或给 DOM 补 class），而不是继续往上叠 `!important`。**属工程可修复，且只需改 `css/style.css`，符合铁律①。**

### 4.2 四主题对比度实测（WCAG 2.1）

阈值：正文 AA ≥ 4.5 / AAA ≥ 7；大字（≥18.66px 粗体 或 ≥24px）AA ≥ 3 / AAA ≥ 4.5。
以下均按 §4.1 实测出的**真实生效样式**计算，非按规范值。

#### ① 事件名 `#event-title`（实际 13px / 常规字重 → 按正文阈值 4.5）

| 主题 | 前景 / 背景 | 对比度 | 判定 |
|---|---|---|---|
| parchment | `#6e5a38` / `#faf3e0` | 5.96:1 | AA ✓ |
| cinnabar | `#7a4030` / `#fff5ee` | 7.51:1 | AAA ✓ |
| **rosegold** | `#a98a8a` / `#fff9fb` | **3.02:1** | **FAIL** |
| dusk | `#c9c0e8` / `#2f2848` | 8.03:1 | AAA ✓ |

#### ② 事件描述 `#event-description`（实际 15px；底色 `var(--bg-chip)` **未定义** → 恒为 `#fff`）

| 主题 | 前景 / 背景 | 对比度 | 判定 |
|---|---|---|---|
| parchment | `#6e5a38` / `#ffffff` | 6.60:1 | AA ✓ |
| cinnabar | `#7a4030` / `#ffffff` | 8.07:1 | AAA ✓ |
| **rosegold** | `#a98a8a` / `#ffffff` | **3.14:1** | **FAIL** |
| **dusk** | `#9b93bd` / `#ffffff` | **2.88:1** | **FAIL（最差项）** |

> **dusk 是暗色主题，却让浅紫灰文字落在恒定白底气泡上** —— 既割裂视觉（暗色壳里一块刺眼白），又是全表最低对比度。根因见 §4.3。

#### ③ 选项按钮 `.choice-btn`（实际 14px，小屏 13px；渐变底取最差端）

| 主题 | 文字 | 渐变起 | 渐变止 | **最差** | 判定 |
|---|---|---|---|---|---|
| **parchment** | `#faf3e0` | `#c9a86a` = 2.04:1 | `#a8442a` = 5.38:1 | **2.04:1** | **FAIL** |
| cinnabar | `#fff5ee` | `#e74c3c` = 3.56:1 | `#c0392b` = 5.06:1 | 3.56:1 | 仅大字 AA |
| **rosegold** | `#ffffff` | `#e8b4a0` = 1.83:1 | `#d98a9a` = 2.61:1 | **1.83:1** | **FAIL（全表最差）** |
| **dusk** | `#ece8ff` | `#6b5b95` = 4.94:1 | `#9b7fd4` = 2.75:1 | **2.75:1** | **FAIL** |

> 选项按钮是**核心交互控件**，四主题中三个在渐变的一端跌破 3:1。这是本次对比度审计最需要处理的一项。

#### ④ 反馈 `.feedback`（15px，情绪底色）— PASS

| 组合 | 对比度 | 判定 |
|---|---|---|
| parchment / happy `#5c4a32`·`#f0e2bd` | 6.58:1 | AA ✓ |
| parchment / normal `#5c4a32`·`#e8dcc0` | 6.22:1 | AA ✓ |
| parchment / angry `#6e2a1c`·`#f3d6cf` | 7.62:1 | AAA ✓ |
| cinnabar / happy·normal·angry | 9.84 / 9.92 / 7.79 | AAA ✓ |

反馈区是四类文本里唯一全面达标的。

#### ⑤ 选项内联提示（`js/event-render.js:288-291`，**11px**）— FAIL

| 提示色 | parchment 起 | parchment 止 | cinnabar 起 | rosegold 起 | dusk 起 |
|---|---|---|---|---|---|
| happy `#00ff88` | 1.69 | 4.44 | 2.85 | 1.37 | 4.40 |
| **angry `#ff1744`** | **1.70** | **1.55** | **1.01** | **2.10** | **1.54** |
| normal `#fff` | 2.26 | 5.96 | 3.82 | 1.83 | 5.91 |

- `angry` 红提示在 cinnabar 主题上 **1.01:1 —— 几乎完全不可读**（红字打在红按钮上）
- 11px 已低于移动端可读下限，叠加低对比后不可用
- 这些颜色**硬编码在 JS 内联 style 中**，不随主题变化，也绕过了「CSS 只改 style.css」的治理边界

#### ⑥ 元信息分隔点 `.meta-dot #999`

| 主题 | 对比度 | 判定 |
|---|---|---|
| parchment / cinnabar / rosegold | 2.57 / 2.65 / 2.74 | FAIL（装饰性，影响低） |
| dusk | 4.86 | AA ✓ |

### 4.3 主题变量层断裂（对比度问题的共同根因）

| 变量 | 定义处 | 使用处 | 状态 |
|---|---|---|---|
| `--bg-chip` | **0** | **12** | ❌ 恒走 fallback |
| `--text-muted` | **0** | **8** | ❌ 恒走 fallback |
| `--text-primary` | **0** | **6** | ❌ 恒走 fallback |
| `--chip` | 4（四主题各一） | **0** | ⚠️ 定义了没人用 |
| `--muted` | 4 | **0** | ⚠️ 定义了没人用 |
| `--ink` | 4 | 1 | ⚠️ 基本未消费 |
| `--paper` | 4 | 1 | ⚠️ 基本未消费 |
| `--gold` | 4 | 1 | ⚠️ 基本未消费 |
| `--accent` | 4 | 2 | ⚠️ 基本未消费 |

**四主题定义的是 `--chip / --ink / --muted`，而组件消费的是 `--bg-chip / --text-primary / --text-muted` —— 两套名字对不上，26 处规则永远拿不到主题值。**

这直接解释了 §4.2② 的 dusk 白底气泡：`.her-bub{background:var(--bg-chip,#fff)}` 拿不到 `--chip:#38304f`，于是恒定 `#fff`；而 `[data-theme="dusk"] #event-description{color:#9b93bd}` 又按"深色底"来配色 → 浅字落白底，2.88:1。

**修复成本极低**：在四个主题块各加一行别名映射即可（纯 `css/style.css` 改动，符合铁律①）：

```css
[data-theme="dusk"] {
  --bg-chip: var(--chip);
  --text-primary: var(--ink);
  --text-muted: var(--muted);
}
```

一次性修好 26 处规则的主题跟随，并同时消解 dusk 的最差对比度项。

### 4.4 可访问性基础设施 — 未达 Basic

| 检查项 | 结果 | WCAG | 严重度 |
|---|---|---|---|
| **键盘焦点可见** | `button{outline:none}`（`:3990` 与 `:4046` 各一次）+ `:4692` `outline:none!important`，**全仓 0 处 `:focus-visible`** | 2.4.7 (AA) | **阻断级** |
| **aria 属性** | `index.html` 0 处、`js/` 0 处 | 4.1.2 (A) | 高 |
| **role 属性** | 0 处 | 1.3.1 (A) | 高 |
| **tabindex** | 0 处 | 2.4.3 (A) | 中 |
| **图片 alt** | JS 生成 9 个 `<img>`，仅 4 个带 alt → **5 个缺失** | 1.1.1 (A) | 中 |
| **prefers-reduced-motion** | **0 处** | 2.3.3 (AAA) / 前庭安全 | 高 |
| **prefers-contrast** | 0 处 | 增强项 | 低 |
| `<html lang>` | `lang="zh-CN"` ✓ | 3.1.1 (A) | — |
| **文本缩放选项** | 设置面板仅"语音播报 / 背景音乐 / 音效"三项，**无字号调节** | 1.4.4 (AA) | 中 |
| `-webkit-text-size-adjust` | `100%`（`:4168`）—— 阻止 iOS 自动放大 | 1.4.4 参考 | 低 |
| **色盲冗余** | 反馈区有 emoji 冗余（`js/choice.js:175` `happy:😊 / normal:😐 / angry:💢`）✓；但选项内联提示**仅靠绿/红区分**，无形状/文字冗余 | 1.4.1 (A) | 中 |
| **触控目标** | `≤768px` `min-height:48px`✓；`<400px` `min-height:44px`✓；桌面态无显式高度但实测 ≈48px ✓ | 2.5.5 | PASS |

**缺 alt 的 5 处 `<img>`：**

| 文件:行 | 内容 |
|---|---|
| `js/chat.js:932` | 联系人列表头像 |
| `js/chat.js:953` | 聊天页头像 |
| `js/chat.js:1122` | 头像刷新 |
| `js/music-gallery.js:89` | 专辑封面 |
| `js/music-gallery.js:130` | 播放器封面 |

**另发现 2 个与配图相关的具体缺陷：**

**缺陷 ①｜事件名含半角双引号导致 alt 属性破坏**

`data/story.json` 中 rainy2 有事件名 `邻居的"米"字`（含半角 `"`）。
`js/event-render.js:209`：

```js
sceneCg.innerHTML = '<img src="' + imgPath + '" alt="' + (event.title||'') + '" class="cg-enter">';
```

拼接结果 → `alt="邻居的"米"字"` → HTML 属性提前闭合，alt 实际只剩 `邻居的`，`米` 被解析为伪属性。
- 影响：屏幕阅读器读到错误替代文本；该事件是全 109 个事件中**唯一**含引号的。
- 修复：改 `setAttribute` 或做 HTML 转义（工程可修复）。同时建议在美术/文案命名规范中**禁止半角引号**。

**缺陷 ②｜骨架屏动画永不停止**

`style.css` 定义 `.scene-cg{animation:cgSkeleton 1.5s ease-in-out infinite}` 与 `.scene-cg.loaded{animation:none}`，但 **`loaded` 类全仓从未被添加**（`js/` 与 `index.html` 检索为 0）。
且 `js/event-render.js:217/226` 每次渲染都会重写 `sceneCg.className`，即便将来加了也会被冲掉。
- 影响：图片加载完成后 shimmer 仍在无限循环 → 持续重绘、耗电；对前庭敏感用户不友好；在无 `prefers-reduced-motion` 兜底的情况下无法关闭。

### 4.5 移动壳（`.container` 420px）可读性

| 项 | 实测 | 评价 |
|---|---|---|
| 壳宽 | `max-width:420px`，`height:852px`，`border:8px`（≤768px 时 6px） | iPhone 14 Pro 比例，合理 |
| 内容可用宽 | 420 − 8×2 − 18×2 = **384px** | — |
| 事件描述 | 15px / line-height 1.7 → 每行约 24 字 | 略小但可读；规范 18px 更佳 |
| 事件名 | **13px 常规字重** | ⚠️ 作为标题层级过小，且与"22px/800"规范完全脱节 |
| 选项按钮 | 14px（`<400px` 降至 13px）；`min-height` 48/44px | 字号偏小，触控尺寸达标 |
| 选项内联提示 | **11px** | ❌ 低于移动端下限，叠加低对比后基本不可读 |
| `.choices` 底部安全区 | `padding-bottom:64px`，避让主题条与 AI 球 | ✓ 处理到位 |
| 事件描述滚动 | `#event-description{max-height:120px;overflow-y:auto}` + `.desc-expand-btn` 展开 | ✓ 有展开兜底 |
| 场景图 | 384×216 CSS px（16:9） | 比例正确；横屏 `max-height:160px` 有适配 ✓ |
| 横屏适配 | `@media (max-width:768px) and (orientation:landscape)` 已处理 | ✓ |

### 4.6 可访问性分级判定

| 分级 | 要求要点 | 当前 | 判定 |
|---|---|---|---|
| **Basic** | 焦点可见 / 图片 alt / lang / 触控 ≥44px / 基本文本对比 | 焦点❌、alt 部分❌、对比部分❌ | **未达标** |
| **Standard** | Basic + WCAG AA 对比 + 色彩非唯一信息载体 + 文本缩放 | — | 未达标 |
| **Comprehensive** | Standard + reduced-motion + 键盘全流程 + aria 语义 | — | 未达标 |
| **Exemplary** | Comprehensive + 屏幕阅读器实测 + 高对比模式 | — | 未达标 |

**当前定级：低于 Basic。**
**Phase 6 建议目标：Basic 达标 + Standard 的对比度部分。** 完整 Standard/Comprehensive 建议排入 Phase 7。

达到 **Basic** 的最小工作量（全部为 `css/style.css` + 少量 JS 属性补齐，无需用户出图）：
1. 恢复 `:focus-visible` 焦点环（约 6 行 CSS）
2. 补齐 5 处 `<img>` 的 alt + 修复 `邻居的"米"字` 的转义
3. 修复 §4.3 变量别名（4 行 CSS，顺带修好 dusk 最差对比度）
4. 提高 `.choice-btn` 渐变起始端明度，使四主题最差端 ≥ 4.5:1

---

## 5. 缺口清单（按优先级排序）

### 5.1 需用户补图 / 需用户拍板

| 优先级 | 编号 | 缺口 | 数量 | 说明 |
|---|---|---|---|---|
| **P0** | U-1 | **相册缺 3 张照片** | 3 | 见下方生成规格 |
| P1 | U-2 | 许嵩《你若成风》专辑封面 | 1 | 可用 `tools/fetch_covers.mjs` 同源补齐，或用户提供 |
| P2 | U-3 | 纯音乐 3 张专辑封面 | 3 | 无版权封面，建议统一占位设计（也可授权我出规格由工程生成纯色/渐变占位） |
| P2 | U-4 | **头像 1:1 重裁授权** | 7 | 现为 2560×1440 横图裁圆，会裁掉两侧构图；重裁需用户确认裁切框（或授权按人脸居中自动裁） |
| P2 | U-5 | **图片压缩画质取舍拍板** | 209 | 454 MB → 目标 ≤40 MB，需用户接受 WebP + 降采样 |
| P3 | U-6 | **`assets/objects/` 38 张去留** | 38 | 全仓零引用、占 44 MB。延后保留？接入？还是移出仓库？请用户定 |

#### U-1 生成规格（三张相册照片）

**统一规格**
- 尺寸：`1440×2560`（9:16 竖构图，与现有 22 张一致）
- 格式：PNG
- 命名：**必须与 `js/album.js` 的 `url` 字段完全一致**（含中文逗号，`0000` 位建议由用户改成实际 4 位序号，改名后需同步改 `js/album.js` —— 若不改名则直接沿用现有含 `0000` 的文件名，零改码）
- 风格锚点：对齐现有 22 张——唯美氛围感、高级质感、柔和光晕、浅景深、情绪化色调，人物不出正脸或仅背影/侧影
- 体积目标：≤ 400 KB（若沿用现有 PNG 流程则 ≤3 MB，后续统一压缩）

**逐张提示词**

| id | 标题 | 建议提示词 |
|---|---|---|
| `foggy_ruin` | 雾中古建筑 | 浓雾中若隐若现的中式古建筑飞檐与朱红廊柱，青灰石阶被水汽打湿，一对情侣的背影撑伞立于阶前，冷灰蓝主调点缀暖朱红，柔和逆光，浅景深，唯美氛围感画面，高级质感，竖构图 |
| `typhoon_eye` | 台风之眼 | 台风眼下罕见的澄澈天空，环形云墙包围中央的一片湛蓝，城市天际线被狂风洗过后异常清晰，地面积水倒映云隙光，青蓝与暖金对冲，戏剧性天光，唯美氛围感画面，高级质感，竖构图 |
| `foggy_shore` | 雾中海滨 | 晨雾弥漫的海滨公园，木栈道延伸入白雾，防波堤与远处灯塔仅剩剪影，海浪声般的柔和灰蓝渐层，一株被风吹斜的松树作前景，极简留白，唯美氛围感画面，高级质感，竖构图 |

> ⚠️ 按项目铁律⑦，**我不生成、不替换任何图片**。以上仅为规格与提示词，由用户产出后放入 `assets/photo/`。

### 5.2 可工程修复（不需要用户出图）

| 优先级 | 编号 | 问题 | 定位 | 修复要点 | 触碰文件 |
|---|---|---|---|---|---|
| **P0** | E-1 | **键盘焦点完全不可见** | `style.css:3990` `:4046` `:4692` | 保留 `outline:none` 的同时补 `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}` | `css/style.css` |
| **P0** | E-2 | **规范字号未生效**（事件名 13px 而非 22px/800；描述 15px 而非 18px） | `style.css:359` `:369` 选择器与 DOM 不匹配 | 把规则挂到 `#event-title` / `#event-description`（或给 DOM 补 class）；注意需盖过 `.her-bub` 的 `!important` | `css/style.css`（+ 可选 `index.html` 补 class） |
| **P0** | E-3 | **主题变量名断裂**：`--bg-chip/--text-primary/--text-muted` 定义 0 处、使用 26 处 | `style.css` 四主题块 | 四个主题块各加 3 行别名映射；顺带修好 dusk 事件描述 2.88:1 | `css/style.css` |
| **P1** | E-4 | **`.choice-btn` 对比度 FAIL**：rosegold 1.83、parchment 2.04、dusk 2.75 | `style.css:2419/2459/2499/2539` | 调暗渐变起始端，使最差端 ≥4.5:1；rosegold 建议文字改深色 | `css/style.css` |
| **P1** | E-5 | **相册 3 张破图无降级** | `js/album.js:41` | `<img onerror>` 加占位（与 U-1 补图并行，先止血） | `js/album.js` |
| **P1** | E-6 | **`邻居的"米"字` 破坏 alt 属性** | `js/event-render.js:209` | 改 `setAttribute('alt', title)` 或 HTML 转义 | `js/event-render.js` |
| **P1** | E-7 | **5 处 `<img>` 缺 alt** | `chat.js:932/953/1122`、`music-gallery.js:89/130` | 补 alt（头像→"女友头像"，封面→专辑名） | `js/chat.js` `js/music-gallery.js` |
| **P1** | E-8 | **选项内联提示 11px + 对比度最低 1.01:1** | `js/event-render.js:288-291` | 字号提至 ≥12px；颜色迁到 CSS 类（`.choice-hint-happy/normal/angry` 已存在且对比度达标 4.77–5.50:1，直接复用即可） | `js/event-render.js`（颜色移入既有 CSS 类） |
| **P1** | E-9 | **图片体积 454 MB** | 全部 `assets/` | WebP + 降采样，目标 ≤40 MB（**需 U-5 拍板后执行**） | 资产文件（用户授权后） |
| **P2** | E-10 | **骨架屏 `.scene-cg.loaded` 从未添加**，shimmer 无限循环 | `style.css` + `event-render.js:217/226` | `img.onload` 时加 `loaded`；注意别被 `className` 重写冲掉 | `js/event-render.js` |
| **P2** | E-11 | **无 `prefers-reduced-motion`** | 全局 | 加媒体查询关停粒子/涟漪/骨架/翻页/日落遮罩 | `css/style.css` |
| **P2** | E-12 | **CSS 尾部整块重复** | `style.css:4166-4177` vs `:4190-4200` | 删除其中一份 | `css/style.css` |
| **P2** | E-13 | **无字号调节** | 设置面板仅 3 项 | 加"字号 标准/大/特大"三档（改 `html{font-size}`） | `index.html` + `js/settings.js` + `css/style.css` |
| **P2** | E-14 | **0 处 aria/role** | 全局 | 模态加 `role="dialog"`、图标按钮加 `aria-label`、反馈区加 `aria-live="polite"` | `index.html` `js/*.js` |
| **P2** | E-15 | **`.meta-dot #999` 对比 2.57–2.74** | `style.css:3215` | 改用 `var(--muted)` | `css/style.css` |
| **P3** | E-16 | **多云兜底误配 2 处** | `event-render.js:198-206` | 见 §3.3 方案 A/C（正常流程不可达，可仅记录） | `js/event-render.js` |
| **P3** | E-17 | 音乐封面 4 张缺 `cover` 字段 | `video/playlist.json` | 补字段 + 占位图（依赖 U-2/U-3） | `video/playlist.json` |

### 5.3 转交主理人判断（超出美术范围）

| 编号 | 发现 | 建议去向 |
|---|---|---|
| X-1 | `index.html:524` `var gameData = {}`，`file://` 下 fallback 为空 → 无法开局 | 程基岩 |
| X-2 | `data/fallback.json`（四天气 66 事件）全仓零引用，孤立数据文件 | 程基岩 |
| X-3 | `index.html:635` file:// 警告文案"只显示内置 41 个成就"与现状不符 | 文策渊 / 程基岩 |

---

## 6. 建议执行顺序（Phase 6 打磨）

**第一批（P0，纯 CSS，风险最低，建议合并为一次改动）**
E-3 变量别名 → E-2 字号选择器 → E-1 焦点环 → E-4 按钮对比度
> 全部落在 `css/style.css`（E-2 可能需 `index.html` 补 class），符合铁律①。改完跑 `tools/test-flow-static.mjs` 须保持 134/0。

**第二批（P1，JS 属性补齐 + 止血）**
E-5 相册降级 → E-6 alt 转义 → E-7 补 alt → E-8 提示字号/配色

**第三批（等用户拍板）**
U-1 补 3 张相册图 → U-5 授权后执行 E-9 压缩 → U-4 头像重裁 → U-6 objects 去留

**第四批（P2/P3，可排 Phase 7）**
E-10 ~ E-17

---

## 7. 复核清单（改完自查）

- [ ] `tools/test-flow-static.mjs` 仍为 134 通过 / 0 失败
- [ ] CSS 改动只在 `css/style.css`
- [ ] 未新增 `!important` 层叠（E-2 若必须，需在注释说明原因）
- [ ] 四主题逐一目视：事件名 / 事件描述 / 选项按钮 / 反馈 四处文本
- [ ] 键盘 Tab 走一遍主流程，焦点环全程可见
- [ ] 420px 移动壳 + 横屏 + `<400px` 小屏三档回看
- [ ] 未替换、未删除任何图片素材
- [ ] 未执行 git commit

---

*审计完成 · 林绘澄 · 本轮零代码改动，测试基线保持 134/0*
