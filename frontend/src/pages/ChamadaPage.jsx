import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, CheckCircle, XCircle, Clock, Send, RotateCcw,
  AlertCircle, ChevronDown, ChevronUp, Filter, Search, Users
} from 'lucide-react';
import api from '../utils/api';
import { getRankShort, STATUS_COLORS, STATUS_LABELS, formatDate, SQUADS, PLATOONS } from '../utils/constants';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, padding:'3px 10px', borderRadius:20, background:c.bg, color:c.text, border:`1px solid ${c.border}`, letterSpacing:'0.04em' }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function ChamadaPage() {
  const [rollCall, setRollCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ label:'', squad:'', platoon:'', general_observation:'' });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandObs, setExpandObs] = useState({});
  const [lateModal, setLateModal] = useState(null); // entry being edited for late
  const { toasts, addToast, removeToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const [d, m, y] = todayStr.split('-');
  const todayPT = `${d}/${m}/${y}`;

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/rollcall/today');
      setRollCall(res.data);
    } catch { setRollCall(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadToday(); }, []);

  const createRollCall = async () => {
    setCreating(true);
    try {
      const res = await api.post('/rollcall', { ...newForm });
      setRollCall(res.data);
      setShowCreate(false);
      setNewForm({ label:'', squad:'', platoon:'', general_observation:'' });
      addToast('Chamada aberta com sucesso', 'success');
    } catch (err) { addToast(err.response?.data?.error || 'Erro ao criar chamada', 'error'); }
    finally { setCreating(false); }
  };

  const updateEntry = async (entryId, patch) => {
    if (!rollCall || rollCall.status === 'submitted') return;
    try {
      const res = await api.patch(`/rollcall/${rollCall._id}/entry/${entryId}`, patch);
      setRollCall(rc => ({
        ...rc,
        entries: rc.entries.map(e => e._id === entryId ? { ...e, ...res.data } : e)
      }));
    } catch (err) { addToast(err.response?.data?.error || 'Erro ao atualizar', 'error'); }
  };

  const setStatus = (entry, status) => {
    if (status === 'late') {
      setLateModal({ ...entry, newStatus: 'late' });
      return;
    }
    updateEntry(entry._id, { status });
  };

  const saveLate = async () => {
    await updateEntry(lateModal._id, {
      status: 'late',
      arrival_time: lateModal.arrival_time || null,
      observation: lateModal.observation || null,
    });
    setLateModal(null);
  };

  const submitRollCall = async () => {
    const pending = rollCall.entries.filter(e => e.status === 'pending').length;
    const msg = pending > 0 ? `${pending} soldado(s) ainda pendente(s). Eles serão marcados como ausentes. Confirmar envio?` : 'Confirmar envio da chamada?';
    if (!window.confirm(msg)) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/rollcall/${rollCall._id}/submit`);
      setRollCall(res.data);
      addToast('Chamada enviada com sucesso', 'success');
    } catch (err) { addToast(err.response?.data?.error || 'Erro ao enviar', 'error'); }
    finally { setSubmitting(false); }
  };

  const reopenRollCall = async () => {
    setReopening(true);
    try {
      const res = await api.post(`/rollcall/${rollCall._id}/reopen`);
      setRollCall(res.data);
      addToast('Chamada reaberta para edição', 'success');
    } catch (err) { addToast(err.response?.data?.error || 'Erro ao reabrir', 'error'); }
    finally { setReopening(false); }
  };

  const entries = rollCall?.entries || [];
  const isEditable = rollCall && rollCall.status !== 'submitted';

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.war_name.toLowerCase().includes(search.toLowerCase()) || e.war_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: entries.length,
    present: entries.filter(e=>e.status==='present').length,
    absent: entries.filter(e=>e.status==='absent').length,
    late: entries.filter(e=>e.status==='late').length,
    pending: entries.filter(e=>e.status==='pending').length,
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>
            {todayPT}
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, letterSpacing:'0.08em', lineHeight:1 }}>CHAMADA DO DIA</h1>
        </div>
        {!loading && !rollCall && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ gap:8 }}>
            <Plus size={16} /> Abrir Chamada
          </button>
        )}
        {rollCall && isEditable && (
          <button className="btn btn-primary" onClick={submitRollCall} disabled={submitting} style={{ gap:8 }}>
            {submitting ? <><span className="spinner" style={{ borderTopColor:'white' }} />Enviando...</> : <><Send size={16} />Enviar Chamada</>}
          </button>
        )}
        {rollCall && rollCall.status === 'submitted' && (
          <button className="btn btn-secondary" onClick={reopenRollCall} disabled={reopening} style={{ gap:8 }}>
            {reopening ? <><span className="spinner" />Reabrindo...</> : <><RotateCcw size={16} />Reabrir Chamada</>}
          </button>
        )}
      </div>

      <div style={{ height:3, background:'linear-gradient(90deg,var(--accent) 0%,var(--olive-700) 40%,transparent 100%)', borderRadius:2 }} />

      {/* Create form */}
      {showCreate && (
        <div className="card" style={{ padding:20, animation:'fadeIn 0.25s ease', border:'1px solid var(--accent)' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)', letterSpacing:'0.08em', marginBottom:16, textTransform:'uppercase' }}>
            Nova Chamada — {todayPT}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">Rótulo (opcional)</label>
              <input className="form-input" type="text" placeholder="Ex: Chamada da manhã" value={newForm.label} onChange={e => setNewForm(f=>({...f,label:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Filtrar por Esquadrão</label>
              <select className="form-input" value={newForm.squad} onChange={e => setNewForm(f=>({...f,squad:e.target.value}))}>
                <option value="">Todos os esquadrões</option>
                {SQUADS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Filtrar por Pelotão</label>
              <select className="form-input" value={newForm.platoon} onChange={e => setNewForm(f=>({...f,platoon:e.target.value}))}>
                <option value="">Todos os pelotões</option>
                {PLATOONS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">Observação Geral</label>
              <input className="form-input" type="text" placeholder="Observação opcional" value={newForm.general_observation} onChange={e => setNewForm(f=>({...f,general_observation:e.target.value}))} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={createRollCall} disabled={creating} style={{ gap:8 }}>
              {creating ? <><span className="spinner" style={{ borderTopColor:'white' }}/>Criando...</> : <><Plus size={15}/>Abrir Chamada</>}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          <span className="spinner" style={{ borderTopColor:'var(--accent)', width:28, height:28, borderWidth:3, display:'inline-block', marginBottom:12 }} />
          <div style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>Carregando chamada...</div>
        </div>
      )}

      {/* No roll call today */}
      {!loading && !rollCall && !showCreate && (
        <div className="card" style={{ padding:48, textAlign:'center' }}>
          <ClipboardList size={40} style={{ color:'var(--border-strong)', margin:'0 auto 16px' }} />
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, letterSpacing:'0.08em', color:'var(--text-primary)', marginBottom:8 }}>
            NENHUMA CHAMADA HOJE
          </div>
          <p style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>
            {todayPT} — Clique em "Abrir Chamada" para iniciar
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ gap:8 }}>
            <Plus size={16} /> Abrir Chamada do Dia
          </button>
        </div>
      )}

      {/* Roll call content */}
      {rollCall && (
        <>
          {/* Status bar */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div className="card" style={{ display:'flex', gap:1, overflow:'hidden', flex:1, minWidth:300 }}>
              {[
                { key:'present', label:'Presentes', color:'var(--success)', bg:'#d4edda' },
                { key:'absent',  label:'Ausentes',  color:'var(--danger)',  bg:'#f8d7da' },
                { key:'late',    label:'Atrasados', color:'var(--warning)', bg:'#fff3cd' },
                { key:'pending', label:'Pendentes', color:'var(--text-muted)', bg:'#f0f0f0' },
              ].map(s => (
                <div key={s.key} style={{ flex:1, padding:'12px 8px', textAlign:'center', background:s.bg, borderRight:'1px solid rgba(255,255,255,0.5)' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:s.color, lineHeight:1 }}>{stats[s.key]}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:s.color, opacity:0.8, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <span className={`badge badge-${rollCall.status==='submitted'?'active':rollCall.status==='open'?'pending':'pending'}`} style={{ fontSize:11 }}>
                {rollCall.status==='submitted'?'Enviada':rollCall.status==='reopened'?'Reaberta':'Em Andamento'}
              </span>
              {rollCall.label && <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>{rollCall.label}</span>}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background:'var(--border)', borderRadius:4, height:6, overflow:'hidden' }}>
            <div style={{ height:'100%', display:'flex' }}>
              <div style={{ width:`${(stats.present/stats.total)*100}%`, background:'var(--success)', transition:'width 0.4s' }} />
              <div style={{ width:`${(stats.late/stats.total)*100}%`, background:'var(--warning)', transition:'width 0.4s' }} />
              <div style={{ width:`${(stats.absent/stats.total)*100}%`, background:'var(--danger)', transition:'width 0.4s' }} />
            </div>
          </div>

          {/* Submitted notice */}
          {rollCall.status === 'submitted' && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'var(--success-light)', border:'1px solid rgba(74,107,58,0.2)', borderRadius:6 }}>
              <CheckCircle size={16} style={{ color:'var(--success)' }} />
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--success)' }}>
                Chamada enviada em {formatDate(rollCall.submitted_at)} — Use "Reabrir" para editar
              </span>
            </div>
          )}

          {/* Search + filter bar */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:180 }}>
              <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className="form-input" style={{ paddingLeft:32, height:36, fontSize:13 }} type="text" placeholder="Buscar soldado..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display:'flex', gap:5 }}>
              {['all','pending','present','absent','late'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  padding:'6px 10px', borderRadius:4, fontSize:11, fontFamily:'var(--font-mono)', cursor:'pointer', border:'1px solid',
                  borderColor: filterStatus===s ? 'var(--accent)' : 'var(--border)',
                  background: filterStatus===s ? 'var(--accent)' : 'white',
                  color: filterStatus===s ? 'white' : 'var(--text-secondary)',
                }}>
                  {s==='all'?'Todos':STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Entries list */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <Users size={13} style={{ color:'var(--accent)' }} />
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', letterSpacing:'0.08em' }}>
                {filtered.length} SOLDADO(S)
              </span>
            </div>
            <div>
              {filtered.length === 0 && (
                <div style={{ padding:32, textAlign:'center', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>Nenhum soldado encontrado</div>
              )}
              {filtered.map((entry, i) => {
                const c = STATUS_COLORS[entry.status];
                return (
                  <div key={entry._id} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                    borderBottom: i < filtered.length-1 ? '1px solid var(--bg-secondary)' : 'none',
                    background: i%2===0 ? 'white' : 'var(--bg-primary)',
                    transition:'background 0.15s',
                    animation:`fadeIn ${0.1+i*0.015}s ease`,
                  }}>
                    {/* Avatar */}
                    <div style={{ width:36, height:36, borderRadius:6, background:`linear-gradient(135deg,${c.bg} 0%,${c.border} 100%)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:`1px solid ${c.border}` }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:16, color:c.text }}>{entry.war_name[0]}</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, letterSpacing:'0.04em' }}>{entry.war_name}</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>{entry.war_number}</span>
                        <span className="badge badge-rank" style={{ fontSize:10 }}>{getRankShort(entry.rank)}</span>
                        {entry.platoon && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>{entry.platoon}</span>}
                      </div>
                      {entry.status === 'late' && entry.arrival_time && (
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--warning)', marginTop:2 }}>
                          <Clock size={10} style={{ display:'inline', marginRight:3 }} />Chegou às {entry.arrival_time}
                        </div>
                      )}
                      {entry.observation && (
                        <div style={{ fontFamily:'var(--font-body)', fontSize:11, color:'var(--text-muted)', marginTop:2, fontStyle:'italic' }}>{entry.observation}</div>
                      )}
                    </div>

                    {/* Status display */}
                    <StatusBadge status={entry.status} />

                    {/* Action buttons — only if editable */}
                    {isEditable && (
                      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                        <button onClick={() => setStatus(entry, 'present')} title="Presente"
                          style={{ width:34, height:34, borderRadius:6, border:'none', cursor:'pointer', background: entry.status==='present'?'#28a745':'var(--bg-secondary)', color: entry.status==='present'?'white':'#28a745', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => setStatus(entry, 'late')} title="Atrasado"
                          style={{ width:34, height:34, borderRadius:6, border:'none', cursor:'pointer', background: entry.status==='late'?'#ffc107':'var(--bg-secondary)', color: entry.status==='late'?'white':'#856404', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
                          <Clock size={16} />
                        </button>
                        <button onClick={() => setStatus(entry, 'absent')} title="Ausente"
                          style={{ width:34, height:34, borderRadius:6, border:'none', cursor:'pointer', background: entry.status==='absent'?'#dc3545':'var(--bg-secondary)', color: entry.status==='absent'?'white':'#dc3545', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', flexShrink:0 }}>
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* General obs */}
          {isEditable && (
            <div className="form-group">
              <label className="form-label">Observação Geral da Chamada</label>
              <input className="form-input" type="text" placeholder="Observação opcional para todo o boletim..."
                defaultValue={rollCall.general_observation || ''}
                onBlur={async e => {
                  try { await api.patch(`/rollcall/${rollCall._id}`, { general_observation: e.target.value }); }
                  catch {}
                }} />
            </div>
          )}
        </>
      )}

      {/* Late modal */}
      {lateModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setLateModal(null)}>
          <div className="modal-content" style={{ maxWidth:380 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-secondary)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', marginBottom:4 }}>MARCAR COMO ATRASADO</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:'0.06em' }}>{lateModal.war_name}</h3>
            </div>
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label"><Clock size={10} style={{ display:'inline', marginRight:4 }} />Horário de Chegada (opcional)</label>
                <input className="form-input" type="time" value={lateModal.arrival_time || ''} onChange={e => setLateModal(m=>({...m,arrival_time:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Observação (opcional)</label>
                <input className="form-input" type="text" placeholder="Motivo do atraso..." value={lateModal.observation || ''} onChange={e => setLateModal(m=>({...m,observation:e.target.value}))} />
              </div>
            </div>
            <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end', background:'var(--bg-secondary)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setLateModal(null)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={saveLate} style={{ gap:6, background:'#856404', borderColor:'#856404' }}>
                <Clock size={14} /> Confirmar Atraso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
