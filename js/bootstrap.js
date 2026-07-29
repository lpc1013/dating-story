// js/bootstrap.js — 从 achievements.js 拆分（功能：页面初始化/全局事件）

if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', function(e) {
                const sc = document.querySelector('.start-container');
                if (!sc || document.getElementById('start-screen').style.display === 'none') return;
                const x = (e.gamma || 0) / 20; // -90 to 90 → -4.5 to 4.5 deg
                const y = (e.beta || 0) / 30;  // -180 to 180 → -6 to 6 deg
                sc.style.transform = 'perspective(800px) rotateX('+(-y)+'deg) rotateY('+x+'deg)';
                sc.classList.add('tilting');
            });
        }

window.addEventListener('click', () => {
            if (!SoundManager.bgm) SoundManager.playBgm('start');
        }, { once: true });

(function hideLoading() {
            const ls = document.getElementById('loading-screen');
            if (!ls) return;
            // 非首次访问：直接跳过加载屏
            if (localStorage.getItem('_visited')) { ls.style.display = 'none'; return; }
            localStorage.setItem('_visited', '1');
            const bar = document.getElementById('load-bar');
            let p = 0;
            const tick = setInterval(() => {
                p += Math.random() * 25 + 10;
                if (p >= 100) { p = 100; clearInterval(tick); }
                if (bar) bar.style.width = p + '%';
            }, 150);
            window.addEventListener('load', () => {
                setTimeout(() => {
                    if (bar) bar.style.width = '100%';
                    setTimeout(() => { ls.classList.add('hidden'); }, 300);
                }, 200);
            });
            // 兜底：3秒后强制隐藏
            setTimeout(() => { if (!ls.classList.contains('hidden')) ls.classList.add('hidden'); }, 3000);
        })();
