const crypto = require('crypto');
function generateOrderNo() { const d = new Date().toISOString().slice(0, 10).replace(/-/g, ''); return `ORD-${d}-${Math.floor(1000 + Math.random() * 9000)}`; }
function generateFileName(originalName = 'audio') { const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : ''; return `${crypto.randomUUID()}${ext}`; }
module.exports = { generateOrderNo, generateFileName };
