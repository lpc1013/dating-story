// js/util.js — 从 achievements.js 拆分（功能：通用工具）

var escAttr = typeof escAttr !== 'undefined' ? escAttr : function(s) { return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); };

function feedbackDwell(text) {
            const len = (text || '').length;
            const BASE = 1000;
            const PER_CHAR = 50;
            const MIN = 1000, MAX = 5000;
            return Math.max(MIN, Math.min(MAX, BASE + PER_CHAR * len));
        }

function shareStory(){
            var w = selectData.weather, d = selectData.difficulty;
            var text = '💖 恋爱约会·'+w+'·'+d+'模式\n💛 好感:'+gameState.like+'  💓 心动:'+gameState.heart+'  🪙 资产:'+gameState.money+'\n——来自「恋爱约会模拟器」';
            if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){showToast('📋 约会故事已复制到剪贴板！', 'system');});}else{showToast(text, 'system');}
        }
