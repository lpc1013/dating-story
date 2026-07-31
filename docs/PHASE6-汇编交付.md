# Phase 6 打磨 · 主理人汇编交付（PH6-ASSEMBLY）

> 汇编人：游承峰（主理人）｜日期：2026-07-31｜评审强度：solo
> 来源：audio-director（阮和鸣）/ engineering-lead（程基岩）/ art-director（林绘澄）/ quality-lead（严守真）四份 Phase 6 报告
> 铁律：全程未改游戏代码、未 git commit；所有修复建议须在实施后重跑 `tools/test-flow-static.mjs`（当前 134/0）保持全绿。

---

## 总判定

四条线全部 **CONCERNS / CONDITIONAL PASS**，**零 Blocker**。主干功能已稳：

- 静态基线 **134/0 PASS**（四份报告各自复跑一致）
- 7/7 天气变体线全部通关到好结局，109 事件块零未预期报错
- 五大子系统（道具 / 商店 / 成就 / 相册 / 音乐馆）冒烟全通
- 道具经济闭环 26=26=26、成就 108、音乐馆 219 首可播放、坏结局可达

**当前状态定性：可玩、可测，但打磨未达标——处于"发布前需过一轮快修"的边界。**

**唯一发布硬阻塞**：相册 3 张照片文件缺失（`BUG-01` / `U-1`，Major）——玩家解锁 `雾中古建筑 / 台风之眼 / 雾中海滨` 任一张即裂图 + 控制台 404。需用户补图，或工程先加 `onerror` 占位止血。

---

## 一、四条线各自判定

| 成员 | 判定 | 一句话 |
|---|---|---|
| quality-lead 严守真 | 🟡 CONCERNS | 主干全绿；仅 1 发布阻塞（相册缺图）；其余 Minor |
| engineering-lead 程基岩 | 🟡 CONDITIONAL PASS | 功能全绿；Tone.js 占首屏 94.4% DCL + 454MB 图片 + sw.js 缓存坏 |
| art-director 林绘澄 | 🟡 CONCERNS | 接图逻辑干净；字号规范未生效、454MB 体积、可访问性低于 Basic |
| audio-director 阮和鸣 | 🟡 CONCERNS | 音乐层强（219 曲零死链）；SFX 三通路并存、Tone.js 无守卫抛错、开关半失效 |

---

## 二、跨线最高优先项（四条线共识）

1. **Tone.js 去留**（音频 A-01 + 工程 perf）
   单 hover 单音扛 200KB 外链，无 `typeof Tone` 守卫，离线/被墙时每次悬浮按钮抛 ReferenceError（这正是 E2E 必须拦截 CDN 的根因）；首屏 DCL 2234ms 中 Tone.js CDN 独占 **2114ms = 94.4%**。
   → **移除，或本地化加守卫（~5 行）**，可一并灭掉音频 A-01 与工程首屏性能炸弹。

2. **CSS 主题变量断裂**（美术 E-3，极低成本的救命修复）
   `--bg-chip / --text-primary / --text-muted` **定义 0 处、使用 26 处**；四主题定义的却是 `--chip / --ink / --muted`——两套名字对不上，26 处规则永远拿不到主题值。直接造成 **dusk 主题文字落白底、2.88:1 全表最差**。四主题各加 3 行别名映射即可修复。

3. **规范字号未生效**（美术 E-2）
   `.event-title`（规范 22px/800）与 `.event-description`（规范 18px）的选择器在真实 DOM 里根本无对应元素；实测事件名实际 **13px 常规字重**、描述实际 **15px**（被 `.her-bub` 的 `!important` 接管）。修复应改选择器或给 DOM 补 class，不是继续叠 `!important`。

4. **键盘焦点不可见**（美术 E-1）
   全仓 `button{outline:none}` 且零 `:focus-visible` → 可访问性**低于 Basic**。补 `:focus-visible` 焦点环即可达 Basic。

5. **选项按钮对比度 FAIL**（美术 E-4）
   rosegold 1.83 / parchment 2.04 / dusk 2.75（均 < 3:1）。调暗渐变起始端使最差端 ≥ 4.5:1。

---

## 三、优先级修复清单（按 Sprint 分组）

### Sprint A — P0/P1 快修（纯 css / 少量 js，低风险，建议合并一次改动）
- **E-3** 主题变量别名（四主题各 3 行）→ 顺带修 dusk 2.88:1
- **E-2** 字号选择器改挂 `#event-title` / `#event-description`
- **E-1** 补 `:focus-visible` 焦点环
- **E-4** 调 `.choice-btn` 渐变起始端使最差端 ≥ 4.5:1
- **音频 A-01/A-02/A-03/A-06**：Tone.js 守卫或移除 + 音效开关读 `AppSettings` + 音乐馆/BGM 不叠播 + `init()` 补 `resume()`
- ⚠️ 改完须跑 `tools/test-flow-static.mjs` 保持 134/0，并同跑 `tools/test-e2e.mjs`

### Sprint B — 需用户动作（阻塞或签字）
- **BUG-01 / U-1**：补 3 张相册图（`foggy_ruin` / `typhoon_eye` / `foggy_shore`），规格见美术报告 §5.1 提示词；或先 **E-5** 加 `onerror` 占位止血（两者并行互不冲突）
- **U-5**：454MB 图片 WebP + 降采样（目标 ≤40MB，省 91%，解码内存 309MB→10MB）的画质取舍签字
- **U-4**：头像 1:1 重裁授权（现 2560×1440 横图裁圆会裁掉两侧构图）
- **U-6**：`assets/objects/` 38 张（44MB、零引用）去留

### Sprint C — P1 工程（用户拍板后执行）
- 工程项1：`serve.mjs` 启用 gzip/brotli + `Cache-Control`（配合 Tone.js 本地化，公网首屏估 5s→<1s）
- 工程项3：`sw.js` 缓存策略修复（版本戳 + `activate` 清理 + `navigateFallback`，改完 JS 用户不必重开页面）
- **E-5/E-6/E-7/E-8**：相册 `onerror` 止血、alt 转义（`邻居的"米"字` 引号破坏属性）、补 5 处 `<img>` alt、选项内联提示字号/配色迁 CSS 类
- 音频 A-04~A-09：`playBgm` 读 `AppSettings`/去重、成就 sting 降响度或换合成、闲置音色（coin/achieve/bad/pop）接入等

### Sprint D — P2/P3（建议排 Phase 7）
- 可访问性 Standard/Comprehensive：**E-10** 骨架屏 `.scene-cg.loaded` 从未添加（shimmer 无限循环）、**E-11** `prefers-reduced-motion`、**E-13** 字号调节、**E-14** aria/role、**E-15** `.meta-dot` 对比
- 数据一致性：BUG-02 相册 phantom id、BUG-03 成就计数 `meta.counts.achievements=73` vs 运行时 108、BUG-04 主题 localStorage 双键、BUG-05 事件数声明 112 vs 实测 109、BUG-07 静态测试扩 `assets/photo/` 覆盖
- 美术 **X-1/X-2/X-3**（转程基岩）：`index.html:524` file:// 下 `gameData={}` 空对象导致无法开局、`data/fallback.json` 孤立零引用、file:// 警告文案过期
- **E-16** 多云兜底误配 2 处（正常流程不可达，可仅记录）、**E-17** 音乐封面 4 张补 `cover`

---

## 四、需用户拍板的决策

| # | 决策 | 选项 | 主理人建议 |
|---|---|---|---|
| 1 | **Tone.js 去留** | 移除 / 本地化加守卫 | 移除（只为一个 30ms hover 单音不划算） |
| 2 | **454MB 图片压缩** | 接受 WebP+降采样 / 保持原图 | 接受（省 91%，防低端机 OOM） |
| 3 | **相册 3 张图** | 你出图 / 我先加 onerror 占位 | 两者并行（止血不阻塞补图） |
| 4 | **头像重裁** | 授权按人脸居中自动裁 / 你定裁切框 | 你定裁切框（构图敏感） |
| 5 | **objects 38 张** | 保留延后 / 接入 / 移出仓库 | 你定（44MB 死重） |
| 6 | **成就 sting 形态** | 换合成琶音（省 2MB）/ 保留 mp3 加 duck | 换合成琶音 |
| 7 | **音乐版权** | 核查授权 / 外链 or 移除 | 上线前必查（周杰伦/许嵩整专） |

---

## 五、已知风险与缓解

| 风险 | 缓解 |
|---|---|
| 内容债：42 组跨天气结构性重复 result | 暂缓（用户已确认），排独立内容 pass |
| 仓库 1.06GB 逼近 GitHub Pages 上限（video 602MB） | `video/` 建议外链或按需加载 |
| 上线版权（周杰伦/许嵩整专） | 上线前核查授权 |
| `*_2` 线风险真实落点在相册图（非事件图） | 已定位 3 张缺图，补图即解 |
| `file://` 分支不可达（更上游 `gameData` 为空） | X-1 转工程判断，不阻塞 http 主流程 |

---

## 六、成员原始报告索引

- `docs/qa/playtest-phase6.md`（quality-lead 严守真）
- `docs/architecture/performance-phase6.md`（engineering-lead 程基岩）
- `docs/art-audit-phase6.md`（art-director 林绘澄）
- `docs/audio-polish-phase6.md`（audio-director 阮和鸣）

---

*Phase 6 汇编完成 · 游承峰 · 全程零代码改动、未提交*
