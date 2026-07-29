// tools/fix_covers.mjs
// 1) 修正「不能说的秘密」为电影原声封面（首轮误取了群星 tribute single）
// 2) 为「你若成风」尝试 MusicBrainz 封面
// 3) 汇总 30 个专辑封面落盘情况
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const COVER = path.join(ROOT, 'data', 'covers');

function hiRes(u) { return u.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/i, '/100000x100000bb.$1'); }
async function dl(url, dest) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const b = Buffer.from(await r.arrayBuffer());
  if (b.length < 1500) throw new Error('small ' + b.length);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, b);
  return b.length;
}

// 1) 不能说的秘密 -> 电影原声
const ost = 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/97/7b/6f/977b6f87-746d-637d-a52e-235005fc84a4/4711448407394.jpg/100x100bb.jpg';
try {
  const n = await dl(hiRes(ost), path.join(COVER, '周杰伦', '不能说的秘密', 'cover.jpg'));
  console.log('✅ 不能说的秘密 OST 已替换 bytes=', n);
} catch (e) {
  const n = await dl(ost, path.join(COVER, '周杰伦', '不能说的秘密', 'cover.jpg'));
  console.log('✅ 不能说的秘密 OST(100x100) bytes=', n);
}

// 2) 你若成风 -> MusicBrainz
try {
  const mb = await fetch('https://musicbrainz.org/ws/2/release/?query=' + encodeURIComponent('你若成风 AND artist:许嵩') + '&fmt=json', { headers: { 'User-Agent': 'cover-fetch/1.0 (test@example.com)' } });
  const mj = await mb.json();
  console.log('MB releases:', (mj.releases || []).length);
  let done = false;
  for (const rel of (mj.releases || []).slice(0, 5)) {
    if (rel.id) {
      try {
        const cu = 'https://coverartarchive.org/release/' + rel.id + '/front-500.jpg';
        const n = await dl(cu, path.join(COVER, '许嵩', '你若成风', 'cover.jpg'));
        console.log('✅ 你若成风 MB cover rel=', rel.title, 'bytes=', n);
        done = true; break;
      } catch (e2) { console.log('  MB rel', rel.title, '无封面:', e2.message); }
    }
  }
  if (!done) console.log('❌ 你若成风: MusicBrainz 无可用封面');
} catch (e) { console.log('❌ 你若成风 MB 查询失败:', e.message); }

// 3) 汇总
const albums = [];
for (const a of fs.readdirSync(path.join(ROOT, 'video'), { withFileTypes: true })) {
  if (!a.isDirectory() || a.name === '纯音乐') continue;
  for (const al of fs.readdirSync(path.join(ROOT, 'video', a.name), { withFileTypes: true })) {
    if (!al.isDirectory()) continue;
    albums.push(a.name + '/' + al.name);
    const p = path.join(COVER, a.name, al.name, 'cover.jpg');
    if (!fs.existsSync(p)) console.log('  ⚠ 缺失封面:', a.name + '/' + al.name);
  }
}
console.log('\n专辑总数:', albums.length, ' 封面已落盘:', albums.length - albums.filter((x) => !fs.existsSync(path.join(COVER, ...x.split('/'), 'cover.jpg'))).length);
