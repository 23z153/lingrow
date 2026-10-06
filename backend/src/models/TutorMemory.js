const mongoose = require('mongoose');

const tutorMemorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fact: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['goal', 'preference', 'background', 'weakness', 'topic'],
      default: 'goal',
    },
    source: {
      type: String,
      enum: ['user_added', 'auto_extracted'],
      default: 'user_added',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TutorMemory', tutorMemorySchema);
