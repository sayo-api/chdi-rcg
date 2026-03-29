const mongoose = require('mongoose');

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const attachmentSchema = new mongoose.Schema({
  url:       { type: String, required: true },
  publicId:  { type: String },
  name:      { type: String, default: '' },
  fileType:  { type: String, default: '' }, // 'zip','js','docx','pdf', etc.
  size:      { type: Number, default: 0 },
}, { _id: false });

const carouselItemSchema = new mongoose.Schema({
  url:       { type: String, required: true },
  publicId:  { type: String },
  mediaType: { type: String, enum: ['image','video','gif','webp'], default: 'image' },
  order:     { type: Number, default: 0 },
}, { _id: false });

const carouselV2ItemSchema = new mongoose.Schema({
  url:       { type: String, required: true },
  publicId:  { type: String },
  mediaType: { type: String, enum: ['image','video','gif','webp'], default: 'image' },
  title:     { type: String, trim: true, maxlength: 200, default: '' },
  text:      { type: String, trim: true, maxlength: 2000, default: '' },
  order:     { type: Number, default: 0 },
}, { _id: false });

// ─── Main schema ──────────────────────────────────────────────────────────────

const postSchema = new mongoose.Schema({
  title:    { type: String, required: [true, 'Título é obrigatório'], trim: true, maxlength: 200 },
  subtitle: { type: String, trim: true, maxlength: 300, default: '' },

  // Card type
  type: {
    type: String,
    enum: ['text', 'media', 'carousel', 'carousel_v2'],
    required: true,
    default: 'text',
  },

  // ── Text card ──────────────────────────────────────────────────────────────
  text:     { type: String, trim: true, maxlength: 10000, default: '' },
  readMore: { type: Boolean, default: false }, // show "Ler mais" toggle when text is long

  // ── Media card (single image / video / gif / webp) ────────────────────────
  mediaUrl:   { type: String, default: '' },
  mediaPublicId: { type: String, default: '' },
  mediaType:  {
    type: String,
    enum: ['image','video','gif','webp',''],
    default: '',
  },

  // ── Carousel (multiple media, same slide text) ────────────────────────────
  carouselItems: { type: [carouselItemSchema], default: [] },

  // ── Carousel V2 (each slide has its own title + text) ─────────────────────
  carouselV2Items: { type: [carouselV2ItemSchema], default: [] },

  // ── Attachments (zip, js, docx, pdf, etc.) ───────────────────────────────
  attachments: { type: [attachmentSchema], default: [] },

  // ── Meta ──────────────────────────────────────────────────────────────────
  category:  { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  active:    { type: Boolean, default: true },
  order:     { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
