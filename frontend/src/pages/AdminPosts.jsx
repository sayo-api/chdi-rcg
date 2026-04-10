import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp,
  Image, AlignLeft, LayoutList, Layers, Eye, EyeOff,
  Upload, RefreshCw, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, CheckCircle, AlertCircle, Loader,
} from 'lucide-react';
import api from '../utils/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_TYPES = [
  { value: 'text',        label: 'Texto',       icon: AlignLeft,  desc: 'Título, subtítulo e texto livre' },
  { value: 'media',       label: 'Mídia',        icon: Image,      desc: 'Imagem, vídeo, GIF ou WebP único' },
  { value: 'carousel',    label: 'Carrossel',    icon: LayoutList, desc: 'Várias mídias num único card' },
  { value: 'carousel_v2', label: 'Carrossel V2', icon: Layers,     desc: 'Imagem + texto por slide' },
];

const FILE_ACCEPT_MEDIA = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime';
const FILE_ACCEPT_ALL   = FILE_ACCEPT_MEDIA + ',.zip,.js,.ts,.docx,.doc,.pdf,.xlsx,.xls,.txt';

const TYPE_COLORS = {
  text: '#6b7280', media: '#3b82f6', carousel: '#8b5cf6', carousel_v2: '#f59e0b',
};

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function fileIcon(t) {
  if (t === 'zip') return '🗜️';
  if (t === 'js' || t === 'ts') return '📜';
  if (t === 'docx' || t === 'doc') return '📄';
  if (t === 'pdf') return '📕';
  if (t === 'xlsx' || t === 'xls') return '📊';
  return '📎';
}

function mediaTypeLabel(mt) {
  return { gif: 'GIF', webp: 'WebP', video: 'Vídeo', image: 'Imagem' }[mt] || 'Mídia';
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: t.type === 'success' ? 'var(--accent)' : '#ef4444',
          color: 'white', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-mono)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', minWidth: 260, maxWidth: 400,
          animation: 'toastIn 0.2s ease',
        }}>
          {t.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// ─── Carousel preview ─────────────────────────────────────────────────────────

function CarouselPreview({ items, v2 = false }) {
  const [idx, setIdx] = useState(0);
  if (!items?.length) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '20px 0' }}>
      Nenhum item ainda
    </div>
  );
  const item = items[Math.min(idx, items.length - 1)];
  return (
    <div>
      <div style={{ borderRadius: 8, overflow: 'hidden', background: 'var(--bg-primary)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.mediaType === 'video'
          ? <video src={item.url} style={{ maxWidth: '100%', maxHeight: '100%' }} controls />
          : <img src={item.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
      </div>
      {v2 && (item.title || item.text) && (
        <div style={{ padding: '10px 0 4px' }}>
          {item.title && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>}
          {item.text  && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</div>}
        </div>
      )}
      {items.length > 1 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', opacity: idx === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{idx + 1} / {items.length}</span>
            <button onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))} disabled={idx === items.length - 1}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', opacity: idx === items.length - 1 ? 0.3 : 1 }}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
            {items.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{
                width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
                background: i === idx ? 'var(--accent)' : 'var(--border)',
                cursor: 'pointer', transition: 'all 0.2s',
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Upload button ────────────────────────────────────────────────────────────

function UploadBtn({ label, accept, onFile, loading }) {
  const ref = useRef();
  return (
    <>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) { onFile(e.target.files[0]); ref.current.value = ''; } }} />
      <button onClick={() => ref.current.click()} disabled={loading} className="btn btn-secondary" style={{ gap: 6, fontSize: 12, padding: '7px 14px' }}>
        {loading ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Upload size={13} />}
        {label}
      </button>
    </>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', borderRadius: 6, padding: '8px 12px',
  fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Block({ children }) {
  return (
    <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function SectionTitle({ n, label }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
      {n}. {label}
    </div>
  );
}

// ─── Slide editor (Carousel V2) ───────────────────────────────────────────────

function SlideEditor({ index, item, onUpdate, onRemove }) {
  const [t,    setT]    = useState(item.title || '');
  const [tx,   setTx]   = useState(item.text  || '');
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 40, height: 30, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
          {item.mediaType === 'video'
            ? <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Slide {index + 1}{t ? ` — ${t}` : ''}
        </span>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 4 }}>
          <Trash2 size={13} />
        </button>
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </div>
      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ height: 8 }} />
          <input style={{ ...inputStyle, marginBottom: 8, fontSize: 12 }}
            value={t} onChange={e => setT(e.target.value)} placeholder="Título do slide..." />
          <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', marginBottom: 8, fontSize: 12 }}
            value={tx} onChange={e => setTx(e.target.value)} placeholder="Texto do slide..." />
          <button onClick={() => onUpdate(t, tx)} className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px', gap: 6 }}>
            <Save size={12} /> Salvar slide
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Post Modal ───────────────────────────────────────────────────────────────

function PostModal({ post, categories, onClose, onSaved, toast }) {
  const isNew = !post?._id;
  const [savedPost, setSavedPost] = useState(post || null);

  const [title,    setTitle]    = useState(post?.title    || '');
  const [subtitle, setSubtitle] = useState(post?.subtitle || '');
  const [type,     setType]     = useState(post?.type     || 'text');
  const [text,     setText]     = useState(post?.text     || '');
  const [readMore, setReadMore] = useState(post?.readMore || false);
  const [catId,    setCatId]    = useState(post?.category?._id || '');
  const [order,    setOrder]    = useState(post?.order ?? 0);
  const [active,   setActive]   = useState(post?.active !== false);

  const [savingMeta,        setSavingMeta]        = useState(false);
  const [uploadingMedia,    setUploadingMedia]     = useState(false);
  const [uploadingCarousel, setUploadingCarousel]  = useState(false);
  const [uploadingCV2,      setUploadingCV2]       = useState(false);
  const [uploadingAtt,      setUploadingAtt]       = useState(false);
  const [cv2Draft,          setCv2Draft]           = useState({ title: '', text: '' });

  const handleSaveMeta = async () => {
    if (!title.trim()) return toast('Título obrigatório', 'error');
    setSavingMeta(true);
    try {
      const payload = { title, subtitle, type, text, readMore, categoryId: catId || null, order, active };
      if (isNew) {
        const res = await api.post('/posts', payload);
        setSavedPost(res.data.post);
        onSaved(res.data.post);
        toast('Post criado! Adicione mídias ou finalize.');
      } else {
        const res = await api.put(`/posts/${savedPost._id}`, payload);
        setSavedPost(res.data.post);
        onSaved(res.data.post);
        toast('Post atualizado!');
      }
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
    setSavingMeta(false);
  };

  const handleMediaUpload = async (file) => {
    setUploadingMedia(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post(`/posts/${savedPost._id}/media`, fd);
      setSavedPost(res.data.post); onSaved(res.data.post); toast('Mídia enviada!');
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
    setUploadingMedia(false);
  };

  const handleCarouselUpload = async (file) => {
    setUploadingCarousel(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post(`/posts/${savedPost._id}/carousel`, fd);
      setSavedPost(res.data.post); onSaved(res.data.post); toast('Item adicionado!');
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
    setUploadingCarousel(false);
  };

  const handleRemoveCarousel = async (idx) => {
    if (!confirm('Remover este item?')) return;
    try {
      const res = await api.delete(`/posts/${savedPost._id}/carousel/${idx}`);
      setSavedPost(res.data.post); onSaved(res.data.post); toast('Item removido.');
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
  };

  const handleCV2Upload = async (file) => {
    setUploadingCV2(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', cv2Draft.title);
      fd.append('text',  cv2Draft.text);
      const res = await api.post(`/posts/${savedPost._id}/carousel-v2`, fd);
      setSavedPost(res.data.post); onSaved(res.data.post);
      setCv2Draft({ title: '', text: '' }); toast('Slide adicionado!');
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
    setUploadingCV2(false);
  };

  const handleUpdateCV2 = async (idx, t, tx) => {
    try {
      const res = await api.put(`/posts/${savedPost._id}/carousel-v2/${idx}`, { title: t, text: tx });
      setSavedPost(res.data.post); onSaved(res.data.post); toast('Slide atualizado!');
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
  };

  const handleRemoveCV2 = async (idx) => {
    if (!confirm('Remover este slide?')) return;
    try {
      const res = await api.delete(`/posts/${savedPost._id}/carousel-v2/${idx}`);
      setSavedPost(res.data.post); onSaved(res.data.post); toast('Slide removido.');
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
  };

  const handleAttachmentUpload = async (file) => {
    setUploadingAtt(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post(`/posts/${savedPost._id}/attachments`, fd);
      setSavedPost(res.data.post); onSaved(res.data.post); toast('Anexo adicionado!');
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
    setUploadingAtt(false);
  };

  const handleRemoveAttachment = async (idx) => {
    if (!confirm('Remover este anexo?')) return;
    try {
      const res = await api.delete(`/posts/${savedPost._id}/attachments/${idx}`);
      setSavedPost(res.data.post); onSaved(res.data.post); toast('Anexo removido.');
    } catch (e) { toast(e.response?.data?.error || e.message, 'error'); }
  };

  const TypeBtn = ({ ct }) => (
    <button onClick={() => setType(ct.value)} style={{
      flex: 1, padding: '10px 6px', borderRadius: 8, cursor: 'pointer',
      border: `2px solid ${type === ct.value ? 'var(--accent)' : 'var(--border)'}`,
      background: type === ct.value ? 'rgba(94,114,68,0.15)' : 'var(--bg-secondary)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.15s',
    }}>
      <ct.icon size={17} color={type === ct.value ? 'var(--accent)' : 'var(--text-muted)'} />
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: type === ct.value ? 'var(--accent)' : 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2 }}>
        {ct.label}
      </span>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.05em' }}>
              {isNew ? 'NOVO POST' : 'EDITAR POST'}
            </div>
            {savedPost && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                Tipo: {savedPost.type?.toUpperCase()} · ID: {savedPost._id?.slice(-8)}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>

          {/* ── 1. Meta ── */}
          <Block>
            <SectionTitle n="1" label="INFORMAÇÕES DO POST" />
            <Field label="Tipo de Card" required>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {CARD_TYPES.map(ct => <TypeBtn key={ct.value} ct={ct} />)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {CARD_TYPES.find(c => c.value === type)?.desc}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Título" required>
                <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do card..." />
              </Field>
              <Field label="Subtítulo">
                <input style={inputStyle} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subtítulo opcional..." />
              </Field>
            </div>

            {(type === 'text' || type === 'media' || type === 'carousel' || type === 'carousel_v2') && (
              <Field label="Texto do Card">
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  value={text} onChange={e => setText(e.target.value)} placeholder="Texto exibido no card..." />
                <button onClick={() => setReadMore(r => !r)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0, fontSize: 12, fontFamily: 'var(--font-mono)', color: readMore ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {readMore ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  Ativar "Ler mais" para textos longos
                </button>
              </Field>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Categoria">
                <select style={inputStyle} value={catId} onChange={e => setCatId(e.target.value)}>
                  <option value="">Sem categoria</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Ordem">
                <input style={inputStyle} type="number" value={order} onChange={e => setOrder(e.target.value)} />
              </Field>
              <Field label="Status">
                <button onClick={() => setActive(a => !a)} style={{
                  ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  background: active ? 'rgba(94,114,68,0.2)' : 'rgba(239,68,68,0.1)',
                  borderColor: active ? 'var(--accent)' : '#ef4444',
                  color: active ? 'var(--accent)' : '#ef4444', fontFamily: 'var(--font-mono)', fontSize: 12,
                }}>
                  {active ? <Eye size={14} /> : <EyeOff size={14} />}
                  {active ? 'Visível' : 'Oculto'}
                </button>
              </Field>
            </div>

            <button onClick={handleSaveMeta} disabled={savingMeta} className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              {savingMeta ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />}
              {isNew && !savedPost ? 'Criar Post e Continuar →' : 'Salvar Alterações'}
            </button>
          </Block>

          {/* ── 2. Mídia (só após criar) ── */}
          {savedPost && (
            <>
              {savedPost.type === 'media' && (
                <Block>
                  <SectionTitle n="2" label="MÍDIA DO CARD (imagem / vídeo / GIF / WebP)" />
                  {savedPost.mediaUrl ? (
                    <div style={{ marginBottom: 12 }}>
                      {savedPost.mediaType === 'video'
                        ? <video src={savedPost.mediaUrl} controls style={{ maxWidth: '100%', borderRadius: 8 }} />
                        : <img src={savedPost.mediaUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 280, objectFit: 'contain' }} />}
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 6 }}>
                        Tipo: {mediaTypeLabel(savedPost.mediaType)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 24, background: 'var(--bg-secondary)', borderRadius: 8, border: '2px dashed var(--border)', marginBottom: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                      <Image size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
                      Nenhuma mídia enviada
                    </div>
                  )}
                  <UploadBtn label={savedPost.mediaUrl ? 'Substituir Mídia' : 'Enviar Mídia'}
                    accept={FILE_ACCEPT_MEDIA} onFile={handleMediaUpload} loading={uploadingMedia} />
                </Block>
              )}

              {savedPost.type === 'carousel' && (
                <Block>
                  <SectionTitle n="2" label="ITENS DO CARROSSEL" />
                  {savedPost.carouselItems?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <CarouselPreview items={savedPost.carouselItems} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {savedPost.carouselItems.map((item, i) => (
                          <div key={i} style={{ position: 'relative', width: 76, height: 56, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            {item.mediaType === 'video'
                              ? <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                            <button onClick={() => handleRemoveCarousel(i)}
                              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4, cursor: 'pointer', padding: 2, display: 'flex' }}>
                              <X size={11} color="white" />
                            </button>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', fontSize: 9, color: 'white', textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '2px 0' }}>
                              {i + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <UploadBtn label="Adicionar Item" accept={FILE_ACCEPT_MEDIA} onFile={handleCarouselUpload} loading={uploadingCarousel} />
                </Block>
              )}

              {savedPost.type === 'carousel_v2' && (
                <Block>
                  <SectionTitle n="2" label="SLIDES DO CARROSSEL V2 (imagem + texto por slide)" />
                  {savedPost.carouselV2Items?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <CarouselPreview items={savedPost.carouselV2Items} v2 />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        {savedPost.carouselV2Items.map((item, i) => (
                          <SlideEditor key={i} index={i} item={item}
                            onUpdate={(t, tx) => handleUpdateCV2(i, t, tx)}
                            onRemove={() => handleRemoveCV2(i)} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, border: '1px dashed var(--border)', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>+ Novo Slide</div>
                    <input style={{ ...inputStyle, marginBottom: 8, fontSize: 12 }}
                      value={cv2Draft.title} onChange={e => setCv2Draft(d => ({ ...d, title: e.target.value }))}
                      placeholder="Título do slide..." />
                    <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', marginBottom: 10, fontSize: 12 }}
                      value={cv2Draft.text} onChange={e => setCv2Draft(d => ({ ...d, text: e.target.value }))}
                      placeholder="Texto do slide..." />
                    <UploadBtn label="Adicionar Slide" accept={FILE_ACCEPT_MEDIA} onFile={handleCV2Upload} loading={uploadingCV2} />
                  </div>
                </Block>
              )}

              {/* Anexos */}
              <Block>
                <SectionTitle n="3" label="ANEXOS (ZIP, JS, DOCX, PDF…) — Opcional" />
                {savedPost.attachments?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {savedPost.attachments.map((att, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 18 }}>{fileIcon(att.fileType)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {att.fileType?.toUpperCase()} · {fmtSize(att.size)}
                          </div>
                        </div>
                        <a href={att.url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', textDecoration: 'none', flexShrink: 0 }}>
                          Download
                        </a>
                        <button onClick={() => handleRemoveAttachment(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <UploadBtn label="Anexar Arquivo" accept={FILE_ACCEPT_ALL} onFile={handleAttachmentUpload} loading={uploadingAtt} />
              </Block>

              <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                <CheckCircle size={14} /> Concluir e Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Post card (list item) ────────────────────────────────────────────────────

function PostCard({ post, onEdit, onDelete, onToggle }) {
  const typeInfo = CARD_TYPES.find(c => c.value === post.type);
  const thumb = post.mediaUrl || post.carouselItems?.[0]?.url || post.carouselV2Items?.[0]?.url;

  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: 10,
      border: `1px solid ${post.active ? 'var(--border)' : 'rgba(239,68,68,0.3)'}`,
      overflow: 'hidden', opacity: post.active ? 1 : 0.72, transition: 'all 0.2s', display: 'flex',
    }}>
      <div style={{ width: 80, background: 'var(--bg-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {thumb ? (
          post.mediaType === 'video' || post.carouselItems?.[0]?.mediaType === 'video'
            ? <video src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>{typeInfo && <typeInfo.icon size={22} />}</div>
        )}
      </div>

      <div style={{ flex: 1, padding: '11px 14px', minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
        {post.subtitle && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.subtitle}</div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10,
            background: TYPE_COLORS[post.type] + '20', color: TYPE_COLORS[post.type], border: `1px solid ${TYPE_COLORS[post.type]}40` }}>
            {typeInfo?.label}
          </span>
          {!post.active && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>OCULTO</span>}
          {post.readMore && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: 'rgba(94,114,68,0.1)', color: 'var(--accent)', border: '1px solid rgba(94,114,68,0.3)' }}>LER MAIS</span>}
          {post.carouselItems?.length > 0 && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{post.carouselItems.length} itens</span>}
          {post.carouselV2Items?.length > 0 && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{post.carouselV2Items.length} slides</span>}
          {post.attachments?.length > 0 && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>📎 {post.attachments.length}</span>}
          {post.category && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{post.category.name}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
        {[
          { Icon: Edit2,                             color: 'var(--accent)',    fn: onEdit,   border: true },
          { Icon: post.active ? EyeOff : Eye,        color: post.active ? 'var(--text-muted)' : 'var(--accent)', fn: onToggle, border: true },
          { Icon: Trash2,                            color: '#ef4444',          fn: onDelete, border: false },
        ].map(({ Icon, color, fn, border }, i) => (
          <button key={i} onClick={fn} style={{ flex: 1, padding: '0 14px', background: 'none', border: 'none', borderBottom: border ? '1px solid var(--border)' : 'none', cursor: 'pointer', color, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPosts() {
  const [posts,           setPosts]           = useState([]);
  const [categories,      setCategories]      = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState('');
  const [filterType,      setFilterType]      = useState('');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [modalPost,       setModalPost]       = useState(undefined);
  const { toasts, show } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, cr] = await Promise.all([
        api.get('/posts/admin/all'),
        api.get('/categories/admin/list'),
      ]);
      setPosts(pr.data.posts || []);
      setCategories(cr.data.categories || []);
    } catch { show('Erro ao carregar dados', 'error'); }
    setLoading(false);
  }, [show]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (post) => {
    if (!confirm(`Excluir "${post.title}"? Não pode ser desfeito.`)) return;
    try {
      await api.delete(`/posts/${post._id}`);
      setPosts(p => p.filter(x => x._id !== post._id));
      show('Post excluído.');
    } catch (e) { show(e.response?.data?.error || 'Erro ao excluir.', 'error'); }
  };

  const handleToggle = async (post) => {
    try {
      const res = await api.put(`/posts/${post._id}`, { active: !post.active });
      setPosts(p => p.map(x => x._id === post._id ? res.data.post : x));
      show(res.data.post.active ? 'Post visível no app.' : 'Post ocultado do app.');
    } catch (e) { show(e.response?.data?.error || 'Erro.', 'error'); }
  };

  const handleSaved = (updated) => {
    setPosts(p => {
      const exists = p.find(x => x._id === updated._id);
      return exists ? p.map(x => x._id === updated._id ? updated : x) : [updated, ...p];
    });
  };

  const filtered = posts.filter(p => {
    const s = search.toLowerCase();
    return (!search || p.title.toLowerCase().includes(s) || p.subtitle?.toLowerCase().includes(s))
      && (!filterType || p.type === filterType);
  });

  // Agrupamento por categoria para visualização "múltiplos cards por categoria"
  const groupedByCategory = React.useMemo(() => {
    const groups = [];
    const catMap = {};
    filtered.forEach(p => {
      const catId   = p.category?._id  || '__sem_categoria__';
      const catName = p.category?.name || 'Sem Categoria';
      if (!catMap[catId]) { catMap[catId] = { catId, catName, posts: [] }; groups.push(catMap[catId]); }
      catMap[catId].posts.push(p);
    });
    return groups.sort((a, b) => {
      if (a.catId === '__sem_categoria__') return 1;
      if (b.catId === '__sem_categoria__') return -1;
      return a.catName.localeCompare(b.catName);
    });
  }, [filtered]);

  const stats = {
    total:    posts.length,
    active:   posts.filter(p => p.active).length,
    text:     posts.filter(p => p.type === 'text').length,
    media:    posts.filter(p => p.type === 'media').length,
    carousel: posts.filter(p => p.type === 'carousel').length,
    cv2:      posts.filter(p => p.type === 'carousel_v2').length,
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <Toast toasts={toasts} />

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.08em', margin: 0 }}>
              POSTS <span style={{ color: 'var(--accent)' }}>DO APP</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Cards de conteúdo exibidos no aplicativo mobile
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setGroupByCategory(g => !g)} className={groupByCategory ? 'btn btn-primary' : 'btn btn-ghost'}
              title="Agrupar por Categoria" style={{ gap: 6, fontSize: 12 }}>
              <Layers size={14} /> {groupByCategory ? 'Por Categoria' : 'Agrupar'}
            </button>
            <button onClick={fetchAll} className="btn btn-ghost" title="Recarregar" style={{ gap: 6 }}>
              <RefreshCw size={14} />
            </button>
            <button onClick={() => setModalPost(null)} className="btn btn-primary" style={{ gap: 6 }}>
              <Plus size={14} /> Novo Post
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',        value: stats.total,    color: 'var(--text-primary)' },
            { label: 'Visíveis',     value: stats.active,   color: 'var(--accent)' },
            { label: 'Texto',        value: stats.text,     color: '#6b7280' },
            { label: 'Mídia',        value: stats.media,    color: '#3b82f6' },
            { label: 'Carrossel',    value: stats.carousel, color: '#8b5cf6' },
            { label: 'Carrossel V2', value: stats.cv2,      color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: s.color }}>{s.value}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar posts..."
          style={{ flex: 1, minWidth: 180, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="">Todos os tipos</option>
          {CARD_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <Loader size={24} style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto 12px' }} />
          Carregando posts...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
            {search || filterType ? 'Nenhum post encontrado com esses filtros.' : 'Nenhum post criado ainda.'}
          </div>
          {!search && !filterType && (
            <button onClick={() => setModalPost(null)} className="btn btn-primary" style={{ marginTop: 16, gap: 6 }}>
              <Plus size={14} /> Criar primeiro post
            </button>
          )}
        </div>
      ) : groupByCategory ? (
        /* ── Vista agrupada por categoria ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedByCategory.map(group => (
            <div key={group.catId}>
              {/* Cabeçalho da categoria */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 10, paddingBottom: 8,
                borderBottom: '2px solid var(--accent)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: group.catId === '__sem_categoria__' ? 'var(--text-muted)' : 'var(--accent)',
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em' }}>
                  {group.catName}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '2px 8px', marginLeft: 4 }}>
                  {group.posts.length} card{group.posts.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Posts desta categoria */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 18 }}>
                {group.posts.map(post => (
                  <PostCard key={post._id} post={post}
                    onEdit={() => setModalPost(post)}
                    onDelete={() => handleDelete(post)}
                    onToggle={() => handleToggle(post)} />
                ))}
              </div>
            </div>
          ))}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
            {filtered.length} post{filtered.length !== 1 ? 's' : ''} em {groupedByCategory.length} categoria{groupedByCategory.length !== 1 ? 's' : ''}
          </div>
        </div>
      ) : (
        /* ── Vista flat padrão ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(post => (
            <PostCard key={post._id} post={post}
              onEdit={() => setModalPost(post)}
              onDelete={() => handleDelete(post)}
              onToggle={() => handleToggle(post)} />
          ))}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
            {filtered.length} post{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== posts.length && ` de ${posts.length}`}
          </div>
        </div>
      )}

      {modalPost !== undefined && (
        <PostModal
          post={modalPost}
          categories={categories}
          onClose={() => { setModalPost(undefined); fetchAll(); }}
          onSaved={handleSaved}
          toast={show}
        />
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes toastIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
