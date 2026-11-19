const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const { signAccessToken } = require('../src/utils/tokens');
const { getQuestionBankStats, scrapeDepartmentContent } = require('../src/services/departmentScraperService');
const { createTestUser } = require('./helpers/createUser');

const app = createApp();

describe('Department Scraper & 5-Item Sampler API', () => {
  let token;
  let user;

  beforeAll(async () => {
    await scrapeDepartmentContent();
  });

  beforeEach(async () => {
    const created = await createTestUser({
      name: 'Dept Test Student',
      department: 'CSE',
      xp: 500,
      level: 'Intermediate',
      onboardingCompleted: true,
    });
    user = created.user;
    token = created.token;
  });

  test('getQuestionBankStats returns 50+ sets for each department', async () => {
    const stats = await getQuestionBankStats();
    expect(stats.CSE).toBeDefined();
    expect(stats.CSE.passages).toBeGreaterThanOrEqual(50);
    expect(stats.CSE.clips).toBeGreaterThanOrEqual(50);
  });

  test('GET /api/practice/passages returns 5 random department items', async () => {
    const res = await request(app)
      .get('/api/practice/passages?department=CSE')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/listening/clips returns 5 random department items', async () => {
    const res = await request(app)
      .get('/api/listening/clips?department=CSE')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(5);
  });
});
