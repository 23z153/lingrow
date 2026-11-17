const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const WorldStageScenario = require('../src/models/WorldStageScenario');
const WorldStageSession = require('../src/models/WorldStageSession');

const app = createApp();

function newUserPayload(namePrefix = 'StageStudent') {
  return {
    name: `${namePrefix} ${Date.now()}`,
    email: `stage.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'student',
  };
}

describe('World Stage Public Speaking API', () => {
  let studentToken;
  let studentUser;
  let otherStudentToken;
  let otherStudentUser;

  beforeEach(async () => {
    // Register primary student
    const reg = await request(app).post('/api/auth/register').send(newUserPayload('Speaker'));
    studentToken = reg.body.token;
    studentUser = await User.findOne({ email: reg.body.user.email });

    // Register second student for access control testing
    const regOther = await request(app).post('/api/auth/register').send(newUserPayload('OtherSpeaker'));
    otherStudentToken = regOther.body.token;
    otherStudentUser = await User.findOne({ email: regOther.body.user.email });
  });

  test('GET /api/world-stage/stages returns all 5 stage environments with atmosphere metadata', async () => {
    const res = await request(app)
      .get('/api/world-stage/stages')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(5);

    const stageIds = res.body.map((s) => s.stageId);
    expect(stageIds).toContain('ted-talk');
    expect(stageIds).toContain('college-seminar');
    expect(stageIds).toContain('corporate-conference');
    expect(stageIds).toContain('debate-arena');
    expect(stageIds).toContain('global-summit');

    const tedStage = res.body.find((s) => s.stageId === 'ted-talk');
    expect(tedStage.atmosphere).toBeDefined();
    expect(tedStage.suggestedTopics.length).toBeGreaterThanOrEqual(1);
    expect(tedStage.stats).toBeDefined();
  });

  test('GET /api/world-stage/topics returns suggested speech topics and filters by stageId', async () => {
    const res = await request(app)
      .get('/api/world-stage/topics?stageId=debate-arena')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].stageId).toBe('debate-arena');
    expect(res.body[0].title).toBeTruthy();
    expect(res.body[0].prompt).toBeTruthy();
  });

  test('POST /api/world-stage/sessions creates session with audience grid', async () => {
    const res = await request(app)
      .post('/api/world-stage/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        stageId: 'ted-talk',
        topic: 'Why Failure is the Best Learning Algorithm',
        difficulty: 'Intermediate',
        audienceSize: 30,
        targetDurationMinutes: 3,
        mode: 'practice',
        inputMode: 'voice',
      });

    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.stageId).toBe('ted-talk');
    expect(res.body.session.status).toBe('active');
    expect(res.body.session.audienceMembers.length).toBe(30);

    const firstAudience = res.body.session.audienceMembers[0];
    expect(firstAudience.name).toBeTruthy();
    expect(firstAudience.archetype).toBeTruthy();
  });

  test('POST /api/world-stage/sessions/:id/speech records speech and generates live audience reactions', async () => {
    const sessionRes = await request(app)
      .post('/api/world-stage/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        stageId: 'corporate-conference',
        topic: 'Building Resilient and Scalable Cloud Architectures',
      });

    const sessionId = sessionRes.body.session._id;

    const speechRes = await request(app)
      .post(`/api/world-stage/sessions/${sessionId}/speech`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        text: 'Good morning executive committee. Today I want to demonstrate how decoupling our monolithic architecture will reduce infrastructure costs by 28 percent while improving uptime.',
        audioDurationSeconds: 11.5,
        measuredDuration: true,
      });

    expect(speechRes.status).toBe(200);
    expect(speechRes.body.session.speechSegments.length).toBe(1);
    expect(speechRes.body.session.fullTranscript).toContain('monolithic architecture');
    expect(Array.isArray(speechRes.body.newReactions)).toBe(true);
    expect(speechRes.body.newReactions.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/world-stage/sessions/:id/question and /answer handles audience Q&A interaction', async () => {
    const sessionRes = await request(app)
      .post('/api/world-stage/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        stageId: 'college-seminar',
        topic: 'Ethics and Accountability in Autonomous AI Systems',
      });

    const sessionId = sessionRes.body.session._id;

    // Provide speech context
    await request(app)
      .post(`/api/world-stage/sessions/${sessionId}/speech`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        text: 'In our research, we examined algorithmic bias across automated credit scoring systems, highlighting the ethical imperative for auditable neural networks.',
        audioDurationSeconds: 10.0,
        measuredDuration: true,
      });

    // Trigger audience question
    const qRes = await request(app)
      .post(`/api/world-stage/sessions/${sessionId}/question`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(qRes.status).toBe(200);
    expect(qRes.body.question).toBeDefined();
    expect(qRes.body.question.askerName).toBeTruthy();
    expect(qRes.body.question.questionText).toBeTruthy();

    const questionId = qRes.body.question.questionId;

    // Answer the audience question
    const aRes = await request(app)
      .post(`/api/world-stage/sessions/${sessionId}/answer`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionId,
        answerText: 'To address that valid point, our framework mandates independent third-party audit logs before automated decisions are deployed.',
      });

    expect(aRes.status).toBe(200);
    expect(aRes.body.question.answerText).toContain('audit logs');
    expect(aRes.body.question.feedback).toBeDefined();
  });

  test('Student cannot access or submit speech to another students session (Access Control 403)', async () => {
    // Primary student creates session
    const sessionRes = await request(app)
      .post('/api/world-stage/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        stageId: 'debate-arena',
        topic: 'Universal Basic Income in the Era of Automation',
      });

    const sessionId = sessionRes.body.session._id;

    // Other student attempts to submit speech
    const otherSpeechRes = await request(app)
      .post(`/api/world-stage/sessions/${sessionId}/speech`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        text: 'Malicious attempt to hijack another user presentation',
      });

    expect(otherSpeechRes.status).toBe(403);
    expect(otherSpeechRes.body.error).toMatch(/Access denied/i);

    // Other student attempts to view report
    const otherReportRes = await request(app)
      .get(`/api/world-stage/sessions/${sessionId}/report`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect(otherReportRes.status).toBe(403);
  });

  test('POST /api/world-stage/sessions/:id/end evaluates 100-pt 8-dimension rubric, awards XP, and prevents duplicate XP claims', async () => {
    const sessionRes = await request(app)
      .post('/api/world-stage/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        stageId: 'global-summit',
        topic: 'Multilateral Cyber Warfare Treaties and Digital Sovereignty',
        targetDurationMinutes: 5,
      });

    const sessionId = sessionRes.body.session._id;

    // Submit rich speech segment containing common grammar pattern and vocabulary
    await request(app)
      .post(`/api/world-stage/sessions/${sessionId}/speech`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        text: 'Distinguished delegates, furthermore I am agree that cyber attacks against hospitals represent a consequential violation of digital sovereignty. In conclusion, we must establish binding accountability.',
        audioDurationSeconds: 15.0,
        measuredDuration: true,
      });

    // End session and evaluate
    const endRes = await request(app)
      .post(`/api/world-stage/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(endRes.status).toBe(200);
    expect(endRes.body.session.status).toBe('completed');
    expect(endRes.body.evaluation).toBeDefined();

    const evaluation = endRes.body.evaluation;
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(40);
    expect(evaluation.overallScore).toBeLessThanOrEqual(100);

    // Verify 8 dimension breakdown
    const dims = evaluation.dimensionScores;
    expect(dims.grammarAccuracy).toBeDefined();
    expect(dims.vocabulary).toBeDefined();
    expect(dims.sentenceFormation).toBeDefined();
    expect(dims.clarity).toBeDefined();
    expect(dims.topicRelevance).toBeDefined();
    expect(dims.fluency).toBeDefined();
    expect(dims.speechOrganization).toBeDefined();
    expect(dims.audienceEngagement).toBeDefined();

    // Verify linguistic corrections detected 'I am agree'
    expect(evaluation.grammarCorrections.length).toBeGreaterThanOrEqual(1);
    expect(evaluation.grammarCorrections[0].corrected).toContain('I agree');

    // Verify delivery metrics
    expect(evaluation.deliveryMetrics.isMeasured).toBe(true);
    expect(evaluation.deliveryMetrics.measuredWpm).toBeGreaterThan(30);

    // Verify XP awarded
    const initialXP = studentUser.xp || 0;
    const awarded = endRes.body.xpAwarded;
    expect(awarded).toBeGreaterThanOrEqual(30);

    const userAfter = await User.findById(studentUser._id);
    expect(userAfter.xp).toBe(initialXP + awarded);

    // Test duplicate XP prevention
    const secondEndRes = await request(app)
      .post(`/api/world-stage/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(secondEndRes.status).toBe(200);
    expect(secondEndRes.body.alreadyCompleted).toBe(true);

    const userFinal = await User.findById(studentUser._id);
    expect(userFinal.xp).toBe(initialXP + awarded); // No double-crediting
  });

  test('GET /api/world-stage/history and /stats return user history and aggregated public speaking stats', async () => {
    const histRes = await request(app)
      .get('/api/world-stage/history')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(histRes.status).toBe(200);
    expect(Array.isArray(histRes.body)).toBe(true);

    const statsRes = await request(app)
      .get('/api/world-stage/stats')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totalSessions).toBeDefined();
    expect(statsRes.body.stageCounts).toBeDefined();
    expect(statsRes.body.dimensionAverages).toBeDefined();
  });
});
