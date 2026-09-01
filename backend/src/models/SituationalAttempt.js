const mongoose = require('mongoose');

const situationalAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scenario: { type: mongoose.Schema.Types.ObjectId, ref: 'SituationalPhrase', required: true },
    score: { type: Number, required: true }, // percentage 0-100
    correctCount: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    answers: [
      {
        questionIndex: Number,
        selectedOption: Number,
        isCorrect: Boolean,
      },
    ],
    xpEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SituationalAttempt', situationalAttemptSchema);
