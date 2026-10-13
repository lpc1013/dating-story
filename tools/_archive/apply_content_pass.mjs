// tools/apply_content_pass.mjs
// 一次性内容 pass 应用脚本：按 (weatherSubKey, eventName, optionKey) 精确定位并修改 data/story.json
// 流程：读 → 定位 → 改 → 写回（2 空格缩进）。定位不到的选项记 SKIP，绝不猜测替换。
// 运行：node tools/apply_content_pass.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NODE = process.execPath;
const p = path.join(ROOT, 'data', 'story.json');

const data = JSON.parse(fs.readFileSync(p, 'utf8'));

const applied = [];
const skipped = [];

// ---------- 定位辅助 ----------
function locate(weather, eventName, key) {
  const variant = data.weathers && data.weathers[weather];
  if (!variant) return { error: 'weather-missing' };
  const ev = (variant.events || []).find(e => (e.name || e.title) === eventName);
  if (!ev) return { error: 'event-missing' };
  const opts = ev.options || ev.choices || [];
  const idx = opts.findIndex(o => o && o.key === key);
  if (idx < 0) return { error: 'option-missing' };
  return { variant, ev, opts, idx, option: opts[idx] };
}

// ---------- (a) 20 处选项整体重写 ----------
// 注意：设计文档里 "路边花摊" 是叙事昵称；JSON 中多云=多云花摊、雨=雨中花摊、雪=路边花摊。
// 这里用 JSON 真实事件名定位，确保命中。
const A_REWRITES = [
  ['sunny', '看电影', 'D', {
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
  }],
  ['sunny', '公园野餐', 'E', {
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
  }],
  ['sunny', '复古照相馆', 'B', {
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
  }],
  ['cloudy', '多云花摊', 'D', {
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
  }],
  ['cloudy', '复古照相馆', 'B', {
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
  }],
  ['rainy', '雨中花摊', 'D', {
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
  }],
  ['rainy', '雨中漫步', 'D', {
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
  }],
  ['snowy', '路边花摊', 'D', {
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
  }],
  ['snowy', '雪中漫步', 'C', {
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
  }],
  ['snowy', '雪中拍照', 'C', {
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
  }],
  ['cloudy2', '围巾材料', 'B', {
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
  }],
  ['cloudy2', '雾中奇遇', 'D', {
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
  }],
  ['cloudy2', '若隐若现的古建筑', 'B', {
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
  }],
  ['cloudy2', '雾中承诺', 'C', {
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
  }],
  ['cloudy2', '雾中承诺', 'D', {
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
  }],
  ['cloudy2', '雾中许愿', 'C', {
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
  }],
  ['cloudy2', '雾中许愿', 'D', {
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
  }],
  ['cloudy2', '雾中分别', 'C', {
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
  }],
  ['cloudy2', '雾中分别', 'D', {
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
  }],
  ['cloudy2', '雾中拥抱', 'D', {
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
  }]
];

for (const [weather, eventName, key, newObj] of A_REWRITES) {
  const loc = locate(weather, eventName, key);
  if (loc.error) { skipped.push({ tag: 'A', weather, eventName, key, reason: loc.error }); continue; }
  loc.opts[loc.idx] = newObj; // 整体替换（移除 _flag 及其它旧字段，旧字段集与本对象一致，无信息丢失）
  applied.push({ tag: 'A', weather, event: eventName, key, what: '整体重写（移除 _flag）' });
}

// ---------- (b) 13 处 reward 接线 + result 文案 ----------
// reward 值 + B-2 新 result（photo 为末尾补文案）。其余字段保持。
const B_WIRINGS = [
  { weather: 'sunny2', eventName: '骑士与公主', key: 'B', reward: 'keychain',
    result: '你接过她手里那只猫咪钥匙扣，金属凉凉的，却因她攥了许久带着点温度。你顺手把它系在自己包上："你的是挂件，我的是护身符。"她偷瞄了一眼，没拦你："随你啦。"——那只猫咪钥匙扣，就这样住进了你的背包。' },
  { weather: 'sunny2', eventName: '骑士与公主', key: 'A', reward: 'chick',
    result: '你伸手接物时她轻轻挣了一下，嘴上说"我可以"，却没躲开。你趁机把她的吉伊小八挂件轻轻摘下一枚，别在自己外套拉链上："这小东西太可爱，我替你保管一半。"她眼睛弯成月牙，指尖戳了戳那枚挂件："那你要好好照顾它哦。"——那枚吉伊小八，从此晃在你胸口。' },
  { weather: 'sunny2', eventName: '抽奖奇遇', key: 'A', reward: 'blindbox',
    result: '拆开并非心仪的隐藏款，她耷拉了嘴角，却还是把玩起手里的吉伊小八盲盒舍不得放。你接过那方小小的盒子："隐藏款下次再战，这个先归我收藏。"她眨眨眼："你要就送你啦，反正我还有好多想抽的。"——那只普通款盲盒，躺进了你的背包。' },
  { weather: 'sunny2', eventName: '抽奖奇遇', key: 'C', reward: 'blindbox_hidden',
    achievement: '欧皇附体',
    result: '拆开的瞬间她惊呼着蹦跳起来，正是心心念念的吉伊小八隐藏款！她把盲盒塞进你怀里："快，归你保管，这可是欧皇附体！"你接过来，沉甸甸的全是她的欢喜。——吉伊小八隐藏款，入背包。' },
  { weather: 'sunny2', eventName: '谷子与文创', key: 'A', reward: 'badge',
    result: '她把那枚吉伊小八徽章仔仔细细别在你衣领，还拍了拍："以后这就是我的专属标记。"你低头看着那枚小小的徽章，忽然觉得整件外套都亮了。——专属徽章，已收进背包，成了你身上的常驻印记。' },
  { weather: 'cloudy2', eventName: '雾中奇遇', key: 'B', reward: 'mirror',
    result: '你买下那面古董镜，老人笑着把它包好。她摸着镜框，眼睛亮亮的："我们会永远幸福的，对吧？"你把它收进背包，心想这哪是镜子，分明是把此刻的她，揣进了怀里。——古董小镜，入背包。' },
  { weather: 'sunny', eventName: '商场抽奖', key: 'A', reward: 'plush',
    result: '转盘飞转，指针咔哒停下——竟中了个毛绒玩偶！她抱着玩偶笑得眼睛弯弯，忽然把它塞进你怀里："送你啦，当我的替身陪着你～"你揉揉那团软乎乎的毛绒，把它收进了背包。——毛绒玩偶，入背包。' },
  { weather: 'sunny', eventName: '帽子被风吹走了', key: 'B', reward: 'hat',
    result: '你追上去捡起帽子，拍了拍灰尘递还给她。她接过去，忽然踮脚把帽子往你头上一扣："追了这么远，算你赢——这顶归你当战利品啦！"你笑着把它收进背包，帽檐上还留着她指尖的温度。——同款帽子，入背包。' },
  { weather: 'rainy', eventName: '雨中捡到钱包', key: 'A', reward: 'wallet',
    numeric: { like: { "type": "fixed", "value": -2 }, heart: { "type": "fixed", "value": 0 }, mood: "neutral", moodRaw: "😐 一般" },
    result: '你捡起水洼里的钱包，没忍住好奇心翻了翻——里面现金证件俱全。她歪头看你："真要据为己有啊？"你坏笑一声，把钱包揣进背包："先当今天的\'意外探险纪念品\'，回头咱一起找失主，让它物归原主前，先陪咱走一段路。"她噗嗤笑了："你呀，连捡个钱包都要加戏。"——拾得钱包，暂存背包（待归还）。' },
  { weather: 'cloudy2', eventName: '若隐若现的古建筑', key: 'D', reward: 'photo',
    append: '——这张合照，也收进了背包的相册格。' },
  { weather: 'sunny2', eventName: '命定的回眸', key: 'B', reward: 'photo',
    append: '——这张合照，成了你背包里最舍不得删的一张。' },
  { weather: 'sunny2', eventName: '谷子与文创', key: 'B', reward: 'guzi',
    result: '被夸赞后她傲娇地扬了扬下巴，却悄悄把那枚吉伊小八谷子攥进你手里："算你眼光好，这个归你收藏。"你接过那方小小的谷子，指尖描过熟悉的轮廓，收进背包。——吉伊小八谷子，入背包。' },
  { weather: 'sunny2', eventName: '难找的拼豆店', key: 'B', reward: 'pindou',
    result: '你搜到路线，带她冲进巷尾的拼豆店。她迫不及待挑了猫咪造型，低头一颗颗拼得认真，末了把做好的小拼豆塞给你："这只归你，我的是猫咪，你是我缩小版。"你接过来，彩珠还沾着她指尖的温度。——猫咪拼豆，入背包。' }
];

for (const entry of B_WIRINGS) {
  const { weather, eventName, key, reward, result, append, achievement, numeric } = entry;
  const loc = locate(weather, eventName, key);
  if (loc.error) { skipped.push({ tag: 'B', weather, eventName, key, reason: loc.error }); continue; }
  const o = loc.option;
  o.reward = reward;
  if (append) {
    if (!(o.result || '').includes(append)) o.result = (o.result || '') + append;
  } else if (result) {
    o.result = result;
  }
  if (achievement) {
    let arr = Array.isArray(o.achievement) ? o.achievement.slice() : (o.achievement ? [o.achievement] : []);
    if (!arr.includes(achievement)) arr.push(achievement);
    o.achievement = arr;
  }
  if (numeric) Object.assign(o, numeric);
  let what = 'reward=' + reward;
  if (append) what += ' + 末尾补文案';
  else if (result) what += ' + 替换result';
  if (achievement) what += ' + achievement追加「' + achievement + '」';
  if (numeric) what += ' + 数值微调';
  applied.push({ tag: 'B', weather, event: eventName, key, what });
}

// ---------- (c) powerbank 跨天气接线（主理人拍板：YES） ----------
// 遍历 7 个 weatherSubKey，找 id:"event1"（或 name 含「出门前」）的事件，
// 在其 key:"D" 且 label 含「充电宝」的选项上，若无 reward 则设置 "powerbank"。
const SUBS = ['sunny', 'cloudy', 'rainy', 'snowy', 'cloudy2', 'sunny2', 'rainy2'];
for (const w of SUBS) {
  const variant = data.weathers[w];
  if (!variant) { skipped.push({ tag: 'C', weather: w, eventName: '(无变体)', key: 'D', reason: 'weather-missing' }); continue; }
  const ev = (variant.events || []).find(e => e.id === 'event1' || ((e.name || e.title || '').includes('出门前')));
  if (!ev) { skipped.push({ tag: 'C', weather: w, eventName: '(无 event1/出门前)', key: 'D', reason: 'event-missing' }); continue; }
  const evName = ev.name || ev.title;
  const opts = ev.options || ev.choices || [];
  const o = opts.find(o => o.key === 'D' && (o.label || '').includes('充电宝'));
  if (!o) { skipped.push({ tag: 'C', weather: w, eventName: evName, key: 'D', reason: '无「D 且 label 含充电宝」的选项（其余天气 event1 的 D 选项未提及充电宝，按原则不硬接）' }); continue; }
  if (o.reward) { skipped.push({ tag: 'C', weather: w, eventName: evName, key: 'D', reason: '已有 reward=' + JSON.stringify(o.reward) + '（幂等跳过）' }); continue; }
  o.reward = 'powerbank';
  applied.push({ tag: 'C', weather: w, event: evName, key: 'D', what: 'reward=powerbank' });
}

// ---------- 写回 ----------
fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');

// ---------- 报告 ----------
const aCount = applied.filter(x => x.tag === 'A').length;
const bCount = applied.filter(x => x.tag === 'B').length;
const cCount = applied.filter(x => x.tag === 'C').length;
console.log('=== 内容 pass 应用报告 ===');
console.log('✅ 已应用 ' + applied.length + ' 处（A 重写 ' + aCount + ' / B reward 接线 ' + bCount + ' / C powerbank ' + cCount + '）');
for (const x of applied) {
  console.log('  [' + x.tag + '] ' + x.weather + ' / ' + x.event + ' / 选项' + x.key + ' → ' + x.what);
}
if (skipped.length) {
  console.log('\n⚠️ SKIP ' + skipped.length + ' 处：');
  for (const x of skipped) {
    console.log('  [' + x.tag + '] ' + x.weather + ' / ' + (x.eventName || '') + ' / 选项' + x.key + ' → ' + x.reason);
  }
} else {
  console.log('\n⚠️ SKIP 0 处');
}

// ---------- 收尾：跑静态测试并打印末 3 行 ----------
try {
  const out = execFileSync(NODE, [path.join(ROOT, 'tools', 'test-flow-static.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const last = out.trim().split('\n').slice(-3).join('\n');
  console.log('\n[静态测试] ' + last);
} catch (e) {
  const msg = (e.stdout || e.stderr || e.message || '').toString();
  console.log('\n[静态测试] 失败：' + msg.split('\n').slice(-5).join('\n'));
  process.exitCode = 1;
}
