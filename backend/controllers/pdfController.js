const Pdf      = require('../models/Pdf');
const Category = require('../models/Category');
const { cloudinary, uploadBuffer } = require('../config/cloudinary');
const pdfParse = require('pdf-parse');

// Extrai texto por página de um buffer PDF
async function extractPagesText(buffer) {
  const pages = [];
  try {
    const options = {
      pagerender: async (pageData) => {
        try {
          const textContent = await pageData.getTextContent();
          const text = (textContent.items || []).map(i => i.str || '').join(' ').replace(/\s+/g, ' ').trim();
          pages.push(text);
          return text;
        } catch (_) {
          pages.push('');
          return '';
        }
      }
    };
    await pdfParse(buffer, options);
  } catch (e) {
    // pdf-parse pode falhar em PDFs protegidos; silencia o erro
  }
  return pages;
}

// ─── Público (app mobile) ─────────────────────────────────────────────────────

/**
 * GET /api/pdfs
 * Lista todos os PDFs ativos.
 * O app usa isso para montar a lista de manuais/regulamentos.
 */
exports.getAll = async (req, res) => {
  try {
    const pdfs = await Pdf.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .populate('category', 'name icon iconColor sectionLabel')
      .select('-pdfPublicId -coverPublicId');
    res.json({ pdfs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar PDFs.' });
  }
};

/**
 * GET /api/pdfs/category/:categoryId
 * Lista PDFs de uma categoria específica.
 */
exports.getByCategory = async (req, res) => {
  try {
    const pdfs = await Pdf.find({ category: req.params.categoryId, active: true })
      .sort({ order: 1, createdAt: 1 })
      .select('-pdfPublicId -coverPublicId');
    res.json({ pdfs });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar PDFs da categoria.' });
  }
};

/**
 * GET /api/pdfs/:id
 * Retorna um PDF específico com todos os detalhes.
 */
exports.getOne = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id)
      .populate('category', 'name icon iconColor sectionLabel');
    if (!pdf || !pdf.active) return res.status(404).json({ error: 'PDF não encontrado.' });
    res.json({ pdf });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar PDF.' });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.getAllAdmin = async (req, res) => {
  try {
    const pdfs = await Pdf.find()
      .sort({ order: 1, createdAt: -1 })
      .populate('category', 'name icon iconColor');
    res.json({ pdfs });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar PDFs.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, subtitle, description, categoryId, cardsLabel, cards, order } = req.body;

    if (!title?.trim()) return res.status(422).json({ error: 'Título é obrigatório.' });
    if (!req.file)      return res.status(400).json({ error: 'Arquivo PDF é obrigatório.' });

    let categoryRef = null;
    if (categoryId) {
      const cat = await Category.findById(categoryId);
      if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
      categoryRef = cat._id;
    }

    let parsedCards = [];
    try { if (cards) parsedCards = JSON.parse(cards); } catch (_) {}

    // Upload para Cloudinary como raw (PDF)
    const folder   = 'sigmil/pdfs';
    const publicId = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_').split('.')[0]}`;
    const result   = await uploadBuffer(req.file.buffer, {
      folder,
      resource_type: 'raw',
      public_id: publicId,
      format: 'pdf',
      type: 'upload',
      access_mode: 'public',
    });

    // Extrai texto por página para busca no app
    const pagesText = await extractPagesText(req.file.buffer);

    const pdf = await Pdf.create({
      title:       title.trim(),
      subtitle:    subtitle?.trim() || '',
      description: description?.trim() || '',
      category:    categoryRef,
      pdfUrl:      result.secure_url,
      pdfPublicId: result.public_id,
      fileSize:    req.file.size,
      pageCount:   pagesText.length || 0,
      pagesText,
      cardsLabel:  cardsLabel?.trim() || 'NOTAS DE INSTRUÇÃO',
      cards:       parsedCards,
      order:       order ? parseInt(order) : 0,
      createdBy:   req.user._id,
    });

    res.status(201).json({ message: 'PDF adicionado com sucesso.', pdf });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar PDF.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, subtitle, description, categoryId, cardsLabel, cards, order, active, pageCount } = req.body;
    const updateData = {};

    if (title       !== undefined) updateData.title       = title.trim();
    if (subtitle    !== undefined) updateData.subtitle    = subtitle?.trim() || '';
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (order       !== undefined) updateData.order       = parseInt(order);
    if (active      !== undefined) updateData.active      = active === 'true' || active === true;
    if (pageCount   !== undefined) updateData.pageCount   = parseInt(pageCount);
    if (cardsLabel  !== undefined) updateData.cardsLabel  = cardsLabel?.trim() || 'NOTAS DE INSTRUÇÃO';

    if (categoryId !== undefined) {
      if (!categoryId || categoryId === 'null') {
        updateData.category = null;
      } else {
        const cat = await Category.findById(categoryId);
        if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
        updateData.category = cat._id;
      }
    }

    try { if (cards !== undefined) updateData.cards = JSON.parse(cards); } catch (_) {}

    if (req.file) {
      const existing = await Pdf.findById(req.params.id);
      if (existing?.pdfPublicId) {
        await cloudinary.uploader.destroy(existing.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
      }
      const folder   = 'sigmil/pdfs';
      const publicId = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_').split('.')[0]}`;
      const result   = await uploadBuffer(req.file.buffer, {
        folder,
        resource_type: 'raw',
        public_id: publicId,
        format: 'pdf',
        type: 'upload',
        access_mode: 'public',
      });
      updateData.pdfUrl      = result.secure_url;
      updateData.pdfPublicId = result.public_id;
      updateData.fileSize    = req.file.size;
      const pagesText = await extractPagesText(req.file.buffer);
      updateData.pagesText  = pagesText;
      updateData.pageCount  = pagesText.length || 0;
    }

    const pdf = await Pdf.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('category', 'name icon iconColor');
    if (!pdf) return res.status(404).json({ error: 'PDF não encontrado.' });
    res.json({ message: 'PDF atualizado.', pdf });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar PDF.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) return res.status(404).json({ error: 'PDF não encontrado.' });

    if (pdf.pdfPublicId) {
      await cloudinary.uploader.destroy(pdf.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
    }
    if (pdf.coverPublicId) {
      await cloudinary.uploader.destroy(pdf.coverPublicId, { resource_type: 'image' }).catch(() => {});
    }
    await pdf.deleteOne();
    res.json({ message: 'PDF removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover PDF.' });
  }
};
