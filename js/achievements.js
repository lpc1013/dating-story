// js/achievements.js — 成就本体（已从原"挂羊头"大文件拆分，其余功能见各 js/ 模块）

// 跨周目持久化：读取已获得的独特道具 id 集合（localStorage 'collected-items'）
// 与 backpack.js 内的同名助手相互独立、不共享，避免跨文件依赖；各自 try/catch 兜底。
function getCollectedItems() {
  try { return new Set(JSON.parse(localStorage.getItem('collected-items') || '[]')); }
  catch (e) { return new Set(); }
}

var achievementsList = [
            { id: 'mom_care_3', title: '妈妈的牵挂', description: '在同一场约会中被妈妈关心了3次', icon: '💌', rarity: 'legendary', isHidden: true, condition: (state) => (state.momCareCount || 0) >= 3 },
            { id: 'bro_tips_3', title: '死党助攻', description: '死党给了你3条以上的建议', icon: '🤝', rarity: 'rare', isHidden: true, condition: (state) => (state.broTipCount || 0) >= 3 },
            { id: 'all_weather', title: '四季恋人', description: '在四种天气下都完成过约会', icon: '🌈', rarity: 'legendary', isHidden: true, condition: (state) => { try { const h = JSON.parse(localStorage.getItem('dating-history')||'[]'); const ws = new Set(h.map(x=>x.weather)); return ws.size >= 4; } catch(e) { return false; } } },
            { id: 'collector', title: '收藏家', description: '在多次约会里，攒齐 9 种独特的小信物', icon: '🎒', rarity: 'legendary', condition: (state) => getCollectedItems().size >= 9, progress: () => ({ current: getCollectedItems().size, max: 9 }) },
            { id: 'first_date', title: '初入情网', description: '完成第一次约会事件', icon: '💌', rarity: 'common', condition: (state) => state.currentEvent > 0 },
            { id: 'rich_boy', title: '腰缠万贯', description: '金钱达到50元以上', icon: '💰', rarity: 'common', condition: (state) => state.money >= 50, progress: (state) => ({ current: Math.min(state.money, 50), max: 50 }) },
            { id: 'poor_boy', title: '穷困潦倒', description: '金钱低于5元', icon: '💸', rarity: 'common', condition: (state) => state.money < 5 },
            { id: 'heart_throb', title: '心动过速', description: '心动值达到80以上', icon: '💓', rarity: 'rare', condition: (state) => state.heart >= 80, progress: (state) => ({ current: Math.min(state.heart, 80), max: 80 }) },
            { id: 'soulmate', title: '情场老手', description: '好感度达到80以上', icon: '🌹', rarity: 'rare', condition: (state) => state.like >= 80, progress: (state) => ({ current: Math.min(state.like, 80), max: 80 }) },
            { id: 'cold_war', title: '冷战边缘', description: '好感度低于20', icon: '🧊', rarity: 'common', condition: (state) => state.like < 20 },
            { id: 'perfect_date', title: '完美约会', description: '以极高好感度和心动值结束约会', icon: '✨', rarity: 'legendary', condition: (state, isEnd) => isEnd && state.like >= 90 && state.heart >= 90 },
            { id: '及时雨', title: '及时雨', description: '在迷路时迅速找到她', icon: '☔', rarity: 'common', isEvent: true },
            { id: '细节狂魔', title: '细节狂魔', description: '展现出极致的细心', icon: '🔍', rarity: 'rare', isEvent: true },
            { id: '绅士手', title: '绅士手', description: '展现绅士风度', icon: '🤝', rarity: 'common', isEvent: true },
            { id: '欧皇附体', title: '欧皇附体', description: '在抽奖奇遇中好运爆棚，抽中心仪限定款', icon: '🍀', rarity: 'legendary', isEvent: true },
            { id: '最佳倾听者', title: '最佳倾听者', description: '耐心倾听她的分享', icon: '👂', rarity: 'common', isEvent: true },
            { id: '心动摄影师', title: '心动摄影师', description: '拍下让她心动的照片', icon: '📸', rarity: 'common', isEvent: true },
            { id: '导航专家', title: '导航专家', description: '在复杂的巷子里精准带路', icon: '🧭', rarity: 'common', isEvent: true },
            { id: '护花使者', title: '护花使者', description: '在关键时刻守护她', icon: '🛡️', rarity: 'rare', isEvent: true },
            { id: '浪漫捕手', title: '浪漫捕手', description: '捕捉到意外的浪漫瞬间', icon: '🏹', rarity: 'common', isEvent: true },
            { id: '宠物友好', title: '宠物友好', description: '和她一起温柔对待小动物', icon: '🐾', rarity: 'common', isEvent: true },
            { id: '灵魂伴侣', title: '灵魂伴侣', description: '达到心意相通的境界', icon: '🧩', rarity: 'legendary', isEvent: true },
            { id: '情话大师', title: '情话大师', description: '说出让她无法拒绝的情话', icon: '🗣️', rarity: 'common', isEvent: true },
            { id: '暖心男友', title: '暖心男友', description: '在寒冷中给予她温暖', icon: '🔥', rarity: 'common', isEvent: true },
            { id: '火锅搭子', title: '火锅搭子', description: '享受一场完美的火锅约会', icon: '🍲', rarity: 'common', isEvent: true },
            { id: '雪人艺术家', title: '雪人艺术家', description: '一起堆出可爱的雪人', icon: '☃️', rarity: 'common', isEvent: true },
            { id: '暖手大师', title: '暖手大师', description: '用体温温暖她冰凉的手', icon: '🧤', rarity: 'common', isEvent: true },
            { id: '雪中浪漫', title: '雪中浪漫', description: '在漫天飞雪中漫步', icon: '❄️', rarity: 'common', isEvent: true },
            { id: '心愿达成', title: '心愿达成', description: '许下并见证美好的心愿', icon: '🌠', rarity: 'legendary', isEvent: true },
            { id: 'sugar_daddy', title: '金主爸爸', description: '以超过100元余额结束约会', icon: '💎', rarity: 'common' },
            { id: 'broke_love', title: '穷光蛋的真爱', description: '身无分文却赢得真爱', icon: '💖', rarity: 'legendary' },
            { id: 'master_photographer', title: '摄影大师', description: '收集5张以上的约会照片', icon: '🖼️', rarity: 'legendary' },
            { id: 'iron_man', title: '钢铁直男', description: '在约会中表现得极其迟钝', icon: '🧱', rarity: 'common' },
            { id: 'challenge_master', title: '极限挑战者', description: '在挑战模式下达成完美结局', icon: '🌋', rarity: 'legendary' },
            { id: 'custom_creator', title: '灵魂画师', description: '亲手制作一份定制礼物', icon: '🎨', rarity: 'common' },
            { id: 'warm_heart', title: '暖心守护', description: '在寒冷的雪天为她提供温暖', icon: '🔥', rarity: 'common' },
            { id: 'soul_mate_end', title: '灵魂伴侣', description: '达成传说级结局', icon: '♾️', rarity: 'legendary' },
            { id: 'challenge_survivor', title: '生存专家', description: '在挑战模式下成功完成约会', icon: '🧗', rarity: 'rare', condition: (state, isEnd) => isEnd && selectData.isChallenge && state.like > 0 && state.heart > 0 && state.money > 0 },
            { id: 'heart_limit_challenge', title: '心跳加速', description: '在挑战模式下心动值达到95以上', icon: '💓', rarity: 'legendary', condition: (state) => selectData.isChallenge && state.heart >= 95 },
            { id: 'penny_pincher_challenge', title: '精打细算', description: '在挑战模式下以低于5元余额完成约会', icon: '🪙', rarity: 'rare', condition: (state, isEnd) => isEnd && selectData.isChallenge && state.money < 5 && state.money > 0 },
            { id: 'emotional_rollercoaster', title: '情绪过山车', description: '在挑战模式下经历过好感度剧烈波动', icon: '🎢', rarity: 'legendary', condition: (state) => selectData.isChallenge && state.maxLike >= 80 && state.minLike <= 30 },
            { id: 'night_owl', title: '夜猫子', description: '体验一次完整的全天约会', icon: '🦉', rarity: 'common', condition: (state, isEnd) => isEnd && selectData.dateType === '一整天' },
            { id: 'starlight_lover', title: '星月交辉', description: '夜幕后全程保持好感度80以上', icon: '🌠', rarity: 'rare', condition: (state, isEnd) => isEnd && selectData.dateType === '一整天' && state.isNight && state.like >= 80 },
            { id: 'midnight_poet', title: '午夜诗人', description: '夜幕后选了所有浪漫选项', icon: '🌃', rarity: 'legendary', condition: (state, isEnd) => isEnd && selectData.dateType === '一整天' && state.isNight && (state.journalEntries || []).filter(function(e){return (e.likeChange||0) >= 8;}).length >= 5 },
            { id: 'midnight_romance', title: '午夜浪漫', description: '在黑夜模式下获得极高好感度', icon: '🎆', rarity: 'rare', condition: (state) => state.isNight && state.like >= 90 },
            { id: 'night_risk', title: '暗夜危机', description: '在黑夜模式下好感度跌至冰点', icon: '🌑', rarity: 'common', condition: (state) => state.isNight && state.like <= 10 },
            { id: 'photo_archive', title: '时光集锦', description: '集齐相册里的每一张回忆', icon: '📔', rarity: 'legendary', condition: (state) => (state.unlockedPhotos || []).length >= 25, progress: (state) => ({ current: (state.unlockedPhotos || []).length, max: 25 }) }
        ];

function showToast(message, type) {
            const TYPES = {
                achievement: { label: '成就', icon: '🏆' },
                reward:      { label: '奖励', icon: '🎁' },
                hint:        { label: '提示', icon: '💡' },
                whisper:     { label: '心声', icon: '🍃' },
                mood:        { label: '好感', icon: '💖' },
                system:      { label: '系统', icon: '🌙' },
                warn:        { label: '注意', icon: '⚠️' }
            };
            const t = TYPES[type] || TYPES.achievement;
            const container = document.getElementById('achievement-toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = 'achievement-toast toast-' + (type || 'achievement');
            toast.innerHTML = '<span class="toast-icon">' + t.icon + '</span><div class="toast-body"><span class="toast-label">' + t.label + '</span><span class="toast-title">' + message + '</span></div>';
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('hide');
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }

        function showAchievementToast(message) { showToast(message, 'achievement'); }

function unlockAchievement(id, title) {
            if (gameState.unlockedAchievements.includes(id)) return;
            gameState.unlockedAchievements.push(id);
            gameState.unlockHistory.push({ id, time: Date.now() });
            var card=document.querySelector('.achievement-card[data-ach-id="'+id+'"]');if(card){card.style.animation='achUnlock 0.6s ease';setTimeout(function(){card.style.animation=''},600);}
showAchievementToast(title || id);
            SoundManager.playSting('achievement');
        }

function checkStatsAchievements(isEnd = false) {
            achievementsList.forEach(ach => {
                if (!ach.condition) return;
                if (gameState.unlockedAchievements.includes(ach.id)) return;
                
                try {
                    // 传递更多上下文给条件函数
                    const context = {
                        ...gameState,
                        isChallenge: selectData.isChallenge,
                        weather: selectData.weather,
                        difficulty: selectData.difficulty
                    };
                    if (ach.condition(context, isEnd)) {
                        unlockAchievement(ach.id, ach.title);
                    }
                } catch (e) {
                    console.error("Achievement condition error:", ach.id, e);
                }
            });
        }

function showAchievements() {
            renderAchievements();
            document.getElementById('achievements-panel').classList.add('show');
        }

function hideAchievements() {
            document.getElementById('achievements-panel').classList.remove('show');
        }

function filterAchievements(type, btn) {
            gameState.currentFilter = type;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderAchievements();
        }

function searchAchievements(q) {
            gameState.currentSearch = (q || '').trim().toLowerCase();
            renderAchievements();
        }

function renderAchievements() {
            const list = document.getElementById('achievement-list');
            list.innerHTML = '';
            const fullList = [...achievementsList];
            // 合并外部
            if (window.StoryLoader && StoryLoader.achievementRegistry) {
                const existing = new Set(fullList.map(a => a.id));
                for (const def of Object.values(StoryLoader.achievementRegistry)) {
                    if (!existing.has(def.id)) fullList.push(def);
                }
            }
            const totalAll = fullList.length;
            const totalUnlocked = fullList.filter(a => gameState.unlockedAchievements.includes(a.id)).length;

            // 徽标更新
            ['unlocked','all','locked'].forEach(function(t){
                var btns = document.querySelectorAll('.achievement-tabs .tab-btn');
                btns.forEach(function(b){
                    var txt = b.textContent.replace(/\s*\d+\/\d+\s*/g, '').trim();
                    if (t === 'unlocked' && txt.includes('已解锁')) b.innerHTML = '🔓 已解锁 <em>'+totalUnlocked+'/'+totalAll+'</em>';
                    if (t === 'all' && txt.includes('全部')) b.innerHTML = '📋 全部 <em>'+totalAll+'</em>';
                    if (t === 'locked' && txt.includes('未解锁')) b.innerHTML = '🔒 未解锁 <em>'+(totalAll-totalUnlocked)+'</em>';
                });
            });

            // 四档分级：橙(最高) > 紫 > 蓝 > 绿
            const TIERS = ['orange', 'purple', 'blue', 'green'];
            const tierWeight = { 'orange': 4, 'purple': 3, 'blue': 2, 'green': 1 };
            const tierNames = { 'orange': '典藏成就', 'purple': '稀有成就', 'blue': '进阶成就', 'green': '基础成就' };
            const tierIcons = { 'orange': '🟠', 'purple': '🟣', 'blue': '🔵', 'green': '🟢' };
            const tierColors = { 'orange': '#ff7a18', 'purple': '#9b59b6', 'blue': '#3498db', 'green': '#2ecc71' };
            const tierLabel = { 'orange': '典藏', 'purple': '稀有', 'blue': '进阶', 'green': '基础' };
            function tierOf(ach) {
                if (ach.rarity === 'legendary') return 'orange';
                if (ach.rarity === 'rare') return 'purple';
                return ach.isEvent ? 'blue' : 'green'; // 普通成就拆分：事件成就→蓝，数值成就→绿
            }
            let displayList = [...fullList];
            if (gameState.currentFilter === 'unlocked') {
                displayList = displayList.filter(ach => gameState.unlockedAchievements.includes(ach.id));
            } else if (gameState.currentFilter === 'locked') {
                displayList = displayList.filter(ach => !gameState.unlockedAchievements.includes(ach.id));
            }

            // 搜索过滤（按名称/描述，不区分大小写）
            if (gameState.currentSearch) {
                displayList = displayList.filter(ach =>
                    (ach.title && ach.title.toLowerCase().includes(gameState.currentSearch)) ||
                    (ach.description && ach.description.toLowerCase().includes(gameState.currentSearch))
                );
            }

            // 空状态
            if (!displayList.length) {
                list.innerHTML = '<div class="ach-empty">🎯 ' + (gameState.currentFilter==='unlocked'?'尚未解锁任何成就，去约会吧！':(gameState.currentFilter==='locked'?'全部已解锁！厉害！':'暂无成就')) + '</div>';
                return;
            }

            if (gameState.currentSort === 'rarity') displayList.sort((a, b) => tierWeight[tierOf(b)] - tierWeight[tierOf(a)]);
            else if (gameState.currentSort === 'name') displayList.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
            const groups = { 'orange': [], 'purple': [], 'blue': [], 'green': [] };
            displayList.forEach(ach => { const r = tierOf(ach); if (groups[r]) groups[r].push(ach); else groups.green.push(ach); });
            if (!gameState._achCollapse) gameState._achCollapse = {};
            TIERS.forEach(tier => {
                if (!groups[tier].length) return;
                var collapsed = gameState._achCollapse[tier];
                var hdr = document.createElement('div');
                hdr.className = 'ach-group-hdr';
                hdr.innerHTML = '<span>'+tierIcons[tier]+' '+tierNames[tier]+' ('+groups[tier].length+')</span>'+
                    '<span class="ach-group-arrow" style="transform:rotate('+(collapsed?'-90deg':'0')+')">▼</span>';
                hdr.onclick = function(){ gameState._achCollapse[tier]=!gameState._achCollapse[tier]; renderAchievements(); };
                list.appendChild(hdr);
                if (collapsed) return;
                groups[tier].forEach(ach => {
                    const isUnlocked = gameState.unlockedAchievements.includes(ach.id);
                    const tier = tierOf(ach);
                    var isNew = gameState.unlockHistory && gameState.unlockHistory.length>0 && gameState.unlockHistory[gameState.unlockHistory.length-1].id === ach.id;
                    var progHtml = '';
                    if (!isUnlocked && ach.progress) {
                        const p = typeof ach.progress === 'function' ? ach.progress(gameState) : ach.progress;
                        if (p && p.max > 0) {
                            var pct = Math.min(100, Math.round(p.current / p.max * 100));
                            var dash = 2*Math.PI*10; var off = dash*(1-pct/100);
                            progHtml = '<svg class="ach-ring-svg" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" fill="none" stroke="#eee" stroke-width="3"/><circle cx="14" cy="14" r="10" fill="none" stroke="'+tierColors[tier]+'" stroke-width="3" stroke-dasharray="'+dash.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" stroke-linecap="round" transform="rotate(-90 14 14)"/><text x="14" y="18" text-anchor="middle" font-size="8" fill="#999">'+pct+'%</text></svg>';
                        }
                    }
                    var card = document.createElement('div');
                    card.className = 'achievement-card rarity-' + tier + (isUnlocked ? ' unlocked' : ' locked') + (isNew ? ' ach-flash' : '');
                    card.setAttribute('data-ach-id', ach.id);
                    card.innerHTML =
                        '<div class="ach-icon">' + (isUnlocked ? ach.icon : '🎭') + '</div>' +
                        '<div class="ach-body"' + ((ach.description||ach.title) ? ' title="' + escAttr(isUnlocked ? (ach.description||'') : '等待解锁') + '"' : '') + '>' +
                            (ach.isHidden && !isUnlocked ? '<div class="ach-name">???</div>' : '<div class="ach-name">' + ach.title + '</div>') +
                            (ach.isHidden && !isUnlocked ? '<div class="ach-desc">神秘成就…</div>' : '<div class="ach-desc">' + (isUnlocked ? (ach.description || '') : '等待被发现') + '</div>') +
                        '</div>' +
                        '<div class="ach-meta">' +
                            (progHtml ? '<div class="ach-ring-wrap">'+progHtml+'</div>' : '') +
                            '<div class="ach-rarity rarity-' + tier + '">' + tierLabel[tier] + '</div>' +
                        '</div>';
                    card.onclick = function(){ openAchievementModal(ach); };
                    list.appendChild(card);
                });
            });

            updateAchievementFoot();
        }

function openAchievementModal(ach) {
            const isUnlocked = gameState.unlockedAchievements.includes(ach.id);
            var unlockTime = '';
            if (isUnlocked && gameState.unlockHistory) {
                var h = gameState.unlockHistory.find(function(x){return x.id===ach.id});
                if (h && h.time) unlockTime = '🕐 解锁于 ' + new Date(h.time).toLocaleString('zh-CN');
            }
            document.getElementById('modal-icon').textContent = isUnlocked ? ach.icon : '🎭';
            document.getElementById('modal-title').textContent = ach.title;
            document.getElementById('modal-desc').textContent = isUnlocked ? ach.description : '这一页日记还未被翻开...';
            document.getElementById('modal-condition').textContent = unlockTime || (isUnlocked ? '' : '解锁条件: ' + ach.description);
            document.getElementById('achievement-modal').classList.add('show');
        }

function closeAchievementModal() {
            document.getElementById('achievement-modal').classList.remove('show');
        }

function updateAchievementFoot() {
            const foot = document.getElementById('achievement-foot');
            if (!foot) return;
            let total = achievementsList.length;
            if (window.StoryLoader && StoryLoader.achievementRegistry) {
                const existing = new Set(achievementsList.map(a => a.id));
                total += Object.values(StoryLoader.achievementRegistry)
                    .filter(d => !existing.has(d.id)).length;
            }
            const unlocked = gameState.unlockedAchievements
                .filter(id => achievementsList.some(a => a.id === id) ||
                    (window.StoryLoader && StoryLoader.achievementRegistry && StoryLoader.achievementRegistry[id])).length;
            const pct = total ? Math.round(unlocked / total * 100) : 0;
            foot.innerHTML = `<div style="margin-top:16px;padding:10px 0;display:flex;align-items:center;gap:12px;border-top:1px solid var(--line,#e0cda0);">
                <span style="font-size:12px;color:var(--sub);white-space:nowrap;">已解锁 <b style="color:var(--accent);">${unlocked}</b> / ${total}</span>
                <div style="flex:1;height:5px;background:var(--chip,#f3e8cf);border-radius:3px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:var(--accent,#a8442a);border-radius:3px;transition:width .4s ease;"></div>
                </div>
                <span style="font-size:11px;color:var(--muted);">${pct}%</span>
            </div>`;
        }
