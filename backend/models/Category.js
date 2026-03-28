const mongoose = require('mongoose');

/**
 * Categorias de músicas do app.
 * O app compara a versão local com a do servidor para decidir se precisa sincronizar.
 * Ao criar/editar/remover categorias, incremente a versão de sync (publicar para app).
 */
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome da categoria é obrigatório'],
    trim: true,
    maxlength: [80, 'Nome muito longo'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Descrição muito longa'],
    default: '',
  },
  // Rótulo da seção que aparece no app (ex: "HINOS MILITARES")
  sectionLabel: {
    type: String,
    trim: true,
    maxlength: [60, 'Rótulo muito longo'],
    default: '',
  },
  icon:      { type: String, default: 'music' },
  iconColor: {
    type: String,
    default: 'olive',
    enum: ['olive', 'khaki', 'green', 'red', 'blue', 'gold'],
  },
  order:     { type: Number, default: 0 },
  active:    { type: Boolean, default: true },
  songCount: { type: Number, default: 0 }, // calculado dinamicamente
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
