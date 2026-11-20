const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

function createApp() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }

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
  // High-capacity rate limiting for stability during rapid reloads & concurrent student traffic
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500, // Generous limit allowing fast page reloads and verification checks
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.method === 'GET' && req.path === '/me' // Don't throttle session resume checks
    })
  );
  app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 1500, standardHeaders: true, legacyHeaders: false }));

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

  const { requireAuth } = require('./middleware/auth');
  const { requireOnboarded, requireModuleAccess } = require('./middleware/levelGate');

  // Pre-onboarding and authentication routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/onboarding', require('./routes/onboarding'));
  app.use('/api/levels', require('./routes/levels'));

  // Beginner Modules (requireAuth + requireOnboarded + module gating)
  app.use('/api/grammar', requireAuth, requireOnboarded, requireModuleAccess('grammar'), require('./routes/grammar'));
  app.use('/api/vocabulary', requireAuth, requireOnboarded, requireModuleAccess('vocabulary'), require('./routes/vocabulary'));
  app.use('/api/listening', requireAuth, requireOnboarded, requireModuleAccess('listening'), require('./routes/listening'));
  app.use('/api/story', requireAuth, requireOnboarded, requireModuleAccess('story'), require('./routes/story'));
  app.use('/api/situational', requireAuth, requireOnboarded, requireModuleAccess('situational'), require('./routes/situational'));
  app.use('/api/weakwords', requireAuth, requireOnboarded, requireModuleAccess('weakwords'), require('./routes/weakwords'));
  app.use('/api/tutor', requireAuth, requireOnboarded, requireModuleAccess('tutor'), require('./routes/tutor'));

  // Intermediate Modules
  app.use('/api/practice', requireAuth, requireOnboarded, require('./routes/practice'));
  app.use('/api/simulation', requireAuth, requireOnboarded, requireModuleAccess('simulator'), require('./routes/simulation'));
  app.use('/api/idioms', requireAuth, requireOnboarded, requireModuleAccess('idioms'), require('./routes/idioms'));
  app.use('/api/peer', requireAuth, requireOnboarded, requireModuleAccess('peer'), require('./routes/peer'));
  app.use('/api/gd', requireAuth, requireOnboarded, require('./routes/gd'));

  // Advanced Modules
  app.use('/api/world-stage', requireAuth, requireOnboarded, requireModuleAccess('world-stage'), require('./routes/worldStage'));
  app.use('/api/debate', require('./routes/debate'));

  // Student Utilities requiring Onboarding
  app.use('/api/challenges', requireAuth, requireOnboarded, require('./routes/challenges'));
  app.use('/api/lessons', requireAuth, requireOnboarded, require('./routes/lessons'));
  app.use('/api/notifications', requireAuth, requireOnboarded, require('./routes/notifications'));
  app.use('/api/progress', requireAuth, requireOnboarded, require('./routes/progress'));
  app.use('/api/tests', requireAuth, requireOnboarded, require('./routes/test'));

  // Teacher & Administrator Routes (Exempt from student learner gates)
  app.use('/api/teacher', require('./routes/teacher'));
  app.use('/api/admin', require('./routes/admin'));

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
