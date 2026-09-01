const request = require('supertest');
const createApp = require('../src/app');
const SituationalPhrase = require('../src/models/SituationalPhrase');

const app = createApp();

function newUserPayload() {
  return {
    name: 'Situational Student',
    email: `situational.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'student',
  };
}

describe('Situational Phrases API Routes', () => {
  let token;
  let scenarioId;

  beforeEach(async () => {
    const reg = await request(app).post('/api/auth/register').send(newUserPayload());
    token = reg.body.token;

    const scenario = new SituationalPhrase({
      title: 'Greeting a Professor Test',
      category: 'Campus Life',
      level: 'Beginner',
      situationContext: 'Meeting your professor in their office.',
      phrases: [
        {
          speaker: 'Student',
          englishText: 'Good morning Professor.',
          explanation: 'Polite greeting.',
          keyTips: 'Use formal titles.',
        },
      ],
      interactivePrompts: [
        {
          prompt: 'Which is the best greeting?',
          options: ['Hey', 'Good morning Professor'],
          correctAnswer: 1,
          explanation: 'Option B is formal and respectful.',
        },
      ],
    });
    await scenario.save();
    scenarioId = scenario._id.toString();
  });

  test('GET /api/situational/scenarios lists scenarios with progress', async () => {
    const res = await request(app)
      .get('/api/situational/scenarios')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((s) => s._id === scenarioId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Greeting a Professor Test');
  });

  test('POST /api/situational/scenarios/:id/submit evaluates answers and awards XP', async () => {
    const res = await request(app)
      .post(`/api/situational/scenarios/${scenarioId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1] });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(100);
    expect(res.body.xpEarned).toBeGreaterThan(0);
    expect(res.body.evaluatedAnswers[0].isCorrect).toBe(true);
  });
});
