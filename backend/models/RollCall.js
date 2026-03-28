const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  soldier_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  war_number:   { type: String, required: true },
  war_name:     { type: String, required: true },
  rank:         { type: String, default: 'soldado_ev' },
  squad:        { type: String, default: null },
  platoon:      { type: String, default: null },
  // present | absent | late | pending
  status:       { type: String, enum: ['present','absent','late','pending'], default: 'pending' },
  arrival_time: { type: String, default: null },   // "09:45"
  observation:  { type: String, default: null },
}, { _id: true, versionKey: false });

const rollCallSchema = new mongoose.Schema({
  date: {
    type: String,   // "2024-06-10"  — date-only string for easy querying/grouping
    required: true,
  },
  label: { type: String, default: null },   // optional free label e.g. "Chamada manhã"
  squad:   { type: String, default: null }, // optional filter by squad
  platoon: { type: String, default: null }, // optional filter by platoon

  status: {
    type: String,
    enum: ['open', 'submitted', 'reopened'],
    default: 'open',
  },

  opened_at:    { type: Date, default: Date.now },
  submitted_at: { type: Date, default: null },
  reopened_at:  { type: Date, default: null },

  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  general_observation: { type: String, default: null },

  entries: [entrySchema],
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
});

rollCallSchema.index({ date: -1 });
rollCallSchema.index({ created_by: 1 });
rollCallSchema.index({ status: 1 });

module.exports = mongoose.model('RollCall', rollCallSchema);
