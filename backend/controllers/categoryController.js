const Category = require('../models/Category');
const Song     = require('../models/Song');
const Pdf      = require('../models/Pdf');
const Tutorial = require('../models/Tutorial');
const Post     = require('../models/Post');

// Helper: calcula contagens de todos os tipos de conteúdo para uma categoria
async function buildCounts(cat, activeOnly = false) {
  const filter = (extra = {}) => activeOnly
    ? { category: cat._id, active: true, ...extra }
    : { category: cat._id, ...extra };

  const [songCount, pdfCount, tutorialCount, postCount] = await Promise.all([
    Song.countDocuments(filter()),
    Pdf.countDocuments(filter()),
    Tutorial.countDocuments(filter()),
    Post.countDocuments(filter()),
  ]);

  return {
    ...cat.toObject(),
    songCount,
    pdfCount,
    tutorialCount,
    postCount,
    totalCount: songCount + pdfCount + tutorialCount + postCount,
  };
}

// ─── Público (app mobile) ─────────────────────────────────────────────────────

/**
 * GET /api/categories
 * Lista categorias ativas que possuem ao menos um conteúdo vinculado.
 * Músicas, PDFs, tutoriais e posts são considerados.
 */
exports.getAll = async (req, res) => {
  try {
    const categories = await Category.find({ active: true }).sort({ order: 1, createdAt: 1 });
    const withCounts = await Promise.all(categories.map(cat => buildCounts(cat, true)));
    // Só envia categorias que têm pelo menos 1 conteúdo ativo
    const nonEmpty = withCounts.filter(c => c.totalCount > 0);
    res.json({ categories: nonEmpty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * GET /api/categories/admin/all
 * Lista todas as categorias (inclusive inativas) para o painel admin,
 * com contagem de cada tipo de conteúdo.
 */
exports.getAllAdmin = async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, createdAt: 1 });
    const withCounts = await Promise.all(categories.map(cat => buildCounts(cat, false)));
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
      req.params.id, updateData, { new: true, runValidators: true }
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
 * Bloqueia remoção se houver músicas, PDFs, tutoriais ou posts vinculados.
 */
exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const [songs, pdfs, tutorials, posts] = await Promise.all([
      Song.countDocuments({ category: id }),
      Pdf.countDocuments({ category: id }),
      Tutorial.countDocuments({ category: id }),
      Post.countDocuments({ category: id }),
    ]);
    const total = songs + pdfs + tutorials + posts;
    if (total > 0) {
      const parts = [];
      if (songs)     parts.push(`${songs} música(s)`);
      if (pdfs)      parts.push(`${pdfs} PDF(s)`);
      if (tutorials) parts.push(`${tutorials} tutorial(is)`);
      if (posts)     parts.push(`${posts} post(s)`);
      return res.status(400).json({
        error: `Não é possível remover: ${parts.join(', ')} vinculado(s). Remova ou mova o conteúdo primeiro.`,
      });
    }
    await Category.findByIdAndUpdate(id, { active: false });
    res.json({ message: 'Categoria removida.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover categoria.' });
  }
};

/**
 * GET /api/categories/admin/list
 * Lista simples de categorias para selects/dropdowns do admin.
 * Retorna todas (ativas e inativas) sem fazer contagens — resposta rápida.
 */
exports.getList = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ order: 1, name: 1 })
      .select('name icon iconColor active order');
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
};
