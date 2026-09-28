/* قراءة رسائل البنوك — بدون أي اتصال
   1) فرز الرسالة: financial / otp / informational / unknown
   2) قراءة عامة لرسائل البنوك السعودية (المبلغ، الاتجاه، التاجر أو المستفيد، البطاقة، الحساب، التاريخ، الرصيد)
   3) تعلّم صيغة بنك جديدة من مثال واحد، وتطبيقها على الرسائل القادمة */
(function (root) {
'use strict';

/* ---------- التنظيف ---------- */
function norm(text) {
  return String(text == null ? '' : text)
    .replace(/[‎‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/٫/g, '.').replace(/٬/g, ',').replace(/\r\n?/g, '\n')
    .split('\n').map(l => l.replace(/[ \t ]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
/* ---------- فصل عدة رسائل ملصوقة (فكرة «مصروفي») ----------
   1) السطر الفاضي أولًا، وهو الأضمن.
   2) إذا ما فيه سطر فاضي: رسالة جديدة تبدأ عند سطر أوله كلمة نوع (شراء، حوالة، سحب…).
   3) أي مقطع ما فيه مبلغ ولا تاريخ ولا وقت يرجع يلتصق باللي قبله، عشان ما نقسم رسالة وحدة بالغلط.
   4) إذا الفصل مشكوك فيه نرجع تنبيهات، والواجهة تطلب تأكيد عدد الرسائل قبل المعالجة. */
const MSG_STARTERS = ['شراء', 'مشتريات', 'نقاط البيع', 'سحب', 'إيداع', 'ايداع', 'راتب', 'حوالة', 'حواله', 'تحويل', 'استرداد', 'مسترد', 'سداد', 'دفع', 'عملية', 'عمليه',
  'purchase', 'refund', 'pos', 'withdrawal', 'deposit', 'transfer', 'payment', 'رمز التحقق', 'رمز تحقق', 'otp'];
const SEG_AMT = new RegExp('\\d[\\d,]*\\.\\d{2}(?!\\d)|' + NUM_SRC() + '\\s*' + CUR_SRC() + '|' + CUR_SRC() + '\\s*\\d', 'i');
const SEG_DAY = /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/;
const SEG_TIME = /\d{1,2}:\d{2}/;
function NUM_SRC() { return '\\d[\\d,]*(?:\\.\\d{1,3})?'; }
function CUR_SRC() { return '(?:SAR|SR|ر\\.?\\s?س|ريال|USD|EUR|AED|GBP|US\\$|\\$)'; }
function isStarterLine(line) {
  const n = String(line).toLowerCase().replace(/^[\s*•\-–:：.)(]+/, '');
  return MSG_STARTERS.some(w => { const j = n.indexOf(w); return j >= 0 && j <= 3; });
}
const hasAnchor = (g) => SEG_AMT.test(g) || SEG_DAY.test(g) || SEG_TIME.test(g);
// تنبيه لمقطع مشكوك فيه (يمكن فيه أكثر من رسالة)
function segWarn(g) {
  const lines = g.split('\n');
  const heads = lines.filter(isStarterLine).length;
  const dates = (g.match(/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/g) || []).length;
  const amts = allAmounts(g).filter(a => a.value > 0);
  const main = amts.filter(a => !NOT_MAIN_AMOUNT.test(a.before)).length;
  if (heads > 1) return 'فيه أكثر من بداية رسالة';
  if (dates > 1) return 'فيه أكثر من تاريخ';
  if (main > 2 || amts.length > 4) return 'فيه مبالغ كثيرة';
  return '';
}
function splitDetails(text) {
  const t = norm(text);
  if (!t) return { parts: [], method: 'empty', warns: [] };
  let parts, method;
  if (/\n\s*\n/.test(t)) { parts = t.split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean); method = 'blank'; }
  if (!parts || parts.length < 2) {
    const lines = t.split('\n'), starts = [];
    lines.forEach((l, i) => { if (isStarterLine(l)) starts.push(i); });
    if (starts.length < 2) { parts = [t]; method = 'single'; }
    else {
      const segs = [];
      for (let k = 0; k < starts.length; k++) segs.push(lines.slice(k === 0 ? 0 : starts[k], k + 1 < starts.length ? starts[k + 1] : lines.length).join('\n').trim());
      parts = [];
      segs.forEach(g => { if (!g) return; if (parts.length && !hasAnchor(g)) parts[parts.length - 1] += '\n' + g; else parts.push(g); });
      method = parts.length > 1 ? 'starters' : 'single';
    }
  }
  parts = parts.filter(s => s.length >= 8);
  const warns = parts.map(segWarn);
  // الفصل بكلمات البداية تخمين، فنطلب التأكيد دائمًا. والسطر الفاضي نطلب التأكيد فقط إذا فيه تنبيه
  const confirm = method === 'starters' || warns.some(Boolean);
  return { parts, method, warns, confirm };
}
function splitMessages(text) { return splitDetails(text).parts; }

/* ---------- الفرز ---------- */
// عبارات قوية فقط لرسائل الرموز (نفس قائمة الـ Script). كلمة مفردة ما تكفي.
const OTP_STRONG = [
  /رمز\s*(ال)?تحقق/, /كلمة\s*(ال)?مرور\s*(ل)?مرة\s*واحدة/, /كلمة\s*(ال)?سر\s*(ل)?مرة\s*واحدة/, /\bOTP\b/i,
  /verification\s*code/i, /لا\s*تشارك\s*(هذا\s*)?(ال)?رمز/, /login\s*code/i, /one[\s-]*time\s*(pass(word|code)|code)/i,
  /رمز\s*(ال)?دخول/, /رمز\s*تسجيل\s*(ال)?دخول/, /رمز\s*(ال)?تفعيل/, /activation\s*code/i, /security\s*code/i,
];
// مؤشرات ضعيفة: تخلي الرسالة «غير معروفة» للمراجعة بدل حذفها
const OTP_WEAK = /(رمز|كود|code|pin|passcode)/i;
const CUR = '(?:SAR|SR|ر\\.?\\s?س\\.?|ريال(?:ا|ًا)?|USD|EUR|AED|GBP|KWD|BHD|QAR|OMR|EGP|US\\$|\\$)';
const NUM = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,3})?|\\d+(?:\\.\\d{1,3})?)';
const AMOUNT_RES = [
  new RegExp('(?:مبلغ|المبلغ|بمبلغ|قيمة|بقيمة|Amount|Amt)\\s*[:：]?\\s*(' + CUR + ')?\\s*' + NUM + '\\s*(' + CUR + ')?', 'i'),
  new RegExp('(' + CUR + ')\\s*' + NUM, 'i'),
  new RegExp(NUM + '\\s*(' + CUR + ')', 'i'),
];
const NOT_MAIN_AMOUNT = /(رصيد|الرصيد|balance|bal\b|متاح|المتاح|available|avail|الحد|limit|رسوم|fee|ضريبة|vat|المستحق|due)\s*[:：]?\s*$/i;
const FIN_VERB = /(شراء|مشتريات|سحب|إيداع|ايداع|حوالة|حواله|تحويل|سداد|دفع|خصم|استرداد|مسترد|راتب|قسط|purchase|payment|paid|transfer|withdraw|deposit|refund|debit|credit(?:ed)?\b|salary|POS|Apple\s?Pay|مدى|mada)/i;
const DECLINED = /(مرفوض|رفضت|رفض\s|declined|failed|لم\s*تتم|فشل|غير\s*ناجح|insufficient)/i;
const REMINDER = /(المبلغ\s*المستحق|الحد\s*الأدنى|الحد\s*الادنى|آخر\s*موعد|موعد\s*السداد|تاريخ\s*الاستحقاق\s*القادم|due\s*date|minimum\s*(amount\s*)?due|payment\s*due|will\s*be\s*deducted|سيتم\s*خصم)/i;
const DONE = /(تم\s|تمت|was\s|has\s*been|successful|بنجاح|completed)/i;
const INFO = /(عرض|خصم\s*خاص|تهانينا|تم\s*تحديث|تم\s*تفعيل|تم\s*إيقاف|تم\s*ايقاف|تنبيه\s*أمني|تم\s*تسجيل\s*الدخول|كشف\s*الحساب|تذكير|offer|promo|welcome|مرحب|تم\s*إصدار|تم\s*اصدار|تم\s*تغيير|logged\s*in)/i;

function extractAmount(t) {
  for (const re of AMOUNT_RES) {
    const g = new RegExp(re.source, 'gi'); let m;
    while ((m = g.exec(t))) {
      const before = t.slice(Math.max(0, m.index - 22), m.index);
      if (NOT_MAIN_AMOUNT.test(before)) continue;
      const num = m.find((x, i) => i > 0 && x && /^\d/.test(x));
      const cur = m.find((x, i) => i > 0 && x && !/^\d/.test(x));
      const value = Number(String(num).replace(/,/g, ''));
      if (!(value > 0)) continue;
      return { value: Math.round(value * 100) / 100, currency: normCur(cur), raw: m[0], index: m.index };
    }
  }
  return null;
}
function allAmounts(t) {
  const out = [], g = new RegExp('(' + CUR + ')\\s*' + NUM + '|' + NUM + '\\s*(' + CUR + ')', 'gi'); let m;
  while ((m = g.exec(t))) {
    const num = m[2] || m[3], cur = m[1] || m[4];
    out.push({ value: Number(String(num).replace(/,/g, '')), currency: normCur(cur), index: m.index, before: t.slice(Math.max(0, m.index - 22), m.index) });
  }
  return out;
}
function normCur(c) {
  if (!c) return 'SAR';
  if (/^(SAR|SR|ر|ريال)/i.test(c)) return 'SAR';
  if (/\$/.test(c)) return 'USD';
  return c.toUpperCase();
}

function classify(text) {
  const t = norm(text);
  if (OTP_STRONG.some(r => r.test(t))) return { cls: 'otp', reason: 'عبارة رمز تحقق أو دخول' };
  const amt = extractAmount(t), verb = FIN_VERB.test(t);
  if (amt && DECLINED.test(t)) return { cls: 'informational', reason: 'عملية مرفوضة أو غير مكتملة' };
  if (amt && REMINDER.test(t) && !DONE.test(t)) return { cls: 'informational', reason: 'تذكير بمبلغ مستحق' };
  if (amt && verb) return { cls: 'financial', reason: '' };
  if (OTP_WEAK.test(t) && /\b\d{4,8}\b/.test(t)) return { cls: 'unknown', reason: 'فيها رمز أو رقم قصير؛ تحتاج تأكيدك' };
  if (INFO.test(t) || (amt && !verb)) return { cls: 'informational', reason: amt ? 'فيها مبلغ بدون حركة' : 'رسالة معلومات' };
  return { cls: 'unknown', reason: 'ما تعرفت على نوعها' };
}

/* ---------- القراءة العامة ---------- */
const FAMILY_RULES = [
  ['card_payment', 'out', /(سداد\s*(ال)?بطاق|سداد\s*مستحقات\s*(ال)?بطاق|credit\s*card\s*payment|card\s*payment)/i],
  ['bill_payment', 'out', /(سداد\s*فاتور|فاتورة|SADAD|bill\s*payment)/i],
  ['sms_refund', 'in', /(استرداد|مسترد|إرجاع|ارجاع|refund|reversal|عكس\s*عملية)/i],
  ['salary', 'in', /(إيداع\s*راتب|ايداع\s*راتب|راتب|salary|payroll)/i],
  ['sms_transfer_in', 'in', /(حوال[ةه]\s*وارد|تحويل\s*وارد|إيداع\s*حوال|ايداع\s*حوال|incoming\s*transfer|transfer\s*from|received\s*transfer|حوال[ةه]\s*داخلية\s*وارد)/i],
  ['sms_transfer_out', 'out', /(حوال[ةه]\s*صادر|تحويل\s*صادر|تحويل\s*(إلى|الى)|حوال[ةه]\s*(إلى|الى)|outgoing\s*transfer|transfer\s*to|سريع\s*صادر|حوال[ةه]\s*محلي|حوال[ةه]\s*دولي)/i],
  ['sms_cash_withdrawal', 'out', /(سحب\s*نقد|سحب\s*من\s*(ال)?صراف|صراف|ATM|cash\s*withdrawal)/i],
  ['sms_cash_deposit', 'in', /(إيداع\s*نقد|ايداع\s*نقد|cash\s*deposit)/i],
  ['sms_purchase', 'out', /(شراء|مشتريات|نقاط\s*(ال)?بيع|POS|purchase|apple\s?pay|mada\s*pay|مدى|أونلاين|اونلاين|عبر\s*(ال)?إنترنت|عبر\s*(ال)?انترنت|online|e-?commerce|دفع)/i],
  ['sms_debit', 'out', /(خصم|مدين|debited|\bdebit\b|withdrawn)/i],
  ['sms_credit', 'in', /(إيداع|ايداع|دائن|credited|deposited|\bcredit\b(?!\s*card))/i],
];
const MASKED4 = /(?:[*xX•#]{1,}\s?(\d{4})\b|\b(\d{4})\s?[*xX•#]{1,})/g;
const ACC_KW = /(حساب|الحساب|account|acc\b|من\s*[:：]|IBAN|آيبان|ايبان)/i;
const CARD_KW = /(بطاق|card|مدى|mada|visa|فيزا|ماستر|master|apple|أبل|ابل|ائتمان|credit)/i;

function findLast4s(t) {
  const out = { card: null, account: null, others: [] }; let m;
  const g = new RegExp(MASKED4.source, 'g');
  while ((m = g.exec(t))) {
    const d = m[1] || m[2], before = t.slice(Math.max(0, m.index - 28), m.index);
    const isAcc = ACC_KW.test(before) && !CARD_KW.test(before.slice(-14));
    const isCard = CARD_KW.test(before);
    if (/SA\s*[*•]+\s*$/i.test(t.slice(Math.max(0, m.index - 6), m.index + 1))) { out.others.push({ d, kind: 'iban' }); continue; }
    if (isCard && !out.card) out.card = d; else if (isAcc && !out.account) out.account = d; else out.others.push({ d, kind: 'unknown' });
  }
  // آخر 4 أرقام بدون نجوم بعد كلمة «بطاقة» أو «حساب» مباشرة
  if (!out.card) { const c = t.match(/(?:بطاقة|البطاقة|card)\s*[:：]?\s*(\d{4})(?!\d)/i); if (c) out.card = c[1]; }
  if (!out.account) { const a = t.match(/(?:حساب|الحساب|account)\s*[:：]?\s*(\d{4})(?!\d)/i); if (a) out.account = a[1]; }
  return out;
}
function findDate(t) {
  let m, date = null, time = null;
  if ((m = t.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/))) date = ymd(+m[1], +m[2], +m[3]);
  else if ((m = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/))) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; date = ymd(y, +m[2], +m[1]) || ymd(y, +m[1], +m[2]); }
  if ((m = t.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm|ص|م)?(?![\d:])/))) {
    let h = +m[1]; const mi = +m[2], ap = m[3];
    if (ap && /PM|pm|م/.test(ap) && h < 12) h += 12; if (ap && /AM|am|ص/.test(ap) && h === 12) h = 0;
    if (h < 24 && mi < 60) time = String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
  }
  return { date, time };
}
/* ---------- شكل التاريخ في الرسالة (مستقل عن اسم البنك) ----------
   أول تاريخ رقمي في الرسالة + شكله: نوع الأجزاء (n = رقم أو رقمين، Y = أربعة أرقام) والفاصل،
   وموضع الوقت (قبل التاريخ T> أو بعده >T)، والكلمة اللي قبله. مثال: «في 19:03 26-09-28» = في|T>|n-n-n
   الترتيب (سنة-شهر-يوم وغيره) ما ينحفظ هنا؛ يختاره المستخدم مرة لكل شكل. */
const ORDER_L = { YMD: 'سنة-شهر-يوم', DMY: 'يوم-شهر-سنة', MDY: 'شهر-يوم-سنة' };
function ordersFor(pat) {
  const k = pat.replace(/[-/.]/g, '');
  return k === 'Ynn' ? ['YMD'] : k === 'nnY' ? ['DMY', 'MDY'] : ['DMY', 'MDY', 'YMD'];
}
function readParts(a, b, c, order) {
  let y, mo, d;
  if (order === 'YMD') { y = a; mo = b; d = c; } else if (order === 'DMY') { d = a; mo = b; y = c; } else if (order === 'MDY') { mo = a; d = b; y = c; } else return null;
  y = String(y).length <= 2 ? 2000 + Number(y) : Number(y);
  return ymd(y, Number(mo), Number(d));
}
function findDateToken(text) {
  const t = norm(text), g = /(^|[^\d])(\d{1,4})([-/.])(\d{1,2})\3(\d{1,4})(?!\d)/g; let m;
  while ((m = g.exec(t))) {
    const a = m[2], sep = m[3], b = m[4], c = m[5];
    const idx = m.index + m[1].length, end = idx + a.length + b.length + c.length + 2;
    let pat;
    if (a.length === 4 && c.length <= 2) pat = 'Y' + sep + 'n' + sep + 'n';
    else if (a.length <= 2 && c.length === 4) pat = 'n' + sep + 'n' + sep + 'Y';
    else if (a.length <= 2 && c.length <= 2) pat = 'n' + sep + 'n' + sep + 'n';
    else { g.lastIndex = m.index + m[0].length - c.length; continue; }
    const candidates = ordersFor(pat).map(o => ({ order: o, date: readParts(a, b, c, o) })).filter(x => x.date);
    if (!candidates.length) continue;
    const ls = t.lastIndexOf('\n', idx - 1) + 1, le0 = t.indexOf('\n', end), le = le0 < 0 ? t.length : le0;
    const before = t.slice(ls, idx), after = t.slice(end, le);
    let timePos = '', pre = before;
    const tb = before.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm|ص|م)?)[\s,،]*$/);
    if (tb) { timePos = 'T>'; pre = before.slice(0, tb.index); }
    else if (/^[\s,،\-]*(?:في|at|الساعة|الساعه)?\s*\d{1,2}:\d{2}/.test(after)) timePos = '>T';
    const w = pre.match(/([\p{L}]+)[\s:：\-–]*$/u);
    const prefix = w ? w[1].toLowerCase() : (pre.trim() ? '?' : '^');
    const sig = [prefix, timePos, pat].join('|');
    // مثال قصير حول التاريخ للعرض (الوقت والكلمة اللي قبله)
    let s0 = Math.max(ls, idx - 26); if (s0 > ls) { const sp = t.indexOf(' ', s0); s0 = sp >= 0 && sp < idx ? sp + 1 : idx; }
    let e0 = Math.min(le, end + 14); if (e0 < le) { const sp = t.lastIndexOf(' ', e0); e0 = sp > end ? sp : end; }
    const sample = (s0 > ls ? '… ' : '') + t.slice(s0, e0).trim() + (e0 < le ? ' …' : '');
    return { raw: t.slice(idx, end), a, b, c, sep, pat, sig, prefix, timePos, candidates, sample };
  }
  return null;
}
function readDateOrder(tok, order) { return tok ? readParts(tok.a, tok.b, tok.c, order) : null; }
function ymd(y, mo, d) {
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCMonth() !== mo - 1) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const STOP = '(?=\\n|$|\\s+(?:في|بتاريخ|تاريخ|on|at|بمبلغ|مبلغ|المبلغ|بطاقة|البطاقة|الرصيد|رصيد|الوقت|التاريخ|من\\s*حساب|عبر|via|SAR|ر\\.س)\\b|\\s*[؛;|]|\\s+\\d{1,2}[:/.-]\\d)';
function labeled(t, labels) {
  const re = new RegExp('(?:^|\\s|\\n)(?:' + labels + ')\\s*[:：]?\\s*(.+?)' + STOP, 'i');
  const m = t.match(re); if (!m) return null;
  const v = m[1].replace(/^[\s:：\-–]+|[\s:：\-–.,،]+$/g, '').trim();
  return v && v.length <= 80 && !/^[\d.,\s]+$/.test(v) ? v : null;
}
function parseGeneric(text) {
  const t = norm(text), out = { parser: 'generic', missing: [] };
  const amt = extractAmount(t);
  if (amt) { out.grossAmount = amt.value; out.currency = amt.currency; }
  // مبلغ بعملة أجنبية مع مقابله بالريال
  const amts = allAmounts(t).filter(a => a.value > 0 && !NOT_MAIN_AMOUNT.test(a.before));
  const sar = amts.find(a => a.currency === 'SAR'), fx = amts.find(a => a.currency !== 'SAR');
  if (fx && sar) { out.grossAmount = sar.value; out.currency = 'SAR'; out.foreignAmount = fx.value; out.foreignCurrency = fx.currency; }
  else if (fx && !sar) { out.foreignAmount = fx.value; out.foreignCurrency = fx.currency; }
  const fam = FAMILY_RULES.find(r => r[2].test(t));
  if (fam) { out.family = fam[0]; out.direction = fam[1]; }
  const l4 = findLast4s(t);
  if (l4.card) out.instrumentLast4 = l4.card;
  if (l4.account) out.accountLast4 = l4.account;
  if (!l4.card && !l4.account && l4.others.length) { if (out.family === 'sms_purchase') out.instrumentLast4 = l4.others[0].d; else out.accountLast4 = l4.others[0].d; }
  const dt = findDate(t); out.transactionDate = dt.date; out.time = dt.time;
  const bm = t.match(new RegExp('(?:الرصيد\\s*المتاح|الرصيد\\s*المتبقي|الرصيد|رصيد|Avail(?:able)?\\s*Bal(?:ance)?|Balance|Bal)\\s*[:：]?\\s*(?:' + CUR + ')?\\s*' + NUM, 'i'));
  if (bm) out.balanceAfter = Number(bm[1].replace(/,/g, ''));
  const rm = t.match(/(?:رقم\s*(ال)?مرجع|(ال)?مرجع|رقم\s*(ال)?عملية|Ref(?:erence)?\.?(?:\s*No\.?)?)\s*[:：]?\s*([A-Z0-9][A-Z0-9-]{5,})/i);
  if (rm) out.reference = rm[4];
  const fm = t.match(/(?:رسوم|Fees?)\s*[:：]?\s*(?:SAR|ر\.?\s?س)?\s*(\d+(?:\.\d{1,2})?)/i); if (fm) out.feeAmount = Number(fm[1]);
  const vm = t.match(/(?:ضريبة(?:\s*القيمة\s*المضافة)?|VAT)\s*[:：]?\s*(?:SAR|ر\.?\s?س)?\s*(\d+(?:\.\d{1,2})?)/i); if (vm) out.vatAmount = Number(vm[1]);
  const im = t.match(/\bSA\d{22}\b/i); if (im) out.iban = im[0].toUpperCase();
  const im2 = t.match(/SA\s*[*•x]+\s*(\d{4})/i); if (im2) out.beneficiaryLast4 = im2[1];
  // التاجر أو الطرف الآخر حسب نوع العملية
  if (out.family === 'sms_transfer_out') out.beneficiaryRaw = labeled(t, 'إلى|الى|لـ|المستفيد|اسم\\s*المستفيد|to|Beneficiary');
  else if (out.family === 'sms_transfer_in' || out.family === 'salary') out.counterpartyName = labeled(t, 'من|المرسل|اسم\\s*المرسل|from|Sender|By');
  else out.merchantRaw = labeled(t, 'لدى|عند|التاجر|المتجر|Merchant|at') || (out.family === 'sms_purchase' || out.family === 'sms_refund' ? labeled(t, 'من|في') : null);
  if (out.family === 'sms_transfer_out' && !out.beneficiaryLast4) { const bl = t.match(/(?:إلى|الى|to)[^\n]{0,40}?[*•x]+\s?(\d{4})/i); if (bl) out.beneficiaryLast4 = bl[1]; }
  if (!out.grossAmount) out.missing.push('amount');
  if (!out.direction) out.missing.push('direction');
  out.ok = out.missing.length === 0;
  return out;
}

/* ---------- تعلّم صيغة من مثال ----------
   لكل حقل نحفظ السياق قبله وبعده (داخل نفس السطر) بدل Regex جامد، ومعه رقم السطر كبديل.
   الأرقام داخل السياق تُعامل كشكل (أي رقم يطابق أي رقم) لأنها تتغير من رسالة لرسالة. */
const FIELD_TYPE = { amount: 'number', balance: 'number', fee: 'number', cardLast4: 'last4', accountLast4: 'last4', merchant: 'text', beneficiary: 'text', counterparty: 'text', date: 'date', time: 'time', method: 'text' };
/* التاريخ والوقت ووسيلة الدفع (اختيارية في التعليم، مثل «مصروفي").
   التاريخ الملتبس (مثل 05/09/26) يختار المستخدم ترتيبه مرة وحدة وينحفظ مع الصيغة. */
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DATE_TOKEN = /(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})|(\d{1,2})[\s\-/]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-/,]*(\d{2,4})/i;
const TIME_TOKEN = /(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm|صباحا|صباحًا|مساء|مساءً|ص|م)?(?![\p{L}\d])/iu;
function dateCands(v) {
  const res = [], s = norm(v);
  const add = (o, y, mo, d) => { y = +y; if (y < 100) y += 2000; const r = y >= 2000 && y <= 2100 ? ymd(y, +mo, +d) : null; if (r) res.push({ o, date: r }); };
  const m = s.match(DATE_TOKEN); if (!m) return res;
  if (m[1]) {
    const a = m[1], b = m[2], c = m[3];
    if (a.length === 4) add('YMD', a, b, c);
    else if (c.length === 4) { add('DMY', c, b, a); add('MDY', c, a, b); }
    else { add('DMY', c, b, a); add('MDY', c, a, b); add('YMD', a, b, c); }
  } else add('TXT', m[6], MON[m[5].toLowerCase().slice(0, 3)], m[4]);
  return res;
}
// التواريخ المختلفة فعلًا (إذا أكثر من وحدة، المستخدم يختار)
function dateChoices(v) { const seen = new Map(); dateCands(v).forEach(c => { if (!seen.has(c.date)) seen.set(c.date, c); }); return Array.from(seen.values()); }
function parseDateOrder(v, order) { const cs = dateCands(v); if (!cs.length) return null; const f = cs.find(c => c.o === order); return (f || cs[0]).date; }
function parseTime(v) {
  const m = norm(v).match(TIME_TOKEN); if (!m) return null;
  let h = +m[1]; const mi = +m[2], ap = m[3];
  if (ap) { const pm = /^(pm|م|مساء)/i.test(ap); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
  return h < 24 && mi < 60 ? String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') : null;
}
// وسيلة الدفع من النص اللي حدده المستخدم
function methodOf(v) {
  const t = String(v || '');
  if (/apple\s?pay|أبل\s?باي|ابل\s?باي/i.test(t)) return 'Apple Pay';
  if (/(إنترنت|انترنت|online|أونلاين|اونلاين|e-?commerce)/i.test(t)) return 'Online';
  if (/(سداد|فاتور|sadad|bill)/i.test(t)) return 'Bill Payment';
  if (/(حوال|تحويل|transfer)/i.test(t)) return 'Bank Transfer';
  if (/(نقد|كاش|cash|صراف|atm)/i.test(t)) return 'Cash';
  if (/(نقاط\s*(ال)?بيع|pos|مدى|mada|شراء|بطاق|card|visa|فيزا|ماستر)/i.test(t)) return 'POS';
  return 'Other';
}
const shape = (x) => String(x).replace(/\d/g, '0');
const lineOf = (t, pos) => t.slice(0, pos).split('\n').length - 1;
function wordsOf(t) { return Array.from(new Set((norm(t).match(/[\p{L}]{3,}/gu) || []).map(w => w.toLowerCase()))); }
function locateValue(t, key, val, taken) {
  const free = (a, b) => !taken.some(([x, y]) => a < y && b > x);
  const v = String(val == null ? '' : val).trim(); if (!v) return null;
  if (FIELD_TYPE[key] === 'number') {
    const target = Number(v.replace(/,/g, '')); const g = /\d[\d,]*(?:\.\d+)?/g; let m;
    while ((m = g.exec(t))) if (Number(m[0].replace(/,/g, '')) === target && free(m.index, m.index + m[0].length)) return [m.index, m.index + m[0].length];
    return null;
  }
  if (FIELD_TYPE[key] === 'last4') {
    const g = new RegExp('(?<!\\d)' + v.replace(/\D/g, '') + '(?!\\d)', 'g'); let m;
    while ((m = g.exec(t))) if (free(m.index, m.index + 4)) return [m.index, m.index + 4];
    return null;
  }
  const i = t.toLowerCase().indexOf(v.toLowerCase());
  return i >= 0 && free(i, i + v.length) ? [i, i + v.length] : null;
}
// fields: لكل حقل إما {start,end} (من تحديد المستخدم في النص) أو القيمة كنص
function learnTemplate(text, fields, meta) {
  meta = meta || {};
  const t = norm(text), lines = t.split('\n'), spans = [], notFound = [];
  Object.keys(FIELD_TYPE).forEach(k => {
    const f = fields[k]; if (f == null || f === '') return;
    let pos = null;
    if (typeof f === 'object' && f.start != null) pos = [f.start, f.end];
    else pos = locateValue(t, k, f, spans.map(x => [x.a, x.b]));
    if (pos) spans.push({ k, a: pos[0], b: pos[1] }); else notFound.push(k);
  });
  if (notFound.length) return { error: 'not_found', fields: notFound };
  if (!spans.some(x => x.k === 'amount')) return { error: 'no_amount' };
  const valueSet = spans.map(x => t.slice(x.a, x.b).toLowerCase());
  const fieldsOut = {}, sorted = spans.slice().sort((p, q) => p.a - q.a);
  sorted.forEach((x, idx) => {
    const li = lineOf(t, x.a), lineStart = t.lastIndexOf('\n', x.a - 1) + 1, lineEnd = (t.indexOf('\n', x.b) + 1 || t.length + 1) - 1;
    // السياق = النص الثابت بين هذا الحقل والحقل اللي قبله/بعده (بدون قيم الحقول الثانية)
    const prev = sorted[idx - 1], next = sorted[idx + 1];
    const from = prev && prev.b > lineStart ? prev.b : lineStart, to = next && next.a < lineEnd ? next.a : lineEnd;
    const before = t.slice(from, x.a), after = t.slice(x.b, to);
    const alone = !(prev && lineOf(t, prev.a) === li) && !(next && lineOf(t, next.a) === li);
    fieldsOut[x.k] = { type: FIELD_TYPE[x.k], line: li, order: idx, before: before.slice(-16), after: after.slice(0, 10), alone, linePrefix: alone ? t.slice(lineStart, x.a) : '', lineSuffix: alone ? t.slice(x.b, lineEnd) : '' };
  });
  // التاريخ: لازم يكون تاريخ مقروء، وإذا ملتبس لازم يكون ترتيبه محدد
  const dSpan = spans.find(x => x.k === 'date');
  if (dSpan) {
    const ch = dateChoices(t.slice(dSpan.a, dSpan.b));
    if (!ch.length) return { error: 'bad_date' };
    const order = meta.dateOrder || (ch.length === 1 ? ch[0].o : null);
    if (!order) return { error: 'date_order', choices: ch };
    fieldsOut.date.dateOrder = order;
  }
  const tSpan = spans.find(x => x.k === 'time');
  if (tSpan && !parseTime(t.slice(tSpan.a, tSpan.b))) return { error: 'bad_time' };
  const signature = wordsOf(t).filter(w => !valueSet.some(v => v.includes(w))).slice(0, 30);
  if (signature.length < 2) return { error: 'too_generic' };
  const tpl = { kind: 'sms', version: 2, fields: fieldsOut, lineCount: lines.length, signature, family: meta.family, direction: meta.direction, bank: meta.bank || null, sender: meta.sender || null };
  const test = applyTemplate(tpl, t);
  if (!test || !test.ok || Math.abs(test.grossAmount - Number(t.slice(spans.find(x => x.k === 'amount').a, spans.find(x => x.k === 'amount').b).replace(/,/g, ''))) > 0.001) return { error: 'self_test_failed' };
  return { template: tpl, preview: test };
}
function valid(type, v, f) {
  v = String(v || '').trim();
  if (type === 'date') return parseDateOrder(v, f && f.dateOrder);
  if (type === 'time') return parseTime(v);
  if (type === 'number') { const n = Number(v.replace(/,/g, '')); return /^\d[\d,]*(\.\d+)?$/.test(v) && n >= 0 ? n : null; }
  if (type === 'last4') { const d = v.replace(/[^\d]/g, ''); return d.length === 4 ? d : null; }
  return v && v.length <= 80 ? v.replace(/^[\s:：\-–]+|[\s:：\-–.,،]+$/g, '') || null : null;
}
// شكل القيمة لكل نوع (بعد السياق اللي قبلها)
const VALUE_AT = {
  number: /^\s*[\d,]+(?:\.\d+)?/, last4: /^\s*[*•x#]*\s*\d{4}/,
  date: new RegExp('^\\s*(?:' + DATE_TOKEN.source + ')(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s*(?:am|pm|ص|م|صباحا|مساء))?)?', 'i'),
  time: /^\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:am|pm|AM|PM|صباحا|مساء|ص|م)(?![\p{L}]))?/u,
};
// يبحث عن الحقل بعد موضع start (الحقول تنقرأ بالترتيب اللي كانت عليه في المثال)
function extractField(t, lines, f, start) {
  const st = shape(t);
  const cut = (a, eol) => {
    let b = eol;
    if (f.after) { const j = st.indexOf(shape(f.after), a); if (j >= 0 && j <= eol) b = j; }
    if (f.type !== 'text') { const m = t.slice(a, b).match(VALUE_AT[f.type]); b = m ? a + m[0].length : a; }
    return b;
  };
  // 1) السياق قبل وبعد
  if (f.before && f.before.trim()) {
    let from = start || 0;
    while (true) {
      const i = st.indexOf(shape(f.before), from); if (i < 0) break;
      const a = i + f.before.length, eol = t.indexOf('\n', a) < 0 ? t.length : t.indexOf('\n', a), b = cut(a, eol);
      const v = valid(f.type, t.slice(a, b), f); if (v != null) return { value: v, raw: t.slice(a, b), via: 'context', end: b };
      from = i + 1;
    }
  } else if (f.after && f.after.trim()) {
    // الحقل في بداية السطر: نقرأ من بداية السطر لين السياق اللي بعده
    const lnStart = t.split('\n').slice(0, f.line).join('\n').length + (f.line ? 1 : 0);
    const a = Math.max(start || 0, lnStart), eol = t.indexOf('\n', a) < 0 ? t.length : t.indexOf('\n', a), b = cut(a, eol);
    const v = valid(f.type, t.slice(a, b), f); if (v != null) return { value: v, raw: t.slice(a, b), via: 'context', end: b };
  }
  // 2) رقم السطر (إذا الحقل كان لحاله في سطره): نشيل نفس البادئة واللاحقة
  const ln = lines[f.line];
  if (ln != null && f.alone) {
    let seg = ln;
    const pre = shape(f.linePrefix || ''), suf = shape(f.lineSuffix || '');
    if (pre && shape(seg).startsWith(pre)) seg = seg.slice(pre.length);
    else if (pre && pre.trim()) { const lab = pre.replace(/[\s:：]+$/, ''); const k = shape(seg).indexOf(lab); if (k >= 0) seg = seg.slice(k + lab.length).replace(/^[\s:：]+/, ''); }
    if (suf && shape(seg).endsWith(suf)) seg = seg.slice(0, seg.length - suf.length);
    if (f.type === 'number') { const m = seg.match(/[\d,]+(?:\.\d+)?/); seg = m ? m[0] : ''; }
    if (f.type === 'last4') { const m = seg.match(/\d{4}/); seg = m ? m[0] : ''; }
    if (f.type === 'date' || f.type === 'time') { const m = seg.match(f.type === 'date' ? DATE_TOKEN : TIME_TOKEN); seg = m ? seg.slice(m.index) : ''; }
    const v = valid(f.type, seg, f); if (v != null) return { value: v, raw: seg, via: 'line', end: null };
  }
  return null;
}
// مدى تطابق الرسالة مع الصيغة (نسبة كلمات الصيغة الموجودة في الرسالة)
function templateScore(tpl, text) {
  const w = new Set(wordsOf(text)); if (!tpl.signature || !tpl.signature.length) return 0;
  return tpl.signature.filter(x => w.has(x)).length / tpl.signature.length;
}
function applyTemplate(tpl, text) {
  const t = norm(text), lines = t.split('\n');
  const out = { parser: 'template', family: tpl.family, direction: tpl.direction, currency: 'SAR', missing: [], via: {} };
  let pos = 0;
  Object.entries(tpl.fields || {}).sort((x, y) => (x[1].order || 0) - (y[1].order || 0)).forEach(([k, f]) => {
    const r = extractField(t, lines, f, pos) || (pos ? extractField(t, lines, f, 0) : null);
    if (!r) { out.missing.push(k); return; }
    if (r.end != null) pos = r.end;
    out.via[k] = r.via;
    if (k === 'amount') out.grossAmount = r.value; else if (k === 'balance') out.balanceAfter = r.value; else if (k === 'fee') out.feeAmount = r.value;
    else if (k === 'cardLast4') out.instrumentLast4 = r.value; else if (k === 'accountLast4') out.accountLast4 = r.value;
    else if (k === 'merchant') out.merchantRaw = r.value; else if (k === 'beneficiary') out.beneficiaryRaw = r.value; else if (k === 'counterparty') out.counterpartyName = r.value;
    else if (k === 'date') { out.transactionDate = r.value; const tm = parseTime(r.raw || ''); if (tm && !out.time) out.time = tm; }
    else if (k === 'time') out.time = r.value;
    else if (k === 'method') { out.methodRaw = r.value; out.paymentMethod = methodOf(r.value); }
  });
  // اللي ما تحدد في الصيغة يكمله القارئ العام
  const dt = findDate(t); if (!out.transactionDate) out.transactionDate = dt.date; if (!out.time) out.time = dt.time;
  out.ok = out.grossAmount > 0 && !!out.direction;
  return out;
}

root.SmsReader = { norm, splitMessages, splitDetails, segWarn, dateChoices, parseTime, methodOf, findDateToken, readDateOrder, ordersFor, ORDER_L, classify, extractAmount, parseGeneric, learnTemplate, applyTemplate, templateScore, findDate, wordsOf, OTP_STRONG, FAMILY_RULES };
if (typeof module !== 'undefined' && module.exports) module.exports = root.SmsReader;
})(typeof globalThis !== 'undefined' ? globalThis : this);
