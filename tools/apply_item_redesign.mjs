// =============================================================================
// tools/apply_item_redesign.mjs — 道具系统重设计 · story.json 幂等落地脚本
// -----------------------------------------------------------------------------
// 用法（项目根目录下）：
//   node tools/apply_item_redesign.mjs
// 幂等：重复运行无副作用（set 操作为常量赋值；append 用 includes 守卫；
//       新增选项先查 key 是否存在；删除字段用 delete）。
// 仅改 data/story.json，不改任何其他文件、不删事件 name、不提交 git。
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STORY_PATH = path.join(ROOT, 'data', 'story.json');

const raw = fs.readFileSync(STORY_PATH, 'utf8');
const data = JSON.parse(raw);

const applied = [];
const skipped = [];

function findEvent(sub, name) {
  const v = data.weathers[sub];
  if (!v || !Array.isArray(v.events)) return null;
  return v.events.find(e => e.name === name) || null;
}
function findOption(ev, key) {
  if (!ev || !Array.isArray(ev.options)) return null;
  return ev.options.find(o => o.key === key) || null;
}
function removeKey(obj, key) { if (key in obj) { delete obj[key]; return true; } return false; }
function appendResult(opt, feedback) {
  if (!opt.result.includes(feedback)) opt.result = opt.result.replace(/\s+$/, '') + feedback;
}
// 通用变更：定位 (sub,event,key) -> fn(opt,ev)；找不到则记入 skipped
function mutate(sub, event, key, fn, label) {
  const ev = findEvent(sub, event);
  if (!ev) { skipped.push(`${label}: 事件不存在 (${sub}/${event})`); return; }
  const opt = findOption(ev, key);
  if (!opt) { skipped.push(`${label}: 选项不存在 (${sub}/${event}/key=${key})`); return; }
  const detail = fn(opt, ev) || 'ok';
  applied.push(`${label} => ${detail}`);
}

// ---------------------------------------------------------------------------
// (A) 合照移出：reward:"photo" -> choice.photo 字段（走相机链路）
// ---------------------------------------------------------------------------
mutate('sunny2', '命定的回眸', 'B', (opt) => {
  removeKey(opt, 'reward');
  opt.photo = 'selfie_photo';
  const old = '——这张合照，成了你背包里最舍不得删的一张。';
  const neu = '你按下保存，把这张合照存进了手机相册。';
  if (opt.result.includes(old)) opt.result = opt.result.replace(old, neu);
  return 'reward→photo:selfie_photo; result改写';
}, '命定的回眸·B 合照移出');

mutate('cloudy2', '若隐若现的古建筑', 'D', (opt) => {
  removeKey(opt, 'reward');
  opt.photo = 'foggy_ruin';
  const old = '——这张合照，也收进了背包的相册格。';
  const neu = '你按下快门，把她和雾中古建筑一起存进了手机相册。';
  if (opt.result.includes(old)) opt.result = opt.result.replace(old, neu);
  return 'reward→photo:foggy_ruin; result改写';
}, '若隐若现的古建筑·D 合照移出');

// ---------------------------------------------------------------------------
// (B) 双道具拆分 + 道具重主题（reward 改动）
// ---------------------------------------------------------------------------
// 骑士与公主 A 保留 chick（仅校验）
mutate('sunny2', '骑士与公主', 'A', (o) => '保留 reward:' + o.reward, '骑士与公主·A 保留chick');
// 骑士与公主 B 移出 keychain（保留 flavor 文案）
mutate('sunny2', '骑士与公主', 'B', (opt) => {
  removeKey(opt, 'reward');
  return '移除 reward(keychain)，保留flavor文案';
}, '骑士与公主·B 移出keychain');
// 谷子与文创 A badge -> keychain
mutate('sunny2', '谷子与文创', 'A', (opt) => {
  opt.reward = 'keychain';
  opt.result = '她把那只猫咪钥匙扣仔仔细细系在你包上，还拍了拍："以后这就是我的专属标记。"你低头看着那枚小小的钥匙扣，忽然觉得整件外套都亮了。——猫咪钥匙扣，入背包，成了你身上的常驻印记。';
  return 'reward:badge→keychain; result改写';
}, '谷子与文创·A 改挂keychain');
// 谷子与文创 B 移出 guzi（转 flavor）
mutate('sunny2', '谷子与文创', 'B', (opt) => {
  removeKey(opt, 'reward');
  opt.result = '被夸赞后她傲娇地扬了扬下巴，却悄悄把一个精致的小物件塞进你手里："算你眼光好，这个归你收藏。"你接过那方小小的物件，指尖描过熟悉的轮廓，笑着收好。';
  return '移除 reward(guzi)，result→flavor';
}, '谷子与文创·B 移出guzi');
// 抽奖奇遇 A 移出 blindbox（转 flavor）
mutate('sunny2', '抽奖奇遇', 'A', (opt) => {
  removeKey(opt, 'reward');
  opt.result = '拆开并非心仪的隐藏款，她耷拉了嘴角，却还是把玩起手里的盲盒舍不得放。你接过那方小小的盒子："隐藏款下次再战，这个先归我收藏。"她眨眨眼："你要就送你啦，反正我还有好多想抽的。"';
  return '移除 reward(blindbox)，result→flavor';
}, '抽奖奇遇·A 移出blindbox');
// 抽奖奇遇 C blindbox_hidden -> limited_postcard + photo blindbox_photo
mutate('sunny2', '抽奖奇遇', 'C', (opt) => {
  opt.reward = 'limited_postcard';
  opt.photo = 'blindbox_photo';
  opt.result = '拆开的瞬间她惊呼着蹦跳起来，正是一发入魂抽中的限定明信片！她把明信片塞进你怀里："快，归你保管，这可是欧皇附体！"你接过来，沉甸甸的全是她的欢喜。——限定明信片，入背包。';
  return 'reward:blindbox_hidden→limited_postcard; +photo:blindbox_photo; result改写';
}, '抽奖奇遇·C 限定明信片');

// 既有 reward 沿用校验（仅确认存在，不动）
mutate('sunny', '商场抽奖', 'A', (o) => '保留 reward:' + o.reward, '商场抽奖·A 保留plush');
mutate('sunny', '帽子被风吹走了', 'B', (o) => '保留 reward:' + o.reward, '帽子被风吹走了·B 保留hat');
mutate('cloudy2', '雾中奇遇', 'B', (o) => '保留 reward:' + o.reward, '雾中奇遇·B 保留mirror');
mutate('sunny2', '迷路的她', 'D', (o) => '保留 reward:' + o.reward, '迷路的她·D 保留powerbank');

// 新增/改挂 reward（set 幂等 + append feedback 守卫）
function addReward(sub, event, key, item, feedback, label) {
  mutate(sub, event, key, (opt) => {
    opt.reward = item;
    appendResult(opt, feedback);
    return '新增 reward:' + item + ' + 反馈';
  }, label);
}
addReward('sunny', '看电影', 'B', 'ticket_stub', '散场时你把两张票根小心夹进钱包，说等以后老了还要拉她重看一遍。——电影票根，入背包。', '看电影·B ticket_stub');
addReward('cloudy', '书店奇遇', 'A', 'ginkgo_bookmark', '结账时你顺手捎了枚银杏书签，她说夹在最爱那页，就像把今天的时光也留住了。——银杏书签，入背包。', '书店奇遇·A ginkgo_bookmark');
addReward('cloudy', '甜品下午茶', 'A', 'handmade_snack', '临走她偷偷塞给你一块手作点心，甜得不像话，你说这是今天最划算的"投资"。——手作点心，入背包。', '甜品下午茶·A handmade_snack');
addReward('cloudy2', '若隐若现的古建筑', 'A', 'vintage_fan', '离开时她替你收起那把古风折扇，展开是远山，合上是她的笑。——古风折扇，入背包。', '若隐若现的古建筑·A vintage_fan');
addReward('rainy', '伞向谁倾斜', 'A', 'clear_umbrella', '你撑开那把透明伞，雨丝落在上面，清亮的小世界里只装得下你们俩。——透明伞，入背包。', '伞向谁倾斜·A clear_umbrella');
addReward('rainy', '雨中花摊', 'A', 'dried_flower', '你顺手压下一枝玫瑰做成干花书签，她说比鲜花更经放，像你们的日子。——干花书签，入背包。', '雨中花摊·A dried_flower');
addReward('rainy2', '台风预警', 'D', 'windproof_cape', '临出门你把防风披风往她肩上一披，风再大，也被挡在了你们之外。——防风披风，入背包。', '台风预警·D windproof_cape');
addReward('rainy2', '停电时刻', 'B', 'emergency_light', '你摸到那支应急手电，一束光就把慌乱的她稳住了。——应急手电，入背包。', '停电时刻·B emergency_light');
addReward('snowy', '围巾的归属', 'B', 'scarf', '她亲手织的小猫围巾，一人一半系在身上，雪天里你们共用着同一颗心跳。——围巾，入背包。', '围巾的归属·B scarf');
addReward('snowy', '如何暖手', 'B', 'hand_warmer', '你又从怀里摸出暖手宝塞给她，小小一团，却把冰凉的指尖焐成了春天。——暖手宝，入背包。', '如何暖手·B hand_warmer');
addReward('snowy', '雪中拍照', 'A', 'snow_postcard', '你顺手把这张雪中合影印成明信片，背面写"今年初雪，身边是你"。——雪景明信片，入背包。', '雪中拍照·A snow_postcard');

// 雨中捡到钱包 A 移除 wallet（转纯 flavor，保留拾金不昧）
mutate('rainy', '雨中捡到钱包', 'A', (opt) => {
  removeKey(opt, 'reward');
  opt.result = '你捡起水洼里的钱包，没忍住好奇心翻了翻——里面现金证件俱全。她歪头看你："真要据为己有啊？"你坏笑一声："先当今天的\'意外探险纪念品\'，回头咱一起找失主，让它物归原主前，先陪咱走一段路。"她噗嗤笑了："你呀，连捡个钱包都要加戏。"';
  return '移除 reward(wallet)，result→纯flavor';
}, '雨中捡到钱包·A 移出wallet');

// 【额外必要改动】难找的拼豆店 B 仍 reward:"pindou"，而 ITEMS 按设计稿删除 pindou，
// 若不处理会导致 (E) 测试悬空失败 → 移除该 reward 并转 flavor。
mutate('sunny2', '难找的拼豆店', 'B', (opt) => {
  removeKey(opt, 'reward');
  opt.result = '你搜到路线，带她冲进巷尾的拼豆店。她迫不及待挑了猫咪造型，低头一颗颗拼得认真，末了把做好的小拼豆塞给你："这只归你，我的是猫咪，你是我缩小版。"你接过来，彩珠还沾着她指尖的温度，小心收好。';
  return '【额外必要】移除 reward(pindou) 转flavor，确保(E)测试通过';
}, '难找的拼豆店·B 移除pindou(额外)');

// ---------------------------------------------------------------------------
// (C) 拍照选项：5 处改挂 + 16 处新增（含 谷子与文创·E 因 E 不存在而按设计稿作新增）
// ---------------------------------------------------------------------------
// 改挂（既有选项加 photo）
mutate('snowy', '雪中拍照', 'D', (opt) => { opt.photo = 'snowy_city'; return 'photo:snowy_city'; }, '雪中拍照·D 改挂snowy_city');
// 命定的回眸 B / 若隐若现的古建筑 D / 抽奖奇遇 C 的 photo 已在 (A)/(B) 段落加好

// 新增选项构造器（字段骨架与现有选项一致）
function photoOpt(key, label, moneyRaw, like, heart, romantic, ach, result, photo) {
  return {
    key, label,
    moneyRaw,
    money: { type: 'none', min: 0, max: 0 },
    moodRaw: '😊 开心', mood: 'happy',
    like: { type: 'fixed', value: like },
    heart: { type: 'fixed', value: heart },
    romantic,
    achievement: ach,
    reqLike: null,
    result,
    photo
  };
}

const newPhotoOptions = [
  // 15 条映射（subKey, event, key, photoId）
  { sub: 'sunny', event: '公园野餐', key: 'F', photo: 'sunny_park',
    opt: photoOpt('F', '趁着野餐气氛，给她拍张照', '无花费', 6, 5, false, [],
      '你举起手机，把这一刻的晴光与她的笑意一起定格。照片里她嘴里还叼着三明治，眼睛弯成月牙，像把整个午后的好天气都收了进去。', 'sunny_park') },
  { sub: 'sunny', event: '看夕阳', key: 'E', photo: 'sunset_photo',
    opt: photoOpt('E', '揽住她的肩，拍下夕阳下的合照', '无花费', 8, 10, true, [],
      '你把她往怀里带了带，趁着天边烧成橘红按下快门。她在余晖里靠着你，笑得比夕阳还暖，说这张要洗出来夹进书里。', 'sunset_photo') },
  { sub: 'cloudy', event: '看夕阳', key: 'E', photo: 'sunset_photo',
    opt: photoOpt('E', '在云隙漏下的光里，与她拍张合照', '无花费', 8, 10, true, [],
      '多云的天，云缝里忽然漏下一束暖光。你拉她站进那片光里拍了张合照，她说云也懂凑热闹，把这一刻衬得刚好。', 'sunset_photo') },
  { sub: 'cloudy', event: '街头拍照', key: 'E', photo: 'cloudy_street',
    opt: photoOpt('E', '拉着她拐进街角，随手拍几张', '无花费', 5, 4, false, [],
      '你们拐进一条安静的街角，她抱着相机比比划划。你举手机随手帮她拍了几张，她翻着照片笑：原来平平无奇的街，也能被你们拍出味道。', 'cloudy_street') },
  { sub: 'cloudy', event: '咖啡店小憩', key: 'E', photo: 'cafe_date',
    opt: photoOpt('E', '趁靠窗的光，给她拍张照', '无花费', 5, 4, false, [],
      '窗外车流缓缓，她捧着咖啡发呆。你悄悄举起手机，把这一帧午后的温柔收进相册，她发现后笑着比了个耶。', 'cafe_date') },
  { sub: 'cloudy2', event: '雾中公园', key: 'E', photo: 'cloudy_mountain',
    opt: photoOpt('E', '雾里远眺，和她合张影', '无花费', 6, 5, false, [],
      '雾散了些，你们站上高处远眺。你把她的手拢进掌心，趁山影朦胧按下快门，她说这雾里的人间，好像只剩你们两个。', 'cloudy_mountain') },
  { sub: 'rainy', event: '雨中漫步', key: 'F', photo: 'rain_date',
    opt: photoOpt('F', '并肩走进雨里，拍下这一程', '无花费', 7, 6, true, [],
      '伞下的小世界静悄悄，你们索性并肩走进雨里。你举手机拍下这一程，雨丝、路灯和她的侧脸，都成了镜头里最温柔的注脚。', 'rain_date') },
  { sub: 'rainy', event: '共伞聊天', key: 'E', photo: 'rainy_window',
    opt: photoOpt('E', '隔着雨窗，与她相视而笑拍一张', '无花费', 6, 6, true, [],
      '雨打在伞面噼啪作响，她靠着你说了好多心里话。你隔着雨窗与她相视而笑，顺手拍下这张，说往后的心事都讲给你听。', 'rainy_window') },
  { sub: 'rainy', event: '雨中花摊', key: 'E', photo: 'rainy_garden',
    opt: photoOpt('E', '在花摊前，与她合张影', '无花费', 7, 6, true, [],
      '雨里的玫瑰越发红润，她抱着花笑得灿烂。你在花摊前与她合了张影，说这束花和她的笑，是今天最值的收获。', 'rainy_garden') },
  { sub: 'rainy', event: '雨中遇见流浪猫', key: 'E', photo: 'cat_photo',
    opt: photoOpt('E', '蹲下来，和她一起与橘猫合个影', '无花费', 8, 5, false, ['宠物友好'],
      '小猫蹭了蹭你们的裤脚，她眼睛亮得像盛了星子。你蹲下来，和她一起把这只橘猫收进相册，说往后每次路过都要来看看它。', 'cat_photo') },
  { sub: 'rainy2', event: '台风眼', key: 'E', photo: 'typhoon_eye',
    opt: photoOpt('E', '在风眼静谧里，记录这罕见奇景', '金钱 不变', 7, 5, false, [],
      '风忽然停了，世界静得能听见心跳。你举起手机，把云裂的那道光和身边人一起收进相册，说这辈子大概只见这一次。', 'typhoon_eye') },
  { sub: 'rainy2', event: '雨过天晴', key: 'E', photo: 'conflict_resolved',
    opt: photoOpt('E', '雨后初晴，和她拍张平安纪念', '金钱 不变', 7, 5, false, [],
      '风停雨歇，阳光重新漏进窗台。你拉她到窗边，拍下这张劫后平安的合照，说以后每次台风，都要一起等到放晴。', 'conflict_resolved') },
  { sub: 'snowy', event: '雪中漫步', key: 'E', photo: 'snow_date',
    opt: photoOpt('E', '雪地里并肩，拍下这一程', '无花费', 10, 12, true, [],
      '雪落满肩，你们脚印并排延伸。你举起手机拍下这一程，说这条路要是能一直走到白头，该多好。', 'snow_date') },
  { sub: 'snowy', event: '堆雪人', key: 'E', photo: 'snowy_forest',
    opt: photoOpt('E', '在银装素裹里，和她合张影', '无花费', 8, 7, false, [],
      '雪人戴上了你的围巾，她笑得鼻尖通红。你在银装素裹里与她合了张影，说这个冬天，因她而暖。', 'snowy_forest') },
  { sub: 'sunny2', event: '夫子庙', key: 'E', photo: 'night_photo',
    opt: photoOpt('E', '夜色里，和她在秦淮边合张影', '金钱 不变', 8, 6, false, [],
      '夫子庙灯影摇曳，秦淮水映着月色。你和她并肩站在桥边合了张影，说这古色古香的一夜，要好好收进相册。', 'night_photo') },
  // 谷子与文创·E 按设计稿作新增（任务清单误列入"改挂"，但 E 不存在）
  { sub: 'sunny2', event: '谷子与文创', key: 'E', photo: 'date_photo',
    opt: photoOpt('E', '在文创店里，和她合张影', '金钱 不变', 8, 6, false, ['摄影师'],
      '你们对着满墙的谷子比耶，她举着猫咪钥匙扣笑得眉眼弯弯。你趁机拍下这张文创店合照，说这是今天最值的收藏。', 'date_photo') },
];

for (const item of newPhotoOptions) {
  const ev = findEvent(item.sub, item.event);
  if (!ev) { skipped.push(`新增photo选项: 事件不存在 (${item.sub}/${item.event})`); continue; }
  if (!Array.isArray(ev.options)) ev.options = [];
  const existing = ev.options.find(o => o.key === item.key);
  if (existing) { skipped.push(`新增photo选项: key=${item.key} 已存在 (${item.sub}/${item.event}) — 跳过`); continue; }
  ev.options.push(item.opt);
  applied.push(`新增photo选项 ${item.sub}/${item.event}/key=${item.key} → photo:${item.photo}`);
}

// ---------------------------------------------------------------------------
// 写回（2 空格缩进）
// ---------------------------------------------------------------------------
fs.writeFileSync(STORY_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log('==== apply_item_redesign 完成 ====');
console.log(`已应用 ${applied.length} 项：`);
applied.forEach(a => console.log('  ✓ ' + a));
if (skipped.length) {
  console.log(`\n跳过 ${skipped.length} 项（不匹配/已存在）：`);
  skipped.forEach(s => console.log('  ⚠ ' + s));
} else {
  console.log('\n无跳过项。');
}
