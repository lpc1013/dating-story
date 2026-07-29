// js/result.js — 从 achievements.js 拆分（功能：结算页）

function showResult() {
            SoundManager.playBgm('ending');
            checkStatsAchievements(true);
            hideAllPanels();
            document.getElementById('game-content').style.display = 'none';
            document.getElementById('result').style.display = 'flex';
            document.getElementById('result').classList.add('show');
            
            // 好结局粒子
            setTimeout(() => spawnEndingParticles('good'), 300);
            // 刷新音乐馆解锁状态
            if (typeof MusicGallery !== 'undefined' && MusicGallery.inited) MusicGallery.renderList();
            
            // 结局对比
            try {
              const raw = localStorage.getItem('dating-history');
              if (raw) {
                const history = JSON.parse(raw);
                if (history.length >= 2) {
                  const prev = history[history.length - 2];
                  const diff = gameState.like - (prev.like || 0);
                  const cmp = document.createElement('div');
                  cmp.style.cssText = 'font-size:11px;color:var(--text-muted);text-align:center;padding:8px;margin-top:8px;background:var(--bg-chip);border-radius:8px;';
                  cmp.textContent = '📊 与上次对比：好感' + (diff >= 0 ? '+' : '') + diff + ' · 上次天气：' + (prev.weather || '?');
                  document.getElementById('result').querySelector('.end-wrap')?.insertBefore(cmp, document.getElementById('result').querySelector('.end-wrap').firstChild);
                }
              }
            } catch(e) {}
            
            // 重置并触发卡片动画
            const cards = document.querySelectorAll('.stat-card');
            if (cards.length) {
                cards.forEach(card => card.classList.remove('animate'));
                void cards[0].offsetWidth; // 强制重绘
                cards.forEach(card => card.classList.add('animate'));
            }

            document.getElementById('final-money').textContent = gameState.money;
            document.getElementById('final-like').textContent = gameState.like;
            
            // 评价逻辑 — 拆分为 结局名 + 她的话 + 评语 + 亮点回顾
            let grade = "", herQuote = "", commentary = "", highlight = "";
            let stars = 0;
            const score = gameState.like + gameState.heart;
            const photoCount = gameState.unlockedPhotos.length;
            const journal = gameState.journalEntries || [];
            const romanticCount = journal.filter(e => e.likeChange >= 8).length;
            const spentTotal = journal.reduce((s,e) => s + (e.moneyChange < 0 ? -e.moneyChange : 0), 0);
            
            if (selectData.isChallenge && score >= 180) {
                grade = "隐藏结局 · 征服冰山";
                herQuote = "我从未想过，像我这样的人也会被彻底看穿。";
                commentary = "在最极端的挑战下，你赢得了她全部的心。你是真正的恋爱大师。";
                stars = 5;
                highlight = "在挑战模式的严苛条件下，你创造了 " + score + " 分的惊人成绩，好感度始终坚挺。";
                unlockAchievement('challenge_master', '极限挑战者');
            } else if (gameState.money >= 150) {
                grade = "隐藏结局 · 豪门盛宴";
                herQuote = "虽然约会很奢华，但我总觉得你是在用钱买我的笑容。";
                commentary = "你挥金如土的阔气让她印象深刻，但似乎少了点真诚。下次或许少花点钱，多花点心思？";
                stars = 3;
                highlight = "本次约会总花费 " + spentTotal + " 元，是当之无愧的「金主爸爸」级别。";
                unlockAchievement('sugar_daddy', '金主爸爸');
            } else if (gameState.money === 0 && score >= 160) {
                grade = "隐藏结局 · 贫民窟的浪漫";
                herQuote = "虽然今天花光了最后一分钱，但只要有你在，哪里都是天堂。";
                commentary = "你们用最少的物质创造了最丰富的浪漫。真爱不需要金钱来证明。";
                stars = 5;
                highlight = "口袋空空但分数爆表——" + score + " 分证明有心比有钱重要得多。";
                unlockAchievement('broke_love', '穷光蛋的真爱');
            } else if (photoCount >= 6) {
                grade = "隐藏结局 · 永恒瞬间";
                herQuote = "你拍的照片真好看，我想把它们都洗出来挂在墙上。";
                commentary = "你用镜头记录下了 " + photoCount + " 个心动瞬间，这些就是你们最宝贵的回忆。";
                stars = 5;
                highlight = "一路上你拍下了 " + photoCount + " 张照片，每一张都是属于你们的独家记忆。";
                unlockAchievement('master_photographer', '摄影大师');
            } else if (score < 60 && gameState.money > 0) {
                grade = "隐藏结局 · 钢铁直男";
                herQuote = "你人挺好的，但我们可能真的不太合适。";
                commentary = "你成功避开了几乎所有让她心动的选项。约会氛围降到了冰点，但她至少没有直接走人。";
                stars = 1;
                highlight = "只有 " + romanticCount + " 次让她心动——下次勇敢一点，别再做选择题了。";
                unlockAchievement('iron_man', '钢铁直男');
            } else if (score >= 195) {
                grade = "传说结局 · 灵魂契约";
                herQuote = "在这个世界上，我最庆幸的事就是那天遇见了你。";
                commentary = "你们的感情已经超越了言语，成为了彼此生命中不可或缺的一部分。这是传说中的默契。";
                stars = 5;
                highlight = romanticCount + " 次让她心花怒放——你几乎做对了每一个选择，堪称约会教科书。";
                unlockAchievement('soul_mate_end', '灵魂伴侣');
            } else if (score >= 170) {
                grade = "完美结局 · 心动频率";
                herQuote = "和你在一起的每一秒，我的心跳都在加速。";
                commentary = "你完美地掌握了浪漫的节奏，好感度 " + gameState.like + " + 心动值 " + gameState.heart + "，她对你的爱意已经满溢。";
                stars = 4;
                highlight = romanticCount + " 个浪漫时刻 + " + photoCount + " 张照片——今天的约会足以让人回味很久。";
            } else if (score >= 130) {
                grade = "优秀结局 · 温馨午后";
                herQuote = "谢谢你，给了我一个这么开心的约会。";
                commentary = "虽然没有惊天动地的浪漫，但那种细水长流的温馨更让人心动。好感度 " + gameState.like + "，她记住了你的好。";
                stars = 3;
                highlight = "你做得不错！再多 " + romanticCount + " 次让人心跳加速的瞬间，也许就能更进一步。";
            } else if (score >= 90) {
                grade = "普通结局 · 朋友以上";
                herQuote = "今天玩得很开心，下次再约吧。";
                commentary = "你们之间有着不错的好感，但似乎还缺少一点点让心跳漏掉一拍的火花。";
                stars = 2;
                highlight = "只有 " + romanticCount + " 次让她心跳加速——下次大胆一点，勇敢表达你的心意。";
            } else {
                grade = "遗憾结局 · 擦肩而过";
                herQuote = "也许，我们更适合做普通朋友。";
                commentary = "约会中出现了一些小插曲，让她觉得你们的步调并不一致。但别灰心，这只是第一次。";
                stars = 1;
                highlight = "好感度仅 " + gameState.like + "——下次先做朋友，慢慢了解她的喜好。";
            }

            // ── 一整天专属加成 ──
            if (selectData.dateType === '一整天' && gameState.isNight) {
                highlight += ' 🌙 从白天到深夜，你们一起经历了完整的 ' + journal.length + ' 个故事——黄昏之后的每一刻都格外珍贵。';
                if (stars >= 3) { grade = '🌅 ' + grade; } // 结局名加日落前缀
            }

            document.getElementById('result-grade').textContent = grade;
            document.getElementById('result-her-quote').textContent = '"' + herQuote + '"';
            document.getElementById('final-rating').textContent = commentary;
            document.getElementById('result-highlight').textContent = '💡 ' + highlight;

            // 结算时间轴（简约版选项回顾）
            var timelineEl = document.getElementById('result-timeline');
            if (timelineEl) {
                var tl = (gameState.journalEntries || []).slice(-8);
                timelineEl.innerHTML = '<div style="font-size:11px;color:var(--text-muted);text-align:center;margin:12px 0 4px;">📜 本局回顾</div>' +
                    tl.map(function(e,i){
                        var emoji = (e.likeChange||0) >= 0 ? '✅' : '⚠️';
                        var isNight = gameState.isNight && gameState.nightTriggerEvent >= 0 && e.event > gameState.nightTriggerEvent;
                        return '<div style="display:flex;gap:8px;align-items:center;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border-soft);">' +
                            '<span style="width:18px;text-align:center;">' + (e.event) + '</span>' +
                            '<span style="flex:1;color:var(--text-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + emoji + ' ' + (e.eventName || '') + '</span>' +
                            '<span style="font-size:10px;color:' + (e.likeChange>=0?'#4caf50':'#f44336') + ';">' + (e.likeChange>=0?'+':'') + (e.likeChange||0) + '</span>' +
                            (isNight ? '<span style="font-size:10px;">🌙</span>' : '') +
                            '</div>';
                    }).join('') +
                    (gameState.journalEntries.length > 8 ? '<div style="font-size:10px;color:var(--text-muted);text-align:center;padding:4px;">... 更多详情见日记</div>' : '');
                timelineEl.style.display = 'block';
            }

            const starContainer = document.getElementById('rating-stars');
            starContainer.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const star = document.createElement('span');
                star.className = 'rating-star';
                star.textContent = i < stars ? '⭐' : '☆';
                star.style.animationDelay = (i * 0.15) + 's';
                starContainer.appendChild(star);
                setTimeout(() => star.classList.add('animate'), 10);
            }
            
            // 结局反馈框优化：添加淡入和缩放效果
            const ratingBox = document.querySelector('.rating-box');
            ratingBox.style.opacity = '0';
            ratingBox.style.transform = 'scale(0.9)';
            setTimeout(() => {
                ratingBox.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                ratingBox.style.opacity = '1';
                ratingBox.style.transform = 'scale(1)';
            }, 500);
        }

function renderSlideshow(areaId) {
            const el = document.getElementById(areaId);
            if (!el) return;
            const photos = gameState.unlockedPhotos;
            if (!photos || !photos.length) { el.style.display = 'none'; return; }
            el.style.display = '';
            el.innerHTML = '';
            const imgs = photos.map(p => {
                const info = albumPhotos ? albumPhotos.find(a => a.id === p) : null;
                return { url: info ? info.url : '', title: info ? info.title : p };
            }).filter(x => x.url);
            if (!imgs.length) { el.style.display = 'none'; return; }
            const container = document.createElement('div');
            container.style.cssText = 'position:relative;';
            const img = document.createElement('img');
            img.className = 'slide-photo';
            const cap = document.createElement('div');
            cap.className = 'slide-caption';
            let idx = 0;
            const showSlide = () => {
                const s = imgs[idx];
                img.src = s.url;
                cap.textContent = s.title;
                el.innerHTML = '';
                el.appendChild(container);
                container.appendChild(img);
                container.appendChild(cap);
                img.classList.remove('slide-photo');
                void img.offsetWidth;
                img.classList.add('slide-photo');
            };
            showSlide();
            if (el._slideTimer) clearInterval(el._slideTimer);
            if (imgs.length > 1) {
                let timer = setInterval(() => {
                    idx = (idx + 1) % imgs.length;
                    showSlide();
                }, 2500);
                el._slideTimer = timer;
                el.onclick = () => { clearInterval(el._slideTimer); idx = (idx + 1) % imgs.length; showSlide(); };
            }
        }
