const request = require('supertest');
const createApp = require('../src/app');
const { createTestUser } = require('./helpers/createUser');

const app = createApp();

describe('GET /api/progress/me', () => {
  test('is protected — anonymous requests are rejected', async () => {
    const res = await request(app).get('/api/progress/me');
    expect(res.status).toBe(401);
  });

  test('returns xp/level/streak/badges for an authenticated user', async () => {
    const { token } = await createTestUser({
      name: 'Progress Tester',
      role: 'student',
      level: 'Beginner',
      onboardingCompleted: true,
    });

    const res = await request(app).get('/api/progress/me').set('Authorization', `Bearer ${token}`);
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
