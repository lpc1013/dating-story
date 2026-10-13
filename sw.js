const CACHE = 'dating-v9';
const PRECACHE = [
  './index.html',
  './css/style.css',
  './js/story-loader.js',
  './js/backpack.js',
  './assets/asset-map.js',
  './manifest.json'
];

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', e => {
  self.skipWaiting();
  // 逐资源预缓存：单个资源失败不再连累整批（addAll 任一失败即全部失败），
  // 且失败会被记录而非被空 catch 静默吞掉
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(PRECACHE.map(u =>
        c.add(u).catch(err => console.warn('[SW] 预缓存失败（已跳过）：', u, err))
      ))
    ).catch(err => console.warn('[SW] 预缓存过程异常：', err))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 判断请求类型
function isAsset(req) {
  let pathname;
  try { pathname = new URL(req.url).pathname; } catch (e) { pathname = req.url || ''; }
  // 用解析后的 pathname 判断，避免被 ?v= 版本参数绕过而错误归入 cache-first
  return /\.(css|js|html|json)$/.test(pathname);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // 大体积媒体（video/ 含 mp3/flac）一律 network-only：
  // 音乐馆上百首曲目若进 cache-first 会逐步撑爆移动端 Cache Storage 配额，
  // 且音频无离线刚需（播放前本就要网络/本地资源）。
  if (url.pathname.indexOf('/video/') >= 0) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // 导航请求（含根路径 "/"）一律 network-first，确保部署更新立即生效，避免 PWA 一直缓存旧版首页
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 同源且为 HTML/CSS/JS/JSON：network-first，确保更新及时
  if (url.origin === self.location.origin && isAsset(req)) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 其它资源：cache-first，离线可用
  e.respondWith(
    caches.match(req).then(r => {
      if (r) return r;
      return fetch(req).then(res => {
        if (res.ok && req.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
