const mongoose = require('mongoose');

const idiomProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expression: { type: mongoose.Schema.Types.ObjectId, ref: 'IdiomPhrase', required: true, index: true },
    mastery: {
      type: String,
      enum: ['new', 'familiar', 'mastered'],
      default: 'new',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    stage2Passed: { type: Boolean, default: false },
    stage3Passed: { type: Boolean, default: false },
    lastScore: { type: Number, default: 0 },
    lastPracticed: { type: Date, default: null },
    nextReviewDate: { type: Date, default: null },
    history: [
      {
        stage: { type: String, enum: ['understand', 'use', 'review'], required: true },
        passed: { type: Boolean, required: true },
        score: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

idiomProgressSchema.index({ user: 1, expression: 1 }, { unique: true });

module.exports = mongoose.model('IdiomProgress', idiomProgressSchema);
