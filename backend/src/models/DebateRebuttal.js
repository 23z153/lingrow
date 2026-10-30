const mongoose = require('mongoose');

const debateRebuttalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'DebateTopic', required: true },
    openingAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DebateAttempt',
      required: true,
      unique: true,
    },
    openingStance: { type: String, enum: ['for', 'against'], required: true },
    counterStance: { type: String, enum: ['for', 'against'], required: true },
    counterArgument: { type: String, required: true },
    counterKeyPoints: [{ type: String }],
    rebuttalTranscript: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 },
    mode: { type: String, default: 'timed' },
    scores: {
      responsiveness: { type: Number },
      refutation: { type: Number },
      refutationQuality: { type: Number },
      evidence: { type: Number },
      clarity: { type: Number },
      overall: { type: Number },
    },
    feedback: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        summary: '',
        strengths: [],
        improvements: [],
        rewrittenExcerpt: '',
      }),
    },
    evaluator: { type: String, enum: ['llm', 'heuristic'], default: 'heuristic' },
    confidence: { type: Number, default: 1.0 },
    modelName: { type: String, default: '' },
    xpAwarded: { type: Number, default: 0 },
    status: { type: String, enum: ['started', 'completed'], default: 'started' },
    startedAt: { type: Date, default: Date.now },
    counterShownAt: { type: Date, default: Date.now },
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DebateRebuttal', debateRebuttalSchema);
