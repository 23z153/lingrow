const mongoose = require('mongoose');

const vocabWordSchema = new mongoose.Schema(
  {
    word: { type: String, required: true },
    partOfSpeech: { type: String, default: 'adjective' },
    meaning: { type: String, required: true },
    example: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VocabWord', vocabWordSchema);
