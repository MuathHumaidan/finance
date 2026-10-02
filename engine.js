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
  s = s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.');
  // 1.7.1: فاصلة وحدة بعدها رقم أو رقمين في الآخر (410,5) = فاصلة عشرية، مو آلاف (الآلاف بعدها 3 أرقام)
  if (!s.includes('.') && /^[-+]?\d+[,،]\d{1,2}$/.test(s.replace(/\s/g, ''))) s = s.replace(/[,،]/, '.');
  s = s.replace(/[,،\s]/g, '');
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
    { id: 'home.household', name: 'أدوات منزلية', rec: 'variable', nec: 'discretionary', save: true },
    { id: 'home.cleaning', name: 'منظفات', emoji: '🧽' }] },
  { id: 'bills', name: 'فواتير', rec: 'recurring', nec: 'essential', commit: true, save: false, subs: [
    { id: 'bills.electricity', name: 'كهرباء' }, { id: 'bills.water', name: 'مياه' }] },
  { id: 'telecom', name: 'اتصالات', rec: 'variable', nec: 'essential', commit: false, save: false, subs: [
    { id: 'telecom.postpaid', name: 'فاتورة جوال وإنترنت', rec: 'recurring', commit: true },
    { id: 'telecom.prepaid', name: 'شحن مسبق الدفع', rec: 'variable' },
    { id: 'telecom.devices', name: 'أجهزة', nec: 'discretionary', save: true }] },
  { id: 'subscriptions', name: 'اشتراكات', rec: 'recurring', nec: 'discretionary', commit: true, save: true },
  { id: 'groceries', name: 'بقالة', rec: 'variable', nec: 'essential', commit: false, save: false, subs: [ // 1.6.0: من تصنيفات المنتجات
    { id: 'groceries.produce', name: 'خضار وفواكه', emoji: '🥦' }, { id: 'groceries.meat', name: 'لحوم ودواجن', emoji: '🍗' }, { id: 'groceries.dairy', name: 'ألبان وبيض', emoji: '🥛' },
    { id: 'groceries.bakery', name: 'مخبوزات', emoji: '🍞' }, { id: 'groceries.drinks', name: 'مشروبات', emoji: '🥤' }, { id: 'groceries.frozen', name: 'مجمدات', emoji: '🧊' },
    { id: 'groceries.snacks', name: 'حلويات ووجبات خفيفة', emoji: '🍫' }] },
  { id: 'fuel', name: 'وقود', rec: 'variable', nec: 'essential', commit: false, save: false },
  { id: 'transport', name: 'مواصلات', rec: 'variable', nec: 'essential', commit: false, save: false, subs: [
    { id: 'transport.parking', name: 'مواقف' }, { id: 'transport.ride', name: 'أجرة' }] },
  { id: 'health', name: 'صحة', rec: 'variable', nec: 'essential', commit: false, save: false, subs: [
    { id: 'health.medicine', name: 'أدوية', emoji: '💊' }] },
  { id: 'education', name: 'تعليم', rec: 'variable', nec: 'essential', commit: false, save: false },
  { id: 'fees', name: 'رسوم', rec: 'variable', nec: 'essential', commit: false, save: false, subs: [
    { id: 'fees.bank', name: 'رسوم بنكية' }, { id: 'fees.fx', name: 'رسوم عملة أجنبية' }] },
  { id: 'fines', name: 'مخالفات وغرامات', rec: 'variable', nec: 'essential', commit: false, save: false },
  { id: 'donations', name: 'تبرعات', rec: 'variable', nec: 'discretionary', commit: false, save: false },
  { id: 'restaurants', name: 'مطاعم', rec: 'variable', nec: 'discretionary', commit: false, save: true, subs: [
    { id: 'restaurants.dinein', name: 'مطعم' }, { id: 'restaurants.delivery', name: 'توصيل' }, { id: 'restaurants.fastfood', name: 'وجبات سريعة' }] },
  { id: 'cafes', name: 'مقاهي', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'shopping', name: 'تسوق', rec: 'variable', nec: 'discretionary', commit: false, save: true, subs: [
    { id: 'shopping.clothes', name: 'ملابس' }, { id: 'shopping.electronics', name: 'إلكترونيات' },
    { id: 'shopping.personal', name: 'عناية شخصية', emoji: '🧴' }, { id: 'shopping.kids', name: 'أطفال', emoji: '🧸' }, { id: 'shopping.stationery', name: 'قرطاسية', emoji: '✏️' }] },
  { id: 'entertainment', name: 'ترفيه', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'travel', name: 'سفر', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'hotels', name: 'فنادق', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'gifts', name: 'هدايا', rec: 'variable', nec: 'discretionary', commit: false, save: true },
  { id: 'social', name: 'مصروف اجتماعي', rec: 'variable', nec: 'discretionary', commit: false, save: true, subs: [
    { id: 'social.outings', name: 'طلعات' }, { id: 'social.resthouse', name: 'استراحة' }, { id: 'social.occasions', name: 'مناسبات' }] },
  { id: 'cash', name: 'سحب نقدي', rec: 'variable', nec: null, commit: false, save: false },
  { id: 'other', name: 'أخرى', rec: 'variable', nec: null, commit: false, save: false },
];

// 1.7.0: التصنيفات الجديدة تبدأ «غير محدد» في التكرار والضرورة والالتزام وفرص التوفير (انت تحددها).
// withDefaults = القيم الافتراضية القديمة (قبل 1.7.0)، للترقية بس: اللي ما غيّرته منها يرجع «غير محدد»
function buildCategoryRecords(withDefaults) {
  const out = [], D = !!withDefaults;
  CATEGORY_SEED.forEach((c, i) => {
    out.push({ id: c.id, name: c.name, parentId: null, order: i, defaultRecurrenceType: D ? c.rec : null, defaultNecessityType: D ? c.nec : null, isCommitment: D ? !!c.commit : null, savingsEligible: D ? !!c.save : null, active: true });
    (c.subs || []).forEach((s, j) => out.push({
      id: s.id, name: s.name, parentId: c.id, order: j, emoji: s.emoji || null,
      defaultRecurrenceType: D && s.rec !== undefined ? s.rec : null,
      defaultNecessityType: D && s.nec !== undefined ? s.nec : null,
      isCommitment: D && s.commit !== undefined ? !!s.commit : null,
      savingsEligible: D && s.save !== undefined ? !!s.save : null, active: true }));
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
// تصنيفات المنتجات (1.5.0): منفصلة تمامًا عن التصنيفات المالية، ولها IDs ثابتة
const PRODUCT_CATEGORY_SEED = [
  ['pc.produce', 'خضار وفواكه', '🥦', 'green'], ['pc.meat', 'لحوم ودواجن', '🍗', 'red'], ['pc.dairy', 'ألبان وبيض', '🥛', 'blue'], ['pc.bakery', 'مخبوزات', '🍞', 'yellow'],
  ['pc.drinks', 'مشروبات', '🥤', 'aqua'], ['pc.frozen', 'مجمدات', '🧊', 'blue'], ['pc.snacks', 'حلويات ووجبات خفيفة', '🍫', 'magenta'], ['pc.cleaning', 'منظفات', '🧽', 'aqua'],
  ['pc.personal', 'عناية شخصية', '🧴', 'violet'], ['pc.health', 'أدوية وصحة', '💊', 'green'], ['pc.kids', 'أطفال', '🧸', 'yellow'], ['pc.household', 'أدوات منزلية', '🏠', 'orange'],
  ['pc.electronics', 'إلكترونيات', '🔌', 'violet'], ['pc.clothes', 'ملابس وإكسسوارات', '👕', 'red'], ['pc.stationery', 'قرطاسية ومكتبية', '✏️', 'orange'], ['pc.other', 'أخرى', '📦', 'gray'],
];
// المدن (1.5.0): id ثابت + أسماء بديلة عربي وإنجليزي. الإحداثيات التقريبية لمركز المدينة ونصف القطر (كم) تُستخدم على الجهاز فقط
// لزر «استخدام موقعي الحالي» (بدون أي خدمة خارجية)، وما تنحفظ إحداثيات المستخدم أبدًا.
const CITY_SEED = [
  ['riyadh', 'الرياض', ['رياض', 'Riyadh', 'Ar Riyadh', 'Al Riyadh'], 24.7136, 46.6753, 45],
  ['jeddah', 'جدة', ['جده', 'Jeddah', 'Jiddah', 'Jedda'], 21.5433, 39.1728, 40],
  ['makkah', 'مكة المكرمة', ['مكة', 'مكه', 'مكه المكرمه', 'Makkah', 'Mecca', 'Mekkah', 'Makkah Al Mukarramah'], 21.3891, 39.8579, 25],
  ['madinah', 'المدينة المنورة', ['المدينة', 'المدينه المنوره', 'Madinah', 'Medina', 'Al Madinah', 'Al Madinah Al Munawwarah'], 24.4686, 39.6142, 30],
  ['dammam', 'الدمام', ['Dammam', 'Ad Dammam', 'Al Dammam'], 26.4207, 50.0888, 20],
  ['khobar', 'الخبر', ['Khobar', 'Al Khobar'], 26.2172, 50.1971, 14],
  ['dhahran', 'الظهران', ['Dhahran', 'Az Zahran'], 26.2886, 50.1140, 9],
  ['ahsa', 'الأحساء', ['الاحساء', 'الهفوف', 'المبرز', 'Al Ahsa', 'Al Hasa', 'Hofuf', 'Al Hofuf', 'Al Mubarraz'], 25.3833, 49.5864, 30],
  ['qatif', 'القطيف', ['Qatif', 'Al Qatif'], 26.5652, 49.9964, 12],
  ['jubail', 'الجبيل', ['Jubail', 'Al Jubail'], 27.0046, 49.6460, 25],
  ['hafar', 'حفر الباطن', ['Hafar Al Batin', 'Hafr Al Batin'], 28.4328, 45.9708, 20],
  ['khafji', 'الخفجي', ['Khafji', 'Al Khafji'], 28.4394, 48.4913, 12],
  ['buraydah', 'بريدة', ['بريده', 'Buraydah', 'Buraidah', 'Buraida'], 26.3260, 43.9750, 22],
  ['unaizah', 'عنيزة', ['عنيزه', 'Unaizah', 'Unayzah', 'Onaiza'], 26.0840, 43.9940, 14],
  ['rass', 'الرس', ['Ar Rass', 'Al Rass', 'Rass'], 25.8694, 43.4973, 14],
  ['bukayriyah', 'البكيرية', ['البكيريه', 'Al Bukayriyah', 'Bukayriyah'], 26.1392, 43.6583, 10],
  ['mithnab', 'المذنب', ['Al Mithnab', 'Mithnab'], 25.8600, 44.2200, 10],
  ['hail', 'حائل', ['حايل', 'Hail', "Ha'il", 'Hayil'], 27.5114, 41.7208, 22],
  ['tabuk', 'تبوك', ['Tabuk', 'Tabouk'], 28.3835, 36.5662, 22],
  ['abha', 'أبها', ['ابها', 'Abha'], 18.2164, 42.5053, 12],
  ['khamis', 'خميس مشيط', ['Khamis Mushait', 'Khamis Mushayt'], 18.3000, 42.7333, 14],
  ['jazan', 'جازان', ['جيزان', 'Jazan', 'Jizan', 'Gizan'], 16.8892, 42.5511, 14],
  ['sabya', 'صبيا', ['Sabya', 'Sabia'], 17.1495, 42.6254, 10],
  ['najran', 'نجران', ['Najran'], 17.5656, 44.2289, 22],
  ['baha', 'الباحة', ['الباحه', 'Al Baha', 'Al Bahah', 'Baha'], 20.0129, 41.4677, 14],
  ['taif', 'الطائف', ['الطايف', 'Taif', 'At Taif', 'Al Taif'], 21.2703, 40.4158, 22],
  ['yanbu', 'ينبع', ['Yanbu', 'Yanbu Al Bahr'], 24.0891, 38.0637, 22],
  ['rabigh', 'رابغ', ['Rabigh'], 22.7986, 39.0349, 12],
  ['qunfudhah', 'القنفذة', ['القنفذه', 'Al Qunfudhah', 'Qunfudhah'], 19.1264, 41.0789, 12],
  ['bisha', 'بيشة', ['بيشه', 'Bisha', 'Bishah'], 20.0005, 42.6052, 14],
  ['kharj', 'الخرج', ['Al Kharj', 'Kharj'], 24.1556, 47.3120, 22],
  ['majmaah', 'المجمعة', ['المجمعه', 'Al Majmaah', 'Majmaah'], 25.9036, 45.3456, 12],
  ['zulfi', 'الزلفي', ['Az Zulfi', 'Al Zulfi', 'Zulfi'], 26.2994, 44.8154, 12],
  ['dawadmi', 'الدوادمي', ['Ad Dawadimi', 'Dawadmi', 'Al Dawadmi'], 24.5077, 44.3924, 14],
  ['shaqra', 'شقراء', ['شقرا', 'Shaqra', 'Shaqraa'], 25.2500, 45.2500, 12],
  ['aflaj', 'الأفلاج', ['الافلاج', 'ليلى', 'Al Aflaj', 'Layla', 'Laila'], 22.2833, 46.7333, 18],
  ['wadi-dawasir', 'وادي الدواسر', ['الخماسين', 'Wadi Ad Dawasir', 'Wadi Al Dawasir', 'Wadi Aldawasir', 'Al Khamasin'], 20.4667, 44.7833, 25],
  ['sulayyil', 'السليل', ['As Sulayyil', 'Al Sulayyil', 'Sulayyil', 'Sulayel'], 20.4607, 45.5779, 20],
  ['arar', 'عرعر', ['Arar'], 30.9753, 41.0381, 18],
  ['sakaka', 'سكاكا', ['Sakaka', 'Sakakah'], 29.9697, 40.2064, 18],
  ['qurayyat', 'القريات', ['Al Qurayyat', 'Qurayyat'], 31.3317, 37.3428, 14],
  ['rafha', 'رفحاء', ['رفحا', 'Rafha'], 29.6202, 43.4948, 14],
  ['ula', 'العلا', ['AlUla', 'Al Ula'], 26.6085, 37.9232, 20],
  ['muhayil', 'محايل عسير', ['محايل', 'Muhayil', 'Muhayil Asir'], 18.5460, 42.0520, 12],
];

/* ---------- 3. المخزن ---------- */
const STORE_NAMES = ['accounts', 'instruments', 'transactions', 'merchants', 'beneficiaries', 'categories', 'imports', 'templates', 'rules', 'settings', 'messages', 'reviews', 'auditLog', 'limits', 'deletedTxs',
  // 1.5.0
  'productCategories', 'products', 'cities', 'groups', 'recurring', 'reserves', 'alertStates', 'balanceSnapshots'];
const HISTORY_EXCLUDE = new Set(['auditLog']); // سجل التعديلات ما يدخل في التراجع
const UNDO_MAX = 30, AUDIT_MAX = 2000;
const DEFAULT_SETTINGS = {
  id: 'settings', cycleMode: 'salary', defaultPayday: 27,
  ownerAliases: [], // يدخلها المستخدم من الإعدادات أو عند أول استيراد؛ لا أسماء داخل الكود
  baseCurrency: 'SAR', roundUpDestination: { kind: 'unknown', accountId: null },
  backupReminderDays: 7, lastBackupAt: null, lastChangeAt: null, schemaVersion: 2,
  limitAlertPct: 80, inbox: { url: '', token: '', autoFetch: true, lastFetchAt: null },
  smsDateShapes: {}, dateShapesMigrated: false, migrated141: false,
  // 1.5.0: المدينة الحالية اقتراح احتياطي فقط، واستثناءات معدل الصرف تبدأ فاضية
  currentCityId: null, cityPromptSnoozeUntil: null, rateExclusions: [], migrated150: false, migrated152: false, migrated160: false, placeCategories: [], ignorePeriods: [],
  // 1.6.2: البنوك (المرسلين): الاسم، الأنواع المعتمدة، التجاهل، الدمج. وأشكال التاريخ لكل بنك
  smsSenders: {}, migrated162: false,
  // 1.7.0: الالتزامات الدائمة (المبلغ المعتمد لكل جهة، وأرقام التنبيه)، والترقية
  commitPlans: {}, commitCfg: { alertMode: 'pct', alertValue: 5, n: 3 }, migrated170: false, migrated170dates: false,
  // 1.7.1: الالتزامات (سؤال الاعتماد ونظام الدفعات)، والصيغ الثابتة للرسائل
  migrated171: false,
};

class Store {
  constructor(data) {
    this.t = {}; STORE_NAMES.forEach(n => { this.t[n] = new Map(); });
    this.rev = 0; this.memo = new Map(); // rev يزيد مع كل تغيير، والفهارس المحسوبة تنبني من جديد لما يتغير
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
  load(data) { STORE_NAMES.forEach(n => (data[n] || []).forEach(o => this.t[n].set(o.id, o))); this.rev++; }
  all(n) { return Array.from(this.t[n].values()); }
  get(n, id) { return id == null ? undefined : this.t[n].get(id); }
  put(n, o) {
    if (!o.id) o.id = uid();
    this.t[n].set(o.id, o); this.rev++;
    if (!this.dirty.has(n)) this.dirty.set(n, new Set());
    this.dirty.get(n).add(o.id);
    if (this.removed.has(n)) this.removed.get(n).delete(o.id);
    if (!HISTORY_EXCLUDE.has(n)) this.touched.add(n + '\u0001' + o.id);
    return o;
  }
  remove(n, id) {
    this.t[n].delete(id); this.rev++;
    if (!this.removed.has(n)) this.removed.set(n, new Set());
    this.removed.get(n).add(id);
    if (this.dirty.has(n)) this.dirty.get(n).delete(id);
    if (!HISTORY_EXCLUDE.has(n)) this.touched.add(n + '\u0001' + id);
  }
  get settings() { return this.t.settings.get('settings'); }
  // فهرس محسوب يتخزن لين يتغير أي شي في البيانات
  cached(key, fn) { const c = this.memo.get(key); if (c && c.rev === this.rev) return c.v; const v = fn(); this.memo.set(key, { rev: this.rev, v }); return v; }
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
    STORE_NAMES.forEach(n => { this.t[n] = new Map(); }); this.rev++;
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
    if (source !== 'undo' && source !== 'redo' && source !== 'inbox') { // جلب الصندوق: في السجل، بس ما يتراجع عنه (الرسائل انحذفت من الصندوق)
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
  // 1.5.1: بيانات مصدر وصلت متأخر (مثل مدينة الموقع) وانحفظت بدون خطوة تراجع: تنطبق كمان على نسخ نفس السجل
  // المحفوظة في التراجع والإعادة، عشان التراجع عن خطوة قديمة ما يمسحها. id = null: كل نسخ الجدول (fn تختار).
  // fn ترجع true إذا عدّلت النسخة
  patchHistory(n, id, fn, needle) {
    const fix = (v) => { if (v === undefined || (needle && !v.includes(needle))) return v; const o = JSON.parse(v); return fn(o) ? JSON.stringify(o) : v; };
    (this.undoStack || []).concat(this.redoStack || []).forEach(st => st.changes.forEach(c => { if (c.n === n && (id == null || c.id === id)) { c.before = fix(c.before); c.after = fix(c.after); } }));
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
  // 1.6.0: اسم فاتورة له أكثر من محل ← المحل الافتراضي (والعملية تنعلّم «تحتمل أكثر من محل» في markShopChoice)
  const hits = all.filter(x => (x.aliases || []).includes(norm));
  let m = hits.find(x => (x.defaultFor || []).includes(norm)) || hits[0];
  if (m) return m;
  const seed = seedMerchantFor(norm);
  if (seed) {
    m = all.find(x => x.seedKey === seed.name || (x.seedKeys || []).includes(seed.name));
    if (m) { if (!m.aliases.includes(norm)) { m.aliases.push(norm); m._aliasAdded = true; } return m; }
    m = { id: uid(), name: seed.name, seedKey: seed.name, aliases: [norm], keywords: [], categoryId: null, subcategoryId: null, categorySource: null,
      suggestedCategoryId: liveCat(store, seed.cat, seed.sub)[0], suggestedSubcategoryId: liveCat(store, seed.cat, seed.sub)[1], defaultRecurrenceType: null, defaultNecessityType: null, _new: true }; // 1.7.0: التكرار «غير محدد» لين تحدده
    planMerchants.set(m.id, m); return m;
  }
  m = { id: uid(), name: cleanText(rawName).replace(/_+$/, ''), seedKey: null, aliases: [norm], keywords: [], categoryId: null, subcategoryId: null, categorySource: null,
    suggestedCategoryId: liveCat(store, keywordCategory(norm), null)[0], suggestedSubcategoryId: null, defaultRecurrenceType: null, defaultNecessityType: null, _new: true };
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
    ins = { id: uid(), accountId, kind, last4, label: (kind === 'mada' ? 'مدى ' : kind === 'credit_card' ? 'بطاقة ائتمانية ' : kind === 'account' ? 'حساب …' : 'بطاقة ') + last4, instrumentOwner: ownerGuess || 'unknown', ownerName: null, includeInPersonalSpend: true, active: true };
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
      if (!tx.paymentMethod) tx.paymentMethod = 'POS'; // 1.6.1: Apple Pay والأونلاين من كلمات القراءة (parseSmsText)
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
  // تصنيف انحذف ما ينحط على عملية جديدة (بذور التجار والكلمات المفتاحية ثابتة في الكود)
  if (tx.categoryId || tx.subcategoryId) { const [lc, ls] = liveCat(store, tx.categoryId, tx.subcategoryId); if (lc !== tx.categoryId) tx.categorySource = null; tx.categoryId = lc; tx.subcategoryId = ls; }
  markShopChoice(store, tx);
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
  }, tx150Defaults(), base || {});
}
// حقول 1.5.0 على العملية: null في الالتزام وفرص التوفير = يرث من المستفيد/التاجر/التصنيف
const TX150 = { items: [], cityId: null, suggestedCityId: null, suggestedCityRaw: null, citySuggestionSource: null, citySuggestedAt: null, groupIds: [],
  isCommitment: null, savingsEligible: null, cashReturnOfId: null, cashReturnPartId: null, refundItemAllocations: [] };
function tx150Defaults() { const o = {}; Object.keys(TX150).forEach(k => { o[k] = Array.isArray(TX150[k]) ? [] : TX150[k]; }); return o; }
function normTx150(t) { let ch = false; Object.keys(TX150).forEach(k => { if (t[k] === undefined) { t[k] = Array.isArray(TX150[k]) ? [] : TX150[k]; ch = true; } }); return ch; }

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
    else if (acc.autoCreated) { acc = Object.assign({}, acc, { autoCreated: false, bank: h.bank, name: 'بطاقة ائتمانية ' + h.cardLast4, creditLimit: h.creditLimit }); plan.updatedAccount = acc; } // البطاقة المؤقتة من الرسائل صارت معروفة
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
  // بطاقة أو حساب مؤقت من الرسائل بنفس آخر 4 أرقام هذا الكشف (أو إحدى بطاقاته): عملياته تُقارن كأنها على نفس الحساب،
  // فالمطابق يندمج أو يطلع لك «تكرار محتمل» هنا، وبعد الاعتماد تنتقل للحساب الحقيقي
  const alias = new Map();
  const cardL4 = new Set(store.all('instruments').filter(i => i.accountId === acc.id).concat(Array.from(plan.newInstruments.values())).map(i => i.last4).filter(Boolean));
  store.all('accounts').filter(a => a.autoCreated && a.last4 && a.id !== acc.id && (a.last4 === acc.last4 || cardL4.has(a.last4))).forEach(a => alias.set(a.id, acc.id));
  alias.planInstruments = plan.newInstruments;
  plan.accountAlias = alias;
  plan.matches = findDuplicates(store, plan.txs, { importId: plan.id, sourceType, accountAlias: alias });
  // عمليات حذفتها قبل وجات مرة ثانية في هذا الملف: تبقى محذوفة إلا إذا اخترت «رجّعها»
  const autoIds = new Set(plan.matches.auto.map(a => a.newId));
  plan.deletedMatches = findDeletedMatches(store, plan.txs.filter(t => !autoIds.has(t.id)), alias);
  plan.summary = summarizePlan(store, plan);
  return plan;
}

function applyRoundUpDestination(tx, dest) {
  if (dest && dest.kind === 'account') { tx.transactionType = 'InternalTransfer'; tx.counterpartyAccountId = dest.accountId; tx.classificationStatus = 'confirmed'; tx.transferLinkStatus = 'one_sided'; tx.categoryId = null; tx.subcategoryId = null; }
  else if (dest && dest.kind === 'charity') { tx.transactionType = 'Payment'; tx.classificationStatus = 'confirmed'; tx.categoryId = 'donations'; tx.subcategoryId = null; tx.categorySource = 'rule'; tx.counterpartyAccountId = null; }
  else { tx.transactionType = 'InternalTransfer'; tx.classificationStatus = 'unclassified'; tx.counterpartyAccountId = null; tx.categoryId = null; }
}

function applyBeneficiaryClassification(tx, ben) {
  delete tx.cardPaymentByUser;
  if (ben.isMyAccount) {
    tx.transactionType = 'InternalTransfer'; tx.classificationStatus = 'confirmed'; tx.counterpartyAccountId = ben.linkedAccountId || null; tx.transferLinkStatus = 'one_sided';
    tx.categoryId = null; tx.subcategoryId = null; tx.categorySource = null;
  } else if (ben.defaultTransferType === 'unknown') {
    tx.transactionType = 'Unknown'; tx.classificationStatus = 'unclassified';
  } else if (ben.defaultTransferType === 'card_payment') {
    // حددته «سداد بطاقة» (بطاقة في بنك ثاني مثلًا): ما ينحسب صرف، والمشتريات نفسها انحسبت
    tx.transactionType = 'CreditCardPayment'; tx.classificationStatus = 'confirmed'; tx.cardPaymentByUser = true;
    tx.categoryId = null; tx.subcategoryId = null; tx.categorySource = null;
    tx.cardPaymentStatus = tx.cardPaymentStatus || 'unmatched'; tx.transferLinkStatus = tx.transferLinkStatus || 'one_sided';
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
  const s = { total: plan.txs.length, autoMerged: 0, deletedAgain: 0, possible: 0, newTx: 0, internal: 0, cardPayments: 0, roundUps: 0, unclassified: 0, temporary: 0, uncategorized: 0, unknownMerchants: 0, personTransfers: 0 };
  const mergedIds = new Set(plan.matches.auto.map(a => a.newId)), possibleIds = new Set(plan.matches.review.map(r => r.newId));
  plan.txs.forEach(t => {
    if (mergedIds.has(t.id)) s.autoMerged++; else if (plan.deletedMatches && plan.deletedMatches.has(t.id)) s.deletedAgain++; else if (possibleIds.has(t.id)) s.possible++; else s.newTx++;
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

function scorePair(store, a, b, planInstruments, alias) {
  // a: عملية جديدة، b: موجودة. alias: حساب مؤقت (بطاقة من رسالة) ← الحساب الحقيقي اللي يمثله في هذا الكشف
  if (a.direction !== b.direction || (a.currency || 'SAR') !== (b.currency || 'SAR') || cents(a.grossAmount) !== cents(b.grossAmount)) return null;
  const da = a.transactionDate || a.postingDate, db = b.transactionDate || b.postingDate;
  const dd = Math.abs(daysBetween(da, db));
  if (dd > 3) return null;
  const accA = (alias && alias.get(a.accountId)) || a.accountId, accB = (alias && alias.get(b.accountId)) || b.accountId;
  const aliased = accA !== a.accountId || accB !== b.accountId;
  if (accA && accB && accA !== accB) return null;
  let ia = instrumentKey(store, a, planInstruments), ib = instrumentKey(store, b, planInstruments);
  if (aliased) { // البطاقة المؤقتة: نقارن آخر 4 أرقام بس (وأدوات الكشف الجديدة من خطته)
    const pi = alias.planInstruments;
    if (!ia && pi) ia = instrumentKey(store, a, pi); if (!ib && pi) ib = instrumentKey(store, b, pi);
    ia = ia && ia.split(':')[1]; ib = ib && ib.split(':')[1];
  }
  if (ia && ib && ia !== ib) return null;
  // دليل حاسم
  if (a.reference && b.reference && a.reference === b.reference) return { score: 100, decisive: 'reference' };
  if (accA && accA === accB && a.balanceAfter != null && b.balanceAfter != null && cents(a.balanceAfter) === cents(b.balanceAfter)) return { score: 100, decisive: 'balance' };
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

// 1.5.2: البنك يرسل رسالة لكل عملية. فرسالة جديدة ما تندمج أبدًا مع عملية جاية من رسالة ثانية
// (نفس النص بالضبط يتعامل معه فحص «نفس النص»). الدمج مع الكشف والإدخال اليدوي ما تغيّر
const hasSmsSource = (t) => (t.sourceLinks || []).some(s => s.sourceType === 'sms');
// نفس الرسالة وصلت من مصدر ثاني (مثلًا لصقتها وهي واصلة من الصندوق، فنصها يختلف بالإخفاء أو المرسل):
// نفس اليوم والوقت بالدقيقة والمبلغ والاتجاه والحساب والبطاقة ونفس التاجر أو المستفيد، والرصيد ما يتعارض
function sameSmsMessage(store, a, b, planIns) {
  if (!hasSmsSource(b) || !a.time || !b.time || a.transactionDate !== b.transactionDate || String(a.time).slice(0, 5) !== String(b.time).slice(0, 5)) return false;
  if (a.balanceAfter != null && b.balanceAfter != null && cents(a.balanceAfter) !== cents(b.balanceAfter)) return false; // رصيد مختلف = عمليتان
  if (a.reference && b.reference && a.reference !== b.reference) return false; // مرجع مختلف = عمليتان
  const r = scorePair(store, a, b, planIns); if (!r) return false;
  if (r.decisive) return true; // نفس المرجع أو نفس الرصيد
  if (a.beneficiaryId || b.beneficiaryId) return !!a.beneficiaryId && a.beneficiaryId === b.beneficiaryId;
  // بدون تاجر (مثل السحب): ما يكفي نفس الدقيقة، لازم رصيد أو مرجع متطابق (فوق)
  return !!(a.merchantRaw && b.merchantRaw) && merchantScore(a, b, store) >= 30;
}
function findDuplicates(store, newTxs, ctx) {
  const byAmt = new Map();
  store.all('transactions').forEach(t => { const k = cents(t.grossAmount); if (!byAmt.has(k)) byAmt.set(k, []); byAmt.get(k).push(t); });
  const pairs = [];
  newTxs.forEach(a => {
    (byAmt.get(cents(a.grossAmount)) || []).forEach(b => {
      if ((b.sourceLinks || []).some(s => s.importId === ctx.importId)) return; // نفس الملف لا يقارن
      if (ctx.sourceType === 'sms' && hasSmsSource(b)) return; // رسالة مع رسالة ثانية = عمليتان
      const r = scorePair(store, a, b, null, ctx.accountAlias);
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
// 1.7.0: تاريخ العملية (أو القيد) بعد اليوم
const futureTx = (tx, today) => (tx.transactionDate || tx.postingDate || '') > (today || todayISO());
// decisions: { [newTxId]: 'merge' | 'separate' | 'restore' | 'future_ok' } لحالات المراجعة
function commitImport(store, plan, decisions) {
  decisions = decisions || {};
  const now = new Date().toISOString();
  plan.newAccounts.forEach(a => store.put('accounts', a));
  if (plan.updatedAccount) store.put('accounts', plan.updatedAccount);
  (plan.newCities || new Map()).forEach(c => { if (!store.get('cities', c.id)) store.put('cities', c); });
  plan.newInstruments.forEach(i => store.put('instruments', i));
  plan.newBeneficiaries.forEach(b => { const c = Object.assign({}, b); delete c._new; store.put('beneficiaries', c); });
  plan.newMerchants.forEach(m => { const c = Object.assign({}, m); delete c._new; delete c._aliasAdded; store.put('merchants', c); });
  store.all('merchants').forEach(m => { if (m._aliasAdded) { delete m._aliasAdded; store.put('merchants', m); } });

  const mergeMap = new Map();
  plan.matches.auto.forEach(a => mergeMap.set(a.newId, a));
  plan.matches.review.forEach(r => { if (decisions[r.newId] === 'merge') mergeMap.set(r.newId, r); });
  const idRemap = new Map();
  let created = 0, merged = 0;
  let restored = 0, keptDeleted = 0;
  // 1.7.0: سطر كشف تاريخه بعد اليوم ما ينحفظ إلا إذا أكدته في مراجعة الاستيراد («تاريخ في المستقبل»)
  const today = todayISO(), skipped = new Set();
  if (!plan.msgRecords) plan.txs.forEach(tx => { if (futureTx(tx, today) && decisions['future:' + tx.id] !== 'ok' && decisions[tx.id] !== 'future_ok') skipped.add(tx.id); });
  const skippedFuture = skipped.size;
  plan.txs.forEach(tx => {
    if (skipped.has(tx.id)) return;
    const mm = mergeMap.get(tx.id);
    const dm = !mm && plan.deletedMatches ? plan.deletedMatches.get(tx.id) : null;
    if (dm && store.get('deletedTxs', dm.deletedId)) {
      const restore = decisions[tx.id] === 'restore';
      attachToDeleted(store, dm.deletedId, tx, restore);
      idRemap.set(tx.id, dm.deletedId);
      if (restore) restored++; else keptDeleted++;
      return;
    }
    if (mm) {
      const ex = store.get('transactions', mm.existingId);
      if (ex) {
        const exOnlySms = (ex.sourceLinks || []).length && ex.sourceLinks.every(sl => sl.sourceType === 'sms');
        const newIsStatement = (tx.sourceLinks || []).some(sl => sl.sourceType === 'account_statement' || sl.sourceType === 'card_statement');
        ex.sourceLinks = (ex.sourceLinks || []).concat(tx.sourceLinks);
        if (exOnlySms && newIsStatement) completeFromStatement(ex, tx);
        carry150(ex, tx); // المدينة المقترحة من الرسالة تبقى لو الكشف ما فيه مدينة، والمعتمدة ما تتغير
        carryShop(ex, tx);
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
    const fixed = (t.linkedTransactionIds || []).map(x => idRemap.get(x) || x).filter(x => !skipped.has(x));
    if (JSON.stringify(fixed) !== JSON.stringify(t.linkedTransactionIds || [])) { t.linkedTransactionIds = Array.from(new Set(fixed)); if (t.roundUpOfId) t.roundUpOfId = idRemap.get(t.roundUpOfId) || t.roundUpOfId; store.put('transactions', t); }
  });

  const bc = plan.balanceCheck || {};
  const imp = { id: plan.id, filename: plan.filename, hash: plan.hash, accountId: plan.account ? plan.account.id : null, kind: plan.kind, sourceType: plan.sourceType, templateId: plan.template ? plan.template.id : (plan.kind === 'credit_card' ? 'alinma_card' : 'alinma_account'),
    startDate: plan.startDate, endDate: plan.endDate, transactionCount: plan.txs.length, created, merged,
    openingBalance: bc.opening != null ? bc.opening : null, closingBalance: bc.closing != null ? bc.closing : null,
    previousBalance: plan.kind === 'credit_card' ? plan.header.previousBalance : null, previousBalanceDirection: plan.kind === 'credit_card' ? bc.direction : null,
    header: plan.header, balanceCheck: bc, balanceValidated: bc.ok === true ? true : bc.ok === false ? false : null, cardPaymentsStatus: null, createdAt: now };
  store.put('imports', imp);
  applyRulesTo(store, plan.txs.filter(t => !idRemap.has(t.id) && !skipped.has(t.id)).map(t => t.id));
  // آخر رصيد للحساب
  // 1.5.0: الرصيد الختامي ينحفظ في سجل الأرصدة (ما ينمسح السابق)، ورصيد الحساب = الأحدث
  const acc = plan.account ? store.get('accounts', plan.account.id) : null;
  if (acc && bc.closing != null && plan.endDate) addSnapshot(store, { accountId: acc.id, balance: bc.closing, asOf: plan.endDate, source: 'statement', kind: plan.kind === 'credit_card' ? (bc.closing >= 0 ? 'due' : 'credit') : 'balance', importId: imp.id });
  pairTransfers(store);
  absorbAutoAccounts(store, new Set(plan.accountAlias ? plan.accountAlias.keys() : []));
  sweepPeriods(store); // 1.7.0: العمليات الجديدة داخل «الفترات» تاخذ مدينتها ومجموعتها
  store.touch();
  return { created, merged, restored, keptDeleted, importId: imp.id, idRemap, skippedFuture };
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
  store.all('deletedTxs').forEach(t => {
    if (!(t.sourceLinks || []).some(s => s.importId === importId)) return;
    const rest = t.sourceLinks.filter(s => s.importId !== importId);
    if (rest.length) { t.sourceLinks = rest; store.put('deletedTxs', t); } else store.remove('deletedTxs', t.id);
  });
  // سجل الرصيد من هذا الكشف: يتعلّم ملغى (ما ينمسح)، ورصيد الحساب يرجع لأحدث سجل باقي
  const accs = new Set();
  store.all('balanceSnapshots').filter(x => x.importId === importId && !x.voidedAt).forEach(x => { x.voidedAt = new Date().toISOString(); x.voidReason = 'import_deleted'; store.put('balanceSnapshots', x); accs.add(x.accountId); });
  accs.forEach(id => { if (latestSnapshot(store, id)) refreshAccountBalance(store, id); else { const a = store.get('accounts', id); if (a) { a.lastBalance = null; a.lastBalanceDate = null; a.lastBalanceSource = null; a.lastBalanceAt = null; store.put('accounts', a); } } });
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
/* ---------- 1.6.2: البنوك (المرسلين) ----------
   settings.smsSenders[key] = {key, raw, name, ignored, trusted: {family: وقت الاعتماد}, mergedInto, createdAt}.
   key = اسم المرسل بعد توحيد الحروف. «دمج» مرسل في ثاني = نفس البنك (نفس الاعتماد وأشكال التاريخ والصيغ). */
const senderKey = (s) => (s ? normAr(String(s)).replace(/[|§]/g, '') || null : null);
function sendersOf(store) { return store.settings.smsSenders || {}; }
const own = (o, k) => !!(o && k != null && Object.prototype.hasOwnProperty.call(o, k)); // مرسل اسمه «constructor» ما يلخبط شي
const ownGet = (o, k) => (own(o, k) ? o[k] : null);
function bankOf(store, sender) {
  let k = senderKey(sender); if (!k) return null;
  const S = sendersOf(store); let n = 0;
  while (ownGet(S, k) && S[k].mergedInto && ownGet(S, S[k].mergedInto) && n++ < 8) k = S[k].mergedInto;
  return k;
}
function bankRec(store, key) { return key ? ownGet(sendersOf(store), key) : null; }
function bankLabel(store, senderOrKey) { const k = bankOf(store, senderOrKey), r = bankRec(store, k); return (r && (r.name || r.raw)) || (senderOrKey ? String(senderOrKey) : null); }
function isIgnoredBank(store, key) { const r = bankRec(store, key); return !!(r && r.ignored); }
function isTrusted(store, key, family) { const r = bankRec(store, key); return !!(r && ownGet(r.trusted, family)); }
function isNewBank(store, key) { const r = bankRec(store, key); return !r || !r.trusted || !Object.keys(r.trusted).length; }
// تعديل السجل بنسخة جديدة (عشان التراجع يرجع القديم كما هو)
function putSenders(store, fn) { const s = store.settings; const map = {}; Object.entries(s.smsSenders || {}).forEach(([k, v]) => { map[k] = Object.assign({}, v, { trusted: Object.assign({}, v.trusted || {}) }); }); fn(map); s.smsSenders = map; store.put('settings', s); store.touch(); }
function ensureKey(map, key, now, raw) {
  if (!key) return null;
  if (!own(map, key)) map[key] = { key, raw: String(raw || key).slice(0, 60), name: null, ignored: false, trusted: {}, mergedInto: null, createdAt: now || new Date().toISOString() };
  return map[key];
}
// رسالة معلّقة ما لها عملية محفوظة (إعادة قراءتها ما تكرر عملية)
function pendingNoTx(store, id) { const m = store.get('messages', id); return !!(m && m.text && !m.txId && m.status === 'review'); }
const READ_RV = new Set(['sms_new_bank', 'sms_new_bank_info', 'sms_date_shape', 'sms_unknown', 'sms_unparsed', 'sms_new_shape']);
function ensureSender(map, sender, now) { const k = senderKey(sender); if (!k) return null; const r = ensureKey(map, k, now, sender); return r; }
function setBankName(store, key, name) {
  const k = bankOf(store, key); if (!k) return null;
  const v = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40) || null;
  putSenders(store, (map) => { ensureKey(map, k).name = v; });
  return true;
}
function untrustFamily(store, key, family) {
  const k = bankOf(store, key); if (!k || !isTrusted(store, k, family)) return false;
  putSenders(store, (map) => { const r = map[k]; r.trusted = Object.assign({}, r.trusted); delete r.trusted[family]; });
  return true;
}
// تجاهل مرسل (أو إلغاؤه). يرجّع الرسائل اللي تحتاج إعادة معالجة: وقت التجاهل = المعلّقة في المراجعة، ووقت الإلغاء = رسائله المتجاهلة
function setSenderIgnored(store, key, on) {
  const k = bankOf(store, key); if (!k) return null;
  putSenders(store, (map) => { ensureKey(map, k).ignored = !!on; });
  const mine = (m) => m && m.text && bankOf(store, m.sender) === k;
  // وقت التجاهل: المعلّقة اللي ما لها عملية بس (عملية محفوظة تبقى مع رسالتها ومراجعتها)
  const ids = on
    ? Array.from(new Set(store.all('reviews').filter(r => r.status === 'open' && r.messageId).map(r => r.messageId))).filter(id => mine(store.get('messages', id)) && pendingNoTx(store, id))
    : store.all('messages').filter(m => m.status === 'sender_ignored' && mine(m) && !m.txId).map(m => m.id);
  return { reprocess: ids };
}
// دمج بنك في ثاني: الاعتماد يتجمع، وأشكال التاريخ تنتقل (الموجود في الهدف يبقى)، والاسم من الهدف (أو من المدموج لو الهدف بدون اسم)
function mergeBanks(store, fromKey, intoKey) {
  const a = bankOf(store, fromKey), b = bankOf(store, intoKey); if (!a || !b || a === b) return null;
  const now = new Date().toISOString();
  putSenders(store, (map) => {
    const A = ensureKey(map, a, now), B = ensureKey(map, b, now);
    B.trusted = Object.assign({}, A.trusted || {}, B.trusted || {});
    if (!B.name && A.name) B.name = A.name;
    A.mergedInto = b;
    Object.values(map).forEach(r => { if (r.mergedInto === a) r.mergedInto = b; });
  });
  // كل مفاتيح أشكال التاريخ للبنك المدموج تصير للبنك الهدف: المحفوظة، ورسائله، ومراجعاته (حتى اللي ما انجاوبت)
  const rk = (k) => (k && String(k).startsWith(a + '§') ? b + '§' + rawSig(k) : k);
  const s = store.settings, shapes = Object.assign({}, s.smsDateShapes || {}); let shCh = false;
  Object.keys(shapes).forEach(k => { const nk = rk(k); if (nk !== k) { if (!own(shapes, nk)) shapes[nk] = shapes[k]; delete shapes[k]; shCh = true; } });
  if (shCh) { s.smsDateShapes = shapes; store.put('settings', s); }
  store.all('messages').forEach(m => { const nk = rk(m.dateShape); if (nk !== m.dateShape) { m.dateShape = nk; store.put('messages', m); } });
  store.all('reviews').forEach(r => { let ch = false; if (rk(r.sig) !== r.sig) { r.sig = rk(r.sig); ch = true; } if (r.dateAsk && rk(r.dateAsk.sig) !== r.dateAsk.sig) { r.dateAsk = Object.assign({}, r.dateAsk, { sig: rk(r.dateAsk.sig) }); ch = true; } if (ch) store.put('reviews', r); });
  // سؤالين «تاريخ رسائل سابقة» لنفس الشكل بعد الدمج: يكفي واحد (جوابه يصحح رسائل الاثنين)
  const seenLegacy = new Set();
  store.all('reviews').filter(r => r.status === 'open' && r.kind === 'sms_date_shape' && r.reason === 'legacy').forEach(r => { if (seenLegacy.has(r.sig)) closeReview(store, r, 'merged'); else seenLegacy.add(r.sig); });
  // رسائله المعلّقة للقراءة (بنك جديد، شكل تاريخ، ما انقرأت) تنعاد بعد الدمج باعتماد وأشكال البنك
  const reprocess = Array.from(new Set(store.all('reviews').filter(r => r.status === 'open' && READ_RV.has(r.kind) && r.reason !== 'legacy' && r.messageId).map(r => r.messageId)))
    .filter(id => { const m = store.get('messages', id); return pendingNoTx(store, id) && bankOf(store, m.sender) === b && senderKey(m.sender) !== b; });
  store.touch();
  return { from: a, into: b, reprocess };
}
// فك الدمج: المرسل يرجع بنك لحاله ومعه نسخة من اعتماد البنك وأشكال تاريخه (عشان ما ينسألك من جديد)
function unmergeBank(store, key) {
  const k = senderKey(key), r = bankRec(store, k); if (!r || !r.mergedInto) return null;
  const into = bankOf(store, k); const now = new Date().toISOString();
  putSenders(store, (map) => { const R0 = map[k], B = map[into]; R0.mergedInto = null; R0.trusted = Object.assign({}, (B && B.trusted) || {}, R0.trusted || {}); if (!R0.name && B && B.name) R0.name = B.name; void now; });
  const s = store.settings, shapes = Object.assign({}, s.smsDateShapes || {}); let ch = false;
  Object.keys(shapes).forEach(x => { if (x.startsWith(into + '§')) { const nk = k + '§' + rawSig(x); if (!shapes[nk]) { shapes[nk] = shapes[x]; ch = true; } } });
  if (ch) { s.smsDateShapes = shapes; store.put('settings', s); }
  // 1.7.1: وصيغ البنك المعتمدة تنتسخ له كمان (بدون سؤال من جديد عن نفس الأشكال)
  // (بالاتجاهين: اللي انعرّفت من رسائل المرسل المدموج تبقى للبنك الأساسي كمان، وبدون تكرار لو دمجت وفكيت أكثر من مرة)
  { const all = smsFormats(store, 'approved').filter(t => t.sender), own = (key2) => all.filter(t => bankOf(store, t.sender) === key2), was = all.filter(t => bankOf(store, t.sender) === k || bankOf(store, t.sender) === into);
    const copyTo = (key2) => { const have = new Set(own(key2).map(t => (t.role || 'tx') + '|' + t.sig)); was.forEach(t => { const kx = (t.role || 'tx') + '|' + t.sig; if (bankOf(store, t.sender) === key2 || have.has(kx)) return; have.add(kx);
      const c = JSON.parse(JSON.stringify(t)); c.id = uid(); c.sender = (sendersOf(store)[key2] || {}).raw || key2; c.createdAt = c.updatedAt = now; if (t.name === formatName(store, t)) c.name = formatName(store, c); store.put('templates', c); }); };
    copyTo(k); copyTo(into); }
  const reprocess = Array.from(new Set(store.all('reviews').filter(r => r.status === 'open' && READ_RV.has(r.kind) && r.reason !== 'legacy' && r.messageId).map(r => r.messageId)))
    .filter(id => { const m = store.get('messages', id); return pendingNoTx(store, id) && senderKey(m.sender) === k; });
  store.touch();
  return { key: k, from: into, reprocess };
}
// «صحيح، اعتمد القراءة لهذا البنك»: يعتمد النوع للبنك، ويحفظ ترتيب التاريخ لو انسأل، ويرجّع الرسائل اللي تنتظر نفس الاعتماد
// pick = {order} (ترتيب التاريخ للشكل الجديد أو تاريخ هذي الرسالة) أو {date} (تاريخ حددته بنفسك)
// تاريخ أقدم من وصول رسالة الصندوق بأكثر من يومين
function isOldFor(m, d) { return !!(m && (m.source || 'paste') !== 'paste' && d && d < addDays(String(m.receivedAt || new Date().toISOString()).slice(0, 10), -OLD_DAYS)); }
function approveBankReading(store, reviewId, pick) {
  const r = store.get('reviews', reviewId); if (!r || r.kind !== 'sms_new_bank' || r.status !== 'open') return null;
  const m = store.get('messages', r.messageId), bank = (m && bankOf(store, m.sender)) || r.bank; if (!bank || !r.family) return null;
  const now = new Date().toISOString(), A = r.dateAsk || null;
  const out = { reprocess: [r.messageId], forceDate: null, saved: false, fixed: 0, bank, family: r.family };
  if (A) {
    if (pick && pick.date) out.forceDate = { [r.messageId]: pick.date };
    else {
      const cand = (A.candidates || []).find(c => c.order === (pick && pick.order)); if (!cand) return { error: 'date' };
      if (A.reason === 'new' || A.reason === 'legacy') {
        setDateShape(store, A.sig, cand.order, A.sample, A.pat); out.saved = true; out.fixed = retroDateFix(store, A.sig);
        if (isOldFor(m, cand.date)) out.forceDate = { [r.messageId]: cand.date }; // اخترت تاريخها وهو قديم: ما ينسألك مرة ثانية
      } else out.forceDate = { [r.messageId]: cand.date };
    }
  }
  putSenders(store, (map) => { const R0 = ensureKey(map, bank, now, m && m.sender); R0.trusted = Object.assign({}, R0.trusted, { [r.family]: now }); });
  store.all('reviews').filter(x => x.status === 'open' && x.id !== r.id && x.messageId).forEach(x => {
    const mm = store.get('messages', x.messageId); if (!mm || bankOf(store, mm.sender) !== bank) return;
    if (x.kind === 'sms_new_bank' && (x.family === r.family || (out.saved && x.dateAsk && x.dateAsk.sig === A.sig))) out.reprocess.push(x.messageId);
    else if (out.saved && x.kind === 'sms_date_shape' && x.sig === A.sig && x.reason === 'new') out.reprocess.push(x.messageId);
    else if (out.saved && x.kind === 'sms_date_shape' && x.sig === A.sig && x.reason === 'legacy') closeReview(store, x, 'answered'); // عملياتها تصححت بالترتيب
  });
  out.reprocess = Array.from(new Set(out.reprocess)).filter(id => id === r.messageId || pendingNoTx(store, id));
  store.touch();
  return out;
}
// ترقية 1.6.2: كل مرسل وصلت منه رسائل ينضاف لـ«البنوك»، وكل نوع له عمليات محفوظة منه يعتبر معتمد،
// وأشكال التاريخ العامة تنسخ لكل بنك استخدمها (والعامة تبقى للرسائل الملصوقة بدون بنك)
function migrate162(store) {
  const s = store.settings; if (s.migrated162) return { changed: false };
  const now = new Date().toISOString(), shapes = Object.assign({}, s.smsDateShapes || {});
  const map = {}; Object.entries(s.smsSenders || {}).forEach(([k, v]) => { map[k] = Object.assign({}, v, { trusted: Object.assign({}, v.trusted || {}) }); });
  const moved = new Map(), legacyTargets = new Map(); let trusted = 0;
  store.all('messages').forEach(m => {
    const r = m.sender ? ensureSender(map, m.sender, now) : null;
    if (!r) { if (m.dateShape && m.dateSource === 'legacy' && m.txId && !m.userDate && !legacyTargets.has(m.dateShape)) legacyTargets.set(m.dateShape, m.id); return; } // ملصوقة بدون مرسل: الشكل العام
    if ((m.status === 'tx' || m.status === 'merged') && m.text) {
      let fam = m.readAs && m.readAs.family;
      if (!fam) { try { fam = readInfo(store, m, smsWordsFor(store, m.text, m.receivedAt).W).info.family; } catch (e) { fam = null; } }
      if (fam && !r.trusted[fam]) { r.trusted[fam] = now; trusted++; }
    }
    if (m.dateShape && !String(m.dateShape).includes('§')) {
      const old = m.dateShape, nk = shapeKey(r.key, old);
      if (shapes[old] && !shapes[nk]) shapes[nk] = Object.assign({}, shapes[old]);
      m.dateShape = nk; store.put('messages', m); moved.set(m.id, [old, nk]); // (dateShape على العملية للعرض بس، ما تتغير)
      if (m.dateSource === 'legacy' && m.txId && !m.userDate && !legacyTargets.has(nk)) legacyTargets.set(nk, m.id); // عمليات تاريخها من قبل 1.4.0 وتنتظر سؤال الشكل
    }
  });
  const R = SR();
  store.all('reviews').forEach(x => {
    if (x.status !== 'open' || !x.sig || String(x.sig).includes('§')) return;
    const raw = x.sig, mm = store.get('messages', x.messageId), k = mm && senderKey(mm.sender);
    if (k) { x.sig = shapeKey(k, raw); store.put('reviews', x); }
    // سؤال «تاريخ رسائل سابقة» كان واحد لكل شكل؛ الحين الشكل لكل بنك، فكل بنك عنده رسائل بهالشكل ينسأل لحاله
    if (x.kind === 'sms_date_shape' && x.reason === 'legacy') {
      legacyTargets.forEach((mid, key) => {
        if (rawSig(key) !== raw || key === x.sig) return;
        if (store.all('reviews').some(y => y.status === 'open' && y.kind === 'sms_date_shape' && y.reason === 'legacy' && y.sig === key)) return;
        const tm = store.get('messages', mid), tok = tm && R.findDateToken(tm.text || ''); if (!tok) return;
        store.put('reviews', { id: uid(), kind: 'sms_date_shape', status: 'open', createdAt: now, messageId: mid, importId: tm.importId || null, reason: 'legacy', sig: key, pat: tok.pat, token: tok.raw, sample: sanitizeText(tok.sample), candidates: tok.candidates });
      });
    }
  });
  s.smsSenders = map; s.smsDateShapes = shapes; s.migrated162 = now; store.put('settings', s); // (ترقية، مو تعديل منك: ما تغيّر «آخر تعديل»)
  return { changed: true, senders: Object.keys(map).length, trusted, moved: moved.size };
}
/* ---------- 1.7.1: الصيغ الثابتة ----------
   templates (kind: sms, v: 3): {status: approved|pending, role: tx|info, family, direction, sender, bank, parts, spans, skips, feeMode, dateOrder, sample, sig}.
   الرسالة تنقرأ بس إذا طابقت صيغة معتمدة بالضبط (SmsReader.matchFormat). غير كذا تروح المراجعة «شكل رسالة جديد».
   القراءة العامة (القارئ العام وصيغ ما قبل 1.7.1) صارت «تخمين» للاقتراح بس: تعبّي خانات التعريف وأنت تصحح وتعتمد. */
const isFormat = (x) => !!x && x.kind === 'sms' && x.v === 3;
function smsFormats(store, status) { return store.all('templates').filter(x => isFormat(x) && (!status || x.status === status)); }
// صيغة لها بنك تمشي على رسائل بنكها بس. الرسالة بدون مرسل (ملصوقة «ما أدري») تجرّب كل الصيغ
function formatBankOk(store, tp, sender) { return !(tp.sender && sender && bankOf(store, tp.sender) !== bankOf(store, sender)); }
function matchSmsFormat(store, text, sender, status) {
  const R = SR(), list = smsFormats(store, status || 'approved').filter(tp => formatBankOk(store, tp, sender))
    .sort((x, y) => Number(!!y.sender) - Number(!!x.sender) || R.fmtLiteralLen(y) - R.fmtLiteralLen(x) || String(y.updatedAt || '').localeCompare(String(x.updatedAt || '')));
  for (const tp of list) if (R.matchFormat(tp, text)) return tp;
  return null;
}
function smsDone(text, o, W) {
  const R = SR();
  if (o && (o.family === 'sms_purchase' || o.family === 'sms_refund') && !o.paymentMethod) { const pm = R.methodByWords(text, W); if (pm) o.paymentMethod = pm; } // 1.6.1: وسيلة الدفع من كلماتك
  if (o && R.onlineByWords(text, W)) o.online = true; // عملية أونلاين (حتى لو بـ Apple Pay)، أي نوع
  return o;
}
// قراءة رسالة بصيغة معتمدة. المرجع وآخر 4 للمستفيد والمبلغ بالعملة الأجنبية (لو مكتوبة) تكمل من النص
function formatInfo(store, fmt, san, W) {
  const R = SR(), r = R.applyFormat(fmt, san, W); if (!r) return null;
  r.templateId = fmt.id;
  const g = R.parseGeneric(san, W);
  ['reference', 'beneficiaryLast4', 'foreignAmount', 'foreignCurrency'].forEach(k => { if (r[k] == null && g[k] != null) r[k] = g[k]; });
  if (r.foreignAmount != null && r.foreignCurrency === 'SAR') { delete r.foreignAmount; delete r.foreignCurrency; }
  return smsDone(san, r, W);
}
// التخمين (للاقتراح بس): صيغ ما قبل 1.7.1 ← نصوص تشبه كشف الإنماء ← القارئ العام
function guessSmsInfo(store, text, sender, receivedDate, W) {
  const R = SR(), t = R.norm(text);
  const done = (o) => smsDone(t, o, W);
  const tpls = store.all('templates').filter(x => x.kind === 'sms' && !isFormat(x) && (x.active !== false || x.legacy171)).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  let partial = null;
  for (const tp of tpls) {
    if (tp.sender && sender && bankOf(store, tp.sender) !== bankOf(store, sender)) continue; // 1.6.2: نفس البنك (حتى لو المرسل مدموج)
    const sc = R.templateScore(tp, t); if (sc < 0.6) continue;
    const r = R.applyTemplate(tp, t, W); r.templateId = tp.id; r.score = sc;
    if (r.ok && !r.missing.length) return done(r);
    if (!partial || sc > partial.score) partial = r;
  }
  const a = parseAlinmaSms(t, receivedDate); if (a && !partial) return done(a);
  const g = R.parseGeneric(t, W);
  if (partial) {
    // قالب متعلّم انطبق جزئيًا: نكمّل الناقص من القراءة العامة
    const fill = { amount: 'grossAmount', merchant: 'merchantRaw', beneficiary: 'beneficiaryRaw', counterparty: 'counterpartyName', cardLast4: 'instrumentLast4', accountLast4: 'accountLast4', balance: 'balanceAfter', fee: 'feeAmount', date: 'transactionDate', time: 'time' };
    const out = Object.assign({}, partial);
    partial.missing.forEach(k => { const f = fill[k]; if (f && g[f] != null && out[f] == null) out[f] = g[f]; });
    ['transactionDate', 'time', 'reference', 'iban', 'beneficiaryLast4', 'foreignAmount', 'foreignCurrency'].forEach(k => { if (out[k] == null && g[k] != null) out[k] = g[k]; });
    out.ok = out.grossAmount > 0 && !!out.direction;
    return done(out);
  }
  return done(g);
}
// القراءة الفعلية: بالصيغة المعتمدة. opts.guess: إذا ما لها صيغة يرجع التخمين (ومعه guess: true)
function parseSmsText(store, text, sender, receivedDate, W, opts) {
  const R = SR(), san = sanitizeText(R.norm(text)), fmt = matchSmsFormat(store, san, sender);
  if (fmt && fmt.role !== 'info') { const r = formatInfo(store, fmt, san, W); if (r) return r; }
  if (!(opts && opts.guess)) return { parser: 'none', missing: ['format'], ok: false, noFormat: !fmt, infoFormat: !!fmt };
  const g = guessSmsInfo(store, text, sender, receivedDate, W); g.guess = true; return g;
}
const FAMILY_DIR = { sms_purchase: 'out', sms_refund: 'in', sms_transfer_out: 'out', sms_transfer_in: 'in', salary: 'in', sms_cash_withdrawal: 'out', sms_cash_deposit: 'in', bill_payment: 'out', card_payment: 'out', sms_debit: 'out', sms_credit: 'in' };
const FAMILY_MAP = { mada_purchase: 'sms_purchase', online_purchase: 'sms_purchase', visa_purchase: 'sms_purchase', card_purchase: 'sms_purchase', fast_transfer_out: 'sms_transfer_out', internal_transfer_out: 'sms_transfer_out' };
// المتغيرات اللي تتحدد لكل نوع عملية (المبلغ مطلوب، والباقي اختياري)
function formatFieldsFor(family) {
  const base = ['amount'];
  if (family === 'sms_transfer_out') base.push('beneficiary'); else if (family === 'sms_transfer_in' || family === 'salary') base.push('counterparty'); else if (!['sms_cash_withdrawal', 'sms_cash_deposit', 'card_payment'].includes(family)) base.push('merchant');
  const extra = ['sms_transfer_out', 'sms_transfer_in', 'salary', 'sms_cash_withdrawal', 'sms_cash_deposit'].includes(family) ? [] : ['method'];
  return base.concat(['cardLast4', 'accountLast4', 'balance', 'fee', 'date', 'time'], extra);
}
function smsFamilyOf(g, m) {
  for (let f of [m && m.readAs && m.readAs.family, g && g.family]) { if (!f) continue; f = FAMILY_MAP[f] || f; if (FAMILY_DIR[f]) return f; }
  return g && g.direction ? (g.direction === 'out' ? 'sms_debit' : 'sms_credit') : null;
}
/* اقتراح صيغة من رسالة (تعبئة مبدئية للتعريف، وللأشكال اللي تطلع من رسائلك المحفوظة).
   role = tx: يحتاج تخمين مقروء (نوع ومبلغ). role = info: هيكل الرسالة كما هو. الرسوم في الاقتراح «داخل المبلغ» (مثل القراءة السابقة)،
   و feeTop يرجع موضع الرقم اللي يساوي المبلغ + الرسوم لو موجود (مثل «المبلغ المستحق»): التعريف يقترح «فوق المبلغ». */
function proposeFormat(store, m, role, opts) {
  opts = opts || {};
  const R = SR(), text = R.norm(m.text || ''), bank = bankOf(store, m.sender);
  const W = smsWordsFor(store, text, m.receivedAt, null, bank).W;
  const recv = (m.source || 'paste') === 'paste' ? null : String(m.receivedAt || '').slice(0, 10) || null;
  let g = null; try { g = smsFamilyFix(guessSmsInfo(store, text, m.sender, recv, W)); } catch (e) { g = null; }
  const fam = role === 'tx' ? smsFamilyOf(g && g.ok ? g : null, m) : null;
  if (role === 'tx' && (!g || !g.ok || !fam)) return { error: 'no_guess', guess: g };
  const sp = R.suggestSpans(text, role === 'tx' ? Object.assign({}, g, { family: fam }) : null), fields = {};
  if (role === 'tx') { const ok = new Set(formatFieldsFor(fam)); Object.entries(sp.spans).forEach(([k, r]) => { if (ok.has(k)) fields[k] = { start: r[0], end: r[1] }; }); }
  // التاريخ الملتبس (مثل 26-10-02) بدون ترتيب معروف لهالبنك: ما يدخل الصيغة المقترحة. صفحة التعريف تحدده لك وتسألك عن الترتيب
  // (dateHint)، ولو واحد بس من الاحتمالات يطابق يوم وصول الرسالة (±يومين) يتعبّى كاقتراح (dateGuess) وأنت تعتمد
  let dateOrder = null, dateHint = null, dateGuess = null;
  if (fields.date) {
    const ch = R.dateChoices(text.slice(fields.date.start, fields.date.end));
    if (ch.length === 1) dateOrder = ch[0].o;
    else {
      const tok = R.findDateToken(text), known = tok ? (store.settings.smsDateShapes || {})[shapeKey(bank, tok.sig)] : null;
      if (known && ch.some(c => c.o === known.order)) dateOrder = known.order;
      else {
        dateHint = fields.date; delete fields.date;
        if (recv) { const near = ch.filter(c => c.date >= addDays(recv, -2) && c.date <= addDays(recv, 1)); if (near.length === 1) dateGuess = near[0].o; }
      }
    }
  }
  const skips = sp.skips.map(r => ({ start: r[0], end: r[1] }));
  const meta = { role, family: fam, direction: fam ? FAMILY_DIR[fam] : null, sender: m.sender || null, bank: bankLabel(store, m.sender) || null, skips, dateOrder,
    feeMode: fields.fee ? (opts.feeMode || (opts.smartFee && sp.feeTop ? 'top' : 'in')) : null };
  const L = R.learnFormat(text, fields, meta);
  if (L.error) return { error: L.error, guess: g, fields, meta, feeTop: sp.feeTop, dateHint, dateGuess };
  const preview = role === 'tx' ? (formatInfo(store, L.template, sanitizeText(text), W) || L.preview) : null;
  return { template: L.template, preview, guess: g, fields, meta, feeTop: sp.feeTop, dateHint, dateGuess };
}
// الرسائل اللي تنتظر في المراجعة وتطابق الصيغة (تنعاد معالجتها بعد الاعتماد)
function waitingForFormat(store, t) {
  const R = SR(), out = [];
  store.all('reviews').filter(r => r.status === 'open' && (r.kind === 'sms_new_shape' || r.kind === 'sms_unparsed') && r.messageId).forEach(r => {
    const m = store.get('messages', r.messageId); if (!m || !m.text || !formatBankOk(store, t, m.sender)) return;
    if (R.matchFormat(t, m.text)) out.push(m.id);
  });
  return Array.from(new Set(out));
}
function waitingForFormats(store) {
  const out = [];
  store.all('reviews').filter(r => r.status === 'open' && r.kind === 'sms_new_shape' && r.messageId).forEach(r => {
    const m = store.get('messages', r.messageId); if (!m || !m.text || m.txId) return;
    const f = matchSmsFormat(store, m.text, m.sender); if (!f) return;
    if (f.role === 'info' && r.weakOtp) return;
    out.push(m.id);
  });
  return Array.from(new Set(out));
}
function formatName(store, t) { return (t.role === 'info' ? 'معلومات' : (SMS_FAMILY_L[t.family] || 'رسالة')) + (t.sender ? ' — ' + (bankLabel(store, t.sender) || t.sender) : ''); }
// حفظ صيغة معتمدة (جديدة، أو تعديل: meta.replaceId). يرجّع الرسائل المنتظرة اللي تطابقها
function saveSmsFormat(store, tpl, meta) {
  meta = meta || {};
  const now = new Date().toISOString();
  let prev = meta.replaceId ? store.get('templates', meta.replaceId) : null;
  if (!isFormat(prev)) prev = smsFormats(store, 'approved').find(x => x.sig === tpl.sig && (x.role || 'tx') === (tpl.role || 'tx') && !!x.sender === !!tpl.sender && (!x.sender || bankOf(store, x.sender) === bankOf(store, tpl.sender))) || null;
  const t = Object.assign({}, tpl, { id: isFormat(prev) ? prev.id : uid(), createdAt: isFormat(prev) ? prev.createdAt : now, updatedAt: now, status: 'approved', active: true, rev: isFormat(prev) ? (prev.rev || 1) + 1 : 1 });
  if (isFormat(prev) && prev.fromShapes) t.fromShapes = true;
  t.sample = sanitizeText(SR().norm(meta.sample != null ? meta.sample : (prev && prev.sample) || ''));
  // الاسم: اللي كتبته، وإلا اسمك السابق. الاسم التلقائي يتجدد (مثل شكل «معلومات» عرّفته عملية)
  const prevOwn = isFormat(prev) && prev.name && prev.name !== formatName(store, prev) ? prev.name : '';
  t.name = String(meta.name || '').replace(/\s+/g, ' ').trim().slice(0, 60) || prevOwn || formatName(store, t);
  store.put('templates', t); dropCoveredPending(store, t); store.touch();
  return { template: t, waiting: waitingForFormat(store, t) };
}
// شكل معلّق صار له صيغة معتمدة تغطيه (عرّفته من المراجعة مثلًا): ينشال من قائمة الانتظار
function dropCoveredPending(store, t) {
  const R = SR();
  smsFormats(store, 'pending').forEach(p => {
    if (p.id === t.id || !p.sample || !formatBankOk(store, t, p.sender) || !R.matchFormat(t, p.sample)) return;
    store.remove('templates', p.id);
    store.all('reviews').filter(r => r.status === 'open' && r.pendingId === p.id).forEach(r => { r.pendingId = null; store.put('reviews', r); });
  });
}
function deleteSmsFormat(store, id) {
  const t = store.get('templates', id); if (!isFormat(t)) return null;
  store.remove('templates', id);
  store.all('reviews').filter(r => r.status === 'open' && r.pendingId === id).forEach(r => { r.pendingId = null; store.put('reviews', r); });
  store.touch(); return true;
}
// اعتماد شكل معلّق (من رسائلك المحفوظة) كما هو
function approvePendingFormat(store, id) {
  const t = store.get('templates', id); if (!isFormat(t) || t.status !== 'pending') return null;
  Object.assign(t, { status: 'approved', active: true, updatedAt: new Date().toISOString() });
  if (!t.name) t.name = formatName(store, t);
  store.put('templates', t); dropCoveredPending(store, t); store.touch();
  return { template: t, waiting: waitingForFormat(store, t) };
}
// «معلومات ولا تسألني عن هالشكل»: صيغة معلومات من نص الرسالة كما هو
// src = رقم الرسالة، أو {text, sender} (مثل شكل معلّق)
function saveInfoFormat(store, src, replaceId) {
  const m = typeof src === 'string' ? store.get('messages', src) : src; if (!m || !m.text) return null;
  if (SR().classify(m.text).cls === 'otp' || SR().classify(m.text).code === 'otp_weak') return { error: 'otp' };
  const p = proposeFormat(store, m, 'info'); if (p.error) return { error: p.error };
  return saveSmsFormat(store, p.template, { sample: m.text, replaceId: replaceId || null });
}
function formatMsgCount(store, t) {
  const R = SR(); let n = 0;
  store.all('messages').forEach(m => { if (m.text && formatBankOk(store, t, m.sender) && R.matchFormat(t, m.text)) n++; });
  return n;
}
// التاريخ اللي تعطيه الصيغة للرسالة بدون سؤال (نفس قواعد القراءة: رسائل آخر الليل، ومو في المستقبل، ومو أقدم من وصولها بأكثر من يومين)
function formatDateOf(m, info) {
  if (!(info && info.via && info.via.date && info.transactionDate)) return null;
  const fx = arrivalFix(info.transactionDate, m.receivedAt), day = riyadhDay(m.receivedAt), inbox = (m.source || 'paste') !== 'paste';
  if (fx.date > day || (inbox && fx.date < addDays(day, -OLD_DAYS))) return null;
  return { date: fx.date, arrival: fx.fixed };
}
/* أثر صيغة (جديدة أو معدّلة) على رسائل سابقة تطابقها: عمليات قراءتها بتتغير، ورسائل كانت «معلومات» بتصير عمليات.
   ما يغيّر شي: التطبيق يسألك بعدها «من الحين وطالع / على الكل / من تاريخ». */
function formatImpact(store, t) {
  const R = SR(), out = { changes: [], infoToTx: [], minDate: null, maxDate: null, total: 0 };
  if (!isFormat(t) || t.role !== 'tx') return out;
  const open = new Set(store.all('reviews').filter(r => r.status === 'open' && r.messageId && (r.kind === 'sms_new_shape' || r.kind === 'sms_unparsed')).map(r => r.messageId));
  store.all('messages').forEach(m => {
    if (!m.text || open.has(m.id) || !['tx', 'merged', 'informational'].includes(m.status) || !formatBankOk(store, t, m.sender) || !R.matchFormat(t, m.text)) return;
    const win = matchSmsFormat(store, m.text, m.sender); if (t.status === 'approved' && (!win || win.id !== t.id)) return; // صيغة أدق منها تقرا هالرسالة
    const d = msgWordsDate(store, m), W = smsWordsFor(store, m.text, m.receivedAt, null, bankOf(store, m.sender)).W;
    const info = formatInfo(store, t, m.text, W); if (!info) return;
    sanitizeInfo(smsFamilyFix(info)); if (!info.ok) return;
    const B = infoSummary(info);
    if (m.status === 'informational') { out.infoToTx.push({ messageId: m.id, date: d, after: B }); return; }
    const tx = m.txId ? store.get('transactions', m.txId) : null; if (!tx) return;
    const A = m.readAs ? readSummary(m.readAs) : null;
    const fields = A ? ['family', 'amount', 'name', 'method', 'balance', 'fee'].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k])) : ['amount', 'name', 'balance', 'fee'];
    const limited = m.status === 'merged' || hasStatementLink(tx);
    let eff;
    if (limited) { const L = limitedFix(tx, info); eff = fields.filter(k => (k === 'method' && L.method) || (k === 'name' && L.name)); }
    else eff = realFields(tx, fields, B);
    // التاريخ: إذا الصيغة تحدد التاريخ وتعطي تاريخ غير تاريخ العملية (وأنت ما حددته بيدك، والعملية مو من كشف)
    const nd = limited ? null : formatDateOf(m, info);
    if (nd && !m.userDate && tx.dateSource !== 'user' && nd.date !== tx.transactionDate) { eff = eff.concat('date'); B.date = nd.date; }
    if (!eff.length) return;
    out.changes.push({ messageId: m.id, txId: tx.id, date: d, newDate: nd && eff.includes('date') ? nd : null, oldDate: tx.transactionDate, before: A || { family: null, type: '—', amount: tx.grossAmount, name: tx.merchantRaw || tx.beneficiaryRaw || tx.counterpartyName || null, method: tx.paymentMethod || null, balance: tx.balanceAfter == null ? null : tx.balanceAfter, fee: tx.feeAmount || null }, after: B, fields: eff, limited });
  });
  const ds = out.changes.concat(out.infoToTx).map(x => x.date).filter(Boolean).sort();
  out.minDate = ds[0] || null; out.maxDate = ds[ds.length - 1] || null; out.total = ds.length;
  const byDate = (x, y) => String(y.date).localeCompare(String(x.date));
  out.changes.sort(byDate); out.infoToTx.sort(byDate);
  return out;
}
// scope: {mode: 'future'} = الرسائل الجاية بس · {mode: 'all'} = وكل السابقة · {mode: 'from', from} = والسابقة من تاريخ
async function applyFormatScope(store, id, scope) {
  const t = store.get('templates', id); if (!isFormat(t) || t.status !== 'approved') return null;
  scope = scope || {}; const out = { created: 0, corrected: 0, reviews: 0 };
  if (scope.mode !== 'all' && scope.mode !== 'from') return out;
  if (scope.mode === 'from' && !/^\d{4}-\d{2}-\d{2}$/.test(String(scope.from || ''))) return { error: 'date' };
  if (store._scopeBusy) return { busy: true };
  store._scopeBusy = true;
  try {
  const from = scope.mode === 'from' ? scope.from : null, imp = formatImpact(store, t), inS = (x) => !from || x.date >= from;
  for (const c of imp.changes.filter(inS)) {
    const m = store.get('messages', c.messageId); if (!m) continue;
    const W = smsWordsFor(store, m.text, m.receivedAt, null, bankOf(store, m.sender)).W;
    if (await correctTxFromMessage(store, c.txId, c.messageId, W)) {
      out.corrected++;
      const mm = store.get('messages', c.messageId), tx = store.get('transactions', c.txId);
      if (c.newDate && tx) { tx.transactionDate = c.newDate.date; tx.dateSource = 'template'; tx.dateShape = null; if (c.newDate.arrival) tx.dateArrival = true; else delete tx.dateArrival; store.put('transactions', tx); }
      if (mm) { mm.templateId = t.id; mm.parser = 'format'; if (c.newDate) { mm.dateSource = 'template'; mm.dateShape = null; if (c.newDate.arrival) mm.dateArrival = true; else delete mm.dateArrival; } store.put('messages', mm); }
    }
  }
  const ids = imp.infoToTx.filter(inS).map(x => x.messageId).filter(id => { const m = store.get('messages', id); return m && m.status === 'informational' && !m.txId; });
  if (ids.length) { const plan = await reprocessMessages(store, ids); if (plan) { const r = commitSms(store, plan, { markReview: true }); out.created = r.created || 0; out.reviews = r.reviews || 0; } }
  if (out.corrected) pairTransfers(store);
  sweepPeriods(store); store.touch();
  return out;
  } finally { store._scopeBusy = false; }
}
/* الأشكال اللي تطلع من رسائلك المحفوظة (ترقية 1.7.1): كل شكل = صيغة «معلّقة» بقراءتها المقترحة، تعتمدها أو تعدلها شكل شكل.
   رسائل العمليات أولًا، ثم «المعلومات»: اللي فيها مبلغ أو تكرر شكلها. المعلومات اللي بدون مبلغ وجات مرة وحدة (مثل إعلان) ما تطلع:
   لو جات مرة ثانية تروح المراجعة مثل أي شكل جديد. */
function buildPendingShapes(store) {
  const R = SR(), now = new Date().toISOString(), made = [], infoOnce = [];
  const byRecv = (a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''));
  const msgs = store.all('messages').filter(m => m.text && ['tx', 'merged', 'informational'].includes(m.status));
  const txMsgs = msgs.filter(m => m.status !== 'informational').sort(byRecv), infoMsgs = msgs.filter(m => m.status === 'informational').sort(byRecv);
  const hit = (m, list) => list.find(t => formatBankOk(store, t, m.sender) && R.matchFormat(t, m.text));
  const bySig = new Map(), txShapes = [], sigKey = (t) => (t.sender ? bankOf(store, t.sender) : '') + '|' + t.sig; // فهرس بالبصمة: ما نقارن كل رسالة بكل شكل
  const add = (m, role) => {
    if (m.text.length > 2400) return null;
    if (matchSmsFormat(store, m.text, m.sender)) return null; // لها صيغة معتمدة من قبل
    let ex = hit(m, txShapes), p = null;
    if (!ex) { p = proposeFormat(store, m, role); if (p.error) return null; const o = bySig.get(sigKey(p.template)); if (o && R.matchFormat(o, m.text)) ex = o; }
    if (ex) { ex.count = (ex.count || 1) + 1; if (role === 'info') ex.infoCount = (ex.infoCount || 0) + 1; return ex; }
    const t = Object.assign({}, p.template, { id: uid(), status: 'pending', active: false, fromShapes: true, sample: m.text, exampleMsgId: m.id, count: 1, infoCount: role === 'info' ? 1 : 0, createdAt: now, updatedAt: now,
      hasAmount: R.hasMoney(m.text), feeTopHint: !!(p.feeTop && role === 'tx') });
    t.name = formatName(store, t); t._new = true;
    if (!bySig.has(sigKey(t))) bySig.set(sigKey(t), t);
    if (role === 'tx') txShapes.push(t);
    return t;
  };
  const safe = (m, role) => { try { return add(m, role); } catch (e) { return null; } }; // رسالة شاذة ما توقف الترقية
  txMsgs.forEach(m => { const t = safe(m, 'tx'); if (t && t._new) { delete t._new; made.push(t); } });
  infoMsgs.forEach(m => { const t = safe(m, 'info'); if (!t || !t._new) return; delete t._new; if (t.hasAmount) made.push(t); else infoOnce.push(t); });
  infoOnce.filter(t => t.count >= 2).forEach(t => made.push(t));
  made.forEach(t => store.put('templates', t));
  return made;
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
  // 1.7.1: شراء أو سحب أو استرداد ببطاقة ائتمانية: العملية على البطاقة نفسها، حتى لو الرسالة فيها رقم الحساب الجاري المربوط بها.
  // بطاقة ائتمانية ما نعرفها تتسجل بطاقة مؤقتة (autoAccountFor) بدل ما تنحسب على الحساب الجاري ورصيده
  if (info.instrumentLast4 && CARD_SIDE.has(info.family)) {
    const ccs = accs.filter(a => a.type === 'credit_card' && (a.last4 === info.instrumentLast4 || store.all('instruments').some(i => i.accountId === a.id && i.last4 === info.instrumentLast4)));
    if (ccs.length === 1) return ccs[0];
    if (info.creditCard) return null;
  }
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
const CARD_SIDE = new Set(['sms_purchase', 'sms_refund', 'sms_cash_withdrawal']);
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
    newAccounts: new Map(), newInstruments: new Map(), newBeneficiaries: new Map(), newMerchants: new Map(), newCities: new Map(), txs: [], msgRecords: [], reviews: [], held: new Map(), alreadyStored: [], warnings: [],
    senderSeen: new Map(), trustAdd: [] };
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
      text: null, ids: ids.map(x => ({ type: x.type, fingerprint: x.fingerprint || null, alt: x.alt || null, last4: x.last4, bankCode: x.bankCode || null })), txId: null, reviewId: null, parser: null, templateId: null, importId: plan.id, ackedAt: prev ? (prev.ackedAt || null) : null }; // إعادة المعالجة ما تلغي تأكيد الاستلام
    // 1.5.0: مدينة مقترحة من موقع الجوال وقت الرسالة (اسم المدينة فقط، بدون إحداثيات)
    const cityRaw = validCityRaw(m.suggestedCity);
    if (cityRaw) { rec.suggestedCity = cityRaw; rec.citySource = m.citySource === 'device_gps' ? 'device_gps' : 'shortcut_gps'; rec.cityCapturedAt = typeof m.cityCapturedAt === 'string' ? m.cityCapturedAt.slice(0, 40) : null; }
    plan.msgRecords.push(rec);
    // 1.6.2: البنك = المرسل (أو البنك اللي دمجته فيه). الرسائل الملصوقة بدون بنك: bank = null
    const bank = bankOf(store, m.sender), inbox = (m.source || 'paste') !== 'paste';
    if (m.sender && senderKey(m.sender)) plan.senderSeen.set(senderKey(m.sender), String(m.sender));
    // 1.6.1: كلمات القراءة حسب تاريخ الرسالة (المكتوب فيها، وإلا تاريخ وصولها)
    rec.wordsDate = wordsDate(store, text, received, bank);
    const WV = smsWordsFor(store, text, received, null, bank), W = WV.W; rec.wordsVersion = WV.version ? WV.version.id : null;
    const c = R.classify(text, W);
    rec.cls = c.cls; rec.clsReason = c.reason;
    if (c.cls === 'otp') { rec.status = 'discarded'; continue; } // رسالة رمز: ما نحفظ نصها أبدًا (حتى من مرسل متجاهل)
    rec.text = sanitizeText(text);
    // 1.6.2: مرسل اخترت تتجاهله (مثل STC): تنحفظ بنصها «من مرسل متجاهل» بدون عملية
    if (bank && isIgnoredBank(store, bank)) {
      if (c.code === 'otp_weak') { rec.text = null; rec.status = 'discarded'; continue; } // فيها رمز محتمل: ما نحفظ نصها
      rec.status = 'sender_ignored'; continue;
    }
    // 1.7.1: الصيغ الثابتة. الرسالة تنقرأ بس إذا طابقت صيغة معتمدة بالضبط. «صيغة معلومات» = تنحفظ معلومات بدون سؤال
    let fmt = matchSmsFormat(store, rec.text, m.sender);
    if (fmt && fmt.role === 'info' && c.code === 'otp_weak') fmt = null; // فيها رمز محتمل: ما تنحفظ «معلومات» بصمت، تنتظر قرارك
    if ((opts.forceDate && opts.forceDate[m.id]) || m.userDate) rec.userDate = (opts.forceDate && opts.forceDate[m.id]) || m.userDate;
    if ((opts.forceAccount && opts.forceAccount[m.id]) || m.forcedAccountId) rec.forcedAccountId = (opts.forceAccount && opts.forceAccount[m.id]) || m.forcedAccountId;
    if (fmt && fmt.role === 'info') { rec.cls = 'informational'; rec.clsReason = 'صيغة معلومات'; rec.parser = 'format'; rec.templateId = fmt.id; rec.status = 'informational'; continue; }
    if (fmt) { rec.cls = 'financial'; rec.clsReason = ''; }
    // بصمة النص للمقارنة فقط: رسالة بنفس النص تروح المراجعة، ما تنحذف.
    // الرسائل اللي تجاهلتها (أو معلومات فقط) ما سوّت عملية، فما تُعتبر تكرار. قرارك «عالجها» ينحفظ على الرسالة
    const NO_TX = new Set(['ignored', 'informational', 'discarded', 'duplicate', 'sender_ignored']);
    const sameOk = !!(m.sameContentOk || (opts.allowSameContent && opts.allowSameContent.has(m.id)));
    if (sameOk) rec.sameContentOk = true;
    // نفس النص بالضبط: البصمة، أو النص المحفوظ نفسه بغض النظر عن المرسل (نسخة ملصوقة من رسالة واصلة من الصندوق)
    const plain = sanitizeText(text);
    const same = store.all('messages').find(x => (x.contentHash === contentHash || (x.text && x.text === plain)) && x.id !== m.id && !NO_TX.has(x.status)) || (batchHashes.has(contentHash) ? { id: batchHashes.get(contentHash) } : null);
    batchHashes.set(contentHash, m.id);
    if (same && same.status === 'deleted' && same.deletedTxId && store.get('deletedTxs', same.deletedTxId) && !sameOk) { newReview(plan, rec, 'sms_deleted_again', { deletedId: same.deletedTxId }); continue; }
    if (same && !sameOk) {
      // 1.5.2: نفس النص بالضبط (حتى الوقت) = نفس الرسالة وصلت مرتين: تنحسب مرة وحدة تلقائيًا،
      // وتطلع في المراجعة «مكررة» ومعها «مو مكررة» لو كانت غلط
      const rv = newReview(plan, rec, 'sms_same_content', { otherMessageId: same.id, autoDuplicate: true });
      Object.assign(rv, { status: 'resolved', resolution: 'auto_duplicate', resolvedAt: now }); rec.status = 'duplicate';
      continue;
    }
    // ما لها صيغة معتمدة (حتى لو ما فيها مبلغ): تنتظر في المراجعة تعرّفها. الاقتراح = تخمين القارئ العام، تصححه وتعتمده
    if (!fmt) {
      const pend0 = matchSmsFormat(store, rec.text, m.sender, 'pending'), pend = pend0 && !(pend0.role === 'info' && c.code === 'otp_weak') ? pend0 : null;
      const pm = { text: rec.text, sender: m.sender, receivedAt: received, source: rec.source };
      const pr = proposeFormat(store, pm, 'tx'), pi = pr.template ? null : proposeFormat(store, pm, 'info');
      rec.parser = null; rec.templateId = null;
      newReview(plan, rec, 'sms_new_shape', { pendingId: pend ? pend.id : null, suggest: pr.template ? readKey(sanitizeInfo(pr.preview)) : null, sig: (pr.template || (pi && pi.template) || {}).sig || null,
        weakOtp: c.code === 'otp_weak', hasAmount: R.hasMoney(text), bank: bank || null });
      continue;
    }
    const info = sanitizeInfo(smsFamilyFix(formatInfo(store, fmt, rec.text, W) || { parser: 'format', missing: ['format'], ok: false }));
    rec.parser = 'format'; rec.templateId = fmt.id;
    // طابقت الصيغة بس واحد من المتغيرات ما انقرأ: مراجعة
    if (!info.ok) { newReview(plan, rec, 'sms_unparsed', { missing: info.missing || [], partial: stripInfo(info), templateId: fmt.id }); continue; }
    rec.readAs = readKey(info); // وش انقرأ منها، عشان المعاينة تقارن بالقراءة الفعلية
    // التاريخ اللي حدده المستخدم ينحفظ مع الرسالة، عشان ما ينطلب مرة ثانية لو احتاجت مراجعة ثانية (مثل الحساب)
    rec.userDate = (opts.forceDate && opts.forceDate[m.id]) || m.userDate || null;
    // التاريخ: من ترتيب شكل التاريخ المحفوظ. شكل جديد أو تاريخ في المستقبل = مراجعة قبل الحفظ
    const dr = resolveSmsDate(store, text, info, rec, received, bank);
    rec.dateShape = dr.sig || null;
    if (dr.review) { newReview(plan, rec, 'sms_date_shape', Object.assign({ info: stripInfo(info) }, dr.review)); continue; }
    if (dr.noDate) { newReview(plan, rec, 'sms_no_date', { info: stripInfo(info) }); continue; }
    info.transactionDate = dr.date; info.dateSource = dr.source; info.dateShape = dr.sig || null;
    if (dr.arrival) rec.dateArrival = true; else delete rec.dateArrival;
    if (!info.transactionDate && receivedDate) { info.transactionDate = receivedDate; info.dateSource = 'received'; }
    rec.dateSource = info.dateSource || null;
    if (!info.transactionDate) { newReview(plan, rec, 'sms_no_date', { info: stripInfo(info) }); continue; }
    info.fingerprints = rec.ids;
    // الحساب اللي اخترته لهذي الرسالة ينحفظ عليها، عشان ما ينسأل مرة ثانية لو احتاجت مراجعة ثانية
    const forced = (opts.forceAccount && opts.forceAccount[m.id]) || m.forcedAccountId || null;
    if (forced) rec.forcedAccountId = forced;
    if (info.instrumentLast4 && /(بطاق[ةه]\s+ا[ئي]تماني|credit\s*card)/i.test(text) && !/(مدى|mada)/i.test(text)) info.creditCard = true;
    let acc = resolveSmsAccount(store, plan, info, rec.ids, forced);
    if (!acc) acc = autoAccountFor(store, plan, H, info, text); // بطاقة أو حساب جديد: يتسجل مؤقتًا بدل ما يوقف
    if (!acc) { newReview(plan, rec, 'sms_no_account', { info: stripInfo(info) }); continue; }
    const line = { raw: text, balance: info.balanceAfter != null ? info.balanceAfter : null, rowIndex: row };
    const tx = await buildTx(store, plan, H, acc, info, line, 'sms', m.id);
    if (acc.autoCreated && !tx.instrumentId && acc.last4) tx.instrumentId = H.ensureInstrument(acc.id, info.instrumentLast4 ? 'card' : 'account', acc.last4, 'unknown').id;
    tx.sourceLinks[0].messageId = m.id;
    if (info.online || info.family === 'online_purchase' || tx.paymentMethod === 'Online' || ONLINE_SHOP.test(tx.merchantRaw || '')) tx.onlineHint = true; // 1.6.1: موقعك وقت الشراء الأونلاين مو مكان المتجر
    tx.dateSource = info.dateSource || null; tx.dateShape = info.dateShape || null;
    if (rec.dateArrival) tx.dateArrival = true; // 1.7.0: البنك كتب تاريخ اليوم الجاي، والعملية على يوم الوصول
    if (rec.suggestedCity) { const cc = ensureCity(store, rec.suggestedCity, plan.newCities); if (cc) Object.assign(tx, { suggestedCityId: cc.id, suggestedCityRaw: rec.suggestedCity, citySuggestionSource: rec.citySource, citySuggestedAt: rec.cityCapturedAt || rec.receivedAt || null }); }
    tx._msgId = m.id;
    plan.txs.push(tx); rec.status = 'tx'; rec.txId = tx.id;
    const missing = (info.missing || []).filter(k => k !== 'amount');
    if (missing.length) { // (1.7.1: المحل اللي ما حددته في الصيغة مو «ناقص»: أنت اللي اخترت)
      newReview(plan, rec, 'sms_partial', { txId: tx.id, missing: missing.length ? missing : ['merchant'] });
      rec.status = 'tx'; // العملية انحفظت، والمراجعة لإكمال الحقول الناقصة
    }
  }
  // 1.5.2: نفس الرسالة من مصدر ثاني = مكررة تلقائيًا (أو «حذفتها قبل» إذا عمليتها محذوفة). «مو مكررة» يتخطى هذا
  const liveTx = store.all('transactions'), delTx = store.all('deletedTxs');
  plan.txs = plan.txs.filter(tx => {
    const rec = plan.msgRecords.find(x => x.id === tx._msgId); if (!rec || rec.sameContentOk) return true;
    const own = (b) => (b.sourceLinks || []).some(l => l && l.messageId === tx._msgId); // عمليتها هي نفسها ما تنحسب تكرار
    const hit = liveTx.find(b => !own(b) && sameSmsMessage(store, tx, b, plan.newInstruments));
    const del = hit ? null : delTx.find(b => !own(b) && sameSmsMessage(store, tx, b, plan.newInstruments));
    if (!hit && !del) return true;
    plan.reviews = plan.reviews.filter(x => !(x.kind === 'sms_partial' && x.txId === tx.id));
    rec.txId = null;
    if (del) { newReview(plan, rec, 'sms_deleted_again', { deletedId: del.id, score: 100 }); return false; }
    const other = (hit.sourceLinks || []).find(l => l && l.sourceType === 'sms' && l.messageId);
    const rv = newReview(plan, rec, 'sms_same_content', { otherMessageId: other ? other.messageId : null, autoDuplicate: true, matchedBy: 'fields' });
    Object.assign(rv, { status: 'resolved', resolution: 'auto_duplicate', resolvedAt: now }); rec.status = 'duplicate';
    return false;
  });
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
  // عملية حذفتها قبل وجات برسالة: تنتظر قرارك (رجّعها أو خلها محذوفة)
  const autoIds = new Set(plan.matches.auto.map(a => a.newId));
  findDeletedMatches(store, plan.txs.filter(t => !plan.held.has(t.id) && !autoIds.has(t.id)), null, { sms: true }).forEach((dm, txId) => {
    const tx = plan.txs.find(t => t.id === txId), rec = plan.msgRecords.find(x => x.id === tx._msgId);
    plan.held.set(tx.id, tx);
    plan.reviews = plan.reviews.filter(x => !(x.kind === 'sms_partial' && x.txId === tx.id));
    newReview(plan, rec, 'sms_deleted_again', { deletedId: dm.deletedId, score: dm.score, heldTx: cleanTx(tx) });
    rec.txId = null;
  });
  const st = { total: msgs.length, already: plan.alreadyStored.length, tx: 0, merged: plan.matches.auto.length, review: plan.reviews.filter(r => r.status === 'open').length, informational: 0, discarded: 0, duplicate: 0 };
  plan.msgRecords.forEach(r => { if (r.status === 'tx') st.tx++; if (r.status === 'informational') st.informational++; if (r.status === 'discarded') st.discarded++; if (r.status === 'duplicate') st.duplicate++; });
  plan.smsSummary = st;
  const dates = plan.txs.map(t => t.transactionDate).filter(Boolean).sort();
  plan.startDate = dates[0] || null; plan.endDate = dates[dates.length - 1] || null;
  plan.filename = 'رسائل بنكية (' + msgs.length + ')';
  return plan;
}
// المراجعة ما تحمل آيبان أو رقم حساب كامل؛ آخر 4 أرقام فقط
/* ---------- أشكال التاريخ في الرسائل ----------
   كل شكل (Signature من sms.js) له ترتيب يختاره المستخدم مرة: سنة-شهر-يوم أو غيره. مستقل عن اسم البنك.
   dateSource على العملية والرسالة: shape (من الشكل المحفوظ) · template (صيغة متعلّمة) · user (حدده المستخدم) · received (تاريخ الاستلام) */
// 1.6.2: رسالة من الصندوق تاريخها أقدم من وصولها بأكثر من يومين = غالبًا قراءة غلط، تروح المراجعة
const OLD_DAYS = 2;
// مفتاح شكل التاريخ: لكل بنك أشكاله (bank§sig). الملصوقة بدون بنك: الأشكال العامة (sig)
const shapeKey = (bank, sig) => (bank ? bank + '§' + sig : sig);
const rawSig = (key) => (String(key || '').includes('§') ? String(key).split('§')[1] : key);
// 1.7.0: يوم الوصول بتوقيت السعودية (UTC+3)، مو بتوقيت غرينتش
function riyadhDay(iso) {
  const s = String(iso || new Date().toISOString());
  if (!/([zZ]|[+-]\d\d:?\d\d)$/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s); return isFinite(t) ? new Date(t + 3 * 3600000).toISOString().slice(0, 10) : s.slice(0, 10);
}
// 1.7.0: بعض البنوك (مثل الإنماء) تكتب تاريخ اليوم الجاي في رسائل آخر الليل. المكتوب = يوم الوصول + 1 ← يوم الوصول، والوقت يبقى
function arrivalFix(d, received) {
  if (!d || !received) return { date: d, fixed: false };
  const day = riyadhDay(received);
  return d === addDays(day, 1) ? { date: day, fixed: true } : { date: d, fixed: false };
}
function resolveSmsDate(store, text, info, rec, received, bank) {
  const R = SR(), tok = R.findDateToken(text), sig = tok ? shapeKey(bank, tok.sig) : null;
  const recvDay = riyadhDay(received);
  const tooOld = (d) => (rec.source || 'paste') !== 'paste' && d < addDays(recvDay, -OLD_DAYS);
  const ask = (reason) => ({ review: { reason, sig, pat: tok ? tok.pat : null, token: tok ? tok.raw : null, sample: tok ? sanitizeText(tok.sample) : null, candidates: tok ? tok.candidates : [] } });
  if (rec.userDate) return { date: rec.userDate, source: 'user', sig };
  if ((info.parser === 'template' || info.parser === 'format') && info.via && info.via.date && info.transactionDate) {
    const fx = arrivalFix(info.transactionDate, received);
    if (fx.fixed) return { date: fx.date, source: 'template', sig: null, arrival: true };
    if (info.transactionDate > recvDay) return tok ? ask('future') : { date: null, source: null, sig: null, noDate: true }; // 1.7.0: بدون شكل معروف: ما ينقبل تاريخ مستقبل
    if (tooOld(info.transactionDate)) return ask('old');
    return { date: info.transactionDate, source: 'template', sig: null };
  }
  if (!tok) return { date: null, source: null, sig: null };
  const known = (store.settings.smsDateShapes || {})[sig];
  if (!known) return ask('new');
  const d0 = R.readDateOrder(tok, known.order);
  if (!d0) return ask('order_invalid');
  const fx = arrivalFix(d0, received);
  if (fx.fixed) return { date: fx.date, source: 'shape', sig, arrival: true };
  if (d0 > recvDay) return ask('future');
  if (tooOld(d0)) return ask('old');
  return { date: d0, source: 'shape', sig };
}
function setDateShape(store, sig, order, sample, pat) {
  const s = store.settings; s.smsDateShapes = Object.assign({}, s.smsDateShapes || {});
  const prev = s.smsDateShapes[sig], now = new Date().toISOString();
  s.smsDateShapes[sig] = { order, sample: sample || (prev && prev.sample) || '', pat: pat || (prev && prev.pat) || sig.split('|')[2], createdAt: (prev && prev.createdAt) || now, updatedAt: now };
  store.put('settings', s);
}
function removeDateShape(store, sig) {
  const s = store.settings; if (!s.smsDateShapes || !s.smsDateShapes[sig]) return false;
  s.smsDateShapes = Object.assign({}, s.smsDateShapes); delete s.smsDateShapes[sig]; store.put('settings', s); return true;
}
// التصحيح الرجعي: فقط العمليات اللي انحفظت من رسالة بنفس الشكل وتاريخها جا آليًا. تاريخ حدده المستخدم ما يتغير
function retroDateFix(store, sig) {
  const shape = (store.settings.smsDateShapes || {})[sig]; if (!shape) return 0;
  const R = SR(), now = new Date().toISOString(); let n = 0;
  store.all('messages').forEach(m => {
    if (m.dateShape !== sig || m.userDate || !m.text || !m.txId) return;
    if (m.dateSource && m.dateSource !== 'shape' && m.dateSource !== 'legacy') return;
    const tx = store.get('transactions', m.txId); if (!tx) return;
    const own = (tx.sourceLinks || [])[0];
    if (!own || own.sourceType !== 'sms' || own.messageId !== m.id) return; // عملية أصلها كشف: تاريخها من الكشف
    if (tx.dateSource && tx.dateSource !== 'shape' && tx.dateSource !== 'legacy') return;
    const tok = R.findDateToken(m.text); if (!tok || tok.sig !== rawSig(sig)) return;
    const d = arrivalFix(R.readDateOrder(tok, shape.order), m.receivedAt).date; // 1.7.0: تاريخ اليوم الجاي في رسائل الليل
    if (m.dateSource !== 'shape') { m.dateSource = 'shape'; store.put('messages', m); }
    if (!d || d === tx.transactionDate) { if (tx.dateSource !== 'shape') { tx.dateSource = 'shape'; tx.dateShape = sig; store.put('transactions', tx); } return; }
    tx.transactionDate = d; tx.dateSource = 'shape'; tx.dateShape = sig; tx.updatedAt = now; store.put('transactions', tx); n++;
  });
  if (n) { pairTransfers(store); store.touch(); }
  return n;
}
// جواب المستخدم على مراجعة «شكل تاريخ»: شكل جديد ← يحفظ الترتيب ويصحح اللي قبل ويعيد معالجة الرسائل المعلقة بنفس الشكل.
// تاريخ في المستقبل أو ما ينطبق عليه الترتيب المحفوظ ← لهذي الرسالة فقط
function answerDateShape(store, reviewId, order) {
  const r = store.get('reviews', reviewId); if (!r || r.kind !== 'sms_date_shape' || r.status !== 'open') return null;
  const cand = (r.candidates || []).find(c => c.order === order); if (!cand) return null;
  const out = { saved: false, fixed: 0, reprocess: [], forceDate: null, date: cand.date };
  if (r.reason === 'new' || r.reason === 'legacy') {
    setDateShape(store, r.sig, order, r.sample, r.pat); out.saved = true;
    out.fixed = retroDateFix(store, r.sig);
    if (r.reason === 'new' && isOldFor(store.get('messages', r.messageId), cand.date)) out.forceDate = { [r.messageId]: cand.date }; // 1.6.2: اخترت تاريخها وهو قديم
    store.all('reviews').filter(x => x.status === 'open' && x.kind === 'sms_date_shape' && x.sig === r.sig && (x.reason === 'new' || x.reason === 'legacy')).forEach(x => {
      if (x.reason === 'legacy') closeReview(store, x, 'answered'); else out.reprocess.push(x.messageId);
    });
    // 1.6.2: بطاقات «بنك جديد» اللي كانت تسأل عن نفس الشكل تنعاد بالترتيب المحفوظ
    store.all('reviews').filter(x => x.status === 'open' && x.kind === 'sms_new_bank' && x.dateAsk && x.dateAsk.sig === r.sig).forEach(x => out.reprocess.push(x.messageId));
    // رسائل من قبل هذا التحديث بنفس الشكل ولها مراجعة مفتوحة (حساب غير معروف أو تكرار محتمل): تنعاد بالتاريخ الصحيح
    store.all('reviews').filter(x => x.status === 'open' && (x.kind === 'sms_no_account' || x.kind === 'sms_duplicate')).forEach(x => {
      const msg = store.get('messages', x.messageId); if (msg && msg.dateShape === r.sig && !msg.userDate) out.reprocess.push(x.messageId);
    });
  } else {
    out.forceDate = { [r.messageId]: cand.date }; out.reprocess.push(r.messageId);
  }
  out.reprocess = Array.from(new Set(out.reprocess));
  store.touch();
  return out;
}
// ترقية 1.4.0: الرسائل المحفوظة قبل هذا الإصدار تنعرف أشكال تواريخها، وكل شكل يطلع سؤال واحد في المراجعة
function migrateDateShapes(store) {
  const s = store.settings; if (s.dateShapesMigrated) return 0;
  const R = SR(), groups = new Map(), shapes = s.smsDateShapes || {};
  store.all('messages').forEach(m => {
    if (m.dateShape !== undefined || !m.text) return;
    const tok = R.findDateToken(m.text);
    m.dateShape = tok ? tok.sig : null;
    m.dateSource = m.userDate ? 'user' : (tok ? 'legacy' : null);
    store.put('messages', m);
    if (tok && !m.userDate && m.txId && !shapes[tok.sig] && !groups.has(tok.sig)) groups.set(tok.sig, { m, tok });
  });
  const now = new Date().toISOString();
  groups.forEach(({ m, tok }, sig) => store.put('reviews', { id: uid(), kind: 'sms_date_shape', status: 'open', createdAt: now, messageId: m.id, importId: m.importId || null,
    reason: 'legacy', sig, pat: tok.pat, token: tok.raw, sample: sanitizeText(tok.sample), candidates: tok.candidates }));
  s.dateShapesMigrated = true; store.put('settings', s);
  return groups.size;
}
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
function commitSms(store, plan, opts) {
  (plan.newCities || new Map()).forEach(c => { if (!store.get('cities', c.id)) store.put('cities', c); }); // مدينة عملية معلّقة في المراجعة لازم تكون موجودة
  const committable = Object.assign({}, plan, { txs: plan.txs.filter(t => !plan.held.has(t.id)), matches: { auto: plan.matches.auto, review: [] } });
  const needImport = committable.txs.length || plan.newAccounts.size || plan.newBeneficiaries.size;
  let res = { created: 0, merged: 0, idRemap: new Map() };
  if (needImport) res = commitImport(store, committable, {});
  else { plan.newMerchants.forEach(m => { const c = Object.assign({}, m); delete c._new; delete c._aliasAdded; store.put('merchants', c); }); }
  // الموارد اللي تحتاجها العمليات المعلّقة (تاجر، أداة، مستفيد) تنحفظ حتى لو ما في استيراد
  if (!needImport) { plan.newInstruments.forEach(i => store.put('instruments', i)); }
  plan.msgRecords.forEach(r => { if (r.txId && res.idRemap && res.idRemap.get(r.txId)) r.txId = res.idRemap.get(r.txId); store.put('messages', r); });
  // 1.6.0: عملية رسالة جديدة (مو مندمجة مع موجودة) تنعلّم «ما راجعتها» لين تمر عليها في نافذة العمليات الجديدة
  if (opts && (opts.markNew || opts.markReview)) plan.msgRecords.forEach(r => { // جلب أو لصق جديد (أو رسائل صارت تنقرأ بكلماتك)، مو إعادة معالجة رسائل قديمة
    if (r.status !== 'tx' || !r.txId || (res.idRemap && Array.from(res.idRemap.values()).includes(r.txId))) return;
    const t = store.get('transactions', r.txId); if (t && !t.needsReview && !t.reviewedAt) {
      t.needsReview = true;
      // 1.7.0: «الفترات» حطت نفس مدينة موقعك الحالي: تصير معتمدة من الموقع (تبقى لو انحذفت الفترة)
      if (opts.markNew && t.periodCity && !t.periodCity.prev.cityId && !t.periodCity.prev.cityDismissed && t.suggestedCityId === t.cityId && autoCityOk(store, Object.assign({}, t, { cityId: null }))) { delete t.periodCity; t.cityAuto = true; }
      if (opts.markNew) autoApproveCity(store, t); store.put('transactions', t);
    }
  });
  plan.reviews.forEach(r => store.put('reviews', r));
  // 1.6.2: المرسلين الجدد ينضافون لصفحة «البنوك»، وقراءة الإنماء والصيغ المتعلّمة تعتمد نوعها للبنك
  if ((plan.senderSeen && plan.senderSeen.size) || (plan.trustAdd && plan.trustAdd.length)) {
    const now = new Date().toISOString(), S = sendersOf(store);
    const needSeen = Array.from((plan.senderSeen || new Map()).keys()).some(k => !own(S, k));
    const needTrust = (plan.trustAdd || []).some(x => !isTrusted(store, x.bank, x.family));
    if (needSeen || needTrust) putSenders(store, (map) => {
      (plan.senderSeen || new Map()).forEach((raw) => ensureSender(map, raw, now));
      (plan.trustAdd || []).forEach(x => { const r = ensureKey(map, x.bank, now); if (r && !r.trusted[x.family]) r.trusted = Object.assign({}, r.trusted, { [x.family]: now }); });
    });
  }
  // 1.5.0: رصيد رسالة الحساب الجاري (بالشروط في smsBalanceSnapshot). رسالة لها مراجعة مفتوحة ما تعتبر موثوقة
  const rv = new Set(plan.reviews.map(x => x.messageId));
  plan.msgRecords.forEach(r => {
    if (!['tx', 'merged'].includes(r.status) || !r.text || rv.has(r.id)) return;
    const t = plan.txs.find(x => x._msgId === r.id); if (!t || t.balanceAfter == null) return;
    const live = store.get('transactions', r.txId) || t;
    smsBalanceSnapshot(store, { accountId: live.accountId, balance: t.balanceAfter, date: t.transactionDate, time: t.time, receivedAt: r.receivedAt, source: r.source, text: r.text, messageId: r.id, txId: r.txId });
  });
  store.touch();
  return { created: res.created, merged: res.merged, reviews: plan.reviews.filter(r => r.status === 'open').length, summary: plan.smsSummary };
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
  if (tx.merchantId && !ex.merchantId) { ex.merchantId = tx.merchantId; if (tx.shopChoicePending) { ex.shopChoicePending = true; ex.invoiceAlias = tx.invoiceAlias; } }
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
      carry150(ex, held); carryShop(ex, held);
      ex.duplicateStatus = 'confirmed'; ex.confidenceScore = r.score; ex.updatedAt = new Date().toISOString(); store.put('transactions', ex);
      if (msg) { msg.status = 'merged'; msg.txId = ex.id; msg.userMerged = true; store.put('messages', msg); } // قرارك: ما ينفصل تلقائيًا
    }
  } else {
    const t = Object.assign({}, held, { duplicateStatus: 'independent' });
    store.put('transactions', t); applyRulesTo(store, [t.id]);
    if (msg) { msg.status = 'tx'; msg.txId = t.id; store.put('messages', msg); }
    pairTransfers(store); sweepPeriods(store); // 1.7.0: داخل «الفترات» تاخذ مدينتها ومجموعتها
  }
  closeReview(store, r, decision); store.touch(); return r;
}
// رسالة لعملية حذفتها قبل: «رجّعها» ترجع المحذوفة وتنضم لها الرسالة، «خلها محذوفة» تتجاهل الرسالة
function resolveDeletedAgain(store, reviewId, decision) {
  const r = store.get('reviews', reviewId); if (!r || r.status !== 'open' || r.kind !== 'sms_deleted_again') return null;
  const msg = store.get('messages', r.messageId);
  const exists = !!store.get('deletedTxs', r.deletedId);
  if (decision === 'restore') {
    let t = null;
    if (exists) t = r.heldTx ? attachToDeleted(store, r.deletedId, r.heldTx, true) : restoreTx(store, r.deletedId);
    else if (r.heldTx) { t = Object.assign({}, r.heldTx, { duplicateStatus: 'independent' }); store.put('transactions', t); pairTransfers(store); }
    else t = store.get('transactions', r.deletedId) || null;
    if (msg) { msg.status = t ? 'merged' : 'ignored'; msg.txId = t ? t.id : null; if (t) msg.userMerged = true; store.put('messages', msg); }
  } else {
    if (exists && r.heldTx) attachToDeleted(store, r.deletedId, r.heldTx, false);
    if (msg) { msg.status = 'ignored'; store.put('messages', msg); }
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
  (messageIds || []).forEach(id => {
    const m = store.get('messages', id); if (!m || !m.text) return;
    const live = m.txId && (m.status === 'tx' || m.status === 'merged') ? store.get('transactions', m.txId) : null;
    if (live && (live.sourceLinks || []).some(l => l && l.messageId === m.id)) return; // لها عملية قائمة: ما تنعاد معالجتها (عشان ما تتكرر)
    msgs.push({ id: m.id, text: m.text, sender: m.sender, receivedAt: m.receivedAt, source: m.source, ids: m.ids, userDate: m.userDate || null, sameContentOk: !!m.sameContentOk, forcedAccountId: m.forcedAccountId || null,
      suggestedCity: m.suggestedCity || null, citySource: m.citySource || null, cityCapturedAt: m.cityCapturedAt || null });
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
  store.all('reviews').filter(r => r.status === 'open' && ['sms_unparsed', 'sms_unknown', 'sms_partial', 'sms_new_bank', 'sms_new_bank_info'].includes(r.kind)).forEach(r => {
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
    if (mer) { tx.merchantId = mer.id; if (!tx.categoryId && tx.categorySource !== 'user_txn') applyMerchantCategory(tx, mer, null); markShopChoice(store, tx); }
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
    const hay = normAr([t.merchantRaw, t.beneficiaryRaw, m && m.name, m && m.userName, b && b.name, (t.sourceLinks || []).map(s => s.rawDescription).join(' ')].filter(Boolean).join(' '));
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
  if (th.merchantId && t.merchantId !== th.merchantId && !t.merchantLocked) { t.merchantId = th.merchantId; t.shopChoicePending = false; changed = true; } // «هذه المرة فقط» أقوى من القاعدة
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
  let PS = null; // حد «حسب المنتجات» (1.6.0): مصروفه = رقم المنتجات للتصنيف (أغراضه + غير المفصّل من فواتيره) في الفترة
  const pcSpent = (id) => { if (!Engine.productSpend) return 0; PS = PS || Engine.productSpend(store, period); const c = store.get('categories', id); return c && c.parentId ? ((PS.bySub.get(id) || {}).amount || 0) : ((PS.byCat.get(id) || {}).amount || 0); };
  return store.all('limits').filter(l => l.active !== false && Number(l.amount) > 0).map(l => {
    const spent = l.scope === 'total' ? R.spend : (l.scope === 'category' && l.basis === 'products') ? pcSpent(l.categoryId) : l.scope === 'productCategory' ? 0 : ((R.categories.find(c => c.categoryId === l.categoryId) || {}).amount || 0);
    const pct = spent / Number(l.amount) * 100;
    return Object.assign({}, l, { spent: round2(spent), remaining: round2(Number(l.amount) - spent), pct: Math.round(pct * 10) / 10, level: pct >= 100 ? 'over' : pct >= alertPct ? 'warn' : 'ok' });
  }).sort((a, b) => b.pct - a.pct);
}

/* ---------- 11و. إدارة التصنيفات (1.4.0) ----------
   التصنيف له ID ثابت، والعمليات والتجار والمستفيدون والقواعد والحدود مربوطة بالـID مو بالاسم، فتغيير الاسم ما يكسر شي.
   «رسوم» وفرعياتها و«تبرعات» محمية من الحذف لأن الحساب يستخدمها (فصل الرسوم، والتقريب لجهة خيرية). */
// 1.7.0: «رسوم» صار تصنيف عادي (يتعدل وينحذف)، لأن الرسوم ما عادت تنفصل عن عمليتها
const PROTECTED_CATS = new Set(['donations', 'cash']);
// تصنيف ما عاد موجود (انحذف) ما ينحط على عملية جديدة
function liveCat(store, cat, sub) {
  const c = cat ? store.get('categories', cat) : null;
  if (!c || c.active === false) return [null, null];
  const x = sub ? store.get('categories', sub) : null;
  return [cat, x && x.active !== false && x.parentId === cat ? sub : null];
}
function saveCategory(store, d) {
  const name = String(d.name || '').replace(/\s+/g, ' ').trim(); if (!name) return { error: 'name' };
  const parentId = d.parentId || null;
  if (parentId) { const p = store.get('categories', parentId); if (!p || p.parentId) return { error: 'parent' }; }
  let c = d.id ? store.get('categories', d.id) : null;
  if (store.all('categories').some(x => x.id !== (c && c.id) && (x.parentId || null) === parentId && x.active !== false && normAr(x.name) === normAr(name))) return { error: 'dup' };
  if (c) {
    const oldParent = c.parentId || null;
    if (oldParent !== parentId) {
      if (!oldParent || !parentId) return { error: 'level' }; // رئيسي ↔ فرعي ما يتغير بعد الإنشاء
      if (PROTECTED_CATS.has(c.id)) return { error: 'protected' };
      moveSubCategory(store, c.id, parentId);
    }
  } else {
    const sib = store.all('categories').filter(x => (x.parentId || null) === parentId);
    c = { id: uid(), order: sib.reduce((m, x) => Math.max(m, x.order || 0), -1) + 1, active: true, custom: true, createdAt: new Date().toISOString() };
  }
  const main = !parentId;
  // 1.7.0: كل الخصائص تبدأ «غير محدد» (null) وانت تحددها. الفرعي: null = يتبع الرئيسي
  const pick = (v, dflt) => v === undefined ? dflt : v, tri = (v) => v === true || v === false ? v : null;
  void main;
  Object.assign(c, { name, parentId, emoji: d.emoji || null, color: d.color || null,
    defaultRecurrenceType: pick(d.defaultRecurrenceType, c.defaultRecurrenceType === undefined ? null : c.defaultRecurrenceType),
    defaultNecessityType: pick(d.defaultNecessityType, c.defaultNecessityType === undefined ? null : c.defaultNecessityType),
    isCommitment: tri(pick(d.isCommitment, c.isCommitment)),
    savingsEligible: tri(pick(d.savingsEligible, c.savingsEligible)) });
  store.put('categories', c); store.touch();
  return { category: c };
}
// كل شي يشير لتصنيف (عمليات، تجار، مستفيدون، قواعد، عمليات معلّقة في المراجعة)
function forEachCatRef(store, fn) {
  store.all('transactions').forEach(t => { if (fn(t, 'categoryId', 'subcategoryId')) { t.updatedAt = new Date().toISOString(); store.put('transactions', t); } });
  store.all('merchants').forEach(m => { const a = fn(m, 'categoryId', 'subcategoryId'), b = fn(m, 'suggestedCategoryId', 'suggestedSubcategoryId'); if (a || b) store.put('merchants', m); });
  store.all('beneficiaries').forEach(b => { if (fn(b, 'categoryId', 'subcategoryId')) store.put('beneficiaries', b); });
  store.all('rules').forEach(r => { if (r.then && fn(r.then, 'categoryId', 'subcategoryId')) { if (!r.then.categoryId && !r.then.type && !r.then.merchantId) r.enabled = false; store.put('rules', r); } });
  store.all('reviews').forEach(r => { if (r.heldTx && fn(r.heldTx, 'categoryId', 'subcategoryId')) store.put('reviews', r); });
}
function moveSubCategory(store, subId, newParent) {
  forEachCatRef(store, (o, ck, sk) => { if (o[sk] !== subId || o[ck] === newParent) return false; o[ck] = newParent; return true; });
}
function categoryUsage(store, id) {
  const c = store.get('categories', id); if (!c) return null;
  const ids = new Set([id].concat(c.parentId ? [] : store.all('categories').filter(x => x.parentId === id).map(x => x.id)));
  const hit = (cat, sub) => c.parentId ? sub === id : ids.has(cat);
  return { ids: Array.from(ids), txs: store.all('transactions').filter(t => hit(t.categoryId, t.subcategoryId)).length,
    subs: ids.size - 1, limits: c.parentId ? 0 : store.all('limits').filter(l => l.scope === 'category' && l.categoryId === id).length };
}
// الحذف ما يحذف أي عملية. target = {cat, sub} للنقل، أو null:
//   رئيسي ← عملياته وكل المرتبط فيه «بدون تصنيف» وحدوده تنحذف. فرعي ← عملياته تبقى في الرئيسي
function deleteCategory(store, id, target) {
  const c = store.get('categories', id); if (!c) return null;
  if (PROTECTED_CATS.has(id)) return { error: 'protected' };
  const u = categoryUsage(store, id), ids = new Set(u.ids), isSub = !!c.parentId;
  if (target && (ids.has(target.cat) || ids.has(target.sub))) return { error: 'target' };
  if (target) { const [tc, ts] = liveCat(store, target.cat, target.sub); if (!tc) return { error: 'target' }; target = { cat: tc, sub: ts }; }
  let n = 0;
  forEachCatRef(store, (o, ck, sk) => {
    const cat = o[ck], sub = o[sk] || null;
    const affected = isSub ? sub === id : ids.has(cat);
    if (!affected) return false;
    if (target) { o[ck] = target.cat; o[sk] = target.sub || null; }
    else if (isSub) { o[sk] = null; }
    else {
      o[ck] = null; o[sk] = null;
      if (o.categorySource !== undefined) o.categorySource = null;
      if (o.transactionType === 'PersonTransfer') o.classificationStatus = 'temporary';
    }
    if (o.transactionType !== undefined && o.grossAmount !== undefined) n++;
    return true;
  });
  // 1.6.0: الأغراض والمنتجات (القائمة موحدة): تنتقل للهدف، أو لرئيسي الفرعي المحذوف، أو بدون تصنيف
  const itemTo = target ? (target.sub || target.cat) : (isSub ? c.parentId : null);
  ['transactions', 'deletedTxs'].forEach(n => store.all(n).forEach(t => { let ch = false; (t.items || []).forEach(i => { if (i.productCategoryId && ids.has(i.productCategoryId)) { i.productCategoryId = itemTo; if (!itemTo) i.catFollow = true; ch = true; } }); if (ch) store.put(n, t); })); // 1.7.0: ما له مكان = يتبع الفاتورة
  store.all('products').forEach(p => { let ch = false; ['productCategoryId', 'lastCategoryId'].forEach(k => { if (p[k] && ids.has(p[k])) { p[k] = itemTo; ch = true; } }); if (ch) store.put('products', p); });
  let limitsMoved = 0, limitsRemoved = 0;
  // حدود «حسب المنتجات»: نفس قاعدة 1.5.1 (ما يصير حدين لنفس التصنيف)
  store.all('limits').filter(l => l.scope === 'category' && l.basis === 'products' && ids.has(l.categoryId)).sort((a, b) => (a.active === false) - (b.active === false)).forEach(l => {
    const has = itemTo && store.all('limits').some(x => x.id !== l.id && x.scope === 'category' && x.basis === 'products' && x.categoryId === itemTo);
    if (itemTo && !has) { l.categoryId = itemTo; store.put('limits', l); limitsMoved++; store.all('alertStates').filter(a => String(a.id).startsWith('limit:' + l.id + ':')).forEach(a => store.remove('alertStates', a.id)); }
    else { store.remove('limits', l.id); limitsRemoved++; }
  });
  if (!isSub) store.all('limits').filter(l => l.scope === 'category' && l.basis !== 'products' && l.categoryId === id).forEach(l => {
    // نقل الحد للتصنيف الجديد، إلا إذا عليه حد من قبل (نبقي الموجود)
    if (target && !store.all('limits').some(x => x.id !== l.id && x.scope === 'category' && x.basis !== 'products' && x.categoryId === target.cat)) { l.categoryId = target.cat; store.put('limits', l); limitsMoved++; }
    else { store.remove('limits', l.id); limitsRemoved++; }
  });
  u.ids.forEach(x => store.remove('categories', x));
  { const s = store.settings; if ((s.placeCategories || []).some(x => ids.has(x))) { s.placeCategories = s.placeCategories.filter(x => !ids.has(x)); store.put('settings', s); } }
  store.touch();
  return { txs: n, subs: u.subs, limitsMoved, limitsRemoved };
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
      // نفس تنظيف تغيير النوع الفردي: روابط ما تناسب النوع الجديد تنشال (ما ينخصم شي مرتين)
      if (ch.type !== 'Refund') { delete t.refundOfId; t.refundItemAllocations = []; }
      if (ch.type !== 'CashWithdrawal') delete t.cashParts;
      if (ch.type !== 'CashDeposit') { t.cashReturnOfId = null; t.cashReturnPartId = null; }
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
// الحذف الجماعي: نفس الحذف الفردي (تنتقل لـ«المحذوفة» وترجع بزر)
function bulkDelete(store, txIds) {
  let n = 0;
  txIds.forEach(id => { if (deleteTx(store, id)) n++; });
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
// سلسلة الأولوية (1.5.0): التصنيف ← الفرعي ← التاجر أو المستفيد (نفس المستوى) ← العملية. أول قيمة محددة من الأدق تكسب.
// أربع مفاهيم مستقلة: التكرار (rec)، الضرورة (nec)، الالتزام (commit)، فرص التوفير (save).
// «متكرر مؤكد» (اعتمدته أنت) لنفس التاجر أو المستفيد والحساب يحدد التكرار والالتزام قبل إعداد التاجر.
const CHAIN = { rec: ['recurrenceType', 'defaultRecurrenceType'], nec: ['necessityType', 'defaultNecessityType'], commit: ['isCommitment', 'isCommitment'], save: ['savingsEligible', 'savingsEligible'] };
const has = (v) => v !== null && v !== undefined && v !== '';
// raw = true: يرجع null إذا ما تحدد في أي مستوى («غير محدد»). بدونه: الالتزام وفرص التوفير غير المحددة = لا
// 1.7.0: الالتزام ما عاد يمر بالمتكرر المؤكد: «التزام دائم» يتحدد على العملية أو الجهة أو الفرعي أو التصنيف
function effective(store, tx, field, raw) {
  const [tf, df] = CHAIN[field];
  if (has(tx[tf])) return tx[tf];
  if (field === 'rec') {
    const r = confirmedRecurringFor(store, tx);
    if (r) return 'recurring';
  }
  const m = tx.merchantId ? store.get('merchants', tx.merchantId) : null;
  if (m && has(m[df])) return m[df];
  const b = tx.beneficiaryId ? store.get('beneficiaries', tx.beneficiaryId) : null;
  if (b && has(b[df])) return b[df];
  return catChain(store, tx.categoryId, tx.subcategoryId, field, raw);
}
function catChain(store, catId, subId, field, raw) {
  const df = CHAIN[field][1];
  const sub = subId ? store.get('categories', subId) : null;
  if (sub && has(sub[df])) return sub[df];
  const cat = catId ? store.get('categories', catId) : null;
  if (!raw && (field === 'commit' || field === 'save')) return !!(cat && cat[df]);
  return cat && has(cat[df]) ? cat[df] : null;
}
function isCommitmentCat(store, tx) { return effective(store, tx, 'commit') === true; }
// 1.7.0: «الالتزامات الدائمة» = عمليات صرف معلّمة «التزام دائم» (بعد سلسلة الأولوية). ما يشترط تكرار.
// المتكرر اللي يكتشفه التطبيق اقتراح بس («تضيفه التزام دائم؟»)
const COMMIT_TYPES = new Set(['Payment', 'PersonTransfer', 'CashExpense']);
// معلّمة «التزام دائم» (بعد سلسلة الأولوية)، بغض النظر عن اعتماد مبلغها
function isCommitFlagged(store, tx) {
  if (!COMMIT_TYPES.has(tx.transactionType) || tx.direction !== 'out') return false;
  return effective(store, tx, 'commit') === true;
}
// 1.7.1: تنحسب التزام بس إذا جهتها (المحل أو المستفيد) جاوبت على «سؤال الاعتماد» (أو آخر 3 دفعات لها متساوية).
// الجهة اللي تنتظر جوابك ما تنحسب التزام، ومبالغها مع «غير محدد». العملية بدون جهة تنحسب مباشرة
function isKnownCommitment(store, tx) {
  if (!isCommitFlagged(store, tx)) return false;
  return typeof Engine.commitCounted === 'function' ? Engine.commitCounted(store, tx) : true;
}
function recurringIndex(store) {
  return store.cached('recIdx', () => { const m = new Map(); store.all('recurring').forEach(r => { if (r.status === 'confirmed') m.set(r.subjectType + ':' + r.subjectId + ':' + (r.accountId || ''), r); }); return m; });
}
// المتكرر المؤكد للعملية: نفس التاجر أو المستفيد، نفس الحساب، ومبلغها قريب من المعتاد (عشان شراء عارض من نفس التاجر ما يصير التزام)
function confirmedRecurringFor(store, tx) {
  if (tx.direction !== 'out' || (!tx.merchantId && !tx.beneficiaryId)) return null;
  const idx = recurringIndex(store); if (!idx.size) return null;
  const k = tx.merchantId ? 'merchant:' + tx.merchantId : 'beneficiary:' + tx.beneficiaryId;
  const r = idx.get(k + ':' + (tx.accountId || '')) || idx.get(k + ':'); if (!r) return null;
  const lo = Number(r.amountMin || r.expectedAmount || 0) * 0.7, hi = Number(r.amountMax || r.expectedAmount || 0) * 1.3;
  if (hi > 0 && (tx.principalAmount < lo - 0.004 || tx.principalAmount > hi + 0.004)) return null;
  return r;
}
function instrumentOf(store, tx) { return tx.instrumentId ? store.get('instruments', tx.instrumentId) : null; }
// مستثناة من الإنفاق: أداة استبعدتها من مصروفك، أو عملية اخترت «لا تحسبها في الصرف»
function isExcluded(store, tx) {
  if (tx.excludedByUser) return true;
  const i = instrumentOf(store, tx); if (i && i.includeInPersonalSpend === false) return true;
  // استرداد لشراء مستبعد: ما ينخصم، لأن الشراء نفسه ما انحسب
  if (tx.transactionType === 'Refund' && tx.refundOfId) {
    const p = store.get('transactions', tx.refundOfId);
    if (p && p.transactionType !== 'Refund' && isExcluded(store, p)) return true;
    if (!p && store.get('deletedTxs', tx.refundOfId)) return true; // الشراء محذوف: الاسترداد ما ينخصم لين ترجعه أو تفك الربط
  }
  return false;
}
const txDate = (t) => t.transactionDate || t.postingDate;
const inPeriod = (t, p) => { const d = txDate(t); return d >= p.start && d <= p.end; };

// أثر العملية على الإنفاق (الأصل) — الرسوم تُحسب منفصلة.
// 1.4.1: أي فلوس طالعة صرف (شراء، تحويل لشخص، سحب نقدي، عملية ما عُرف نوعها، تقريب وجهته غير محددة)،
// ما عدا التحويل بين حساباتك وسداد البطاقة والسلفة لشخص.
function spendEffect(tx) {
  switch (tx.transactionType) {
    case 'Payment': case 'CashExpense': case 'PersonTransfer': case 'CashWithdrawal': return tx.principalAmount;
    case 'Refund': return -tx.principalAmount;
    case 'Unknown': return tx.direction === 'out' ? tx.grossAmount : 0;
    case 'InternalTransfer': return tx.transferSubtype === 'round_up' && tx.classificationStatus === 'unclassified' ? tx.grossAmount : 0;
    default: return 0;
  }
}
const feeOf = (tx) => tx.transactionType === 'Unknown' ? 0 : round2((tx.feeAmount || 0) + (tx.vatAmount || 0));
// الاسترداد المربوط بشرائه ينحسب على تاريخ الشراء وتصنيفه (كأن الشراء انلغى أو نقص)
function spendAnchor(store, tx) {
  if (tx.transactionType === 'Refund' && tx.refundOfId) { const p = store.get('transactions', tx.refundOfId); if (p) return p; }
  return tx;
}
const spendDate = (store, tx) => txDate(spendAnchor(store, tx));
const inSpendPeriod = (store, t, p) => { const d = spendDate(store, t); return d >= p.start && d <= p.end; };
const cashPartsOf = (tx) => (tx.cashParts || []).filter(p => Number(p.amount) > 0);
// 1.5.0: المبلغ اللي رجع من السحب للحساب (إيداع مربوط بالسحب) يقلل أثر السحب نفسه على تاريخه، مرة وحدة، وما يخليه سالب
function cashReturnIndex(store) {
  return store.cached('cashRet', () => {
    const m = new Map();
    store.all('transactions').forEach(t => {
      if (!t.cashReturnOfId || t.transactionType !== 'CashDeposit' || isExcluded(store, t)) return;
      const e = m.get(t.cashReturnOfId) || { total: 0, noPart: 0, byPart: new Map(), ids: [] };
      e.total = round2(e.total + t.principalAmount); e.ids.push(t.id);
      if (t.cashReturnPartId) e.byPart.set(t.cashReturnPartId, round2((e.byPart.get(t.cashReturnPartId) || 0) + t.principalAmount));
      else e.noPart = round2(e.noPart + t.principalAmount);
      m.set(t.cashReturnOfId, e);
    });
    return m;
  });
}
function withdrawalReturns(store, w) {
  const e = store && w ? cashReturnIndex(store).get(w.id) : null;
  if (!e) return { total: 0, noPart: 0, byPart: new Map(), ids: [] };
  const parts = new Set(cashPartsOf(w).map(p => p.id));
  let noPart = e.noPart; const byPart = new Map();
  e.byPart.forEach((v, k) => { if (parts.has(k)) byPart.set(k, v); else noPart = round2(noPart + v); }); // جزء انحذف: يرجع للباقي
  return { total: e.total, noPart, byPart, ids: e.ids.slice() };
}
function netWithdrawal(store, w) { return round2(Math.max(0, w.principalAmount - withdrawalReturns(store, w).total)); }
// الباقي من السحب بدون تصنيف جزء = الأصل − الأجزاء − المعاد للبنك من الباقي
function cashRemaining(tx, store) { return round2(tx.principalAmount - cashPartsOf(tx).reduce((s, p) => s + Number(p.amount), 0) - (store ? withdrawalReturns(store, tx).noPart : 0)); }
// توزيع الأصل على التصنيفات: السحب النقدي يتوزع على أجزائه والباقي تحت تصنيفه («سحب نقدي» افتراضيًا)
function effParts(store, tx) {
  const eff = spendEffect(tx); if (!eff) return [];
  if (tx.transactionType === 'CashWithdrawal') {
    // الأجزاء ما تتجاوز صافي السحب (لو نقص الأصل بعدين مثلًا لما فصل الكشف الرسوم، أو رجع منه مبلغ للبنك، آخر الأجزاء ينقص)
    const R = withdrawalReturns(store, tx);
    let left = round2(Math.max(0, eff - R.total)); const out = [];
    cashPartsOf(tx).forEach(p => { const pe = round2(Math.max(0, Number(p.amount) - (R.byPart.get(p.id) || 0))); const a = round2(Math.min(pe, left)); if (a > 0.004) { out.push({ cat: p.categoryId || '__none', sub: p.subcategoryId || null, amt: a, partId: p.id }); left = round2(left - a); } });
    if (left > 0.004) out.push({ cat: tx.categoryId || 'cash', sub: tx.categoryId ? (tx.subcategoryId || null) : null, amt: left });
    return out;
  }
  if (tx.transferSubtype === 'round_up' && tx.transactionType === 'InternalTransfer') return [{ cat: '__roundup', sub: null, amt: eff }]; // تقريب وجهته غير محددة: بند لحاله، يتحدد من «وجهة التقريب»
  const a = spendAnchor(store, tx);
  const cat = a.transactionType === 'PersonTransfer' && !a.categoryId ? '__person' : (a.categoryId || '__none');
  return [{ cat, sub: a.subcategoryId || null, amt: eff }];
}
function cardKey(tx) { return tx.instrumentId || ('acc:' + (tx.accountId || '')); }

function computePeriod(store, period) {
  const all = store.all('transactions');
  const txs = all.filter(t => inPeriod(t, period));
  const spendTxs = all.filter(t => inSpendPeriod(store, t, period));
  const r = { period, income: 0, incomeItems: [], spend: 0, temporarySpend: 0, temporaryCount: 0, unownedSpend: 0, unownedCount: 0, surplus: 0,
    unclassifiedOut: 0, unclassifiedOutCount: 0, roundUpUnknown: 0, roundUpUnknownCount: 0, unclassifiedIn: 0, unclassifiedInCount: 0,
    internal: 0, internalCount: 0, internalOneSided: 0, cardPayments: 0, cardPaymentsCount: 0, cardPaymentsUnmatched: 0, cardPaymentsUnknownCard: 0,
    commitments: 0, commitmentItems: [], fees: 0, byCategory: new Map(), byCard: new Map(), merchants: new Map(), topTx: [], excludedSpend: 0, excludedCount: 0,
    cashWithdrawals: 0, cashWithdrawalsCount: 0, refunds: 0, txCount: txs.length };
  const addCat = (cat, sub, amt, tx) => {
    const key = cat || '__none';
    if (!r.byCategory.has(key)) r.byCategory.set(key, { categoryId: cat === '__none' ? null : cat, amount: 0, count: 0, subs: new Map(), txIds: [] });
    const c = r.byCategory.get(key); c.amount = round2(c.amount + amt); if (!c.txIds.includes(tx.id)) { c.count++; c.txIds.push(tx.id); }
    const sk = sub || '__none'; c.subs.set(sk, round2((c.subs.get(sk) || 0) + amt));
  };
  const addCard = (tx, cat, amt) => {
    const k = cardKey(tx);
    if (!r.byCard.has(k)) r.byCard.set(k, { key: k, instrumentId: tx.instrumentId || null, accountId: tx.accountId || null, amount: 0, count: 0, cats: new Map(), txIds: [] });
    const c = r.byCard.get(k); c.amount = round2(c.amount + amt); if (!c.txIds.includes(tx.id)) { c.count++; c.txIds.push(tx.id); }
    const ck = cat || '__none'; c.cats.set(ck, round2((c.cats.get(ck) || 0) + amt));
  };
  spendTxs.forEach(tx => {
    const parts = effParts(store, tx), eff = round2(parts.reduce((s, p) => s + p.amt, 0)), fee = feeOf(tx);
    if (eff === 0 && !fee) return;
    if (isExcluded(store, tx)) { r.excludedSpend = round2(r.excludedSpend + eff + fee); r.excludedCount++; return; }
    const ins = instrumentOf(store, tx);
    if (eff !== 0) {
      r.spend = round2(r.spend + eff);
      parts.forEach(p => { addCat(p.cat, p.sub, p.amt, tx); addCard(tx, p.cat, p.amt); });
      if (tx.transactionType === 'Refund') r.refunds = round2(r.refunds + tx.principalAmount);
      if (tx.transactionType === 'PersonTransfer' && tx.classificationStatus === 'temporary') { r.temporarySpend = round2(r.temporarySpend + eff); r.temporaryCount++; }
      if (ins && ins.instrumentOwner === 'unknown') { r.unownedSpend = round2(r.unownedSpend + eff + fee); r.unownedCount++; }
      if (eff > 0 && isKnownCommitment(store, tx)) { r.commitments = round2(r.commitments + eff + fee); r.commitmentItems.push(tx.id); }
      if ((tx.transactionType === 'Payment' || tx.transactionType === 'CashExpense') && tx.merchantId) {
        const m = r.merchants.get(tx.merchantId) || { merchantId: tx.merchantId, amount: 0, count: 0 };
        m.amount = round2(m.amount + eff + fee); m.count++; r.merchants.set(tx.merchantId, m);
      }
      if (eff > 0) r.topTx.push({ id: tx.id, amount: round2(eff + fee) });
      if (tx.transactionType === 'CashWithdrawal') { r.cashWithdrawals = round2(r.cashWithdrawals + eff); r.cashWithdrawalsCount++; }
      if (tx.transactionType === 'Unknown' && tx.direction === 'out') { r.unclassifiedOut = round2(r.unclassifiedOut + tx.grossAmount); r.unclassifiedOutCount++; }
      if (tx.transferSubtype === 'round_up' && tx.classificationStatus === 'unclassified') { r.unclassifiedOut = round2(r.unclassifiedOut + tx.grossAmount); r.unclassifiedOutCount++; r.roundUpUnknown = round2(r.roundUpUnknown + tx.grossAmount); r.roundUpUnknownCount++; }
    }
    // 1.7.0: الرسوم على تصنيف العملية نفسها. r.fees للمعلومة بس («دفعت رسوم X في الفترة»)
    if (fee) { r.spend = round2(r.spend + fee); r.fees = round2(r.fees + fee); (r.feeTxIds || (r.feeTxIds = [])).push(tx.id); const fc = feeCatOf(store, tx); addCat(fc.cat, fc.sub, fee, tx); addCard(tx, fc.cat, fee); }
  });
  txs.forEach(tx => {
    switch (tx.transactionType) {
      case 'Income': if (tx.classificationStatus === 'confirmed') { r.income = round2(r.income + tx.principalAmount); r.incomeItems.push(tx.id); } break;
      case 'Unknown': if (tx.direction !== 'out') { r.unclassifiedIn = round2(r.unclassifiedIn + tx.grossAmount); r.unclassifiedInCount++; } break;
      case 'InternalTransfer':
        if (tx.transferSubtype === 'round_up' && tx.classificationStatus === 'unclassified') break;
        if (tx.transferLinkStatus === 'linked') { if (tx.direction === 'out') { r.internal = round2(r.internal + tx.principalAmount); r.internalCount++; } }
        else { r.internal = round2(r.internal + tx.principalAmount); r.internalCount++; r.internalOneSided++; }
        break;
      case 'CreditCardPayment':
        if (tx.transferLinkStatus === 'linked') { if (tx.direction === 'out') { r.cardPayments = round2(r.cardPayments + tx.principalAmount); r.cardPaymentsCount++; } }
        else { r.cardPayments = round2(r.cardPayments + tx.principalAmount); r.cardPaymentsCount++; r.cardPaymentsUnmatched++; if (tx.direction === 'out' && !tx.targetCardLast4) r.cardPaymentsUnknownCard++; }
        break;
    }
  });
  r.surplus = round2(r.income - r.spend);
  r.categories = Array.from(r.byCategory.values()).sort((a, b) => b.amount - a.amount).map(c => Object.assign(c, { subs: Array.from(c.subs.entries()).map(([k, v]) => ({ subcategoryId: k === '__none' ? null : k, amount: v })).sort((a, b) => b.amount - a.amount) }));
  r.cards = Array.from(r.byCard.values()).sort((a, b) => b.amount - a.amount).map(c => Object.assign(c, { cats: Array.from(c.cats.entries()).map(([k, v]) => ({ categoryId: k === '__none' ? null : k, amount: v })).sort((a, b) => b.amount - a.amount) }));
  r.topMerchants = Array.from(r.merchants.values()).sort((a, b) => b.amount - a.amount);
  r.topTx.sort((a, b) => b.amount - a.amount); r.topTx = r.topTx.slice(0, 15);
  r.coverage = coverageFor(store, period);
  r.bridge = auditBridge(store, period, txs, r);
  return r;
}

// أجزاء أثر العملية على الإنفاق الحقيقي، بنفس توزيع computePeriod على التصنيفات
// 1.7.0: الرسوم تنحسب مع العملية على تصنيفها (ما تنفصل لـ«رسوم»). السحب النقدي المقسّم: أجزاؤه على الصافي، ورسومه على تصنيف السحب نفسه
function spendParts(store, tx) {
  if (isExcluded(store, tx)) return [];
  const fee = feeOf(tx), out = effParts(store, tx).map(p => p.partId ? { cat: p.cat, sub: p.sub, amt: p.amt, partId: p.partId } : { cat: p.cat, sub: p.sub, amt: p.amt });
  if (fee) {
    const fc = feeCatOf(store, tx), same = out.find(p => !p.partId && p.cat === fc.cat && (p.sub || null) === (fc.sub || null));
    if (same) same.amt = round2(same.amt + fee); else out.push({ cat: fc.cat, sub: fc.sub, amt: fee, fee: true });
  }
  return out;
}
// تصنيف رسوم العملية = تصنيفها هي (السحب: تصنيف السحب، «سحب نقدي» افتراضيًا). عملية رسومها بس وما لها تصنيف = «بدون تصنيف» (ويطلع اقتراح «رسوم»)
function feeCatOf(store, tx) {
  if (tx.transactionType === 'CashWithdrawal') return { cat: tx.categoryId || 'cash', sub: tx.categoryId ? (tx.subcategoryId || null) : null };
  if (tx.transferSubtype === 'round_up' && tx.transactionType === 'InternalTransfer' && tx.classificationStatus === 'unclassified') return { cat: '__roundup', sub: null };
  const a = spendAnchor(store, tx);
  if (a.transactionType === 'PersonTransfer' && !a.categoryId) return { cat: '__person', sub: null };
  return { cat: a.categoryId || '__none', sub: a.categoryId ? (a.subcategoryId || null) : null };
}
// 1.7.0: عملية رسومها بس (الأصل صفر) أو اسمها «رسوم»، وما لها تصنيف: نقترح «رسوم» بدون ما نصنفها
function feeSuggestion(store, tx) {
  if (tx.categoryId || isExcluded(store, tx)) return null;
  const feeOnly = feeOf(tx) > 0 && spendEffect(tx) === 0;
  const named = (tx.transactionType === 'Payment' || (tx.transactionType === 'Unknown' && tx.direction === 'out')) && /رسوم|\bFEES?\b|\bCHARGES?\b/i.test(String(tx.merchantRaw || ''));
  if (!feeOnly && !named) return null;
  const c = store.get('categories', 'fees'); return c && c.active !== false ? c.id : null;
}
function spendIn(store, range) {
  let s = 0, n = 0;
  store.all('transactions').forEach(t => { if (inPeriod(t, range)) n++; if (!inSpendPeriod(store, t, range)) return; spendParts(store, t).forEach(p => { s += p.amt; }); });
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
    if (!inSpendPeriod(store, t, period)) return;
    const d = spendDate(store, t), b = idx.get(bucket === 'month' ? d.slice(0, 7) : d); if (!b) return;
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

// معادلة التدقيق: للتفسير فقط. تمشي على نفس قواعد الإنفاق: أي خارج صرف ما عدا التحويل الداخلي وسداد البطاقة والسلفة والمستثنى
function auditBridge(store, period, txs, r) {
  const acctType = (id) => { const a = store.get('accounts', id); return a ? a.type : 'unknown'; };
  const isBank = (t) => !['credit_card', 'cash'].includes(acctType(t.accountId));
  const b = { bankOut: 0, internalOut: 0, cardPayOut: 0, loansOut: 0, excludedOut: 0, direct: 0, cardPurchases: 0, cashExpense: 0, refunds: 0, refundsOwnDate: 0, cashReturns: 0, total: 0, computed: r.spend, diff: 0 };
  const isRU = (t) => t.transferSubtype === 'round_up' && t.classificationStatus === 'unclassified';
  txs.forEach(t => {
    const ex = isExcluded(store, t);
    if (t.transactionType === 'Refund' && !ex) b.refundsOwnDate += t.principalAmount;
    if (isBank(t) && t.direction === 'out') {
      b.bankOut += t.grossAmount;
      if (t.transactionType === 'InternalTransfer' && !isRU(t)) b.internalOut += ex ? t.grossAmount : t.principalAmount;
      else if (t.transactionType === 'CreditCardPayment') b.cardPayOut += ex ? t.grossAmount : t.principalAmount;
      else if (t.transactionType === 'LoanToPerson') b.loansOut += ex ? t.grossAmount : t.principalAmount;
      else if (ex) b.excludedOut += t.grossAmount;
      return;
    }
    if (t.direction !== 'out' || ex) return;
    if (!(spendEffect(t) > 0 || feeOf(t) > 0)) return;
    if (acctType(t.accountId) === 'credit_card') b.cardPurchases += t.grossAmount;
    else if (acctType(t.accountId) === 'cash') b.cashExpense += t.grossAmount;
  });
  // الاستردادات على تاريخ شرائها إذا انربطت به
  store.all('transactions').forEach(t => { if (t.transactionType === 'Refund' && !isExcluded(store, t) && inSpendPeriod(store, t, period)) b.refunds += t.principalAmount; });
  // 1.5.0: المبالغ اللي رجعت من السحوبات للبنك، على تاريخ السحب نفسه
  txs.forEach(t => { if (t.transactionType === 'CashWithdrawal' && !isExcluded(store, t)) b.cashReturns += t.principalAmount - netWithdrawal(store, t); });
  Object.keys(b).forEach(k => { if (typeof b[k] === 'number') b[k] = round2(b[k]); });
  b.direct = round2(b.bankOut - b.internalOut - b.cardPayOut - b.loansOut - b.excludedOut);
  b.total = round2(b.direct + b.cardPurchases + b.cashExpense - b.refunds - b.cashReturns);
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
    // السحب يزيد النقد، والأجزاء اللي وضحت وش صرفت فيها من السحب تنقصه
    // والمبلغ اللي رجع للبنك من باقي السحب ينقصه بعد (1.5.0)
    // سحب بأداة مو لك (مالكها شخص ثاني وما تدخل مصروفك) ما يزيد نقدك. «لا تحسبها في الصرف» ما تأثر هنا (نفس 1.4.1)
    if (t.transactionType === 'CashWithdrawal' && t.accountId !== cashId && !((instrumentOf(store, t) || {}).includeInPersonalSpend === false)) bal += Math.max(0, cashRemaining(t, store));
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
  if (e.date && e.date > todayISO()) return { error: 'future' }; // 1.7.0: التاريخ في المستقبل ما ينقبل
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
  store.put('transactions', tx); sweepPeriods(store); store.touch();
  return { tx, possibleDuplicates: dups.auto.concat(dups.review) };
}
function mergeInto(store, keepId, dropId) {
  const keep = store.get('transactions', keepId), drop = store.get('transactions', dropId);
  if (!keep || !drop) return;
  keep.sourceLinks = (keep.sourceLinks || []).concat(drop.sourceLinks || []);
  if (!keep.note && drop.note) keep.note = drop.note;
  if (!keep.categoryId && drop.categoryId) { keep.categoryId = drop.categoryId; keep.subcategoryId = drop.subcategoryId; keep.categorySource = drop.categorySource; }
  carry150(keep, drop); carryShop(keep, drop);
  keep.duplicateStatus = 'confirmed'; keep.updatedAt = new Date().toISOString();
  store.put('transactions', keep); store.remove('transactions', dropId); remapTxRefs(store, dropId, keep.id); store.touch();
}
// حقول 1.5.0 اللي تمثل قراراتك: تنتقل للعملية الباقية عند الدمج إذا ما عندها قيمة (المدينة المعتمدة ما تُستبدل أبدًا)
const USER150 = ['items', 'cityId', 'suggestedCityId', 'suggestedCityRaw', 'citySuggestionSource', 'citySuggestedAt', 'cityDismissed', 'groupIds', 'isCommitment', 'savingsEligible', 'cashReturnOfId', 'cashReturnPartId', 'refundItemAllocations'];
const empty150 = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
function carry150(keep, drop) {
  if (!keep || !drop) return;
  USER150.forEach(k => { if (empty150(keep[k]) && !empty150(drop[k])) keep[k] = JSON.parse(JSON.stringify(drop[k])); });
}
// عملية انحذفت بالدمج: الاستردادات والمبالغ المعادة المربوطة فيها تنتقل للباقية
function remapTxRefs(store, fromId, toId) {
  store.all('transactions').forEach(t => {
    let ch = false;
    if (t.refundOfId === fromId) { t.refundOfId = toId; ch = true; }
    if (t.cashReturnOfId === fromId) { t.cashReturnOfId = toId; ch = true; }
    if (ch) store.put('transactions', t);
  });
  const s = store.settings, plans = s.commitPlans || {}; let pch = false;
  Object.keys(plans).forEach(k => {
    const p = plans[k]; if (!p) return;
    if (p.ackTxId === fromId) { p.ackTxId = toId; pch = true; }
    if (p.marks && p.marks[fromId]) { if (!p.marks[toId]) p.marks[toId] = p.marks[fromId]; delete p.marks[fromId]; pch = true; }
    Object.values(p.multi || {}).forEach(x => { if (x && Array.isArray(x.ids) && x.ids.includes(fromId)) { x.ids = x.ids.map(i => i === fromId ? toId : i); pch = true; } });
  });
  if (pch) store.put('settings', s);
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
  pairTransfers(store); sweepPeriods(store); store.touch();
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
  if (n) { pairTransfers(store); sweepPeriods(store); store.touch(); }
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
  if (type !== 'CreditCardPayment') delete t.cardPaymentByUser;
  if (type !== 'Refund') { delete t.refundOfId; t.refundItemAllocations = []; }
  if (type !== 'CashWithdrawal') delete t.cashParts;
  if (type !== 'CashDeposit') { t.cashReturnOfId = null; t.cashReturnPartId = null; }
  t.typeSource = 'user'; t.updatedAt = new Date().toISOString();
  store.put('transactions', t); pairTransfers(store); sweepPeriods(store); store.touch();
}

/* ---------- 15ب. الاستبعاد والحذف (1.4.1) ----------
   «لا تحسبها في الصرف»: العملية تبقى ظاهرة بعلامة وما تدخل أي رقم إنفاق.
   الحذف: تنتقل لـ«المحذوفة» (ما تظهر ولا تنحسب)، وترجع بزر. لو جات نفس العملية من كشف أو رسالة، يسألك قبل ما يرجعها. */
function setExcluded(store, txId, on) {
  const t = store.get('transactions', txId); if (!t) return null;
  if (on) t.excludedByUser = true; else delete t.excludedByUser;
  t.updatedAt = new Date().toISOString(); store.put('transactions', t); store.touch(); return t;
}
function deleteTx(store, txId) {
  const t = store.get('transactions', txId); if (!t) return null;
  const d = Object.assign({}, t, { deletedAt: new Date().toISOString() });
  store.put('deletedTxs', d); store.remove('transactions', txId);
  refreshProductsOf(store, t);
  store.all('messages').filter(m => m.txId === txId).forEach(m => { m.status = 'deleted'; m.deletedTxId = txId; m.txId = null; store.put('messages', m); });
  store.all('reviews').filter(r => r.status === 'open' && r.txId === txId).forEach(r => closeReview(store, r, 'tx_deleted'));
  pairTransfers(store); store.touch(); return d;
}
function restoreTx(store, txId) {
  const d = store.get('deletedTxs', txId); if (!d) return null;
  const t = Object.assign({}, d); delete t.deletedAt; t.updatedAt = new Date().toISOString(); normTx150(t);
  store.put('transactions', t); store.remove('deletedTxs', txId);
  refreshProductsOf(store, t);
  store.all('messages').filter(m => m.deletedTxId === txId).forEach(m => { m.status = 'tx'; m.txId = txId; delete m.deletedTxId; store.put('messages', m); });
  pairTransfers(store); sweepPeriods(store); store.touch(); return store.get('transactions', txId) || t;
}
// عملية جديدة تطابق عملية محذوفة: نفس قواعد منع التكرار (دليل حاسم أو 90+)
function findDeletedMatches(store, newTxs, alias, opts) {
  const pool = store.all('deletedTxs').filter(b => !(opts && opts.sms && hasSmsSource(b))), out = new Map(); if (!pool.length) return out;
  const byAmt = new Map();
  pool.forEach(b => { const k = cents(b.grossAmount); if (!byAmt.has(k)) byAmt.set(k, []); byAmt.get(k).push(b); });
  const pairs = [];
  newTxs.forEach(a => (byAmt.get(cents(a.grossAmount)) || []).forEach(b => {
    const r = scorePair(store, a, b, null, alias); if (!r || (r.score < 65 && !r.cardException)) return;
    pairs.push({ newId: a.id, existingId: b.id, score: r.score, decisive: r.decisive || null, cardException: !!r.cardException, manual: !!r.manual });
  }));
  // نفس قرار الدمج التلقائي بالضبط (دليل حاسم، 90+، أو استثناء كشف البطاقة بدون منافس)
  resolvePairs(pairs).auto.forEach(p => out.set(p.newId, { deletedId: p.existingId, score: p.decisive ? 100 : p.score }));
  return out;
}
// ضم مصادر عملية جديدة لعملية محذوفة: ترجع المحذوفة (قرار المستخدم «رجّعها»)، أو تبقى محذوفة ويُحفظ المصدر معها
function attachToDeleted(store, deletedId, tx, restore) {
  const d = store.get('deletedTxs', deletedId); if (!d) return null;
  d.sourceLinks = (d.sourceLinks || []).concat(tx.sourceLinks || []);
  ['balanceAfter', 'postingDate', 'time', 'reference', 'instrumentId', 'merchantRaw'].forEach(k => { if (d[k] == null && tx[k] != null) d[k] = tx[k]; });
  carry150(d, tx);
  store.put('deletedTxs', d);
  return restore ? restoreTx(store, deletedId) : d;
}

/* ---------- 15ج. ربط الاسترداد بشرائه ----------
   المقترح: نفس التاجر (نفس السجل بالضبط)، بتاريخ قبل الاسترداد أو في يومه، ومبلغه مساوي أو أكبر.
   المربوط ينحسب على تاريخ الشراء وتصنيفه. الشراء المستبعد أو المسترجع كامل يطلع عليه تنبيه. */
function refundIndex(store) {
  const m = new Map();
  store.all('transactions').forEach(t => { if (t.transactionType === 'Refund' && t.refundOfId) m.set(t.refundOfId, round2((m.get(t.refundOfId) || 0) + t.principalAmount)); });
  return m;
}
function refundedOf(store, purchaseId, exceptId) {
  return round2(store.all('transactions').filter(t => t.transactionType === 'Refund' && t.refundOfId === purchaseId && t.id !== exceptId).reduce((s, t) => s + t.principalAmount, 0));
}
function refundCandidates(store, refundId) {
  const r = store.get('transactions', refundId); if (!r || r.transactionType !== 'Refund' || !r.merchantId) return [];
  const d = txDate(r);
  return store.all('transactions').filter(t => t.id !== r.id && t.transactionType === 'Payment' && t.merchantId === r.merchantId && txDate(t) <= d && cents(t.principalAmount) >= cents(r.principalAmount))
    .map(t => { const done = refundedOf(store, t.id, r.id); return { id: t.id, date: txDate(t), amount: t.principalAmount, refunded: done, full: done >= t.principalAmount - 0.004, excluded: isExcluded(store, t) }; })
    // نفس المبلغ بالضبط أول (الاسترداد الكامل)، بعدين غير المسترجع، بعدين الأحدث
    .map(c => Object.assign(c, { exact: cents(c.amount) === cents(r.principalAmount) }))
    .sort((a, b) => (b.exact - a.exact) || ((a.full || a.excluded) - (b.full || b.excluded)) || b.date.localeCompare(a.date)).slice(0, 8);
}
function linkRefund(store, refundId, purchaseId) {
  const r = store.get('transactions', refundId), p = store.get('transactions', purchaseId);
  if (!r || !p || r.transactionType !== 'Refund' || p.transactionType !== 'Payment') return null;
  const before = refundedOf(store, p.id, r.id);
  if (r.refundOfId !== p.id) r.refundItemAllocations = [];
  r.refundOfId = p.id; r.updatedAt = new Date().toISOString(); store.put('transactions', r); store.touch();
  const total = round2(before + r.principalAmount);
  return { alreadyFull: before >= p.principalAmount - 0.004, over: total > p.principalAmount + 0.004, full: total >= p.principalAmount - 0.004, refunded: total, purchase: p.principalAmount };
}
function unlinkRefund(store, refundId) {
  const r = store.get('transactions', refundId); if (!r || !r.refundOfId) return null;
  delete r.refundOfId; r.refundItemAllocations = []; r.updatedAt = new Date().toISOString(); store.put('transactions', r); store.touch(); return r;
}

/* ---------- 15د. السحب النقدي: وش سويت فيه ----------
   السحب صرف مباشر تحت «سحب نقدي». تقسمه أجزاء بتصنيفاتها (المجموع ما يتغير)، والباقي يبقى تحت تصنيف السحب.
   المصروف النقدي اليدوي اللي من سحب يصير جزء منه، مو عملية زيادة. */
function addCashPart(store, withdrawalId, part) {
  const w = store.get('transactions', withdrawalId); if (!w || w.transactionType !== 'CashWithdrawal') return { error: 'not_withdrawal' };
  const amt = round2(Math.abs(Number(part.amount) || 0)); if (!amt) return { error: 'amount' };
  const rem = cashRemaining(w, store); if (amt > rem + 0.004) return { error: 'over', remaining: rem };
  const now = new Date().toISOString();
  const p = { id: uid(), amount: amt, categoryId: part.categoryId || null, subcategoryId: part.categoryId ? (part.subcategoryId || null) : null, note: String(part.note || '').slice(0, 120), date: part.date || null, createdAt: now };
  w.cashParts = (w.cashParts || []).concat(p); w.updatedAt = now; store.put('transactions', w); store.touch();
  return { part: p, remaining: cashRemaining(w, store) };
}
function removeCashPart(store, withdrawalId, partId) {
  const w = store.get('transactions', withdrawalId); if (!w) return null;
  w.cashParts = (w.cashParts || []).filter(p => p.id !== partId);
  (w.items || []).forEach(i => { if (i.partId === partId) i.partId = null; }); // أغراض الجزء ترجع للباقي
  w.updatedAt = new Date().toISOString(); store.put('transactions', w); store.touch(); return w;
}
function recentWithdrawals(store, today, days) {
  today = today || todayISO(); const from = addDays(today, -(days || 90));
  return store.all('transactions').filter(t => t.transactionType === 'CashWithdrawal' && !isExcluded(store, t) && txDate(t) >= from && txDate(t) <= today && cashRemaining(t, store) > 0.004)
    .sort((a, b) => (txDate(b) + (b.time || '')).localeCompare(txDate(a) + (a.time || '')))
    .map(t => ({ id: t.id, date: txDate(t), amount: t.principalAmount, remaining: cashRemaining(t, store) }));
}
// مصروف نقدي يدوي مسجل قبل ← جزء من سحب (بدون ما يزيد المجموع)
function cashExpenseToPart(store, txId, withdrawalId) {
  const t = store.get('transactions', txId); if (!t || t.transactionType !== 'CashExpense') return { error: 'not_cash' };
  if (!(t.sourceLinks || []).every(sl => sl.sourceType === 'manual' || sl.sourceType === 'cash_reconciliation')) return { error: 'not_manual' };
  const r = addCashPart(store, withdrawalId, { amount: t.grossAmount, categoryId: t.categoryId, subcategoryId: t.subcategoryId, note: [t.merchantRaw, t.note].filter(Boolean).join(' — '), date: txDate(t) });
  if (r.error) return r;
  store.remove('transactions', t.id); store.touch(); return r;
}

/* ---------- 15هـ. نوع التحويل الطالع: صرف / بين حساباتي / سداد بطاقة ----------
   إذا للتحويل رقم حساب معروف (مستفيد)، الاختيار ينحفظ على رقم الحساب ويتطبق على كل تحويلاته السابقة والقادمة
   (ما عدا اللي غيرت نوعها بنفسك لعملية وحدة). بدون رقم حساب: لهذي العملية بس. */
function transferKindOf(t) {
  if (t.transactionType === 'InternalTransfer' && t.transferSubtype !== 'round_up') return 'mine';
  if (t.transactionType === 'CreditCardPayment') return 'card';
  if (t.transactionType === 'PersonTransfer' || (t.transactionType === 'Unknown' && t.direction === 'out')) return 'spend';
  return null;
}
function setTransferKind(store, txId, kind) {
  const t = store.get('transactions', txId); if (!t || !['spend', 'mine', 'card'].includes(kind)) return 0;
  const b = t.beneficiaryId ? store.get('beneficiaries', t.beneficiaryId) : null;
  const cards = store.all('accounts').filter(a => a.type === 'credit_card');
  if (!b) {
    setType(store, t.id, kind === 'mine' ? 'InternalTransfer' : kind === 'card' ? 'CreditCardPayment' : 'PersonTransfer', { targetCardLast4: cards.length === 1 ? cards[0].last4 : null });
    const t2 = store.get('transactions', t.id); if (kind === 'card') { t2.cardPaymentByUser = true; store.put('transactions', t2); }
    return 1;
  }
  b.defaultTransferType = kind === 'card' ? 'card_payment' : null;
  b.isMyAccount = kind === 'mine';
  if (b.isMyAccount && !b.linkedAccountId) {
    const own = store.all('accounts').find(a => (b.accountFingerprint && a.accountFingerprint === b.accountFingerprint) || (b.numFingerprint && a.numFingerprint === b.numFingerprint))
      || store.put('accounts', { id: uid(), bank: b.bank, name: 'حساب ' + (b.bank || '') + ' …' + (b.accountLast4 || ''), type: 'unknown', last4: b.accountLast4, accountFingerprint: b.accountFingerprint || null, numFingerprint: b.numFingerprint || null, currency: 'SAR', isMine: true, active: true, createdAt: new Date().toISOString() });
    b.linkedAccountId = own.id;
  }
  store.put('beneficiaries', b);
  let n = 0; const now = new Date().toISOString();
  store.all('transactions').forEach(x => {
    if (x.beneficiaryId !== b.id || x.direction !== 'out') return;
    // العملية اللي اخترت لها دايم تتغير. الباقي: ما عدا اللي غيرت نوعها أو صنفتها بنفسك لعملية وحدة
    if (x.id !== t.id && (x.typeSource === 'user' || x.categorySource === 'user_txn')) return;
    const own = x.id === t.id && x.categorySource === 'user_txn' && x.categoryId ? { categoryId: x.categoryId, subcategoryId: x.subcategoryId } : null;
    if (x.id === t.id) delete x.typeSource;
    applyBeneficiaryClassification(x, b);
    // تصنيفك لهذي العملية بالذات يبقى لو اخترت «صرف»
    if (own && x.transactionType === 'PersonTransfer') Object.assign(x, own, { categorySource: 'user_txn', classificationStatus: 'confirmed' });
    if (kind === 'card' && !x.targetCardLast4 && cards.length === 1) x.targetCardLast4 = cards[0].last4;
    x.updatedAt = now; store.put('transactions', x); n++;
  });
  pairTransfers(store); store.touch();
  return n;
}

/* ---------- 15و. بطاقة أو حساب جديد من رسالة ----------
   رسالة ببطاقة (أو حساب) ما يعرفها التطبيق: تنحفظ مباشرة على «بطاقة …XXXX» مؤقتة، مالكها غير محدد، وتنحسب في صرفك بعلامة.
   لو استوردت كشفًا فيه نفس البطاقة أو الحساب، تنتقل عملياتها للحساب الحقيقي وتندمج مع أسطر الكشف المطابقة. */
function autoAccountFor(store, plan, H, info, text) {
  const l4 = info.instrumentLast4 || info.accountLast4; if (!l4) return null;
  const isCard = !!info.instrumentLast4;
  const found = H.findAccount(a => a.autoCreated && a.last4 === l4); if (found) return found;
  const credit = isCard && /(ائتمان|credit)/i.test(text);
  return H.addAccount({ name: (isCard ? 'بطاقة …' : 'حساب …') + l4, type: credit ? 'credit_card' : 'unknown', last4: l4, autoCreated: true, isMine: true });
}
// compared: حسابات مؤقتة انقارنت عملياتها مع أسطر هذا الكشف وقت الاستيراد (قراراتك هناك تبقى، فما نعيد الدمج)
function absorbAutoAccounts(store, compared) {
  const autos = store.all('accounts').filter(a => a.autoCreated);
  let moved = 0, merged = 0;
  autos.forEach(auto => {
    if (!auto.last4) return;
    const isAuto = (id) => { const a = store.get('accounts', id); return !a || !!a.autoCreated; };
    const realIns = store.all('instruments').filter(i => i.last4 === auto.last4 && !isAuto(i.accountId));
    const realAcc = store.all('accounts').filter(a => !a.autoCreated && a.last4 === auto.last4 && a.type !== 'cash');
    let target = null, targetIns = null;
    if (realIns.length === 1) { targetIns = realIns[0]; target = store.get('accounts', targetIns.accountId); }
    else if (!realIns.length && realAcc.length === 1) target = realAcc[0];
    if (!target) return;
    const autoIns = store.all('instruments').filter(i => i.accountId === auto.id);
    const decided = autoIns.find(i => i.instrumentOwner !== 'unknown' || i.includeInPersonalSpend === false);
    if (!targetIns && autoIns.length) { targetIns = store.all('instruments').find(i => i.accountId === target.id && i.last4 === auto.last4) || null; }
    if (decided && targetIns && targetIns.instrumentOwner === 'unknown') { Object.assign(targetIns, { instrumentOwner: decided.instrumentOwner, ownerName: decided.ownerName, includeInPersonalSpend: decided.includeInPersonalSpend }); store.put('instruments', targetIns); }
    const txs = store.all('transactions').filter(t => t.accountId === auto.id);
    txs.forEach(t => {
      t.accountId = target.id;
      if (targetIns) t.instrumentId = targetIns.id;
      t.updatedAt = new Date().toISOString(); store.put('transactions', t); moved++;
    });
    store.all('deletedTxs').filter(t => t.accountId === auto.id).forEach(t => { t.accountId = target.id; if (targetIns) t.instrumentId = targetIns.id; store.put('deletedTxs', t); });
    if (targetIns) autoIns.forEach(i => store.remove('instruments', i.id));
    else autoIns.forEach(i => { i.accountId = target.id; store.put('instruments', i); });
    // 1.5.0: المتكرر المحفوظ على الحساب المؤقت ينتقل معه (وإذا فيه واحد على الحقيقي لنفس التاجر، يبقى الأقوى: مؤكد ← مرفوض ← مقترح)
    const RANK = { confirmed: 3, dismissed: 2, suggested: 1 };
    store.all('recurring').filter(r => r.accountId === auto.id).forEach(r => {
      const dup = store.all('recurring').find(x => x.id !== r.id && x.subjectType === r.subjectType && x.subjectId === r.subjectId && x.accountId === target.id);
      if (!dup) { r.accountId = target.id; store.put('recurring', r); return; }
      const keepR = (RANK[r.status] || 0) > (RANK[dup.status] || 0) ? r : dup, dropR = keepR === r ? dup : r;
      keepR.accountId = target.id; store.put('recurring', keepR); store.remove('recurring', dropR.id);
      store.all('reserves').filter(x => x.recurringId === dropR.id).forEach(x => { x.recurringId = keepR.id; store.put('reserves', x); });
    });
    store.remove('accounts', auto.id);
    if (compared && compared.has(auto.id)) return;
    // دمج عمليات الرسائل مع أسطر الكشف المطابقة (نفس قواعد منع التكرار، دمج تلقائي فقط)
    const movedIds = new Set(txs.map(t => t.id));
    const byAmt = new Map();
    store.all('transactions').forEach(b => { if (movedIds.has(b.id) || b.accountId !== target.id) return; const k = cents(b.grossAmount); if (!byAmt.has(k)) byAmt.set(k, []); byAmt.get(k).push(b); });
    const pairs = [];
    txs.forEach(a => (byAmt.get(cents(a.grossAmount)) || []).forEach(b => { if (hasSmsSource(a) && hasSmsSource(b)) return; const r = scorePair(store, a, b); if (r && (r.score >= 65 || r.cardException)) pairs.push({ newId: a.id, existingId: b.id, score: r.score, decisive: r.decisive || null, cardException: !!r.cardException, manual: !!r.manual }); }));
    resolvePairs(pairs).auto.forEach(p => {
      const keep = store.get('transactions', p.existingId), drop = store.get('transactions', p.newId); if (!keep || !drop) return;
      if ((drop.sourceLinks || []).every(sl => sl.sourceType === 'sms') && (keep.sourceLinks || []).some(sl => sl.sourceType === 'account_statement' || sl.sourceType === 'card_statement')) {
        // الرسالة أقدم عند المستخدم: تصنيفه وقراراته تبقى، والكشف يكمّل الأصل والرسوم
        ['categoryId', 'subcategoryId', 'categorySource', 'recurrenceType', 'necessityType', 'note', 'excludedByUser', 'refundOfId', 'cashParts'].forEach(k => { if (drop[k] != null && drop[k] !== '' && (keep[k] == null || keep[k] === '' || drop.categorySource === 'user_txn')) keep[k] = drop[k]; });
        carry150(keep, drop);
      }
      mergeInto(store, keep.id, drop.id);
      store.all('messages').filter(m => m.txId === drop.id).forEach(m => { m.txId = keep.id; m.status = 'merged'; store.put('messages', m); });
      merged++;
    });
  });
  if (moved) { pairTransfers(store); store.touch(); }
  return { moved, merged };
}

/* ---------- 15ز. ترقية 1.4.1 ---------- */
function migrate141(store) {
  const s = store.settings; if (s.migrated141) return { changed: false, reprocess: [] };
  if (!store.get('categories', 'cash')) {
    const order = store.all('categories').filter(c => !c.parentId).reduce((m, c) => Math.max(m, c.order || 0), 0) + 1;
    store.put('categories', { id: 'cash', name: 'سحب نقدي', parentId: null, order, defaultRecurrenceType: 'variable', defaultNecessityType: null, isCommitment: false, savingsEligible: false, active: true });
  }
  // رسائل كانت تنتظر «أي حساب؟»: تنعاد معالجتها وتنحفظ على بطاقة مؤقتة
  const reprocess = store.all('reviews').filter(r => r.status === 'open' && r.kind === 'sms_no_account').map(r => r.messageId);
  s.migrated141 = true; s.migrated141At = new Date().toISOString(); store.put('settings', s);
  return { changed: true, reprocess };
}

/* ================= 17. الإصدار 1.5.0 ================= */

/* ---------- 17أ. المدن ----------
   المدينة تخص العملية نفسها. cityId = اللي اعتمدته أنت. اقتراح الموقع (GPS) ينحفظ في suggestedCity* وما يصير معتمد إلا بموافقتك.
   ترتيب الثقة: المعتمدة ← اقتراح الموقع ← مدينتك الحالية (اقتراح احتياطي فقط) ← غير معروفة. */
function cityKey(s) {
  const t = String(s || '').trim().toLowerCase().replace(/\b(city|province|governorate|region)\b/g, '').replace(/['’`]/g, '');
  return normAr(t).replace(/^(مدينه|محافظه|منطقه)/, '');
}
function cityKeyLoose(k) {
  if (/^ال/.test(k) && k.length > 4) return k.slice(2);
  const m = k.match(/^(ash|adh|al|ar|as|ad|az|at|an)(.+)$/); if (m && m[2].length >= 3) return m[2];
  return k;
}
function validCityRaw(raw) {
  const t = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  if (!t || t.length > 60 || /[0-9\u0660-\u0669\u06F0-\u06F9]/.test(t) || !/[A-Za-z؀-ۿ]/.test(t)) return null; // أرقام = احتمال إحداثيات أو عنوان: ما نقبلها
  return t;
}
function cityIndex(store) {
  return store.cached('cityIdx', () => {
    const exact = new Map(), loose = new Map();
    store.all('cities').forEach(c => [c.name].concat(c.aliases || []).forEach(a => { const k = cityKey(a); if (!k) return; if (!exact.has(k)) exact.set(k, c); const l = cityKeyLoose(k); if (!loose.has(l)) loose.set(l, c); }));
    return { exact, loose };
  });
}
function findCity(store, raw, pending) {
  const k = cityKey(raw); if (!k) return null;
  const ix = cityIndex(store), hit = ix.exact.get(k) || ix.loose.get(cityKeyLoose(k));
  if (hit) return hit;
  if (pending) for (const c of pending.values()) if ([c.name].concat(c.aliases || []).some(a => { const x = cityKey(a); return x === k || cityKeyLoose(x) === cityKeyLoose(k); })) return c;
  return null;
}
// مدينة من الموقع ما هي موجودة: تنضاف كمدينة معيارية جديدة (بعد التوحيد) بدل ما تنتجاهل
function ensureCity(store, raw, pending) {
  const t = validCityRaw(raw); if (!t) return null;
  const f = findCity(store, t, pending); if (f) return f;
  const c = { id: 'c-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10), name: t.slice(0, 40), aliases: [t], custom: true, active: true, createdAt: new Date().toISOString() };
  if (pending) pending.set(c.id, c); else store.put('cities', c);
  return c;
}
function saveCity(store, d) {
  const name = validCityRaw(d.name); if (!name) return { error: 'name' };
  const other = findCity(store, name); if (other && other.id !== d.id) return { error: 'dup', city: other };
  const c = d.id ? store.get('cities', d.id) : { id: 'c-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10), custom: true, active: true, createdAt: new Date().toISOString(), aliases: [] };
  if (!c) return { error: 'missing' };
  c.name = name.slice(0, 40);
  const al = (d.aliases || c.aliases || []).map(validCityRaw).filter(Boolean);
  c.aliases = Array.from(new Set([c.name].concat(al))).slice(0, 20);
  if (d.active !== undefined) c.active = !!d.active;
  store.put('cities', c); store.touch(); return { city: c };
}
// دمج مدينة في مدينة (مثل «Buraidah City» مع «بريدة»): العمليات تنتقل، والاسم يصير اسم بديل
function mergeCity(store, fromId, toId) {
  const a = store.get('cities', fromId), b = store.get('cities', toId); if (!a || !b || a.id === b.id) return null;
  let n = 0;
  store.all('transactions').concat(store.all('deletedTxs')).forEach(t => {
    let ch = false;
    if (t.cityId === a.id) { t.cityId = b.id; ch = true; }
    if (t.suggestedCityId === a.id) { t.suggestedCityId = b.id; ch = true; }
    if (ch) { store.put(store.get('transactions', t.id) ? 'transactions' : 'deletedTxs', t); n++; }
  });
  b.aliases = Array.from(new Set((b.aliases || []).concat([a.name], a.aliases || []))).slice(0, 30); store.put('cities', b);
  const s = store.settings; if (s.currentCityId === a.id) { s.currentCityId = b.id; store.put('settings', s); }
  // 1.7.0: «الفترات» اللي مدينتها المدموجة، وقيمة المدينة القديمة المحفوظة عشان ترجع
  if ((s.ignorePeriods || []).some(p => p.cityId === a.id)) { s.ignorePeriods = s.ignorePeriods.map(p => p.cityId === a.id ? Object.assign({}, p, { cityId: b.id }) : p); store.put('settings', s); }
  store.all('transactions').concat(store.all('deletedTxs')).forEach(t => { if (t.periodCity && t.periodCity.prev && t.periodCity.prev.cityId === a.id) { t.periodCity.prev.cityId = b.id; store.put(store.get('transactions', t.id) ? 'transactions' : 'deletedTxs', t); } });
  store.remove('cities', a.id); store.touch(); return { txs: n };
}
// «استخدام موقعي الحالي»: أقرب مدينة من جدول محلي بدون أي خدمة خارجية. الإحداثيات ما تنحفظ ولا ترسل لأي مكان
function cityFromCoords(lat, lng) {
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const R = 6371, rad = (x) => x * Math.PI / 180;
  let best = null;
  CITY_SEED.forEach(([id, name, , la, lo, r]) => {
    const dLa = rad(la - lat), dLo = rad(lo - lng), a = Math.sin(dLa / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(la)) * Math.sin(dLo / 2) ** 2;
    const d = 2 * R * Math.asin(Math.sqrt(a)); if (!best || d < best.km) best = { cityId: id, name, km: Math.round(d), radius: r };
  });
  if (!best) return null;
  return best.km <= best.radius ? { cityId: best.cityId, name: best.name, km: best.km } : { cityId: null, nearest: best.name, km: best.km };
}
// المدينة المعروضة للعملية (ترتيب الثقة)
function suggestCity(store, tx) {
  if (tx.cityId) return { cityId: tx.cityId, source: 'user' };
  if (tx.cityDismissed) return { cityId: null, source: 'dismissed' };
  if (tx.suggestedCityId) return { cityId: tx.suggestedCityId, source: tx.citySuggestionSource || 'shortcut_gps' };
  const cur = store.settings.currentCityId; if (cur) return { cityId: cur, source: 'current' };
  return { cityId: null, source: null };
}
// مدينة العملية للتحليل. الافتراضي (1.5.1): المعتمدة فقط، وهو الرقم الرسمي.
// اقتراح الموقع غير المعتمد يدخل فقط إذا طلبته صراحة (mode = 'withGps' = «تضمين اقتراحات الموقع»). المدينة الحالية ما تُعتبر حقيقة فما تدخل التحليل
function cityOf(store, tx, mode) {
  const a = spendAnchor(store, tx);
  if (a.cityId) return { cityId: a.cityId, source: 'user' };
  if (mode === 'withGps' && a.suggestedCityId && !a.cityDismissed) return { cityId: a.suggestedCityId, source: 'gps' };
  return { cityId: null, source: null };
}
// اعتماد مدينة للعملية. askCurrent = اسأل «تجعلها مدينتك الحالية؟» (إذا مختلفة وما أجلت السؤال)
function setTxCity(store, txId, cityId) {
  const t = store.get('transactions', txId); if (!t) return null;
  if (cityId && !store.get('cities', cityId)) return null;
  t.cityId = cityId || null; if (cityId) delete t.cityDismissed; delete t.cityAuto;
  t.cityManualAt = new Date().toISOString(); delete t.periodCity; // 1.7.0: تعديلك اليدوي يغلب الفترة
  t.updatedAt = new Date().toISOString(); store.put('transactions', t); store.touch();
  const s = store.settings, snoozed = s.cityPromptSnoozeUntil && s.cityPromptSnoozeUntil > new Date().toISOString();
  return { tx: t, askCurrent: !!cityId && cityId !== s.currentCityId && !snoozed };
}
// 1.6.1: موقع الجوال وقت العملية (من الاختصار) = مدينتك الحالية ← تنعتمد تلقائيًا. للعمليات الجديدة بس، والشراء الأونلاين يبقى اقتراح.
// بعد الاعتماد ما تتغير إلا بيدك (حتى لو غيّرت مدينتك الحالية بعدين)
// اسم محل على شكل موقع (APPLE.COM/BILL، www.…) = متجر أونلاين
const ONLINE_SHOP = /(?:^|[^a-z0-9])(?:www\.|[a-z0-9-]+\.(?:com|net|org|sa|io|co|app|store|shop)(?![a-z0-9]))/i;
function autoCityOk(store, t) {
  const cur = store.settings.currentCityId;
  return !!(t && cur && !t.cityId && !t.cityDismissed && t.suggestedCityId === cur && (t.citySuggestionSource || 'shortcut_gps') === 'shortcut_gps' && t.paymentMethod !== 'Online' && !t.onlineHint);
}
function autoApproveCity(store, t) { if (!autoCityOk(store, t)) return false; t.cityId = t.suggestedCityId; t.cityAuto = true; return true; }
function dismissTxCity(store, txId) {
  const t = store.get('transactions', txId); if (!t) return null;
  t.cityId = null; t.cityDismissed = true; delete t.cityAuto; t.cityManualAt = new Date().toISOString(); delete t.periodCity; t.updatedAt = new Date().toISOString(); store.put('transactions', t); store.touch(); return t;
}
function setCurrentCity(store, cityId) { const s = store.settings; s.currentCityId = cityId || null; store.put('settings', s); store.touch(); }
function snoozeCityPrompt(store, hours) { const s = store.settings; s.cityPromptSnoozeUntil = new Date(Date.now() + (hours || 24) * 3600000).toISOString(); store.put('settings', s); store.touch(); }
// 1.5.1: مدينة وصلت بعد ما التطبيق سحب رسالتها (من الصندوق كـ cityUpdate). تنربط بنفس الرسالة بـ requestId،
// وتنضاف للرسالة وعمليتها (أو العملية المعلّقة في المراجعة، أو المحذوفة) كاقتراح موقع فقط:
// ما تغيّر المدينة المعتمدة cityId أبدًا، ولا تغيّر اقتراح موجود.
// النتيجة: applied (انضافت) · present (كانت موجودة) · invalid (اسم غير صالح) · unknown (الرسالة مو محفوظة عندنا: ما يتأكد استلامها)
function applyCityUpdate(store, upd) {
  const id = upd && typeof upd.id === 'string' ? upd.id : null;
  const msg = id ? store.get('messages', id) : null;
  if (!msg) return 'unknown';
  const raw = validCityRaw(upd.suggestedCity); if (!raw) return 'invalid';
  let n = 0;
  const setMsg = (m) => {
    if (!m || validCityRaw(m.suggestedCity)) return false;
    m.suggestedCity = raw; m.citySource = upd.citySource === 'device_gps' ? 'device_gps' : 'shortcut_gps';
    m.cityCapturedAt = typeof upd.cityCapturedAt === 'string' ? upd.cityCapturedAt.slice(0, 40) : null;
    return true;
  };
  if (setMsg(msg)) { n++; store.put('messages', msg); }
  let city = null; // ما تنضاف مدينة جديدة إلا إذا فيه عملية تحتاجها
  const fill = (t, auto) => {
    if (!t || t.suggestedCityId) return false;
    city = city || ensureCity(store, msg.suggestedCity); if (!city) return false;
    Object.assign(t, { suggestedCityId: city.id, suggestedCityRaw: msg.suggestedCity, citySuggestionSource: msg.citySource || 'shortcut_gps', citySuggestedAt: msg.cityCapturedAt || msg.receivedAt || null });
    // 1.7.0: مدينة جات من «الفترات» والموقع وصل بمدينة ثانية: الموقع يغلب، والعملية ترجع لقيمتها وتطلع في «موقعها مختلف»
    if (t.periodCity && !t.periodCity.forced && t.cityId !== city.id) restorePeriodCity(t);
    if (auto) autoApproveCity(store, t); // 1.6.1: عملية محفوظة وموقعها = مدينتك الحالية ← معتمدة (المعلّقة في المراجعة والمحذوفة تبقى اقتراح)
    return true;
  };
  const linked = (t) => t.id === msg.txId || t.id === msg.deletedTxId || (t.sourceLinks || []).some(l => l && l.messageId === msg.id);
  store.all('transactions').filter(linked).forEach(t => { if (fill(t, true)) { n++; t.updatedAt = new Date().toISOString(); store.put('transactions', t); } });
  store.all('deletedTxs').filter(linked).forEach(t => { if (fill(t)) { n++; store.put('deletedTxs', t); } });
  store.all('reviews').filter(r => r.messageId === msg.id && r.status === 'open' && r.heldTx).forEach(r => { if (fill(r.heldTx)) { n++; store.put('reviews', r); } });
  // كأنها وصلت مع الرسالة: التراجع أو الإعادة لخطوة قديمة ما يمسحها. تنطبق فقط على نسخ مربوطة بنفس الرسالة
  // (نسخة عملية من قبل ما تنربط بالرسالة، مثل كشف قبل الدمج، ما تنلمس)
  if (store.patchHistory) {
    const fillLinked = (auto) => (t) => (t.sourceLinks || []).some(l => l && l.messageId === msg.id) && fill(t, auto);
    store.patchHistory('messages', msg.id, setMsg);
    const ndl = JSON.stringify(msg.id); // فحص سريع قبل قراءة النسخة
    store.patchHistory('transactions', null, fillLinked(true), ndl); store.patchHistory('deletedTxs', null, fillLinked(false), ndl);
    store.patchHistory('reviews', null, (r) => r.messageId === msg.id && !!r.heldTx && fill(r.heldTx), ndl);
  }
  if (!n) return 'present';
  store.touch();
  return 'applied';
}

/* ---------- 17ب. تصنيفات المنتجات والأغراض ----------
   الأغراض توزيع للعملية فقط: ما تغيّر رقمها المالي أبدًا. التحليل المالي يقرأ العمليات، وتحليل المنتجات يقرأ الأغراض، وما ينجمعون.
   سقف الأغراض: الأصل إذا الرسوم مفصولة ومعروفة، وإلا الإجمالي. للسحب النقدي: صافي السحب بعد المبالغ المعادة.
   غير المفصل = السقف − مجموع الأغراض، يُحسب وقت العرض وما ينحفظ. */
function saveProductCategory(store, d) {
  const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 40); if (!name) return { error: 'name' };
  if (store.all('productCategories').some(x => x.id !== d.id && x.active !== false && normAr(x.name) === normAr(name))) return { error: 'dup' };
  const all = store.all('productCategories');
  const c = d.id ? store.get('productCategories', d.id) : { id: 'pc-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10), order: all.reduce((m, x) => Math.max(m, x.order || 0), -1) + 1, active: true, createdAt: new Date().toISOString() };
  if (!c) return { error: 'missing' };
  Object.assign(c, { name, emoji: d.emoji || null, color: d.color || null });
  if (d.active !== undefined) c.active = !!d.active;
  store.put('productCategories', c); store.touch(); return { category: c };
}
// حذف تصنيف منتج ما يحذف أي غرض: تنتقل لتصنيف تختاره أو تبقى بدون تصنيف
function deleteProductCategory(store, id, targetId) {
  const c = store.get('productCategories', id); if (!c) return null;
  if (targetId && (targetId === id || !store.get('productCategories', targetId))) return { error: 'target' };
  let items = 0, products = 0;
  store.all('transactions').concat(store.all('deletedTxs')).forEach(t => {
    let ch = false; (t.items || []).forEach(i => { if (i.productCategoryId === id) { i.productCategoryId = targetId || null; ch = true; items++; } });
    if (ch) store.put(store.get('transactions', t.id) ? 'transactions' : 'deletedTxs', t);
  });
  store.all('products').forEach(p => { if (p.productCategoryId === id) { p.productCategoryId = targetId || null; store.put('products', p); products++; } });
  // حد الصرف (1.5.1): ما يصير حدين لنفس تصنيف المنتج بسبب النقل.
  // الهدف ما له حد = ينتقل له حد المحذوف · الهدف له حد = يبقى حده وينحذف حد المحذوف · بدون نقل = ينحذف حده
  const isPc = (l, cid) => l.scope === 'productCategory' && l.productCategoryId === cid;
  const own = store.all('limits').filter(l => isPc(l, id)).sort((a, b) => (a.active === false) - (b.active === false)); // المفعّل أول
  const targetHas = !!targetId && store.all('limits').some(l => isPc(l, targetId));
  let limit = null;
  own.forEach(l => {
    if (targetId && !targetHas && limit !== 'moved') {
      l.productCategoryId = targetId; store.put('limits', l); limit = 'moved';
      // الحد صار لتصنيف ثاني: إخفاء أو تأجيل تنبيهه القديم ما ينطبق عليه
      store.all('alertStates').filter(a => String(a.id).startsWith('limit:' + l.id + ':')).forEach(a => store.remove('alertStates', a.id));
    }
    else { store.remove('limits', l.id); if (!limit) limit = targetHas ? 'kept_target' : 'removed'; }
  });
  store.remove('productCategories', id); store.touch();
  return { items, products, limit };
}
const ITEM_TYPES = new Set(['Payment', 'CashExpense', 'CashWithdrawal', 'PersonTransfer']);
function canHaveItems(t) { return !!t && (ITEM_TYPES.has(t.transactionType) || (t.transactionType === 'Unknown' && t.direction === 'out')); }
function feesSeparated(t) { return round2((t.feeAmount || 0) + (t.vatAmount || 0)) > 0.004; }
function itemCap(store, t) {
  if (t.transactionType === 'CashWithdrawal') return netWithdrawal(store, t);
  if (t.transactionType === 'Unknown') return round2(t.grossAmount);
  return round2(feesSeparated(t) ? t.principalAmount : t.grossAmount);
}
const itemsOf = (t) => (t && t.items || []).filter(i => i && Number(i.total) > 0);
function itemsTotal(t) { return round2(itemsOf(t).reduce((s, i) => s + Number(i.total), 0)); }
function unitemized(store, t) { return round2(itemCap(store, t) - itemsTotal(t)); }
// سقف أغراض جزء السحب = مبلغ الجزء ناقص اللي رجع منه للبنك
function partCap(store, t, partId) {
  const p = cashPartsOf(t).find(x => x.id === partId); if (!p) return null;
  return round2(Math.max(0, Number(p.amount) - (withdrawalReturns(store, t).byPart.get(partId) || 0)));
}
const normProduct = (s) => normAr(String(s || '').toLowerCase());
// 1.6.0: تصنيف الغرض من قائمة التصنيفات الموحدة (رئيسي أو فرعي). الحقل اسمه productCategoryId من 1.5.0، وقيمته الحين معرف تصنيف
// 1.7.0: الغرض اللي ما اخترت له تصنيف بنفسك «يتبع الفاتورة» (catFollow): تصنيفه = تصنيف الفاتورة وقت العرض، ويتغير معها.
// غرض السحب النقدي: تصنيف جزئه، وإذا ما له جزء تصنيف السحب («سحب نقدي» افتراضيًا). اللي اخترت له تصنيف بيدك ثابت
function invoiceCatOf(t, partId) {
  if (t && t.transactionType === 'CashWithdrawal') { const p = partId ? cashPartsOf(t).find(x => x.id === partId) : null; if (p) return p.subcategoryId || p.categoryId || null; return t.subcategoryId || t.categoryId || 'cash'; }
  return t ? (t.subcategoryId || t.categoryId || null) : null;
}
function itemCatId(t, it) { return it && it.catFollow ? invoiceCatOf(t, it.partId) : ((it && it.productCategoryId) || null); }
function itemCatPair(store, id) {
  const c = id ? store.get('categories', id) : null; if (!c) return { cat: '__none', sub: null };
  return c.parentId ? { cat: c.parentId, sub: c.id } : { cat: c.id, sub: null };
}
const readRating = (v) => { if (v == null || v === '' || v === 0 || v === '0') return null; const n = Math.round(Number(v)); return n >= 1 && n <= 5 ? n : null; };
function findProduct(store, name) {
  const k = normProduct(name); if (!k) return null;
  return store.all('products').find(p => p.normName === k || (p.aliases || []).some(a => normProduct(a) === k)) || null;
}
// اقتراح المنتجات: الاسم والتصنيف وآخر سعر وحدة وآخر كمية. الاقتراح ما يغيّر أي قيمة إلا إذا اخترته
function productSuggest(store, text, limit) {
  const k = normProduct(text); if (!k) return [];
  return store.all('products').filter(p => (p.useCount || 0) > 0 && (p.normName.includes(k) || (p.aliases || []).some(a => normProduct(a).includes(k))))
    .sort((a, b) => (Number(b.normName.startsWith(k)) - Number(a.normName.startsWith(k))) || ((b.useCount || 0) - (a.useCount || 0)))
    .slice(0, limit || 6).map(p => ({ id: p.id, name: p.name, productCategoryId: (p.lastCategoryId && store.get('categories', p.lastCategoryId) ? p.lastCategoryId : p.productCategoryId) || null, lastUnitPrice: p.lastUnitPrice, lastQty: p.lastQty, lastRating: p.lastRating || null, avgRating: p.avgRating || null, lastSeenAt: p.lastSeenAt, useCount: p.useCount }));
}
// فهرس المنتجات يتحدث من الأغراض الموجودة داخل العمليات (مو سجل مالي مستقل)
function refreshProduct(store, productId) {
  const p = store.get('products', productId); if (!p) return;
  let n = 0, last = null;
  store.all('transactions').forEach(t => itemsOf(t).forEach(i => {
    if (i.productId !== p.id) return; n++;
    const k = (txDate(t) || '') + (t.time || '') + (i.createdAt || '');
    if (!last || k >= last.k) last = { k, date: txDate(t), i, t };
  }));
  p.useCount = n;
  if (last) Object.assign(p, { lastUnitPrice: last.i.unitPrice, lastQty: last.i.qty, lastSeenAt: last.date, lastMerchantId: last.t.merchantId || null, lastRating: last.i.rating || null, lastCategoryId: last.i.catFollow ? null : (last.i.productCategoryId || null) });
  // 1.6.0: متوسط التقييم (المقيّمة بس) وعددها
  const rs = []; store.all('transactions').forEach(t => itemsOf(t).forEach(i => { if (i.productId === p.id && i.rating) rs.push(i.rating); }));
  p.ratingCount = rs.length; p.avgRating = rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) / rs.length * 10) / 10 : null;
  store.put('products', p);
}
function refreshProductsOf(store, t) { new Set((t && t.items || []).map(i => i.productId).filter(Boolean)).forEach(id => refreshProduct(store, id)); }
function productFor(store, name, catId) {
  let p = findProduct(store, name);
  if (!p) p = { id: 'pr-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 12), name, normName: normProduct(name), aliases: [], productCategoryId: catId || null, lastUnitPrice: null, lastQty: null, lastSeenAt: null, lastMerchantId: null, useCount: 0, createdAt: new Date().toISOString() };
  else if (catId && p.productCategoryId !== catId) p.productCategoryId = catId; // آخر تصنيف اخترته للمنتج يصير اقتراحه
  store.put('products', p); return p;
}
function readItemInput(d) {
  const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 80); if (!name) return { error: 'name' };
  const qty = d.qty == null || d.qty === '' ? 1 : parseNum(d.qty);
  if (!(qty > 0)) return { error: 'qty' };
  let unit = d.unitPrice == null || d.unitPrice === '' ? null : parseNum(d.unitPrice), total = d.total == null || d.total === '' ? null : parseNum(d.total);
  if (total == null && unit != null) total = round2(unit * qty);
  if (unit == null && total != null) unit = round2(total / qty);
  if (!(total > 0) || !(unit > 0)) return { error: 'amount' };
  return { name, qty: round2(qty), unitPrice: round2(unit), total: round2(total) };
}
function validateItems(store, t, items) {
  const cap = itemCap(store, t), sum = round2(items.reduce((s, i) => s + Number(i.total), 0));
  if (sum > cap + 0.004) return { error: 'cap', cap, over: round2(sum - cap) };
  if (t.transactionType === 'CashWithdrawal') {
    const byPart = new Map(); items.forEach(i => { if (i.partId) byPart.set(i.partId, round2((byPart.get(i.partId) || 0) + Number(i.total))); });
    for (const [pid, v] of byPart) { const pc = partCap(store, t, pid); if (pc == null) return { error: 'part' }; if (v > pc + 0.004) return { error: 'part_cap', cap: pc, over: round2(v - pc) }; }
  }
  return null;
}
// تصنيف الغرض من الإدخال: catFollow صريح، أو تصنيف مرسل (فاضي = يتبع الفاتورة)، أو يبقى مثل ما كان (الجديد يتبع الفاتورة)
function itemCatInput(store, d, old) {
  let follow;
  if (d.catFollow !== undefined) follow = !!d.catFollow;
  else if (d.productCategoryId !== undefined) follow = !d.productCategoryId;
  else follow = old ? (!!old.catFollow || !old.productCategoryId) : true;
  const pcIn = follow ? null : (d.productCategoryId === undefined ? (old ? old.productCategoryId : null) : d.productCategoryId);
  const pc = pcIn && store.get('categories', pcIn) ? pcIn : null;
  return { pc, follow: follow || !pc }; // غرض بدون تصنيف = يتبع الفاتورة
}
function saveItem(store, txId, d, itemId) {
  const t = store.get('transactions', txId); if (!t) return { error: 'missing' };
  if (!canHaveItems(t)) return { error: 'not_allowed' };
  const v = readItemInput(d); if (v.error) return v;
  const cur = (t.items || []).map(i => Object.assign({}, i));
  const old = itemId ? cur.find(i => i.id === itemId) : null; if (itemId && !old) return { error: 'missing' };
  // 1.6.0: التصنيف من القائمة الموحدة. الحقول اللي ما انرسلت (مثل الصف السريع) تبقى على قيمتها
  const { pc, follow } = itemCatInput(store, d, old);
  const partId = t.transactionType === 'CashWithdrawal' ? (d.partId === undefined ? (old ? old.partId || null : null) : (d.partId || null)) : null;
  const groupIds = (d.groupIds || (old && old.groupIds) || []).filter(g => store.get('groups', g));
  const rating = d.rating === undefined ? (old ? old.rating || null : null) : readRating(d.rating);
  const it = Object.assign(old || { id: 'it-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 12), createdAt: new Date().toISOString() },
    v, { productCategoryId: pc, catFollow: follow, rating, discount: d.discount === undefined ? !!(old && old.discount) : !!d.discount, note: d.note === undefined ? (old ? old.note || '' : '') : String(d.note || '').slice(0, 120), groupIds, partId });
  const next = old ? cur.map(i => i.id === it.id ? it : i) : cur.concat(it);
  const err = validateItems(store, t, next); if (err) return err;
  if (old) { // غرض عليه استرداد محدد: ما ينقص عن المسترجع منه
    const al = round2(linkedRefunds(store, t.id).reduce((s, r) => s + (r.refundItemAllocations || []).filter(a => a.itemId === it.id).reduce((q, a) => q + Number(a.amount), 0), 0));
    if (it.total < al - 0.004) return { error: 'refund_alloc', allocated: al };
  }
  const prevProduct = old ? old.productId : null;
  it.productId = productFor(store, v.name, it.catFollow ? null : pc).id;
  t.items = next; t.updatedAt = new Date().toISOString(); store.put('transactions', t);
  refreshProduct(store, it.productId); if (prevProduct && prevProduct !== it.productId) refreshProduct(store, prevProduct);
  store.touch();
  return { item: it, unitemized: unitemized(store, t) };
}
// 1.6.0: صفوف الأغراض من نافذة العملية تنحفظ دفعة وحدة (حذف + تعديل + إضافة) ويتحقق السقف مرة وحدة للمجموع.
// rows: [{id?, del?, name, qty, unitPrice, total, productCategoryId, rating, discount, note, partId, groupIds}]. غرض ما انرسل يبقى كما هو
function saveItems(store, txId, rows) {
  const t = store.get('transactions', txId); if (!t) return { error: 'missing' };
  const cur = (t.items || []).map(i => Object.assign({}, i)), byId = new Map(cur.map(i => [i.id, i]));
  const upd = new Map(), dels = new Set(), adds = [];
  for (let n = 0; n < (rows || []).length; n++) {
    const d = rows[n], old = d.id ? byId.get(d.id) : null;
    if (d.id && !old) continue;
    if (d.del) { if (old) dels.add(old.id); continue; }
    if (!canHaveItems(t)) return { error: 'not_allowed' };
    const v = readItemInput(d); if (v.error) return Object.assign({ row: n }, v);
    const { pc, follow } = itemCatInput(store, d, old);
    const partId = t.transactionType === 'CashWithdrawal' ? (d.partId === undefined ? (old ? old.partId || null : null) : (d.partId || null)) : null;
    const groupIds = (d.groupIds || (old && old.groupIds) || []).filter(g => store.get('groups', g));
    const rating = d.rating === undefined ? (old ? old.rating || null : null) : readRating(d.rating);
    const it = Object.assign(old ? Object.assign({}, old) : { id: 'it-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 12), createdAt: new Date().toISOString() },
      v, { productCategoryId: pc, catFollow: follow, rating, discount: d.discount === undefined ? !!(old && old.discount) : !!d.discount, note: d.note === undefined ? (old ? old.note || '' : '') : String(d.note || '').slice(0, 120), groupIds, partId });
    if (old) upd.set(old.id, it); else adds.push(it);
  }
  const next = cur.filter(i => !dels.has(i.id)).map(i => upd.get(i.id) || i).concat(adds);
  const err = validateItems(store, t, next); if (err) return err;
  const refunds = linkedRefunds(store, t.id);
  for (const it of upd.values()) {
    const al = round2(refunds.reduce((s, r) => s + (r.refundItemAllocations || []).filter(a => a.itemId === it.id).reduce((q, a) => q + Number(a.amount), 0), 0));
    if (it.total < al - 0.004) return { error: 'refund_alloc', allocated: al, name: it.name, id: it.id };
  }
  const touched = new Set();
  cur.forEach(i => { if (dels.has(i.id) && i.productId) touched.add(i.productId); });
  upd.forEach(it => { const was = byId.get(it.id).productId; if (was) touched.add(was); it.productId = productFor(store, it.name, it.catFollow ? null : it.productCategoryId).id; touched.add(it.productId); });
  adds.forEach(it => { it.productId = productFor(store, it.name, it.catFollow ? null : it.productCategoryId).id; touched.add(it.productId); });
  if (!dels.size && !upd.size && !adds.length) return { unitemized: unitemized(store, t), changed: 0 };
  t.items = next; t.updatedAt = new Date().toISOString(); store.put('transactions', t);
  if (dels.size) store.all('transactions').forEach(r => { if (r.transactionType === 'Refund' && r.refundOfId === t.id && (r.refundItemAllocations || []).some(a => dels.has(a.itemId))) { r.refundItemAllocations = r.refundItemAllocations.filter(a => !dels.has(a.itemId)); store.put('transactions', r); } });
  touched.forEach(pid => refreshProduct(store, pid));
  store.touch();
  return { unitemized: unitemized(store, t), changed: dels.size + upd.size + adds.length };
}
function removeItem(store, txId, itemId) {
  const t = store.get('transactions', txId); if (!t) return null;
  const it = (t.items || []).find(i => i.id === itemId); if (!it) return null;
  t.items = t.items.filter(i => i.id !== itemId); t.updatedAt = new Date().toISOString(); store.put('transactions', t);
  // تحديدات الاسترداد لهذا الغرض تنشال (الاسترداد يرجع توزيع تقديري)
  store.all('transactions').forEach(r => { if (r.transactionType === 'Refund' && r.refundOfId === t.id && (r.refundItemAllocations || []).some(a => a.itemId === itemId)) { r.refundItemAllocations = r.refundItemAllocations.filter(a => a.itemId !== itemId); store.put('transactions', r); } });
  if (it.productId) refreshProduct(store, it.productId);
  store.touch(); return t;
}

/* ---------- 17ج. الاسترداد والأغراض ----------
   refundItemAllocations على الاسترداد: كل عنصر {itemId, amount} ينقص ذاك الغرض بس.
   الاسترداد اللي ما حددت أغراضه: توزيع تقديري بالنسبة على الباقي من الفاتورة (الأغراض وغير المفصل)، ويظهر «توزيع تقديري».
   الاسترداد الكامل يلغي كل الأغراض (النسبة = 100%). */
function linkedRefunds(store, purchaseId) {
  const idx = store.cached('refByPurchase', () => { const m = new Map(); store.all('transactions').forEach(r => { if (r.transactionType === 'Refund' && r.refundOfId) { if (!m.has(r.refundOfId)) m.set(r.refundOfId, []); m.get(r.refundOfId).push(r); } }); return m; });
  return (idx.get(purchaseId) || []).filter(r => !isExcluded(store, r));
}
function setRefundAllocations(store, refundId, allocs) {
  const r = store.get('transactions', refundId); if (!r || r.transactionType !== 'Refund') return { error: 'not_refund' };
  const p = r.refundOfId ? store.get('transactions', r.refundOfId) : null; if (!p) return { error: 'not_linked' };
  const items = itemsOf(p); if (!items.length) return { error: 'no_items' };
  const clean = [];
  for (const a of (allocs || [])) {
    const amt = round2(parseNum(a.amount) || 0); if (!(amt > 0)) continue;
    const it = items.find(i => i.id === a.itemId); if (!it) return { error: 'item' };
    const other = round2(linkedRefunds(store, p.id).filter(x => x.id !== r.id).reduce((s, x) => s + (x.refundItemAllocations || []).filter(y => y.itemId === it.id).reduce((q, y) => q + Number(y.amount), 0), 0));
    if (amt > round2(Number(it.total) - other) + 0.004) return { error: 'item_over', itemId: it.id, max: round2(Number(it.total) - other) };
    clean.push({ itemId: it.id, amount: amt });
  }
  const sum = round2(clean.reduce((s, a) => s + a.amount, 0));
  if (sum > r.principalAmount + 0.004) return { error: 'over', max: r.principalAmount };
  r.refundItemAllocations = clean; r.updatedAt = new Date().toISOString(); store.put('transactions', r); store.touch();
  return { allocations: clean, unallocated: round2(r.principalAmount - sum) };
}
// صافي كل غرض بعد الاستردادات (للتحليل): المحدد أولًا، وبعدين التقديري. الأغراض فوق سقف العملية تتقلص بالنسبة
function itemNet(store, t) { return itemNetInfo(store, t).out; }
function itemNetInfo(store, t) {
  const items = itemsOf(t);
  const cap = itemCap(store, t), tot = itemsTotal(t), scale = tot > cap + 0.004 && tot > 0 ? cap / tot : 1;
  const out = items.map(i => ({ item: i, id: i.id, total: round2(Number(i.total) * scale), over: scale < 1, allocated: 0, estimated: 0, net: 0 }));
  let unalloc = 0;
  if (t.transactionType === 'Payment') linkedRefunds(store, t.id).forEach(r => {
    let left = r.principalAmount;
    (r.refundItemAllocations || []).forEach(a => { const o = out.find(x => x.id === a.itemId); if (!o) return; const v = round2(Math.min(Number(a.amount) || 0, o.total - o.allocated, left)); if (v > 0) { o.allocated = round2(o.allocated + v); left = round2(left - v); } });
    unalloc = round2(unalloc + Math.max(0, left));
  });
  const remaining = round2(cap - out.reduce((s, o) => s + o.allocated, 0));
  let f = 0;
  if (unalloc > 0.004 && remaining > 0.004) { f = Math.min(1, unalloc / remaining); out.forEach(o => { o.estimated = round2((o.total - o.allocated) * f); }); }
  out.forEach(o => { o.net = round2(Math.max(0, o.total - o.allocated - o.estimated)); });
  return { out, f, cap };
}
// 1.6.0: «غير مفصّل» = باقي الفاتورة بعد أغراضها، على تصنيف الفاتورة (وللسحب: لكل جزء بتصنيفه، والباقي على تصنيف السحب).
// يطلع في تحليل المنتجات عشان الفاتورة اللي ما قسمتها ما تبين كأنها ما فيها صرف. بعد نصيبه من الاسترداد التقديري (نفس نسبة الأغراض)
function unitemizedParts(store, t) {
  if (!canHaveItems(t) || isExcluded(store, t)) return [];
  const info = itemNetInfo(store, t), items = info.out;
  const parts = effParts(store, t).filter(p => p.amt > 0.004);
  const out = [];
  parts.forEach(p => {
    const mine = t.transactionType === 'CashWithdrawal' ? items.filter(o => (o.item.partId || null) === (p.partId || null)) : items;
    const raw = round2(Math.max(0, p.amt - mine.reduce((s, o) => s + o.total, 0)));
    if (raw < 0.005) return;
    const est = round2(raw * info.f);
    out.push({ cat: p.cat, sub: p.sub || null, partId: p.partId || null, total: raw, estimated: est, net: round2(Math.max(0, raw - est)) });
  });
  return out;
}

/* ---------- 17د. المبلغ المعاد من السحب النقدي ----------
   إيداع (أو داخل غير معروف) تربطه بسحب: ينقص أثر السحب على تاريخ السحب، مرة وحدة.
   يدعم أكثر من إيداع لنفس السحب، ومجموعها ما يتجاوز أصل السحب (فأثر السحب ما يصير سالب). */
function cashReturnCandidates(store, depId) {
  const d = store.get('transactions', depId); if (!d || d.direction !== 'in' || !['CashDeposit', 'Unknown'].includes(d.transactionType)) return [];
  const dd = txDate(d), from = addDays(dd, -120);
  return store.all('transactions').filter(w => w.transactionType === 'CashWithdrawal' && !isExcluded(store, w) && txDate(w) <= dd && txDate(w) >= from)
    .map(w => { const other = round2(withdrawalReturns(store, w).total - (d.cashReturnOfId === w.id ? d.principalAmount : 0)); return { id: w.id, date: txDate(w), amount: w.principalAmount, returned: other, returnable: round2(w.principalAmount - other), fits: d.principalAmount <= w.principalAmount - other + 0.004, parts: cashPartsOf(w).map(p => ({ id: p.id, amount: p.amount, categoryId: p.categoryId })) }; })
    .filter(c => c.returnable > 0.004)
    .sort((a, b) => (Number(b.fits) - Number(a.fits)) || b.date.localeCompare(a.date)).slice(0, 10);
}
function linkCashReturn(store, depId, wId, partId) {
  const d = store.get('transactions', depId), w = store.get('transactions', wId);
  if (!d || d.direction !== 'in' || !['CashDeposit', 'Unknown'].includes(d.transactionType)) return { error: 'not_deposit' };
  if (!w || w.transactionType !== 'CashWithdrawal') return { error: 'not_withdrawal' };
  const amt = d.principalAmount;
  const R = withdrawalReturns(store, w), other = round2(R.total - (d.cashReturnOfId === w.id ? amt : 0));
  if (amt > round2(w.principalAmount - other) + 0.004) return { error: 'over', returnable: round2(w.principalAmount - other) };
  if (partId) {
    const p = cashPartsOf(w).find(x => x.id === partId); if (!p) return { error: 'part' };
    const pOther = round2((R.byPart.get(partId) || 0) - (d.cashReturnOfId === w.id && d.cashReturnPartId === partId ? amt : 0));
    if (amt > round2(Number(p.amount) - pOther) + 0.004) return { error: 'part_over', returnable: round2(Number(p.amount) - pOther) };
    const pi = round2(itemsOf(w).filter(i => i.partId === partId).reduce((s, i) => s + Number(i.total), 0));
    if (pi > round2(Number(p.amount) - pOther - amt) + 0.004) return { error: 'items_over' };
  }
  if (itemsTotal(w) > round2(w.principalAmount - other - amt) + 0.004) return { error: 'items_over' };
  if (d.transactionType === 'Unknown') { d.transactionType = 'CashDeposit'; d.classificationStatus = 'confirmed'; d.typeSource = 'user'; }
  d.cashReturnOfId = w.id; d.cashReturnPartId = partId || null; d.updatedAt = new Date().toISOString();
  store.put('transactions', d); store.touch();
  return { net: netWithdrawal(store, w) };
}
function unlinkCashReturn(store, depId) {
  const d = store.get('transactions', depId); if (!d || !d.cashReturnOfId) return null;
  d.cashReturnOfId = null; d.cashReturnPartId = null; d.updatedAt = new Date().toISOString(); store.put('transactions', d); store.touch(); return d;
}

/* ---------- 17هـ. المجموعات ----------
   طريقة تجميع مستقلة عن التصنيف (رحلة، زواج، رمضان…). العملية كاملة أو غرض منها. المجموعات متداخلة وما تنجمع مع بعض. */
function saveGroup(store, d) {
  const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 40); if (!name) return { error: 'name' };
  const budget = d.budget == null || d.budget === '' ? null : parseNum(d.budget);
  if (budget != null && !(budget > 0)) return { error: 'budget' };
  if (d.startDate && d.endDate && d.startDate > d.endDate) return { error: 'dates' };
  const g = d.id ? store.get('groups', d.id) : { id: 'g-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10), active: true, createdAt: new Date().toISOString() };
  if (!g) return { error: 'missing' };
  Object.assign(g, { name, description: String(d.description || '').slice(0, 200), emoji: d.emoji || null, color: d.color || null, startDate: d.startDate || null, endDate: d.endDate || null, budget: budget != null ? round2(budget) : null });
  if (d.active !== undefined) g.active = !!d.active;
  store.put('groups', g); store.touch(); return { group: g };
}
function deleteGroup(store, id) {
  if (!store.get('groups', id)) return null;
  let n = 0;
  store.all('transactions').concat(store.all('deletedTxs')).forEach(t => {
    let ch = false;
    if ((t.groupIds || []).includes(id)) { t.groupIds = t.groupIds.filter(x => x !== id); ch = true; }
    (t.items || []).forEach(i => { if ((i.groupIds || []).includes(id)) { i.groupIds = i.groupIds.filter(x => x !== id); ch = true; } });
    if (ch) { store.put(store.get('transactions', t.id) ? 'transactions' : 'deletedTxs', t); n++; }
  });
  store.remove('groups', id); store.touch(); return { txs: n };
}
function setTxGroups(store, txId, ids) {
  const t = store.get('transactions', txId); if (!t) return null;
  const next = Array.from(new Set((ids || []).filter(g => store.get('groups', g)))), removed = (t.groupIds || []).filter(g => !next.includes(g));
  // 1.7.0: مجموعة شلتها بيدك ما ترجعها الفترة. ولو رجعتها بيدك تنشال من «المشالة»
  const covered = (g) => Object.values(t.periodGroups || {}).includes(g) || periodsList(store).some(p => p.groupId === g && inPeriodRange(t, p));
  let opt = (t.groupOptOut || []).filter(g => !next.includes(g));
  removed.forEach(g => { if (covered(g) && !opt.includes(g)) opt.push(g); });
  if (opt.length) t.groupOptOut = opt; else delete t.groupOptOut;
  if (t.periodGroups) { const pg = {}; Object.keys(t.periodGroups).forEach(k => { if (next.includes(t.periodGroups[k])) pg[k] = t.periodGroups[k]; }); if (Object.keys(pg).length) t.periodGroups = pg; else delete t.periodGroups; }
  t.groupIds = next; t.updatedAt = new Date().toISOString(); store.put('transactions', t); store.touch(); return t;
}
function setItemGroups(store, txId, itemId, ids) {
  const t = store.get('transactions', txId); if (!t) return null;
  const it = (t.items || []).find(i => i.id === itemId); if (!it) return null;
  it.groupIds = Array.from(new Set((ids || []).filter(g => store.get('groups', g)))); t.updatedAt = new Date().toISOString(); store.put('transactions', t); store.touch(); return t;
}
// العملية في المجموعة: هي نفسها، أو استرداد شراؤه في المجموعة (عشان ينخصم منها)
// الاسترداد المربوط بشرائه يتبع مجموعة الشراء بس (أثره على أغراض المجموعة يمر من صافي الأغراض)، فما ينخصم مرتين
function inGroup(store, tx, gid) {
  if (tx.transactionType === 'Refund' && tx.refundOfId) { const a = spendAnchor(store, tx); if (a !== tx) return (a.groupIds || []).includes(gid); }
  return (tx.groupIds || []).includes(gid);
}
// تصنيف الغرض المالي: تصنيف العملية الأم (وللسحب المقسّم: تصنيف جزئه)
function itemFinCat(t, it) {
  if (t.transactionType === 'CashWithdrawal') { const p = it.partId ? cashPartsOf(t).find(x => x.id === it.partId) : null; return p ? (p.categoryId || '__none') : (t.categoryId || 'cash'); }
  return t.categoryId || (t.transactionType === 'PersonTransfer' ? '__person' : '__none');
}
// صرف المجموعة = العمليات الكاملة + الأغراض اللي عمليتها الأم مو في نفس المجموعة (ما يتكرر شي)
function groupStats(store, gid) {
  const g = store.get('groups', gid); if (!g) return null;
  const cats = new Map(), prods = new Map(), txIds = new Set(), itemRefs = [];
  let spend = 0;
  const addProd = (it, v) => { const k = it.productId || it.name; const o = prods.get(k) || { productId: it.productId || null, name: it.name, amount: 0, qty: 0 }; o.amount = round2(o.amount + v); o.qty = round2(o.qty + Number(it.qty || 1)); prods.set(k, o); };
  store.all('transactions').forEach(t => {
    if (isExcluded(store, t)) return;
    if (inGroup(store, t, gid)) {
      const parts = spendParts(store, t); if (!parts.length) return;
      parts.forEach(p => { spend += p.amt; cats.set(p.cat, round2((cats.get(p.cat) || 0) + p.amt)); });
      txIds.add(t.id);
      itemNet(store, t).forEach(o => { if (o.net > 0) addProd(o.item, o.net); });
      return;
    }
    if (!canHaveItems(t)) return;
    itemNet(store, t).forEach(o => {
      if (!(o.item.groupIds || []).includes(gid) || !(o.net > 0)) return;
      spend += o.net; txIds.add(t.id); itemRefs.push({ txId: t.id, itemId: o.id, amount: o.net, estimated: o.estimated > 0 });
      const c = itemFinCat(t, o.item); cats.set(c, round2((cats.get(c) || 0) + o.net)); addProd(o.item, o.net);
    });
  });
  spend = round2(spend);
  const budget = g.budget || null, pct = budget ? Math.round(spend / budget * 1000) / 10 : null;
  const alertPct = Number(store.settings.limitAlertPct || 80);
  return { group: g, spend, budget, remaining: budget ? round2(budget - spend) : null, pct, level: budget ? (pct >= 100 ? 'over' : pct >= alertPct ? 'warn' : 'ok') : null,
    count: txIds.size, txIds: Array.from(txIds), itemRefs,
    categories: Array.from(cats.entries()).map(([k, v]) => ({ categoryId: k, amount: v })).filter(x => x.amount > 0.004).sort((a, b) => b.amount - a.amount),
    products: Array.from(prods.values()).sort((a, b) => b.amount - a.amount) };
}

/* ---------- 17و. سجل الأرصدة (Balance Snapshots) ----------
   كل رصيد معروف ينحفظ كسجل {balance, asOf, source} وما ينمسح السابق. رصيد الحساب = أحدث سجل.
   رصيد رسالة الحساب الجاري يُستخدم فقط إذا: الحساب معروف، الرسالة انقرأت كاملة، الرقم رصيد بعد العملية بكلمة «الرصيد»، له وقت واضح، وأحدث من رصيد الكشف.
   المتاح في البطاقة الائتمانية مو رصيد نقدي وما ينحفظ هنا أبدًا. */
const snapKey = (s) => { const a = String(s.asOf || ''); return a.length <= 10 ? a + 'T23:59' : a.slice(0, 16); };
function latestSnapshot(store, accountId, pred) {
  return store.all('balanceSnapshots').filter(x => x.accountId === accountId && !x.voidedAt && (!pred || pred(x)))
    .sort((a, b) => snapKey(b).localeCompare(snapKey(a)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
}
function refreshAccountBalance(store, accountId) {
  const a = store.get('accounts', accountId); if (!a) return;
  const l = latestSnapshot(store, accountId);
  if (!l) return;
  Object.assign(a, { lastBalance: l.balance, lastBalanceDate: String(l.asOf).slice(0, 10), lastBalanceKind: l.kind || 'balance', lastBalanceSource: l.source, lastBalanceAt: l.asOf });
  store.put('accounts', a);
}
function addSnapshot(store, snap) {
  const o = Object.assign({ id: uid(), createdAt: new Date().toISOString(), kind: 'balance' }, snap);
  o.balance = round2(o.balance); store.put('balanceSnapshots', o); refreshAccountBalance(store, o.accountId); return o;
}
// وقت الجهاز من نص ISO (الاختصار يرسل الوقت مع فرق التوقيت)
function wallTime(iso) {
  const s = String(iso || ''); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return null;
  if (/[zZ]$/.test(s)) { const d = new Date(s); if (isNaN(d.getTime())) return null; return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
  return s.slice(0, 16);
}
const BAL_WORD = /رصيد|balance|\bbal\b/i;
function smsBalanceSnapshot(store, o) {
  // o: {accountId, balance, date, time, receivedAt, source, text, messageId, txId}
  const a = store.get('accounts', o.accountId);
  if (!a || a.autoCreated || a.type !== 'checking' || o.balance == null || !isFinite(o.balance)) return null;
  if (!BAL_WORD.test(o.text || '')) return null;
  const asOf = o.time && o.date ? `${o.date}T${o.time}` : (o.source === 'inbox' ? wallTime(o.receivedAt) : null);
  if (!asOf) return null;
  if (store.all('balanceSnapshots').some(x => x.messageId && x.messageId === o.messageId)) return null;
  const st = latestSnapshot(store, a.id, x => x.source === 'statement');
  if (st && !(asOf > snapKey(st))) return null; // لازم يكون أحدث من رصيد الكشف
  return addSnapshot(store, { accountId: a.id, balance: o.balance, asOf, source: 'sms', kind: 'balance', messageId: o.messageId || null, txId: o.txId || null });
}

/* ---------- 17ز. ترقية 1.5.0 ----------
   ما يحذف ولا يغيّر أي بيانات من 1.4.1. يضيف: تصنيفات المنتجات والمدن (بذور)، حقول العمليات الجديدة بقيمها الفاضية،
   وأول سجل رصيد لكل حساب من آخر رصيد معروف، وأرصدة رسائل الحساب الجاري المحفوظة (إذا تنطبق عليها الشروط). */
/* ---------- 1.5.2: تصحيح الدمج الغلط ----------
   رسائل اندمجت تلقائيًا (قبل 1.5.2) مع عملية فيها رسالة ثانية: كل وحدة ترجع عملية مستقلة، مرة وحدة.
   أول رسالة في العملية تبقى أصلها. قراراتك ما تنلمس: اللي دمجتها بنفسك في المراجعة، أو رجّعتها لعملية محذوفة.
   ومراجعات «نفس النص» المفتوحة من قبل تتصنف «مكررة» تلقائيًا (نفس الحساب: ما تنحسب). */
async function splitSmsMerges(store) {
  const split = [], anchorOf = new Map();
  // قراراتك في المراجعة (دمج، أو رجّعها) ما تنفصل أبدًا: من العلامة على الرسالة، أو من سجل المراجعة
  store.all('reviews').filter(r => r.status === 'resolved' && ((r.kind === 'sms_duplicate' && r.resolution === 'merge') || (r.kind === 'sms_deleted_again' && r.resolution === 'restore'))).forEach(r => {
    const m = store.get('messages', r.messageId); if (m && !m.userMerged) { m.userMerged = true; store.put('messages', m); }
  });
  store.all('transactions').forEach(t => {
    const sms = (t.sourceLinks || []).filter(l => l && l.sourceType === 'sms' && l.messageId);
    if (sms.length < 2) return;
    const first = sms[0].messageId;
    const drop = new Set(sms.slice(1).map(l => l.messageId).filter(id => {
      const m = store.get('messages', id);
      return id !== first && m && m.text && !m.userMerged;
    }));
    if (!drop.size) return;
    t.sourceLinks = t.sourceLinks.filter(l => !(l && l.sourceType === 'sms' && drop.has(l.messageId)));
    t.updatedAt = new Date().toISOString(); store.put('transactions', t);
    drop.forEach(id => { split.push(id); anchorOf.set(id, t.id); });
  });
  if (!split.length) return { split: 0 };
  const plan = await reprocessMessages(store, split); if (plan) commitSms(store, plan);
  // حقول نسختها العملية الأصلية وقت الدمج من الرسالة اللي انفصلت (الرصيد والمرجع ومدينة الموقع) ترجع لها
  split.forEach(id => {
    const m = store.get('messages', id), a = store.get('transactions', anchorOf.get(id)); if (!m || !a) return;
    const n = m.txId ? store.get('transactions', m.txId) : null; if (!n || n.id === a.id) return;
    const stmt = (a.sourceLinks || []).some(l => l && l.sourceType !== 'sms' && l.sourceType !== 'manual');
    let ch = false;
    if (!stmt && a.balanceAfter != null && n.balanceAfter != null && cents(a.balanceAfter) === cents(n.balanceAfter)) { a.balanceAfter = null; ch = true; }
    if (!stmt && a.reference && a.reference === n.reference) { a.reference = null; ch = true; }
    const am = (a.sourceLinks || []).map(l => l && l.messageId && store.get('messages', l.messageId)).find(x => x);
    if (!a.cityId && a.suggestedCityId && a.suggestedCityId === n.suggestedCityId && !(am && validCityRaw(am.suggestedCity))) {
      Object.assign(a, { suggestedCityId: null, suggestedCityRaw: null, citySuggestionSource: null, citySuggestedAt: null }); ch = true;
    }
    if (ch) store.put('transactions', a);
  });
  store.touch();
  // اللي طلعت نفس الرسالة (مكررة) ما تنعد «انفصلت»
  return { split: split.filter(id => { const m = store.get('messages', id); return m && m.status !== 'duplicate'; }).length };
}
async function migrate152(store) {
  const s = store.settings; if (s.migrated152) return { split: 0, dup: 0 };
  // قراراتك السابقة في المراجعة تنحفظ على الرسالة نفسها، عشان ما تنفصل أبدًا
  store.all('reviews').filter(r => r.status === 'resolved' && ((r.kind === 'sms_duplicate' && r.resolution === 'merge') || (r.kind === 'sms_deleted_again' && r.resolution === 'restore'))).forEach(r => {
    const m = store.get('messages', r.messageId); if (m && !m.userMerged) { m.userMerged = true; store.put('messages', m); }
  });
  const sp = await splitSmsMerges(store);
  let dup = 0;
  store.all('reviews').filter(r => r.status === 'open' && r.kind === 'sms_same_content').forEach(r => {
    Object.assign(r, { status: 'resolved', resolution: 'auto_duplicate', resolvedAt: new Date().toISOString(), autoDuplicate: true }); store.put('reviews', r);
    const m = store.get('messages', r.messageId); if (m && m.status === 'review') { m.status = 'duplicate'; store.put('messages', m); }
    dup++;
  });
  s.migrated152 = new Date().toISOString(); store.put('settings', s); store.touch();
  return { split: sp.split, dup };
}
/* ---------- 1.6.0: قائمة تصنيفات وحدة للفواتير والمنتجات ----------
   تصنيفات المنتجات صارت تصنيفات فرعية تحت التصنيف المناسب (جدول اعتمده المستخدم). الأغراض والمنتجات وحدود المنتجات تنتقل معها.
   تصنيف منتجات أضافه المستخدم: ينحط فرعي تحت «أخرى» ومعلّم needsPlacement لين يختار مكانه. ما ينحذف شي. */
const PC_MAP = {
  'pc.produce': ['groceries', 'groceries.produce'], 'pc.meat': ['groceries', 'groceries.meat'], 'pc.dairy': ['groceries', 'groceries.dairy'],
  'pc.bakery': ['groceries', 'groceries.bakery'], 'pc.drinks': ['groceries', 'groceries.drinks'], 'pc.frozen': ['groceries', 'groceries.frozen'],
  'pc.snacks': ['groceries', 'groceries.snacks'], 'pc.cleaning': ['home', 'home.cleaning'], 'pc.household': ['home', 'home.household'],
  'pc.health': ['health', 'health.medicine'], 'pc.personal': ['shopping', 'shopping.personal'], 'pc.kids': ['shopping', 'shopping.kids'],
  'pc.electronics': ['shopping', 'shopping.electronics'], 'pc.clothes': ['shopping', 'shopping.clothes'], 'pc.stationery': ['shopping', 'shopping.stationery'],
  'pc.other': ['other', null] };
// الفرعيات الجديدة من البذور لمستخدم قديم: تنضاف تحت رئيسيها إذا موجود، وإذا عنده فرعي بنفس الاسم يُستخدم هو
// الفرعيات اللي جات في 1.6.0 بس (اللي حذفتها أنت قبل ما ترجع)
const NEW160_SUBS = new Set(['groceries.produce', 'groceries.meat', 'groceries.dairy', 'groceries.bakery', 'groceries.drinks', 'groceries.frozen', 'groceries.snacks', 'home.cleaning', 'health.medicine', 'shopping.personal', 'shopping.kids', 'shopping.stationery']);
function ensureSeedSubs(store) {
  const map = new Map(), now = new Date().toISOString();
  CATEGORY_SEED.forEach(c => (c.subs || []).forEach(sd => {
    if (store.get('categories', sd.id)) { map.set(sd.id, sd.id); return; }
    if (!NEW160_SUBS.has(sd.id)) return; // فرعي قديم حذفته: يبقى محذوف، والمنتجات تروح لرئيسيه
    const parent = store.get('categories', c.id); if (!parent || parent.parentId) return;
    const sib = store.all('categories').filter(x => x.parentId === c.id);
    const same = sib.find(x => normAr(x.name) === normAr(sd.name)); if (same) { map.set(sd.id, same.id); return; }
    store.put('categories', { id: sd.id, name: sd.name, parentId: c.id, order: sib.reduce((m, x) => Math.max(m, x.order || 0), -1) + 1, emoji: sd.emoji || null,
      defaultRecurrenceType: sd.rec !== undefined ? sd.rec : null, defaultNecessityType: sd.nec !== undefined ? sd.nec : null,
      isCommitment: sd.commit !== undefined ? !!sd.commit : null, savingsEligible: sd.save !== undefined ? !!sd.save : null, active: true, createdAt: now });
    map.set(sd.id, sd.id);
  }));
  return map;
}
function migrate160(store) {
  const s = store.settings; if (s.migrated160) return { changed: false, placed: [] };
  const subMap = ensureSeedSubs(store), pcMap = new Map(), placed = [], now = new Date().toISOString();
  const fallback = () => liveCat(store, 'other', null)[0] || (store.all('categories').find(c => !c.parentId && c.active !== false) || {}).id || null;
  store.all('productCategories').forEach(pc => {
    let target = null;
    const m = PC_MAP[pc.id];
    if (m) { const sub = m[1] ? (subMap.get(m[1]) || m[1]) : null; const [lc, ls] = liveCat(store, m[0], sub); target = ls || lc || fallback(); }
    else {
      const other = fallback();
      const ex = other && store.all('categories').find(x => x.parentId === other && normAr(x.name) === normAr(pc.name));
      if (ex) target = ex.id;
      else if (other) {
        const sib = store.all('categories').filter(x => x.parentId === other);
        const c = { id: 'c-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10), name: pc.name, parentId: other, order: sib.reduce((q, x) => Math.max(q, x.order || 0), -1) + 1, emoji: pc.emoji || null,
          defaultRecurrenceType: null, defaultNecessityType: null, isCommitment: null, savingsEligible: null, active: pc.active !== false, custom: true, needsPlacement: true, createdAt: now };
        store.put('categories', c); target = c.id; placed.push(c.id);
      }
    }
    pcMap.set(pc.id, target); pc.migratedTo = target; store.put('productCategories', pc);
  });
  const mapId = (id) => { if (!id) return null; if (pcMap.has(id)) return pcMap.get(id); return store.get('categories', id) ? id : null; };
  ['transactions', 'deletedTxs'].forEach(n => store.all(n).forEach(t => {
    let ch = false; (t.items || []).forEach(i => { if (i.productCategoryId && !store.get('categories', i.productCategoryId)) { i.productCategoryId = mapId(i.productCategoryId); ch = true; } });
    if (ch) store.put(n, t);
  }));
  store.all('reviews').forEach(r => { if (!r.heldTx) return; let ch = false; (r.heldTx.items || []).forEach(i => { if (i.productCategoryId && !store.get('categories', i.productCategoryId)) { i.productCategoryId = mapId(i.productCategoryId); ch = true; } }); if (ch) store.put('reviews', r); });
  store.all('products').forEach(p => { if (p.productCategoryId && !store.get('categories', p.productCategoryId)) { p.productCategoryId = mapId(p.productCategoryId); store.put('products', p); } });
  // حدود تصنيفات المنتجات ← حدود «حسب المنتجات» على التصنيف الجديد (حد واحد لكل تصنيف، المفعّل أول)
  const seen = new Set(store.all('limits').filter(l => l.scope === 'category' && l.basis === 'products').map(l => l.categoryId));
  store.all('limits').filter(l => l.scope === 'productCategory').sort((a, b) => (a.active === false) - (b.active === false)).forEach(l => {
    const cid = mapId(l.productCategoryId);
    if (!cid || seen.has(cid)) { store.remove('limits', l.id); return; }
    seen.add(cid); Object.assign(l, { scope: 'category', basis: 'products', categoryId: cid }); delete l.productCategoryId; store.put('limits', l);
  });
  s.migrated160 = now; s.placeCategories = placed; store.put('settings', s); store.touch();
  return { changed: true, mapped: pcMap.size, placed };
}

/* ---------- 1.6.1: كلمات قراءة الرسائل بنسخ حسب التاريخ ----------
   settings.smsWords.versions = [{id, from, words, createdAt, updatedAt}]. الرسالة تنقرأ بآخر نسخة تاريخها قبل أو يساوي تاريخ الرسالة
   (التاريخ المكتوب فيها بترتيب شكل التاريخ المحفوظ، وإلا تاريخ وصولها). قبل أول نسخة: الكلمات الافتراضية.
   تعديل الكلمات ما يغيّر أي عملية محفوظة إلا اللي تختارها أنت من المعاينة، وتصحيحها يمس اللي انقرأ من الرسالة بس. */
function smsWordVersions(store) { return ((store.settings.smsWords || {}).versions || []).slice().sort((a, b) => String(a.from).localeCompare(String(b.from))); }
function wordVersionAt(versions, date) { let v = null; versions.forEach(x => { if (x.from <= date) v = x; }); return v; }
const WORDS_C = new Map();
function compiledWordsOf(v) {
  if (!v) return SR().DEFAULT_W;
  const k = v.id + '|' + (v.updatedAt || v.createdAt || '');
  if (!WORDS_C.has(k)) { if (WORDS_C.size > 40) WORDS_C.clear(); WORDS_C.set(k, SR().compileWords(v.words)); }
  return WORDS_C.get(k);
}
// تاريخ الرسالة لاختيار نسخة الكلمات: المكتوب فيها (بترتيب الشكل المحفوظ أو إذا له قراءة وحدة)، وإلا تاريخ الوصول
function wordsDate(store, text, receivedISO, bank) {
  const R = SR(), tok = R.findDateToken(text);
  if (tok) {
    const known = (store.settings.smsDateShapes || {})[shapeKey(bank, tok.sig)];
    const d = known ? R.readDateOrder(tok, known.order) : ((tok.candidates || []).length === 1 ? tok.candidates[0].date : null);
    if (d) return d;
  }
  return String(receivedISO || new Date().toISOString()).slice(0, 10);
}
function smsWordsFor(store, text, receivedISO, versions, bank) {
  const v = wordVersionAt(versions || smsWordVersions(store), wordsDate(store, text, receivedISO, bank));
  return { version: v, W: compiledWordsOf(v) };
}
// نفس التاريخ اللي انقرأت فيه الرسالة (محفوظ عليها من 1.6.1، وللأقدم نحسبه بنفس الطريقة)
function msgWordsDate(store, m) { return m.wordsDate || wordsDate(store, m.text || '', m.receivedAt, bankOf(store, m.sender)); }
// تنظيف الكلمات: كلمة من حرفين أو أكثر، بدون تكرار (بعد تجاهل الفروق المتشابهة)، وبدون أرقام طويلة (بطاقة، حساب، آيبان)
const LONG_DIGITS = /\d[\d\s-]{4,}\d/;
function cleanSmsWords(words) {
  const R = SR(), out = {};
  R.WORD_GROUPS.forEach(g => {
    const src = (words && words[g.key]) || { words: g.words, not: g.not || [] };
    const clean = (list) => { const seen = new Set(); return (list || []).map(w => cleanText(String(w || '')).replace(/\s+/g, ' ').trim().slice(0, 60)).filter(w => { const k = R.wordKey(w); if (w.length < 2 || !k || seen.has(k) || LONG_DIGITS.test(w)) return false; seen.add(k); return true; }).slice(0, 80); };
    out[g.key] = { words: clean(src.words) };
    out[g.key].not = clean(src.not);
  });
  return out;
}
function withVersion(store, words, from) {
  const now = new Date().toISOString(), vs = smsWordVersions(store).filter(v => v.from !== from);
  const prev = smsWordVersions(store).find(v => v.from === from);
  const v = { id: prev ? prev.id : 'sw-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10), from, words: cleanSmsWords(words), createdAt: prev ? prev.createdAt : now, updatedAt: now };
  return { v, versions: vs.concat(v).sort((a, b) => a.from.localeCompare(b.from)) };
}
const READ_KINDS = new Set(['sms_unparsed', 'sms_unknown', 'sms_new_bank_info']);
// وش انقرأ من الرسالة (بدون النص): يتخزن على الرسالة وقت القراءة والتصحيح
function readKey(info) { const x = infoSummary(info); if (!x) return null; delete x.type; return x; }
const readSummary = (k) => k ? Object.assign({ type: SMS_FAMILY_L[k.family] || k.family || '—' }, k) : null;
function infoSummary(info) {
  if (!info) return null;
  return { family: info.family || null, type: SMS_FAMILY_L[info.family] || info.family || '—', amount: info.grossAmount || null, name: info.merchantRaw || info.beneficiaryRaw || info.counterpartyName || info.billerRaw || null,
    method: info.paymentMethod || ((info.family === 'sms_purchase' || info.family === 'sms_refund') ? 'POS' : null), balance: info.balanceAfter != null ? info.balanceAfter : null, fee: info.feeAmount || null };
}
// 1.7.1: القراءة بالصيغة المعتمدة. اللي ما لها صيغة: تخمين (guess: true) للاقتراح ولمقارنة العمليات القديمة بس
function readInfo(store, m, W) {
  const R = SR(), text = R.norm(m.text || ''), san = sanitizeText(text), fmt = matchSmsFormat(store, san, m.sender);
  if (fmt && fmt.role === 'info') return { cls: 'informational', info: { parser: 'format', templateId: fmt.id, missing: [], ok: false }, format: fmt };
  if (fmt) return { cls: 'financial', info: sanitizeInfo(smsFamilyFix(formatInfo(store, fmt, san, W) || { parser: 'format', missing: ['format'], ok: false })), format: fmt };
  const c = R.classify(text, W);
  const recv = (m.source || 'paste') === 'paste' ? null : String(m.receivedAt || '').slice(0, 10) || null;
  const info = sanitizeInfo(smsFamilyFix(guessSmsInfo(store, text, m.sender, recv, W)));
  return { cls: c.cls, info, guess: true };
}
const hasStatementLink = (t) => (t.sourceLinks || []).some(sl => sl.sourceType === 'account_statement' || sl.sourceType === 'card_statement');
// المدموجة مع كشف: وش يتصحح فعلًا (وسيلة الدفع، والاسم إذا ناقص). نفس الحساب في المعاينة والتصحيح
function limitedFix(t, info) {
  const out = {}, fam = info.family, pay = t.transactionType === 'Payment' || t.transactionType === 'Refund';
  if ((fam === 'sms_purchase' || fam === 'sms_refund') && t.transactionType === (fam === 'sms_refund' ? 'Refund' : 'Payment')) { const pm = info.paymentMethod || 'POS'; if (pm !== t.paymentMethod) out.method = pm; }
  if (!t.merchantRaw && !t.beneficiaryRaw && !t.counterpartyName) {
    if (pay) { if (info.merchantRaw) { out.name = info.merchantRaw; out.nameField = 'merchantRaw'; } }
    else if (t.direction === 'out' && info.beneficiaryRaw) { out.name = info.beneficiaryRaw; out.nameField = 'beneficiaryRaw'; }
    else if (t.direction === 'in' && info.counterpartyName) { out.name = info.counterpartyName; out.nameField = 'counterpartyName'; }
  }
  return out;
}
// الحقول اللي بتتغير فعلًا في العملية (مو بس في القراءة)
function realFields(t, fields, B) {
  return fields.filter(k => {
    if (k === 'family') return t.typeSource !== 'user'; // النوع اللي غيّرته بيدك يبقى
    if (k === 'amount') return t.grossAmount !== B.amount;
    if (k === 'method') return (t.paymentMethod || null) !== (B.method || null);
    if (k === 'name') return (t.merchantRaw || t.beneficiaryRaw || t.counterpartyName || null) !== (B.name || null);
    if (k === 'balance') return (t.balanceAfter == null ? null : t.balanceAfter) !== B.balance;
    if (k === 'fee') return (t.feeAmount || null) !== (B.fee || null);
    return true;
  });
}
// المعاينة: وش يتغير لو حفظت الكلمات من تاريخ from (بدون أي تعديل على البيانات)
function previewSmsWords(store, words, from) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from || ''))) return { error: 'date' };
  const { v, versions } = withVersion(store, words, from), oldVs = smsWordVersions(store);
  const open = new Map(store.all('reviews').filter(r => r.status === 'open' && r.messageId).map(r => [r.messageId, r]));
  const out = { from, readable: [], infoToTx: [], changes: [], unreadable: [] };
  store.all('messages').forEach(m => {
    if (!m.text || !['tx', 'merged', 'review', 'informational'].includes(m.status)) return;
    const d = msgWordsDate(store, m); if (d < from) return;
    const nv = wordVersionAt(versions, d); if (!nv || nv.id !== v.id) return; // نسخة أحدث تغطي هذا التاريخ
    const newW = compiledWordsOf(Object.assign({}, v, { updatedAt: 'preview' + v.updatedAt })), oldW = compiledWordsOf(wordVersionAt(oldVs, d));
    // 1.7.1: الرسالة اللي ما لها صيغة معتمدة تتعرّف من «المراجعة» (مو بالكلمات)، فالكلمات تصحح العمليات المحفوظة بس
    if (m.status === 'review' || m.status === 'informational') return;
    const b = readInfo(store, m, newW);
    const t = m.txId ? store.get('transactions', m.txId) : null; if (!t) return;
    const A = m.readAs ? readSummary(m.readAs) : infoSummary(readInfo(store, m, oldW).info), B = infoSummary(b.info);
    const fields = ['family', 'amount', 'name', 'method', 'balance', 'fee'].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
    if (!fields.length) return;
    const limited = m.status === 'merged' || hasStatementLink(t);
    if (!b.info.ok || b.cls !== 'financial') { out.unreadable.push({ messageId: m.id, txId: t.id, date: d, before: A }); return; }
    // مدموجة مع كشف: قيم الكشف تبقى، فالتصحيح لوسيلة الدفع (والاسم إذا ناقص) بس
    let eff;
    if (limited) { const L = limitedFix(t, b.info); eff = fields.filter(k => (k === 'method' && L.method) || (k === 'name' && L.name)); }
    else eff = realFields(t, fields, B);
    if (!eff.length) return;
    out.changes.push({ messageId: m.id, txId: t.id, date: d, before: A, after: B, fields: eff, limited });
  });
  const byDate = (x, y) => String(y.date).localeCompare(String(x.date));
  out.readable.sort(byDate); out.infoToTx.sort(byDate); out.changes.sort(byDate); out.unreadable.sort(byDate);
  return out;
}
// تصحيح عملية من رسالتها بالكلمات الجديدة: اللي انقرأ من الرسالة بس. تعديلاتك (التصنيف اليدوي، الأغراض، المدينة، المجموعات، الملاحظة، النوع اللي غيّرته) تبقى
async function correctTxFromMessage(store, txId, msgId, W) {
  const t = store.get('transactions', txId), m = store.get('messages', msgId); if (!t || !m || !m.text) return false;
  const { cls, info } = readInfo(store, m, W); if (cls !== 'financial' || !info.ok) return false;
  const now = new Date().toISOString();
  const resolveM = (raw) => { const pm = new Map(); const mer = resolveMerchant(store, raw, pm); pm.forEach(x => { const c = Object.assign({}, x); delete c._new; delete c._aliasAdded; store.put('merchants', c); }); store.all('merchants').forEach(x => { if (x._aliasAdded) { delete x._aliasAdded; store.put('merchants', x); } }); return mer; };
  if (m.status === 'merged' || hasStatementLink(t)) {
    const L = limitedFix(t, info); if (!L.method && !L.name) return false;
    if (L.method) t.paymentMethod = L.method;
    if (L.name && L.nameField !== 'merchantRaw') t[L.nameField] = L.name;
    else if (L.name) { t.merchantRaw = L.name; const mer = resolveM(L.name); if (mer && !t.merchantLocked) { t.merchantId = mer.id; if (!t.categoryId && t.categorySource !== 'user_txn') applyMerchantCategory(t, mer, null); markShopChoice(store, t); } }
    t.updatedAt = now; t.wordsCorrectedAt = now; store.put('transactions', t);
    m.readAs = readKey(info); store.put('messages', m); closePartial(store, t, info); return true;
  }
  const acc = store.get('accounts', t.accountId); if (!acc) return false;
  const plan = { id: uid(), kind: 'sms', sourceType: 'sms', newAccounts: new Map(), newInstruments: new Map(), newBeneficiaries: new Map(), newMerchants: new Map(), newCities: new Map(), txs: [], msgRecords: [], reviews: [], held: new Map(), warnings: [] };
  info.transactionDate = t.transactionDate; info.time = t.time; info.fingerprints = m.ids || [];
  const nt = await buildTx(store, plan, planHelpers(store, plan), acc, info, { raw: m.text, balance: info.balanceAfter != null ? info.balanceAfter : null, rowIndex: 0 }, 'sms', m.id);
  plan.newAccounts.forEach(a => store.put('accounts', a)); plan.newInstruments.forEach(i => store.put('instruments', i));
  plan.newBeneficiaries.forEach(b => { const c = Object.assign({}, b); delete c._new; store.put('beneficiaries', c); });
  plan.newMerchants.forEach(x => { const c = Object.assign({}, x); delete c._new; delete c._aliasAdded; store.put('merchants', c); });
  store.all('merchants').forEach(x => { if (x._aliasAdded) { delete x._aliasAdded; store.put('merchants', x); } });
  ['grossAmount', 'principalAmount', 'feeAmount', 'vatAmount', 'feeTaxBreakdownKnown', 'paymentMethod', 'balanceAfter', 'reference', 'foreignAmount', 'foreignCurrency', 'merchantRaw', 'beneficiaryRaw', 'counterpartyName'].forEach(k => { if (nt[k] !== undefined) t[k] = nt[k]; });
  if (nt.instrumentId) t.instrumentId = nt.instrumentId;
  // النوع وتوابعه (البطاقة المسددة، المستفيد، الحساب المقابل) يتصحح بس إذا ما غيّرته بيدك
  if (t.typeSource !== 'user') {
    ['direction', 'transactionType', 'transferSubtype', 'incomeSubtype', 'classificationStatus', 'counterpartyAccountId', 'transferLinkStatus', 'targetCardLast4'].forEach(k => { t[k] = nt[k] === undefined ? null : nt[k]; });
    t.beneficiaryId = nt.beneficiaryId || null;
  }
  if (info.online || t.paymentMethod === 'Online' || ONLINE_SHOP.test(t.merchantRaw || '')) t.onlineHint = true; else delete t.onlineHint;
  if (!t.merchantLocked && (t.merchantId || null) !== (nt.merchantId || null) && !(nt.merchantId && t.shopChoicePending === false && t.invoiceAlias && invoiceAliasOf(nt) === t.invoiceAlias)) { t.merchantId = nt.merchantId || null; t.shopChoicePending = !!nt.shopChoicePending; t.invoiceAlias = nt.invoiceAlias || null; }
  if (t.categorySource !== 'user_txn' && t.categorySource !== 'user_rule') { t.categoryId = nt.categoryId || null; t.subcategoryId = nt.subcategoryId || null; t.categorySource = nt.categorySource || null; }
  t.updatedAt = now; t.wordsCorrectedAt = now; store.put('transactions', t);
  m.readAs = readKey(info); store.put('messages', m); closePartial(store, t, info);
  applyRulesTo(store, [t.id]);
  return true;
}
// مراجعة «ناقصة الحقول» تنقفل إذا التصحيح كمّل الناقص
function closePartial(store, t, info) {
  const missing = (info.missing || []).filter(k => k !== 'amount');
  if (missing.length || ((t.transactionType === 'Payment' || t.transactionType === 'Refund') && !t.merchantRaw)) return;
  const now = new Date().toISOString();
  store.all('reviews').filter(r => r.status === 'open' && r.kind === 'sms_partial' && r.txId === t.id).forEach(r => { Object.assign(r, { status: 'resolved', resolution: 'words_corrected', resolvedAt: now }); store.put('reviews', r); });
}
// حفظ الكلمات من تاريخ، ومعه اللي اخترته من المعاينة: sel = {readable: [msgId], infoToTx: [msgId], changes: [txId]}
async function applySmsWords(store, words, from, sel) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from || ''))) return { error: 'date' };
  sel = sel || {};
  const pv = previewSmsWords(store, words, from); // قبل الحفظ: نتأكد إن المختار فعلًا يتأثر
  // رسائل من قبل 1.6.1 ما عندها «وش انقرأ منها»: تتثبت بقراءتها قبل التعديل، عشان اللي ما تصححه الحين يطلع لك في المعاينة الجاية
  const oldVs = smsWordVersions(store), nx = withVersion(store, words, from);
  store.all('messages').forEach(m => {
    if (m.readAs || !m.text || !['tx', 'merged'].includes(m.status)) return;
    const d = msgWordsDate(store, m); if (d < from) return;
    const at = wordVersionAt(nx.versions, d); if (!at || at.id !== nx.v.id) return;
    const r = readInfo(store, m, compiledWordsOf(wordVersionAt(oldVs, d)));
    if (r.info.ok) { m.readAs = readKey(r.info); store.put('messages', m); }
  });
  const s = store.settings, { v, versions } = withVersion(store, words, from);
  s.smsWords = { versions }; store.put('settings', s);
  const W = compiledWordsOf(v);
  let corrected = 0;
  const want = new Set(sel.changes || []);
  for (const c of pv.changes) { if (want.has(c.txId) && await correctTxFromMessage(store, c.txId, c.messageId, W)) { corrected++; const mm = store.get('messages', c.messageId); if (mm) { mm.wordsVersion = v.id; store.put('messages', mm); } } }
  const offered = new Set(pv.readable.concat(pv.infoToTx).map(x => x.messageId)); // المختار لازم يكون في المعاينة الحالية (ضغط مرتين ما يكرر)
  const ids = (sel.readable || []).concat(sel.infoToTx || []).filter(id => offered.has(id) && store.get('messages', id));
  let created = 0;
  if (ids.length) { const plan = await reprocessMessages(store, ids); if (plan) { const r = commitSms(store, plan, { markReview: true }); created = r.created || 0; } }
  if (corrected) pairTransfers(store);
  store.touch();
  return { version: v, corrected, created };
}
function deleteSmsWordsVersion(store, id) {
  const s = store.settings, vs = smsWordVersions(store); if (!vs.some(v => v.id === id)) return null;
  s.smsWords = { versions: vs.filter(v => v.id !== id) }; store.put('settings', s); store.touch(); return true;
}
/* ---------- 1.6.0: أسماء المحلات ----------
   المحل له: name = اسم الفاتورة (أو اسم المتجر المعروف)، userName = الاسم اللي سميته (اختياري)، aliases = أسماء الفواتير اللي توصل له.
   المعروض = اسمك، وإذا ما سميته = اسم الفاتورة.
   اسم فاتورة لأكثر من محل («اسم آخر لهذه الفاتورة»): نفس الاسم في aliases لكل محل، وواحد منهم الافتراضي (defaultFor).
   العملية الجديدة لاسم فاتورة له أكثر من محل تاخذ الافتراضي وتنعلّم shopChoicePending لين تختار. العمليات القديمة ما تتغير. */
const shopKey = (s) => normAr(s);
function merchantName(m) { return m ? String(m.userName || m.name || '') : ''; }
function invoiceAliasOf(tx) { return tx && tx.merchantRaw ? (normMerchant(tx.merchantRaw) || null) : null; }
function shopsForAlias(store, norm) { return norm ? store.all('merchants').filter(m => (m.aliases || []).includes(norm)) : []; }
function defaultShopFor(store, norm) { const hits = shopsForAlias(store, norm); return hits.find(x => (x.defaultFor || []).includes(norm)) || hits[0] || null; }
// المحلات المحتملة لعملية (الافتراضي أول)
function shopChoices(store, tx) {
  const norm = tx.invoiceAlias || invoiceAliasOf(tx), def = defaultShopFor(store, norm);
  return shopsForAlias(store, norm).sort((a, b) => (b === def) - (a === def) || merchantName(a).localeCompare(merchantName(b), 'ar'));
}
function markShopChoice(store, tx) {
  if (!tx || !tx.merchantId || tx.merchantLocked) return false;
  const norm = invoiceAliasOf(tx), shops = shopsForAlias(store, norm);
  if (shops.length > 1 && shops.some(x => x.id === tx.merchantId)) { tx.shopChoicePending = true; tx.invoiceAlias = norm; return true; }
  return false;
}
// دمج عمليتين: اختيارك للمحل ما يضيع
function carryShop(keep, drop) {
  if (!keep || !drop) return;
  let moved = false;
  if (drop.merchantLocked && !keep.merchantLocked && drop.merchantId) { keep.merchantId = drop.merchantId; keep.merchantLocked = true; keep.shopChoicePending = false; moved = true; }
  else if (keep.shopChoicePending && drop.merchantId && drop.invoiceAlias && !drop.shopChoicePending) { keep.merchantId = drop.merchantId; keep.shopChoicePending = false; moved = true; }
  // المحل انتقل: تصنيفه معه (إلا اللي صنفتها يدويًا للباقية)
  if (moved && keep.categorySource !== 'user_txn' && keep.categorySource !== 'user_rule') { keep.categoryId = drop.categoryId || null; keep.subcategoryId = drop.subcategoryId || null; keep.categorySource = drop.categorySource || null; }
}
function prettyInvoiceName(raw) {
  const n = normMerchant(raw || ''); if (!n) return '';
  if (/[؀-ۿ]/.test(n)) return n;
  return n.toLowerCase().replace(/(^|[\s&'.-])([a-z])/g, (a, b, c) => b + c.toUpperCase());
}
// اسم مطابق = نفس الاسم بعد تجاهل المسافات وأ/ا/إ/آ وة/ه وى/ي والتشكيل والحروف الكبيرة/الصغيرة. مشابه = واحد داخل الثاني
function checkShopName(store, name, exceptId) {
  const k = shopKey(name); const out = { exact: null, similar: [] }; if (!k) return out;
  store.all('merchants').forEach(m => {
    if (m.id === exceptId) return;
    const mk = shopKey(merchantName(m)); if (!mk) return;
    if (mk === k) { if (!out.exact) out.exact = m; }
    else if (Math.min(mk.length, k.length) >= 2 && (mk.includes(k) || k.includes(mk))) out.similar.push(m);
  });
  return out;
}
// اقتراحات وأنت تكتب (من الجهاز بدون إنترنت): الأسماء المسجلة المشابهة + اسم الفاتورة منظف + المتاجر المعروفة
function shopNameIdeas(store, typed, ctx) {
  ctx = ctx || {};
  const k = shopKey(typed), existing = [], ideas = [], seen = new Set();
  store.all('merchants').forEach(m => {
    if (m.id === ctx.exceptId || existing.length >= 6) return;
    const mk = shopKey(merchantName(m)); if (!mk || !k) return;
    if (mk.includes(k) || (k.length >= 2 && k.includes(mk))) { existing.push({ id: m.id, name: merchantName(m) }); seen.add(mk); }
  });
  const cur = ctx.exceptId ? store.get('merchants', ctx.exceptId) : null;
  if (cur) seen.add(shopKey(merchantName(cur)));
  const add = (name) => { const nk = shopKey(name); if (!nk || seen.has(nk) || ideas.length >= 5) return; seen.add(nk); ideas.push(name); };
  const raw = ctx.raw || (cur && cur.name) || '';
  if (raw) {
    const norm = normMerchant(raw), seed = seedMerchantFor(norm), bill = BILLERS.find(b => b.re.test(raw));
    if (seed) add(seed.name); if (bill) add(bill.merchant);
    add(prettyInvoiceName(raw));
  }
  if (k) MERCHANT_SEED.map(x => x.name).concat(BILLERS.map(b => b.merchant)).forEach(n => { if (shopKey(n).includes(k)) add(n); });
  return { existing, ideas };
}
// تسمية المحل لكل عملياته (أول تسمية أو «لكل العمليات»). اسم مطابق لمحل ثاني ممنوع بدون دمج (يرجع exact)
function setShopName(store, merchantId, name) {
  const m = store.get('merchants', merchantId); if (!m) return { error: 'missing' };
  const nm = cleanText(name || '').slice(0, 60);
  const c = checkShopName(store, nm || m.name, m.id); if (c.exact) return { error: 'exact', other: c.exact }; // حتى الرجوع لاسم الفاتورة: ما يصير اسمين متطابقين
  m.userName = nm || null; m.updatedAt = new Date().toISOString();
  store.put('merchants', m); store.touch(); return { merchant: m };
}
const SHOP_CAT_TYPES = new Set(['Payment', 'Refund', 'CashExpense']);
const shopCatOk = (t) => (SHOP_CAT_TYPES.has(t.transactionType) || (t.transactionType === 'Unknown' && t.direction === 'out')) && t.transferSubtype !== 'round_up';
// العملية تنتقل لمحل: تصنيفها يمشي على تصنيف المحل (إلا اللي صنفتها يدويًا للعملية أو بقاعدة)
function moveTxToShop(store, t, m) {
  t.merchantId = m.id; t.shopChoicePending = false;
  const cat = m.categoryId || m.suggestedCategoryId;
  if (shopCatOk(t) && t.categorySource !== 'user_txn' && t.categorySource !== 'user_rule') {
    if (cat) { promoteUnknown(t, cat); applyMerchantCategory(t, m, null); }
    // المحل الجديد ما له تصنيف: التصنيف اللي جاء من المحل السابق ما يبقى
    else if (t.categorySource === 'merchant' || t.categorySource === 'seed') { t.categoryId = null; t.subcategoryId = null; t.categorySource = null; }
  }
  t.updatedAt = new Date().toISOString(); store.put('transactions', t);
}
function newShop(store, t, nm, invoiceName, cat, sub) {
  const m = { id: uid(), name: invoiceName || nm, userName: nm, seedKey: null, aliases: [], keywords: [], categoryId: cat || null, subcategoryId: cat ? (sub || null) : null,
    categorySource: cat ? 'user' : null, suggestedCategoryId: null, suggestedSubcategoryId: null, defaultRecurrenceType: null, defaultNecessityType: null, createdAt: new Date().toISOString() };
  store.put('merchants', m); return m;
}
// «هذه المرة فقط»: العملية وحدها تروح لمحل ثاني (موجود بنفس الاسم أو جديد). اسم الفاتورة يبقى على محله للعمليات الثانية
function txShopOnce(store, txId, name, merchantId) {
  const t = store.get('transactions', txId); if (!t) return { error: 'missing' };
  const nm = cleanText(name || '').slice(0, 60);
  let target = merchantId ? store.get('merchants', merchantId) : (nm ? checkShopName(store, nm, null).exact : null);
  if (!target && !nm) return { error: 'empty' };
  if (target && target.id === t.merchantId) return { error: 'same' };
  if (!target) target = newShop(store, t, nm, nm, t.categoryId, t.subcategoryId); // المحل الجديد ياخذ تصنيف العملية الحالي
  moveTxToShop(store, t, target); t.merchantLocked = true; store.put('transactions', t); store.touch();
  return { merchant: target, tx: t };
}
// «اسم آخر لهذه الفاتورة»: اسم الفاتورة يصير لأكثر من محل. العملية تروح للمحل الثاني، والقديمة تبقى على الأول.
// defaultId = المحل الافتراضي للعمليات الجاية اللي ما تختار لها. cat/sub = تصنيف المحل الجديد
function addShopForInvoice(store, txId, o) {
  o = o || {};
  const t = store.get('transactions', txId); if (!t) return { error: 'missing' };
  const norm = invoiceAliasOf(t); if (!norm) return { error: 'no_invoice' };
  // المحل الأول = صاحب اسم الفاتورة. عملية «هذه المرة فقط» محلها لمرة وحدة، فما ياخذ اسم الفاتورة
  const cur = t.merchantId ? store.get('merchants', t.merchantId) : null;
  const first = cur && !t.merchantLocked && (cur.aliases || []).includes(norm) ? cur : defaultShopFor(store, norm);
  const nm = cleanText(o.name || '').slice(0, 60);
  let target = o.merchantId ? store.get('merchants', o.merchantId) : (nm ? checkShopName(store, nm, null).exact : null);
  if (!target && !nm) return { error: 'empty' };
  if (target && first && target.id === first.id) return { error: 'same' };
  if (!target) target = newShop(store, t, nm, first ? first.name : prettyInvoiceName(t.merchantRaw), o.categoryId !== undefined ? o.categoryId : t.categoryId, o.categoryId !== undefined ? o.subcategoryId : t.subcategoryId);
  [first, target].forEach(m => { if (m && !(m.aliases || []).includes(norm)) { m.aliases = (m.aliases || []).concat(norm); store.put('merchants', m); } });
  setShopDefault(store, norm, o.defaultNew ? target.id : (o.defaultId || (first ? first.id : target.id)));
  moveTxToShop(store, t, target); t.invoiceAlias = norm; t.merchantLocked = false; store.put('transactions', t); store.touch();
  return { merchant: target, shops: shopsForAlias(store, norm) };
}
function setShopDefault(store, norm, merchantId) {
  shopsForAlias(store, norm).forEach(m => {
    const had = (m.defaultFor || []).includes(norm), want = m.id === merchantId;
    if (had === want) return;
    m.defaultFor = want ? (m.defaultFor || []).concat(norm) : m.defaultFor.filter(x => x !== norm); store.put('merchants', m);
  });
  store.touch();
}
// اخترت محل لعملية فاتورتها تحتمل أكثر من محل
function chooseShop(store, txId, merchantId) {
  const t = store.get('transactions', txId), m = store.get('merchants', merchantId); if (!t || !m) return null;
  if (!t.invoiceAlias) t.invoiceAlias = invoiceAliasOf(t);
  moveTxToShop(store, t, m); store.touch(); return t;
}
function shopChoiceTxs(store) { return store.all('transactions').filter(t => t.shopChoicePending); }
// محلين بتصنيفين مختلفين: الدمج يسأل أي تصنيف يبقى
function mergeCatConflict(a, b) {
  const ca = a && (a.categoryId ? [a.categoryId, a.subcategoryId || null] : null), cb = b && (b.categoryId ? [b.categoryId, b.subcategoryId || null] : null);
  return !!(ca && cb && (ca[0] !== cb[0] || ca[1] !== cb[1]));
}
// دمج محلين: كل عمليات «drop» تصير لـ«keep»، وأسماء فواتيره تنضاف له، ويطلع مرة وحدة بتصنيف واحد ومجموع واحد في كل مكان.
// o.catFrom: 'keep' | 'drop' (أي تصنيف يبقى)، o.name: الاسم النهائي
function mergeMerchants(store, keepId, dropId, o) {
  o = o || {};
  const keep = store.get('merchants', keepId), drop = store.get('merchants', dropId);
  if (!keep || !drop || keep.id === drop.id) return null;
  const uni = (a, b) => Array.from(new Set((a || []).concat(b || [])));
  keep.aliases = uni(keep.aliases, drop.aliases); keep.keywords = uni(keep.keywords, drop.keywords); keep.defaultFor = uni(keep.defaultFor, drop.defaultFor);
  if (!keep.seedKey && drop.seedKey) keep.seedKey = drop.seedKey;
  { const extra = [drop.seedKey].concat(drop.seedKeys || [], keep.seedKeys || []).filter(k => k && k !== keep.seedKey); if (extra.length) keep.seedKeys = Array.from(new Set(extra)); } // المتجر المعروف للمدموج يوصل له كمان
  const oldCat = [keep.categoryId || null, keep.subcategoryId || null];
  if (o.catFrom === 'drop' || (!keep.categoryId && drop.categoryId)) { keep.categoryId = drop.categoryId || null; keep.subcategoryId = drop.subcategoryId || null; keep.categorySource = drop.categorySource || null; }
  if (!keep.suggestedCategoryId && drop.suggestedCategoryId) { keep.suggestedCategoryId = drop.suggestedCategoryId; keep.suggestedSubcategoryId = drop.suggestedSubcategoryId || null; }
  ['defaultRecurrenceType', 'defaultNecessityType', 'isCommitment', 'savingsEligible', 'notes'].forEach(k => { if (keep[k] == null && drop[k] != null) keep[k] = drop[k]; });
  if (o.name !== undefined) keep.userName = cleanText(o.name || '').slice(0, 60) || null;
  else if (!keep.userName && drop.userName) keep.userName = drop.userName;
  keep.updatedAt = new Date().toISOString(); store.put('merchants', keep);
  const catChanged = oldCat[0] !== (keep.categoryId || null) || oldCat[1] !== (keep.subcategoryId || null);
  const cat = keep.categoryId || keep.suggestedCategoryId;
  let moved = 0;
  const fix = (t, n) => {
    const was = t.merchantId; if (was !== drop.id && !(was === keep.id && catChanged)) return;
    t.merchantId = keep.id;
    // نفس قاعدة «صنّف التاجر»: كل عملياته إلا اللي صنفتها يدويًا للعملية أو بقاعدة
    if (cat && t.categorySource !== 'user_txn' && t.categorySource !== 'user_rule' && t.transferSubtype !== 'round_up') { promoteUnknown(t, cat); applyMerchantCategory(t, keep, null); }
    store.put(n, t); if (was === drop.id && n === 'transactions') moved++;
  };
  store.all('transactions').forEach(t => fix(t, 'transactions'));
  store.all('deletedTxs').forEach(t => fix(t, 'deletedTxs'));
  store.all('reviews').forEach(r => { if (r.heldTx && r.heldTx.merchantId === drop.id) { r.heldTx.merchantId = keep.id; store.put('reviews', r); } });
  store.all('rules').forEach(r => { let ch = false; ['when', 'then'].forEach(k => { if (r[k] && r[k].merchantId === drop.id) { r[k].merchantId = keep.id; ch = true; } }); if (ch) store.put('rules', r); });
  store.all('products').forEach(p => { if (p.lastMerchantId === drop.id) { p.lastMerchantId = keep.id; store.put('products', p); } });
  const RANK = { confirmed: 3, dismissed: 2, suggested: 1 };
  store.all('recurring').filter(r => r.subjectType === 'merchant' && r.subjectId === drop.id).forEach(r => {
    const dup = store.all('recurring').find(x => x.id !== r.id && x.subjectType === 'merchant' && x.subjectId === keep.id && (x.accountId || null) === (r.accountId || null));
    if (!dup) { r.subjectId = keep.id; store.put('recurring', r); return; }
    const keepR = (RANK[r.status] || 0) > (RANK[dup.status] || 0) ? r : dup, dropR = keepR === r ? dup : r;
    keepR.subjectId = keep.id; store.put('recurring', keepR); store.remove('recurring', dropR.id);
    store.all('reserves').filter(x => x.recurringId === dropR.id).forEach(x => { x.recurringId = keepR.id; store.put('reserves', x); });
  });
  const s = store.settings, ex = s.rateExclusions || [];
  if (ex.some(e => e.type === 'merchant' && e.id === drop.id)) {
    s.rateExclusions = ex.filter(e => !(e.type === 'merchant' && e.id === drop.id));
    if (!s.rateExclusions.some(e => e.type === 'merchant' && e.id === keep.id)) s.rateExclusions.push({ type: 'merchant', id: keep.id });
    store.put('settings', s);
  }
  // 1.7.1: خطة الالتزام (المبلغ المعتمد وقراراتك) تنتقل مع الدمج: المعتمدة تغلب، وعلامات الدفعات تنجمع
  { const s2 = store.settings, plans = Object.assign({}, s2.commitPlans || {}), kd = 'merchant:' + drop.id, kk = 'merchant:' + keep.id;
    if (plans[kd]) {
      const A = plans[kk], B = plans[kd], main = !A ? B : (A.status === 'approved' || B.status !== 'approved') ? A : B, other = main === A ? B : A;
      plans[kk] = other ? Object.assign({}, main, { marks: Object.assign({}, other.marks || {}, main.marks || {}), multi: Object.assign({}, other.multi || {}, main.multi || {}) }) : main;
      delete plans[kd]; s2.commitPlans = plans; store.put('settings', s2);
    } }
  store.remove('merchants', drop.id);
  refreshShopChoices(store); store.touch();
  return { merchant: keep, moved };
}
// بعد الدمج: اسم فاتورة ما عاد له إلا محل واحد ← العمليات ما تحتاج اختيار
function refreshShopChoices(store) {
  let n = 0;
  store.all('transactions').forEach(t => { if (t.shopChoicePending && shopsForAlias(store, t.invoiceAlias).length < 2) { t.shopChoicePending = false; store.put('transactions', t); n++; } });
  store.all('deletedTxs').forEach(t => { if (t.shopChoicePending && shopsForAlias(store, t.invoiceAlias).length < 2) { t.shopChoicePending = false; store.put('deletedTxs', t); } });
  store.all('reviews').forEach(r => { const t = r.heldTx; if (t && t.shopChoicePending && shopsForAlias(store, t.invoiceAlias).length < 2) { t.shopChoicePending = false; store.put('reviews', r); } });
  store.all('merchants').forEach(m => { const d = (m.defaultFor || []).filter(a => shopsForAlias(store, a).length > 1); if (d.length !== (m.defaultFor || []).length) { m.defaultFor = d; store.put('merchants', m); } });
  return n;
}

/* ---------- 1.6.0: العمليات الجديدة اللي ما راجعتها ---------- */
function markReviewed(store, ids) {
  const now = new Date().toISOString(); let n = 0;
  (ids || []).forEach(id => { const t = store.get('transactions', id); if (t && t.needsReview) { t.needsReview = false; t.reviewedAt = now; store.put('transactions', t); n++; } });
  if (n) store.touch(); return n;
}
function unreviewedTxs(store) { return store.all('transactions').filter(t => t.needsReview); }

/* ---------- 1.6.0: علامة «بدون مدينة» وفترات التجاهل ---------- */
// العلامة: المشتريات والسحب والمصروف النقدي اللي ما لها مدينة معتمدة (ما لها، أو اقتراح ما اعتمدته)، إلا «اتركها غير محددة»
const CITY_MARK_TYPES = new Set(['Payment', 'CashWithdrawal', 'CashExpense']);
function needsCity(store, t) {
  return CITY_MARK_TYPES.has(t.transactionType) && t.direction === 'out' && !t.cityId && !t.cityDismissed && !isExcluded(store, t);
}
// فترة تجاهل: {id, from, to, city, category}. داخلها تختفي العلامات وما تطلع في «بيانات تحتاج قرارك». الأرقام ما تتغير
function isIgnored(store, t, kind) {
  const d = txDate(t); if (!d) return false;
  return (store.settings.ignorePeriods || []).some(p => p[kind] && d >= p.from && d <= p.to);
}
/* ---------- 1.7.0: «الفترات» ----------
   من تاريخ لتاريخ، وفيها أي مجموعة من: مدينة، مجموعة، تجاهل علامات (المدينة و/أو التصنيف).
   {id, from, to, cityId, cityMode: 'all'|'noCity', groupId, city, category (التجاهل), note, createdAt, updatedAt}
   المدينة: للمشتريات والسحب والمصروف النقدي بس (مو الأونلاين ولا التحويلات لأشخاص ولا الرسوم).
     «كل العمليات» تغيّر حتى اللي حطيت مدينتها بيدك (وترجع قيمتها القديمة إذا حذفت الفترة)، و«اللي بدون مدينة بس» ما تلمس اللي لها مدينة.
     اللي موقع الجوال (GPS) فيها مدينة ثانية ما تتغير أبدًا: تطلع في «N عمليات موقعها مختلف» وتقرر فيها.
   المجموعة: كل الصرف (مشتريات، سحب، نقدي، تحويلات لأشخاص، رسوم)، مو الدخل ولا التحويل بين حساباتك ولا سداد البطاقات (ولا رسومهم، 1.7.1).
     العملية اللي شلت منها المجموعة بيدك ما ترجع لها.
   العمليات اللي توصل بعدين داخل الفترة تاخذ المدينة والمجموعة تلقائيًا. حذف الفترة أو تعديلها يرجّع اللي جا منها بس، وتعديلاتك اليدوية تبقى. */
const isOnlineTx = (t) => t.paymentMethod === 'Online' || !!t.onlineHint;
function periodCityOk(t) { return CITY_MARK_TYPES.has(t.transactionType) && t.direction === 'out' && !isOnlineTx(t) && spendEffect(t) > 0; }
const PERIOD_GROUP_SKIP = new Set(['Income', 'InternalTransfer', 'CreditCardPayment', 'CashDeposit', 'LoanToPerson', 'LoanRepayment', 'Refund']);
// الصرف كله. 1.7.1: التحويل بين حساباتك وسداد البطاقة ما يدخلون المجموعة أبدًا، ولا رسومهم
const PERIOD_GROUP_NEVER = new Set(['InternalTransfer', 'CreditCardPayment']);
function periodGroupOk(t) {
  if (t.direction !== 'out' || PERIOD_GROUP_NEVER.has(t.transactionType)) return false;
  return spendEffect(t) > 0 ? !PERIOD_GROUP_SKIP.has(t.transactionType) : feeOf(t) > 0;
}
// ترقية 1.7.1: اللي دخل مجموعة من «فترة» وهو تحويل داخلي أو سداد بطاقة يطلع منها (المجموعة اللي حطيتها بيدك تبقى)
function dropPeriodGroupTransfers(store) {
  let n = 0; const now = new Date().toISOString();
  ['transactions', 'deletedTxs'].forEach(tb => store.all(tb).forEach(t => {
    if (!t.periodGroups || !PERIOD_GROUP_NEVER.has(t.transactionType)) return;
    const gone = new Set(Object.values(t.periodGroups));
    t.groupIds = (t.groupIds || []).filter(g => !gone.has(g)); delete t.periodGroups; t.updatedAt = now; store.put(tb, t); if (tb === 'transactions') n++;
  }));
  return n;
}
const gpsCityOf = (t) => (!t.cityDismissed && t.suggestedCityId) || null;
const periodConflict = (t, cityId) => { const g = gpsCityOf(t); return !!(g && g !== cityId); };
const inPeriodRange = (t, p) => { const d = txDate(t); return !!d && d >= p.from && d <= p.to; };
const periodBorn = (p) => p.createdAt || p.updatedAt || '';
function periodsList(store) { return store.settings.ignorePeriods || []; }
function putPeriodCity(t, p, forced) {
  if (!t.periodCity) t.periodCity = { pid: p.id, prev: { cityId: t.cityId || null, cityAuto: !!t.cityAuto, cityDismissed: !!t.cityDismissed } };
  else t.periodCity = Object.assign({}, t.periodCity, { pid: p.id });
  if (forced) t.periodCity.forced = true; else delete t.periodCity.forced;
  t.cityId = p.cityId; delete t.cityAuto; delete t.cityDismissed;
}
function restorePeriodCity(t) {
  const pv = (t.periodCity && t.periodCity.prev) || {};
  t.cityId = pv.cityId || null;
  if (pv.cityAuto) t.cityAuto = true; else delete t.cityAuto;
  if (pv.cityDismissed) t.cityDismissed = true; else delete t.cityDismissed;
  delete t.periodCity;
}
// mode: all = كل العمليات · noCity = اللي بدون مدينة بس (والتلقائي للي توصل بعدين يمشي بنفس «بدون مدينة»)
function applyPeriodCity(store, p, mode) {
  const out = { applied: 0, conflicts: 0 }; if (!p.cityId || !store.get('cities', p.cityId)) return out;
  const now = new Date().toISOString();
  store.all('transactions').forEach(t => {
    if (!inPeriodRange(t, p) || !periodCityOk(t) || t.cityId === p.cityId) return;
    if (t.cityManualAt && t.cityManualAt > periodBorn(p)) return; // عدلتها بيدك بعد الفترة: تبقى
    if (periodConflict(t, p.cityId)) { out.conflicts++; return; }
    if (mode !== 'all' && (t.cityId || t.cityDismissed)) return;
    putPeriodCity(t, p, false); t.updatedAt = now; store.put('transactions', t); out.applied++;
  });
  return out;
}
function applyPeriodGroup(store, p) {
  if (!p.groupId || !store.get('groups', p.groupId)) return 0;
  let n = 0; const now = new Date().toISOString();
  store.all('transactions').forEach(t => {
    if (!inPeriodRange(t, p) || !periodGroupOk(t)) return;
    if ((t.groupIds || []).includes(p.groupId) || (t.groupOptOut || []).includes(p.groupId)) return;
    t.groupIds = (t.groupIds || []).concat(p.groupId); t.periodGroups = Object.assign({}, t.periodGroups || {}, { [p.id]: p.groupId });
    t.updatedAt = now; store.put('transactions', t); n++;
  });
  return n;
}
// يرجّع اللي جا من الفترة بس: المدينة ترجع قيمتها القديمة (إذا ما غيّرتها بيدك)، والمجموعة تنشال (إلا إذا فترة ثانية حطتها)
function revertPeriod(store, p) {
  let n = 0; const now = new Date().toISOString();
  const tbl = (t) => store.get('transactions', t.id) === t ? 'transactions' : 'deletedTxs';
  store.all('transactions').concat(store.all('deletedTxs')).forEach(t => {
    let ch = false;
    if (t.periodCity && t.periodCity.pid === p.id) { if (t.cityId === p.cityId) restorePeriodCity(t); else delete t.periodCity; ch = true; }
    if (t.periodGroups && t.periodGroups[p.id]) {
      const g = t.periodGroups[p.id], pg = Object.assign({}, t.periodGroups); delete pg[p.id];
      if (!Object.values(pg).includes(g)) t.groupIds = (t.groupIds || []).filter(x => x !== g);
      if (Object.keys(pg).length) t.periodGroups = pg; else delete t.periodGroups; ch = true;
    }
    if (ch) { t.updatedAt = now; const tb = tbl(t); store.put(tb, t); if (tb === 'transactions') n++; }
  });
  return n;
}
// العمليات اللي وصلت بعد الفترة (أو صارت تنطبق عليها) تاخذ مدينتها ومجموعتها. ينادى بعد كل استيراد أو رسائل أو إدخال يدوي
function sweepPeriods(store) {
  let n = 0;
  dropPeriodGroupTransfers(store); // 1.7.1: عملية صارت تحويل داخلي أو سداد بطاقة بعد ما دخلت مجموعة الفترة تطلع منها
  periodsList(store).forEach(p => { if (p.cityId) n += applyPeriodCity(store, p, 'noCity').applied; if (p.groupId) n += applyPeriodGroup(store, p); });
  return n;
}
// اللي موقعها (GPS) مدينة ثانية: ما تتغير إلا إذا طلبت
function periodConflicts(store, p) {
  if (!p || !p.cityId || !store.get('cities', p.cityId)) return [];
  return store.all('transactions').filter(t => inPeriodRange(t, p) && periodCityOk(t) && t.cityId !== p.cityId && periodConflict(t, p.cityId) && !(t.cityManualAt && t.cityManualAt > periodBorn(p)));
}
function applyPeriodToConflicts(store, pid, ids) {
  const p = periodsList(store).find(x => x.id === pid); if (!p || !p.cityId || !store.get('cities', p.cityId)) return 0;
  const want = ids ? new Set(ids) : null, now = new Date().toISOString(); let n = 0;
  periodConflicts(store, p).forEach(t => { if (want && !want.has(t.id)) return; putPeriodCity(t, p, true); t.updatedAt = now; store.put('transactions', t); n++; });
  if (n) store.touch(); return n;
}
function savePeriod(store, d) {
  const ok = (x) => /^\d{4}-\d{2}-\d{2}$/.test(String(x || '')) ? x : null, from = ok(d.from), to = ok(d.to);
  if (!from || !to) return { error: 'dates' };
  if (from > to) return { error: 'order' };
  const cityId = d.cityId && store.get('cities', d.cityId) ? d.cityId : null, groupId = d.groupId && store.get('groups', d.groupId) ? d.groupId : null;
  if (!cityId && !groupId && !d.city && !d.category) return { error: 'kind' };
  const s = store.settings, list = periodsList(store).slice(), i = d.id ? list.findIndex(x => x.id === d.id) : -1, old = i >= 0 ? list[i] : null;
  if (d.id && !old) return { error: 'missing' };
  // «طبّق مدينة الفترة عليها كلها» يبقى بعد التعديل (للي لسا داخل الفترة)
  const forced = old ? store.all('transactions').filter(t => t.periodCity && t.periodCity.pid === old.id && t.periodCity.forced).map(t => t.id) : [];
  if (old) revertPeriod(store, old);
  const now = new Date().toISOString();
  const p = { id: old ? old.id : ('ig-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10)), from, to, cityId, cityMode: cityId ? (d.cityMode === 'all' ? 'all' : 'noCity') : null, groupId,
    city: !!d.city, category: !!d.category, note: cleanText(d.note || '').slice(0, 60), createdAt: old ? periodBorn(old) || now : now, updatedAt: now };
  if (i >= 0) list[i] = p; else list.push(p);
  s.ignorePeriods = list.sort((a, b) => b.from.localeCompare(a.from)); store.put('settings', s);
  const r = { period: p, cityApplied: 0, conflicts: 0, groupApplied: 0 };
  if (cityId) {
    const a = applyPeriodCity(store, p, p.cityMode); r.cityApplied = a.applied; r.conflicts = a.conflicts;
    if (forced.length) { const k = applyPeriodToConflicts(store, p.id, forced); r.cityApplied += k; r.conflicts = Math.max(0, r.conflicts - k); }
  }
  if (groupId) r.groupApplied = applyPeriodGroup(store, p);
  sweepPeriods(store); // فترة ثانية تغطي عمليات رجعت بعد التعديل
  store.touch();
  return r;
}
function deletePeriod(store, id) {
  const s = store.settings, list = periodsList(store), p = list.find(x => x.id === id); if (!p) return null;
  const n = revertPeriod(store, p);
  s.ignorePeriods = list.filter(x => x.id !== id); store.put('settings', s);
  sweepPeriods(store); store.touch();
  return { reverted: n };
}
// للتوافق مع 1.6.0
const saveIgnorePeriod = savePeriod;
function deleteIgnorePeriod(store, id) { return deletePeriod(store, id) ? true : null; }

/* ---------- 1.6.0: البحث في كل شي ----------
   يرجع null إذا ما تطابق، أو قائمة أسباب الظهور (فاضية إذا التطابق في الاسم الظاهر نفسه). المبلغ: 18 = 18.00 */
const AR_DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9 };
function searchQuery(q) {
  const raw = String(q || '').trim().replace(/[٠-٩]/g, d => AR_DIGITS[d]).replace(/٫/g, '.');
  const n = raw.replace(/[٬,\s]/g, ''); const amt = /^\d+(\.\d{1,2})?$/.test(n) ? cents(Number(n)) : null;
  return { raw: raw.toLowerCase(), key: normAr(raw), amt };
}
function searchTx(store, t, q) {
  const Q = typeof q === 'string' ? searchQuery(q) : q; if (!Q.raw) return [];
  const hit = (s) => { if (s == null || s === '') return false; const x = String(s); return x.toLowerCase().includes(Q.raw) || (!!Q.key && normAr(x).includes(Q.key)); };
  const m = t.merchantId ? store.get('merchants', t.merchantId) : null, b = t.beneficiaryId ? store.get('beneficiaries', t.beneficiaryId) : null;
  const a = t.accountId ? store.get('accounts', t.accountId) : null, ins = t.instrumentId ? store.get('instruments', t.instrumentId) : null;
  const why = []; let titleHit = false;
  const add = (r) => { if (why.length < 4 && !why.includes(r)) why.push(r); };
  if (hit(merchantName(m)) || hit(b && b.name) || (!m && !b && (hit(t.merchantRaw) || hit(t.beneficiaryRaw)))) titleHit = true;
  if (m && !titleHit && (hit(m.name) || hit(t.merchantRaw) || (m.aliases || []).some(hit))) add('اسم الفاتورة: ' + (t.merchantRaw || m.name));
  if (!titleHit && hit(t.beneficiaryRaw)) add('المستفيد: ' + t.beneficiaryRaw);
  if (b && hit(b.bank)) add('البنك: ' + b.bank);
  if (a && (hit(a.name) || hit(a.bank))) add('الحساب: ' + (a.name || a.bank));
  if (ins && (hit(ins.label) || hit(ins.last4))) add('البطاقة: ' + ins.label);
  const cn = (id) => { const c = id ? store.get('categories', id) : null; return c ? c.name : ''; };
  if (hit(cn(t.categoryId)) || hit(cn(t.subcategoryId))) add('التصنيف: ' + [cn(t.categoryId), cn(t.subcategoryId)].filter(Boolean).join(' › '));
  if (hit(t.note)) add('الملاحظة: ' + String(t.note).slice(0, 40));
  if (hit(t.reference)) add('المرجع: ' + t.reference);
  (t.items || []).forEach(i => {
    if (hit(i.name)) add('فيها: ' + i.name + (Number(i.qty) !== 1 ? ' ×' + fmtQty(i.qty) : ''));
    else if ((i.groupIds || []).some(g => { const G = store.get('groups', g); return G && hit(G.name); })) add('فيها: ' + i.name + ' (مجموعة ' + ((i.groupIds || []).map(g => store.get('groups', g)).find(G => G && hit(G.name)) || {}).name + ')');
    else if (hit(i.note)) add('ملاحظة غرض: ' + i.name);
    else if (!i.catFollow && i.productCategoryId && hit(cn(i.productCategoryId))) add('غرض في «' + cn(i.productCategoryId) + '»: ' + i.name); // اللي يتبع الفاتورة: تصنيف الفاتورة فوق
  });
  (t.cashParts || []).forEach(p => { if (hit(p.note) || hit(cn(p.categoryId)) || hit(cn(p.subcategoryId))) add('جزء من السحب: ' + (p.note || cn(p.subcategoryId) || cn(p.categoryId))); });
  const cityHit = (id) => { const c = id ? store.get('cities', id) : null; return c && (hit(c.name) || (c.aliases || []).some(hit)) ? c : null; };
  let c = cityHit(t.cityId); if (c) add('المدينة: ' + c.name);
  else if (!t.cityId && (c = cityHit(t.suggestedCityId))) add('المدينة المقترحة: ' + c.name);
  (t.groupIds || []).forEach(g => { const G = store.get('groups', g); if (G && hit(G.name)) add('المجموعة: ' + G.name); });
  if (Q.amt != null) {
    if ([t.grossAmount, t.principalAmount, t.foreignAmount].some(v => v != null && cents(v) === Q.amt)) add('المبلغ ' + (Q.amt / 100).toFixed(2));
    else if (t.feeAmount && cents(t.feeAmount) === Q.amt) add('الرسوم ' + (Q.amt / 100).toFixed(2));
    (t.items || []).forEach(i => { if (cents(i.total) === Q.amt || cents(i.unitPrice) === Q.amt) add('فيها: ' + i.name + ' بـ ' + (Q.amt / 100).toFixed(2)); });
    (t.cashParts || []).forEach(p => { if (cents(p.amount) === Q.amt) add('جزء من السحب بـ ' + (Q.amt / 100).toFixed(2)); });
  }
  return titleHit || why.length ? why : null;
}
const fmtQty = (q) => { const n = Number(q); return Number.isInteger(n) ? String(n) : String(round2(n)); };
// «مو مكررة»: الرسالة المكررة تلقائيًا ترجع للمعالجة كعملية (الواجهة تعيد معالجتها بـ allowSameContent)
function undoAutoDuplicate(store, reviewId) {
  const r = store.get('reviews', reviewId); if (!r || r.resolution !== 'auto_duplicate') return null;
  Object.assign(r, { resolution: 'not_duplicate', resolvedAt: new Date().toISOString() }); store.put('reviews', r); store.touch();
  return r.messageId;
}
function hideAutoDuplicate(store, reviewId) {
  const r = store.get('reviews', reviewId); if (!r || r.resolution !== 'auto_duplicate') return null;
  r.hidden = true; store.put('reviews', r); store.touch(); return r;
}
function migrate150(store) {
  const s = store.settings; if (s.migrated150) return { changed: false };
  const now = new Date().toISOString(), out = { changed: true, productCategories: 0, cities: 0, txsNormalized: 0, deletedNormalized: 0, snapshots: 0, smsSnapshots: 0 };
  if (!store.all('productCategories').length) PRODUCT_CATEGORY_SEED.forEach(([id, name, emoji, color], i) => { store.put('productCategories', { id, name, emoji, color, order: i, active: true, createdAt: now }); out.productCategories++; });
  const have = new Set(store.all('cities').map(c => c.id));
  CITY_SEED.forEach(([id, name, aliases]) => { if (have.has(id)) return; store.put('cities', { id, name, aliases: [name].concat(aliases), custom: false, active: true, createdAt: now }); out.cities++; });
  store.all('transactions').forEach(t => { if (normTx150(t)) { store.put('transactions', t); out.txsNormalized++; } });
  store.all('deletedTxs').forEach(t => { if (normTx150(t)) { store.put('deletedTxs', t); out.deletedNormalized++; } });
  store.all('accounts').forEach(a => {
    if (a.lastBalance == null || !a.lastBalanceDate || a.type === 'cash') return;
    if (store.all('balanceSnapshots').some(x => x.accountId === a.id)) return;
    store.put('balanceSnapshots', { id: uid(), accountId: a.id, balance: a.lastBalance, asOf: a.lastBalanceDate, source: 'statement', kind: a.lastBalanceKind || 'balance', importId: null, migrated: true, createdAt: now });
    out.snapshots++;
  });
  const openRv = new Set(store.all('reviews').filter(r => r.status === 'open').map(r => r.messageId));
  store.all('messages').forEach(m => {
    if (!m.txId || !m.text || !['tx', 'merged'].includes(m.status) || openRv.has(m.id)) return;
    const t = store.get('transactions', m.txId); if (!t || t.balanceAfter == null) return;
    if (!(t.sourceLinks || []).some(sl => sl.sourceType === 'sms' && sl.messageId === m.id)) return;
    if (smsBalanceSnapshot(store, { accountId: t.accountId, balance: t.balanceAfter, date: t.transactionDate, time: t.time, receivedAt: m.receivedAt, source: m.source, text: m.text, messageId: m.id, txId: t.id })) out.smsSnapshots++;
  });
  s.migrated150 = true; s.migrated150At = now; store.put('settings', s);
  return out;
}

/* ---------- 16. النسخ الاحتياطي ---------- */
/* ---------- ترقية 1.7.0 ----------
   1) التكرار والضرورة والالتزام وفرص التوفير: القيم الافتراضية اللي ما غيّرتها ترجع «غير محدد» (اللي غيّرته أنت يبقى).
   2) المتكرر المؤكد اللي قلت عنه «التزام» (أو «مو التزام») ينحفظ على جهته، لأن «الالتزام الدائم» صار على الجهة نفسها.
   3) الأغراض: اللي بدون تصنيف، أو تصنيفها نفس تصنيف فاتورتها الحين، تصير «تتبع الفاتورة».
   (تاريخ رسائل الليل يتصحح بخطوة لحالها في سجل التعديلات: fixNextDayDates) */
function migrate170(store) {
  const s = store.settings, out = { changed: false, defaultsReset: 0, commitSubjects: 0, itemsFollow: 0, itemsNowCategorized: 0 };
  if (s.migrated170) return out;
  const seeds = new Map(buildCategoryRecords(true).map(c => [c.id, c])), F = ['defaultRecurrenceType', 'defaultNecessityType', 'isCommitment', 'savingsEligible'];
  store.all('categories').forEach(c => {
    const d = seeds.get(c.id); if (!d) return; let ch = false;
    F.forEach(k => { if (c[k] !== null && c[k] !== undefined && c[k] === d[k]) { c[k] = null; ch = true; } });
    if (ch) { store.put('categories', c); out.defaultsReset++; }
  });
  // تصنيفات أضفتها قبل 1.7.0: التطبيق كان يعبّيها «متغير» و«لا» و«لا» تلقائيًا ← «غير محدد»
  store.all('categories').forEach(c => {
    if (seeds.has(c.id) || c.parentId) return; let ch = false;
    if (c.defaultRecurrenceType === 'variable') { c.defaultRecurrenceType = null; ch = true; }
    if (c.isCommitment === false) { c.isCommitment = null; ch = true; }
    if (c.savingsEligible === false) { c.savingsEligible = null; ch = true; }
    if (ch) { store.put('categories', c); out.defaultsReset++; }
  });
  store.all('merchants').forEach(m => {
    const sd = m.seedKey ? MERCHANT_SEED.find(x => x.name === m.seedKey) : null;
    if (sd && sd.rec && m.defaultRecurrenceType === sd.rec) { m.defaultRecurrenceType = null; store.put('merchants', m); out.defaultsReset++; }
  });
  store.all('recurring').filter(r => r.status === 'confirmed' && typeof r.isCommitment === 'boolean').forEach(r => {
    const n = r.subjectType === 'merchant' ? 'merchants' : 'beneficiaries', o = store.get(n, r.subjectId);
    if (!o || has(o.isCommitment)) return;
    o.isCommitment = r.isCommitment; store.put(n, o); out.commitSubjects++;
  });
  const fixItems = (t) => {
    let ch = false;
    (t.items || []).forEach(i => {
      if (i.catFollow !== undefined) return;
      const inv = invoiceCatOf(t, i.partId);
      if (!i.productCategoryId) { i.catFollow = true; i.productCategoryId = null; ch = true; out.itemsFollow++; if (inv) out.itemsNowCategorized++; }
      else if (inv && i.productCategoryId === inv) { i.catFollow = true; i.productCategoryId = null; ch = true; out.itemsFollow++; }
      else { i.catFollow = false; ch = true; }
    });
    return ch;
  };
  store.all('transactions').forEach(t => { if (fixItems(t)) store.put('transactions', t); });
  store.all('deletedTxs').forEach(t => { if (fixItems(t)) store.put('deletedTxs', t); });
  store.all('reviews').forEach(r => { if (r.heldTx && fixItems(r.heldTx)) store.put('reviews', r); });
  // المنتج: تصنيفه المقترح من الأغراض اللي اخترت تصنيفها بيدك بس (مو تصنيف فاتورة انسخ)
  const explicit = new Map();
  store.all('transactions').forEach(t => itemsOf(t).forEach(i => { if (!i.productId || i.catFollow || !i.productCategoryId) return; const k = (txDate(t) || '') + (t.time || '') + (i.createdAt || ''), e = explicit.get(i.productId); if (!e || k >= e.k) explicit.set(i.productId, { k, cat: i.productCategoryId }); }));
  store.all('products').forEach(p => {
    refreshProduct(store, p.id); const q = store.get('products', p.id), e = explicit.get(p.id);
    if ((q.productCategoryId || null) !== (e ? e.cat : null)) { q.productCategoryId = e ? e.cat : null; store.put('products', q); }
  });
  s.migrated170 = true; store.put('settings', s); out.changed = true;
  return out;
}
// 1.7.0: عمليات من رسائل (مو من كشف) تاريخها بعد يوم وصول رسالتها (بتوقيت السعودية) = البنك كتب تاريخ اليوم الجاي ← يوم الوصول، والوقت يبقى.
// التاريخ اللي حددته أنت ما يتغير. ترجع العمليات اللي تصححت
function fixNextDayDates(store) {
  const now = new Date().toISOString(), ids = [];
  store.all('transactions').forEach(t => {
    const sl = t.sourceLinks || []; if (!sl.length || sl.some(x => x.sourceType !== 'sms')) return;
    const m = sl[0].messageId ? store.get('messages', sl[0].messageId) : null; if (!m || !m.receivedAt || m.userDate) return;
    if (t.dateSource === 'user' || t.dateSource === 'received') return;
    const fx = arrivalFix(t.transactionDate, m.receivedAt); if (!fx.fixed) return;
    t.transactionDate = fx.date; t.dateArrival = true; t.updatedAt = now; store.put('transactions', t); ids.push(t.id);
  });
  if (ids.length) { pairTransfers(store); sweepPeriods(store); store.touch(); } // تاريخها تغيّر: ممكن تدخل «فترة»
  return { fixed: ids.length, ids };
}

/* ---------- ترقية 1.7.1 ----------
   1) المجموعات: التحويل الداخلي وسداد البطاقة اللي دخلوا مجموعة من «فترة» يطلعون منها.
   2) الالتزامات الدائمة: إعداد التنبيه بالشكل الجديد، واللي أخذ مبلغه تلقائي ينسأل من جديد (migrateCommit171 في التحليل).
   3) الصيغ الثابتة: صيغ ما قبل 1.7.1 توقف عن القراءة (تبقى للاقتراح)، ورسائلك المحفوظة تتجمع أشكالًا تنتظر اعتمادك،
      ومراجعات القراءة القديمة تصير «شكل رسالة جديد». */
function migrate171(store) {
  const out = { changed: false, groupsDropped: 0, commit: null, shapes: 0, shapesTx: 0, shapesInfo: 0, reviews: 0 };
  if (store.settings.migrated171) return out;
  out.groupsDropped = dropPeriodGroupTransfers(store);
  if (typeof Engine.migrateCommit171 === 'function') out.commit = Engine.migrateCommit171(store);
  store.all('templates').filter(x => x.kind === 'sms' && !isFormat(x) && x.active !== false).forEach(x => { x.active = false; x.legacy171 = true; store.put('templates', x); });
  const made = buildPendingShapes(store);
  out.shapes = made.length; out.shapesTx = made.filter(t => t.role === 'tx').length; out.shapesInfo = made.length - out.shapesTx;
  const OLD = new Set(['sms_new_bank', 'sms_new_bank_info', 'sms_unknown', 'sms_unparsed']);
  const NOSRC = new Set(['sms_new_bank', 'sms_new_bank_info', 'sms_unknown']);
  store.all('reviews').filter(r => r.status === 'open' && OLD.has(r.kind)).forEach(r => {
    const m = r.messageId ? store.get('messages', r.messageId) : null;
    // مراجعة قديمة ما لها رسالة أو نص (ما نقدر نعرّف لها صيغة): تنقفل
    if (!m || !m.text) { if (NOSRC.has(r.kind)) { Object.assign(r, { status: 'resolved', resolution: 'obsolete_171', resolvedAt: new Date().toISOString() }); store.put('reviews', r); if (m && m.status === 'review' && !m.txId) { m.status = 'ignored'; store.put('messages', m); } } return; }
    let pend = null, pr = {}, pi = null, weak = false;
    try {
      weak = SR().classify(m.text).code === 'otp_weak' || (r.kind === 'sms_unknown' && /رمز/.test(r.reason || ''));
      pend = matchSmsFormat(store, m.text, m.sender, 'pending'); if (pend && pend.role === 'info' && weak) pend = null;
      pr = proposeFormat(store, m, 'tx'); pi = pr.template ? null : proposeFormat(store, m, 'info');
    } catch (e) { pr = {}; pi = null; } // رسالة شاذة ما توقف الترقية: تبقى في المراجعة بدون اقتراح
    ['info', 'dateAsk', 'family', 'partial', 'missing', 'reason', 'date'].forEach(k => { delete r[k]; });
    Object.assign(r, { kind: 'sms_new_shape', pendingId: pend ? pend.id : null, suggest: pr.template ? readKey(sanitizeInfo(pr.preview)) : null, sig: (pr.template || (pi && pi.template) || {}).sig || null,
      weakOtp: weak, hasAmount: SR().hasMoney(m.text), bank: bankOf(store, m.sender) || null });
    store.put('reviews', r); out.reviews++;
  });
  const s = store.settings; s.migrated171 = new Date().toISOString(); store.put('settings', s); out.changed = true;
  return out;
}

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
  version: '1.7.1', round2, parseNum, cellToISO, cleanText, sha256Hex, uid, todayISO, addDays, daysBetween, isoDate,
  CATEGORY_SEED, buildCategoryRecords, Store, STORE_NAMES, DEFAULT_SETTINGS,
  sanitizeText, sanitizeFilename, fingerprintIban, fingerprintAccountNo, fingerprintNum, matchesOwner, normMerchant,
  detectTemplate, signatureOf, parseAlinmaAccount, interpretAlinmaLine, parseAlinmaCard, cardBalanceCheck,
  prepareImport, commitImport, deleteImport, findDuplicates, scorePair, pairTransfers,
  listCycles, currentCycle, previousPeriod, weekOf, yearOf, cycleOf, periodOf, shiftPeriod, spendParts, spendIn, spendSeries, comparePeriods, compareDay, coverageFor,
  computePeriod, accountBalances, catName, effective, isCommitmentCat, spendEffect, feeOf,
  saveCategory, deleteCategory, categoryUsage, liveCat, PROTECTED_CATS,
  parseQuickEntry, addManual, ensureCashAccount, cashBalance, reconcileCash, mergeInto,
  setCategory, setMerchantCategory, setBeneficiaryMine, applyOwnerAliases, setRoundUpDestination, setType, applyBeneficiaryClassification,
  makeBackup, validateBackup, prepareRestore, FX_FEE_RATE, onlyStampsChanged,
  parseSmsText, guessSmsInfo, isFormat, smsFormats, matchSmsFormat, formatFieldsFor, FAMILY_DIR, proposeFormat, saveSmsFormat, deleteSmsFormat, approvePendingFormat, saveInfoFormat, formatImpact, applyFormatScope, formatMsgCount, waitingForFormat, waitingForFormats, buildPendingShapes, formatName, readInfo, migrate171,
  prepareSms, commitSms, markAcked, localIds, setDateShape, removeDateShape, retroDateFix, answerDateShape, migrateDateShapes, resolveDuplicate, resolveMessageReview, reprocessMessages, saveSmsTemplate, fillFromTemplate, SMS_FAMILY_L,
  ruleMatches, applyRulesTo, previewRule, applyRuleToAll, limitsStatus, bulkEdit, bulkDelete, completeFromStatement,
  isExcluded, spendAnchor, spendDate, effParts, setExcluded, deleteTx, restoreTx, findDeletedMatches, resolveDeletedAgain,
  refundIndex, refundedOf, refundCandidates, linkRefund, unlinkRefund, addCashPart, removeCashPart, recentWithdrawals, cashExpenseToPart, cashRemaining,
  transferKindOf, setTransferKind, absorbAutoAccounts, migrate141,
  // 1.5.0
  senderKey, sendersOf, bankOf, bankRec, bankLabel, isIgnoredBank, isTrusted, isNewBank, setBankName, untrustFamily, setSenderIgnored, mergeBanks, unmergeBank, approveBankReading, migrate162, shapeKey, rawSig, OLD_DAYS,
  PRODUCT_CATEGORY_SEED, CITY_SEED, TX150, normTx150, migrate150, carry150, migrate152, splitSmsMerges, sameSmsMessage, migrate160, ensureSeedSubs, PC_MAP, itemCatPair, itemNetInfo, unitemizedParts,
  smsWordVersions, wordVersionAt, smsWordsFor, wordsDate, msgWordsDate, cleanSmsWords, previewSmsWords, applySmsWords, correctTxFromMessage, deleteSmsWordsVersion,
  saveItems, merchantName, invoiceAliasOf, shopsForAlias, defaultShopFor, shopChoices, checkShopName, shopNameIdeas, prettyInvoiceName, setShopName, txShopOnce, addShopForInvoice, setShopDefault, chooseShop, shopChoiceTxs, mergeCatConflict, mergeMerchants, refreshShopChoices,
  markReviewed, unreviewedTxs, needsCity, isIgnored, saveIgnorePeriod, deleteIgnorePeriod, searchTx, searchQuery, undoAutoDuplicate, hideAutoDuplicate, hasSmsSource,
  txDate, inPeriod, inSpendPeriod, cashPartsOf, withdrawalReturns, netWithdrawal, cents, eq2, pad2, daysInMonth, dataRange, normAr,
  isKnownCommitment, isCommitFlagged, catChain, confirmedRecurringFor, CHAIN,
  // 1.7.0
  feeCatOf, feeSuggestion, futureTx, invoiceCatOf, itemCatId, riyadhDay, arrivalFix, migrate170, fixNextDayDates,
  periodCityOk, periodGroupOk, dropPeriodGroupTransfers, periodsList, savePeriod, deletePeriod, revertPeriod, sweepPeriods, periodConflicts, applyPeriodToConflicts, restorePeriodCity, isOnlineTx,
  cityKey, findCity, ensureCity, saveCity, mergeCity, cityFromCoords, suggestCity, cityOf, setTxCity, dismissTxCity, autoCityOk, autoApproveCity, setCurrentCity, snoozeCityPrompt, validCityRaw, applyCityUpdate,
  saveProductCategory, deleteProductCategory, canHaveItems, itemCap, itemsOf, itemsTotal, unitemized, partCap, findProduct, productSuggest, refreshProduct, saveItem, removeItem,
  setRefundAllocations, itemNet, linkedRefunds, cashReturnCandidates, linkCashReturn, unlinkCashReturn,
  saveGroup, deleteGroup, setTxGroups, setItemGroups, inGroup, itemFinCat, groupStats,
  snapKey, latestSnapshot, refreshAccountBalance, addSnapshot, smsBalanceSnapshot, wallTime,
};
if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
else root.Engine = Engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
