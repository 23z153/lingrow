const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // 0-based index
  explanation: { type: String, required: true },
});

const grammarTopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['Tenses', 'Subject-Verb Agreement', 'Articles & Nouns', 'Prepositions', 'Common Pitfalls'],
      required: true,
    },
    level: { type: String, enum: ['Beginner', 'Intermediate'], default: 'Beginner' },
    description: { type: String, required: true },
    ruleSummary: { type: String, required: true }, // Concise explanation card & examples
    questions: [questionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('GrammarTopic', grammarTopicSchema);
