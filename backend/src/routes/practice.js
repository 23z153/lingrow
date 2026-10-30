const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireMinXP } = require('../middleware/levelGate');
const Passage = require('../models/Passage');
const ReadAloudAttempt = require('../models/ReadAloudAttempt');
const { scorePronunciation } = require('../services/llmService');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

// GET /api/practice/passages — Returns 5 general passages sampled by student's level, excluding recently attempted
router.get('/passages', requireAuth, requireMinXP(0, 'Read Aloud'), async (req, res) => {
  try {
    const rawLevel = req.query.level || req.user?.level || 'Intermediate';
    const targetLevel = rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase();

    // Find recently attempted passage IDs for this user to exclude
    const recentAttempts = await ReadAloudAttempt.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(15)
      .distinct('passage');

    const baseFilter = {
      active: { $ne: false },
      level: targetLevel,
    };

    // First attempt: match level and exclude recent attempts
    let passages = await Passage.aggregate([
      { $match: { ...baseFilter, _id: { $nin: recentAttempts } } },
      { $sample: { size: 5 } },
    ]);

    // Fallback 1: match level without recency filter
    if (passages.length < 5) {
      passages = await Passage.aggregate([
        { $match: baseFilter },
        { $sample: { size: 5 } },
      ]);
    }

    // Fallback 2: any active general passages
    if (passages.length < 5) {
      passages = await Passage.aggregate([
        { $match: { active: { $ne: false } } },
        { $sample: { size: 5 } },
      ]);
    }

    // Format passages with word count and estimated reading time
    const enriched = passages.map((p) => {
      const words = p.wordCount || p.text.trim().split(/\s+/).length;
      const readingMinutes = Math.max(1, Math.ceil(words / 130));
      return {
        ...p,
        wordCount: words,
        estimatedReadingTime: `~${readingMinutes} min read`,
      };
    });

    res.json(enriched);
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
      pronunciationScore: result.pronunciationScore,
      sentenceFormationScore: result.sentenceFormationScore,
      accentScore: result.accentScore,
      accentClassification: result.accentClassification,
      fluency: result.fluency,
      pace: result.pace,
      wordScores: result.wordScores,
      feedback: result.feedback,
      pronunciationSuggestions: result.pronunciationSuggestions,
      sentenceFormationSuggestions: result.sentenceFormationSuggestions,
      improvements: result.improvements,
      accentTraining: result.accentTraining,
      accentDrills: result.accentDrills,
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
