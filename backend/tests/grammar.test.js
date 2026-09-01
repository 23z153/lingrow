const request = require('supertest');
const createApp = require('../src/app');
const GrammarTopic = require('../src/models/GrammarTopic');

const app = createApp();

function newUserPayload(overrides = {}) {
  return {
    name: 'Grammar Student',
    email: `grammar.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'student',
    ...overrides,
  };
}

describe('Grammar API Routes', () => {
  let token;
  let topicId;

  beforeEach(async () => {
    // Create test user and token
    const reg = await request(app).post('/api/auth/register').send(newUserPayload());
    token = reg.body.token;

    // Create a test grammar topic
    const topic = new GrammarTopic({
      title: 'Subject-Verb Agreement Test',
      category: 'Subject-Verb Agreement',
      level: 'Beginner',
      description: 'Test description',
      ruleSummary: 'Test rule summary',
      questions: [
        {
          question: 'They ___ playing football.',
          options: ['is', 'are', 'was', 'am'],
          correctAnswer: 1,
          explanation: 'Plural subject "They" takes "are".',
        },
        {
          question: 'He ___ every day.',
          options: ['run', 'runs', 'running', 'ran'],
          correctAnswer: 1,
          explanation: 'Singular subject "He" takes "runs".',
        },
      ],
    });
    await topic.save();
    topicId = topic._id.toString();
  });

  test('GET /api/grammar lists topics with progress stats', async () => {
    const res = await request(app)
      .get('/api/grammar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((t) => t._id === topicId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Subject-Verb Agreement Test');
    expect(found.completed).toBe(false);
  });

  test('POST /api/grammar/:id/submit evaluates answers and awards XP', async () => {
    // Submit correct answers [1, 1]
    const res = await request(app)
      .post(`/api/grammar/${topicId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1, 1] });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(100);
    expect(res.body.correctCount).toBe(2);
    expect(res.body.xpEarned).toBeGreaterThan(0);
    expect(res.body.evaluatedAnswers.length).toBe(2);
    expect(res.body.evaluatedAnswers[0].isCorrect).toBe(true);
  });
});
