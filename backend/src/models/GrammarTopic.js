const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // 0-based index (0, 1, 2, 3)
  explanation: { type: String, required: true },
});

const grammarTopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['Tenses', 'Subject-Verb Agreement', 'Articles & Nouns', 'Prepositions', 'Common Pitfalls', 'Basic Sentences & Verbs', 'Vocabulary & Idioms'],
      required: true,
    },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    description: { type: String, required: true },
    ruleSummary: { type: String, required: true }, // Concise explanation card & examples
    videoUrl: { type: String, default: '' }, // Embedded Video URL (e.g. YouTube embed link)
    questions: [questionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('GrammarTopic', grammarTopicSchema);

