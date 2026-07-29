# 约会小故事 · 美术圣经 v2 与主界面视觉优化方案

> 作者：林绘澄（art-director / 游戏美术方向）
> 项目：约会小故事（纯静态 HTML/CSS/JS，无框架）
> 范围：主界面（header / 事件区 her-row+her-bub / 选项 choice-btn / 进度条 / 结果区）+ 常用模态框（成就 / 商店 / 相册 / 设置 / 贴士 / 兑换）
> 评审强度：lean（快速迭代，不卡重门）
> 状态：方案与实施规格文档（本轮**仅产出文档，不直接改动** `index.html` / `css/style.css`）

---

## 0. 关于本方案的事实基础（必读）

### 0.1 实测方法
本方案所有结论均来自对当前代码的 Read / Grep 实测，未采用"凭空假设"。已核对的文件与行号：
- `css/style.css`：`:root` 与基础样式（1–130 行）、主题系统（2357–2520 行）、night-mode（77–116 行）、token 使用（38–45、65、124、493、3836 行）
- `index.html`：主题切换 JS（768、799、852–880 行）、主界面 DOM（230–345 行）、模态框 DOM（348–466 行）、内联 style 与 emoji 清单（12、20–22、58、62、175、219、231–238、256、266–311、351、369–381、456–466 行等）

### 0.2 ⚠️ 与主理人诊断的重大出入（最关键发现）
主理人诊断称："cinnabar / rosegold / dusk **没有全局 `[data-theme]` 主题定义**，点击后绝大多数界面不会变化。"

**实测结论：该诊断与当前代码不符。** 当前 `css/style.css` 中：
- `[data-theme="cinnabar"]` 完整规则存在于 **2403–2440 行**
- `[data-theme="rosegold"]` 完整规则存在于 **2443–2480 行**
- `[data-theme="dusk"]` 完整规则存在于 **2483–2520 行**

三套主题均含"token 定义 + 逐组件规则（body / container / header / choice-btn / modal-content / event-card / 等）"，与 parchment（2363–2400 行）结构一致。**推测这些主题块是先前已补写的版本**，因此本审计以"代码实测"为准，并把重心转向真正存在的问题（见 §1.2 / §1.3）。

---

## 1. 视觉审计报告（Part A）

### 1.1 现状问题清单（六大类）

| 编号 | 问题 | 严重度 | 证据 |
|---|---|---|---|
| A1 | **主题系统根因 bug**：`data-theme` 写在 `<body>`，但主题对"页面级背景"的选择器写成 `[data-theme="X"] body {…}`（后代选择器），导致页面背景规则**永不命中**，切换主题时容器外的背景不变色 | 高 | `index.html:768/799/865` 写 body；`style.css:2404/2444/2484` 用 `[data-theme] body` |
| A2 | **night-mode 是孤立的 class 体系**：`.container.night-mode` / `.night-mode .header`（77–116 行）是独立暗色方案，但**全 index.html 无任何地方给它加 class**（死代码），且与 dusk 主题调色板冲突（两套暗色并存） | 高 | `index.html:0` 无 night-mode 引用；`style.css:77–116` |
| A3 | **无统一 token 体系**：`:root`（38–45 行）有一套粉色玻璃 token（`--primary-pink` 等），主题块（2363+）另写一套 `--ink/--paper/--accent` 等；且主题块内**逐组件用硬编码 hex 重复定义**，并未引用自身 token（token 定义后几乎未被消费） | 高 | `style.css:38–45、2363–2520`；token 使用仅 65/124/493/3836 |
| A4 | **模态框头部写法各异、无统一组件**：成就用 `.ach-panel-title`+图标 span；商店/相册用内联 `<h3 style="color:#ff6b6b">`；成就详情用 `.modal-title`；设置用 `.settings-title`；无共享 `.modal-header` 容器 | 中 | `index.html:351 / 369–372 / 381 / 466 / 55` |
| A5 | **图标全用 emoji**：💘🤖🌤️🎁💡⚙️📸🏆📱🔔❤️⭐🔍🔓🔒☀️ 等，跨平台渲染不一致、精致感天花板 | 中 | `index.html` 多处（12、17、20–22、28、58、62、116、175、201、219、226、231–238、287、351、369、381、405、413、415、466 等） |
| A6 | **index.html 内联 style 泛滥**：全文件 `style=` 出现 **75 处**，其中静态 HTML 内联（违规）集中在结果区与模态标题，如 12/219/277/279/293/302–305/318–333/343/381/456–458/464 等；其余为 JS 动态设置（属合理范畴） | 中 | `index.html` 75 处 `style=` |

### 1.2 主题缺口逐项验证（真实根因）

**验证假设**：若 cinnabar/rosegold/dusk 缺主题定义 → 点击后界面不变。
**实测结果**：三套主题定义**完整存在**，且 JS 确实会把 `data-theme` 写到 `<body>`（`index.html:865` `document.body.setAttribute('data-theme', t)`）。因此——

- 凡是**容器后代组件**（`.container` / `.header` / `.choice-btn` / `.modal-content` / `.event-card` / `.result-header` 等）都会**正确跟随主题变化**（它们是 body 的后代，`[data-theme="X"] .container` 命中）。
- **唯一不变化的是 `<body>` 自身的页面背景**：`[data-theme="X"] body { background:… }`（2404/2444/2484）是"后代选择器"，要求 body 是某带属性元素的后代；但属性就挂在 body 自己身上，body 不是自身的后代 → **规则永不命中**。基础 `body`（47–59 行）又故意不写背景（注释"背景由 [data-theme] 规则接管"），于是容器外区域始终为浏览器默认白底。

**结论**：诊断中的"绝大多数界面不变"不成立（实际是绝大多数**会**变）；真实 bug 是**页面级背景不跟随主题**（A1），根因为 `data-theme` 挂载元素与选择器形态不匹配（设计本意应是挂在 `<html>` 上）。

### 1.3 四主题"当前实际生效范围 vs 期望"对照表

| 主题 | 定义是否存在 | 容器/头部/选项/模态 | 页面背景(body) | 期望修正 |
|---|---|---|---|---|
| parchment 羊皮 | ✅ 2363–2400 | ✅ 正常 | ❌ 不跟随 | 修复 body 背景 |
| cinnabar 朱砂 | ✅ 2403–2440 | ✅ 正常 | ❌ 不跟随 | 修复 body 背景 |
| rosegold 柔粉暖金 | ✅ 2443–2480 | ✅ 正常 | ❌ 不跟随 | 修复 body 背景 |
| dusk 暮色 | ✅ 2483–2520 | ✅ 正常 | ❌ 不跟随 | 修复 body 背景（兼作统一暗色） |
| night-mode 暗色 | ⚠️ 仅 CSS(77–116) | ❌ 未接线 | ❌ 死代码 | 退役，并入 dusk（见 §3.3） |

---

## 2. 美术圣经 v2（Part B）

### 2.1 设计原则
1. **精致化双调性**：保留"古卷系（parchment/cinnabar）"与"粉玻系（rosegold）"两套审美语言，统一在同一套 token 之上；dusk 作为统一暗色，退役孤立的 night-mode。
2. **单一事实源（Single Source of Truth）**：所有颜色/间距/圆角/阴影/动效均来自 `:root` 语义 token；主题只"重映射"颜色类 token，组件只"消费"token，绝不写死的 hex。
3. **可访问性内建**：对比度、动效降级、焦点可见性写入基线（见 §2.7）。
4. **渐进式图标升级**：本轮保持 emoji 不强制替换，但建立 `.icon` 机制与 SVG 方向（见 §2.6），为后续替换铺路。

### 2.2 色板分层与 token 映射

**命名约定**：`--bg-*`(背景/表面) / `--text-*`(文字) / `--accent*`(品牌色) / `--mood-*`(反馈情绪) / `--ok|--warn|--danger`(语义) / `--border*`(描边)。

**A. 语义 token（定义于 `:root`，所有主题共用）**
```
--bg-page        /* 页面背景（body）          */
--surface-1      /* 主容器 .container         */
--surface-2      /* 抬升面板/模态/卡片         */
--surface-3      /* 内嵌块 event-card/rating-box */
--border         /* 常规描边 --line            */
--border-strong  /* 强调描边（current/highlight）*/
--text-1         /* 主文字 --ink              */
--text-2         /* 次文字 --sub              */
--text-3         /* 弱文字 --muted            */
--text-on-accent /* 强调底上的文字 --choice-text */
--accent         /* 主行动色 --accent          */
--accent-2       /* 暖金/次强调 --gold         */
--accent-grad    /* 头部渐变 --hdr-bg          */
--accent-choice  /* 选项渐变 --choice-bg       */
--mood-happy-bg / -border / -text
--mood-normal-bg / -border / -text
--mood-angry-bg  / -border / -text
--ok #2e9e5b  --warn #d99a1c  --danger #e04848   /* 语义色，跨主题稳定 */
```

**B. 两套调性 × 四主题的 token 映射表**（保留现有配色，仅重命名归一）

| 语义 token | parchment 羊皮(古卷) | cinnabar 朱砂(古卷) | rosegold 柔粉暖金(粉玻) | dusk 暮色(暗色) |
|---|---|---|---|---|
| `--bg-page` | `#e8dcc0→#f3e8cf` 渐变 | `#f3dcd0→#faeae0` | `#fdeef2→#fdf6ee` | `#2a2440→#3d3358` |
| `--surface-1` | `#faf3e0` | `#fff5ee` | `#fff9fb` | `#2f2848` |
| `--surface-2` | `#f3e8cf` | `#faeae0` | `#fdf2f5` | `#38304f` |
| `--surface-3` | `#f3e8cf` | `#faeae0` | `#fdf2f5` | `#38304f` |
| `--border` | `#e0cda0` | `#f0c8b8` | `#f6dbe2` | `#4a3f6b` |
| `--border-strong` | `#a8442a` | `#c0392b` | `#d98a9a` | `#9b7fd4` |
| `--text-1` | `#5c4a32` | `#5c2a1e` | `#6e4a4a` | `#ece8ff` |
| `--text-2` | `#6e5a38` | `#7a4030` | `#a98a8a` | `#c9c0e8` |
| `--text-3` | `#8a7654` | `#a07a6e` | `#c4a0a0` | `#9b93bd` |
| `--text-on-accent` | `#faf3e0` | `#fff5ee` | `#ffffff` | `#2a2440` |
| `--accent` | `#a8442a` | `#c0392b` | `#d98a9a` | `#9b7fd4` |
| `--accent-2` | `#c9a86a` | `#e8a87c` | `#c9a86a` | `#c9b8f0` |
| `--accent-grad` | `45deg,#b5895a,#8a6d48` | `45deg,#c0392b,#e74c3c` | `45deg,#e8a0a8,#d98a9a` | `45deg,#4a3f6b,#6b5b95` |
| `--accent-choice` | `135deg,#c9a86a,#a8442a` | `135deg,#e74c3c,#c0392b` | `135deg,#e8b4a0,#d98a9a` | `135deg,#6b5b95,#9b7fd4` |
| `--mood-happy-*` | 底 `#f0e2bd/#e6d29a` 边 `#c9a86a` 字 `#5c4a32` | 底 `#f7ecc9/#f0dd9a` 边 `#e8a87c` 字 `#5c4a32` | 底 `#fdf0d8/#f8e3bf` 边 `#c9a86a` 字 `#6e5a38` | 底 `#4a3f6b/#3d3358` 边 `#c9a86a` 字 `#f0e2bd` |
| `--mood-normal-*` | 底 `#e8dcc0/#d8c9a8` 边 `#9c8454` 字 `#5c4a32` | 底 `#f3dcd0/#e8c4b4` 边 `#c0392b` 字 `#5c2a1e` | 底 `#f3e3ef/#e8cfe0` 边 `#d98a9a` 字 `#6e4a4a` | 底 `#3d3358/#2f2848` 边 `#9b7fd4` 字 `#c9c0e8` |
| `--mood-angry-*` | 底 `#f3d6cf/#e8b8ad` 边 `#a8442a` 字 `#6e2a1c` | 底 `#f5b7ad/#ef8a7a` 边 `#c0392b` 字 `#6e1c12` | 底 `#fbe0e0/#f3c4c4` 边 `#e08a8a` 字 `#7a3a3a` | 底 `#5a2f44/#43243a` 边 `#e08a9a` 字 `#f0c4cf` |

### 2.3 字体层级（字号·字重·行高比例）
```
--font-sans: 'PingFang SC','Microsoft YaHei',-apple-system,BlinkMacSystemFont,sans-serif;
--fs-display: 24px  /* 开始页主标题 */      --fw-bold:700
--fs-title:    20px  /* 头部/模态标题 */     --fw-semibold:600
--fs-h2:       17px  /* 区块标题 */          --fw-medium:500
--fs-body:     15px  /* 正文/对话气泡 */      --fw-regular:400
--fs-sub:      13px  /* 辅助文字/标签 */
--fs-cap:      11px  /* 角标/元信息 */
--fs-num:      20px  /* 数值(资产/好感) tabular-nums */
--lh-tight: 1.25  --lh-base: 1.6  --lh-loose: 1.8
```
比例基准 1.25× 递进（11→13→15→17→20→24），数字用 `font-variant-numeric: tabular-nums` 防跳动。

### 2.4 间距与圆角（8pt 网格）
```
--sp-1:4px --sp-2:8px --sp-3:12px --sp-4:16px --sp-5:20px --sp-6:24px --sp-8:32px
--r-xs:6px --r-sm:10px --r-md:14px --r-lg:20px --r-xl:28px --r-pill:999px
```
所有 padding/margin/gap 只用 `--sp-*`；所有 border-radius 只用 `--r-*`（替换现有散落的 8/10/12/20/25/40px）。

### 2.5 阴影与动效曲线
```
--shadow-1: 0 2px 8px rgba(0,0,0,.08);
--shadow-2: 0 8px 24px rgba(0,0,0,.12);
--shadow-3: 0 12px 32px rgba(0,0,0,.18);
--shadow-accent: 0 6px 18px var(--accent)33;   /* 强调投影，随主题变色 */
--ease-std:   cubic-bezier(.4,0,.2,1);
--ease-out:   cubic-bezier(.16,1,.3,1);
--ease-spring:cubic-bezier(.34,1.56,.64,1);
--dur-fast:140ms --dur-base:240ms --dur-slow:420ms --dur-theme:600ms;
```
主题切换统一 `transition: background var(--dur-theme) var(--ease-std)`（替换现有各组件各自 0.5s/1s 不统一值）。

### 2.6 图标策略（emoji → SVG 过渡）
- **本轮不强制替换**（用户已定），但建立机制：
  - 新增 `.icon` 类：`width/height:1em; vertical-align:-.15em; fill:none; stroke:currentColor; stroke-width:1.8`，颜色自动跟随文字/主题。
  - 在 `css/style.css` 预留 `.icon--ach`/`.icon--tips`/`.icon--settings`/`.icon--album`/`.icon--gift`/`.icon--weather` 等槽位（可用 inline SVG 或 `<svg><use href="#sym-ach">` 符号精灵）。
  - emoji 现状清单（供替换排期）：成就🏆 / 贴士💡 / 设置⚙️ / 相册📸 / 商店🎁 / 天气🌤️ / 通讯录📱 / 资产🪙 / 好感❤️ / 温暖🔥 / 相机📸 / 重开🔄 / 日记📖 / 分享📤 / 成功💝 / 失败💔 / AI🤖 / 音效🔔 / 星⭐ / 搜索🔍 / 锁🔓🔒。
  - 建议优先级：头部 5 图标（成就/贴士/设置/相册/商店）+ 天气 + 资产/好感 → 先 SVG；对话内 emoji（💓🔥💌）可保留为装饰。

### 2.7 可访问性分级（三档特性矩阵）
> 用户定为 Basic / Standard / Comprehensive 三档。UX 规格须引用本分级。

| 特性 | Basic | Standard | Comprehensive |
|---|---|---|---|
| 文本对比度 | 正文≥4.5:1 / 大字≥3:1 | 同 Basic + 主题切换后复检 | 额外提供高对比模式 |
| 键盘可达 | 焦点可见(outline) | 焦点可见 + 模态 Esc 关闭 + 焦点陷阱 | 全菜单纯键盘可达 + 跳过链接 |
| 文本缩放 | 16px 基准 | 200% 不破版（用 rem/--sp） | 提供字号/字重切换 |
| 动效 | 不强制 | 尊重 `prefers-reduced-motion` | 动效可一键全关 |
| 色盲友好 | 不纯靠红绿传意（好感用字+色） | 加纹理/图标区分语义 | 全状态有非颜色提示 |
| 屏幕阅读器 | 基础 alt/label | `role=dialog`+`aria-modal`+`aria-labelledby` | `aria-live` 播报好感/资产/事件变化 |
| 主题记忆 | localStorage 记忆 | 同 Basic | 同 Basic + 跟随系统 `prefers-color-scheme` |

**本轮目标档位：Standard**（lean 强度下即可达成：对比度基线 + reduced-motion + 模态 aria + 主题记忆）。

---

## 3. 主界面重设计方案（Part C）

### 3.1 信息层级与质感升级总览

| 区域 | 现状 | 升级方向（统一 token 后） |
|---|---|---|
| **header** | 渐变条 + emoji 图标按钮，4 图标分散 | 顶部胶囊感强化：`.header` 用 `--accent-grad`；图标按钮统一 `.hdr-ico`（圆角 `--r-md`、hover `--shadow-accent`、focus 可见环）；标题区"恋爱约会 + 天气"字距收紧 `--fs-title` |
| **事件区 her-row + her-bub** | `👧` 头像 + 气泡 `#event-description` | `.her-avatar` 改为圆形头像框（border `--border-strong`、阴影 `--shadow-2`）；`.her-bub` 用 `--surface-2`+`--r-lg`+`--shadow-1`，左缘 `--border-strong` 强调条；文字 `--text-2` |
| **选项 choice-btn** | 渐变按钮，hover 仅加 box-shadow | 用 `--accent-choice`/`--text-on-accent`；`--r-lg`；hover `--shadow-accent` + `translateY(-2px)`(`--ease-out`)；active 缩放；focus 环 |
| **进度条** | `.progress-fill` 渐变，宽度内联 | `.progress-bar` 轨道 `--surface-3`+`--r-pill`；`.progress-fill` `--accent-grad`+`--r-pill`+`transition:width var(--dur-base) var(--ease-out)`；宽度改由 JS 设 `--progress` 变量而非内联 style |
| **结果区 result** | 内联 style 堆砌（279/293/302–305） | 抽为 `.result-card`(`.surface-2`+`--r-xl`+`--shadow-2`)、`.rating-box`(`.surface-3`+`--border`)、`.final-rating-text`；文案与装饰统一 token；去掉内联 |

### 3.2 四主题完整 `[data-theme]` token 定义（修正版）

> 关键修正：把 `data-theme` 挂载点改为 `<html>`（见 §4.2），并将"页面背景"选择器由 `[data-theme="X"] body` 改为 `body[data-theme="X"]`（或依赖根继承）。下面给出**统一形态**的 token 块（组件不再写 hex，只消费 token）。

```css
/* ===== 主题基座：仅重映射颜色类 token ===== */
[data-theme="parchment"]{
  --bg-page:linear-gradient(135deg,#e8dcc0 0%,#f3e8cf 100%);
  --surface-1:#faf3e0; --surface-2:#f3e8cf; --surface-3:#f3e8cf;
  --border:#e0cda0; --border-strong:#a8442a;
  --text-1:#5c4a32; --text-2:#6e5a38; --text-3:#8a7654; --text-on-accent:#faf3e0;
  --accent:#a8442a; --accent-2:#c9a86a;
  --accent-grad:linear-gradient(45deg,#b5895a,#8a6d48);
  --accent-choice:linear-gradient(135deg,#c9a86a,#a8442a);
  --mood-happy-bg:linear-gradient(45deg,#f0e2bd,#e6d29a); --mood-happy-border:#c9a86a; --mood-happy-text:#5c4a32;
  --mood-normal-bg:linear-gradient(45deg,#e8dcc0,#d8c9a8); --mood-normal-border:#9c8454; --mood-normal-text:#5c4a32;
  --mood-angry-bg:linear-gradient(45deg,#f3d6cf,#e8b8ad); --mood-angry-border:#a8442a; --mood-angry-text:#6e2a1c;
}
[data-theme="cinnabar"]{
  --bg-page:linear-gradient(135deg,#f3dcd0 0%,#faeae0 100%);
  --surface-1:#fff5ee; --surface-2:#faeae0; --surface-3:#faeae0;
  --border:#f0c8b8; --border-strong:#c0392b;
  --text-1:#5c2a1e; --text-2:#7a4030; --text-3:#a07a6e; --text-on-accent:#fff5ee;
  --accent:#c0392b; --accent-2:#e8a87c;
  --accent-grad:linear-gradient(45deg,#c0392b,#e74c3c);
  --accent-choice:linear-gradient(135deg,#e74c3c,#c0392b);
  --mood-happy-bg:linear-gradient(45deg,#f7ecc9,#f0dd9a); --mood-happy-border:#e8a87c; --mood-happy-text:#5c4a32;
  --mood-normal-bg:linear-gradient(45deg,#f3dcd0,#e8c4b4); --mood-normal-border:#c0392b; --mood-normal-text:#5c2a1e;
  --mood-angry-bg:linear-gradient(45deg,#f5b7ad,#ef8a7a); --mood-angry-border:#c0392b; --mood-angry-text:#6e1c12;
}
[data-theme="rosegold"]{
  --bg-page:linear-gradient(135deg,#fdeef2 0%,#fdf6ee 100%);
  --surface-1:#fff9fb; --surface-2:#fdf2f5; --surface-3:#fdf2f5;
  --border:#f6dbe2; --border-strong:#d98a9a;
  --text-1:#6e4a4a; --text-2:#a98a8a; --text-3:#c4a0a0; --text-on-accent:#ffffff;
  --accent:#d98a9a; --accent-2:#c9a86a;
  --accent-grad:linear-gradient(45deg,#e8a0a8,#d98a9a);
  --accent-choice:linear-gradient(135deg,#e8b4a0,#d98a9a);
  --mood-happy-bg:linear-gradient(45deg,#fdf0d8,#f8e3bf); --mood-happy-border:#c9a86a; --mood-happy-text:#6e5a38;
  --mood-normal-bg:linear-gradient(45deg,#f3e3ef,#e8cfe0); --mood-normal-border:#d98a9a; --mood-normal-text:#6e4a4a;
  --mood-angry-bg:linear-gradient(45deg,#fbe0e0,#f3c4c4); --mood-angry-border:#e08a8a; --mood-angry-text:#7a3a3a;
}
[data-theme="dusk"]{
  --bg-page:linear-gradient(135deg,#2a2440 0%,#3d3358 100%);
  --surface-1:#2f2848; --surface-2:#38304f; --surface-3:#38304f;
  --border:#4a3f6b; --border-strong:#9b7fd4;
  --text-1:#ece8ff; --text-2:#c9c0e8; --text-3:#9b93bd; --text-on-accent:#2a2440;
  --accent:#9b7fd4; --accent-2:#c9b8f0;
  --accent-grad:linear-gradient(45deg,#4a3f6b,#6b5b95);
  --accent-choice:linear-gradient(135deg,#6b5b95,#9b7fd4);
  --mood-happy-bg:linear-gradient(45deg,#4a3f6b,#3d3358); --mood-happy-border:#c9a86a; --mood-happy-text:#f0e2bd;
  --mood-normal-bg:linear-gradient(45deg,#3d3358,#2f2848); --mood-normal-border:#9b7fd4; --mood-normal-text:#c9c0e8;
  --mood-angry-bg:linear-gradient(45deg,#5a2f44,#43243a); --mood-angry-border:#e08a9a; --mood-angry-text:#f0c4cf;
}
```

**组件消费示例（替换逐组件 hex）：**
```css
body{ background:var(--bg-page); color:var(--text-1); }
.container{ background:var(--surface-1); border-color:var(--text-1); box-shadow:var(--shadow-2); }
.header{ background:var(--accent-grad); color:var(--text-on-accent); }
.choice-btn{ background:var(--accent-choice); color:var(--text-on-accent); border-radius:var(--r-lg); }
.choice-btn:hover{ box-shadow:var(--shadow-accent); transform:translateY(-2px); }
.progress-fill{ background:var(--accent-grad); }
.modal-content,.gift-content,.album-content{ background:var(--surface-1); color:var(--text-1); }
.modal-title{ color:var(--accent); }
.event-card{ background:var(--surface-3); border-left-color:var(--border-strong); }
.happy{ background:var(--mood-happy-bg); border-left-color:var(--mood-happy-border); color:var(--mood-happy-text); }
/* normal / angry 同理 */
```

### 3.3 暗色 night-mode 打磨方案（统一为 dusk）
- **退役 `.night-mode` class 体系**（77–116 行死代码，且与 dusk 调色冲突），将"暗色"唯一收敛为 `data-theme="dusk"`。
- dusk 打磨点（达 Standard 可访问性）：
  - 确保 `--text-1:#ece8ff` on `--surface-1:#2f2848` 对比度 ≥ 7:1（已满足）；`--text-3:#9b93bd` on `--surface-2:#38304f` ≈ 4.6:1（达标，临界值建议提亮到 `#a89ed0`）。
  - 选项/按钮文字 `--text-on-accent:#2a2440` on `--accent-choice` 紫 → 对比充足。
  - 加 `body[data-theme="dusk"]{ color-scheme:dark; }` 让滚动条/表单控件同步暗色。
  - 可选：跟随系统 `prefers-color-scheme: dark` 时默认 dusk（需 JS 少量逻辑，见 §4.2）。

### 3.4 统一模态框组件规范
建立单一组件，所有模态（成就/商店/相册/设置/贴士/兑换/成就详情）复用：
```html
<div class="modal" id="xxx-modal" role="dialog" aria-modal="true" aria-labelledby="xxx-title">
  <div class="modal-panel">
    <header class="modal-header">
      <span class="modal-icon icon icon--ach" aria-hidden="true"></span>
      <h3 class="modal-title" id="xxx-title">标题</h3>
      <button class="modal-close" aria-label="关闭">✕</button>
    </header>
    <div class="modal-body"> … </div>
    <footer class="modal-actions"> … </footer>
  </div>
</div>
```
- `.modal`：fixed 满屏 + `backdrop-filter:blur` + `background:rgba(0,0,0,.4)`；进入用 `--ease-out` + `opacity/translateY` 动画。
- `.modal-panel`：`--surface-1` + `--r-xl` + `--shadow-3` + `border:1px solid var(--border)`。
- `.modal-header`：flex 对齐，`border-bottom:1px solid var(--border)`，padding `--sp-4`。
- `.modal-title`：`--fs-title` + `--fw-semibold` + `color:var(--accent)`（去内联 `color:#ff6b6b`）。
- `.modal-icon`：用 `.icon` 机制（emoji 暂留，后续 SVG）。
- 现有 DOM 改造对照：成就面板 `ach-panel-title`→`modal-title`；商店/相册内联 `<h3 style>`→`modal-title`；设置 `settings-title`→`modal-title`；成就详情已用 `modal-title` 可保留。

---

## 4. 实施规格（Part D）

### 4.1 `css/style.css` 改动清单

| 动作 | 位置 | 说明 |
|---|---|---|
| **新增** | `:root`（~38 行后） | 注入 §2.2–2.5 全部语义 token（颜色/间距/圆角/阴影/动效/字体） |
| **重构** | 77–116 行 | 删除 `.container.night-mode`/`.night-mode *` 整段（并入 dusk），消除死代码与 `!important` |
| **重构** | 2357–2520 行 | 四主题块精简为"仅重映射 token"（§3.2 形态），删除逐组件 hex；选择器 `body[data-theme="X"]` 接管页面背景 |
| **新增** | 组件区 | `.modal/.modal-panel/.modal-header/.modal-title/.modal-icon/.modal-body/.modal-actions/.icon` 统一组件样式 |
| **重构** | `.hdr-ico`/`.choice-btn`/`.progress-*`/`.her-avatar`/`.her-bub`/`.result*`/`.rating-box` | 全部改为消费 token（§3.1），去掉散落硬编码 |
| **新增** | 末尾 | `@media (prefers-reduced-motion: reduce){ *{animation:none!important; transition-duration:0.01ms!important} }` 与 `:focus-visible{ outline:2px solid var(--accent); outline-offset:2px }` |

### 4.2 必要 `js/` / `index.html` 改动

| 项 | 文件:行 | 改动 |
|---|---|---|
| **主题挂载点修正（修 A1 根因）** | `index.html:768、799、865` | `document.body.setAttribute('data-theme',v)` → `document.documentElement.setAttribute('data-theme',v)`（三处：setThemeDirect / loadSavedTheme / applyTheme） |
| 进度条去内联 | `index.html:256` | 删除 `style="width:0%"`，改 JS 设 `document.documentElement.style.setProperty('--progress', pct+'%')`；`.progress-fill{width:var(--progress,0%)}` |
| 图标体系接入 | 头部按钮 231–238 | 给 5 个 `.hdr-ico` 加 `aria-label` 并挂 `.icon` 槽位（本轮可保留 emoji，仅补 aria-label 与 focus 环） |
| 暗色默认（可选）** | 主题 JS | 首次访问且无记忆时：`if(matchMedia('(prefers-color-scheme:dark)').matches) applyTheme('dusk')` |
| 主题记忆 | 已有 localStorage | 保留（满足 Standard 可访问性"主题记忆"） |

### 4.3 收敛 `index.html` 内联 style 指引
- **原则**：所有静态呈现样式进 `css/style.css`；仅"运行时动态计算值"（如 `el.style.width`、动画 `transform`）可保留 JS 内联。
- **优先清理清单**（静态违规）：
  - 12 行 `<div style="font-size:48px;margin-bottom:20px;">💘</div>` → `.start-emoji` 类
  - 219/381/466 行 `<h3 style="color:#ff6b6b;margin:0;">` → `.modal-title`
  - 277/279/293/302–305 结果区内联 → `.result-card/.rating-box/.final-rating-text` 等类
  - 318–333 坏结局/喜怒结局内联 → `.end-card/.end-message/.end-desc` 类
  - 343 日记 `<h4 style>` → `.journal-title`
  - 456–458 兑换框内联 → `.redeem-input/.redeem-btn/.redeem-msg`
  - 464 相册 `<h3 style>` → `.modal-title`
- **保留**：`gf.style.transform`（761）、`spawnFloatLabel`/`cameraFlash` 的 `el.style`（802–844）、`st.style.color`（777+）等运行时样式——属合理范畴，但建议动画类尽量改用 CSS `@keyframes`+class。

### 4.4 Before / After 关键改动对照

**① 主题根因修复（修 A1）**
```diff
- document.body.setAttribute('data-theme', t);
+ document.documentElement.setAttribute('data-theme', t);
```
```diff
- [data-theme="cinnabar"] body { background:linear-gradient(135deg,#f3dcd0 0%,#faeae0 100%); }
+ body[data-theme="cinnabar"] { background:var(--bg-page); }
```

**② token 提取 + 组件消费（修 A3）**
```diff
  .choice-btn {
-   background: linear-gradient(135deg,#e74c3c,#c0392b); color:#fff5ee;
+   background: var(--accent-choice); color: var(--text-on-accent);
+   border-radius: var(--r-lg);
  }
  .choice-btn:hover { box-shadow: var(--shadow-accent); transform: translateY(-2px); }
```

**③ 模态标题去内联（修 A4）**
```diff
- <h3 style="color: #ff6b6b; margin: 0;" id="shop-title">🎁 礼物商店</h3>
+ <h3 class="modal-title" id="shop-title"><span class="icon icon--gift" aria-hidden="true"></span>礼物商店</h3>
```

**④ 退役孤立 night-mode（修 A2）**
```diff
- .container.night-mode { background:#0a0a1a; ... }
- .night-mode .header { background:linear-gradient(...) !important; }
+ /* 删除整段；暗色统一由 [data-theme="dusk"] 提供 */
```

### 4.5 风险与回滚
- **低风险**：纯 token 重映射 + 删除死代码，组件改消费 token；旧逐组件规则删除后由 token 规则等价覆盖。
- **唯一行为风险点**：`document.body` → `document.documentElement` 的挂载点切换。因 token 定义块 `[data-theme="X"]` 在 html 上同样命中并继承到所有后代，且 `body[data-theme="X"]` 背景规则改为正确形态，**预期全部组件仍正常、且页面背景补齐**。回滚只需还原这三行。
- **建议**：先只做"挂载点修正 + 删除 night-mode + bg-page 修复"（最小可验证改动），再分批做 token 重构，便于 lean 节奏下逐步验收。

---

## 5. 下一步建议（给主理人）
1. **先确认"诊断与代码不符"的事实**——四主题其实已齐，真正要修的是 A1（body 背景不跟随）与 A2（night-mode 死代码），避免重复劳动。
2. **批准最小首批改动**：`documentElement` 挂载点修正 + 退役 night-mode + 补 `body[data-theme]` 背景（§4.4 ①/④），即可消除"主题切换背景撕裂"的可见 bug。
3. **再排期 token 重构 + 模态统一 + 内联收敛**（§4.1–4.3），按 lean 分批，不动玩法/数值/音频。
4. **图标 SVG 替换**作为后续独立任务，本轮仅补 `aria-label`+`.icon` 机制。
5. 实施时所有 CSS 仍集中 `css/style.css`，遵守项目规范；改动前请用户授权。
