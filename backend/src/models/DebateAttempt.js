const mongoose = require('mongoose');

const debateAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'DebateTopic', required: true },
    stance: { type: String, enum: ['for', 'against'], required: true },
    transcript: { type: String, required: true },
    scores: {
      logic: { type: Number },
      persuasion: { type: Number },
      clarity: { type: Number },
      vocabulary: { type: Number },
      structure: { type: Number },
      overall: { type: Number },
      // Backward compatibility aliases
      argument: { type: Number },
      counterargument: { type: Number },
    },
    // Supports legacy string feedback or structured object
    feedback: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        summary: '',
        strengths: [],
        improvements: [],
        rewrittenExcerpt: '',
      }),
    },
    deliveryMetrics: {
      wpm: { type: Number, default: 0 },
      fillerWords: [{ type: String }],
      fillerCount: { type: Number, default: 0 },
      speechDurationSeconds: { type: Number, default: 0 },
      durationEstimated: { type: Boolean, default: false },
      durationSuspect: { type: Boolean, default: false },
      targetDurationSeconds: { type: Number, default: 120 },
      targetAdherencePercent: { type: Number, default: 100 },
    },
    evaluator: { type: String, enum: ['llm', 'heuristic'], default: 'heuristic' },
    confidence: { type: Number, default: 1.0 },
    modelName: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 },
    mode: { type: String, default: 'standard' },
    stanceAssigned: { type: Boolean, default: false },
    idempotencyKey: { type: String },
    xpAwarded: { type: Number, default: 0 },
    teacherComment: { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound unique index with partialFilterExpression so it only applies when idempotencyKey is provided
debateAttemptSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('DebateAttempt', debateAttemptSchema);
