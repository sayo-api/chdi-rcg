import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, Hash, CheckCircle, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import api from '../utils/api';

export default function FirstAccessPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Pode vir pré-preenchido do LoginPage
  const [form, setForm]       = useState({
    war_number: location.state?.war_number || '',
    password:   '',
    confirm:    '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const strength = form.password.length >= 10 ? 3 : form.password.length >= 6 ? 2 : form.password.length > 0 ? 1 : 0;
  const strengthMeta = [
    null,
    { label: 'Fraca',  color: 'var(--danger)'  },
    { label: 'Média',  color: 'var(--warning)' },
    { label: 'Forte',  color: 'var(--success)' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.war_number.trim()) { setError('Informe o número de guerra.'); return; }
    if (form.password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (form.password !== form.confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/first-access', {
        war_number: form.war_number,
        password:   form.password,
      });
      localStorage.setItem('military_token', res.data.token);
      localStorage.setItem('military_user',  JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao definir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      {/* BG */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-5%', right: '-5%', width: 400, height: 400, background: 'radial-gradient(ellipse, rgba(94,114,68,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: 500, height: 350, background: 'radial-gradient(ellipse, rgba(139,110,58,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025 }}>
          <defs><pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a4538" strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid2)" />
        </svg>
      </div>

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 1, borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={16} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
            SIGM<span style={{ color: 'var(--accent)' }}>IL</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', padding: '4px 8px', borderRadius: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={14} /> Voltar ao login
        </button>
      </div>

      {/* Form */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{
          width: '100%', maxWidth: 440,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, borderRadius: 8, background: 'linear-gradient(135deg, var(--warning) 0%, var(--khaki-700) 100%)', boxShadow: '0 6px 20px rgba(139,110,58,0.3)', marginBottom: 18 }}>
              <KeyRound size={30} color="white" strokeWidth={1.5} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.1em', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>
              PRIMEIRO ACESSO
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              CRIE SUA SENHA PESSOAL PARA ATIVAR A CONTA
            </p>
          </div>

          {/* Card */}
          <div style={{ background: 'rgba(255,255,255,0.94)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 32px rgba(26,25,20,0.1)', overflow: 'hidden' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, var(--warning) 0%, var(--khaki-600) 100%)' }} />

            {/* Info banner */}
            <div style={{ padding: '14px 24px', background: 'var(--warning-light)', borderBottom: '1px solid rgba(139,110,58,0.15)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--warning)', lineHeight: 1.5 }}>
                Sua conta foi criada pelo administrador. Informe seu <strong>número de guerra</strong> e escolha uma <strong>senha pessoal</strong> para ativar o acesso.
              </p>
            </div>

            <div style={{ padding: '24px 28px 20px' }}>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Número de guerra */}
                  <div className="form-group">
                    <label className="form-label">
                      <Hash size={10} style={{ display: 'inline', marginRight: 4 }} />
                      Número de Guerra
                    </label>
                    <input className="form-input"
                      style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                      type="text" placeholder="Ex: SD0042"
                      value={form.war_number}
                      onChange={e => setForm(f => ({ ...f, war_number: e.target.value }))}
                      autoFocus={!form.war_number}
                      required />
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      Número fornecido pelo administrador no momento do cadastro
                    </p>
                  </div>

                  {/* Senha */}
                  <div className="form-group">
                    <label className="form-label">
                      <Lock size={10} style={{ display: 'inline', marginRight: 4 }} />
                      Nova Senha <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(mín. 6 caracteres)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input className="form-input"
                        style={{ paddingRight: 40, autoFocus: !!form.war_number }}
                        type={showPass ? 'text' : 'password'}
                        placeholder="Crie uma senha segura"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        autoFocus={!!form.war_number}
                        required />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {form.password.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${(strength / 3) * 100}%`,
                            background: strengthMeta[strength]?.color || 'transparent',
                            transition: 'all 0.3s ease',
                            borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: strengthMeta[strength]?.color, minWidth: 36 }}>
                          {strengthMeta[strength]?.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirmar */}
                  <div className="form-group">
                    <label className="form-label">Confirmar Senha</label>
                    <input className="form-input"
                      style={{
                        borderColor: form.confirm && form.password !== form.confirm
                          ? 'var(--danger)' : form.confirm && form.password === form.confirm
                          ? 'var(--success)' : '',
                      }}
                      type="password" placeholder="Repita a senha"
                      value={form.confirm}
                      onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                      required />
                    {form.confirm && form.password === form.confirm && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={10} /> Senhas coincidem
                      </p>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--danger-light)', border: '1px solid rgba(139,58,58,0.2)', borderRadius: 4, fontSize: 13, color: 'var(--danger)', animation: 'fadeIn 0.2s ease' }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={loading}
                    style={{ height: 44, fontSize: 14, letterSpacing: '0.04em', marginTop: 4, background: 'var(--warning)', boxShadow: '0 4px 14px rgba(139,110,58,0.3)' }}>
                    {loading
                      ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Ativando conta...</>
                      : <><CheckCircle size={16} /> Definir senha e entrar</>}
                  </button>

                  <button type="button" className="btn btn-ghost"
                    onClick={() => navigate('/login')}
                    style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <ArrowLeft size={14} /> Voltar ao login
                  </button>
                </div>
              </form>
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16, letterSpacing: '0.06em' }}>
            ACESSO MONITORADO — ATIVIDADE REGISTRADA
          </p>
        </div>
      </div>
    </div>
  );
}
