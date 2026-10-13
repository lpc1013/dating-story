import json, os
from datetime import datetime

d = json.load(open('data/story.json', encoding='utf-8'))
W = d['weathers']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG_DIR = os.path.join(ROOT, '.workbuddy', 'memory', 'packages')
os.makedirs(PKG_DIR, exist_ok=True)

ref_map = {
    'sunny2': os.path.join(ROOT, 'assets', 'characters', 'gf_sunny_v3.png'),
    'cloudy': os.path.join(ROOT, 'assets', 'characters', 'gf_cloudy_v2.png'),
    'cloudy2': os.path.join(ROOT, 'assets', 'characters', 'gf_cloudy_v2.png'),
    'rainy': os.path.join(ROOT, 'assets', 'characters', 'gf_rainy.png'),
    'rainy2': os.path.join(ROOT, 'assets', 'characters', 'gf_rainy.png'),
    'snowy': os.path.join(ROOT, 'assets', 'characters', 'gf_snowy.png'),
}

scenarios = [
    ('sunny2', 'white short-sleeve t-shirt, beige high-waisted wide-leg shorts, white canvas sneakers'),
    ('cloudy', 'dusty-blue light knit cardigan open over a white t-shirt, light-blue straight-cut jeans, white sneakers'),
    ('cloudy2', 'dusty-blue light knit cardigan over a white t-shirt, light-blue straight-cut jeans, white sneakers'),
    ('rainy', 'translucent yellow raincoat over a hoodie, rolled-up light-blue jeans, yellow rain boots, holding a clear dome umbrella'),
    ('rainy2', 'translucent yellow raincoat over a hoodie, rolled-up light-blue jeans, yellow rain boots'),
    ('snowy', 'thick cream woolen coat, knitted scarf, white bobble hat, warm brown knee-high boots'),
]

for skey, outfit_en in scenarios:
    evs = W[skey]['events']
    ref = ref_map[skey]
    out_dir = os.path.join(ROOT, 'assets', 'events', skey)
    sname = W[skey]['name']

    lines = []
    lines.append(f'# {sname} ({skey}) 事件配图 · 并行任务包')
    lines.append('')
    lines.append(f'> 由 sunny 试点模板自动生成 | {datetime.now().strftime("%Y-%m-%d")}')
    lines.append(f'> 事件数：{len(evs)} | 画风：日系动漫Q版')
    lines.append('')
    lines.append('## 执行前准备')
    lines.append('')
    lines.append(f'1. 确保参考图存在：`{ref}`')
    lines.append(f'2. 确保输出目录已创建：`{out_dir}`')
    lines.append('3. 本任务包可在一个 WorkBuddy 窗口内独立完成，无需额外上下文')
    lines.append('')
    lines.append('## 固定参数模板')
    lines.append('')
    lines.append('每次调用 ImageGen 使用以下固定参数，仅替换 PROMPT 部分：')
    lines.append('')
    lines.append('{ ImageGen params }')
    lines.append(f'  image: "{ref}"')
    lines.append(f'  input_fidelity: 0.7')
    lines.append(f'  quality: "high"')
    lines.append(f'  size: "1024x1024"')
    lines.append(f'  output_dir: "{out_dir}"')
    lines.append(f'  prompt: <SEE EVENT PROMPT BELOW>')
    lines.append('')
    lines.append(f'生成后文件重命名为：<event_id>_<中文事件名>.png')
    lines.append('')
    lines.append('---')
    lines.append('')

    for i, e in enumerate(evs):
        eid = e['id']
        name = e['name']
        prompt_text = e['prompt']

        lines.append(f'## {i+1}. {name}')
        lines.append('')
        lines.append(f'**剧情原文：** {prompt_text}')
        lines.append('')

        gf_desc = f'girlfriend (long straight dark-brown hair, wispy bangs, big sparkling eyes, gentle sweet expression, wearing {outfit_en})'

        en_prompt = (
            f'Cute Q-version anime illustration. '
            f'A young couple in the following scene: {prompt_text} '
            f'The {gf_desc}. She and the boyfriend (short dark hair, casual outfit) '
            f'are the main characters. Japanese anime chibi style, glossy cel-shading, '
            f'fresh colors, romantic atmosphere. Square composition 1024x1024. '
            f'No text, no watermark.'
        )
        lines.append(f'**ImageGen prompt：**')
        lines.append(f'```text')
        lines.append(en_prompt)
        lines.append(f'```')
        lines.append('')
        lines.append('---')
        lines.append('')

    fpath = os.path.join(PKG_DIR, f'task_{skey}.md')
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'{skey}: {len(evs)} events -> {os.path.basename(fpath)}')

# --- Objects package ---
print('')
print('Generating objects package...')

objects = [
    ('bicycle', '自行车', 'A cute chibi-style bicycle with a back seat, warm colors, sunny vibe'),
    ('raffle_wheel', '抽奖转盘', 'A colorful prize lottery wheel in a shopping mall, chibi style, bright colors'),
    ('smartphone_cracked', '碎屏手机', 'A smartphone with a shattered cracked screen, chibi style, spark damage effect'),
    ('earphones_shared', '共享耳机', 'A pair of earphones with split cable showing two earbuds, chibi style'),
    ('rose_flower', '玫瑰', 'A single beautiful red rose glowing in golden sunlight, chibi illustration'),
    ('picnic_set', '野餐套装', 'A picnic blanket on grass with sandwiches and fruits, chibi food illustration'),
    ('ferris_wheel', '摩天轮', 'A giant Ferris wheel against a golden sunset sky, chibi amusement park style'),
    ('vintage_camera', '复古照相机', 'An old vintage film camera, chibi retro style, warm nostalgia colors'),
    ('dart_board', '飞镖靶', 'A colorful dartboard with darts stuck in it, chibi arcade game style'),
    ('flying_hat', '飞走的帽子', 'A cute hat flying in the wind with motion lines, chibi style'),
    ('microphone_ktv', 'KTV麦克风', 'A handheld microphone in neon purple lighting, chibi style'),
    ('street_guitar', '街头吉他', 'An acoustic guitar under a warm street lamp, night atmosphere, chibi style'),
    ('sunset_sky', '夕阳天空', 'A breathtaking sunset landscape with orange-gold sky, chibi romantic style'),
    ('hotel_night', '夜间酒店', 'A warmly lit hotel entrance at night with street lamps, chibi style'),
    ('helmet', '摩托车头盔', 'A cute motorcycle helmet with visor, chibi gear style'),
    ('wallet', '钱包', 'A small cute wallet with coins, chibi accessory style'),
    ('movie_poster', '电影海报', 'A romantic movie poster in a cinema lobby, chibi style'),
    ('milk_tea', '奶茶', 'A cup of bubble milk tea with tapioca pearls, cute chibi food illustration'),
    ('dessert_cake', '甜品蛋糕', 'A slice of strawberry shortcake on a plate, chibi food illustration'),
    ('clear_umbrella', '透明雨伞', 'A clear dome umbrella in the rain with water droplets, chibi rain scene'),
    ('stray_cat_wet', '淋湿的流浪猫', 'A cute soaking wet stray kitten in the rain, chibi animal style'),
    ('bbq_grill', '烤肉炉', 'A Korean BBQ grill with meat sizzling, chibi food illustration'),
    ('rainbow', '彩虹', 'A bright rainbow after rain over a city skyline, chibi romantic style'),
    ('typhoon_alert', '台风预警', 'Phone screen showing a red typhoon warning alert, chibi style'),
    ('candle_flame', '蜡烛火焰', 'A single candle flame in the dark, warm flickering light, chibi mood'),
    ('snowman', '雪人', 'A cute chibi snowman with carrot nose and scarf, snowy background'),
    ('scarf_knit', '针织围巾', 'A cozy knitted scarf in soft warm colors, chibi accessory style'),
    ('roasted_potato', '烤红薯', 'A steaming hot roasted sweet potato split open, chibi winter food'),
    ('subway_train', '地铁列车', 'A subway train arriving at a station platform, chibi urban scene'),
    ('ancient_building', '古建筑', 'A traditional Chinese ancient building in soft fog, chibi atmospheric style'),
    ('coffee_cup', '咖啡杯', 'A steaming cup of coffee in a cozy cafe, chibi warm illustration'),
    ('bread_display', '面包陈列', 'A bakery shop window filled with fresh bread and pastries, chibi food style'),
    ('pin_board', '拼豆板', 'A colorful bead art pin board with cute patterns, chibi craft style'),
    ('book_stack', '书堆', 'A stack of books with a warm reading lamp, chibi cozy illustration'),
    ('park_bench', '公园长椅', 'A park bench under a tree with soft light, chibi nature style'),
    ('donation_box', '爱心捐款箱', 'A red charity donation box with a heart symbol, chibi warm style'),
    ('ice_skates', '溜冰鞋', 'A pair of cute ice skates on a frozen surface, chibi winter style'),
    ('steamed_window', '起雾的窗户', 'A window covered in soft frost and steam, chibi winter morning style'),
]

lines_obj = []
lines_obj.append('# 物件图生成任务包')
lines_obj.append('')
lines_obj.append('> 所有剧情中出现的物品/场景元素的独立Q版图标')
lines_obj.append('> 画风：日系动漫Q版，与事件插画风格统一')
lines_obj.append('> 尺寸：512x512')
lines_obj.append(f'> 输出目录：{os.path.join(ROOT, "assets", "objects")}')
lines_obj.append(f'> 总物件数：{len(objects)}')
lines_obj.append('')
lines_obj.append('## 执行方法')
lines_obj.append('')
lines_obj.append('逐个物件调用 ImageGen，无需参考图（物件图不涉及女友形象）：')
lines_obj.append('')
lines_obj.append('### 固定参数')
lines_obj.append('- quality: "high"')
lines_obj.append('- size: "512x512"')
lines_obj.append('- 输出命名: <object_id>.png')
lines_obj.append('')
lines_obj.append('---')
lines_obj.append('')

out_objects_dir = os.path.join(ROOT, 'assets', 'objects')

for i, (oid, oname, oprompt) in enumerate(objects):
    lines_obj.append(f'## {i+1}. {oname}')
    lines_obj.append('')
    lines_obj.append('```text')
    lines_obj.append(f'ImageGen(')
    lines_obj.append(f'  quality = "high",')
    lines_obj.append(f'  size = "512x512",')
    lines_obj.append(f'  output_dir = "{out_objects_dir}",')
    lines_obj.append(f'  prompt = "Cute chibi Q-version anime illustration of {oname}. {oprompt}. No text, no watermark."')
    lines_obj.append(f')')
    lines_obj.append(f'保存为：{oid}.png')
    lines_obj.append('')

fpath_obj = os.path.join(PKG_DIR, 'task_objects.md')
with open(fpath_obj, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines_obj))
print(f'Objects: {len(objects)} items -> {os.path.basename(fpath_obj)}')

total = sum(len(W[k]['events']) for k in ref_map)
print(f'\n=== ALL DONE ===')
print(f'Events across 6 weather packs: {total}')
print(f'Objects: {len(objects)}')
print(f'Grand total tasks: {total + len(objects)}')
