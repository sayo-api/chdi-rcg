const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user || !user.is_active)
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  next();
}

module.exports = { authMiddleware, adminMiddleware };
