const mongoose = require('mongoose');

// Questions are snapshotted onto the test at creation time (copied out of the
// GrammarTopic question bank) so a test stays stable even if the bank changes
// later — students who take it later still see the same paper.
const testQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true }, // 0-based index
    explanation: { type: String, default: '' },
    sourceTopic: { type: mongoose.Schema.Types.ObjectId, ref: 'GrammarTopic' },
  },
  { _id: false }
);

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    // Matches GrammarTopic.category — the "topic" the teacher picks, which
    // is what the question bank is fetched/filtered by.
    category: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    durationMinutes: { type: Number, default: 20, min: 1 },
    questions: [testQuestionSchema],
    requestedQuestionCount: { type: Number, default: 0 }, // what the teacher asked for
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batch: { type: String, default: '' }, // '' = open to every batch
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'published' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Test', testSchema);
