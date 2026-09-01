const mongoose = require('mongoose');

const grammarAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'GrammarTopic', required: true },
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

module.exports = mongoose.model('GrammarAttempt', grammarAttemptSchema);
