function yyyyMmDd(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function parseSpokenDate(text='', now=new Date()) {
  const value = String(text).toLowerCase();
  const date = new Date(now);
  if (/\b(today|आज)\b/iu.test(value)) return yyyyMmDd(date);
  if (/\b(yesterday|कल)\b/iu.test(value)) { date.setDate(date.getDate()-1); return yyyyMmDd(date); }
  if (/\b(day before yesterday|परसों|परसो)\b/iu.test(value)) { date.setDate(date.getDate()-2); return yyyyMmDd(date); }
  const iso = value.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2,'0')}-${String(iso[3]).padStart(2,'0')}`;
  const dmy = value.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`;
  return yyyyMmDd(now);
}
module.exports = { parseSpokenDate, yyyyMmDd };
