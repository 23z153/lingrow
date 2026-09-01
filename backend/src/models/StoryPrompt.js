const mongoose = require('mongoose');
const storyPromptSchema = new mongoose.Schema(
  { prompt: { type: String, required: true }, level: { type: String, enum: ['Intermediate', 'Advanced'], default: 'Advanced' } },
  { timestamps: true }
);
module.exports = mongoose.model('StoryPrompt', storyPromptSchema);
