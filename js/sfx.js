// js/sfx.js — 从 achievements.js 拆分（功能：音效）

var SFX = (() => {
            let ctx = null;
            function getCtx() {
                if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
                if (ctx && ctx.state === 'suspended') ctx.resume();
                return ctx;
            }
            function tone(freq, type, duration, vol, decay) {
                if (typeof AppSettings !== 'undefined' && !AppSettings.sfx) return;
                const c = getCtx(); if (!c) return;
                const o = c.createOscillator();
                const g = c.createGain();
                o.type = type || 'sine';
                o.frequency.value = freq;
                g.gain.setValueAtTime((vol || 0.08), c.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (duration || 0.15));
                o.connect(g); g.connect(c.destination);
                o.start(); o.stop(c.currentTime + (duration || 0.15) + 0.01);
            }
            // A-09：selectData 声明在 js/shop.js（加载顺序在 sfx.js 之后）。
            // 直接写 selectData?.weather 只是"运行时才调用"侥幸不炸——一旦有人在 shop.js
            // 之前触发音效就是 ReferenceError。这里改成惰性 + typeof 守卫，消除顺序依赖。
            function currentWeather() {
                try {
                    if (typeof selectData !== 'undefined' && selectData) return selectData.weather;
                } catch (e) {}
                return null;
            }
            return {
                click() { const w = currentWeather(); const freq = w==='雪天'?600:w==='雨天'?700:w==='多云'?750:800; tone(freq, w==='雪天'?'triangle':'sine', 0.08, 0.05); },
                coin() { tone(1200, 'sine', 0.1, 0.06); tone(1600, 'sine', 0.08, 0.04); },
                heart() { tone(600, 'triangle', 0.12, 0.06); tone(900, 'triangle', 0.1, 0.05); },
                achieve() { tone(500, 'triangle', 0.08, 0.06); tone(800, 'triangle', 0.08, 0.05); tone(1100, 'triangle', 0.1, 0.04); },
                bad() { tone(200, 'sawtooth', 0.2, 0.04); tone(150, 'sawtooth', 0.25, 0.03); },
                flip() { tone(400, 'sine', 0.06, 0.03); tone(300, 'sine', 0.06, 0.03); },
                pop() { tone(1000, 'sine', 0.06, 0.04); }
            };
        })();
