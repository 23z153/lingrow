const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

function newUserPayload() {
  return {
    name: 'Daily Word Student',
    email: `daily.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'student',
  };
}

describe('Daily Word & Afternoon Challenge API', () => {
  let token;

  beforeEach(async () => {
    const reg = await request(app).post('/api/auth/register').send(newUserPayload());
    token = reg.body.token;
  });

  test('GET /api/notifications/daily-word returns today word & question', async () => {
    const res = await request(app)
      .get('/api/notifications/daily-word')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.dailyWord).toBeDefined();
    expect(res.body.dailyWord.word).toEqual(expect.any(String));
    expect(res.body.dailyWord.relevancy).toEqual(expect.any(String));
    expect(res.body.dailyWord.question).toBeDefined();
    expect(res.body.answered).toBe(false);
  });

  test('POST /api/notifications/daily-word/answer evaluates answer and awards XP', async () => {
    const getRes = await request(app)
      .get('/api/notifications/daily-word')
      .set('Authorization', `Bearer ${token}`);

    const correctOpt = getRes.body.dailyWord.question.correctAnswer;

    const res = await request(app)
      .post('/api/notifications/daily-word/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ selectedOption: correctOpt });

    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
    expect(res.body.xpEarned).toBe(10);
  });
});
