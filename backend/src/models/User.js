const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student', index: true },
    department: { type: String, default: '' },
    batch: { type: String, default: '' },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
    status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
    voiceProfile: { type: String, enum: ['neutral_a', 'neutral_b', 'neutral_c', 'robot'], default: 'neutral_a' },
    institution: { type: String, default: 'PSG Institute of Technology and Applied Research' },

    // --- Email verification ---
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },

    // --- Refresh token (rotated on every use; only a hash is stored,
    // the same way passwords are — a DB leak alone can't be replayed). ---
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};
userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    batch: this.batch,
    level: this.level,
    xp: this.xp,
    streak: this.streak,
    status: this.status,
    voiceProfile: this.voiceProfile,
    emailVerified: this.emailVerified,
  };
};

module.exports = mongoose.model('User', userSchema);
