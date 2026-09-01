const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const SituationalPhrase = require('../models/SituationalPhrase');
const SituationalAttempt = require('../models/SituationalAttempt');
const { awardXP, maybeAwardBadge } = require('../services/progressService');

// GET /api/situational/scenarios - List scenarios with user progress
router.get('/scenarios', requireAuth, async (req, res) => {
  try {
    const { category, level } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (level) filter.level = level;

    const scenarios = await SituationalPhrase.find(filter).sort({ createdAt: 1 });
    const attempts = await SituationalAttempt.find({ user: req.user._id });

    const stats = {};
    for (const a of attempts) {
      const sid = a.scenario.toString();
      if (!stats[sid]) stats[sid] = { bestScore: 0, attemptsCount: 0 };
      stats[sid].attemptsCount += 1;
      if (a.score > stats[sid].bestScore) stats[sid].bestScore = a.score;
    }

    const result = scenarios.map((s) => {
      const st = stats[s._id.toString()] || { bestScore: 0, attemptsCount: 0 };
      return {
        ...s.toObject(),
        bestScore: st.bestScore,
        attemptsCount: st.attemptsCount,
        completed: st.attemptsCount > 0,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/situational/attempts/me - User attempts history
router.get('/attempts/me', requireAuth, async (req, res) => {
  try {
    const attempts = await SituationalAttempt.find({ user: req.user._id })
      .populate('scenario', 'title category level')
      .sort({ createdAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/situational/scenarios/:id - Single scenario details
router.get('/scenarios/:id', requireAuth, async (req, res) => {
  try {
    const scenario = await SituationalPhrase.findById(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Situational scenario not found' });
    res.json(scenario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/situational/scenarios/:id/submit - Evaluate roleplay answers
router.post('/scenarios/:id/submit', requireAuth, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array of selected option indexes' });
    }

    const scenario = await SituationalPhrase.findById(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Situational scenario not found' });

    let correctCount = 0;
    const evaluatedAnswers = scenario.interactivePrompts.map((q, idx) => {
      const selectedOption = answers[idx] !== undefined ? Number(answers[idx]) : -1;
      const isCorrect = selectedOption === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      return {
        questionIndex: idx,
        selectedOption,
        isCorrect,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    });

    const totalQuestions = scenario.interactivePrompts.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    let xpEarned = 0;
    if (score >= 50) {
      xpEarned = Math.round(20 + (score / 100) * 10); // 20-30 XP
      await awardXP(req.user, xpEarned);
      await maybeAwardBadge(req.user);
    }

    const attempt = new SituationalAttempt({
      user: req.user._id,
      scenario: scenario._id,
      score,
      correctCount,
      totalQuestions,
      answers: evaluatedAnswers,
      xpEarned,
    });
    await attempt.save();

    res.json({
      attempt,
      evaluatedAnswers,
      score,
      correctCount,
      totalQuestions,
      xpEarned,
      message:
        score >= 80
          ? 'Fantastic conversation skills! You spoke naturally and politely.'
          : score >= 50
          ? 'Good job! Review the phrase cards to make your speech even smoother.'
          : 'Nice effort! Practice listening to the audio cards and try again.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
