const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'bhatta_erp/voice_remarks',
    resource_type: 'video', // Cloudinary treats audio as video resource type
    allowed_formats: ['mp3', 'wav', 'm4a', 'aac', 'webm', 'ogg', 'mp4'],
  },
});

function fileFilter(req, file, cb) {
  const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/mp4', 'audio/webm', 'audio/ogg', 'video/mp4'];
  // Cloudinary handles format validation as well, but keeping this for early rejection
  if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|aac|webm|ogg)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'));
  }
}

const uploadVoiceNote = multer({ 
  storage, 
  fileFilter, 
  limits: { fileSize: Number(process.env.MAX_AUDIO_FILE_SIZE_MB || 20) * 1024 * 1024 } 
});

module.exports = { uploadVoiceNote };
