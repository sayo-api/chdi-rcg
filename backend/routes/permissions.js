const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const VALID_PANELS = ['dashboard', 'soldiers', 'rollcall', 'rollcall_manage', 'escala', 'escala_manage'];

router.get('/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('permissions war_name war_number role');
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ permissions: user.permissions || [], role: user.role });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar permissões' });
  }
});

router.put('/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions deve ser um array' });

    const invalid = permissions.filter(p => !VALID_PANELS.includes(p));
    if (invalid.length) return res.status(400).json({ error: `Painéis inválidos: ${invalid.join(', ')}` });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.role === 'admin') return res.json({ permissions: VALID_PANELS, role: 'admin' });

    user.permissions = permissions;
    await user.save();
    res.json({ permissions: user.permissions, role: user.role });
  } catch {
    res.status(500).json({ error: 'Erro ao salvar permissões' });
  }
});

module.exports = router;
