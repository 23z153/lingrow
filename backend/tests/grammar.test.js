const request = require('supertest');
const createApp = require('../src/app');
const GrammarTopic = require('../src/models/GrammarTopic');
const GrammarProgress = require('../src/models/GrammarProgress');

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

describe('Grammar API Routes & Sequential Unlock', () => {
  let token;
  let topic1Id;
  let topic2Id;

  beforeEach(async () => {
    // Create test user and token
    const reg = await request(app).post('/api/auth/register').send(newUserPayload());
    token = reg.body.token;

    // Create topic 1
    const topic1 = new GrammarTopic({
      topicId: 1,
      title: 'What is a sentence?',
      category: 'Sentence Foundations',
      level: 'Beginner',
      description: 'Understanding sentence structure',
      ruleSummary: 'A sentence must express a complete thought.',
      questions: [
        {
          question: 'Which of the following is a complete sentence?',
          options: ['Running fast.', 'The dog barked loudly.', 'Under the tree.', 'Because he was late.'],
          correctAnswer: 1,
          explanation: '"The dog barked loudly" has both a subject and predicate.',
        },
        {
          question: 'A complete sentence must contain a subject and a ___.',
          options: ['comma', 'predicate', 'quote', 'bracket'],
          correctAnswer: 1,
          explanation: 'Every complete sentence requires a subject and a predicate.',
        },
      ],
    });
    await topic1.save();
    topic1Id = topic1._id.toString();

    // Create topic 2
    const topic2 = new GrammarTopic({
      topicId: 2,
      title: 'Subject and Predicate',
      category: 'Sentence Foundations',
      level: 'Beginner',
      description: 'Identifying parts of a sentence',
      ruleSummary: 'Subject is who or what; predicate tells what the subject does.',
      questions: [
        {
          question: 'Identify the subject: "The children played happily."',
          options: ['played happily', 'The children', 'happily', 'children played'],
          correctAnswer: 1,
          explanation: '"The children" is the subject performing the action.',
        },
      ],
    });
    await topic2.save();
    topic2Id = topic2._id.toString();
  });

  test('GET /api/grammar lists topics with sequential lock status', async () => {
    const res = await request(app)
      .get('/api/grammar')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const t1 = res.body.find((t) => t._id.toString() === topic1Id);
    const t2 = res.body.find((t) => t._id.toString() === topic2Id);

    expect(t1).toBeDefined();
    expect(t1.isLocked).toBe(false); // First topic is always unlocked
    expect(t1.completed).toBe(false);

    expect(t2).toBeDefined();
    expect(t2.isLocked).toBe(true); // Second topic is locked until topic 1 completes
  });

  test('Submit for a locked topic returns 403', async () => {
    // Attempting to access topic 2 test while locked
    const getRes = await request(app)
      .get(`/api/grammar/${topic2Id}/test`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.error).toMatch(/locked/i);

    // Attempting to submit topic 2 while locked
    const postRes = await request(app)
      .post(`/api/grammar/${topic2Id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1] });

    expect(postRes.status).toBe(403);
    expect(postRes.body.error).toMatch(/locked/i);
  });

  test('Submit a failing test keeps topic 2 locked and response explains why', async () => {
    // Submit topic 1 with failing answers (0/2 = 0% < 60%)
    const failRes = await request(app)
      .post(`/api/grammar/${topic1Id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [0, 0] });

    expect(failRes.status).toBe(200);
    expect(failRes.body.passed).toBe(false);
    expect(failRes.body.score).toBe(0);
    expect(failRes.body.passPercent).toBe(60);
    expect(failRes.body.message).toMatch(/Need 60% to unlock the next topic/i);
    expect(failRes.body.xpEarned).toBe(0);

    // Progress should still be 0 completed topics
    const progRes = await request(app)
      .get('/api/grammar/progress')
      .set('Authorization', `Bearer ${token}`);

    expect(progRes.status).toBe(200);
    expect(progRes.body.completedCount).toBe(0);
    expect(progRes.body.completedTopicIds).not.toContain(topic1Id);

    // Topic 2 must stay locked
    const listRes = await request(app)
      .get('/api/grammar')
      .set('Authorization', `Bearer ${token}`);

    const t2 = listRes.body.find((t) => t._id.toString() === topic2Id);
    expect(t2.isLocked).toBe(true);

    const t2Test = await request(app)
      .get(`/api/grammar/${topic2Id}/test`)
      .set('Authorization', `Bearer ${token}`);
    expect(t2Test.status).toBe(403);
  });

  test('Submit a passing test for topic 1 unlocks topic 2, updates progress and awards XP once', async () => {
    // 1. Submit topic 1 with passing score (2/2 = 100% >= 60%)
    const passRes = await request(app)
      .post(`/api/grammar/${topic1Id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1, 1] });

    expect(passRes.status).toBe(200);
    expect(passRes.body.score).toBe(100);
    expect(passRes.body.passed).toBe(true);
    expect(passRes.body.xpEarned).toBe(25);
    expect(passRes.body.progress).toBeDefined();
    expect(passRes.body.progress.completedCount).toBe(1);
    expect(passRes.body.progress.completedTopicIds).toContain(topic1Id);

    // 2. Check grammar progress endpoint
    const progRes = await request(app)
      .get('/api/grammar/progress')
      .set('Authorization', `Bearer ${token}`);

    expect(progRes.status).toBe(200);
    expect(progRes.body.completedCount).toBe(1);
    expect(progRes.body.completedTopicIds).toContain(topic1Id);

    // 3. Topic 2 should now be unlocked in list
    const listRes = await request(app)
      .get('/api/grammar')
      .set('Authorization', `Bearer ${token}`);

    const t2 = listRes.body.find((t) => t._id.toString() === topic2Id);
    expect(t2.isLocked).toBe(false);

    // 4. Topic 2 test is now accessible
    const t2Test = await request(app)
      .get(`/api/grammar/${topic2Id}/test`)
      .set('Authorization', `Bearer ${token}`);
    expect(t2Test.status).toBe(200);

    // 5. Retaking topic 1 with passing score does NOT re-award +25 XP
    const retakeRes = await request(app)
      .post(`/api/grammar/${topic1Id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1, 1] });

    expect(retakeRes.status).toBe(200);
    expect(retakeRes.body.xpEarned).toBe(0); // Only on first completion!
  });

  test('ID type mismatch (numeric vs string id) does not break lookup or unlock', async () => {
    // Access topic 1 by numeric ID 1
    const testByNum = await request(app)
      .get('/api/grammar/1/test')
      .set('Authorization', `Bearer ${token}`);

    expect(testByNum.status).toBe(200);
    expect(testByNum.body.title).toBe('What is a sentence?');

    // Submit topic 1 using numeric id "1"
    const submitByNum = await request(app)
      .post('/api/grammar/1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1, 1] });

    expect(submitByNum.status).toBe(200);
    expect(submitByNum.body.passed).toBe(true);

    // Topic 2 accessible by numeric id "2" now
    const test2ByNum = await request(app)
      .get('/api/grammar/2/test')
      .set('Authorization', `Bearer ${token}`);

    expect(test2ByNum.status).toBe(200);
    expect(test2ByNum.body.title).toBe('Subject and Predicate');
  });
});
