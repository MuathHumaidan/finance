/* =====================================================================
   المدير المالي — التحليل (1.5.0)
   كل رقم هنا محسوب وقت العرض من العمليات والأغراض، وكل رقم يرجع معه العناصر اللي كوّنته (ما فيه رقم بدون مصدر).
   الأقسام:
     1. الدورات المكتملة ومعدل الإنفاق المتغير
     2. الالتزامات المتكررة (الاكتشاف والتأكيد) والقادم منها
     3. توقع نهاية الدورة
     4. الأموال المحجوزة
     5. السيولة القابلة للصرف
     6. الضروري والكمالي
     7. فرص التوفير
     8. المنتجات
     9. المدن
    10. المقارنات
    11. العرض السنوي
    12. مركز التنبيهات
   ===================================================================== */
(function (root) {
'use strict';
const E = root.Engine || (typeof require === 'function' ? require('./engine.js') : null);
const { round2, addDays, daysBetween, todayISO, uid, txDate, isExcluded, spendParts, spendAnchor, effective, catChain, CHAIN, isKnownCommitment,
  listCycles, currentCycle, dataRange, inSpendPeriod, computePeriod, pad2, daysInMonth, isoDate, latestSnapshot, snapKey, cashBalance,
  itemNet, canHaveItems, cityOf, weekOf } = E;
const has = (v) => v !== null && v !== undefined && v !== '';
const sum = (a, f) => round2(a.reduce((s, x) => s + (f ? f(x) : x), 0));
function median(a) {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length % 2 ? round2(s[m]) : round2((s[m - 1] + s[m]) / 2);
}
const minD = (a, b) => (a < b ? a : b);

/* ---------- 1. الدورات المكتملة ومعدل الإنفاق المتغير ----------
   الدورة المكتملة: انتهت قبل اليوم، وبياناتك تغطيها من أولها (أول عملية عندك قبلها أو في يومها).
   الإنفاق المتغير = الإنفاق الحقيقي (قواعد 1.4.1: السحب والخارج غير المعروف صرف) ناقص: الالتزامات المتكررة المعروفة،
   واستثناءاتك (تصنيف/تاجر/مستفيد/عملية). التحويل الداخلي وسداد البطاقة والعمليات بأثر صفر ما تدخل أصلًا. */
function completeCycles(store, today, n) {
  today = today || todayISO();
  const range = dataRange(store); if (!range) return [];
  return listCycles(store, today).filter(c => c.end < today && c.start >= range.min).slice(0, n || 12);
}
function rateExcludedTx(store, tx) {
  const a = spendAnchor(store, tx), ex = store.settings.rateExclusions || [];
  return ex.some(e => (e.type === 'transaction' && (e.id === tx.id || e.id === a.id)) || (e.type === 'merchant' && a.merchantId && e.id === a.merchantId) || (e.type === 'beneficiary' && a.beneficiaryId && e.id === a.beneficiaryId));
}
function variableParts(store, tx) {
  const parts = spendParts(store, tx); if (!parts.length) return parts;
  const a = spendAnchor(store, tx);
  if (isKnownCommitment(store, a) || rateExcludedTx(store, tx)) return [];
  const cats = new Set((store.settings.rateExclusions || []).filter(e => e.type === 'category').map(e => e.id));
  return cats.size ? parts.filter(p => !cats.has(p.cat)) : parts;
}
const allParts = (store, tx) => spendParts(store, tx);
// مجموع الأجزاء في مدى (بتاريخ الإنفاق: الاسترداد المربوط على تاريخ شرائه)
function spendBetween(store, range, pick) {
  let s = 0; const ids = [], byCat = new Map();
  if (!range || range.start > range.end) return { amount: 0, txIds: ids, byCat };
  store.all('transactions').forEach(t => {
    if (!inSpendPeriod(store, t, range)) return;
    const ps = pick(store, t); if (!ps.length) return;
    let v = 0; ps.forEach(p => { v += p.amt; byCat.set(p.cat, round2((byCat.get(p.cat) || 0) + p.amt)); });
    if (Math.abs(v) > 0.004) { s += v; ids.push(t.id); }
  });
  return { amount: round2(s), txIds: ids, byCat };
}
function addRateExclusion(store, e) {
  const s = store.settings, list = (s.rateExclusions || []).slice();
  if (!['category', 'merchant', 'beneficiary', 'transaction'].includes(e.type) || !e.id) return null;
  if (!list.some(x => x.type === e.type && x.id === e.id)) list.push({ type: e.type, id: e.id, at: new Date().toISOString() });
  s.rateExclusions = list; store.put('settings', s); store.touch(); return list;
}
function removeRateExclusion(store, type, id) {
  const s = store.settings; s.rateExclusions = (s.rateExclusions || []).filter(x => !(x.type === type && x.id === id)); store.put('settings', s); store.touch(); return s.rateExclusions;
}
function isRateExcluded(store, type, id) { return (store.settings.rateExclusions || []).some(x => x.type === type && x.id === id); }
// المعدلات الثلاثة للدورة الحالية
function cycleRates(store, today) {
  today = today || todayISO();
  const cyc = currentCycle(store, today); if (!cyc) return null;
  const elapsed = daysBetween(cyc.start, today) + 1, totalDays = daysBetween(cyc.start, cyc.end) + 1, remaining = Math.max(0, daysBetween(today, cyc.end));
  const toDate = { start: cyc.start, end: today };
  const variable = spendBetween(store, toDate, variableParts), all = spendBetween(store, toDate, allParts);
  let last7 = null;
  if (elapsed >= 7) { const r7 = { start: addDays(today, -6), end: today }, v7 = spendBetween(store, r7, variableParts); last7 = { range: r7, amount: v7.amount, rate: round2(v7.amount / 7), txIds: v7.txIds }; }
  return { cycle: cyc, today, elapsed, totalDays, remaining, toDate, variable, all, cycleRate: round2(variable.amount / elapsed), last7, elapsedRate: round2(all.amount / elapsed) };
}
function historyRates(store, today, n) {
  return completeCycles(store, today, n || 3).map(c => { const days = daysBetween(c.start, c.end) + 1, v = spendBetween(store, c, variableParts); return { cycle: c, days, amount: v.amount, rate: round2(v.amount / days), txIds: v.txIds }; });
}
/* معدل التوقع: ما يستخدم أيام الدورة السابقة أبدًا.
   7 أيام أو أكثر من الدورة: معدل الدورة الحالية. أقل: وسيط معدلات آخر 3 دورات مكتملة. ما فيه 3 دورات: بيانات الدورة الحالية بثقة منخفضة. */
function forecastRate(store, today) {
  const cr = cycleRates(store, today); if (!cr) return null;
  if (cr.elapsed >= 7) return { rate: cr.cycleRate, source: 'current', confidence: 'normal', rates: cr, history: [] };
  const h = historyRates(store, today, 3);
  if (h.length >= 3) return { rate: median(h.map(x => x.rate)), source: 'history', confidence: 'normal', rates: cr, history: h };
  return { rate: cr.cycleRate, source: 'current_low', confidence: 'low', rates: cr, history: h };
}

/* ---------- 2. الالتزامات المتكررة ----------
   الاكتشاف الآلي يكتب «مقترح» فقط، وما يصير التزام مؤكد إلا بموافقتك. المرفوض ما يرجع يقترح.
   النمط: نفس التاجر أو المستفيد ونفس الحساب، فاصل منتظم، ومبلغ قريب (60%–140% من الوسيط). */
const CAD = { monthly: { min: 26, max: 35, n: 3, fresh: 45 }, weekly: { min: 6, max: 8, n: 4, fresh: 11 }, yearly: { min: 350, max: 380, n: 2, fresh: 400 } };
// anchorDay: يوم الشهر المعتاد (مثل 31)، عشان الموعد ما ينزاح بعد فبراير (28 ← 31 مو 28)
function addCadence(d, cadence, k, anchorDay) {
  k = k == null ? 1 : k;
  if (cadence === 'weekly') return addDays(d, 7 * k);
  const [y, m, d0] = d.split('-').map(Number), dd = anchorDay || d0;
  if (cadence === 'yearly') { const yy = y + k; return isoDate(yy, m, Math.min(dd, daysInMonth(yy, m))); }
  let mm = m + k, yy = y; while (mm > 12) { mm -= 12; yy++; } while (mm < 1) { mm += 12; yy--; }
  return isoDate(yy, mm, Math.min(dd, daysInMonth(yy, mm)));
}
const recKey = (r) => r.subjectType + ':' + r.subjectId + ':' + (r.accountId || '');
function recurringCandidates(store) {
  const groups = new Map();
  store.all('transactions').forEach(t => {
    if (t.direction !== 'out' || !['Payment', 'PersonTransfer'].includes(t.transactionType) || isExcluded(store, t)) return;
    const st = t.merchantId ? 'merchant' : t.beneficiaryId ? 'beneficiary' : null; if (!st) return;
    if (st === 'beneficiary') { const b = store.get('beneficiaries', t.beneficiaryId); if (b && b.isMyAccount) return; }
    const k = st + ':' + (t.merchantId || t.beneficiaryId) + ':' + (t.accountId || '');
    if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t);
  });
  groups.forEach(l => l.sort((a, b) => (txDate(a) + (a.time || '')).localeCompare(txDate(b) + (b.time || ''))));
  return groups;
}
function detectPattern(list, today) {
  for (const cad of ['monthly', 'weekly', 'yearly']) {
    const c = CAD[cad]; if (list.length < c.n) continue;
    const tail = list.slice(-6); const ev = [tail[tail.length - 1]];
    for (let i = tail.length - 2; i >= 0; i--) { const d = daysBetween(txDate(tail[i]), txDate(ev[0])); if (d >= c.min && d <= c.max) ev.unshift(tail[i]); else break; }
    if (ev.length < c.n) continue;
    const amts = ev.map(t => t.principalAmount), med = median(amts);
    if (!(med > 0) || amts.some(a => a < med * 0.6 || a > med * 1.4)) continue;
    const last = ev[ev.length - 1]; if (daysBetween(txDate(last), today) > c.fresh) continue;
    const anchorDay = cad === 'weekly' ? null : median(ev.slice(-3).map(t => Number(txDate(t).slice(8, 10))));
    return { cadence: cad, ev, expectedAmount: median(amts.slice(-3)), amountMin: round2(Math.min.apply(null, amts)), amountMax: round2(Math.max.apply(null, amts)), lastDate: txDate(last), anchorDay: anchorDay ? Math.round(anchorDay) : null };
  }
  return null;
}
function detectRecurring(store, today) {
  today = today || todayISO();
  const groups = recurringCandidates(store), existing = new Map(store.all('recurring').map(r => [recKey(r), r]));
  let created = 0, updated = 0; const now = new Date().toISOString();
  groups.forEach((list, k) => {
    const f = detectPattern(list, today), r = existing.get(k);
    if (r && r.status === 'dismissed') return; // رفضته: ما يرجع يقترح
    if (f) {
      const fields = { cadence: f.cadence, expectedAmount: f.expectedAmount, amountMin: f.amountMin, amountMax: f.amountMax, lastDate: f.lastDate, anchorDay: f.anchorDay, nextDate: addCadence(f.lastDate, f.cadence, 1, f.anchorDay), evidenceTxIds: f.ev.map(t => t.id) };
      if (!r) {
        const [st, sid, acc] = k.split(':'), last = f.ev[f.ev.length - 1];
        store.put('recurring', Object.assign({ id: 'rc-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10), subjectType: st, subjectId: sid, accountId: acc || null, status: 'suggested',
          isCommitment: effective(store, Object.assign({}, last, { isCommitment: null }), 'commit') === true, reserve: false, createdAt: now, detectedAt: now }, fields));
        created++;
      } else {
        // المؤكد: التكرار والمبلغ المعتاد اللي عدلته بنفسك يبقى، بس آخر عملية والدليل يتحدثون
        const keep = r.status === 'confirmed' && r.userEdited ? { cadence: r.cadence, expectedAmount: r.expectedAmount } : {};
        const next = Object.assign({}, fields, keep, { nextDate: addCadence(f.lastDate, keep.cadence || f.cadence, 1, f.anchorDay) });
        if (JSON.stringify(Object.keys(next).map(x => r[x])) !== JSON.stringify(Object.keys(next).map(x => next[x]))) { Object.assign(r, next, { updatedAt: now }); store.put('recurring', r); updated++; }
      }
      return;
    }
    // المؤكد اللي ما انطبق عليه النمط هالمرة (مثلًا تغيّر المبلغ): آخر عملية قريبة المبلغ تحدّث موعده
    if (r && r.status === 'confirmed') {
      const lo = Number(r.amountMin || r.expectedAmount) * 0.7, hi = Number(r.amountMax || r.expectedAmount) * 1.3;
      const last = list.filter(t => txDate(t) > (r.lastDate || '') && t.principalAmount >= lo && t.principalAmount <= hi).pop();
      if (last) { r.lastDate = txDate(last); r.nextDate = addCadence(r.lastDate, r.cadence, 1, r.anchorDay); r.evidenceTxIds = (r.evidenceTxIds || []).concat(last.id).slice(-6); r.updatedAt = now; store.put('recurring', r); updated++; }
    }
  });
  if (created || updated) store.touch();
  return { created, updated };
}
function subjectName(store, r) {
  const o = r.subjectType === 'merchant' ? store.get('merchants', r.subjectId) : store.get('beneficiaries', r.subjectId);
  return o ? o.name : '—';
}
function recurringOfTx(store, tx) {
  const st = tx.merchantId ? 'merchant' : tx.beneficiaryId ? 'beneficiary' : null; if (!st) return null;
  const k = st + ':' + (tx.merchantId || tx.beneficiaryId) + ':' + (tx.accountId || '');
  return store.all('recurring').find(r => recKey(r) === k) || null;
}
function confirmRecurring(store, id, opts) {
  const r = store.get('recurring', id); if (!r) return null; opts = opts || {};
  r.status = 'confirmed'; r.confirmedAt = new Date().toISOString();
  if (opts.isCommitment !== undefined) r.isCommitment = !!opts.isCommitment;
  if (opts.reserve !== undefined) r.reserve = !!opts.reserve;
  if (opts.cadence && CAD[opts.cadence] && opts.cadence !== r.cadence) { r.cadence = opts.cadence; r.userEdited = true; }
  if (opts.expectedAmount != null && opts.expectedAmount > 0 && round2(opts.expectedAmount) !== r.expectedAmount) { r.expectedAmount = round2(opts.expectedAmount); r.userEdited = true; }
  if (r.lastDate) r.nextDate = addCadence(r.lastDate, r.cadence, 1, r.cadence === 'weekly' ? null : r.anchorDay);
  store.put('recurring', r); store.touch(); return r;
}
// آخر دفعة فعلية للمتكرر من العمليات الموجودة الحين (مو المحفوظ وقت الاكتشاف): عشان دفعة أدخلتها يدويًا أو حذفتها تنعكس فورًا
function recEvidence(store, r) {
  const groups = store.cached('recGroups', () => recurringCandidates(store)), list = groups.get(recKey(r)) || [];
  const lo = Number(r.amountMin || r.expectedAmount || 0) * 0.7, hi = Number(r.amountMax || r.expectedAmount || 0) * 1.3;
  return list.filter(t => t.principalAmount >= lo - 0.004 && t.principalAmount <= hi + 0.004);
}
function liveLastDate(store, r) { if (!store) return r.lastDate; const ev = recEvidence(store, r); return ev.length ? txDate(ev[ev.length - 1]) : r.lastDate; }
function dismissRecurring(store, id) { const r = store.get('recurring', id); if (!r) return null; r.status = 'dismissed'; r.dismissedAt = new Date().toISOString(); store.put('recurring', r); store.touch(); return r; }
function setRecurringReserve(store, id, on) { const r = store.get('recurring', id); if (!r) return null; r.reserve = !!on; store.put('recurring', r); store.touch(); return r; }
// الموعد المستحق القادم: أول تاريخ متوقع بعد آخر عملية ولسا ما انسدد (المتأخر لين 7 أيام يبقى مستحق)
function nextDue(r, today, store) {
  const last = liveLastDate(store, r); if (!last) return null;
  const ad = r.cadence === 'weekly' ? null : r.anchorDay;
  for (let k = 1; k < 800; k++) { const d = addCadence(last, r.cadence, k, ad); if (d >= addDays(today, -7)) return d; }
  return null;
}
// الالتزامات القادمة: المؤكدة والتزام فقط (المقترح ما يدخل)، من «from» إلى «to». المتأخر لين 7 أيام ينحسب مرة وحدة
function upcomingCommitments(store, from, to, today) {
  today = today || todayISO(); const out = [];
  store.all('recurring').filter(r => r.status === 'confirmed' && r.isCommitment && r.lastDate && r.expectedAmount > 0).forEach(r => {
    let overdueTaken = false; const last = liveLastDate(store, r), ad = r.cadence === 'weekly' ? null : r.anchorDay;
    for (let k = 1; k < 800; k++) {
      const d = addCadence(last, r.cadence, k, ad);
      if (d > to) break;
      if (d < from) { if (!overdueTaken && d >= addDays(today, -7) && from <= today) { out.push({ recurringId: r.id, rec: r, name: subjectName(store, r), date: d, amount: r.expectedAmount, overdue: true }); overdueTaken = true; } continue; }
      out.push({ recurringId: r.id, rec: r, name: subjectName(store, r), date: d, amount: r.expectedAmount, overdue: false });
    }
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- 3. توقع نهاية الدورة ----------
   = الصرف الفعلي حتى اليوم + الالتزامات المؤكدة المتبقية قبل نهاية الدورة + معدل الإنفاق المتغير × الأيام المتبقية. كل رقم مستقبلي «توقع». */
function cycleForecast(store, today) {
  today = today || todayISO();
  const fr = forecastRate(store, today); if (!fr) return null;
  const cr = fr.rates, cyc = cr.cycle;
  const upcoming = upcomingCommitments(store, today, cyc.end, today), upcomingTotal = sum(upcoming, u => u.amount);
  const variableExpected = round2(fr.rate * cr.remaining), total = round2(cr.all.amount + upcomingTotal + variableExpected);
  const R = computePeriod(store, cyc);
  return { cycle: cyc, today, elapsed: cr.elapsed, remainingDays: cr.remaining, totalDays: cr.totalDays,
    spent: cr.all.amount, spentTxIds: cr.all.txIds, variableSoFar: cr.variable.amount, variableTxIds: cr.variable.txIds,
    upcoming, upcomingTotal, rate: fr.rate, rateSource: fr.source, confidence: fr.confidence, history: fr.history, rates: cr,
    variableExpected, total, income: R.income, incomeTxIds: R.incomeItems, surplus: round2(R.income - total) };
}

/* ---------- 4. الأموال المحجوزة ----------
   الحجوزات اليدوية مستقلة. المتكرر المؤكد اللي عليه «احجز له» يولّد حجز بقيمة دفعته القادمة.
   إذا فيه حجز يدوي مربوط بنفس المتكرر، ينحسب اليدوي بس (ما ينخصم نفس الالتزام مرتين). */
function saveReserve(store, d) {
  const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 60); if (!name) return { error: 'name' };
  const amount = E.parseNum(d.amount); if (!(amount > 0)) return { error: 'amount' };
  if (d.recurringId && !store.get('recurring', d.recurringId)) return { error: 'recurring' };
  const r = d.id ? store.get('reserves', d.id) : { id: 'rs-' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 10), active: true, createdAt: new Date().toISOString() };
  if (!r) return { error: 'missing' };
  Object.assign(r, { name, amount: round2(amount), dueDate: d.dueDate || null, recurringId: d.recurringId || null });
  if (d.active !== undefined) r.active = !!d.active;
  store.put('reserves', r); store.touch(); return { reserve: r };
}
function deleteReserve(store, id) { if (!store.get('reserves', id)) return null; store.remove('reserves', id); store.touch(); return true; }
function reservesTotal(store, today) {
  today = today || todayISO();
  const manual = store.all('reserves').filter(r => r.active !== false && Number(r.amount) > 0);
  const covered = new Set(manual.filter(r => r.recurringId).map(r => r.recurringId));
  const items = manual.map(r => ({ kind: 'manual', id: r.id, name: r.name, amount: round2(r.amount), dueDate: r.dueDate || null, recurringId: r.recurringId || null }));
  const skipped = [];
  store.all('recurring').filter(r => r.status === 'confirmed' && r.reserve && r.expectedAmount > 0).forEach(r => {
    if (covered.has(r.id)) { skipped.push({ recurringId: r.id, name: subjectName(store, r), amount: r.expectedAmount, reason: 'manual' }); return; }
    items.push({ kind: 'recurring', id: r.id, name: subjectName(store, r), amount: round2(r.expectedAmount), dueDate: nextDue(r, today, store), recurringId: r.id });
  });
  return { total: sum(items, i => i.amount), items, skipped, coveredRecurring: new Set(items.map(i => i.recurringId).filter(Boolean)) };
}

/* ---------- 5. السيولة القابلة للصرف ----------
   = الحسابات الجارية والمحافظ القابلة للصرف + النقد − أرصدة البطاقات المستحقة − الأموال المحجوزة.
   رصيد كل حساب = آخر سجل رصيد (كشف أو رسالة) + العمليات اللي بعده على نفس الحساب (تقديري).
   الادخار ما يدخل افتراضيًا. الحساب غير المحدد (مثل حساب جا من تحويل) يظهر «سيولة غير محددة» وما ينجمع.
   الحد الائتماني والمتاح في البطاقة مو سيولة. الرصيد الدائن في البطاقة (سداد زيادة) يظهر لحاله وما ينضاف. */
const AUTO_CLASS = { checking: 'spendable', wallet: 'spendable', savings: 'savings', cash: 'spendable' };
function liquidityClassOf(a) { if (has(a.liquidityClass)) return a.liquidityClass; if (a.autoCreated) return null; return AUTO_CLASS[a.type] || null; }
function afterSnap(t, snap, sDate, sTime) {
  const d = txDate(t); if (!d) return false;
  if (snap.txId && t.id === snap.txId) return false;
  if (snap.importId && (t.sourceLinks || []).some(sl => sl.importId === snap.importId)) return false;
  return d > sDate || (d === sDate && !!sTime && !!t.time && t.time > sTime);
}
function accountNow(store, a) {
  const snap = latestSnapshot(store, a.id);
  if (!snap) return { balance: null, snapshot: null, rolled: 0, rolledTxIds: [] };
  const k = snapKey(snap), sDate = k.slice(0, 10), sTime = String(snap.asOf).length > 10 ? k.slice(11) : null;
  let delta = 0; const ids = [];
  store.all('transactions').forEach(t => { if (t.accountId !== a.id || !afterSnap(t, snap, sDate, sTime)) return; delta += t.direction === 'in' ? t.grossAmount : -t.grossAmount; ids.push(t.id); });
  return { balance: round2(snap.balance + delta), snapshot: snap, rolled: round2(delta), rolledTxIds: ids };
}
// البطاقة: موجب = مستحق عليك. بعد الكشف: المشتريات تزيد، والاستردادات والسداد (من الحساب الجاري) تنقص
function cardNow(store, a) {
  const snap = latestSnapshot(store, a.id);
  if (!snap) return { balance: null, snapshot: null, rolled: 0, rolledTxIds: [] };
  const k = snapKey(snap), sDate = k.slice(0, 10), sTime = String(snap.asOf).length > 10 ? k.slice(11) : null;
  let delta = 0; const ids = [], counted = new Set();
  store.all('transactions').forEach(t => {
    if (t.accountId !== a.id || !afterSnap(t, snap, sDate, sTime)) return;
    delta += t.direction === 'out' ? t.grossAmount : -t.grossAmount; ids.push(t.id); counted.add(t.id);
  });
  store.all('transactions').forEach(t => {
    if (t.transactionType !== 'CreditCardPayment' || t.direction !== 'out' || t.targetCardId !== a.id || !afterSnap(t, snap, sDate, sTime)) return;
    if ((t.linkedTransactionIds || []).some(x => counted.has(x))) return; // طرفها الثاني على البطاقة انحسب فوق
    delta -= t.principalAmount; ids.push(t.id);
  });
  return { balance: round2(snap.balance + delta), snapshot: snap, rolled: round2(delta), rolledTxIds: ids };
}
function liquidity(store, today) {
  today = today || todayISO();
  const accs = store.all('accounts').filter(a => a.isMine !== false && a.active !== false);
  const out = { spendable: [], savings: [], excluded: [], unknown: [], cards: [], cardCredit: [], unknownCards: [], cash: 0, cashAccountId: null, cashIncluded: true };
  const stale = (snap) => snap ? daysBetween(String(snap.asOf).slice(0, 10), today) > 7 : false;
  accs.forEach(a => {
    if (a.type === 'cash') { out.cashAccountId = a.id; out.cash = cashBalance(store, a.id); out.cashIncluded = liquidityClassOf(a) === 'spendable'; return; }
    if (a.type === 'credit_card') {
      const n = cardNow(store, a), row = Object.assign({ account: a, stale: stale(n.snapshot) }, n);
      if (n.balance == null) out.unknownCards.push(row); else if (n.balance > 0.004) out.cards.push(row); else if (n.balance < -0.004) out.cardCredit.push(row);
      return;
    }
    const cls = liquidityClassOf(a), n = accountNow(store, a), row = Object.assign({ account: a, cls, stale: stale(n.snapshot) }, n);
    (cls === 'spendable' ? out.spendable : cls === 'savings' ? out.savings : cls === 'excluded' ? out.excluded : out.unknown).push(row);
  });
  out.spendableSum = sum(out.spendable.filter(r => r.balance != null), r => r.balance);
  out.spendableUnknownBalance = out.spendable.filter(r => r.balance == null);
  out.savingsSum = sum(out.savings.filter(r => r.balance != null), r => r.balance);
  out.unknownSum = sum(out.unknown.filter(r => r.balance != null), r => r.balance);
  out.due = sum(out.cards, r => r.balance);
  out.cardCreditTotal = sum(out.cardCredit, r => -r.balance);
  out.reserves = reservesTotal(store, today);
  out.cashCounted = out.cashIncluded ? round2(out.cash) : 0;
  out.total = round2(out.spendableSum + out.cashCounted - out.due - out.reserves.total);
  out.known = out.spendable.some(r => r.balance != null) || out.cash > 0;
  return out;
}
function setLiquidityClass(store, accountId, cls) {
  const a = store.get('accounts', accountId); if (!a) return null;
  a.liquidityClass = ['spendable', 'savings', 'excluded'].includes(cls) ? cls : null; store.put('accounts', a); store.touch(); return a;
}

/* ---------- 6. الضروري والكمالي ----------
   الضرورة من سلسلة الأولوية لكل جزء من الإنفاق. أجزاء السحب المقسّم تاخذ ضرورة تصنيف الجزء، والرسوم ضرورة «رسوم».
   اللي ما له ضرورة محددة يبقى «غير محدد» (ما نخمّن). */
function partAttr(store, tx, p, field) {
  const a = spendAnchor(store, tx);
  if (p.cat === 'fees') return catChain(store, 'fees', p.sub, field);
  // السحب النقدي: كل جزء (والباقي تحت «سحب نقدي» أو تصنيف السحب) ياخذ خصائص تصنيفه، إلا إذا حددتها للعملية نفسها
  if (p.partId || a.transactionType === 'CashWithdrawal') { const tf = CHAIN[field][0]; if (has(a[tf])) return a[tf]; return catChain(store, p.cat === '__none' ? null : p.cat, p.sub, field); }
  return effective(store, a, field);
}
const NEC = ['essential', 'discretionary', 'undefined'];
function necOfPart(store, tx, p) { const v = partAttr(store, tx, p, 'nec'); return v === 'essential' || v === 'discretionary' ? v : 'undefined'; }
function necessityBreakdown(store, period) {
  const out = { period, total: 0 }; NEC.forEach(k => { out[k] = { amount: 0, cats: new Map(), txIds: new Set() }; });
  store.all('transactions').forEach(t => {
    if (!inSpendPeriod(store, t, period)) return;
    spendParts(store, t).forEach(p => { const k = necOfPart(store, t, p), o = out[k]; o.amount += p.amt; o.cats.set(p.cat, (o.cats.get(p.cat) || 0) + p.amt); o.txIds.add(t.id); });
  });
  NEC.forEach(k => { const o = out[k]; o.amount = round2(o.amount); out.total += o.amount; o.categories = Array.from(o.cats.entries()).map(([c, v]) => ({ categoryId: c, amount: round2(v) })).filter(x => Math.abs(x.amount) > 0.004).sort((a, b) => b.amount - a.amount); o.txIds = Array.from(o.txIds); delete o.cats; });
  out.total = round2(out.total);
  NEC.forEach(k => { out[k].pct = out.total ? Math.round(out[k].amount / out.total * 1000) / 10 : 0; });
  return out;
}
function monthPeriod(y, m) { return { start: isoDate(y, m, 1), end: isoDate(y, m, daysInMonth(y, m)), kind: 'month' }; }
function necessityTrendMonths(store, year) { const out = []; for (let m = 1; m <= 12; m++) { const p = monthPeriod(year, m), b = necessityBreakdown(store, p); out.push({ period: p, essential: b.essential.amount, discretionary: b.discretionary.amount, undefined: b.undefined.amount, total: b.total }); } return out; }
function necessityTrendCycles(store, today, n) {
  today = today || todayISO();
  return listCycles(store, today).filter(c => c.start <= today).slice(0, n || 6).reverse().map(c => { const b = necessityBreakdown(store, c); return { period: c, open: c.end >= today, essential: b.essential.amount, discretionary: b.discretionary.amount, undefined: b.undefined.amount, total: b.total }; });
}

/* ---------- 7. فرص التوفير ----------
   الهدف: الرجوع للسلوك الطبيعي، مو تخفيض عشوائي. تدخل فقط الأجزاء الكمالية (necessity = discretionary) والمؤهلة للتوفير (savingsEligible = true).
   التبرعات ما تدخل أبدًا. لكل تصنيف: الفعلي (أو التوقع لنهاية الدورة الحالية) − الطبيعي التاريخي؛ الموجب فرصة والسالب صفر،
   وما يعوّض تصنيف تصنيف. الطبيعي: دورة مكتملة وحدة = مقارنة بس، دورتان = تقدير أولي (تحذير)، 3 أو أكثر = وسيط آخر 3 دورات. */
function eligibleParts(store, tx) {
  return spendParts(store, tx).filter(p => {
    if (p.cat === 'donations') return false;
    return partAttr(store, tx, p, 'nec') === 'discretionary' && partAttr(store, tx, p, 'save') === true;
  });
}
function eligibleVariableParts(store, tx) {
  const a = spendAnchor(store, tx);
  if (isKnownCommitment(store, a) || rateExcludedTx(store, tx)) return [];
  const cats = new Set((store.settings.rateExclusions || []).filter(e => e.type === 'category').map(e => e.id));
  return eligibleParts(store, tx).filter(p => !cats.has(p.cat));
}
function savingsOpportunities(store, today, opts) {
  today = today || todayISO(); opts = opts || {};
  let target, hist, isForecast;
  if (opts.cycle) { target = opts.cycle; const all = completeCycles(store, today, 24); hist = all.filter(c => c.end < target.start).slice(0, 3); isForecast = target.end >= today; }
  else { target = currentCycle(store, today); if (!target) return null; hist = completeCycles(store, today, 3); isForecast = true; }
  const mode = hist.length >= 3 ? 'median' : hist.length === 2 ? 'preliminary' : hist.length === 1 ? 'compare' : 'none';
  const histCats = hist.map(c => spendBetween(store, c, eligibleParts));
  let actualRange = target, elapsed = daysBetween(target.start, target.end) + 1, remaining = 0;
  if (isForecast) { actualRange = { start: target.start, end: minD(today, target.end) }; elapsed = daysBetween(target.start, actualRange.end) + 1; remaining = Math.max(0, daysBetween(actualRange.end, target.end)); }
  const actual = spendBetween(store, actualRange, eligibleParts), actualVar = spendBetween(store, actualRange, eligibleVariableParts);
  // الالتزامات المؤكدة المؤهلة (مثل اشتراك) الباقية قبل نهاية الدورة
  const upByCat = new Map();
  if (isForecast) upcomingCommitments(store, today, target.end, today).forEach(u => {
    const last = store.get('transactions', (u.rec.evidenceTxIds || []).slice(-1)[0]); if (!last) return;
    const ps = eligibleParts(store, last); if (!ps.length) return;
    const c = ps[0].cat; upByCat.set(c, round2((upByCat.get(c) || 0) + u.amount));
  });
  const histVar = hist.map(c => ({ c, days: daysBetween(c.start, c.end) + 1, v: spendBetween(store, c, eligibleVariableParts) }));
  const cats = new Set(); actual.byCat.forEach((v, k) => cats.add(k)); histCats.forEach(h => h.byCat.forEach((v, k) => cats.add(k))); upByCat.forEach((v, k) => cats.add(k));
  const rows = []; let lowConfidence = false;
  cats.forEach(cat => {
    const act = round2(actual.byCat.get(cat) || 0), history = histCats.map((h, i) => ({ cycle: hist[i], amount: round2(h.byCat.get(cat) || 0) }));
    let forecast = act, rate = null, rateSource = null;
    if (isForecast && remaining > 0) {
      const curVar = round2(actualVar.byCat.get(cat) || 0);
      if (elapsed >= 7) { rate = round2(curVar / elapsed); rateSource = 'current'; }
      else if (histVar.length >= 3) { rate = median(histVar.map(h => round2((h.v.byCat.get(cat) || 0) / h.days))); rateSource = 'history'; }
      else { rate = round2(curVar / elapsed); rateSource = 'current_low'; lowConfidence = true; }
      forecast = round2(act + (upByCat.get(cat) || 0) + rate * remaining);
    }
    const normal = mode === 'median' ? median(history.map(h => h.amount)) : mode === 'preliminary' ? median(history.map(h => h.amount)) : mode === 'compare' ? history[0].amount : null;
    const opportunity = (mode === 'median' || mode === 'preliminary') ? round2(Math.max(0, forecast - normal)) : null;
    if (Math.abs(act) < 0.005 && Math.abs(forecast) < 0.005 && history.every(h => Math.abs(h.amount) < 0.005)) return;
    rows.push({ categoryId: cat, actual: act, upcoming: upByCat.get(cat) || 0, rate, rateSource, forecast, normal, history, opportunity, diff: normal != null ? round2(forecast - normal) : null });
  });
  rows.sort((a, b) => (b.opportunity || 0) - (a.opportunity || 0) || b.forecast - a.forecast);
  const total = mode === 'median' || mode === 'preliminary' ? sum(rows.filter(r => r.opportunity > 0), r => r.opportunity) : null;
  const eligibleForecast = sum(rows, r => r.forecast);
  return { target, isForecast, elapsed, remaining, mode, hist, rows, total, eligibleForecast, lowConfidence, actualTxIds: actual.txIds,
    whatIf: [10, 20, 30].map(p => ({ pct: p, amount: round2(eligibleForecast * p / 100) })) };
}

/* ---------- 8. المنتجات ----------
   تحليل المنتجات يقرأ الأغراض فقط (صافي كل غرض بعد الاستردادات)، بتاريخ إنفاق العملية الأم. ما ينجمع مع الأرقام المالية. */
function itemRows(store, period, f) {
  f = f || {}; const out = [];
  store.all('transactions').forEach(t => {
    if (!canHaveItems(t) || !(t.items || []).length || isExcluded(store, t)) return;
    if (period && !inSpendPeriod(store, t, period)) return;
    if (f.cityId !== undefined) { const c = cityOf(store, t, f.cityMode).cityId || '__unknown'; if (c !== f.cityId) return; }
    itemNet(store, t).forEach(o => {
      const it = o.item;
      if (f.productCategoryId !== undefined && (it.productCategoryId || '__none') !== f.productCategoryId) return;
      if (f.productId && it.productId !== f.productId) return;
      if (f.groupId && !(it.groupIds || []).includes(f.groupId) && !(t.groupIds || []).includes(f.groupId)) return;
      out.push({ tx: t, item: it, total: o.total, allocated: o.allocated, estimated: o.estimated, net: o.net, over: o.over, date: txDate(t) });
    });
  });
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
function productSpend(store, period, f) {
  const rows = itemRows(store, period, f), byCat = new Map(), byProduct = new Map();
  rows.forEach(r => {
    const c = r.item.productCategoryId || '__none', o = byCat.get(c) || { productCategoryId: c, amount: 0, count: 0 };
    o.amount = round2(o.amount + r.net); o.count++; byCat.set(c, o);
    const k = r.item.productId || r.item.name, p = byProduct.get(k) || { productId: r.item.productId || null, name: r.item.name, amount: 0, qty: 0, count: 0 };
    p.amount = round2(p.amount + r.net); p.qty = round2(p.qty + Number(r.item.qty || 1)); p.count++; byProduct.set(k, p);
  });
  return { rows, total: sum(rows, r => r.net), estimated: rows.some(r => r.estimated > 0), byCat, categories: Array.from(byCat.values()).sort((a, b) => b.amount - a.amount), products: Array.from(byProduct.values()).sort((a, b) => b.amount - a.amount) };
}

/* ---------- 9. المدن ----------
   الافتراضي (1.5.1): المدن المعتمدة فقط (الرقم الرسمي). اقتراح موقع الجوال غير المعتمد يدخل فقط مع mode = 'withGps'
   («تضمين اقتراحات الموقع»). «مدينتي الحالية» ما تعتبر حقيقة فما تدخل. */
function cityStats(store, cityId, period, track, mode) {
  if (track === 'products') {
    const ps = productSpend(store, period, { cityId, cityMode: mode });
    const txs = new Set(ps.rows.map(r => r.tx.id));
    return { cityId, track, total: ps.total, count: txs.size, avg: txs.size ? round2(ps.total / txs.size) : 0, categories: ps.categories.slice(0, 5), txIds: Array.from(txs), estimated: ps.estimated };
  }
  // العدد بالعملية الأصلية: الاسترداد المربوط ينقص شراءه وما ينعد عملية ثانية
  let total = 0; const ids = [], cats = new Map(), anchors = new Set(), gpsA = new Set();
  store.all('transactions').forEach(t => {
    if (period && !inSpendPeriod(store, t, period)) return;
    const c = cityOf(store, t, mode); if ((c.cityId || '__unknown') !== cityId) return;
    const ps = spendParts(store, t); if (!ps.length) return;
    let v = 0; ps.forEach(p => { v += p.amt; cats.set(p.cat, round2((cats.get(p.cat) || 0) + p.amt)); });
    if (Math.abs(v) < 0.005) return;
    total += v; ids.push(t.id); const aid = spendAnchor(store, t).id; anchors.add(aid); if (c.source === 'gps') gpsA.add(aid);
  });
  total = round2(total);
  return { cityId, track, total, count: anchors.size, avg: anchors.size ? round2(total / anchors.size) : 0, gpsCount: gpsA.size, txIds: ids,
    categories: Array.from(cats.entries()).map(([k, v]) => ({ categoryId: k, amount: v })).filter(x => x.amount > 0.004).sort((a, b) => b.amount - a.amount).slice(0, 5) };
}
function citiesSummary(store, period, mode) {
  const m = new Map();
  store.all('transactions').forEach(t => {
    if (period && !inSpendPeriod(store, t, period)) return;
    const ps = spendParts(store, t); if (!ps.length) return;
    const c = cityOf(store, t, mode).cityId || '__unknown', v = sum(ps, p => p.amt);
    if (Math.abs(v) < 0.005) return;
    const o = m.get(c) || { cityId: c, amount: 0, anchors: new Set() }; o.amount = round2(o.amount + v); o.anchors.add(spendAnchor(store, t).id); m.set(c, o);
  });
  return Array.from(m.values()).map(o => ({ cityId: o.cityId, amount: o.amount, count: o.anchors.size })).sort((a, b) => b.amount - a.amount);
}

/* ---------- 10. المقارنات ----------
   مساران ما ينخلطون: العمليات المالية (الإنفاق الحقيقي) أو المنتجات (الأغراض). المتوسط اليومي = الإجمالي ÷ عدد أيام الفترة
   (للفترة اللي ما انتهت: الأيام اللي مضت حتى اليوم). */
function periodSummary(store, p, track, today) {
  today = today || todayISO();
  const end = minD(p.end, today), days = p.start > today ? 0 : daysBetween(p.start, end) + 1;
  if (track === 'products') { const ps = productSpend(store, p); return { period: p, track, total: ps.total, days, daily: days ? round2(ps.total / days) : 0, categories: ps.categories.slice(0, 5), count: ps.rows.length, estimated: ps.estimated, open: p.end > today }; }
  const R = computePeriod(store, p);
  return { period: p, track, total: R.spend, days, daily: days ? round2(R.spend / days) : 0, categories: R.categories.filter(c => c.amount > 0).slice(0, 5).map(c => ({ categoryId: c.categoryId || '__none', amount: c.amount })), count: R.topTx.length, open: p.end > today, coverage: R.coverage };
}
function comparePeriodsFull(store, a, b, track, today) {
  const A = periodSummary(store, a, track, today), B = periodSummary(store, b, track, today);
  const diff = round2(B.total - A.total);
  return { a: A, b: B, diff, pct: A.total ? Math.round(diff / A.total * 1000) / 10 : null, dailyDiff: round2(B.daily - A.daily) };
}
function acrossPeriods(store, unit, n, track, today) {
  today = today || todayISO(); n = n || 6;
  let periods = [];
  if (unit === 'week') { let w = weekOf(today); for (let i = 0; i < n; i++) { periods.push(w); w = weekOf(addDays(w.start, -7)); } }
  else if (unit === 'month') { let [y, m] = today.split('-').map(Number); for (let i = 0; i < n; i++) { periods.push(monthPeriod(y, m)); m--; if (m < 1) { m = 12; y--; } } }
  else periods = listCycles(store, today).filter(c => c.start <= today).slice(0, n);
  const rows = periods.reverse().map(p => { const s = periodSummary(store, p, track, today); return Object.assign(s, { complete: p.end < today }); });
  const done = rows.filter(r => r.complete);
  return { unit, track, rows, average: done.length ? round2(sum(done, r => r.total) / done.length) : null, completeCount: done.length };
}

/* ---------- 11. العرض السنوي (يناير ← ديسمبر) ---------- */
function annualView(store, year) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const p = monthPeriod(year, m), R = computePeriod(store, p), nb = necessityBreakdown(store, p);
    months.push({ month: m, period: p, income: R.income, spend: R.spend, surplus: R.surplus, essential: nb.essential.amount, discretionary: nb.discretionary.amount, undefined: nb.undefined.amount,
      top: R.categories.filter(c => c.amount > 0).slice(0, 3).map(c => ({ categoryId: c.categoryId || '__none', amount: c.amount })), txCount: R.txCount });
  }
  months.forEach((x, i) => { const pv = i ? months[i - 1] : null; x.vsPrev = pv && pv.spend ? round2(x.spend - pv.spend) : null; x.vsPrevPct = pv && pv.spend ? Math.round((x.spend - pv.spend) / pv.spend * 1000) / 10 : null; });
  const yp = { start: `${year}-01-01`, end: `${year}-12-31`, kind: 'year' }, RY = computePeriod(store, yp);
  return { year, months, income: RY.income, spend: RY.spend, surplus: RY.surplus, topMerchants: RY.topMerchants.slice(0, 10), topCategories: RY.categories.filter(c => c.amount > 0).slice(0, 8) };
}

/* ---------- 12. مركز التنبيهات ----------
   التنبيه يُحسب من البيانات وقت العرض. جدول alertStates يحفظ بس الإخفاء (dismiss) والتأجيل (snooze) لكل تنبيه بمفتاحه،
   والمفتاح فيه الدورة أو الموعد، فما يتكرر نفس التنبيه. */
function computeAlerts(store, today) {
  today = today || todayISO();
  const list = [], cur = currentCycle(store, today), fm = (x) => Number(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const catName = (id) => id === '__none' ? 'بدون تصنيف' : id === '__person' ? 'تحويلات لأشخاص' : id === '__roundup' ? 'تقريب' : E.catName(store, id);
  if (cur) E.limitsStatus(store, cur).forEach(l => {
    if (l.level === 'ok') return;
    const nm = l.scope === 'total' ? 'الإنفاق الكلي' : l.scope === 'productCategory' ? ((store.get('productCategories', l.productCategoryId) || {}).name || 'منتجات') : catName(l.categoryId);
    list.push({ id: `limit:${l.id}:${cur.start}:${l.level}`, kind: 'limit', level: l.level === 'over' ? 'high' : 'mid', title: l.level === 'over' ? `تجاوزت حد «${nm}»` : `وصلت ${Math.floor(l.pct)}% من حد «${nm}»`, body: `${fm(l.spent)} من ${fm(l.amount)}`, ref: { limitId: l.id } });
  });
  store.all('groups').filter(g => g.active !== false && g.budget).forEach(g => {
    const s = E.groupStats(store, g.id); if (!s || !(s.level === 'over' || s.level === 'warn')) return;
    list.push({ id: `group:${g.id}:${s.level}`, kind: 'group', level: s.level === 'over' ? 'high' : 'mid', title: s.level === 'over' ? `تجاوزت ميزانية «${g.name}»` : `وصلت ${Math.floor(s.pct)}% من ميزانية «${g.name}»`, body: `${fm(s.spend)} من ${fm(s.budget)}`, ref: { groupId: g.id } });
  });
  upcomingCommitments(store, today, addDays(today, 3), today).forEach(u => list.push({ id: `due:${u.recurringId}:${u.date}`, kind: 'due', level: 'mid', title: u.overdue ? `التزام متأخر: ${u.name}` : `التزام قريب: ${u.name}`, body: `${fm(u.amount)} · ${u.date}`, ref: { recurringId: u.recurringId } }));
  store.all('recurring').filter(r => r.status === 'suggested').forEach(r => list.push({ id: `rec:${r.id}`, kind: 'recurring', level: 'low', title: `اشتراك أو التزام محتمل: ${subjectName(store, r)}`, body: `${CAD_L[r.cadence] || r.cadence} · ${fm(r.expectedAmount)} تقريبًا`, ref: { recurringId: r.id } }));
  const hist = cur ? completeCycles(store, today, 3) : [];
  if (cur && hist.length >= 3) {
    const elapsed = daysBetween(cur.start, today) + 1;
    const curC = spendBetween(store, { start: cur.start, end: today }, allParts).byCat;
    const histC = hist.map(c => spendBetween(store, { start: c.start, end: minD(c.end, addDays(c.start, elapsed - 1)) }, allParts).byCat);
    curC.forEach((v, cat) => {
      if (cat === '__none' || cat === 'fees') return;
      const med = median(histC.map(h => h.get(cat) || 0));
      if (v > med * 1.5 && v - med >= 100) list.push({ id: `rise:${cat}:${cur.start}`, kind: 'rise', level: 'mid', title: `ارتفاع غير معتاد في «${catName(cat)}»`, body: `${fm(v)} حتى اليوم، والمعتاد لنفس الأيام ${fm(med)}`, ref: { categoryId: cat } });
    });
    const fc = cycleForecast(store, today), normal = median(hist.map(c => spendBetween(store, c, allParts).amount));
    if (fc && fc.total > normal * 1.1 && fc.total - normal >= 200) list.push({ id: `fcst:${cur.start}`, kind: 'forecast', level: 'mid', title: 'التوقع يتجاوز صرفك المعتاد', body: `توقع نهاية الدورة ${fm(fc.total)}، والمعتاد ${fm(normal)}`, ref: {} });
  }
  if (cur) {
    const L = liquidity(store, today), up = upcomingCommitments(store, today, cur.end, today);
    const unreserved = sum(up.filter(u => !L.reserves.coveredRecurring.has(u.recurringId)), u => u.amount);
    if (L.known && unreserved > 0 && L.total < unreserved) list.push({ id: `liq:${cur.start}`, kind: 'liquidity', level: 'high', title: 'السيولة أقل من التزاماتك القادمة', body: `السيولة القابلة للصرف ${fm(L.total)}، والتزامات قبل نهاية الدورة ${fm(unreserved)}`, ref: {} });
  }
  const states = new Map(store.all('alertStates').map(s => [s.id, s])), nowIso = new Date().toISOString();
  list.forEach(a => { const s = states.get(a.id); a.hidden = !!(s && (s.dismissedAt || (s.snoozeUntil && s.snoozeUntil > nowIso))); a.snoozed = !!(s && s.snoozeUntil && s.snoozeUntil > nowIso); });
  const RANK = { high: 0, mid: 1, low: 2 };
  return list.sort((a, b) => RANK[a.level] - RANK[b.level]);
}
const CAD_L = { weekly: 'أسبوعي', monthly: 'شهري', yearly: 'سنوي' };
function dismissAlert(store, id) { store.put('alertStates', { id, dismissedAt: new Date().toISOString(), snoozeUntil: null }); store.touch(); }
function snoozeAlert(store, id, days) { store.put('alertStates', { id, dismissedAt: null, snoozeUntil: new Date(Date.now() + (days || 1) * 86400000).toISOString() }); store.touch(); }
function restoreAlert(store, id) { if (store.get('alertStates', id)) { store.remove('alertStates', id); store.touch(); } }

Object.assign(E, {
  median, completeCycles, variableParts, spendBetween, addRateExclusion, removeRateExclusion, isRateExcluded, cycleRates, historyRates, forecastRate,
  CAD, CAD_L, addCadence, detectRecurring, liveLastDate, subjectName, recurringOfTx, confirmRecurring, dismissRecurring, setRecurringReserve, nextDue, upcomingCommitments,
  cycleForecast, saveReserve, deleteReserve, reservesTotal, liquidityClassOf, accountNow, cardNow, liquidity, setLiquidityClass,
  partAttr, necOfPart, necessityBreakdown, necessityTrendMonths, necessityTrendCycles, monthPeriod, eligibleParts, savingsOpportunities,
  itemRows, productSpend, cityStats, citiesSummary, periodSummary, comparePeriodsFull, acrossPeriods, annualView,
  computeAlerts, dismissAlert, snoozeAlert, restoreAlert,
});
if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
