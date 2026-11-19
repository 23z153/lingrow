'use strict';

const levelAccessConfig = require('../src/config/levelAccess');
const {
  LEVELS,
  LEVEL_RANKS,
  MODULE_MIN_LEVEL,
  getRank,
  getUnlockedLevelsForLevel,
  canAccess,
  PLACEMENT_CONFIG,
} = levelAccessConfig;

const {
  PLACEMENT_QUESTIONS,
  READ_ALOUD_SENTENCE,
  sanitizePlacementQuestion,
  levelFromScore,
  scorePlacementTest,
} = require('../src/config/placementBank');

const { requireLevel, requireModuleAccess } = require('../src/middleware/levelGate');
const User = require('../src/models/User');
const { recordActivityCompletion } = require('../src/services/progressionEngine');
const { createTestUser } = require('./helpers/createUser');

describe('Gate 1: levelAccess config and canAccess unit tests', () => {
  describe('Security and Config Isolation', () => {
    test('levelAccess.js does not export placement questions or answer keys', () => {
      expect(levelAccessConfig.PLACEMENT_QUESTIONS).toBeUndefined();
      expect(levelAccessConfig.PLACEMENT_CONFIG.questions).toBeUndefined();
      expect(levelAccessConfig.correctIndex).toBeUndefined();
      expect(levelAccessConfig.correctAnswer).toBeUndefined();

      // Deep string check to guarantee no answer keys exist in the exported config
      const serialized = JSON.stringify(levelAccessConfig);
      expect(serialized).not.toContain('correctIndex');
      expect(serialized).not.toContain('correctAnswer');
    });

    test('LEVEL_RANKS reflect Beginner (1) < Intermediate (2) < Advanced (3)', () => {
      expect(getRank(LEVELS.BEGINNER)).toBe(1);
      expect(getRank(LEVELS.INTERMEDIATE)).toBe(2);
      expect(getRank(LEVELS.ADVANCED)).toBe(3);
      expect(getRank('Unknown')).toBe(0);
      expect(getRank(null)).toBe(0);
    });

    test('getUnlockedLevelsForLevel returns cumulative unlocked array', () => {
      expect(getUnlockedLevelsForLevel(LEVELS.BEGINNER)).toEqual(['Beginner']);
      expect(getUnlockedLevelsForLevel(LEVELS.INTERMEDIATE)).toEqual(['Beginner', 'Intermediate']);
      expect(getUnlockedLevelsForLevel(LEVELS.ADVANCED)).toEqual(['Beginner', 'Intermediate', 'Advanced']);
    });
  });

  describe('canAccess(user, minLevel) cumulative access rules', () => {
    const beginnerUser = { role: 'student', level: LEVELS.BEGINNER };
    const intermediateUser = { role: 'student', level: LEVELS.INTERMEDIATE };
    const advancedUser = { role: 'student', level: LEVELS.ADVANCED };
    const teacherUser = { role: 'teacher', level: LEVELS.BEGINNER };
    const adminUser = { role: 'admin', level: null };
    const unassignedUser = { role: 'student', level: null };

    test('BEGINNER student can access Beginner content only', () => {
      expect(canAccess(beginnerUser, LEVELS.BEGINNER)).toBe(true);
      expect(canAccess(beginnerUser, LEVELS.INTERMEDIATE)).toBe(false);
      expect(canAccess(beginnerUser, LEVELS.ADVANCED)).toBe(false);
    });

    test('INTERMEDIATE student can access Beginner and Intermediate content', () => {
      expect(canAccess(intermediateUser, LEVELS.BEGINNER)).toBe(true);
      expect(canAccess(intermediateUser, LEVELS.INTERMEDIATE)).toBe(true);
      expect(canAccess(intermediateUser, LEVELS.ADVANCED)).toBe(false);
    });

    test('ADVANCED student can access all content', () => {
      expect(canAccess(advancedUser, LEVELS.BEGINNER)).toBe(true);
      expect(canAccess(advancedUser, LEVELS.INTERMEDIATE)).toBe(true);
      expect(canAccess(advancedUser, LEVELS.ADVANCED)).toBe(true);
    });

    test('Teachers and Admins bypass all learner level gates', () => {
      expect(canAccess(teacherUser, LEVELS.ADVANCED)).toBe(true);
      expect(canAccess(adminUser, LEVELS.ADVANCED)).toBe(true);
    });

    test('Unassigned student is blocked from gated content', () => {
      expect(canAccess(unassignedUser, LEVELS.BEGINNER)).toBe(false);
      expect(canAccess(unassignedUser, LEVELS.INTERMEDIATE)).toBe(false);
      expect(canAccess(unassignedUser, null)).toBe(true);
      expect(canAccess(unassignedUser, 'All Levels')).toBe(true);
    });

    test('Null or undefined user cannot access', () => {
      expect(canAccess(null, LEVELS.BEGINNER)).toBe(false);
      expect(canAccess(undefined, LEVELS.BEGINNER)).toBe(false);
    });
  });

  describe('Placement Bank and Renormalized Scoring', () => {
    test('Contains exactly 12 placement questions and 1 read-aloud sentence', () => {
      expect(PLACEMENT_QUESTIONS.length).toBe(12);
      expect(READ_ALOUD_SENTENCE).toBeDefined();
      expect(READ_ALOUD_SENTENCE.sentence).toBeTruthy();
    });

    test('sanitizePlacementQuestion strips correctIndex and correctAnswer completely', () => {
      const rawQuestion = PLACEMENT_QUESTIONS[0];
      expect(rawQuestion.correctIndex).toBeDefined();
      expect(rawQuestion.correctAnswer).toBeDefined();

      const sanitized = sanitizePlacementQuestion(rawQuestion);
      expect(sanitized.id).toBe(rawQuestion.id);
      expect(sanitized.prompt).toBe(rawQuestion.prompt);
      expect(sanitized.options).toEqual(rawQuestion.options);
      expect(sanitized.correctIndex).toBeUndefined();
      expect(sanitized.correctAnswer).toBeUndefined();
    });

    test('levelFromScore strictly maps exact boundary thresholds (40, 41, 75, 76) and enforces difficulty-aware qualification', () => {
      // 0..40 = Beginner
      expect(levelFromScore(0)).toBe(LEVELS.BEGINNER);
      expect(levelFromScore(39)).toBe(LEVELS.BEGINNER);
      expect(levelFromScore(40)).toBe(LEVELS.BEGINNER);

      // 41..75 = Intermediate
      expect(levelFromScore(41)).toBe(LEVELS.INTERMEDIATE);
      expect(levelFromScore(50)).toBe(LEVELS.INTERMEDIATE);
      expect(levelFromScore(75)).toBe(LEVELS.INTERMEDIATE);

      // >= 76 with >= 3 Advanced correct -> Advanced
      expect(levelFromScore(76, 3)).toBe(LEVELS.ADVANCED);
      expect(levelFromScore(76, 4)).toBe(LEVELS.ADVANCED);
      expect(levelFromScore(90, 3)).toBe(LEVELS.ADVANCED);
      expect(levelFromScore(100, 4)).toBe(LEVELS.ADVANCED);

      // >= 76 with < 3 Advanced correct -> capped at Intermediate
      expect(levelFromScore(76, 2)).toBe(LEVELS.INTERMEDIATE);
      expect(levelFromScore(76, 1)).toBe(LEVELS.INTERMEDIATE);
      expect(levelFromScore(76, 0)).toBe(LEVELS.INTERMEDIATE);
      expect(levelFromScore(85, 2)).toBe(LEVELS.INTERMEDIATE);
      expect(levelFromScore(100, 2)).toBe(LEVELS.INTERMEDIATE);
    });

    test('Always choosing the same option index does not reliably yield Advanced (yields <= 33% Beginner)', async () => {
      for (const chosenIndex of [0, 1, 2, 3]) {
        const answers = PLACEMENT_QUESTIONS.map((q) => ({
          questionId: q.id,
          selectedIndex: chosenIndex,
        }));
        const res = await scorePlacementTest({ answers });
        expect(res.recommendedLevel).toBe(LEVELS.BEGINNER);
        expect(res.score).toBeLessThanOrEqual(34);
      }
    });

    test('When audio is skipped (null/undefined), score is renormalized strictly on the 12 questions alone with no penalty', async () => {
      // 6 out of 12 correct = 50%
      const halfAnswers = PLACEMENT_QUESTIONS.map((q, idx) => ({
        questionId: q.id,
        selectedIndex: idx < 6 ? q.correctIndex : (q.correctIndex + 1) % 4,
      }));

      const resNoAudio = await scorePlacementTest(halfAnswers, null);
      expect(resNoAudio.speechIncluded).toBe(false);
      expect(resNoAudio.score).toBe(50);
      expect(resNoAudio.writtenScore).toBe(50);
      expect(resNoAudio.recommendedLevel).toBe(LEVELS.INTERMEDIATE);

      // 12 of 12 correct with audio skipped = 100%
      const allAnswers = PLACEMENT_QUESTIONS.map((q) => ({
        questionId: q.id,
        selectedIndex: q.correctIndex,
      }));
      const resFullNoAudio = await scorePlacementTest(allAnswers, undefined);
      expect(resFullNoAudio.speechIncluded).toBe(false);
      expect(resFullNoAudio.score).toBe(100);
      expect(resFullNoAudio.recommendedLevel).toBe(LEVELS.ADVANCED);
    });

    test('Server evaluates speech transcript via deterministic word-diff only (no LLM) and stores placementSpeechScore for display, while score & recommendedLevel derive 100% from written questions', async () => {
      const halfAnswers = PLACEMENT_QUESTIONS.map((q, idx) => ({
        questionId: q.id,
        selectedIndex: idx < 6 ? q.correctIndex : (q.correctIndex + 1) % 4,
      }));
      const resWithAudio = await scorePlacementTest({
        answers: halfAnswers,
        speechTranscript: READ_ALOUD_SENTENCE.sentence,
        speechSeconds: 6,
      });
      expect(resWithAudio.speechIncluded).toBe(true);
      expect(resWithAudio.placementSpeechScore).toBe(100);
      expect(resWithAudio.speechScore).toBe(100);
      // Overall score and recommendation are 100% written-driven (50% -> Intermediate)
      expect(resWithAudio.score).toBe(50);
      expect(resWithAudio.writtenScore).toBe(50);
      expect(resWithAudio.recommendedLevel).toBe(LEVELS.INTERMEDIATE);
    });

    test('Placement speech evaluation is deterministic and succeeds even if LLM service is offline', async () => {
      const halfAnswers = PLACEMENT_QUESTIONS.map((q, idx) => ({
        questionId: q.id,
        selectedIndex: idx < 6 ? q.correctIndex : (q.correctIndex + 1) % 4,
      }));
      // Partial transcript
      const partialSpeech = 'The ancient dragon academy inspires courageous scholars';
      const resPartial = await scorePlacementTest({
        answers: halfAnswers,
        speechTranscript: partialSpeech,
      });
      expect(resPartial.speechIncluded).toBe(true);
      expect(resPartial.placementSpeechScore).toBeGreaterThan(0);
      expect(resPartial.score).toBe(50);
      expect(resPartial.recommendedLevel).toBe(LEVELS.INTERMEDIATE);
    });

    test('Server rejects client-supplied speech score without valid speech transcript', async () => {
      const halfAnswers = PLACEMENT_QUESTIONS.map((q, idx) => ({
        questionId: q.id,
        selectedIndex: idx < 6 ? q.correctIndex : (q.correctIndex + 1) % 4,
      }));
      const resSpoofed = await scorePlacementTest({
        answers: halfAnswers,
        speechScore: 100,
        speechTranscript: null,
      });
      expect(resSpoofed.speechIncluded).toBe(false);
      expect(resSpoofed.placementSpeechScore).toBe(null);
      expect(resSpoofed.score).toBe(50);
    });
  });

  describe('Amendment 2: Progression engine and Level immutability', () => {
    test('Completing 4+ activities does not mutate student level or auto-unlock higher tiers', async () => {
      const { user } = await createTestUser({
        name: 'ProgressionStudent',
        level: LEVELS.BEGINNER,
        onboardingCompleted: true,
      });

      // Complete 5 beginner activities
      for (let i = 1; i <= 5; i++) {
        await recordActivityCompletion({
          user,
          activityId: `activity-${i}`,
          activityType: 'grammar',
          level: 'Beginner',
          xp: 25,
        });
      }

      const freshUser = await User.findById(user._id);
      expect(freshUser.level).toBe(LEVELS.BEGINNER);
      expect(freshUser.getUnlockedLevels()).toEqual(['Beginner']);
      expect(canAccess(freshUser, LEVELS.INTERMEDIATE)).toBe(false);
      expect(canAccess(freshUser, LEVELS.ADVANCED)).toBe(false);
    });
  });
});

describe('Gate 1: levelGate middleware unit tests', () => {
  function mockResponse() {
    const res = {};
    res.statusCode = 200;
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
    res.json = function (data) {
      res.data = data;
      return res;
    };
    return res;
  }

  describe('Authentication and Bypass', () => {
    test('requireLevel returns 401 when unauthenticated', () => {
      const req = { user: null };
      const res = mockResponse();
      let nextCalled = false;

      requireLevel(LEVELS.BEGINNER)(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    test('requireLevel bypasses teachers and admins, even if onboardingCompleted is false', () => {
      const teacherReq = { user: { role: 'teacher', level: LEVELS.BEGINNER, onboardingCompleted: false } };
      const adminReq = { user: { role: 'admin', level: null, onboardingCompleted: false } };

      let teacherNext = false;
      const resT = mockResponse();
      requireLevel(LEVELS.ADVANCED)(teacherReq, resT, () => { teacherNext = true; });
      expect(teacherNext).toBe(true);

      let adminNext = false;
      const resA = mockResponse();
      requireLevel(LEVELS.ADVANCED)(adminReq, resA, () => { adminNext = true; });
      expect(adminNext).toBe(true);
    });
  });

  describe('403 Payload Shapes', () => {
    test('Returns code "ONBOARDING_REQUIRED" when student onboardingCompleted is false', () => {
      const req = { user: { role: 'student', level: LEVELS.BEGINNER, onboardingCompleted: false } };
      const res = mockResponse();
      let nextCalled = false;

      requireLevel(LEVELS.BEGINNER)(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(403);
      expect(res.data).toEqual({
        code: 'ONBOARDING_REQUIRED',
        message: 'Dragon Egg Trial onboarding must be completed before entering kingdoms.',
        onboardingCompleted: false,
      });
      expect(nextCalled).toBe(false);
    });

    test('Returns code "LEVEL_LOCKED" with requiredLevel, currentLevel, message, and locked flag when level is insufficient', () => {
      const req = { user: { role: 'student', level: LEVELS.BEGINNER, onboardingCompleted: true } };
      const res = mockResponse();
      let nextCalled = false;

      requireLevel(LEVELS.INTERMEDIATE, 'Speaking Volcano')(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(403);
      expect(res.data.code).toBe('LEVEL_LOCKED');
      expect(res.data.requiredLevel).toBe(LEVELS.INTERMEDIATE);
      expect(res.data.currentLevel).toBe(LEVELS.BEGINNER);
      expect(res.data.message).toBe('Speaking Volcano is locked. Requires Intermediate rank to enter.');
      expect(res.data.locked).toBe(true);
      expect(nextCalled).toBe(false);
    });
  });

  describe('Allowed vs Forbidden routes for each level', () => {
    test('BEGINNER: Allowed on Beginner route, Forbidden on Intermediate & Advanced routes', () => {
      const user = { role: 'student', level: LEVELS.BEGINNER, onboardingCompleted: true };

      // Allowed on grammar (Beginner)
      let nextGrammar = false;
      requireModuleAccess('grammar')({ user }, mockResponse(), () => { nextGrammar = true; });
      expect(nextGrammar).toBe(true);

      // Forbidden on read-aloud (Intermediate)
      const resMid = mockResponse();
      let nextMid = false;
      requireModuleAccess('read-aloud')({ user }, resMid, () => { nextMid = true; });
      expect(nextMid).toBe(false);
      expect(resMid.statusCode).toBe(403);
      expect(resMid.data.code).toBe('LEVEL_LOCKED');
      expect(resMid.data.requiredLevel).toBe(LEVELS.INTERMEDIATE);

      // Forbidden on world-stage (Advanced)
      const resAdv = mockResponse();
      let nextAdv = false;
      requireModuleAccess('world-stage')({ user }, resAdv, () => { nextAdv = true; });
      expect(nextAdv).toBe(false);
      expect(resAdv.statusCode).toBe(403);
      expect(resAdv.data.code).toBe('LEVEL_LOCKED');
      expect(resAdv.data.requiredLevel).toBe(LEVELS.ADVANCED);
    });

    test('INTERMEDIATE: Allowed on Beginner & Intermediate routes, Forbidden on Advanced routes', () => {
      const user = { role: 'student', level: LEVELS.INTERMEDIATE, onboardingCompleted: true };

      // Allowed on grammar (Beginner)
      let nextGrammar = false;
      requireModuleAccess('grammar')({ user }, mockResponse(), () => { nextGrammar = true; });
      expect(nextGrammar).toBe(true);

      // Allowed on read-aloud (Intermediate)
      let nextMid = false;
      requireModuleAccess('read-aloud')({ user }, mockResponse(), () => { nextMid = true; });
      expect(nextMid).toBe(true);

      // Forbidden on debate (Advanced)
      const resAdv = mockResponse();
      let nextAdv = false;
      requireModuleAccess('debate')({ user }, resAdv, () => { nextAdv = true; });
      expect(nextAdv).toBe(false);
      expect(resAdv.statusCode).toBe(403);
      expect(resAdv.data.code).toBe('LEVEL_LOCKED');
      expect(resAdv.data.requiredLevel).toBe(LEVELS.ADVANCED);
    });

    test('ADVANCED: Allowed on Beginner, Intermediate, and Advanced routes', () => {
      const user = { role: 'student', level: LEVELS.ADVANCED, onboardingCompleted: true };

      let nextGrammar = false;
      requireModuleAccess('grammar')({ user }, mockResponse(), () => { nextGrammar = true; });
      expect(nextGrammar).toBe(true);

      let nextMid = false;
      requireModuleAccess('read-aloud')({ user }, mockResponse(), () => { nextMid = true; });
      expect(nextMid).toBe(true);

      let nextAdv = false;
      requireModuleAccess('world-stage')({ user }, mockResponse(), () => { nextAdv = true; });
      expect(nextAdv).toBe(true);
    });
  });
});
