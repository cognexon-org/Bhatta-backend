const DEVANAGARI_DIGITS = Object.freeze({ '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9' });

const WORDS = Object.freeze({
  'शून्य':0,'जीरो':0,'zero':0,
  'एक':1,'one':1,'दो':2,'two':2,'तीन':3,'three':3,'चार':4,'four':4,'पांच':5,'पाँच':5,'five':5,'छह':6,'छः':6,'six':6,'सात':7,'seven':7,'आठ':8,'eight':8,'नौ':9,'nine':9,
  'दस':10,'ten':10,'ग्यारह':11,'बारह':12,'तेरह':13,'चौदह':14,'पंद्रह':15,'पन्द्रह':15,'सोलह':16,'सत्रह':17,'अठारह':18,'उन्नीस':19,
  'बीस':20,'इक्कीस':21,'बाईस':22,'तेईस':23,'चौबीस':24,'पच्चीस':25,'छब्बीस':26,'सत्ताईस':27,'अट्ठाईस':28,'उनतीस':29,
  'तीस':30,'इकतीस':31,'बत्तीस':32,'तैंतीस':33,'चौंतीस':34,'पैंतीस':35,'छत्तीस':36,'सैंतीस':37,'अड़तीस':38,'अड़तीस':38,'उनतालीस':39,
  'चालीस':40,'इकतालीस':41,'बयालीस':42,'तैंतालीस':43,'चवालीस':44,'पैंतालीस':45,'छियालीस':46,'सैंतालीस':47,'अड़तालीस':48,'अड़तालीस':48,'उनचास':49,
  'पचास':50,'इक्यावन':51,'बावन':52,'तिरेपन':53,'चौवन':54,'पचपन':55,'छप्पन':56,'सत्तावन':57,'अट्ठावन':58,'उनसठ':59,
  'साठ':60,'इकसठ':61,'बासठ':62,'तिरसठ':63,'चौंसठ':64,'पैंसठ':65,'छियासठ':66,'सड़सठ':67,'सड़सठ':67,'अड़सठ':68,'अड़सठ':68,'उनहत्तर':69,
  'सत्तर':70,'इकहत्तर':71,'बहत्तर':72,'तिहत्तर':73,'चौहत्तर':74,'पचहत्तर':75,'छिहत्तर':76,'सतहत्तर':77,'अठहत्तर':78,'उन्नासी':79,
  'अस्सी':80,'इक्यासी':81,'बयासी':82,'तिरासी':83,'चौरासी':84,'पचासी':85,'छियासी':86,'सत्तासी':87,'अट्ठासी':88,'नवासी':89,
  'नब्बे':90,'इक्यानवे':91,'बानवे':92,'तिरानवे':93,'चौरानवे':94,'पंचानवे':95,'छियानवे':96,'सत्तानवे':97,'अट्ठानवे':98,'निन्यानवे':99,
  'hundred':100,'सौ':100,'हजार':1000,'हज़ार':1000,'thousand':1000,'लाख':100000,'lac':100000,'lakh':100000,'करोड़':10000000,'करोड़':10000000,'crore':10000000
});

function normalizeDigits(text='') {
  return String(text).replace(/[०-९]/g, (d) => DEVANAGARI_DIGITS[d]);
}

function cleanToken(token) {
  return normalizeDigits(token).toLowerCase().replace(/[^\p{L}\p{M}\p{N}.]/gu, '');
}

function parseTokenNumber(token) {
  const clean = cleanToken(token);
  if (!clean) return null;
  if (/^\d+(?:\.\d+)?$/.test(clean)) return Number(clean);
  if (/^\d+(?:\.\d+)?k$/.test(clean)) return Number(clean.slice(0,-1))*1000;
  if (/^\d+(?:\.\d+)?l$/.test(clean)) return Number(clean.slice(0,-1))*100000;
  if (Object.prototype.hasOwnProperty.call(WORDS, clean)) return WORDS[clean];
  return null;
}

function parseNumberWords(tokens) {
  let total = 0;
  let current = 0;
  let consumed = 0;
  let saw = false;
  for (const raw of tokens) {
    const token = cleanToken(raw);
    if (!token) break;
    const numeric = parseTokenNumber(token);
    if (numeric === null) break;
    saw = true;
    consumed += 1;
    if (numeric === 100) {
      current = (current || 1) * 100;
    } else if (numeric >= 1000) {
      const base = current || 1;
      total += base * numeric;
      current = 0;
    } else {
      current += numeric;
    }
  }
  return saw ? { value: total + current, consumed } : null;
}

const FRACTIONAL = [
  { re: /(?:डेढ़|डेढ|डेढ़)\s*(लाख|हजार|हज़ार)?/iu, base: 1.5 },
  { re: /(?:ढाई)\s*(लाख|हजार|हज़ार)?/iu, base: 2.5 },
  { re: /(?:सवा)\s*(लाख|हजार|हज़ार)?/iu, base: 1.25 },
  { re: /(?:पौने)\s*(दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|\d+)\s*(लाख|हजार|हज़ार)?/iu, quarterLess: true },
  { re: /(?:साढ़े|साढ़े)\s*(दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|\d+)\s*(लाख|हजार|हज़ार)?/iu, halfMore: true }
];

function multiplier(unit) {
  if (!unit) return 1;
  return /लाख/u.test(unit) ? 100000 : 1000;
}

function parseFractional(text) {
  for (const rule of FRACTIONAL) {
    const match = normalizeDigits(text).match(rule.re);
    if (!match) continue;
    if (rule.base) return { value: rule.base * multiplier(match[1]), text: match[0], index: match.index || 0 };
    const n = parseTokenNumber(match[1]);
    if (n === null) continue;
    const value = (rule.quarterLess ? n - 0.25 : n + 0.5) * multiplier(match[2]);
    return { value, text: match[0], index: match.index || 0 };
  }
  return null;
}

function extractNumberCandidates(text='') {
  const normalized = normalizeDigits(text);
  const candidates = [];
  const fractional = parseFractional(normalized);
  if (fractional) candidates.push(fractional);

  const tokens = normalized.split(/\s+/);
  let charIndex = 0;
  for (let i=0;i<tokens.length;i+=1) {
    const result = parseNumberWords(tokens.slice(i, i+8));
    if (result && result.value >= 0) {
      const phrase = tokens.slice(i, i+result.consumed).join(' ');
      candidates.push({ value: result.value, text: phrase, index: normalized.indexOf(phrase, charIndex) });
      i += Math.max(0, result.consumed - 1);
    }
    charIndex += tokens[i]?.length || 0;
  }

  // digit followed by thousand/lakh unit: "20 हजार", "1.5 lakh"
  const unitRe = /(\d+(?:\.\d+)?)\s*(हजार|हज़ार|लाख|lakh|thousand|crore|करोड़|करोड़)/giu;
  let m;
  while ((m = unitRe.exec(normalized))) {
    const unit = m[2].toLowerCase();
    const mul = /लाख|lakh/.test(unit) ? 100000 : (/crore|करोड़|करोड़/.test(unit) ? 10000000 : 1000);
    candidates.push({ value: Number(m[1]) * mul, text: m[0], index: m.index });
  }

  const unique = new Map();
  for (const item of candidates) {
    if (!Number.isFinite(item.value)) continue;
    unique.set(`${item.index}:${item.text}`, item);
  }
  return [...unique.values()].sort((a,b) => a.index - b.index || b.text.length - a.text.length);
}

function extractLikelyAmount(text) {
  const candidates = extractNumberCandidates(text);
  const moneyWords = /(रुपये|रुपया|₹|rs\.?|rupees?|amount|पेमेंट|भुगतान|पेशगी|एडवांस|खर्च)/iu;
  const normalized = normalizeDigits(text);
  const scored = candidates.map((c) => {
    const around = normalized.slice(Math.max(0,c.index-24), c.index+c.text.length+24);
    return { ...c, score: (moneyWords.test(around) ? 10 : 0) + (c.value < 10000000 ? 1 : 0) };
  });
  return scored.sort((a,b)=>b.score-a.score || b.text.length-a.text.length || b.value-a.value)[0]?.value ?? null;
}

function extractLikelyQuantity(text) {
  const candidates = extractNumberCandidates(text);
  const qtyWords = /(ईंट|ईंटें|brick|bricks|quantity|मात्रा|पथाई|भराई|निकासी|छंटाई|छँटाई)/iu;
  const normalized = normalizeDigits(text);
  const scored = candidates.map((c) => {
    const around = normalized.slice(Math.max(0,c.index-20), c.index+c.text.length+22);
    return { ...c, score: (qtyWords.test(around) ? 10 : 0) + (c.value >= 100 ? 2 : 0) };
  });
  return scored.sort((a,b)=>b.score-a.score || b.text.length-a.text.length || b.value-a.value)[0]?.value ?? null;
}

module.exports = {
  normalizeDigits,
  parseTokenNumber,
  extractNumberCandidates,
  extractLikelyAmount,
  extractLikelyQuantity
};
