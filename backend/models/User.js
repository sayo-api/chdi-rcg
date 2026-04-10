const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    war_number: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    war_name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    full_name: { type: String, default: null },
    rank: {
      type: String,
      enum: [
        'soldado_ev', 'soldado_ep', 'cabo',
        'terceiro_sargento', 'segundo_sargento', 'primeiro_sargento',
        'subtenente', 'aspirante', 'segundo_tenente', 'primeiro_tenente',
        'capitao', 'major', 'tenente_coronel', 'coronel',
        'general_brigada', 'general_divisao', 'general_exercito',
        'marechal', 'comandante',
      ],
      default: 'soldado_ev',
    },
    squad: { type: String, default: null },
    platoon: { type: String, default: null },
    email: { type: String, default: null, lowercase: true },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    role: {
      type: String,
      enum: ['admin', 'soldier'],
      default: 'soldier',
    },
    is_active: { type: Boolean, default: true },
    password_hash: { type: String, default: null },
    first_access: { type: Boolean, default: true },
    last_login: { type: Date, default: null },
    last_ip: { type: String, default: null },
    last_user_agent: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Panels the soldier has access to (granted by admin)
    // Possible values: 'dashboard', 'soldiers', 'rollcall', 'rollcall_manage'
    permissions: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// Index for fast lookups
userSchema.index({ role: 1 });
userSchema.index({ is_active: 1 });

// Remove password_hash from JSON output by default
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password_hash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
