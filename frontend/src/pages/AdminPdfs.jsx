import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Trash2, Pencil, X, Plus, ArrowUp, ArrowDown, Search, BookOpen } from 'lucide-react';
import api from '../utils/api';

// ─── PDF Upload Area ────────────────────────────────────────────────────────────
function PdfUploadArea({ file, onFile, existingUrl, existingSize }) {
  const ref = useRef();
  const fmtSize = (b) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  return (
    <div>
      <div
        style={{
          border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10, padding: 32, textAlign: 'center', cursor: 'pointer',
          transition: 'all 0.2s', background: file ? 'rgba(94,114,68,0.05)' : 'transparent',
        }}
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = file ? 'var(--accent)' : 'var(--border)'; }}
        onDrop={e => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
          e.currentTarget.style.borderColor = 'var(--border)';
        }}>
        <input ref={ref} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
          onChange={e => onFile(e.target.files[0])} />
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(94,114,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          {file ? <FileText size={22} color="var(--accent)" /> : <Upload size={22} color="var(--text-muted)" />}
        </div>
        {file ? (
          <div>
            <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{file.name}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtSize(file.size)}</p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Arraste ou clique para selecionar</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>PDF — máx. 100MB</p>
          </div>
        )}
      </div>
      {existingUrl && !file && (
        <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileText size={20} color="var(--accent)" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>PDF atual:</p>
            <a href={existingUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline' }}>Abrir PDF</a>
            {existingSize > 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtSize(existingSize)}</p>}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Deixe em branco para manter.</p>
        </div>
      )}
    </div>
  );
}

// ─── Cards Editor ───────────────────────────────────────────────────────────────
function CardsEditor({ cards, onChange }) {
  const addCard = () => onChange([...cards, { title: '', steps: [''] }]);
  const removeCard = (i) => onChange(cards.filter((_, idx) => idx !== i));
  const updateCard = (i, field, val) => {
    const c = [...cards];
    c[i] = { ...c[i], [field]: val };
    onChange(c);
  };
  const addStep = (ci) => {
    const c = [...cards];
    c[ci] = { ...c[ci], steps: [...(c[ci].steps || []), ''] };
    onChange(c);
  };
  const updateStep = (ci, si, val) => {
    const c = [...cards];
    const steps = [...(c[ci].steps || [])];
    steps[si] = val;
    c[ci] = { ...c[ci], steps };
    onChange(c);
  };
  const removeStep = (ci, si) => {
    const c = [...cards];
    c[ci] = { ...c[ci], steps: c[ci].steps.filter((_, i) => i !== si) };
    onChange(c);
  };
  const moveCard = (i, dir) => {
    const c = [...cards];
    const j = i + dir;
    if (j < 0 || j >= c.length) return;
    [c[i], c[j]] = [c[j], c[i]];
    onChange(c);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cards de instrução exibidos no app junto ao PDF</p>
        <button type="button" onClick={addCard} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={13} /> Novo Card
        </button>
      </div>
      {cards.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          Nenhum card de instrução. Clique em "Novo Card" para adicionar.
        </div>
      )}
      {cards.map((card, ci) => (
        <div key={ci} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 10, background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button type="button" onClick={() => moveCard(ci, -1)} disabled={ci === 0} style={{ padding: '2px 6px', background: 'var(--border)', border: 'none', borderRadius: 4, cursor: 'pointer' }}><ArrowUp size={12} /></button>
              <button type="button" onClick={() => moveCard(ci, 1)} disabled={ci === cards.length - 1} style={{ padding: '2px 6px', background: 'var(--border)', border: 'none', borderRadius: 4, cursor: 'pointer' }}><ArrowDown size={12} /></button>
            </div>
            <input className="form-input" placeholder="Título do card (ex: NOTAS IMPORTANTES)" value={card.title || ''} onChange={e => updateCard(ci, 'title', e.target.value)} style={{ flex: 1, fontSize: 13 }} />
            <button type="button" onClick={() => removeCard(ci)} style={{ padding: '4px 8px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--danger)', borderRadius: 6, cursor: 'pointer' }}><Trash2 size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(card.steps || []).map((step, si) => (
              <div key={si} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, minWidth: 20 }}>{si + 1}.</span>
                <input className="form-input" placeholder={`Passo ${si + 1}...`} value={step} onChange={e => updateStep(ci, si, e.target.value)} style={{ flex: 1, fontSize: 13 }} />
                <button type="button" onClick={() => removeStep(ci, si)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0 4px' }}><X size={13} /></button>
              </div>
            ))}
            <button type="button" onClick={() => addStep(ci)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
              + Adicionar passo
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Modal de PDF ───────────────────────────────────────────────────────────────
function PdfModal({ pdf, onClose, onSaved, categorias }) {
  const isEdit = !!pdf?._id;

  const [form, setForm] = useState({
    title:       pdf?.title       || '',
    subtitle:    pdf?.subtitle    || '',
    description: pdf?.description || '',
    categoryId:  pdf?.category?._id || pdf?.category || '',
    cardsLabel:  pdf?.cardsLabel  || 'NOTAS DE INSTRUÇÃO',
    order:       pdf?.order       ?? 0,
  });
  const [cards,    setCards]    = useState(pdf?.cards || []);
  const [pdfFile,  setPdfFile]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState('info');
  const [progress, setProgress] = useState(0);

  const tabs = [
    { key: 'info',  label: '📋 Informações' },
    { key: 'pdf',   label: '📄 Arquivo PDF' },
    { key: 'cards', label: '🗂 Cards'       },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Título é obrigatório.'); return; }
    if (!isEdit && !pdfFile) { setError('Selecione um arquivo PDF.'); return; }

    setLoading(true); setError('');
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      data.append('cards', JSON.stringify(cards));
      if (pdfFile) data.append('pdf', pdfFile);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      await new Promise((resolve, reject) => {
        xhr.open(isEdit ? 'PUT' : 'POST', `/api/pdfs${isEdit ? '/' + pdf._id : ''}`);
        const token = localStorage.getItem('token');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(JSON.parse(xhr.responseText)?.error || 'Erro'));
        xhr.onerror = () => reject(new Error('Erro de rede'));
        xhr.send(data);
      });

      onSaved();
    } catch (err) {
      setError(err.message || 'Erro ao salvar PDF.');
    } finally {
      setLoading(false); setProgress(0);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(94,114,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isEdit ? 'Editar PDF' : 'Novo PDF'}</h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>O texto será extraído automaticamente para busca no app</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)', padding: '12px 16px', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 400, transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tab === 'info' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Título *</label>
                  <input className="form-input" placeholder="Ex: Manual do Combatente" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subtítulo</label>
                  <input className="form-input" placeholder="Ex: Edição 2024" value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoria</label>
                  <select className="form-input" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="">Sem categoria</option>
                    {categorias.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</label>
                  <textarea className="form-input" placeholder="Breve descrição do documento..." rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ordem</label>
                  <input className="form-input" type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
            </>
          )}

          {tab === 'pdf' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Arquivo PDF {!isEdit && '*'}</label>
              <PdfUploadArea file={pdfFile} onFile={setPdfFile} existingUrl={pdf?.pdfUrl} existingSize={pdf?.fileSize} />
              {progress > 0 && progress < 100 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enviando...</span>
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(94,114,68,0.06)', borderRadius: 8, border: '1px solid rgba(94,114,68,0.2)' }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  💡 O texto do PDF será <strong style={{ color: 'var(--accent)' }}>extraído automaticamente</strong> ao fazer upload para que o app possa fazer busca por palavras-chave offline.
                </p>
              </div>
            </div>
          )}

          {tab === 'cards' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rótulo da seção de cards</label>
                <input className="form-input" placeholder="NOTAS DE INSTRUÇÃO" value={form.cardsLabel} onChange={e => setForm(p => ({ ...p, cardsLabel: e.target.value }))} style={{ width: '100%', maxWidth: 320, boxSizing: 'border-box' }} />
              </div>
              <CardsEditor cards={cards} onChange={setCards} />
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ padding: '9px 24px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {loading ? (progress > 0 ? `Enviando ${progress}%...` : 'Salvando...') : (isEdit ? 'Salvar Alterações' : 'Criar PDF')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card de PDF na lista ───────────────────────────────────────────────────────
function PdfCard({ pdf, onEdit, onDelete, onToggle }) {
  const fmtSize = (b) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : b > 0 ? `${(b / 1024).toFixed(0)} KB` : '';

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start', opacity: pdf.active ? 1 : 0.55, transition: 'opacity 0.2s' }}>
      {/* Ícone PDF */}
      <div style={{ width: 48, height: 60, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText size={22} color="#dc2626" />
        <span style={{ fontSize: 8, fontWeight: 700, color: '#dc2626', letterSpacing: '0.05em', marginTop: 2 }}>PDF</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pdf.title}</p>
            {pdf.subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{pdf.subtitle}</p>}
          </div>
          {!pdf.active && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--border)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>INATIVO</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          {pdf.category && <span style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(94,114,68,0.1)', borderRadius: 4, padding: '2px 8px' }}>{pdf.category.name}</span>}
          {pdf.pageCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pdf.pageCount} páginas</span>}
          {pdf.fileSize > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtSize(pdf.fileSize)}</span>}
          {pdf.pagesText?.length > 0 && <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Busca ativa</span>}
          {pdf.cards?.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pdf.cards.length} cards</span>}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ordem: {pdf.order}</span>
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <a href={pdf.pdfUrl} target="_blank" rel="noreferrer" title="Abrir PDF"
          style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          <BookOpen size={14} />
        </a>
        <button onClick={() => onToggle(pdf)} title={pdf.active ? 'Desativar' : 'Ativar'}
          style={{ width: 32, height: 32, borderRadius: 6, background: pdf.active ? 'rgba(234,179,8,0.08)' : 'rgba(94,114,68,0.08)', border: `1px solid ${pdf.active ? 'rgba(234,179,8,0.2)' : 'rgba(94,114,68,0.2)'}`, color: pdf.active ? '#ca8a04' : 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          {pdf.active ? '●' : '○'}
        </button>
        <button onClick={() => onEdit(pdf)} title="Editar"
          style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(94,114,68,0.08)', border: '1px solid rgba(94,114,68,0.2)', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pencil size={14} />
        </button>
        <button onClick={() => onDelete(pdf)} title="Excluir"
          style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function AdminPdfs() {
  const [pdfs,       setPdfs]       = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null); // null | 'new' | pdf object
  const [search,     setSearch]     = useState('');
  const [filterCat,  setFilterCat]  = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [pr, cr] = await Promise.all([
        api.get('/api/pdfs/admin/all'),
        api.get('/api/categories'),
      ]);
      setPdfs(pr.data.pdfs || []);
      setCategorias(cr.data.categories || cr.data.cats || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (pdf) => {
    if (!window.confirm(`Excluir "${pdf.title}"?`)) return;
    try {
      await api.delete(`/api/pdfs/${pdf._id}`);
      load();
    } catch (_) { alert('Erro ao excluir PDF.'); }
  };

  const handleToggle = async (pdf) => {
    try {
      const data = new FormData();
      data.append('active', String(!pdf.active));
      await api.put(`/api/pdfs/${pdf._id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch (_) { alert('Erro ao atualizar PDF.'); }
  };

  const filtered = pdfs.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.title?.toLowerCase().includes(q) || p.subtitle?.toLowerCase().includes(q);
    const matchCat = !filterCat || p.category?._id === filterCat;
    return matchQ && matchCat;
  });

  const stats = {
    total: pdfs.length,
    ativos: pdfs.filter(p => p.active).length,
    comBusca: pdfs.filter(p => p.pagesText?.length > 0).length,
    totalPags: pdfs.reduce((s, p) => s + (p.pageCount || 0), 0),
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(94,114,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>PDFs & Documentos</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Manuais e regulamentos disponíveis no app com busca por palavras-chave</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--accent)' },
          { label: 'Ativos', value: stats.ativos, color: '#22c55e' },
          { label: 'Com busca', value: stats.comBusca, color: '#3b82f6' },
          { label: 'Páginas', value: stats.totalPags, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Buscar por título..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <select className="form-input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <button onClick={() => setModal('new')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Novo PDF
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Carregando PDFs...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)' }}>
          <FileText size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p>{search || filterCat ? 'Nenhum PDF encontrado com este filtro.' : 'Nenhum PDF cadastrado ainda.'}</p>
          {!search && !filterCat && (
            <button onClick={() => setModal('new')} style={{ marginTop: 12, padding: '8px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Criar primeiro PDF
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => (
            <PdfCard key={p._id} pdf={p}
              onEdit={(pdf) => setModal(pdf)}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <PdfModal
          pdf={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          categorias={categorias}
        />
      )}
    </div>
  );
}
