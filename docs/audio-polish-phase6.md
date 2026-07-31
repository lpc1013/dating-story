# Phase 6 音频打磨方案 · audio-polish-phase6

> 负责人：阮和鸣（audio-director） · Task ID：PH6-AUDIO-01 · 优先级 P2 · 评审强度 solo
> 基线自检：`tools/test-flow-static.mjs` → **通过 134 / 失败 0（PASS）**，本文档不改任何代码，基线保持全绿。

---

## 0. 判定速览

**判定：CONCERNS（有条件通过）**

音乐层（BGM / 音乐馆）已完整可用，是本项目的强项；**音效层（SFX）是明确短板**：三套音频通路并存、Tone.js 无兜底会真实抛错、SFX 总开关对一半音效失效、音乐馆与 BGM 会双轨叠播。8 个必查事件点里 **仅 2 个算真正做好**。

好消息：**下面列出的全部缺口都是"工程可做"的**，用 WebAudio 合成即可闭环，**不需要用户另外提供任何音频素材**（详见 §5）。

---

## 1. 音频现状审计

### 1.1 音乐馆（video/）— 覆盖良好

| 项目 | 实测值 |
|---|---|
| mp3 实际文件数 | **219** |
| `video/playlist.json` 索引曲目数 | **219**（歌手 7 / 专辑 33） |
| 索引与实体一致性 | **完全一致**，静态测试 (D) 段 4/4 PASS，无死链、无孤儿 |
| 目录总体积 | 约 **602 MB** |
| 播放器 | `js/music-gallery.js`，歌手→专辑→歌曲三级渲染，音量默认 **0.7** |

**结论：音乐馆资产层零缺口，无需补素材。**

### 1.2 游戏内 BGM — 可用，但有行为缺陷

`js/bgm-paths.js` 定义 8 个场景曲 + 2 个 sting，均指向 `video/纯音乐/` 下真实文件：

| 场景 key | 触发点 | 状态 |
|---|---|---|
| `start` | 首次点击 / `js/bootstrap.js:15` | OK |
| `dating` | `js/game-init.js:63` | OK |
| `night` | `js/event-render.js:137` | OK |
| `album` / `journal` | `js/album.js:31` / `js/journal.js:5` | OK，退出有 `restoreScene()` |
| `ending` / `bad-end` / `mood-end` | `js/result.js:4` / `js/endings.js:4,52` | OK |
| sting `achievement` | `js/achievements.js:91` | 见 §1.4 A-05 |
| sting `peak` | `js/stats.js:126` | 同上 |

`BGM_PATHS.sceneKeywords` / `weatherKeywords` 已写好"按天气动态选曲"的关键词表，但 `SoundManager.playBgm()` 只读 `defaults`，**这套关键词逻辑目前完全没被调用**（死配置）。

### 1.3 三套并行音频通路（核心结构问题）

当前页面同时存在三条互不知情的音频通路，各自持有独立 AudioContext：

| # | 通路 | 位置 | 自己的 Context | 受 `AppSettings.sfx` 控制 |
|---|---|---|---|---|
| 1 | `SFX.*`（振荡器合成） | `js/sfx.js` | 是（懒建 + `resume()`） | **是** |
| 2 | `SoundManager.playSfx()` | `index.html:535` | 是（`init()`，**无 resume**） | **否** |
| 3 | `hoverBeep()`（Tone.js） | `index.html:906` | 是（Tone 自建） | **否** |

外加 `music-gallery.js` 与 `SoundManager.playBgm/playSting` 的 HTMLAudio 实例 —— 一共 **3 个 AudioContext + N 个 Audio 元素**。移动端 Safari 对同页 AudioContext 数量敏感，且三条通路无法做统一总线音量，是后续所有混音问题的根因。

### 1.4 已确认缺陷清单

| ID | 严重度 | 缺陷 | 证据 |
|---|---|---|---|
| **A-01** | **高** | `hoverBeep()` 直接 `new Tone.Synth(...)`，**无 `typeof Tone` 保护**。Tone.js 走 cdnjs 外链，一旦 CDN 被墙/离线/断网，每次鼠标悬浮按钮都抛 `ReferenceError`；且 `bindBeep` 挂在全 body 的 `MutationObserver` 上，报错会持续刷屏。 | `index.html:906-912`；`tools/test-e2e.mjs:112` 必须 route 拦截 + 注入 Tone 桩才能跑，`tools/README-测试.md:52` 已写明此规避 |
| **A-02** | **高** | 设置里的「音效」开关**只管住 `js/sfx.js`**。`SoundManager.playSfx()` 与 `playSting()` 完全不读 `AppSettings.sfx`/`music` —— 玩家关掉音效后，选项音、购买音、成就 sting 照样响。 | `index.html:535,593` 无任何 AppSettings 判断；对比 `js/sfx.js:11` 有判断 |
| **A-03** | **高** | **音乐馆与 BGM 双轨叠播**：`music-gallery.js` 播放器音量 0.7，全程不感知 `SoundManager.bgm`（0.3）。打开音乐馆放歌时两首曲子同时响，且 `toggleBgm()` 是空函数 `/* hook for bgm mode */`。 | `js/music-gallery.js:9,145`；该文件内 0 处 `SoundManager` 引用 |
| **A-04** | 中 | `playBgm()` 不校验 `AppSettings.music`，也不判重。关掉音乐后只要发生场景切换就会重新 `new Audio().play()`；同场景重复调用会把曲子从头重放。 | `index.html:575-591` |
| **A-05** | 中 | 成就/峰值 sting 用的是**整首 mp3**（`璨之花园.mp3` / `凯旋门.mp3`，2 MB 级），音量 0.28 对 BGM 0.3，**且不 duck 背景乐**——两首曲子等响度对撞，成就提示反而糊成一团。 | `js/bgm-paths.js:13-16`；`index.html:593-604` 无 duck 逻辑 |
| **A-06** | 中 | `SoundManager.init()` 建完 AudioContext **不调 `resume()`**。移动端若 context 在用户手势前被创建，会永久停在 `suspended`，选项音/购买音全程静默失败（无报错，最难查）。 | `index.html:530-533`；对比 `js/sfx.js:7` 有 `resume()` |
| **A-07** | 低 | `SFX.coin()`、`SFX.achieve()`、`SFX.bad()` 三个音色**已写好但全项目零调用**（死代码）——它们恰好正是"获得道具/成就解锁/坏结局"缺的音。 | 全仓 `SFX.` 调用仅 `click/flip/heart/pop` |
| **A-08** | 低 | `buy` 音是 `square` 波 200→100 Hz **下行**音，听感接近"错误/拒绝"提示，与"买到心仪礼物"的正反馈语义相反；且它同时被购买、赠礼、兑换三处复用。 | `index.html:560-567`；`js/shop.js:126`、`js/gift.js:51`、`js/redeem.js:34` |
| **A-09** | 低 | `SFX.click()` 读 `selectData?.weather`，而 `selectData` 声明在 `js/shop.js:159`，加载顺序在 `sfx.js` 之后。当前靠"运行时才调用"侥幸不炸，属脆弱依赖。 | `js/sfx.js:23`、`js/shop.js:159`、`index.html:869 vs 890` |

### 1.5 八个必查事件点 · 覆盖判定

| # | 事件点 | 现状 | 判定 |
|---|---|---|---|
| 1 | UI 悬浮 hoverBeep | Tone.js E6 短音，但 A-01 无兜底、A-02 不受开关管 | **缺陷** |
| 2 | UI 点击 | **无通用点击音**。`SFX.click()` 只在 `triggerCamera` 当快门用；涟漪特效是纯视觉，头部图标 / tab / 关闭按钮全静音 | **缺失** |
| 3 | 选项选择 | `playSfx('choice')` 440→880 Hz 上滑 | **已有**（受 A-02/A-06 影响） |
| 4 | 获得道具 reward | `acquireItem()` 只弹 toast，**零音效**；`SFX.coin()` 闲置 | **缺失** |
| 5 | 成就解锁 | 播整首 mp3 sting，无 duck、无短音效；`SFX.achieve()` 闲置 | **缺陷** |
| 6 | 天气 / 主题切换 | `initWeatherEffects()`（`index.html:726`）与 `applyTheme()`（`index.html:846`）**均无音效** | **缺失** |
| 7 | 好感度上升 | 仅 `like>=80` 破阈值时 `SFX.heart()` 响一次；**日常 +1/+2 涨点无任何听觉反馈** | **部分** |
| 8 | 相册打开 | 只切 `album` BGM，**无开合音**；`SFX.flip()` 仅用于翻页 | **部分** |
| 9 | 结局 | 三种结局只切 BGM，**无结局定音/收尾 sting** | **缺失** |

> 8 个必查项中：完全做好 = 1（选项）；带缺陷 = 2；部分 = 2；完全缺失 = 4。

---

## 2. 音频方向：轻甜 / 治愈向

### 2.1 声音调色板

约会模拟的听觉人格应当是**「轻、软、圆、短」**——玩家一局会点几百次，任何一点尖锐或拖沓都会在第 20 次变成噪音。

| 维度 | 定调 | 工程含义 |
|---|---|---|
| 波形 | `sine` 为主，`triangle` 用于情绪高点 | **禁用 `square` / `sawtooth`** 作正反馈（A-08 的 buy 音需改） |
| 音区 | 主音区 **C5–E6（523–1319 Hz）** | 低于 300 Hz 会与 BGM 低频糊在一起；高于 2 kHz 手机外放刺耳 |
| 时长 | UI 类 **≤ 80 ms**；反馈类 **100–250 ms**；结局类 **≤ 1.2 s** | 全部用 `exponentialRampToValueAtTime` 收尾，禁止硬切（会爆 click 噪） |
| 包络 | attack ≤ 5 ms，无 sustain，decay 收干净 | 保持"点到即止"的轻盈感 |
| 音程 | 大三度 / 纯五度 / 大六度上行 = 正反馈；小二度下行 = 负反馈 | 上行 = 心动、获得；下行 = 失去、坏结局 |
| 调性 | 统一 **C 大调音阶内取音**（C-D-E-G-A 五声更甜） | 与 BGM（多为大调纯音乐）不打架 |

### 2.2 情感层级（音量锚点）

以「对话可读性」为最高优先级，自上而下让位：

```
对话/TTS 语音     ← 最高优先，任何时候不被遮挡
  ↑ duck 其他所有层
反馈类 SFX（心动/成就/结局）  gain 0.06 – 0.10
UI 类 SFX（悬浮/点击/翻页）    gain 0.03 – 0.05
BGM / 音乐馆                   volume 0.22 – 0.30
```

### 2.3 天气变体（已有基因，建议延续）

`SFX.click()` 已按天气微调频率（晴 800 / 多云 750 / 雨 700 / 雪 600 Hz + triangle），这是本项目**最好的一个音频设计**，建议扩展到 hover 与 reward：晴天最亮、雪天最柔，让四套天气线有可听辨的差异。

---

## 3. SFX 事件清单（建议实现）

命名约定：`SFX.<语义名>()`，全部走**同一个 AudioContext**（见 §4.1），全部先判 `AppSettings.sfx`。

| 事件 key | 触发点（文件:行） | 声音设计 | gain | 优先级 | 状态 |
|---|---|---|---|---|---|
| `ui.hover` | `index.html:911` bindBeep | E6 sine 30 ms，**节流 60 ms** | 0.03 | 低（可丢弃） | 改造 A-01 |
| `ui.click` | 涟漪委托 `index.html:897` | 天气变频 600–800 Hz sine 80 ms | 0.05 | 低 | **新增** |
| `ui.close` | `.modal-close-btn` / `.back-btn` | G5→E5 下行 sine 90 ms | 0.04 | 低 | **新增** |
| `choice.pick` | `js/choice.js:46` | 现有 440→880 上滑（保留） | 0.06 | 中 | 已有，改开关 |
| `item.reward` | `js/backpack.js:233` `acquireItem` | **复用闲置 `SFX.coin()`**：1200+1600 Hz 双音 | 0.06 | 高 | **新增（0 成本）** |
| `item.use` | `js/backpack.js:256` | `SFX.pop()` 1000 Hz 60 ms | 0.04 | 中 | **新增（0 成本）** |
| `shop.buy` | `shop.js:126`/`gift.js:51`/`redeem.js:34` | **改为上行** C5→G5→C6 sine 180 ms | 0.06 | 中 | 修 A-08 |
| `heart.up` | `updateStats` 涨点处 | E5→A5 triangle 120 ms，**同帧合并只响一次** | 0.05 | 中 | **新增** |
| `heart.peak` | `js/stats.js:127` | 现有 `SFX.heart()` + duck BGM | 0.07 | 高 | 已有，加 duck |
| `achieve.unlock` | `js/achievements.js:91` | **复用闲置 `SFX.achieve()`** 500-800-1100 琶音，**替代整首 mp3 sting** | 0.07 | 高 | 修 A-05 |
| `weather.change` | `index.html:726` `initWeatherEffects` | 四天气各一音：晴 A5 亮 / 云 F5 / 雨 D5 柔 / 雪 C5 triangle 长衰减 | 0.05 | 中 | **新增** |
| `theme.change` | `index.html:846` `applyTheme` | 单音 `SFX.pop()` 变调 | 0.04 | 低 | **新增（0 成本）** |
| `album.open` | `js/album.js:29` `showAlbum` | 双音 400+600 Hz「摊开」感 130 ms | 0.05 | 中 | **新增** |
| `album.flip` | `js/event-render.js:331` | 现有 `SFX.flip()` | 0.03 | 低 | 已有 |
| `photo.shutter` | `js/media.js:11` | 现用 `SFX.click()`，建议改双击式短噪 | 0.05 | 中 | 优化 |
| `ending.good` | `js/result.js:4` | C-E-G-C 上行琶音 1.0 s，**先 duck 后起 BGM** | 0.09 | 最高 | **新增** |
| `ending.bad` | `js/endings.js:4` | **复用闲置 `SFX.bad()`**，改 triangle 免刺耳 | 0.07 | 最高 | **新增（0 成本）** |
| `ending.mood` | `js/endings.js:52` | A4→F4 小三度下行，留白 | 0.07 | 最高 | **新增** |

> 表中 5 条标「0 成本」的，直接调用 `js/sfx.js` 里**已经写好但从未被调用**的函数即可（A-07），基本是一行代码的事。

---

## 4. 混音注意事项

### 4.1 总线结构（建议目标形态）

现在三条通路各接各的 `destination`，无法统一控制。建议合并为**单 AudioContext + 三条 GainNode 总线**：

```
AudioContext (唯一)
├── masterGain (1.0)
│   ├── sfxBus   (AppSettings.sfx ? 1.0 : 0)   ← 所有振荡器音效
│   └── uiBus    (0.6)                          ← hover/click 再降一档
└── HTMLAudio（BGM / 音乐馆，独立 volume 属性）
    └── duck 时统一乘 0.35
```

关键收益：SFX 总开关一处生效（根治 A-02），context 数从 3 降到 1（缓解移动端限制），duck 可集中实现。

### 4.2 音量平衡建议值

| 层 | 现值 | 建议值 | 理由 |
|---|---|---|---|
| BGM | 0.30 | **0.22** | 现值偏高，与 sting 0.28 几乎等响，且压对话 |
| sting（若保留 mp3） | 0.28 | **0.18 + BGM duck 到 0.10** | 消除 A-05 的等响度对撞 |
| 音乐馆播放器 | 0.70 | **0.55**，且**打开音乐馆即暂停 BGM** | 根治 A-03 双轨叠播 |
| UI 音效 | 0.03–0.05 | 维持 | 现值合适 |
| 反馈音效 | 0.04–0.06 | **0.06–0.09** | 略提，让奖励感立得住 |

### 4.3 避免遮挡对话（重点）

1. **TTS 优先级最高**：`AppSettings.tts` 开启且正在朗读时，BGM duck 到 **0.08**，UI 类 SFX 直接跳过不发声。
2. **打字机期间静音 hover**：对话逐字显示时，鼠标扫过按钮不该"哔哔"响——按 `isTyping` 标志位屏蔽 `ui.hover`。
3. **频段避让**：BGM 多为纯音乐，中频（500–1500 Hz）能量集中，SFX 主音区放在 **C5 以上**天然错开，无需 EQ。
4. **duck 曲线**：用 `setTargetAtTime(target, now, 0.08)` 做 80 ms 平滑淡入淡出，**禁止瞬变**（会有"抽气"感）。
5. **并发上限**：反馈类 SFX 同时最多 2 个；`heart.up` 在一次结算里多次触发时**合并为一次**（否则连点会叠成噪音墙）。

---

## 5. 实现策略

### 5.1 Tone.js 合成 vs HTMLAudio 预载 mp3

**结论：全面倒向 WebAudio 原生合成，移除 Tone.js 外链依赖。**

| 维度 | Tone.js（现状） | HTMLAudio 预载 mp3 | **原生 WebAudio 合成（推荐）** |
|---|---|---|---|
| 体积 | ~200 KB 外链 | 每音效 5–20 KB × 18 ≈ 200 KB+ | **0 KB** |
| 离线可用 | ✗ CDN 被墙即挂（A-01） | ✓ | **✓** |
| 素材依赖 | 无 | **需用户提供 18 个音频文件** | **无** |
| 延迟 | 低 | 首次播放有解码延迟 | **最低** |
| 天气/情绪变体 | 需多套文件 | 需多套文件 | **改个参数即可** |
| 项目现状 | 只用了 1 个 hover 音 | 无任何素材（`assets/` 下 0 个音频文件） | `js/sfx.js` 已有完整实现 |

理由很直接：项目**已经有一套能用的 WebAudio 合成器**（`js/sfx.js`），Tone.js 却只被用来发一个 30 ms 的 hover 单音——为一个单音扛 200 KB 外链 + 一个致命 ReferenceError 风险，完全不划算。而 mp3 方案要求用户额外产出 18 个音效文件，与"轻甜短促、要带天气变体"的设计方向也不匹配。

**建议路径**：
1. 用 `SFX.pop()` 变调实现 hover，**删除 Tone.js `<script>` 外链**与 `hoverSynth`；
2. 保留 mp3 仅用于 **BGM 与音乐馆**（已有 219 首资产，无需动）；
3. 成就/峰值 sting 从"整首 mp3"降级为"合成琶音"（同时解决 A-05 和 2 MB 加载）。

### 5.2 移动端（420px 壳）自动播放与手势解锁

现状：`index.html:837` 用 `window.addEventListener('click', ..., {once:true})` 起 BGM，方向对但不够。

| 问题 | 建议 |
|---|---|
| 只监听 `click`，移动端首次交互常是 `touchstart` | 改为同时监听 `pointerdown` / `touchstart` / `keydown`，任一触发即解锁，`{once:true}` |
| `SoundManager.init()` 不 `resume()`（A-06） | 解锁时**统一 `ctx.resume()`**，并在 `visibilitychange` 回前台时再 resume 一次（iOS 切后台会挂起） |
| iOS 静音拨片会静掉 WebAudio | 属系统行为，不可绕过；建议首屏提示语标注「建议关闭静音开关体验音效」 |
| 解锁前音效静默失败无感知 | 解锁前把 SFX 调用**静默丢弃**而非报错，并在解锁后补发一次 `ui.click` 作为"音频已就绪"的确认 |
| 602 MB 音乐资产 + 移动流量 | `music-gallery` 的 `<audio>` 建议 `preload="none"`，仅在用户点播时加载；`sw.js` 的 `ASSETS` 预缓存列表**不要加 mp3** |

### 5.3 Tone.js 缺失时的 stub 兜底

即便按 §5.1 移除 Tone.js，也建议**保留一层防御**，因为 `tools/test-e2e.mjs:112` 与 `tools/README-测试.md:52` 目前都依赖"注入 Tone 桩"才能跑通——这本身就是代码脆弱的信号。

三选一（推荐第 1 条）：

1. **【推荐】彻底移除**：删 `index.html:511` 的 CDN `<script>`，`hoverBeep` 改用 `SFX`。测试侧的 route 拦截与 stub 注入可一并删除，e2e 不再需要为 CDN 打补丁。
2. **保留但加守卫**：`hoverBeep()` 首行加 `if (typeof Tone === 'undefined') return;`——一行修掉 A-01，最小改动。
3. **页内 stub**：在 CDN `<script>` 之后插一段 `window.Tone = window.Tone || { Synth: function(){ return { toDestination(){return this}, triggerAttackRelease(){} }; } };` ——让线上与测试环境行为一致。

无论选哪条，**A-01 都必须修**：这是当前唯一会在真实用户浏览器里持续抛错的音频缺陷。

---

## 6. 判定与缺口清单

### 6.1 判定：**CONCERNS**

- **不判 FAIL**：音乐层资产与索引 100% 一致（219/219），BGM 场景切换完整，静态测试 134/0 全绿，游戏在音频维度可正常交付。
- **不判 PASS**：存在 3 条高严重度缺陷（A-01 会真实抛错、A-02 设置开关半失效、A-03 双轨叠播），且 8 个必查事件点有 4 个完全无音效反馈，达不到 Phase 6「打磨」标准。

### 6.2 缺口清单 A：工程可做（**不需要任何外部素材**）

按建议处理顺序：

| 序 | 缺口 | 对应 | 工作量 | 影响面 |
|---|---|---|---|---|
| 1 | `hoverBeep` 加 Tone 守卫 / 移除 Tone.js | A-01 | XS（1 行 ~ S） | `index.html` |
| 2 | `SoundManager.playSfx/playSting/playBgm` 补 `AppSettings` 判断 | A-02 / A-04 | XS | `index.html` |
| 3 | `SoundManager.init()` 补 `ctx.resume()` + 手势解锁扩展到 `pointerdown/touchstart` | A-06 | XS | `index.html` |
| 4 | 音乐馆打开时暂停 BGM、关闭时 `restoreScene()`，播放器音量 0.7→0.55 | A-03 | S | `js/music-gallery.js` |
| 5 | 接上 5 个闲置音色：`coin`→获得道具、`achieve`→成就、`bad`→坏结局、`pop`→用道具/换主题 | A-07 | S | `backpack.js` / `achievements.js` / `endings.js` |
| 6 | `buy` 音由下行 square 改上行 sine 琶音 | A-08 | XS | `index.html` |
| 7 | 新增 `ui.click` / `ui.close` / `weather.change` / `album.open` / `heart.up` / `ending.*` | §3 表 | M | `js/sfx.js` + 各调用点 |
| 8 | 三通路合并为单 AudioContext + sfxBus/uiBus 总线 | §4.1 | M | `js/sfx.js` + `index.html` |
| 9 | TTS/打字机期间 duck BGM 并屏蔽 UI 音效 | §4.3 | M | `js/chat.js` + `sfx.js` |
| 10 | 音量锚点调整（BGM 0.30→0.22、sting 0.28→0.18） | §4.2 | XS | `index.html` |
| 11 | 清理死配置：`sceneKeywords`/`weatherKeywords` 要么接上要么删 | §1.2 | S | `js/bgm-paths.js` |
| 12 | `music-gallery` 的 `<audio>` 加 `preload="none"` | §5.2 | XS | `js/music-gallery.js` |

**第 1–3 项合计约 5 行改动，即可消除全部 3 条高严重度缺陷**，建议优先落地。

### 6.3 缺口清单 B：需用户提供音频素材

**当前评估：无。**

按 §5.1 的合成方案，全部 18 个 SFX 事件点均可由 WebAudio 振荡器实现，**不需要用户提供任何 wav/mp3 音效素材**（`assets/` 下现在也确实一个音频文件都没有）。

仅在用户主动选择"要真实录音质感"时，才需要外部素材，届时清单为：
- 快门声 ×1（`photo.shutter`，合成较难还原）
- 环境氛围层 ×4（晴/云/雨/雪 loop，用于强化天气沉浸感，属加分项非必需）
- 结局定音 ×3（若希望用真实乐器演奏而非合成琶音）

以上均为**可选增强**，不构成本次交付的阻塞。

### 6.4 阻塞项

**无硬阻塞。** 本次为纯规划交付，未改动任何代码，`tools/test-flow-static.mjs` 维持 134/0 PASS。

两个需用户拍板的方向性决策：

- **决策 1（Tone.js 去留）**：推荐"彻底移除"（§5.3 方案 1）——可连带简化 e2e 测试；若希望改动面最小，选方案 2 的一行守卫。
- **决策 2（成就 sting 形态）**：推荐把整首 mp3 sting 换成合成琶音（省 2 MB 加载 + 解决等响度对撞）；若用户偏爱现有 `璨之花园.mp3` 的氛围，则保留 mp3 但必须加 BGM duck。

### 6.5 静态测试影响预判

上述改动均不触碰 `data/story.json`、`assets/asset-map.js`、`video/playlist.json` 三个被静态测试覆盖的数据面，理论上不影响 134 项断言。但按项目铁律第 5 条，**任何实施后都须重跑 `tools/test-flow-static.mjs` 确认全绿**；若涉及 `index.html` 结构调整，建议同时跑一次 e2e。

---

## 附：本次遵守的项目铁律

| 铁律 | 本次执行情况 |
|---|---|
| 1. CSS 只改 `css/style.css` | 未改任何 CSS |
| 2. JS 模块用 `var` | 未改 JS；§3/§4 的建议实现均按 `var` 约定描述 |
| 3. 接图按（英文子键 + 事件名） | 不涉及 |
| 4. 禁用 `tools/rebuild-from-bak.js` | 未调用 |
| 5. 改完跑静态测试须全绿 | 已跑，134/0 PASS（未改动，基线保持） |
| 6. 不擅自 git commit | 未执行任何 git 操作 |


