const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const { signAccessToken } = require('../src/utils/tokens');

const app = createApp();

describe('Teacher-Led Group Discussion (GD) Rooms API', () => {
  let teacherToken;
  let student1Token;
  let student2Token;

  beforeEach(async () => {
    // Attempt registration endpoint first (test mode) or fallback to direct model creation
    try {
      const regTeacher = await request(app).post('/api/auth/register').send({
        name: 'GD Host Teacher',
        email: `teacher.gd.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
        password: 'password123',
        role: 'teacher',
      });
      if (regTeacher.status === 201) {
        teacherToken = regTeacher.body.token;

        const regS1 = await request(app).post('/api/auth/register').send({
          name: 'Student Participant 1',
          email: `student.gd.1.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
          password: 'password123',
          role: 'student',
        });
        student1Token = regS1.body.token;

        const regS2 = await request(app).post('/api/auth/register').send({
          name: 'Student Participant 2',
          email: `student.gd.2.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
          password: 'password123',
          role: 'student',
        });
        student2Token = regS2.body.token;
        return;
      }
    } catch (e) {}

    // Fallback: direct user creation + token signing
    const teacherUser = new User({
      name: 'GD Host Teacher',
      email: `teacher.gd.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'teacher',
      createdByAdmin: true,
      emailVerified: true,
    });
    await teacherUser.setPassword('password123');
    await teacherUser.save();
    teacherToken = signAccessToken(teacherUser);

    const s1User = new User({
      name: 'Student Participant 1',
      email: `student.gd.1.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'student',
      createdByAdmin: true,
      emailVerified: true,
    });
    await s1User.setPassword('password123');
    await s1User.save();
    student1Token = signAccessToken(s1User);

    const s2User = new User({
      name: 'Student Participant 2',
      email: `student.gd.2.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'student',
      createdByAdmin: true,
      emailVerified: true,
    });
    await s2User.setPassword('password123');
    await s2User.save();
    student2Token = signAccessToken(s2User);
  });

  test('Teacher can create a GD Room with topic and max student count', async () => {
    const res = await request(app)
      .post('/api/gd/rooms')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        topic: 'Impact of AI on Modern Careers',
        maxStudents: 4,
        targetDurationMinutes: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.topic).toBe('Impact of AI on Modern Careers');
    expect(res.body.maxStudents).toBe(4);
    expect(res.body.status).toBe('LOBBY');
  });

  test('Students can join GD Room lobby and reach live room upon start', async () => {
    // 1. Create Room
    const roomRes = await request(app)
      .post('/api/gd/rooms')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        topic: 'Campus Placement Interview Strategies',
        maxStudents: 2,
        targetDurationMinutes: 3,
      });

    const roomId = roomRes.body._id;

    // 2. Student 1 joins
    const join1 = await request(app)
      .post(`/api/gd/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(join1.status).toBe(200);
    expect(join1.body.participants.length).toBe(1);

    // 3. Student 2 joins
    const join2 = await request(app)
      .post(`/api/gd/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${student2Token}`);

    expect(join2.status).toBe(200);
    expect(join2.body.participants.length).toBe(2);

    // 4. Teacher starts GD
    const startRes = await request(app)
      .post(`/api/gd/rooms/${roomId}/start`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(startRes.status).toBe(200);
    expect(startRes.body.status).toBe('IN_PROGRESS');

    // 5. Students submit speech contributions
    const speech1 = await request(app)
      .post(`/api/gd/rooms/${roomId}/speech`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ text: 'In my opinion, preparing technical algorithms and communication skills is essential for campus placements.' });

    expect(speech1.status).toBe(200);

    const speech2 = await request(app)
      .post(`/api/gd/rooms/${roomId}/speech`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ text: 'I agree with your point. However, practicing mock interviews also builds confidence.' });

    expect(speech2.status).toBe(200);

    // 6. End session & evaluate AI reports
    const endRes = await request(app)
      .post(`/api/gd/rooms/${roomId}/end`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(endRes.status).toBe(200);
    expect(endRes.body.status).toBe('COMPLETED');
    expect(endRes.body.reports.length).toBe(2);
    expect(endRes.body.reports[0].overallScore).toBeGreaterThan(50);
    expect(endRes.body.reports[0].suggestions.length).toBeGreaterThan(0);
  });
});
