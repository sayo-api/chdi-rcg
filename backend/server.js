require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

const limiter      = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' } });

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true
    : [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(limiter);

app.use('/api/auth',            loginLimiter, require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/permissions',     require('./routes/permissions'));
app.use('/api/rollcall',        require('./routes/rollcall'));
app.use('/api/rollcall-export', require('./routes/rollcall-export'));
app.use('/api/scale',           require('./routes/scale'));
app.use('/api/scale-export',    require('./routes/scale-export'));
app.use('/api/categories',      require('./routes/categories'));
app.use('/api/songs',           require('./routes/songs'));
app.use('/api/pdfs',            require('./routes/pdfs'));
app.use('/api/tutorials',       require('./routes/tutorials'));
app.use('/api/sync',            require('./routes/sync'));

app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', db: 'MongoDB', timestamp: new Date().toISOString() }));

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n🪖  SIGMIL — Sistema Militar`);
  console.log(`🌐  http://localhost:${PORT}`);
  console.log(`📡  API: http://localhost:${PORT}/api\n`);
});
