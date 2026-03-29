const express = require('express');
const router  = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer  = require('multer');
const ctrl    = require('../controllers/postController');

// Multer: aceita imagens, vídeos, gifs, webps, zip, js, docx, pdf, etc.
const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      // imagens / mídia
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // vídeo
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      // documentos
      'application/zip', 'application/x-zip-compressed',
      'application/javascript', 'text/javascript',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
    ];
    const allowedExt = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi|zip|js|ts|docx|doc|pdf|xlsx|xls|txt)$/i;
    if (allowed.includes(file.mimetype) || allowedExt.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`));
    }
  },
});

// ─── Rotas públicas (app mobile) ──────────────────────────────────────────────
router.get('/',                          ctrl.getAll);
router.get('/category/:categoryId',      ctrl.getByCategory);
router.get('/:id',                       ctrl.getOne);

// ─── Rotas admin ──────────────────────────────────────────────────────────────
router.use(authMiddleware, adminMiddleware);

router.get('/admin/all',                 ctrl.getAllAdmin);
router.post('/',                         ctrl.create);
router.put('/:id',                       ctrl.update);
router.delete('/:id',                    ctrl.remove);

// Mídia principal (card tipo "media")
router.post('/:id/media',                uploadAny.single('file'), ctrl.uploadMedia);

// Carrossel simples
router.post('/:id/carousel',             uploadAny.single('file'), ctrl.addCarouselItem);
router.delete('/:id/carousel/:index',    ctrl.removeCarouselItem);

// Carrossel V2 (imagem + texto por slide)
router.post('/:id/carousel-v2',          uploadAny.single('file'), ctrl.addCarouselV2Item);
router.put('/:id/carousel-v2/:index',    ctrl.updateCarouselV2Item);
router.delete('/:id/carousel-v2/:index', ctrl.removeCarouselV2Item);

// Anexos (zip, js, docx, pdf, etc.)
router.post('/:id/attachments',          uploadAny.single('file'), ctrl.addAttachment);
router.delete('/:id/attachments/:index', ctrl.removeAttachment);

module.exports = router;
