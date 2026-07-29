// js/endings.js — 从 achievements.js 拆分（功能：结局）

function showBadEnd() {
            SoundManager.playBgm('bad-end');
            hideAllPanels();
            document.getElementById('game-content').style.display = 'none';
            const badEnd = document.getElementById('bad-end');
            badEnd.style.display = 'flex';
            badEnd.classList.add('show');
            
            // 坏结局粒��
            setTimeout(() => spawnEndingParticles('bad'), 300);
            
            let title = "约会宣告失败";
            let desc = "";
            if (gameState.money <= 0) {
                title = "资金链断裂";
                desc = "在约会中耗尽了所有积蓄，这让你感到非常尴尬。没有物质基础的浪漫终究是空中楼阁。";
            } else if (gameState.like <= 0) {
                title = "彻底心碎";
                desc = "你的言行举止彻底惹恼了她。她头也不回地离开了，只留下你一个人在原地。";
            } else if (gameState.heart <= 0) {
                title = "心动消失";
                desc = "约会过程平淡如水，甚至让她感到了厌烦。那种心动的感觉已经消失殆尽。";
            }
            
            document.getElementById('bad-end-title').textContent = title;
            document.getElementById('bad-end-desc').textContent = desc;
            
            // 复盘提示：具体数据
            let recap = '';
            if (gameState.money <= 0) recap = '💰 资产耗尽：最后的 ' + Math.abs(gameState.money || 0) + ' 元也用光了';
            else if (gameState.like <= 0) recap = '💔 好感归零：累计好感 ' + (gameState.maxLike || 0) + ' → ' + gameState.like;
            else if (gameState.heart <= 0) recap = '💫 心动消失：她对你失去了兴趣';
            else recap = '⚠️ 多项数值触底，请检查资产/好感/心动值';
            document.getElementById('bad-end-recap').textContent = recap;
            
            // 优化反馈框显示
            const descEl = document.getElementById('bad-end-desc');
            descEl.style.opacity = '0';
            descEl.style.transform = 'translateY(10px)';
            setTimeout(() => {
                descEl.style.transition = 'all 0.6s ease-out';
                descEl.style.opacity = '1';
                descEl.style.transform = 'translateY(0)';
            }, 300);
            
            checkStatsAchievements(true);
        }

function showMoodEnd() {
            SoundManager.playBgm('mood-end');
            hideAllPanels();
            document.getElementById('game-content').style.display = 'none';
            const moodEnd = document.getElementById('mood-end');
            moodEnd.style.display = 'flex';
            moodEnd.classList.add('show');
            
            // 优化反馈框显示
            const content = moodEnd.querySelector('.end-message');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    content.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    content.style.opacity = '1';
                    content.style.transform = 'scale(1)';
                }, 300);
            }
            checkStatsAchievements(true);
        }

function spawnEndingParticles(type) {
            const container = document.getElementById('game-container');
            if (!container) return;
            // 移除旧粒子
            const old = container.querySelector('.ending-particles-canvas');
            if (old) old.remove();

            const canvas = document.createElement('canvas');
            canvas.className = 'ending-particles-canvas';
            Object.assign(canvas.style, {
                position:'absolute',inset:'0',zIndex:'999',pointerEvents:'none',
                width:'100%',height:'100%'
            });
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');

            const particles = [];
            const colors = type === 'good' 
                ? ['#ff6b6b','#ffa500','#ff85a2','#ffd700','#ff9ec4','#ff758c']
                : type === 'bad'
                ? ['#666','#888','#999','#555','#777','#aaa']
                : ['#9b7fd4','#c9b8f0','#6b5b95','#e0a3c4','#8ab4f8'];

            for (let i = 0; i < 60; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: type === 'good' ? canvas.height + Math.random() * 50 : Math.random() * -50,
                    size: type === 'bad' ? Math.random() * 4 + 2 : Math.random() * 6 + 3,
                    speed: Math.random() * 1.5 + 0.5,
                    drift: (Math.random() - 0.5) * 1.2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.08,
                    opacity: Math.random() * 0.7 + 0.3
                });
            }

            let animId;
            function animate() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                let alive = false;
                particles.forEach(p => {
                    if (type === 'good') p.y -= p.speed; else p.y += p.speed;
                    p.x += p.drift;
                    p.rotation += p.rotSpeed;
                    if (p.y > -20 && p.y < canvas.height + 20) {
                        alive = true;
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate(p.rotation);
                        ctx.globalAlpha = p.opacity;
                        ctx.fillStyle = p.color;
                        if (type === 'bad') {
                            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                        } else {
                            ctx.beginPath();
                            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    }
                });
                if (alive) animId = requestAnimationFrame(animate);
                else { canvas.remove(); cancelAnimationFrame(animId); }
            }
            animate();
        }

function showEndingGallery() {
            let history = [];
            try { const raw = localStorage.getItem('dating-history'); if(raw) history = JSON.parse(raw); } catch(e) {}
            if(!history.length) { showToast('📭 还没有完成过任何约会', 'warn'); return; }
            hideAllPanels();
            const panel = document.getElementById('journal');
            panel.style.display = 'flex'; panel.style.flexDirection='column'; panel.classList.add('show');
            const entries = document.getElementById('journal-entries');
            const stars = (l) => '⭐'.repeat(Math.min(5,Math.floor(l/20)));
            entries.innerHTML = '<h4 style="margin-bottom:12px;">🖼️ 结局画廊</h4>' +
              history.slice().reverse().map((h,i) => '<div style="background:var(--bg-card);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid var(--border-light);">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<span style="font-weight:600;font-size:13px;">#'+(history.length-i)+' '+h.weather+'</span>' +
                '<span style="font-size:18px;">'+stars(h.like)+'</span></div>' +
                '<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">好感'+h.like+' · '+h.difficulty+' · '+new Date(h.time).toLocaleDateString()+'</div>' +
                (h.grade?'<div style="font-size:10px;color:#ffd700;margin-top:2px;">'+h.grade+'</div>':'') +
                '</div>').join('') +
                '<button class="back-btn" onclick="hideAllPanels();var j=document.getElementById(\'journal\');if(j)j.style.display=\'none\';">关闭</button>';
        }
