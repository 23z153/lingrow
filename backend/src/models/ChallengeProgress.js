const mongoose = require('mongoose');

const challengeProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    challengeId: {
      type: String,
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      default: 100,
    },
    xpEarned: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

challengeProgressSchema.index({ user: 1, challengeId: 1 }, { unique: true });
challengeProgressSchema.index({ user: 1, level: 1 });

module.exports = mongoose.model('ChallengeProgress', challengeProgressSchema);
