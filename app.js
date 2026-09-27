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
function subLine(tx) {
  const parts = [catLabel(tx)];
  const ins = insOf(tx), acc = accOf(tx.accountId);
  parts.push(ins ? ins.label : acc ? acc.name : '');
  if (tx.time) parts.push(`<span class="num">${tx.time}</span>`);
  return parts.filter(Boolean).join(' · ');
}
function txRow(tx) {
  return `<div class="tx" data-action="openTx" data-id="${tx.id}"><div class="m"><div class="t">${esc(txTitle(tx))}</div><div class="s">${subLine(tx)}</div>${badges(tx)}</div><div class="a">${amountCell(tx)}</div></div>`;
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
  if (['home', 'txs', 'add', 'accounts', 'more'].includes(initial)) S.view = initial;
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
const TITLES = { home: 'الرئيسية', txs: 'العمليات', add: 'إضافة واستيراد', accounts: 'الحسابات', more: 'المزيد', review: 'مراجعة الاستيراد', teach: 'تعليم كشف جديد', merchants: 'التجار', beneficiaries: 'المستفيدون', settings: 'الإعدادات', backup: 'النسخ الاحتياطي', report: 'التقرير', methods: 'طريقة الحساب', imports: 'سجل الاستيراد' };
const NAV_OF = { review: 'add', teach: 'add', imports: 'add', merchants: 'more', beneficiaries: 'accounts', settings: 'more', backup: 'more', report: 'more', methods: 'more' };
function render() {
  ensurePeriod();
  const v = S.view;
  $('title').textContent = TITLES[v] || 'المدير المالي';
  const showPeriod = ['home', 'txs', 'report'].includes(v);
  const pb = $('periodBtn'); pb.classList.toggle('hide', !showPeriod);
  if (showPeriod) pb.textContent = (v === 'txs' && S.filters.allTime) ? 'كل الفترات' : fperiod(S.period);
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.view === (NAV_OF[v] || v)));
  const views = { home: vHome, txs: vTxs, add: vAdd, accounts: vAccounts, more: vMore, review: vReview, teach: vTeach, merchants: vMerchants, beneficiaries: vBeneficiaries, settings: vSettings, backup: vBackup, report: vReport, methods: vMethods, imports: vImports };
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
function vHome() {
  const st = store();
  if (!st.all('transactions').length) {
    return banners() + `<div class="card empty"><h2 style="justify-content:center">ابدأ برفع أول كشف</h2><p>ارفع كشف حساب الإنماء أو كشف البطاقة الائتمانية بصيغة Excel. كل شي يُقرأ ويُحفظ على جهازك فقط.</p><button class="btn p" data-action="pickFile">رفع كشف</button></div>`;
  }
  const R = E.computePeriod(st, S.period);
  const prevP = E.previousPeriod(st, S.period);
  const P = E.computePeriod(st, prevP);
  const cur = E.currentCycle(st);
  let h = banners();
  h += `<div class="chips noprint" style="margin-bottom:10px">
    <button class="chip ${cur && S.period.start === cur.start ? 'on' : ''}" data-action="setPeriodCurrent">الدورة الحالية</button>
    <button class="chip ${cur && prevP && S.period.start === E.previousPeriod(st, cur).start ? 'on' : ''}" data-action="setPeriodPrev">الدورة السابقة</button>
    <button class="chip" data-action="pickPeriod">اختيار فترة…</button></div>`;
  if (R.coverage.periodOpen) h += `<div class="banner i">الفترة ما انتهت: الأرقام حتى اليوم فقط.</div>`;
  R.coverage.notes.forEach(n => { h += `<div class="banner w">بيانات «${esc(n.name)}» لا تغطي كامل الفترة (ناقص من ${fdate(n.from)} إلى ${fdate(n.to)}). الأرقام المرتبطة بها ناقصة.</div>`; });
  const spendSub = [R.temporaryCount ? `منه ${fmt(R.temporarySpend)} تحويلات بتصنيف مؤقت` : '', R.unownedCount ? `و${fmt(R.unownedSpend)} بأدوات مالكها غير محدد` : ''].filter(Boolean).join(' ');
  h += `<div class="kpis">
    ${kpi('الدخل المؤكد', num(R.income, 'pos'), cnt(R.incomeItems.length, 'op'), 'income', 'main')}
    ${kpi('الإنفاق الحقيقي', num(R.spend), spendSub || 'كل المصروف المصنّف', 'spend', 'main')}
    ${kpi('الفائض', num(R.surplus, R.surplus >= 0 ? 'pos' : 'neg'), 'الدخل المؤكد − الإنفاق الحقيقي', null, 'main wide')}
  </div>`;
  h += `<div class="kpis k5">
    ${kpi('خارج غير مصنف', num(R.unclassifiedOut, R.unclassifiedOut ? 'warn-t' : ''), R.unclassifiedOutCount ? `${cnt(R.unclassifiedOutCount, 'op')}${R.roundUpUnknownCount ? `، منها تقريب ${fmt(R.roundUpUnknown)}` : ''}` : 'لا يوجد', 'unclassified_out')}
    ${kpi('داخل غير مصنف', num(R.unclassifiedIn, R.unclassifiedIn ? 'warn-t' : ''), R.unclassifiedInCount ? cnt(R.unclassifiedInCount, 'op') : 'لا يوجد', 'unclassified_in')}
    ${kpi('التحويلات الداخلية', num(R.internal, 'neu'), `${cnt(R.internalCount, 'tr')}${R.internalOneSided ? `، ${R.internalOneSided === R.internalCount ? 'كلها' : R.internalOneSided} غير مكتمل الربط` : ''}`, 'internal')}
    ${kpi('سداد البطاقات', num(R.cardPayments, 'neu'), `${cnt(R.cardPaymentsCount, 'op')}${R.cardPaymentsUnmatched ? `، ${R.cardPaymentsUnmatched === R.cardPaymentsCount ? 'كلها' : R.cardPaymentsUnmatched} غير مطابقة` : ''}`, 'card')}
    ${kpi('الالتزامات المعروفة', num(R.commitments), `${cnt(R.commitmentItems.length, 'op')}، متكررة ومعلّمة التزام`, 'commitments', 'wide')}
  </div>`;
  // وين راح الإنفاق
  const max = R.categories.length ? Math.max.apply(null, R.categories.map(c => c.amount)) : 0;
  h += `<div class="grid2"><div class="card"><h2>وين راح الإنفاق <span class="sp"></span><span class="muted num">${fmt(R.spend)}</span></h2>`;
  if (!R.categories.length) h += `<div class="muted">لا يوجد إنفاق في هذه الفترة.</div>`;
  else h += `<div class="bars">${R.categories.filter(c => c.amount > 0).map(c => { const key = c.categoryId || '__none'; const pct = R.spend ? Math.round(c.amount / R.spend * 100) : 0; return `<div class="row" data-action="catDrill" data-cat="${key}"><div class="name">${esc(bucketName(c.categoryId))}</div><div class="track"><div class="fill ${key.startsWith('__') ? 'nc' : ''}" style="width:${max ? Math.max(2, c.amount / max * 100) : 0}%"></div></div><div class="amt">${num(c.amount)} <span class="muted small">${pct}%</span></div></div>`; }).join('')}</div>`;
  h += `</div>`;
  // المقارنة
  h += `<div class="card"><h2>مقارنة بالفترة السابقة</h2><div class="muted small" style="margin-bottom:6px">${fperiod(prevP)}</div>`;
  if (!P.coverage.complete || P.txCount === 0) h += `<div class="banner w" style="margin-bottom:8px">${P.txCount === 0 ? 'ما فيه بيانات للفترة السابقة، فالمقارنة غير متاحة.' : 'بيانات الفترة السابقة ناقصة، فالفروق هنا ما تعني تغيّر حقيقي في صرفك.'}</div>`;
  if (P.txCount) {
    const keys = new Map(); R.categories.forEach(c => keys.set(c.categoryId || '__none', { cur: c.amount, prev: 0 })); P.categories.forEach(c => { const k = c.categoryId || '__none'; const o = keys.get(k) || { cur: 0, prev: 0 }; o.prev = c.amount; keys.set(k, o); });
    const rows = Array.from(keys.entries()).sort((a, b) => Math.max(b[1].cur, b[1].prev) - Math.max(a[1].cur, a[1].prev));
    h += `<div class="tbl-wrap"><table><thead><tr><th>التصنيف</th><th class="n">السابقة</th><th class="n">الحالية</th><th class="n">الفرق</th><th class="n">النسبة</th></tr></thead><tbody>`;
    h += `<tr><td><b>الإنفاق الحقيقي</b></td><td class="n">${num(P.spend)}</td><td class="n">${num(R.spend)}</td><td class="n">${num(E.round2(R.spend - P.spend), R.spend > P.spend ? 'neg' : 'pos')}</td><td class="n">${P.spend ? `<span class="num">${Math.round((R.spend - P.spend) / P.spend * 100)}%</span>` : '—'}</td></tr>`;
    rows.forEach(([k, o]) => { const d = E.round2(o.cur - o.prev); h += `<tr><td>${esc(bucketName(k === '__none' ? null : k))}</td><td class="n">${num(o.prev)}</td><td class="n">${num(o.cur)}</td><td class="n">${num(d, d > 0 ? 'neg' : d < 0 ? 'pos' : '')}</td><td class="n">${o.prev ? `<span class="num">${Math.round(d / o.prev * 100)}%</span>` : '—'}</td></tr>`; });
    h += `</tbody></table></div>`;
  }
  h += `</div></div>`;
  // أكثر التجار وأعلى العمليات
  h += `<div class="grid2" style="margin-top:var(--gap)"><div class="card"><h2>أكثر التجار</h2>`;
  if (!R.topMerchants.length) h += `<div class="muted">لا يوجد.</div>`;
  else h += `<div class="list">${R.topMerchants.slice(0, 8).map(m => { const mm = store().get('merchants', m.merchantId); return `<div class="it" data-action="merchantDrill" data-id="${m.merchantId}"><div class="m"><div class="t">${esc(mm ? mm.name : '—')}</div><div class="s">${cnt(m.count, 'op')}</div></div>${num(m.amount)}</div>`; }).join('')}</div>`;
  h += `</div><div class="card"><h2>أعلى العمليات</h2>`;
  if (!R.topTx.length) h += `<div class="muted">لا يوجد.</div>`;
  else h += `<div class="list">${R.topTx.slice(0, 8).map(x => { const t = store().get('transactions', x.id); return `<div class="it" data-action="openTx" data-id="${t.id}"><div class="m"><div class="t">${esc(txTitle(t))}</div><div class="s">${fdate(t.transactionDate)} · ${esc(catLabel(t))}</div></div>${num(x.amount)}</div>`; }).join('')}</div>`;
  h += `</div></div>`;
  // الحسابات
  h += `<div class="card" style="margin-top:var(--gap)"><h2>الحسابات <span class="sp"></span><button class="btn" data-action="go" data-view="accounts">إدارة</button></h2><div class="list">${E.accountBalances(st).map(a => `<div class="it"><div class="m"><div class="t">${esc(a.name)}</div><div class="s">${ACC_L[a.type] || ''}${a.balanceDate ? ' · آخر رصيد معروف ' + fdate(a.balanceDate, true) : ' · الرصيد غير معروف'}</div></div>${a.balance == null ? '<span class="muted">—</span>' : a.type === 'credit_card' ? `<span class="small">${a.balance > 0 ? 'مستحق ' : a.balance < 0 ? 'لصالحك ' : ''}</span>${num(Math.abs(a.balance))}` : num(a.balance)}</div>`).join('')}</div></div>`;
  h += dataAlerts(R);
  return h;
}
function dataAlerts(R) {
  const st = store(), items = [];
  st.all('imports').filter(i => i.balanceValidated === false).forEach(i => items.push(`كشف «${esc(i.filename)}» يحتاج مراجعة: الرصيد ما تطابق.`));
  st.all('accounts').filter(a => a.type === 'unknown').forEach(a => items.push(`نوع «${esc(a.name)}» غير محدد. <a href="#" data-action="editAccount" data-id="${a.id}">حدده</a>`));
  st.all('instruments').filter(i => i.instrumentOwner === 'unknown').forEach(i => items.push(`مالك «${esc(i.label)}» غير محدد، وعملياتها داخلة في إنفاقك مؤقتًا. <a href="#" data-action="editInstrument" data-id="${i.id}">حدده</a>`));
  const ru = st.all('transactions').filter(isRoundUpUnknown).length;
  if (ru) items.push(`وجهة التقريب غير محددة (${cnt(ru, 'op')} تحت «خارج غير مصنف»). <a href="#" data-action="setRoundUp">حددها</a>`);
  const unk = st.all('transactions').filter(t => t.transactionType === 'Unknown').length;
  if (unk) items.push(`${cnt(unk, 'op')} نوعها غير معروف. <a href="#" data-action="kpi" data-kind="unclassified_all">راجعها</a>`);
  if (!items.length) return '';
  return `<div class="card"><h2>تنبيهات البيانات</h2><ul style="margin:0;padding-inline-start:18px">${items.map(i => `<li class="small" style="margin-bottom:6px">${i}</li>`).join('')}</ul></div>`;
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
      h += `<div class="pair"><div class="small muted">النقاط ${r.score}${r.reason === 'tie' ? ' · أكثر من مرشح بنفس الدرجة' : r.reason === 'manual' ? ' · إدخال يدوي' : ''}</div><div class="cmp">
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
  let h = `<div class="card"><h2>الحسابات</h2><div class="list">${E.accountBalances(st).map(a => `<div class="it" data-action="editAccount" data-id="${a.id}"><div class="m"><div class="t">${esc(a.name)}</div><div class="s">${esc(a.bank || '')} · ${ACC_L[a.type]}${a.last4 ? ' · …' + a.last4 : ''}${a.isMine ? '' : ' · ليس لك'}</div></div>${a.balance == null ? '<span class="muted small">الرصيد غير معروف</span>' : num(a.type === 'credit_card' ? Math.abs(a.balance) : a.balance)}</div>`).join('') || '<div class="muted">لا توجد حسابات بعد.</div>'}</div>
    <div class="btns" style="margin-top:10px"><button class="btn" data-action="newAccount">+ حساب</button><button class="btn" data-action="reconcileCash">تسوية النقد</button></div></div>`;
  h += `<div class="card"><h2>أدوات الدفع</h2><p class="small muted">الأداة اللي مالكها غير محدد تنحسب في إنفاقك مؤقتًا مع علامة، وتقدر تستبعدها إذا طلعت لشخص ثاني.</p><div class="list">${st.all('instruments').map(i => { const a = accOf(i.accountId); return `<div class="it" data-action="editInstrument" data-id="${i.id}"><div class="m"><div class="t">${esc(i.label)}</div><div class="s">${esc(a ? a.name : '')} · المالك: ${OWNER_L[i.instrumentOwner]}${i.includeInPersonalSpend === false ? ' · خارج مصروفك' : ''}</div></div>${i.instrumentOwner === 'unknown' ? '<span class="b w">غير محدد</span>' : ''}</div>`; }).join('') || '<div class="muted">لا يوجد.</div>'}</div></div>`;
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
  const item = (view, t, s) => `<div class="it" data-action="go" data-view="${view}"><div class="m"><div class="t">${t}</div><div class="s">${s}</div></div><span class="muted">‹</span></div>`;
  return banners() + `<div class="card"><div class="list">
    ${item('report', 'التقرير', 'تقرير الفترة المختارة، للطباعة أو الحفظ PDF')}
    ${item('merchants', 'التجار', 'صنّف تاجرًا مرة ويتطبق على كل عملياته')}
    ${item('beneficiaries', 'المستفيدون', 'تحويلاتك للأشخاص وحساباتك')}
    ${item('imports', 'سجل الاستيراد', 'الكشوف المستوردة وحذفها')}
    ${item('settings', 'الإعدادات', 'الدورة، يوم الراتب، أسماؤك، وجهة التقريب')}
    ${item('backup', 'النسخ الاحتياطي', 'تصدير واستعادة')}
    ${item('methods', 'طريقة الحساب', 'كيف ينحسب كل رقم')}
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
  h += `<h1>التقرير المالي</h1><div class="muted">${p.kind === 'cycle' ? 'دورة الراتب' : p.kind === 'month' ? 'الشهر الميلادي' : 'فترة مخصصة'}: ${fperiod(p)} · أُعد في ${fday(E.todayISO())}</div>`;
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

function sheetTx(id) {
  const st = store(), t = st.get('transactions', id); if (!t) return;
  const m = merchantOf(t), b = benOf(t), ins = insOf(t), acc = accOf(t.accountId);
  const canCat = ['Payment', 'CashExpense', 'PersonTransfer', 'Refund', 'Unknown'].includes(t.transactionType) && t.transferSubtype !== 'round_up';
  const types = ['Payment', 'Income', 'InternalTransfer', 'CreditCardPayment', 'PersonTransfer', 'Refund', 'CashWithdrawal', 'Unknown'];
  const recDef = E.effective(st, Object.assign({}, t, { recurrenceType: null }), 'rec'), necDef = E.effective(st, Object.assign({}, t, { necessityType: null }), 'nec');
  const recL = { recurring: 'متكرر', variable: 'متغير' }, necL = { essential: 'ضروري', discretionary: 'اختياري' };
  let h = `<h3>${esc(txTitle(t))}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3>
    <div style="font-size:22px;font-weight:700;margin-bottom:4px">${amountCell(t)}</div><div class="muted small">${fday(t.transactionDate)}${t.time ? ` · <span class="num">${t.time}</span>` : ''}</div>${badges(t)}`;
  if (t.transferSubtype === 'round_up') {
    const orig = t.roundUpOfId ? st.get('transactions', t.roundUpOfId) : null;
    h += `<div class="banner i" style="margin-top:10px"><div>تقريب لأقرب ريال${orig ? ` لشراء ${fmt(orig.grossAmount)} من ${esc(txTitle(orig))}` : ''}. <a href="#" data-action="setRoundUp">حدد وجهة التقريب</a> (تنطبق على كل عمليات التقريب).</div></div>`;
  }
  h += `<label class="f">النوع</label><select id="s_type">${types.map(x => `<option value="${x}" ${x === t.transactionType ? 'selected' : ''}>${TYPE_L[x]}</option>`).join('')}</select>
    <div id="s_cp_wrap" class="${t.transactionType === 'InternalTransfer' ? '' : 'hide'}"><label class="f">الحساب الآخر (لك)</label><select id="s_cp">${ownAccountOptions(t.counterpartyAccountId, true)}</select></div>`;
  if (canCat) {
    h += `<label class="f">التصنيف</label><select id="s_cat" data-change="catChanged">${catOptions(t.categoryId, true)}</select><label class="f">التصنيف الفرعي</label><select id="s_sub">${subOptions(t.categoryId, t.subcategoryId)}</select>`;
    h += `<div class="grid2"><div><label class="f">التكرار</label><select id="s_rec"><option value="">افتراضي (${recL[recDef] || '—'})</option><option value="recurring" ${t.recurrenceType === 'recurring' ? 'selected' : ''}>متكرر</option><option value="variable" ${t.recurrenceType === 'variable' ? 'selected' : ''}>متغير</option></select></div>
      <div><label class="f">الضرورة</label><select id="s_nec"><option value="">افتراضي (${necL[necDef] || '—'})</option><option value="essential" ${t.necessityType === 'essential' ? 'selected' : ''}>ضروري</option><option value="discretionary" ${t.necessityType === 'discretionary' ? 'selected' : ''}>اختياري</option></select></div></div>`;
  }
  h += `<label class="f">ملاحظة</label><textarea id="s_note" placeholder="اختياري">${esc(t.note || '')}</textarea>
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveTx" data-id="${t.id}">حفظ</button>${(t.sourceLinks || []).every(s => s.sourceType === 'manual' || s.sourceType === 'cash_reconciliation') ? `<button class="btn r" data-action="deleteTx" data-id="${t.id}">حذف</button>` : ''}</div>`;
  h += `<h3 style="margin-top:18px">التفاصيل</h3><dl class="kv">
    <dt>تاريخ العملية</dt><dd>${fdate(t.transactionDate, true)}</dd>${t.postingDate && t.postingDate !== t.transactionDate ? `<dt>تاريخ القيد</dt><dd>${fdate(t.postingDate, true)}</dd>` : ''}
    <dt>الحساب</dt><dd>${esc(acc ? acc.name : '—')}</dd><dt>الأداة</dt><dd>${ins ? esc(ins.label) + ` (المالك: ${OWNER_L[ins.instrumentOwner]}) <a href="#" data-action="editInstrument" data-id="${ins.id}">تعديل</a>` : 'أداة دفع غير محددة'}</dd>
    <dt>الطريقة</dt><dd>${METHOD_L[t.paymentMethod] || t.paymentMethod || 'غير محددة'}</dd>
    ${m ? `<dt>التاجر</dt><dd>${esc(m.name)} <a href="#" data-action="merchantDrill" data-id="${m.id}">كل عملياته</a></dd>` : ''}
    ${b ? `<dt>المستفيد</dt><dd>${esc(b.name)} · ${esc(b.bank || '')} …${esc(b.accountLast4 || '')} <a href="#" data-action="editBeneficiary" data-id="${b.id}">تعديل</a></dd>` : ''}
    <dt>الإجمالي</dt><dd>${num(t.grossAmount)}</dd>${(t.feeAmount || t.vatAmount) ? `<dt>الأصل</dt><dd>${num(t.principalAmount)}</dd><dt>الرسوم</dt><dd>${num(t.feeAmount)}${t.feeTaxBreakdownKnown === false ? ' (الضريبة داخلها؛ التقسيم غير معروف)' : ''}</dd>${t.feeTaxBreakdownKnown !== false ? `<dt>ضريبة الرسوم</dt><dd>${num(t.vatAmount)}</dd>` : ''}` : ''}
    ${t.foreignAmount ? `<dt>المبلغ الأصلي</dt><dd><span class="num">${fmt(t.foreignAmount)} ${esc(t.foreignCurrency || '')}</span></dd>` : ''}
    ${t.reference ? `<dt>المرجع</dt><dd class="small"><span class="num">${esc(t.reference)}</span></dd>` : ''}${t.balanceAfter != null ? `<dt>الرصيد بعد العملية</dt><dd>${num(t.balanceAfter)}</dd>` : ''}
    ${(t.linkedTransactionIds || []).length ? `<dt>مرتبطة بـ</dt><dd>${t.linkedTransactionIds.map(x => { const o = st.get('transactions', x); return o ? `<a href="#" data-action="openTx" data-id="${o.id}">${esc(txTitle(o))} ${fmt(o.grossAmount)}</a>` : ''; }).join('<br>')}</dd>` : ''}</dl>`;
  h += `<h3 style="margin-top:14px">المصادر (${(t.sourceLinks || []).length})</h3>${(t.sourceLinks || []).map(s => { const imp = s.importId ? st.get('imports', s.importId) : null; return `<div class="small muted" style="margin-top:6px">${SRC_L[s.sourceType] || s.sourceType}${imp ? ' · ' + esc(imp.filename) : ''}</div><div class="raw">${esc(s.rawDescription || '')}</div>`; }).join('')}`;
  openSheet(h);
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
    <label class="f">التصنيف</label><select id="s_cat" data-change="catChanged">${catOptions(pre.categoryId, true)}</select><label class="f">التصنيف الفرعي</label><select id="s_sub">${subOptions(pre.categoryId, pre.subcategoryId)}</select>
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
    <label class="f">التصنيف المعتاد لحوالاته</label><select id="s_cat" data-change="catChanged">${catOptions(b.categoryId, true)}</select><label class="f">التصنيف الفرعي</label><select id="s_sub">${subOptions(b.categoryId, b.subcategoryId)}</select>
    <label class="f">ملاحظات</label><input type="text" id="b_notes" value="${esc(b.notes || '')}">
    <div class="btns" style="margin-top:12px"><button class="btn p" data-action="saveBeneficiary" data-id="${b.id}">حفظ</button><button class="btn" data-action="benDrill" data-id="${b.id}">حوالاته</button></div>`);
}
function sheetMerchant(id) {
  const m = store().get('merchants', id); if (!m) return;
  const cat = m.categoryId || m.suggestedCategoryId, sub = m.categoryId ? m.subcategoryId : m.suggestedSubcategoryId;
  openSheet(`<h3>${esc(m.name)}<span class="sp"></span><button class="close" data-action="closeSheet">×</button></h3><div class="small muted">الأسماء في الكشوف: ${esc((m.aliases || []).join('، '))}</div>
    <label class="f">التصنيف</label><select id="s_cat" data-change="catChanged">${catOptions(cat, true)}</select><label class="f">التصنيف الفرعي</label><select id="s_sub">${subOptions(cat, sub)}</select>
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
  setPeriod: (el) => { S.period = E.listCycles(store())[+el.dataset.i]; S.filters.allTime = false; closeSheet(); render(); },
  setPeriodCurrent: () => { S.period = E.currentCycle(store()) || S.period; render(); },
  setPeriodPrev: () => { const c = E.currentCycle(store()); if (c) S.period = E.previousPeriod(store(), c); render(); },
  allTime: () => { S.filters.allTime = true; closeSheet(); render(); },
  setCustomPeriod: () => { const a = $('p_from').value, b = $('p_to').value; if (!a || !b || a > b) return toast('تاريخ غير صحيح'); S.period = { start: a, end: b, kind: 'custom' }; S.filters.allTime = false; closeSheet(); render(); },
  kpi: (el) => { const k = el.dataset.kind; closeSheet(); go('txs', { filters: { kind: k === 'unclassified_all' ? 'unclassified_all' : k } }); },
  catDrill: (el) => go('txs', { filters: { kind: 'all', categoryId: el.dataset.cat } }),
  merchantDrill: (el) => { closeSheet(); go('txs', { filters: { kind: 'all', merchantId: el.dataset.id, allTime: true } }); },
  benDrill: (el) => { closeSheet(); go('txs', { filters: { kind: 'all', beneficiaryId: el.dataset.id, allTime: true } }); },
  setKind: (el) => { S.filters.kind = el.dataset.kind; S.txLimit = 300; render(); },
  moreTx: () => { S.txLimit = (S.txLimit || 300) + 300; render(); },
  filterSheet: () => sheetFilters(),
  applyFilters: () => { const v = (id) => $(id).value || null; S.filters = Object.assign({}, S.filters, { kind: v('f_kind') || 'all', accountId: v('f_acc'), instrumentId: v('f_ins'), method: v('f_method'), categoryId: v('f_cat'), source: v('f_src') }); closeSheet(); render(); },
  clearFilters: () => { S.filters = { kind: 'all', allTime: false }; S.q = ''; closeSheet(); render(); },
  openTx: (el) => sheetTx(el.dataset.id),
  saveTx: async (el) => {
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
        if (t.merchantId || t.beneficiaryId) { scope = await askScope(t.merchantId ? `التاجر: ${txTitle(t)}` : `المستفيد: ${txTitle(t)}`); if (!scope) return; }
        const n = E.setCategory(st, t.id, cat, sub, scope);
        if (n > 1) toast(`تصنّف ${cnt(n, 'op')}`);
      }
      const t2 = st.get('transactions', t.id);
      if ((t2.recurrenceType || null) !== form.rec || (t2.necessityType || null) !== form.nec) { t2.recurrenceType = form.rec; t2.necessityType = form.nec; st.put('transactions', t2); }
    }
    const t3 = st.get('transactions', t.id); const note = form.note;
    if ((t3.note || '') !== note) { t3.note = note; t3.updatedAt = new Date().toISOString(); st.put('transactions', t3); }
    st.touch(); await persist(); closeSheet(); render(); toast('تم الحفظ');
  },
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
  if (el.dataset.action === 'sheetBg' && ev.target !== el) return;
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
document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.id === 'quick') A.quickAdd(); if (ev.key === 'Escape' && $('sheet').innerHTML) closeSheet(null); });

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
