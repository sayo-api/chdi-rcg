const cloudinary = require('cloudinary').v2;
const multer      = require('multer');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Áudio — mp3, wav, ogg, m4a (50 MB)
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/mp3','audio/x-m4a'];
    if (ok.includes(file.mimetype) || /\.(mp3|wav|ogg|m4a)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Apenas áudio (mp3, wav, ogg, m4a)'));
  },
});

// Upload genérico (áudio ou vídeo)
const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('video/') ||
      /\.(mp3|wav|ogg|m4a|mp4|mov|avi|mkv|webm)$/i.test(file.originalname)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de áudio ou vídeo'));
    }
  },
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens'));
  },
});

function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

module.exports = { cloudinary, uploadAudio, uploadMedia, uploadImage, uploadBuffer };
