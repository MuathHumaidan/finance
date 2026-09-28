/* طبقة الوصول للبيانات (Data Access Layer) — IndexedDB
   الواجهة ما تتعامل مع IndexedDB مباشرة. في المرحلة الثانية يتبدل هذا الملف بـ Google Sheets. */
(function (root) {
'use strict';
const NAME = 'finance-manager', VERSION = 2; // 2: الرسائل والمراجعة وسجل التعديلات والحدود
let db = null;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      root.Engine.STORE_NAMES.forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: 'id' }); });
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('قاعدة البيانات مفتوحة في نافذة ثانية. سكّرها وحاول مرة ثانية.'));
  });
}
function getAll(n) {
  return new Promise((resolve, reject) => {
    const rq = db.transaction(n, 'readonly').objectStore(n).getAll();
    rq.onsuccess = () => resolve(rq.result); rq.onerror = () => reject(rq.error);
  });
}
async function loadAll() {
  const out = {};
  for (const n of root.Engine.STORE_NAMES) out[n] = await getAll(n);
  return out;
}
// changes: {puts:{store:[objects]}, removes:{store:[ids]}}
function apply(changes) {
  const names = Array.from(new Set(Object.keys(changes.puts || {}).concat(Object.keys(changes.removes || {}))));
  if (!names.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    Object.entries(changes.puts || {}).forEach(([n, arr]) => arr.forEach(o => tx.objectStore(n).put(JSON.parse(JSON.stringify(o)))));
    Object.entries(changes.removes || {}).forEach(([n, ids]) => ids.forEach(id => tx.objectStore(n).delete(id)));
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('تعذر الحفظ'));
  });
}
function replaceAll(data) {
  const names = root.Engine.STORE_NAMES;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    names.forEach(n => { const os = tx.objectStore(n); os.clear(); (data[n] || []).forEach(o => os.put(o)); });
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('تعذرت الاستعادة'));
  });
}
async function requestPersistence() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* غير مدعوم */ }
  return false;
}
root.DB = { open, loadAll, apply, replaceAll, requestPersistence };
})(window);
