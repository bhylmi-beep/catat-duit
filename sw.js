/* Service worker Catat Duit — nyimpen salinan app di HP biar kebuka tanpa internet.
   Satu versi = satu cache utuh (index.html + engine.js + ikon diambil BARENG pas install), terus disajikan dari cache.
   Jadi app nggak pernah jalan pakai index.html baru + engine.js lama walau sinyal lagi lambat.
   Tiap rilis: naikkan VERSI di bawah (samain dengan MM.VERSI_KODE di engine.js).
   Cache app lain di origin yang sama (mis. repo GitHub Pages lain) nggak disentuh.
   Data keuangan NGGAK lewat sini — itu di localStorage. */
const VERSI = '2026.11.01-3';
const AWALAN = 'catat-duit-';
const CACHE = AWALAN + VERSI;
const FONT = AWALAN + 'font';
const INTI = ['./', './index.html', './engine.js', './manifest.webmanifest', './ikon-192.png', './ikon-512.png', './ikon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  // cache:'reload' = lewati cache HTTP, biar semua berkas beneran dari rilis yang sama
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(INTI.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith(AWALAN) && k !== CACHE && k !== FONT).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT).then(async (c) => {
      const ada = await c.match(req);
      if (ada) return ada;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    // ?jam=… (buat ngetes) dan #… nggak bikin berkas beda
    const ada = (await c.match(req, { ignoreSearch: true })) ||
      (req.mode === 'navigate' ? await c.match(new URL('./index.html', self.location).href) : null);
    return ada || fetch(req);
  })());
});
