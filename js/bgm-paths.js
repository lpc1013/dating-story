// BGM 路径配置 — 集中管理，改曲只改这里
var BGM_PATHS = {
    defaults: {
        'start':     'video/纯音乐/moerzhuangyuan/爱心广场（摩尔城堡）（淘淘乐街）.mp3',
        'dating':    'video/纯音乐/moerzhuangyuan/米勒大道（露天剧场）.mp3',
        'night':     'video/纯音乐/luokewangguo/轮回黑洞.mp3',
        'ending':    'video/纯音乐/moerzhuangyuan/誓言小屋.mp3',
        'bad-end':   'video/纯音乐/luokewangguo/冷月仓库.mp3',
        'mood-end':  'video/纯音乐/moerzhuangyuan/遗忘田园.mp3',
        'album':     'video/纯音乐/moerzhuangyuan/蛋屋场景.mp3',
        'journal':   'video/纯音乐/moerzhuangyuan/摩乐乐家.mp3'
    },
    stings: {
        'achievement': 'video/纯音乐/moerzhuangyuan/神秘花海.mp3',
        'peak':        'video/纯音乐/luokewangguo/凯旋门.mp3'
    },
    // 场景→播放后搜索的关键词（优先从 playlist 动态匹配，其次用 defaults）
    sceneKeywords: {
        'start':    ['草','花','爱'],
        'dating':   null, // 由天气关键词动态决定
        'night':    ['星','夜','晚','暗'],
        'ending':   ['爱','暖','甜','星'],
        'bad-end':  ['冷','暗','寂','默'],
        'mood-end': ['冷','暗','寂','默']
    },
    // 天气→曲风关键词
    weatherKeywords: {
        '晴天': ['阳','草','花','光','晴'],
        '多云': ['云','林','街','道','园'],
        '雨天': ['雨','湖','海','落','泣'],
        '雪天': ['雪','冰','冬','寒','冷']
    }
};
