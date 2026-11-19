'use strict';

const mongoose = require('mongoose');

const placementAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questionIds: {
      type: [String],
      required: true,
    },
    permutations: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    writtenScore: {
      type: Number,
      default: null,
    },
    advancedCorrect: {
      type: Number,
      default: null,
    },
    placementSpeechScore: {
      type: Number,
      default: null,
    },
    recommendedLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', null],
      default: null,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index to quickly find user attempts sorted by recency
placementAttemptSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PlacementAttempt', placementAttemptSchema);

