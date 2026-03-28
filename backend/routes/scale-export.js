const express = require('express');
const router  = express.Router();
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  convertInchesToTwip, Header, Footer,
} = require('docx');
const Scale = require('../models/Scale');
const { authMiddleware } = require('../middleware/auth');

function guard(req, res, next) {
  const u = req.user;
  if (u.role === 'admin' || (u.permissions||[]).includes('escala') || (u.permissions||[]).includes('escala_manage'))
    return next();
  return res.status(403).json({ error: 'Sem permissão' });
}

/* ── rank labels ─────────────────────────────────────────────────────────── */
const RANK_LABELS = {
  soldado_ev:'Sd EV', soldado_ep:'Sd EP', cabo:'Cb',
  terceiro_sargento:'3º Sgt', segundo_sargento:'2º Sgt', primeiro_sargento:'1º Sgt',
  subtenente:'ST', aspirante:'Asp', segundo_tenente:'2º Ten', primeiro_tenente:'1º Ten',
  capitao:'Cap', major:'Maj', tenente_coronel:'TC', coronel:'Cel',
  general_brigada:'Gen Bda', general_divisao:'Gen Div', general_exercito:'Gen Ex',
  marechal:'Marechal', comandante:'Cmdt',
};

const STATUS_LABELS = {
  normal:'—', folga:'FOLGA', ferias:'FÉRIAS',
  licenca_medica:'LIC. MÉDICA', licenca_maternidade:'LIC. MATERNIDADE',
  dispensa:'DISPENSADO', missao:'MISSÃO', vazio:'—',
};

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function ptDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} de ${MONTH_NAMES[parseInt(m)-1]} de ${y}`;
}

function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function padZ(n) { return String(n).padStart(2,'0'); }
function dowOf(y,m,d) { return new Date(`${y}-${padZ(m)}-${padZ(d)}`).getDay(); }

/* ── docx helpers ────────────────────────────────────────────────────────── */
const C = { DARK:'1A1914', MID:'4A4538', LIGHT:'8B8070', ACCENT:'3A5230', WHITE:'FFFFFF', BG:'F5F3EC', BORDER:'C8C0A8', KHAKI:'D6CFB8', OLIVE:'5E7244', DANGER:'8B3A3A', WARNING:'856404', SUCCESS:'2C5A1A', MUTED:'E8E4D8' };

function txt(text, opts={}) {
  return new TextRun({ text: String(text||''), font:'Arial', size: opts.size||20, bold: opts.bold||false, color: opts.color||C.DARK, italics: opts.italic||false, ...opts });
}

function para(runs, opts={}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing:   { before: opts.before||0, after: opts.after||0 },
    children:  Array.isArray(runs) ? runs : [runs],
    ...opts,
  });
}

function borders(color=C.BORDER, size=4) {
  const b = { style: BorderStyle.SINGLE, size, color };
  return { top:b, bottom:b, left:b, right:b };
}

function cell(children, opts={}) {
  const { bg=C.WHITE, width, vAlign='center', span=1 } = opts;
  return new TableCell({
    columnSpan:  span,
    width:       width ? { size:width, type:WidthType.DXA } : undefined,
    verticalAlign: vAlign,
    shading:     { type:ShadingType.CLEAR, fill:bg },
    margins:     { top:80, bottom:80, left:100, right:100 },
    borders:     borders(),
    children:    Array.isArray(children) ? children : [children],
  });
}

function hcell(text, opts={}) {
  return cell(para(txt(text, { bold:true, size:18, color:C.WHITE }), { align: AlignmentType.CENTER }), { bg: opts.bg||C.DARK, ...opts });
}

/* ─────────────────────────────────────────────────────────────────────────── *
 *  EXPORT: single day  GET /api/scale-export/:id/day/:date                   *
 * ─────────────────────────────────────────────────────────────────────────── */
router.get('/:id/day/:date', authMiddleware, guard, async (req, res) => {
  try {
    const { id, date } = req.params;
    // validate date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });

    const scale = await Scale.findById(id).populate('created_by','war_name war_number rank').lean();
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });

    const [year, month, day] = date.split('-').map(Number);
    const dow = dowOf(year, month, day);
    const dateLabel = `${padZ(day)}/${padZ(month)}/${year}`;
    const dateFullLabel = ptDate(date);
    const weekdayLabel  = WEEKDAYS[dow];

    const activeDT = scale.duty_types.filter(d=>d.active).sort((a,b)=>a.order-b.order);

    // Group entries for this date by duty_type
    const entriesByDuty = {};
    for (const e of scale.entries) {
      if (e.date === date) {
        if (!entriesByDuty[e.duty_type_key]) entriesByDuty[e.duty_type_key] = [];
        entriesByDuty[e.duty_type_key].push(e);
      }
    }
    for (const k of Object.keys(entriesByDuty))
      entriesByDuty[k].sort((a,b)=>(a.slot||0)-(b.slot||0));

    const totalAssigned = Object.values(entriesByDuty).flat().filter(e=>e.soldier_id).length;

    /* ── Build service table rows ── */
    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          hcell('SERVIÇO', { bg: C.DARK, width: 2200 }),
          hcell('NOME DE GUERRA', { bg: C.DARK, width: 3000 }),
          hcell('Nº GUERRA', { bg: C.DARK, width: 1400 }),
          hcell('PATENTE', { bg: C.DARK, width: 1400 }),
          hcell('STATUS', { bg: C.DARK, width: 1600 }),
          hcell('OBSERVAÇÃO', { bg: C.DARK, width: 2800 }),
        ],
      }),
    ];

    let rowIdx = 0;
    for (const dt of activeDT) {
      const entries = (entriesByDuty[dt.key]||[]).filter(e=>e.soldier_id);

      if (entries.length === 0) {
        // Empty service row
        const bg = rowIdx%2===0 ? C.WHITE : C.BG;
        tableRows.push(new TableRow({ children: [
          cell(para(txt(dt.label, { bold:true, size:18 })), { bg }),
          cell(para(txt('— Não escalado —', { color:C.LIGHT, size:17, italic:true })), { bg }),
          cell(para(txt('—', { color:C.LIGHT, size:17 }), { align:AlignmentType.CENTER }), { bg }),
          cell(para(txt('—', { color:C.LIGHT, size:17 }), { align:AlignmentType.CENTER }), { bg }),
          cell(para(txt('—', { color:C.LIGHT, size:17 }), { align:AlignmentType.CENTER }), { bg }),
          cell(para(txt('', { size:17 })), { bg }),
        ]}));
        rowIdx++;
        continue;
      }

      entries.forEach((e, ei) => {
        const bg     = rowIdx%2===0 ? C.WHITE : C.BG;
        const stLbl  = STATUS_LABELS[e.status] || '—';
        const stColor= e.status==='licenca_maternidade'?'9D174D':e.status==='licenca_medica'?'9A3412':e.status==='ferias'?'065F46':e.status==='folga'?'1E40AF':e.status==='missao'?'5B21B6':C.MID;
        const rankL  = RANK_LABELS[e.rank] || e.rank || '—';

        tableRows.push(new TableRow({ children: [
          // Service name only on first row
          cell(
            para(ei===0 ? [
              txt(dt.abbrev, { bold:true, size:17, color:C.WHITE }),
            ] : [], { align:AlignmentType.CENTER }),
            { bg: ei===0 ? dt.header_color?.replace('#','')||C.MID : bg }
          ),
          cell(para(txt(e.war_name||'—', { bold:true, size:19 })), { bg }),
          cell(para(txt(e.war_number||'—', { size:17, color:C.MID }), { align:AlignmentType.CENTER }), { bg }),
          cell(para(txt(rankL, { size:17 }), { align:AlignmentType.CENTER }), { bg }),
          cell(para(txt(e.status==='normal'||!e.status?'PRESENTE':stLbl, { size:16, bold:e.status!=='normal', color: e.status==='normal'?C.SUCCESS:stColor }), { align:AlignmentType.CENTER }), { bg }),
          cell(para(txt(e.observation||'', { size:16, color:C.MID, italic:!!e.observation })), { bg }),
        ]}));
        rowIdx++;
      });
    }

    /* ── Signature area ── */
    const sigTable = new Table({
      width: { size:100, type:WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          cell(para(txt(''), { after:800 }), { bg:C.WHITE }),
          cell(para(txt(''), { after:800 }), { bg:C.WHITE }),
        ]}),
        new TableRow({ children: [
          cell([
            para(txt('________________________________________', { size:18, color:C.LIGHT }), { align:AlignmentType.CENTER }),
            para(txt(scale.created_by?.war_name||'Responsável', { bold:true, size:18 }), { align:AlignmentType.CENTER, before:60 }),
            para(txt(`${RANK_LABELS[scale.created_by?.rank]||''} · ${scale.created_by?.war_number||''}`, { size:16, color:C.MID }), { align:AlignmentType.CENTER, before:40 }),
            para(txt('Responsável pela Escala', { size:16, color:C.LIGHT }), { align:AlignmentType.CENTER, before:40 }),
          ], { bg:C.WHITE }),
          cell([
            para(txt('________________________________________', { size:18, color:C.LIGHT }), { align:AlignmentType.CENTER }),
            para(txt('Visto do Oficial de Dia', { bold:true, size:18 }), { align:AlignmentType.CENTER, before:60 }),
            para(txt(' ', { size:16 }), { align:AlignmentType.CENTER, before:40 }),
            para(txt('Oficial Responsável', { size:16, color:C.LIGHT }), { align:AlignmentType.CENTER, before:40 }),
          ], { bg:C.WHITE }),
        ]}),
      ],
    });

    /* ── Build document ── */
    const doc = new Document({
      styles: { default: { document: { run: { font:'Arial', size:20 } } } },
      sections: [{
        properties: {
          page: {
            margin: { top:convertInchesToTwip(0.9), bottom:convertInchesToTwip(0.9), left:convertInchesToTwip(1.1), right:convertInchesToTwip(1.1) },
          },
        },
        headers: {
          default: new Header({ children: [
            new Table({
              width: { size:100, type:WidthType.PERCENTAGE },
              borders: { top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.SINGLE,size:6,color:C.OLIVE}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE}, insideH:{style:BorderStyle.NONE}, insideV:{style:BorderStyle.NONE} },
              rows: [new TableRow({ children: [
                new TableCell({
                  width:{ size:15, type:WidthType.PERCENTAGE },
                  borders:{ top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.NONE}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE} },
                  children: [
                    // Shield-like emblem using text
                    para(txt('✦', { size:48, color:C.OLIVE, bold:true }), { align:AlignmentType.CENTER }),
                  ],
                }),
                new TableCell({
                  width:{ size:85, type:WidthType.PERCENTAGE },
                  borders:{ top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.NONE}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE} },
                  children: [
                    para(txt('EXÉRCITO BRASILEIRO', { bold:true, size:26, color:C.DARK }), { align:AlignmentType.CENTER }),
                    para(txt(scale.unit||'SISTEMA DE GESTÃO MILITAR — SIGMIL', { size:17, color:C.MID }), { align:AlignmentType.CENTER, before:40 }),
                  ],
                }),
              ]}),],
            }),
            para(txt(''), { after:80 }),
          ]}),
        },
        footers: {
          default: new Footer({ children: [
            new Table({
              width:{ size:100, type:WidthType.PERCENTAGE },
              borders:{ top:{style:BorderStyle.SINGLE,size:4,color:C.OLIVE}, bottom:{style:BorderStyle.NONE}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE}, insideH:{style:BorderStyle.NONE}, insideV:{style:BorderStyle.NONE} },
              rows: [new TableRow({ children: [
                new TableCell({
                  width:{ size:60, type:WidthType.PERCENTAGE },
                  borders:borders('FFFFFF',0),
                  children:[para(txt('DOCUMENTO OFICIAL — USO INTERNO — CONFIDENCIAL', { size:14, color:C.LIGHT }))],
                }),
                new TableCell({
                  width:{ size:40, type:WidthType.PERCENTAGE },
                  borders:borders('FFFFFF',0),
                  children:[para(txt(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { size:14, color:C.LIGHT }), { align:AlignmentType.RIGHT })],
                }),
              ]}),],
            }),
          ]}),
        },
        children: [
          /* ── TITLE BLOCK ── */
          para(txt('BOLETIM DIÁRIO DE SERVIÇO', { bold:true, size:40, color:C.DARK }), { align:AlignmentType.CENTER, before:100, after:80 }),
          para(txt(`${weekdayLabel.toUpperCase()}, ${dateFullLabel.toUpperCase()}`, { size:22, color:C.OLIVE, bold:true }), { align:AlignmentType.CENTER, after:40 }),
          para(txt(scale.name, { size:18, color:C.MID, italic:true }), { align:AlignmentType.CENTER, after:160 }),

          /* ── SUMMARY STRIP ── */
          new Table({
            width:{ size:100, type:WidthType.PERCENTAGE },
            rows:[
              new TableRow({ children:[
                hcell('ESCALA', { bg:C.DARK, width:5000 }),
                hcell('DATA', { bg:C.DARK, width:3000 }),
                hcell('TOTAL ESCALADOS', { bg:C.DARK, width:2500 }),
                hcell('SERVIÇOS ATIVOS', { bg:C.DARK, width:2000 }),
              ]}),
              new TableRow({ children:[
                cell(para(txt(scale.name, { bold:true, size:19 })), { bg:C.BG }),
                cell(para(txt(`${weekdayLabel}, ${dateLabel}`, { size:19 }), { align:AlignmentType.CENTER }), { bg:C.BG }),
                cell(para(txt(String(totalAssigned), { bold:true, size:28, color:C.OLIVE }), { align:AlignmentType.CENTER }), { bg:C.BG }),
                cell(para(txt(String(activeDT.length), { bold:true, size:28, color:C.MID }), { align:AlignmentType.CENTER }), { bg:C.BG }),
              ]}),
            ],
          }),
          para(txt(''), { after:200 }),

          /* ── MAIN SERVICE TABLE ── */
          new Table({
            width:{ size:100, type:WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          para(txt(''), { after:200 }),

          /* ── GENERAL OBSERVATION ── */
          ...(scale.notes ? [
            para(txt('OBSERVAÇÕES GERAIS:', { bold:true, size:20, color:C.DARK }), { before:100 }),
            para(txt(scale.notes, { size:18, color:C.MID, italic:true }), { before:60, after:200 }),
          ] : []),

          /* ── SIGNATURES ── */
          para(txt(''), { before:200, after:0 }),
          sigTable,
        ],
      }],
    });

    const buf = await Packer.toBuffer(doc);
    const filename = `escala_${date}_${Date.now()}.docx`;
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buf.length,
    });
    res.send(buf);

  } catch (err) {
    console.error('[scale-export/day]', err);
    res.status(500).json({ error: 'Erro ao gerar documento Word: ' + err.message });
  }
});

/* ─────────────────────────────────────────────────────────────────────────── *
 *  EXPORT: full month  GET /api/scale-export/:id/month                       *
 * ─────────────────────────────────────────────────────────────────────────── */
router.get('/:id/month', authMiddleware, guard, async (req, res) => {
  try {
    const scale = await Scale.findById(req.params.id).populate('created_by','war_name war_number rank').lean();
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });

    const [year, month] = scale.month.split('-').map(Number);
    const total         = daysInMonth(year, month);
    const activeDT      = scale.duty_types.filter(d=>d.active).sort((a,b)=>a.order-b.order);
    const monthLabel    = `${MONTH_NAMES[month-1]} ${year}`;

    // Build day-indexed entry map: date -> duty_key -> entries[]
    const byDayDuty = {};
    for (let d=1; d<=total; d++) {
      const ds = `${year}-${padZ(month)}-${padZ(d)}`;
      byDayDuty[ds] = {};
      for (const dt of activeDT) byDayDuty[ds][dt.key] = [];
    }
    for (const e of scale.entries) {
      if (byDayDuty[e.date] && byDayDuty[e.date][e.duty_type_key]) {
        byDayDuty[e.date][e.duty_type_key].push(e);
      }
    }

    /* Header row */
    const CELL_W = 1100;
    const LABEL_W = 2000;
    const headerCells = [hcell('DIA', { bg:C.DARK, width:700 }), hcell('DATA', { bg:C.DARK, width:1300 })];
    for (const dt of activeDT) headerCells.push(hcell(dt.abbrev, { bg: dt.header_color?.replace('#','')||C.DARK, width:CELL_W }));

    const tableRows = [new TableRow({ tableHeader:true, children: headerCells })];

    for (let d=1; d<=total; d++) {
      const ds  = `${year}-${padZ(month)}-${padZ(d)}`;
      const dow = dowOf(year, month, d);
      const we  = dow===0||dow===6;
      const bg  = we ? C.MUTED : (d%2===0 ? C.WHITE : C.BG);

      const dayCells = [
        cell(para(txt(padZ(d), { bold:true, size:18, color: we?C.MID:C.DARK }), { align:AlignmentType.CENTER }), { bg }),
        cell(para(txt(WEEKDAYS[dow], { size:16, color:C.MID }), { align:AlignmentType.CENTER }), { bg }),
      ];

      for (const dt of activeDT) {
        const entries = (byDayDuty[ds]?.[dt.key]||[]).filter(e=>e.soldier_id);
        if (entries.length===0) {
          dayCells.push(cell(para(txt('—', { size:15, color:C.LIGHT }), { align:AlignmentType.CENTER }), { bg }));
        } else {
          const content = entries.map(e =>
            para(txt(e.war_name?.split(' ')[0]||'?', { size:15, bold:true, color: e.status!=='normal'?C.WARNING:C.DARK }))
          );
          dayCells.push(cell(content, { bg }));
        }
      }

      tableRows.push(new TableRow({ children: dayCells }));
    }

    const doc = new Document({
      styles: { default: { document: { run: { font:'Arial', size:18 } } } },
      sections: [{
        properties: {
          page: {
            size:    { orientation:'landscape', width: convertInchesToTwip(13), height: convertInchesToTwip(8.5) },
            margin:  { top:convertInchesToTwip(0.7), bottom:convertInchesToTwip(0.7), left:convertInchesToTwip(0.8), right:convertInchesToTwip(0.8) },
          },
        },
        headers: {
          default: new Header({ children: [
            para([
              txt('EXÉRCITO BRASILEIRO  ✦  ', { bold:true, size:22, color:C.DARK }),
              txt('ESCALA MENSAL DE SERVIÇO', { bold:true, size:22, color:C.OLIVE }),
              txt(`   —   ${monthLabel.toUpperCase()}`, { size:20, color:C.MID }),
            ], { align:AlignmentType.CENTER, after:80 }),
          ]}),
        },
        footers: {
          default: new Footer({ children:[
            para([
              txt('SIGMIL · ', { size:14, color:C.LIGHT }),
              txt('DOCUMENTO OFICIAL — USO INTERNO', { size:14, color:C.LIGHT, bold:true }),
              txt(`  ·  Gerado em ${new Date().toLocaleDateString('pt-BR')}`, { size:14, color:C.LIGHT }),
            ], { align:AlignmentType.CENTER }),
          ]}),
        },
        children: [
          /* Title */
          para(txt('ESCALA DE SERVIÇO MENSAL', { bold:true, size:36, color:C.DARK }), { align:AlignmentType.CENTER, before:80, after:60 }),
          para(txt(`${scale.unit||''} · ${monthLabel}`, { size:20, color:C.OLIVE, bold:true }), { align:AlignmentType.CENTER, after:60 }),
          para(txt(scale.name, { size:17, color:C.MID, italic:true }), { align:AlignmentType.CENTER, after:180 }),

          new Table({ width:{ size:100, type:WidthType.PERCENTAGE }, rows: tableRows }),

          para(txt(''), { after:200 }),
          /* Legend for service types */
          para(txt('SERVIÇOS: ' + activeDT.map(dt=>`${dt.abbrev} = ${dt.label}`).join('   ·   '), { size:15, color:C.MID, italic:true }), { before:80, after:0 }),
          para(txt(`Escala criada por: ${scale.created_by?.war_name||'?'} (${scale.created_by?.war_number||'?'})  ·  Documento gerado automaticamente pelo SIGMIL`, { size:14, color:C.LIGHT, italic:true }), { before:60 }),
        ],
      }],
    });

    const buf = await Packer.toBuffer(doc);
    const filename = `escala_${scale.month}_${Date.now()}.docx`;
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buf.length,
    });
    res.send(buf);

  } catch (err) {
    console.error('[scale-export/month]', err);
    res.status(500).json({ error: 'Erro ao gerar documento Word: ' + err.message });
  }
});

/* ─────────────────────────────────────────────────────────────────────────── *
 *  EXPORT: selected days  POST /api/scale-export/:id/selected               *
 *  Body: { dates: ['2025-07-01', '2025-07-03', ...], title?: string }        *
 * ─────────────────────────────────────────────────────────────────────────── */
router.post('/:id/selected', authMiddleware, guard, async (req, res) => {
  try {
    const scale = await Scale.findById(req.params.id)
      .populate('created_by','war_name war_number rank').lean();
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });

    let { dates = [], title } = req.body;
    if (!Array.isArray(dates) || dates.length === 0)
      return res.status(400).json({ error: 'Selecione ao menos um dia' });

    // Validate and sort dates
    dates = dates
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();

    if (dates.length === 0)
      return res.status(400).json({ error: 'Datas inválidas' });

    const activeDT = scale.duty_types.filter(d=>d.active).sort((a,b)=>a.order-b.order);

    // Build entry map
    const entryMap = {};
    for (const e of scale.entries) {
      const k = `${e.date}|${e.duty_type_key}`;
      if (!entryMap[k]) entryMap[k] = [];
      entryMap[k].push(e);
    }

    const docTitle = title || `BOLETIM DE SERVIÇO — ${dates.length > 1 ? `${dates.length} DIAS` : ptDate(dates[0])}`;
    const [year, month] = scale.month.split('-').map(Number);

    // ── Build one section per selected day ────────────────────────────────
    const allDaySections = [];

    for (let di = 0; di < dates.length; di++) {
      const date = dates[di];
      const [dy, dm, dd] = date.split('-').map(Number);
      const dow = dowOf(dy, dm, dd);
      const dateLabel     = `${padZ(dd)}/${padZ(dm)}/${dy}`;
      const dateFull      = ptDate(date);
      const weekdayLabel  = WEEKDAYS[dow];
      const totalAssigned = Object.entries(entryMap)
        .filter(([k]) => k.startsWith(date+'|'))
        .flatMap(([,v]) => v)
        .filter(e => e.soldier_id).length;

      /* Table rows for this day */
      const tableRows = [
        new TableRow({
          tableHeader: true,
          children: [
            hcell('SERVIÇO',       { bg: C.DARK, width:2000 }),
            hcell('NOME DE GUERRA',{ bg: C.DARK, width:3000 }),
            hcell('Nº GUERRA',     { bg: C.DARK, width:1300 }),
            hcell('PATENTE',       { bg: C.DARK, width:1400 }),
            hcell('STATUS',        { bg: C.DARK, width:1500 }),
            hcell('OBSERVAÇÃO',    { bg: C.DARK, width:2800 }),
          ],
        }),
      ];

      let rowIdx = 0;
      for (const dt of activeDT) {
        const entries = (entryMap[`${date}|${dt.key}`]||[])
          .filter(e=>e.soldier_id)
          .sort((a,b)=>(a.slot||0)-(b.slot||0));

        if (entries.length === 0) {
          const bg = rowIdx%2===0 ? C.WHITE : C.BG;
          tableRows.push(new TableRow({ children:[
            cell(para(txt(dt.label,{bold:true,size:17})), {bg}),
            cell(para(txt('— Não escalado —',{color:C.LIGHT,size:16,italic:true})), {bg}),
            cell(para(txt('—',{color:C.LIGHT,size:16}),{align:AlignmentType.CENTER}), {bg}),
            cell(para(txt('—',{color:C.LIGHT,size:16}),{align:AlignmentType.CENTER}), {bg}),
            cell(para(txt('—',{color:C.LIGHT,size:16}),{align:AlignmentType.CENTER}), {bg}),
            cell(para(txt('',{size:16})), {bg}),
          ]}));
          rowIdx++;
          continue;
        }

        entries.forEach((e, ei) => {
          const bg     = rowIdx%2===0 ? C.WHITE : C.BG;
          const stLbl  = e.status==='normal'||!e.status ? 'PRESENTE'
            : (e.status==='licenca_maternidade'?'LIC.MATERN.':e.status==='licenca_medica'?'LIC.MÉDICA':e.status==='ferias'?'FÉRIAS':e.status==='folga'?'FOLGA':e.status==='missao'?'MISSÃO':'DISP.');
          const stColor= e.status==='normal'||!e.status?C.SUCCESS
            : e.status==='licenca_maternidade'?'9D174D':e.status==='licenca_medica'?'9A3412':e.status==='ferias'?'065F46':C.MID;

          tableRows.push(new TableRow({ children:[
            cell(
              para(ei===0?[txt(dt.abbrev,{bold:true,size:17,color:C.WHITE})]:[],{align:AlignmentType.CENTER}),
              { bg: ei===0 ? (dt.header_color?.replace('#','')||C.MID) : bg }
            ),
            cell(para(txt(e.war_name||'—',{bold:true,size:18})), {bg}),
            cell(para(txt(e.war_number||'—',{size:16,color:C.MID}),{align:AlignmentType.CENTER}), {bg}),
            cell(para(txt(RANK_LABELS[e.rank]||e.rank||'—',{size:16}),{align:AlignmentType.CENTER}), {bg}),
            cell(para(txt(stLbl,{size:15,bold:e.status!=='normal',color:stColor}),{align:AlignmentType.CENTER}), {bg}),
            cell(para(txt(e.observation||'',{size:15,color:C.MID,italic:!!e.observation})), {bg}),
          ]}));
          rowIdx++;
        });
      }

      // Add day block to sections array
      allDaySections.push(
        // Day separator header
        new Table({
          width: { size:100, type:WidthType.PERCENTAGE },
          rows: [new TableRow({ children:[
            new TableCell({
              borders: borders(C.OLIVE, 6),
              shading: { type:ShadingType.CLEAR, fill:C.DARK },
              margins: { top:120, bottom:120, left:160, right:160 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    txt(`${weekdayLabel.toUpperCase()}, ${dateFull.toUpperCase()}`, { bold:true, size:28, color:C.WHITE }),
                    txt(`   ·   ${totalAssigned} escalado${totalAssigned!==1?'s':''}`, { size:20, color:'A0C070' }),
                  ],
                }),
              ],
            }),
          ]}),],
        }),
        para(txt(''), { after:100 }),
        new Table({ width:{ size:100, type:WidthType.PERCENTAGE }, rows:tableRows }),
        para(txt(''), { after: di < dates.length-1 ? 320 : 200 }),
      );
    }

    // ── Signature area ─────────────────────────────────────────────────────
    const sigBlock = new Table({
      width: { size:100, type:WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children:[
          cell(para(txt(''),{after:600}), {bg:C.WHITE}),
          cell(para(txt(''),{after:600}), {bg:C.WHITE}),
        ]}),
        new TableRow({ children:[
          cell([
            para(txt('________________________________________',{size:17,color:C.LIGHT}),{align:AlignmentType.CENTER}),
            para(txt(scale.created_by?.war_name||'Responsável',{bold:true,size:18}),{align:AlignmentType.CENTER,before:60}),
            para(txt(`${RANK_LABELS[scale.created_by?.rank]||''} · ${scale.created_by?.war_number||''}`,{size:15,color:C.MID}),{align:AlignmentType.CENTER,before:40}),
            para(txt('Responsável pela Escala',{size:15,color:C.LIGHT}),{align:AlignmentType.CENTER,before:40}),
          ],{bg:C.WHITE}),
          cell([
            para(txt('________________________________________',{size:17,color:C.LIGHT}),{align:AlignmentType.CENTER}),
            para(txt('Visto do Oficial de Dia',{bold:true,size:18}),{align:AlignmentType.CENTER,before:60}),
            para(txt(' ',{size:15}),{align:AlignmentType.CENTER,before:40}),
            para(txt('Oficial Responsável',{size:15,color:C.LIGHT}),{align:AlignmentType.CENTER,before:40}),
          ],{bg:C.WHITE}),
        ]}),
      ],
    });

    const doc = new Document({
      styles: { default: { document: { run: { font:'Arial', size:20 } } } },
      sections: [{
        properties: {
          page: {
            margin: { top:convertInchesToTwip(0.9), bottom:convertInchesToTwip(0.9), left:convertInchesToTwip(1.1), right:convertInchesToTwip(1.1) },
          },
        },
        headers: {
          default: new Header({ children:[
            new Table({
              width:{ size:100, type:WidthType.PERCENTAGE },
              borders:{ top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.SINGLE,size:6,color:C.OLIVE}, left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE}, insideH:{style:BorderStyle.NONE}, insideV:{style:BorderStyle.NONE} },
              rows:[new TableRow({ children:[
                new TableCell({
                  width:{size:12,type:WidthType.PERCENTAGE},
                  borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE}},
                  children:[para(txt('✦',{size:44,color:C.OLIVE,bold:true}),{align:AlignmentType.CENTER})],
                }),
                new TableCell({
                  width:{size:88,type:WidthType.PERCENTAGE},
                  borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE}},
                  children:[
                    para(txt('EXÉRCITO BRASILEIRO',{bold:true,size:24,color:C.DARK}),{align:AlignmentType.CENTER}),
                    para(txt(scale.unit||'SISTEMA DE GESTÃO MILITAR — SIGMIL',{size:16,color:C.MID}),{align:AlignmentType.CENTER,before:40}),
                  ],
                }),
              ]}),],
            }),
            para(txt(''),{after:80}),
          ]}),
        },
        footers: {
          default: new Footer({ children:[
            new Table({
              width:{size:100,type:WidthType.PERCENTAGE},
              borders:{top:{style:BorderStyle.SINGLE,size:4,color:C.OLIVE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},insideH:{style:BorderStyle.NONE},insideV:{style:BorderStyle.NONE}},
              rows:[new TableRow({children:[
                new TableCell({width:{size:60,type:WidthType.PERCENTAGE},borders:borders('FFFFFF',0),children:[para(txt('DOCUMENTO OFICIAL — USO INTERNO — CONFIDENCIAL',{size:14,color:C.LIGHT}))]}),
                new TableCell({width:{size:40,type:WidthType.PERCENTAGE},borders:borders('FFFFFF',0),children:[para(txt(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,{size:14,color:C.LIGHT}),{align:AlignmentType.RIGHT})]}),
              ]}),],
            }),
          ]}),
        },
        children: [
          // Main title
          para(txt(docTitle, {bold:true,size:38,color:C.DARK}),{align:AlignmentType.CENTER,before:80,after:60}),
          para(txt(`${scale.name}  ·  ${scale.unit||''}`,{size:18,color:C.MID,italic:true}),{align:AlignmentType.CENTER,after:200}),

          // Summary: date range and totals
          new Table({
            width:{size:100,type:WidthType.PERCENTAGE},
            rows:[
              new TableRow({children:[
                hcell('PERÍODO',{bg:C.DARK,width:3000}),
                hcell('DIAS SELECIONADOS',{bg:C.DARK,width:2000}),
                hcell('ESCALA',{bg:C.DARK,width:4000}),
                hcell('SERVIÇOS',{bg:C.DARK,width:1800}),
              ]}),
              new TableRow({children:[
                cell(para(txt(dates.length===1?ptDate(dates[0]):`${ptDate(dates[0])} → ${ptDate(dates[dates.length-1])}`,{size:17})),{bg:C.BG}),
                cell(para(txt(String(dates.length)+` dia${dates.length>1?'s':''}`,{bold:true,size:24,color:C.OLIVE}),{align:AlignmentType.CENTER}),{bg:C.BG}),
                cell(para(txt(scale.name,{size:17})),{bg:C.BG}),
                cell(para(txt(String(activeDT.length),{bold:true,size:24,color:C.MID}),{align:AlignmentType.CENTER}),{bg:C.BG}),
              ]}),
            ],
          }),
          para(txt(''),{after:220}),

          // All day sections
          ...allDaySections,

          // Signatures
          sigBlock,
        ],
      }],
    });

    const buf = await Packer.toBuffer(doc);
    const safeName = dates.length===1 ? dates[0] : `${scale.month}_${dates.length}dias`;
    res.set({
      'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition':`attachment; filename="escala_${safeName}_${Date.now()}.docx"`,
      'Content-Length': buf.length,
    });
    res.send(buf);

  } catch(err) {
    console.error('[scale-export/selected]', err);
    res.status(500).json({ error: 'Erro ao gerar documento: ' + err.message });
  }
});

module.exports = router;
