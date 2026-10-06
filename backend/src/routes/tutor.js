const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const TutorMessage = require('../models/TutorMessage');
const TutorMemory = require('../models/TutorMemory');
const ReadAloudAttempt = require('../models/ReadAloudAttempt');
const SituationalAttempt = require('../models/SituationalAttempt');
const VocabProgress = require('../models/VocabProgress');
const Document = require('../models/Document');
const { tutorReply, getLLMStatus } = require('../services/llmService');
const { scrapeLiveWebData } = require('../services/webScraperService');
const { executeWebSearch } = require('../services/webSearchService');
const { ingestDocument } = require('../services/ragService');
const { getModelConfig } = require('../services/ollamaClient');
const {
  getStudentMemories,
  addStudentMemory,
  deleteStudentMemory,
  clearStudentMemories,
  autoExtractMemory,
  formatMemoriesForPrompt,
} = require('../services/memoryService');

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

router.delete('/history', requireAuth, async (req, res) => {
  try {
    await TutorMessage.deleteMany({ user: req.user._id });
    res.json({ message: 'Conversation history cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------- AI Tutor Memory Endpoints ------------------- */
router.get('/memories', requireAuth, async (req, res) => {
  try {
    const memories = await getStudentMemories(req.user._id);
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/memories', requireAuth, async (req, res) => {
  try {
    const { fact, category } = req.body;
    if (!fact) return res.status(400).json({ error: 'fact is required' });
    const memory = await addStudentMemory({
      userId: req.user._id,
      fact,
      category: category || 'goal',
      source: 'user_added',
    });
    res.status(201).json(memory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/memories/:id', requireAuth, async (req, res) => {
  try {
    await deleteStudentMemory(req.user._id, req.params.id);
    res.json({ message: 'Memory deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/memories', requireAuth, async (req, res) => {
  try {
    await clearStudentMemories(req.user._id);
    res.json({ message: 'All memories cleared' });
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

    // Fetch latest 16 messages for true multi-turn context memory
    const recentDbMessages = await TutorMessage.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(16);
    const history = recentDbMessages.reverse();

    // Fetch long-term student memories & goals
    const memories = await getStudentMemories(req.user._id);
    const memoryContext = formatMemoriesForPrompt(memories);

    const liveTaskContext = {
      userName: req.user.name,
      userEmail: req.user.email,
      xp: req.user.xp || 0,
      level: req.user.level || 'Beginner',
      readAloudAvg,
      situationalDone,
      vocabMastered,
      memories,
      memoryContext,
    };

    // Auto-detect and record any persistent learning goals / background from message
    autoExtractMemory(req.user._id, message).catch(() => {});

    const shouldStream = req.body.stream === true || req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

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

    if (shouldStream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const onToken = (token) => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
        } catch (e) {}
      };

      const replyResult = await tutorReply({
        history,
        message,
        studentLevel: req.user.level,
        department: req.user.department || 'CSE',
        liveTaskContext,
        userId: req.user._id,
        onToken,
      });

      const replyText = typeof replyResult === 'object' ? replyResult.reply : replyResult;
      const correction = typeof replyResult === 'object' ? replyResult.correction : null;
      const verification = typeof replyResult === 'object' ? replyResult.verification : null;
      const draft = typeof replyResult === 'object' ? replyResult.draft : null;
      const sources = typeof replyResult === 'object' ? replyResult.sources : [];
      const engine = typeof replyResult === 'object' ? replyResult.engine : 'Qwen2.5-3B Local Engine';
      const latencyMs = typeof replyResult === 'object' ? replyResult.latencyMs : null;

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

      res.write(`data: ${JSON.stringify({
        type: 'done',
        reply: saved,
        replyText,
        correction,
        draft,
        verification,
        sources,
        engine,
        latencyMs,
      })}\n\n`);
      return res.end();
    }

    // Execute full Two-Model Pipeline (Non-streaming)
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
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      return res.end();
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
