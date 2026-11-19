const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const WeakWord = require('../src/models/WeakWord');
const { createTestUser } = require('./helpers/createUser');

const app = createApp();

describe('Weak Words Lab API Routes', () => {
  let studentToken;
  let studentUser;
  let teacherToken;
  let otherStudentToken;

  beforeEach(async () => {
    // 1. Create a student
    const student = await createTestUser({
      name: 'WeakWord Student',
      role: 'student',
      level: 'Beginner',
      onboardingCompleted: true,
    });
    studentToken = student.token;
    studentUser = student.user;

    // 2. Create another student for access control testing
    const otherStudent = await createTestUser({
      name: 'Other Student',
      role: 'student',
      level: 'Beginner',
      onboardingCompleted: true,
    });
    otherStudentToken = otherStudent.token;

    // 3. Create a teacher
    const teacher = await createTestUser({
      name: 'Teacher Smith',
      role: 'teacher',
      assignedClasses: ['A'],
      onboardingCompleted: true,
    });
    teacherToken = teacher.token;
  });

  test('POST /api/weakwords/bulk validates, sanitizes, and upserts words', async () => {
    const res = await request(app)
      .post('/api/weakwords/bulk')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        words: ['Algorithm', 'asynchronous!', 'Scalable', 'a'], // 'a' is too short
        source: 'read-aloud',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);

    const wordsInDb = await WeakWord.find({ userId: studentUser._id });
    expect(wordsInDb.length).toBe(3);

    const algo = wordsInDb.find((w) => w.word === 'algorithm');
    expect(algo).toBeDefined();
    expect(algo.missCount).toBe(1);
    expect(algo.stage).toBe('new');
    expect(algo.source).toBe('read-aloud');
    expect(algo.phonetic).toBeDefined();

    // Re-posting same word increments missCount and resets stage to learning
    const res2 = await request(app)
      .post('/api/weakwords/bulk')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        words: ['algorithm'],
        source: 'read-aloud',
      });

    expect(res2.status).toBe(201);
    const updatedAlgo = await WeakWord.findById(algo._id);
    expect(updatedAlgo.missCount).toBe(2);
    expect(updatedAlgo.stage).toBe('learning');
    expect(updatedAlgo.correctStreak).toBe(0);
  });

  test('GET /api/weakwords/due returns due non-mastered words up to limit', async () => {
    const now = Date.now();
    await WeakWord.create([
      {
        userId: studentUser._id,
        word: 'due1',
        nextReviewAt: new Date(now - 10000),
        stage: 'new',
      },
      {
        userId: studentUser._id,
        word: 'due2',
        nextReviewAt: new Date(now - 5000),
        stage: 'learning',
      },
      {
        userId: studentUser._id,
        word: 'futureword',
        nextReviewAt: new Date(now + 100000),
        stage: 'learning',
      },
      {
        userId: studentUser._id,
        word: 'masteredword',
        nextReviewAt: new Date(now - 10000),
        stage: 'mastered',
      },
    ]);

    const res = await request(app)
      .get('/api/weakwords/due?limit=5')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    const words = res.body.map((w) => w.word);
    expect(words).toContain('due1');
    expect(words).toContain('due2');
    expect(words).not.toContain('futureword');
    expect(words).not.toContain('masteredword');
  });

  test('GET /api/weakwords returns all words and accurate stage counts', async () => {
    const now = Date.now();
    await WeakWord.create([
      { userId: studentUser._id, word: 'word1', stage: 'new', nextReviewAt: new Date(now - 1000) },
      { userId: studentUser._id, word: 'word2', stage: 'learning', nextReviewAt: new Date(now + 50000) },
      { userId: studentUser._id, word: 'word3', stage: 'almost', nextReviewAt: new Date(now - 1000) },
      { userId: studentUser._id, word: 'word4', stage: 'mastered', nextReviewAt: new Date(now + 100000) },
    ]);

    const res = await request(app)
      .get('/api/weakwords')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.words.length).toBe(4);
    expect(res.body.counts.new).toBe(1);
    expect(res.body.counts.learning).toBe(1);
    expect(res.body.counts.almost).toBe(1);
    expect(res.body.counts.mastered).toBe(1);
    expect(res.body.counts.due).toBe(2); // word1 & word3
    expect(res.body.counts.total).toBe(4);
  });

  test('POST /api/weakwords/:id/result implements spaced repetition, XP, and Word Smith badge', async () => {
    const wordDoc = await WeakWord.create({
      userId: studentUser._id,
      word: 'persist',
      stage: 'learning',
      correctStreak: 1,
      nextReviewAt: new Date(),
    });

    // 1. Wrong answer resets streak to 0, stage to learning, next review +1 day, 0 XP
    const wrongRes = await request(app)
      .post(`/api/weakwords/${wordDoc._id}/result`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ correct: false });

    expect(wrongRes.status).toBe(200);
    expect(wrongRes.body.word.correctStreak).toBe(0);
    expect(wrongRes.body.word.stage).toBe('learning');
    expect(wrongRes.body.xpAwarded).toBe(0);

    // 2. Correct review streak 1 (+5 XP, stage 'learning')
    const correct1 = await request(app)
      .post(`/api/weakwords/${wordDoc._id}/result`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ correct: true });

    expect(correct1.status).toBe(200);
    expect(correct1.body.word.correctStreak).toBe(1);
    expect(correct1.body.word.stage).toBe('learning');
    expect(correct1.body.xpAwarded).toBe(5);

    // 3. Correct review streak 2 (+5 XP, stage 'almost')
    const correct2 = await request(app)
      .post(`/api/weakwords/${wordDoc._id}/result`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ correct: true });

    expect(correct2.status).toBe(200);
    expect(correct2.body.word.correctStreak).toBe(2);
    expect(correct2.body.word.stage).toBe('almost');
    expect(correct2.body.xpAwarded).toBe(5);

    // 4. Correct review streak 3 -> Mastered (+15 XP = 5 base + 10 mastery bonus)
    const correct3 = await request(app)
      .post(`/api/weakwords/${wordDoc._id}/result`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ correct: true });

    expect(correct3.status).toBe(200);
    expect(correct3.body.word.correctStreak).toBe(3);
    expect(correct3.body.word.stage).toBe('mastered');
    expect(correct3.body.xpAwarded).toBe(15);
    expect(correct3.body.becameMastered).toBe(true);

    // 5. Test Word Smith badge unlock on 10 mastered words
    const batchMastered = [];
    for (let i = 0; i < 9; i++) {
      batchMastered.push({
        userId: studentUser._id,
        word: `mastered_${i}`,
        stage: 'mastered',
        correctStreak: 3,
      });
    }
    await WeakWord.create(batchMastered);

    // Now persist another word and master it to trigger 10th mastered badge
    const tenthWord = await WeakWord.create({
      userId: studentUser._id,
      word: 'triumphant',
      stage: 'almost',
      correctStreak: 2,
    });

    const badgeRes = await request(app)
      .post(`/api/weakwords/${tenthWord._id}/result`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ correct: true });

    expect(badgeRes.status).toBe(200);
    expect(badgeRes.body.becameMastered).toBe(true);
    expect(badgeRes.body.badgeUnlocked).toBeDefined();
    expect(badgeRes.body.badgeUnlocked.name).toBe('Word Smith');
  });

  test('Access control: student cannot review or delete another student word', async () => {
    const wordDoc = await WeakWord.create({
      userId: studentUser._id,
      word: 'privateword',
    });

    const reviewRes = await request(app)
      .post(`/api/weakwords/${wordDoc._id}/result`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ correct: true });

    expect(reviewRes.status).toBe(403);

    const delRes = await request(app)
      .delete(`/api/weakwords/${wordDoc._id}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect(delRes.status).toBe(404);
  });

  test('DELETE /api/weakwords/:id removes a weak word successfully', async () => {
    const wordDoc = await WeakWord.create({
      userId: studentUser._id,
      word: 'deleteme',
    });

    const res = await request(app)
      .delete(`/api/weakwords/${wordDoc._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const found = await WeakWord.findById(wordDoc._id);
    expect(found).toBeNull();
  });

  test('GET /api/weakwords/class-summary aggregates top missed words for teachers, rejects students', async () => {
    // 1. Student access should be rejected with 403
    const studentCheck = await request(app)
      .get('/api/weakwords/class-summary')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentCheck.status).toBe(403);

    // 2. Populate some missed words across studentUser
    await WeakWord.create([
      { userId: studentUser._id, word: 'pronunciation', missCount: 7, stage: 'learning' },
      { userId: studentUser._id, word: 'hierarchy', missCount: 5, stage: 'new' },
    ]);

    // 3. Teacher access should succeed
    const teacherCheck = await request(app)
      .get('/api/weakwords/class-summary')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(teacherCheck.status).toBe(200);
    expect(teacherCheck.body.topMissed).toBeDefined();
    expect(Array.isArray(teacherCheck.body.topMissed)).toBe(true);

    const pronun = teacherCheck.body.topMissed.find((w) => w.word === 'pronunciation');
    expect(pronun).toBeDefined();
    expect(pronun.totalMisses).toBeGreaterThanOrEqual(7);
  });
});
