const mongoose = require('mongoose');

const wordScoreSchema = new mongoose.Schema(
  { word: String, status: { type: String, enum: ['good', 'ok', 'bad'] } },
  { _id: false }
);

const readAloudAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    passage: { type: mongoose.Schema.Types.ObjectId, ref: 'Passage', required: true },
    transcript: { type: String, required: true }, // captured client-side via Web Speech API
    accuracy: { type: Number, required: true },   // 0-100
    fluency: { type: Number, required: true },    // 0-100
    pace: { type: Number, required: true },       // words per minute
    wordScores: [wordScoreSchema],
    feedback: { type: String, default: '' },      // LLM-generated coaching note
    teacherComment: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReadAloudAttempt', readAloudAttemptSchema);
