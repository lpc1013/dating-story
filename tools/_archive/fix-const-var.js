// fix-const-var.js — 把内联模块变量的 const 改成 var，让外部脚本可以安全覆盖
const fs = require('fs');
let h = fs.readFileSync('index.html', 'utf8');

// 需要改为 var 的模块变量（第一个声明位置）
const vars = [
  'albumPhotos',
  'MusicGallery',
  'gifts',
  'loveTipsData',
  'achievementsList',
];

let changed = 0;
vars.forEach(name => {
  const re = new RegExp(String.raw`(const\s+)(${name}\s*=)`, '');
  const m = h.match(re);
  if (m) {
    h = h.replace(re, `var ${name} =`);
    changed++;
    console.log(`  ✓ const ${name} → var at pos ${m.index}`);
  } else {
    console.log(`  - ${name}: not found as const declaration`);
  }
});
console.log(`Changed: ${changed}/${vars.length}`);

fs.writeFileSync('index.html', h, 'utf8');
console.log('Done. Size:', h.length);
