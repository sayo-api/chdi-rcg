require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 5000;

// Render sits behind a reverse proxy — trust the first hop so that
// X-Forwarded-For is read correctly by express-rate-limit.
app.set('trust proxy', 1);

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
app.use('/api/posts',           require('./routes/posts'));
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

  // ─── Keep-alive: evita que o Render adormeça o serviço ───────────────────
  const KEEP_ALIVE_URL      = 'https://anyprem.store/api/health';
  const KEEP_ALIVE_INTERVAL = 8 * 60 * 1000; // 8 minutos em ms

  if (process.env.NODE_ENV === 'production') {
    const https = require('https');

    const ping = () => {
      https.get(KEEP_ALIVE_URL, (res) => {
        console.log(`[keep-alive] ping → ${KEEP_ALIVE_URL} | status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.warn(`[keep-alive] erro no ping: ${err.message}`);
      });
    };

    // Aguarda 1 min após o boot para dar tempo ao servidor de inicializar
    setTimeout(() => {
      ping();
      setInterval(ping, KEEP_ALIVE_INTERVAL);
    }, 60 * 1000);

    console.log(`🏓  Keep-alive ativo → ${KEEP_ALIVE_URL} (a cada 8 min)\n`);
  }
  // ─────────────────────────────────────────────────────────────────────────
});
