import React, { useState, useCallback } from 'react';
import {
  X, Plus, Trash2, Save, GripVertical, ChevronUp, ChevronDown,
  Eye, EyeOff, RotateCcw, AlertTriangle, Info, Pencil, Check,
} from 'lucide-react';
import { RANKS } from '../utils/constants';
import api from '../utils/api';

// ── Default palette for quick color picks ──────────────────────────────────
const PALETTE = [
  '#1a3a5c','#0d2b45','#2c5a2c','#5a4a1a','#3a2020',
  '#1a1a5a','#3a2a10','#4a3a60','#1e4040','#5c3a1a',
  '#2e2b22','#4a4538','#6b6355','#5e7244','#8b3a3a',
];

const DEFAULT_DT = {
  key: '', label: '', abbrev: '', min_rank: 'soldado_ev', max_rank: null,
  interval_days: 5, slots_per_day: 1, header_color: '#2e2b22', order: 99, active: true,
};

// Generate a slug-safe key from label
const toKey = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

// ── Single row editor ────────────────────────────────────────────────────────
function DutyRow({ dt, index, total, onChange, onDelete, onMove, ranks }) {
  const [expanded, setExpanded] = useState(false);

  const set = (k, v) => onChange(index, { ...dt, [k]: v });

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden',
      background: dt.active ? 'white' : '#f5f5f3',
      opacity: dt.active ? 1 : 0.65,
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Collapsed header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>

        {/* Drag handle (visual only) */}
        <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

        {/* Color swatch */}
        <div style={{
          width: 32, height: 22, borderRadius: 3, background: dt.header_color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, cursor: 'default',
        }} onClick={e => e.stopPropagation()}>
          <input type="color" value={dt.header_color} onChange={e => set('header_color', e.target.value)}
            style={{ width: 32, height: 22, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 3, opacity: 0 }}
            title="Cor do cabeçalho" />
        </div>

        {/* Abbrev badge */}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          padding: '2px 7px', borderRadius: 3,
          background: dt.header_color, color: 'white', flexShrink: 0,
        }}>
          {dt.abbrev || '??'}
        </span>

        {/* Label */}
        <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
          {dt.label || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem nome</span>}
        </span>

        {/* Interval / slots info */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          {dt.interval_days}d · {dt.slots_per_day} turno{dt.slots_per_day > 1 ? 's' : ''}
        </span>

        {/* Active toggle */}
        <button onClick={e => { e.stopPropagation(); set('active', !dt.active); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: dt.active ? 'var(--success)' : 'var(--text-muted)' }}
          title={dt.active ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}>
          {dt.active ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>

        {/* Move up/down */}
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onMove(index, -1); }}
            disabled={index === 0}
            style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', padding: '2px 3px', opacity: index === 0 ? 0.25 : 0.7, color: 'var(--text-muted)' }}>
            <ChevronUp size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onMove(index, 1); }}
            disabled={index === total - 1}
            style={{ background: 'none', border: 'none', cursor: index === total - 1 ? 'default' : 'pointer', padding: '2px 3px', opacity: index === total - 1 ? 0.25 : 0.7, color: 'var(--text-muted)' }}>
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Delete */}
        <button onClick={e => { e.stopPropagation(); onDelete(index); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--danger)' }}>
          <Trash2 size={14} />
        </button>

        {/* Expand chevron */}
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding: '14px 16px 16px', borderTop: '1px solid var(--bg-secondary)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Row 1: label + abbrev + key */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Nome completo *</label>
              <input className="form-input" type="text" value={dt.label}
                onChange={e => {
                  const label = e.target.value;
                  // auto-generate key if key was auto or empty
                  const autoKey = !dt._keyEdited ? toKey(label) : dt.key;
                  onChange(index, { ...dt, label, key: autoKey });
                }} />
            </div>
            <div className="form-group">
              <label className="form-label">Sigla *</label>
              <input className="form-input" type="text" maxLength={6} value={dt.abbrev}
                onChange={e => set('abbrev', e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Chave (ID) *</label>
              <input className="form-input" type="text" value={dt.key}
                onChange={e => onChange(index, { ...dt, key: toKey(e.target.value), _keyEdited: true })}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>Único e sem espaços</p>
            </div>
          </div>

          {/* Row 2: rank range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Patente mínima</label>
              <select className="form-input" value={dt.min_rank} onChange={e => set('min_rank', e.target.value)}>
                {RANKS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Patente máxima <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(vazio = sem limite)</span></label>
              <select className="form-input" value={dt.max_rank || ''} onChange={e => set('max_rank', e.target.value || null)}>
                <option value="">Sem limite superior</option>
                {RANKS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: interval + slots + order */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Intervalo mínimo (dias)</label>
              <input className="form-input" type="number" min={1} max={60} value={dt.interval_days}
                onChange={e => set('interval_days', Number(e.target.value))} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
                Após escalar, soldado fica {dt.interval_days} dias de folga deste serviço
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Turnos por dia</label>
              <input className="form-input" type="number" min={1} max={4} value={dt.slots_per_day}
                onChange={e => set('slots_per_day', Number(e.target.value))} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
                Gera {dt.slots_per_day} linha{dt.slots_per_day > 1 ? 's' : ''} por dia na planilha
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Ordem na planilha</label>
              <input className="form-input" type="number" min={1} max={99} value={dt.order}
                onChange={e => set('order', Number(e.target.value))} />
            </div>
          </div>

          {/* Row 4: color */}
          <div className="form-group">
            <label className="form-label">Cor do cabeçalho</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input type="color" value={dt.header_color} onChange={e => set('header_color', e.target.value)}
                style={{ width: 38, height: 32, padding: 2, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }} />
              <input className="form-input" type="text" value={dt.header_color} onChange={e => set('header_color', e.target.value)}
                style={{ width: 100, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
              {/* Quick palette */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => set('header_color', c)}
                    title={c}
                    style={{
                      width: 22, height: 22, borderRadius: 3, background: c, border: 'none', cursor: 'pointer',
                      outline: dt.header_color === c ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.15)',
                      outlineOffset: dt.header_color === c ? 1 : 0,
                    }} />
                ))}
              </div>
              {/* Live preview */}
              <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  padding: '4px 10px', borderRadius: 3, background: dt.header_color,
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'white', fontWeight: 700,
                }}>
                  {dt.abbrev || 'SV'}
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>preview</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function DutyTypesEditor({ scale, onClose, onSaved, addToast }) {
  const [types, setTypes] = useState(
    (scale.duty_types || []).map((dt, i) => ({ ...dt, _keyEdited: true, order: dt.order ?? i + 1 }))
  );
  const [saving, setSaving]   = useState(false);
  const [showReset, setShowReset] = useState(false);

  const DEFAULT_DUTY_TYPES = [
    { key:'od',    label:'Oficial de Dia',       abbrev:'OD',  min_rank:'segundo_tenente', max_rank:null,          interval_days:10, slots_per_day:1, header_color:'#1a3a5c', order:1, active:true },
    { key:'os',    label:'Oficial de Serviço',   abbrev:'OS',  min_rank:'capitao',         max_rank:null,          interval_days:14, slots_per_day:1, header_color:'#0d2b45', order:2, active:true },
    { key:'sd',    label:'Sargento de Dia',      abbrev:'SD',  min_rank:'terceiro_sargento',max_rank:'subtenente', interval_days:7,  slots_per_day:1, header_color:'#2c5a2c', order:3, active:true },
    { key:'cd',    label:'Cabo de Dia',           abbrev:'CD',  min_rank:'cabo',             max_rank:'cabo',        interval_days:5,  slots_per_day:1, header_color:'#5a4a1a', order:4, active:true },
    { key:'sdd',   label:'Soldado de Dia',       abbrev:'SdD', min_rank:'soldado_ev',       max_rank:'soldado_ep',  interval_days:5,  slots_per_day:1, header_color:'#3a2020', order:5, active:true },
    { key:'sent1', label:'Sentinela 1',           abbrev:'S1',  min_rank:'soldado_ev',       max_rank:'cabo',        interval_days:4,  slots_per_day:1, header_color:'#1a1a5a', order:6, active:true },
    { key:'sent2', label:'Sentinela 2',           abbrev:'S2',  min_rank:'soldado_ev',       max_rank:'cabo',        interval_days:4,  slots_per_day:1, header_color:'#1a1a5a', order:7, active:true },
    { key:'mot',   label:'Motorista de Dia',      abbrev:'MOT', min_rank:'soldado_ev',       max_rank:'primeiro_sargento', interval_days:5, slots_per_day:1, header_color:'#3a2a10', order:8, active:true },
  ];

  const handleChange = useCallback((index, updated) => {
    setTypes(prev => prev.map((dt, i) => i === index ? updated : dt));
  }, []);

  const handleDelete = (index) => {
    setTypes(prev => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index, dir) => {
    setTypes(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((dt, i) => ({ ...dt, order: i + 1 }));
    });
  };

  const handleAdd = () => {
    setTypes(prev => [...prev, {
      ...DEFAULT_DT,
      order: prev.length + 1,
      _keyEdited: false,
    }]);
  };

  const validate = () => {
    const keys = types.map(dt => dt.key.trim());
    if (keys.some(k => !k)) return 'Todos os serviços precisam de uma chave (ID).';
    if (keys.some(k => !/^[a-z0-9_]+$/.test(k))) return 'Chaves devem conter apenas letras minúsculas, números e _.';
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (dupes.length) return `Chaves duplicadas: ${[...new Set(dupes)].join(', ')}`;
    if (types.some(dt => !dt.label.trim())) return 'Todos os serviços precisam de um nome.';
    if (types.some(dt => !dt.abbrev.trim())) return 'Todos os serviços precisam de uma sigla.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { addToast(err, 'error'); return; }

    setSaving(true);
    try {
      const payload = types.map(({ _keyEdited, ...dt }) => ({ ...dt, key: dt.key.trim(), order: dt.order ?? 99 }));
      const res = await api.put(`/scale/${scale._id}/duty-types`, { duty_types: payload });
      addToast('Tipos de serviço salvos com sucesso!', 'success');
      onSaved(res.data.duty_types);
      onClose();
    } catch (e) {
      addToast(e.response?.data?.error || 'Erro ao salvar', 'error');
    } finally { setSaving(false); }
  };

  const doReset = () => {
    setTypes(DEFAULT_DUTY_TYPES.map(dt => ({ ...dt, _keyEdited: true })));
    setShowReset(false);
    addToast('Configuração padrão restaurada (não salva ainda)', 'warning');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 700, maxHeight: '92vh' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {scale.name}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.08em', lineHeight: 1 }}>
              EDITAR SERVIÇOS DA ESCALA
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowReset(true)} className="btn btn-ghost btn-sm" style={{ gap: 6, color: 'var(--warning)' }} title="Restaurar padrão EB">
              <RotateCcw size={14} /> Padrão EB
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ padding: '10px 22px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', gap: 8, alignItems: 'flex-start', flexShrink: 0 }}>
          <Info size={14} style={{ color: '#92400e', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
            Alterações são salvas apenas quando você clicar em <strong>Salvar Serviços</strong>. Clique no cabeçalho de cada serviço para expandir e editar seus detalhes.
          </p>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {types.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              Nenhum serviço configurado. Adicione um abaixo ou restaure o padrão EB.
            </div>
          )}
          {types.map((dt, i) => (
            <DutyRow
              key={`${dt.key}_${i}`}
              dt={dt}
              index={i}
              total={types.length}
              onChange={handleChange}
              onDelete={handleDelete}
              onMove={handleMove}
              ranks={RANKS}
            />
          ))}

          {/* Add button */}
          <button onClick={handleAdd} className="btn btn-secondary btn-sm"
            style={{ marginTop: 4, gap: 6, borderStyle: 'dashed', alignSelf: 'flex-start' }}>
            <Plus size={14} /> Adicionar serviço
          </button>
        </div>

        {/* Summary strip */}
        <div style={{ padding: '8px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            {types.length} serviço{types.length !== 1 ? 's' : ''} · {types.filter(d => d.active).length} ativo{types.filter(d => d.active).length !== 1 ? 's' : ''}
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ gap: 6 }}>
            {saving
              ? <><span className="spinner" style={{ borderTopColor: 'white', width: 13, height: 13, borderWidth: 2 }} /> Salvando...</>
              : <><Save size={14} /> Salvar Serviços</>}
          </button>
        </div>
      </div>

      {/* Reset confirm */}
      {showReset && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="modal-content" style={{ maxWidth: 380, zIndex: 201 }}>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <AlertTriangle size={22} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '0.06em', marginBottom: 6 }}>RESTAURAR PADRÃO?</div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Isso substituirá a configuração atual pelos 8 serviços padrão do EB (OD, OS, SD, CD, SdD, S1, S2, MOT). As escalações existentes não serão afetadas.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReset(false)}>Cancelar</button>
                <button className="btn btn-sm" onClick={doReset}
                  style={{ background: 'var(--warning)', color: 'white', gap: 6, display: 'flex', alignItems: 'center', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <RotateCcw size={14} /> Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
