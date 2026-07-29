// js/music-gallery.js — 歌手→专辑→歌曲 三层浏览
var MusicGallery = {
    data: null, songs: [], index: 0, audio: null, initialized: false,
    mode: 'order', filter: '', currentArtist: null, currentAlbum: null,

    async ensureInit() {
        if (this.initialized) return;
        this.initialized = true;
        this.audio = new Audio(); this.audio.volume = 0.7;
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
        // 过滤
        var filtered = f
            ? this.songs.filter(s => (s.title||'').toLowerCase().includes(f) || (s.artist||'').toLowerCase().includes(f) || (s.album||'').toLowerCase().includes(f))
            : this.songs;

        if (f) {
            // 搜索模式：标题列表
            this.elList.innerHTML = filtered.map(function(s,i){
                var idx = i;
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
                    if (al.cover) h+='<img class="mg-album-cover" src="'+al.cover+'" onerror="this.style.display=\'none\'">';
                    else h+='<span class="mg-album-icon">💿</span>';
                    h+='<div class="mg-album-info"><div class="mg-album-name">'+esc(al.name)+'</div><div class="mg-album-count">'+cnt+' 首</div></div>';
                    h+='</div>';
                });
            });
            this.elList.innerHTML = h;
        }
    },

    openAlbum(artist, album) {
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
            if (s.cover) this.elCover.innerHTML = '<img src="'+s.cover+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
            else this.elCover.textContent = '💿';
        }
        var player = this.elList.parentElement.parentElement;
        if (player) player.classList.add('playing');
        if (play) { this.audio.play(); this.elToggle.textContent = '⏸'; }
        this.renderList();
    },

    toggle() { if (this.audio.paused) { this.audio.play(); this.elToggle.textContent='⏸'; } else { this.audio.pause(); this.elToggle.textContent='▶'; } },
    step(dir) { this.load(this.index+dir, !this.audio.paused); },
    onTime() { if (this.elBar) this.elBar.style.width = (this.audio.duration?(this.audio.currentTime/this.audio.duration*100):0)+'%'; if(this.elCur)this.elCur.textContent=fmtTime(this.audio.currentTime); },
    onEnded() { if (this.mode==='single') { this.audio.currentTime=0; this.audio.play(); } else { this.step(1); } },
    onError() { showToast('❌ 播放失败', 'warn'); },
    cycleMode() { var m=['order','shuffle','single']; this.mode=m[(m.indexOf(this.mode)+1)%3]; this.elMode.textContent={order:'🔁',shuffle:'🔀',single:'🔂'}[this.mode]; },
    toggleBgm() { /* hook for bgm mode */ },
};

function fmtTime(s) { if(!isFinite(s))return'0:00';var m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+(sec<10?'0':'')+sec; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
