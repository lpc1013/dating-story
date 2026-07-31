// js/event-render.js — 从 achievements.js 拆分（功能：事件渲染）

// —— 持有判定的唯一入口 ——
// gameState.inventory[id] 存的是**对象** { icon, count, description, quote }
// （见 js/backpack.js 的 acquireItem 与 js/inventory.js 的 addToInventory），
// 因此绝不能写 inventory[id] > 0 —— 对象与数字比较恒为 false，
// 会让所有带 requireItem 的选项永久隐藏（历史缺陷，充电宝伏笔从未被玩家看见）。
// 统一在此判定，避免"最优项求解"与"实际渲染"两处判定漂移。
function hasItem(id) {
    if (!id) return true;                       // 无门控要求 → 视为通过
    var inv = (typeof gameState !== 'undefined' && gameState && gameState.inventory) || null;
    if (!inv) return false;                     // inventory 未初始化
    var entry = inv[id];
    if (entry == null) return false;            // 条目不存在
    if (typeof entry === 'number') return entry > 0;  // 兼容遗留数字格式（见 index.html aiGiftGen 兜底分支）
    return (Number(entry.count) || 0) > 0;      // 正常对象格式；count 为 undefined/NaN 时安全取 0
}

function injectItemChoices(event, container) {
            const inv = gameState.inventory || {};
            // 赠予文案覆盖表（按礼物 id 索引）。未登记的商店礼物会自动派生一份通用文案。
            // 【注意】下列条目全部出自 js/shop.js 的**遗留** gifts 表（8 件），现行商店已不售卖，
            // 玩家无法获得同名物品，因此当前均不可达。按约定保留不删除（属策划内容层）。
            // 唯一例外是 'necklace'：id 与现行商店重名但商品名不同（纯银项链 vs 精美项链），
            // 故下方按 displayName 严格校验后才允许覆盖，避免张冠李戴。
            const itemMap = {
                'flower': { text: '送出红玫瑰 🌹', like: 8, emoji: '🌹', id: 'flower', displayName: '红玫瑰' },
                'chocolate': { text: '分享手工巧克力 🍫', like: 5, emoji: '🍫', id: 'chocolate', displayName: '手工巧克力' },
                'perfume': { text: '送上淡雅香水 ✨', like: 10, emoji: '✨', id: 'perfume', displayName: '淡雅香水' },
                'necklace': { text: '为她戴上纯银项链 📿', like: 15, emoji: '📿', id: 'necklace', displayName: '纯银项链' },
                'plush': { text: '递上大白熊公仔 🧸', like: 7, emoji: '🧸', id: 'plush', displayName: '大白熊公仔' },
                'watch': { text: '送情侣手表 ⌚', like: 20, emoji: '⌚', id: 'watch', displayName: '情侣手表' },
                'ticket': { text: '拿出游乐园门票 🎟️', like: 12, emoji: '🎟️', id: 'ticket', displayName: '游乐园门票' },
                'camera': { text: '用拍立得记录此刻 📷', like: 18, emoji: '📷', id: 'camera', displayName: '拍立得' }
            };
            const w = selectData.weather;
            // 检查背包中实际拥有的物品
            const owned = Object.keys(inv).filter(k => hasItem(k));
            if (!owned.length) return;
            // 查找背包物品对应的礼物名（反向匹配：背包键 → gift.name → gift.id）
            // 数据源必须是**玩家真实能买到**的那份（js/shop.js 顶层 shopGifts）；
            // 早期误用遗留的 gifts 表，两份列表商品名几乎零重叠 → 反查恒失败 → 赠予选项从不注入。
            const shopSrc = (typeof shopGifts !== 'undefined' && Array.isArray(shopGifts)) ? shopGifts
                          : (typeof gifts !== 'undefined' && Array.isArray(gifts)) ? gifts
                          : [];
            const giftByName = {};
            const giftDefByName = {};
            shopSrc.forEach(g => {
                if (!g || !g.name) return;
                // 定制礼物入包名是「定制的🎁」这类动态名（见 js/gift.js createCustomGift），
                // 无法按固定名反查，跳过。
                if (g.isCustom) return;
                giftByName[g.name] = g.id;
                // 仅当覆盖表条目确实描述的是同一件商品（displayName 相符）时才采用手写文案，
                // 否则按商店自身数据派生，绝不擅自套用旧文案/旧数值。
                const override = itemMap[g.id];
                giftDefByName[g.name] = (override && override.displayName === g.name)
                    ? override
                    : { text: '送出' + g.name + ' ' + g.icon, like: g.like || 0, emoji: g.icon || '🎁', id: g.id, displayName: g.name };
            });

            owned.forEach(itemName => {
                const giftId = giftByName[itemName];
                const def = giftId ? giftDefByName[itemName] : null;
                if (!def) return; // 自定义物品/剧情道具不在此显示
                // 检查是否已被其他选项使用过
                if (container.querySelector('[data-item="'+giftId+'"]')) return;
                
                const btn = document.createElement('button');
                btn.className = 'choice-btn';
                btn.setAttribute('data-item', giftId);
                btn.innerHTML = '<span style="font-size:16px;margin-right:6px;">'+def.emoji+'</span>'+def.text;
                btn.style.borderTop = '1px dashed var(--gold)';
                btn.style.background = 'linear-gradient(90deg, rgba(255,215,0,0.08), transparent)';
                btn.onclick = function(){
                    gameState.like = Math.min(100, gameState.like + def.like);
                    updateStats();
                    showToast(def.emoji+' 使用了：'+def.displayName, 'reward');
                    // 消耗物品
                    if (inv[itemName]) { inv[itemName].count--; if (inv[itemName].count <= 0) delete inv[itemName]; }
                    makeChoice({ text: def.text, like: def.like, money: 0, heart: def.like > 10 ? 5 : 2, emotion: 'happy', feedback: def.text, branch: 'good' }, event);
                };
                container.appendChild(btn);
            });
        }

function renderParticles(el, weather) {
            if (!el) return;
            let p = el.querySelector('.scene-cg-particles');
            if (!p) { p = document.createElement('div'); p.className = 'scene-cg-particles'; el.appendChild(p); }
            p.innerHTML = '';
            const count = weather === '雨天' ? 18 : weather === '雪天' ? 12 : weather === '多云' ? 4 : 2;
            const cls = weather === '雨天' ? 'raindrop' : weather === '雪天' ? 'snowflake' : weather === '多云' ? 'sunbeam' : 'sunbeam';
            for (let i = 0; i < count; i++) {
                const d = document.createElement('div');
                d.className = cls;
                d.style.left = (Math.random() * 100) + '%';
                d.style.animationDuration = ((weather === '雨天' ? .5 : weather === '雪天' ? 2 : 3) + Math.random() * 2) + 's';
                d.style.animationDelay = (Math.random() * 3) + 's';
                if (weather === '晴天' || weather === '多云') {
                    d.style.width = d.style.height = (20 + Math.random() * 40) + 'px';
                    d.style.top = (Math.random() * 60) + '%';
                    d.style.left = (Math.random() * 80) + '%';
                }
                p.appendChild(d);
            }
        }

function showEvent(index) {
            // 清除上一事件的反馈
            const fbEl = document.getElementById('feedback');
            if (fbEl) { fbEl.classList.remove('show'); fbEl.innerHTML = ''; fbEl.style.display = ''; }
            
            // 更新通讯录状态
            if (typeof updateContactStatuses === 'function') updateContactStatuses();
            
            const events = gameData[selectData.weather];
            if (index >= events.length) {
                showResult();
                return;
            }

            // 检查是否切换到黑夜
            if (gameState.nightTriggerEvent !== -1 && index >= gameState.nightTriggerEvent && !gameState.isNight) {
                gameState.isNight = true;
                // 日落过渡动画（1.5s 遮罩渐变 → 再切换夜晚主题）
                var overlay = document.getElementById('sunset-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.id = 'sunset-overlay';
                    overlay.innerHTML = '<div class="sunset-quote">🌅 日落黄昏，夜的浪漫才刚刚开始…</div>';
                    document.body.appendChild(overlay);
                }
                overlay.classList.add('active');
                setTimeout(function() {
                    overlay.classList.remove('active');
                    SoundManager.playBgm('night');
                    const theme = weatherThemes['黑夜'];
                    document.documentElement.style.setProperty('--header-bg', theme.header);
                    document.body.style.background = theme.body;
                    document.getElementById('game-container').classList.add('night-mode');
                    updateDaytimeIndicator();
                    showToast("🌙 夜幕降临，浪漫升级！好感度与心动值变化翻倍。", 'system');
                }, 2200);
            }

            const event = events[index];
            const gameContent = document.getElementById('game-content');

            // 立即清空旧选项，避免淡入 300ms 窗口内旧按钮仍可点击（如"看穿心思"重渲染当前事件时的竞态/闪烁）
            const choicesEl = document.getElementById('choices');
            if (choicesEl) choicesEl.innerHTML = '';
            
            // 天气系统提示逻辑
            // 晴天: 75% 概率看见提示
            // 多云: 只有 3 个随机事件能看见所有提示
            // 雨天: 每个事件随机一个选项能看见提示
            // 雪天: 看不见提示
            
            if (!gameState.weatherBuffs) {
                gameState.weatherBuffs = {
                    cloudyEvents: []
                };
                if (selectData.weather === '多云') {
                    const indices = Array.from({length: events.length}, (_, i) => i);
                    // 确保只有 3 个随机事件显示提示
                    for (let i = 0; i < 3; i++) {
                        if (indices.length > 0) {
                            const randIdx = Math.floor(Math.random() * indices.length);
                            gameState.weatherBuffs.cloudyEvents.push(indices.splice(randIdx, 1)[0]);
                        }
                    }
                }
            }

            // 添加切换动画
            gameContent.style.opacity = '0';
            gameContent.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                document.getElementById('event-title').textContent = event.title;
                // 夜幕后给描述附加氛围批注
                var descText = event.description;
                if (gameState.isNight && selectData.dateType === '一整天') {
                    descText += '\n\n🌙 夜色温柔，灯火阑珊。';
                }
                document.getElementById('event-description').textContent = descText;
                document.getElementById('event-info').textContent = `事件 ${index + 1}/${events.length}`;
                var pf = document.getElementById('progress-fill'); if (pf) pf.style.width = ((index + 1) / events.length * 100) + '%';

                // —— 配图：事件场景图(#scene-cg) ——
                if (window.ASSET_MAP) {
                  let imgPath = null, imgSub = null;
                  const vk = selectData.variantKey;
                  if (vk && ASSET_MAP.eventImages[vk] && ASSET_MAP.eventImages[vk][event.title]) {
                    imgPath = ASSET_MAP.eventImages[vk][event.title];
                    imgSub = vk;
                  } else if (ASSET_MAP.cnToSubs && ASSET_MAP.cnToSubs[selectData.weather]) {
                    for (const sub of ASSET_MAP.cnToSubs[selectData.weather]) {
                      if (ASSET_MAP.eventImages[sub] && ASSET_MAP.eventImages[sub][event.title]) {
                        imgPath = ASSET_MAP.eventImages[sub][event.title];
                        imgSub = sub;
                        break;
                      }
                    }
                  }
                  const sceneCg = document.getElementById('scene-cg');
                  if (imgPath) {
                    // E-6：事件名可能含半角双引号（rainy2 的「邻居的"米"字」是全 109 事件里唯一一个），
                    // 用字符串拼 alt="" 会让属性提前闭合 —— alt 只剩「邻居的」，「米」被当成伪属性。
                    // 改走 DOM + 属性赋值，从根上免疫引号/尖括号，不再依赖手写转义。
                    sceneCg.innerHTML = '';
                    const cgImg = document.createElement('img');
                    cgImg.src = imgPath;
                    cgImg.alt = event.title || '';
                    cgImg.className = 'cg-enter';
                    sceneCg.appendChild(cgImg);
                    sceneCg.style.display = 'flex';
                    sceneCg.style.cursor = 'zoom-in';
                    sceneCg.title = '点击看大图';
                    sceneCg.classList.add('has-img');
                    sceneCg.onclick = () => showCgLightbox(imgPath, event.title);
                    const w = selectData.weather;
                    const cls = w === '雨天' ? 'scene-cg-rain' : w === '雪天' ? 'scene-cg-snow' : w === '多云' ? 'scene-cg-cloud' : 'scene-cg-sun';
                    sceneCg.className = 'scene-cg' + (sceneCg.classList.contains('has-img') ? ' has-img' : '') + ' ' + cls;
                  } else {
                    sceneCg.innerHTML = '';
                    sceneCg.style.display = 'flex';
                    sceneCg.classList.remove('has-img');
                    sceneCg.onclick = null;
                    // 天气粒子占位
                    const w = selectData.weather;
                    const cls = w === '雨天' ? 'scene-cg-rain' : w === '雪天' ? 'scene-cg-snow' : w === '多云' ? 'scene-cg-cloud' : 'scene-cg-sun';
                    sceneCg.className = 'scene-cg ' + (imgPath ? 'has-img ' : '') + cls;
                    if (!imgPath) renderParticles(sceneCg, w);
                  }
                }

                const choicesContainer = document.getElementById('choices');
                choicesContainer.innerHTML = '';
                
                // 确定当前事件哪些选项显示提示
                let visibleHints = [];
                if (selectData.weather === '晴天') {
                    visibleHints = event.choices.map(() => Math.random() < 0.75);
                } else if (selectData.weather === '多云') {
                    const isCloudyVisible = gameState.weatherBuffs.cloudyEvents.includes(index);
                    visibleHints = event.choices.map(() => isCloudyVisible);
                } else if (selectData.weather === '雨天') {
                    // 雨天：每个事件仅有一个随机选项显示提示
                    const randChoiceIdx = Math.floor(Math.random() * event.choices.length);
                    visibleHints = event.choices.map((_, i) => i === randChoiceIdx);
                } else if (selectData.weather === '雪天') {
                    // 雪天：所有提示均不显示
                    visibleHints = event.choices.map(() => false);
                } else {
                    visibleHints = event.choices.map(() => true);
                }

                // 心花怒放：找出最优选项
                let bestIdx = -1, bestScore = -Infinity;
                if (gameState.isHintRevealed) {
                    event.choices.forEach((c, i) => {
                        // 只在“实际会渲染的可选项”内求最优：过滤 reqLike 与 requireItem，
                        // 这样没有充电宝时“拿出充电宝”不会被选为最优，揭示项永远可选。
                        if (c.reqLike != null && gameState.like < c.reqLike) return;
                        if (c.requireItem && !hasItem(c.requireItem)) return;
                        const sc = (c.like || 0) + (c.heart || 0) * 1.5 - Math.abs(c.money || 0) * 0.1;
                        if (sc > bestScore) { bestScore = sc; bestIdx = i; }
                    });
                }

                let optNum = 0;
                event.choices.forEach((choice, i) => {
                    if (choice.reqLike != null && gameState.like < choice.reqLike) return;
                    // requireItem：未持有所需物品时隐藏该选项（如没带充电宝则"拿出充电宝"选项不出现）
                    // 必须与上方 bestIdx 求解使用同一个 hasItem，否则会出现"提示指向一个看不见的选项"。
                    if (choice.requireItem && !hasItem(choice.requireItem)) return;

                    optNum++;
                    const numSpan = '<span class="choice-num">' + optNum + '</span>';
                    const btn = document.createElement('button');
                    btn.className = 'choice-btn';
                    if (gameState.isHintRevealed && i === bestIdx) btn.classList.add('hint-best');

                    const parts = choice.text.split('\n');
                    const mainText = parts[0];
                    const hintText = parts.slice(1).join('\n');
                    const showHint = visibleHints[i];

                    if (showHint && hintText) {
                        const isRainy = selectData.weather === '雨天' && !gameState.isHintRevealed;

                        // E-8：原来这里内联写死 font-size:11px + #00ff88/#ff1744/#fff，
                        // 在浅色主题按钮上最差只有 1.01:1 对比度、字号也低于移动端下限。
                        // 样式全部交回 CSS（.choice-hint 盒子 + .choice-hint-happy/normal/angry 配色，
                        // 后三者已存在且对比度 4.77–5.50:1），JS 只负责挂类名，不再写 style。
                        const emo = choice.emotion === 'happy' ? 'happy'
                                  : choice.emotion === 'angry' ? 'angry'
                                  : 'normal';
                        const hintClass = 'choice-hint choice-hint-' + emo + (isRainy ? ' hint-blur' : '');

                        const hintHtml = `<div class="${hintClass}">${hintText.replace(/\n/g, '<br>')}</div>`;
                        btn.innerHTML = numSpan + `<div style="font-weight: bold; margin-bottom: 4px;">${mainText}${hintHtml}</div>`;
                    } else {
                        btn.innerHTML = numSpan + mainText;
                    }

                    btn.onclick = () => makeChoice(choice, event);
                    choicesContainer.appendChild(btn);
                });

                // 物品影响：如果背包里有相关道具，额外显示"使用"选项
                injectItemChoices(event, choicesContainer);

                // 雪天特殊互动
                const warmthBtn = document.getElementById('warmth-btn');
                if (selectData.weather === '雪天' && Math.random() < 0.4) {
                    warmthBtn.style.display = 'inline-flex';
                } else {
                    warmthBtn.style.display = 'none';
                }

                document.getElementById('feedback').classList.remove('show');
                
                setTimeout(()=>{const d=document.getElementById('event-description');if(d&&d.scrollHeight>120){let b=document.querySelector('.desc-expand-btn');if(!b){b=document.createElement('span');b.className='desc-expand-btn';b.textContent='展开▼';b.onclick=function(e){e.stopPropagation();if(d.style.maxHeight=='none'){d.style.maxHeight='120px';b.textContent='展开▼'}else{d.style.maxHeight='none';b.textContent='收起▲'}};d.appendChild(b)}}},100);
gameContent.style.opacity = '1';
                gameContent.style.transform = 'translateY(0)';
                gameContent.style.transition = 'all 0.5s ease';
            }, 300);
        }

var origShowEvent = showEvent;

showEvent = function(index) {
            const desc = document.getElementById('event-description');
            if (desc && gameState && gameState.currentEvent !== undefined && index !== gameState.currentEvent) {
                desc.classList.remove('flipping');
                void desc.offsetWidth; // reflow
                desc.classList.add('flipping');
                SFX.flip();
            }
            origShowEvent(index);
        };
