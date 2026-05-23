function startOfDay(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
function endOfDay(date) { const d = new Date(date); d.setHours(23, 59, 59, 999); return d; }
function monthRange(monthString) { const [year, month] = monthString.split('-').map(Number); return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59, 999) }; }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + Number(days)); return d; }
module.exports = { startOfDay, endOfDay, monthRange, addDays };
