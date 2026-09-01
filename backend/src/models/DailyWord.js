const mongoose = require('mongoose');

const dailyWordSchema = new mongoose.Schema(
  {
    dateStr: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD
    word: { type: String, required: true },
    partOfSpeech: { type: String, default: 'noun' },
    meaning: { type: String, required: true },
    relevancy: { type: String, required: true },
    example: { type: String, required: true },
    source: { type: String, default: 'scraped' }, // 'scraped' | 'curated'
    question: {
      prompt: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: Number, required: true }, // 0-based index
      explanation: { type: String, required: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyWord', dailyWordSchema);
