const mongoose = require('mongoose');

const audienceMemberSchema = new mongoose.Schema({
  memberId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  archetype: {
    type: String,
    enum: [
      'supportive_listener',
      'strict_professor',
      'curious_student',
      'industry_expert',
      'skeptic',
      'journalist',
      'beginner_listener',
    ],
    required: true,
  },
  personality: { type: String, default: '' },
  currentReaction: { type: String, default: 'listening' },
  avatarSeed: { type: String, default: '' },
});

const speechSegmentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  audioDurationSeconds: { type: Number, default: 0 },
  measuredDuration: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const audienceQuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  askerId: { type: String, required: true },
  askerName: { type: String, required: true },
  askerRole: { type: String, required: true },
  askerArchetype: { type: String, required: true },
  questionText: { type: String, required: true },
  askedAt: { type: Date, default: Date.now },
  answerText: { type: String, default: '' },
  answeredAt: { type: Date },
  feedback: {
    reaction: { type: String, default: 'satisfied' },
    comment: { type: String, default: '' },
  },
});

const worldStageSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stageId: {
      type: String,
      enum: ['ted-talk', 'college-seminar', 'corporate-conference', 'debate-arena', 'global-summit'],
      required: true,
      index: true,
    },
    stageName: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    audienceSize: {
      type: Number,
      enum: [10, 30, 50, 100],
      default: 30,
    },
    targetDurationMinutes: {
      type: Number,
      enum: [1, 3, 5, 10],
      default: 3,
    },
    mode: {
      type: String,
      enum: ['practice', 'performance', 'debate', 'impromptu'],
      default: 'practice',
    },
    inputMode: {
      type: String,
      enum: ['voice', 'text'],
      default: 'voice',
    },
    feedbackTiming: {
      type: String,
      enum: ['during', 'after'],
      default: 'after',
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
    audienceMembers: [audienceMemberSchema],
    speechSegments: [speechSegmentSchema],
    fullTranscript: {
      type: String,
      default: '',
    },
    recentReactions: [
      {
        reaction: { type: String },
        emoji: { type: String },
        label: { type: String },
        memberName: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    questions: [audienceQuestionSchema],
    evaluation: {
      overallScore: { type: Number },
      dimensionScores: {
        grammarAccuracy: { type: Number }, // 15%
        vocabulary: { type: Number }, // 15%
        sentenceFormation: { type: Number }, // 10%
        clarity: { type: Number }, // 15%
        topicRelevance: { type: Number }, // 15%
        fluency: { type: Number }, // 10%
        speechOrganization: { type: Number }, // 10%
        audienceEngagement: { type: Number }, // 5%
      },
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      grammarCorrections: [
        {
          original: { type: String },
          corrected: { type: String },
          explanation: { type: String },
        },
      ],
      vocabularyAlternatives: [
        {
          original: { type: String },
          elevated: { type: String },
          context: { type: String },
        },
      ],
      suggestedExercises: [{ type: String }],
      pastComparison: {
        previousScore: { type: Number },
        diffPercent: { type: Number },
        comment: { type: String },
      },
      deliveryMetrics: {
        measuredWpm: { type: Number, default: 0 },
        speechDurationSeconds: { type: Number, default: 0 },
        isMeasured: { type: Boolean, default: false },
        fillerWordsDetected: [{ type: String }],
        fillerCount: { type: Number, default: 0 },
        audienceApprovalRate: { type: Number, default: 85 },
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
    xpAlreadyClaimed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

worldStageSessionSchema.index({ user: 1, createdAt: -1 });
worldStageSessionSchema.index({ user: 1, stageId: 1, status: 1 });
worldStageSessionSchema.index({ user: 1, status: 1, createdAt: -1 });
worldStageSessionSchema.index({ stageId: 1, 'evaluation.overallScore': -1 });

module.exports = mongoose.model('WorldStageSession', worldStageSessionSchema);
