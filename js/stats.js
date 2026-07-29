// js/stats.js — 从 achievements.js 拆分（功能：数值/心情/温暖）

function provideWarmth() {
            if (gameState.money < 5) {
                showAchievementToast("❌ 余额不足，无法提供温暖...");
                return;
            }
            
            gameState.money -= 5;
            gameState.like += 10;
            gameState.heart += 5;
            updateStats();
            updateMood('happy');
            
            document.getElementById('warmth-btn').style.display = 'none';
            showAchievementToast("🔥 你的温暖让她感到无比安心");
            unlockAchievement('warm_heart', '暖心守护');

            // 温馨反馈动画
            const container = document.querySelector('.container');
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(255, 152, 0, 0.15)';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '100';
            overlay.style.transition = 'opacity 1s ease';
            overlay.style.borderRadius = '15px';
            container.appendChild(overlay);
            
            for(let i=0; i<8; i++) {
                const sun = document.createElement('div');
                sun.innerHTML = '☀️';
                sun.style.position = 'absolute';
                sun.style.left = Math.random() * 100 + '%';
                sun.style.top = '80%';
                sun.style.fontSize = '24px';
                sun.style.transition = 'all 1.5s ease-out';
                sun.style.zIndex = '101';
                container.appendChild(sun);
                setTimeout(() => {
                    sun.style.transform = `translateY(-200px) scale(1.5) rotate(${Math.random() * 360}deg)`;
                    sun.style.opacity = '0';
                    setTimeout(() => sun.remove(), 1500);
                }, 10);
            }
            
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 1000);
            }, 500);
        }

function updateMood(emotion) {
            // 冗余心情显示已移除，仅保留逻辑以防报错
            const icons = { 'happy': '😊', 'normal': '😐', 'angry': '💢' };
            const texts = { 'happy': '开心', 'normal': '一般', 'angry': '生气' };
            
            // 触发好感度区域的微动效
            const likeDisplay = document.getElementById('like-display');
            if (likeDisplay) {
                likeDisplay.classList.remove('pop');
                void likeDisplay.offsetWidth;
                likeDisplay.classList.add('pop');
            }
        }

function updateStats() {
            document.getElementById('money-value').textContent = gameState.money;
            
            const likeDisplay = document.getElementById('like-display');
            const likeStatItem = document.getElementById('like-stat-item');
            
            let emoji = '😐';
            let text = '一般';
            
            if (gameState.like < 20) { emoji = '💢'; text = '生气'; }
            else if (gameState.like < 40) { emoji = '😐'; text = '一般'; }
            else if (gameState.like < 60) { emoji = '😊'; text = '开心'; }
            else if (gameState.like < 80) { emoji = '😍'; text = '喜欢'; }
            else { emoji = '💖'; text = '心花怒放'; }
            
            // 根据心情微调
            if (gameState.mood === 'angry') emoji = '😡';
            else if (gameState.mood === 'sad') emoji = '🥺';
            else if (gameState.mood === 'happy' && gameState.like >= 60) emoji = '🥰';
            
            likeDisplay.innerHTML = `<span class="like-emoji">${emoji}</span><span>${text}</span>`;
            
            if (gameState.like >= 80) {
                likeStatItem.classList.add('heart-throb-glow');
                unlockPhoto('library_date');
            } else {
                likeStatItem.classList.remove('heart-throb-glow');
            }
            
            if (gameState.like >= 60) {
                unlockPhoto('cafe_date');
            }
            
            if (gameState.heart >= 90) {
                unlockPhoto('high_heart');
            }
        }

function updateDaytimeIndicator() {
            var el = document.getElementById('daytime-indicator');
            if (!el) return;
            if (gameState.isNight) {
                el.textContent = '🌙 夜幕';
                el.className = 'night';
            } else {
                el.textContent = selectData.dateType === '一整天' ? '🌙 全天' : '';
                el.className = '';
            }
        }

function handleLikeClick() {
            if (gameState.like >= 80 && !selectData.isChallenge) {
                if (!gameState.isHintRevealed) {
                    gameState.isHintRevealed = true;
                    showAchievementToast("✨ 你的真诚让她彻底敞开了心扉！");
                    SoundManager.playSting('peak');
                    SFX.heart();
                    const fb = document.getElementById('feedback');
                    fb.innerHTML = `💖 你的真诚让她彻底敞开了心扉！现在你可以看穿她的心思了。`;
                    fb.className = `feedback happy show`;
                    fb.style.display = 'block';
                    showEvent(gameState.currentEvent);
                } else {
                    SFX.pop();
                    showMoodInfo();
                }
            } else if (gameState.like >= 80 && selectData.isChallenge) {
                showAchievementToast("🌪️ 挑战模式下，即使她再开心，你也很难完全猜透她的心思...");
                SFX.pop();
                showMoodInfo();
            } else {
                SFX.pop();
                showMoodInfo();
            }
        }
