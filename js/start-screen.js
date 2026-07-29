// js/start-screen.js — 从 achievements.js 拆分（功能：开始界面：天气/难度/随机开局）

function selectWeather(w) {
            selectData.weather = w;
            document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
            const activeBtn = document.querySelector(`[data-weather="${w}"]`);
            if (activeBtn) activeBtn.classList.add('active');
            
            // 根据天气更新背景和图标
            const theme = weatherThemes[w] || weatherThemes['晴天'];
            document.body.style.background = theme.body;
            document.documentElement.style.setProperty('--header-bg', theme.header);
            
            const icons = {
                '晴天': '☀️',
                '多云': '⛅',
                '雨天': '🌧️',
                '雪天': '❄️'
            };
            const iconEl = document.getElementById('weather-icon');
            if (iconEl) iconEl.textContent = icons[w] || '☀️';
            
            updateDifficultyColors();
            initWeatherEffects(w);
        }

function selectDifficulty(d, m, c) {
            selectData.difficulty = d;
            selectData.money = m;
            selectData.isChallenge = c;
            updateDifficultyColors();
        }

function startRandomGame() {
            const weathers = ['晴天', '多云', '雨���', '雪天'];
            const diffs = [{ d: '简单', m: 30, c: false },{ d: '中等', m: 20, c: false },{ d: '困难', m: 15, c: false },{ d: '挑战', m: 15, c: true }];
            const types = ['白天', '一整天'];
            const randW = weathers[Math.floor(Math.random() * weathers.length)];
            const randD = diffs[Math.floor(Math.random() * diffs.length)];
            const randT = types[Math.floor(Math.random() * types.length)];
            randD.m += Math.floor(Math.random() * 11) - 5;
            if (randD.m < 5) randD.m = 5;
            // 惊喜模式：不显示选择，直接开局
            selectWeather(randW);
            selectDifficulty(randD.d, randD.m, randD.c);
            selectDateType(randT);
            showToast(`🎲 惊喜模式：开局揭晓！`, 'system');
            startGame();
        }
