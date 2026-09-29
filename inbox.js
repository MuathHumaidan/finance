/* صندوق الرسائل المعلّقة (Google Apps Script)
   هذا الملف الوحيد في التطبيق اللي يتصل بالإنترنت، وفقط مع رابط الـ Script اللي تحطه في الإعدادات.
   البيانات المالية ما تنرسل من هنا؛ التطبيق يسحب الرسائل ويؤكد استلامها فقط. */
(function (root) {
'use strict';
const URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
function validUrl(u) { return URL_RE.test(String(u || '').trim()); }
function uuid() {
  if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
  const b = new Uint8Array(16); root.crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
// طلب POST بجسم نصي (بدون ترويسات خاصة) عشان ما يحتاج المتصفح طلب إذن مسبق
async function call(cfg, payload, timeoutMs) {
  if (!validUrl(cfg.url)) throw new Error('الرابط لازم يكون رابط نشر Apps Script وينتهي بـ /exec');
  if (!cfg.token) throw new Error('المفتاح السري فاضي');
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeoutMs || 25000);
  try {
    const res = await fetch(cfg.url.trim(), { method: 'POST', body: JSON.stringify(Object.assign({ token: cfg.token.trim() }, payload)), redirect: 'follow', cache: 'no-store', signal: ctrl.signal });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch (e) { throw new Error(res.ok ? 'الرد مو بصيغة JSON. تأكد إن النشر «Anyone» وإنك نسخت رابط /exec' : 'خطأ من الخادم ' + res.status); }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('انتهت المهلة بدون رد');
    if (e instanceof TypeError) throw new Error('تعذر الاتصال بالرابط (الإنترنت أو إعداد النشر)');
    throw e;
  } finally { clearTimeout(timer); }
}
const STATUS_AR = { unauthorized: 'المفتاح السري غير صحيح', inbox_full: 'الصندوق ممتلئ', busy: 'الصندوق مشغول، حاول بعد ثواني', rate_limited: 'تجاوز حد الإرسال بالساعة',
  bad_json: 'طلب غير صالح', unknown_action: 'الـ Script قديم أو غير صحيح', blocked_otp: 'انرفضت لأنها رسالة رمز', duplicate: 'مكررة', stored: 'انحفظت', bad_request_id: 'معرّف الطلب غير صالح' };
const Inbox = {
  validUrl, uuid, statusText: (s) => STATUS_AR[s] || s || '',
  ping: (cfg) => call(cfg, { action: 'ping' }),
  push: (cfg, m) => call(cfg, { action: 'push', requestId: m.requestId, sender: m.sender, text: m.text, receivedAt: m.receivedAt }),
  pull: (cfg) => call(cfg, { action: 'pull' }),
  ack: (cfg, ids) => call(cfg, { action: 'ack', ids }),
  // اختبار الاتصال الكامل: ping ← push ← pull ← ack، ثم تأكد إن الرسالة انحذفت
  async selfTest(cfg, onStep) {
    const steps = [], id = uuid();
    const run = async (name, fn, okFn) => {
      const t0 = Date.now(); let res = null, err = null;
      try { res = await fn(); } catch (e) { err = e.message || String(e); }
      const ok = !err && okFn(res);
      const s = { name, ok, ms: Date.now() - t0, status: res && res.status, detail: err || (res && !ok ? JSON.stringify(res).slice(0, 160) : ''), res };
      steps.push(s); if (onStep) onStep(s); return s;
    };
    const p = await run('ping', () => Inbox.ping(cfg), r => r && r.ok);
    if (!p.ok) return steps;
    const text = 'رسالة اختبار من التطبيق — ' + new Date().toISOString();
    const pu = await run('push', () => Inbox.push(cfg, { requestId: id, sender: 'اختبار', text, receivedAt: new Date().toISOString() }), r => r && r.status === 'stored');
    if (!pu.ok) return steps;
    const pl = await run('pull', () => Inbox.pull(cfg), r => r && r.ok && (r.messages || []).some(m => m.id === id && m.text === text));
    await run('ack', () => Inbox.ack(cfg, [id]), r => r && r.ok && (r.acked || []).includes(id));
    await run('check', () => Inbox.pull(cfg), r => r && r.ok && !(r.messages || []).some(m => m.id === id));
    void pl;
    return steps;
  },
};
root.Inbox = Inbox;
})(typeof window !== 'undefined' ? window : globalThis);
