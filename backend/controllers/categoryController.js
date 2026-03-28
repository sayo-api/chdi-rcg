const Category = require('../models/Category');
const Song     = require('../models/Song');

// ─── Público (app mobile) ─────────────────────────────────────────────────────

/**
 * GET /api/categories
 * Lista todas as categorias ativas com contagem de músicas.
 * O app usa isso para montar a tela inicial de categorias.
 */
exports.getAll = async (req, res) => {
  try {
    const categories = await Category.find({ active: true }).sort({ order: 1, createdAt: 1 });

    // Calcula songCount dinamicamente
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Song.countDocuments({ category: cat._id, active: true });
        return { ...cat.toObject(), songCount: count };
      })
    );

    res.json({ categories: withCounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * GET /api/categories/admin/all
 * Lista todas as categorias (inclusive inativas) para o painel admin.
 */
exports.getAllAdmin = async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Song.countDocuments({ category: cat._id });
        return { ...cat.toObject(), songCount: count };
      })
    );

    res.json({ categories: withCounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
};

/**
 * POST /api/categories
 * Cria uma nova categoria.
 */
exports.create = async (req, res) => {
  try {
    const { name, description, sectionLabel, icon, iconColor, order } = req.body;

    if (!name?.trim()) return res.status(422).json({ error: 'Nome é obrigatório.' });

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
      sectionLabel: sectionLabel?.trim() || '',
      icon: icon || 'music',
      iconColor: iconColor || 'olive',
      order: order ? parseInt(order) : 0,
    });

    res.status(201).json({ message: 'Categoria criada.', category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria.' });
  }
};

/**
 * PUT /api/categories/:id
 * Atualiza uma categoria existente.
 */
exports.update = async (req, res) => {
  try {
    const { name, description, sectionLabel, icon, iconColor, order, active } = req.body;
    const updateData = {};

    if (name         !== undefined) updateData.name         = name.trim();
    if (description  !== undefined) updateData.description  = description?.trim() || '';
    if (sectionLabel !== undefined) updateData.sectionLabel = sectionLabel?.trim() || '';
    if (icon         !== undefined) updateData.icon         = icon;
    if (iconColor    !== undefined) updateData.iconColor    = iconColor;
    if (order        !== undefined) updateData.order        = parseInt(order);
    if (active       !== undefined) updateData.active       = active === 'true' || active === true;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ error: 'Categoria não encontrada.' });

    res.json({ message: 'Categoria atualizada.', category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar categoria.' });
  }
};

/**
 * DELETE /api/categories/:id
 * Remove (desativa) uma categoria. Bloqueia se houver músicas vinculadas.
 */
exports.remove = async (req, res) => {
  try {
    const songs = await Song.countDocuments({ category: req.params.id });
    if (songs > 0) {
      return res.status(400).json({
        error: `Não é possível remover: ${songs} música(s) vinculada(s) a esta categoria. Remova ou mova as músicas primeiro.`,
      });
    }

    await Category.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ message: 'Categoria removida.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover categoria.' });
  }
};
