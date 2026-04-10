import React, { useState, useEffect } from 'react';
import { X, User, Hash, Star, MapPin, Mail, Phone, Home, Users, Save, AlertCircle, Shield, ToggleLeft, ToggleRight, KeyRound, Eye, EyeOff } from 'lucide-react';
import { RANKS, SQUADS, PLATOONS } from '../utils/constants';
import api from '../utils/api';

// War number of the immutable root admin (created by seed)
const ROOT_ADMIN_WN = 'SAYOZ';

export default function SoldierModal({ soldier, onClose, onSave, addToast }) {
  // ── fix: MongoDB returns _id, not id ──────────────────────────────────────
  const soldierId = soldier?._id || soldier?.id;
  const isEdit    = !!soldierId;
  const isRoot    = soldier?.war_number === ROOT_ADMIN_WN;

  const [form, setForm] = useState({
    war_number: '', war_name: '', full_name: '', rank: 'soldado_ev',
    squad: '', platoon: '', email: '', phone: '', address: '',
    role: 'soldier', is_active: true,
  });

  // Reset-password section (edit-only)
  const [resetMode, setResetMode]       = useState(false);
  const [newPassword, setNewPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting]       = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (soldier) {
      setForm({
        war_number: soldier.war_number || '',
        war_name:   soldier.war_name   || '',
        full_name:  soldier.full_name  || '',
        rank:       soldier.rank       || 'soldado_ev',
        squad:      soldier.squad      || '',
        platoon:    soldier.platoon    || '',
        email:      soldier.email      || '',
        phone:      soldier.phone      || '',
        address:    soldier.address    || '',
        role:       soldier.role       || 'soldier',
        is_active:  soldier.is_active  !== undefined ? soldier.is_active : true,
      });
    }
  }, [soldier]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.war_number.trim()) { setError('Número de guerra é obrigatório.'); return; }
    if (!form.war_name.trim())   { setError('Nome de guerra é obrigatório.');   return; }
    setLoading(true);
    try {
      if (isEdit) {
        const payload = { ...form };
        // root admin: never touch war_number or role
        if (isRoot) { delete payload.war_number; delete payload.role; }
        const res = await api.put(`/users/${soldierId}`, payload);
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

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return; }
    setResetting(true); setError('');
    try {
      await api.put(`/users/${soldierId}/reset-password`, { new_password: newPassword });
      addToast(`Senha de ${form.war_name} redefinida com sucesso`, 'success');
      setResetMode(false);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally { setResetting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 600 }}>
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
          <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '70vh' }}>

            {/* Section: Identificação */}
            <SectionTitle>Identificação Militar</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label"><Hash size={10} style={{ display: 'inline', marginRight: 4 }} />Número de Guerra *</label>
                <input className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: isRoot ? 0.5 : 1 }}
                  type="text" placeholder="Ex: SD0042" value={form.war_number}
                  onChange={e => set('war_number', e.target.value)} required disabled={isRoot} />
              </div>
              <div className="form-group">
                <label className="form-label"><User size={10} style={{ display: 'inline', marginRight: 4 }} />Nome de Guerra *</label>
                <input className="form-input" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  type="text" placeholder="Ex: SILVA" value={form.war_name}
                  onChange={e => set('war_name', e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Nome Civil (opcional)</label>
                <input className="form-input" type="text" placeholder="Nome completo" value={form.full_name}
                  onChange={e => set('full_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label"><Star size={10} style={{ display: 'inline', marginRight: 4 }} />Patente</label>
                <select className="form-input" value={form.rank} onChange={e => set('rank', e.target.value)}>
                  {RANKS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label"><Shield size={10} style={{ display: 'inline', marginRight: 4 }} />Nível de Acesso</label>
                <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)} disabled={isRoot}
                  style={{ opacity: isRoot ? 0.5 : 1, borderColor: form.role === 'admin' ? 'var(--accent)' : 'var(--border)' }}>
                  <option value="soldier">Soldado — acesso padrão</option>
                  <option value="admin">Administrador — acesso total</option>
                </select>
              </div>
            </div>

            {/* Status — edit only */}
            {isEdit && (
              <div style={{ marginBottom: 20 }}>
                <button type="button" onClick={() => set('is_active', !form.is_active)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 6, cursor: isRoot ? 'not-allowed' : 'pointer', border: `1px solid ${form.is_active ? 'var(--success)' : 'var(--danger)'}`, background: form.is_active ? 'rgba(40,167,69,0.07)' : 'rgba(220,53,69,0.07)', width: '100%', opacity: isRoot ? 0.5 : 1 }}
                  disabled={isRoot}>
                  {form.is_active
                    ? <ToggleRight size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    : <ToggleLeft  size={20} style={{ color: 'var(--danger)',  flexShrink: 0 }} />}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: form.is_active ? 'var(--success)' : 'var(--danger)' }}>
                      {form.is_active ? 'Conta Ativa' : 'Conta Inativa'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                      {form.is_active ? 'Clique para desativar o acesso' : 'Clique para reativar o acesso'}
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Section: Organização */}
            <SectionTitle>Organização</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
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

            {/* Section: Reset Senha (edit only) */}
            {isEdit && (
              <>
                <SectionTitle>Segurança</SectionTitle>
                {!resetMode ? (
                  <button type="button" onClick={() => { setResetMode(true); setError(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 6, cursor: 'pointer', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 8 }}>
                    <KeyRound size={14} /> Redefinir senha deste usuário
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Nova senha (mín. 6 caracteres)</label>
                      <div style={{ position: 'relative' }}>
                        <input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Nova senha..." value={newPassword}
                          onChange={e => setNewPassword(e.target.value)} style={{ paddingRight: 36 }} />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleResetPassword} disabled={resetting} style={{ gap: 6, whiteSpace: 'nowrap' }}>
                      {resetting ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : <KeyRound size={14} />} Salvar Senha
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setResetMode(false); setNewPassword(''); setError(''); }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--danger-light)', border: '1px solid rgba(139,58,58,0.2)', borderRadius: 4, fontSize: 13, color: 'var(--danger)', marginTop: 12 }}>
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
