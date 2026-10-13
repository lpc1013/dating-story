// 【遗留数据·当前不上架】早期礼物列表（8 件）。现行商店实际售卖的是下方顶层的
// shopGifts（6 件）。本表与 shopGifts 的商品名几乎零重叠，历史上 event-render.js
// 曾误用本表建"背包中文名 → 礼物 id"反查表，导致事件内赠予选项永远注入不出来。
// 现已改为以 shopGifts 为唯一反查来源。本表暂不删除（属内容层，待策划决定复活或清理）。
var gifts = [
            { id: 'flower', name: '红玫瑰', price: 15, like: 10, heart: 5, icon: '🌹', desc: '经典浪漫，没人能拒绝。' },
            { id: 'chocolate', name: '手工巧克力', price: 20, like: 8, heart: 12, icon: '🍫', desc: '甜到心里，心跳加速。' },
            { id: 'perfume', name: '淡雅香水', price: 45, like: 20, heart: 15, icon: '✨', desc: '精致女孩的必备。' },
            { id: 'necklace', name: '纯银项链', price: 80, like: 35, heart: 30, icon: '📿', desc: '永恒的纪念。' },
            { id: 'plush', name: '大白熊公仔', price: 30, like: 15, heart: 10, icon: '🧸', desc: '软绵绵的拥抱感。' },
            { id: 'watch', name: '情侣手表', price: 120, like: 50, heart: 45, icon: '⌚', desc: '记录我们在一起的每一秒。' },
            { id: 'ticket', name: '游乐园门票', price: 60, like: 25, heart: 25, icon: '🎟️', desc: '开启梦幻的一天。' },
            { id: 'camera', name: '拍立得', price: 150, like: 60, heart: 50, icon: '📷', desc: '定格最美的瞬间。' }
        ];

        function showGiftShop() {
            const modal = document.getElementById('gift-modal');
            switchShopTab('shop'); // 默认显示商店
            document.getElementById('gift-modal').classList.add('show');
        }

        function switchShopTab(tab) {
            const shopTab = document.getElementById('tab-shop');
            const invTab = document.getElementById('tab-inventory');
            const shopList = document.getElementById('gift-list');
            const invView = document.getElementById('inventory-view');
            const title = document.getElementById('shop-title');

            if (tab === 'shop') {
                shopTab.classList.add('active');
                invTab.classList.remove('active');
                shopList.style.display = 'block';
                invView.style.display = 'none';
                title.textContent = '🎁 礼物商店';
                renderShopList();
            } else {
                invTab.classList.add('active');
                shopTab.classList.remove('active');
                shopList.style.display = 'none';
                invView.style.display = 'block';
                title.textContent = '🎒 我的背包';
                updateInventoryUI();
            }
        }

// 【现行商店商品·唯一数据源】原先定义在 renderShopList() 函数内部，外部（尤其是
// js/event-render.js 的 injectItemChoices）无法读取，只能退而使用上方的遗留 gifts 表，
// 造成"背包中文名 → 礼物 id"反查恒失败。现提升为顶层变量，供商店渲染与事件内赠予共用。
// 铁律：顶层模块变量用 var（不可用 const），否则外部脚本无法 override 且重复声明会抛错。
// 商品构成/价格/数值保持原样，未作任何改动。
var shopGifts = [
                { id: 'milktea', name: '奶茶', price: 15, like: 2, heart: 1, icon: '🧋', desc: '全糖去冰，她的最爱', longDesc: '一杯温热的奶茶，是冬日里最简单的幸福。', quote: '手心的温度，刚刚好。' },
                { id: 'rose', name: '永生玫瑰', price: 120, like: 20, heart: 10, icon: '🌹', desc: '永不凋谢的爱', longDesc: '这朵玫瑰，象征着我对你永恒的爱意。', quote: '爱，永不凋零。' },
                { id: 'doll', name: '毛绒玩偶', price: 35, like: 5, heart: 2, icon: '🧸', desc: '软绵绵的，治愈心情', longDesc: '一只憨态可掬的玩偶，希望能代替我陪伴你。', quote: '它会替我守护你的梦。' },
                { id: 'necklace', name: '精美项链', price: 80, like: 12, heart: 6, icon: '📿', desc: '闪耀的光芒，见证心动', longDesc: '璀璨的项链，在你的颈间闪耀着永恒的光芒。', quote: '你比珠宝更耀眼。' },
                { id: 'candle', name: '香薰蜡烛', price: 45, like: 8, heart: 4, icon: '🕯️', desc: '淡淡的香气，舒缓身心', longDesc: '点燃这支蜡烛，让宁静的香气弥漫在你们之间。', quote: '愿这香气带走你的疲惫。' },
                { id: 'custom', name: '定制礼物', price: 50, like: 10, heart: 10, icon: '🎨', desc: '消耗50元 and 30心动值，亲手制作独一无二的礼物', isCustom: true }
            ];

        function renderShopList() {
            const list = document.getElementById('gift-list');
            list.innerHTML = '';

            shopGifts.forEach(gift => {
                const canBuy = gift.isCustom ? (gameState.money >= gift.price && gameState.heart >= 30) : (gameState.money >= gift.price);
                const item = document.createElement('div');
                item.className = 'gift-item';
                item.innerHTML = `
                    <div class="gift-icon">${gift.icon}</div>
                    <div class="gift-info">
                        <div class="gift-name">${gift.name}</div>
                        <div class="gift-price">价格: ${gift.price}元 ${gift.isCustom ? '(需30心动值)' : ''}</div>
                        <div style="font-size: 10px; color: #999;">${gift.desc}</div>
                    </div>
                    <button class="buy-gift-btn" ${canBuy ? '' : 'disabled'} onclick='buyGiftFromShop(${JSON.stringify(gift)})'>购买</button>
                `;
                list.appendChild(item);
            });
        }

        function hideGiftShop() {
            document.getElementById('gift-modal').classList.remove('show');
        }

        function buyGiftFromShop(gift) {
            if (gift.isCustom) {
                if (gameState.money < gift.price || gameState.heart < 30) {
                    showToast("余额或心动值不足 (需50元 & 30心动值)", 'warn');
                    return;
                }
                showCustomGiftModal();
                return;
            }
            
            if (gameState.money < gift.price) {
                showToast("余额不足", 'warn');
                return;
            }
            gameState.money -= gift.price;
            
            gameState.like = Math.min(100, gameState.like + gift.like);
            gameState.heart = Math.min(100, gameState.heart + gift.heart);
            
            addToInventory(gift.name, gift.icon, gift.longDesc || gift.desc, gift.quote);
            
            gameState.journalEntries.push({
                event: '🎁 礼物',
                eventName: '赠送礼物',
                choice: `购买并赠送了${gift.name}`,
                moneyChange: -gift.price,
                likeChange: gift.like,
                heartChange: gift.heart
            });

            updateStats();
            unlockPhoto('first_gift');
            
            // 添加成功特效
            const stats = document.querySelectorAll('.stat-value');
            stats.forEach(s => {
                s.classList.remove('stat-pop');
                void s.offsetWidth; // 触发重绘
                s.classList.add('stat-pop');
            });

            SoundManager.playSfx('buy');
            hideGiftShop();
            
            const fb = document.getElementById('feedback');
            if (gift.id === 'milktea') {
                fb.innerHTML = `“谢谢你的奶茶，味道很不错。” <span class="emotion-icon">🧋</span>`;
                fb.className = `feedback happy show`;
                showToast(`送出了${gift.name}`, 'reward');
            } else {
                fb.innerHTML = `“谢谢你的${gift.name}，我很喜欢！” <span class="emotion-icon">😊</span>`;
                fb.className = `feedback happy show`;
                showToast(`送出了${gift.name}`, 'reward');
            }
            
            // 购买特效 - 简化
            const container = document.querySelector('.container');
            const heart = document.createElement('div');
            heart.innerHTML = '❤️';
            heart.style.position = 'absolute';
            heart.style.left = '50%';
            heart.style.top = '50%';
            heart.style.fontSize = '40px';
            heart.style.transition = 'all 0.8s ease-out';
            heart.style.zIndex = '1000';
            heart.style.transform = 'translate(-50%, -50%)';
            container.appendChild(heart);
            setTimeout(() => {
                heart.style.transform = 'translate(-50%, -100px) scale(1.5)';
                heart.style.opacity = '0';
                setTimeout(() => heart.remove(), 800);
            }, 10);
        }

        var selectData = { weather: '晴天', difficulty: '简单', money: 30, isChallenge: false, dateType: '白天' };

        function selectDateType(type) {
            selectData.dateType = type;
            document.querySelectorAll('.date-type-btn').forEach(b => b.classList.remove('active'));
            const activeBtn = document.querySelector(`[data-type="${type}"]`);
            if (activeBtn) activeBtn.classList.add('active');
        }

        var weatherThemes = {
            '晴天': {
                header: 'linear-gradient(45deg, #ff6b6b, #ffa500)',
                body: 'linear-gradient(135deg, #fff9c4, #fffde7)'
            },
            '多云': {
                header: 'linear-gradient(45deg, #78909c, #b0bec5)',
                body: 'linear-gradient(135deg, #eceff1, #cfd8dc)'
            },
            '雨天': {
                header: 'linear-gradient(45deg, #3949ab, #5c6bc0)',
                body: 'linear-gradient(135deg, #e8eaf6, #c5cae9)'
            },
            '雪天': {
                header: 'linear-gradient(45deg, #0288d1, #29b6f6)',
                body: 'linear-gradient(135deg, #e1f5fe, #b3e5fc)'
            },
            '黑夜': {
                header: 'linear-gradient(45deg, #1a237e, #311b92)',
                body: 'linear-gradient(135deg, #121212, #1a1a1a)'
            }
        };

        // ⚠️ 全局 gameState 唯一声明在 js/game-init.js（含 initGame() 重置逻辑）。
        // 此处曾重复声明 var gameState，靠加载顺序覆盖生效；且其字段（claimedRewards/isNight/
        // nightTriggerEvent 等）在 initGame() 重置后丢失，导致聊天崩溃与黑夜永不触发——已删除，
        // 相关字段已统一收敛到 game-init.js 的顶层声明与 initGame() 重置中。

        