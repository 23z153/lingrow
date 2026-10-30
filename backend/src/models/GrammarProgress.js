const mongoose = require('mongoose');

const grammarProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    completedTopicIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GrammarTopic',
      },
    ],
    bestScores: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GrammarProgress', grammarProgressSchema);
