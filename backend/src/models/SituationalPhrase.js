const mongoose = require('mongoose');

const phraseCardSchema = new mongoose.Schema({
  speaker: { type: String, required: true },
  englishText: { type: String, required: true },
  explanation: { type: String, required: true },
  keyTips: { type: String },
});

const promptSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // 0-based index
  explanation: { type: String, required: true },
});

const situationalPhraseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['Campus Life', 'Professional & Jobs', 'Social & Daily'],
      required: true,
    },
    level: { type: String, enum: ['Beginner', 'Intermediate'], default: 'Beginner' },
    situationContext: { type: String, required: true },
    phrases: [phraseCardSchema],
    interactivePrompts: [promptSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('SituationalPhrase', situationalPhraseSchema);
