import React, { useState, useMemo } from 'react';
import {
  X, FileText, Calendar, Download, CheckSquare, Square,
  ChevronLeft, ChevronRight, Filter, Users,
} from 'lucide-react';
import { WEEKDAY_SHORT, MONTH_NAMES_PT } from '../utils/constants';

const WEEKDAYS_FULL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const padZ = n => String(n).padStart(2,'0');
const daysInMonth = (y,m) => new Date(y,m,0).getDate();
const dowOf = (y,m,d) => new Date(`${y}-${padZ(m)}-${padZ(d)}`).getDay();
const isWE = w => w===0||w===6;

export default function ExportModal({ scale, onClose, onDownload, downloading }) {
  const [year, month] = scale.month.split('-').map(Number);
  const totalDays = daysInMonth(year, month);
  const todayStr  = new Date().toISOString().split('T')[0];

  // Build list of all days in the month
  const allDays = useMemo(() => {
    const list = [];
    for (let d = 1; d <= totalDays; d++) {
      const ds = `${year}-${padZ(month)}-${padZ(d)}`;
      const dow = dowOf(year, month, d);
      list.push({ date: ds, day: d, dow, isWE: isWE(dow), isToday: ds === todayStr });
    }
    return list;
  }, [year, month, totalDays]);

  const [selected, setSelected]   = useState(new Set());
  const [title,    setTitle]       = useState('');
  const [viewMode, setViewMode]    = useState('calendar'); // 'calendar' | 'weekday'

  // Weekday filter buttons
  const toggleWeekday = (dow) => {
    setSelected(prev => {
      const next = new Set(prev);
      const group = allDays.filter(d => d.dow === dow).map(d => d.date);
      const allOn = group.every(d => next.has(d));
      if (allOn) group.forEach(d => next.delete(d));
      else       group.forEach(d => next.add(d));
      return next;
    });
  };

  const weekdayCount = (dow) => allDays.filter(d => d.dow === dow).length;
  const weekdayAllOn = (dow) => allDays.filter(d => d.dow === dow).every(d => selected.has(d.date));

  const toggleDay = (date) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else                next.add(date);
      return next;
    });
  };

  const selectAll     = () => setSelected(new Set(allDays.map(d=>d.date)));
  const selectWeekdays = () => setSelected(new Set(allDays.filter(d=>!d.isWE).map(d=>d.date)));
  const selectWeekends = () => setSelected(new Set(allDays.filter(d=>d.isWE).map(d=>d.date)));
  const clearAll       = () => setSelected(new Set());

  const sortedDates = [...selected].sort();
  const count = selected.size;

  // Calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay();
  const calCells = [];
  for (let i = 0; i < firstDow; i++) calCells.push(null);
  for (const d of allDays) calCells.push(d);
  const rows = [];
  for (let i = 0; i < calCells.length; i += 7) rows.push(calCells.slice(i, i + 7));

  const wdSelected = (dow) => allDays.filter(d => d.dow === dow && selected.has(d.date)).length;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 680 }}>

        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {scale.name} · {MONTH_NAMES_PT[month-1]} {year}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.08em', lineHeight: 1 }}>
              EXPORTAR BOLETIM WORD
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Quick selectors */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Seleção rápida
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Todos os dias', fn: selectAll, count: totalDays },
                { label: 'Dias úteis (seg–sex)', fn: selectWeekdays, count: allDays.filter(d=>!d.isWE).length },
                { label: 'Fins de semana', fn: selectWeekends, count: allDays.filter(d=>d.isWE).length },
                { label: 'Limpar seleção', fn: clearAll, danger: true },
              ].map(({ label, fn, count: c, danger }) => (
                <button key={label} onClick={fn}
                  className="btn btn-sm btn-secondary"
                  style={{ gap: 5, fontSize: 12, color: danger ? 'var(--danger)' : undefined, borderColor: danger ? 'var(--danger)' : undefined }}>
                  {label}{c !== undefined ? ` (${c})` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Weekday filter row */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              <Filter size={11} style={{ display: 'inline', marginRight: 5 }} />
              Filtrar por dia da semana
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {WEEKDAYS_FULL.map((wd, dow) => {
                const allOn   = weekdayAllOn(dow);
                const partial = wdSelected(dow) > 0 && !allOn;
                const we      = isWE(dow);
                return (
                  <button key={dow} onClick={() => toggleWeekday(dow)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 6, border: '2px solid',
                      borderColor: allOn ? 'var(--accent)' : partial ? 'var(--warning)' : 'var(--border)',
                      background:  allOn ? 'var(--accent)' : partial ? 'var(--warning-light)' : (we ? 'var(--bg-secondary)' : 'white'),
                      color:       allOn ? 'white' : partial ? 'var(--warning)' : we ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                    }}>
                    <div>{WEEKDAY_SHORT[dow]}</div>
                    <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2 }}>{wdSelected(dow)}/{weekdayCount(dow)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar grid */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              <Calendar size={11} style={{ display: 'inline', marginRight: 5 }} />
              Selecionar dias individualmente
            </div>
            {/* Weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {WEEKDAY_SHORT.map(w => (
                <div key={w} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', padding: '2px 0' }}>{w}</div>
              ))}
            </div>
            {/* Calendar cells */}
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                {row.map((cell, ci) => {
                  if (!cell) return <div key={`b${ci}`} />;
                  const on = selected.has(cell.date);
                  return (
                    <button key={cell.date} onClick={() => toggleDay(cell.date)}
                      style={{
                        height: 40, borderRadius: 6, border: `2px solid ${on ? 'var(--accent)' : cell.isWE ? 'var(--border)' : 'var(--border)'}`,
                        background: on ? 'var(--accent)' : cell.isWE ? 'var(--bg-secondary)' : 'white',
                        cursor: 'pointer', transition: 'all 0.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                        boxShadow: on ? '0 2px 6px rgba(94,114,68,0.25)' : 'none',
                      }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, lineHeight: 1, color: on ? 'white' : cell.isToday ? 'var(--accent)' : cell.isWE ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {cell.day}
                      </span>
                      {on && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)' }}>✓</span>}
                      {cell.isToday && !on && <span style={{ fontSize: 7, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>hoje</span>}
                    </button>
                  );
                })}
                {row.length < 7 && Array.from({length: 7 - row.length}).map((_,i) => <div key={`p${i}`} />)}
              </div>
            ))}
          </div>

          {/* Selected dates summary */}
          {count > 0 && (
            <div style={{ padding: '12px 14px', background: 'rgba(94,114,68,0.06)', border: '1px solid rgba(94,114,68,0.2)', borderRadius: 6, animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                {count} dia{count!==1?'s':''} selecionado{count!==1?'s':''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {sortedDates.map(d => {
                  const [,, dd] = d.split('-');
                  const dow = new Date(d).getDay();
                  return (
                    <span key={d} style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)',
                      background: isWE(dow) ? 'var(--bg-secondary)' : 'var(--accent)', color: isWE(dow) ? 'var(--text-secondary)' : 'white',
                      border: `1px solid ${isWE(dow) ? 'var(--border)' : 'var(--olive-700)'}`,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {WEEKDAY_SHORT[dow]} {dd}
                      <button onClick={() => toggleDay(d)} style={{ background:'none',border:'none',cursor:'pointer',color:'inherit',opacity:0.7,padding:0,fontSize:10,lineHeight:1 }}>✕</button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Document title override */}
          <div className="form-group">
            <label className="form-label">Título do documento (opcional)</label>
            <input className="form-input" type="text"
              placeholder={`Ex: Escala de ${MONTH_NAMES_PT[month-1]} — 1º Pelotão`}
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: count > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
            {count === 0 ? 'Selecione ao menos 1 dia' : `${count} dia${count!==1?'s':''} · documento Word formatado`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary btn-sm" style={{ gap: 7 }}
              disabled={count === 0 || !!downloading}
              onClick={() => onDownload(sortedDates, title)}>
              {downloading
                ? <><span className="spinner" style={{ borderTopColor: 'white', width: 13, height: 13, borderWidth: 2 }} /> Gerando Word...</>
                : <><FileText size={14} /> Gerar Boletim Word</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
