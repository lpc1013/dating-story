        function resolveGameRules(rulesJson) {
            var rules = rulesJson && rulesJson.rules;
            if (!Array.isArray(rules)) { console.warn('[game-rules] 规则为空或格式错误'); return {}; }
            // 建立「英文变体键 → { 事件名→索引, 选项文→索引 }」映射
            var lookups = {};
            if (window.StoryLoader && StoryLoader.variants) {
                Object.entries(StoryLoader.variants).forEach(function(entry) {
                    var cn = entry[0], lines = entry[1];
                    var variantKeys = (window.StoryLoader && StoryLoader.variantKeys && StoryLoader.variantKeys[cn]) || [];
                    for (var li = 0; li < lines.length; li++) {
                        var vk = variantKeys[li] || cn;
                        var evts = lines[li] || [];
                        var evtMap = {}, optMap = {};
                        for (var ei = 0; ei < evts.length; ei++) {
                            var title = evts[ei].title || evts[ei].name || '';
                            evtMap[title] = ei;
                            var choices = evts[ei].choices || evts[ei].options || [];
                            var om = {};
                            for (var ci = 0; ci < choices.length; ci++) {
                                om[choices[ci].text || choices[ci].label || ''] = ci;
                            }
                            optMap[title] = om;
                        }
                        lookups[vk] = { events: evtMap, options: optMap, eventList: evts };
                    }
                });
            }

            var resolved = {};
            var chainId = 1000; // 从高位开始，不与 devMode 手动创建的 chain 冲突

            rules.forEach(function(rule) {
                if (!rule || !rule.at) return;
                var bestVk = null, bestSrcIdx = -1, bestChoiceIdx = -1;

                // 遍历所有变体，找到同时匹配事件名和选项文案的变体
                // 同名事件（如 KTV/甜品下午茶）可能出现在多个变体中，通过选项文案精确匹配。
                // 如果规则指定了 weather 字段，则只在对应变体中查找。
                for (var vk in lookups) {
                    if (rule.weather && vk !== rule.weather) continue;
                    var lk = lookups[vk];
                    if (lk.events[rule.at.event] != null) {
                        var matchIdx = lk.events[rule.at.event];
                        // 如果规则需要匹配选项，则在同变体中验证选项是否存在
                        if (rule.at.when != null) {
                            if (lk.options[rule.at.event] && lk.options[rule.at.event][rule.at.when] != null) {
                                bestVk = vk; bestSrcIdx = matchIdx;
                                bestChoiceIdx = lk.options[rule.at.event][rule.at.when];
                                break; // 精确匹配（事件+选项都命中）
                            }
                            // 事件名匹配但选项不匹配 → 继续找下一个变体
                        } else {
                            // 不需要匹配选项的规则（如 require 类型），取首个匹配
                            bestVk = vk; bestSrcIdx = matchIdx;
                            bestChoiceIdx = -1;
                            break;
                        }
                    }
                }

                if (!bestVk || bestSrcIdx < 0) {
                    console.warn('[game-rules] 未找到精确匹配：事件「' + rule.at.event + '」选项「' + (rule.at.when || '') + '」');
                    return;
                }

                var lk = lookups[bestVk];
                var key = bestVk + '|' + bestSrcIdx + '|' + bestChoiceIdx + '|' + rule.at.event;

                if (rule.type === 'jump') {
                    var tgtIdx = -1;
                    if (rule.then && rule.then.goToEvent && lk) {
                        tgtIdx = lk.events[rule.then.goToEvent];
                    }
                    if (tgtIdx < 0) {
                        console.warn('[game-rules] 未找到目标事件「' + (rule.then && rule.then.goToEvent) + '」');
                        return;
                    }
                    resolved[key] = {
                        type: 'event',
                        fromVar: bestVk,
                        fromEvent: rule.at.event,
                        fromOption: rule.at.when || '',
                        target: bestVk + '#' + tgtIdx + ' ' + rule.then.goToEvent,
                        chain: chainId
                    };
                } else if (rule.type === 'end') {
                    var ending = (rule.then && rule.then.ending === 'good') ? '好结局' : '坏结局';
                    resolved[key] = {
                        type: 'end',
                        fromVar: bestVk,
                        fromEvent: rule.at.event,
                        fromOption: rule.at.when || '',
                        target: ending,
                        chain: chainId
                    };
                } else if (rule.type === 'require') {
                    // require 类型已废弃：隐藏选项机制已移除（改用背包 requireItem 门控，如充电宝）。
                    console.warn('[game-rules] 已忽略 require 类型规则 ' + (rule.id || '') + '（隐藏选项机制已删除）');
                }

                chainId++;
            });

            console.info('[game-rules] 已解析 ' + Object.keys(resolved).length + ' 条运行时规则');
            return resolved;
        }

// ===== 统一数值边界（对抗审计 P1-05 / P1-02 防护）=====
// 任何模块在直接修改 gameState.money / like / heart 后都应调用本函数，
// 确保 like、heart 始终落在 [0,100]，并杜绝 NaN 污染（NaN 会破坏所有大小比较）。
// 说明：money 允许为负（≤0 在主线结算中触发坏结局），此处仅修复 NaN，不强行清零负值。
function clampGameStats() {
    if (typeof gameState === 'undefined' || !gameState) return gameState;
    var fix = function (v) {
        if (typeof v !== 'number' || !isFinite(v)) return 0;
        return Math.min(100, Math.max(0, v));
    };
    gameState.like = fix(gameState.like);
    gameState.heart = fix(gameState.heart);
    if (typeof gameState.money !== 'number' || !isFinite(gameState.money)) gameState.money = 0;
    return gameState;
}

// 统一状态写入入口（P1-05 事务层核心）：任何模块修改 money/like/heart 都应经过本函数，
// 把取值范围约束集中在单一位置，避免散落各文件反复追加防御代码。
function commitStats(patch) {
    if (!gameState) return gameState;
    if (patch) {
        if (typeof patch.money === 'number' && isFinite(patch.money)) gameState.money += patch.money;
        if (typeof patch.like === 'number' && isFinite(patch.like)) gameState.like += patch.like;
        if (typeof patch.heart === 'number' && isFinite(patch.heart)) gameState.heart += patch.heart;
    }
    return clampGameStats();
}

// 一次性奖励分发骨架（P1-02 推荐模式落地）：同一 rewardId 只结算一次，避免重复领取。
// 调用方负责提供唯一 rewardId（如聊天节点 id + 奖励序号）；数值变化统一经 commitStats 收敛。
function applyEffects(effects) {
    if (!effects) return;
    const patch = {};
    if (typeof effects.money === 'number') patch.money = effects.money;
    if (typeof effects.like === 'number') patch.like = effects.like;
    if (typeof effects.heart === 'number') patch.heart = effects.heart;
    commitStats(patch);
    if (typeof effects.mood === 'string' && typeof updateMood === 'function') updateMood(effects.mood);
}

function grantReward(rewardId, effects) {
    if (!gameState.claimedRewards) gameState.claimedRewards = [];
    if (gameState.claimedRewards.indexOf(rewardId) >= 0) return false; // 已领取，拒绝重复
    gameState.claimedRewards.push(rewardId);
    applyEffects(effects);
    return true;
}
