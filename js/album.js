var albumPhotos = [
            { id: 'cat_photo', title: '巷弄里的橘猫', url: 'assets/photo/jimeng-2026-07-28-1012-巷弄里的橘猫，唯美氛围感画面，高级质感.png', condition: '在巷子里遇到橘猫解锁' },
            { id: 'blindbox_photo', title: '欧皇时刻', url: 'assets/photo/jimeng-2026-07-28-3440-欧皇时刻，唯美氛围感画面，高级质感.png', condition: '抽奖一发入魂解锁' },
            { id: 'date_photo', title: '文创店合照', url: 'assets/photo/jimeng-2026-07-28-2287-文创店合照，唯美氛围感画面，高级质感.png', condition: '在文创店合照解锁' },
            { id: 'sunset_photo', title: '轨道夕阳', url: 'assets/photo/jimeng-2026-07-28-7320-轨道夕阳，唯美氛围感画面，高级质感.png', condition: '在轨道看夕阳解锁' },
            { id: 'night_photo', title: '秦淮夜色', url: 'assets/photo/jimeng-2026-07-28-7915-秦淮夜色，唯美氛围感画面，高级质感.png', condition: '在秦淮河看夜景解锁' },
            { id: 'selfie_photo', title: '命定回眸', url: 'assets/photo/jimeng-2026-07-28-4487-命定回眸，唯美氛围感画面，高级质感.png', condition: '特定剧情回眸解锁' },
            { id: 'rain_date', title: '雨中漫步', url: 'assets/photo/jimeng-2026-07-28-2309-雨中漫步，唯美氛围感画面，高级质感.png', condition: '雨天浪漫约会解锁' },
            { id: 'snow_date', title: '雪地誓言', url: 'assets/photo/jimeng-2026-07-28-7563-雪地誓言，唯美氛围感画面，高级质感.png', condition: '雪天温暖约会解锁' },
            { id: 'cafe_date', title: '午后咖啡', url: 'assets/photo/jimeng-2026-07-28-1896-午后咖啡，唯美氛围感画面，高级质感.png', condition: '好感度达到60解锁' },
            { id: 'library_date', title: '书香气息', url: 'assets/photo/jimeng-2026-07-28-7414-书香气息，唯美氛围感画面，高级质感.png', condition: '好感度达到80解锁' },
            { id: 'sunny_park', title: '晴日公园', url: 'assets/photo/jimeng-2026-07-28-7219-晴日公园，唯美氛围感画面，高级质感.png', condition: '晴天公园剧情解锁' },
            { id: 'sunny_beach', title: '金沙海岸', url: 'assets/photo/jimeng-2026-07-28-4446-金沙海岸，唯美氛围感画面，高级质感.png', condition: '海边约会解锁' },
            { id: 'cloudy_street', title: '漫步街头', url: 'assets/photo/jimeng-2026-07-28-9355-漫步街头，唯美氛围感画面，高级质感.png', condition: '多云剧情解锁' },
            { id: 'cloudy_mountain', title: '云端远眺', url: 'assets/photo/jimeng-2026-07-28-5788-云端远眺，唯美氛围感画面，高级质感.png', condition: '多云探险解锁' },
            { id: 'rainy_window', title: '雨窗凝望', url: 'assets/photo/jimeng-2026-07-28-2170-雨窗凝望，唯美氛围感画面，高级质感.png', condition: '雨天电影解锁' },
            { id: 'rainy_garden', title: '湿润花园', url: 'assets/photo/jimeng-2026-07-28-2128-湿润花园，唯美氛围感画面，高级质感.png', condition: '雨天浪漫解锁' },
            { id: 'snowy_forest', title: '银装素裹', url: 'assets/photo/jimeng-2026-07-28-7078-银装素裹，唯美氛围感画面，高级质感.png', condition: '雪天堆雪人解锁' },
            { id: 'snowy_city', title: '雪落倾城', url: 'assets/photo/jimeng-2026-07-28-9887-雪落倾城，唯美氛围感画面，高级质感.png', condition: '雪天暖手解锁' },
            { id: 'first_gift', title: '第一份礼物', url: 'assets/photo/jimeng-2026-07-28-4525-第一份礼物，唯美氛围感画面，高级质感.png', condition: '赠送第一份礼物解锁' },
            { id: 'high_heart', title: '心跳加速', url: 'assets/photo/jimeng-2026-07-28-5277-心跳加速，唯美氛围感画面，高级质感.png', condition: '心动值达到90解锁' },
            { id: 'all_tips', title: '恋爱大师', url: 'assets/photo/jimeng-2026-07-28-5651-恋爱大师，唯美氛围感画面，高级质感.png', condition: '解锁所有恋爱词条' },
            { id: 'conflict_resolved', title: '雨过天晴', url: 'assets/photo/jimeng-2026-07-28-3684-雨过天晴，唯美氛围感画面，高级质感.png', condition: '成功化解一次情感危机' },
            { id: 'foggy_ruin', title: '雾中古建筑', url: 'assets/photo/jimeng-2026-07-28-0000-雾中古建筑，唯美氛围感画面，高级质感.png', condition: '在若隐若现的古建筑拍下雾中合影解锁' },
            { id: 'typhoon_eye', title: '台风之眼', url: 'assets/photo/jimeng-2026-07-28-0000-台风之眼，唯美氛围感画面，高级质感.png', condition: '在台风眼记录下罕见奇景解锁' },
            { id: 'foggy_shore', title: '雾中海滨', url: 'assets/photo/jimeng-2026-07-28-0000-雾中海滨，唯美氛围感画面，高级质感.png', condition: '在雾中循水声走到海滨公园解锁' }
        ];

        function showAlbum() {
            SoundManager._prevScene = SoundManager.currentScene;
            SoundManager.playBgm('album');
            const grid = document.getElementById('album-grid');
            if (!gameState.unlockedPhotos || gameState.unlockedPhotos.length === 0) {
                grid.innerHTML = `<div class="album-empty">📷 还没有解锁照片哦～<br>在约会中做出浪漫的选择，或触发特殊剧情，就能收集专属回忆！</div>`;
            } else {
                grid.innerHTML = albumPhotos.map(photo => {
                    const isUnlocked = gameState.unlockedPhotos.includes(photo.id);
                    return `
                        <div class="photo-card ${isUnlocked ? '' : 'locked'}" onclick="${isUnlocked ? `viewPhoto('${photo.url}', '${photo.title}')` : ''}">
                            ${isUnlocked ? `
                                <img src="${photo.url}" alt="${photo.title}" referrerPolicy="no-referrer">
                                <div class="photo-info">${photo.title}</div>
                            ` : `
                                <div class="lock-icon">🔒</div>
                                <div class="unlock-hint">${photo.condition}</div>
                            `}
                        </div>
                    `;
                }).join('');
            }
            // 默认回到相册标签
            switchAlbumTab('photos');
            document.getElementById('album-modal').classList.add('show');
        }

function showMusicHall() {
            showAlbum();                // 打开相册模态
            switchAlbumTab('music');    // 切换到音乐馆
            MusicGallery.ensureInit();
        }

        function switchAlbumTab(tab) {
            const isPhotos = tab === 'photos';
            document.getElementById('album-photos-view').style.display = isPhotos ? 'block' : 'none';
            document.getElementById('album-music-view').style.display = isPhotos ? 'none' : 'block';
            document.getElementById('tab-photos').classList.toggle('active', isPhotos);
            document.getElementById('tab-music').classList.toggle('active', !isPhotos);
            if (!isPhotos) MusicGallery.ensureInit();
        }
        // ===== 音乐馆：相册内嵌播放器 =====
        // 专辑解锁条件
        // 艺术家封面映射：artist名 → data/covers/ 下的封面文件

    
    
    

        function fmtTime(sec) {
            if (!sec || isNaN(sec)) return '0:00';
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        function viewPhoto(url, title) {
            var idx = albumPhotos.findIndex(function(p){ return p.url === url; });
            function showSlide(offset) {
                var newIdx = (idx + offset + albumPhotos.length) % albumPhotos.length;
                var p = albumPhotos[newIdx];
                if (!p || !p.url) return;
                idx = newIdx;
                var v = document.querySelector('.photo-viewer');
                if (v) { v.querySelector('img').src = p.url; v.querySelector('.viewer-title').textContent = p.title; }
            }
            var old = document.querySelector('.photo-viewer');
            if (old) old.remove();
            var viewer = document.createElement('div');
            viewer.className = 'photo-viewer show';
            viewer.onclick = function(e) { if (e.target === viewer) viewer.remove(); };
            viewer.innerHTML = '<div class="photo-nav photo-nav-prev" onclick="var fn=arguments.callee;event.stopPropagation();var v=document.querySelector(\'.photo-viewer\');var i=window._photoIdx||0;var arr=albumPhotos;i=(i-1+arr.length)%arr.length;v.querySelector(\'img\').src=arr[i].url;v.querySelector(\'.viewer-title\').textContent=arr[i].title;window._photoIdx=i;">‹</div>' +
                '<div class="viewer-content"><button class="viewer-close" onclick="this.parentElement.parentElement.remove()">×</button>' +
                '<img src="'+url+'" alt="'+title+'"><div class="viewer-title">'+title+'</div></div>' +
                '<div class="photo-nav photo-nav-next" onclick="event.stopPropagation();var v=document.querySelector(\'.photo-viewer\');var i=window._photoIdx||0;var arr=albumPhotos;i=(i+1)%arr.length;v.querySelector(\'img\').src=arr[i].url;v.querySelector(\'.viewer-title\').textContent=arr[i].title;window._photoIdx=i;">›</div>';
            window._photoIdx = idx;
            document.body.appendChild(viewer);
        }

        function hideAlbum() {
            if (window.MusicGallery && MusicGallery.audio) MusicGallery.audio.pause();
            document.getElementById('album-modal').classList.remove('show');
            SoundManager.restoreScene();
        }

        function unlockPhoto(id) {
            if (!gameState.unlockedPhotos.includes(id)) {
                gameState.unlockedPhotos.push(id);
                if (typeof cameraFlash === 'function') cameraFlash();
            }
        }

        function showResultFromJournal() {
            const journal = document.getElementById('journal');
            const source = journal.dataset.source || 'result';
            
            journal.classList.remove('show');
            journal.style.display = 'none';
            document.getElementById('game-content').style.display = 'none';
            
            if (source === 'bad-end') {
                document.getElementById('bad-end').style.display = 'flex';
                document.getElementById('bad-end').classList.add('show');
            } else if (source === 'mood-end') {
                document.getElementById('mood-end').style.display = 'flex';
                document.getElementById('mood-end').classList.add('show');
            } else {
                document.getElementById('result').style.display = 'flex';
                document.getElementById('result').classList.add('show');
            }
            SoundManager.restoreScene();
        }

        function hideAllPanels() {
            const panels = ['result', 'bad-end', 'mood-end', 'journal', 'album-modal', 'mood-info-modal', 'weather-panel', 'redeem-modal', 'gift-modal', 'love-tips-modal'];
            panels.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('show');
                    el.style.display = ''; 
                }
            });
        }

        function restartGame() {
            SoundManager.playBgm('start');
            hideAllPanels();
            document.getElementById('start-screen').style.display = 'flex';
            document.getElementById('game-container').style.display = 'none';
        }

        
        