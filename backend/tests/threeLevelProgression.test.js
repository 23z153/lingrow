const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const ChallengeProgress = require('../src/models/ChallengeProgress');

const app = createApp();

describe('Three-Level Difficulty & Unlock Progression System', () => {
  let userToken;
  let userEmail;
  let userId;

  beforeEach(async () => {
    userEmail = `tier.test.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Tier Cadet',
      email: userEmail,
      password: 'password123',
      role: 'student',
    });
    userToken = reg.body.token;
    userId = reg.body.user.id;
  });

  test('1 & 2 & 3: New user has Beginner unlocked, Intermediate & Advanced locked by default', async () => {
    const res = await request(app)
      .get('/api/challenges')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('levels');
    expect(res.body.unlockedLevels).toEqual(['Beginner']);

    const { Beginner, Intermediate, Advanced } = res.body.levels;
    expect(Beginner.unlocked).toBe(true);
    expect(Beginner.total).toBe(6);
    expect(Beginner.completed).toBe(0);
    expect(Beginner.percent).toBe(0);

    expect(Intermediate.unlocked).toBe(false);
    expect(Intermediate.total).toBe(6);
    expect(Intermediate.completed).toBe(0);
    expect(Intermediate.unlockRequirement).toBeDefined();

    expect(Advanced.unlocked).toBe(false);
    expect(Advanced.total).toBe(6);
    expect(Advanced.completed).toBe(0);
  });

  test('9: Direct API request to locked challenge returns 403 Forbidden', async () => {
    // Attempt to complete an Intermediate challenge directly without unlocking
    const res = await request(app)
      .post('/api/challenges/detective-i1/complete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ score: 100 });

    expect(res.status).toBe(403);
    expect(res.body.locked).toBe(true);
    expect(res.body.requiredLevel).toBe('Intermediate');
    expect(res.body.error).toContain('locked');

    // Attempt to complete an Advanced challenge directly without unlocking
    const advRes = await request(app)
      .post('/api/challenges/detective-a1/complete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ score: 100 });

    expect(advRes.status).toBe(403);
    expect(advRes.body.locked).toBe(true);
    expect(advRes.body.requiredLevel).toBe('Advanced');
  });

  test('4 & 5: Completing required Beginner challenges unlocks Intermediate automatically', async () => {
    const beginnerChallenges = ['detective-b1', 'escape-b1', 'battle-b1', 'quest-b1'];

    // Complete first 3 beginner challenges
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post(`/api/challenges/${beginnerChallenges[i]}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ score: 100 });
      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(res.body.unlockedLevels).toEqual(['Beginner']);
    }

    // Complete the 4th beginner challenge (triggering Intermediate unlock)
    const unlockRes = await request(app)
      .post(`/api/challenges/${beginnerChallenges[3]}/complete`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ score: 100 });

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.completed).toBe(true);
    expect(unlockRes.body.justUnlockedLevel).toBe('Intermediate');
    expect(unlockRes.body.unlockedLevels).toContain('Intermediate');
    expect(unlockRes.body.unlockedLevels).toContain('Beginner');

    // Verify GET /api/challenges now shows Intermediate unlocked
    const statusRes = await request(app)
      .get('/api/challenges')
      .set('Authorization', `Bearer ${userToken}`);
    expect(statusRes.body.levels.Intermediate.unlocked).toBe(true);
    expect(statusRes.body.levels.Advanced.unlocked).toBe(false);
    expect(statusRes.body.levels.Beginner.completed).toBe(4);
    expect(statusRes.body.levels.Beginner.percent).toBe(67);
  });

  test('6 & 7: Completing required Intermediate challenges unlocks Advanced automatically', async () => {
    // Complete 4 Beginner challenges
    const beginnerChallenges = ['detective-b1', 'escape-b1', 'battle-b1', 'quest-b1'];
    for (const id of beginnerChallenges) {
      await request(app)
        .post(`/api/challenges/${id}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ score: 100 });
    }

    // Now Intermediate is unlocked: complete 4 Intermediate challenges
    const intermediateChallenges = ['detective-i1', 'escape-i1', 'battle-i1', 'quest-i1'];
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post(`/api/challenges/${intermediateChallenges[i]}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ score: 100 });
      expect(res.status).toBe(200);
      expect(res.body.unlockedLevels).not.toContain('Advanced');
    }

    // Complete the 4th Intermediate challenge (triggering Advanced unlock)
    const advUnlockRes = await request(app)
      .post(`/api/challenges/${intermediateChallenges[3]}/complete`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ score: 100 });

    expect(advUnlockRes.status).toBe(200);
    expect(advUnlockRes.body.justUnlockedLevel).toBe('Advanced');
    expect(advUnlockRes.body.unlockedLevels).toContain('Advanced');

    // Advanced challenge can now be completed without 403
    const advRes = await request(app)
      .post('/api/challenges/detective-a1/complete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ score: 100 });
    expect(advRes.status).toBe(200);
    expect(advRes.body.completed).toBe(true);
  });

  test('8: Refreshing and re-logging in preserves unlocked levels and progress', async () => {
    // Unlock Intermediate by completing 4 challenges
    const beginnerChallenges = ['detective-b1', 'escape-b1', 'battle-b1', 'quest-b1'];
    for (const id of beginnerChallenges) {
      await request(app)
        .post(`/api/challenges/${id}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ score: 100 });
    }

    // Re-login with fresh credentials
    const loginRes = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    const newToken = loginRes.body.token;
    expect(loginRes.body.user.unlockedLevels).toContain('Intermediate');

    // Fetch challenges with the fresh token
    const fetchRes = await request(app)
      .get('/api/challenges')
      .set('Authorization', `Bearer ${newToken}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.unlockedLevels).toContain('Intermediate');
    expect(fetchRes.body.levels.Intermediate.unlocked).toBe(true);
    expect(fetchRes.body.levels.Beginner.completed).toBe(4);
  });

  test('10: XP is awarded properly and duplicates do not award duplicate XP', async () => {
    const res1 = await request(app)
      .post('/api/challenges/detective-b1/complete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ score: 100 });

    expect(res1.status).toBe(200);
    expect(res1.body.xpAwarded).toBe(20);
    expect(res1.body.totalXp).toBe(20);
    expect(res1.body.isFirstTime).toBe(true);

    // Replaying same challenge should not award duplicate XP
    const res2 = await request(app)
      .post('/api/challenges/detective-b1/complete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ score: 100 });

    expect(res2.status).toBe(200);
    expect(res2.body.xpAwarded).toBe(0);
    expect(res2.body.totalXp).toBe(20);
    expect(res2.body.isFirstTime).toBe(false);

    // Verify only 1 ChallengeProgress record exists (no duplicates)
    const count = await ChallengeProgress.countDocuments({ user: userId, challengeId: 'detective-b1' });
    expect(count).toBe(1);
  });
});
