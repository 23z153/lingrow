const mongoose = require('mongoose');

const simulationScenarioSchema = new mongoose.Schema(
  {
    environment: {
      type: String,
      enum: ['interview', 'office', 'travel', 'emergency', 'negotiation'],
      required: true,
      index: true,
    },
    scenarioId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, default: 'message' },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
      default: 'All Levels',
    },
    defaultDurationMinutes: { type: Number, default: 10 },
    learningObjectives: [{ type: String }],
    characters: [
      {
        characterId: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, required: true },
        avatar: { type: String, default: 'user' },
        personality: { type: String, required: true },
        communicationStyle: { type: String, required: true },
        difficulty: {
          type: String,
          enum: ['Beginner', 'Intermediate', 'Advanced'],
          default: 'Intermediate',
        },
        conversationObjectives: [{ type: String }],
      },
    ],
    initialPrompt: { type: String, required: true },
    systemPrompt: { type: String, required: true },
    tips: [{ type: String }],
    disclaimer: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SimulationScenario', simulationScenarioSchema);
