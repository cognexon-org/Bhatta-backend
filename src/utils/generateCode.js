const crypto = require('crypto');
function ymd() { return new Date().toISOString().slice(0, 10).replace(/-/g, ''); }
function rand() { return Math.floor(1000 + Math.random() * 9000); }
function generateOrderNo() { return `ORD-${ymd()}-${rand()}`; }
function generateDispatchNo() { return `DSP-${ymd()}-${rand()}`; }
function generateChallanNo() { return `CHL-${ymd()}-${rand()}`; }
function generatePurchaseNo() { return `PUR-${ymd()}-${rand()}`; }
function generateFileName(originalName = 'audio') { const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : ''; return `${crypto.randomUUID()}${ext}`; }
module.exports = { generateOrderNo, generateDispatchNo, generateChallanNo, generatePurchaseNo, generateFileName };
