const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const DebateTopic = require('../src/models/DebateTopic');
const DebateAttempt = require('../src/models/DebateAttempt');
const { signAccessToken } = require('../src/utils/tokens');
const { stripTranscriptTags } = require('../src/services/llmService');
const { requireMinXP } = require('../src/middleware/levelGate');

const app = createApp();

describe('Debate: Topic Rotation, Tag Stripping, Dept Filters & Level Gate', () => {
  let token;
  let user;
  let topicA;
  let topicB;
  let topicCSE;

  const validSpeech45Words =
    'Firstly, adopting generative AI tutors creates an unprecedented democratization of collegiate learning by providing real-time responsive guidance to every undergraduate student regardless of economic background. Furthermore, static textbooks cannot adapt to idiosyncratic cognitive roadblocks. On the contrary, interactive models assess comprehension dynamically. Therefore, modern academic institutions must embrace digital pedagogy immediately.';

  beforeEach(async () => {
    await DebateTopic.deleteMany({});
    await DebateAttempt.deleteMany({});

    topicA = await DebateTopic.create({
      topic: 'Topic A: Should attendance be mandatory for undergraduates?',
      level: 'Intermediate',
      difficulty: 'intermediate',
      department: 'General',
      active: true,
      tags: ['Academics', 'Policy'],
      keyTerms: [{ term: 'Compulsory Attendance', meaning: 'Required presence.' }],
      forKeyPoints: ['Ensures regular student engagement', 'Fosters peer discussions'],
      againstKeyPoints: ['Restricts independent study autonomy', 'Encourages passive attendance'],
    });

    topicB = await DebateTopic.create({
      topic: 'Topic B: Is remote work superior to office collaboration?',
      level: 'Advanced',
      difficulty: 'advanced',
      department: 'General',
      active: true,
      tags: ['Workplace', 'Economy'],
      keyTerms: [{ term: 'Telecommuting', meaning: 'Remote work infrastructure.' }],
      forKeyPoints: ['Saves commuting hours', 'Expands global hiring'],
      againstKeyPoints: ['Reduces spontaneous mentorship', 'Increases digital fatigue'],
    });

    topicCSE = await DebateTopic.create({
      topic: 'Topic CSE: Should microservices always replace monolithic architectures?',
      level: 'Intermediate',
      difficulty: 'intermediate',
      department: 'CSE',
      active: true,
      tags: ['Engineering', 'Software'],
      keyTerms: [{ term: 'Decoupled Services', meaning: 'Modular deployable components.' }],
      forKeyPoints: ['Independent team scaling', 'Fault isolation across modules'],
      againstKeyPoints: ['Distributed transaction complexity', 'Elevated network latency'],
    });

    user = new User({
      name: 'Rotation Debater',
      email: `rotation.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      role: 'student',
      xp: 400,
      level: 'Intermediate',
    });
    await user.setPassword('secret123');
    await user.save();

    token = signAccessToken(user);
  });

  describe('Transcript Tag Stripping Loop', () => {
    test('loops until all split or nested <transcript> tags are completely stripped', () => {
      const nested1 = 'Speech with <trans<transcript>cript> injected tag';
      expect(stripTranscriptTags(nested1)).toBe('Speech with  injected tag');

      const nested2 = 'Speech with </trans</transcript>cript> closing tag';
      expect(stripTranscriptTags(nested2)).toBe('Speech with  closing tag');

      const multiNested = 'Speech with <trans<trans<transcript>cript>cript> multiple nestings';
      expect(stripTranscriptTags(multiNested)).toBe('Speech with  multiple nestings');
    });
  });

  describe('Topic Rotation: 3-Pool Architecture & Both-Stances Rule', () => {
    test('serves topic with 0 attempts first (Pool 1)', async () => {
      const res = await request(app)
        .get('/api/debate/topics/next')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.topic).toBeDefined();
      expect(res.body.retry).toBe(false);
      expect(res.body.attemptedStances).toEqual([]);
    });

    test('serves topic with 1 stance attempted next (Pool 2) and suggests opposite stance', async () => {
      await DebateTopic.deleteMany({ _id: { $ne: topicA._id } });
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 75 },
      });

      const res = await request(app)
        .get('/api/debate/topics/next')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.topic._id).toBe(String(topicA._id));
      expect(res.body.attemptedStances).toContain('for');
      expect(res.body.suggestedStance).toBe('against');
    });

    test('pool exhaustion: returns lowest-scoring past topic with retry:true when all stances done', async () => {
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 60 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicA._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { overall: 65 },
      });

      await DebateAttempt.create({
        user: user._id,
        topic: topicB._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 90 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicB._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { overall: 92 },
      });

      await DebateAttempt.create({
        user: user._id,
        topic: topicCSE._id,
        stance: 'for',
        transcript: validSpeech45Words,
        scores: { overall: 85 },
      });
      await DebateAttempt.create({
        user: user._id,
        topic: topicCSE._id,
        stance: 'against',
        transcript: validSpeech45Words,
        scores: { overall: 88 },
      });

      const res = await request(app)
        .get('/api/debate/topics/next')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.retry).toBe(true);
      expect(res.body.topic._id).toBe(String(topicA._id));
    });
  });

  describe('Department Filtering & Preferences Endpoint', () => {
    test('respects department query parameter', async () => {
      const res = await request(app)
        .get('/api/debate/topics/next?department=CSE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.topic.department).toBe('CSE');
      expect(res.body.topic._id).toBe(String(topicCSE._id));
    });

    test('PUT /api/debate/preferences updates user selectedDebateDept and rotates accordingly', async () => {
      const putRes = await request(app)
        .put('/api/debate/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ department: 'CSE' });

      expect(putRes.status).toBe(200);
      expect(putRes.body.selectedDebateDept).toBe('CSE');

      const nextRes = await request(app)
        .get('/api/debate/topics/next')
        .set('Authorization', `Bearer ${token}`);

      expect(nextRes.status).toBe(200);
      expect(nextRes.body.topic.department).toBe('CSE');
    });
  });

  describe('Production Security & Level Gate', () => {
    test('throws in production when JWT_SECRET is missing', () => {
      const debateRouter = require('../src/routes/debate');
      const origEnv = process.env.NODE_ENV;
      const origSecret = process.env.JWT_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.JWT_SECRET;
        expect(() => {
          debateRouter.getDeterministicAssignedStance('u123', 't123');
        }).toThrow(/FATAL: JWT_SECRET environment variable is required in production/);
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origSecret) process.env.JWT_SECRET = origSecret;
      }
    });

    test('returns requiredLevel, requiredXp, currentXp, and xpNeeded on 403', async () => {
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.get(
        '/api/test-gate',
        (req, res, next) => {
          req.user = { role: 'student', level: 'Beginner', xp: 150 };
          next();
        },
        requireMinXP(500, 'Debate Practice', 'Intermediate'),
        (req, res) => res.json({ ok: true })
      );

      const res = await request(testApp).get('/api/test-gate');

      expect(res.status).toBe(403);
      expect(res.body.locked).toBe(true);
      expect(res.body.requiredLevel).toBe('Intermediate');
      expect(res.body.requiredXp).toBe(500);
      expect(res.body.currentXp).toBe(150);
      expect(res.body.xpNeeded).toBe(350);
    });
  });
});
