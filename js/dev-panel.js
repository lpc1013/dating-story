// 开发者面板 — 跳转/隐藏/结局规则编辑器
var devMode = { jumps: {}, chainNext: 1 };

function toggleDevMode() {
    var p = document.getElementById('dev-panel');
    if (p.classList.contains('show')) { p.classList.remove('show'); }
    else { renderDevPanel(); p.classList.add('show'); }
}

function renderDevPanel() {
    var b = document.getElementById('dev-body');
    if (!b) return;

    // 7 个天气变体（来自 VAR_LABEL）
    var varLabels = (typeof VAR_LABEL !== 'undefined') ? VAR_LABEL :
        { sunny:'晴线A', sunny2:'晴线B', cloudy:'多云A', cloudy2:'雾线B', rainy:'雨线A', rainy2:'台风线', snowy:'雪线' };
    var variantKeys = ['sunny','sunny2','cloudy','cloudy2','rainy','rainy2','snowy'];

    // 收集每个变体的事件
    var eventsByVk = {};
    if (window.StoryLoader && StoryLoader.variants && Object.keys(StoryLoader.variants).length) {
        Object.entries(StoryLoader.variants).forEach(function(e) {
            var cn = e[0], lines = e[1];
            var keys = (StoryLoader.variantKeys && StoryLoader.variantKeys[cn]) || [];
            for (var li = 0; li < lines.length; li++) {
                var vk = keys[li] || cn;
                if (!eventsByVk[vk]) eventsByVk[vk] = lines[li];
            }
        });
    } else if (typeof gameData === 'object' && gameData) {
        var cnToSubs = { '晴天':['sunny','sunny2'], '多云':['cloudy','cloudy2'], '雨天':['rainy','rainy2'], '雪天':['snowy'] };
        Object.entries(gameData).forEach(function(e) {
            var cn = e[0], evts = e[1];
            var subs = cnToSubs[cn] || [cn];
            if (Array.isArray(evts) && evts.length) {
                for (var si = 0; si < subs.length; si++) {
                    if (!eventsByVk[subs[si]]) eventsByVk[subs[si]] = evts;
                }
            }
        });
    }

    var curVk = (selectData && selectData.variantKey) || 'sunny';
    if (!devMode._selVk || variantKeys.indexOf(devMode._selVk) < 0) devMode._selVk = curVk;

    var events = eventsByVk[devMode._selVk] || [];
    var selEvt = (devMode._selEvt != null && devMode._selEvt < events.length) ? devMode._selEvt : 0;
    var selOpt = devMode._selOpt || 0;
    var selType = devMode._selType || 'jump';

    var html = '';

    // ── 天气变体选择器 ──
    html += '<label style="font-size:12px;color:#666;font-weight:600;">🌤️ 天气变体（7种）</label>';
    html += '<select id="devSelW" onchange="devSelW(this.value)" style="width:100%;padding:8px;border-radius:10px;border:1px solid #ddd;margin:4px 0 14px;font-size:13px;">';
    variantKeys.forEach(function(vk) {
        var sel = vk === devMode._selVk ? ' selected' : '';
        var cnt = eventsByVk[vk] ? eventsByVk[vk].length : '?';
        html += '<option value="' + vk + '"' + sel + '>' + varLabels[vk] + ' (' + cnt + '事件)</option>';
    });
    html += '</select>';

    if (!events.length) {
        b.innerHTML = html + '<div style="text-align:center;color:#999;padding:16px;font-size:12px;">该变体暂无事件数据。<br>请先开始一局游戏以加载剧情。</div>';
        return;
    }

    var curEvent = events[selEvt];
    var choices = curEvent ? (curEvent.choices || []) : [];

    // ── 源事件 ──
    html += '<label style="font-size:12px;color:#666;font-weight:600;">📍 源事件</label>';
    html += '<select id="devTgtEvt" onchange="devTgtEvt(this.value)" style="width:100%;padding:8px;border-radius:10px;border:1px solid #ddd;margin:4px 0 10px;font-size:12px;">';
    for (var ei = 0; ei < events.length; ei++) {
        var s = ei === selEvt ? ' selected' : '';
        html += '<option value="' + ei + '"' + s + '>' + ei + '. ' + (events[ei].title || '(未命名)').substring(0,25) + '</option>';
    }
    html += '</select>';

    // ── 源选项 ──
    html += '<label style="font-size:12px;color:#666;font-weight:600;">🎯 触发选项</label>';
    html += '<select id="devTgtOpt" onchange="devTgtOpt(this.value)" style="width:100%;padding:8px;border-radius:10px;border:1px solid #ddd;margin:4px 0 10px;font-size:12px;">';
    for (var ci = 0; ci < choices.length; ci++) {
        var cs = ci === selOpt ? ' selected' : '';
        var txt = ((choices[ci].text || choices[ci].label || '选项'+ci).split('\n')[0] || '').substring(0,28);
        html += '<option value="' + ci + '"' + cs + '>' + ci + '. ' + txt + '</option>';
    }
    html += '</select>';

    // ── 规则类型 ──
    html += '<label style="font-size:12px;color:#666;font-weight:600;">⚡ 规则类型</label>';
    html += '<select id="devRuleType" onchange="devRuleType(this.value)" style="width:100%;padding:8px;border-radius:10px;border:1px solid #ddd;margin:4px 0 10px;font-size:13px;">';
    ['jump','end'].forEach(function(t) {
        var ts = t === selType ? ' selected' : '';
        var label = { jump:'↗ 跳转到事件', end:'🏁 强制结局' }[t];
        html += '<option value="' + t + '"' + ts + '>' + label + '</option>';
    });
    html += '</select>';

    // ── 目标 ──
    if (selType === 'jump') {
        html += '<label style="font-size:12px;color:#666;font-weight:600;">↗ 跳转目标</label>';
        html += '<select id="devJumpTarget" style="width:100%;padding:8px;border-radius:10px;border:1px solid #ddd;margin:4px 0 6px;font-size:12px;">';
        for (var ji = 0; ji < events.length; ji++) {
            html += '<option value="' + ji + '">' + ji + '. ' + (events[ji].title || '(未命名)').substring(0,25) + '</option>';
        }
        html += '</select>';
    } else if (selType === 'end') {
        html += '<label style="font-size:12px;color:#666;font-weight:600;">🏁 结局</label>';
        html += '<select id="devEndTarget" style="width:100%;padding:8px;border-radius:10px;border:1px solid #ddd;margin:4px 0 6px;font-size:13px;">';
        html += '<option value="good">🌟 好结局</option><option value="bad">💔 坏结局</option>';
        html += '</select>';
    }

    // ── 添加 ──
    html += '<button onclick="addDevRule()" style="width:100%;padding:10px;background:var(--accent,#ff6b6b);color:#fff;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;margin:10px 0;">➕ 添加规则</button>';

    // ── 规则列表 ──
    html += '<div style="margin-top:14px;border-top:1px solid #eee;padding-top:10px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<span style="font-size:13px;font-weight:600;">📋 当前规则 <span style="color:#ff6b6b;">(' + Object.keys(devMode.jumps).length + '条)</span></span>';
    html += '<span>';
    html += '<button onclick="resetDevJumps()" style="font-size:11px;padding:4px 10px;border:1px solid #ff6b6b;color:#ff6b6b;background:none;border-radius:8px;cursor:pointer;margin-right:4px;">重置</button>';
    html += '<button onclick="exportDevJumps()" style="font-size:11px;padding:4px 10px;border:1px solid #666;color:#666;background:none;border-radius:8px;cursor:pointer;">导出</button>';
    html += '</span></div>';

    var jk = Object.keys(devMode.jumps);
    var vkRules = jk.filter(function(k){ return k.split('|')[0] === devMode._selVk; });
    if (!vkRules.length) {
        html += '<div style="font-size:12px;color:#999;text-align:center;padding:12px;">暂无规则，选择事件和选项后点「添加规则」</div>';
    } else {
        html += '<div style="max-height:200px;overflow-y:auto;">';
        vkRules.forEach(function(k) {
            var rule = devMode.jumps[k];
            var parts = k.split('|');
            var evtIdx = parseInt(parts[1]), optIdx = parseInt(parts[2]);
            var evtName = (events[evtIdx] && events[evtIdx].title) ? events[evtIdx].title : 'E'+(evtIdx+1);
            var optTxt = '';
            var evtChoices = (events[evtIdx] && events[evtIdx].choices) ? events[evtIdx].choices : [];
            if (evtChoices[optIdx]) optTxt = (evtChoices[optIdx].text||'').split('\n')[0].substring(0,16);
            var typeIcon = { event:'↗', end:'🏁' }[rule.type] || '?';
            var desc = '';
            if (rule.type === 'event') { var tp = (rule.target||'').split('#'); desc = '→ ' + (tp.length>1?tp[1].substring(0,20):'?'); }
            else if (rule.type === 'end') desc = '→' + rule.target;
            html += '<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;padding:5px 8px;margin:3px 0;background:#f8f8f8;border-radius:6px;">';
            html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + typeIcon + ' <b>' + evtName + '</b>[' + optTxt + '] ' + desc + '</span>';
            html += '<span style="cursor:pointer;color:#ff6b6b;font-weight:bold;margin-left:6px;flex-shrink:0;" onclick="deleteDevRule(\'' + k.replace(/'/g,"\\'") + '\')">✕</span>';
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div>';
    b.innerHTML = html;
}

function devSelW(vk)      { devMode._selVk = vk; devMode._selEvt = 0; devMode._selOpt = 0; renderDevPanel(); }
function devTgtEvt(idx)   { devMode._selEvt = parseInt(idx); devMode._selOpt = 0; renderDevPanel(); }
function devTgtOpt(idx)   { devMode._selOpt = parseInt(idx); }
function devRuleType(t)   { devMode._selType = t; renderDevPanel(); }

function addDevRule() {
    var vk = devMode._selVk || 'sunny';
    var evtIdx = devMode._selEvt != null ? devMode._selEvt : 0;
    var optIdx = devMode._selOpt != null ? devMode._selOpt : 0;
    var type = devMode._selType || 'jump';

    // 获取当前变体的事件
    var events = [];
    if (window.StoryLoader && StoryLoader.variants) {
        Object.entries(StoryLoader.variants).forEach(function(e) {
            var keys = (StoryLoader.variantKeys && StoryLoader.variantKeys[e[0]]) || [];
            e[1].forEach(function(line, li) { if ((keys[li]||e[0]) === vk) events = line; });
        });
    }
    if (!events.length && typeof gameData === 'object') {
        var cnToSubs = { '晴天':['sunny','sunny2'], '多云':['cloudy','cloudy2'], '雨天':['rainy','rainy2'], '雪天':['snowy'] };
        Object.entries(gameData).forEach(function(e) {
            var subs = cnToSubs[e[0]] || [e[0]];
            if (subs.indexOf(vk) >= 0 && Array.isArray(e[1])) events = e[1];
        });
    }

    var evtName = (events[evtIdx] && events[evtIdx].title) || ('事件'+evtIdx);
    var key = vk + '|' + evtIdx + '|' + optIdx + '|' + evtName;

    if (type === 'jump') {
        var tgtEl = document.getElementById('devJumpTarget');
        var tgtIdx = tgtEl ? parseInt(tgtEl.value) : (evtIdx + 1);
        var tgtName = (events[tgtIdx] && events[tgtIdx].title) || ('事件'+tgtIdx);
        devMode.jumps[key] = { type:'event', fromVar:vk, fromEvent:evtName, fromOption:'', target:vk+'#'+tgtIdx+' '+tgtName, chain:devMode.chainNext++ };
    } else if (type === 'end') {
        var endEl = document.getElementById('devEndTarget');
        var ending = (endEl && endEl.value === 'bad') ? '坏结局' : '好结局';
        devMode.jumps[key] = { type:'end', fromVar:vk, fromEvent:evtName, fromOption:'', target:ending, chain:devMode.chainNext++ };
    }
    renderDevPanel();
}

function deleteDevRule(key) { delete devMode.jumps[key]; renderDevPanel(); }

function resetDevJumps() {
    if (!confirm('确定清除「'+devMode._selVk+'」的全部开发者规则？')) return;
    var n = {}; Object.keys(devMode.jumps).forEach(function(k) { if (k.split('|')[0] !== devMode._selVk) n[k] = devMode.jumps[k]; });
    devMode.jumps = n; renderDevPanel();
}

function exportDevJumps() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(devMode.jumps, null, 2)], {type:'application/json'}));
    a.download = 'dev-rules-' + (devMode._selVk||'export') + '.json';
    a.click(); URL.revokeObjectURL(a.href);
}
