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
  cart: '<path d="M3 4h2l2.2 10.3a1 1 0 0 0 1 .7h9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
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
  fees: ['gray', 'receipt'], other: ['gray', 'dots'], __none: ['gray', 'question'], __person: ['yellow', 'person'],
};
const SUB_ICON = { 'transport.parking': 'parking', 'transport.ride': 'car', 'transport.fuel': 'fuel', 'bills.electricity': 'bolt', 'bills.water': 'drop', 'home.electricity': 'bolt', 'home.water': 'drop', 'telecom.devices': 'phone', 'telecom.prepaid': 'phone', 'travel.hotels': 'bed', 'hotels': 'bed', 'fees.fx': 'swap', 'social.occasions': 'gift', 'family.gifts': 'gift' };
function catUi(id) {
  if (!id) return { color: PAL.gray, icon: 'question' };
  let u = CAT_UI[id];
  if (!u && id.includes('.')) { const p = CAT_UI[id.split('.')[0]]; if (p) u = [p[0], SUB_ICON[id] || p[1]]; }
  if (!u && S.store) { const c = store().get('categories', id); if (c && c.parentId) return catUi(c.parentId); }
  u = u || ['gray', 'dots'];
  return { color: PAL[u[0]] || PAL.gray, icon: u[1], hue: u[0] };
}
const tint = (hex, a) => hex + (a || '1F');
function icCircle(u, cls, mini) { return `<span class="ic ${cls || ''}" style="background:${tint(u.color)};color:${u.color}">${ico(u.icon)}${mini ? `<span class="mini" style="color:${mini.color}">${ico(mini.icon)}</span>` : ''}</span>`; }
function txUi(tx) {
  const t = tx.transactionType;
  if (tx.transferSubtype === 'round_up') return { color: tx.classificationStatus === 'unclassified' ? PAL.yellow : PAL.gray, icon: 'coins' };
  if (t === 'Income') return { color: PAL.green, icon: 'income' };
  if (t === 'Refund') return { color: PAL.green, icon: 'refund' };
  if (t === 'InternalTransfer') return { color: PAL.gray, icon: 'swap' };
  if (t === 'CreditCardPayment') return { color: PAL.blue, icon: 'card' };
  if (t === 'CashWithdrawal' || t === 'CashDeposit') return { color: PAL.gray, icon: 'cash' };
  if (t === 'Unknown') return { color: PAL.yellow, icon: 'question' };
  if (tx.categoryId) return catUi(tx.subcategoryId && SUB_ICON[tx.subcategoryId] ? tx.subcategoryId : tx.categoryId);
  if (t === 'PersonTransfer') return catUi('__person');
  return catUi('__none');
}
function dirBadge(tx) {
  const t = tx.transactionType;
  if (t === 'Unknown' || (tx.transferSubtype === 'round_up' && tx.classificationStatus === 'unclassified')) return `<span class="dir w">${ico(tx.direction === 'out' ? 'out' : 'inn')}</span>`;
  if (['InternalTransfer', 'CreditCardPayment', 'CashWithdrawal', 'CashDeposit', 'LoanToPerson', 'LoanRepayment'].includes(t)) return `<span class="dir x">${ico('swap')}</span>`;
  if (t === 'Income' || t === 'Refund') return `<span class="dir n">${ico('inn')}</span>`;
  return `<span class="dir o">${ico('out')}</span>`;
}
const ftime = (hm) => { if (!hm) return ''; const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`; };
const money = (n, cls) => `<span class="num ${cls || ''}">${fmt(n)}</span><span class="cur">ر.س</span>`;

/* ---------- الحالة ---------- */
const S = {
  store: null, view: 'home', period: null, filters: { kind: 'all', allTime: false }, q: '',
  plan: null, planFile: null, decisions: {}, queue: [], teach: null,
  sheetResolve: null, dismissStandalone: false, swWaiting: null, busy: false,
};
const $ = (id) => document.getElementById(id);
const store = () => S.store;
const settings = () => S.store.settings;

async function persist() {
  const ch = S.store.takeChanges();
  try { await DB.apply(ch); }
  catch (e) { alert('تعذر الحفظ على الجهاز: ' + (e && e.message ? e.message : e)); throw e; }
}
function toast(msg, ms) {
  const t = $('toast'); t.textContent = msg; t.classList.remove('hide');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hide'), ms || 2600);
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
  if (tx.categoryId) { const c = E.catName(store(), tx.categoryId); const s = tx.subcategoryId ? store().get('categories', tx.subcategoryId) : null; return s ? `${c} › ${s.name}` : c; }
  if (tx.transactionType === 'Payment' || tx.transactionType === 'CashExpense') return 'بدون تصنيف';
  return TYPE_L[tx.transactionType];
}
function bucketName(key) {
  if (key === '__none' || key == null) return 'بدون تصنيف';
  if (key === '__person') return 'تحويلات لأشخاص (مؤقت)';
  return E.catName(store(), key);
}
function amountCell(tx) {
  const t = tx.transactionType;
  if (t === 'Income') return `<span class="num pos">+${fmt(tx.grossAmount)}</span>`;
  if (t === 'Refund') return `<span class="num pos">+${fmt(tx.grossAmount)}</span>`;
  if (t === 'Unknown' || (tx.transferSubtype === 'round_up' && tx.classificationStatus === 'unclassified')) return `<span class="num warn-t">${tx.direction === 'out' ? '−' : '+'}${fmt(tx.grossAmount)}</span>`;
  if (['InternalTransfer', 'CreditCardPayment', 'CashWithdrawal', 'CashDeposit', 'LoanToPerson', 'LoanRepayment'].includes(t)) return `<span class="num neu">⇄ ${fmt(tx.grossAmount)}</span>`;
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
  return `<div class="tx" data-action="openTx" data-id="${tx.id}">${icCircle(txUi(tx))}<div class="m"><div class="t">${esc(txTitle(tx))}</div><div class="s">${subLine(tx, withDate)}</div>${badges(tx)}</div><div class="a"><span class="num">${fmt(tx.grossAmount)}</span>${dirBadge(tx)}</div></div>`;
}
const sortTx = (a, b) => ((b.transactionDate || '') + (b.time || '')).localeCompare((a.transactionDate || '') + (a.time || ''));
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
  } catch (e) {
    $('main').innerHTML = `<div class="card"><h2>تعذر فتح قاعدة البيانات</h2><p>${esc(e && e.message ? e.message : e)}</p><p class="muted">إذا كنت في وضع التصفح الخاص، افتح التطبيق في وضع عادي.</p></div>`;
    return;
  }
  registerSW();
  markReady();
  const initial = (location.hash || '').replace('#', '');
  if (['home', 'spend', 'txs', 'add', 'accounts', 'more'].includes(initial)) S.view = initial;
  render();
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
const TITLES = { home: 'الرئيسية', spend: 'صرفياتك', txs: 'العمليات', add: 'إضافة واستيراد', accounts: 'الحسابات', more: 'المزيد', review: 'مراجعة الاستيراد', teach: 'تعليم كشف جديد', merchants: 'التجار', beneficiaries: 'المستفيدون', settings: 'الإعدادات', backup: 'النسخ الاحتياطي', report: 'التقرير', methods: 'طريقة الحساب', imports: 'سجل الاستيراد' };
const NAV_OF = { add: 'home', review: 'add', teach: 'add', imports: 'add', merchants: 'more', beneficiaries: 'accounts', settings: 'more', backup: 'more', report: 'more', methods: 'more' };
function render() {
  ensurePeriod();
  const v = S.view;
  document.body.className = 'v-' + v;
  $('title').textContent = TITLES[v] || 'المدير المالي';
  $('backBtn').classList.toggle('hide', !NAV_OF[v]);
  $('fab').classList.toggle('hide', ['add', 'review', 'teach', 'imports'].includes(v));
  const showPeriod = ['txs', 'report'].includes(v);
  const pb = $('periodBtn'); pb.classList.toggle('hide', !showPeriod);
  if (showPeriod) pb.textContent = (v === 'txs' && S.filters.allTime) ? 'كل الفترات' : fperiod(S.period);
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.view === (NAV_OF[v] || v)));
  const views = { home: vHome, spend: vSpend, txs: vTxs, add: vAdd, accounts: vAccounts, more: vMore, review: vReview, teach: vTeach, merchants: vMerchants, beneficiaries: vBeneficiaries, settings: vSettings, backup: vBackup, report: vReport, methods: vMethods, imports: vImports };
  $('main').innerHTML = (views[v] || vHome)();
}
function go(view, opts) {
  S.view = view; if (opts && opts.filters) S.filters = Object.assign({ kind: 'all', allTime: false }, opts.filters);
  if (history.replaceState) history.replaceState(null, '', '#' + view);
  render(); window.scrollTo(0, 0);
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
  const tools = `<div class="tools"><button data-action="go" data-view="settings" aria-label="الإعدادات">${ico('gear')}</button></div>`;
  if (!st.all('transactions').length) {
    return `<div class="hero" style="padding-bottom:34px">${tools}<div class="hi">المدير المالي</div><div class="big" style="font-size:28px">ابدأ برفع أول كشف</div><div class="sub">كل شي يُقرأ ويُحفظ على جهازك فقط</div></div>${banners()}
      <div class="card empty">${icCircle({ color: PAL.blue, icon: 'upload' })}<p>ارفع كشف حساب الإنماء أو كشف البطاقة الائتمانية بصيغة Excel.</p><button class="btn p" data-action="pickFile">رفع كشف</button></div>`;
  }
  const cur = E.currentCycle(st) || S.period;
  const R = E.computePeriod(st, cur);
  let h = `<div class="hero">${tools}<div class="hi">صرفك هذي الدورة</div><div class="big">${money(R.spend)}</div><div class="sub">${fperiod(cur)}${R.coverage.periodOpen ? ' · حتى اليوم' : ''}</div>
    <div class="gl">
      <div class="g" data-action="kpi" data-kind="income" data-p="cur">${ico('income')}<div><div class="l">الدخل المؤكد</div><div class="v">${money(R.income)}</div></div></div>
      <div class="g" data-action="go" data-view="spend">${ico('wallet')}<div><div class="l">الفائض</div><div class="v">${money(R.surplus)}</div></div></div>
      <div class="g" data-action="kpi" data-kind="commitments" data-p="cur">${ico('repeat')}<div><div class="l">الالتزامات المعروفة</div><div class="v">${money(R.commitments)}</div></div></div>
    </div></div>`;
  const ORD = { checking: 0, savings: 1, credit_card: 2, wallet: 3, unknown: 4, other: 5, cash: 6 };
  const accs = E.accountBalances(st).filter(a => a.isMine !== false).sort((x, y) => (ORD[x.type] ?? 9) - (ORD[y.type] ?? 9));
  h += `<div class="accs">${accs.map(accCard).join('')}</div>`;
  h += banners();
  // صرفك الأسبوعي
  const wk = E.weekOf(E.todayISO()), ser = E.spendSeries(st, wk, 'day');
  h += `<div class="card"><h2 class="soft">صرفك الأسبوعي</h2>${periodBox(wk, ser.total, { nav: false, action: 'weekToSpend' })}${chartSvg(ser, wk, { compact: true, action: 'weekToSpend' })}${cmpPill(E.comparePeriods(st, wk), wk)}
    <div class="linkrow" data-action="go" data-view="spend">${ico('chart')}<span>جميع صرفياتك</span><span class="sp"></span>${ico('chevL', 'chev')}</div></div>`;
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
  if (unk.length) items.push(`${cnt(unk.length, 'op')} نوعها غير معروف (${fmt(E.round2(unk.reduce((s, t) => s + t.grossAmount, 0)))}). <a data-action="kpi" data-kind="unclassified_all">صنّفها</a>`);
  if (R.temporaryCount) items.push(`${cnt(R.temporaryCount, 'tr')} لأشخاص بتصنيف مؤقت هذي الدورة (${fmt(R.temporarySpend)}). <a data-action="kpi" data-kind="temporary" data-p="cur">حدد تصنيفها</a>`);
  const unc = R.categories.find(c => !c.categoryId);
  if (unc && unc.amount) items.push(`مشتريات بدون تصنيف هذي الدورة (${fmt(unc.amount)}). <a data-action="kpi" data-kind="uncategorized" data-p="cur">صنّفها</a>`);
  const ru = st.all('transactions').filter(isRoundUpUnknown).length;
  if (ru) items.push(`وجهة التقريب غير محددة (${cnt(ru, 'op')}). <a data-action="setRoundUp">حددها</a>`);
  st.all('instruments').filter(i => i.instrumentOwner === 'unknown').forEach(i => items.push(`مالك «${esc(i.label)}» غير محدد، وعملياتها داخلة في إنفاقك مؤقتًا. <a data-action="editInstrument" data-id="${i.id}">حدده</a>`));
  st.all('accounts').filter(a => a.type === 'unknown').forEach(a => items.push(`نوع «${esc(a.name)}» غير محدد. <a data-action="editAccount" data-id="${a.id}">حدده</a>`));
  st.all('imports').filter(i => i.balanceValidated === false).forEach(i => items.push(`كشف «${esc(i.filename)}» يحتاج مراجعة: الرصيد ما تطابق.`));
  R.coverage.notes.forEach(n => items.push(`بيانات «${esc(n.name)}» ناقصة من ${fdate(n.from)} إلى ${fdate(n.to)}. <a data-action="pickFile">ارفع كشفها</a>`));
  if (!items.length) return '';
  const first = items.slice(0, 3), rest = items.slice(3);
  return `<div class="card alertcard"><div class="row"><span class="ic">${ico('question')}</span><div style="flex:1;min-width:0"><div class="t">تقريرك المالي غير مكتمل</div><ul>${first.map(i => `<li>${i}</li>`).join('')}</ul>${rest.length ? `<details class="more" style="margin-top:0"><summary class="go">و${rest.length === 1 ? 'تنبيه واحد آخر' : rest.length === 2 ? 'تنبيهان آخران' : rest.length + ' تنبيهات أخرى'}</summary><ul>${rest.map(i => `<li>${i}</li>`).join('')}</ul></details>` : ''}</div></div></div>`;
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
    const sc = s0 ? `<span class="sc" style="color:${u.color}">${ico(SUB_ICON[s0.subcategoryId] || u.icon)}<span class="num" style="color:var(--ink-2)">${(s0.amount / R.spend * 100).toFixed(2)}%</span></span>` : '';
    return `<div class="w" data-action="catDrill" data-cat="${key}"><div class="bar" style="background:${tint(u.color, '24')};width:${w}%"><span style="color:${u.color}">${ico(u.icon)}</span><div class="m"><div class="t">${esc(bucketName(c.categoryId))}</div><div class="p"><span class="num">${pct.toFixed(2)}%</span>${sc}</div></div></div><div class="a">${money(c.amount)}</div></div>`;
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
      ${row(`<span class="dir n">${ico('inn')}</span>`, 'إجمالي الدخل المؤكد', money(R.income), 'income')}
      ${row(`<span class="dir o">${ico('out')}</span>`, 'الإنفاق الحقيقي', money(R.spend), 'spend', spendSub)}
      ${row(`<span class="dir x">${ico('wallet')}</span>`, 'الفائض', money(R.surplus, R.surplus < 0 ? 'neg' : ''), null, 'الدخل المؤكد − الإنفاق الحقيقي')}
      ${row(`<span class="dir x">${ico('repeat')}</span>`, 'الالتزامات المعروفة', money(R.commitments), 'commitments', cnt(R.commitmentItems.length, 'op'))}
      <details class="more"><summary>أرقام أكثر</summary>
      ${row(`<span class="dir w">${ico('out')}</span>`, 'خارج غير مصنف', money(R.unclassifiedOut), 'unclassified_out', R.unclassifiedOutCount ? `${cnt(R.unclassifiedOutCount, 'op')}${R.roundUpUnknownCount ? `، منها تقريب ${fmt(R.roundUpUnknown)}` : ''}` : 'لا يوجد', 'sub')}
      ${row(`<span class="dir w">${ico('inn')}</span>`, 'داخل غير مصنف', money(R.unclassifiedIn), 'unclassified_in', R.unclassifiedInCount ? cnt(R.unclassifiedInCount, 'op') : 'لا يوجد', 'sub')}
      ${row(`<span class="dir x">${ico('swap')}</span>`, 'التحويلات الداخلية', money(R.internal), 'internal', `${cnt(R.internalCount, 'tr')}${R.internalOneSided ? `، ${R.internalOneSided === R.internalCount ? 'كلها' : R.internalOneSided} غير مكتمل الربط` : ''}`, 'sub')}
      ${row(`<span class="dir x">${ico('card')}</span>`, 'سداد البطاقات', money(R.cardPayments), 'card', `${cnt(R.cardPaymentsCount, 'op')}${R.cardPaymentsUnmatched ? `، ${R.cardPaymentsUnmatched === R.cardPaymentsCount ? 'كلها' : R.cardPaymentsUnmatched} غير مطابقة` : ''}`, 'sub')}
      ${row(`<span class="dir x">${ico('receipt')}</span>`, 'الرسوم', money(R.fees), 'fees', null, 'sub')}
      </details></div>`;
  }
  h += `<div class="card"><h2 class="soft">وين راحت الدراهم؟</h2>`;
  if (sel && bucket === 'day') {
    const list = st.all('transactions').filter(t => (t.transactionDate || t.postingDate) === sel).sort(sortTx);
    h += list.length ? list.map(t => txRow(t)).join('') : `<div class="muted">ما فيه عمليات في هذا اليوم.</div>`;
  } else h += whereList(R);
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
const KIND_L = { all: 'الكل', spend: 'إنفاق', income: 'دخل', internal: 'تحويلات داخلية', card: 'سداد بطاقات', unclassified_out: 'خارج غير مصنف', unclassified_in: 'داخل غير مصنف', unclassified_all: 'غير معروف', temporary: 'تصنيف مؤقت', uncategorized: 'بدون تصنيف', commitments: 'التزامات', roundup: 'تقريب', unowned: 'مالك الأداة غير محدد', fees: 'رسوم' };
function matchKind(t, kind) {
  const st = store();
  switch (kind) {
    case 'all': return true;
    case 'spend': return E.spendEffect(t) !== 0 || E.feeOf(t) > 0;
    case 'income': return t.transactionType === 'Income';
    case 'internal': return t.transactionType === 'InternalTransfer' && !isRoundUpUnknown(t);
    case 'card': return t.transactionType === 'CreditCardPayment';
    case 'unclassified_out': return (t.transactionType === 'Unknown' && t.direction === 'out') || isRoundUpUnknown(t);
    case 'unclassified_in': return t.transactionType === 'Unknown' && t.direction === 'in';
    case 'unclassified_all': return t.transactionType === 'Unknown';
    case 'temporary': return t.classificationStatus === 'temporary';
    case 'uncategorized': return (t.transactionType === 'Payment' || t.transactionType === 'CashExpense') && !t.categoryId;
    case 'commitments': return t.transactionType === 'Payment' && E.effective(st, t, 'rec') === 'recurring' && E.isCommitmentCat(st, t);
    case 'roundup': return t.transferSubtype === 'round_up';
    case 'unowned': { const i = insOf(t); return !!(i && i.instrumentOwner === 'unknown'); }
    case 'fees': return E.feeOf(t) > 0;
  }
  return true;
}
function filteredTxs() {
  const f = S.filters, q = S.q.trim().toLowerCase();
  let list = f.allTime ? store().all('transactions') : periodTxs();
  list = list.filter(t => {
    if (!matchKind(t, f.kind)) return false;
    if (f.accountId && t.accountId !== f.accountId) return false;
    if (f.instrumentId && t.instrumentId !== f.instrumentId) return false;
    if (f.method && (t.paymentMethod || 'Unknown') !== f.method) return false;
    if (f.source && !(t.sourceLinks || []).some(s => s.sourceType === f.source)) return false;
    if (f.merchantId && t.merchantId !== f.merchantId) return false;
    if (f.beneficiaryId && t.beneficiaryId !== f.beneficiaryId) return false;
    if (f.categoryId) {
      if (f.categoryId === '__none') { if (!((t.transactionType === 'Payment' || t.transactionType === 'CashExpense') && !t.categoryId)) return false; }
      else if (f.categoryId === '__person') { if (!(t.transactionType === 'PersonTransfer' && !t.categoryId)) return false; }
      else if (f.categoryId === 'fees') { if (!(t.categoryId === 'fees' || E.feeOf(t) > 0)) return false; }
      else if (t.categoryId !== f.categoryId) return false;
      if (E.spendEffect(t) === 0 && E.feeOf(t) === 0) return false;
    }
    if (q) {
      const m = merchantOf(t), b = benOf(t), a = accOf(t.accountId), i = insOf(t);
      const hay = [txTitle(t), t.merchantRaw, t.beneficiaryRaw, m && m.name, m && (m.aliases || []).join(' '), b && b.name, b && b.bank, a && a.name, a && a.bank, i && i.label, i && i.last4, catLabel(t), t.note, t.reference].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  return list.sort(sortTx);
}
function vTxs() {
  const f = S.filters, list = filteredTxs();
  const active = [];
  if (f.kind !== 'all') active.push(KIND_L[f.kind]);
  if (f.categoryId) active.push(bucketName(f.categoryId === '__none' ? null : f.categoryId));
  if (f.accountId) { const a = accOf(f.accountId); active.push(a ? a.name : 'حساب'); }
  if (f.instrumentId) { const i = store().get('instruments', f.instrumentId); active.push(i ? i.label : 'أداة'); }
  if (f.method) active.push(METHOD_L[f.method] || f.method);
  if (f.source) active.push(SRC_L[f.source] || f.source);
  if (f.merchantId) { const m = store().get('merchants', f.merchantId); active.push(m ? m.name : 'تاجر'); }
  if (f.beneficiaryId) { const b = store().get('beneficiaries', f.beneficiaryId); active.push(b ? b.name : 'مستفيد'); }
  let h = `<div class="card noprint" style="padding:10px"><input type="search" id="q" placeholder="ابحث: تاجر، مستفيد، تصنيف، بنك، آخر أرقام البطاقة، ملاحظة…" value="${esc(S.q)}" data-input="search">
    <div class="chips" style="margin-top:8px">${['all', 'spend', 'income', 'uncategorized', 'temporary', 'unclassified_out', 'internal', 'card'].map(k => `<button class="chip ${f.kind === k ? 'on' : ''}" data-action="setKind" data-kind="${k}">${KIND_L[k]}</button>`).join('')}<button class="chip" data-action="filterSheet">فلاتر أكثر…</button></div>
    ${active.length || f.allTime ? `<div class="small muted" style="margin-top:6px">الفلاتر: ${esc(active.join(' + ') || 'بدون')}${f.allTime ? ' · كل الفترات' : ''} — <a href="#" data-action="clearFilters">مسح</a></div>` : ''}</div>`;
  return h + `<div id="txlist">${txListHtml(list)}</div>`;
}
function txListHtml(list) {
  list = list || filteredTxs();
  const st = store();
  const total = E.round2(list.reduce((s, t) => { const ins = insOf(t); if (ins && ins.includeInPersonalSpend === false) return s; return s + E.spendEffect(t) + E.feeOf(t); }, 0));
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
  h += `<div class="card"><h2>إدخال سريع</h2><div class="btns" style="flex-wrap:nowrap"><input type="text" id="quick" placeholder="مثال: قهوة 18" enterkeyhint="done" style="flex:1"><button class="btn p" data-action="quickAdd">أضف</button></div>
    <div class="btns" style="margin-top:10px"><button class="btn" data-action="manual" data-kind="expense">مصروف</button><button class="btn" data-action="manual" data-kind="withdrawal">سحب نقدي</button><button class="btn" data-action="manual" data-kind="deposit">إيداع نقدي</button><button class="btn" data-action="manual" data-kind="income">دخل</button><button class="btn" data-action="reconcileCash">تسوية النقد</button></div></div>`;
  h += `<div class="card"><h2>سجل الاستيراد <span class="sp"></span><button class="btn" data-action="go" data-view="imports">عرض الكل</button></h2>${importList(5)}</div>`;
  return h;
}
function importList(limit) {
  const imps = store().all('imports').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!imps.length) return `<div class="muted">ما فيه استيراد للحين.</div>`;
  return `<div class="list">${imps.slice(0, limit || 999).map(i => { const a = accOf(i.accountId); const bc = i.balanceValidated === true ? '<span class="b g">متوازن</span>' : i.balanceValidated === false ? '<span class="b r">يحتاج مراجعة</span>' : '<span class="b n">فحص الرصيد غير متاح</span>';
    const cp = i.cardPaymentsStatus ? `<span class="b ${i.cardPaymentsStatus === 'matched' ? 'g' : 'w'}">المدفوعات: ${i.cardPaymentsStatus === 'matched' ? 'مطابقة' : i.cardPaymentsStatus === 'partial' ? 'مطابقة جزئيًا' : 'غير مطابقة'}</span>` : '';
    return `<div class="it"><div class="m"><div class="t">${esc(a ? a.name : '—')}</div><div class="s">${esc(i.filename)} · ${fdate(i.startDate, true)} – ${fdate(i.endDate, true)} · ${i.transactionCount} سطر (${i.created} جديدة، ${i.merged} مدمجة)</div><div class="badges">${bc}${cp}<span class="b n">استورد ${fdate(i.createdAt.slice(0, 10), true)}</span></div></div><button class="btn r" data-action="deleteImport" data-id="${i.id}">حذف</button></div>`; }).join('')}</div>`;
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
  h += `<div class="kpis k5">${tile('تقريب', s.roundUps, 'خارج غير مصنف حتى تحدد وجهته')}${tile('تحويلات لأشخاص', s.personTransfers, s.temporary ? (s.temporary === s.personTransfers ? 'كلها بتصنيف مؤقت' : `${s.temporary} بتصنيف مؤقت`) : '')}${tile('غير مصنفة', s.unclassified)}${tile('مشتريات بدون تصنيف', s.uncategorized)}${tile('تجار جدد بدون تصنيف', s.unknownMerchants)}</div>`;
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
  let h = `<div class="card"><h2>الحسابات</h2><div class="list">${E.accountBalances(st).map(a => `<div class="it" data-action="editAccount" data-id="${a.id}">${icCircle(a.type === 'credit_card' ? { color: PAL.blue, icon: 'card' } : a.type === 'cash' ? { color: PAL.green, icon: 'cash' } : a.type === 'wallet' ? { color: PAL.violet, icon: 'wallet' } : { color: '#3A49D6', icon: 'bank' }, 's')}<div class="m"><div class="t">${esc(a.name)}</div><div class="s">${esc(a.bank || '')} · ${ACC_L[a.type]}${a.last4 ? ' · …' + a.last4 : ''}${a.isMine ? '' : ' · ليس لك'}</div></div>${a.balance == null ? '<span class="muted small">الرصيد غير معروف</span>' : num(a.type === 'credit_card' ? Math.abs(a.balance) : a.balance)}</div>`).join('') || '<div class="muted">لا توجد حسابات بعد.</div>'}</div>
    <div class="btns" style="margin-top:10px"><button class="btn" data-action="newAccount">+ حساب</button><button class="btn" data-action="reconcileCash">تسوية النقد</button></div></div>`;
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
    ${item('report', 'التقرير', 'تقرير الفترة المختارة، للطباعة أو الحفظ PDF', 'doc', PAL.violet)}
    ${item('merchants', 'التجار', 'صنّف تاجرًا مرة ويتطبق على كل عملياته', 'store', PAL.magenta)}
    ${item('beneficiaries', 'المستفيدون', 'تحويلاتك للأشخاص وحساباتك', 'people', PAL.yellow)}
    ${item('imports', 'سجل الاستيراد', 'الكشوف المستوردة وحذفها', 'upload', PAL.aqua)}
  </div></div><div class="card"><div class="list">
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
    <div class="card"><h2>وجهة التقريب</h2><p class="small">الحالية: <b>${esc(destLabel)}</b></p><button class="btn" data-action="setRoundUp">تغيير</button></div>
    <div class="card"><h2>تذكير النسخة الاحتياطية</h2><label class="f">ذكّرني إذا مرّ (يوم)</label><input type="number" id="bkdays" min="1" max="60" value="${s.backupReminderDays || 7}"></div>
    <div class="card"><button class="btn p w100" data-action="saveSettings">حفظ الإعدادات</button></div>`;
}
function vBackup() {
  const s = settings();
  return `<div class="card"><h2>تصدير نسخة احتياطية</h2><p class="small">ملف JSON فيه كل بياناتك: الحسابات والعمليات والتجار والمستفيدون والتصنيفات والقواعد والإعدادات. الآيبانات وأرقام الهوية ما تكون فيه لأنها ما تنحفظ أصلًا.</p>
    <p class="small muted">آخر نسخة: ${s.lastBackupAt ? fday(s.lastBackupAt.slice(0, 10)) : 'لا يوجد'}</p><button class="btn p" data-action="backup">تصدير الآن</button>
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
    <div><div class="l">خارج غير مصنف</div><div class="v">${num(R.unclassifiedOut)}</div></div><div><div class="l">داخل غير مصنف</div><div class="v">${num(R.unclassifiedIn)}</div></div><div><div class="l">الالتزامات المعروفة</div><div class="v">${num(R.commitments)}</div></div>
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
    <tr><td>− أصل السحب النقدي</td><td class="n">${num(b.cashOut)}</td></tr><tr><td>− خارج غير مصنف (منه التقريب)</td><td class="n">${num(b.unclassifiedOut)}</td></tr><tr><td>− مشتريات أدوات مستثناة من مصروفك</td><td class="n">${num(b.excludedOut)}</td></tr>
    <tr><td><b>= إنفاق دُفع من الحسابات مباشرة</b></td><td class="n"><b>${num(b.direct)}</b></td></tr><tr><td>+ مشتريات البطاقات الائتمانية</td><td class="n">${num(b.cardPurchases)}</td></tr><tr><td>+ المصروف النقدي</td><td class="n">${num(b.cashExpense)}</td></tr><tr><td>− الاستردادات</td><td class="n">${num(b.refunds)}</td></tr>
    <tr><td><b>= الإنفاق الحقيقي</b></td><td class="n"><b>${num(b.total)}</b></td></tr>${Math.abs(b.diff) >= 0.01 ? `<tr><td><b class="warn-t">فرق غير مفسر</b></td><td class="n">${num(b.diff)}</td></tr>` : ''}</tbody></table>`;
  h += `<p class="small muted" style="margin-top:16px">طريقة حساب كل رقم موجودة في صفحة «طريقة الحساب» داخل التطبيق.</p></div>`;
  return h;
}

/* ---------- طريقة الحساب ---------- */
function vMethods() {
  return `<div class="card prose"><h2>طريقة الحساب</h2>
  <p>هذه الصفحة تتحدث مع كل تغيير في طريقة الحساب.</p>
  <h3>أثر كل نوع عملية</h3>
  <table><thead><tr><th>النوع</th><th>الإنفاق</th><th>الدخل</th></tr></thead><tbody>
  <tr><td>دفع (شراء، فاتورة، قسط، تبرع، رسوم)</td><td>+ الأصل</td><td>0</td></tr><tr><td>دخل</td><td>0</td><td>+ (المؤكد فقط)</td></tr>
  <tr><td>تحويل داخلي، سداد بطاقة، سحب نقدي، إيداع نقدي، سلفة وسدادها</td><td>0</td><td>0</td></tr><tr><td>تحويل لشخص خارجي</td><td>+ مؤقتًا حتى يُعاد تصنيفه</td><td>0</td></tr>
  <tr><td>استرداد</td><td>− من نفس التصنيف</td><td>0</td></tr><tr><td>مصروف نقدي</td><td>+</td><td>0</td></tr><tr><td>غير معروف</td><td colspan="2">لا يدخل؛ يظهر في «خارج/داخل غير مصنف»</td></tr></tbody></table>
  <p><b>الرسوم</b>: كل عملية فيها أصل ورسوم وضريبة وإجمالي. الرسوم والضريبة تنحسب إنفاقًا تحت «رسوم» دائمًا، حتى لو الأصل ما ينحسب (مثل حوالة لحسابك: الـ200 ما تنحسب والـ0.29 تنحسب).</p>
  <h3>الأرقام الرئيسية</h3><ul>
  <li><b>الدخل المؤكد</b> = مجموع عمليات الدخل المصنفة.</li>
  <li><b>الإنفاق الحقيقي</b> = مجموع أثر الإنفاق للعمليات المصنفة + الرسوم. يشمل التحويلات لأشخاص بتصنيف مؤقت (معلّمة)، ومشتريات الأدوات اللي مالكها غير محدد (معلّمة). لا يشمل الأدوات اللي استبعدتها من مصروفك.</li>
  <li>المشتريات اللي ما لها تصنيف تدخل الإنفاق تحت «بدون تصنيف»، لأن نوعها (دفع) معروف.</li>
  <li><b>الفائض</b> = الدخل المؤكد − الإنفاق الحقيقي. غير المصنف ما يدخل فيه.</li>
  <li><b>خارج/داخل غير مصنف</b> = العمليات اللي نوعها غير معروف، والتقريب اللي وجهته غير محددة.</li>
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
  <li>«وين راحت الدراهم؟»: نسبة كل تصنيف = إنفاقه ÷ الإنفاق الحقيقي للفترة. والرقم الصغير بجانبها = نسبة أكبر تصنيف فرعي فيه من نفس الإجمالي.</li></ul>
  <h3>بطاقة الإنماء الائتمانية</h3><p>الرصيد الختامي = الرصيد السابق (باتجاهه) + المشتريات + الرسوم − المدفوعات − الاستردادات. الملف يكتب الرصيد السابق بدون إشارة، فيُحسب بالاتجاهين ويُعتمد اللي يطابق «كامل المبلغ المستحق» و«الحد − المتاح» معًا؛ وإذا ما اتضح يسألك التطبيق.</p>
  <h3>منع التكرار</h3><ul>
  <li>عمليات نفس الملف ما تندمج أبدًا.</li>
  <li>المرشحتان للمطابقة: من ملفين مختلفين، نفس الاتجاه والعملة والمبلغ بالهللة، فرق التاريخ الفعلي 3 أيام أو أقل، وما تكون أداتان معروفتان ومختلفتان.</li>
  <li>دليل حاسم: نفس رقم المرجع، أو نفس الرصيد بعد العملية لنفس الحساب.</li>
  <li>النقاط (المفقود = صفر): التاريخ 40/30/20/10 (نفس اليوم/يوم/يومين/3)، الوقت 40/35/30/20 (5/15/30/60 دقيقة؛ أكثر من ساعة = مستقلتان)، التاجر 30 (مؤكد) أو 20 (تشابه قوي، للتجار فقط)، الأداة 10.</li>
  <li>90 فأكثر دمج تلقائي، 65–89 مراجعة، أقل من 65 مستقلة. التعادل بين مرشحين = مراجعة. الإدخال اليدوي ما يندمج تلقائيًا.</li>
  <li>استثناء كشف البطاقة (بدون وقت): دمج تلقائي إذا تطابق التاريخ والبطاقة والتاجر وما فيه مرشح منافس.</li></ul>
  <h3>الرسوم الأجنبية</h3><p>في شراء VISA بسعر أصلي بالريال، الفرق بين المخصوم والسعر يُسجَّل رسومًا فقط إذا طابق نسبة رسوم العملة الأجنبية (2% + ضريبتها = 2.3%)، وتقسيمه بين رسوم وضريبة غير معروف. غير ذلك ما يُفصل.</p>
  <h3>التقريب</h3><p>سطر يكرر نص الشراء وينتهي بـ«####» ومبلغه يكمّل الشراء لأقرب ريال. يُربط بالشراء للتفسير فقط. وجهته غير المحددة تُظهره تحت «خارج غير مصنف — تقريب»؛ إذا حددت حساب ادخار يصير تحويلًا داخليًا، وإذا جهة خيرية يصير إنفاقًا تحت «تبرعات».</p>
  <h3>الخصوصية</h3><p>قبل الحفظ تنخفي: الآيبان، رقم الهوية، أرقام الحسابات، رقم الجوال إذا ظهر كرقم فاتورة، أرقام عقود التمويل. يبقى آخر 4 أرقام. المستفيد يُعرف ببصمة SHA-256 لآيبانه (تقليل تعرض، مو تشفير سري). المراجع البنكية تبقى للمطابقة.</p></div>`;
}

/* ---------- النوافذ ---------- */
function openSheet(html) { $('sheet').innerHTML = `<div class="sheet-bg" data-action="sheetBg"><div class="sheet" role="dialog">${html}</div></div>`; }
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
  const canCat = ['Payment', 'CashExpense', 'PersonTransfer', 'Refund', 'Unknown'].includes(t.transactionType) && t.transferSubtype !== 'round_up';
  const types = ['Payment', 'Income', 'InternalTransfer', 'CreditCardPayment', 'PersonTransfer', 'Refund', 'CashWithdrawal', 'Unknown'];
  const recDef = E.effective(st, Object.assign({}, t, { recurrenceType: null }), 'rec'), necDef = E.effective(st, Object.assign({}, t, { necessityType: null }), 'nec');
  const recL = { recurring: 'متكرر', variable: 'متغير' }, necL = { essential: 'ضروري', discretionary: 'اختياري' };
  const u = txUi(t);
  const src0 = (t.sourceLinks || [])[0];
  let h = `<h3><button class="close" data-action="closeSheet" aria-label="إغلاق">×</button><span class="sp"></span></h3>
    <div class="txh">
      ${canCat ? `<button class="catbtn" data-action="txCat" data-id="${t.id}" style="border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${ico(u.icon)}</span><span>${esc(catLabel(t))}</span></button>`
        : `<div class="catbtn" style="cursor:default;border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${ico(u.icon)}</span><span>${TYPE_L[t.transactionType]}</span></div>`}
      <div class="nm">${m ? `<span class="ic s" style="background:var(--pri-soft);color:var(--pri)">${ico('store')}</span>` : b ? `<span class="ic s" style="background:var(--pri-soft);color:var(--pri)">${ico('person')}</span>` : ''}<span>${esc(txTitle(t))}</span>${m ? `<a data-action="merchantDrill" data-id="${m.id}" aria-label="كل عمليات التاجر" style="display:flex">${ico('chevL')}</a>` : ''}</div>
      <div class="amt">${money(t.grossAmount)}${dirBadge(t)}</div>
      <div class="badges" style="justify-content:center">${badges(t).replace(/^<div class="badges">|<\/div>$/g, '')}</div>
    </div>
    <input type="hidden" id="s_cat" value="${esc(t.categoryId || '')}"><input type="hidden" id="s_sub" value="${esc(t.subcategoryId || '')}">
    <div class="drow">${ico('note')}<div class="m"><input type="text" id="s_note" placeholder="إضافة ملاحظة" value="${esc(t.note || '')}"></div></div>
    <div class="drow">${ico(acc && acc.type === 'credit_card' ? 'card' : 'bank')}<div class="m">${esc(acc ? acc.name : '—')}${ins ? ` · ${esc(ins.label)}` : ''}${t.paymentMethod && t.paymentMethod !== 'Unknown' ? ` · ${METHOD_L[t.paymentMethod] || esc(t.paymentMethod)}` : ''}</div></div>
    <div class="drow">${ico('cal')}<div class="m">${fday(t.transactionDate)}${t.time ? '، ' + ftime(t.time) : ''}</div></div>
    ${src0 ? `<div class="drow" style="align-items:flex-start">${ico('msg')}<div class="m small">${esc(src0.rawDescription || '')}</div></div>` : ''}`;
  if (t.transferSubtype === 'round_up') {
    const orig = t.roundUpOfId ? st.get('transactions', t.roundUpOfId) : null;
    h += `<div class="banner i" style="margin-top:10px"><div>تقريب لأقرب ريال${orig ? ` لشراء ${fmt(orig.grossAmount)} من ${esc(txTitle(orig))}` : ''}. <a data-action="setRoundUp">حدد وجهة التقريب</a> (تنطبق على كل عمليات التقريب).</div></div>`;
  }
  h += `<details class="more"><summary>تعديل النوع والخصائص والتفاصيل</summary>
    <label class="f">النوع</label><select id="s_type">${types.map(x => `<option value="${x}" ${x === t.transactionType ? 'selected' : ''}>${TYPE_L[x]}</option>`).join('')}</select>
    <div id="s_cp_wrap" class="${t.transactionType === 'InternalTransfer' ? '' : 'hide'}"><label class="f">الحساب الآخر (لك)</label><select id="s_cp">${ownAccountOptions(t.counterpartyAccountId, true)}</select></div>`;
  if (canCat) h += `<div class="grid2"><div><label class="f">التكرار</label><select id="s_rec"><option value="">افتراضي (${recL[recDef] || '—'})</option><option value="recurring" ${t.recurrenceType === 'recurring' ? 'selected' : ''}>متكرر</option><option value="variable" ${t.recurrenceType === 'variable' ? 'selected' : ''}>متغير</option></select></div>
      <div><label class="f">الضرورة</label><select id="s_nec"><option value="">افتراضي (${necL[necDef] || '—'})</option><option value="essential" ${t.necessityType === 'essential' ? 'selected' : ''}>ضروري</option><option value="discretionary" ${t.necessityType === 'discretionary' ? 'selected' : ''}>اختياري</option></select></div></div>`;
  h += `<dl class="kv" style="margin-top:14px">
    <dt>تاريخ العملية</dt><dd>${fdate(t.transactionDate, true)}</dd>${t.postingDate && t.postingDate !== t.transactionDate ? `<dt>تاريخ القيد</dt><dd>${fdate(t.postingDate, true)}</dd>` : ''}
    <dt>الأداة</dt><dd>${ins ? esc(ins.label) + ` (المالك: ${OWNER_L[ins.instrumentOwner]}) <a data-action="editInstrument" data-id="${ins.id}">تعديل</a>` : 'أداة دفع غير محددة'}</dd>
    ${m ? `<dt>التاجر</dt><dd>${esc(m.name)} <a data-action="editMerchant" data-id="${m.id}">تعديل التاجر</a></dd>` : ''}
    ${b ? `<dt>المستفيد</dt><dd>${esc(b.name)} · ${esc(b.bank || '')} …${esc(b.accountLast4 || '')} <a data-action="editBeneficiary" data-id="${b.id}">تعديل</a></dd>` : ''}
    <dt>الإجمالي</dt><dd>${num(t.grossAmount)}</dd>${(t.feeAmount || t.vatAmount) ? `<dt>الأصل</dt><dd>${num(t.principalAmount)}</dd><dt>الرسوم</dt><dd>${num(t.feeAmount)}${t.feeTaxBreakdownKnown === false ? ' (الضريبة داخلها؛ التقسيم غير معروف)' : ''}</dd>${t.feeTaxBreakdownKnown !== false ? `<dt>ضريبة الرسوم</dt><dd>${num(t.vatAmount)}</dd>` : ''}` : ''}
    ${t.foreignAmount ? `<dt>المبلغ الأصلي</dt><dd><span class="num">${fmt(t.foreignAmount)} ${esc(t.foreignCurrency || '')}</span></dd>` : ''}
    ${t.reference ? `<dt>المرجع</dt><dd class="small"><span class="num">${esc(t.reference)}</span></dd>` : ''}${t.balanceAfter != null ? `<dt>الرصيد بعد العملية</dt><dd>${num(t.balanceAfter)}</dd>` : ''}
    ${(t.linkedTransactionIds || []).length ? `<dt>مرتبطة بـ</dt><dd>${t.linkedTransactionIds.map(x => { const o = st.get('transactions', x); return o ? `<a data-action="openTx" data-id="${o.id}">${esc(txTitle(o))} ${fmt(o.grossAmount)}</a>` : ''; }).join('<br>')}</dd>` : ''}</dl>
    <h3 style="margin-top:14px;font-size:15px">المصادر (${(t.sourceLinks || []).length})</h3>${(t.sourceLinks || []).map(sl => { const imp = sl.importId ? st.get('imports', sl.importId) : null; return `<div class="small muted" style="margin-top:6px">${SRC_L[sl.sourceType] || sl.sourceType}${imp ? ' · ' + esc(imp.filename) : ''}</div><div class="raw">${esc(sl.rawDescription || '')}</div>`; }).join('')}
    </details>
    <div class="btns" style="margin-top:14px"><button class="btn p" style="flex:1" data-action="saveTx" data-id="${t.id}">حفظ</button>${(t.sourceLinks || []).every(sl => sl.sourceType === 'manual' || sl.sourceType === 'cash_reconciliation') ? `<button class="btn r" data-action="deleteTx" data-id="${t.id}">حذف</button>` : ''}</div>`;
  openSheet(h);
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
    h += `<div class="catgrid">${mains.map(c => { const u = catUi(c.id); return `<button data-action="pickMain" data-id="${c.id}" class="${P.cat === c.id ? 'on' : ''}"><span style="color:${u.color};display:flex">${ico(u.icon)}</span><span>${esc(c.name)}</span></button>`; }).join('')}</div>`;
    if (P.allowNone) h += `<div style="text-align:center;margin-top:16px"><button class="btn" data-action="pickNone">بدون تصنيف</button></div>`;
  } else {
    const c = st.get('categories', P.cat), u = catUi(c.id);
    const subs = st.all('categories').filter(x => x.parentId === c.id && x.active !== false).sort(byOrder);
    h += `<div class="subpick"><div class="sel"><span class="catbtn" style="border-color:${tint(u.color, '66')}"><span style="color:${u.color};display:flex">${ico(u.icon)}</span><span>${esc(c.name)}</span></span><button class="close" data-action="pickBack" aria-label="رجوع للتصنيفات">×</button></div>
      <div class="chips2"><button data-action="pickSub" data-id="" class="${!P.sub ? 'on' : ''}">${esc(c.name)} بدون فرعي</button>${subs.map(x => `<button data-action="pickSub" data-id="${x.id}" class="${P.sub === x.id ? 'on' : ''}">${SUB_ICON[x.id] ? `<span style="color:${u.color};display:flex">${ico(SUB_ICON[x.id])}</span>` : ''}${esc(x.name)}</button>`).join('')}</div></div>`;
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
    ${S.view === 'txs' ? `<div class="it" data-action="allTime" style="padding:10px 0;cursor:pointer"><b>كل الفترات</b></div>` : ''}
    <div class="list">${cs.map((c, i) => `<div class="it" data-action="setPeriod" data-i="${i}"><div class="m"><div class="t">${fperiod(c)}</div><div class="s">${c.kind === 'month' ? 'شهر ميلادي' : c.startsWithSalary ? 'تبدأ براتب' : 'بداية افتراضية (يوم الراتب)'}${c.start === cur.start && c.end === cur.end ? ' · المختارة' : ''}</div></div></div>`).join('')}</div>
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
    <label class="f">التصنيف</label>${sel('f_cat', [['__none', 'بدون تصنيف'], ['__person', 'تحويلات لأشخاص (مؤقت)']].concat(st.all('categories').filter(c => !c.parentId).sort((a, b) => a.order - b.order).map(c => [c.id, c.name])), f.categoryId)}
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
  if (kind === 'expense') h += `<label class="f">الوصف أو التاجر</label><input type="text" id="m_desc" value="${esc(pre.description || '')}"><label class="f">دُفع عن طريق</label><select id="m_ins">${insList.map(i => `<option value="${i.id}" ${i.id === cashIns.id ? 'selected' : ''}>${esc(i.label)}</option>`).join('')}</select>
    <label class="f">التصنيف</label>${catField(pre.categoryId, pre.subcategoryId)}
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
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveBeneficiary" data-id="${b.id}">حفظ</button><button class="btn" data-action="benDrill" data-id="${b.id}">حوالاته</button></div>`);
}
function sheetMerchant(id) {
  const m = store().get('merchants', id); if (!m) return;
  const cat = m.categoryId || m.suggestedCategoryId, sub = m.categoryId ? m.subcategoryId : m.suggestedSubcategoryId;
  openSheet(`<h3>${esc(m.name)}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><div class="small muted">الأسماء في الكشوف: ${esc((m.aliases || []).join('، '))}</div>
    <label class="f">التصنيف</label>${catField(cat, sub)}
    <div class="grid2"><div><label class="f">التكرار (للتاجر)</label><select id="mm_rec"><option value="">من التصنيف</option><option value="recurring" ${m.defaultRecurrenceType === 'recurring' ? 'selected' : ''}>متكرر</option><option value="variable" ${m.defaultRecurrenceType === 'variable' ? 'selected' : ''}>متغير</option></select></div>
    <div><label class="f">الضرورة (للتاجر)</label><select id="mm_nec"><option value="">من التصنيف</option><option value="essential" ${m.defaultNecessityType === 'essential' ? 'selected' : ''}>ضروري</option><option value="discretionary" ${m.defaultNecessityType === 'discretionary' ? 'selected' : ''}>اختياري</option></select></div></div>
    <p class="small muted">يتطبق على كل عمليات التاجر السابقة والقادمة، ما عدا اللي صنفتها يدويًا لعملية وحدة.</p>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveMerchant" data-id="${m.id}">حفظ</button><button class="btn" data-action="merchantDrill" data-id="${m.id}">عملياته</button></div>`);
}
function sheetRoundUp() {
  const s = settings(), dest = s.roundUpDestination || { kind: 'unknown' };
  openSheet(`<h3>وجهة التقريب<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><p class="small">تنطبق على كل عمليات التقريب السابقة والقادمة.</p>
    <label class="f"><input type="radio" name="ru" value="unknown" ${dest.kind === 'unknown' ? 'checked' : ''}> غير محددة (تبقى «خارج غير مصنف — تقريب»)</label>
    <label class="f"><input type="radio" name="ru" value="account" ${dest.kind === 'account' ? 'checked' : ''}> حساب ادخار لي (تحويل داخلي)</label><select id="ru_acc">${ownAccountOptions(dest.accountId, false)}</select>
    <label class="f"><input type="radio" name="ru" value="charity" ${dest.kind === 'charity' ? 'checked' : ''}> جهة خيرية (إنفاق تحت «تبرعات»)</label>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveRoundUp">حفظ</button></div>`);
}
function sheetReconcile() {
  const st = store(); const { cash } = E.ensureCashAccount(st); persist();
  const bal = E.cashBalance(st, cash.id);
  openSheet(`<h3>تسوية النقد<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><p>رصيد النقد في النظام: <b>${num(bal)}</b></p>
    <label class="f">الموجود معك فعليًا</label><input type="text" inputmode="decimal" id="c_actual" placeholder="0.00">
    <p class="small muted">إذا الفعلي أقل، الفرق يُسجل «مصروف نقدي غير مفصل» بدل ما يضيع من التحليل. إذا أكثر، يُسجل «داخل غير مصنف».</p>
    <div class="btns"><button class="btn p" data-action="doReconcile">تسوية</button></div>`);
}

/* ---------- الأوامر ---------- */
const A = {
  go: (el) => go(el.dataset.view),
  closeSheet: () => closeSheet(null),
  sheetBg: (el, ev) => { if (ev.target === el) closeSheet(null); },
  answer: (el) => closeSheet(el.dataset.val || null),
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
  back: () => go(NAV_OF[S.view] || 'home'),
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
  clearFilters: () => { S.filters = { kind: 'all', allTime: false }; S.q = ''; closeSheet(); render(); },
  openTx: (el) => sheetTx(el.dataset.id),
  saveTx: async (el, ev, opts) => {
    const st = store(), t = st.get('transactions', el.dataset.id); if (!t) return;
    // نقرأ كل قيم النموذج قبل أي سؤال (سؤال النطاق يستبدل النافذة)
    const form = { type: $('s_type').value, cp: $('s_cp') ? $('s_cp').value : null, hasCat: !!$('s_cat'), cat: $('s_cat') ? ($('s_cat').value || null) : null,
      sub: $('s_sub') ? ($('s_sub').value || null) : null, rec: $('s_rec') ? ($('s_rec').value || null) : null, nec: $('s_nec') ? ($('s_nec').value || null) : null, note: $('s_note') ? $('s_note').value : (t.note || '') };
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
    if (form.hasCat) {
      const cat = form.cat, sub = form.sub;
      if (cat !== (t.categoryId || null) || sub !== (t.subcategoryId || null)) {
        let scope = 'this';
        if (t.merchantId || t.beneficiaryId) { scope = await askScope(t.merchantId ? `التاجر: ${txTitle(t)}` : `المستفيد: ${txTitle(t)}`); if (!scope) { if (opts && opts.reopen) sheetTx(t.id); return; } }
        const n = E.setCategory(st, t.id, cat, sub, scope);
        if (n > 1) toast(`تصنّف ${cnt(n, 'op')}`);
      }
      const t2 = st.get('transactions', t.id);
      if ((t2.recurrenceType || null) !== form.rec || (t2.necessityType || null) !== form.nec) { t2.recurrenceType = form.rec; t2.necessityType = form.nec; st.put('transactions', t2); }
    }
    const t3 = st.get('transactions', t.id); const note = form.note;
    if ((t3.note || '') !== note) { t3.note = note; t3.updatedAt = new Date().toISOString(); st.put('transactions', t3); }
    st.touch(); await persist(); closeSheet(); render(); toast('تم الحفظ');
    if (opts && opts.reopen) sheetTx(t.id);
  },
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
  },
  pickMain: (el) => { const id = el.dataset.id; const subs = store().all('categories').filter(c => c.parentId === id && c.active !== false); if (!subs.length) return finishPick({ cat: id, sub: null }); if (S.pick.cat !== id) S.pick.sub = null; S.pick.cat = id; S.pick.stage = 'subs'; renderPick(); },
  pickSub: (el) => finishPick({ cat: S.pick.cat, sub: el.dataset.id || null }),
  pickNone: () => finishPick({ cat: null, sub: null }),
  pickBack: () => { S.pick.stage = 'grid'; renderPick(); },
  pickClose: () => finishPick(null),
  pickBg: (el, ev) => { if (ev.target === el) finishPick(null); },
  deleteTx: async (el) => { if (!await confirmBox('حذف العملية', 'حذف هذا الإدخال اليدوي نهائيًا؟', 'حذف', true)) return; store().remove('transactions', el.dataset.id); store().touch(); await persist(); render(); toast('تم الحذف'); },
  quickAdd: () => { const q = E.parseQuickEntry($('quick').value); if (!q.amount) return toast('اكتب المبلغ، مثل: قهوة 18'); sheetManual('expense', q); },
  manual: (el) => sheetManual(el.dataset.kind),
  saveManual: async (el) => {
    const kind = el.dataset.kind, amt = E.parseNum($('m_amt').value);
    if (!amt || amt <= 0) return toast('المبلغ غير صحيح');
    const e = { kind, amount: amt, date: $('m_date').value || E.todayISO(), description: $('m_desc') ? $('m_desc').value.trim() : '', note: $('m_note').value.trim() };
    if (kind === 'expense') { e.instrumentId = $('m_ins').value; e.categoryId = $('s_cat').value || null; e.subcategoryId = $('s_sub').value || null; }
    if (kind === 'income') { e.accountId = $('m_acc').value; e.incomeSubtype = $('m_inc').value; }
    if (kind === 'withdrawal' || kind === 'deposit') { e.accountId = $('m_acc').value; if (!e.accountId) return toast('اختر الحساب'); }
    const r = E.addManual(store(), e);
    await persist(); closeSheet(); if ($('quick')) $('quick').value = '';
    if (r.possibleDuplicates.length) {
      const d = r.possibleDuplicates[0], ex = store().get('transactions', d.existingId);
      const merge = await confirmBox('ممكن تكون مكررة', `فيه عملية بنفس المبلغ في الكشف: <b>${esc(txTitle(ex))}</b> ${fmt(ex.grossAmount)} بتاريخ ${fdate(ex.transactionDate)}. هل هي نفس العملية؟`, 'نعم، ادمجها');
      if (merge) { E.mergeInto(store(), ex.id, r.tx.id); await persist(); toast('تم الدمج'); }
      else toast('انحفظت كعملية مستقلة');
    } else toast('تمت الإضافة');
    render();
  },
  reconcileCash: () => sheetReconcile(),
  doReconcile: async () => { const v = E.parseNum($('c_actual').value); if (v == null || v < 0) return toast('المبلغ غير صحيح'); const r = E.reconcileCash(store(), v); await persist(); closeSheet(); render(); toast(r.diff ? `سُجل فرق ${fmt(Math.abs(r.diff))}` : 'الرصيد مطابق'); },
  editAccount: (el, ev) => { if (ev) ev.preventDefault(); sheetAccount(el.dataset.id); },
  newAccount: () => sheetAccount(null),
  saveAccount: async (el) => {
    const st = store(), id = el.dataset.id;
    const a = id ? st.get('accounts', id) : { id: E.uid(), createdAt: new Date().toISOString(), currency: 'SAR', active: true };
    a.name = $('a_name').value.trim() || a.name || 'حساب'; a.bank = $('a_bank').value.trim() || null; a.type = $('a_type').value; a.last4 = $('a_last4').value.trim() || null; a.isMine = $('a_mine').checked;
    st.put('accounts', a); st.touch(); await persist(); closeSheet(); render(); toast('تم الحفظ');
  },
  editInstrument: (el, ev) => { if (ev) ev.preventDefault(); sheetInstrument(el.dataset.id); },
  saveInstrument: async (el) => { const st = store(), i = st.get('instruments', el.dataset.id); i.instrumentOwner = $('i_owner').value; i.ownerName = $('i_oname').value.trim() || null; i.includeInPersonalSpend = $('i_inc').checked; st.put('instruments', i); st.touch(); await persist(); closeSheet(); render(); toast('تم الحفظ'); },
  editBeneficiary: (el, ev) => { if (ev) ev.preventDefault(); sheetBeneficiary(el.dataset.id); },
  saveBeneficiary: async (el) => {
    const st = store(), b = st.get('beneficiaries', el.dataset.id);
    const mine = $('b_mine').checked, cat = $('s_cat').value || null, sub = $('s_sub').value || null;
    b.notes = $('b_notes').value.trim();
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
    m.defaultRecurrenceType = $('mm_rec').value || null; m.defaultNecessityType = $('mm_nec').value || null; st.put('merchants', m);
    const n = E.setMerchantCategory(st, m.id, cat, sub);
    await persist(); closeSheet(); render(); toast(`تصنّف ${cnt(n, 'op')}`);
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
      const r = E.commitImport(store(), S.plan, S.decisions);
      await persist(); DB.requestPersistence();
      S.plan = null; S.planFile = null; S.decisions = {};
      toast(`تم الاستيراد: ${r.created} جديدة${r.merged ? `، ${r.merged} مدمجة` : ''}`, 3500);
      S.period = null;
      if (S.queue.length) { const next = S.queue.shift(); await processFile(next); } else go('home');
    } finally { S.busy = false; }
  },
  cancelPlan: () => { S.plan = null; S.planFile = null; S.decisions = {}; if (S.queue.length) processFile(S.queue.shift()); else go('add'); },
  teachSet: (el) => { S.teach[el.dataset.k] = el.dataset.v; render(); },
  cancelTeach: () => { S.teach = null; go('add'); },
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
    if (plan.error) { toast(plan.message); return go('add'); }
    S.plan = plan; S.planFile = f; S.decisions = {}; go('review');
  },
};
function onClick(ev) {
  const el = ev.target.closest('[data-action]'); if (!el) return;
  const fn = A[el.dataset.action]; if (!fn) return;
  if (el.tagName === 'A') ev.preventDefault();
  if ((el.dataset.action === 'sheetBg' || el.dataset.action === 'pickBg') && ev.target !== el) return;
  fn(el, ev);
}
function onChange(ev) {
  const el = ev.target;
  if (el.dataset && el.dataset.change && A[el.dataset.change]) A[el.dataset.change](el, ev);
  if (el.id === 's_type' && $('s_cp_wrap')) $('s_cp_wrap').classList.toggle('hide', el.value !== 'InternalTransfer');
  if (el.id === 't_acc' && $('t_newacc')) $('t_newacc').classList.toggle('hide', el.value !== '__new');
  if (el.id === 't_head' && S.teach) {
    const hr = Math.max(0, parseInt(el.value, 10) - 1);
    const bank = $('t_bank') ? $('t_bank').value : S.teach.bank;
    Object.assign(S.teach, guessTeach(S.teach.rows, hr), { bank, kind: S.teach.kind }); render();
  }
}
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'q') { S.q = ev.target.value; clearTimeout(S._qt); S._qt = setTimeout(() => { const box = $('txlist'); if (box) box.innerHTML = txListHtml(); }, 200); }
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
  if (plan.error) { await confirmBox('ما تم الاستيراد', esc(plan.message), 'حسنًا'); if (S.queue.length) return processFile(S.queue.shift()); return go('add'); }
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
  const ok = await confirmBox('استعادة النسخة', `<b class="warn-t">بتنمسح كل البيانات الحالية على هذا الجهاز</b> وتنحط بدالها النسخة (${cnt(n, 'op')}، تاريخها ${esc((obj.exportedAt || '').slice(0, 10))}). ما فيه دمج.`, 'استبدال كل البيانات', true);
  if (!ok) return;
  await DB.replaceAll(obj.data);
  S.store.replaceAll(obj.data); S.store.takeChanges();
  S.period = null; S.plan = null; go('home'); toast('تمت الاستعادة');
}

boot();
})();
