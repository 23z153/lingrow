const mongoose = require('mongoose');

const storyPromptSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    theme: { type: String, default: 'Everyday Life' },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    openingNarration: { type: String, required: true },
    prompt: { type: String, required: true },
    suggestedWords: [{ type: String }],
    active: { type: Boolean, default: true },
    department: { type: String, default: undefined }, // legacy field ignored in queries
    source: { type: String, default: 'general_curriculum' },
  },
  { timestamps: true }
);

storyPromptSchema.pre('save', function (next) {
  if (this.department) {
    this.active = false;
  }
  next();
});

storyPromptSchema.pre('insertMany', function (next, docs) {
  if (Array.isArray(docs)) {
    docs.forEach((d) => {
      if (d.department) d.active = false;
    });
  }
  next();
});

module.exports = mongoose.model('StoryPrompt', storyPromptSchema);
