// Fenlora Rutas — Service Worker mínimo (necesario para que la app sea instalable)
// Estrategia: network-first con respaldo a caché. NO cachea agresivamente para
// evitar servir versiones viejas de los paneles (el problema de caché anterior).
const CACHE = 'fenlora-rutas-v1';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (resp) {
        // Guarda una copia solo de navegaciones a las páginas (para offline básico)
        if (e.request.mode === 'navigate') {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      })
      .catch(function () {
        return caches.match(e.request);
      })
  );
});
