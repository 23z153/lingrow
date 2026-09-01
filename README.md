# LinGrow AI — Full-Stack Prototype

A speaking-practice platform for college students: pronunciation practice,
vocabulary, listening comprehension, debate & story-continuation exercises,
anonymized peer practice, an AI tutor chat, gamification, and teacher/admin
dashboards — with a real Node.js/Express + MongoDB backend and Claude
(Anthropic API) powering the "LLM" parts.

```
lingrow-ai/
  backend/     Node.js + Express + MongoDB API, JWT auth, Claude-powered scoring
  frontend/    Static HTML/CSS/JS client (no build step required)
```

## What's real vs. simulated — please read this first

This was built inside a sandboxed environment with no GPU and no access to
model-weight hosts (e.g. Hugging Face), so it can't literally ship the
self-hosted Whisper / wav2vec2 / Coqui VITS / FreeVC pipeline described in
the original architecture doc, and nobody can train a genuine custom LLM in
a chat session. Here's what's actually running vs. what's stubbed:

| Piece | Status |
|---|---|
| Backend API, auth, database models, business logic | **Real.** Express + MongoDB (Mongoose), JWT auth, bcrypt password hashing. |
| Session security | **Real.** Short-lived (15 min) access tokens + a rotating, httpOnly-cookie refresh token (hashed at rest, like a password). See "Production hardening" below. |
| Email verification | **Real flow**, mock delivery by default. Verification links are generated and checked server-side; without SMTP configured, the email is logged to the server console (and returned as `devVerifyUrl` in the register/resend response) instead of actually being delivered. Set `SMTP_*` in `.env` to send real email. |
| AI Tutor chat, debate/story scoring, pronunciation feedback text | **Real LLM**, via the Anthropic API (Claude). Set `ANTHROPIC_API_KEY` in `backend/.env`. Without a key, everything still works using a local heuristic scorer, clearly labeled "offline heuristic" in the UI. |
| Speech-to-text (mic capture) | **Real**, via the browser's built-in `SpeechRecognition` API (Chrome/Edge). Production would swap this for self-hosted Whisper — see `backend/src/services/llmService.js` for where to plug it in. |
| Text-to-speech (passage/vocab playback) | **Real**, via the browser's `speechSynthesis` API. Production would swap this for a self-hosted VITS model. |
| Pronunciation word-level accuracy | Computed with a real word-alignment diff (`diffWords` in `llmService.js`) between the reference passage and what the student actually said — not random. Forced-alignment-grade precision would need a real ASR model. |
| Voice anonymization / peer WebRTC calls | **Modeled, not implemented.** `PeerSession` has the matching/queue/session-record logic working end-to-end, but the actual live audio call (WebRTC + a server-side voice-conversion pass) needs a signalling server and media infrastructure this environment can't run. See comments in `backend/src/routes/peer.js`. |
| Gamification (XP, levels, streaks, badges, leaderboard) | **Real**, backed by the database. |

Nothing here is decorative — every screen calls a real endpoint, which reads
and writes real MongoDB documents.

## Quick start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI (a local `mongod` or a free MongoDB Atlas cluster),
# a JWT_SECRET, and — optionally — ANTHROPIC_API_KEY for real AI scoring.
npm run seed     # creates demo accounts + starter content
npm start         # -> http://localhost:5000
```

Demo accounts created by the seed script (password for all: `password123`):

- `student@lingrow.demo`
- `teacher@lingrow.demo`
- `admin@lingrow.demo`

### 2. Frontend

The frontend is plain static files — no build step. Easiest options:

- Open `frontend/index.html` directly with a local static server, e.g.
  `npx serve frontend` or the VS Code "Live Server" extension.
- Or let the backend serve it: it's already wired to serve `frontend/` as
  static files from the same Express app, so once the backend is running you
  can just visit `http://localhost:5000`.

If you host the frontend on a different origin/port than the backend, open
`frontend/js/api.js` and update `API_BASE`, and add that origin to
`CORS_ORIGIN` in `backend/.env`.

### 3. Sign in

Use one of the seeded demo accounts above, or register a new account from
the login screen (role selectable for demo purposes — in production you'd
lock registration to student self-signup and provision teacher/admin
accounts separately via the admin panel).

## Production hardening

The backend now has a real session-security model, email verification,
a Docker setup, and an automated test suite — the pieces that turn this
from "runs on my machine" into something you could actually deploy.

### Auth: short-lived access tokens + rotating refresh tokens

Login/register now return two things instead of one:

- An **access token** (JWT, 15 min default) — sent as `Authorization: Bearer
  <token>` on every API call, same as before.
- A **refresh token** — a random opaque string, delivered as an `httpOnly`,
  `SameSite=Lax` cookie scoped to `/api/auth`. Only its SHA-256 hash is
  stored server-side (`User.refreshTokenHash`), so a database leak alone
  can't be replayed into a session, and it can't be read or exfiltrated by
  JS running on the page (XSS-resistant).

`frontend/js/api.js` handles the whole cycle transparently: when a request
gets a 401 because the access token expired, it silently calls
`POST /api/auth/refresh`, retries the original request once, and only
bounces the user to the login screen if the refresh cookie itself is
missing or expired. Every refresh also **rotates** the token (issues a new
one, invalidates the old), so a stolen refresh token stops working the
next time the real user's client refreshes.

`POST /api/auth/logout` clears the cookie and invalidates the stored hash
server-side — logging out on one device actually ends that session, not
just deletes a local variable.

Tune the lifetimes via `ACCESS_TOKEN_EXPIRES_IN` and
`REFRESH_TOKEN_EXPIRES_IN_DAYS` in `.env`.

### Email verification

Registering creates the account immediately (so the demo/dev flow isn't
blocked on a mailbox) but marks `emailVerified: false` and sends a
verification link. The frontend shows a dismiss-free banner for unverified
users with a "Resend link" action; nothing is hard-gated behind
verification yet — wire `requireAuth` + an `emailVerified` check into
specific routes if you want a hard gate.

Without SMTP configured, `backend/src/services/emailService.js` logs the
email to the server console (prefixed `[email:mock]`) and the API also
returns the link directly as `devVerifyUrl` in the register/resend response
— you can test the whole flow with zero external services. Set
`SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` (any provider — Mailtrap, SES,
SendGrid, Gmail app password, etc.) in `.env` to send real mail; seeded
demo accounts are pre-verified so the demo login flow is never blocked.

### Docker

```bash
cp backend/.env.example backend/.env   # fill in JWT_SECRET at minimum
docker compose up --build              # starts mongo + backend on :5000
docker compose run --rm seed           # one-off: demo accounts + starter content
```

`docker-compose.yml` runs MongoDB and the API as separate services on a
shared network; the backend serves the static frontend too, so
`http://localhost:5000` is the whole app. The `seed` service uses Compose
[profiles](https://docs.docker.com/compose/how-tos/profiles/) so it doesn't
start automatically — it's meant to be run once via `docker compose run`.

### Tests

```bash
cd backend
npm install
npm test
```

`backend/tests/` uses Jest + Supertest against the real Express app
(`src/app.js`, importable without binding a port) and
[`mongodb-memory-server`](https://github.com/typegoose/mongodb-memory-server)
for an isolated, disposable MongoDB — no local `mongod` or Atlas cluster
needed, and nothing touches your real database. Coverage: registration
(validation, duplicate email), login (bad password, suspended account),
the full access/refresh/logout token lifecycle including rotation, email
verification, and a protected-route smoke test.

Note: on first run, `mongodb-memory-server` downloads a `mongod` binary
(~60–80 MB) from `fastdl.mongodb.org`, so `npm test` needs outbound
internet access the first time (cached under `~/.cache/mongodb-binaries`
after that). If you're running this in a network-restricted CI environment,
either allowlist that host or point `MONGO_URI` at an already-running
MongoDB instance and adapt `tests/setup.js` to skip spinning up the
in-memory server.

## Speech features need a supported browser

`SpeechRecognition` (mic capture) is a Chrome/Edge feature; Safari and
Firefox support is inconsistent. If a browser doesn't support it, the app
tells you instead of failing silently. Text-to-speech (`speechSynthesis`)
has broader support.

## Project layout

```
backend/
  server.js                 Entrypoint: connects DB, starts src/app.js listening
  Dockerfile
  .dockerignore
  src/
    app.js                   Express app (routes, middleware) — imported directly by tests
    config/db.js             MongoDB connection
    models/                  Mongoose schemas — one file per collection
    middleware/auth.js       JWT auth + role guard
    utils/tokens.js          Access/refresh JWT + hashed-token helpers
    services/
      llmService.js          Claude API integration: tutor, debate/story/
                              pronunciation scoring, word-diff alignment
      progressService.js     XP, levelling, badge logic
      emailService.js        Verification email delivery (SMTP or console mock)
    routes/                  One router per module (auth, practice,
                              vocabulary, debate, story, listening, lessons,
                              peer, tutor, notifications, progress, teacher,
                              admin)
    seed.js                  Demo accounts + starter content
  tests/
    setup.js                 Spins up mongodb-memory-server for the test run
    auth.test.js             Register/login/refresh-rotation/logout/verify-email
    progress.test.js         Protected-route smoke test

docker-compose.yml           mongo + backend services (+ one-off seed profile)

frontend/
  index.html
  css/style.css
  js/
    api.js                   fetch wrapper around every backend endpoint
    speech.js                browser mic (STT) + text-to-speech (TTS)
    icons.js                 inline SVG icon set
    app.js                   auth screen, app shell, view router
    views-student.js         dashboard, read-aloud, vocabulary, listening,
                              story, debate, peer, tutor chat, lessons, progress
    views-teacher.js         class overview, per-student detail & feedback
    views-admin.js           user management, content library, system health
```

## Extending toward the full production architecture

To move from this prototype to the original architecture doc's design:

1. **Self-hosted STT**: stand up a Whisper (or `faster-whisper`) inference
   service, have the client upload the raw audio blob instead of the
   browser's transcript, and call it from `practice.js` / `listening.js`
   before scoring.
2. **Self-hosted TTS**: stand up Coqui VITS (or similar), replace
   `SpeechOutput.speak()` calls in the frontend with a fetch to an audio
   endpoint that streams back synthesized speech.
3. **Voice anonymization + WebRTC peer calls**: add a signalling server
   (Socket.IO) and an SFU (mediasoup/LiveKit), with a FreeVC-based voice
   conversion pass sitting between the two audio tracks server-side. The
   `PeerSession` model and matching queue in `routes/peer.js` are already
   built to plug into this.
4. **Pronunciation scoring precision**: replace the word-diff heuristic in
   `llmService.js` with real forced alignment (e.g. wav2vec2-based) output
   from the STT service.
