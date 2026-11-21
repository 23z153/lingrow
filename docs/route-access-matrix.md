# LinGrow AI: Learner-Facing Route Access Matrix

*Generated from the running Express application stack.*

| HTTP METHOD | PATH | MIDDLEWARE CHAIN | LEVEL REQUIRED | ROLES EXEMPT |
|---|---|---|---|---|
| `GET` | `/api/grammar/progress` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/grammar/` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/grammar/attempts/me` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/grammar/:id` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/grammar/:id/test` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/grammar/:id/submit` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/vocabulary/` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/vocabulary/daily` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/vocabulary/quiz` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/vocabulary/assessment` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/vocabulary/:id/review` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/listening/clips` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/listening/attempts` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/story/prompts` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/story/attempts` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/story/attempts/me` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/situational/scenarios` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/situational/attempts/me` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/situational/scenarios/:id` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/situational/scenarios/:id/submit` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/weakwords/class-summary` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/weakwords/bulk` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/weakwords/due` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/weakwords/` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/weakwords/:id/result` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `DELETE` | `/api/weakwords/:id` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/tutor/` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/tutor/llm-status` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/tutor/models` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/tutor/live-web-data` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/tutor/history` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `DELETE` | `/api/tutor/history` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/tutor/memories` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/tutor/memories` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `DELETE` | `/api/tutor/memories/:id` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `DELETE` | `/api/tutor/memories` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/tutor/documents` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/tutor/documents/upload` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `DELETE` | `/api/tutor/documents/:id` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/tutor/search` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `POST` | `/api/tutor/message` | `requireAuth -> requireOnboarded -> anonymous` | **Beginner** | Teacher, Admin |
| `GET` | `/api/practice/passages` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/practice/attempts` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/practice/attempts/me` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/simulation/environments` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/simulation/scenarios` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/simulation/scenarios/:id` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/simulation/sessions` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/simulation/sessions/:id/turn` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/simulation/sessions/:id/hint` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/simulation/sessions/:id/end` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/simulation/sessions/:id` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/simulation/history` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/simulation/stats` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/idioms/stats` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/idioms/grouped-verbs` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/idioms/` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/idioms/:id` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/idioms/:id/stage2-understand` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/idioms/:id/stage3-use` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/peer/queue` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/peer/queue/leave` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/peer/sessions/:id/end` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `POST` | `/api/peer/sessions/:id/rate` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/peer/sessions/me` | `requireAuth -> requireOnboarded -> anonymous` | **Intermediate** | Teacher, Admin |
| `GET` | `/api/world-stage/stages` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `GET` | `/api/world-stage/topics` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/world-stage/sessions` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/world-stage/sessions/:id/speech` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/world-stage/sessions/:id/question` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/world-stage/sessions/:id/answer` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/world-stage/sessions/:id/end` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `GET` | `/api/world-stage/sessions/:id/report` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `GET` | `/api/world-stage/history` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `GET` | `/api/world-stage/stats` | `requireAuth -> requireOnboarded -> anonymous` | **Advanced** | Teacher, Admin |
| `GET` | `/api/debate/topics` | `requireAuth -> anonymous` | **Advanced** | Teacher, Admin |
| `GET` | `/api/debate/topics/next` | `requireAuth -> anonymous` | **Advanced** | Teacher, Admin |
| `PUT` | `/api/debate/preferences` | `requireAuth -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/debate/attempts` | `requireAuth -> anonymous` | **Advanced** | Teacher, Admin |
| `GET` | `/api/debate/history` | `requireAuth -> anonymous` | **Advanced** | Teacher, Admin |
| `GET` | `/api/debate/attempts/me` | `requireAuth -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/debate/rebuttal/start` | `requireAuth -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/debate/rebuttal/submit` | `requireAuth -> anonymous` | **Advanced** | Teacher, Admin |
| `POST` | `/api/gd/rooms` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/gd/rooms` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/gd/rooms/:id` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/gd/rooms/:id/join` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/gd/rooms/:id/leave` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/gd/rooms/:id/start` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/gd/rooms/:id/speech` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/gd/rooms/:id/end` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/gd/rooms/:id/report` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/tests/topics` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/tests/categories` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/tests/` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/tests/` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/tests/available` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/tests/attempts/me` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/tests/:id/take` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/tests/:id/attempts` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/tests/:id` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `PATCH` | `/api/tests/:id` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `DELETE` | `/api/tests/:id` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/tests/:id/results` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/challenges/` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/challenges/:id/complete` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/lessons/` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/lessons/:id/sections/:index/complete` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/notifications/` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/notifications/daily-word` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/notifications/daily-word/answer` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/notifications/:id/read` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/notifications/read-all` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/progress/me` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/progress/progression` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/progress/dragon` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `POST` | `/api/progress/missions/claim` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |
| `GET` | `/api/progress/leaderboard` | `requireAuth -> requireOnboarded -> anonymous` | **None (Onboarded only)** | Teacher, Admin |

