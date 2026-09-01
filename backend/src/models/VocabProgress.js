const mongoose = require('mongoose');

const vocabProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    word: { type: mongoose.Schema.Types.ObjectId, ref: 'VocabWord', required: true },
    timesReviewed: { type: Number, default: 0 },
    mastered: { type: Boolean, default: false },
  },
  { timestamps: true }
);
vocabProgressSchema.index({ user: 1, word: 1 }, { unique: true });

module.exports = mongoose.model('VocabProgress', vocabProgressSchema);
