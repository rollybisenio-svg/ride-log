/* Missy's Ride Log: keeps the app itself available offline.
   Her entries live in the phone's storage, not in this cache. */
const CACHE = "ride-log-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  // The page: try the internet first so updates arrive, fall back to the saved copy
  if(req.mode === "navigate"){
    e.respondWith(fetch(req).then(r => {
      if(r.ok){ const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); }
      return r;
    }).catch(() => caches.match("./index.html").then(hit => hit || caches.match("./"))));
    return;
  }
  // Icons and fonts: use the saved copy, refresh it in the background
  if(url.origin === self.location.origin || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => {
        if(r.ok || r.type === "opaque"){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    }));
  }
});
