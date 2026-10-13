# tools/_archive — 一次性脚本与冗余资源归档

> 归档日期：2026-10-13
> 原则：**只移不删**。这里的文件仍留在项目内、仍受 git 追踪，随时可取回。

## 归档内容

### 一次性重构 / 内容 pass 脚本（已完成使命，除非重跑同类重构否则不再需要）

| 文件 | 原用途 |
|---|---|
| `apply_content_pass.mjs` | 第一轮 story.json 内容 pass（重写 20 处 + 接线 12 道具） |
| `apply_content_pass2.mjs` | 第二轮「你真扫兴」残留模板 cleanup（6 处） |
| `apply_item_redesign.mjs` | 道具系统重设计落地（幂等脚本，已落地完成） |
| `mark_cut_flags.mjs` | 一次性审计：给敷衍选项打 `_flag:"cut"` |
| `split-achievements.mjs` | 将巨型 achievements.js 按 ROUTE 拆成 16 个模块（acorn 驱动） |
| `rebuild-body.js` | 从 `index.html.bak` 抽取 body 重建 |
| `rebuild-from-bak.js` | 从 `index.html.bak` 一次性完成全量拆分 |
| `fix-const-var.js` | 把内联模块变量 `const` 改 `var`（拆分铁律） |
| `swap-photos.js` | 一次性替换相册照片 |
| `slim-v2.py` | 精确切除 index.html 内联脚本冗余代码 |
| `gen_parallel_packages.py` | 生成 `.workbuddy/memory/packages` 并行创作素材包 |

### 冗余运行时资源（已确认无任何代码引用）

| 文件 | 说明 |
|---|---|
| `story-template.json` | 1.9KB 故事模板，全仓库 grep 零引用 |
| `fallback.json` | 117KB 离线兜底数据。**运行时未使用**——当前兜底走 `index.html` 内联 `embedded`，`StoryLoader.load(url,{fallback:embedded})`。已从 `sw.js` 的 PRECACHE 列表移除（原白白预缓存 117KB）。仅 `backup/` 下的历史代码有引用。 |

## 留在 `tools/` 根目录的常驻工具

- `test-flow-static.mjs` — 静态质量门（133 项，改代码后必跑）
- `test-e2e.mjs` — Playwright 真实浏览器全流程 E2E
- `audit-project.mjs` — 静态架构审计（加载顺序 / DOM id / 全局定义 / CSS 死代码）
- `deploy_github.sh` — GitHub REST API 部署
- `fetch_covers.mjs` / `fix_covers.mjs` — 专辑封面抓取与修正（新歌入库流程会重跑）
- `audit-music.js` — playlist ↔ video/ 实际文件一致性审计
- `verify-rules.js` — game-rules.json ↔ story.json 规则交叉验证
- `shot-art.mjs` — 美术视觉验收截图（仅截图不改数据）
- `_syntax-check.js` — index.html 内联脚本语法快检
- `README-测试.md` — 测试说明

## 取回方式

直接把文件挪回上级目录即可（如需要重跑重构）：
```bash
mv tools/_archive/split-achievements.mjs tools/
```
