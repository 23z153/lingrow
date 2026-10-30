const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const DebateTopic = require('../src/models/DebateTopic');
const DebateAttempt = require('../src/models/DebateAttempt');
const { signAccessToken } = require('../src/utils/tokens');
const { stripTranscriptTags } = require('../src/services/llmService');

const app = createApp();

describe('Debate Phase 2: Practice Flow, Rotation, Assigned Stance & Duration Validation', () => {
  let token;
  let user;
  let topicA;
  let topicB;
  let topicCSE;

  const validSpeech45Words =
    'Firstly, adopting generative AI tutors creates an unprecedented democratization of collegiate learning by providing real-time responsive guidance to every undergraduate student regardless of economic background. Furthermore, static textbooks cannot adapt to idiosyncratic cognitive roadblocks. On the contrary, interactive models assess comprehension dynamically. Therefore, modern academic institutions must embrace digital pedagogy immediately.';

  beforeEach(async () => {
    // Clean collections
    await DebateTopic.deleteMany({});
    await DebateAttempt.deleteMany({});

    // Create topics
    topicA = await DebateTopic.create({
      topic: 'Topic A: Should attendance be mandatory for undergraduates?',
      level: 'Intermediate',
      difficulty: 'intermediate',
      department: 'General',
      active: true,
      tags: ['Academics', 'Policy'],
      keyTerms: [{ term: 'Compulsory Attendance', meaning: 'Required classroom presence to sit for examinations.' }],
      forKeyPoints: ['Ensures regular student engagement', 'Fosters peer discussions'],
      againstKeyPoints: ['Restricts independent study autonomy', 'Encourages passive attendance without attention'],
    });

    topicB = await DebateTopic.create({
      topic: 'Topic B: Is remote work superior to office collaboration?',
      level: 'Advanced',
      difficulty: 'advanced',
      department: 'General',
      active: true,
      tags: ['Workplace', 'Economy'],
      keyTerms: [{ term: 'Telecommuting', meaning: 'Working from a remote location using digital infrastructure.' }],
      forKeyPoints: ['Saves commuting hours', 'Expands global hiring'],
      againstKeyPoints: ['Reduces spontaneous mentorship', 'Increases digital fatigue'],
    });

    topicCSE = await DebateTopic.create({
      topic: 'Topic CSE: Should microservices always replace monolithic architectures?',
      level: 'Intermediate',
      difficulty: 'intermediate',
      department: 'CSE',
      active: true,
      tags: ['Engineering', 'Software'],
      keyTerms: [{ term: 'Decoupled Services', meaning: 'Independently deployable modular components.' }],
      forKeyPoints: ['Independent team scaling', 'Fault isolation across modules'],
      againstKeyPoints: ['Distributed transaction complexity', 'Elevated network latency'],
    });

    user = new User({
      name: 'Phase2 Debater',
      email: `p2debater.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'student',
      xp: 400,
      level: 'Intermediate',
    });
    await user.setPassword('secret123');
    await user.save();

    token = signAccessToken(user);
  });

  // 1. Tag Stripping Loop Security Check
  describe('Transcript Tag Stripping Loop', () => {
    test('loops until all split or nested <transcript> tags are completely stripped', () => {
      const nested1 = 'Speech with <trans<transcript>cript> injected tag';
      expect(stripTranscriptTags(nested1)).toBe('Speech with  injected tag');

      const nested2 = 'Speech with </trans</transcript>cript> closing tag';
      expect(stripTranscriptTags(nested2)).toBe('Speech with  closing tag');

      const multiNested = 'Speech with <trans<trans<transcript>cript>cript> multiple nestings';
      expect(stripTranscriptTags(multiNested)).toBe('Speech with  multiple nestings');
    });
  });

  // 2. Both-Stances Rotation Logic
  describe('Topic Rotation: 3-Pool Architecture & Both-Stances Rule', () => {
    test('serves topic with 0 attempts first (Pool 1)', async () => {
      const res = await request(app)
        .get('/api/debate/topics/next')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.topic).toBeDefined();
      expect(res.body.retry).toBe(false);
      expect(res.body.attemptedStances).toEqual([]);
      // Should prefer user's level ('Intermediate') over 'Advanced' (Topic B)
      expect(res.body.topic.level).toBe('Intermediate');
      expect([String(topicA._id), String(topicCSE._id)]).toContain(res.body.topic._id);
      expect(res.body.topic._id).not.toBe(String(topicB._id));
    });

    test('serves topic with 1 stance attempted next (Pool 2) and suggests opposite stance', async () => {
      // Create an attempt on topic A with stance 'for'
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { clarity: 80, persuasiveness: 80, vocabulary: 80, structure: 80, overall: 80 },
        feedback: 'Good argument.',
        deliveryMetrics: { speechDurationSeconds: 65, durationEstimated: false },
      });

      // Deactivate topicB and topicCSE to isolate topic A in Pool 2
      await DebateTopic.updateMany({ _id: { $in: [topicB._id, topicCSE._id] } }, { active: false });

      const res = await request(app)
        .get('/api/debate/topics/next')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.topic._id).toBe(String(topicA._id));
      expect(res.body.attemptedStances).toContain('for');
      expect(res.body.suggestedStance).toBe('against');
      expect(res.body.retry).toBe(false);
    });

    test('pool exhaustion: returns lowest-scoring past topic with retry:true when all stances done', async () => {
      // Fully practice Topic A on both stances (scores 85 on 'for', 60 on 'against' -> lowest = 60, best = 85)
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { clarity: 85, persuasiveness: 85, vocabulary: 85, structure: 85, overall: 85 },
        feedback: 'High scoring speech.',
        deliveryMetrics: { speechDurationSeconds: 60, durationEstimated: false },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { clarity: 60, persuasiveness: 60, vocabulary: 60, structure: 60, overall: 60 },
        feedback: 'Lower scoring speech.',
        deliveryMetrics: { speechDurationSeconds: 55, durationEstimated: false },
      });

      // Fully practice Topic B on both stances (scores 90 on 'for', 92 on 'against' -> lowest = 90)
      await DebateAttempt.create({
        user: user._id,
        topic: topicB._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { clarity: 90, persuasiveness: 90, vocabulary: 90, structure: 90, overall: 90 },
        feedback: 'Excellent.',
        deliveryMetrics: { speechDurationSeconds: 70, durationEstimated: false },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicB._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { clarity: 92, persuasiveness: 92, vocabulary: 92, structure: 92, overall: 92 },
        feedback: 'Superb.',
        deliveryMetrics: { speechDurationSeconds: 75, durationEstimated: false },
      });

      // Deactivate topicCSE for this test
      await DebateTopic.findByIdAndUpdate(topicCSE._id, { active: false });

      const res = await request(app)
        .get('/api/debate/topics/next')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.retry).toBe(true);
      // Topic A had lowest past score (60) vs Topic B (90), so Topic A must be returned
      expect(res.body.topic._id).toBe(String(topicA._id));
      expect(res.body.previousBestScore).toBe(85);
      expect(res.body.fullyPracticedCount).toBe(2);
    });
  });

  // 3. Department Persistence & Filtering
  describe('Department Filtering & Preferences Endpoint', () => {
    test('respects department query parameter', async () => {
      const res = await request(app)
        .get('/api/debate/topics/next?department=CSE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.topic.department).toBe('CSE');
      expect(res.body.topic._id).toBe(String(topicCSE._id));
    });

    test('PUT /api/debate/preferences updates user selectedDebateDept and rotates accordingly', async () => {
      const putRes = await request(app)
        .put('/api/debate/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ department: 'CSE' });

      expect(putRes.status).toBe(200);
      expect(putRes.body.selectedDebateDept).toBe('CSE');

      // Next topic without query param should now use the user preference 'CSE'
      const nextRes = await request(app)
        .get('/api/debate/topics/next')
        .set('Authorization', `Bearer ${token}`);

      expect(nextRes.status).toBe(200);
      expect(nextRes.body.topic.department).toBe('CSE');
    });
  });

  // 4. Assigned-Stance Validation (HMAC Token Security)
  describe('Assigned-Stance Mode & Security Validation', () => {
    test('GET /topics/next returns assignedStance and signed assignedStanceToken', async () => {
      const res = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(['for', 'against']).toContain(res.body.assignedStance);
      expect(typeof res.body.assignedStanceToken).toBe('string');
      expect(res.body.assignedStanceToken).toMatch(/^\d+\.[a-f0-9]{64}$/); // timestamp.sig
    });

    test('deterministic assigned stance: repeated requests always return identical stance for user + topic', async () => {
      const res1 = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const res2 = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      // If the same topic is served, assignedStance MUST be strictly identical
      if (res1.body.topic._id === res2.body.topic._id) {
        expect(res1.body.assignedStance).toBe(res2.body.assignedStance);
      }

      // Explicit deterministic check using the exported function
      const debateRouter = require('../src/routes/debate');
      const stance1 = debateRouter.getDeterministicAssignedStance(user._id, topicA._id);
      const stance2 = debateRouter.getDeterministicAssignedStance(user._id, topicA._id);
      expect(stance1).toBe(stance2);
      expect(['for', 'against']).toContain(stance1);
    });

    test('rejects replay on a different topic with 400 ASSIGNED_STANCE_MISMATCH', async () => {
      const topicRes = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const assignedStance = topicRes.body.assignedStance;
      const assignedToken = topicRes.body.assignedStanceToken;

      // Attempt to use Topic A's signed token on Topic B
      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicB._id, // Mismatched topic!
          stance: assignedStance,
          transcript: validSpeech45Words,
          stanceAssigned: true,
          assignedStanceToken: assignedToken,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('rejects replay on a different user with 400 ASSIGNED_STANCE_MISMATCH', async () => {
      const topicRes = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const assignedStance = topicRes.body.assignedStance;
      const assignedToken = topicRes.body.assignedStanceToken;
      const topicId = topicRes.body.topic._id;

      // Create a second student
      const user2 = new User({
        name: 'Second Debater',
        email: `debater2.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
        role: 'student',
        xp: 400,
        level: 'Intermediate',
      });
      await user2.setPassword('secret123');
      await user2.save();
      const token2 = signAccessToken(user2);

      // Attempt to use User 1's signed token as User 2
      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          topicId,
          stance: assignedStance,
          transcript: validSpeech45Words,
          stanceAssigned: true,
          assignedStanceToken: assignedToken,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('rejects expired assigned stance token with 400 ASSIGNED_STANCE_MISMATCH', async () => {
      const debateRouter = require('../src/routes/debate');
      // Generate a token that expired 10 seconds ago
      const expiredToken = debateRouter.generateAssignedStanceToken(
        user._id,
        topicA._id,
        'for',
        Date.now() - 10000
      );

      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          stanceAssigned: true,
          assignedStanceToken: expiredToken,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('rejects legacy token without expiry with 400 ASSIGNED_STANCE_MISMATCH', async () => {
      const crypto = require('crypto');
      const secret = process.env.JWT_SECRET || 'lingrow_debate_secret_key_2026';
      // Token created without expiry timestamp
      const noExpiryToken = crypto
        .createHmac('sha256', secret)
        .update(`${String(user._id)}:${String(topicA._id)}:for`)
        .digest('hex');

      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          stanceAssigned: true,
          assignedStanceToken: noExpiryToken,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('accepts attempt when stanceAssigned is true and stance matches assigned token', async () => {
      const topicRes = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const assignedStance = topicRes.body.assignedStance;
      const assignedToken = topicRes.body.assignedStanceToken;
      const topicId = topicRes.body.topic._id;

      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId,
          stance: assignedStance,
          transcript: validSpeech45Words,
          stanceAssigned: true,
          assignedStanceToken: assignedToken,
          mode: 'assigned',
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.attempt.stanceAssigned).toBe(true);
      expect(submitRes.body.attempt.mode).toBe('assigned');
    });

    test('rejects attempt with 400 ASSIGNED_STANCE_MISMATCH when submitted stance differs from assigned', async () => {
      const topicRes = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const assignedStance = topicRes.body.assignedStance;
      const mismatchedStance = assignedStance === 'for' ? 'against' : 'for';
      const assignedToken = topicRes.body.assignedStanceToken;
      const topicId = topicRes.body.topic._id;

      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId,
          stance: mismatchedStance, // Tampered/cheated stance
          transcript: validSpeech45Words,
          stanceAssigned: true,
          assignedStanceToken: assignedToken,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
      expect(submitRes.body.error).toMatch(/Assigned stance validation failed/i);
    });

    test('rejects attempt when assignedStanceToken is forged or invalid', async () => {
      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          stanceAssigned: true,
          assignedStanceToken: 'forged_fake_token_hex_1234567890abcdef',
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });
  });

  // 5. Duration and Timing Validation
  describe('Duration Validation & deliveryMetrics.durationEstimated flag', () => {
    test('accepts real durationSeconds, sets durationEstimated to false, and records speechDurationSeconds', async () => {
      // 52 words in 25 seconds -> 125 WPM (well within normal 40-250 range)
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          durationSeconds: 25,
          targetDurationSeconds: 120,
          mode: 'timed',
        });

      expect(res.status).toBe(201);
      const attempt = res.body.attempt;
      expect(attempt.durationSeconds).toBe(25);
      expect(attempt.mode).toBe('timed');
      expect(attempt.deliveryMetrics.speechDurationSeconds).toBe(25);
      expect(attempt.deliveryMetrics.durationEstimated).toBe(false);
      expect(attempt.deliveryMetrics.durationSuspect).toBe(false);
      expect(attempt.deliveryMetrics.targetDurationSeconds).toBe(120);
    });

    test('plausibility check: sets durationSuspect=true and falls back to estimated duration when WPM > 250', async () => {
      // 52 words in 5 seconds -> implied WPM = 624 (> 250)
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          durationSeconds: 5,
        });

      expect(res.status).toBe(201);
      const attempt = res.body.attempt;
      expect(attempt.durationSeconds).toBe(5); // Preserves client duration
      expect(attempt.deliveryMetrics.durationSuspect).toBe(true);
      expect(attempt.deliveryMetrics.durationEstimated).toBe(true);
      // Fallback estimated duration: ~52 / 2.16 ~ 24s
      expect(attempt.deliveryMetrics.speechDurationSeconds).toBe(24);
    });

    test('plausibility check: slow speech with <= 150 words is NOT suspect (allows thoughtful pauses)', async () => {
      // 52 words in 100 seconds -> implied WPM = 31 (< 40), but wordCount <= 150 -> NOT suspect
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          durationSeconds: 100,
        });

      expect(res.status).toBe(201);
      const attempt = res.body.attempt;
      expect(attempt.durationSeconds).toBe(100);
      expect(attempt.deliveryMetrics.durationSuspect).toBe(false);
      expect(attempt.deliveryMetrics.durationEstimated).toBe(false);
      expect(attempt.deliveryMetrics.speechDurationSeconds).toBe(100);
    });

    test('plausibility check: slow speech with > 150 words and WPM < 40 IS suspect and falls back to estimate', async () => {
      // Create a 160-word speech
      const longSpeech = (validSpeech45Words + ' ').repeat(4).trim();
      const wordCount = longSpeech.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(150);

      // 200 words in 360 seconds -> 33 WPM (< 40)
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: longSpeech,
          durationSeconds: 360,
        });

      expect(res.status).toBe(201);
      const attempt = res.body.attempt;
      expect(attempt.deliveryMetrics.durationSuspect).toBe(true);
      expect(attempt.deliveryMetrics.durationEstimated).toBe(true);
      expect(attempt.deliveryMetrics.speechDurationSeconds).toBe(Math.round(wordCount / 2.16));
    });

    test('typed mode: submissions send mode "typed" without durationSeconds and set durationEstimated=true', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          mode: 'typed',
        });

      expect(res.status).toBe(201);
      const attempt = res.body.attempt;
      expect(attempt.mode).toBe('typed');
      expect(attempt.deliveryMetrics.durationEstimated).toBe(true);
      expect(attempt.deliveryMetrics.durationSuspect).toBe(false);
    });

    test('sets durationEstimated to true when durationSeconds is omitted', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'against',
          transcript: validSpeech45Words,
        });

      expect(res.status).toBe(201);
      expect(res.body.attempt.deliveryMetrics.durationEstimated).toBe(true);
      expect(res.body.attempt.deliveryMetrics.durationSuspect).toBe(false);
    });

    test('rejects negative or zero durationSeconds with 400 INVALID_DURATION', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          durationSeconds: -10,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_DURATION');
    });

    test('rejects durationSeconds > 600s with 400 DURATION_TOO_LONG', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          durationSeconds: 601,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DURATION_TOO_LONG');
    });

    test('rejects invalid targetDurationSeconds (not 60, 120, or 180) with 400 INVALID_TARGET_DURATION', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          targetDurationSeconds: 90,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_TARGET_DURATION');
    });
  });

  // 6. Production Safety: Throws if JWT_SECRET is missing in production
  describe('Production JWT_SECRET Safety', () => {
    test('throws in production when JWT_SECRET is missing', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.JWT_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.JWT_SECRET;
        expect(() => createApp()).toThrow(/FATAL: JWT_SECRET environment variable/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalSecret) process.env.JWT_SECRET = originalSecret;
      }
    });
  });

  // 7. Level Gate Error Response Fields
  describe('Level Gate Response UX Fields', () => {
    test('returns requiredLevel, requiredXp, currentXp, and xpNeeded on 403', async () => {
      const { requireMinXP } = require('../src/middleware/levelGate');
      const express = require('express');
      const testApp = express();

      testApp.get(
        '/test-gate',
        (req, res, next) => {
          req.user = { role: 'student', xp: 120, level: 'Beginner' };
          next();
        },
        requireMinXP(300, 'Debate', 'Intermediate'),
        (req, res) => {
          res.json({ ok: true });
        }
      );

      const res = await request(testApp).get('/test-gate');
      expect(res.status).toBe(403);
      expect(res.body.locked).toBe(true);
      expect(res.body.requiredLevel).toBe('Intermediate');
      expect(res.body.requiredXp).toBe(300);
      expect(res.body.currentXp).toBe(120);
      expect(res.body.xpNeeded).toBe(180);
      expect(res.body.error).toMatch(/Requires Intermediate level/i);
    });
  });

  // 8. Phase 4: XP Calculations, Bonuses, Caps & Anti-Farming
  describe('Phase 4: XP Formula, Improvement/Stance Bonuses & Caps', () => {
    test('awards base XP according to 15 + overall/5 without bonuses for first standard attempt', async () => {
      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 80,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });

      // 15 + 80/5 = 31
      expect(xp.base).toBe(31);
      expect(xp.improvementBonus).toBe(0);
      expect(xp.stanceBonus).toBe(0);
      expect(xp.total).toBe(31);
      expect(xp.capped).toBe(false);
    });

    test('awards improvement bonus (+5 per 5 pts, max +15) on re-attempting same topic & stance', async () => {
      // First attempt with score 60
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 60 },
      });

      const debateRouter = require('../src/routes/debate');
      // Second attempt with score 78 (+18 points improvement -> 3 intervals of 5 -> +15)
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 78,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: false,
      });

      expect(xp.base).toBe(31); // 15 + 78/5 ~ 31
      expect(xp.improvementBonus).toBe(15);
      expect(xp.total).toBe(46);
    });

    test('awards stance agility bonus (+5) for assigned stance attempt', async () => {
      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 70,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: true,
      });

      expect(xp.stanceBonus).toBe(5);
      expect(xp.total).toBe(29 + 5); // 29 + 5 = 34
    });

    test('awards stance agility bonus (+5) when arguing opposite stance on same topic', async () => {
      // Already argued 'for'
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });

      const debateRouter = require('../src/routes/debate');
      // Now arguing 'against'
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 75,
        userId: user._id,
        topicId: topicA._id,
        stance: 'against',
        isAssigned: false,
      });

      expect(xp.stanceBonus).toBe(5);
    });

    test('anti-farming: grants zero bonuses if overall score < 40', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 20 },
      });

      const debateRouter = require('../src/routes/debate');
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 35, // < 40
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: true,
      });

      expect(xp.improvementBonus).toBe(0);
      expect(xp.stanceBonus).toBe(0);
      expect(xp.total).toBe(Math.round(15 + 35 / 5)); // 22
    });

    test('caps total XP per attempt at 50 max and flags capped:true', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 60 },
      });

      const debateRouter = require('../src/routes/debate');
      // 15 + 95/5 = 34 base + 15 improvement + 5 stance = 54 uncapped -> capped to 50
      const xp = await debateRouter.calculateDebateXP({
        overallScore: 95,
        userId: user._id,
        topicId: topicA._id,
        stance: 'for',
        isAssigned: true,
      });

      expect(xp.total).toBe(50);
      expect(xp.capped).toBe(true);
    });
  });

  // 9. Phase 4: Badges Awarding & Concurrency Protection
  describe('Phase 4: Debate Badges & Atomic Concurrent Awards', () => {
    test('awards first_debate badge on first completed debate', async () => {
      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicA._id, 'for', 75);
      expect(badges.some((b) => b.key === 'first_debate')).toBe(true);
    });

    test('awards debate_champion when overall score >= 85', async () => {
      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicA._id, 'for', 88);
      expect(badges.some((b) => b.key === 'debate_champion')).toBe(true);
    });

    test('awards both_sides badge when user argues both FOR and AGAINST on the same topic', async () => {
      // First attempt on stance 'for'
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });

      const debateRouter = require('../src/routes/debate');
      // Second attempt on stance 'against'
      const badges = await debateRouter.evaluateDebateBadges(user, topicA._id, 'against', 75);
      expect(badges.some((b) => b.key === 'both_sides')).toBe(true);
    });

    test('awards consistent_debater badge after 3 consecutive attempts with overall >= 70', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 72 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicB._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 70 },
      });

      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicB._id, 'for', 70);
      expect(badges.some((b) => b.key === 'consistent_debater')).toBe(true);
    });

    test('awards debate_streak_5 for attempts on 5 consecutive days', async () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      // Seed attempts on 4 previous consecutive days + 1 today
      for (let i = 4; i >= 0; i--) {
        await DebateAttempt.create({
          user: user._id,
          topic: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          scores: { overall: 75 },
          createdAt: new Date(now - i * oneDay),
        });
      }

      const debateRouter = require('../src/routes/debate');
      const badges = await debateRouter.evaluateDebateBadges(user, topicA._id, 'for', 75);
      expect(badges.some((b) => b.key === 'debate_streak_5')).toBe(true);
    });

    test('atomic protection: does not double award badge even if maybeAwardBadge is called concurrently', async () => {
      const { maybeAwardBadge } = require('../src/services/progressService');
      const [res1, res2] = await Promise.all([
        maybeAwardBadge(user, 'first_debate'),
        maybeAwardBadge(user, 'first_debate'),
      ]);

      // Exactly one succeeds and returns the badge, the other returns null due to atomic unique constraint
      const successes = [res1, res2].filter(Boolean);
      expect(successes.length).toBe(1);
    });
  });

  // 10. Phase 4: History & Trend Series Endpoint
  describe('Phase 4: GET /api/debate/history Trend Series & Weakest Skill Tip', () => {
    test('returns per-metric chronological series, averages, and weakest skill coaching tip', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { logic: 85, persuasion: 60, clarity: 75, vocabulary: 80, structure: 70, overall: 74 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { logic: 90, persuasion: 65, clarity: 80, vocabulary: 85, structure: 75, overall: 79 },
      });

      const res = await request(app)
        .get('/api/debate/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.totalAttempts).toBe(2);
      expect(res.body.series.logic).toEqual([85, 90]);
      expect(res.body.series.persuasion).toEqual([60, 65]);
      expect(res.body.averages.persuasion).toBe(63);
      // Weakest skill should be persuasion (lowest avg: 63)
      expect(res.body.weakestSkill.skill).toBe('persuasion');
      expect(typeof res.body.weakestSkill.tip).toBe('string');
      expect(res.body.weakestSkill.tip.length).toBeGreaterThan(10);
    });

    test('gracefully handles legacy attempts without structure/feedback in history series', async () => {
      // Legacy document with old argument/counterargument schema and no structure
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { argument: 82, counterargument: 78, clarity: 75, vocabulary: 70, overall: 76 },
      });

      const res = await request(app)
        .get('/api/debate/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.series.logic).toContain(82);
      expect(res.body.series.persuasion).toContain(78);
      // Structure defaulted to 70 for legacy documents
      expect(res.body.series.structure).toContain(70);
    });
  });
});

