const SyncVersion = require('../models/SyncVersion');
const Song        = require('../models/Song');
const Category    = require('../models/Category');

/**
 * GET /api/sync/status
 * Público — retorna versão atual e contagem de músicas e categorias.
 * O app chama isso para decidir se precisa sincronizar.
 */
exports.getStatus = async (req, res) => {
  try {
    let syncDoc = await SyncVersion.findOne();
    if (!syncDoc) {
      syncDoc = await SyncVersion.create({ version: 0, publishedAt: new Date(), note: 'Versão inicial' });
    }

    const [songCount, catCount] = await Promise.all([
      Song.countDocuments({ active: true }).catch(() => Song.countDocuments()),
      Category.countDocuments({ active: true }).catch(() => Category.countDocuments()),
    ]);

    res.json({
      version:     syncDoc.version,
      publishedAt: syncDoc.publishedAt,
      publishedBy: syncDoc.publishedBy,
      note:        syncDoc.note,
      stats:       { songs: songCount, categories: catCount },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter status de sincronização.' });
  }
};

/**
 * POST /api/sync/publish  [admin only]
 * Incrementa a versão — sinaliza ao app que há conteúdo novo para baixar.
 */
exports.publish = async (req, res) => {
  try {
    const { note = '' } = req.body;
    const adminName = req.user?.war_name || req.user?.war_number || 'admin';

    let syncDoc = await SyncVersion.findOne();
    if (!syncDoc) {
      syncDoc = new SyncVersion({ version: 0 });
    }

    syncDoc.version    += 1;
    syncDoc.publishedAt = new Date();
    syncDoc.publishedBy = adminName;
    syncDoc.note        = note;
    await syncDoc.save();

    const [songCount, catCount] = await Promise.all([
      Song.countDocuments({ active: true }).catch(() => Song.countDocuments()),
      Category.countDocuments({ active: true }).catch(() => Category.countDocuments()),
    ]);

    res.json({
      message:     `Versão ${syncDoc.version} publicada. Apps receberão a atualização.`,
      version:     syncDoc.version,
      publishedAt: syncDoc.publishedAt,
      publishedBy: syncDoc.publishedBy,
      note:        syncDoc.note,
      stats:       { songs: songCount, categories: catCount },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao publicar.' });
  }
};
