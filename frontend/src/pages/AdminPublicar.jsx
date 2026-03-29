import { useEffect, useState } from 'react';
import { Rocket, RefreshCw, CheckCircle, AlertCircle, Clock, Music, Info, Layers, FileText } from 'lucide-react';
import api from '../utils/api';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatCard({ icon: Icon, label, value, color = 'var(--accent)' }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, padding: '16px 18px',
      background: 'white', border: '1px solid var(--border)', borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: `${color}14`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function AdminPublicar() {
  const [status,    setStatus]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [note,      setNote]      = useState('');
  const [toast,     setToast]     = useState({ msg: '', ok: true });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 4000);
  };

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sync/status');
      setStatus(res.data);
    } catch {
      showToast('Erro ao carregar status de sincronização.', false);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStatus(); }, []);

  const handlePublish = async () => {
    if (!window.confirm('Publicar atualização para o app? Todos os dispositivos receberão o conteúdo atualizado na próxima abertura.')) return;
    setPublishing(true);
    try {
      const res = await api.post('/sync/publish', { note });
      setStatus(res.data);
      setNote('');
      showToast(`✓ ${res.data.message}`);
    } catch (err) {
      showToast('✗ ' + (err.response?.data?.error || 'Erro ao publicar.'), false);
    } finally { setPublishing(false); }
  };

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(94,114,68,0.1)', border: '1px solid rgba(94,114,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={18} color="var(--accent)" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.1em', margin: 0 }}>PUBLICAR PARA APP</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', margin: 0 }}>
          Controle de versão de conteúdo para o aplicativo móvel
        </p>
      </div>

      {/* ── Toast ── */}
      {toast.msg && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: toast.ok ? 'rgba(94,114,68,0.08)' : 'rgba(220,38,38,0.06)',
          border: `1px solid ${toast.ok ? 'rgba(94,114,68,0.25)' : 'rgba(220,38,38,0.2)'}`,
          borderRadius: 8, fontSize: 14,
          color: toast.ok ? 'var(--accent)' : 'var(--danger)',
          fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Status atual ── */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={15} color="var(--accent)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Status Atual do App
                </span>
              </div>
              <button
                onClick={loadStatus}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <RefreshCw size={13} /> Atualizar
              </button>
            </div>

            <div style={{ padding: 18 }}>
              {/* Stats */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <StatCard icon={Rocket}    label="Versão Atual"      value={`v${status?.version ?? 0}`}       color="var(--accent)" />
                <StatCard icon={Music}     label="Músicas Ativas"    value={status?.stats?.songs ?? 0}        color="#3b82f6" />
                <StatCard icon={Layers}    label="Categorias Ativas" value={status?.stats?.categories ?? 0}   color="#8b7a3a" />
                <StatCard icon={FileText}  label="Posts Ativos"      value={status?.stats?.posts ?? 0}        color="#7c3aed" />
              </div>

              {/* Última publicação */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  { icon: Clock,        label: 'Última publicação', value: formatDate(status?.publishedAt) },
                  { icon: CheckCircle,  label: 'Publicado por',     value: status?.publishedBy || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Icon size={13} color="var(--text-muted)" />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Nota da última publicação */}
              {status?.note && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(94,114,68,0.05)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nota da última versão: </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{status.note}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Publicar nova versão ── */}
          <div style={{ background: 'white', border: '1px solid rgba(94,114,68,0.3)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(94,114,68,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Rocket size={15} color="var(--accent)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>
                Publicar Nova Versão
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>
                v{(status?.version ?? 0) + 1} será a próxima
              </span>
            </div>

            <div style={{ padding: 18 }}>
              {/* Como funciona */}
              <div style={{ padding: '12px 14px', background: 'rgba(94,114,68,0.04)', borderRadius: 8, border: '1px solid rgba(94,114,68,0.12)', marginBottom: 18 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Como funciona
                </p>
                <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    'Ao publicar, a versão é incrementada no servidor.',
                    'Quando o app abrir, ele compara a versão local com a do servidor.',
                    'Se houver versão nova, o app faz download automático das músicas atualizadas.',
                    'Músicas ficam disponíveis offline após a primeira sincronização.',
                  ].map((item, i) => (
                    <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Nota */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
                  Nota da publicação (opcional)
                </label>
                <input
                  className="form-input"
                  placeholder="Ex: Adicionadas músicas de formatura, atualizado Hino Nacional..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Esta nota fica registrada no histórico de versões.
                </p>
              </div>

              {/* Resumo do que será publicado */}
              <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 18 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Conteúdo que será publicado
                </p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Music size={14} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{status?.stats?.songs ?? 0}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>músicas ativas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} color="#8b7a3a" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{status?.stats?.categories ?? 0}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>categorias ativas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} color="#7c3aed" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{status?.stats?.posts ?? 0}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>posts ativos</span>
                  </div>
                </div>
              </div>

              {/* Botão publicar */}
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  width: '100%', padding: '14px 0',
                  background: publishing ? 'var(--bg-secondary)' : 'var(--accent)',
                  color: publishing ? 'var(--text-muted)' : 'white',
                  border: `1px solid ${publishing ? 'var(--border)' : 'var(--accent)'}`,
                  borderRadius: 8, cursor: publishing ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                  letterSpacing: '0.12em', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {publishing ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    PUBLICANDO...
                  </>
                ) : (
                  <>
                    <Rocket size={16} />
                    PUBLICAR v{(status?.version ?? 0) + 1} PARA O APP
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Endpoint público para o app ── */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={15} color="var(--text-muted)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Endpoints do App
              </span>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Use estes endpoints no aplicativo React Native / Flutter para sincronizar o conteúdo:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { method: 'GET',  path: '/api/sync/status',              desc: 'Verifica versão atual (público, sem autenticação)' },
                  { method: 'GET',  path: '/api/categories',               desc: 'Lista todas as categorias ativas com contagem de músicas' },
                  { method: 'GET',  path: '/api/songs',                    desc: 'Lista todas as músicas ativas com categoria populada' },
                  { method: 'GET',  path: '/api/songs/category/:categoryId', desc: 'Músicas de uma categoria específica' },
                  { method: 'GET',  path: '/api/songs/:id',                desc: 'Detalhes de uma música (incrementa playCount)' },
                ].map(({ method, path, desc }) => (
                  <div key={path} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '2px 6px',
                      borderRadius: 4, flexShrink: 0,
                      background: method === 'GET' ? 'rgba(59,130,246,0.1)' : 'rgba(94,114,68,0.1)',
                      color: method === 'GET' ? '#3b82f6' : 'var(--accent)',
                      border: method === 'GET' ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(94,114,68,0.2)',
                    }}>
                      {method}
                    </span>
                    <div>
                      <code style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{path}</code>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
