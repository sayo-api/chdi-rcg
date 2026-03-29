const express = require('express');
const router  = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');
const ctrl = require('../controllers/tutorialController');

// ─── Rotas públicas (app mobile) ──────────────────────────────────────────────
router.get('/',                        ctrl.getAll);
router.get('/category/:categoryId',    ctrl.getByCategory);
router.get('/:id',                     ctrl.getOne);

// ─── Rotas admin ──────────────────────────────────────────────────────────────
router.use(authMiddleware, adminMiddleware);

router.get('/admin/all',               ctrl.getAllAdmin);
router.post('/',                       ctrl.create);
router.put('/:id',                     ctrl.update);
router.delete('/:id',                  ctrl.remove);

// Adicionar / remover imagens individualmente
router.post('/:id/images',             uploadImage.single('image'), ctrl.addImage);
router.delete('/:id/images/:imageIndex', ctrl.removeImage);

module.exports = router;
