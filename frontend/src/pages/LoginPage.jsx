import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, Hash, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [form, setForm]       = useState({ war_number: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mounted, setMounted]   = useState(false);
  // quando o backend retorna "sem senha", oferecemos o link direto
  const [noPassword, setNoPassword] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
    if (user) navigate('/dashboard');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNoPassword(false);
    setLoading(true);
    try {
      const { first_access } = await login(form.war_number, form.password);
      if (first_access) navigate('/primeiro-acesso');
      else navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao autenticar. Tente novamente.';
      setError(msg);
      // detecta a mensagem de "sem senha" para mostrar o atalho
      if (msg.toLowerCase().includes('primeiro acesso') || msg.toLowerCase().includes('sem senha')) {
        setNoPassword(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const goFirstAccess = () => {
    // leva o número de guerra já preenchido para a tela de primeiro acesso
    navigate('/primeiro-acesso', { state: { war_number: form.war_number } });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      {/* Background shapes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(94,114,68,0.07) 0%, transparent 70%)', borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(74,69,56,0.06) 0%, transparent 70%)', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }}>
          <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a4538" strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
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
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          SISTEMA DE GESTÃO MILITAR
        </span>
      </div>

      {/* Center */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{
          width: '100%', maxWidth: 420,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent) 0%, var(--olive-700) 100%)', boxShadow: '0 8px 24px rgba(94,114,68,0.3)', marginBottom: 20 }}>
              <Shield size={36} color="white" strokeWidth={1.5} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, letterSpacing: '0.12em', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>
              ACESSO AO SISTEMA
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              IDENTIFICAÇÃO OBRIGATÓRIA — USO RESTRITO
            </p>
          </div>

          {/* Card */}
          <div style={{ background: 'rgba(255,255,255,0.94)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 32px rgba(26,25,20,0.1)', overflow: 'hidden' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, var(--accent) 0%, var(--olive-700) 100%)' }} />
            <div style={{ padding: '32px 32px 28px' }}>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  <div className="form-group">
                    <label className="form-label">Número de Guerra</label>
                    <div style={{ position: 'relative' }}>
                      <Hash size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input className="form-input"
                        style={{ paddingLeft: 36, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                        type="text" placeholder="Ex: SD0042" value={form.war_number}
                        onChange={e => { setForm(f => ({ ...f, war_number: e.target.value })); setNoPassword(false); setError(''); }}
                        autoComplete="username" autoFocus required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Senha</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input className="form-input"
                        style={{ paddingLeft: 36, paddingRight: 40 }}
                        type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        autoComplete="current-password" required />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Error normal */}
                  {error && !noPassword && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--danger-light)', border: '1px solid rgba(139,58,58,0.2)', borderRadius: 4, fontSize: 13, color: 'var(--danger)', animation: 'fadeIn 0.2s ease' }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      {error}
                    </div>
                  )}

                  {/* Sem senha — CTA para primeiro acesso */}
                  {noPassword && (
                    <div style={{ animation: 'fadeIn 0.25s ease', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(139,110,58,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--warning-light)' }}>
                        <KeyRound size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--warning)', fontWeight: 600, marginBottom: 2 }}>
                            Conta sem senha cadastrada
                          </p>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--warning)', lineHeight: 1.5 }}>
                            Sua conta foi criada pelo administrador mas você ainda não definiu uma senha pessoal.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={goFirstAccess}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '11px 14px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          fontFamily: 'var(--font-body)', letterSpacing: '0.03em',
                          background: 'var(--warning)', color: 'white',
                          transition: 'filter 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.92)'}
                        onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                      >
                        <KeyRound size={15} />
                        Definir minha senha agora
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={loading}
                    style={{ marginTop: 4, height: 44, fontSize: 14, letterSpacing: '0.04em' }}>
                    {loading
                      ? <><span className="spinner" style={{ borderTopColor: 'white' }} /> Autenticando...</>
                      : <><Shield size={16} /> Entrar no Sistema</>}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Separator */}
          <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              ou
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Primeiro acesso link — sempre visível */}
          <button
            type="button"
            onClick={() => navigate('/primeiro-acesso', { state: { war_number: form.war_number } })}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-body)',
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)',
              color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(94,114,68,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
          >
            <KeyRound size={15} />
            Primeiro acesso — definir minha senha
          </button>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              ACESSO MONITORADO — ATIVIDADE REGISTRADA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
