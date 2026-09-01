const mongoose = require('mongoose');

const dailyWordAnswerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dailyWord: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyWord', required: true },
    dateStr: { type: String, required: true },
    selectedOption: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    xpEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index so a user has at most one answer record per date
dailyWordAnswerSchema.index({ user: 1, dateStr: 1 }, { unique: true });

module.exports = mongoose.model('DailyWordAnswer', dailyWordAnswerSchema);
