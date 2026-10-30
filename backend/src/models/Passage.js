const mongoose = require('mongoose');

const passageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    department: {
      type: String,
      default: 'General',
    },
    text: { type: String, required: true },
    wordCount: { type: Number, required: true },
    source: { type: String, enum: ['scraped', 'curated'], default: 'curated' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Passage', passageSchema);
