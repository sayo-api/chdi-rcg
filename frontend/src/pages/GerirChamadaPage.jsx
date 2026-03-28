import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, FileText, ChevronLeft, ChevronRight, Eye, Trash2, Download,
  CheckCircle, XCircle, Clock, AlertCircle, Calendar, Users, RotateCcw, RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import { getRankShort, STATUS_COLORS, STATUS_LABELS, formatDate, formatDateOnly } from '../utils/constants';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

function StatPill({ label, value, color }) {
  return (
    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, padding:'3px 10px', borderRadius:20, background:color+'18', color, border:`1px solid ${color}33` }}>
      {value} {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return <span style={{ fontFamily:'var(--font-mono)', fontSize:11, padding:'2px 8px', borderRadius:12, background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>{STATUS_LABELS[status]||status}</span>;
}

export default function GerirChamadaPage() {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  const loadList = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/rollcall?page=${p}&limit=15`);
      setCalls(res.data.calls);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } catch (err) { addToast('Erro ao carregar chamadas', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadList(); }, []);

  const openDetail = async (call) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await api.get(`/rollcall/${call._id}`);
      setSelected(res.data);
    } catch { addToast('Erro ao carregar chamada', 'error'); }
    finally { setDetailLoading(false); }
  };

  const downloadWord = async (call) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('military_token');
      const res = await fetch(`/api/rollcall-export/${call._id}/word`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao gerar documento');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chamada_${call.date}_${call._id.slice(-4)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Documento Word gerado com sucesso', 'success');
    } catch (err) { addToast(err.message || 'Erro ao gerar Word', 'error'); }
    finally { setDownloading(false); }
  };

  const deleteCall = async (call) => {
    try {
      await api.delete(`/rollcall/${call._id}`);
      setCalls(p => p.filter(c => c._id !== call._id));
      if (selected?._id === call._id) setSelected(null);
      setConfirmDelete(null);
      addToast('Chamada excluída', 'success');
    } catch (err) { addToast(err.response?.data?.error || 'Erro ao excluir', 'error'); }
  };

  const statusIcon = (s) => {
    if (s === 'submitted') return <CheckCircle size={14} style={{ color:'var(--success)' }} />;
    if (s === 'reopened')  return <RotateCcw size={14} style={{ color:'var(--warning)' }} />;
    return <Clock size={14} style={{ color:'var(--warning)' }} />;
  };

  const summary = (entries=[]) => ({
    total: entries.length,
    present: entries.filter(e=>e.status==='present').length,
    absent: entries.filter(e=>e.status==='absent').length,
    late: entries.filter(e=>e.status==='late').length,
  });

  const selEntries = selected?.entries || [];
  const selSummary = summary(selEntries);

  // Group entries by platoon/squad
  const grouped = {};
  const RANK_ORDER = ['comandante','marechal','general_exercito','general_divisao','general_brigada','coronel','tenente_coronel','major','capitao','primeiro_tenente','segundo_tenente','aspirante','subtenente','primeiro_sargento','segundo_sargento','terceiro_sargento','cabo','soldado_ep','soldado_ev'];
  const sortedEntries = [...selEntries].sort((a,b) => {
    const ia = RANK_ORDER.indexOf(a.rank), ib = RANK_ORDER.indexOf(b.rank);
    return ia !== ib ? ia - ib : (a.war_name||'').localeCompare(b.war_name||'');
  });
  for (const e of sortedEntries) {
    const key = e.platoon || e.squad || 'Geral';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Histórico & Gestão</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, letterSpacing:'0.08em', lineHeight:1 }}>GERENCIAR CHAMADAS</h1>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => loadList(page)} style={{ gap:6 }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>
      <div style={{ height:3, background:'linear-gradient(90deg,var(--accent) 0%,var(--olive-700) 40%,transparent 100%)', borderRadius:2 }} />

      {/* Two-column layout */}
      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:20, alignItems:'start' }}>

        {/* LEFT — List */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', letterSpacing:'0.08em' }}>
                {total} CHAMADA(S)
              </span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => page > 1 && loadList(page-1)} disabled={page<=1} className="btn btn-icon btn-ghost btn-sm"><ChevronLeft size={14} /></button>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', alignSelf:'center', padding:'0 4px' }}>{page}/{pages||1}</span>
                <button onClick={() => page < pages && loadList(page+1)} disabled={page>=pages} className="btn btn-icon btn-ghost btn-sm"><ChevronRight size={14} /></button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                <span className="spinner" style={{ borderTopColor:'var(--accent)', display:'inline-block' }} />
              </div>
            ) : calls.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>
                Nenhuma chamada encontrada
              </div>
            ) : (
              <div>
                {calls.map((call, i) => {
                  const isSelected = selected?._id === call._id;
                  return (
                    <div key={call._id}
                      onClick={() => openDetail(call)}
                      style={{
                        padding:'12px 14px', cursor:'pointer', borderBottom: i<calls.length-1?'1px solid var(--bg-secondary)':'none',
                        background: isSelected ? 'rgba(94,114,68,0.08)' : 'white',
                        borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                        transition:'all 0.15s',
                      }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        {statusIcon(call.status)}
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, color: isSelected?'var(--accent)':'var(--text-primary)' }}>
                          {formatDateOnly(call.date)}
                        </span>
                        {call.label && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', flex:1, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>{call.label}</span>}
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>
                          por {call.created_by?.war_name || '—'}
                        </span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, padding:'1px 6px', borderRadius:10, background: call.status==='submitted'?'var(--success-light)':call.status==='reopened'?'var(--warning-light)':'var(--warning-light)', color: call.status==='submitted'?'var(--success)':'var(--warning)' }}>
                          {call.status==='submitted'?'Enviada':call.status==='reopened'?'Reaberta':'Aberta'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Detail */}
        <div>
          {detailLoading && (
            <div className="card" style={{ padding:60, textAlign:'center', color:'var(--text-muted)' }}>
              <span className="spinner" style={{ borderTopColor:'var(--accent)', display:'inline-block', marginBottom:12 }} />
              <div style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>Carregando...</div>
            </div>
          )}

          {!selected && !detailLoading && (
            <div className="card" style={{ padding:60, textAlign:'center' }}>
              <BookOpen size={36} style={{ color:'var(--border-strong)', margin:'0 auto 16px' }} />
              <div style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:8 }}>SELECIONE UMA CHAMADA</div>
              <p style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>Clique em uma chamada da lista para visualizar</p>
            </div>
          )}

          {selected && !detailLoading && (
            <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn 0.3s ease' }}>
              {/* Detail header */}
              <div className="card" style={{ overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,var(--khaki-700) 0%,var(--khaki-900) 100%)', padding:'18px 20px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.6)', letterSpacing:'0.1em', marginBottom:6 }}>
                        BOLETIM DE CHAMADA
                      </div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'white', letterSpacing:'0.08em', marginBottom:8 }}>
                        {formatDateOnly(selected.date)}
                        {selected.label && <span style={{ fontSize:14, marginLeft:10, opacity:0.8 }}>— {selected.label}</span>}
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <StatPill label="total" value={selSummary.total} color="#ffffff" />
                        <StatPill label="presentes" value={selSummary.present} color="#90d4a0" />
                        <StatPill label="ausentes" value={selSummary.absent} color="#f0a0a0" />
                        <StatPill label="atrasados" value={selSummary.late} color="#ffe082" />
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <button onClick={() => downloadWord(selected)} disabled={downloading} className="btn btn-sm" style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.3)', gap:6 }}>
                        {downloading ? <><span className="spinner" style={{ borderTopColor:'white', width:13, height:13, borderWidth:2 }} />Gerando...</> : <><Download size={14} />Exportar Word</>}
                      </button>
                      <button onClick={() => setConfirmDelete(selected)} className="btn btn-sm" style={{ background:'rgba(220,53,69,0.25)', color:'#ffaaaa', border:'1px solid rgba(220,53,69,0.3)', gap:6 }}>
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Meta info */}
                <div style={{ padding:'12px 20px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', gap:20, flexWrap:'wrap' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
                    <span style={{ color:'var(--text-secondary)' }}>Criada por:</span> {selected.created_by?.war_name} — {formatDate(selected.opened_at)}
                  </div>
                  {selected.submitted_at && (
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
                      <span style={{ color:'var(--text-secondary)' }}>Enviada:</span> {formatDate(selected.submitted_at)}
                    </div>
                  )}
                  {selected.general_observation && (
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
                      <span style={{ color:'var(--text-secondary)' }}>Obs:</span> {selected.general_observation}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ height:4, background:'var(--border)', display:'flex', overflow:'hidden' }}>
                  <div style={{ width:`${(selSummary.present/selSummary.total)*100}%`, background:'var(--success)' }} />
                  <div style={{ width:`${(selSummary.late/selSummary.total)*100}%`, background:'var(--warning)' }} />
                  <div style={{ width:`${(selSummary.absent/selSummary.total)*100}%`, background:'var(--danger)' }} />
                </div>
              </div>

              {/* Entries grouped by platoon */}
              {Object.entries(grouped).map(([group, groupEntries]) => (
                <div key={group} className="card" style={{ overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                    <Users size={13} style={{ color:'var(--accent)' }} />
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{group}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', marginLeft:'auto' }}>{groupEntries.length} soldados</span>
                  </div>
                  <div>
                    {groupEntries.map((e, i) => {
                      const c = STATUS_COLORS[e.status];
                      return (
                        <div key={e._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom: i<groupEntries.length-1?'1px solid var(--bg-secondary)':'none', background: i%2===0?'white':'var(--bg-primary)' }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:c?.text||'#aaa', flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700 }}>{e.war_name}</span>
                              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>{e.war_number}</span>
                              <span className="badge badge-rank" style={{ fontSize:10 }}>{getRankShort(e.rank)}</span>
                            </div>
                            {e.observation && <div style={{ fontFamily:'var(--font-body)', fontSize:11, color:'var(--text-muted)', fontStyle:'italic', marginTop:2 }}>{e.observation}</div>}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                            <StatusBadge status={e.status} />
                            {e.arrival_time && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--warning)' }}><Clock size={9} style={{ display:'inline', marginRight:3 }} />{e.arrival_time}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setConfirmDelete(null)}>
          <div className="modal-content" style={{ maxWidth:380 }}>
            <div style={{ padding:24 }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:20 }}>
                <AlertCircle size={24} style={{ color:'var(--danger)', flexShrink:0 }} />
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:'0.06em', marginBottom:6 }}>EXCLUIR CHAMADA?</div>
                  <p style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)' }}>
                    A chamada de <strong style={{ color:'var(--text-primary)' }}>{formatDateOnly(confirmDelete.date)}</strong> será excluída permanentemente. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteCall(confirmDelete)}>Confirmar Exclusão</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .gerir-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
