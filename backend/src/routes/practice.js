const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const Passage = require('../models/Passage');
const ReadAloudAttempt = require('../models/ReadAloudAttempt');
const User = require('../models/User');
const { scorePronunciation } = require('../services/llmService');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

router.get('/passages', requireAuth, requireMinXP(100, 'Read Aloud'), async (req, res) => {
  try {
    const { level, department } = req.query;
    const targetDept = department || req.user?.department || 'CSE';
    
    const filter = {};
    if (level) filter.level = level;
    if (targetDept) filter.department = { $in: [targetDept, 'General'] };

    // MongoDB aggregation sample: 5 random items
    let passages = await Passage.aggregate([
      { $match: filter },
      { $sample: { size: 5 } },
    ]);

    if (!passages.length) {
      passages = await Passage.find().limit(5);
    }

    res.json(passages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/attempts', requireAuth, async (req, res) => {
  try {
    const { passageId, transcript, seconds } = req.body;
    if (!passageId || !transcript) return res.status(400).json({ error: 'passageId and transcript are required' });

    const passage = await Passage.findById(passageId);
    if (!passage) return res.status(404).json({ error: 'Passage not found' });

    const result = await scorePronunciation({ referenceText: passage.text, transcript, seconds: Number(seconds) || 0 });

    const attempt = await ReadAloudAttempt.create({
      user: req.user._id,
      passage: passage._id,
      transcript,
      accuracy: result.accuracy,
      fluency: result.fluency,
      pace: result.pace,
      wordScores: result.wordScores,
      feedback: result.feedback,
    });

    const xpGain = Math.round(10 + result.accuracy / 5);
    await awardXP(req.user, xpGain);
    await maybeAwardBadge(req.user, 'first_read_aloud');

    res.status(201).json({ attempt, xpGain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attempts/me', requireAuth, async (req, res) => {
  const attempts = await ReadAloudAttempt.find({ user: req.user._id }).populate('passage').sort({ createdAt: -1 }).limit(50);
  res.json(attempts);
});

module.exports = router;
