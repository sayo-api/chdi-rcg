import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Settings, Trash2, X, Users,
  Zap, Info, Save, Plus, UserX, CheckCircle, Download, FileText, Calendar,
} from 'lucide-react';
import api from '../utils/api';
import {
  RANKS, getRankShort, getCellStatus, CELL_STATUS_LIST,
  MONTH_NAMES_PT, WEEKDAY_SHORT,
} from '../utils/constants';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import DutyTypesEditor from '../components/DutyTypesEditor';
import AutoGenModal from '../components/AutoGenModal';
import ExportModal from '../components/ExportModal';
import AssignmentPanel from '../components/AssignmentPanel';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const padZ = n  => String(n).padStart(2,'0');
const mStr = (y,m) => `${y}-${padZ(m)}`;
const dStr = (y,m,d) => `${y}-${padZ(m)}-${padZ(d)}`;
const daysInMonth = (y,m) => new Date(y,m,0).getDate();
const dowOf = (y,m,d) => new Date(`${y}-${padZ(m)}-${padZ(d)}`).getDay();
const isWE  = w => w===0||w===6;
const todayISO = () => new Date().toISOString().split('T')[0];

/* ── Grid cell (shows stacked soldiers) ──────────────────────────────────── */
function ScaleCell({ entries, dutyType, onClick, weekday }) {
  const we    = isWE(weekday);
  const count = entries.filter(e => e.soldier_id).length;
  const empty = count === 0;

  // colour: use first entry's status/color as reference, or neutral
  const first  = entries.find(e => e.soldier_id);
  const st     = getCellStatus(first?.status || 'vazio');
  const bg     = first?.custom_color || (empty ? (we ? '#ece9e1' : '#f8f9fa') : st.color);
  const border = we ? '#c8c0b0' : (first?.custom_color ? first.custom_color+'88' : st.border);

  return (
    <td
      onClick={onClick}
      title={entries.filter(e=>e.soldier_id).map(e=>e.war_name).join(', ') || 'Clique para escalar'}
      style={{
        minWidth: 80, maxWidth: 80, padding: '3px 4px',
        background: bg, cursor: 'pointer', verticalAlign: 'top',
        border: '1px solid', borderColor: border,
        transition: 'filter 0.1s', userSelect: 'none',
        minHeight: 52,
      }}
      onMouseEnter={e => e.currentTarget.style.filter='brightness(0.91)'}
      onMouseLeave={e => e.currentTarget.style.filter='brightness(1)'}
    >
      {empty ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:46, color:'#c8c0a8', fontSize:15 }}>+</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:2, paddingTop:2, paddingBottom:2 }}>
          {entries.filter(e=>e.soldier_id).map((e,i) => {
            const s = getCellStatus(e.status||'normal');
            return (
              <div key={i} style={{
                fontFamily:'var(--font-mono)', fontSize:9, fontWeight:700, lineHeight:1.2,
                padding:'1px 3px', borderRadius:2,
                background: e.custom_color ? e.custom_color+'33' : (e.status!=='normal' ? s.color : 'transparent'),
                color: e.custom_color ? '#1a1914' : s.text,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:74,
              }}>
                {e.war_name?.split(' ')[0]}
                {e.status!=='normal' && <span style={{ fontSize:7, opacity:0.75, marginLeft:2 }}>({s.label.slice(0,4)})</span>}
              </div>
            );
          })}
          {count > 0 && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color: st.text, opacity:0.5, paddingLeft:2 }}>
              {count} escalado{count>1?'s':''}
            </div>
          )}
        </div>
      )}
    </td>
  );
}

/* ── Multi-soldier cell modal ────────────────────────────────────────────── */
const RANK_TIERS = {
  soldado_ev:0,soldado_ep:0,cabo:1,terceiro_sargento:2,segundo_sargento:2,
  primeiro_sargento:2,subtenente:3,aspirante:4,segundo_tenente:4,
  primeiro_tenente:4,capitao:5,major:6,tenente_coronel:7,coronel:8,
  general_brigada:9,general_divisao:9,general_exercito:9,marechal:10,comandante:11,
};

function CellModal({ cell, soldiers, onSave, onClose, saving }) {
  const { dutyType, date, entries: initEntries } = cell;

  // rows: each row = one assigned slot
  const [rows, setRows] = useState(() => {
    const existing = (initEntries||[]).filter(e=>e.soldier_id).map(e=>({
      soldier_id:   String(e.soldier_id),
      war_name:     e.war_name,
      war_number:   e.war_number,
      rank:         e.rank,
      status:       e.status||'normal',
      custom_color: e.custom_color||'',
      observation:  e.observation||'',
    }));
    return existing.length ? existing : [emptyRow()];
  });

  function emptyRow() {
    return { soldier_id:'', war_name:'', war_number:'', rank:'', status:'normal', custom_color:'', observation:'' };
  }

  const minT = RANK_TIERS[dutyType.min_rank] ?? 0;
  const maxT = dutyType.max_rank ? (RANK_TIERS[dutyType.max_rank] ?? 99) : 99;
  const eligible = soldiers.filter(s => { const t = RANK_TIERS[s.rank]??0; return t>=minT && t<=maxT; });

  const updateRow = (i, patch) => setRows(prev => prev.map((r,idx) => idx===i ? {...r,...patch} : r));
  const addRow    = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = i  => setRows(prev => prev.length===1 ? [emptyRow()] : prev.filter((_,idx)=>idx!==i));

  const selectSoldier = (i, soldierIdVal) => {
    const s = soldiers.find(x => String(x._id)===soldierIdVal);
    if (s) updateRow(i, { soldier_id: String(s._id), war_name: s.war_name, war_number: s.war_number, rank: s.rank });
    else   updateRow(i, { soldier_id:'', war_name:'', war_number:'', rank:'' });
  };

  // Which soldiers are already selected in OTHER rows
  const taken = new Set(rows.map((r,idx)=>r.soldier_id).filter(Boolean));

  const [d, m, y] = date.split('-').reverse();
  const weekday   = new Date(date).getDay();

  const handleSave = () => {
    const valid = rows.filter(r => r.soldier_id);
    onSave(valid);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth:580 }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-secondary)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', letterSpacing:'0.1em', marginBottom:3, textTransform:'uppercase' }}>
              {dutyType.abbrev} — {WEEKDAY_SHORT[weekday]}, {d}/{m}/{y.slice(-2)}
            </div>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:17, letterSpacing:'0.06em', lineHeight:1 }}>{dutyType.label}</h3>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
              {eligible.length} soldados elegíveis · faixa: {RANKS.find(r=>r.value===dutyType.min_rank)?.short||dutyType.min_rank}
              {dutyType.max_rank ? ` → ${RANKS.find(r=>r.value===dutyType.max_rank)?.short||dutyType.max_rank}` : ' → sem limite'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}><X size={18} /></button>
        </div>

        {/* Rows */}
        <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:10, maxHeight:'55vh', overflowY:'auto' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:2 }}>
            Soldados escalados para este dia
          </div>

          {rows.map((row, i) => (
            <div key={i} style={{
              border:'1px solid var(--border)', borderRadius:6, overflow:'hidden',
              background: row.soldier_id ? 'white' : 'var(--bg-secondary)',
              animation:'fadeIn 0.15s ease',
            }}>
              {/* Soldier selector */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderBottom: row.soldier_id ? '1px solid var(--bg-secondary)' : 'none' }}>
                <div style={{
                  width:24, height:24, borderRadius:4, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-mono)', fontSize:11, color:'white', fontWeight:700, flexShrink:0,
                }}>
                  {i+1}
                </div>
                <select className="form-input" value={row.soldier_id}
                  onChange={e => selectSoldier(i, e.target.value)}
                  style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:12 }}>
                  <option value="">— Selecionar soldado —</option>
                  {eligible.map(s => (
                    <option key={s._id} value={String(s._id)}
                      disabled={taken.has(String(s._id)) && String(s._id)!==row.soldier_id}>
                      {s.war_name} · {s.war_number} · {getRankShort(s.rank)}
                      {taken.has(String(s._id)) && String(s._id)!==row.soldier_id ? ' (já escalado)' : ''}
                    </option>
                  ))}
                </select>
                <button onClick={() => removeRow(i)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:4, display:'flex', flexShrink:0 }}>
                  <UserX size={16} />
                </button>
              </div>

              {/* Per-soldier details (only if a soldier is selected) */}
              {row.soldier_id && (
                <div style={{ padding:'10px 12px', display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, background:'var(--bg-primary)' }}>
                  {/* Status */}
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" style={{ fontFamily:'var(--font-mono)', fontSize:11 }}
                      value={row.status} onChange={e => updateRow(i,{status:e.target.value})}>
                      {CELL_STATUS_LIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  {/* Observation */}
                  <div className="form-group">
                    <label className="form-label">Observação</label>
                    <input className="form-input" type="text" placeholder="Opcional..."
                      value={row.observation} onChange={e => updateRow(i,{observation:e.target.value})}
                      style={{ fontSize:12 }} />
                  </div>
                  {/* Color */}
                  <div className="form-group">
                    <label className="form-label">Cor</label>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input type="color" value={row.custom_color||'#ffffff'}
                        onChange={e => updateRow(i,{custom_color:e.target.value})}
                        style={{ width:32, height:32, padding:2, border:'1px solid var(--border)', borderRadius:4, cursor:'pointer' }} />
                      {row.custom_color &&
                        <button onClick={() => updateRow(i,{custom_color:''})}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:10, padding:'2px 4px' }}>✕</button>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add row button */}
          <button onClick={addRow} className="btn btn-secondary btn-sm"
            style={{ alignSelf:'flex-start', gap:6, borderStyle:'dashed' }}>
            <Plus size={13} /> Adicionar outro soldado
          </button>

          {/* Summary */}
          {rows.filter(r=>r.soldier_id).length > 0 && (
            <div style={{ padding:'8px 12px', background:'rgba(94,114,68,0.06)', border:'1px solid rgba(94,114,68,0.2)', borderRadius:4, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:8 }}>
              <CheckCircle size={13} style={{ color:'var(--accent)' }} />
              {rows.filter(r=>r.soldier_id).length} soldado{rows.filter(r=>r.soldier_id).length>1?'s':''} escalado{rows.filter(r=>r.soldier_id).length>1?'s':''} neste dia
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end', background:'var(--bg-secondary)' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" style={{ gap:6 }} disabled={saving} onClick={handleSave}>
            {saving
              ? <><span className="spinner" style={{ borderTopColor:'white', width:13, height:13, borderWidth:2 }} />Salvando...</>
              : <><Save size={14} />Salvar Escalação</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function EscalaPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()+1);
  const [scale,   setScale]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [soldiers, setSoldiers] = useState([]);
  const [editCell,   setEditCell]   = useState(null); // { dutyType, date, entries[] }
  const [savingCell, setSavingCell] = useState(false);
  const [showDuty, setShowDuty] = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const [showExport, setShowExport]   = useState(false);
  const [showAssign, setShowAssign]   = useState(false);
  const [editName,   setEditName]   = useState(false);
  const [nameVal,    setNameVal]    = useState('');
  const [savingName, setSavingName] = useState(false);
  // Download state
  const [dlDay,      setDlDay]      = useState(todayISO());
  const [downloading,setDownloading]= useState(null); // 'day' | 'month' | null
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    api.get('/users').then(r => setSoldiers(r.data)).catch(() => {});
  }, []);

  const loadScale = useCallback(async () => {
    setLoading(true); setScale(null);
    try {
      const res = await api.get(`/scale/month/${mStr(year,month)}`);
      setScale(res.data);
    } catch { addToast('Erro ao carregar escala','error'); }
    finally   { setLoading(false); }
  }, [year, month]);

  useEffect(() => { loadScale(); }, [loadScale]);

  const goTo = (y,m) => {
    if (m<1)  { setYear(y-1); setMonth(12); }
    else if (m>12) { setYear(y+1); setMonth(1); }
    else { setYear(y); setMonth(m); }
  };

  const totalDays = daysInMonth(year, month);
  const todayStr  = todayISO();
  const activeDT  = (scale?.duty_types||[]).filter(d=>d.active).sort((a,b)=>a.order-b.order);

  /* Build map: "dutyKey|date" → entries[] */
  const entryMap = useMemo(() => {
    const m = {};
    if (!scale) return m;
    for (const e of scale.entries) {
      const k = `${e.duty_type_key}|${e.date}`;
      if (!m[k]) m[k] = [];
      m[k].push(e);
    }
    // sort each group by slot
    for (const k of Object.keys(m)) m[k].sort((a,b)=>(a.slot||0)-(b.slot||0));
    return m;
  }, [scale]);

  const stats = useMemo(() => {
    if (!scale) return { filled:0, empty:0, special:0, pct:0, totalSlots:0 };
    const allSlots = activeDT.reduce((a,dt)=>a+totalDays,0); // 1 cell per day per duty
    const filledCells = activeDT.reduce((a,dt)=> {
      let c=0;
      for(let d=1;d<=totalDays;d++) { const k=`${dt.key}|${dStr(year,month,d)}`; if((entryMap[k]||[]).some(e=>e.soldier_id)) c++; }
      return a+c;
    },0);
    const special = scale.entries.filter(e=>e.status&&e.status!=='normal'&&e.status!=='vazio').length;
    return { filled:filledCells, empty:allSlots-filledCells, special, pct:Math.round((filledCells/(allSlots||1))*100), totalSlots:allSlots };
  }, [scale, activeDT, entryMap, totalDays, year, month]);

  /* Open cell: gather existing entries for that (duty, date) */
  const openCell = (dt, date) => {
    const k = `${dt.key}|${date}`;
    setEditCell({ dutyType: dt, date, entries: entryMap[k] || [] });
  };

  /* Save: call cell-multi endpoint */
  const handleSaveCell = async (rows) => {
    setSavingCell(true);
    const { dutyType, date } = editCell;
    try {
      await api.patch(`/scale/${scale._id}/cell-multi`, {
        duty_type_key: dutyType.key,
        date,
        soldiers: rows,
      });
      // Update local state
      setScale(prev => {
        // Remove old entries for this (dutyType, date)
        const filtered = prev.entries.filter(
          e => !(e.duty_type_key===dutyType.key && e.date===date)
        );
        // Add new entries
        rows.forEach((r,idx) => {
          if (!r.soldier_id) return;
          filtered.push({
            _id: `tmp_${Date.now()}_${idx}`,
            duty_type_key: dutyType.key, date, slot: idx,
            soldier_id:  r.soldier_id,
            war_name:    r.war_name,
            war_number:  r.war_number,
            rank:        r.rank,
            status:      r.status||'normal',
            custom_color:r.custom_color||null,
            observation: r.observation||null,
            auto_assigned: false,
          });
        });
        return { ...prev, entries: filtered };
      });
      setEditCell(null);
      const n = rows.filter(r=>r.soldier_id).length;
      addToast(n===0 ? 'Escalação removida' : `${n} soldado${n>1?'s':''} escalado${n>1?'s':''}`, 'success');
    } catch (err) {
      addToast(err.response?.data?.error||'Erro ao salvar','error');
    } finally { setSavingCell(false); }
  };

  const handleRename = async () => {
    if (!nameVal.trim()) return;
    setSavingName(true);
    try {
      await api.put(`/scale/${scale._id}`,{name:nameVal.trim()});
      setScale(p=>({...p,name:nameVal.trim()}));
      setEditName(false);
      addToast('Nome atualizado','success');
    } catch { addToast('Erro ao renomear','error'); }
    finally { setSavingName(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Excluir "${scale?.name}"? Uma escala vazia será criada automaticamente.`)) return;
    try { await api.delete(`/scale/${scale._id}`); addToast('Escala excluída','success'); loadScale(); }
    catch { addToast('Erro ao excluir','error'); }
  };

  const downloadDoc = async (type) => {
    if (!scale) return;
    setDownloading(type);
    try {
      const token = localStorage.getItem('military_token');
      const url   = type==='day'
        ? `/api/scale-export/${scale._id}/day/${dlDay}`
        : `/api/scale-export/${scale._id}/month`;
      const resp = await fetch(url, { headers: { Authorization:`Bearer ${token}` } });
      if (!resp.ok) { const e=await resp.json(); throw new Error(e.error||'Erro'); }
      const blob = await resp.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = type==='day' ? `escala_dia_${dlDay}.docx` : `escala_${scale.month}.docx`;
      a.click();
      URL.revokeObjectURL(a.href);
      addToast('Documento Word gerado com sucesso!','success');
    } catch(err) {
      addToast(err.message||'Erro ao gerar documento','error');
    } finally { setDownloading(null); }
  };

  const downloadSelected = async (dates, title) => {
    if (!scale || !dates.length) return;
    setDownloading('selected');
    try {
      const token = localStorage.getItem('military_token');
      const resp  = await fetch(`/api/scale-export/${scale._id}/selected`, {
        method: 'POST',
        headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ dates, title }),
      });
      if (!resp.ok) { const e=await resp.json(); throw new Error(e.error||'Erro'); }
      const blob = await resp.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `boletim_selecionado_${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(a.href);
      addToast('Boletim Word gerado!','success');
    } catch(err) {
      addToast(err.message||'Erro ao gerar documento','error');
    } finally { setDownloading(null); setShowExport(false); }
  };

  const handleAssignSaved = useCallback((dtKey, date, rows) => {
    setScale(prev => {
      const filtered = prev.entries.filter(e => !(e.duty_type_key===dtKey && e.date===date));
      rows.forEach((r,idx) => {
        if (!r.soldier_id) return;
        filtered.push({ _id:`tmp_${Date.now()}_${idx}`, duty_type_key:dtKey, date, slot:idx, soldier_id:r.soldier_id, war_name:r.war_name, war_number:r.war_number, rank:r.rank, status:r.status||'normal', custom_color:null, observation:r.observation||null, auto_assigned:false });
      });
      return { ...prev, entries: filtered };
    });
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Gestão de Pessoal</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, letterSpacing:'0.08em', lineHeight:1 }}>ESCALA DE SERVIÇO</h1>
        </div>
        {scale && !loading && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowAssign(v=>!v)} style={{ gap:6, borderColor: showAssign?'var(--accent)':undefined, color: showAssign?'var(--accent)':undefined }}>
              <Users size={14}/> {showAssign?'Fechar Painel':'Painel de Escalação'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowExport(true)} style={{ gap:6 }}><Download size={14}/> Exportar Word</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowDuty(true)} style={{ gap:6 }}><Settings size={14}/> Editar Serviços</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowAuto(true)} style={{ gap:6 }}><Zap size={14}/> Auto-Gerar</button>
            <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} title="Excluir escala"><Trash2 size={14}/></button>
          </div>
        )}
      </div>

      <div style={{ height:3, background:'linear-gradient(90deg,var(--accent) 0%,var(--olive-700) 40%,transparent 100%)', borderRadius:2 }} />

      {/* Month nav */}
      <div style={{ display:'flex', alignItems:'center', background:'white', border:'1px solid var(--border)', borderRadius:6, padding:'4px 6px', alignSelf:'flex-start', boxShadow:'var(--shadow-sm)' }}>
        <button onClick={()=>goTo(year,month-1)} className="btn btn-ghost btn-icon btn-sm"><ChevronLeft size={17}/></button>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:180, padding:'0 10px' }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:'0.08em', lineHeight:1 }}>{MONTH_NAMES_PT[month-1]}</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>{year}</span>
        </div>
        <button onClick={()=>goTo(year,month+1)} className="btn btn-ghost btn-icon btn-sm"><ChevronRight size={17}/></button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:60 }}>
          <span className="spinner" style={{ borderTopColor:'var(--accent)', width:30, height:30, borderWidth:3, display:'inline-block', marginBottom:14 }} />
          <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>Carregando {MONTH_NAMES_PT[month-1]} {year}...</div>
        </div>
      )}

      {scale && !loading && (
        <>
          {/* Scale name (editable) */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {editName ? (
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <input className="form-input" value={nameVal} onChange={e=>setNameVal(e.target.value)}
                  style={{ fontFamily:'var(--font-mono)', fontSize:13, height:34, maxWidth:340 }} autoFocus
                  onKeyDown={e=>{if(e.key==='Enter')handleRename();if(e.key==='Escape')setEditName(false);}} />
                <button className="btn btn-primary btn-sm" onClick={handleRename} disabled={savingName} style={{ gap:5 }}>
                  {savingName ? <span className="spinner" style={{ borderTopColor:'white',width:12,height:12,borderWidth:2 }} /> : <><Save size={13}/>OK</>}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setEditName(false)}><X size={14}/></button>
              </div>
            ) : (
              <button onClick={()=>{setNameVal(scale.name);setEditName(true);}}
                style={{ fontFamily:'var(--font-display)', fontSize:16, letterSpacing:'0.06em', background:'none', border:'1px solid transparent', cursor:'pointer', color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8, padding:'4px 8px', borderRadius:4, transition:'border-color 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}
                title="Clique para renomear">
                {scale.name} <span style={{ fontFamily:'var(--font-body)', fontSize:11, color:'var(--text-muted)', fontWeight:400 }}>✎</span>
              </button>
            )}
            <span className={`badge badge-${scale.status==='published'?'active':'pending'}`} style={{ fontSize:10 }}>
              {scale.status==='published'?'Publicada':scale.status==='archived'?'Arquivada':'Rascunho'}
            </span>
          </div>

          {/* Stats */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            {[
              { label:'Dias preenchidos', v:stats.filled, c:'var(--success)' },
              { label:'Dias vazios',      v:stats.empty,  c:'var(--danger)'  },
              { label:'Status especial',  v:stats.special,c:'var(--warning)' },
            ].map(s=>(
              <div key={s.label} className="card" style={{ padding:'7px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:20, color:s.c, lineHeight:1 }}>{s.v}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
            <div className="card" style={{ padding:'7px 14px', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ height:6, width:90, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${stats.pct}%`, background:'var(--accent)', transition:'width 0.4s' }} />
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>{stats.pct}%</div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', letterSpacing:'0.08em' }}>LEGENDA:</span>
            {CELL_STATUS_LIST.filter(s=>s.key!=='normal').map(s=>(
              <span key={s.key} style={{ padding:'2px 7px', borderRadius:3, background:s.color, border:`1px solid ${s.border}`, fontFamily:'var(--font-mono)', fontSize:9, color:s.text }}>{s.label}</span>
            ))}
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)' }}>
              Clique em qualquer célula para escalar um ou mais soldados
            </span>
          </div>

          {/* Inline assignment panel */}
          {showAssign && (
            <AssignmentPanel
              scale={scale}
              soldiers={soldiers}
              onCellSaved={handleAssignSaved}
              onClose={() => setShowAssign(false)}
            />
          )}

          {/* Download toolbar — simplified, full modal now handles selection */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', padding:'12px 16px', background:'white', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-sm)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <div style={{ width:32, height:32, borderRadius:6, background:'linear-gradient(135deg,var(--accent),var(--olive-700))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Download size={15} color="white" />
              </div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:13, letterSpacing:'0.06em', lineHeight:1 }}>EXPORTAR WORD</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', marginTop:2 }}>Documento oficial formatado</div>
              </div>
            </div>
            <div style={{ width:1, height:32, background:'var(--border)', flexShrink:0 }} />
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Calendar size={13} style={{ color:'var(--text-muted)' }} />
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>Dia específico:</span>
                <input type="date" value={dlDay}
                  min={`${year}-${String(month).padStart(2,'0')}-01`}
                  max={`${year}-${String(month).padStart(2,'0')}-${String(daysInMonth(year,month)).padStart(2,'0')}`}
                  onChange={e => setDlDay(e.target.value)}
                  style={{ fontFamily:'var(--font-mono)', fontSize:12, padding:'5px 8px', border:'1px solid var(--border)', borderRadius:4, background:'var(--bg-secondary)', cursor:'pointer', height:32 }} />
              </div>
              <button onClick={() => downloadDoc('day')} disabled={!!downloading} className="btn btn-primary btn-sm" style={{ gap:6, whiteSpace:'nowrap' }}>
                {downloading==='day' ? <><span className="spinner" style={{ borderTopColor:'white', width:12, height:12, borderWidth:2 }} />Gerando...</> : <><FileText size={13}/>Boletim do Dia</>}
              </button>
            </div>
            <div style={{ width:1, height:32, background:'var(--border)', flexShrink:0 }} />
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={() => setShowExport(true)} className="btn btn-secondary btn-sm" style={{ gap:6, whiteSpace:'nowrap' }}>
                <Calendar size={13}/> Selecionar Dias…
              </button>
              <button onClick={() => downloadDoc('month')} disabled={!!downloading} className="btn btn-secondary btn-sm" style={{ gap:6, whiteSpace:'nowrap' }}>
                {downloading==='month' ? <><span className="spinner" style={{ borderTopColor:'var(--accent)', width:12, height:12, borderWidth:2 }} />Gerando...</> : <><Download size={13}/>Mês Completo</>}
              </button>
            </div>
          </div>

          {/* THE GRID */}
          <div style={{ overflowX:'auto', border:'1px solid var(--border)', borderRadius:6, boxShadow:'var(--shadow-sm)' }}>
            <table style={{ borderCollapse:'separate', borderSpacing:1, background:'#d6cfb8', minWidth:'max-content' }}>
              <thead>
                <tr>
                  <th style={{ position:'sticky', left:0, zIndex:3, minWidth:150, background:'#1a1914', padding:'8px 12px', textAlign:'left', fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.55)', letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                    SERVIÇO / DIA
                  </th>
                  {Array.from({length:totalDays},(_,i)=>i+1).map(day=>{
                    const d  = dowOf(year,month,day);
                    const ds = dStr(year,month,day);
                    const isToday = ds===todayStr;
                    return (
                      <th key={day} style={{ minWidth:80, maxWidth:80, padding:'5px 2px', textAlign:'center', background:isToday?'#5e7244':isWE(d)?'#3a3228':'#1a1914', fontFamily:'var(--font-mono)', color:'white', fontSize:11, borderBottom:isToday?'3px solid #a0c070':'none', whiteSpace:'nowrap' }}>
                        <div style={{ fontWeight:700 }}>{padZ(day)}</div>
                        <div style={{ fontSize:8, opacity:0.65 }}>{WEEKDAY_SHORT[d]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeDT.map(dt=>(
                  <tr key={dt.key}>
                    {/* Sticky label */}
                    <td style={{ position:'sticky', left:0, zIndex:2, minWidth:150, background:'white', borderRight:'2px solid var(--border)', padding:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, height:'100%', minHeight:52, paddingLeft:8, paddingRight:10, borderLeft:`4px solid ${dt.header_color}` }}>
                        <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'2px 6px', borderRadius:3, background:dt.header_color, fontFamily:'var(--font-mono)', fontSize:9, color:'white', fontWeight:700, flexShrink:0 }}>
                          {dt.abbrev}
                        </div>
                        <span style={{ fontFamily:'var(--font-body)', fontSize:11, color:'var(--text-secondary)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                          {dt.label}
                        </span>
                      </div>
                    </td>
                    {/* Day cells */}
                    {Array.from({length:totalDays},(_,i)=>i+1).map(day=>{
                      const d  = dowOf(year,month,day);
                      const ds = dStr(year,month,day);
                      const k  = `${dt.key}|${ds}`;
                      return (
                        <ScaleCell key={day} entries={entryMap[k]||[]} dutyType={dt} weekday={d}
                          onClick={()=>openCell(dt,ds)} />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>
              ✓ Salvo automaticamente · {scale.created_by?.war_name}
            </span>
            {scale.notes && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><Info size={11}/> {scale.notes}</span>}
          </div>
        </>
      )}

      {/* Modals */}
      {editCell && (
        <CellModal cell={editCell} soldiers={soldiers} saving={savingCell}
          onClose={()=>setEditCell(null)} onSave={handleSaveCell} />
      )}
      {showExport && scale && (
        <ExportModal scale={scale} onClose={()=>setShowExport(false)}
          onDownload={downloadSelected} downloading={downloading==='selected'} />
      )}
      {showDuty && scale && (
        <DutyTypesEditor scale={scale} addToast={addToast}
          onClose={()=>setShowDuty(false)} onSaved={dt=>setScale(p=>({...p,duty_types:dt}))} />
      )}
      {showAuto && scale && (
        <AutoGenModal scale={scale} addToast={addToast}
          onClose={()=>setShowAuto(false)} onDone={u=>setScale(u)} />
      )}
    </div>
  );
}
