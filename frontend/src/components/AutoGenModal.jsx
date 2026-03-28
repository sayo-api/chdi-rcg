import React, { useState } from 'react';
import { X, Zap, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

export default function AutoGenModal({ scale, onClose, onDone, addToast }) {
  const activeDTs = scale.duty_types.filter(d => d.active);
  const [selected, setSelected] = useState(activeDTs.map(d => d.key));
  const [override, setOverride] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const toggle = k => setSelected(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);

  const run = async () => {
    if (!selected.length) { addToast('Selecione ao menos um serviço', 'warning'); return; }
    setLoading(true);
    try {
      const res = await api.post(`/scale/${scale._id}/auto-generate`, {
        duty_type_keys: selected, override_manual: override,
      });
      addToast('Escala gerada com sucesso!', 'success');
      onDone(res.data);
      onClose();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erro ao gerar escala', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 460 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>GERAÇÃO INTELIGENTE</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.08em' }}>AUTO-GERAR ESCALA</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            O sistema distribuirá automaticamente os soldados respeitando o intervalo mínimo entre serviços e sem conflito no mesmo dia.
          </p>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Serviços a gerar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeDTs.map(dt => (
                <label key={dt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 4, background: 'var(--bg-secondary)', border: `2px solid ${selected.includes(dt.key) ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', transition: 'border 0.15s' }}>
                  <input type="checkbox" checked={selected.includes(dt.key)} onChange={() => toggle(dt.key)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px 7px', borderRadius: 3, background: dt.header_color, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'white', fontWeight: 700 }}>{dt.abbrev}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>{dt.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>Intervalo mínimo: {dt.interval_days} dias</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 4, background: override ? '#fff3e0' : 'var(--bg-secondary)', border: `1px solid ${override ? '#fdba74' : 'var(--border)'}`, cursor: 'pointer' }}>
            <input type="checkbox" checked={override} onChange={e => setOverride(e.target.checked)} style={{ accentColor: '#f97316', width: 15, height: 15 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>Sobrescrever escalações manuais</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>Células preenchidas manualmente também serão substituídas</div>
            </div>
          </label>
        </div>

        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end', background: 'var(--bg-secondary)' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          <button onClick={run} disabled={loading}
            style={{ background: 'var(--accent)', color: 'white', gap: 8, display: 'flex', alignItems: 'center', padding: '6px 16px', borderRadius: 4, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
            {loading
              ? <><span className="spinner" style={{ borderTopColor: 'white', width: 14, height: 14, borderWidth: 2 }} /> Gerando...</>
              : <><Zap size={14} /> Gerar Agora</>}
          </button>
        </div>
      </div>
    </div>
  );
}
