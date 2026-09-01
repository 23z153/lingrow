const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const DailyWordAnswer = require('../models/DailyWordAnswer');
const { getTodayWord, getFormattedDate } = require('../services/wordScraperService');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

// GET /api/notifications - User notifications
router.get('/', requireAuth, async (req, res) => {
  res.json(await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30));
});

// GET /api/notifications/daily-word - Get today's scraped uncommon word & afternoon challenge
router.get('/daily-word', requireAuth, async (req, res) => {
  try {
    const dailyWord = await getTodayWord();
    const dateStr = getFormattedDate();

    const userAnswer = await DailyWordAnswer.findOne({ user: req.user._id, dateStr });

    res.json({
      dailyWord,
      answered: !!userAnswer,
      userAnswer: userAnswer || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/daily-word/answer - Submit answer to afternoon challenge
router.post('/daily-word/answer', requireAuth, async (req, res) => {
  try {
    const { selectedOption } = req.body;
    if (selectedOption === undefined || selectedOption === null) {
      return res.status(400).json({ error: 'selectedOption is required' });
    }

    const dailyWord = await getTodayWord();
    const dateStr = getFormattedDate();

    // Check if already answered today
    let existing = await DailyWordAnswer.findOne({ user: req.user._id, dateStr });
    if (existing) {
      return res.status(400).json({ error: 'You have already answered today\'s afternoon challenge!', userAnswer: existing });
    }

    const optIndex = Number(selectedOption);
    const isCorrect = optIndex === dailyWord.question.correctAnswer;
    const xpEarned = isCorrect ? 10 : 0;

    if (isCorrect) {
      await awardXP(req.user, xpEarned);
      await maybeAwardBadge(req.user);
    }

    const answerRecord = new DailyWordAnswer({
      user: req.user._id,
      dailyWord: dailyWord._id,
      dateStr,
      selectedOption: optIndex,
      isCorrect,
      xpEarned,
    });
    await answerRecord.save();

    res.json({
      isCorrect,
      correctAnswer: dailyWord.question.correctAnswer,
      explanation: dailyWord.question.explanation,
      xpEarned,
      message: isCorrect
        ? 'Spot on! You earned +10 XP for today\'s word challenge!'
        : 'Good effort! Check the explanation and try again tomorrow.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read - Mark notification read
router.post('/:id/read', requireAuth, async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  res.json(n);
});

// POST /api/notifications/read-all - Mark all read
router.post('/read-all', requireAuth, async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

module.exports = router;
