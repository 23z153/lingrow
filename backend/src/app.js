const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
        // If no specific CORS_ORIGIN is set or contains wildcard, allow requesting origin (LAN IP, localhost, etc.)
        if (!allowed.length || allowed.includes('*') || allowed.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true, // required so the refresh-token cookie is sent/accepted cross-origin
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // Auth endpoints get a tighter limit — they're the most abuse-prone
  // (credential stuffing, token-guessing) and don't need 120 req/min.
  app.use(
    '/api/auth',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false })
  );
  app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

  const { getModelConfig } = require('./services/ollamaClient');
  const { executeWebSearch } = require('./services/webSearchService');
  const { answerQuestion } = require('./services/twoModelPipeline');

  app.get('/api/health', async (req, res) => {
    const config = await getModelConfig();
    res.json({
      ok: true,
      service: 'lingrow-ai-backend',
      timestamp: new Date().toISOString(),
      twoModelPipeline: {
        status: config.ollamaOnline ? 'operational' : 'in_process_fallback',
        primaryModel: config.primaryModel,
        verifierModel: config.verifierModel,
        gpu: config.gpuInfo,
        target: 'RTX 3050 Laptop GPU (6GB VRAM) Sequential Execution',
      },
    });
  });

  app.get('/api/models', async (req, res) => {
    const config = await getModelConfig();
    res.json(config);
  });

  // Section 20 Standalone Chat & Search Endpoints
  app.post('/api/chat', async (req, res) => {
    try {
      const { question, message } = req.body;
      const prompt = question || message;
      if (!prompt) return res.status(400).json({ error: 'question or message is required' });

      const result = await answerQuestion({
        question: prompt,
        userId: req.user?._id || null,
        studentProfile: req.user ? { name: req.user.name, department: req.user.department, level: req.user.level } : null,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/search', async (req, res) => {
    try {
      const { query, q } = req.body;
      const searchQ = query || q;
      if (!searchQ) return res.status(400).json({ error: 'query is required' });
      const results = await executeWebSearch(searchQ, 5);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/practice', require('./routes/practice'));
  app.use('/api/vocabulary', require('./routes/vocabulary'));
  app.use('/api/debate', require('./routes/debate'));
  app.use('/api/story', require('./routes/story'));
  app.use('/api/listening', require('./routes/listening'));
  app.use('/api/lessons', require('./routes/lessons'));
  app.use('/api/peer', require('./routes/peer'));
  app.use('/api/tutor', require('./routes/tutor'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/progress', require('./routes/progress'));
  app.use('/api/teacher', require('./routes/teacher'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/grammar', require('./routes/grammar'));
  app.use('/api/tests', require('./routes/test'));
  app.use('/api/situational', require('./routes/situational'));

  // Serve the built frontend (optional — the frontend can also be hosted separately).
  const frontendDist = path.join(__dirname, '..', '..', 'frontend');
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });

  app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test') console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
