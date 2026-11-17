const mongoose = require('mongoose');

const worldStageScenarioSchema = new mongoose.Schema(
  {
    stageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    atmosphere: {
      lighting: { type: String, default: 'Spotlight & warm ambient glow' },
      backdrop: { type: String, default: 'Curved digital keynote screen' },
      audioAmbience: { type: String, default: 'Attentive murmurs & occasional applause' },
    },
    icon: {
      type: String,
      default: 'mic',
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Advanced',
    },
    badge: {
      type: String,
      default: 'Featured',
    },
    suggestedTopics: [
      {
        topicId: { type: String, required: true },
        title: { type: String, required: true },
        category: { type: String, default: 'General' },
        difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'], default: 'Intermediate' },
        prompt: { type: String, required: true },
        talkingPoints: [{ type: String }],
      },
    ],
    audiencePool: [
      {
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
        personality: { type: String, required: true },
        reactionStyle: { type: String, required: true },
        questionStyle: { type: String, required: true },
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorldStageScenario', worldStageScenarioSchema);
