const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const DebateTopic = require('../src/models/DebateTopic');
const DebateAttempt = require('../src/models/DebateAttempt');
const { signAccessToken } = require('../src/utils/tokens');
const { createTestUser } = require('./helpers/createUser');

const app = createApp();

describe('Debate: Assigned Stance Mode, Token Verification & Duration Validation', () => {
  let token;
  let user;
  let topicA;

  const validSpeech45Words =
    'Firstly, adopting generative AI tutors creates an unprecedented democratization of collegiate learning by providing real-time responsive guidance to every undergraduate student regardless of economic background. Furthermore, static textbooks cannot adapt to idiosyncratic cognitive roadblocks. On the contrary, interactive models assess comprehension dynamically. Therefore, modern academic institutions must embrace digital pedagogy immediately.';

  beforeEach(async () => {
    await DebateTopic.deleteMany({});
    await DebateAttempt.deleteMany({});

    topicA = await DebateTopic.create({
      topic: 'Topic A: Should attendance be mandatory for undergraduates?',
      level: 'Intermediate',
      difficulty: 'intermediate',
      department: 'General',
      active: true,
      tags: ['Academics', 'Policy'],
      keyTerms: [{ term: 'Compulsory Attendance', meaning: 'Required presence.' }],
      forKeyPoints: ['Ensures regular student engagement', 'Fosters peer discussions'],
      againstKeyPoints: ['Restricts independent study autonomy', 'Encourages passive attendance'],
    });

    const created = await createTestUser({
      name: 'Practice Debater',
      role: 'student',
      xp: 400,
      level: 'Intermediate',
      onboardingCompleted: true,
      password: 'secret123',
    });
    user = created.user;
    token = created.token;
  });

  describe('Assigned-Stance Mode & Security Validation', () => {
    test('GET /topics/next returns assignedStance and signed assignedStanceToken', async () => {
      const res = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(['for', 'against']).toContain(res.body.assignedStance);
      expect(typeof res.body.assignedStanceToken).toBe('string');
      expect(res.body.assignedStanceToken.includes('.')).toBe(true);
    });

    test('deterministic assigned stance: repeated requests always return identical stance for user + topic', async () => {
      const res1 = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const res2 = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.body.assignedStance).toBe(res2.body.assignedStance);
    });

    test('rejects replay on a different topic with 400 ASSIGNED_STANCE_MISMATCH', async () => {
      const nextRes = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const topicOther = await DebateTopic.create({
        topic: 'Other topic for replay test',
        level: 'Intermediate',
        department: 'General',
        active: true,
      });

      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicOther._id,
          stance: nextRes.body.assignedStance,
          stanceAssigned: true,
          assignedStanceToken: nextRes.body.assignedStanceToken,
          transcript: validSpeech45Words,
          durationSeconds: 90,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('rejects replay on a different user with 400 ASSIGNED_STANCE_MISMATCH', async () => {
      const otherUser = new User({
        name: 'Other Debater',
        email: `other.${Date.now()}@example.com`,
        role: 'student',
        xp: 300,
        level: 'Intermediate',
      });
      await otherUser.setPassword('pass123');
      await otherUser.save();
      const otherToken = signAccessToken(otherUser);

      const nextRes = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          topicId: topicA._id,
          stance: nextRes.body.assignedStance,
          stanceAssigned: true,
          assignedStanceToken: nextRes.body.assignedStanceToken,
          transcript: validSpeech45Words,
          durationSeconds: 90,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('rejects expired assigned stance token with 400 ASSIGNED_STANCE_MISMATCH', async () => {
      const debateRouter = require('../src/routes/debate');
      const expiredToken = debateRouter.generateAssignedStanceToken(
        user._id,
        topicA._id,
        'for',
        Date.now() - 5000
      );

      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          stanceAssigned: true,
          assignedStanceToken: expiredToken,
          transcript: validSpeech45Words,
          durationSeconds: 90,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('rejects legacy token without expiry with 400 ASSIGNED_STANCE_MISMATCH', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          stanceAssigned: true,
          assignedStanceToken: 'aabbccddeeff00112233445566778899',
          transcript: validSpeech45Words,
          durationSeconds: 90,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('accepts attempt when stanceAssigned is true and stance matches assigned token', async () => {
      const nextRes = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: nextRes.body.assignedStance,
          stanceAssigned: true,
          assignedStanceToken: nextRes.body.assignedStanceToken,
          transcript: validSpeech45Words,
          durationSeconds: 90,
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.attempt.stanceAssigned).toBe(true);
      expect(submitRes.body.attempt.stance).toBe(nextRes.body.assignedStance);
    });

    test('rejects attempt with 400 ASSIGNED_STANCE_MISMATCH when submitted stance differs from assigned', async () => {
      const nextRes = await request(app)
        .get('/api/debate/topics/next?assignStance=true')
        .set('Authorization', `Bearer ${token}`);

      const oppositeStance = nextRes.body.assignedStance === 'for' ? 'against' : 'for';

      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: oppositeStance,
          stanceAssigned: true,
          assignedStanceToken: nextRes.body.assignedStanceToken,
          transcript: validSpeech45Words,
          durationSeconds: 90,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });

    test('rejects attempt when assignedStanceToken is forged or invalid', async () => {
      const submitRes = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          stanceAssigned: true,
          assignedStanceToken: 'fake.signature.123',
          transcript: validSpeech45Words,
          durationSeconds: 90,
        });

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.code).toBe('ASSIGNED_STANCE_MISMATCH');
    });
  });

  describe('Duration Validation & deliveryMetrics.durationEstimated flag', () => {
    test('accepts real durationSeconds, sets durationEstimated to false, and records speechDurationSeconds', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          durationSeconds: 75,
          targetDurationSeconds: 120,
        });

      expect(res.status).toBe(201);
      expect(res.body.attempt.durationSeconds).toBe(75);
      expect(res.body.attempt.deliveryMetrics.durationEstimated).toBe(false);
      expect(res.body.attempt.deliveryMetrics.speechDurationSeconds).toBe(75);
    });

    test('plausibility check: sets durationSuspect=true and falls back to estimated duration when WPM > 250', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words, // ~45 words
          durationSeconds: 5, // Implied WPM = 45 / (5/60) = 540 WPM > 250
        });

      expect(res.status).toBe(201);
      expect(res.body.attempt.deliveryMetrics.durationSuspect).toBe(true);
      expect(res.body.attempt.deliveryMetrics.wpm).toBeLessThanOrEqual(250);
    });

    test('plausibility check: slow speech with <= 150 words is NOT suspect (allows thoughtful pauses)', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words, // 51 words <= 150
          durationSeconds: 100, // Implied WPM = 31 < 40
        });

      expect(res.status).toBe(201);
      expect(res.body.attempt.deliveryMetrics.durationSuspect).toBe(false);
      expect(res.body.attempt.deliveryMetrics.wpm).toBe(31);
    });

    test('plausibility check: slow speech with > 150 words and WPM < 40 IS suspect and falls back to estimate', async () => {
      const longSpeech = (validSpeech45Words + ' ').repeat(4); // 204 words > 150
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: longSpeech,
          durationSeconds: 350, // 204 words in 350s = 35 WPM < 40
        });

      expect(res.status).toBe(201);
      expect(res.body.attempt.deliveryMetrics.durationSuspect).toBe(true);
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
      expect(res.body.attempt.mode).toBe('typed');
      expect(res.body.attempt.deliveryMetrics.durationEstimated).toBe(true);
      expect(res.body.attempt.durationSeconds).toBe(res.body.attempt.deliveryMetrics.speechDurationSeconds);
    });

    test('sets durationEstimated to true when durationSeconds is omitted', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
        });

      expect(res.status).toBe(201);
      expect(res.body.attempt.deliveryMetrics.durationEstimated).toBe(true);
    });

    test('rejects negative or zero durationSeconds with 400 INVALID_DURATION', async () => {
      const res = await request(app)
        .post('/api/debate/attempts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          topicId: topicA._id,
          stance: 'for',
          transcript: validSpeech45Words,
          durationSeconds: -5,
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
});
