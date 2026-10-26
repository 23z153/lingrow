const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const GrammarTopic = require('../models/GrammarTopic');
const User = require('../models/User');
const { awardXP } = require('../services/progressService');

/* Fisher-Yates shuffle — used so two tests built from the same topic don't
   hand out an identical paper in the same order every time. */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* -------------------------------------------------------------------------
   GET /api/tests/topics
   Returns all 243 individual topics grouped by unit so teachers can pick
   an exact topic from the question bank.
------------------------------------------------------------------------- */
router.get('/topics', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const topics = await GrammarTopic.find({}, 'topicId title unit category level')
      .sort({ topicId: 1 })
      .lean();

    const grouped = {};
    for (const t of topics) {
      const u = t.unit || t.category || 'General';
      if (!grouped[u]) grouped[u] = [];
      grouped[u].push({
        topicId: t.topicId,
        title: t.title,
        category: t.category,
        unit: t.unit,
        level: t.level,
        questionsCount: 25,
      });
    }

    res.json({ topics, grouped, totalTopics: topics.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   GET /api/tests/categories
   The list of topics a teacher can build a test from, with how many
   questions currently sit in the bank for each — so the UI can warn if
   a teacher asks for more than the bank actually has.
------------------------------------------------------------------------- */
router.get('/categories', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const stats = await GrammarTopic.aggregate([
      {
        $project: {
          category: 1,
          level: 1,
          numQuestions: { $size: '$questions' }
        }
      },
      {
        $group: {
          _id: '$category',
          bankSize: { $sum: '$numQuestions' },
          topicCount: { $sum: 1 },
          levels: { $addToSet: '$level' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const result = stats.map((s) => ({
      category: s._id,
      bankSize: s.bankSize,
      topicCount: s.topicCount,
      levels: s.levels,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   POST /api/tests
   Teacher creates a test: give it a title + a topic (category) + how many
   questions, and it auto-fetches that many questions from the question
   bank (GrammarTopic docs matching the category/level).
------------------------------------------------------------------------- */
router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    let { title, category, level, numQuestions, durationMinutes, batches, batch, status, topicId } = req.body;
    let targetBatches = [];
    if (Array.isArray(batches)) {
      targetBatches = batches.map((b) => String(b).trim()).filter(Boolean);
    } else if (typeof batches === 'string' && batches.trim()) {
      targetBatches = batches.split(',').map((b) => b.trim()).filter(Boolean);
    } else if (batch && String(batch).trim()) {
      targetBatches = String(batch).split(',').map((b) => b.trim()).filter(Boolean);
    }

    let topics = [];
    if (topicId) {
      const singleTopic = await GrammarTopic.findOne({ topicId: Number(topicId) });
      if (singleTopic) {
        topics = [singleTopic];
        if (!category) category = singleTopic.title || singleTopic.category;
      }
    }
    if (topics.length === 0 && category) {
      const filter = { category };
      if (level && level !== 'All' && level !== 'All Levels') filter.level = level;
      topics = await GrammarTopic.find(filter);
      if (topics.length === 0) {
        topics = await GrammarTopic.find({ category });
      }
    }

    if (!title || (!category && topics.length === 0)) {
      return res.status(400).json({ error: 'Title and topic are required' });
    }

    const requested = Math.max(1, Math.min(500, Number(numQuestions) || 25));

    const pool = [];
    for (const t of topics) {
      for (const q of t.questions) {
        pool.push({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          sourceTopic: t._id,
        });
      }
    }

    if (pool.length === 0) {
      return res.status(400).json({
        error: `No questions found in the question bank for "${category}"${level ? ` (${level})` : ''}. Add topics/questions to that category first.`,
      });
    }

    const picked = shuffle(pool).slice(0, requested);

    const testLevel = (level && level !== 'All' && level !== 'All Levels')
      ? level
      : (topics[0]?.level || 'Beginner');

    const test = await Test.create({
      title,
      category,
      level: testLevel,
      durationMinutes: Number(durationMinutes) || 20,
      questions: picked,
      requestedQuestionCount: requested,
      createdBy: req.user._id,
      batch: targetBatches.join(', '),
      batches: targetBatches,
      status: status === 'draft' ? 'draft' : 'published',
    });

    res.status(201).json({
      test,
      message:
        picked.length < requested
          ? `Test created with ${picked.length} questions — the bank only had ${pool.length} available for "${category}". Add more questions to reach ${requested}.`
          : `Test created with ${picked.length} questions from the "${category}" question bank.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Teacher: list tests they created (admins see all), with attempt counts.
------------------------------------------------------------------------- */
router.get('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const tests = await Test.find(filter).sort({ createdAt: -1 }).select('-questions.correctAnswer -questions.explanation');
    const counts = await TestAttempt.aggregate([
      { $match: { test: { $in: tests.map((t) => t._id) } } },
      { $group: { _id: '$test', attempts: { $sum: 1 }, avgScore: { $avg: '$score' } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c]));
    const result = tests.map((t) => ({
      ...t.toObject(),
      questionCount: t.questions.length,
      attempts: countMap[t._id.toString()]?.attempts || 0,
      avgScore: countMap[t._id.toString()] ? Math.round(countMap[t._id.toString()].avgScore) : null,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Student: tests available to them (published, matching batch or open to
   all), each flagged with whether they've already attempted it.
------------------------------------------------------------------------- */
router.get('/available', requireAuth, async (req, res) => {
  try {
    const studentBatch = (req.user.batch || '').trim().toLowerCase();
    const filter = {
      status: 'published',
      $or: [
        { batches: { $size: 0 }, batch: '' },
        { batches: { $exists: false }, batch: '' },
        { batch: 'all' },
        ...(studentBatch
          ? [
              { batches: new RegExp(`^${studentBatch}$`, 'i') },
              { batch: new RegExp(`^${studentBatch}$`, 'i') },
              { batch: new RegExp(`(^|,\\s*)${studentBatch}(\\s*,|$)`, 'i') },
            ]
          : [{ batch: '' }]),
      ],
    };
    const tests = await Test.find(filter).sort({ createdAt: -1 }).select('-questions.correctAnswer -questions.explanation');
    const myAttempts = await TestAttempt.find({ user: req.user._id, test: { $in: tests.map((t) => t._id) } });
    const bestByTest = {};
    for (const a of myAttempts) {
      const id = a.test.toString();
      if (!bestByTest[id] || a.score > bestByTest[id]) bestByTest[id] = a.score;
    }
    const result = tests.map((t) => ({
      ...t.toObject(),
      questionCount: t.questions.length,
      attempted: bestByTest[t._id.toString()] !== undefined,
      bestScore: bestByTest[t._id.toString()] ?? null,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/attempts/me', requireAuth, async (req, res) => {
  try {
    const attempts = await TestAttempt.find({ user: req.user._id }).populate('test', 'title category level').sort({ createdAt: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Student: fetch a test to take (answers/explanations stripped out).
------------------------------------------------------------------------- */
function hasClassAccess(test, user) {
  if (user.role !== 'student') return true;
  const targetBatches = (test.batches && test.batches.length
    ? test.batches
    : (test.batch ? test.batch.split(',').map((s) => s.trim()) : [])
  ).filter((b) => b && b.toLowerCase() !== 'all');
  if (targetBatches.length === 0) return true;
  const studentBatch = (user.batch || '').trim().toLowerCase();
  return targetBatches.some((b) => b.toLowerCase() === studentBatch);
}

router.get('/:id/take', requireAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).select('-questions.correctAnswer -questions.explanation -questions.sourceTopic');
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (test.status !== 'published') return res.status(403).json({ error: 'This test is not currently open' });
    if (!hasClassAccess(test, req.user)) {
      return res.status(403).json({ error: 'Access restricted: you do not belong to the classes assigned to this test.' });
    }
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Student: submit answers for scoring.
------------------------------------------------------------------------- */
router.post('/:id/attempts', requireAuth, async (req, res) => {
  try {
    const { answers, timeTakenSeconds } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array of selected option indexes' });

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (test.status !== 'published') return res.status(403).json({ error: 'This test is not currently open' });
    if (!hasClassAccess(test, req.user)) {
      return res.status(403).json({ error: 'Access restricted: you do not belong to the classes assigned to this test.' });
    }

    let correctCount = 0;
    const evaluated = test.questions.map((q, idx) => {
      const selectedOption = answers[idx] !== undefined ? Number(answers[idx]) : -1;
      const isCorrect = selectedOption === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      return { questionIndex: idx, selectedOption, isCorrect, correctAnswer: q.correctAnswer, explanation: q.explanation };
    });

    const totalQuestions = test.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    let xpEarned = 0;
    if (score >= 50) {
      xpEarned = Math.round(20 + (score / 100) * 30); // 20 - 50 XP, tests are worth more than a single grammar topic
      await awardXP(req.user, xpEarned);
    }

    const attempt = await TestAttempt.create({
      test: test._id,
      user: req.user._id,
      answers: evaluated,
      score,
      correctCount,
      totalQuestions,
      timeTakenSeconds: Number(timeTakenSeconds) || 0,
      xpEarned,
    });

    res.status(201).json({
      attempt,
      evaluatedAnswers: evaluated,
      score,
      correctCount,
      totalQuestions,
      xpEarned,
      message: score >= 80 ? 'Excellent result!' : score >= 50 ? 'Good effort — review the ones you missed.' : 'Keep practicing — review the explanations below.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Teacher: full test detail (with answers) + per-question difficulty stats.
------------------------------------------------------------------------- */
router.get('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { status, title, durationMinutes, batch } = req.body;
    const update = {};
    if (status && ['draft', 'published', 'closed'].includes(status)) update.status = status;
    if (title) update.title = title;
    if (durationMinutes) update.durationMinutes = Number(durationMinutes);
    if (batch !== undefined) update.batch = batch;

    const test = await Test.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    await TestAttempt.deleteMany({ test: req.params.id });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------
   Teacher: results for one test — every student's attempt, best score,
   ranked, plus a per-question breakdown of how many got each one wrong
   (so the teacher can see which questions the class struggled with).
------------------------------------------------------------------------- */
router.get('/:id/results', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const attempts = await TestAttempt.find({ test: test._id }).populate('user', 'name email batch level').sort({ score: -1 });

    const questionStats = test.questions.map((q, idx) => ({ question: q.question, wrongCount: 0, totalAnswered: 0 }));
    for (const a of attempts) {
      for (const ans of a.answers) {
        if (questionStats[ans.questionIndex]) {
          questionStats[ans.questionIndex].totalAnswered += 1;
          if (!ans.isCorrect) questionStats[ans.questionIndex].wrongCount += 1;
        }
      }
    }

    const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;

    res.json({ test, attempts, avgScore, totalAttempts: attempts.length, questionStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
