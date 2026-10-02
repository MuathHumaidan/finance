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
  // 1.7.1: أي جهة صارت «التزام دائم» في هالخطوة تنحفظ خطتها معها (تنتظر جوابك، أو معتمدة إذا آخر 3 دفعات متساوية)
  if (!opts.noStep) { try { E.syncCommitPlans(S.store); } catch (e) { console.error(e); } }
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
  const m = merchantOf(tx); if (m) return E.merchantName(m);
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
  if (key === '__person') return 'تحويلات لأشخاص ما صنفتها';
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
// 1.7.0: شارات المجموعة والمدينة أول شي: «🏷️ المجموعة» لكل مجموعة، و«📍 المدينة» للمعتمدة (يدوي أو موقع أو فترة)،
// و«📍 المدينة؟» بلون تنبيه لاقتراح موقع ما اعتمدته (بدل «بدون مدينة»). الموقع المتجاهل أو المدينة الحالية كاحتمال: ما يطلع شي
function placeBadges(tx) {
  const st = store(), b = [];
  (tx.groupIds || []).forEach(g => { const G = st.get('groups', g); if (G) b.push(`<span class="b grp">🏷️ ${esc(G.name)}</span>`); });
  const cityOn = (id) => { const c = id ? st.get('cities', id) : null; return c ? c.name : null; };
  const ig = E.isIgnored(st, tx, 'city');
  if (tx.cityId) { const n = cityOn(tx.cityId); if (n) b.push(`<span class="b city">📍 ${esc(n)}</span>`); }
  else if (E.needsCity(st, tx)) {
    if (ig) { if (ignoredFilterOn('city')) b.push(`<span class="b n">متجاهلة (المدينة)</span>`); }
    else if (tx.suggestedCityId && cityOn(tx.suggestedCityId)) b.push(`<span class="b w city">📍 ${esc(cityOn(tx.suggestedCityId))}؟</span>`);
    else b.push(`<span class="b w">بدون مدينة</span>`);
  }
  return b;
}
function badges(tx) {
  const b = placeBadges(tx);
  const ins = insOf(tx);
  if (tx.transferSubtype === 'round_up') b.push(`<span class="b n">تقريب</span>`);
  // 1.6.0: فترات التجاهل تخفي علامات التصنيف والمدينة (الأرقام ما تتغير)، والفلتر يعرضها ومعها «متجاهلة»
  const igC = E.isIgnored(store(), tx, 'category'), catMarks = [];
  if (tx.classificationStatus === 'temporary') catMarks.push(`<span class="b w">تحويل لشخص ما صنفته</span>`);
  if (tx.classificationStatus === 'unclassified') catMarks.push(`<span class="b w">${tx.transferSubtype === 'round_up' ? 'الوجهة غير معروفة' : 'نوعها غير معروف'}</span>`);
  if ((tx.transactionType === 'Payment' || tx.transactionType === 'CashExpense') && !tx.categoryId) catMarks.push(`<span class="b n">بدون تصنيف</span>`);
  if (!igC || tx.transferSubtype === 'round_up') catMarks.forEach(x => b.push(x)); else if (catMarks.length && ignoredFilterOn('category')) b.push(`<span class="b n">متجاهلة</span>`);
  if (tx.needsReview) b.push(`<span class="b">ما راجعتها</span>`);
  if (tx.shopChoicePending) b.push(`<span class="b w">أي محل؟</span>`);
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
  { const m = merchantOf(tx); if (m && m.userName && tx.merchantRaw) parts.unshift(`<span dir="auto">${esc(tx.merchantRaw)}</span>`); } // 1.6.0: اسم الفاتورة الأصلي تحت اسمك
  if (withDate) parts.push(`${fdate(tx.transactionDate || tx.postingDate, true)}${tx.time ? '، ' + ftime(tx.time) : ''}`);
  else {
    const ins = insOf(tx), acc = accOf(tx.accountId);
    parts.push(esc(ins ? ins.label : acc ? acc.name : ''));
    if (tx.time) parts.push(ftime(tx.time));
  }
  return parts.filter(Boolean).join(' · ');
}
let ROWPART = null;
function txRow(tx, withDate) {
  const sm = S.sel && S.view === 'txs', on = sm && S.sel.has(tx.id);
  const why = S.view === 'txs' && S.q.trim() && S.searchWhy ? S.searchWhy.get(tx.id) : null;
  const part = ROWPART ? ROWPART.get(tx.id) : null, showPart = part != null && part > 0 && Math.abs(part - tx.grossAmount) > 0.004;
  const amt = showPart ? `<span class="pamt"><span class="num">${fmt(part)}</span><span class="of">من ${fmt(tx.grossAmount)}</span></span>` : `<span class="num">${fmt(tx.grossAmount)}</span>`;
  return `<div class="tx ${on ? 'sel' : ''}" data-action="${sm ? 'toggleSel' : 'openTx'}" data-id="${tx.id}">${sm ? `<span class="ck">${on ? '✓' : ''}</span>` : ''}${icCircle(txUi(tx))}<div class="m"><div class="t">${esc(txTitle(tx))}</div><div class="s">${subLine(tx, withDate)}</div>${why && why.length ? `<div class="why">${esc(why.slice(0, 2).join(' · '))}</div>` : ''}${badges(tx)}</div><div class="a">${amt}${dirBadge(tx)}</div></div>`;
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
    // ترقية 1.6.2 (قبل أي إعادة معالجة): المرسلين في «البنوك» والأنواع اللي لها عمليات معتمدة، وأشكال التاريخ لكل بنك
    E.migrate162(S.store);
    // ترقية 1.4.1: تصنيف «سحب نقدي»، ورسائل «أي حساب؟» تنحفظ على بطاقة مؤقتة
    const m141 = E.migrate141(S.store);
    if (m141.reprocess.length) { const plan = await E.reprocessMessages(S.store, m141.reprocess); if (plan) E.commitSms(S.store, plan); }
    // ترقية 1.5.0: الجداول الجديدة وبذور المنتجات والمدن وسجل الأرصدة، واكتشاف الالتزامات المتكررة (مقترح فقط)
    E.migrate150(S.store);
    // ترقية 1.5.2: رسائل اندمجت بالغلط مع رسالة ثانية ترجع عمليات مستقلة، و«نفس النص» المفتوحة تصير «مكررة»
    const m152 = await E.migrate152(S.store);
    // ومع كل فتح: أي عملية فيها رسالتين اندمجت تلقائيًا (مثلًا رجعت من المحذوفة) تنفصل. قراراتك في المراجعة ما تنلمس
    const sp = await E.splitSmsMerges(S.store); if (m152.split + sp.split) S.notice152 = m152.split + sp.split;
    // ترقية 1.6.0: تصنيفات المنتجات صارت فرعية في القائمة الموحدة (أغراضها ومنتجاتها وحدودها معها)
    const m160 = E.migrate160(S.store); if (m160.changed && (m160.placed || []).length) S.askPlace = true;
    // ترقية 1.7.0: الافتراضي «غير محدد»، «التزام دائم» على الجهة، والأغراض تتبع فاتورتها
    const m170 = E.migrate170(S.store); if (m170.itemsNowCategorized) S.notice170items = m170.itemsNowCategorized;
    // ترقية 1.7.1: المجموعات، سؤال اعتماد الالتزامات، والصيغ الثابتة (أشكال رسائلك السابقة تنتظر اعتمادك)
    let m171 = { changed: false }; try { m171 = E.migrate171(S.store); } catch (e) { console.error(e); } // لو تعثرت ما توقف فتح التطبيق (تنعاد المرة الجاية)
    try { const w = E.waitingForFormats(S.store); if (w.length) { const p = await E.reprocessMessages(S.store, w, {}); if (p) E.commitSms(S.store, p, { markReview: true }); } } catch (e) { console.error(e); }
    if (m171.changed && (m171.shapes || (m171.commit && m171.commit.asked) || m171.groupsDropped || S.store.all('messages').length)) S.notice171 = { shapes: m171.shapes, asked: m171.commit ? m171.commit.asked : 0, auto: m171.commit ? m171.commit.auto : 0, groups: m171.groupsDropped };
    const needDates = !S.store.settings.migrated170dates; if (needDates) { S.store.settings.migrated170dates = true; S.store.put('settings', S.store.settings); }
    E.sweepPeriods(S.store); // الفترات: اللي وصل وما أخذ مدينته أو مجموعته
    E.detectRecurring(S.store);
    const c2 = S.store.takeChanges(); if (Object.keys(c2.puts).length || Object.keys(c2.removes).length) await DB.apply(c2);
    S.store.startHistory();
    // 1.7.0: رسائل الليل اللي البنك كتب فيها تاريخ اليوم الجاي: تتصحح بخطوة في «سجل التعديلات» (تقدر تتراجع عنها)
    if (needDates) { const fx = E.fixNextDayDates(S.store); if (fx.fixed) { S.store.commitStep(`تصحيح تاريخ ${fx.fixed === 1 ? 'عملية' : fx.fixed + ' عمليات'} (رسائل آخر الليل) — تحديث 1.7.0`, 'system'); await DB.apply(S.store.takeChanges()); S.notice170dates = fx.fixed; } }
  } catch (e) {
    $('main').innerHTML = `<div class="card"><h2>تعذر فتح قاعدة البيانات</h2><p>${esc(e && e.message ? e.message : e)}</p><p class="muted">إذا كنت في وضع التصفح الخاص، افتح التطبيق في وضع عادي.</p></div>`;
    return;
  }
  registerSW();
  markReady();
  const initial = (location.hash || '').replace('#', '');
  if (['home', 'spend', 'txs', 'add', 'accounts', 'more', 'reviewc', 'messages'].includes(initial)) S.view = initial;
  render();
  if (S.askPlace) { S.askPlace = false; setTimeout(() => { if (!$('sheet').innerHTML) sheetPlaceCats(); }, 400); }
  if (S.notice171) { const n = S.notice171; S.notice171 = null; const show = (left) => setTimeout(() => { if (!$('sheet').innerHTML) sheetNotice171(n); else if (left > 0) show(left - 1); }, left === 6 ? 700 : 5000); show(6); }
  if (S.notice170dates || S.notice170items) { const a = S.notice170dates, b = S.notice170items; S.notice170dates = S.notice170items = 0; setTimeout(() => toast([a ? `تصحح تاريخ ${a === 1 ? 'عملية وحدة' : a + ' عمليات'} كان البنك كاتب فيها تاريخ اليوم الجاي (تلقاها في سجل التعديلات)` : '', b ? `${b === 1 ? 'غرض واحد' : b + ' أغراض'} صار له تصنيف فاتورته` : ''].filter(Boolean).join('. '), 9000), 900); }
  if (S.notice152) { const n = S.notice152; toast(n === 1 ? 'انفصلت رسالة كانت مدموجة بالغلط مع رسالة ثانية' : `انفصلت ${n === 2 ? 'رسالتين' : n + (n <= 10 ? ' رسائل' : ' رسالة')} كانت مدموجة بالغلط مع رسائل ثانية`, 7000); S.notice152 = 0; }
  // جلب الرسائل تلقائيًا عند الفتح وعند الرجوع للتطبيق (إذا الصندوق معدّ)
  setTimeout(autoFetch, 700);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoFetch(); });
  window.addEventListener('online', autoFetch);
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    S.swReg = reg; // 1.6.2: للفحص اليدوي والتلقائي
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
const TITLES = { income: 'الدخل', deleted: 'المحذوفة', categories: 'التصنيفات', reviewc: 'المراجعة', teachsms: 'تعليم صيغة رسالة', messages: 'الرسائل البنكية', audit: 'سجل التعديلات', limits: 'حدود الصرف', rules: 'القواعد', home: 'الرئيسية', spend: 'صرفياتك', txs: 'العمليات', add: 'إضافة واستيراد', accounts: 'الحسابات', more: 'المزيد', review: 'مراجعة الاستيراد', teach: 'تعليم كشف جديد', merchants: 'المحلات', beneficiaries: 'المستفيدون', settings: 'الإعدادات', backup: 'النسخ الاحتياطي', report: 'التقرير', methods: 'طريقة الحساب', imports: 'سجل الاستيراد' };
const NAV_OF = { income: 'more', deleted: 'txs', categories: 'more', reviewc: 'more', teachsms: 'reviewc', messages: 'more', audit: 'more', limits: 'more', rules: 'more', add: 'home', review: 'add', teach: 'add', imports: 'add', merchants: 'more', beneficiaries: 'accounts', settings: 'more', backup: 'more', report: 'more', methods: 'more' };
function render() {
  ensurePeriod();
  const v = S.view;
  document.body.className = 'v-' + v + (S.sel && v === 'txs' ? ' selmode' : '') + (document.body.classList.contains('lock170') ? ' lock170' : ''); // 1.7.0: قفل الخلفية يبقى والنافذة مفتوحة
  $('title').textContent = TITLES[v] || 'المدير المالي';
  $('backBtn').classList.toggle('hide', !(S.navStack.length || NAV_OF[v]));
  S.refunds = E.refundIndex(S.store);
  $('undoBtn').classList.toggle('hide', !S.store.undoStack.length);
  { const rb = $('redoBtn'); if (rb) rb.classList.toggle('hide', !S.store.redoStack.length); } // 1.7.0: «إعادة» بعد التراجع
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
function navSnapshot() { return { view: S.view, filters: JSON.parse(JSON.stringify(S.filters)), q: S.q, period: S.period, selDay: S.selDay, spendBy: S.spendBy, cardOpen: S.cardOpen, itemsF: S.itemsF ? JSON.parse(JSON.stringify(S.itemsF)) : null, y: window.scrollY || 0 }; }
function go(view, opts) {
  opts = opts || {};
  if (view !== 'txs') S.sel = null;
  if (opts.nav) S.navStack = [];
  else if (!opts.noPush && (view !== S.view || opts.filters || opts.itemsF)) { S.navStack.push(navSnapshot()); if (S.navStack.length > 25) S.navStack.shift(); }
  // الدخول من رابط أو بطاقة أو تصنيف = فلتر جديد، فيمسح البحث القديم
  S.view = view;
  if (opts.itemsF) S.itemsF = opts.itemsF;
  if (opts.filters) { S.filters = Object.assign({ kind: 'all', allTime: false }, opts.filters); S.q = ''; }
  else if (opts.nav && view === 'txs') { S.filters = { kind: 'all', allTime: true }; S.q = ''; }
  if (history.replaceState) history.replaceState(null, '', '#' + view);
  render(); window.scrollTo(0, 0); unlockScrollTo(0);
}
// 1.7.0: الخلفية مقفولة والنافذة مفتوحة: الانتقال لصفحة ثانية يرجع لأولها لما تتسكّر النافذة
function unlockScrollTo(y) { try { if (document.body.classList.contains('lock170')) G.scrollY = y || 0; } catch (e) { /* قبل التحميل */ } }
// نهاية مسار (حفظ أو إلغاء): نرجع للصفحة اللي بدأ منها بدل ما نكدسها مرة ثانية
function goUp(view) { const top = S.navStack[S.navStack.length - 1]; if (top && top.view === view) return goBack(); go(view, { noPush: true }); }
function goBack() {
  const p = S.navStack.pop();
  if (!p) return go(NAV_OF[S.view] || 'home', { noPush: true });
  if (p.view !== 'txs') S.sel = null;
  Object.assign(S, { view: p.view, filters: p.filters, q: p.q, period: p.period, selDay: p.selDay, spendBy: p.spendBy, cardOpen: p.cardOpen }); if (p.itemsF) S.itemsF = p.itemsF;
  if (history.replaceState) history.replaceState(null, '', '#' + p.view);
  render(); window.scrollTo(0, p.y || 0); unlockScrollTo(p.y || 0);
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
  const tools = `<div class="tools">${store().undoStack.length ? `<button class="txtb" data-action="undo" aria-label="تراجع">تراجع</button>` : ''}${store().redoStack.length ? `<button class="txtb" data-action="redo" aria-label="إعادة">إعادة</button>` : ''}<button data-action="go" data-view="alerts" aria-label="التنبيهات" style="position:relative">${ico('bell')}${alertsBadge()}</button><button data-action="go" data-view="reviewc" aria-label="المراجعة" style="position:relative">${ico('question')}${reviewBadge()}</button><button data-action="go" data-view="settings" aria-label="الإعدادات">${ico('gear')}</button></div>`;
  if (!st.all('transactions').length) {
    return `<div class="hero" style="padding-bottom:34px">${tools}<div class="hi">المدير المالي</div><div class="big" style="font-size:28px">ابدأ برفع أول كشف</div><div class="sub">كل شي يُقرأ ويُحفظ على جهازك فقط</div></div>${banners()}
      <div class="card empty">${icCircle({ color: PAL.blue, icon: 'upload' })}<p>ارفع كشف حساب الإنماء أو كشف البطاقة الائتمانية بصيغة Excel.</p><button class="btn p" data-action="pickFile">رفع كشف</button></div>`;
  }
  const cur = E.currentCycle(st) || S.period;
  const R = E.computePeriod(st, cur);
  // الرئيسية للصرف فقط: كم صرفت في الدورة. الدخل والأرصدة في صفحة «الدخل» المستقلة
  let h = `<div class="hero" style="padding-bottom:26px">${tools}<div class="hi">صرفك هذي الدورة</div><div class="big">${money(R.spend)}</div><div class="sub">${fperiod(cur)}${R.coverage.periodOpen ? ' · حتى اليوم' : ''}</div>
    <div class="gl">
      <div class="g" data-action="kpi" data-kind="commitments" data-p="cur">${ico('repeat')}<div><div class="l">الالتزامات الدائمة</div><div class="v">${money(R.commitments)}</div></div></div>
      ${homeForecastTile()}
    </div></div>`;
  h += banners();
  // 1.6.0: عمليات جديدة ما راجعتها
  const nU = E.unreviewedTxs(st).length;
  if (nU) h += `<div class="banner i"><div><b>عندك ${nU === 1 ? 'عملية وحدة' : cnt(nU, 'op')} ما راجعتها</b></div><button class="btn p" data-action="flowResume">كمّل المراجعة</button></div>`;
  if ((settings().placeCategories || []).some(id => st.get('categories', id)) && !S.placeLater) h += `<div class="banner w"><div>تصنيفات منتجات أضفتها قبل: اختر مكانها في قائمة التصنيفات الموحدة.</div><button class="btn" data-action="placeOpen">اختر</button></div>`;
  h += homeAlerts();
  // صرفك الأسبوعي
  const wk = E.weekOf(E.todayISO()), ser = E.spendSeries(st, wk, 'day');
  h += `<div class="card"><h2 class="soft">صرفك الأسبوعي</h2>${periodBox(wk, ser.total, { nav: false, action: 'weekToSpend' })}${chartSvg(ser, wk, { compact: true, action: 'weekToSpend' })}${cmpPill(E.comparePeriods(st, wk), wk)}
    <div class="linkrow" data-action="go" data-view="spend">${ico('chart')}<span>جميع صرفياتك</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
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
  if (R.temporaryCount) items.push(`${cnt(R.temporaryCount, 'tr')} لأشخاص ما صنفتها هذي الدورة (${fmt(R.temporarySpend)}). <a data-action="kpi" data-kind="temporary" data-p="cur">حدد تصنيفها</a>`);
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
    ${row(`<span class="dir w">${ico('inn')}</span>`, 'داخل نوعه غير معروف', money(R.unclassifiedIn), 'unclassified_in', R.unclassifiedInCount ? cnt(R.unclassifiedInCount, 'op') + ' (تحويلات لك من أشخاص وغيرها)' : 'لا يوجد')}
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
    const spendSub = [R.temporaryCount ? `منه ${fmt(R.temporarySpend)} تحويلات لأشخاص ما صنفتها` : '', R.unownedCount ? `و${fmt(R.unownedSpend)} بأدوات مالكها غير محدد` : ''].filter(Boolean).join(' ');
    const row = (dir, label, val, kind, sub, cls) => `<div class="r ${cls || ''}" ${kind ? `data-action="kpi" data-kind="${kind}"` : ''}>${dir}<div class="l">${label}${sub ? `<div class="s">${sub}</div>` : ''}</div><div class="v">${val}</div></div>`;
    h += `<div class="card rows">
      ${row(`<span class="dir o">${ico('out')}</span>`, 'الإنفاق الحقيقي', money(R.spend), 'spend', spendSub)}
      ${row(`<span class="dir x">${ico('repeat')}</span>`, 'الالتزامات الدائمة', money(R.commitments), 'commitments', cnt(R.commitmentItems.length, 'op'))}
      <details class="more"><summary>أرقام أكثر</summary>
      ${row(`<span class="dir w">${ico('out')}</span>`, 'منه عمليات ما عُرف نوعها', money(R.unclassifiedOut), 'unclassified_out', R.unclassifiedOutCount ? `${cnt(R.unclassifiedOutCount, 'op')}${R.roundUpUnknownCount ? `، منها تقريب ${fmt(R.roundUpUnknown)}` : ''}` : 'لا يوجد', 'sub')}
      ${row(`<span class="dir o">${ico('cash')}</span>`, 'منه سحب نقدي', money(R.cashWithdrawals), 'cash', R.cashWithdrawalsCount ? cnt(R.cashWithdrawalsCount, 'op') : 'لا يوجد', 'sub')}
      ${row(`<span class="dir x">${ico('out')}</span>`, 'ما تنحسب في الصرف', money(R.excludedSpend), 'excluded', R.excludedCount ? cnt(R.excludedCount, 'op') : 'لا يوجد', 'sub')}
      ${row(`<span class="dir x">${ico('swap')}</span>`, 'التحويلات الداخلية', money(R.internal), 'internal', `${cnt(R.internalCount, 'tr')}${R.internalOneSided ? `، ${R.internalOneSided === R.internalCount ? 'كلها' : R.internalOneSided} غير مكتمل الربط` : ''}`, 'sub')}
      ${row(`<span class="dir x">${ico('card')}</span>`, 'سداد البطاقات', money(R.cardPayments), 'card', `${cnt(R.cardPaymentsCount, 'op')}${R.cardPaymentsUnmatched ? `، ${R.cardPaymentsUnmatched === R.cardPaymentsCount ? 'كلها' : R.cardPaymentsUnmatched} غير مطابقة` : ''}`, 'sub')}
      ${row(`<span class="dir x">${ico('receipt')}</span>`, 'دفعت رسوم', money(R.fees), 'fees', 'معلومة بس: كل رسوم محسوبة مع عمليتها وتصنيفها', 'sub')}
      </details></div>`;
  }
  h += `<div class="card"><h2 class="soft">وين راحت الدراهم؟</h2>`;
  if (sel && bucket === 'day') {
    const list = st.all('transactions').filter(t => (t.transactionDate || t.postingDate) === sel).sort(sortTx);
    h += list.length ? list.map(t => txRow(t)).join('') : `<div class="muted empty-day">ما صرفت شي</div>`;
  } else {
    h += `<div class="seg" style="margin-bottom:12px"><button class="${S.spendBy !== 'card' ? 'on' : ''}" data-action="spendBy" data-v="cat">حسب التصنيف</button><button class="${S.spendBy === 'card' ? 'on' : ''}" data-action="spendBy" data-v="card">حسب البطاقة</button></div>`;
    h += S.spendBy === 'card' ? cardList(R) : whereList(R);
  }
  h += `</div>`;
  if (!sel) {
    h += `<div class="grid2"><div class="card"><h2 class="soft">أكثر التجار</h2>`;
    h += R.topMerchants.length ? `<div class="list">${R.topMerchants.slice(0, 6).map(m => { const mm = st.get('merchants', m.merchantId); const u = catUi(mm && (mm.categoryId || mm.suggestedCategoryId)); return `<div class="it" data-action="merchantDrill" data-id="${m.merchantId}">${icCircle(u, 's')}<div class="m"><div class="t">${esc(mm ? E.merchantName(mm) : '—')}</div><div class="s">${cnt(m.count, 'op')}</div></div>${money(m.amount)}</div>`; }).join('')}</div>` : `<div class="muted">لا يوجد.</div>`;
    h += `</div><div class="card"><h2 class="soft">أعلى العمليات</h2>`;
    h += R.topTx.length ? R.topTx.slice(0, 6).map(x => txRow(st.get('transactions', x.id), true)).join('') : `<div class="muted">لا يوجد.</div>`;
    h += `</div></div>`;
  }
  return h;
}

/* ---------- العمليات ---------- */
// 1.7.0: أسماء أوضح («تصنيف مؤقت» ← «تحويلات لأشخاص ما صنفتها»، «خارج ما عُرف نوعه» ← «نوعها غير معروف»)
const KIND_L = { all: 'الكل', spend: 'إنفاق', income: 'دخل', internal: 'تحويلات داخلية', card: 'سداد بطاقات', card_unmatched: 'سداد بطاقة غير مطابق', unclassified_out: 'نوعها غير معروف (طالعة)', unclassified_in: 'نوعها غير معروف (داخلة)', unclassified_all: 'نوعها غير معروف', temporary: 'تحويلات لأشخاص ما صنفتها', uncategorized: 'بدون تصنيف', commitments: 'الالتزامات الدائمة', roundup: 'تقريب', unowned: 'مالك الأداة غير محدد', fees: 'فيها رسوم', excluded: 'ما تنحسب في الصرف', cash: 'سحب نقدي', refunds: 'استردادات', transfers: 'تحويلات', loans: 'سلف' };
function matchKind(t, kind) {
  const st = store();
  switch (kind) {
    case 'all': case undefined: case null: return true;
    case 'spend': return !E.isExcluded(st, t) && (E.spendEffect(t) !== 0 || E.feeOf(t) > 0);
    case 'income': return t.transactionType === 'Income';
    case 'internal': return t.transactionType === 'InternalTransfer' && !isRoundUpUnknown(t);
    case 'card': return t.transactionType === 'CreditCardPayment';
    case 'transfers': return ['InternalTransfer', 'CreditCardPayment', 'CashDeposit'].includes(t.transactionType); // 1.7.0: التحويل بين حساباتك وسداد البطاقات والإيداع النقدي
    case 'loans': return t.transactionType === 'LoanToPerson' || t.transactionType === 'LoanRepayment'; // 1.7.0: السلف (عطيتها أو رجعت لك)
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
// 1.7.0: صف النوع (أزرار ثابتة بدون سحب)
const TGROUPS = [['all', 'الكل'], ['spend', 'إنفاق'], ['income', 'دخل'], ['transfers', 'تحويلات'], ['loans', 'سلف']];
// 1.7.0: «يحتاج منك»: كل اللي ينتظر منك قرار، بعدده (المتجاهل بفترة ما ينحسب)
const NEED_L = { uncategorized: 'بدون تصنيف', noCity: 'بدون مدينة', temporary: 'تحويلات لأشخاص ما صنفتها', unknownType: 'نوعها غير معروف', review: 'ما راجعتها', shop: 'أي محل؟', owner: 'مالك البطاقة غير محدد', cardUnmatched: 'سداد بطاقة غير مطابق' };
function needsOf(t) {
  const st = store(), out = [], igC = E.isIgnored(st, t, 'category');
  if (!igC && t.transactionType !== 'Refund' && matchKind(t, 'uncategorized')) out.push('uncategorized'); // الاسترداد يتبع شراءه
  if (E.needsCity(st, t) && !E.isIgnored(st, t, 'city')) out.push('noCity');
  if (!igC && t.classificationStatus === 'temporary') out.push('temporary');
  if (isRoundUpUnknown(t) || (!igC && t.transactionType === 'Unknown')) out.push('unknownType');
  if (t.needsReview) out.push('review');
  if (t.shopChoicePending) out.push('shop');
  { const i = insOf(t); if (i && i.instrumentOwner === 'unknown' && E.spendEffect(t) !== 0) out.push('owner'); }
  if (isCardUnmatched(t)) out.push('cardUnmatched');
  return out;
}
// 1.7.0: أنواع العملية في الفلاتر (أكثر من نوع مع بعض) + خاصة
const FX_TYPES = [['Payment', 'شراء'], ['PersonTransfer', 'تحويل لشخص'], ['CashWithdrawal', 'سحب نقدي'], ['CashExpense', 'مصروف نقدي'], ['Refund', 'استرداد'], ['Income', 'دخل'],
  ['InternalTransfer', 'تحويل بين حساباتك'], ['CreditCardPayment', 'سداد بطاقة'], ['CashDeposit', 'إيداع نقدي'], ['LoanToPerson', 'سلفة'], ['LoanRepayment', 'سداد سلفة'], ['Unknown', 'نوعها غير معروف'],
  ['roundup', 'تقريب'], ['excluded', 'ما تنحسب في الصرف']];
const FX_TYPE_L = Object.fromEntries(FX_TYPES);
function typeMatch(t, k) { if (k === 'roundup') return t.transferSubtype === 'round_up'; if (k === 'excluded') return matchKind(t, 'excluded'); return t.transactionType === k; }
// التصنيف المختار (رئيسي أو فرعي أو «بدون تصنيف») على جزء من الإنفاق
function partMatchCat(p, catId) { if (catId === '__none') return p.cat === '__none'; const c = store().get('categories', catId); return c && c.parentId ? p.sub === catId : p.cat === catId; }
// «حسب المنتجات»: لكل فاتورة مجموع أغراضها (والغير مفصّل) في التصنيف، مثل صفحة «المنتجات»
function productNets(f) {
  const per = f.allTime ? null : S.period, m = new Map();
  E.itemRows(store(), per, { productCategoryId: f.categoryId === '__none' ? null : f.categoryId }).forEach(r => { if (r.net > 0.004) m.set(r.tx.id, E.round2((m.get(r.tx.id) || 0) + r.net)); });
  return m;
}
function filteredTxs(opts) {
  opts = opts || {};
  const f = S.filters, q = S.q.trim().toLowerCase(), st = store(), SQ = q ? E.searchQuery(S.q) : null;
  S.searchWhy = new Map();
  // قوائم الصرف (تصنيف أو نوع صرف) تمشي على نفس تاريخ الأرقام: الاسترداد المربوط على تاريخ شرائه
  const bySpend = !!f.categoryId || !!f.nec || !!f.rate || !!f.savings || !!f.cityId || ['spend', 'uncategorized', 'excluded', 'cash'].includes(f.kind) || f.group === 'spend';
  const prod = !f.txIds && f.categoryId && f.catBasis === 'products' ? productNets(f) : null; S.prodNet = prod;
  let list;
  if (f.txIds) { const ids = new Set(f.txIds); list = st.all('transactions').filter(t => ids.has(t.id)); } // قائمة محددة (من رقم): صف النوع و«يحتاج منك» والبحث تشتغل عليها
  else list = f.allTime ? st.all('transactions') : st.all('transactions').filter(t => { const d = bySpend ? E.spendDate(st, t) : (t.transactionDate || t.postingDate); return d >= S.period.start && d <= S.period.end; });
  if (f.txIds) return list.filter(t => {
    if (f.group && f.group !== 'all' && !matchKind(t, f.group)) return false;
    if (f.types && f.types.length && !f.types.some(k => typeMatch(t, k))) return false;
    if (!opts.noNeed && f.need) { const ns = needsOf(t); if (f.need === 'any' ? !ns.length : !ns.includes(f.need)) return false; }
    if (q) { const why = E.searchTx(st, t, SQ) || (txTitle(t).toLowerCase().includes(q) || catLabel(t).toLowerCase().includes(q) ? [] : null); if (!why) return false; S.searchWhy.set(t.id, why); }
    return true;
  }).sort(sortTx);
  list = list.filter(t => {
    if (!matchKind(t, f.kind)) return false;
    if (f.group && f.group !== 'all' && !matchKind(t, f.group)) return false;
    if (f.types && f.types.length && !f.types.some(k => typeMatch(t, k))) return false;
    if (f.accountId && t.accountId !== f.accountId) return false;
    if (f.instrumentId && t.instrumentId !== f.instrumentId) return false;
    if (f.noIns && t.instrumentId) return false;
    if (f.method && (t.paymentMethod || 'Unknown') !== f.method) return false;
    if (f.source && !(t.sourceLinks || []).some(s => s.sourceType === f.source)) return false;
    if (f.merchantId && t.merchantId !== f.merchantId) return false;
    if (f.beneficiaryId && t.beneficiaryId !== f.beneficiaryId) return false;
    if (f.categoryId) {
      // نفس توزيع الأرقام: السحب النقدي المقسّم يطلع تحت تصنيف كل جزء، والرسوم (1.7.0) مع عمليتها
      if (prod) { if (!prod.has(t.id)) return false; }
      else if (!E.spendParts(store(), t).some(p => partMatchCat(p, f.categoryId))) return false;
    }
    if (!match150(t, f)) return false;
    if (!opts.noNeed && f.need) { const ns = needsOf(t); if (f.need === 'any' ? !ns.length : !ns.includes(f.need)) return false; }
    if (q) {
      // 1.6.0: البحث في كل شي (الأغراض، الملاحظات، التصنيفات، المدينة، المجموعات، المبالغ) مع سبب الظهور
      const why = E.searchTx(st, t, SQ) || (txTitle(t).toLowerCase().includes(q) || catLabel(t).toLowerCase().includes(q) ? [] : null);
      if (!why) return false;
      S.searchWhy.set(t.id, why);
    }
    return true;
  });
  return list.sort(sortTx);
}
function needCounts() {
  const c = { total: 0 }; Object.keys(NEED_L).forEach(k => { c[k] = 0; });
  filteredTxs({ noNeed: true }).forEach(t => { const ns = needsOf(t); if (ns.length) c.total++; ns.forEach(k => { c[k]++; }); });
  return c;
}
// الفلاتر الشغالة: كل وحدة فقاعة عليها ×
function activeFilterChips(f) {
  const st = store(), out = [], add = (k, l) => out.push({ k, l });
  if (f.kind && f.kind !== 'all') add('kind', KIND_L[f.kind] || f.kind);
  (f.types || []).forEach(k => add('type:' + k, FX_TYPE_L[k] || k));
  if (f.categoryId) add('categoryId', (f.categoryId === '__none' ? 'بدون تصنيف' : String(f.categoryId).startsWith('__') ? bucketName(f.categoryId) : pcName(f.categoryId)) + (f.catBasis === 'products' ? ' (حسب المنتجات)' : ''));
  if (f.accountId) { const a = accOf(f.accountId); add('accountId', a ? a.name : 'حساب'); }
  if (f.instrumentId) { const i = st.get('instruments', f.instrumentId); add('instrumentId', i ? i.label : 'أداة'); }
  if (f.noIns) add('noIns', 'بدون أداة دفع');
  if (f.method) add('method', METHOD_L[f.method] || f.method);
  if (f.source) add('source', SRC_L[f.source] || f.source);
  if (f.merchantId) { const m = st.get('merchants', f.merchantId); add('merchantId', m ? E.merchantName(m) : 'تاجر'); }
  if (f.beneficiaryId) { const b = st.get('beneficiaries', f.beneficiaryId); add('beneficiaryId', b ? b.name : 'مستفيد'); }
  if (f.nec) add('nec', NEC_L[f.nec]);
  if (f.cityId) add('cityId', 'المدينة: ' + cityName(f.cityId) + (f.cityMode === 'withGps' ? ' (مع اقتراحات الموقع)' : ''));
  if (f.noCity) add('noCity', 'بدون مدينة');
  if (f.groupId) { const g = st.get('groups', f.groupId); add('groupId', 'المجموعة: ' + (g ? g.name : '—')); }
  if (f.rate) add('rate', f.label || 'الإنفاق المتغير');
  if (f.savings) add('savings', 'مؤهل للتوفير' + (f.savingsCat ? ': ' + bucketName(f.savingsCat) : ''));
  if (f.txIds) add('txIds', f.label || 'عمليات محددة');
  if (S.q.trim()) add('q', `بحث: «${S.q.trim()}»`);
  if (!f.allTime && !f.txIds) add('period', fperiod(S.period));
  return out;
}
function filtersLine() {
  const chips = activeFilterChips(S.filters);
  if (!chips.length) return '';
  return `<div class="fca-w">${chips.map(c => `<span class="fca"><span>${esc(c.l)}</span><button type="button" data-action="fxClear" data-k="${esc(c.k)}" aria-label="شيل الفلتر">×</button></span>`).join('')}${chips.length > 1 ? `<a class="fca-all" data-action="clearFilters">مسح الكل</a>` : ''}</div>`;
}
function needRow(f) {
  const c = needCounts(); if (!c.total && !f.need) return '';
  let h = `<div class="needs"><button class="chip need ${f.need ? 'on' : ''}" data-action="needToggle">${ico('alert')}<span>يحتاج منك</span><b class="num">${c.total}</b></button>`;
  if (f.need) h += Object.keys(NEED_L).filter(k => c[k] || f.need === k).map(k => `<button class="chip nsub ${f.need === k ? 'on' : ''}" data-action="needPick" data-k="${k}">${NEED_L[k]} <b class="num">${c[k]}</b></button>`).join('');
  return h + '</div>';
}
function vTxs() {
  const f = S.filters, list = filteredTxs();
  const nfc = activeFilterChips(f).filter(x => !['q', 'period'].includes(x.k)).length;
  let h = `<div class="card noprint" style="padding:10px"><div class="srch"><input type="search" id="q" placeholder="ابحث في كل شي: محل، غرض، مبلغ، ملاحظة، مدينة، مجموعة…" value="${esc(S.q)}" data-input="search"><button type="button" class="fbtn ${nfc ? 'on' : ''}" data-action="filterSheet" aria-label="الفلاتر">${ico('filter')}${nfc ? `<span class="fcnt">${nfc}</span>` : ''}</button></div>
    <div class="tseg">${TGROUPS.map(([k, l]) => `<button class="${(f.group || 'all') === k ? 'on' : ''}" data-action="setGroup" data-g="${k}">${l}</button>`).join('')}</div>
    <div id="needrow">${needRow(f)}</div>
    <div id="fline">${filtersLine()}</div></div>`;
  const nDel = store().all('deletedTxs').length;
  return h + `<div id="txlist">${txListHtml(list)}</div>` + (nDel && !S.sel ? `<div class="card"><div class="linkrow" data-action="go" data-view="deleted">${ico('trash')}<span>المحذوفة (${nDel})</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>` : '') + selBar();
}
function txListHtml(list) {
  list = list || filteredTxs();
  const f = S.filters, prod = f.categoryId && f.catBasis === 'products' ? S.prodNet : null;
  // أثرها على الإنفاق: نفس توزيع الأرقام (المستثنى صفر، والتصنيف المختار بحصته بس). «حسب المنتجات»: مجموع الأغراض
  const imp = new Map(list.map(t => [t.id, prod ? (prod.get(t.id) || 0) : txImpact(t, f)]));
  const total = E.round2(Array.from(imp.values()).reduce((s, v) => s + v, 0));
  const partial = !!(prod || f.categoryId || f.nec || f.rate || f.savings || f.groupId);
  const selk = S.view === 'txs' && !S.sel ? ` <a class="selk" data-action="selStart">تحديد</a>` : '';
  let h = `<div class="cntline muted small"><span>${cnt(list.length, 'op')}${total ? ` · ${prod ? 'مجموع الأغراض' : 'أثرها على الإنفاق'} ${fmt(total)}` : ''}</span>${selk}</div>`;
  if (!list.length) return h + `<div class="card empty">لا توجد عمليات بهذه الفلاتر.</div>`;
  let day = null, open = false;
  const limit = S.txLimit || 300;
  // 1.7.0: الجزء اللي يخص الفلتر من العملية (مثل جزء السحب أو الغرض): «200 من 500»
  ROWPART = partial ? imp : null;
  try {
    list.slice(0, limit).forEach(t => {
      const d = t.transactionDate || t.postingDate;
      if (d !== day) { if (open) h += `</div>`; h += `<div class="day">${fday(d)}</div><div class="txs">`; day = d; open = true; }
      h += txRow(t);
    });
  } finally { ROWPART = null; }
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
    ${pasteBankField()}<div class="btns" style="margin-top:8px"><button class="btn p" data-action="pasteSms">اقرأ الرسائل</button></div>
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
  h += `<div class="kpis k5">${tile('تقريب', s.roundUps, 'ينحسب صرف لين تحدد وجهته')}${tile('تحويلات لأشخاص', s.personTransfers, s.temporary ? (s.temporary === s.personTransfers ? 'كلها ما تصنفت' : `${s.temporary} ما تصنفت`) : '')}${tile('غير مصنفة', s.unclassified)}${tile('مشتريات بدون تصنيف', s.uncategorized)}${tile('تجار جدد بدون تصنيف', s.unknownMerchants)}</div>`;
  const newAccs = Array.from(p.newAccounts.values()).filter(a => a.id !== p.account.id);
  const newIns = Array.from(p.newInstruments.values());
  if (newAccs.length || newIns.length) h += `<div class="card"><h2>بيضاف</h2>${newAccs.map(a => `<div class="small">• حساب «${esc(a.name)}» (لك، نوعه ${ACC_L[a.type]})</div>`).join('')}${newIns.map(i => `<div class="small">• أداة «${esc(i.label)}» (المالك: ${OWNER_L[i.instrumentOwner]})</div>`).join('')}</div>`;
  // 1.7.0: سطور تاريخها بعد اليوم: ما تنحفظ إلا إذا أكدتها
  const fut = p.msgRecords ? [] : p.txs.filter(t => E.futureTx(t, E.todayISO()));
  if (fut.length) h += `<div class="card"><h2>تاريخ في المستقبل (${fut.length})</h2><p class="small muted">هذي السطور تاريخها بعد اليوم (غالبًا خطأ في الملف). ما تنحفظ إلا إذا أكدت إن التاريخ صحيح.</p>${fut.map(a => { const on = S.decisions['future:' + a.id] === 'ok';
    return `<div class="pair"><div><span class="b w">تاريخ في المستقبل</span> <b>${esc(a.merchantRaw || a.beneficiaryRaw || '')}</b> · ${fdate(a.transactionDate || a.postingDate, true)} · ${num(a.grossAmount)}</div><div class="seg"><button class="${!on ? 'on' : ''}" data-action="decide" data-id="future:${a.id}" data-val="">لا تحفظها</button><button class="${on ? 'on' : ''}" data-action="decide" data-id="future:${a.id}" data-val="ok">التاريخ صحيح، احفظها</button></div></div>`; }).join('')}</div>`;
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
    ${item('reviewc', 'المراجعة' + (reviewCount() ? ` <span class="cnt">${reviewCount()}</span>` : ''), 'العمليات الجديدة، الرسائل، والبيانات اللي تحتاج قرارك', 'question', PAL.orange)}
    ${item('messages', 'الرسائل البنكية', 'لصق وجلب الرسائل وسجلها', 'msg', PAL.blue)}
    ${item('insights', 'التحليل والتخطيط', 'التوقع، السيولة، الالتزامات، التوفير، المقارنات، السنوي، المدن، المنتجات، المجموعات', 'trend', PAL.violet)}
    ${item('alerts', 'التنبيهات' + (activeAlerts().length ? ` <span class="cnt">${activeAlerts().length}</span>` : ''), 'حدود، التزامات قريبة، اشتراكات محتملة، ارتفاع غير معتاد', 'bell', PAL.orange)}
    ${item('income', 'الدخل', 'دخلك والفائض وأرصدة حساباتك، مستقل عن الصرف', 'income', PAL.green)}
    ${item('report', 'التقرير', 'تقرير الفترة المختارة، للطباعة أو الحفظ PDF', 'doc', PAL.violet)}
    ${item('merchants', 'المحلات', 'سمّ المحل وصنّفه مرة ويتطبق على كل عملياته، وادمج المكرر', 'store', PAL.magenta)}
    ${item('beneficiaries', 'المستفيدون', 'تحويلاتك للأشخاص وحساباتك', 'people', PAL.yellow)}
    ${item('imports', 'سجل الاستيراد', 'الكشوف المستوردة وحذفها', 'upload', PAL.aqua)}
  </div></div><div class="card"><div class="list">
    ${item('categories', 'التصنيفات', 'أضف وعدّل واحذف التصنيفات الرئيسية والفرعية', 'grid', PAL.orange)}
    ${item('rules', 'القواعد', 'صنّف تلقائيًا حسب التاجر أو المستفيد أو النص أو المبلغ', 'repeat', PAL.violet)}
    ${item('formats', 'الصيغ' + (pendingFormats().length ? ` <span class="cnt">${pendingFormats().length}</span>` : ''), 'صيغ الرسائل المعتمدة: الرسالة تنقرأ بس إذا طابقت صيغة', 'msg', PAL.green)}
    ${item('banks', 'البنوك', 'سمّ كل بنك، وشوف صيغه وأشكال تواريخه، وتجاهل مرسل مو بنك', 'bank', PAL.aqua)}
    ${item('smswords', 'كلمات قراءة الرسائل', 'كلمات الاقتراح (نوع الرسالة واسم المحل) ووسيلة الدفع', 'msg', PAL.blue)}
    ${item('limits', 'حدود الصرف', 'حد لكل تصنيف (حسب الفواتير أو المنتجات) أو للإنفاق الكلي', 'wallet', PAL.green)}
    ${item('ignore', 'الفترات', 'مدينة أو مجموعة أو تجاهل علامات، من تاريخ لتاريخ', 'cal', PAL.gray)}
    ${item('audit', 'سجل التعديلات', 'كل تعديل مع التراجع والإعادة', 'list', PAL.gray)}
    ${item('settings', 'الإعدادات', 'الدورة، يوم الراتب، أسماؤك، وجهة التقريب', 'gear', PAL.gray)}
    ${item('backup', 'النسخ الاحتياطي', 'تصدير واستعادة', 'shield', PAL.green)}
    ${item('methods', 'طريقة الحساب', 'كيف ينحسب كل رقم', 'chart', PAL.blue)}
  </div></div><div class="muted small" style="text-align:center" data-action="go" data-view="settings">الإصدار ${E.version} · البيانات على هذا الجهاز فقط</div>`;
}
function vMerchants() {
  const st = store();
  const stats = new Map(); st.all('transactions').forEach(t => { if (!t.merchantId) return; const s = stats.get(t.merchantId) || { n: 0, sum: 0 }; s.n++; s.sum += E.spendEffect(t) + E.feeOf(t); stats.set(t.merchantId, s); });
  const onlyNone = S.merchantsOnlyNone;
  let list = st.all('merchants').filter(m => stats.has(m.id));
  const noneCount = list.filter(m => !m.categoryId && !m.suggestedCategoryId).length;
  if (onlyNone) list = list.filter(m => !m.categoryId && !m.suggestedCategoryId);
  list.sort((a, b) => (stats.get(b.id).sum) - (stats.get(a.id).sum));
  return `<div class="card"><h2>المحلات</h2><p class="small muted">اضغط أي محل تسميه أو تصنفه أو تدمجه مع محل ثاني. التصنيف من هنا يتطبق على كل عملياته السابقة والقادمة (ما عدا اللي صنفتها يدويًا لعملية وحدة).</p>
    <div class="chips"><button class="chip ${!onlyNone ? 'on' : ''}" data-action="merchantsFilter" data-v="0">الكل (${st.all('merchants').filter(m => stats.has(m.id)).length})</button><button class="chip ${onlyNone ? 'on' : ''}" data-action="merchantsFilter" data-v="1">بدون تصنيف (${noneCount})</button></div>
    <div class="list">${list.map(m => { const s = stats.get(m.id); const cat = m.categoryId || m.suggestedCategoryId; return `<div class="it" data-action="editMerchant" data-id="${m.id}"><div class="m"><div class="t">${esc(E.merchantName(m))}</div>${m.userName ? `<div class="s">${esc(m.name)}</div>` : ''}<div class="s">${cnt(s.n, 'op')} · ${cat ? esc(E.catName(st, cat)) + (m.categoryId ? '' : ' (تلقائي)') : '<span class="warn-t">بدون تصنيف</span>'}</div></div>${num(E.round2(s.sum))}</div>`; }).join('')}</div></div>`;
}
function vSettings() {
  const s = settings();
  const dest = s.roundUpDestination || { kind: 'unknown' };
  const destLabel = dest.kind === 'account' ? 'حساب: ' + ((accOf(dest.accountId) || {}).name || '') : dest.kind === 'charity' ? 'جهة خيرية (تبرعات)' : 'غير محددة';
  return `${updateCard()}<div class="card"><h2>الدورة المالية</h2>
    <div class="seg"><button class="${s.cycleMode === 'salary' ? 'on' : ''}" data-action="setCycleMode" data-v="salary">دورة الراتب</button><button class="${s.cycleMode === 'calendar' ? 'on' : ''}" data-action="setCycleMode" data-v="calendar">الشهر الميلادي</button></div>
    <label class="f">يوم الراتب الافتراضي (يُستخدم إذا ما وُجد الراتب)</label><input type="number" id="payday" min="1" max="31" value="${s.defaultPayday}">
    <p class="small muted">الدورة تبدأ من تاريخ عملية الراتب نفسها، وكل عمليات ذاك اليوم تدخل في الدورة الجديدة. المكافأة والاسترداد والتحويل الداخلي ما تبدأ دورة.</p></div>
    <div class="card"><h2>أسماؤك كما تظهر في الكشوف</h2><p class="small muted">أي تحويل من أو إلى هذي الأسماء يُعتبر تحويلًا داخليًا. اسم في كل سطر.</p><textarea id="aliases" rows="4">${esc((s.ownerAliases || []).join('\n'))}</textarea></div>
    <div class="card"><h2>التصنيفات</h2><p class="small muted">أضف تصنيف رئيسي أو فرعي، وغيّر الاسم والإيموجي واللون والخصائص.</p><button class="btn" data-action="go" data-view="categories">إدارة التصنيفات</button></div>
    ${settingsCityCard()}
    ${commitSettingsCard()}
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
    // 1.7.0: كل خاصية تبدأ «غير محدد» وانت تحددها. الفرعي «يتبع الرئيسي»
    const inh = isMain ? opt('', 'غير محدد', '') : opt('', 'يتبع الرئيسي', '');
    const cur = (key) => { const v = val(key, c ? c[key] : null); return v === null || v === undefined ? '' : String(v); };
    h += `<div class="grid2"><div><label class="f">التكرار</label><select id="ce_rec">${inh.replace('selected', '')}${opt('recurring', 'متكرر', cur('defaultRecurrenceType'))}${opt('variable', 'متغير', cur('defaultRecurrenceType'))}</select></div>
      <div><label class="f">الضرورة</label><select id="ce_nec">${inh}${opt('essential', 'ضروري', cur('defaultNecessityType'))}${opt('discretionary', 'كمالي', cur('defaultNecessityType'))}</select></div>
      <div><label class="f">التزام دائم</label><select id="ce_commit">${inh}${opt('true', 'نعم', cur('isCommitment'))}${opt('false', 'لا', cur('isCommitment'))}</select></div>
      <div><label class="f">يدخل فرص التوفير</label><select id="ce_save">${inh}${opt('true', 'نعم', cur('savingsEligible'))}${opt('false', 'لا', cur('savingsEligible'))}</select></div></div>
      <p class="small muted">«التزام دائم» يدخل «الالتزامات الدائمة» (ما يحتاج تكون متكررة). المحل أو المستفيد أو العملية نفسها تقدر تغيّره لها.</p>`;
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
    const b = (x) => x === '' || x === undefined ? null : x === 'true';
    d.defaultRecurrenceType = v('ce_rec') || null;
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
  return `<div class="card"><h2>أشكال التاريخ في الرسائل</h2><p class="small muted">كل شكل تاريخ جديد يسألك عنه التطبيق مرة لكل بنك، ويعتمد جوابك لكل رسالة بنفس الشكل من نفس البنك (1.6.2: البنك الجديد ما ياخذ ترتيب بنك ثاني).</p>
    ${keys.length ? `<div class="list">${keys.map(k => `<div class="it" data-action="shapeEdit" data-sig="${esc(k)}"><div class="m"><div class="t">${shapeSampleHtml(sh[k].sample || k, (SR().findDateToken(sh[k].sample || '') || {}).raw)}</div><div class="s">${OL[sh[k].order] || sh[k].order} · ${k.includes('§') ? esc(E.bankLabel(store(), k.split('§')[0])) : 'الرسائل الملصوقة بدون بنك'}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div>` : '<div class="muted small">ما فيه أشكال محفوظة للحين.</div>'}</div>`;
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
    <div><div class="l">منه ما عُرف نوعه</div><div class="v">${num(R.unclassifiedOut)}</div></div><div><div class="l">داخل غير مصنف</div><div class="v">${num(R.unclassifiedIn)}</div></div><div><div class="l">الالتزامات الدائمة</div><div class="v">${num(R.commitments)}</div></div>
    <div><div class="l">التحويلات الداخلية</div><div class="v">${num(R.internal)}</div></div><div><div class="l">سداد البطاقات</div><div class="v">${num(R.cardPayments)}</div></div><div><div class="l">الرسوم</div><div class="v">${num(R.fees)}</div></div></div>`;
  if (R.temporaryCount || R.unownedCount) h += `<p class="small">منه ${fmt(R.temporarySpend)} تحويلات لأشخاص ما صنفتها${R.unownedCount ? `، و${fmt(R.unownedSpend)} بأدوات مالكها غير محدد` : ''}.</p>`;
  h += `<h2>الدخل</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>النوع</th><th class="n">المبلغ</th></tr></thead><tbody>${rowsTx(R.incomeItems) || '<tr><td colspan="4">لا يوجد</td></tr>'}</tbody></table>`;
  h += `<h2>الإنفاق حسب التصنيف</h2><table><thead><tr><th>التصنيف</th><th class="n">المبلغ</th><th class="n">النسبة</th></tr></thead><tbody>${R.categories.filter(c => c.amount).map(c => `<tr><td><b>${esc(bucketName(c.categoryId))}</b></td><td class="n"><b>${num(c.amount)}</b></td><td class="n"><span class="num">${R.spend ? Math.round(c.amount / R.spend * 100) : 0}%</span></td></tr>${c.subs.length > 1 || (c.subs[0] && c.subs[0].subcategoryId) ? c.subs.map(s => `<tr><td class="small" style="padding-inline-start:18px">${esc(s.subcategoryId ? (st.get('categories', s.subcategoryId) || {}).name : 'بدون فرعي')}</td><td class="n small">${num(s.amount)}</td><td></td></tr>`).join('') : ''}`).join('')}</tbody></table>`;
  h += `<h2>الالتزامات الدائمة</h2><table><thead><tr><th>التاريخ</th><th>الجهة</th><th>التصنيف</th><th class="n">المبلغ</th></tr></thead><tbody>${rowsTx(R.commitmentItems) || '<tr><td colspan="4">لا يوجد</td></tr>'}</tbody></table>`;
  const itx = all.filter(t => t.transactionType === 'InternalTransfer' && !isRoundUpUnknown(t) && !(t.transferLinkStatus === 'linked' && t.direction === 'in'));
  h += `<h2>التحويلات الداخلية</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الحالة</th><th class="n">المبلغ</th></tr></thead><tbody>${itx.map(t => `<tr><td>${fdate(t.transactionDate)}</td><td>${esc(txTitle(t))} (${t.direction === 'out' ? 'خارج' : 'داخل'})</td><td>${t.transferLinkStatus === 'linked' ? 'مربوط بطرفيه' : 'غير مكتمل الربط'}</td><td class="n">${num(t.principalAmount)}</td></tr>`).join('') || '<tr><td colspan="4">لا يوجد</td></tr>'}</tbody></table>`;
  const ctx = all.filter(t => t.transactionType === 'CreditCardPayment' && !(t.transferLinkStatus === 'linked' && t.direction === 'in'));
  h += `<h2>سداد البطاقات</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الحالة</th><th class="n">المبلغ</th></tr></thead><tbody>${ctx.map(t => `<tr><td>${fdate(t.transactionDate)}</td><td>${esc(txTitle(t))}</td><td>${t.cardPaymentStatus === 'matched' ? 'مطابق' : t.targetCardLast4 ? 'غير مطابق' : 'البطاقة غير معروفة'}</td><td class="n">${num(t.principalAmount)}</td></tr>`).join('') || '<tr><td colspan="4">لا يوجد</td></tr>'}</tbody></table>`;
  const unc = all.filter(t => t.transactionType === 'Unknown' || isRoundUpUnknown(t));
  const ruN = unc.filter(isRoundUpUnknown);
  h += `<h2>غير المصنف</h2><table><thead><tr><th>التاريخ</th><th>البيان</th><th>الاتجاه</th><th class="n">المبلغ</th></tr></thead><tbody>${ruN.length ? `<tr><td>—</td><td>تقريب (${cnt(ruN.length, 'op')}، الوجهة غير معروفة)</td><td>خارج</td><td class="n">${num(E.round2(ruN.reduce((s, t) => s + t.grossAmount, 0)))}</td></tr>` : ''}${unc.filter(t => !isRoundUpUnknown(t)).map(t => `<tr><td>${fdate(t.transactionDate)}</td><td>${esc(txTitle(t))}</td><td>${t.direction === 'out' ? 'خارج' : 'داخل'}</td><td class="n">${num(t.grossAmount)}</td></tr>`).join('')}${!unc.length ? '<tr><td colspan="4">لا يوجد</td></tr>' : ''}</tbody></table>`;
  h += `<h2>أكثر التجار</h2><table><thead><tr><th>التاجر</th><th class="n">عدد العمليات</th><th class="n">المبلغ</th></tr></thead><tbody>${R.topMerchants.slice(0, 15).map(m => `<tr><td>${esc(E.merchantName(st.get('merchants', m.merchantId)))}</td><td class="n"><span class="num">${m.count}</span></td><td class="n">${num(m.amount)}</td></tr>`).join('') || '<tr><td colspan="3">لا يوجد</td></tr>'}</tbody></table>`;
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
  <tr><td>تحويل لشخص</td><td>+ (ينحسب صرف حتى لو ما صنفته)</td><td>0</td></tr>
  <tr><td>عملية خارجة ما عُرف نوعها</td><td>+ الإجمالي، تحت «بدون تصنيف»</td><td>0</td></tr>
  <tr><td>تقريب وجهته غير محددة</td><td>+ تحت «تقريب (وجهته غير محددة)» لين تحدد وجهته</td><td>0</td></tr>
  <tr><td>تحويل بين حساباتك، سداد بطاقة، إيداع نقدي، سلفة وسدادها</td><td>0</td><td>0</td></tr>
  <tr><td>استرداد</td><td>− من دورة الشراء وتصنيفه إذا ربطته بشرائه، وإلا من دورته هو ونفس تصنيف التاجر</td><td>0</td></tr>
  <tr><td>مصروف نقدي يدوي</td><td>+ إذا «صرف مباشر» (نقد من مصدر ثاني). 0 إذا من سحب: يصير جزء من السحب</td><td>0</td></tr>
  <tr><td>دخل</td><td>0</td><td>+ (المؤكد فقط)</td></tr><tr><td>داخل ما عُرف نوعه</td><td>0</td><td>يظهر «داخل غير مصنف»</td></tr></tbody></table>
  <p><b>الرسوم (1.7.0)</b>: كل عملية فيها أصل ورسوم وضريبة وإجمالي. العملية تنحسب كاملة (مع رسومها) تحت تصنيفها هي بس، وما تنفصل الرسوم لتصنيف ثاني. السحب النقدي المقسّم: أجزاؤه على صافي السحب، ورسوم الصراف تبقى تحت تصنيف السحب («سحب نقدي» افتراضيًا). الرسوم تنحسب إنفاقًا حتى لو الأصل ما ينحسب (مثل حوالة لحسابك: الـ200 ما تنحسب والـ0.29 تنحسب)، وتكون تحت تصنيف الحوالة، و«بدون تصنيف» إذا ما لها تصنيف. العملية اللي هي رسوم بس (أو اسمها «رسوم») يطلع لها اقتراح «رسوم» وما تتصنف إلا إذا وافقت. «رسوم» صار تصنيف عادي (تغيّر اسمه أو تحذفه). «دفعت رسوم» في «صرفياتك» معلومة بس (مجموع الرسوم في الفترة)، والمجموع الكلي ما تغيّر عن قبل؛ اللي تغيّر التوزيع بس.</p>
  <h3>الأرقام الرئيسية</h3><ul>
  <li><b>الرئيسية</b> تعرض صرفك في الدورة الحالية والالتزامات بس. الدخل والفائض وأرصدة الحسابات في صفحة «الدخل» (داخل «المزيد»)، مستقلة عن الصرف. والسيولة في «التحليل والتخطيط ← السيولة» (1.6.1: انشالت من الرئيسية).</li>
  <li><b>الإنفاق الحقيقي</b> = أثر الإنفاق لكل العمليات (الجدول فوق) + الرسوم − الاستردادات. يشمل التحويلات لأشخاص اللي ما صنفتها، والبطاقات اللي مالكها غير محدد (معلّمة). لا يشمل: العمليات اللي اخترت لها «لا تحسبها في الصرف»، والأدوات اللي استبعدتها من مصروفك، والعمليات المحذوفة.</li>
  <li>الصرف اللي ما له تصنيف يدخل الإنفاق تحت «بدون تصنيف».</li>
  <li><b>الدخل المؤكد</b> = مجموع عمليات الدخل المصنفة. <b>الفائض</b> = الدخل المؤكد − الإنفاق الحقيقي. الاثنين في صفحة «الدخل».</li>
  <li><b>منه ما عُرف نوعه</b> = العمليات الخارجة اللي نوعها غير معروف، والتقريب اللي وجهته غير محددة. داخلة في الإنفاق، ومعروضة لحالها عشان تصنفها.</li>
  <li><b>التحويلات الداخلية وسداد البطاقات</b>: كل تحويل ينحسب مرة وحدة. إذا توفر طرفاه (خارج من حساب وداخل لحساب ثاني) ينربطان ويُحسب الخارج فقط. الطرف الوحيد يُحسب ويُعلَّم «غير مكتمل الربط».</li>
  <li><b>تحويلك لنفسك</b> يُعرف من أسمائك المحفوظة في الإعدادات: التحويل الصادر لمستفيد باسمك يصير تحويلًا داخليًا ويُضاف حسابه لحساباتك، والوارد من اسمك يصير تحويلًا داخليًا. إذا أضفت اسمًا لاحقًا، يُطبَّق على العمليات السابقة أيضًا.</li>
  <li><b>الالتزامات الدائمة</b> = عمليات الصرف (شراء، تحويل لشخص، مصروف نقدي) المعلّمة «التزام دائم»، مع رسومها. ما يشترط تكون متكررة. «التزام دائم» تحدده أنت على العملية أو المحل/المستفيد أو التصنيف الفرعي أو الرئيسي، والأدق يغلب. <b>(1.7.1)</b> المحل أو المستفيد المعلّم ما ينحسب التزام إلا بعد ما تجاوب على «سؤال الاعتماد» (أو إذا آخر 3 دفعات له متساوية)؛ قبلها مبالغه مع «غير محدد». العملية المعلّمة اللي ما لها محل ولا مستفيد تنحسب مباشرة. المتكرر اللي يكتشفه التطبيق اقتراح بس («تضيفه التزام دائم؟»)، و«نعم» تحفظه على المحل أو المستفيد نفسه.</li>
  <li>التكرار والضرورة والالتزام وفرص التوفير تؤخذ من الأدق: العملية ← المحل أو المستفيد ← التصنيف الفرعي ← التصنيف الرئيسي. <b>(1.7.0)</b> كلها تبدأ «غير محدد» لين تحددها (ما نخمّن)، والصرف اللي ما تحددت خاصيته يطلع «X ريال غير محدد» في صفحته مع زر «حدّدها».</li></ul>
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
  <li>استثناء كشف البطاقة (بدون وقت): دمج تلقائي إذا تطابق التاريخ والبطاقة والتاجر وما فيه مرشح منافس.</li>
  <li><b>رسالة مع رسالة (1.5.2)</b>: البنك يرسل رسالة لكل عملية، فرسالتين مختلفتين ما تندمج وحدة في الثانية أبدًا، حتى لو نفس المبلغ والبطاقة والمتجر وبينهم دقايق. الرسالة تندمج فقط مع عملية من الكشف أو إدخالك. الرسائل اللي اندمجت كذا قبل 1.5.2 انفصلت تلقائيًا (وأي عملية ترجع من المحذوفة بنفس الحالة تنفصل وقتها)، ما عدا اللي دمجتها بنفسك في المراجعة؛ والعملية الأصلية تبقى بتصنيفها وأغراضها.</li></ul>
  <h3>الرسوم الأجنبية</h3><p>في شراء VISA بسعر أصلي بالريال، الفرق بين المخصوم والسعر يُسجَّل رسومًا فقط إذا طابق نسبة رسوم العملة الأجنبية (2% + ضريبتها = 2.3%)، وتقسيمه بين رسوم وضريبة غير معروف. غير ذلك ما يُفصل.</p>
  <h3>التقريب</h3><p>سطر يكرر نص الشراء وينتهي بـ«####» ومبلغه يكمّل الشراء لأقرب ريال. يُربط بالشراء للتفسير فقط. وجهته غير المحددة: ينحسب صرف تحت بند «تقريب (وجهته غير محددة)»؛ إذا حددت حساب ادخار يصير تحويلًا داخليًا وما ينحسب، وإذا جهة خيرية ينحسب تحت «تبرعات».</p>
  <h3>الرسائل البنكية</h3><ul>
  <li><b>اللصق</b>: الرسائل تنفصل بالسطر الفاضي أولًا. إذا ما فيه سطر فاضي، رسالة جديدة تبدأ عند سطر أوله كلمة نوع (شراء، حوالة، سحب، إيداع، سداد…)، وأي جزء ما فيه مبلغ ولا تاريخ ولا وقت يلتصق بالرسالة اللي قبله. إذا الفصل بكلمات البداية أو فيه شك (أكثر من بداية أو تاريخ في رسالة، أو مبالغ كثيرة) يطلب التطبيق تأكيد عدد الرسائل قبل المعالجة.</li>
  <li><b>المسار (1.7.1)</b>: الرسالة (لصق أو من الصندوق) ← تحقق من رقم الطلب محليًا ← رمز تحقق؟ ← هل تطابق صيغة معتمدة؟ ← قراءة بالصيغة ← الحساب والبطاقة ← التاجر أو المستفيد ← القواعد ← المطابقة ← حفظ أو مراجعة.</li>
  <li><b>رسائل الرمز</b>: «رمز تحقق» فقط بعبارات قوية (رمز التحقق، كلمة مرور لمرة واحدة، OTP، verification code، لا تشارك هذا الرمز، login code…): تنحذف تلقائي وما ينحفظ نصها. كلمة مفردة مثل «رمز» ما تكفي: الرسالة المشكوك فيها تروح المراجعة ومعها زر «رسالة رمز (احذف نصها)».</li>
  <li><b>الصيغ الثابتة (1.7.1): بدون تخمين</b>. الرسالة تنقرأ بس إذا طابقت <b>صيغة معتمدة</b> بالضبط: نفس عدد السطور، ونفس الكلام الثابت بنفس الترتيب. سطر زايد أو كلمة ثابتة جديدة (مثل «رسوم» أو «المبلغ المستحق») = شكل جديد. المطابقة: الحروف الكبيرة والصغيرة سوا، أ/ا/إ/آ وة/ه وى/ي سوا، وعدد المسافات ما يفرق (بس المسافة بين الكلمة والمتغير لازم تكون موجودة: «من» ما تطابق «منتهية»). الأرقام اللي ما حددتها متغير تعتبر متغيرة من نفسها (أي رقم يطابق أي رقم)، وكذلك نجوم الإخفاء. الصيغة لبنكها (المرسل)، والرسالة الملصوقة بدون بنك تجرّب صيغ كل البنوك.</li>
  <li><b>حدود المتغيرات (عشان ما يمر شي بالغلط)</b>: اسم المحل أو المستفيد ما يبلع كلام زايد فيه مبلغ بعملة (مثل «… رسوم SAR 5.00»): شكل جديد. «نص يتغير» = نفس عدد الكلمات اللي حددتها. الرسالة اللي فيها «مرفوضة / فشل / لم تتم» ما تطابق صيغة مثالها ما فيه هالكلام. المبلغ: أرقام بفواصل آلاف صحيحة، ولازم بالريال (مبلغ بعملة أجنبية بدون مقابل بالريال ما يتعرّف صيغة: أدخله يدويًا). التاريخ: لازم بنفس ترتيب وشكل مثال الصيغة، وإلا «ما قدرت أقرأ». الرسوم «داخل المبلغ» أكبر من المبلغ = «ما قدرت أقرأ». لو أكثر من صيغة تطابق الرسالة: الأدق (اللي نصها الثابت أطول) تغلب. سطر أطول من 300 حرف ما يطابق أي صيغة. والشكل له صيغة وحدة لكل بنك: لو عرّفته مرة ثانية يعتبر تعديل.</li>
  <li><b>شكل جديد</b> (أي رسالة ما لها صيغة، حتى اللي ما فيها مبلغ): تنتظر في «المراجعة» بثلاثة أزرار: «عملية: عرّف الصيغة»، «معلومات ولا تسألني عن هالشكل» (تنحفظ صيغة معلومات، واللي بنفس الشكل بعدها تنحفظ معلومات بدون سؤال)، «معلومات هالمرة بس». الرسائل المنتظرة اللي بنفس الشكل تطلع بطاقة وحدة وقرارها واحد. «مو بنك: تجاهل رسائله» للمرسل كله. الرسالة اللي فيها رمز محتمل ما لها «ولا تسألني» (عشان ما تنحفظ الرموز الجاية): «رسالة رمز (احذف نصها)» أو «معلومات هالمرة بس».</li>
  <li><b>تعريف الصيغة</b>: تختار نوع العملية وتأشّر في الرسالة على المتغيرات: المبلغ (مطلوب)، والمحل أو المستفيد أو المرسل، آخر 4 للبطاقة وللحساب، الرصيد، الرسوم، التاريخ، الوقت، وسيلة الدفع، و«نص يتغير» (كلام يتغير وما يهمك مثل رقم مرجع). تجيك معبّاة باقتراح التطبيق (من القارئ العام وكلمات القراءة) وأنت تصحح وتعتمد؛ الاقتراح ما ينحفظ منه شي لين تعتمد. التاريخ الملتبس (مثل 05/09/26) تختار ترتيبه مرة وينحفظ مع الصيغة. المتغير الرقمي داخل كلمة (مثل «**1234» أو «SAR250.00») ياخذ الرقم بس والباقي نص ثابت. اللي ما حددته ما ينقرأ: العملية بدون محل إذا ما أشّرت على المحل (ما يعتبر ناقص)، والتاريخ إذا ما أشّرت عليه من أول تاريخ في الرسالة بترتيب «شكله» (وإلا يوم وصولها)، والوقت من أول وقت مكتوب. وسيلة الدفع لرسالة الشراء أو الاسترداد من «كلمات قراءة الرسائل» (Apple Pay، أونلاين، وإلا نقاط بيع) إذا ما حددتها.</li>
  <li><b>الرسوم في الصيغة</b>: متغير اختياري. إذا حددتها تختار: «داخل المبلغ» (المبلغ اللي أشّرت عليه شاملها: العملية = المبلغ) أو «فوق المبلغ» (العملية = المبلغ + الرسوم). وينحفظ مع الصيغة. إذا المبلغ + الرسوم يساوي رقم ثالث مكتوب في الرسالة، الاقتراح «فوق المبلغ». إذا ما حددت الرسوم: العملية بالمبلغ اللي أشّرت عليه بس. والرسوم في كل الأحوال تنحسب مع عمليتها على تصنيفها (1.7.0).</li>
  <li><b>طابقت صيغة ومتغير ما انقرأ</b> (مثل تاريخ غير صالح): تروح المراجعة «ما قدرت أقرأ الرسالة» وتعدّل الصيغة أو تدخلها يدويًا.</li>
  <li><b>صفحة «الصيغ»</b> (في «المزيد»): كل صيغة مع مثال وقراءته وعدد الرسائل اللي تطابقها. تعدّلها أو تحذفها (الحذف ما يغيّر العمليات المحفوظة، والرسائل الجاية بنفس الشكل ترجع تسألك). بعد أي تعريف أو تعديل، إذا فيه رسائل سابقة تطابق الصيغة وقراءتها تختلف (أو كانت «معلومات» وبتصير عمليات) يسألك: <b>من الحين وطالع</b>، <b>على الكل</b>، أو <b>من تاريخ تحدده</b>. التصحيح يمس اللي انقرأ من الرسالة بس (النوع، المبلغ والرسوم، الاسم، وسيلة الدفع، الرصيد، والتاريخ إذا الصيغة تحدده وأنت ما حددته بيدك)، وتصنيفك وأغراضك ومدينتك وملاحظاتك تبقى؛ والعملية المدموجة مع كشف يتصحح فيها وسيلة الدفع والاسم الناقص بس. العملية ما تنحذف أبدًا.</li>
  <li><b>أشكال رسائلك السابقة (ترقية 1.7.1)</b>: رسائلك المحفوظة تجمعت حسب شكلها، وكل شكل طلع في «الصيغ» ينتظر اعتمادك مع مثال وقراءته السابقة: «اعتمد»، «عدّل»، «هذي معلومات»، أو «تجاهل الشكل». رسائل العمليات كلها، ورسائل «المعلومات» اللي فيها مبلغ أو تكرر شكلها (المعلومة اللي بدون مبلغ وجات مرة وحدة، مثل إعلان، ما تطلع). لين تعتمد الشكل، رسائله الجديدة تنتظر في «المراجعة» وتنعالج كلها أول ما تعتمده. صيغ ما قبل 1.7.1 والقارئ العام صاروا للاقتراح بس.</li>
  <li><b>بطاقة ائتمانية (1.7.1)</b>: شراء أو سحب أو استرداد ببطاقة ائتمانية (مكتوب في الرسالة «بطاقة ائتمانية» أو credit card، ومو مدى) معروفة ينحفظ على البطاقة نفسها حتى لو الرسالة فيها رقم الحساب الجاري المربوط. والبطاقة الائتمانية اللي ما يعرفها التطبيق تتسجل «بطاقة …XXXX» مؤقتة، مو على الحساب الجاري (ورصيد هالرسائل ما يؤخذ: المتاح في البطاقة مو رصيد الحساب).</li>
  <li><b>تاريخ العملية</b>: أول تاريخ في نص الرسالة، ويُقرأ بترتيب «شكله» المحفوظ (سنة-شهر-يوم أو يوم-شهر-سنة أو شهر-يوم-سنة). الشكل = نوع أجزاء التاريخ والفاصل بينها، وموضع الوقت، والكلمة اللي قبله، مثل «في 19:03 26-09-28». <b>(1.6.2) الأشكال لكل بنك</b>: البنك الجديد ما ياخذ ترتيب بنك ثاني حتى لو شكل تاريخه نفسه (مثلًا «05-09-26» عند بنك يوم-شهر-سنة ما ينقرأ 2005)، والرسائل الملصوقة بدون بنك لها الأشكال العامة. أول مرة يجي شكل جديد يسألك التطبيق دائمًا ويعرض التواريخ المحتملة، والرسالة (ملصوقة أو من الصندوق) تنتظر في المراجعة ما تنحفظ لين تجاوب. إذا طلع التاريخ بعد وقت وصول الرسالة أو لصقها بأكثر من يوم: مراجعة لهذي الرسالة بس، والترتيب المحفوظ ما يتغير. <b>(1.6.2) التاريخ القديم</b>: رسالة من الصندوق تاريخها أقدم من وقت وصولها بأكثر من يومين (غالبًا قراءة غلط) تروح المراجعة «تاريخ أقدم من وصول الرسالة» وتختار تاريخها؛ الملصوقة ما ينطبق عليها. تغيير ترتيب شكل من «الإعدادات» يصحح تاريخ العمليات اللي جا تاريخها آليًا من نفس الشكل فقط، وما يغيّر تاريخ حددته بنفسك ولا عملية أصلها كشف. الصيغة المتعلّمة اللي فيها حقل تاريخ تستخدم ترتيبها هي. إذا الرسالة ما فيها تاريخ: رسالة الصندوق تاخذ تاريخ استلامها، والملصوقة تروح المراجعة لين تحدد تاريخها. وقت الاستلام ما يعتبر وقت العملية. <b>(1.7.0) رسائل آخر الليل</b>: بعض البنوك (مثل الإنماء بعد حوالي 8:30 الليل) تكتب تاريخ اليوم الجاي. إذا التاريخ المكتوب = يوم وصول الرسالة + 1 (بتوقيت السعودية)، العملية تنحفظ على يوم الوصول والوقت يبقى نفسه (رسائل الصندوق واللصق بنفس الليلة). بعد يومين أو أكثر = مراجعة مثل قبل. العمليات القديمة اللي انحفظت على اليوم الجاي تصححت مع التحديث (اللي تاريخها من رسالتها بس، مو اللي حددته بنفسك ولا اللي فيها كشف)، وتلقاها خطوة في «سجل التعديلات». الرسالة اللي لصقتها بعد أيام ما ينعرف إنها من هالنوع. صيغة متعلّمة تاريخها في المستقبل وما لها شكل تاريخ معروف: تروح المراجعة «حدد التاريخ».</li>
  <li><b>المستفيد</b>: بالبصمة (الآيبان أو رقم الحساب قبل إخفائه)، أو آخر 4 أرقام مع الاسم مطابق تمامًا. ما فيه مطابقة تقريبية لأسماء الأشخاص.</li>
  <li><b>منع التكرار</b>: رقم الطلب هو المفتاح؛ رسالة محفوظة سابقًا ما تنعالج مرة ثانية (يتأكد استلامها فقط). نفس النص بالضبط (حتى الوقت) برقم جديد، أو نسخة منها لصقتها (الفرق بس في المرسل أو إخفاء الأرقام: نفس اليوم والدقيقة والمبلغ والبطاقة والتاجر، والرصيد والمرجع ما يختلفون؛ وبدون تاجر لازم رصيد أو مرجع متطابق) = نفس الرسالة وصلت مرتين: تنحسب مرة وحدة تلقائيًا وتطلع في «المراجعة» تحت «مكررة تلقائيًا» ومعها «مو مكررة» لو كانت عمليتين، إلا إذا الرسالة السابقة تجاهلتها أو كانت معلومات فقط (ما سوّت عملية). قرارك في المراجعة (عالجها، الحساب، التاريخ) ينحفظ على الرسالة، فما ينسأل مرة ثانية لو احتاجت مراجعة ثانية. المطابقة مع عمليات الكشف والإدخال اليدوي بنفس نقاط الكشوف: دليل حاسم أو 90+ دمج، 65–89 أو تعادل مراجعة (ما تنحسب لين تقرر)، أقل مستقلة. ومع عملية من رسالة ثانية: ما فيه مطابقة (عمليتان). الاتصال بالصندوق ينتظر لين 60 ثانية، وتأكيد الاستلام يتعاد مرة وحدة تلقائيًا إذا ما رجع رد.</li>
  <li><b>لما يوصل الكشف بعد الرسالة</b>: يندمج معها، والكشف يكمّل الأصل والرسوم وتاريخ القيد والرصيد والمرجع والمستفيد. تصنيفك يبقى.</li>
  <li><b>الرسائل ما تعتبر تغطية</b>: تنبيه «البيانات ناقصة» والمقارنات تعتمد على الكشوف فقط.</li>
  <li><b>تأكيد الاستلام (ack)</b> ما يرسل إلا بعد نجاح الحفظ على الجهاز. إذا فشل الحفظ، البيانات في الذاكرة ترجع لآخر حالة محفوظة فعلًا، والرسالة تبقى في الصندوق وتنعالج في الجلب القادم. إذا انحفظت الرسالة وما وصل رد التأكيد (مثلًا طلعت من التطبيق لحظتها)، كل جلب يعيد التأكيد لها لين يوصل، وعلامة «لم يتأكد الاستلام» تختفي.</li>
  <li><b>بعد الجلب أو اللصق</b>: نافذة «عمليات جديدة» تعرض كل عملية انضافت (اللي بدون تصنيف بلون برتقالي) وأي بطاقة جديدة تسألك عن مالكها.</li>
  <li><b>الأوقات</b> (آخر جلب، وقت وصول الرسالة، سجل التعديلات) تنعرض بوقت جهازك.</li>
  <li><b>من أي بنك؟</b> عند اللصق: «ما أدري» = أشكال التاريخ العامة، وتجرّب صيغ كل البنوك. إذا اخترت بنك، الرسائل تنقرأ بصيغه وأشكال تواريخه. الملصوقة تمشي على نفس الصيغ: اللي ما لها صيغة تنتظر في «المراجعة».</li></ul>
  <h3>البنوك</h3><p>البنك = اسم المرسل اللي يرسله الاختصار (رسالة توصل بدون اسم مرسل ما تنحسب على بنك: صيغها وأشكال تواريخها عامة، وصفحة «البنوك» تنبهك). صفحة «البنوك» في «المزيد» فيها كل مرسل وصلت منه رسائل: تسميه (الإنماء، الراجحي…)، وتشوف صيغه المعتمدة وأشكال تواريخه، وتدمج مرسلين في بنك واحد لو البنك غيّر اسم المرسل (نفس الصيغ والأشكال؛ وتقدر تفك الدمج). <b>(1.7.1)</b> سؤال «اعتمد القراءة لهالبنك» انشال: اعتماد الصيغة يغني عنه.</p>
  <p><b>مرسل متجاهل</b> («مو بنك: تجاهل رسائله»، من البطاقة في المراجعة أو من صفحة البنك)، مثل STC لما يرسل تأكيد شراء بعد رسالة البنك: رسائله تنحفظ «من مرسل متجاهل» بنصها بدون عمليات، والمعلّقة منه في المراجعة تنقفل بنفس الطريقة، والعمليات المحفوظة ما تتغير. رسائل الرمز منه تنحذف بدون نص مثل دايم. «إلغاء التجاهل» يسألك إذا تعيد قراءة رسائله المحفوظة (اللي لها صيغة معتمدة تنحفظ، والباقي ينتظر في «المراجعة»).</p>
  <h3>التحديثات (1.6.2)</h3><p>كل ما ترجع للتطبيق (وكل نص ساعة وهو مفتوح) يسأل الموقع عن نسخة جديدة. «فحص التحديثات» في الإعدادات يعرض نسختك وآخر نسخة على الموقع، وإذا فيه جديد ينزّله ويطلع «حدّث الحين». «تحديث إجباري» لو علق: ينزّل كل ملفات التطبيق من الموقع مباشرة، وإذا وصلت كلها يحطها مكان المحفوظة في الجوال ويعيد الفتح؛ وإذا انقطع الاتصال في النص ما يتغير شي ويبقى التطبيق يشتغل بدون إنترنت. البيانات المالية (IndexedDB) ما تنلمس.</p>
  <h3>التصنيفات</h3><p>كل تصنيف له رقم ثابت، والعمليات والمحلات والمستفيدون والقواعد والحدود والأغراض مربوطة بالرقم مو بالاسم؛ فتغيير الاسم أو الإيموجي أو اللون ما يغيّر أي رقم. التكرار والضرورة والالتزام وفرص التوفير: العملية ← المحل أو المستفيد ← الفرعي ← الرئيسي («يتبع الرئيسي» في الفرعي = يأخذ قيمة الرئيسي). <b>(1.7.0)</b> التصنيف الجديد (واللي نزلت مع التطبيق وما غيّرتها) تبدأ «غير محدد». «التزام دائم» يدخل «الالتزامات الدائمة» بدون شرط التكرار. الحذف ما يحذف أي عملية: تنتقل لتصنيف تختاره، أو تبقى بدون تصنيف (وفي الفرعي تبقى تحت الرئيسي)، والتجار والمستفيدون والقواعد المرتبطة تتبع نفس الاختيار؛ القاعدة اللي ما يبقى لها عمل تتوقف. حد الصرف على تصنيف رئيسي محذوف ينتقل مع العمليات، إلا إذا التصنيف الجديد عليه حد من قبل أو اخترت «بدون تصنيف» فينحذف. «تبرعات» و«سحب نقدي» ما تنحذف لأن الحساب يستخدمها (و«رسوم» صار ينحذف من 1.7.0). <b>الاختيار (1.6.0)</b>: التصنيف الرئيسي يفتح دايمًا حتى لو ما له فرعي: تختار فرعي، أو تضيف فرعي، أو «اختره بدون فرعي». تنقل فرعي لرئيسي ثاني من تعديل التصنيف («المكان»)، وعملياته وأغراضه تنتقل معه.</p>
  <h3>القواعد</h3><p>الأولوية: تعديلك لعملية وحدة ← القاعدة ← التاجر أو المستفيد ← التصنيف الفرعي ← الرئيسي. القاعدة تحتاج شرط حقيقي واحد على الأقل (نص، تاجر، مستفيد، حساب، أو مبلغ). إذا انطبقت أكثر من قاعدة، الأعلى في القائمة تكسب. تنطبق على العمليات الجديدة من الكشوف والرسائل، وعلى السابقة فقط إذا اخترت «طبّقها على السابق».</p>
  <h3>حدود الصرف</h3><p>على الدورة الحالية. الحد الكلي = الإنفاق الحقيقي كله. حد التصنيف نوعين: <b>حسب الفواتير</b> (الافتراضي، على التصنيف الرئيسي) = نفس رقمه في «صرفياتك» (1.7.0: العملية مع رسومها)؛ و<b>حسب المنتجات</b> (رئيسي أو فرعي) = الأغراض المصنفة فيه + «غير مفصّل» من فواتيره، نفس رقم تحليل المنتجات. حدود تصنيفات المنتجات القديمة صارت «حسب المنتجات» على الفرعي الجديد. حذف تصنيف عليه حد «حسب المنتجات»: ينتقل الحد مع الأغراض، وإذا الهدف عليه حد يبقى حده وينحذف الثاني (ما يصير حدين). النسبة = المصروف ÷ الحد. تنبيه عند نسبة الإعداد (80% افتراضيًا) وعند 100%.</p>
  <h3>أسماء المحلات (1.6.0)</h3><p>تسمي المحل مرة، وتطلع كل عملياته (السابقة والجاية) باسمك؛ ما سميته = اسم الفاتورة. اسم الفاتورة الأصلي يبقى بخط صغير تحت الاسم. تعديل اسم محل مسمّى: <b>هذه المرة فقط</b> (العملية وحدها لمحل ثاني، والفاتورة تبقى لمحلها)، <b>لكل العمليات</b>، أو <b>اسم آخر لهذه الفاتورة</b>: نفس اسم الفاتورة يصير لأكثر من محل، والعملية تروح للاسم الجديد، والقديمة تبقى على الأول. بعدها كل عملية رسالة جديدة بهذا الاسم تسألك أي محل، والتصنيف يمشي على المحل اللي تختاره (لكل محل تصنيفه)، إلا اللي صنفتها يدويًا للعملية. اللي ما تختار لها تاخذ المحل الافتراضي (تحدده وقت تسجيل الاسم الثاني، وتغيّره من صفحة المحل)، وتطلع في «المراجعة» تحت «فاتورة تحتمل أكثر من محل»، ونفس الشي لعمليات الكشف.</p>
  <p><b>المطابقة</b>: اسمين «مطابقين» إذا تساووا بعد تجاهل المسافات والتشكيل وأ/ا/إ/آ وة/ه وى/ي والحروف الكبيرة والصغيرة. الاسم المطابق لمحل ثاني ممنوع بدون دمج: تدمجهم أو تغيّر الاسم. «مشابه» = واحد داخل الثاني (حرفين أو أكثر): يقترح الدمج وتقدر تخليهم منفصلين. وأنت تكتب: الأسماء المسجلة المشابهة + اقتراحات من جهازك (المتجر المعروف للفاتورة، واسم الفاتورة منظف، وأسماء متاجر معروفة) بدون إنترنت. <b>الدمج</b>: عمليات المحلين (والمحذوفة والمعلّقة في المراجعة) وأسماء فواتيرهم وقواعدهم ومتكررهم واستثناءاتهم تصير لمحل واحد، يطلع مرة وحدة بتصنيف واحد ومجموع واحد في كل مكان. إذا تصنيفهم مختلف يسألك أي تصنيف يبقى، وينطبق على عملياته ما عدا اللي صنفتها يدويًا لعملية أو بقاعدة.</p>
  <h3>العمليات الجديدة من الرسائل (1.6.0)</h3><p>وأنت فاتح التطبيق يدوّر على رسائل جديدة كل 30 ثانية (إذا الجلب التلقائي مفعّل). عمليات الرسائل الجديدة (من الصندوق أو اللصق) تطلع قدامك كاملة، وحدة ورا الثانية من الأقدم، تكمل فيها التصنيف والأغراض والمدينة والمجموعة. «تم» = راجعتها. «مراجعة لاحقًا» لهذي، «مراجعة الكل لاحقًا» للكل، و✕ يسألك: هذه لاحقًا، الكل لاحقًا، أو تراجع. إذا كنت في نص شي يطلع شريط صغير «وصلت عملية جديدة» تضغطه، وإذا ما ضغطته تنتظرك. المؤجلة تطلع في «المراجعة» تحت «عمليات ما راجعتها» وفي الرئيسية «عندك N عمليات ما راجعتها». رسالة اندمجت مع عملية موجودة ما تنعد جديدة، ولا الرسائل القديمة اللي تنعاد معالجتها (مثل فصل دمج غلط). المراجعة ما تغيّر أي رقم.</p>
  <h3>كلمات قراءة الرسائل (1.6.1)</h3><p><b>(1.7.1)</b> الكلمات صارت للاقتراح: يعبّي منها التطبيق نوع العملية والاسم والرصيد لما تعرّف صيغة جديدة، ولوسيلة الدفع (Apple Pay وأونلاين) في الرسائل اللي صيغتها ما حددت وسيلة الدفع. الرسالة نفسها ما تنقرأ إلا بصيغة معتمدة. في «المزيد». ثلاث أنواع مجموعات: <b>نوع العملية</b> (الترتيب مهم: أول مجموعة من فوق تنطبق على الرسالة تكسب، و«ما عدا» تمنع المجموعة، مثل «credit card» ما تنقرأ إيداع)، <b>وسيلة الدفع</b> (Apple Pay ثم أونلاين، وإذا ما انطبق شي: نقاط بيع)، و<b>الكلمات قبل الأسماء والرصيد</b> (قبل اسم المحل، المستفيد، المرسل، الرصيد). المطابقة: الحروف الكبيرة والصغيرة سوا، أ/ا/إ/آ سوا، ة/ه سوا، ى/ي في آخر الكلمة سوا، والمسافات مرنة. الكلمة تنطبق حتى لو جزء من كلمة («حوالة محلي» تنطبق على «حوالة محلية»)، إلا: الكلمة اللي آخرها «ى» لازم تكون نهاية كلمة («مدى» ما تنطبق على «مدين»)، والكلمة الإنجليزية لازم تكون بداية كلمة («POS» ما تنطبق داخل «deposited»). الكلمة حرفين أو أكثر، والمكرر ينشال، والأرقام الطويلة (مثل رقم بطاقة أو حساب) ما تنحفظ. كلمات رسائل الرمز والدخول مقفلة وما تنعدل. «رجّع الافتراضي» لمجموعة، و«رجّع الكل للافتراضي» للكل (وتحتاج «احفظ…» عشان تنطبق).</p>
  <p><b>النسخ حسب التاريخ</b>: كل حفظ له «من تاريخ». الرسالة تنقرأ بآخر نسخة تاريخها قبل أو يساوي تاريخ العملية المكتوب في الرسالة، وإذا ما فيها تاريخ فتاريخ وصولها؛ فرسالة قديمة توصل متأخر تنقرأ بنسختها. قبل أول نسخة: الكلمات الافتراضية، وتنعرض «طريقة قراءة الرسائل قبل (التاريخ)». الحفظ بنفس تاريخ نسخة موجودة يستبدلها، ولو فيه نسخة أحدث تبقى هي، فالكلمات الجديدة تنطبق لين قبل تاريخها (المعاينة تنبهك). حذف نسخة يرجّع رسائل فترتها للنسخة اللي قبلها، والعمليات المحفوظة ما تتغير.</p>
  <p><b>المعاينة قبل الحفظ</b> (للرسائل من التاريخ وبعده، وما تغيّر شي): عمليات محفوظة بتتغير قراءتها، قبل ← بعد (1.7.1: الرسالة اللي ما لها صيغة تتعرّف من «المراجعة»، مو بالكلمات). «قبل» = اللي انقرأ من الرسالة فعلًا لما انحفظت عمليتها (أو آخر تصحيح لها). تختار الكل أو بعضها أو «احفظ للرسائل الجاية بس»، واللي ما صححته يطلع لك مرة ثانية في التعديل الجاي. <b>التصحيح</b> يمس اللي انقرأ من الرسالة بس: النوع، المبلغ والرسوم، الاسم، وسيلة الدفع، الرصيد، المرجع. ويبقى: النوع اللي غيّرته بيدك وتوابعه (البطاقة المسددة، المستفيد)، التصنيف اليدوي أو بقاعدة، المحل اللي اخترته أو ثبّته، الأغراض، المدينة، المجموعات، الملاحظة. العملية المدموجة مع كشف: قيم الكشف تبقى، ويتصحح وسيلة الدفع (والاسم إذا ناقص) بس. المعاينة تعرض بس اللي بيتغير فعلًا في العملية. إذا التصحيح كمّل اسم محل ناقص، تنقفل مراجعة «ناقصة الحقول». عملية ما تنقرأ بالكلمات الجديدة (مثلًا حذفت كلمة مهمة) ما تتغير وتطلع تنبيه. الحفظ خطوة وحدة في سجل التعديلات وتقدر تتراجع عنها.</p>
  <h3>المدينة والمجموعة على العملية (1.7.0)</h3><p>تحت اسم العملية، قبل أي شارة: «🏷️ المجموعة» لكل مجموعة، و«📍 المدينة» للمدينة المعتمدة (بيدك أو من الموقع أو من «الفترات»)، و«📍 المدينة؟» بلون تنبيه لاقتراح موقع ما اعتمدته (بدل «بدون مدينة»، وفلتر «بدون مدينة» يشملها). «بدون مدينة» = ما لها مدينة ولا اقتراح. الموقع اللي تجاهلته ما يطلع له شي. في كل القوائم.</p>
  <h3>علامة «بدون مدينة» (1.6.0)</h3><p>العلامة على المشتريات والسحب والمصروف النقدي اللي ما لها مدينة معتمدة (ما لها مدينة، أو اقتراح موقع ما اعتمدته)، إلا اللي اخترت لها «تجاهل الموقع لهذه العملية» أو اللي ما تنحسب في الصرف. تحويلات الأشخاص والرسوم بدون علامة.</p>
  <h3>الفترات (1.7.0، كانت «فترات التجاهل»)</h3><p>في «المزيد». من تاريخ لتاريخ (بتاريخ العملية)، وفيها أي مجموعة من:</p><ul>
  <li><b>مدينة</b>: للمشتريات والسحب والمصروف النقدي بس (مو الأونلاين ولا التحويلات لأشخاص ولا الرسوم). عند الحفظ تختار: «اللي بدون مدينة بس»، أو «كل العمليات» (حتى اللي حطيت مدينتها بيدك، وترجع قيمتها القديمة لو حذفت الفترة). العملية اللي سجّل الجوال (الموقع) لها مدينة ثانية ما تتغير أبدًا: تطلع «N عمليات موقعها مختلف» في الصفحة والتنبيهات، وتختار «طبّق مدينة الفترة عليها كلها» أو تراجعها وحدة وحدة. وإذا وصل الموقع بعدين بمدينة ثانية لعملية أخذت مدينة الفترة، الموقع يغلب وترجع لقيمتها.</li>
  <li><b>مجموعة</b>: كل الصرف داخل الفترة (مشتريات، سحب، نقدي، تحويلات لأشخاص، ورسومها)، مو الدخل ولا الاسترداد (يتبع شراءه). <b>(1.7.1)</b> التحويل بين حساباتك وسداد البطاقة ما يدخلون المجموعة أبدًا، ولا رسومهم (واللي كان داخل منهم طلع مع التحديث، واللي يتغير نوعه بعدين إلى «بين حساباتي» أو سداد بطاقة يطلع وقتها؛ تقدر تضيف العملية للمجموعة بيدك). العملية اللي تشيل منها المجموعة بيدك ما ترجع لها، ولو رجعتها بيدك ترجع عادي.</li>
  <li><b>تجاهل</b> علامة «بدون مدينة» و/أو علامات التصنيف («بدون تصنيف» و«نوعها غير معروف» و«تحويلات لأشخاص ما صنفتها»): تختفي وما تنعد في «يحتاج منك» و«بيانات تحتاج قرارك». الأرقام ما تتغير، والفلتر يعرضها ومعها «متجاهلة».</li>
  <li>العمليات اللي توصل بعدين داخل الفترة (رسائل أو كشف أو إدخال يدوي) تاخذ المدينة («بدون مدينة» بس) والمجموعة تلقائيًا. حذف الفترة أو تعديلها يرجّع اللي جا منها بس، وتعديلاتك اليدوية تبقى.</li></ul>
  <h3>البحث (1.6.0)</h3><p>يبحث في كل شي: اسم المحل واسم الفاتورة، المستفيد، البنك، الحساب، البطاقة، التصنيف، الملاحظة، المرجع، أسماء الأغراض وملاحظاتها وتصنيفاتها، أجزاء السحب، المدينة (المعتمدة والمقترحة)، المجموعات، والمبالغ (18 = 18.00 = ١٨: الإجمالي والأصل والرسوم وأسعار الأغراض ومجاميعها). يتجاهل الهمزات والتاء المربوطة والمسافات. تحت كل نتيجة سبب ظهورها، مثل «فيها: طماطم ×2».</p>
  <h3>التراجع وسجل التعديلات</h3><p>كل حفظ خطوة وحدة (بما فيها الاستيراد وجلب الرسائل). التراجع والإعادة لآخر 30 خطوة في الجلسة. <b>(1.7.0)</b> فوق زر «تراجع» (كلمة)، وبعد ما تتراجع يطلع جنبه «إعادة»؛ وكل تراجع أو إعادة (من فوق أو من الرسالة تحت أو من «سجل التعديلات») يسألك «تتراجع عن: …؟» قبل. «إعادة» تختفي لما ما يبقى شي تعيده أو لما تسوي تعديل جديد. سجل التعديلات يبقى (آخر 2000) ويدخل النسخة الاحتياطية. المفتاح السري لصندوق الرسائل ما يدخل النسخة الاحتياطية أبدًا.</p>
  <h3>صفحة العمليات (1.7.0)</h3><ul>
  <li><b>صف النوع</b>: «الكل | إنفاق | دخل | تحويلات | سلف». «إنفاق» = كل اللي ينحسب صرف. «تحويلات» = التحويل بين حساباتك وسداد البطاقات والإيداع النقدي. «سلف» = السلفة اللي عطيتها وسدادها لك (ما تنحسب صرف ولا دخل).</li>
  <li><b>يحتاج منك</b>: يظهر بس إذا فيه شي، بعدد العمليات. تحته (لما تضغطه) الأنواع اللي فيها عدد بس: بدون تصنيف، بدون مدينة، تحويلات لأشخاص ما صنفتها، نوعها غير معروف، ما راجعتها، أي محل؟، مالك البطاقة غير محدد، سداد بطاقة غير مطابق. الأعداد حسب الفترة والفلاتر المعروضة، والمتجاهل بفترة ما ينعد.</li>
  <li><b>الفلاتر</b> (أيقونة القمع): نوع العملية (أكثر من نوع)، التصنيف (رئيسي أو فرعي) «حسب الفواتير» = نفس رقم «صرفياتك»، أو «حسب المنتجات» = كل فاتورة فيها أغراض من التصنيف (والغير مفصّل) وجنبها مبلغ الأغراض بس، نفس رقم «المنتجات». والمدينة والمجموعة والحساب والبطاقة وطريقة الدفع والمصدر. كل فلتر شغال فقاعة عليها × تشيله لحاله.</li>
  <li><b>الجزء من العملية</b>: لما الفلتر يخص جزء منها (مثل جزء سحب نقدي أو أغراض)، المبلغ يطلع «200 من 500»، ومجموع القائمة = رقم التصنيف.</li>
  <li><b>التحديد</b>: ضغطة مطوّلة على عملية، أو «تحديد» في سطر العدد.</li>
  <li><b>التنقل</b>: في نافذة العملية تسحب يمين أو يسار للعملية اللي بعدها أو قبلها بنفس ترتيب القائمة اللي فتحتها منها (من اليسار لليمين = اللي تحتها). في «عملية جديدة» التنقل ما يعلّمها «راجعتها». لو فيها أغراض ما انحفظت يسألك قبل. سحب النافذة لتحت من فوقها يسكّرها (نفس ✕). في «صرفياتك» تسحب بين الأيام (وبين الأشهر في «سنوي») وتعبر للأسبوع أو الدورة أو السنة المجاورة؛ بدون يوم مختار تتنقل الفترة كلها. ما يروح لأيام جاية.</li></ul>
  <h3>التاريخ في المستقبل (1.7.0)</h3><p>الإدخال اليدوي ما يقبل تاريخ بعد اليوم («التاريخ في المستقبل»). في استيراد الكشف، السطر اللي تاريخه بعد اليوم يطلع «تاريخ في المستقبل» في مراجعة الاستيراد وما ينحفظ إلا إذا اخترت «التاريخ صحيح، احفظها».</p>
  ${methods150()}
  <h3>الخصوصية</h3><p>قبل الحفظ تنخفي: الآيبان، رقم الهوية، أرقام الحسابات (متصلة أو مفصولة بمسافات أو شرطات، مثل 1234 567890 1234)، رقم الجوال إذا ظهر كرقم فاتورة، أرقام عقود التمويل. البصمة تنحسب قبل الإخفاء، ويبقى آخر 4 أرقام. التواريخ والأوقات والمبالغ ما تنخفي، والرقم اللي قبله «مرجع» أو «رقم العملية» يبقى. المستفيد يُعرف ببصمة SHA-256 لآيبانه (تقليل تعرض، مو تشفير سري). المراجع البنكية تبقى للمطابقة.</p></div>`;
}

/* ---------- النوافذ ---------- */
function openSheet(html) { S.sheetKind = null; S.sheetTxId = null; $('sheet').innerHTML = `<div class="sheet-bg" data-action="sheetBg"><div class="sheet" role="dialog">${html}</div></div>`; }
function closeSheet(val) {
  const wasFlowCard = S.sheetKind === 'tx' && S.flow && S.sheetTxId === S.flow.ids[S.flow.i];
  $('sheet').innerHTML = '';
  if (S.sheetResolve) { const r = S.sheetResolve; S.sheetResolve = null; r(val); return; }
  // 1.6.0: نافذة جانبية (المحل، الأداة، المستفيد…) انفتحت من العملية الجديدة وتسكّرت: ترجع العملية الجديدة
  if (S.flow && !wasFlowCard) setTimeout(() => { if (S.flow && !$('sheet').innerHTML && store().get('transactions', S.flow.ids[S.flow.i])) sheetTx(S.flow.ids[S.flow.i]); }, 0);
}
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
  // 1.7.0: عملية رسومها بس (مثل رسوم تحويل) تقبل تصنيف، لأن رسومها تنحسب على تصنيفها
  const canCat = (['Payment', 'CashExpense', 'PersonTransfer', 'Refund', 'Unknown', 'CashWithdrawal'].includes(t.transactionType) && t.transferSubtype !== 'round_up') || (E.feeOf(t) > 0 && E.spendEffect(t) === 0);
  const types = ['Payment', 'Income', 'InternalTransfer', 'CreditCardPayment', 'PersonTransfer', 'Refund', 'CashWithdrawal', 'Unknown'];
  const recDef = E.effective(st, Object.assign({}, t, { recurrenceType: null }), 'rec'), necDef = E.effective(st, Object.assign({}, t, { necessityType: null }), 'nec');
  const recL = { recurring: 'متكرر', variable: 'متغير' }, necL = { essential: 'ضروري', discretionary: 'كمالي' };
  const u = txUi(t);
  const src0 = (t.sourceLinks || [])[0];
  const F = S.flow && S.flow.ids[S.flow.i] === t.id ? S.flow : null;
  let h = F ? `<h3><button class="close" data-action="flowX" aria-label="إغلاق">×</button><span class="sp" style="text-align:center;color:var(--ink-3);font-weight:600" id="flowpg">${flowPgText()}</span><span style="width:34px"></span></h3>`
    : `<h3><button class="close" data-action="txClose" aria-label="إغلاق">×</button><span class="sp txpos">${txNavText(t.id)}</span>${S.newList ? `<button class="btn" data-action="newBack">العمليات الجديدة ${ico('chevL')}</button>` : '<span style="width:34px"></span>'}</h3>`;
  if (F) h += flowCardsHtml(t);
  h += `
    <div class="txh">
      ${canCat ? `<button class="catbtn" data-action="txCat" data-id="${t.id}" style="border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${glyph(u)}</span><span>${esc(catLabel(t))}</span></button>`
        : `<div class="catbtn" style="cursor:default;border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${glyph(u)}</span><span>${TYPE_L[t.transactionType]}</span></div>`}
      <div class="nm">${m ? `<span class="ic s" style="background:var(--pri-soft);color:var(--pri)">${ico('store')}</span>` : b ? `<span class="ic s" style="background:var(--pri-soft);color:var(--pri)">${ico('person')}</span>` : ''}<span>${esc(txTitle(t))}</span>${m ? `<a data-action="merchantDrill" data-id="${m.id}" aria-label="كل عمليات المحل" style="display:flex">${ico('chevL')}</a>` : ''}</div>
      ${m ? `<div class="inv">${m.userName && t.merchantRaw ? `<span dir="auto">${esc(t.merchantRaw)}</span> · ` : ''}<a data-action="shopName" data-id="${t.id}">${m.userName ? 'غيّر الاسم' : 'سمّ المحل'}</a></div>` : ''}
      <div class="amt">${money(t.grossAmount)}${dirBadge(t)}</div>
      <div class="badges" style="justify-content:center">${badges(t).replace(/^<div class="badges">|<\/div>$/g, '')}</div>
    </div>
    ${!F && t.needsReview ? `<div class="banner i" style="margin-top:10px"><div>عملية جديدة ما راجعتها. «حفظ» يعتبرها مراجعة.</div></div>` : ''}
    ${shopChoiceHtml(t)}
    ${txBlocks(t)}
    <input type="hidden" id="s_cat" value="${esc(t.categoryId || '')}"><input type="hidden" id="s_sub" value="${esc(t.subcategoryId || '')}">
    <div class="drow">${ico('note')}<div class="m"><input type="text" id="s_note" placeholder="إضافة ملاحظة" value="${esc(S.txDraft && S.txDraft.id === t.id ? S.txDraft.note : (t.note || ''))}"></div></div>
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
  if (canCat) h += `<div class="grid2"><div><label class="f">التكرار</label><select id="s_rec"><option value="">افتراضي (${recL[recDef] || 'غير محدد'})</option><option value="recurring" ${t.recurrenceType === 'recurring' ? 'selected' : ''}>متكرر</option><option value="variable" ${t.recurrenceType === 'variable' ? 'selected' : ''}>متغير</option></select></div>
      <div><label class="f">الضرورة</label><select id="s_nec"><option value="">افتراضي (${necL[necDef] || 'غير محدد'})</option><option value="essential" ${t.necessityType === 'essential' ? 'selected' : ''}>ضروري</option><option value="discretionary" ${t.necessityType === 'discretionary' ? 'selected' : ''}>كمالي</option></select></div></div>${txChainFields(t)}`;
  h += `<dl class="kv" style="margin-top:14px">
    <dt>تاريخ العملية</dt><dd>${fdate(t.transactionDate, true)}</dd>${t.postingDate && t.postingDate !== t.transactionDate ? `<dt>تاريخ القيد</dt><dd>${fdate(t.postingDate, true)}</dd>` : ''}
    <dt>الأداة</dt><dd>${ins ? esc(ins.label) + ` (المالك: ${OWNER_L[ins.instrumentOwner]}) <a data-action="editInstrument" data-id="${ins.id}">تعديل</a>` : 'أداة دفع غير محددة'}</dd>
    ${m ? `<dt>المحل</dt><dd>${esc(E.merchantName(m))}${m.userName && t.merchantRaw ? ` <span class="small muted">(الفاتورة: ${esc(t.merchantRaw)})</span>` : ''} <a data-action="editMerchant" data-id="${m.id}">تعديل المحل</a></dd>` : ''}
    ${b ? `<dt>المستفيد</dt><dd>${esc(b.name)} · ${esc(b.bank || '')} …${esc(b.accountLast4 || '')} <a data-action="editBeneficiary" data-id="${b.id}">تعديل</a></dd>` : ''}
    <dt>الإجمالي</dt><dd>${num(t.grossAmount)}</dd>${(t.feeAmount || t.vatAmount) ? `<dt>الأصل</dt><dd>${num(t.principalAmount)}</dd><dt>الرسوم</dt><dd>${num(t.feeAmount)}${t.feeTaxBreakdownKnown === false ? ' (الضريبة داخلها؛ التقسيم غير معروف)' : ''}</dd>${t.feeTaxBreakdownKnown !== false ? `<dt>ضريبة الرسوم</dt><dd>${num(t.vatAmount)}</dd>` : ''}` : ''}
    ${t.foreignAmount ? `<dt>المبلغ الأصلي</dt><dd><span class="num">${fmt(t.foreignAmount)} ${esc(t.foreignCurrency || '')}</span></dd>` : ''}
    ${t.reference ? `<dt>المرجع</dt><dd class="small"><span class="num">${esc(t.reference)}</span></dd>` : ''}${t.balanceAfter != null ? `<dt>الرصيد بعد العملية</dt><dd>${num(t.balanceAfter)}</dd>` : ''}
    ${(t.linkedTransactionIds || []).length ? `<dt>مرتبطة بـ</dt><dd>${t.linkedTransactionIds.map(x => { const o = st.get('transactions', x); return o ? `<a data-action="openTx" data-id="${o.id}">${esc(txTitle(o))} ${fmt(o.grossAmount)}</a>` : ''; }).join('<br>')}</dd>` : ''}</dl>
    <div class="btns" style="margin-top:12px"><button class="btn" data-action="ruleFromTx" data-id="${t.id}">قاعدة من هذي العملية</button></div>
    <h3 style="margin-top:14px;font-size:15px">المصادر (${(t.sourceLinks || []).length})</h3>${(t.sourceLinks || []).map(sl => { const imp = sl.importId ? st.get('imports', sl.importId) : null; return `<div class="small muted" style="margin-top:6px">${SRC_L[sl.sourceType] || sl.sourceType}${imp ? ' · ' + esc(imp.filename) : ''}</div><div class="raw">${rawHtml(sl.rawDescription || '')}</div>`; }).join('')}
    </details>
    ${F ? `<div class="btns" style="margin-top:14px">${txExcludeBtn(t)}<button class="btn r" data-action="deleteTx" data-id="${t.id}" aria-label="حذف">${ico('trash')} حذف</button></div>
      <div class="flowbtns"><button class="btn p" style="flex:1 1 100%" data-action="flowNext" data-id="${t.id}">${F.i + 1 < F.ids.length ? 'تم، التالية' : 'تم'}</button><button class="btn" style="flex:1" data-action="flowLater" data-id="${t.id}">مراجعة لاحقًا</button><button class="btn" style="flex:1" data-action="flowAllLater">مراجعة الكل لاحقًا</button></div>`
    : `<div class="btns" style="margin-top:14px"><button class="btn p" style="flex:1" data-action="saveTx" data-id="${t.id}">حفظ</button>${txExcludeBtn(t)}<button class="btn r" data-action="deleteTx" data-id="${t.id}" aria-label="حذف">${ico('trash')} حذف</button></div>`}`;
  if (F) h = h.replace('<span class="b">ما راجعتها</span>', '');
  openSheet(h); S.sheetKind = 'tx'; S.sheetTxId = t.id; S.txDraft = null;
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
  // 1.7.0: عملية رسومها بس أو اسمها «رسوم»: اقتراح بس، ما تتصنف إلا إذا وافقت
  const fs = E.feeSuggestion(st, t);
  if (fs) h += `<div class="txblock sug"><div class="small">مقترح: <b>${esc(E.catName(st, fs))}</b>${E.feeOf(t) > 0 && E.spendEffect(t) === 0 ? ' (العملية رسوم بس)' : ''}. ما تتصنف إلا إذا وافقت.</div><div class="btns" style="margin-top:6px"><button class="btn" data-action="feeAccept" data-id="${t.id}">صنّفها «${esc(E.catName(st, fs))}»</button></div></div>`;
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
function afterTx(id) { if (store().get('transactions', id)) sheetTx(id); else if (S.flow) flowAdvance(); else if (S.newList) renderNewList(); else closeSheet(); }

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
    S.pick = { cat: cur.cat || null, sub: cur.sub || null, stage: 'grid', allowNone: opts.allowNone !== false, follow: opts.follow || null };
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
    // 1.7.0: الغرض: «مثل الفاتورة» يرجّعه يتبع تصنيف فاتورته
    if (P.follow) h += `<div style="text-align:center;margin-top:16px"><button class="btn ${P.follow.on ? 'p' : ''}" data-action="pickFollow">مثل الفاتورة${P.follow.label ? ` (${esc(P.follow.label)})` : ''}</button></div>`;
    else if (P.allowNone) h += `<div style="text-align:center;margin-top:16px"><button class="btn" data-action="pickNone">بدون تصنيف</button></div>`;
  } else if (P.stage === 'new') {
    h += `<div class="catform">${catFormHtml(null, P.newParent || null, false)}<div class="btns" style="margin-top:12px"><button class="btn p" data-action="catSave" data-pick="1">إضافة واختيار</button><button class="btn" data-action="pickBack">رجوع</button></div></div>`;
  } else {
    const c = st.get('categories', P.cat), u = catUi(c.id);
    const subs = st.all('categories').filter(x => x.parentId === c.id && x.active !== false).sort(byOrder);
    h += `<div class="subpick"><div class="sel"><span class="catbtn" style="border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${glyph(u)}</span><span>${esc(c.name)}</span></span><button class="close" data-action="pickBack" aria-label="رجوع للتصنيفات">×</button></div>
      <div class="chips2"><button data-action="pickSub" data-id="" class="${!P.sub ? 'on' : ''}">اختره بدون فرعي</button>${subs.map(x => `<button data-action="pickSub" data-id="${x.id}" class="${P.sub === x.id ? 'on' : ''}">${x.emoji || SUB_ICON[x.id] ? `<span style="color:${u.color};display:flex">${glyph(catUi(x.id), SUB_ICON[x.id])}</span>` : ''}${esc(x.name)}</button>`).join('')}<button data-action="pickNewSub" data-parent="${c.id}" class="addsub">+ فرعي</button></div></div>`;
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
// 1.7.0: شاشة الفلاتر بأقسام: نوع العملية (أكثر من نوع)، التصنيف (رئيسي أو فرعي، حسب الفواتير أو المنتجات)، المدينة، المجموعة، الحساب والبطاقة، طريقة الدفع، المصدر
function sheetFilters() {
  const st = store(), f = S.fDraft || (S.fDraft = JSON.parse(JSON.stringify(S.filters)));
  const sel = (id, opts, cur, allL) => `<select id="${id}"><option value="">${allL || 'الكل'}</option>${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const types = f.types || [], cat = f.categoryId || null;
  const catTxt = !cat ? 'كل التصنيفات' : cat === '__none' ? 'بدون تصنيف' : String(cat).startsWith('__') ? bucketName(cat) : pcName(cat), cu = catUi(cat || '__none');
  const used = cityUsage(), cities = st.all('cities').filter(c => c.active !== false && used.has(c.id)).sort((a, b) => (used.get(b.id) || 0) - (used.get(a.id) || 0));
  const cityCur = f.noCity ? '__none' : (f.cityId || '');
  if (f.cityId && !cities.some(c => c.id === f.cityId)) cities.unshift({ id: f.cityId, name: f.cityId === '__unknown' ? 'غير معروفة' : cityName(f.cityId) }); // فلتر مدينة من صفحة المدن يبقى
  const groups = st.all('groups').filter(g => g.active !== false).map(g => [g.id, ((g.emoji || '') + ' ' + g.name).trim()]);
  openSheet(`<h3>الفلاتر<span class="sp"></span><button class="close" data-action="fxClose" aria-label="إغلاق">×</button></h3>
    <div class="fxsec"><div class="fxh">نوع العملية <span class="muted small">(تقدر تختار أكثر من نوع)</span></div><div class="chipw">${FX_TYPES.map(([k, l]) => `<button type="button" class="chip ${types.includes(k) ? 'on' : ''}" data-action="fxType" data-k="${k}">${l}</button>`).join('')}</div></div>
    <div class="fxsec"><div class="fxh">التصنيف</div><div class="btns"><button type="button" class="btn" data-action="fxCat"><span style="color:${cu.color};display:flex">${glyph(cu)}</span>${esc(catTxt)}</button>${cat ? `<button type="button" class="btn" data-action="fxCatClear" aria-label="شيل التصنيف">×</button>` : `<button type="button" class="chip" data-action="fxCatNone">بدون تصنيف</button>`}</div>
      ${cat && cat !== '__none' && !String(cat).startsWith('__') ? `<div class="seg" style="margin-top:8px"><button type="button" class="${f.catBasis !== 'products' ? 'on' : ''}" data-action="fxBasis" data-v="invoices">حسب الفواتير</button><button type="button" class="${f.catBasis === 'products' ? 'on' : ''}" data-action="fxBasis" data-v="products">حسب المنتجات</button></div>
      <p class="small muted" style="margin:6px 0 0">${f.catBasis === 'products' ? 'كل فاتورة فيها أغراض من هذا التصنيف (حتى لو الفاتورة نفسها تصنيف ثاني)، وجنبها مبلغ الأغراض بس.' : 'الفواتير المصنفة فيه، بنفس رقم «صرفياتك».'}</p>` : ''}</div>
    <div class="fxsec"><div class="grid2"><div><label class="f">المدينة</label><select id="f_city"><option value="">الكل</option><option value="__none" ${cityCur === '__none' ? 'selected' : ''}>بدون مدينة</option>${cities.map(c => `<option value="${c.id}" ${cityCur === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div><label class="f">المجموعة</label>${sel('f_grp', groups, f.groupId)}</div></div></div>
    <div class="fxsec"><div class="grid2"><div><label class="f">الحساب</label>${sel('f_acc', st.all('accounts').map(a => [a.id, a.name]), f.accountId)}</div>
      <div><label class="f">البطاقة أو الأداة</label>${sel('f_ins', st.all('instruments').map(i => [i.id, i.label]), f.instrumentId)}</div></div>
      <div class="grid2"><div><label class="f">طريقة الدفع</label>${sel('f_method', Object.entries(METHOD_L), f.method)}</div>
      <div><label class="f">المصدر</label>${sel('f_src', Object.entries(SRC_L), f.source)}</div></div></div>
    <div class="btns" style="margin-top:14px"><button class="btn p" data-action="applyFilters">تطبيق</button><button class="btn" data-action="clearFilters">مسح الكل</button></div>`);
}
// يقرأ القوائم في المسودة قبل ما تنعاد رسم الشاشة
function fxSync() {
  const f = S.fDraft; if (!f || !$('f_acc')) return f;
  const v = (id) => ($(id) && $(id).value) || null;
  const city = v('f_city');
  Object.assign(f, { accountId: v('f_acc'), instrumentId: v('f_ins'), method: v('f_method'), source: v('f_src'), groupId: v('f_grp') });
  if (city === '__none') { f.noCity = true; delete f.cityId; delete f.cityMode; }
  else if (city) { f.cityId = city; if (f.cityMode !== 'withGps') delete f.cityMode; delete f.noCity; }
  else { delete f.noCity; delete f.cityId; delete f.cityMode; }
  return f;
}
function sheetManual(kind, pre) {
  pre = pre || {};
  const st = store(), { ins: cashIns } = E.ensureCashAccount(st); persist();
  const insList = st.all('instruments').filter(i => i.active !== false);
  const title = { expense: 'مصروف', income: 'دخل', withdrawal: 'سحب نقدي', deposit: 'إيداع نقدي' }[kind];
  let h = `<h3>${title}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">المبلغ</label><input type="text" inputmode="decimal" id="m_amt" value="${pre.amount || ''}" placeholder="0.00">
    <label class="f">التاريخ</label><input type="date" id="m_date" value="${E.todayISO()}" max="${E.todayISO()}">`;
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
  const st = store(), m = st.get('merchants', id); if (!m) return;
  const cat = m.categoryId || m.suggestedCategoryId, sub = m.categoryId ? m.subcategoryId : m.suggestedSubcategoryId;
  const others = st.all('merchants').filter(x => x.id !== m.id && st.all('transactions').some(t => t.merchantId === x.id)).sort((a, b) => E.merchantName(a).localeCompare(E.merchantName(b), 'ar'));
  const multi = (m.aliases || []).filter(a => E.shopsForAlias(st, a).length > 1);
  openSheet(`<h3>${esc(E.merchantName(m))}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <div class="small muted">${m.userName ? `اسم الفاتورة: ${esc(m.name)} · ` : ''}<a data-action="shopNameM" data-id="${m.id}">${m.userName ? 'غيّر الاسم' : 'سمّ المحل'}</a></div>
    <div class="small muted" style="margin-top:4px">أسماء الفواتير اللي توصل له: ${esc((m.aliases || []).join('، ') || '—')}</div>
    ${multi.length ? `<div class="banner i" style="margin-top:8px;display:block"><div>${multi.map(a => { const sh = E.shopsForAlias(st, a), d = E.defaultShopFor(st, a); return `فاتورة «${esc(a)}» لـ ${sh.length} محلات: ${sh.map(x => esc(E.merchantName(x)) + (x === d ? ' (الافتراضي)' : '')).join('، ')}. ${d && d.id !== m.id ? `<a data-action="shopDefault" data-a="${esc(a)}" data-id="${m.id}">خله الافتراضي</a>` : ''}`; }).join('<br>')}</div></div>` : ''}
    <label class="f">التصنيف</label>${catField(cat, sub)}
    <div class="grid2"><div><label class="f">التكرار (للمحل)</label><select id="mm_rec"><option value="">من التصنيف</option><option value="recurring" ${m.defaultRecurrenceType === 'recurring' ? 'selected' : ''}>متكرر</option><option value="variable" ${m.defaultRecurrenceType === 'variable' ? 'selected' : ''}>متغير</option></select></div>
    <div><label class="f">الضرورة (للمحل)</label><select id="mm_nec"><option value="">من التصنيف</option><option value="essential" ${m.defaultNecessityType === 'essential' ? 'selected' : ''}>ضروري</option><option value="discretionary" ${m.defaultNecessityType === 'discretionary' ? 'selected' : ''}>اختياري</option></select></div></div>
    ${subjectChainFields(m, 'merchant')}
    <p class="small muted">يتطبق على كل عمليات المحل السابقة والقادمة، ما عدا اللي صنفتها يدويًا لعملية وحدة.</p>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveMerchant" data-id="${m.id}">حفظ</button><button class="btn" data-action="merchantDrill" data-id="${m.id}">عملياته</button></div>
    ${others.length ? `<details class="more" style="margin-top:14px"><summary>دمجه مع محل ثاني</summary><p class="small muted">نفس المحل مسجل باسمين؟ ادمجهم: يطلع مرة وحدة بتصنيف واحد ومجموع واحد في كل مكان، وأسماء فواتيره كلها توصل له.</p>
      <select id="mm_merge">${others.map(x => `<option value="${x.id}">${esc(E.merchantName(x))}</option>`).join('')}</select><div class="btns" style="margin-top:8px"><button class="btn" data-action="merchantMerge" data-id="${m.id}">ادمج المختار في «${esc(E.merchantName(m))}»</button></div></details>` : ''}`);
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
const REVIEW_L = { sms_deleted_again: 'عملية حذفتها قبل', sms_duplicate: 'تكرار محتمل مع عملية موجودة', sms_no_account: 'الحساب غير معروف', sms_unparsed: 'ما قدرت أقرأ الرسالة', sms_unknown: 'رسالة غير معروفة النوع', sms_same_content: 'نفس نص رسالة سابقة', sms_partial: 'عملية ناقصة الحقول', sms_no_date: 'رسالة بدون تاريخ', sms_date_shape: 'ترتيب التاريخ', sms_new_bank: 'بنك جديد: تأكد من القراءة', sms_new_bank_info: 'بنك جديد: رسالة فيها مبلغ', sms_new_shape: 'شكل رسالة جديد' };
const SHAPE_TITLE = { old: 'تاريخ أقدم من وصول الرسالة', new: 'شكل تاريخ جديد', legacy: 'تاريخ رسائل سابقة', future: 'تاريخ في المستقبل', order_invalid: 'التاريخ ما ينطبق على الترتيب المحفوظ' };
const MSG_STATUS_L = { sender_ignored: 'من مرسل متجاهل', tx: 'عملية', merged: 'اندمجت', duplicate: 'مكررة', review: 'مراجعة', informational: 'معلومات', discarded: 'رمز تحقق', ignored: 'متجاهلة', manual: 'أدخلت يدويًا', deleted: 'محذوفة' };
const CLS_L = { financial: 'مالية', otp: 'رمز تحقق', informational: 'معلومات', unknown: 'غير معروفة' };
const FIELD_L = { amount: 'المبلغ', merchant: 'المحل', beneficiary: 'المستفيد', counterparty: 'المرسل', cardLast4: 'آخر 4 للبطاقة', accountLast4: 'آخر 4 للحساب', balance: 'الرصيد', fee: 'الرسوم', direction: 'الاتجاه', date: 'التاريخ', time: 'الوقت', method: 'وسيلة الدفع' };
const FAMILY_DIR = { sms_purchase: 'out', sms_refund: 'in', sms_transfer_out: 'out', sms_transfer_in: 'in', salary: 'in', sms_cash_withdrawal: 'out', sms_cash_deposit: 'in', bill_payment: 'out', card_payment: 'out', sms_debit: 'out', sms_credit: 'in' };
W.msg = ['رسالة واحدة', 'رسالتان', 'رسائل', 'رسالة'];

/* ---------- معالجة الرسائل ---------- */
// الحفظ في IndexedDB يصير داخل persist؛ إذا فشل يرمي خطأ وما يوصل للـ ack
async function processSms(msgs, label, source) {
  const plan = await E.prepareSms(store(), msgs);
  E.commitSms(store(), plan, { markNew: true }); E.detectRecurring(store());
  // الجلب من الصندوق ينسجل في سجل التعديلات بس ما يتراجع عنه (الرسائل انحذفت من الصندوق بعد تأكيدها)
  await persist(label, { source: source || 'user' });
  return plan;
}
function smsSummaryText(s) {
  const p = [];
  if (s.tx) p.push(`${s.tx === 1 ? 'عملية جديدة' : s.tx + ' عمليات جديدة'}`);
  if (s.merged) p.push(`${s.merged} اندمجت مع الموجود`);
  if (s.review) p.push(`${s.review} للمراجعة`);
  if (s.informational) p.push(`${s.informational} معلومات`);
  if (s.discarded) p.push(`${s.discarded} رمز تحقق ما انحفظ`);
  if (s.duplicate) p.push(`${s.duplicate} مكررة (انحسبت مرة وحدة)`);
  if (s.already) p.push(`${s.already} سبق استلامها`);
  return p.join('، ') || 'ما فيه جديد';
}
// جلب الصندوق: pull ← معالجة وحفظ محلي ← ack (بعد نجاح الحفظ فقط). المحفوظ سابقًا: ack فقط
async function fetchInbox(manual) {
  const cfg = settings().inbox || {};
  if (!cfg.url || !cfg.token) { if (manual) toast('حط رابط الصندوق والمفتاح في الإعدادات'); return; }
  if (S.inboxBusy) { if (manual) toast('الجلب شغال، انتظر شوي'); return; }
  if (!navigator.onLine) { if (manual) toast('الجهاز غير متصل بالإنترنت'); return; }
  S.inboxBusy = true; if (manual) toast('جاري جلب الرسائل…', 65000);
  try {
    const r = await Inbox.pull(cfg);
    if (!r || !r.ok) throw new Error(Inbox.statusText(r && r.status) || 'تعذر السحب');
    const msgs = (r.messages || []).map(m => ({ id: m.id, text: m.text, sender: m.sender, receivedAt: m.receivedAt, source: 'inbox', ids: m.ids || [], suggestedCity: m.suggestedCity || null, citySource: m.citySource || null, cityCapturedAt: m.cityCapturedAt || null }));
    const s = settings(); s.inbox.lastFetchAt = new Date().toISOString(); store().put('settings', s);
    // رسائل انحفظت قبل وما وصلنا تأكيد حذفها من الصندوق (مثلًا انقفل التطبيق لحظة التأكيد): نعيد التأكيد
    const pulled = new Set(msgs.map(m => m.id));
    const unconfirmed = store().all('messages').filter(m => m.source === 'inbox' && !m.ackedAt && !pulled.has(m.id)).map(m => m.id).slice(0, 150);
    let plan = null;
    if (msgs.length) plan = await processSms(msgs, 'جلب ' + cnt(msgs.length, 'msg'), 'inbox');
    else await persist(null, { noStep: true });
    { const w = E.waitingForFormats(store()); if (w.length) { const p2 = await E.reprocessMessages(store(), w, {}); if (p2) { E.commitSms(store(), p2, { markReview: true }); await persist(null, { noStep: true }); } } }
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
    // الجلب التلقائي (كل 30 ثانية) ما يعيد رسم الصفحة وأنت تكتب فيها
    const ae = document.activeElement, typing = !manual && ae && $('main').contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
    if (!plan) { if (manual) { $('toast').classList.add('hide'); toast(cityDone ? (cityDone === 1 ? 'وصلت مدينة لعملية سابقة' : `وصلت مدن لـ ${cityDone} عمليات سابقة`) : 'ما فيه رسائل جديدة'); } if (!typing && ((manual && ['settings', 'messages'].includes(S.view)) || (cityDone && S.view !== 'add'))) render(); return; }
    if (!typing) render();
    if (!onNewSms(plan, manual) && (manual || plan.smsSummary.review || plan.smsSummary.merged || plan.smsSummary.duplicate)) toast('الرسائل: ' + smsSummaryText(plan.smsSummary), 6000);
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
function autoFetch(minGap) {
  const cfg = settings().inbox || {};
  if (!cfg.autoFetch || !cfg.url || !cfg.token) return;
  const last = cfg.lastFetchAt ? Date.parse(cfg.lastFetchAt) : 0;
  if (Date.now() - last < (typeof minGap === 'number' ? minGap : 60000)) return;
  fetchInbox(false);
}

function inboxCard() {
  const c = settings().inbox || {};
  return `<div class="card" id="inboxCard"><h2>صندوق الرسائل (استقبال تلقائي)</h2>
    <p class="small muted">رابط نشر Google Apps Script والمفتاح السري. المفتاح ينحفظ على هذا الجهاز فقط وما يدخل النسخة الاحتياطية.</p>
    <label class="f">رابط /exec</label><input type="text" id="ib_url" dir="ltr" inputmode="url" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url || '')}">
    <label class="f">المفتاح السري</label><input type="text" id="ib_token" dir="ltr" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(c.token || '')}">
    <label class="f"><input type="checkbox" id="ib_auto" ${c.autoFetch !== false ? 'checked' : ''}> اجلب الرسائل تلقائيًا (لما أفتح التطبيق، وكل 30 ثانية وهو مفتوح)</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveInbox">حفظ</button><button class="btn" data-action="fetchInbox">جلب الآن</button><button class="btn" data-action="inboxTest">اختبار الاتصال</button></div>
    <p class="small muted" style="margin-top:8px">${c.lastFetchAt ? 'آخر جلب: ' + fdt(c.lastFetchAt, true) : 'ما صار جلب للحين'}${S.inboxError ? ` · <span class="neg">${esc(S.inboxError)}</span>` : ''}</p>
    <div class="ibres" id="ib_res"></div></div>`;
}
/* ---------- مركز المراجعة ---------- */
const openReviews = () => store().all('reviews').filter(r => r.status === 'open').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
function dataIssues() {
  const st = store(), items = [];
  const igC = (t) => E.isIgnored(st, t, 'category');
  const unk = st.all('transactions').filter(t => t.transactionType === 'Unknown' && !igC(t));
  if (unk.length) items.push({ t: `${cnt(unk.length, 'op')} نوعها غير معروف${unk.some(t => t.direction === 'out') ? ' (الخارجة منها داخلة في صرفك)' : ''}`, a: `<a data-action="issueTxs" data-kind="unclassified_all">صنّفها</a>` });
  const tmp = st.all('transactions').filter(t => t.classificationStatus === 'temporary' && !igC(t));
  if (tmp.length) items.push({ t: `${cnt(tmp.length, 'tr')} لأشخاص ما صنفتها`, a: `<a data-action="issueTxs" data-kind="temporary">حدد تصنيفها</a>` });
  const unc = st.all('transactions').filter(t => !igC(t) && t.transactionType !== 'Refund' && E.spendParts(st, t).some(p => p.cat === '__none'));
  if (unc.length) items.push({ t: `${cnt(unc.length, 'op')} صرف بدون تصنيف`, a: `<a data-action="needGo" data-k="uncategorized">صنّفها</a>` }); // 1.7.0: نفس «يحتاج منك ← بدون تصنيف»
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
function reviewBadge() { const n = reviewCount(); return n ? `<span class="cnt">${n}</span>` : ''; }
// نص الرسالة: التاريخ المفصول بشرطات بعد كلمة عربية يقلبه اتجاه الكتابة (26-09-28 يظهر 28-09-26)،
// فنعزله باتجاه يسار-يمين عشان يظهر بترتيبه الحقيقي
function rawHtml(text) { return esc(text || '').replace(/\d{1,4}(?:[-.]\d{1,4}){2}/g, x => `<bdi dir="ltr">${x}</bdi>`); }
function shapeSampleHtml(sample, token) {
  sample = String(sample || ''); const i = token ? sample.indexOf(token) : -1;
  return i < 0 ? rawHtml(sample) : `${rawHtml(sample.slice(0, i))}<bdi dir="ltr" class="num">${esc(token)}</bdi>${rawHtml(sample.slice(i + token.length))}`;
}
function msgBox(m) {
  if (!m) return '';
  const who = m.sender ? (E.bankLabel(store(), m.sender) || m.sender) + (m.source === 'paste' ? ' · لصق' : '') : (m.source === 'paste' ? 'لصق' : 'صندوق'); // 1.6.2: اسم البنك اللي سميته
  return `<div class="small muted" style="margin:6px 0 4px">${esc(who)} · ${m.receivedAt ? fdt(m.receivedAt, true) : ''}</div><div class="raw">${rawHtml(m.text || '')}</div>`;
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
    case 'sms_new_shape': {
      // 1.7.1: رسالة ما لها صيغة معتمدة. الاقتراح = تخمين، تصححه وتعتمده
      const g = r.suggest, grp = (r._group || []).length, pend = r.pendingId && st.get('templates', r.pendingId), ids = [r.id].concat(r._group || []).join(',');
      body = `<div class="small">${g ? `اقتراحي لقراءتها: <b>${esc(FAM_L()[g.family] || g.family || '')}</b>${g.amount != null ? ` · <span class="num">${fmt(g.amount)}</span>` : ''}${g.name ? ` · <bdi>${esc(g.name)}</bdi>` : ''}. إذا هي عملية، عرّف صيغتها (تصحّح الاقتراح وتعتمده) والرسائل الجاية بنفس الشكل تمشي لحالها.` : r.hasAmount ? 'فيها مبلغ بس ما قدرت أقترح لها قراءة. إذا هي عملية عرّف صيغتها، وإلا خلها معلومات.' : 'ما فيها مبلغ. إذا مو مهمة خلها معلومات.'}${grp ? ` <b>ومعها ${cnt(grp, 'msg')} بنفس الشكل</b> تنتظر نفس القرار.` : ''}${pend ? ' شكلها موجود في «الصيغ» ينتظر اعتمادك.' : ''}</div>`;
      btns = `${pend ? `<button class="btn p" data-action="fmtPendGo" data-id="${pend.id}">افتح الشكل واعتمده</button>` : ''}<button class="btn ${pend ? '' : 'p'}" data-action="teachSms" data-id="${r.id}">عملية: عرّف الصيغة</button>${r.weakOtp ? '' : `<button class="btn" data-action="rvInfoFmt" data-id="${r.id}">معلومات ولا تسألني عن هالشكل</button>`}<button class="btn" data-action="rvInfoOnce" data-ids="${ids}">معلومات هالمرة بس</button>${r.weakOtp ? `<button class="btn r" data-action="rvMsg" data-ids="${ids}" data-v="otp">رسالة رمز (احذف نصها)</button>` : ''}`;
      break;
    }
    case 'sms_unparsed': { const f = r.templateId && st.get('templates', r.templateId);
      body = `<div class="small">${f ? `طابقت صيغة «${esc(f.name || '')}» بس ما قدرت أقرأ: <b>${(r.missing || []).map(k => FIELD_L[k] || k).join('، ') || '—'}</b>. عدّل الصيغة، أو أدخلها يدويًا.` : `ناقص: ${(r.missing || []).map(k => FIELD_L[k] || k).join('، ') || '—'}.`}</div>`;
      btns = `<button class="btn p" data-action="teachSms" data-id="${r.id}">${f ? 'عدّل الصيغة' : 'عرّف الصيغة'}</button><button class="btn" data-action="rvManual" data-id="${r.id}">أدخلها يدويًا</button><button class="btn" data-action="rvInfoOnce" data-ids="${r.id}">معلومات هالمرة بس</button>`; break; }
    case 'sms_same_content': { const o = st.get('messages', r.otherMessageId); body = `<div class="small">نفس نص رسالة سابقة${o && o.receivedAt ? ` (${fdate(ldate(o.receivedAt), true)})` : ''}. ممكن تكون نفس الرسالة وصلت مرتين، أو عمليتين متطابقتين.</div>`;
      btns = `<button class="btn p" data-action="rvSame" data-id="${r.id}">عمليتان مختلفتان: عالجها</button><button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">مكررة: تجاهلها</button>`; break; }
    case 'sms_no_date': body = `<div class="small">${(store().get('messages', r.messageId) || {}).source === 'paste' ? 'الرسالة ما فيها تاريخ واضح، وما أعتمد وقت اللصق لأنها ممكن تكون رسالة قديمة.' : 'ما قدرت أعتمد تاريخ هالرسالة (التاريخ اللي قريته بعد وقت وصولها، أو ما فيها تاريخ واضح).'} المبلغ ${num(r.info ? r.info.grossAmount : 0)}.</div>
        <label class="f">تاريخ العملية</label><input type="date" id="rvdate_${r.id}" max="${E.todayISO()}">`;
      btns = `<button class="btn p" data-action="rvDate" data-id="${r.id}">احفظها بهذا التاريخ</button><button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">تجاهل</button>`; break;
    case 'sms_date_shape': {
      const OL = SR().ORDER_L, n = st.all('messages').filter(m => m.dateShape === r.sig && !m.userDate && m.txId).length;
      const bk = String(r.sig || '').includes('§') ? E.bankLabel(st, String(r.sig).split('§')[0]) : null; // 1.6.2: الشكل لبنك محدد
      const why = r.reason === 'new' ? `أول مرة يجي هذا الشكل من التاريخ${bk ? ` من <b>${esc(bk)}</b>` : ''}: <b>${shapeSampleHtml(r.sample, r.token)}</b>. اختر التاريخ الصحيح لهذي الرسالة، والتطبيق يعتمد ترتيبه لكل رسالة بنفس الشكل${bk ? ' من نفس البنك' : ''}.`
        : r.reason === 'old' ? `التاريخ اللي طلع من هذي الرسالة أقدم من وقت وصولها بأكثر من يومين، وغالبًا القراءة غلط. اختر التاريخ الصحيح لها هي بس، والترتيب المحفوظ ما يتغير.`
        : r.reason === 'legacy' ? `رسائل انحفظت قبل هذا التحديث بهذا الشكل من التاريخ: <b>${shapeSampleHtml(r.sample, r.token)}</b>${n ? ` (${cnt(n, 'msg')})` : ''}. اختر التاريخ الصحيح لهذي الرسالة، والتطبيق يصحح تاريخ عملياتها بنفس الترتيب (ما عدا اللي حددت تاريخها بنفسك).`
        : r.reason === 'future' ? `التاريخ اللي طلع من هذي الرسالة بعد وقت وصولها. اختر التاريخ الصحيح لها هي بس، والترتيب المحفوظ ما يتغير.`
        : `الترتيب المحفوظ لهذا الشكل ما يعطي تاريخ صحيح لهذي الرسالة. اختر تاريخها هي بس، والترتيب المحفوظ ما يتغير.`;
      body = `<div class="small">${why}${r.info && r.info.grossAmount ? ` المبلغ ${num(r.info.grossAmount)}.` : ''}</div>
        <div class="kvbox" style="margin-top:8px">${(r.candidates || []).map((c, i) => `<label class="f" style="margin:6px 0"><input type="radio" name="shp_${r.id}" value="${c.order}" ${i === 0 && (r.candidates || []).length === 1 ? 'checked' : ''}> <b>${fdate(c.date, true)}</b> <span class="small muted">· ${OL[c.order]}</span></label>`).join('')}</div>
        ${r.reason === 'future' || r.reason === 'order_invalid' || r.reason === 'old' ? `<label class="f">أو حدد التاريخ بنفسك</label><input type="date" id="rvdate_${r.id}" max="${E.todayISO()}">` : ''}`;
      btns = `<button class="btn p" data-action="rvShape" data-id="${r.id}">اعتمد</button>${r.reason !== 'legacy' ? `<button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">تجاهل</button>` : ''}`;
      break;
    }
    case 'sms_deleted_again': { const d = st.get('deletedTxs', r.deletedId); body = `<div class="small">هذي الرسالة لعملية حذفتها قبل${d ? `: <b>${esc(txTitle(d))}</b> ${fmt(d.grossAmount)} · ${fdate(d.transactionDate, true)}` : ''}. ترجعها؟</div>`;
      btns = `<button class="btn p" data-action="rvDel" data-id="${r.id}" data-v="restore">رجّعها</button><button class="btn" data-action="rvDel" data-id="${r.id}" data-v="keep">خلها محذوفة</button>`; break; }
    case 'sms_partial': { const t = st.get('transactions', r.txId); body = `<div class="small">انحفظت العملية، لكن ناقص: ${(r.missing || []).map(k => FIELD_L[k] || k).join('، ')}.</div><div class="kvbox" style="margin-top:6px;font-size:12.5px">${txMini(t)}</div>`;
      btns = `<button class="btn p" data-action="teachSms" data-id="${r.id}">عرّف الصيغة وأكملها</button>${t ? `<button class="btn" data-action="openTx" data-id="${t.id}">افتح العملية</button>` : ''}<button class="btn" data-action="rvMsg" data-id="${r.id}" data-v="ignore">تم</button>`; break; }
  }
  if (m && m.sender && IGN_SENDER_KINDS.has(r.kind)) btns += `<button class="btn" data-action="rvIgnoreSender" data-id="${r.id}">مو بنك: تجاهل رسائل ${esc(E.bankLabel(st, m.sender))}</button>`;
  const title = r.kind === 'sms_date_shape' ? (SHAPE_TITLE[r.reason] || REVIEW_L[r.kind]) : r.kind === 'sms_new_shape' && r.pendingId && st.get('templates', r.pendingId) ? 'رسالة شكلها ينتظر اعتمادك' : (REVIEW_L[r.kind] || r.kind);
  return `<div class="rv"><div class="rvh"><b>${title}</b><span class="sp"></span><span class="small muted">${fdate(ldate(r.createdAt))}</span></div>${msgBox(m)}${body}<div class="btns" style="margin-top:10px">${btns}</div></div>`;
}
// 1.5.2: رسائل بنفس النص بالضبط (حتى الوقت) انحسبت مرة وحدة تلقائيًا
function autoDupCard(r) {
  const st = store(), m = st.get('messages', r.messageId), o = st.get('messages', r.otherMessageId);
  return `<div class="rv"><div class="rvh"><b>مكررة تلقائيًا</b><span class="sp"></span><span class="small muted">${fdate(ldate(r.createdAt))}</span></div>${msgBox(m)}
    <div class="small">نفس نص رسالة وصلت قبل${o && o.receivedAt ? ` (${fdt(o.receivedAt, true)})` : ''} بالضبط حتى الوقت، فانحسبت مرة وحدة.</div>
    <div class="btns" style="margin-top:10px"><button class="btn" data-action="rvNotDup" data-id="${r.id}">مو مكررة: احسبها عملية</button><button class="btn" data-action="rvDupHide" data-id="${r.id}">تمام، إخفاء</button></div></div>`;
}
// 1.7.1: الرسائل المنتظرة اللي بنفس الشكل (ونفس البنك) بطاقة وحدة: قرار واحد يمشي عليها كلها
function groupedReviews() {
  const out = [], seen = new Map();
  openReviews().forEach(r => {
    if (r.kind !== 'sms_new_shape' || !r.sig) { out.push(r); return; }
    const k = (r.bank || '') + '|' + r.sig, head = seen.get(k);
    if (head) head._group.push(r.id); else { const c = Object.assign({}, r, { _group: [] }); seen.set(k, c); out.push(c); }
  });
  return out;
}
const pendingFormats = () => E.smsFormats(store(), 'pending');
function vReviewCenter() {
  const rs = groupedReviews(), issues = dataIssues(), pf = pendingFormats();
  const dups = store().all('reviews').filter(r => r.resolution === 'auto_duplicate' && !r.hidden).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const un = E.unreviewedTxs(store()).sort(txOrder), sc = E.shopChoiceTxs(store()).sort(sortTx);
  let h = '';
  if (un.length) h += `<div class="card"><h2>عمليات ما راجعتها <span class="sp"></span><button class="btn p" data-action="flowResume">كمّل المراجعة</button></h2><p class="small muted">عمليات جديدة من الرسائل أجلت مراجعتها أو وصلت وأنت مشغول. تطلع لك وحدة ورا الثانية تكمل تصنيفها وأغراضها ومدينتها.</p>${un.slice(0, 30).map(t => txRow(t, true)).join('')}${un.length > 30 ? `<div class="small muted" style="margin-top:6px">و${un.length - 30} غيرها</div>` : ''}</div>`;
  if (sc.length) h += `<div class="card"><h2>فاتورة تحتمل أكثر من محل <span class="sp"></span><span class="muted">${sc.length}</span></h2><p class="small muted">أخذت المحل الافتراضي لين تختار. التصنيف يمشي على المحل اللي تختاره.</p>${sc.slice(0, 40).map(shopChoiceCard).join('')}</div>`;
  if (pf.length) h += `<div class="card"><h2>أشكال رسائل تنتظر اعتمادك <span class="sp"></span><button class="btn p" data-action="go" data-view="formats">افتحها (${pf.length})</button></h2><p class="small muted">أشكال رسائلك السابقة: اعتمد كل شكل أو عدّله. لين تعتمد الشكل، رسائله الجديدة تنتظر هنا.</p></div>`;
  h += `<div class="card"><h2>رسائل تحتاج قرارك <span class="sp"></span><span class="muted">${rs.length}</span></h2>${rs.length ? rs.map(reviewCard).join('') : '<div class="muted">ما فيه رسائل معلّقة.</div>'}</div>`;
  if (dups.length) h += `<div class="card"><h2>مكررة تلقائيًا <span class="sp"></span><span class="muted">${dups.length}</span></h2><p class="small muted">نفس الرسالة وصلت أكثر من مرة، فانحسبت مرة وحدة. لو كانت عمليتين فعلًا اضغط «مو مكررة».</p>${dups.map(autoDupCard).join('')}</div>`;
  h += `<div class="card"><h2>بيانات تحتاج قرارك <span class="sp"></span><span class="muted">${issues.length}</span></h2>${issues.length ? `<div class="list">${issues.map(i => `<div class="it" style="cursor:default"><div class="m"><div class="t" style="font-weight:600">${i.t}</div></div><div class="small">${i.a}</div></div>`).join('')}</div>` : '<div class="muted">كل شي واضح.</div>'}</div>`;
  return h;
}

/* ---------- تعريف صيغة رسالة (1.7.1: الصيغ الثابتة) ----------
   S.teachSms = {mode: review|pending|edit, back, reviewId, messageId, formatId, text, tokens, ranges: {المتغير: [من كلمة، إلى كلمة]}, skips: Set(كلمات تتغير)، active, family, sender, feeMode, dateOrder, name}.
   التعبئة المبدئية اقتراح من القارئ العام: المستخدم يصحح ويعتمد. الكلام اللي ما يتحدد = نص ثابت لازم يتطابق بالضبط. */
function tokenize(text) { const out = []; const re = /[^\s]+/g; let m; while ((m = re.exec(text))) { let s = m.index, e = s + m[0].length; while (e > s && /[،,.:;؛)\]]/.test(text[e - 1]) && e - s > 1) e--; while (s < e && /[(\[:]/.test(text[s]) && e - s > 1) s++; out.push({ s, e, line: text.slice(0, m.index).split('\n').length - 1 }); } return out; }
const teachFieldsFor = (family) => E.formatFieldsFor(family);
const FIELD_COLOR = { amount: PAL.green, merchant: PAL.blue, beneficiary: PAL.blue, counterparty: PAL.blue, cardLast4: PAL.violet, accountLast4: PAL.orange, balance: PAL.aqua, fee: PAL.red, date: PAL.yellow, time: PAL.magenta, method: PAL.gray, skip: '#8A90A0' };
// src: {mode, back, text, sender, receivedAt, source, reviewId, messageId, formatId, fmt}
function teachStart(src) {
  const st = store(), R = SR(); let text = R.norm(src.text || ''); if (!text) return toast('نص الرسالة غير متاح');
  // تعديل صيغة محفوظة: نفس تحديدك السابق. على مثالها نفسه، أو على رسالة ثانية تطابقها (مثل رسالة ما انقرأ واحد من متغيراتها)
  let f = src.fmt && src.fmt.role === 'tx' ? src.fmt : null, fsp = null;
  if (f) {
    if (R.norm(f.sample || '') === text) fsp = { spans: f.spans || {}, skips: f.skips || [] };
    else { fsp = R.formatSpansIn(f, text); if (!fsp && src.mode === 'edit' && f.sample) { text = R.norm(f.sample); fsp = { spans: f.spans || {}, skips: f.skips || [] }; } }
    if (!fsp) f = null;
  }
  const T = { mode: src.mode, back: src.back || 'reviewc', reviewId: src.reviewId || null, messageId: src.messageId || null, formatId: src.formatId || null, text, tokens: tokenize(text), ranges: {}, skips: new Set(), active: 'amount',
    family: 'sms_purchase', sender: src.sender || null, receivedAt: src.receivedAt || null, source: src.source || 'paste', feeMode: null, feeTop: false, dateOrder: null, name: '' };
  const toRange = (a, b) => { const s = T.tokens.findIndex(tk => tk.e > a), e = T.tokens.map(tk => tk.s < b).lastIndexOf(true); return s >= 0 && e >= s ? [s, e] : null; };
  if (f) {
    Object.entries(fsp.spans).forEach(([k, r]) => { const x = toRange(r[0], r[1]); if (x) T.ranges[k] = x; });
    fsp.skips.forEach(r => { const x = toRange(r[0], r[1]); if (x) for (let i = x[0]; i <= x[1]; i++) T.skips.add(i); });
    Object.assign(T, { family: f.family, feeMode: f.feeMode || null, dateOrder: f.dateOrder || null, name: f.status === 'approved' && f.name !== E.formatName(st, f) ? (f.name || '') : '' });
  } else {
    const p = E.proposeFormat(st, { text, sender: T.sender, receivedAt: T.receivedAt, source: T.source }, 'tx', { smartFee: true });
    if (p.fields) Object.entries(p.fields).forEach(([k, r]) => { const x = toRange(r.start, r.end); if (x) T.ranges[k] = x; });
    if (p.meta) { (p.meta.skips || []).forEach(r => { const x = toRange(r.start, r.end); if (x) for (let i = x[0]; i <= x[1]; i++) T.skips.add(i); }); T.dateOrder = p.meta.dateOrder || null; if (p.meta.family) T.family = p.meta.family; }
    else if (src.fmt && src.fmt.family) T.family = src.fmt.family;
    // تاريخ ترتيبه ملتبس وما نعرفه لهالبنك: نحدده لك وتختار أنت التاريخ الصحيح (والاقتراح = اللي يطابق يوم وصول الرسالة)
    if (p.dateHint && !T.ranges.date && E.formatFieldsFor(T.family).includes('date')) { const x = toRange(p.dateHint.start, p.dateHint.end); if (x) { T.ranges.date = x; T.dateOrder = p.dateGuess || null; } }
    T.feeTop = !!p.feeTop; T.feeMode = T.ranges.fee && p.feeTop ? 'top' : null; // الرسوم: تختار أنت. الاقتراح «فوق المبلغ» بس لو المبلغ + الرسوم = رقم ثالث في الرسالة
  }
  S.teachSms = T; go('teachsms');
}
function teachBuild(T) {
  const spec = {}; Object.entries(T.ranges).forEach(([k, r]) => { if (r) spec[k] = { start: T.tokens[r[0]].s, end: T.tokens[r[1]].e }; });
  const idx = Array.from(T.skips).sort((a, b) => a - b), skips = [];
  idx.forEach(i => { const tk = T.tokens[i], last = skips[skips.length - 1]; if (last && last.to === i - 1 && T.tokens[i - 1].line === tk.line) { last.end = tk.e; last.to = i; } else skips.push({ start: tk.s, end: tk.e, to: i }); });
  return SR().learnFormat(T.text, spec, { role: 'tx', family: T.family, direction: E.FAMILY_DIR[T.family], bank: E.bankLabel(store(), T.sender) || null, sender: T.sender, skips, dateOrder: T.dateOrder || null, feeMode: T.feeMode });
}
function teachPreviewHtml(T) {
  const L = teachBuild(T);
  if (L.error) return `<div class="banner w" style="margin-top:12px"><div>${esc(TEACH_ERR[L.error] || L.error)}</div></div>`;
  const i = L.preview, row = (l, v) => `<div style="display:flex;gap:8px;margin:3px 0"><span class="muted" style="min-width:104px">${l}</span><b style="flex:1;min-width:0;overflow-wrap:anywhere"><bdi>${v}</bdi></b></div>`;
  const name = i.merchantRaw || i.beneficiaryRaw || i.counterpartyName || null;
  const amt = i.feeOnTop ? `${esc(fmt(i.grossAmount))} <span class="small muted">= ${esc(fmt(i.amountRead))} + رسوم ${esc(fmt(i.feeAmount))}</span>` : esc(fmt(i.grossAmount)) + (i.feeAmount ? ` <span class="small muted">(منها رسوم ${esc(fmt(i.feeAmount))})</span>` : '');
  return `<div class="kvbox small" style="margin-top:12px"><b>كذا بتنقرأ الرسائل اللي بهالشكل:</b>${row('النوع', esc(E.SMS_FAMILY_L[T.family] || ''))}${row('المبلغ المحسوب', amt)}${name ? row('الاسم', esc(name)) : ''}${i.instrumentLast4 ? row('البطاقة', '…' + esc(i.instrumentLast4)) : ''}${i.accountLast4 ? row('الحساب', '…' + esc(i.accountLast4)) : ''}${i.balanceAfter != null ? row('الرصيد', esc(fmt(i.balanceAfter))) : ''}${i.transactionDate ? row('التاريخ', esc(fdate(i.transactionDate, true)) + (i.time ? ' ' + esc(ftime(i.time)) : '')) : row('التاريخ', '<span class="muted">ما حددته: من أول تاريخ في الرسالة (وإلا يوم وصولها)</span>')}</div>`;
}
function vTeachSms() {
  const T = S.teachSms; if (!T) return `<div class="card empty">لا يوجد.</div>`;
  const fields = teachFieldsFor(T.family);
  const val = (k) => T.ranges[k] ? T.text.slice(T.tokens[T.ranges[k][0]].s, T.tokens[T.ranges[k][1]].e) : '';
  const owner = (i) => T.skips.has(i) ? 'skip' : Object.keys(T.ranges).find(k => T.ranges[k] && i >= T.ranges[k][0] && i <= T.ranges[k][1]);
  let lines = [], cur = -1;
  T.tokens.forEach((tk, i) => { if (tk.line !== cur) { lines.push([]); cur = tk.line; } const o = owner(i); lines[lines.length - 1].push(`<button class="tok ${o ? 'on' : ''}" data-action="tokTap" data-i="${i}" style="${o ? `background:${tint(FIELD_COLOR[o], '2E')};border-color:${FIELD_COLOR[o]}${o === 'skip' ? ';border-style:dashed' : ''}` : ''}">${esc(T.text.slice(tk.s, tk.e))}</button>`); });
  const title = T.mode === 'edit' ? 'تعديل الصيغة' : T.mode === 'pending' ? 'عدّل الشكل واعتمده' : 'عرّف صيغة هذي الرسالة';
  return `<div class="card"><h2>${title}</h2>
    <p class="small muted">١) اختر نوع العملية. ٢) اختر المتغير تحت، ثم اضغط في الرسالة على الكلمة أو الكلمات اللي تمثله. المبلغ مطلوب، والباقي اختياري. اللي معبّى الحين اقتراح: صحّحه. الكلام اللي ما تحدده «نص ثابت»: الرسائل الجاية لازم يكون فيها نفسه بالضبط، وأي سطر أو كلمة ثابتة جديدة تعتبر شكل جديد ويسألك عنه.</p>
    <label class="f">نوع العملية</label><select id="ts_family" data-change="teachFamily">${Object.entries(E.SMS_FAMILY_L).map(([k, v]) => `<option value="${k}" ${k === T.family ? 'selected' : ''}>${v}</option>`).join('')}</select>
    ${T.sender ? `<div class="small muted" style="margin-top:6px">البنك: <b>${esc(E.bankLabel(store(), T.sender) || T.sender)}</b></div>` : '<div class="small muted" style="margin-top:6px">رسالة ملصوقة بدون بنك: الصيغة تمشي على رسائل أي بنك بنفس الشكل.</div>'}
    <div class="fchips">${fields.map(k => `<button class="fchip ${T.active === k ? 'on' : ''}" data-action="teachField" data-k="${k}" style="--c:${FIELD_COLOR[k]}"><span class="dot"></span>${FIELD_L[k]}${k === 'amount' ? ' *' : ''}<span class="v">${esc(val(k))}</span></button>`).join('')}<button class="fchip ${T.active === 'skip' ? 'on' : ''}" data-action="teachField" data-k="skip" style="--c:${FIELD_COLOR.skip}"><span class="dot"></span>نص يتغير (تجاهله)<span class="v">${T.skips.size ? T.skips.size : ''}</span></button></div>
    <div class="toks">${lines.map(l => `<div class="tline">${l.join('')}</div>`).join('')}</div>
    <p class="small muted" style="margin-top:6px">«نص يتغير»: كلمات تتغير من رسالة لرسالة وما تهمك (مثل رقم مرجع). الأرقام اللي ما حددتها تعتبر متغيرة من نفسها.</p>
    ${T.ranges.fee ? `<div class="kvbox" style="margin-top:10px"><b class="small">الرسوم (${esc(val('fee'))}):</b>
      <label class="f" style="margin:6px 0 0"><input type="radio" name="ts_fee" value="in" data-change="teachFee" ${T.feeMode === 'in' ? 'checked' : ''}> داخل المبلغ (المبلغ اللي حددته شاملها)</label>
      <label class="f" style="margin:6px 0 0"><input type="radio" name="ts_fee" value="top" data-change="teachFee" ${T.feeMode === 'top' ? 'checked' : ''}> فوق المبلغ (تنضاف له، والعملية تنحسب بالمجموع)</label>
      ${T.feeTop ? '<div class="small muted" style="margin-top:6px">المبلغ + الرسوم يساوي رقم ثالث مكتوب في الرسالة، فالأقرب إنها «فوق المبلغ».</div>' : ''}</div>` : ''}
    ${teachDateBox(T, val('date'))}
    ${teachPreviewHtml(T)}
    <label class="f">اسم الصيغة (اختياري)</label><input type="text" id="ts_name" data-change="teachName" maxlength="60" value="${esc(T.name || '')}" placeholder="${esc(E.SMS_FAMILY_L[T.family] || '')}${T.sender ? ' — ' + esc(E.bankLabel(store(), T.sender) || T.sender) : ''}">
    <div class="btns" style="margin-top:14px"><button class="btn g" data-action="teachSmsSave">${T.mode === 'edit' ? 'حفظ التعديل' : 'اعتمد الصيغة'}</button><button class="btn" data-action="teachSmsCancel">إلغاء</button></div></div>`;
}

// التاريخ الملتبس (مثل 05/09/26): المستخدم يختار الصحيح مرة وحدة، وينحفظ ترتيبه مع الصيغة
function teachDateBox(T, v) {
  if (!T.ranges.date) return '';
  const ch = SR().dateChoices(v);
  if (!ch.length) return `<div class="banner w" style="margin-top:10px">ما قدرت أقرأ تاريخ من الجزء المحدد.</div>`;
  if (ch.length === 1) { T.dateOrder = ch[0].o; return ''; }
  if (T.dateOrder && !ch.some(c => c.o === T.dateOrder)) T.dateOrder = null;
  return `<div class="kvbox" style="margin-top:10px"><b class="small">وش التاريخ الصحيح لهذي الرسالة؟</b>${ch.map(c => `<label class="f" style="margin:6px 0 0"><input type="radio" name="ts_dord" value="${c.o}" data-change="teachDateOrder" ${T.dateOrder === c.o ? 'checked' : ''}> ${fdate(c.date, true)}</label>`).join('')}</div>`;
}

/* ---------- سجل الرسائل ---------- */
function vMessages() {
  const list = store().all('messages').sort((a, b) => String(b.processedAt || '').localeCompare(String(a.processedAt || ''))).slice(0, 200);
  const cfg = settings().inbox || {};
  let h = `<div class="card"><h2>الرسائل البنكية <span class="sp"></span>${cfg.url ? `<button class="btn" data-action="fetchInbox">جلب الآن</button>` : ''}</h2><p class="small muted">آخر 200 رسالة انعالجت. رسائل الرموز ما ينحفظ نصها. ${cfg.lastFetchAt ? 'آخر جلب: ' + fdt(cfg.lastFetchAt, true) : ''}</p>`;
  h += list.length ? `<div class="list">${list.map(m => `<div class="it" data-action="openMsg" data-id="${m.id}"><div class="m"><div class="t small" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((m.text || '(نص محذوف)').replace(/\n/g, ' · '))}</div><div class="badges"><span class="b ${m.status === 'review' ? 'w' : m.status === 'tx' || m.status === 'merged' ? 'g' : 'n'}">${MSG_STATUS_L[m.status] || m.status}</span><span class="b n">${CLS_L[m.cls] || ''}</span>${m.parser ? `<span class="b n">${m.parser === 'format' ? 'صيغة معتمدة' : m.parser === 'template' ? 'صيغة متعلّمة (قبل 1.7.1)' : m.parser === 'alinma' ? 'صيغة الإنماء (قبل 1.7.1)' : 'قارئ عام (قبل 1.7.1)'}</span>` : ''}<span class="b n">${m.source === 'inbox' ? 'صندوق' : 'لصق'}</span>${m.source === 'inbox' && !m.ackedAt ? '<span class="b w">لم يتأكد الاستلام</span>' : ''}</div></div></div>`).join('')}</div>` : '<div class="muted">ما فيه رسائل للحين.</div>';
  return h + `</div>`;
}

/* ---------- سجل التعديلات ---------- */
function vAudit() {
  const st = store(), u = st.undoStack[st.undoStack.length - 1], r = st.redoStack[st.redoStack.length - 1];
  const list = st.all('auditLog').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  const SRC = { user: '', undo: 'تراجع', redo: 'إعادة', system: 'تحديث' };
  const TBL = { transactions: 'عملية', merchants: 'تاجر', beneficiaries: 'مستفيد', accounts: 'حساب', instruments: 'أداة', imports: 'استيراد', messages: 'رسالة', reviews: 'مراجعة', rules: 'قاعدة', limits: 'حد', templates: 'صيغة', settings: 'إعدادات', categories: 'تصنيف' };
  const summ = (c) => Object.entries(c || {}).map(([n, x]) => [x.created ? `+${x.created}` : '', x.updated ? `✎${x.updated}` : '', x.removed ? `−${x.removed}` : ''].filter(Boolean).join(' ') + ' ' + (TBL[n] || n)).join(' · ');
  let h = `<div class="card"><h2>التراجع والإعادة</h2><div class="btns"><button class="btn" data-action="undo" ${u ? '' : 'disabled'}>تراجع${u ? ': ' + esc(u.label) : ''}</button><button class="btn" data-action="redo" ${r ? '' : 'disabled'}>إعادة${r ? ': ' + esc(r.label) : ''}</button></div>
    <p class="small muted" style="margin-top:8px">آخر 30 خطوة في هذي الجلسة. كل تراجع أو إعادة يسألك قبل. تنمسح لما يتسكّر التطبيق، والسجل تحت يبقى.</p></div>`;
  h += `<div class="card"><h2>سجل التعديلات <span class="sp"></span><span class="muted">${st.all('auditLog').length}</span></h2>${list.length ? `<div class="list">${list.map(e => `<div class="it" style="cursor:default"><div class="m"><div class="t">${esc(e.label)} ${SRC[e.source] ? `<span class="b n">${SRC[e.source]}</span>` : ''}</div><div class="s">${fdt(e.at, true)} · ${esc(summ(e.counts))}</div>${(e.items || []).length ? `<div class="s">${e.items.slice(0, 3).map(i => esc(i.text) + ' ' + fmt(i.amount)).join('، ')}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="muted">فاضي.</div>'}</div>`;
  return h;
}

/* ---------- حدود الصرف ---------- */
function limitBars(ls) {
  return ls.map(l => { const w = Math.min(100, l.pct), c = l.level === 'over' ? 'var(--neg)' : l.level === 'warn' ? 'var(--warn)' : 'var(--pos)';
    const name = l.scope === 'total' ? 'الإنفاق الكلي' : l.basis === 'products' ? pcName(l.categoryId) + ' (حسب المنتجات)' : bucketName(l.categoryId), u = l.scope === 'total' ? { color: PAL.blue, icon: 'wallet' } : catUi(l.categoryId);
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
  const prod = l.basis === 'products', pair = l.categoryId ? E.itemCatPair(store(), l.categoryId) : { cat: null, sub: null };
  openSheet(`<h3>${id ? 'تعديل الحد' : 'حد جديد'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <div class="seg"><button class="${l.scope !== 'total' ? 'on' : ''}" data-action="limScope" data-v="category">تصنيف</button><button class="${l.scope === 'total' ? 'on' : ''}" data-action="limScope" data-v="total">الإنفاق الكلي</button></div>
    <input type="hidden" id="lim_scope" value="${l.scope === 'total' ? 'total' : 'category'}"><input type="hidden" id="lim_basis" value="${prod ? 'products' : 'invoices'}">
    <div id="lim_catwrap" class="${l.scope === 'total' ? 'hide' : ''}"><label class="f">التصنيف</label>${catField(pair.cat === '__none' ? null : pair.cat, prod ? pair.sub : null)}
      <label class="f">يحسب</label><div class="seg"><button class="${!prod ? 'on' : ''}" data-action="limBasis" data-v="invoices">حسب الفواتير</button><button class="${prod ? 'on' : ''}" data-action="limBasis" data-v="products">حسب المنتجات</button></div>
      <p class="small muted" id="lim_bnote">${limBasisNote(prod)}</p></div>
    <label class="f">الحد للدورة</label><input type="text" inputmode="decimal" id="lim_amt" value="${l.amount || ''}" placeholder="0.00">
    <label class="f"><input type="checkbox" id="lim_on" ${l.active !== false ? 'checked' : ''}> مفعّل</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveLimit" data-id="${id || ''}">حفظ</button>${id ? `<button class="btn r" data-action="delLimit" data-id="${id}">حذف</button>` : ''}</div>`);
}

/* ---------- القواعد ---------- */
function ruleSummary(r) {
  const st = store(), w = r.when || {}, th = r.then || {}, c = [], a = [];
  if (w.text) c.push(`النص فيه «${esc(w.text)}»`);
  if (w.merchantId) c.push('التاجر: ' + esc(E.merchantName(st.get('merchants', w.merchantId)) || '؟'));
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
  const merchants = st.all('merchants').filter(m => used.has(m.id) || m.id === w.merchantId).sort((a, b) => E.merchantName(a).localeCompare(E.merchantName(b), 'ar')).map(m => [m.id, E.merchantName(m)]);
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
  sheetBg: async (el, ev) => { if (ev.target !== el) return; if (S.sheetKind === 'tx' && (S.flow || itemsDirty())) return; const back = S.newList && S.sheetKind === 'tx'; closeSheet(null); if (back) renderNewList(); else if (S.sheetKind !== 'tx' || !S.newList) S.newList = null; },
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
  merchantDrill: async (el) => { if (!await itemsLeaveOk()) return; S.flow = null; S.items = null; closeSheet(); go('txs', { filters: { kind: 'all', merchantId: el.dataset.id, allTime: true } }); },
  benDrill: (el) => { closeSheet(); go('txs', { filters: { kind: 'all', beneficiaryId: el.dataset.id, allTime: true } }); },
  setKind: (el) => { S.filters.kind = el.dataset.kind; S.txLimit = 300; render(); },
  // 1.7.0: صف النوع و«يحتاج منك» والفلاتر
  setGroup: (el) => { S.filters.group = el.dataset.g === 'all' ? undefined : el.dataset.g; S.txLimit = 300; render(); },
  needToggle: () => { S.filters.need = S.filters.need ? undefined : 'any'; S.txLimit = 300; render(); },
  needPick: (el) => { S.filters.need = S.filters.need === el.dataset.k ? 'any' : el.dataset.k; S.txLimit = 300; render(); },
  fxClear: (el) => {
    const f = S.filters, k = el.dataset.k;
    if (k === 'kind') f.kind = 'all';
    else if (k.startsWith('type:')) f.types = (f.types || []).filter(x => x !== k.slice(5));
    else if (k === 'categoryId') { delete f.categoryId; delete f.catBasis; }
    else if (k === 'cityId') { delete f.cityId; delete f.cityMode; }
    else if (k === 'q') S.q = '';
    else if (k === 'period') f.allTime = true;
    else if (k === 'txIds') { delete f.txIds; delete f.label; }
    else if (k === 'rate') { delete f.rate; delete f.label; }
    else if (k === 'savings') { delete f.savings; delete f.savingsCat; delete f.label; }
    else delete f[k];
    S.txLimit = 300; render();
  },
  moreTx: () => { S.txLimit = (S.txLimit || 300) + 300; render(); },
  filterSheet: () => { S.fDraft = null; sheetFilters(); },
  fxClose: () => { S.fDraft = null; closeSheet(null); },
  fxType: (el) => { const f = fxSync(), k = el.dataset.k; f.types = (f.types || []).includes(k) ? f.types.filter(x => x !== k) : (f.types || []).concat(k); sheetFilters(); },
  fxCat: async () => { const f = fxSync(), pair = f.categoryId && !String(f.categoryId).startsWith('__') ? E.itemCatPair(store(), f.categoryId) : { cat: null, sub: null }; const r = await pickCategory({ cat: pair.cat === '__none' ? null : pair.cat, sub: pair.sub }); if (r && (r.sub || r.cat)) { f.categoryId = r.sub || r.cat; } sheetFilters(); },
  fxCatNone: () => { const f = fxSync(); f.categoryId = '__none'; delete f.catBasis; sheetFilters(); },
  fxCatClear: () => { const f = fxSync(); delete f.categoryId; delete f.catBasis; sheetFilters(); },
  fxBasis: (el) => { const f = fxSync(); if (el.dataset.v === 'products') f.catBasis = 'products'; else delete f.catBasis; sheetFilters(); },
  applyFilters: () => { const f = fxSync() || S.filters; Object.keys(f).forEach(k => { if (f[k] === null || f[k] === undefined || (Array.isArray(f[k]) && !f[k].length)) delete f[k]; }); S.filters = Object.assign({ kind: 'all' }, f); S.fDraft = null; S.txLimit = 300; closeSheet(); render(); },
  clearFilters: () => { S.filters = { kind: 'all', allTime: true }; S.q = ''; S.fDraft = null; closeSheet(); render(); },
  openTx: async (el) => { if (S.items && S.items.txId !== el.dataset.id && !await itemsLeaveOk()) return; sheetTx(el.dataset.id); },
  saveTx: async (el, ev, opts) => {
    const st = store(), t = st.get('transactions', el.dataset.id); if (!t) return;
    // 1.6.0: صفوف الأغراض تنحفظ مع «حفظ» (دفعة وحدة). الحفظ التلقائي بعد اختيار التصنيف يخليها مسودة
    let itemsSaved = false;
    if (!(opts && opts.reopen) && S.items && S.items.txId === t.id) {
      const ir = saveItemDraft(t, !!(opts && opts.skipBadItems));
      if (ir.error) { toast(ir.error, 5000); rerenderItems(); return false; }
      itemsSaved = ir.n > 0;
      if (ir.dropped && ir.dropped.length) S.droppedNote = `ما انحفظ (ناقص أو أكبر من المبلغ): ${ir.dropped.join('، ')}`;
    }
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
        if ((t.merchantId || t.beneficiaryId) && !(E.feeOf(t) > 0 && E.spendEffect(t) === 0)) { scope = await askScope(t.merchantId ? `المحل: ${txTitle(t)}` : `المستفيد: ${txTitle(t)}`); if (!scope) { if (itemsSaved) await persist(); if ((opts && (opts.reopen || opts.flow))) sheetTx(t.id); return false; } }
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
    // الحفظ الصريح (أو «التالي») = راجعتها. «مراجعة لاحقًا» يحفظ بدون ما يعلّمها
    if (!(opts && (opts.reopen || opts.later)) && t3.needsReview) E.markReviewed(st, [t3.id]);
    st.touch(); await persist(); render();
    const nCat = S.savedCount; S.savedCount = 0;
    if (opts && (opts.flow || opts.later)) { const dn = S.droppedNote; S.droppedNote = null; if (dn || nCat) toast([dn, nCat ? `تصنّفت ${cnt(nCat, 'op')}` : ''].filter(Boolean).join('. '), dn ? 6000 : 2500); return true; }
    if (!(opts && opts.reopen) && S.newList) renderNewList(); else if (!(opts && opts.reopen)) closeSheet();
    toast(nCat ? `تم الحفظ، وتصنّفت ${cnt(nCat, 'op')}` : 'تم الحفظ');
    if (opts && opts.reopen) sheetTx(t.id);
    return true;
  },
  txClose: async () => { if (!await itemsLeaveOk()) return; S.items = null; if (S.newList) renderNewList(); else closeSheet(null); },
  newBack: () => renderNewList(),
  newOpen: (el) => sheetTx(el.dataset.id),
  newDone: () => { S.newList = null; closeSheet(null); },
  newToReview: () => { S.newList = null; closeSheet(null); go('reviewc'); },
  cardOwner: async (el) => {
    const i = store().get('instruments', el.dataset.id); if (!i) return;
    if (el.dataset.v === 'me') { i.instrumentOwner = 'me'; i.includeInPersonalSpend = true; }
    else { i.instrumentOwner = 'other'; i.includeInPersonalSpend = false; }
    store().put('instruments', i); store().touch(); await persist('مالك بطاقة جديدة'); render();
    if (S.flow) afterTx(S.flow.ids[S.flow.i]); else if (S.newList) renderNewList(); else closeSheet();
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
  restoreTx: async (el) => { if (!E.restoreTx(store(), el.dataset.id)) return; const sp = await E.splitSmsMerges(store()); await persist('إرجاع عملية محذوفة'); render(); toast(sp.split ? 'رجعت العملية، وانفصلت عنها رسائل كانت مدموجة بالغلط' : 'رجعت العملية'); },
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
    await persist('نقل مصروف نقدي لسحب'); render(); afterTx(el.dataset.id); toast('انتقل للسحب، وما عاد ينحسب مرتين');
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
  rvDel: async (el) => { E.resolveDeletedAgain(store(), el.dataset.id, el.dataset.v); if (el.dataset.v === 'restore') await E.splitSmsMerges(store()); await persist(el.dataset.v === 'restore' ? 'إرجاع عملية محذوفة' : 'إبقاء عملية محذوفة'); render(); toast(el.dataset.v === 'restore' ? 'رجعت العملية' : 'بقيت محذوفة'); },
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
  // 1.6.0: الرئيسي يفتح دايمًا حتى بدون فرعي: تضيف فرعي أو «اختره بدون فرعي»
  pickMain: (el) => { const id = el.dataset.id; if (S.pick.cat !== id) S.pick.sub = null; S.pick.cat = id; S.pick.stage = 'subs'; renderPick(); },
  pickSub: (el) => finishPick({ cat: S.pick.cat, sub: el.dataset.id || null }),
  pickNone: () => finishPick({ cat: null, sub: null }),
  pickBack: () => { S.pick.stage = 'grid'; renderPick(); },
  pickClose: () => finishPick(null),
  pickBg: (el, ev) => { if (ev.target === el) finishPick(null); },
  deleteTx: async (el) => {
    const id = el.dataset.id;
    if (!await confirmBox('حذف العملية', 'تختفي من العمليات ومن كل الأرقام. ترجعها من «المحذوفة» (آخر صفحة العمليات) أو بزر التراجع ↶. لو جات نفس العملية مرة ثانية من كشف أو رسالة، أسألك قبل ما أرجعها.', 'حذف', true)) return afterTx(id);
    E.deleteTx(store(), id); await persist('حذف عملية'); render();
    if (S.flow) { S.items = null; flowAdvance(); }
    else if (S.newList) { S.newList.ids = S.newList.ids.filter(x => x !== id); renderNewList(); }
    toast('انحذفت. ترجعها من «المحذوفة»');
  },
  quickAdd: () => { const q = E.parseQuickEntry($('quick').value); if (!q.amount) return toast('اكتب المبلغ، مثل: قهوة 18'); [q.categoryId, q.subcategoryId] = E.liveCat(store(), q.categoryId, q.subcategoryId); sheetManual('expense', q); },
  manual: (el) => sheetManual(el.dataset.kind),
  saveManual: async (el) => {
    const kind = el.dataset.kind, amt = E.parseNum($('m_amt').value);
    if (!amt || amt <= 0) return toast('المبلغ غير صحيح');
    const e = { kind, amount: amt, date: $('m_date').value || E.todayISO(), description: $('m_desc') ? $('m_desc').value.trim() : '', note: $('m_note').value.trim() };
    if (e.date > E.todayISO()) return toast('التاريخ في المستقبل'); // 1.7.0
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
    if ($('cc_mode')) E.setCommitCfg(store(), { alertMode: $('cc_mode').value, alertValue: $('cc_val').value, n: $('cc_n').value }); // 1.7.1
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
      const r = E.commitImport(store(), S.plan, S.decisions); await E.splitSmsMerges(store()); E.detectRecurring(store());
      await persist(); DB.requestPersistence();
      S.plan = null; S.planFile = null; S.decisions = {};
      toast(`تم الاستيراد: ${r.created} جديدة${r.merged ? `، ${r.merged} مدمجة` : ''}${r.restored ? `، ${r.restored} رجعت من المحذوفة` : ''}${r.keptDeleted ? `، ${r.keptDeleted} بقيت محذوفة` : ''}${r.skippedFuture ? `، ${r.skippedFuture} ما انحفظت (تاريخها في المستقبل)` : ''}`, 3500);
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
const TEACH_ERR = { not_found: 'ما لقيت أحد الحقول في النص', no_amount: 'حدد المبلغ', too_generic: 'الرسالة قصيرة جدًا لتكون صيغة، حدد حقول أقل أو استخدم رسالة أوضح', self_test_failed: 'الصيغة ما قدرت تقرأ نفس الرسالة، راجع الحقول', date_order: 'اختر التاريخ الصحيح تحت الرسالة', bad_date: 'الجزء المحدد للتاريخ ما فيه تاريخ واضح', bad_time: 'الجزء المحدد للوقت ما فيه وقت واضح',
  fee_mode: 'اختر: الرسوم داخل المبلغ ولا فوقه؟', overlap: 'متغيرين على نفس الكلمة: خل كل كلمة لمتغير واحد', amount_currency: 'المبلغ اللي حددته بعملة غير الريال. حدد المبلغ المكتوب بالريال، وإذا الرسالة ما فيها مبلغ بالريال أدخلها يدويًا', too_long: 'الرسالة طويلة جدًا (سطر أطول من 300 حرف): ما تصير صيغة. خلها «معلومات هالمرة بس» أو أدخلها يدويًا', no_guess: 'ما قدرت أقترح قراءة لهذي الرسالة: حدد المتغيرات بنفسك' };
const SINGLE_TOKEN = { amount: 1, balance: 1, fee: 1, cardLast4: 1, accountLast4: 1 };
Object.assign(A, {
  pasteSms: async () => {
    const d = SR().splitDetails($('smsPaste').value || '');
    if (!d.parts.length) return toast('الصق رسالة أو أكثر، وكل رسالة في فقرة');
    S.pasteSplit = { parts: d.parts, sender: pasteSender() };
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
    render(); onNewSms(plan, true);
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
  rvNotDup: async (el) => {
    const mid = E.undoAutoDuplicate(store(), el.dataset.id); if (!mid) return;
    const plan = await E.reprocessMessages(store(), [mid], { allowSameContent: new Set([mid]) });
    if (plan) E.commitSms(store(), plan);
    await persist('رسالة مكررة: مو مكررة'); render(); toast(plan ? smsSummaryText(plan.smsSummary) : 'تم');
  },
  rvDupHide: async (el) => { E.hideAutoDuplicate(store(), el.dataset.id); await persist(null, { noStep: true }); render(); },
  rvMsg: async (el) => { (el.dataset.ids ? String(el.dataset.ids).split(',').filter(Boolean) : [el.dataset.id]).forEach(id => E.resolveMessageReview(store(), id, el.dataset.v)); await persist('قرار مراجعة رسالة'); render(); },
  rvManual: (el) => {
    const r = store().get('reviews', el.dataset.id), m = r && store().get('messages', r.messageId); if (!m) return;
    const amt = SR().extractAmount(m.text || ''); S.pendingManualReview = r.id;
    sheetManual('expense', { amount: amt ? amt.value : '', description: '' });
  },
  teachSms: (el) => {
    const st = store(), r = st.get('reviews', el.dataset.id), m = r && st.get('messages', r.messageId);
    if (!m || !m.text) return toast('نص الرسالة غير متاح');
    const f = r.kind === 'sms_unparsed' && r.templateId ? st.get('templates', r.templateId) : null;
    teachStart({ mode: f ? 'edit' : 'review', back: 'reviewc', text: m.text, sender: m.sender, receivedAt: m.receivedAt, source: m.source, reviewId: r.id, messageId: m.id, formatId: f ? f.id : null, fmt: f });
  },
  teachField: (el) => { S.teachSms.active = el.dataset.k; S.teachSms.name = $('ts_name') ? $('ts_name').value : S.teachSms.name; render(); },
  teachDateOrder: (el) => { if (S.teachSms) { S.teachSms.dateOrder = el.value; S.teachSms.name = $('ts_name') ? $('ts_name').value : S.teachSms.name; render(); } },
  teachFee: (el) => { if (S.teachSms) { S.teachSms.feeMode = el.value; S.teachSms.name = $('ts_name') ? $('ts_name').value : S.teachSms.name; render(); } },
  teachFamily: () => {
    const T = S.teachSms; T.family = $('ts_family').value; T.name = $('ts_name') ? $('ts_name').value : T.name;
    const ok = teachFieldsFor(T.family), NAME_K = ['merchant', 'beneficiary', 'counterparty'], was = NAME_K.find(k => T.ranges[k]), now = NAME_K.find(k => ok.includes(k));
    if (was && now && was !== now && !T.ranges[now]) { T.ranges[now] = T.ranges[was]; delete T.ranges[was]; if (T.active === was) T.active = now; } // الاسم اللي حددته ينتقل (المحل ↔ المستفيد ↔ المحوّل)
    Object.keys(T.ranges).forEach(k => { if (!ok.includes(k)) delete T.ranges[k]; });
    if (!T.ranges.fee) T.feeMode = null;
    if (T.active !== 'skip' && !ok.includes(T.active)) T.active = 'amount';
    render();
  },
  tokTap: (el) => {
    const T = S.teachSms, i = +el.dataset.i, k = T.active; if (!k) return;
    T.name = $('ts_name') ? $('ts_name').value : T.name;
    if (k === 'skip') {
      Object.keys(T.ranges).forEach(f => { const r = T.ranges[f]; if (r && i >= r[0] && i <= r[1]) delete T.ranges[f]; });
      if (T.skips.has(i)) T.skips.delete(i); else T.skips.add(i);
      if (!T.ranges.fee) T.feeMode = null;
      return render();
    }
    T.skips.delete(i);
    Object.keys(T.ranges).forEach(f => { const r = T.ranges[f]; if (f !== k && r && i >= r[0] && i <= r[1]) delete T.ranges[f]; });
    const r = T.ranges[k];
    if (k === 'date') T.dateOrder = null;
    if (!r) T.ranges[k] = [i, i];
    else if (i === r[0] && i === r[1]) delete T.ranges[k];
    else if (SINGLE_TOKEN[k] || T.tokens[i].line !== T.tokens[r[0]].line) T.ranges[k] = [i, i];
    else if (i >= r[0] && i <= r[1]) T.ranges[k] = [i, i]; // ضغطت كلمة داخل التحديد: يصير عليها هي بس (عشان تقدر تصغّره)، وتكبّره بالضغط على كلمة برّاه
    else T.ranges[k] = [Math.min(r[0], i), Math.max(r[1], i)];
    if (T.ranges[k]) {
      const n = T.ranges[k];
      for (let j = n[0]; j <= n[1]; j++) T.skips.delete(j);
      Object.keys(T.ranges).forEach(f => { const o = T.ranges[f]; if (f !== k && o && o[0] <= n[1] && o[1] >= n[0]) delete T.ranges[f]; }); // التحديد الجديد غطّى متغير ثاني: ينشال
    }
    if (!T.ranges.fee) T.feeMode = null;
    render();
  },
  teachSmsSave: async () => {
    const T = S.teachSms, st = store(); if (!T) return;
    T.family = $('ts_family').value; T.name = $('ts_name') ? $('ts_name').value : '';
    if (!T.ranges.amount) return toast('حدد المبلغ في الرسالة');
    if (T.ranges.fee && !T.feeMode) return toast(TEACH_ERR.fee_mode);
    const L = teachBuild(T);
    if (L.error) return toast(TEACH_ERR[L.error] || L.error);
    const res = E.saveSmsFormat(st, L.template, { sample: T.text, replaceId: T.formatId || null, name: T.name });
    await finishFormat(res, T.mode === 'edit' ? 'تعديل صيغة رسالة' : 'اعتماد صيغة رسالة', T.back);
  },
  teachSmsCancel: () => { const b = (S.teachSms && S.teachSms.back) || 'reviewc'; S.teachSms = null; goUp(b); },
  // «معلومات ولا تسألني عن هالشكل»: صيغة معلومات، والرسائل اللي تطابقها تنحفظ معلومات بدون سؤال
  rvInfoFmt: async (el) => {
    const st = store(), r = st.get('reviews', el.dataset.id); if (!r) return;
    const res = E.saveInfoFormat(st, r.messageId); if (!res || res.error) return toast(res && res.error === 'otp' ? 'فيها رمز محتمل: ما تنحفظ لها صيغة معلومات. اختر «رسالة رمز» أو «معلومات هالمرة بس»' : 'ما قدرت أحفظها صيغة معلومات. اختر «معلومات هالمرة بس»', 6000);
    if (res.waiting.length) { const plan = await E.reprocessMessages(st, res.waiting, {}); if (plan) E.commitSms(st, plan); }
    await persist('صيغة معلومات'); render();
    toast(`تمام: رسائل هالشكل تنحفظ معلومات بدون سؤال${res.waiting.length > 1 ? ` (وانقفلت ${cnt(res.waiting.length, 'msg')})` : ''}`, 5000);
  },
  // «معلومات هالمرة بس»: هذي الرسالة واللي معها بنفس الشكل، بدون صيغة
  rvInfoOnce: async (el) => {
    const st = store(), ids = String(el.dataset.ids || '').split(',').filter(Boolean); if (!ids.length) return;
    ids.forEach(id => E.resolveMessageReview(st, id, 'informational'));
    await persist('رسالة معلومات'); render();
  },
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
  limScope: (el) => { $('lim_scope').value = el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); $('lim_catwrap').classList.toggle('hide', el.dataset.v !== 'category'); },
  limBasis: (el) => { $('lim_basis').value = el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); $('lim_bnote').innerHTML = limBasisNote(el.dataset.v === 'products'); },
  saveLimit: async (el) => {
    const scope = $('lim_scope').value, amt = E.parseNum($('lim_amt').value), cat = $('s_cat').value || null, sub = $('s_sub').value || null;
    const prod = scope === 'category' && $('lim_basis').value === 'products';
    if (!(amt > 0)) return toast('اكتب مبلغ الحد');
    if (scope === 'category' && !cat) return toast('اختر التصنيف');
    // حسب الفواتير على الرئيسي، وحسب المنتجات على الرئيسي أو الفرعي
    const cid = scope === 'category' ? (prod ? (sub || cat) : cat) : null;
    const id = el.dataset.id, l = id ? store().get('limits', id) : { id: E.uid(), createdAt: new Date().toISOString() };
    const dup = store().all('limits').find(x => x.id !== l.id && x.scope === scope && (scope === 'total' || (x.categoryId === cid && (x.basis === 'products') === prod)));
    if (dup && !await confirmBox('فيه حد لنفس الشي', `عندك حد ${fmt(dup.amount)} على نفس ${scope === 'total' ? 'الإنفاق الكلي' : 'التصنيف وطريقة الحساب'}. تضيف حد ثاني؟`, 'أضف')) return;
    Object.assign(l, { scope, categoryId: cid, amount: amt, active: $('lim_on').checked, period: 'cycle' });
    if (prod) l.basis = 'products'; else delete l.basis;
    delete l.productCategoryId;
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
  // 1.7.1: الأزرار اللي تحفظ (اعتماد صيغة، تطبيق على السابق، قرارات الالتزام): ضغطة ثانية قبل ما تخلص الأولى ما تنحسب، عشان ما يتكرر شي
  const act = el.dataset.action, guard = ONCE_ACTIONS.has(act);
  if (guard && S.busyAct && S.busyAct.has(act)) return;
  const r = fn(el, ev);
  if (r && typeof r.then === 'function') {
    if (guard) { (S.busyAct || (S.busyAct = new Set())).add(act); }
    r.then(() => { if (guard) S.busyAct.delete(act); }, async (e) => {
      console.error(e); // فشل الحفظ ينعرض للمستخدم داخل persist
      if (!guard) return;
      S.busyAct.delete(act);
      // خطأ في نص العملية قبل الحفظ: نرجع الذاكرة لآخر حالة محفوظة عشان ما يبقى نص تغيير معلّق
      try { await reloadFromDb(); render(); toast('صار خطأ وما انحفظ التغيير. جرّب مرة ثانية'); } catch (e2) { console.error(e2); }
    });
  }
}
const ONCE_ACTIONS = new Set(['fmtScopeApply', 'teachSmsSave', 'rvInfoFmt', 'rvInfoOnce', 'fmtApprove', 'fmtToInfo', 'commitApprove', 'commitDecide', 'commitPay', 'commitAmount', 'commitAlertSave', 'commitMulti', 'commitSplitSave', 'commitMarkClear']);
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
  if (ev.target.id === 'q') { S.q = ev.target.value; clearTimeout(S._qt); S._qt = setTimeout(() => { const box = $('txlist'); if (box) box.innerHTML = txListHtml(); const fl = $('fline'); if (fl) fl.innerHTML = filtersLine(); const nr = $('needrow'); if (nr) nr.innerHTML = needRow(S.filters); }, 200); }
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.id === 'quick') A.quickAdd(); if (ev.key === 'Escape') { if (S.rateResolve) finishRate(null); else if ($('sheet2').innerHTML) finishPick(null); else if ($('sheet').innerHTML) { if (S.sheetKind === 'tx' && S.flow) A.flowX(); else if (S.sheetKind === 'tx' && itemsDirty()) A.txClose(); else if (S.sheetKind === 'shop') shopBack(); else closeSheet(null); } } });

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
  E.migrateDateShapes(S.store); E.migrate162(S.store); await persist(null, { noStep: true }); // نسخة من إصدار قديم: أشكال تواريخ رسائلها، والبنوك (1.6.2)
  const m141 = E.migrate141(S.store); // نسخة من قبل 1.4.1
  if (m141.reprocess.length) { const plan = await E.reprocessMessages(S.store, m141.reprocess); if (plan) E.commitSms(S.store, plan); }
  E.migrate150(S.store); await E.migrate152(S.store); await E.splitSmsMerges(S.store); const m160 = E.migrate160(S.store); // نسخة من قبل 1.5.0 / 1.5.2 / 1.6.0
  const m170 = E.migrate170(S.store); const m171 = E.migrate171(S.store); E.sweepPeriods(S.store); E.detectRecurring(S.store); // 1.7.0 و1.7.1
  let fx = { fixed: 0 }; if (!S.store.settings.migrated170dates) { S.store.settings.migrated170dates = true; S.store.put('settings', S.store.settings); fx = E.fixNextDayDates(S.store); }
  await persist(null, { noStep: true });
  if (fx.fixed) S.store.addAudit({ id: E.uid(), at: new Date().toISOString(), label: `تصحيح تاريخ ${fx.fixed === 1 ? 'عملية' : fx.fixed + ' عمليات'} (رسائل آخر الليل) — تحديث 1.7.0`, source: 'system', changes: [] });
  if (fx.fixed) await persist(null, { noStep: true });
  S.period = null; S.plan = null; S.items = null; S.flow = null; go('home', { nav: true }); toast('تمت الاستعادة' + (fx.fixed ? `، وتصحح تاريخ ${cnt(fx.fixed, 'op')} من رسائل آخر الليل` : '') + (m170.itemsNowCategorized ? `، و${m170.itemsNowCategorized} غرض صار له تصنيف فاتورته` : ''), 7000);
  if (m160.changed && (m160.placed || []).length) setTimeout(sheetPlaceCats, 600);
  else if (m171.changed && (m171.shapes || (m171.commit && m171.commit.asked))) setTimeout(() => sheetNotice171({ shapes: m171.shapes, asked: m171.commit ? m171.commit.asked : 0, auto: m171.commit ? m171.commit.auto : 0, groups: m171.groupsDropped }), 900);
}


/* ================= 1.5.0 (MVP1.2): الأغراض، المدن، المجموعات، الالتزامات، التوقع، السيولة، الحجوزات، التوفير، الضروري والكمالي، المقارنات، السنوي، التنبيهات ================= */
Object.assign(TITLES, { insights: 'التحليل', forecast: 'توقع الدورة', liquidity: 'السيولة', commitments: 'الالتزامات الدائمة', reserves: 'المحجوز', savings: 'فرص التوفير',
  necessity: 'ضروري وكمالي', compare: 'المقارنات', annual: 'السنوي', cities: 'المدن', products: 'المنتجات', items: 'الأغراض', pcats: 'التصنيفات', groups: 'المجموعات', group: 'المجموعة', alerts: 'التنبيهات' });
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
  if (f.noCity && !E.needsCity(st, t)) return false;
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
  if (f.categoryId) ps = ps.filter(p => partMatchCat(p, f.categoryId));
  if (f.nec) ps = ps.filter(p => E.necOfPart(st, t, p) === f.nec);
  return sumP(ps);
}
function filtersLine150(f) {
  const out = [];
  if (f.label) out.push(f.label);
  if (f.nec) out.push(NEC_L[f.nec]);
  if (f.cityId) out.push('المدينة: ' + cityName(f.cityId) + (f.cityMode === 'withGps' ? ' (مع اقتراحات الموقع)' : ' (المعتمدة فقط)'));
  if (f.noCity) out.push('بدون مدينة');
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
  if (sc.source === 'user') return `<div class="drow">${ico('pin')}<div class="m">📍 <b>${esc(cityName(sc.cityId))}</b>${t.cityAuto ? ` — <span class="muted">اعتمدت تلقائيًا (موقعك وقت العملية = مدينتك الحالية)</span>` : ''}</div><a data-action="cityPick" data-id="${t.id}">تغيير</a></div>`;
  if (sc.cityId) return `<div class="drow" style="flex-wrap:wrap">${ico('pin')}<div class="m">📍 <b>${esc(cityName(sc.cityId))}</b> — <span class="muted">${CITY_SRC_L[sc.source] || 'مقترحة'}</span></div>
    <div class="btns" style="width:100%;margin-top:6px"><button class="btn" data-action="cityApprove" data-id="${t.id}" data-c="${esc(sc.cityId)}">اعتمدها</button><button class="btn" data-action="cityPick" data-id="${t.id}">غيّرها</button><button class="btn" data-action="cityDismiss" data-id="${t.id}">تجاهل الموقع لهذه العملية</button></div></div>`;
  return `<div class="drow">${ico('pin')}<div class="m muted">${sc.source === 'dismissed' ? 'تجاهلت الموقع لهذه العملية' : 'المدينة غير محددة'}</div>${sc.source !== 'dismissed' && E.needsCity(store(), t) ? `<a data-action="cityDismiss" data-id="${t.id}" style="margin-inline-end:12px">تجاهل الموقع</a>` : ''}<a data-action="cityPick" data-id="${t.id}">حدد</a></div>`;
}
function txGroupsRow(t) {
  if (!(E.spendEffect(t) !== 0 || (t.groupIds || []).length)) return '';
  if (t.transactionType === 'Refund' && t.refundOfId && store().get('transactions', t.refundOfId)) return `<div class="drow">${ico('tag')}<div class="m muted">يتبع مجموعات الشراء المربوط (ما ينخصم مرتين)</div></div>`;
  const gs = (t.groupIds || []).map(id => store().get('groups', id)).filter(Boolean);
  return `<div class="drow">${ico('tag')}<div class="m">${gs.length ? gs.map(g => `<span class="b">${esc(((g.emoji || '') + ' ' + g.name).trim())}</span>`).join(' ') : '<span class="muted">بدون مجموعة</span>'}</div><a data-action="groupsPick" data-id="${t.id}">${gs.length ? 'تعديل' : '+ مجموعة'}</a></div>`;
}
function txChainFields(t) {
  // 1.7.0: الافتراضي من الجهة أو التصنيف، و«غير محدد» إذا ما تحدد في أي مستوى
  const st = store(), dc = E.effective(st, Object.assign({}, t, { isCommitment: null }), 'commit', true), ds = E.effective(st, Object.assign({}, t, { savingsEligible: null }), 'save', true);
  const yn = (v) => v === true ? 'نعم' : v === false ? 'لا' : 'غير محدد';
  const o = (v, cur, l) => `<option value="${v}" ${String(cur == null ? '' : cur) === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="grid2"><div><label class="f">التزام دائم</label><select id="s_com">${o('', t.isCommitment, `افتراضي (${yn(dc)})`)}${o('true', t.isCommitment, 'نعم')}${o('false', t.isCommitment, 'لا')}</select></div>
    <div><label class="f">يدخل فرص التوفير</label><select id="s_sav">${o('', t.savingsEligible, `افتراضي (${yn(ds)})`)}${o('true', t.savingsEligible, 'نعم')}${o('false', t.savingsEligible, 'لا')}</select></div></div>
    <label class="f"><input type="checkbox" id="s_rx" ${E.isRateExcluded(st, 'transaction', t.id) ? 'checked' : ''}> استثنها من معدل الإنفاق المتغير (التوقع)</label>`;
}
function subjectChainFields(o, kind, recNec) {
  const st = store(), op = (v, cur, l) => `<option value="${v}" ${String(cur == null ? '' : cur) === v ? 'selected' : ''}>${l}</option>`;
  let h = '<div class="grid2">';
  if (recNec) h += `<div><label class="f">التكرار</label><select id="sc_rec">${op('', o.defaultRecurrenceType, 'من التصنيف')}${op('recurring', o.defaultRecurrenceType, 'متكرر')}${op('variable', o.defaultRecurrenceType, 'متغير')}</select></div>
    <div><label class="f">الضرورة</label><select id="sc_nec">${op('', o.defaultNecessityType, 'من التصنيف')}${op('essential', o.defaultNecessityType, 'ضروري')}${op('discretionary', o.defaultNecessityType, 'كمالي')}</select></div>`;
  h += `<div><label class="f">التزام دائم</label><select id="sc_com">${op('', o.isCommitment, 'من التصنيف')}${op('true', o.isCommitment, 'نعم')}${op('false', o.isCommitment, 'لا')}</select></div>
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
// 1.6.0: تصنيف الغرض من نفس قائمة التصنيفات (رئيسي أو فرعي)
function pcName(id) { if (!id || id === '__none') return 'بدون تصنيف'; if (String(id).startsWith('__')) return bucketName(id); const p = E.itemCatPair(store(), id); return p.cat === '__none' ? 'بدون تصنيف' : catPath(p.cat, p.sub); }
function txBlocks150(t) {
  const st = store(); let h = '';
  // يبدو أنها متكررة
  const rc = E.recurringOfTx(st, t);
  if (rc && rc.status === 'suggested' && E.spendEffect(t) > 0) h += `<div class="banner i" style="display:block;margin-top:10px"><b>تبدو متكررة — تضيفها التزام دائم؟</b>
    <div class="small" style="margin-top:4px">التكرار المتوقع: ${CAD_L[rc.cadence]} · المبلغ المعتاد: <span class="num">${fmt(rc.expectedAmount)}</span> · آخر عملية: ${fdate(rc.lastDate, true)} · القادمة المتوقعة: ${fdate(E.nextDue(rc, today0(), store()), true)} ${FC}</div>
    <div class="btns" style="margin-top:8px"><button class="btn p" data-action="recConfirm" data-id="${rc.id}" data-c="1" data-tx="${t.id}">نعم، التزام دائم</button><button class="btn" data-action="recConfirm" data-id="${rc.id}" data-c="0" data-tx="${t.id}">متكرر بس</button><button class="btn" data-action="recDismiss" data-id="${rc.id}" data-tx="${t.id}">مو متكرر</button></div></div>`;
  else if (rc && rc.status === 'confirmed' && E.spendEffect(t) > 0) h += `<div class="small muted" style="margin-top:8px">${ico('repeat')} متكرر مؤكد (${CAD_L[rc.cadence]})${E.recIsFlagged(st, rc) ? ' · التزام دائم' : ''} · القادمة ${fdate(E.nextDue(rc, today0(), store()), true)} <a data-action="recEdit" data-id="${rc.id}">تعديل</a></div>`;
  // الأغراض (1.6.0: صفوف داخل النافذة)
  h += itemsBoxHtml(t);
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
  if (c) { delete t.periodCity; t.cityId = c; t.cityManualAt = new Date().toISOString(); } // 1.7.0: اختيارك يغلب «الفترات»
  if (sc) Object.assign(t, { suggestedCityId: sc, suggestedCityRaw: cityName(sc), citySuggestionSource: 'device_gps', citySuggestedAt: new Date().toISOString() });
  if (sc && t.periodCity && !t.periodCity.forced && t.cityId !== sc) E.restorePeriodCity(t); // موقعك الحين مدينة ثانية: الموقع يغلب
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
  const res = E.reservesTotal(st, today0()), cmL = E.commitmentList(st, today0());
  const item = (view, t, sub, icon, color) => `<div class="it" data-action="go" data-view="${view}">${icCircle({ color: color || PAL.blue, icon }, 's')}<div class="m"><div class="t">${t}</div><div class="s">${sub}</div></div>${ico('chevL', 'chev')}</div>`;
  return `<div class="card"><h2>الدورة الحالية</h2><div class="list">
    ${item('forecast', 'توقع نهاية الدورة', fc ? `توقع ${fmt(fc.total)} · الفائض المتوقع ${fmt(fc.surplus)}${fc.confidence === 'low' ? ' · ثقة منخفضة' : ''}` : 'ما فيه دورة حالية', 'trend', PAL.violet)}
    ${item('liquidity', 'السيولة القابلة للصرف', L && L.known ? fmt(L.total) : 'تحتاج رصيد حساب معروف (كشف أو رسالة فيها الرصيد)', 'wallet', PAL.green)}
    ${item('commitments', 'الالتزامات الدائمة' + (cmL.some(c => c.status !== 'approved' || c.changed || c.multi) ? ` <span class="cnt">${cmL.filter(c => c.status !== 'approved' || c.changed || c.multi).length}</span>` : ''), `${cmL.length} التزام${cmL.some(c => c.status !== 'approved') ? ` · ${cmL.filter(c => c.status !== 'approved').length} ينتظر اعتمادك` : ''}${cmL.some(c => c.changed) ? ' · تغيّر سعر بعضها' : ''}${cmL.some(c => c.multi) ? ' · أكثر من دفعة في دورة' : ''}${sug ? ` · ${sug} مقترح يحتاج مراجعتك` : ''}`, 'repeat', PAL.blue)}
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
  h += `</div><div class="card"><h2>المعدلات</h2><p class="small muted">الإنفاق المتغير = الإنفاق الحقيقي ناقص التحويلات الداخلية وسداد البطاقات والعمليات بأثر صفر و«الالتزامات الدائمة» واستثناءاتك. السحب النقدي والخارج غير المعروف يبقون صرف.</p><div class="rows">
    ${rowR('', 'معدل الدورة الحالية (المتغير)', money(cr.cycleRate), drillAttr(cr.variable.txIds, 'الإنفاق المتغير في الدورة', { rate: true }), `${fmt(cr.variable.amount)} ÷ ${cr.elapsed} يوم`)}
    ${rowR('', 'معدل آخر 7 أيام داخل الدورة', cr.last7 ? money(cr.last7.rate) : '<span class="muted small">بعد 7 أيام</span>', cr.last7 ? drillAttr(cr.last7.txIds, 'الإنفاق المتغير آخر 7 أيام', { rate: true }) : '', cr.last7 ? `${fmt(cr.last7.amount)} ÷ 7` : 'ما يدخل فيه أيام من الدورة السابقة')}
    ${rowR('', 'معدل الأيام المنقضية (كل الصرف)', money(cr.elapsedRate), drillAttr(cr.all.txIds, 'كل صرف الدورة'), `${fmt(cr.all.amount)} ÷ ${cr.elapsed} يوم`)}</div></div>`;
  if (fc.upcoming.length) h += `<div class="card"><h2>الالتزامات القادمة ${FC}</h2><div class="list">${fc.upcoming.map(u => `<div class="it" data-action="recEdit" data-id="${u.recurringId}"><div class="m"><div class="t">${esc(u.name)}</div><div class="s">${fdate(u.date, true)}${u.overdue ? ' · <span class="warn-t">متأخر</span>' : ''}</div></div><span class="num">${fmt(u.amount)}</span></div>`).join('')}</div></div>`;
  const ex = settings().rateExclusions || [];
  const exName = (e) => e.type === 'category' ? 'تصنيف: ' + bucketName(e.id) : e.type === 'merchant' ? 'تاجر: ' + (E.merchantName(st.get('merchants', e.id)) || '—') : e.type === 'beneficiary' ? 'مستفيد: ' + ((st.get('beneficiaries', e.id) || {}).name || '—') : 'عملية: ' + (st.get('transactions', e.id) ? txTitle(st.get('transactions', e.id)) + ' ' + fmt(st.get('transactions', e.id).grossAmount) : 'محذوفة');
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
// 1.7.1: «الالتزامات الدائمة»: كل جهة معلّمة «التزام دائم» لها خطة: سؤال اعتماد المبلغ، نظام الدفعات (شهري/متغير)، والقيمة (ثابت/متغير).
// اللي تنتظر جوابك ما تنحسب التزام. تنبيه لما يتغير السعر، ولما تجي أكثر من دفعة في نفس الدورة
const commitDispl = (c) => c.shown != null ? money(c.shown) : '<span class="muted">—</span>';
const avgUnit = (n, w) => n === 1 ? (w === 'pay' ? 'آخر دفعة' : 'آخر دورة') : `آخر ${n} ${w === 'pay' ? 'دفعات' : 'دورات'}`;
function commitLine(c) {
  const lastTxt = `آخر مبلغ ${fmt(c.last.amount)} (${fdate(c.last.date)})`;
  if (c.status !== 'approved') return `ينتظر اعتماد مبلغه · آخر فاتورة ${fmt(c.last.amount)} (${fdate(c.last.date)})`;
  if (c.pay === 'variable') {
    if (c.value === 'fixed') return `المعتمد لكل دفعة ${fmt(c.approved)} · ${c.perCycle != null ? `متوسط الدورة ${fmt(c.perCycle)} (${avgUnit(c.cyclesUsed, 'cyc')})` : 'متوسط الدورة يطلع بعد أول دورة كاملة'}`;
    return c.shown != null ? `متوسط ${avgUnit(c.cyclesUsed, 'cyc')} كاملة · ${lastTxt}` : `المتوسط يطلع بعد أول دورة كاملة · ${lastTxt}`;
  }
  if (c.value === 'variable') return `متوسط ${avgUnit(c.paysUsed, 'pay')} · ${lastTxt}`;
  return `المعتمد ${fmt(c.approved)} · ${lastTxt}`;
}
const alertTxt = (al) => al.mode === 'sar' ? `${fmt(al.value)} ريال` : `${al.value}%`;
// أزرار «سؤال الاعتماد»
function commitAskHtml(c) {
  const k = esc(c.key);
  return `<div class="small">آخر فاتورة لـ<b>${esc(c.name)}</b> <b class="num">${fmt(c.suggest)}</b> ريال (${fdate(c.last.date)}). نعتمد هالمبلغ كقيمة معتمدة لهذا الالتزام؟</div>
    <div class="btns" style="margin-top:8px"><button class="btn p" data-action="commitApprove" data-k="${k}" data-v="approve">نعم اعتمده</button><button class="btn" data-action="commitOther" data-k="${k}">مبلغ ثاني</button><button class="btn" data-action="commitApprove" data-k="${k}" data-v="variable">قيمته متغيرة</button></div>`;
}
// أزرار «تغيّر السعر»: لو المبلغ قريب من ضعف المعتمد، «حق شهرين» و«مقدم» أول
function commitPriceHtml(c) {
  const k = esc(c.key), b = {
    update: `<button class="btn${c.nearDouble ? '' : ' p'}" data-action="commitDecide" data-k="${k}" data-v="update">تحديث بالسعر (${fmt(c.last.amount)})</button>`,
    variable: `<button class="btn" data-action="commitDecide" data-k="${k}" data-v="variable">خله متغير</button>`,
    exception: `<button class="btn" data-action="commitDecide" data-k="${k}" data-v="exception">استثناء هالشهر</button>`,
    arrears: `<button class="btn${c.nearDouble ? ' p' : ''}" data-action="commitSplitOpen" data-k="${k}" data-id="${esc(c.last.id)}" data-kind="arrears">دفعت حق شهرين (الماضي ما دفعته)</button>`,
    advance: `<button class="btn" data-action="commitSplitOpen" data-k="${k}" data-id="${esc(c.last.id)}" data-kind="advance">دفعت مقدم للشهر الجاي</button>`,
  };
  const order = c.nearDouble ? ['arrears', 'advance', 'update', 'variable', 'exception'] : ['update', 'variable', 'exception', 'arrears', 'advance'];
  return `<div class="small">آخر مبلغ <b class="num">${fmt(c.last.amount)}</b> (${fdate(c.last.date)}) والمعتمد <b class="num">${fmt(c.approved)}</b> <span class="${c.diffAbs > 0 ? 'warn-t' : 'muted'}">(${c.diffAbs > 0 ? '+' : ''}${fmt(c.diffAbs)}${c.diffPct != null ? ` · ${c.diffPct > 0 ? '+' : ''}${c.diffPct}%` : ''})</span>.${c.nearDouble ? ' <b>المبلغ تقريبًا ضعف سعره.</b>' : ''}</div>
    <div class="btns" style="margin-top:8px">${order.map(x => b[x]).join('')}</div>`;
}
function commitMultiHtml(c) {
  const k = esc(c.key), st = store(), per = { start: c.multi.cycleStart, end: c.multi.cycleEnd };
  const rows = c.multi.txIds.map(id => st.get('transactions', id)).filter(Boolean).sort((a, b) => (E.txDate(a) + (a.time || '')).localeCompare(E.txDate(b) + (b.time || '')));
  return `<div class="small">فيه <b>${c.multi.count === 2 ? 'دفعتين' : c.multi.count + ' دفعات'}</b> لـ<b>${esc(c.name)}</b> في نفس الدورة (${fperiod(per)}): ${rows.map(t => `<span class="num">${fmt(E.payAmt(t))}</span> يوم ${fdate(E.txDate(t))}`).join('، ')}. هل هو متغير، أو تعثر من شهر سابق، أو دفعة مقدمة، أو استثناء؟</div>
    <div class="btns" style="margin-top:8px"><button class="btn" data-action="commitMulti" data-k="${k}" data-v="variable">دفعاته متغيرة (أكثر من دفعة عادي)</button><button class="btn" data-action="commitMulti" data-k="${k}" data-v="arrears">تعثر من شهر سابق</button><button class="btn" data-action="commitMulti" data-k="${k}" data-v="advance">دفعة مقدمة للشهر الجاي</button><button class="btn" data-action="commitMulti" data-k="${k}" data-v="exception">استثناء لهالشهر بس</button></div>`;
}
function undefinedBanner(field, period, what) {
  if (!period) return '';
  const u = E.undefinedSpend(store(), period, field); if (!(u.amount > 0.004)) return '';
  return `<div class="card undef"><div class="row"><div style="flex:1;min-width:0"><b class="num">${fmt(u.amount)}</b> ر.س <span>${what}</span><div class="small muted">«غير محدد» ما نخمّنه. حدده مرة وحدة على التصنيف ويمشي على عملياته.${u.pending > 0.004 ? ` منها <span class="num">${fmt(u.pending)}</span> لالتزامات تنتظر اعتماد مبلغها.` : ''}</div></div><button class="btn p" data-action="defineOpen" data-f="${field}" data-pk="${esc(period.start + '|' + period.end)}">حدّدها</button></div></div>`;
}
function vCommitments() {
  const st = store(), today = today0(), cur = E.currentCycle(st), R = cur ? E.computePeriod(st, cur) : null;
  const recs = st.all('recurring'), sug = recs.filter(r => r.status === 'suggested'), conf = recs.filter(r => r.status === 'confirmed'), dis = recs.filter(r => r.status === 'dismissed');
  const up = cur ? E.upcomingCommitments(st, today, cur.end, today) : [], L = E.commitmentList(st, today), cfg = E.commitCfg(st);
  const pend = L.filter(c => c.status !== 'approved'), changed = L.filter(c => c.changed), multi = L.filter(c => c.multi);
  const head = (c) => `<div class="rvh"><b>${esc(c.name)}</b><span class="sp" style="flex:1"></span><a data-action="commitOpen" data-k="${esc(c.key)}">التفاصيل</a></div>`;
  let h = `<div class="card rows">${R ? rowR(dirI('repeat'), 'الالتزامات الدائمة المدفوعة هذي الدورة', money(R.commitments), 'data-action="kpi" data-kind="commitments" data-p="cur"', cnt(R.commitmentItems.length, 'op')) : ''}
    ${rowR(dirI('cal'), 'القادمة قبل نهاية الدورة ' + FC, money(E.round2(up.reduce((s, u) => s + u.amount, 0))), '', up.length ? up.map(u => esc(u.name) + ' ' + fdate(u.date)).slice(0, 3).join('، ') : 'ما فيه')}</div>`;
  if (pend.length) h += `<div class="card" id="cmPend"><h2>تنتظر اعتماد مبلغها (${pend.length})</h2><p class="small muted">لين تجاوب، ما تنحسب التزام ومبالغها مع «غير محدد».</p>${pend.map(c => `<div class="rv">${head(c)}${commitAskHtml(c)}</div>`).join('')}</div>`;
  if (changed.length) h += `<div class="card"><h2>تغيّر سعرها (${changed.length})</h2><p class="small muted">آخر مبلغ يختلف عن المعتمد بأكثر من حد التنبيه (${alertTxt({ mode: cfg.alertMode, value: cfg.alertValue })}، أو الحد الخاص بالالتزام).</p>${changed.map(c => `<div class="rv">${head(c)}${commitPriceHtml(c)}</div>`).join('')}</div>`;
  if (multi.length) h += `<div class="card"><h2>${ico('alert')} أكثر من دفعة في نفس الدورة (${multi.length})</h2>${multi.map(c => `<div class="rv">${head(c)}${commitMultiHtml(c)}</div>`).join('')}</div>`;
  h += `<div class="card"><h2>الالتزامات الدائمة <span class="sp"></span><span class="muted">${L.length}</span></h2>${L.length ? `<div class="list">${L.map(c => `<div class="it" data-action="commitOpen" data-k="${esc(c.key)}">${icCircle({ color: c.status !== 'approved' ? PAL.gray : (c.changed || c.multi) ? PAL.orange : PAL.blue, icon: c.subjectType === 'merchant' ? 'store' : 'person' }, 's')}<div class="m"><div class="t">${esc(c.name)}${c.status !== 'approved' ? ' <span class="b w">ينتظر اعتمادك</span>' : ''}${c.changed ? ' <span class="b w">تغيّر السعر</span>' : ''}${c.multi ? ' <span class="b w">⚠️ أكثر من دفعة</span>' : ''}${c.status === 'approved' && c.value === 'variable' ? ' <span class="b n">قيمته متغيرة</span>' : ''}${c.status === 'approved' && c.pay === 'variable' ? ' <span class="b n">دفعاته متغيرة</span>' : ''}</div><div class="s">${commitLine(c)}</div></div>${commitDispl(c)}</div>`).join('')}</div>`
    : '<div class="muted small">ما فيه للحين. «التزام دائم» تحدده أنت على التصنيف أو الفرعي أو المحل أو المستفيد أو العملية نفسها، أو توافق على المقترح تحت.</div>'}
    ${(E.commitmentGroups(st).none || []).length ? `<p class="small muted" style="margin-top:8px">و${cnt(E.commitmentGroups(st).none.length, 'op')} التزام بدون محل أو مستفيد (تدخل المجموع بس). <a ${drillAttr(E.commitmentGroups(st).none.map(t => t.id), 'التزامات بدون جهة')}>اعرضها</a></p>` : ''}</div>`;
  h += undefinedBanner('commit', cur, 'من صرف هذي الدورة ما حددت هل هو «التزام دائم» أو لا');
  if (sug.length) h += `<div class="card"><h2>تبدو متكررة — تضيفها التزام دائم؟</h2><p class="small muted">اكتشاف آلي: نفس التاجر أو المستفيد والحساب، بفاصل منتظم ومبلغ قريب. ما تصير التزام إلا بموافقتك.</p>${sug.map(r => `<div class="rv"><div class="rvh"><b>${esc(E.subjectName(st, r))}</b><span class="sp" style="flex:1"></span><a ${drillAttr(r.evidenceTxIds, 'عمليات ' + E.subjectName(st, r))}>العمليات</a></div><div class="small muted">${recLine(r)}</div>
    <div class="btns" style="margin-top:8px"><button class="btn p" data-action="recConfirm" data-id="${r.id}" data-c="1">نعم، التزام دائم</button><button class="btn" data-action="recConfirm" data-id="${r.id}" data-c="0">متكرر بس</button><button class="btn" data-action="recDismiss" data-id="${r.id}">مو متكرر</button></div></div>`).join('')}</div>`;
  h += `<div class="card"><h2>المتكررة المؤكدة <span class="sp"></span><span class="muted small">للتوقع والحجز</span></h2>${conf.length ? `<div class="list">${conf.map(r => `<div class="it" data-action="recEdit" data-id="${r.id}">${icCircle({ color: E.recIsFlagged(st, r) ? PAL.blue : PAL.gray, icon: 'repeat' }, 's')}<div class="m"><div class="t">${esc(E.subjectName(st, r))}${E.recIsFlagged(st, r) ? ' <span class="b">التزام دائم</span>' : ''}${r.reserve ? ' <span class="b n">محجوز له</span>' : ''}</div><div class="s">${recLine(r)}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div>` : '<div class="muted small">ما فيه للحين.</div>'}</div>`;
  if (dis.length) h += `<div class="card"><details><summary class="muted">رفضتها (${dis.length})</summary><div class="list">${dis.map(r => `<div class="it" style="cursor:default"><div class="m"><div class="t">${esc(E.subjectName(st, r))}</div><div class="s">${recLine(r)}</div></div><button class="btn" data-action="recRestore" data-id="${r.id}">رجّعه مقترح</button></div>`).join('')}</div></details></div>`;
  h += `<div class="card prose"><p class="small">أربع خصائص مستقلة، وكلها تبدأ «غير محدد» لين تحددها: <b>التكرار</b> (متكرر أو متغير)، <b>الضرورة</b> (ضروري أو كمالي)، <b>التزام دائم</b>، و<b>فرص التوفير</b>. كل وحدة تتحدد بالأدق: العملية ← المحل أو المستفيد ← الفرعي ← التصنيف.
    «الالتزامات الدائمة» = الصرف المعلّم «التزام دائم» (ما يشترط تكرار). كل محل أو مستفيد يصير التزام يسألك التطبيق عن مبلغه المعتمد (يقترح آخر فاتورة)، وما ينحسب التزام لين تجاوب. إذا آخر 3 دفعات له متساوية ينعتمد بدون سؤال. حد التنبيه وعدد المتوسط من <a data-action="go" data-view="settings">الإعدادات</a>.</p></div>`;
  return h;
}
const MARK_L = { exception: 'استثناء', arrears: 'تعثر (حق دورة سابقة)', advance: 'مقدم (لدورة جاية)' };
function sheetCommit(key) {
  const st = store(), c = E.commitmentOf(st, key, today0()); if (!c) return closeSheet(null);
  const cfg = E.commitCfg(st), k = esc(key), ok = c.status === 'approved', L = E.commitLedger(st, key, today0());
  const seg = (on, act, v, label) => `<button style="flex:1" class="${on ? 'on' : ''}" data-action="${act}" data-k="${k}" data-v="${v}">${label}</button>`;
  const shownTxt = !ok ? '' : c.pay === 'variable'
    ? (c.value === 'fixed' ? `يعرض المعتمد لكل دفعة <b class="num">${fmt(c.approved)}</b>${c.perCycle != null ? `، ومتوسط الدورة <b class="num">${fmt(c.perCycle)}</b> (${avgUnit(c.cyclesUsed, 'cyc')} كاملة)` : '، ومتوسط الدورة يطلع بعد أول دورة كاملة'}.`
      : (c.shown != null ? `يعرض متوسط الدورة: <b class="num">${fmt(c.shown)}</b> (${avgUnit(c.cyclesUsed, 'cyc')} كاملة).` : 'المتوسط يطلع بعد ما تكتمل دورة وحدة على الأقل.'))
    : (c.value === 'variable' ? `يعرض متوسط ${avgUnit(c.paysUsed, 'pay')}: <b class="num">${fmt(c.shown)}</b>، وما ينبهك لما يتغير السعر.` : '');
  const noteOf = (e) => e.kind === 'arrears' && e.k < 0 ? 'دفعة متأخرة' : e.kind === 'advance' && e.k > 0 ? 'مدفوع مقدم' : e.kind === 'exception' ? 'استثناء' : '';
  const cyc = c.cycles.map(x => { const notes = Array.from(new Set(x.entries.map(noteOf).filter(Boolean))); return `<div class="it" style="cursor:default"><div class="m"><div class="t small">${fperiod(x)}${x.open ? ' <span class="b n">الحالية</span>' : x.future ? ' <span class="b n">جاية</span>' : ''}</div><div class="s">${x.amount > 0.004 ? `${cnt(new Set(x.entries.map(e => e.txId)).size, 'op')}${notes.length ? ' · ' + notes.join('، ') : ''}` : (x.open || x.future ? 'ما فيه دفعة للحين' : '<span class="warn-t">ما فيه دفعة</span>')}</div></div><span class="num">${x.amount > 0.004 ? fmt(x.amount) : '—'}</span></div>`; }).join('');
  const marked = Object.keys(c.plan.marks || {}).map(id => ({ id, mk: c.plan.marks[id], x: L.byTx.get(id) })).filter(o => o.x);
  const own = c.alertOwn ? c.alert.mode : 'global';
  openSheet(`<h3>${esc(c.name)}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    ${!ok ? `<div class="banner w" style="display:block">${commitAskHtml(c)}<div class="small muted" style="margin-top:8px">لين تجاوب ما ينحسب التزام، ومبالغه مع «غير محدد».</div></div>` : ''}
    ${c.changed ? `<div class="banner w" style="display:block">${commitPriceHtml(c)}</div>` : ''}
    ${c.multi ? `<div class="banner w" style="display:block">${commitMultiHtml(c)}</div>` : ''}
    ${ok ? `<label class="f">نظام الدفعات</label><div class="seg" style="display:flex">${seg(c.pay !== 'variable', 'commitPay', 'monthly', 'شهري (دفعة كل دورة)')}${seg(c.pay === 'variable', 'commitPay', 'variable', 'متغير (أكثر من دفعة)')}</div>
    <label class="f">القيمة</label><div class="seg" style="display:flex">${seg(c.value === 'fixed', 'commitDecide', 'fixed', 'ثابت')}${seg(c.value === 'variable', 'commitDecide', 'variable', 'متغير')}</div>
    ${c.value === 'fixed' ? `<label class="f">المبلغ المعتمد${c.pay === 'variable' ? ' (لكل دفعة)' : ''}${c.auto ? ' <span class="small muted">· انعتمد تلقائي لأن آخر 3 دفعات متساوية</span>' : ''}</label><div class="btns" style="flex-wrap:nowrap"><input type="text" inputmode="decimal" id="cm_amt" value="${c.approved != null ? c.approved : ''}" style="flex:1"><button class="btn p" data-action="commitAmount" data-k="${k}">حفظ</button></div>` : ''}
    ${shownTxt ? `<p class="small" style="margin-top:8px">${shownTxt}</p>` : ''}
    ${c.value === 'fixed' ? `<label class="f">حد تنبيه تغيّر السعر</label><div class="btns" style="flex-wrap:nowrap"><select id="cm_almode" style="flex:1.4"><option value="global" ${own === 'global' ? 'selected' : ''}>مثل العام (${alertTxt({ mode: cfg.alertMode, value: cfg.alertValue })})</option><option value="pct" ${own === 'pct' ? 'selected' : ''}>نسبة خاصة (%)</option><option value="sar" ${own === 'sar' ? 'selected' : ''}>مبلغ خاص (ريال)</option></select><input type="text" inputmode="decimal" id="cm_alval" value="${c.alertOwn ? c.alert.value : ''}" placeholder="القيمة" style="flex:1"><button class="btn" data-action="commitAlertSave" data-k="${k}">حفظ</button></div>
      <p class="small muted">ينبهك لما آخر مبلغ يختلف عن المعتمد بأكثر من ${alertTxt(c.alert)}.</p>` : ''}` : `<div class="btns" id="cm_other" style="flex-wrap:nowrap;margin-bottom:10px"><input type="text" inputmode="decimal" id="cm_amt" placeholder="مبلغ ثاني تكتبه" style="flex:1"><button class="btn" data-action="commitApprove" data-k="${k}" data-v="amount">اعتمد هالمبلغ</button></div>`}
    ${cyc ? `<h3 style="margin-top:14px;font-size:15px">سجل الدورات</h3><div class="list">${cyc}</div><p class="small muted">الدفعة المتعثرة أو المقدمة تنحسب هنا على دورتها. صرفك الفعلي يبقى بتاريخ الدفع.</p>` : ''}
    ${marked.length ? `<h3 style="margin-top:14px;font-size:15px">دفعات عليها علامة</h3><div class="list">${marked.map(o => `<div class="it" style="cursor:default"><div class="m"><div class="t small"><span class="num">${fmt(o.x.amount)}</span> · ${fdate(o.x.date, true)}</div><div class="s">${MARK_L[o.mk.kind] || o.mk.kind}${o.x.split ? ': ' + o.x.split.filter(p => p.amount > 0).map(p => `<span class="num">${fmt(p.amount)}</span> ${p.k === 0 ? 'لدورتها' : p.k < 0 ? `قبلها بـ${-p.k === 1 ? 'دورة' : -p.k + ' دورات'}` : `بعدها بـ${p.k === 1 ? 'دورة' : p.k + ' دورات'}`}`).join('، ') : ''}</div></div>${o.mk.kind !== 'exception' ? `<button class="btn" data-action="commitSplitOpen" data-k="${k}" data-id="${esc(o.id)}" data-kind="${o.mk.kind}" data-edit="1">عدّل</button>` : ''}<button class="btn r" data-action="commitMarkClear" data-k="${k}" data-id="${esc(o.id)}">${ico('trash')}</button></div>`).join('')}</div>` : ''}
    <dl class="kv"><dt>آخر مبلغ</dt><dd>${num(c.last.amount)} · ${fdate(c.last.date, true)}</dd><dt>العمليات</dt><dd><a ${drillAttr(c.txIds, 'التزام: ' + c.name)}>${cnt(c.count, 'op')}</a></dd></dl>
    <div class="btns" style="margin-top:12px"><button class="btn" data-action="${c.subjectType === 'merchant' ? 'editMerchant' : 'editBeneficiary'}" data-id="${esc(c.subjectId)}">${c.subjectType === 'merchant' ? 'إعدادات المحل' : 'إعدادات المستفيد'}</button><button class="btn r" data-action="commitOff" data-k="${k}">مو التزام دائم</button></div>`);
}
// تقسيم دفعة على دورات (تعثر: الدورات السابقة · مقدم: الجاية). S.cmSplit = {key, txId, kind, rows: [{k, amount}]}
function sheetCommitSplit() {
  const X = S.cmSplit; if (!X) return;
  const st = store(), L = E.commitLedger(st, X.key, today0()), x = L.byTx.get(X.txId), c = E.commitmentOf(st, X.key, today0()); if (!x || !c) return closeSheet(null);
  const lab = (k) => { const cy = L.C.list[x.idx + k]; return `${k === 0 ? 'دورة الدفعة نفسها' : k < 0 ? (k === -1 ? 'الدورة اللي قبلها' : `قبلها بـ${-k} دورات`) : (k === 1 ? 'الدورة الجاية' : `بعدها بـ${k} دورات`)}${cy ? ` <span class="small muted">· ${fperiod(cy)}</span>` : ''}`; };
  const tot = E.round2(X.rows.reduce((s, r) => s + (Number(E.parseNum(r.amount)) || 0), 0));
  const canAdd = X.rows.length < 12 && !!L.C.list[x.idx + (X.kind === 'arrears' ? Math.min.apply(null, X.rows.map(r => r.k)) - 1 : Math.max.apply(null, X.rows.map(r => r.k)) + 1)];
  openSheet(`<h3>${X.kind === 'arrears' ? 'دفعة عن أكثر من شهر (تعثر)' : 'دفعة مقدمة'}<span class="sp"></span><button class="close" data-action="commitOpen" data-k="${esc(X.key)}">×</button></h3>
    <p class="small">دفعة <b>${esc(c.name)}</b> <b class="num">${fmt(x.amount)}</b> بتاريخ ${fdate(x.date, true)}. قسّمها على الدورات اللي تغطيها. التقسيم في «سجل الالتزام» بس: صرفك الفعلي يبقى بتاريخ الدفع.</p>
    <div class="list">${X.rows.map((r, i) => `<div class="it" style="cursor:default"><div class="m"><div class="t small">${lab(r.k)}</div></div><input type="text" inputmode="decimal" class="cmsp" data-i="${i}" data-change="cmSplitCalc" value="${r.amount}" style="width:110px"></div>`).join('')}</div>
    <p class="small" id="cmsp_sum" style="margin-top:8px">${splitSumTxt(tot, x.amount)}</p>
    <div class="btns" style="margin-top:10px"><button class="btn p" data-action="commitSplitSave">حفظ التقسيم</button>${canAdd ? `<button class="btn" data-action="commitSplitAdd">+ ${X.kind === 'arrears' ? 'دورة قبل' : 'دورة بعد'}</button>` : ''}${X.rows.length > 2 ? `<button class="btn" data-action="commitSplitLess">− دورة</button>` : ''}<button class="btn" data-action="commitOpen" data-k="${esc(X.key)}">إلغاء</button></div>`);
}
function splitSumTxt(tot, amt) { const left = E.round2(amt - tot); return `المجموع <b class="num">${fmt(tot)}</b> من <b class="num">${fmt(amt)}</b>${Math.abs(left) > 0.004 ? ` · <span class="warn-t">${left > 0 ? 'الباقي' : 'زايد'} ${fmt(Math.abs(left))}</span>` : ' · تمام'}`; }
// 1.7.0: «حدّدها»: التصنيفات اللي صرفها «غير محدد» في هذي الخاصية، وجنب كل وحدة أزرار سريعة
const DEFINE_F = {
  nec: { title: 'الضروري والكمالي', key: 'defaultNecessityType', opts: [['essential', 'ضروري'], ['discretionary', 'كمالي']] },
  save: { title: 'فرص التوفير', key: 'savingsEligible', opts: [[true, 'يدخل'], [false, 'ما يدخل']] },
  commit: { title: 'الالتزامات الدائمة', key: 'isCommitment', opts: [[true, 'التزام دائم'], [false, 'مو التزام']] },
};
function sheetDefine(field, per) {
  const st = store(), D = DEFINE_F[field], u = E.undefinedSpend(st, per, field);
  const cats = u.categories.filter(c => !String(c.categoryId).startsWith('__') && st.get('categories', c.categoryId)), other = E.round2(u.amount - (u.pending || 0) - cats.reduce((s, c) => s + c.amount, 0));
  S.defineCtx = { field, per };
  openSheet(`<h3>${D.title}: حدّدها<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <p class="small muted">${fperiod(per)} · اللي تختاره ينحفظ على التصنيف ويمشي على كل عملياته (السابقة والجاية). المحل أو العملية تقدر تغيّرها لها.</p>
    ${cats.length ? `<div class="list">${cats.map(c => { const u2 = catUi(c.categoryId); return `<div class="it defrow" style="cursor:default">${icCircle(u2, 's')}<div class="m"><div class="t">${esc(E.catName(st, c.categoryId))}</div><div class="s num">${fmt(c.amount)}</div></div><div class="defb">${D.opts.map(([v, l]) => `<button class="btn" data-action="defineSet" data-cat="${esc(c.categoryId)}" data-v="${v}">${l}</button>`).join('')}</div></div>`; }).join('')}</div>` : '<div class="muted">كل التصنيفات محددة.</div>'}
    ${u.pending > 0.004 ? `<div class="banner w" style="display:block;margin-top:10px"><b class="num">${fmt(u.pending)}</b> ر.س لـ${u.pendingKeys.length === 1 ? 'التزام ينتظر اعتماد مبلغه' : u.pendingKeys.length === 2 ? 'التزامين ينتظرون اعتماد مبالغهم' : u.pendingKeys.length + ' التزامات تنتظر اعتماد مبالغها'}: ما تنحسب التزام لين تجاوب. <a data-action="commitPendGo">جاوب عليها</a></div>` : ''}
    ${other > 0.004 ? `<p class="small muted" style="margin-top:10px">و<b class="num">${fmt(other)}</b> صرف بدون تصنيف أو تحويلات لأشخاص ما صنفتها: صنّفها أول وبعدين حدد تصنيفها. <a data-action="needGo" data-k="uncategorized">اعرضها</a></p>` : ''}`);
}
function sheetRecurring(id) {
  const st = store(), r = st.get('recurring', id); if (!r) return;
  openSheet(`<h3>${esc(E.subjectName(st, r))}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><div class="small muted">${recLine(r)}</div>
    <div class="grid2"><div><label class="f">التكرار</label><select id="rc_cad">${['weekly', 'monthly', 'yearly'].map(c => `<option value="${c}" ${r.cadence === c ? 'selected' : ''}>${CAD_L[c]}</option>`).join('')}</select></div><div><label class="f">المبلغ المعتاد</label><input type="text" inputmode="decimal" id="rc_amt" value="${r.expectedAmount}"></div></div>
    <label class="f"><input type="checkbox" id="rc_com" data-was="${E.recIsFlagged(st, r) ? '1' : '0'}" ${E.recIsFlagged(st, r) ? 'checked' : ''}> التزام دائم (ينحفظ على ${r.subjectType === 'merchant' ? 'المحل' : 'المستفيد'} نفسه، ويدخل «الالتزامات الدائمة» والقادمة في التوقع)</label>
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
  // 1.7.0: «غير محدد»: الكمالي اللي ما حددت يدخل فرص التوفير أو لا، والصرف اللي ما حددت ضرورته
  h += undefinedBanner('nec', so.target, 'من صرف الدورة ما حددت ضرورته (فرص التوفير تحسب الكمالي بس)') + undefinedBanner('save', so.target, 'كمالي ما حددت يدخل فرص التوفير أو لا');
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
  h += undefinedBanner('nec', p, 'ما حددت ضرورتها (ضروري أو كمالي)'); // 1.7.0
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
    const col = (s, lab) => `<div class="card"><h2 class="soft">${lab}</h2><div class="bigv" ${tr === 'products' ? `data-action="cmpProducts" data-pk="${esc(s.period.start + '|' + s.period.end + '|' + (s.period.kind || 'custom'))}"` : `data-action="cmpTotal" data-pk="${esc(s.period.start + '|' + s.period.end + '|' + (s.period.kind || 'custom'))}"`}>${money(s.total)}</div><div class="small muted">${s.days} يوم${s.open ? ' (حتى اليوم)' : ''} · المتوسط اليومي <b class="num">${fmt(s.daily)}</b></div><h3 style="font-size:14px;margin:12px 0 4px">التصنيفات الأعلى</h3>${catList(s)}</div>`;
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
      <div class="list">${ac.rows.map(r => `<div class="it" ${tr === 'products' ? `data-action="cmpProducts" data-pk="${esc(r.period.start + '|' + r.period.end + '|' + (r.period.kind || 'custom'))}"` : `data-action="cmpTotal" data-pk="${esc(r.period.start + '|' + r.period.end + '|' + (r.period.kind || 'custom'))}"`}><div class="m"><div class="t">${esc(fperiod(r.period))}${r.complete ? '' : ' <span class="b n">حتى اليوم</span>'}</div>${bar(r.total, mx, r.complete ? PAL.blue : PAL.gray)}</div><span class="num">${fmt(r.total)}</span></div>`).join('')}</div></div>`;
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
  h += `<div class="grid2"><div class="card"><h2 class="soft">أعلى التجار في ${y}</h2>${A0.topMerchants.length ? `<div class="list">${A0.topMerchants.map(m => { const mm = st.get('merchants', m.merchantId); return `<div class="it" data-action="merchantDrill" data-id="${m.merchantId}"><div class="m"><div class="t">${esc(mm ? E.merchantName(mm) : '—')}</div><div class="s">${cnt(m.count, 'op')}</div></div>${money(m.amount)}</div>`; }).join('')}</div>` : '<div class="muted">لا يوجد</div>'}</div>
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

/* ---------- المنتجات والأغراض: في vProducts160 و vItems160 (1.6.0) ---------- */

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
  <h3>الأغراض والمنتجات (1.6.0)</h3><p><b>التصنيفات قائمة وحدة</b> للفواتير والأغراض: تصنيف الغرض رئيسي أو فرعي من نفس القائمة. تصنيفات المنتجات القديمة صارت فرعية (خضار وفواكه، لحوم ودواجن، ألبان وبيض، مخبوزات، مشروبات، مجمدات، حلويات ووجبات خفيفة ← تحت «بقالة»؛ منظفات وأدوات منزلية ← «منزل»؛ أدوية وصحة ← «صحة › أدوية»؛ عناية شخصية، أطفال، إلكترونيات، ملابس، قرطاسية ← «تسوق»؛ أخرى ← «أخرى»)، واللي أضفتها أنت تختار مكانها. الحذف ما يحذف غرض: ينتقل لتصنيف تختاره، أو لرئيسي الفرعي المحذوف (وإذا ما له مكان يصير «مثل الفاتورة»). <b>(1.7.0) الغرض يتبع الفاتورة</b>: الغرض اللي ما اخترت له تصنيف بنفسك تصنيفه = تصنيف فاتورته وقت العرض (وغرض السحب النقدي = تصنيف جزئه، وبدون جزء = تصنيف السحب)، ويتغير معها لو صنفتها بعدين أو غيرت تصنيفها. اللي اخترت له تصنيف بيدك ثابت. «مثل الفاتورة» في اختيار تصنيف الغرض يرجّعه يتبعها. مع التحديث: الأغراض اللي كانت بدون تصنيف، أو تصنيفها نفس تصنيف فاتورتها وقتها، صارت تتبع الفاتورة. صفحة «المنتجات» وحدود «حسب المنتجات» تقرأ التصنيف الحالي.</p>
  <p><b>صف الغرض</b>: الاسم، وتحته الكمية · السعر · المجموع · إيموجي التصنيف · نجمة التقييم. الكمية × السعر = المجموع، ولو كتبت المجموع يطلع السعر = المجموع ÷ الكمية. تصنيف الغرض الافتراضي = تصنيف الفاتورة. «كل الباقي»: المجموع = غير المفصّل من الفاتورة، والسعر = المجموع ÷ الكمية. «⋯» فيها الخصم (علامة معلوماتية) والملاحظة والمجموعات وجزء السحب والحذف. الصفوف تنحفظ مع «حفظ» دفعة وحدة، ويتحقق السقف للمجموع. <b>الاقتراح</b>: تكتب «طما» يطلع «طماطم»، واختياره يعبّي التصنيف والسعر والتقييم من آخر مرة، والكمية تبقى (1 افتراضيًا) والمجموع = الكمية × السعر، وكلها تنعدل. <b>التقييم</b> اختياري من 1 إلى 5، والنجمة تنعبّى بنسبته (4 = 80%). صفحة المنتج: متوسط تقييماته وآخر تقييم.</p>
  <p>سقف الأغراض = الأصل إذا الرسوم مفصولة ومعروفة، وإلا الإجمالي؛ وللسحب صافي السحب بعد المعاد، والغرض المربوط بجزء ما يتجاوز قيمة الجزء. «غير مفصّل» = السقف − مجموع الأغراض، ينحسب وقت العرض وما ينحفظ.</p>
  <p><b>أرقام الصرف ما تتغير بالأغراض</b>: تبقى على تصنيف الفاتورة. <b>تحليل المنتجات</b> لكل تصنيف = الأغراض المصنفة فيه + «غير مفصّل» من فواتير التصنيف (من كل عملية تقبل أغراض: شراء، مصروف نقدي، سحب، تحويل لشخص، خارج غير معروف). فالمجموع الكلي = صرف هذي العمليات ما عدا الرسوم المفصولة (الرسوم مو جزء من الفاتورة، وتبقى في «رسوم» في الصرف)، والتوزيع على التصنيفات <b>ممكن يختلف</b> عن «صرفياتك» لأن الغرض ينحسب على تصنيفه هو (مثلًا منظفات من فاتورة بقالة تطلع تحت «منزل» في المنتجات، وتبقى «بقالة» في الصرف). السحب المقسّم: غير مفصّل كل جزء على تصنيف الجزء. نفس القاعدة في المقارنات والسنوي والمدن (مسار المنتجات).</p>
  <p><b>الاسترداد والأغراض</b>: تحدد المبلغ لكل غرض رجعته فينقص هو بس؛ اللي ما تحدده ينوزع «توزيع تقديري» بالنسبة على الباقي من الفاتورة (الأغراض وغير المفصّل)؛ الاسترداد الكامل يلغي كل الأغراض. إذا صارت الأغراض أكبر من سقف العملية (مثل لما يفصل الكشف الرسوم بعدين) تتقلص بالنسبة في التحليل.</p>
  <h3>المدينة</h3><p>المدينة تخص العملية مو التاجر. الاختصار يرسل اسم المدينة بس (بدون إحداثيات) كاقتراح، وما يصير معتمد إلا بموافقتك أو بالاعتماد التلقائي. <b>الاعتماد التلقائي (1.6.1)</b>: إذا موقع الجوال وقت العملية (من الاختصار) = مدينتك الحالية، تنعتمد تلقائيًا، للعمليات الجديدة بس (اللي توصل من الجلب أو اللصق، ومعها المدينة اللي توصل متأخر لرسالتها)؛ العمليات القديمة، واللي تنعاد قراءتها، والمعلّقة في المراجعة (تكرار محتمل)، تبقى اقتراح. والعملية الأونلاين تبقى اقتراح لأن موقعك مو مكان المتجر: وسيلة الدفع أونلاين، أو في الرسالة كلمة من «وسيلة الدفع: أونلاين» حتى لو الدفع Apple Pay (مثل اشتراكات Apple)، أو اسم المحل على شكل موقع (مثل APPLE.COM/BILL)، لأي نوع عملية (شراء أو سداد فاتورة…). بعد الاعتماد ما تتغير إلا بيدك، حتى لو غيّرت مدينتك الحالية بعدين. «تجاهل الموقع لهذه العملية»: الموقع مو مهم لها، فتشيل علامة «بدون مدينة» وتنحسب «غير محددة» في تحليل المدن. ترتيب الثقة: المعتمدة ← اقتراح الموقع ← مدينتك الحالية (اقتراح احتياطي فقط) ← غير معروفة. اقتراح جديد ما يغيّر مدينة معتمدة. لما تعتمد مدينة غير مدينتك الحالية يسألك: تجعلها الحالية؟ («لا تسألني الآن» = ما يسألك لمدة يوم). الأسماء تتوحد بالرقم الثابت والأسماء البديلة، والمدينة الجديدة من الموقع تنضاف بدل ما تنتجاهل. «استخدام موقعي الحالي» في الإدخال اليدوي يلقى أقرب مدينة من جدول مدن على جهازك (مركز كل مدينة ونصف قطر تقريبي)، بدون أي خدمة خارجية، وما تنحفظ الإحداثيات. إذا اندمجت رسالة وكشف، مدينة الرسالة تبقى. <b>مدينة متأخرة</b>: الاختصار يرسل الرسالة أول ثم المدينة. إذا التطبيق سحب الرسالة قبل ما توصل مدينتها (مثلًا كان مفتوح وقتها)، الصندوق يحفظ المدينة مستقلة برقم الرسالة نفسه، والتطبيق يسحبها في الجلب الجاي ويربطها بنفس الرسالة وعمليتها (أو المعلّقة في المراجعة) كاقتراح موقع فقط: ما تغيّر مدينة معتمدة ولا اقتراح موجود. وبعد ما تنحفظ على جهازك يؤكد استلامها فتنحذف من الصندوق. تحديث مدينة ما انسحب ينحذف من الصندوق بعد 7 أيام.</p>
  <h3>تحليل المدن</h3><p>الافتراضي في شاشة المدن ومقارنة مدينتين والتنقل للعمليات: <b>المدن المعتمدة فقط</b>، وهو الرقم الرسمي. عملية لها اقتراح موقع ما اعتمدته تنحسب «غير محددة»، وما تدخل مدينتها إلا إذا اخترت «تضمين اقتراحات الموقع» (رقم تقديري). مدينتك الحالية ما تدخل التحليل أبدًا.</p>
  <h3>الالتزامات الدائمة والمتكررة</h3><p>أربع مفاهيم مستقلة: التكرار، الضرورة، الالتزام، فرص التوفير، وكلها تبدأ «غير محدد» (1.7.0). السلسلة: التصنيف ← الفرعي ← التاجر أو المستفيد (نفس المستوى) ← العملية، والأدق يغلب. <b>«الالتزامات الدائمة»</b> = شراء أو تحويل لشخص أو مصروف نقدي معلّم «التزام دائم» (مع رسومه)، بدون شرط التكرار. <b>(1.7.1) لكل جهة (محل أو مستفيد) خطة</b>:</p><ul>
  <li><b>سؤال الاعتماد</b>: أول ما تصير الجهة التزام، يقترح آخر فاتورة ويسألك «نعتمد هالمبلغ كقيمة معتمدة لهذا الالتزام؟»: «نعم اعتمده»، «مبلغ ثاني» تكتبه، أو «قيمته متغيرة». <b>لين تجاوب ما تنحسب التزام</b> (لا في مجموع الالتزامات ولا في القادمة ولا تنبيه سعر)، ومبالغها مع «غير محدد» في صفحة الالتزامات. إذا آخر 3 دفعات لها متساوية بالضبط تنعتمد بدون سؤال (وتقدر تعدّل المبلغ بيدك). «مبلغ ثاني»: إذا المبلغ اللي كتبته يختلف عن آخر فاتورة بأكثر من الحد، يطلع لك تنبيه «تغيّر السعر» ويسألك وش كانت هالفاتورة (ما نفترض). مع التحديث: كل التزامات 1.7.0 تنسأل من جديد بآخر فاتورة (إلا اللي آخر 3 دفعات لها متساوية: تنعتمد بدون سؤال). واللي تنتظر تنحسب في التوقع صرف عادي لين تجاوب. دمج محلين ينقل الخطة المعتمدة وقراراتك للمحل الباقي.</li>
  <li><b>مبلغ الدفعة</b> = اللي اندفع كامل: المبلغ مع رسومه.</li>
  <li><b>نظام الدفعات</b>: شهري (الافتراضي: دفعة كل دورة) أو متغير (أكثر من دفعة في الدورة عادي). <b>القيمة</b>: ثابت أو متغير.</li>
  <li><b>وش ينعرض</b>: شهري + ثابت = المبلغ المعتمد. شهري + متغير = متوسط آخر 3 دفعات (دفعة وحدة = مبلغها). دفعات متغيرة + ثابت = المعتمد لكل دفعة، ومتوسط الدورة بعد أول دورة كاملة. دفعات متغيرة + قيمة متغيرة = متوسط آخر 3 دورات كاملة، وما يطلع لين تكتمل دورة وحدة.</li>
  <li><b>الدورة</b> = دورة الراتب (أو الشهر في وضع الشهر الميلادي). الدورة الكاملة = انتهت قبل اليوم، من دورة أول دفعة للالتزام؛ والدورة اللي ما فيها دفعة تنحسب صفر في المتوسط. الرقم 3 (عدد الدفعات أو الدورات في المتوسط) واحد لكل المتوسطات ويتغير من «المزيد ← الإعدادات».</li>
  <li><b>تنبيه «تغيّر السعر»</b> (للقيمة الثابتة): آخر دفعة تختلف عن المعتمد بأكثر من الحد. الحد تختاره بالنسبة أو بالريال (الافتراضي 5%)، عام لكل الالتزامات من الإعدادات، وتخصص التزام لحاله من صفحته. الخيارات: «تحديث بالسعر» (آخر مبلغ يصير المعتمد)، «خله متغير»، «استثناء هالشهر» (المعتمد يبقى، والدفعة محسوبة كاملة في التزامات الدورة وفي المتوسط، ولو تكرر يسألك من جديد)، «دفعت حق شهرين (الماضي ما دفعته)»، «دفعت مقدم للشهر الجاي». إذا المبلغ قريب من ضعف المعتمد (بفرق لين 10%) يطلع الأخيرين أول ومعهم «المبلغ تقريبًا ضعف سعره».</li>
  <li><b>التعثر والمقدم = تقسيم الدفعة على دورات</b>: الخانات تبدأ بالتساوي على دورتين (تعثر: الدورة اللي قبل ودورة الدفعة؛ مقدم: دورة الدفعة والجاية)، وتعدّل المبالغ وتزيد دورات. المجموع لازم يساوي مبلغ الدفعة. التقسيم في «سجل الالتزام» بس (أي دورة مدفوعة، والمتوسط): <b>صرفك الفعلي في كل الصفحات يبقى بتاريخ الدفع</b>. الدورة اللي غطتها دفعة مقدمة تعتبر مدفوعة («مدفوع مقدم») وما تنذكر في «القادمة». لو تغيّر مبلغ الدفعة بعد التقسيم (مثلًا الكشف أضاف رسومها) يتوزع بنفس النسب. ولو شلت العلامة عن دفعة يرجع يسألك عنها إذا مبلغها يختلف عن المعتمد.</li>
  <li><b>أكثر من دفعة في نفس الدورة</b> (نظام شهري): علامة تنبيه على الالتزام كل مرة (الدورة الحالية واللي قبلها)، وتختار: «دفعاته متغيرة» (يتغير نظامه)، «تعثر من شهر سابق» (أول دفعة تنحسب للدورة اللي قبل)، «دفعة مقدمة للشهر الجاي» (آخر دفعة تنحسب للدورة الجاية)، أو «استثناء لهالشهر بس». وتقدر تعدّل تقسيم الدفعة بعدها. الدفعة اللي علّمتها «تعثر» أو «مقدم» ما تنعد (جاوبت عنها). والاستثناء محفوظ بالدفعات نفسها: لو جات دفعة زيادة في نفس الدورة يرجع ينبهك.</li>
  <li><b>القيمة «ثابت» بعد «متغير»</b>: يرجع المبلغ المعتمد السابق (وإلا آخر فاتورة) وتعدله من خانته. والأرقام اللي تكتبها: «410,5» تنقرأ 410.5 (الفاصلة اللي بعدها رقم أو رقمين عشرية، واللي بعدها 3 أرقام آلاف).</li>
  <li>المتكرر المؤكد لنفس الجهة يمشي على نفس المبلغ في التوقع والحجز (المعتمد، أو متوسط الدفعات إذا القيمة متغيرة).</li></ul><p> <b>الاكتشاف الآلي</b> (مقترح فقط): نفس التاجر أو المستفيد ونفس الحساب؛ شهري = فاصل 26–35 يوم و3 عمليات على الأقل، أسبوعي = 6–8 أيام و4 عمليات، سنوي = 350–380 يوم وعمليتين؛ كل مبلغ بين 60% و140% من الوسيط؛ وآخر عملية حديثة (شهري 45 يوم، أسبوعي 11، سنوي 400). المبلغ المعتاد = وسيط آخر 3. المرفوض ما يرجع يقترح. بعد تأكيده: عملياته القريبة المبلغ (70%–130% من المعتاد) تصير متكررة (للتكرار والتوقع)، و«نعم، التزام دائم» (1.7.0) تحفظ «التزام دائم» على المحل أو المستفيد نفسه فتشمل كل عملياته. القادم: من آخر عملية + التكرار، والمتأخر لين 7 أيام يبقى مستحق.</p>
  <h3>معدل الإنفاق المتغير والتوقع</h3><p>الإنفاق المتغير = الإنفاق الحقيقي ناقص «الالتزامات الدائمة» واستثناءاتك (تبدأ فاضية). السحب والخارج غير المعروف يبقون صرف. المعدلات: الدورة الحالية (المتغير ÷ الأيام اللي مضت)، آخر 7 أيام داخل الدورة، والأيام المنقضية (كل الصرف ÷ الأيام). <b>معدل التوقع</b>: 7 أيام أو أكثر = معدل الدورة الحالية؛ أقل = وسيط معدل آخر 3 دورات مكتملة (الدورة المكتملة = انتهت وبياناتك تغطيها من أولها)؛ ما فيه 3 = الدورة الحالية بثقة منخفضة. ما تنخلط أيام دورتين. <b>التوقع</b> = صرف حتى اليوم + الالتزامات المؤكدة المتبقية قبل نهاية الدورة + المعدل × الأيام الباقية (بدون اليوم). الفائض المتوقع = دخل الدورة − التوقع. كل رقم مستقبلي عليه «توقع».</p>
  <h3>الأرصدة والسيولة</h3><p>كل رصيد معروف ينحفظ في سجل (الرصيد، وقته، مصدره) وما ينمسح؛ حذف كشف يعلّم رصيده ملغى. رصيد رسالة الحساب الجاري يُستخدم إذا: الحساب معروف (مو مؤقت)، الرسالة انقرأت كاملة وما لها مراجعة، فيها كلمة «الرصيد»، لها وقت (من الرسالة أو وقت وصولها للاختصار)، وأحدث من رصيد الكشف. رسائل البطاقة الائتمانية ما يُؤخذ منها رصيد (المتاح مو سيولة). <b>السيولة القابلة للصرف</b> = الحسابات القابلة للصرف (الجاري والمحفظة تلقائيًا) + النقد − مستحق البطاقات − الأموال المحجوزة. رصيد الحساب = آخر سجل + العمليات بعده؛ مستحق البطاقة = آخر كشف + المشتريات بعده − السداد والاستردادات بعده. الادخار ما يدخل، والحساب غير المحدد يظهر «سيولة غير محددة»، والرصيد الدائن في البطاقة منفصل. السحب المستبعد ما يزيد النقد.</p>
  <h3>فرص التوفير</h3><p>تدخل الأجزاء الكمالية والمؤهلة للتوفير بس، والتبرعات أبدًا. (1.7.0) الكمالي اللي ما حددت يدخل أو لا يطلع «X ريال غير محدد» مع «حدّدها». لكل تصنيف: الفعلي (أو التوقع لنهاية الدورة الحالية) − الطبيعي؛ الموجب فرصة، والسالب صفر وما يعوّض غيره. الطبيعي: 3 دورات مكتملة أو أكثر = وسيط آخر 3؛ دورتان = تقدير أولي بتحذير؛ دورة = مقارنة بس. سيناريوهات 10% و20% و30% منفصلة.</p>
  <h3>الضروري والكمالي، السنوي، المقارنات</h3><p>الضرورة لكل جزء من الإنفاق بالسلسلة (أجزاء السحب بضرورة تصنيفها، والرسوم من 1.7.0 بضرورة عمليتها)، واللي ما له ضرورة «غير محدد» ما نخمّنه، ويطلع «X ريال غير محدد» مع «حدّدها»: قائمة التصنيفات اللي صرفها غير محدد في الفترة، وجنب كل وحدة أزرار سريعة (تنحفظ على التصنيف). السنوي من يناير لديسمبر. المقارنات: فترتين (الفرق والنسبة والمتوسط اليومي = الإجمالي ÷ أيام الفترة، وللفترة المفتوحة الأيام اللي مضت)، مدينتين (المجموع، العدد، متوسط العملية)، وعبر الفترات (أسبوع، شهر، دورة، والمتوسط من المكتملة). المسار مالي أو منتجات، ما ينخلطون؛ مسار المنتجات = الأغراض + غير المفصّل (نفس قاعدة تحليل المنتجات).</p>
  <h3>التنبيهات</h3><p>مركز واحد، وكل تنبيه ينحسب من البيانات: حد صرف (80% أو نسبتك، و100%)، ميزانية مجموعة، التزام خلال 3 أيام، اشتراك محتمل للمراجعة، (1.7.1) التزام ينتظر اعتماد مبلغه، تغيّر سعر التزام، أكثر من دفعة لالتزام في نفس الدورة، ارتفاع غير معتاد (تصنيف حتى اليوم أكثر من 150% من وسيط نفس الأيام في آخر 3 دورات، وبفرق 100 ريال على الأقل)، توقع يتجاوز المعتاد (أكثر من 110% من وسيط آخر 3 دورات، وبفرق 200)، وسيولة أقل من الالتزامات القادمة اللي ما لها حجز. «إخفاء» و«ذكرني» ينحفظون بمفتاح التنبيه، فما يتكرر.</p>
  <h3>التتبع</h3><p>كل رقم في التحليل ينضغط ويفتح العمليات (أو الأغراض) اللي كوّنته، وأرقام التوقع تعرض مكوناتها.</p>`;
}

/* ---------- الأوامر (1.5.0) ---------- */
const V150 = { insights: vInsights, forecast: vForecast, liquidity: vLiquidity, commitments: vCommitments, reserves: vReserves, savings: vSavings, necessity: vNecessity, compare: vCompare,
  annual: vAnnual, cities: vCities, products: vProducts160, items: vItems160, pcats: vCategories, groups: vGroups, group: vGroup, alerts: vAlerts };
const PCAT_ERR = { name: 'اكتب الاسم', dup: 'فيه تصنيف بنفس الاسم' }, GROUP_ERR = { name: 'اكتب اسم المجموعة', budget: 'الميزانية غير صحيحة', dates: 'تاريخ البداية بعد النهاية' };
Object.assign(A, {
  drillIds: (el) => { const d = S.drillSets.get(el.dataset.k); if (!d) return; closeSheet(); go('txs', { filters: Object.assign({ kind: 'all', allTime: true, txIds: d.ids, label: d.label }, d.extra) }); },
  // المدينة
  cityPick: async (el) => { const id = el.dataset.id, t = store().get('transactions', id); if (!t) return; const c = await pickCity({ cur: t.cityId }); if (!c) return; await approveCity(id, c); },
  cityApprove: async (el) => approveCity(el.dataset.id, el.dataset.c),
  cityDismiss: async (el) => { E.dismissTxCity(store(), el.dataset.id); await persist('تجاهل الموقع'); render(); afterTx(el.dataset.id); toast('تمام، الموقع مو مهم لهذي العملية'); },
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
  itemEdit: (el) => sheetTx(el.dataset.id),
  itemsDrill: (el) => {
    const f = {}, cur = S.view === 'items' ? (S.itemsF || {}) : {};
    if (el.dataset.pc !== undefined) f.productCategoryId = el.dataset.pc;
    if (el.dataset.prod) f.productId = el.dataset.prod;
    if (el.dataset.rest) f.restOnly = true;
    if (el.dataset.only) f.itemsOnly = true;
    if (el.dataset.group) { f.groupId = el.dataset.group; f.allTime = true; }
    if (el.dataset.pk) { const [start, end] = el.dataset.pk.split('|'); f.period = { start, end, kind: 'custom' }; }
    else if (cur.period) f.period = cur.period;
    if (cur.allTime && !f.period) f.allTime = true;
    if (cur.groupId && !f.groupId) f.groupId = cur.groupId;
    go('items', { itemsF: f });
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
  recConfirm: async (el) => { E.confirmRecurring(store(), el.dataset.id, el.dataset.c === '1' ? { isCommitment: true } : {}); E.syncCommitPlans(store()); await persist('تأكيد متكرر'); render(); if (el.dataset.tx) afterTx(el.dataset.tx); toast(el.dataset.c === '1' ? 'صار التزام دائم' : 'صار متكرر مؤكد (للتوقع)'); },
  recDismiss: async (el) => { E.dismissRecurring(store(), el.dataset.id); await persist('مو متكرر'); render(); if (el.dataset.tx) afterTx(el.dataset.tx); else closeSheet(); toast('تمام، ما يرجع يقترحه'); },
  recRestore: async (el) => { const r = store().get('recurring', el.dataset.id); if (!r) return; r.status = 'suggested'; store().put('recurring', r); store().touch(); await persist('رجوع مقترح'); render(); },
  recEdit: (el) => sheetRecurring(el.dataset.id),
  recSave: async (el) => { const amt = E.parseNum($('rc_amt').value), com = $('rc_com').checked, was = $('rc_com').dataset.was === '1'; E.confirmRecurring(store(), el.dataset.id, Object.assign({ cadence: $('rc_cad').value, expectedAmount: amt, reserve: $('rc_res').checked }, com !== was ? { isCommitment: com, explicit: true } : {})); E.syncCommitPlans(store()); await persist('التزام متكرر'); closeSheet(); render(); toast('انحفظ'); },
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
  cmpProducts: (el) => { S.period = pFromKey(el.dataset.pk); go('products'); },
  cmpCat: (el) => { S.period = pFromKey(el.dataset.pk); go('txs', { filters: { kind: 'all', categoryId: el.dataset.cat } }); },
  yearShift: (el) => { S.year = (S.year || Number(today0().slice(0, 4))) + Number(el.dataset.dir); render(); },
  annualMonth: (el) => { const k = el.dataset.d; if (!k) return; const [y, m] = k.split('-').map(Number); S.period = E.monthPeriod(y, m); go('txs', { filters: { kind: 'spend' } }); },
  annualCat: (el) => { const y = S.year || Number(today0().slice(0, 4)); S.period = E.yearOf(`${y}-01-01`); go('txs', { filters: { kind: 'all', categoryId: el.dataset.cat } }); },
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
    if (k === 'commitPrice' || k === 'commitApprove' || k === 'commitMulti') { go('commitments'); return sheetCommit(ref.commitKey); } // 1.7.1
    if (k === 'periodCity') return go('ignore');
  },
  alertDismiss: async (el) => { E.dismissAlert(store(), el.dataset.id); await persist(null, { noStep: true }); render(); },
  alertSnooze: async (el) => { E.snoozeAlert(store(), el.dataset.id, Number(el.dataset.d) || 1); await persist(null, { noStep: true }); render(); toast('يرجع يذكرك بعد ' + (el.dataset.d === '7' ? 'أسبوع' : 'يوم')); },
  alertRestore: async (el) => { E.restoreAlert(store(), el.dataset.id); await persist(null, { noStep: true }); render(); },
});

/* ================= 1.6.0 ================= */
const CSS160 = `
.itrow{border:1px solid var(--line-2);border-radius:16px;padding:10px;margin-bottom:8px;background:#fff}
.itrow.err{border-color:var(--neg);box-shadow:0 0 0 2px var(--neg-soft)}
.itrow input[type=text],.itrow select{min-height:42px;padding:8px 10px;border-radius:12px}
.itn{display:flex;gap:6px;align-items:center}
.itn input{flex:1;min-width:0}
.itline{display:flex;gap:6px;align-items:flex-end;margin-top:6px}
.itline label{flex:1.15;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--ink-3);font-weight:600;text-align:center}
.itline label input[type=text]{text-align:center;padding:8px 2px;width:100%}
.itline label:first-child{flex:.7}
.itbtn{flex:none;width:42px;height:42px;border:0;border-radius:12px;background:var(--chip);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;padding:0;color:var(--ink-2)}
.itbtn svg.i{width:20px;height:20px}
.itsub{display:flex;gap:6px 10px;align-items:center;margin-top:6px;font-size:12px;color:var(--ink-3);flex-wrap:wrap}
.itsug{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-top:6px}
.itsug::-webkit-scrollbar{display:none}
.itsug:empty{display:none}
.itsug .chip{padding:6px 12px;font-size:13px}
.itx{margin-top:8px;padding-top:8px;border-top:1px dashed var(--line-2);display:flex;flex-direction:column;gap:8px}
.itplus{width:100%;border:1.5px dashed var(--line-2);background:none;border-radius:14px;padding:9px;font-weight:700;color:var(--pri);cursor:pointer;font-size:14.5px}
.star{position:relative;display:inline-block;width:22px;height:22px;vertical-align:middle;flex:none}
.star>span{position:absolute;top:0;right:0;height:100%;overflow:hidden}
.star>span svg{position:absolute;top:0;right:0;width:22px;height:22px}
.star .s0{width:100%;color:#C4C9D4}
.star .s1{color:#F0A91B}
.star.sm{width:15px;height:15px}.star.sm>span svg{width:15px;height:15px}
.starpick{display:flex;justify-content:center;gap:6px;margin:14px 0;direction:ltr}
.starpick button{border:0;background:none;padding:4px;cursor:pointer}
.starpick .star{width:42px;height:42px}.starpick .star>span svg{width:42px;height:42px}
.why{font-size:12px;color:var(--pri-ink);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.inv{font-size:12.5px;color:var(--ink-3);margin-top:2px;text-align:center}
#newbar .newbar{position:fixed;top:calc(10px + var(--safe-t));left:12px;right:12px;max-width:520px;margin:0 auto;z-index:70;background:var(--pri);color:#fff;border-radius:18px;padding:10px 12px 10px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 26px rgba(75,92,240,.35);cursor:pointer;font-weight:600;font-size:14.5px;animation:up .2s ease-out}
#newbar .newbar .x{margin-inline-start:auto;background:rgba(255,255,255,.2);border:0;border-radius:50%;width:30px;height:30px;color:#fff;font-size:17px;cursor:pointer;flex:none}
.flowbtns{position:sticky;bottom:calc(-22px - var(--safe-b));background:#fff;padding:10px 0 calc(12px + var(--safe-b));margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line);z-index:2}
.shopc{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.snopt{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer}
.snopt:last-child{border-bottom:0}
.snopt input{margin-top:4px}
.snopt .t{font-weight:700;font-size:14.5px}.snopt .s{font-size:12.5px;color:var(--ink-3)}
.restline{display:flex;align-items:center;gap:10px;padding:12px 0;border-top:1px solid var(--line);color:var(--ink-3);cursor:pointer}
.restline .m{flex:1}
`;
try { document.head.insertAdjacentHTML('beforeend', `<style id="css160">${CSS160}</style>`); } catch (e) { /* بيئة بدون DOM */ }

/* ---------- التقييم: نجمة وحدة تنعبّى حسب التقييم (4 = 80%) ---------- */
const STAR_P = 'M12 2.6l2.85 5.95 6.5.8-4.8 4.45 1.25 6.45L12 17.1l-5.8 3.15 1.25-6.45L2.65 9.35l6.5-.8z';
function starHtml(r, cls) {
  const v = Number(r) || 0, pct = Math.max(0, Math.min(100, Math.round(v * 20)));
  const svg = (f) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_P}" fill="${f ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
  return `<span class="star ${cls || ''}" role="img" aria-label="${v ? 'التقييم ' + E.round2(v) + ' من 5' : 'بدون تقييم'}"><span class="s0">${svg(false)}</span><span class="s1" style="width:${pct}%">${svg(true)}</span></span>`;
}
function pickRating(cur) {
  return new Promise(res => {
    S.rateResolve = res;
    $('sheet2').innerHTML = `<div class="sheet-bg" data-action="rateBg"><div class="sheet" role="dialog" aria-label="التقييم"><h3><button class="close" data-action="rateDone" data-v="">×</button><span class="sp" style="text-align:center;color:var(--ink-3);font-weight:500">قيّم الغرض</span><span style="width:34px"></span></h3>
      <div class="starpick">${[1, 2, 3, 4, 5].map(n => `<button data-action="rateDone" data-v="${n}" aria-label="${n} من 5">${starHtml(cur && cur >= n ? 5 : 0)}</button>`).join('')}</div>
      <div class="small muted" style="text-align:center">${cur ? `تقييمك الحالي ${cur} من 5` : 'اختياري: من 1 إلى 5'}</div>
      <div style="text-align:center;margin-top:14px"><button class="btn" data-action="rateDone" data-v="0">بدون تقييم</button></div></div></div>`;
  });
}
function finishRate(v) { $('sheet2').innerHTML = ''; const r = S.rateResolve; S.rateResolve = null; if (r) r(v); }

/* ---------- الأغراض داخل نافذة العملية ----------
   صف لكل غرض: الاسم، وتحته الكمية · السعر · المجموع · إيموجي التصنيف · نجمة التقييم. «⋯» للخصم والملاحظة والمجموعات وجزء السحب والحذف.
   الصفوف مسودة (S.items) لين تضغط «حفظ» أو «تم»، وتنحفظ دفعة وحدة. */
function itemRowFrom(i) {
  // 1.7.0: catAuto = «يتبع الفاتورة» (catFollow)، والغرض بدون تصنيف يتبعها
  const follow = !!i.catFollow || !i.productCategoryId;
  return { k: 'r' + (S.itemSeq = (S.itemSeq || 0) + 1), id: i.id, name: i.name, qty: String(i.qty), unitPrice: String(i.unitPrice), total: String(i.total), cat: follow ? null : i.productCategoryId, catAuto: follow, catWas: follow,
    rating: i.rating || null, discount: !!i.discount, note: i.note || '', partId: i.partId || null, groupIds: (i.groupIds || []).slice(), dirty: false, del: false, more: false };
}
function blankItemRow() { return { k: 'r' + (S.itemSeq = (S.itemSeq || 0) + 1), id: null, name: '', qty: '1', unitPrice: '', total: '', cat: null, catAuto: true, rating: null, discount: false, note: '', partId: null, groupIds: [], dirty: false, del: false, more: false }; }
function itemsState(t) {
  if (!S.items || S.items.txId !== t.id) S.items = { txId: t.id, rows: (t.items || []).map(itemRowFrom), open: false, err: null };
  return S.items;
}
// 1.7.0: الغرض اللي ما اخترت تصنيفه «يتبع الفاتورة» (أو جزء السحب اللي هو منه) ويتغير معها
const rowCat = (t, r) => r.catAuto ? E.invoiceCatOf(t, r.partId) : r.cat;
const itemRow = (k) => S.items ? S.items.rows.find(r => r.k === k) : null;
const itemsDirty = () => !!(S.items && S.items.rows.some(r => r.dirty || (r.del && r.id)));
function itemsLeft(t, exceptK) {
  const cap = E.itemCap(store(), t);
  return E.round2(cap - (S.items ? S.items.rows : []).filter(r => !r.del && r.k !== exceptK).reduce((s, r) => s + (E.parseNum(r.total) || 0), 0));
}
function itemsUnText(t) {
  const left = itemsLeft(t, null), cap = E.itemCap(store(), t);
  return left < -0.004 ? `<span class="warn-t">الأغراض أكبر من مبلغ العملية (${fmt(cap)}) بـ ${fmt(-left)}. عدّل غرض.</span>` : `غير مفصّل من الفاتورة: <b class="num">${fmt(left)}</b> من ${fmt(cap)}`;
}
function itemsBoxHtml(t) {
  if (!E.canHaveItems(t)) return '';
  const st = store(), I = itemsState(t), inFlow = S.flow && S.flow.ids[S.flow.i] === t.id;
  if (!I.rows.some(r => !r.del) && !I.open && !inFlow) return `<div class="txblock" id="itbox"><div class="linkline" data-action="itOpen">${ico('box')}<span>أضف أغراض الفاتورة (اختياري)</span><span class="sp"></span>${ico('plus')}</div></div>`;
  if (!I.rows.some(r => !r.del)) I.rows.push(blankItemRow());
  const parts = t.transactionType === 'CashWithdrawal' ? (t.cashParts || []) : [];
  const net = new Map(E.itemNet(st, t).map(o => [o.item.id, o]));
  return `<div class="txblock" id="itbox"><div class="small" style="margin-bottom:6px"><b>الأغراض</b> <span class="muted">تفصيل فقط، ما يغيّر مبلغ العملية</span></div>
    ${I.rows.filter(r => !r.del).map(r => itemRowHtml(t, r, net.get(r.id), parts)).join('')}
    <button type="button" class="itplus" data-action="itAdd" aria-label="غرض ثاني">+ غرض</button>
    <div class="small muted" id="itun" style="margin-top:6px">${itemsUnText(t)}</div></div>`;
}
function itemRowHtml(t, r, o, parts) {
  const cat = rowCat(t, r), u = catUi(cat), left = itemsLeft(t, r.k), v = (x) => esc(x == null ? '' : String(x));
  const tot = E.parseNum(r.total) || 0, info = [];
  if (left > 0.004 && Math.abs(left - tot) > 0.004) info.push(`<a data-action="itRest" data-k="${r.k}">كل الباقي (${fmt(left)})</a>`);
  if (r.discount) info.push('<span class="b g">خصم</span>');
  if (r.partId) { const p = parts.find(x => x.id === r.partId); if (p) info.push('من جزء ' + esc(bucketName(p.categoryId))); }
  if (r.groupIds.length) info.push(r.groupIds.map(g => { const G = store().get('groups', g); return G ? esc(G.name) : ''; }).filter(Boolean).join('، '));
  if (r.note) info.push(esc(r.note.slice(0, 30)));
  if (o && o.allocated) info.push(`مسترجع ${fmt(o.allocated)}`);
  if (o && o.estimated) info.push(`<span class="warn-t">توزيع تقديري −${fmt(o.estimated)}</span>`);
  return `<div class="itrow ${S.items.err === r.k ? 'err' : ''}" data-k="${r.k}">
    <div class="itn"><input type="text" data-itf="name" data-k="${r.k}" value="${v(r.name)}" placeholder="اسم الغرض (مثل: طماطم)" autocomplete="off" autocorrect="off"><button type="button" class="itbtn" data-action="itMore" data-k="${r.k}" aria-label="تفاصيل أكثر">⋯</button></div>
    <div class="itsug" id="itsug_${r.k}"></div>
    <div class="itline">
      <label><span>الكمية</span><input type="text" inputmode="decimal" data-itf="qty" data-k="${r.k}" value="${v(r.qty)}"></label>
      <label><span>السعر</span><input type="text" inputmode="decimal" data-itf="unitPrice" data-k="${r.k}" value="${v(r.unitPrice)}" placeholder="0"></label>
      <label><span>المجموع</span><input type="text" inputmode="decimal" data-itf="total" data-k="${r.k}" value="${v(r.total)}" placeholder="0"></label>
      <button type="button" class="itbtn" data-action="itCat" data-k="${r.k}" aria-label="تصنيف الغرض: ${esc(pcName(cat))}" style="color:${u.color};background:${tint(u.color)}">${glyph(u)}</button>
      <button type="button" class="itbtn" data-action="itStar" data-k="${r.k}" aria-label="التقييم">${starHtml(r.rating)}</button>
    </div>
    <div class="itsub"><span>${esc(pcName(cat))}${r.catAuto ? ' (مثل الفاتورة)' : ''}</span>${info.length ? ' · ' + info.join(' · ') : ''}</div>
    ${r.more ? `<div class="itx">
      <label style="display:flex;gap:8px;align-items:center;font-size:13.5px"><input type="checkbox" data-itf="discount" data-k="${r.k}" ${r.discount ? 'checked' : ''}> عليه خصم (علامة بس، ما تعتبر توفير)</label>
      <input type="text" data-itf="note" data-k="${r.k}" value="${v(r.note)}" placeholder="ملاحظة على الغرض">
      ${parts.length ? `<select data-itf="partId" data-k="${r.k}"><option value="">من الباقي (تحت تصنيف السحب)</option>${parts.map(p => `<option value="${p.id}" ${r.partId === p.id ? 'selected' : ''}>من جزء ${esc(bucketName(p.categoryId))} · ${fmt(p.amount)}</option>`).join('')}</select>` : ''}
      <div class="btns"><button type="button" class="btn" data-action="itGroups" data-k="${r.k}">المجموعات${r.groupIds.length ? ' (' + r.groupIds.length + ')' : ''}</button><button type="button" class="btn r" data-action="itDel" data-k="${r.k}">${ico('trash')} حذف الغرض</button></div></div>` : ''}
  </div>`;
}
function rerenderItems(focusK, field) {
  if (!S.items) return;
  const t = store().get('transactions', S.items.txId), box = $('itbox'); if (!t || !box) return;
  box.outerHTML = itemsBoxHtml(t);
  if (focusK) { const el = document.querySelector(`[data-itf="${field || 'name'}"][data-k="${focusK}"]`); if (el) el.focus(); }
}
function renderItSug(r) {
  const box = $('itsug_' + r.k); if (!box) return;
  const v = (r.name || '').trim(), list = v ? E.productSuggest(store(), v, 6) : [];
  box.innerHTML = list.map(p => `<button type="button" class="chip" data-action="itSug" data-k="${r.k}" data-p="${esc(p.id)}">${esc(p.name)}${p.lastUnitPrice != null ? ` · <span class="num">${fmt(p.lastUnitPrice)}</span>` : ''}</button>`).join('');
}
// المدخلات: الكمية × السعر = المجموع، أو المجموع ÷ الكمية = السعر
document.addEventListener('input', (ev) => {
  const el = ev.target; if (!el.dataset || !el.dataset.itf || !S.items) return;
  const r = itemRow(el.dataset.k); if (!r) return;
  const f = el.dataset.itf, row = el.closest('.itrow');
  r[f] = el.type === 'checkbox' ? el.checked : el.value; r.dirty = true;
  if (S.items.err === r.k) { S.items.err = null; if (row) row.classList.remove('err'); }
  const q = E.parseNum(r.qty), p = E.parseNum(r.unitPrice), tt = E.parseNum(r.total);
  const put = (k, val) => { r[k] = val; const x = row && row.querySelector(`[data-itf="${k}"]`); if (x && x !== el) x.value = val; };
  if ((f === 'qty' || f === 'unitPrice') && q > 0 && p > 0) put('total', String(E.round2(q * p)));
  else if (f === 'qty' && q > 0 && !(p > 0) && tt > 0) put('unitPrice', String(E.round2(tt / q)));
  else if (f === 'total' && q > 0 && tt > 0) put('unitPrice', String(E.round2(tt / q)));
  if (f === 'name') renderItSug(r);
  if (['qty', 'unitPrice', 'total'].includes(f)) { const t = store().get('transactions', S.items.txId), un = $('itun'); if (t && un) un.innerHTML = itemsUnText(t); }
});
// صفوف الحفظ: الجديدة والمعدلة والمحذوفة بس. الصف الجديد الفاضي ينترك
function itemRowsForSave(t) {
  const I = S.items; if (!I || I.txId !== t.id) return [];
  const out = [];
  I.rows.forEach(r => {
    if (r.del) { if (r.id) out.push({ _k: r.k, id: r.id, del: true }); return; }
    const empty = !String(r.name || '').trim() && !E.parseNum(r.total) && !E.parseNum(r.unitPrice);
    if ((!r.id && empty) || (r.id && !r.dirty)) return;
    out.push({ _k: r.k, id: r.id, name: r.name, qty: r.qty, unitPrice: r.unitPrice || null, total: r.total || null, productCategoryId: r.catAuto ? null : r.cat, catFollow: !!r.catAuto, rating: r.rating || null, discount: r.discount, note: r.note, partId: r.partId, groupIds: r.groupIds });
  });
  return out;
}
function saveItemDraft(t, dropBad) {
  let rows = itemRowsForSave(t); if (!rows.length) { S.items = null; return { n: 0, dropped: [] }; }
  const dropped = [];
  // «مراجعة لاحقًا»: الصف الناقص (أو اللي يتجاوز المبلغ) ينشال، والباقي ينحفظ
  for (let g = 0; dropBad && g < 60; g++) {
    const r = E.saveItems(store(), t.id, rows);
    if (!r.error) { S.items = null; return { n: r.changed || 0, dropped }; }
    let i = r.row != null ? r.row : r.id ? rows.findIndex(x => x.id === r.id) : -1;
    if (i < 0) for (let j = rows.length - 1; j >= 0; j--) if (!rows[j].del) { i = j; break; }
    if (i < 0) break;
    dropped.push(String(rows[i].name || '').trim() || 'غرض بدون اسم'); rows.splice(i, 1);
    if (!rows.length) { S.items = null; return { n: 0, dropped }; }
  }
  if (dropBad) { S.items = null; return { n: 0, dropped: rows.map(x => x.name) }; }
  const r = E.saveItems(store(), t.id, rows);
  if (r.error) {
    const row = r.row != null ? rows[r.row] : null; S.items.err = row ? row._k : null;
    const nm = row && String(row.name || '').trim() ? `«${String(row.name).trim()}»: ` : '';
    const msg = r.error === 'cap' ? `الأغراض أكبر من مبلغ العملية بـ ${fmt(r.over)} (المبلغ ${fmt(r.cap)})` : r.error === 'part_cap' ? `أغراض الجزء أكبر من قيمته بـ ${fmt(r.over)}` : r.error === 'refund_alloc' ? `«${r.name}» عليه استرداد محدد ${fmt(r.allocated)}، فما ينقص عنه` : nm + (ITEM_ERR[r.error] || 'ما انحفظ');
    return { error: msg };
  }
  S.items = null; return { n: r.changed || 0, dropped: [] };
}
// قبل ما تسكّر النافذة وفيها أغراض ما انحفظت
async function itemsLeaveOk() {
  if (!itemsDirty()) return true;
  const txId = S.items.txId;
  S.txDraft = { id: txId, note: $('s_note') ? $('s_note').value : '' };
  const v = await ask(`<h3>أغراض ما انحفظت<span class="sp"></span></h3><p class="small">عدلت أو أضفت أغراض وما ضغطت «حفظ».</p><div class="btns"><button class="btn p" data-action="answer" data-val="save">احفظها</button><button class="btn" data-action="answer" data-val="drop">لا تحفظها</button><button class="btn" data-action="answer" data-val="">رجوع</button></div>`);
  if (v === 'drop') return true;
  sheetTx(txId);
  if (v === 'save') await A.saveTx({ dataset: { id: txId } }, null, {});
  return false;
}

/* ---------- المحل: الاسم، الاختيار، الدمج ---------- */
function shopChoiceHtml(t) {
  if (!t.shopChoicePending) return '';
  const st = store(), shops = E.shopChoices(st, t), def = E.defaultShopFor(st, t.invoiceAlias);
  if (shops.length < 2) return '';
  return `<div class="banner w" style="display:block;margin-top:10px"><div><b>هذي الفاتورة «${esc(t.merchantRaw || '')}» تحتمل أكثر من محل.</b> أي محل؟ التصنيف يمشي على اختيارك.</div>
    <div class="shopc">${shops.map(m => `<button class="chip ${m.id === t.merchantId ? 'on' : ''}" data-action="shopPick" data-id="${t.id}" data-m="${m.id}">${esc(E.merchantName(m))}${m === def ? ' (الافتراضي)' : ''}</button>`).join('')}</div></div>`;
}
function shopChoiceCard(t) {
  const st = store(), m = merchantOf(t);
  return `<div class="rv"><div class="rvh"><b dir="auto">${esc(t.merchantRaw || '')}</b><span class="sp"></span><span class="num">${fmt(t.grossAmount)}</span></div>
    <div class="small muted">${fdate(t.transactionDate, true)}${t.time ? ' ' + ftime(t.time) : ''} · الحين على «${esc(E.merchantName(m))}»</div>
    <div class="shopc">${E.shopChoices(st, t).map(x => `<button class="chip ${x.id === t.merchantId ? 'on' : ''}" data-action="shopPick" data-id="${t.id}" data-m="${x.id}">${esc(E.merchantName(x))}${x.id === t.merchantId ? ' ✓' : ''}</button>`).join('')}<button class="chip" data-action="openTx" data-id="${t.id}">افتحها</button></div></div>`;
}
function sheetShopName(o) {
  const st = store(), t = o.txId ? st.get('transactions', o.txId) : null, m = t ? merchantOf(t) : st.get('merchants', o.merchantId);
  if (!m) return;
  S.shopCtx = { txId: t ? t.id : null, merchantId: m.id };
  const named = !!(m.userName && t), raw = t ? (t.merchantRaw || '') : m.name;
  const inv = t ? E.invoiceAliasOf(t) : null, owner = t && (t.merchantLocked || !(m.aliases || []).includes(inv)) ? (E.defaultShopFor(st, inv) || m) : m; // صاحب اسم الفاتورة
  const opt = (v, title, sub, on) => `<label class="snopt"><input type="radio" name="sn_mode" value="${v}" ${on ? 'checked' : ''} data-change="snMode"><div><div class="t">${title}</div><div class="s">${sub}</div></div></label>`;
  let h = `<h3>${m.userName ? 'تعديل اسم المحل' : 'سمّ المحل'}<span class="sp"></span><button class="close" data-action="shopNameClose">×</button></h3>
    ${raw ? `<div class="small muted">اسم الفاتورة: <b dir="auto">${esc(raw)}</b></div>` : ''}
    <label class="f">الاسم اللي يطلع لك</label><input type="text" id="sn_name" value="${esc(o.name != null ? o.name : (m.userName || ''))}" placeholder="${esc(E.merchantName(m))}" autocomplete="off" autocorrect="off">
    <div id="sn_sug">${shopSugHtml(o.name != null ? o.name : (m.userName || ''))}</div>`;
  if (named) h += `<label class="f">التعديل على</label><div>
      ${opt('this', 'هذه المرة فقط', `هذي العملية بس تصير باسم ثاني. الفاتورة تبقى على «${esc(E.merchantName(m))}».`, o.mode === 'this')}
      ${opt('all', 'لكل العمليات', 'اسم المحل يتغير في كل عملياته السابقة والجاية.', !o.mode || o.mode === 'all')}
      ${t.merchantRaw ? opt('another', 'اسم آخر لهذه الفاتورة', 'نفس اسم الفاتورة يجي من أكثر من محل. هذي العملية تروح للاسم الجديد، والقديمة تبقى على الأول، والجاية تسألك أي محل.', o.mode === 'another') : ''}</div>
    <div id="sn_another" class="${o.mode === 'another' ? '' : 'hide'}"><label class="f">تصنيف المحل الجديد</label>${catField(t.categoryId, t.subcategoryId)}
      <label class="f">المحل الافتراضي (للعمليات اللي ما تختار لها)</label><div class="seg"><button class="on" data-action="snDef" data-v="old">«${esc(E.merchantName(owner))}»</button><button data-action="snDef" data-v="new">الاسم الجديد</button></div><input type="hidden" id="sn_def" value="old"></div>`;
  else if (!m.userName) h += `<p class="small muted">الاسم يطلع على كل عمليات هذا المحل، السابقة والجاية، واسم الفاتورة يبقى بخط صغير تحته.</p>`;
  h += `<div class="btns" style="margin-top:14px"><button class="btn p" data-action="shopNameSave">حفظ</button>${m.userName && !t ? `<button class="btn" data-action="shopNameReset">رجّعه لاسم الفاتورة</button>` : ''}</div>`;
  openSheet(h); S.sheetKind = 'shop';
}
function shopSugHtml(typed) {
  const C = S.shopCtx || {}, st = store(), t = C.txId ? st.get('transactions', C.txId) : null, m = C.merchantId ? st.get('merchants', C.merchantId) : null;
  const r = E.shopNameIdeas(st, typed || '', { exceptId: m ? m.id : null, raw: t ? t.merchantRaw : (m ? m.name : '') });
  const chips = (list, lab) => list.length ? `<div class="small muted" style="margin-top:8px">${lab}</div><div class="chips" style="margin-top:4px">${list.map(x => `<button type="button" class="chip" data-action="snUse" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : '';
  return chips(r.existing.map(x => x.name), 'مسجلة عندك (اختيارها = نفس المحل):') + chips(r.ideas, 'اقتراحات:');
}
document.addEventListener('input', (ev) => { if (ev.target.id === 'sn_name' && $('sn_sug')) $('sn_sug').innerHTML = shopSugHtml(ev.target.value); });
function shopBack() {
  const C = S.shopCtx || {}; S.shopCtx = null;
  if (C.txId && store().get('transactions', C.txId)) return sheetTx(C.txId);
  if (C.merchantId && store().get('merchants', C.merchantId)) return sheetMerchant(C.merchantId);
  closeSheet();
}
async function shopMerge(keepId, dropId, name) {
  const st = store(), k = st.get('merchants', keepId), d = st.get('merchants', dropId); if (!k || !d) return null;
  let catFrom = 'keep';
  if (E.mergeCatConflict(k, d)) {
    const v = await ask(`<h3>أي تصنيف يبقى؟<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><p class="small">المحلين مصنفين بشكل مختلف، والمدموج له تصنيف واحد (عملياتك اللي صنفتها يدويًا ما تتغير).</p><div class="list">
      <div class="it" data-action="answer" data-val="keep">${icCircle(catUi(k.subcategoryId || k.categoryId), 's')}<div class="m"><div class="t">${esc(catPath(k.categoryId, k.subcategoryId))}</div><div class="s">تصنيف «${esc(E.merchantName(k))}»</div></div></div>
      <div class="it" data-action="answer" data-val="drop">${icCircle(catUi(d.subcategoryId || d.categoryId), 's')}<div class="m"><div class="t">${esc(catPath(d.categoryId, d.subcategoryId))}</div><div class="s">تصنيف «${esc(E.merchantName(d))}»</div></div></div></div>`);
    if (!v) return null;
    catFrom = v;
  }
  const r = E.mergeMerchants(st, keepId, dropId, name !== undefined ? { catFrom, name } : { catFrom });
  await persist('دمج محلين');
  return r;
}

/* ---------- العمليات الجديدة: وحدة ورا الثانية ---------- */
function flowPgText() { const F = S.flow; return F ? (F.ids.length === 1 ? 'عملية جديدة' : `عملية جديدة ${F.i + 1} من ${F.ids.length}`) : ''; }
function flowCardsHtml(t) {
  const st = store(), F = S.flow; if (!F || !F.cards || !F.cards.length) return '';
  return F.cards.map(id => st.get('instruments', id)).filter(i => i && i.instrumentOwner === 'unknown' && (t.instrumentId === i.id || F.i === 0)).map(i => `<div class="banner w" style="display:block;margin-bottom:10px"><div><b>بطاقة جديدة «${esc(i.label)}»</b>: لمن؟ عملياتها داخلة في صرفك لين تحدد.</div><div class="btns" style="margin-top:8px"><button class="btn p" data-action="cardOwner" data-id="${i.id}" data-v="me">لي</button><button class="btn" data-action="cardOwner" data-id="${i.id}" data-v="other">لشخص ثاني (ما تنحسب)</button></div></div>`).join('');
}
const txOrder = (a, b) => ((a.transactionDate || '') + (a.time || '')).localeCompare((b.transactionDate || '') + (b.time || ''));
function startFlow(ids, opts) {
  const st = store();
  const list = Array.from(new Set(ids)).map(id => st.get('transactions', id)).filter(Boolean).sort(txOrder).map(t => t.id);
  if (!list.length) return false;
  if (S.flow) { const F = S.flow; list.forEach(id => { if (!F.ids.includes(id)) F.ids.push(id); }); if (opts && opts.cards) F.cards = Array.from(new Set((F.cards || []).concat(opts.cards))); const pg = $('flowpg'); if (pg) pg.textContent = flowPgText(); if (!$('sheet').innerHTML) { while (F.i < F.ids.length && !st.get('transactions', F.ids[F.i])) F.i++; if (F.i >= F.ids.length) { S.flow = null; return startFlow(list, opts); } sheetTx(F.ids[F.i]); } return true; }
  if (S.pickResolve) finishPick(null); if (S.rateResolve) finishRate(null); if (S.groupResolve) finishGroups(null); if (S.cityResolve) finishCity(null);
  if (S.sheetResolve) closeSheet(null);
  S.flow = { ids: list, i: 0, cards: (opts && opts.cards) || [], summary: (opts && opts.summary) || null };
  S.newList = null; S.items = null;
  sheetTx(list[0]); return true;
}
function flowAdvance() {
  const F = S.flow; if (!F) return closeSheet();
  S.items = null; F.i++;
  while (F.i < F.ids.length && !store().get('transactions', F.ids[F.i])) F.i++;
  if (F.i >= F.ids.length) return flowEnd();
  sheetTx(F.ids[F.i]); const sh = document.querySelector('#sheet .sheet'); if (sh) sh.scrollTop = 0;
}
function flowEnd(allLater) {
  const F = S.flow; S.flow = null; S.items = null; closeSheet(); render();
  const st = store(), left = E.unreviewedTxs(st).length, nRv = openReviews().length, s = (F && F.summary) || {};
  const bits = [];
  if (allLater || left) bits.push(left ? `${left === 1 ? 'عملية وحدة' : cnt(left, 'op')} تلقاها في «المراجعة» تحت «عمليات ما راجعتها»` : '');
  if (s.merged) bits.push(`${s.merged} اندمجت مع عمليات موجودة`);
  if (nRv) bits.push(`${nRv === 1 ? 'رسالة وحدة تحتاج' : cnt(nRv, 'msg') + ' تحتاج'} قرارك في «المراجعة»`);
  const msg = bits.filter(Boolean).join('، ');
  toast(msg || 'تمام، راجعت الجديدة كلها', msg ? 6000 : 2500);
}
// وصلت عمليات جديدة من الرسائل: تطلع قدامك، وإذا أنت في نص شي شريط صغير تضغطه
function onNewSms(plan, manual) {
  const st = store();
  const ids = plan.msgRecords.filter(r => r.status === 'tx' && r.txId).map(r => st.get('transactions', r.txId)).filter(t => t && t.needsReview).map(t => t.id);
  const cards = Array.from(plan.newInstruments.values()).map(i => st.get('instruments', i.id)).filter(i => i && i.instrumentOwner === 'unknown').map(i => i.id);
  if (!ids.length) return showNewTxs(plan, manual);
  if (S.flow) return startFlow(ids, { cards });
  const ae = document.activeElement, typing = ae && $('main').contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
  const busy = !!($('sheet').innerHTML || $('sheet2').innerHTML || typing);
  if (busy && !manual) { showNewBar(ids, cards); return true; }
  return startFlow(ids, { cards, summary: plan.smsSummary });
}
function showNewBar(ids, cards) {
  S.newBar = { ids: Array.from(new Set(((S.newBar && S.newBar.ids) || []).concat(ids))), cards: Array.from(new Set(((S.newBar && S.newBar.cards) || []).concat(cards || []))) };
  let el = $('newbar'); if (!el) { document.body.insertAdjacentHTML('beforeend', '<div id="newbar"></div>'); el = $('newbar'); }
  const n = S.newBar.ids.length;
  el.innerHTML = `<div class="newbar" data-action="newBarOpen" role="button">${ico('msg')}<span>${n === 1 ? 'وصلت عملية جديدة' : `وصلت ${n} عمليات جديدة`}</span><button class="x" data-action="newBarX" aria-label="إخفاء">×</button></div>`;
}
function hideNewBar() { S.newBar = null; const el = $('newbar'); if (el) el.innerHTML = ''; }
async function flowSave(el, later) {
  const ok = await A.saveTx(el, null, later ? { later: true, skipBadItems: true } : { flow: true });
  return ok !== false;
}

/* ---------- الفترات (1.7.0، كانت «فترات التجاهل») ---------- */
function periodParts(p) {
  const st = store(), out = [];
  if (p.cityId) out.push(`<span class="b city">📍 ${esc(cityName(p.cityId))}${p.cityMode === 'all' ? ' · كل العمليات' : ' · اللي بدون مدينة'}</span>`);
  if (p.groupId) { const g = st.get('groups', p.groupId); if (g) out.push(`<span class="b grp">🏷️ ${esc(g.name)}</span>`); }
  const ig = [p.city ? 'المدينة' : '', p.category ? 'التصنيف' : ''].filter(Boolean).join(' و');
  if (ig) out.push(`<span class="b n">تجاهل ${ig}</span>`);
  return out.join('');
}
function vIgnore() {
  const st = store(), list = settings().ignorePeriods || [];
  let h = `<div class="card"><h2>الفترات <span class="sp"></span><button class="btn p" data-action="ignEdit">+ فترة</button></h2>
    <p class="small muted">من تاريخ لتاريخ، وتختار وش يصير فيها: <b>مدينة</b> (مثل سفرة) للمشتريات والسحب والمصروف النقدي، و/أو <b>مجموعة</b> لكل صرفها، و/أو <b>تجاهل</b> علامات «بدون مدينة» و«بدون تصنيف». اللي يوصل بعدين داخل الفترة ياخذها تلقائيًا، وحذف الفترة يرجّع اللي جا منها بس.</p>
    ${list.length ? `<div class="list">${list.map(p => { const cf = p.cityId ? E.periodConflicts(st, p) : [];
      return `<div class="it" data-action="ignEdit" data-id="${p.id}"><div class="m"><div class="t"><span class="num">${fdate(p.from, true)}</span> ← <span class="num">${fdate(p.to, true)}</span></div><div class="badges">${periodParts(p)}</div>${p.note ? `<div class="s">${esc(p.note)}</div>` : ''}
        ${cf.length ? `<div class="small warn-t" style="margin-top:4px">${cnt(cf.length, 'op')} موقعها مختلف (الجوال سجّل مدينة ثانية): <a data-action="perConflicts" data-id="${p.id}">طبّق مدينة الفترة عليها كلها</a> · <a ${drillAttr(cf.map(t => t.id), 'موقعها مختلف عن ' + cityName(p.cityId))}>راجعها وحدة وحدة</a></div>` : ''}</div>${ico('chevL', 'chev')}</div>`; }).join('')}</div>` : '<div class="muted">ما فيه فترات.</div>'}</div>`;
  return h;
}
function sheetIgnore(id) {
  const st = store(), cur = id ? (settings().ignorePeriods || []).find(x => x.id === id) : null;
  if (id && !cur) return;
  const p = S.igDraft && S.igDraft.id === (id || null) ? S.igDraft : (S.igDraft = Object.assign({ id: id || null, from: '', to: E.todayISO(), cityId: null, groupId: null, city: false, category: false, note: '' }, cur ? JSON.parse(JSON.stringify(cur)) : {}, { id: id || null }));
  const groups = st.all('groups').filter(g => g.active !== false);
  openSheet(`<h3>${id ? 'تعديل الفترة' : 'فترة جديدة'}<span class="sp"></span><button class="close" data-action="igClose">×</button></h3>
    <div class="grid2"><div><label class="f">من</label><input type="date" id="ig_from" value="${esc(p.from)}"></div><div><label class="f">إلى</label><input type="date" id="ig_to" value="${esc(p.to)}"></div></div>
    <div class="fxsec"><div class="fxh">المدينة</div><div class="btns"><button type="button" class="btn" data-action="igCity">📍 ${p.cityId ? esc(cityName(p.cityId)) : 'اختر مدينة'}</button>${p.cityId ? `<button type="button" class="btn" data-action="igCityClear" aria-label="بدون مدينة">×</button>` : ''}</div>
      <p class="small muted" style="margin:6px 0 0">للمشتريات والسحب والمصروف النقدي بس (مو الأونلاين ولا التحويلات لأشخاص ولا الرسوم). اللي موقع جوالك سجّل لها مدينة ثانية ما تتغير.</p></div>
    <div class="fxsec"><div class="fxh">المجموعة</div><select id="ig_grp"><option value="">بدون</option>${groups.map(g => `<option value="${g.id}" ${g.id === p.groupId ? 'selected' : ''}>${esc(((g.emoji || '') + ' ' + g.name).trim())}</option>`).join('')}</select>
      <p class="small muted" style="margin:6px 0 0">كل صرفها يدخل المجموعة (مشتريات، سحب، نقدي، تحويلات لأشخاص، رسوم)، مو الدخل ولا التحويل بين حساباتك ولا سداد البطاقات. العملية اللي تشيل منها المجموعة بيدك ما ترجع لها.${groups.length ? '' : ' <a data-action="go" data-view="groups">أضف مجموعة</a>'}</p></div>
    <div class="fxsec"><div class="fxh">التجاهل</div>
      <label class="f" style="font-weight:500"><input type="checkbox" id="ig_city" ${p.city ? 'checked' : ''}> علامة «بدون مدينة»</label>
      <label class="f" style="font-weight:500"><input type="checkbox" id="ig_cat" ${p.category ? 'checked' : ''}> علامات التصنيف («بدون تصنيف» و«نوعها غير معروف» و«تحويلات لأشخاص ما صنفتها»)</label>
      <p class="small muted" style="margin:4px 0 0">داخل الفترة تختفي هالعلامات وما تنحسب في «يحتاج منك». الأرقام ما تتغير.</p></div>
    <label class="f">ملاحظة (اختياري)</label><input type="text" id="ig_note" value="${esc(p.note || '')}" placeholder="مثل: سفرة جدة">
    <div class="btns" style="margin-top:14px"><button class="btn p" data-action="ignSave" data-id="${id || ''}">حفظ</button>${id ? `<button class="btn r" data-action="ignDel" data-id="${id}">${ico('trash')} حذف</button>` : ''}</div>`);
}
function igSync() {
  const p = S.igDraft; if (!p || !$('ig_from')) return p;
  Object.assign(p, { from: $('ig_from').value, to: $('ig_to').value, groupId: $('ig_grp').value || null, city: $('ig_city').checked, category: $('ig_cat').checked, note: $('ig_note').value });
  return p;
}

/* ---------- مكان تصنيفاتك القديمة (بعد التحديث) ---------- */
function sheetPlaceCats() {
  const st = store(), ids = (settings().placeCategories || []).filter(id => st.get('categories', id));
  if (!ids.length) return false;
  const mains = st.all('categories').filter(c => !c.parentId && c.active !== false).sort((a, b) => a.order - b.order);
  openSheet(`<h3>مكان تصنيفاتك<span class="sp"></span><button class="close" data-action="placeLater">×</button></h3>
    <p class="small">تصنيفات المنتجات صارت نفس قائمة التصنيفات. هذي تصنيفات أضفتها أنت، وحطيتها مؤقتًا تحت «${esc(E.catName(st, 'other'))}». اختر تحت أي تصنيف رئيسي تكون، وأغراضها تنتقل معها.</p>
    ${ids.map(id => { const c = st.get('categories', id); return `<label class="f">${c.emoji ? esc(c.emoji) + ' ' : ''}${esc(c.name)}</label><select class="pl_sel" data-id="${id}">${mains.map(m => `<option value="${m.id}" ${m.id === c.parentId ? 'selected' : ''}>تحت «${esc(m.name)}»</option>`).join('')}</select>`; }).join('')}
    <div class="btns" style="margin-top:14px"><button class="btn p" data-action="placeSave">حفظ</button><button class="btn" data-action="placeLater">بعدين</button></div>`);
  return true;
}

/* ---------- المنتجات (1.6.0): الأغراض + «غير مفصّل» لكل تصنيف ---------- */
function vProducts160() {
  const st = store(), p = S.period, ps = E.productSpend(st, p);
  let h = periodBox(p, ps.total, { nav: true });
  h += `<p class="small muted" style="text-align:center">الأغراض المفصّلة على تصنيفها، والباقي من كل فاتورة «غير مفصّل» على تصنيف الفاتورة. المجموع = صرف العمليات اللي تقبل أغراض (بدون الرسوم المفصولة)، والتوزيع ممكن يختلف عن «صرفياتك». <a data-action="go" data-view="methods">طريقة الحساب</a>${ps.estimated ? ' · فيه <b>توزيع تقديري</b> لاستردادات ما تحددت أغراضها.' : ''}</p>`;
  if (!ps.rows.length) return h + `<div class="card empty">${icCircle({ color: PAL.yellow, icon: 'box' })}<p>ما فيه صرف في هذي الفترة. افتح أي عملية شراء وأضف أغراضها: الغرض ما يغيّر مبلغ العملية، والباقي يظهر «غير مفصّل».</p></div>`;
  const mx = ps.categories.length ? ps.categories[0].amount : 1;
  h += `<div class="card"><h2>حسب التصنيف</h2><div class="list">${ps.categories.map(c => { const u = catUi(c.productCategoryId === '__none' ? '__none' : c.productCategoryId);
    return `<div class="it" data-action="itemsDrill" data-pc="${esc(c.productCategoryId)}">${icCircle(u, 's')}<div class="m"><div class="t">${esc(bucketName(c.productCategoryId))}</div>${bar(c.amount, mx, u.color)}<div class="s">${c.count ? `${c.count} غرض ${fmt(c.items)}` : 'بدون أغراض'}${c.rest > 0.004 ? ` · غير مفصّل ${fmt(c.rest)}` : ''}</div></div>${money(c.amount)}</div>`; }).join('')}</div></div>`;
  h += `<div class="card"><h2>أعلى المنتجات</h2>${ps.products.length ? `<div class="list">${ps.products.slice(0, 10).map(x => productRowHtml(x)).join('')}</div>` : '<div class="muted small">ما فيه أغراض مفصّلة في هذي الفترة.</div>'}
    <div class="linkrow" data-action="itemsDrill" data-only="1">${ico('list')}<span>كل الأغراض في الفترة</span><span class="sp"></span>${ico('chevL', 'chev')}</div>
    <div class="linkrow" data-action="go" data-view="categories">${ico('grid')}<span>التصنيفات (نفس القائمة للفواتير والأغراض)</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
  return h;
}
function productRowHtml(x) {
  const pr = x.productId ? store().get('products', x.productId) : null;
  return `<div class="it" data-action="itemsDrill" data-prod="${esc(x.productId || '')}"><div class="m"><div class="t">${esc(x.name)}</div><div class="s">الكمية ${fmt(x.qty).replace(/\.00$/, '')} · ${x.count} مرة${pr && pr.avgRating ? ` · ${starHtml(pr.avgRating, 'sm')} <span class="num">${E.round2(pr.avgRating)}</span>` : ''}</div></div>${money(x.amount)}</div>`;
}
function itemLineHtml(r) {
  const st = store(), it = r.item, pr = it.productId ? st.get('products', it.productId) : null; void pr;
  return `<div class="it" data-action="openTx" data-id="${r.tx.id}">${icCircle(catUi(E.itemCatId(r.tx, it) || '__none'), 's')}<div class="m"><div class="t">${esc(it.name)}${it.rating ? ' ' + starHtml(it.rating, 'sm') : ''}</div><div class="s">${esc(txTitle(r.tx))} · ${fdate(r.date, true)} · <span class="num">${fmt(it.qty).replace(/\.00$/, '')} × ${fmt(it.unitPrice)}</span>${r.allocated ? ` · مسترجع ${fmt(r.allocated)}` : ''}${r.estimated ? ` · <span class="warn-t">تقديري −${fmt(r.estimated)}</span>` : ''}</div></div><span class="num">${fmt(r.net)}</span></div>`;
}
function vItems160() {
  const st = store(), f = S.itemsF || {}, per = f.allTime ? null : (f.period || S.period);
  const perL = f.allTime ? 'كل الوقت' : fperiod(per), catId = f.productCategoryId;
  const drillPk = per ? ` data-pk="${esc(per.start + '|' + per.end)}"` : '';
  if (f.productId) {
    const p = st.get('products', f.productId), rows = E.itemRows(st, per, { productId: f.productId });
    const tot = E.round2(rows.reduce((s, r) => s + r.net, 0));
    let h = `<div class="card"><h2>${esc(p ? p.name : 'منتج')}</h2><div class="muted small">${perL} · ${rows.length} مرة · صافيها ${fmt(tot)}</div>`;
    if (p) h += `<div style="display:flex;gap:18px;margin-top:10px;flex-wrap:wrap"><div><div class="small muted">متوسط تقييمه</div><div style="display:flex;align-items:center;gap:6px;font-weight:700">${p.avgRating ? `${starHtml(p.avgRating)} <span class="num">${E.round2(p.avgRating)}</span> <span class="small muted">(${p.ratingCount} تقييم)</span>` : '<span class="muted small">ما قيّمته</span>'}</div></div>
      <div><div class="small muted">آخر تقييم</div><div style="display:flex;align-items:center;gap:6px;font-weight:700">${p.lastRating ? `${starHtml(p.lastRating)} <span class="num">${p.lastRating}</span>` : '<span class="muted small">—</span>'}</div></div>
      ${p.lastUnitPrice != null ? `<div><div class="small muted">آخر سعر</div><div class="num" style="font-weight:700">${fmt(p.lastUnitPrice)}</div></div>` : ''}</div>`;
    h += `</div>`;
    return h + (rows.length ? `<div class="card"><div class="list">${rows.map(itemLineHtml).join('')}</div></div>` : `<div class="card empty">لا يوجد في هذي الفترة.</div>`);
  }
  if (f.restOnly) {
    const rows = E.itemRows(st, per, { productCategoryId: catId, restOnly: true, groupId: f.groupId }).filter(r => r.net > 0.004);
    const tot = E.round2(rows.reduce((s, r) => s + r.net, 0));
    let h = `<div class="card"><h2>غير مفصّل${catId !== undefined ? ' · ' + esc(pcName(catId)) : ''}</h2><div class="muted small">${perL} · ${cnt(rows.length, 'op')} · ${fmt(tot)}</div><p class="small muted">الجزء من كل فاتورة اللي ما فصّلت أغراضه. افتح الفاتورة وأضف أغراضها.</p></div>`;
    return h + (rows.length ? `<div class="card"><div class="list">${rows.map(r => `<div class="it" data-action="openTx" data-id="${r.tx.id}">${icCircle(txUi(r.tx), 's')}<div class="m"><div class="t">${esc(txTitle(r.tx))}</div><div class="s">${fdate(r.date, true)} · الفاتورة ${fmt(r.tx.grossAmount)}${r.estimated ? ` · <span class="warn-t">تقديري −${fmt(r.estimated)}</span>` : ''}</div></div><span class="num">${fmt(r.net)}</span></div>`).join('')}</div></div>` : `<div class="card empty">لا يوجد.</div>`);
  }
  if (catId !== undefined && !f.itemsOnly) {
    const ps = E.productSpend(st, per, { productCategoryId: catId, groupId: f.groupId }), c = catId && catId !== '__none' ? st.get('categories', catId) : null;
    const items = ps.rows.filter(r => r.kind === 'item'), restN = new Set(ps.rows.filter(r => r.kind === 'rest' && r.net > 0.004).map(r => r.tx.id)).size;
    let h = `<div class="card"><h2>${icCircle(catUi(catId || '__none'), 's')} ${esc(pcName(catId))}</h2><div class="muted small">${perL}</div><div class="bigv" style="margin-top:6px">${money(ps.total)}</div>
      <div class="small muted">أغراض مصنفة فيه: <b class="num">${fmt(ps.itemsTotal)}</b> (${items.length})</div>
      ${ps.restTotal > 0.004 ? `<div class="restline" data-action="itemsDrill" data-pc="${esc(catId)}" data-rest="1"${drillPk}><div class="m">غير مفصّل من ${cnt(restN, 'op')}</div><span class="num">${fmt(ps.restTotal)}</span>${ico('chevL')}</div>` : ''}</div>`;
    if (c && !c.parentId) {
      const subs = st.all('categories').filter(x => x.parentId === c.id).map(x => ps.bySub.get(x.id)).filter(x => x && x.amount > 0.004).sort((a, b) => b.amount - a.amount);
      if (subs.length) h += `<div class="card"><h2>الفرعية</h2><div class="list">${subs.map(x => `<div class="it" data-action="itemsDrill" data-pc="${esc(x.productCategoryId)}"${drillPk}>${icCircle(catUi(x.productCategoryId), 's')}<div class="m"><div class="t">${esc(E.catName(st, x.productCategoryId))}</div><div class="s">${x.count ? x.count + ' غرض' : ''}${x.rest > 0.004 ? `${x.count ? ' · ' : ''}غير مفصّل ${fmt(x.rest)}` : ''}</div></div>${money(x.amount)}</div>`).join('')}</div></div>`;
    }
    if (ps.products.length) h += `<div class="card"><h2>المنتجات</h2><div class="list">${ps.products.map(productRowHtml).join('')}</div></div>`;
    if (items.length) h += `<div class="card"><h2>الأغراض</h2><div class="list">${items.map(itemLineHtml).join('')}</div></div>`;
    return h;
  }
  const rows = E.itemRows(st, per, { itemsOnly: true, groupId: f.groupId, productCategoryId: catId });
  const tot = E.round2(rows.reduce((s, r) => s + r.net, 0));
  const lab = ['الأغراض'];
  if (catId !== undefined) lab.push(pcName(catId));
  if (f.groupId) { const g = st.get('groups', f.groupId); lab.push('المجموعة: ' + (g ? g.name : '')); }
  let h = `<div class="card"><h2>${esc(lab.join(' · '))}</h2><div class="muted small">${perL} · ${rows.length} غرض · صافيها ${fmt(tot)}</div></div>`;
  return h + (rows.length ? `<div class="card"><div class="list">${rows.map(itemLineHtml).join('')}</div></div>` : `<div class="card empty">لا يوجد.</div>`);
}
function limBasisNote(prod) {
  return prod ? 'المصروف = الأغراض المصنفة في هذا التصنيف + «غير مفصّل» من فواتيره (مثل تحليل المنتجات). يقبل رئيسي أو فرعي.' : 'المصروف = نفس رقم «صرفياتك» لهذا التصنيف (على التصنيف الرئيسي).';
}
const reviewCount = () => groupedReviews().length + pendingFormats().length + E.unreviewedTxs(store()).length + E.shopChoiceTxs(store()).length;
// «متجاهلة» تطلع بس لما تفلتر على نفس الشي
function ignoredFilterOn(kind) {
  if (S.view !== 'txs') return false;
  const f = S.filters || {};
  return kind === 'city' ? !!f.noCity : ['uncategorized', 'temporary', 'unclassified_out', 'unclassified_in', 'unclassified_all'].includes(f.kind) || (f.types || []).includes('Unknown');
}

Object.assign(TITLES, { ignore: 'الفترات' });
Object.assign(NAV_OF, { ignore: 'more' });
Object.assign(V150, { ignore: vIgnore });

Object.assign(A, {
  // الأغراض
  itOpen: () => { if (!S.items) return; S.items.open = true; const r = blankItemRow(); S.items.rows.push(r); rerenderItems(r.k); },
  itAdd: () => { if (!S.items) return; const r = blankItemRow(); S.items.rows.push(r); rerenderItems(r.k); },
  itMore: (el) => { const r = itemRow(el.dataset.k); if (!r) return; r.more = !r.more; rerenderItems(); },
  itRest: (el) => {
    const r = itemRow(el.dataset.k), t = S.items && store().get('transactions', S.items.txId); if (!r || !t) return;
    const left = itemsLeft(t, r.k); if (!(left > 0.004)) return;
    const q = E.parseNum(r.qty) || 1; r.qty = String(q); r.total = String(left); r.unitPrice = String(E.round2(left / q)); r.dirty = true;
    rerenderItems();
  },
  itCat: async (el) => {
    const k = el.dataset.k, r = itemRow(k), t = S.items && store().get('transactions', S.items.txId); if (!r || !t) return;
    const cur = rowCat(t, r), pair = cur ? E.itemCatPair(store(), cur) : { cat: null, sub: null }, inv = E.invoiceCatOf(t, r.partId);
    const res = await pickCategory({ cat: pair.cat === '__none' ? null : pair.cat, sub: pair.sub }, { follow: { on: !!r.catAuto, label: inv ? pcName(inv) : 'بدون تصنيف' } });
    const r2 = itemRow(k); if (!res || !r2) return;
    if (res.follow || !(res.sub || res.cat)) { r2.cat = null; r2.catAuto = true; } else { r2.cat = res.sub || res.cat; r2.catAuto = false; }
    r2.dirty = true; rerenderItems();
  },
  itStar: async (el) => {
    const k = el.dataset.k, r = itemRow(k); if (!r) return;
    const v = await pickRating(r.rating); const r2 = itemRow(k); if (v === null || v === undefined || v === '' || !r2) return;
    r2.rating = Number(v) || null; r2.dirty = true; rerenderItems();
  },
  rateDone: (el) => finishRate(el.dataset.v === '' ? null : el.dataset.v),
  rateBg: (el, ev) => { if (ev.target === el) finishRate(null); },
  itSug: (el) => {
    const r = itemRow(el.dataset.k), p = store().get('products', el.dataset.p); if (!r || !p) return;
    // الاقتراح يعبّي كل شي من آخر مرة (التصنيف، السعر، المجموع، التقييم) ما عدا الكمية. وكلها تنعدل
    r.name = p.name;
    const cat = p.lastCategoryId || p.productCategoryId; if (cat && store().get('categories', cat)) { r.cat = cat; r.catAuto = false; }
    if (p.lastUnitPrice != null) { const q = E.parseNum(r.qty) || 1; r.qty = String(q); r.unitPrice = String(p.lastUnitPrice); r.total = String(E.round2(q * p.lastUnitPrice)); }
    r.rating = p.lastRating || null; r.dirty = true;
    rerenderItems(r.k, 'qty');
  },
  itDel: (el) => {
    const r = itemRow(el.dataset.k); if (!r) return;
    if (r.id) r.del = true; else S.items.rows = S.items.rows.filter(x => x.k !== r.k);
    rerenderItems(); if (r.id) toast('ينحذف لما تضغط «حفظ»');
  },
  itGroups: async (el) => {
    const k = el.dataset.k, r = itemRow(k); if (!r) return;
    const ids = await pickGroups(r.groupIds); const r2 = itemRow(k); if (!ids || !r2) return;
    r2.groupIds = ids; r2.dirty = true; rerenderItems();
  },
  // المحل
  shopName: (el) => sheetShopName({ txId: el.dataset.id }),
  shopNameM: (el) => sheetShopName({ merchantId: el.dataset.id }),
  shopNameClose: () => shopBack(),
  snMode: () => { const m = document.querySelector('input[name=sn_mode]:checked'); if ($('sn_another')) $('sn_another').classList.toggle('hide', !m || m.value !== 'another'); },
  snDef: (el) => { $('sn_def').value = el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); },
  snUse: (el) => { $('sn_name').value = el.dataset.v; $('sn_sug').innerHTML = shopSugHtml(el.dataset.v); },
  shopNameReset: async () => {
    const C = S.shopCtx; if (!C || !C.merchantId) return;
    const r = E.setShopName(store(), C.merchantId, ''); if (r.error === 'exact') return toast(`فيه محل ثاني اسمه «${E.merchantName(r.other)}». خله باسمك، أو ادمجهم من صفحة المحل`, 6000);
    await persist('اسم المحل'); render(); shopBack(); toast('رجع لاسم الفاتورة');
  },
  shopNameSave: async () => {
    const C = S.shopCtx; if (!C) return;
    const st = store(), name = $('sn_name').value.trim(), me = document.querySelector('input[name=sn_mode]:checked'), mode = me ? me.value : 'all';
    const t = C.txId ? st.get('transactions', C.txId) : null, m = st.get('merchants', C.merchantId); if (!m) return;
    const reopen = () => sheetShopName({ txId: C.txId, merchantId: C.merchantId, name, mode });
    if (!name) return toast('اكتب الاسم');
    if (mode === 'this' && t) {
      const r = E.txShopOnce(st, t.id, name);
      if (r.error === 'same') return toast('هذا نفس محلها الحالي');
      if (r.error) return toast('ما انحفظ');
      await persist('اسم المحل لهذه العملية'); render(); shopBack(); return toast('انحفظ لهذي العملية بس');
    }
    if (mode === 'another' && t) {
      const ex = E.checkShopName(st, name, null).exact;
      if (ex && ex.id === m.id) return toast('هذا نفس المحل الحالي. اكتب اسم المحل الثاني');
      const r = E.addShopForInvoice(st, t.id, { name, categoryId: $('s_cat') ? ($('s_cat').value || null) : undefined, subcategoryId: $('s_sub') ? ($('s_sub').value || null) : undefined, defaultNew: $('sn_def') && $('sn_def').value === 'new' });
      if (r.error) return toast(r.error === 'no_invoice' ? 'هذي العملية ما لها اسم فاتورة' : 'ما انحفظ');
      await persist('اسم آخر لهذه الفاتورة'); render(); shopBack();
      return toast(`صارت الفاتورة لـ ${r.shops.length} محلات. كل رسالة جديدة تسألك أي محل`, 5000);
    }
    // لكل العمليات (أو أول تسمية)
    const chk = E.checkShopName(st, name, m.id);
    if (chk.exact) {
      const v = await ask(`<h3>فيه محل بنفس الاسم<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><p class="small">«${esc(E.merchantName(chk.exact))}» مسجل عندك. ما يصير محلين بنفس الاسم: تدمجهم (يصيرون محل واحد بتصنيف واحد ومجموع واحد) أو تغيّر الاسم.</p><div class="btns"><button class="btn p" data-action="answer" data-val="merge">ادمجهم</button><button class="btn" data-action="answer" data-val="">غيّر الاسم</button></div>`);
      if (v !== 'merge') return reopen();
      const r = await shopMerge(chk.exact.id, m.id, name); if (!r) return reopen();
      S.shopCtx = { txId: C.txId, merchantId: r.merchant.id }; render(); shopBack(); return toast('اندمجوا في محل واحد');
    }
    if (chk.similar.length) {
      const v = await ask(`<h3>فيه اسم قريب<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><p class="small">نفس المحل؟ إذا نعم ادمجهم (محل واحد بتصنيف واحد ومجموع واحد).</p><div class="list">${chk.similar.slice(0, 5).map(x => `<div class="it" data-action="answer" data-val="${x.id}"><div class="m"><div class="t">ادمجه مع «${esc(E.merchantName(x))}»</div></div></div>`).join('')}<div class="it" data-action="answer" data-val="__keep"><div class="m"><div class="t">لا، خلهم منفصلين</div><div class="s">ينحفظ الاسم «${esc(name)}» لهذا المحل</div></div></div></div>`);
      if (!v) return reopen();
      if (v !== '__keep') { const r = await shopMerge(v, m.id, name); if (!r) return reopen(); S.shopCtx = { txId: C.txId, merchantId: r.merchant.id }; render(); shopBack(); return toast('اندمجوا في محل واحد'); }
    }
    const r = E.setShopName(st, m.id, name); if (r.error) return toast('ما انحفظ');
    await persist('اسم المحل'); render(); shopBack(); toast('انحفظ الاسم لكل عملياته');
  },
  shopPick: async (el) => {
    const t = E.chooseShop(store(), el.dataset.id, el.dataset.m); if (!t) return;
    await persist('اختيار المحل'); render();
    if ($('sheet').innerHTML && S.sheetKind === 'tx') afterTx(t.id);
    toast('تمام: ' + E.merchantName(merchantOf(t)));
  },
  shopDefault: async (el) => { E.setShopDefault(store(), el.dataset.a, el.dataset.id); await persist('المحل الافتراضي'); sheetMerchant(el.dataset.id); toast('صار الافتراضي للفاتورة'); },
  merchantMerge: async (el) => {
    const st = store(), keep = st.get('merchants', el.dataset.id), drop = st.get('merchants', $('mm_merge').value); if (!keep || !drop) return;
    if (!await confirmBox('دمج محلين', `«${esc(E.merchantName(drop))}» ينضم لـ «${esc(E.merchantName(keep))}»: عملياته وأسماء فواتيره تصير له، ويطلع مرة وحدة بتصنيف واحد ومجموع واحد. تقدر ترجع بزر التراجع ↶.`, 'ادمجهم')) return sheetMerchant(keep.id);
    const r = await shopMerge(keep.id, drop.id); render(); sheetMerchant(keep.id);
    if (r) toast(`اندمجوا${r.moved ? ` (${cnt(r.moved, 'op')} انتقلت)` : ''}`);
  },
  // العمليات الجديدة
  flowNext: async (el) => { if (!await flowSave(el, false)) return; flowAdvance(); },
  flowLater: async (el) => { if (!await flowSave(el, true)) return; flowAdvance(); },
  flowAllLater: async (el) => { const cur = S.flow && S.flow.ids[S.flow.i]; if (cur) await flowSave({ dataset: { id: cur } }, true); flowEnd(true); void el; },
  flowX: async () => {
    const cur = S.flow && S.flow.ids[S.flow.i]; if (!cur) return closeSheet();
    S.txDraft = { id: cur, note: $('s_note') ? $('s_note').value : '' };
    const v = await ask(`<h3>تكمل المراجعة بعدين؟<span class="sp"></span></h3><p class="small">اللي ما راجعتها تلقاها في «المراجعة» تحت «عمليات ما راجعتها»، وفي الرئيسية.</p><div class="list">
      <div class="it" data-action="answer" data-val="one"><div class="m"><div class="t">هذه لاحقًا</div><div class="s">وكمّل اللي بعدها</div></div></div>
      <div class="it" data-action="answer" data-val="all"><div class="m"><div class="t">الكل لاحقًا</div><div class="s">سكّر، وكلها تنتظرك في المراجعة</div></div></div>
      <div class="it" data-action="answer" data-val=""><div class="m"><div class="t">تراجع</div><div class="s">ارجع للعملية</div></div></div></div>`);
    S.txDraft = { id: cur, note: S.txDraft ? S.txDraft.note : '' }; sheetTx(cur);
    if (!v) return;
    if (v === 'one') { if (await flowSave({ dataset: { id: cur } }, true)) flowAdvance(); }
    else { await flowSave({ dataset: { id: cur } }, true); flowEnd(true); }
  },
  flowResume: () => { const ids = E.unreviewedTxs(store()).map(t => t.id); if (!ids.length) return toast('ما فيه عمليات تنتظر مراجعتك'); if (S.sheetResolve) closeSheet(null); startFlow(ids); },
  newBarOpen: () => {
    const nb = S.newBar || { ids: [], cards: [] }; hideNewBar();
    const ids = nb.ids.filter(id => { const t = store().get('transactions', id); return t && t.needsReview; });
    if (!ids.length) return toast('راجعتها قبل');
    if (!S.flow && S.sheetKind === 'tx' && itemsDirty()) { toast('احفظ الأغراض أول، بعدين افتح الجديدة من «المراجعة»'); return; }
    if (!S.flow) closeSheet(null);
    startFlow(ids, { cards: nb.cards });
  },
  newBarX: () => { hideNewBar(); toast('تلقاها في «المراجعة» تحت «عمليات ما راجعتها»'); },
  // الفترات (1.7.0)
  ignEdit: (el) => { S.igDraft = null; sheetIgnore(el.dataset.id || null); },
  igClose: () => { S.igDraft = null; closeSheet(null); },
  igCity: async () => { const p = igSync(); const c = await pickCity({ cur: p.cityId }); if (c) p.cityId = c; sheetIgnore(p.id); },
  igCityClear: () => { const p = igSync(); p.cityId = null; sheetIgnore(p.id); },
  ignSave: async (el) => {
    const p = igSync(), id = el.dataset.id || null;
    if (!p.from || !p.to) return toast('حدد التاريخين');
    if (p.from > p.to) return toast('تاريخ البداية بعد النهاية');
    if (!p.cityId && !p.groupId && !p.city && !p.category) return toast('اختر مدينة أو مجموعة أو تجاهل');
    let mode = null;
    if (p.cityId) {
      mode = await ask(`<h3>مدينة الفترة: ${esc(cityName(p.cityId))}<span class="sp"></span><button class="close" data-action="answer" data-val="">×</button></h3><div class="list">
        <div class="it" data-action="answer" data-val="noCity"><div class="m"><div class="t">اللي بدون مدينة بس</div><div class="s">اللي لها مدينة ما تتغير.</div></div></div>
        <div class="it" data-action="answer" data-val="all"><div class="m"><div class="t">كل العمليات</div><div class="s">حتى اللي حطيت مدينتها بيدك. ترجع لقيمتها لو حذفت الفترة. (اللي موقع جوالك سجّل لها مدينة ثانية ما تتغير في الحالتين.)</div></div></div></div>`);
      if (!mode) return sheetIgnore(id);
    }
    const r = E.savePeriod(store(), Object.assign({}, p, { id, cityMode: mode }));
    if (r.error) { sheetIgnore(id); return toast(r.error === 'order' ? 'تاريخ البداية بعد النهاية' : r.error === 'kind' ? 'اختر مدينة أو مجموعة أو تجاهل' : 'حدد التاريخين'); }
    S.igDraft = null; await persist(id ? 'تعديل فترة' : 'فترة جديدة'); closeSheet(); render();
    const bits = [r.cityApplied ? `المدينة على ${cnt(r.cityApplied, 'op')}` : '', r.groupApplied ? `المجموعة على ${cnt(r.groupApplied, 'op')}` : '', r.conflicts ? `${cnt(r.conflicts, 'op')} موقعها مختلف (تحت)` : ''].filter(Boolean);
    toast('انحفظت' + (bits.length ? ': ' + bits.join('، ') : ''), 6000);
  },
  ignDel: async (el) => {
    if (!await confirmBox('حذف الفترة', 'اللي جا منها يرجع مثل ما كان (المدينة والمجموعة)، وتعديلاتك اليدوية تبقى.', 'حذف', true)) return;
    const r = E.deletePeriod(store(), el.dataset.id); S.igDraft = null; await persist('حذف فترة'); closeSheet(); render(); toast(r && r.reverted ? `انحذفت، ورجعت ${cnt(r.reverted, 'op')}` : 'انحذفت');
  },
  perConflicts: async (el, ev) => {
    if (ev) ev.stopPropagation();
    const p = (settings().ignorePeriods || []).find(x => x.id === el.dataset.id); if (!p) return;
    const n = E.periodConflicts(store(), p).length;
    if (!await confirmBox('مدينة الفترة', `${cnt(n, 'op')} سجّل الجوال لها مدينة غير «${esc(cityName(p.cityId))}». تبي تحط لها مدينة الفترة كلها؟ ترجع لو حذفت الفترة.`, 'طبّقها')) return;
    const k = E.applyPeriodToConflicts(store(), p.id); await persist('مدينة الفترة على المختلفة'); render(); toast(`تمام: ${cnt(k, 'op')}`);
  },
  // مكان التصنيفات
  placeSave: async () => {
    const st = store(), s = settings(); let n = 0; const left = [], clash = [];
    document.querySelectorAll('select.pl_sel').forEach(x => {
      const c = st.get('categories', x.dataset.id); if (!c) return;
      if (x.value && x.value !== c.parentId) {
        const r = E.saveCategory(st, { id: c.id, name: c.name, parentId: x.value, emoji: c.emoji, color: c.color, defaultRecurrenceType: c.defaultRecurrenceType, defaultNecessityType: c.defaultNecessityType, isCommitment: c.isCommitment, savingsEligible: c.savingsEligible });
        if (r.error) { left.push(c.id); clash.push(c.name); return; } // نفس الاسم موجود تحت الرئيسي المختار: يبقى ينتظر قرارك
        n++;
      }
      const c2 = st.get('categories', c.id); if (c2 && c2.needsPlacement) { delete c2.needsPlacement; st.put('categories', c2); }
    });
    s.placeCategories = left; st.put('settings', s); st.touch();
    await persist('مكان التصنيفات'); closeSheet(); render();
    toast(clash.length ? `«${clash.join('، ')}»: فيه فرعي بنفس الاسم تحت اللي اخترته. اختر مكان ثاني، أو ادمجها من «التصنيفات»` : n ? `انتقلت ${n === 1 ? 'وحدة' : n}` : 'انحفظ', clash.length ? 7000 : 2500);
  },
  placeLater: () => { S.placeLater = true; closeSheet(); render(); },
  placeOpen: () => sheetPlaceCats(),
});
// كل 30 ثانية والتطبيق مفتوح: يدوّر على رسائل جديدة
setInterval(() => { if (S.store && document.visibilityState === 'visible') autoFetch(25000); }, 30000);

/* ================= 1.6.1: كلمات قراءة الرسائل ================= */
const SW_KIND_L = { family: 'نوع العملية', method: 'وسيلة الدفع', label: 'الكلمات قبل الأسماء والرصيد' };
const SW_KIND_N = { family: 'الترتيب مهم: أول مجموعة من فوق تنطبق على الرسالة هي اللي تكسب (مثلًا «سداد بطاقة» قبل «شراء»).', method: 'للشراء والاسترداد. إذا ما انطبق شي: نقاط بيع.', label: 'الكلمة اللي قبل الاسم أو الرصيد في الرسالة، عشان يعرف وين يبدأ الاسم.' };
const METHOD_TXT = { 'Apple Pay': 'Apple Pay', Online: 'أونلاين', POS: 'نقاط بيع' };
function swBase() { const vs = E.smsWordVersions(store()); const last = vs[vs.length - 1]; return last ? last.words : SR().defaultWords(); }
// المسودة تبدأ من آخر نسخة، وتنعاد لو تغيّرت النسخ من مكان ثاني (تراجع، إعادة، حذف)
const swSig = () => E.smsWordVersions(store()).map(v => v.id + '@' + (v.updatedAt || '')).join('|');
function swState() { const sig = swSig(); if (!S.sw || S.sw.sig !== sig) { const b = JSON.parse(JSON.stringify(swBase())); S.sw = { sig, base: JSON.parse(JSON.stringify(b)), draft: b }; } return S.sw; }
const swKey = (w) => SR().wordKey(w);
const swSame = (a, b) => JSON.stringify((a || []).map(swKey).sort()) === JSON.stringify((b || []).map(swKey).sort());
function swGroupDraft(k) { const D = swState().draft; if (!D[k]) { const g = SR().WORD_GROUPS.find(x => x.key === k); D[k] = { words: g.words.slice(), not: (g.not || []).slice() }; } return D[k]; }
function swDirty() { const W = swState(); return SR().WORD_GROUPS.some(g => { const a = W.draft[g.key] || {}, b = W.base[g.key] || {}; return !swSame(a.words, b.words) || !swSame(a.not, b.not); }); }
function swChanges() {
  const W = swState(), out = [];
  SR().WORD_GROUPS.forEach(g => {
    const a = (W.draft[g.key] || {}).words || [], b = (W.base[g.key] || {}).words || [];
    const add = a.filter(x => !b.some(y => swKey(y) === swKey(x))), del = b.filter(x => !a.some(y => swKey(y) === swKey(x)));
    if (add.length || del.length) out.push(`<b>${esc(g.label)}</b>: ${add.length ? 'أضفت ' + add.map(x => `«${esc(x)}»`).join('، ') : ''}${add.length && del.length ? ' · ' : ''}${del.length ? 'حذفت ' + del.map(x => `«${esc(x)}»`).join('، ') : ''}`);
  });
  return out;
}
function vSmsWords() {
  const st = store(), W = swState(), vs = E.smsWordVersions(st), groups = SR().WORD_GROUPS;
  const defW = SR().defaultWords();
  let h = `<div class="card"><h2>كلمات قراءة الرسائل</h2><p class="small muted">من 1.7.1 الرسالة ما تنقرأ إلا بصيغة معتمدة (صفحة «الصيغ»). هذي الكلمات للاقتراح بس: يعبّي منها التطبيق نوع العملية واسم المحل لما تعرّف صيغة جديدة، ولوسيلة الدفع (Apple Pay وأونلاين) إذا الصيغة ما حددتها. الحروف الكبيرة والصغيرة سوا، وأ/ا/إ/آ وة/ه وى/ي سوا، والكلمة الإنجليزية لازم تكون بداية كلمة.</p>
    <p class="small">لما تعدّل تحدد «من تاريخ»: الرسائل من هذا التاريخ وبعده تنقرأ بالكلمات الجديدة، واللي قبله بالنسخة السابقة. وقبل الحفظ تشوف وش يتأثر وتختار.</p></div>`;
  h += `<div class="card"><h2>النسخ</h2><div class="list">
    <div class="it" data-action="swView" data-id=""><div class="m"><div class="t">الافتراضية</div><div class="s">${vs.length ? `طريقة قراءة الرسائل قبل ${fdate(vs[0].from, true)}` : 'كل الرسائل (ما عدّلت شي للحين)'}</div></div>${ico('chevL', 'chev')}</div>
    ${vs.map((v, i) => `<div class="it" data-action="swView" data-id="${v.id}"><div class="m"><div class="t">من ${fdate(v.from, true)}</div><div class="s">${vs[i + 1] ? `طريقة قراءة الرسائل من ${fdate(v.from, true)} لين قبل ${fdate(vs[i + 1].from, true)}` : 'الحالية: الرسائل من هذا التاريخ وبعده'}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div></div>`;
  let lastKind = null;
  groups.forEach(g => {
    if (g.kind !== lastKind) { if (lastKind) h += `</div>`; h += `<div class="card"><h2>${esc(SW_KIND_L[g.kind])}</h2><p class="small muted" style="margin-top:-4px">${esc(SW_KIND_N[g.kind])}</p>`; lastKind = g.kind; }
    const d = swGroupDraft(g.key), def = defW[g.key], isDef = swSame(d.words, def.words) && swSame(d.not, def.not);
    h += `<div class="swg"><div class="swh"><b>${esc(g.label)}</b><span class="sp"></span>${isDef ? '' : `<a data-action="swReset" data-g="${g.key}">رجّع الافتراضي</a>`}</div>
      <div class="swchips">${d.words.map((w, i) => `<span class="swc"><bdi>${esc(w)}</bdi><button type="button" data-action="swDel" data-g="${g.key}" data-i="${i}" aria-label="حذف ${esc(w)}">×</button></span>`).join('') || '<span class="small warn-t">فاضية: رسائل هذا النوع ما تنعرف بالكلمات</span>'}</div>
      ${(d.not || []).length || g.not ? `<div class="small muted" style="margin-top:4px">ما عدا: ${(d.not || []).map((w, i) => `<span class="swc n"><bdi>${esc(w)}</bdi><button type="button" data-action="swDel" data-g="${g.key}" data-i="${i}" data-not="1" aria-label="حذف">×</button></span>`).join(' ') || '—'}</div>` : ''}
      <div class="swadd"><input type="text" id="sw_in_${g.key}" placeholder="كلمة جديدة" autocomplete="off" autocorrect="off" autocapitalize="off"><button type="button" class="btn" data-action="swAdd" data-g="${g.key}">أضف</button></div></div>`;
  });
  if (lastKind) h += `</div>`;
  h += `<div class="card"><p class="small muted">${ico('shield')} كلمات رسائل الرمز والدخول مقفلة للحماية وما تنعدل. ورسائل الرمز تنفرز قبل كذا في الاختصار وفي Google.</p>
    <div class="btns"><button class="btn p" data-action="swSave" ${swDirty() ? '' : 'disabled'}>احفظ…</button><button class="btn" data-action="swUndo" ${swDirty() ? '' : 'disabled'}>تراجع عن تعديلاتي</button><button class="btn" data-action="swResetAll">رجّع الكل للافتراضي</button></div></div>`;
  return h;
}
function swSummaryLine(x) { if (!x) return '—'; return [x.type, x.amount != null ? fmt(x.amount) : '', x.name || '', x.method ? (METHOD_TXT[x.method] || x.method) : ''].filter(Boolean).map(v => `<bdi>${esc(v)}</bdi>`).join(' · '); }
// لو فيه نسخة بنفس التاريخ أو بعده: وش بيصير لها
function swRangeNote(from) {
  const vs = E.smsWordVersions(store()), same = vs.find(v => v.from === from), next = vs.find(v => v.from > from);
  const bits = [];
  if (same) bits.push(`بتستبدل النسخة اللي من ${fdate(from, true)}.`);
  if (next) bits.push(`النسخة اللي من ${fdate(next.from, true)} تبقى، فهذي الكلمات تنطبق لين قبل ${fdate(next.from, true)} بس.`);
  return bits.length ? `<div class="banner i" style="display:block;margin-bottom:8px"><div class="small">${bits.join(' ')}</div></div>` : '';
}
function sheetSwPreview(from) {
  const st = store(), W = swState(), pv = E.previewSmsWords(st, W.draft, from);
  if (pv.error) return toast('حدد التاريخ');
  S.swPv = { from };
  const ck = (k, id) => `<input type="checkbox" class="sw_ck" data-k="${k}" data-id="${esc(id)}" checked>`;
  const read = pv.readable.concat(pv.infoToTx);
  let h = `<h3>قبل ما أحفظ<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <div class="small" style="margin-bottom:8px">${swChanges().join('<br>')}</div>
    ${swRangeNote(from)}<div class="small muted">من ${fdate(from, true)} وبعده. التصحيح يمس اللي انقرأ من الرسالة بس (النوع، المبلغ، الاسم، وسيلة الدفع، الرصيد، الرسوم)، وأي شي سويته بيدك يبقى.</div>`;
  if (!read.length && !pv.changes.length && !pv.unreadable.length) h += `<div class="banner i" style="margin-top:10px"><div>ما فيه رسائل سابقة تتأثر. الكلمات الجديدة للرسائل الجاية.</div></div>`;
  if (read.length) h += `<h3 style="margin-top:14px;font-size:15px">رسائل صارت تنقرأ (${read.length})</h3><p class="small muted">كانت تنتظر في «المراجعة» أو انحسبت «معلومات». تصير عمليات وتطلع في «ما راجعتها» (ورسائل البنك الجديد تنتظر اعتمادك في «المراجعة» أول).</p>
    <div class="list">${read.map(x => `<label class="it" style="cursor:pointer">${ck(pv.readable.includes(x) ? 'readable' : 'infoToTx', x.messageId)}<div class="m"><div class="t small">${swSummaryLine(x.after)}</div><div class="s">${fdate(x.date, true)}</div></div></label>`).join('')}</div>`;
  if (pv.changes.length) h += `<h3 style="margin-top:14px;font-size:15px">عمليات بتتغير قراءتها (${pv.changes.length})</h3>
    <div class="list">${pv.changes.map(c => { const t = st.get('transactions', c.txId); return `<label class="it" style="cursor:pointer;align-items:flex-start">${ck('changes', c.txId)}<div class="m"><div class="t small"><bdi>${esc(t ? txTitle(t) : '—')}</bdi> · <bdi class="num">${fmt(t ? t.grossAmount : 0)}</bdi> · <bdi>${fdate(c.date, true)}</bdi></div>
      <div class="s">قبل: ${swSummaryLine(c.before)}</div><div class="s" style="color:var(--pri-ink)">بعد: ${swSummaryLine(c.after)}</div>${c.limited ? `<div class="s">مدموجة مع كشف: قيم الكشف تبقى، ويتصحح ${c.fields.includes('method') ? 'وسيلة الدفع' : 'الاسم الناقص'} بس</div>` : ''}</div></label>`; }).join('')}</div>`;
  if (pv.unreadable.length) h += `<div class="banner w" style="display:block;margin-top:12px"><div><b>${cnt(pv.unreadable.length, 'op')} ما تنقرأ بالكلمات الجديدة</b> (يمكن حذفت كلمة مهمة). ما راح تتغير، بس الرسائل الجاية بنفس الصيغة بتروح «المراجعة».</div><div class="small" style="margin-top:6px">${pv.unreadable.slice(0, 5).map(x => `${fdate(x.date, true)} · ${swSummaryLine(x.before)}`).join('<br>')}</div></div>`;
  const any = read.length || pv.changes.length;
  h += `${any ? `<div class="btns" style="margin-top:10px"><button class="btn" data-action="swCkAll" data-v="1">تحديد الكل</button><button class="btn" data-action="swCkAll" data-v="0">إلغاء التحديد</button></div>` : ''}
    <div class="btns" style="margin-top:12px">${any ? `<button class="btn p" data-action="swApply" data-mode="sel">احفظ وصحّح المختارة</button><button class="btn" data-action="swApply" data-mode="none">احفظ للرسائل الجاية بس</button>` : `<button class="btn p" data-action="swApply" data-mode="none">احفظ</button>`}<button class="btn" data-action="swSave">رجوع</button></div>`;
  openSheet(h);
}
function sheetSwVersion(id) {
  const st = store(), vs = E.smsWordVersions(st), v = id ? vs.find(x => x.id === id) : null, words = v ? v.words : SR().defaultWords();
  const i = v ? vs.indexOf(v) : -1;
  openSheet(`<h3>${v ? 'من ' + fdate(v.from, true) : 'الافتراضية'}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <p class="small muted">${v ? (vs[i + 1] ? `للرسائل من ${fdate(v.from, true)} لين قبل ${fdate(vs[i + 1].from, true)}.` : `للرسائل من ${fdate(v.from, true)} وبعده.`) : (vs.length ? `للرسائل قبل ${fdate(vs[0].from, true)}.` : 'لكل الرسائل.')}</p>
    ${SR().WORD_GROUPS.map(g => `<div class="swg"><div class="swh"><b>${esc(g.label)}</b></div><div class="swchips">${((words[g.key] || g).words || []).map(w => `<span class="swc ro"><bdi>${esc(w)}</bdi></span>`).join('') || '<span class="small muted">—</span>'}${((words[g.key] || {}).not || []).map(w => `<span class="swc n ro">ما عدا: <bdi>${esc(w)}</bdi></span>`).join('')}</div></div>`).join('')}
    ${v ? `<div class="btns" style="margin-top:12px"><button class="btn r" data-action="swDelVersion" data-id="${v.id}">${ico('trash')} احذف هذي النسخة</button></div>` : ''}`);
}
const CSS161 = `.swg{padding:10px 0;border-bottom:1px solid var(--line)}.swg:last-child{border-bottom:0}
.swh{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:14px}.swh .sp{flex:1}
.swchips{display:flex;flex-wrap:wrap;gap:6px}
.swc{display:inline-flex;align-items:center;gap:4px;background:var(--chip);border-radius:999px;padding:4px 6px 4px 10px;font-size:13.5px}
.swc.n{background:var(--warn-soft)}.swc.ro{padding:4px 10px}
.swc button{border:0;background:none;color:var(--ink-3);font-size:16px;line-height:1;cursor:pointer;padding:0 2px}
.swadd{display:flex;gap:6px;margin-top:8px}.swadd input{flex:1;min-width:0;min-height:42px;padding:8px 10px}
.sw_ck{margin-top:4px;flex:none;width:20px;height:20px}`;
try { document.head.insertAdjacentHTML('beforeend', `<style id="css161">${CSS161}</style>`); } catch (e) { /* بدون DOM */ }
Object.assign(TITLES, { smswords: 'كلمات قراءة الرسائل' });
Object.assign(NAV_OF, { smswords: 'more' });
Object.assign(V150, { smswords: vSmsWords });
Object.assign(A, {
  swAdd: (el) => {
    const k = el.dataset.g, inp = $('sw_in_' + k), v = String(inp ? inp.value : '').replace(/\s+/g, ' ').trim();
    if (v.length < 2) return toast('الكلمة لازم تكون حرفين أو أكثر');
    if (/\d[\d\s-]{4,}\d/.test(v)) return toast('ما تنحفظ أرقام طويلة (مثل رقم بطاقة أو حساب)');
    const d = swGroupDraft(k); if (d.words.some(x => swKey(x) === swKey(v))) return toast('موجودة');
    d.words.push(v.slice(0, 60)); render(); const n = $('sw_in_' + k); if (n) n.focus();
  },
  swDel: (el) => { const d = swGroupDraft(el.dataset.g), list = el.dataset.not ? d.not : d.words; list.splice(Number(el.dataset.i), 1); render(); },
  swReset: (el) => { const g = SR().WORD_GROUPS.find(x => x.key === el.dataset.g); swState().draft[g.key] = { words: g.words.slice(), not: (g.not || []).slice() }; render(); },
  swResetAll: () => { swState().draft = SR().defaultWords(); render(); toast('رجعت الكلمات الافتراضية. اضغط «احفظ…» عشان تنطبق'); },
  swUndo: () => { S.sw = null; render(); },
  swView: (el) => sheetSwVersion(el.dataset.id || null),
  swSave: () => {
    if (!swDirty()) return toast('ما عدّلت شي');
    openSheet(`<h3>من أي تاريخ؟<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
      <div class="small" style="margin-bottom:8px">${swChanges().join('<br>')}</div>
      <p class="small">الرسائل من هذا التاريخ وبعده تنقرأ بالكلمات الجديدة (بتاريخ العملية المكتوب في الرسالة، وإذا ما فيها تاريخ فتاريخ وصولها). واللي قبله تنقرأ بالنسخة السابقة. إذا الصيغة تغيرت قبل ما تنتبه، اختر اليوم اللي تغيرت فيه.</p>
      <label class="f">من تاريخ</label><input type="date" id="sw_from" value="${esc((S.swPv && S.swPv.from) || E.todayISO())}">
      <div class="btns" style="margin-top:12px"><button class="btn p" data-action="swPreview">معاينة</button></div>`);
  },
  swPreview: () => { const f = $('sw_from') ? $('sw_from').value : ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return toast('حدد التاريخ'); sheetSwPreview(f); },
  swCkAll: (el) => document.querySelectorAll('input.sw_ck').forEach(x => { x.checked = el.dataset.v === '1'; }),
  swApply: async (el) => {
    const P = S.swPv; if (!P || S.swBusy) return; // ضغطة وحدة بس
    S.swBusy = true; document.querySelectorAll('#sheet button[data-action="swApply"]').forEach(b => { b.disabled = true; });
    try {
    const sel = { readable: [], infoToTx: [], changes: [] };
    if (el.dataset.mode === 'sel') document.querySelectorAll('input.sw_ck').forEach(x => { if (x.checked) sel[x.dataset.k].push(x.dataset.id); });
    const r = await E.applySmsWords(store(), swState().draft, P.from, sel);
    if (r.error) return toast('ما انحفظ');
    await persist('كلمات قراءة الرسائل'); S.sw = null; S.swPv = null; closeSheet(); render();
    const bits = [`انحفظت من ${fdate(P.from, true)}`]; if (r.corrected) bits.push(`تصحّحت ${cnt(r.corrected, 'op')}`); if (r.created) bits.push(`${r.created === 1 ? 'صارت عملية جديدة' : `صارت ${r.created} عمليات جديدة`} تلقاها في «ما راجعتها»`);
    toast(bits.join('، '), 6000);
    } finally { S.swBusy = false; }
  },
  swDelVersion: async (el) => {
    const v = E.smsWordVersions(store()).find(x => x.id === el.dataset.id); if (!v) return;
    if (!await confirmBox('حذف النسخة', `الرسائل من ${fdate(v.from, true)} تنقرأ بالنسخة اللي قبلها. العمليات المحفوظة ما تتغير.`, 'احذف', true)) return;
    E.deleteSmsWordsVersion(store(), v.id); await persist('حذف نسخة كلمات'); S.sw = null; closeSheet(); render();
  },
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.id && ev.target.id.startsWith('sw_in_')) { ev.preventDefault(); A.swAdd({ dataset: { g: ev.target.id.slice(6) } }); } });

/* ================= 1.6.2: التحديثات، البنوك، أول رسالة من بنك جديد، المرسل المتجاهل ================= */
// ---------- فحص التحديثات ----------
const verCmp = (a, b) => { const x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; };
// يقرأ رقم آخر نسخة من الموقع (sw.js) بدون أي نسخة محفوظة، ويطلب من الجوال يدوّر على التحديث
async function swCheck(manual) {
  if (!manual && S.updLast && Date.now() - S.updLast < 60000) return;
  S.updLast = Date.now();
  if (manual) { S.upd = { state: 'checking' }; render(); }
  let remote = null;
  try { const r = await fetch('sw.js?check=' + Date.now(), { cache: 'no-store' }); if (r.ok) { const m = (await r.text()).match(/VERSION\s*=\s*'fm-([\d.]+)'/); remote = m ? m[1] : null; } } catch (e) { remote = null; }
  try { if (S.swReg) await S.swReg.update(); } catch (e) { /* بدون إنترنت */ }
  if (!manual) return;
  S.upd = !remote ? { state: 'error' } : verCmp(remote, E.version) > 0 ? { state: 'found', remote } : { state: 'latest', remote };
  if (S.upd.state === 'found') setTimeout(() => { if (S.upd && S.upd.state === 'found' && !S.swWaiting && S.view === 'settings') render(); }, 15000);
  if (S.view === 'settings') render();
}
function updateCard() {
  const U = S.upd || {}, ready = !!S.swWaiting;
  const line = ready ? `<b>النسخة الجديدة${U.remote ? ' ' + esc(U.remote) : ''} جاهزة.</b> اضغط «حدّث الحين».`
    : U.state === 'checking' ? 'جاري الفحص…'
    : U.state === 'latest' ? `✓ عندك آخر نسخة (الموقع: ${esc(U.remote)}).`
    : U.state === 'found' ? `فيه نسخة جديدة <b>${esc(U.remote)}</b>، جاري تنزيلها… خلك في التطبيق ثواني. إذا طوّلت، جرّب «تحديث إجباري».`
    : U.state === 'error' ? 'ما قدرت أوصل للموقع. تأكد من الإنترنت وجرب مرة ثانية.'
    : 'يدوّر على التحديث تلقائيًا كل ما ترجع للتطبيق. وتقدر تفحص الحين.';
  return `<div class="card"><h2>التحديثات <span class="sp"></span><span class="muted small">نسختك: ${esc(E.version)}</span></h2>
    <p class="small">${line}</p>
    <div class="btns">${ready ? `<button class="btn p" data-action="applyUpdate">حدّث الحين</button>` : `<button class="btn p" data-action="updCheck" ${U.state === 'checking' ? 'disabled' : ''}>فحص التحديثات</button>`}<button class="btn" data-action="updForce">تحديث إجباري</button></div>
    <p class="small muted" style="margin-top:6px">«تحديث إجباري» لو التحديث علق: ينزّل ملفات التطبيق من الموقع ويحطها مكان المحفوظة في الجوال. بياناتك المالية ما تنلمس.</p></div>`;
}
const APP_FILES = ['./', 'index.html', 'app.js', 'engine.js', 'analytics.js', 'db.js', 'sms.js', 'inbox.js', 'sw.js', 'manifest.webmanifest'];
async function forceUpdate() {
  const ok = await confirmBox('تحديث إجباري', 'ينزّل ملفات التطبيق من جديد من الموقع ويحطها مكان المحفوظة في الجوال، ويعيد فتح التطبيق. <b>بياناتك المالية ما تنلمس</b> (محفوظة في مكان منفصل). يحتاج إنترنت.', 'حدّث', false);
  if (!ok) return;
  toast('جاري التحديث…', 8000);
  // ننزّل كل الملفات من الموقع مباشرة (?fresh يتخطى المحفوظ في الجوال والمتصفح). ما نمسح شي قبل ما توصل كلها،
  // فلو انقطع الاتصال في النص يبقى التطبيق شغال بنسخته الحالية وبدون إنترنت
  const got = [];
  try {
    for (const f of APP_FILES.filter(x => x !== 'sw.js')) {
      const r = await fetch(f + (f.includes('?') ? '&' : '?') + 'fresh=' + Date.now(), { cache: 'reload' });
      if (!r.ok) throw new Error(f);
      got.push([f, r]);
    }
  } catch (e) { return toast('ما قدرت أنزّل كل الملفات. التطبيق باقي على نسخته، جرب لما يكون الإنترنت أقوى', 7000); }
  try {
    if (window.caches) { const ks = (await caches.keys()).filter(k => /^fm-/.test(k)); for (const k of ks) { const c = await caches.open(k); for (const [f, r] of got) await c.put(new Request(f), r.clone()); } }
  } catch (e) { return toast('ما قدرت أحفظ الملفات الجديدة. جرب مرة ثانية', 6000); }
  try { if (S.swReg) await S.swReg.update(); } catch (e) { /* عامل الخدمة الجديد ينزل مع أول فتح */ }
  location.reload();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') swCheck(false); });
setInterval(() => { if (document.visibilityState === 'visible') swCheck(false); }, 30 * 60 * 1000);
setTimeout(() => swCheck(false), 4000);

// ---------- البنوك ----------
const FAM_L = () => E.SMS_FAMILY_L;
function bankRows() {
  const st = store(), all = E.sendersOf(st), counts = new Map();
  st.all('messages').forEach(m => { const k = E.bankOf(st, m.sender); if (!k) return; const c = counts.get(k) || { n: 0, last: '' }; c.n++; if (String(m.receivedAt || '') > c.last) c.last = String(m.receivedAt || ''); counts.set(k, c); });
  return Object.values(all).filter(r => !r.mergedInto).map(r => ({ r, n: (counts.get(r.key) || {}).n || 0, last: (counts.get(r.key) || {}).last || '', aliases: Object.values(all).filter(x => x.mergedInto && E.bankOf(st, x.key) === r.key) }))
    .sort((a, b) => (a.r.ignored - b.r.ignored) || b.last.localeCompare(a.last));
}
function bankSub(x) {
  const st = store(), n = E.smsFormats(st, 'approved').filter(t => t.sender && E.bankOf(st, t.sender) === x.r.key).length;
  return [[x.r.raw].concat(x.aliases.map(a => a.raw)).map(esc).join('، '), cnt(x.n, 'msg'),
    x.r.ignored ? '<span class="warn-t">متجاهل: رسائله ما تنحسب</span>' : n ? (n === 1 ? 'صيغة معتمدة وحدة' : n + ' صيغ معتمدة') : '<span class="warn-t">ما له صيغ معتمدة للحين</span>'].join(' · ');
}
function vBanks() {
  const rows = bankRows();
  let h = `<div class="card"><h2>البنوك</h2><p class="small muted">كل مرسل وصلت منه رسائل. سمّ البنك، وشوف صيغه المعتمدة وأشكال تواريخه. أي رسالة منه شكلها جديد تنتظرك في «المراجعة» تعرّف صيغتها. «مو بنك» يتجاهل رسائل المرسل (مثل STC لما يرسل تأكيد شراء بعد رسالة البنك).</p></div>`;
  // الاختصار لازم يرسل اسم المرسل: بدونه الرسالة ما تنحسب على بنك وتمشي مثل قبل
  const recent = store().all('messages').filter(m => (m.source || 'paste') !== 'paste').sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))).slice(0, 20);
  const noSender = recent.filter(m => !m.sender).length;
  if (noSender) h += `<div class="banner w" style="display:block"><div><b>${cnt(noSender, 'msg')} من آخر رسائل الصندوق وصلت بدون اسم المرسل.</b> هذي ما تنحسب على بنك (صيغها وأشكال تواريخها عامة لكل البنوك). الأفضل إن الاختصار يرسل اسم المرسل مع الرسالة.</div></div>`;
  h += rows.length ? `<div class="card"><div class="list">${rows.map(x => `<div class="it" data-action="bankOpen" data-k="${esc(x.r.key)}">${icCircle({ color: x.r.ignored ? PAL.gray : PAL.aqua, icon: 'bank' }, 's')}<div class="m"><div class="t">${esc(x.r.name || x.r.raw)}</div><div class="s">${bankSub(x)}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div></div>`
    : `<div class="card empty"><p>ما وصلت رسائل من الاختصار للحين.</p></div>`;
  return h;
}
function sheetBank(key) {
  const st = store(), k = E.bankOf(st, key), r = E.bankRec(st, k); if (!r) return;
  const x = bankRows().find(y => y.r.key === k) || { n: 0, aliases: [] }, others = bankRows().filter(y => y.r.key !== k);
  const shapes = Object.entries(settings().smsDateShapes || {}).filter(([sk]) => sk.startsWith(k + '§'));
  const tpls = E.smsFormats(st, 'approved').filter(t => t.sender && E.bankOf(st, t.sender) === k);
  const pendN = E.smsFormats(st, 'pending').filter(t => t.sender && E.bankOf(st, t.sender) === k).length;
  const OL = SR().ORDER_L;
  openSheet(`<h3>${esc(r.name || r.raw)}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <label class="f">اسم البنك</label><div class="btns" style="flex-wrap:nowrap"><input type="text" id="bk_name" value="${esc(r.name || '')}" placeholder="مثل: الإنماء، الراجحي، الأهلي" style="flex:1" maxlength="40"><button class="btn" data-action="bankNameSave" data-k="${esc(k)}">حفظ</button></div>
    <h3 style="margin-top:14px;font-size:15px">اسم المرسل في الرسائل</h3>
    <div class="list"><div class="it" style="cursor:default"><div class="m"><div class="t">${esc(r.raw)}</div><div class="s">${cnt(x.n, 'msg')}</div></div></div>
    ${x.aliases.map(a => `<div class="it" style="cursor:default"><div class="m"><div class="t">${esc(a.raw)}</div><div class="s">مدموج في هذا البنك</div></div><button class="btn" data-action="bankUnmerge" data-k="${esc(a.key)}">فك الدمج</button></div>`).join('')}</div>
    ${others.length ? `<p class="small muted" style="margin-top:8px">لو نفس البنك يرسل باسم ثاني (مثلًا غيّر اسم المرسل)، ادمجهم: هذا يصير اسم ثاني للبنك اللي تختاره، بنفس الصيغ وأشكال التاريخ.</p>
      <div class="btns" style="flex-wrap:nowrap"><select id="bk_merge" style="flex:1">${others.map(y => `<option value="${esc(y.r.key)}">${esc(y.r.name || y.r.raw)}</option>`).join('')}</select><button class="btn" data-action="bankMerge" data-k="${esc(k)}">ادمجه فيه</button></div>` : ''}
    <h3 style="margin-top:14px;font-size:15px">أشكال التاريخ</h3>
    ${shapes.length ? `<div class="list">${shapes.map(([sk, v]) => `<div class="it" data-action="shapeEdit" data-sig="${esc(sk)}"><div class="m"><div class="t">${shapeSampleHtml(v.sample || '', (SR().findDateToken(v.sample || '') || {}).raw)}</div><div class="s">${OL[v.order] || v.order}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div>` : '<p class="small muted">ما فيه للحين. أول رسالة بشكل تاريخ جديد يسألك عنه.</p>'}
    <h3 style="margin-top:14px;font-size:15px">الصيغ المعتمدة</h3>
    ${tpls.length ? `<div class="list">${tpls.map(t => `<div class="it" data-action="fmtOpen" data-id="${t.id}"><div class="m"><div class="t">${esc(t.name || '')}</div><div class="s">${t.role === 'tx' ? Object.keys(t.spans || {}).map(f => FIELD_L[f] || f).map(esc).join('، ') : 'معلومات'}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div>` : '<p class="small muted">ما فيه للحين. أول رسالة منه تنتظرك في «المراجعة» تعرّف صيغتها.</p>'}
    ${pendN ? `<p class="small warn-t" style="margin-top:6px">${pendN === 1 ? 'شكل واحد ينتظر' : pendN + ' أشكال تنتظر'} اعتمادك. <a data-action="go" data-view="formats">افتحها</a></p>` : ''}
    <div class="btns" style="margin-top:14px">${r.ignored ? `<button class="btn p" data-action="bankIgnore" data-k="${esc(k)}" data-v="0">إلغاء التجاهل</button>` : `<button class="btn r" data-action="bankIgnore" data-k="${esc(k)}" data-v="1">مو بنك: تجاهل رسائله</button>`}</div>
    ${r.ignored ? `<p class="small muted">رسائله تنحفظ «من مرسل متجاهل» بنصها وبدون عمليات. رسائل الرمز تنحذف بدون نص مثل دايم.</p>` : ''}`);
}
const IGN_SENDER_KINDS = new Set(['sms_new_bank', 'sms_new_bank_info', 'sms_unknown', 'sms_unparsed', 'sms_no_account', 'sms_new_shape']);
// اللصق: «من أي بنك؟»
function pasteBankField() {
  const rows = bankRows().filter(x => !x.r.ignored);
  return `<label class="f">من أي بنك؟</label><select id="smsBank" data-change="pasteBankSel"><option value="">ما أدري</option>${rows.map(x => `<option value="${esc(x.r.key)}">${esc(x.r.name || x.r.raw)}</option>`).join('')}<option value="__other">بنك ثاني (اكتب اسم المرسل)</option></select>
    <input type="text" id="smsSender" class="hide" placeholder="اسم المرسل، مثل alinma" style="margin-top:6px">
    <div class="small muted" style="margin-top:4px">إذا اخترت البنك، الرسائل تنقرأ بصيغه المعتمدة وأشكال تواريخه. «ما أدري» = تجرّب صيغ كل البنوك.</div>`;
}
function pasteSender() {
  const v = $('smsBank') ? $('smsBank').value : '';
  if (v === '__other') return ($('smsSender').value || '').trim() || null;
  if (v) { const r = E.bankRec(store(), v); return r ? r.raw : null; }
  return null;
}
async function ignoreSender(key) {
  const st = store(), label = E.bankLabel(st, key);
  const ok = await confirmBox('تجاهل ' + label, `رسائل <b>${esc(label)}</b> الجاية تنحفظ «من مرسل متجاهل» بنصها، بدون عمليات. المعلّقة منه في المراجعة تنقفل بنفس الطريقة. العمليات المحفوظة منه ما تتغير، ورسائل الرمز تنحذف بدون نص مثل دايم. تقدر تلغي التجاهل من «البنوك».`, 'تجاهل', true);
  if (!ok) return false;
  const r = E.setSenderIgnored(st, key, true); let plan = null;
  if (r && r.reprocess.length) { plan = await E.reprocessMessages(st, r.reprocess); if (plan) E.commitSms(st, plan); }
  await persist('تجاهل مرسل: ' + label); render(); toast(`تمام، رسائل ${label} تتجاهل${r && r.reprocess.length ? ` (وانقفلت ${cnt(r.reprocess.length, 'msg')} معلّقة)` : ''}`);
  return true;
}
const CSS162 = `.it .btn.r{padding:6px 10px}`;
try { document.head.insertAdjacentHTML('beforeend', `<style id="css162">${CSS162}</style>`); } catch (e) { /* بدون DOM */ }
Object.assign(TITLES, { banks: 'البنوك' });
Object.assign(NAV_OF, { banks: 'more' });
Object.assign(V150, { banks: vBanks });
Object.assign(A, {
  updCheck: () => swCheck(true),
  updForce: () => forceUpdate(),
  bankOpen: (el) => sheetBank(el.dataset.k),
  bankNameSave: async (el) => { E.setBankName(store(), el.dataset.k, $('bk_name').value); await persist('اسم بنك'); render(); sheetBank(el.dataset.k); toast('انحفظ'); },
  bankMerge: async (el) => {
    const st = store(), from = el.dataset.k, into = $('bk_merge') && $('bk_merge').value; if (!into) return;
    const ok = await confirmBox('دمج', `<b>${esc(E.bankLabel(st, from))}</b> يصير اسم ثاني لـ <b>${esc(E.bankLabel(st, into))}</b>: نفس الاسم والصيغ وأشكال التاريخ. تقدر تفك الدمج بعدين.`, 'ادمج', false);
    if (!ok) return;
    const res = E.mergeBanks(st, from, into); let plan = null;
    if (res && res.reprocess.length) { plan = await E.reprocessMessages(st, res.reprocess); if (plan) E.commitSms(st, plan, { markReview: true }); }
    await persist('دمج بنكين'); render(); sheetBank(into); toast('اندمجوا' + (plan ? '، ' + smsSummaryText(plan.smsSummary) : ''));
  },
  bankUnmerge: async (el) => {
    const st = store(), r = E.unmergeBank(st, el.dataset.k); if (!r) return; let plan = null;
    if (r.reprocess && r.reprocess.length) { plan = await E.reprocessMessages(st, r.reprocess); if (plan) E.commitSms(st, plan, { markReview: true }); }
    await persist('فك دمج بنك'); render(); sheetBank(r.from); toast('انفك الدمج' + (plan ? '، ' + smsSummaryText(plan.smsSummary) : ''));
  },
  bankIgnore: async (el) => {
    const st = store(), k = el.dataset.k;
    if (el.dataset.v === '1') { closeSheet(null); if (await ignoreSender(k)) sheetBank(k); return; }
    const r = E.setSenderIgnored(st, k, false); let plan = null;
    if (r && r.reprocess.length && await confirmBox('إعادة قراءة رسائله', `عندك ${cnt(r.reprocess.length, 'msg')} منه انحفظت «من مرسل متجاهل». تعيد قراءتها الحين؟ اللي لها صيغة معتمدة تنحفظ، والباقي ينتظرك في «المراجعة».`, 'أعد قراءتها', false)) {
      plan = await E.reprocessMessages(st, r.reprocess); if (plan) E.commitSms(st, plan, { markReview: true });
    }
    await persist('إلغاء تجاهل مرسل'); render(); sheetBank(k); toast(plan ? smsSummaryText(plan.smsSummary) : 'انلغى التجاهل');
  },
  rvIgnoreSender: async (el) => { const st = store(), r = st.get('reviews', el.dataset.id), m = r && st.get('messages', r.messageId); if (!m || !m.sender) return; await ignoreSender(E.bankOf(st, m.sender)); },
  pasteBankSel: (el) => { if ($('smsSender')) $('smsSender').classList.toggle('hide', el.value !== '__other'); },
});

/* ================= 1.7.1: الصيغ الثابتة للرسائل ================= */
// بعد حفظ صيغة (تعريف، تعديل، اعتماد شكل): الرسائل المنتظرة اللي تطابقها تنعالج، وإذا فيه رسائل سابقة بتتغير قراءتها يسألك عن النطاق
async function finishFormat(res, label, back) {
  const st = store(); let plan = null;
  if (res.waiting.length) { plan = await E.reprocessMessages(st, res.waiting, {}); if (plan) E.commitSms(st, plan, { markReview: true }); }
  E.detectRecurring(st);
  await persist(label);
  S.teachSms = null; if (back) goUp(back); else render();
  const imp = res.template.role === 'tx' ? E.formatImpact(st, res.template) : { total: 0 };
  toast(`${res.template.role === 'info' ? 'انحفظت صيغة معلومات' : /تعديل/.test(label || '') ? 'انحفظ تعديل الصيغة' : 'انعتمدت الصيغة'}${plan ? '، ' + smsSummaryText(plan.smsSummary) : ''}`, 5000);
  if (imp.total) setTimeout(() => sheetFormatScope(res.template.id), 300);
}
const readRow = (l, v) => `<div style="display:flex;gap:8px;margin:3px 0"><span class="muted" style="min-width:92px">${l}</span><b style="flex:1;min-width:0;overflow-wrap:anywhere"><bdi>${v}</bdi></b></div>`;
// كذا تنقرأ الرسالة المثال بهالصيغة
function formatReadHtml(t) {
  if (t.role !== 'tx') return '';
  const i = SR().applyFormat(t, t.sample || ''); if (!i) return '';
  const name = i.merchantRaw || i.beneficiaryRaw || i.counterpartyName || null;
  const amt = i.feeOnTop ? `${esc(fmt(i.grossAmount))} <span class="small muted">= ${esc(fmt(i.amountRead))} + رسوم ${esc(fmt(i.feeAmount))}</span>` : esc(fmt(i.grossAmount)) + (i.feeAmount ? ` <span class="small muted">(منها رسوم ${esc(fmt(i.feeAmount))})</span>` : '');
  return `<div class="kvbox small" style="margin-top:6px">${readRow('النوع', esc(FAM_L()[t.family] || t.family || ''))}${readRow('المبلغ المحسوب', amt)}${name ? readRow('الاسم', esc(name)) : ''}${i.instrumentLast4 ? readRow('البطاقة', '…' + esc(i.instrumentLast4)) : ''}${i.accountLast4 ? readRow('الحساب', '…' + esc(i.accountLast4)) : ''}${i.balanceAfter != null ? readRow('الرصيد', esc(fmt(i.balanceAfter))) : ''}${i.transactionDate ? readRow('التاريخ', esc(fdate(i.transactionDate, true)) + (i.time ? ' ' + esc(ftime(i.time)) : '')) : ''}</div>`;
}
const fmtBank = (t) => t.sender ? (E.bankLabel(store(), t.sender) || t.sender) : 'بدون بنك (ملصوقة)';
const sampleBox = (t) => `<div class="raw" style="margin-top:6px">${rawHtml(t.sample || '')}</div>`;
function pendingCard(t) {
  const n = t.count || 1, amt = t.role === 'info' && t.hasAmount ? SR().extractAmount(t.sample || '') : null;
  const btns = t.role === 'tx'
    ? `<button class="btn p" data-action="fmtApprove" data-id="${t.id}">اعتمد</button><button class="btn" data-action="fmtEdit" data-id="${t.id}">عدّل</button><button class="btn" data-action="fmtToInfo" data-id="${t.id}">هذي معلومات</button><button class="btn" data-action="fmtDismiss" data-id="${t.id}">تجاهل الشكل</button>`
    : (t.hasAmount // فيها مبلغ: الأقرب إنها عملية، فزر التعريف هو الأساسي
      ? `<button class="btn p" data-action="fmtEdit" data-id="${t.id}">عرّفها عملية</button><button class="btn" data-action="fmtApprove" data-id="${t.id}">اعتمدها معلومات</button><button class="btn" data-action="fmtDismiss" data-id="${t.id}">تجاهل الشكل</button>`
      : `<button class="btn p" data-action="fmtApprove" data-id="${t.id}">اعتمدها معلومات</button><button class="btn" data-action="fmtEdit" data-id="${t.id}">عرّفها عملية</button><button class="btn" data-action="fmtDismiss" data-id="${t.id}">تجاهل الشكل</button>`);
  return `<div class="rv" id="pf_${t.id}"><div class="rvh"><b>${esc(fmtBank(t))}</b> <span class="b ${t.role === 'tx' ? 'g' : 'n'}">${t.role === 'tx' ? 'عملية' : 'معلومات'}</span><span class="sp" style="flex:1"></span><span class="small muted">${cnt(n, 'msg')}</span></div>
    ${sampleBox(t)}
    ${t.role === 'tx' ? `<div class="small muted" style="margin-top:8px">كذا تنقرأ (نفس قراءتها السابقة):</div>${formatReadHtml(t)}${t.feeTopHint ? '<div class="small warn-t" style="margin-top:6px">المبلغ + الرسوم يساوي رقم ثالث مكتوب في الرسالة: يمكن الرسوم «فوق المبلغ». لو كذا اضغط «عدّل».</div>' : ''}`
      : `<div class="small muted" style="margin-top:8px">كانت تنحفظ «معلومات» بدون عملية.${t.hasAmount ? ` <span class="warn-t">فيها مبلغ${amt ? ' ' + fmt(amt.value) : ''}: لو هي عملية اضغط «عرّفها عملية».</span>` : ''}</div>`}
    <div class="btns" style="margin-top:10px">${btns}</div></div>`;
}
function formatCounts() {
  const st = store();
  return st.cached('fmtCounts', () => { const m = new Map(), fs = E.smsFormats(st, 'approved'), R = SR(); st.all('messages').forEach(x => { if (!x.text) return; const f = fs.find(t => !(t.sender && x.sender && E.bankOf(st, t.sender) !== E.bankOf(st, x.sender)) && R.matchFormat(t, x.text)); if (f) m.set(f.id, (m.get(f.id) || 0) + 1); }); return m; });
}
function vFormats() {
  const st = store(), pend = pendingFormats().sort((a, b) => Number(b.role === 'tx') - Number(a.role === 'tx') || (b.count || 1) - (a.count || 1)), appr = E.smsFormats(st, 'approved'), counts = formatCounts();
  let h = `<div class="card"><h2>الصيغ الثابتة</h2><p class="small muted">التطبيق ما يخمّن: الرسالة تنقرأ بس إذا طابقت صيغة معتمدة بالضبط (نفس السطور ونفس الكلام الثابت). أي شكل جديد يروح «المراجعة» وتعرّفه: نوع العملية والمتغيرات (المبلغ، التاريخ، المحل…)، وبعدها الرسائل اللي بنفس الشكل تمشي لحالها. رسائل الرموز تنحذف تلقائي وما ينحفظ نصها.</p></div>`;
  if (pend.length) h += `<div class="card" id="fmtPend"><h2>أشكال من رسائلك السابقة تنتظر اعتمادك (${pend.length})</h2><p class="small muted">كل شكل معه مثال وقراءته. اعتمده، أو عدّله، أو تجاهله. لين تعتمد الشكل، رسائله الجديدة تنتظر في «المراجعة».</p>${pend.map(pendingCard).join('')}</div>`;
  const banks = new Map(); appr.forEach(t => { const k = t.sender ? E.bankOf(st, t.sender) : ''; if (!banks.has(k)) banks.set(k, []); banks.get(k).push(t); });
  banks.forEach((list, k) => {
    list.sort((a, b) => Number(b.role === 'tx') - Number(a.role === 'tx') || (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
    h += `<div class="card"><h2>${esc(k ? (E.bankLabel(st, k) || k) : 'بدون بنك')} <span class="sp"></span><span class="muted">${list.length}</span></h2><div class="list">${list.map(t => `<div class="it" data-action="fmtOpen" data-id="${t.id}">${icCircle({ color: t.role === 'tx' ? PAL.green : PAL.gray, icon: t.role === 'tx' ? 'msg' : 'note' }, 's')}<div class="m"><div class="t">${esc(t.name || '')}</div><div class="s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><bdi>${esc(String(t.sample || '').split('\n')[0])}</bdi></div><div class="s">${t.role === 'tx' ? Object.keys(t.spans || {}).map(f => FIELD_L[f] || f).map(esc).join('، ') : 'تنحفظ معلومات بدون عملية'} · ${cnt(counts.get(t.id) || 0, 'msg')}</div></div>${ico('chevL', 'chev')}</div>`).join('')}</div></div>`;
  });
  if (!appr.length && !pend.length) h += `<div class="card empty"><p>ما فيه صيغ للحين. أول رسالة توصل تنتظرك في «المراجعة» تعرّف صيغتها.</p></div>`;
  return h;
}
function sheetFormat(id) {
  const st = store(), t = st.get('templates', id); if (!E.isFormat(t)) return closeSheet(null);
  const n = formatCounts().get(t.id) || 0;
  openSheet(`<h3>${esc(t.name || '')}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <div class="small muted">${esc(fmtBank(t))} · ${t.role === 'tx' ? 'عملية' : 'معلومات'} · ${cnt(n, 'msg')} تطابقها</div>
    <label class="f">مثال</label>${sampleBox(t)}
    ${t.role === 'tx' ? `<label class="f">كذا تنقرأ</label>${formatReadHtml(t)}
      <dl class="kv" style="margin-top:8px"><dt>المتغيرات</dt><dd>${Object.keys(t.spans || {}).map(f => FIELD_L[f] || f).map(esc).join('، ') || '—'}${(t.skips || []).length ? ' · نص يتغير' : ''}</dd>${t.feeMode ? `<dt>الرسوم</dt><dd>${t.feeMode === 'top' ? 'فوق المبلغ' : 'داخل المبلغ'}</dd>` : ''}</dl>` : '<p class="small muted" style="margin-top:8px">الرسائل اللي بهالشكل تنحفظ «معلومات» بدون عملية وبدون سؤال.</p>'}
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="fmtEdit" data-id="${t.id}">${t.role === 'tx' ? 'عدّل' : 'عرّفها عملية'}</button><button class="btn r" data-action="fmtDelete" data-id="${t.id}">حذف الصيغة</button></div>`);
}
// رسائل سابقة تطابق الصيغة وقراءتها بتتغير: من الحين وطالع / على الكل / من تاريخ
function sheetFormatScope(id) {
  const st = store(), t = st.get('templates', id); if (!E.isFormat(t)) return;
  const imp = E.formatImpact(st, t); if (!imp.total) return;
  const FL = { family: 'النوع', amount: 'المبلغ', name: 'الاسم', method: 'وسيلة الدفع', balance: 'الرصيد', fee: 'الرسوم', date: 'التاريخ' };
  const rows = imp.infoToTx.map(x => ({ d: x.date, txt: `كانت «معلومات» ← عملية <span class="num">${fmt(x.after.amount)}</span>${x.after.name ? ` · <bdi>${esc(x.after.name)}</bdi>` : ''}` }))
    .concat(imp.changes.map(x => ({ d: x.date, txt: `يتغير: ${x.fields.map(f => FL[f] || f).join('، ')}${x.fields.includes('amount') ? ` (<span class="num">${fmt(x.before.amount)}</span> ← <span class="num">${fmt(x.after.amount)}</span>)` : ''}${x.newDate ? ` (${fdate(x.oldDate, true)} ← ${fdate(x.newDate.date, true)})` : ''}${x.limited ? ' · مدموجة مع كشف: وسيلة الدفع والاسم بس' : ''}` })))
    .sort((a, b) => String(b.d).localeCompare(String(a.d)));
  openSheet(`<h3>الرسائل السابقة بنفس الشكل<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <p class="small">الصيغة «${esc(t.name || '')}» تطابق <b>${cnt(imp.total, 'msg')}</b> سابقة قراءتها تختلف${imp.infoToTx.length ? `: ${imp.infoToTx.length === 1 ? 'وحدة' : imp.infoToTx.length === 2 ? 'ثنتين' : imp.infoToTx.length} ${imp.infoToTx.length === 1 ? 'كانت «معلومات» وبتصير عملية' : 'كانوا «معلومات» وبيصيرون عمليات'}` : ''}${imp.changes.length ? `${imp.infoToTx.length ? '، و' : ': '}${cnt(imp.changes.length, 'op')} بتتصحح` : ''}. الرسائل الجاية تمشي على الصيغة في كل الأحوال. والسابقة؟</p>
    <div class="list" style="max-height:180px;overflow:auto">${rows.slice(0, 40).map(r => `<div class="it" style="cursor:default"><div class="m"><div class="t small">${fdate(r.d, true)}</div><div class="s">${r.txt}</div></div></div>`).join('')}</div>
    <label class="f" style="margin-top:10px"><input type="radio" name="fs_mode" value="future" checked> من الحين وطالع (السابقة تبقى مثل ما هي)</label>
    <label class="f"><input type="radio" name="fs_mode" value="all"> على الكل (${cnt(imp.total, 'msg')})</label>
    <label class="f"><input type="radio" name="fs_mode" value="from" id="fs_from_r"> من تاريخ محدد:</label><input type="date" id="fs_from" data-change="fsFromPick" min="${imp.minDate || ''}" max="${E.todayISO()}" value="${imp.minDate || ''}">
    <p class="small muted">التصحيح يمس اللي انقرأ من الرسالة بس (ومنه التاريخ إذا الصيغة تحدده): تصنيفك وأغراضك ومدينتك وملاحظاتك تبقى. والعملية ما تنحذف أبدًا.</p>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="fmtScopeApply" data-id="${t.id}">تطبيق</button></div>`);
}
// رسالة واحدة تظهر مرة بعد التحديث: وش ينتظرك
function sheetNotice171(n) {
  openSheet(`<h3>تحديث 1.7.1<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    ${n.shapes ? `<div class="rv"><b>الصيغ الثابتة للرسائل</b><div class="small" style="margin-top:4px">التطبيق ما عاد يخمّن قراءة الرسائل. جمعت رسائلك السابقة في <b>${n.shapes === 1 ? 'شكل واحد' : n.shapes === 2 ? 'شكلين' : n.shapes + ' أشكال'}</b> تنتظر اعتمادك (كل شكل مع مثال وقراءته). لين تعتمد الشكل، رسائله الجديدة تنتظر في «المراجعة».</div><div class="btns" style="margin-top:8px"><button class="btn p" data-action="noticeGo" data-view="formats">افتح الصيغ</button></div></div>` : `<div class="rv"><b>الصيغ الثابتة للرسائل</b><div class="small" style="margin-top:4px">التطبيق ما عاد يخمّن قراءة الرسائل: أي رسالة شكلها جديد تنتظرك في «المراجعة» تعرّف صيغتها مرة وحدة.</div></div>`}
    ${n.asked ? `<div class="rv"><b>الالتزامات الدائمة</b><div class="small" style="margin-top:4px"><b>${n.asked === 1 ? 'التزام واحد ينتظر اعتماد مبلغه' : n.asked === 2 ? 'التزامين ينتظرون اعتماد مبالغهم' : n.asked + ' التزامات تنتظر اعتماد مبالغها'}</b> (يقترح آخر فاتورة). لين تجاوب ما تنحسب التزام، ومبالغها مع «غير محدد» (وفي التوقع تنحسب صرف عادي).${n.auto ? ` و${n.auto === 1 ? 'واحد انعتمد' : n.auto + ' انعتمدت'} تلقائي لأن آخر 3 دفعات متساوية.` : ''}</div><div class="btns" style="margin-top:8px"><button class="btn p" data-action="noticeGo" data-view="commitments">افتح الالتزامات</button></div></div>` : ''}
    ${n.groups ? `<p class="small muted">و${cnt(n.groups, 'op')} (تحويل بين حساباتك أو سداد بطاقة) طلعت من مجموعة فترتها.</p>` : ''}`);
}
Object.assign(TITLES, { formats: 'الصيغ', teachsms: 'تعريف صيغة رسالة' });
Object.assign(NAV_OF, { formats: 'more' });
Object.assign(V150, { formats: vFormats });
Object.assign(A, {
  noticeGo: (el) => { closeSheet(null); go(el.dataset.view); },
  fsFromPick: () => { if ($('fs_from_r')) $('fs_from_r').checked = true; }, // اخترت تاريخ = تبي «من تاريخ محدد»
  teachName: (el) => { if (S.teachSms) S.teachSms.name = el.value; },
  fmtOpen: (el) => sheetFormat(el.dataset.id),
  fmtPendGo: (el) => { go('formats'); setTimeout(() => { const x = $('pf_' + el.dataset.id) || $('fmtPend'); if (x) x.scrollIntoView({ block: 'start' }); }, 80); },
  fmtApprove: async (el) => {
    const st = store(), res = E.approvePendingFormat(st, el.dataset.id); if (!res) return;
    await finishFormat(res, res.template.role === 'info' ? 'اعتماد شكل معلومات' : 'اعتماد شكل رسالة', null);
  },
  // تعديل صيغة معتمدة، أو شكل معلّق (عملية أو معلومات ← عملية)
  fmtEdit: (el) => {
    const st = store(), t = st.get('templates', el.dataset.id); if (!E.isFormat(t) || !t.sample) return;
    closeSheet(null);
    teachStart({ mode: t.status === 'approved' && t.role === 'tx' ? 'edit' : 'pending', back: 'formats', text: t.sample, sender: t.sender, formatId: t.id, fmt: t });
  },
  fmtToInfo: async (el) => {
    const st = store(), t = st.get('templates', el.dataset.id); if (!E.isFormat(t)) return;
    const res = E.saveInfoFormat(st, { text: t.sample, sender: t.sender }, t.id); if (!res || res.error) return toast(res && res.error === 'otp' ? 'فيها رمز محتمل: ما تنحفظ لها صيغة معلومات' : 'ما قدرت أحفظها صيغة معلومات');
    await finishFormat(res, 'شكل رسالة: معلومات', null);
  },
  fmtDismiss: async (el) => {
    const st = store(), t = st.get('templates', el.dataset.id); if (!E.isFormat(t)) return;
    if (!await confirmBox('تجاهل الشكل', 'ما ينحفظ له صيغة. لو وصلت رسالة بنفس الشكل بتطلع لك في «المراجعة» مثل أي شكل جديد. العمليات المحفوظة ما تتغير.', 'تجاهل', false)) return;
    E.deleteSmsFormat(st, t.id); await persist('تجاهل شكل رسالة'); render();
  },
  fmtDelete: async (el) => {
    const st = store(), t = st.get('templates', el.dataset.id); if (!E.isFormat(t)) return;
    if (!await confirmBox('حذف الصيغة', 'الرسائل الجاية بهالشكل بتروح «المراجعة» وتسألك من جديد. العمليات المحفوظة ما تتغير.', 'حذف', true)) return;
    E.deleteSmsFormat(st, t.id); await persist('حذف صيغة رسالة'); closeSheet(null); render(); toast('انحذفت الصيغة');
  },
  fmtScopeApply: async (el) => {
    const st = store(), mode = (document.querySelector('input[name="fs_mode"]:checked') || {}).value || 'future', from = $('fs_from') ? $('fs_from').value : '';
    if (mode === 'future') { closeSheet(null); return toast('السابقة تبقى مثل ما هي'); }
    if (mode === 'from' && !/^\d{4}-\d{2}-\d{2}$/.test(from)) return toast('اختر التاريخ');
    const r = await E.applyFormatScope(st, el.dataset.id, { mode, from }); if (r && r.busy) return; if (!r || r.error) return toast('ما قدرت أطبّقها على الرسائل السابقة. جرّب مرة ثانية');
    E.detectRecurring(st);
    await persist('تطبيق صيغة على رسائل سابقة'); closeSheet(null); render();
    toast([r.created ? `${r.created === 1 ? 'عملية جديدة' : r.created + ' عمليات جديدة'} من رسائل كانت معلومات` : '', r.corrected ? `تصححت ${cnt(r.corrected, 'op')}` : '', r.reviews ? `${r.reviews} للمراجعة` : ''].filter(Boolean).join('، ') || 'ما تغيّر شي', 6000);
  },
});


/* ================= 1.7.0 ================= */
const CSS170 = `
.top .undo-pill{padding:7px 12px;font-size:13px}
.srch{display:flex;gap:8px;align-items:center}
.srch input{flex:1;min-width:0}
.fbtn{position:relative;flex:none;width:42px;height:42px;border-radius:12px;border:0;background:var(--chip);color:var(--ink-2);display:flex;align-items:center;justify-content:center;cursor:pointer}
.fbtn.on{background:var(--pri-soft);color:var(--pri)}
.fbtn .fcnt{position:absolute;top:-4px;inset-inline-start:-4px;background:var(--pri);color:#fff;border-radius:999px;font-size:11px;min-width:18px;height:18px;line-height:18px;text-align:center;font-weight:700;padding:0 4px}
.tseg{display:flex;background:#E9EBF1;border-radius:14px;padding:3px;gap:2px;margin-top:10px}
.tseg button{flex:1;min-width:0;border:0;background:none;padding:8px 2px;font-size:13.5px;cursor:pointer;border-radius:11px;font-weight:600;color:var(--ink-2);white-space:nowrap}
.tseg button.on{background:#fff;color:var(--pri);box-shadow:0 1px 3px rgba(20,22,31,.08)}
.needs{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.needs .chip{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;font-size:13px}
.needs .chip svg.i{width:17px;height:17px}
.needs .chip.need{background:#FFF1DE;color:#9A5A00}
.needs .chip.need.on{background:#E8890C;color:#fff}
.needs .chip.nsub{background:#fff;border:1px solid var(--line)}
.needs .chip.nsub.on{background:var(--pri);border-color:var(--pri);color:#fff}
.fca-w{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px}
.fca{display:inline-flex;align-items:center;gap:4px;background:var(--pri-soft);color:var(--pri-ink);border-radius:999px;padding:3px 4px 3px 10px;font-size:12.5px;font-weight:600;max-width:100%}
.fca>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fca button{border:0;background:rgba(255,255,255,.7);color:var(--pri-ink);border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:15px;line-height:20px;flex:none}
.fca-all{font-size:12.5px;margin-inline-start:4px}
.cntline{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 2px 6px}
.cntline .selk{font-size:13px}
.pamt{display:flex;flex-direction:column;align-items:flex-end;line-height:1.2}
.pamt .of{font-size:11px;color:var(--ink-3);font-weight:500}
.b.grp{background:#EAF6EE;color:#1F7A45}
.b.city{background:#EAF1FF;color:#2F55B0}
.b.w.city{background:#FFF1DE;color:#9A5A00}
.fxsec{border-top:1px solid var(--line);padding-top:10px;margin-top:12px}
.fxh{font-weight:700;font-size:14px;margin-bottom:8px}
.chipw{display:flex;flex-wrap:wrap;gap:6px}
.chipw .chip{padding:7px 12px;font-size:13px}
.txblock.sug{border:1px dashed var(--pri);background:var(--pri-soft)}
.card.undef .row{display:flex;align-items:center;gap:10px}
.defrow .defb{display:flex;gap:6px;flex:none}
.defrow .defb .btn{padding:7px 10px;font-size:13px}
#txlist .tx{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
.sheet{overscroll-behavior:contain}
.sheet.drag{transition:none!important}
.sheet.snap{transition:transform .22s ease-out}
.sheet.swipe{transition:transform .18s ease-out,opacity .18s ease-out}
body.lock170{position:fixed;left:0;right:0;overflow:hidden}
#main.sw170{transition:none}
#main.sw170b{transition:transform .22s ease-out}
.txpos{text-align:center;color:var(--ink-3);font-weight:600;font-size:13.5px}
.hero .tools button.txtb{width:auto;border-radius:999px;padding:0 12px;font-size:13px;font-weight:600}
.empty-day{padding:10px 0;text-align:center}
.grid3c{display:grid;grid-template-columns:1fr;gap:0 10px}
@media (min-width:520px){.grid3c{grid-template-columns:repeat(3,1fr)}}
/* 1.7.1: اسم طويل بدون مسافات (محل أو كلمة في رسالة) ما يطلّع الصفحة عن عرضها */
.rv .rvh>b{min-width:0;overflow-wrap:anywhere}
.rv .small,.banner .small{overflow-wrap:anywhere}
.it .m .t{overflow-wrap:anywhere}
#sheet h3{overflow-wrap:anywhere;min-width:0}
#sheet h3 .close{flex:none}
.tok{max-width:100%;overflow-wrap:anywhere;white-space:normal;text-align:start}
.fchip .v{overflow-wrap:anywhere}
`;
try { document.head.insertAdjacentHTML('beforeend', `<style id="css170">${CSS170}</style>`); } catch (e) { /* بدون DOM */ }

// «تراجع» و«إعادة» كلمات بدل السهم، وكلها تسألك قبل
try {
  const ub = $('undoBtn');
  if (ub) { ub.className = 'pill undo-pill hide'; ub.removeAttribute('style'); ub.textContent = 'تراجع'; ub.setAttribute('aria-label', 'تراجع'); ub.title = 'تراجع';
    if (!$('redoBtn')) ub.insertAdjacentHTML('afterend', '<button class="pill undo-pill hide" id="redoBtn" data-action="redo" aria-label="إعادة" title="إعادة">إعادة</button>'); }
} catch (e) { /* بدون DOM */ }

// موضع العملية في القائمة اللي فتحتها منها: «3 من 20»
function txNavText(id) { const N = S.txNav; if (!N || N.ids.length < 2) return ''; const i = N.ids.indexOf(id); return i < 0 ? '' : `${i + 1} من ${N.ids.length}`; }
function captureTxNav(el, id) {
  const scope = el && el.closest && el.closest('#sheet') ? $('sheet') : $('main');
  const ids = []; if (scope) scope.querySelectorAll('[data-action="openTx"][data-id],[data-action="newOpen"][data-id]').forEach(x => { if (!ids.includes(x.dataset.id)) ids.push(x.dataset.id); });
  S.txNav = ids.length > 1 && ids.includes(id) ? { ids } : null;
}
// الانتقال للعملية اللي بعدها أو قبلها (dir: +1 تحت، -1 فوق). العملية الجديدة: بدون ما تنعلّم «راجعتها»
async function txNavGo(dir) {
  const st = store();
  if (S.flow && S.sheetTxId === S.flow.ids[S.flow.i]) {
    const F = S.flow; let i = F.i + dir; while (i >= 0 && i < F.ids.length && !st.get('transactions', F.ids[i])) i += dir;
    if (i < 0 || i >= F.ids.length) return false;
    if (!await itemsLeaveOk()) return null;
    S.items = null; F.i = i; sheetTx(F.ids[i]); return true;
  }
  const N = S.txNav; if (!N || !S.sheetTxId || !N.ids.includes(S.sheetTxId)) return null; // ما انفتحت من قائمة: ما فيه تنقل
  let i = N.ids.indexOf(S.sheetTxId) + dir; while (i >= 0 && i < N.ids.length && !st.get('transactions', N.ids[i])) i += dir;
  if (i < 0 || i >= N.ids.length) return false;
  if (!await itemsLeaveOk()) return null;
  S.items = null; sheetTx(N.ids[i]); return true;
}

// صرفياتك: السحب يمين/يسار يتنقل بين الأيام (وبين الأشهر في «سنوي»)، ويعبر للأسبوع أو الدورة أو السنة المجاورة. بدون يوم مختار: الفترة كلها
function spendStep(dir) {
  const st = store(), today = E.todayISO(), p = S.period; if (!p) return false;
  const sel = S.selDay;
  if (!sel) {
    const np = E.shiftPeriod(st, p, dir); if (!np || np.start > today) return false;
    S.period = np; return true;
  }
  if (p.kind === 'year') { // الأشهر
    let [y, m] = sel.split('-').map(Number); m += dir; if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (key > today.slice(0, 7)) return false;
    if (String(y) !== p.start.slice(0, 4)) { const np = E.shiftPeriod(st, p, dir); if (!np) return false; S.period = np; }
    S.selDay = key; return true;
  }
  const d = E.addDays(sel, dir); if (d > today) return false;
  if (d < p.start || d > p.end) { const np = E.shiftPeriod(st, p, dir); if (!np || np.start > today) return false; S.period = np; }
  S.selDay = d; return true;
}

/* ---------- اللمس: قفل الخلفية، سحب النافذة لتحت، التنقل بين العمليات، صرفياتك، الضغط المطوّل للتحديد ---------- */
const G = { t: null };
function topSheetEl() { const s2 = document.querySelector('#sheet2 .sheet'); return s2 || document.querySelector('#sheet .sheet'); }
function hScrollable(el, stop) { // عنصر يتحرك أفقيًا بنفسه: السحب فيه ما يتنقل
  for (let x = el; x && x !== stop && x.nodeType === 1; x = x.parentElement) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName)) return true;
    if (x.scrollWidth > x.clientWidth + 2) { const ov = getComputedStyle(x).overflowX; if (ov === 'auto' || ov === 'scroll') return true; }
  }
  return false;
}
function lockBody(on) {
  const b = document.body;
  if (on && !b.classList.contains('lock170')) { G.scrollY = window.scrollY || 0; b.style.top = `-${G.scrollY}px`; b.classList.add('lock170'); }
  else if (!on && b.classList.contains('lock170')) { b.classList.remove('lock170'); b.style.top = ''; window.scrollTo(0, G.scrollY || 0); }
}
try {
  const obs = new MutationObserver(() => lockBody(!!($('sheet').innerHTML || $('sheet2').innerHTML)));
  ['sheet', 'sheet2'].forEach(id => { const el = $(id); if (el) obs.observe(el, { childList: true }); });
} catch (e) { /* بدون DOM */ }
function closeTopSheet() {
  const sh = topSheetEl(); if (!sh) return;
  const x = sh.querySelector('h3 .close'); // نفس طريق ✕ (يسألك عن اللي ما انحفظ)
  if (x) x.click(); else if (sh.closest('#sheet2')) { if (S.pickResolve) finishPick(null); else if (S.cityResolve) finishCity(null); else if (S.groupResolve) finishGroups(null); else if (S.rateResolve) finishRate(null); } else closeSheet(null);
}
document.addEventListener('touchstart', (ev) => {
  if (!S.store || ev.touches.length !== 1) { G.t = null; return; }
  const tp = ev.touches[0], target = ev.target, sh = topSheetEl();
  const g = G.t = { x0: tp.clientX, y0: tp.clientY, t0: Date.now(), axis: null, dx: 0, dy: 0, target };
  if (sh) {
    if (!sh.contains(target)) { g.kind = 'bg'; return; }
    g.kind = 'sheet'; g.sheet = sh; g.atTop = sh.scrollTop <= 0; g.hOk = !sh.closest('#sheet2') && S.sheetKind === 'tx' && !hScrollable(target, sh);
    return;
  }
  if (target.closest('.nav') || target.closest('.fab') || target.closest('#toast')) { g.kind = null; return; }
  if (S.view === 'spend' && !hScrollable(target, document.body)) g.kind = 'spend';
  // الضغط المطوّل على عملية = يبدأ التحديد ويحددها
  const row = S.view === 'txs' && !S.sel ? target.closest('#txlist .tx[data-id]') : null;
  if (row) g.lp = setTimeout(() => { if (G.t !== g || g.axis) return; S.sel = new Set([row.dataset.id]); S.lpSuppress = Date.now() + 900; try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* */ } render(); toast('اختر العمليات، والأوامر تحت'); }, 550);
}, { passive: true });
document.addEventListener('touchmove', (ev) => {
  const g = G.t; if (!g || ev.touches.length !== 1) return;
  const tp = ev.touches[0]; g.dx = tp.clientX - g.x0; g.dy = tp.clientY - g.y0;
  if (!g.axis && (Math.abs(g.dx) > 9 || Math.abs(g.dy) > 9)) {
    g.axis = Math.abs(g.dx) > Math.abs(g.dy) * 1.4 ? 'h' : 'v';
    if (g.lp) { clearTimeout(g.lp); g.lp = null; }
    if (g.kind === 'sheet' && g.axis === 'v' && g.dy > 0 && g.atTop && g.sheet.scrollTop <= 0) g.pull = true;
    if (g.kind === 'sheet' && g.axis === 'h' && g.hOk) g.swipe = true;
    if (g.kind === 'spend' && g.axis === 'h') g.spend = true;
  }
  if (g.kind === 'bg') { ev.preventDefault(); return; } // الخلفية ما تتحرك
  if (g.pull) { ev.preventDefault(); const d = Math.max(0, g.dy); g.sheet.classList.add('drag'); g.sheet.style.transform = `translateY(${d}px)`; return; }
  if (g.swipe) { ev.preventDefault(); g.sheet.classList.add('drag'); g.sheet.style.transform = `translateX(${g.dx * 0.35}px)`; g.sheet.style.opacity = String(1 - Math.min(0.35, Math.abs(g.dx) / 900)); return; }
  if (g.spend) { ev.preventDefault(); const m = $('main'); m.classList.add('sw170'); m.classList.remove('sw170b'); m.style.transform = `translateX(${g.dx}px)`; }
}, { passive: false });
function endGesture() {
  const g = G.t; G.t = null; if (!g) return;
  if (g.lp) { clearTimeout(g.lp); g.lp = null; }
  const dt = Math.max(1, Date.now() - g.t0), fast = (Math.abs(g.axis === 'v' ? g.dy : g.dx) / dt) > 0.6;
  if (g.pull) {
    const sh = g.sheet, h = sh.getBoundingClientRect().height, go1 = g.dy > h / 4 || (fast && g.dy > 40);
    sh.classList.remove('drag'); sh.classList.add('snap'); sh.style.transform = '';
    setTimeout(() => sh.classList.remove('snap'), 260);
    if (go1) closeTopSheet();
    return;
  }
  if (g.swipe) {
    const sh = g.sheet; sh.classList.remove('drag'); sh.classList.add('swipe'); sh.style.transform = ''; sh.style.opacity = '';
    setTimeout(() => sh.classList.remove('swipe'), 220);
    if (Math.abs(g.dx) > 70 || (fast && Math.abs(g.dx) > 40)) txNavGo(g.dx > 0 ? 1 : -1).then(ok => { if (ok === false) toast(g.dx > 0 ? 'هذي آخر وحدة' : 'هذي أول وحدة', 1400); });
    return;
  }
  if (g.spend) {
    const m = $('main'), w = window.innerWidth || 360, go1 = Math.abs(g.dx) > w / 2 || (fast && Math.abs(g.dx) > 50);
    m.classList.remove('sw170'); m.classList.add('sw170b'); m.style.transform = '';
    setTimeout(() => m.classList.remove('sw170b'), 260);
    if (go1) { if (spendStep(g.dx > 0 ? 1 : -1)) render(); else toast(g.dx > 0 ? 'ما فيه أيام جاية' : 'ما فيه قبلها', 1400); }
  }
}
document.addEventListener('touchend', endGesture, { passive: true });
document.addEventListener('touchcancel', () => { const g = G.t; if (g && g.sheet) { g.sheet.classList.remove('drag'); g.sheet.style.transform = ''; g.sheet.style.opacity = ''; } const m = $('main'); if (m) m.style.transform = ''; if (g && g.lp) clearTimeout(g.lp); G.t = null; }, { passive: true });
// الكمبيوتر: زر الفأرة اليمين على عملية = تحديد
document.addEventListener('contextmenu', (ev) => {
  if (!S.store || S.view !== 'txs' || S.sel) return;
  const row = ev.target.closest('#txlist .tx[data-id]'); if (!row) return;
  ev.preventDefault(); S.sel = new Set([row.dataset.id]); render();
});

/* ---------- الالتزامات الدائمة: الإعدادات ---------- */
function commitSettingsCard() {
  const c = E.commitCfg(store());
  return `<div class="card"><h2>الالتزامات الدائمة</h2><p class="small muted">متى يطلع تنبيه «تغيّر السعر» (لكل الالتزامات، وتقدر تخصص التزام لحاله من صفحته)، وكم دفعة أو دورة يدخل في المتوسط.</p>
    <div class="grid3c"><div><label class="f">حد التنبيه</label><select id="cc_mode"><option value="pct" ${c.alertMode === 'pct' ? 'selected' : ''}>بالنسبة (%)</option><option value="sar" ${c.alertMode === 'sar' ? 'selected' : ''}>بالريال</option></select></div>
    <div><label class="f">قيمة الحد</label><input type="text" inputmode="decimal" id="cc_val" value="${c.alertValue}"></div>
    <div><label class="f">المتوسط يُحسب من آخر</label><input type="number" id="cc_n" min="1" max="24" value="${c.n}"></div></div>
    <p class="small muted">التنبيه يطلع لما آخر مبلغ يختلف عن المعتمد بأكثر من الحد. المتوسط: آخر ${c.n} ${c.n === 1 ? 'دفعة' : 'دفعات'} للالتزام الشهري اللي قيمته متغيرة، وآخر ${c.n} ${c.n === 1 ? 'دورة كاملة' : 'دورات كاملة'} للي دفعاته متغيرة. تنحفظ مع «حفظ الإعدادات» تحت.</p></div>`;
}

Object.assign(A, {
  undo: async () => {
    const st = store(), u = st.undoStack[st.undoStack.length - 1]; if (!u) return toast('ما فيه خطوة للتراجع');
    if (!await confirmBox('تراجع', `تتراجع عن: <b>${esc(u.label)}</b>؟`, 'تراجع')) return;
    const s2 = st.undo(); if (!s2) return; await persist(null, { noStep: true }); closeSheet(); render(); toast('تراجعت عن: ' + s2.label);
  },
  redo: async () => {
    const st = store(), r = st.redoStack[st.redoStack.length - 1]; if (!r) return toast('ما فيه خطوة للإعادة');
    if (!await confirmBox('إعادة', `تعيد: <b>${esc(r.label)}</b>؟`, 'إعادة')) return;
    const s2 = st.redo(); if (!s2) return; await persist(null, { noStep: true }); closeSheet(); render(); toast('أعدت: ' + s2.label);
  },
  openTx: async (el) => {
    if (S.lpSuppress && Date.now() < S.lpSuppress) return;
    if (S.items && S.items.txId !== el.dataset.id && !await itemsLeaveOk()) return;
    captureTxNav(el, el.dataset.id); sheetTx(el.dataset.id);
  },
  newOpen: (el) => { captureTxNav(el, el.dataset.id); sheetTx(el.dataset.id); },
  selStart: () => { S.sel = new Set(); render(); },
  toggleSel: (el) => { if (S.lpSuppress && Date.now() < S.lpSuppress) return; const id = el.dataset.id; if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); refreshSel(); },
  // الرسوم
  feeAccept: async (el) => { const st = store(), t = st.get('transactions', el.dataset.id), c = t && E.feeSuggestion(st, t); if (!c) return; E.setCategory(st, t.id, c, null, 'this'); await persist('تصنيف رسوم'); render(); afterTx(t.id); toast('تصنفت «' + E.catName(st, c) + '»'); },
  // الالتزامات الدائمة
  commitOpen: (el) => { S.cmSplit = null; sheetCommit(el.dataset.k); },
  commitPendGo: () => { closeSheet(null); go('commitments'); },
  // سؤال الاعتماد: «نعم اعتمده» / «مبلغ ثاني» / «قيمته متغيرة»
  commitApprove: async (el) => {
    const k = el.dataset.k, v = el.dataset.v, r = E.commitApprove(store(), k, v, v === 'amount' ? ($('cm_amt') && $('cm_amt').value) : null);
    if (!r) return; if (r.error) return toast('اكتب المبلغ');
    await persist(v === 'variable' ? 'التزام قيمته متغيرة' : 'اعتماد مبلغ التزام'); render();
    if ($('sheet').innerHTML) sheetCommit(k);
    toast(v === 'variable' ? 'صار التزام قيمته متغيرة (يعرض المتوسط)' : `انعتمد ${fmt(r.amount)}، وصار ينحسب التزام`);
  },
  commitOther: (el) => { sheetCommit(el.dataset.k); setTimeout(() => { const i = $('cm_amt'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); } }, 60); },
  commitDecide: async (el) => {
    const k = el.dataset.k, v = el.dataset.v;
    if (v === 'fixed' || (v === 'variable' && el.classList.contains('on'))) { const c0 = E.commitmentOf(store(), k, today0()); if (c0 && c0.status === 'approved' && c0.value === v) return; } // هو كذا أصلًا
    const r = E.commitPriceDecision(store(), k, v); if (!r) return;
    await persist(v === 'update' ? 'تحديث سعر التزام' : v === 'variable' ? 'التزام قيمته متغيرة' : v === 'exception' ? 'استثناء سعر التزام' : 'التزام بمبلغ ثابت'); render();
    if ($('sheet').innerHTML) sheetCommit(k);
    toast(v === 'update' ? `صار المعتمد ${fmt(r.amount)}` : v === 'variable' ? 'صارت قيمته متغيرة: يعرض المتوسط وما يسألك عن السعر' : v === 'exception' ? 'استثناء: المعتمد على حاله، والدفعة محسوبة كاملة' : `صارت قيمته ثابتة (المعتمد ${fmt(r.amount)})`);
  },
  commitPay: async (el) => {
    const k = el.dataset.k, c0 = E.commitmentOf(store(), k, today0()); if (c0 && (c0.pay === 'variable' ? 'variable' : 'monthly') === el.dataset.v) return; // هو كذا أصلًا
    const r = E.setCommitPay(store(), k, el.dataset.v); if (!r) return;
    await persist('نظام دفعات التزام'); render(); sheetCommit(k);
    toast(r.pay === 'variable' ? 'دفعاته متغيرة: ينحسب بمتوسط الدورة' : 'نظامه شهري: دفعة كل دورة');
  },
  commitAmount: async (el) => { const r = E.commitPriceDecision(store(), el.dataset.k, 'amount', $('cm_amt') && $('cm_amt').value); if (!r || r.error) return toast('المبلغ غير صحيح'); await persist('مبلغ التزام'); render(); sheetCommit(el.dataset.k); toast('انحفظ'); },
  commitAlertSave: async (el) => {
    const k = el.dataset.k, mode = $('cm_almode').value, r = E.setCommitAlert(store(), k, mode === 'global' ? null : { mode, value: $('cm_alval').value });
    if (!r) return; if (r.error) return toast(mode === 'pct' ? 'اكتب نسبة من 0.5 إلى 100' : 'اكتب مبلغ من 1 ريال');
    await persist('حد تنبيه التزام'); render(); sheetCommit(k); toast(mode === 'global' ? 'يمشي على الحد العام' : 'انحفظ الحد الخاص');
  },
  // أكثر من دفعة في نفس الدورة: متغير / تعثر / مقدم / استثناء
  commitMulti: async (el) => {
    const k = el.dataset.k, v = el.dataset.v, r = E.commitMultiDecision(store(), k, v);
    if (!r) return; if (r.error) return toast('ما لقيت دورة قبلها أو بعدها');
    await persist(v === 'variable' ? 'التزام دفعاته متغيرة' : v === 'arrears' ? 'دفعة متعثرة من دورة سابقة' : v === 'advance' ? 'دفعة مقدمة لدورة جاية' : 'استثناء دفعات التزام'); render();
    if ($('sheet').innerHTML) sheetCommit(k);
    toast(v === 'variable' ? 'صارت دفعاته متغيرة' : v === 'arrears' ? 'أول دفعة انحسبت للدورة اللي قبل. تقدر تعدّل تقسيمها من صفحة الالتزام' : v === 'advance' ? 'آخر دفعة انحسبت للدورة الجاية. تقدر تعدّل تقسيمها من صفحة الالتزام' : 'استثناء لهالدورة بس', 6000);
  },
  // تقسيم دفعة: تعثر (حق شهرين) أو مقدم. الخانات تبدأ بالتساوي على دورتين
  commitSplitOpen: (el) => {
    const st = store(), k = el.dataset.k, id = el.dataset.id, kind = el.dataset.kind, L = E.commitLedger(st, k, today0()), x = L.byTx.get(id); if (!x) return;
    const cur = x.split && x.mark && x.mark.kind === kind ? x.split.map(p => ({ k: p.k, amount: p.amount })) : null;
    let rows = cur || E.defaultSplit(x.amount, kind, 2);
    if (cur && rows.length === 1) rows = rows.concat({ k: 0, amount: 0 }).sort((a, b) => a.k - b.k); // دفعة منقولة كلها: نعرض دورتها كمان عشان تقدر تقسمها
    S.cmSplit = { key: k, txId: id, kind, rows }; sheetCommitSplit();
  },
  cmSplitCalc: () => {
    const X = S.cmSplit; if (!X) return;
    document.querySelectorAll('.cmsp').forEach(i => { X.rows[+i.dataset.i].amount = i.value; });
    const L = E.commitLedger(store(), X.key, today0()), x = L.byTx.get(X.txId), tot = E.round2(X.rows.reduce((a, r) => a + (Number(E.parseNum(r.amount)) || 0), 0));
    if ($('cmsp_sum') && x) $('cmsp_sum').innerHTML = splitSumTxt(tot, x.amount);
  },
  commitSplitAdd: () => { const X = S.cmSplit; if (!X) return; const x = E.commitLedger(store(), X.key, today0()).byTx.get(X.txId); if (!x) return; X.rows = E.defaultSplit(x.amount, X.kind, X.rows.length + 1); sheetCommitSplit(); },
  commitSplitLess: () => { const X = S.cmSplit; if (!X || X.rows.length <= 2) return; const x = E.commitLedger(store(), X.key, today0()).byTx.get(X.txId); if (!x) return; X.rows = E.defaultSplit(x.amount, X.kind, X.rows.length - 1); sheetCommitSplit(); },
  commitSplitSave: async () => {
    const X = S.cmSplit; if (!X) return;
    document.querySelectorAll('.cmsp').forEach(i => { X.rows[+i.dataset.i].amount = i.value; });
    const r = E.setCommitSplit(store(), X.key, X.txId, X.kind, X.rows);
    if (!r) return; if (r.error === 'sum') return toast(`مجموع التقسيم ${fmt(r.total)} لازم يساوي مبلغ الدفعة ${fmt(r.amount)}`, 5000); if (r.error) return toast('التقسيم غير صحيح');
    const k = X.key; S.cmSplit = null;
    await persist(X.kind === 'arrears' ? 'تقسيم دفعة متعثرة' : 'تقسيم دفعة مقدمة'); render(); sheetCommit(k); toast('انحفظ التقسيم في سجل الالتزام');
  },
  commitMarkClear: async (el) => { const k = el.dataset.k; if (!E.clearCommitMark(store(), k, el.dataset.id)) return; await persist('إلغاء علامة دفعة'); render(); sheetCommit(k); toast('انلغت العلامة'); },
  commitOff: async (el) => {
    const st = store(), k = el.dataset.k, i = k.indexOf(':'), typ = k.slice(0, i), id = k.slice(i + 1), n = typ === 'merchant' ? 'merchants' : 'beneficiaries', o = st.get(n, id); if (!o) return;
    if (!await confirmBox('مو التزام دائم', `عمليات «${esc(typ === 'merchant' ? E.merchantName(o) : o.name)}» ما تنحسب «التزام دائم» (حتى لو تصنيفها التزام). العملية نفسها تقدر تغيّرها لها.`, 'تمام')) return;
    o.isCommitment = false; st.put(n, o); st.touch(); await persist('مو التزام دائم'); closeSheet(null); render();
  },
  // «غير محدد» ← «حدّدها»
  defineOpen: (el) => { const [a, b] = String(el.dataset.pk || '').split('|'); const per = a && b ? { start: a, end: b, kind: 'custom' } : S.period; sheetDefine(el.dataset.f, per); },
  defineSet: async (el) => {
    const st = store(), X = S.defineCtx, D = X && DEFINE_F[X.field], c = st.get('categories', el.dataset.cat); if (!D || !c) return;
    const v = el.dataset.v === 'true' ? true : el.dataset.v === 'false' ? false : el.dataset.v;
    c[D.key] = v; st.put('categories', c); st.touch(); if (X.field === 'commit') E.syncCommitPlans(st);
    await persist(`${D.title}: ${c.name}`); render(); sheetDefine(X.field, X.per);
  },
  needGo: (el) => { closeSheet(null); go('txs', { filters: { kind: 'all', need: el.dataset.k, allTime: true } }); },
  pickFollow: () => finishPick({ follow: true }),
});

boot();
})();
