const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const TutorMessage = require('../models/TutorMessage');
const ReadAloudAttempt = require('../models/ReadAloudAttempt');
const SituationalAttempt = require('../models/SituationalAttempt');
const VocabProgress = require('../models/VocabProgress');
const Document = require('../models/Document');
const { tutorReply, getLLMStatus } = require('../services/llmService');
const { scrapeLiveWebData } = require('../services/webScraperService');
const { executeWebSearch } = require('../services/webSearchService');
const { ingestDocument } = require('../services/ragService');
const { getModelConfig } = require('../services/ollamaClient');

router.get('/', (req, res) => res.redirect('/'));

router.get('/llm-status', requireAuth, async (req, res) => {
  try {
    const status = await getLLMStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/models', requireAuth, async (req, res) => {
  try {
    const config = await getModelConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/live-web-data', requireAuth, async (req, res) => {
  try {
    const data = await scrapeLiveWebData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const messages = await TutorMessage.find({ user: req.user._id }).sort({ createdAt: 1 }).limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------- Document / RAG Endpoints ------------------- */
router.get('/documents', requireAuth, async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user._id }).select('-chunks.keywords').sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/documents/upload', requireAuth, async (req, res) => {
  try {
    const { title, text, filename, department, tags } = req.body;
    if (!title || !text) {
      return res.status(400).json({ error: 'title and text are required' });
    }

    const doc = await ingestDocument({
      userId: req.user._id,
      title,
      text,
      filename: filename || title,
      department: department || req.user.department || 'CSE',
      tags: tags || [],
    });

    res.status(201).json({
      message: 'Document successfully indexed for RAG tutoring!',
      document: doc,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/documents/:id', requireAuth, async (req, res) => {
  try {
    await Document.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Document removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------- Live Web Search Endpoint ------------------- */
router.post('/search', requireAuth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });

    const results = await executeWebSearch(query, 5);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------- Two-Model Message Endpoint ------------------- */
router.post('/message', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    // Gather Live Task Snapshot for the Chatbot Engine
    const readAloudAttempts = await ReadAloudAttempt.find({ user: req.user._id }).limit(5);
    const readAloudAvg = readAloudAttempts.length
      ? Math.round(readAloudAttempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / readAloudAttempts.length)
      : null;
    const situationalDone = await SituationalAttempt.countDocuments({ user: req.user._id });
    const vocabMastered = await VocabProgress.countDocuments({ user: req.user._id, mastered: true });

    const liveTaskContext = {
      userName: req.user.name,
      userEmail: req.user.email,
      xp: req.user.xp || 0,
      level: req.user.level || 'Beginner',
      readAloudAvg,
      situationalDone,
      vocabMastered,
    };

    const history = await TutorMessage.find({ user: req.user._id }).sort({ createdAt: 1 }).limit(20);

    // Record user message
    await TutorMessage.create({
      user: req.user._id,
      role: 'user',
      text: message,
      userName: req.user.name,
      userEmail: req.user.email,
      department: req.user.department || 'CSE',
      liveTaskSnapshot: liveTaskContext,
    });

    // Execute full Two-Model Pipeline
    const replyResult = await tutorReply({
      history,
      message,
      studentLevel: req.user.level,
      department: req.user.department || 'CSE',
      liveTaskContext,
      userId: req.user._id,
    });

    const replyText = typeof replyResult === 'object' ? replyResult.reply : replyResult;
    const correction = typeof replyResult === 'object' ? replyResult.correction : null;
    const verification = typeof replyResult === 'object' ? replyResult.verification : null;
    const draft = typeof replyResult === 'object' ? replyResult.draft : null;
    const sources = typeof replyResult === 'object' ? replyResult.sources : [];
    const engine = typeof replyResult === 'object' ? replyResult.engine : 'Qwen3-8B + DeepSeek-R1 (Local Engine)';
    const latencyMs = typeof replyResult === 'object' ? replyResult.latencyMs : null;

    // Record assistant message with verification details
    const saved = await TutorMessage.create({
      user: req.user._id,
      role: 'assistant',
      text: replyText,
      userName: req.user.name,
      userEmail: req.user.email,
      department: req.user.department || 'CSE',
      correction,
      draft,
      verification,
      sources,
      engine,
      latencyMs,
      liveTaskSnapshot: liveTaskContext,
    });

    res.status(201).json({
      reply: saved,
      correction,
      draft,
      verification,
      sources,
      engine,
      latencyMs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
