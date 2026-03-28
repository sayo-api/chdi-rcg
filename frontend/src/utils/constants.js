export const RANKS = [
  { value: 'soldado_ev', label: 'Soldado EV', short: 'Sd EV', tier: 0 },
  { value: 'soldado_ep', label: 'Soldado EP', short: 'Sd EP', tier: 0 },
  { value: 'cabo', label: 'Cabo', short: 'Cb', tier: 1 },
  { value: 'terceiro_sargento', label: '3º Sargento', short: '3º Sgt', tier: 2 },
  { value: 'segundo_sargento', label: '2º Sargento', short: '2º Sgt', tier: 2 },
  { value: 'primeiro_sargento', label: '1º Sargento', short: '1º Sgt', tier: 2 },
  { value: 'subtenente', label: 'Subtenente', short: 'ST', tier: 3 },
  { value: 'aspirante', label: 'Aspirante', short: 'Asp', tier: 4 },
  { value: 'segundo_tenente', label: '2º Tenente', short: '2º Ten', tier: 4 },
  { value: 'primeiro_tenente', label: '1º Tenente', short: '1º Ten', tier: 4 },
  { value: 'capitao', label: 'Capitão', short: 'Cap', tier: 5 },
  { value: 'major', label: 'Major', short: 'Maj', tier: 6 },
  { value: 'tenente_coronel', label: 'Tenente Coronel', short: 'TC', tier: 7 },
  { value: 'coronel', label: 'Coronel', short: 'Cel', tier: 8 },
  { value: 'general_brigada', label: 'General de Brigada', short: 'Gen Bda', tier: 9 },
  { value: 'general_divisao', label: 'General de Divisão', short: 'Gen Div', tier: 9 },
  { value: 'general_exercito', label: 'General de Exército', short: 'Gen Ex', tier: 9 },
  { value: 'marechal', label: 'Marechal', short: 'Marechal', tier: 10 },
  { value: 'comandante', label: 'Comandante', short: 'Cmdt', tier: 11 },
];

export const PERMISSIONS = [
  { key: 'dashboard',       label: 'Painel Geral',         desc: 'Visão geral e estatísticas do efetivo',    icon: 'Activity' },
  { key: 'soldiers',        label: 'Efetivo',               desc: 'Listar e gerenciar soldados',               icon: 'Users' },
  { key: 'rollcall',        label: 'Efetuar Chamada',       desc: 'Abrir e registrar chamadas do dia',         icon: 'ClipboardList' },
  { key: 'rollcall_manage', label: 'Gerenciar Chamadas',    desc: 'Histórico, edição e exportação Word',       icon: 'BookOpen' },
  { key: 'escala',          label: 'Escala de Serviço',     desc: 'Visualizar e preencher escalas',            icon: 'CalendarDays' },
  { key: 'escala_manage',   label: 'Gerenciar Escalas',     desc: 'Criar, configurar e gerar escalas automáticas', icon: 'TableProperties' },
];

export const getRankLabel = (value) => RANKS.find(r => r.value === value)?.label || value;
export const getRankShort = (value) => RANKS.find(r => r.value === value)?.short || value;
export const getRankTier  = (value) => RANKS.find(r => r.value === value)?.tier  || 0;

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.includes('Z') || dateStr.includes('T') ? '' : 'Z'));
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
};
export const formatDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};
export const todayStr = () => new Date().toISOString().split('T')[0];

export const SQUADS   = ['1ª Esquadra','2ª Esquadra','3ª Esquadra','4ª Esquadra','Esquadra Alpha','Esquadra Bravo','Esquadra Charlie','Esquadra Delta'];
export const PLATOONS = ['1º Pelotão','2º Pelotão','3º Pelotão','4º Pelotão','Pelotão Alpha','Pelotão Bravo','Pelotão Charlie','Pelotão Delta','Pelotão Especial','Pelotão de Reserva'];

export const STATUS_LABELS = { present:'Presente', absent:'Ausente', late:'Atrasado', pending:'Pendente' };
export const STATUS_COLORS = {
  present: { bg:'#d4edda', text:'#155724', border:'#c3e6cb' },
  absent:  { bg:'#f8d7da', text:'#721c24', border:'#f5c6cb' },
  late:    { bg:'#fff3cd', text:'#856404', border:'#ffeeba' },
  pending: { bg:'#f0f0f0', text:'#6c757d', border:'#dee2e6' },
};

// ── Scale / Escala constants ──────────────────────────────────────────────
export const CELL_STATUS_LIST = [
  { key: 'normal',              label: 'Normal',              color: '#ffffff', text: '#1a1914', border: '#d6cfb8' },
  { key: 'folga',               label: 'Folga',               color: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  { key: 'ferias',              label: 'Férias',              color: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  { key: 'licenca_medica',      label: 'Lic. Médica',         color: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  { key: 'licenca_maternidade', label: 'Lic. Maternidade',    color: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  { key: 'dispensa',            label: 'Dispensado',          color: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  { key: 'missao',              label: 'Missão/Serv. Ext.',   color: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  { key: 'vazio',               label: 'Sem escalação',       color: '#fafafa', text: '#9ca3af', border: '#e5e7eb' },
];

export const getCellStatus = (key) => CELL_STATUS_LIST.find(s => s.key === key) || CELL_STATUS_LIST[0];

export const MONTH_NAMES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export const WEEKDAY_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
