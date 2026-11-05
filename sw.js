/*
 * Service worker for Beach Check.
 *
 * What it does: keeps a copy of the app's own files so the app opens from the home screen,
 * even with a weak connection.
 * What it does NOT do: it never stores weather, wave or tide data. Those always come live.
 *
 * Files are fetched from the network first, so a change you publish shows up straight away.
 * The saved copy is only used when the network is unavailable.
 */
const CACHE = 'beach-check-v1';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'logic.js', 'beaches.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // live data and fonts go straight to the network

  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
