const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['ai', 'student', 'system'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  audioDurationSeconds: {
    type: Number,
    default: 0,
  },
  measuredDuration: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // In-turn feedback for Learning Mode
  feedback: {
    originalSentence: { type: String, default: '' },
    correctedSentence: { type: String, default: '' },
    grammarMistakes: [{ type: String }],
    vocabularySuggestions: [{ type: String }],
    naturalExpressions: [{ type: String }],
    alternativeResponses: [{ type: String }],
  },
});

const simulationSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    environment: {
      type: String,
      enum: ['interview', 'office', 'travel', 'emergency', 'negotiation'],
      required: true,
      index: true,
    },
    scenarioId: {
      type: String,
      required: true,
      index: true,
    },
    scenarioTitle: {
      type: String,
      required: true,
    },
    character: {
      characterId: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      avatar: { type: String, default: 'user' },
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    mode: {
      type: String,
      enum: ['voice', 'text', 'hybrid'],
      default: 'voice',
    },
    feedbackMode: {
      type: String,
      enum: ['learning', 'challenge'],
      default: 'learning',
    },
    targetDurationMinutes: {
      type: Number,
      enum: [5, 10, 15],
      default: 10,
    },
    learningObjective: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    totalDurationSeconds: {
      type: Number,
      default: 0,
    },
    messages: [messageSchema],
    evaluation: {
      overallScore: { type: Number },
      categoryScores: {
        grammar: { type: Number }, // 20%
        vocabulary: { type: Number }, // 15%
        sentenceFormation: { type: Number }, // 15%
        clarity: { type: Number }, // 15%
        relevance: { type: Number }, // 15%
        fluencyAndDelivery: { type: Number }, // 20%
      },
      identifiedMistakes: [
        {
          sentence: { type: String },
          correction: { type: String },
          explanation: { type: String },
          type: { type: String },
        },
      ],
      strengths: [{ type: String }],
      areasForImprovement: [{ type: String }],
      personalizedRecommendations: [{ type: String }],
      suggestedNextScenario: {
        scenarioId: { type: String },
        title: { type: String },
        reason: { type: String },
      },
      deliveryMetrics: {
        measuredWpm: { type: Number, default: 0 },
        speechDurationSeconds: { type: Number, default: 0 },
        isMeasured: { type: Boolean, default: false },
        fillerWordsDetected: [{ type: String }],
        fillerCount: { type: Number, default: 0 },
        pauseEstimate: { type: String, default: 'Normal pacing' },
      },
      evaluator: {
        type: String,
        enum: ['llm', 'heuristic'],
        default: 'heuristic',
      },
      evaluatedAt: {
        type: Date,
      },
    },
    xpAwarded: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

simulationSessionSchema.index({ user: 1, createdAt: -1 });
simulationSessionSchema.index({ user: 1, environment: 1, status: 1 });

module.exports = mongoose.model('SimulationSession', simulationSessionSchema);
