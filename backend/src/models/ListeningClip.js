const mongoose = require('mongoose');

const listeningClipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    script: { type: String, required: true }, // spoken via browser TTS
    question: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    department: {
      type: String,
      enum: ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'MBA', 'General'],
      default: 'General',
    },
    source: { type: String, enum: ['scraped', 'curated'], default: 'curated' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ListeningClip', listeningClipSchema);
