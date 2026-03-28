import React, { useEffect, useState, useMemo } from 'react';
import {
  Users, UserCheck, UserX, Clock, TrendingUp, Activity,
  CalendarDays, Shield, ChevronLeft, ChevronRight, Star,
  AlertTriangle, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatDate, getRankLabel, MONTH_NAMES_PT, WEEKDAY_SHORT } from '../utils/constants';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, animation: 'fadeIn 0.4s ease' }}>
      <div style={{ width: 42, height: 42, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T00:00:00') - today) / 86400000);
}

// ── Mini duty calendar ────────────────────────────────────────────────────────
function DutyCalendar({ duties }) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const padZ = n => String(n).padStart(2, '0');
  const totalDays = new Date(year, month, 0).getDate();
  const firstDow  = new Date(year, month - 1, 1).getDay();
  const todayStr  = now.toISOString().split('T')[0];

  const dutyByDate = useMemo(() => {
    const m = {};
    for (const d of duties) { if (!m[d.date]) m[d.date] = []; m[d.date].push(d); }
    return m;
  }, [duties]);

  const goTo = (y, m) => { if (m < 1) { setYear(y-1); setMonth(12); } else if (m > 12) { setYear(y+1); setMonth(1); } else { setYear(y); setMonth(m); } };

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ blank: true, key: `b${i}` });
  for (let d = 1; d <= totalDays; d++) {
    const ds = `${year}-${padZ(month)}-${padZ(d)}`;
    cells.push({ day: d, date: ds, duties: dutyByDate[ds] || [], key: ds });
  }
  const COLS = 7;
  const rows = [];
  for (let i = 0; i < cells.length; i += COLS) rows.push(cells.slice(i, i + COLS));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => goTo(year, month - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'var(--text-muted)', borderRadius: 4, display: 'flex' }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.08em' }}>{MONTH_NAMES_PT[month - 1]} {year}</span>
        <button onClick={() => goTo(year, month + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'var(--text-muted)', borderRadius: 4, display: 'flex' }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
        {WEEKDAY_SHORT.map(w => <div key={w} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{w}</div>)}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
          {row.map(cell => {
            if (cell.blank) return <div key={cell.key} />;
            const isToday = cell.date === todayStr;
            const hasDuty = cell.duties.length > 0;
            const past    = hasDuty && cell.duties.every(d => d.is_past);
            return (
              <div key={cell.key} title={hasDuty ? cell.duties.map(d => d.duty_label).join(', ') : ''}
                style={{ minHeight: 44, borderRadius: 5, padding: '4px 5px', background: isToday ? 'var(--accent)' : hasDuty ? (past ? '#e8ede0' : '#d1e7b8') : 'var(--bg-secondary)', border: `1px solid ${isToday ? 'var(--olive-700)' : hasDuty ? (past ? '#b8ceac' : '#8cbf6a') : 'var(--border)'}`, boxShadow: hasDuty && !past && !isToday ? '0 2px 6px rgba(94,114,68,0.15)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: isToday || hasDuty ? 700 : 400, color: isToday ? 'white' : hasDuty ? (past ? '#4a6b3a' : '#2d5a1a') : 'var(--text-muted)', lineHeight: 1 }}>{cell.day}</div>
                {hasDuty && cell.duties.map((d, i) => (
                  <div key={i} style={{ marginTop: 3, padding: '1px 4px', borderRadius: 2, background: isToday ? 'rgba(255,255,255,0.25)' : d.duty_color + '22', border: `1px solid ${isToday ? 'rgba(255,255,255,0.4)' : d.duty_color + '55'}`, fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, lineHeight: 1.3, color: isToday ? 'white' : d.duty_color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.duty_abbrev}
                  </div>
                ))}
              </div>
            );
          })}
          {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => <div key={`p${i}`} />)}
        </div>
      ))}
    </div>
  );
}

// ── Upcoming duties list ──────────────────────────────────────────────────────
function UpcomingDuties({ duties }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const list = duties.filter(d => d.date >= todayStr).slice(0, 8);
  if (!list.length) return <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum serviço agendado</div>;
  return (
    <div>
      {list.map((d, i) => {
        const delta = daysUntil(d.date);
        const [y, m, dd] = d.date.split('-');
        const dow = new Date(d.date).getDay();
        const isT = delta === 0, isTm = delta === 1;
        return (
          <div key={`${d.date}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < list.length - 1 ? '1px solid var(--bg-secondary)' : 'none', background: isT ? 'rgba(94,114,68,0.04)' : 'transparent', animation: `fadeIn ${0.2 + i * 0.04}s ease` }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isT ? 'var(--accent)' : d.duty_color + '18', border: `1px solid ${isT ? 'var(--olive-700)' : d.duty_color + '44'}` }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1, color: isT ? 'white' : d.duty_color, fontWeight: 700 }}>{dd}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: isT ? 'rgba(255,255,255,0.8)' : d.duty_color + 'aa' }}>{WEEKDAY_SHORT[dow]}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ padding: '2px 7px', borderRadius: 3, background: d.duty_color, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'white', fontWeight: 700 }}>{d.duty_abbrev}</div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{d.duty_label}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {`${dd}/${m}/${y}`}{d.observation ? ` · ${d.observation}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {isT ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(94,114,68,0.1)', padding: '3px 8px', borderRadius: 10 }}>HOJE</span>
               : isTm ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--warning)', background: 'rgba(139,110,58,0.1)', padding: '3px 8px', borderRadius: 10 }}>AMANHÃ</span>
               : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>em {delta}d</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Escala do Dia (hoje e amanhã) ────────────────────────────────────────────
// ── Escala do Dia — formato tabela como documento oficial ────────────────────
function EscalaDoDia({ myId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);
  const tomorrow = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate()+1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);

  useEffect(() => {
    api.get(`/scale/day-overview?dates=${today},${tomorrow}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const fmtDateFull = (dateStr) => {
    const [y,m,d] = dateStr.split('-').map(Number);
    const date = new Date(y, m-1, d);
    const dow  = ['DOMINGO','SEGUNDA-FEIRA','TERÇA-FEIRA','QUARTA-FEIRA','QUINTA-FEIRA','SEXTA-FEIRA','SÁBADO'][date.getDay()];
    const mes  = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'][m-1];
    return `${String(d).padStart(2,'0')} DE ${mes} DE ${y} — ${dow}`;
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <span className="spinner" style={{ borderTopColor: 'var(--accent)', display: 'inline-block' }} />
      </div>
    );
  }

  if (!data) return null;

  const days = [today, tomorrow];
  const hasAnyEntry = days.some(d => (data.days[d]?.duty_types || []).length > 0);

  if (!hasAnyEntry) {
    return (
      <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
        <CalendarDays size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>Nenhum militar escalado hoje ou amanhã</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {days.map(dateStr => {
        const day     = data.days[dateStr] || { duty_types: [] };
        const isToday = dateStr === today;
        const iAmHere = day.duty_types.some(dt => dt.soldiers.some(s => s.soldier_id === myId));

        if (day.duty_types.length === 0) return null;

        return (
          <div key={dateStr} className="card" style={{ overflow: 'hidden', border: iAmHere ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
            <div style={{ padding: '10px 16px', background: isToday ? 'var(--accent)' : '#2e2b22', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.07em', color: 'white' }}>
                {isToday ? '▶ HOJE — ' : 'AMANHÃ — '}{fmtDateFull(dateStr)}
              </span>
              {iAmHere && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 3, padding: '3px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <AlertTriangle size={11} /> VOCÊ ESTÁ ESCALADO
                </span>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {day.duty_types.map((dt, dti) => {
                  const iAmInThisDuty = dt.soldiers.some(s => s.soldier_id === myId);
                  return (
                    <tr key={dt.key} style={{ background: iAmInThisDuty ? `${dt.header_color}12` : dti % 2 === 0 ? 'white' : '#fafaf8', borderBottom: '1px solid #e8e4d8' }}>
                      <td style={{ width: '30%', padding: '8px 14px', borderRight: '1px solid #e8e4d8', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'inline-block', width: 3, height: 24, borderRadius: 2, background: dt.header_color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: '#2e2b22' }}>{dt.label}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{dt.abbrev}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px' }}>
                          {dt.soldiers.map((s, si) => {
                            const isMe = s.soldier_id === myId;
                            return (
                              <span key={si} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: isMe ? 800 : 500, color: isMe ? 'var(--accent)' : '#2e2b22', background: isMe ? 'rgba(94,114,68,0.12)' : 'transparent', padding: isMe ? '1px 7px' : '0', borderRadius: isMe ? 3 : 0, border: isMe ? '1px solid rgba(94,114,68,0.3)' : 'none', letterSpacing: '0.02em' }}>
                                {isMe ? `★ ${s.war_name || '—'}` : s.war_name || '—'}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [duties,        setDuties]        = useState([]);
  const [dutiesLoading, setDutiesLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
    else setLoading(false);
    api.get('/scale/my-duties?months=4').then(r => setDuties(r.data.duties || [])).catch(() => {}).finally(() => setDutiesLoading(false));
  }, [isAdmin]);

  const todayStr = new Date().toISOString().split('T')[0];
  const nextDuty = duties.filter(d => d.date >= todayStr)[0];
  const delta    = nextDuty ? daysUntil(nextDuty.date) : null;

  const active   = users.filter(u => u.is_active);
  const inactive = users.filter(u => !u.is_active);
  const pending  = users.filter(u => u.first_access);
  const recent   = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const lastLogin = [...users].filter(u => u.last_login).sort((a, b) => new Date(b.last_login) - new Date(a.last_login)).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            {isAdmin ? 'Administrador Supremo' : getRankLabel(user?.rank)}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.08em', lineHeight: 1 }}>BEM-VINDO, {user?.war_name}</h1>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 4 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
      <div style={{ height: 3, background: 'linear-gradient(90deg,var(--accent) 0%,var(--olive-700) 40%,transparent 100%)', borderRadius: 2 }} />

      {/* Next duty banner */}
      {!dutiesLoading && nextDuty && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px', borderRadius: 8,
          background: delta === 0 ? 'linear-gradient(135deg,var(--accent) 0%,var(--olive-700) 100%)' : delta === 1 ? 'linear-gradient(135deg,var(--warning) 0%,#a07810 100%)' : 'white',
          border: `1px solid ${delta <= 1 ? 'transparent' : 'var(--border)'}`,
          boxShadow: 'var(--shadow-md)', animation: 'fadeIn 0.4s ease',
          color: delta <= 1 ? 'white' : 'var(--text-primary)',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: delta <= 1 ? 'rgba(255,255,255,0.2)' : nextDuty.duty_color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={24} style={{ color: delta <= 1 ? 'white' : nextDuty.duty_color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.75, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
              {delta === 0 ? '🔴 SERVIÇO HOJE' : delta === 1 ? '⚠️ SERVIÇO AMANHÃ' : 'PRÓXIMO SERVIÇO'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.06em', lineHeight: 1 }}>{nextDuty.duty_label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.8, marginTop: 3 }}>{nextDuty.date.split('-').reverse().join('/')}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {delta === 0 ? <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.08em' }}>HOJE</span>
            : delta === 1 ? <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.08em' }}>AMANHÃ</span>
            : <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, color: nextDuty.duty_color }}>{delta}</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>dias</div></div>}
          </div>
        </div>
      )}
      {!dutiesLoading && !nextDuty && (
        <div style={{ padding: '12px 18px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={15} /> Sem serviços agendados nos próximos meses
        </div>
      )}

      {/* Escala de hoje e amanhã — somente para soldados (não admin) */}
      {!isAdmin && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={12} style={{ color: 'var(--accent)' }} /> Escala de Serviço — Hoje &amp; Amanhã
          </div>
          <EscalaDoDia myId={String(user?._id || user?.id || '')} />
        </div>
      )}

      {/* Admin stats */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
          <StatCard icon={Users}     label="Total Efetivo"   value={users.length}    color="var(--accent)"  />
          <StatCard icon={UserCheck} label="Contas Ativas"   value={active.length}   color="var(--success)" sub={`${Math.round((active.length/Math.max(users.length,1))*100)}%`} />
          <StatCard icon={UserX}     label="Inativas"        value={inactive.length} color="var(--danger)"  />
          <StatCard icon={Clock}     label="Primeiro Acesso" value={pending.length}  color="var(--warning)" />
        </div>
      )}

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Calendar */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>MEUS DIAS DE SERVIÇO</span>
            {!dutiesLoading && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 7px', borderRadius: 10 }}>
              {duties.filter(d => d.date >= todayStr).length} pendentes
            </span>}
          </div>
          <div style={{ padding: '12px 14px' }}>
            {dutiesLoading ? <div style={{ textAlign: 'center', padding: 30 }}><span className="spinner" style={{ borderTopColor: 'var(--accent)', display: 'inline-block' }} /></div>
              : <DutyCalendar duties={duties} />}
          </div>
          <div style={{ padding: '7px 14px', borderTop: '1px solid var(--bg-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[{ bg:'#d1e7b8', bd:'#8cbf6a', l:'Agendado' }, { bg:'#e8ede0', bd:'#b8ceac', l:'Realizado' }, { bg:'var(--accent)', bd:'var(--olive-700)', l:'Hoje' }].map(x => (
              <span key={x.l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:10, height:10, borderRadius:2, background:x.bg, border:`1px solid ${x.bd}`, display:'inline-block' }} />
                <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)' }}>{x.l}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>PRÓXIMOS SERVIÇOS</span>
          </div>
          {dutiesLoading ? <div style={{ textAlign: 'center', padding: 30 }}><span className="spinner" style={{ borderTopColor: 'var(--accent)', display: 'inline-block' }} /></div>
            : <UpcomingDuties duties={duties} />}
        </div>

        {/* Admin recent cadastros */}
        {isAdmin && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>CADASTROS RECENTES</span>
            </div>
            <div>
              {recent.map((u, i) => (
                <div key={u._id || u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < recent.length - 1 ? '1px solid var(--bg-secondary)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: 'linear-gradient(135deg,var(--khaki-300),var(--khaki-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'white' }}>{u.war_name?.[0]}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.war_name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{getRankLabel(u.rank)}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(u.created_at).split(' ')[0]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin last logins */}
        {isAdmin && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>ÚLTIMOS ACESSOS</span>
            </div>
            <div>
              {lastLogin.map((u, i) => (
                <div key={u._id || u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < lastLogin.length - 1 ? '1px solid var(--bg-secondary)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.is_active ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.war_name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.last_ip || '—'}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(u.last_login)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@media(max-width:768px){.dash-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
