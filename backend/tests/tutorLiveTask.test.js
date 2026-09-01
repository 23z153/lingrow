const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const TutorMessage = require('../src/models/TutorMessage');
const { signAccessToken } = require('../src/utils/tokens');

const app = createApp();

describe('Live Task Chatbot & Admin Monitoring API', () => {
  let studentToken;
  let adminToken;
  let studentUser;

  beforeEach(async () => {
    studentUser = new User({
      name: 'Task Student',
      email: `task.student.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'student',
      department: 'CSE',
      xp: 150,
      level: 'Beginner',
    });
    await studentUser.setPassword('password123');
    await studentUser.save();
    studentToken = signAccessToken(studentUser);

    const adminUser = new User({
      name: 'Admin User',
      email: `admin.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'admin',
    });
    await adminUser.setPassword('password123');
    await adminUser.save();
    adminToken = signAccessToken(adminUser);
  });

  test('POST /api/tutor/message analyzes live student tasks and answers English query', async () => {
    const res = await request(app)
      .post('/api/tutor/message')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'How am I doing on my live task and progress?' });

    expect(res.status).toBe(201);
    expect(res.body.reply).toBeDefined();
    expect(res.body.reply.text).toContain('150 total XP');
  });

  test('GET /api/admin/tutor-logs returns logged student chatbot queries for Admin', async () => {
    // Send a message first
    await request(app)
      .post('/api/tutor/message')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'What is the rule for present perfect tense?' });

    const logsRes = await request(app)
      .get('/api/admin/tutor-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(logsRes.status).toBe(200);
    expect(Array.isArray(logsRes.body)).toBe(true);
    expect(logsRes.body.length).toBeGreaterThan(0);
    expect(logsRes.body[0].userName).toBeDefined();
  });
});
