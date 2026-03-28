const express = require('express');
const router = express.Router();
const RollCall = require('../models/RollCall');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Permission guard — must be admin OR have 'rollcall' permission
function rollcallGuard(req, res, next) {
  const u = req.user;
  if (u.role === 'admin' || (u.permissions || []).includes('rollcall') || (u.permissions || []).includes('rollcall_manage'))
    return next();
  return res.status(403).json({ error: 'Sem permissão para acessar a chamada' });
}

function manageGuard(req, res, next) {
  const u = req.user;
  if (u.role === 'admin' || (u.permissions || []).includes('rollcall_manage'))
    return next();
  return res.status(403).json({ error: 'Sem permissão para gerenciar chamadas' });
}

// ── Helper: build entries from active soldiers ────────────────────────────
async function buildEntries(squadFilter, platoonFilter) {
  const query = { role: 'soldier', is_active: true, first_access: false };
  if (squadFilter)   query.squad   = squadFilter;
  if (platoonFilter) query.platoon = platoonFilter;

  const soldiers = await User.find(query)
    .select('war_number war_name rank squad platoon')
    .lean();

  return soldiers.map(s => ({
    soldier_id:   s._id,
    war_number:   s.war_number,
    war_name:     s.war_name,
    rank:         s.rank,
    squad:        s.squad,
    platoon:      s.platoon,
    status:       'pending',
    arrival_time: null,
    observation:  null,
  }));
}

// ── LIST (history) ────────────────────────────────────────────────────────
router.get('/', authMiddleware, rollcallGuard, async (req, res) => {
  try {
    const { page = 1, limit = 20, date } = req.query;
    const filter = {};
    if (date) filter.date = date;

    const total = await RollCall.countDocuments(filter);
    const calls = await RollCall.find(filter)
      .select('-entries')
      .populate('created_by', 'war_name war_number')
      .populate('submitted_by', 'war_name war_number')
      .sort({ date: -1, created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ calls, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar chamadas' });
  }
});

// ── TODAY ──────────────────────────────────────────────────────────────────
router.get('/today', authMiddleware, rollcallGuard, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const call = await RollCall.findOne({ date: today })
      .sort({ created_at: -1 })
      .populate('created_by', 'war_name war_number')
      .lean();
    res.json(call || null);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar chamada de hoje' });
  }
});

// ── GET ONE ────────────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, rollcallGuard, async (req, res) => {
  try {
    const call = await RollCall.findById(req.params.id)
      .populate('created_by', 'war_name war_number')
      .populate('submitted_by', 'war_name war_number')
      .lean();
    if (!call) return res.status(404).json({ error: 'Chamada não encontrada' });
    res.json(call);
  } catch {
    res.status(404).json({ error: 'Chamada não encontrada' });
  }
});

// ── CREATE (open new roll call) ────────────────────────────────────────────
router.post('/', authMiddleware, rollcallGuard, async (req, res) => {
  try {
    const { label, squad, platoon, general_observation } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Warn if one already exists today but don't block
    const entries = await buildEntries(squad, platoon);
    if (entries.length === 0)
      return res.status(400).json({ error: 'Nenhum soldado ativo encontrado para montar a chamada' });

    const call = await RollCall.create({
      date: today,
      label: label || null,
      squad: squad || null,
      platoon: platoon || null,
      general_observation: general_observation || null,
      status: 'open',
      opened_at: new Date(),
      created_by: req.user._id,
      entries,
    });

    res.status(201).json(call);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro ao criar chamada' });
  }
});

// ── UPDATE ENTRY ───────────────────────────────────────────────────────────
router.patch('/:id/entry/:entryId', authMiddleware, rollcallGuard, async (req, res) => {
  try {
    const call = await RollCall.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Chamada não encontrada' });
    if (call.status === 'submitted')
      return res.status(400).json({ error: 'Chamada já enviada. Reabra para editar.' });

    const entry = call.entries.id(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Entrada não encontrada' });

    const { status, arrival_time, observation } = req.body;
    if (status)       entry.status       = status;
    if (arrival_time !== undefined) entry.arrival_time = arrival_time || null;
    if (observation  !== undefined) entry.observation  = observation  || null;

    await call.save();
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar entrada' });
  }
});

// ── BULK UPDATE ENTRIES ────────────────────────────────────────────────────
router.patch('/:id/entries', authMiddleware, rollcallGuard, async (req, res) => {
  try {
    const call = await RollCall.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Chamada não encontrada' });
    if (call.status === 'submitted')
      return res.status(400).json({ error: 'Chamada já enviada. Reabra para editar.' });

    const { entries } = req.body; // [{ _id, status, arrival_time, observation }]
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries deve ser array' });

    for (const upd of entries) {
      const entry = call.entries.id(upd._id);
      if (!entry) continue;
      if (upd.status       !== undefined) entry.status       = upd.status;
      if (upd.arrival_time !== undefined) entry.arrival_time = upd.arrival_time || null;
      if (upd.observation  !== undefined) entry.observation  = upd.observation  || null;
    }

    await call.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar chamada' });
  }
});

// ── SUBMIT ─────────────────────────────────────────────────────────────────
router.post('/:id/submit', authMiddleware, rollcallGuard, async (req, res) => {
  try {
    const call = await RollCall.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Chamada não encontrada' });

    // Mark any remaining 'pending' as absent
    call.entries.forEach(e => { if (e.status === 'pending') e.status = 'absent'; });
    call.status = 'submitted';
    call.submitted_at = new Date();
    call.submitted_by = req.user._id;
    if (req.body.general_observation !== undefined)
      call.general_observation = req.body.general_observation || null;

    await call.save();
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar chamada' });
  }
});

// ── REOPEN ─────────────────────────────────────────────────────────────────
router.post('/:id/reopen', authMiddleware, rollcallGuard, async (req, res) => {
  try {
    const call = await RollCall.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Chamada não encontrada' });
    if (call.status !== 'submitted')
      return res.status(400).json({ error: 'Chamada não está no estado enviado' });

    call.status = 'reopened';
    call.reopened_at = new Date();
    await call.save();
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reabrir chamada' });
  }
});

// ── UPDATE META (label, observation) ──────────────────────────────────────
router.patch('/:id', authMiddleware, manageGuard, async (req, res) => {
  try {
    const call = await RollCall.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Chamada não encontrada' });
    if (req.body.label !== undefined) call.label = req.body.label || null;
    if (req.body.general_observation !== undefined) call.general_observation = req.body.general_observation || null;
    await call.save();
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar chamada' });
  }
});

// ── DELETE ─────────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, manageGuard, async (req, res) => {
  try {
    await RollCall.findByIdAndDelete(req.params.id);
    res.json({ message: 'Chamada excluída' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir chamada' });
  }
});

// ── SOLDIER HISTORY ────────────────────────────────────────────────────────
router.get('/soldier/:soldierId/history', authMiddleware, async (req, res) => {
  try {
    const u = req.user;
    const isAdmin = u.role === 'admin';
    const hasManage = (u.permissions || []).includes('rollcall_manage');
    const isSelf = String(u._id) === String(req.params.soldierId);
    if (!isAdmin && !hasManage && !isSelf)
      return res.status(403).json({ error: 'Acesso negado' });

    const calls = await RollCall.find({ 'entries.soldier_id': req.params.soldierId, status: { $in: ['submitted','reopened'] } })
      .select('date label status submitted_at entries.$')
      .sort({ date: -1 })
      .limit(60)
      .lean();

    const history = calls.map(c => {
      const entry = c.entries.find(e => String(e.soldier_id) === String(req.params.soldierId));
      return { rollcall_id: c._id, date: c.date, label: c.label, status: c.status, submitted_at: c.submitted_at, entry };
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

module.exports = router;
