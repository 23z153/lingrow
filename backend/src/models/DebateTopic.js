const mongoose = require('mongoose');

const debateTopicSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    department: { type: String, default: 'General' },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Advanced' },
    context: { type: String, default: '' },
    forKeyPoints: [{ type: String }],
    againstKeyPoints: [{ type: String }],
    source: { type: String, default: 'scraped' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DebateTopic', debateTopicSchema);

