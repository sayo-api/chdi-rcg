const express = require('express');
const router  = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadPdf } = require('../config/cloudinary');
const ctrl = require('../controllers/pdfController');

// ─── Rotas públicas (app mobile) ──────────────────────────────────────────────
router.get('/',                        ctrl.getAll);
router.get('/category/:categoryId',    ctrl.getByCategory);
router.get('/:id',                     ctrl.getOne);

// ─── Rotas admin ──────────────────────────────────────────────────────────────
router.use(authMiddleware, adminMiddleware);

router.get('/admin/all',               ctrl.getAllAdmin);
router.post('/',   uploadPdf.single('pdf'),  ctrl.create);
router.put('/:id', uploadPdf.single('pdf'),  ctrl.update);
router.delete('/:id',                  ctrl.remove);

module.exports = router;
