const Tutorial  = require('../models/Tutorial');
const Category  = require('../models/Category');
const { cloudinary, uploadBuffer } = require('../config/cloudinary');

// ─── Público (app mobile) ─────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const tutorials = await Tutorial.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .populate('category', 'name icon iconColor sectionLabel')
      .select('-images.imagePublicId');
    res.json({ tutorials });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tutoriais.' });
  }
};

exports.getByCategory = async (req, res) => {
  try {
    const tutorials = await Tutorial.find({ category: req.params.categoryId, active: true })
      .sort({ order: 1, createdAt: 1 })
      .select('-images.imagePublicId');
    res.json({ tutorials });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tutoriais da categoria.' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id)
      .populate('category', 'name icon iconColor sectionLabel');
    if (!tutorial || !tutorial.active) return res.status(404).json({ error: 'Tutorial não encontrado.' });
    await Tutorial.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ tutorial });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tutorial.' });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.getAllAdmin = async (req, res) => {
  try {
    const tutorials = await Tutorial.find()
      .sort({ order: 1, createdAt: -1 })
      .populate('category', 'name icon iconColor');
    res.json({ tutorials });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tutoriais.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, categoryId, order, images } = req.body;
    if (!title) return res.status(422).json({ error: 'Título é obrigatório.' });

    let categoryRef = null;
    if (categoryId) {
      const cat = await Category.findById(categoryId);
      if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
      categoryRef = cat._id;
    }

    // images é um array JSON com campos: title, description, order
    // As imagens em si são enviadas como files: image_0, image_1, ...
    let parsedImages = [];
    try { if (images) parsedImages = JSON.parse(images); } catch (_) {}

    const tutorial = await Tutorial.create({
      title:       title.trim(),
      description: description?.trim() || '',
      category:    categoryRef,
      images:      parsedImages, // apenas metadados, sem imagens ainda
      order:       order ? parseInt(order) : 0,
      createdBy:   req.user._id,
    });

    res.status(201).json({ message: 'Tutorial criado. Agora envie as imagens.', tutorial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar tutorial.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, categoryId, order, active, images } = req.body;
    const updateData = {};

    if (title       !== undefined) updateData.title       = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (order       !== undefined) updateData.order       = parseInt(order);
    if (active      !== undefined) updateData.active      = active === 'true' || active === true;

    if (categoryId !== undefined) {
      if (!categoryId || categoryId === 'null') {
        updateData.category = null;
      } else {
        const cat = await Category.findById(categoryId);
        if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
        updateData.category = cat._id;
      }
    }

    try { if (images !== undefined) updateData.images = JSON.parse(images); } catch (_) {}

    const tutorial = await Tutorial.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('category', 'name icon iconColor');
    if (!tutorial) return res.status(404).json({ error: 'Tutorial não encontrado.' });
    res.json({ message: 'Tutorial atualizado.', tutorial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar tutorial.' });
  }
};

// Adiciona uma imagem a um tutorial
exports.addImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Imagem obrigatória.' });

    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) return res.status(404).json({ error: 'Tutorial não encontrado.' });

    const { title, description, order } = req.body;
    const folder    = 'sigmil/tutorials';
    const publicId  = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_').split('.')[0]}`;
    const result    = await uploadBuffer(req.file.buffer, {
      folder,
      resource_type: 'image',
      public_id: publicId,
    });

    const newImage = {
      imageUrl:      result.secure_url,
      imagePublicId: result.public_id,
      title:         title?.trim()       || '',
      description:   description?.trim() || '',
      order:         order ? parseInt(order) : tutorial.images.length,
    };

    tutorial.images.push(newImage);
    // Reordena pelo campo order
    tutorial.images.sort((a, b) => a.order - b.order);
    await tutorial.save();

    res.status(201).json({ message: 'Imagem adicionada.', tutorial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar imagem.' });
  }
};

// Remove uma imagem específica de um tutorial (por index ou publicId)
exports.removeImage = async (req, res) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) return res.status(404).json({ error: 'Tutorial não encontrado.' });

    const { imageIndex } = req.params;
    const idx = parseInt(imageIndex);
    if (isNaN(idx) || idx < 0 || idx >= tutorial.images.length) {
      return res.status(400).json({ error: 'Índice de imagem inválido.' });
    }

    const img = tutorial.images[idx];
    if (img.imagePublicId) {
      await cloudinary.uploader.destroy(img.imagePublicId, { resource_type: 'image' }).catch(() => {});
    }

    tutorial.images.splice(idx, 1);
    // Reordena
    tutorial.images.forEach((im, i) => { im.order = i; });
    await tutorial.save();

    res.json({ message: 'Imagem removida.', tutorial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover imagem.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) return res.status(404).json({ error: 'Tutorial não encontrado.' });

    // Remove todas as imagens do Cloudinary
    for (const img of tutorial.images) {
      if (img.imagePublicId) {
        await cloudinary.uploader.destroy(img.imagePublicId, { resource_type: 'image' }).catch(() => {});
      }
    }

    await tutorial.deleteOne();
    res.json({ message: 'Tutorial removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover tutorial.' });
  }
};
