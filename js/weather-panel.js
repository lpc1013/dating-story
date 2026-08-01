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
            // SVG 画布（放大字号与节点，适配 420px 手机壳）
            var nodeH=46, leftX=44, rightX=150, gap=nodeH+6, padTop=24;
            var textSize=13, titleMax=15;
            var nodeRectW=200, svgW=Math.max(380,rightX+nodeRectW+44), svgH=padTop+evts.length*gap+34;
            var svg='<svg width="100%" viewBox="0 0 '+svgW+' '+svgH+'" preserveAspectRatio="xMinYMin meet" style="display:block;width:100%;height:auto;font-family:var(--font-sans);" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow-'+m.color.replace('#','')+'" markerWidth="9" markerHeight="7" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="'+m.color+'"/></marker><marker id="arrow-jump" markerWidth="9" markerHeight="7" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#f39c12"/></marker><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
            // 主轴线
            svg += '<line x1="'+leftX+'" y1="'+padTop+'" x2="'+leftX+'" y2="'+(padTop+(evts.length-1)*gap)+'" stroke="#e6dcd2" stroke-width="3" stroke-dasharray="4 3"/>';
            // 事件节点
            for (var i=0;i<evts.length;i++){
                var y=padTop+i*gap, done=i<gameState.currentEvent, cur=i===gameState.currentEvent, locked=i>gameState.currentEvent;
                var badge = cur ? '📍' : (done ? '✅' : '🔒');
                var fill=cur?m.color:done?'#4caf50':'#e6ddd3', r=cur?9:7;
                var rowFill = cur?m.color+'1a':(done?'#4caf5010':(locked?'#f4efea':'#ffffff'));
                var rowStroke = cur?m.color:(done?'#4caf5066':(locked?'#ece3d8':'#f0e8df'));
                svg += '<circle class="flow-node" cx="'+leftX+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" '+(cur?'filter="url(#glow)"':'')+' onclick="jumpToEventFromFlow('+i+')"/>';
                svg += '<rect class="flow-node" x="'+rightX+'" y="'+(y-15)+'" width="'+nodeRectW+'" height="30" rx="12" fill="'+rowFill+'" stroke="'+rowStroke+'" stroke-width="'+(cur?1.5:1)+'" onclick="jumpToEventFromFlow('+i+')"/>';
                svg += '<text x="'+(rightX+10)+'" y="'+(y-1)+'" font-size="'+(textSize+3)+'" font-weight="700" fill="'+(cur?m.color:(done?'#3a7d44':'#9a8f80'))+'">'+(i+1)+'</text>';
                svg += '<text x="'+(rightX+30)+'" y="'+(y-1)+'" font-size="'+textSize+'" font-family="var(--font-sans)" fill="'+(locked?'#b3a89a':(cur?'var(--text-body)':'#555'))+'" '+(cur?'font-weight="600"':'')+'>'+badge+'  '+(evts[i].title||'').slice(0,titleMax)+'</text>';
                svg += '<text x="'+(rightX+30)+'" y="'+(y+12)+'" font-size="'+(textSize-2)+'" fill="#b0a596">'+(cur?'▶ 当前位置':(done?'已完成':'未解锁'))+'</text>';
                // 跳转线
                if (jumps[i]) jumps[i].forEach(function(ti){
                    var ty=padTop+ti*gap;
                    var midY=(y+ty)/2;
                    svg += '<path d="M'+(leftX+12)+','+y+' C'+(leftX+12)+','+midY+' '+(rightX-10)+','+midY+' '+(rightX-10)+','+ty+'" fill="none" stroke="#f39c12" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#arrow-jump)" class="flow-line"/>';
                });
                // 结局标记
                if (ends[i]) svg += '<text x="'+(rightX+nodeRectW+8)+'" y="'+(y+5)+'" font-size="14">'+(ends[i]==='好结局'?'🌟':'💔')+'</text>';
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

        // 数值评级段位
        function likeTier(v){ if(v>=96)return{name:'挚爱',color:'#e91e63'}; if(v>=80)return{name:'心动',color:'#ff6b6b'}; if(v>=60)return{name:'暧昧',color:'#ff9a3c'}; if(v>=30)return{name:'友好',color:'#7bb66b'}; return{name:'生疏',color:'#9aa0a6'}; }
        function heartTier(v){ if(v>=90)return{name:'沦陷',color:'#c2185b'}; if(v>=70)return{name:'小鹿乱撞',color:'#ff6b6b'}; if(v>=45)return{name:'微动',color:'#ffa94d'}; return{name:'平静',color:'#9aa0a6'}; }
        function moneyTier(v){ if(v>=500)return{name:'小富翁',color:'#e6a700'}; if(v>=200)return{name:'宽裕',color:'#7bb66b'}; if(v>=0)return{name:'持平',color:'#5b8cb8'}; return{name:'破产',color:'#e74c3c'}; }

        function renderDataStats(list) {
            var w = selectData.weather;
            var m = WEATHER_META[w]||{color:'#ff6b6b'};
            var evts = gameData[w]||[];
            var lt = likeTier(gameState.like), ht2 = heartTier(gameState.heart), mt = moneyTier(gameState.money);
            var prog = evts.length ? Math.min(gameState.currentEvent+1, evts.length)+'/'+evts.length : '-';
            // 历史最佳（本地存档，无则降级为本次）
            var best = null;
            try { var rec = JSON.parse(localStorage.getItem('dating-records')||'[]'); if(Array.isArray(rec)&&rec.length) best = rec.reduce(function(a,b){return (b.like||0)>(a.like||0)?b:a;}); } catch(e){}
            function cmp(cur, key){ if(!best) return ''; var d = cur-(best[key]||0); return d>=0 ? '<span style="color:#4caf50">▲ 新纪录</span>' : '<span style="color:#999">较最佳 '+(d)+'</span>'; }

            var ht = ''+
            // 四项核心指标卡
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
                '<div class="data-metric"><div class="val" style="color:'+lt.color+';">'+gameState.like+'</div><div class="lbl">💕 好感度 · <b style="color:'+lt.color+'">'+lt.name+'</b></div></div>'+
                '<div class="data-metric"><div class="val" style="color:'+ht2.color+';">'+gameState.heart+'</div><div class="lbl">💫 心动值 · <b style="color:'+ht2.color+'">'+ht2.name+'</b></div></div>'+
                '<div class="data-metric"><div class="val" style="color:'+mt.color+';">'+gameState.money+'</div><div class="lbl">🪙 资产 · <b style="color:'+mt.color+'">'+mt.name+'</b></div></div>'+
                '<div class="data-metric"><div class="val" style="color:var(--text-primary);">'+prog+'</div><div class="lbl">📍 进度 '+(best?cmp(gameState.like,'like'):'')+'</div></div>'+
            '</div>'+
            // 约会画像标签
            '<div style="margin-top:10px;padding:12px 14px;background:'+m.gradient+';border-radius:12px;">'+
                '<div style="font-size:11px;font-weight:600;color:'+m.color+';margin-bottom:6px;">🏷️ 本次约会画像</div>'+
                '<div style="display:flex;flex-wrap:wrap;gap:5px;">'+
                    tag('🌤️ '+w+'线','#fff',m.color)+
                    tag('❤️ '+lt.name,m.color,'#fff')+
                    tag('💫 '+ht2.name,ht2.color,'#fff')+
                    (selectData.isChallenge?tag('🔥 挑战模式','#9c27b0','#fff'):'')+
                    (gameState.isNight?tag('🌙 夜幕','#5b6cb8','#fff'):'')+
                    (gameState.mood>70?tag('😊 心情大好','#4caf50','#fff'):(gameState.mood<35?tag('😣 心情低落','#e74c3c','#fff'):''))+
                '</div>'+
            '</div>'+
            // 公式与提示
            '<div style="margin-top:10px;padding:12px;background:rgba(255,255,255,.7);border-radius:12px;font-size:11px;line-height:1.85;border:1px solid #f0e0d0;">'+
                '<div style="font-weight:600;color:'+m.color+';">📐 当前公式</div>'+
                '<div>好感变化 = 基础 × ' + ((difficultyModifiers[selectData.difficulty]||{pos:1}).pos).toFixed(1) + ' × ' + ((weatherModifiers[w]||{pos:1}).pos).toFixed(1) +
                (selectData.isChallenge?' × 0.5(挑战)':'') + (gameState.isNight?' × 2.0(夜幕)':'') + '</div>'+
                '<div style="margin-top:4px;font-size:10px;color:#888;">'+
                (selectData.isChallenge?'⚠️ 挑战模式：获取极难，扣除极易<br>':'')+
                (gameState.isNight?'🌙 夜幕降临：变化翻倍<br>':'')+
                '💡 '+m.desc+'</div></div>'+
            // 下一局建议
            '<div style="margin-top:10px;padding:12px;background:linear-gradient(135deg,#fff8f0,#fff0f6);border-radius:12px;font-size:11px;line-height:1.85;border-left:3px solid '+m.color+';">'+
                '<div style="font-weight:600;color:'+m.color+';margin-bottom:3px;">💡 下局建议</div>'+
                advice(w, lt, ht2, mt)+
            '</div>';
            var d = document.createElement('div'); d.innerHTML = ht;
            list.appendChild(d);

            function tag(t,bg,fg){ return '<span style="font-size:10px;padding:3px 9px;border-radius:999px;background:'+bg+';color:'+fg+';font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08);">'+t+'</span>'; }
            function advice(w, lt, ht2, mt){
                var tips=[];
                if(lt.name==='生疏'||lt.name==='友好') tips.push('好感偏低：多留意她的情绪选项，'+w+'天气更吃「细心」。');
                else if(lt.name==='挚爱'||lt.name==='心动') tips.push('好感火热：稳住节奏，别在后期踩雷选项。');
                if(mt.name==='破产') tips.push('资产见底：下次开局先攒点启动资金，礼尚往来更顺。');
                else if(mt.name==='小富翁') tips.push('财力充裕：可适当投资礼物/餐饮提升心动。');
                if(ht2.name==='平静') tips.push('心动值安静：多用温柔选项唤醒她的小鹿乱撞。');
                if(gameState.mood<35) tips.push('心情告急：优先哄好情绪，否则好感增益会被吃掉。');
                if(!tips.length) tips.push('本局表现均衡，挑个新天气线体验不同剧情分支吧！');
                return tips.map(function(t){return '· '+t;}).join('<br>');
            }
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
