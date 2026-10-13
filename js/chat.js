// js/chat.js — 从 achievements.js 拆分（功能：聊天系统）

// E-7：头像 <img> 补 alt 用。联系人名里可能带 emoji/引号，
// 拼进 alt="" 前统一转义，避免重蹈 E-6（事件名含半角引号提前闭合属性）的覆辙。
function altName(name) {
    return String(name == null ? '联系人' : name)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

var contacts = [
            { id: 'girlfriend', name: '我的女孩 💖', avatar: '👧', avatarImg: 'assets/characters/gf_sunny.png', status: '在线', lastMsg: '晚安，梦里见！', unread: false },
            { id: 'roommate', name: '她的室友-小雅', avatar: '👩', avatarImg: 'https://picsum.photos/seed/xiaoya_love/100/100', status: '离线', lastMsg: '她今天心情好像不错。', unread: false },
            { id: 'parents', name: '岳母大人(预备)', avatar: '👵', avatarImg: 'https://picsum.photos/seed/mother_in_law/100/100', status: '在线', lastMsg: '什么时候和她一起来吃个饭？', unread: false },
            { id: 'friend', name: '死党-阿强', avatar: '👦', avatarImg: 'https://picsum.photos/seed/bro_qiang/100/100', status: '在线', lastMsg: '兄弟，约会进展如何？', unread: false },
            { id: 'mom', name: '亲爱的老妈 ❤️', avatar: '👩‍🍳', avatarImg: 'https://picsum.photos/seed/my_mama/100/100', status: '在线', lastMsg: '记得按时吃饭啊。', unread: true },
            { id: 'ai_assistant', name: 'AI小助手 🤖', avatar: '🤖', avatarImg: '', status: '在线', lastMsg: '有什么可以帮您的吗？', unread: true }
        ];

function updateGfAvatar() {
            if (window.ASSET_MAP && window.ASSET_MAP.gf && selectData && selectData.variantKey) {
                const img = ASSET_MAP.gf[selectData.variantKey];
                if (img) contacts[0].avatarImg = img;
            }
            // 兜底：遍历 cnToSubs 子键
            if ((!contacts[0].avatarImg || contacts[0].avatarImg === 'assets/characters/gf_sunny.png')
                && window.ASSET_MAP && window.ASSET_MAP.cnToSubs && selectData && selectData.weather) {
                const subs = ASSET_MAP.cnToSubs[selectData.weather];
                if (subs) {
                    for (const sub of subs) {
                        if (ASSET_MAP.gf && ASSET_MAP.gf[sub]) {
                            contacts[0].avatarImg = ASSET_MAP.gf[sub];
                            break;
                        }
                    }
                }
            }
        }

var currentContactId = null;

var currentChatNodeId = null;

var chatData = {
            // 女友 - 晴天
            'girlfriend_晴天_start': {
                messages: ["今天太阳真好呀，感觉心情都变亮了！☀️", "你觉得这种天气最适合做什么？"],
                options: [
                    { text: "最适合和你一起在草坪上野餐。", next: 'gf_sunny_picnic' },
                    { text: "适合去拍好看的照片，你今天特别美。", next: 'gf_sunny_photo' },
                    { text: "想和你一起去海边吹吹风。", next: 'gf_sunny_beach' },
                    { text: "不如我们去逛逛公园？", next: 'gf_sunny_park' },
                    { text: "肚子饿了，想带你去吃好吃的。", next: 'gf_sunny_lunch' }
                ]
            },
            'gf_sunny_lunch': {
                expression: '😋 馋猫',
                messages: ["好呀！我想吃那家新开的日料，听说三文鱼特别新鲜。🍣", "不过...你会不会觉得太贵了？"],
                options: [
                    { text: "只要你喜欢，多少钱都值得。", next: 'gf_sunny_lunch_2' },
                    { text: "确实有点贵，咱们换一家？", next: 'gf_sunny_lunch_3' }
                ]
            },
            'gf_sunny_lunch_2': {
                expression: '🥰 幸福',
                messages: ["你对我真好！那我一定要多吃一点。😋", "等下吃完我们去散散步消消食吧。"],
                options: [{ text: "好，都听你的。", next: 'gf_end' }],
                onEnter: () => {
                    commitStats({ money: -20 });
                    commitStats({ like: 5 });
                    gameState.mood = 'happy';
                    updateStats();
                }
            },
            'gf_sunny_lunch_3': {
                expression: '😐 乖巧',
                messages: ["好吧，听你的。那我们去吃那家拉面吧，也挺好吃的。", "只要和你在一起，吃什么都行。"],
                options: [{ text: "真懂事，下次一定带你去吃日料。", next: 'gf_end' }],
                onEnter: () => {
                    commitStats({ money: -10 });
                    commitStats({ like: 1 });
                    gameState.mood = 'normal';
                    updateStats();
                }
            },
            'gf_sunny_beach': {
                messages: ["海边吗？听起来好浪漫！🌊", "我们可以一起踩水，然后看日落。"],
                options: [{ text: "那就这么说定了！", next: 'close' }],
                onEnter: () => {
                    commitStats({ like: 2 });
                    updateStats();
                    unlockPhoto('sunny_beach');
                }
            },
            'gf_sunny_park': {
                messages: ["公园也不错，可以看看花。🌷", "不过你要帮我拍好看的照片哦！"],
                options: [{ text: "没问题，我是专业摄影师。", next: 'close' }],
                onEnter: () => {
                    commitStats({ heart: 1 });
                    updateStats();
                    // 原为 park_date（相册无此 id 的幽灵解锁），实为相册中「晴日公园」sunny_park
                    unlockPhoto('sunny_park');
                }
            },
            'gf_sunny_picnic': {
                expression: '🥰 开心',
                messages: ["好主意！我带上我最爱的草莓，你带上吉他好不好？", "那种悠闲的感觉最棒了。"],
                options: [{ text: "没问题，只要你喜欢。", next: 'gf_sunny_picnic_2' }],
                onEnter: () => {
                    if (!gameState.claimedRewards.includes('sunny_picnic_reward')) {
                        commitStats({ like: 2 });
                        commitStats({ heart: 1 });
                        gameState.claimedRewards.push('sunny_picnic_reward');
                        updateStats();
                        showToast("获得初次野餐奖励！💖", 'reward');
                    }
                }
            },
            'gf_sunny_picnic_2': {
                expression: '😳 害羞',
                messages: ["对了，其实我一直想告诉你...", "能在这么好的天气遇到你，是我最幸运的事。"],
                options: [{ text: "我也是，傻瓜。", next: 'gf_end' }],
                onEnter: () => {
                    unlockPhoto('sunny_park');
                }
            },
            'gf_sunny_prank': {
                expression: '🤡 调皮',
                messages: ["嘿嘿，刚才捏你那下疼不疼呀？", "看你傻乎乎的样子真可爱！"],
                options: [
                    { text: "好啊你，竟然敢偷袭我！", next: 'gf_sunny_prank_2' },
                    { text: "只要你开心，捏多少下都行。", next: 'gf_sunny_prank_3' }
                ]
            },
            'gf_sunny_prank_2': {
                expression: '😝 鬼脸',
                messages: ["略略略，抓不到我吧！", "谁让你刚才发呆的，这是给你的小惩罚。"],
                options: [{ text: "看我怎么收拾你！", next: 'gf_end' }]
            },
            'gf_sunny_prank_3': {
                expression: '🥰 甜蜜',
                messages: ["哼，算你识相！", "不过...你刚才认真的样子，其实还挺帅的。"],
                options: [{ text: "那当然，也不看是谁男朋友。", next: 'gf_end' }]
            },
            'gf_sunny_photo': {
                expression: '😏 得意',
                messages: ["嘻嘻，算你会说话！", "其实我最近在学怎么摆拍，下次你当我的专属摄影师哦。"],
                options: [{ text: "那是我的荣幸。", next: 'gf_sunny_photo_2' }]
            },
            'gf_sunny_photo_2': {
                expression: '✨ 期待',
                messages: ["那拉钩！不许拍得太丑哦，不然我会生气的！", "要把我拍得像仙女一样。"],
                options: [{ text: "你在我眼里一直都是仙女。", next: 'gf_end' }],
                onEnter: () => {
                    unlockLoveTip('memories');
                }
            },
            
            // 女友 - 雨天
            'girlfriend_雨天_start': {
                messages: ["窗外在下雨呢，滴滴答答的... 🌧️", "这种天气总让人想窝在沙发里。"],
                options: [
                    { text: "想和你一起看部老电影。", next: 'gf_rainy_movie' },
                    { text: "雨天其实很浪漫，想和你共撑一把伞。", next: 'gf_rainy_romantic' },
                    { text: "下雨天睡觉最舒服了，你困不困？", next: 'gf_rainy_sleep' }
                ]
            },
            'gf_rainy_sleep': {
                expression: '😴 困倦',
                messages: ["唔... 确实有点困。听着雨声感觉整个人都软绵绵的。", "如果你能陪我一起睡个午觉就好了。"],
                options: [
                    { text: "好啊，我帮你盖好被子。", next: 'gf_rainy_sleep_2' },
                    { text: "不行哦，白天睡多了晚上会失眠的。", next: 'gf_rainy_sleep_3' }
                ]
            },
            'gf_rainy_sleep_2': {
                expression: '😌 安心',
                messages: ["嘿嘿，你真体贴。那我就眯一小会儿...", "晚安...不对，是午安。"],
                options: [{ text: "午安，好梦。", next: 'gf_end' }],
                onEnter: () => {
                    commitStats({ heart: 3 });
                    gameState.mood = 'happy';
                    updateStats();
                }
            },
            'gf_rainy_sleep_3': {
                expression: '😒 扫兴',
                messages: ["哼，真没情调！", "那我不睡了，你陪我聊天吧。"],
                options: [{ text: "好，你想聊什么？", next: 'gf_rainy_chat' }],
                onEnter: () => {
                    commitStats({ like: -2 });
                    gameState.mood = 'sad';
                    updateStats();
                }
            },
            'gf_rainy_chat': {
                expression: '🤔 好奇',
                messages: ["我想知道...你第一次见到我的时候，是什么感觉？", "要说实话哦！"],
                options: [
                    { text: "感觉像看到了天使。", next: 'gf_rainy_chat_2' },
                    { text: "感觉这个女生挺特别的。", next: 'gf_rainy_chat_3' }
                ]
            },
            'gf_rainy_chat_2': {
                expression: '😳 害羞',
                messages: ["哎呀，你太夸张了啦！哪有那么夸张...", "不过...听你这么说，我还是挺开心的。"],
                options: [{ text: "我说的是真心话。", next: 'gf_end' }],
                onEnter: () => {
                    commitStats({ like: 5 });
                    updateStats();
                }
            },
            'gf_rainy_chat_3': {
                expression: '😏 得意',
                messages: ["特别？是哪种特别？是特别可爱还是特别漂亮？", "快说快说！"],
                options: [{ text: "是特别让我心动。", next: 'gf_end' }],
                onEnter: () => {
                    commitStats({ heart: 5 });
                    updateStats();
                }
            },
            'gf_rainy_movie': {
                expression: '🎬 专注',
                messages: ["好呀，我想看那部《傲慢与偏见》，看多少遍都不腻。", "再准备点爆米花就完美了。"],
                options: [{ text: "听你的，我去准备。", next: 'gf_rainy_movie_2' }],
                onEnter: () => {
                    if (!gameState.claimedRewards.includes('rainy_movie_reward')) {
                        commitStats({ like: 1 });
                        gameState.claimedRewards.push('rainy_movie_reward');
                        updateStats();
                    }
                }
            },
            'gf_rainy_movie_2': {
                expression: '💕 温柔',
                messages: ["其实比起电影，我更喜欢和你待在一起的感觉。", "哪怕什么都不说，也很安心。"],
                options: [{ text: "我也是，只要有你在身边。", next: 'gf_end' }],
                onEnter: () => {
                    unlockPhoto('rainy_window');
                }
            },
            'gf_rainy_romantic': {
                expression: '🌂 浪漫',
                messages: ["虽然会湿了鞋袜，但如果是和你一起，好像也不错。", "不过你要记得把伞往我这边靠一点点哦。"],
                options: [{ text: "我会把你整个人都护在伞下的。", next: 'gf_rainy_romantic_2' }]
            },
            'gf_rainy_romantic_2': {
                expression: '🥺 感动',
                messages: ["笨蛋，那样 you 就会淋湿半边肩膀的...", "我们要一起撑伞，谁都不能淋湿。"],
                options: [{ text: "好，我们一起。", next: 'gf_end' }],
                onEnter: () => {
                    unlockLoveTip('rain_romance');
                }
            },
            'gf_rainy_fear': {
                expression: '😨 害怕',
                messages: ["那个密室逃脱的音效好吓人啊...", "我刚才真的被吓到了，手现在还在抖。"],
                options: [
                    { text: "别怕，我这不是一直牵着你吗？", next: 'gf_rainy_fear_2' },
                    { text: "其实我也挺怕的，咱们快走吧。", next: 'gf_rainy_fear_3' }
                ]
            },
            'gf_rainy_fear_2': {
                expression: '🥺 依赖',
                messages: ["嗯...你的手好暖和。", "有你在身边，感觉好像没那么可怕了。"],
                options: [{ text: "我会一直保护你的。", next: 'gf_end' }]
            },
            'gf_rainy_fear_3': {
                expression: '🤝 共鸣',
                messages: ["原来你也怕呀！那我们快跑！", "这种地方以后再也不来了。"],
                options: [{ text: "好，听你的。", next: 'gf_end' }]
            },
            'gf_rain_ghost': {
                expression: '😨 害怕',
                messages: ["刚才那个雷声好响... 吓死我了。", "你能不能...别离开我太远？"],
                options: [
                    { text: "别怕，我一直牵着你的手呢。", next: 'gf_rain_ghost_2' },
                    { text: "只是打雷而已，没事的。", next: 'gf_rain_ghost_3' }
                ]
            },
            'gf_rain_ghost_2': {
                expression: '🥺 依赖',
                messages: ["嗯... 你的手好暖和。", "感觉没那么害怕了。"],
                options: [{ text: "我会一直保护你的。", next: 'gf_end' }],
                onEnter: () => {
                    unlockLoveTip('fear_ghosts');
                }
            },
            'gf_rain_ghost_3': {
                expression: '😒 傲娇',
                messages: ["哼，直男！", "一点都不知道安慰人家。"],
                options: [{ text: "好啦好啦，我错了。", next: 'gf_end' }]
            },

            // 女友 - 雪天
            'girlfriend_雪天_start': {
                messages: ["哇！外面下雪了！快看快看！❄️", "好想去雪地里踩脚印啊。"],
                options: [
                    { text: "走，带你去堆个大雪人！", next: 'gf_snow_snowman' },
                    { text: "外面太冷了，我帮你暖暖手吧。", next: 'gf_snow_warm' }
                ]
            },
            'gf_snow_snowman': {
                expression: '⛄ 兴奋',
                messages: ["我要给雪人戴上你的围巾！", "还要用胡萝卜当鼻子。"],
                options: [{ text: "哈哈，好，都听你的。", next: 'gf_snow_snowman_2' }]
            },
            'gf_snow_snowman_2': {
                expression: '📸 记录',
                messages: ["然后我们要拍张合照，发到朋友圈炫耀一下！", "让大家都看看我们的杰作。"],
                options: [{ text: "没问题，听你的。", next: 'gf_end' }]
            },
            'gf_snow_warm': {
                expression: '🧣 温暖',
                messages: ["唔... 你的手好暖和呀。", "其实比起雪，我更喜欢这种被你照顾的感觉。"],
                options: [{ text: "我会一直照顾你的。", next: 'gf_snow_warm_2' }],
                onEnter: () => {
                    showToast("获得提示：雪天她最需要的是实实在在的温暖", 'hint');
                    unlockLoveTip('warmth_snow');
                }
            },
            'gf_snow_warm_2': {
                expression: '💍 约定',
                messages: ["那... 以后每年的初雪，你都要陪在我身边哦。", "不许反悔！"],
                options: [{ text: "拉钩，一定陪你。", next: 'gf_end' }]
            },
            'gf_snow_doubt': {
                expression: '😔 难过',
                messages: ["我刚才是不是很笨...连猫粮都撒了。", "我总觉得自己什么都做不好。"],
                options: [
                    { text: "傻瓜，那只是个意外，猫咪们很开心的。", next: 'gf_snow_doubt_2' },
                    { text: "别想这些了，咱们去吃点热乎的吧。", next: 'gf_snow_doubt_3' }
                ]
            },
            'gf_snow_doubt_2': {
                expression: '🥺 释怀',
                messages: ["真的吗？你不会觉得我太麻烦了吗？", "谢谢你总是这么包容我。"],
                options: [{ text: "因为你是我的宝贝呀。", next: 'gf_end' }],
                onEnter: () => {
                    unlockLoveTip('self_doubt');
                }
            },
            'gf_snow_doubt_3': {
                expression: '😐 顺从',
                messages: ["嗯...好吧。", "听你的，咱们走吧。"],
                options: [{ text: "乖。", next: 'gf_end' }]
            },

            // 女友 - 多云
            'girlfriend_多云_start': {
                messages: ["今天云层好厚，阴沉沉的。☁️", "总觉得会有什么意想不到的事情发生。"],
                options: [
                    { text: "别担心，无论发生什么我都在。", next: 'gf_cloudy_support' },
                    { text: "这种天气最适合去探险了！", next: 'gf_cloudy_adventure' }
                ]
            },
            'gf_cloudy_support': {
                expression: '😌 安心',
                messages: ["嗯，有你在我就安心多了。", "你总是能看穿我的不安。"],
                options: [{ text: "因为我一直在关注你啊。", next: 'gf_cloudy_support_2' }]
            },
            'gf_cloudy_support_2': {
                expression: '💗 依恋',
                messages: ["有时候我觉得自己挺麻烦的，又傲娇又敏感...", "谢谢你一直包容我。"],
                options: [{ text: "因为你是我的女孩啊。", next: 'gf_end' }],
                onEnter: () => {
                    unlockLoveTip('independence');
                }
            },
            'gf_cloudy_adventure': {
                expression: '🕵️ 好奇',
                messages: ["探险？去哪里？", "只要不是太奇怪的地方，我都愿意陪你去。"],
                options: [{ text: "去寻找城市里的隐藏角落。", next: 'gf_cloudy_adventure_2' }]
            },
            'gf_cloudy_adventure_2': {
                expression: '🗺️ 期待',
                messages: ["听起来很有趣！那我们要带上相机。", "把那些不为人知的美丽都记录下来。"],
                options: [{ text: "好，出发！", next: 'gf_end' }]
            },

            'gf_conflict_start': {
                expression: '😠 生气',
                messages: ["你刚才在朋友圈给那个女生点赞了？", "我记得你跟我说过你不认识她的。"],
                options: [
                    { text: "那只是个误会，她是我以前的同学。", next: 'gf_conflict_explain' },
                    { text: "你是不是管得太宽了？", next: 'gf_conflict_angry' },
                    { text: "对不起，我以后会注意的。", next: 'gf_conflict_apologize' }
                ]
            },
            'gf_conflict_explain': {
                expression: '🤨 怀疑',
                messages: ["同学？那为什么我从来没听你提起过？", "你是不是还有什么瞒着我？"],
                options: [
                    { text: "真的没有，不信你可以看我手机。", next: 'gf_conflict_trust' },
                    { text: "你爱信不信吧。", next: 'gf_conflict_angry' }
                ]
            },
            'gf_conflict_apologize': {
                expression: '🥺 委屈',
                messages: ["我不是想管你，我只是...我只是害怕失去你。", "你以后能不能多考虑一下我的感受？"],
                options: [{ text: "我会的，我保证。", next: 'gf_end' }],
                onEnter: () => {
                    commitStats({ like: 1 });
                    commitStats({ heart: 2 });
                    gameState.mood = 'normal';
                    unlockPhoto('conflict_resolved');
                    updateStats();
                }
            },
            'gf_conflict_angry': {
                expression: '😭 难过',
                messages: ["你竟然这么跟我说话...", "我不想理你了，再见！"],
                options: [{ text: "喂！等等...", next: 'close' }],
                onEnter: () => {
                    commitStats({ like: -20 });
                    commitStats({ heart: -10 });
                    gameState.mood = 'angry';
                    updateStats();
                }
            },
            'gf_conflict_trust': {
                expression: '😊 释然',
                messages: ["好啦，我相信你就是了。不用看手机啦。", "以后记得要跟我说实话哦。"],
                options: [{ text: "一定会的。", next: 'gf_end' }],
                onEnter: () => {
                    commitStats({ like: 3 });
                    gameState.mood = 'happy';
                    unlockPhoto('conflict_resolved');
                    updateStats();
                }
            },
            'gf_end': {
                expression: '👋 告别',
                messages: ["好啦，先聊到这里吧，我要去忙啦。", "记得想我哦！"],
                options: [{ text: "一定，晚安。", next: 'close' }],
                onEnter: () => {
                    gameState.chatProgress = gameState.chatProgress || {};
                    gameState.chatProgress[`girlfriend_${selectData.weather}`] = true;
                }
            },
            // 妈妈聊天
            'mom_start': {
                messages: ["儿子，最近在外面怎么样？钱够花吗？", "看你朋友圈好像在约会？"],
                options: [
                    { text: "挺好的，妈你别担心。", next: 'mom_good' },
                    { text: "嘿嘿，被您发现了，确实在约会。", next: 'mom_date' }
                ]
            },
            'mom_good': {
                messages: ["那就好，出门在外别太省，该花的就花。", "妈给你转点零花钱，去买点好吃的。"],
                options: [{ text: "谢谢妈！", next: 'mom_money' }]
            },
            'mom_date': {
                messages: ["哟，是哪家姑娘啊？什么时候带回来给妈看看？", "约会可不能小气，妈支持你一点。"],
                options: [{ text: "妈您真好！", next: 'mom_money' }]
            },
            'mom_money': {
                messages: ["[微信转账] 您收到了一笔转账"],
                options: [{ text: "收下转账", next: 'mom_end' }],
                onEnter: () => {
                    if (!gameState.momMoneyTriggered) {
                        const base = 10 + Math.round(gameState.like * 0.3 + gameState.heart * 0.2);
                        const amount = Math.max(5, base + Math.floor(Math.random() * 6));
                        gameState.money += amount;
                        gameState.momMoneyTriggered = true;
                        showToast(`💰 收到妈妈的红包：${amount}元`, 'reward');
                        updateStats();
                    } else {
                        showToast("💡 妈妈说：省着点花，下次再给你。", 'hint');
                    }
                    unlockLoveTip('mom_love');
                    unlockLoveTip('timing');
                    unlockLoveTip('listening');
                    unlockLoveTip('childhood_filter');
                }
            },
            'mom_end': {
                messages: ["好了，妈去跳广场舞了，你忙你的吧。", "加油哦！"],
                options: [{ text: "妈再见！", next: 'close' }]
            },

            // AI小助手聊天
            'ai_assistant_start': {
                onEnter: () => {
                    // 20% 概率自动触发天气变化建议
                    if (Math.random() < 0.2 && !gameState.aiWeatherTriggered) {
                        setTimeout(() => {
                            const msgContainer = document.getElementById('chat-messages');
                            const div = document.createElement('div');
                            div.className = 'message msg-gf';
                            div.style.color = '#ff6b6b';
                            div.style.fontWeight = 'bold';
                            div.textContent = "⚠️ 检测到当前气象条件可能影响约会体验，建议开启‘气象干预’功能。";
                            msgContainer.appendChild(div);
                            msgContainer.scrollTop = msgContainer.scrollHeight;
                        }, 1500);
                    }
                },
                messages: ["您好，我是您的恋爱AI助手。检测到您正在进行约会任务。", "需要我为您提供一些“特殊”帮助吗？"],
                options: [
                    { text: "分析一下她的性格特点。", next: 'ai_analysis' },
                    { text: "有什么能让她开心的秘密武器？", next: 'ai_gift' },
                    { text: "你还能做些什么？", next: 'ai_help' },
                    { text: "暂时不需要，谢谢。", next: 'close' }
                ]
            },
            'ai_analysis': {
                messages: ["根据大数据分析，您的女朋友是一位典型的‘外刚内柔’型女生。", "她积极烂漫，但内心敏感脆弱，容易陷入自我怀疑。建议多给予肯定和陪伴。"],
                onEnter: () => {
                    unlockLoveTip('ai_wisdom');
                },
                options: [{ text: "受教了，谢谢小助手。", next: 'close' }]
            },
            'ai_help': {
                messages: ["我可以为您优化当前的约会环境，或者提供一些恋爱秘籍。", "此外，我还可以尝试为您“生成”一件随机礼物。", "请选择您需要的干预方式："],
                options: [
                    { text: "优化环境（随机天气变化）", next: 'ai_weather' },
                    { text: "恋爱秘籍（解锁随机词条）", next: 'ai_tips' },
                    { text: "生成礼物（消耗10心动值）", next: 'ai_gift' }
                ]
            },
            'ai_tips': {
                messages: ["正在为您检索‘恋爱秘籍’... 📚", "消耗 15 点心动值，我可以为您解锁一个随机恋爱词条，是否继续？"],
                options: [
                    { text: "确认解锁。", next: 'ai_tips_confirm' },
                    { text: "还是算了吧。", next: 'close' }
                ]
            },
            'ai_tips_confirm': {
                onEnter: () => {
                    if (gameState.heart >= 15) {
                        const lockedTips = loveTipsData.filter(t => !gameState.unlockedTips.includes(t.id));
                        if (lockedTips.length > 0) {
                            commitStats({ heart: -15 });
                            const randomTip = lockedTips[Math.floor(Math.random() * lockedTips.length)];
                            unlockLoveTip(randomTip.id);
                            updateStats();
                        } else {
                            showToast("💡 AI提示：所有词条已解锁。", 'hint');
                        }
                    } else {
                        showToast("❌ 心动值不足", 'warn');
                    }
                },
                messages: ["秘籍已解锁，请在‘恋爱手册’中查看。"],
                options: [{ text: "谢谢小助手。", next: 'close' }]
            },
            'ai_gift': {
                messages: ["正在为您搜索‘心动礼物’... 🔍", "消耗 10 点心动值，我可以为您生成一件随机礼物，是否继续？"],
                options: [
                    { text: "确认生成。", next: 'ai_gift_confirm' },
                    { text: "还是算了吧。", next: 'close' }
                ]
            },
            'ai_gift_confirm': {
                onEnter: () => {
                    if (gameState.aiGiftTriggered) {
                        showToast("💡 AI提示：今日生成额度已用完。", 'hint');
                        return;
                    }
                    if (gameState.heart >= 10) {
                        commitStats({ heart: -10 });
                        const gifts = [
                            { id: 'ai_chocolate', name: 'AI定制巧克力', desc: '由AI精心调配比例的巧克力，甜而不腻。', price: 0, like: 10, heart: 3, icon: '🍫', quote: '每一口都是精算的甜蜜。' },
                            { id: 'ai_flower', name: '永生玫瑰', desc: '永远不会凋谢的玫瑰，象征永恒的爱。', price: 0, like: 15, heart: 5, icon: '🌹', quote: '爱意永不凋零。' }
                        ];
                        const gift = gifts[Math.floor(Math.random() * gifts.length)];
                        addToInventory(gift.name, gift.icon, gift.desc, gift.quote);
                        gameState.aiGiftTriggered = true;
                        updateStats();
                        showToast(`🎁 获得：${gift.name}`, 'reward');
                    } else {
                        showToast("❌ 心动值不足", 'warn');
                    }
                },
                messages: ["礼物已存入您的背包。祝您约会愉快！"],
                options: [{ text: "太棒了！", next: 'close' }]
            },
            'ai_weather': {
                messages: ["正在重新计算气象概率...", "消耗 20 心动值，我将为您扭转乾坤，是否继续？"],
                options: [
                    { text: "确认干预", next: 'ai_weather_confirm' },
                    { text: "还是算了", next: 'close' }
                ]
            },
            'ai_weather_confirm': {
                onEnter: () => {
                    if (gameState.aiWeatherTriggered) {
                        showToast("💡 AI提示：气象干预系统正在冷却中。", 'hint');
                        return;
                    }
                    if (gameState.heart >= 20) {
                        commitStats({ heart: -20 });
                        const weathers = ['晴天', '多云', '雨天', '雪天'].filter(w => w !== selectData.weather);
                        const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
                        
                        selectData.weather = newWeather;
                        gameState.aiWeatherTriggered = true;
                        gameState.weatherBuffs = null; // 重置天气Buff，确保新天气逻辑生效

                        // 关键修复：重新抽取新天气的剧情变体线，否则 gameData[newWeather] 为空，事件不跟随天气变化
                        if (window.StoryLoader && StoryLoader.variants && StoryLoader.variants[newWeather]) {
                            const picked = StoryLoader.pickWeather(newWeather);
                            if (picked) gameData[newWeather] = picked;
                            selectData.variantKey = (window.StoryLoader.getVariantKey) ? StoryLoader.getVariantKey(newWeather) : null;
                        }

                        // 更新UI和效果
                        document.getElementById('weather-icon').textContent =
                            newWeather === '晴天' ? '☀️' :
                            newWeather === '多云' ? '⛅' :
                            newWeather === '雨天' ? '🌧️' : '❄️';

                        const theme = weatherThemes[newWeather] || weatherThemes['晴天'];
                        document.documentElement.style.setProperty('--header-bg', theme.header);
                        // 天气视觉叙事：CSS 变量按天气微调（与开局 game-init.js 一致，避免只换粒子不换底色）
                        const weatherVars = {
                            '晴天': { '--bg-page': 'linear-gradient(135deg, #fff5e6, #fff0e0, #ffe9d0)', '--primary': '#ff8c42' },
                            '多云': { '--bg-page': 'linear-gradient(135deg, #eef0f5, #e8ecf2, #dfe4ed)', '--primary': '#7b8ca0' },
                            '雨天': { '--bg-page': 'linear-gradient(135deg, #e8f0f8, #dce8f4, #cfe0f0)', '--primary': '#5b8cb8' },
                            '雪天': { '--bg-page': 'linear-gradient(135deg, #edf4fa, #e0ecf6, #d4e4f2)', '--primary': '#8ba4c0' }
                        };
                        const wv = weatherVars[newWeather] || weatherVars['晴天'];
                        Object.entries(wv).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
                        document.body.setAttribute('data-weather', newWeather);
                        if (window.updateGfAvatar) updateGfAvatar();
                        initWeatherEffects(newWeather);

                        updateStats();
                        showToast(`🌀 AI干预：天气已变为 ${newWeather}`, 'system');

                        // 扭转乾坤：从新天气线的第一幕重新体验（事件流按天气分线，重置索引避免跨线错位）
                        gameState.currentEvent = 0;
                        showEvent(0);
                    } else {
                        showToast("❌ 心动值不足", 'warn');
                    }
                },
                messages: ["气象干预已完成。请继续您的约会。"],
                options: [{ text: "太神奇了！", next: 'close' }]
            },
            // 室友 - 小雅
            'roommate_start': {
                messages: ["哟，是某人的家属啊？", "想打听点什么情报吗？😏"],
                options: [
                    { text: "她平时在宿舍都喜欢做什么？", next: 'roommate_habit' },
                    { text: "她最近有没有提到过什么想要的？", next: 'roommate_wish' }
                ]
            },
            'roommate_habit': {
                messages: ["她呀，典型的嘴硬心软。", "平时最喜欢收集吉伊小八的周边了，桌子上摆得满满当当的。"],
                options: [{ text: "原来如此，谢了！", next: 'roommate_end' }],
                onEnter: () => {
                    showToast("获得情报：她对吉伊小八毫无抵抗力", 'hint');
                    unlockLoveTip('details');
                    unlockLoveTip('observation');
                }
            },
            'roommate_wish': {
                messages: ["她前几天盯着那个定制礼物的广告看了好久。", "虽然嘴上说浪费钱，但眼神可骗不了人。"],
                options: [
                    { text: "懂了，这就去安排。", next: 'roommate_end' },
                    { text: "她还喜欢别的吗？", next: 'roommate_more' }
                ],
                onEnter: () => {
                    showToast("获得情报：她其实非常渴望收到一份定制礼物", 'hint');
                }
            },
            'roommate_more': {
                messages: ["她呀，其实特别怕黑，也怕鬼。", "上次宿舍停电，她吓得钻进我被子里不肯出来，哈哈！"],
                options: [{ text: "哈哈，真可爱。", next: 'roommate_end' }],
                onEnter: () => {
                    unlockLoveTip('fear_ghosts');
                }
            },
            'roommate_end': {
                messages: ["好啦，我得去洗衣服了。", "记得对她好点，不然我们宿舍姐妹可不答应！"],
                options: [{ text: "放心吧，一定。", next: 'close' }],
                onEnter: () => {
                    gameState.chatProgress = gameState.chatProgress || {};
                    gameState.chatProgress['roommate'] = true;
                }
            },

            // 父母 (母亲)
            'parents_start': {
                messages: ["是小张啊，最近和我们家姑娘还好吗？", "她这孩子从小就倔，你多担待。"],
                options: [
                    { text: "阿姨放心，我会照顾好她的。", next: 'parents_promise' },
                    { text: "阿姨，她最近总是提到您呢。", next: 'parents_flatter' }
                ]
            },
            'parents_promise': {
                messages: ["那就好。其实阿姨今天找你，是想问问...", "你们打算什么时候回来一趟呀？"],
                options: [
                    { text: "等这阵子忙完，一定带她回家看您。", next: 'parents_home_soon' },
                    { text: "我也正想问她呢，看她什么时候有空。", next: 'parents_home_ask' }
                ]
            },
            'parents_flatter': {
                messages: ["哎哟，这孩子，在外面就知道说好听的。", "不过听你这么说，阿姨心里也踏实。"],
                options: [{ text: "是真的，她很惦记家里。", next: 'parents_promise' }]
            },
            'parents_home_soon': {
                messages: ["好，好！阿姨给你们准备好吃的。", "她最爱吃我做的红烧肉了，到时候我多买点新鲜的。"],
                options: [{ text: "那太好了，她肯定很高兴。", next: 'parents_end' }],
                onEnter: () => {
                    unlockLoveTip('timing');
                    unlockLoveTip('childhood_filter');
                }
            },
            'parents_home_ask': {
                messages: ["行，你多催催她。这孩子一忙起来就没个准。", "阿姨也没别的意思，就是想你们了。"],
                options: [
                    { text: "我明白的，阿姨。", next: 'parents_end' },
                    { text: "阿姨，她小时候也这么倔吗？", next: 'parents_childhood' }
                ],
                onEnter: () => {
                    unlockLoveTip('listening');
                }
            },
            'parents_childhood': {
                messages: ["那可不！记得她五岁那年，非要自己去买糖，结果迷路了也不哭。", "最后还是警察叔叔把她送回来的，她还一脸骄傲地说自己认识路呢。"],
                options: [{ text: "哈哈，真像是她能干出来的事。", next: 'parents_end' }],
                onEnter: () => {
                    unlockLoveTip('childhood_filter');
                }
            },
            'parents_end': {
                messages: ["那先这样，你们在外面注意身体。", "有空常联系。"],
                options: [{ text: "好的，阿姨再见。", next: 'close' }],
                onEnter: () => {
                    gameState.chatProgress = gameState.chatProgress || {};
                    gameState.chatProgress['parents'] = true;
                }
            },

            // 死党
            'friend_start': {
                messages: ["兄弟，约会怎么样了？", "有没有被她的黑色美甲迷住？哈哈！"],
                options: [
                    { text: "女友为什么这么喜欢美甲？", next: 'friend_nail' },
                    { text: "女生对约会环境有什么讲究吗？", next: 'friend_place' }
                ]
            },
            'friend_nail': {
                messages: ["这你就不懂了吧，那是她的个性标签。", "她觉得黑色代表独立和神秘，其实是想掩饰内心的敏感。"],
                options: [
                    { text: "深刻，太深刻了。", next: 'friend_end' },
                    { text: "她还有什么别的‘秘密’吗？", next: 'friend_secret' }
                ]
            },
            'friend_secret': {
                messages: ["按照我的经验啊，像这种女生其实特别容易内耗，做不到的事情会自责很久。", "哪怕不是她的错，她也会觉得是自己没做好。这时候你一定要多夸夸她！"],
                options: [{ text: "受教了，兄弟！", next: 'friend_end' }],
                onEnter: () => {
                    unlockLoveTip('self_doubt');
                }
            },
            'friend_place': {
                messages: ["她最讨厌吵闹的地方了。", "地铁挤的时候她心情会很差，如果能带她去安静浪漫的地方，她会瞬间变温柔。"],
                options: [{ text: "好兄弟，够意思！", next: 'friend_end' }],
                onEnter: () => {
                    showToast("获得情报：安静浪漫的环境能平复她的情绪", 'hint');
                    unlockLoveTip('quiet_romance');
                    unlockLoveTip('intimacy');
                }
            },

            'friend_end': {
                messages: ["行了，我开黑去了。", "祝你早日拿下！"],
                options: [{ text: "谢了，回聊。", next: 'close' }],
                onEnter: () => {
                    gameState.chatProgress = gameState.chatProgress || {};
                    gameState.chatProgress['friend'] = true;
                }
            }
        };

function showChat() {
            updateContactStatuses();
            document.getElementById('chat-modal').classList.add('show');
            showContactList();
        }

function showContactList() {
            document.getElementById('chat-contact-view').style.display = 'flex';
            document.getElementById('chat-message-view').style.display = 'none';
            document.getElementById('browser-view').style.display = 'none';
            renderContactList();
        }

var browserHistory = [
            {
                id: 'tips_1',
                title: '第一次约会聊什么？',
                url: 'https://love.tips/first-date-topics',
                pageTitle: '初次约会话题指南',
                answer: '1. 兴趣爱好（电影、音乐、旅行）；2. 童年趣事；3. 宠物话题；4. 赞美对方的细节。',
                comments: [
                    { user: '深情小王子', text: '赞美细节真的很重要，比如她的耳环。' },
                    { user: '孤独的狼', text: '我上次聊了半小时代码，然后就没有然后了...' },
                    { user: '猫咪控', text: '聊宠物绝对不会冷场！' },
                    { user: '路人甲', text: '收藏了，下次试试。' }
                ]
            },
            {
                id: 'tips_2',
                title: '如何判断她是否对你有好感？',
                url: 'https://love.tips/is-she-into-you',
                pageTitle: '好感度判断手册',
                answer: '1. 眼神交流频繁；2. 主动分享生活；3. 对你的笑话很有反应；4. 身体语言倾向于你。',
                comments: [
                    { user: '恋爱脑本脑', text: '她对我笑了一下，我连孩子名字都想好了。' },
                    { user: '人间清醒', text: '别自我感动，有时候只是礼貌。' },
                    { user: '细节控', text: '看她会不会主动找话题。' },
                    { user: '隔壁老王', text: '眼神是骗不了人的。' }
                ]
            },
            {
                id: 'tips_3',
                title: '送礼不踩雷指南',
                url: 'https://love.tips/gift-guide',
                pageTitle: '送礼不踩雷指南',
                answer: '1. 观察她的日常喜好（如喜欢的动漫、颜色）；2. 实用与美观并重；3. 定制类礼物（体现用心）；4. 亲手写的信或卡片。',
                comments: [
                    { user: '礼物收割机', text: '其实心意最重要，哪怕是一张手写的卡片。' },
                    { user: '避雷针', text: '千万别送那种“感动哭了”的廉价礼盒，真的会谢。' },
                    { user: '手工达人', text: '亲手做的东西永远是yyds！' },
                    { user: '直男救星', text: '定制巧克力和永生玫瑰都不错。' }
                ]
            },
            {
                id: 'tips_4',
                title: '约会遇到下雨怎么办？',
                url: 'https://love.tips/rainy-day-date',
                pageTitle: '雨天约会浪漫方案',
                answer: '1. 室内私人影院；2. 陶艺或绘画DIY；3. 撑一把伞漫步（注意别让她淋湿）；4. 找一家安静的咖啡馆。',
                comments: [
                    { user: '雨中曲', text: '雨天撑伞真的很浪漫，前提是伞要够大。' },
                    { user: '宅家党', text: '下雨就该在家睡觉。' },
                    { user: '文艺青年', text: '咖啡馆的窗边位是绝佳。' },
                    { user: '湿哒哒', text: '鞋子湿了真的很烦。' }
                ]
            },
            {
                id: 'tips_5',
                title: '约会穿搭建议',
                url: 'https://love.tips/date-outfit',
                pageTitle: '约会穿搭指南',
                answer: '1. 根据约会地点选择风格；2. 细节处的点缀（如配饰）；3. 干净整洁是第一准则；4. 夸奖对方的穿搭是加分项。',
                onEnter: () => {
                    unlockLoveTip('outfit_style');
                },
                comments: [
                    { user: '时尚达人', text: '其实自信才是最好的穿搭。' },
                    { user: '配饰控', text: '一个精致的耳环能提升整体气质。' },
                    { user: '直男救星', text: '千万别穿格子衬衫配拖鞋！' },
                    { user: '穿搭博主', text: '夸她今天很漂亮，永远不会错。' }
                ]
            }
        ];

function showBrowser() {
            document.getElementById('chat-contact-view').style.display = 'none';
            document.getElementById('chat-message-view').style.display = 'none';
            document.getElementById('browser-view').style.display = 'flex';
            renderBrowserHistory();
        }

function renderBrowserHistory() {
            const content = document.getElementById('browser-content');
            const weather = selectData.weather || '晴天';
            const queries = {'晴天':'约会穿搭建议','雨天':'约会遇到下雨怎么办','雪天':'约会遇到下雨怎么办','多云':'第一次约会聊什么'};
            const query = queries[weather] || '送礼不踩雷指南';
            document.getElementById('browser-address').textContent = 'https://www.google.com/search?q=' + encodeURIComponent(query);
            // 按当前天气/状态排序：天气匹配排最前，低好感排判断篇，其余按原标题
            const sorted = [...browserHistory].sort((a,b) => {
                const scoreA = (a.title.includes(weather) ? 100 : 0) + (gameState.like < 30 && a.id === 'tips_2' ? 50 : 0);
                const scoreB = (b.title.includes(weather) ? 100 : 0) + (gameState.like < 30 && b.id === 'tips_2' ? 50 : 0);
                return scoreB - scoreA;
            });
            content.innerHTML = `
                <div style="font-size: 12px; color: #999; margin-bottom: 10px;">智能推荐 · 搜索：${query}</div>
                ${sorted.map(item => `
                    <div class="browser-history-item" onclick="showBrowserPage('${item.id}')">
                        <div class="browser-history-title">${item.title}</div>
                        <div class="browser-history-url">${item.url}</div>
                    </div>
                `).join('')}
            `;
        }

function showBrowserPage(id) {
            const item = browserHistory.find(h => h.id === id);
            if (!item) return;

            if (item.onEnter) item.onEnter();
            clampGameStats(); // 钳制浏览页奖励越界（好感/心动锁在 0–100，并修复 NaN）

            document.getElementById('browser-address').textContent = item.url;
            const content = document.getElementById('browser-content');
            content.innerHTML = `
                <div class="browser-page active">
                    <div class="browser-page-title">${item.pageTitle}</div>
                    <div class="browser-page-answer">${item.answer}</div>
                    <div class="browser-comments">
                        <div class="browser-comments-title">网友留言 (${item.comments.length})</div>
                        ${item.comments.map(c => `
                            <div class="browser-comment">
                                <span class="browser-comment-user">${c.user}:</span>
                                <span class="browser-comment-text">${c.text}</span>
                            </div>
                        `).join('')}
                    </div>
                    <button class="chat-opt-btn" style="width: 100%; margin-top: 20px;" onclick="renderBrowserHistory()">返回搜索结果</button>
                </div>
            `;
        }

function renderContactList() {
            const list = document.getElementById('contact-list');
            list.innerHTML = '';
            // 过滤：女友约会中不显示（你们在一起）
            const visibleContacts = contacts.filter(c => {
                if (c.id === 'girlfriend' && typeof gameState !== 'undefined' && gameState.currentEvent != null) return false;
                return true;
            });
            // 如果女友隐藏了，在列表顶部加一行提示
            if (visibleContacts.length < contacts.length) {
                const hint = document.createElement('div');
                hint.style.cssText = 'text-align:center;font-size:11px;color:var(--text-muted);padding:8px 0;border-bottom:1px dashed var(--border-light);margin-bottom:8px;';
                hint.textContent = '💕 她就在你身边，不需要发消息';
                list.appendChild(hint);
            }
            visibleContacts.forEach(c => {
                const item = document.createElement('div');
                item.className = 'contact-item';
                item.onclick = () => { if (c.status === '离线') { showToast('💤 ' + c.name + ' 当前离线', 'warn'); return; } startChat(c); };
                const statusColor = c.status === '在线' ? '#4caf50' : c.status === '离线' ? '#999' : '#ff9800';
                item.innerHTML = `
                    <div class="contact-avatar" style="position:relative">${c.avatarImg ? '<img src="'+c.avatarImg+'" alt="'+altName(c.name)+'头像" onerror="this.outerHTML=\''+(c.avatar||'👤')+'\'">' : c.avatar}${c.unread ? '<span class="contact-unread"></span>' : ''}</div>
                    <div class="contact-info">
                        <div class="contact-name">${c.name}</div>
                        <div class="contact-last-msg">${c.lastMsg}</div>
                    </div>
                    <div style="font-size: 10px; color: ${statusColor};">${c.status}</div>
                `;
                list.appendChild(item);
            });
        }

function startChat(contact) {
            gameState.chatProgress = gameState.chatProgress || {};
            gameState.chatHistory = gameState.chatHistory || {};
            
            const chatKey = contact.id === 'girlfriend' ? `girlfriend_${selectData.weather}` : contact.id;
            
            currentContactId = contact.id;
            document.getElementById('chat-contact-view').style.display = 'none';
            document.getElementById('chat-message-view').style.display = 'flex';
            document.getElementById('chat-contact-name').textContent = contact.name;
            document.getElementById('chat-contact-avatar').innerHTML = contact.avatarImg ? '<img src="'+contact.avatarImg+'" alt="'+altName(contact.name)+'头像" onerror="this.outerHTML=\''+(contact.avatar||'👤')+'\'">' : contact.avatar;
            document.getElementById('chat-contact-status').textContent = `● ${contact.status}`;
            document.getElementById('chat-contact-status').style.color = contact.status === '在线' ? '#4caf50' : '#999';
            
            const msgContainer = document.getElementById('chat-messages');
            msgContainer.innerHTML = '';

            // 如果有旧聊天记录，先显示（带分隔线），然后继续新对话
            if (gameState.chatProgress[chatKey] && gameState.chatHistory[chatKey] && gameState.chatHistory[chatKey].length) {
                gameState.chatHistory[chatKey].forEach(msg => {
                    const div = document.createElement('div');
                    div.className = `message ${msg.type === 'gf' ? 'msg-gf' : 'msg-me'}`;
                    div.style.opacity = '0.55';
                    div.textContent = msg.text;
                    msgContainer.appendChild(div);
                });
                const sep = document.createElement('div');
                sep.style.cssText = 'text-align:center;font-size:11px;color:var(--muted);padding:8px 0;margin:4px 0;border-top:1px dashed var(--line);';
                sep.textContent = '—— 上次聊天记录 · 开始新对话 ——';
                msgContainer.appendChild(sep);
                // 清除进度标记，允许重新聊
                delete gameState.chatProgress[chatKey];
            }

            let startNodeId = `${contact.id}_start`;
            if (contact.id === 'girlfriend') {
                // 随机触发冲突剧情 (15% 概率)
                if (Math.random() < 0.15 && !gameState.chatProgress['gf_conflict_start']) {
                    startNodeId = 'gf_conflict_start';
                } else {
                    startNodeId = `girlfriend_${selectData.weather}_start`;
                }
            }
            
            // 清除未读红点
            contact.unread = false;
            
            // 女友聊天：注入最近游戏事件上下文
            if (contact.id === 'girlfriend') {
                const entries = gameState.journalEntries || [];
                const recent = entries.slice(-3);
                if (recent.length > 0) {
                    const refs = recent.filter(e => e.eventName).map(e => e.eventName);
                    const contexts = {
                        '接她出行': '刚才来接我的时候',
                        '摩天轮': '在摩天轮上的那一刻',
                        '奶茶店': '刚刚那杯奶茶',
                        '商场抽奖': '刚刚抽奖的时候',
                        '看电影': '刚刚那部电影',
                        '野餐': '刚刚的野餐',
                        '雨中漫步': '刚才在雨里走着',
                        '雪中偷吻': '刚才在雪里',
                        '街头艺人': '刚才路边的那个艺人',
                        '看夕阳': '刚才的夕阳',
                        '面包店': '刚才那家面包店',
                        '餐厅': '刚才在餐厅里',
                        '海边漫步': '刚才在海边',
                        '拍照': '刚才拍照的时候'
                    };
                    let ctxMsg = null;
                    for (const e of refs) {
                        ctxMsg = contexts[e];
                        if (ctxMsg) break;
                    }
                    // 好感度影响语气
                    let moodHint = '';
                    if (gameState.like >= 70) moodHint = '，心里暖暖的';
                    else if (gameState.like < 30) moodHint = '，不过好像有点心事';
                    if (ctxMsg) {
                        const ctxDiv = document.createElement('div');
                        ctxDiv.className = 'message msg-gf';
                        ctxDiv.style.opacity = '0.6';
                        ctxDiv.style.fontStyle = 'italic';
                        ctxDiv.textContent = ctxMsg + moodHint + '……';
                        document.getElementById('chat-messages').appendChild(ctxDiv);
                    }
                }
            }
            
            loadChatNode(startNodeId);
        }

function hideChat() {
            document.getElementById('chat-modal').classList.remove('show');
        }

function updateContactStatuses() {
            const evt = (typeof gameState !== 'undefined' && gameState.currentEvent != null) ? gameState.currentEvent : -1;
            const total = gameData[selectData.weather] ? gameData[selectData.weather].length : 16;
            const stage = evt < 0 ? 'idle' : evt < 3 ? 'open' : evt < 8 ? 'mid' : evt < 12 ? 'late' : 'finale';
            const like = gameState.like || 0;
            const isNight = gameState.isNight || false;
            
            contacts.forEach(c => {
                switch(c.id) {
                case 'girlfriend':
                    // 约会中：不在列表里（由 renderContactList 过滤）
                    // 但保留微表情供事件中使用
                    c.status = '在你身边';
                    if (like >= 80) c.lastMsg = '她偷瞄了你一眼，嘴角带着藏不住的笑意…';
                    else if (like >= 50) c.lastMsg = '她正专注地和你在一起，偶尔低头摆弄衣角。';
                    else if (like >= 20) c.lastMsg = '她看了看手机，似乎有点心不在焉。';
                    else c.lastMsg = '她皱了下眉头，好像不太开心的样子…';
                    break;
                case 'mom':
                    if (stage === 'open') { c.status = '在线'; c.lastMsg = '出门前记得带伞，别淋着。❤️'; c.unread = true; gameState.momCareCount = (gameState.momCareCount || 0) + 1; }
                    else if (stage === 'late') { c.status = '在线'; c.lastMsg = '约会顺利吗？晚上回不回家吃饭？'; c.unread = true; gameState.momCareCount = (gameState.momCareCount || 0) + 1; }
                    else if (isNight) { c.status = '在线'; c.lastMsg = '这么晚了还没回来，有点担心…'; c.unread = true; gameState.momCareCount = (gameState.momCareCount || 0) + 1; }
                    else { c.status = Math.random() < 0.5 ? '在线' : '离线'; c.lastMsg = '记得按时吃饭。'; }
                    break;
                case 'friend':
                    if (stage === 'mid') { c.status = '在线'; c.lastMsg = '兄弟！她喜欢什么礼物？快告诉我！😏'; c.unread = true; gameState.broTipCount = (gameState.broTipCount || 0) + 1; }
                    else if (like < 40) { c.status = '在线'; c.lastMsg = '感觉不对劲啊…要不要我支个招？'; c.unread = true; gameState.broTipCount = (gameState.broTipCount || 0) + 1; }
                    else if (selectData.isChallenge) { c.status = '在线'; c.lastMsg = '挑战模式啊兄弟，悠着点！'; c.unread = true; gameState.broTipCount = (gameState.broTipCount || 0) + 1; }
                    else { c.status = Math.random() < 0.4 ? '在线' : '离线'; c.lastMsg = '兄弟，约会进展如何？'; }
                    break;
                case 'roommate':
                    if (evt >= 0 && evt < 5 && selectData.weather === '晴天') { c.status = '在线'; c.lastMsg = '找到她了吗？她方向感超差的哈哈'; c.unread = true; }
                    else if (stage === 'mid') { c.status = Math.random() < 0.3 ? '在线' : '离线'; c.lastMsg = '晚上回来带点吃的！'; }
                    else { c.status = '离线'; c.lastMsg = '上课中，晚点聊～'; }
                    break;
                case 'parents':
                    if (stage === 'open') { c.status = '在线'; c.lastMsg = '什么时候正式来家里吃顿饭？'; c.unread = true; }
                    else if (stage === 'finale') { c.status = '在线'; c.lastMsg = '听她说今天很开心！'; c.unread = true; }
                    else { c.status = Math.random() < 0.3 ? '在线' : '离线'; c.lastMsg = '年轻人好好相处。'; }
                    break;
                case 'ai_assistant':
                    c.status = '在线';
                    c.lastMsg = '有什么可以帮您的吗？';
                    break;
                }
            });
        }

function loadChatNode(nodeId) {
            if (nodeId === 'close') {
                const chatKey = currentContactId === 'girlfriend' ? `girlfriend_${selectData.weather}` : currentContactId;
                gameState.chatProgress[chatKey] = true;
                showContactList();
                return;
            }

            currentChatNodeId = nodeId;
            const node = chatData[nodeId];
            const msgContainer = document.getElementById('chat-messages');
            const optContainer = document.getElementById('chat-options');
            const typingIndicator = document.getElementById('typing-indicator');
            
            const chatKey = currentContactId === 'girlfriend' ? `girlfriend_${selectData.weather}` : currentContactId;
            gameState.chatHistory = gameState.chatHistory || {};
            gameState.chatHistory[chatKey] = gameState.chatHistory[chatKey] || [];

            optContainer.innerHTML = '';
            
            // 一次性奖励去重（P1-02 #2）：同一聊天节点本局仅首次执行 onEnter 的数值副作用，
            // 避免重新进入节点时反复领取好感/心动/金钱（gameState 每局重建，chatEntered 随之按局重置）。
            if (node.onEnter) {
                if (!gameState.chatEntered) gameState.chatEntered = [];
                if (gameState.chatEntered.indexOf(nodeId) < 0) {
                    node.onEnter();
                    gameState.chatEntered.push(nodeId);
                }
            }
            clampGameStats(); // 钳制聊天奖励越界（好感/心动锁在 0–100，并修复 NaN 污染）

            // 更新表情/状态
            if (node.expression) {
                const parts = node.expression.split(' ');
                if (parts.length > 1) {
                    document.getElementById('chat-contact-avatar').textContent = parts[0];
                    document.getElementById('chat-contact-status').textContent = `● ${parts[1]}`;
                } else {
                    document.getElementById('chat-contact-status').textContent = `● ${node.expression}`;
                }
                document.getElementById('chat-contact-status').style.color = 'var(--accent)';
            } else {
                const contact = contacts.find(c => c.id === currentContactId);
                const avEl = document.getElementById('chat-contact-avatar');
                avEl.innerHTML = (contact && contact.avatarImg) ? '<img src="'+contact.avatarImg+'" alt="'+altName(contact.name)+'头像">' : (contact ? contact.avatar : '👧');
                document.getElementById('chat-contact-status').textContent = `● ${contact ? contact.status : '在线'}`;
                document.getElementById('chat-contact-status').style.color = contact && contact.status === '在线' ? '#4caf50' : '#999';
            }

            // 模拟打字效果
            let delay = 0;
            node.messages.forEach((msg, i) => {
                // 显示打字中
                setTimeout(() => {
                    typingIndicator.style.display = 'block';
                    msgContainer.scrollTop = msgContainer.scrollHeight;
                }, delay);

                delay += 1000 + Math.random() * 500; // 随机打字时间

                setTimeout(() => {
                    typingIndicator.style.display = 'none';
                    const div = document.createElement('div');
                    div.className = 'message msg-gf';
                    div.textContent = msg;
                    msgContainer.appendChild(div);
                    msgContainer.scrollTop = msgContainer.scrollHeight;
                    
                    // 记录历史
                    gameState.chatHistory[chatKey].push({ type: 'gf', text: msg });
                }, delay);
                
                delay += 200; // 消息间隔
            });

            setTimeout(() => {
                node.options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.className = 'chat-opt-btn';
                    btn.textContent = opt.text;
                    btn.onclick = () => {
                        // 添加我的消息
                        const myDiv = document.createElement('div');
                        myDiv.className = 'message msg-me';
                        myDiv.textContent = opt.text;
                        msgContainer.appendChild(myDiv);
                        msgContainer.scrollTop = msgContainer.scrollHeight;
                        
                        // 记录历史
                        gameState.chatHistory[chatKey].push({ type: 'me', text: opt.text });

                        // 加载下一节点
                        setTimeout(() => loadChatNode(opt.next), 500);
                    };
                    optContainer.appendChild(btn);
                });
            }, delay);
        }
