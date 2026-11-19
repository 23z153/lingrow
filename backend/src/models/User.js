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
    section: { type: String, default: 'A', trim: true }, // For students: Class/Section name (e.g. 'A', 'B', 'C')
    assignedClasses: [{ type: String, trim: true }], // For teachers: Array of assigned classes/sections (e.g. ['A', 'B'])
    createdByAdmin: { type: Boolean, default: false }, // Only admin-provisioned accounts can log in
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', null], default: null },
    unlockedLevels: {
      type: [String],
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: ['Beginner'],
    },
    onboardingCompleted: { type: Boolean, default: false },
    legacyLevel: { type: String, default: null },
    levelSource: { type: String, enum: ['placement', 'self', 'teacher', 'admin', null], default: null },
    placementScore: { type: Number, default: null },
    placementSpeechScore: { type: Number, default: null },
    levelAssignedAt: { type: Date, default: null },
    levelAuditLog: [
      {
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        previousLevel: { type: String, default: null },
        newLevel: { type: String, required: true },
        reason: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
    status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
    voiceProfile: { type: String, enum: ['neutral_a', 'neutral_b', 'neutral_c', 'robot'], default: 'neutral_a' },
    institution: { type: String, default: 'PSG Institute of Technology and Applied Research' },
    selectedDebateDept: { type: String, default: '' },

    // --- Email verification ---
    emailVerified: { type: Boolean, default: true },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },

    // --- Refresh token ---
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
userSchema.methods.getUnlockedLevels = function () {
  const { getUnlockedLevelsForLevel } = require('../config/levelAccess');
  return getUnlockedLevelsForLevel(this.level);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    batch: this.batch,
    section: this.section,
    assignedClasses: this.assignedClasses || [],
    createdByAdmin: this.createdByAdmin,
    level: this.level,
    onboardingCompleted: this.onboardingCompleted ?? false,
    legacyLevel: this.legacyLevel || null,
    levelSource: this.levelSource || null,
    placementScore: this.placementScore ?? null,
    placementSpeechScore: this.placementSpeechScore ?? null,
    levelAssignedAt: this.levelAssignedAt || null,
    unlockedLevels: this.getUnlockedLevels(),
    xp: this.xp,
    streak: this.streak,
    status: this.status,
    voiceProfile: this.voiceProfile,
    selectedDebateDept: this.selectedDebateDept || '',
    emailVerified: this.emailVerified,
  };
};

module.exports = mongoose.model('User', userSchema);
