/* عامل الخدمة: يحفظ ملفات التطبيق ليشتغل بدون إنترنت بعد أول تحميل.
   البيانات المالية ما تمر من هنا أبدًا؛ هي في IndexedDB على الجهاز.
   عند أي تحديث للملفات: غيّر رقم VERSION حتى يوصل التحديث للجوال. */
const VERSION = 'fm-1.3.1';
const FILES = ['./', 'index.html', 'app.js', 'engine.js', 'db.js', 'sms.js', 'inbox.js', 'xlsx.full.min.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png',
  'plex-arabic-400.woff2', 'plex-arabic-500.woff2', 'plex-arabic-700.woff2', 'plex-latin-400.woff2', 'plex-latin-500.woff2', 'plex-latin-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
