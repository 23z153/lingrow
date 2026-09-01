const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');

const app = createApp();

function newUserPayload(overrides = {}) {
  return {
    name: 'Test Student',
    email: `student.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
    password: 'correct-horse-battery-staple',
    role: 'student',
    ...overrides,
  };
}

describe('POST /api/auth/register', () => {
  test('creates an account and returns an access token + unverified user', async () => {
    const payload = newUserPayload();
    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(payload.email.toLowerCase());
    expect(res.body.user.emailVerified).toBe(false);
    // No SMTP configured in tests -> the mock path hands back a preview link.
    expect(res.body.devVerifyUrl).toMatch(/verifyEmail=/);
    // Refresh token must never be exposed in the JSON body — it's httpOnly-cookie only.
    expect(res.body.refreshToken).toBeUndefined();

    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.some((c) => c.startsWith('lingrow_refresh='))).toBe(true);
    expect(setCookie.some((c) => /HttpOnly/i.test(c))).toBe(true);
  });

  test('rejects a duplicate email', async () => {
    const payload = newUserPayload();
    await request(app).post('/api/auth/register').send(payload);
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.status).toBe(409);
  });

  test('rejects a password shorter than 8 characters', async () => {
    const payload = newUserPayload({ password: 'short' });
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.status).toBe(400);
  });

  test('rejects a missing required field', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'nope@example.com', password: 'abcdefgh' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials', async () => {
    const payload = newUserPayload();
    await request(app).post('/api/auth/register').send(payload);

    const res = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  test('rejects an incorrect password', async () => {
    const payload = newUserPayload();
    await request(app).post('/api/auth/register').send(payload);

    const res = await request(app).post('/api/auth/login').send({ email: payload.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('rejects a suspended account', async () => {
    const payload = newUserPayload();
    await request(app).post('/api/auth/register').send(payload);
    await User.updateOne({ email: payload.email.toLowerCase() }, { $set: { status: 'Suspended' } });

    const res = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  test('rejects requests with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns the current user for a valid access token', async () => {
    const payload = newUserPayload();
    const reg = await request(app).post('/api/auth/register').send(payload);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(payload.email.toLowerCase());
  });
});

describe('refresh token flow', () => {
  test('exchanges a valid refresh cookie for a new access token and rotates it', async () => {
    const agent = request.agent(app); // persists cookies across requests, like a browser
    const payload = newUserPayload();
    const loginRes = await agent.post('/api/auth/register').send(payload);
    const firstToken = loginRes.body.token;

    const userBefore = await User.findOne({ email: payload.email.toLowerCase() });
    const hashBefore = userBefore.refreshTokenHash;

    const refreshRes = await agent.post('/api/auth/refresh').send();
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.token).toEqual(expect.any(String));
    expect(refreshRes.body.token).not.toBe(firstToken);

    const userAfter = await User.findOne({ email: payload.email.toLowerCase() });
    expect(userAfter.refreshTokenHash).not.toBe(hashBefore); // rotated, not reused
  });

  test('rejects a refresh request with no cookie', async () => {
    const res = await request(app).post('/api/auth/refresh').send();
    expect(res.status).toBe(401);
  });

  test('logout invalidates the refresh token', async () => {
    const agent = request.agent(app);
    const payload = newUserPayload();
    await agent.post('/api/auth/register').send(payload);

    const logoutRes = await agent.post('/api/auth/logout').send();
    expect(logoutRes.status).toBe(200);

    const refreshRes = await agent.post('/api/auth/refresh').send();
    expect(refreshRes.status).toBe(401);
  });
});

describe('email verification', () => {
  test('verifies an account with a valid token and rejects an invalid one', async () => {
    const payload = newUserPayload();
    const reg = await request(app).post('/api/auth/register').send(payload);
    const token = new URL(reg.body.devVerifyUrl).searchParams.get('verifyEmail');

    const badRes = await request(app).get('/api/auth/verify-email').query({ token: 'not-a-real-token' });
    expect(badRes.status).toBe(400);

    const goodRes = await request(app).get('/api/auth/verify-email').query({ token });
    expect(goodRes.status).toBe(200);
    expect(goodRes.body.user.emailVerified).toBe(true);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(me.body.user.emailVerified).toBe(true);
  });

  test('resend-verification requires authentication', async () => {
    const res = await request(app).post('/api/auth/resend-verification').send();
    expect(res.status).toBe(401);
  });
});
