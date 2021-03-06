const FILES_TO_CACHE = [
    '/',
    '/dist/bundle.js',
    '/dist/icon_128x128.png',
    '/dist/icon_144x144.png',
    '/dist/icon_152x152.png',
    '/dist/icon_192x192.png',
    '/dist/icon_384x384.png',
    '/dist/icon_512x512.png',
    '/dist/icon_72x72.png',
    '/dist/icon_96x96.png',
    '/manifest.webmanifest',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/index.html',
    '/index.js',
    '/db.js',
    '/styles.css'
];

const STATIC_CACHE = "static-cache-v2";
const DATA_STATIC_CACHE = "data-cache-v1"
const RUNTIME_CACHE = "runtime-cache";

self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then(cache => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activiate", event => {
    const currentCaches = [STATIC_CACHE, DATA_STATIC_CACHE];
    event.waitUntil(
        caches
            .keys()
            .then(cacheNames => {
                return cacheNames.filter(
                    cacheName => !currentCaches.includes(cacheName)
                );
            })
            .then(cachesToDelete => {
                return Promise.all(
                    cachesToDelete.map(cacheToDelete => {
                        if (cacheToDelete !== STATIC_CACHE && cacheToDelete !== DATA_STATIC_CACHE) {
                            console.log("Removing old cache data", cacheToDelete);
                            return caches.delete(cacheToDelete)
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});
self.addEventListener("fetch", event => {
    if (
        event.request.method !== "GET" ||
        !event.request.url.startsWith(self.location.origin)
    ) {
        event.respondWith(fetch(event.request));
        return;
    }
    if (event.request.url.includes("/api/transaction/bulk")) {
        event.respondWith(
            caches.open(DATA_STATIC_CACHE).then(cache => {
                return fetch(event.request)
                    .then(response => {
                        cache.put(event.request, response.clone());
                        return response;
                    })
                    .catch(() => caches.match(event.request));
            })
        );
        return;
    }
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return caches.open(RUNTIME_CACHE).then(cache => {
                return fetch(event.request).then(response => {
                    return cache.put(event.request, response.clone()).then(() => {
                        return response;
                    });
                });
            });
        })
    );
});
