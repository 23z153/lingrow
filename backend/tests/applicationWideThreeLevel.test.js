const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../src/app');
const User = require('../src/models/User');
const Passage = require('../src/models/Passage');
const Test = require('../src/models/Test');
const { getLevelPedagogyInstructions } = require('../src/services/prompts');
const { createTestUser } = require('./helpers/createUser');

const app = createApp();

describe('Application-Wide Three-Level Learning Architecture', () => {
  async function createStudent(unlockedLevels = ['Beginner'], xp = 0) {
    const level = unlockedLevels.includes('Advanced') ? 'Advanced' : unlockedLevels.includes('Intermediate') ? 'Intermediate' : 'Beginner';
    const created = await createTestUser({
      name: 'Rohan Cadet',
      role: 'student',
      level,
      unlockedLevels,
      onboardingCompleted: true,
      xp,
    });
    return { token: created.token, user: created.user, email: created.user.email };
  }

  async function createTeacher() {
    const created = await createTestUser({
      name: 'Prof. Demo',
      role: 'teacher',
      onboardingCompleted: true,
    });
    return { token: created.token, user: created.user, email: created.user.email };
  }

  beforeEach(async () => {
    // Seed test passages for all 3 levels
    await Passage.create([
      { title: 'Beginner Test Passage', level: 'Beginner', text: 'This is a simple beginner text for reading.', wordCount: 8, active: true },
      { title: 'Intermediate Test Passage', level: 'Intermediate', text: 'This intermediate passage contains cohesive narrative markers.', wordCount: 8, active: true },
      { title: 'Advanced Test Passage', level: 'Advanced', text: 'Scarcely had the council adjourned when negotiations stalled.', wordCount: 8, active: true },
    ]);

    // Seed test assessment
    await Test.create({
      title: 'Advanced Trials Test',
      category: 'Inversions',
      level: 'Advanced',
      status: 'published',
      targetType: 'ALL',
      createdBy: new mongoose.Types.ObjectId(),
      questions: [
        { question: 'Under no circumstances ___ the premises.', options: ['leave', 'should you leave'], correctAnswer: 1, explanation: 'Inversion required' },
      ],
    });
  });

  test('Complete End-to-End Progression Flow: Beginner -> Intermediate -> Advanced', async () => {
    const student = await createStudent(['Beginner']);

    // 1 & 2: Initial state: Beginner unlocked, Intermediate & Advanced locked
    const initRes = await request(app)
      .get('/api/challenges')
      .set('Authorization', `Bearer ${student.token}`);
    expect(initRes.status).toBe(200);
    expect(initRes.body.unlockedLevels).toEqual(['Beginner']);
    expect(initRes.body.levels.Beginner.unlocked).toBe(true);
    expect(initRes.body.levels.Intermediate.unlocked).toBe(false);
    expect(initRes.body.levels.Advanced.unlocked).toBe(false);

    // 3: Beginner activities accessible across modules
    const begPassage = await request(app)
      .get('/api/practice/passages?level=Beginner')
      .set('Authorization', `Bearer ${student.token}`);
    expect(begPassage.status).toBe(200);

    const begStory = await request(app)
      .get('/api/story/prompts?level=Beginner')
      .set('Authorization', `Bearer ${student.token}`);
    expect(begStory.status).toBe(200);

    // 4: Locked Intermediate activities reject with 403 Forbidden
    const lockedPassage = await request(app)
      .get('/api/practice/passages?level=Intermediate')
      .set('Authorization', `Bearer ${student.token}`);
    expect(lockedPassage.status).toBe(403);
    expect(lockedPassage.body.locked).toBe(true);

    const lockedChallenge = await request(app)
      .post('/api/challenges/escape-i1/complete')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ score: 100 });
    expect(lockedChallenge.status).toBe(403);
    expect(lockedChallenge.body.locked).toBe(true);

    // 5: Complete 4 Beginner activities (does not auto-unlock next tier; level promotion requires explicit assignment)
    await request(app).post('/api/challenges/detective-b1/complete').set('Authorization', `Bearer ${student.token}`).send({ score: 100 });
    await request(app).post('/api/challenges/escape-b1/complete').set('Authorization', `Bearer ${student.token}`).send({ score: 100 });
    await request(app).post('/api/challenges/battle-b1/complete').set('Authorization', `Bearer ${student.token}`).send({ score: 100 });
    const b4 = await request(app).post('/api/challenges/quest-b1/complete').set('Authorization', `Bearer ${student.token}`).send({ score: 100 });

    expect(b4.status).toBe(200);
    expect(b4.body.justUnlockedLevel).toBe(null);
    expect(b4.body.unlockedLevels).toEqual(['Beginner']);

    // Promote student to Intermediate
    await User.findByIdAndUpdate(student.user._id, { level: 'Intermediate' });

    // 6: Intermediate activities now accessible
    const intPassage = await request(app)
      .get('/api/practice/passages?level=Intermediate')
      .set('Authorization', `Bearer ${student.token}`);
    expect(intPassage.status).toBe(200);

    const intChallenge = await request(app)
      .post('/api/challenges/escape-i1/complete')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ score: 100 });
    expect(intChallenge.status).toBe(200);

    // 7: Advanced still locked
    const lockedAdv = await request(app)
      .get('/api/practice/passages?level=Advanced')
      .set('Authorization', `Bearer ${student.token}`);
    expect(lockedAdv.status).toBe(403);

    // Complete 3 more Intermediate activities (total 4)
    await request(app).post('/api/challenges/detective-i1/complete').set('Authorization', `Bearer ${student.token}`).send({ score: 100 });
    await request(app).post('/api/challenges/battle-i1/complete').set('Authorization', `Bearer ${student.token}`).send({ score: 100 });
    const i4 = await request(app).post('/api/challenges/quest-i1/complete').set('Authorization', `Bearer ${student.token}`).send({ score: 100 });

    expect(i4.status).toBe(200);
    expect(i4.body.justUnlockedLevel).toBe(null);
    expect(i4.body.unlockedLevels).toEqual(['Beginner', 'Intermediate']);

    // Promote student to Advanced
    await User.findByIdAndUpdate(student.user._id, { level: 'Advanced' });

    // 8: Advanced activities now accessible
    const advPassage = await request(app)
      .get('/api/practice/passages?level=Advanced')
      .set('Authorization', `Bearer ${student.token}`);
    expect(advPassage.status).toBe(200);

    const advChallenge = await request(app)
      .post('/api/challenges/detective-a1/complete')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ score: 100 });
    expect(advChallenge.status).toBe(200);

    // 12: Progress persists across login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: student.email, password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.unlockedLevels).toContain('Beginner');
    expect(loginRes.body.user.unlockedLevels).toContain('Intermediate');
    expect(loginRes.body.user.unlockedLevels).toContain('Advanced');

    // 13: Repeated completions do not award duplicate XP
    const startUser = await User.findById(student.user.id);
    const startXP = startUser.xp;

    const dupRes = await request(app)
      .post('/api/challenges/detective-b1/complete')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ score: 100 });

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.isFirstTime).toBe(false);
    expect(dupRes.body.xpAwarded).toBe(0);

    const afterUser = await User.findById(student.user.id);
    expect(afterUser.xp).toBe(startXP);
  });

  test('Ignis AI Mentor adapts pedagogy and enforces locked level boundaries', () => {
    const begPrompt = getLevelPedagogyInstructions('Beginner', ['Beginner']);
    expect(begPrompt).toContain('[TIER: BEGINNER LEARNER]');
    expect(begPrompt).toContain('simple, accessible English');
    expect(begPrompt).toContain('Intermediate, Advanced'); // locked tiers

    const advPrompt = getLevelPedagogyInstructions('Advanced', ['Beginner', 'Intermediate', 'Advanced']);
    expect(advPrompt).toContain('[TIER: ADVANCED LEARNER]');
    expect(advPrompt).toContain('executive presence');
  });

  test('Assessments are open to onboarded beginner students without learner-tier locking (Item 10)', async () => {
    const student = await createStudent(['Beginner']);
    const advTest = await Test.findOne({ title: 'Advanced Trials Test' });

    const takeRes = await request(app)
      .get(`/api/tests/${advTest._id}/take`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(takeRes.status).toBe(200);
    expect(takeRes.body.title).toBe('Advanced Trials Test');
  });

  test('Teacher and Admin roles remain unrestricted by learning tier locks', async () => {
    const teacher = await createTeacher();

    const topicsRes = await request(app)
      .get('/api/tests/topics')
      .set('Authorization', `Bearer ${teacher.token}`);

    expect(topicsRes.status).toBe(200);
    expect(topicsRes.body.topics).toBeDefined();
    expect(Array.isArray(topicsRes.body.topics)).toBe(true);
  });
});
