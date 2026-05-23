const multer = require('multer');
const path = require('path');
const { ensureUploadDir } = require('../config/storage');
const { generateFileName } = require('../utils/generateCode');
const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, ensureUploadDir()), filename: (req, file, cb) => cb(null, generateFileName(file.originalname)) });
function fileFilter(req, file, cb) {
  const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/mp4', 'audio/webm', 'audio/ogg', 'video/mp4'];
  if (allowed.includes(file.mimetype) || path.extname(file.originalname).match(/\.(mp3|wav|m4a|aac|webm|ogg)$/i)) cb(null, true);
  else cb(new Error('Only audio files are allowed'));
}
const uploadVoiceNote = multer({ storage, fileFilter, limits: { fileSize: Number(process.env.MAX_AUDIO_FILE_SIZE_MB || 20) * 1024 * 1024 } });
module.exports = { uploadVoiceNote };
