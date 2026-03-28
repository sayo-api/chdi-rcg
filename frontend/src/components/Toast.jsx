import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

export default function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(toast => {
        const Icon = ICONS[toast.type] || CheckCircle;
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`} style={{ animation: 'slideInRight 0.3s ease' }}>
            <Icon size={16} />
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7, padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
