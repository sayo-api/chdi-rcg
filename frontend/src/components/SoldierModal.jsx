import React, { useState, useEffect } from 'react';
import { X, User, Hash, Star, MapPin, Mail, Phone, Home, Users, Save, AlertCircle } from 'lucide-react';
import { RANKS, SQUADS, PLATOONS } from '../utils/constants';
import api from '../utils/api';

export default function SoldierModal({ soldier, onClose, onSave, addToast }) {
  const isEdit = !!soldier?.id;
  const [form, setForm] = useState({
    war_number: '', war_name: '', full_name: '', rank: 'soldado_ev',
    squad: '', platoon: '', email: '', phone: '', address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (soldier) {
      setForm({
        war_number: soldier.war_number || '',
        war_name: soldier.war_name || '',
        full_name: soldier.full_name || '',
        rank: soldier.rank || 'soldado_ev',
        squad: soldier.squad || '',
        platoon: soldier.platoon || '',
        email: soldier.email || '',
        phone: soldier.phone || '',
        address: soldier.address || '',
      });
    }
  }, [soldier]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.war_number.trim()) { setError('Número de guerra é obrigatório.'); return; }
    if (!form.war_name.trim()) { setError('Nome de guerra é obrigatório.'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        const res = await api.put(`/users/${soldier.id}`, form);
        onSave(res.data, 'edit');
        addToast('Dados atualizados com sucesso', 'success');
      } else {
        const res = await api.post('/users', form);
        onSave(res.data, 'create');
        addToast('Soldado cadastrado com sucesso', 'success');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {isEdit ? 'Editar cadastro' : 'Novo cadastro'}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
              {isEdit ? `EDITAR — ${soldier.war_name}` : 'CADASTRAR SOLDADO'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px' }}>
            {/* Section: Identificação */}
            <SectionTitle>Identificação Militar</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label"><Hash size={10} style={{ display: 'inline', marginRight: 4 }} />Número de Guerra *</label>
                <input className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  type="text" placeholder="Ex: SD0042" value={form.war_number}
                  onChange={e => set('war_number', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label"><User size={10} style={{ display: 'inline', marginRight: 4 }} />Nome de Guerra *</label>
                <input className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  type="text" placeholder="Ex: SILVA" value={form.war_name}
                  onChange={e => set('war_name', e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Nome Civil (opcional)</label>
                <input className="form-input" type="text" placeholder="Nome completo" value={form.full_name}
                  onChange={e => set('full_name', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label"><Star size={10} style={{ display: 'inline', marginRight: 4 }} />Patente</label>
                <select className="form-input" value={form.rank} onChange={e => set('rank', e.target.value)}>
                  {RANKS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {/* Section: Organização */}
            <SectionTitle>Organização</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label"><Users size={10} style={{ display: 'inline', marginRight: 4 }} />Esquadrão</label>
                <select className="form-input" value={form.squad} onChange={e => set('squad', e.target.value)}>
                  <option value="">Selecionar...</option>
                  {SQUADS.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__custom">Outro...</option>
                </select>
                {form.squad === '__custom' && (
                  <input className="form-input" style={{ marginTop: 8 }} type="text" placeholder="Nome do esquadrão"
                    onChange={e => set('squad', e.target.value)} autoFocus />
                )}
              </div>
              <div className="form-group">
                <label className="form-label"><MapPin size={10} style={{ display: 'inline', marginRight: 4 }} />Pelotão</label>
                <select className="form-input" value={form.platoon} onChange={e => set('platoon', e.target.value)}>
                  <option value="">Selecionar...</option>
                  {PLATOONS.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="__custom">Outro...</option>
                </select>
                {form.platoon === '__custom' && (
                  <input className="form-input" style={{ marginTop: 8 }} type="text" placeholder="Nome do pelotão"
                    onChange={e => set('platoon', e.target.value)} autoFocus />
                )}
              </div>
            </div>

            {/* Section: Contato */}
            <SectionTitle>Contato (opcional)</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
              <div className="form-group">
                <label className="form-label"><Mail size={10} style={{ display: 'inline', marginRight: 4 }} />E-mail</label>
                <input className="form-input" type="email" placeholder="email@exemplo.com" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label"><Phone size={10} style={{ display: 'inline', marginRight: 4 }} />Telefone</label>
                <input className="form-input" type="tel" placeholder="(00) 00000-0000" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label"><Home size={10} style={{ display: 'inline', marginRight: 4 }} />Endereço</label>
                <input className="form-input" type="text" placeholder="Endereço completo" value={form.address}
                  onChange={e => set('address', e.target.value)} />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--danger-light)', border: '1px solid rgba(139,58,58,0.2)', borderRadius: 4, fontSize: 13, color: 'var(--danger)', marginTop: 16 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'var(--bg-secondary)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Salvando...</> : <><Save size={16} /> {isEdit ? 'Salvar Alterações' : 'Cadastrar Soldado'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}
