// js/game-init.js — 从 achievements.js 拆分（功能：游戏启动）

// 全局游戏状态：首次加载时的默认值（跨局保留解锁数据）。
// ⚠️ 必须顶层 var 声明，否则 initGame() 在赋值前读取 gameState 会抛错，
// 导致游戏区空白、所有依赖 gameState 的按钮（贴士/成就/相册等）失效。
var gameState = {
    unlockedAchievements: [],
    unlockHistory: [],
    unlockedPhotos: ['first_meet'],
    unlockedTips: ['basic_bag', 'heart_glow', 'custom_gift'],
    usedCodes: [],
    // 与 initGame() 保持一致（曾因 shop.js 残留的重复声明才补齐，现 shop.js 已删除重复声明）
    claimedRewards: [],
    mood: 'normal',
    isNight: false,
    nightTriggerEvent: -1
};

function startGame() {
            // 触发开始屏退出动画
            const startScreen = document.getElementById('start-screen');
            startScreen.classList.add('transitioning');
            
            setTimeout(() => {
                startScreen.style.display = 'none';
                startScreen.classList.remove('transitioning');
                const gc = document.getElementById('game-container');
                gc.style.display = 'flex';
                gc.style.flexDirection = 'column';
                gc.classList.remove('night-mode');
                gc.classList.add('entering');
                setTimeout(() => { gc.classList.remove('entering'); }, 500);
                // 清除上一局"一整天"夜幕留下的内联深色背景，交还给主题 CSS 控制
                document.body.style.background = '';
                
                // 确保应用天气主题
                const theme = weatherThemes[selectData.weather] || weatherThemes['晴天'];
                document.documentElement.style.setProperty('--header-bg', theme.header);
                // 天气视觉叙事：CSS变量按天气微调
                const weatherVars = {
                    '晴天': { '--bg-page': 'linear-gradient(135deg, #fff5e6, #fff0e0, #ffe9d0)', '--primary': '#ff8c42' },
                    '多云': { '--bg-page': 'linear-gradient(135deg, #eef0f5, #e8ecf2, #dfe4ed)', '--primary': '#7b8ca0' },
                    '雨天': { '--bg-page': 'linear-gradient(135deg, #e8f0f8, #dce8f4, #cfe0f0)', '--primary': '#5b8cb8' },
                    '雪天': { '--bg-page': 'linear-gradient(135deg, #edf4fa, #e0ecf6, #d4e4f2)', '--primary': '#8ba4c0' }
                };
                const wv = weatherVars[selectData.weather] || weatherVars['晴天'];
                Object.entries(wv).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
                document.body.setAttribute('data-weather', selectData.weather);
                // 容器已显形，此时 resizeCanvas 才能按手机壳尺寸计算（#game-container clientWidth）
                initWeatherEffects(selectData.weather);
            }, 420);
            
            // 同一天气可能有多条剧情线（如晴天=sunny/sunny2），每次开局都重新随机挑一条
            if (window.StoryLoader && StoryLoader.variants && StoryLoader.variants[selectData.weather]) {
                const picked = StoryLoader.pickWeather(selectData.weather);
                if (picked) gameData[selectData.weather] = picked;
                // 记录本次实际选中的变体子键，供事件场景图按(子键,事件名)索引
                selectData.variantKey = (window.StoryLoader.getVariantKey) ? StoryLoader.getVariantKey(selectData.weather) : null;
                updateGfAvatar();
                console.log('[开局剧情线] 天气=' + selectData.weather +
                    ' 变体数=' + StoryLoader.variants[selectData.weather].length +
                    ' 选中首事件=' + (picked && picked[0] ? picked[0].title : '无'));
            } else {
                console.warn('[开局剧情线] 未使用外部变体（可能 fetch 失败用了内置回退）。variants 天气键=' +
                    (window.StoryLoader && StoryLoader.variants ? Object.keys(StoryLoader.variants).join('/') : '未初始化'));
            }

            SoundManager.playBgm('dating');

            // 清空上一局背包显示缓存（gameState.inventory 已在 initGame 重置）
            if (window.resetBackpack) window.resetBackpack();
            
            // 黑夜触发逻辑已移入 initGame（nightTriggerEvent/isNight 由 initGame 统一初始化，
            // 此前在 startGame 赋值会被 initGame 的全新 gameState 覆盖，导致一整天模式黑夜永不触发）
            
            initGame();
        }

function initGame() {
            // 清除旧的音乐缓存（如果版本更新了）
            try { localStorage.removeItem('_bgm_cache'); } catch(e) {}
            // 保留跨局数据
            const persistentData = {
                unlockedAchievements: gameState.unlockedAchievements || [],
                unlockHistory: gameState.unlockHistory || [],
                unlockedPhotos: gameState.unlockedPhotos || [],
                unlockedTips: gameState.unlockedTips || ['basic_bag', 'heart_glow', 'custom_gift'],
                usedCodes: gameState.usedCodes || []
            };

            gameState = {
                currentEvent: 0,
                money: selectData.money,
                like: 40,
                heart: 40,
                inventory: {},
                isHintRevealed: false,
                journalEntries: [],
                unlockedAchievements: persistentData.unlockedAchievements,
                unlockHistory: persistentData.unlockHistory,
                unlockedPhotos: persistentData.unlockedPhotos,
                unlockedTips: persistentData.unlockedTips,
                usedCodes: persistentData.usedCodes,
                currentFilter: 'all',
                currentSort: 'default',
                minLike: 40,
                maxLike: 40,
                restaurantChoices: [], // 餐厅三连分支记录（good/bad/null）
                chatProgress: {},
                isChatCompleted: false,
                choicesMade: {},
                momMoneyTriggered: false,
                aiWeatherTriggered: false,
                aiGiftTriggered: false,
                // 以下字段曾在 shop.js 的重复 gameState 声明中存在、initGame 重置后丢失，
                // 导致聊天一次性奖励（野餐/雨天电影）崩溃、一整天黑夜永不触发——现统一在此初始化
                claimedRewards: [],
                mood: 'normal',
                isNight: false,
                // 一整天模式：第 10/11/12 个事件触发夜幕；白天模式永不触发
                nightTriggerEvent: selectData.dateType === '一整天' ? (Math.floor(Math.random() * 3) + 10) : -1
            };
            updateStats();
            updateMood('normal');
            updateDaytimeIndicator();
            showEvent(0);
            document.getElementById('game-content').style.display = 'flex';
        }
