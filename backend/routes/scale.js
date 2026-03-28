const express = require('express');
const router  = express.Router();
const Scale   = require('../models/Scale');
const User    = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const { DEFAULT_DUTY_TYPES, RANK_TIERS } = require('../models/Scale');

// ── Guards ─────────────────────────────────────────────────────────────────
function scaleGuard(req, res, next) {
  const u = req.user;
  if (u.role === 'admin' || (u.permissions||[]).includes('escala') || (u.permissions||[]).includes('escala_manage'))
    return next();
  return res.status(403).json({ error: 'Sem permissão para acessar escalas' });
}
function manageGuard(req, res, next) {
  const u = req.user;
  if (u.role === 'admin' || (u.permissions||[]).includes('escala_manage'))
    return next();
  return res.status(403).json({ error: 'Sem permissão para gerenciar escalas' });
}

function rankTier(rank) { return RANK_TIERS[rank] ?? 0; }

// ── Auto-generate algorithm ────────────────────────────────────────────────
async function autoGenerate(scale, dutyTypeKeys, overrideManual) {
  const [year, month] = scale.month.split('-').map(Number);
  const daysInMonth   = new Date(year, month, 0).getDate();

  // All active soldiers with passwords set
  const allSoldiers = await User.find({ is_active: true, first_access: false, role: 'soldier' })
    .select('_id war_name war_number rank squad platoon').lean();

  const entries = scale.entries.map(e => ({ ...e.toObject ? e.toObject() : e }));

  for (const dtKey of dutyTypeKeys) {
    const dt = scale.duty_types.find(d => d.key === dtKey);
    if (!dt || !dt.active) continue;

    const minTier = rankTier(dt.min_rank);
    const maxTier = dt.max_rank ? rankTier(dt.max_rank) : 99;

    const eligible = allSoldiers.filter(s => {
      const t = rankTier(s.rank);
      return t >= minTier && t <= maxTier;
    });

    if (eligible.length === 0) continue;

    // Build lastAssigned map: soldier_id -> latest date string for this duty
    const lastAssigned = {};
    for (const e of entries) {
      if (e.duty_type_key === dtKey && e.soldier_id) {
        const sid = String(e.soldier_id);
        if (!lastAssigned[sid] || e.date > lastAssigned[sid]) lastAssigned[sid] = e.date;
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

      for (let slot = 0; slot < (dt.slots_per_day || 1); slot++) {
        const existingIdx = entries.findIndex(
          e => e.duty_type_key === dtKey && e.date === dateStr && (e.slot || 0) === slot
        );
        const existing = existingIdx >= 0 ? entries[existingIdx] : null;

        // Preserve manual entries unless override
        if (existing && existing.soldier_id && !existing.auto_assigned && !overrideManual) continue;
        // Preserve special status (leave, sick, etc.) always
        if (existing && existing.status && existing.status !== 'normal' && !overrideManual) continue;

        // Soldiers already assigned on this day (any duty)
        const assignedToday = new Set(
          entries.filter(e => e.date === dateStr && e.soldier_id).map(e => String(e.soldier_id))
        );

        const today = new Date(dateStr);
        const candidates = eligible
          .filter(s => {
            const sid = String(s._id);
            if (assignedToday.has(sid)) return false;
            const last = lastAssigned[sid];
            if (last) {
              const daysSince = Math.floor((today - new Date(last)) / 86400000);
              if (daysSince < dt.interval_days) return false;
            }
            return true;
          })
          .map(s => {
            const sid  = String(s._id);
            const last = lastAssigned[sid];
            const score = last ? Math.floor((today - new Date(last)) / 86400000) : 9999;
            return { s, score };
          })
          .sort((a, b) => b.score - a.score);

        if (candidates.length === 0) continue;

        const chosen = candidates[0].s;
        const newEntry = {
          duty_type_key: dtKey,
          date: dateStr,
          slot,
          soldier_id:   chosen._id,
          war_name:     chosen.war_name,
          war_number:   chosen.war_number,
          rank:         chosen.rank,
          status:       'normal',
          observation:  existing?.observation || null,
          auto_assigned: true,
        };

        if (existingIdx >= 0) entries[existingIdx] = { ...entries[existingIdx], ...newEntry };
        else entries.push(newEntry);

        lastAssigned[String(chosen._id)] = dateStr;
        assignedToday.add(String(chosen._id));
      }
    }
  }

  return entries;
}

// ── LIST ───────────────────────────────────────────────────────────────────
router.get('/', authMiddleware, scaleGuard, async (req, res) => {
  try {
    const { month, status } = req.query;
    const filter = {};
    if (month)  filter.month  = month;
    if (status) filter.status = status;

    const scales = await Scale.find(filter)
      .select('-entries')
      .populate('created_by', 'war_name war_number')
      .sort({ month: -1, created_at: -1 })
      .lean();
    res.json(scales);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar escalas' });
  }
});

// ── GET ONE ────────────────────────────────────────────────────────────────
// ── GET OR CREATE scale for a month ─────────────────────────────────────────
// GET /api/scale/month/2024-06  →  returns existing (first) or creates blank
router.get('/month/:month', authMiddleware, scaleGuard, async (req, res) => {
  try {
    const { month } = req.params;
    if (!/^\d{4}-\d{2}$/.test(month))
      return res.status(400).json({ error: 'Formato inválido. Use YYYY-MM' });

    // Find the most recent non-archived scale for this month
    let scale = await Scale.findOne({ month, status: { $ne: 'archived' } })
      .populate('created_by', 'war_name war_number')
      .sort({ created_at: -1 });

    // Auto-create if none exists
    if (!scale) {
      const [y, m] = month.split('-');
      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const label = `${monthNames[parseInt(m) - 1]} ${y}`;

      scale = await Scale.create({
        name:       `Escala de Serviço — ${label}`,
        month,
        unit:       null,
        notes:      null,
        duty_types: DEFAULT_DUTY_TYPES,
        entries:    [],
        status:     'draft',
        created_by: req.user._id,
      });

      scale = await Scale.findById(scale._id)
        .populate('created_by', 'war_name war_number');
    }

    res.json(scale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter/criar escala' });
  }
});

// ── MY DUTIES — soldier sees only their own entries ─────────────────────────
// GET /api/scale/my-duties?months=3
router.get('/my-duties', authMiddleware, async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 3, 12);
    const now    = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Build month list: current + future months
    const monthList = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Also look back 1 month for recent history
    const past = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    monthList.unshift(`${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}`);

    const scales = await Scale.find({
      month:  { $in: monthList },
      status: { $ne: 'archived' },
      'entries.soldier_id': req.user._id,
    }).select('name month duty_types entries').lean();

    const duties = [];
    for (const sc of scales) {
      for (const e of sc.entries) {
        if (String(e.soldier_id) !== String(req.user._id)) continue;
        if (!e.soldier_id) continue;
        const dt = sc.duty_types.find(d => d.key === e.duty_type_key);
        duties.push({
          scale_id:        sc._id,
          scale_name:      sc.name,
          month:           sc.month,
          date:            e.date,
          duty_type_key:   e.duty_type_key,
          duty_label:      dt?.label  || e.duty_type_key,
          duty_abbrev:     dt?.abbrev || e.duty_type_key,
          duty_color:      dt?.header_color || '#4a4538',
          slot:            e.slot || 0,
          status:          e.status,
          observation:     e.observation,
          arrival_time:    e.arrival_time,
          is_past:         e.date < todayStr,
          is_today:        e.date === todayStr,
        });
      }
    }

    duties.sort((a, b) => a.date.localeCompare(b.date));
    res.json({ duties, today: todayStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
});

// ── GET /api/scale/day-overview?dates=2026-03-28,2026-03-29 ──────────────────
// Retorna todos os escalados de um ou mais dias (para o painel do soldado)
router.get('/day-overview', authMiddleware, async (req, res) => {
  try {
    const now      = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

    // Suporte a datas customizadas ou padrão hoje+amanhã
    const rawDates = req.query.dates ? req.query.dates.split(',').map(s=>s.trim()) : [todayStr, tomorrowStr];

    // Busca as escalas dos meses envolvidos
    const months = [...new Set(rawDates.map(d => d.substring(0,7)))];
    const scales = await Scale.find({
      month:  { $in: months },
      status: { $ne: 'archived' },
    }).select('name month duty_types entries').lean();

    // Monta resultado por data
    const result = {};
    for (const dateStr of rawDates) {
      result[dateStr] = { date: dateStr, duty_types: [] };
    }

    for (const sc of scales) {
      const entriesForDays = sc.entries.filter(e => rawDates.includes(e.date));
      if (!entriesForDays.length) continue;

      // Agrupa por data e tipo de serviço
      for (const dateStr of rawDates) {
        const dayEntries = entriesForDays.filter(e => e.date === dateStr);
        if (!dayEntries.length) continue;

        // Agrupa por duty_type_key
        const byDuty = {};
        for (const e of dayEntries) {
          if (!byDuty[e.duty_type_key]) byDuty[e.duty_type_key] = [];
          byDuty[e.duty_type_key].push(e);
        }

        for (const [dtKey, entries] of Object.entries(byDuty)) {
          const dt = sc.duty_types.find(d => d.key === dtKey);
          if (!dt || !dt.active) continue;

          const soldiers = entries
            .filter(e => e.soldier_id)
            .map(e => ({
              soldier_id: String(e.soldier_id),
              war_name:   e.war_name,
              war_number: e.war_number,
              rank:       e.rank,
              status:     e.status || 'normal',
              observation:e.observation || null,
            }));

          if (!soldiers.length) continue;

          // Evita duplicar se já existe o duty_type nesse dia
          const existing = result[dateStr].duty_types.find(d => d.key === dtKey);
          if (existing) {
            existing.soldiers.push(...soldiers);
          } else {
            result[dateStr].duty_types.push({
              key:          dtKey,
              label:        dt.label,
              abbrev:       dt.abbrev,
              header_color: dt.header_color || '#4a4538',
              order:        dt.order || 99,
              soldiers,
            });
          }
        }
      }
    }

    // Ordena tipos de serviço por order
    for (const day of Object.values(result)) {
      day.duty_types.sort((a,b) => a.order - b.order);
    }

    res.json({ days: result, my_id: String(req.user._id) });
  } catch (err) {
    console.error('day-overview error:', err);
    res.status(500).json({ error: 'Erro ao carregar escala do dia.' });
  }
});

router.get('/:id', authMiddleware, scaleGuard, async (req, res) => {
  try {
    const scale = await Scale.findById(req.params.id)
      .populate('created_by', 'war_name war_number')
      .lean();
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });
    res.json(scale);
  } catch {
    res.status(404).json({ error: 'Escala não encontrada' });
  }
});

// ── CREATE ─────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, manageGuard, async (req, res) => {
  try {
    const { name, month, unit, notes, duty_types } = req.body;
    if (!name || !month) return res.status(400).json({ error: 'Nome e mês são obrigatórios' });

    const scale = await Scale.create({
      name, month, unit: unit || null,
      notes: notes || null,
      duty_types: duty_types || DEFAULT_DUTY_TYPES,
      created_by: req.user._id,
    });
    res.status(201).json(scale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao criar escala' });
  }
});

// ── UPDATE META ────────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, manageGuard, async (req, res) => {
  try {
    const scale = await Scale.findById(req.params.id);
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });

    const allowed = ['name', 'unit', 'notes', 'status', 'duty_types'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) scale[k] = req.body[k];
    }
    if (req.body.status === 'published' && !scale.published_at) {
      scale.published_at = new Date();
    }
    await scale.save();
    res.json(scale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE / CREATE CELL ───────────────────────────────────────────────────
router.patch('/:id/cell', authMiddleware, scaleGuard, async (req, res) => {
  try {
    const scale = await Scale.findById(req.params.id);
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });

    const { duty_type_key, date, slot = 0, soldier_id, war_name, war_number, rank,
            status, custom_color, observation } = req.body;

    if (!duty_type_key || !date) return res.status(400).json({ error: 'duty_type_key e date são obrigatórios' });

    const existing = scale.entries.find(
      e => e.duty_type_key === duty_type_key && e.date === date && (e.slot || 0) === slot
    );

    if (existing) {
      if (soldier_id   !== undefined) { existing.soldier_id  = soldier_id || null; existing.war_name = war_name||null; existing.war_number = war_number||null; existing.rank = rank||null; }
      if (status       !== undefined) existing.status        = status;
      if (custom_color !== undefined) existing.custom_color  = custom_color || null;
      if (observation  !== undefined) existing.observation   = observation  || null;
      existing.auto_assigned = false;
    } else {
      scale.entries.push({ duty_type_key, date, slot, soldier_id: soldier_id||null, war_name: war_name||null, war_number: war_number||null, rank: rank||null, status: status||'normal', custom_color: custom_color||null, observation: observation||null, auto_assigned: false });
    }

    await scale.save();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── MULTI-SOLDIER CELL — replace all slots for (duty_type, date) ───────────
// Body: { duty_type_key, date, soldiers: [{ soldier_id, war_name, war_number, rank, status, custom_color, observation }] }
router.patch('/:id/cell-multi', authMiddleware, scaleGuard, async (req, res) => {
  try {
    const scale = await Scale.findById(req.params.id);
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });

    const { duty_type_key, date, soldiers = [] } = req.body;
    if (!duty_type_key || !date)
      return res.status(400).json({ error: 'duty_type_key e date são obrigatórios' });

    // Remove ALL existing entries for this (duty_type, date)
    scale.entries = scale.entries.filter(
      e => !(e.duty_type_key === duty_type_key && e.date === date)
    );

    // Re-insert one entry per soldier (slot = index)
    soldiers.forEach((s, idx) => {
      if (!s.soldier_id) return; // skip empty rows
      scale.entries.push({
        duty_type_key,
        date,
        slot:          idx,
        soldier_id:    s.soldier_id,
        war_name:      s.war_name      || null,
        war_number:    s.war_number    || null,
        rank:          s.rank          || null,
        status:        s.status        || 'normal',
        custom_color:  s.custom_color  || null,
        observation:   s.observation   || null,
        auto_assigned: false,
      });
    });

    await scale.save();
    res.json({ ok: true, count: soldiers.filter(s => s.soldier_id).length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── AUTO-GENERATE ──────────────────────────────────────────────────────────
router.post('/:id/auto-generate', authMiddleware, manageGuard, async (req, res) => {
  try {
    const scale = await Scale.findById(req.params.id);
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });

    const { duty_type_keys, override_manual = false } = req.body;
    const keys = duty_type_keys?.length ? duty_type_keys : scale.duty_types.filter(d => d.active).map(d => d.key);

    const newEntries = await autoGenerate(scale, keys, override_manual);
    scale.entries = newEntries;
    await scale.save();

    // Return full scale
    const updated = await Scale.findById(scale._id).populate('created_by', 'war_name war_number').lean();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao gerar escala automaticamente' });
  }
});

// ── DELETE ─────────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, manageGuard, async (req, res) => {
  try {
    await Scale.findByIdAndDelete(req.params.id);
    res.json({ message: 'Escala excluída' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir escala' });
  }
});

// ── SOLDIER DUTY HISTORY ───────────────────────────────────────────────────
router.get('/soldier/:soldierId/history', authMiddleware, async (req, res) => {
  try {
    const scales = await Scale.find({
      'entries.soldier_id': req.params.soldierId,
      status: { $in: ['published', 'draft'] },
    }).select('name month entries').lean();

    const history = [];
    for (const sc of scales) {
      const soldierEntries = sc.entries.filter(e => String(e.soldier_id) === String(req.params.soldierId));
      for (const e of soldierEntries) {
        history.push({ scale_id: sc._id, scale_name: sc.name, month: sc.month, ...e });
      }
    }
    history.sort((a, b) => b.date.localeCompare(a.date));
    res.json(history.slice(0, 60));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

module.exports = router;

// ── UPDATE DUTY TYPES (save to DB) ─────────────────────────────────────────
router.put('/:id/duty-types', authMiddleware, manageGuard, async (req, res) => {
  try {
    const scale = await Scale.findById(req.params.id);
    if (!scale) return res.status(404).json({ error: 'Escala não encontrada' });

    const { duty_types } = req.body;
    if (!Array.isArray(duty_types) || duty_types.length === 0)
      return res.status(400).json({ error: 'duty_types deve ser um array não vazio' });

    // Validate required fields
    for (const dt of duty_types) {
      if (!dt.key || !dt.label || !dt.abbrev)
        return res.status(400).json({ error: 'Cada serviço precisa de key, label e abbrev' });
    }

    scale.duty_types = duty_types;
    await scale.save();
    res.json({ duty_types: scale.duty_types });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao salvar tipos de serviço' });
  }
});
