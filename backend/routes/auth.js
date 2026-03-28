const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { authMiddleware } = require('../middleware/auth');

// ── LOGIN ──────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { war_number, password } = req.body;
    if (!war_number || !password)
      return res.status(400).json({ error: 'Número de guerra e senha são obrigatórios' });

    const user = await User.findOne({ war_number: war_number.toUpperCase().trim() });

    if (!user)
      return res.status(401).json({ error: 'Credenciais inválidas' });

    if (!user.is_active)
      return res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });

    if (!user.password_hash)
      return res.status(403).json({ error: 'Conta sem senha definida. Realize o primeiro acesso.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const ua = req.headers['user-agent'] || '';

    await LoginLog.create({ user_id: user._id, ip_address: ip, user_agent: ua, success: valid });

    if (!valid)
      return res.status(401).json({ error: 'Credenciais inválidas' });

    user.last_login = new Date();
    user.last_ip = ip;
    user.last_user_agent = ua;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, war_number: user.war_number },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: user.toSafeObject(), first_access: user.first_access });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── PRIMEIRO ACESSO ────────────────────────────────────────────────────────
router.post('/first-access', async (req, res) => {
  try {
    const { war_number, password } = req.body;
    if (!war_number || !password)
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

    const user = await User.findOne({ war_number: war_number.toUpperCase().trim() });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!user.first_access && user.password_hash)
      return res.status(400).json({ error: 'Senha já definida. Use a tela de login.' });

    user.password_hash = await bcrypt.hash(password, 10);
    user.first_access = false;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, war_number: user.war_number },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ message: 'Senha definida com sucesso', token, user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ── ME ─────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user.toSafeObject());
});

module.exports = router;
