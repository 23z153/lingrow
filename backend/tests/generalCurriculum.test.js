const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const Passage = require('../src/models/Passage');
const DebateTopic = require('../src/models/DebateTopic');
const ListeningClip = require('../src/models/ListeningClip');
const { signAccessToken } = require('../src/utils/tokens');

const app = createApp();

describe('General Curriculum Endpoints (No Department Required)', () => {
  let token;
  let user;

  beforeEach(async () => {
    // Seed general content in beforeEach so it persists per test
    await Passage.create([
      {
        title: 'Morning Routine',
        level: 'Beginner',
        category: 'Daily Life',
        text: 'Every morning begins with a glass of fresh water and a short walk outside. The air is crisp and cool. Birds sing in the high branches of the oak tree. Starting the day calmly helps you focus on your goals and stay energized throughout the afternoon.',
        active: true,
        department: 'General',
        wordCount: 46,
        estimatedReadingTime: '1 min'
      }
    ]);

    await DebateTopic.create({
      topic: 'Should remote work become the permanent standard for modern companies?',
      level: 'Beginner',
      active: true,
      department: 'General',
      context: 'Debate on remote work flexibility versus in-person collaboration.',
      proArguments: ['Flexible schedule', 'Zero commute time'],
      conArguments: ['Reduced team bonding', 'Home distractions']
    });

    await ListeningClip.create({
      title: 'Visiting the City Library',
      level: 'Beginner',
      active: true,
      department: 'General',
      script: 'Welcome to the central city library. Books are arranged across three quiet floors.',
      question: 'Where can visitors explore books?',
      duration: '45s'
    });

    user = new User({
      name: 'Curriculum Learner',
      email: `learner.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'student',
      xp: 150,
      level: 'Beginner',
    });
    await user.setPassword('password123');
    await user.save();

    token = signAccessToken(user);
  });

  test('GET /api/practice/passages returns active passages matching level with wordCount & estimatedReadingTime', async () => {
    const res = await request(app)
      .get('/api/practice/passages')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    
    const passage = res.body[0];
    expect(passage.title).toBe('Morning Routine');
    expect(passage.text).toBeDefined();
    expect(passage.wordCount).toBe(46);
    expect(passage.estimatedReadingTime).toBe('~1 min read');
    expect(passage.level).toBe('Beginner');
  });

  test('GET /api/debate/topics/next returns active general topic without department constraint', async () => {
    const res = await request(app)
      .get('/api/debate/topics/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.topic).toBeDefined();
    expect(res.body.topic.active).toBe(true);
    expect(res.body.topic.department).toBe('General');
    expect(res.body.topic.topic).toContain('remote work');
  });

  test('GET /api/listening/clips returns active clips without requiring department param', async () => {
    const res = await request(app)
      .get('/api/listening/clips')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].title).toBe('Visiting the City Library');
  });
});
