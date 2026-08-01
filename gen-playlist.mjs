// gen-playlist.mjs — 歌手 → 专辑 → 歌曲 三层结构
// 扫描 video/Artists/Albums/*.mp3，匹配 data/covers/Artists/Albums 封面
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const VIDEO = path.join(ROOT, 'video');
const COVERS = path.join(ROOT, 'data', 'covers');
const OUT = path.join(VIDEO, 'playlist.json');

const EXTS = new Set(['.mp3','.flac','.ogg','.m4a','.wav']);
const IMG_EXTS = new Set(['.jpg','.jpeg','.png','.webp']);

// 提取歌手/专辑/歌名（按目录层级）
function scan() {
  const artists = [];
  const dirs = fs.readdirSync(VIDEO).filter(f => fs.statSync(path.join(VIDEO,f)).isDirectory());
  dirs.sort();
  for (const artist of dirs) {
    const artistPath = path.join(VIDEO, artist);
    const albums = [];
    const albumDirs = fs.readdirSync(artistPath).filter(f => fs.statSync(path.join(artistPath,f)).isDirectory());
    albumDirs.sort();
    for (const album of albumDirs) {
      const albumPath = path.join(artistPath, album);
      const songs = [];
      const files = fs.readdirSync(albumPath).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return EXTS.has(ext) || ext === '.mflac'; // mflac 标记不可播放
      });
      files.sort();
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const mflac = ext === '.mflac';
        const title = path.basename(file, ext);
        songs.push({
          file: `video/${artist}/${album}/${file}`,
          title,
          artist,
          album,
          playable: !mflac,
          lockedReason: mflac ? '加密文件 (.mflac)' : undefined,
        });
      }
      // 找封面
      let cover = null;
      const coverDir = path.join(COVERS, artist, album);
      if (fs.existsSync(coverDir)) {
        const coverFiles = fs.readdirSync(coverDir).filter(f => IMG_EXTS.has(path.extname(f).toLowerCase()));
        if (coverFiles.length > 0) {
          cover = `data/covers/${artist}/${album}/${coverFiles[0]}`;
        }
      }
      albums.push({ name: album, cover, songs });
    }
    artists.push({ name: artist, albums });
  }
  return { artists, generated: new Date().toISOString() };
}

const data = scan();
// 提取「纯音乐」各专辑，作为游戏默认连续 BGM 的候选源（洛克王国等）
const bgmAlbums = {};
data.artists.forEach(a => {
  if (a.name !== '纯音乐') return;
  a.albums.forEach(al => {
    bgmAlbums[al.name] = al.songs.filter(s => s.playable !== false).map(s => s.file);
  });
});
data.bgmAlbums = bgmAlbums;
let total = 0;
data.artists.forEach(a => a.albums.forEach(al => total += al.songs.length));
console.log(`✅ 生成 playlist.json: ${data.artists.length} 位歌手, ${data.artists.reduce((s,a)=>s+a.albums.length,0)} 张专辑, ${total} 首歌, BGM专辑 ${Object.keys(bgmAlbums).length} 个`);
fs.writeFileSync(OUT, JSON.stringify(data, null, 2));

// 同步生成 js/bgm-albums.js：游戏启动首声 BGM 需同步拿到专辑列表，避免异步未就绪静音
const BGM_ALBUMS_JS = path.join(ROOT, 'js', 'bgm-albums.js');
fs.writeFileSync(BGM_ALBUMS_JS, '// 自动生成 — game 启动首声 BGM 用的连续专辑列表（node gen-playlist.mjs 生成，勿手改）\nwindow.PLAYLIST_BGM = ' + JSON.stringify(bgmAlbums, null, 2) + ';\n');
console.log(`✅ 生成 js/bgm-albums.js: ${Object.keys(bgmAlbums).join(', ')}`);
