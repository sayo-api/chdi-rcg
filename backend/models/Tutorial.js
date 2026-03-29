const mongoose = require('mongoose');

// Imagem com título e descrição (passo do tutorial)
const tutorialImageSchema = new mongoose.Schema({
  imageUrl:      { type: String, required: true },
  imagePublicId: { type: String },
  title:         { type: String, trim: true, maxlength: 200, default: '' },
  description:   { type: String, trim: true, maxlength: 1000, default: '' },
  order:         { type: Number, default: 0 },
}, { _id: false });

const tutorialSchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Título é obrigatório'], trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500, default: '' },

  // Categoria (opcional)
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },

  // Imagens do tutorial (ordenadas)
  images: { type: [tutorialImageSchema], default: [] },

  active:    { type: Boolean, default: true },
  order:     { type: Number,  default: 0 },
  viewCount: { type: Number,  default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Tutorial', tutorialSchema);
