// Service worker. Keeps the app shell available with no network, which matters
// because the today screen has to work in a kitchen with bad wifi.

const VERSION = 46;
const CACHE = "recall-v" + VERSION;

const SHELL = [
  "./",
  "index.html",
  "helper.html",
  "privacy.html",
  "css/style.css",
  "css/skins.css",
  /* fonts.css is here because it is small and every page needs it. The 1.4 MB
     of woff2 it points at is deliberately NOT: a browser fetches a face only
     when a skin uses it, and caching type nobody has chosen would be a poor
     way to spend an install. They are same origin, so the ordinary rule keeps
     each one after its first use. */
  "css/fonts.css",
  "css/helper.css",
  "css/privacy.css",
  "js/app.js",
  "js/helper.js",
  "js/store.js",
  "js/speech.js",
  "js/voices.js",
  "js/skins.js",
  "js/camera.js",
  "js/ocr.js",
  "js/config.js",
  "js/i18n.js",
  "js/docs.js",
  "js/install.js",
  "js/lock.js",
  "js/cloud.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
// Anything the browser could hold on to is asked for with the version on it,
// exactly as the pages and the modules ask for it, so the cache keys line up.
].map((path) => (/\.(js|css)$/.test(path) ? path + "?v=" + VERSION : path));

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

  const url = new URL(request.url);
  const ourOwnFile = url.origin === location.origin;

  // Our own files: network first, so a new version is picked up the next time
  // the app is opened online. The cache is the fallback for when there is no
  // network, which is the whole reason it exists.
  if (ourOwnFile) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // The neural voice is deliberately left alone. Its runtime is tens of
  // megabytes and its model is sixty, and the library already keeps the model
  // in the origin private file system, so caching it here would store a second
  // copy of the same thing and double what the phone gives up. Worse, a
  // cache-first rule over a partly stored binary hands back a broken file for
  // good. It is fetched once, kept by the library, and the service worker does
  // not get involved.
  const voiceFiles =
    url.hostname.endsWith("huggingface.co") ||
    url.pathname.indexOf("onnxruntime-web") >= 0 ||
    url.pathname.indexOf("piper") >= 0;
  if (voiceFiles) return;

  // The OCR library and its language data are big and never change, so once
  // they are here we keep them and never ask again.
  const bigAndStable =
    url.hostname.endsWith("cdnjs.cloudflare.com") ||
    url.hostname.endsWith("tessdata.projectnaptha.com") ||
    url.hostname.endsWith("jsdelivr.net");

  if (bigAndStable) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
