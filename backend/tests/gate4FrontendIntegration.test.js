const request = require('supertest');
const fs = require('fs');
const path = require('path');
const createApp = require('../src/app');
const app = createApp();
const User = require('../src/models/User');
const PlacementAttempt = require('../src/models/PlacementAttempt');
const { signAccessToken } = require('../src/utils/tokens');
const { createTestUser } = require('./helpers/createUser');

describe('Gate 4: Frontend UI, Onboarding View & Lock Modal Integration', () => {
  let beginnerToken;
  let intermediateToken;
  let unonboardedToken;
  let unonboardedUser;

  beforeEach(async () => {
    await PlacementAttempt.init();
    // 1. Beginner onboarded user
    const beginnerRes = await createTestUser({
      name: 'Beginner Student',
      email: `beginner.${Date.now()}.${Math.random()}@academy.test`,
      role: 'student',
      level: 'Beginner',
      onboardingCompleted: true,
    });
    beginnerToken = beginnerRes.token;

    // 2. Intermediate onboarded user
    const intermediateRes = await createTestUser({
      name: 'Intermediate Student',
      email: `interm.${Date.now()}.${Math.random()}@academy.test`,
      role: 'student',
      level: 'Intermediate',
      onboardingCompleted: true,
    });
    intermediateToken = intermediateRes.token;

    // 3. Un-onboarded user (needs Dragon Egg Trial)
    const unonboardedRes = await createTestUser({
      name: 'Initiate Student',
      email: `initiate.${Date.now()}.${Math.random()}@academy.test`,
      role: 'student',
      level: 'Beginner',
      onboardingCompleted: false,
    });
    unonboardedUser = unonboardedRes.user;
    unonboardedToken = unonboardedRes.token;
  });

  describe('1. Static Frontend Asset Integrity', () => {
    test('serves frontend/index.html containing views-onboarding.js script tag', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('js/views-onboarding.js');
      expect(res.text).toContain('js/app.js');
      expect(res.text).toContain('js/api.js');
    });

    test('serves frontend/js/views-onboarding.js with VIEW_RENDERERS onboarding handler', async () => {
      const res = await request(app).get('/js/views-onboarding.js');
      expect(res.status).toBe(200);
      expect(res.text).toContain("VIEW_RENDERERS['onboarding']");
      expect(res.text).toContain('The Dragon Egg Trial');
      expect(res.text).toContain('Dragon Placement Trial');
      expect(res.text).toContain('Attune by Self-Selection');
      expect(res.text).toContain('Api.startPlacement');
      expect(res.text).toContain('Api.submitPlacement');
      expect(res.text).toContain('Api.selectOnboardingLevel');
      expect(res.text).toContain('DragonMascot.celebrate');
    });

    test('serves frontend/js/api.js with global 403 modal dispatchers and level endpoints', async () => {
      const res = await request(app).get('/js/api.js');
      expect(res.status).toBe(200);
      expect(res.text).toContain('ONBOARDING_REQUIRED');
      expect(res.text).toContain('LEVEL_LOCKED');
      expect(res.text).toContain('handleOnboardingRequired');
      expect(res.text).toContain('showLevelLockedModal');
      expect(res.text).toContain('getLevelConfig()');
      expect(res.text).toContain('getMyLevel()');
      expect(res.text).toContain('startPlacement()');
      expect(res.text).toContain('submitPlacement(payload)');
      expect(res.text).toContain('selectOnboardingLevel(payload)');
    });

    test('serves frontend/js/app.js with level config caching, canAccessLevel, and lock modal', async () => {
      const res = await request(app).get('/js/app.js');
      expect(res.status).toBe(200);
      expect(res.text).toContain('loadLevelConfig');
      expect(res.text).toContain('canAccessLevel');
      expect(res.text).toContain('isUserOnboarded');
      expect(res.text).toContain('showLevelLockedModal');
      expect(res.text).toContain('handleOnboardingRequired');
      expect(res.text).toContain("'onboarding'");
      expect(res.text).toContain('topbar-level-badge');
    });

    test('serves frontend/css/dragon-academy.css with Gate 4 modal and accessibility rules', async () => {
      const res = await request(app).get('/css/dragon-academy.css');
      expect(res.status).toBe(200);
      expect(res.text).toContain('.trial-hero-card');
      expect(res.text).toContain('.level-lock-modal');
      expect(res.text).toContain('@media (prefers-reduced-motion: reduce)');
      expect(res.text).toContain('@media (max-width: 640px)');
    });
  });

  describe('2. Global 403 Error Payload Contract Verification', () => {
    test('un-onboarded student triggers 403 ONBOARDING_REQUIRED for global handler routing', async () => {
      const res = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${unonboardedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ONBOARDING_REQUIRED');
      expect(res.body.message).toMatch(/onboarding/i);
    });

    test('level-locked student triggers 403 LEVEL_LOCKED with requiredLevel for lock modal', async () => {
      const res = await request(app)
        .get('/api/world-stage/stages')
        .set('Authorization', `Bearer ${beginnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('LEVEL_LOCKED');
      expect(res.body.requiredLevel).toBe('Advanced');
      expect(res.body.currentLevel).toBe('Beginner');
    });
  });

  describe('3. End-to-End Onboarding Flow Simulation (Placement & Self-Select)', () => {
    test('placement path: start -> submit -> select-level unlocks student for academy', async () => {
      // Step A: Fetch cached level config
      const cfgRes = await request(app)
        .get('/api/levels/config')
        .set('Authorization', `Bearer ${unonboardedToken}`);
      expect(cfgRes.status).toBe(200);
      expect(cfgRes.body.modules.grammar).toBe('Beginner');
      expect(cfgRes.body.modules.simulator).toBe('Intermediate');
      expect(cfgRes.body.modules['world-stage']).toBe('Advanced');

      // Step B: Start placement test
      const startRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${unonboardedToken}`)
        .send({});
      expect([200, 201]).toContain(startRes.status);
      expect(startRes.body.attemptId).toBeDefined();
      expect(Array.isArray(startRes.body.questions)).toBe(true);
      expect(startRes.body.questions.length).toBe(12);

      const attemptId = startRes.body.attemptId;
      // Answer all questions
      const answers = {};
      startRes.body.questions.forEach(q => {
        answers[q.id] = 0;
      });

      // Step C: Submit placement test
      const submitRes = await request(app)
        .post('/api/onboarding/placement/submit')
        .set('Authorization', `Bearer ${unonboardedToken}`)
        .send({ attemptId, answers });
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.recommendedLevel).toBeDefined();

      const recLevel = submitRes.body.recommendedLevel;
      const allowed = [];
      if (recLevel === 'Advanced') allowed.push('Advanced', 'Intermediate');
      else if (recLevel === 'Intermediate') allowed.push('Intermediate', 'Beginner');
      else allowed.push('Beginner');

      const chosenLevel = allowed[0];

      // Step D: Confirm level selection
      const selectRes = await request(app)
        .post('/api/onboarding/select-level')
        .set('Authorization', `Bearer ${unonboardedToken}`)
        .send({ path: 'placement', level: chosenLevel, attemptId });
      expect(selectRes.status).toBe(200);
      expect(selectRes.body.user.onboardingCompleted).toBe(true);
      expect(selectRes.body.user.level).toBe(chosenLevel);

      // Step E: Gated route is now accessible without 403 ONBOARDING_REQUIRED
      const grammarRes = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${unonboardedToken}`);
      expect(grammarRes.status).toBe(200);
    });

    test('self-select path: directly attune starting tier without placement', async () => {
      const studentRes = await createTestUser({
        name: 'Direct Initiate',
        email: `direct.${Date.now()}.${Math.random()}@academy.test`,
        role: 'student',
        level: 'Beginner',
        onboardingCompleted: false,
      });
      const token = studentRes.token;

      const selectRes = await request(app)
        .post('/api/onboarding/select-level')
        .set('Authorization', `Bearer ${token}`)
        .send({ path: 'self', level: 'Intermediate' });

      expect(selectRes.status).toBe(200);
      expect(selectRes.body.user.onboardingCompleted).toBe(true);
      expect(selectRes.body.user.level).toBe('Intermediate');

      // Now student can access Intermediate modules (e.g. read-aloud)
      const readAloudRes = await request(app)
        .get('/api/practice/attempts/me')
        .set('Authorization', `Bearer ${token}`);
      expect(readAloudRes.status).toBe(200);
    });
  });
});
