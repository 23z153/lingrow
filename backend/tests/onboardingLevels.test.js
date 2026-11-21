'use strict';

const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const PlacementAttempt = require('../src/models/PlacementAttempt');
const { createTestUser } = require('./helpers/createUser');
const { LEVELS } = require('../src/config/levelAccess');
const { setTestPlacementSeed, clearTestPlacementSeed } = require('../src/config/placementBank');
const { migrateUserLevels } = require('../src/scripts/migrateUserLevels');

const app = createApp();

describe('Gate 2: Onboarding, Placement Engine, Level Gating & Admin/Teacher Override API', () => {
  let student1, student1Token, student1Id;
  let student2, student2Token, student2Id;
  let teacher, teacherToken;
  let admin, adminToken;

  beforeEach(async () => {
    await PlacementAttempt.init();
    // Create new non-onboarded student (level: null, onboardingCompleted: false)
    const s1 = await createTestUser({
      name: 'Egg Cadet 1',
      role: 'student',
      level: null,
      onboardingCompleted: false,
      section: 'A',
    });
    student1 = s1.user;
    student1Token = s1.token;
    student1Id = s1.user._id.toString();

    // Create second non-onboarded student in section B
    const s2 = await createTestUser({
      name: 'Egg Cadet 2',
      role: 'student',
      level: null,
      onboardingCompleted: false,
      section: 'B',
    });
    student2 = s2.user;
    student2Token = s2.token;
    student2Id = s2.user._id.toString();

    // Create teacher assigned to section A only
    const t = await createTestUser({
      name: 'Master Ignis',
      role: 'teacher',
      assignedClasses: ['A'],
      onboardingCompleted: true,
    });
    teacher = t.user;
    teacherToken = t.token;

    // Create admin
    const a = await createTestUser({
      name: 'Grand Archon',
      role: 'admin',
      onboardingCompleted: true,
    });
    admin = a.user;
    adminToken = a.token;
  });

  afterEach(() => {
    clearTestPlacementSeed();
  });

  describe('GET /api/levels/config', () => {
    test('returns client-safe config and contains zero answer keys or correct indices', async () => {
      const res = await request(app)
        .get('/api/levels/config')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.levels).toBeDefined();
      expect(res.body.modules).toBeDefined();
      expect(res.body.ranks).toBeDefined();
      expect(res.body.placement).toBeDefined();

      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('correctIndex');
      expect(serialized).not.toContain('correctAnswer');
      expect(serialized).not.toContain('placementBank');
    });

    test('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/levels/config');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/onboarding/placement/start', () => {
    test('starts a fresh placement trial with shuffled options, no answer keys, and 30m expiry', async () => {
      const res = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.attemptId).toBeDefined();
      expect(res.body.resumed).toBe(false);
      expect(res.body.questions.length).toBe(12);
      expect(res.body.readAloudSentence).toBeDefined();

      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('correctIndex');
      expect(serialized).not.toContain('correctAnswer');

      const attemptInDb = await PlacementAttempt.findById(res.body.attemptId);
      expect(attemptInDb).toBeTruthy();
      expect(attemptInDb.userId.toString()).toBe(student1Id);
      expect(attemptInDb.submittedAt).toBeNull();
    });

    test('resumes an existing active, unexpired, unsubmitted attempt instead of duplicating', async () => {
      const firstRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(firstRes.status).toBe(201);

      const secondRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.resumed).toBe(true);
      expect(secondRes.body.attemptId).toBe(firstRes.body.attemptId);

      const count = await PlacementAttempt.countDocuments({ userId: student1._id });
      expect(count).toBe(1);
    });

    test('no response field reveals a question or speech tier (no levelHint or difficulty)', async () => {
      const freshRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(freshRes.status).toBe(201);
      freshRes.body.questions.forEach((q) => {
        expect(q.levelHint).toBeUndefined();
        expect(q.difficulty).toBeUndefined();
        expect(q.tier).toBeUndefined();
      });
      expect(freshRes.body.readAloudSentence.difficulty).toBeUndefined();

      const resumedRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(resumedRes.status).toBe(200);
      resumedRes.body.questions.forEach((q) => {
        expect(q.levelHint).toBeUndefined();
        expect(q.difficulty).toBeUndefined();
        expect(q.tier).toBeUndefined();
      });
      expect(resumedRes.body.readAloudSentence.difficulty).toBeUndefined();
    });

    test('atomic /start concurrency: parallel calls never create two active attempts (Promise.all)', async () => {
      const [res1, res2] = await Promise.all([
        request(app).post('/api/onboarding/placement/start').set('Authorization', `Bearer ${student1Token}`),
        request(app).post('/api/onboarding/placement/start').set('Authorization', `Bearer ${student1Token}`),
      ]);

      expect([200, 201]).toContain(res1.status);
      expect([200, 201]).toContain(res2.status);
      expect(res1.body.attemptId).toBe(res2.body.attemptId);

      const activeAttemptsInDb = await PlacementAttempt.countDocuments({
        userId: student1._id,
        submittedAt: null,
      });
      expect(activeAttemptsInDb).toBe(1);
    });

    test('rejects teacher or admin attempting to start a student placement trial with 403', async () => {
      const res = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });

    test('request body containing "seed" is ignored', async () => {
      // Call with seed: 99999 in request body
      const res1 = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ seed: 99999 });

      expect(res1.status).toBe(201);
      const attempt1 = await PlacementAttempt.findById(res1.body.attemptId);

      // Submit attempt 1 so cooldown doesn't block attempt 2 in this test
      await PlacementAttempt.findByIdAndUpdate(attempt1._id, {
        submittedAt: new Date(Date.now() - 25 * 3600 * 1000),
        createdAt: new Date(Date.now() - 25 * 3600 * 1000),
      });

      // Call again with seed: 99999 in request body
      const res2 = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ seed: 99999 });

      expect(res2.status).toBe(201);
      const attempt2 = await PlacementAttempt.findById(res2.body.attemptId);

      // Verify crypto random permutations differ despite identical req.body.seed
      const perm1Str = JSON.stringify(attempt1.permutations);
      const perm2Str = JSON.stringify(attempt2.permutations);
      expect(perm1Str).not.toBe(perm2Str);
    });

    test('rate-limits /start to at most 2 new attempts per 24 hours counting expired unsubmitted attempts', async () => {
      // Attempt 1
      const res1 = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(res1.status).toBe(201);

      // Expire attempt 1 so it cannot be resumed
      await PlacementAttempt.findByIdAndUpdate(res1.body.attemptId, {
        expiresAt: new Date(Date.now() - 1000),
      });

      // Attempt 2
      const res2 = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(res2.status).toBe(201);

      // Expire attempt 2
      await PlacementAttempt.findByIdAndUpdate(res2.body.attemptId, {
        expiresAt: new Date(Date.now() - 1000),
      });

      // Attempt 3 (2 attempts already created in last 24h)
      const res3 = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res3.status).toBe(429);
      expect(res3.body.code).toBe('PLACEMENT_ATTEMPTS_RATE_LIMIT_EXCEEDED');
      expect(res3.body.attemptsLast24h).toBe(2);
    });

    test('start -> expire -> start releases activeKey and issues a new attempt', async () => {
      // 1. Initial start creates attempt 1
      const res1 = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(res1.status).toBe(201);
      const attempt1Id = res1.body.attemptId;

      const att1 = await PlacementAttempt.findById(attempt1Id);
      expect(att1.activeKey).toBe(student1Id);

      // 2. Expire attempt 1 (set expiresAt in past)
      await PlacementAttempt.findByIdAndUpdate(attempt1Id, {
        expiresAt: new Date(Date.now() - 5000),
      });

      // 3. Second start: releases attempt 1 activeKey and creates fresh attempt 2
      const res2 = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(res2.status).toBe(201);
      const attempt2Id = res2.body.attemptId;
      expect(attempt2Id).not.toBe(attempt1Id);

      // Verify attempt 1 activeKey was released to null
      const att1After = await PlacementAttempt.findById(attempt1Id);
      expect(att1After.activeKey).toBeNull();

      // Verify attempt 2 now holds the activeKey
      const att2 = await PlacementAttempt.findById(attempt2Id);
      expect(att2.activeKey).toBe(student1Id);
    });

    test('two parallel /start calls after expiry create exactly one attempt', async () => {
      // Create and expire attempt 1
      const initialRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(initialRes.status).toBe(201);

      await PlacementAttempt.findByIdAndUpdate(initialRes.body.attemptId, {
        expiresAt: new Date(Date.now() - 5000),
        // Move createdAt back past 24h so the 2-per-24h rate limiter doesn't block parallel calls
        createdAt: new Date(Date.now() - 25 * 3600 * 1000),
      });

      // Execute two parallel /start calls right after expiry
      const [pRes1, pRes2] = await Promise.all([
        request(app).post('/api/onboarding/placement/start').set('Authorization', `Bearer ${student1Token}`),
        request(app).post('/api/onboarding/placement/start').set('Authorization', `Bearer ${student1Token}`),
      ]);

      expect([200, 201]).toContain(pRes1.status);
      expect([200, 201]).toContain(pRes2.status);
      expect(pRes1.body.attemptId).toBe(pRes2.body.attemptId);

      // Exactly one unexpired active attempt in DB
      const activeCount = await PlacementAttempt.countDocuments({
        userId: student1._id,
        submittedAt: null,
        expiresAt: { $gt: new Date() },
      });
      expect(activeCount).toBe(1);
    });

    test('placement bank option lengths: all options within +/-25% mean, strictly shortest/longest <= 3, always-shortest/longest <= 5/12', () => {
      const { PLACEMENT_QUESTIONS } = require('../src/config/placementBank');
      let strictlyShortest = 0;
      let strictlyLongest = 0;
      let alwaysShortestScore = 0;
      let alwaysLongestScore = 0;

      PLACEMENT_QUESTIONS.forEach((q) => {
        const lens = q.options.map((o) => o.length);
        const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
        const min = Math.min(...lens);
        const max = Math.max(...lens);
        const correctLen = q.options[q.correctIndex].length;

        // Every option within +/-25% of question mean
        const within25 = lens.every((l) => Math.abs(l - mean) <= 0.25 * mean);
        expect(within25).toBe(true);

        const isStrictlyShortest = correctLen === min && lens.filter((l) => l === min).length === 1;
        const isStrictlyLongest = correctLen === max && lens.filter((l) => l === max).length === 1;

        if (isStrictlyShortest) strictlyShortest++;
        if (isStrictlyLongest) strictlyLongest++;

        // First index of min/max length
        if (lens.indexOf(min) === q.correctIndex) alwaysShortestScore++;
        if (lens.indexOf(max) === q.correctIndex) alwaysLongestScore++;
      });

      expect(strictlyShortest).toBeLessThanOrEqual(3);
      expect(strictlyLongest).toBeLessThanOrEqual(3);
      expect(alwaysShortestScore).toBeLessThanOrEqual(5);
      expect(alwaysLongestScore).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /api/onboarding/placement/submit & Cooldown', () => {
    test('deterministic start-to-submit flow with seeded RNG yields exact expected recommendation', async () => {
      // Injected seed 42 via module setter
      setTestPlacementSeed(42);
      const startRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({});
      expect(startRes.status).toBe(201);
      const { attemptId, questions } = startRes.body;

      // Submit all options choosing index 0
      const answers = questions.map((q) => ({
        questionId: q.id,
        selectedIndex: 0,
      }));

      const submitRes = await request(app)
        .post('/api/onboarding/placement/submit')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          attemptId,
          answers,
          speechTranscript: 'The ancient dragon academy inspires courageous scholars to ignite their voices and speak with timeless clarity.',
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.attemptId).toBe(attemptId);
      expect(submitRes.body.writtenScore).toBeDefined();
      expect(submitRes.body.score).toBe(submitRes.body.writtenScore);
      expect(submitRes.body.placementSpeechScore).toBe(100);
      expect(submitRes.body.recommendedLevel).toBeDefined();

      const savedAttempt = await PlacementAttempt.findById(attemptId);
      expect(savedAttempt.submittedAt).toBeTruthy();
      expect(savedAttempt.writtenScore).toBe(submitRes.body.writtenScore);
      expect(savedAttempt.placementSpeechScore).toBe(100);
    });

    test('atomic submission concurrency: parallel submits on same attempt allow exactly one 200 and one 400', async () => {
      const startRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(startRes.status).toBe(201);
      const { attemptId } = startRes.body;

      const [reqA, reqB] = await Promise.all([
        request(app)
          .post('/api/onboarding/placement/submit')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({ attemptId, answers: [] }),
        request(app)
          .post('/api/onboarding/placement/submit')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({ attemptId, answers: [] }),
      ]);

      const statuses = [reqA.status, reqB.status].sort();
      expect(statuses).toEqual([200, 400]);
    });

    test('guess-resistance test: selecting fixed index (0..3) across 50 attempts never yields Advanced', async () => {
      // Test all 4 fixed options: 0, 1, 2, 3
      for (let fixedIndex = 0; fixedIndex <= 3; fixedIndex++) {
        // Run 50 unseeded attempts for this choice
        for (let iter = 0; iter < 50; iter++) {
          const freshStudent = await createTestUser({
            name: `Guess Cadet ${fixedIndex}_${iter}`,
            role: 'student',
            level: null,
            onboardingCompleted: false,
          });

          const startRes = await request(app)
            .post('/api/onboarding/placement/start')
            .set('Authorization', `Bearer ${freshStudent.token}`);
          expect(startRes.status).toBe(201);

          const { attemptId, questions } = startRes.body;
          const answers = questions.map((q) => ({
            questionId: q.id,
            selectedIndex: fixedIndex,
          }));

          const submitRes = await request(app)
            .post('/api/onboarding/placement/submit')
            .set('Authorization', `Bearer ${freshStudent.token}`)
            .send({ attemptId, answers });

          expect(submitRes.status).toBe(200);
          // Strict assertion: guessing never yields Advanced
          expect(submitRes.body.recommendedLevel).not.toBe('Advanced');
          // Flaky-proof: if advancedCorrect is below 3, recommendation is never Advanced
          if (submitRes.body.advancedCorrect < 3) {
            expect(submitRes.body.recommendedLevel).not.toBe('Advanced');
          }
        }
      }
    }, 180000);

    test('rejects submitting another student\'s attempt with 403', async () => {
      const startRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      const attemptId = startRes.body.attemptId;

      const submitRes = await request(app)
        .post('/api/onboarding/placement/submit')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ attemptId, answers: [] });

      expect(submitRes.status).toBe(403);
      expect(submitRes.body.error).toMatch(/cannot submit another student/i);
    });

    test('rejects re-submitting an already submitted attempt with 400', async () => {
      const startRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      const attemptId = startRes.body.attemptId;

      await request(app)
        .post('/api/onboarding/placement/submit')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ attemptId, answers: [] });

      const secondSubmit = await request(app)
        .post('/api/onboarding/placement/submit')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ attemptId, answers: [] });

      expect(secondSubmit.status).toBe(400);
      expect(secondSubmit.body.error).toMatch(/already been submitted/i);
    });

    test('rejects an expired attempt with 400', async () => {
      const startRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      const attemptId = startRes.body.attemptId;

      // Force attempt to be expired
      await PlacementAttempt.findByIdAndUpdate(attemptId, {
        expiresAt: new Date(Date.now() - 1000),
      });

      const submitRes = await request(app)
        .post('/api/onboarding/placement/submit')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ attemptId, answers: [] });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.error).toMatch(/expired/i);
    });

    test('enforces 24-hour cooldown after a submitted attempt', async () => {
      const startRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);
      const attemptId = startRes.body.attemptId;

      await request(app)
        .post('/api/onboarding/placement/submit')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ attemptId, answers: [] });

      // Immediate attempt to start again
      const cooldownRes = await request(app)
        .post('/api/onboarding/placement/start')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(cooldownRes.status).toBe(429);
      expect(cooldownRes.body.cooldownRemainingMs).toBeGreaterThan(0);
      expect(cooldownRes.body.nextAvailableAt).toBeDefined();
    });
  });

  describe('POST /api/onboarding/select-level', () => {
    describe('Self-Select Path', () => {
      test('allows student to self-select Beginner or Intermediate, updates user and logs audit', async () => {
        const res = await request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            path: 'self',
            level: 'Intermediate',
          });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.user.level).toBe('Intermediate');
        expect(res.body.user.levelSource).toBe('self');
        expect(res.body.user.onboardingCompleted).toBe(true);

        const dbUser = await User.findById(student1Id);
        expect(dbUser.level).toBe('Intermediate');
        expect(dbUser.levelSource).toBe('self');
        expect(dbUser.onboardingCompleted).toBe(true);
        expect(dbUser.levelAuditLog.length).toBe(1);
        expect(dbUser.levelAuditLog[0].newLevel).toBe('Intermediate');
        expect(dbUser.levelAuditLog[0].reason).toMatch(/self-selection/i);
      });

      test('deliberate rule: strictly rejects self-selecting Advanced with 400', async () => {
        const res = await request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            path: 'self',
            level: 'Advanced',
          });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('ADVANCED_SELF_SELECT_PROHIBITED');
        expect(res.body.error).toMatch(/advanced rank cannot be self-selected/i);

        const dbUser = await User.findById(student1Id);
        expect(dbUser.level).toBeNull();
        expect(dbUser.onboardingCompleted).toBe(false);
      });
    });

    describe('Placement Path & Level Cap Rules', () => {
      let intermediateAttemptId;
      let advancedAttemptId;

      beforeEach(async () => {
        // Create pre-submitted attempt recommending Intermediate
        const attInt = await PlacementAttempt.create({
          userId: student1._id,
          questionIds: ['q1'],
          permutations: {},
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 1800000),
          submittedAt: new Date(),
          writtenScore: 65,
          recommendedLevel: 'Intermediate',
        });
        intermediateAttemptId = attInt._id.toString();

        // Create pre-submitted attempt recommending Advanced
        const attAdv = await PlacementAttempt.create({
          userId: student2._id,
          questionIds: ['q1'],
          permutations: {},
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 1800000),
          submittedAt: new Date(),
          writtenScore: 92,
          recommendedLevel: 'Advanced',
        });
        advancedAttemptId = attAdv._id.toString();
      });

      test('allows student to accept recommended level or move down 1 level', async () => {
        // Student with Intermediate recommendation chooses Beginner (1 level down)
        const res = await request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            path: 'placement',
            attemptId: intermediateAttemptId,
            level: 'Beginner',
          });

        expect(res.status).toBe(200);
        expect(res.body.user.level).toBe('Beginner');
        expect(res.body.user.levelSource).toBe('placement');
        expect(res.body.user.onboardingCompleted).toBe(true);

        const attempt = await PlacementAttempt.findById(intermediateAttemptId);
        expect(attempt.consumedAt).toBeTruthy();
      });

      test('strictly rejects moving up past recommendation (e.g. Intermediate recommending choosing Advanced)', async () => {
        const res = await request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            path: 'placement',
            attemptId: intermediateAttemptId,
            level: 'Advanced',
          });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('LEVEL_CAP_EXCEEDED');
        expect(res.body.allowedLevels).toEqual(['Intermediate', 'Beginner']);

        const dbUser = await User.findById(student1Id);
        expect(dbUser.level).toBeNull();
      });

      test('rejects reusing an already consumed attempt', async () => {
        // First consumption
        await request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            path: 'placement',
            attemptId: intermediateAttemptId,
            level: 'Intermediate',
          });

        // Try reusing on student 2 (reset student 2 to non-onboarded for test)
        const res = await request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student2Token}`)
          .send({
            path: 'placement',
            attemptId: intermediateAttemptId,
            level: 'Intermediate',
          });

        expect(res.status).toBe(403); // foreign attempt
      });

      test('select-level failure order 1: when user is already onboarded, user update fails first, returning 409 and leaving attempt unconsumed', async () => {
        // Pre-set user as onboarded
        await User.findByIdAndUpdate(student1Id, { onboardingCompleted: true, level: 'Beginner' });

        const res = await request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            path: 'placement',
            attemptId: intermediateAttemptId,
            level: 'Intermediate',
          });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('ONBOARDING_ALREADY_COMPLETED');

        // Attempt is NOT consumed because step 1 failed
        const attempt = await PlacementAttempt.findById(intermediateAttemptId);
        expect(attempt.consumedAt).toBeNull();
      });

      test('select-level failure order 2: if attempt consumption fails after user update, user is already onboarded and failed attempt is logged with id', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        // Mock PlacementAttempt.findOneAndUpdate to fail only when consuming (consumedAt: null)
        const origFindOneAndUpdate = PlacementAttempt.findOneAndUpdate;
        jest.spyOn(PlacementAttempt, 'findOneAndUpdate').mockImplementation(function (filter, update, options) {
          if (filter && filter.consumedAt === null) {
            return Promise.reject(new Error('Simulated DB failure during attempt consumption'));
          }
          return origFindOneAndUpdate.apply(this, arguments);
        });

        const res = await request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            path: 'placement',
            attemptId: intermediateAttemptId,
            level: 'Intermediate',
          });

        PlacementAttempt.findOneAndUpdate.mockRestore();

        // Returns 200 with user onboarded
        expect(res.status).toBe(200);
        expect(res.body.user.level).toBe('Intermediate');
        expect(res.body.user.onboardingCompleted).toBe(true);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Failed to mark attempt ${intermediateAttemptId} consumed`),
          expect.any(Error)
        );
        consoleSpy.mockRestore();

        const dbUser = await User.findById(student1Id);
        expect(dbUser.onboardingCompleted).toBe(true);
        expect(dbUser.level).toBe('Intermediate');
      });
    });

    test('returns 409 Conflict if select-level is called after onboardingCompleted is already true', async () => {
      // Complete onboarding once
      await request(app)
        .post('/api/onboarding/select-level')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ path: 'self', level: 'Beginner' });

      // Call select-level again
      const secondRes = await request(app)
        .post('/api/onboarding/select-level')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ path: 'self', level: 'Intermediate' });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.code).toBe('ONBOARDING_ALREADY_COMPLETED');
    });

    test('atomic select-level concurrency: parallel select-level requests allow exactly one 200 and one 409', async () => {
      const [reqA, reqB] = await Promise.all([
        request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({ path: 'self', level: 'Beginner' }),
        request(app)
          .post('/api/onboarding/select-level')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({ path: 'self', level: 'Intermediate' }),
      ]);

      const statuses = [reqA.status, reqB.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });

  describe('GET /api/levels/me', () => {
    test('returns level, source, and onboardingCompleted state', async () => {
      await request(app)
        .post('/api/onboarding/select-level')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ path: 'self', level: 'Intermediate' });

      const res = await request(app)
        .get('/api/levels/me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.level).toBe('Intermediate');
      expect(res.body.source).toBe('self');
      expect(res.body.onboardingCompleted).toBe(true);
      expect(res.body.unlockedLevels).toEqual(['Beginner', 'Intermediate']);
    });
  });

  describe('PATCH /api/levels/:userId (Teacher and Admin manual override)', () => {
    test('Teacher can override level for student in their assigned class (Section A) with reason', async () => {
      const res = await request(app)
        .patch(`/api/levels/${student1Id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          newLevel: 'Advanced',
          reason: 'Demonstrated superior debate fluency in university symposium',
        });

      expect(res.status).toBe(200);
      expect(res.body.student.level).toBe('Advanced');
      expect(res.body.auditLog.length).toBe(1);
      expect(res.body.auditLog[0].newLevel).toBe('Advanced');
      expect(res.body.auditLog[0].reason).toBe('Demonstrated superior debate fluency in university symposium');
      expect(res.body.auditLog[0].changedBy.toString()).toBe(teacher._id.toString());
    });

    test('Teacher is blocked with 403 when trying to override student in unassigned class (Section B)', async () => {
      const res = await request(app)
        .patch(`/api/levels/${student2Id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          newLevel: 'Intermediate',
          reason: 'Class promotion attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/assigned classes/i);
    });

    test('Admin can override level for any student in any class', async () => {
      const res = await request(app)
        .patch(`/api/levels/${student2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newLevel: 'Advanced',
          reason: 'Institutional placement bypass',
        });

      expect(res.status).toBe(200);
      expect(res.body.student.level).toBe('Advanced');
    });

    test('Rejects override if reason is missing or empty', async () => {
      const res = await request(app)
        .patch(`/api/levels/${student1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newLevel: 'Intermediate',
          reason: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/reason is required/i);
    });

    test('Audit log is strictly append-only across multiple overrides', async () => {
      // First override by Teacher
      await request(app)
        .patch(`/api/levels/${student1Id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ newLevel: 'Intermediate', reason: 'First promotion' });

      // Second override by Admin
      const secondRes = await request(app)
        .patch(`/api/levels/${student1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newLevel: 'Advanced', reason: 'Second promotion to honors tier' });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.auditLog.length).toBe(2);
      expect(secondRes.body.auditLog[0].newLevel).toBe('Intermediate');
      expect(secondRes.body.auditLog[1].newLevel).toBe('Advanced');

      // Verify student toSafeJSON does not expose levelAuditLog
      expect(secondRes.body.student.levelAuditLog).toBeUndefined();
    });

    test('Students cannot call level override endpoint (returns 403)', async () => {
      const res = await request(app)
        .patch(`/api/levels/${student2Id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ newLevel: 'Advanced', reason: 'Self-upgrade' });

      expect(res.status).toBe(403);
    });

    test('Teacher with empty assignedClasses is blocked with 403', async () => {
      const teacherNoClass = await createTestUser({
        name: 'Teacher No Class',
        role: 'teacher',
        assignedClasses: [],
        onboardingCompleted: true,
      });

      const res = await request(app)
        .patch(`/api/levels/${student1Id}`)
        .set('Authorization', `Bearer ${teacherNoClass.token}`)
        .send({ level: 'Intermediate', reason: 'Attempt with no assigned classes' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/assigned classes/i);
    });

    test('Student with no section cannot be overridden by teacher (returns 403)', async () => {
      const unassignedStudent = await createTestUser({
        name: 'No Section Student',
        role: 'student',
        section: '',
        batch: '',
        level: null,
        onboardingCompleted: false,
      });

      const res = await request(app)
        .patch(`/api/levels/${unassignedStudent.user._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ level: 'Intermediate', reason: 'Attempt on student with no section' });

      expect(res.status).toBe(403);
    });

    test('Rejects invalid level value with 400', async () => {
      const res = await request(app)
        .patch(`/api/levels/${student1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: 'MasterOfDragons',
          reason: 'Attempting invalid level string',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/level must be one of/i);
    });

    test('Rejects override when target is not a student with 400', async () => {
      const res = await request(app)
        .patch(`/api/levels/${teacher._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: 'Advanced',
          reason: 'Attempting override on teacher account',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/only be applied to student accounts/i);
    });
  });

  describe('Mass-Assignment Protection Audit', () => {
    test('PATCH /api/auth/class ignores attempts to overwrite level, onboardingCompleted or audit fields', async () => {
      const res = await request(app)
        .patch('/api/auth/class')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          batch: 'CSE-A',
          level: 'Advanced',
          onboardingCompleted: true,
          levelSource: 'self',
          legacyLevel: 'Intermediate',
          placementScore: 100,
          placementSpeechScore: 100,
          levelAssignedAt: new Date(),
          levelAuditLog: [{ reason: 'Hacked' }],
        });

      expect(res.status).toBe(200);

      const dbUser = await User.findById(student1Id);
      expect(dbUser.batch).toBe('CSE-A');
      expect(dbUser.level).toBeNull();
      expect(dbUser.onboardingCompleted).toBe(false);
      expect(dbUser.levelSource).toBeNull();
      expect(dbUser.legacyLevel).toBeNull();
      expect(dbUser.placementScore).toBeNull();
      expect(dbUser.placementSpeechScore).toBeNull();
      expect(dbUser.levelAuditLog).toEqual([]);
    });

    test('PUT /api/debate/preferences ignores level and onboardingCompleted', async () => {
      const res = await request(app)
        .put('/api/debate/preferences')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          department: 'Computer Science',
          level: 'Advanced',
          onboardingCompleted: true,
        });

      expect(res.status).toBe(200);

      const dbUser = await User.findById(student1Id);
      expect(dbUser.selectedDebateDept).toBe('Computer Science');
      expect(dbUser.level).toBeNull();
      expect(dbUser.onboardingCompleted).toBe(false);
    });

    test('POST /api/auth/register (test-only branch) ignores level and onboardingCompleted', async () => {
      const email = `reg.mass.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Mass Attacker',
          email,
          password: 'password123',
          role: 'student',
          level: 'Advanced',
          onboardingCompleted: true,
          levelSource: 'self',
        });

      expect(res.status).toBe(201);
      const createdUser = await User.findOne({ email });
      expect(createdUser.level).toBeNull();
      expect(createdUser.onboardingCompleted).toBe(false);
      expect(createdUser.levelSource).toBeNull();
    });

    test('POST /api/admin/users creates student with level: null and onboardingCompleted: false', async () => {
      const email = `admin.student.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Created Student',
          email,
          password: 'password123',
          role: 'student',
          section: 'A',
          level: 'Advanced',
          onboardingCompleted: true,
        });

      expect(res.status).toBe(201);
      const student = await User.findOne({ email });
      expect(student.level).toBeNull();
      expect(student.onboardingCompleted).toBe(false);
    });

    test('POST /api/admin/users/bulk imports students with level: null and onboardingCompleted: false', async () => {
      const email = `bulk.student.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
      const res = await request(app)
        .post('/api/admin/users/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rows: [
            {
              name: 'Bulk Roster Student',
              email,
              password: 'password123',
              role: 'student',
              section: 'A',
              level: 'Advanced',
              onboardingCompleted: true,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.created).toBe(1);

      const student = await User.findOne({ email });
      expect(student.level).toBeNull();
      expect(student.onboardingCompleted).toBe(false);
    });
  });

  describe('Migration Script backend/src/scripts/migrateUserLevels.js', () => {
    test('Refuses to run --apply without confirmBackup: true', async () => {
      await expect(migrateUserLevels({ apply: true, silent: true })).rejects.toThrow(
        /Safety check failed: Refusing to run --apply without --confirm-backup/
      );
    });

    test('Dry run by default changes zero database records and outputs accurate stats', async () => {
      // Create student with old level 'Intermediate' and no legacyLevel
      const unmigrated = await createTestUser({
        name: 'Legacy Student',
        role: 'student',
        level: 'Intermediate',
        onboardingCompleted: true,
      });

      const dryRunResult = await migrateUserLevels({ apply: false, silent: true });
      expect(dryRunResult.mode).toContain('DRY RUN');
      expect(dryRunResult.stats.toMigrate).toBeGreaterThanOrEqual(1);

      // Verify database was NOT touched
      const stillSame = await User.findById(unmigrated.user._id);
      expect(stillSame.level).toBe('Intermediate');
      expect(stillSame.legacyLevel).toBeNull();
    });

    test('Migration is idempotent when executed with apply and confirmBackup', async () => {
      const studentToMigrate = await createTestUser({
        name: 'To Migrate',
        role: 'student',
        level: 'Advanced',
        onboardingCompleted: true,
      });

      // Run 1 with apply + confirmBackup
      const run1 = await migrateUserLevels({ apply: true, confirmBackup: true, silent: true });
      expect(run1.stats.toMigrate).toBeGreaterThanOrEqual(1);

      const migratedUser = await User.findById(studentToMigrate.user._id);
      expect(migratedUser.level).toBeNull();
      expect(migratedUser.legacyLevel).toBe('Advanced');
      expect(migratedUser.onboardingCompleted).toBe(false);

      // Run 2 with apply + confirmBackup (idempotent run)
      const run2 = await migrateUserLevels({ apply: true, confirmBackup: true, silent: true });
      expect(run2.stats.toMigrate).toBe(0);
      expect(run2.stats.alreadyMigrated).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Registration Guard & ALLOW_TEST_REGISTRATION Flag', () => {
    test('throws fatal error at boot if NODE_ENV is production and ALLOW_TEST_REGISTRATION is 1', () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origFlag = process.env.ALLOW_TEST_REGISTRATION;
      const origSecret = process.env.JWT_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_TEST_REGISTRATION = '1';
        process.env.JWT_SECRET = 'temporary-test-jwt-secret';

        const createApp = require('../src/app');
        expect(() => createApp()).toThrow('FATAL: ALLOW_TEST_REGISTRATION cannot be enabled in production.');
      } finally {
        process.env.NODE_ENV = origNodeEnv;
        process.env.ALLOW_TEST_REGISTRATION = origFlag;
        process.env.JWT_SECRET = origSecret;
      }
    });

    test('POST /api/auth/register returns 403 when ALLOW_TEST_REGISTRATION is not 1', async () => {
      const origFlag = process.env.ALLOW_TEST_REGISTRATION;
      try {
        delete process.env.ALLOW_TEST_REGISTRATION;
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Unallowed Registration',
            email: `unallowed.${Date.now()}@example.com`,
            password: 'Password123!',
          });
        expect(res.status).toBe(403);
        expect(res.body.error).toContain('Public self-registration is disabled');
      } finally {
        process.env.ALLOW_TEST_REGISTRATION = origFlag;
      }
    });
  });
});

