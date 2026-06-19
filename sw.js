/* Mondor Group. Minimal service worker.
   HTML: network-first (content always fresh). Static assets: cache-first (instant repeat loads, offline). */
const CACHE = 'mg-v6';
const PRECACHE = [
  '/', '/index.html', '/cole.jpg', '/og-image.png', '/site.webmanifest',
  '/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png',
  '/fonts/montserrat.woff2', '/fonts/spectral-300.woff2', '/fonts/spectral-400.woff2', '/fonts/spectral-300-italic.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // leave cross-origin (analytics beacon) to the network

  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (isHTML) {
    // network-first: keep the page content fresh, fall back to cache offline
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('/'); }); })
    );
    return;
  }
  // cache-first for static assets (fonts, images, manifest)
  e.respondWith(
    caches.match(req).then(function (m) {
      return m || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
