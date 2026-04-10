import React, { useEffect, useState } from 'react';
import { X, Shield, MapPin, Mail, Phone, Home, Clock, Monitor, Activity, Hash, Pencil, UserX, UserCheck, Trash2, AlertTriangle, Key } from 'lucide-react';
import { formatDate, getRankLabel } from '../utils/constants';
import api from '../utils/api';

function Row({ label, value, mono }) {
  if (!value) return null;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</span>
      <span style={{ fontSize:13, color:'var(--text-primary)', fontFamily: mono?'var(--font-mono)':'var(--font-body)', letterSpacing: mono?'0.04em':0 }}>{value}</span>
    </div>
  );
}

export default function SoldierDetailModal({ soldier, onClose, onEdit, onToggleActive, onDelete, onPermissions }) {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.get(`/users/${soldier._id||soldier.id}/logs`).then(r => setLogs(r.data)).finally(() => setLogsLoading(false));
  }, [soldier._id||soldier.id]);

  const isAdmin = soldier.war_number === 'SAYOZ';

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth:640 }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,var(--khaki-700) 0%,var(--khaki-900) 100%)', padding:'24px 24px 20px', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', color:'white', padding:6, borderRadius:4, display:'flex' }}>
            <X size={16} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:56, height:56, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:26, color:'white' }}>{soldier.war_name[0]}</span>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.6)', letterSpacing:'0.1em', marginBottom:4 }}>#{soldier.war_number}</div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'white', letterSpacing:'0.08em', lineHeight:1, marginBottom:4 }}>{soldier.war_name}</h2>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span className="badge" style={{ background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.9)', border:'none', fontSize:10 }}>
                  <Shield size={10} /> {getRankLabel(soldier.rank)}
                </span>
                <span className={`badge badge-${soldier.is_active?'active':'inactive'}`} style={{ fontSize:10 }}>{soldier.is_active?'Ativo':'Inativo'}</span>
                {soldier.first_access===true && <span className="badge badge-pending" style={{ fontSize:10 }}>Aguardando senha</span>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:'20px 24px', overflowY:'auto', maxHeight:'60vh' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <Row label="Nome Civil" value={soldier.full_name} />
            <Row label="Pelotão" value={soldier.platoon} />
            <Row label="Esquadrão" value={soldier.squad} />
            <Row label="E-mail" value={soldier.email} />
            <Row label="Telefone" value={soldier.phone} />
            <Row label="Endereço" value={soldier.address} />
          </div>

          {/* Painéis com acesso */}
          {soldier.role !== 'admin' && (
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <Key size={13} style={{ color:'var(--accent)' }} />
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Painéis liberados</span>
                <div style={{ flex:1, height:1, background:'var(--border)' }} />
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(soldier.permissions||[]).length === 0 ? (
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>Nenhum acesso liberado</span>
                ) : (soldier.permissions||[]).map(p => (
                  <span key={p} className="badge badge-rank" style={{ fontSize:11 }}>{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <Activity size={13} style={{ color:'var(--accent)' }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Atividade</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
            <div style={{ padding:'12px 14px', background:'var(--bg-secondary)', borderRadius:6, border:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}><Clock size={10}/> Conta criada</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{formatDate(soldier.created_at)}</div>
            </div>
            <div style={{ padding:'12px 14px', background:'var(--bg-secondary)', borderRadius:6, border:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}><Clock size={10}/> Último acesso</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{formatDate(soldier.last_login)}</div>
            </div>
            {soldier.last_ip && (
              <div style={{ gridColumn:'span 2', padding:'12px 14px', background:'var(--bg-secondary)', borderRadius:6, border:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}><Monitor size={10}/> Último IP</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-secondary)', wordBreak:'break-all' }}>{soldier.last_ip}</div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <Hash size={13} style={{ color:'var(--accent)' }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Log de Acessos</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>
          <div style={{ border:'1px solid var(--border)', borderRadius:6, overflow:'hidden' }}>
            {logsLoading ? (
              <div style={{ padding:16, textAlign:'center', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>Carregando...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding:16, textAlign:'center', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>Nenhum acesso registrado</div>
            ) : (
              logs.slice(0,10).map((log, i) => (
                <div key={log._id||i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom: i<logs.length-1?'1px solid var(--bg-secondary)':'none', background: i%2===0?'transparent':'var(--bg-secondary)' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:log.success?'var(--success)':'var(--danger)', flexShrink:0 }} />
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', flex:1 }}>{log.ip_address||'—'}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>{formatDate(log.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer actions */}
        {!confirmDelete ? (
          <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'space-between', flexWrap:'wrap', background:'var(--bg-secondary)' }}>
            <div style={{ display:'flex', gap:8 }}>
              {!isAdmin && (
                <>
                  <button onClick={onToggleActive} className={`btn btn-sm ${soldier.is_active?'btn-secondary':'btn-primary'}`} style={{ gap:6 }}>
                    {soldier.is_active ? <><UserX size={14}/>Desativar</> : <><UserCheck size={14}/>Ativar</>}
                  </button>
                  <button onClick={() => setConfirmDelete(true)} className="btn btn-sm btn-danger" style={{ gap:6 }}>
                    <Trash2 size={14}/> Excluir
                  </button>
                </>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {!isAdmin && onPermissions && (
                <button onClick={onPermissions} className="btn btn-sm btn-secondary" style={{ gap:6, color:'var(--accent)', borderColor:'var(--accent)' }}>
                  <Key size={14}/> Permissões
                </button>
              )}
              <button onClick={onClose} className="btn btn-sm btn-secondary">Fechar</button>
              <button onClick={onEdit} className="btn btn-sm btn-primary" style={{ gap:6 }}>
                <Pencil size={14}/> Editar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--danger-light)', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <AlertTriangle size={16} style={{ color:'var(--danger)', flexShrink:0 }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--danger)', flex:1 }}>
              Confirmar exclusão permanente de {soldier.war_name}?
            </span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-sm btn-secondary">Cancelar</button>
              <button onClick={onDelete} className="btn btn-sm btn-danger">Confirmar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
