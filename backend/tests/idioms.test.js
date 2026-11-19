const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const IdiomPhrase = require('../src/models/IdiomPhrase');
const IdiomProgress = require('../src/models/IdiomProgress');
const { SEED_IDIOMS_DATA } = require('../src/seedIdioms');
const { createTestUser } = require('./helpers/createUser');

const app = createApp();

describe('Idioms & Phrasal Verbs Grove API Tests', () => {
  let studentToken;
  let studentUser;
  let testIdiom;
  let testPhrasalVerb;

  beforeEach(async () => {
    // 1. Create a student user
    const student = await createTestUser({
      name: 'Grove Explorer',
      role: 'student',
      level: 'Intermediate',
      onboardingCompleted: true,
    });
    studentToken = student.token;
    studentUser = student.user;

    // 2. Insert test items from seed data
    await IdiomPhrase.deleteMany({});
    await IdiomProgress.deleteMany({});

    const inserted = await IdiomPhrase.insertMany(SEED_IDIOMS_DATA.slice(0, 4));
    testIdiom = inserted.find((i) => i.type === 'idiom');
    testPhrasalVerb = inserted.find((i) => i.type === 'phrasal_verb');
  });

  test('Auth guard: unauthenticated request to /api/idioms returns 401', async () => {
    const res = await request(app).get('/api/idioms');
    expect(res.status).toBe(401);
  });

  test('GET /api/idioms returns list of expressions with user mastery stats', async () => {
    const res = await request(app)
      .get('/api/idioms')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const item = res.body[0];
    expect(item).toHaveProperty('expression');
    expect(item).toHaveProperty('stage1_discover');
    expect(item.userProgress).toHaveProperty('mastery', 'new');
  });

  test('GET /api/idioms filters by type=phrasal_verb', async () => {
    const res = await request(app)
      .get('/api/idioms?type=phrasal_verb')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    for (const item of res.body) {
      expect(item.type).toBe('phrasal_verb');
    }
  });

  test('GET /api/idioms/grouped-verbs returns grouped base verbs', async () => {
    const res = await request(app)
      .get('/api/idioms/grouped-verbs')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('baseVerb');
      expect(res.body[0]).toHaveProperty('total');
      expect(res.body[0]).toHaveProperty('items');
    }
  });

  test('GET /api/idioms/stats returns accurate counts', async () => {
    const res = await request(app)
      .get('/api/idioms/stats')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('mastered', 0);
    expect(res.body).toHaveProperty('familiar', 0);
    expect(res.body).toHaveProperty('new');
    expect(res.body.total).toBe(res.body.new);
  });

  test('POST /api/idioms/:id/stage2-understand evaluates MCQ and returns distractor rationales', async () => {
    const target = testIdiom;
    const correctIdx = target.stage2_understand.correctAnswer;

    const res = await request(app)
      .post(`/api/idioms/${target._id}/stage2-understand`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ selectedOption: correctIdx });

    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
    expect(res.body.explanation).toBeTruthy();
    expect(Array.isArray(res.body.distractorRationales)).toBe(true);
    expect(res.body.distractorRationales.length).toBe(4);
    expect(res.body.xpEarned).toBe(10);
    expect(res.body.mastery).toBe('familiar');

    // Verify progress saved in database
    const prog = await IdiomProgress.findOne({ user: studentUser._id, expression: target._id });
    expect(prog).toBeTruthy();
    expect(prog.stage2Passed).toBe(true);
    expect(prog.attempts).toBe(1);
  });

  test('POST /api/idioms/:id/stage3-use evaluates practice and transitions mastery', async () => {
    const target = testIdiom;

    const res = await request(app)
      .post(`/api/idioms/${target._id}/stage3-use`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        fillInBlankAnswer: target.stage3_use.fillInBlank.correctAnswer,
        sentenceRewriteAnswer: `We had to ${target.expression} to finish the final project.`,
        spokenTranscript: target.stage3_use.speakingPrompt.referenceText,
      });

    expect(res.status).toBe(200);
    expect(res.body.isPassed).toBe(true);
    expect(res.body.score).toBeGreaterThanOrEqual(60);
    expect(res.body.fillCorrect).toBe(true);
    expect(res.body.mastery).toBe('familiar');
    expect(res.body.nextReviewDate).toBeTruthy();
    expect(res.body.xpEarned).toBeGreaterThan(0);

    // Second successful attempt advances to 'mastered'
    const res2 = await request(app)
      .post(`/api/idioms/${target._id}/stage3-use`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        fillInBlankAnswer: target.stage3_use.fillInBlank.correctAnswer,
        sentenceRewriteAnswer: `We had to ${target.expression} to finish the final project.`,
        spokenTranscript: target.stage3_use.speakingPrompt.referenceText,
      });

    expect(res2.status).toBe(200);
    expect(res2.body.mastery).toBe('mastered');

    const prog = await IdiomProgress.findOne({ user: studentUser._id, expression: target._id });
    expect(prog.mastery).toBe('mastered');
  });
});
