// js/gift.js — 从 achievements.js 拆分（功能：礼物系统）

// Wave 2A：原 8 件随机掉落物已升格为剧情信物（见 js/backpack.js 的 ITEMS 与 data/story.json
// 的 reward / requireItem 挂点），掉落池整体废除。此处保留函数壳并恒返回 false，避免历史调用点报错。
function triggerRandomDrop() {
            return false;
        }

function showCustomGiftModal() {
            hideGiftShop();
            document.getElementById('custom-gift-modal').classList.add('show');
            setupCustomGiftListeners();
            updateGiftPreview();
        }

function hideCustomGift() {
            document.getElementById('custom-gift-modal').classList.remove('show');
            showGiftShop();
        }

var customGiftData = { shape: '🎁', color: '🔴', decor: '🎀' };

function createCustomGift() {
            if (gameState.money < 50 || gameState.heart < 30) return;
            
            gameState.money -= 50;
            gameState.heart -= 30;
            
            const giftName = `定制的${customGiftData.shape}`;
            const bonusLike = 25;
            const bonusHeart = 25;
            
            gameState.like = Math.min(100, gameState.like + bonusLike);
            gameState.heart = Math.min(100, gameState.heart + bonusHeart);
            
            addToInventory(giftName, customGiftData.shape, '你亲手制作的礼物，独一无二。', '每一处细节都藏着我的心意。');
            
            gameState.journalEntries.push({
                event: '🎨 定制',
                eventName: '亲手制作礼物',
                choice: `制作了${customGiftData.color}${customGiftData.shape}${customGiftData.decor}`,
                moneyChange: -50,
                likeChange: bonusLike,
                heartChange: bonusHeart
            });

            updateStats();
            hideCustomGift();
            hideGiftShop();
            
            SoundManager.playSfx('buy');
            showToast(`制作成功！她非常喜欢这个${giftName}`, 'reward');
            unlockAchievement('custom_creator', '灵魂画师');
            
            // 特殊反馈
            const feedback = [
                "“哇，这是你亲手做的吗？我会好好珍惜的！”",
                "“好精致的礼物，感觉到了你的心意呢。”",
                "“这个颜色和形状，真的很有你的风格。”"
            ];
            const msg = feedback[Math.floor(Math.random() * feedback.length)];
            const fb = document.getElementById('feedback');
            fb.innerHTML = `💖 ${msg}`;
            fb.className = 'feedback happy show';
            setTimeout(() => fb.classList.remove('show'), feedbackDwell(msg));
        }

function setupCustomGiftListeners() {
            const items = document.querySelectorAll('#custom-gift-modal .option-item');
            items.forEach(item => {
                item.onclick = function() {
                    const type = this.getAttribute('data-type');
                    const val = this.getAttribute('data-val');
                    
                    // 更新数据
                    customGiftData[type] = val;
                    
                    // 更新 UI
                    const parent = this.parentElement;
                    parent.querySelectorAll('.option-item').forEach(i => i.classList.remove('active'));
                    this.classList.add('active');
                    
                    updateGiftPreview();
                };
            });
        }

function updateGiftPreview() {
            const preview = document.getElementById('gift-preview');
            preview.textContent = customGiftData.shape;
            // 简单模拟叠加效果
            preview.innerHTML = `
                <div style="position: relative;">
                    ${customGiftData.shape}
                    <div style="position: absolute; top: -10px; right: -10px; font-size: 25px;">${customGiftData.decor}</div>
                    <div style="position: absolute; bottom: -10px; left: -10px; font-size: 20px; opacity: 0.7;">${customGiftData.color}</div>
                </div>
            `;
        }
