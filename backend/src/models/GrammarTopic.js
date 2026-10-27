const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId: { type: String },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // 0-based index (0, 1, 2, 3)
  explanation: { type: String, default: '' },
  source: { type: mongoose.Schema.Types.Mixed },
});

const grammarTopicSchema = new mongoose.Schema(
  {
    topicId: { type: Number, index: true },
    title: { type: String, required: true },
    unit: { type: String, default: '' },
    category: {
      type: String,
      required: true,
      index: true,
    },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    description: { type: String, default: '' },
    ruleSummary: { type: String, default: '' }, // Concise explanation card & examples
    videoUrl: { type: String, default: '' }, // Embedded Video URL (e.g. YouTube embed link)
    questions: [questionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('GrammarTopic', grammarTopicSchema);
