const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
    success: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  }
);

loginLogSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('LoginLog', loginLogSchema);
