const mongoose = require('mongoose');
const storyAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prompt: { type: mongoose.Schema.Types.ObjectId, ref: 'StoryPrompt', required: true },
    transcript: { type: String, required: true },
    scores: { creativity: Number, coherence: Number, vocabulary: Number, grammarFlow: Number, overall: Number },
    feedback: { type: String, default: '' },
  },
  { timestamps: true }
);
module.exports = mongoose.model('StoryAttempt', storyAttemptSchema);
