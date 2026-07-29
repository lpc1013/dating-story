// js/inventory.js — 从 achievements.js 拆分（功能：背包面板）

function showInventory() {
            showGiftShop();
            switchShopTab('inventory');
        }

function hideInventory() {
            hideGiftShop();
        }

function updateInventoryUI() {
            const grid = document.getElementById('inventory-grid');
            grid.innerHTML = '';
            
            const items = Object.keys(gameState.inventory);
            if (items.length === 0) {
                grid.innerHTML = '<div class="inventory-empty">背包空空如也，快去商店看看吧~</div>';
                return;
            }
            
            items.forEach(name => {
                const item = gameState.inventory[name];
                const div = document.createElement('div');
                div.className = 'inventory-item';
                div.onclick = () => showItemDetail(name, item);
                div.innerHTML = `
                    <span class="icon">${item.icon}</span>
                    <span style="font-size: 10px; margin-top: 5px; text-align: center; color: #666;">${name}</span>
                    <span class="count">${item.count}</span>
                `;
                grid.appendChild(div);
            });
        }

function showItemDetail(name, item) {
            const modal = document.createElement('div');
            modal.className = 'achievement-modal show';
            modal.style.zIndex = '1000';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="modal-icon">${item.icon}</span>
                    <span class="modal-title">${name}</span>
                    <span class="modal-desc">${item.description || '一件充满回忆的小礼物。'}</span>
                    <div class="modal-condition" style="margin-top: 10px; font-style: italic; color: #ff8e8e;">
                        “${item.quote || '愿这份美好永远留存。'}”
                    </div>
                    <button class="modal-close-btn" onclick="this.parentElement.parentElement.remove()">收起</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

function addToInventory(name, icon, description = '', quote = '') {
            // 修复 undefined 错误
            if (!name || name === 'undefined' || name === 'null') {
                name = '神秘礼物';
            }
            
            if (gameState.inventory[name]) {
                gameState.inventory[name].count++;
            } else {
                gameState.inventory[name] = { 
                    icon, 
                    count: 1, 
                    description, 
                    quote 
                };
            }
            
            // 检查全收集成就
            const totalUniqueGifts = 8;
            if (Object.keys(gameState.inventory).length >= totalUniqueGifts) {
                unlockAchievement('collector');
            }
            
            updateInventoryUI();
        }
