const mongoose = require('mongoose');

const passageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    department: {
      type: String,
      enum: ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'MBA', 'General'],
      default: 'General',
    },
    text: { type: String, required: true },
    wordCount: { type: Number, required: true },
    source: { type: String, enum: ['scraped', 'curated'], default: 'curated' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Passage', passageSchema);
