const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const SimulationScenario = require('../src/models/SimulationScenario');
const SimulationSession = require('../src/models/SimulationSession');

const app = createApp();

function newUserPayload(namePrefix = 'SimStudent') {
  return {
    name: `${namePrefix} ${Date.now()}`,
    email: `sim.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'student',
  };
}

describe('AI Real-World Communication Simulator API', () => {
  let studentToken;
  let studentUser;
  let otherStudentToken;
  let otherStudentUser;

  beforeEach(async () => {
    // Register primary student
    const reg = await request(app).post('/api/auth/register').send(newUserPayload('Alice'));
    studentToken = reg.body.token;
    studentUser = await User.findOne({ email: reg.body.user.email });

    // Register second student for access control testing
    const regOther = await request(app).post('/api/auth/register').send(newUserPayload('Bob'));
    otherStudentToken = regOther.body.token;
    otherStudentUser = await User.findOne({ email: regOther.body.user.email });
  });

  test('GET /api/simulation/environments returns all five environments with emergency disclaimer', async () => {
    const res = await request(app)
      .get('/api/simulation/environments')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(5);

    const envIds = res.body.map((e) => e.id);
    expect(envIds).toContain('interview');
    expect(envIds).toContain('office');
    expect(envIds).toContain('travel');
    expect(envIds).toContain('emergency');
    expect(envIds).toContain('negotiation');

    const emergencyEnv = res.body.find((e) => e.id === 'emergency');
    expect(emergencyEnv.disclaimer).toBeTruthy();
    expect(emergencyEnv.disclaimer).toMatch(/EDUCATIONAL SIMULATION ONLY/i);
  });

  test('GET /api/simulation/scenarios filters by environment and returns character metadata', async () => {
    const res = await request(app)
      .get('/api/simulation/scenarios?environment=interview')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const scenario = res.body[0];
    expect(scenario.environment).toBe('interview');
    expect(scenario.characters).toBeDefined();
    expect(scenario.characters.length).toBeGreaterThanOrEqual(1);
    expect(scenario.characters[0].name).toBeTruthy();
    expect(scenario.characters[0].personality).toBeTruthy();
    expect(scenario.initialPrompt).toBeTruthy();
  });

  test('POST /api/simulation/sessions creates session with initial character greeting', async () => {
    const res = await request(app)
      .post('/api/simulation/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scenarioId: 'interview-hr-intro',
        level: 'Intermediate',
        mode: 'voice',
        feedbackMode: 'learning',
        targetDurationMinutes: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.scenarioId).toBe('interview-hr-intro');
    expect(res.body.session.status).toBe('active');
    expect(res.body.session.messages.length).toBe(1);
    expect(res.body.session.messages[0].sender).toBe('ai');
    expect(res.body.session.character.name).toBe('Sarah Jenkins');
  });

  test('POST /api/simulation/sessions/:id/turn handles student utterance and returns in-turn Learning Mode feedback', async () => {
    // 1. Create session in Learning Mode
    const sessionRes = await request(app)
      .post('/api/simulation/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scenarioId: 'interview-hr-intro',
        level: 'Intermediate',
        mode: 'voice',
        feedbackMode: 'learning',
      });

    const sessionId = sessionRes.body.session._id;

    // 2. Submit student utterance containing common grammar mistake
    const turnRes = await request(app)
      .post(`/api/simulation/sessions/${sessionId}/turn`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        utterance: 'Hello Sarah, I am agree with you. I developed a very big web application with my team.',
        audioDurationSeconds: 7.5,
        measuredDuration: true,
      });

    expect(turnRes.status).toBe(200);
    expect(turnRes.body.aiReply).toBeDefined();
    expect(turnRes.body.aiReply.sender).toBe('ai');
    expect(turnRes.body.aiReply.text.length).toBeGreaterThan(10);

    // Learning Mode feedback verification
    expect(turnRes.body.feedback).toBeDefined();
    expect(turnRes.body.feedback.grammarMistakes.length).toBeGreaterThanOrEqual(1);
    expect(turnRes.body.feedback.correctedSentence).toContain('I agree');
    expect(turnRes.body.feedback.vocabularySuggestions.length).toBeGreaterThanOrEqual(1);
    expect(turnRes.body.feedback.alternativeResponses.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/simulation/sessions/:id/hint returns contextual sentence starters', async () => {
    const sessionRes = await request(app)
      .post('/api/simulation/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scenarioId: 'travel-airport-immigration',
        feedbackMode: 'challenge',
      });

    const sessionId = sessionRes.body.session._id;

    const hintRes = await request(app)
      .post(`/api/simulation/sessions/${sessionId}/hint`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(hintRes.status).toBe(200);
    expect(hintRes.body.hint).toBeTruthy();
    expect(Array.isArray(hintRes.body.suggestedStarters)).toBe(true);
    expect(hintRes.body.suggestedStarters.length).toBeGreaterThanOrEqual(1);
  });

  test('Student cannot submit turns or read other students sessions (Access Control 403)', async () => {
    // Alice creates session
    const sessionRes = await request(app)
      .post('/api/simulation/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scenarioId: 'office-daily-standup',
      });

    const sessionId = sessionRes.body.session._id;

    // Bob tries to submit a turn to Alice's session
    const bobTurnRes = await request(app)
      .post(`/api/simulation/sessions/${sessionId}/turn`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        utterance: 'Hacking Bob trying to speak in Alice session',
      });

    expect(bobTurnRes.status).toBe(403);
    expect(bobTurnRes.body.error).toMatch(/Access denied/i);

    // Bob tries to read Alice's session transcript
    const bobGetRes = await request(app)
      .get(`/api/simulation/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect(bobGetRes.status).toBe(403);
  });

  test('POST /api/simulation/sessions/:id/end evaluates 100-point rubric, distinguishes audio metrics, and awards XP', async () => {
    const sessionRes = await request(app)
      .post('/api/simulation/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scenarioId: 'negotiation-salary-raise',
        feedbackMode: 'challenge',
      });

    const sessionId = sessionRes.body.session._id;

    // Student performs two turns
    await request(app)
      .post(`/api/simulation/sessions/${sessionId}/turn`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        utterance: 'Director Henderson, over the past year I led our cloud migration, reducing infrastructure costs by 28 percent and improving platform reliability.',
        audioDurationSeconds: 12.0,
        measuredDuration: true,
      });

    await request(app)
      .post(`/api/simulation/sessions/${sessionId}/turn`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        utterance: 'Based on market benchmarks for senior engineers and the direct ROI delivered, I am proposing a 12 percent adjustment to my base compensation.',
        audioDurationSeconds: 10.0,
        measuredDuration: true,
      });

    // End session
    const endRes = await request(app)
      .post(`/api/simulation/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(endRes.status).toBe(200);
    expect(endRes.body.session.status).toBe('completed');
    expect(endRes.body.evaluation).toBeDefined();

    const evalReport = endRes.body.evaluation;
    expect(evalReport.overallScore).toBeGreaterThanOrEqual(50);
    expect(evalReport.overallScore).toBeLessThanOrEqual(100);

    // 6 weighted category checks
    expect(evalReport.categoryScores.grammar).toBeDefined();
    expect(evalReport.categoryScores.vocabulary).toBeDefined();
    expect(evalReport.categoryScores.sentenceFormation).toBeDefined();
    expect(evalReport.categoryScores.clarity).toBeDefined();
    expect(evalReport.categoryScores.relevance).toBeDefined();
    expect(evalReport.categoryScores.fluencyAndDelivery).toBeDefined();

    // Delivery metrics: verified audio duration and WPM
    expect(evalReport.deliveryMetrics.isMeasured).toBe(true);
    expect(evalReport.deliveryMetrics.speechDurationSeconds).toBeGreaterThan(15);
    expect(evalReport.deliveryMetrics.measuredWpm).toBeGreaterThan(50);

    // Strengths, recommendations and XP
    expect(evalReport.strengths.length).toBeGreaterThanOrEqual(1);
    expect(evalReport.personalizedRecommendations.length).toBeGreaterThanOrEqual(1);
    expect(endRes.body.xpAwarded).toBeGreaterThanOrEqual(20);

    // Verify student user in DB gained XP
    const updatedUser = await User.findById(studentUser._id);
    expect(updatedUser.xp).toBeGreaterThanOrEqual(20);
  });

  test('GET /api/simulation/history and GET /api/simulation/stats return session history and aggregates', async () => {
    const historyRes = await request(app)
      .get('/api/simulation/history')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(historyRes.status).toBe(200);
    expect(Array.isArray(historyRes.body)).toBe(true);

    const statsRes = await request(app)
      .get('/api/simulation/stats')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totalSessions).toBeDefined();
    expect(statsRes.body.catAverages).toBeDefined();
    expect(statsRes.body.envCounts).toBeDefined();
  });
});
