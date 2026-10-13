// js/music-gallery.js — 歌手→专辑→歌曲 三层浏览
var MusicGallery = {
    data: null, songs: [], index: 0, audio: null, initialized: false,
    mode: 'order', filter: '', currentArtist: null, currentAlbum: null,

    async ensureInit() {
        if (this.initialized) return;
        this.initialized = true;
        // 音量锚点（§4.2）：播放器 0.7→0.55，与 #music-volume 滑块的 value="55" 保持一致
        this.audio = new Audio(); this.audio.volume = 0.55;
        // DOM refs
        this.elTitle = document.getElementById('music-title');
        this.elArtist = document.getElementById('music-artist');
        this.elCover = document.getElementById('music-cover');
        this.elBar = document.getElementById('music-progress-bar');
        this.elCur = document.getElementById('music-current');
        this.elDur = document.getElementById('music-duration');
        this.elToggle = document.getElementById('music-toggle');
        this.elList = document.getElementById('music-list');
        this.elStat = document.getElementById('music-stat');
        this.elMode = document.getElementById('music-mode');
        this.elToggle.onclick = () => this.toggle();
        document.getElementById('music-prev').onclick = () => this.step(-1);
        document.getElementById('music-next').onclick = () => this.step(1);
        this.audio.addEventListener('timeupdate', () => this.onTime());
        this.audio.addEventListener('loadedmetadata', () => { this.elDur.textContent = fmtTime(this.audio.duration); });
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('error', () => this.onError());
        // A-03：音乐馆一开播就让游戏 BGM 让路，暂停时再放回来（覆盖 load/toggle/step/hideAlbum 全部路径）
        this.audio.addEventListener('play', () => this.duckBgm());
        this.audio.addEventListener('pause', () => this.unduckBgm());
        const bar = this.elBar.parentElement;
        const seek = (e) => { const r = bar.getBoundingClientRect(); if (this.audio.duration) this.audio.currentTime = ((e.clientX - r.left) / r.width) * this.audio.duration; };
        bar.addEventListener('click', seek);
        this.elMode.onclick = () => this.cycleMode();
        const vol = document.getElementById('music-volume');
        vol.oninput = () => { this.audio.volume = vol.value / 100; };
        const si = document.getElementById('music-search-input');
        si.oninput = () => { this.filter = si.value.trim().toLowerCase(); this.renderList(); };
        this.elBgm = document.getElementById('music-bgm');
        if (this.elBgm) this.elBgm.onclick = () => this.toggleBgm();
        // Load
        try {
            const res = await fetch('video/playlist.json', { cache: 'no-cache' });
            if (res.ok) this.data = await res.json();
        } catch(e) {}
        if (!this.data || !this.data.artists) { this.renderEmpty(); return; }
        this.flattenSongs();
        this.renderList();
        this.load(0, false);
    },

    flattenSongs() {
        this.songs = [];
        if (!this.data || !this.data.artists) return;
        this.data.artists.forEach(a => {
            a.albums.forEach(al => {
                al.songs.forEach(s => {
                    this.songs.push({ ...s, artist: a.name, album: al.name, cover: al.cover });
                });
            });
        });
    },

    renderList() {
        this.elStat.textContent = this.songs.filter(s => s.playable !== false).length + ' 首';
        if (!this.data) { this.elList.innerHTML = '<div class="music-hint">暂无音乐</div>'; return; }

        var f = this.filter;
        // 过滤时保留歌曲在 this.songs 中的全局下标——此前直接用过滤后下标当作全局下标
        // 传给 load()，搜索后点第 N 首实际播放的是全局第 N 首（另一首歌）。
        var filtered = this.songs.map(function(s, i) { return { s: s, idx: i }; })
            .filter(function(o) {
                return !f || (o.s.title || '').toLowerCase().includes(f)
                    || (o.s.artist || '').toLowerCase().includes(f)
                    || (o.s.album || '').toLowerCase().includes(f);
            });

        if (f) {
            // 搜索模式：标题列表
            this.elList.innerHTML = filtered.map(function(o){
                var s = o.s, idx = o.idx;
                return '<div class="music-item'+(s.playable===false?' locked':'')+'" onclick="MusicGallery.load('+idx+',true)">'+
                    '<span class="music-item-cover">🎵</span>'+
                    '<div class="music-item-meta"><div class="music-item-title">'+esc(s.title)+'</div>'+
                    '<div class="music-item-artist">'+esc(s.artist)+' · '+esc(s.album)+'</div></div>'+
                    '<span class="music-item-eq">🎶</span></div>';
            }).join('');
        } else {
            // 浏览模式：歌手 → 专辑
            var h='';
            this.data.artists.forEach(function(a){
                h+='<div class="mg-artist-header">🎤 '+esc(a.name)+'</div>';
                a.albums.forEach(function(al){
                    var cnt = al.songs.filter(function(s){return s.playable!==false}).length;
                    h+='<div class="mg-album-row" onclick="MusicGallery.openAlbum(\''+esc(a.name)+'\',\''+esc(al.name)+'\')">';
                    // E-7：补 alt（专辑名），此前屏幕阅读器读到的是空图
                    if (al.cover) h+='<img class="mg-album-cover" src="'+al.cover+'" alt="'+esc(al.name)+' 专辑封面" onerror="this.style.display=\'none\'">';
                    else h+='<span class="mg-album-icon">💿</span>';
                    h+='<div class="mg-album-info"><div class="mg-album-name">'+esc(al.name)+'</div><div class="mg-album-count">'+cnt+' 首</div></div>';
                    h+='</div>';
                });
            });
            this.elList.innerHTML = h;
        }
    },

    openAlbum(artist, album) {
        this.currentArtist = artist; this.currentAlbum = album;
        // 展开专辑，显示歌曲列表
        var songs = [];
        if (this.data && this.data.artists) {
            var a = this.data.artists.find(function(x){return x.name===artist});
            if (a) { var al = a.albums.find(function(x){return x.name===album}); if (al) songs = al.songs; }
        }
        var firstIdx = -1;
        songs.forEach(function(s,i){ if(s.playable!==false && firstIdx<0) firstIdx = i; });
        this.elList.innerHTML = '<div class="mg-back" onclick="MusicGallery.renderList()">← 返回</div>'+
            '<div class="mg-album-title">💿 '+esc(album)+' <span style="color:#999;font-size:11px;">'+esc(artist)+'</span></div>'+
            songs.map(function(s,i){
                var globalIdx = MusicGallery.songs.findIndex(function(gs){return gs.title===s.title&&gs.artist===artist&&gs.album===album});
                return '<div class="music-item'+(s.playable===false?' locked':'')+(MusicGallery.index===globalIdx?' active':'')+'" onclick="MusicGallery.load('+globalIdx+',true)">'+
                    '<span class="music-item-cover">'+(s.playable===false?'🔒':'🎵')+'</span>'+
                    '<div class="music-item-meta"><div class="music-item-title">'+esc(s.title)+'</div></div>'+
                    '<span class="music-item-eq">🎶</span></div>';
            }).join('');
    },

    renderEmpty() { this.elList.innerHTML = '<div class="music-hint">📂 暂无音乐，请添加歌曲到 video/ 目录</div>'; },

    load(idx, play) {
        if (idx < 0 || idx >= this.songs.length) return;
        var s = this.songs[idx]; if (!s.playable) { showToast('🔒 此文件无法播放', 'warn'); return; }
        this.index = idx;
        this.audio.src = encodeURI(s.file);
        if (this.elTitle) this.elTitle.textContent = s.title;
        if (this.elArtist) this.elArtist.textContent = s.artist + ' · ' + s.album;
        // 显示封面
        if (this.elCover) {
            // E-7：补 alt（专辑名），播放器封面此前同样无替代文本
            if (s.cover) this.elCover.innerHTML = '<img src="'+s.cover+'" alt="'+esc(s.album)+' 专辑封面" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
            else this.elCover.textContent = '💿';
        }
        var player = this.elList.parentElement.parentElement;
        if (player) player.classList.add('playing');
        if (play) { this.audio.play(); this.elToggle.textContent = '⏸'; }
        // 保持当前视图上下文：搜索态回搜索、专辑态回专辑、否则回浏览
        if (this.filter) this.renderList();
        else if (this.currentArtist && this.currentAlbum) this.openAlbum(this.currentArtist, this.currentAlbum);
        else this.renderList();
    },

    toggle() { if (this.audio.paused) { this.audio.play(); this.elToggle.textContent='⏸'; } else { this.audio.pause(); this.elToggle.textContent='▶'; } },
    step(dir) { this.load(this.index+dir, !this.audio.paused); },
    onTime() { if (this.elBar) this.elBar.style.width = (this.audio.duration?(this.audio.currentTime/this.audio.duration*100):0)+'%'; if(this.elCur)this.elCur.textContent=fmtTime(this.audio.currentTime); },
    onEnded() {
        if (this.mode === 'single') { this.audio.currentTime = 0; this.audio.play(); return; }
        if (this.mode === 'shuffle') {
            if (this.songs.length <= 1) { this.load(0, true); return; }
            var r; do { r = Math.floor(Math.random() * this.songs.length); } while (r === this.index);
            this.load(r, true);
            return;
        }
        // order：自动续播下一首，到列表末尾回到第一首循环（连续播放）
        var next = this.index + 1;
        if (next >= this.songs.length) next = 0;
        this.load(next, true);
    },
    onError() { showToast('❌ 播放失败', 'warn'); },
    cycleMode() { var m=['order','shuffle','single']; this.mode=m[(m.indexOf(this.mode)+1)%3]; this.elMode.textContent={order:'🔁',shuffle:'🔀',single:'🔂'}[this.mode]; },

    // ===== A-03：音乐馆 / 游戏 BGM 互斥，避免双轨叠播 =====
    // _bgmDucked 只在"确实是我方把正在播的 BGM 按停"时置真，避免误把用户主动关掉的 BGM 重新拉起
    _bgmDucked: false,

    duckBgm() {
        if (typeof SoundManager === 'undefined' || !SoundManager.bgm) return;
        if (!SoundManager.bgm.paused) this._bgmDucked = true;
        try { SoundManager.bgm.pause(); } catch (e) {}
        this.syncBgmBtn();
    },

    unduckBgm() {
        if (!this._bgmDucked) { this.syncBgmBtn(); return; }
        this._bgmDucked = false;
        if (typeof SoundManager === 'undefined' || !SoundManager.bgm) { this.syncBgmBtn(); return; }
        if (typeof AppSettings !== 'undefined' && !AppSettings.music) { this.syncBgmBtn(); return; }
        try { var p = SoundManager.bgm.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
        this.syncBgmBtn();
    },

    syncBgmBtn() {
        if (!this.elBgm) return;
        var on = typeof SoundManager !== 'undefined' && !!SoundManager.bgm && !SoundManager.bgm.paused;
        this.elBgm.classList.toggle('active', on);
        this.elBgm.title = on ? '游戏 BGM 播放中，点击让路' : '游戏 BGM 已让路，点击恢复';
    },

    // 「🎵 纯音」按钮：手动在"音乐馆独占"与"游戏 BGM 独占"之间切换，任一时刻只响一层
    toggleBgm() {
        if (typeof SoundManager === 'undefined') return;
        var bgmOn = !!SoundManager.bgm && !SoundManager.bgm.paused;
        if (bgmOn) {
            this.duckBgm();
            return;
        }
        // 恢复游戏 BGM 前先停掉音乐馆播放器（其 pause 事件会顺带走一次 unduckBgm）
        if (this.audio && !this.audio.paused) {
            this.audio.pause();
            if (this.elToggle) this.elToggle.textContent = '▶';
        }
        if (typeof AppSettings !== 'undefined' && !AppSettings.music) { this.syncBgmBtn(); return; }
        if (SoundManager.bgm) {
            this._bgmDucked = true;
            this.unduckBgm();
        } else {
            SoundManager.playBgm(SoundManager.currentScene || 'start');
            this.syncBgmBtn();
        }
    },
};

function fmtTime(s) { if(!isFinite(s))return'0:00';var m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+(sec<10?'0':'')+sec; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
