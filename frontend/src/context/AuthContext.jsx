import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('military_token');
    const stored = localStorage.getItem('military_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        api.get('/auth/me').then(r => {
          setUser(r.data);
          localStorage.setItem('military_user', JSON.stringify(r.data));
        }).catch(() => {
          localStorage.removeItem('military_token');
          localStorage.removeItem('military_user');
          setUser(null);
        }).finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (war_number, password) => {
    const response = await api.post('/auth/login', { war_number, password });
    const { token, user: userData, first_access } = response.data;
    localStorage.setItem('military_token', token);
    localStorage.setItem('military_user', JSON.stringify(userData));
    setUser(userData);
    return { first_access };
  };

  const logout = () => {
    localStorage.removeItem('military_token');
    localStorage.removeItem('military_user');
    setUser(null);
  };

  // Check if user has a specific panel permission
  const hasPermission = (panel) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return (user.permissions || []).includes(panel);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
