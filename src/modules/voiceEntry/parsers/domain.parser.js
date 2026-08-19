const { extractLikelyAmount, extractLikelyQuantity, extractNumberCandidates, normalizeDigits } = require('./hindiNumber.parser');
const { parseSpokenDate } = require('./date.parser');

const PROCESS_ALIASES = [
  ['PATHAI', ['पथाई','pathai','moulding','molding']],
  ['SUKHAI', ['सुखाई','सुखाइ','sukhai','drying']],
  ['BHARAI', ['भराई','bharai','loading chamber']],
  ['PHUKAI', ['फुकाई','फूंकाई','फुँकाई','phukai','firing']],
  ['PAKAI', ['पकाई','pakai','baking']],
  ['NIKASI', ['निकासी','nikasi','unloading']],
  ['CHHANTAI', ['छंटाई','छँटाई','छटाई','chhantai','sorting']]
];

const BRICK_ALIASES = [
  ['NO_1', ['नंबर एक','नम्बर एक','नंबर 1','no 1','number one','first class','एक नंबर']],
  ['NO_2', ['नंबर दो','नम्बर दो','नंबर 2','no 2','number two','दो नंबर']],
  ['NO_3', ['नंबर तीन','नम्बर तीन','नंबर 3','no 3','number three','तीन नंबर']],
  ['JHAMA', ['झामा','jhama']],
  ['BROKEN', ['टूटी','टूटा','broken','खराब ईंट']]
];

function includesAny(text, aliases) {
  const lowered = String(text).toLowerCase();
  return aliases.some((alias) => lowered.includes(alias.toLowerCase()));
}
function canonicalFromAliases(text, groups) {
  return groups.find(([, aliases]) => includesAny(text, aliases))?.[0] || null;
}
function paymentMode(text='') {
  if (/(upi|यूपीआई|phonepe|फोनपे|gpay|google pay|गूगल पे)/iu.test(text)) return 'UPI';
  if (/(bank transfer|बैंक|neft|rtgs|imps)/iu.test(text)) return 'BANK_TRANSFER';
  if (/(cheque|check|चेक)/iu.test(text)) return 'CHEQUE';
  if (/(cash|नकद|कैश)/iu.test(text)) return 'CASH';
  return 'CASH';
}
function extractRatePerThousand(text='') {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/(?:रेट|rate)\s*(?:है|is|का|की)?\s*([\p{L}\p{M}\p{N}.\s]+?)(?:\s*(?:प्रति|per)\s*(?:हजार|हज़ार|thousand)|[,।]|$)/iu);
  if (!match) return null;
  return extractNumberCandidates(match[1])[0]?.value ?? null;
}
function extractVehicleNumber(text='') {
  const normalized = normalizeDigits(text).toUpperCase().replace(/\s+/g,' ');
  const match = normalized.match(/\b([A-Z]{2})\s*[- ]?(\d{1,2})\s*[- ]?([A-Z]{1,3})\s*[- ]?(\d{3,4})\b/);
  return match ? `${match[1]}${match[2]}${match[3]}${match[4]}` : null;
}
function workerStatus(text='') {
  if (/(absent|गैरहाजिर|ग़ैरहाज़िर|अनुपस्थित)/iu.test(text)) return 'ABSENT';
  if (/(half day|आधा दिन)/iu.test(text)) return 'HALF_DAY';
  if (/(late|लेट|देर)/iu.test(text)) return 'LATE';
  return 'PRESENT';
}

function hasMixedAttendanceStatuses(text='') {
  const groups = [
    /(present|हाजिर|हाज़िर|उपस्थित)/iu,
    /(absent|गैरहाजिर|ग़ैरहाज़िर|अनुपस्थित)/iu,
    /(half day|आधा दिन)/iu,
    /(late|लेट|देर)/iu
  ];
  return groups.filter((re) => re.test(text)).length > 1;
}

function parseDeterministic(task, transcript, language='hi-IN') {
  const text = String(transcript || '').trim();
  const date = parseSpokenDate(text);
  const base = { task, language, transcript: text, data: {}, evidence: {}, unresolvedFields: [] };

  if (task === 'PROCESS_ENTRY') {
    base.data = {
      processCode: canonicalFromAliases(text, PROCESS_ALIASES),
      date,
      quantityOut: extractLikelyQuantity(text),
      rate: extractRatePerThousand(text),
      unit: 'PER_1000',
      chamberNo: (normalizeDigits(text).match(/(?:चेंबर|चैम्बर|चैंबर|chamber)\s*(?:नंबर|no\.?|number)?\s*(\d+)/iu) || [])[1] || null,
      brickCategoryCode: canonicalFromAliases(text, BRICK_ALIASES),
      workerNames: [],
      textRemark: text
    };
    for (const field of ['processCode','quantityOut']) if (!base.data[field]) base.unresolvedFields.push(field);
    // Worker/chamber/fuel requirements are read from the tenant Process master in the resolver.
  } else if (task === 'EXPENSE_ENTRY') {
    base.data = { date, amount: extractLikelyAmount(text), paymentMode: paymentMode(text), categorySpoken: null, paidTo: null, description: text };
    if (!base.data.amount) base.unresolvedFields.push('amount');
    base.unresolvedFields.push('categorySpoken');
  } else if (task === 'CUSTOMER_PAYMENT') {
    base.data = { paymentDate: date, amount: extractLikelyAmount(text), paymentMode: paymentMode(text), customerName: null, referenceNo: null, textRemark: text };
    if (!base.data.amount) base.unresolvedFields.push('amount');
    base.unresolvedFields.push('customerName');
  } else if (task === 'WORKER_ADVANCE') {
    base.data = { date, amount: extractLikelyAmount(text), paymentMode: paymentMode(text), workerName: null, remark: text };
    if (!base.data.amount) base.unresolvedFields.push('amount');
    base.unresolvedFields.push('workerName');
  } else if (task === 'ATTENDANCE') {
    const mixedStatus = hasMixedAttendanceStatuses(text);
    base.data = { date, status: workerStatus(text), workerNames: [], mixedStatus };
    base.unresolvedFields.push('workerNames');
    if (mixedStatus) base.unresolvedFields.push('statusMapping');
  } else if (task === 'DISPATCH') {
    base.data = {
      dispatchDate: date,
      quantity: extractLikelyQuantity(text),
      ratePerThousand: extractRatePerThousand(text),
      brickCategoryCode: canonicalFromAliases(text, BRICK_ALIASES),
      vehicleNumber: extractVehicleNumber(text),
      customerName: null,
      driverName: null,
      textRemark: text
    };
    for (const field of ['quantity','brickCategoryCode','customerName']) if (!base.data[field]) base.unresolvedFields.push(field);
  } else {
    base.unresolvedFields.push('unsupportedTask');
  }

  const known = Object.values(base.data).filter((v) => v !== null && v !== '' && (!Array.isArray(v) || v.length)).length;
  const total = Math.max(known + base.unresolvedFields.length, 1);
  base.confidence = Math.max(0.2, Math.min(0.95, known / total));
  return base;
}

module.exports = { parseDeterministic, PROCESS_ALIASES, BRICK_ALIASES, paymentMode };
