/* =====================================================================
   المدير المالي — الواجهة
   الأقسام: أدوات العرض · الحالة والتشغيل · الصفحات · النوافذ · الأوامر · الملفات
   ===================================================================== */
(function () {
'use strict';
const E = window.Engine;

/* ---------- أدوات العرض ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n, cls) => `<span class="num ${cls || ''}">${fmt(n)}</span>`;
// عدّ عربي: عملية واحدة، عمليتان، 3 عمليات، 11 عملية
const W = { op: ['عملية واحدة', 'عمليتان', 'عمليات', 'عملية'], tr: ['تحويل واحد', 'تحويلان', 'تحويلات', 'تحويلًا'], hw: ['حوالة واحدة', 'حوالتان', 'حوالات', 'حوالة'] };
function cnt(n, w) { const f = W[w]; if (n === 1) return f[0]; if (n === 2) return f[1]; if (n >= 3 && n <= 10) return `${n} ${f[2]}`; return `${n} ${f[3]}`; }
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function dparts(iso) { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; }
const fdate = (iso, withYear) => { if (!iso) return '—'; const p = dparts(iso); return `${p.d} ${MONTHS[p.m - 1]}${withYear ? ' ' + p.y : ''}`; };
const fday = (iso) => { const p = dparts(iso); return `${DAYS[p.wd]} ${p.d} ${MONTHS[p.m - 1]} ${p.y}`; };
const fperiod = (p) => { if (!p) return ''; const a = dparts(p.start), b = dparts(p.end); return a.y === b.y ? `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}` : `${fdate(p.start, true)} – ${fdate(p.end, true)}`; };
const TYPE_L = { Payment: 'دفع', Income: 'دخل', InternalTransfer: 'تحويل داخلي', CreditCardPayment: 'سداد بطاقة', PersonTransfer: 'تحويل لشخص', Refund: 'استرداد', CashWithdrawal: 'سحب نقدي', CashExpense: 'مصروف نقدي', CashDeposit: 'إيداع نقدي', LoanToPerson: 'سلفة', LoanRepayment: 'سداد سلفة', Unknown: 'غير معروف' };
const METHOD_L = { 'Apple Pay': 'Apple Pay', Online: 'عبر الإنترنت', POS: 'نقاط بيع', 'Bill Payment': 'سداد فاتورة', 'Bank Transfer': 'حوالة', Other: 'أخرى', Unknown: 'غير محددة', Cash: 'نقد' };
const ACC_L = { checking: 'جاري', credit_card: 'بطاقة ائتمانية', wallet: 'محفظة رقمية', cash: 'نقد', savings: 'ادخار', other: 'أخرى', unknown: 'غير محدد' };
const OWNER_L = { me: 'أنا', other: 'شخص آخر', unknown: 'غير محدد' };
const SRC_L = { account_statement: 'كشف حساب', card_statement: 'كشف بطاقة', manual: 'إدخال يدوي', cash_reconciliation: 'تسوية نقد', sms: 'رسالة' };
const INCOME_L = { salary: 'راتب', reward: 'مكافأة', extra: 'دخل إضافي', return: 'عائد', other: 'دخل آخر' };

/* ---------- الأيقونات والألوان ---------- */
const IC = {
  filter: '<path d="M4 5h16l-6.2 7.2V18l-3.6 2v-7.8z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  back: '<path d="M9 6l6 6-6 6"/>',
  cart: '<path d="M3 4h2l2.2 10.3a1 1 0 0 0 1 .7h9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
  food: '<path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M18 21V3c-2.2 1.2-3.5 4-3.5 7.5V13H18"/>',
  cup: '<path d="M4 9h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5v2.5M12 3.5v2.5"/><path d="M4 21h12"/>',
  car: '<path d="M5 11l1.7-4.3A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.9 1.2L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M6 17v2.5M18 17v2.5"/><path d="M7 14h1.5M15.5 14H17"/>',
  fuel: '<path d="M4 21V5.5A2.5 2.5 0 0 1 6.5 3h5A2.5 2.5 0 0 1 14 5.5V21"/><path d="M3 21h12"/><path d="M6.5 8.5h5"/><path d="M14 10h2a2 2 0 0 1 2 2v4.5a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  parking: '<rect x="4" y="3" width="16" height="18" rx="4"/><path d="M10 17V7h3a3 3 0 0 1 0 6h-3"/>',
  house: '<path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  bolt: '<path d="M13 2.5L4.5 14H11l-1 7.5L18.5 10H12z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.8 16a5 5 0 0 1 6.4 0"/><circle cx="12" cy="19.5" r="1"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  health: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/><path d="M12 10v5M9.5 12.5h5"/>',
  edu: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.6 2.7 3 6 3s6-1.4 6-3v-5"/><path d="M22 9v5"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M15.5 5a3 3 0 0 1 0 6"/><path d="M17.5 14a5.5 5.5 0 0 1 3.5 6"/>',
  person: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.5" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8v12"/><path d="M12 8C10.5 5 7 4.5 7 6.5 7 8 10 8 12 8c2 0 5 0 5-1.5C17 4.5 13.5 5 12 8z"/>',
  bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  plane: '<path d="M10 13.5L3 11l1.3-1.6 7.2.9 4.2-4.6a2.1 2.1 0 0 1 3 3L14 13.2l1 7.3-1.6 1.2-3-6.3-3.3 3.2.2 2-1.2 1-1.5-3.5L1.9 16l1-1.2 2 .2z"/>',
  bed: '<path d="M3 18.5V6.5M3 14h18v4.5M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.7"/>',
  fun: '<path d="M4 7.5A2.5 2.5 0 0 0 6.5 5h11A2.5 2.5 0 0 0 20 7.5v2a2.5 2.5 0 0 0 0 5v2a2.5 2.5 0 0 0-2.5 2.5h-11A2.5 2.5 0 0 0 4 16.5v-2a2.5 2.5 0 0 0 0-5z"/><path d="M13 7.5v1.5M13 11.2v1.6M13 15v1.5"/>',
  repeat: '<path d="M17 2.5l3 3-3 3"/><path d="M4 11V9.5a4 4 0 0 1 4-4h12"/><path d="M7 21.5l-3-3 3-3"/><path d="M20 13v1.5a4 4 0 0 1-4 4H4"/>',
  bank: '<path d="M3 9.5L12 4l9 5.5"/><path d="M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5"/><path d="M3 20.5h18"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  alert: '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.2"/><circle cx="12" cy="17" r=".6"/>',
  dots: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6"/><circle cx="12" cy="17" r=".6"/>',
  income: '<path d="M12 3.5v11M7.5 10L12 14.5 16.5 10"/><path d="M4 15v4.5h16V15"/>',
  swap: '<path d="M4 8h15l-3.5-3.5"/><path d="M20 16H5l3.5 3.5"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>',
  refund: '<path d="M9 14L4.5 9.5 9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"/>',
  coins: '<ellipse cx="12" cy="6.5" rx="7" ry="2.8"/><path d="M5 6.5v5c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-5"/><path d="M5 11.5v5c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-5"/>',
  out: '<path d="M17 17L7 7M7 15V7h8"/>', inn: '<path d="M7 7l10 10M17 9v8H9"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>', chevR: '<path d="M9 6l6 6-6 6"/>',
  chart: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
  list: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-9-1.5 2-2 3.5-2 5-1-1-1.5-2-1.5-3.5C8 9 6 11.5 6 15a6 6 0 0 0 6 6z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 15v4.5h16V15"/>',
  note: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/>', cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  msg: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.1-7.5 9.5-4.3-1.4-7.5-4.9-7.5-9.5V6z"/>', doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  store: '<path d="M4 9.5L5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 11.5V20h13v-8.5M10 20v-5h4v5"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16" height="12" rx="2.5"/><path d="M16 14h1.5"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11.2A6.5 6.5 0 0 1 12 3.3a6.5 6.5 0 0 1 6.5 6.5C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  tag: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.4"/>',
  box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
  scale: '<path d="M12 4v16M5 20h14M5 7h14"/><path d="M5 7l-2.5 6a2.8 2.8 0 0 0 5 0zM19 7l-2.5 6a2.8 2.8 0 0 0 5 0z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  trend: '<path d="M3.5 17l6-6 4 4 7-7.5"/><path d="M15 7.5h5.5V13"/>',
  piggy: '<path d="M5 11.5a6.5 5.5 0 0 1 12.4-2.3H19l1 3-1.6 1V16l-2.4.6-1 2.4h-2.5l-.5-1.5h-3.5l-.5 1.5H6.5l-.8-2.6A5.2 5.2 0 0 1 5 11.5z"/><circle cx="15.5" cy="11" r=".6"/><path d="M9 7.2h3.5"/>',
  cal2: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3M8 17h6"/>',
};
const ico = (n, cls) => `<svg class="i ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || IC.dots}</svg>`;
// ألوان التصنيفات: ثمانية ألوان مجرّبة لعمى الألوان، كل تصنيف له لونه الثابت
const REST_C = '#CDD1DA';
const PAL = { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100', magenta: '#e87ba4', green: '#008300', violet: '#4a3aa7', red: '#e34948', gray: '#8E95A5' };
const CAT_UI = {
  groceries: ['blue', 'cart'], restaurants: ['magenta', 'food'], cafes: ['orange', 'cup'], transport: ['violet', 'car'], fuel: ['violet', 'fuel'],
  home: ['aqua', 'house'], housing: ['aqua', 'house'], bills: ['aqua', 'bolt'], telecom: ['aqua', 'wifi'], health: ['green', 'health'], education: ['blue', 'edu'],
  family: ['yellow', 'people'], social: ['yellow', 'people'], gifts: ['yellow', 'gift'], shopping: ['red', 'bag'], travel: ['orange', 'plane'], hotels: ['orange', 'bed'],
  entertainment: ['magenta', 'fun'], subscriptions: ['violet', 'repeat'], installments: ['red', 'bank'], donations: ['green', 'heart'], fines: ['red', 'alert'],
  fees: ['gray', 'receipt'], cash: ['green', 'cash'], other: ['gray', 'dots'], __none: ['gray', 'question'], __person: ['yellow', 'person'], __roundup: ['yellow', 'coins'],
};
const SUB_ICON = { 'transport.parking': 'parking', 'transport.ride': 'car', 'transport.fuel': 'fuel', 'bills.electricity': 'bolt', 'bills.water': 'drop', 'home.electricity': 'bolt', 'home.water': 'drop', 'telecom.devices': 'phone', 'telecom.prepaid': 'phone', 'travel.hotels': 'bed', 'hotels': 'bed', 'fees.fx': 'swap', 'social.occasions': 'gift', 'family.gifts': 'gift' };
// شكل التصنيف: أيقونة ولون ثابتين للتصنيفات الأساسية، والإيموجي واللون اللي يختاره المستخدم يغلبونها
function catUi(id) {
  if (!id) return { color: PAL.gray, icon: 'question' };
  if (id === '__none' || id === '__person' || id === '__roundup') { const u0 = CAT_UI[id]; return { color: PAL[u0[0]], icon: u0[1], hue: u0[0] }; }
  const c = S.store ? store().get('categories', id) : null;
  let u = CAT_UI[id];
  if (!u && id.includes('.')) { const p = CAT_UI[id.split('.')[0]]; if (p) u = [p[0], SUB_ICON[id] || p[1]]; }
  let out;
  if (c && c.parentId) {
    const pu = catUi(c.parentId); // الفرعي يورث شكل الرئيسي إذا الرئيسي له إيموجي أو لون مخصص
    out = u && !pu.custom ? { color: PAL[u[0]] || PAL.gray, icon: u[1], hue: u[0] } : Object.assign({}, pu, { custom: false });
  } else out = u ? { color: PAL[u[0]] || PAL.gray, icon: u[1], hue: u[0] } : { color: PAL.gray, icon: 'dots', hue: 'gray' };
  if (c && c.color && PAL[c.color]) { out.color = PAL[c.color]; out.hue = c.color; out.custom = true; }
  if (c && c.emoji) { out.emoji = c.emoji; out.custom = true; }
  return out;
}
function glyph(u, icon) { return u.emoji ? `<span class="emo">${esc(u.emoji)}</span>` : ico(icon || u.icon); }
const tint = (hex, a) => hex + (a || '1F');
function icCircle(u, cls, mini) { return `<span class="ic ${cls || ''}" style="background:${tint(u.color)};color:${u.color}">${glyph(u)}${mini ? `<span class="mini" style="color:${mini.color}">${ico(mini.icon)}</span>` : ''}</span>`; }
function txUi(tx) {
  const t = tx.transactionType;
  if (tx.transferSubtype === 'round_up') return { color: tx.classificationStatus === 'unclassified' ? PAL.yellow : PAL.gray, icon: 'coins' };
  if (t === 'Income') return { color: PAL.green, icon: 'income' };
  if (t === 'Refund') return { color: PAL.green, icon: 'refund' };
  if (t === 'InternalTransfer') return { color: PAL.gray, icon: 'swap' };
  if (t === 'CreditCardPayment') return { color: PAL.blue, icon: 'card' };
  if (t === 'CashWithdrawal') return catUi(tx.categoryId || 'cash');
  if (t === 'CashDeposit') return { color: PAL.gray, icon: 'cash' };
  if (t === 'Unknown') return { color: PAL.yellow, icon: 'question' };
  if (tx.categoryId) { const sc = tx.subcategoryId ? store().get('categories', tx.subcategoryId) : null; return catUi(tx.subcategoryId && (SUB_ICON[tx.subcategoryId] || (sc && (sc.emoji || sc.color))) ? tx.subcategoryId : tx.categoryId); }
  if (t === 'PersonTransfer') return catUi('__person');
  return catUi('__none');
}
function dirBadge(tx) {
  const t = tx.transactionType;
  if (t === 'Unknown' || (tx.transferSubtype === 'round_up' && tx.classificationStatus === 'unclassified')) return `<span class="dir w">${ico(tx.direction === 'out' ? 'out' : 'inn')}</span>`;
  if (['InternalTransfer', 'CreditCardPayment', 'CashDeposit', 'LoanToPerson', 'LoanRepayment'].includes(t)) return `<span class="dir x">${ico('swap')}</span>`;
  if (t === 'Income' || t === 'Refund') return `<span class="dir n">${ico('inn')}</span>`;
  return `<span class="dir o">${ico('out')}</span>`;
}
const ftime = (hm) => { if (!hm) return ''; const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`; };
// الأوقات المحفوظة بتوقيت غرينتش (تنتهي بـ Z) تنعرض بوقت الجهاز (السعودية)
function localParts(iso) {
  if (!iso) return null;
  const s = String(iso);
  if (s.length <= 10) return { date: s.slice(0, 10), time: '' };
  if (!/([zZ]|[+-]\d\d:?\d\d)$/.test(s)) return { date: s.slice(0, 10), time: s.slice(11, 16) };
  const d = new Date(s); if (isNaN(d.getTime())) return { date: s.slice(0, 10), time: s.slice(11, 16) };
  const p2 = (n) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, time: `${p2(d.getHours())}:${p2(d.getMinutes())}` };
}
const ldate = (iso) => { const p = localParts(iso); return p ? p.date : ''; };
const fdt = (iso, withYear) => { const p = localParts(iso); return p ? fdate(p.date, withYear) + (p.time ? '، ' + ftime(p.time) : '') : ''; };
const money = (n, cls) => `<span class="num ${cls || ''}">${fmt(n)}</span><span class="cur">ر.س</span>`;

/* ---------- الحالة ---------- */
const S = {
  store: null, view: 'home', period: null, filters: { kind: 'all', allTime: true }, q: '', navStack: [], spendBy: 'cat', cardOpen: null, newList: null,
  plan: null, planFile: null, decisions: {}, queue: [], teach: null,
  sheetResolve: null, dismissStandalone: false, swWaiting: null, busy: false,
};
const $ = (id) => document.getElementById(id);
const store = () => S.store;
const settings = () => S.store.settings;

// كل حفظ = خطوة وحدة في التراجع وسجل التعديلات
async function persist(label, opts) {
  opts = opts || {};
  let step = null;
  if (opts.noStep) S.store.absorb(); else step = S.store.commitStep(label || S.opLabel || 'تعديل', opts.source || 'user');
  if (step && step.source === 'user') S.undoHint = Date.now();
  const ch = S.store.takeChanges();
  try { await DB.apply(ch); }
  catch (e) {
    // الحفظ فشل: نرجع الذاكرة لآخر حالة محفوظة فعلًا في IndexedDB، عشان ما يعتمد أي شي (مثل ack) على تغيير ما انحفظ
    await reloadFromDb();
    alert('تعذر الحفظ على الجهاز، ورجعت البيانات لآخر حالة محفوظة: ' + (e && e.message ? e.message : e));
    throw e;
  }
  return step;
}
async function reloadFromDb() {
  try {
    const data = await DB.loadAll();
    const st = new E.Store(data);
    st.takeChanges(); st.startHistory();
    S.store = st; S.sel = null; S.undoHint = 0;
    if ($('sheet').innerHTML) closeSheet(null);
    render();
  } catch (e2) {
    S.store = null;
    $('main').innerHTML = `<div class="card"><h2>تعذر الحفظ على الجهاز</h2><p>آخر تعديل ما انحفظ. سكّر التطبيق وافتحه مرة ثانية.</p><p class="muted">${esc(e2 && e2.message ? e2.message : e2)}</p></div>`;
  }
}
function toast(msg, ms) {
  const t = $('toast');
  const canUndo = S.undoHint && Date.now() - S.undoHint < 2000 && S.store && S.store.undoStack.length;
  t.innerHTML = `<span>${esc(msg)}</span>${canUndo ? ' <button class="tbtn" data-action="undo">تراجع</button>' : ''}`;
  t.classList.remove('hide');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hide'), ms || (canUndo ? 5000 : 2600));
  S.undoHint = 0;
}

/* ---------- مساعدات البيانات ---------- */
const merchantOf = (tx) => tx.merchantId ? store().get('merchants', tx.merchantId) : null;
const benOf = (tx) => tx.beneficiaryId ? store().get('beneficiaries', tx.beneficiaryId) : null;
const accOf = (id) => store().get('accounts', id);
const insOf = (tx) => tx.instrumentId ? store().get('instruments', tx.instrumentId) : null;
function txTitle(tx) {
  if (tx.transferSubtype === 'round_up') return tx.merchantRaw || 'تقريب';
  const m = merchantOf(tx); if (m) return m.name;
  const b = benOf(tx); if (b) return b.name;
  if (tx.transactionType === 'Income') return INCOME_L[tx.incomeSubtype] || 'دخل';
  if (tx.transactionType === 'InternalTransfer' && tx.counterpartyAccountId) { const a = accOf(tx.counterpartyAccountId); if (a) return (tx.direction === 'out' ? 'إلى ' : 'من ') + a.name; }
  return tx.merchantRaw || tx.beneficiaryRaw || TYPE_L[tx.transactionType];
}
function catLabel(tx) {
  if (tx.transactionType === 'CashWithdrawal') { const n = (tx.cashParts || []).length; const base = tx.categoryId ? E.catName(store(), tx.categoryId) : 'سحب نقدي'; return n ? `${base} · مقسّم (${n === 1 ? 'جزء واحد' : n === 2 ? 'جزءان' : n + ' أجزاء'})` : base; }
  if (tx.categoryId) { const c = E.catName(store(), tx.categoryId); const s = tx.subcategoryId ? store().get('categories', tx.subcategoryId) : null; return s ? `${c} › ${s.name}` : c; }
  if (tx.transactionType === 'Payment' || tx.transactionType === 'CashExpense' || (tx.transactionType === 'Unknown' && tx.direction === 'out')) return 'بدون تصنيف';
  return TYPE_L[tx.transactionType];
}
function bucketName(key) {
  if (key === '__none' || key == null) return 'بدون تصنيف';
  if (key === '__person') return 'تحويلات لأشخاص (مؤقت)';
  if (key === '__roundup') return 'تقريب (وجهته غير محددة)';
  return E.catName(store(), key);
}
function amountCell(tx) {
  const t = tx.transactionType;
  if (t === 'Income') return `<span class="num pos">+${fmt(tx.grossAmount)}</span>`;
  if (t === 'Refund') return `<span class="num pos">+${fmt(tx.grossAmount)}</span>`;
  if (t === 'Unknown' || (tx.transferSubtype === 'round_up' && tx.classificationStatus === 'unclassified')) return `<span class="num warn-t">${tx.direction === 'out' ? '−' : '+'}${fmt(tx.grossAmount)}</span>`;
  if (['InternalTransfer', 'CreditCardPayment', 'CashDeposit', 'LoanToPerson', 'LoanRepayment'].includes(t)) return `<span class="num neu">⇄ ${fmt(tx.grossAmount)}</span>`;
  return `<span class="num">−${fmt(tx.grossAmount)}</span>`;
}
function badges(tx) {
  const b = [];
  const ins = insOf(tx);
  if (tx.transferSubtype === 'round_up') b.push(`<span class="b n">تقريب</span>`);
  if (tx.classificationStatus === 'temporary') b.push(`<span class="b w">تصنيف مؤقت</span>`);
  if (tx.classificationStatus === 'unclassified') b.push(`<span class="b w">${tx.transferSubtype === 'round_up' ? 'الوجهة غير معروفة' : 'غير مصنف'}</span>`);
  if ((tx.transactionType === 'Payment' || tx.transactionType === 'CashExpense') && !tx.categoryId) b.push(`<span class="b n">بدون تصنيف</span>`);
  if (ins && ins.instrumentOwner === 'unknown' && E.spendEffect(tx) !== 0) b.push(`<span class="b w">مالك الأداة غير محدد</span>`);
  if (ins && ins.includeInPersonalSpend === false) b.push(`<span class="b n">خارج مصروفك</span>`);
  if (tx.excludedByUser) b.push(`<span class="b n">ما تنحسب في الصرف</span>`);
  if (tx.transactionType === 'Refund') b.push(tx.refundOfId && store().get('transactions', tx.refundOfId) ? `<span class="b g">مربوط بشرائه</span>` : tx.refundOfId && store().get('deletedTxs', tx.refundOfId) ? `<span class="b w">شراؤه محذوف (ما ينخصم)</span>` : `<span class="b n">غير مربوط بشراء</span>`);
  if (tx.transactionType === 'Payment' && S.refunds) { const rf = S.refunds.get(tx.id); if (rf) b.push(`<span class="b g">${rf >= tx.principalAmount - 0.004 ? 'مسترجعة' : 'مسترجعة جزئيًا'}</span>`); }
  { const a = accOf(tx.accountId); if (a && a.autoCreated && ins && ins.instrumentOwner === 'unknown') b.push(`<span class="b w">بطاقة جديدة</span>`); }
  if (tx.transactionType === 'InternalTransfer' && tx.transferSubtype !== 'round_up' && tx.transferLinkStatus === 'one_sided') b.push(`<span class="b n">غير مكتمل الربط</span>`);
  if (tx.transactionType === 'CreditCardPayment') b.push(tx.cardPaymentStatus === 'matched' ? `<span class="b g">مطابق</span>` : `<span class="b w">${tx.targetCardLast4 ? 'غير مطابق' : 'البطاقة غير معروفة'}</span>`);
  const fee = E.feeOf(tx); if (fee) b.push(`<span class="b n">رسوم ${fmt(fee)}</span>`);
  if ((tx.sourceLinks || []).length > 1) b.push(`<span class="b g">${tx.sourceLinks.length} مصادر</span>`);
  if ((tx.sourceLinks || []).some(s => s.sourceType === 'manual')) b.push(`<span class="b n">يدوي</span>`);
  return b.length ? `<div class="badges">${b.join('')}</div>` : '';
}
function subLine(tx, withDate) {
  const parts = [esc(catLabel(tx))];
  if (withDate) parts.push(`${fdate(tx.transactionDate || tx.postingDate, true)}${tx.time ? '، ' + ftime(tx.time) : ''}`);
  else {
    const ins = insOf(tx), acc = accOf(tx.accountId);
    parts.push(esc(ins ? ins.label : acc ? acc.name : ''));
    if (tx.time) parts.push(ftime(tx.time));
  }
  return parts.filter(Boolean).join(' · ');
}
function txRow(tx, withDate) {
  const sm = S.sel && S.view === 'txs', on = sm && S.sel.has(tx.id);
  return `<div class="tx ${on ? 'sel' : ''}" data-action="${sm ? 'toggleSel' : 'openTx'}" data-id="${tx.id}">${sm ? `<span class="ck">${on ? '✓' : ''}</span>` : ''}${icCircle(txUi(tx))}<div class="m"><div class="t">${esc(txTitle(tx))}</div><div class="s">${subLine(tx, withDate)}</div>${badges(tx)}</div><div class="a"><span class="num">${fmt(tx.grossAmount)}</span>${dirBadge(tx)}</div></div>`;
}
const sortTx = (a, b) => ((b.transactionDate || '') + (b.time || '')).localeCompare((a.transactionDate || '') + (a.time || ''));
const isCardUnmatched = (t) => t.transactionType === 'CreditCardPayment' && !t.cardPaymentByUser && t.cardPaymentStatus !== 'matched' && !(t.transferLinkStatus === 'linked');
const isRoundUpUnknown = (t) => t.transferSubtype === 'round_up' && t.classificationStatus === 'unclassified';
function catOptions(selected, includeNone) {
  const cats = store().all('categories').filter(c => !c.parentId).sort((a, b) => a.order - b.order);
  return (includeNone ? `<option value="">— بدون تصنيف —</option>` : '') + cats.map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
}
function subOptions(catId, selected) {
  const subs = store().all('categories').filter(c => c.parentId === catId).sort((a, b) => a.order - b.order);
  return `<option value="">— بدون فرعي —</option>` + subs.map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
}
function ownAccountOptions(selected, withNew) {
  const accs = store().all('accounts').filter(a => a.isMine);
  return `<option value="">— اختر —</option>` + accs.map(a => `<option value="${a.id}" ${a.id === selected ? 'selected' : ''}>${esc(a.name)}</option>`).join('') + (withNew ? `<option value="__new">+ حساب جديد…</option>` : '');
}

/* ---------- الفترة ---------- */
function ensurePeriod() {
  if (S.period) return;
  S.period = E.currentCycle(store()) || (E.listCycles(store())[0]) || { start: E.addDays(E.todayISO(), -29), end: E.todayISO(), kind: 'custom' };
  S.selDay = null;
}
function periodTxs() {
  const p = S.period;
  return store().all('transactions').filter(t => { const d = t.transactionDate || t.postingDate; return d >= p.start && d <= p.end; });
}

/* ---------- التنبيهات العامة ---------- */
function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
function banners() {
  const out = [];
  if (!isStandalone() && !S.dismissStandalone) {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    out.push(`<div class="banner w"><div><b>أنت تفتح التطبيق من المتصفح.</b> ${ios ? 'افتحه من أيقونة الشاشة الرئيسية: بيانات Safari منفصلة عن بيانات الأيقونة. لإضافة الأيقونة: زر المشاركة ← «إضافة إلى الشاشة الرئيسية».' : 'للاستخدام اليومي ثبّت التطبيق من قائمة المتصفح (تثبيت التطبيق). البيانات هنا خاصة بهذا المتصفح.'}</div><button class="x" data-action="dismissStandalone" aria-label="إخفاء">×</button></div>`);
  }
  if (S.swWaiting) out.push(`<div class="banner i"><div><b>فيه تحديث جديد للتطبيق.</b></div><button class="btn p" data-action="applyUpdate">تحديث</button></div>`);
  const s = settings();
  if (s.lastChangeAt && store().all('transactions').length) {
    const last = s.lastBackupAt ? new Date(s.lastBackupAt) : null;
    const days = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null;
    const changedSince = !last || new Date(s.lastChangeAt) > last;
    if (changedSince && (days === null || days >= (s.backupReminderDays || 7))) {
      out.push(`<div class="banner w"><div><b>${days === null ? 'ما سويت نسخة احتياطية للحين.' : `آخر نسخة احتياطية قبل ${days} يوم.`}</b> البيانات محفوظة على هذا الجهاز فقط، والجهاز ممكن يمسحها إذا امتلت الذاكرة.</div><button class="btn p" data-action="backup">نسخة الآن</button></div>`);
    }
  }
  return out.join('');
}

/* ---------- التشغيل ---------- */
let markReady; const ready = new Promise(r => { markReady = r; });
async function boot() {
  $('fileInput').addEventListener('change', async (ev) => { const files = Array.from(ev.target.files || []); ev.target.value = ''; await ready; if (files.length) handleFiles(files); });
  $('restoreInput').addEventListener('change', async (ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; await ready; if (f) restoreFrom(f); });
  document.addEventListener('click', (ev) => { if (!S.store) return; onClick(ev); });
  document.addEventListener('change', (ev) => { if (!S.store) return; onChange(ev); });
  try {
    await DB.open();
    const data = await DB.loadAll();
    S.store = new E.Store(data);
    const ch = S.store.takeChanges(); // التصنيفات والإعدادات الافتراضية لأول مرة
    if (!data.categories.length || !data.settings.length) await DB.apply({ puts: { categories: S.store.all('categories'), settings: [S.store.settings] }, removes: {} });
    else void ch;
    // ترقية 1.4.0: أشكال تواريخ الرسائل المحفوظة سابقًا
    E.migrateDateShapes(S.store);
    // ترقية 1.4.1: تصنيف «سحب نقدي»، ورسائل «أي حساب؟» تنحفظ على بطاقة مؤقتة
    const m141 = E.migrate141(S.store);
    if (m141.reprocess.length) { const plan = await E.reprocessMessages(S.store, m141.reprocess); if (plan) E.commitSms(S.store, plan); }
    // ترقية 1.5.0: الجداول الجديدة وبذور المنتجات والمدن وسجل الأرصدة، واكتشاف الالتزامات المتكررة (مقترح فقط)
    E.migrate150(S.store); E.detectRecurring(S.store);
    const c2 = S.store.takeChanges(); if (Object.keys(c2.puts).length || Object.keys(c2.removes).length) await DB.apply(c2);
    S.store.startHistory();
  } catch (e) {
    $('main').innerHTML = `<div class="card"><h2>تعذر فتح قاعدة البيانات</h2><p>${esc(e && e.message ? e.message : e)}</p><p class="muted">إذا كنت في وضع التصفح الخاص، افتح التطبيق في وضع عادي.</p></div>`;
    return;
  }
  registerSW();
  markReady();
  const initial = (location.hash || '').replace('#', '');
  if (['home', 'spend', 'txs', 'add', 'accounts', 'more', 'reviewc', 'messages'].includes(initial)) S.view = initial;
  render();
  // جلب الرسائل تلقائيًا عند الفتح وعند الرجوع للتطبيق (إذا الصندوق معدّ)
  setTimeout(autoFetch, 700);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoFetch(); });
  window.addEventListener('online', autoFetch);
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) { S.swWaiting = reg.waiting; render(); }
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { S.swWaiting = w; render(); } });
    });
  }).catch(() => {});
  // إعادة التحميل فقط إذا ضغط المستخدم «تحديث» (أول تثبيت ما يعيد تحميل الصفحة)
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !S.updating) return; reloaded = true; location.reload(); });
}

/* ---------- العرض ---------- */
const TITLES = { income: 'الدخل', deleted: 'المحذوفة', categories: 'التصنيفات', reviewc: 'المراجعة', teachsms: 'تعليم صيغة رسالة', messages: 'الرسائل البنكية', audit: 'سجل التعديلات', limits: 'حدود الصرف', rules: 'القواعد', home: 'الرئيسية', spend: 'صرفياتك', txs: 'العمليات', add: 'إضافة واستيراد', accounts: 'الحسابات', more: 'المزيد', review: 'مراجعة الاستيراد', teach: 'تعليم كشف جديد', merchants: 'التجار', beneficiaries: 'المستفيدون', settings: 'الإعدادات', backup: 'النسخ الاحتياطي', report: 'التقرير', methods: 'طريقة الحساب', imports: 'سجل الاستيراد' };
const NAV_OF = { income: 'more', deleted: 'txs', categories: 'more', reviewc: 'more', teachsms: 'reviewc', messages: 'more', audit: 'more', limits: 'more', rules: 'more', add: 'home', review: 'add', teach: 'add', imports: 'add', merchants: 'more', beneficiaries: 'accounts', settings: 'more', backup: 'more', report: 'more', methods: 'more' };
function render() {
  ensurePeriod();
  const v = S.view;
  document.body.className = 'v-' + v + (S.sel && v === 'txs' ? ' selmode' : '');
  $('title').textContent = TITLES[v] || 'المدير المالي';
  $('backBtn').classList.toggle('hide', !(S.navStack.length || NAV_OF[v]));
  S.refunds = E.refundIndex(S.store);
  $('undoBtn').classList.toggle('hide', !S.store.undoStack.length);
  $('fab').classList.toggle('hide', ['add', 'review', 'teach', 'imports', 'teachsms'].includes(v) || !!S.sel);
  const showPeriod = ['txs', 'report'].includes(v);
  const pb = $('periodBtn'); pb.classList.toggle('hide', !showPeriod);
  if (showPeriod) pb.innerHTML = `${ico('filter')}<span>${(v === 'txs' && S.filters.allTime) ? 'السجل التاريخي' : esc(fperiod(S.period))}</span>`;
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.view === (NAV_OF[v] || v)));
  const views = Object.assign({ income: vIncome, deleted: vDeleted, categories: vCategories, reviewc: vReviewCenter, teachsms: vTeachSms, messages: vMessages, audit: vAudit, limits: vLimits, rules: vRules, home: vHome, spend: vSpend, txs: vTxs, add: vAdd, accounts: vAccounts, more: vMore, review: vReview, teach: vTeach, merchants: vMerchants, beneficiaries: vBeneficiaries, settings: vSettings, backup: vBackup, report: vReport, methods: vMethods, imports: vImports }, V150);
  $('main').innerHTML = (views[v] || vHome)();
}
// الرجوع: كل انتقال من صفحة لصفحة (أو لفلتر جديد) ينحفظ، وزر الرجوع يرجعك لنفس المكان بنفس الفترة والفلاتر.
// الشريط السفلي بداية جديدة.
function navSnapshot() { return { view: S.view, filters: JSON.parse(JSON.stringify(S.filters)), q: S.q, period: S.period, selDay: S.selDay, spendBy: S.spendBy, cardOpen: S.cardOpen, y: window.scrollY || 0 }; }
function go(view, opts) {
  opts = opts || {};
  if (view !== 'txs') S.sel = null;
  if (opts.nav) S.navStack = [];
  else if (!opts.noPush && (view !== S.view || opts.filters)) { S.navStack.push(navSnapshot()); if (S.navStack.length > 25) S.navStack.shift(); }
  // الدخول من رابط أو بطاقة أو تصنيف = فلتر جديد، فيمسح البحث القديم
  S.view = view;
  if (opts.filters) { S.filters = Object.assign({ kind: 'all', allTime: false }, opts.filters); S.q = ''; }
  else if (opts.nav && view === 'txs') { S.filters = { kind: 'all', allTime: true }; S.q = ''; }
  if (history.replaceState) history.replaceState(null, '', '#' + view);
  render(); window.scrollTo(0, 0);
}
// نهاية مسار (حفظ أو إلغاء): نرجع للصفحة اللي بدأ منها بدل ما نكدسها مرة ثانية
function goUp(view) { const top = S.navStack[S.navStack.length - 1]; if (top && top.view === view) return goBack(); go(view, { noPush: true }); }
function goBack() {
  const p = S.navStack.pop();
  if (!p) return go(NAV_OF[S.view] || 'home', { noPush: true });
  if (p.view !== 'txs') S.sel = null;
  Object.assign(S, { view: p.view, filters: p.filters, q: p.q, period: p.period, selDay: p.selDay, spendBy: p.spendBy, cardOpen: p.cardOpen });
  if (history.replaceState) history.replaceState(null, '', '#' + p.view);
  render(); window.scrollTo(0, p.y || 0);
}

/* ---------- الرئيسية ---------- */
function kpi(label, value, sub, action, cls) {
  return `<div class="kpi ${cls || ''}" ${action ? `data-action="kpi" data-kind="${action}"` : ''}><div class="l">${label}</div><div class="v">${value}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
}
function accCard(a) {
  const u = a.type === 'credit_card' ? { color: PAL.blue, icon: 'card' } : a.type === 'cash' ? { color: PAL.green, icon: 'cash' } : a.type === 'wallet' ? { color: PAL.violet, icon: 'wallet' } : { color: '#3A49D6', icon: 'bank' };
  const bal = a.balance == null ? '<span class="muted" style="font-size:15px">غير معروف</span>' : money(a.type === 'credit_card' ? Math.abs(a.balance) : a.balance);
  const bl = a.type === 'credit_card' ? (a.balance > 0 ? 'المستحق' : a.balance < 0 ? 'رصيد لصالحك' : 'الرصيد') : 'الرصيد';
  return `<div class="acc" data-action="accDrill" data-id="${a.id}"><div class="h">${icCircle(u, 's')}<div class="m"><div class="n">${esc(a.name)}</div><div class="d">${esc(a.bank || ACC_L[a.type] || '')}${a.last4 ? ` · <span class="num">…${esc(a.last4)}</span>` : ''}</div></div></div><div class="bl">${bl}${a.balanceDate && a.type !== 'cash' ? ` · ${fdate(a.balanceDate)}` : ''}</div><div class="bv">${bal}</div></div>`;
}
function vHome() {
  const st = store();
  const tools = `<div class="tools">${store().undoStack.length ? `<button data-action="undo" aria-label="تراجع">↶</button>` : ''}<button data-action="go" data-view="alerts" aria-label="التنبيهات" style="position:relative">${ico('bell')}${alertsBadge()}</button><button data-action="go" data-view="reviewc" aria-label="المراجعة" style="position:relative">${ico('question')}${reviewBadge()}</button><button data-action="go" data-view="settings" aria-label="الإعدادات">${ico('gear')}</button></div>`;
  if (!st.all('transactions').length) {
    return `<div class="hero" style="padding-bottom:34px">${tools}<div class="hi">المدير المالي</div><div class="big" style="font-size:28px">ابدأ برفع أول كشف</div><div class="sub">كل شي يُقرأ ويُحفظ على جهازك فقط</div></div>${banners()}
      <div class="card empty">${icCircle({ color: PAL.blue, icon: 'upload' })}<p>ارفع كشف حساب الإنماء أو كشف البطاقة الائتمانية بصيغة Excel.</p><button class="btn p" data-action="pickFile">رفع كشف</button></div>`;
  }
  const cur = E.currentCycle(st) || S.period;
  const R = E.computePeriod(st, cur);
  // الرئيسية للصرف فقط: كم صرفت في الدورة. الدخل والأرصدة في صفحة «الدخل» المستقلة
  let h = `<div class="hero" style="padding-bottom:26px">${tools}<div class="hi">صرفك هذي الدورة</div><div class="big">${money(R.spend)}</div><div class="sub">${fperiod(cur)}${R.coverage.periodOpen ? ' · حتى اليوم' : ''}</div>
    <div class="gl">
      <div class="g" data-action="kpi" data-kind="commitments" data-p="cur">${ico('repeat')}<div><div class="l">الالتزامات المعروفة</div><div class="v">${money(R.commitments)}</div></div></div>
      ${homeForecastTile()}
    </div></div>`;
  h += banners();
  h += homeAlerts();
  // صرفك الأسبوعي
  const wk = E.weekOf(E.todayISO()), ser = E.spendSeries(st, wk, 'day');
  h += `<div class="card"><h2 class="soft">صرفك الأسبوعي</h2>${periodBox(wk, ser.total, { nav: false, action: 'weekToSpend' })}${chartSvg(ser, wk, { compact: true, action: 'weekToSpend' })}${cmpPill(E.comparePeriods(st, wk), wk)}
    <div class="linkrow" data-action="go" data-view="spend">${ico('chart')}<span>جميع صرفياتك</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  h += homeLiquidity();
  const ls = E.limitsStatus(st, cur, R);
  if (ls.length) h += `<div class="card"><h2 class="soft">حدود الصرف</h2>${limitBars(ls.slice(0, 4))}<div class="linkrow" data-action="go" data-view="limits">${ico('wallet')}<span>كل الحدود</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  h += alertCard(R, cur);
  // آخر العمليات
  const recent = st.all('transactions').slice().sort(sortTx).slice(0, 5);
  h += `<div class="card"><h2 class="soft">آخر العمليات</h2>${recent.map(t => txRow(t, true)).join('')}
    <div class="linkrow" data-action="allTxs">${ico('list')}<span>جميع العمليات</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  return h;
}
// «تقريرك المالي غير مكتمل»: كل اللي يحتاج قرارك عشان تكتمل الأرقام
function alertCard(R, cur) {
  const st = store(), items = [];
  const unk = st.all('transactions').filter(t => t.transactionType === 'Unknown');
  if (unk.length) items.push(`${cnt(unk.length, 'op')} نوعها غير معروف (${fmt(E.round2(unk.reduce((s, t) => s + t.grossAmount, 0)))})، والخارجة منها داخلة في صرفك. <a data-action="issueTxs" data-kind="unclassified_all">صنّفها</a>`);
  if (R.temporaryCount) items.push(`${cnt(R.temporaryCount, 'tr')} لأشخاص بتصنيف مؤقت هذي الدورة (${fmt(R.temporarySpend)}). <a data-action="kpi" data-kind="temporary" data-p="cur">حدد تصنيفها</a>`);
  const unc = R.categories.find(c => !c.categoryId);
  if (unc && unc.amount) items.push(`صرف بدون تصنيف هذي الدورة (${fmt(unc.amount)}). <a data-action="kpi" data-kind="uncategorized" data-p="cur">صنّفها</a>`);
  const ru = st.all('transactions').filter(isRoundUpUnknown).length;
  if (ru) items.push(`وجهة التقريب غير محددة (${cnt(ru, 'op')}). <a data-action="setRoundUp">حددها</a>`);
  st.all('instruments').filter(i => i.instrumentOwner === 'unknown').forEach(i => items.push(`مالك «${esc(i.label)}» غير محدد، وعملياتها داخلة في إنفاقك مؤقتًا. <a data-action="editInstrument" data-id="${i.id}">حدده</a>`));
  st.all('accounts').filter(a => a.type === 'unknown' && !a.autoCreated).forEach(a => items.push(`نوع «${esc(a.name)}» غير محدد. <a data-action="editAccount" data-id="${a.id}">حدده</a>`));
  st.all('imports').filter(i => i.balanceValidated === false).forEach(i => items.push(`كشف «${esc(i.filename)}» يحتاج مراجعة: الرصيد ما تطابق.`));
  R.coverage.notes.forEach(n => items.push(`بيانات «${esc(n.name)}» ناقصة من ${fdate(n.from)} إلى ${fdate(n.to)}. <a data-action="pickFile">ارفع كشفها</a>`));
  const nr = openReviews().length;
  if (nr) items.unshift(`${nr === 1 ? 'رسالة وحدة تحتاج' : nr === 2 ? 'رسالتان تحتاجان' : nr + ' رسائل تحتاج'} قرارك. <a data-action="go" data-view="reviewc">افتح المراجعة</a>`);
  if (!items.length) return '';
  const first = items.slice(0, 3), rest = items.slice(3);
  return `<div class="card alertcard"><div class="row"><span class="ic">${ico('question')}</span><div style="flex:1;min-width:0"><div class="t">تقريرك المالي غير مكتمل</div><ul>${first.map(i => `<li>${i}</li>`).join('')}</ul>${rest.length ? `<details class="more" style="margin-top:0"><summary class="go">و${rest.length === 1 ? 'تنبيه واحد آخر' : rest.length === 2 ? 'تنبيهان آخران' : rest.length + ' تنبيهات أخرى'}</summary><ul>${rest.map(i => `<li>${i}</li>`).join('')}</ul></details>` : ''}</div></div></div>`;
}

/* ---------- الدخل (مستقل عن الصرف) ---------- */
function vIncome() {
  const st = store(), p = S.period, R = E.computePeriod(st, p);
  let h = periodBox(p, R.income, { nav: true });
  const row = (dir, label, val, kind, sub) => `<div class="r" ${kind ? `data-action="kpi" data-kind="${kind}"` : ''}>${dir}<div class="l">${label}${sub ? `<div class="s">${sub}</div>` : ''}</div><div class="v">${val}</div></div>`;
  h += `<div class="card rows">
    ${row(`<span class="dir n">${ico('inn')}</span>`, 'الدخل المؤكد', money(R.income), 'income', cnt(R.incomeItems.length, 'op'))}
    ${row(`<span class="dir w">${ico('inn')}</span>`, 'داخل غير مصنف', money(R.unclassifiedIn), 'unclassified_in', R.unclassifiedInCount ? cnt(R.unclassifiedInCount, 'op') + ' (تحويلات لك من أشخاص وغيرها)' : 'لا يوجد')}
    ${row(`<span class="dir x">${ico('wallet')}</span>`, 'الفائض', money(R.surplus, R.surplus < 0 ? 'neg' : ''), null, `الدخل المؤكد − الإنفاق (${fmt(R.spend)})`)}</div>`;
  h += `<div class="card"><h2 class="soft">دخل الفترة</h2>${R.incomeItems.length ? R.incomeItems.map(id => st.get('transactions', id)).filter(Boolean).sort(sortTx).map(t => txRow(t, true)).join('') : '<div class="muted">ما فيه دخل مسجل في هذي الفترة.</div>'}</div>`;
  const ORD = { checking: 0, savings: 1, credit_card: 2, wallet: 3, unknown: 4, other: 5, cash: 6 };
  const accs = E.accountBalances(st).filter(a => a.isMine !== false).sort((x, y) => (ORD[x.type] ?? 9) - (ORD[y.type] ?? 9));
  h += `<div class="card"><h2 class="soft">كم معك (أرصدة حساباتك)</h2><p class="small muted">آخر رصيد معروف من الكشوف، والنقد من السحوبات ناقص اللي وضحت صرفه.</p><div class="accs flat">${accs.map(accCard).join('')}</div></div>`;
  return h;
}

/* ---------- صرفياتك ---------- */
const DAY_S = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MON_S = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
const PK_L = { week: 'أسبوعي', cycle: 'الدورة', year: 'سنوي' };
const PREV_L = { week: 'الأسبوع الماضي', cycle: 'الدورة الماضية', month: 'الشهر الماضي', year: 'السنة الماضية', custom: 'الفترة السابقة' };
const pkindOf = (p) => (p.kind === 'month' || p.kind === 'cycle') ? 'cycle' : p.kind;
function periodLabel(p) {
  if (p.kind === 'year') return `سنة ${p.start.slice(0, 4)}`;
  if (p.kind === 'week') { const a = dparts(p.start), b = dparts(p.end); return `${DAYS[a.wd]}، ${a.d} ${MONTHS[a.m - 1]} — ${DAYS[b.wd]}، ${b.d} ${MONTHS[b.m - 1]}`; }
  return `${fdate(p.start, dparts(p.start).y !== dparts(p.end).y)} — ${fdate(p.end, true)}`;
}
function periodBox(p, total, opts) {
  opts = opts || {};
  const today = E.todayISO();
  const mid = `<div class="mid ${opts.nav ? '' : 'solo'}" data-action="${opts.action || 'pickPeriod'}"><div class="rg">${opts.label || periodLabel(p)}</div><div class="tot">${money(total)}${opts.clear ? `<button class="x" data-action="clearSel" aria-label="إلغاء اختيار اليوم">×</button>` : ''}</div></div>`;
  if (!opts.nav) return `<div class="pbox"><div class="in">${mid}</div></div>`;
  return `<div class="pbox"><div class="in"><button class="arr" data-action="pShift" data-dir="-1" aria-label="الفترة السابقة">${ico('chevR')}</button>${mid}<button class="arr" data-action="pShift" data-dir="1" aria-label="الفترة التالية" ${p.end >= today ? 'disabled' : ''}>${ico('chevL')}</button></div></div>`;
}
function cmpPill(c, p, isDay) {
  if (!c) return '';
  if (!c.reliable) return `<div class="cmp"><span class="p na">${ico('alert')}المقارنة غير متاحة: بيانات ${isDay ? 'اليوم السابق' : 'الفترة السابقة'} ناقصة</span></div>`;
  const what = isDay ? 'من اليوم اللي قبله' : c.partial ? `من نفس الأيام في ${PREV_L[p.kind] || 'الفترة السابقة'}` : `من ${PREV_L[p.kind] || 'الفترة السابقة'}`;
  if (Math.abs(c.diff) < 0.005) return `<div class="cmp"><span class="p na">نفس الصرف ${what}</span></div>`;
  return c.diff < 0 ? `<div class="cmp"><span class="p dn">${ico('spark')}أقل بـ <span class="num">${fmt(-c.diff)}</span> ${what}</span></div>`
    : `<div class="cmp"><span class="p up">${ico('flame')}أكثر بـ <span class="num">${fmt(c.diff)}</span> ${what}</span></div>`;
}
// الرسم: أعمدة مكدسة حسب التصنيف. أكبر 5 تصنيفات بألوان مختلفة، والباقي رمادي
function chartSegments(ser) {
  const tot = {};
  ser.buckets.forEach(b => Object.entries(b.cats).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; }));
  const ranked = Object.entries(tot).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const shown = [], hues = new Set();
  ranked.forEach(([k]) => { const u = catUi(k); if (shown.length < 5 && u.hue && u.hue !== 'gray' && !hues.has(u.hue)) { shown.push(k); hues.add(u.hue); } });
  if (tot.__none > 0) shown.push('__none'); // بدون تصنيف: رمادي بعلامته الخاصة
  return shown;
}
function chartSvg(ser, p, opts) {
  opts = opts || {};
  const W = 340, H = opts.compact ? 130 : 160, top = 8, labH = 24, gut = 44;
  const plotW = W - gut, plotH = H - top - labH;
  const n = ser.buckets.length, slot = plotW / n;
  const bw = Math.max(3, Math.min(34, slot * (n > 14 ? 0.62 : 0.56)));
  const max = Math.max.apply(null, ser.buckets.map(b => b.total).concat([0]));
  const nice = max > 0 ? max : 1;
  const shown = chartSegments(ser);
  const today = E.todayISO();
  const y = (v) => top + plotH - (v / nice) * plotH;
  let g = '';
  const axf = (v) => nice >= 1000 ? Math.round(v).toLocaleString('en-US') : fmt(v);
  [0, 0.5, 1].forEach(f => { const yy = y(nice * f); g += `<line x1="0" x2="${plotW}" y1="${yy}" y2="${yy}" stroke="#ECEEF3" stroke-width="1"/><text x="${W - 2}" y="${yy + 4}" text-anchor="end">${max ? axf(nice * f) : f === 0 ? '0' : ''}</text>`; });
  const sel = S.selDay;
  ser.buckets.forEach((b, i) => {
    const cx = plotW - (i + 0.5) * slot, x = cx - bw / 2;
    const dim = sel && sel !== b.key ? ' opacity="0.3"' : '';
    const future = b.start > today;
    if (b.total > 0) {
      let acc = 0; const segs = [];
      shown.forEach(k => { if (b.cats[k] > 0) segs.push([catUi(k).color, b.cats[k]]); });
      const rest = E.round2(b.total - segs.reduce((s, x2) => s + x2[1], 0));
      if (rest > 0) segs.push([REST_C, rest]);
      g += `<g${dim}>`;
      segs.forEach((sg, j) => {
        const y0 = y(acc), y1 = y(acc + sg[1]); acc += sg[1];
        const hgt = Math.max(0, y0 - y1 - (j < segs.length - 1 ? 1.5 : 0));
        const r = j === segs.length - 1 ? Math.min(4, bw / 2, hgt) : 0;
        g += r ? `<path d="M${x},${y1 + hgt} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y1 + hgt} Z" fill="${sg[0]}"/>` : `<rect x="${x}" y="${y1}" width="${bw}" height="${hgt}" fill="${sg[0]}"/>`;
      });
      g += `</g>`;
    } else if (!future) g += `<rect x="${x}" y="${top + plotH - 3}" width="${bw}" height="3" rx="1.5" fill="#E3E6ED"${dim}/>`;
    // عنوان العمود
    let lab = '';
    if (p.kind === 'week') lab = DAY_S[dparts(b.key).wd];
    else if (p.kind === 'year') lab = MON_S[Number(b.key.slice(5, 7)) - 1];
    else { const d = dparts(b.key).d; if (i === 0 || i === n - 1 || (n > 10 ? i % 5 === 0 : true)) lab = String(d); }
    if (lab) g += `<text class="dl ${sel === b.key ? 'on' : ''}" x="${cx}" y="${H - 6}" text-anchor="middle"${future ? ' opacity="0.5"' : ''}${p.kind === 'year' ? ' style="font-size:10px"' : ''}>${lab}</text>`;
    if (!future || b.total) g += `<rect class="bar" x="${cx - slot / 2}" y="0" width="${slot}" height="${H}" fill="transparent" data-action="${opts.action || 'selDay'}" data-d="${b.key}"><title>${b.key}: ${fmt(b.total)}</title></rect>`;
  });
  let legend = '';
  if (!opts.compact && ser.total > 0) {
    const anyRest = ser.buckets.some(b => E.round2(b.total - shown.reduce((s, k) => s + (b.cats[k] || 0), 0)) > 0);
    legend = `<div class="legend">${shown.map(k => `<span><i style="background:${catUi(k).color}"></i>${esc(bucketName(k))}</span>`).join('')}${anyRest ? `<span><i style="background:${REST_C}"></i>باقي التصنيفات</span>` : ''}</div>`;
  }
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" direction="ltr" style="direction:ltr" role="img" aria-label="الإنفاق حسب ${p.kind === 'year' ? 'الشهر' : 'اليوم'}">${g}</svg>${legend}</div>`;
}
function whereList(R) {
  const cats = R.categories.filter(c => c.amount > 0);
  if (!cats.length) return `<div class="muted">لا يوجد إنفاق في هذي الفترة.</div>`;
  const max = cats[0].amount;
  return `<div class="where">${cats.map(c => {
    const key = c.categoryId || '__none', u = catUi(key === '__none' ? null : key);
    const pct = R.spend ? c.amount / R.spend * 100 : 0;
    const w = Math.max(40, Math.min(100, c.amount / max * 100));
    const s0 = c.subs.find(s => s.subcategoryId && s.amount < c.amount - 0.005);
    const sc = s0 ? `<span class="sc" style="color:${u.color}">${glyph(catUi(s0.subcategoryId))}<span class="num" style="color:var(--ink-2)">${(s0.amount / R.spend * 100).toFixed(2)}%</span></span>` : '';
    return `<div class="w" data-action="catDrill" data-cat="${key}"><div class="bar" style="background:${tint(u.color, '24')};width:${w}%"><span style="color:${u.color}">${glyph(u)}</span><div class="m"><div class="t">${esc(bucketName(c.categoryId))}</div><div class="p"><span class="num">${pct.toFixed(2)}%</span>${sc}</div></div></div><div class="a">${money(c.amount)}</div></div>`;
  }).join('')}</div>`;
}
// الصرف حسب البطاقة (أو الحساب للعمليات اللي ما لها بطاقة)، وكل بطاقة تنفتح على تصنيفاتها
function cardName(c) {
  const i = c.instrumentId ? store().get('instruments', c.instrumentId) : null;
  if (i) return i.label + (i.ownerName ? ' · ' + i.ownerName : '');
  const a = c.accountId ? accOf(c.accountId) : null; return a ? a.name : 'بدون بطاقة';
}
function cardList(R) {
  const cards = R.cards.filter(c => c.amount > 0.004);
  if (!cards.length) return `<div class="muted">لا يوجد إنفاق في هذي الفترة.</div>`;
  const max = cards[0].amount;
  return `<div class="where cards">${cards.map(c => {
    const i = c.instrumentId ? store().get('instruments', c.instrumentId) : null, a = accOf(c.accountId);
    const u = i && i.kind === 'cash' ? { color: PAL.green, icon: 'cash' } : (a && a.type === 'credit_card') || (i && i.kind === 'credit_card') ? { color: PAL.blue, icon: 'card' } : { color: '#3A49D6', icon: i ? 'card' : 'bank' };
    const pct = R.spend ? c.amount / R.spend * 100 : 0, w = Math.max(62, Math.min(100, c.amount / max * 100));
    let row = `<div class="w" data-action="cardOpen" data-k="${esc(c.key)}"><div class="bar" style="background:${tint(u.color, '24')};width:${w}%"><span style="color:${u.color}">${ico(u.icon)}</span><div class="m"><div class="t">${esc(cardName(c))}</div><div class="p"><span class="num">${pct.toFixed(2)}%</span> · ${i ? cnt(c.count, 'op') : 'بدون بطاقة'}</div></div></div><div class="a">${money(c.amount)}</div></div>`;
    if (S.cardOpen === c.key) row += `<div class="cardcats"><div class="list">${c.cats.filter(x => x.amount > 0.004).map(x => { const key = x.categoryId || '__none', cu = catUi(key === '__none' ? null : key); return `<div class="it" data-action="cardCatDrill" data-k="${esc(c.key)}" data-cat="${key}">${icCircle(cu, 's')}<div class="m"><div class="t">${esc(bucketName(x.categoryId))}</div><div class="s"><span class="num">${(c.amount ? x.amount / c.amount * 100 : 0).toFixed(1)}%</span> من البطاقة</div></div>${money(x.amount)}</div>`; }).join('')}</div><div class="linkrow" data-action="cardCatDrill" data-k="${esc(c.key)}" data-cat="">${ico('list')}<span>كل عمليات البطاقة في الفترة</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
    return row;
  }).join('')}</div>`;
}
function vSpend() {
  const st = store();
  if (!st.all('transactions').length) return `<div class="card empty">ما فيه عمليات للحين. <br><button class="btn p" data-action="pickFile">رفع كشف</button></div>`;
  const p = S.period, pk = pkindOf(p);
  const bucket = p.kind === 'year' ? 'month' : 'day';
  const ser = E.spendSeries(st, p, bucket);
  if (S.selDay && !ser.buckets.some(b => b.key === S.selDay)) S.selDay = null;
  const sel = S.selDay;
  let h = `<div class="tabs">${['week', 'cycle', 'year'].map(k => `<button class="${pk === k ? 'on' : ''}" data-action="setPKind" data-v="${k}">${k === 'cycle' && settings().cycleMode === 'calendar' ? 'شهري' : PK_L[k]}</button>`).join('')}</div>`;
  if (sel) {
    const b = ser.buckets.find(x => x.key === sel);
    const lab = bucket === 'month' ? `${MONTHS[Number(sel.slice(5, 7)) - 1]} ${sel.slice(0, 4)}` : fday(sel);
    h += periodBox(p, b.total, { nav: false, label: lab, clear: true, action: 'clearSel' });
  } else h += periodBox(p, ser.total, { nav: true });
  h += chartSvg(ser, p, {});
  if (sel && bucket === 'day') h += cmpPill(E.compareDay(st, sel), p, true);
  else if (!sel) h += cmpPill(E.comparePeriods(st, p), p);
  const selB = sel ? ser.buckets.find(x => x.key === sel) : null;
  const R = E.computePeriod(st, selB ? { start: selB.start, end: selB.end, kind: 'custom' } : p);
  if (!sel) {
    if (R.coverage.periodOpen) h += `<div class="banner i">الفترة ما انتهت: الأرقام حتى اليوم.</div>`;
    R.coverage.notes.forEach(n => { h += `<div class="banner w">بيانات «${esc(n.name)}» ناقصة من ${fdate(n.from)} إلى ${fdate(n.to)}، فالأرقام المرتبطة بها ناقصة.</div>`; });
    const spendSub = [R.temporaryCount ? `منه ${fmt(R.temporarySpend)} تحويلات بتصنيف مؤقت` : '', R.unownedCount ? `و${fmt(R.unownedSpend)} بأدوات مالكها غير محدد` : ''].filter(Boolean).join(' ');
    const row = (dir, label, val, kind, sub, cls) => `<div class="r ${cls || ''}" ${kind ? `data-action="kpi" data-kind="${kind}"` : ''}>${dir}<div class="l">${label}${sub ? `<div class="s">${sub}</div>` : ''}</div><div class="v">${val}</div></div>`;
    h += `<div class="card rows">
      ${row(`<span class="dir o">${ico('out')}</span>`, 'الإنفاق الحقيقي', money(R.spend), 'spend', spendSub)}
      ${row(`<span class="dir x">${ico('repeat')}</span>`, 'الالتزامات المعروفة', money(R.commitments), 'commitments', cnt(R.commitmentItems.length, 'op'))}
      <details class="more"><summary>أرقام أكثر</summary>
      ${row(`<span class="dir w">${ico('out')}</span>`, 'منه عمليات ما عُرف نوعها', money(R.unclassifiedOut), 'unclassified_out', R.unclassifiedOutCount ? `${cnt(R.unclassifiedOutCount, 'op')}${R.roundUpUnknownCount ? `، منها تقريب ${fmt(R.roundUpUnknown)}` : ''}` : 'لا يوجد', 'sub')}
      ${row(`<span class="dir o">${ico('cash')}</span>`, 'منه سحب نقدي', money(R.cashWithdrawals), 'cash', R.cashWithdrawalsCount ? cnt(R.cashWithdrawalsCount, 'op') : 'لا يوجد', 'sub')}
      ${row(`<span class="dir x">${ico('out')}</span>`, 'ما تنحسب في الصرف', money(R.excludedSpend), 'excluded', R.excludedCount ? cnt(R.excludedCount, 'op') : 'لا يوجد', 'sub')}
      ${row(`<span class="dir x">${ico('swap')}</span>`, 'التحويلات الداخلية', money(R.internal), 'internal', `${cnt(R.internalCount, 'tr')}${R.internalOneSided ? `، ${R.internalOneSided === R.internalCount ? 'كلها' : R.internalOneSided} غير مكتمل الربط` : ''}`, 'sub')}
      ${row(`<span class="dir x">${ico('card')}</span>`, 'سداد البطاقات', money(R.cardPayments), 'card', `${cnt(R.cardPaymentsCount, 'op')}${R.cardPaymentsUnmatched ? `، ${R.cardPaymentsUnmatched === R.cardPaymentsCount ? 'كلها' : R.cardPaymentsUnmatched} غير مطابقة` : ''}`, 'sub')}
      ${row(`<span class="dir x">${ico('receipt')}</span>`, 'الرسوم', money(R.fees), 'fees', null, 'sub')}
      </details></div>`;
  }
  h += `<div class="card"><h2 class="soft">وين راحت الدراهم؟</h2>`;
  if (sel && bucket === 'day') {
    const list = st.all('transactions').filter(t => (t.transactionDate || t.postingDate) === sel).sort(sortTx);
    h += list.length ? list.map(t => txRow(t)).join('') : `<div class="muted">ما فيه عمليات في هذا اليوم.</div>`;
  } else {
    h += `<div class="seg" style="margin-bottom:12px"><button class="${S.spendBy !== 'card' ? 'on' : ''}" data-action="spendBy" data-v="cat">حسب التصنيف</button><button class="${S.spendBy === 'card' ? 'on' : ''}" data-action="spendBy" data-v="card">حسب البطاقة</button></div>`;
    h += S.spendBy === 'card' ? cardList(R) : whereList(R);
  }
  h += `</div>`;
  if (!sel) {
    h += `<div class="grid2"><div class="card"><h2 class="soft">أكثر التجار</h2>`;
    h += R.topMerchants.length ? `<div class="list">${R.topMerchants.slice(0, 6).map(m => { const mm = st.get('merchants', m.merchantId); const u = catUi(mm && (mm.categoryId || mm.suggestedCategoryId)); return `<div class="it" data-action="merchantDrill" data-id="${m.merchantId}">${icCircle(u, 's')}<div class="m"><div class="t">${esc(mm ? mm.name : '—')}</div><div class="s">${cnt(m.count, 'op')}</div></div>${money(m.amount)}</div>`; }).join('')}</div>` : `<div class="muted">لا يوجد.</div>`;
    h += `</div><div class="card"><h2 class="soft">أعلى العمليات</h2>`;
    h += R.topTx.length ? R.topTx.slice(0, 6).map(x => txRow(st.get('transactions', x.id), true)).join('') : `<div class="muted">لا يوجد.</div>`;
    h += `</div></div>`;
  }
  return h;
}

/* ---------- العمليات ---------- */
const KIND_L = { all: 'الكل', spend: 'إنفاق', income: 'دخل', internal: 'تحويلات داخلية', card: 'سداد بطاقات', card_unmatched: 'سداد بطاقة غير مطابق', unclassified_out: 'خارج ما عُرف نوعه', unclassified_in: 'داخل غير مصنف', unclassified_all: 'غير معروف', temporary: 'تصنيف مؤقت', uncategorized: 'بدون تصنيف', commitments: 'التزامات', roundup: 'تقريب', unowned: 'مالك الأداة غير محدد', fees: 'رسوم', excluded: 'ما تنحسب في الصرف', cash: 'سحب نقدي', refunds: 'استردادات' };
function matchKind(t, kind) {
  const st = store();
  switch (kind) {
    case 'all': return true;
    case 'spend': return !E.isExcluded(st, t) && (E.spendEffect(t) !== 0 || E.feeOf(t) > 0);
    case 'income': return t.transactionType === 'Income';
    case 'internal': return t.transactionType === 'InternalTransfer' && !isRoundUpUnknown(t);
    case 'card': return t.transactionType === 'CreditCardPayment';
    case 'card_unmatched': return isCardUnmatched(t);
    case 'unclassified_out': return (t.transactionType === 'Unknown' && t.direction === 'out') || isRoundUpUnknown(t);
    case 'excluded': return E.isExcluded(st, t) && (E.spendEffect(t) !== 0 || E.feeOf(t) > 0);
    case 'oldcash': return isOldCash(t);
    case 'cash': return t.transactionType === 'CashWithdrawal';
    case 'refunds': return t.transactionType === 'Refund';
    case 'unclassified_in': return t.transactionType === 'Unknown' && t.direction === 'in';
    case 'unclassified_all': return t.transactionType === 'Unknown';
    case 'temporary': return t.classificationStatus === 'temporary';
    case 'uncategorized': return E.spendParts(st, t).some(p => p.cat === '__none');
    case 'commitments': return E.spendEffect(t) > 0 && E.isKnownCommitment(st, t);
    case 'roundup': return t.transferSubtype === 'round_up';
    case 'unowned': { const i = insOf(t); return !!(i && i.instrumentOwner === 'unknown'); }
    case 'fees': return E.feeOf(t) > 0;
  }
  return true;
}
function filteredTxs() {
  const f = S.filters, q = S.q.trim().toLowerCase(), st = store();
  // قوائم الصرف (تصنيف أو نوع صرف) تمشي على نفس تاريخ الأرقام: الاسترداد المربوط على تاريخ شرائه
  const bySpend = !!f.categoryId || !!f.nec || !!f.rate || !!f.savings || !!f.cityId || ['spend', 'uncategorized', 'excluded', 'cash'].includes(f.kind);
  if (f.txIds) { const ids = new Set(f.txIds); return st.all('transactions').filter(t => ids.has(t.id)).sort(sortTx); }
  let list = f.allTime ? st.all('transactions') : st.all('transactions').filter(t => { const d = bySpend ? E.spendDate(st, t) : (t.transactionDate || t.postingDate); return d >= S.period.start && d <= S.period.end; });
  list = list.filter(t => {
    if (!matchKind(t, f.kind)) return false;
    if (f.accountId && t.accountId !== f.accountId) return false;
    if (f.instrumentId && t.instrumentId !== f.instrumentId) return false;
    if (f.noIns && t.instrumentId) return false;
    if (f.method && (t.paymentMethod || 'Unknown') !== f.method) return false;
    if (f.source && !(t.sourceLinks || []).some(s => s.sourceType === f.source)) return false;
    if (f.merchantId && t.merchantId !== f.merchantId) return false;
    if (f.beneficiaryId && t.beneficiaryId !== f.beneficiaryId) return false;
    if (f.categoryId) {
      // نفس توزيع الأرقام: السحب النقدي المقسّم يطلع تحت تصنيف كل جزء، والرسوم تحت «رسوم»
      if (!E.spendParts(store(), t).some(p => p.cat === f.categoryId)) return false;
    }
    if (!match150(t, f)) return false;
    if (q) {
      const m = merchantOf(t), b = benOf(t), a = accOf(t.accountId), i = insOf(t);
      const hay = [txTitle(t), t.merchantRaw, t.beneficiaryRaw, m && m.name, m && (m.aliases || []).join(' '), b && b.name, b && b.bank, a && a.name, a && a.bank, i && i.label, i && i.last4, catLabel(t), t.note, t.reference].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  return list.sort(sortTx);
}
// سطر الفلاتر (ومعه كلمة البحث)؛ يتحدث مع الكتابة في البحث
function filtersLine() {
  const f = S.filters, active = [];
  if (f.kind !== 'all') active.push(KIND_L[f.kind]);
  if (f.categoryId) active.push(bucketName(f.categoryId === '__none' ? null : f.categoryId));
  if (f.accountId) { const a = accOf(f.accountId); active.push(a ? a.name : 'حساب'); }
  if (f.instrumentId) { const i = store().get('instruments', f.instrumentId); active.push(i ? i.label : 'أداة'); }
  if (f.method) active.push(METHOD_L[f.method] || f.method);
  if (f.source) active.push(SRC_L[f.source] || f.source);
  if (f.merchantId) { const m = store().get('merchants', f.merchantId); active.push(m ? m.name : 'تاجر'); }
  if (f.beneficiaryId) { const b = store().get('beneficiaries', f.beneficiaryId); active.push(b ? b.name : 'مستفيد'); }
  filtersLine150(f).forEach(x => active.push(x));
  if (S.q.trim()) active.push(`بحث: «${S.q.trim()}»`);
  if (!f.allTime && !f.txIds) active.push(fperiod(S.period));
  return active.length ? `<div class="small muted" style="margin-top:6px">الفلاتر: ${esc(active.join(' + '))} — <a href="#" data-action="clearFilters">مسح</a></div>` : '';
}
function vTxs() {
  const f = S.filters, list = filteredTxs();
  let h = `<div class="card noprint" style="padding:10px"><input type="search" id="q" placeholder="ابحث: تاجر، مستفيد، تصنيف، بنك، آخر أرقام البطاقة، ملاحظة…" value="${esc(S.q)}" data-input="search">
    <div class="chips" style="margin-top:8px">${['all', 'spend', 'income', 'uncategorized', 'temporary', 'unclassified_out', 'internal', 'card'].map(k => `<button class="chip ${f.kind === k ? 'on' : ''}" data-action="setKind" data-kind="${k}">${KIND_L[k]}</button>`).join('')}<button class="chip" data-action="filterSheet">فلاتر أكثر…</button><button class="chip ${S.sel ? 'on' : ''}" data-action="${S.sel ? 'selEnd' : 'selStart'}">${S.sel ? 'إنهاء التحديد' : 'تحديد'}</button></div>
    <div id="fline">${filtersLine()}</div></div>`;
  const nDel = store().all('deletedTxs').length;
  return h + `<div id="txlist">${txListHtml(list)}</div>` + (nDel && !S.sel ? `<div class="card"><div class="linkrow" data-action="go" data-view="deleted">${ico('trash')}<span>المحذوفة (${nDel})</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>` : '') + selBar();
}
function txListHtml(list) {
  list = list || filteredTxs();
  const st = store();
  // أثرها على الإنفاق: نفس توزيع الأرقام (المستثنى صفر، والتصنيف المختار بحصته بس)
  const total = E.round2(list.reduce((s, t) => s + txImpact(t, S.filters), 0));
  let h = `<div class="muted small" style="margin:0 2px 6px">${cnt(list.length, 'op')}${total ? ` · أثرها على الإنفاق ${fmt(total)}` : ''}</div>`;
  void st;
  if (!list.length) return h + `<div class="card empty">لا توجد عمليات بهذه الفلاتر.</div>`;
  let day = null, open = false;
  const limit = S.txLimit || 300;
  list.slice(0, limit).forEach(t => {
    const d = t.transactionDate || t.postingDate;
    if (d !== day) { if (open) h += `</div>`; h += `<div class="day">${fday(d)}</div><div class="txs">`; day = d; open = true; }
    h += txRow(t);
  });
  if (open) h += `</div>`;
  if (list.length > limit) h += `<div style="text-align:center;margin:14px"><button class="btn" data-action="moreTx">عرض المزيد (${list.length - limit})</button></div>`;
  return h;
}

/* ---------- إضافة واستيراد ---------- */
function vAdd() {
  let h = banners();
  h += `<div class="card"><h2>رفع كشف</h2><div class="drop" data-action="pickFile"><b>اختر ملف Excel أو CSV</b><div class="muted small">كشف حساب الإنماء أو كشف البطاقة الائتمانية. أي بنك ثاني تعلّمه مرة وحدة.</div></div>
    <div class="muted small" style="margin-top:8px">الملف يُقرأ على جهازك ولا يُرسل لأي مكان. الآيبان ورقم الهوية وأرقام الحسابات تنخفي قبل الحفظ.</div></div>`;
  h += `<div class="card"><h2>لصق رسائل البنك</h2><textarea id="smsPaste" rows="5" placeholder="الصق رسالة أو أكثر. الأضمن: سطر فاضي بين كل رسالة."></textarea>
    <div class="btns" style="margin-top:8px;flex-wrap:nowrap"><input type="text" id="smsSender" placeholder="المرسل (اختياري، مثل alinma)" style="flex:1"><button class="btn p" data-action="pasteSms">اقرأ الرسائل</button></div>
    <div class="muted small" style="margin-top:6px">رسائل رموز التحقق ما ينحفظ نصها. الآيبان وأرقام الحسابات تتحول لبصمة وتنخفي قبل الحفظ.</div></div>`;
  h += `<div class="card"><h2>إدخال سريع</h2><div class="btns" style="flex-wrap:nowrap"><input type="text" id="quick" placeholder="مثال: قهوة 18" enterkeyhint="done" style="flex:1"><button class="btn p" data-action="quickAdd">أضف</button></div>
    <div class="btns" style="margin-top:10px"><button class="btn" data-action="manual" data-kind="expense">مصروف</button><button class="btn" data-action="manual" data-kind="withdrawal">سحب نقدي</button><button class="btn" data-action="manual" data-kind="deposit">إيداع نقدي</button><button class="btn" data-action="manual" data-kind="income">دخل</button></div></div>`;
  h += `<div class="card"><h2>سجل الاستيراد <span class="sp"></span><button class="btn" data-action="go" data-view="imports">عرض الكل</button></h2>${importList(5)}</div>`;
  return h;
}
function importList(limit) {
  const imps = store().all('imports').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!imps.length) return `<div class="muted">ما فيه استيراد للحين.</div>`;
  return `<div class="list">${imps.slice(0, limit || 999).map(i => { const a = accOf(i.accountId); const bc = i.balanceValidated === true ? '<span class="b g">متوازن</span>' : i.balanceValidated === false ? '<span class="b r">يحتاج مراجعة</span>' : '<span class="b n">فحص الرصيد غير متاح</span>';
    const cp = i.cardPaymentsStatus ? `<span class="b ${i.cardPaymentsStatus === 'matched' ? 'g' : 'w'}">المدفوعات: ${i.cardPaymentsStatus === 'matched' ? 'مطابقة' : i.cardPaymentsStatus === 'partial' ? 'مطابقة جزئيًا' : 'غير مطابقة'}</span>` : '';
    return `<div class="it"><div class="m"><div class="t">${esc(a ? a.name : '—')}</div><div class="s">${esc(i.filename)} · ${fdate(i.startDate, true)} – ${fdate(i.endDate, true)} · ${i.transactionCount} سطر (${i.created} جديدة، ${i.merged} مدمجة)</div><div class="badges">${bc}${cp}<span class="b n">استورد ${fdate(ldate(i.createdAt), true)}</span></div></div><button class="btn r" data-action="deleteImport" data-id="${i.id}">حذف</button></div>`; }).join('')}</div>`;
}
function vImports() { return `<div class="card"><h2>سجل الاستيراد</h2><p class="muted small">حذف استيراد يحذف عملياته. العملية اللي لها مصدر ثاني (مثل كشف متداخل) تبقى بمصدرها الآخر.</p>${importList()}</div>`; }

/* ---------- مراجعة الاستيراد ---------- */
function vReview() {
  const p = S.plan; if (!p) return `<div class="card empty">ما فيه استيراد قيد المراجعة.</div>`;
  const bc = p.balanceCheck || {}, s = p.summary, h0 = p.header || {};
  let h = `<div class="card"><h2>${p.kind === 'credit_card' ? 'كشف بطاقة ائتمانية' : 'كشف حساب'} · ${esc(h0.bank || '')}</h2>
    <dl class="kv"><dt>الحساب</dt><dd>${esc(p.account.name)}${p.newAccounts.has(p.account.id) ? ' <span class="b g">جديد</span>' : ''}</dd>
    <dt>الفترة</dt><dd>${fdate(p.startDate, true)} – ${fdate(p.endDate, true)}</dd><dt>عدد السطور</dt><dd><span class="num">${p.txs.length}</span></dd><dt>الملف</dt><dd class="small">${esc(p.filename)}</dd></dl></div>`;
  // فحص الرصيد
  h += `<div class="card"><h2>فحص الرصيد</h2>`;
  if (p.kind === 'credit_card') {
    if (bc.ambiguous && !bc.userChosen) {
      h += `<div class="banner w">الملف يكتب الرصيد السابق (${fmt(h0.previousBalance)}) بدون إشارة، وما قدرت أحدد اتجاهه من المستحق والحد المتاح. حدده أنت:</div>
        <div class="btns"><button class="btn" data-action="cardDir" data-dir="debit">مبلغ عليك (مدين) ← الختامي ${fmt(bc.closingIfDebit)}</button><button class="btn" data-action="cardDir" data-dir="credit">مبلغ لصالحك (دائن) ← الختامي ${fmt(bc.closingIfCredit)}</button></div>`;
    } else {
      h += `<div class="banner ${bc.ok ? 'g' : 'w'}">${bc.ok ? '✓ الكشف متوازن' : '⚠ الكشف يحتاج مراجعة'}</div>
        <dl class="kv"><dt>الرصيد السابق</dt><dd>${num(h0.previousBalance)} ${bc.direction === 'credit' ? '(لصالحك)' : '(عليك)'}${bc.userChosen ? ' <span class="b w">حددته أنت</span>' : ''}</dd>
        <dt>المشتريات والرسوم</dt><dd>${num(bc.purchases + bc.fees)}</dd><dt>المدفوعات</dt><dd>${num(bc.payments)}</dd>${bc.otherCredits ? `<dt>مبالغ دائنة أخرى</dt><dd>${num(bc.otherCredits)}</dd>` : ''}
        <dt>الرصيد الختامي</dt><dd>${num(bc.closing)} ${bc.closing > 0 ? 'مستحق' : bc.closing < 0 ? 'لصالحك' : ''}</dd><dt>كامل المبلغ المستحق في الكشف</dt><dd>${num(h0.totalDue)}</dd><dt>الحد − المتاح</dt><dd>${num(bc.usedLimit)}</dd></dl>`;
      if (!bc.purchasesOk) h += `<div class="banner w" style="margin-top:8px">مجموع المشتريات في السطور ما يطابق رقم الرأس (${fmt(h0.purchasesHeader)}).</div>`;
      if (!bc.paymentsOk) h += `<div class="banner w" style="margin-top:8px">مجموع المدفوعات في السطور ما يطابق رقم الرأس (${fmt(h0.paymentsHeader)}).</div>`;
    }
  } else if (bc.status === 'unavailable') h += `<div class="banner i">الكشف ما فيه أرصدة، ففحص الرصيد غير متاح.</div>`;
  else {
    h += `<div class="banner ${bc.ok ? 'g' : 'w'}">${bc.ok ? '✓ الكشف متوازن' : '⚠ الكشف يحتاج مراجعة'}</div><dl class="kv">`;
    if (bc.opening != null) h += `<dt>الافتتاحي</dt><dd>${num(bc.opening)}</dd>`;
    if (bc.credits != null) h += `<dt>الإيداعات</dt><dd>${num(bc.credits)} (${bc.depositCount})</dd><dt>السحوبات</dt><dd>${num(Math.abs(bc.debits))} (${bc.withdrawCount})</dd>`;
    h += `<dt>الختامي</dt><dd>${num(bc.closing)}</dd><dt>الرصيد سطر بسطر</dt><dd>${bc.runningOk ? '✓ صحيح' : `⚠ يختل عند السطر ${bc.mismatch.rowIndex + 1}: المتوقع ${fmt(bc.mismatch.expected)} والمكتوب ${fmt(bc.mismatch.actual)}`}</dd>`;
    if (bc.totalsOk === false) h += `<dt>مجاميع الرأس</dt><dd>⚠ لا تطابق السطور</dd>`;
    h += `</dl>`;
  }
  h += `</div>`;
  // ملخص
  const tile = (l, v, sub) => `<div class="kpi" style="cursor:default"><div class="l">${l}</div><div class="v num">${v}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
  h += `<div class="kpis k5">${tile('عمليات جديدة', s.newTx)}${tile('تندمج تلقائيًا', s.autoMerged, 'موجودة من مصدر سابق')}${tile('تكرار محتمل', s.possible, s.possible ? 'تحتاج قرارك تحت' : '')}${tile('تحويلات داخلية', s.internal)}${tile('سداد بطاقات', s.cardPayments)}</div>`;
  if (s.deletedAgain) h += `<div class="banner w">${cnt(s.deletedAgain, 'op')} في هذا الملف حذفتها قبل. تبقى محذوفة إلا إذا اخترت «رجّعها» تحت.</div>`;
  h += `<div class="kpis k5">${tile('تقريب', s.roundUps, 'ينحسب صرف لين تحدد وجهته')}${tile('تحويلات لأشخاص', s.personTransfers, s.temporary ? (s.temporary === s.personTransfers ? 'كلها بتصنيف مؤقت' : `${s.temporary} بتصنيف مؤقت`) : '')}${tile('غير مصنفة', s.unclassified)}${tile('مشتريات بدون تصنيف', s.uncategorized)}${tile('تجار جدد بدون تصنيف', s.unknownMerchants)}</div>`;
  const newAccs = Array.from(p.newAccounts.values()).filter(a => a.id !== p.account.id);
  const newIns = Array.from(p.newInstruments.values());
  if (newAccs.length || newIns.length) h += `<div class="card"><h2>بيضاف</h2>${newAccs.map(a => `<div class="small">• حساب «${esc(a.name)}» (لك، نوعه ${ACC_L[a.type]})</div>`).join('')}${newIns.map(i => `<div class="small">• أداة «${esc(i.label)}» (المالك: ${OWNER_L[i.instrumentOwner]})</div>`).join('')}</div>`;
  // التكرار المحتمل
  if (p.matches.review.length) {
    const txById = new Map(p.txs.map(t => [t.id, t]));
    const undecided = p.matches.review.filter(r => !S.decisions[r.newId]).length;
    h += `<div class="card"><h2>تكرار محتمل (${p.matches.review.length}) <span class="sp"></span></h2><p class="small muted">كل حالة: نفس العملية من مصدرين (دمج) أو عمليتان حقيقيتان (منفصلتان). ${undecided ? `<b class="warn-t">باقي ${undecided} بدون قرار.</b>` : ''}</p>
      <div class="btns" style="margin-bottom:10px"><button class="btn" data-action="decideAll" data-val="merge">دمج الكل</button><button class="btn" data-action="decideAll" data-val="separate">الكل منفصلة</button></div>`;
    p.matches.review.forEach(r => {
      const a = txById.get(r.newId), b = store().get('transactions', r.existingId);
      const d = S.decisions[r.newId];
      h += `<div class="pair"><div class="small muted">النقاط ${r.score}${r.reason === 'tie' ? ' · أكثر من مرشح بنفس الدرجة' : r.reason === 'manual' ? ' · إدخال يدوي' : ''}</div><div class="cmp2">
        <div><b>الجديدة</b><br>${esc(a.merchantRaw || a.beneficiaryRaw || '')}<br>${fdate(a.transactionDate)} ${a.time ? `<span class="num">${a.time}</span>` : ''}<br>${num(a.grossAmount)}</div>
        <div><b>الموجودة</b><br>${esc(b ? txTitle(b) : '')}<br>${b ? fdate(b.transactionDate) : ''} ${b && b.time ? `<span class="num">${b.time}</span>` : ''}<br>${b ? num(b.grossAmount) : ''} <span class="small muted">${b ? esc((b.sourceLinks || []).map(s => SRC_L[s.sourceType]).join('، ')) : ''}</span></div></div>
        <div class="seg"><button class="${d === 'merge' ? 'on' : ''}" data-action="decide" data-id="${r.newId}" data-val="merge">نفس العملية (دمج)</button><button class="${d === 'separate' ? 'on' : ''}" data-action="decide" data-id="${r.newId}" data-val="separate">عمليتان منفصلتان</button></div></div>`;
    });
    h += `</div>`;
  }
  if (p.deletedMatches && p.deletedMatches.size) {
    const byId = new Map(p.txs.map(t => [t.id, t]));
    h += `<div class="card"><h2>عمليات حذفتها قبل (${p.deletedMatches.size})</h2><p class="small muted">موجودة في هذا الملف، وانت حذفتها قبل. تبقى محذوفة إلا إذا اخترت «رجّعها».</p>`;
    p.deletedMatches.forEach((dm, newId) => { const a = byId.get(newId), d = store().get('deletedTxs', dm.deletedId), on = S.decisions[newId] === 'restore';
      h += `<div class="pair"><div><b>${esc(d ? txTitle(d) : (a.merchantRaw || a.beneficiaryRaw || ''))}</b> · ${fdate(a.transactionDate)} · ${num(a.grossAmount)}</div><div class="seg"><button class="${!on ? 'on' : ''}" data-action="decide" data-id="${newId}" data-val="">خلها محذوفة</button><button class="${on ? 'on' : ''}" data-action="decide" data-id="${newId}" data-val="restore">رجّعها</button></div></div>`; });
    h += `</div>`;
  }
  const blocked = p.matches.review.some(r => !S.decisions[r.newId]) || (p.kind === 'credit_card' && bc.ambiguous && !bc.userChosen);
  h += `<div class="card"><div class="btns"><button class="btn g" data-action="commitPlan" ${blocked ? 'disabled' : ''}>اعتماد الاستيراد</button><button class="btn" data-action="cancelPlan">إلغاء</button></div>${blocked ? '<div class="small warn-t" style="margin-top:6px">حدد القرارات المطلوبة فوق أول.</div>' : ''}${S.queue.length ? `<div class="small muted" style="margin-top:6px">بعده ${S.queue.length === 1 ? 'ملف واحد' : S.queue.length + ' ملفات'} بالانتظار.</div>` : ''}</div>`;
  return h;
}

/* ---------- تعليم كشف جديد ---------- */
function vTeach() {
  const T = S.teach; if (!T) return `<div class="card empty">لا يوجد.</div>`;
  const rows = T.rows, cols = Math.max.apply(null, rows.slice(0, 40).map(r => (r || []).length).concat([1]));
  const colOpts = (sel) => `<option value="-1">— لا يوجد —</option>` + Array.from({ length: cols }, (_, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>عمود ${i + 1}${T.rows[T.headerRow] && T.rows[T.headerRow][i] != null ? ' · ' + esc(String(T.rows[T.headerRow][i]).replace(/\s+/g, ' ').slice(0, 24)) : ''}</option>`).join('');
  let h = `<div class="card"><h2>ما تعرفت على هذا الكشف</h2><p class="small">حدد مرة وحدة وين كل معلومة، وبحفظها قالبًا للمرات الجاية.</p>
    <label class="f">نوع الكشف</label><div class="seg"><button class="${T.kind === 'account' ? 'on' : ''}" data-action="teachSet" data-k="kind" data-v="account">كشف حساب</button><button class="${T.kind === 'credit_card' ? 'on' : ''}" data-action="teachSet" data-k="kind" data-v="credit_card">كشف بطاقة ائتمانية</button></div>
    <label class="f">اسم البنك</label><input type="text" id="t_bank" value="${esc(T.bank || '')}" placeholder="مثال: مصرف الراجحي">
    <label class="f">الحساب</label><select id="t_acc">${`<option value="__new">+ حساب جديد</option>` + store().all('accounts').filter(a => a.type !== 'cash').map(a => `<option value="${a.id}" ${a.id === T.accountId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
    <div id="t_newacc"><label class="f">اسم الحساب الجديد وآخر 4 أرقام</label><div class="btns" style="flex-wrap:nowrap"><input type="text" id="t_accname" placeholder="حساب الراجحي" style="flex:2"><input type="text" id="t_last4" placeholder="1234" inputmode="numeric" maxlength="4" style="flex:1"></div></div>
    <label class="f">صف العناوين (رقم)</label><input type="number" id="t_head" value="${T.headerRow + 1}" min="1" data-change="teachHead">
    <label class="f">أول صف للعمليات</label><input type="number" id="t_first" value="${T.firstRow + 1}" min="1">
    <div class="grid2"><div><label class="f">عمود التاريخ</label><select id="t_date">${colOpts(T.cols.date)}</select></div><div><label class="f">عمود الوصف</label><select id="t_desc">${colOpts(T.cols.desc)}</select></div>
    <div><label class="f">عمود السحب (مدين)</label><select id="t_debit">${colOpts(T.cols.debit)}</select></div><div><label class="f">عمود الإيداع (دائن)</label><select id="t_credit">${colOpts(T.cols.credit)}</select></div>
    <div><label class="f">أو عمود مبلغ واحد (موجب/سالب)</label><select id="t_amount">${colOpts(T.cols.amount)}</select></div><div><label class="f">عمود الرصيد</label><select id="t_bal">${colOpts(T.cols.balance)}</select></div></div>
    <label class="f">صيغة التاريخ إذا كانت نصًا</label><select id="t_dh"><option value="dmy">يوم/شهر/سنة</option><option value="mdy">شهر/يوم/سنة</option></select>
    <div class="btns" style="margin-top:12px"><button class="btn g" data-action="teachSave">حفظ القالب والمتابعة</button><button class="btn" data-action="cancelTeach">إلغاء</button></div></div>`;
  h += `<div class="card"><h2>أول الصفوف في الملف</h2><div class="tbl-wrap teach"><table><tbody>${rows.slice(0, 30).map((r, i) => `<tr class="${i === T.headerRow ? 'hl' : ''}"><th>${i + 1}</th>${Array.from({ length: cols }, (_, c) => `<td>${esc(r && r[c] != null ? String(r[c]).slice(0, 40) : '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  return h;
}
function guessTeach(rows, forcedHeader) {
  let headerRow = 0, best = -1;
  if (forcedHeader != null) headerRow = forcedHeader;
  else rows.slice(0, 30).forEach((r, i) => { const n = (r || []).filter(x => x != null && String(x).trim() !== '' && E.parseNum(x) === null).length; if (n > best) { best = n; headerRow = i; } });
  const hdr = (rows[headerRow] || []).map(x => String(x || '').toLowerCase());
  const find = (re) => hdr.findIndex(x => re.test(x));
  return { headerRow, firstRow: headerRow + 1, kind: 'account', cols: { date: find(/date|تاريخ/), desc: find(/desc|تفاصيل|وصف|البيان|details|narrative/), debit: find(/debit|مدين|سحب|withdraw/), credit: find(/credit|دائن|إيداع|deposit/), amount: find(/^amount$|المبلغ/), balance: find(/balance|الرصيد/) } };
}

/* ---------- الحسابات ---------- */
function vAccounts() {
  const st = store();
  let h = `<div class="card"><h2>الحسابات</h2><div class="list">${E.accountBalances(st).map(a => `<div class="it" data-action="editAccount" data-id="${a.id}">${icCircle(a.type === 'credit_card' ? { color: PAL.blue, icon: 'card' } : a.type === 'cash' ? { color: PAL.green, icon: 'cash' } : a.type === 'wallet' ? { color: PAL.violet, icon: 'wallet' } : { color: '#3A49D6', icon: 'bank' }, 's')}<div class="m"><div class="t">${esc(a.name)}</div><div class="s">${esc(a.bank || '')} · ${ACC_L[a.type]}${a.last4 ? ' · …' + a.last4 : ''}${a.isMine ? '' : ' · ليس لك'}${a.type !== 'credit_card' && a.type !== 'cash' ? ' · ' + LIQ_L[E.liquidityClassOf(a) || 'none'] : ''}</div></div>${a.balance == null ? '<span class="muted small">الرصيد غير معروف</span>' : num(a.type === 'credit_card' ? Math.abs(a.balance) : a.balance)}</div>`).join('') || '<div class="muted">لا توجد حسابات بعد.</div>'}</div>
    <div class="btns" style="margin-top:10px"><button class="btn" data-action="newAccount">+ حساب</button></div></div>`;
  h += `<div class="card"><h2>أدوات الدفع</h2><p class="small muted">الأداة اللي مالكها غير محدد تنحسب في إنفاقك مؤقتًا مع علامة، وتقدر تستبعدها إذا طلعت لشخص ثاني.</p><div class="list">${st.all('instruments').map(i => { const a = accOf(i.accountId); return `<div class="it" data-action="editInstrument" data-id="${i.id}">${icCircle({ color: i.instrumentOwner === 'unknown' ? PAL.yellow : PAL.blue, icon: i.kind === 'cash' ? 'cash' : 'card' }, 's')}<div class="m"><div class="t">${esc(i.label)}</div><div class="s">${esc(a ? a.name : '')} · المالك: ${OWNER_L[i.instrumentOwner]}${i.includeInPersonalSpend === false ? ' · خارج مصروفك' : ''}</div></div>${i.instrumentOwner === 'unknown' ? '<span class="b w">غير محدد</span>' : ''}</div>`; }).join('') || '<div class="muted">لا يوجد.</div>'}</div></div>`;
  h += `<div class="card"><h2>المستفيدون <span class="sp"></span><button class="btn" data-action="go" data-view="beneficiaries">عرض الكل</button></h2><p class="small muted">${st.all('beneficiaries').length} مستفيد. التصنيف اللي تختاره لمستفيد ينحفظ لحوالاته الجاية.</p></div>`;
  return h;
}
function vBeneficiaries() {
  const st = store(), txs = st.all('transactions');
  const stats = new Map(); txs.forEach(t => { if (!t.beneficiaryId) return; const s = stats.get(t.beneficiaryId) || { n: 0, sum: 0 }; s.n++; s.sum += t.principalAmount; stats.set(t.beneficiaryId, s); });
  const list = st.all('beneficiaries').sort((a, b) => ((stats.get(b.id) || {}).sum || 0) - ((stats.get(a.id) || {}).sum || 0));
  return `<div class="card"><h2>المستفيدون</h2><p class="small muted">يتعرف النظام على المستفيد من بصمة حسابه، مو من اسمه (الأسماء تجي ناقصة). ما فيه مطابقة تقريبية لأسماء الأشخاص.</p><div class="list">${list.map(b => { const s = stats.get(b.id) || { n: 0, sum: 0 }; return `<div class="it" data-action="editBeneficiary" data-id="${b.id}"><div class="m"><div class="t">${esc(b.name)}</div><div class="s">${esc(b.bank || '')} · …${esc(b.accountLast4 || '')} · ${cnt(s.n, 'hw')} · ${b.isMyAccount ? 'حسابي' : b.categoryId ? esc(E.catName(st, b.categoryId)) : 'بدون تصنيف'}</div></div>${num(E.round2(s.sum))}</div>`; }).join('') || '<div class="muted">لا يوجد.</div>'}</div></div>`;
}

/* ---------- المزيد ---------- */
function vMore() {
  const item = (view, t, sub, icon, color) => `<div class="it" data-action="go" data-view="${view}">${icCircle({ color: color || PAL.blue, icon }, 's')}<div class="m"><div class="t">${t}</div><div class="s">${sub}</div></div>${ico('chevL', 'chev')}</div>`;
  return banners() + `<div class="card"><div class="list">
    ${item('reviewc', 'المراجعة' + (openReviews().length ? ` <span class="cnt">${openReviews().length}</span>` : ''), 'الرسائل والبيانات اللي تحتاج قرارك', 'question', PAL.orange)}
    ${item('messages', 'الرسائل البنكية', 'لصق وجلب الرسائل وسجلها', 'msg', PAL.blue)}
    ${item('insights', 'التحليل والتخطيط', 'التوقع، السيولة، الالتزامات، التوفير، المقارنات، السنوي، المدن، المنتجات، المجموعات', 'trend', PAL.violet)}
    ${item('alerts', 'التنبيهات' + (activeAlerts().length ? ` <span class="cnt">${activeAlerts().length}</span>` : ''), 'حدود، التزامات قريبة، اشتراكات محتملة، ارتفاع غير معتاد', 'bell', PAL.orange)}
    ${item('income', 'الدخل', 'دخلك والفائض وأرصدة حساباتك، مستقل عن الصرف', 'income', PAL.green)}
    ${item('report', 'التقرير', 'تقرير الفترة المختارة، للطباعة أو الحفظ PDF', 'doc', PAL.violet)}
    ${item('merchants', 'التجار', 'صنّف تاجرًا مرة ويتطبق على كل عملياته', 'store', PAL.magenta)}
    ${item('beneficiaries', 'المستفيدون', 'تحويلاتك للأشخاص وحساباتك', 'people', PAL.yellow)}
    ${item('imports', 'سجل الاستيراد', 'الكشوف المستوردة وحذفها', 'upload', PAL.aqua)}
  </div></div><div class="card"><div class="list">
    ${item('categories', 'التصنيفات', 'أضف وعدّل واحذف التصنيفات الرئيسية والفرعية', 'grid', PAL.orange)}
    ${item('rules', 'القواعد', 'صنّف تلقائيًا حسب التاجر أو المستفيد أو النص أو المبلغ', 'repeat', PAL.violet)}
    ${item('limits', 'حدود الصرف', 'حد لكل تصنيف أو للإنفاق الكلي', 'wallet', PAL.green)}
    ${item('audit', 'سجل التعديلات', 'كل تعديل مع التراجع والإعادة', 'list', PAL.gray)}
    ${item('settings', 'الإعدادات', 'الدورة، يوم الراتب، أسماؤك، وجهة التقريب', 'gear', PAL.gray)}
    ${item('backup', 'النسخ الاحتياطي', 'تصدير واستعادة', 'shield', PAL.green)}
    ${item('methods', 'طريقة الحساب', 'كيف ينحسب كل رقم', 'chart', PAL.blue)}
  </div></div><div class="muted small" style="text-align:center">الإصدار ${E.version} · البيانات على هذا الجهاز فقط</div>`;
}
function vMerchants() {
  const st = store();
  const stats = new Map(); st.all('transactions').forEach(t => { if (!t.merchantId) return; const s = stats.get(t.merchantId) || { n: 0, sum: 0 }; s.n++; s.sum += E.spendEffect(t) + E.feeOf(t); stats.set(t.merchantId, s); });
  const onlyNone = S.merchantsOnlyNone;
  let list = st.all('merchants').filter(m => stats.has(m.id));
  const noneCount = list.filter(m => !m.categoryId && !m.suggestedCategoryId).length;
  if (onlyNone) list = list.filter(m => !m.categoryId && !m.suggestedCategoryId);
  list.sort((a, b) => (stats.get(b.id).sum) - (stats.get(a.id).sum));
  return `<div class="card"><h2>التجار</h2><p class="small muted">تصنيف التاجر من هنا يتطبق على كل عملياته السابقة والقادمة (ما عدا اللي صنفتها يدويًا لعملية وحدة).</p>
    <div class="chips"><button class="chip ${!onlyNone ? 'on' : ''}" data-action="merchantsFilter" data-v="0">الكل (${st.all('merchants').filter(m => stats.has(m.id)).length})</button><button class="chip ${onlyNone ? 'on' : ''}" data-action="merchantsFilter" data-v="1">بدون تصنيف (${noneCount})</button></div>
    <div class="list">${list.map(m => { const s = stats.get(m.id); const cat = m.categoryId || m.suggestedCategoryId; return `<div class="it" data-action="editMerchant" data-id="${m.id}"><div class="m"><div class="t">${esc(m.name)}</div><div class="s">${cnt(s.n, 'op')} · ${cat ? esc(E.catName(st, cat)) + (m.categoryId ? '' : ' (تلقائي)') : '<span class="warn-t">بدون تصنيف</span>'}</div></div>${num(E.round2(s.sum))}</div>`; }).join('')}</div></div>`;
}
function vSettings() {
  const s = settings();
  const dest = s.roundUpDestination || { kind: 'unknown' };
  const destLabel = dest.kind === 'account' ? 'حساب: ' + ((accOf(dest.accountId) || {}).name || '') : dest.kind === 'charity' ? 'جهة خيرية (تبرعات)' : 'غير محددة';
  return `<div class="card"><h2>الدورة المالية</h2>
    <div class="seg"><button class="${s.cycleMode === 'salary' ? 'on' : ''}" data-action="setCycleMode" data-v="salary">دورة الراتب</button><button class="${s.cycleMode === 'calendar' ? 'on' : ''}" data-action="setCycleMode" data-v="calendar">الشهر الميلادي</button></div>
    <label class="f">يوم الراتب الافتراضي (يُستخدم إذا ما وُجد الراتب)</label><input type="number" id="payday" min="1" max="31" value="${s.defaultPayday}">
    <p class="small muted">الدورة تبدأ من تاريخ عملية الراتب نفسها، وكل عمليات ذاك اليوم تدخل في الدورة الجديدة. المكافأة والاسترداد والتحويل الداخلي ما تبدأ دورة.</p></div>
    <div class="card"><h2>أسماؤك كما تظهر في الكشوف</h2><p class="small muted">أي تحويل من أو إلى هذي الأسماء يُعتبر تحويلًا داخليًا. اسم في كل سطر.</p><textarea id="aliases" rows="4">${esc((s.ownerAliases || []).join('\n'))}</textarea></div>
    <div class="card"><h2>التصنيفات</h2><p class="small muted">أضف تصنيف رئيسي أو فرعي، وغيّر الاسم والإيموجي واللون والخصائص.</p><button class="btn" data-action="go" data-view="categories">إدارة التصنيفات</button></div>
    ${settingsCityCard()}
    <div class="card"><h2>وجهة التقريب</h2><p class="small">الحالية: <b>${esc(destLabel)}</b></p><button class="btn" data-action="setRoundUp">تغيير</button></div>
    <div class="card"><h2>تذكير النسخة الاحتياطية</h2><label class="f">ذكّرني إذا مرّ (يوم)</label><input type="number" id="bkdays" min="1" max="60" value="${s.backupReminderDays || 7}"></div>
    <div class="card"><button class="btn p w100" data-action="saveSettings">حفظ الإعدادات</button></div>
    ${inboxCard()}
    ${dateShapesCard()}`;
}
/* ---------- التصنيفات (البند 4 في 1.4.0) ---------- */
const EMOJI_SET = ['🛒', '🍔', '☕', '⛽', '🚗', '🏠', '💡', '📱', '🎁', '🧾', '✈️', '🏨', '🎮', '👕', '💊', '📚', '💳', '🕌', '🎉', '🧸', '🐑', '🧴', '🛠️', '💰'];
const CAT_COLORS = ['blue', 'green', 'orange', 'red', 'violet', 'magenta', 'aqua', 'yellow', 'gray'];
const CAT_ERR = { name: 'اكتب اسم التصنيف', dup: 'فيه تصنيف بنفس الاسم في نفس المكان', parent: 'التصنيف الرئيسي غير صحيح', level: 'ما يتغير التصنيف من رئيسي إلى فرعي أو العكس بعد إنشائه', protected: 'هذا التصنيف يستخدمه الحساب، فما ينحذف ولا ينقل', target: 'اختر تصنيف ثاني غير اللي تحذفه' };
const byOrder = (a, b) => (a.order || 0) - (b.order || 0);
function oneEmoji(v) {
  v = String(v || '').trim(); if (!v) return null;
  try { if (window.Intl && Intl.Segmenter) { const it = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(v)[Symbol.iterator]().next(); return it.value ? it.value.segment.slice(0, 16) : null; } } catch (e) { /* احتياط */ }
  return Array.from(v).slice(0, 2).join('');
}
function vCategories() {
  const st = store(), cats = st.all('categories').filter(c => c.active !== false), counts = new Map();
  st.all('transactions').forEach(t => { [t.categoryId, t.subcategoryId].forEach(k => { if (k) counts.set(k, (counts.get(k) || 0) + 1); }); });
  const mains = cats.filter(c => !c.parentId).sort(byOrder);
  const row = (c, sub) => `<div class="it ${sub ? 'sub' : ''}" data-action="catEdit" data-id="${c.id}">${icCircle(catUi(c.id), 's')}<div class="m"><div class="t">${esc(c.name)}${E.PROTECTED_CATS.has(c.id) ? ' <span class="b n">أساسي</span>' : ''}</div><div class="s">${cnt(counts.get(c.id) || 0, 'op')}</div></div>${ico('chevL', 'chev')}</div>`;
  return `<div class="card"><h2>التصنيفات<span class="sp"></span><button class="btn p" data-action="catNew">+ تصنيف</button></h2>
    <p class="small muted">التصنيف مربوط بعملياته برقم ثابت، فتغيير اسمه أو إيموجيه أو لونه ما يأثر على شي. حذف التصنيف ما يحذف أي عملية.</p>
    <div class="list">${mains.map(c => row(c, false) + cats.filter(x => x.parentId === c.id).sort(byOrder).map(x => row(x, true)).join('')).join('')}</div>
    <p class="small muted" style="margin-top:8px">لإضافة تصنيف فرعي: افتح التصنيف الرئيسي واضغط «+ تصنيف فرعي».</p></div>`;
}
// نموذج التصنيف: full = كل الحقول (من صفحة التصنيفات)، وإلا الاسم والإيموجي واللون (من نافذة الاختيار)
function catFormHtml(c, parentId, full, keep) {
  const st = store(), k = keep || {}, prot = c && E.PROTECTED_CATS.has(c.id);
  const mains = st.all('categories').filter(x => !x.parentId && x.active !== false && (!c || x.id !== c.id)).sort(byOrder);
  const val = (key, dflt) => k[key] !== undefined ? k[key] : dflt;
  const pid = val('parentId', c ? (c.parentId || '') : (parentId || ''));
  const isMain = !pid;
  let h = `<label class="f">الاسم</label><input type="text" id="ce_name" maxlength="40" value="${esc(val('name', c ? c.name : ''))}">`;
  if (c && !c.parentId) h += `<input type="hidden" id="ce_parent" value=""><p class="small muted" style="margin:6px 0 0">تصنيف رئيسي</p>`;
  else if (prot) h += `<input type="hidden" id="ce_parent" value="${esc(pid)}">`;
  else h += `<label class="f">المكان</label><select id="ce_parent" data-change="ceParent">${c ? '' : `<option value="">تصنيف رئيسي</option>`}${mains.map(m => `<option value="${m.id}" ${m.id === pid ? 'selected' : ''}>فرعي تحت «${esc(m.name)}»</option>`).join('')}</select>`;
  const emo = val('emoji', c ? (c.emoji || '') : ''), col = val('color', c ? (c.color || '') : '');
  h += `<label class="f">الإيموجي</label><div style="display:flex;gap:8px;align-items:center"><input type="text" id="ce_emoji" value="${esc(emo)}" placeholder="🙂" style="width:84px;text-align:center;font-size:22px"><button type="button" class="btn" data-action="ceEmoji" data-e="">بدون</button></div>
    <div class="emogrid">${EMOJI_SET.map(e => `<button type="button" data-action="ceEmoji" data-e="${e}">${e}</button>`).join('')}</div>
    <label class="f">اللون</label><input type="hidden" id="ce_color" value="${esc(col)}"><div class="colors"><button type="button" data-action="ceColor" data-c="" class="auto ${!col ? 'on' : ''}">تلقائي</button>${CAT_COLORS.map(x => `<button type="button" data-action="ceColor" data-c="${x}" class="${col === x ? 'on' : ''}" style="background:${PAL[x]}" aria-label="${x}"></button>`).join('')}</div>`;
  if (full) {
    const opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`;
    const inh = isMain ? '' : opt('', 'يتبع الرئيسي', '');
    const cur = (key, dflt) => { const v = val(key, c ? c[key] : dflt); return v === null || v === undefined ? '' : String(v); };
    h += `<div class="grid2"><div><label class="f">التكرار الافتراضي</label><select id="ce_rec">${inh}${opt('recurring', 'متكرر', cur('defaultRecurrenceType', isMain ? 'variable' : null))}${opt('variable', 'متغير', cur('defaultRecurrenceType', isMain ? 'variable' : null))}</select></div>
      <div><label class="f">الضرورة الافتراضية</label><select id="ce_nec">${isMain ? opt('', 'غير محددة', cur('defaultNecessityType', null)) : inh}${opt('essential', 'ضروري', cur('defaultNecessityType', null))}${opt('discretionary', 'اختياري', cur('defaultNecessityType', null))}</select></div>
      <div><label class="f">التزام</label><select id="ce_commit">${inh}${opt('false', 'لا', cur('isCommitment', isMain ? false : null))}${opt('true', 'نعم', cur('isCommitment', isMain ? false : null))}</select></div>
      <div><label class="f">يدخل فرص التوفير</label><select id="ce_save">${inh}${opt('false', 'لا', cur('savingsEligible', isMain ? false : null))}${opt('true', 'نعم', cur('savingsEligible', isMain ? false : null))}</select></div></div>
      <p class="small muted">«التزام» يدخل رقم «الالتزامات المعروفة» إذا كانت العملية متكررة.</p>`;
  }
  return h;
}
function autoCatColor() {
  const used = new Map(CAT_COLORS.filter(x => x !== 'gray').map(x => [x, 0]));
  store().all('categories').filter(c => !c.parentId && c.active !== false).forEach(c => { const h = catUi(c.id).hue; if (used.has(h)) used.set(h, used.get(h) + 1); });
  return Array.from(used.entries()).sort((a, b) => a[1] - b[1])[0][0];
}
function readCatForm(full) {
  const v = (id) => $(id) ? $(id).value : undefined;
  const d = { name: v('ce_name'), parentId: v('ce_parent') || null, emoji: oneEmoji(v('ce_emoji')), color: v('ce_color') || null };
  if (full) {
    const main = !d.parentId, b = (x) => x === '' ? (main ? false : null) : x === 'true';
    d.defaultRecurrenceType = v('ce_rec') || (main ? 'variable' : null);
    d.defaultNecessityType = v('ce_nec') || null;
    d.isCommitment = b(v('ce_commit')); d.savingsEligible = b(v('ce_save'));
  }
  return d;
}
function sheetCategory(id, parentId, keep) {
  const c = id ? store().get('categories', id) : null;
  openSheet(`<h3>${c ? 'تعديل التصنيف' : 'تصنيف جديد'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <div class="catform" data-id="${c ? c.id : ''}" data-parent="${esc(parentId || '')}">${catFormHtml(c, parentId, true, keep)}</div>
    <div class="btns" style="margin-top:14px"><button class="btn p" data-action="catSave" data-id="${c ? c.id : ''}">حفظ</button>${c && !c.parentId ? `<button class="btn" data-action="catNew" data-parent="${c.id}">+ تصنيف فرعي</button>` : ''}${c && !E.PROTECTED_CATS.has(c.id) ? `<button class="btn r" data-action="catDel" data-id="${c.id}">حذف</button>` : ''}</div>
    ${c && E.PROTECTED_CATS.has(c.id) ? '<p class="small muted">تصنيف أساسي يستخدمه الحساب: تقدر تغيّر اسمه وشكله، لكن ما ينحذف.</p>' : ''}`);
}

// أشكال التاريخ المحفوظة (البند 1 في 1.4.0)
function dateShapesCard() {
  const sh = settings().smsDateShapes || {}, OL = SR().ORDER_L, keys = Object.keys(sh).sort((a, b) => String(sh[b].updatedAt || '').localeCompare(String(sh[a].updatedAt || '')));
  return `<div class="card"><h2>أشكال التاريخ في الرسائل</h2><p class="small muted">كل شكل تاريخ جديد في رسائل البنك يسألك عنه التطبيق مرة، ويعتمد جوابك لكل رسالة بنفس الشكل.</p>
    ${keys.length ? `<div class="list">${keys.map(k => `<div class="it" data-action="shapeEdit" data-sig="${esc(k)}"><div class="m"><div class="t">${shapeSampleHtml(sh[k].sample || k, (SR().findDateToken(sh[k].sample || '') || {}).raw)}</div><div class="s">${OL[sh[k].order] || sh[k].order}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div>` : '<div class="muted small">ما فيه أشكال محفوظة للحين.</div>'}</div>`;
}
// المساحة: حجم بياناتك (تقريبًا حجم ملف النسخة) + المستخدم والمتاح إذا المتصفح يعطيها
const backupAge = () => { const b = settings().lastBackupAt; return b ? Math.max(0, E.daysBetween(ldate(b), E.todayISO())) : null; };
function agoText(n) { return n === 0 ? 'اليوم' : n === 1 ? 'أمس' : n === 2 ? 'قبل يومين' : n <= 10 ? `قبل ${n} أيام` : `قبل ${n} يومًا`; }
function fmtBytes(b) { if (b == null) return '—'; const u = ['بايت', 'ك.ب', 'م.ب', 'ج.ب']; let i = 0; while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; } return `${i ? b.toFixed(b < 10 ? 1 : 0) : Math.round(b)} ${u[i]}`; }
async function fillSpace() {
  const el = $('bk_space'); if (!el) return;
  let used = null, quota = null;
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); used = typeof e.usage === 'number' ? e.usage : null; quota = typeof e.quota === 'number' ? e.quota : null; } } catch (e) { /* المتصفح ما يدعمها */ }
  const data = new Blob([JSON.stringify(store().exportAll())]).size;
  if (!$('bk_space')) return;
  el.innerHTML = `حجم بياناتك: <b>${fmtBytes(data)}</b>${used != null ? ` · المستخدم على الجهاز: ${fmtBytes(used)}` : ''} · المتاح: ${quota != null && used != null ? fmtBytes(Math.max(0, quota - used)) : 'المتصفح ما يعطي هذا الرقم'}`;
}
function vBackup() {
  const s = settings();
  setTimeout(fillSpace, 0);
  return `<div class="card"><h2>تصدير نسخة احتياطية</h2><p class="small">ملف JSON فيه كل بياناتك: الحسابات والعمليات والتجار والمستفيدون والتصنيفات والقواعد والإعدادات. الآيبانات وأرقام الهوية ما تكون فيه لأنها ما تنحفظ أصلًا.</p>
    <p class="small ${backupAge() === null || backupAge() > (s.backupReminderDays || 7) ? 'warn-t' : 'muted'}">آخر نسخة: ${s.lastBackupAt ? fday(ldate(s.lastBackupAt)) + ' (' + agoText(backupAge()) + ')' : 'ما سويت نسخة للحين'}</p>
    <p class="small muted" id="bk_space">جاري حساب المساحة…</p><button class="btn p" data-action="backup">تصدير الآن</button>
    <p class="small muted">على الآيفون: تفتح قائمة المشاركة ← «حفظ في الملفات».</p></div>
    <div class="card"><h2>استعادة نسخة</h2><p class="small"><b class="warn-t">الاستعادة تستبدل كل بيانات هذا الجهاز</b> بمحتوى النسخة. ما فيه دمج.</p><button class="btn r" data-action="pickRestore">اختيار ملف نسخة…</button></div>`;
}

/* ---------- التقرير ---------- */
function vReport() {
  const st = store(); const p = S.period;
  const R = E.computePeriod(st, p), prevP = E.previousPeriod(st, p), P = E.computePeriod(st, prevP);
  const tx = (id) => st.get('transactions', id);
  const rowsTx = (ids, amt) => ids.map(id => { const t = tx(id); return `<tr><td>${fdate(t.transactionDate)}</td><td>${esc(txTitle(t))}</td><td>${esc(catLabel(t))}</td><td class="n">${num(amt ? amt(t) : t.principalAmount)}</td></tr>`; }).join('');
  const inP = (t) => { const d = t.transactionDate || t.postingDate; return d >= p.start && d <= p.end; };
  const all = st.all('transactions').filter(inP).sort(sortTx).reverse();
  let h = `<div class="noprint btns" style="margin-bottom:10px"><button class="btn p" data-action="print">طباعة / حفظ PDF</button><button class="btn" data-action="pickPeriod">تغيير الفترة</button></div><div class="report">`;
  h += `<h1>التقرير المالي</h1><div class="muted">${{ cycle: 'دورة الراتب', month: 'الشهر الميلادي', week: 'الأسبوع', year: 'السنة' }[p.kind] || 'فترة مخصصة'}: ${fperiod(p)} · أُعد في ${fday(E.todayISO())}</div>`;
  if (R.coverage.periodOpen) h += `<p class="small"><b>ملاحظة:</b> الفترة ما انتهت؛ الأرقام حتى تاريخ إعداد التقرير.</p>`;
  R.coverage.notes.forEach(n => { h += `<p class="small"><b>بيانات ناقصة:</b> «${esc(n.name)}» لا يغطي الفترة من ${fdate(n.from)} إلى ${fdate(n.to)}.</p>`; });
  h += `<h2>الملخص</h2><div class="rk"><div><div class="l">الدخل المؤكد</div><div class="v">${num(R.income)}</div></div><div><div class="l">الإنفاق الحقيقي</div><div class="v">${num(R.spend)}</div></div><div><div class="l">الفائض</div><div class="v">${num(R.surplus)}</div></div>
    <div><div class="l">منه ما عُرف نوعه</div><div class="v">${num(R.unclassifiedOut)}</div></div><div><div class="l">داخل غير مصنف</div><div class="v">${num(R.unclassifiedIn)}</div></div><div><div class="l">الالتزامات المعروفة</div><div class="v">${num(R.commitments)}</div></div>
    <div><div class="l">التحويلات الداخلية</div><div class="v">${num(R.internal)}</div></div><div><div class="l">سداد البطاقات</div><div class="v">${num(R.cardPayments)}</div></div><div><div class="l">الرسوم</div><div class="v">${num(R.fees)}</div></div></div>`;
  if (R.temporaryCount || R.unownedCount) h += `<p class="small">منه ${fmt(R.temporarySpend)} تحويلات لأشخاص بتصنيف مؤقت${R.unownedCount ? `، و${fmt(R.unownedSpend)} بأدوات مالكها غير محدد` : ''}.</p>`;
  h += `<h2>الدخل</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>النوع</th><th class="n">المبلغ</th></tr></thead><tbody>${rowsTx(R.incomeItems) || '<tr><td colspan="4">لا يوجد</td></tr>'}</tbody></table>`;
  h += `<h2>الإنفاق حسب التصنيف</h2><table><thead><tr><th>التصنيف</th><th class="n">المبلغ</th><th class="n">النسبة</th></tr></thead><tbody>${R.categories.filter(c => c.amount).map(c => `<tr><td><b>${esc(bucketName(c.categoryId))}</b></td><td class="n"><b>${num(c.amount)}</b></td><td class="n"><span class="num">${R.spend ? Math.round(c.amount / R.spend * 100) : 0}%</span></td></tr>${c.subs.length > 1 || (c.subs[0] && c.subs[0].subcategoryId) ? c.subs.map(s => `<tr><td class="small" style="padding-inline-start:18px">${esc(s.subcategoryId ? (st.get('categories', s.subcategoryId) || {}).name : 'بدون فرعي')}</td><td class="n small">${num(s.amount)}</td><td></td></tr>`).join('') : ''}`).join('')}</tbody></table>`;
  h += `<h2>الالتزامات المعروفة</h2><table><thead><tr><th>التاريخ</th><th>الجهة</th><th>التصنيف</th><th class="n">المبلغ</th></tr></thead><tbody>${rowsTx(R.commitmentItems) || '<tr><td colspan="4">لا يوجد</td></tr>'}</tbody></table>`;
  const itx = all.filter(t => t.transactionType === 'InternalTransfer' && !isRoundUpUnknown(t) && !(t.transferLinkStatus === 'linked' && t.direction === 'in'));
  h += `<h2>التحويلات الداخلية</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الحالة</th><th class="n">المبلغ</th></tr></thead><tbody>${itx.map(t => `<tr><td>${fdate(t.transactionDate)}</td><td>${esc(txTitle(t))} (${t.direction === 'out' ? 'خارج' : 'داخل'})</td><td>${t.transferLinkStatus === 'linked' ? 'مربوط بطرفيه' : 'غير مكتمل الربط'}</td><td class="n">${num(t.principalAmount)}</td></tr>`).join('') || '<tr><td colspan="4">لا يوجد</td></tr>'}</tbody></table>`;
  const ctx = all.filter(t => t.transactionType === 'CreditCardPayment' && !(t.transferLinkStatus === 'linked' && t.direction === 'in'));
  h += `<h2>سداد البطاقات</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الحالة</th><th class="n">المبلغ</th></tr></thead><tbody>${ctx.map(t => `<tr><td>${fdate(t.transactionDate)}</td><td>${esc(txTitle(t))}</td><td>${t.cardPaymentStatus === 'matched' ? 'مطابق' : t.targetCardLast4 ? 'غير مطابق' : 'البطاقة غير معروفة'}</td><td class="n">${num(t.principalAmount)}</td></tr>`).join('') || '<tr><td colspan="4">لا يوجد</td></tr>'}</tbody></table>`;
  const unc = all.filter(t => t.transactionType === 'Unknown' || isRoundUpUnknown(t));
  const ruN = unc.filter(isRoundUpUnknown);
  h += `<h2>غير المصنف</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الاتجاه</th><th class="n">المبلغ</th></tr></thead><tbody>${ruN.length ? `<tr><td>—</td><td>تقريب (${cnt(ruN.length, 'op')}، الوجهة غير معروفة)</td><td>خارج</td><td class="n">${num(E.round2(ruN.reduce((s, t) => s + t.grossAmount, 0)))}</td></tr>` : ''}${unc.filter(t => !isRoundUpUnknown(t)).map(t => `<tr><td>${fdate(t.transactionDate)}</td><td>${esc(txTitle(t))}</td><td>${t.direction === 'out' ? 'خارج' : 'داخل'}</td><td class="n">${num(t.grossAmount)}</td></tr>`).join('')}${!unc.length ? '<tr><td colspan="4">لا يوجد</td></tr>' : ''}</tbody></table>`;
  h += `<h2>أكثر التجار</h2><table><thead><tr><th>التاجر</th><th class="n">عدد العمليات</th><th class="n">المبلغ</th></tr></thead><tbody>${R.topMerchants.slice(0, 15).map(m => `<tr><td>${esc((st.get('merchants', m.merchantId) || {}).name || '')}</td><td class="n"><span class="num">${m.count}</span></td><td class="n">${num(m.amount)}</td></tr>`).join('') || '<tr><td colspan="3">لا يوجد</td></tr>'}</tbody></table>`;
  h += `<h2>أعلى العمليات</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>التصنيف</th><th class="n">المبلغ</th></tr></thead><tbody>${rowsTx(R.topTx.slice(0, 10).map(x => x.id), t => E.spendEffect(t) + E.feeOf(t))}</tbody></table>`;
  h += `<h2>الحسابات</h2><table><thead><tr><th>الحساب</th><th>النوع</th><th>آخر رصيد معروف</th><th class="n">الرصيد</th></tr></thead><tbody>${E.accountBalances(st).map(a => `<tr><td>${esc(a.name)}</td><td>${ACC_L[a.type]}</td><td>${a.balanceDate ? fdate(a.balanceDate, true) : '—'}</td><td class="n">${a.balance == null ? '—' : num(a.type === 'credit_card' ? Math.abs(a.balance) : a.balance) + (a.type === 'credit_card' && a.balance ? (a.balance > 0 ? ' مستحق' : ' لصالحك') : '')}</td></tr>`).join('')}</tbody></table>`;
  h += `<h2>مقارنة بالفترة السابقة (${fperiod(prevP)})</h2>`;
  if (!P.txCount) h += `<p class="small">لا توجد بيانات للفترة السابقة.</p>`;
  else {
    if (!P.coverage.complete) h += `<p class="small"><b>تنبيه:</b> بيانات الفترة السابقة ناقصة، فالفروق ما تعني تغيّرًا حقيقيًا.</p>`;
    const keys = new Map(); R.categories.forEach(c => keys.set(c.categoryId || '__none', { cur: c.amount, prev: 0 })); P.categories.forEach(c => { const k = c.categoryId || '__none'; const o = keys.get(k) || { cur: 0, prev: 0 }; o.prev = c.amount; keys.set(k, o); });
    h += `<table><thead><tr><th>البند</th><th class="n">السابقة</th><th class="n">الحالية</th><th class="n">الفرق</th><th class="n">النسبة</th></tr></thead><tbody><tr><td><b>الدخل المؤكد</b></td><td class="n">${num(P.income)}</td><td class="n">${num(R.income)}</td><td class="n">${num(E.round2(R.income - P.income))}</td><td class="n">${P.income ? `<span class="num">${Math.round((R.income - P.income) / P.income * 100)}%</span>` : '—'}</td></tr><tr><td><b>الإنفاق الحقيقي</b></td><td class="n">${num(P.spend)}</td><td class="n">${num(R.spend)}</td><td class="n">${num(E.round2(R.spend - P.spend))}</td><td class="n">${P.spend ? `<span class="num">${Math.round((R.spend - P.spend) / P.spend * 100)}%</span>` : '—'}</td></tr>${Array.from(keys.entries()).map(([k, o]) => `<tr><td>${esc(bucketName(k === '__none' ? null : k))}</td><td class="n">${num(o.prev)}</td><td class="n">${num(o.cur)}</td><td class="n">${num(E.round2(o.cur - o.prev))}</td><td class="n">${o.prev ? `<span class="num">${Math.round((o.cur - o.prev) / o.prev * 100)}%</span>` : '—'}</td></tr>`).join('')}</tbody></table>`;
  }
  const b = R.bridge;
  h += `<h2>معادلة التدقيق</h2><p class="small">تشرح الفرق بين اللي خرج من حساباتك البنكية والإنفاق الحقيقي. للتفسير فقط؛ الإنفاق يُحسب من العمليات المصنفة نفسها.</p><table><tbody>
    <tr><td>الخارج من الحسابات البنكية (بالإجمالي)</td><td class="n">${num(b.bankOut)}</td></tr><tr><td>− أصل التحويلات الداخلية</td><td class="n">${num(b.internalOut)}</td></tr><tr><td>− أصل سداد البطاقات</td><td class="n">${num(b.cardPayOut)}</td></tr>
    ${b.loansOut ? `<tr><td>− أصل السلف لأشخاص</td><td class="n">${num(b.loansOut)}</td></tr>` : ''}<tr><td>− عمليات ما تنحسب في الصرف (أدوات مستثناة أو اخترت استبعادها)</td><td class="n">${num(b.excludedOut)}</td></tr>
    <tr><td><b>= إنفاق دُفع من الحسابات مباشرة</b> (يشمل السحب النقدي والعمليات اللي ما عُرف نوعها)</td><td class="n"><b>${num(b.direct)}</b></td></tr><tr><td>+ صرف البطاقات الائتمانية</td><td class="n">${num(b.cardPurchases)}</td></tr><tr><td>+ المصروف النقدي المباشر</td><td class="n">${num(b.cashExpense)}</td></tr><tr><td>− الاستردادات (المربوط بشرائه على تاريخ الشراء)</td><td class="n">${num(b.refunds)}</td></tr>
    <tr><td><b>= الإنفاق الحقيقي</b></td><td class="n"><b>${num(b.total)}</b></td></tr>${Math.abs(b.diff) >= 0.01 ? `<tr><td><b class="warn-t">فرق غير مفسر</b></td><td class="n">${num(b.diff)}</td></tr>` : ''}</tbody></table>`;
  h += `<p class="small muted" style="margin-top:16px">طريقة حساب كل رقم موجودة في صفحة «طريقة الحساب» داخل التطبيق.</p></div>`;
  return h;
}

/* ---------- طريقة الحساب ---------- */
function vMethods() {
  return `<div class="card prose"><h2>طريقة الحساب</h2>
  <p>هذه الصفحة تتحدث مع كل تغيير في طريقة الحساب.</p>
  <h3>أثر كل نوع عملية</h3>
  <p><b>القاعدة (من 1.4.1):</b> أي فلوس طالعة صرف، ما عدا التحويل بين حساباتك وسداد البطاقة والسلفة لشخص، لأن هذي الفلوس باقية معك أو انحسبت قبل.</p>
  <table><thead><tr><th>النوع</th><th>الإنفاق</th><th>الدخل (صفحة «الدخل»)</th></tr></thead><tbody>
  <tr><td>دفع (شراء، فاتورة، قسط، تبرع، رسوم)</td><td>+ الأصل</td><td>0</td></tr>
  <tr><td>سحب نقدي</td><td>+ الأصل، تحت «سحب نقدي» أو الأجزاء اللي قسّمته عليها</td><td>0</td></tr>
  <tr><td>تحويل لشخص</td><td>+ (تصنيف مؤقت لين تصنفه)</td><td>0</td></tr>
  <tr><td>عملية خارجة ما عُرف نوعها</td><td>+ الإجمالي، تحت «بدون تصنيف»</td><td>0</td></tr>
  <tr><td>تقريب وجهته غير محددة</td><td>+ تحت «تقريب (وجهته غير محددة)» لين تحدد وجهته</td><td>0</td></tr>
  <tr><td>تحويل بين حساباتك، سداد بطاقة، إيداع نقدي، سلفة وسدادها</td><td>0</td><td>0</td></tr>
  <tr><td>استرداد</td><td>− من دورة الشراء وتصنيفه إذا ربطته بشرائه، وإلا من دورته هو ونفس تصنيف التاجر</td><td>0</td></tr>
  <tr><td>مصروف نقدي يدوي</td><td>+ إذا «صرف مباشر» (نقد من مصدر ثاني). 0 إذا من سحب: يصير جزء من السحب</td><td>0</td></tr>
  <tr><td>دخل</td><td>0</td><td>+ (المؤكد فقط)</td></tr><tr><td>داخل ما عُرف نوعه</td><td>0</td><td>يظهر «داخل غير مصنف»</td></tr></tbody></table>
  <p><b>الرسوم</b>: كل عملية فيها أصل ورسوم وضريبة وإجمالي. الرسوم والضريبة تنحسب إنفاقًا تحت «رسوم» دائمًا، حتى لو الأصل ما ينحسب (مثل حوالة لحسابك: الـ200 ما تنحسب والـ0.29 تنحسب).</p>
  <h3>الأرقام الرئيسية</h3><ul>
  <li><b>الرئيسية</b> تعرض صرفك في الدورة الحالية والالتزامات بس. الدخل والفائض وأرصدة الحسابات في صفحة «الدخل» (داخل «المزيد»)، مستقلة عن الصرف.</li>
  <li><b>الإنفاق الحقيقي</b> = أثر الإنفاق لكل العمليات (الجدول فوق) + الرسوم − الاستردادات. يشمل التحويلات لأشخاص بتصنيف مؤقت، والبطاقات اللي مالكها غير محدد (معلّمة). لا يشمل: العمليات اللي اخترت لها «لا تحسبها في الصرف»، والأدوات اللي استبعدتها من مصروفك، والعمليات المحذوفة.</li>
  <li>الصرف اللي ما له تصنيف يدخل الإنفاق تحت «بدون تصنيف».</li>
  <li><b>الدخل المؤكد</b> = مجموع عمليات الدخل المصنفة. <b>الفائض</b> = الدخل المؤكد − الإنفاق الحقيقي. الاثنين في صفحة «الدخل».</li>
  <li><b>منه ما عُرف نوعه</b> = العمليات الخارجة اللي نوعها غير معروف، والتقريب اللي وجهته غير محددة. داخلة في الإنفاق، ومعروضة لحالها عشان تصنفها.</li>
  <li><b>التحويلات الداخلية وسداد البطاقات</b>: كل تحويل ينحسب مرة وحدة. إذا توفر طرفاه (خارج من حساب وداخل لحساب ثاني) ينربطان ويُحسب الخارج فقط. الطرف الوحيد يُحسب ويُعلَّم «غير مكتمل الربط».</li>
  <li><b>تحويلك لنفسك</b> يُعرف من أسمائك المحفوظة في الإعدادات: التحويل الصادر لمستفيد باسمك يصير تحويلًا داخليًا ويُضاف حسابه لحساباتك، والوارد من اسمك يصير تحويلًا داخليًا. إذا أضفت اسمًا لاحقًا، يُطبَّق على العمليات السابقة أيضًا.</li>
  <li><b>الالتزامات المعروفة</b> = عمليات دفع تكرارها الفعلي «متكرر» وتصنيفها أو تصنيفها الفرعي معلّم «التزام».</li>
  <li>التكرار والضرورة يؤخذان من الأدق: العملية ← التاجر ← التصنيف الفرعي ← التصنيف الرئيسي.</li></ul>
  <h3>الدورة المالية</h3><p>تبدأ من تاريخ عملية الراتب («إيداع راتب»)، وكل عمليات ذاك اليوم للدورة الجديدة، وتنتهي باليوم اللي قبل الراتب الجاي. أي شهر ما فيه راتب يُستخدم فيه يوم الراتب الافتراضي. التوزيع على الدورات بتاريخ العملية الفعلي (المكتوب في الوصف)، وتاريخ قيد البنك احتياطي.</p>
  <h3>صفحة «صرفياتك»</h3><ul>
  <li><b>أسبوعي</b>: من الأحد إلى السبت. <b>الدورة</b>: دورة الراتب، أو الشهر الميلادي إذا اخترته في الإعدادات. <b>سنوي</b>: من 1 يناير إلى 31 ديسمبر، والأعمدة لكل شهر.</li>
  <li>كل عمود = الإنفاق الحقيقي لذاك اليوم (أو الشهر) بنفس طريقة حساب الإنفاق الحقيقي فوق، فمجموع الأعمدة يساوي إنفاق الفترة.</li>
  <li>الألوان لأكبر خمسة تصنيفات في الفترة، ولكل تصنيف لونه الثابت. إذا تصنيفان لهما نفس اللون، الأصغر ينضم لـ«باقي التصنيفات» (رمادي).</li>
  <li><b>المقارنة</b>: الفترة اللي ما انتهت تُقارن أيامها اللي مضت (حتى اليوم) بنفس عدد الأيام من بداية الفترة السابقة. الفترة المنتهية تُقارن بالسابقة كاملة. إذا بيانات أي حساب ناقصة في إحدى الفترتين، ما تظهر المقارنة.</li>
  <li>إذا اخترت يومًا من الرسم، يُقارن باليوم اللي قبله.</li>
  <li>«وين راحت الدراهم؟»: نسبة كل تصنيف = إنفاقه ÷ الإنفاق الحقيقي للفترة. والرقم الصغير بجانبها = نسبة أكبر تصنيف فرعي فيه من نفس الإجمالي.</li>
  <li><b>حسب البطاقة</b>: نفس الإنفاق موزع على البطاقة (أو الحساب للعمليات اللي ما لها بطاقة، مثل التحويلات)، ومجموع البطاقات = الإنفاق الحقيقي. البطاقة تنفتح على تصنيفاتها، ونسبة كل تصنيف فيها = صرفه ÷ صرف البطاقة.</li></ul>
  <h3>بطاقة أو حساب جديد من رسالة</h3><p>رسالة ببطاقة (أو حساب) ما يعرفها التطبيق تنحفظ مباشرة على «بطاقة …XXXX» مؤقتة، مالكها غير محدد، وتنحسب في صرفك بعلامة. أول ما تظهر، نافذة «عمليات جديدة» تسألك: لي، أو لشخص ثاني (ما تنحسب). إذا استوردت بعدين كشفًا فيه نفس البطاقة أو الحساب، عملياتها تنقارن مع أسطر الكشف وقت الاستيراد كأنها على نفس الحساب (بنفس قواعد منع التكرار): المطابق يندمج، والمشكوك فيه يطلع لك «تكرار محتمل» في مراجعة الاستيراد. بعد الاعتماد تنتقل للحساب الحقيقي، وتصنيفك وقرارك على البطاقة يبقون. رسالة ما فيها بطاقة ولا حساب أبدًا تسألك «أي حساب؟».</p>
  <h3>نوع التحويل الطالع</h3><p>على كل تحويل طالع (أو عملية خارجة ما عُرف نوعها) ثلاث أزرار: «صرف»، «بين حساباتي»، «سداد بطاقة». إذا للتحويل رقم حساب معروف، الاختيار ينحفظ على بصمة رقم الحساب (مو على الاسم) ويتطبق على تحويلاته السابقة والجاية، ما عدا اللي غيرت نوعها أو صنفتها بنفسك لعملية وحدة. «بين حساباتي» يضيف الحساب لحساباتك. «بين حساباتي» و«سداد بطاقة» ما ينحسبون صرف.</p>
  <h3>«لا تحسبها في الصرف» والحذف</h3><ul>
  <li><b>لا تحسبها في الصرف</b>: العملية تبقى ظاهرة بعلامة، وما تدخل الإنفاق ولا التصنيفات ولا الحدود. ترجعها بزر «احسبها في الصرف».</li>
  <li><b>الحذف</b>: العملية (من أي مصدر) تنتقل لـ«المحذوفة»: ما تظهر ولا تنحسب في أي رقم. ترجعها من «المحذوفة» (آخر صفحة العمليات) أو بزر التراجع. لو جات نفس العملية مرة ثانية (كشف أو رسالة، بنفس قواعد الدمج التلقائي: دليل حاسم أو 90+ أو استثناء كشف البطاقة)، ما ترجع تلقائيًا: الاستيراد يعرضها تحت «عمليات حذفتها قبل» والرسالة تروح المراجعة، ويسألك «رجّعها» أو «خلها محذوفة».</li></ul>
  <h3>الاسترداد</h3><p>يُعرف من الرسالة إذا فيها «استرداد» أو «مسترد» أو «إرجاع» أو «عكس عملية» (أو refund / reversal). المبلغ الداخل لكشف البطاقة وهو مو سداد يطلع «نوعه غير معروف» وتختار أنت «استرداد». والربط بالشراء الأصلي يقترح عليك: نفس التاجر (نفس السجل بالضبط)، بتاريخ قبل الاسترداد أو في يومه، ومبلغه مساوي أو أكبر؛ نفس المبلغ بالضبط أول. إذا ربطته، ينخصم من دورة الشراء وتصنيفه (كأن الشراء انلغى أو نقص)، والشراء ياخذ علامة «مسترجعة» أو «مسترجعة جزئيًا». إذا الشراء مسترجع كامل قبل أو معلّم «لا تحسبها في الصرف» يطلع لك تنبيه قبل الربط، والاسترداد المربوط بشراء مستبعد أو محذوف ما ينخصم (لين ترجع الشراء أو تفك الربط). بدون ربط ينخصم من دورته هو.</p>
  <h3>السحب النقدي</h3><p>السحب صرف مباشر تحت «سحب نقدي». تفتحه وتقسمه أجزاء بتصنيفاتها («وش سويت فيه؟»)، والمجموع ما يتغير؛ الباقي يبقى تحت تصنيف السحب. المصروف النقدي اللي تسجله يدويًا يسألك: من سحب نقدي؟ إذا نعم يصير جزء من السحب (ما ينحسب مرتين)، وإذا لا يصير صرف مباشر. الأجزاء على تاريخ السحب ودورته، وما تتجاوز أصله: لو نقص الأصل بعدين (مثل لما يفصل الكشف الرسوم) تنحسب الأجزاء لين الأصل بس ويطلع لك تنبيه تعدلها. رصيد النقد = السحوبات − الأجزاء − المصاريف النقدية. «تسوية النقد» انشالت لأنها مع هذي القاعدة تحسب الصرف مرتين؛ والمصاريف النقدية اليدوية اللي قبل التحديث تطلع في المراجعة عشان تنقلها لسحبها أو تخليها صرف مباشر.</p>
  <h3>بطاقة الإنماء الائتمانية</h3><p>الرصيد الختامي = الرصيد السابق (باتجاهه) + المشتريات + الرسوم − المدفوعات − الاستردادات. الملف يكتب الرصيد السابق بدون إشارة، فيُحسب بالاتجاهين ويُعتمد اللي يطابق «كامل المبلغ المستحق» و«الحد − المتاح» معًا؛ وإذا ما اتضح يسألك التطبيق.</p>
  <h3>منع التكرار</h3><ul>
  <li>عمليات نفس الملف ما تندمج أبدًا.</li>
  <li>المرشحتان للمطابقة: من ملفين مختلفين، نفس الاتجاه والعملة والمبلغ بالهللة، فرق التاريخ الفعلي 3 أيام أو أقل، وما تكون أداتان معروفتان ومختلفتان.</li>
  <li>دليل حاسم: نفس رقم المرجع، أو نفس الرصيد بعد العملية لنفس الحساب.</li>
  <li>النقاط (المفقود = صفر): التاريخ 40/30/20/10 (نفس اليوم/يوم/يومين/3)، الوقت 40/35/30/20 (5/15/30/60 دقيقة؛ أكثر من ساعة = مستقلتان)، التاجر 30 (مؤكد) أو 20 (تشابه قوي، للتجار فقط)، الأداة 10.</li>
  <li>90 فأكثر دمج تلقائي، 65–89 مراجعة، أقل من 65 مستقلة. التعادل بين مرشحين = مراجعة. الإدخال اليدوي ما يندمج تلقائيًا.</li>
  <li>استثناء كشف البطاقة (بدون وقت): دمج تلقائي إذا تطابق التاريخ والبطاقة والتاجر وما فيه مرشح منافس.</li></ul>
  <h3>الرسوم الأجنبية</h3><p>في شراء VISA بسعر أصلي بالريال، الفرق بين المخصوم والسعر يُسجَّل رسومًا فقط إذا طابق نسبة رسوم العملة الأجنبية (2% + ضريبتها = 2.3%)، وتقسيمه بين رسوم وضريبة غير معروف. غير ذلك ما يُفصل.</p>
  <h3>التقريب</h3><p>سطر يكرر نص الشراء وينتهي بـ«####» ومبلغه يكمّل الشراء لأقرب ريال. يُربط بالشراء للتفسير فقط. وجهته غير المحددة: ينحسب صرف تحت بند «تقريب (وجهته غير محددة)»؛ إذا حددت حساب ادخار يصير تحويلًا داخليًا وما ينحسب، وإذا جهة خيرية ينحسب تحت «تبرعات».</p>
  <h3>الرسائل البنكية</h3><ul>
  <li><b>اللصق</b>: الرسائل تنفصل بالسطر الفاضي أولًا. إذا ما فيه سطر فاضي، رسالة جديدة تبدأ عند سطر أوله كلمة نوع (شراء، حوالة، سحب، إيداع، سداد…)، وأي جزء ما فيه مبلغ ولا تاريخ ولا وقت يلتصق بالرسالة اللي قبله. إذا الفصل بكلمات البداية أو فيه شك (أكثر من بداية أو تاريخ في رسالة، أو مبالغ كثيرة) يطلب التطبيق تأكيد عدد الرسائل قبل المعالجة.</li>
  <li><b>المسار</b>: الرسالة (لصق أو من الصندوق) ← تحقق من رقم الطلب محليًا ← فرز ← قراءة ← الحساب والبطاقة ← التاجر أو المستفيد ← القواعد ← المطابقة ← حفظ أو مراجعة.</li>
  <li><b>الفرز</b>: «رمز تحقق» فقط بعبارات قوية (رمز التحقق، كلمة مرور لمرة واحدة، OTP، verification code، لا تشارك هذا الرمز، login code…) وما ينحفظ نصها. كلمة مفردة مثل «رمز» ما تكفي، والرسالة المشكوك فيها تروح المراجعة كـ«غير معروفة». عملية مرفوضة أو تذكير بمبلغ مستحق = «معلومات» بدون عملية. مبلغ + حركة مالية = «مالية».</li>
  <li><b>القراءة</b>: صيغة متعلّمة (السياق قبل القيمة وبعدها، وإذا ما انطبق فرقم السطر) ← صيغة الإنماء ← قارئ عام. الحقول الناقصة من صيغة متعلّمة تتكمل من القارئ العام، وتظهر للمراجعة.</li>
  <li><b>التعليم</b>: المبلغ مطلوب. التاجر أو المستفيد، آخر 4 أرقام، الرصيد، الرسوم، والتاريخ والوقت ووسيلة الدفع اختيارية. اللي ما تحدده يكمله القارئ العام. التاريخ الملتبس (مثل 05/09/26) تختار ترتيبه مرة وحدة وينحفظ مع الصيغة.</li>
  <li><b>تاريخ العملية</b>: أول تاريخ في نص الرسالة، ويُقرأ بترتيب «شكله» المحفوظ (سنة-شهر-يوم أو يوم-شهر-سنة أو شهر-يوم-سنة). الشكل = نوع أجزاء التاريخ والفاصل بينها، وموضع الوقت، والكلمة اللي قبله، مثل «في 19:03 26-09-28»؛ ما له علاقة باسم البنك. أول مرة يجي شكل جديد يسألك التطبيق دائمًا ويعرض التواريخ المحتملة، والرسالة (ملصوقة أو من الصندوق) تنتظر في المراجعة ما تنحفظ لين تجاوب. إذا طلع التاريخ بعد وقت وصول الرسالة أو لصقها بأكثر من يوم: مراجعة لهذي الرسالة بس، والترتيب المحفوظ ما يتغير. تغيير ترتيب شكل من «الإعدادات» يصحح تاريخ العمليات اللي جا تاريخها آليًا من نفس الشكل فقط، وما يغيّر تاريخ حددته بنفسك ولا عملية أصلها كشف. الصيغة المتعلّمة اللي فيها حقل تاريخ تستخدم ترتيبها هي. إذا الرسالة ما فيها تاريخ: رسالة الصندوق تاخذ تاريخ استلامها، والملصوقة تروح المراجعة لين تحدد تاريخها. وقت الاستلام ما يعتبر وقت العملية.</li>
  <li><b>المستفيد</b>: بالبصمة (الآيبان أو رقم الحساب قبل إخفائه)، أو آخر 4 أرقام مع الاسم مطابق تمامًا. ما فيه مطابقة تقريبية لأسماء الأشخاص.</li>
  <li><b>منع التكرار</b>: رقم الطلب هو المفتاح؛ رسالة محفوظة سابقًا ما تنعالج مرة ثانية (يتأكد استلامها فقط). نفس النص برقم جديد يروح المراجعة، إلا إذا الرسالة السابقة تجاهلتها أو كانت معلومات فقط (ما سوّت عملية). قرارك في المراجعة (عالجها، الحساب، التاريخ) ينحفظ على الرسالة، فما ينسأل مرة ثانية لو احتاجت مراجعة ثانية. المطابقة مع العمليات بنفس نقاط الكشوف: دليل حاسم أو 90+ دمج، 65–89 أو تعادل مراجعة (ما تنحسب لين تقرر)، أقل مستقلة.</li>
  <li><b>لما يوصل الكشف بعد الرسالة</b>: يندمج معها، والكشف يكمّل الأصل والرسوم وتاريخ القيد والرصيد والمرجع والمستفيد. تصنيفك يبقى.</li>
  <li><b>الرسائل ما تعتبر تغطية</b>: تنبيه «البيانات ناقصة» والمقارنات تعتمد على الكشوف فقط.</li>
  <li><b>تأكيد الاستلام (ack)</b> ما يرسل إلا بعد نجاح الحفظ على الجهاز. إذا فشل الحفظ، البيانات في الذاكرة ترجع لآخر حالة محفوظة فعلًا، والرسالة تبقى في الصندوق وتنعالج في الجلب القادم. إذا انحفظت الرسالة وما وصل رد التأكيد (مثلًا طلعت من التطبيق لحظتها)، كل جلب يعيد التأكيد لها لين يوصل، وعلامة «لم يتأكد الاستلام» تختفي.</li>
  <li><b>بعد الجلب أو اللصق</b>: نافذة «عمليات جديدة» تعرض كل عملية انضافت (اللي بدون تصنيف بلون برتقالي) وأي بطاقة جديدة تسألك عن مالكها.</li>
  <li><b>الأوقات</b> (آخر جلب، وقت وصول الرسالة، سجل التعديلات) تنعرض بوقت جهازك.</li></ul>
  <h3>التصنيفات</h3><p>كل تصنيف له رقم ثابت، والعمليات والتجار والمستفيدون والقواعد والحدود مربوطة بالرقم مو بالاسم؛ فتغيير الاسم أو الإيموجي أو اللون ما يغيّر أي رقم. التكرار والضرورة: العملية ← التاجر ← الفرعي ← الرئيسي («يتبع الرئيسي» في الفرعي = يأخذ قيمة الرئيسي). «التزام» يدخل رقم الالتزامات المعروفة إذا العملية متكررة. الحذف ما يحذف أي عملية: تنتقل لتصنيف تختاره، أو تبقى بدون تصنيف (وفي الفرعي تبقى تحت الرئيسي)، والتجار والمستفيدون والقواعد المرتبطة تتبع نفس الاختيار؛ القاعدة اللي ما يبقى لها عمل تتوقف. حد الصرف على تصنيف رئيسي محذوف ينتقل مع العمليات، إلا إذا التصنيف الجديد عليه حد من قبل أو اخترت «بدون تصنيف» فينحذف. «رسوم» وفرعياتها و«تبرعات» و«سحب نقدي» ما تنحذف لأن الحساب يستخدمها.</p>
  <h3>القواعد</h3><p>الأولوية: تعديلك لعملية وحدة ← القاعدة ← التاجر أو المستفيد ← التصنيف الفرعي ← الرئيسي. القاعدة تحتاج شرط حقيقي واحد على الأقل (نص، تاجر، مستفيد، حساب، أو مبلغ). إذا انطبقت أكثر من قاعدة، الأعلى في القائمة تكسب. تنطبق على العمليات الجديدة من الكشوف والرسائل، وعلى السابقة فقط إذا اخترت «طبّقها على السابق».</p>
  <h3>حدود الصرف</h3><p>على الدورة الحالية. مصروف التصنيف = نفس رقمه في «وين راحت الدراهم» (الإنفاق الحقيقي للتصنيف)، والحد الكلي = الإنفاق الحقيقي كله. النسبة = المصروف ÷ الحد. تنبيه عند نسبة الإعداد (80% افتراضيًا) وعند 100%.</p>
  <h3>التراجع وسجل التعديلات</h3><p>كل حفظ خطوة وحدة (بما فيها الاستيراد وجلب الرسائل). التراجع والإعادة لآخر 30 خطوة في الجلسة. سجل التعديلات يبقى (آخر 2000) ويدخل النسخة الاحتياطية. المفتاح السري لصندوق الرسائل ما يدخل النسخة الاحتياطية أبدًا.</p>
  ${methods150()}
  <h3>الخصوصية</h3><p>قبل الحفظ تنخفي: الآيبان، رقم الهوية، أرقام الحسابات (متصلة أو مفصولة بمسافات أو شرطات، مثل 1234 567890 1234)، رقم الجوال إذا ظهر كرقم فاتورة، أرقام عقود التمويل. البصمة تنحسب قبل الإخفاء، ويبقى آخر 4 أرقام. التواريخ والأوقات والمبالغ ما تنخفي، والرقم اللي قبله «مرجع» أو «رقم العملية» يبقى. المستفيد يُعرف ببصمة SHA-256 لآيبانه (تقليل تعرض، مو تشفير سري). المراجع البنكية تبقى للمطابقة.</p></div>`;
}

/* ---------- النوافذ ---------- */
function openSheet(html) { S.sheetKind = null; $('sheet').innerHTML = `<div class="sheet-bg" data-action="sheetBg"><div class="sheet" role="dialog">${html}</div></div>`; }
function closeSheet(val) { $('sheet').innerHTML = ''; if (S.sheetResolve) { const r = S.sheetResolve; S.sheetResolve = null; r(val); } }
function ask(html) { return new Promise(res => { S.sheetResolve = res; openSheet(html); }); }
function confirmBox(title, body, okLabel, danger) {
  return ask(`<h3>${esc(title)}<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><div class="small" style="margin-bottom:14px">${body}</div><div class="btns"><button class="btn ${danger ? 'r' : 'p'}" data-action="answer" data-val="yes">${esc(okLabel || 'تأكيد')}</button><button class="btn" data-action="answer" data-val="">إلغاء</button></div>`).then(v => v === 'yes');
}
function askScope(what) {
  return ask(`<h3>تطبيق التعديل على<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><p class="small">${esc(what)}</p><div class="list">
    <div class="it" data-action="answer" data-val="this"><div class="m"><div class="t">هذه العملية فقط</div></div></div>
    <div class="it" data-action="answer" data-val="future"><div class="m"><div class="t">العمليات القادمة</div><div class="s">هذي العملية + كل استيراد جاي. السابقة تبقى كما هي.</div></div></div>
    <div class="it" data-action="answer" data-val="all"><div class="m"><div class="t">السابقة والقادمة</div><div class="s">كل العمليات ما عدا اللي صنفتها يدويًا لعملية وحدة.</div></div></div></div>`);
}

function catPath(cat, sub) {
  if (!cat) return 'بدون تصنيف';
  const s = sub ? store().get('categories', sub) : null;
  return s ? `${E.catName(store(), cat)} › ${s.name}` : E.catName(store(), cat);
}
function sheetTx(id) {
  const st = store(), t = st.get('transactions', id); if (!t) return;
  const m = merchantOf(t), b = benOf(t), ins = insOf(t), acc = accOf(t.accountId);
  const canCat = ['Payment', 'CashExpense', 'PersonTransfer', 'Refund', 'Unknown', 'CashWithdrawal'].includes(t.transactionType) && t.transferSubtype !== 'round_up';
  const types = ['Payment', 'Income', 'InternalTransfer', 'CreditCardPayment', 'PersonTransfer', 'Refund', 'CashWithdrawal', 'Unknown'];
  const recDef = E.effective(st, Object.assign({}, t, { recurrenceType: null }), 'rec'), necDef = E.effective(st, Object.assign({}, t, { necessityType: null }), 'nec');
  const recL = { recurring: 'متكرر', variable: 'متغير' }, necL = { essential: 'ضروري', discretionary: 'اختياري' };
  const u = txUi(t);
  const src0 = (t.sourceLinks || [])[0];
  let h = `<h3><button class="close" data-action="txClose" aria-label="إغلاق">×</button><span class="sp"></span>${S.newList ? `<button class="btn" data-action="newBack">العمليات الجديدة ${ico('chevL')}</button>` : ''}</h3>
    <div class="txh">
      ${canCat ? `<button class="catbtn" data-action="txCat" data-id="${t.id}" style="border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${glyph(u)}</span><span>${esc(catLabel(t))}</span></button>`
        : `<div class="catbtn" style="cursor:default;border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${glyph(u)}</span><span>${TYPE_L[t.transactionType]}</span></div>`}
      <div class="nm">${m ? `<span class="ic s" style="background:var(--pri-soft);color:var(--pri)">${ico('store')}</span>` : b ? `<span class="ic s" style="background:var(--pri-soft);color:var(--pri)">${ico('person')}</span>` : ''}<span>${esc(txTitle(t))}</span>${m ? `<a data-action="merchantDrill" data-id="${m.id}" aria-label="كل عمليات التاجر" style="display:flex">${ico('chevL')}</a>` : ''}</div>
      <div class="amt">${money(t.grossAmount)}${dirBadge(t)}</div>
      <div class="badges" style="justify-content:center">${badges(t).replace(/^<div class="badges">|<\/div>$/g, '')}</div>
    </div>
    ${txBlocks(t)}
    <input type="hidden" id="s_cat" value="${esc(t.categoryId || '')}"><input type="hidden" id="s_sub" value="${esc(t.subcategoryId || '')}">
    <div class="drow">${ico('note')}<div class="m"><input type="text" id="s_note" placeholder="إضافة ملاحظة" value="${esc(t.note || '')}"></div></div>
    <div class="drow">${ico(acc && acc.type === 'credit_card' ? 'card' : 'bank')}<div class="m">${esc(acc ? acc.name : '—')}${ins ? ` · ${esc(ins.label)}` : ''}${t.paymentMethod && t.paymentMethod !== 'Unknown' ? ` · ${METHOD_L[t.paymentMethod] || esc(t.paymentMethod)}` : ''}</div></div>
    <div class="drow">${ico('cal')}<div class="m">${fday(t.transactionDate)}${t.time ? '، ' + ftime(t.time) : ''}</div></div>
    ${txCityRow(t)}${txGroupsRow(t)}
    ${src0 ? `<div class="drow" style="align-items:flex-start">${ico('msg')}<div class="m small">${rawHtml(src0.rawDescription || '')}</div></div>` : ''}`;
  if (t.transferSubtype === 'round_up') {
    const orig = t.roundUpOfId ? st.get('transactions', t.roundUpOfId) : null;
    h += `<div class="banner i" style="margin-top:10px"><div>تقريب لأقرب ريال${orig ? ` لشراء ${fmt(orig.grossAmount)} من ${esc(txTitle(orig))}` : ''}. <a data-action="setRoundUp">حدد وجهة التقريب</a> (تنطبق على كل عمليات التقريب).</div></div>`;
  }
  h += `<details class="more"><summary>تعديل النوع والخصائص والتفاصيل</summary>
    <label class="f">النوع</label><select id="s_type">${types.map(x => `<option value="${x}" ${x === t.transactionType ? 'selected' : ''}>${TYPE_L[x]}</option>`).join('')}</select>
    <div id="s_cp_wrap" class="${t.transactionType === 'InternalTransfer' ? '' : 'hide'}"><label class="f">الحساب الآخر (لك)</label><select id="s_cp">${ownAccountOptions(t.counterpartyAccountId, true)}</select></div>`;
  if (canCat) h += `<div class="grid2"><div><label class="f">التكرار</label><select id="s_rec"><option value="">افتراضي (${recL[recDef] || '—'})</option><option value="recurring" ${t.recurrenceType === 'recurring' ? 'selected' : ''}>متكرر</option><option value="variable" ${t.recurrenceType === 'variable' ? 'selected' : ''}>متغير</option></select></div>
      <div><label class="f">الضرورة</label><select id="s_nec"><option value="">افتراضي (${necL[necDef] || '—'})</option><option value="essential" ${t.necessityType === 'essential' ? 'selected' : ''}>ضروري</option><option value="discretionary" ${t.necessityType === 'discretionary' ? 'selected' : ''}>اختياري</option></select></div></div>${txChainFields(t)}`;
  h += `<dl class="kv" style="margin-top:14px">
    <dt>تاريخ العملية</dt><dd>${fdate(t.transactionDate, true)}</dd>${t.postingDate && t.postingDate !== t.transactionDate ? `<dt>تاريخ القيد</dt><dd>${fdate(t.postingDate, true)}</dd>` : ''}
    <dt>الأداة</dt><dd>${ins ? esc(ins.label) + ` (المالك: ${OWNER_L[ins.instrumentOwner]}) <a data-action="editInstrument" data-id="${ins.id}">تعديل</a>` : 'أداة دفع غير محددة'}</dd>
    ${m ? `<dt>التاجر</dt><dd>${esc(m.name)} <a data-action="editMerchant" data-id="${m.id}">تعديل التاجر</a></dd>` : ''}
    ${b ? `<dt>المستفيد</dt><dd>${esc(b.name)} · ${esc(b.bank || '')} …${esc(b.accountLast4 || '')} <a data-action="editBeneficiary" data-id="${b.id}">تعديل</a></dd>` : ''}
    <dt>الإجمالي</dt><dd>${num(t.grossAmount)}</dd>${(t.feeAmount || t.vatAmount) ? `<dt>الأصل</dt><dd>${num(t.principalAmount)}</dd><dt>الرسوم</dt><dd>${num(t.feeAmount)}${t.feeTaxBreakdownKnown === false ? ' (الضريبة داخلها؛ التقسيم غير معروف)' : ''}</dd>${t.feeTaxBreakdownKnown !== false ? `<dt>ضريبة الرسوم</dt><dd>${num(t.vatAmount)}</dd>` : ''}` : ''}
    ${t.foreignAmount ? `<dt>المبلغ الأصلي</dt><dd><span class="num">${fmt(t.foreignAmount)} ${esc(t.foreignCurrency || '')}</span></dd>` : ''}
    ${t.reference ? `<dt>المرجع</dt><dd class="small"><span class="num">${esc(t.reference)}</span></dd>` : ''}${t.balanceAfter != null ? `<dt>الرصيد بعد العملية</dt><dd>${num(t.balanceAfter)}</dd>` : ''}
    ${(t.linkedTransactionIds || []).length ? `<dt>مرتبطة بـ</dt><dd>${t.linkedTransactionIds.map(x => { const o = st.get('transactions', x); return o ? `<a data-action="openTx" data-id="${o.id}">${esc(txTitle(o))} ${fmt(o.grossAmount)}</a>` : ''; }).join('<br>')}</dd>` : ''}</dl>
    <div class="btns" style="margin-top:12px"><button class="btn" data-action="ruleFromTx" data-id="${t.id}">قاعدة من هذي العملية</button></div>
    <h3 style="margin-top:14px;font-size:15px">المصادر (${(t.sourceLinks || []).length})</h3>${(t.sourceLinks || []).map(sl => { const imp = sl.importId ? st.get('imports', sl.importId) : null; return `<div class="small muted" style="margin-top:6px">${SRC_L[sl.sourceType] || sl.sourceType}${imp ? ' · ' + esc(imp.filename) : ''}</div><div class="raw">${rawHtml(sl.rawDescription || '')}</div>`; }).join('')}
    </details>
    <div class="btns" style="margin-top:14px"><button class="btn p" style="flex:1" data-action="saveTx" data-id="${t.id}">حفظ</button>${txExcludeBtn(t)}<button class="btn r" data-action="deleteTx" data-id="${t.id}" aria-label="حذف">${ico('trash')} حذف</button></div>`;
  openSheet(h); S.sheetKind = 'tx';
}
function txExcludeBtn(t) {
  if (t.excludedByUser) return `<button class="btn" data-action="txExclude" data-id="${t.id}" data-v="0">احسبها في الصرف</button>`;
  const ins = insOf(t);
  if (ins && ins.includeInPersonalSpend === false) return '';
  return (E.spendEffect(t) !== 0 || E.feeOf(t) > 0) ? `<button class="btn" data-action="txExclude" data-id="${t.id}" data-v="1">لا تحسبها في الصرف</button>` : '';
}
// أجزاء خاصة بنوع العملية داخل نافذتها: نوع التحويل، ربط الاسترداد، تقسيم السحب، نقل مصروف نقدي لسحب
function txBlocks(t) {
  const st = store(), b = benOf(t); let h = '';
  if (t.excludedByUser) h += `<div class="banner i" style="margin-top:10px"><div>هذي العملية ما تنحسب في الصرف ولا في أي رقم. تقدر ترجعها بزر «احسبها في الصرف».</div></div>`;
  const tk = E.transferKindOf(t);
  if (tk && t.direction === 'out' && t.transferSubtype !== 'round_up') {
    h += `<div class="txblock"><div class="small muted" style="margin-bottom:6px">${t.transactionType === 'Unknown' ? 'هذي العملية' : 'هذا التحويل'}:</div><div class="seg"><button class="${tk === 'spend' ? 'on' : ''}" data-action="txKind" data-id="${t.id}" data-v="spend">صرف</button><button class="${tk === 'mine' ? 'on' : ''}" data-action="txKind" data-id="${t.id}" data-v="mine">بين حساباتي</button><button class="${tk === 'card' ? 'on' : ''}" data-action="txKind" data-id="${t.id}" data-v="card">سداد بطاقة</button></div>
      <div class="small muted" style="margin-top:6px">${b ? `اختيارك ينحفظ على رقم الحساب …${esc(b.accountLast4 || '')}، ويتطبق على تحويلاته السابقة والجاية.` : 'لهذي العملية بس.'} «بين حساباتي» و«سداد بطاقة» ما ينحسبون صرف، عشان ما ينحسب نفس المبلغ مرتين.</div></div>`;
  }
  if (t.transactionType === 'Refund') {
    const p0 = t.refundOfId ? st.get('transactions', t.refundOfId) : null, pd = t.refundOfId && !p0 ? st.get('deletedTxs', t.refundOfId) : null;
    if (pd) h += `<div class="txblock"><div class="small">الشراء المربوط (<b>${esc(txTitle(pd))}</b> ${fmt(pd.principalAmount)}) محذوف، فهذا الاسترداد ما ينخصم من صرفك. رجّع الشراء من «المحذوفة»، أو فك الربط عشان ينخصم من دورته هو.</div><div class="btns" style="margin-top:6px"><button class="btn" data-action="refundUnlink" data-id="${t.id}">فك الربط</button></div></div>`;
    else if (p0) h += `<div class="txblock"><div class="small">مربوط بالشراء الأصلي: <a data-action="openTx" data-id="${p0.id}"><b>${esc(txTitle(p0))}</b> ${fmt(p0.principalAmount)} · ${fdate(p0.transactionDate, true)}</a>. ينخصم من دورة الشراء وتصنيفه.</div><div class="btns" style="margin-top:6px"><button class="btn" data-action="refundUnlink" data-id="${t.id}">فك الربط</button></div></div>`;
    else {
      const cands = E.refundCandidates(st, t.id);
      h += `<div class="txblock"><div class="small" style="margin-bottom:6px"><b>اربطه بالشراء الأصلي</b> عشان ينخصم من دورة الشراء نفسها. بدون ربط ينخصم من دورته هو.</div>${cands.length ? `<div class="list">${cands.map(c => { const pt = st.get('transactions', c.id); return `<div class="it" data-action="refundLink" data-id="${t.id}" data-p="${c.id}"><div class="m"><div class="t">${esc(txTitle(pt))} · <span class="num">${fmt(c.amount)}</span></div><div class="s">${fdate(c.date, true)}${c.refunded ? ` · انسترجع منه قبل ${fmt(c.refunded)}` : ''}</div></div>${c.excluded ? '<span class="b w">ما تنحسب</span>' : c.full ? '<span class="b w">مسترجع كامل</span>' : c.exact ? '<span class="b g">نفس المبلغ</span>' : ''}</div>`; }).join('')}</div>` : `<div class="small muted">ما لقيت شراء من نفس التاجر بمبلغ مساوي أو أكبر قبل هذا التاريخ.</div>`}</div>`;
    }
  }
  if (t.transactionType === 'Payment' && S.refunds && S.refunds.get(t.id)) h += `<div class="small muted" style="margin-top:8px">انسترجع منها ${fmt(S.refunds.get(t.id))} من ${fmt(t.principalAmount)}، وانخصم من دورتها.</div>`;
  if (t.transactionType === 'CashWithdrawal') {
    const parts = t.cashParts || [], rem = E.cashRemaining(t, st);
    h += `<div class="txblock"><div class="small" style="margin-bottom:6px"><b>وش سويت فيه؟</b> قسّم السحب على تصنيفاته، والمجموع ما يتغير.</div>
      ${parts.length ? '<div class="list">' : ''}${parts.map(pp => `<div class="it"><div class="m"><div class="t">${esc(bucketName(pp.categoryId || null))}${pp.subcategoryId ? ' › ' + esc((st.get('categories', pp.subcategoryId) || {}).name || '') : ''} · <span class="num">${fmt(pp.amount)}</span></div>${pp.note ? `<div class="s">${esc(pp.note)}</div>` : ''}</div><button class="close" data-action="cashPartDel" data-id="${t.id}" data-p="${pp.id}" aria-label="حذف الجزء">×</button></div>`).join('')}${parts.length ? '</div>' : ''}
      ${rem < -0.004 ? `<div class="banner w" style="margin:6px 0"><div>الأجزاء أكبر من أصل السحب بـ <b class="num">${fmt(-rem)}</b> (غالبًا لأن الكشف فصل الرسوم). الأرقام تحسب الأجزاء لين أصل السحب بس؛ عدّل أو احذف جزء.</div></div>` : `<div class="small muted" style="margin:6px 0">الباقي تحت «${esc(t.categoryId ? E.catName(st, t.categoryId) : 'سحب نقدي')}»: <b class="num">${fmt(rem)}</b></div>`}
      ${rem > 0.004 ? `<div class="grid2"><input type="text" inputmode="decimal" id="cp_amt" placeholder="المبلغ"><input type="text" id="cp_note" placeholder="وش كان؟ (اختياري)"></div><input type="hidden" id="cp_cat"><input type="hidden" id="cp_sub"><div class="btns" style="margin-top:6px"><button class="btn" data-action="cashPartCat" id="cp_catbtn">اختر التصنيف</button><button class="btn p" data-action="cashPartAdd" data-id="${t.id}">+ أضف الجزء</button></div>` : ''}</div>`;
  }
  if (t.transactionType === 'CashExpense' && (t.sourceLinks || []).every(sl => sl.sourceType === 'manual' || sl.sourceType === 'cash_reconciliation')) {
    const ws = E.recentWithdrawals(st, t.transactionDate > E.todayISO() ? t.transactionDate : E.todayISO(), 120).filter(w => w.remaining >= t.grossAmount - 0.004);
    if (ws.length) h += `<div class="txblock"><div class="small" style="margin-bottom:6px">إذا هذا المصروف من فلوس سحبتها، انقله للسحب عشان ما ينحسب مرتين:</div><select id="tx_w">${ws.map(w => `<option value="${w.id}">سحب ${fmt(w.amount)} · ${fdate(w.date)} (باقي ${fmt(w.remaining)})</option>`).join('')}</select><div class="btns" style="margin-top:6px"><button class="btn" data-action="toCashPart" data-id="${t.id}">انقله للسحب</button>${isOldCash(t) ? `<button class="btn" data-action="cashDirectOk" data-id="${t.id}">لا، صرف مباشر</button>` : ''}</div></div>`;
  }
  h += txBlocks150(t);
  return h;
}
const isOldCash = (t) => t.transactionType === 'CashExpense' && !t.cashDirectOk && settings().migrated141At && String(t.createdAt || '') < settings().migrated141At && (t.sourceLinks || []).every(sl => sl.sourceType === 'manual' || sl.sourceType === 'cash_reconciliation');
// بعد أي تعديل داخل نافذة العملية: تبقى النافذة مفتوحة محدثة (وفيها زر الرجوع لـ«العمليات الجديدة» إذا جيت منها)
function afterTx(id) { if (store().get('transactions', id)) sheetTx(id); else if (S.newList) renderNewList(); else closeSheet(); }

/* ---------- نافذة «عمليات جديدة» بعد الجلب أو اللصق ---------- */
function showNewTxs(plan, always) {
  const st = store();
  const ids = plan.msgRecords.filter(r => r.status === 'tx' && r.txId && st.get('transactions', r.txId)).map(r => r.txId);
  const cards = Array.from(plan.newInstruments.values()).map(i => st.get('instruments', i.id)).filter(i => i && i.instrumentOwner === 'unknown');
  if (!ids.length && !cards.length && !always) return false;
  S.newList = { ids: Array.from(new Set(ids)), cards: cards.map(i => i.id), summary: plan.smsSummary };
  renderNewList(); return true;
}
function renderNewList() {
  const L = S.newList; if (!L) return closeSheet();
  const st = store();
  const txs = L.ids.map(id => st.get('transactions', id)).filter(Boolean).sort(sortTx);
  const cards = L.cards.map(id => st.get('instruments', id)).filter(i => i && i.instrumentOwner === 'unknown');
  const s = L.summary || {};
  const extra = [s.merged ? `${s.merged} اندمجت مع عمليات موجودة` : '', s.informational ? `${s.informational} معلومات بدون عملية` : '', s.discarded ? `${s.discarded} رمز تحقق ما انحفظ` : '', s.already ? `${s.already} سبق استلامها` : ''].filter(Boolean).join('، ');
  const nRv = openReviews().length;
  const uncOf = (t) => E.spendParts(st, t).some(p => p.cat === '__none');
  let h = `<h3>${txs.length ? (txs.length === 1 ? 'عملية جديدة' : `عمليات جديدة (${txs.length})`) : 'نتيجة الرسائل'}<span class="sp"></span><button class="close" data-action="newDone" aria-label="إغلاق">×</button></h3>`;
  cards.forEach(i => { h += `<div class="banner w" style="display:block;margin-bottom:10px"><div><b>بطاقة جديدة «${esc(i.label)}»</b>: لمن؟ عملياتها داخلة في صرفك لين تحدد.</div><div class="btns" style="margin-top:8px"><button class="btn p" data-action="cardOwner" data-id="${i.id}" data-v="me">لي</button><button class="btn" data-action="cardOwner" data-id="${i.id}" data-v="other">لشخص ثاني (ما تنحسب)</button></div></div>`; });
  if (txs.length) h += `<p class="small muted" style="margin:0 0 6px">اضغط أي عملية تصنفها أو تعدل خياراتها.${txs.some(uncOf) ? ' <b class="warn-t">البرتقالي بدون تصنيف.</b>' : ''}</p>` + txs.map(t => `<div class="tx ${uncOf(t) ? 'unc' : ''}" data-action="newOpen" data-id="${t.id}">${icCircle(txUi(t))}<div class="m"><div class="t">${esc(txTitle(t))}</div><div class="s">${subLine(t, true)}</div>${badges(t)}</div><div class="a"><span class="num">${fmt(t.grossAmount)}</span>${dirBadge(t)}</div></div>`).join('');
  if (extra) h += `<p class="small muted" style="margin-top:8px">${extra}.</p>`;
  if (nRv) h += `<div class="banner i" style="margin-top:8px"><div>${nRv === 1 ? 'رسالة وحدة تحتاج' : nRv === 2 ? 'رسالتان تحتاجان' : nRv + ' رسائل تحتاج'} قرارك.</div><button class="btn" data-action="newToReview">افتح المراجعة</button></div>`;
  if (!txs.length && !cards.length && !nRv && !extra) h += `<p class="muted">ما فيه جديد.</p>`;
  h += `<div class="btns" style="margin-top:12px"><button class="btn p" style="flex:1" data-action="newDone">تم</button></div>`;
  openSheet(h); S.sheetKind = 'newlist';
}

/* ---------- المحذوفة ---------- */
function vDeleted() {
  const list = store().all('deletedTxs').sort((a, b) => String(b.deletedAt || '').localeCompare(String(a.deletedAt || '')));
  if (!list.length) return `<div class="card empty">ما فيه عمليات محذوفة.</div>`;
  return `<div class="card"><h2>المحذوفة <span class="sp"></span><span class="muted">${list.length}</span></h2><p class="small muted">ما تظهر في العمليات ولا تنحسب في أي رقم. «رجّعها» ترجعها بنفس بياناتها وتصنيفها. لو جات نفس العملية من كشف أو رسالة، التطبيق يسألك قبل ما يرجعها.</p>
    ${list.map(t => `<div class="tx">${icCircle(txUi(t))}<div class="m"><div class="t">${esc(txTitle(t))}</div><div class="s">${fdate(t.transactionDate || t.postingDate, true)} · حُذفت ${fdt(t.deletedAt)}</div></div><div class="a"><span class="num">${fmt(t.grossAmount)}</span></div><button class="btn" data-action="restoreTx" data-id="${t.id}">رجّعها</button></div>`).join('')}</div>`;
}

/* ---------- اختيار التصنيف (نافذة فوق النافذة) ---------- */
function pickCategory(cur, opts) {
  opts = opts || {};
  return new Promise(res => {
    S.pickResolve = res;
    S.pick = { cat: cur.cat || null, sub: cur.sub || null, stage: 'grid', allowNone: opts.allowNone !== false };
    renderPick();
  });
}
function renderPick() {
  const P = S.pick, st = store();
  const byOrder = (a, b) => a.order - b.order;
  let h = `<div class="sheet-bg" data-action="pickBg"><div class="sheet" role="dialog" aria-label="اختر التصنيف"><h3><button class="close" data-action="pickClose" aria-label="إغلاق">×</button><span class="sp" style="text-align:center;color:var(--ink-3);font-weight:500">اختر التصنيف</span><span style="width:34px"></span></h3>`;
  if (P.stage === 'grid') {
    const mains = st.all('categories').filter(c => !c.parentId && c.active !== false).sort(byOrder);
    h += `<div class="catgrid">${mains.map(c => { const u = catUi(c.id); return `<button data-action="pickMain" data-id="${c.id}" class="${P.cat === c.id ? 'on' : ''}"><span style="color:${u.color};display:flex">${glyph(u)}</span><span>${esc(c.name)}</span></button>`; }).join('')}</div>`;
    h = h.replace(/<\/div>$/, '');
    h += `<button data-action="pickNew" class="newcat"><span style="display:flex">${ico('plus')}</span><span>تصنيف جديد</span></button></div>`;
    if (P.allowNone) h += `<div style="text-align:center;margin-top:16px"><button class="btn" data-action="pickNone">بدون تصنيف</button></div>`;
  } else if (P.stage === 'new') {
    h += `<div class="catform">${catFormHtml(null, P.newParent || null, false)}<div class="btns" style="margin-top:12px"><button class="btn p" data-action="catSave" data-pick="1">إضافة واختيار</button><button class="btn" data-action="pickBack">رجوع</button></div></div>`;
  } else {
    const c = st.get('categories', P.cat), u = catUi(c.id);
    const subs = st.all('categories').filter(x => x.parentId === c.id && x.active !== false).sort(byOrder);
    h += `<div class="subpick"><div class="sel"><span class="catbtn" style="border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${glyph(u)}</span><span>${esc(c.name)}</span></span><button class="close" data-action="pickBack" aria-label="رجوع للتصنيفات">×</button></div>
      <div class="chips2"><button data-action="pickSub" data-id="" class="${!P.sub ? 'on' : ''}">${esc(c.name)} بدون فرعي</button>${subs.map(x => `<button data-action="pickSub" data-id="${x.id}" class="${P.sub === x.id ? 'on' : ''}">${x.emoji || SUB_ICON[x.id] ? `<span style="color:${u.color};display:flex">${glyph(catUi(x.id), SUB_ICON[x.id])}</span>` : ''}${esc(x.name)}</button>`).join('')}<button data-action="pickNewSub" data-parent="${c.id}" class="addsub">+ فرعي</button></div></div>`;
  }
  $('sheet2').innerHTML = h + `</div></div>`;
}
function finishPick(v) { $('sheet2').innerHTML = ''; const r = S.pickResolve; S.pickResolve = null; S.pick = null; if (r) r(v); }
// حقل التصنيف داخل النماذج: زر يفتح الاختيار، والقيمة في حقلين مخفيين
function catFieldInner(cat, sub) {
  const u = cat ? catUi(sub && SUB_ICON[sub] ? sub : cat) : catUi(null);
  return `${icCircle(u, 's')}<span>${esc(catPath(cat, sub))}</span><span class="sp"></span>${ico('chevL')}`;
}
function catField(cat, sub) {
  return `<input type="hidden" id="s_cat" value="${esc(cat || '')}"><input type="hidden" id="s_sub" value="${esc(sub || '')}"><button type="button" class="catfield" id="catfield" data-action="catField">${catFieldInner(cat, sub)}</button>`;
}

function sheetPeriod() {
  const st = store(), cs = E.listCycles(st);
  const cur = S.period;
  openSheet(`<h3>اختيار الفترة<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    ${S.view === 'txs' ? `<div class="list"><div class="it" data-action="allTime"><div class="m"><div class="t"><b>السجل التاريخي</b></div><div class="s">كل العمليات من أول تاريخ${S.filters.allTime ? ' · المختارة' : ''}</div></div></div></div>` : ''}
    <div class="list">${cs.map((c, i) => `<div class="it" data-action="setPeriod" data-i="${i}"><div class="m"><div class="t">${fperiod(c)}</div><div class="s">${c.kind === 'month' ? 'شهر ميلادي' : c.startsWithSalary ? 'تبدأ براتب' : 'بداية افتراضية (يوم الراتب)'}${c.start === cur.start && c.end === cur.end && !(S.view === 'txs' && S.filters.allTime) ? ' · المختارة' : ''}</div></div></div>`).join('')}</div>
    <h3 style="margin-top:14px">فترة مخصصة</h3><div class="grid2"><div><label class="f">من</label><input type="date" id="p_from" value="${cur.start}"></div><div><label class="f">إلى</label><input type="date" id="p_to" value="${cur.end}"></div></div>
    <button class="btn p" style="margin-top:10px" data-action="setCustomPeriod">تطبيق</button>`);
}
function sheetFilters() {
  const st = store(), f = S.filters;
  const sel = (id, opts, cur) => `<select id="${id}"><option value="">الكل</option>${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  openSheet(`<h3>فلاتر<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">النوع</label>${sel('f_kind', Object.entries(KIND_L).filter(([k]) => k !== 'all'), f.kind === 'all' ? '' : f.kind)}
    <label class="f">الحساب</label>${sel('f_acc', st.all('accounts').map(a => [a.id, a.name]), f.accountId)}
    <label class="f">الأداة</label>${sel('f_ins', st.all('instruments').map(i => [i.id, i.label]), f.instrumentId)}
    <label class="f">طريقة الدفع</label>${sel('f_method', Object.entries(METHOD_L), f.method)}
    <label class="f">التصنيف</label>${sel('f_cat', [['__none', 'بدون تصنيف'], ['__person', 'تحويلات لأشخاص (مؤقت)'], ['__roundup', 'تقريب (وجهته غير محددة)']].concat(st.all('categories').filter(c => !c.parentId).sort((a, b) => a.order - b.order).map(c => [c.id, c.name])), f.categoryId)}
    <label class="f">المصدر</label>${sel('f_src', Object.entries(SRC_L), f.source)}
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="applyFilters">تطبيق</button><button class="btn" data-action="clearFilters">مسح الكل</button></div>`);
}
function sheetManual(kind, pre) {
  pre = pre || {};
  const st = store(), { ins: cashIns } = E.ensureCashAccount(st); persist();
  const insList = st.all('instruments').filter(i => i.active !== false);
  const title = { expense: 'مصروف', income: 'دخل', withdrawal: 'سحب نقدي', deposit: 'إيداع نقدي' }[kind];
  let h = `<h3>${title}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">المبلغ</label><input type="text" inputmode="decimal" id="m_amt" value="${pre.amount || ''}" placeholder="0.00">
    <label class="f">التاريخ</label><input type="date" id="m_date" value="${E.todayISO()}">`;
  const ws = kind === 'expense' ? E.recentWithdrawals(st, E.todayISO(), 90) : [];
  if (kind === 'expense') h += `<label class="f">الوصف أو التاجر</label><input type="text" id="m_desc" value="${esc(pre.description || '')}"><label class="f">دُفع عن طريق</label><select id="m_ins">${insList.map(i => `<option value="${i.id}" ${i.id === cashIns.id ? 'selected' : ''}>${esc(i.label)}</option>`).join('')}</select>
    ${ws.length ? `<div id="m_wwrap"><label class="f">النقد هذا من سحب نقدي؟</label><select id="m_w"><option value="">— اختر —</option>${ws.map(w => `<option value="${w.id}">نعم: سحب ${fmt(w.amount)} · ${fdate(w.date)} (باقي ${fmt(w.remaining)})</option>`).join('')}<option value="__direct">لا، نقد من مصدر ثاني (صرف مباشر)</option></select><p class="small muted">السحب نفسه انحسب صرف. إذا المصروف منه، يصير جزء منه وما ينحسب مرتين.</p></div>` : ''}
    <label class="f">التصنيف</label>${catField(pre.categoryId, pre.subcategoryId)}
    ${manualCityField()}
    <p class="small muted">إذا دفعت بالبطاقة، العملية بتظهر لاحقًا في الكشف، والتطبيق بيعرضها عليك كتكرار محتمل عشان ما تنحسب مرتين.</p>`;
  if (kind === 'income') h += `<label class="f">الوصف</label><input type="text" id="m_desc"><label class="f">النوع</label><select id="m_inc">${Object.entries(INCOME_L).map(([k, v]) => `<option value="${k}" ${k === 'other' ? 'selected' : ''}>${v}</option>`).join('')}</select><label class="f">الحساب</label><select id="m_acc">${st.all('accounts').map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>`;
  if (kind === 'withdrawal' || kind === 'deposit') h += `<label class="f">${kind === 'withdrawal' ? 'سُحب من' : 'أُودع في'}</label><select id="m_acc">${st.all('accounts').filter(a => a.type !== 'cash' && a.type !== 'credit_card').map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>`;
  h += `<label class="f">ملاحظة</label><input type="text" id="m_note"><div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveManual" data-kind="${kind}">حفظ</button></div>`;
  openSheet(h);
}
function sheetAccount(id) {
  const a = id ? accOf(id) : { id: '', name: '', bank: '', type: 'checking', last4: '', isMine: true };
  openSheet(`<h3>${id ? 'تعديل الحساب' : 'حساب جديد'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">الاسم</label><input type="text" id="a_name" value="${esc(a.name)}"><label class="f">البنك</label><input type="text" id="a_bank" value="${esc(a.bank || '')}">
    <label class="f">النوع</label><select id="a_type">${Object.entries(ACC_L).map(([k, v]) => `<option value="${k}" ${k === a.type ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label class="f">آخر 4 أرقام</label><input type="text" id="a_last4" maxlength="4" inputmode="numeric" value="${esc(a.last4 || '')}">
    <label class="f"><input type="checkbox" id="a_mine" ${a.isMine ? 'checked' : ''}> الحساب لي</label>
    ${accountLiqField(a)}
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveAccount" data-id="${a.id || ''}">حفظ</button></div>`);
}
function sheetInstrument(id) {
  const i = store().get('instruments', id); if (!i) return;
  openSheet(`<h3>${esc(i.label)}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">المالك</label><select id="i_owner">${Object.entries(OWNER_L).map(([k, v]) => `<option value="${k}" ${k === i.instrumentOwner ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label class="f">اسم المالك (اختياري)</label><input type="text" id="i_oname" value="${esc(i.ownerName || '')}">
    <label class="f"><input type="checkbox" id="i_inc" ${i.includeInPersonalSpend !== false ? 'checked' : ''}> تدخل عملياتها في إنفاقي الشخصي</label>
    <p class="small muted">تغيير هذا يعيد حساب كل الفترات تلقائيًا.</p><div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveInstrument" data-id="${i.id}">حفظ</button></div>`);
}
function sheetBeneficiary(id) {
  const b = store().get('beneficiaries', id); if (!b) return;
  openSheet(`<h3>${esc(b.name)}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><div class="small muted">${esc(b.bank || '')} · حساب …${esc(b.accountLast4 || '')}</div>
    <label class="f"><input type="checkbox" id="b_mine" ${b.isMyAccount ? 'checked' : ''}> هذا حسابي (التحويلات له تحويلات داخلية)</label>
    <label class="f">التصنيف المعتاد لحوالاته</label>${catField(b.categoryId, b.subcategoryId)}
    <label class="f">ملاحظات</label><input type="text" id="b_notes" value="${esc(b.notes || '')}">
    ${b.isMyAccount ? '' : subjectChainFields(b, 'beneficiary', true)}
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveBeneficiary" data-id="${b.id}">حفظ</button><button class="btn" data-action="benDrill" data-id="${b.id}">حوالاته</button></div>`);
}
function sheetMerchant(id) {
  const m = store().get('merchants', id); if (!m) return;
  const cat = m.categoryId || m.suggestedCategoryId, sub = m.categoryId ? m.subcategoryId : m.suggestedSubcategoryId;
  openSheet(`<h3>${esc(m.name)}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><div class="small muted">الأسماء في الكشوف: ${esc((m.aliases || []).join('، '))}</div>
    <label class="f">التصنيف</label>${catField(cat, sub)}
    <div class="grid2"><div><label class="f">التكرار (للتاجر)</label><select id="mm_rec"><option value="">من التصنيف</option><option value="recurring" ${m.defaultRecurrenceType === 'recurring' ? 'selected' : ''}>متكرر</option><option value="variable" ${m.defaultRecurrenceType === 'variable' ? 'selected' : ''}>متغير</option></select></div>
    <div><label class="f">الضرورة (للتاجر)</label><select id="mm_nec"><option value="">من التصنيف</option><option value="essential" ${m.defaultNecessityType === 'essential' ? 'selected' : ''}>ضروري</option><option value="discretionary" ${m.defaultNecessityType === 'discretionary' ? 'selected' : ''}>اختياري</option></select></div></div>
    ${subjectChainFields(m, 'merchant')}
    <p class="small muted">يتطبق على كل عمليات التاجر السابقة والقادمة، ما عدا اللي صنفتها يدويًا لعملية وحدة.</p>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveMerchant" data-id="${m.id}">حفظ</button><button class="btn" data-action="merchantDrill" data-id="${m.id}">عملياته</button></div>`);
}
function sheetRoundUp() {
  const s = settings(), dest = s.roundUpDestination || { kind: 'unknown' };
  openSheet(`<h3>وجهة التقريب<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><p class="small">تنطبق على كل عمليات التقريب السابقة والقادمة.</p>
    <label class="f"><input type="radio" name="ru" value="unknown" ${dest.kind === 'unknown' ? 'checked' : ''}> غير محددة (تنحسب صرف لين تحددها)</label>
    <label class="f"><input type="radio" name="ru" value="account" ${dest.kind === 'account' ? 'checked' : ''}> حساب ادخار لي (تحويل داخلي)</label><select id="ru_acc">${ownAccountOptions(dest.accountId, false)}</select>
    <label class="f"><input type="radio" name="ru" value="charity" ${dest.kind === 'charity' ? 'checked' : ''}> جهة خيرية (إنفاق تحت «تبرعات»)</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveRoundUp">حفظ</button></div>`);
}
/* ================= MVP1.1 + 1.1.1: الرسائل، المراجعة، التعديل الجماعي، السجل، الحدود، القواعد ================= */
const SR = () => window.SmsReader;
const REVIEW_L = { sms_deleted_again: 'عملية حذفتها قبل', sms_duplicate: 'تكرار محتمل مع عملية موجودة', sms_no_account: 'الحساب غير معروف', sms_unparsed: 'ما قدرت أقرأ الرسالة', sms_unknown: 'رسالة غير معروفة النوع', sms_same_content: 'نفس نص رسالة سابقة', sms_partial: 'عملية ناقصة الحقول', sms_no_date: 'رسالة بدون تاريخ', sms_date_shape: 'ترتيب التاريخ' };
const SHAPE_TITLE = { new: 'شكل تاريخ جديد', legacy: 'تاريخ رسائل سابقة', future: 'تاريخ في المستقبل', order_invalid: 'التاريخ ما ينطبق على الترتيب المحفوظ' };
const MSG_STATUS_L = { tx: 'عملية', merged: 'اندمجت', review: 'مراجعة', informational: 'معلومات', discarded: 'رمز تحقق', ignored: 'متجاهلة', manual: 'أدخلت يدويًا', deleted: 'محذوفة' };
const CLS_L = { financial: 'مالية', otp: 'رمز تحقق', informational: 'معلومات', unknown: 'غير معروفة' };
const FIELD_L = { amount: 'المبلغ', merchant: 'التاجر', beneficiary: 'المستفيد', counterparty: 'المرسل', cardLast4: 'آخر 4 للبطاقة', accountLast4: 'آخر 4 للحساب', balance: 'الرصيد', fee: 'الرسوم', direction: 'الاتجاه', date: 'التاريخ', time: 'الوقت', method: 'وسيلة الدفع' };
const FAMILY_DIR = { sms_purchase: 'out', sms_refund: 'in', sms_transfer_out: 'out', sms_transfer_in: 'in', salary: 'in', sms_cash_withdrawal: 'out', sms_cash_deposit: 'in', bill_payment: 'out', card_payment: 'out', sms_debit: 'out', sms_credit: 'in' };
W.msg = ['رسالة واحدة', 'رسالتان', 'رسائل', 'رسالة'];

/* ---------- معالجة الرسائل ---------- */
// الحفظ في IndexedDB يصير داخل persist؛ إذا فشل يرمي خطأ وما يوصل للـ ack
async function processSms(msgs, label) {
  const plan = await E.prepareSms(store(), msgs);
  E.commitSms(store(), plan); E.detectRecurring(store());
  await persist(label, { source: 'user' });
  return plan;
}
function smsSummaryText(s) {
  const p = [];
  if (s.tx) p.push(`${s.tx === 1 ? 'عملية جديدة' : s.tx + ' عمليات جديدة'}`);
  if (s.merged) p.push(`${s.merged} اندمجت مع الموجود`);
  if (s.review) p.push(`${s.review} للمراجعة`);
  if (s.informational) p.push(`${s.informational} معلومات`);
  if (s.discarded) p.push(`${s.discarded} رمز تحقق ما انحفظ`);
  if (s.already) p.push(`${s.already} سبق استلامها`);
  return p.join('، ') || 'ما فيه جديد';
}
// جلب الصندوق: pull ← معالجة وحفظ محلي ← ack (بعد نجاح الحفظ فقط). المحفوظ سابقًا: ack فقط
async function fetchInbox(manual) {
  const cfg = settings().inbox || {};
  if (!cfg.url || !cfg.token) { if (manual) toast('حط رابط الصندوق والمفتاح في الإعدادات'); return; }
  if (S.inboxBusy) return;
  if (!navigator.onLine) { if (manual) toast('الجهاز غير متصل بالإنترنت'); return; }
  S.inboxBusy = true; if (manual) toast('جاري جلب الرسائل…', 15000);
  try {
    const r = await Inbox.pull(cfg);
    if (!r || !r.ok) throw new Error(Inbox.statusText(r && r.status) || 'تعذر السحب');
    const msgs = (r.messages || []).map(m => ({ id: m.id, text: m.text, sender: m.sender, receivedAt: m.receivedAt, source: 'inbox', ids: m.ids || [], suggestedCity: m.suggestedCity || null, citySource: m.citySource || null, cityCapturedAt: m.cityCapturedAt || null }));
    const s = settings(); s.inbox.lastFetchAt = new Date().toISOString(); store().put('settings', s);
    // رسائل انحفظت قبل وما وصلنا تأكيد حذفها من الصندوق (مثلًا انقفل التطبيق لحظة التأكيد): نعيد التأكيد
    const pulled = new Set(msgs.map(m => m.id));
    const unconfirmed = store().all('messages').filter(m => m.source === 'inbox' && !m.ackedAt && !pulled.has(m.id)).map(m => m.id).slice(0, 150);
    let plan = null;
    if (msgs.length) plan = await processSms(msgs, 'جلب ' + cnt(msgs.length, 'msg'));
    else await persist(null, { noStep: true });
    // 1.5.1: رسالة محفوظة عندنا رجعت ومعها مدينة ما كانت عندنا (وصلت بعد السحب): تنربط كاقتراح، وتنحفظ قبل تأكيد الرسالة
    let cityDone = 0;
    msgs.forEach(m => { if (m.suggestedCity && E.applyCityUpdate(store(), m) === 'applied') cityDone++; });
    if (cityDone) await persist(null, { noStep: true });
    const ackIds = msgs.map(m => m.id).concat(unconfirmed);
    if (ackIds.length) {
      try {
        const a = await Inbox.ack(cfg, ackIds);
        if (a && a.ok) {
          // المسحوبة الحين: تأكيد الصندوق فقط. القديمة غير المؤكدة: ما عادت في الصندوق (انحذفت أو ما لها أثر)، فتنعلّم مؤكدة
          const again = new Set(unconfirmed);
          const done = (a.acked || []).concat((a.unknown || []).filter(x => again.has(x)));
          if (E.markAcked(store(), done)) await persist(null, { noStep: true });
        }
      } catch (e) { /* الـ ack يتكرر في الجلب القادم بدون إعادة معالجة */ }
    }
    // 1.5.1: مدن وصلت بعد ما انسحبت رسائلها. تنربط بـ requestId كاقتراح فقط، وتأكيد استلامها بعد نجاح الحفظ المحلي فقط
    cityDone += await applyCityUpdates(cfg, r.cityUpdates);
    S.inboxError = null;
    if (!plan) { if (manual) { $('toast').classList.add('hide'); toast(cityDone ? (cityDone === 1 ? 'وصلت مدينة لعملية سابقة' : `وصلت مدن لـ ${cityDone} عمليات سابقة`) : 'ما فيه رسائل جديدة'); } if (['settings', 'messages'].includes(S.view) || (cityDone && S.view !== 'add')) render(); return; }
    render();
    if (!showNewTxs(plan) && (manual || plan.smsSummary.review || plan.smsSummary.merged)) toast('الرسائل: ' + smsSummaryText(plan.smsSummary), 6000);
    else $('toast').classList.add('hide');
  } catch (e) { S.inboxError = e.message || String(e); if (manual) toast(S.inboxError); }
  finally { S.inboxBusy = false; }
}
async function applyCityUpdates(cfg, list) {
  if (!Array.isArray(list) || !list.length) return 0;
  const st = store(), done = []; let added = 0;
  list.slice(0, 200).forEach(u => { const res = E.applyCityUpdate(st, u); if (res === 'applied') added++; if (res !== 'unknown') done.push(u.id); }); // رسالة مو عندنا: ما نأكد، ويتنظف من الصندوق بعد أيام
  if (!done.length) return 0;
  await persist(null, { noStep: true }); // إذا فشل الحفظ يرمي خطأ، فما يتأكد شي
  try { await Inbox.ackCity(cfg, done); } catch (e) { /* يتكرر في الجلب الجاي، والربط ما يتكرر لأنه اقتراح موجود */ }
  return added;
}
function autoFetch() {
  const cfg = settings().inbox || {};
  if (!cfg.autoFetch || !cfg.url || !cfg.token) return;
  const last = cfg.lastFetchAt ? Date.parse(cfg.lastFetchAt) : 0;
  if (Date.now() - last < 60000) return;
  fetchInbox(false);
}

function inboxCard() {
  const c = settings().inbox || {};
  return `<div class="card" id="inboxCard"><h2>صندوق الرسائل (استقبال تلقائي)</h2>
    <p class="small muted">رابط نشر Google Apps Script والمفتاح السري. المفتاح ينحفظ على هذا الجهاز فقط وما يدخل النسخة الاحتياطية.</p>
    <label class="f">رابط /exec</label><input type="text" id="ib_url" dir="ltr" inputmode="url" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url || '')}">
    <label class="f">المفتاح السري</label><input type="text" id="ib_token" dir="ltr" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(c.token || '')}">
    <label class="f"><input type="checkbox" id="ib_auto" ${c.autoFetch !== false ? 'checked' : ''}> اجلب الرسائل تلقائيًا لما أفتح التطبيق</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveInbox">حفظ</button><button class="btn" data-action="fetchInbox">جلب الآن</button><button class="btn" data-action="inboxTest">اختبار الاتصال</button></div>
    <p class="small muted" style="margin-top:8px">${c.lastFetchAt ? 'آخر جلب: ' + fdt(c.lastFetchAt, true) : 'ما صار جلب للحين'}${S.inboxError ? ` · <span class="neg">${esc(S.inboxError)}</span>` : ''}</p>
    <div class="ibres" id="ib_res"></div></div>`;
}
/* ---------- مركز المراجعة ---------- */
const openReviews = () => store().all('reviews').filter(r => r.status === 'open').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
function dataIssues() {
  const st = store(), items = [];
  const unk = st.all('transactions').filter(t => t.transactionType === 'Unknown');
  if (unk.length) items.push({ t: `${cnt(unk.length, 'op')} نوعها غير معروف${unk.some(t => t.direction === 'out') ? ' (الخارجة منها داخلة في صرفك)' : ''}`, a: `<a data-action="issueTxs" data-kind="unclassified_all">صنّفها</a>` });
  const tmp = st.all('transactions').filter(t => t.classificationStatus === 'temporary');
  if (tmp.length) items.push({ t: `${cnt(tmp.length, 'tr')} لأشخاص بتصنيف مؤقت`, a: `<a data-action="issueTxs" data-kind="temporary">حدد تصنيفها</a>` });
  const unc = st.all('transactions').filter(t => E.spendParts(st, t).some(p => p.cat === '__none'));
  if (unc.length) items.push({ t: `${cnt(unc.length, 'op')} صرف بدون تصنيف`, a: `<a data-action="issueTxs" data-kind="uncategorized">صنّفها</a>` });
  const oldCash = st.all('transactions').filter(isOldCash);
  if (oldCash.length && st.all('transactions').some(t => t.transactionType === 'CashWithdrawal')) items.push({ t: `${cnt(oldCash.length, 'op')} مصروف نقدي مسجل قبل التحديث. السحب صار ينحسب صرف، فإذا كانت من سحب انقلها له عشان ما تنحسب مرتين`, a: `<a data-action="issueTxs" data-kind="oldcash">راجعها</a>` });
  const ru = st.all('transactions').filter(isRoundUpUnknown).length;
  if (ru) items.push({ t: `وجهة التقريب غير محددة (${cnt(ru, 'op')})`, a: `<a data-action="setRoundUp">حددها</a>` });
  st.all('instruments').filter(i => i.instrumentOwner === 'unknown').forEach(i => items.push({ t: `مالك «${esc(i.label)}» غير محدد`, a: `<a data-action="editInstrument" data-id="${i.id}">حدده</a>` }));
  st.all('accounts').filter(a => a.type === 'unknown' && !a.autoCreated).forEach(a => items.push({ t: `نوع «${esc(a.name)}» غير محدد`, a: `<a data-action="editAccount" data-id="${a.id}">حدده</a>` }));
  const cp = st.all('transactions').filter(isCardUnmatched);
  if (cp.length) items.push({ t: `${cnt(cp.length, 'op')} سداد بطاقة غير مطابق`, a: `<a data-action="issueTxs" data-kind="card_unmatched">اعرضها</a>` });
  st.all('imports').filter(i => i.balanceValidated === false).forEach(i => items.push({ t: `كشف «${esc(i.filename)}» الرصيد فيه ما تطابق`, a: `<a data-action="go" data-view="imports">سجل الاستيراد</a>` }));
  return items;
}
function reviewBadge() { const n = openReviews().length; return n ? `<span class="cnt">${n}</span>` : ''; }
// نص الرسالة: التاريخ المفصول بشرطات بعد كلمة عربية يقلبه اتجاه الكتابة (26-09-28 يظهر 28-09-26)،
// فنعزله باتجاه يسار-يمين عشان يظهر بترتيبه الحقيقي
function rawHtml(text) { return esc(text || '').replace(/\d{1,4}(?:[-.]\d{1,4}){2}/g, x => `<bdi dir="ltr">${x}</bdi>`); }
function shapeSampleHtml(sample, token) {
  sample = String(sample || ''); const i = token ? sample.indexOf(token) : -1;
  return i < 0 ? rawHtml(sample) : `${rawHtml(sample.slice(0, i))}<bdi dir="ltr" class="num">${esc(token)}</bdi>${rawHtml(sample.slice(i + token.length))}`;
}
function msgBox(m) {
  if (!m) return '';
  return `<div class="small muted" style="margin:6px 0 4px">${esc(m.sender || (m.source === 'paste' ? 'لصق' : 'صندوق'))} · ${m.receivedAt ? fdt(m.receivedAt, true) : ''}</div><div class="raw">${rawHtml(m.text || '')}</div>`;
}
function txMini(t) {
  if (!t) return '<div class="muted small">—</div>';
  return `<b>${esc(txTitle(t))}</b><br>${fdate(t.transactionDate, true)}${t.time ? ' ' + ftime(t.time) : ''}<br>${num(t.grossAmount)} <span class="small muted">${esc((t.sourceLinks || []).map(s => SRC_L[s.sourceType] || s.sourceType).join('، '))}</span>`;
}
function reviewCard(r) {
  const st = store(), m = st.get('messages', r.messageId);
  let body = '', btns = '';
  switch (r.kind) {
    case 'sms_duplicate': {
      const ex = st.get('transactions', r.existingId);
      body = `<div class="small muted">النقاط ${r.score}${r.reason === 'tie' ? ' · أكثر من مرشح بنفس الدرجة' : ''}</div><div class="cmp2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px;margin:8px 0"><div class="kvbox"><div class="small muted">من الرسالة</div>${txMini(r.heldTx)}</div><div class="kvbox"><div class="small muted">الموجودة</div>${txMini(ex)}</div></div>`;
      btns = `<button class="btn p" data-action="rvDup" data-id="${r.id}" data-v="merge">نفس العملية (دمج)</button><button class="btn" data-action="rvDup" data-id="${r.id}" data-v="separate">عمليتان منفصلتان</button>`;
      break;
    }
    case 'sms_no_account': {
      const accs = st.all('accounts').filter(a => a.isMine !== false && a.type !== 'cash');
      body = `<div class="small">ما عرفت أي حساب أو بطاقة تخص هذي الرسالة${r.info && (r.info.instrumentLast4 || r.info.accountLast4) ? ` (آخر أرقام: <span class="num">${esc(r.info.instrumentLast4 || r.info.accountLast4)}</span>)` : ''}. المبلغ ${num(r.info ? r.info.grossAmount : 0)}.</div>
        <label class="f">احفظها على</label><select id="rvacc_${r.id}">${accs.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>`;
      btns = `<button class="btn p" data-action="rvAcc" data-id="${r.id}">احفظها</button><button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">تجاهل</button>`;
      break;
    }
    case 'sms_unparsed': body = `<div class="small">ناقص: ${(r.missing || []).map(k => FIELD_L[k] || k).join('، ') || '—'}. علّمني الصيغة مرة وحدة، والرسائل الجاية من نفس الصيغة تنقرأ تلقائيًا.</div>`;
      btns = `<button class="btn p" data-action="teachSms" data-id="${r.id}">علّم الصيغة</button><button class="btn" data-action="rvManual" data-id="${r.id}">أدخلها يدويًا</button><button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="informational">معلومات فقط</button>`; break;
    case 'sms_unknown': body = `<div class="small">${esc(r.reason || 'ما تعرفت على نوعها')}. وش نوعها؟</div>`;
      btns = `<button class="btn p" data-action="teachSms" data-id="${r.id}">مالية: علّم الصيغة</button><button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="informational">معلومات فقط</button><button class="btn r" data-action="rvMsg" data-id="${r.id}" data-v="otp">رسالة رمز (احذف نصها)</button>`; break;
    case 'sms_same_content': { const o = st.get('messages', r.otherMessageId); body = `<div class="small">نفس نص رسالة سابقة${o && o.receivedAt ? ` (${fdate(ldate(o.receivedAt), true)})` : ''}. ممكن تكون نفس الرسالة وصلت مرتين، أو عمليتين متطابقتين.</div>`;
      btns = `<button class="btn p" data-action="rvSame" data-id="${r.id}">عمليتان مختلفتان: عالجها</button><button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">مكررة: تجاهلها</button>`; break; }
    case 'sms_no_date': body = `<div class="small">الرسالة ما فيها تاريخ واضح، وما أعتمد وقت اللصق لأنها ممكن تكون رسالة قديمة. المبلغ ${num(r.info ? r.info.grossAmount : 0)}.</div>
        <label class="f">تاريخ العملية</label><input type="date" id="rvdate_${r.id}" max="${E.todayISO()}">`;
      btns = `<button class="btn p" data-action="rvDate" data-id="${r.id}">احفظها بهذا التاريخ</button><button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">تجاهل</button>`; break;
    case 'sms_date_shape': {
      const OL = SR().ORDER_L, n = st.all('messages').filter(m => m.dateShape === r.sig && !m.userDate && m.txId).length;
      const why = r.reason === 'new' ? `أول مرة يجي هذا الشكل من التاريخ: <b>${shapeSampleHtml(r.sample, r.token)}</b>. اختر التاريخ الصحيح لهذي الرسالة، والتطبيق يعتمد ترتيبه لكل رسالة بنفس الشكل.`
        : r.reason === 'legacy' ? `رسائل انحفظت قبل هذا التحديث بهذا الشكل من التاريخ: <b>${shapeSampleHtml(r.sample, r.token)}</b>${n ? ` (${cnt(n, 'msg')})` : ''}. اختر التاريخ الصحيح لهذي الرسالة، والتطبيق يصحح تاريخ عملياتها بنفس الترتيب (ما عدا اللي حددت تاريخها بنفسك).`
        : r.reason === 'future' ? `التاريخ اللي طلع من هذي الرسالة بعد وقت وصولها. اختر التاريخ الصحيح لها هي بس، والترتيب المحفوظ ما يتغير.`
        : `الترتيب المحفوظ لهذا الشكل ما يعطي تاريخ صحيح لهذي الرسالة. اختر تاريخها هي بس، والترتيب المحفوظ ما يتغير.`;
      body = `<div class="small">${why}${r.info && r.info.grossAmount ? ` المبلغ ${num(r.info.grossAmount)}.` : ''}</div>
        <div class="kvbox" style="margin-top:8px">${(r.candidates || []).map((c, i) => `<label class="f" style="margin:6px 0"><input type="radio" name="shp_${r.id}" value="${c.order}" ${i === 0 && (r.candidates || []).length === 1 ? 'checked' : ''}> <b>${fdate(c.date, true)}</b> <span class="small muted">· ${OL[c.order]}</span></label>`).join('')}</div>
        ${r.reason === 'future' || r.reason === 'order_invalid' ? `<label class="f">أو حدد التاريخ بنفسك</label><input type="date" id="rvdate_${r.id}" max="${E.todayISO()}">` : ''}`;
      btns = `<button class="btn p" data-action="rvShape" data-id="${r.id}">اعتمد</button>${r.reason !== 'legacy' ? `<button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">تجاهل</button>` : ''}`;
      break;
    }
    case 'sms_deleted_again': { const d = st.get('deletedTxs', r.deletedId); body = `<div class="small">هذي الرسالة لعملية حذفتها قبل${d ? `: <b>${esc(txTitle(d))}</b> ${fmt(d.grossAmount)} · ${fdate(d.transactionDate, true)}` : ''}. ترجعها؟</div>`;
      btns = `<button class="btn p" data-action="rvDel" data-id="${r.id}" data-v="restore">رجّعها</button><button class="btn" data-action="rvDel" data-id="${r.id}" data-v="keep">خلها محذوفة</button>`; break; }
    case 'sms_partial': { const t = st.get('transactions', r.txId); body = `<div class="small">انحفظت العملية، لكن ناقص: ${(r.missing || []).map(k => FIELD_L[k] || k).join('، ')}.</div><div class="kvbox" style="margin-top:6px;font-size:12.5px">${txMini(t)}</div>`;
      btns = `<button class="btn p" data-action="teachSms" data-id="${r.id}">علّم الصيغة وأكملها</button>${t ? `<button class="btn" data-action="openTx" data-id="${t.id}">افتح العملية</button>` : ''}<button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">تم</button>`; break; }
  }
  const title = r.kind === 'sms_date_shape' ? (SHAPE_TITLE[r.reason] || REVIEW_L[r.kind]) : (REVIEW_L[r.kind] || r.kind);
  return `<div class="rv"><div class="rvh"><b>${title}</b><span class="sp"></span><span class="small muted">${fdate(ldate(r.createdAt))}</span></div>${msgBox(m)}${body}<div class="btns" style="margin-top:10px">${btns}</div></div>`;
}
function vReviewCenter() {
  const rs = openReviews(), issues = dataIssues();
  let h = `<div class="card"><h2>رسائل تحتاج قرارك <span class="sp"></span><span class="muted">${rs.length}</span></h2>${rs.length ? rs.map(reviewCard).join('') : '<div class="muted">ما فيه رسائل معلّقة.</div>'}</div>`;
  h += `<div class="card"><h2>بيانات تحتاج قرارك <span class="sp"></span><span class="muted">${issues.length}</span></h2>${issues.length ? `<div class="list">${issues.map(i => `<div class="it" style="cursor:default"><div class="m"><div class="t" style="font-weight:600">${i.t}</div></div><div class="small">${i.a}</div></div>`).join('')}</div>` : '<div class="muted">كل شي واضح.</div>'}</div>`;
  return h;
}

/* ---------- تعليم صيغة رسالة ---------- */
function tokenize(text) { const out = []; const re = /[^\s]+/g; let m; while ((m = re.exec(text))) { let s = m.index, e = s + m[0].length; while (e > s && /[،,.:;؛)\]]/.test(text[e - 1]) && e - s > 1) e--; while (s < e && /[(\[:]/.test(text[s]) && e - s > 1) s++; out.push({ s, e, line: text.slice(0, m.index).split('\n').length - 1 }); } return out; }
function teachFieldsFor(family) {
  const base = ['amount'];
  if (family === 'sms_transfer_out') base.push('beneficiary'); else if (family === 'sms_transfer_in' || family === 'salary') base.push('counterparty'); else if (!['sms_cash_withdrawal', 'sms_cash_deposit', 'card_payment'].includes(family)) base.push('merchant');
  const extra = ['sms_transfer_out', 'sms_transfer_in', 'salary', 'sms_cash_withdrawal', 'sms_cash_deposit'].includes(family) ? [] : ['method'];
  // التاريخ والوقت ووسيلة الدفع اختيارية: إذا ما تحددت، القارئ العام يتعرف عليها
  return base.concat(['cardLast4', 'accountLast4', 'balance', 'fee', 'date', 'time'], extra);
}
const FIELD_COLOR = { amount: PAL.green, merchant: PAL.blue, beneficiary: PAL.blue, counterparty: PAL.blue, cardLast4: PAL.violet, accountLast4: PAL.orange, balance: PAL.aqua, fee: PAL.red, date: PAL.yellow, time: PAL.magenta, method: PAL.gray };
function vTeachSms() {
  const T = S.teachSms; if (!T) return `<div class="card empty">لا يوجد.</div>`;
  const fields = teachFieldsFor(T.family);
  const val = (k) => T.ranges[k] ? T.text.slice(T.tokens[T.ranges[k][0]].s, T.tokens[T.ranges[k][1]].e) : '';
  const owner = (i) => Object.keys(T.ranges).find(k => T.ranges[k] && i >= T.ranges[k][0] && i <= T.ranges[k][1]);
  let lines = [], cur = -1;
  T.tokens.forEach((tk, i) => { if (tk.line !== cur) { lines.push([]); cur = tk.line; } const o = owner(i); lines[lines.length - 1].push(`<button class="tok ${o ? 'on' : ''}" data-action="tokTap" data-i="${i}" style="${o ? `background:${tint(FIELD_COLOR[o], '2E')};border-color:${FIELD_COLOR[o]}` : ''}">${esc(T.text.slice(tk.s, tk.e))}</button>`); });
  return `<div class="card"><h2>علّمني صيغة هذي الرسالة</h2>
    <p class="small muted">١) اختر نوع العملية. ٢) اختر الحقل تحت، ثم اضغط على الكلمة أو الكلمات اللي تمثله في الرسالة. المبلغ مطلوب، والباقي إذا موجود. التاريخ والوقت ووسيلة الدفع اختيارية: إذا ما حددتها، التطبيق يتعرف عليها بنفسه.</p>
    <label class="f">نوع العملية</label><select id="ts_family" data-change="teachFamily">${Object.entries(E.SMS_FAMILY_L).map(([k, v]) => `<option value="${k}" ${k === T.family ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label class="f">اسم البنك (للتعريف)</label><input type="text" id="ts_bank" value="${esc(T.bank || '')}">
    <div class="fchips">${fields.map(k => `<button class="fchip ${T.active === k ? 'on' : ''}" data-action="teachField" data-k="${k}" style="--c:${FIELD_COLOR[k]}"><span class="dot"></span>${FIELD_L[k]}${k === 'amount' ? ' *' : ''}<span class="v">${esc(val(k))}</span></button>`).join('')}</div>
    <div class="toks">${lines.map(l => `<div class="tline">${l.join('')}</div>`).join('')}</div>
    ${teachDateBox(T, val('date'))}
    ${T.replaceId ? `<label class="f"><input type="checkbox" id="ts_replace" checked> حدّث الصيغة السابقة لهذا البنك (الصيغة تغيرت)</label>` : ''}
    <div class="btns" style="margin-top:14px"><button class="btn g" data-action="teachSmsSave">حفظ الصيغة ومعالجة الرسائل</button><button class="btn" data-action="teachSmsCancel">إلغاء</button></div></div>`;
}

// التاريخ الملتبس (مثل 05/09/26): المستخدم يختار الصحيح مرة وحدة، وينحفظ ترتيبه مع الصيغة
function teachDateBox(T, v) {
  if (!T.ranges.date) return '';
  const ch = SR().dateChoices(v);
  if (!ch.length) return `<div class="banner w" style="margin-top:10px">ما قدرت أقرأ تاريخ من الجزء المحدد.</div>`;
  if (ch.length === 1) { T.dateOrder = ch[0].o; return ''; }
  return `<div class="kvbox" style="margin-top:10px"><b class="small">وش التاريخ الصحيح لهذي الرسالة؟</b>${ch.map(c => `<label class="f" style="margin:6px 0 0"><input type="radio" name="ts_dord" value="${c.o}" data-change="teachDateOrder" ${T.dateOrder === c.o ? 'checked' : ''}> ${fdate(c.date, true)}</label>`).join('')}</div>`;
}

/* ---------- سجل الرسائل ---------- */
function vMessages() {
  const list = store().all('messages').sort((a, b) => String(b.processedAt || '').localeCompare(String(a.processedAt || ''))).slice(0, 200);
  const cfg = settings().inbox || {};
  let h = `<div class="card"><h2>الرسائل البنكية <span class="sp"></span>${cfg.url ? `<button class="btn" data-action="fetchInbox">جلب الآن</button>` : ''}</h2><p class="small muted">آخر 200 رسالة انعالجت. رسائل الرموز ما ينحفظ نصها. ${cfg.lastFetchAt ? 'آخر جلب: ' + fdt(cfg.lastFetchAt, true) : ''}</p>`;
  h += list.length ? `<div class="list">${list.map(m => `<div class="it" data-action="openMsg" data-id="${m.id}"><div class="m"><div class="t small" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((m.text || '(نص محذوف)').replace(/\n/g, ' · '))}</div><div class="badges"><span class="b ${m.status === 'review' ? 'w' : m.status === 'tx' || m.status === 'merged' ? 'g' : 'n'}">${MSG_STATUS_L[m.status] || m.status}</span><span class="b n">${CLS_L[m.cls] || ''}</span>${m.parser ? `<span class="b n">${m.parser === 'template' ? 'صيغة متعلّمة' : m.parser === 'alinma' ? 'صيغة الإنماء' : 'قارئ عام'}</span>` : ''}<span class="b n">${m.source === 'inbox' ? 'صندوق' : 'لصق'}</span>${m.source === 'inbox' && !m.ackedAt ? '<span class="b w">لم يتأكد الاستلام</span>' : ''}</div></div></div>`).join('')}</div>` : '<div class="muted">ما فيه رسائل للحين.</div>';
  return h + `</div>`;
}

/* ---------- سجل التعديلات ---------- */
function vAudit() {
  const st = store(), u = st.undoStack[st.undoStack.length - 1], r = st.redoStack[st.redoStack.length - 1];
  const list = st.all('auditLog').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  const SRC = { user: '', undo: 'تراجع', redo: 'إعادة' };
  const TBL = { transactions: 'عملية', merchants: 'تاجر', beneficiaries: 'مستفيد', accounts: 'حساب', instruments: 'أداة', imports: 'استيراد', messages: 'رسالة', reviews: 'مراجعة', rules: 'قاعدة', limits: 'حد', templates: 'صيغة', settings: 'إعدادات', categories: 'تصنيف' };
  const summ = (c) => Object.entries(c || {}).map(([n, x]) => [x.created ? `+${x.created}` : '', x.updated ? `✎${x.updated}` : '', x.removed ? `−${x.removed}` : ''].filter(Boolean).join(' ') + ' ' + (TBL[n] || n)).join(' · ');
  let h = `<div class="card"><h2>التراجع والإعادة</h2><div class="btns"><button class="btn" data-action="undo" ${u ? '' : 'disabled'}>↶ تراجع${u ? ': ' + esc(u.label) : ''}</button><button class="btn" data-action="redo" ${r ? '' : 'disabled'}>↷ إعادة${r ? ': ' + esc(r.label) : ''}</button></div>
    <p class="small muted" style="margin-top:8px">آخر 30 خطوة في هذي الجلسة. تنمسح لما يتسكّر التطبيق، والسجل تحت يبقى.</p></div>`;
  h += `<div class="card"><h2>سجل التعديلات <span class="sp"></span><span class="muted">${st.all('auditLog').length}</span></h2>${list.length ? `<div class="list">${list.map(e => `<div class="it" style="cursor:default"><div class="m"><div class="t">${esc(e.label)} ${SRC[e.source] ? `<span class="b n">${SRC[e.source]}</span>` : ''}</div><div class="s">${fdt(e.at, true)} · ${esc(summ(e.counts))}</div>${(e.items || []).length ? `<div class="s">${e.items.slice(0, 3).map(i => esc(i.text) + ' ' + fmt(i.amount)).join('، ')}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="muted">فاضي.</div>'}</div>`;
  return h;
}

/* ---------- حدود الصرف ---------- */
function limitBars(ls) {
  return ls.map(l => { const w = Math.min(100, l.pct), c = l.level === 'over' ? 'var(--neg)' : l.level === 'warn' ? 'var(--warn)' : 'var(--pos)';
    const pcx = l.scope === 'productCategory' ? store().get('productCategories', l.productCategoryId) : null;
    const name = l.scope === 'total' ? 'الإنفاق الكلي' : l.scope === 'productCategory' ? 'منتجات: ' + (pcx ? pcx.name : '—') : bucketName(l.categoryId), u = l.scope === 'total' ? { color: PAL.blue, icon: 'wallet' } : l.scope === 'productCategory' ? pcatUi(pcx) : catUi(l.categoryId);
    return `<div class="lim" data-action="editLimit" data-id="${l.id}">${icCircle(u, 's')}<div class="m"><div class="lt"><b>${esc(name)}</b><span class="sp"></span><span class="num small">${fmt(l.spent)} / ${fmt(l.amount)}</span></div><div class="track"><div style="width:${w}%;background:${c}"></div></div><div class="small ${l.level === 'over' ? 'neg' : l.level === 'warn' ? 'warn-t' : 'muted'}">${l.level === 'over' ? `تجاوزت الحد بـ ${fmt(-l.remaining)}` : `باقي ${fmt(l.remaining)} · ${l.pct}%`}</div></div></div>`; }).join('');
}
function currentLimits() { const cur = E.currentCycle(store()); return cur ? E.limitsStatus(store(), cur) : []; }
function vLimits() {
  const cur = E.currentCycle(store()), ls = currentLimits(), s = settings();
  let h = `<div class="card"><h2>حدود الصرف <span class="sp"></span><button class="btn p" data-action="editLimit">+ حد</button></h2><p class="small muted">على الدورة الحالية ${cur ? '(' + fperiod(cur) + ')' : ''}. المصروف = نفس رقم «وين راحت الدراهم» للتصنيف، أو الإنفاق الحقيقي كله للحد الكلي.</p>${ls.length ? limitBars(ls) : '<div class="muted">ما حطيت حدود للحين.</div>'}</div>`;
  h += `<div class="card"><h2>التنبيه</h2><label class="f">نبهني لما أوصل (٪ من الحد)</label><div class="btns" style="flex-wrap:nowrap"><input type="number" id="lim_pct" min="10" max="100" value="${s.limitAlertPct || 80}" style="flex:1"><button class="btn" data-action="saveLimitPct">حفظ</button></div><p class="small muted">وعند 100% يطلع تنبيه تجاوز. التنبيهات داخل التطبيق فقط.</p></div>`;
  return h;
}
function sheetLimit(id) {
  const l = id ? store().get('limits', id) : { scope: 'category', categoryId: null, amount: '', active: true };
  openSheet(`<h3>${id ? 'تعديل الحد' : 'حد جديد'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <div class="seg"><button class="${l.scope === 'category' || !l.scope ? 'on' : ''}" data-action="limScope" data-v="category">تصنيف</button><button class="${l.scope === 'total' ? 'on' : ''}" data-action="limScope" data-v="total">الإنفاق الكلي</button><button class="${l.scope === 'productCategory' ? 'on' : ''}" data-action="limScope" data-v="productCategory">تصنيف منتجات</button></div>
    <input type="hidden" id="lim_scope" value="${l.scope || 'category'}">
    <div id="lim_catwrap" class="${l.scope === 'total' || l.scope === 'productCategory' ? 'hide' : ''}"><label class="f">التصنيف</label>${catField(l.categoryId, null)}</div>
    <div id="lim_pcwrap" class="${l.scope === 'productCategory' ? '' : 'hide'}"><label class="f">تصنيف المنتجات</label><select id="lim_pc">${pcatOptions(l.productCategoryId, false)}</select><p class="small muted">المصروف = صافي أغراض هذا التصنيف في الدورة (تحليل المنتجات، منفصل عن الإنفاق المالي).</p></div>
    <label class="f">الحد للدورة</label><input type="text" inputmode="decimal" id="lim_amt" value="${l.amount || ''}" placeholder="0.00">
    <label class="f"><input type="checkbox" id="lim_on" ${l.active !== false ? 'checked' : ''}> مفعّل</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveLimit" data-id="${id || ''}">حفظ</button>${id ? `<button class="btn r" data-action="delLimit" data-id="${id}">حذف</button>` : ''}</div>`);
}

/* ---------- القواعد ---------- */
function ruleSummary(r) {
  const st = store(), w = r.when || {}, th = r.then || {}, c = [], a = [];
  if (w.text) c.push(`النص فيه «${esc(w.text)}»`);
  if (w.merchantId) c.push('التاجر: ' + esc((st.get('merchants', w.merchantId) || {}).name || '؟'));
  if (w.beneficiaryId) c.push('المستفيد: ' + esc((st.get('beneficiaries', w.beneficiaryId) || {}).name || '؟'));
  if (w.direction) c.push(w.direction === 'out' ? 'خارج' : 'داخل');
  if (w.amountMin) c.push('من ' + fmt(+w.amountMin)); if (w.amountMax) c.push('إلى ' + fmt(+w.amountMax));
  if (w.accountId) c.push('الحساب: ' + esc((accOf(w.accountId) || {}).name || '؟'));
  if (w.source) c.push('المصدر: ' + (SRC_L[w.source] || w.source));
  if (th.categoryId) a.push('التصنيف: ' + esc(catPath(th.categoryId, th.subcategoryId)));
  if (th.type) a.push('النوع: ' + TYPE_L[th.type]);
  if (th.recurrenceType) a.push(th.recurrenceType === 'recurring' ? 'متكرر' : 'متغير');
  if (th.necessityType) a.push(th.necessityType === 'essential' ? 'ضروري' : 'اختياري');
  return { c: c.join(' و ') || '—', a: a.join('، ') || '—' };
}
function vRules() {
  const rules = store().all('rules').filter(r => r.when).sort((a, b) => (a.order || 0) - (b.order || 0));
  return `<div class="card"><h2>القواعد <span class="sp"></span><button class="btn p" data-action="editRule">+ قاعدة</button></h2>
    <p class="small muted">القاعدة تنطبق على العمليات الجديدة من الكشوف والرسائل. الأولوية: تعديلك لعملية وحدة ← القاعدة ← التاجر أو المستفيد ← التصنيف. إذا انطبقت أكثر من قاعدة، الأعلى في القائمة تكسب.</p>
    ${rules.length ? `<div class="list">${rules.map((r, i) => { const s = ruleSummary(r); return `<div class="it"><div class="m" data-action="editRule" data-id="${r.id}"><div class="t">${esc(r.name || 'قاعدة')} ${r.enabled === false ? '<span class="b n">موقفة</span>' : ''}</div><div class="s">إذا ${s.c}</div><div class="s">← ${s.a}</div></div><div class="btns" style="flex-direction:column;gap:4px">${i ? `<button class="btn" style="min-height:30px;padding:4px 10px" data-action="ruleUp" data-id="${r.id}">▲</button>` : ''}</div></div>`; }).join('')}</div>` : '<div class="muted">ما فيه قواعد للحين. تقدر تسوي قاعدة من صفحة أي عملية أيضًا.</div>'}</div>`;
}
function sheetRule(id, pre) {
  const st = store(), r = id ? st.get('rules', id) : { name: '', enabled: true, when: Object.assign({}, pre || {}), then: {} };
  const w = r.when || {}, th = r.then || {};
  const sel = (idn, opts, cur, none) => `<select id="${idn}"><option value="">${none || 'أي'}</option>${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const used = new Set(st.all('transactions').map(t => t.merchantId).filter(Boolean));
  const merchants = st.all('merchants').filter(m => used.has(m.id) || m.id === w.merchantId).sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(m => [m.id, m.name]);
  const bens = st.all('beneficiaries').sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(b => [b.id, b.name + (b.accountLast4 ? ' …' + b.accountLast4 : '')]);
  openSheet(`<h3>${id ? 'تعديل القاعدة' : 'قاعدة جديدة'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">الاسم</label><input type="text" id="ru_name" value="${esc(r.name || '')}" placeholder="مثال: قهوة الدوام">
    <h3 style="margin-top:16px;font-size:15px">إذا (كل الشروط المختارة)</h3>
    <label class="f">النص فيه (اسم التاجر أو المستفيد أو نص الكشف/الرسالة)</label><input type="text" id="ru_text" value="${esc(w.text || '')}">
    <label class="f">التاجر</label>${sel('ru_m', merchants, w.merchantId)}
    <label class="f">المستفيد</label>${sel('ru_b', bens, w.beneficiaryId)}
    <div class="grid2"><div><label class="f">الاتجاه</label>${sel('ru_dir', [['out', 'خارج'], ['in', 'داخل']], w.direction)}</div><div><label class="f">المصدر</label>${sel('ru_src', Object.entries(SRC_L), w.source)}</div>
    <div><label class="f">المبلغ من</label><input type="text" inputmode="decimal" id="ru_min" value="${w.amountMin || ''}"></div><div><label class="f">المبلغ إلى</label><input type="text" inputmode="decimal" id="ru_max" value="${w.amountMax || ''}"></div></div>
    <label class="f">الحساب</label>${sel('ru_acc', st.all('accounts').map(a => [a.id, a.name]), w.accountId)}
    <h3 style="margin-top:16px;font-size:15px">فـ</h3>
    <label class="f">التصنيف</label>${catField(th.categoryId || null, th.subcategoryId || null)}
    <div class="grid2"><div><label class="f">النوع</label>${sel('ru_type', ['Payment', 'PersonTransfer', 'InternalTransfer', 'Refund', 'LoanToPerson'].map(x => [x, TYPE_L[x]]), th.type, 'بدون تغيير')}</div>
    <div><label class="f">التكرار</label>${sel('ru_rec', [['recurring', 'متكرر'], ['variable', 'متغير']], th.recurrenceType, 'بدون تغيير')}</div>
    <div><label class="f">الضرورة</label>${sel('ru_nec', [['essential', 'ضروري'], ['discretionary', 'اختياري']], th.necessityType, 'بدون تغيير')}</div></div>
    <label class="f"><input type="checkbox" id="ru_on" ${r.enabled !== false ? 'checked' : ''}> مفعّلة</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveRule" data-id="${id || ''}">حفظ</button><button class="btn" data-action="saveRule" data-id="${id || ''}" data-all="1">حفظ وطبّقها على السابق</button>${id ? `<button class="btn r" data-action="delRule" data-id="${id}">حذف</button>` : ''}</div>`);
}

/* ---------- التحديد والتعديل الجماعي ---------- */
function selBar() {
  if (!S.sel) return '';
  return `<div class="selbar"><div class="sc"><b>${S.sel.size}</b> محددة <a data-action="selAll">تحديد الكل</a> · <a data-action="selNone">إلغاء التحديد</a></div>
    <div class="sb">${['bulkCat:تصنيف', 'bulkType:النوع', 'bulkRN:تكرار/ضرورة', 'bulkNote:ملاحظة', 'bulkDel:حذف'].map(x => { const [a, l] = x.split(':'); return `<button class="btn ${a === 'bulkDel' ? 'r' : ''}" data-action="${a}" ${S.sel.size ? '' : 'disabled'}>${l}</button>`; }).join('')}<button class="btn" data-action="selEnd">إنهاء</button></div></div>`;
}
function refreshSel() { const box = $('txlist'); if (box) box.innerHTML = txListHtml(); const b = document.querySelector('.selbar'); if (b) b.outerHTML = selBar(); }

/* ---------- الأوامر ---------- */
const A = {
  go: (el) => { if ($('sheet').innerHTML) { S.newList = null; closeSheet(null); } go(el.dataset.view, { nav: !!el.closest('.nav') }); },
  closeSheet: () => closeSheet(null),
  sheetBg: (el, ev) => { if (ev.target !== el) return; const back = S.newList && S.sheetKind === 'tx'; closeSheet(null); if (back) renderNewList(); else if (S.sheetKind !== 'tx' || !S.newList) S.newList = null; },
  answer: (el) => closeSheet(el.dataset.val || null),
  undo: async () => { const s = store().undo(); if (!s) return toast('ما فيه خطوة للتراجع'); await persist(null, { noStep: true }); closeSheet(); render(); toast('تراجعت عن: ' + s.label); },
  redo: async () => { const s = store().redo(); if (!s) return toast('ما فيه خطوة للإعادة'); await persist(null, { noStep: true }); closeSheet(); render(); toast('أعدت: ' + s.label); },
  aliasesFirst: async () => {
    const list = $('first_aliases').value.split('\n').map(x => x.trim()).filter(Boolean);
    if (!list.length) return toast('اكتب اسمًا واحدًا على الأقل أو اضغط تخطي');
    const s = settings(); s.ownerAliases = list; store().put('settings', s); E.applyOwnerAliases(store()); await persist(); closeSheet('save');
  },
  dismissStandalone: () => { S.dismissStandalone = true; render(); },
  applyUpdate: () => { if (S.swWaiting) { S.updating = true; S.swWaiting.postMessage({ type: 'SKIP_WAITING' }); } },
  pickFile: () => $('fileInput').click(),
  pickRestore: () => $('restoreInput').click(),
  pickPeriod: () => sheetPeriod(),
  setPeriod: (el) => { S.period = E.listCycles(store())[+el.dataset.i]; S.selDay = null; S.filters.allTime = false; closeSheet(); render(); },
  setPeriodCurrent: () => { S.period = E.currentCycle(store()) || S.period; render(); },
  setPeriodPrev: () => { const c = E.currentCycle(store()); if (c) S.period = E.previousPeriod(store(), c); render(); },
  allTime: () => { S.filters.allTime = true; closeSheet(); render(); },
  setCustomPeriod: () => { const a = $('p_from').value, b = $('p_to').value; if (!a || !b || a > b) return toast('تاريخ غير صحيح'); S.period = { start: a, end: b, kind: 'custom' }; S.selDay = null; S.filters.allTime = false; closeSheet(); render(); },
  kpi: (el) => { const k = el.dataset.kind; if (el.dataset.p === 'cur') { const c = E.currentCycle(store()); if (c) S.period = c; } closeSheet(); go('txs', { filters: { kind: k } }); },
  back: () => goBack(),
  setPKind: (el) => { S.period = E.periodOf(store(), el.dataset.v, E.todayISO()) || S.period; S.selDay = null; render(); },
  pShift: (el) => { const np = E.shiftPeriod(store(), S.period, Number(el.dataset.dir)); if (np) { S.period = np; S.selDay = null; render(); } },
  selDay: (el) => { S.selDay = S.selDay === el.dataset.d ? null : el.dataset.d; render(); },
  clearSel: (el, ev) => { if (ev) ev.stopPropagation(); S.selDay = null; render(); },
  weekToSpend: (el) => { S.period = E.weekOf(E.todayISO()); S.selDay = (el && el.dataset.d) || null; go('spend'); },
  accDrill: (el) => go('txs', { filters: { kind: 'all', accountId: el.dataset.id, allTime: true } }),
  allTxs: () => go('txs', { filters: { kind: 'all', allTime: true } }),
  catDrill: (el) => go('txs', { filters: { kind: 'all', categoryId: el.dataset.cat } }),
  merchantDrill: (el) => { closeSheet(); go('txs', { filters: { kind: 'all', merchantId: el.dataset.id, allTime: true } }); },
  benDrill: (el) => { closeSheet(); go('txs', { filters: { kind: 'all', beneficiaryId: el.dataset.id, allTime: true } }); },
  setKind: (el) => { S.filters.kind = el.dataset.kind; S.txLimit = 300; render(); },
  moreTx: () => { S.txLimit = (S.txLimit || 300) + 300; render(); },
  filterSheet: () => sheetFilters(),
  applyFilters: () => { const v = (id) => $(id).value || null; S.filters = Object.assign({}, S.filters, { kind: v('f_kind') || 'all', accountId: v('f_acc'), instrumentId: v('f_ins'), method: v('f_method'), categoryId: v('f_cat'), source: v('f_src') }); closeSheet(); render(); },
  clearFilters: () => { S.filters = { kind: 'all', allTime: true }; S.q = ''; closeSheet(); render(); },
  openTx: (el) => sheetTx(el.dataset.id),
  saveTx: async (el, ev, opts) => {
    const st = store(), t = st.get('transactions', el.dataset.id); if (!t) return;
    // نقرأ كل قيم النموذج قبل أي سؤال (سؤال النطاق يستبدل النافذة)
    const form = { type: $('s_type').value, cp: $('s_cp') ? $('s_cp').value : null, hasCat: !!$('s_cat'), cat: $('s_cat') ? ($('s_cat').value || null) : null,
      sub: $('s_sub') ? ($('s_sub').value || null) : null, rec: $('s_rec') ? ($('s_rec').value || null) : null, nec: $('s_nec') ? ($('s_nec').value || null) : null, note: $('s_note') ? $('s_note').value : (t.note || ''),
      com: $('s_com') ? triVal($('s_com').value) : undefined, sav: $('s_sav') ? triVal($('s_sav').value) : undefined, rx: $('s_rx') ? $('s_rx').checked : undefined };
    const type = form.type;
    if (type !== t.transactionType) {
      let extra = {};
      if (type === 'InternalTransfer') {
        let cp = form.cp;
        if (cp === '__new') { const name = prompt('اسم الحساب الجديد (مثل: محفظة STC Bank)'); if (!name) return; cp = st.put('accounts', { id: E.uid(), name, bank: null, type: 'unknown', last4: null, isMine: true, active: true, currency: 'SAR', createdAt: new Date().toISOString() }).id; }
        extra.counterpartyAccountId = cp || null;
      }
      if (type === 'CreditCardPayment') { const cards = st.all('accounts').filter(a => a.type === 'credit_card'); extra.targetCardLast4 = cards.length === 1 ? cards[0].last4 : null; }
      E.setType(st, t.id, type, extra);
    } else if (type === 'InternalTransfer' && form.cp && form.cp !== '__new' && form.cp !== t.counterpartyAccountId) { E.setType(st, t.id, type, { counterpartyAccountId: form.cp }); }
    S.savedCount = 0;
    if (form.hasCat) {
      const cat = form.cat, sub = form.sub;
      if (cat !== (t.categoryId || null) || sub !== (t.subcategoryId || null)) {
        let scope = 'this';
        if (t.merchantId || t.beneficiaryId) { scope = await askScope(t.merchantId ? `التاجر: ${txTitle(t)}` : `المستفيد: ${txTitle(t)}`); if (!scope) { if (opts && opts.reopen) sheetTx(t.id); return; } }
        const n = E.setCategory(st, t.id, cat, sub, scope);
        if (scope !== 'this') S.savedCount = n; // «السابقة والقادمة» أو «القادمة»: العدد يظهر مع «تم الحفظ» في رسالة وحدة
      }
      const t2 = st.get('transactions', t.id);
      if ((t2.recurrenceType || null) !== form.rec || (t2.necessityType || null) !== form.nec) { t2.recurrenceType = form.rec; t2.necessityType = form.nec; st.put('transactions', t2); }
      if (form.com !== undefined && (t2.isCommitment ?? null) !== form.com) { t2.isCommitment = form.com; st.put('transactions', t2); }
      if (form.sav !== undefined && (t2.savingsEligible ?? null) !== form.sav) { t2.savingsEligible = form.sav; st.put('transactions', t2); }
    }
    if (form.rx !== undefined && form.rx !== E.isRateExcluded(st, 'transaction', t.id)) { if (form.rx) E.addRateExclusion(st, { type: 'transaction', id: t.id }); else E.removeRateExclusion(st, 'transaction', t.id); }
    const t3 = st.get('transactions', t.id); const note = form.note;
    if ((t3.note || '') !== note) { t3.note = note; t3.updatedAt = new Date().toISOString(); st.put('transactions', t3); }
    st.touch(); await persist(); render();
    if (!(opts && opts.reopen) && S.newList) renderNewList(); else closeSheet();
    const nCat = S.savedCount; S.savedCount = 0;
    toast(nCat ? `تم الحفظ، وتصنّفت ${cnt(nCat, 'op')}` : 'تم الحفظ');
    if (opts && opts.reopen) sheetTx(t.id);
  },
  txClose: () => { if (S.newList) renderNewList(); else closeSheet(null); },
  newBack: () => renderNewList(),
  newOpen: (el) => sheetTx(el.dataset.id),
  newDone: () => { S.newList = null; closeSheet(null); },
  newToReview: () => { S.newList = null; closeSheet(null); go('reviewc'); },
  cardOwner: async (el) => {
    const i = store().get('instruments', el.dataset.id); if (!i) return;
    if (el.dataset.v === 'me') { i.instrumentOwner = 'me'; i.includeInPersonalSpend = true; }
    else { i.instrumentOwner = 'other'; i.includeInPersonalSpend = false; }
    store().put('instruments', i); store().touch(); await persist('مالك بطاقة جديدة'); render();
    if (S.newList) renderNewList(); else closeSheet();
    toast(el.dataset.v === 'me' ? 'تمام، البطاقة لك' : 'تمام، عملياتها ما تنحسب في صرفك');
  },
  txKind: async (el) => {
    const id = el.dataset.id, n = E.setTransferKind(store(), id, el.dataset.v);
    await persist('نوع التحويل'); render(); afterTx(id);
    toast(n > 1 ? `تم، وتحدد ${cnt(n, 'tr')} لنفس الحساب` : 'تم');
  },
  txExclude: async (el) => {
    const id = el.dataset.id, on = el.dataset.v === '1';
    E.setExcluded(store(), id, on); await persist(on ? 'لا تحسبها في الصرف' : 'احسبها في الصرف'); render(); afterTx(id);
    toast(on ? 'ما عادت تنحسب في الصرف' : 'رجعت تنحسب في الصرف');
  },
  restoreTx: async (el) => { if (!E.restoreTx(store(), el.dataset.id)) return; await persist('إرجاع عملية محذوفة'); render(); toast('رجعت العملية'); },
  refundLink: async (el) => {
    const st = store(), rid = el.dataset.id, pid = el.dataset.p;
    const c = E.refundCandidates(st, rid).find(x => x.id === pid);
    if (c && (c.full || c.excluded)) {
      const ok = await confirmBox('تنبيه', c.excluded ? 'هذا الشراء معلّم «ما تنحسب في الصرف»، فالاسترداد المربوط فيه ما بينخصم من صرفك. تربطه برضو؟' : `هذا الشراء مسترجع كامل قبل (${fmt(c.refunded)} من ${fmt(c.amount)}). ممكن يكون هذا الاسترداد مكرر. تربطه برضو؟`, 'اربطه');
      if (!ok) return afterTx(rid);
    }
    const r = E.linkRefund(st, rid, pid); if (!r) return;
    await persist('ربط استرداد بشرائه'); render(); afterTx(rid);
    toast(r.over ? 'انربط. تنبيه: مجموع الاستردادات صار أكبر من مبلغ الشراء' : 'انربط، وينخصم من دورة الشراء');
  },
  refundUnlink: async (el) => { E.unlinkRefund(store(), el.dataset.id); await persist('فك ربط استرداد'); render(); afterTx(el.dataset.id); toast('انفك الربط'); },
  cashPartCat: async () => {
    const r = await pickCategory({ cat: $('cp_cat').value || null, sub: $('cp_sub').value || null });
    if (!r || !$('cp_cat')) return;
    $('cp_cat').value = r.cat || ''; $('cp_sub').value = r.sub || '';
    $('cp_catbtn').textContent = r.cat ? catPath(r.cat, r.sub) : 'بدون تصنيف';
  },
  cashPartAdd: async (el) => {
    const id = el.dataset.id, amt = E.parseNum($('cp_amt').value);
    if (!amt || amt <= 0) return toast('اكتب المبلغ');
    const r = E.addCashPart(store(), id, { amount: amt, categoryId: $('cp_cat').value || null, subcategoryId: $('cp_sub').value || null, note: $('cp_note').value.trim() });
    if (r.error === 'over') return toast(`أكبر من الباقي في السحب (${fmt(r.remaining)})`);
    if (r.error) return toast('ما قدرت أضيف الجزء');
    await persist('تقسيم سحب نقدي'); render(); afterTx(id); toast('انضاف الجزء');
  },
  cashPartDel: async (el) => { E.removeCashPart(store(), el.dataset.id, el.dataset.p); await persist('حذف جزء من سحب'); render(); afterTx(el.dataset.id); },
  toCashPart: async (el) => {
    const r = E.cashExpenseToPart(store(), el.dataset.id, $('tx_w').value);
    if (r.error) return toast(r.error === 'over' ? `أكبر من الباقي في السحب (${fmt(r.remaining)})` : 'ما قدرت أنقله');
    await persist('نقل مصروف نقدي لسحب'); render(); if (S.newList) renderNewList(); else closeSheet(); toast('انتقل للسحب، وما عاد ينحسب مرتين');
  },
  cashDirectOk: async (el) => { const t = store().get('transactions', el.dataset.id); if (!t) return; t.cashDirectOk = true; store().put('transactions', t); store().touch(); await persist('مصروف نقدي مباشر'); render(); afterTx(t.id); },
  spendBy: (el) => { S.spendBy = el.dataset.v; S.cardOpen = null; render(); },
  cardOpen: (el) => { S.cardOpen = S.cardOpen === el.dataset.k ? null : el.dataset.k; render(); },
  cardCatDrill: (el) => {
    const k = el.dataset.k, f = { kind: 'all' };
    if (k.startsWith('acc:')) { f.accountId = k.slice(4); f.noIns = true; } else f.instrumentId = k;
    if (el.dataset.cat) f.categoryId = el.dataset.cat; else f.kind = 'spend';
    go('txs', { filters: f });
  },
  rvDel: async (el) => { E.resolveDeletedAgain(store(), el.dataset.id, el.dataset.v); await persist(el.dataset.v === 'restore' ? 'إرجاع عملية محذوفة' : 'إبقاء عملية محذوفة'); render(); toast(el.dataset.v === 'restore' ? 'رجعت العملية' : 'بقيت محذوفة'); },
  txCat: async (el) => {
    const id = el.dataset.id;
    const r = await pickCategory({ cat: $('s_cat').value || null, sub: $('s_sub').value || null });
    if (!r || !$('s_cat')) return;
    $('s_cat').value = r.cat || ''; $('s_sub').value = r.sub || '';
    await A.saveTx({ dataset: { id } }, null, { reopen: true });
  },
  catField: async () => {
    const r = await pickCategory({ cat: $('s_cat').value || null, sub: $('s_sub').value || null });
    if (!r || !$('s_cat')) return;
    $('s_cat').value = r.cat || ''; $('s_sub').value = r.sub || '';
    $('catfield').innerHTML = catFieldInner(r.cat, r.sub);
    if ($('cd_move') && r.cat) $('cd_move').checked = true;
  },
  pickMain: (el) => { const id = el.dataset.id; const subs = store().all('categories').filter(c => c.parentId === id && c.active !== false); if (!subs.length) return finishPick({ cat: id, sub: null }); if (S.pick.cat !== id) S.pick.sub = null; S.pick.cat = id; S.pick.stage = 'subs'; renderPick(); },
  pickSub: (el) => finishPick({ cat: S.pick.cat, sub: el.dataset.id || null }),
  pickNone: () => finishPick({ cat: null, sub: null }),
  pickBack: () => { S.pick.stage = 'grid'; renderPick(); },
  pickClose: () => finishPick(null),
  pickBg: (el, ev) => { if (ev.target === el) finishPick(null); },
  deleteTx: async (el) => {
    const id = el.dataset.id;
    if (!await confirmBox('حذف العملية', 'تختفي من العمليات ومن كل الأرقام. ترجعها من «المحذوفة» (آخر صفحة العمليات) أو بزر التراجع ↶. لو جات نفس العملية مرة ثانية من كشف أو رسالة، أسألك قبل ما أرجعها.', 'حذف', true)) return afterTx(id);
    E.deleteTx(store(), id); await persist('حذف عملية'); render();
    if (S.newList) { S.newList.ids = S.newList.ids.filter(x => x !== id); renderNewList(); }
    toast('انحذفت. ترجعها من «المحذوفة»');
  },
  quickAdd: () => { const q = E.parseQuickEntry($('quick').value); if (!q.amount) return toast('اكتب المبلغ، مثل: قهوة 18'); [q.categoryId, q.subcategoryId] = E.liveCat(store(), q.categoryId, q.subcategoryId); sheetManual('expense', q); },
  manual: (el) => sheetManual(el.dataset.kind),
  saveManual: async (el) => {
    const kind = el.dataset.kind, amt = E.parseNum($('m_amt').value);
    if (!amt || amt <= 0) return toast('المبلغ غير صحيح');
    const e = { kind, amount: amt, date: $('m_date').value || E.todayISO(), description: $('m_desc') ? $('m_desc').value.trim() : '', note: $('m_note').value.trim() };
    if (kind === 'expense') {
      e.instrumentId = $('m_ins').value; e.categoryId = $('s_cat').value || null; e.subcategoryId = $('s_sub').value || null;
      const cashIns = store().all('instruments').find(i => i.kind === 'cash');
      const fromW = $('m_w') && cashIns && e.instrumentId === cashIns.id ? $('m_w').value : '__direct';
      if (!fromW) return toast('حدد إذا النقد من سحب نقدي أو لا');
      if (fromW !== '__direct') {
        // من سحب: جزء منه (المجموع ما يتغير)
        const r = E.addCashPart(store(), fromW, { amount: amt, categoryId: e.categoryId, subcategoryId: e.subcategoryId, note: [e.description, e.note].filter(Boolean).join(' — '), date: e.date });
        if (r.error === 'over') return toast(`أكبر من الباقي في السحب (${fmt(r.remaining)})`);
        if (r.error) return toast('ما قدرت أضيفه للسحب');
        if (S.pendingManualReview) { E.resolveMessageReview(store(), S.pendingManualReview, 'manual'); S.pendingManualReview = null; }
        await persist('مصروف نقدي من سحب'); closeSheet(); if ($('quick')) $('quick').value = ''; render();
        return toast('انضاف كجزء من السحب');
      }
    }
    if (kind === 'income') { e.accountId = $('m_acc').value; e.incomeSubtype = $('m_inc').value; }
    if (kind === 'withdrawal' || kind === 'deposit') { e.accountId = $('m_acc').value; if (!e.accountId) return toast('اختر الحساب'); }
    const r = E.addManual(store(), e);
    applyManualCity(r.tx);
    if (S.pendingManualReview) { E.resolveMessageReview(store(), S.pendingManualReview, 'manual'); S.pendingManualReview = null; }
    await persist(); closeSheet(); if ($('quick')) $('quick').value = '';
    if (S.askCityAfter) { const c = S.askCityAfter; S.askCityAfter = null; await askCurrentCity(c); }
    if (r.possibleDuplicates.length) {
      const d = r.possibleDuplicates[0], ex = store().get('transactions', d.existingId);
      const merge = await confirmBox('ممكن تكون مكررة', `فيه عملية بنفس المبلغ في الكشف: <b>${esc(txTitle(ex))}</b> ${fmt(ex.grossAmount)} بتاريخ ${fdate(ex.transactionDate)}. هل هي نفس العملية؟`, 'نعم، ادمجها');
      if (merge) { E.mergeInto(store(), ex.id, r.tx.id); await persist(); toast('تم الدمج'); }
      else toast('انحفظت كعملية مستقلة');
    } else toast('تمت الإضافة');
    render();
  },
  editAccount: (el, ev) => { if (ev) ev.preventDefault(); sheetAccount(el.dataset.id); },
  newAccount: () => sheetAccount(null),
  saveAccount: async (el) => {
    const st = store(), id = el.dataset.id;
    const a = id ? st.get('accounts', id) : { id: E.uid(), createdAt: new Date().toISOString(), currency: 'SAR', active: true };
    a.name = $('a_name').value.trim() || a.name || 'حساب'; a.bank = $('a_bank').value.trim() || null; a.type = $('a_type').value; a.last4 = $('a_last4').value.trim() || null; a.isMine = $('a_mine').checked; if ($('a_liq')) a.liquidityClass = $('a_liq').value || null;
    st.put('accounts', a); st.touch(); await persist(); closeSheet(); render(); toast('تم الحفظ');
  },
  editInstrument: (el, ev) => { if (ev) ev.preventDefault(); sheetInstrument(el.dataset.id); },
  saveInstrument: async (el) => { const st = store(), i = st.get('instruments', el.dataset.id); i.instrumentOwner = $('i_owner').value; i.ownerName = $('i_oname').value.trim() || null; i.includeInPersonalSpend = $('i_inc').checked; st.put('instruments', i); st.touch(); await persist(); closeSheet(); render(); toast('تم الحفظ'); },
  editBeneficiary: (el, ev) => { if (ev) ev.preventDefault(); sheetBeneficiary(el.dataset.id); },
  saveBeneficiary: async (el) => {
    const st = store(), b = st.get('beneficiaries', el.dataset.id);
    const mine = $('b_mine').checked, cat = $('s_cat').value || null, sub = $('s_sub').value || null;
    b.notes = $('b_notes').value.trim(); readSubjectChain(b, 'beneficiary');
    if (mine !== !!b.isMyAccount) E.setBeneficiaryMine(st, b.id, mine);
    if (!mine && (cat !== (b.categoryId || null) || sub !== (b.subcategoryId || null))) {
      const scope = await askScope(`المستفيد: ${b.name}`); if (!scope) return;
      const any = st.all('transactions').filter(t => t.beneficiaryId === b.id).sort(sortTx);
      if (any.length) { const n = E.setCategory(st, any[0].id, cat, sub, scope === 'this' ? 'future' : scope); toast(`تم: ${n} حوالة`); }
      else { b.categoryId = cat; b.subcategoryId = sub; st.put('beneficiaries', b); }
    } else st.put('beneficiaries', b);
    st.touch(); await persist(); closeSheet(); render();
  },
  editMerchant: (el) => sheetMerchant(el.dataset.id),
  saveMerchant: async (el) => {
    const st = store(), m = st.get('merchants', el.dataset.id);
    const cat = $('s_cat').value || null, sub = $('s_sub').value || null;
    m.defaultRecurrenceType = $('mm_rec').value || null; m.defaultNecessityType = $('mm_nec').value || null; readSubjectChain(m, 'merchant'); st.put('merchants', m);
    const n = E.setMerchantCategory(st, m.id, cat, sub);
    await persist(); closeSheet(); render(); toast(n ? `تم الحفظ، وتصنّفت ${cnt(n, 'op')}` : 'تم الحفظ');
  },
  merchantsFilter: (el) => { S.merchantsOnlyNone = el.dataset.v === '1'; render(); },
  setRoundUp: (el, ev) => { if (ev) ev.preventDefault(); sheetRoundUp(); },
  saveRoundUp: async () => {
    const v = (document.querySelector('input[name=ru]:checked') || {}).value || 'unknown';
    const dest = { kind: v, accountId: v === 'account' ? $('ru_acc').value || null : null };
    if (v === 'account' && !dest.accountId) return toast('اختر الحساب');
    E.setRoundUpDestination(store(), dest); await persist(); closeSheet(); render(); toast('تم تحديث التقريب');
  },
  setCycleMode: async (el) => { const s = settings(); s.cycleMode = el.dataset.v; store().put('settings', s); await persist(); S.period = null; render(); },
  saveSettings: async () => {
    const s = settings(), pd = parseInt($('payday').value, 10);
    if (pd >= 1 && pd <= 31) s.defaultPayday = pd;
    s.ownerAliases = $('aliases').value.split('\n').map(x => x.trim()).filter(Boolean);
    if ($('cur_city')) s.currentCityId = $('cur_city').value || null;
    const bd = parseInt($('bkdays').value, 10); if (bd >= 1) s.backupReminderDays = bd;
    store().put('settings', s);
    const n = E.applyOwnerAliases(store());
    await persist(); S.period = null; render(); toast(n ? `تم الحفظ، وتحولت ${n} إلى تحويلات داخلية` : 'تم حفظ الإعدادات');
  },
  catChanged: () => { const c = $('s_cat').value; $('s_sub').innerHTML = subOptions(c, null); },
  backup: () => doBackup(),
  print: () => window.print(),
  deleteImport: async (el) => {
    const imp = store().get('imports', el.dataset.id);
    if (!await confirmBox('حذف الاستيراد', `بتنحذف عمليات «${esc(imp.filename)}». العمليات اللي لها مصدر ثاني تبقى بمصدرها الآخر.`, 'حذف', true)) return;
    const r = E.deleteImport(store(), imp.id); await persist(); render(); toast(`انحذف ${cnt(r.removed, 'op')}${r.kept ? `، وبقي ${cnt(r.kept, 'op')} بمصدر آخر` : ''}`);
  },
  // المراجعة
  decide: (el) => { S.decisions[el.dataset.id] = el.dataset.val; render(); },
  decideAll: (el) => { S.plan.matches.review.forEach(r => { S.decisions[r.newId] = el.dataset.val; }); render(); },
  cardDir: async (el) => { const f = S.planFile; const plan = await E.prepareImport(store(), f, { cardDirection: el.dataset.dir }); if (plan.error) return toast(plan.message); S.plan = plan; render(); },
  commitPlan: async () => {
    if (S.busy) return; S.busy = true;
    try {
      const r = E.commitImport(store(), S.plan, S.decisions); E.detectRecurring(store());
      await persist(); DB.requestPersistence();
      S.plan = null; S.planFile = null; S.decisions = {};
      toast(`تم الاستيراد: ${r.created} جديدة${r.merged ? `، ${r.merged} مدمجة` : ''}${r.restored ? `، ${r.restored} رجعت من المحذوفة` : ''}${r.keptDeleted ? `، ${r.keptDeleted} بقيت محذوفة` : ''}`, 3500);
      S.period = null;
      if (S.queue.length) { const next = S.queue.shift(); await processFile(next); } else go('home', { nav: true });
    } finally { S.busy = false; }
  },
  cancelPlan: () => { S.plan = null; S.planFile = null; S.decisions = {}; if (S.queue.length) processFile(S.queue.shift()); else goUp('add'); },
  teachSet: (el) => { S.teach[el.dataset.k] = el.dataset.v; render(); },
  cancelTeach: () => { S.teach = null; goUp('add'); },
  teachSave: async () => {
    const T = S.teach, st = store();
    const col = (id) => parseInt($(id).value, 10);
    const t = { id: E.uid(), name: ($('t_bank').value.trim() || 'بنك') + (T.kind === 'credit_card' ? ' — بطاقة' : ' — حساب'), bank: $('t_bank').value.trim() || null, kind: T.kind,
      headerRow: parseInt($('t_head').value, 10) - 1, firstRow: parseInt($('t_first').value, 10) - 1, dateHint: $('t_dh').value,
      columns: { date: col('t_date'), desc: col('t_desc'), debit: col('t_debit'), credit: col('t_credit'), amount: col('t_amount'), balance: col('t_bal') } };
    if (t.columns.date < 0 || t.columns.desc < 0 || (t.columns.amount < 0 && t.columns.debit < 0 && t.columns.credit < 0)) return toast('حدد التاريخ والوصف والمبلغ (سحب/إيداع أو مبلغ واحد)');
    t.signature = E.signatureOf(T.rows[t.headerRow] || []);
    let accId = $('t_acc').value;
    if (accId === '__new') {
      const name = $('t_accname').value.trim(); if (!name) return toast('اكتب اسم الحساب');
      accId = st.put('accounts', { id: E.uid(), name, bank: t.bank, type: T.kind === 'credit_card' ? 'credit_card' : 'checking', last4: $('t_last4').value.trim() || null, isMine: true, active: true, currency: 'SAR', createdAt: new Date().toISOString() }).id;
    }
    t.accountId = accId; st.put('templates', t); await persist();
    const f = S.teach.file; S.teach = null;
    const plan = await E.prepareImport(st, f, { learnedTemplate: t });
    if (plan.error) { toast(plan.message); return goUp('add'); }
    S.plan = plan; S.planFile = f; S.decisions = {}; go('review');
  },
};
/* ---------- أوامر MVP1.1 ---------- */
const TEACH_ERR = { not_found: 'ما لقيت أحد الحقول في النص', no_amount: 'حدد المبلغ', too_generic: 'الرسالة قصيرة جدًا لتكون صيغة، حدد حقول أقل أو استخدم رسالة أوضح', self_test_failed: 'الصيغة ما قدرت تقرأ نفس الرسالة، راجع الحقول', date_order: 'اختر التاريخ الصحيح تحت الرسالة', bad_date: 'الجزء المحدد للتاريخ ما فيه تاريخ واضح', bad_time: 'الجزء المحدد للوقت ما فيه وقت واضح' };
const SINGLE_TOKEN = { amount: 1, balance: 1, fee: 1, cardLast4: 1, accountLast4: 1 };
Object.assign(A, {
  pasteSms: async () => {
    const d = SR().splitDetails($('smsPaste').value || '');
    if (!d.parts.length) return toast('الصق رسالة أو أكثر، وكل رسالة في فقرة');
    S.pasteSplit = { parts: d.parts, sender: ($('smsSender').value || '').trim() || null };
    if (!d.confirm) return A.pasteGo();
    // الفصل مشكوك فيه: نعرض الرسائل كما فهمناها ونطلب تأكيد العدد قبل المعالجة
    const n = d.parts.length;
    openSheet(`<h3>قرأت ${n === 1 ? 'رسالة وحدة' : n === 2 ? 'رسالتين' : n + ' رسائل'}. صحيح؟<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
      <p class="small muted">${n === 1 ? 'قرأت النص كله كرسالة واحدة.' : 'فصلت النص كذا.'} إذا العدد غلط، ارجع وافصل بين الرسائل بسطر فاضي، وهذا الأضمن.</p>
      ${d.parts.map((g, i) => `<div class="pseg"><div class="small muted">رسالة ${i + 1} من ${n}</div><div class="raw">${esc(g)}</div>${d.warns[i] ? `<div class="small warn-t">تنبيه: ${esc(d.warns[i])}. إذا هي أكثر من رسالة، افصلها بسطر فاضي.</div>` : ''}</div>`).join('')}
      <div class="btns" style="margin-top:12px"><button class="btn p" data-action="pasteGo">نعم، كمّل</button><button class="btn" data-action="closeSheet">لا، أعدّل النص</button></div>`);
  },
  pasteGo: async () => {
    const P = S.pasteSplit; if (!P) return;
    S.pasteSplit = null; if ($('sheet').innerHTML) closeSheet(null);
    const msgs = P.parts.map(t => ({ id: Inbox.uuid(), text: t, sender: P.sender, receivedAt: new Date().toISOString(), source: 'paste' }));
    const plan = await processSms(msgs, 'لصق ' + cnt(msgs.length, 'msg'));
    render(); showNewTxs(plan, true);
  },
  fetchInbox: () => fetchInbox(true),
  saveInbox: async () => {
    const url = $('ib_url').value.trim(), token = $('ib_token').value.trim();
    if (url && !Inbox.validUrl(url)) return toast('الرابط لازم يبدأ بـ https://script.google.com/macros/s/ وينتهي بـ /exec');
    const s = settings(); s.inbox = Object.assign({}, s.inbox || {}, { url, token, autoFetch: $('ib_auto').checked });
    store().put('settings', s); await persist('إعداد صندوق الرسائل'); render(); toast('انحفظ');
  },
  inboxTest: async (el) => {
    const url = $('ib_url').value.trim(), token = $('ib_token').value.trim(), box = $('ib_res');
    if (!Inbox.validUrl(url)) return toast('الرابط لازم يبدأ بـ https://script.google.com/macros/s/ وينتهي بـ /exec');
    if (!token) return toast('اكتب المفتاح السري');
    el.disabled = true; box.innerHTML = `<div class="muted">جاري الاختبار…</div>`;
    const NAMES = { ping: 'ping', push: 'push', pull: 'pull', city: 'مدينة متأخرة (1.4.0)', ack: 'ack', ackCity: 'تأكيد المدينة', check: 'تأكيد الحذف' }, rows = [];
    const steps = await Inbox.selfTest({ url, token }, (st) => {
      const extra = st.name === 'ping' && st.ok ? ` · معلّق ${st.res.pending} · إصدار ${esc(st.res.version || '')}` : st.name === 'city' && !st.ok && st.status === 'city_saved' ? ' · الـ Script قديم، حدّثه لـ 1.4.0' : st.status && st.status !== 'ok' ? ` · ${esc(Inbox.statusText(st.status))}` : '';
      const why = st.ok ? '' : st.res && st.res.status ? '' : st.detail;
      rows.push(`<div class="st"><span class="${st.ok ? 'ok' : 'no'}">${st.ok ? '✓' : '✗'}</span><b>${NAMES[st.name]}</b><span><span class="num">${st.ms} ms</span>${extra}${why ? ` — <span class="no">${esc(why)}</span>` : ''}</span></div>`);
      box.innerHTML = rows.join('');
    });
    const ok = steps.length === 7 && steps.every(x => x.ok);
    box.innerHTML += `<div class="banner ${ok ? 'g' : 'w'}" style="margin-top:10px">${ok ? '✓ الاتصال شغال.' : 'الاختبار ما اكتمل.'}</div>`;
    el.disabled = false;
  },
  issueTxs: (el) => go('txs', { filters: { kind: el.dataset.kind, allTime: true } }),
  openMsg: (el) => {
    const st = store(), m = st.get('messages', el.dataset.id); if (!m) return;
    if (st.all('reviews').some(r => r.messageId === m.id && r.status === 'open')) return go('reviewc');
    if (m.txId && st.get('transactions', m.txId)) return sheetTx(m.txId);
    openSheet(`<h3>الرسالة<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>${msgBox(m)}<div class="badges" style="margin-top:8px"><span class="b n">${MSG_STATUS_L[m.status] || m.status}</span><span class="b n">${CLS_L[m.cls] || ''}</span></div>${m.clsReason ? `<p class="small muted">${esc(m.clsReason)}</p>` : ''}`);
  },
  rvDup: async (el) => { E.resolveDuplicate(store(), el.dataset.id, el.dataset.v); await persist(el.dataset.v === 'merge' ? 'دمج رسالة مع عملية' : 'رسالة كعملية منفصلة'); render(); toast('تم'); },
  rvAcc: async (el) => {
    const r = store().get('reviews', el.dataset.id); if (!r) return;
    const accId = $('rvacc_' + r.id).value;
    const plan = await E.reprocessMessages(store(), [r.messageId], { forceAccount: { [r.messageId]: accId } });
    if (plan) E.commitSms(store(), plan);
    await persist('تحديد حساب لرسالة'); render(); toast(plan ? smsSummaryText(plan.smsSummary) : 'تم');
  },
  rvDate: async (el) => {
    const r = store().get('reviews', el.dataset.id); if (!r) return;
    const d = ($('rvdate_' + r.id) || {}).value || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return toast('اختر تاريخ العملية');
    if (d > E.todayISO()) return toast('التاريخ في المستقبل');
    const plan = await E.reprocessMessages(store(), [r.messageId], { forceDate: { [r.messageId]: d } });
    if (plan) E.commitSms(store(), plan);
    await persist('تحديد تاريخ رسالة'); render(); toast(plan ? smsSummaryText(plan.smsSummary) : 'تم');
  },
  catNew: (el) => sheetCategory(null, el.dataset.parent || null),
  ceParent: () => {
    // تغيير المكان (رئيسي/فرعي) في النموذج الكامل يغيّر الخيارات المتاحة؛ نعيد رسمه ونحتفظ بالمكتوب
    if (!$('ce_rec')) return;
    const box = document.querySelector('.catform'); const keep = { name: $('ce_name').value, parentId: $('ce_parent').value || '', emoji: $('ce_emoji').value, color: $('ce_color').value };
    sheetCategory(box.dataset.id || null, keep.parentId || null, keep);
  },
  catEdit: (el) => sheetCategory(el.dataset.id, null),
  ceEmoji: (el) => { if ($('ce_emoji')) $('ce_emoji').value = el.dataset.e || ''; },
  ceColor: (el) => { $('ce_color').value = el.dataset.c || ''; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); },
  pickNew: () => { S.pick.stage = 'new'; S.pick.newParent = null; renderPick(); },
  pickNewSub: (el) => { S.pick.stage = 'new'; S.pick.newParent = el.dataset.parent; renderPick(); },
  catSave: async (el) => {
    const inPick = el.dataset.pick === '1', id = el.dataset.id || null, d = readCatForm(!inPick);
    if (!id && !d.parentId && !d.color) d.color = autoCatColor(); // تصنيف رئيسي جديد: لون من ألوان التطبيق الأقل استخدامًا
    const r = E.saveCategory(store(), Object.assign({ id }, d));
    if (r.error) return toast(CAT_ERR[r.error] || r.error);
    await persist(id ? 'تعديل تصنيف' : 'تصنيف جديد');
    const c = r.category;
    if (inPick) return finishPick(c.parentId ? { cat: c.parentId, sub: c.id } : { cat: c.id, sub: null });
    closeSheet(null); render(); toast(id ? 'انحفظ' : 'انضاف التصنيف');
  },
  catDel: (el) => {
    const st = store(), c = st.get('categories', el.dataset.id); if (!c) return;
    const u = E.categoryUsage(st, c.id), parent = c.parentId ? st.get('categories', c.parentId) : null;
    openSheet(`<h3>حذف «${esc(c.name)}»<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
      <p class="small">${u.txs ? `عليه ${cnt(u.txs, 'op')}` : 'ما عليه عمليات'}${u.subs ? `، ومعه ${u.subs === 1 ? 'تصنيف فرعي' : u.subs + ' تصنيفات فرعية'} بينحذف` : ''}. <b>العمليات نفسها ما تنحذف.</b> وين تروح؟</p>
      <label class="f"><input type="radio" name="cd_mode" value="none" checked> ${parent ? `تبقى تحت «${esc(parent.name)}» بدون فرعي` : 'تبقى بدون تصنيف'}</label>
      <label class="f"><input type="radio" name="cd_mode" id="cd_move" value="move"> تنتقل إلى تصنيف ثاني:</label>${catField(null, null)}
      <p class="small muted">التجار والمستفيدون والقواعد المرتبطة فيه يتبعون نفس اختيارك${!parent ? '، وحد الصرف عليه ينتقل معه (أو ينحذف إذا بقت بدون تصنيف، أو إذا التصنيف الجديد عليه حد من قبل)' : ''}.</p>
      <div class="btns" style="margin-top:12px"><button class="btn r" data-action="catDelGo" data-id="${c.id}">حذف التصنيف</button><button class="btn" data-action="catEdit" data-id="${c.id}">رجوع</button></div>`);
  },
  catDelGo: async (el) => {
    const id = el.dataset.id, mode = (document.querySelector('input[name="cd_mode"]:checked') || {}).value;
    const tcat = $('s_cat') ? $('s_cat').value : '', tsub = $('s_sub') ? $('s_sub').value : '';
    if (mode === 'move' && !tcat) return toast('اختر التصنيف اللي تنتقل له العمليات');
    const res = E.deleteCategory(store(), id, mode === 'move' ? { cat: tcat, sub: tsub || null } : null);
    if (!res || res.error) return toast(CAT_ERR[res && res.error] || 'ما انحذف');
    if (S.filters && (S.filters.categoryId === id)) S.filters = { kind: 'all', allTime: false };
    await persist('حذف تصنيف'); closeSheet(null); render();
    toast(res.txs ? `انحذف التصنيف، و${mode === 'move' ? 'انتقلت' : 'تعدّلت'} ${cnt(res.txs, 'op')}` : 'انحذف التصنيف', 6000);
  },
  rvShape: async (el) => {
    const r = store().get('reviews', el.dataset.id); if (!r) return;
    const pick = document.querySelector(`input[name="shp_${r.id}"]:checked`), own = $('rvdate_' + r.id);
    if (!pick && own && own.value) {
      if (own.value > E.todayISO()) return toast('التاريخ في المستقبل');
      const plan = await E.reprocessMessages(store(), [r.messageId], { forceDate: { [r.messageId]: own.value } });
      if (plan) E.commitSms(store(), plan);
      await persist('تحديد تاريخ رسالة'); render(); return toast(plan ? smsSummaryText(plan.smsSummary) : 'تم');
    }
    if (!pick) return toast('اختر التاريخ الصحيح');
    const res = E.answerDateShape(store(), r.id, pick.value); if (!res) return;
    let plan = null;
    if (res.reprocess.length) { plan = await E.reprocessMessages(store(), res.reprocess, res.forceDate ? { forceDate: res.forceDate } : {}); if (plan) E.commitSms(store(), plan); }
    await persist(res.saved ? 'اعتماد ترتيب تاريخ' : 'تحديد تاريخ رسالة'); render();
    const parts = [];
    if (res.saved) parts.push('انحفظ الترتيب لهذا الشكل');
    if (res.fixed) parts.push(`تصحح تاريخ ${cnt(res.fixed, 'op')}`);
    if (plan) parts.push(smsSummaryText(plan.smsSummary));
    toast(parts.join('، ') || 'تم', 6000);
  },
  shapeEdit: (el) => {
    const sig = el.dataset.sig, sh = (settings().smsDateShapes || {})[sig]; if (!sh) return;
    const tok = SR().findDateToken(sh.sample || ''), OL = SR().ORDER_L;
    const orders = SR().ordersFor(sh.pat || sig.split('|')[2]);
    openSheet(`<h3>ترتيب التاريخ<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
      <p class="small">الشكل: <b>${shapeSampleHtml(sh.sample || '', tok && tok.raw)}</b></p>
      <div class="kvbox">${orders.map(o => { const d = tok ? SR().readDateOrder(tok, o) : null; return `<label class="f" style="margin:6px 0"><input type="radio" name="shp_edit" value="${o}" ${o === sh.order ? 'checked' : ''}> <b>${d ? fdate(d, true) : '—'}</b> <span class="small muted">· ${OL[o]}</span></label>`; }).join('')}</div>
      <p class="small muted">إذا غيّرت الترتيب، يتصحح تاريخ العمليات اللي جاء تاريخها آليًا من هذا الشكل. العمليات اللي حددت تاريخها بنفسك ما تتغير.</p>
      <div class="btns" style="margin-top:12px"><button class="btn p" data-action="shapeSave" data-sig="${esc(sig)}">حفظ</button><button class="btn r" data-action="shapeDel" data-sig="${esc(sig)}">حذف الشكل</button></div>`);
  },
  shapeSave: async (el) => {
    const sig = el.dataset.sig, sh = (settings().smsDateShapes || {})[sig], pick = document.querySelector('input[name="shp_edit"]:checked');
    if (!sh || !pick) return;
    if (pick.value === sh.order) return closeSheet(null);
    E.setDateShape(store(), sig, pick.value); const n = E.retroDateFix(store(), sig);
    await persist('تغيير ترتيب تاريخ'); closeSheet(null); render(); toast(n ? `انحفظ، وتصحح تاريخ ${cnt(n, 'op')}` : 'انحفظ');
  },
  shapeDel: async (el) => {
    const sig = el.dataset.sig; closeSheet(null);
    const ok = await confirmBox('حذف شكل التاريخ', 'العمليات الحالية تبقى بتواريخها. أول رسالة جاية بنفس الشكل بتسألك عن ترتيبها من جديد.', 'حذف', true);
    if (!ok) return;
    E.removeDateShape(store(), sig); await persist('حذف شكل تاريخ'); render(); toast('انحذف');
  },
  rvSame: async (el) => {
    const r = store().get('reviews', el.dataset.id); if (!r) return;
    const plan = await E.reprocessMessages(store(), [r.messageId], { allowSameContent: new Set([r.messageId]) });
    if (plan) E.commitSms(store(), plan);
    await persist('رسالة بنفس النص كعملية جديدة'); render(); toast(plan ? smsSummaryText(plan.smsSummary) : 'تم');
  },
  rvMsg: async (el) => { E.resolveMessageReview(store(), el.dataset.id, el.dataset.v); await persist('قرار مراجعة رسالة'); render(); },
  rvManual: (el) => {
    const r = store().get('reviews', el.dataset.id), m = r && store().get('messages', r.messageId); if (!m) return;
    const amt = SR().extractAmount(m.text || ''); S.pendingManualReview = r.id;
    sheetManual('expense', { amount: amt ? amt.value : '', description: '' });
  },
  teachSms: (el) => {
    const r = store().get('reviews', el.dataset.id), m = r && store().get('messages', r.messageId);
    if (!m || !m.text) return toast('نص الرسالة غير متاح');
    const text = SR().norm(m.text), tpl = m.templateId ? store().get('templates', m.templateId) : null, g = SR().parseGeneric(text);
    const T = { reviewId: r.id, messageId: m.id, text, tokens: tokenize(text), ranges: {}, active: 'amount', family: (tpl && tpl.family) || g.family || 'sms_purchase', bank: (tpl && tpl.bank) || m.sender || '', sender: m.sender || null, replaceId: tpl ? tpl.id : null };
    // اقتراح أولي من القارئ العام (تقدر تغيره)
    const findTok = (pred) => T.tokens.findIndex(tk => pred(text.slice(tk.s, tk.e)));
    if (g.grossAmount) { const i = findTok(x => Number(x.replace(/[^\d.]/g, '')) === g.grossAmount); if (i >= 0) T.ranges.amount = [i, i]; }
    if (g.instrumentLast4) { const i = findTok(x => x.replace(/\D/g, '') === g.instrumentLast4); if (i >= 0) T.ranges.cardLast4 = [i, i]; }
    const nameVal = g.merchantRaw || g.beneficiaryRaw || g.counterpartyName, nameKey = g.merchantRaw ? 'merchant' : g.beneficiaryRaw ? 'beneficiary' : g.counterpartyName ? 'counterparty' : null;
    if (nameVal && nameKey) { const a = text.indexOf(nameVal); if (a >= 0) { const s = T.tokens.findIndex(tk => tk.s >= a), e = T.tokens.map(tk => tk.e <= a + nameVal.length).lastIndexOf(true); if (s >= 0 && e >= s) T.ranges[nameKey] = [s, e]; } }
    S.teachSms = T; go('teachsms');
  },
  teachField: (el) => { S.teachSms.bank = $('ts_bank').value; S.teachSms.active = el.dataset.k; render(); },
  teachDateOrder: (el) => { if (S.teachSms) S.teachSms.dateOrder = el.value; },
  teachFamily: () => {
    const T = S.teachSms; T.family = $('ts_family').value; T.bank = $('ts_bank').value;
    const ok = teachFieldsFor(T.family); Object.keys(T.ranges).forEach(k => { if (!ok.includes(k)) delete T.ranges[k]; });
    render();
  },
  tokTap: (el) => {
    const T = S.teachSms, i = +el.dataset.i, k = T.active; if (!k) return;
    T.bank = $('ts_bank').value;
    Object.keys(T.ranges).forEach(f => { const r = T.ranges[f]; if (f !== k && r && i >= r[0] && i <= r[1]) delete T.ranges[f]; });
    const r = T.ranges[k];
    if (k === 'date') T.dateOrder = null;
    if (!r) T.ranges[k] = [i, i];
    else if (i === r[0] && i === r[1]) delete T.ranges[k];
    else if (SINGLE_TOKEN[k] || T.tokens[i].line !== T.tokens[r[0]].line) T.ranges[k] = [i, i];
    else T.ranges[k] = [Math.min(r[0], i), Math.max(r[1], i)];
    render();
  },
  teachSmsSave: async () => {
    const T = S.teachSms; T.bank = $('ts_bank').value.trim(); T.family = $('ts_family').value;
    if (!T.ranges.amount) return toast('حدد المبلغ في الرسالة');
    const spec = {}; Object.entries(T.ranges).forEach(([k, r]) => { spec[k] = { start: T.tokens[r[0]].s, end: T.tokens[r[1]].e }; });
    const L = SR().learnTemplate(T.text, spec, { family: T.family, direction: FAMILY_DIR[T.family], bank: T.bank, sender: T.sender, dateOrder: T.dateOrder || null });
    if (L.error) return toast(TEACH_ERR[L.error] || L.error);
    const replace = T.replaceId && $('ts_replace') && $('ts_replace').checked;
    const res = E.saveSmsTemplate(store(), L.template, { sample: T.text, replaceId: replace ? T.replaceId : null });
    const again = res.affected.filter(a => a.review.kind !== 'sms_partial').map(a => a.message.id);
    let plan = null, filled = 0;
    if (again.length) { plan = await E.reprocessMessages(store(), again, {}); if (plan) E.commitSms(store(), plan); }
    res.affected.filter(a => a.review.kind === 'sms_partial').forEach(a => { if (E.fillFromTemplate(store(), a.review.id, res.template)) filled++; });
    await persist('تعليم صيغة رسالة');
    S.teachSms = null; goUp('reviewc');
    toast(`انحفظت الصيغة${plan ? '، ' + smsSummaryText(plan.smsSummary) : ''}${filled ? `، واكتملت ${cnt(filled, 'op')}` : ''}`, 6000);
  },
  teachSmsCancel: () => { S.teachSms = null; goUp('reviewc'); },
  // التحديد والتعديل الجماعي
  selStart: () => { S.sel = new Set(); render(); },
  selEnd: () => { S.sel = null; render(); },
  toggleSel: (el) => { const id = el.dataset.id; if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); refreshSel(); },
  selAll: () => { filteredTxs().forEach(t => S.sel.add(t.id)); refreshSel(); },
  selNone: () => { S.sel.clear(); refreshSel(); },
  bulkCat: async () => {
    const r = await pickCategory({ cat: null, sub: null }); if (!r) return;
    const n = E.bulkEdit(store(), Array.from(S.sel), { categoryId: r.cat, subcategoryId: r.sub });
    await persist('تعديل جماعي: تصنيف'); S.sel = new Set(); render(); toast(`تعدلت ${cnt(n, 'op')}`);
  },
  bulkType: async () => {
    const v = await ask(`<h3>النوع للعمليات المحددة<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><div class="list">${['Payment', 'PersonTransfer', 'InternalTransfer', 'Refund', 'LoanToPerson', 'Unknown'].map(x => `<div class="it" data-action="answer" data-val="${x}"><div class="m"><div class="t">${TYPE_L[x]}</div></div></div>`).join('')}</div>`);
    if (!v) return;
    const n = E.bulkEdit(store(), Array.from(S.sel), { type: v });
    await persist('تعديل جماعي: النوع'); S.sel = new Set(); render(); toast(`تعدلت ${cnt(n, 'op')}`);
  },
  bulkRN: async () => {
    const v = await ask(`<h3>التكرار والضرورة<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3>
      <div class="grid2"><div><label class="f">التكرار</label><select id="b_rec"><option value="-">بدون تغيير</option><option value="">افتراضي</option><option value="recurring">متكرر</option><option value="variable">متغير</option></select></div>
      <div><label class="f">الضرورة</label><select id="b_nec"><option value="-">بدون تغيير</option><option value="">افتراضي</option><option value="essential">ضروري</option><option value="discretionary">اختياري</option></select></div></div>
      <div class="btns" style="margin-top:12px"><button class="btn p" data-action="bulkRNok">تطبيق</button></div>`);
    if (!v) return;
    const o = JSON.parse(v), ch = {}; if (o.rec !== '-') ch.recurrenceType = o.rec; if (o.nec !== '-') ch.necessityType = o.nec;
    if (!Object.keys(ch).length) return;
    const n = E.bulkEdit(store(), Array.from(S.sel), ch);
    await persist('تعديل جماعي: تكرار وضرورة'); S.sel = new Set(); render(); toast(`تعدلت ${cnt(n, 'op')}`);
  },
  bulkRNok: () => closeSheet(JSON.stringify({ rec: $('b_rec').value, nec: $('b_nec').value })),
  bulkNote: async () => {
    const v = await ask(`<h3>ملاحظة للعمليات المحددة<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><input type="text" id="b_note"><label class="f"><input type="checkbox" id="b_replace"> استبدل الملاحظة الموجودة (بدل الإضافة لها)</label><div class="btns" style="margin-top:12px"><button class="btn p" data-action="bulkNoteOk">تطبيق</button></div>`);
    if (!v) return;
    const o = JSON.parse(v); if (!o.note) return;
    const n = E.bulkEdit(store(), Array.from(S.sel), { note: o.note, noteMode: o.replace ? 'replace' : 'append' });
    await persist('تعديل جماعي: ملاحظة'); S.sel = new Set(); render(); toast(`تعدلت ${cnt(n, 'op')}`);
  },
  bulkNoteOk: () => closeSheet(JSON.stringify({ note: $('b_note').value.trim(), replace: $('b_replace').checked })),
  bulkDel: async () => {
    const ids = Array.from(S.sel), st = store();
    if (!ids.length) return;
    if (!await confirmBox('حذف', `بتنحذف ${cnt(ids.length, 'op')} من العمليات ومن كل الأرقام. ترجعها من «المحذوفة» أو بزر التراجع ↶.`, 'حذف', true)) return;
    const n = E.bulkDelete(st, ids); await persist('حذف جماعي'); S.sel = new Set(); render(); toast(`انحذفت ${cnt(n, 'op')}`);
  },
  // الحدود
  editLimit: (el) => sheetLimit(el.dataset.id || null),
  limScope: (el) => { $('lim_scope').value = el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); $('lim_catwrap').classList.toggle('hide', el.dataset.v !== 'category'); $('lim_pcwrap').classList.toggle('hide', el.dataset.v !== 'productCategory'); },
  saveLimit: async (el) => {
    const scope = $('lim_scope').value, amt = E.parseNum($('lim_amt').value), cat = $('s_cat').value || null;
    if (!(amt > 0)) return toast('اكتب مبلغ الحد');
    if (scope === 'category' && !cat) return toast('اختر التصنيف');
    const pc = scope === 'productCategory' ? ($('lim_pc').value || null) : null;
    if (scope === 'productCategory' && !pc) return toast('اختر تصنيف المنتجات');
    const id = el.dataset.id, l = id ? store().get('limits', id) : { id: E.uid(), createdAt: new Date().toISOString() };
    Object.assign(l, { scope, categoryId: scope === 'category' ? cat : null, productCategoryId: pc, amount: amt, active: $('lim_on').checked, period: 'cycle' });
    store().put('limits', l); await persist('حد صرف'); closeSheet(); render(); toast('انحفظ الحد');
  },
  delLimit: async (el) => { store().remove('limits', el.dataset.id); await persist('حذف حد صرف'); closeSheet(); render(); },
  saveLimitPct: async () => { const v = parseInt($('lim_pct').value, 10); if (!(v >= 10 && v <= 100)) return toast('من 10 إلى 100'); const s = settings(); s.limitAlertPct = v; store().put('settings', s); await persist('نسبة تنبيه الحدود'); render(); toast('انحفظ'); },
  // القواعد
  editRule: (el) => sheetRule(el.dataset.id || null),
  ruleFromTx: (el) => { const t = store().get('transactions', el.dataset.id); if (!t) return; sheetRule(null, t.merchantId ? { merchantId: t.merchantId } : t.beneficiaryId ? { beneficiaryId: t.beneficiaryId } : { text: t.merchantRaw || '' }); },
  saveRule: async (el) => {
    const st = store(), id = el.dataset.id, v = (i) => ($(i).value || '').trim() || null;
    const r = id ? st.get('rules', id) : { id: E.uid(), createdAt: new Date().toISOString(), order: st.all('rules').filter(x => x.when).length + 1 };
    const when = { text: v('ru_text'), merchantId: v('ru_m'), beneficiaryId: v('ru_b'), direction: v('ru_dir'), source: v('ru_src'), amountMin: v('ru_min') ? E.parseNum(v('ru_min')) : null, amountMax: v('ru_max') ? E.parseNum(v('ru_max')) : null, accountId: v('ru_acc') };
    const then = { categoryId: $('s_cat').value || null, subcategoryId: $('s_sub').value || null, type: v('ru_type'), recurrenceType: v('ru_rec'), necessityType: v('ru_nec') };
    if (!(when.text || when.merchantId || when.beneficiaryId || when.accountId || when.amountMin || when.amountMax)) return toast('حدد شرط واحد على الأقل: نص أو تاجر أو مستفيد أو حساب أو مبلغ');
    if (!(then.categoryId || then.type || then.recurrenceType || then.necessityType)) return toast('حدد وش تسوي القاعدة');
    Object.assign(r, { name: v('ru_name') || 'قاعدة', enabled: $('ru_on').checked, when, then, updatedAt: new Date().toISOString() });
    const all = !!el.dataset.all;
    if (all) { const n = E.previewRule(st, r).length; if (!await confirmBox('تطبيق على السابق', `تنطبق على ${cnt(n, 'op')} موجودة، ما عدا اللي عدّلت تصنيفها بيدك لعملية وحدة. أطبّقها؟`, 'طبّق')) return; }
    st.put('rules', r); const n = all ? E.applyRuleToAll(st, r.id) : 0;
    await persist('قاعدة: ' + r.name); closeSheet(); render(); toast(n ? `انحفظت القاعدة، وتعدلت ${cnt(n, 'op')}` : 'انحفظت القاعدة');
  },
  delRule: async (el) => { store().remove('rules', el.dataset.id); await persist('حذف قاعدة'); closeSheet(); render(); },
  ruleUp: async (el) => {
    const rules = store().all('rules').filter(r => r.when).sort((a, b) => (a.order || 0) - (b.order || 0));
    const i = rules.findIndex(r => r.id === el.dataset.id); if (i <= 0) return;
    [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]];
    rules.forEach((r, k) => { if (r.order !== k + 1) { r.order = k + 1; store().put('rules', r); } });
    await persist('ترتيب القواعد'); render();
  },
});

const ACTION_LABEL = { saveTx: 'تعديل عملية', txCat: 'تصنيف عملية', commitPlan: 'استيراد كشف', saveManual: 'إدخال يدوي', deleteTx: 'حذف عملية', saveMerchant: 'تصنيف تاجر', saveBeneficiary: 'تعديل مستفيد',
  saveAccount: 'تعديل حساب', saveInstrument: 'تعديل أداة دفع', saveRoundUp: 'وجهة التقريب', saveSettings: 'الإعدادات', setCycleMode: 'نوع الدورة', deleteImport: 'حذف استيراد', teachSave: 'قالب كشف جديد', aliasesFirst: 'أسماؤك في الكشوف' };
function onClick(ev) {
  const el = ev.target.closest('[data-action]'); if (!el) return;
  const fn = A[el.dataset.action]; if (!fn) return;
  S.opLabel = ACTION_LABEL[el.dataset.action] || null;
  if (el.tagName === 'A') ev.preventDefault();
  if ((el.dataset.action === 'sheetBg' || el.dataset.action === 'pickBg') && ev.target !== el) return;
  const r = fn(el, ev);
  if (r && typeof r.catch === 'function') r.catch(e => console.error(e)); // فشل الحفظ ينعرض للمستخدم داخل persist
}
function onChange(ev) {
  const el = ev.target;
  if (el.dataset && el.dataset.change && A[el.dataset.change]) A[el.dataset.change](el, ev);
  if (el.id === 's_type' && $('s_cp_wrap')) $('s_cp_wrap').classList.toggle('hide', el.value !== 'InternalTransfer');
  if (el.id === 'm_ins' && $('m_wwrap')) { const ci = store().all('instruments').find(i => i.kind === 'cash'); $('m_wwrap').classList.toggle('hide', !ci || el.value !== ci.id); }
  if (el.id === 't_acc' && $('t_newacc')) $('t_newacc').classList.toggle('hide', el.value !== '__new');
  if (el.id === 't_head' && S.teach) {
    const hr = Math.max(0, parseInt(el.value, 10) - 1);
    const bank = $('t_bank') ? $('t_bank').value : S.teach.bank;
    Object.assign(S.teach, guessTeach(S.teach.rows, hr), { bank, kind: S.teach.kind }); render();
  }
}
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'city_q') { S.cityQ = ev.target.value; const box = $('city_list'); if (box) box.innerHTML = cityListHtml(); return; }
  if (ev.target.id === 'it_name') { renderItemSuggest(); return; }
  if (ev.target.id === 'q') { S.q = ev.target.value; clearTimeout(S._qt); S._qt = setTimeout(() => { const box = $('txlist'); if (box) box.innerHTML = txListHtml(); const fl = $('fline'); if (fl) fl.innerHTML = filtersLine(); }, 200); }
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.id === 'quick') A.quickAdd(); if (ev.key === 'Escape') { if ($('sheet2').innerHTML) finishPick(null); else if ($('sheet').innerHTML) closeSheet(null); } });

/* ---------- الملفات ---------- */
async function readSheetRows(file) {
  const buf = await file.arrayBuffer();
  let wb;
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    wb = XLSX.read(text, { type: 'string', raw: true });
  } else wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
  return { name: file.name, bytes: new Uint8Array(buf), rows };
}
async function handleFiles(files) {
  if (!(settings().ownerAliases || []).length) {
    const v = await ask(`<h3>قبل الاستيراد: أسماؤك في الكشوف</h3>
      <p class="small">اكتب اسمك بكل الصيغ اللي يظهر فيها في الكشوف (عربي وإنجليزي والصيغة المختصرة في التحويلات). اسم في كل سطر.</p>
      <p class="small muted">أي تحويل من أو إلى هذي الأسماء يُحسب تحويلًا داخليًا بينك وبين نفسك، مو إنفاق ولا دخل. تقدر تعدلها لاحقًا من المزيد ← الإعدادات. تنحفظ على جهازك فقط.</p>
      <textarea id="first_aliases" rows="4"></textarea>
      <div class="btns" style="margin-top:12px"><button class="btn p" data-action="aliasesFirst">حفظ ومتابعة</button><button class="btn" data-action="answer" data-val="skip">تخطي</button></div>`);
    if (v === null) return;
  }
  S.queue = files.slice(1);
  await processFile(files[0]);
}
async function processFile(file) {
  toast('جاري قراءة ' + file.name + '…', 8000);
  let f;
  try { f = file.rows ? file : await readSheetRows(file); }
  catch (e) { toast('تعذرت قراءة الملف. تأكد إنه Excel أو CSV.'); if (S.queue.length) return processFile(S.queue.shift()); return; }
  const plan = await E.prepareImport(store(), f, {});
  $('toast').classList.add('hide');
  if (plan.error) { await confirmBox('ما تم الاستيراد', esc(plan.message), 'حسنًا'); if (S.queue.length) return processFile(S.queue.shift()); return S.view === 'add' ? render() : go('add', { noPush: true }); }
  if (plan.needsTemplate) { const g = guessTeach(f.rows); S.teach = Object.assign(g, { file: f, rows: f.rows, bank: '', accountId: '__new' }); return go('teach'); }
  S.plan = plan; S.planFile = f; S.decisions = {}; go('review');
}

async function doBackup() {
  const st = store(), s = settings();
  const data = E.makeBackup(st);
  const name = `finance-backup-${E.todayISO()}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  let done = false;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'نسخة احتياطية — المدير المالي' }); done = true; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  if (!done) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  s.lastBackupAt = new Date().toISOString(); st.put('settings', s); await persist(); render(); toast('تم تصدير النسخة');
}
async function restoreFrom(file) {
  let obj;
  try { obj = JSON.parse(await file.text()); } catch (e) { return toast('الملف غير صالح'); }
  const err = E.validateBackup(obj); if (err) return toast(err);
  const n = (obj.data.transactions || []).length;
  const ok = await confirmBox('استعادة النسخة', `<b class="warn-t">بتنمسح كل البيانات الحالية على هذا الجهاز</b> وتنحط بدالها النسخة (${cnt(n, 'op')}، تاريخها ${esc(obj.exportedAt ? fdt(obj.exportedAt, true) : '—')}). ما فيه دمج.`, 'استبدال كل البيانات', true);
  if (!ok) return;
  const data = E.prepareRestore(S.store, obj);
  await DB.replaceAll(data);
  S.store.replaceAll(data); S.store.takeChanges();
  S.store.addAudit({ id: E.uid(), at: new Date().toISOString(), label: 'استعادة نسخة احتياطية', source: 'user', changes: [] });
  await persist(null, { noStep: true });
  E.migrateDateShapes(S.store); await persist(null, { noStep: true }); // نسخة من إصدار قديم: أشكال تواريخ رسائلها
  const m141 = E.migrate141(S.store); // نسخة من قبل 1.4.1
  if (m141.reprocess.length) { const plan = await E.reprocessMessages(S.store, m141.reprocess); if (plan) E.commitSms(S.store, plan); }
  E.migrate150(S.store); E.detectRecurring(S.store); // نسخة من قبل 1.5.0
  await persist(null, { noStep: true });
  S.period = null; S.plan = null; go('home', { nav: true }); toast('تمت الاستعادة');
}


/* ================= 1.5.0 (MVP1.2): الأغراض، المدن، المجموعات، الالتزامات، التوقع، السيولة، الحجوزات، التوفير، الضروري والكمالي، المقارنات، السنوي، التنبيهات ================= */
Object.assign(TITLES, { insights: 'التحليل', forecast: 'توقع الدورة', liquidity: 'السيولة', commitments: 'الالتزامات', reserves: 'المحجوز', savings: 'فرص التوفير',
  necessity: 'ضروري وكمالي', compare: 'المقارنات', annual: 'السنوي', cities: 'المدن', products: 'المنتجات', items: 'الأغراض', pcats: 'تصنيفات المنتجات', groups: 'المجموعات', group: 'المجموعة', alerts: 'التنبيهات' });
Object.assign(NAV_OF, { insights: 'more', alerts: 'more', forecast: 'insights', liquidity: 'insights', commitments: 'insights', reserves: 'insights', savings: 'insights', necessity: 'insights', compare: 'insights',
  annual: 'insights', cities: 'insights', products: 'insights', items: 'products', pcats: 'products', groups: 'insights', group: 'groups' });
const CAD_L = E.CAD_L;
const LIQ_L = { spendable: 'قابل للصرف', savings: 'ادخار', excluded: 'مستثنى من السيولة', none: 'سيولة غير محددة' };
const NEC_L = { essential: 'ضروري', discretionary: 'كمالي', undefined: 'غير محدد' };
const NEC_C = { essential: PAL.blue, discretionary: PAL.orange, undefined: PAL.gray };
const CITY_SRC_L = { user: 'معتمدة', shortcut_gps: 'مقترحة من موقع الجهاز وقت العملية', device_gps: 'مقترحة من موقعك وقت الإدخال', current: 'مدينتك الحالية (اقتراح احتياطي)', gps: 'مقترحة من الموقع' };
const SNAP_SRC_L = { statement: 'كشف', sms: 'رسالة', manual: 'يدوي' };
const FC = '<span class="fc">توقع</span>';
const triVal = (v) => v === '' || v == null ? null : v === 'true';
const sumP = (ps) => E.round2(ps.reduce((s, p) => s + p.amt, 0));
const today0 = () => E.todayISO();
// الحسابات الثقيلة تتخزن لين تتغير البيانات أو اليوم
const cachedFc = () => store().cached('fc:' + today0(), () => E.cycleForecast(store()));
const cachedLiq = () => store().cached('liq:' + today0(), () => E.liquidity(store()));
const cachedAlerts = () => store().cached('al:' + today0(), () => E.computeAlerts(store()));
function activeAlerts() { try { return cachedAlerts().filter(a => !a.hidden); } catch (e) { console.error(e); return []; } }
function alertsBadge() { const n = activeAlerts().length; return n ? `<span class="cnt">${n}</span>` : ''; }
// التتبع: أي رقم يفتح العمليات اللي كوّنته
S.drillSets = new Map(); S.drillSeq = 0;
function drillAttr(ids, label, extra) {
  const k = 'd' + (++S.drillSeq); S.drillSets.set(k, { ids: Array.from(new Set(ids || [])), label, extra: extra || {} });
  if (S.drillSets.size > 400) S.drillSets.delete(S.drillSets.keys().next().value);
  return `data-action="drillIds" data-k="${k}"`;
}
function match150(t, f) {
  const st = store();
  if (f.nec && !E.spendParts(st, t).some(p => E.necOfPart(st, t, p) === f.nec)) return false;
  if (f.cityId && (E.cityOf(st, t, f.cityMode).cityId || '__unknown') !== f.cityId) return false;
  if (f.groupId && !(E.inGroup(st, t, f.groupId) || (t.items || []).some(i => (i.groupIds || []).includes(f.groupId)))) return false;
  if (f.rate && !E.variableParts(st, t).length) return false;
  if (f.savings && !E.eligibleParts(st, t).some(p => !f.savingsCat || p.cat === f.savingsCat)) return false;
  return true;
}
// أثر العملية على الرقم اللي جيت منه (نفس طريقة حسابه بالضبط)
function txImpact(t, f) {
  const st = store();
  if (f.groupId) { if (E.isExcluded(st, t)) return 0; if (E.inGroup(st, t, f.groupId)) return sumP(E.spendParts(st, t)); return E.round2(E.itemNet(st, t).filter(o => (o.item.groupIds || []).includes(f.groupId)).reduce((s, o) => s + o.net, 0)); }
  let ps = f.rate ? E.variableParts(st, t) : f.savings ? E.eligibleParts(st, t).filter(p => !f.savingsCat || p.cat === f.savingsCat) : E.spendParts(st, t);
  if (f.categoryId) ps = ps.filter(p => p.cat === f.categoryId);
  if (f.nec) ps = ps.filter(p => E.necOfPart(st, t, p) === f.nec);
  return sumP(ps);
}
function filtersLine150(f) {
  const out = [];
  if (f.label) out.push(f.label);
  if (f.nec) out.push(NEC_L[f.nec]);
  if (f.cityId) out.push('المدينة: ' + cityName(f.cityId) + (f.cityMode === 'withGps' ? ' (مع اقتراحات الموقع)' : ' (المعتمدة فقط)'));
  if (f.groupId) { const g = store().get('groups', f.groupId); out.push('المجموعة: ' + (g ? g.name : '—')); }
  if (f.rate && !f.label) out.push('الإنفاق المتغير');
  if (f.savings) out.push('مؤهل للتوفير' + (f.savingsCat ? ': ' + bucketName(f.savingsCat) : ''));
  return out;
}
const rowR = (dir, label, val, attrs, sub, cls) => `<div class="r ${cls || ''}" ${attrs || ''}>${dir || ''}<div class="l">${label}${sub ? `<div class="s">${sub}</div>` : ''}</div><div class="v">${val}</div></div>`;
const dirI = (icon, c) => `<span class="dir ${c || 'x'}">${ico(icon)}</span>`;
const goAttr = (view) => `data-action="go" data-view="${view}"`;
function bar(v, max, color) { const w = max > 0 ? Math.max(2, Math.min(100, v / max * 100)) : 0; return `<div class="hbar"><div style="width:${w}%;background:${color || PAL.blue}"></div></div>`; }

/* ---------- الرئيسية ---------- */
function homeForecastTile() {
  let fc = null; try { fc = cachedFc(); } catch (e) { console.error(e); }
  if (!fc) return '';
  return `<div class="g" data-action="go" data-view="forecast">${ico('trend')}<div><div class="l">توقع نهاية الدورة</div><div class="v">${money(fc.total)}</div></div></div>`;
}
function homeAlerts() {
  const al = activeAlerts(); if (!al.length) return '';
  return `<div class="card alerts-mini"><h2 class="soft">${ico('bell')} التنبيهات <span class="sp"></span><a data-action="go" data-view="alerts">الكل (${al.length})</a></h2>${al.slice(0, 2).map(a => `<div class="al ${a.level}" data-action="alertOpen" data-id="${esc(a.id)}"><b>${esc(a.title)}</b><div class="small muted">${esc(a.body)}</div></div>`).join('')}</div>`;
}
function homeLiquidity() {
  let L = null; try { L = cachedLiq(); } catch (e) { console.error(e); }
  if (!L || !L.known) return '';
  return `<div class="card"><h2 class="soft">السيولة القابلة للصرف</h2><div class="bigv ${L.total < 0 ? 'neg' : ''}" data-action="go" data-view="liquidity">${money(L.total)}</div>
    <div class="small muted">الحسابات ${fmt(L.spendableSum)} + النقد ${fmt(L.cashCounted)} − البطاقات ${fmt(L.due)} − المحجوز ${fmt(L.reserves.total)}</div>
    <div class="linkrow" data-action="go" data-view="liquidity">${ico('wallet')}<span>من وين جا الرقم</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
}

/* ---------- العملية: المدينة، المجموعات، الأغراض، الاسترجاع، الالتزام ---------- */
function cityName(id) { if (!id || id === '__unknown') return 'غير معروفة'; const c = store().get('cities', id); return c ? c.name : '—'; }
function txCityRow(t) {
  if (!(t.direction === 'out' || t.cityId || t.suggestedCityId)) return '';
  const sc = E.suggestCity(store(), t);
  if (sc.source === 'user') return `<div class="drow">${ico('pin')}<div class="m">📍 <b>${esc(cityName(sc.cityId))}</b></div><a data-action="cityPick" data-id="${t.id}">تغيير</a></div>`;
  if (sc.cityId) return `<div class="drow" style="flex-wrap:wrap">${ico('pin')}<div class="m">📍 <b>${esc(cityName(sc.cityId))}</b> — <span class="muted">${CITY_SRC_L[sc.source] || 'مقترحة'}</span></div>
    <div class="btns" style="width:100%;margin-top:6px"><button class="btn" data-action="cityApprove" data-id="${t.id}" data-c="${esc(sc.cityId)}">اعتمدها</button><button class="btn" data-action="cityPick" data-id="${t.id}">غيّرها</button><button class="btn" data-action="cityDismiss" data-id="${t.id}">اتركها غير محددة</button></div></div>`;
  return `<div class="drow">${ico('pin')}<div class="m muted">${sc.source === 'dismissed' ? 'المدينة غير محددة (اخترت تركها)' : 'المدينة غير محددة'}</div><a data-action="cityPick" data-id="${t.id}">حدد</a></div>`;
}
function txGroupsRow(t) {
  if (!(E.spendEffect(t) !== 0 || (t.groupIds || []).length)) return '';
  if (t.transactionType === 'Refund' && t.refundOfId && store().get('transactions', t.refundOfId)) return `<div class="drow">${ico('tag')}<div class="m muted">يتبع مجموعات الشراء المربوط (ما ينخصم مرتين)</div></div>`;
  const gs = (t.groupIds || []).map(id => store().get('groups', id)).filter(Boolean);
  return `<div class="drow">${ico('tag')}<div class="m">${gs.length ? gs.map(g => `<span class="b">${esc(((g.emoji || '') + ' ' + g.name).trim())}</span>`).join(' ') : '<span class="muted">بدون مجموعة</span>'}</div><a data-action="groupsPick" data-id="${t.id}">${gs.length ? 'تعديل' : '+ مجموعة'}</a></div>`;
}
function txChainFields(t) {
  const st = store(), dc = E.effective(st, Object.assign({}, t, { isCommitment: null }), 'commit'), ds = E.effective(st, Object.assign({}, t, { savingsEligible: null }), 'save');
  const o = (v, cur, l) => `<option value="${v}" ${String(cur == null ? '' : cur) === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="grid2"><div><label class="f">التزام</label><select id="s_com">${o('', t.isCommitment, `افتراضي (${dc ? 'نعم' : 'لا'})`)}${o('true', t.isCommitment, 'نعم')}${o('false', t.isCommitment, 'لا')}</select></div>
    <div><label class="f">يدخل فرص التوفير</label><select id="s_sav">${o('', t.savingsEligible, `افتراضي (${ds ? 'نعم' : 'لا'})`)}${o('true', t.savingsEligible, 'نعم')}${o('false', t.savingsEligible, 'لا')}</select></div></div>
    <label class="f"><input type="checkbox" id="s_rx" ${E.isRateExcluded(st, 'transaction', t.id) ? 'checked' : ''}> استثنها من معدل الإنفاق المتغير (التوقع)</label>`;
}
function subjectChainFields(o, kind, recNec) {
  const st = store(), op = (v, cur, l) => `<option value="${v}" ${String(cur == null ? '' : cur) === v ? 'selected' : ''}>${l}</option>`;
  let h = '<div class="grid2">';
  if (recNec) h += `<div><label class="f">التكرار</label><select id="sc_rec">${op('', o.defaultRecurrenceType, 'من التصنيف')}${op('recurring', o.defaultRecurrenceType, 'متكرر')}${op('variable', o.defaultRecurrenceType, 'متغير')}</select></div>
    <div><label class="f">الضرورة</label><select id="sc_nec">${op('', o.defaultNecessityType, 'من التصنيف')}${op('essential', o.defaultNecessityType, 'ضروري')}${op('discretionary', o.defaultNecessityType, 'كمالي')}</select></div>`;
  h += `<div><label class="f">التزام</label><select id="sc_com">${op('', o.isCommitment, 'من التصنيف')}${op('true', o.isCommitment, 'نعم')}${op('false', o.isCommitment, 'لا')}</select></div>
    <div><label class="f">يدخل فرص التوفير</label><select id="sc_sav">${op('', o.savingsEligible, 'من التصنيف')}${op('true', o.savingsEligible, 'نعم')}${op('false', o.savingsEligible, 'لا')}</select></div></div>
    <label class="f"><input type="checkbox" id="sc_rx" ${E.isRateExcluded(st, kind, o.id) ? 'checked' : ''}> استثنه من معدل الإنفاق المتغير (التوقع)</label>`;
  return h;
}
function readSubjectChain(o, kind) {
  if ($('sc_rec')) o.defaultRecurrenceType = $('sc_rec').value || null;
  if ($('sc_nec')) o.defaultNecessityType = $('sc_nec').value || null;
  if ($('sc_com')) o.isCommitment = triVal($('sc_com').value);
  if ($('sc_sav')) o.savingsEligible = triVal($('sc_sav').value);
  if ($('sc_rx')) { const on = $('sc_rx').checked; if (on !== E.isRateExcluded(store(), kind, o.id)) { if (on) E.addRateExclusion(store(), { type: kind, id: o.id }); else E.removeRateExclusion(store(), kind, o.id); } }
}
function accountLiqField(a) {
  if (!a || a.type === 'credit_card' || a.type === 'cash') return '';
  const auto = E.liquidityClassOf(Object.assign({}, a, { liquidityClass: null })) || 'none';
  const op = (v, l) => `<option value="${v}" ${(a.liquidityClass || '') === v ? 'selected' : ''}>${l}</option>`;
  return `<label class="f">السيولة</label><select id="a_liq">${op('', 'تلقائي (' + LIQ_L[auto] + ')')}${op('spendable', LIQ_L.spendable)}${op('savings', LIQ_L.savings)}${op('excluded', LIQ_L.excluded)}</select>
    <p class="small muted">الجاري والمحفظة قابلة للصرف تلقائيًا، والادخار ما يدخل، والحساب غير المحدد يظهر «سيولة غير محددة» لين تحدده.</p>`;
}
const pcatUi = (pc) => pc ? { color: PAL[pc.color] || PAL.gray, icon: 'box', emoji: pc.emoji || null } : { color: PAL.gray, icon: 'box' };
function pcatOptions(sel, withNone) {
  const list = store().all('productCategories').filter(c => c.active !== false || c.id === sel).sort((a, b) => (a.order || 0) - (b.order || 0));
  return (withNone ? `<option value="">— بدون تصنيف —</option>` : '') + list.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc((c.emoji ? c.emoji + ' ' : '') + c.name)}${c.active === false ? ' (معطّل)' : ''}</option>`).join('');
}
function pcName(id) { if (!id || id === '__none') return 'بدون تصنيف'; const c = store().get('productCategories', id); return c ? c.name : '—'; }
function txBlocks150(t) {
  const st = store(); let h = '';
  // يبدو أنها متكررة
  const rc = E.recurringOfTx(st, t);
  if (rc && rc.status === 'suggested' && E.spendEffect(t) > 0) h += `<div class="banner i" style="display:block;margin-top:10px"><b>يبدو أن هذه العملية متكررة</b>
    <div class="small" style="margin-top:4px">التكرار المتوقع: ${CAD_L[rc.cadence]} · المبلغ المعتاد: <span class="num">${fmt(rc.expectedAmount)}</span> · آخر عملية: ${fdate(rc.lastDate, true)} · القادمة المتوقعة: ${fdate(E.nextDue(rc, today0(), store()), true)} ${FC}</div>
    <div class="btns" style="margin-top:8px"><button class="btn p" data-action="recConfirm" data-id="${rc.id}" data-c="1" data-tx="${t.id}">أكّد: التزام</button><button class="btn" data-action="recConfirm" data-id="${rc.id}" data-c="0" data-tx="${t.id}">متكرر بس مو التزام</button><button class="btn" data-action="recDismiss" data-id="${rc.id}" data-tx="${t.id}">مو متكرر</button></div></div>`;
  else if (rc && rc.status === 'confirmed' && E.spendEffect(t) > 0) h += `<div class="small muted" style="margin-top:8px">${ico('repeat')} متكرر مؤكد (${CAD_L[rc.cadence]})${rc.isCommitment ? ' · التزام' : ''} · القادمة ${fdate(E.nextDue(rc, today0(), store()), true)} <a data-action="recEdit" data-id="${rc.id}">تعديل</a></div>`;
  // الأغراض
  if (E.canHaveItems(t)) {
    const net = E.itemNet(st, t), cap = E.itemCap(st, t), un = E.unitemized(st, t);
    if (!net.length) h += `<div class="txblock"><div class="linkline" data-action="itemEdit" data-id="${t.id}">${ico('box')}<span>أضف أغراض الفاتورة (اختياري)</span><span class="sp"></span>${ico('plus')}</div></div>`;
    else {
      h += `<div class="txblock"><div class="small" style="margin-bottom:4px"><b>الأغراض</b> <span class="muted">تفصيل فقط، ما يغيّر مبلغ العملية</span></div><div class="list">${net.map(o => {
        const i = o.item, pc = st.get('productCategories', i.productCategoryId), gs = (i.groupIds || []).map(g => st.get('groups', g)).filter(Boolean);
        const part = i.partId ? (t.cashParts || []).find(p => p.id === i.partId) : null;
        return `<div class="it" data-action="itemEdit" data-id="${t.id}" data-i="${i.id}">${icCircle(pcatUi(pc), 's')}<div class="m"><div class="t">${esc(i.name)}${i.discount ? ' <span class="b g">خصم</span>' : ''}</div><div class="s"><span class="num">${fmt(i.qty)} × ${fmt(i.unitPrice)}</span> · ${esc(pcName(i.productCategoryId))}${part ? ' · من جزء ' + esc(bucketName(part.categoryId)) : ''}${gs.length ? ' · ' + gs.map(g => esc(g.name)).join('، ') : ''}${o.allocated ? ` · مسترجع ${fmt(o.allocated)}` : ''}${o.estimated ? ` · <span class="warn-t">توزيع تقديري −${fmt(o.estimated)}</span>` : ''}</div></div><span class="num">${fmt(o.total)}</span></div>`;
      }).join('')}</div>
      <div class="small ${un < -0.004 ? 'warn-t' : 'muted'}" style="margin:6px 0">${un < -0.004 ? `الأغراض أكبر من سقف العملية (${fmt(cap)}) بـ ${fmt(-un)}، فالتحليل يقلصها بالنسبة. عدّل غرض.` : `غير مفصل من الفاتورة: <b class="num">${fmt(un)}</b> من ${fmt(cap)}`}</div>
      <div class="btns"><button class="btn" data-action="itemEdit" data-id="${t.id}">+ غرض</button></div></div>`;
    }
  }
  // الاسترداد: وش الأغراض المسترجعة
  if (t.transactionType === 'Refund' && t.refundOfId) {
    const p = st.get('transactions', t.refundOfId);
    if (p && E.itemsOf(p).length) {
      const al = t.refundItemAllocations || [], sumA = E.round2(al.reduce((s, a) => s + Number(a.amount), 0)), rest = E.round2(t.principalAmount - sumA);
      h += `<div class="txblock"><div class="small"><b>الأغراض المسترجعة</b></div>${al.length ? `<div class="small" style="margin-top:4px">${al.map(a => { const it = (p.items || []).find(i => i.id === a.itemId); return `${esc(it ? it.name : '—')}: <span class="num">${fmt(a.amount)}</span>`; }).join(' · ')}</div>` : ''}
        ${rest > 0.004 ? `<div class="small warn-t" style="margin-top:4px">${al.length ? 'الباقي' : 'المبلغ'} (${fmt(rest)}) ما حددت أغراضه: <b>توزيع تقديري</b> بالنسبة على أغراض الفاتورة.</div>` : ''}
        <div class="btns" style="margin-top:6px"><button class="btn" data-action="refundAlloc" data-id="${t.id}">حدد الأغراض المسترجعة</button></div></div>`;
    }
  }
  // مبلغ رجع من سحب نقدي
  if (t.direction === 'in' && (t.transactionType === 'CashDeposit' || t.transactionType === 'Unknown')) {
    if (t.cashReturnOfId) {
      const w = st.get('transactions', t.cashReturnOfId);
      h += `<div class="txblock"><div class="small">${w ? `رجع من سحب نقدي: <a data-action="openTx" data-id="${w.id}"><b>${fmt(w.principalAmount)}</b> · ${fdate(w.transactionDate, true)}</a>. ينقص أثر السحب على تاريخه (مرة وحدة).` : 'مربوط بسحب ما عاد موجود، فما له أثر.'}</div><div class="btns" style="margin-top:6px"><button class="btn" data-action="cashReturnUnlink" data-id="${t.id}">فك الربط</button></div></div>`;
    } else {
      const cands = E.cashReturnCandidates(st, t.id);
      if (cands.length) h += `<div class="txblock"><div class="small" style="margin-bottom:6px"><b>هذا المبلغ رجع من سحب نقدي؟</b> اربطه بالسحب عشان ينقص أثر السحب على تاريخه، بدل ما ينحسب السحب كامل.</div><div class="list">${cands.map(c => `<div class="it" data-action="cashReturnLink" data-id="${t.id}" data-w="${c.id}"><div class="m"><div class="t">سحب <span class="num">${fmt(c.amount)}</span> · ${fdate(c.date, true)}</div><div class="s">${c.returned ? `رجع منه قبل ${fmt(c.returned)} · ` : ''}يقبل لين ${fmt(c.returnable)}</div></div>${c.fits ? '' : '<span class="b w">أكبر من الباقي</span>'}</div>`).join('')}</div></div>`;
    }
  }
  // السحب: المبالغ اللي رجعت منه
  if (t.transactionType === 'CashWithdrawal') {
    const R = E.withdrawalReturns(st, t);
    if (R.total > t.principalAmount + 0.004) h += `<div class="banner w" style="margin-top:10px"><div>المبالغ المربوطة كمعادة من هذا السحب (${fmt(R.total)}) أكبر من أصله (${fmt(t.principalAmount)}). أثره محسوب صفر، بس راجع الإيداعات المربوطة وفك الزايد.</div></div>`;
    if (R.ids.length) h += `<div class="txblock"><div class="small">رجع منه للبنك <b class="num">${fmt(R.total)}</b>: ${R.ids.map(id => { const d = st.get('transactions', id); return d ? `<a data-action="openTx" data-id="${d.id}">${fmt(d.principalAmount)} · ${fdate(d.transactionDate)}</a>` : ''; }).join('، ')}. أثره الصافي على الصرف: <b class="num">${fmt(E.netWithdrawal(st, t))}</b>.</div></div>`;
  }
  return h;
}

/* ---------- اختيار المدينة (نافذة فوق النافذة) ---------- */
function pickCity(opts) { return new Promise(res => { S.cityResolve = res; S.cityQ = ''; S.cityOpts = opts || {}; renderCityPick(); }); }
function cityUsage() { const m = new Map(); store().all('transactions').forEach(t => { const c = t.cityId || t.suggestedCityId; if (c) m.set(c, (m.get(c) || 0) + 1); }); return m; }
function cityListHtml() {
  const st = store(), q = (S.cityQ || '').trim(), use = cityUsage(), cur = settings().currentCityId, sel = (S.cityOpts || {}).cur;
  const k = q ? E.cityKey(q) : '';
  const list = st.all('cities').filter(c => c.active !== false && (!k || [c.name].concat(c.aliases || []).some(a => E.cityKey(a).includes(k))))
    .sort((a, b) => (Number(b.id === cur) - Number(a.id === cur)) || ((use.get(b.id) || 0) - (use.get(a.id) || 0)) || a.name.localeCompare(b.name, 'ar'));
  return list.slice(0, 60).map(c => `<div class="it" data-action="cityChoose" data-c="${esc(c.id)}"><div class="m"><div class="t">${esc(c.name)}${c.id === sel ? ' ✓' : ''}</div><div class="s">${c.id === cur ? 'مدينتك الحالية · ' : ''}${esc((c.aliases || []).filter(a => a !== c.name).slice(0, 3).join('، '))}</div></div></div>`).join('')
    + (q && !list.length ? `<div class="muted small" style="padding:10px 0">ما لقيتها. تقدر تضيفها كمدينة جديدة.</div>` : '');
}
function renderCityPick() {
  $('sheet2').innerHTML = `<div class="sheet-bg" data-action="cityBg"><div class="sheet" role="dialog"><h3><button class="close" data-action="cityClose" aria-label="إغلاق">×</button><span class="sp" style="text-align:center;color:var(--ink-3);font-weight:500">اختر المدينة</span><span style="width:34px"></span></h3>
    <input type="search" id="city_q" placeholder="ابحث: بريدة، Riyadh…" value="${esc(S.cityQ || '')}" autocomplete="off"><div class="list" id="city_list" style="margin-top:8px">${cityListHtml()}</div>
    <div class="btns" style="margin-top:10px"><button class="btn" data-action="cityNew">+ مدينة جديدة</button></div></div></div>`;
}
function finishCity(v) { $('sheet2').innerHTML = ''; const r = S.cityResolve; S.cityResolve = null; if (r) r(v); }
async function askCurrentCity(cityId) {
  const nm = esc(cityName(cityId));
  const v = await ask(`<h3>المدينة الحالية<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><p>اعتمدت ${nm} لهذه العملية. هل تريد جعلها مدينتي الحالية؟</p>
    <div class="list"><div class="it" data-action="answer" data-val="yes"><div class="m"><div class="t">نعم، اجعل ${nm} مدينتي الحالية</div><div class="s">تنعرض كاقتراح احتياطي للعمليات اللي ما لها موقع.</div></div></div>
    <div class="it" data-action="answer" data-val="this"><div class="m"><div class="t">لهذه العملية فقط</div></div></div>
    <div class="it" data-action="answer" data-val="later"><div class="m"><div class="t">لا تسألني الآن</div><div class="s">ما يسألك مرة ثانية لمدة يوم.</div></div></div></div>`);
  if (v === 'yes') { E.setCurrentCity(store(), cityId); await persist('المدينة الحالية'); toast('صارت ' + cityName(cityId) + ' مدينتك الحالية'); }
  else if (v === 'later') { E.snoozeCityPrompt(store(), 24); await persist(null, { noStep: true }); }
}
async function approveCity(txId, cityId) {
  const r = E.setTxCity(store(), txId, cityId); if (!r) return;
  await persist('مدينة العملية'); render();
  if (r.askCurrent) await askCurrentCity(cityId);
  afterTx(txId);
}
function manualCityField() {
  return `<label class="f">المدينة (اختياري)</label><input type="hidden" id="m_city"><input type="hidden" id="m_scity">
    <div class="btns"><button type="button" class="btn" data-action="mCityPick" id="m_citybtn">${ico('pin')} اختر المدينة</button><button type="button" class="btn" data-action="mCityGps">استخدام موقعي الحالي</button></div>
    <div id="m_cityinfo" class="small muted" style="margin-top:4px">الموقع يقترح المدينة بس (من جدول مدن على جهازك، بدون أي خدمة خارجية)، وتعتمدها أنت.</div>`;
}
function applyManualCity(tx) {
  if (!tx) return;
  const c = $('m_city') ? $('m_city').value : '', sc = $('m_scity') ? $('m_scity').value : '';
  if (!c && !sc) return;
  const t = store().get('transactions', tx.id); if (!t) return;
  if (c) t.cityId = c;
  if (sc) Object.assign(t, { suggestedCityId: sc, suggestedCityRaw: cityName(sc), citySuggestionSource: 'device_gps', citySuggestedAt: new Date().toISOString() });
  store().put('transactions', t);
  S.askCityAfter = c && c !== settings().currentCityId && !(settings().cityPromptSnoozeUntil > new Date().toISOString()) ? c : null;
}
function settingsCityCard() {
  const cur = settings().currentCityId, list = store().all('cities').filter(c => c.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return `<div class="card"><h2>مدينتي الحالية</h2><p class="small muted">تستخدم فقط كاقتراح احتياطي للعمليات اللي ما جاها موقع، وما تعتبر حقيقة ولا تدخل تحليل المدن.</p>
    <select id="cur_city"><option value="">— غير محددة —</option>${list.map(c => `<option value="${esc(c.id)}" ${c.id === cur ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <div class="btns" style="margin-top:8px"><button class="btn" data-action="go" data-view="cities">المدن</button></div></div>`;
}

/* ---------- اختيار المجموعات ---------- */
function groupChecks(sel, prefix) {
  const gs = store().all('groups').filter(g => g.active !== false || (sel || []).includes(g.id));
  if (!gs.length) return `<div class="small muted">ما فيه مجموعات. <a data-action="groupNewInline">+ مجموعة جديدة</a></div>`;
  return `<div class="gchips">${gs.map(g => `<label class="gchip"><input type="checkbox" data-g="${esc(g.id)}" class="${prefix}" ${(sel || []).includes(g.id) ? 'checked' : ''}><span>${esc(((g.emoji || '') + ' ' + g.name).trim())}</span></label>`).join('')}</div>`;
}
const readChecks = (prefix) => Array.from(document.querySelectorAll('input.' + prefix)).filter(x => x.checked).map(x => x.dataset.g);
function pickGroups(cur) {
  return new Promise(res => {
    S.groupResolve = res;
    $('sheet2').innerHTML = `<div class="sheet-bg" data-action="grpBg"><div class="sheet" role="dialog"><h3><button class="close" data-action="grpClose">×</button><span class="sp" style="text-align:center;color:var(--ink-3);font-weight:500">المجموعات</span><span style="width:34px"></span></h3>
      <p class="small muted">العملية تقدر تكون في أكثر من مجموعة، وكل مجموعة تنحسب لحالها (ما تنجمع مع بعض).</p><div id="grp_box">${groupChecks(cur, 'pg')}</div>
      <div class="grid2" style="margin-top:10px"><input type="text" id="grp_new" placeholder="مجموعة جديدة (مثل: رحلة أبها)"><button class="btn" data-action="grpAdd">+ أضف</button></div>
      <div class="btns" style="margin-top:12px"><button class="btn p" data-action="grpDone">تم</button></div></div></div>`;
  });
}
function finishGroups(v) { $('sheet2').innerHTML = ''; const r = S.groupResolve; S.groupResolve = null; if (r) r(v); }

/* ---------- الغرض ---------- */
function sheetItem(txId, itemId) {
  const st = store(), t = st.get('transactions', txId); if (!t) return;
  const it = itemId ? (t.items || []).find(i => i.id === itemId) : null;
  const cap = E.itemCap(st, t), un = E.round2(E.unitemized(st, t) + (it ? Number(it.total) : 0));
  const parts = t.transactionType === 'CashWithdrawal' ? (t.cashParts || []) : [];
  S.itemCtx = { txId, itemId: itemId || null };
  openSheet(`<h3>${it ? 'تعديل غرض' : 'غرض جديد'}<span class="sp"></span><button class="close" data-action="itemBack" data-id="${txId}">×</button></h3>
    <div class="small muted">${esc(txTitle(t))} · مبلغ العملية للأغراض ${fmt(cap)} · المتاح ${fmt(un)}</div>
    <label class="f">الغرض</label><input type="text" id="it_name" value="${esc(it ? it.name : '')}" autocomplete="off" placeholder="مثل: طماطم">
    <div id="it_sugg" class="chips" style="margin-top:6px"></div><div id="it_last" class="small muted"></div>
    <div class="grid2"><div><label class="f">الكمية</label><input type="text" inputmode="decimal" id="it_qty" value="${it ? it.qty : 1}"></div><div><label class="f">سعر الوحدة</label><input type="text" inputmode="decimal" id="it_unit" value="${it ? it.unitPrice : ''}"></div></div>
    <label class="f">أو الإجمالي (إذا ما تعرف سعر الوحدة)</label><input type="text" inputmode="decimal" id="it_total" value="${it ? it.total : ''}">
    <label class="f">تصنيف المنتج</label><select id="it_pc">${pcatOptions(it ? it.productCategoryId : null, true)}</select>
    ${parts.length ? `<label class="f">من أي جزء من السحب؟</label><select id="it_part"><option value="">— الباقي —</option>${parts.map(p => `<option value="${p.id}" ${it && it.partId === p.id ? 'selected' : ''}>${esc(bucketName(p.categoryId))} · ${fmt(p.amount)}</option>`).join('')}</select>` : ''}
    <label class="f"><input type="checkbox" id="it_disc" ${it && it.discount ? 'checked' : ''}> عليه خصم (علامة معلوماتية بس، ما تعتبر توفير)</label>
    <label class="f">ملاحظة</label><input type="text" id="it_note" value="${esc(it ? it.note || '' : '')}">
    <label class="f">المجموعات</label>${groupChecks(it ? it.groupIds : [], 'ig')}
    <div class="btns" style="margin-top:14px"><button class="btn p" style="flex:1" data-action="itemSave">حفظ</button>${it ? `<button class="btn r" data-action="itemDel">${ico('trash')} حذف</button>` : ''}</div>`);
  S.sheetKind = 'item';
  renderItemSuggest();
}
function renderItemSuggest() {
  const box = $('it_sugg'); if (!box) return;
  const v = $('it_name').value.trim(), list = v ? E.productSuggest(store(), v, 6) : [];
  const exact = list.find(p => E.normAr(p.name) === E.normAr(v));
  box.innerHTML = list.filter(p => p !== exact).map(p => `<button type="button" class="chip" data-action="itemSugg" data-p="${esc(p.id)}">${esc(p.name)}</button>`).join('');
  $('it_last').innerHTML = exact ? lastInfo(exact) : '';
}
function lastInfo(p) {
  const bits = [];
  if (p.lastUnitPrice != null) bits.push(`آخر سعر وحدة <span class="num">${fmt(p.lastUnitPrice)}</span> <a data-action="itemUse" data-f="unit" data-v="${p.lastUnitPrice}">استخدمه</a>`);
  if (p.lastQty != null && p.lastQty !== 1) bits.push(`آخر كمية <span class="num">${p.lastQty}</span> <a data-action="itemUse" data-f="qty" data-v="${p.lastQty}">استخدمها</a>`);
  if (p.productCategoryId && $('it_pc') && $('it_pc').value !== p.productCategoryId) bits.push(`تصنيفه: ${esc(pcName(p.productCategoryId))} <a data-action="itemUse" data-f="pc" data-v="${esc(p.productCategoryId)}">اختره</a>`);
  return bits.length ? `اقتراح من مشترياتك السابقة: ${bits.join(' · ')}` : '';
}
const ITEM_ERR = { name: 'اكتب اسم الغرض', qty: 'الكمية غير صحيحة', amount: 'اكتب سعر الوحدة أو الإجمالي', not_allowed: 'هذي العملية ما تقبل أغراض', part: 'الجزء غير موجود' };
function sheetRefundAlloc(refundId) {
  const st = store(), r = st.get('transactions', refundId); if (!r) return;
  const p = st.get('transactions', r.refundOfId); if (!p) return;
  const others = E.linkedRefunds(st, p.id).filter(x => x.id !== r.id);
  const usedBy = (id) => E.round2(others.reduce((s, x) => s + (x.refundItemAllocations || []).filter(a => a.itemId === id).reduce((q, a) => q + Number(a.amount), 0), 0));
  const cur = new Map((r.refundItemAllocations || []).map(a => [a.itemId, a.amount]));
  openSheet(`<h3>الأغراض المسترجعة<span class="sp"></span><button class="close" data-action="openTx" data-id="${r.id}">×</button></h3>
    <p class="small">الاسترداد <b class="num">${fmt(r.principalAmount)}</b> من فاتورة ${esc(txTitle(p))} ${fmt(p.principalAmount)}. حدد المبلغ لكل غرض رجعته. اللي ما تحدده ينوزع توزيع تقديري بالنسبة.</p>
    <div class="list">${E.itemsOf(p).map(i => { const max = E.round2(Number(i.total) - usedBy(i.id)); return `<div class="it" style="cursor:default"><div class="m"><div class="t">${esc(i.name)}</div><div class="s">قيمته ${fmt(i.total)}${usedBy(i.id) ? ` · مسترجع في استرداد ثاني ${fmt(usedBy(i.id))}` : ''} · الحد ${fmt(max)}</div></div><input type="text" inputmode="decimal" class="ra" data-i="${i.id}" value="${cur.has(i.id) ? cur.get(i.id) : ''}" placeholder="0" style="width:96px"></div>`; }).join('')}</div>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="refundAllocSave" data-id="${r.id}">حفظ</button><button class="btn" data-action="refundAllocAll" data-id="${r.id}">الاسترداد كامل للفاتورة</button></div>`);
}

/* ---------- التحليل: الصفحة الرئيسية ---------- */
function vInsights() {
  const st = store(); let fc = null, L = null;
  try { fc = cachedFc(); } catch (e) { console.error(e); }
  try { L = cachedLiq(); } catch (e) { console.error(e); }
  const recs = st.all('recurring'), conf = recs.filter(r => r.status === 'confirmed').length, sug = recs.filter(r => r.status === 'suggested').length;
  const res = E.reservesTotal(st, today0());
  const item = (view, t, sub, icon, color) => `<div class="it" data-action="go" data-view="${view}">${icCircle({ color: color || PAL.blue, icon }, 's')}<div class="m"><div class="t">${t}</div><div class="s">${sub}</div></div>${ico('chevL', 'chev')}</div>`;
  return `<div class="card"><h2>الدورة الحالية</h2><div class="list">
    ${item('forecast', 'توقع نهاية الدورة', fc ? `توقع ${fmt(fc.total)} · الفائض المتوقع ${fmt(fc.surplus)}${fc.confidence === 'low' ? ' · ثقة منخفضة' : ''}` : 'ما فيه دورة حالية', 'trend', PAL.violet)}
    ${item('liquidity', 'السيولة القابلة للصرف', L && L.known ? fmt(L.total) : 'تحتاج رصيد حساب معروف (كشف أو رسالة فيها الرصيد)', 'wallet', PAL.green)}
    ${item('commitments', 'الالتزامات والاشتراكات', `${conf} مؤكد · ${sug} مقترح يحتاج مراجعتك`, 'repeat', PAL.blue)}
    ${item('reserves', 'الأموال المحجوزة', res.total ? fmt(res.total) : 'ما فيه حجوزات', 'lock', PAL.gray)}
    ${item('savings', 'فرص التوفير', 'الرجوع لسلوكك الطبيعي في الكماليات', 'piggy', PAL.magenta)}
    ${item('alerts', 'التنبيهات' + (activeAlerts().length ? ` <span class="cnt">${activeAlerts().length}</span>` : ''), 'مركز تنبيهات واحد', 'bell', PAL.orange)}
  </div></div><div class="card"><h2>التحليل</h2><div class="list">
    ${item('necessity', 'الضروري والكمالي', 'النسب والاتجاه بالأشهر والدورات', 'scale', PAL.blue)}
    ${item('compare', 'المقارنات', 'فترتين، مدينتين، أو عبر الفترات', 'chart', PAL.violet)}
    ${item('annual', 'العرض السنوي', 'يناير ← ديسمبر', 'cal2', PAL.aqua)}
    ${item('cities', 'المدن', 'وين تصرف', 'pin', PAL.red)}
    ${item('products', 'المنتجات', 'من أغراض الفواتير، منفصل عن الأرقام المالية', 'box', PAL.yellow)}
    ${item('groups', 'المجموعات', 'رحلة، رمضان، تأثيث…', 'tag', PAL.green)}
  </div></div>`;
}

/* ---------- توقع نهاية الدورة ---------- */
function vForecast() {
  const st = store(), fc = cachedFc();
  if (!fc) return `<div class="card empty">ما فيه دورة حالية.</div>`;
  const cr = fc.rates;
  let h = `<div class="card"><h2>${fperiod(fc.cycle)}</h2><p class="small muted">مضى ${fc.elapsed} يوم وباقي ${fc.remainingDays}. كل رقم عليه «توقع» تقدير، مو مؤكد.</p>
    ${fc.confidence === 'low' ? `<div class="banner w">توقع بثقة منخفضة — بيانات الفترة قليلة</div>` : ''}<div class="rows">
    ${rowR(dirI('out', 'o'), 'صرف حتى الآن', money(fc.spent), drillAttr(fc.spentTxIds, 'صرف الدورة حتى اليوم'), cnt(fc.spentTxIds.length, 'op'))}
    ${rowR(dirI('repeat'), 'الالتزامات القادمة ' + FC, money(fc.upcomingTotal), goAttr('commitments'), fc.upcoming.length ? `${fc.upcoming.length} قبل نهاية الدورة` : 'ما فيه التزامات مؤكدة قادمة')}
    ${rowR(dirI('trend'), 'المتوقع للإنفاق المتغير ' + FC, money(fc.variableExpected), '', `${fmt(fc.rate)} يوميًا × ${fc.remainingDays} يوم`)}
    ${rowR(dirI('wallet', 'w'), '<b>الإنفاق المتوقع بنهاية الدورة</b> ' + FC, money(fc.total), '', 'صرف حتى الآن + الالتزامات القادمة + المتغير المتوقع')}
    ${rowR(dirI('inn', 'n'), 'الدخل', money(fc.income), drillAttr(fc.incomeTxIds, 'دخل الدورة'), cnt(fc.incomeTxIds.length, 'op'))}
    ${rowR(dirI('wallet'), 'الفائض المتوقع ' + FC, money(fc.surplus, fc.surplus < 0 ? 'neg' : ''), '', 'الدخل − الإنفاق المتوقع')}</div></div>`;
  h += `<div class="card"><h2>معدل التوقع: <span class="num">${fmt(fc.rate)}</span> يوميًا</h2>`;
  if (fc.rateSource === 'current') h += `<p class="small">مضى 7 أيام أو أكثر من الدورة، فالمعدل = الإنفاق المتغير لهذي الدورة ÷ الأيام اللي مضت.</p>`;
  else if (fc.rateSource === 'history') h += `<p class="small">مضى أقل من 7 أيام، فالمعدل = وسيط الإنفاق المتغير اليومي لآخر 3 دورات مكتملة (ما نخلط أيام الدورة السابقة مع الحالية). بعد 7 أيام يتحول لمعدل الدورة الحالية.</p>
    <div class="list">${fc.history.map(x => `<div class="it" ${drillAttr(x.txIds, 'الإنفاق المتغير ' + fperiod(x.cycle), { rate: true })}><div class="m"><div class="t">${fperiod(x.cycle)}</div><div class="s">${fmt(x.amount)} ÷ ${x.days} يوم</div></div><span class="num">${fmt(x.rate)}</span></div>`).join('')}</div>`;
  else h += `<p class="small">ما فيه 3 دورات مكتملة، فالمعدل من بيانات الدورة الحالية بس (ثقة منخفضة). بعد 7 أيام يصير المعدل الطبيعي للدورة.</p>`;
  h += `</div><div class="card"><h2>المعدلات</h2><p class="small muted">الإنفاق المتغير = الإنفاق الحقيقي ناقص التحويلات الداخلية وسداد البطاقات والعمليات بأثر صفر والالتزامات المتكررة المعروفة واستثناءاتك. السحب النقدي والخارج غير المعروف يبقون صرف.</p><div class="rows">
    ${rowR('', 'معدل الدورة الحالية (المتغير)', money(cr.cycleRate), drillAttr(cr.variable.txIds, 'الإنفاق المتغير في الدورة', { rate: true }), `${fmt(cr.variable.amount)} ÷ ${cr.elapsed} يوم`)}
    ${rowR('', 'معدل آخر 7 أيام داخل الدورة', cr.last7 ? money(cr.last7.rate) : '<span class="muted small">بعد 7 أيام</span>', cr.last7 ? drillAttr(cr.last7.txIds, 'الإنفاق المتغير آخر 7 أيام', { rate: true }) : '', cr.last7 ? `${fmt(cr.last7.amount)} ÷ 7` : 'ما يدخل فيه أيام من الدورة السابقة')}
    ${rowR('', 'معدل الأيام المنقضية (كل الصرف)', money(cr.elapsedRate), drillAttr(cr.all.txIds, 'كل صرف الدورة'), `${fmt(cr.all.amount)} ÷ ${cr.elapsed} يوم`)}</div></div>`;
  if (fc.upcoming.length) h += `<div class="card"><h2>الالتزامات القادمة ${FC}</h2><div class="list">${fc.upcoming.map(u => `<div class="it" data-action="recEdit" data-id="${u.recurringId}"><div class="m"><div class="t">${esc(u.name)}</div><div class="s">${fdate(u.date, true)}${u.overdue ? ' · <span class="warn-t">متأخر</span>' : ''}</div></div><span class="num">${fmt(u.amount)}</span></div>`).join('')}</div></div>`;
  const ex = settings().rateExclusions || [];
  const exName = (e) => e.type === 'category' ? 'تصنيف: ' + bucketName(e.id) : e.type === 'merchant' ? 'تاجر: ' + ((st.get('merchants', e.id) || {}).name || '—') : e.type === 'beneficiary' ? 'مستفيد: ' + ((st.get('beneficiaries', e.id) || {}).name || '—') : 'عملية: ' + (st.get('transactions', e.id) ? txTitle(st.get('transactions', e.id)) + ' ' + fmt(st.get('transactions', e.id).grossAmount) : 'محذوفة');
  h += `<div class="card"><h2>استثناءات المعدل</h2><p class="small muted">تبدأ فاضية. استثن تصنيف من هنا، والتاجر أو المستفيد من صفحته، والعملية من تفاصيلها. الاستثناء يطلعها من المعدل بس، وتبقى في الإنفاق.</p>
    ${ex.length ? `<div class="list">${ex.map(e => `<div class="it" style="cursor:default"><div class="m"><div class="t">${esc(exName(e))}</div></div><button class="close" data-action="rateExDel" data-t="${e.type}" data-id="${esc(e.id)}">×</button></div>`).join('')}</div>` : ''}
    <div class="grid2" style="margin-top:8px"><select id="rx_cat">${catOptions(null, false)}</select><button class="btn" data-action="rateExAdd">+ استثن التصنيف</button></div></div>`;
  return h;
}

/* ---------- السيولة ---------- */
function liqRow(r, neg) {
  const a = r.account, s = r.snapshot;
  const sub = s ? `آخر رصيد ${fmt(s.balance)} · ${SNAP_SRC_L[s.source] || s.source} ${fdt(s.asOf, true)}${r.rolledTxIds.length ? ` · ${r.rolled >= 0 ? '+' : '−'}${fmt(Math.abs(r.rolled))} بعده (${cnt(r.rolledTxIds.length, 'op')})` : ''}${r.stale ? ' · <span class="warn-t">قديم</span>' : ''}` : 'الرصيد غير معروف (ما فيه كشف ولا رسالة فيها الرصيد)';
  const v = r.balance == null ? '<span class="muted small">—</span>' : money(neg ? r.balance : r.balance, r.balance < 0 && !neg ? 'neg' : '');
  return `<div class="it" data-action="accLiq" data-id="${a.id}"><div class="m"><div class="t">${esc(a.name)}</div><div class="s">${sub}</div></div>${v}</div>`;
}
function vLiquidity() {
  const L = cachedLiq();
  let h = `<div class="card"><h2>السيولة القابلة للصرف</h2><div class="bigv ${L.total < 0 ? 'neg' : ''}">${money(L.total)}</div>
    <p class="small muted">= الحسابات القابلة للصرف ${fmt(L.spendableSum)} + النقد ${fmt(L.cashCounted)} − مستحق البطاقات ${fmt(L.due)} − المحجوز ${fmt(L.reserves.total)}. رصيد كل حساب = آخر رصيد معروف + العمليات اللي بعده (تقديري).</p></div>`;
  h += `<div class="card"><h2>الحسابات القابلة للصرف <span class="sp"></span><span class="num">${fmt(L.spendableSum)}</span></h2>${L.spendable.length ? `<div class="list">${L.spendable.map(r => liqRow(r)).join('')}</div>` : '<div class="muted">ما فيه.</div>'}</div>`;
  h += `<div class="card"><h2>النقد <span class="sp"></span><span class="num">${fmt(L.cash)}</span></h2><p class="small muted">السحوبات − الأجزاء اللي صرفتها منها − المعاد للبنك − المصاريف النقدية.${L.cashIncluded ? '' : ' <b>مستثنى من السيولة.</b>'}</p>${L.cashAccountId ? `<div class="linkrow" data-action="accDrill" data-id="${L.cashAccountId}">${ico('cash')}<span>عمليات المحفظة النقدية</span><span class="sp"></span>${ico('chevL', 'chev')}</div>` : ''}</div>`;
  h += `<div class="card"><h2>البطاقات: المستحق <span class="sp"></span><span class="num">${fmt(L.due)}</span></h2><p class="small muted">آخر رصيد من الكشف + المشتريات بعده − السداد والاستردادات بعده. الحد الائتماني والمتاح مو سيولة.</p>${L.cards.length ? `<div class="list">${L.cards.map(r => liqRow(r, true)).join('')}</div>` : '<div class="muted">ما فيه مستحق.</div>'}</div>`;
  h += `<div class="card"><h2>الأموال المحجوزة <span class="sp"></span><span class="num">${fmt(L.reserves.total)}</span></h2><div class="linkrow" data-action="go" data-view="reserves">${ico('lock')}<span>تفاصيل الحجوزات</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  const out = [];
  if (L.unknown.length) out.push(`<h3>سيولة غير محددة <span class="muted small">(ما تنجمع لين تحددها)</span></h3><div class="list">${L.unknown.map(r => liqRow(r)).join('')}</div>`);
  if (L.savings.length) out.push(`<h3>ادخار <span class="muted small">(ما يدخل افتراضيًا)</span></h3><div class="list">${L.savings.map(r => liqRow(r)).join('')}</div>`);
  if (L.excluded.length) out.push(`<h3>مستثنى</h3><div class="list">${L.excluded.map(r => liqRow(r)).join('')}</div>`);
  if (L.cardCredit.length) out.push(`<h3>رصيد دائن في البطاقات <span class="muted small">(سداد زيادة، منفصل وما ينضاف)</span></h3><div class="list">${L.cardCredit.map(r => `<div class="it" data-action="accLiq" data-id="${r.account.id}"><div class="m"><div class="t">${esc(r.account.name)}</div></div>${money(-r.balance)}</div>`).join('')}</div>`);
  if (L.unknownCards.length) out.push(`<h3>بطاقات رصيدها غير معروف</h3><p class="small muted">ما فيه كشف لها، فمستحقها ما ينحسب. ارفع كشفها.</p><div class="list">${L.unknownCards.map(r => liqRow(r, true)).join('')}</div>`);
  if (out.length) h += `<div class="card prose"><h2>ما يدخل في السيولة</h2>${out.join('')}</div>`;
  return h;
}
function sheetAccLiq(id) {
  const st = store(), a = accOf(id); if (!a) return;
  const n = a.type === 'credit_card' ? E.cardNow(st, a) : E.accountNow(st, a);
  const snaps = st.all('balanceSnapshots').filter(x => x.accountId === a.id).sort((x, y) => E.snapKey(y).localeCompare(E.snapKey(x)));
  openSheet(`<h3>${esc(a.name)}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <div class="kv"><dt>الرصيد الحالي (تقديري)</dt><dd>${n.balance == null ? '—' : num(n.balance)}</dd>${n.snapshot ? `<dt>آخر رصيد معروف</dt><dd>${num(n.snapshot.balance)} · ${SNAP_SRC_L[n.snapshot.source] || ''} ${fdt(n.snapshot.asOf, true)}</dd><dt>العمليات بعده</dt><dd>${n.rolledTxIds.length ? `<a ${drillAttr(n.rolledTxIds, 'عمليات بعد آخر رصيد: ' + a.name)}>${cnt(n.rolledTxIds.length, 'op')} (${n.rolled >= 0 ? '+' : '−'}${fmt(Math.abs(n.rolled))})</a>` : 'لا يوجد'}</dd>` : ''}</dl>
    ${a.type !== 'credit_card' && a.type !== 'cash' ? `<div style="margin-top:10px">${accountLiqField(a)}<div class="btns" style="margin-top:8px"><button class="btn p" data-action="accLiqSave" data-id="${a.id}">حفظ</button></div></div>` : ''}
    <h3 style="margin-top:16px;font-size:15px">سجل الأرصدة (ما ينمسح)</h3>${snaps.length ? `<div class="list">${snaps.map(x => `<div class="it" style="cursor:default"><div class="m"><div class="t"><span class="num">${fmt(x.balance)}</span>${x.kind === 'due' ? ' مستحق' : x.kind === 'credit' ? ' دائن' : ''}</div><div class="s">${SNAP_SRC_L[x.source] || x.source} · ${fdt(x.asOf, true)}${x.migrated ? ' · من قبل 1.5.0' : ''}${x.voidedAt ? ' · <span class="warn-t">ملغى (انحذف الكشف)</span>' : ''}</div></div></div>`).join('')}</div>` : '<div class="muted small">ما فيه سجل.</div>'}`);
}

/* ---------- الالتزامات والاشتراكات ---------- */
function recLine(r) {
  return `${CAD_L[r.cadence] || r.cadence} · المعتاد <span class="num">${fmt(r.expectedAmount)}</span>${r.amountMin !== r.amountMax ? ` (${fmt(r.amountMin)}–${fmt(r.amountMax)})` : ''} · آخر ${fdate(r.lastDate)} · القادمة ${fdate(E.nextDue(r, today0(), store()))}`;
}
function vCommitments() {
  const st = store(), today = today0(), cur = E.currentCycle(st), R = cur ? E.computePeriod(st, cur) : null;
  const recs = st.all('recurring'), sug = recs.filter(r => r.status === 'suggested'), conf = recs.filter(r => r.status === 'confirmed'), dis = recs.filter(r => r.status === 'dismissed');
  const up = cur ? E.upcomingCommitments(st, today, cur.end, today) : [];
  let h = `<div class="card rows">${R ? rowR(dirI('repeat'), 'الالتزامات المعروفة المدفوعة هذي الدورة', money(R.commitments), 'data-action="kpi" data-kind="commitments" data-p="cur"', cnt(R.commitmentItems.length, 'op')) : ''}
    ${rowR(dirI('cal'), 'القادمة قبل نهاية الدورة ' + FC, money(E.round2(up.reduce((s, u) => s + u.amount, 0))), '', up.length ? up.map(u => esc(u.name) + ' ' + fdate(u.date)).slice(0, 3).join('، ') : 'ما فيه')}</div>`;
  if (sug.length) h += `<div class="card"><h2>يبدو إنها متكررة (راجعها)</h2><p class="small muted">اكتشاف آلي: نفس التاجر أو المستفيد والحساب، بفاصل منتظم ومبلغ قريب. ما يصير التزام مؤكد إلا بموافقتك.</p>${sug.map(r => `<div class="rv"><div class="rvh"><b>${esc(E.subjectName(st, r))}</b><span class="sp" style="flex:1"></span><a ${drillAttr(r.evidenceTxIds, 'عمليات ' + E.subjectName(st, r))}>العمليات</a></div><div class="small muted">${recLine(r)}</div>
    <div class="btns" style="margin-top:8px"><button class="btn p" data-action="recConfirm" data-id="${r.id}" data-c="1">التزام</button><button class="btn" data-action="recConfirm" data-id="${r.id}" data-c="0">متكرر بس مو التزام</button><button class="btn" data-action="recDismiss" data-id="${r.id}">مو متكرر</button></div></div>`).join('')}</div>`;
  h += `<div class="card"><h2>المؤكدة</h2>${conf.length ? `<div class="list">${conf.map(r => `<div class="it" data-action="recEdit" data-id="${r.id}">${icCircle({ color: r.isCommitment ? PAL.blue : PAL.gray, icon: 'repeat' }, 's')}<div class="m"><div class="t">${esc(E.subjectName(st, r))}${r.isCommitment ? ' <span class="b">التزام</span>' : ''}${r.reserve ? ' <span class="b n">محجوز له</span>' : ''}</div><div class="s">${recLine(r)}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div>` : '<div class="muted">ما فيه للحين. أكّد المقترح فوق، أو من أي عملية.</div>'}</div>`;
  if (dis.length) h += `<div class="card"><details><summary class="muted">رفضتها (${dis.length})</summary><div class="list">${dis.map(r => `<div class="it" style="cursor:default"><div class="m"><div class="t">${esc(E.subjectName(st, r))}</div><div class="s">${recLine(r)}</div></div><button class="btn" data-action="recRestore" data-id="${r.id}">رجّعه مقترح</button></div>`).join('')}</div></details></div>`;
  h += `<div class="card prose"><p class="small">أربع مفاهيم مستقلة: <b>التكرار</b> (متكرر أو متغير)، <b>الضرورة</b> (ضروري أو كمالي)، <b>الالتزام</b>، و<b>فرص التوفير</b>. كل وحدة تتحدد بالأدق: التصنيف ← الفرعي ← التاجر أو المستفيد ← العملية. «الالتزامات المعروفة» = متكرر + التزام.</p></div>`;
  return h;
}
function sheetRecurring(id) {
  const st = store(), r = st.get('recurring', id); if (!r) return;
  openSheet(`<h3>${esc(E.subjectName(st, r))}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><div class="small muted">${recLine(r)}</div>
    <div class="grid2"><div><label class="f">التكرار</label><select id="rc_cad">${['weekly', 'monthly', 'yearly'].map(c => `<option value="${c}" ${r.cadence === c ? 'selected' : ''}>${CAD_L[c]}</option>`).join('')}</select></div><div><label class="f">المبلغ المعتاد</label><input type="text" inputmode="decimal" id="rc_amt" value="${r.expectedAmount}"></div></div>
    <label class="f"><input type="checkbox" id="rc_com" ${r.isCommitment ? 'checked' : ''}> التزام (يدخل «الالتزامات المعروفة» والقادمة في التوقع)</label>
    <label class="f"><input type="checkbox" id="rc_res" ${r.reserve ? 'checked' : ''}> احجز له (ينخصم من السيولة بقيمة دفعته القادمة)</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="recSave" data-id="${r.id}">${r.status === 'confirmed' ? 'حفظ' : 'أكّد'}</button><button class="btn" ${drillAttr(r.evidenceTxIds, 'عمليات ' + E.subjectName(st, r))}>العمليات</button>${r.status === 'confirmed' ? `<button class="btn r" data-action="recDismiss" data-id="${r.id}">مو متكرر</button>` : ''}</div>`);
}

/* ---------- الأموال المحجوزة ---------- */
function vReserves() {
  const st = store(), rt = E.reservesTotal(st, today0());
  let h = `<div class="card"><h2>الأموال المحجوزة <span class="sp"></span><button class="btn p" data-action="resEdit">+ حجز</button></h2><div class="bigv">${money(rt.total)}</div><p class="small muted">تنخصم من السيولة القابلة للصرف. الحجز اليدوي المربوط بالتزام متكرر يغني عن حجز الالتزام نفسه، فما ينخصم نفس الالتزام مرتين.</p></div>`;
  h += `<div class="card">${rt.items.length ? `<div class="list">${rt.items.map(i => `<div class="it" data-action="${i.kind === 'manual' ? 'resEdit' : 'recEdit'}" data-id="${i.id}">${icCircle({ color: i.kind === 'manual' ? PAL.blue : PAL.violet, icon: i.kind === 'manual' ? 'lock' : 'repeat' }, 's')}<div class="m"><div class="t">${esc(i.name)}</div><div class="s">${i.kind === 'manual' ? 'حجز يدوي' : 'من التزام متكرر مؤكد'}${i.dueDate ? ' · ' + fdate(i.dueDate, true) : ''}${i.recurringId && i.kind === 'manual' ? ' · مربوط بالتزام' : ''}</div></div><span class="num">${fmt(i.amount)}</span></div>`).join('')}</div>` : '<div class="muted">ما فيه حجوزات.</div>'}
    ${rt.skipped.length ? `<p class="small muted" style="margin-top:8px">ما انحسب مرتين: ${rt.skipped.map(x => esc(x.name) + ' (' + fmt(x.amount) + ')').join('، ')} — عليه حجز يدوي مربوط.</p>` : ''}</div>`;
  return h;
}
function sheetReserve(id) {
  const st = store(), r = id ? st.get('reserves', id) : { name: '', amount: '', dueDate: '', recurringId: null, active: true };
  const recs = st.all('recurring').filter(x => x.status === 'confirmed');
  openSheet(`<h3>${id ? 'تعديل الحجز' : 'حجز جديد'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">الاسم</label><input type="text" id="rs_name" value="${esc(r.name)}" placeholder="مثل: تأمين السيارة">
    <div class="grid2"><div><label class="f">المبلغ</label><input type="text" inputmode="decimal" id="rs_amt" value="${r.amount}"></div><div><label class="f">الموعد (اختياري)</label><input type="date" id="rs_due" value="${r.dueDate || ''}"></div></div>
    <label class="f">مربوط بالتزام متكرر (اختياري)</label><select id="rs_rec"><option value="">— لا —</option>${recs.map(x => `<option value="${x.id}" ${x.id === r.recurringId ? 'selected' : ''}>${esc(E.subjectName(st, x))} · ${fmt(x.expectedAmount)}</option>`).join('')}</select>
    <label class="f"><input type="checkbox" id="rs_on" ${r.active !== false ? 'checked' : ''}> مفعّل</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="resSave" data-id="${id || ''}">حفظ</button>${id ? `<button class="btn r" data-action="resDel" data-id="${id}">حذف</button>` : ''}</div>`);
}

/* ---------- فرص التوفير ---------- */
function vSavings() {
  const st = store(), which = S.savWhich || 'current', today = today0();
  const last = E.completeCycles(st, today, 1)[0];
  const so = E.savingsOpportunities(st, today, which === 'last' && last ? { cycle: last } : {});
  let h = `<div class="seg" style="margin-bottom:12px"><button class="${which !== 'last' ? 'on' : ''}" data-action="savWhich" data-v="current">الدورة الحالية (تقديري)</button><button class="${which === 'last' ? 'on' : ''}" data-action="savWhich" data-v="last" ${last ? '' : 'disabled'}>الدورة الماضية (فعلي)</button></div>`;
  if (!so) return h + `<div class="card empty">ما فيه دورة.</div>`;
  const MODE = { none: 'يحتاج دورة مكتملة وحدة على الأقل عشان يقارن.', compare: 'عندك دورة مكتملة وحدة: مقارنة فقط، بدون رقم فرصة.', preliminary: 'دورتان مكتملتان: تقدير أولي — التاريخ قصير، والرقم ممكن يتغير كثير.', median: 'المرجع الطبيعي = وسيط آخر 3 دورات مكتملة لكل تصنيف.' };
  h += `<div class="banner ${so.mode === 'median' ? 'i' : 'w'}">${MODE[so.mode]}</div>`;
  if (so.lowConfidence && so.isForecast) h += `<div class="banner w">توقع بثقة منخفضة — بيانات الفترة قليلة</div>`;
  if (so.total != null) h += `<div class="card"><h2>فرصة التوفير ${so.isForecast ? '<span class="fc">تقديري</span>' : ''}</h2><div class="bigv">${money(so.total)}</div><p class="small muted">مجموع التجاوزات الموجبة بس: كل تصنيف كمالي ومؤهل للتوفير ${so.isForecast ? '(توقعه لنهاية الدورة)' : '(فعلي)'} − الطبيعي له. التصنيف الأقل من طبيعته صفر، وما يعوّض غيره. التبرعات ما تدخل أبدًا.</p></div>`;
  h += `<div class="card"><h2>${fperiod(so.target)}</h2>${so.rows.length ? `<div class="list">${so.rows.map(r => `<div class="it" data-action="savDrill" data-cat="${esc(r.categoryId)}">${icCircle(catUi(r.categoryId === '__none' ? null : r.categoryId), 's')}<div class="m"><div class="t">${esc(bucketName(r.categoryId))}${r.opportunity > 0 ? ` <span class="b w">فرصة ${fmt(r.opportunity)}</span>` : ''}</div>
    <div class="s">${so.isForecast ? `الفعلي ${fmt(r.actual)}${r.upcoming ? ` + التزامات ${fmt(r.upcoming)}` : ''} ← التوقع ${fmt(r.forecast)}` : `الفعلي ${fmt(r.actual)}`}${r.normal != null ? ` · الطبيعي ${fmt(r.normal)}` : ''}</div>
    <div class="s">${r.history.map(x => fdate(x.cycle.start) + ': ' + fmt(x.amount)).join(' · ')}</div></div></div>`).join('')}</div>` : '<div class="muted">ما فيه صرف كمالي مؤهل للتوفير.</div>'}</div>`;
  h += `<div class="card"><h2>سيناريوهات (مو الرقم الأساسي)</h2><p class="small muted">لو خفضت كل صرفك الكمالي المؤهل${so.isForecast ? ' المتوقع' : ''} (${fmt(so.eligibleForecast)}):</p><div class="rows">${so.whatIf.map(w => rowR('', `${w.pct}%`, money(w.amount), '', '')).join('')}</div></div>`;
  h += `<div class="card prose"><p class="small">يدخل فقط الصرف اللي ضرورته «كمالي» ومؤهل لفرص التوفير (من التصنيف ← الفرعي ← التاجر أو المستفيد ← العملية). الدورة الحالية: الفعلي حتى اليوم + الالتزامات المؤكدة القادمة + معدل التصنيف المتغير × الأيام الباقية (نفس قاعدة التوقع).</p></div>`;
  return h;
}

/* ---------- الضروري والكمالي ---------- */
function vNecessity() {
  const st = store(), p = S.period, nb = E.necessityBreakdown(st, p);
  let h = periodBox(p, nb.total, { nav: true });
  h += `<div class="card rows">${['essential', 'discretionary', 'undefined'].map(k => rowR(`<span class="dot" style="background:${NEC_C[k]}"></span>`, NEC_L[k], money(nb[k].amount), `data-action="necDrill" data-v="${k}"`, `${nb[k].pct}%${k === 'undefined' ? ' · ما نخمّنه' : ''}`)).join('')}</div>`;
  h += `<div class="grid3">${['essential', 'discretionary', 'undefined'].map(k => `<div class="card"><h2 class="soft">أعلى ${NEC_L[k]}</h2>${nb[k].categories.length ? `<div class="list">${nb[k].categories.slice(0, 5).map(c => `<div class="it" data-action="necDrill" data-v="${k}" data-cat="${esc(c.categoryId)}">${icCircle(catUi(c.categoryId === '__none' ? null : c.categoryId), 's')}<div class="m"><div class="t">${esc(bucketName(c.categoryId))}</div></div><span class="num">${fmt(c.amount)}</span></div>`).join('')}</div>` : '<div class="muted small">لا يوجد</div>'}</div>`).join('')}</div>`;
  const year = Number(p.end.slice(0, 4)), tm = E.necessityTrendMonths(st, year), tc = E.necessityTrendCycles(st, today0(), 6);
  const trendTbl = (rows, lab) => { const mx = Math.max.apply(null, rows.map(r => r.total).concat([1])); return `<div class="tbl-wrap"><table><thead><tr><th></th><th class="n">ضروري</th><th class="n">كمالي</th><th class="n">غير محدد</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${lab(r)}</td><td class="n">${num(r.essential)}</td><td class="n">${num(r.discretionary)}</td><td class="n">${num(r.undefined)}</td><td style="width:30%">${stack(r, mx)}</td></tr>`).join('')}</tbody></table></div>`; };
  h += `<div class="card"><h2>الاتجاه عبر الأشهر (${year})</h2>${trendTbl(tm.filter(r => r.total), r => MONTHS[Number(r.period.start.slice(5, 7)) - 1])}</div>`;
  h += `<div class="card"><h2>الاتجاه عبر دورات الراتب</h2>${trendTbl(tc, r => fdate(r.period.start) + (r.open ? ' (حتى اليوم)' : ''))}</div>`;
  return h;
}
function stack(r, mx) { const w = (v) => mx > 0 ? Math.max(0, v / mx * 100) : 0; return `<div class="stack">${['essential', 'discretionary', 'undefined'].map(k => r[k] > 0 ? `<i style="width:${w(r[k])}%;background:${NEC_C[k]}"></i>` : '').join('')}</div>`; }

/* ---------- المقارنات ---------- */
function periodChoices() {
  const st = store(), today = today0(), out = [];
  E.listCycles(st, today).filter(c => c.start <= today).slice(0, 12).forEach(c => out.push({ key: `${c.start}|${c.end}|${c.kind}`, label: (c.kind === 'month' ? 'شهر ' : 'دورة ') + fperiod(c), p: c }));
  if (settings().cycleMode !== 'calendar') { let [y, m] = today.split('-').map(Number); for (let i = 0; i < 12; i++) { const p = E.monthPeriod(y, m); out.push({ key: `${p.start}|${p.end}|month`, label: `${MONTHS[m - 1]} ${y}`, p }); m--; if (m < 1) { m = 12; y--; } } }
  return out;
}
const pFromKey = (k) => { const [start, end, kind] = k.split('|'); return { start, end, kind: kind || 'custom' }; };
function vCompare() {
  const st = store(), C = S.cmp = S.cmp || { mode: 'periods', track: 'financial', unit: 'cycle', cityMode: 'approved', cityPer: 'all' };
  const ch = periodChoices();
  if (!C.a || !C.b) { const cyc = ch.filter(x => x.p.kind !== 'month' || settings().cycleMode === 'calendar'); C.b = (cyc[0] || ch[0] || {}).key; C.a = (cyc[1] || ch[1] || ch[0] || {}).key; }
  let h = `<div class="tabs">${[['periods', 'فترتين'], ['cities', 'مدينتين'], ['across', 'عبر الفترات']].map(([k, l]) => `<button class="${C.mode === k ? 'on' : ''}" data-action="cmpSet" data-f="mode" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="seg" style="margin-bottom:12px"><button class="${C.track !== 'products' ? 'on' : ''}" data-action="cmpSet" data-f="track" data-v="financial">العمليات المالية</button><button class="${C.track === 'products' ? 'on' : ''}" data-action="cmpSet" data-f="track" data-v="products">المنتجات</button></div>`;
  const tr = C.track === 'products' ? 'products' : 'financial';
  const catList = (s) => s.categories.length ? `<div class="list">${s.categories.map(c => `<div class="it" ${tr === 'products' ? `data-action="itemsDrill" data-pc="${esc(c.productCategoryId)}" data-pk="${esc(s.period.start + '|' + s.period.end)}"` : `data-action="cmpCat" data-cat="${esc(c.categoryId)}" data-pk="${esc(s.period.start + '|' + s.period.end + '|' + (s.period.kind || 'custom'))}"`}><div class="m"><div class="t">${esc(tr === 'products' ? pcName(c.productCategoryId) : bucketName(c.categoryId))}</div></div><span class="num">${fmt(c.amount)}</span></div>`).join('')}</div>` : '<div class="muted small">لا يوجد</div>';
  if (C.mode === 'periods') {
    const sel = (f, v) => `<select data-change="cmpSel" data-f="${f}">${ch.map(x => `<option value="${esc(x.key)}" ${x.key === v ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>`;
    const c = E.comparePeriodsFull(st, pFromKey(C.a), pFromKey(C.b), tr, today0());
    const col = (s, lab) => `<div class="card"><h2 class="soft">${lab}</h2><div class="bigv" ${tr === 'products' ? `data-action="itemsDrill" data-pk="${esc(s.period.start + '|' + s.period.end)}"` : `data-action="cmpTotal" data-pk="${esc(s.period.start + '|' + s.period.end + '|' + (s.period.kind || 'custom'))}"`}>${money(s.total)}</div><div class="small muted">${s.days} يوم${s.open ? ' (حتى اليوم)' : ''} · المتوسط اليومي <b class="num">${fmt(s.daily)}</b></div><h3 style="font-size:14px;margin:12px 0 4px">التصنيفات الأعلى</h3>${catList(s)}</div>`;
    h += `<div class="grid2"><div><label class="f">الفترة الأولى</label>${sel('a', C.a)}</div><div><label class="f">الفترة الثانية</label>${sel('b', C.b)}</div></div>`;
    if (c.a.open || c.b.open) h += `<div class="banner i" style="margin-top:10px">فترة ما انتهت (حتى اليوم): قارن المتوسط اليومي، لأن الإجمالي ما اكتمل.</div>`;
    h += `<div class="card" style="margin-top:12px"><div class="rows">${rowR('', 'الفرق (الثانية − الأولى)', money(c.diff, c.diff > 0 ? 'neg' : c.diff < 0 ? 'pos' : ''), '', c.pct != null ? `${c.pct > 0 ? '+' : ''}${c.pct}%` : 'ما فيه نسبة (الأولى صفر)')}${rowR('', 'فرق المتوسط اليومي', money(c.dailyDiff), '', 'المتوسط = الإجمالي ÷ عدد أيام الفترة، عشان ما يظلم اختلاف طولها')}</div></div>`;
    h += `<div class="grid2">${col(c.a, 'الأولى')}${col(c.b, 'الثانية')}</div>`;
  } else if (C.mode === 'cities') {
    const per = C.cityPer || 'all', today = today0(), cur = E.currentCycle(st);
    const period = per === 'all' ? null : per === 'year' ? E.yearOf(today) : per === 'cycle' ? cur : null;
    const sm = E.citiesSummary(st, null, C.cityMode);
    const opts = sm.map(x => x.cityId);
    if (!C.ca || !opts.includes(C.ca)) C.ca = opts[0] || '__unknown'; if (!C.cb || !opts.includes(C.cb)) C.cb = opts[1] || opts[0] || '__unknown';
    const sel = (f, v) => `<select data-change="cmpSel" data-f="${f}">${opts.map(id => `<option value="${esc(id)}" ${id === v ? 'selected' : ''}>${esc(cityName(id))}</option>`).join('')}</select>`;
    h += `<div class="seg" style="margin-bottom:8px">${[['all', 'كل الوقت'], ['year', 'هذي السنة'], ['cycle', 'الدورة الحالية']].map(([k, l]) => `<button class="${per === k ? 'on' : ''}" data-action="cmpSet" data-f="cityPer" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="seg" style="margin-bottom:8px"><button class="${C.cityMode !== 'withGps' ? 'on' : ''}" data-action="cmpSet" data-f="cityMode" data-v="approved">المعتمدة فقط</button><button class="${C.cityMode === 'withGps' ? 'on' : ''}" data-action="cmpSet" data-f="cityMode" data-v="withGps">تضمين اقتراحات الموقع</button></div>`;
    if (!opts.length) return h + `<div class="card empty">ما فيه عمليات لها مدينة للحين.</div>`;
    h += `<div class="grid2"><div><label class="f">المدينة الأولى</label>${sel('ca', C.ca)}</div><div><label class="f">المدينة الثانية</label>${sel('cb', C.cb)}</div></div>`;
    const col = (id) => { const s = E.cityStats(st, id, period, tr, C.cityMode); s.period = period || { start: '1990-01-01', end: '2099-12-31' };
      return `<div class="card"><h2 class="soft">${esc(cityName(id))}</h2><div class="bigv" ${tr === 'products' ? '' : `data-action="cityDrill" data-c="${esc(id)}" data-per="${per}"`}>${money(s.total)}</div><div class="small muted">${cnt(s.count, 'op')} · متوسط العملية <b class="num">${fmt(s.avg)}</b>${s.gpsCount ? ` · ${s.gpsCount} من اقتراح الموقع` : ''}</div><h3 style="font-size:14px;margin:12px 0 4px">التصنيفات الأعلى</h3>${catList(Object.assign(s, { period: s.period }))}</div>`; };
    h += `<div class="grid2" style="margin-top:12px">${col(C.ca)}${col(C.cb)}</div>`;
  } else {
    const ac = E.acrossPeriods(st, C.unit || 'cycle', 6, tr, today0()), mx = Math.max.apply(null, ac.rows.map(r => r.total).concat([1]));
    h += `<div class="seg" style="margin-bottom:12px">${[['week', 'أسبوع'], ['month', 'شهر'], ['cycle', 'دورة راتب']].map(([k, l]) => `<button class="${(C.unit || 'cycle') === k ? 'on' : ''}" data-action="cmpSet" data-f="unit" data-v="${k}">${l}</button>`).join('')}</div>`;
    h += `<div class="card"><h2>المتوسط لكل ${{ week: 'أسبوع', month: 'شهر', cycle: 'دورة' }[C.unit || 'cycle']} <span class="sp"></span>${ac.average != null ? money(ac.average) : '<span class="muted small">يحتاج فترة مكتملة</span>'}</h2><p class="small muted">المتوسط من الفترات المكتملة بس (${ac.completeCount}).</p>
      <div class="list">${ac.rows.map(r => `<div class="it" ${tr === 'products' ? `data-action="itemsDrill" data-pk="${esc(r.period.start + '|' + r.period.end)}"` : `data-action="cmpTotal" data-pk="${esc(r.period.start + '|' + r.period.end + '|' + (r.period.kind || 'custom'))}"`}><div class="m"><div class="t">${esc(fperiod(r.period))}${r.complete ? '' : ' <span class="b n">حتى اليوم</span>'}</div>${bar(r.total, mx, r.complete ? PAL.blue : PAL.gray)}</div><span class="num">${fmt(r.total)}</span></div>`).join('')}</div></div>`;
  }
  return h;
}

/* ---------- العرض السنوي ---------- */
function vAnnual() {
  const st = store(), y = S.year || Number(today0().slice(0, 4)), A0 = E.annualView(st, y);
  const yp = { start: `${y}-01-01`, end: `${y}-12-31`, kind: 'year' }, ser = E.spendSeries(st, yp, 'month');
  let h = `<div class="pbox"><div class="in"><button class="arr" data-action="yearShift" data-dir="-1">${ico('chevR')}</button><div class="mid"><div class="rg">سنة ${y}</div><div class="tot">${money(A0.spend)}</div></div><button class="arr" data-action="yearShift" data-dir="1" ${y >= Number(today0().slice(0, 4)) ? 'disabled' : ''}>${ico('chevL')}</button></div></div>`;
  h += chartSvg(ser, yp, { action: 'annualMonth' });
  h += `<div class="card rows">${rowR(dirI('inn', 'n'), 'الدخل', money(A0.income))}${rowR(dirI('out', 'o'), 'الإنفاق', money(A0.spend))}${rowR(dirI('wallet'), 'الفائض', money(A0.surplus, A0.surplus < 0 ? 'neg' : ''))}</div>`;
  const mx = Math.max.apply(null, A0.months.map(m => m.spend).concat([1]));
  const ms = A0.months.filter(m => m.txCount || m.spend || m.income);
  h += `<div class="card"><h2>الأشهر</h2>${ms.length ? `<div class="list">${ms.map(m => `<div class="it" data-action="annualMonth" data-d="${m.period.start.slice(0, 7)}"><div class="m"><div class="t">${MONTHS[m.month - 1]}${m.vsPrev == null ? '' : ` <span class="b ${m.vsPrev > 0 ? 'w' : 'g'}">${m.vsPrev > 0 ? '+' : '−'}${fmt(Math.abs(m.vsPrev))}${m.vsPrevPct != null ? ` (${m.vsPrevPct > 0 ? '+' : ''}${m.vsPrevPct}%)` : ''} عن اللي قبله</span>`}</div>
    ${bar(m.spend, mx, PAL.blue)}<div class="s">الدخل ${fmt(m.income)} · الفائض <span class="${m.surplus < 0 ? 'neg' : ''}">${fmt(m.surplus)}</span></div><div class="s">ضروري ${fmt(m.essential)} · كمالي ${fmt(m.discretionary)} · غير محدد ${fmt(m.undefined)}</div>${m.top.length ? `<div class="s">الأعلى: ${m.top.map(c => esc(bucketName(c.categoryId)) + ' ' + fmt(c.amount)).join('، ')}</div>` : ''}</div>${money(m.spend)}</div>`).join('')}</div>` : '<div class="muted">لا يوجد</div>'}</div>`;
  h += `<div class="grid2"><div class="card"><h2 class="soft">أعلى التجار في ${y}</h2>${A0.topMerchants.length ? `<div class="list">${A0.topMerchants.map(m => { const mm = st.get('merchants', m.merchantId); return `<div class="it" data-action="merchantDrill" data-id="${m.merchantId}"><div class="m"><div class="t">${esc(mm ? mm.name : '—')}</div><div class="s">${cnt(m.count, 'op')}</div></div>${money(m.amount)}</div>`; }).join('')}</div>` : '<div class="muted">لا يوجد</div>'}</div>
    <div class="card"><h2 class="soft">أعلى التصنيفات في ${y}</h2>${A0.topCategories.length ? `<div class="list">${A0.topCategories.map(c => `<div class="it" data-action="annualCat" data-cat="${esc(c.categoryId || '__none')}">${icCircle(catUi(c.categoryId), 's')}<div class="m"><div class="t">${esc(bucketName(c.categoryId))}</div></div>${money(c.amount)}</div>`).join('')}</div>` : '<div class="muted">لا يوجد</div>'}</div></div>`;
  h += `<p class="small muted" style="text-align:center">العرض السنوي بالأشهر الميلادية. تحليل دورات الراتب في «صرفياتك» و«الضروري والكمالي».</p>`;
  return h;
}

/* ---------- المدن ---------- */
function vCities() {
  const st = store(), mode = S.cityMode === 'withGps' ? 'withGps' : 'approved', per = S.cityPer || 'cycle', today = today0();
  const period = per === 'all' ? null : per === 'year' ? E.yearOf(today) : E.currentCycle(st);
  const list = E.citiesSummary(st, period, mode), mx = Math.max.apply(null, list.map(x => x.amount).concat([1]));
  let h = `<div class="seg" style="margin-bottom:8px">${[['cycle', 'الدورة الحالية'], ['year', 'هذي السنة'], ['all', 'كل الوقت']].map(([k, l]) => `<button class="${per === k ? 'on' : ''}" data-action="citySet" data-f="cityPer" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="seg" style="margin-bottom:12px"><button class="${mode === 'approved' ? 'on' : ''}" data-action="citySet" data-f="cityMode" data-v="approved">المعتمدة فقط</button><button class="${mode === 'withGps' ? 'on' : ''}" data-action="citySet" data-f="cityMode" data-v="withGps">تضمين اقتراحات الموقع</button></div>`;
  h += `<div class="card"><h2>وين تصرف</h2><p class="small muted">المدينة تخص العملية نفسها. ${mode === 'approved' ? 'الأرقام للمدن اللي اعتمدتها فقط؛ اقتراح الموقع غير المعتمد ينحسب «غير محددة» إلا إذا اخترت «تضمين اقتراحات الموقع».' : 'معها اقتراحات الموقع غير المعتمدة (تقديرية، مو الرقم الرسمي).'} «مدينتي الحالية» (${esc(cityName(settings().currentCityId))}) ما تعتبر حقيقة، فما تدخل هنا.</p>${list.length ? `<div class="list">${list.map(x => `<div class="it" data-action="cityDrill" data-c="${esc(x.cityId)}" data-per="${per}"><div class="m"><div class="t">${esc(cityName(x.cityId))}</div>${bar(x.amount, mx, x.cityId === '__unknown' ? PAL.gray : PAL.red)}<div class="s">${cnt(x.count, 'op')} · متوسط ${fmt(x.count ? x.amount / x.count : 0)}</div></div>${money(x.amount)}</div>`).join('')}</div>` : '<div class="muted">لا يوجد</div>'}</div>`;
  const custom = st.all('cities').filter(c => c.custom);
  h += `<div class="card"><h2>إدارة المدن <span class="sp"></span><button class="btn" data-action="cityAdd">+ مدينة</button></h2><p class="small muted">كل مدينة لها رقم ثابت وأسماء بديلة (بريدة / بريده / Buraidah = مدينة وحدة). المدن اللي انضافت من الموقع تقدر تدمجها في مدينة موجودة.</p>
    ${custom.length ? `<div class="list">${custom.map(c => `<div class="it" data-action="cityEdit" data-c="${esc(c.id)}"><div class="m"><div class="t">${esc(c.name)} <span class="b n">مضافة</span></div><div class="s">${esc((c.aliases || []).join('، '))}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div>` : ''}</div>`;
  return h;
}
function sheetCityEdit(id) {
  const st = store(), c = id ? st.get('cities', id) : { name: '', aliases: [] };
  const others = st.all('cities').filter(x => x.id !== id && x.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  openSheet(`<h3>${id ? 'تعديل المدينة' : 'مدينة جديدة'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">الاسم</label><input type="text" id="ct_name" value="${esc(c.name)}"><label class="f">أسماء بديلة (كل اسم في سطر)</label><textarea id="ct_al" rows="3">${esc((c.aliases || []).filter(a => a !== c.name).join('\n'))}</textarea>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="citySave" data-c="${esc(id || '')}">حفظ</button></div>
    ${id ? `<h3 style="margin-top:16px;font-size:15px">دمجها في مدينة ثانية</h3><div class="grid2"><select id="ct_into">${others.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select><button class="btn" data-action="cityMerge" data-c="${esc(id)}">دمج</button></div>` : ''}`);
}

/* ---------- المنتجات والأغراض ---------- */
function vProducts() {
  const st = store(), p = S.period, ps = E.productSpend(st, p), any = st.all('transactions').some(t => (t.items || []).length);
  let h = periodBox(p, ps.total, { nav: true });
  h += `<p class="small muted" style="text-align:center">من أغراض الفواتير بس. رقم منفصل عن الإنفاق المالي، وما ينجمع معه.${ps.estimated ? ' فيه <b>توزيع تقديري</b> لاستردادات ما تحددت أغراضها.' : ''}</p>`;
  if (!any) return h + `<div class="card empty">${icCircle({ color: PAL.yellow, icon: 'box' })}<p>افتح أي عملية شراء واضغط «أضف أغراض الفاتورة». الغرض ما يغيّر مبلغ العملية، والباقي يظهر «غير مفصل».</p></div><div class="card"><div class="linkrow" data-action="go" data-view="pcats">${ico('grid')}<span>تصنيفات المنتجات</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  const mx = ps.categories.length ? ps.categories[0].amount : 1;
  h += `<div class="card"><h2>حسب تصنيف المنتج</h2>${ps.categories.length ? `<div class="list">${ps.categories.map(c => { const pc = st.get('productCategories', c.productCategoryId); return `<div class="it" data-action="itemsDrill" data-pc="${esc(c.productCategoryId)}">${icCircle(pcatUi(pc), 's')}<div class="m"><div class="t">${esc(pcName(c.productCategoryId))}</div>${bar(c.amount, mx, pc ? PAL[pc.color] : PAL.gray)}<div class="s">${c.count} غرض</div></div>${money(c.amount)}</div>`; }).join('')}</div>` : '<div class="muted">ما فيه أغراض في هذي الفترة.</div>'}</div>`;
  h += `<div class="card"><h2>أعلى المنتجات</h2>${ps.products.length ? `<div class="list">${ps.products.slice(0, 10).map(x => `<div class="it" data-action="itemsDrill" data-prod="${esc(x.productId || '')}"><div class="m"><div class="t">${esc(x.name)}</div><div class="s">الكمية ${x.qty} · ${x.count} مرة</div></div>${money(x.amount)}</div>`).join('')}</div>` : '<div class="muted">لا يوجد</div>'}
    <div class="linkrow" data-action="itemsDrill">${ico('list')}<span>كل الأغراض في الفترة</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  h += `<div class="card"><div class="linkrow" style="margin-top:-18px;border-top:0" data-action="go" data-view="pcats">${ico('grid')}<span>تصنيفات المنتجات</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  return h;
}
function vItems() {
  const st = store(), f = S.itemsF || {}, rows = E.itemRows(st, f.allTime ? null : (f.period || S.period), f);
  const total = E.round2(rows.reduce((s, r) => s + r.net, 0)), lab = [];
  if (f.productCategoryId !== undefined) lab.push(pcName(f.productCategoryId));
  if (f.productId) { const p = st.get('products', f.productId); lab.push(p ? p.name : 'منتج'); }
  if (f.groupId) { const g = st.get('groups', f.groupId); lab.push('المجموعة: ' + (g ? g.name : '')); }
  lab.push(f.allTime ? 'كل الوقت' : fperiod(f.period || S.period));
  let h = `<div class="card"><h2>${esc(lab.join(' · '))}</h2><div class="muted small">${rows.length} غرض · صافيها ${fmt(total)}</div></div>`;
  if (!rows.length) return h + `<div class="card empty">لا يوجد.</div>`;
  h += `<div class="card"><div class="list">${rows.map(r => `<div class="it" data-action="openTx" data-id="${r.tx.id}">${icCircle(pcatUi(st.get('productCategories', r.item.productCategoryId)), 's')}<div class="m"><div class="t">${esc(r.item.name)}</div><div class="s">${esc(txTitle(r.tx))} · ${fdate(r.date, true)} · <span class="num">${fmt(r.item.qty)} × ${fmt(r.item.unitPrice)}</span>${r.allocated ? ` · مسترجع ${fmt(r.allocated)}` : ''}${r.estimated ? ` · <span class="warn-t">تقديري −${fmt(r.estimated)}</span>` : ''}</div></div><span class="num">${fmt(r.net)}</span></div>`).join('')}</div></div>`;
  return h;
}
function vPcats() {
  const st = store(), list = st.all('productCategories').sort((a, b) => (a.order || 0) - (b.order || 0));
  const use = new Map(); st.all('transactions').forEach(t => (t.items || []).forEach(i => { if (i.productCategoryId) use.set(i.productCategoryId, (use.get(i.productCategoryId) || 0) + 1); }));
  return `<div class="card"><h2>تصنيفات المنتجات <span class="sp"></span><button class="btn p" data-action="pcatEdit">+ تصنيف</button></h2><p class="small muted">منفصلة تمامًا عن التصنيفات المالية. الحذف ما يحذف أي غرض: ينتقل لتصنيف تختاره أو يبقى بدون تصنيف.</p>
    <div class="list">${list.map(c => `<div class="it" data-action="pcatEdit" data-id="${c.id}">${icCircle(pcatUi(c), 's')}<div class="m"><div class="t">${esc(c.name)}${c.active === false ? ' <span class="b n">معطّل</span>' : ''}</div><div class="s">${use.get(c.id) || 0} غرض</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div></div>`;
}
function sheetPcat(id) {
  const st = store(), c = id ? st.get('productCategories', id) : { name: '', emoji: '', color: '', active: true };
  const others = st.all('productCategories').filter(x => x.id !== id && x.active !== false);
  openSheet(`<h3>${id ? 'تصنيف منتجات' : 'تصنيف منتجات جديد'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">الاسم</label><input type="text" id="pc_name" value="${esc(c.name)}">
    <label class="f">الإيموجي</label><input type="text" id="ce_emoji" value="${esc(c.emoji || '')}" style="width:84px;text-align:center;font-size:22px">
    <label class="f">اللون</label><input type="hidden" id="ce_color" value="${esc(c.color || '')}"><div class="colors">${CAT_COLORS.map(x => `<button type="button" data-action="ceColor" data-c="${x}" class="${c.color === x ? 'on' : ''}" style="background:${PAL[x]}"></button>`).join('')}</div>
    ${id ? `<label class="f"><input type="checkbox" id="pc_on" ${c.active !== false ? 'checked' : ''}> مفعّل (المعطّل ما يظهر في الاختيار، وأغراضه باقية)</label>` : ''}
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="pcatSave" data-id="${id || ''}">حفظ</button></div>
    ${id ? `<h3 style="margin-top:16px;font-size:15px">حذف</h3><div class="grid2"><select id="pc_move"><option value="">الأغراض تبقى بدون تصنيف</option>${others.map(x => `<option value="${x.id}">انقلها لـ «${esc(x.name)}»</option>`).join('')}</select><button class="btn r" data-action="pcatDel" data-id="${id}">حذف</button></div>` : ''}`);
}

/* ---------- المجموعات ---------- */
function groupBar(s) { if (!s.budget) return ''; const c = s.level === 'over' ? 'var(--neg)' : s.level === 'warn' ? 'var(--warn)' : 'var(--pos)'; return `<div class="track"><div style="width:${Math.min(100, s.pct)}%;background:${c}"></div></div>`; }
function vGroups() {
  const st = store(), gs = st.all('groups').sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  let h = `<div class="card"><h2>المجموعات <span class="sp"></span><button class="btn p" data-action="groupEdit">+ مجموعة</button></h2><p class="small muted">طريقة تجميع مستقلة عن التصنيف (رحلة، زواج، رمضان، تأثيث…). العملية كاملة أو غرض منها. كل مجموعة تنحسب لحالها، ومجاميعها ما تنجمع مع بعض ولا مع الإنفاق العام.</p></div>`;
  if (!gs.length) return h;
  h += `<div class="card"><div class="list">${gs.map(g => { const s = E.groupStats(st, g.id); return `<div class="lim" data-action="groupOpen" data-id="${g.id}"><span class="ic s" style="background:${tint(PAL[g.color] || PAL.green)};color:${PAL[g.color] || PAL.green}">${g.emoji ? `<span class="emo">${esc(g.emoji)}</span>` : ico('tag')}</span><div class="m"><div class="lt"><b>${esc(g.name)}</b>${g.active === false ? ' <span class="b n">منتهية</span>' : ''}<span class="sp"></span><span class="num small">${fmt(s.spend)}${s.budget ? ' / ' + fmt(s.budget) : ''}</span></div>${groupBar(s)}<div class="small muted">${cnt(s.count, 'op')}${s.budget ? ` · ${s.level === 'over' ? `<span class="neg">تجاوزت بـ ${fmt(-s.remaining)}</span>` : `باقي ${fmt(s.remaining)} · ${s.pct}%`}` : ''}${g.startDate ? ' · ' + fdate(g.startDate) + (g.endDate ? ' – ' + fdate(g.endDate, true) : '') : ''}</div></div></div>`; }).join('')}</div></div>`;
  return h;
}
function vGroup() {
  const st = store(), s = E.groupStats(st, S.groupId); if (!s) return `<div class="card empty">المجموعة غير موجودة.</div>`;
  const g = s.group;
  let h = `<div class="card"><h2>${g.emoji ? esc(g.emoji) + ' ' : ''}${esc(g.name)}<span class="sp"></span><button class="btn" data-action="groupEdit" data-id="${g.id}">تعديل</button></h2>${g.description ? `<p class="small">${esc(g.description)}</p>` : ''}
    <div class="bigv">${money(s.spend)}</div>${groupBar(s)}<div class="small muted">${s.budget ? `الميزانية ${fmt(s.budget)} · ${s.level === 'over' ? `<span class="neg">تجاوزت بـ ${fmt(-s.remaining)}</span>` : `المتبقي ${fmt(s.remaining)}`} · ${s.pct}% · ` : ''}${cnt(s.count, 'op')}</div>
    <p class="small muted" style="margin-top:8px">= العمليات الكاملة في المجموعة + الأغراض اللي عمليتها مو في المجموعة (ما يتكرر شي).</p></div>`;
  h += `<div class="grid2"><div class="card"><h2 class="soft">أعلى التصنيفات</h2>${s.categories.length ? `<div class="list">${s.categories.slice(0, 6).map(c => `<div class="it" style="cursor:default">${icCircle(catUi(c.categoryId.startsWith('__') ? null : c.categoryId), 's')}<div class="m"><div class="t">${esc(bucketName(c.categoryId))}</div></div>${money(c.amount)}</div>`).join('')}</div>` : '<div class="muted">لا يوجد</div>'}</div>
    <div class="card"><h2 class="soft">أعلى المنتجات</h2>${s.products.length ? `<div class="list">${s.products.slice(0, 6).map(p => `<div class="it" data-action="itemsDrill" data-group="${g.id}"><div class="m"><div class="t">${esc(p.name)}</div><div class="s">الكمية ${p.qty}</div></div>${money(p.amount)}</div>`).join('')}</div>` : '<div class="muted">لا يوجد</div>'}</div></div>`;
  const txs = s.txIds.map(id => st.get('transactions', id)).filter(Boolean).sort(sortTx);
  h += `<div class="card"><h2>العمليات</h2>${txs.length ? txs.map(t => txRow(t, true)).join('') : '<div class="muted">ما فيه. أضف عملية من صفحتها («+ مجموعة»).</div>'}<div class="linkrow" data-action="groupTxs" data-id="${g.id}">${ico('list')}<span>في قائمة العمليات (مع المجموع)</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  return h;
}
function sheetGroup(id) {
  const st = store(), g = id ? st.get('groups', id) : { name: '', description: '', emoji: '', color: '', startDate: '', endDate: '', budget: '', active: true };
  openSheet(`<h3>${id ? 'تعديل المجموعة' : 'مجموعة جديدة'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">الاسم</label><input type="text" id="gr_name" value="${esc(g.name)}" placeholder="مثل: رحلة أبها"><label class="f">الوصف</label><input type="text" id="gr_desc" value="${esc(g.description || '')}">
    <div class="grid2"><div><label class="f">الإيموجي</label><input type="text" id="ce_emoji" value="${esc(g.emoji || '')}" style="text-align:center;font-size:22px"></div><div><label class="f">الميزانية (اختياري)</label><input type="text" inputmode="decimal" id="gr_budget" value="${g.budget || ''}"></div>
    <div><label class="f">من (اختياري)</label><input type="date" id="gr_start" value="${g.startDate || ''}"></div><div><label class="f">إلى (اختياري)</label><input type="date" id="gr_end" value="${g.endDate || ''}"></div></div>
    <label class="f">اللون</label><input type="hidden" id="ce_color" value="${esc(g.color || '')}"><div class="colors">${CAT_COLORS.map(x => `<button type="button" data-action="ceColor" data-c="${x}" class="${g.color === x ? 'on' : ''}" style="background:${PAL[x]}"></button>`).join('')}</div>
    ${id ? `<label class="f"><input type="checkbox" id="gr_on" ${g.active !== false ? 'checked' : ''}> مفعّلة (المنتهية ما تظهر في الاختيار)</label>` : ''}
    <p class="small muted">تنبيه عند ${settings().limitAlertPct || 80}% و100% من الميزانية.</p>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="groupSave" data-id="${id || ''}">حفظ</button>${id ? `<button class="btn r" data-action="groupDel" data-id="${id}">حذف</button>` : ''}</div>`);
}

/* ---------- التنبيهات ---------- */
function vAlerts() {
  const all = cachedAlerts(), act = all.filter(a => !a.hidden), hid = all.filter(a => a.hidden);
  let h = `<div class="card"><h2>التنبيهات</h2><p class="small muted">تنحسب من بياناتك وقت العرض. «إخفاء» يخفي نفس التنبيه نهائيًا، و«ذكرني» يأجله. التنبيه الجديد (مثل تجاوز بعد 80%) يطلع لحاله.</p></div>`;
  h += act.length ? act.map(a => `<div class="card al ${a.level}"><div data-action="alertOpen" data-id="${esc(a.id)}" style="cursor:pointer"><b>${esc(a.title)}</b><div class="small muted">${esc(a.body)}</div></div><div class="btns" style="margin-top:8px"><button class="btn" data-action="alertOpen" data-id="${esc(a.id)}">افتح</button><button class="btn" data-action="alertSnooze" data-id="${esc(a.id)}" data-d="1">ذكرني بكرة</button><button class="btn" data-action="alertSnooze" data-id="${esc(a.id)}" data-d="7">بعد أسبوع</button><button class="btn" data-action="alertDismiss" data-id="${esc(a.id)}">إخفاء</button></div></div>`).join('') : `<div class="card empty">ما فيه تنبيهات.</div>`;
  if (hid.length) h += `<div class="card"><details><summary class="muted">مخفية أو مؤجلة (${hid.length})</summary><div class="list">${hid.map(a => `<div class="it" style="cursor:default"><div class="m"><div class="t">${esc(a.title)}</div><div class="s">${a.snoozed ? 'مؤجل' : 'مخفي'}</div></div><button class="btn" data-action="alertRestore" data-id="${esc(a.id)}">رجّعه</button></div>`).join('')}</div></details></div>`;
  return h;
}

/* ---------- طريقة الحساب (1.5.0) ---------- */
function methods150() {
  return `<h3>1.5.0: قاعدة ما ينحسب شي مرتين</h3><ul>
  <li><b>التحليل المالي يقرأ العمليات، وتحليل المنتجات يقرأ الأغراض</b>، وما ينجمع الرقمين أبدًا.</li>
  <li><b>السحب النقدي</b> = المصروف وقت السحب. الأجزاء والأغراض داخله توزيع بس.</li>
  <li><b>المبلغ اللي رجع من السحب للبنك</b>: تربط الإيداع بالسحب، فينقص أثر السحب نفسه على تاريخ السحب (مرة وحدة)، والإيداع نفسه أثره صفر. يدعم أكثر من إيداع، ومجموعها ما يتجاوز أصل السحب (فأثره ما يصير سالب). الإيداع المربوط بجزء ينقص ذاك الجزء، وغيره ينقص الباقي تحت «سحب نقدي». رصيد النقد ينقص بالمعاد من الباقي. معادلة التدقيق فيها سطر «المبالغ المعادة من السحوبات».</li>
  <li><b>الاسترداد</b> ينخصم من أثر العملية الأصلية مرة وحدة، على فترتها، ويبقى بتاريخ وصوله.</li>
  <li><b>المجموعات</b>: العملية كاملة، أو الأغراض اللي عمليتها مو في نفس المجموعة. العملية في مجموعتين تنحسب في كل وحدة، ومجاميع المجموعات ما تنجمع.</li>
  <li><b>الحجوزات</b>: حجز يدوي مربوط بالتزام متكرر يغني عن حجز الالتزام نفسه.</li></ul>
  <h3>الأغراض والمنتجات</h3><p>الغرض داخل العملية: الاسم، التصنيف، الكمية (1 افتراضيًا)، سعر الوحدة، الإجمالي، علامة خصم (معلوماتية)، ملاحظة، مجموعات، وللسحب: الجزء. سقف الأغراض = الأصل إذا الرسوم مفصولة ومعروفة، وإلا الإجمالي؛ وللسحب صافي السحب بعد المعاد، والغرض المربوط بجزء ما يتجاوز قيمة الجزء. «غير مفصل» = السقف − مجموع الأغراض، ينحسب وقت العرض وما ينحفظ. فهرس المنتجات للاقتراح بس (الاسم، التصنيف، آخر سعر وحدة، آخر كمية) ويتحدث من الأغراض، والاقتراح ما يغيّر أي قيمة إلا إذا اخترته. تصنيفات المنتجات منفصلة عن المالية، وحذفها ما يحذف غرض. حد صرف لتصنيف منتجات = صافي أغراضه في الدورة. حذف تصنيف له حد مع نقل أغراضه لتصنيف ثاني: إذا الثاني ما له حد ينتقل له حد المحذوف، وإذا له حد يبقى حده وينحذف حد المحذوف (ما يصير حدين لنفس التصنيف). الحذف بدون نقل يحذف حده. <b>الاسترداد والأغراض</b>: تحدد المبلغ لكل غرض رجعته فينقص هو بس؛ اللي ما تحدده ينوزع «توزيع تقديري» بالنسبة على الباقي من الفاتورة (الأغراض وغير المفصل)؛ الاسترداد الكامل يلغي كل الأغراض. إذا صارت الأغراض أكبر من سقف العملية (مثل لما يفصل الكشف الرسوم بعدين) تتقلص بالنسبة في التحليل.</p>
  <h3>المدينة</h3><p>المدينة تخص العملية مو التاجر. الاختصار يرسل اسم المدينة بس (بدون إحداثيات) كاقتراح، وما يصير معتمد إلا بموافقتك. ترتيب الثقة: المعتمدة ← اقتراح الموقع ← مدينتك الحالية (اقتراح احتياطي فقط) ← غير معروفة. اقتراح جديد ما يغيّر مدينة معتمدة. لما تعتمد مدينة غير مدينتك الحالية يسألك: تجعلها الحالية؟ («لا تسألني الآن» = ما يسألك لمدة يوم). الأسماء تتوحد بالرقم الثابت والأسماء البديلة، والمدينة الجديدة من الموقع تنضاف بدل ما تنتجاهل. «استخدام موقعي الحالي» في الإدخال اليدوي يلقى أقرب مدينة من جدول مدن على جهازك (مركز كل مدينة ونصف قطر تقريبي)، بدون أي خدمة خارجية، وما تنحفظ الإحداثيات. إذا اندمجت رسالة وكشف، مدينة الرسالة تبقى. <b>مدينة متأخرة</b>: الاختصار يرسل الرسالة أول ثم المدينة. إذا التطبيق سحب الرسالة قبل ما توصل مدينتها (مثلًا كان مفتوح وقتها)، الصندوق يحفظ المدينة مستقلة برقم الرسالة نفسه، والتطبيق يسحبها في الجلب الجاي ويربطها بنفس الرسالة وعمليتها (أو المعلّقة في المراجعة) كاقتراح موقع فقط: ما تغيّر مدينة معتمدة ولا اقتراح موجود. وبعد ما تنحفظ على جهازك يؤكد استلامها فتنحذف من الصندوق. تحديث مدينة ما انسحب ينحذف من الصندوق بعد 7 أيام.</p>
  <h3>تحليل المدن</h3><p>الافتراضي في شاشة المدن ومقارنة مدينتين والتنقل للعمليات: <b>المدن المعتمدة فقط</b>، وهو الرقم الرسمي. عملية لها اقتراح موقع ما اعتمدته تنحسب «غير محددة»، وما تدخل مدينتها إلا إذا اخترت «تضمين اقتراحات الموقع» (رقم تقديري). مدينتك الحالية ما تدخل التحليل أبدًا.</p>
  <h3>الالتزامات والاشتراكات</h3><p>أربع مفاهيم مستقلة: التكرار، الضرورة، الالتزام، فرص التوفير. السلسلة: التصنيف ← الفرعي ← التاجر أو المستفيد (نفس المستوى) ← العملية. «الالتزامات المعروفة» = دفع أو تحويل لشخص متكرر + التزام. <b>الاكتشاف الآلي</b> (مقترح فقط): نفس التاجر أو المستفيد ونفس الحساب؛ شهري = فاصل 26–35 يوم و3 عمليات على الأقل، أسبوعي = 6–8 أيام و4 عمليات، سنوي = 350–380 يوم وعمليتين؛ كل مبلغ بين 60% و140% من الوسيط؛ وآخر عملية حديثة (شهري 45 يوم، أسبوعي 11، سنوي 400). المبلغ المعتاد = وسيط آخر 3. المرفوض ما يرجع يقترح. بعد تأكيده: عملياته القريبة المبلغ (70%–130% من المعتاد) تصير متكررة، والتزام إذا اخترت. القادم: من آخر عملية + التكرار، والمتأخر لين 7 أيام يبقى مستحق.</p>
  <h3>معدل الإنفاق المتغير والتوقع</h3><p>الإنفاق المتغير = الإنفاق الحقيقي ناقص الالتزامات المتكررة المعروفة واستثناءاتك (تبدأ فاضية). السحب والخارج غير المعروف يبقون صرف. المعدلات: الدورة الحالية (المتغير ÷ الأيام اللي مضت)، آخر 7 أيام داخل الدورة، والأيام المنقضية (كل الصرف ÷ الأيام). <b>معدل التوقع</b>: 7 أيام أو أكثر = معدل الدورة الحالية؛ أقل = وسيط معدل آخر 3 دورات مكتملة (الدورة المكتملة = انتهت وبياناتك تغطيها من أولها)؛ ما فيه 3 = الدورة الحالية بثقة منخفضة. ما تنخلط أيام دورتين. <b>التوقع</b> = صرف حتى اليوم + الالتزامات المؤكدة المتبقية قبل نهاية الدورة + المعدل × الأيام الباقية (بدون اليوم). الفائض المتوقع = دخل الدورة − التوقع. كل رقم مستقبلي عليه «توقع».</p>
  <h3>الأرصدة والسيولة</h3><p>كل رصيد معروف ينحفظ في سجل (الرصيد، وقته، مصدره) وما ينمسح؛ حذف كشف يعلّم رصيده ملغى. رصيد رسالة الحساب الجاري يُستخدم إذا: الحساب معروف (مو مؤقت)، الرسالة انقرأت كاملة وما لها مراجعة، فيها كلمة «الرصيد»، لها وقت (من الرسالة أو وقت وصولها للاختصار)، وأحدث من رصيد الكشف. رسائل البطاقة الائتمانية ما يُؤخذ منها رصيد (المتاح مو سيولة). <b>السيولة القابلة للصرف</b> = الحسابات القابلة للصرف (الجاري والمحفظة تلقائيًا) + النقد − مستحق البطاقات − الأموال المحجوزة. رصيد الحساب = آخر سجل + العمليات بعده؛ مستحق البطاقة = آخر كشف + المشتريات بعده − السداد والاستردادات بعده. الادخار ما يدخل، والحساب غير المحدد يظهر «سيولة غير محددة»، والرصيد الدائن في البطاقة منفصل. السحب المستبعد ما يزيد النقد.</p>
  <h3>فرص التوفير</h3><p>تدخل الأجزاء الكمالية والمؤهلة للتوفير بس، والتبرعات أبدًا. لكل تصنيف: الفعلي (أو التوقع لنهاية الدورة الحالية) − الطبيعي؛ الموجب فرصة، والسالب صفر وما يعوّض غيره. الطبيعي: 3 دورات مكتملة أو أكثر = وسيط آخر 3؛ دورتان = تقدير أولي بتحذير؛ دورة = مقارنة بس. سيناريوهات 10% و20% و30% منفصلة.</p>
  <h3>الضروري والكمالي، السنوي، المقارنات</h3><p>الضرورة لكل جزء من الإنفاق بالسلسلة (أجزاء السحب بضرورة تصنيفها، الرسوم ضرورية)، واللي ما له ضرورة «غير محدد» ما نخمّنه. السنوي من يناير لديسمبر. المقارنات: فترتين (الفرق والنسبة والمتوسط اليومي = الإجمالي ÷ أيام الفترة، وللفترة المفتوحة الأيام اللي مضت)، مدينتين (المجموع، العدد، متوسط العملية)، وعبر الفترات (أسبوع، شهر، دورة، والمتوسط من المكتملة). المسار مالي أو منتجات، ما ينخلطون.</p>
  <h3>التنبيهات</h3><p>مركز واحد، وكل تنبيه ينحسب من البيانات: حد صرف (80% أو نسبتك، و100%)، ميزانية مجموعة، التزام خلال 3 أيام، اشتراك محتمل للمراجعة، ارتفاع غير معتاد (تصنيف حتى اليوم أكثر من 150% من وسيط نفس الأيام في آخر 3 دورات، وبفرق 100 ريال على الأقل)، توقع يتجاوز المعتاد (أكثر من 110% من وسيط آخر 3 دورات، وبفرق 200)، وسيولة أقل من الالتزامات القادمة اللي ما لها حجز. «إخفاء» و«ذكرني» ينحفظون بمفتاح التنبيه، فما يتكرر.</p>
  <h3>التتبع</h3><p>كل رقم في التحليل ينضغط ويفتح العمليات (أو الأغراض) اللي كوّنته، وأرقام التوقع تعرض مكوناتها.</p>`;
}

/* ---------- الأوامر (1.5.0) ---------- */
const V150 = { insights: vInsights, forecast: vForecast, liquidity: vLiquidity, commitments: vCommitments, reserves: vReserves, savings: vSavings, necessity: vNecessity, compare: vCompare,
  annual: vAnnual, cities: vCities, products: vProducts, items: vItems, pcats: vPcats, groups: vGroups, group: vGroup, alerts: vAlerts };
const PCAT_ERR = { name: 'اكتب الاسم', dup: 'فيه تصنيف بنفس الاسم' }, GROUP_ERR = { name: 'اكتب اسم المجموعة', budget: 'الميزانية غير صحيحة', dates: 'تاريخ البداية بعد النهاية' };
Object.assign(A, {
  drillIds: (el) => { const d = S.drillSets.get(el.dataset.k); if (!d) return; closeSheet(); go('txs', { filters: Object.assign({ kind: 'all', allTime: true, txIds: d.ids, label: d.label }, d.extra) }); },
  // المدينة
  cityPick: async (el) => { const id = el.dataset.id, t = store().get('transactions', id); if (!t) return; const c = await pickCity({ cur: t.cityId }); if (!c) return; await approveCity(id, c); },
  cityApprove: async (el) => approveCity(el.dataset.id, el.dataset.c),
  cityDismiss: async (el) => { E.dismissTxCity(store(), el.dataset.id); await persist('المدينة غير محددة'); render(); afterTx(el.dataset.id); },
  cityChoose: (el) => finishCity(el.dataset.c),
  cityClose: () => finishCity(null),
  cityBg: (el, ev) => { if (ev.target === el) finishCity(null); },
  cityNew: async () => { const name = prompt('اسم المدينة'); if (!name) return; const r = E.saveCity(store(), { name }); if (r.error === 'dup') return finishCity(r.city.id); if (r.error) return toast('الاسم غير صالح (بدون أرقام)'); await persist('مدينة جديدة'); finishCity(r.city.id); },
  mCityPick: async () => { const c = await pickCity({ cur: $('m_city') ? $('m_city').value : null }); if (!c || !$('m_city')) return; $('m_city').value = c; $('m_scity').value = ''; $('m_citybtn').innerHTML = `${ico('pin')} ${esc(cityName(c))}`; $('m_cityinfo').textContent = 'معتمدة لهذي العملية.'; },
  mCityGps: () => {
    const info = $('m_cityinfo'); if (!navigator.geolocation) { info.textContent = 'الجهاز ما يدعم تحديد الموقع.'; return; }
    info.textContent = 'جاري تحديد الموقع…';
    navigator.geolocation.getCurrentPosition(pos => {
      const r = E.cityFromCoords(pos.coords.latitude, pos.coords.longitude); // الإحداثيات ما تنحفظ
      if (!$('m_scity')) return;
      if (r && r.cityId) { $('m_scity').value = r.cityId; info.innerHTML = `📍 <b>${esc(r.name)}</b> — مقترحة من موقعك. تعتمدها من صفحة العملية بعد الحفظ، أو اضغط «اختر المدينة».`; }
      else info.textContent = r ? `ما قدرت أحدد المدينة (أقرب مدينة ${r.nearest} على بعد ${r.km} كم). اختر المدينة بنفسك.` : 'ما قدرت أحدد المدينة.';
    }, () => { if ($('m_cityinfo')) $('m_cityinfo').textContent = 'تعذر الوصول للموقع (الإذن أو الإشارة). تقدر تختار المدينة بنفسك.'; }, { timeout: 12000, maximumAge: 300000, enableHighAccuracy: false });
  },
  citySet: (el) => { S[el.dataset.f] = el.dataset.v; render(); },
  cityDrill: (el) => { const per = el.dataset.per, st = store(); const p = per === 'year' ? E.yearOf(today0()) : per === 'cycle' ? E.currentCycle(st) : null; if (p) S.period = p; go('txs', { filters: { kind: 'spend', cityId: el.dataset.c, cityMode: (S.cmp && S.view === 'compare' ? S.cmp.cityMode : S.cityMode) === 'withGps' ? 'withGps' : 'approved', allTime: !p } }); },
  cityAdd: () => sheetCityEdit(null),
  cityEdit: (el) => sheetCityEdit(el.dataset.c),
  citySave: async (el) => { const al = $('ct_al').value.split('\n').map(x => x.trim()).filter(Boolean); const r = E.saveCity(store(), { id: el.dataset.c || null, name: $('ct_name').value, aliases: al }); if (r.error) return toast(r.error === 'dup' ? 'موجودة باسم «' + r.city.name + '»' : 'الاسم غير صالح (بدون أرقام)'); await persist('مدينة'); closeSheet(); render(); toast('انحفظت'); },
  cityMerge: async (el) => { const to = $('ct_into').value; if (!await confirmBox('دمج المدينة', `عمليات «${esc(cityName(el.dataset.c))}» تنتقل لـ «${esc(cityName(to))}» واسمها يصير اسم بديل.`, 'دمج')) return; const r = E.mergeCity(store(), el.dataset.c, to); await persist('دمج مدينة'); closeSheet(); render(); toast(`انضمت (${cnt(r ? r.txs : 0, 'op')})`); },
  // المجموعات
  groupsPick: async (el) => { const id = el.dataset.id, t = store().get('transactions', id); if (!t) return; const ids = await pickGroups(t.groupIds || []); if (!ids) return afterTx(id); E.setTxGroups(store(), id, ids); await persist('مجموعات العملية'); render(); afterTx(id); },
  grpClose: () => finishGroups(null), grpBg: (el, ev) => { if (ev.target === el) finishGroups(null); },
  grpDone: () => finishGroups(readChecks('pg')),
  grpAdd: async () => { const n = $('grp_new').value.trim(); if (!n) return; const keep = readChecks('pg'); const r = E.saveGroup(store(), { name: n }); if (r.error) return toast(GROUP_ERR[r.error]); await persist('مجموعة جديدة'); keep.push(r.group.id); $('grp_box').innerHTML = groupChecks(keep, 'pg'); $('grp_new').value = ''; },
  groupNewInline: () => { if ($('grp_new')) $('grp_new').focus(); else toast('أنشئ مجموعة من «المجموعات»'); },
  groupEdit: (el) => sheetGroup(el.dataset.id || null),
  groupOpen: (el) => { S.groupId = el.dataset.id; go('group'); },
  groupSave: async (el) => {
    const id = el.dataset.id || null;
    const r = E.saveGroup(store(), { id, name: $('gr_name').value, description: $('gr_desc').value, emoji: oneEmoji($('ce_emoji').value), color: $('ce_color').value || null, startDate: $('gr_start').value || null, endDate: $('gr_end').value || null, budget: $('gr_budget').value, active: $('gr_on') ? $('gr_on').checked : undefined });
    if (r.error) return toast(GROUP_ERR[r.error] || 'ما انحفظت'); await persist('مجموعة'); closeSheet(); render(); toast('انحفظت');
  },
  groupDel: async (el) => { if (!await confirmBox('حذف المجموعة', 'العمليات والأغراض ما تنحذف، بس تطلع من المجموعة.', 'حذف', true)) return; E.deleteGroup(store(), el.dataset.id); await persist('حذف مجموعة'); closeSheet(); go('groups', { noPush: true }); },
  groupTxs: (el) => go('txs', { filters: { kind: 'all', groupId: el.dataset.id, allTime: true } }),
  // الأغراض
  itemEdit: (el) => sheetItem(el.dataset.id, el.dataset.i || null),
  itemBack: (el) => sheetTx(el.dataset.id),
  itemSugg: (el) => { const p = store().get('products', el.dataset.p); if (!p) return; $('it_name').value = p.name; if (p.productCategoryId && $('it_pc')) $('it_pc').value = p.productCategoryId; renderItemSuggest(); },
  itemUse: (el) => { const f = el.dataset.f, v = el.dataset.v; if (f === 'unit') { $('it_unit').value = v; $('it_total').value = ''; } if (f === 'qty') $('it_qty').value = v; if (f === 'pc') $('it_pc').value = v; renderItemSuggest(); },
  itemSave: async () => {
    const c = S.itemCtx; if (!c) return;
    const unit = $('it_unit').value.trim(), d = { name: $('it_name').value, qty: $('it_qty').value, unitPrice: unit || null, total: unit ? null : $('it_total').value, productCategoryId: $('it_pc').value || null, discount: $('it_disc').checked, note: $('it_note').value, partId: $('it_part') ? $('it_part').value || null : null, groupIds: readChecks('ig') };
    const r = E.saveItem(store(), c.txId, d, c.itemId);
    if (r.error === 'cap') return toast(`أكبر من المتاح في العملية بـ ${fmt(r.over)} (السقف ${fmt(r.cap)})`);
    if (r.error === 'part_cap') return toast(`أكبر من قيمة الجزء بـ ${fmt(r.over)} (الجزء ${fmt(r.cap)})`);
    if (r.error === 'refund_alloc') return toast(`عليه استرداد محدد ${fmt(r.allocated)}، فما ينقص عنه. عدّل الاسترداد أول.`);
    if (r.error) return toast(ITEM_ERR[r.error] || 'ما انحفظ');
    await persist(c.itemId ? 'تعديل غرض' : 'إضافة غرض'); render(); sheetTx(c.txId); toast(`انحفظ · غير مفصل ${fmt(r.unitemized)}`);
  },
  itemDel: async () => { const c = S.itemCtx; if (!c || !c.itemId) return; E.removeItem(store(), c.txId, c.itemId); await persist('حذف غرض'); render(); sheetTx(c.txId); },
  itemsDrill: (el) => {
    const f = {};
    if (el.dataset.pc !== undefined) f.productCategoryId = el.dataset.pc;
    if (el.dataset.prod) f.productId = el.dataset.prod;
    if (el.dataset.group) { f.groupId = el.dataset.group; f.allTime = true; }
    if (el.dataset.pk) { const [start, end] = el.dataset.pk.split('|'); f.period = { start, end, kind: 'custom' }; }
    S.itemsF = f; go('items');
  },
  refundAlloc: (el) => sheetRefundAlloc(el.dataset.id),
  refundAllocSave: async (el) => {
    const allocs = Array.from(document.querySelectorAll('input.ra')).map(x => ({ itemId: x.dataset.i, amount: x.value.trim() })).filter(a => a.amount);
    const r = E.setRefundAllocations(store(), el.dataset.id, allocs);
    if (r.error === 'item_over') return toast(`أكبر من قيمة الغرض (الحد ${fmt(r.max)})`);
    if (r.error === 'over') return toast(`المجموع أكبر من الاسترداد (${fmt(r.max)})`);
    if (r.error) return toast('ما انحفظ');
    await persist('أغراض الاسترداد'); render(); sheetTx(el.dataset.id); toast(r.unallocated > 0.004 ? `انحفظ، والباقي ${fmt(r.unallocated)} توزيع تقديري` : 'انحفظ');
  },
  refundAllocAll: async (el) => { const r = store().get('transactions', el.dataset.id); if (r) { r.refundItemAllocations = []; store().put('transactions', r); await persist('أغراض الاسترداد'); } render(); sheetTx(el.dataset.id); toast('الاسترداد بدون تحديد: ينوزع بالنسبة (والكامل يلغي كل الأغراض)'); },
  // الاسترجاع النقدي
  cashReturnLink: async (el) => {
    const st = store(), dep = el.dataset.id, w = st.get('transactions', el.dataset.w); if (!w) return;
    let partId = null;
    const parts = (w.cashParts || []).filter(p => Number(p.amount) > 0);
    if (parts.length) {
      const v = await ask(`<h3>رجع من أي جزء؟<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><div class="list"><div class="it" data-action="answer" data-val="__rest"><div class="m"><div class="t">من الباقي (تحت «${esc(w.categoryId ? E.catName(st, w.categoryId) : 'سحب نقدي')}»)</div></div></div>${parts.map(p => `<div class="it" data-action="answer" data-val="${p.id}"><div class="m"><div class="t">${esc(bucketName(p.categoryId))} · ${fmt(p.amount)}</div>${p.note ? `<div class="s">${esc(p.note)}</div>` : ''}</div></div>`).join('')}</div>`);
      if (!v) return afterTx(dep); partId = v === '__rest' ? null : v;
    }
    const r = E.linkCashReturn(st, dep, w.id, partId);
    if (r.error === 'over' || r.error === 'part_over') { toast(`أكبر من اللي يقبله (${fmt(r.returnable)})`); return afterTx(dep); }
    if (r.error === 'items_over') { toast('أغراض السحب أكبر من صافيه بعد الإرجاع. عدّل أغراضه أول.'); return afterTx(dep); }
    if (r.error) { toast('ما قدرت أربطه'); return afterTx(dep); }
    await persist('مبلغ رجع من سحب'); render(); afterTx(dep); toast(`انربط. أثر السحب صار ${fmt(r.net)}`);
  },
  cashReturnUnlink: async (el) => { E.unlinkCashReturn(store(), el.dataset.id); await persist('فك ربط مبلغ معاد'); render(); afterTx(el.dataset.id); },
  // الالتزامات
  recConfirm: async (el) => { E.confirmRecurring(store(), el.dataset.id, { isCommitment: el.dataset.c === '1' }); await persist('تأكيد متكرر'); render(); if (el.dataset.tx) afterTx(el.dataset.tx); toast(el.dataset.c === '1' ? 'صار التزام مؤكد' : 'صار متكرر مؤكد (مو التزام)'); },
  recDismiss: async (el) => { E.dismissRecurring(store(), el.dataset.id); await persist('مو متكرر'); render(); if (el.dataset.tx) afterTx(el.dataset.tx); else closeSheet(); toast('تمام، ما يرجع يقترحه'); },
  recRestore: async (el) => { const r = store().get('recurring', el.dataset.id); if (!r) return; r.status = 'suggested'; store().put('recurring', r); store().touch(); await persist('رجوع مقترح'); render(); },
  recEdit: (el) => sheetRecurring(el.dataset.id),
  recSave: async (el) => { const amt = E.parseNum($('rc_amt').value); E.confirmRecurring(store(), el.dataset.id, { cadence: $('rc_cad').value, expectedAmount: amt, isCommitment: $('rc_com').checked, reserve: $('rc_res').checked }); await persist('التزام متكرر'); closeSheet(); render(); toast('انحفظ'); },
  // الحجوزات
  resEdit: (el) => sheetReserve(el.dataset.id || null),
  resSave: async (el) => { const r = E.saveReserve(store(), { id: el.dataset.id || null, name: $('rs_name').value, amount: $('rs_amt').value, dueDate: $('rs_due').value || null, recurringId: $('rs_rec').value || null, active: $('rs_on').checked }); if (r.error) return toast(r.error === 'name' ? 'اكتب الاسم' : 'المبلغ غير صحيح'); await persist('حجز'); closeSheet(); render(); toast('انحفظ'); },
  resDel: async (el) => { E.deleteReserve(store(), el.dataset.id); await persist('حذف حجز'); closeSheet(); render(); },
  // السيولة
  accLiq: (el) => sheetAccLiq(el.dataset.id),
  accLiqSave: async (el) => { E.setLiquidityClass(store(), el.dataset.id, $('a_liq').value || null); await persist('تصنيف السيولة'); closeSheet(); render(); toast('انحفظ'); },
  // المعدل
  rateExAdd: async () => { const c = $('rx_cat').value; if (!c) return; E.addRateExclusion(store(), { type: 'category', id: c }); await persist('استثناء من المعدل'); render(); },
  rateExDel: async (el) => { E.removeRateExclusion(store(), el.dataset.t, el.dataset.id); await persist('حذف استثناء'); render(); },
  // التوفير والضرورة
  savWhich: (el) => { S.savWhich = el.dataset.v; render(); },
  savDrill: (el) => { const st = store(), last = E.completeCycles(st, today0(), 1)[0]; S.period = S.savWhich === 'last' && last ? last : (E.currentCycle(st) || S.period); go('txs', { filters: { kind: 'spend', savings: true, savingsCat: el.dataset.cat } }); },
  necDrill: (el) => go('txs', { filters: { kind: 'spend', nec: el.dataset.v, categoryId: el.dataset.cat || undefined } }),
  // المقارنات والسنوي
  cmpSet: (el) => { S.cmp[el.dataset.f] = el.dataset.v; render(); },
  cmpSel: (el) => { S.cmp[el.dataset.f] = el.value; render(); },
  cmpTotal: (el) => { S.period = pFromKey(el.dataset.pk); go('txs', { filters: { kind: 'spend' } }); },
  cmpCat: (el) => { S.period = pFromKey(el.dataset.pk); go('txs', { filters: { kind: 'all', categoryId: el.dataset.cat } }); },
  yearShift: (el) => { S.year = (S.year || Number(today0().slice(0, 4))) + Number(el.dataset.dir); render(); },
  annualMonth: (el) => { const k = el.dataset.d; if (!k) return; const [y, m] = k.split('-').map(Number); S.period = E.monthPeriod(y, m); go('txs', { filters: { kind: 'spend' } }); },
  annualCat: (el) => { const y = S.year || Number(today0().slice(0, 4)); S.period = E.yearOf(`${y}-01-01`); go('txs', { filters: { kind: 'all', categoryId: el.dataset.cat } }); },
  // تصنيفات المنتجات
  pcatEdit: (el) => sheetPcat(el.dataset.id || null),
  pcatSave: async (el) => { const r = E.saveProductCategory(store(), { id: el.dataset.id || null, name: $('pc_name').value, emoji: oneEmoji($('ce_emoji').value), color: $('ce_color').value || null, active: $('pc_on') ? $('pc_on').checked : undefined }); if (r.error) return toast(PCAT_ERR[r.error] || 'ما انحفظ'); await persist('تصنيف منتجات'); closeSheet(); render(); toast('انحفظ'); },
  pcatDel: async (el) => { const to = $('pc_move').value || null; if (!await confirmBox('حذف تصنيف المنتجات', to ? `أغراضه تنتقل لـ «${esc(pcName(to))}».` : 'أغراضه تبقى بدون تصنيف. ما ينحذف أي غرض.', 'حذف', true)) return; const r = E.deleteProductCategory(store(), el.dataset.id, to); await persist('حذف تصنيف منتجات'); closeSheet(); render(); toast(`انحذف، و${r.items} غرض ${to ? 'انتقل' : 'صار بدون تصنيف'}${r.limit === 'moved' ? '، وحد الصرف انتقل معها' : r.limit === 'kept_target' ? `، وبقى حد «${pcName(to)}» كما هو` : r.limit === 'removed' ? '، وانحذف حده' : ''}`, 5000); },
  // التنبيهات
  alertOpen: (el) => {
    const a = cachedAlerts().find(x => x.id === el.dataset.id); if (!a) return;
    const k = a.kind, ref = a.ref || {};
    if (k === 'limit') return go('limits');
    if (k === 'group') { S.groupId = ref.groupId; return go('group'); }
    if (k === 'due' || k === 'recurring') return go('commitments');
    if (k === 'rise') { const c = E.currentCycle(store()); if (c) S.period = c; return go('txs', { filters: { kind: 'all', categoryId: ref.categoryId } }); }
    if (k === 'forecast') return go('forecast');
    if (k === 'liquidity') return go('liquidity');
  },
  alertDismiss: async (el) => { E.dismissAlert(store(), el.dataset.id); await persist(null, { noStep: true }); render(); },
  alertSnooze: async (el) => { E.snoozeAlert(store(), el.dataset.id, Number(el.dataset.d) || 1); await persist(null, { noStep: true }); render(); toast('يرجع يذكرك بعد ' + (el.dataset.d === '7' ? 'أسبوع' : 'يوم')); },
  alertRestore: async (el) => { E.restoreAlert(store(), el.dataset.id); await persist(null, { noStep: true }); render(); },
});

boot();
})();
