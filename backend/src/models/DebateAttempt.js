const mongoose = require('mongoose');
const debateAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'DebateTopic', required: true },
    stance: { type: String, enum: ['for', 'against'], required: true },
    transcript: { type: String, required: true },
    scores: {
      clarity: Number,
      logic: Number,
      vocabulary: Number,
      counterargument: Number,
      overall: Number,
    },
    feedback: { type: String, default: '' },
    teacherComment: { type: String, default: '' },
  },
  { timestamps: true }
);
module.exports = mongoose.model('DebateAttempt', debateAttemptSchema);
