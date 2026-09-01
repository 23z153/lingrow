const mongoose = require('mongoose');
// A peer practice session. In production, media flows through a WebRTC SFU
// (e.g. mediasoup) with a server-side voice-anonymization pipeline (FreeVC)
// sitting between the two audio tracks. This schema stores the session
// record, matching state and the room token used by the signalling layer;
// it deliberately does not store any audio.
const peerSessionSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roomToken: { type: String, required: true, unique: true },
    topic: { type: String, default: '' },
    status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
    voiceAnonymized: { type: Boolean, default: true },
    startedAt: Date,
    endedAt: Date,
    durationSeconds: Number,
    ratings: [{ from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, score: Number, comment: String }],
  },
  { timestamps: true }
);
module.exports = mongoose.model('PeerSession', peerSessionSchema);
