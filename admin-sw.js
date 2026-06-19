const CACHE_NAME = "hospera-admin-v2";
const APP_SHELL = [
  "./admin.html",
  "./admin.css",
  "./admin.js",
  "./admin-manifest.webmanifest",
  "./chat-config.js",
  "./hospera-admin-icon.svg",
  "./assets/Hospera Website Logo.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.includes("/rest/") || requestUrl.pathname.includes("/auth/") || requestUrl.pathname.includes("/realtime/")) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const cloned = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
