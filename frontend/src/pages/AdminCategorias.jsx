import { useEffect, useState } from 'react';
import {
  FolderPlus, Pencil, Trash2, Music, Layers, Flag, Star, Shield,
  BookOpen, Award, Mic, Volume2, Headphones, Hash, AlignLeft, Tag,
  Siren, Drum, Radio, Sword, Medal, Target, Users, Globe, Heart,
  FileText, Bell, Camera, Zap, MapPin, Calendar, Clock, Flame,
  ChevronRight, Lock, Unlock, Home,
} from 'lucide-react';
import api from '../utils/api';

// ─── Mapa de ícones disponíveis ───────────────────────────────────────────────
// A chave é o que fica salvo no banco e usado pelo app Java para renderizar.
const ICONS = [
  { key: 'Music',      Icon: Music,       label: 'Música'      },
  { key: 'Mic',        Icon: Mic,         label: 'Microfone'   },
  { key: 'Volume2',    Icon: Volume2,     label: 'Volume'      },
  { key: 'Headphones', Icon: Headphones,  label: 'Fone'        },
  { key: 'Drum',       Icon: Drum,        label: 'Tambor'      },
  { key: 'Radio',      Icon: Radio,       label: 'Rádio'       },
  { key: 'Flag',       Icon: Flag,        label: 'Bandeira'    },
  { key: 'Shield',     Icon: Shield,      label: 'Escudo'      },
  { key: 'Sword',      Icon: Sword,       label: 'Espada'      },
  { key: 'Target',     Icon: Target,      label: 'Alvo'        },
  { key: 'Medal',      Icon: Medal,       label: 'Medalha'     },
  { key: 'Award',      Icon: Award,       label: 'Prêmio'      },
  { key: 'Star',       Icon: Star,        label: 'Estrela'     },
  { key: 'Flame',      Icon: Flame,       label: 'Chama'       },
  { key: 'Zap',        Icon: Zap,         label: 'Raio'        },
  { key: 'BookOpen',   Icon: BookOpen,    label: 'Livro'       },
  { key: 'FileText',   Icon: FileText,    label: 'Documento'   },
  { key: 'Layers',     Icon: Layers,      label: 'Camadas'     },
  { key: 'Users',      Icon: Users,       label: 'Grupo'       },
  { key: 'Globe',      Icon: Globe,       label: 'Global'      },
  { key: 'Heart',      Icon: Heart,       label: 'Coração'     },
  { key: 'Bell',       Icon: Bell,        label: 'Sino'        },
  { key: 'Siren',      Icon: Siren,       label: 'Sirene'      },
  { key: 'MapPin',     Icon: MapPin,      label: 'Local'       },
  { key: 'Calendar',   Icon: Calendar,    label: 'Calendário'  },
  { key: 'Clock',      Icon: Clock,       label: 'Relógio'     },
  { key: 'Camera',     Icon: Camera,      label: 'Câmera'      },
  { key: 'Home',       Icon: Home,        label: 'Casa'        },
  { key: 'Lock',       Icon: Lock,        label: 'Cadeado'     },
  { key: 'ChevronRight', Icon: ChevronRight, label: 'Seta'    },
];

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const COLORS = [
  { key: 'olive',  label: 'Oliva',    hex: '#5e7244' },
  { key: 'khaki',  label: 'Cáqui',    hex: '#8b8070' },
  { key: 'green',  label: 'Verde',    hex: '#4a6b3a' },
  { key: 'red',    label: 'Vermelho', hex: '#8b3a3a' },
  { key: 'blue',   label: 'Azul',     hex: '#3a5a8b' },
  { key: 'gold',   label: 'Dourado',  hex: '#8b7a3a' },
];

function getHex(key) {
  return COLORS.find(c => c.key === key)?.hex || '#5e7244';
}

function getIconEntry(key) {
  return ICONS.find(i => i.key === key) || ICONS[0];
}

// ─── Preview de card do app ───────────────────────────────────────────────────
function AppCardPreview({ name, description, sectionLabel, iconKey, iconColor }) {
  const hex = getHex(iconColor);
  const { Icon } = getIconEntry(iconKey);
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      border: `1.5px solid ${hex}30`,
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      boxShadow: `0 4px 16px ${hex}18`,
      maxWidth: 340,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: `${hex}18`,
        border: `1.5px solid ${hex}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={hex} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {sectionLabel && (
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: hex, letterSpacing: '0.16em', marginBottom: 3, textTransform: 'uppercase', fontWeight: 700 }}>
            {sectionLabel}
          </div>
        )}
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1914', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name || 'Nome da Categoria'}
        </div>
        {description && (
          <div style={{ fontSize: 12, color: '#8b8070', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {description}
          </div>
        )}
      </div>
      <ChevronRight size={16} color={`${hex}80`} />
    </div>
  );
}

// ─── Modal criar / editar ─────────────────────────────────────────────────────
function CategoriaModal({ categoria, onClose, onSaved }) {
  const isEdit = !!categoria?._id;

  const [form, setForm] = useState({
    name:         categoria?.name         || '',
    description:  categoria?.description  || '',
    sectionLabel: categoria?.sectionLabel || '',
    icon:         categoria?.icon         || 'Music',
    iconColor:    categoria?.iconColor    || 'olive',
    order:        categoria?.order        ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return; }
    setLoading(true); setError('');
    try {
      if (isEdit) await api.put(`/categories/${categoria._id}`, form);
      else        await api.post('/categories', form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Erro ao salvar.');
    } finally { setLoading(false); }
  };

  const hex = getHex(form.iconColor);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(26,25,20,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 14, width: '100%', maxWidth: 620,
        maxHeight: '92vh', overflowY: 'auto',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.1em' }}>
              {isEdit ? 'EDITAR CATEGORIA' : 'NOVA CATEGORIA'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.08em' }}>
              // CARD EXIBIDO NA TELA INICIAL DO APP
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, padding: 4 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Nome */}
          <div>
            <label style={labelStyle}>
              <Tag size={12} /> Nome *
            </label>
            <input className="form-input" required value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Hinos Militares"
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>
              <AlignLeft size={12} /> Descrição
              <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10, textTransform: 'none' }}>aparece abaixo do nome no card</span>
            </label>
            <input className="form-input" value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Ex: Hinos e marchas do Exército Brasileiro"
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>

          {/* Rótulo da seção */}
          <div>
            <label style={labelStyle}>
              <Layers size={12} /> Rótulo de seção
              <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10, textTransform: 'none' }}>pequeno texto acima do nome</span>
            </label>
            <input className="form-input" value={form.sectionLabel}
              onChange={e => set('sectionLabel', e.target.value)}
              placeholder="Ex: HINOS E MARCHAS"
              style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>

          {/* ── Seletor de ÍCONE ── */}
          <div>
            <label style={labelStyle}>Ícone do card</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {ICONS.map(({ key, Icon, label }) => {
                const selected = form.icon === key;
                return (
                  <button
                    key={key} type="button"
                    onClick={() => set('icon', key)}
                    title={label}
                    style={{
                      width: 44, height: 44, borderRadius: 10, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: selected ? `${hex}18` : 'var(--bg-secondary)',
                      border: `1.5px solid ${selected ? hex : 'var(--border)'}`,
                      transition: 'all 0.15s',
                      outline: 'none',
                    }}
                  >
                    <Icon size={18} color={selected ? hex : 'var(--text-muted)'} />
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              Selecionado: <span style={{ color: hex, fontWeight: 700 }}>{getIconEntry(form.icon).label}</span>
            </div>
          </div>

          {/* ── Seletor de COR ── */}
          <div>
            <label style={labelStyle}>Cor do ícone</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {COLORS.map(({ key, label, hex: h }) => {
                const selected = form.iconColor === key;
                return (
                  <button key={key} type="button" onClick={() => set('iconColor', key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                      background: selected ? `${h}14` : 'var(--bg-secondary)',
                      border: `1.5px solid ${selected ? h : 'var(--border)'}`,
                      transition: 'all 0.15s', outline: 'none',
                    }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: h, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: selected ? 700 : 400, color: selected ? h : 'var(--text-muted)' }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Preview do card como aparece no app ── */}
          <div>
            <label style={labelStyle}>Prévia — como aparece no app</label>
            <div style={{ marginTop: 8, padding: '16px 18px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
              <AppCardPreview
                name={form.name}
                description={form.description}
                sectionLabel={form.sectionLabel}
                iconKey={form.icon}
                iconColor={form.iconColor}
              />
            </div>
          </div>

          {/* Ordem */}
          <div style={{ maxWidth: 160 }}>
            <label style={labelStyle}><Hash size={12} /> Ordem de exibição</label>
            <input className="form-input" type="number" min="0"
              value={form.order}
              onChange={e => set('order', parseInt(e.target.value) || 0)}
              style={{ width: '100%' }} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Menor número aparece primeiro.
            </p>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid rgba(139,58,58,0.2)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
  color: 'var(--text-muted)', letterSpacing: '0.08em',
  textTransform: 'uppercase', marginBottom: 2,
};

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState({ msg: '', ok: true });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories/admin/all');
      setCategorias(data.categories || []);
    } catch {
      showToast('Erro ao carregar categorias.', false);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (cat) => {
    if (!window.confirm(`Remover a categoria "${cat.name}"?\n\nSe houver músicas vinculadas, não será possível remover.`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      showToast('Categoria removida com sucesso.');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Erro ao remover.', false);
    }
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(94,114,68,0.1)', border: '1px solid rgba(94,114,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} color="var(--accent)" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.1em', margin: 0 }}>
              CATEGORIAS
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '0.06em' }}>
            // CARDS EXIBIDOS NA TELA INICIAL DO APP · {categorias.length} CADASTRADA{categorias.length !== 1 ? 'S' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderPlus size={15} /> NOVA CATEGORIA
        </button>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 8, fontSize: 13,
          background: toast.ok ? 'var(--success-light)' : 'var(--danger-light)',
          border: `1px solid ${toast.ok ? 'rgba(74,107,58,0.25)' : 'rgba(139,58,58,0.25)'}`,
          color: toast.ok ? 'var(--success)' : 'var(--danger)',
          fontFamily: 'var(--font-mono)',
        }}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : categorias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <Layers size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 6, fontSize: 16, fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
            Nenhuma categoria criada.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            As categorias aparecem como cards na tela inicial do app.
          </p>
          <button className="btn btn-primary" onClick={() => setModal({})}>Criar primeira categoria</button>
        </div>
      ) : (
        <>
          {/* Prévia dos cards como no app */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
              ▸ Prévia — tela inicial do app
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {categorias.map(cat => (
                <AppCardPreview
                  key={cat._id}
                  name={cat.name}
                  description={cat.description}
                  sectionLabel={cat.sectionLabel}
                  iconKey={cat.icon}
                  iconColor={cat.iconColor}
                />
              ))}
            </div>
          </div>

          {/* Tabela de gerenciamento */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 180px 80px 70px 130px', gap: 12, padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              {['Ícone', 'Nome / Seção', 'Descrição', 'Músicas', 'Ordem', 'Ações'].map(h => (
                <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {h}
                </div>
              ))}
            </div>

            {categorias.map((cat, idx) => {
              const hex = getHex(cat.iconColor);
              const { Icon } = getIconEntry(cat.icon);
              return (
                <div key={cat._id}
                  style={{
                    display: 'grid', gridTemplateColumns: '52px 1fr 180px 80px 70px 130px',
                    gap: 12, padding: '13px 16px', alignItems: 'center',
                    borderBottom: idx < categorias.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Ícone */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${hex}18`, border: `1.5px solid ${hex}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={17} color={hex} />
                  </div>

                  {/* Nome + rótulo */}
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{cat.name}</div>
                    {cat.sectionLabel
                      ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: hex, letterSpacing: '0.14em', marginTop: 2 }}>{cat.sectionLabel.toUpperCase()}</div>
                      : <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>sem rótulo</div>
                    }
                  </div>

                  {/* Descrição */}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat.description || <span style={{ fontStyle: 'italic' }}>—</span>}
                  </div>

                  {/* Contagem músicas */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Music size={13} color={hex} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: hex }}>{cat.songCount ?? 0}</span>
                  </div>

                  {/* Ordem */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>#{cat.order}</div>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setModal(cat)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(cat)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: 'var(--danger-light)', border: '1px solid rgba(139,58,58,0.2)', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Aviso de sincronização */}
      <div style={{ marginTop: 20, padding: '13px 16px', background: 'rgba(94,114,68,0.04)', border: '1px solid rgba(94,114,68,0.15)', borderRadius: 10, borderLeft: '3px solid var(--accent)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 5 }}>
          ℹ️  SINCRONIZAÇÃO COM O APP
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          Após criar ou editar categorias, acesse <strong>Publicar para App</strong> para incrementar a versão.
          O app Java verifica a versão no servidor e, se houver novidade, baixa automaticamente as categorias e músicas —
          atualizando registros existentes pelo <code>_id</code> sem duplicar.
        </p>
      </div>

      {/* Modal */}
      {modal !== null && (
        <CategoriaModal
          categoria={modal._id ? modal : undefined}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
