const mongoose = require('mongoose');

// Card de instrução associado ao PDF
const cardSchema = new mongoose.Schema({
  imageUrl: { type: String },
  text:     { type: String },
  order:    { type: Number, default: 0 },
}, { _id: false });

/**
 * PDFs disponíveis no app (manuais, regulamentos, hinos impressos, etc.)
 * O campo pdfUrl aponta para o Cloudinary (raw resource_type).
 */
const pdfSchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Título é obrigatório'], trim: true, maxlength: 120 },
  subtitle:    { type: String, trim: true, maxlength: 200, default: '' },
  description: { type: String, trim: true, maxlength: 500, default: '' },

  // Categoria (opcional)
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },

  // Arquivo PDF (Cloudinary)
  pdfUrl:      { type: String, required: [true, 'URL do PDF é obrigatória'] },
  pdfPublicId: { type: String },

  // Capa opcional
  coverUrl:      { type: String, default: null },
  coverPublicId: { type: String },

  pageCount: { type: Number, default: 0 },
  fileSize:  { type: Number, default: 0 }, // bytes

  // Texto extraído por página para busca no app
  pagesText: { type: [String], default: [] },

  // Cards de notas de instrução
  cards:      { type: [cardSchema], default: [] },
  cardsLabel: { type: String, default: 'NOTAS DE INSTRUÇÃO' },

  active: { type: Boolean, default: true },
  order:  { type: Number,  default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Pdf', pdfSchema);
