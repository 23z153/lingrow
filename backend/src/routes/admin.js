const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Passage = require('../models/Passage');
const VocabWord = require('../models/VocabWord');
const DebateTopic = require('../models/DebateTopic');
const StoryPrompt = require('../models/StoryPrompt');
const ReadAloudAttempt = require('../models/ReadAloudAttempt');
const TutorMessage = require('../models/TutorMessage');
const SituationalAttempt = require('../models/SituationalAttempt');
const GrammarTopic = require('../models/GrammarTopic');
const { getQuestionBankStats, scrapeDepartmentContent } = require('../services/departmentScraperService');
const { hasKey } = require('../services/llmService');

router.use(requireAuth, requireRole('admin'));

/* -------- chatbot monitoring & live student tasks -------- */
router.get('/tutor-logs', async (req, res) => {
  try {
    const logs = await TutorMessage.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/live-student-tasks', async (req, res) => {
  try {
    const readAloud = await ReadAloudAttempt.find().populate('user', 'name email department xp level').sort({ createdAt: -1 }).limit(20);
    const situational = await SituationalAttempt.find().populate('user', 'name email department xp level').sort({ createdAt: -1 }).limit(20);
    res.json({ readAloud, situational });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------- question bank & scraper management -------- */
router.get('/question-bank/stats', async (req, res) => {
  try {
    const stats = await getQuestionBankStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/question-bank/scrape', async (req, res) => {
  try {
    const { department } = req.body;
    const result = await scrapeDepartmentContent(department);
    res.json({ message: `Scraper finished! Generated ${result.passagesCreated} passages & ${result.clipsCreated} listening clips.`, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------- grammar & beginner topics + question bank management -------- */
router.get('/grammar-topics', async (req, res) => {
  try {
    const topics = await GrammarTopic.find().sort({ createdAt: -1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/grammar-topics', async (req, res) => {
  try {
    const { title, category, level, description, ruleSummary, videoUrl } = req.body;
    if (!title || !category || !description || !ruleSummary) {
      return res.status(400).json({ error: 'Title, category, description and ruleSummary are required' });
    }
    const topic = new GrammarTopic({
      title,
      category,
      level: level || 'Beginner',
      description,
      ruleSummary,
      videoUrl: videoUrl || '',
      questions: [],
    });
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/grammar-topics/:id', async (req, res) => {
  try {
    const { title, category, level, description, ruleSummary, videoUrl } = req.body;
    const topic = await GrammarTopic.findByIdAndUpdate(
      req.params.id,
      { title, category, level, description, ruleSummary, videoUrl },
      { new: true, runValidators: true }
    );
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/grammar-topics/:id', async (req, res) => {
  try {
    const topic = await GrammarTopic.findByIdAndDelete(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json({ message: 'Topic deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Question Bank endpoints for a specific topic */
router.post('/grammar-topics/:id/questions', async (req, res) => {
  try {
    const { question, options, correctAnswer, explanation } = req.body;
    if (!question || !Array.isArray(options) || options.length !== 4 || correctAnswer === undefined || !explanation) {
      return res.status(400).json({ error: 'Question text, 4 options, correctAnswer (0-3), and explanation are required' });
    }
    const topic = await GrammarTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    topic.questions.push({
      question,
      options,
      correctAnswer: Number(correctAnswer),
      explanation,
    });
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/grammar-topics/:id/questions/import', async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'questions must be a non-empty array' });
    }
    if (questions.length > 500) {
      return res.status(400).json({ error: 'A single import can contain at most 500 questions' });
    }

    const topic = await GrammarTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const results = { created: 0, skipped: 0, errors: [] };
    const existingQuestions = new Set(topic.questions.map((q) => q.question.trim().toLowerCase()));

    questions.forEach((row, index) => {
      const question = typeof row.question === 'string' ? row.question.trim() : '';
      const options = Array.isArray(row.options)
        ? row.options.map((option) => String(option || '').trim())
        : [row.optionA, row.optionB, row.optionC, row.optionD].map((option) => String(option || '').trim());
      const explanation = typeof row.explanation === 'string' ? row.explanation.trim() : '';
      const rawCorrectAnswer = row.correctAnswer ?? row.correct_answer;
      const letterIndex = typeof rawCorrectAnswer === 'string'
        ? ['A', 'B', 'C', 'D'].indexOf(rawCorrectAnswer.trim().toUpperCase())
        : -1;
      const correctAnswer = letterIndex >= 0 ? letterIndex : Number(rawCorrectAnswer);

      if (!question || options.length !== 4 || options.some((option) => !option) || !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3 || !explanation) {
        results.skipped++;
        results.errors.push({ row: index + 1, error: 'Question, four options, a correct answer (A-D or 0-3), and explanation are required' });
        return;
      }
      if (existingQuestions.has(question.toLowerCase())) {
        results.skipped++;
        results.errors.push({ row: index + 1, error: 'Duplicate question skipped' });
        return;
      }

      topic.questions.push({ question, options, correctAnswer, explanation });
      existingQuestions.add(question.toLowerCase());
      results.created++;
    });

    if (results.created > 0) await topic.save();
    res.status(201).json({ ...results, topic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/grammar-topics/:id/questions/:qId', async (req, res) => {
  try {
    const { question, options, correctAnswer, explanation } = req.body;
    const topic = await GrammarTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const q = topic.questions.id(req.params.qId);
    if (!q) return res.status(404).json({ error: 'Question not found in question bank' });

    if (question) q.question = question;
    if (Array.isArray(options) && options.length === 4) q.options = options;
    if (correctAnswer !== undefined) q.correctAnswer = Number(correctAnswer);
    if (explanation) q.explanation = explanation;

    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/grammar-topics/:id/questions/:qId', async (req, res) => {
  try {
    const topic = await GrammarTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    topic.questions.pull({ _id: req.params.qId });
    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------- user management -------- */
router.get('/users', async (req, res) => {
  const { role, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  res.json(await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }));
});

router.post('/users', async (req, res) => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const user = new User({ name, email, role: role || 'student', department });
  await user.setPassword(password);
  await user.save();
  res.status(201).json(user.toSafeJSON());
});

router.post('/users/bulk', async (req, res) => {
  // rows: [{ name, email, password, role, department }]
  const { rows } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });

  const results = { created: 0, skipped: 0, errors: [] };
  for (const row of rows) {
    try {
      if (!row.name || !row.email || !row.password) { results.skipped++; continue; }
      const existing = await User.findOne({ email: row.email.toLowerCase() });
      if (existing) { results.skipped++; continue; }
      const user = new User({ name: row.name, email: row.email, role: row.role || 'student', department: row.department || '' });
      await user.setPassword(row.password);
      await user.save();
      results.created++;
    } catch (e) {
      results.errors.push({ row, error: e.message });
    }
  }
  res.json(results);
});

router.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ deleted: true });
});

/* -------- content library -------- */
router.post('/content/passages', async (req, res) => {
  const { title, level, text } = req.body;
  const wordCount = (text || '').trim().split(/\s+/).filter(Boolean).length;
  res.status(201).json(await Passage.create({ title, level, text, wordCount }));
});
router.post('/content/vocab', async (req, res) => {
  res.status(201).json(await VocabWord.create(req.body));
});
router.post('/content/debate-topics', async (req, res) => {
  res.status(201).json(await DebateTopic.create(req.body));
});
router.post('/content/story-prompts', async (req, res) => {
  res.status(201).json(await StoryPrompt.create(req.body));
});

/* -------- system health / stats -------- */
router.get('/stats', async (req, res) => {
  const [students, teachers, attempts30d, totalPassages, totalVocab] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'teacher' }),
    ReadAloudAttempt.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
    Passage.countDocuments(),
    VocabWord.countDocuments(),
  ]);
  res.json({
    students,
    teachers,
    attemptsLast30Days: attempts30d,
    totalPassages,
    totalVocab,
    llmConfigured: hasKey(),
    services: [
      { name: 'API server', status: 'operational' },
      { name: 'MongoDB', status: 'operational' },
      { name: 'Claude LLM (tutor / scoring)', status: hasKey() ? 'operational' : 'not configured — set ANTHROPIC_API_KEY' },
      { name: 'Speech-to-text (browser Web Speech API)', status: 'operational (client-side)' },
      { name: 'Text-to-speech (browser SpeechSynthesis)', status: 'operational (client-side)' },
      { name: 'Self-hosted Whisper / wav2vec2 / VITS / FreeVC', status: 'not deployed — plug into services/ when a GPU server is available' },
    ],
  });
});

module.exports = router;
