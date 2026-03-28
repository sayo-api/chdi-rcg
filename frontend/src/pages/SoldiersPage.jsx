import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Users, UserCheck, UserX as UserXIcon, Clock, ChevronUp, ChevronDown, Eye, Pencil, Key } from 'lucide-react';
import api from '../utils/api';
import { getRankLabel, getRankShort, formatDate } from '../utils/constants';
import SoldierModal from '../components/SoldierModal';
import SoldierDetailModal from '../components/SoldierDetailModal';
import PermissionsModal from '../components/PermissionsModal';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const FILTERS = [
  { key:'all', label:'Todos' },
  { key:'active', label:'Ativos' },
  { key:'inactive', label:'Inativos' },
  { key:'pending', label:'Pendentes' },
];

export default function SoldiersPage() {
  const [soldiers, setSoldiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ key:'war_name', dir:'asc' });
  const [showModal, setShowModal] = useState(false);
  const [editSoldier, setEditSoldier] = useState(null);
  const [viewSoldier, setViewSoldier] = useState(null);
  const [permSoldier, setPermSoldier] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  const load = () => {
    setLoading(true);
    api.get('/users').then(r => setSoldiers(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSave = (s, mode) => {
    if (mode === 'create') setSoldiers(p => [...p, s]);
    else setSoldiers(p => p.map(x => x._id === s._id || x.id === s.id ? s : x));
  };

  const handleToggle = async (s) => {
    try {
      const res = await api.patch(`/users/${s._id || s.id}/toggle-active`);
      setSoldiers(p => p.map(x => (x._id || x.id) === (s._id || s.id) ? { ...x, is_active: res.data.is_active } : x));
      if (viewSoldier) setViewSoldier(v => ({ ...v, is_active: res.data.is_active }));
      addToast(res.data.message, 'success');
    } catch (err) { addToast(err.response?.data?.error || 'Erro', 'error'); }
  };

  const handleDelete = async (s) => {
    try {
      await api.delete(`/users/${s._id || s.id}`);
      setSoldiers(p => p.filter(x => (x._id || x.id) !== (s._id || s.id)));
      setViewSoldier(null);
      addToast(`${s.war_name} excluído`, 'success');
    } catch (err) { addToast(err.response?.data?.error || 'Erro', 'error'); }
  };

  const toggleSort = (k) => setSort(s => s.key === k ? { key:k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key:k, dir:'asc' });

  const filtered = useMemo(() => {
    let list = [...soldiers];
    if (filter === 'active')   list = list.filter(s => s.is_active);
    if (filter === 'inactive') list = list.filter(s => !s.is_active);
    if (filter === 'pending')  list = list.filter(s => s.first_access);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.war_name?.toLowerCase().includes(q) || s.war_number?.toLowerCase().includes(q) ||
        s.full_name?.toLowerCase().includes(q) || getRankLabel(s.rank).toLowerCase().includes(q) ||
        s.squad?.toLowerCase().includes(q) || s.platoon?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[sort.key] || '', vb = b[sort.key] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [soldiers, filter, search, sort]);

  const SortIcon = ({ k }) => (
    <span style={{ marginLeft:4, opacity: sort.key === k ? 1 : 0.3 }}>
      {sort.key === k && sort.dir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
    </span>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Gestão de Pessoal</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, letterSpacing:'0.08em', color:'var(--text-primary)', lineHeight:1 }}>EFETIVO MILITAR</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditSoldier(null); setShowModal(true); }} style={{ gap:8 }}>
          <Plus size={16} /> Novo Soldado
        </button>
      </div>
      <div style={{ height:3, background:'linear-gradient(90deg,var(--accent) 0%,var(--olive-700) 40%,transparent 100%)', borderRadius:2 }} />

      {/* Stats */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[
          { icon:Users, label:'Total', value:soldiers.length, color:'var(--accent)' },
          { icon:UserCheck, label:'Ativos', value:soldiers.filter(s=>s.is_active).length, color:'var(--success)' },
          { icon:UserXIcon, label:'Inativos', value:soldiers.filter(s=>!s.is_active).length, color:'var(--danger)' },
          { icon:Clock, label:'Pendentes', value:soldiers.filter(s=>s.first_access).length, color:'var(--warning)' },
        ].map(({ icon:Icon, label, value, color }) => (
          <div key={label} className="card" style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:10, minWidth:110 }}>
            <Icon size={15} style={{ color }} />
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, lineHeight:1 }}>{value}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft:36 }} type="text" placeholder="Buscar por nome, número, patente, esquadrão..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
          <Filter size={14} style={{ color:'var(--text-muted)', alignSelf:'center' }} />
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding:'6px 12px', borderRadius:4, border:`1px solid ${filter===f.key?'var(--accent)':'var(--border)'}`, background:filter===f.key?'var(--accent)':'white', color:filter===f.key?'white':'var(--text-secondary)', fontSize:12, fontFamily:'var(--font-mono)', cursor:'pointer', transition:'all 0.15s', letterSpacing:'0.04em' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('war_number')} style={{ cursor:'pointer', userSelect:'none' }}>Nº Guerra<SortIcon k="war_number" /></th>
              <th onClick={() => toggleSort('war_name')} style={{ cursor:'pointer', userSelect:'none' }}>Nome de Guerra<SortIcon k="war_name" /></th>
              <th onClick={() => toggleSort('rank')} style={{ cursor:'pointer', userSelect:'none' }}>Patente<SortIcon k="rank" /></th>
              <th>Esquadrão / Pelotão</th>
              <th onClick={() => toggleSort('last_login')} style={{ cursor:'pointer', userSelect:'none' }}>Último Acesso<SortIcon k="last_login" /></th>
              <th>Status</th>
              <th style={{ textAlign:'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:'32px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>
                <span className="spinner" style={{ borderTopColor:'var(--accent)', display:'inline-block', marginRight:8 }} />Carregando...
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:'48px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>
                {search ? 'Nenhum resultado' : 'Nenhum soldado cadastrado'}
              </td></tr>
            )}
            {filtered.map((s, i) => {
              const id = s._id || s.id;
              return (
                <tr key={id} style={{ animation:`fadeIn ${0.1+i*0.02}s ease`, cursor:'pointer' }} onClick={() => setViewSoldier(s)}>
                  <td><span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', letterSpacing:'0.06em' }}>{s.war_number}</span></td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:6, background:'linear-gradient(135deg,var(--khaki-300) 0%,var(--khaki-500) 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontFamily:'var(--font-display)', fontSize:14, color:'white' }}>{s.war_name[0]}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, letterSpacing:'0.04em' }}>{s.war_name}</div>
                        {s.full_name && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.full_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-rank">{getRankShort(s.rank)}</span></td>
                  <td><div style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.squad||'—'}{s.platoon?` / ${s.platoon}`:''}</div></td>
                  <td><span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>{formatDate(s.last_login)}</span></td>
                  <td>
                    <span className={`badge badge-${s.is_active?'active':'inactive'}`}>{s.is_active?'Ativo':'Inativo'}</span>
                    {s.first_access && <span className="badge badge-pending" style={{ marginLeft:4 }}>Pendente</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-icon btn-ghost btn-sm" title="Ver detalhes" onClick={() => setViewSoldier(s)}><Eye size={14} /></button>
                      <button className="btn btn-icon btn-ghost btn-sm" title="Editar" onClick={() => { setEditSoldier(s); setShowModal(true); }}><Pencil size={14} /></button>
                      <button className="btn btn-icon btn-ghost btn-sm" title="Permissões" style={{ color:'var(--accent)' }} onClick={() => setPermSoldier(s)}><Key size={14} /></button>
                      {s.war_number !== 'ADM001' && (
                        <button className="btn btn-icon btn-ghost btn-sm" title={s.is_active?'Desativar':'Ativar'}
                          style={{ color: s.is_active?'var(--danger)':'var(--success)' }}
                          onClick={() => handleToggle(s)}>
                          {s.is_active ? <UserXIcon size={14} /> : <UserCheck size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', textAlign:'right' }}>{filtered.length} de {soldiers.length} registros</div>

      {showModal && <SoldierModal soldier={editSoldier} onClose={() => { setShowModal(false); setEditSoldier(null); }} onSave={handleSave} addToast={addToast} />}
      {viewSoldier && <SoldierDetailModal soldier={viewSoldier} onClose={() => setViewSoldier(null)}
        onEdit={() => { setEditSoldier(viewSoldier); setViewSoldier(null); setShowModal(true); }}
        onPermissions={() => { setPermSoldier(viewSoldier); setViewSoldier(null); }}
        onToggleActive={() => handleToggle(viewSoldier)}
        onDelete={() => handleDelete(viewSoldier)} />}
      {permSoldier && <PermissionsModal soldier={permSoldier} onClose={() => setPermSoldier(null)} addToast={addToast} />}
    </div>
  );
}
