const mongoose = require('mongoose');

const lyricLineSchema = new mongoose.Schema({
  text:   { type: String, required: true },
  timeMs: { type: Number, required: true },
}, { _id: false });

// Card de instrução (imagem + texto opcional)
const cardSchema = new mongoose.Schema({
  imageUrl: { type: String },
  text:     { type: String },
  order:    { type: Number, default: 0 },
}, { _id: false });

// Item de vídeo múltiplo (playlist de vídeos dentro de uma música)
const videoItemSchema = new mongoose.Schema({
  title:    { type: String },
  videoUrl: { type: String },
  order:    { type: Number, default: 0 },
}, { _id: false });

const songSchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Título é obrigatório'], trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },

  // Categoria (opcional — músicas sem categoria ficam na seção geral)
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },

  // Tipo do conteúdo principal: "audio" | "video" | "cards"
  contentType: { type: String, enum: ['audio', 'video', 'cards'], default: 'audio' },

  // Áudio
  audioUrl:      { type: String, default: null },
  audioPublicId: { type: String },

  // Vídeo principal (contentType === 'video')
  videoUrl:      { type: String, default: null },
  videoPublicId: { type: String },

  // Capa opcional
  coverUrl:      { type: String },
  coverPublicId: { type: String },

  duration: { type: Number, default: 0 },

  // Letras sincronizadas (contentType === 'audio')
  lyrics: [lyricLineSchema],

  // Cards de instrução (contentType === 'cards')
  cards:      { type: [cardSchema],     default: [] },
  cardsLabel: { type: String, default: 'INSTRUÇÕES DE EXECUÇÃO' },

  // Vídeos múltiplos (playlist)
  videos: { type: [videoItemSchema], default: [] },

  active:    { type: Boolean, default: true },
  order:     { type: Number,  default: 0 },
  playCount: { type: Number,  default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Song', songSchema);
