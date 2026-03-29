import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp,
  Image, Video, FileText, LayoutList, Layers, ArrowUpDown,
  Eye, EyeOff, Upload, File, Paperclip, RefreshCw, ChevronLeft,
  ChevronRight, AlignLeft, ToggleLeft, ToggleRight, CheckCircle,
  AlertCircle, Loader,
} from 'lucide-react';
import { API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_TYPES = [
  { value: 'text',        label: 'Texto',          icon: AlignLeft,   desc: 'Título, subtítulo e texto livre' },
  { value: 'media',       label: 'Mídia',           icon: Image,       desc: 'Imagem, vídeo, GIF ou WebP único' },
  { value: 'carousel',    label: 'Carrossel',       icon: LayoutList,  desc: 'Várias imagens num único card' },
  { value: 'carousel_v2', label: 'Carrossel V2',    icon: Layers,      desc: 'Imagem + texto por slide' },
];

const FILE_ACCEPT_MEDIA = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime';
const FILE_ACCEPT_DOC   = '.zip,.js,.ts,.docx,.doc,.pdf,.xlsx,.xls,.txt';
const FILE_ACCEPT_ALL   = FILE_ACCEPT_MEDIA + ',' + FILE_ACCEPT_DOC;

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileIcon(fileType) {
  if (['zip'].includes(fileType)) return '🗜️';
  if (['js','ts'].includes(fileType)) return '📜';
  if (['docx','doc'].includes(fileType)) return '📄';
  if (['pdf'].includes(fileType)) return '📕';
  if (['xlsx','xls'].includes(fileType)) return '📊';
  return '📎';
}

function mediaTypeLabel(mt) {
  if (mt === 'gif') return 'GIF';
  if (mt === 'webp') return 'WebP';
  if (mt === 'video') return 'Vídeo';
  return 'Imagem';
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: t.type === 'success' ? 'var(--accent)' : 'var(--danger)',
          color: 'white', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-mono)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', minWidth: 280, maxWidth: 400,
          animation: 'slideInRight 0.2s ease',
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
  if (!items?.length) return <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>Nenhum item ainda</div>;
  const item = items[idx];
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ borderRadius: 8, overflow: 'hidden', background: 'var(--bg-primary)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.mediaType === 'video' ? (
          <video src={item.url} style={{ maxWidth: '100%', maxHeight: '100%' }} controls />
        ) : (
          <img src={item.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
      </div>
      {v2 && (item.title || item.text) && (
        <div style={{ padding: '10px 0 4px' }}>
          {item.title && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>}
          {item.text  && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</div>}
        </div>
      )}
      {items.length > 1 && (
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
      )}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
        {items.map((_, i) => (
          <div key={i} onClick={() => setIdx(i)} style={{
            width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
            background: i === idx ? 'var(--accent)' : 'var(--border)',
            cursor: 'pointer', transition: 'all 0.2s',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Upload button helper ─────────────────────────────────────────────────────

function UploadBtn({ label, accept, onFile, loading, small }) {
  const ref = useRef();
  return (
    <>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) { onFile(e.target.files[0]); ref.current.value = ''; } }} />
      <button onClick={() => ref.current.click()} disabled={loading}
        className="btn btn-secondary"
        style={{ gap: 6, fontSize: small ? 11 : 12, padding: small ? '5px 10px' : '7px 14px' }}>
        {loading ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Upload size={13} />}
        {label}
      </button>
    </>
  );
}

// ─── Form field helper ────────────────────────────────────────────────────────

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Post Form Modal ──────────────────────────────────────────────────────────

function PostModal({ post, categories, onClose, onSaved, toast }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  const isNew = !post?._id;
  const [step, setStep] = useState(isNew ? 'meta' : 'edit'); // meta → edit
  const [savedPost, setSavedPost] = useState(post || null);

  // Meta fields
  const [title,    setTitle]    = useState(post?.title    || '');
  const [subtitle, setSubtitle] = useState(post?.subtitle || '');
  const [type,     setType]     = useState(post?.type     || 'text');
  const [text,     setText]     = useState(post?.text     || '');
  const [readMore, setReadMore] = useState(post?.readMore || false);
  const [catId,    setCatId]    = useState(post?.category?._id || '');
  const [order,    setOrder]    = useState(post?.order ?? 0);
  const [active,   setActive]   = useState(post?.active !== false);

  // Upload states
  const [uploadingMedia,   setUploadingMedia]   = useState(false);
  const [uploadingCarousel,setUploadingCarousel]= useState(false);
  const [uploadingCV2,     setUploadingCV2]     = useState(false);
  const [uploadingAtt,     setUploadingAtt]     = useState(false);
  const [savingMeta,       setSavingMeta]       = useState(false);

  // CV2 slide text fields
  const [cv2Draft, setCv2Draft] = useState({ title: '', text: '' });

  const working = savedPost;

  const api = useCallback(async (method, path, body, isForm = false) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (!isForm) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isForm ? body : (body ? JSON.stringify(body) : undefined),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  }, [token]);

  // Step 1: create or update meta
  const handleSaveMeta = async () => {
    if (!title.trim()) return toast('Título obrigatório', 'error');
    setSavingMeta(true);
    try {
      const payload = { title, subtitle, type, text, readMore, categoryId: catId || null, order, active };
      let data;
      if (isNew) {
        data = await api('POST', '/api/posts', payload);
        setSavedPost(data.post);
        setStep('edit');
        toast('Post criado! Agora adicione mídias ou finalize.');
      } else {
        data = await api('PUT', `/api/posts/${savedPost._id}`, payload);
        setSavedPost(data.post);
        toast('Post atualizado!');
        onSaved(data.post);
      }
    } catch (e) { toast(e.message, 'error'); }
    setSavingMeta(false);
  };

  // Media upload (type=media)
  const handleMediaUpload = async (file) => {
    setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await api('POST', `/api/posts/${savedPost._id}/media`, fd, true);
      setSavedPost(data.post);
      onSaved(data.post);
      toast('Mídia enviada!');
    } catch (e) { toast(e.message, 'error'); }
    setUploadingMedia(false);
  };

  // Carousel item upload
  const handleCarouselUpload = async (file) => {
    setUploadingCarousel(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await api('POST', `/api/posts/${savedPost._id}/carousel`, fd, true);
      setSavedPost(data.post);
      onSaved(data.post);
      toast('Item adicionado ao carrossel!');
    } catch (e) { toast(e.message, 'error'); }
    setUploadingCarousel(false);
  };

  const handleRemoveCarousel = async (idx) => {
    if (!confirm('Remover este item?')) return;
    try {
      const data = await api('DELETE', `/api/posts/${savedPost._id}/carousel/${idx}`);
      setSavedPost(data.post);
      onSaved(data.post);
      toast('Item removido.');
    } catch (e) { toast(e.message, 'error'); }
  };

  // Carousel V2
  const handleCV2Upload = async (file) => {
    setUploadingCV2(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', cv2Draft.title);
      fd.append('text',  cv2Draft.text);
      const data = await api('POST', `/api/posts/${savedPost._id}/carousel-v2`, fd, true);
      setSavedPost(data.post);
      onSaved(data.post);
      setCv2Draft({ title: '', text: '' });
      toast('Slide adicionado!');
    } catch (e) { toast(e.message, 'error'); }
    setUploadingCV2(false);
  };

  const handleUpdateCV2 = async (idx, t, tx) => {
    try {
      const data = await api('PUT', `/api/posts/${savedPost._id}/carousel-v2/${idx}`, { title: t, text: tx });
      setSavedPost(data.post);
      onSaved(data.post);
      toast('Slide atualizado!');
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleRemoveCV2 = async (idx) => {
    if (!confirm('Remover este slide?')) return;
    try {
      const data = await api('DELETE', `/api/posts/${savedPost._id}/carousel-v2/${idx}`);
      setSavedPost(data.post);
      onSaved(data.post);
      toast('Slide removido.');
    } catch (e) { toast(e.message, 'error'); }
  };

  // Attachments
  const handleAttachmentUpload = async (file) => {
    setUploadingAtt(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await api('POST', `/api/posts/${savedPost._id}/attachments`, fd, true);
      setSavedPost(data.post);
      onSaved(data.post);
      toast('Anexo adicionado!');
    } catch (e) { toast(e.message, 'error'); }
    setUploadingAtt(false);
  };

  const handleRemoveAttachment = async (idx) => {
    if (!confirm('Remover este anexo?')) return;
    try {
      const data = await api('DELETE', `/api/posts/${savedPost._id}/attachments/${idx}`);
      setSavedPost(data.post);
      onSaved(data.post);
      toast('Anexo removido.');
    } catch (e) { toast(e.message, 'error'); }
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 6, padding: '8px 12px',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };

  const CardTypeBtn = ({ ct }) => (
    <button onClick={() => setType(ct.value)}
      style={{
        flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
        border: `2px solid ${type === ct.value ? 'var(--accent)' : 'var(--border)'}`,
        background: type === ct.value ? 'rgba(94,114,68,0.15)' : 'var(--bg-secondary)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.15s',
      }}>
      <ct.icon size={18} color={type === ct.value ? 'var(--accent)' : 'var(--text-muted)'} />
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: type === ct.value ? 'var(--accent)' : 'var(--text-secondary)', textAlign: 'center' }}>{ct.label}</span>
    </button>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)',
        width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.05em' }}>
              {isNew ? 'NOVO POST' : 'EDITAR POST'}
            </div>
            {savedPost && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                ID: {savedPost._id} · Tipo: {savedPost.type?.toUpperCase()}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>

          {/* ── STEP 1: Meta info ─────────────────────────────── */}
          <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
              1. INFORMAÇÕES DO POST
            </div>

            <Field label="Tipo de Card" required>
              <div style={{ display: 'flex', gap: 6 }}>
                {CARD_TYPES.map(ct => <CardTypeBtn key={ct.value} ct={ct} />)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
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

            {(type === 'text' || type === 'media') && (
              <Field label="Texto do Card">
                <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                  value={text} onChange={e => setText(e.target.value)}
                  placeholder="Texto que aparece no card..." />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <button onClick={() => setReadMore(r => !r)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: readMore ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: 0 }}>
                    {readMore ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    Ativar "Ler mais" (para textos longos)
                  </button>
                </div>
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
                <button onClick={() => setActive(a => !a)}
                  style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                    background: active ? 'rgba(94,114,68,0.2)' : 'rgba(239,68,68,0.1)',
                    borderColor: active ? 'var(--accent)' : 'var(--danger)',
                    color: active ? 'var(--accent)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {active ? <Eye size={14} /> : <EyeOff size={14} />}
                  {active ? 'Visível' : 'Oculto'}
                </button>
              </Field>
            </div>

            <button onClick={handleSaveMeta} disabled={savingMeta} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
              {savingMeta ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />}
              {isNew ? (step === 'meta' ? 'Criar Post e Continuar →' : 'Salvar Alterações') : 'Salvar Alterações'}
            </button>
          </div>

          {/* ── STEP 2: Media upload (only after post is saved) ── */}
          {working && (
            <>
              {/* Media card */}
              {savedPost.type === 'media' && (
                <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
                    2. MÍDIA DO CARD (imagem / vídeo / GIF / WebP)
                  </div>
                  {savedPost.mediaUrl ? (
                    <div style={{ marginBottom: 12 }}>
                      {savedPost.mediaType === 'video' ? (
                        <video src={savedPost.mediaUrl} controls style={{ maxWidth: '100%', borderRadius: 8 }} />
                      ) : (
                        <img src={savedPost.mediaUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'contain' }} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          Tipo: {mediaTypeLabel(savedPost.mediaType)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-secondary)', borderRadius: 8, border: '2px dashed var(--border)', marginBottom: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                      <Image size={24} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                      Nenhuma mídia enviada ainda
                    </div>
                  )}
                  <UploadBtn label={savedPost.mediaUrl ? 'Substituir Mídia' : 'Enviar Mídia'}
                    accept={FILE_ACCEPT_MEDIA} onFile={handleMediaUpload} loading={uploadingMedia} />
                </div>
              )}

              {/* Carousel */}
              {savedPost.type === 'carousel' && (
                <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
                    2. ITENS DO CARROSSEL
                  </div>
                  {savedPost.carouselItems?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <CarouselPreview items={savedPost.carouselItems} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {savedPost.carouselItems.map((item, i) => (
                          <div key={i} style={{ position: 'relative', width: 80, height: 60, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            {item.mediaType === 'video' ? (
                              <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            <button onClick={() => handleRemoveCarousel(i)}
                              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4, cursor: 'pointer', padding: 2, display: 'flex' }}>
                              <X size={12} color="white" />
                            </button>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', fontSize: 9, color: 'white', textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '2px 0' }}>
                              {i + 1} · {mediaTypeLabel(item.mediaType)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <UploadBtn label="Adicionar Item ao Carrossel"
                    accept={FILE_ACCEPT_MEDIA} onFile={handleCarouselUpload} loading={uploadingCarousel} />
                </div>
              )}

              {/* Carousel V2 */}
              {savedPost.type === 'carousel_v2' && (
                <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
                    2. SLIDES DO CARROSSEL V2 (imagem + texto por slide)
                  </div>
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
                  {/* Draft for new slide */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, border: '1px dashed var(--border)', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>Novo Slide</div>
                    <input style={{ ...inputStyle, marginBottom: 8 }}
                      value={cv2Draft.title} onChange={e => setCv2Draft(d => ({ ...d, title: e.target.value }))}
                      placeholder="Título do slide..." />
                    <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                      value={cv2Draft.text} onChange={e => setCv2Draft(d => ({ ...d, text: e.target.value }))}
                      placeholder="Texto do slide..." />
                    <div style={{ marginTop: 8 }}>
                      <UploadBtn label="Adicionar Slide com Imagem/Vídeo"
                        accept={FILE_ACCEPT_MEDIA} onFile={handleCV2Upload} loading={uploadingCV2} />
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments — always visible */}
              <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
                  3. ANEXOS (ZIP, JS, DOCX, PDF, etc.) — Opcional
                </div>
                {savedPost.attachments?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {savedPost.attachments.map((att, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 18 }}>{fileIcon(att.fileType)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{att.fileType?.toUpperCase()} · {fmtSize(att.size)}</div>
                        </div>
                        <a href={att.url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', textDecoration: 'none' }}>
                          Download
                        </a>
                        <button onClick={() => handleRemoveAttachment(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <UploadBtn label="Anexar Arquivo"
                  accept={FILE_ACCEPT_ALL} onFile={handleAttachmentUpload} loading={uploadingAtt} />
              </div>

              {/* Done */}
              <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                <CheckCircle size={14} />
                Concluir e Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Slide editor (inline for CV2) ───────────────────────────────────────────

function SlideEditor({ index, item, onUpdate, onRemove }) {
  const [t, setT] = useState(item.title || '');
  const [tx, setTx] = useState(item.text || '');
  const [open, setOpen] = useState(false);

  const inputStyle = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 6, padding: '6px 10px',
    fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 6,
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 40, height: 30, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
          {item.mediaType === 'video'
            ? <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Slide {index + 1}{t ? ` — ${t}` : ''}
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 4 }}>
          <Trash2 size={13} />
        </button>
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </div>
      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ height: 8 }} />
          <input style={inputStyle} value={t} onChange={e => setT(e.target.value)} placeholder="Título do slide..." />
          <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', marginBottom: 8 }}
            value={tx} onChange={e => setTx(e.target.value)} placeholder="Texto do slide..." />
          <button onClick={() => onUpdate(t, tx)} className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px', gap: 6 }}>
            <Save size={12} /> Salvar Slide
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Post Card (list item) ────────────────────────────────────────────────────

function PostCard({ post, onEdit, onDelete, onToggle }) {
  const typeInfo = CARD_TYPES.find(c => c.value === post.type);

  const typeColors = {
    text:        '#6b7280',
    media:       '#3b82f6',
    carousel:    '#8b5cf6',
    carousel_v2: '#f59e0b',
  };

  const thumb = post.mediaUrl || post.carouselItems?.[0]?.url || post.carouselV2Items?.[0]?.url;

  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: 10, border: `1px solid ${post.active ? 'var(--border)' : 'rgba(239,68,68,0.3)'}`,
      overflow: 'hidden', opacity: post.active ? 1 : 0.7, transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Thumb */}
        <div style={{ width: 80, minHeight: 80, background: 'var(--bg-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {thumb ? (
            post.mediaType === 'video' || post.carouselItems?.[0]?.mediaType === 'video' ? (
              <video src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )
          ) : (
            <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {typeInfo && <typeInfo.icon size={20} />}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
              {post.subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.subtitle}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10,
              background: typeColors[post.type] + '20', color: typeColors[post.type], border: `1px solid ${typeColors[post.type]}40` }}>
              {typeInfo?.label}
            </span>
            {!post.active && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
                OCULTO
              </span>
            )}
            {post.readMore && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: 'rgba(94,114,68,0.1)', color: 'var(--accent)', border: '1px solid rgba(94,114,68,0.3)' }}>
                LER MAIS
              </span>
            )}
            {post.carouselItems?.length > 0 && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{post.carouselItems.length} itens</span>
            )}
            {post.carouselV2Items?.length > 0 && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{post.carouselV2Items.length} slides</span>
            )}
            {post.attachments?.length > 0 && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>📎 {post.attachments.length} anexo(s)</span>
            )}
            {post.category && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{post.category.name}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', justifyContent: 'center' }}>
          <button onClick={onEdit} title="Editar"
            style={{ padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={onToggle} title={post.active ? 'Ocultar' : 'Mostrar'}
            style={{ padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: post.active ? 'var(--text-muted)' : 'var(--accent)', display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {post.active ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={onDelete} title="Excluir"
            style={{ padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPosts() {
  const token = localStorage.getItem('token');
  const [posts,      setPosts]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalPost,  setModalPost]  = useState(undefined); // undefined=closed, null=new, post=edit
  const { toasts, show } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, cr] = await Promise.all([
        fetch(`${API_URL}/api/posts/admin/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/categories`,      { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const pd = await pr.json();
      const cd = await cr.json();
      setPosts(pd.posts || []);
      setCategories(cd.categories || []);
    } catch {
      show('Erro ao carregar dados', 'error');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (post) => {
    if (!confirm(`Excluir "${post.title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await fetch(`${API_URL}/api/posts/${post._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(p => p.filter(x => x._id !== post._id));
      show('Post excluído.');
    } catch { show('Erro ao excluir.', 'error'); }
  };

  const handleToggle = async (post) => {
    try {
      const res = await fetch(`${API_URL}/api/posts/${post._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !post.active }),
      });
      const data = await res.json();
      setPosts(p => p.map(x => x._id === post._id ? data.post : x));
      show(data.post.active ? 'Post visível no app.' : 'Post ocultado do app.');
    } catch { show('Erro.', 'error'); }
  };

  const handleSaved = (updatedPost) => {
    setPosts(p => {
      const exists = p.find(x => x._id === updatedPost._id);
      return exists ? p.map(x => x._id === updatedPost._id ? updatedPost : x) : [updatedPost, ...p];
    });
  };

  const filtered = posts.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.subtitle?.toLowerCase().includes(search.toLowerCase());
    const matchType   = !filterType || p.type === filterType;
    return matchSearch && matchType;
  });

  const stats = {
    total:    posts.length,
    active:   posts.filter(p => p.active).length,
    text:     posts.filter(p => p.type === 'text').length,
    media:    posts.filter(p => p.type === 'media').length,
    carousel: posts.filter(p => p.type === 'carousel').length,
    cv2:      posts.filter(p => p.type === 'carousel_v2').length,
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <Toast toasts={toasts} />

      {/* Header */}
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
            <button onClick={fetchAll} className="btn btn-ghost" style={{ gap: 6 }} title="Recarregar">
              <RefreshCw size={14} />
            </button>
            <button onClick={() => setModalPost(null)} className="btn btn-primary" style={{ gap: 6 }}>
              <Plus size={14} /> Novo Post
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       value: stats.total,    color: 'var(--text-primary)' },
            { label: 'Visíveis',    value: stats.active,   color: 'var(--accent)' },
            { label: 'Texto',       value: stats.text,     color: '#6b7280' },
            { label: 'Mídia',       value: stats.media,    color: '#3b82f6' },
            { label: 'Carrossel',   value: stats.carousel, color: '#8b5cf6' },
            { label: 'Carrossel V2',value: stats.cv2,      color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: s.color }}>{s.value}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar posts..."
          style={{ flex: 1, minWidth: 180, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="">Todos os tipos</option>
          {CARD_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <Loader size={24} style={{ animation: 'spin 0.8s linear infinite', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
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
      ) : (
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

      {/* Modal */}
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
