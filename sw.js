const CACHE = 'dating-v5';
const ASSETS = [
  './index.html',
  './data/fallback.json',
  './js/story-loader.js',
  './assets/asset-map.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && (e.request.url.endsWith('.json') || e.request.url.endsWith('.js')) && !e.request.url.includes('playlist.json')) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
