const mongoose = require('mongoose');

const weakWordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    word: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 40,
    },
    phonetic: {
      type: String,
      default: '',
      trim: true,
    },
    exampleSentence: {
      type: String,
      default: '',
      trim: true,
    },
    missCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    correctStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    stage: {
      type: String,
      enum: ['new', 'learning', 'almost', 'mastered'],
      default: 'new',
      index: true,
    },
    nextReviewAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastResult: {
      type: String,
      enum: ['correct', 'wrong', null],
      default: null,
    },
    source: {
      type: String,
      enum: ['read-aloud', 'world-stage', 'simulator', 'manual'],
      default: 'manual',
    },
  },
  { timestamps: true }
);

// Compound index to guarantee one weak word entry per student
weakWordSchema.index({ userId: 1, word: 1 }, { unique: true });
// Compound index for fast review scheduling queries
weakWordSchema.index({ userId: 1, nextReviewAt: 1, stage: 1 });

module.exports = mongoose.model('WeakWord', weakWordSchema);

