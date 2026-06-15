// Voltek Sales Management System — service worker
// v2: network-first for the app page so updates appear immediately;
// cache is only a fallback for offline. Static assets stay cache-first.
const CACHE = "voltek-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  // Never touch Supabase / API calls.
  if (req.method !== "GET" || /supabase\.co|api\./.test(req.url)) return;

  const isPage = req.mode === "navigate" ||
                 (req.headers.get("accept") || "").includes("text/html");

  if (isPage) {
    // NETWORK FIRST: always try to fetch the latest index.html;
    // fall back to cache only when offline.
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  // static assets: cache first, refresh in background
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
