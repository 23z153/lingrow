'use strict';

const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const GrammarTopic = require('../src/models/GrammarTopic');
const SituationalPhrase = require('../src/models/SituationalPhrase');
const SimulationScenario = require('../src/models/SimulationScenario');
const Test = require('../src/models/Test');
const { createTestUser } = require('./helpers/createUser');
const { LEVELS } = require('../src/config/levelAccess');

const app = createApp();

describe('Gate 3b: Comprehensive Module Gating, requireOnboarded, and Extended Config', () => {
  let nonOnboardedToken, nonOnboardedUser;
  let beginnerToken, beginnerUser;
  let intermediateToken, intermediateUser;
  let advancedToken, advancedUser;
  let teacherToken, teacherUser;
  let adminToken, adminUser;

  let advGrammarTopicId;
  let intSituationalId;
  let advSimScenarioId;
  let advTestId;

  beforeEach(async () => {
    // 1. Non-onboarded student
    const s0 = await createTestUser({
      name: 'Unonboarded Student',
      role: 'student',
      level: null,
      onboardingCompleted: false,
    });
    nonOnboardedToken = s0.token;
    nonOnboardedUser = s0.user;

    // 2. Beginner student
    const s1 = await createTestUser({
      name: 'Beginner Student',
      role: 'student',
      level: LEVELS.BEGINNER,
      onboardingCompleted: true,
    });
    beginnerToken = s1.token;
    beginnerUser = s1.user;

    // 3. Intermediate student
    const s2 = await createTestUser({
      name: 'Intermediate Student',
      role: 'student',
      level: LEVELS.INTERMEDIATE,
      onboardingCompleted: true,
    });
    intermediateToken = s2.token;
    intermediateUser = s2.user;

    // 4. Advanced student
    const s3 = await createTestUser({
      name: 'Advanced Student',
      role: 'student',
      level: LEVELS.ADVANCED,
      onboardingCompleted: true,
    });
    advancedToken = s3.token;
    advancedUser = s3.user;

    // 5. Teacher
    const t = await createTestUser({
      name: 'Master Teacher',
      role: 'teacher',
      assignedClasses: ['A'],
      onboardingCompleted: true,
    });
    teacherToken = t.token;
    teacherUser = t.user;

    // 6. Admin
    const a = await createTestUser({
      name: 'Grand Admin',
      role: 'admin',
      onboardingCompleted: true,
    });
    adminToken = a.token;
    adminUser = a.user;

    // Seed test items
    const gTopic = await GrammarTopic.create({
      topicId: 901,
      title: 'Advanced Passive Voice Mastery',
      level: LEVELS.ADVANCED,
      category: 'passive-voice',
      explanation: 'In-depth passive structures.',
      questions: [
        {
          question: 'The monument _____ by ancient architects.',
          options: ['built', 'was built', 'has building', 'building'],
          correctAnswer: 1,
          explanation: 'Past passive structure.',
        },
      ],
    });
    advGrammarTopicId = gTopic._id.toString();

    const sit = await SituationalPhrase.create({
      title: 'Negotiating Project Deadlines',
      category: 'Professional & Jobs',
      level: LEVELS.INTERMEDIATE,
      situationContext: 'You need to ask your manager for an extension on a major deliverable.',
      phrases: [{ speaker: 'Employee', englishText: 'Could we revisit the timeline?', explanation: 'Politely requesting more time.' }],
      interactivePrompts: [
        {
          prompt: 'What is the most professional way to ask for an extension?',
          options: ['I refuse to do this', 'Could we revisit the timeline?', 'Do it yourself', 'Forget it'],
          correctAnswer: 1,
          explanation: 'Polite and professional phrasing.',
        },
      ],
    });
    intSituationalId = sit._id.toString();

    const sim = await SimulationScenario.create({
      scenarioId: 'adv-crisis-boardroom',
      title: 'Crisis Boardroom Negotiation',
      description: 'Negotiate high-stakes corporate turnaround with board members.',
      level: LEVELS.ADVANCED,
      environment: 'negotiation',
      initialPrompt: 'Welcome to the emergency board meeting. The press has leaked confidential projections.',
      systemPrompt: 'You are Marcus Sterling, analytical CEO. Evaluate user communication style.',
      characters: [
        {
          characterId: 'ceo-marcus',
          name: 'Marcus Sterling',
          role: 'CEO',
          personality: 'Demanding and analytical',
          communicationStyle: 'Direct and assertive',
        },
      ],
    });
    advSimScenarioId = sim.scenarioId;

    const tDoc = await Test.create({
      title: 'Advanced Syntactic Assessment',
      category: 'Advanced Syntax',
      level: LEVELS.ADVANCED,
      targetType: 'ALL',
      status: 'published',
      createdBy: teacherUser._id,
      createdByRole: 'teacher',
      questions: [
        {
          question: 'Under no circumstances _____ the building without authorization.',
          options: ['you should enter', 'should you enter', 'you enter', 'entering'],
          correctAnswer: 1,
          explanation: 'Negative inversion requires auxiliary before subject.',
        },
      ],
    });
    advTestId = tDoc._id.toString();
  });

  describe('1. requireOnboarded Middleware Enforcement', () => {
    test('non-onboarded student is rejected with 403 ONBOARDING_REQUIRED across all student-facing routes', async () => {
      const endpoints = [
        { method: 'get', url: '/api/grammar' },
        { method: 'get', url: '/api/vocabulary' },
        { method: 'get', url: '/api/listening/clips' },
        { method: 'get', url: '/api/story/prompts' },
        { method: 'get', url: '/api/situational/scenarios' },
        { method: 'get', url: '/api/tutor/models' },
        { method: 'get', url: '/api/practice/passages' },
        { method: 'get', url: '/api/simulation/environments' },
        { method: 'get', url: '/api/idioms/stats' },
        { method: 'get', url: '/api/peer/sessions/me' },
        { method: 'get', url: '/api/world-stage/stages' },
        { method: 'get', url: '/api/debate/topics' },
        { method: 'get', url: '/api/challenges' },
        { method: 'get', url: '/api/lessons' },
        { method: 'get', url: '/api/progress/me' },
      ];

      for (const ep of endpoints) {
        const res = await request(app)
          [ep.method](ep.url)
          .set('Authorization', `Bearer ${nonOnboardedToken}`);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ONBOARDING_REQUIRED');
        expect(res.body.onboardingCompleted).toBe(false);
      }
    });

    test('teachers and admins are exempt from requireOnboarded', async () => {
      // Teacher can access modules even if onboardingCompleted was false
      const tRes = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(tRes.status).toBe(200);

      // Admin can access modules
      const aRes = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(aRes.status).toBe(200);
    });

    test('pre-onboarding routes are accessible to non-onboarded students without ONBOARDING_REQUIRED block', async () => {
      // GET /api/levels/config
      const cfgRes = await request(app)
        .get('/api/levels/config')
        .set('Authorization', `Bearer ${nonOnboardedToken}`);
      expect(cfgRes.status).toBe(200);

      // GET /api/levels/me
      const meRes = await request(app)
        .get('/api/levels/me')
        .set('Authorization', `Bearer ${nonOnboardedToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.onboardingCompleted).toBe(false);

      // POST /api/onboarding/placement/start
      const startRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${nonOnboardedToken}`);
      expect([200, 201]).toContain(startRes.status);
    });
  });

  describe('2. Cumulative Module-Level Access Gates', () => {
    test('BEGINNER student: Allowed on Beginner modules, Forbidden on Intermediate & Advanced modules', async () => {
      // Beginner modules allowed (200)
      const gRes = await request(app).get('/api/grammar').set('Authorization', `Bearer ${beginnerToken}`);
      expect(gRes.status).toBe(200);

      const vRes = await request(app).get('/api/vocabulary').set('Authorization', `Bearer ${beginnerToken}`);
      expect(vRes.status).toBe(200);

      const lRes = await request(app).get('/api/listening/clips').set('Authorization', `Bearer ${beginnerToken}`);
      expect(lRes.status).toBe(200);

      const sRes = await request(app).get('/api/story/prompts').set('Authorization', `Bearer ${beginnerToken}`);
      expect(sRes.status).toBe(200);

      // Intermediate modules locked (403)
      const simRes = await request(app).get('/api/simulation/environments').set('Authorization', `Bearer ${beginnerToken}`);
      expect(simRes.status).toBe(403);
      expect(simRes.body.code).toBe('LEVEL_LOCKED');
      expect(simRes.body.requiredLevel).toBe('Intermediate');

      const idmRes = await request(app).get('/api/idioms/stats').set('Authorization', `Bearer ${beginnerToken}`);
      expect(idmRes.status).toBe(403);
      expect(idmRes.body.code).toBe('LEVEL_LOCKED');
      expect(idmRes.body.requiredLevel).toBe('Intermediate');

      // Advanced modules locked (403)
      const wsRes = await request(app).get('/api/world-stage/stages').set('Authorization', `Bearer ${beginnerToken}`);
      expect(wsRes.status).toBe(403);
      expect(wsRes.body.code).toBe('LEVEL_LOCKED');
      expect(wsRes.body.requiredLevel).toBe('Advanced');

      const debRes = await request(app).get('/api/debate/topics').set('Authorization', `Bearer ${beginnerToken}`);
      expect(debRes.status).toBe(403);
      expect(debRes.body.code).toBe('LEVEL_LOCKED');
      expect(debRes.body.requiredLevel).toBe('Advanced');
    });

    test('INTERMEDIATE student: Allowed on Beginner & Intermediate modules, Forbidden on Advanced modules', async () => {
      // Beginner modules allowed (200)
      const gRes = await request(app).get('/api/grammar').set('Authorization', `Bearer ${intermediateToken}`);
      expect(gRes.status).toBe(200);

      // Intermediate modules allowed (200)
      const simRes = await request(app).get('/api/simulation/environments').set('Authorization', `Bearer ${intermediateToken}`);
      expect(simRes.status).toBe(200);

      const idmRes = await request(app).get('/api/idioms/stats').set('Authorization', `Bearer ${intermediateToken}`);
      expect(idmRes.status).toBe(200);

      const peerRes = await request(app).get('/api/peer/sessions/me').set('Authorization', `Bearer ${intermediateToken}`);
      expect(peerRes.status).toBe(200);

      // Advanced modules locked (403)
      const wsRes = await request(app).get('/api/world-stage/stages').set('Authorization', `Bearer ${intermediateToken}`);
      expect(wsRes.status).toBe(403);
      expect(wsRes.body.code).toBe('LEVEL_LOCKED');
      expect(wsRes.body.requiredLevel).toBe('Advanced');

      const debRes = await request(app).get('/api/debate/topics').set('Authorization', `Bearer ${intermediateToken}`);
      expect(debRes.status).toBe(403);
      expect(debRes.body.code).toBe('LEVEL_LOCKED');
      expect(debRes.body.requiredLevel).toBe('Advanced');
    });

    test('ADVANCED student: Allowed on all modules', async () => {
      const gRes = await request(app).get('/api/grammar').set('Authorization', `Bearer ${advancedToken}`);
      expect(gRes.status).toBe(200);

      const simRes = await request(app).get('/api/simulation/environments').set('Authorization', `Bearer ${advancedToken}`);
      expect(simRes.status).toBe(200);

      const wsRes = await request(app).get('/api/world-stage/stages').set('Authorization', `Bearer ${advancedToken}`);
      expect(wsRes.status).toBe(200);

      const debRes = await request(app).get('/api/debate/topics').set('Authorization', `Bearer ${advancedToken}`);
      expect(debRes.status).toBe(200);
    });

    test('Teachers and Admins bypass all module gates', async () => {
      const tRes = await request(app).get('/api/world-stage/stages').set('Authorization', `Bearer ${teacherToken}`);
      expect(tRes.status).toBe(200);

      const aRes = await request(app).get('/api/debate/topics').set('Authorization', `Bearer ${adminToken}`);
      expect(aRes.status).toBe(200);
    });
  });

  describe('3. Item-Level Gating Rules', () => {
    test('Grammar Topic item-level gate: Beginner cannot access Advanced topic', async () => {
      const res = await request(app)
        .get(`/api/grammar/${advGrammarTopicId}`)
        .set('Authorization', `Bearer ${beginnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.locked).toBe(true);
      expect(res.body.requiredLevel).toBe('Advanced');
    });

    test('Situational Phrase item-level gate: Beginner cannot access Intermediate scenario', async () => {
      const res = await request(app)
        .get(`/api/situational/scenarios/${intSituationalId}`)
        .set('Authorization', `Bearer ${beginnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.locked).toBe(true);
      expect(res.body.requiredLevel).toBe('Intermediate');
    });

    test('Test item-level gate: Beginner cannot take Advanced assessment', async () => {
      const res = await request(app)
        .get(`/api/tests/${advTestId}/take`)
        .set('Authorization', `Bearer ${beginnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.locked).toBe(true);
      expect(res.body.requiredLevel).toBe('Advanced');
    });

    test('Advanced student can access Advanced grammar topic, scenario, and assessment', async () => {
      const gRes = await request(app)
        .get(`/api/grammar/${advGrammarTopicId}`)
        .set('Authorization', `Bearer ${advancedToken}`);
      expect(gRes.status).toBe(200);

      const sRes = await request(app)
        .get(`/api/situational/scenarios/${intSituationalId}`)
        .set('Authorization', `Bearer ${advancedToken}`);
      expect(sRes.status).toBe(200);

      const tRes = await request(app)
        .get(`/api/tests/${advTestId}/take`)
        .set('Authorization', `Bearer ${advancedToken}`);
      expect(tRes.status).toBe(200);
    });
  });

  describe('4. Extended GET /api/levels/config Schema & Isolation', () => {
    test('returns full tiers metadata including display names, kingdoms, item-level rules and promotion criteria', async () => {
      const res = await request(app)
        .get('/api/levels/config')
        .set('Authorization', `Bearer ${beginnerToken}`);

      expect(res.status).toBe(200);

      // Verify tiers metadata
      expect(res.body.tiers).toBeDefined();
      const { Beginner, Intermediate, Advanced } = res.body.tiers;

      // Beginner tier
      expect(Beginner.displayName).toBe('Hatchling');
      expect(Beginner.kingdom).toBe('Dragon Egg Valley');
      expect(Beginner.iconKey).toBe('egg');
      expect(Beginner.route).toBe('#/grammar');
      expect(Beginner.badge).toBe('HATCHLING');
      expect(Beginner.itemLevelRules.cefrBands).toEqual(['A1', 'A2']);
      expect(Beginner.itemLevelRules.listeningSpeeds).toEqual(['0.75x', '1.0x']);
      expect(Beginner.itemLevelRules.grammarTopicTiers).toEqual(['Basics', 'Tenses', 'Prepositions']);
      expect(Beginner.promotionCriteria.requiredActivities).toBe(4);
      expect(Beginner.promotionCriteria.trialAvailable).toBe(true);

      // Intermediate tier
      expect(Intermediate.displayName).toBe('Flame Keeper');
      expect(Intermediate.kingdom).toBe('Ember Highlands');
      expect(Intermediate.iconKey).toBe('flame');
      expect(Intermediate.route).toBe('#/practice');
      expect(Intermediate.badge).toBe('FLAME_KEEPER');
      expect(Intermediate.itemLevelRules.cefrBands).toEqual(['B1', 'B2']);
      expect(Intermediate.itemLevelRules.listeningSpeeds).toEqual(['1.0x', '1.25x']);
      expect(Intermediate.itemLevelRules.grammarTopicTiers).toEqual(['Modals', 'Conditionals', 'Passive Voice']);
      expect(Intermediate.promotionCriteria.requiredActivities).toBe(4);
      expect(Intermediate.promotionCriteria.trialAvailable).toBe(true);

      // Advanced tier
      expect(Advanced.displayName).toBe('Grand Archon');
      expect(Advanced.kingdom).toBe('Sky Citadel');
      expect(Advanced.iconKey).toBe('crown');
      expect(Advanced.route).toBe('#/world-stage');
      expect(Advanced.badge).toBe('GRAND_ARCHON');
      expect(Advanced.itemLevelRules.cefrBands).toEqual(['C1', 'C2']);
      expect(Advanced.itemLevelRules.listeningSpeeds).toEqual(['1.0x', '1.5x']);
      expect(Advanced.itemLevelRules.grammarTopicTiers).toEqual(['Inversion', 'Subjunctive', 'Advanced Rhetoric']);
      expect(Advanced.promotionCriteria.requiredActivities).toBeNull();
      expect(Advanced.promotionCriteria.trialAvailable).toBe(false);

      // Strict Isolation: no answer keys or placementBank import
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('correctIndex');
      expect(serialized).not.toContain('correctAnswer');
      expect(serialized).not.toContain('placementBank');
      expect(serialized).not.toContain('PLACEMENT_QUESTIONS');
    });
  });
});
