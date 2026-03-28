const express = require('express');
const router  = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/syncController');

// Público — o app usa para verificar a versão sem autenticação
router.get('/status', ctrl.getStatus);

// Admin only — publica nova versão de conteúdo para o app
router.post('/publish', authMiddleware, adminMiddleware, ctrl.publish);

module.exports = router;
