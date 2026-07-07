// A simple service worker to satisfy PWA requirements
const CACHE_NAME = 'areef-cache-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We don't cache anything initially to ensure they always get the fresh app from GitHub Pages,
      // but the existence of the fetch handler is required by Chrome to show the install prompt.
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests directly to the network
  // We don't intercept to prevent any white screen or offline bugs,
  // we just need the fetch listener to exist to satisfy PWA criteria.
  return;
});
