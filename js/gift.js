// js/gift.js — 从 achievements.js 拆分（功能：礼物系统）

function triggerRandomDrop() {
            if (Math.random() < 0.25) { // 25% 概率
                const randomGifts = [
                    { id: 'candy', name: '幸运糖果', icon: '🍬', like: 3, desc: '甜甜的，像初恋的味道。', quote: '生活虽苦，但你是甜的。' },
                    { id: 'flower', name: '路边的小花', icon: '🌼', like: 5, desc: '虽然平凡，却开得很灿烂。', quote: '想把春天都送给你。' },
                    { id: 'sticker', name: '可爱贴纸', icon: '🏷️', like: 2, desc: '可以贴在任何你喜欢的地方。', quote: '标记属于我们的瞬间。' },
                    { id: 'shell', name: '精致贝壳', icon: '🐚', like: 4, desc: '里面藏着大海的声音。', quote: '听，那是我想你的声音。' },
                    { id: 'clover', name: '四叶草', icon: '🍀', like: 6, desc: '代表着万分之一的幸运。', quote: '遇见你，就是我最大的幸运。' },
                    { id: 'origami', name: '千纸鹤', icon: '🕊️', like: 5, desc: '每一只都承载着一个愿望。', quote: '希望你的每一个明天都快乐。' },
                    { id: 'ribbon', name: '丝绸缎带', icon: '🎀', like: 3, desc: '柔软而细腻的触感。', quote: '想和你紧紧系在一起。' },
                    { id: 'key', name: '心之钥匙', icon: '🔑', like: 8, desc: '传说能打开紧闭的心门。', quote: '我的心，只为你而开。' }
                ];
                
                // 过滤掉已经获得的礼物
                const availableGifts = randomGifts.filter(g => !gameState.inventory[g.name]);
                
                if (availableGifts.length > 0) {
                    const gift = availableGifts[Math.floor(Math.random() * availableGifts.length)];
                    
                    gameState.like = Math.min(100, gameState.like + gift.like);
                    
                    addToInventory(gift.name, gift.icon, gift.desc, gift.quote);
                    updateStats();
                    
                    showToast(`意外惊喜！获得了${gift.icon}${gift.name}`, 'reward');
                    
                    gameState.journalEntries.push({
                        event: '🎁 意外惊喜',
                        eventName: '随机掉落',
                        choice: `在路边捡到了${gift.name}`,
                        moneyChange: 0,
                        likeChange: gift.like,
                        heartChange: 0
                    });
                }
            }
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
