import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, Users, LogOut, Menu, X, ChevronRight,
  Activity, ClipboardList, BookOpen, CalendarDays, Music, Rocket, Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRankShort } from '../utils/constants';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const perms   = user?.permissions || [];
  const has     = (p) => isAdmin || perms.includes(p);

  // Build nav items — only items the user can actually access
  const navItems = [];

  if (has('dashboard'))
    navItems.push({ to: '/dashboard',          icon: Activity,       label: 'Painel Geral',       end: true });

  if (has('rollcall'))
    navItems.push({ to: '/dashboard/chamada',  icon: ClipboardList,  label: 'Chamada do Dia' });

  if (has('rollcall_manage'))
    navItems.push({ to: '/dashboard/chamadas', icon: BookOpen,       label: 'Gerenciar Chamadas' });

  // Escala: one entry pointing to the right route
  if (has('escala') || has('escala_manage')) {
    const route = has('escala_manage') ? '/dashboard/escala-admin' : '/dashboard/escala';
    navItems.push({ to: route, icon: CalendarDays, label: 'Escala de Serviço' });
  }

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, background: 'linear-gradient(135deg,var(--accent) 0%,var(--olive-700) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(94,114,68,0.3)', flexShrink: 0 }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.1em', lineHeight: 1 }}>
              SIGM<span style={{ color: 'var(--accent)' }}>IL</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>GESTÃO MILITAR</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div style={{ padding: '10px 10px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: 'linear-gradient(135deg,var(--khaki-400) 0%,var(--khaki-600) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'white' }}>{user?.war_name?.[0] || '?'}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.war_name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {isAdmin ? 'ADMINISTRADOR' : getRankShort(user?.rank)?.toUpperCase()}
            </div>
          </div>
          {isAdmin && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: 10, flexShrink: 0 }}>ADM</span>}
        </div>
      </div>

      {/* Navigation — only accessible items */}
      <nav style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navItems.length > 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', padding: '6px 12px 4px', textTransform: 'uppercase' }}>Menu</div>
        )}

        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={!!end}
            onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 6,
              textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'white' : 'var(--text-secondary)',
            })}>
            {({ isActive }) => (<><Icon size={15} /><span style={{ flex: 1 }}>{label}</span>{isActive && <ChevronRight size={13} />}</>)}
          </NavLink>
        ))}

        {/* Admin-only section */}
        {isAdmin && (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', padding: '10px 12px 4px', textTransform: 'uppercase' }}>Administração</div>

            {[
              { to: '/dashboard/soldados',   icon: Users,   label: 'Efetivo & Permissões', end: true },
              { to: '/dashboard/categorias', icon: Layers,  label: 'Categorias' },
              { to: '/dashboard/musicas',    icon: Music,   label: 'Músicas do App' },
              { to: '/dashboard/publicar',   icon: Rocket,  label: 'Publicar para App' },
            ].map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={!!end} onClick={() => setOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 6,
                  textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                })}>
                {({ isActive }) => (<><Icon size={15} /><span style={{ flex: 1 }}>{label}</span>{isActive && <ChevronRight size={13} />}</>)}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: '8px 8px 12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout} className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '9px 12px', fontSize: 13, color: 'var(--danger)' }}>
          <LogOut size={15} /> Sair do Sistema
        </button>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
          #{user?.war_number}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Desktop sidebar */}
      <aside className="desktop-sidebar"
        style={{ width: 240, flexShrink: 0, background: 'white', borderRight: '1px solid var(--border)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={() => setOpen(false)} />
          <aside style={{ position: 'relative', width: 260, background: 'white', height: '100%', overflowY: 'auto', animation: 'slideInLeft 0.25s ease', zIndex: 1 }}>
            <button onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="mobile-header"
          style={{ display: 'none', padding: '12px 16px', background: 'white', borderBottom: '1px solid var(--border)', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-primary)' }}>
            <Menu size={22} />
          </button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.1em' }}>
            SIGM<span style={{ color: 'var(--accent)' }}>IL</span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px', maxWidth: 1600, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
