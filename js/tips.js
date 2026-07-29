var loveTipsData = [
            { id: 'basic_bag', title: '🎒 善用背包', body: '购买或掉落的礼物会存放在背包中。点击背包里的礼物，可以查看它们背后的小故事哦。' },
            { id: 'heart_glow', title: '💖 心花怒放', body: '当好感度达到"心花怒放"时，好感度按钮会发出光芒。点击它，你或许能获得意想不到的内心提示。' },
            { id: 'custom_gift', title: '🎨 匠心定制', body: '定制礼物需要消耗大量心动值和金钱，但它能带来极高的好感度回报。' },
            { id: 'observation', title: '👀 细微观察', body: '时刻关注她的表情。选项提示的颜色（绿/白/红）代表了她可能的反应。', lockedBody: '🔒 [已锁定] 通过与室友小雅聊天解锁：了解如何观察她的情绪波动。' },
            { id: 'intimacy', title: '💞 适度亲密', body: '在过马路或人潮拥挤时，适度的肢体接触（如轻牵衣袖）能快速拉近彼此距离。', lockedBody: '🔒 [已锁定] 通过与死党阿强聊天解锁：学习如何在约会中自然地拉近距离。' },
            { id: 'memories', title: '📸 创造回忆', body: '带她去看意外的风景，用相机记录下那些不经意的瞬间，这些都是未来的宝藏。', lockedBody: '🔒 [已锁定] 通过与女友在晴天聊天解锁：发现记录美好瞬间的意义。' },
            { id: 'independence', title: '🌿 尊重独立', body: '她是个独立的个体。给予关怀的同时，也要尊重她的选择，不要过度保护。', lockedBody: '🔒 [已锁定] 通过与女友在多云天聊天解锁：理解她内心深处对独立的渴望。' },
            { id: 'details', title: '🐾 关注细节', body: '留意她对小动物的喜爱。一起喂食流浪猫，能让她看到你内心最柔软的一面。', lockedBody: '🔒 [已锁定] 通过与室友小雅聊天解锁：发现她不为人知的小爱好。' },
            { id: 'timing', title: '💌 把握时机', body: '在氛围恰到好处时勇敢表达心意。不要因为犹豫，而错过那个最动人的瞬间。', lockedBody: '🔒 [已锁定] 通过与母亲聊天解锁：听听长辈关于缘分和时机的建议。' },
            { id: 'listening', title: '👂 学会倾听', body: '给她充分的表达空间。有时候，一个耐心的倾听者比一个滔滔不绝的演说家更受欢迎。', lockedBody: '🔒 [已锁定] 通过与母亲聊天解锁：明白倾听在长久关系中的重要性。' },
            { id: 'warmth_snow', title: '❄️ 雪中送炭', body: '雪天她最需要的是实实在在的温暖，比如一杯热咖啡或一个温暖的拥抱。', lockedBody: '🔒 [已锁定] 通过与女友在雪天聊天解锁：掌握在寒冷天气照顾她的秘诀。' },
            { id: 'rain_romance', title: '🌧️ 雨中浪漫', body: '雨天共撑一把伞时，记得把伞往她那边靠一点点，细节决定成败。', lockedBody: '🔒 [已锁定] 通过与女友在雨天聊天解锁：领悟雨天约会的浪漫精髓。' },
            { id: 'childhood_filter', title: '🍭 童年滤镜', body: '她对夫子庙的甜食有童年滤镜，带她去吃那些充满回忆的味道吧。', lockedBody: '🔒 [已锁定] 通过与母亲聊天解锁：挖掘她童年最爱的味道。' },
            { id: 'quiet_romance', title: '🤫 安静力量', body: '她讨厌吵闹的地方。安静浪漫的环境能让她瞬间变温柔。', lockedBody: '🔒 [已锁定] 通过与死党阿强聊天解锁：找到最适合她的约会氛围。' },
            { id: 'ai_wisdom', title: '🤖 AI的智慧', body: 'AI小助手不仅能提供建议，有时还会触发一些奇妙的现实干预。', lockedBody: '🔒 [已锁定] 通过与AI小助手聊天解锁：探索科技带来的恋爱助力。' },
            { id: 'mom_love', title: '👩 母亲的关怀', body: '无论你长多大，在妈妈眼里永远是孩子。记得常回家看看，或者多在微信上陪她聊聊天。', lockedBody: '🔒 [已锁定] 通过与母亲聊天解锁：感受来自家人的温暖支持。' },
            { id: 'spicy_food', title: '🌶️ 忌口细节', body: '她一点辣都吃不了，哪怕是微辣也会让她难受好久。点餐时一定要记得叮嘱厨师不要放辣。', lockedBody: '🔒 [已锁定] 通过特定剧情解锁：发现她饮食上的小秘密。' },
            { id: 'fear_ghosts', title: '👻 胆小鬼', body: '她其实非常怕鬼，哪怕是恐怖片的音效都会让她缩成一团。在她害怕时，紧紧牵住她的手就是最好的安慰。', lockedBody: '🔒 [已锁定] 通过特定剧情解锁：了解她内心深处的小恐惧。' },
            { id: 'prank', title: '🤡 调皮捣蛋', body: '她偶尔会搞一些无伤大雅的小恶作剧，那是她表达亲昵的一种方式。配合她的演出，能让她开心一整天。', lockedBody: '🔒 [已锁定] 通过特定剧情解锁：领略她古灵精怪的一面。' },
            { id: 'self_doubt', title: '😔 内耗自责', body: '她积极烂漫的背后，常因一些小事没做好而陷入深深的自责。此时她需要的不是道理，而是你坚定的支持和陪伴。', lockedBody: '🔒 [已锁定] 通过特定剧情解锁：触碰她敏感脆弱的内心。' },
            { id: 'outfit_style', title: '👗 穿搭偏好', body: '她其实很在意约会时的穿搭。虽然她嘴上不说，但如果你能夸夸她的搭配，她会开心很久。', lockedBody: '🔒 [已锁定] 通过浏览器搜索"约会穿搭"解锁：了解她的审美偏好。' }
        ];

        window.difficultyModifiers = {
            '简单': { pos: 1.0, neg: 0.9 },
            '中等': { pos: 0.8, neg: 1.0 },
            '困难': { pos: 0.6, neg: 1.2 },
            '挑战': { pos: 0.4, neg: 1.5 }
        };

        window.difficultyColors = {
            '晴天': { '简单': '#ffcc80', '中等': '#ffb74d', '困难': '#f57c00', '挑战': '#e65100' },
            '多云': { '简单': '#cfd8dc', '中等': '#90a4ae', '困难': '#607d8b', '挑战': '#37474f' },
            '雨天': { '简单': '#90caf9', '中等': '#64b5f6', '困难': '#1e88e5', '挑战': '#0d47a1' },
            '雪天': { '简单': '#e0f2f1', '中等': '#80cbc4', '困难': '#26a69a', '挑战': '#00695c' }
        };

        window.weatherModifiers = {
            '晴天': { pos: 1.1, neg: 0.9 },
            '多云': { pos: 1.0, neg: 1.0 },
            '雨天': { pos: 0.9, neg: 1.1 },
            '雪天': { pos: 0.8, neg: 1.2 }
        };

        function updateDifficultyColors() {
            var weather = selectData.weather;
            var diff = selectData.difficulty;
            var colors = difficultyColors[weather];
            
            document.querySelectorAll('.diff-btn').forEach(function(btn) {
                var btnDiff = btn.getAttribute('data-diff');
                if (btnDiff === diff) {
                    btn.style.backgroundColor = colors[btnDiff];
                    btn.style.color = (weather === '雪天' && btnDiff === '简单') ? '#333' : 'white';
                    btn.style.boxShadow = '0 0 15px ' + colors[btnDiff];
                    btn.classList.add('active');
                } else {
                    btn.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    btn.style.color = 'rgba(255,255,255,0.7)';
                    btn.style.boxShadow = 'none';
                    btn.classList.remove('active');
                }
            });
        }
        


// ---- 以下从 achievements.js 拆分并入（恋爱贴士展示/解锁/关闭）----
function showLoveTips() {
            const container = document.getElementById('tips-list-container');
            const groups = [
                { name: '📋 基础技巧', ids: ['basic_bag','heart_glow','custom_gift','ai_wisdom','mom_love','outfit_style'] },
                { name: '💬 人物谈心', ids: ['observation','details','intimacy','quiet_romance','memories','independence','timing','listening','warmth_snow','rain_romance','childhood_filter'] },
                { name: '🎭 剧情发现', ids: ['spicy_food','fear_ghosts','prank','self_doubt'] }
            ];
            let html='';
            groups.forEach(g => {
                html += '<div class="tips-section-title">'+g.name+'</div>';
                g.ids.forEach(id => {
                    const tip = loveTipsData.find(t => t.id === id);
                    if(!tip) return;
                    const isUnlocked = gameState.unlockedTips.includes(tip.id);
                    const tParts = tip.title.split(' ');
                    const icon = tParts[0]; const title = tParts.slice(1).join(' ');
                    let hint = '';
                    let bodyText;
                    if(isUnlocked){
                        bodyText = tip.body;
                    } else {
                        // 锁定：去掉 "🔒 [已锁定] 通过...解锁：" 前缀，保留线索句
                        const cleaned = (tip.lockedBody || '').replace(/^🔒\s*\[已锁定\]\s*通过[^：：]*[：:]\s*/, '').trim();
                        bodyText = cleaned || '继续探索剧情，解锁这条心得。';
                        if(tip.lockedBody){
                            const m = tip.lockedBody.match(/与(.+?)聊天/);
                            hint = m ? '🔑 跟'+m[1]+'聊聊吧' : '';
                        }
                    }
                    html += '<div class="tip-card'+(isUnlocked?' unlocked':' locked')+'">';
                    html += '<div class="tip-header"><span class="tip-icon">'+(isUnlocked?icon:'❓')+'</span><span class="tip-header-text">'+(title||tip.title)+'</span></div>';
                    html += '<div class="tip-body">'+bodyText+'</div>';
                    if(!isUnlocked && hint) html += '<div class="tip-unlock-hint">'+hint+'</div>';
                    html += '</div>';
                });
            });
            container.innerHTML = html;
            const unlocked = gameState.unlockedTips.length, total = loveTipsData.length;
            const pct = total ? Math.round(unlocked/total*100) : 0;
            document.getElementById('tips-progress-text').textContent = '已解锁 '+unlocked+'/'+total+' · '+pct+'%';
            document.getElementById('tips-progress-fill').style.width = pct+'%';
            document.getElementById('love-tips-modal').classList.add('show');
        }

function unlockLoveTip(tipId) {
            if (!gameState.unlockedTips.includes(tipId)) {
                gameState.unlockedTips.push(tipId);
                const tip = loveTipsData.find(t => t.id === tipId);
                if (tip) {
                    showToast(`📖 恋爱手册更新：${tip.title}`, 'hint');
                }
                if (gameState.unlockedTips.length >= loveTipsData.length) {
                    unlockPhoto('all_tips');
                }
            }
        }

function hideLoveTips() {
            document.getElementById('love-tips-modal').classList.remove('show');
        }
