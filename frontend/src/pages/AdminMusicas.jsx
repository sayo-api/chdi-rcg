import { useEffect, useState, useRef } from 'react';
import { Music, Upload, Trash2, Pencil, X, Play, Layers } from 'lucide-react';
import api from '../utils/api';
import SyncEditor from '../components/SyncEditor';

// ─── UploadArea ────────────────────────────────────────────────────────────────
function UploadArea({ file, onFile, existingUrl }) {
  const ref = useRef();
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
        <input ref={ref} type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" style={{ display: 'none' }}
          onChange={e => onFile(e.target.files[0])} />
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(94,114,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          {file
            ? <Music size={22} color="var(--accent)" />
            : <Upload size={22} color="var(--text-muted)" />}
        </div>
        {file ? (
          <div>
            <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{file.name}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Arraste ou clique para selecionar</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>MP3, WAV, OGG, M4A — máx. 50MB</p>
          </div>
        )}
      </div>
      {existingUrl && !file && (
        <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Áudio atual:</p>
          <audio controls src={existingUrl} style={{ width: '100%' }} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Deixe em branco para manter o áudio atual.</p>
        </div>
      )}
    </div>
  );
}

// ─── Modal de Música ───────────────────────────────────────────────────────────
function SongModal({ song, onClose, onSaved, categorias }) {
  const isEdit = !!song?._id;

  const [form, setForm] = useState({
    title:       song?.title                              || '',
    description: song?.description                       || '',
    categoryId:  song?.category?._id || song?.category   || '',
    order:       song?.order                             ?? 0,
  });
  const [lyrics,     setLyrics]     = useState(song?.lyrics || []);
  const [audioFile,  setAudioFile]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [tab,        setTab]        = useState('info');
  const [progress,   setProgress]   = useState(0);

  const tabs = [
    { key: 'info',  label: '📋 Informações' },
    { key: 'audio', label: '🎵 Áudio'       },
    { key: 'sync',  label: '🎯 Sync Letras' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !audioFile) { setError('Selecione um arquivo de áudio.'); return; }
    setLoading(true); setError(''); setProgress(0);

    try {
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('description', form.description);
      fd.append('order',       form.order);
      fd.append('categoryId',  form.categoryId || '');
      fd.append('lyrics',      JSON.stringify(lyrics));
      if (audioFile) fd.append('media', audioFile);

      const cfg = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: ev => setProgress(Math.round((ev.loaded / ev.total) * 100)),
      };

      if (isEdit) await api.put(`/songs/${song._id}`, fd, cfg);
      else        await api.post('/songs', fd, cfg);

      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Erro ao salvar.');
    } finally { setLoading(false); }
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
    }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: 12, width: '100%', maxWidth: 700,
        maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(94,114,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={16} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.1em' }}>
                {isEdit ? 'EDITAR MÚSICA' : 'NOVA MÚSICA'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                {isEdit ? `ID: ${song._id}` : 'Hinos e músicas militares'}
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
            <button key={key} type="button" onClick={() => setTab(key)} style={tabStyle(key)}>
              {label}
            </button>
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
                  placeholder="Ex: Hino Nacional Brasileiro"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* ── CATEGORIA ── */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
                  <Layers size={12} /> Categoria
                  <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-muted)', marginLeft: 4, textTransform: 'none' }}>(opcional)</span>
                </label>
                <select
                  className="form-input"
                  value={form.categoryId}
                  onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <option value="">— Sem categoria —</option>
                  {categorias.map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}{cat.songCount > 0 ? ` (${cat.songCount} músicas)` : ''}
                    </option>
                  ))}
                </select>
                {categorias.length === 0 && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Nenhuma categoria cadastrada. Crie categorias em <strong>Categorias</strong> no menu lateral.
                  </p>
                )}
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
                  placeholder="Descrição breve da música..."
                  style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxWidth: 140 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
                  Ordem
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={e => setForm(p => ({ ...p, order: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Dica */}
              <div style={{ padding: '12px 14px', background: 'rgba(94,114,68,0.05)', borderRadius: 8, border: '1px solid rgba(94,114,68,0.15)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  💡 Após preencher as informações, vá para a aba <strong>Áudio</strong> para fazer upload do arquivo, depois para <strong>Sync Letras</strong> para sincronizar a letra com o tempo da música.
                </p>
              </div>
            </div>
          )}

          {/* ── Áudio ── */}
          {tab === 'audio' && (
            <UploadArea
              file={audioFile}
              onFile={setAudioFile}
              existingUrl={song?.audioUrl}
            />
          )}

          {/* ── Sync Letras ── */}
          {tab === 'sync' && (
            <SyncEditor
              audioFile={audioFile}
              audioUrl={song?.audioUrl}
              initialLyrics={lyrics}
              onChange={setLyrics}
            />
          )}

          {/* Progresso de upload */}
          {loading && progress > 0 && progress < 100 && (
            <div style={{ margin: '14px 0', padding: 14, background: 'rgba(94,114,68,0.08)', borderRadius: 8, border: '1px solid rgba(94,114,68,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Enviando para Cloudinary...</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{progress}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${progress}%`, transition: 'width 0.3s' }} />
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
            <button type="submit" className="btn btn-accent" disabled={loading} style={{ minWidth: 100 }}>
              {loading ? `Enviando${progress > 0 ? ` ${progress}%` : '...'}` : isEdit ? 'Atualizar' : 'Salvar Música'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function AdminMusicas() {
  const [songs,      setSongs]      = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState({ msg: '', ok: true });
  const [search,     setSearch]     = useState('');
  const [filterCat,  setFilterCat]  = useState('');

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [songRes, catRes] = await Promise.all([
        api.get('/songs/admin/all'),
        api.get('/categories/admin/all'),
      ]);
      setSongs(songRes.data.songs ?? []);
      setCategorias(catRes.data.categories ?? []);
    } catch {
      showToast('Erro ao carregar dados.', false);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (song) => {
    if (!window.confirm(`Remover "${song.title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/songs/${song._id}`);
      showToast('✓ Música removida com sucesso.');
      load();
    } catch (err) {
      showToast('✗ ' + (err.response?.data?.error || 'Erro ao remover.'), false);
    }
  };

  const handleToggleActive = async (song) => {
    try {
      const fd = new FormData();
      fd.append('active', String(!song.active));
      await api.put(`/songs/${song._id}`, fd);
      showToast(song.active ? '✓ Música desativada.' : '✓ Música ativada.');
      load();
    } catch {
      showToast('✗ Erro ao alterar status.', false);
    }
  };

  const filtered = songs.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchCat    = !filterCat || (s.category?._id || s.category) === filterCat;
    return matchSearch && matchCat;
  });

  // Encontra nome da categoria de uma música
  const catNameOf = (song) => {
    if (!song.category) return null;
    const id = song.category?._id || song.category;
    return categorias.find(c => c._id === id)?.name || null;
  };

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(94,114,68,0.1)', border: '1px solid rgba(94,114,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={18} color="var(--accent)" />
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.1em', margin: 0 }}>MÚSICAS</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', margin: 0 }}>
              Hinos e músicas militares com letra sincronizada
            </p>
          </div>
          <button className="btn btn-accent" onClick={() => setModal({})}>
            + Nova Música
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
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

      {/* ── Stats + Filtros ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',     value: songs.length,                              color: 'var(--text-secondary)' },
            { label: 'Ativas',    value: songs.filter(s => s.active).length,        color: 'var(--accent)' },
            { label: 'Com Letra', value: songs.filter(s => s.lyrics?.length > 0).length, color: '#3b82f6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>{value}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Filtro por categoria */}
          {categorias.length > 0 && (
            <select
              className="form-input"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              style={{ width: 180, boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="">Todas as categorias</option>
              <option value="__none__">Sem categoria</option>
              {categorias.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          )}
          <input
            className="form-input"
            placeholder="Buscar música..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Music size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ marginBottom: 16, fontSize: 16, fontFamily: 'var(--font-mono)' }}>
            {search || filterCat ? 'Nenhuma música encontrada.' : 'Nenhuma música cadastrada.'}
          </p>
          {!search && !filterCat && (
            <button className="btn btn-accent" onClick={() => setModal({})}>Adicionar primeira música</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(song => {
            const catName = catNameOf(song);
            return (
              <div key={song._id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  background: 'white', border: '1px solid var(--border)', borderRadius: 10,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  opacity: song.active ? 1 : 0.6,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(94,114,68,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>

                {/* Ícone */}
                <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(94,114,68,0.08)', border: '1px solid rgba(94,114,68,0.15)' }}>
                  <Music size={16} color="var(--accent)" />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {song.title}
                    {!song.active && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(220,38,38,0.08)', color: 'var(--danger)', fontFamily: 'var(--font-mono)', border: '1px solid rgba(220,38,38,0.15)' }}>
                        INATIVA
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Badge de categoria */}
                    {catName ? (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(94,114,68,0.06)', color: 'var(--accent)', border: '1px solid rgba(94,114,68,0.2)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Layers size={9} /> {catName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                        sem categoria
                      </span>
                    )}
                    {song.lyrics?.length > 0 ? (
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'rgba(94,114,68,0.08)', color: 'var(--accent)', border: '1px solid rgba(94,114,68,0.15)', fontFamily: 'var(--font-mono)' }}>
                        ✓ {song.lyrics.length} linhas
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                        sem letra
                      </span>
                    )}
                    {song.description && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                        {song.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Play count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>
                  <Play size={12} />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{song.playCount ?? 0}</span>
                </div>

                {/* Ordem */}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0, background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  #{song.order}
                </span>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    title={song.active ? 'Desativar' : 'Ativar'}
                    onClick={() => handleToggleActive(song)}
                    style={{
                      background: song.active ? 'rgba(94,114,68,0.08)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${song.active ? 'rgba(94,114,68,0.2)' : 'var(--border)'}`,
                      color: song.active ? 'var(--accent)' : 'var(--text-muted)',
                      borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                    }}>
                    {song.active ? '● ON' : '○ OFF'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(song)}>
                    <Pencil size={13} style={{ marginRight: 4 }} />Editar
                  </button>
                  <button
                    onClick={() => handleDelete(song)}
                    style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--danger)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {modal !== null && (
        <SongModal
          song={modal?._id ? modal : undefined}
          categorias={categorias}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
