const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('Dragon Academy Progress & Missions API', () => {
  let token;

  beforeEach(async () => {
    const payload = {
      name: 'Dragon Cadet',
      email: `dragon.cadet.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      password: 'password123',
      role: 'student',
    };
    const reg = await request(app).post('/api/auth/register').send(payload);
    token = reg.body.token;
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
