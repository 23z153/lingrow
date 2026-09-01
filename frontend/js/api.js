/* Thin fetch wrapper around the LinGrow AI backend REST API.
   Change API_BASE if the backend runs somewhere other than localhost:5000,
   or leave it as '' to call the same origin the frontend is served from. */
const API_BASE = window.LINGROW_API_BASE !== undefined ? window.LINGROW_API_BASE : 'http://localhost:5000';

const Api = {
  token: localStorage.getItem('lingrow_token') || null,
  // Access tokens are short-lived (~15 min). This tracks an in-flight
  // refresh so concurrent requests that all 401 at once share one
  // refresh call instead of racing each other.
  _refreshPromise: null,

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem('lingrow_token', t);
    else localStorage.removeItem('lingrow_token');
  },

  async _rawRequest(method, path, body) {
    const res = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: 'include', // send/receive the httpOnly refresh cookie
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    return { res, data };
  },

  /** Exchanges the refresh cookie for a new access token. Resolves to
   * true on success, false if the session is genuinely over (cookie
   * missing/expired) — caller should send the user back to login. */
  async _refreshAccessToken() {
    if (!this._refreshPromise) {
      this._refreshPromise = this._rawRequest('POST', '/auth/refresh')
        .then(({ res, data }) => {
          if (res.ok && data && data.token) {
            this.setToken(data.token);
            return true;
          }
          this.setToken(null);
          return false;
        })
        .catch(() => { this.setToken(null); return false; })
        .finally(() => { this._refreshPromise = null; });
    }
    return this._refreshPromise;
  },

  async request(method, path, body) {
    let { res, data } = await this._rawRequest(method, path, body);

    // Access token expired mid-session: try one silent refresh+retry
    // before surfacing an error. Skip this for the auth endpoints
    // themselves to avoid refresh-of-a-refresh loops.
    if (res.status === 401 && this.token && !path.startsWith('/auth/')) {
      const refreshed = await this._refreshAccessToken();
      if (refreshed) {
        ({ res, data } = await this._rawRequest(method, path, body));
      }
    }

    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  del(path) { return this.request('DELETE', path); },

  // auth
  register(payload) { return this.post('/auth/register', payload); },
  login(payload) { return this.post('/auth/login', payload); },
  me() { return this.get('/auth/me'); },
  async logout() {
    try { await this.post('/auth/logout'); } catch (e) { /* best-effort — clear local state regardless */ }
    this.setToken(null);
  },
  verifyEmail(token) { return this.get(`/auth/verify-email?token=${encodeURIComponent(token)}`); },
  resendVerification() { return this.post('/auth/resend-verification'); },

  // practice
  passages(level) { return this.get('/practice/passages' + (level ? `?level=${level}` : '')); },
  submitReadAloud(payload) { return this.post('/practice/attempts', payload); },
  myReadAloudAttempts() { return this.get('/practice/attempts/me'); },

  // vocabulary
  vocab(level) { return this.get('/vocabulary' + (level ? `?level=${level}` : '')); },
  reviewVocab(id, known) { return this.post(`/vocabulary/${id}/review`, { known }); },

  // grammar
  grammarTopics(category) { return this.get('/grammar' + (category ? `?category=${encodeURIComponent(category)}` : '')); },
  getGrammarTopic(id) { return this.get(`/grammar/${id}`); },
  submitGrammar(id, answers) { return this.post(`/grammar/${id}/submit`, { answers }); },
  myGrammarAttempts() { return this.get('/grammar/attempts/me'); },

  // situational
  situationalScenarios(category) { return this.get('/situational/scenarios' + (category ? `?category=${encodeURIComponent(category)}` : '')); },
  getSituationalScenario(id) { return this.get(`/situational/scenarios/${id}`); },
  submitSituational(id, answers) { return this.post(`/situational/scenarios/${id}/submit`, { answers }); },
  mySituationalAttempts() { return this.get('/situational/attempts/me'); },

  // debate
  debateTopics() { return this.get('/debate/topics'); },
  submitDebate(payload) { return this.post('/debate/attempts', payload); },
  myDebateAttempts() { return this.get('/debate/attempts/me'); },

  // story
  storyPrompts() { return this.get('/story/prompts'); },
  submitStory(payload) { return this.post('/story/attempts', payload); },
  myStoryAttempts() { return this.get('/story/attempts/me'); },

  // listening
  listeningClips() { return this.get('/listening/clips'); },
  submitListening(payload) { return this.post('/listening/attempts', payload); },

  // lessons
  lessons() { return this.get('/lessons'); },
  completeLessonSection(lessonId, index) { return this.post(`/lessons/${lessonId}/sections/${index}/complete`); },

  // peer
  joinPeerQueue(topic) { return this.post('/peer/queue', { topic }); },
  leavePeerQueue() { return this.post('/peer/queue/leave'); },
  endPeerSession(id) { return this.post(`/peer/sessions/${id}/end`); },
  ratePeerSession(id, score, comment) { return this.post(`/peer/sessions/${id}/rate`, { score, comment }); },
  myPeerSessions() { return this.get('/peer/sessions/me'); },

  // tutor
  tutorLLMStatus() { return this.get('/tutor/llm-status'); },
  tutorModels() { return this.get('/tutor/models'); },
  tutorLiveWebData() { return this.get('/tutor/live-web-data'); },
  tutorHistory() { return this.get('/tutor/history'); },
  tutorMessage(message) { return this.post('/tutor/message', { message }); },
  tutorDocuments() { return this.get('/tutor/documents'); },
  tutorUploadDocument(payload) { return this.post('/tutor/documents/upload', payload); },
  tutorDeleteDocument(id) { return this.del(`/tutor/documents/${id}`); },
  tutorSearch(query) { return this.post('/tutor/search', { query }); },

  // notifications
  notifications() { return this.get('/notifications'); },
  markNotificationRead(id) { return this.post(`/notifications/${id}/read`); },
  markAllNotificationsRead() { return this.post('/notifications/read-all'); },
  getDailyWord() { return this.get('/notifications/daily-word'); },
  answerDailyWord(selectedOption) { return this.post('/notifications/daily-word/answer', { selectedOption }); },

  // progress
  myProgress() { return this.get('/progress/me'); },
  leaderboard() { return this.get('/progress/leaderboard'); },

  // teacher
  teacherStudents(batch) { return this.get('/teacher/students' + (batch ? `?batch=${batch}` : '')); },
  teacherStudentDetail(id) { return this.get(`/teacher/students/${id}`); },
  teacherComment(type, id, comment) { return this.post(`/teacher/attempts/${type}/${id}/comment`, { comment }); },

  // tests (teacher creates by topic, pulls from the question bank; students take them)
  testCategories() { return this.get('/tests/categories'); },
  createTest(payload) { return this.post('/tests', payload); },
  teacherTests() { return this.get('/tests'); },
  teacherTestDetail(id) { return this.get(`/tests/${id}`); },
  teacherTestResults(id) { return this.get(`/tests/${id}/results`); },
  updateTest(id, payload) { return this.patch(`/tests/${id}`, payload); },
  deleteTest(id) { return this.del(`/tests/${id}`); },
  availableTests() { return this.get('/tests/available'); },
  takeTest(id) { return this.get(`/tests/${id}/take`); },
  submitTest(id, answers, timeTakenSeconds) { return this.post(`/tests/${id}/attempts`, { answers, timeTakenSeconds }); },
  myTestAttempts() { return this.get('/tests/attempts/me'); },

  // admin
  adminUsers(params) { return this.get('/admin/users' + (params ? `?${params}` : '')); },
  adminCreateUser(payload) { return this.post('/admin/users', payload); },
  adminBulkUsers(rows) { return this.post('/admin/users/bulk', { rows }); },
  adminSetUserStatus(id, status) { return this.patch(`/admin/users/${id}/status`, { status }); },
  adminDeleteUser(id) { return this.del(`/admin/users/${id}`); },
  adminAddPassage(payload) { return this.post('/admin/content/passages', payload); },
  adminAddVocab(payload) { return this.post('/admin/content/vocab', payload); },
  adminAddDebateTopic(payload) { return this.post('/admin/content/debate-topics', payload); },
  adminAddStoryPrompt(payload) { return this.post('/admin/content/story-prompts', payload); },
  adminStats() { return this.get('/admin/stats'); },

  // Question Bank Manager
  getQuestionBankStats() { return this.get('/admin/question-bank/stats'); },
  triggerScraper(department) { return this.post('/admin/question-bank/scrape', { department }); },

  // AI Chatbot & Live Task Monitor
  adminTutorLogs() { return this.get('/admin/tutor-logs'); },
  adminLiveTasks() { return this.get('/admin/live-student-tasks'); },
};
