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
            gameState.journalEntries.forEach((e, i) => {
                const node = document.createElement('div');
                node.className = 'tl-node';
                const dot = e.likeChange >= 0 ? 'tl-dot-good' : 'tl-dot-bad';
                const weatherEmoji = selectData.weather === '雪天' ? '❄️' : selectData.weather === '雨天' ? '🌧️' : selectData.weather === '多云' ? '⛅' : '☀️';
                let html = `<div class="tl-dot ${dot}" style="background:${wColor}"></div>`;
                html += `<div style="font-size:11px;color:var(--muted);">${weatherEmoji} 第${e.event}幕 · ${escHtml(e.eventName || '')}</div>`;
                html += `<div style="margin:6px 0;">${e.likeChange >= 0 ? '✅' : '⚠️'} ${escHtml(e.choice)}</div>`;
                if (e.moneyChange !== 0 || e.likeChange !== 0) {
                    html += '<div style="font-size:11px;color:var(--muted);">';
                    if (e.moneyChange !== 0) html += `💰${e.moneyChange>0?'+':''}${e.moneyChange} `;
                    if (e.likeChange !== 0) html += `❤️${e.likeChange>0?'+':''}${e.likeChange}`;
                    html += '</div>';
                }
                // 只展示本事件拍下的照片（条目在 makeChoice 时记录了 choice.photo）——
                // 此前把所有已解锁照片塞进每一条目，照片与事件完全错位。
                if (e.photo && albumPhotos) {
                    const info = albumPhotos.find(a => a.id === e.photo);
                    if (info && info.url) {
                        // E-6 同源教训：标题/URL 拼进 onclick 必须转义，防半角引号提前闭合属性
                        const urlAttr = escAttr(info.url);
                        const titleAttr = escAttr(info.title);
                        const urlJs = urlAttr.replace(/'/g, '&#39;');
                        const titleJs = titleAttr.replace(/'/g, '&#39;');
                        html += `<img class="tl-photo" src="${urlAttr}" alt="${titleAttr}" onclick="showCgLightbox('${urlJs}','${titleJs}')" title="点击看大图">`;
                    }
                }
                node.innerHTML = html;
                node.style.animationDelay = (i * 0.1) + 's';
                tl.appendChild(node);
            });
            entries.innerHTML = '';
            entries.appendChild(tl);
        }
