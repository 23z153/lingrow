const router = require('express').Router();
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const PeerSession = require('../models/PeerSession');

/**
 * This is a simplified matchmaking + session-record API. A production
 * deployment pairs this with a WebRTC signalling server (e.g. Socket.IO +
 * mediasoup/LiveKit) that actually carries the audio, routed through a
 * server-side voice-anonymization service (FreeVC) before reaching the
 * other participant. That real-time media path can't run inside a plain
 * REST API, so here we model the session lifecycle and matching logic,
 * which the signalling server would call into.
 */

// naive in-memory waiting queue (per process) — fine for a single instance
let waitingQueue = [];

router.post('/queue', requireAuth, async (req, res) => {
  const { topic } = req.body;
  waitingQueue = waitingQueue.filter((q) => q.userId !== req.user._id.toString());

  const partner = waitingQueue.shift();
  if (partner) {
    const roomToken = crypto.randomBytes(12).toString('hex');
    const session = await PeerSession.create({
      participants: [partner.userId, req.user._id],
      roomToken,
      topic: topic || partner.topic || '',
      status: 'active',
      startedAt: new Date(),
    });
    return res.json({ matched: true, session });
  }

  waitingQueue.push({ userId: req.user._id.toString(), topic, queuedAt: Date.now() });
  res.json({ matched: false, position: waitingQueue.length });
});

router.post('/queue/leave', requireAuth, (req, res) => {
  waitingQueue = waitingQueue.filter((q) => q.userId !== req.user._id.toString());
  res.json({ left: true });
});

router.post('/sessions/:id/end', requireAuth, async (req, res) => {
  const session = await PeerSession.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.status = 'ended';
  session.endedAt = new Date();
  session.durationSeconds = session.startedAt ? Math.round((session.endedAt - session.startedAt) / 1000) : 0;
  await session.save();
  res.json({ session });
});

router.post('/sessions/:id/rate', requireAuth, async (req, res) => {
  const { score, comment } = req.body;
  const session = await PeerSession.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.ratings.push({ from: req.user._id, score, comment });
  await session.save();
  res.json({ session });
});

router.get('/sessions/me', requireAuth, async (req, res) => {
  const sessions = await PeerSession.find({ participants: req.user._id }).populate('participants', 'name').sort({ createdAt: -1 }).limit(30);
  res.json(sessions);
});

module.exports = router;
