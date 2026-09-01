const mongoose = require('mongoose');

const tutorMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    userName: { type: String },
    userEmail: { type: String },
    department: { type: String, default: 'CSE' },
    correction: { type: String },
    draft: { type: String },
    verification: {
      verdict: { type: String, enum: ['CORRECT', 'INCORRECT', 'SKIPPED', 'UNVERIFIED'] },
      isCorrect: { type: Boolean },
      feedback: { type: String },
      reasoning: { type: String },
      wasCorrected: { type: Boolean, default: false },
    },
    sources: [
      {
        title: { type: String },
        url: { type: String },
        snippet: { type: String },
        source: { type: String },
        date: { type: String },
      },
    ],
    engine: { type: String },
    latencyMs: { type: Number },
    liveTaskSnapshot: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TutorMessage', tutorMessageSchema);
