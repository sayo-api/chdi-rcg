import { useEffect, useState, useRef } from 'react';
import { BookImage, Upload, Trash2, Pencil, X, Image, Plus, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../utils/api';

// ─── ImageUploadSlot ───────────────────────────────────────────────────────────
function ImageUploadSlot({ index, image, onChange, onRemove }) {
  const ref = useRef();
  const hasFile   = image?.file   instanceof File;
  const hasUrl    = image?.imageUrl && !hasFile;
  const preview   = hasFile ? URL.createObjectURL(image.file) : image?.imageUrl;

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      background: 'white', transition: 'box-shadow 0.15s',
    }}>
      {/* Imagem */}
      <div
        style={{
          height: 180, background: 'var(--bg-secondary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          position: 'relative', overflow: 'hidden',
          border: `2px dashed ${preview ? 'transparent' : 'var(--border)'}`,
        }}
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) onChange({ ...image, file: e.target.files[0] }); }} />
        {preview ? (
          <>
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; }}
            >
              <Upload size={24} color="white" style={{ opacity: 0, transition: 'opacity 0.2s' }}
                className="hover-show" />
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <Image size={32} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 12, margin: 0 }}>Clique para selecionar</p>
            <p style={{ fontSize: 11, margin: '4px 0 0', color: 'var(--text-muted)' }}>JPG, PNG, WEBP</p>
          </div>
        )}
        {/* Badge de número */}
        <div style={{
          position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: '50%',
          background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
        }}>{index + 1}</div>
      </div>
      {/* Campos de texto */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          className="form-input"
          placeholder="Título da imagem (ex: Passo 1)"
          value={image?.title || ''}
          onChange={e => onChange({ ...image, title: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }}
        />
        <textarea
          className="form-input"
          placeholder="Descrição / instrução para esta imagem..."
          rows={3}
          value={image?.description || ''}
          onChange={e => onChange({ ...image, description: e.target.value })}
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 13 }}
        />
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
            color: 'var(--danger)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, width: '100%',
            justifyContent: 'center',
          }}
        >
          <Trash2 size={12} /> Remover imagem
        </button>
      </div>
    </div>
  );
}

// ─── Modal de Tutorial ─────────────────────────────────────────────────────────
function TutorialModal({ tutorial, onClose, onSaved, categorias }) {
  const isEdit = !!tutorial?._id;

  const [form, setForm] = useState({
    title:       tutorial?.title       || '',
    description: tutorial?.description || '',
    categoryId:  tutorial?.category?._id || tutorial?.category || '',
    order:       tutorial?.order       ?? 0,
  });

  // Cada item: { imageUrl?, imagePublicId?, file?, title, description, order }
  const [images,   setImages]   = useState(
    (tutorial?.images || []).map((img, i) => ({ ...img, _key: Math.random() }))
  );
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [progress, setProgress] = useState('');
  const [tab,      setTab]      = useState('info');

  const tabs = [
    { key: 'info',   label: '📋 Informações' },
    { key: 'images', label: `🖼️ Imagens (${images.length})` },
  ];

  const addImage = () => {
    setImages(prev => [...prev, { title: '', description: '', order: prev.length, _key: Math.random() }]);
  };

  const updateImage = (idx, val) => {
    setImages(prev => prev.map((im, i) => i === idx ? { ...im, ...val } : im));
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const moveImage = (idx, dir) => {
    setImages(prev => {
      const arr = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= arr.length) return arr;
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return arr;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Título é obrigatório.'); return; }
    if (images.length === 0) { setError('Adicione pelo menos uma imagem.'); return; }
    const newImages = images.filter(im => im.file instanceof File);
    if (!isEdit && newImages.length === 0) { setError('Selecione imagens para o tutorial.'); return; }

    setLoading(true); setError(''); setProgress('');

    try {
      // 1. Cria / atualiza o tutorial (metadados)
      const imagesPayload = images.map((im, i) => ({
        imageUrl:      im.imageUrl || '',
        imagePublicId: im.imagePublicId || '',
        title:         im.title || '',
        description:   im.description || '',
        order:         i,
      }));

      const body = {
        title:       form.title.trim(),
        description: form.description.trim(),
        categoryId:  form.categoryId || '',
        order:       form.order,
        images:      JSON.stringify(imagesPayload),
      };

      let tutorialId;
      if (isEdit) {
        const res = await api.put(`/tutorials/${tutorial._id}`, body);
        tutorialId = tutorial._id;
      } else {
        const res = await api.post('/tutorials', body);
        tutorialId = res.data.tutorial._id;
      }

      // 2. Faz upload das imagens novas uma a uma
      const toUpload = images
        .map((im, i) => ({ im, i }))
        .filter(({ im }) => im.file instanceof File);

      for (let j = 0; j < toUpload.length; j++) {
        const { im, i } = toUpload[j];
        setProgress(`Enviando imagem ${j + 1} de ${toUpload.length}...`);
        const fd = new FormData();
        fd.append('image',       im.file);
        fd.append('title',       im.title || '');
        fd.append('description', im.description || '');
        fd.append('order',       String(i));
        await api.post(`/tutorials/${tutorialId}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 3. Se editando, remove imagens que foram apagadas do array (e tinham URL)
      if (isEdit) {
        const removedImages = (tutorial?.images || []).filter(orig =>
          !images.some(cur => cur.imageUrl === orig.imageUrl && cur.imagePublicId === orig.imagePublicId)
        );
        for (const removed of removedImages) {
          const idx = (tutorial?.images || []).indexOf(removed);
          if (idx >= 0) {
            await api.delete(`/tutorials/${tutorialId}/images/${idx}`).catch(() => {});
          }
        }
      }

      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar tutorial.');
    } finally { setLoading(false); setProgress(''); }
  };

  const tabStyle = (key) => ({
    padding: '10px 16px', background: 'none', border: 'none',
    borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
    color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
    transition: 'all 0.15s', marginBottom: -1,
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: 12, width: '100%', maxWidth: 800,
        maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(94,114,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookImage size={16} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.1em' }}>
                {isEdit ? 'EDITAR TUTORIAL' : 'NOVO TUTORIAL'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                {isEdit ? `ID: ${tutorial._id}` : 'Tutorial com imagens sequenciais'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', borderRadius: 6 }}>
            <X size={20} />
          </button>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', flexShrink: 0 }}>
          {tabs.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setTab(key)} style={tabStyle(key)}>{label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: 20 }}>

          {/* ── Informações ── */}
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
                  Título *
                </label>
                <input
                  className="form-input"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Como usar o colete balístico"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
                  <Layers size={12} /> Categoria
                  <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 4, textTransform: 'none' }}>(opcional)</span>
                </label>
                <select
                  className="form-input"
                  value={form.categoryId}
                  onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <option value="">— Sem categoria —</option>
                  {categorias.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
                  Descrição
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descrição breve do tutorial..."
                  style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ maxWidth: 140 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
                  Ordem
                </label>
                <input
                  className="form-input"
                  type="number" min="0"
                  value={form.order}
                  onChange={e => setForm(p => ({ ...p, order: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(94,114,68,0.05)', borderRadius: 8, border: '1px solid rgba(94,114,68,0.15)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  💡 Após preencher as informações, vá para a aba <strong>Imagens</strong> para adicionar as fotos do tutorial. Cada imagem pode ter um título e descrição explicando aquela etapa.
                </p>
              </div>
            </div>
          )}

          {/* ── Imagens ── */}
          {tab === 'images' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  {images.length} {images.length === 1 ? 'imagem' : 'imagens'} — serão exibidas em sequência no app
                </p>
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={addImage}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  <Plus size={14} style={{ marginRight: 4 }} /> Adicionar imagem
                </button>
              </div>

              {images.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed var(--border)', borderRadius: 10, color: 'var(--text-muted)' }}>
                  <Image size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p style={{ marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 13 }}>Nenhuma imagem adicionada</p>
                  <button type="button" className="btn btn-accent" onClick={addImage}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Adicionar primeira imagem
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {images.map((img, idx) => (
                    <div key={img._key || idx} style={{ position: 'relative' }}>
                      {/* Setas de reordenação */}
                      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0}
                          style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 4, padding: 4, cursor: 'pointer', color: 'white', opacity: idx === 0 ? 0.3 : 1 }}>
                          <ArrowUp size={12} />
                        </button>
                        <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1}
                          style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 4, padding: 4, cursor: 'pointer', color: 'white', opacity: idx === images.length - 1 ? 0.3 : 1 }}>
                          <ArrowDown size={12} />
                        </button>
                      </div>
                      <ImageUploadSlot
                        index={idx}
                        image={img}
                        onChange={val => updateImage(idx, val)}
                        onRemove={() => removeImage(idx)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progresso */}
          {loading && progress && (
            <div style={{ margin: '14px 0', padding: 14, background: 'rgba(94,114,68,0.08)', borderRadius: 8, border: '1px solid rgba(94,114,68,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{progress}</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ margin: '14px 0 0', padding: '10px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-accent" disabled={loading} style={{ minWidth: 130 }}>
              {loading ? 'Salvando...' : isEdit ? 'Atualizar Tutorial' : 'Criar Tutorial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function AdminTutoriais() {
  const [tutorials,  setTutorials]  = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState({ msg: '', ok: true });
  const [search,     setSearch]     = useState('');

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [tutRes, catRes] = await Promise.all([
        api.get('/tutorials/admin/all'),
        api.get('/categories/admin/all'),
      ]);
      setTutorials(tutRes.data.tutorials ?? []);
      setCategorias(catRes.data.categories ?? []);
    } catch {
      showToast('Erro ao carregar dados.', false);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (t) => {
    if (!window.confirm(`Remover "${t.title}"? Todas as imagens serão apagadas. Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/tutorials/${t._id}`);
      showToast('✓ Tutorial removido com sucesso.');
      load();
    } catch (err) {
      showToast('✗ ' + (err.response?.data?.error || 'Erro ao remover.'), false);
    }
  };

  const handleToggleActive = async (t) => {
    try {
      await api.put(`/tutorials/${t._id}`, { active: String(!t.active) });
      showToast(t.active ? '✓ Tutorial desativado.' : '✓ Tutorial ativado.');
      load();
    } catch {
      showToast('✗ Erro ao alterar status.', false);
    }
  };

  const catNameOf = (t) => {
    if (!t.category) return null;
    const id = t.category?._id || t.category;
    return categorias.find(c => c._id === id)?.name || null;
  };

  const filtered = tutorials.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(94,114,68,0.1)', border: '1px solid rgba(94,114,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookImage size={18} color="var(--accent)" />
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.1em', margin: 0 }}>TUTORIAIS</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', margin: 0 }}>
              Tutoriais com imagens sequenciais e descrições
            </p>
          </div>
          <button className="btn btn-accent" onClick={() => setModal({})}>+ Novo Tutorial</button>
        </div>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: toast.ok ? 'rgba(94,114,68,0.08)' : 'rgba(220,38,38,0.06)',
          border: `1px solid ${toast.ok ? 'rgba(94,114,68,0.25)' : 'rgba(220,38,38,0.2)'}`,
          borderRadius: 8, fontSize: 14,
          color: toast.ok ? 'var(--accent)' : 'var(--danger)',
          fontFamily: 'var(--font-mono)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Stats + Filtro */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',   value: tutorials.length,                       color: 'var(--text-secondary)' },
            { label: 'Ativos',  value: tutorials.filter(t => t.active).length, color: 'var(--accent)' },
            { label: 'Imagens', value: tutorials.reduce((a, t) => a + (t.images?.length || 0), 0), color: '#3b82f6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>{value}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
        <input
          className="form-input"
          placeholder="Buscar tutorial..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220, boxSizing: 'border-box' }}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <BookImage size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ marginBottom: 16, fontSize: 16, fontFamily: 'var(--font-mono)' }}>
            {search ? 'Nenhum tutorial encontrado.' : 'Nenhum tutorial cadastrado.'}
          </p>
          {!search && <button className="btn btn-accent" onClick={() => setModal({})}>Criar primeiro tutorial</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => {
            const catName    = catNameOf(t);
            const imgCount   = t.images?.length || 0;
            const firstThumb = t.images?.[0]?.imageUrl;
            return (
              <div key={t._id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  background: 'white', border: '1px solid var(--border)', borderRadius: 10,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  opacity: t.active ? 1 : 0.6,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(94,114,68,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>

                {/* Thumbnail */}
                <div style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {firstThumb
                    ? <img src={firstThumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <BookImage size={20} color="var(--text-muted)" />
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {t.title}
                    {!t.active && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(220,38,38,0.08)', color: 'var(--danger)', fontFamily: 'var(--font-mono)', border: '1px solid rgba(220,38,38,0.15)' }}>
                        INATIVO
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {catName ? (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(94,114,68,0.06)', color: 'var(--accent)', border: '1px solid rgba(94,114,68,0.2)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Layers size={9} /> {catName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                        sem categoria
                      </span>
                    )}
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Image size={9} /> {imgCount} {imgCount === 1 ? 'imagem' : 'imagens'}
                    </span>
                    {t.description && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                        {t.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ordem */}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0, background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  #{t.order}
                </span>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    title={t.active ? 'Desativar' : 'Ativar'}
                    onClick={() => handleToggleActive(t)}
                    style={{
                      background: t.active ? 'rgba(94,114,68,0.08)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${t.active ? 'rgba(94,114,68,0.2)' : 'var(--border)'}`,
                      color: t.active ? 'var(--accent)' : 'var(--text-muted)',
                      borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                    }}>
                    {t.active ? '● ON' : '○ OFF'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(t)}>
                    <Pencil size={13} style={{ marginRight: 4 }} />Editar
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--danger)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <TutorialModal
          tutorial={modal?._id ? modal : undefined}
          categorias={categorias}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
