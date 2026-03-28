const mongoose = require('mongoose');

// ── Rank tier mapping (for auto-generate eligibility) ──────────────────────
const RANK_TIERS = {
  soldado_ev: 0, soldado_ep: 0,
  cabo: 1,
  terceiro_sargento: 2, segundo_sargento: 2, primeiro_sargento: 2,
  subtenente: 3,
  aspirante: 4, segundo_tenente: 4, primeiro_tenente: 4,
  capitao: 5, major: 6, tenente_coronel: 7, coronel: 8,
  general_brigada: 9, general_divisao: 9, general_exercito: 9,
  marechal: 10, comandante: 11,
};

// ── Default Brazilian Army duty types ─────────────────────────────────────
const DEFAULT_DUTY_TYPES = [
  { key: 'sgt_dia',        label: 'Sgt de Dia',           abbrev: 'SGT DIA',  min_rank: 'terceiro_sargento', max_rank: 'subtenente',        interval_days: 7,  slots_per_day: 1,  header_color: '#1a3a5c', order: 1, active: true },
  { key: 'ch_dia',         label: 'Ch de Dia',            abbrev: 'CH DIA',   min_rank: 'cabo',              max_rank: 'cabo',              interval_days: 5,  slots_per_day: 1,  header_color: '#2c5a2c', order: 2, active: true },
  { key: 'ch_hipismo',     label: 'Ch Hipismo',           abbrev: 'CH HIP',   min_rank: 'cabo',              max_rank: 'subtenente',        interval_days: 5,  slots_per_day: 1,  header_color: '#4a3010', order: 3, active: true },
  { key: 'plantao',        label: 'Plantão',              abbrev: 'PLT',      min_rank: 'soldado_ev',        max_rank: 'cabo',              interval_days: 3,  slots_per_day: 8,  header_color: '#3a3a1a', order: 4, active: true },
  { key: 'enf_vet',        label: 'Enf Vet',              abbrev: 'ENF',      min_rank: 'soldado_ev',        max_rank: 'subtenente',        interval_days: 7,  slots_per_day: 1,  header_color: '#1a4a2a', order: 5, active: true },
  { key: 'perm_equo',      label: 'Perm. Equoterapia',    abbrev: 'EQT',      min_rank: 'soldado_ev',        max_rank: 'subtenente',        interval_days: 7,  slots_per_day: 1,  header_color: '#3a1a4a', order: 6, active: true },
  { key: 'portao_b',       label: 'Portão B',             abbrev: 'PT B',     min_rank: 'soldado_ev',        max_rank: 'cabo',              interval_days: 4,  slots_per_day: 1,  header_color: '#4a2020', order: 7, active: true },
  { key: 'pel_hipismo',    label: 'Pelotão de Hipismo',   abbrev: 'PEL HIP',  min_rank: 'soldado_ev',        max_rank: 'cabo',              interval_days: 3,  slots_per_day: 10, header_color: '#1a2a4a', order: 8, active: true },
];

// ── Duty type embedded schema ─────────────────────────────────────────────
const dutyTypeSchema = new mongoose.Schema({
  key:           { type: String, required: true },
  label:         { type: String, required: true },
  abbrev:        { type: String, required: true },
  min_rank:      { type: String, default: 'soldado_ev' },
  max_rank:      { type: String, default: null },
  interval_days: { type: Number, default: 5 },
  slots_per_day: { type: Number, default: 1 },
  header_color:  { type: String, default: '#4a4538' },
  order:         { type: Number, default: 99 },
  active:        { type: Boolean, default: true },
}, { _id: false, versionKey: false });

// ── Cell entry schema ─────────────────────────────────────────────────────
const cellEntrySchema = new mongoose.Schema({
  duty_type_key:  { type: String, required: true },
  date:           { type: String, required: true }, // "2024-06-15"
  slot:           { type: Number, default: 0 },     // 0-based for multi-slot
  soldier_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  war_name:       { type: String, default: null },
  war_number:     { type: String, default: null },
  rank:           { type: String, default: null },
  // Status / color coding
  status: {
    type: String,
    enum: ['normal', 'folga', 'licenca_medica', 'licenca_maternidade', 'ferias', 'dispensa', 'missao', 'vazio'],
    default: 'normal',
  },
  custom_color:   { type: String, default: null },  // hex override
  observation:    { type: String, default: null },
  auto_assigned:  { type: Boolean, default: false },
}, { _id: true, versionKey: false });

// ── Scale schema ──────────────────────────────────────────────────────────
const scaleSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  month:       { type: String, required: true }, // "2024-06"
  unit:        { type: String, default: null },  // optional OM name
  status:      { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  notes:       { type: String, default: null },
  duty_types:  { type: [dutyTypeSchema], default: DEFAULT_DUTY_TYPES },
  entries:     { type: [cellEntrySchema], default: [] },
  created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  published_at:{ type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
});

scaleSchema.index({ month: -1 });
scaleSchema.index({ status: 1 });
scaleSchema.index({ created_by: 1 });

module.exports = mongoose.model('Scale', scaleSchema);
module.exports.DEFAULT_DUTY_TYPES = DEFAULT_DUTY_TYPES;
module.exports.RANK_TIERS = RANK_TIERS;
