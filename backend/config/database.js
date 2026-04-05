const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI não definida no .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('✅  MongoDB conectado:', mongoose.connection.host);
    await seedAdmin();
  } catch (err) {
    console.error('❌  Falha ao conectar ao MongoDB:', err.message);
    process.exit(1);
  }
}

async function seedAdmin() {
  const User = require('../models/User');
  const exists = await User.findOne({ war_number: 'sayoz' });
  if (exists) return;

  const password_hash = await bcrypt.hash('34615194', 10);
  await User.create({
    war_number: 'sayoz',
    war_name: 'ADMIN',
    full_name: 'Administrador do Sistema',
    rank: 'adm',
    role: 'admin',
    password_hash,
    first_access: false,
  });

  console.log('✅  Admin padrão criado:');
}

module.exports = { connectDB };
