const path = require('path');
const fs = require('fs');
function ensureUploadDir() {
  const absolute = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  if (!fs.existsSync(absolute)) fs.mkdirSync(absolute, { recursive: true });
  return absolute;
}
function buildPublicFileUrl(filename) { return `${process.env.BASE_URL || ''}/uploads/${filename}`; }
module.exports = { ensureUploadDir, buildPublicFileUrl };
