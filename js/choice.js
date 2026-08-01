// js/choice.js — 从 achievements.js 拆分（功能：选项结算）

var RESTAURANT_SEQUENCE = ['餐厅点菜', '餐厅点汤', '餐厅点甜品'];

        function pulseStat(el) {
            if (!el) return;
            el.classList.remove('stat-pulse');
            void el.offsetWidth;
            el.classList.add('stat-pulse');
        }

function restaurantBranch(choice) {
            if (choice.branch === 'good' || choice.branch === 'bad') return choice.branch;
            const arr = choice.achievements || (choice.achievement ? [choice.achievement] : []);
            if (arr.includes('我懂你')) return 'good';
            if (arr.includes('分手饭')) return 'bad';
            return null;
        }

function handleChoiceAchievements(choice, event) {
            // —— 餐厅三连：记录本次选择分支，凑齐三事件后判定 ——
            const seqIdx = RESTAURANT_SEQUENCE.indexOf(event.title);
            if (seqIdx >= 0) {
                if (!Array.isArray(gameState.restaurantChoices)) gameState.restaurantChoices = [];
                gameState.restaurantChoices[seqIdx] = restaurantBranch(choice);
                if (seqIdx === RESTAURANT_SEQUENCE.length - 1) {
                    const done = gameState.restaurantChoices;
                    const allGood = done.every(b => b === 'good');
                    const allBad = done.every(b => b === 'bad');
                    if (allGood) unlockAchievement('我懂你', '我懂你');
                    else if (allBad) unlockAchievement('分手饭', '分手饭');
                }
                return; // 餐厅三连途中不触发其他成就
            }

            // —— 普通成就：单选项即解锁（摩天轮之吻/雨中情话 已用 reqLike 控可见性）——
            if (choice.achievement) {
                unlockAchievement(choice.achievement, choice.achievement);
            }
        }

function makeChoice(choice, event) {
            // —— 回放中禁止手动交互 ——
            if (gameState.isReplaying) { showToast('⏯️ 回放中，请等待自动播放', 'system'); return; }

            SoundManager.playSfx('choice');

            // —— 好感度锁拦截（防御：正常情况选项已被隐藏，这里兜底）——
            if (choice.reqLike != null && gameState.like < choice.reqLike) {
                showToast(`🔒 好感度达到 ${choice.reqLike} 才能解锁这个选择`, 'warn');
                return;
            }

            // 立即清空选项，防止反馈停留期间重复点击导致跳事件/重复结算（过渡期无锁竞态）
            const choicesEl = document.getElementById('choices');
            if (choicesEl) choicesEl.innerHTML = '';

            if (selectData.isChallenge && choice.emotion === 'angry') {
                showMoodEnd();
                return;
            }

            const mod = difficultyModifiers[selectData.difficulty] || { pos: 1, neg: 1 };
            const wMod = weatherModifiers[selectData.weather] || { pos: 1, neg: 1 };
            
            const scaleValue = (val, isHeart = false) => {
                if (val === 0) return 0;
                let multiplier = val > 0 ? (mod.pos * wMod.pos) : (mod.neg * wMod.neg);
                
                // 挑战模式：数值更极端
                if (selectData.isChallenge) {
                    multiplier *= (val > 0 ? 0.8 : 2.0);
                }

                // 黑夜模式：变化翻倍
                if (gameState.isNight) {
                    multiplier *= 2.0;
                }

            // 困难/挑战难度附加值调整
            if (selectData.difficulty === '困难' || selectData.difficulty === '挑战' || selectData.isChallenge) {
                if (val > 0) {
                    multiplier *= (isHeart ? 0.55 : 0.7);
                } else if (val < 0) {
                    multiplier *= 1.5;
                }
            }

                return Math.round(val * multiplier);
            };

            const moneyChange = scaleValue(choice.money);
            const likeChange = scaleValue(choice.like);
            const heartChange = scaleValue(choice.heart, true);

            gameState.money += moneyChange;
            gameState.like = Math.min(100, Math.max(0, gameState.like + likeChange));
            gameState.heart = Math.min(100, Math.max(0, gameState.heart + heartChange));
            
            // 更新波动记录
            gameState.minLike = Math.min(gameState.minLike, gameState.like);
            gameState.maxLike = Math.max(gameState.maxLike, gameState.like);

            gameState.journalEntries.push({
                event: gameState.currentEvent + 1,
                eventName: event.title,
                choice: choice.text,
                moneyChange: moneyChange,
                likeChange: likeChange,
                heartChange: heartChange
            });

            updateStats();

            // 顶部数值脉冲反馈
            if (moneyChange !== 0) pulseStat(document.querySelector('#money-value') && document.querySelector('#money-value').closest('.stat-pill-item'));
            if (likeChange !== 0) pulseStat(document.getElementById('like-stat-item'));

            // ===== 开发者跳转运行时 =====
            if (selectData && selectData.variantKey && devMode.jumps) {
                if (!gameState.choicesMade) gameState.choicesMade = {};
                // 找到当前选项在事件中的索引
                var curChoiceIdx = -1;
                if (event && event.choices) {
                    for (var ci = 0; ci < event.choices.length; ci++) {
                        if (event.choices[ci] === choice) { curChoiceIdx = ci; break; }
                    }
                }
                gameState.choicesMade[gameState.currentEvent] = curChoiceIdx;
                
                var jk = Object.keys(devMode.jumps);
                for (var ji=0; ji<jk.length; ji++) {
                    var parts = jk[ji].split('|');
                    if (parts[0] === selectData.variantKey && parseInt(parts[1]) === gameState.currentEvent && parseInt(parts[2]) === curChoiceIdx) {
                    var jump = devMode.jumps[jk[ji]];
                    if (jump.type === 'end') {
                        if (jump.target === '好结局') { setTimeout(function(){ showResult(); }, feedbackDwell(choice.feedback)); return; }
                        if (jump.target === '坏结局') { setTimeout(function(){ showBadEnd(); }, feedbackDwell(choice.feedback)); return; }
                    }
                    if (jump.type === 'event' || jump.type === 'option') {
                        var tgtParts = jump.target.split('#');
                        if (tgtParts.length >= 2) {
                            var tgtIdx = parseInt(tgtParts[1]);
                            setTimeout(function(){ gameState.currentEvent = tgtIdx; showEvent(tgtIdx); }, feedbackDwell(choice.feedback));
                            return;
                        }
                    }
                    break;
                }
            }
            } // end 开发者跳转运行时（devMode.jumps 检查）

            // 触发成就（含跨事件连判：餐厅三连）
            handleChoiceAchievements(choice, event);

            // 获得物品（story.json 的 choice.reward / event.giveItem）
            if (window.checkEventItem) window.checkEventItem(event, choice, -1);
            // 消耗物品（story.json 的 choice.useItem）
            if (choice.useItem && window.useItem) window.useItem(choice.useItem);
            
            // 触发照片
            if (choice.photo) {
                triggerCamera(choice.photo);
            }

            updateMood(choice.emotion);
            checkStatsAchievements();

            const fb = document.getElementById('feedback');
            fb.innerHTML = choice.feedback || '';
            fb.className = 'feedback ' + (choice.emotion || 'normal') + ' show';

            // 检查结局
            if (gameState.money <= 0 || gameState.like <= 0 || gameState.heart <= 0) {
                setTimeout(() => {
                    showBadEnd();
                }, feedbackDwell(choice.feedback));
                return;
            }

            setTimeout(() => {
                gameState.currentEvent++;
                showEvent(gameState.currentEvent);
            }, feedbackDwell(choice.feedback));
        }
