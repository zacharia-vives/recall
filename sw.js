// Service worker. Keeps the app shell available with no network, which matters
// because the today screen has to work in a kitchen with bad wifi.

const CACHE = "recall-v1";

const SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/store.js",
  "js/speech.js",
  "js/camera.js",
  "js/ocr.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // The OCR library and its language data are big, so once they are here we
  // keep them. Everything else: cache first, then the network.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        const url = new URL(request.url);
        const worthKeeping =
          url.origin === location.origin ||
          url.hostname.endsWith("cdnjs.cloudflare.com") ||
          url.hostname.endsWith("tessdata.projectnaptha.com");
        if (worthKeeping && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => hit);
    })
  );
});
