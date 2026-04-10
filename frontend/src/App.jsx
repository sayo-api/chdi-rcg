import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage        from './pages/LoginPage';
import FirstAccessPage  from './pages/FirstAccessPage';
import DashboardLayout  from './components/DashboardLayout';
import DashboardHome    from './pages/DashboardHome';
import SoldiersPage     from './pages/SoldiersPage';
import ChamadaPage      from './pages/ChamadaPage';
import GerirChamadaPage from './pages/GerirChamadaPage';
import EscalaPage       from './pages/EscalaPage';
import AdminMusicas     from './pages/AdminMusicas';
import AdminCategorias  from './pages/AdminCategorias';
import AdminPublicar    from './pages/AdminPublicar';
import AdminTutoriais   from './pages/AdminTutoriais';
import AdminPosts        from './pages/AdminPosts';
import AdminPdfs         from './pages/AdminPdfs';

function Loader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>CARREGANDO SISTEMA...</span>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function PermRoute({ children, perm }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const p = user?.permissions || [];
  // escala and escala_manage are interchangeable for access
  const ok = isAdmin || p.includes(perm) ||
    (perm === 'escala' && p.includes('escala_manage')) ||
    (perm === 'escala_manage' && p.includes('escala'));
  if (!ok) return <Navigate to="/dashboard" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function Wrap({ children }) {
  return <PrivateRoute><DashboardLayout>{children}</DashboardLayout></PrivateRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/primeiro-acesso" element={<FirstAccessPage />} />

          <Route path="/dashboard" element={
            <Wrap><DashboardHome /></Wrap>
          } />
          <Route path="/dashboard/soldados" element={
            <Wrap><AdminRoute><SoldiersPage /></AdminRoute></Wrap>
          } />
          <Route path="/dashboard/chamada" element={
            <Wrap><PermRoute perm="rollcall"><ChamadaPage /></PermRoute></Wrap>
          } />
          <Route path="/dashboard/chamadas" element={
            <Wrap><PermRoute perm="rollcall_manage"><GerirChamadaPage /></PermRoute></Wrap>
          } />
          <Route path="/dashboard/escala" element={
            <Wrap><PermRoute perm="escala"><EscalaPage /></PermRoute></Wrap>
          } />
          <Route path="/dashboard/escala-admin" element={
            <Wrap><PermRoute perm="escala_manage"><EscalaPage /></PermRoute></Wrap>
          } />
          <Route path="/dashboard/musicas" element={
            <Wrap><AdminRoute><AdminMusicas /></AdminRoute></Wrap>
          } />
          <Route path="/dashboard/categorias" element={
            <Wrap><AdminRoute><AdminCategorias /></AdminRoute></Wrap>
          } />
          <Route path="/dashboard/publicar" element={
            <Wrap><AdminRoute><AdminPublicar /></AdminRoute></Wrap>
          } />
          <Route path="/dashboard/tutoriais" element={
            <Wrap><AdminRoute><AdminTutoriais /></AdminRoute></Wrap>
          } />
          <Route path="/dashboard/posts" element={
            <Wrap><AdminRoute><AdminPosts /></AdminRoute></Wrap>
          } />
          <Route path="/dashboard/pdfs" element={
            <Wrap><AdminRoute><AdminPdfs /></AdminRoute></Wrap>
          } />

          <Route path="/"  element={<Navigate to="/login" replace />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
