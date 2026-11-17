# 🐉 LinGrow AI — Dragon Academy Edition

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%7C%20Local-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Anthropic Claude](https://img.shields.io/badge/LLM-Anthropic%20Claude-D97706?logo=anthropic&logoColor=white)](https://console.anthropic.com/)
[![Ollama](https://img.shields.io/badge/Local%20AI-Qwen%20%2B%20DeepSeek--R1-black?logo=ollama&logoColor=white)](https://ollama.ai/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**LinGrow AI** is an intelligent English communication, pronunciation, and speaking mastery platform wrapped in a rich gamified **Dragon Academy** fantasy realm. Designed for college students, job seekers, and ESL learners, LinGrow AI transforms language practice into an epic adventure—featuring pronunciation labs, vocabulary forges, a 243-topic grammar quest, live peer group discussions, an audience-reactive public speaking stage, situational roleplays, and a dual-model AI tutor.

---

## 📑 Table of Contents

- [🌟 Highlights & Core Pillars](#-highlights--core-pillars)
- [🏰 The Dragon Academy World & Realms](#-the-dragon-academy-world--realms)
- [📚 The 243-Topic Question Bank (`LinGrow_QBank`)](#-the-243-topic-question-bank-lingrow_qbank)
- [🎙️ Live Group Discussions (GD) & Peer Practice](#️-live-group-discussions-gd--peer-practice)
- [🎭 World Stage & Audience Reaction Engine](#-world-stage--audience-reaction-engine)
- [💼 Communication & Situational Simulator](#-communication--situational-simulator)
- [🧠 Two-Model Local AI Architecture & AI Tutor](#-two-model-local-ai-architecture--ai-tutor)
- [🏫 Teacher & Administrator Portals](#-teacher--administrator-portals)
- [🛡️ Production Hardening & Security](#️-production-hardening--security)
- [📁 Project Architecture & Directory Layout](#-project-architecture--directory-layout)
- [🚀 Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Importing Question Bank & Seeding Accounts](#2-importing-question-bank--seeding-accounts)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Demo Accounts](#4-demo-accounts)
- [🐳 Docker Deployment](#-docker-deployment)
- [🧪 Running Automated Tests](#-running-automated-tests)
- [⚙️ Environment Variables Reference](#️-environment-variables-reference)

---

## 🌟 Highlights & Core Pillars

| Pillar | Description | Implementation Status |
|---|---|---|
| **Dragon Academy Gamification** | Dynamic procedural SVG dragon mascot with idle breathing, fire-breath, victory backflips, failure/rekindle animations, streaks, flame auras, and elemental masteries. | **Real & Active** |
| **Comprehensive Curriculum** | **243 grammar topics** spanning 5 proficiency tiers with **12,150 curated MCQs** from `LinGrow_QBank`, with sequential unlock gating (50% passing threshold). | **Real & Active** |
| **Live Group Discussions (GD)** | Multi-participant real-time transcript sync (1s interval), auto-silence speech detection, explicit submit, and centered bubble conversation UI. | **Real & Active** |
| **1-on-1 Peer Practice** | Anonymized student matchmaking queue with randomized debate/speaking topics and post-session peer ratings. | **Real & Active** |
| **Weak Words Lab** | Persistent error-tracking engine capturing mispronounced or failed words across all exercises, with targeted spaced-repetition drills. | **Real & Active** |
| **World Stage** | Public speaking simulator with an interactive **Audience Engine** (bored, engaged, impressed, critical) reacting dynamically to speech tempo, pauses, and clarity. | **Real & Active** |
| **Communication Simulator** | Scenario-based dialogue engine (Job Interviews, Tech Pitches, Campus Encounters, Daily Conversations) with instant multi-criteria rubric feedback. | **Real & Active** |
| **AI Tutor ("Draco")** | Floating Action Button (FAB) and collapsible drawer with persistent cross-session memory, syllabus RAG context extraction, and conversation management. | **Real & Active** |
| **Two-Model Local AI** | Sequential pipeline on consumer GPUs (NVIDIA RTX 3050 6GB): Primary generator (Qwen2.5) + Strict verifier (DeepSeek-R1) via Ollama, plus Anthropic Claude cloud API support. | **Real & Active** |
| **Speech-to-Text & TTS** | Client-side speech recognition (`SpeechRecognition` API) with real-time word-diff alignment (`diffWords`) and browser speech synthesis (`SpeechSynthesis` API). | **Real & Active** |
| **Teacher & Admin Portals** | Class performance analytics, live GD room observation, custom test creation, content library syllabus editor, and system health latency monitoring. | **Real & Active** |

---

## 🏰 The Dragon Academy World & Realms

The student journey is organized into legendary realms across the Dragon Kingdom:

```
                          ┌────────────────────────┐
                          │   👑 DRAGON KINGDOM    │
                          │   (Kingdom Realm Map)  │
                          └───────────┬────────────┘
         ┌──────────────────┬─────────┴─────────┬──────────────────┐
         ▼                  ▼                   ▼                  ▼
  🌲 Whispering Woods  🌋 Fire Peaks     ⚡ Dragon Spire    🌊 Echo Caverns
  (Vocabulary Forge)   (Pronunciation)    (Grammar Quest)   (Listening Lab)
```

1. **🌲 Whispering Woods (Vocabulary Forge)**:
   - Interactive flashcard mastery system with definition reveals, phonetic transcriptions, part-of-speech categorization, and contextual example sentences.
   - Word audio pronunciation playback via text-to-speech.
   - Mastery level progression: New ➔ Familiar ➔ Mastered.

2. **🌋 Fire Peaks (Pronunciation & Read-Aloud)**:
   - Passage-reading lab with live browser microphone capture (`SpeechRecognition`).
   - Word-by-word diff alignment (`diffWords` in `llmService.js`) comparing spoken transcript against the reference text.
   - Real-time scoring on accuracy, completeness, and fluency with color-coded phonetic feedback:
     - 🟢 **Green**: Accurately pronounced.
     - 🟡 **Yellow**: Minor hesitation / variation.
     - 🔴 **Red**: Mispronounced or skipped (automatically fed into the **Weak Words Lab**).

3. **⚡ Dragon Spire (Grammar Quest)**:
   - Full 243-topic curriculum powered by `LinGrow_QBank`.
   - Practice trials with 50 MCQs per topic, instant explanation modals, and distractor rationale.
   - Sequential unlock mechanism: Each topic requires a **50% passing mark** to unlock the subsequent topic in the mastery tree.

4. **🌊 Echo Caverns (Listening Lab)**:
   - Audio passage listening exercises with replay limits to simulate real test conditions.
   - Targeted comprehension questions assessing main idea, key details, and implicit meaning.

5. **⚔️ The Arena (Debate, Story & Stage)**:
   - **Debate Arena**: Multi-turn structured debating against an AI opponent with argument scoring, counter-argument evaluation, and rebuttal rounds.
   - **Story Continuation**: Open-ended creative narrative builder challenging students to speak or write coherent subsequent chapters.

---

## 📚 The 243-Topic Question Bank (`LinGrow_QBank`)

The repository integrates a complete, production-grade question bank located in `LinGrow_QBank/`:

- **243 Comprehensive Grammar Topics** categorized under canonical English classifications (Parts of Speech, Subject-Verb Agreement, Verb Tenses, Conditionals, Gerunds & Infinitives, Active & Passive Voice, Modals, Relative Clauses, and Advanced Syntax).
- **12,150 Curated Multiple-Choice Questions** (50 questions per topic JSON file), complete with:
  - Question prompt & 4 options (A, B, C, D)
  - Correct answer mapping
  - In-depth pedagogical explanation
  - Distractor rationales (why incorrect choices are wrong)
  - Target grammar rules and difficulty tags

### Curriculum Tier Structure

```
Level 1: Foundations        ── Topics 001 - 048  (Nouns, Pronouns, Basic Tenses, Articles)
Level 2: Elementary         ── Topics 049 - 096  (Prepositions, Conjunctions, Continuous Tenses)
Level 3: Intermediate       ── Topics 097 - 144  (Perfect Tenses, Modals, Passive Voice, Conditionals)
Level 4: Upper-Intermediate ── Topics 145 - 192  (Clauses, Gerunds/Infinitives, Reported Speech)
Level 5: Advanced & Fluency ── Topics 193 - 243  (Inversion, Cleft Sentences, Subjunctive, Idioms)
```

### Importing the Question Bank
The database importer automatically resolves the local question bank path across OS environments (Linux, macOS, Windows):
```bash
cd backend
npm run import-qbank
```
*(Also automatically imported whenever running `npm run seed`).*

---

## 🎙️ Live Group Discussions (GD) & Peer Practice

Designed specifically for placement preparation and group interview readiness:

### 1. Live Group Discussion (GD) Rooms
- **Centered Bubble Conversation Feed**: Real-time transcript feed styled with clear speaker avatars, participant name tags, timestamps, and easy-to-read speech bubbles.
- **Real-Time Multi-Participant Sync**: Sub-second synchronization across all participants in active rooms via low-latency polling.
- **Hands-Free Speech Recognition**: Live mic capture with auto-silence detection that automatically packages and submits spoken thoughts after natural pauses.
- **Manual Send & Controls**: Explicit "Send Speech" button and mic mute/unmute toggles.
- **Teacher Observation Mode**: Teachers can enter GD rooms in spectator mode to observe interactions and issue targeted feedback.

### 2. 1-on-1 Anonymized Voice Practice
- **Peer Matchmaking Queue**: Fast matchmaking system pairing students anonymously.
- **Topic Cards**: Automatically provided discussion prompts (e.g., *“Should AI replace standardized testing?”*).
- **Segmented Control**: Clear toggle switch separating GD Rooms from 1-on-1 Practice.
- **Session Ratings**: Peer feedback on clarity, etiquette, and confidence.

---

## 🎭 World Stage & Audience Reaction Engine

The **World Stage** (`views-world-stage.js`, `/api/world-stage`) simulates high-stakes public speaking:

```
┌────────────────────────────────────────────────────────┐
│                      WORLD STAGE                       │
│  [Speech Topic: Pitching Clean Energy to City Council] │
│                                                        │
│  AUDIENCE REACTIONS:                                   │
│  😀 Engaged (65%)   🤔 Pensive (25%)   🥱 Bored (10%)  │
│                                                        │
│  METRICS:                                              │
│  Pacing: 135 wpm    Fillers: 2 ("um", "like")          │
│  Clarity: 88%       Confidence Score: 92/100           │
└────────────────────────────────────────────────────────┘
```

- **Dynamic Audience Engine** (`backend/src/services/audienceEngine.js`): Simulates diverse audience archetypes (Academic, Executive, Youth, Skeptical). The audience visually reacts in real time to speech patterns:
  - Fast tempo with low pauses ➔ Heightened engagement or overwhelm.
  - Excessive pauses or filler words ➔ Audience restlessness and boredom.
  - Clear, structured arguments ➔ Applause and high engagement.
- **Comprehensive Rubric Evaluation**: Post-speech breakdown on Vocabulary Diversity, Pacing, Articulation, Confidence, and Filler-Word Frequency.

---

## 💼 Communication & Situational Simulator

The **Communication Simulator** (`views-simulator.js`, `/api/simulation`) bridges academic English with real-world scenarios:

- **Interactive Scenarios**:
  - *Job Interview*: Answering behavioral questions, technical backgrounds, and salary expectations.
  - *Tech Startup Pitch*: Presenting a problem, architecture, and value proposition to venture investors.
  - *Academic Defense*: Responding to faculty critique and methodological inquiries.
  - *Social Casual*: Ordering food, asking directions, networking at conferences.
- **Turn-by-Turn Adaptive AI**: The simulated persona replies contextually based on the user's spoken or written inputs, probing deeper or steering the conversation naturally.

---

## 🧠 Two-Model Local AI Architecture & AI Tutor

LinGrow AI includes a dedicated local neural pipeline designed for zero-API-cost local inference, specifically optimized for **NVIDIA RTX 3050 Laptop GPUs (6GB VRAM)**:

```
USER QUERY / ESSAY / SPEECH
          │
          ▼
   INTENT ROUTER
   (Checks if query needs Syllabus RAG, Web Search, or General Grammar)
          │
          ▼
   QWEN 2.5 (3B / 7B) ──► Generates Draft Response
          │
          ▼
   DEEPSEEK-R1 (1.5B / 8B) ──► Strict Verifier (Checks grammar accuracy & tone)
          │
          ├──────────────► Correct: Issues Verification Badge & Sends
          └──────────────► Error: Rewrites Draft with Precise Correction
```

### Persistent AI Tutor ("Draco")
- Accessible anywhere in the application via the floating dragon icon.
- **Persistent Conversation Memory** (`TutorMemory`, `TutorMessage`): Remembers user strengths, recurring grammar mistakes, and topics discussed across sessions.
- **RAG & Syllabus-Aware**: Uses `@xenova/transformers` for in-memory semantic search over curriculum documents.
- **Dual Engine Fallback**: Automatically connects to local Ollama (`qwen2.5` + `deepseek-r1`) if available, falls back to Anthropic Claude Sonnet if configured in `.env`, or utilizes the intelligent rule-based offline heuristic engine.

---

## 🏫 Teacher & Administrator Portals

### 🧑‍🏫 Teacher Portal (`views-teacher.js`)
- **Class Overview & Analytics**: Class-wide completion rates, average pronunciation scores, and grammar unlock progress.
- **Per-Student Diagnostics**: View individual weak words, recent debate attempts, and speaking recordings.
- **Live GD Supervision**: Monitor active student group discussion rooms in real time.
- **Custom Assignment & Test Distribution**: Create custom tests from the 12,150 question bank and assign them to specific student classes.

### 🛡️ Administrator Console (`views-admin.js`)
- **User & Role Provisioning**: Manage student, teacher, and admin accounts.
- **Curriculum Library Editor**: Add, edit, or reorder curriculum passages, vocabulary lists, and debate topics.
- **System Health & Telemetry**: Real-time database latency, active sessions, and API response metrics.

---

## 🛡️ Production Hardening & Security

- **Dual-Token Auth Pipeline**:
  - Short-lived JWT **access tokens** (15-minute default) passed via `Authorization: Bearer <token>`.
  - Rotating **refresh tokens** stored in `httpOnly`, `SameSite=Lax` cookies scoped strictly to `/api/auth`.
  - Only the SHA-256 hash of the refresh token is stored in MongoDB (`User.refreshTokenHash`)—preventing token reuse even in the event of a database compromise.
- **Transparent Refresh Cycle**: The client API interceptor (`frontend/js/api.js`) automatically intercepts 401 errors, requests a new access token via `/api/auth/refresh`, and transparently retries the original request.
- **Email Verification Flow**: Configurable verification emails with SMTP support (Nodemailer) or safe console logging (`[email:mock]`) for local development without external dependencies.
- **Strict Role-Based Access Control (RBAC)**: Route middleware enforcing `student`, `teacher`, and `admin` permission boundaries.
- **Cache-Busted Asset Pipeline**: Version-controlled asset URLs (`?v=7.2`) across all scripts and stylesheets to guarantee client synchronization without stale browser cache collisions.
- **Input Sanitization & UI Caret Control**: Protection against XSS, plus explicit CSS/JS caret suppression across interactive surfaces.

---

## 📁 Project Architecture & Directory Layout

```
lingrow-ai/
├── README.md                          # Comprehensive project documentation
├── docker-compose.yml                 # Multi-container orchestration (App + Mongo)
├── LinGrow_QBank/                     # 243-topic curriculum (12,150 MCQs)
│   ├── Level 1/                       # Topics 001 - 048
│   ├── Level 2/                       # Topics 049 - 096
│   ├── Level 3/                       # Topics 097 - 144
│   ├── Level 4/                       # Topics 145 - 192
│   └── Level 5/                       # Topics 193 - 243
├── backend/
│   ├── server.js                      # Application entrypoint
│   ├── Dockerfile                     # Production container spec
│   ├── package.json                   # Dependencies, scripts & Jest config
│   ├── .env.example                   # Environment configuration template
│   ├── two_model_ai/                  # Local dual-model AI service (Qwen + DeepSeek)
│   │   ├── README.md                  # Two-model GPU architecture guide
│   │   └── main.py                    # Sequential model executor
│   ├── src/
│   │   ├── app.js                     # Express app setup, routing, static handler
│   │   ├── seed.js                    # Multi-role database seeder & QBank importer
│   │   ├── importQBank.js             # Automated 243-topic JSON parser & importer
│   │   ├── config/db.js               # MongoDB Mongoose connection manager
│   │   ├── middleware/auth.js         # JWT auth & RBAC route guards
│   │   ├── utils/tokens.js            # Access/refresh token generation & hashing
│   │   ├── models/                    # 30+ Mongoose data models
│   │   │   ├── User.js, Badge.js, GrammarTopic.js, GDRoom.js, PeerSession.js...
│   │   │   ├── WeakWord.js, WorldStageScenario.js, SimulationSession.js...
│   │   │   └── TutorMemory.js, TutorMessage.js, DebateAttempt.js...
│   │   ├── services/                  # Business logic & AI engines
│   │   │   ├── llmService.js          # Claude API, word-diff alignment, prompt engines
│   │   │   ├── audienceEngine.js      # Real-time World Stage audience simulation
│   │   │   ├── simulationEngine.js    # Multi-persona conversational roleplay
│   │   │   ├── gdService.js           # Live GD room sync & speech coordination
│   │   │   ├── weakWordService.js     # Mistake logging & spaced repetition logic
│   │   │   ├── ragService.js          # In-memory document embeddings (@xenova)
│   │   │   └── emailService.js        # SMTP & mock verification email delivery
│   │   └── routes/                    # Modular Express REST endpoints
│   │       ├── auth.js, gd.js, peer.js, grammar.js, vocabulary.js, practice.js...
│   │       ├── weakwords.js, worldStage.js, simulation.js, tutor.js, teacher.js...
│   │       └── debate.js, story.js, test.js, admin.js, progress.js...
│   └── tests/                         # 21 automated Jest & Supertest test suites
│       ├── setup.js                   # In-memory Mongo test environment
│       ├── auth.test.js, gdRoom.test.js, debatePractice.test.js...
│       └── grammar.test.js, weakwords.test.js, simulation.test.js...
└── frontend/                          # Zero-build static web client
    ├── index.html                     # Main single-page application shell
    ├── css/
    │   ├── style.css                  # Core typography, dark/light themes & design tokens
    │   ├── dragon-academy.css         # Fantasy Dragon Academy styling & animations
    │   ├── world-stage.css            # World Stage audience chamber UI
    │   └── weakwords.css              # Weak Words Lab & drill cards
    └── js/
        ├── app.js                     # Application controller & 25-route navigation router
        ├── api.js                     # Fetch client with auto-refresh token retry
        ├── speech.js                  # SpeechRecognition (STT) & SpeechSynthesis (TTS)
        ├── dragon-mascot.js           # Procedural animated Dragon Mascot controller
        ├── icons.js                   # SVG icon definitions & theme icons
        ├── views-dragon-academy.js    # Realm map, Dragon Kingdom dashboard & quest hubs
        ├── views-student.js           # Read-aloud, vocab, grammar, debate, peer GD views
        ├── views-weakwords.js         # Weak Words Lab dashboard & drill sessions
        ├── views-world-stage.js       # World Stage speech recording & audience feed
        ├── views-simulator.js         # Communication Simulator roleplays
        ├── views-teacher.js           # Teacher dashboard, class rosters & assignments
        └── views-admin.js             # Admin management, syllabus library & telemetry
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [MongoDB](https://www.mongodb.com/) (Local instance running on `mongodb://127.0.0.1:27017` or a free MongoDB Atlas cloud cluster)
- *(Optional)* [Ollama](https://ollama.ai/) for local offline two-model AI (`qwen2.5:3b` and `deepseek-r1:1.5b`)
- *(Optional)* Anthropic API key for Claude-powered scoring and evaluation

---

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create environment file from template
cp .env.example .env
```

Edit `.env` to configure your database connection:
```ini
MONGO_URI=mongodb://127.0.0.1:27017/lingrow_ai
# Or MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/lingrow_ai?retryWrites=true&w=majority

JWT_SECRET=super_secret_dragon_token_key_change_in_production
PORT=5000
NODE_ENV=development
```

---

### 2. Importing Question Bank & Seeding Accounts

Run the comprehensive seed script. This automatically creates the demo accounts, starter lessons, debate topics, and imports all **243 topics and 12,150 MCQs** from `LinGrow_QBank`:

```bash
npm run seed
```

*(You can also re-run just the question bank importer at any time with `npm run import-qbank`).*

Now start the backend server:
```bash
npm start
# Server will listen on http://0.0.0.0:5000 (http://localhost:5000)
```

---

### 3. Frontend Setup

The frontend consists of pure, modern vanilla JavaScript and CSS—**no bundling or build step required**.

#### Option A: Direct Express Serving (Recommended)
The backend is already configured to serve the `frontend/` directory statically. Simply open your browser and navigate to:
👉 **`http://localhost:5000`**

#### Option B: Live Server / Dedicated Static Server
If you prefer running a dedicated static development server:
```bash
npx serve frontend -p 3000
```
*(Ensure `CORS_ORIGIN` in `backend/.env` includes `http://localhost:3000`).*

---

### 4. Demo Accounts

All seeded accounts share the default development password: **`password123`**

| Role | Email Address | Access Level |
|---|---|---|
| **Student 1** | `student@lingrow.demo` | Dragon Kingdom, Realms, GD Rooms, World Stage, AI Tutor |
| **Student 2** | `student2@lingrow.demo` | Secondary student account for multi-browser live GD testing |
| **Teacher** | `teacher@lingrow.demo` | Class performance analytics, student review, live GD monitoring |
| **Admin** | `admin@lingrow.demo` | System health, user management, full content syllabus editor |

---

## 🐳 Docker Deployment

The project includes a ready-to-deploy `docker-compose.yml`:

```bash
# 1. Configure backend environment
cp backend/.env.example backend/.env

# 2. Build and start MongoDB and the API container
docker compose up --build -d

# 3. Seed demo accounts and import the Question Bank
docker compose run --rm seed

# 4. Open the application
# Visit http://localhost:5000 in your browser
```

---

## 🧪 Running Automated Tests

LinGrow AI includes a 21-suite test suite powered by **Jest**, **Supertest**, and **mongodb-memory-server** (an isolated in-memory MongoDB that requires zero local database setup):

```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **Authentication**: Registration, password hashing, token expiration, refresh rotation, logout cookie clearing, email verification.
- **Dragon Academy & Progression**: XP awarding, leveling curves, streak maintenance, badge unlock logic.
- **Curriculum & Grammar**: Sequential topic unlocking, 50% passing threshold rules, quiz scoring.
- **Group Discussions (GD)**: Room lifecycle, multi-participant transcript sync, auto-silence message broadcasting.
- **Weak Words**: Mistake recording, spaced repetition scheduling, word mastery state transitions.
- **World Stage & Simulation**: Audience reaction calculations, multi-turn roleplay session persistence.
- **Two-Model Pipeline**: Intent routing, verifier verification logic, fallback to offline heuristics.

---

## ⚙️ Environment Variables Reference

| Variable | Required? | Default | Description |
|---|---|---|---|
| `MONGO_URI` | **Yes** | `mongodb://127.0.0.1:27017/lingrow_ai` | MongoDB connection string (Local or MongoDB Atlas). |
| `JWT_SECRET` | **Yes** | — | Secret string used to sign JWT access tokens. |
| `ACCESS_TOKEN_EXPIRES_IN` | No | `15m` | Lifetime of the bearer access token. |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | No | `30` | Lifetime of the httpOnly refresh cookie. |
| `PORT` | No | `5000` | Port the Node.js/Express server listens on. |
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`). |
| `FRONTEND_URL` | No | `http://localhost:5000` | URL used for email verification links. |
| `ANTHROPIC_API_KEY` | Optional | — | Anthropic Claude API key for cloud AI scoring. |
| `ANTHROPIC_MODEL` | Optional | `claude-sonnet-4-6` | Anthropic Claude model version. |
| `OLLAMA_BASE_URL` | Optional | `http://127.0.0.1:11434` | Endpoint for local two-model AI inference. |
| `PRIMARY_MODEL` | Optional | `qwen2.5:3b` | Primary generator model for local AI. |
| `VERIFIER_MODEL` | Optional | `deepseek-r1:1.5b` | Verifier model for local AI factual checks. |
| `SMTP_HOST` | Optional | — | SMTP server host for real verification emails. |
| `SMTP_PORT` | Optional | `587` | SMTP port (e.g., 587 or 465). |
| `SMTP_USER` | Optional | — | SMTP username / API key. |
| `SMTP_PASS` | Optional | — | SMTP password / Secret. |
| `CORS_ORIGIN` | Optional | `http://localhost:5173,...` | Allowed CORS origins when hosting frontend independently. |

---

## 📜 License

This project is licensed under the MIT License — see the LICENSE file for details.
Built with ❤️ for learners reaching for global communication fluency.
