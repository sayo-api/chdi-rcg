import React, { useState, useMemo, useCallback } from 'react';
import {
  Users, ChevronDown, ChevronUp, CheckCircle, Save, UserX,
  Plus, Calendar, Filter, X, RefreshCw,
} from 'lucide-react';
import { WEEKDAY_SHORT, MONTH_NAMES_PT, getRankShort, getCellStatus, CELL_STATUS_LIST } from '../utils/constants';
import api from '../utils/api';

const padZ = n => String(n).padStart(2,'0');
const daysInMonth = (y,m) => new Date(y,m,0).getDate();
const dowOf = (y,m,d) => new Date(`${y}-${padZ(m)}-${padZ(d)}`).getDay();
const isWE  = w => w===0||w===6;
const RANK_TIERS = {
  soldado_ev:0,soldado_ep:0,cabo:1,terceiro_sargento:2,segundo_sargento:2,
  primeiro_sargento:2,subtenente:3,aspirante:4,segundo_tenente:4,
  primeiro_tenente:4,capitao:5,major:6,tenente_coronel:7,coronel:8,
  general_brigada:9,general_divisao:9,general_exercito:9,marechal:10,comandante:11,
};

function emptyRow() { return { soldier_id:'', war_name:'', war_number:'', rank:'', status:'normal', observation:'' }; }

/* ── A single duty row with add/remove soldier slots ─────────────────────── */
function DutyAssignRow({ dt, rows, soldiers, onSave, saving }) {
  const [localRows, setLocal]   = useState(() => rows.length ? rows.map(r=>({...r})) : [emptyRow()]);
  const [dirty,     setDirty]   = useState(false);
  const [expanded,  setExpanded]= useState(rows.some(r=>r.soldier_id));

  const minT = RANK_TIERS[dt.min_rank]??0;
  const maxT = dt.max_rank ? (RANK_TIERS[dt.max_rank]??99) : 99;
  const eligible = soldiers.filter(s=>{ const t=RANK_TIERS[s.rank]??0; return t>=minT&&t<=maxT; });
  const taken = new Set(localRows.map(r=>r.soldier_id).filter(Boolean));

  const update = (i, patch) => { setLocal(p=>p.map((r,idx)=>idx===i?{...r,...patch}:r)); setDirty(true); };
  const add    = ()          => { setLocal(p=>[...p, emptyRow()]); setDirty(true); };
  const remove = i           => { setLocal(p=>p.length===1?[emptyRow()]:p.filter((_,idx)=>idx!==i)); setDirty(true); };

  const pick = (i, id) => {
    const s = soldiers.find(x=>String(x._id)===id);
    if (s) update(i,{ soldier_id:String(s._id), war_name:s.war_name, war_number:s.war_number, rank:s.rank });
    else   update(i,{ soldier_id:'', war_name:'', war_number:'', rank:'' });
  };

  const handleSave = () => {
    const valid = localRows.filter(r=>r.soldier_id);
    onSave(valid);
    setDirty(false);
  };

  const filledCount = localRows.filter(r=>r.soldier_id).length;

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:6, overflow:'hidden', background:'white' }}>
      {/* Header */}
      <div
        onClick={()=>setExpanded(e=>!e)}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer', background: filledCount>0?'rgba(94,114,68,0.04)':'white', transition:'background 0.15s' }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg-secondary)'}
        onMouseLeave={e=>e.currentTarget.style.background=filledCount>0?'rgba(94,114,68,0.04)':'white'}>
        <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'2px 7px', borderRadius:3, background:dt.header_color||'#4a4538', fontFamily:'var(--font-mono)', fontSize:9, color:'white', fontWeight:700, flexShrink:0 }}>
          {dt.abbrev}
        </div>
        <span style={{ flex:1, fontFamily:'var(--font-body)', fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{dt.label}</span>
        {filledCount>0 && (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {localRows.filter(r=>r.soldier_id).map((r,i)=>(
              <span key={i} style={{ fontFamily:'var(--font-mono)', fontSize:10, padding:'1px 7px', borderRadius:10, background:'var(--accent)', color:'white', fontWeight:700 }}>
                {r.war_name?.split(' ')[0]}
              </span>
            ))}
          </div>
        )}
        {filledCount===0 && (
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', fontStyle:'italic' }}>vazio</span>
        )}
        {dirty && <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--warning)', flexShrink:0 }} title="Alterações não salvas" />}
        {expanded ? <ChevronUp size={14} style={{ color:'var(--text-muted)', flexShrink:0 }} /> : <ChevronDown size={14} style={{ color:'var(--text-muted)', flexShrink:0 }} />}
      </div>

      {/* Expanded form */}
      {expanded && (
        <div style={{ padding:'12px', borderTop:'1px solid var(--bg-secondary)', display:'flex', flexDirection:'column', gap:8, background:'var(--bg-primary)' }}>
          {localRows.map((row, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', flexWrap:'wrap' }}>
              {/* Index */}
              <div style={{ width:22, height:22, borderRadius:4, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:10, color:'white', fontWeight:700, flexShrink:0, marginTop:6 }}>
                {i+1}
              </div>
              {/* Soldier select */}
              <select value={row.soldier_id} onChange={e=>pick(i,e.target.value)}
                style={{ flex:2, minWidth:160, fontFamily:'var(--font-mono)', fontSize:11, padding:'6px 10px', border:'1px solid var(--border)', borderRadius:4, background:'white', cursor:'pointer', height:34 }}>
                <option value="">— Selecionar —</option>
                {eligible.map(s=>(
                  <option key={s._id} value={String(s._id)}
                    disabled={taken.has(String(s._id))&&String(s._id)!==row.soldier_id}>
                    {s.war_name} · {getRankShort(s.rank)}{taken.has(String(s._id))&&String(s._id)!==row.soldier_id?' ✗':''}
                  </option>
                ))}
              </select>
              {/* Status (compact) */}
              {row.soldier_id && (
                <select value={row.status} onChange={e=>update(i,{status:e.target.value})}
                  style={{ flex:1, minWidth:120, fontFamily:'var(--font-mono)', fontSize:11, padding:'6px 8px', border:'1px solid var(--border)', borderRadius:4, background:'white', cursor:'pointer', height:34 }}>
                  {CELL_STATUS_LIST.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              )}
              {/* Observation */}
              {row.soldier_id && (
                <input type="text" placeholder="Obs..." value={row.observation} onChange={e=>update(i,{observation:e.target.value})}
                  style={{ flex:2, minWidth:120, fontFamily:'var(--font-body)', fontSize:12, padding:'6px 10px', border:'1px solid var(--border)', borderRadius:4, height:34 }} />
              )}
              {/* Remove */}
              <button onClick={()=>remove(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:'6px 4px', flexShrink:0, display:'flex', alignItems:'center' }}>
                <UserX size={15} />
              </button>
            </div>
          ))}

          <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center' }}>
            <button onClick={add} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'1px dashed var(--border)', borderRadius:4, cursor:'pointer', padding:'5px 10px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', transition:'border-color 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <Plus size={12} /> Outro soldado
            </button>
            <div style={{ flex:1 }} />
            {dirty && (
              <button onClick={handleSave} disabled={saving}
                style={{ display:'flex', alignItems:'center', gap:5, background:'var(--accent)', border:'none', borderRadius:4, cursor:'pointer', padding:'6px 14px', fontFamily:'var(--font-body)', fontSize:12, fontWeight:600, color:'white', transition:'filter 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.filter='brightness(0.92)'}
                onMouseLeave={e=>e.currentTarget.style.filter='brightness(1)'}>
                {saving ? <><span style={{ display:'inline-block', width:12, height:12, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />Salvando...</> : <><Save size={13} />Salvar</>}
              </button>
            )}
            {!dirty && filledCount>0 && (
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--success)', display:'flex', alignItems:'center', gap:4 }}>
                <CheckCircle size={11} /> Salvo
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────────────── */
export default function AssignmentPanel({ scale, soldiers, onCellSaved, onClose }) {
  const [year, month] = scale.month.split('-').map(Number);
  const totalDays = daysInMonth(year, month);
  const todayStr  = new Date().toISOString().split('T')[0];

  // Selected day for panel
  const [activeDate, setActiveDate] = useState(() => {
    // Default to today if in this month, else first day
    const t = new Date().toISOString().split('T')[0];
    const [ty, tm] = t.split('-').map(Number);
    return (ty===year&&tm===month) ? t : `${year}-${padZ(month)}-01`;
  });

  const [savingDT, setSavingDT] = useState(null);
  const [filterWD, setFilterWD] = useState([]); // empty = all weekdays

  const activeDT = scale.duty_types.filter(d=>d.active).sort((a,b)=>a.order-b.order);

  // Build entryMap
  const entryMap = useMemo(() => {
    const m = {};
    for (const e of scale.entries) {
      const k = `${e.date}|${e.duty_type_key}`;
      if (!m[k]) m[k] = [];
      m[k].push(e);
    }
    for (const k of Object.keys(m)) m[k].sort((a,b)=>(a.slot||0)-(b.slot||0));
    return m;
  }, [scale.entries]);

  const getRows = (date, dtKey) =>
    (entryMap[`${date}|${dtKey}`]||[]).filter(e=>e.soldier_id).map(e=>({
      soldier_id:  String(e.soldier_id),
      war_name:    e.war_name,
      war_number:  e.war_number,
      rank:        e.rank,
      status:      e.status||'normal',
      observation: e.observation||'',
    }));

  const saveCell = useCallback(async (dtKey, rows) => {
    setSavingDT(dtKey);
    try {
      await api.patch(`/scale/${scale._id}/cell-multi`, {
        duty_type_key: dtKey,
        date: activeDate,
        soldiers: rows,
      });
      onCellSaved(dtKey, activeDate, rows);
    } catch(err) {
      alert(err.response?.data?.error||'Erro ao salvar');
    } finally { setSavingDT(null); }
  }, [scale._id, activeDate]);

  // Day navigation list (filtered by weekday)
  const days = useMemo(() => {
    const list = [];
    for (let d=1; d<=totalDays; d++) {
      const ds = `${year}-${padZ(month)}-${padZ(d)}`;
      const dow = dowOf(year,month,d);
      if (filterWD.length===0||filterWD.includes(dow)) list.push({ date:ds, day:d, dow });
    }
    return list;
  }, [year, month, totalDays, filterWD]);

  const activeDow = new Date(activeDate).getDay();
  const [ad, am, ay] = activeDate.split('-').reverse();

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, background:'white', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', boxShadow:'var(--shadow-md)' }}>

      {/* Panel header */}
      <div style={{ padding:'14px 18px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:6, background:'linear-gradient(135deg,var(--accent),var(--olive-700))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Users size={16} color="white" />
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:15, letterSpacing:'0.06em', lineHeight:1 }}>PAINEL DE ESCALAÇÃO</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', marginTop:2 }}>Clique em um dia · edite cada serviço</div>
          </div>
        </div>
        <div style={{ flex:1 }} />
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X size={18} /></button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', minHeight:400, maxHeight:'65vh' }}>

        {/* Left: day list */}
        <div style={{ borderRight:'1px solid var(--border)', overflowY:'auto', background:'var(--bg-primary)' }}>
          {/* Weekday filter */}
          <div style={{ padding:'10px 10px 6px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--bg-secondary)', zIndex:1 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Filtrar dia</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
              {WEEKDAY_SHORT.map((w,dow)=>{
                const on = filterWD.includes(dow);
                return (
                  <button key={dow} onClick={()=>setFilterWD(p=>on?p.filter(x=>x!==dow):[...p,dow])}
                    style={{ padding:'3px 2px', borderRadius:3, border:`1px solid ${on?'var(--accent)':'var(--border)'}`, background:on?'var(--accent)':'white', color:on?'white':isWE(dow)?'var(--text-muted)':'var(--text-primary)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:8, fontWeight:700 }}>
                    {w}
                  </button>
                );
              })}
            </div>
            {filterWD.length>0&&<button onClick={()=>setFilterWD([])} style={{ display:'flex', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:9, marginTop:5, padding:0 }}>
              <X size={9}/> limpar filtro
            </button>}
          </div>

          {/* Day buttons */}
          {days.map(({date,day,dow})=>{
            const isActive  = date===activeDate;
            const isToday   = date===todayStr;
            const hasData   = activeDT.some(dt=>(entryMap[`${date}|${dt.key}`]||[]).some(e=>e.soldier_id));
            const we        = isWE(dow);
            return (
              <button key={date} onClick={()=>setActiveDate(date)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 12px', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.1s',
                  background: isActive?'var(--accent)': we?'rgba(74,69,56,0.04)':'white',
                  borderLeft: isToday?'3px solid var(--accent)':'3px solid transparent',
                  borderBottom:'1px solid var(--bg-secondary)',
                }}>
                <div style={{
                  width:32, height:32, borderRadius:6, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  background: isActive?'rgba(255,255,255,0.2)': we?'var(--bg-secondary)':'var(--bg-primary)',
                  flexShrink:0,
                }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:15, lineHeight:1, color:isActive?'white':isToday?'var(--accent)':we?'var(--text-muted)':'var(--text-primary)', fontWeight:700 }}>{padZ(day)}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:7, color:isActive?'rgba(255,255,255,0.7)':'var(--text-muted)' }}>{WEEKDAY_SHORT[dow]}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  {hasData ? (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {activeDT.filter(dt=>(entryMap[`${date}|${dt.key}`]||[]).some(e=>e.soldier_id)).map(dt=>(
                        <span key={dt.key} style={{ display:'inline-block', width:20, height:10, borderRadius:2, background:isActive?'rgba(255,255,255,0.35)':dt.header_color||'#4a4538', opacity:0.9 }} title={dt.abbrev} />
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:isActive?'rgba(255,255,255,0.5)':'var(--text-muted)' }}>sem escalação</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: duty slots */}
        <div style={{ overflowY:'auto', display:'flex', flexDirection:'column' }}>
          {/* Day header */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-secondary)', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:1 }}>
            <div style={{ width:44, height:44, borderRadius:8, background:`${activeDow===0||activeDow===6?'#4a4538':'var(--accent)'}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:20, lineHeight:1, color:'white', fontWeight:700 }}>{ad}</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'rgba(255,255,255,0.7)' }}>{WEEKDAY_SHORT[activeDow]}</span>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:16, letterSpacing:'0.06em', lineHeight:1, color:'var(--text-primary)' }}>
                {WEEKDAY_SHORT[activeDow]}, {ad}/{am}/{ay}
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                {activeDT.filter(dt=>(entryMap[`${activeDate}|${dt.key}`]||[]).some(e=>e.soldier_id)).length} de {activeDT.length} serviços escalados
              </div>
            </div>
          </div>

          {/* Duty rows */}
          <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:8, flex:1 }}>
            {activeDT.map(dt => (
              <DutyAssignRow
                key={dt.key}
                dt={dt}
                rows={getRows(activeDate, dt.key)}
                soldiers={soldiers}
                saving={savingDT===dt.key}
                onSave={(rows) => saveCell(dt.key, rows)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
