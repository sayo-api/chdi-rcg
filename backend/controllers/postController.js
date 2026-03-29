const Post        = require('../models/Post');
const Category    = require('../models/Category');
const SyncVersion = require('../models/SyncVersion');
const { cloudinary, uploadBuffer } = require('../config/cloudinary');

async function incrementSyncVersion() {
  let doc = await SyncVersion.findOne();
  if (!doc) doc = new SyncVersion({ version: 0 });
  doc.version    += 1;
  doc.publishedAt = new Date();
  doc.publishedBy = 'system';
  await doc.save();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectMediaType(mimetype, originalname) {
  if (mimetype === 'image/gif' || /\.gif$/i.test(originalname)) return 'gif';
  if (mimetype === 'image/webp' || /\.webp$/i.test(originalname)) return 'webp';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'image';
}

function detectFileType(mimetype, originalname) {
  if (/\.zip$/i.test(originalname)) return 'zip';
  if (/\.js$/i.test(originalname))  return 'js';
  if (/\.docx?$/i.test(originalname)) return 'docx';
  if (/\.pdf$/i.test(originalname)) return 'pdf';
  if (/\.xlsx?$/i.test(originalname)) return 'xlsx';
  return originalname.split('.').pop().toLowerCase();
}

async function uploadToCloudinary(file, folder, resourceType = 'auto') {
  const publicId = `${Date.now()}_${file.originalname.replace(/\s+/g,'_').replace(/\.[^.]+$/, '')}`;
  const result = await uploadBuffer(file.buffer, {
    folder,
    resource_type: resourceType,
    public_id: publicId,
  });
  return result;
}

// ─── Public (mobile app) ─────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const posts = await Post.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .populate('category', 'name icon iconColor sectionLabel')
      .select('-mediaPublicId -attachments.publicId');
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar posts.' });
  }
};

exports.getByCategory = async (req, res) => {
  try {
    const posts = await Post.find({ category: req.params.categoryId, active: true })
      .sort({ order: 1, createdAt: -1 })
      .select('-mediaPublicId');
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar posts da categoria.' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('category', 'name icon iconColor sectionLabel');
    if (!post || !post.active) return res.status(404).json({ error: 'Post não encontrado.' });
    await Post.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar post.' });
  }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

exports.getAllAdmin = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ order: 1, createdAt: -1 })
      .populate('category', 'name icon iconColor');
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar posts.' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      title, subtitle, type, text, readMore,
      categoryId, order,
    } = req.body;

    if (!title) return res.status(422).json({ error: 'Título é obrigatório.' });
    if (!type)  return res.status(422).json({ error: 'Tipo do card é obrigatório.' });

    let categoryRef = null;
    if (categoryId && categoryId !== 'null') {
      const cat = await Category.findById(categoryId);
      if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
      categoryRef = cat._id;
    }

    const post = await Post.create({
      title:     title.trim(),
      subtitle:  subtitle?.trim() || '',
      type,
      text:      text?.trim() || '',
      readMore:  readMore === 'true' || readMore === true,
      category:  categoryRef,
      order:     order ? parseInt(order) : 0,
      createdBy: req.user._id,
    });

    await incrementSyncVersion();
    res.status(201).json({ message: 'Post criado. Envie mídias se necessário.', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar post.' });
  }
};

exports.update = async (req, res) => {
  try {
    const {
      title, subtitle, type, text, readMore,
      categoryId, order, active,
    } = req.body;

    const updateData = {};
    if (title     !== undefined) updateData.title     = title.trim();
    if (subtitle  !== undefined) updateData.subtitle  = subtitle?.trim() || '';
    if (type      !== undefined) updateData.type      = type;
    if (text      !== undefined) updateData.text      = text?.trim() || '';
    if (readMore  !== undefined) updateData.readMore  = readMore === 'true' || readMore === true;
    if (order     !== undefined) updateData.order     = parseInt(order);
    if (active    !== undefined) updateData.active    = active === 'true' || active === true;

    if (categoryId !== undefined) {
      updateData.category = (!categoryId || categoryId === 'null') ? null : categoryId;
    }

    const post = await Post.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('category', 'name icon iconColor');
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    await incrementSyncVersion();
    res.json({ message: 'Post atualizado.', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar post.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    // Remove main media
    if (post.mediaPublicId) {
      const rt = post.mediaType === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(post.mediaPublicId, { resource_type: rt }).catch(() => {});
    }
    // Remove carousel items
    for (const item of [...post.carouselItems, ...post.carouselV2Items]) {
      if (item.publicId) {
        const rt = item.mediaType === 'video' ? 'video' : 'image';
        await cloudinary.uploader.destroy(item.publicId, { resource_type: rt }).catch(() => {});
      }
    }
    // Remove attachments
    for (const att of post.attachments) {
      if (att.publicId) {
        await cloudinary.uploader.destroy(att.publicId, { resource_type: 'raw' }).catch(() => {});
      }
    }

    await post.deleteOne();
    await incrementSyncVersion();
    res.json({ message: 'Post removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover post.' });
  }
};

// ─── Upload: main media (type = media card) ───────────────────────────────────

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório.' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const mType = detectMediaType(req.file.mimetype, req.file.originalname);
    const resourceType = mType === 'video' ? 'video' : 'image';

    const result = await uploadToCloudinary(req.file, 'sigmil/posts/media', resourceType);

    // Remove previous media
    if (post.mediaPublicId) {
      const prevRt = post.mediaType === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(post.mediaPublicId, { resource_type: prevRt }).catch(() => {});
    }

    post.mediaUrl       = result.secure_url;
    post.mediaPublicId  = result.public_id;
    post.mediaType      = mType;
    await post.save();

    res.json({ message: 'Mídia enviada.', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar mídia.' });
  }
};

// ─── Upload: carousel item ────────────────────────────────────────────────────

exports.addCarouselItem = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório.' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const mType = detectMediaType(req.file.mimetype, req.file.originalname);
    const resourceType = mType === 'video' ? 'video' : 'image';
    const result = await uploadToCloudinary(req.file, 'sigmil/posts/carousel', resourceType);

    post.carouselItems.push({
      url:       result.secure_url,
      publicId:  result.public_id,
      mediaType: mType,
      order:     post.carouselItems.length,
    });
    post.carouselItems.sort((a, b) => a.order - b.order);
    await post.save();

    res.status(201).json({ message: 'Item adicionado ao carrossel.', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar item ao carrossel.' });
  }
};

exports.removeCarouselItem = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const idx = parseInt(req.params.index);
    if (isNaN(idx) || idx < 0 || idx >= post.carouselItems.length)
      return res.status(400).json({ error: 'Índice inválido.' });

    const item = post.carouselItems[idx];
    if (item.publicId) {
      const rt = item.mediaType === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(item.publicId, { resource_type: rt }).catch(() => {});
    }

    post.carouselItems.splice(idx, 1);
    post.carouselItems.forEach((it, i) => { it.order = i; });
    await post.save();

    res.json({ message: 'Item removido.', post });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover item do carrossel.' });
  }
};

// ─── Upload: carousel V2 item ─────────────────────────────────────────────────

exports.addCarouselV2Item = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório.' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const { title, text } = req.body;
    const mType = detectMediaType(req.file.mimetype, req.file.originalname);
    const resourceType = mType === 'video' ? 'video' : 'image';
    const result = await uploadToCloudinary(req.file, 'sigmil/posts/carousel_v2', resourceType);

    post.carouselV2Items.push({
      url:       result.secure_url,
      publicId:  result.public_id,
      mediaType: mType,
      title:     title?.trim() || '',
      text:      text?.trim()  || '',
      order:     post.carouselV2Items.length,
    });
    post.carouselV2Items.sort((a, b) => a.order - b.order);
    await post.save();

    res.status(201).json({ message: 'Slide adicionado ao carrossel V2.', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar slide ao carrossel V2.' });
  }
};

exports.updateCarouselV2Item = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const idx = parseInt(req.params.index);
    if (isNaN(idx) || idx < 0 || idx >= post.carouselV2Items.length)
      return res.status(400).json({ error: 'Índice inválido.' });

    const { title, text } = req.body;
    if (title !== undefined) post.carouselV2Items[idx].title = title.trim();
    if (text  !== undefined) post.carouselV2Items[idx].text  = text.trim();
    await post.save();

    res.json({ message: 'Slide atualizado.', post });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar slide.' });
  }
};

exports.removeCarouselV2Item = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const idx = parseInt(req.params.index);
    if (isNaN(idx) || idx < 0 || idx >= post.carouselV2Items.length)
      return res.status(400).json({ error: 'Índice inválido.' });

    const item = post.carouselV2Items[idx];
    if (item.publicId) {
      const rt = item.mediaType === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(item.publicId, { resource_type: rt }).catch(() => {});
    }

    post.carouselV2Items.splice(idx, 1);
    post.carouselV2Items.forEach((it, i) => { it.order = i; });
    await post.save();

    res.json({ message: 'Slide removido.', post });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover slide.' });
  }
};

// ─── Upload: attachments (zip, js, docx, pdf, etc.) ──────────────────────────

exports.addAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório.' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const result = await uploadToCloudinary(req.file, 'sigmil/posts/attachments', 'raw');

    post.attachments.push({
      url:      result.secure_url,
      publicId: result.public_id,
      name:     req.file.originalname,
      fileType: detectFileType(req.file.mimetype, req.file.originalname),
      size:     req.file.size,
    });
    await post.save();

    res.status(201).json({ message: 'Anexo adicionado.', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar anexo.' });
  }
};

exports.removeAttachment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const idx = parseInt(req.params.index);
    if (isNaN(idx) || idx < 0 || idx >= post.attachments.length)
      return res.status(400).json({ error: 'Índice inválido.' });

    const att = post.attachments[idx];
    if (att.publicId) {
      await cloudinary.uploader.destroy(att.publicId, { resource_type: 'raw' }).catch(() => {});
    }

    post.attachments.splice(idx, 1);
    await post.save();

    res.json({ message: 'Anexo removido.', post });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover anexo.' });
  }
};
