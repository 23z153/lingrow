const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const { signAccessToken } = require('../src/utils/tokens');
const { getQuestionBankStats, scrapeDepartmentContent } = require('../src/services/departmentScraperService');

const app = createApp();

describe('Department Scraper & 5-Item Sampler API', () => {
  let token;
  let user;

  beforeAll(async () => {
    await scrapeDepartmentContent();
  });

  beforeEach(async () => {
    user = new User({
      name: 'Dept Test Student',
      email: `dept.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'student',
      department: 'CSE',
      xp: 500,
      level: 'Intermediate',
    });
    await user.setPassword('password123');
    await user.save();

    token = signAccessToken(user);
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
