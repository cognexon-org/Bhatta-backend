const assert = require('assert');
const { extractLikelyAmount, extractLikelyQuantity, extractNumberCandidates } = require('../src/modules/voiceEntry/parsers/hindiNumber.parser');
const { parseDeterministic } = require('../src/modules/voiceEntry/parsers/domain.parser');

function values(text) { return extractNumberCandidates(text).map((x) => x.value); }

assert(values('अठारह हजार').includes(18000));
assert(values('डेढ़ लाख').includes(150000));
assert(values('ढाई लाख').includes(250000));
assert(values('साढ़े तीन हजार').includes(3500));
assert(values('पौने दो लाख').includes(175000));
assert.strictEqual(extractLikelyAmount('रमेश को डेढ़ लाख पेशगी दी'), 150000);
assert.strictEqual(extractLikelyQuantity('अठारह हजार ईंट पथाई हुई'), 18000);

const pathai = parseDeterministic('PROCESS_ENTRY', 'आज राम ने पथाई में अठारह हजार ईंट बनाई, रेट छह सौ पचास प्रति हजार', 'hi-IN');
assert.strictEqual(pathai.data.processCode, 'PATHAI');
assert.strictEqual(pathai.data.quantityOut, 18000);
assert.strictEqual(pathai.data.rate, 650);

const dispatch = parseDeterministic('DISPATCH', 'शर्मा ट्रेडर्स को UP 32 AB 1234 से तीस हजार नंबर एक ईंट रेट सात सौ प्रति हजार भेजी', 'hi-IN');
assert.strictEqual(dispatch.data.quantity, 30000);
assert.strictEqual(dispatch.data.ratePerThousand, 700);
assert.strictEqual(dispatch.data.brickCategoryCode, 'NO_1');
assert.strictEqual(dispatch.data.vehicleNumber, 'UP32AB1234');

const mixedAttendance = parseDeterministic('ATTENDANCE', 'राम हाजिर और श्याम गैरहाजिर', 'hi-IN');
assert.strictEqual(mixedAttendance.data.mixedStatus, true);
assert(mixedAttendance.unresolvedFields.includes('statusMapping'));

console.log('Voice deterministic parser tests passed.');
