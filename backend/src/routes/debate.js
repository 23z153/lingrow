const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const DebateTopic = require('../models/DebateTopic');
const DebateAttempt = require('../models/DebateAttempt');
const { scoreDebate } = require('../services/llmService');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

router.get('/topics', requireAuth, requireMinXP(750, 'Debate Practice'), async (req, res) => {
  res.json(await DebateTopic.find().sort({ createdAt: 1 }));
});

router.post('/attempts', requireAuth, async (req, res) => {
  try {
    const { topicId, stance, transcript } = req.body;
    if (!topicId || !stance || !transcript) return res.status(400).json({ error: 'topicId, stance and transcript are required' });

    const topic = await DebateTopic.findById(topicId);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const result = await scoreDebate({ topic: topic.topic, stance, transcript });

    const attempt = await DebateAttempt.create({
      user: req.user._id,
      topic: topic._id,
      stance,
      transcript,
      scores: result.scores,
      feedback: result.feedback,
    });

    await awardXP(req.user, Math.round(15 + result.scores.overall / 5));
    if (result.scores.overall >= 85) await maybeAwardBadge(req.user, 'debate_champion');

    res.status(201).json({ attempt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attempts/me', requireAuth, async (req, res) => {
  res.json(await DebateAttempt.find({ user: req.user._id }).populate('topic').sort({ createdAt: -1 }).limit(50));
});

module.exports = router;
