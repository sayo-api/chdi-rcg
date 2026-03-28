const express = require('express');
const router  = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/categoryController');

// ─── Público (app mobile) ─────────────────────────────────────────────────────
router.get('/', ctrl.getAll);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/all', authMiddleware, adminMiddleware, ctrl.getAllAdmin);
router.post('/',         authMiddleware, adminMiddleware, ctrl.create);
router.put('/:id',       authMiddleware, adminMiddleware, ctrl.update);
router.delete('/:id',    authMiddleware, adminMiddleware, ctrl.remove);

module.exports = router;
