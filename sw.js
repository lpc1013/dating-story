const CACHE = 'dating-v6';
const PRECACHE = [
  './index.html',
  './css/style.css',
  './data/fallback.json',
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
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
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
  const url = req.url;
  return url.endsWith('.css') || url.endsWith('.js') || url.endsWith('.html') || url.endsWith('.json');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

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
