/* عامل الخدمة: يحفظ ملفات التطبيق ليشتغل بدون إنترنت بعد أول تحميل.
   البيانات المالية ما تمر من هنا أبدًا؛ هي في IndexedDB على الجهاز.
   عند أي تحديث للملفات: غيّر رقم VERSION حتى يوصل التحديث للجوال. */
const VERSION = 'fm-1.8.6';
const FILES = ['./', 'index.html', 'app.js', 'engine.js', 'analytics.js', 'db.js', 'sms.js', 'inbox.js', 'xlsx.full.min.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png',
  'plex-arabic-400.woff2', 'plex-arabic-500.woff2', 'plex-arabic-700.woff2', 'plex-latin-400.woff2', 'plex-latin-500.woff2', 'plex-latin-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
  // 1.8.1: ينمسح كاش التطبيق القديم بس (fm-*). أي كاش ثاني على نفس الموقع ما ينلمس
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => /^fm-/.test(k) && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has('fresh')) return; // 1.6.2: «تحديث إجباري» ينزّل من الموقع مباشرة (مو من المحفوظ)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
