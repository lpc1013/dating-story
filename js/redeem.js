// js/redeem.js — 从 achievements.js 拆分（功能：兑换码）

function showRedeemModal() {
            document.getElementById('redeem-modal').classList.add('show');
            document.getElementById('redeem-input').value = '';
            document.getElementById('redeem-msg').textContent = '';
        }

function hideRedeemModal() {
            document.getElementById('redeem-modal').classList.remove('show');
        }

function redeemCode() {
            const input = document.getElementById('redeem-input').value.trim();
            const msg = document.getElementById('redeem-msg');
            
            if (gameState.usedCodes.includes(input)) {
                msg.style.color = '#ff9800';
                msg.textContent = '该兑换码已使用过';
                return;
            }

            let amount = 0;
            if (input === '20251010') amount = 1010;
            else if (input === '170') amount = 170;
            else if (input === '19') amount = 19;
            
            if (amount > 0) {
                gameState.money += amount;
                gameState.usedCodes.push(input);
                updateStats();
                msg.style.color = '#4caf50';
                msg.textContent = `兑换成功！获得 ${amount} 金钱`;
                SoundManager.playSfx('buy');
                showToast(`获得 ${amount} 金钱`, 'reward');
            } else {
                msg.style.color = '#f44336';
                msg.textContent = '无效的兑换码';
            }
        }
