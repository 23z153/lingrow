# AI Debate Practice & Topic Rotation Module

This document provides technical documentation for the LingrowAI Debate Practice module, including backend endpoints, environment configuration, XP & gamification rules, badge milestones, and how to monitor AI evaluation fallbacks.

---

## 1. API Endpoints

All debate endpoints are mounted under `/api/debate` and require authentication (`requireAuth`) unless noted.

### Topic Rotation & Preferences
- **`GET /api/debate/topics/next`**
  - **Query parameters**: `assignStance` (boolean), `category` (string), `level` (string).
  - **Behavior**: Retrieves the next recommended topic using an unpracticed-first rotation algorithm. When all topics in a category/level have been practiced, it cycles back to topics with the oldest attempts.
  - **Assigned Stance**: When `assignStance=true`, deterministically derives the stance (`"for"` or `"against"`) using HMAC-SHA256 (`userId + topicId`). Returns `assignedStance` and an HMAC-signed `assignedStanceToken` (valid for 30 minutes) to prevent client-side stance tampering.

- **`PUT /api/debate/preferences`**
  - **Body**: `{ stancePreference, targetDurationSeconds, categoryPreference }`
  - **Behavior**: Updates user debate practice preferences.

### Opening Speech Attempts
- **`POST /api/debate/attempts`**
  - **Rate Limiting**: User-keyed limiter (`debateAttemptLimiter`: max 15 requests per 15 minutes per user).
  - **Body**:
    - `topicId` (ObjectId, required)
    - `stance` (`"for"` | `"against"`, required)
    - `transcript` (string, required, min 10 chars)
    - `mode` (`"manual"` | `"assigned"` | `"timed"` | `"typed"`)
    - `durationSeconds` (number, optional; 0 for typed mode)
    - `targetDurationSeconds` (60 | 120 | 180, optional)
    - `stanceAssigned` (boolean, optional)
    - `assignedStanceToken` (string, required if `stanceAssigned=true`)
    - `idempotencyKey` / `audioIdempotencyKey` (string, optional; unique compound index on `{ user, idempotencyKey }` returns `409` on duplicate)
  - **Validation & Anti-Cheat**:
    - Validates assigned stance against HMAC signature.
    - Sanitizes transcript to strip XML/HTML tags (case-insensitive `<transcript>` stripping).
    - Checks for implausible speech timing (`durationSuspect = true` if implied WPM > 250, or if words > 150 and WPM < 40).
  - **Evaluation**: Evaluated via Ollama LLM (`scoreDebate`) with prompt injection isolation. If Ollama times out or errors, falls back to heuristic scoring.
  - **Returns**: Evaluated attempt with score breakdown, delivery metrics, XP breakdown, and newly unlocked badges.

- **`GET /api/debate/history`**
  - **Query parameters**: `limit`, `page`
  - **Behavior**: Returns chronological list of user debate attempts, delivery metrics, scores, and rebuttal status.

### Rebuttal Flow
- **`POST /api/debate/rebuttal/start`**
  - **Rate Limiting**: User-keyed limiter (`debateRebuttalLimiter`: max 20 requests per 15 minutes per user).
  - **Body**: `{ openingAttemptId }`
  - **Behavior & Resume**:
    - Validates user ownership of `openingAttemptId`.
    - If a rebuttal already exists with status `"completed"`, returns `409 REBUTTAL_ALREADY_COMPLETED`.
    - If a rebuttal exists with status `"started"`, returns the **same stored counter-argument** with a freshly signed `rebuttalToken` (`resumed: true`), without regenerating or re-rolling.
    - If no rebuttal exists, generates AI counter-argument (`generateCounterArgument`), creates a `DebateRebuttal` record, and returns a signed `rebuttalToken`.
  - **Security**: The `rebuttalToken` is HMAC-signed covering `userId + rebuttalId + expiresAt` (valid for 15 minutes).

- **`POST /api/debate/rebuttal/submit`**
  - **Rate Limiting**: User-keyed limiter (`debateRebuttalLimiter`).
  - **Body**:
    - `openingAttemptId` (ObjectId, required)
    - `rebuttalId` (ObjectId, required)
    - `rebuttalToken` (string, required)
    - `transcript` (string, required, min 10 chars)
    - `durationSeconds` (number, optional)
    - `mode` (`"voice"` | `"typed"`)
  - **Validation & Anti-Cheat**:
    - Validates user ownership and HMAC token signature. Tokens signed for another user or altered expiry are rejected with `400` or `403`.
    - **Server Timing**: For timed/voice submissions, rejects submissions completed $< 5$ seconds after rebuttal start (`400 SUBMISSION_TOO_FAST`).
    - **Typed Mode**: Sets `durationSeconds = 0`, excludes delivery metrics, and skips timing-based bonuses.
    - **Copy-Paste Penalties**: Scans for 3-gram overlap with the AI counter-argument and student opening speech. If copy-paste exceeds threshold, clamps `responsiveness <= 30`, `refutation <= 35`, and `overall <= 38`.
  - **Returns**: Rebuttal scores, copy-paste flags, XP awarded, and updated status `"completed"`.

---

## 2. Environment Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `OLLAMA_DEBATE_TIMEOUT` | Number (ms) | `20000` | Timeout for debate opening & rebuttal scoring via Ollama before falling back to heuristics. |
| `JWT_SECRET` | String | `lingrow-dev-secret-key-change-in-production` (dev only) | Secret key for signing user sessions and HMAC verification tokens. **In `NODE_ENV=production`, the server halts on startup if missing.** |
| `OLLAMA_URL` | String (URL) | `http://127.0.0.1:11434` | Endpoint for the Ollama inference server. |
| `OLLAMA_MODEL` | String | `llama3.2:3b` | Primary model for debate argument generation and evaluation. |

---

## 3. XP Rules & Diminishing Returns

Debate attempts award XP based on performance, effort, and repetition:

1. **Qualification Threshold**:
   - An attempt must achieve `overall >= 40` to award XP or count toward streaks.
2. **Opening Speech Base XP**:
   - Base XP scales up to 35 XP based on the overall score.
3. **Personal Best Improvement Bonus**:
   - Compares the score against the user's **historical personal best** on the exact same `topicId + stance`.
   - +5 XP per 5 points exceeding the personal best (capped at +15 XP bonus).
   - Only awarded on voice/timed modes (skipped for `mode: 'typed'`).
4. **Stance Agility Bonus**:
   - +5 XP for practicing on the assigned stance or alternating sides.
5. **Topic Repetition Diminishing Returns**:
   - **1st attempt** on topic + stance: **100%** full XP.
   - **2nd attempt** on topic + stance: **50%** half XP.
   - **3rd and subsequent attempts**: **Flat 5 XP**.
6. **Rebuttal XP**:
   - Base XP scales up to 25 XP based on the rebuttal overall score.
   - Applies the same repetition diminishing returns (1st: 100%, 2nd: 50%, 3rd+: 5 XP).
7. **Daily Debate XP Cap**:
   - Daily limit of **150 XP** per user across all debate activities (opening + rebuttals).
   - Day boundaries are calculated according to **Asia/Kolkata (IST)** midnight-to-midnight (UTC+05:30).
   - When the cap is reached, `xpEarned = 0` and `dailyCapReached = true`.

---

## 4. Badge Rules

Badges are awarded automatically upon meeting criteria:

| Badge Key | Name | Trigger Condition |
| :--- | :--- | :--- |
| `first_debate` | First Argument | Completed 1st valid debate attempt. |
| `debate_champion` | Debate Champion | Achieved `overall >= 90` on any debate attempt. |
| `both_sides` | Perspective Master | Completed attempts on both `"for"` and `"against"` stances of the same topic. |
| `consistent_debater` | Consistent Debater | Completed 5 or more total debate attempts. |
| `debate_streak_5` | Debate Streak (5 Days) | Completed debate attempts with `overall >= 40` on 5 consecutive days in Asia/Kolkata time. |
| `rebuttal_ready` | Rebuttal Ready | Completed a rebuttal challenge with `overall >= 70`. |

---

## 5. Fallback Logs & Monitoring

When Ollama is unavailable, busy, or takes longer than `OLLAMA_DEBATE_TIMEOUT`, the system automatically invokes the local heuristic scoring engine so user sessions are never blocked.

### Log Signatures
- **Opening Speech Fallback**:
  ```text
  [debate] Ollama call failed/timed out after 20000ms: <reason>. Falling back to heuristic scoring.
  ```
- **Rebuttal Evaluation Fallback**:
  ```text
  [debate-rebuttal] Ollama call failed/timed out after 20000ms: <reason>. Falling back to heuristic rebuttal scoring.
  ```

### Reading the Log
1. **Normal Operation**: When Ollama responds within timeout, no `[debate]` fallback warning is emitted.
2. **Heuristic Engaged**: When the warning appears, check:
   - Is Ollama running on `OLLAMA_URL`?
   - Is the machine experiencing high GPU/CPU contention?
   - Consider increasing `OLLAMA_DEBATE_TIMEOUT` in `.env` if large models require longer inference times.
3. **Data Integrity**: Scores produced by the heuristic fallback follow the exact same schema and range as LLM scores, ensuring complete backward compatibility and unbroken user experiences.
