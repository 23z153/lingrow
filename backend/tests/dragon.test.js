const request = require('supertest');
const createApp = require('../src/app');
const { createTestUser } = require('./helpers/createUser');

const app = createApp();

describe('Dragon Academy Progress & Missions API', () => {
  let token;

  beforeEach(async () => {
    const student = await createTestUser({
      name: 'Dragon Cadet',
      role: 'student',
      level: 'Beginner',
      onboardingCompleted: true,
    });
    token = student.token;
  });

  test('GET /api/progress/dragon returns dragon evolution stats and daily missions', async () => {
    const res = await request(app)
      .get('/api/progress/dragon')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dragon');
    expect(res.body.dragon).toHaveProperty('stage');
    expect(res.body.dragon).toHaveProperty('name');
    expect(res.body.dragon).toHaveProperty('title');
    expect(res.body.dragon).toHaveProperty('percentToNext');
    expect(res.body).toHaveProperty('missions');
    expect(Array.isArray(res.body.missions)).toBe(true);
    expect(res.body.missions.length).toBe(4);
  });

  test('GET /api/progress/leaderboard returns dragon stage and title', async () => {
    const res = await request(app)
      .get('/api/progress/leaderboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('dragonStage');
      expect(res.body[0]).toHaveProperty('dragonTitle');
    }
  });
});
