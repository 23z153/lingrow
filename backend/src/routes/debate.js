const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const DebateTopic = require('../models/DebateTopic');
const DebateAttempt = require('../models/DebateAttempt');
const { scoreDebate } = require('../services/llmService');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

// GET /api/debate/topics — General English debate topics
router.get('/topics', requireAuth, requireMinXP(0, 'Debate Practice'), async (req, res) => {
  try {
    const topics = await DebateTopic.find({ active: { $ne: false } }).sort({ createdAt: -1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debate/topics/next — Selects a NEW unattempted general topic unique to this user
router.get('/topics/next', requireAuth, requireMinXP(0, 'Debate Practice'), async (req, res) => {
  try {
    // Get list of topic IDs the user has already attempted
    const attemptedTopicIds = await DebateAttempt.find({ user: req.user._id }).distinct('topic');

    // Find active general topics unattempted by this user
    let unattemptedTopics = await DebateTopic.find({
      active: { $ne: false },
      _id: { $nin: attemptedTopicIds },
    }).sort({ createdAt: -1 });

    let pickedTopic = null;
    if (unattemptedTopics.length > 0) {
      pickedTopic = unattemptedTopics[Math.floor(Math.random() * unattemptedTopics.length)];
    } else {
      // If all topics attempted, pick any active general topic
      const allTopics = await DebateTopic.find({ active: { $ne: false } });
      if (allTopics.length > 0) {
        pickedTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
      }
    }

    const totalTopicsCount = await DebateTopic.countDocuments({ active: { $ne: false } });

    res.json({
      topic: pickedTopic,
      unattemptedRemaining: unattemptedTopics.length,
      attemptedCount: attemptedTopicIds.length,
      totalTopicsCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
