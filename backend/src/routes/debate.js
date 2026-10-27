const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const DebateTopic = require('../models/DebateTopic');
const DebateAttempt = require('../models/DebateAttempt');
const { scoreDebate } = require('../services/llmService');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

router.get('/topics', requireAuth, requireMinXP(750, 'Debate Practice'), async (req, res) => {
  try {
    const { department } = req.query;
    const filter = department ? { $or: [{ department: department.toUpperCase() }, { department: 'General' }] } : {};
    res.json(await DebateTopic.find(filter).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debate/topics/next — Selects a NEW unattempted topic unique to this user
router.get('/topics/next', requireAuth, requireMinXP(750, 'Debate Practice'), async (req, res) => {
  try {
    const { department } = req.query;
    const deptFilter = department ? { $or: [{ department: department.toUpperCase() }, { department: 'General' }] } : {};

    // Get list of topic IDs the user has already attempted
    const attemptedTopicIds = await DebateAttempt.find({ user: req.user._id }).distinct('topic');

    // Find topics unattempted by this user
    let unattemptedTopics = await DebateTopic.find({
      _id: { $nin: attemptedTopicIds },
      ...deptFilter,
    }).sort({ createdAt: -1 });

    let pickedTopic = null;
    if (unattemptedTopics.length > 0) {
      // Pick a random unattempted topic from the pool
      pickedTopic = unattemptedTopics[Math.floor(Math.random() * unattemptedTopics.length)];
    } else {
      // If all topics attempted, pick random from dept
      const allTopics = await DebateTopic.find(deptFilter);
      if (allTopics.length > 0) {
        pickedTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
      }
    }

    const totalTopicsCount = await DebateTopic.countDocuments(deptFilter);

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
