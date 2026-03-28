const express = require('express');
const router = express.Router();
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel,
  PageOrientation, convertInchesToTwip, Header, Footer, PageNumber,
  NumberFormat,
} = require('docx');
const RollCall = require('../models/RollCall');
const { authMiddleware } = require('../middleware/auth');

function manageGuard(req, res, next) {
  const u = req.user;
  if (u.role === 'admin' || (u.permissions || []).includes('rollcall_manage')) return next();
  return res.status(403).json({ error: 'Sem permissão' });
}

const STATUS_PT = { present: 'PRESENTE', absent: 'AUSENTE', late: 'ATRASADO', pending: 'PENDENTE' };
const RANK_LABELS = {
  soldado_ev:'Sd EV', soldado_ep:'Sd EP', cabo:'Cb', terceiro_sargento:'3º Sgt',
  segundo_sargento:'2º Sgt', primeiro_sargento:'1º Sgt', subtenente:'ST',
  aspirante:'Asp', segundo_tenente:'2º Ten', primeiro_tenente:'1º Ten',
  capitao:'Cap', major:'Maj', tenente_coronel:'TC', coronel:'Cel',
  general_brigada:'Gen Bda', general_divisao:'Gen Div', general_exercito:'Gen Ex',
  marechal:'Marechal', comandante:'Cmdt',
};

function ptBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${parseInt(d)} de ${months[parseInt(m)-1]} de ${y}`;
}

function cell(text, opts = {}) {
  const {
    bold = false, size = 18, color = '1A1914', bg = 'FFFFFF',
    align = AlignmentType.LEFT, width,
  } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: bg !== 'FFFFFF' ? { type: ShadingType.CLEAR, fill: bg } : undefined,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: 'C8C0A8' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C8C0A8' },
      left:   { style: BorderStyle.SINGLE, size: 1, color: 'C8C0A8' },
      right:  { style: BorderStyle.SINGLE, size: 1, color: 'C8C0A8' },
    },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text), bold, size, color, font: 'Arial' })],
    })],
  });
}

function headerCell(text, opts = {}) {
  return cell(text, { bold: true, size: 18, bg: '4A4538', color: 'FFFFFF', align: AlignmentType.CENTER, ...opts });
}

function statusCell(status) {
  const colors = { present: 'D4EDDA', absent: 'F8D7DA', late: 'FFF3CD', pending: 'F0F0F0' };
  const textColors = { present: '155724', absent: '721C24', late: '856404', pending: '666666' };
  return cell(STATUS_PT[status] || status, {
    bold: true, size: 16, bg: (colors[status] || 'F0F0F0').replace('#',''),
    color: (textColors[status] || '333333').replace('#',''),
    align: AlignmentType.CENTER,
  });
}

// GET /api/rollcall-export/:id/word
router.get('/:id/word', authMiddleware, manageGuard, async (req, res) => {
  try {
    const rc = await RollCall.findById(req.params.id)
      .populate('created_by', 'war_name war_number rank')
      .populate('submitted_by', 'war_name war_number')
      .lean();
    if (!rc) return res.status(404).json({ error: 'Chamada não encontrada' });

    const entries = rc.entries || [];
    const present = entries.filter(e => e.status === 'present').length;
    const absent  = entries.filter(e => e.status === 'absent').length;
    const late    = entries.filter(e => e.status === 'late').length;
    const total   = entries.length;

    // Sort: by rank tier then name
    const RANK_ORDER = ['comandante','marechal','general_exercito','general_divisao','general_brigada',
      'coronel','tenente_coronel','major','capitao','primeiro_tenente','segundo_tenente','aspirante',
      'subtenente','primeiro_sargento','segundo_sargento','terceiro_sargento','cabo','soldado_ep','soldado_ev'];
    const sorted = [...entries].sort((a,b) => {
      const ia = RANK_ORDER.indexOf(a.rank); const ib = RANK_ORDER.indexOf(b.rank);
      if (ia !== ib) return ia - ib;
      return (a.war_name || '').localeCompare(b.war_name || '');
    });

    // Group by platoon/squad
    const groups = {};
    for (const e of sorted) {
      const key = e.platoon || e.squad || 'Geral';
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }

    // ── Build document ────────────────────────────────────────────────────
    const sections = [];

    // Table rows
    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell('Nº', { width: 900 }),
          headerCell('Nº Guerra', { width: 1400 }),
          headerCell('Nome de Guerra', { width: 3200 }),
          headerCell('Patente', { width: 1600 }),
          headerCell('Pelotão/Esq.', { width: 1800 }),
          headerCell('Status', { width: 1600 }),
          headerCell('Chegada', { width: 1200 }),
          headerCell('Observação', { width: 2800 }),
        ],
      }),
    ];

    let rowNum = 1;
    for (const [group, groupEntries] of Object.entries(groups)) {
      if (Object.keys(groups).length > 1) {
        tableRows.push(new TableRow({
          children: [new TableCell({
            columnSpan: 8,
            shading: { type: ShadingType.CLEAR, fill: 'E8E4D8' },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: '8B8070' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '8B8070' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'C8C0A8' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'C8C0A8' },
            },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun({ text: group.toUpperCase(), bold: true, size: 18, color: '4A4538', font: 'Arial' })],
            })],
          })],
        }));
      }

      for (const e of groupEntries) {
        const bg = rowNum % 2 === 0 ? 'F9F7F2' : 'FFFFFF';
        tableRows.push(new TableRow({
          children: [
            cell(rowNum, { align: AlignmentType.CENTER, bg }),
            cell(e.war_number, { align: AlignmentType.CENTER, bg }),
            cell(e.war_name, { bold: true, bg }),
            cell(RANK_LABELS[e.rank] || e.rank, { align: AlignmentType.CENTER, bg }),
            cell(e.platoon || e.squad || '—', { align: AlignmentType.CENTER, bg }),
            statusCell(e.status),
            cell(e.arrival_time || '—', { align: AlignmentType.CENTER, bg }),
            cell(e.observation || '', { bg }),
          ],
        }));
        rowNum++;
      }
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Arial', size: 20 },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.2), right: convertInchesToTwip(1.2) },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '5E7244' } },
                children: [
                  new TextRun({ text: 'EXÉRCITO BRASILEIRO', bold: true, size: 22, color: '2E2B22', font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'SISTEMA DE GESTÃO MILITAR — SIGMIL', size: 16, color: '8B8070', font: 'Arial' })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: '5E7244' } },
                children: [
                  new TextRun({ text: 'Documento gerado pelo SIGMIL — ', size: 14, color: '8B8070', font: 'Arial' }),
                  new TextRun({ text: 'CONFIDENCIAL — USO INTERNO', bold: true, size: 14, color: '8B3A3A', font: 'Arial' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ── TITLE ──
          new Paragraph({ spacing: { before: 200, after: 100 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'BOLETIM DE CHAMADA', bold: true, size: 36, color: '2E2B22', font: 'Arial' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: `Data: ${ptBR(rc.date)}`, size: 20, color: '4A4538', font: 'Arial' })],
          }),
          ...(rc.label ? [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: rc.label, bold: true, size: 20, color: '5E7244', font: 'Arial' })],
          })] : []),
          new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '5E7244' } }, spacing: { after: 200 } }),

          // ── SUMMARY BOX ──
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [
                headerCell('TOTAL', { width: 2500 }),
                headerCell('PRESENTES', { width: 2500 }),
                headerCell('AUSENTES', { width: 2500 }),
                headerCell('ATRASADOS', { width: 2500 }),
              ]}),
              new TableRow({ children: [
                cell(String(total), { align: AlignmentType.CENTER, bold: true, size: 24 }),
                cell(String(present), { align: AlignmentType.CENTER, bold: true, size: 24, bg: 'D4EDDA', color: '155724' }),
                cell(String(absent), { align: AlignmentType.CENTER, bold: true, size: 24, bg: 'F8D7DA', color: '721C24' }),
                cell(String(late), { align: AlignmentType.CENTER, bold: true, size: 24, bg: 'FFF3CD', color: '856404' }),
              ]}),
            ],
          }),
          new Paragraph({ spacing: { after: 300 } }),

          // ── MAIN TABLE ──
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({ spacing: { after: 400 } }),

          // ── OBSERVATION ──
          ...(rc.general_observation ? [
            new Paragraph({
              children: [new TextRun({ text: 'OBSERVAÇÕES GERAIS:', bold: true, size: 20, font: 'Arial' })],
            }),
            new Paragraph({
              spacing: { after: 400 },
              children: [new TextRun({ text: rc.general_observation, size: 18, color: '4A4538', font: 'Arial' })],
            }),
          ] : []),

          // ── SIGNATURE ──
          new Paragraph({ spacing: { before: 600, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'C8C0A8' } } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200 },
            children: [new TextRun({ text: rc.created_by ? `${rc.created_by.war_name} — ${rc.created_by.war_number}` : 'Responsável', size: 18, font: 'Arial' })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'Responsável pela Chamada', size: 16, color: '8B8070', font: 'Arial' })],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `chamada_${rc.date}_${Date.now()}.docx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar documento Word' });
  }
});

module.exports = router;
