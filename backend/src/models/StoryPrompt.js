const mongoose = require('mongoose');

const storyPromptSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Story Narration Exercise' },
    prompt: { type: String, required: true },
    department: { type: String, default: 'General' },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Advanced' },
    openingNarration: { type: String, default: '' },
    source: { type: String, default: 'scraped' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoryPrompt', storyPromptSchema);

