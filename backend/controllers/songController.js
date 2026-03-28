const Song     = require('../models/Song');
const Category = require('../models/Category');
const { cloudinary, uploadBuffer } = require('../config/cloudinary');

// ─── Público (app mobile) ─────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const songs = await Song.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .populate('category', 'name icon iconColor sectionLabel')
      .select('-audioPublicId -coverPublicId');
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
      .select('-audioPublicId -coverPublicId');
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
    const { title, description, categoryId, lyrics, order } = req.body;

    if (!title)    return res.status(422).json({ error: 'Título é obrigatório.' });
    if (!req.file) return res.status(400).json({ error: 'Arquivo de áudio é obrigatório.' });

    // Valida categoria se fornecida
    let categoryRef = null;
    if (categoryId) {
      const cat = await Category.findById(categoryId);
      if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
      categoryRef = cat._id;
    }

    let parsedLyrics = [];
    try { if (lyrics) parsedLyrics = JSON.parse(lyrics); } catch (_) {}

    const songData = {
      title:       title.trim(),
      description: description?.trim(),
      category:    categoryRef,
      lyrics:      parsedLyrics,
      order:       order ? parseInt(order) : 0,
      createdBy:   req.user._id,
    };

    const folder   = `sigmil/songs`;
    const publicId = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_').split('.')[0]}`;
    const result   = await uploadBuffer(req.file.buffer, {
      folder,
      resource_type: 'video',
      public_id: publicId,
    });

    songData.audioUrl      = result.secure_url;
    songData.audioPublicId = result.public_id;

    const song = await Song.create(songData);
    res.status(201).json({ message: 'Música adicionada com sucesso.', song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar música.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, categoryId, lyrics, order, active } = req.body;
    const updateData = {};

    if (title       !== undefined) updateData.title       = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (order       !== undefined) updateData.order       = parseInt(order);
    if (active      !== undefined) updateData.active      = active === 'true' || active === true;

    // Permite null para remover categoria, ou um ID válido para atribuir
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

    if (req.file) {
      const existing = await Song.findById(req.params.id);
      if (existing?.audioPublicId) {
        await cloudinary.uploader.destroy(existing.audioPublicId, { resource_type: 'video' }).catch(() => {});
      }
      const folder   = `sigmil/songs`;
      const publicId = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_').split('.')[0]}`;
      const result   = await uploadBuffer(req.file.buffer, {
        folder,
        resource_type: 'video',
        public_id: publicId,
      });
      updateData.audioUrl      = result.secure_url;
      updateData.audioPublicId = result.public_id;
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
    if (song.audioPublicId) {
      await cloudinary.uploader.destroy(song.audioPublicId, { resource_type: 'video' }).catch(() => {});
    }
    if (song.coverPublicId) {
      await cloudinary.uploader.destroy(song.coverPublicId, { resource_type: 'image' }).catch(() => {});
    }
    await song.deleteOne();
    res.json({ message: 'Música removida.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover música.' });
  }
};
