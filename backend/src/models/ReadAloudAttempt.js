const mongoose = require('mongoose');

const wordScoreSchema = new mongoose.Schema(
  { word: String, status: { type: String, enum: ['good', 'ok', 'bad'] } },
  { _id: false }
);

const accentTrainingWordSchema = new mongoose.Schema(
  {
    word: String,
    phonetic: String,
    stressPattern: String,
    mouthPositionTip: String,
  },
  { _id: false }
);

const readAloudAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    passage: { type: mongoose.Schema.Types.ObjectId, ref: 'Passage', required: true },
    transcript: { type: String, required: true }, // captured client-side via Web Speech API
    accuracy: { type: Number, required: true },   // 0-100
    pronunciationScore: { type: Number, default: 0 }, // 0-100
    sentenceFormationScore: { type: Number, default: 0 }, // 0-100
    accentScore: { type: Number, default: 0 }, // 0-100 accent neutrality & clarity score
    accentClassification: { type: String, default: 'Neutral Professional' },
    fluency: { type: Number, required: true },    // 0-100
    pace: { type: Number, required: true },       // words per minute
    wordScores: [wordScoreSchema],
    feedback: { type: String, default: '' },      // LLM-generated coaching note
    pronunciationSuggestions: { type: String, default: '' }, // Pronunciation feedback and mispronounced word tips
    sentenceFormationSuggestions: { type: String, default: '' }, // Sentence structure & syntax coaching
    improvements: [{ type: String }],            // Actionable improvement steps
    accentTraining: [accentTrainingWordSchema],  // Targeted phonetic training cards for mispronounced words
    accentDrills: [{ type: String }],            // Accent training drills
    teacherComment: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReadAloudAttempt', readAloudAttemptSchema);
