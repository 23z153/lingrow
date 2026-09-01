const mongoose = require('mongoose');
const debateTopicSchema = new mongoose.Schema(
  { topic: { type: String, required: true }, level: { type: String, enum: ['Intermediate', 'Advanced'], default: 'Advanced' } },
  { timestamps: true }
);
module.exports = mongoose.model('DebateTopic', debateTopicSchema);
