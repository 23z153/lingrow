const mongoose = require('mongoose');

const listeningClipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    accent: { type: String, default: 'General American' },
    audioUrl: { type: String, default: '' },
    script: { type: String, required: true },
    question: { type: String, required: true },
    department: {
      type: String,
      default: 'General',
    },
    source: { type: String, enum: ['scraped', 'curated'], default: 'curated' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ListeningClip', listeningClipSchema);
