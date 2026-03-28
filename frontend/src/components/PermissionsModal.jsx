import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, Unlock, Save, CheckCircle } from 'lucide-react';
import { PERMISSIONS } from '../utils/constants';
import api from '../utils/api';

export default function PermissionsModal({ soldier, onClose, addToast }) {
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/permissions/${soldier._id || soldier.id}`)
      .then(r => setPerms(r.data.permissions || []))
      .catch(() => setPerms([]))
      .finally(() => setLoading(false));
  }, [soldier._id || soldier.id]);

  const toggle = (key) =>
    setPerms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/permissions/${soldier._id || soldier.id}`, { permissions: perms });
      addToast('Permissões atualizadas com sucesso', 'success');
      onClose();
    } catch (err) {
      addToast(err.response?.data?.error || 'Erro ao salvar permissões', 'error');
    } finally { setSaving(false); }
  };

  const isAdmin = soldier.role === 'admin';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-secondary)' }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', marginBottom:4 }}>CONTROLE DE ACESSO</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:'0.08em' }}>
              PERMISSÕES — {soldier.war_name}
            </h2>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X size={18} /></button>
        </div>

        <div style={{ padding:'20px 22px' }}>
          {isAdmin ? (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', background:'linear-gradient(135deg,var(--accent),var(--olive-700))', borderRadius:6, color:'white' }}>
              <Shield size={18} />
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600 }}>Administrador Supremo</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, opacity:0.85 }}>Acesso total a todos os painéis — não editável</div>
              </div>
            </div>
          ) : loading ? (
            <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
              <span className="spinner" style={{ borderTopColor:'var(--accent)' }} />
            </div>
          ) : (
            <>
              <p style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', marginBottom:16, letterSpacing:'0.04em' }}>
                Selecione os painéis que <strong style={{ color:'var(--text-primary)' }}>{soldier.war_name}</strong> poderá acessar:
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {PERMISSIONS.map(p => {
                  const active = perms.includes(p.key);
                  return (
                    <button key={p.key} onClick={() => toggle(p.key)} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:6, cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                      border: active ? '2px solid var(--accent)' : '2px solid var(--border)',
                      background: active ? 'rgba(94,114,68,0.06)' : 'var(--bg-secondary)',
                    }}>
                      <div style={{ width:34, height:34, borderRadius:6, background: active ? 'var(--accent)' : 'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}>
                        {active ? <Unlock size={16} color="white" /> : <Lock size={16} color="var(--text-muted)" />}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>{p.label}</div>
                        <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{p.desc}</div>
                      </div>
                      {active && <CheckCircle size={18} style={{ color:'var(--accent)', flexShrink:0 }} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {!isAdmin && (
          <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end', background:'var(--bg-secondary)' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || loading} style={{ gap:8 }}>
              {saving ? <><span className="spinner" style={{ borderTopColor:'white' }} />Salvando...</> : <><Save size={15} />Salvar Permissões</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
