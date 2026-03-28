const mongoose = require('mongoose');

const lyricLineSchema = new mongoose.Schema({
  text:   { type: String, required: true },
  timeMs: { type: Number, required: true },
}, { _id: false });

const songSchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Título é obrigatório'], trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },

  // Categoria (opcional — músicas sem categoria ficam na seção geral)
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },

  // Áudio
  audioUrl:      { type: String, default: null },
  audioPublicId: { type: String },

  // Capa opcional
  coverUrl:      { type: String },
  coverPublicId: { type: String },

  duration: { type: Number, default: 0 },

  // Letras sincronizadas
  lyrics: [lyricLineSchema],

  active:    { type: Boolean, default: true },
  order:     { type: Number,  default: 0 },
  playCount: { type: Number,  default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Song', songSchema);
