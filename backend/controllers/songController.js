const Song     = require('../models/Song');
const Category = require('../models/Category');
const { cloudinary, uploadBuffer } = require('../config/cloudinary');

// ─── Público (app mobile) ─────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const songs = await Song.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .populate('category', 'name icon iconColor sectionLabel')
      .select('-audioPublicId -coverPublicId -videoPublicId');
    res.json({ songs });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar músicas.' });
  }
};

/**
 * GET /api/songs/category/:categoryId
 * Lista músicas de uma categoria específica.
 */
exports.getByCategory = async (req, res) => {
  try {
    const songs = await Song.find({ category: req.params.categoryId, active: true })
      .sort({ order: 1, createdAt: 1 })
      .select('-audioPublicId -coverPublicId -videoPublicId');
    res.json({ songs });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar músicas da categoria.' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('category', 'name icon iconColor sectionLabel');
    if (!song || !song.active) return res.status(404).json({ error: 'Música não encontrada.' });
    await Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });
    res.json({ song });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar música.' });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.getAllAdmin = async (req, res) => {
  try {
    const songs = await Song.find()
      .sort({ order: 1, createdAt: -1 })
      .populate('category', 'name icon iconColor');
    res.json({ songs });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar músicas.' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      title, description, categoryId, lyrics, cards, videos,
      cardsLabel, contentType, order,
    } = req.body;

    if (!title) return res.status(422).json({ error: 'Título é obrigatório.' });

    const type = contentType || 'audio';

    // Arquivo de mídia é obrigatório para audio/video; cards pode não ter arquivo
    if (type !== 'cards' && !req.file) {
      return res.status(400).json({ error: 'Arquivo de mídia é obrigatório.' });
    }

    // Valida categoria se fornecida
    let categoryRef = null;
    if (categoryId) {
      const cat = await Category.findById(categoryId);
      if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
      categoryRef = cat._id;
    }

    let parsedLyrics = [];
    let parsedCards  = [];
    let parsedVideos = [];
    try { if (lyrics) parsedLyrics = JSON.parse(lyrics); } catch (_) {}
    try { if (cards)  parsedCards  = JSON.parse(cards);  } catch (_) {}
    try { if (videos) parsedVideos = JSON.parse(videos); } catch (_) {}

    const songData = {
      title:       title.trim(),
      description: description?.trim(),
      contentType: type,
      category:    categoryRef,
      lyrics:      parsedLyrics,
      cards:       parsedCards,
      videos:      parsedVideos,
      cardsLabel:  cardsLabel?.trim() || 'INSTRUÇÕES DE EXECUÇÃO',
      order:       order ? parseInt(order) : 0,
      createdBy:   req.user._id,
    };

    if (req.file) {
      const isVideo  = type === 'video' || req.file.mimetype.startsWith('video/');
      const folder   = 'sigmil/songs';
      const publicId = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_').split('.')[0]}`;
      const result   = await uploadBuffer(req.file.buffer, {
        folder,
        resource_type: 'video', // Cloudinary usa 'video' tanto para áudio quanto vídeo
        public_id: publicId,
      });

      if (isVideo) {
        songData.videoUrl      = result.secure_url;
        songData.videoPublicId = result.public_id;
      } else {
        songData.audioUrl      = result.secure_url;
        songData.audioPublicId = result.public_id;
      }
    }

    const song = await Song.create(songData);
    res.status(201).json({ message: 'Música adicionada com sucesso.', song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar música.' });
  }
};

exports.update = async (req, res) => {
  try {
    const {
      title, description, categoryId, lyrics, cards, videos,
      cardsLabel, contentType, order, active,
    } = req.body;

    const updateData = {};

    if (title       !== undefined) updateData.title       = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (contentType !== undefined) updateData.contentType = contentType;
    if (order       !== undefined) updateData.order       = parseInt(order);
    if (active      !== undefined) updateData.active      = active === 'true' || active === true;
    if (cardsLabel  !== undefined) updateData.cardsLabel  = cardsLabel?.trim() || 'INSTRUÇÕES DE EXECUÇÃO';

    if (categoryId !== undefined) {
      if (!categoryId || categoryId === 'null') {
        updateData.category = null;
      } else {
        const cat = await Category.findById(categoryId);
        if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
        updateData.category = cat._id;
      }
    }

    try { if (lyrics !== undefined) updateData.lyrics = JSON.parse(lyrics); } catch (_) {}
    try { if (cards  !== undefined) updateData.cards  = JSON.parse(cards);  } catch (_) {}
    try { if (videos !== undefined) updateData.videos = JSON.parse(videos); } catch (_) {}

    if (req.file) {
      const existing = await Song.findById(req.params.id);
      const type     = contentType || existing?.contentType || 'audio';
      const isVideo  = type === 'video' || req.file.mimetype.startsWith('video/');

      // Remove arquivo antigo do Cloudinary
      if (isVideo && existing?.videoPublicId) {
        await cloudinary.uploader.destroy(existing.videoPublicId, { resource_type: 'video' }).catch(() => {});
      } else if (!isVideo && existing?.audioPublicId) {
        await cloudinary.uploader.destroy(existing.audioPublicId, { resource_type: 'video' }).catch(() => {});
      }

      const folder   = 'sigmil/songs';
      const publicId = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_').split('.')[0]}`;
      const result   = await uploadBuffer(req.file.buffer, {
        folder,
        resource_type: 'video',
        public_id: publicId,
      });

      if (isVideo) {
        updateData.videoUrl      = result.secure_url;
        updateData.videoPublicId = result.public_id;
      } else {
        updateData.audioUrl      = result.secure_url;
        updateData.audioPublicId = result.public_id;
      }
    }

    const song = await Song.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('category', 'name icon iconColor');
    if (!song) return res.status(404).json({ error: 'Música não encontrada.' });
    res.json({ message: 'Música atualizada.', song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar música.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Música não encontrada.' });

    const destroyOpts = { resource_type: 'video' };
    if (song.audioPublicId) await cloudinary.uploader.destroy(song.audioPublicId, destroyOpts).catch(() => {});
    if (song.videoPublicId) await cloudinary.uploader.destroy(song.videoPublicId, destroyOpts).catch(() => {});
    if (song.coverPublicId) await cloudinary.uploader.destroy(song.coverPublicId, { resource_type: 'image' }).catch(() => {});

    await song.deleteOne();
    res.json({ message: 'Música removida.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover música.' });
  }
};
