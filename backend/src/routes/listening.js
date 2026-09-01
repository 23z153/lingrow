const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const ListeningClip = require('../models/ListeningClip');
const ListeningAttempt = require('../models/ListeningAttempt');
const { scoreListening } = require('../services/llmService');
const { awardXP } = require('../services/progressService');

router.get('/clips', requireAuth, requireMinXP(200, 'Listening Comprehension'), async (req, res) => {
  try {
    const { level, department } = req.query;
    const targetDept = department || req.user?.department || 'CSE';

    const filter = {};
    if (level) filter.level = level;
    if (targetDept) filter.department = { $in: [targetDept, 'General'] };

    // MongoDB aggregation sample: 5 random items
    let clips = await ListeningClip.aggregate([
      { $match: filter },
      { $sample: { size: 5 } },
    ]);

    if (!clips.length) {
      clips = await ListeningClip.find().limit(5);
    }

    res.json(clips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/attempts', requireAuth, async (req, res) => {
  try {
    const { clipId, answerTranscript } = req.body;
    const clip = await ListeningClip.findById(clipId);
    if (!clip) return res.status(404).json({ error: 'Clip not found' });

    const result = await scoreListening({ question: clip.question, script: clip.script, answerTranscript });
    const attempt = await ListeningAttempt.create({ user: req.user._id, clip: clip._id, answerTranscript, score: result.score, feedback: result.feedback });

    await awardXP(req.user, Math.round(5 + result.score / 10));
    res.status(201).json({ attempt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
