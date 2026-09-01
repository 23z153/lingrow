const mongoose = require('mongoose');
const listeningAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clip: { type: mongoose.Schema.Types.ObjectId, ref: 'ListeningClip', required: true },
    answerTranscript: { type: String, required: true },
    score: Number,
    feedback: { type: String, default: '' },
  },
  { timestamps: true }
);
module.exports = mongoose.model('ListeningAttempt', listeningAttemptSchema);
