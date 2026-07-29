// tools/fetch_covers.mjs
// 遍历 video/<歌手>/<专辑>/ 结构，调用 iTunes Search API 找专辑封面，
// 下载到 data/covers/<歌手>/<专辑>/cover.jpg（按文件夹对应）。
// 生成 data/covers/_report.json 供核对（不打印大段内容）。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.cwd();
const VIDEO = path.join(ROOT, 'video');
const COVER_ROOT = path.join(ROOT, 'data', 'covers');

function walkAlbums() {
  const out = [];
  if (!fs.existsSync(VIDEO)) return out;
  for (const artist of fs.readdirSync(VIDEO, { withFileTypes: true })) {
    if (!artist.isDirectory()) continue;
    if (artist.name === '纯音乐') continue;
    const ad = path.join(VIDEO, artist.name);
    for (const album of fs.readdirSync(ad, { withFileTypes: true })) {
      if (!album.isDirectory()) continue;
      out.push({ artist: artist.name, album: album.name });
    }
  }
  return out;
}

function norm(s) {
  return (s || '').toLowerCase().replace(/[\s\-_·、，。.()（）\[\]【】]/g, '');
}

async function itunes(term) {
  const url = 'https://itunes.apple.com/search?term=' +
    encodeURIComponent(term) + '&entity=album&limit=10&country=CN&lang=zh_cn';
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  return j.results || [];
}

function pick(results, artist, album) {
  const na = norm(artist), nal = norm(album);
  let best = null, bestScore = -1;
  for (const r of results) {
    const rn = norm(r.artistName), cn = norm(r.collectionName);
    const artistOk = rn.includes(na) || na.includes(rn);
    const albumOk = cn.includes(nal) || nal.includes(cn);
    // 排除明显是单曲/EP 但不含专辑名的情况已在 albumOk 处理
    let score = 0;
    if (artistOk) score += 2;
    if (albumOk) score += 2;
    if (score > bestScore) { bestScore = score; best = r; }
  }
  if (bestScore >= 2 && best) return { r: best, score: bestScore };
  return null;
}

function hiRes(url) {
  return url.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, '/100000x100000bb.$1');
}

async function dl(url, dest) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1500) throw new Error('too small ' + buf.length);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  const albums = walkAlbums();
  const report = [];
  let ok = 0, fail = 0;
  for (const { artist, album } of albums) {
    let entry = { artist, album, status: 'fail', bytes: 0 };
    try {
      const results = await itunes(artist + ' ' + album);
      const chosen = pick(results, artist, album);
      if (!chosen) {
        entry.reason = 'no match in iTunes';
      } else {
        const dest = path.join(COVER_ROOT, artist, album, 'cover.jpg');
        let url = hiRes(chosen.r.artworkUrl100);
        try {
          entry.bytes = await dl(url, dest);
        } catch (e) {
          // 退回到原始 100x100
          url = chosen.r.artworkUrl100;
          entry.bytes = await dl(url, dest);
        }
        entry.status = 'ok';
        entry.chosenCollection = chosen.r.collectionName;
        entry.chosenArtist = chosen.r.artistName;
        entry.url = url;
        ok++;
      }
    } catch (e) {
      entry.reason = e.message;
    }
    if (entry.status !== 'ok') fail++;
    report.push(entry);
    // 简洁进度（仅一行/专辑）
    console.log(`${entry.status === 'ok' ? '✅' : '❌'} ${artist} / ${album}` + (entry.status === 'ok' ? `  (${entry.chosenCollection} - ${entry.chosenArtist})` : `  -> ${entry.reason || ''}`));
  }
  fs.writeFileSync(path.join(COVER_ROOT, '_report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n完成: 成功 ${ok} / 失败 ${fail} / 共 ${albums.length}`);
  console.log('报告: data/covers/_report.json');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
