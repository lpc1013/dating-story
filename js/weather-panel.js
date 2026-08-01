        var WEATHER_META = {
            '晴天': { color:'#ff8c42', bg:'#fff5e8', icon:'☀️', emoji:'🌤️', gradient:'linear-gradient(135deg,#fff8e7,#ffe0c0)', desc:'闺蜜约会，提示清晰', wMod:'好感×1.1 扣除×0.9' },
            '多云': { color:'#7b8ca0', bg:'#eef0f5', icon:'⛅', emoji:'🌥️', gradient:'linear-gradient(135deg,#f0f2f5,#e0e5ec)', desc:'暧昧升温，考验直觉', wMod:'好感×1.0 扣除×1.0' },
            '雨天': { color:'#5b8cb8', bg:'#e8f0f8', icon:'🌧️', emoji:'🌦️', gradient:'linear-gradient(135deg,#eaf2f8,#d8e8f4)', desc:'浪漫氛围，细心关键', wMod:'好感×0.9 扣除×1.1' },
            '雪天': { color:'#8ba4c0', bg:'#edf4fa', icon:'❄️', emoji:'🌨️', gradient:'linear-gradient(135deg,#eef5fa,#dce8f2)', desc:'高冷路线，无提示', wMod:'好感×0.8 扣除×1.2' }
        };
        var VAR_LABEL = {sunny:'晴线A',sunny2:'晴线B',cloudy:'多云A',cloudy2:'雾线B',rainy:'雨线A',rainy2:'台风线',snowy:'雪线'};

        var weatherTab = 0;
        function switchWeatherTab(t) { weatherTab = t; showWeatherInfo(); }

        function showWeatherInfo() {
            if (!weatherTab) weatherTab = 0;
            const panel = document.getElementById('weather-panel');
            const list = document.getElementById('weather-list');
            list.innerHTML = '';
            // ── Tab 导航 ──
            var tabs = ['🌤️ 天气概览','🔗 事件流向','📊 数据分析'];
            list.innerHTML = '<div class="weather-tabs">' + tabs.map(function(t,i){ return '<button class="weather-tab'+(weatherTab===i?' active':'')+'" onclick="switchWeatherTab('+i+')">'+t+'</button>'; }).join('') + '</div>';

            if (weatherTab === 0) renderWeatherOverview(list);
            else if (weatherTab === 1) renderEventFlow(list);
            else if (weatherTab === 2) renderDataStats(list);

            panel.classList.add('show');
        }

        function renderWeatherOverview(list) {
            var w = selectData.weather;
            var totalByGroup = {};
            if (window.StoryLoader && StoryLoader.variants) {
                Object.entries(StoryLoader.variants).forEach(function(e){ totalByGroup[e[0]] = e[1].reduce(function(s,l){return s+l.length;},0); });
            }
            Object.keys(WEATHER_META).forEach(function(wn){
                var m = WEATHER_META[wn];
                var isCur = w === wn;
                var evts = gameData[wn] || [];
                var total = totalByGroup[wn] || evts.length;
                var curIdx = Math.min(gameState.currentEvent, evts.length - 1);
                var curCount = Math.min(gameState.currentEvent + 1, evts.length);
                var progress = isCur && evts.length ? Math.min(100, Math.round(curCount/evts.length*100)) : 0;
                var varName = isCur && selectData.variantKey ? (VAR_LABEL[selectData.variantKey]||'') : '';
                var card = document.createElement('div');
                card.style.cssText = 'background:'+m.gradient+';border-radius:18px;padding:16px;margin-bottom:10px;border:2px solid '+(isCur?m.color:'transparent')+';box-shadow:'+(isCur?'0 4px 20px '+m.color+'30':'0 2px 8px rgba(0,0,0,.04)')+';transition:all .35s;';
                var h = '<div style="display:flex;align-items:flex-start;gap:10px;">'+
                    '<div style="font-size:40px;line-height:1;">'+m.icon+'</div>'+
                    '<div style="flex:1;">'+
                    '<div style="font-size:16px;font-weight:700;color:'+m.color+';">'+wn+(isCur?' · 当前':'')+'</div>'+
                    (varName?'<div style="font-size:10px;color:'+m.color+';opacity:.7;margin:2px 0;">📖 '+varName+'</div>':'')+
                    '<div style="font-size:10px;color:#888;margin:4px 0;">'+m.desc+' · '+m.wMod+'</div>'+
                    '<div style="font-size:9px;color:#aaa;">'+(totalByGroup[wn]||Object.keys(StoryLoader.variants?StoryLoader.variants[wn]||[]:[]).length)+'个事件</div>'+
                    '</div></div>';
                if (isCur) {
                    h += '<div style="margin-top:8px;background:rgba(255,255,255,.5);border-radius:10px;padding:10px;">'+
                        '<div style="display:flex;justify-content:space-between;font-size:10px;color:'+m.color+';margin-bottom:4px;"><span>本线进度</span><span>'+curCount+'/'+evts.length+' · '+progress+'%</span></div>'+
                        '<div style="height:6px;background:rgba(0,0,0,.08);border-radius:3px;overflow:hidden;">'+
                        '<div style="height:100%;width:'+progress+'%;background:'+m.color+';border-radius:3px;transition:width .6s ease;"></div></div>'+
                        (evts.length <= 20 ? '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:3px;">'+evts.map(function(e,i){
                            var done=i<curIdx,cur=i===curIdx;
                            return '<span style="font-size:9px;padding:2px 7px;border-radius:8px;'+(done?'background:rgba(0,0,0,.06);color:#888':'')+(cur?'background:'+m.color+';color:#fff;font-weight:600':'')+(!done&&!cur?'background:rgba(0,0,0,.02);color:#ccc':'')+';">'+(done?'✓':cur?'▶':'○')+' '+e.title+'</span>';
                        }).join('')+'</div>' : '')+
                        '</div>';
                }
                card.innerHTML = h;
                list.appendChild(card);
            });
        }

        function renderEventFlow(list) {
            var w = selectData.weather;
            var evts = gameData[w] || [], vk = selectData.variantKey;
            if (!evts.length || !vk) { list.innerHTML += '<div style="text-align:center;color:var(--text-muted);padding:20px;">游戏尚未开始</div>'; return; }
            var m = WEATHER_META[w] || {color:'#ff6b6b'};
            // 解析跳转
            var jk = devMode.jumps ? Object.keys(devMode.jumps) : [];
            var jumps={}, ends={};
            jk.forEach(function(k){ var p=k.split('|');if(p[0]!==vk)return;var j=devMode.jumps[k];var si=parseInt(p[1]);
                if(j.type==='event'||j.type==='option'){ var tp=(j.target||'').split('#');if(tp.length>=2){var ti=parseInt(tp[1]);if(!isNaN(ti)&&ti!==si+1){if(!jumps[si])jumps[si]=[];if(jumps[si].indexOf(ti)<0)jumps[si].push(ti);}}}
                else if(j.type==='end')ends[si]=j.target;
            });
            // SVG 画布
            var nodeH=36, nodeW=14, leftX=36, rightX=130, gap=nodeH+4, padTop=20;
            var svgW=Math.max(380,rightX+220), svgH=padTop+evts.length*gap+30;
            var svg='<svg width="100%" viewBox="0 0 '+svgW+' '+svgH+'" preserveAspectRatio="xMinYMin meet" style="display:block;width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow-'+m.color.replace('#','')+'" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="'+m.color+'"/></marker><marker id="arrow-jump" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#f39c12"/></marker><filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
            // 主轴线
            svg += '<line x1="'+leftX+'" y1="'+padTop+'" x2="'+leftX+'" y2="'+(padTop+(evts.length-1)*gap)+'" stroke="#e0e0e0" stroke-width="2" stroke-dasharray="3 2"/>';
            // 事件节点
            for (var i=0;i<evts.length;i++){
                var y=padTop+i*gap, done=i<gameState.currentEvent, cur=i===gameState.currentEvent;
                var fill=cur?m.color:done?'#4caf50':'#e0e0e0', r=cur?7:5;
                svg += '<circle class="flow-node" cx="'+leftX+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" '+(cur?'filter="url(#glow)"':'')+' onclick="jumpToEventFromFlow('+i+')"/>';
                svg += '<rect class="flow-node" x="'+rightX+'" y="'+(y-11)+'" width="180" height="22" rx="8" fill="'+(cur?m.color+'15':'none')+'" stroke="'+(cur?m.color:'transparent')+'" stroke-width="1" onclick="jumpToEventFromFlow('+i+')"/>';
                svg += '<text x="'+(rightX+8)+'" y="'+(y+5)+'" fill="'+(i<=gameState.currentEvent?'var(--text-body)':'#ccc')+'" font-size="10" font-family="var(--font-sans)" '+(cur?'font-weight="600"':'')+'>'+(i+1)+'. '+(evts[i].title||'').slice(0,18)+'</text>';
                // 跳转线
                if (jumps[i]) jumps[i].forEach(function(ti){
                    var ty=padTop+ti*gap;
                    var midY=(y+ty)/2;
                    svg += '<path d="M'+(leftX+10)+','+y+' C'+(leftX+10)+','+midY+' '+(rightX-10)+','+midY+' '+(rightX-10)+','+ty+'" fill="none" stroke="#f39c12" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#arrow-jump)" class="flow-line"/>';
                });
                // 结局标记
                if (ends[i]) svg += '<text x="'+(rightX+188)+'" y="'+(y+5)+'" font-size="10">'+(ends[i]==='好结局'?'🌟':'💔')+'</text>';
            }
            svg += '</svg>';
            var div = document.createElement('div'); div.id='flow-canvas'; div.innerHTML = svg;
            list.appendChild(div);
            // 图例
            var hasAny = Object.keys(jumps).length+Object.keys(ends).length;
            if (hasAny) {
                var leg = document.createElement('div');
                leg.style.cssText = 'margin-top:10px;padding:10px;background:var(--bg-chip);border-radius:10px;font-size:10px;color:var(--text-muted);line-height:1.8;';
                var lh = '<div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">📌 跳转路径</div>';
                Object.keys(jumps).forEach(function(si){jumps[si].forEach(function(ti){lh+='<div>↗ <b>'+(evts[parseInt(si)]?evts[parseInt(si)].title:'E'+(parseInt(si)+1))+'</b> ⟶ <b>'+(evts[ti]?evts[ti].title:'E'+(ti+1))+'</b></div>';});});
                Object.keys(ends).forEach(function(si){lh+='<div>🎯 <b>'+(evts[parseInt(si)]?evts[parseInt(si)].title:'E'+(parseInt(si)+1))+'</b> ⟶ '+(ends[si]==='好结局'?'🌟好结局':'💔坏结局')+'</div>';});
                leg.innerHTML = lh;
                list.appendChild(leg);
            }
        }

        function renderDataStats(list) {
            var w = selectData.weather;
            var m = WEATHER_META[w]||{color:'#ff6b6b'};
            var ht = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
                '<div class="data-metric"><div class="val" style="color:'+m.color+';">'+gameState.like+'</div><div class="lbl">💕 好感度</div></div>'+
                '<div class="data-metric"><div class="val" style="color:#9b7fd4;">'+gameState.heart+'</div><div class="lbl">💫 心动值</div></div>'+
                '<div class="data-metric"><div class="val" style="color:#ffa500;">'+gameState.money+'</div><div class="lbl">🪙 资产</div></div>'+
                '<div class="data-metric"><div class="val" style="color:var(--text-primary);">'+(function(){var l=(gameData[w]||[]).length;return l?Math.min(gameState.currentEvent+1,l)+'/'+l:'-';})()+'</div><div class="lbl">📍 进度</div></div>'+
                '</div>'+
                '<div style="margin-top:10px;padding:12px;background:'+m.gradient+';border-radius:12px;font-size:11px;line-height:1.8;">'+
                '<div style="font-weight:600;color:'+m.color+';">📐 当前公式</div>'+
                '<div>好感变化 = 基础 × ' + ((difficultyModifiers[selectData.difficulty]||{pos:1}).pos).toFixed(1) + ' × ' + ((weatherModifiers[w]||{pos:1}).pos).toFixed(1) +
                (selectData.isChallenge?' × 0.5(挑战模式)':'') + (gameState.isNight?' × 2.0(🌙夜幕)':'') + '</div>'+
                '<div style="margin-top:4px;font-size:10px;color:#888;">'+
                (selectData.isChallenge?'⚠️ 挑战模式：获取极难，扣除极易<br>':'')+
                (gameState.isNight?'🌙 夜幕降临：变化翻倍<br>':'')+
                '💡 '+m.desc+'</div></div>';
            var d = document.createElement('div'); d.innerHTML = ht;
            list.appendChild(d);
        }

function hideWeatherPanel() {
    document.getElementById('weather-panel').classList.remove('show');
}

        // 事件流向：点击节点跳转到对应事件（仅限已到达，未来事件锁定）
        window.jumpToEventFromFlow = function(i) {
            if (i == null || isNaN(i) || i < 0) return;
            if (!window.gameState) return;
            if (i > gameState.currentEvent) { showToast('🔒 该事件尚未到达', 'warn'); return; }
            gameState.currentEvent = i;
            hideWeatherPanel();
            if (typeof showEvent === 'function') showEvent(i);
        };
