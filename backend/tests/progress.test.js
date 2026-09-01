const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('GET /api/progress/me', () => {
  test('is protected — anonymous requests are rejected', async () => {
    const res = await request(app).get('/api/progress/me');
    expect(res.status).toBe(401);
  });

  test('returns xp/level/streak/badges for an authenticated user', async () => {
    const payload = {
      name: 'Progress Tester',
      email: `progress.${Date.now()}@example.com`,
      password: 'correct-horse-battery-staple',
      role: 'student',
    };
    const reg = await request(app).post('/api/auth/register').send(payload);

    const res = await request(app).get('/api/progress/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        xp: expect.any(Number),
        level: expect.any(String),
        streak: expect.any(Number),
        badges: expect.any(Array),
      })
    );
  });
});
