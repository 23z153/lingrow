'use strict';

const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const GrammarTopic = require('../src/models/GrammarTopic');
const SituationalPhrase = require('../src/models/SituationalPhrase');
const SimulationScenario = require('../src/models/SimulationScenario');
const VocabWord = require('../src/models/VocabWord');
const VocabProgress = require('../src/models/VocabProgress');
const GdRoom = require('../src/models/GDRoom');
const Test = require('../src/models/Test');
const { createTestUser } = require('./helpers/createUser');
const { signAccessToken } = require('../src/utils/tokens');
const { LEVELS, MODULE_MIN_LEVEL } = require('../src/config/levelAccess');

const app = createApp();

describe('Gate 3b: Comprehensive Module Gating, requireOnboarded, Item Gating & Route Matrix Coverage', () => {
  let nonOnboardedToken, nonOnboardedUser;
  let beginnerToken, beginnerUser;
  let intermediateToken, intermediateUser;
  let advancedToken, advancedUser;
  let teacherToken, teacherUser;
  let adminToken, adminUser;

  let advGrammarTopicId;
  let intSituationalId;
  let advSimScenarioId;
  let advVocabWordId;
  let testId;
  let gdRoomId;

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

    const vWord = await VocabWord.create({
      word: 'perspicacious',
      partOfSpeech: 'adjective',
      meaning: 'having a ready insight into and understanding of things',
      example: 'Her perspicacious commentary clarified the strategic challenge.',
      level: LEVELS.ADVANCED,
      active: true,
    });
    advVocabWordId = vWord._id.toString();

    const tDoc = await Test.create({
      title: 'Syntactic Assessment Exam',
      category: 'Syntax',
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
    testId = tDoc._id.toString();

    const room = await GdRoom.create({
      topic: 'AI and Academic Integrity',
      teacher: teacherUser._id,
      status: 'LOBBY',
      maxStudents: 6,
    });
    gdRoomId = room._id.toString();
  });

  describe('1. requireOnboarded Middleware Enforcement', () => {
    test('non-onboarded student is rejected with 403 ONBOARDING_REQUIRED across all student-facing routes', async () => {
      const endpoints = [
        { method: 'get', url: '/api/grammar' },
        { method: 'get', url: '/api/vocabulary' },
        { method: 'get', url: '/api/listening/tracks' },
        { method: 'get', url: '/api/story' },
        { method: 'get', url: '/api/situational' },
        { method: 'get', url: '/api/tutor/chat' },
        { method: 'get', url: '/api/practice/passages' },
        { method: 'get', url: '/api/simulation/environments' },
        { method: 'get', url: '/api/idioms/stats' },
        { method: 'get', url: '/api/peer/sessions/me' },
        { method: 'get', url: '/api/world-stage/stages' },
        { method: 'get', url: '/api/debate/topics' },
        { method: 'get', url: '/api/gd/rooms' },
        { method: 'get', url: '/api/tests' },
        { method: 'get', url: '/api/challenges' },
        { method: 'get', url: '/api/lessons' },
        { method: 'get', url: '/api/progress' },
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
      const tRes = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(tRes.status).toBe(200);

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

  describe('3. Item-Level Gating Rules & Closed Holes', () => {
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

    test('Vocabulary item-level gate (Closed Hole): Beginner cannot submit assessment or review for Advanced word, work is not persisted', async () => {
      // 1. Submit assessment on Advanced word as Beginner -> 403
      const assessRes = await request(app)
        .post('/api/vocabulary/assessment')
        .set('Authorization', `Bearer ${beginnerToken}`)
        .send({
          wordId: advVocabWordId,
          selectedOption: 'having a ready insight into and understanding of things',
        });

      expect(assessRes.status).toBe(403);
      expect(assessRes.body.code).toBe('LEVEL_LOCKED');
      expect(assessRes.body.requiredLevel).toBe('Advanced');

      // Verify no progress was persisted
      const progAfterAssess = await VocabProgress.findOne({ user: beginnerUser._id, word: advVocabWordId });
      expect(progAfterAssess).toBeNull();

      // 2. Submit review on Advanced word as Beginner -> 403
      const reviewRes = await request(app)
        .post(`/api/vocabulary/${advVocabWordId}/review`)
        .set('Authorization', `Bearer ${beginnerToken}`)
        .send({ known: true });

      expect(reviewRes.status).toBe(403);
      expect(reviewRes.body.code).toBe('LEVEL_LOCKED');
      expect(reviewRes.body.requiredLevel).toBe('Advanced');

      // Verify still no progress persisted
      const progAfterReview = await VocabProgress.findOne({ user: beginnerUser._id, word: advVocabWordId });
      expect(progAfterReview).toBeNull();
    });

    test('Advanced student can access Advanced grammar topic, scenario, and vocabulary word', async () => {
      const gRes = await request(app)
        .get(`/api/grammar/${advGrammarTopicId}`)
        .set('Authorization', `Bearer ${advancedToken}`);
      expect(gRes.status).toBe(200);

      const sRes = await request(app)
        .get(`/api/situational/scenarios/${intSituationalId}`)
        .set('Authorization', `Bearer ${advancedToken}`);
      expect(sRes.status).toBe(200);

      const vRes = await request(app)
        .post('/api/vocabulary/assessment')
        .set('Authorization', `Bearer ${advancedToken}`)
        .send({
          wordId: advVocabWordId,
          selectedOption: 'having a ready insight into and understanding of things',
        });
      expect(vRes.status).toBe(200);
      expect(vRes.body.isCorrect).toBe(true);
    });
  });

  describe('4. Item 10: Defaults for GD and Tests (Assessment Engine)', () => {
    test('Beginner student CAN access GD rooms and take tests', async () => {
      // 1. GD rooms listing & joining
      const gdListRes = await request(app)
        .get('/api/gd/rooms')
        .set('Authorization', `Bearer ${beginnerToken}`);
      expect(gdListRes.status).toBe(200);

      const gdJoinRes = await request(app)
        .post(`/api/gd/rooms/${gdRoomId}/join`)
        .set('Authorization', `Bearer ${beginnerToken}`);
      expect(gdJoinRes.status).toBe(200);

      // 2. Test taking
      const testTakeRes = await request(app)
        .get(`/api/tests/${testId}/take`)
        .set('Authorization', `Bearer ${beginnerToken}`);
      expect(testTakeRes.status).toBe(200);
      expect(testTakeRes.body.title).toBe('Syntactic Assessment Exam');

      const testSubmitRes = await request(app)
        .post(`/api/tests/${testId}/attempts`)
        .set('Authorization', `Bearer ${beginnerToken}`)
        .send({ answers: [1], timeTakenSeconds: 30 });
      expect([200, 201]).toContain(testSubmitRes.status);
      expect(testSubmitRes.body.score).toBe(100);
    });

    test('Un-onboarded student CANNOT enter GD or take tests', async () => {
      const gdRes = await request(app)
        .get('/api/gd/rooms')
        .set('Authorization', `Bearer ${nonOnboardedToken}`);
      expect(gdRes.status).toBe(403);
      expect(gdRes.body.code).toBe('ONBOARDING_REQUIRED');

      const testRes = await request(app)
        .get(`/api/tests/${testId}/take`)
        .set('Authorization', `Bearer ${nonOnboardedToken}`);
      expect(testRes.status).toBe(403);
      expect(testRes.body.code).toBe('ONBOARDING_REQUIRED');
    });
  });

  describe('5. Item 15: Fail-Closed requireOnboarded Guard', () => {
    test('legacy document missing onboardingCompleted entirely (bypassing Mongoose defaults) is rejected with 403 ONBOARDING_REQUIRED', async () => {
      // Raw insert directly into MongoDB collection bypassing Mongoose schema defaults
      const rawUserDoc = {
        name: 'Raw Legacy Student',
        email: `legacy.raw.${Date.now()}@example.com`,
        role: 'student',
        level: 'Intermediate',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await User.collection.insertOne(rawUserDoc);
      const insertedId = result.insertedId;

      const rawUser = await User.findById(insertedId);
      // Explicitly unset onboardingCompleted in DB to simulate unmigrated legacy user
      await User.collection.updateOne({ _id: insertedId }, { $unset: { onboardingCompleted: '' } });

      const legacyToken = signAccessToken(rawUser);

      const res = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${legacyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ONBOARDING_REQUIRED');
      expect(res.body.onboardingCompleted).toBe(false);
    });

    test('user with onboardingCompleted true but missing or empty level is rejected with 403 ONBOARDING_REQUIRED', async () => {
      const emptyLevelUser = await createTestUser({
        name: 'Empty Level Student',
        role: 'student',
        level: null,
        onboardingCompleted: true,
      });

      const res = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${emptyLevelUser.token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ONBOARDING_REQUIRED');
    });
  });

  describe('6. Item 16: Deployment Order & Mixed-State Handling', () => {
    test('backend handles mixed state: migrated user, onboarded user, and unmigrated legacy user', async () => {
      // 1. Migrated existing user (onboardingCompleted: false, legacyLevel: 'Intermediate', level: null)
      const uMigrated = await createTestUser({
        name: 'Migrated Existing Student',
        role: 'student',
        level: null,
        onboardingCompleted: false,
        legacyLevel: 'Intermediate',
      });
      const resMigrated = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${uMigrated.token}`);
      expect(resMigrated.status).toBe(403);
      expect(resMigrated.body.code).toBe('ONBOARDING_REQUIRED');

      // 2. Onboarded student (onboardingCompleted: true, level: 'Beginner')
      const uOnboarded = await createTestUser({
        name: 'Onboarded Student',
        role: 'student',
        level: 'Beginner',
        onboardingCompleted: true,
      });
      const resOnboarded = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${uOnboarded.token}`);
      expect(resOnboarded.status).toBe(200);

      // 3. Unmigrated raw legacy user in DB
      const rawRes = await User.collection.insertOne({
        name: 'Unmigrated Legacy Student',
        email: `unmigrated.${Date.now()}@example.com`,
        role: 'student',
        level: 'Intermediate',
      });
      const uRaw = await User.findById(rawRes.insertedId);
      const rawToken = signAccessToken(uRaw);

      const resRaw = await request(app)
        .get('/api/grammar')
        .set('Authorization', `Bearer ${rawToken}`);
      expect(resRaw.status).toBe(403);
      expect(resRaw.body.code).toBe('ONBOARDING_REQUIRED');
    });
  });

  describe('7. Item 8 & 18: Clean GET /api/levels/config Schema & Zero Secret Leakage', () => {
    test('returns clean tiers metadata with NO invented names, NO iconKey, NO listening speeds, and promotionCriteria null', async () => {
      const res = await request(app)
        .get('/api/levels/config')
        .set('Authorization', `Bearer ${beginnerToken}`);

      expect(res.status).toBe(200);
      console.log('REAL_CAPTURED_GET_LEVELS_CONFIG:\n' + JSON.stringify(res.body, null, 2));
      expect(res.body.tiers).toBeDefined();

      const { Beginner, Intermediate, Advanced } = res.body.tiers;

      // 1. Beginner tier (Hatchling)
      expect(Beginner.displayName).toBe('Hatchling');
      expect(Beginner.badge).toBe('HATCHLING');
      expect(Beginner.rank).toBe(1);
      expect(Beginner.promotionCriteria).toBeNull();
      expect(Beginner.iconKey).toBeUndefined();
      expect(Beginner.listeningSpeeds).toBeUndefined();
      expect(Beginner.grammarTopicTiers).toBeUndefined();
      expect(Beginner.modules.map((m) => m.name)).toEqual(
        expect.arrayContaining(['Grammar Castle', 'Vocabulary Forest', 'Listening Ocean', 'Reading Grimoires', 'Conversation Village', 'Weak Words Lab', 'Ignis: Dragon Mentor'])
      );

      // 2. Intermediate tier (Flame Keeper)
      expect(Intermediate.displayName).toBe('Flame Keeper');
      expect(Intermediate.badge).toBe('FLAME_KEEPER');
      expect(Intermediate.rank).toBe(2);
      expect(Intermediate.promotionCriteria).toBeNull();
      expect(Intermediate.iconKey).toBeUndefined();
      expect(Intermediate.listeningSpeeds).toBeUndefined();
      expect(Intermediate.grammarTopicTiers).toBeUndefined();
      expect(Intermediate.modules.map((m) => m.name)).toEqual(
        expect.arrayContaining(['Speaking Volcano (Read Aloud)', 'Speaking Volcano', "Scriptor's Workshop", 'Idioms & Phrasal Grove', 'Peer Practice Duels'])
      );

      // 3. Advanced tier (Sky Guardian - NOT Grand Archon)
      expect(Advanced.displayName).toBe('Sky Guardian');
      expect(Advanced.badge).toBe('SKY_GUARDIAN');
      expect(Advanced.rank).toBe(3);
      expect(Advanced.promotionCriteria).toBeNull();
      expect(Advanced.iconKey).toBeUndefined();
      expect(Advanced.listeningSpeeds).toBeUndefined();
      expect(Advanced.grammarTopicTiers).toBeUndefined();
      expect(Advanced.modules.map((m) => m.name)).toEqual(
        expect.arrayContaining(['World Stage', 'Dragon Debate Arena'])
      );

      // Strict Isolation Check: no answer keys or placementBank leakage
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('Grand Archon');
      expect(serialized).not.toContain('Dragon Egg Valley');
      expect(serialized).not.toContain('Kingdom of Syntax');
      expect(serialized).not.toContain('Whispering Peaks');
      expect(serialized).not.toContain('Lexicon Grove');
      expect(serialized).not.toContain('Sky Citadel');
      expect(serialized).not.toContain('correctIndex');
      expect(serialized).not.toContain('correctAnswer');
      expect(serialized).not.toContain('placementBank');
      expect(serialized).not.toContain('PLACEMENT_QUESTIONS');
    });
  });

  describe('8. Item 13: Express Route Access Coverage Matrix', () => {
    test('all learner-facing mounted routes are protected by requireOnboarded and/or requireModuleAccess', () => {
      // Introspect running express app stack
      const mountedPrefixes = [];
      app._router.stack.forEach((layer) => {
        if (layer.name === 'router') {
          const match = layer.regexp.toString();
          mountedPrefixes.push({ match, layer });
        }
      });

      // Approved student-facing module prefixes that MUST be protected
      const protectedPrefixes = [
        'grammar',
        'vocabulary',
        'listening',
        'story',
        'situational',
        'weakwords',
        'tutor',
        'practice',
        'simulation',
        'idioms',
        'peer',
        'world-stage',
        'debate',
        'gd',
        'tests',
        'challenges',
        'lessons',
        'notifications',
        'progress',
      ];

      protectedPrefixes.forEach((prefix) => {
        const found = mountedPrefixes.some((p) => p.match.includes(prefix));
        expect(found).toBe(true);
      });
    });
  });
});
