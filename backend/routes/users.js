const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const RANK_ORDER = [
  'marechal','general_exercito','general_divisao','general_brigada',
  'coronel','tenente_coronel','major','capitao',
  'primeiro_tenente','segundo_tenente','aspirante','subtenente',
  'primeiro_sargento','segundo_sargento','terceiro_sargento',
  'cabo','soldado_ep','soldado_ev','comandante',
];

// ── LIST ───────────────────────────────────────────────────────────────────
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password_hash').lean();
    users.sort((a, b) => {
      const ia = RANK_ORDER.indexOf(a.rank);
      const ib = RANK_ORDER.indexOf(b.rank);
      if (ia !== ib) return ia - ib;
      return (a.war_name || '').localeCompare(b.war_name || '');
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// ── GET ONE ────────────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password_hash').lean();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
});

// ── CREATE ─────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { war_number, war_name, full_name, rank, squad, platoon, email, phone, address } = req.body;
    if (!war_number || !war_name)
      return res.status(400).json({ error: 'Número de guerra e nome de guerra são obrigatórios' });

    const exists = await User.findOne({ war_number: war_number.toUpperCase().trim() });
    if (exists) return res.status(409).json({ error: 'Número de guerra já cadastrado' });

    const user = await User.create({
      war_number: war_number.toUpperCase().trim(),
      war_name: war_name.toUpperCase().trim(),
      full_name: full_name || null,
      rank: rank || 'soldado_ev',
      squad: squad || null,
      platoon: platoon || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      role: 'soldier',
      created_by: req.user._id,
    });

    res.status(201).json(user.toSafeObject());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao criar usuário' });
  }
});

// ── UPDATE ─────────────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (user.war_number === 'ADM001' && req.body.war_number && req.body.war_number !== 'ADM001')
      return res.status(403).json({ error: 'Não é possível alterar o número do administrador principal' });

    const fields = ['war_number','war_name','full_name','rank','squad','platoon','email','phone','address','is_active'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        let val = req.body[f];
        if (f === 'war_number' && val) val = val.toUpperCase().trim();
        if (f === 'war_name' && val) val = val.toUpperCase().trim();
        user[f] = val === '' ? null : val;
      }
    });

    await user.save();
    res.json(user.toSafeObject());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar usuário' });
  }
});

// ── TOGGLE ACTIVE ──────────────────────────────────────────────────────────
router.patch('/:id/toggle-active', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.war_number === 'ADM001')
      return res.status(403).json({ error: 'Não é possível desativar o administrador principal' });

    user.is_active = !user.is_active;
    await user.save();
    res.json({ message: user.is_active ? 'Conta ativada' : 'Conta desativada', is_active: user.is_active });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
});

// ── DELETE ─────────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.war_number === 'ADM001')
      return res.status(403).json({ error: 'Não é possível excluir o administrador principal' });

    await LoginLog.deleteMany({ user_id: user._id });
    await user.deleteOne();
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// ── LOGS ───────────────────────────────────────────────────────────────────
router.get('/:id/logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const logs = await LoginLog.find({ user_id: req.params.id })
      .sort({ created_at: -1 })
      .limit(20)
      .lean();
    res.json(logs);
  } catch {
    res.json([]);
  }
});

module.exports = router;
