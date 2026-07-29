# 「约会小故事」道具系统升级 · 内容 Pass 设计文档

> 设计角色：文策渊（design-strategist）｜范围：道具系统升级·内容 pass
> 原则（用户给定，强制遵守）：
> 1. 道具挂**非最优选项**；2. 与文案**联动**（选后 result 出现「获得 X」，背包入道具）；
> 3. 每个道具归**一个事件**（同一 itemId 可出现在多事件，但计一次 distinct）；
> 4. 可叠加「收藏家」类成就（集齐信物解锁）。
> 本文件**只产出设计**，不修改 `story.json` / `backpack.js` / `achievements.js`。

---

## 0. 引擎事实与红线（必读）

### 0.1 已确认的引擎机制（来自 `js/` 实测）
- **字段**：选项（`choice`）支持 `reward`（获得物品）、`useItem`（消耗）、`requireItem`（未持有则隐藏该选项）、`achievement`（字符串成就 id 或数组）。这些字段在 `js/story-loader.js:104-108` 透传，`js/choice.js:158-169` 结算，`js/backpack.js:157-166` 的 `checkEventItem` 在选项含 `reward` 时自动 `acquireItem(choice.reward)`，`js/event-render.js:218-231` 处理 `requireItem` 隐藏。
- **物品注册表**：`backpack.js` 的 `ITEMS` 是 `itemId → { name, icon, color, bg, desc }`；`window.acquireItem(id)` 读取它写入 `gameState.inventory[id] = { icon, count, description, quote }` 并弹 toast。**当前 `ITEMS` 仅 `powerbank` 一条**。
- **成就结算**：`choice.achievement` 存在时，`handleChoiceAchievements`（`choice.js:37-39`）直接 `unlockAchievement(choice.achievement, choice.achievement)`，按 id 匹配；`欧皇附体` 的 id 即 `'欧皇附体'`（`achievements.js:18`），可被选项直接触发。
- **相册联动**：选项另有 `photo` 字段（`story-loader.js:100`）可触发 `triggerCamera`，与 `album.js` 联动。`photo` 道具同时是这一交汇点（见 B-11）。

### 0.2 关键约束（影响「收藏家」可达性，见 C 节论证）
- `gameState.inventory = {}` 在 **每局开局 `initGame()`（`game-init.js:95`）被重置**；`resetBackpack()` 同步清空显示。→ **背包不跨周目持久化**。
- `unlockedAchievements` 通过 `persistentData`（`game-init.js:82-98`）**跨周目持久化**（仅成就解锁状态，不含物品）。
- `collector` 成就条件：`Object.keys(state.inventory).length >= 11`（`achievements.js:7`），统计的是**当前周目实时库存**。

### 0.3 图片安全红线
- **绝不重命名事件 `name`**：接图按「英文子键 + 事件名」匹配（`game-init.js:52`），改名会丢图。
- 中文叙事**不夹英文词**（角色设定里的「吉伊小八 / 花城谢怜 / 盲盒」等为中文 IP 名，属原文设定，保留）。

---

## A. 20 个敷衍选项重写（移除 `_flag:"cut"`）

> 规则：保留现有 schema 字段；仅改 `label`/`result`，并按新剧情自洽调整 `like/heart/mood/moodRaw`（统一收为「轻微代价、有温度」，去除原 `angry` 断崖与 `-6~-8` 惩罚）；**移除 `_flag`** 使选项重新可玩。
> 每条含「旧锚点」（label/result 原文，供 engineering-lead grep 定位）与「新 JSON」（可直接粘贴替换）。

### A-1 ｜ 看电影 · 选项 D（行 442，原 `_flag:"cut"`）
- **旧锚点**：`label:"说不想看，继续逛街"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "D",
  "label": "说好电影不急这一回，牵着她继续逛，约定下次专程来看首映",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 1 },
  "heart": { "type": "fixed", "value": 0 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你揉揉她的发：\"好电影不急这一回，等咱状态最好那天，我请你看首映。\"她眼睛一弯，乖乖把手塞回你掌心：\"那说好了，不许赖账。\"逛街的路忽然轻快起来——有些浪漫，是把遗憾变成下一个约定。"
}
```
*设计说明*：把「扫兴拒绝」改成「延后但郑重约定」，保留轻微代价（钱/好感都不涨），但给了回味的钩子。

### A-2 ｜ 野餐 · 选项 E（行 885，原 `_flag:"cut"`）
- **旧锚点**：`label:"说草地太脏，别坐"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "E",
  "label": "从包里抽出野餐垫，挑块干净树荫铺好，扶她坐下",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你抖开野餐垫，把边角仔细压上小石子：\"脏的是草地，又不是你。\"她噗嗤笑出声，乖乖坐下，指尖戳了戳垫子：\"没想到你还挺会照顾人。\"风掠过树梢，这一方小小的布，成了今天最舒服的角落。"
}
```

### A-3 ｜ 复古照相馆（晴天）· 选项 B（行 1072，原 `_flag:"cut"`）
- **旧锚点**：`label:"在门口看一眼就走，说下次再来"` ／ `result:"她撇撇嘴：\"好吧...下次再来...\"她依依不舍地看着橱窗，但还是跟着你走了。一路上，她时不时回头看照相馆，眼神里充满了遗憾..."`
```json
{
  "key": "B",
  "label": "在橱窗前陪她挑复古道具，说先给你拍组手机写真过过瘾",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 4 },
  "heart": { "type": "fixed", "value": 2 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你举着手机，让她对着橱窗摆出旧上海名伶的架势，还逗她：\"这位老板娘，笑一个。\"她笑得前仰后合，指尖的黑色美甲在镜头里忽闪：\"回去就把照片洗出来夹进书里。\"没花一分钱，却把整间橱窗的快乐都收进了相册。"
}
```

### A-4 ｜ 路边花摊（多云）· 选项 D（行 2478，原 `_flag:"cut"`）
- **旧锚点**：`label:"说花很快就谢了，不买"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "D",
  "label": "说花会谢，却低头解下自己外套的第二颗扣子，别在她衣领当\"不会谢的胸花\"",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 2 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你一本正经：\"真花哪有你耐看，这颗扣子先替它上岗。\"她愣了愣，低头摸着那颗扣子，耳尖悄悄红了：\"你这人…怎么连贫嘴都这么认真。\"风把云吹散了一点，她攥着你的袖口，没再提玫瑰的事。"
}
```

### A-5 ｜ 复古照相馆（多云）· 选项 B（行 2742，原 `_flag:"cut"`）
- **旧锚点**：`label:"在门口看一眼就走，说下次再来"` ／ `result:"她撇撇嘴：\"好吧...下次再来...\"她依依不舍地看着橱窗，但还是跟着你走了。一路上，她时不时回头看照相馆，眼神里充满了遗憾..."`
```json
{
  "key": "B",
  "label": "隔着橱窗陪她数里面的老相机，说等发了奖学金再来拍全套",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 4 },
  "heart": { "type": "fixed", "value": 2 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你指着橱窗里那台老相机如数家珍，逗她：\"这台归你，那台归我，以后咱家就是照相馆。\"她眼睛弯成月牙，悄悄把脸贴上玻璃比了个耶：\"那说好了，钱归你赚，姿势归我摆。\"没进门，心却先拍了张照。"
}
```

### A-6 ｜ 路边花摊（雨天）· 选项 D（行 4364，原 `_flag:"cut"`）
- **旧锚点**：`label:"说太贵了，不买"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "D",
  "label": "说花太贵先不买，却把伞悄悄往她那边倾，伸手拢住她被雨打湿的发梢",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 2 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "雨丝斜斜扫过来，你不动声色把伞挪到她头顶：\"钱留着给你买热奶茶，头发可不能淋着。\"她抬眼望你，雨水顺着伞骨淌成一道小帘，把你们护在里头。她没说话，只是把伞往你那边推了推——有些温柔，比玫瑰更经淋。"
}
```

### A-7 ｜ 雨中漫步 · 选项 D（行 5096，原 `_flag:"cut"`）
- **旧锚点**：`label:"说雨中漫步很傻，赶紧走"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "D",
  "label": "说傻就傻到底，脱下外套罩在两人头顶，陪她去踩亮晶晶的水坑",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 2 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你拎着外套往俩人脑袋上一搭，像撑起半片屋檐：\"淋傻了也是跟你一起傻。\"她咯咯笑着去踩水，水花溅上你的裤脚，你也不躲。雨声里她忽然说：\"其实…雨天的你，也不比晴天差。\""
}
```

### A-8 ｜ 路边花摊（雪天）· 选项 D（行 6063，原 `_flag:"cut"`）
- **旧锚点**：`label:"说花很快就谢了，不买"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "D",
  "label": "说花会谢，却蹲身替她掸掉靴面的雪，说你才是今天最该被捧回家的那朵",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 2 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你单膝虚点雪地，指尖轻轻拂过她鞋面的薄雪：\"玫瑰会谢，你不会。这朵我抱回家，天天浇雪都行。\"她耳尖腾地红了，伸手要把你拽起来：\"快起来，丢死人了…\"可嘴角，分明翘得比枝头的雪还轻。"
}
```

### A-9 ｜ 雪中漫步 · 选项 C（行 6458，原 `_flag:"cut"`）
- **旧锚点**：`label:"说雪中漫步很傻，赶紧走"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "C",
  "label": "说雪中漫步傻，却蹲下给她系紧松开的鞋带，先把她的手搓暖了再走",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你半跪在雪里，把她的鞋带绕成个稳当的结，又拢过她的手哈了口热气：\"傻归傻，脚滑了可不行。\"她呆呆看你低头忙活，忽然弯腰拿围巾把你后颈也裹了裹：\"那…蠢人都别冻着。\"雪落满肩，两个人都笑得傻乎乎的。"
}
```

### A-10 ｜ 雪中拍照 · 选项 C（行 6562，原 `_flag:"cut"`）
- **旧锚点**：`label:"说拍照太麻烦"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "C",
  "label": "说拍照麻烦，却蹲在雪地里用指尖写下她的名字，说这张\"雪地照\"最不会丢",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 2 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你一笔一划在雪面划出她的名字，落款还补了颗歪心：\"洗不出来，但化了之前它归你。\"她蹲下来，指尖跟着描了一遍，哈出的白气糊了镜头也糊了眼：\"那我也要写你的，得比你的深。\"雪地上的字歪歪扭扭，却比任何相片都亮。"
}
```

### A-11 ｜ 围巾材料（雾）· 选项 B（行 7488，原 `_flag:"cut"`）
- **旧锚点**：`label:"拒绝商贩后直接离开"` ／ `result:"你摇摇头，拉着她走了。她回头看了一眼摊位，眼神里充满了遗憾：\"好吧...下次再来...\"雾气中，她的背影显得有些落寞。"`
```json
{
  "key": "B",
  "label": "没急着买材料，却把她的手拢进自己口袋，说这条围巾的功课你替她记下了",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 2 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你捂着她微凉的手指，在兜里弯了弯：\"材料先欠着，等哪天我学会织，第一条也归你。\"她歪头看你，雾气里眼睛亮亮的：\"你连毛线都没碰过，就敢夸海口？\"可手，却在你口袋里安分地没抽走。"
}
```

### A-12 ｜ 雾中奇遇（古董摊）· 选项 D（行 7642，原 `_flag:"cut"`）
- **旧锚点**：`label:"拉着她走，说别浪费时间"` ／ `result:"她撇撇嘴：\"你真扫兴...\""`
```json
{
  "key": "D",
  "label": "说要赶路，却还是陪她在摊前多停了一会儿，指着旧物讲起从前的人",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 2 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你本想拉她走，目光却被一只旧怀表绊住：\"你看，这指针停的那刻，不知谁在等谁。\"她凑你来，雾气里两人头碰着头看那枚停摆的时间，竟都忘了赶路。她轻声说：\"好像…也没那么浪费时间。\""
}
```

### A-13 ｜ 雾中古建筑 · 选项 B（行 8012，原 `_flag:"cut"`）
- **旧锚点**：`label:"匆匆路过，说下次再来"` ／ `result:"她撇撇嘴：\"好吧...下次再来...\"她依依不舍地看着远处的古建筑，但还是跟着你走了。一路上，她时不时回头看，眼神里充满了遗憾..."`
```json
{
  "key": "B",
  "label": "说下次再来，却先陪她仰头把飞檐轮廓描了一遍，说雾正是古建筑的滤镜",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你抬手指给她看檐角那只小兽：\"你看它，雾里像在云里走。下次来晴天才看得清，今天嘛…就当看水墨活了。\"她跟着你指尖望，忽然掏出手机对着雾拍了张模糊的影：\"那这张，就叫《雾中》。\"有些美，要慢下来才接得住。"
}
```

### A-14 ｜ 雾中未来/承诺 · 选项 C（行 8248，原 `_flag:"cut"`）
- **旧锚点**：`label:"说\"未来太遥远了，别想太多\""` ／ `result:"她撇撇嘴：\"你真不懂浪漫...\"她失望地看着你。"`
```json
{
  "key": "C",
  "label": "说未来太远先不想，却把此刻她的手、这团雾、和这句\"在一起\"先妥妥收进心里",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 2 },
  "heart": { "type": "fixed", "value": 1 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你捏了捏她的指节：\"远方我规划不来，但今晚这步路、这只手，我走得踏实。\"她怔了怔，噗嗤笑了：\"你连浪漫都讲逻辑…\"可握住你的力道，却悄悄重了几分。雾散之前，先把脚下的踏实攒够了。"
}
```

### A-15 ｜ 雾中未来/承诺 · 选项 D（行 8272，**松手**）
- **旧锚点**：`label:"说\"这种承诺没有意义\""` ／ `result:"她失望地看着你：\"你真扫兴...\"她松开了你的手，独自向前走去。"`（此条原非 `_flag`，仅 result 含「松手」，重写去断崖）
```json
{
  "key": "D",
  "label": "说\"意义\"这种词太重，只知道此刻想牵着她，把这条雾路走完",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 2 },
  "heart": { "type": "fixed", "value": 2 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你没接那句扫兴的话，反而把她的手握得更紧了些：\"承诺有没有意义我说不好，但手我是真不想放。\"她低头看你交握的手，雾气里嘴角悄悄翘起，没再提\"别想太多\"——原来最稳的回答，从来不是漂亮话，是没松开的指缝。"
}
```

### A-16 ｜ 雾中许愿 · 选项 C（行 8354，原 `_flag:"cut"`）
- **旧锚点**：`label:"说\"许愿没用，别浪费时间\""` ／ `result:"她撇撇嘴：\"你真不懂浪漫...\"她失望地看着你。"`
```json
{
  "key": "C",
  "label": "说许愿灵不灵不好说，却也闭眼陪她认真许了一遍，说陪她疯这一回",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 2 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你学着她的样子双手合十，逗她：\"行，我也许一个——希望你许的，都成。\"她睁开眼偷看你，雾里眼睛亮得像藏了星子：\"你这不叫浪费时间，叫…陪我发傻。\"两人隔着雾对望，心愿飘去哪儿不重要，有人陪着飘才重要。"
}
```

### A-17 ｜ 雾中许愿 · 选项 D（行 8378，**松手**）
- **旧锚点**：`label:"说\"别玩了，走吧\""` ／ `result:"她失望地看着你：\"你真扫兴...\"她松开了你的手，独自向前走去。"`
```json
{
  "key": "D",
  "label": "说不走，雾里的愿望得等它飘远了才许睁眼，顺势把她往怀里带了带",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 3 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你没催她走，反而把她往怀里轻轻一带：\"急什么，让愿望先飞一会儿。\"她靠着你，睫毛上还沾着雾气化成的小水珠，小声说：\"那…你不准偷看我许了什么。\"手，自始至终都没松开。"
}
```

### A-18 ｜ 雾中分别 · 选项 C（行 8458，原 `_flag:"cut"`）
- **旧锚点**：`label:"说\"雾天约会也没什么特别的\""` ／ `result:"她撇撇嘴：\"你真不懂浪漫...\"她失望地看着你。"`
```json
{
  "key": "C",
  "label": "说特别不特别另说，但能和她在雾里一起迷路、再一起走出来，本身就挺好",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😐 一般",
  "mood": "neutral",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 2 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你笑了笑：\"雾天约会有什么特别的？不过是…和你一起迷路，也乐意。\"她抬眼看你，路灯把雾染成暖黄，她没接话，却把你的手攥得更紧了些：\"那下次…还迷路吧。\"分别的路口，忽然没那么舍不得了。"
}
```

### A-19 ｜ 雾中分别 · 选项 D（行 8482，**松手**）
- **旧锚点**：`label:"说\"下次别选这种天气了\""` ／ `result:"她失望地看着你：\"你真扫兴...\"她松开了你的手，独自走进了楼道。"`
```json
{
  "key": "D",
  "label": "说下次还选雾天——因为你最喜欢看她在这种天气里，眼睛亮起来的样子",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 3 },
  "heart": { "type": "fixed", "value": 3 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你摇头，指尖蹭了蹭她微凉的脸颊：\"下次还来。晴天的你好看，雾里的你…更让我想看清。\"她愣住，随即弯眼笑了，主动把脸往你掌心贴了贴：\"那说好了，下回雾天，你不准嫌麻烦。\"她没松手，反而把你往楼道灯光外又拉了拉。"
}
```

### A-20 ｜ 雾中拥抱 · 选项 D（行 8585，**松手**）
- **旧锚点**：`label:"说\"别这样，走吧\""` ／ `result:"她失望地看着你：\"你真扫兴...\"她松开了你的手，独自走进了楼道。"`
```json
{
  "key": "D",
  "label": "说\"别这样\"是嘴硬，双臂却先张开，把她稳稳拢进怀里，说楼道灯下也值得好好抱",
  "moneyRaw": "无花费",
  "money": { "type": "none", "min": 0, "max": 0 },
  "moodRaw": "😊 开心",
  "mood": "happy",
  "like": { "type": "fixed", "value": 4 },
  "heart": { "type": "fixed", "value": 3 },
  "romantic": false,
  "achievement": [],
  "reqLike": null,
  "result": "你嘴上嫌弃，手臂却诚实地环了上去：\"这么多人？可我就想抱你，不行么。\"她埋进你胸口闷笑，指尖揪着你衣角：\"行…你说了算。\"路灯把两人交叠的影子投在墙上，雾早散了，怀里这份暖，却迟迟不肯散。"
}
```

> **A 节汇总**：20 条全部找到语境并重写；无复制粘贴、无「你真扫兴」式敷衍、无纯负面断崖；数值统一收为轻微代价（like 多 1–4、heart 0–3，neutral/happy），并保留角色口吻与回味。其中 4 条原「松手」选项（A-15/17/19/20）重写后**不再松手**，改为「握得更紧 / 往怀里带 / 没松开」。

---

## B. 12 个道具母体 reward 接线 + 获得反馈

### B-0 母体映射总表（事件名经中文 grep 定位；天气按 `weathers` 区块判定）

| # | 道具 | itemId | 事件（中文名） | 天气区块 | 选项 key | 原 label | reward 值 | 非最优? |
|---|------|--------|----------------|----------|----------|----------|-----------|---------|
| 0 | 🔋 充电宝 | `powerbank` | 出门前（event1） | sunny2（行 8681） | D | — | `powerbank` | —（已实现，仅记录） |
| 1 | 🔑 猫咪钥匙扣 | `keychain` | 骑士与公主 | sunny2（行 8710） | B | 只接过小挂件，让她自己背包 | `keychain` | ✅ 中性 |
| 2 | 🐤 吉伊小八挂件 | `chick` | 骑士与公主 | sunny2（行 8710） | A | 自然接过她的包与手里所有物件 | `chick` | △ 最优（用户指定「另一选项」） |
| 3 | 📦 吉伊小八盲盒 | `blindbox` | 抽奖奇遇（泡泡玛特） | sunny2（行 8819） | A | 听她的话，选其中一个重盒子 | `blindbox` | ✅ 负向 |
| 4 | 🎁 吉伊小八隐藏款 | `blindbox_hidden` | 抽奖奇遇（泡泡玛特） | sunny2（行 8819） | C | 另挑一个普通盒子 | `blindbox_hidden` | △ 中奖（呼应欧皇附体） |
| 5 | 🎖️ 徽章 | `badge` | 谷子与文创 | sunny2（行 8929） | A | 耐心陪逛，认真听她讲角色故事 | `badge` | △ 最优（用户指定「别徽章」选项） |
| 6 | 🪞 小镜子 | `mirror` | 雾中奇遇（古董摊） | cloudy2（行 7543） | B | 买下镜子，作为纪念 | `mirror` | △ 购买（自然获得） |
| 7 | 🧸 毛绒玩偶 | `plush` | 商场抽奖 | sunny（行 239） | A | 花点钱买几张抽奖券，搏个头奖 | `plush` | △ 最优（中奖即获得） |
| 8 | 🧢 同款帽子 | `hat` | 帽子被风吹走了 | sunny（行 1231） | B | 追上去捡帽子 | `hat` | ✅ 中性 |
| 9 | 👛 拾得钱包 | `wallet` | 雨中捡到钱包 | rainy（行 4163） | A | 收下钱包，意外之喜 | `wallet` | ✅ 负向（留作纪念） |
| 10 | 📸 约会合照 | `photo` | 雾中古建筑合照 + 地铁站拍合照 | cloudy2（行 8040）+ sunny2（行 10020） | D / B | 拍雾中古建筑合照 / 背向她举手机自拍 | `photo` | △ 拍照（同一 id 两事件） |
| 11 | 🎴 吉伊小八谷子 | `guzi` | 谷子与文创 | sunny2（行 8929） | B | 帮她挑周边，夸她眼光超棒 | `guzi` | ✅ 偏优但非顶 |
| 12 | 🧩 猫咪拼豆 | `pindou` | 难找的拼豆店 | sunny2（行 9042） | B | 精准搜路线，立刻找到店铺 | `pindou` | ✅ 偏优但非顶 |

> **非最优判定说明**：keychain / blindbox / hat / wallet 落在明确非最优（中性或负向）选项，最契合原则；chick / blindbox_hidden / badge / mirror / plush / photo 因「物品本是该选项的自然结果」（挂件在包上、盲盒中奖、徽章别身上、买镜、中玩偶、拍照），只能落在产生它的选项上，已在表中标注「△」并遵从用户指定。

### B-1 `backpack.js` 的 `ITEMS` 注册表新增条目（可直接粘贴，并入现有对象）

```js
// ===== 内容 pass 新增道具（追加到 ITEMS 对象内，powerbank 已存在） =====
keychain: {
  id: 'keychain', name: '猫咪钥匙扣', icon: '🔑',
  color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
  desc: '她手里那只猫咪钥匙扣，你顺手系在了自己包上——说是护身符，其实是想多带一点她。'
},
chick: {
  id: 'chick', name: '吉伊小八挂件', icon: '🐤',
  color: '#fb7185', bg: 'linear-gradient(135deg,#fb7185,#f472b6)',
  desc: '从她包上摘下一枚吉伊小八，别在自己外套上。她说要你好好照顾它——于是它每天陪你晃悠。'
},
blindbox: {
  id: 'blindbox', name: '吉伊小八盲盒', icon: '📦',
  color: '#a78bfa', bg: 'linear-gradient(135deg,#a78bfa,#c4b5fd)',
  desc: '普通款吉伊小八盲盒，她嫌不够隐藏款，你却当宝贝收着——收藏家眼里没有废卡。'
},
blindbox_hidden: {
  id: 'blindbox_hidden', name: '吉伊小八隐藏款', icon: '🎁',
  color: '#f472b6', bg: 'linear-gradient(135deg,#f472b6,#e879f9)',
  desc: '一发入魂抽中的吉伊小八隐藏款！她欢呼着塞给你：这可是欧皇附体。'
},
badge: {
  id: 'badge', name: '专属徽章', icon: '🎖️',
  color: '#34d399', bg: 'linear-gradient(135deg,#34d399,#10b981)',
  desc: '她亲手别在你衣领的吉伊小八徽章，说这是她的专属标记。从此它常驻你身上。'
},
mirror: {
  id: 'mirror', name: '古董小镜', icon: '🪞',
  color: '#60a5fa', bg: 'linear-gradient(135deg,#60a5fa,#818cf8)',
  desc: '雾天古董摊买下的小镜子，摊主说能照出真心。你收着，因为镜里那抹笑，你舍不得丢。'
},
plush: {
  id: 'plush', name: '毛绒玩偶', icon: '🧸',
  color: '#fbbf24', bg: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
  desc: '商场抽奖中的毛绒玩偶，她抱着笑弯了眼，又塞给你：当我的替身陪着你～'
},
hat: {
  id: 'hat', name: '同款帽子', icon: '🧢',
  color: '#22d3ee', bg: 'linear-gradient(135deg,#22d3ee,#38bdf8)',
  desc: '被风吹跑又被你追回的帽子，她踮脚往你头上一扣：追了这么远，算你赢。'
},
wallet: {
  id: 'wallet', name: '拾得钱包', icon: '👛',
  color: '#facc15', bg: 'linear-gradient(135deg,#facc15,#fde047)',
  desc: '雨中水洼里拾得的钱包，你当“意外探险纪念品”揣进背包，约定一起物归原主。'
},
photo: {
  id: 'photo', name: '约会合照', icon: '📸',
  color: '#f472b6', bg: 'linear-gradient(135deg,#f472b6,#fb7185)',
  desc: '一次次按下快门的瞬间：雾里、地铁站、雪地……每张合照，都是你们舍不得删的回忆。'
},
guzi: {
  id: 'guzi', name: '吉伊小八谷子', icon: '🎴',
  color: '#c084fc', bg: 'linear-gradient(135deg,#c084fc,#e879f9)',
  desc: '文创店里她悄悄塞给你的吉伊小八谷子：算你眼光好，这个归你收藏。'
},
pindou: {
  id: 'pindou', name: '猫咪拼豆', icon: '🧩',
  color: '#38bdf8', bg: 'linear-gradient(135deg,#38bdf8,#22d3ee)',
  desc: '拼豆店她亲手做的小猫咪，末了塞给你：这只归你，我是猫咪，你是我缩小版。'
}
```

### B-2 各母体新 result（与文案联动，自然写出获得；reward 字段加在选项 JSON 内）

**B-1 `keychain`｜骑士与公主 · 选项 B**
> 旧：`result:"你拿走零碎的猫咪钥匙扣和小挂件，她背着包跟在身侧，手指无意识摩挲着包带，无别扭无惊喜，偶尔低头看看包上的吉伊小八，氛围平和平淡。"`
> 新：`result:"你接过她手里那只猫咪钥匙扣，金属凉凉的，却因她攥了许久带着点温度。你顺手把它系在自己包上：\"你的是挂件，我的是护身符。\"她偷瞄了一眼，没拦你：\"随你啦。\"——那只猫咪钥匙扣，就这样住进了你的背包。"` ＋ `"reward": "keychain"`

**B-2 `chick`｜骑士与公主 · 选项 A**
> 旧：`result:"你伸手接物时她轻轻挣了一下，嘴上说\"我可以\"，却没躲开，任由你拎走一切，脚步瞬间轻快，还主动指给你看她包上的吉伊小八，絮絮叨叨说这个挂件有多可爱，眼底满是欢喜。"`
> 新：`result:"你伸手接物时她轻轻挣了一下，嘴上说\"我可以\"，却没躲开。你趁机把她的吉伊小八挂件轻轻摘下一枚，别在自己外套拉链上：\"这小东西太可爱，我替你保管一半。\"她眼睛弯成月牙，指尖戳了戳那枚挂件：\"那你要好好照顾它哦。\"——那枚吉伊小八，从此晃在你胸口。"` ＋ `"reward": "chick"`

**B-3 `blindbox`｜抽奖奇遇 · 选项 A**
> 旧：`result:"拆开并非心仪的吉伊小八隐藏款，她耷拉嘴角小声叹气，把玩着手里的盲盒，眼神黯淡了几分，连指尖的黑色美甲都没了光泽，藏不住的失落。"`
> 新：`result:"拆开并非心仪的隐藏款，她耷拉了嘴角，却还是把玩起手里的吉伊小八盲盒舍不得放。你接过那方小小的盒子：\"隐藏款下次再战，这个先归我收藏。\"她眨眨眼：\"你要就送你啦，反正我还有好多想抽的。\"——那只普通款盲盒，躺进了你的背包。"` ＋ `"reward": "blindbox"`

**B-4 `blindbox_hidden`｜抽奖奇遇 · 选项 C**（＋呼应 `欧皇附体`）
> 旧：`result:"拆开的瞬间她惊呼着蹦跳起来，正是她心心念念的吉伊小八隐藏款，她小心翼翼捧着盲盒，指尖的黑色美甲轻轻抚摸着盲盒表面，拉着你的手不停晃，眼睛笑成了月牙，连声音都带着雀跃。"`
> 新：`result:"拆开的瞬间她惊呼着蹦跳起来，正是心心念念的吉伊小八隐藏款！她把盲盒塞进你怀里：\"快，归你保管，这可是欧皇附体！\"你接过来，沉甸甸的全是她的欢喜。——吉伊小八隐藏款，入背包。"` ＋ `"reward": "blindbox_hidden"`，并将该选项 `achievement` 改为 `["幸运之神眷顾","欧皇附体"]`

**B-5 `badge`｜谷子与文创 · 选项 A**
> 旧：`result:"你认真倾听她的分享，哪怕不懂角色，也耐心回应，她越说越起劲，把吉伊小八的徽章别在你身上，还翻出笔记本给你看她摘抄的歌词，眼里满是被重视的欢喜，连语气都软乎乎的。"`
> 新：`result:"她把那枚吉伊小八徽章仔仔细细别在你衣领，还拍了拍：\"以后这就是我的专属标记。\"你低头看着那枚小小的徽章，忽然觉得整件外套都亮了。——专属徽章，已收进背包，成了你身上的常驻印记。"` ＋ `"reward": "badge"`

**B-6 `mirror`｜雾中奇遇（古董摊）· 选项 B**
> 旧：`result:"你买下了镜子，她感动地说：\"我们会永远幸福的，对吧？\""`
> 新：`result:"你买下那面古董镜，老人笑着把它包好。她摸着镜框，眼睛亮亮的：\"我们会永远幸福的，对吧？\"你把它收进背包，心想这哪是镜子，分明是把此刻的她，揣进了怀里。——古董小镜，入背包。"` ＋ `"reward": "mirror"`

**B-7 `plush`｜商场抽奖 · 选项 A**
> 旧：`result:"你买了好几张抽奖券，转盘飞转——结果中了个毛绒玩偶。她抱着玩偶笑得眼睛弯弯：\"虽然没有手机，但这个也好可爱！\""`
> 新：`result:"转盘飞转，指针咔哒停下——竟中了个毛绒玩偶！她抱着玩偶笑得眼睛弯弯，忽然把它塞进你怀里：\"送你啦，当我的替身陪着你～\"你揉揉那团软乎乎的毛绒，把它收进了背包。——毛绒玩偶，入背包。"` ＋ `"reward": "plush"`

**B-8 `hat`｜帽子被风吹走了 · 选项 B**
> 旧：`result:"你追上去捡起帽子，拍了拍灰尘递给她。她笑了笑：\"谢谢...差点就丢了\""`
> 新：`result:"你追上去捡起帽子，拍了拍灰尘递还给她。她接过去，忽然踮脚把帽子往你头上一扣：\"追了这么远，算你赢——这顶归你当战利品啦！\"你笑着把它收进背包，帽檐上还留着她指尖的温度。——同款帽子，入背包。"` ＋ `"reward": "hat"`

**B-9 `wallet`｜雨中捡到钱包 · 选项 A**
> 旧：`result:"你收下了钱包，增加了资金，但她失望地看着你：\"这样不好...这不是我们的钱...\""`
> 新：`result:"你捡起水洼里的钱包，没忍住好奇心翻了翻——里面现金证件俱全。她歪头看你：\"真要据为己有啊？\"你坏笑一声，把钱包揣进背包：\"先当今天的'意外探险纪念品'，回头咱一起找失主，让它物归原主前，先陪咱走一段路。\"她噗嗤笑了：\"你呀，连捡个钱包都要加戏。\"——拾得钱包，暂存背包（待归还）。"` ＋ `"reward": "wallet"`（数值由 `like:-6/heart:-6/angry` 微调为 `like:-2/heart:0/neutral`，与「留作纪念、约定归还」的自嘲基调自洽）

**B-10 `photo`｜（同一 itemId，挂 2 个事件最自然的拍照选项）**
- *雾中古建筑合照 · 选项 D*（cloudy2，行 8040）：旧 `result` 已写「拍了一张合影…这是我们最特别的回忆」。新：在句末补 `——这张合照，也收进了背包的相册格。` ＋ `"reward": "photo"`。
- *地铁站拍合照 · 选项 B*（sunny2，行 10024）：旧 `result` 已写「这张照片，成为了此次约会唯一的绝美合照」。新：在句末补 `——这张合照，成了你背包里最舍不得删的一张。` ＋ `"reward": "photo"`。
> 说明：用户允许 photo「挑 1–2 个最自然的挂 reward」。`photo` 同时是**相册系统最佳交汇点**：若希望合照同时进相册，可在这两个选项再加 `"photo": { "title": "雾中古建筑合照" }` / `{ "title": "地铁站合照" }`（触发 `album.js`），属可选增强，不阻塞 reward 接线。

**B-11 `guzi`｜谷子与文创 · 选项 B**
> 旧：`result:"被夸赞后她傲娇地扬了扬下巴，却悄悄攥紧你挑的吉伊小八谷子，指尖轻轻摩挲着谷子表面，嘴角压不住地上扬，还主动帮你挑了一枚简约的徽章，说适合你。"`
> 新：`result:"被夸赞后她傲娇地扬了扬下巴，却悄悄把那枚吉伊小八谷子攥进你手里：\"算你眼光好，这个归你收藏。\"你接过那方小小的谷子，指尖描过熟悉的轮廓，收进背包。——吉伊小八谷子，入背包。"` ＋ `"reward": "guzi"`

**B-12 `pindou`｜难找的拼豆店 · 选项 B**
> 旧：`result:"你快速拿出手机搜路线，没多久就找到了藏在巷尾的拼豆店，她拉着你冲进去欢呼，一眼就看到了猫咪和吉伊小八造型的拼豆，满眼都是对你的崇拜，拉着你迫不及待想开始做。"`
> 新：`result:"你搜到路线，带她冲进巷尾的拼豆店。她迫不及待挑了猫咪造型，低头一颗颗拼得认真，末了把做好的小拼豆塞给你：\"这只归你，我的是猫咪，你是我缩小版。\"你接过来，彩珠还沾着她指尖的温度。——猫咪拼豆，入背包。"` ＋ `"reward": "pindou"`

### B-3 最终 distinct itemId 集合（≥11 达成）

```
powerbank, keychain, chick, blindbox, blindbox_hidden, badge,
mirror, plush, hat, wallet, photo, guzi, pindou
```
**共 13 种不同 itemId**（含已实现的 `powerbank`），满足「≥11 种」要求，且有 2 个余量（即便把 `guzi`+`pindou` 合并为 1 个，仍有 12 种）。
`chick`/`guzi`/`pindou` 各自只挂一个事件（无重复计数）；`photo` 虽挂 2 事件但同一 id，计 1 次。

---

## C. 「收藏家」成就 GDD 注记

### C-1 存在性确认
`achievements.js:7` 已存在：
```js
{ id: 'collector', title: '收藏家', description: '收集齐所有11种独特的小礼物',
  icon: '🎒', rarity: 'legendary',
  condition: (state) => Object.keys(state.inventory || {}).length >= 11,
  progress: (state) => ({ current: Object.keys(state.inventory || {}).length, max: 11 }) }
```
→ **确认存在**，条件为「当前库存中独特道具数 ≥ 11」。

### C-2 信物清单（= B 节接线成功的 itemId 集合，共 13）
`powerbank, keychain, chick, blindbox, blindbox_hidden, badge, mirror, plush, hat, wallet, photo, guzi, pindou`
（🐚 小海螺未接线，不计入；见 C-5。）

### C-3 单周目 / 跨周目可达性分析（关键）
- **单周目**：玩家只走一种天气（一种 `variantKey`），仅能触发该天气下的事件。各天气**可收集的独特道具上限**如下（依据 B 节接线落点 + `weathers` 区块归属）：

| 天气 | 可获道具（来自 B 节） | 上限 |
|------|----------------------|------|
| sunny2（含 event1 已接线的 powerbank） | powerbank + keychain + chick + blindbox + blindbox_hidden + badge + guzi + pindou + photo(地铁站) | **9** |
| cloudy2 | mirror + photo(雾中古建筑合照) | 2 |
| sunny | plush + hat | 2 |
| cloudy | （无接线） | 0 |
| rainy | wallet | 1 |
| snowy | （无接线） | 0 |
| rainy2 | （无接线） | 0 |

- **跨周目**：`gameState.inventory` 在 `initGame()` 每局重置（`game-init.js:95`），背包**不持久化**；仅 `unlockedAchievements` 跨周目持久化（`game-init.js:82-98`）。`collector` 条件统计的是**当前周目实时库存**，因此**跨周目累加入库存无效**。

**结论**：在当前引擎逻辑下，`collector`（≥11）**单周目与跨周目均不可达**——单周目上限为 **9**（sunny2 满收集），低于阈值 11；库存不跨局，跨周目亦无法累积。

### C-4 建议的合理范围（不改引擎逻辑，供主理人拍板）
1. **首选（低风险，数据层微调）**：将 `collector` 阈值 `max` 与 `condition` 的 `11` 下调至 **9**（与单周目可达上限一致）。这样「在 sunny2 走完非最优收集线」即可解锁，内容（13 种）仍远超阈值，余量充足。改动仅限 `achievements.js` 一处数字，**属数据调整、非逻辑改动**，但按用户要求「不改引擎逻辑」此处仅建议、不代为修改。
2. **次选（真正的「集齐信物」语义，需引擎增强，列为未来项）**：新增跨周目持久化的 `gameState.collectedItems`（首次获得即永久记录 itemId 集合），将 `collector` 指向它。如此可支持「跨多周目集齐全部 13 种」，契合「收藏家」叙事；但这涉及引擎逻辑，**本 pass 不实现**，仅记录为待办。
3. **增强（可选）**：`powerbank` 目前仅在 sunny2 的 event1（行 8681）接线，其他天气 event1 无 reward。若希望各天气起手即能拿充电宝，可在其余 event1 的 D 选项补 `"reward": "powerbank"`（仅复制字段，不影响其他数值）。这能抬升其他天气的上限，但仍不改变 sunny2 的 9 这一硬顶。

> 不论采用哪条，B 节已确保**游戏内存在 13 种可获取道具**，内容侧完全具备支撑「收藏家」的素材；可达性瓶颈在引擎计数口径，已在 C-3/C-4 说清。

### C-5 小海螺（🐚）处理
- 当前库无「海边 / 水洼 / 拾遗」氛围的事件可作为载体（「雨中捡到钱包」为城市雨天叙事，非海边）。按用户要求**不新建事件、不新增天气映射**。
- **结论**：🐚 标记为 **「未来内容，暂未接线」**，不计入 `collector` 信物清单，不在本 pass 接线。若后续新增海边/拾遗类事件，可在此事件的非最优选项挂 `"reward": "shell"` 并补 `ITEMS.shell` 条目（届时可一并把 `collector` 阈值上调）。

### C-6 可放入 GDD 的「收藏家」成就设计说明（文案段）
> **目标**：鼓励玩家探索「非最优选项」与多周目收集，把约会里的每个小信物都攒成一段回忆。
> **触发**：当 `inventory`（或未来的 `collectedItems`）中独特道具数达到阈值（当前 11，建议 9）时，`checkStatsAchievements` 自动解锁。
> **文案**：标题「收藏家」；描述「收集齐所有独特的小礼物」。解锁 toast：「🎒 收藏家：你攒齐了每一份她给的小心意。」
> **解锁反馈**：弹出成就卡（legendary / 典藏档），背包栏高亮全部信物；进度环 `progress` 显示 `current / max`。

---

## 给 engineering-lead 的实施指令

### 1. 字段名确认（来自 `story-loader.js` / `choice.js` / `backpack.js`）
- `reward`（字符串 itemId）：选项含此字段即 `acquireItem` 入库。
- `requireItem`（字符串 itemId）：背包无此物时该选项在渲染时隐藏（`event-render.js:218,231`）。
- `useItem`（字符串 itemId）：选项结算时从背包消耗。
- `achievement`（字符串 id 或数组）：选项结算时 `unlockAchievement(id, id)` 解锁。
- `backpack.js` 的 `ITEMS` 为 `itemId → { name, icon, color, bg, desc }` 注册表；`acquireItem(id)` 读取它。`powerbank` 已存在，本次**只追加 B-1 的 12 条**。

### 2. `backpack.js` 需新增的 `ITEMS` 条目
见 **B-1**（12 条：keychain / chick / blindbox / blindbox_hidden / badge / mirror / plush / hat / wallet / photo / guzi / pindou）。复制粘贴进 `ITEMS` 对象即可。

### 3. `story.json` 需改清单
**(a) 20 处选项替换**（old 锚点见 A 节每条「旧锚点」，新 JSON 见 A 节对应条目；用 label/result 原文 grep 定位，整体替换该选项对象，**移除 `_flag`**）：
- A-1 看电影·D(442) ｜ A-2 野餐·E(885) ｜ A-3 照相馆(晴)·B(1072) ｜ A-4 花摊(多云)·D(2478)
- A-5 照相馆(多云)·B(2742) ｜ A-6 花摊(雨)·D(4364) ｜ A-7 雨中漫步·D(5096) ｜ A-8 花摊(雪)·D(6063)
- A-9 雪中漫步·C(6458) ｜ A-10 雪中拍照·C(6562) ｜ A-11 围巾材料·B(7488) ｜ A-12 雾中奇遇·D(7642)
- A-13 雾中古建筑·B(8012) ｜ A-14 雾中未来/承诺·C(8248) ｜ A-15 雾中未来/承诺·D(8272) ｜ A-16 雾中许愿·C(8354)
- A-17 雾中许愿·D(8378) ｜ A-18 雾中分别·C(8458) ｜ A-19 雾中分别·D(8482) ｜ A-20 雾中拥抱·D(8585)

**(b) 12 处 reward 接线**（事件名 + 选项 key + reward 值；新 result 见 B-2；均**不改事件 name**）：
| 事件（中文名） | 天气 | 选项 key | reward | 备注 |
|----------------|------|----------|--------|------|
| 骑士与公主 | sunny2 | B | `keychain` | |
| 骑士与公主 | sunny2 | A | `chick` | |
| 抽奖奇遇（泡泡玛特） | sunny2 | A | `blindbox` | |
| 抽奖奇遇（泡泡玛特） | sunny2 | C | `blindbox_hidden` | 该选项 `achievement` 追加 `"欧皇附体"` |
| 谷子与文创 | sunny2 | A | `badge` | |
| 雾中奇遇（古董摊） | cloudy2 | B | `mirror` | |
| 商场抽奖 | sunny | A | `plush` | |
| 帽子被风吹走了 | sunny | B | `hat` | |
| 雨中捡到钱包 | rainy | A | `wallet` | 数值微调为 `like:-2/heart:0/neutral` |
| 雾中古建筑合照 | cloudy2 | D | `photo` | 同一 id |
| 地铁站拍合照 | sunny2 | B | `photo` | 同一 id |
| 谷子与文创 | sunny2 | B | `guzi` | |
| 难找的拼豆店 | sunny2 | B | `pindou` | |

> `powerbank`（event1·D，sunny2 行 8681）**已实现，仅记录，无需改动**；可选增强见 C-4.3。

### 4. 测试提醒
改完后跑 `node tools/test-flow-static.mjs`，须全绿（基线 **56/0 PASS**）。若新增改动引入 schema 校验失败，先核对：选项对象是否缺 `key`/`label`/`result`、数值类型是否为 `fixed|random` 且含 `value`/`min`+`max`、`_flag` 是否已移除、`reward` 的 itemId 是否已在 `ITEMS` 注册。

### 5. 红线复核
- ✅ 未重命名任何事件 `name`（接图安全）。
- ✅ 中文叙事无夹英文词（IP 中文名除外）。
- ✅ 仅产出本设计文档；未改动 `story.json` / `backpack.js` / `achievements.js` / 其它 js。
