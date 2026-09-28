/* =====================================================================
   المدير المالي — المحرك (Engine)
   منطق بدون واجهة: قراءة الكشوف، التنظيف، التصنيف، المطابقة، الحسابات.
   يعمل في المتصفح وفي Node (للاختبار).
   الأقسام:
     1. أدوات عامة
     2. التصنيفات والتجار (البذور)
     3. المخزن (Store) — ذاكرة + تتبع التغييرات
     4. الإخفاء والبصمات
     5. قوالب الإنماء: كشف الحساب
     6. قوالب الإنماء: كشف البطاقة
     7. القوالب المتعلَّمة (كشف جديد)
     8. التصنيف
     9. التحضير للاستيراد (قراءة فقط)
    10. المطابقة ومنع التكرار
    11. اعتماد الاستيراد
    12. ربط التحويلات وسداد البطاقات
    13. الدورات
    14. الأرقام والتحليل
    15. الإدخال اليدوي والنقد
    16. النسخ الاحتياطي
   ===================================================================== */
(function (root) {
'use strict';

/* ---------- 1. أدوات عامة ---------- */
const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const cents = (x) => Math.round(x * 100);
const eq2 = (a, b) => Math.abs(a - b) < 0.005;

function parseNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v).replace(/[‎‏‪-‮]/g, '').trim();
  s = s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/[,،\s]/g, '');
  if (!/^[-+]?\d*\.?\d+$/.test(s)) return null;
  return parseFloat(s);
}

function uid() {
  if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

const pad2 = (n) => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
function isValidYMD(y, m, d) {
  if (!(y > 1990 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1;
}
function excelSerialToISO(n) {
  const ms = Date.UTC(1899, 11, 30) + Math.round(n) * 86400000;
  const d = new Date(ms);
  return isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}
function dateToUTC(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
function daysBetween(a, b) { return Math.round((dateToUTC(b) - dateToUTC(a)) / 86400000); }
function addDays(iso, n) { const d = new Date(dateToUTC(iso) + n * 86400000); return isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
function todayISO() { const d = new Date(); return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function to24(h, mi, ap) { let hh = parseInt(h, 10) % 12; if (/PM/i.test(ap)) hh += 12; return `${pad2(hh)}:${pad2(parseInt(mi, 10))}`; }
function minutesOf(date, time) { return dateToUTC(date) / 60000 + (time ? (parseInt(time.slice(0, 2), 10) * 60 + parseInt(time.slice(3, 5), 10)) : 0); }

/* يقرأ تاريخًا من خلية: رقم Excel، نص dd/mm/yyyy أو yyyymmdd أو yyyy-mm-dd */
function cellToISO(v, hint) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isoDate(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number') {
    if (v > 19000000 && v < 21000000) { const s = String(v); return cellToISO(s, hint); }
    if (v > 20000 && v < 80000) return excelSerialToISO(v);
    return null;
  }
  const s = String(v).trim();
  let m;
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return isValidYMD(+m[1], +m[2], +m[3]) ? isoDate(+m[1], +m[2], +m[3]) : null;
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) return isValidYMD(+m[1], +m[2], +m[3]) ? isoDate(+m[1], +m[2], +m[3]) : null;
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) {
    const a = +m[1], b = +m[2], y = +m[3];
    if (hint === 'mdy') return isValidYMD(y, a, b) ? isoDate(y, a, b) : null;
    return isValidYMD(y, b, a) ? isoDate(y, b, a) : null; // الافتراضي يوم/شهر/سنة
  }
  return null;
}

function cleanText(s) {
  return String(s || '').replace(/[‎‏‪-‮ ]/g, ' ').replace(/#/g, ' ').replace(/\s+/g, ' ').trim();
}
const normAr = (s) => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[\s,،.\-_]/g, '').toLowerCase();

async function sha256Hex(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : (input instanceof ArrayBuffer ? new Uint8Array(input) : input);
  const buf = await root.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- 2. التصنيفات والتجار ---------- */
// الجدول المعتمد (27 سبتمبر 2026). rec: التكرار، nec: الضرورة، commit: التزام، save: يدخل فرص التوفير (1.2)
const CATEGORY_SEED = [
  { id: 'installments', name: 'أقساط', rec: 'recurring', nec: 'essential', commit: true, save: false, subs: [
    { id: 'installments.finance', name: 'تمويل' }] },
  { id: 'home', name: 'منزل', rec: 'variable', nec: null, commit: false, save: false, subs: [
    { id: 'home.rent', name: 'إيجار', rec: 'recurring', nec: 'essential', commit: true },
    { id: 'home.maintenance', name: 'صيانة', rec: 'variable', nec: 'essential' },
    { id: 'home.furniture', name: 'أثاث', rec: 'variable', nec: 'discretionary', save: true },
    { id: 'home.household', name: 'أدوات منزلية', rec: 'variable', nec: 'discretionary', save: true }] },
  { id: 'bills', name: 'فواتير', rec: 'recurring', nec: 'essential', commit: true, save: false, subs: [
    { id: 'bills.electricity', name: 'كهرباء' }, { id: 'bills.water', name: 'مياه' }] },
  { id: 'telecom', name: 'اتصالات', rec: 'variable', nec: 'essential', commit: false, save: false, subs: [
    { id: 'telecom.postpaid', name: 'فاتورة جوال وإنترنت', rec: 'recurring', commit: true },
    { id: 'telecom.prepaid', name: 'شحن مسبق الدفع', rec: 'variable' },
    { id: 'telecom.devices', name: 'أجهزة', nec: 'discretionary', save: true }] },
  { id: 'subscriptions', name: 'اشتراكات', rec: 'recurring', nec: 'discretionary', commit: true, save: true },
  { id: 'groceries', name: 'بقالة', rec: 'variable', nec: 'essential', commit: false, save: false },
  { id: 'fuel', name: 'وقود', rec: 'variable', nec: 'essential', commit: false, save: false },
  { id: 'transport', name: 'مواصلات', rec: 'variable', nec: 'essential', commit: false, save: false, subs: [
    { id: 'transport.parking', name: 'مواقف' }, { id: 'transport.ride', name: 'أجرة' }] },
  { id: 'health', name: 'صحة', rec: 'variable', nec: 'essential', commit: false, save: false },
  { id: 'education', name: 'تعليم', rec: 'variable', nec: 'essential', commit: false, save: false },
  { id: 'fees', name: 'رسوم', rec: 'variable', nec: 'essential', commit: false, save: false, subs: [
    { id: 'fees.bank', name: 'رسوم بنكية' }, { id: 'fees.fx', name: 'رسوم عملة أجنبية' }] },
  { id: 'fines', name: 'مخالفات وغرامات', rec: 'variable', nec: 'essential', commit: false, save: false },
  { id: 'donations', name: 'تبرعات', rec: 'variable', nec: 'discretionary', commit: false, save: false },
  { id: 'restaurants', name: 'مطاعم', rec: 'variable', nec: 'discretionary', commit: false, save: true, subs: [
    { id: 'restaurants.dinein', name: 'مطعم' }, { id: 'restaurants.delivery', name: 'توصيل' }, { id: 'restaurants.fastfood', name: 'وجبات سريعة' }] },
  { id: 'cafes', name: 'مقاهي', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'shopping', name: 'تسوق', rec: 'variable', nec: 'discretionary', commit: false, save: true, subs: [
    { id: 'shopping.clothes', name: 'ملابس' }, { id: 'shopping.electronics', name: 'إلكترونيات' }] },
  { id: 'entertainment', name: 'ترفيه', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'travel', name: 'سفر', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'hotels', name: 'فنادق', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'gifts', name: 'هدايا', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'social', name: 'مصروف اجتماعي', rec: 'variable', nec: 'discretionary', commit: false, save: true, subs: [
    { id: 'social.outings', name: 'طلعات' }, { id: 'social.resthouse', name: 'استراحة' }, { id: 'social.occasions', name: 'مناسبات' }] },
  { id: 'other', name: 'أخرى', rec: 'variable', nec: null, commit: false, save: false },
];

function buildCategoryRecords() {
  const out = [];
  CATEGORY_SEED.forEach((c, i) => {
    out.push({ id: c.id, name: c.name, parentId: null, order: i, defaultRecurrenceType: c.rec, defaultNecessityType: c.nec, isCommitment: !!c.commit, savingsEligible: !!c.save, active: true });
    (c.subs || []).forEach((s, j) => out.push({
      id: s.id, name: s.name, parentId: c.id, order: j,
      defaultRecurrenceType: s.rec !== undefined ? s.rec : null,
      defaultNecessityType: s.nec !== undefined ? s.nec : null,
      isCommitment: s.commit !== undefined ? !!s.commit : null,
      savingsEligible: s.save !== undefined ? !!s.save : null, active: true }));
  });
  return out;
}

// تجار موحّدون: أسماء خام متعددة ← اسم واحد (أسماء بديلة)
const MERCHANT_SEED = [
  { name: 'إحسان', re: /\bEHSAN\b/, cat: 'donations', rec: 'recurring' },
  { name: 'HungerStation', re: /HUNGER ?STATION/, cat: 'restaurants', sub: 'restaurants.delivery' },
  { name: 'جاهز', re: /JAHEZ/, cat: 'restaurants', sub: 'restaurants.delivery' },
  { name: 'كيتا', re: /\bKEETA\b/, cat: 'restaurants', sub: 'restaurants.delivery' },
  { name: 'Claude', re: /ANTHROPIC|\bCLAUDE\b/, cat: 'subscriptions' },
  { name: 'Apple', re: /APPLE\.COM|APPLE COM BILL|ITUNES/, cat: 'subscriptions' },
  { name: 'STC', re: /^(MY )?STC( PREPAID)?$|^STC$|STC PREPAID/, cat: 'telecom' },
  { name: 'Zain', re: /\bZAIN\b/, cat: 'telecom' },
  { name: 'الدريس', re: /ALDREES/, cat: 'fuel' },
  { name: 'ساسكو', re: /SASCO/, cat: 'fuel' },
  { name: 'بنده', re: /\bPANDA\b/, cat: 'groceries' },
  { name: 'العثيم', re: /OTHAIM/, cat: 'groceries' },
  { name: 'Ninja', re: /ANA ?NINJA|ANANINJA/, cat: 'groceries' },
  { name: 'النهدي', re: /NAHDI/, cat: 'health' },
  { name: 'الدواء', re: /DAWAA/, cat: 'health' },
  { name: 'IPARK', re: /\bIPARK\b/, cat: 'transport', sub: 'transport.parking' },
  { name: 'Uber', re: /\bUBE?R\b|UBER\.COM|UBR\*/, cat: 'transport', sub: 'transport.ride' },
  { name: 'Amazon', re: /AMAZON/, cat: 'shopping' },
  { name: 'noon', re: /^NOON\b/, cat: 'shopping' },
];
// كلمات مفتاحية للتصنيف فقط (بدون توحيد الاسم)
const KEYWORD_RULES = [
  { re: /PETROL|\bGO STATION\b|\bJOIL\b|\bNAFT\b|\bPETROMIN\b|WAQOOD/, cat: 'fuel' },
  { re: /TAMIMI|DANUBE|\bLULU\b|CARREFOUR|BIN ?DAWOOD|SUPERMARK|\bMARKETS?\b|GROCERY|\bASWAQ\b|TAMWENAT/, cat: 'groceries' },
  { re: /PHARMA|MEDICAL|CLINIC|HOSPITAL|DENTAL/, cat: 'health' },
  { re: /CINEMA|\bVOX\b|\bMUVI\b/, cat: 'entertainment' },
  { re: /\bHOTEL/, cat: 'hotels' },
  { re: /RESTAURANT|RESTURANT|RESTAURAN|\bREST\b|PIZZ|BURGER|BROAST|HERFY|SHAWE?RMA|SHAWARMA|BUFF?E+T|BUFIAT|KITCHEN|\bMATAM|\bMTAM\b|SANDWICH|\bKFC\b|MCDONALD|ALBAIK/, cat: 'restaurants' },
  { re: /COFFEE|COFFE\b|\bCAFE|KAFTERIA|\bKARAK\b|\bTEA\b|QAHWA|QAHOAH|MAQHAA|\bMQHA\b|DONUT|ARABICA|JUICE|\bJUCE\b/, cat: 'cafes' },
];

/* ---------- 3. المخزن ---------- */
const STORE_NAMES = ['accounts', 'instruments', 'transactions', 'merchants', 'beneficiaries', 'categories', 'imports', 'templates', 'rules', 'settings', 'messages', 'reviews', 'auditLog', 'limits'];
const HISTORY_EXCLUDE = new Set(['auditLog']); // سجل التعديلات ما يدخل في التراجع
const UNDO_MAX = 30, AUDIT_MAX = 2000;
const DEFAULT_SETTINGS = {
  id: 'settings', cycleMode: 'salary', defaultPayday: 27,
  ownerAliases: [], // يدخلها المستخدم من الإعدادات أو عند أول استيراد؛ لا أسماء داخل الكود
  baseCurrency: 'SAR', roundUpDestination: { kind: 'unknown', accountId: null },
  backupReminderDays: 7, lastBackupAt: null, lastChangeAt: null, schemaVersion: 2,
  limitAlertPct: 80, inbox: { url: '', token: '', autoFetch: true, lastFetchAt: null },
};

class Store {
  constructor(data) {
    this.t = {}; STORE_NAMES.forEach(n => { this.t[n] = new Map(); });
    this.dirty = new Map(); this.removed = new Map();
    this.touched = new Set(); this.base = null; this.undoStack = []; this.redoStack = [];
    if (data) this.load(data);
    if (!this.t.categories.size) buildCategoryRecords().forEach(c => this.t.categories.set(c.id, c));
    this.ensureSettings();
  }
  ensureSettings() {
    let s = this.t.settings.get('settings');
    if (!s) { s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); this.t.settings.set('settings', s); }
    // إعدادات جديدة لنسخ قديمة
    Object.keys(DEFAULT_SETTINGS).forEach(k => { if (s[k] === undefined) s[k] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[k])); });
  }
  load(data) { STORE_NAMES.forEach(n => (data[n] || []).forEach(o => this.t[n].set(o.id, o))); }
  all(n) { return Array.from(this.t[n].values()); }
  get(n, id) { return id == null ? undefined : this.t[n].get(id); }
  put(n, o) {
    if (!o.id) o.id = uid();
    this.t[n].set(o.id, o);
    if (!this.dirty.has(n)) this.dirty.set(n, new Set());
    this.dirty.get(n).add(o.id);
    if (this.removed.has(n)) this.removed.get(n).delete(o.id);
    if (!HISTORY_EXCLUDE.has(n)) this.touched.add(n + '\u0001' + o.id);
    return o;
  }
  remove(n, id) {
    this.t[n].delete(id);
    if (!this.removed.has(n)) this.removed.set(n, new Set());
    this.removed.get(n).add(id);
    if (this.dirty.has(n)) this.dirty.get(n).delete(id);
    if (!HISTORY_EXCLUDE.has(n)) this.touched.add(n + '\u0001' + id);
  }
  get settings() { return this.t.settings.get('settings'); }
  touch() { const s = this.settings; s.lastChangeAt = new Date().toISOString(); this.put('settings', s); }
  takeChanges() {
    const puts = {}, removes = {};
    this.dirty.forEach((ids, n) => { puts[n] = Array.from(ids).map(id => this.t[n].get(id)).filter(Boolean); });
    this.removed.forEach((ids, n) => { removes[n] = Array.from(ids); });
    this.dirty = new Map(); this.removed = new Map();
    return { puts, removes };
  }
  exportAll() { const o = {}; STORE_NAMES.forEach(n => { o[n] = this.all(n); }); return o; }
  replaceAll(data) {
    STORE_NAMES.forEach(n => { this.t[n] = new Map(); });
    this.load(data);
    if (!this.t.categories.size) buildCategoryRecords().forEach(c => this.t.categories.set(c.id, c));
    this.ensureSettings();
    this.startHistory();
  }
  /* ---- التراجع والإعادة وسجل التعديلات ----
     كل حفظ = خطوة وحدة. نحتفظ بنص JSON لآخر حالة محفوظة لكل سجل، ونقارن عند الحفظ. */
  startHistory() {
    this.base = new Map();
    STORE_NAMES.forEach(n => { if (!HISTORY_EXCLUDE.has(n)) this.t[n].forEach((o, id) => this.base.set(n + '\u0001' + id, JSON.stringify(o))); });
    this.touched = new Set(); this.undoStack = []; this.redoStack = [];
  }
  commitStep(label, source) {
    if (!this.base) { this.touched = new Set(); return null; }
    const changes = [];
    this.touched.forEach(k => {
      const i = k.indexOf('\u0001'), n = k.slice(0, i), id = k.slice(i + 1);
      const cur = this.t[n].get(id), after = cur ? JSON.stringify(cur) : undefined, before = this.base.get(k);
      if (before === after) return;
      changes.push({ n, id, before, after });
      if (after === undefined) this.base.delete(k); else this.base.set(k, after);
    });
    this.touched = new Set();
    const meaningful = changes.filter(c => c.n !== 'settings' || !onlyStampsChanged(c.before, c.after));
    if (!meaningful.length) return null;
    const step = { id: uid(), label: label || 'تعديل', source: source || 'user', at: new Date().toISOString(), changes };
    this.addAudit(step);
    if (source !== 'undo' && source !== 'redo') {
      this.undoStack.push(step); if (this.undoStack.length > UNDO_MAX) this.undoStack.shift();
      this.redoStack = [];
    }
    return step;
  }
  // حفظ بدون خطوة تراجع (مثل تأكيد استلام الرسائل): نحدّث الأساس عشان ما يدخل في الخطوة الجاية
  absorb() {
    if (!this.base) { this.touched = new Set(); return; }
    this.touched.forEach(k => {
      const i = k.indexOf('\u0001'), n = k.slice(0, i), id = k.slice(i + 1), cur = this.t[n].get(id);
      if (cur) this.base.set(k, JSON.stringify(cur)); else this.base.delete(k);
    });
    this.touched = new Set();
  }
  applySide(changes, back) {
    changes.forEach(c => {
      const v = back ? c.before : c.after;
      if (v === undefined) { if (this.t[c.n].has(c.id)) this.remove(c.n, c.id); }
      else this.put(c.n, JSON.parse(v));
    });
  }
  undo() {
    const s = this.undoStack.pop(); if (!s) return null;
    this.applySide(s.changes.slice().reverse(), true);
    this.commitStep('تراجع: ' + s.label, 'undo'); this.redoStack.push(s); return s;
  }
  redo() {
    const s = this.redoStack.pop(); if (!s) return null;
    this.applySide(s.changes, false);
    this.commitStep('إعادة: ' + s.label, 'redo'); this.undoStack.push(s); return s;
  }
  addAudit(step) {
    const counts = {}, items = [];
    step.changes.forEach(c => {
      if (c.n === 'settings' && onlyStampsChanged(c.before, c.after)) return;
      const k = c.before === undefined ? 'created' : c.after === undefined ? 'removed' : 'updated';
      counts[c.n] = counts[c.n] || { created: 0, updated: 0, removed: 0 }; counts[c.n][k]++;
      if (c.n === 'transactions' && items.length < 6) { const o = JSON.parse(c.after || c.before); items.push({ change: k, date: o.transactionDate, amount: o.grossAmount, text: (o.merchantRaw || o.beneficiaryRaw || o.transactionType || '').slice(0, 40) }); }
    });
    const e = { id: step.id, at: step.at, label: step.label, source: step.source, counts, items };
    this.t.auditLog.set(e.id, e);
    if (!this.dirty.has('auditLog')) this.dirty.set('auditLog', new Set());
    this.dirty.get('auditLog').add(e.id);
    if (this.t.auditLog.size > AUDIT_MAX) {
      const old = this.all('auditLog').sort((a, b) => a.at.localeCompare(b.at)).slice(0, this.t.auditLog.size - AUDIT_MAX);
      old.forEach(o => { this.t.auditLog.delete(o.id); if (!this.removed.has('auditLog')) this.removed.set('auditLog', new Set()); this.removed.get('auditLog').add(o.id); });
    }
  }
}
// تغيّر الإعدادات بس في طوابع الوقت الآلية (آخر تعديل، آخر نسخة، آخر جلب) ما يعتبر خطوة
function onlyStampsChanged(before, after) {
  if (!before || !after) return false;
  const a = JSON.parse(before), b = JSON.parse(after);
  ['lastChangeAt', 'lastBackupAt'].forEach(k => { delete a[k]; delete b[k]; });
  if (a.inbox) delete a.inbox.lastFetchAt; if (b.inbox) delete b.inbox.lastFetchAt;
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ---------- 4. الإخفاء والبصمات ---------- */
// يخفي المعرّفات الحساسة حسب السياق ويبقي آخر 4 أرقام. المراجع البنكية تبقى.
const IBAN_EXACT = /SA\d{2}(?:[ \-]?[0-9A-Z]){20}(?![0-9A-Z])/g;
const REF_CTX = /(مرجع|المرجع|Ref|reference|رقم\s*العملية|رقم\s*الطلب|FT)\s*[:：#]?\s*$/i;
const ID_CTX = /(هوية|الهوية|إقامة|الإقامة|اقامة|الاقامة|سجل\s*مدني|ID)\s*[:：#]?\s*$/i;
const PHONE_DIGITS = /^(05\d{8}|9665\d{8}|009665\d{8})$/;
/* سلاسل الأرقام (نفس منطق صندوق الرسائل): مجموعات أرقام بينها نفس الفاصل (مسافة أو شرطة) مثل
   1234 567890 1234 أو 123-456789-012345، أو رقم متصل طويل.
   ما تدخل فيها التواريخ والأوقات والمبالغ، ولا الأرقام الملتصقة بحروف مثل FT123… */
function numberChains(t) {
  const gs = [], re = /\d+/g; let m;
  while ((m = re.exec(t))) gs.push({ s: m.index, e: m.index + m[0].length, v: m[0] });
  const n = gs.length, link = [], bound = [];
  for (let i = 0; i < n - 1; i++) { const sep = t.slice(gs[i].e, gs[i + 1].s); link.push(sep === ' ' ? ' ' : sep === '-' ? '-' : /^[:/.,]$/.test(sep) ? 'x' : ''); }
  for (let i = 0; i < n; i++) {
    const pc = gs[i].s > 0 ? t.charAt(gs[i].s - 1) : '', nc = t.charAt(gs[i].e);
    gs[i].glued = /[A-Za-z•*#]/.test(pc) || /[A-Za-z•*#]/.test(nc);
    bound[i] = (i > 0 && link[i - 1] === 'x') || (i < n - 1 && link[i] === 'x') || gs[i].glued;
  }
  for (let i = 0; i + 2 < n; i++) {
    if (link[i] !== '-' || link[i + 1] !== '-') continue;
    const a = gs[i].v.length, b = gs[i + 1].v.length, c = gs[i + 2].v.length;
    if ((a === 4 && b <= 2 && c <= 2) || (a <= 2 && b <= 2 && (c === 4 || c === 2))) bound[i] = bound[i + 1] = bound[i + 2] = true;
  }
  const out = [];
  [' ', '-'].forEach(sp => {
    let k = 0;
    while (k < n) {
      if (bound[k]) { k++; continue; }
      let j = k; while (j < n - 1 && link[j] === sp && !bound[j + 1]) j++;
      let digits = ''; for (let q = k; q <= j; q++) digits += gs[q].v;
      const refLike = (k > 0 && link[k - 1] === sp && gs[k - 1].glued) || (j < n - 1 && link[j] === sp && gs[j + 1].glued);
      if (j > k || digits.length >= 12) out.push({ s: gs[k].s, e: gs[j].e, digits, groups: j - k + 1, refLike });
      k = j + 1;
    }
  });
  out.sort((x, y) => (y.digits.length - x.digits.length) || (x.s - y.s));
  const picked = [];
  out.forEach(c => { if (!picked.some(p => c.s < p.e && c.e > p.s)) picked.push(c); });
  return picked.sort((x, y) => x.s - y.s);
}
const isAccountChain = (t, c) => c.digits.length >= 12 && c.digits.length <= 20 && !c.refLike && !REF_CTX.test(t.slice(Math.max(0, c.s - 24), c.s)) && !PHONE_DIGITS.test(c.digits);
function sanitizeText(s) {
  if (!s) return s;
  let t = String(s);
  // آيبان (قد يكون فيه مسافات أو شرطات)
  t = t.replace(IBAN_EXACT, m => { const d = m.replace(/[\s-]/g, ''); return 'SA••••' + d.slice(-4); });
  t = t.replace(/SA\d{2}(?:[ \-]?[0-9A-Z]){18,22}/g, m => { const d = m.replace(/[\s-]/g, ''); return 'SA••••' + d.slice(-4); });
  // أرقام حسابات مفصولة بمسافات أو شرطات (والهوية المفصولة بعد كلمة هوية/إقامة). المرجع البنكي يبقى
  numberChains(t).filter(c => c.groups > 1).reverse().forEach(c => {
    let rep = null;
    if (isAccountChain(t, c) || (PHONE_DIGITS.test(c.digits) && c.digits.length >= 12)) rep = '••••' + c.digits.slice(-4);
    else if (c.digits.length === 10 && /^[12]/.test(c.digits) && ID_CTX.test(t.slice(Math.max(0, c.s - 20), c.s))) rep = '••••••••••';
    if (rep) t = t.slice(0, c.s) + rep + t.slice(c.e);
  });
  // رقم بطاقة كامل أو مقنّع جزئيًا
  t = t.replace(/(?<![\dA-Za-z])\d{6}\*{4,8}\d{4}(?!\d)/g, m => '••••' + m.slice(-4));
  t = t.replace(/(?<![\dA-Za-z])\d{16}(?!\d)/g, m => '••••' + m.slice(-4));
  // رقم هوية أو إقامة (10 أرقام تبدأ بـ1 أو 2)
  t = t.replace(/(?<!\d)[12]\d{9}(?!\d)/g, '••••••••••');
  // أرقام الفواتير (قد تكون رقم جوال)
  t = t.replace(/(رقمها\s*)(\d{5,})/g, (m, a, b) => a + '••••' + b.slice(-4));
  // أرقام عقود التمويل
  t = t.replace(/\bLD(\d{6,})/g, (m, b) => 'LD••••' + b.slice(-4));
  // أرقام حسابات بعد كلمة حساب
  t = t.replace(/(حساب\s*)(\d{8,})/g, (m, a, b) => a + '••••' + b.slice(-4));
  // جوال سعودي
  t = t.replace(/(?<!\d)05\d{8}(?!\d)/g, m => '05••••' + m.slice(-4));
  // أي سلسلة أرقام طويلة لا يسبقها حرف (رقم حساب) — المراجع مثل FT… وATM… تبقى
  t = t.replace(/(?<![\dA-Za-z•])\d{12,}(?!\d)/g, m => '••••' + m.slice(-4));
  return t;
}
function sanitizeFilename(n) { return String(n || '').replace(/\d{8,}/g, m => '••' + m.slice(-4)); }
const normIban = (s) => String(s || '').replace(/[\s-]/g, '').toUpperCase();
async function fingerprintIban(iban) { return 'iban:' + (await sha256Hex('IBAN:' + normIban(iban))); }
async function fingerprintAccountNo(bank, no) { return 'acc:' + (await sha256Hex('ACC:' + (bank || '') + ':' + String(no).replace(/\D/g, ''))); }
// بصمة عامة لرقم الحساب (نفس معادلة صندوق الرسائل)، عشان تتطابق الرسائل مع الحسابات والمستفيدين
async function fingerprintNum(no) { return 'num:' + (await sha256Hex('NUM:' + String(no).replace(/\D/g, ''))); }
const SA_BANK_CODES = { '80': 'مصرف الراجحي', '10': 'البنك الأهلي السعودي', '05': 'مصرف الإنماء', '45': 'البنك السعودي البريطاني', '20': 'بنك الرياض', '15': 'بنك البلاد', '60': 'بنك الجزيرة', '30': 'البنك العربي الوطني', '55': 'البنك السعودي الفرنسي', '65': 'البنك السعودي للاستثمار', '90': 'STC Bank' };

function matchesOwner(name, aliases) {
  const n = normAr(name);
  if (!n) return false;
  return (aliases || []).some(a => { const x = normAr(a); return x && (n === x || n.includes(x) || x.includes(n) && n.length >= 6); });
}

/* ---------- 5. كشف حساب الإنماء ---------- */
function findCell(rows, re, maxRow) {
  for (let r = 0; r < Math.min(rows.length, maxRow || rows.length); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) if (row[c] != null && re.test(String(row[c]))) return { r, c };
  }
  return null;
}

function detectTemplate(rows, learned) {
  const hdrAcc = findCell(rows, /Transaction Description/i, 40);
  if (hdrAcc && findCell(rows, /Brief Statement of Account|Statement of Account/i, 5)) {
    const row = rows[hdrAcc.r].map(x => String(x || ''));
    if (row.some(x => /Credit/i.test(x)) && row.some(x => /Debit/i.test(x)) && row.some(x => /Balance/i.test(x))) return { kind: 'alinma_account', headerRow: hdrAcc.r };
  }
  if (findCell(rows, /Credit Card Statement/i, 10) && findCell(rows, /Posting Date/i, 60) && findCell(rows, /Amount in SAR/i, 60)) return { kind: 'alinma_card' };
  for (const t of (learned || [])) {
    const r = rows[t.headerRow];
    if (r && signatureOf(r) === t.signature) return { kind: 'learned', template: t };
  }
  return { kind: 'unknown' };
}
const signatureOf = (row) => (row || []).map(x => cleanText(x).toLowerCase()).join('|');

function parseAlinmaAccount(rows, det) {
  const H = det.headerRow;
  const val = (re) => { const p = findCell(rows.slice(0, H), re); return p ? rows[p.r][p.c + 1] : null; };
  const period = String(val(/^[\s\S]*\bDate$/) || '');
  const pm = period.match(/From\[(\d{2}\/\d{2}\/\d{4})\]\s*To\[(\d{2}\/\d{2}\/\d{4})\]/);
  const header = {
    bank: 'مصرف الإنماء',
    accountNumber: String(val(/Account Number/i) || '').replace(/\D/g, ''),
    currency: String(val(/Account Currency/i) || 'SAR').trim() || 'SAR',
    opening: parseNum(val(/Opening Balance/i)), closing: parseNum(val(/Closing Balance/i)),
    withdrawCount: parseNum(val(/Number of Withdraws/i)), withdrawTotal: parseNum(val(/Total Withdraws/i)),
    depositCount: parseNum(val(/Number Of Deposits/i)), depositTotal: parseNum(val(/Totals? Deposits/i)),
    startDate: pm ? cellToISO(pm[1]) : null, endDate: pm ? cellToISO(pm[2]) : null,
  };
  const lines = [];
  for (let r = H + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const d = cellToISO(row[0]);
    const desc = row[1];
    const credit = parseNum(row[2]), debit = parseNum(row[3]), bal = parseNum(row[4]);
    if (!d || desc == null || (credit == null && debit == null)) continue;
    lines.push({ rowIndex: r, postingDate: d, raw: String(desc), credit: credit || 0, debit: debit || 0, balance: bal });
  }
  return { header, lines };
}

// يحلل وصف سطر من كشف الإنماء ويرجع حقول العملية
function interpretAlinmaLine(line) {
  const raw = line.raw, t = cleanText(raw);
  const amount = round2(line.credit + line.debit); // المدين سالب
  const out = { direction: amount < 0 ? 'out' : 'in', grossAmount: round2(Math.abs(amount)), postingDate: line.postingDate, transactionDate: line.postingDate, time: null, family: 'unknown' };
  let m;
  const dmy = (d, mo, y) => isValidYMD(+y, +mo, +d) ? isoDate(+y, +mo, +d) : null;

  // سطر التقريب: يكرر نص الشراء وينتهي بـ ####
  if (/####\s*$/.test(raw)) {
    out.family = 'round_up';
    m = t.match(/SAR ([\d.,]+) (?:purchase was made|تم الشراء)/) || t.match(/\*\* ?\d{4} ([\d.,]+) SAR/);
    out.roundUpOfAmount = m ? parseNum(m[1]) : null;
    const dm = t.match(/(\d{2})-(\d{2})-(\d{4}) (?:في |at )?(\d{1,2}):(\d{2}) ?([AP]M)/);
    if (dm) { out.transactionDate = dmy(dm[1], dm[2], dm[3]) || out.transactionDate; out.time = to24(dm[4], dm[5], dm[6]); }
    const mm = t.match(/(?:بواسطة Mada Card \*\d{4} في|SAR من) (.+?) (?:على|في) \d{2}-/);
    out.merchantRaw = mm ? mm[1].trim() : null;
    const cm = t.match(/Card \*(\d{4})/); out.instrumentLast4 = cm ? cm[1] : null;
    return out;
  }
  // شراء بمدى (Apple Pay أو غيره)
  if ((m = t.match(/SAR ([\d.,]+) تم الشراء مع (.+?) بواسطة (.+?) \*(\d{4}) في (.+?) على (\d{2})-(\d{2})-(\d{4}) في (\d{1,2}):(\d{2}) ?([AP]M)/))) {
    Object.assign(out, { family: 'mada_purchase', paymentMethod: /apple ?pay/i.test(m[2]) ? 'Apple Pay' : 'POS', instrumentKind: /mada/i.test(m[3]) ? 'mada' : 'card', instrumentLast4: m[4], merchantRaw: m[5].trim(), transactionDate: dmy(m[6], m[7], m[8]) || out.transactionDate, time: to24(m[9], m[10], m[11]) });
    return out;
  }
  // شراء عبر الإنترنت من الحساب
  if ((m = t.match(/معاملة شراء عبر الإنترنت من الحساب \*\* ?(\d{4}) ([\d.,]+) SAR من (.+?) في (\d{2})-(\d{2})-(\d{4}) (\d{1,2}):(\d{2}) ?([AP]M)/))) {
    Object.assign(out, { family: 'online_purchase', paymentMethod: 'Online', accountLast4: m[1], merchantRaw: m[3].trim(), transactionDate: dmy(m[4], m[5], m[6]) || out.transactionDate, time: to24(m[7], m[8], m[9]) });
    return out;
  }
  // شراء VISA (غالبًا خارجي) من الحساب
  if ((m = t.match(/VISA - عملية شراء من نقاط البيع من الحساب \*\* ?(\d{4}) for SAR ([\d.,]+) من (.+?) على (\d{2})-(\d{2})-(\d{4}) (?:في )?(\d{1,2}):(\d{2}) ?([AP]M)/))) {
    Object.assign(out, { family: 'visa_purchase', paymentMethod: 'POS', accountLast4: m[1], merchantRaw: m[3].replace(/_+$/, '').trim(), transactionDate: dmy(m[4], m[5], m[6]) || out.transactionDate, time: to24(m[7], m[8], m[9]) });
    const om = t.match(/,([A-Z]{3}) ([\d.,]+) ID\d{8}/);
    if (om) { out.foreignCurrency = om[1]; out.foreignAmount = parseNum(om[2]); }
    const rm = t.match(/رقم المرجع (\S+)/); if (rm) out.reference = rm[1];
    return out;
  }
  // حوالة سريعة صادرة
  if ((m = t.match(/حوالة صادرة سريع .*?\(IBAN:\s*(SA[0-9A-Z ]+?)\)\s*(.+?) في ((?:مصرف|البنك|بنك)[^0-9]*?) تاريخ الاستحقاق (\d{2})\/(\d{2})\/(\d{4}) رقم المرجع (\S+)/))) {
    Object.assign(out, { family: 'fast_transfer_out', paymentMethod: 'Bank Transfer', iban: normIban(m[1]), beneficiaryRaw: m[2].trim(), beneficiaryBank: m[3].trim(), transactionDate: dmy(m[5], m[4], m[6]) || out.transactionDate, reference: m[7] });
    const fm = t.match(/الرسوم SAR ?([\d.]+)/), vm = t.match(/ضريبة القيمة المضافة SAR ?([\d.]+)/);
    if (fm) out.feeAmount = parseNum(fm[1]);
    if (vm) out.vatAmount = parseNum(vm[1]);
    return out;
  }
  // حوالة داخلية صادرة (داخل الإنماء)
  if ((m = t.match(/حوالة داخلية من .+? الى (.+?) حساب (\d{6,}) بمبلغ SAR ?([\d.,]+) وتاريخ استحقاق العملية (\d{2})\/(\d{2})\/(\d{4}) رقم المرجع (\S+)/))) {
    Object.assign(out, { family: 'internal_transfer_out', paymentMethod: 'Bank Transfer', counterpartyName: m[1].trim(), counterpartyAccountNo: m[2], counterpartyBank: 'مصرف الإنماء', transactionDate: dmy(m[5], m[4], m[6]) || out.transactionDate, reference: m[7] });
    return out;
  }
  // حوالة داخلية واردة
  if ((m = t.match(/حوالة داخلية من .+? من (.+?) تاريخ الاستحقاق (\d{2})\/(\d{2})\/(\d{4}) رقم المرجع (\S+)/))) {
    Object.assign(out, { family: 'internal_transfer_in', paymentMethod: 'Bank Transfer', counterpartyName: m[1].trim(), counterpartyBank: 'مصرف الإنماء', transactionDate: dmy(m[3], m[2], m[4]) || out.transactionDate, reference: m[5] });
    return out;
  }
  // راتب
  if (/^إيداع راتب/.test(t)) {
    Object.assign(out, { family: 'salary', paymentMethod: 'Bank Transfer' });
    const rm = t.match(/رقم مرجعي (\S+)/); if (rm) out.reference = rm[1];
    const dm = t.match(/تاريخ الاستحقاق (\d{2})\/(\d{2})\/(\d{4})/); if (dm) out.transactionDate = dmy(dm[2], dm[1], dm[3]) || out.transactionDate;
    return out;
  }
  // مكافأة
  if (/^REWARDS/i.test(t)) { Object.assign(out, { family: 'reward', paymentMethod: 'Bank Transfer' }); return out; }
  // سداد فاتورة
  if ((m = t.match(/سداد فاتورة (?:(\d{3}) - )?(.+?) رقمها (\S+)/))) {
    Object.assign(out, { family: 'bill_payment', paymentMethod: 'Bill Payment', billerRaw: m[2].trim(), billNo: m[3] });
    const tm = t.match(/في (\d{2}):(\d{2})-(\d{2})\/(\d{2})\/(\d{4})/);
    if (tm) { out.time = `${tm[1]}:${tm[2]}`; out.transactionDate = dmy(tm[4], tm[3], tm[5]) || out.transactionDate; }
    const rm = t.match(/رقم المرجع (\S+)/); if (rm) out.reference = rm[1];
    return out;
  }
  // سداد بطاقة ائتمانية
  if ((m = t.match(/تحويل إلى .*?رقم (\d{4})\*+/))) {
    Object.assign(out, { family: 'card_payment', paymentMethod: 'Bank Transfer', targetCardLast4: m[1] });
    const tm = t.match(/(?:في|فى) (\d{2}):(\d{2})-(\d{2})\/(\d{2})\/(\d{4})/);
    if (tm) { out.time = `${tm[1]}:${tm[2]}`; out.transactionDate = dmy(tm[4], tm[3], tm[5]) || out.transactionDate; }
    const rm = t.match(/^(FT\S+)/); if (rm) out.reference = rm[1];
    return out;
  }
  if (/^تسوية بطاقة الائتمان/.test(t)) {
    Object.assign(out, { family: 'card_settlement', paymentMethod: 'Other', targetCardLast4: null });
    const rm = t.match(/الرقم المرجعي (\S+)/); if (rm) out.reference = rm[1];
    return out;
  }
  // قسط تمويل
  if ((m = t.match(/^Finance Installment Repayment.*?For (LD\d+)/i))) {
    Object.assign(out, { family: 'installment', paymentMethod: 'Other', loanRef: m[1] });
    const tm = t.match(/Time (\d{2})(\d{2})/); if (tm) out.time = `${tm[1]}:${tm[2]}`;
    return out;
  }
  return out;
}

/* ---------- 6. كشف البطاقة الائتمانية (الإنماء) ---------- */
function parseAlinmaCard(rows) {
  // قيمة تحت عنوان (في الصف التالي، ابتداءً من عمود العنوان وخلال 3 أعمدة)
  const below = (re) => { const p = findCell(rows, re, 30); if (!p) return null; const nx = rows[p.r + 1] || []; for (let c = p.c; c <= p.c + 3 && c < nx.length; c++) if (nx[c] != null && nx[c] !== '') return nx[c]; return null; };
  const right = (re) => { const p = findCell(rows, re, 30); if (!p) return null; const row = rows[p.r]; for (let c = p.c + 1; c < Math.min(row.length, p.c + 6); c++) if (row[c] != null && row[c] !== '') return row[c]; return null; };
  const cardNo = String(below(/Card No/i) || '');
  const header = {
    bank: 'مصرف الإنماء',
    statementDate: cellToISO(right(/Statement Date/i)), dueDate: cellToISO(right(/Payment Due date/i)),
    creditLimit: parseNum(below(/Credit Limit/i)), cardLast4: (cardNo.match(/(\d{4})\s*$/) || [])[1] || null,
    linkedAccountNumber: String(below(/Account Number/i) || '').replace(/\D/g, ''),
    customerName: String(below(/Customer Name/i) || ''),
    minDue: parseNum(below(/Minimum Amount Due/i)), totalDue: parseNum(below(/Total Amount Due/i)),
    totalFees: parseNum(below(/Total Fees and Charges/i)) || 0, purchasesHeader: parseNum(below(/Purchases \/ Cash Advances/i)),
    previousBalance: parseNum(below(/Previous Balance/i)), available: parseNum(below(/Available Credit Limit/i)),
    paymentsHeader: parseNum(below(/Payments$/i)),
  };
  const hp = findCell(rows, /Posting Date/i, 60);
  const hrow = rows[hp.r].map(x => String(x || ''));
  const col = (re) => hrow.findIndex(x => re.test(x));
  const C = { tdate: col(/Transaction Date/i), pdate: col(/Posting Date/i), no: col(/Transaction No/i), desc: col(/Transaction Description/i), famt: col(/Foreign Currency/i), rate: col(/Conversion Rate/i), fees: col(/Fees/i), amt: col(/Amount in SAR/i) };
  const lines = [];
  for (let r = hp.r + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const td = cellToISO(row[C.tdate]);
    const amt = parseNum(row[C.amt]);
    if (!td || amt == null) { if (lines.length && !td) break; continue; }
    lines.push({ rowIndex: r, transactionDate: td, postingDate: cellToISO(row[C.pdate]) || td, txnNo: row[C.no] != null ? String(row[C.no]) : null, raw: String(row[C.desc] || ''), foreignAmount: parseNum(row[C.famt]), rate: parseNum(row[C.rate]), fees: parseNum(row[C.fees]) || 0, amount: amt });
  }
  return { header, lines };
}

function interpretCardLine(l) {
  const out = { postingDate: l.postingDate, transactionDate: l.transactionDate, time: null, grossAmount: round2(Math.abs(l.amount)), reference: l.txnNo || null, paymentMethod: 'Unknown' };
  if (l.amount < 0 && /Account to Card Transfer/i.test(l.raw)) return Object.assign(out, { family: 'card_statement_payment', direction: 'in' });
  if (l.amount < 0) return Object.assign(out, { family: 'card_statement_credit', direction: 'in' });
  const parts = l.raw.split('~~');
  const merchantRaw = cleanText(parts[0]);
  if (l.foreignAmount && l.foreignAmount > 0) { out.foreignAmount = l.foreignAmount; }
  return Object.assign(out, { family: 'card_purchase', direction: 'out', merchantRaw, city: parts[1] ? cleanText(parts[1].split('~')[0]) : null });
}

// اتجاه الرصيد السابق: نحسب الاحتمالين ونختار المطابق للمستحق وللحد المتاح معًا
function cardBalanceCheck(header, lines) {
  const purchases = round2(lines.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0));
  const payments = round2(lines.filter(l => l.amount < 0 && /Account to Card Transfer/i.test(l.raw)).reduce((s, l) => s - l.amount, 0));
  const otherCredits = round2(lines.filter(l => l.amount < 0 && !/Account to Card Transfer/i.test(l.raw)).reduce((s, l) => s - l.amount, 0));
  const fees = header.totalFees || 0, prev = header.previousBalance || 0;
  const closingIf = (sign) => round2(sign * prev + purchases + fees - payments - otherCredits);
  const usedLimit = (header.creditLimit != null && header.available != null) ? round2(header.creditLimit - header.available) : null;
  const matches = (c) => header.totalDue != null && eq2(Math.max(c, 0), header.totalDue) && (usedLimit == null || eq2(Math.max(c, 0), usedLimit));
  const debit = closingIf(1), credit = closingIf(-1);
  const mD = matches(debit), mC = matches(credit);
  let direction = null;
  if (mD && !mC) direction = 'debit'; else if (mC && !mD) direction = 'credit';
  if (prev === 0) direction = 'debit';
  const purchasesOk = header.purchasesHeader == null || eq2(header.purchasesHeader, purchases + fees) || eq2(header.purchasesHeader, purchases);
  const paymentsOk = header.paymentsHeader == null || eq2(header.paymentsHeader, payments);
  return { purchases, payments, otherCredits, fees, closingIfDebit: debit, closingIfCredit: credit, usedLimit, direction, ambiguous: direction === null,
    closing: direction === 'credit' ? credit : direction === 'debit' ? debit : null, purchasesOk, paymentsOk,
    ok: direction !== null && purchasesOk && paymentsOk };
}

/* ---------- 7. القوالب المتعلَّمة ---------- */
// template: {id, name, bank, kind: 'account'|'credit_card', headerRow, firstRow, signature, columns:{date, desc, debit, credit, amount, balance}, dateHint, accountId}
function parseLearned(rows, t) {
  const lines = [];
  for (let r = t.firstRow; r < rows.length; r++) {
    const row = rows[r] || [];
    const d = cellToISO(row[t.columns.date], t.dateHint);
    const desc = row[t.columns.desc];
    let amount = null;
    if (t.columns.amount != null && t.columns.amount >= 0) amount = parseNum(row[t.columns.amount]);
    else {
      const cr = t.columns.credit >= 0 ? parseNum(row[t.columns.credit]) : null;
      const db = t.columns.debit >= 0 ? parseNum(row[t.columns.debit]) : null;
      if (cr == null && db == null) amount = null; else amount = (cr ? Math.abs(cr) : 0) - (db ? Math.abs(db) : 0);
    }
    if (!d || amount == null || amount === 0) continue;
    if (t.kind === 'credit_card') amount = -amount; // في كشف البطاقة الموجب مشتريات
    lines.push({ rowIndex: r, postingDate: d, raw: String(desc == null ? '' : desc), credit: amount > 0 ? amount : 0, debit: amount < 0 ? amount : 0, balance: t.columns.balance >= 0 ? parseNum(row[t.columns.balance]) : null });
  }
  return { header: {}, lines };
}

/* ---------- 8. التصنيف ---------- */
function normMerchant(raw) {
  let s = cleanText(raw).toUpperCase().replace(/[_*]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+(RIYADH|JEDDAH|DAMMAM|KSA|SA)\s*$/g, '');
  // حذف أرقام الفروع في النهاية
  let prev;
  do { prev = s; s = s.replace(/\s+#?[A-Z]?\d+\s*$/, '').trim(); } while (s !== prev && s.length > 3);
  return s;
}
function seedMerchantFor(norm) { const n = normAr(norm); return MERCHANT_SEED.find(x => x.re.test(norm) || normAr(x.name) === n) || null; }
function keywordCategory(norm) { const k = KEYWORD_RULES.find(x => x.re.test(norm)); return k ? k.cat : null; }

// يبحث عن التاجر الموجود أو يجهز تاجر جديد (في plan)
function resolveMerchant(store, rawName, planMerchants) {
  if (!rawName) return null;
  const norm = normMerchant(rawName);
  if (!norm) return null;
  const all = store.all('merchants').concat(Array.from(planMerchants.values()));
  let m = all.find(x => (x.aliases || []).includes(norm));
  if (m) return m;
  const seed = seedMerchantFor(norm);
  if (seed) {
    m = all.find(x => x.seedKey === seed.name);
    if (m) { if (!m.aliases.includes(norm)) { m.aliases.push(norm); m._aliasAdded = true; } return m; }
    m = { id: uid(), name: seed.name, seedKey: seed.name, aliases: [norm], keywords: [], categoryId: null, subcategoryId: null, categorySource: null,
      suggestedCategoryId: seed.cat, suggestedSubcategoryId: seed.sub || null, defaultRecurrenceType: seed.rec || null, defaultNecessityType: null, _new: true };
    planMerchants.set(m.id, m); return m;
  }
  m = { id: uid(), name: cleanText(rawName).replace(/_+$/, ''), seedKey: null, aliases: [norm], keywords: [], categoryId: null, subcategoryId: null, categorySource: null,
    suggestedCategoryId: keywordCategory(norm), suggestedSubcategoryId: null, defaultRecurrenceType: null, defaultNecessityType: null, _new: true };
  planMerchants.set(m.id, m); return m;
}

const BILLERS = [
  { re: /^STC$/i, merchant: 'STC', cat: 'telecom', sub: 'telecom.postpaid' },
  { re: /ZAIN/i, merchant: 'Zain', cat: 'telecom', sub: 'telecom.postpaid' },
  { re: /MOBILY/i, merchant: 'Mobily', cat: 'telecom', sub: 'telecom.postpaid' },
  { re: /Saudi Energy|Electric/i, merchant: 'الشركة السعودية للكهرباء', cat: 'bills', sub: 'bills.electricity' },
  { re: /Water/i, merchant: 'شركة المياه الوطنية', cat: 'bills', sub: 'bills.water' },
  { re: /Traffic Violation|مخالف/i, merchant: 'مخالفات مرورية', cat: 'fines', sub: null },
];

function applyMerchantCategory(tx, merchant, familyCat) {
  if (merchant && merchant.categoryId) { tx.categoryId = merchant.categoryId; tx.subcategoryId = merchant.subcategoryId || null; tx.categorySource = 'merchant'; return; }
  if (familyCat) { tx.categoryId = familyCat.cat; tx.subcategoryId = familyCat.sub || null; tx.categorySource = 'rule'; return; }
  if (merchant && merchant.suggestedCategoryId) { tx.categoryId = merchant.suggestedCategoryId; tx.subcategoryId = merchant.suggestedSubcategoryId || null; tx.categorySource = 'seed'; return; }
  tx.categoryId = null; tx.subcategoryId = null; tx.categorySource = null;
}


/* ---------- بناء العملية من سطر مقروء (مشترك بين الكشوف والرسائل) ---------- */
function planHelpers(store, plan) {
  const findAccount = (pred) => store.all('accounts').find(pred) || Array.from(plan.newAccounts.values()).find(pred);
  const addAccount = (a) => { const acc = Object.assign({ id: uid(), bank: null, name: null, type: 'unknown', last4: null, accountFingerprint: null, currency: 'SAR', isMine: true, active: true, createdAt: new Date().toISOString() }, a); plan.newAccounts.set(acc.id, acc); return acc; };
  const ensureInstrument = (accountId, kind, last4, ownerGuess) => {
    let ins = store.all('instruments').concat(Array.from(plan.newInstruments.values())).find(i => i.accountId === accountId && i.kind === kind && i.last4 === last4);
    if (ins) return ins;
    ins = { id: uid(), accountId, kind, last4, label: (kind === 'mada' ? 'مدى ' : kind === 'credit_card' ? 'بطاقة ائتمانية ' : 'بطاقة ') + last4, instrumentOwner: ownerGuess || 'unknown', ownerName: null, includeInPersonalSpend: true, active: true };
    plan.newInstruments.set(ins.id, ins); return ins;
  };
  return { findAccount, addAccount, ensureInstrument };
}
async function buildTx(store, plan, H, acc, info, line, sourceType, recordId) {
  const settings = store.settings;
  const { findAccount, addAccount, ensureInstrument } = H;
  const tx = newTx({ transactionDate: info.transactionDate, postingDate: info.postingDate, time: info.time, direction: info.direction, grossAmount: info.grossAmount,
    accountId: acc.id, paymentMethod: info.paymentMethod || null, reference: info.reference || null, balanceAfter: line.balance != null ? line.balance : null,
    foreignAmount: info.foreignAmount || null, foreignCurrency: info.foreignCurrency || null });
  tx.sourceLinks = [{ sourceType, importId: plan.id, sourceRecordId: recordId, rawDescription: sanitizeText(line.raw) }];
  tx._family = info.family; tx._row = line.rowIndex;
  const fee = info.feeAmount || 0, vat = info.vatAmount || 0;
  tx.feeAmount = fee; tx.vatAmount = vat; tx.principalAmount = round2(tx.grossAmount - fee - vat);
  if (fee || vat) tx.feeTaxBreakdownKnown = true;

  switch (info.family) {
    case 'mada_purchase': case 'online_purchase': case 'visa_purchase': case 'card_purchase': case 'generic': {
      tx.merchantRaw = info.merchantRaw;
      if (info.family === 'generic') {
        // بنك غير معروف: نوع الحركة غير مؤكد. نعتبرها شراء فقط إذا تعرفنا على التاجر
        const merchant = info.direction === 'out' ? resolveMerchant(store, info.merchantRaw, plan.newMerchants) : null;
        if (merchant && (merchant.categoryId || merchant.suggestedCategoryId)) { tx.transactionType = 'Payment'; tx.classificationStatus = 'confirmed'; tx.merchantId = merchant.id; applyMerchantCategory(tx, merchant, null); }
        else { tx.transactionType = 'Unknown'; tx.classificationStatus = 'unclassified'; if (merchant) tx.merchantId = merchant.id; }
        break;
      }
      tx.transactionType = 'Payment'; tx.classificationStatus = 'confirmed';
      if (info.family === 'mada_purchase') tx.instrumentId = ensureInstrument(acc.id, info.instrumentKind || 'mada', info.instrumentLast4, 'unknown').id;
      if (info.family === 'card_purchase') tx.instrumentId = plan.cardInstrument ? plan.cardInstrument.id : null;
      if (info.family === 'visa_purchase' && info.foreignCurrency === 'SAR' && info.foreignAmount) {
        const diff = round2(tx.grossAmount - info.foreignAmount);
        // نفصل الرسوم فقط إذا طابق الفرق نسبة رسوم العملة الأجنبية المعروفة
        if (diff > 0 && Math.abs(diff - info.foreignAmount * FX_FEE_RATE) <= 0.015) {
          tx.feeAmount = diff; tx.vatAmount = 0; tx.feeTaxBreakdownKnown = false; tx.principalAmount = info.foreignAmount; tx._feeSub = 'fees.fx';
        }
      }
      const merchant = resolveMerchant(store, info.merchantRaw, plan.newMerchants);
      tx.merchantId = merchant ? merchant.id : null;
      const prepaid = /PREPAID/.test(normMerchant(info.merchantRaw || '')) && merchant && merchant.seedKey === 'STC' ? { cat: 'telecom', sub: 'telecom.prepaid' } : null;
      applyMerchantCategory(tx, merchant, prepaid);
      break;
    }
    case 'round_up': {
      tx.transactionType = 'InternalTransfer'; tx.transferSubtype = 'round_up'; tx.merchantRaw = info.merchantRaw ? 'تقريب — ' + info.merchantRaw : 'تقريب';
      tx._roundUpOfAmount = info.roundUpOfAmount;
      const dest = settings.roundUpDestination || { kind: 'unknown' };
      applyRoundUpDestination(tx, dest);
      break;
    }
    case 'fast_transfer_out': {
      tx._feeSub = 'fees.bank';
      const fp = await fingerprintIban(info.iban);
      const last4 = info.iban.slice(-4);
      const bankName = info.beneficiaryBank || SA_BANK_CODES[info.iban.slice(4, 6)] || null;
      let ben = store.all('beneficiaries').concat(Array.from(plan.newBeneficiaries.values())).find(b => b.accountFingerprint === fp);
      if (!ben) {
        const mine = matchesOwner(info.beneficiaryRaw, settings.ownerAliases);
        ben = { id: uid(), name: info.beneficiaryRaw, aliases: [], bank: bankName, accountFingerprint: fp, accountLast4: last4, categoryId: null, subcategoryId: null, isMyAccount: mine, linkedAccountId: null, defaultTransferType: null, notes: '', _new: true };
        if (mine) {
          let own = findAccount(a => a.accountFingerprint === fp);
          if (!own) own = addAccount({ bank: bankName, name: 'حساب ' + (bankName || '') + ' …' + last4, type: 'unknown', last4, accountFingerprint: fp });
          ben.linkedAccountId = own.id;
        }
        plan.newBeneficiaries.set(ben.id, ben);
      }
      tx.beneficiaryId = ben.id; tx.beneficiaryRaw = info.beneficiaryRaw;
      applyBeneficiaryClassification(tx, ben);
      break;
    }
    case 'internal_transfer_out': {
      const fp = await fingerprintAccountNo('alinma', info.counterpartyAccountNo);
      const nfp = await fingerprintNum(info.counterpartyAccountNo);
      const last4 = info.counterpartyAccountNo.slice(-4);
      const mine = matchesOwner(info.counterpartyName, settings.ownerAliases);
      let ownAcc = findAccount(a => a.accountFingerprint === fp);
      let ben = store.all('beneficiaries').concat(Array.from(plan.newBeneficiaries.values())).find(b => b.accountFingerprint === fp);
      if (!ben) {
        ben = { id: uid(), name: info.counterpartyName, aliases: [], bank: 'مصرف الإنماء', accountFingerprint: fp, numFingerprint: nfp, accountLast4: last4, categoryId: null, subcategoryId: null, isMyAccount: mine || !!ownAcc, linkedAccountId: ownAcc ? ownAcc.id : null, defaultTransferType: null, notes: '', _new: true };
        if (ben.isMyAccount && !ownAcc) { ownAcc = addAccount({ bank: 'مصرف الإنماء', name: 'حساب الإنماء …' + last4, type: 'unknown', last4, accountFingerprint: fp, numFingerprint: nfp }); ben.linkedAccountId = ownAcc.id; }
        plan.newBeneficiaries.set(ben.id, ben);
      }
      tx.beneficiaryId = ben.id; tx.beneficiaryRaw = info.counterpartyName;
      applyBeneficiaryClassification(tx, ben);
      break;
    }
    case 'internal_transfer_in': {
      tx.beneficiaryRaw = info.counterpartyName;
      if (matchesOwner(info.counterpartyName, settings.ownerAliases)) {
        tx.transactionType = 'InternalTransfer'; tx.classificationStatus = 'confirmed'; tx.transferLinkStatus = 'one_sided';
      } else { tx.transactionType = 'Unknown'; tx.classificationStatus = 'unclassified'; }
      break;
    }
    case 'salary': tx.transactionType = 'Income'; tx.incomeSubtype = 'salary'; tx.classificationStatus = 'confirmed'; tx.merchantRaw = 'راتب'; break;
    case 'reward': tx.transactionType = 'Income'; tx.incomeSubtype = 'reward'; tx.classificationStatus = 'confirmed'; tx.merchantRaw = 'مكافأة'; break;
    case 'bill_payment': {
      tx.transactionType = 'Payment'; tx.classificationStatus = 'confirmed';
      const b = BILLERS.find(x => x.re.test(info.billerRaw));
      tx.merchantRaw = b ? b.merchant : info.billerRaw;
      const merchant = resolveMerchant(store, tx.merchantRaw, plan.newMerchants);
      tx.merchantId = merchant ? merchant.id : null;
      applyMerchantCategory(tx, merchant, b ? { cat: b.cat, sub: b.sub } : null);
      break;
    }
    case 'card_payment': case 'card_settlement': {
      tx.transactionType = 'CreditCardPayment'; tx.classificationStatus = 'confirmed'; tx.targetCardLast4 = info.targetCardLast4 || null;
      tx.merchantRaw = info.targetCardLast4 ? 'سداد بطاقة ' + info.targetCardLast4 : 'تسوية بطاقة ائتمانية (البطاقة غير معروفة)';
      tx.cardPaymentStatus = 'unmatched'; tx.transferLinkStatus = 'one_sided';
      break;
    }
    case 'card_statement_payment': {
      tx.transactionType = 'CreditCardPayment'; tx.classificationStatus = 'confirmed'; tx.targetCardLast4 = acc.last4; tx.merchantRaw = 'سداد للبطاقة';
      tx.cardPaymentStatus = 'unmatched'; tx.transferLinkStatus = 'one_sided';
      break;
    }
    case 'card_statement_credit': tx.transactionType = 'Unknown'; tx.classificationStatus = 'unclassified'; tx.merchantRaw = cleanText(line.raw).slice(0, 60); break;
    case 'installment': {
      tx.transactionType = 'Payment'; tx.classificationStatus = 'confirmed';
      tx.merchantRaw = 'قسط تمويل ••' + info.loanRef.slice(-4);
      const merchant = resolveMerchant(store, tx.merchantRaw, plan.newMerchants);
      tx.merchantId = merchant ? merchant.id : null;
      applyMerchantCategory(tx, merchant, { cat: 'installments', sub: 'installments.finance' });
      break;
    }
    // ---- حالات الرسائل ----
    case 'sms_purchase': case 'sms_refund': {
      tx.transactionType = info.family === 'sms_refund' ? 'Refund' : 'Payment'; tx.classificationStatus = 'confirmed'; tx.merchantRaw = info.merchantRaw || null;
      if (info.instrumentLast4) {
        const kind = acc.type === 'credit_card' ? 'credit_card' : (info.instrumentKind || (/(مدى|mada)/i.test(line.raw) ? 'mada' : 'card'));
        tx.instrumentId = ensureInstrument(acc.id, kind, info.instrumentLast4, 'unknown').id;
      } else if (acc.type === 'credit_card') {
        const ci = store.all('instruments').concat(Array.from(plan.newInstruments.values())).find(i => i.accountId === acc.id && i.kind === 'credit_card'); if (ci) tx.instrumentId = ci.id;
      }
      if (!tx.paymentMethod) tx.paymentMethod = /apple\s?pay|أبل|ابل/i.test(line.raw) ? 'Apple Pay' : /(إنترنت|انترنت|online|أونلاين|اونلاين|e-?commerce)/i.test(line.raw) ? 'Online' : 'POS';
      const merchant = resolveMerchant(store, info.merchantRaw, plan.newMerchants);
      tx.merchantId = merchant ? merchant.id : null;
      applyMerchantCategory(tx, merchant, null);
      break;
    }
    case 'sms_transfer_out': {
      tx._feeSub = 'fees.bank'; tx.paymentMethod = tx.paymentMethod || 'Bank Transfer';
      tx.beneficiaryRaw = info.beneficiaryRaw || null; tx.beneficiaryLast4 = info.beneficiaryLast4 || null;
      const bens = store.all('beneficiaries').concat(Array.from(plan.newBeneficiaries.values()));
      const fps = (info.fingerprints || []).filter(f => f.type === 'iban' || f.type === 'account');
      let ben = null;
      for (const f of fps) { ben = bens.find(b => (b.accountFingerprint && (b.accountFingerprint === f.fingerprint || (f.alt || []).includes(b.accountFingerprint))) || (b.numFingerprint && b.numFingerprint === f.fingerprint)); if (ben) break; }
      // بدون بصمة: آخر 4 أرقام + الاسم بالضبط (لا مطابقة تقريبية لأسماء الأشخاص)
      if (!ben && info.beneficiaryLast4 && info.beneficiaryRaw) { const c = bens.filter(b => b.accountLast4 === info.beneficiaryLast4 && normAr(b.name || '') === normAr(info.beneficiaryRaw)); if (c.length === 1) ben = c[0]; }
      if (!ben && fps.length) {
        const f = fps[0], mine = matchesOwner(info.beneficiaryRaw, settings.ownerAliases);
        const bankName = f.bankCode ? (SA_BANK_CODES[f.bankCode] || null) : null;
        ben = { id: uid(), name: info.beneficiaryRaw || ('مستفيد …' + f.last4), aliases: [], bank: bankName, accountFingerprint: f.type === 'iban' ? f.fingerprint : ((f.alt || [])[0] || null), numFingerprint: f.type === 'account' ? f.fingerprint : null,
          accountLast4: f.last4, categoryId: null, subcategoryId: null, isMyAccount: mine, linkedAccountId: null, defaultTransferType: null, notes: '', _new: true };
        if (mine) {
          let own = findAccount(a => (ben.accountFingerprint && a.accountFingerprint === ben.accountFingerprint) || (ben.numFingerprint && a.numFingerprint === ben.numFingerprint));
          if (!own) own = addAccount({ bank: bankName, name: 'حساب ' + (bankName || '') + ' …' + f.last4, type: 'unknown', last4: f.last4, accountFingerprint: ben.accountFingerprint, numFingerprint: ben.numFingerprint });
          ben.linkedAccountId = own.id;
        }
        plan.newBeneficiaries.set(ben.id, ben);
      }
      if (ben) { tx.beneficiaryId = ben.id; tx.beneficiaryLast4 = ben.accountLast4 || tx.beneficiaryLast4; applyBeneficiaryClassification(tx, ben); }
      else if (info.beneficiaryRaw && matchesOwner(info.beneficiaryRaw, settings.ownerAliases)) { tx.transactionType = 'InternalTransfer'; tx.classificationStatus = 'confirmed'; tx.transferLinkStatus = 'one_sided'; }
      else { tx.transactionType = 'PersonTransfer'; tx.classificationStatus = 'temporary'; }
      break;
    }
    case 'sms_transfer_in': {
      tx.beneficiaryRaw = info.counterpartyName || null; tx.paymentMethod = tx.paymentMethod || 'Bank Transfer';
      if (info.counterpartyName && matchesOwner(info.counterpartyName, settings.ownerAliases)) { tx.transactionType = 'InternalTransfer'; tx.classificationStatus = 'confirmed'; tx.transferLinkStatus = 'one_sided'; }
      else { tx.transactionType = 'Unknown'; tx.classificationStatus = 'unclassified'; }
      break;
    }
    case 'sms_cash_withdrawal': tx.transactionType = 'CashWithdrawal'; tx.classificationStatus = 'confirmed'; tx.merchantRaw = 'سحب نقدي'; if (info.instrumentLast4) tx.instrumentId = ensureInstrument(acc.id, 'mada', info.instrumentLast4, 'unknown').id; break;
    case 'sms_cash_deposit': tx.transactionType = 'CashDeposit'; tx.classificationStatus = 'confirmed'; tx.merchantRaw = 'إيداع نقدي'; break;
    case 'sms_debit': case 'sms_credit': {
      tx.merchantRaw = info.merchantRaw || null;
      const merchant = info.direction === 'out' && info.merchantRaw ? resolveMerchant(store, info.merchantRaw, plan.newMerchants) : null;
      if (merchant && (merchant.categoryId || merchant.suggestedCategoryId)) { tx.transactionType = 'Payment'; tx.classificationStatus = 'confirmed'; tx.merchantId = merchant.id; applyMerchantCategory(tx, merchant, null); }
      else { tx.transactionType = 'Unknown'; tx.classificationStatus = 'unclassified'; if (merchant) tx.merchantId = merchant.id; if (!tx.merchantRaw) tx.merchantRaw = cleanText(line.raw).slice(0, 60); }
      break;
    }
    default: tx.transactionType = 'Unknown'; tx.classificationStatus = 'unclassified'; tx.merchantRaw = cleanText(line.raw).slice(0, 60);
  }
  return tx;
}

/* ---------- 9. التحضير للاستيراد ---------- */
function newTx(base) {
  return Object.assign({
    id: uid(), transactionDate: null, postingDate: null, time: null, direction: 'out', transactionType: 'Unknown',
    transferSubtype: null, incomeSubtype: null, grossAmount: 0, principalAmount: 0, feeAmount: 0, vatAmount: 0, feeTaxBreakdownKnown: null,
    currency: 'SAR', foreignAmount: null, foreignCurrency: null, accountId: null, instrumentId: null, paymentMethod: null,
    merchantId: null, merchantRaw: null, beneficiaryId: null, beneficiaryRaw: null, counterpartyAccountId: null, transferLinkStatus: null,
    targetCardId: null, targetCardLast4: null, cardPaymentStatus: null, roundUpOfId: null, categoryId: null, subcategoryId: null, categorySource: null,
    recurrenceType: null, necessityType: null, classificationStatus: 'unclassified', reference: null, balanceAfter: null, sourceLinks: [],
    duplicateStatus: 'independent', confidenceScore: null, linkedTransactionIds: [], note: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }, base || {});
}

// نسبة الرسوم الأجنبية المعروفة للبنك: 2% + ضريبة 15% عليها = 2.3%
const FX_FEE_RATE = 0.023;

/**
 * يقرأ الملف ويجهز خطة استيراد بدون أي تعديل على المخزن.
 * file: {name, bytes(Uint8Array|ArrayBuffer), rows(مصفوفة صفوف)}
 * opts: {learnedTemplate, accountId(للقالب المتعلّم), cardDirection('debit'|'credit')}
 */
async function prepareImport(store, file, opts) {
  opts = opts || {};
  const settings = store.settings;
  const hash = await sha256Hex(file.bytes instanceof ArrayBuffer ? new Uint8Array(file.bytes) : file.bytes);
  const dupFile = store.all('imports').find(i => i.hash === hash);
  if (dupFile) return { error: 'duplicate_file', message: 'تم استيراد هذا الملف سابقًا.', existing: dupFile };
  const rows = file.rows;
  const det = opts.learnedTemplate ? { kind: 'learned', template: opts.learnedTemplate } : detectTemplate(rows, store.all('templates'));
  if (det.kind === 'unknown') return { needsTemplate: true, rows: rows.slice(0, 40), filename: file.name, hash };

  const plan = { id: uid(), hash, filename: sanitizeFilename(file.name), kind: null, header: null, balanceCheck: null, newAccounts: new Map(), newInstruments: new Map(),
    newBeneficiaries: new Map(), newMerchants: new Map(), txs: [], account: null, warnings: [] };
  const H = planHelpers(store, plan);
  const { findAccount, addAccount, ensureInstrument } = H;

  let parsed, sourceType;
  if (det.kind === 'alinma_account') {
    plan.kind = 'account'; sourceType = 'account_statement';
    parsed = parseAlinmaAccount(rows, det);
    const h = parsed.header; plan.header = h;
    const fp = await fingerprintAccountNo('alinma', h.accountNumber);
    const nfp = await fingerprintNum(h.accountNumber);
    const last4 = h.accountNumber.slice(-4);
    h.accountLast4 = last4; delete h.accountNumber; // لا نخزن رقم الحساب كاملًا
    let acc = findAccount(a => a.accountFingerprint === fp) || findAccount(a => a.bank === h.bank && a.last4 === last4 && a.type !== 'credit_card');
    if (!acc) acc = addAccount({ bank: h.bank, name: 'الحساب الجاري …' + last4, type: 'checking', last4, accountFingerprint: fp, numFingerprint: nfp, currency: h.currency });
    else if (!acc.accountFingerprint || !acc.numFingerprint || acc.type === 'unknown') { acc = Object.assign({}, acc, { accountFingerprint: fp, numFingerprint: nfp, type: acc.type === 'unknown' ? 'checking' : acc.type }); plan.updatedAccount = acc; }
    plan.account = acc;
  } else if (det.kind === 'alinma_card') {
    plan.kind = 'credit_card'; sourceType = 'card_statement';
    parsed = parseAlinmaCard(rows);
    const h = parsed.header; plan.header = h;
    let acc = findAccount(a => a.type === 'credit_card' && a.last4 === h.cardLast4);
    if (!acc) acc = addAccount({ bank: h.bank, name: 'بطاقة ائتمانية ' + h.cardLast4, type: 'credit_card', last4: h.cardLast4, creditLimit: h.creditLimit });
    plan.account = acc;
    const owner = matchesOwner(h.customerName, settings.ownerAliases) ? 'me' : 'unknown';
    plan.cardInstrument = ensureInstrument(acc.id, 'credit_card', h.cardLast4, owner);
    delete h.customerName; // لا نخزن الاسم
    if (h.linkedAccountNumber) { h.linkedAccountFingerprint = await fingerprintAccountNo('alinma', h.linkedAccountNumber); h.linkedAccountLast4 = h.linkedAccountNumber.slice(-4); delete h.linkedAccountNumber; }
  } else {
    const t = det.template; plan.kind = t.kind; sourceType = t.kind === 'credit_card' ? 'card_statement' : 'account_statement';
    parsed = parseLearned(rows, t); plan.header = { bank: t.bank }; plan.template = t;
    plan.account = store.get('accounts', t.accountId) || null;
    if (!plan.account) return { error: 'no_account', message: 'القالب مرتبط بحساب غير موجود.' };
  }
  plan.sourceType = sourceType;
  const acc = plan.account;

  // ---- تحويل كل سطر لعملية ----
  for (const line of parsed.lines) {
    let info;
    if (det.kind === 'alinma_card') info = interpretCardLine(line);
    else if (det.kind === 'alinma_account' || (det.kind === 'learned' && /إنماء|الانماء|alinma/i.test(det.template.bank || ''))) info = interpretAlinmaLine(line);
    else info = { direction: (line.credit + line.debit) < 0 ? 'out' : 'in', grossAmount: round2(Math.abs(line.credit + line.debit)), postingDate: line.postingDate, transactionDate: line.postingDate, time: null, family: 'generic', merchantRaw: cleanText(line.raw).slice(0, 80) };
    if (plan.kind === 'credit_card' && det.kind === 'learned') { info.family = info.direction === 'out' ? 'card_purchase' : 'card_statement_credit'; info.merchantRaw = cleanText(line.raw).slice(0, 80); }

    const tx = await buildTx(store, plan, H, acc, info, line, sourceType, 'row-' + line.rowIndex);
    plan.txs.push(tx);
  }

  // ---- ربط التقريب بالشراء الأصلي داخل نفس الملف ----
  plan.txs.forEach((tx, i) => {
    if (tx.transferSubtype !== 'round_up') return;
    const want = tx._roundUpOfAmount;
    const near = [plan.txs[i + 1], plan.txs[i - 1], plan.txs[i + 2], plan.txs[i - 2]].filter(Boolean);
    let p = near.find(x => x.transactionType === 'Payment' && want != null && eq2(x.grossAmount, want) && x.transactionDate === tx.transactionDate);
    if (!p) p = plan.txs.find(x => x.transactionType === 'Payment' && want != null && eq2(x.grossAmount, want) && x.transactionDate === tx.transactionDate && x.time === tx.time);
    if (p) { tx.roundUpOfId = p.id; tx.linkedTransactionIds = [p.id]; p.linkedTransactionIds = (p.linkedTransactionIds || []).concat(tx.id); }
  });

  // ---- فحص الرصيد ----
  if (plan.kind === 'account' && det.kind === 'alinma_account') plan.balanceCheck = accountBalanceCheck(parsed.header, parsed.lines);
  else if (det.kind === 'alinma_card') {
    const bc = cardBalanceCheck(parsed.header, parsed.lines);
    if (opts.cardDirection && bc.ambiguous) { bc.direction = opts.cardDirection; bc.closing = opts.cardDirection === 'credit' ? bc.closingIfCredit : bc.closingIfDebit; bc.userChosen = true; bc.ok = false; }
    plan.balanceCheck = bc;
  } else if (parsed.lines.some(l => l.balance != null)) plan.balanceCheck = genericBalanceCheck(parsed.lines);
  else plan.balanceCheck = { status: 'unavailable', ok: null };

  // ---- الفترة ----
  const dates = plan.txs.map(t => t.transactionDate).concat(plan.txs.map(t => t.postingDate)).filter(Boolean).sort();
  if (plan.kind === 'credit_card' && plan.header.statementDate) { plan.startDate = dates[0]; plan.endDate = plan.header.statementDate; }
  else { plan.startDate = (plan.header && plan.header.startDate) || dates[0]; plan.endDate = (plan.header && plan.header.endDate) || dates[dates.length - 1]; }

  // ---- المطابقة مع العمليات الموجودة ----
  plan.matches = findDuplicates(store, plan.txs, { importId: plan.id, sourceType });
  plan.summary = summarizePlan(store, plan);
  return plan;
}

function applyRoundUpDestination(tx, dest) {
  if (dest && dest.kind === 'account') { tx.transactionType = 'InternalTransfer'; tx.counterpartyAccountId = dest.accountId; tx.classificationStatus = 'confirmed'; tx.transferLinkStatus = 'one_sided'; tx.categoryId = null; tx.subcategoryId = null; }
  else if (dest && dest.kind === 'charity') { tx.transactionType = 'Payment'; tx.classificationStatus = 'confirmed'; tx.categoryId = 'donations'; tx.subcategoryId = null; tx.categorySource = 'rule'; tx.counterpartyAccountId = null; }
  else { tx.transactionType = 'InternalTransfer'; tx.classificationStatus = 'unclassified'; tx.counterpartyAccountId = null; tx.categoryId = null; }
}

function applyBeneficiaryClassification(tx, ben) {
  if (ben.isMyAccount) {
    tx.transactionType = 'InternalTransfer'; tx.classificationStatus = 'confirmed'; tx.counterpartyAccountId = ben.linkedAccountId || null; tx.transferLinkStatus = 'one_sided';
    tx.categoryId = null; tx.subcategoryId = null; tx.categorySource = null;
  } else if (ben.defaultTransferType === 'unknown') {
    tx.transactionType = 'Unknown'; tx.classificationStatus = 'unclassified';
  } else {
    tx.transactionType = 'PersonTransfer';
    if (ben.categoryId) { tx.categoryId = ben.categoryId; tx.subcategoryId = ben.subcategoryId || null; tx.categorySource = 'beneficiary'; tx.classificationStatus = 'confirmed'; }
    else { tx.categoryId = null; tx.subcategoryId = null; tx.categorySource = null; tx.classificationStatus = 'temporary'; }
  }
}

function accountBalanceCheck(h, lines) {
  let bal = h.opening, mismatch = null, credits = 0, debits = 0, nC = 0, nD = 0;
  lines.forEach((l, i) => {
    credits += l.credit; debits += l.debit; if (l.credit) nC++; if (l.debit) nD++;
    bal = round2(bal + l.credit + l.debit);
    if (mismatch === null && l.balance != null && !eq2(bal, l.balance)) mismatch = { index: i, rowIndex: l.rowIndex, expected: bal, actual: l.balance };
  });
  const eqOk = h.opening != null && h.closing != null && eq2(round2(h.opening + credits + debits), h.closing);
  const totalsOk = (h.depositTotal == null || eq2(h.depositTotal, credits)) && (h.withdrawTotal == null || eq2(Math.abs(h.withdrawTotal), Math.abs(debits))) &&
    (h.depositCount == null || h.depositCount === nC) && (h.withdrawCount == null || h.withdrawCount === nD);
  return { status: eqOk && !mismatch && totalsOk ? 'ok' : 'review', ok: eqOk && !mismatch && totalsOk, opening: h.opening, closing: h.closing, credits: round2(credits), debits: round2(debits),
    depositCount: nC, withdrawCount: nD, equationOk: eqOk, runningOk: !mismatch, totalsOk, mismatch, lineCount: lines.length };
}
function genericBalanceCheck(lines) {
  const first = lines.find(l => l.balance != null);
  if (!first) return { status: 'unavailable', ok: null };
  let bal = round2(first.balance - (first.credit + first.debit)), mismatch = null;
  const opening = bal;
  lines.forEach((l, i) => { bal = round2(bal + l.credit + l.debit); if (mismatch === null && l.balance != null && !eq2(bal, l.balance)) mismatch = { index: i, rowIndex: l.rowIndex, expected: bal, actual: l.balance }; });
  return { status: mismatch ? 'review' : 'ok', ok: !mismatch, opening, closing: bal, runningOk: !mismatch, mismatch, lineCount: lines.length };
}

function summarizePlan(store, plan) {
  const s = { total: plan.txs.length, autoMerged: 0, possible: 0, newTx: 0, internal: 0, cardPayments: 0, roundUps: 0, unclassified: 0, temporary: 0, uncategorized: 0, unknownMerchants: 0, personTransfers: 0 };
  const mergedIds = new Set(plan.matches.auto.map(a => a.newId)), possibleIds = new Set(plan.matches.review.map(r => r.newId));
  plan.txs.forEach(t => {
    if (mergedIds.has(t.id)) s.autoMerged++; else if (possibleIds.has(t.id)) s.possible++; else s.newTx++;
    if (t.transactionType === 'InternalTransfer' && t.transferSubtype !== 'round_up') s.internal++;
    if (t.transactionType === 'CreditCardPayment') s.cardPayments++;
    if (t.transferSubtype === 'round_up') s.roundUps++;
    if (t.classificationStatus === 'unclassified') s.unclassified++;
    if (t.classificationStatus === 'temporary') s.temporary++;
    if (t.transactionType === 'PersonTransfer') s.personTransfers++;
    if (t.transactionType === 'Payment' && !t.categoryId) s.uncategorized++;
  });
  s.unknownMerchants = Array.from(plan.newMerchants.values()).filter(m => !m.suggestedCategoryId).length;
  return s;
}

/* ---------- 10. المطابقة ومنع التكرار ---------- */
// المواصفة المعتمدة: شروط دخول + دليل حاسم + نقاط مطلقة (المفقود = صفر) + استثناء كشف البطاقة + واحد لواحد
function instrumentKey(store, tx, planInstruments) {
  if (!tx.instrumentId) return null;
  const ins = store.get('instruments', tx.instrumentId) || (planInstruments && planInstruments.get(tx.instrumentId));
  return ins ? ins.kind + ':' + ins.last4 : null;
}
function merchantScore(a, b, store) {
  if (a.beneficiaryId || b.beneficiaryId) {
    if (a.beneficiaryId && a.beneficiaryId === b.beneficiaryId) return 30;
    // رسالة بدون مستفيد معروف: نقبل تطابق آخر 4 أرقام من حساب المستفيد فقط (لا مطابقة تقريبية للأسماء)
    const l4 = (x) => x.beneficiaryLast4 || (x.beneficiaryId && store.get('beneficiaries', x.beneficiaryId) ? store.get('beneficiaries', x.beneficiaryId).accountLast4 : null);
    const la = l4(a), lb = l4(b);
    return la && lb && la === lb && (!a.beneficiaryId || !b.beneficiaryId) ? 30 : 0;
  }
  if (a.merchantId && a.merchantId === b.merchantId) return 30;
  const na = normMerchant(a.merchantRaw || ''), nb = normMerchant(b.merchantRaw || '');
  if (!na || !nb) return 0;
  if (na === nb) return 30;
  if (na.length >= 5 && nb.length >= 5 && (na.includes(nb) || nb.includes(na))) return 20;
  const ta = new Set(na.split(' ').filter(w => w.length > 2)), tb = new Set(nb.split(' ').filter(w => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  const inter = Array.from(ta).filter(w => tb.has(w)).length;
  return inter / Math.max(ta.size, tb.size) >= 0.6 ? 20 : 0;
}
function srcTypes(tx) { return (tx.sourceLinks || []).map(s => s.sourceType); }

function scorePair(store, a, b, planInstruments) {
  // a: عملية جديدة، b: موجودة
  if (a.direction !== b.direction || (a.currency || 'SAR') !== (b.currency || 'SAR') || cents(a.grossAmount) !== cents(b.grossAmount)) return null;
  const da = a.transactionDate || a.postingDate, db = b.transactionDate || b.postingDate;
  const dd = Math.abs(daysBetween(da, db));
  if (dd > 3) return null;
  if (a.accountId && b.accountId && a.accountId !== b.accountId) return null;
  const ia = instrumentKey(store, a, planInstruments), ib = instrumentKey(store, b, planInstruments);
  if (ia && ib && ia !== ib) return null;
  // دليل حاسم
  if (a.reference && b.reference && a.reference === b.reference) return { score: 100, decisive: 'reference' };
  if (a.accountId && a.accountId === b.accountId && a.balanceAfter != null && b.balanceAfter != null && cents(a.balanceAfter) === cents(b.balanceAfter)) return { score: 100, decisive: 'balance' };
  let score = 0;
  score += dd === 0 ? 40 : dd === 1 ? 30 : dd === 2 ? 20 : 10;
  if (a.time && b.time) {
    const mins = Math.abs(minutesOf(da, a.time) - minutesOf(db, b.time));
    if (mins > 60) return null; // وقت موجود في الطرفين وفرقه أكثر من ساعة = مستقلتان
    score += mins <= 5 ? 40 : mins <= 15 ? 35 : mins <= 30 ? 30 : 20;
  }
  const ms = merchantScore(a, b, store); score += ms;
  if (ia && ib && ia === ib) score += 10;
  const manual = srcTypes(a).includes('manual') || srcTypes(b).includes('manual');
  // استثناء كشف البطاقة (بدون وقت): كل الأدلة المتاحة متطابقة
  const cardSide = srcTypes(a).includes('card_statement') || srcTypes(b).includes('card_statement');
  const cardException = cardSide && dd === 0 && ms === 30 && ia && ia === ib && !(a.time && b.time);
  return { score, cardException, manual };
}

function findDuplicates(store, newTxs, ctx) {
  const byAmt = new Map();
  store.all('transactions').forEach(t => { const k = cents(t.grossAmount); if (!byAmt.has(k)) byAmt.set(k, []); byAmt.get(k).push(t); });
  const pairs = [];
  newTxs.forEach(a => {
    (byAmt.get(cents(a.grossAmount)) || []).forEach(b => {
      if ((b.sourceLinks || []).some(s => s.importId === ctx.importId)) return; // نفس الملف لا يقارن
      const r = scorePair(store, a, b);
      if (!r || r.score < 65 && !r.cardException) return;
      pairs.push({ newId: a.id, existingId: b.id, score: r.score, decisive: r.decisive || null, cardException: !!r.cardException, manual: !!r.manual });
    });
  });
  return resolvePairs(pairs);
}

function resolvePairs(pairs) {
  // عدد المرشحين لكل طرف (للاستثناء وللتعادل)
  const cntNew = new Map(), cntEx = new Map();
  pairs.forEach(p => { cntNew.set(p.newId, (cntNew.get(p.newId) || 0) + 1); cntEx.set(p.existingId, (cntEx.get(p.existingId) || 0) + 1); });
  const eff = (p) => p.decisive ? 100 : p.score;
  pairs.sort((x, y) => eff(y) - eff(x));
  const usedN = new Set(), usedE = new Set(), auto = [], review = [];
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    if (usedN.has(p.newId) || usedE.has(p.existingId)) continue;
    const s = eff(p);
    // تعادل: مرشح آخر متاح بنفس الدرجة لأي طرف
    const tie = pairs.some((q, j) => j !== i && eff(q) === s && !usedN.has(q.newId) && !usedE.has(q.existingId) && (q.newId === p.newId || q.existingId === p.existingId));
    usedN.add(p.newId); usedE.add(p.existingId);
    const cardOk = p.cardException && cntNew.get(p.newId) === 1 && cntEx.get(p.existingId) === 1;
    if (p.decisive && !p.manual) auto.push(Object.assign({}, p, { reason: p.decisive }));
    else if (!tie && !p.manual && (s >= 90 || cardOk)) auto.push(Object.assign({}, p, { reason: cardOk && s < 90 ? 'card_exception' : 'score' }));
    else if (s >= 65 || p.cardException) review.push(Object.assign({}, p, { reason: tie ? 'tie' : p.manual ? 'manual' : 'score' }));
  }
  return { auto, review };
}

/* ---------- 11. اعتماد الاستيراد ---------- */
// decisions: { [newTxId]: 'merge' | 'separate' } لحالات المراجعة
function commitImport(store, plan, decisions) {
  decisions = decisions || {};
  const now = new Date().toISOString();
  plan.newAccounts.forEach(a => store.put('accounts', a));
  if (plan.updatedAccount) store.put('accounts', plan.updatedAccount);
  plan.newInstruments.forEach(i => store.put('instruments', i));
  plan.newBeneficiaries.forEach(b => { const c = Object.assign({}, b); delete c._new; store.put('beneficiaries', c); });
  plan.newMerchants.forEach(m => { const c = Object.assign({}, m); delete c._new; delete c._aliasAdded; store.put('merchants', c); });
  store.all('merchants').forEach(m => { if (m._aliasAdded) { delete m._aliasAdded; store.put('merchants', m); } });

  const mergeMap = new Map();
  plan.matches.auto.forEach(a => mergeMap.set(a.newId, a));
  plan.matches.review.forEach(r => { if (decisions[r.newId] === 'merge') mergeMap.set(r.newId, r); });
  const idRemap = new Map();
  let created = 0, merged = 0;
  plan.txs.forEach(tx => {
    const mm = mergeMap.get(tx.id);
    if (mm) {
      const ex = store.get('transactions', mm.existingId);
      if (ex) {
        const exOnlySms = (ex.sourceLinks || []).length && ex.sourceLinks.every(sl => sl.sourceType === 'sms');
        const newIsStatement = (tx.sourceLinks || []).some(sl => sl.sourceType === 'account_statement' || sl.sourceType === 'card_statement');
        ex.sourceLinks = (ex.sourceLinks || []).concat(tx.sourceLinks);
        if (exOnlySms && newIsStatement) completeFromStatement(ex, tx);
        ['balanceAfter', 'postingDate', 'time', 'reference', 'instrumentId', 'merchantRaw'].forEach(k => { if (ex[k] == null && tx[k] != null) ex[k] = tx[k]; });
        ex.duplicateStatus = 'confirmed'; ex.confidenceScore = mm.score; ex.updatedAt = now;
        store.put('transactions', ex); idRemap.set(tx.id, ex.id); merged++;
        return;
      }
    }
    const t = Object.assign({}, tx);
    Object.keys(t).forEach(k => { if (k.startsWith('_') && k !== '_feeSub') delete t[k]; });
    t.feeSubcategoryId = tx._feeSub || null; delete t._feeSub;
    if (plan.matches.review.some(r => r.newId === tx.id)) t.duplicateStatus = 'independent';
    store.put('transactions', t); created++;
  });
  // تصحيح روابط التقريب إذا اندمج أحد الطرفين
  plan.txs.forEach(tx => {
    const id = idRemap.get(tx.id) || tx.id; const t = store.get('transactions', id); if (!t) return;
    const fixed = (t.linkedTransactionIds || []).map(x => idRemap.get(x) || x);
    if (JSON.stringify(fixed) !== JSON.stringify(t.linkedTransactionIds || [])) { t.linkedTransactionIds = Array.from(new Set(fixed)); if (t.roundUpOfId) t.roundUpOfId = idRemap.get(t.roundUpOfId) || t.roundUpOfId; store.put('transactions', t); }
  });

  const bc = plan.balanceCheck || {};
  const imp = { id: plan.id, filename: plan.filename, hash: plan.hash, accountId: plan.account ? plan.account.id : null, kind: plan.kind, sourceType: plan.sourceType, templateId: plan.template ? plan.template.id : (plan.kind === 'credit_card' ? 'alinma_card' : 'alinma_account'),
    startDate: plan.startDate, endDate: plan.endDate, transactionCount: plan.txs.length, created, merged,
    openingBalance: bc.opening != null ? bc.opening : null, closingBalance: bc.closing != null ? bc.closing : null,
    previousBalance: plan.kind === 'credit_card' ? plan.header.previousBalance : null, previousBalanceDirection: plan.kind === 'credit_card' ? bc.direction : null,
    header: plan.header, balanceCheck: bc, balanceValidated: bc.ok === true ? true : bc.ok === false ? false : null, cardPaymentsStatus: null, createdAt: now };
  store.put('imports', imp);
  applyRulesTo(store, plan.txs.filter(t => !idRemap.has(t.id)).map(t => t.id));
  // آخر رصيد للحساب
  const acc = plan.account ? store.get('accounts', plan.account.id) : null;
  if (acc && bc.closing != null && (!acc.lastBalanceDate || plan.endDate >= acc.lastBalanceDate)) {
    acc.lastBalance = bc.closing; acc.lastBalanceDate = plan.endDate; acc.lastBalanceKind = plan.kind === 'credit_card' ? (bc.closing >= 0 ? 'due' : 'credit') : 'balance';
    store.put('accounts', acc);
  }
  pairTransfers(store);
  store.touch();
  return { created, merged, importId: imp.id, idRemap };
}

function deleteImport(store, importId) {
  let removed = 0, kept = 0;
  store.all('transactions').forEach(t => {
    if (!(t.sourceLinks || []).some(s => s.importId === importId)) return;
    const rest = t.sourceLinks.filter(s => s.importId !== importId);
    if (rest.length) { t.sourceLinks = rest; t.updatedAt = new Date().toISOString(); store.put('transactions', t); kept++; }
    else { store.remove('transactions', t.id); removed++; }
  });
  // تنظيف الروابط لعمليات محذوفة
  store.all('transactions').forEach(t => {
    const l = (t.linkedTransactionIds || []).filter(id => store.get('transactions', id));
    if (l.length !== (t.linkedTransactionIds || []).length) { t.linkedTransactionIds = l; if (t.roundUpOfId && !store.get('transactions', t.roundUpOfId)) t.roundUpOfId = null; store.put('transactions', t); }
  });
  store.remove('imports', importId);
  store.all('messages').filter(m => m.importId === importId).forEach(m => store.remove('messages', m.id));
  store.all('reviews').filter(r => r.importId === importId).forEach(r => store.remove('reviews', r.id));
  pairTransfers(store);
  store.touch();
  return { removed, kept };
}

/* ---------- 11ب. الرسائل البنكية ----------
   المسار: تحقق محلي من requestId ← فرز ← قراءة ← حساب وبطاقة ← تاجر/مستفيد ← مطابقة ← حفظ أو مراجعة.
   الإرسال بـ ack يصير في الواجهة بعد نجاح الحفظ في IndexedDB فقط. */
const SR = () => root.SmsReader || (typeof require === 'function' ? require('./sms.js') : null);
const OUT_FAMILIES = new Set(['mada_purchase', 'online_purchase', 'visa_purchase', 'fast_transfer_out', 'internal_transfer_out', 'bill_payment', 'card_payment', 'installment', 'round_up']);
// صيغة نصوص كشف الإنماء (رسائل الإنماء تشبهها)
function parseAlinmaSms(t, receivedDate) {
  const amt = SR().extractAmount(t); if (!amt) return null;
  const info = interpretAlinmaLine({ raw: t, credit: 0, debit: -amt.value, postingDate: receivedDate, balance: null });
  if (!info || info.family === 'unknown') return null;
  info.direction = OUT_FAMILIES.has(info.family) ? 'out' : 'in';
  info.grossAmount = amt.value; info.parser = 'alinma'; info.missing = []; info.ok = true; info.postingDate = null;
  return info;
}
function sameSender(a, b) { return normAr(a) === normAr(b); }
function parseSmsText(store, text, sender, receivedDate) {
  const R = SR(), t = R.norm(text);
  const tpls = store.all('templates').filter(x => x.kind === 'sms' && x.active !== false).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  let partial = null;
  for (const tp of tpls) {
    if (tp.sender && sender && !sameSender(tp.sender, sender)) continue;
    const sc = R.templateScore(tp, t); if (sc < 0.6) continue;
    const r = R.applyTemplate(tp, t); r.templateId = tp.id; r.score = sc;
    if (r.ok && !r.missing.length) return r;
    if (!partial || sc > partial.score) partial = r;
  }
  const a = parseAlinmaSms(t, receivedDate); if (a && !partial) return a;
  const g = R.parseGeneric(t);
  if (partial) {
    // قالب متعلّم انطبق جزئيًا: نكمّل الناقص من القراءة العامة، ونبقي الناقص ظاهر للمراجعة
    const fill = { amount: 'grossAmount', merchant: 'merchantRaw', beneficiary: 'beneficiaryRaw', counterparty: 'counterpartyName', cardLast4: 'instrumentLast4', accountLast4: 'accountLast4', balance: 'balanceAfter', fee: 'feeAmount', date: 'transactionDate', time: 'time' };
    const out = Object.assign({}, partial);
    partial.missing.forEach(k => { const f = fill[k]; if (f && g[f] != null && out[f] == null) out[f] = g[f]; });
    ['transactionDate', 'time', 'reference', 'iban', 'beneficiaryLast4', 'foreignAmount', 'foreignCurrency'].forEach(k => { if (out[k] == null && g[k] != null) out[k] = g[k]; });
    out.ok = out.grossAmount > 0 && !!out.direction;
    return out;
  }
  return g;
}
// بصمات الآيبان وأرقام الحسابات من نص ملصوق (قبل الإخفاء) — نفس معادلة صندوق الرسائل
async function localIds(text, sender) {
  const out = [], seen = new Set();
  const alinma = /inma|إنماء|الانماء|الإنماء/i.test(String(sender || '') + ' ' + text);
  const ibanRe = new RegExp(IBAN_EXACT.source, 'gi'); let m;
  while ((m = ibanRe.exec(text))) { const n = normIban(m[0]); if (n.length === 24 && !seen.has(n)) { seen.add(n); out.push({ type: 'iban', fingerprint: await fingerprintIban(n), last4: n.slice(-4), bankCode: n.slice(4, 6) }); } }
  const noIban = text.replace(ibanRe, x => ' '.repeat(x.length));
  for (const c of numberChains(noIban)) {
    if (!isAccountChain(noIban, c)) continue;
    const d = c.digits, before = noIban.slice(Math.max(0, c.s - 24), c.s);
    if (seen.has(d)) continue;
    seen.add(d);
    if (d.length === 16 && /(بطاق|card|مدى|mada|visa|فيزا|ماستر)/i.test(before)) { out.push({ type: 'card', last4: d.slice(-4) }); continue; }
    const o = { type: 'account', fingerprint: await fingerprintNum(d), last4: d.slice(-4) };
    if (alinma) o.alt = [await fingerprintAccountNo('alinma', d)];
    out.push(o);
  }
  return out;
}
// الحساب من آخر 4 أرقام أو البطاقة أو البصمة. إذا ما اتضح: مراجعة
function resolveSmsAccount(store, plan, info, ids, forcedId) {
  if (forcedId) return store.get('accounts', forcedId) || null;
  const accs = store.all('accounts').filter(a => a.type !== 'cash');
  const own = (ids || []).filter(f => f.type === 'account');
  for (const f of own) { const a = accs.find(x => x.numFingerprint === f.fingerprint || (f.alt || []).includes(x.accountFingerprint)); if (a && info.family !== 'sms_transfer_out') return a; }
  if (info.accountLast4) { const c = accs.filter(a => a.last4 === info.accountLast4 && a.type !== 'credit_card'); if (c.length === 1) return c[0]; const cc = accs.filter(a => a.last4 === info.accountLast4); if (cc.length === 1) return cc[0]; }
  if (info.instrumentLast4) {
    const ins = store.all('instruments').filter(i => i.last4 === info.instrumentLast4);
    const accIds = Array.from(new Set(ins.map(i => i.accountId)));
    if (accIds.length === 1) return store.get('accounts', accIds[0]) || null;
    const cc = accs.filter(a => a.type === 'credit_card' && a.last4 === info.instrumentLast4); if (cc.length === 1) return cc[0];
  }
  if (info.family === 'card_payment' || info.family === 'salary' || info.family === 'sms_transfer_in') { const chk = accs.filter(a => a.type === 'checking'); if (chk.length === 1 && !info.accountLast4) return chk[0]; }
  return null;
}
function smsFamilyFix(info) {
  if (info.family === 'bill_payment' && !info.billerRaw) info.billerRaw = info.merchantRaw || 'فاتورة';
  if (info.family === 'card_payment' && !info.targetCardLast4) info.targetCardLast4 = info.instrumentLast4 || null;
  return info;
}
function newReview(plan, rec, kind, extra) {
  const r = Object.assign({ id: uid(), kind, status: 'open', createdAt: new Date().toISOString(), messageId: rec.id, importId: plan.id }, extra || {});
  plan.reviews.push(r); rec.status = 'review'; rec.reviewId = r.id; return r;
}
/**
 * msgs: [{id(requestId), text, sender, receivedAt, source('inbox'|'paste'), ids?}]
 * opts: {forceAccount: {msgId: accountId}, forceDate: {msgId: 'YYYY-MM-DD'}, allowSameContent: Set(msgId), keepRecords: Set(msgId)}
 */
async function prepareSms(store, msgs, opts) {
  opts = opts || {};
  const R = SR(), now = new Date().toISOString();
  const plan = { id: uid(), kind: 'sms', sourceType: 'sms', filename: 'رسائل بنكية', hash: null, header: { bank: null }, account: null, balanceCheck: { status: 'unavailable', ok: null },
    newAccounts: new Map(), newInstruments: new Map(), newBeneficiaries: new Map(), newMerchants: new Map(), txs: [], msgRecords: [], reviews: [], held: new Map(), alreadyStored: [], warnings: [] };
  const H = planHelpers(store, plan);
  const batchHashes = new Map();
  let row = 0;
  for (const m of msgs) {
    row++;
    const prev = store.get('messages', m.id);
    if (prev && !(opts.keepRecords && opts.keepRecords.has(m.id))) { plan.alreadyStored.push(m.id); continue; } // محفوظة سابقًا: ack فقط
    const text = R.norm(m.text || '');
    const received = (m.receivedAt && /^\d{4}-\d{2}-\d{2}/.test(m.receivedAt)) ? m.receivedAt : now;
    // تاريخ الاستلام يصلح بديل لرسائل الاختصار فقط. الملصوقة: وقت اللصق مو تاريخ العملية
    const receivedDate = (m.source || 'paste') === 'paste' ? null : received.slice(0, 10);
    const contentHash = await sha256Hex((m.sender || '') + '|' + text.toLowerCase().replace(/\s+/g, ' '));
    const ids = (m.ids && m.ids.length) ? m.ids : await localIds(text, m.sender);
    const rec = { id: m.id, source: m.source || 'paste', sender: m.sender || null, receivedAt: received, processedAt: now, contentHash, cls: null, clsReason: '', status: null,
      text: null, ids: ids.map(x => ({ type: x.type, fingerprint: x.fingerprint || null, alt: x.alt || null, last4: x.last4, bankCode: x.bankCode || null })), txId: null, reviewId: null, parser: null, templateId: null, importId: plan.id, ackedAt: null };
    plan.msgRecords.push(rec);
    let c = R.classify(text);
    // صيغة متعلّمة تنطبق على الرسالة = رسالة مالية حتى لو الفرز العام ما عرفها
    if (c.cls === 'unknown' && store.all('templates').some(tp => tp.kind === 'sms' && tp.active !== false && R.templateScore(tp, text) >= 0.6 && R.applyTemplate(tp, text).ok)) c = { cls: 'financial', reason: 'صيغة متعلّمة' };
    rec.cls = c.cls; rec.clsReason = c.reason;
    if (c.cls === 'otp') { rec.status = 'discarded'; continue; } // رسالة رمز: ما نحفظ نصها أبدًا
    rec.text = sanitizeText(text);
    if (c.cls === 'informational') { rec.status = 'informational'; continue; }
    if (c.cls === 'unknown') { newReview(plan, rec, 'sms_unknown', { reason: c.reason }); continue; }
    // بصمة النص للمقارنة فقط: رسالة بنفس النص تروح المراجعة، ما تنحذف
    const same = store.all('messages').find(x => x.contentHash === contentHash && x.id !== m.id) || (batchHashes.has(contentHash) ? { id: batchHashes.get(contentHash) } : null);
    batchHashes.set(contentHash, m.id);
    if (same && !(opts.allowSameContent && opts.allowSameContent.has(m.id))) { newReview(plan, rec, 'sms_same_content', { otherMessageId: same.id }); continue; }
    const info = sanitizeInfo(smsFamilyFix(parseSmsText(store, text, m.sender, receivedDate)));
    rec.parser = info.parser; rec.templateId = info.templateId || null;
    if (!info.ok) { newReview(plan, rec, 'sms_unparsed', { missing: info.missing || [], partial: stripInfo(info) }); continue; }
    // التاريخ اللي حدده المستخدم ينحفظ مع الرسالة، عشان ما ينطلب مرة ثانية لو احتاجت مراجعة ثانية (مثل الحساب)
    rec.userDate = (opts.forceDate && opts.forceDate[m.id]) || m.userDate || null;
    info.transactionDate = info.transactionDate || rec.userDate || receivedDate;
    if (!info.transactionDate) { newReview(plan, rec, 'sms_no_date', { info: stripInfo(info) }); continue; }
    info.fingerprints = rec.ids;
    const acc = resolveSmsAccount(store, plan, info, rec.ids, opts.forceAccount && opts.forceAccount[m.id]);
    if (!acc) { newReview(plan, rec, 'sms_no_account', { info: stripInfo(info) }); continue; }
    const line = { raw: text, balance: info.balanceAfter != null ? info.balanceAfter : null, rowIndex: row };
    const tx = await buildTx(store, plan, H, acc, info, line, 'sms', m.id);
    tx.sourceLinks[0].messageId = m.id;
    tx._msgId = m.id;
    plan.txs.push(tx); rec.status = 'tx'; rec.txId = tx.id;
    const missing = (info.missing || []).filter(k => k !== 'amount');
    if (missing.length || ((tx.transactionType === 'Payment' || tx.transactionType === 'Refund') && !tx.merchantRaw)) {
      newReview(plan, rec, 'sms_partial', { txId: tx.id, missing: missing.length ? missing : ['merchant'] });
      rec.status = 'tx'; // العملية انحفظت، والمراجعة لإكمال الحقول الناقصة
    }
  }
  // المطابقة مع العمليات الموجودة بالقاعدة المعتمدة
  plan.matches = findDuplicates(store, plan.txs, { importId: plan.id, sourceType: 'sms' });
  plan.matches.review.forEach(r => {
    const tx = plan.txs.find(t => t.id === r.newId); if (!tx) return;
    const rec = plan.msgRecords.find(x => x.id === tx._msgId);
    plan.held.set(tx.id, tx);
    // مراجعة التكرار تغلب مراجعة الحقول الناقصة لنفس الرسالة
    plan.reviews = plan.reviews.filter(x => !(x.kind === 'sms_partial' && x.txId === tx.id));
    newReview(plan, rec, 'sms_duplicate', { existingId: r.existingId, score: r.score, reason: r.reason, heldTx: cleanTx(tx) });
    rec.txId = null;
  });
  plan.matches.auto.forEach(a => { const rec = plan.msgRecords.find(x => x.txId === a.newId); if (rec) { rec.status = 'merged'; rec.txId = a.existingId; } });
  const st = { total: msgs.length, already: plan.alreadyStored.length, tx: 0, merged: plan.matches.auto.length, review: plan.reviews.length, informational: 0, discarded: 0 };
  plan.msgRecords.forEach(r => { if (r.status === 'tx') st.tx++; if (r.status === 'informational') st.informational++; if (r.status === 'discarded') st.discarded++; });
  plan.smsSummary = st;
  const dates = plan.txs.map(t => t.transactionDate).filter(Boolean).sort();
  plan.startDate = dates[0] || null; plan.endDate = dates[dates.length - 1] || null;
  plan.filename = 'رسائل بنكية (' + msgs.length + ')';
  return plan;
}
// المراجعة ما تحمل آيبان أو رقم حساب كامل؛ آخر 4 أرقام فقط
function stripInfo(info) {
  const o = Object.assign({}, info); delete o.fingerprints;
  if (o.iban) { o.ibanLast4 = normIban(o.iban).slice(-4); delete o.iban; }
  if (o.counterpartyAccountNo) { o.counterpartyAccountLast4 = String(o.counterpartyAccountNo).replace(/\D/g, '').slice(-4); delete o.counterpartyAccountNo; }
  return sanitizeInfo(o);
}
// الحقول النصية المقروءة من الرسالة (التاجر، المستفيد، المرسل) تنخفي منها الأرقام الحساسة قبل الحفظ
function sanitizeInfo(info) {
  ['merchantRaw', 'beneficiaryRaw', 'counterpartyName', 'billerRaw'].forEach(k => { if (typeof info[k] === 'string') info[k] = sanitizeText(info[k]); });
  return info;
}
function cleanTx(tx) { const t = JSON.parse(JSON.stringify(tx)); t.feeSubcategoryId = tx._feeSub || null; Object.keys(t).forEach(k => { if (k.startsWith('_')) delete t[k]; }); return t; }
function commitSms(store, plan) {
  const committable = Object.assign({}, plan, { txs: plan.txs.filter(t => !plan.held.has(t.id)), matches: { auto: plan.matches.auto, review: [] } });
  const needImport = committable.txs.length || plan.newAccounts.size || plan.newBeneficiaries.size;
  let res = { created: 0, merged: 0, idRemap: new Map() };
  if (needImport) res = commitImport(store, committable, {});
  else { plan.newMerchants.forEach(m => { const c = Object.assign({}, m); delete c._new; delete c._aliasAdded; store.put('merchants', c); }); }
  // الموارد اللي تحتاجها العمليات المعلّقة (تاجر، أداة، مستفيد) تنحفظ حتى لو ما في استيراد
  if (!needImport) { plan.newInstruments.forEach(i => store.put('instruments', i)); }
  plan.msgRecords.forEach(r => { if (r.txId && res.idRemap && res.idRemap.get(r.txId)) r.txId = res.idRemap.get(r.txId); store.put('messages', r); });
  plan.reviews.forEach(r => store.put('reviews', r));
  store.touch();
  return { created: res.created, merged: res.merged, reviews: plan.reviews.length, summary: plan.smsSummary };
}
function markAcked(store, ids) {
  const now = new Date().toISOString(); let n = 0;
  (ids || []).forEach(id => { const m = store.get('messages', id); if (m && !m.ackedAt) { m.ackedAt = now; store.put('messages', m); n++; } });
  return n;
}
// إكمال عملية الرسالة من الكشف: الكشف أدق في الأصل والرسوم وتاريخ القيد والرصيد والمرجع والمستفيد
function completeFromStatement(ex, tx) {
  ['principalAmount', 'feeAmount', 'vatAmount', 'feeTaxBreakdownKnown', 'postingDate', 'balanceAfter', 'reference'].forEach(k => { if (tx[k] != null) ex[k] = tx[k]; });
  if (tx._feeSub) ex.feeSubcategoryId = tx._feeSub;
  if (tx.instrumentId) ex.instrumentId = tx.instrumentId;
  if (tx.merchantId && !ex.merchantId) ex.merchantId = tx.merchantId;
  if (tx.beneficiaryId && ex.beneficiaryId !== tx.beneficiaryId) {
    ex.beneficiaryId = tx.beneficiaryId;
    if (ex.categorySource !== 'user_txn' && ex.typeSource !== 'user') {
      ['transactionType', 'classificationStatus', 'counterpartyAccountId', 'transferLinkStatus'].forEach(k => { ex[k] = tx[k]; });
      if (!ex.categoryId || ex.categorySource !== 'user_rule') { ex.categoryId = tx.categoryId; ex.subcategoryId = tx.subcategoryId; ex.categorySource = tx.categorySource; }
    }
  }
}
// مراجعة الرسائل: قرارات المستخدم
function reviewMessage(store, id) { const r = store.get('reviews', id); return r && r.messageId ? store.get('messages', r.messageId) : null; }
function closeReview(store, r, resolution) { r.status = 'resolved'; r.resolution = resolution; r.resolvedAt = new Date().toISOString(); store.put('reviews', r); }
function resolveDuplicate(store, reviewId, decision) {
  const r = store.get('reviews', reviewId); if (!r || r.status !== 'open' || r.kind !== 'sms_duplicate') return null;
  const msg = store.get('messages', r.messageId), held = r.heldTx;
  if (decision === 'merge') {
    const ex = store.get('transactions', r.existingId);
    if (ex) {
      ex.sourceLinks = (ex.sourceLinks || []).concat(held.sourceLinks);
      ['balanceAfter', 'time', 'reference', 'instrumentId', 'merchantRaw'].forEach(k => { if (ex[k] == null && held[k] != null) ex[k] = held[k]; });
      ex.duplicateStatus = 'confirmed'; ex.confidenceScore = r.score; ex.updatedAt = new Date().toISOString(); store.put('transactions', ex);
      if (msg) { msg.status = 'merged'; msg.txId = ex.id; store.put('messages', msg); }
    }
  } else {
    const t = Object.assign({}, held, { duplicateStatus: 'independent' });
    store.put('transactions', t); applyRulesTo(store, [t.id]);
    if (msg) { msg.status = 'tx'; msg.txId = t.id; store.put('messages', msg); }
    pairTransfers(store);
  }
  closeReview(store, r, decision); store.touch(); return r;
}
function resolveMessageReview(store, reviewId, action) {
  const r = store.get('reviews', reviewId); if (!r || r.status !== 'open') return null;
  const msg = store.get('messages', r.messageId);
  if (action === 'informational' && msg) { msg.status = 'informational'; msg.cls = 'informational'; store.put('messages', msg); }
  if (action === 'otp' && msg) { msg.status = 'discarded'; msg.cls = 'otp'; msg.text = null; store.put('messages', msg); }
  if (action === 'ignore' && msg) { msg.status = 'ignored'; store.put('messages', msg); }
  if (action === 'manual' && msg) { msg.status = 'manual'; store.put('messages', msg); }
  closeReview(store, r, action); store.touch(); return r;
}
// إعادة معالجة رسالة محفوظة (بعد تعليم صيغة، أو تحديد حساب، أو السماح بنص مكرر)
async function reprocessMessages(store, messageIds, opts) {
  opts = opts || {};
  const msgs = [], keep = new Set();
  messageIds.forEach(id => {
    const m = store.get('messages', id); if (!m || !m.text) return;
    msgs.push({ id: m.id, text: m.text, sender: m.sender, receivedAt: m.receivedAt, source: m.source, ids: m.ids, userDate: m.userDate || null });
    keep.add(m.id);
    store.all('reviews').filter(r => r.messageId === id && r.status === 'open').forEach(r => closeReview(store, r, 'reprocessed'));
  });
  if (!msgs.length) return null;
  const plan = await prepareSms(store, msgs, Object.assign({}, opts, { keepRecords: keep }));
  return plan;
}
// تعليم صيغة: يحفظ القالب (أو يحدّث قالب نفس البنك والنوع) ويرجّع الرسائل اللي تستفيد منه
function saveSmsTemplate(store, tpl, meta) {
  meta = meta || {};
  const now = new Date().toISOString();
  let t = meta.replaceId ? store.get('templates', meta.replaceId) : null;
  if (t) { Object.assign(t, tpl, { id: t.id, version: (t.version || 1) + 1, updatedAt: now, name: meta.name || t.name }); }
  else t = Object.assign({ id: uid(), createdAt: now, updatedAt: now, active: true, name: meta.name || ((tpl.bank || 'بنك') + ' — ' + (SMS_FAMILY_L[tpl.family] || 'رسالة')) }, tpl);
  if (meta.sample) t.sample = sanitizeText(meta.sample);
  store.put('templates', t); store.touch();
  // الرسائل المعلّقة للمراجعة أو الناقصة واللي تطابق الصيغة الجديدة
  const R = SR(), affected = [];
  store.all('reviews').filter(r => r.status === 'open' && ['sms_unparsed', 'sms_unknown', 'sms_partial'].includes(r.kind)).forEach(r => {
    const m = store.get('messages', r.messageId); if (!m || !m.text) return;
    if (R.templateScore(t, m.text) >= 0.6) affected.push({ review: r, message: m });
  });
  return { template: t, affected };
}
const SMS_FAMILY_L = { sms_purchase: 'شراء', sms_refund: 'استرداد', sms_transfer_out: 'حوالة صادرة', sms_transfer_in: 'حوالة واردة', salary: 'راتب', sms_cash_withdrawal: 'سحب نقدي', sms_cash_deposit: 'إيداع نقدي', bill_payment: 'سداد فاتورة', card_payment: 'سداد بطاقة', sms_debit: 'خصم', sms_credit: 'إيداع' };
// تعبئة الحقول الناقصة في عملية موجودة من القالب الجديد (بدون لمس تعديلاتك اليدوية)
function fillFromTemplate(store, reviewId, template) {
  const r = store.get('reviews', reviewId); if (!r || r.kind !== 'sms_partial') return null;
  const m = store.get('messages', r.messageId), tx = r.txId ? store.get('transactions', r.txId) : null; if (!m || !tx) return null;
  const info = SR().applyTemplate(template, m.text); if (!info || !info.ok) return null;
  const filled = [];
  if (info.merchantRaw && !tx.merchantRaw) {
    tx.merchantRaw = info.merchantRaw; filled.push('merchant');
    const pm = new Map(); const mer = resolveMerchant(store, info.merchantRaw, pm);
    pm.forEach(x => { const c = Object.assign({}, x); delete c._new; store.put('merchants', c); });
    if (mer) { tx.merchantId = mer.id; if (!tx.categoryId && tx.categorySource !== 'user_txn') applyMerchantCategory(tx, mer, null); }
  }
  if (info.balanceAfter != null && tx.balanceAfter == null) { tx.balanceAfter = info.balanceAfter; filled.push('balance'); }
  if (info.time && !tx.time) { tx.time = info.time; filled.push('time'); }
  if (info.instrumentLast4 && !tx.instrumentId) {
    const ins = store.all('instruments').find(i => i.accountId === tx.accountId && i.last4 === info.instrumentLast4);
    if (ins) { tx.instrumentId = ins.id; filled.push('cardLast4'); }
  }
  tx.updatedAt = new Date().toISOString(); store.put('transactions', tx);
  applyRulesTo(store, [tx.id]);
  closeReview(store, r, 'filled'); store.touch();
  return filled;
}

/* ---------- 11ج. القواعد المتقدمة للتجار والمستفيدين ----------
   الأولوية: تعديلك لعملية وحدة ← القاعدة ← التاجر/المستفيد ← التصنيف.
   rule: {id, name, enabled, order, when:{text, merchantId, beneficiaryId, direction, amountMin, amountMax, accountId, instrumentId, type, source}, then:{categoryId, subcategoryId, type, recurrenceType, necessityType, merchantId}} */
function ruleMatches(store, rule, t) {
  const w = rule.when || {};
  if (w.merchantId && t.merchantId !== w.merchantId) return false;
  if (w.beneficiaryId && t.beneficiaryId !== w.beneficiaryId) return false;
  if (w.direction && t.direction !== w.direction) return false;
  if (w.amountMin != null && w.amountMin !== '' && t.grossAmount < Number(w.amountMin)) return false;
  if (w.amountMax != null && w.amountMax !== '' && t.grossAmount > Number(w.amountMax)) return false;
  if (w.accountId && t.accountId !== w.accountId) return false;
  if (w.instrumentId && t.instrumentId !== w.instrumentId) return false;
  if (w.type && t.transactionType !== w.type) return false;
  if (w.source && !(t.sourceLinks || []).some(s => s.sourceType === w.source)) return false;
  if (w.text) {
    const m = t.merchantId ? store.get('merchants', t.merchantId) : null, b = t.beneficiaryId ? store.get('beneficiaries', t.beneficiaryId) : null;
    const hay = normAr([t.merchantRaw, t.beneficiaryRaw, m && m.name, b && b.name, (t.sourceLinks || []).map(s => s.rawDescription).join(' ')].filter(Boolean).join(' '));
    if (!hay.includes(normAr(w.text))) return false;
  }
  return !!(w.merchantId || w.beneficiaryId || w.text || w.accountId || w.instrumentId || w.amountMin || w.amountMax); // قاعدة بدون شرط حقيقي ما تنطبق
}
function applyRule(store, rule, t) {
  const th = rule.then || {}; let changed = false;
  if (t.transferSubtype === 'round_up') return false;
  if (th.type && t.typeSource !== 'user' && t.transactionType !== th.type) {
    t.transactionType = th.type; t.classificationStatus = th.type === 'Unknown' ? 'unclassified' : (th.type === 'PersonTransfer' && !t.categoryId && !th.categoryId ? 'temporary' : 'confirmed');
    if (th.type === 'InternalTransfer') { t.transferLinkStatus = t.transferLinkStatus || 'one_sided'; t.categoryId = null; t.subcategoryId = null; }
    t.typeSource = 'rule'; changed = true;
  }
  if (th.merchantId && t.merchantId !== th.merchantId) { t.merchantId = th.merchantId; changed = true; }
  if (th.categoryId !== undefined && th.categoryId !== null && t.categorySource !== 'user_txn' && ['Payment', 'CashExpense', 'PersonTransfer', 'Refund', 'Unknown'].includes(t.transactionType)) {
    promoteUnknown(t, th.categoryId);
    if (t.categoryId !== th.categoryId || (t.subcategoryId || null) !== (th.subcategoryId || null)) { t.categoryId = th.categoryId; t.subcategoryId = th.subcategoryId || null; changed = true; }
    t.categorySource = 'user_rule';
    if (t.transactionType === 'PersonTransfer') t.classificationStatus = 'confirmed';
  }
  if (th.recurrenceType && !t.recurrenceTypeUser && t.recurrenceType !== th.recurrenceType) { t.recurrenceType = th.recurrenceType; changed = true; }
  if (th.necessityType && !t.necessityTypeUser && t.necessityType !== th.necessityType) { t.necessityType = th.necessityType; changed = true; }
  if (changed || t.ruleId !== rule.id) { t.ruleId = rule.id; t.updatedAt = new Date().toISOString(); store.put('transactions', t); }
  return changed;
}
function activeRules(store) { return store.all('rules').filter(r => r.kind !== 'legacy' && r.enabled !== false && r.when).sort((a, b) => (a.order || 0) - (b.order || 0)); }
// تطبيق القواعد على عمليات محددة (أول قاعدة تنطبق تكفي)
function applyRulesTo(store, txIds) {
  const rules = activeRules(store); if (!rules.length) return 0;
  let n = 0;
  (txIds || []).forEach(id => { const t = store.get('transactions', id); if (!t) return; const r = rules.find(x => ruleMatches(store, x, t)); if (r && applyRule(store, r, t)) n++; });
  if (n) pairTransfers(store);
  return n;
}
function previewRule(store, rule) { return store.all('transactions').filter(t => ruleMatches(store, rule, t)); }
function applyRuleToAll(store, ruleId) {
  const rule = store.get('rules', ruleId); if (!rule) return 0;
  let n = 0; previewRule(store, rule).forEach(t => { if (applyRule(store, rule, t)) n++; });
  if (n) pairTransfers(store); store.touch(); return n;
}

/* ---------- 11د. حدود الصرف ----------
   لكل تصنيف رئيسي أو للإنفاق الكلي، على الفترة الحالية (الدورة).
   المصروف = نفس رقم «وين راحت الدراهم» (الإنفاق الحقيقي للتصنيف). التنبيه عند نسبة الإعداد (80% افتراضيًا) وعند 100%. */
function limitsStatus(store, period, R) {
  R = R || computePeriod(store, period);
  const alertPct = Number(store.settings.limitAlertPct || 80);
  return store.all('limits').filter(l => l.active !== false && Number(l.amount) > 0).map(l => {
    const spent = l.scope === 'total' ? R.spend : ((R.categories.find(c => c.categoryId === l.categoryId) || {}).amount || 0);
    const pct = spent / Number(l.amount) * 100;
    return Object.assign({}, l, { spent: round2(spent), remaining: round2(Number(l.amount) - spent), pct: Math.round(pct * 10) / 10, level: pct >= 100 ? 'over' : pct >= alertPct ? 'warn' : 'ok' });
  }).sort((a, b) => b.pct - a.pct);
}

/* ---------- 11هـ. التعديل الجماعي ---------- */
// ch: {categoryId?, subcategoryId?, type?, recurrenceType?, necessityType?, note?, noteMode:'append'|'replace'}
function bulkEdit(store, txIds, ch) {
  let n = 0; const now = new Date().toISOString();
  txIds.forEach(id => {
    const t = store.get('transactions', id); if (!t) return;
    let changed = false;
    if (ch.type && t.transactionType !== ch.type && t.transferSubtype !== 'round_up') {
      t.transactionType = ch.type; t.classificationStatus = ch.type === 'Unknown' ? 'unclassified' : (ch.type === 'PersonTransfer' && !t.categoryId ? 'temporary' : 'confirmed');
      if (ch.type === 'InternalTransfer') { t.transferLinkStatus = 'one_sided'; t.categoryId = null; t.subcategoryId = null; }
      t.typeSource = 'user'; changed = true;
    }
    if (ch.categoryId !== undefined && ['Payment', 'CashExpense', 'PersonTransfer', 'Refund', 'Unknown'].includes(t.transactionType) && t.transferSubtype !== 'round_up') {
      promoteUnknown(t, ch.categoryId);
      t.categoryId = ch.categoryId || null; t.subcategoryId = ch.subcategoryId || null; t.categorySource = 'user_txn';
      if (t.transactionType === 'PersonTransfer') t.classificationStatus = ch.categoryId ? 'confirmed' : 'temporary';
      changed = true;
    }
    if (ch.recurrenceType !== undefined) { t.recurrenceType = ch.recurrenceType || null; t.recurrenceTypeUser = !!ch.recurrenceType; changed = true; }
    if (ch.necessityType !== undefined) { t.necessityType = ch.necessityType || null; t.necessityTypeUser = !!ch.necessityType; changed = true; }
    if (ch.note) { t.note = ch.noteMode === 'replace' || !t.note ? ch.note : t.note + ' — ' + ch.note; changed = true; }
    if (changed) { t.updatedAt = now; store.put('transactions', t); n++; }
  });
  if (ch.type) pairTransfers(store);
  store.touch(); return n;
}
function bulkDelete(store, txIds) {
  let n = 0;
  txIds.forEach(id => { const t = store.get('transactions', id); if (!t) return; if ((t.sourceLinks || []).every(s => s.sourceType === 'manual' || s.sourceType === 'cash_reconciliation' || s.sourceType === 'sms')) { store.remove('transactions', id); n++; store.all('messages').filter(m => m.txId === id).forEach(m => { m.status = 'deleted'; m.txId = null; store.put('messages', m); }); } });
  if (n) { pairTransfers(store); store.touch(); }
  return n;
}

/* ---------- 12. ربط التحويلات وسداد البطاقات ---------- */
function pairTransfers(store) {
  const txs = store.all('transactions');
  const accounts = new Map(store.all('accounts').map(a => [a.id, a]));
  const cardByLast4 = (l4) => store.all('accounts').find(a => a.type === 'credit_card' && a.last4 === l4);
  // تصفير الربط السابق
  txs.forEach(t => {
    if (t.transactionType === 'CreditCardPayment' || (t.transactionType === 'InternalTransfer' && t.transferSubtype !== 'round_up')) {
      t._pair = null;
    }
  });
  // سداد البطاقات: الطرف الخارج من الجاري ↔ الطرف الداخل في حساب البطاقة
  const outLegs = txs.filter(t => t.transactionType === 'CreditCardPayment' && t.direction === 'out');
  const inLegs = txs.filter(t => t.transactionType === 'CreditCardPayment' && t.direction === 'in');
  const used = new Set();
  outLegs.forEach(o => {
    const card = o.targetCardLast4 ? cardByLast4(o.targetCardLast4) : null;
    o.targetCardId = card ? card.id : null;
    if (!card) return;
    let best = null, bestD = 99;
    inLegs.forEach(i => {
      if (used.has(i.id) || i.accountId !== card.id || cents(i.principalAmount) !== cents(o.principalAmount)) return;
      const d = Math.abs(daysBetween(o.transactionDate, i.transactionDate));
      if (d <= 3 && d < bestD) { best = i; bestD = d; }
    });
    if (best) { used.add(best.id); o._pair = best.id; best._pair = o.id; }
  });
  // التحويلات الداخلية: خارج إلى حساب X ↔ داخل في الحساب X
  const itOut = txs.filter(t => t.transactionType === 'InternalTransfer' && t.transferSubtype !== 'round_up' && t.direction === 'out' && t.counterpartyAccountId);
  const itIn = txs.filter(t => t.transactionType === 'InternalTransfer' && t.transferSubtype !== 'round_up' && t.direction === 'in');
  const usedIn = new Set();
  itOut.forEach(o => {
    let best = null, bestD = 99;
    itIn.forEach(i => {
      if (usedIn.has(i.id) || i.accountId !== o.counterpartyAccountId || cents(i.principalAmount) !== cents(o.principalAmount)) return;
      if (i.counterpartyAccountId && i.counterpartyAccountId !== o.accountId) return;
      const d = Math.abs(daysBetween(o.transactionDate, i.transactionDate));
      if (d <= 3 && d < bestD) { best = i; bestD = d; }
    });
    if (best) { usedIn.add(best.id); o._pair = best.id; best._pair = o.id; }
  });
  txs.forEach(t => {
    const isCard = t.transactionType === 'CreditCardPayment';
    const isIT = t.transactionType === 'InternalTransfer' && t.transferSubtype !== 'round_up';
    if (!isCard && !isIT) { if (t._pair !== undefined) { delete t._pair; } return; }
    const pairId = t._pair || null; delete t._pair;
    const status = pairId ? 'linked' : 'one_sided';
    const links = (t.linkedTransactionIds || []).filter(id => { const x = store.get('transactions', id); return x && x.transactionType !== t.transactionType; });
    if (pairId) links.push(pairId);
    const cps = isCard ? (pairId ? 'matched' : 'unmatched') : t.cardPaymentStatus;
    const changed = t.transferLinkStatus !== status || cps !== t.cardPaymentStatus || JSON.stringify(links) !== JSON.stringify(t.linkedTransactionIds || []);
    if (isIT && pairId) { const p = store.get('transactions', pairId); if (p && !t.counterpartyAccountId) t.counterpartyAccountId = p.accountId; }
    if (changed) { t.transferLinkStatus = status; t.cardPaymentStatus = cps; t.linkedTransactionIds = Array.from(new Set(links)); store.put('transactions', t); }
    else if (isCard && t.direction === 'out') store.put('transactions', t); // targetCardId قد يتغير
  });
  // حالة مدفوعات كل كشف بطاقة
  store.all('imports').filter(i => i.kind === 'credit_card').forEach(imp => {
    const legs = store.all('transactions').filter(t => t.transactionType === 'CreditCardPayment' && t.direction === 'in' && (t.sourceLinks || []).some(s => s.importId === imp.id));
    const total = round2(legs.reduce((s, t) => s + t.principalAmount, 0));
    const matched = round2(legs.filter(t => t.transferLinkStatus === 'linked').reduce((s, t) => s + t.principalAmount, 0));
    const status = !legs.length ? null : eq2(matched, total) ? 'matched' : matched > 0 ? 'partial' : 'unmatched';
    if (imp.cardPaymentsStatus !== status || imp.cardPaymentsMatched !== matched) { imp.cardPaymentsStatus = status; imp.cardPaymentsTotal = total; imp.cardPaymentsMatched = matched; store.put('imports', imp); }
  });
}

/* ---------- 13. الدورات ---------- */
function dataRange(store) {
  const ds = store.all('transactions').map(t => t.transactionDate || t.postingDate).filter(Boolean).sort();
  return ds.length ? { min: ds[0], max: ds[ds.length - 1] } : null;
}
function paydayOf(y, m, day) { return isoDate(y, m, Math.min(day, daysInMonth(y, m))); }
function listCycles(store, today) {
  today = today || todayISO();
  const s = store.settings, range = dataRange(store);
  const start = range ? (range.min < today ? range.min : today) : today;
  const end = range && range.max > today ? range.max : today;
  const [sy, sm] = start.split('-').map(Number), [ey, em] = end.split('-').map(Number);
  const out = [];
  if (s.cycleMode === 'calendar') {
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) { out.push({ start: isoDate(y, m, 1), end: isoDate(y, m, daysInMonth(y, m)), kind: 'month' }); m++; if (m > 12) { m = 1; y++; } }
    return out.reverse();
  }
  const salaries = Array.from(new Set(store.all('transactions').filter(t => t.transactionType === 'Income' && t.incomeSubtype === 'salary').map(t => t.transactionDate))).sort();
  const bset = new Set(salaries);
  // الشهر اللي قبل البداية حتى الشهر اللي بعد النهاية
  let y = sy, m = sm - 1; if (m < 1) { m = 12; y--; }
  let ly = ey, lm = em + 1; if (lm > 12) { lm = 1; ly++; }
  while (y < ly || (y === ly && m <= lm)) {
    const prefix = `${y}-${pad2(m)}`;
    if (!salaries.some(d => d.startsWith(prefix))) bset.add(paydayOf(y, m, s.defaultPayday));
    m++; if (m > 12) { m = 1; y++; }
  }
  const b = Array.from(bset).sort();
  for (let i = 0; i < b.length - 1; i++) {
    const c = { start: b[i], end: addDays(b[i + 1], -1), kind: 'cycle', startsWithSalary: salaries.includes(b[i]), endKnown: salaries.includes(b[i + 1]) };
    if (c.end >= start && c.start <= end) out.push(c);
  }
  return out.reverse();
}
function currentCycle(store, today) { today = today || todayISO(); return listCycles(store, today).find(c => c.start <= today && c.end >= today) || null; }
function previousPeriod(store, period) {
  if (period.kind === 'week' || period.kind === 'year') return shiftPeriod(store, period, -1);
  if (period.kind === 'custom') { const len = daysBetween(period.start, period.end); return { start: addDays(period.start, -(len + 1)), end: addDays(period.start, -1), kind: 'custom' }; }
  const cs = listCycles(store, period.end > todayISO() ? period.end : undefined).slice().reverse();
  const i = cs.findIndex(c => c.start === period.start);
  if (i > 0) return cs[i - 1];
  const len = daysBetween(period.start, period.end);
  return { start: addDays(period.start, -(len + 1)), end: addDays(period.start, -1), kind: 'custom' };
}

// الأسبوع يبدأ الأحد وينتهي السبت. السنة ميلادية.
function weekOf(date) { const wd = new Date(dateToUTC(date)).getUTCDay(); const start = addDays(date, -wd); return { start, end: addDays(start, 6), kind: 'week' }; }
function yearOf(date) { const y = date.slice(0, 4); return { start: `${y}-01-01`, end: `${y}-12-31`, kind: 'year' }; }
function cycleOf(store, date) {
  const today = todayISO();
  return listCycles(store, date > today ? date : today).find(c => c.start <= date && c.end >= date) || null;
}
function periodOf(store, kind, date) {
  date = date || todayISO();
  if (kind === 'week') return weekOf(date);
  if (kind === 'year') return yearOf(date);
  return cycleOf(store, date);
}
function shiftPeriod(store, period, dir) {
  if (period.kind === 'week') return weekOf(addDays(period.start, 7 * dir));
  if (period.kind === 'year') return yearOf(`${Number(period.start.slice(0, 4)) + dir}-01-01`);
  if (period.kind === 'cycle' || period.kind === 'month') {
    if (dir < 0) return previousPeriod(store, period);
    return cycleOf(store, addDays(period.end, 1));
  }
  const len = daysBetween(period.start, period.end) + 1;
  return { start: addDays(period.start, len * dir), end: addDays(period.end, len * dir), kind: 'custom' };
}

/* ---------- 14. الأرقام والتحليل ---------- */
function catName(store, id) { const c = store.get('categories', id); return c ? c.name : 'بدون تصنيف'; }
function effective(store, tx, field) {
  // التكرار والضرورة: العملية ← التاجر ← الفرعي ← الرئيسي
  const txField = field === 'rec' ? 'recurrenceType' : 'necessityType';
  if (tx[txField]) return tx[txField];
  const m = tx.merchantId ? store.get('merchants', tx.merchantId) : null;
  const mField = field === 'rec' ? 'defaultRecurrenceType' : 'defaultNecessityType';
  if (m && m[mField]) return m[mField];
  const sub = tx.subcategoryId ? store.get('categories', tx.subcategoryId) : null;
  if (sub && sub[mField]) return sub[mField];
  const cat = tx.categoryId ? store.get('categories', tx.categoryId) : null;
  return cat ? cat[mField] : null;
}
function isCommitmentCat(store, tx) {
  const sub = tx.subcategoryId ? store.get('categories', tx.subcategoryId) : null;
  if (sub && sub.isCommitment !== null && sub.isCommitment !== undefined) return sub.isCommitment;
  const cat = tx.categoryId ? store.get('categories', tx.categoryId) : null;
  return !!(cat && cat.isCommitment);
}
function instrumentOf(store, tx) { return tx.instrumentId ? store.get('instruments', tx.instrumentId) : null; }
function isExcluded(store, tx) { const i = instrumentOf(store, tx); return !!(i && i.includeInPersonalSpend === false); }
const txDate = (t) => t.transactionDate || t.postingDate;
const inPeriod = (t, p) => { const d = txDate(t); return d >= p.start && d <= p.end; };

// أثر العملية على الإنفاق (الأصل) — الرسوم تُحسب منفصلة
function spendEffect(tx) {
  switch (tx.transactionType) {
    case 'Payment': case 'CashExpense': case 'PersonTransfer': return tx.principalAmount;
    case 'Refund': return -tx.principalAmount;
    default: return 0;
  }
}
const feeOf = (tx) => tx.transactionType === 'Unknown' ? 0 : round2((tx.feeAmount || 0) + (tx.vatAmount || 0));

function computePeriod(store, period) {
  const txs = store.all('transactions').filter(t => inPeriod(t, period));
  const r = { period, income: 0, incomeItems: [], spend: 0, temporarySpend: 0, temporaryCount: 0, unownedSpend: 0, unownedCount: 0, surplus: 0,
    unclassifiedOut: 0, unclassifiedOutCount: 0, roundUpUnknown: 0, roundUpUnknownCount: 0, unclassifiedIn: 0, unclassifiedInCount: 0,
    internal: 0, internalCount: 0, internalOneSided: 0, cardPayments: 0, cardPaymentsCount: 0, cardPaymentsUnmatched: 0, cardPaymentsUnknownCard: 0,
    commitments: 0, commitmentItems: [], fees: 0, byCategory: new Map(), merchants: new Map(), topTx: [], excludedSpend: 0, cashWithdrawals: 0, txCount: txs.length };
  const addCat = (cat, sub, amt, tx) => {
    const key = cat || '__none';
    if (!r.byCategory.has(key)) r.byCategory.set(key, { categoryId: cat, amount: 0, count: 0, subs: new Map(), txIds: [] });
    const c = r.byCategory.get(key); c.amount = round2(c.amount + amt); c.count++; c.txIds.push(tx.id);
    const sk = sub || '__none'; c.subs.set(sk, round2((c.subs.get(sk) || 0) + amt));
  };
  txs.forEach(tx => {
    const excluded = isExcluded(store, tx);
    const ins = instrumentOf(store, tx);
    const eff = spendEffect(tx), fee = feeOf(tx);
    if (eff !== 0 || (fee && tx.transactionType !== 'Unknown')) {
      if (excluded) { r.excludedSpend = round2(r.excludedSpend + eff + fee); }
      else {
        if (eff !== 0) {
          r.spend = round2(r.spend + eff);
          addCat(tx.transactionType === 'PersonTransfer' && !tx.categoryId ? '__person' : tx.categoryId, tx.subcategoryId, eff, tx);
          if (tx.transactionType === 'PersonTransfer' && tx.classificationStatus === 'temporary') { r.temporarySpend = round2(r.temporarySpend + eff); r.temporaryCount++; }
          if (ins && ins.instrumentOwner === 'unknown') { r.unownedSpend = round2(r.unownedSpend + eff + fee); r.unownedCount++; }
          if (tx.transactionType === 'Payment' && effective(store, tx, 'rec') === 'recurring' && isCommitmentCat(store, tx)) { r.commitments = round2(r.commitments + eff); r.commitmentItems.push(tx.id); }
          if ((tx.transactionType === 'Payment' || tx.transactionType === 'CashExpense') && tx.merchantId) {
            const m = r.merchants.get(tx.merchantId) || { merchantId: tx.merchantId, amount: 0, count: 0 };
            m.amount = round2(m.amount + eff + fee); m.count++; r.merchants.set(tx.merchantId, m);
          }
          if (eff > 0) r.topTx.push({ id: tx.id, amount: round2(eff + fee) });
        }
        if (fee) { r.spend = round2(r.spend + fee); r.fees = round2(r.fees + fee); addCat('fees', tx.feeSubcategoryId || 'fees.bank', fee, tx); }
      }
    }
    switch (tx.transactionType) {
      case 'Income': if (tx.classificationStatus === 'confirmed') { r.income = round2(r.income + tx.principalAmount); r.incomeItems.push(tx.id); } break;
      case 'Unknown':
        if (tx.direction === 'out') { r.unclassifiedOut = round2(r.unclassifiedOut + tx.grossAmount); r.unclassifiedOutCount++; }
        else { r.unclassifiedIn = round2(r.unclassifiedIn + tx.grossAmount); r.unclassifiedInCount++; }
        break;
      case 'InternalTransfer':
        if (tx.transferSubtype === 'round_up' && tx.classificationStatus === 'unclassified') {
          r.unclassifiedOut = round2(r.unclassifiedOut + tx.grossAmount); r.unclassifiedOutCount++; r.roundUpUnknown = round2(r.roundUpUnknown + tx.grossAmount); r.roundUpUnknownCount++;
        } else if (tx.transferLinkStatus === 'linked') {
          if (tx.direction === 'out') { r.internal = round2(r.internal + tx.principalAmount); r.internalCount++; }
        } else { r.internal = round2(r.internal + tx.principalAmount); r.internalCount++; r.internalOneSided++; }
        break;
      case 'CreditCardPayment':
        if (tx.transferLinkStatus === 'linked') { if (tx.direction === 'out') { r.cardPayments = round2(r.cardPayments + tx.principalAmount); r.cardPaymentsCount++; } }
        else { r.cardPayments = round2(r.cardPayments + tx.principalAmount); r.cardPaymentsCount++; r.cardPaymentsUnmatched++; if (tx.direction === 'out' && !tx.targetCardLast4) r.cardPaymentsUnknownCard++; }
        break;
      case 'CashWithdrawal': r.cashWithdrawals = round2(r.cashWithdrawals + tx.principalAmount); break;
    }
  });
  r.surplus = round2(r.income - r.spend);
  r.categories = Array.from(r.byCategory.values()).sort((a, b) => b.amount - a.amount).map(c => Object.assign(c, { subs: Array.from(c.subs.entries()).map(([k, v]) => ({ subcategoryId: k === '__none' ? null : k, amount: v })).sort((a, b) => b.amount - a.amount) }));
  r.topMerchants = Array.from(r.merchants.values()).sort((a, b) => b.amount - a.amount);
  r.topTx.sort((a, b) => b.amount - a.amount); r.topTx = r.topTx.slice(0, 15);
  r.coverage = coverageFor(store, period);
  r.bridge = auditBridge(store, period, txs, r);
  return r;
}

// أجزاء أثر العملية على الإنفاق الحقيقي، بنفس توزيع computePeriod على التصنيفات
function spendParts(store, tx) {
  if (isExcluded(store, tx)) return [];
  const eff = spendEffect(tx), fee = feeOf(tx), out = [];
  if (eff !== 0) out.push({ cat: tx.transactionType === 'PersonTransfer' && !tx.categoryId ? '__person' : (tx.categoryId || '__none'), sub: tx.subcategoryId || null, amt: eff });
  if (fee) out.push({ cat: 'fees', sub: tx.feeSubcategoryId || 'fees.bank', amt: fee });
  return out;
}
function spendIn(store, range) {
  let s = 0, n = 0;
  store.all('transactions').forEach(t => { if (!inPeriod(t, range)) return; n++; spendParts(store, t).forEach(p => { s += p.amt; }); });
  return { spend: round2(s), txCount: n };
}
// سلسلة الإنفاق للرسم: لكل يوم (أو لكل شهر) المجموع وتوزيعه على التصنيفات
function spendSeries(store, period, bucket) {
  const buckets = [], idx = new Map();
  if (bucket === 'month') {
    let [y, m] = period.start.split('-').map(Number); const [ey, em] = period.end.split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) {
      const b = { key: `${y}-${pad2(m)}`, start: isoDate(y, m, 1), end: isoDate(y, m, daysInMonth(y, m)), total: 0, cats: {} };
      idx.set(b.key, b); buckets.push(b); m++; if (m > 12) { m = 1; y++; }
    }
  } else {
    for (let d = period.start; d <= period.end; d = addDays(d, 1)) { const b = { key: d, start: d, end: d, total: 0, cats: {} }; idx.set(d, b); buckets.push(b); }
  }
  store.all('transactions').forEach(t => {
    if (!inPeriod(t, period)) return;
    const d = txDate(t), b = idx.get(bucket === 'month' ? d.slice(0, 7) : d); if (!b) return;
    spendParts(store, t).forEach(p => { b.total += p.amt; b.cats[p.cat] = (b.cats[p.cat] || 0) + p.amt; });
  });
  buckets.forEach(b => { b.total = round2(b.total); Object.keys(b.cats).forEach(k => { b.cats[k] = round2(b.cats[k]); }); });
  return { buckets, total: round2(buckets.reduce((s, b) => s + b.total, 0)) };
}
// المقارنة بنفس عدد الأيام: الفترة المفتوحة تُقارن أيامها اللي مضت (حتى اليوم) بنفس العدد من بداية الفترة السابقة؛ المكتملة تُقارن كاملة
function comparePeriods(store, period, today) {
  today = today || todayISO();
  const prev = previousPeriod(store, period);
  if (!prev || period.start > today) return null;
  const open = period.end > today;
  let cur = { start: period.start, end: period.end }, prv = { start: prev.start, end: prev.end };
  if (open) {
    const days = daysBetween(period.start, today) + 1;
    cur = { start: period.start, end: today };
    const pe = addDays(prev.start, days - 1);
    prv = { start: prev.start, end: pe < prev.end ? pe : prev.end };
  }
  const a = spendIn(store, cur), b = spendIn(store, prv);
  const covA = coverageFor(store, cur), covB = coverageFor(store, prv);
  return { current: a.spend, previous: b.spend, diff: round2(a.spend - b.spend), partial: open, days: daysBetween(cur.start, cur.end) + 1,
    curRange: cur, prevRange: prv, prevPeriod: prev, reliable: covA.complete && covB.complete && b.txCount > 0, curCoverage: covA, prevCoverage: covB };
}
// مقارنة يوم باليوم اللي قبله
function compareDay(store, date) {
  const d0 = { start: date, end: date }, d1 = { start: addDays(date, -1), end: addDays(date, -1) };
  const a = spendIn(store, d0), b = spendIn(store, d1);
  return { current: a.spend, previous: b.spend, diff: round2(a.spend - b.spend), prevDate: d1.start, reliable: coverageFor(store, d0).complete && coverageFor(store, d1).complete };
}

// هل ملفات كل حساب تغطي الفترة؟
function coverageFor(store, period) {
  const notes = [];
  const today = todayISO();
  store.all('accounts').filter(a => a.type !== 'cash').forEach(acc => {
    const imps = store.all('imports').filter(i => i.accountId === acc.id && i.sourceType !== 'sms' && i.startDate && i.endDate).map(i => [i.startDate, i.endDate]).sort((a, b) => a[0] < b[0] ? -1 : 1);
    if (!imps.length) return;
    const pEnd = period.end > today ? today : period.end;
    let cursor = period.start, gap = null;
    for (const [s, e] of imps) { if (s > cursor) { gap = [cursor, addDays(s, -1)]; break; } if (e >= cursor) cursor = addDays(e, 1); if (cursor > pEnd) break; }
    if (!gap && cursor <= pEnd) gap = [cursor, pEnd];
    if (gap && gap[0] <= pEnd) notes.push({ accountId: acc.id, name: acc.name, from: gap[0], to: gap[1] > pEnd ? pEnd : gap[1] });
  });
  return { complete: notes.length === 0, notes, periodOpen: period.end > today };
}

// معادلة التدقيق: للتفسير فقط
function auditBridge(store, period, txs, r) {
  const acctType = (id) => { const a = store.get('accounts', id); return a ? a.type : 'unknown'; };
  const isBank = (t) => !['credit_card', 'cash'].includes(acctType(t.accountId));
  const b = { bankOut: 0, internalOut: 0, cardPayOut: 0, cashOut: 0, loansOut: 0, unclassifiedOut: 0, excludedOut: 0, direct: 0, cardPurchases: 0, cashExpense: 0, refunds: 0, bankInPersonNet: 0, total: 0, computed: r.spend, diff: 0 };
  txs.forEach(t => {
    const bank = isBank(t);
    if (bank && t.direction === 'out') b.bankOut += t.grossAmount;
    if (!bank || t.direction !== 'out') {
      if (acctType(t.accountId) === 'credit_card' && t.direction === 'out' && !isExcluded(store, t) && (t.transactionType === 'Payment')) b.cardPurchases += t.grossAmount;
      if (acctType(t.accountId) === 'cash' && t.transactionType === 'CashExpense' && !isExcluded(store, t)) b.cashExpense += t.grossAmount;
      if (t.transactionType === 'Refund') b.refunds += t.principalAmount;
      return;
    }
    if (t.transactionType === 'Unknown' || (t.transferSubtype === 'round_up' && t.classificationStatus === 'unclassified')) b.unclassifiedOut += t.grossAmount;
    else if (t.transactionType === 'InternalTransfer') b.internalOut += t.principalAmount;
    else if (t.transactionType === 'CreditCardPayment') b.cardPayOut += t.principalAmount;
    else if (t.transactionType === 'CashWithdrawal') b.cashOut += t.principalAmount;
    else if (t.transactionType === 'LoanToPerson') b.loansOut += t.principalAmount;
    else if (isExcluded(store, t)) b.excludedOut += t.grossAmount;
  });
  Object.keys(b).forEach(k => { if (typeof b[k] === 'number') b[k] = round2(b[k]); });
  b.direct = round2(b.bankOut - b.internalOut - b.cardPayOut - b.cashOut - b.loansOut - b.unclassifiedOut - b.excludedOut);
  b.total = round2(b.direct + b.cardPurchases + b.cashExpense - b.refunds);
  b.diff = round2(b.total - r.spend);
  return b;
}

function accountBalances(store) {
  return store.all('accounts').map(a => {
    if (a.type === 'cash') return Object.assign({}, a, { balance: cashBalance(store, a.id), balanceDate: todayISO(), balanceKind: 'balance' });
    return Object.assign({}, a, { balance: a.lastBalance != null ? a.lastBalance : null, balanceDate: a.lastBalanceDate || null, balanceKind: a.lastBalanceKind || 'balance' });
  });
}

/* ---------- 15. الإدخال اليدوي والنقد ---------- */
const QUICK_WORDS = [
  { re: /قهو|كوفي|شاي|كرك|عصير|كافي/, cat: 'cafes' }, { re: /بنزين|وقود|محطة/, cat: 'fuel' },
  { re: /غداء|غدا|عشاء|عشا|فطور|مطعم|وجبة|شاورما|برجر|بيتزا/, cat: 'restaurants' }, { re: /بقال|سوبر|خضار|تموين/, cat: 'groceries' },
  { re: /صيدلي|دواء|علاج|مستشفى|عيادة/, cat: 'health' }, { re: /موقف|تاكسي|أوبر|اوبر|كريم/, cat: 'transport' },
  { re: /هدية|هديه/, cat: 'gifts' }, { re: /صدقة|صدقه|تبرع/, cat: 'donations' }, { re: /ملابس|ثوب|شماغ|حذاء/, cat: 'shopping', sub: 'shopping.clothes' },
  { re: /حلاق|مغسلة|غسيل/, cat: 'other' }, { re: /استراح/, cat: 'social', sub: 'social.resthouse' }, { re: /طلعة|طلعه/, cat: 'social', sub: 'social.outings' },
];
function parseQuickEntry(text) {
  const t = String(text || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').trim();
  const m = t.match(/(\d+(?:\.\d{1,2})?)/);
  const amount = m ? parseFloat(m[1]) : null;
  const desc = t.replace(m ? m[1] : '', '').replace(/ريال|ر\.س|SAR/gi, '').replace(/\s+/g, ' ').trim();
  const q = QUICK_WORDS.find(x => x.re.test(desc));
  return { amount, description: desc, categoryId: q ? q.cat : null, subcategoryId: q && q.sub ? q.sub : null };
}
function ensureCashAccount(store) {
  let cash = store.all('accounts').find(a => a.type === 'cash');
  if (!cash) cash = store.put('accounts', { id: uid(), bank: null, name: 'المحفظة النقدية', type: 'cash', last4: null, currency: 'SAR', isMine: true, active: true, createdAt: new Date().toISOString() });
  let ins = store.all('instruments').find(i => i.kind === 'cash');
  if (!ins) ins = store.put('instruments', { id: uid(), accountId: cash.id, kind: 'cash', last4: null, label: 'نقد', instrumentOwner: 'me', ownerName: null, includeInPersonalSpend: true, active: true });
  return { cash, ins };
}
function cashBalance(store, cashId) {
  let bal = 0;
  store.all('transactions').forEach(t => {
    if (t.transactionType === 'CashWithdrawal' && t.accountId !== cashId) bal += t.principalAmount;
    if (t.accountId === cashId) {
      if (t.transactionType === 'CashExpense') bal -= t.grossAmount;
      else if (t.transactionType === 'CashDeposit') bal -= t.grossAmount;
      else if (t.direction === 'in') bal += t.grossAmount;
      else bal -= t.grossAmount;
    }
  });
  return round2(bal);
}
/** e: {kind:'expense'|'income'|'withdrawal'|'deposit', amount, date, time, description, categoryId, subcategoryId, instrumentId|accountId, note} */
function addManual(store, e) {
  const { cash, ins: cashIns } = ensureCashAccount(store);
  const ins = e.instrumentId ? store.get('instruments', e.instrumentId) : null;
  const accountId = e.kind === 'withdrawal' || e.kind === 'deposit' ? e.accountId : (ins ? ins.accountId : (e.accountId || cash.id));
  const isCash = accountId === cash.id;
  const amt = round2(Math.abs(e.amount));
  const tx = newTx({ transactionDate: e.date, postingDate: null, time: e.time || null, grossAmount: amt, principalAmount: amt, accountId, instrumentId: e.kind === 'expense' ? (ins ? ins.id : (isCash ? cashIns.id : null)) : null,
    paymentMethod: isCash ? 'Cash' : null, merchantRaw: e.description || null, note: e.note || '', classificationStatus: 'confirmed' });
  tx.sourceLinks = [{ sourceType: 'manual', importId: null, sourceRecordId: tx.id, rawDescription: e.description || '' }];
  if (e.kind === 'expense') { tx.direction = 'out'; tx.transactionType = isCash ? 'CashExpense' : 'Payment'; tx.categoryId = e.categoryId || null; tx.subcategoryId = e.subcategoryId || null; tx.categorySource = e.categoryId ? 'user_txn' : null; }
  else if (e.kind === 'income') { tx.direction = 'in'; tx.transactionType = 'Income'; tx.incomeSubtype = e.incomeSubtype || 'other'; }
  else if (e.kind === 'withdrawal') { tx.direction = 'out'; tx.transactionType = 'CashWithdrawal'; tx.merchantRaw = tx.merchantRaw || 'سحب نقدي'; }
  else if (e.kind === 'deposit') { tx.direction = 'in'; tx.transactionType = 'CashDeposit'; tx.accountId = accountId; tx.merchantRaw = tx.merchantRaw || 'إيداع نقدي'; }
  if (e.description && tx.transactionType !== 'CashWithdrawal' && tx.transactionType !== 'CashDeposit') {
    const pm = new Map(); const m = resolveMerchant(store, e.description, pm);
    if (m) { pm.forEach(x => { const c = Object.assign({}, x); delete c._new; store.put('merchants', c); }); tx.merchantId = m.id; }
  }
  // مرشحات تكرار مع الكشوف (للمراجعة فقط، الإدخال اليدوي لا يندمج تلقائيًا)
  const dups = findDuplicates(store, [tx], { importId: '__manual__' + tx.id });
  store.put('transactions', tx); store.touch();
  return { tx, possibleDuplicates: dups.auto.concat(dups.review) };
}
function mergeInto(store, keepId, dropId) {
  const keep = store.get('transactions', keepId), drop = store.get('transactions', dropId);
  if (!keep || !drop) return;
  keep.sourceLinks = (keep.sourceLinks || []).concat(drop.sourceLinks || []);
  if (!keep.note && drop.note) keep.note = drop.note;
  if (!keep.categoryId && drop.categoryId) { keep.categoryId = drop.categoryId; keep.subcategoryId = drop.subcategoryId; keep.categorySource = drop.categorySource; }
  keep.duplicateStatus = 'confirmed'; keep.updatedAt = new Date().toISOString();
  store.put('transactions', keep); store.remove('transactions', dropId); store.touch();
}
function reconcileCash(store, actual, date) {
  const { cash } = ensureCashAccount(store);
  const sys = cashBalance(store, cash.id);
  const diff = round2(sys - actual);
  if (Math.abs(diff) < 0.005) return { diff: 0 };
  const tx = newTx({ transactionDate: date || todayISO(), accountId: cash.id, grossAmount: Math.abs(diff), principalAmount: Math.abs(diff), paymentMethod: 'Cash' });
  tx.sourceLinks = [{ sourceType: 'cash_reconciliation', importId: null, sourceRecordId: tx.id, rawDescription: `تسوية نقد: رصيد النظام ${sys} والفعلي ${actual}` }];
  if (diff > 0) { tx.direction = 'out'; tx.transactionType = 'CashExpense'; tx.merchantRaw = 'مصروف نقدي غير مفصل'; tx.classificationStatus = 'confirmed'; }
  else { tx.direction = 'in'; tx.transactionType = 'Unknown'; tx.merchantRaw = 'زيادة نقد غير مفسرة'; tx.classificationStatus = 'unclassified'; }
  store.put('transactions', tx); store.touch();
  return { diff, tx };
}

/* ---------- تعديل التصنيف بنطاق (هذه فقط / القادمة / السابقة والقادمة) ---------- */
// إعطاء تصنيف صرف لعملية خارجة «غير معروفة» يعني أنها دفع
function promoteUnknown(t, categoryId) {
  if (t.transactionType === 'Unknown' && t.direction === 'out' && categoryId) { t.transactionType = 'Payment'; t.classificationStatus = 'confirmed'; }
}
function setCategory(store, txId, categoryId, subcategoryId, scope) {
  const tx = store.get('transactions', txId); if (!tx) return 0;
  let n = 0;
  promoteUnknown(tx, categoryId);
  if (scope === 'this' || (!tx.merchantId && !tx.beneficiaryId)) {
    tx.categoryId = categoryId; tx.subcategoryId = subcategoryId || null; tx.categorySource = 'user_txn';
    if (tx.transactionType === 'PersonTransfer') tx.classificationStatus = categoryId ? 'confirmed' : 'temporary';
    tx.updatedAt = new Date().toISOString(); store.put('transactions', tx); store.touch(); return 1;
  }
  if (tx.beneficiaryId) {
    const b = store.get('beneficiaries', tx.beneficiaryId); b.categoryId = categoryId; b.subcategoryId = subcategoryId || null; store.put('beneficiaries', b);
    tx.categoryId = categoryId; tx.subcategoryId = subcategoryId || null; tx.categorySource = 'beneficiary';
    if (tx.transactionType === 'PersonTransfer') tx.classificationStatus = categoryId ? 'confirmed' : 'temporary';
    store.put('transactions', tx); n = 1;
    if (scope === 'all') store.all('transactions').forEach(t => { if (t.id !== tx.id && t.beneficiaryId === b.id && t.categorySource !== 'user_txn' && t.categorySource !== 'user_rule' && t.transactionType === 'PersonTransfer') { t.categoryId = categoryId; t.subcategoryId = subcategoryId || null; t.categorySource = 'beneficiary'; t.classificationStatus = categoryId ? 'confirmed' : 'temporary'; store.put('transactions', t); n++; } });
  } else {
    const m = store.get('merchants', tx.merchantId); m.categoryId = categoryId; m.subcategoryId = subcategoryId || null; m.categorySource = 'user'; store.put('merchants', m);
    tx.categoryId = categoryId; tx.subcategoryId = subcategoryId || null; tx.categorySource = 'merchant'; store.put('transactions', tx); n = 1;
    if (scope === 'all') store.all('transactions').forEach(t => { if (t.id !== tx.id && t.merchantId === m.id && t.categorySource !== 'user_txn' && t.categorySource !== 'user_rule' && t.transferSubtype !== 'round_up') { promoteUnknown(t, categoryId); t.categoryId = categoryId; t.subcategoryId = subcategoryId || null; t.categorySource = 'merchant'; store.put('transactions', t); n++; } });
  }
  store.touch(); return n;
}
function setMerchantCategory(store, merchantId, categoryId, subcategoryId) {
  const m = store.get('merchants', merchantId); if (!m) return 0;
  m.categoryId = categoryId; m.subcategoryId = subcategoryId || null; m.categorySource = 'user'; store.put('merchants', m);
  let n = 0;
  store.all('transactions').forEach(t => { if (t.merchantId === m.id && t.categorySource !== 'user_txn' && t.categorySource !== 'user_rule' && t.transferSubtype !== 'round_up') { promoteUnknown(t, categoryId); t.categoryId = categoryId; t.subcategoryId = subcategoryId || null; t.categorySource = 'merchant'; store.put('transactions', t); n++; } });
  store.touch(); return n;
}
function setBeneficiaryMine(store, benId, mine, accountName) {
  const b = store.get('beneficiaries', benId); if (!b) return;
  b.isMyAccount = !!mine;
  if (mine && !b.linkedAccountId) {
    const a = store.put('accounts', { id: uid(), bank: b.bank, name: accountName || ('حساب ' + (b.bank || '') + ' …' + (b.accountLast4 || '')), type: 'unknown', last4: b.accountLast4, accountFingerprint: b.accountFingerprint, currency: 'SAR', isMine: true, active: true, createdAt: new Date().toISOString() });
    b.linkedAccountId = a.id;
  }
  store.put('beneficiaries', b);
  store.all('transactions').forEach(t => { if (t.beneficiaryId === b.id && t.categorySource !== 'user_txn') { applyBeneficiaryClassification(t, b); store.put('transactions', t); } });
  pairTransfers(store); store.touch();
}
// بعد إضافة أسماء المالك لاحقًا: نطبقها على المستفيدين والتحويلات الواردة الموجودة (ترقية فقط، ما نلغي اختيار سابق)
function applyOwnerAliases(store) {
  const aliases = store.settings.ownerAliases || [];
  let n = 0;
  if (!aliases.length) return n;
  store.all('beneficiaries').forEach(b => { if (!b.isMyAccount && matchesOwner(b.name, aliases)) { setBeneficiaryMine(store, b.id, true); n++; } });
  store.all('transactions').forEach(t => {
    if (t.direction === 'in' && t.transactionType === 'Unknown' && !t.beneficiaryId && t.categorySource !== 'user_txn' && t.beneficiaryRaw && matchesOwner(t.beneficiaryRaw, aliases)) {
      t.transactionType = 'InternalTransfer'; t.classificationStatus = 'confirmed'; t.transferLinkStatus = 'one_sided'; store.put('transactions', t); n++;
    }
  });
  if (n) { pairTransfers(store); store.touch(); }
  return n;
}
function setRoundUpDestination(store, dest) {
  const s = store.settings; s.roundUpDestination = dest; store.put('settings', s);
  store.all('transactions').forEach(t => { if (t.transferSubtype === 'round_up') { applyRoundUpDestination(t, dest); store.put('transactions', t); } });
  pairTransfers(store);
  store.touch();
}
// تغيير نوع العملية يدويًا
function setType(store, txId, type, extra) {
  const t = store.get('transactions', txId); if (!t) return;
  extra = extra || {};
  t.transactionType = type; t.classificationStatus = type === 'Unknown' ? 'unclassified' : (type === 'PersonTransfer' && !t.categoryId ? 'temporary' : 'confirmed');
  if (type === 'InternalTransfer') { t.counterpartyAccountId = extra.counterpartyAccountId || null; t.transferLinkStatus = 'one_sided'; t.categoryId = null; t.subcategoryId = null; }
  if (type === 'Income') t.incomeSubtype = extra.incomeSubtype || t.incomeSubtype || 'other';
  if (type === 'CreditCardPayment') { t.targetCardLast4 = extra.targetCardLast4 || null; }
  t.typeSource = 'user'; t.updatedAt = new Date().toISOString();
  store.put('transactions', t); pairTransfers(store); store.touch();
}

/* ---------- 16. النسخ الاحتياطي ---------- */
function makeBackup(store) {
  const data = JSON.parse(JSON.stringify(store.exportAll()));
  // مفتاح صندوق الرسائل ما يطلع في النسخة الاحتياطية
  (data.settings || []).forEach(s => { if (s.inbox) delete s.inbox.token; });
  return { app: 'finance-manager', version: 2, exportedAt: new Date().toISOString(), data };
}
// الاستعادة تحافظ على إعداد صندوق الرسائل الحالي في هذا الجهاز
function prepareRestore(store, obj) {
  const data = JSON.parse(JSON.stringify(obj.data));
  const cur = store.settings && store.settings.inbox;
  (data.settings || []).forEach(s => { if (cur && (!s.inbox || !s.inbox.token)) s.inbox = JSON.parse(JSON.stringify(cur)); });
  return data;
}
function validateBackup(obj) {
  if (!obj || obj.app !== 'finance-manager' || !obj.data) return 'الملف ليس نسخة احتياطية من هذا التطبيق.';
  for (const n of ['transactions', 'accounts']) if (!Array.isArray(obj.data[n])) return 'النسخة ناقصة: ' + n;
  return null;
}

const Engine = {
  version: '1.3.1', round2, parseNum, cellToISO, cleanText, sha256Hex, uid, todayISO, addDays, daysBetween, isoDate,
  CATEGORY_SEED, buildCategoryRecords, Store, STORE_NAMES, DEFAULT_SETTINGS,
  sanitizeText, sanitizeFilename, fingerprintIban, fingerprintAccountNo, fingerprintNum, matchesOwner, normMerchant,
  detectTemplate, signatureOf, parseAlinmaAccount, interpretAlinmaLine, parseAlinmaCard, cardBalanceCheck,
  prepareImport, commitImport, deleteImport, findDuplicates, scorePair, pairTransfers,
  listCycles, currentCycle, previousPeriod, weekOf, yearOf, cycleOf, periodOf, shiftPeriod, spendParts, spendIn, spendSeries, comparePeriods, compareDay, coverageFor,
  computePeriod, accountBalances, catName, effective, isCommitmentCat, spendEffect, feeOf,
  parseQuickEntry, addManual, ensureCashAccount, cashBalance, reconcileCash, mergeInto,
  setCategory, setMerchantCategory, setBeneficiaryMine, applyOwnerAliases, setRoundUpDestination, setType, applyBeneficiaryClassification,
  makeBackup, validateBackup, prepareRestore, FX_FEE_RATE, onlyStampsChanged,
  parseSmsText, prepareSms, commitSms, markAcked, localIds, resolveDuplicate, resolveMessageReview, reprocessMessages, saveSmsTemplate, fillFromTemplate, SMS_FAMILY_L,
  ruleMatches, applyRulesTo, previewRule, applyRuleToAll, limitsStatus, bulkEdit, bulkDelete, completeFromStatement,
};
if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
else root.Engine = Engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
