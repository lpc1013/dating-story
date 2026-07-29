// js/journal.js — 从 achievements.js 拆分（功能：日记）

function showJournal(source) {
            SoundManager._prevScene = SoundManager.currentScene;
            SoundManager.playBgm('journal');
            const journal = document.getElementById('journal');
            const entries = document.getElementById('journal-entries');
            entries.innerHTML = '';
            
            // 记录来源以便返回
            journal.dataset.source = source || 'result';
            
            document.getElementById('result').style.display = 'none';
            document.getElementById('result').classList.remove('show');
            document.getElementById('bad-end').style.display = 'none';
            document.getElementById('bad-end').classList.remove('show');
            document.getElementById('mood-end').style.display = 'none';
            document.getElementById('mood-end').classList.remove('show');
            
            journal.style.display = 'flex';
            journal.style.flexDirection = 'column';
            journal.classList.add('show');
            
            const wColor = selectData.weather === '雪天' ? '#839ec4' : selectData.weather === '雨天' ? '#5c7fa7' : selectData.weather === '多云' ? '#8a8a8a' : '#c9a86a';
            const tl = document.createElement('div');
            tl.className = 'tl';
            const photoIds = gameState.unlockedPhotos || [];
            gameState.journalEntries.forEach((e, i) => {
                const node = document.createElement('div');
                node.className = 'tl-node';
                const dot = e.likeChange >= 0 ? 'tl-dot-good' : 'tl-dot-bad';
                const weatherEmoji = selectData.weather === '雪天' ? '❄️' : selectData.weather === '雨天' ? '🌧️' : selectData.weather === '多云' ? '⛅' : '☀️';
                let html = `<div class="tl-dot ${dot}" style="background:${wColor}"></div>`;
                html += `<div style="font-size:11px;color:var(--muted);">${weatherEmoji} 第${e.event}幕 · ${e.eventName || ''}</div>`;
                html += `<div style="margin:6px 0;">${e.likeChange >= 0 ? '✅' : '⚠️'} ${e.choice}</div>`;
                if (e.moneyChange !== 0 || e.likeChange !== 0) {
                    html += '<div style="font-size:11px;color:var(--muted);">';
                    if (e.moneyChange !== 0) html += `💰${e.moneyChange>0?'+':''}${e.moneyChange} `;
                    if (e.likeChange !== 0) html += `❤️${e.likeChange>0?'+':''}${e.likeChange}`;
                    html += '</div>';
                }
                // 如果有拍照事件，显示缩略图
                for (const pId of photoIds) {
                    const info = albumPhotos ? albumPhotos.find(a => a.id === pId) : null;
                    if (info && info.url) {
                        html += `<img class="tl-photo" src="${info.url}" alt="${info.title}" onclick="showCgLightbox('${info.url}','${info.title}')" title="点击看大图">`;
                    }
                }
                node.innerHTML = html;
                node.style.animationDelay = (i * 0.1) + 's';
                tl.appendChild(node);
            });
            entries.innerHTML = '';
            entries.appendChild(tl);
        }
