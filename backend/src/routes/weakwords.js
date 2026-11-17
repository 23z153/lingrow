const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const WeakWord = require('../models/WeakWord');
const {
  enrichWordWithFastModel,
  recordReviewResult,
  getClassWeakWordsSummary,
} = require('../services/weakWordService');

/**
 * GET /api/weakwords/class-summary
 * Teacher/Admin only: returns the top 10 most-missed words across students
 */
router.get('/class-summary', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: teachers only' });
    }
    const summary = await getClassWeakWordsSummary({ teacherUser: req.user });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/weakwords/bulk
 * Upserts words mispronounced or skipped in other modules or added manually
 */
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const { words, source = 'manual' } = req.body;
    if (!Array.isArray(words)) {
      return res.status(400).json({ error: 'words must be an array of strings' });
    }

    // Limit array to 50 items
    const rawWords = words.slice(0, 50);
    const validSources = ['read-aloud', 'world-stage', 'simulator', 'manual'];
    const safeSource = validSources.includes(source) ? source : 'manual';

    const processedWords = [];

    for (const raw of rawWords) {
      if (typeof raw !== 'string') continue;
      // Sanitize: lowercase, trim, remove non-alphabetic chars (allow hyphens/apostrophes)
      const cleanWord = raw
        .toLowerCase()
        .trim()
        .replace(/[^a-z'-]/g, '')
        .slice(0, 40);

      if (!cleanWord || cleanWord.length < 2) continue;

      let existing = await WeakWord.findOne({
        userId: req.user._id,
        word: cleanWord,
      });

      if (existing) {
        existing.missCount += 1;
        existing.correctStreak = 0;
        existing.stage = 'learning';
        existing.nextReviewAt = new Date();
        existing.source = safeSource;
        await existing.save();
        processedWords.push(existing);
      } else {
        // Enrich word with phonetic & example sentence
        const enrichment = await enrichWordWithFastModel(cleanWord);
        const newWord = await WeakWord.create({
          userId: req.user._id,
          word: cleanWord,
          phonetic: enrichment.phonetic,
          exampleSentence: enrichment.exampleSentence,
          missCount: 1,
          correctStreak: 0,
          stage: 'new',
          nextReviewAt: new Date(),
          source: safeSource,
        });
        processedWords.push(newWord);
      }
    }

    res.status(201).json({
      success: true,
      count: processedWords.length,
      words: processedWords,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/weakwords/due
 * Retrieves words due for review (nextReviewAt <= now, stage != 'mastered')
 */
router.get('/due', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));
    const now = new Date();

    const dueWords = await WeakWord.find({
      userId: req.user._id,
      stage: { $ne: 'mastered' },
      nextReviewAt: { $lte: now },
    })
      .sort({ nextReviewAt: 1, missCount: -1 })
      .limit(limit)
      .lean();

    res.json(dueWords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/weakwords
 * Retrieves all user weak words along with stage metrics
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const words = await WeakWord.find({ userId: req.user._id })
      .sort({ missCount: -1, updatedAt: -1 })
      .lean();

    const counts = {
      new: 0,
      learning: 0,
      almost: 0,
      mastered: 0,
      due: 0,
      total: words.length,
    };

    words.forEach((w) => {
      if (counts[w.stage] !== undefined) {
        counts[w.stage] += 1;
      }
      if (w.stage !== 'mastered' && new Date(w.nextReviewAt) <= now) {
        counts.due += 1;
      }
    });

    res.json({
      words,
      counts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/weakwords/:id/result
 * Submits practice drill result (correct: boolean) and applies spaced repetition intervals
 */
router.post('/:id/result', requireAuth, async (req, res) => {
  try {
    const { correct } = req.body;
    if (typeof correct !== 'boolean') {
      return res.status(400).json({ error: 'correct (boolean) is required in request body' });
    }

    const weakWord = await WeakWord.findById(req.params.id);
    if (!weakWord) {
      return res.status(404).json({ error: 'Weak word not found' });
    }
    if (weakWord.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: not your weak word' });
    }

    const result = await recordReviewResult({
      weakWord,
      correct,
      user: req.user,
    });

    res.json({
      word: result.weakWord,
      xpAwarded: result.xpAwarded,
      becameMastered: result.becameMastered,
      badgeUnlocked: result.badgeUnlocked,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/weakwords/:id
 * Removes a word from the user's weak words collection
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const weakWord = await WeakWord.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!weakWord) {
      return res.status(404).json({ error: 'Weak word not found' });
    }

    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

