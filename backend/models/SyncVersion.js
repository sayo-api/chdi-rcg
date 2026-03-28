const mongoose = require('mongoose');

/**
 * Documento único que armazena a versão de conteúdo publicado para o app.
 * Quando o admin clicar em "Publicar para App", a versão é incrementada.
 * O app compara sua versão local com a do servidor para saber se precisa sincronizar.
 */
const SyncVersionSchema = new mongoose.Schema({
  version:     { type: Number, default: 0 },
  publishedAt: { type: Date,   default: Date.now },
  publishedBy: { type: String, default: 'system' }, // nome do admin que publicou
  note:        { type: String, default: '' },         // nota opcional sobre o que mudou
});

module.exports = mongoose.model('SyncVersion', SyncVersionSchema);
