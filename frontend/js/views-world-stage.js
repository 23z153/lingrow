/* ==========================================================================
   LinGrow AI — World Stage Module Frontend View
   Interactive public speaking simulation before intelligent AI audiences.
   Environments:
     1. TED Talk Stage
     2. College Seminar Hall
     3. Corporate Conference
     4. Debate Arena
     5. Global Summit
   ========================================================================== */

(function () {
  window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};

  const WSState = {
    viewState: 'hub', // 'hub' | 'live' | 'report'
    stages: [],
    stats: null,
    history: [],
    selectedStage: null,
    activeSession: null,
    evaluation: null,
    // Live stage runtime
    isRecording: false,
    isPaused: false,
    recordStartTime: 0,
    timerInterval: null,
    remainingSeconds: 180,
    activeQuestion: null,
  };

  // --------------------------------------------------------------------------
  // WEB AUDIO & LIVE MIC VISUALIZER / PACING HELPERS
  // --------------------------------------------------------------------------
  let micStream = null;
  let micAudioCtx = null;
  let micAnimId = null;
  let stageTotalWords = 0;
  let stageTotalSpeechSec = 0;

  function playApplauseSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const bufferSize = Math.floor(ctx.sampleRate * 1.2);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const burst = Math.sin(i / 160) * Math.sin(i / 390);
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.45)) * (0.5 + 0.5 * burst);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 1.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.onended = () => {
        try { ctx.close(); } catch (_) {}
      };
    } catch (_) {
      // AudioContext unavailable or restricted
    }
  }

  function startMicVisualizer() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      micStream = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      micAudioCtx = new AudioCtx();
      const source = micAudioCtx.createMediaStreamSource(stream);
      const analyser = micAudioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const vuMeter = $('#ws-vu-meter');
      const vuBar = $('#ws-vu-bar');
      if (vuMeter) vuMeter.style.display = 'flex';

      function draw() {
        if (!micStream) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const pct = Math.min(100, Math.round((avg / 128) * 100));
        if (vuBar) {
          vuBar.style.width = `${pct}%`;
          vuBar.style.backgroundColor = pct > 75 ? '#EF4444' : pct > 25 ? '#10B981' : '#3B82F6';
        }
        micAnimId = requestAnimationFrame(draw);
      }
      draw();
    }).catch(() => {
      // Stream denied or unavailable
    });
  }

  function stopMicVisualizer() {
    if (micAnimId) {
      cancelAnimationFrame(micAnimId);
      micAnimId = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (micAudioCtx) {
      micAudioCtx.close().catch(() => {});
      micAudioCtx = null;
    }
    const vuMeter = $('#ws-vu-meter');
    if (vuMeter) vuMeter.style.display = 'none';
  }

  function updateLivePacing(wordsAdded, durationSec) {
    stageTotalWords += wordsAdded;
    stageTotalSpeechSec += durationSec;
    if (stageTotalSpeechSec < 3) return;

    const wpm = Math.round((stageTotalWords / stageTotalSpeechSec) * 60);
    const pill = $('#ws-pace-pill');
    const textEl = $('#ws-pace-text');
    if (!pill || !textEl) return;

    pill.style.display = 'inline-flex';
    if (wpm < 110) {
      pill.className = 'ws-pace-pill ws-pace-slow';
      textEl.textContent = `Pace: ${wpm} WPM (A bit slow)`;
    } else if (wpm <= 165) {
      pill.className = 'ws-pace-pill ws-pace-optimal';
      textEl.textContent = `Pace: ${wpm} WPM (Optimal)`;
    } else {
      pill.className = 'ws-pace-pill ws-pace-fast';
      textEl.textContent = `Pace: ${wpm} WPM (Fast)`;
    }
  }

  /**
   * Main World Stage view renderer
   */
  VIEW_RENDERERS['world-stage'] = async function (root) {
    root.innerHTML = `
      <div class="col gap-lg" id="ws-container">
        <div class="loading-state" style="padding:48px;text-align:center">
          <div class="spinner" style="margin:0 auto 16px"></div>
          <div style="font-size:14px;color:var(--cream-dim)">Preparing the World Stage auditoriums...</div>
        </div>
      </div>
    `;

    try {
      await loadInitialData();
      renderCurrentScreen();
    } catch (err) {
      console.error('[worldStage] Initialization failed:', err);
      root.innerHTML = `
        <div class="error-box" style="margin:24px 0">
          Failed to load World Stage: ${esc(err.message || 'Unknown error')}.
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="VIEW_RENDERERS['world-stage']($('#view-inner'))">Retry</button>
        </div>
      `;
    }
  };

  async function loadInitialData() {
    const [stages, stats, history] = await Promise.all([
      Api.worldStageStages(),
      Api.worldStageStats().catch(() => ({ totalSessions: 0, avgScore: 0, bestScore: 0, stageCounts: {} })),
      Api.worldStageHistory().catch(() => []),
    ]);

    WSState.stages = stages || [];
    WSState.stats = stats;
    WSState.history = history || [];
  }

  function renderCurrentScreen() {
    const root = $('#ws-container') || $('#view-inner');
    if (!root) return;

    if (WSState.viewState === 'hub') {
      renderHub(root);
    } else if (WSState.viewState === 'live') {
      renderLiveStage(root);
    } else if (WSState.viewState === 'report') {
      renderReportScreen(root);
    }
  }

  // --------------------------------------------------------------------------
  // SCREEN 1: WORLD STAGE HUB / DASHBOARD
  // --------------------------------------------------------------------------
  function renderHub(root) {
    const s = WSState.stats || { totalSessions: 0, avgScore: 0, bestScore: 0 };
    const hist = WSState.history || [];
    const userLevel = S.user?.level || 'Beginner';

    const stageIcons = {
      'ted-talk': 'bi-mic-fill',
      'college-seminar': 'bi-mortarboard-fill',
      'corporate-conference': 'bi-building-fill',
      'debate-arena': 'bi-megaphone-fill',
      'global-summit': 'bi-globe-americas',
    };

    root.innerHTML = `
      <div class="col gap-lg">
        <!-- Hero Introduction Banner -->
        <div class="ws-hero" style="background:linear-gradient(135deg,#0E1428 0%,#1E1B4B 50%,#2A1B4E 100%);border:1px solid rgba(168,85,247,0.35);box-shadow:0 12px 35px rgba(0,0,0,0.4)">
          <div class="ws-hero-badge" style="background:rgba(245,158,11,0.18);color:#FBBF24;border-color:rgba(245,158,11,0.45)">
            <span>🐉</span> Grand Dragon Amphitheater &middot; LinGrow AI
          </div>
          <h2 class="ws-hero-title">Step Onto the Grand Dragon Stage</h2>
          <p class="ws-hero-desc">
            Present before intelligent, reactive AI audiences across five iconic auditoriums. Experience realistic crowd psychology, handle questions from scholars and skeptics, and sharpen your oratorical presence under the guidance of your Dragon Mentor.
          </p>
          <div class="ws-hero-metrics">
            <div class="ws-metric-box">
              <span class="ws-metric-val">${s.totalSessions || 0}</span>
              <span class="ws-metric-lbl">Speeches Delivered</span>
            </div>
            <div class="ws-metric-sep"></div>
            <div class="ws-metric-box">
              <span class="ws-metric-val" style="color:#10B981">${s.bestScore || 0}%</span>
              <span class="ws-metric-lbl">Best Performance</span>
            </div>
            <div class="ws-metric-sep"></div>
            <div class="ws-metric-box">
              <span class="ws-metric-val" style="color:#818CF8">${s.avgScore || 0}%</span>
              <span class="ws-metric-lbl">Average Score</span>
            </div>
            <div class="ws-metric-sep"></div>
            <div class="ws-metric-box">
              <span class="ws-metric-val" style="color:#F59E0B">${userLevel}</span>
              <span class="ws-metric-lbl">Speaking Level</span>
            </div>
          </div>
        </div>

        <!-- Five Selectable Stages Grid -->
        <div>
          <div class="section-title" style="margin-bottom:12px">
            <i class="bi bi-geo-alt-fill"></i> Select a Stage Environment
          </div>
          <div class="ws-stages-grid">
            ${WSState.stages.map((stg) => `
              <div class="ws-stage-card" data-stage-id="${esc(stg.stageId)}">
                <div class="ws-stage-header">
                  <div class="ws-stage-icon-box">
                    <i class="bi ${stageIcons[stg.stageId] || 'bi-mic'}"></i>
                  </div>
                  <span class="pill sprout">${esc(stg.badge || 'Available')}</span>
                </div>
                <h3 class="ws-stage-name">${esc(stg.name)}</h3>
                <div class="ws-stage-subtitle">${esc(stg.subtitle)}</div>
                <p class="ws-stage-desc">${esc(stg.description)}</p>
                <div class="ws-stage-atmosphere">
                  <div><b>Lighting:</b> ${esc(stg.atmosphere?.lighting || 'Spotlight')}</div>
                  <div><b>Ambience:</b> ${esc(stg.atmosphere?.audioAmbience || 'Attentive crowd')}</div>
                </div>
                <div class="ws-stage-footer">
                  <span style="font-size:12px;color:var(--cream-dim)">
                    ${stg.stats?.completedCount > 0 ? `Best: <b>${stg.stats.bestScore}%</b>` : `${(stg.suggestedTopics || []).length} Curated Topics`}
                  </span>
                  <button class="btn btn-primary btn-sm btn-open-stage" data-stage-id="${esc(stg.stageId)}">
                    Enter Stage <i class="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Recent Speeches Table -->
        <div class="card col gap-sm">
          <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
            <span><i class="bi bi-clock-history"></i> Recent Speeches & Reports</span>
            <span style="font-size:12px;color:var(--cream-faint);font-weight:400">${hist.length} total sessions recorded</span>
          </div>
          ${hist.length > 0 ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Topic & Stage</th>
                    <th>Audience Size</th>
                    <th>Mode</th>
                    <th>Performance Score</th>
                    <th>Date</th>
                    <th style="text-align:right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${hist.slice(0, 8).map((session) => `
                    <tr>
                      <td>
                        <div style="font-weight:600;color:var(--color-text)">${esc(session.topic)}</div>
                        <div style="font-size:12px;color:var(--cream-faint)">on ${esc(session.stageName || session.stageId)}</div>
                      </td>
                      <td>
                        <span class="pill" style="font-size:11px">${session.audienceSize || 30} People</span>
                      </td>
                      <td>
                        <span class="pill cyan" style="font-size:11px;text-transform:capitalize">${esc(session.mode || 'Practice')}</span>
                      </td>
                      <td>
                        ${session.evaluation?.overallScore !== undefined ? `
                          <span class="pill" style="color:${scoreColor(session.evaluation.overallScore)};font-weight:700">
                            ${session.evaluation.overallScore}/100
                          </span>
                        ` : `<span class="pill coral">Incomplete</span>`}
                      </td>
                      <td style="font-size:12px;color:var(--cream-faint)">${timeAgo(session.createdAt)}</td>
                      <td style="text-align:right">
                        <button class="btn btn-ghost btn-sm btn-review-speech" data-session-id="${session._id}">
                          <i class="bi bi-journal-check"></i> Report & Replay
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state" style="padding:32px 16px;text-align:center">
              <i class="bi bi-mic" style="font-size:32px;color:var(--cream-faint);margin-bottom:8px;display:inline-block"></i>
              <div style="font-weight:600">No speeches delivered yet</div>
              <div style="font-size:13px;color:var(--cream-dim);margin-top:4px">
                Choose an auditorium stage above to begin your public speaking practice!
              </div>
            </div>
          `}
        </div>
      </div>
    `;

    // Click handlers on stage cards
    $all2('.btn-open-stage, .ws-stage-card', root).forEach((el) => {
      el.onclick = (e) => {
        const stageId = el.dataset.stageId || el.closest('.ws-stage-card')?.dataset.stageId;
        if (stageId) {
          openStageConfigModal(stageId);
        }
      };
    });

    // Review speech replay handler
    $all2('.btn-review-speech', root).forEach((btn) => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const sid = btn.dataset.sessionId;
        await openSpeechReport(sid);
      };
    });
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: SESSION CONFIGURATION MODAL
  // --------------------------------------------------------------------------
  function openStageConfigModal(stageId) {
    const existing = document.getElementById('ws-config-modal');
    if (existing) existing.remove();

    const stage = WSState.stages.find((s) => s.stageId === stageId);
    if (!stage) return;
    WSState.selectedStage = stage;

    const topics = stage.suggestedTopics || [];
    const defaultTopic = topics[0]?.title || 'The Future of Innovation';

    const modalHTML = `
      <div class="modal-backdrop" id="ws-config-modal">
        <div class="modal-card" style="max-width:580px">
          <div class="modal-header">
            <div>
              <div style="font-size:11px;font-weight:700;color:#818CF8;text-transform:uppercase">Stage Setup</div>
              <h3 style="font-size:18px;margin:2px 0 0">${esc(stage.name)}</h3>
            </div>
            <button class="icon-btn" id="ws-modal-close"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body col gap-md">
            <!-- Topic Selection -->
            <div>
              <label class="field-label">Speech Topic</label>
              <div style="display:flex;flex-direction:column;gap:6px">
                <input type="text" id="ws-topic-input" class="field-input" value="${esc(defaultTopic)}" placeholder="Enter your custom speech topic..." />
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
                  ${topics.map((t) => `
                    <button type="button" class="pill ws-topic-chip" data-topic="${esc(t.title)}" style="cursor:pointer">
                      ${esc(t.title)}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Speaking Mode & Difficulty -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label class="field-label">Speaking Mode</label>
                <select id="ws-mode-select" class="field-select">
                  <option value="practice" selected>Practice (Supportive)</option>
                  <option value="performance">Live Performance (Realistic)</option>
                  <option value="debate">Debate (Challenging)</option>
                  <option value="impromptu">Impromptu (Spontaneous)</option>
                </select>
              </div>
              <div>
                <label class="field-label">Difficulty</label>
                <select id="ws-difficulty-select" class="field-select">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate" selected>Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <!-- Audience Size & Duration -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label class="field-label">Audience Size</label>
                <select id="ws-audience-select" class="field-select">
                  <option value="10">Intimate (10 people)</option>
                  <option value="30" selected>Standard (30 people)</option>
                  <option value="50">Large (50 people)</option>
                  <option value="100">Full Hall (100 people)</option>
                </select>
              </div>
              <div>
                <label class="field-label">Duration</label>
                <select id="ws-duration-select" class="field-select">
                  <option value="1">1 Minute (Elevator Pitch)</option>
                  <option value="3" selected>3 Minutes (Standard Talk)</option>
                  <option value="5">5 Minutes (Keynote Segment)</option>
                  <option value="10">10 Minutes (Full Address)</option>
                </select>
              </div>
            </div>

            <!-- Input & Feedback Timing -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label class="field-label">Input Mode</label>
                <select id="ws-input-select" class="field-select">
                  <option value="voice" selected>Real Voice (Microphone)</option>
                  <option value="text">Text Fallback</option>
                </select>
              </div>
              <div>
                <label class="field-label">Feedback Timing</label>
                <select id="ws-feedback-select" class="field-select">
                  <option value="after" selected>After Speech (Report)</option>
                  <option value="during">During Speech (Live nudges)</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="ws-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-launch-stage">
              Step Onto Stage <i class="bi bi-mic-fill"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el(modalHTML));

    // Topic chips handler
    $all2('.ws-topic-chip').forEach((chip) => {
      chip.onclick = () => {
        const input = $('#ws-topic-input');
        if (input) input.value = chip.dataset.topic;
      };
    });

    const modalEl = $('#ws-config-modal');
    const closeModal = () => modalEl && modalEl.remove();

    $('#ws-modal-close').onclick = closeModal;
    $('#ws-modal-cancel').onclick = closeModal;

    // Launch stage button
    $('#btn-launch-stage').onclick = async () => {
      const topic = $('#ws-topic-input').value.trim() || defaultTopic;
      const mode = $('#ws-mode-select').value;
      const difficulty = $('#ws-difficulty-select').value;
      const audienceSize = parseInt($('#ws-audience-select').value, 10) || 30;
      const targetDurationMinutes = parseInt($('#ws-duration-select').value, 10) || 3;
      const inputMode = $('#ws-input-select').value;
      const feedbackTiming = $('#ws-feedback-select').value;

      const launchBtn = $('#btn-launch-stage');
      launchBtn.disabled = true;
      launchBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;margin-right:6px"></span> Entering Stage...`;

      try {
        const payload = {
          stageId: stage.stageId,
          topic,
          mode,
          difficulty,
          audienceSize,
          targetDurationMinutes,
          inputMode,
          feedbackTiming,
        };

        const res = await Api.createWorldStageSession(payload);
        closeModal();

        WSState.activeSession = res.session;
        WSState.selectedStage = res.stage || stage;
        WSState.remainingSeconds = targetDurationMinutes * 60;
        WSState.isPaused = false;
        WSState.viewState = 'live';
        renderCurrentScreen();
      } catch (err) {
        apiError(err);
        launchBtn.disabled = false;
        launchBtn.textContent = 'Step Onto Stage';
      }
    };
  }

  // --------------------------------------------------------------------------
  // SCREEN 3: LIVE AUDITORIUM STAGE INTERFACE
  // --------------------------------------------------------------------------
  function renderLiveStage(root) {
    const session = WSState.activeSession;
    const stage = WSState.selectedStage || { name: 'Public Speaking Stage' };
    if (!session) {
      WSState.viewState = 'hub';
      renderCurrentScreen();
      return;
    }

    const audience = session.audienceMembers || [];
    stageTotalWords = 0;
    stageTotalSpeechSec = 0;

    root.innerHTML = `
      <div class="ws-live-stage">
        <div class="ws-auditorium">
          <div class="ws-spotlight"></div>

          <!-- Top Stage Bar -->
          <div class="ws-stage-topbar">
            <div style="display:flex;align-items:center;gap:12px">
              <button class="btn btn-ghost btn-sm" id="btn-leave-stage" style="color:#94A3B8">
                <i class="bi bi-chevron-left"></i> Exit Stage
              </button>
              <div>
                <div style="font-weight:700;font-size:16px;color:#F8FAFC">${esc(stage.name)}</div>
                <div style="font-size:12px;color:#818CF8">Topic: "${esc(session.topic)}"</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="ws-pace-pill ws-pace-optimal" id="ws-pace-pill" style="display:none">
                <i class="bi bi-speedometer2"></i> <span id="ws-pace-text">Optimal</span>
              </div>
              <div class="ws-timer-pill" id="ws-timer-box">
                <i class="bi bi-clock"></i> <span id="ws-timer-text">03:00</span>
              </div>
              <button class="btn btn-ghost btn-sm" id="btn-pause-stage" title="Pause Presentation">
                <i class="bi bi-pause-fill"></i> Pause
              </button>
              <button class="btn btn-primary btn-sm" id="btn-finish-speech">
                <i class="bi bi-flag-fill"></i> Complete Presentation
              </button>
            </div>
          </div>

          <!-- Tiered Audience Avatar Grid -->
          <div class="ws-audience-section">
            <div class="ws-audience-header">
              <span>Audience (${audience.length} Attendees)</span>
              <span id="ws-audience-sentiment"><i class="bi bi-activity"></i> Attentive silence</span>
            </div>
            <div class="ws-audience-grid" id="ws-audience-grid">
              ${audience.map((m) => `
                <div class="ws-audience-card" id="card-${esc(m.memberId)}">
                  ${avatarHTML(m.name, 34)}
                  <span class="ws-aud-name" title="${esc(m.name)}">${esc(m.name)}</span>
                  <span class="ws-aud-role" title="${esc(m.role)}">${esc(m.role)}</span>
                  <div class="ws-aud-bubble" id="bubble-${esc(m.memberId)}" style="display:none">👏</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Speaker Podium & Live Speech Transcript -->
          <div class="ws-stage-podium">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:700;font-size:13px;color:#CBD5E1">
                <i class="bi bi-soundwave"></i> Live Speech Transcript
              </span>
              <span style="font-size:12px;color:#94A3B8" id="ws-speech-state">Microphone ready</span>
            </div>
            <div class="ws-transcript-box" id="ws-transcript-box">
              <span id="ws-final-text">${esc(session.fullTranscript || '')}</span>
              <span id="ws-interim-text" class="ws-interim-text"></span>
            </div>

            <!-- Audience Q&A Banner (Shown when question is asked) -->
            <div id="ws-question-container" style="display:none"></div>

            <!-- Stage Controls Dock -->
            <div class="ws-controls-dock">
              <div style="display:flex;align-items:center;gap:8px">
                <button class="btn btn-ghost btn-sm" id="btn-ask-floor" title="Invite a question from audience">
                  <i class="bi bi-hand-index-thumb"></i> Take Question from Floor
                </button>
                <button class="btn btn-ghost btn-sm" id="btn-toggle-ws-input">
                  <i class="bi bi-keyboard"></i> <span id="ws-toggle-label">${session.inputMode === 'voice' ? 'Switch to Typing' : 'Switch to Voice'}</span>
                </button>
              </div>

              <!-- Voice Recording Center Button -->
              <div class="ws-mic-center" id="ws-voice-dock" style="${session.inputMode === 'voice' ? 'display:flex' : 'display:none'}">
                <button class="ws-mic-btn" id="btn-ws-mic" aria-label="Toggle Microphone Recording">
                  <i class="bi bi-mic-fill" id="ws-mic-icon"></i>
                </button>
                <div class="ws-vu-meter" id="ws-vu-meter" style="display:none" title="Live Volume Level">
                  <div class="ws-vu-bar" id="ws-vu-bar"></div>
                </div>
                <div style="font-size:12px;color:#94A3B8" id="ws-mic-instruction">Click microphone to speak</div>
              </div>

              <!-- Text Fallback Input -->
              <form id="ws-text-form" style="${session.inputMode === 'text' ? 'display:flex' : 'display:none'};flex:1;gap:8px;max-width:500px">
                <input type="text" id="ws-text-input" class="field-input" placeholder="Type what you say on stage... (Press Enter to deliver)" style="flex:1" />
                <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-send-fill"></i> Speak</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize timer
    startStageTimer();

    // Setup live stage listeners
    setupLiveStageListeners();
  }

  function startStageTimer() {
    if (WSState.timerInterval) clearInterval(WSState.timerInterval);

    const updateDisplay = () => {
      const displayEl = $('#ws-timer-text');
      if (!displayEl) return;
      const m = Math.floor(WSState.remainingSeconds / 60);
      const s = WSState.remainingSeconds % 60;
      displayEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      const timerBox = $('#ws-timer-box');
      if (timerBox) {
        if (WSState.remainingSeconds <= 30) {
          timerBox.classList.add('urgent-fuse');
        } else {
          timerBox.classList.remove('urgent-fuse');
        }
      }
    };

    updateDisplay();
    WSState.timerInterval = setInterval(() => {
      if (WSState.isPaused) return;

      if (WSState.remainingSeconds > 0) {
        WSState.remainingSeconds--;
        updateDisplay();
      } else {
        clearInterval(WSState.timerInterval);
        toast('Speech time elapsed! Finalizing stage performance report...', 'amber');
        finishWorldStageSession();
      }
    }, 1000);
  }

  function setupLiveStageListeners() {
    // Exit stage
    $('#btn-leave-stage').onclick = () => {
      if (confirm('Leave the stage? Your current session will be saved in history.')) {
        cleanupLiveStage();
        WSState.viewState = 'hub';
        renderCurrentScreen();
      }
    };

    // Pause/Resume
    $('#btn-pause-stage').onclick = () => {
      WSState.isPaused = !WSState.isPaused;
      const btn = $('#btn-pause-stage');
      if (WSState.isPaused) {
        if (SpeechInput.listening) SpeechInput.stop();
        stopMicVisualizer();
        btn.innerHTML = `<i class="bi bi-play-fill"></i> Resume`;
        $('#ws-speech-state').textContent = 'Presentation paused';
      } else {
        btn.innerHTML = `<i class="bi bi-pause-fill"></i> Pause`;
        $('#ws-speech-state').textContent = 'Microphone ready';
      }
    };

    // Finish presentation
    $('#btn-finish-speech').onclick = () => {
      if (confirm('Conclude your presentation and generate your 100-point performance report?')) {
        finishWorldStageSession();
      }
    };

    // Toggle Input Mode (Voice vs Text)
    $('#btn-toggle-ws-input').onclick = () => {
      const isVoice = $('#ws-voice-dock').style.display !== 'none';
      if (isVoice) {
        if (SpeechInput.listening) SpeechInput.stop();
        stopMicVisualizer();
        $('#ws-voice-dock').style.display = 'none';
        $('#ws-text-form').style.display = 'flex';
        $('#ws-toggle-label').textContent = 'Switch to Voice';
        $('#ws-speech-state').textContent = 'Typing mode active';
      } else {
        $('#ws-text-form').style.display = 'none';
        $('#ws-voice-dock').style.display = 'flex';
        $('#ws-toggle-label').textContent = 'Switch to Typing';
        $('#ws-speech-state').textContent = 'Microphone ready';
      }
    };

    // Take question from floor button
    $('#btn-ask-floor').onclick = async () => {
      const btn = $('#btn-ask-floor');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:12px;height:12px;margin-right:4px"></span> Audience raising hand...`;

      try {
        const res = await Api.triggerWorldStageQuestion(WSState.activeSession._id);
        WSState.activeSession = res.session;
        displayAudienceQuestion(res.question);
      } catch (err) {
        apiError(err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-hand-index-thumb"></i> Take Question from Floor`;
      }
    };

    // Text speech submission
    $('#ws-text-form').onsubmit = async (e) => {
      e.preventDefault();
      const input = $('#ws-text-input');
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      await sendSpeechSegment(text, 0, false);
    };

    // Microphone speech capture
    const micBtn = $('#btn-ws-mic');
    micBtn.onclick = () => {
      if (!SpeechInput.supported) {
        toast('Speech recognition not supported in browser. Use typing mode.', 'coral');
        return;
      }

      if (SpeechInput.listening) {
        SpeechInput.stop();
        stopMicVisualizer();
        micBtn.classList.remove('recording');
        $('#ws-mic-instruction').textContent = 'Click microphone to speak';
        $('#ws-speech-state').textContent = 'Processing speech segment...';
      } else {
        SpeechOutput.stop();
        WSState.recordStartTime = Date.now();
        micBtn.classList.add('recording');
        $('#ws-mic-instruction').textContent = 'Speaking live on stage... (Click to pause)';
        $('#ws-speech-state').textContent = 'Listening to microphone';
        startMicVisualizer();

        let lastFinal = '';

        SpeechInput.start({
          onResult: ({ final, interim }) => {
            lastFinal = final;
            const interimEl = $('#ws-interim-text');
            if (interimEl) {
              interimEl.textContent = interim ? ` ${interim}` : '';
            }
          },
          onEnd: async (fullFinal) => {
            micBtn.classList.remove('recording');
            stopMicVisualizer();
            const dur = Math.max(1, (Date.now() - WSState.recordStartTime) / 1000);
            const textToSend = (fullFinal || lastFinal || '').trim();

            const interimEl = $('#ws-interim-text');
            if (interimEl) interimEl.textContent = '';

            if (textToSend) {
              await sendSpeechSegment(textToSend, dur, true);
            } else {
              $('#ws-speech-state').textContent = 'Microphone idle';
              $('#ws-mic-instruction').textContent = 'Click microphone to speak';
            }
          },
          onError: (err) => {
            micBtn.classList.remove('recording');
            stopMicVisualizer();
            $('#ws-speech-state').textContent = 'Microphone idle';
            $('#ws-mic-instruction').textContent = 'Click microphone to speak';
            toast(typeof err === 'string' ? err : 'Microphone error', 'coral');
          },
        });
      }
    };
  }

  async function sendSpeechSegment(text, audioDurationSeconds = 0, measuredDuration = false) {
    const session = WSState.activeSession;
    if (!session) return;

    // Update real-time pacing calculation
    const wordsCount = text.split(/\s+/).filter(Boolean).length;
    if (measuredDuration && audioDurationSeconds > 0) {
      updateLivePacing(wordsCount, audioDurationSeconds);
    } else {
      const estSec = Math.max(1, (wordsCount / 130) * 60);
      updateLivePacing(wordsCount, estSec);
    }

    // Optimistically update transcript box
    const finalSpan = $('#ws-final-text');
    if (finalSpan) {
      finalSpan.textContent = (finalSpan.textContent ? finalSpan.textContent + ' ' : '') + text;
      const box = $('#ws-transcript-box');
      if (box) box.scrollTop = box.scrollHeight;
    }

    try {
      const res = await Api.submitWorldStageSpeech(session._id, {
        text,
        audioDurationSeconds,
        measuredDuration,
      });

      WSState.activeSession = res.session;

      // Animate live reactions on the audience grid and play sound
      if (res.newReactions && res.newReactions.length > 0) {
        animateAudienceReactions(res.newReactions);
      }

      $('#ws-speech-state').textContent = 'Audience engaged';
    } catch (err) {
      apiError(err);
      $('#ws-speech-state').textContent = 'Error updating speech';
    }
  }

  function animateAudienceReactions(reactions) {
    let hasApplause = false;
    reactions.forEach((r) => {
      const bubble = $(`#bubble-${r.memberId}`);
      if (bubble) {
        bubble.textContent = r.emoji || '👏';
        bubble.style.display = 'flex';
        setTimeout(() => {
          if (bubble) bubble.style.display = 'none';
        }, 3500);
      }
      if (r.emoji === '👏' || r.sentiment === 'positive') {
        hasApplause = true;
      }
    });

    if (hasApplause) {
      playApplauseSound();
    }

    // Update sentiment label
    const sentimentEl = $('#ws-audience-sentiment');
    if (sentimentEl && reactions.length > 0) {
      sentimentEl.innerHTML = `<i class="bi bi-activity"></i> ${esc(reactions[0].label || 'Audience reacting')}`;
    }
  }

  function displayAudienceQuestion(q) {
    const container = $('#ws-question-container');
    if (!container) return;

    container.style.display = 'block';
    container.innerHTML = `
      <div class="ws-question-banner">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;align-items:center;gap:10px">
            ${avatarHTML(q.askerName, 34)}
            <div>
              <div style="font-weight:700;font-size:14px;color:#F8FAFC">
                ${esc(q.askerName)} <span class="pill" style="font-size:10px">${esc(q.askerRole)}</span>
              </div>
              <div style="font-size:11px;color:#94A3B8">Question from the audience</div>
            </div>
          </div>
          <button class="icon-btn" id="btn-listen-ws-question" title="Listen to question"><i class="bi bi-volume-up"></i></button>
        </div>
        <div style="font-size:14px;color:#E2E8F0;font-style:italic">"${esc(q.questionText)}"</div>
        <form id="ws-answer-form" style="display:flex;gap:8px;margin-top:6px">
          <input type="text" id="ws-answer-input" class="field-input" placeholder="Address this question to the audience..." style="flex:1" required />
          <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-send"></i> Answer</button>
        </form>
      </div>
    `;

    // Persona-tailored pitch and rate for distinct audience voices
    const archetypePitches = {
      strict_professor: { pitch: 0.82, rate: 0.92 },
      curious_student: { pitch: 1.22, rate: 1.05 },
      industry_expert: { pitch: 0.92, rate: 0.96 },
      supportive_listener: { pitch: 1.05, rate: 1.0 },
      skeptic: { pitch: 0.88, rate: 0.94 },
      journalist: { pitch: 1.0, rate: 1.04 },
      beginner_listener: { pitch: 1.12, rate: 0.98 },
    };
    const voiceSettings = archetypePitches[q.askerArchetype] || { pitch: 1.0, rate: 0.98 };

    // Speak the question aloud with character voice
    SpeechOutput.speak(q.questionText, voiceSettings);

    $('#btn-listen-ws-question').onclick = () => SpeechOutput.speak(q.questionText, voiceSettings);

    $('#ws-answer-form').onsubmit = async (e) => {
      e.preventDefault();
      const ansInput = $('#ws-answer-input');
      const answerText = ansInput.value.trim();
      if (!answerText) return;

      ansInput.disabled = true;
      try {
        const res = await Api.submitWorldStageAnswer(WSState.activeSession._id, {
          questionId: q.questionId,
          answerText,
        });

        WSState.activeSession = res.session;
        container.style.display = 'none';
        toast('Answer acknowledged by the audience!', 'sprout');
      } catch (err) {
        apiError(err);
        ansInput.disabled = false;
      }
    };
  }

  async function finishWorldStageSession() {
    cleanupLiveStage();
    const session = WSState.activeSession;
    if (!session) return;

    const root = $('#ws-container') || $('#view-inner');
    root.innerHTML = `
      <div class="card" style="padding:48px;text-align:center">
        <div class="spinner" style="margin:0 auto 16px"></div>
        <h3 style="font-size:18px;margin:0 0 8px">Evaluating Stage Performance...</h3>
        <p style="color:var(--cream-dim);font-size:13px;max-width:440px;margin:0 auto">
          Our audience scoring engine is analyzing your speech across 8 dimensions: grammar, vocabulary, clarity, pacing, and audience engagement.
        </p>
      </div>
    `;

    try {
      const res = await Api.endWorldStageSession(session._id);
      WSState.activeSession = res.session;
      WSState.evaluation = res.evaluation;
      WSState.viewState = 'report';

      if (res.xpAwarded) {
        addStudentXP(res.xpAwarded);
        toast(`+${res.xpAwarded} XP awarded for stage presentation!`, 'sprout');
      }

      // TODO (Weak Words Lab Integration): World Stage currently evaluates high-level rhetorical,
      // grammar, and delivery metrics (measuredWpm, filler words) rather than word-level alignment diffs.
      // When forced-alignment ASR is added to return mispronounced words in WorldStageSession.evaluation,
      // send them to Api.postWeakWordsBulk({ words: mispronouncedList, source: 'world-stage' }).

      renderCurrentScreen();
    } catch (err) {
      apiError(err);
      WSState.viewState = 'hub';
      renderCurrentScreen();
    }
  }

  function cleanupLiveStage() {
    if (WSState.timerInterval) {
      clearInterval(WSState.timerInterval);
      WSState.timerInterval = null;
    }
    if (SpeechInput.listening) SpeechInput.stop();
    stopMicVisualizer();
    SpeechOutput.stop();
  }

  // --------------------------------------------------------------------------
  // SCREEN 4: PERFORMANCE REPORT & REPLAY
  // --------------------------------------------------------------------------
  async function openSpeechReport(sessionId) {
    const root = $('#ws-container') || $('#view-inner');
    root.innerHTML = `
      <div class="card" style="padding:48px;text-align:center">
        <div class="spinner" style="margin:0 auto 16px"></div>
        <div style="font-size:14px;color:var(--cream-dim)">Loading stage performance report...</div>
      </div>
    `;

    try {
      const res = await Api.getWorldStageReport(sessionId);
      WSState.activeSession = res.session;
      WSState.selectedStage = res.stage;
      WSState.evaluation = res.evaluation;
      WSState.viewState = 'report';
      renderCurrentScreen();
    } catch (err) {
      apiError(err);
      WSState.viewState = 'hub';
      renderCurrentScreen();
    }
  }

  function renderReportScreen(root) {
    const session = WSState.activeSession;
    const stage = WSState.selectedStage || { name: session?.stageName || 'Stage' };
    const ev = WSState.evaluation || session?.evaluation;

    if (!ev) {
      root.innerHTML = `
        <div class="error-box">
          No evaluation report found for this session.
          <button class="btn btn-primary btn-sm" onclick="WSState.viewState='hub';renderCurrentScreen()">Return to Hub</button>
        </div>
      `;
      return;
    }

    const overall = ev.overallScore || 0;
    const grade = overall >= 85 ? 'Distinguished' : overall >= 70 ? 'Proficient' : overall >= 50 ? 'Developing' : 'Needs Practice';
    const gradeColor = overall >= 85 ? '#10B981' : overall >= 70 ? '#38BDF8' : overall >= 50 ? '#F59E0B' : '#F43F5E';
    const dims = ev.dimensionScores || {};
    const delivery = ev.deliveryMetrics || {};

    root.innerHTML = `
      <div class="col gap-lg">
        <!-- Top Navigation -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <button class="btn btn-ghost btn-sm" id="btn-rep-hub" style="margin-bottom:6px">
              <i class="bi bi-chevron-left"></i> World Stage Hub
            </button>
            <h2 style="font-size:22px;font-weight:700;margin:0">Public Speaking Performance Report</h2>
            <div style="font-size:13px;color:var(--cream-dim)">
              ${esc(stage.name)} &middot; Topic: "${esc(session.topic)}"
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" id="btn-rep-retry">
              <i class="bi bi-arrow-repeat"></i> Retry Presentation
            </button>
            <button class="btn btn-primary btn-sm" id="btn-rep-another">
              New Stage <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- Overall Score & 8-Dimension Breakdown Grid -->
        <div class="ws-report-hero">
          <div class="ws-gauge-card">
            <div class="ws-gauge-circle" style="border-color:${gradeColor}">
              <div class="ws-gauge-number" id="ws-report-overall-score" style="color:${gradeColor}">0</div>
              <div style="font-size:11px;color:var(--cream-faint);margin-top:2px">/ 100 points</div>
            </div>
            <div class="ws-gauge-grade" style="color:${gradeColor}">${grade} Speaker</div>
            <div style="font-size:12px;color:var(--cream-faint);margin-top:4px">
              Audience Approval: <b>${delivery.audienceApprovalRate || 85}%</b>
            </div>
          </div>

          <div class="card col gap-sm">
            <div class="section-title"><i class="bi bi-bar-chart-fill"></i> 8-Dimension Evaluation Breakdown</div>
            <div class="ws-dimensions-grid">
              <div class="ws-dim-row">
                <div class="ws-dim-header"><span>Grammar Accuracy (15%)</span><b>${dims.grammarAccuracy || 0}/15</b></div>
                <div class="progress-bar"><div class="progress-fill sprout" style="width:${((dims.grammarAccuracy || 0) / 15) * 100}%"></div></div>
              </div>
              <div class="ws-dim-row">
                <div class="ws-dim-header"><span>Vocabulary Richness (15%)</span><b>${dims.vocabulary || 0}/15</b></div>
                <div class="progress-bar"><div class="progress-fill cyan" style="width:${((dims.vocabulary || 0) / 15) * 100}%"></div></div>
              </div>
              <div class="ws-dim-row">
                <div class="ws-dim-header"><span>Sentence Formation (10%)</span><b>${dims.sentenceFormation || 0}/10</b></div>
                <div class="progress-bar"><div class="progress-fill purple" style="width:${((dims.sentenceFormation || 0) / 10) * 100}%"></div></div>
              </div>
              <div class="ws-dim-row">
                <div class="ws-dim-header"><span>Clarity & Coherence (15%)</span><b>${dims.clarity || 0}/15</b></div>
                <div class="progress-bar"><div class="progress-fill amber" style="width:${((dims.clarity || 0) / 15) * 100}%"></div></div>
              </div>
              <div class="ws-dim-row">
                <div class="ws-dim-header"><span>Topic Relevance (15%)</span><b>${dims.topicRelevance || 0}/15</b></div>
                <div class="progress-bar"><div class="progress-fill cyan" style="width:${((dims.topicRelevance || 0) / 15) * 100}%"></div></div>
              </div>
              <div class="ws-dim-row">
                <div class="ws-dim-header"><span>Fluency & Pacing (10%)</span><b>${dims.fluency || 0}/10</b></div>
                <div class="progress-bar"><div class="progress-fill sprout" style="width:${((dims.fluency || 0) / 10) * 100}%"></div></div>
              </div>
              <div class="ws-dim-row">
                <div class="ws-dim-header"><span>Speech Organization (10%)</span><b>${dims.speechOrganization || 0}/10</b></div>
                <div class="progress-bar"><div class="progress-fill purple" style="width:${((dims.speechOrganization || 0) / 10) * 100}%"></div></div>
              </div>
              <div class="ws-dim-row">
                <div class="ws-dim-header"><span>Audience Engagement (5%)</span><b>${dims.audienceEngagement || 0}/5</b></div>
                <div class="progress-bar"><div class="progress-fill amber" style="width:${((dims.audienceEngagement || 0) / 5) * 100}%"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Verified Speech Delivery Metrics -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div class="section-title"><i class="bi bi-mic-fill"></i> Verified Delivery Metrics</div>
            <span class="pill ${delivery.isMeasured ? 'sprout' : 'amber'}" style="font-size:11px">
              ${delivery.isMeasured ? '✓ Verified Audio Timing' : 'Estimated Transcript Metrics'}
            </span>
          </div>
          <div class="sim-metrics-grid">
            <div class="sim-stat-box">
              <div class="sim-stat-val">${delivery.measuredWpm || 0} <small>WPM</small></div>
              <div class="sim-stat-lbl">Speaking Cadence</div>
              <div style="font-size:11px;color:var(--cream-faint);margin-top:2px">Optimal range: 120-160 WPM</div>
            </div>
            <div class="sim-stat-box">
              <div class="sim-stat-val">${delivery.speechDurationSeconds || 0}s</div>
              <div class="sim-stat-lbl">Total Speaking Duration</div>
              <div style="font-size:11px;color:var(--cream-faint);margin-top:2px">${session.speechSegments?.length || 1} speech segment(s)</div>
            </div>
            <div class="sim-stat-box">
              <div class="sim-stat-val" style="color:${delivery.fillerCount > 3 ? '#F43F5E' : '#10B981'}">
                ${delivery.fillerCount || 0}
              </div>
              <div class="sim-stat-lbl">Filler Words Detected</div>
              <div style="font-size:11px;color:var(--cream-faint);margin-top:2px">
                ${delivery.fillerWordsDetected?.length ? esc(delivery.fillerWordsDetected.join(', ')) : 'Clean delivery!'}
              </div>
            </div>
          </div>
        </div>

        <!-- Strengths & Weaknesses -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card col gap-sm">
            <div class="section-title sprout"><i class="bi bi-check-circle-fill"></i> Speaker Strengths</div>
            <ul class="sim-bullet-list">
              ${(ev.strengths || ['Good adherence to presentation topic.']).map((s) => `<li>${esc(s)}</li>`).join('')}
            </ul>
          </div>
          <div class="card col gap-sm">
            <div class="section-title amber"><i class="bi bi-exclamation-triangle-fill"></i> Areas for Improvement</div>
            <ul class="sim-bullet-list">
              ${(ev.weaknesses || ['Incorporate more signposting transitions.']).map((w) => `<li>${esc(w)}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Grammar Corrections & Vocabulary Elevation -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card col gap-sm">
            <div class="section-title coral"><i class="bi bi-edit-2"></i> Grammar Corrections</div>
            ${ev.grammarCorrections && ev.grammarCorrections.length > 0 ? `
              <div class="col gap-xs">
                ${ev.grammarCorrections.map((g) => `
                  <div class="sim-mistake-box">
                    <div style="font-size:13px"><b>Spoken:</b> "${esc(g.original)}"</div>
                    <div style="font-size:13px;color:var(--sprout);margin-top:2px"><b>Correction:</b> "${esc(g.corrected)}"</div>
                    <div style="font-size:11px;color:var(--cream-dim);margin-top:2px">${esc(g.explanation)}</div>
                  </div>
                `).join('')}
              </div>
            ` : `<div style="font-size:13px;color:var(--cream-dim)">No prominent grammatical mistakes detected!</div>`}
          </div>

          <div class="card col gap-sm">
            <div class="section-title cyan"><i class="bi bi-gem"></i> Vocabulary Upgrades</div>
            ${ev.vocabularyAlternatives && ev.vocabularyAlternatives.length > 0 ? `
              <div class="col gap-xs">
                ${ev.vocabularyAlternatives.map((v) => `
                  <div class="sim-mistake-box" style="border-left-color:#38BDF8">
                    <div style="font-size:13px"><b>Instead of:</b> "${esc(v.original)}"</div>
                    <div style="font-size:13px;color:#38BDF8;margin-top:2px"><b>Elevate to:</b> ${esc(v.elevated)}</div>
                    <div style="font-size:11px;color:var(--cream-dim);margin-top:2px">${esc(v.context)}</div>
                  </div>
                `).join('')}
              </div>
            ` : `<div style="font-size:13px;color:var(--cream-dim)">Solid vocabulary selection throughout your talk.</div>`}
          </div>
        </div>

        <!-- Historical Comparison & Suggested Exercises -->
        <div class="card col gap-sm">
          <div class="section-title"><i class="bi bi-graph-up"></i> Progress & Prescribed Exercises</div>
          <div style="font-size:14px;color:var(--color-text);margin-bottom:8px">
            <b>Historical Trajectory:</b> ${esc(ev.pastComparison?.comment || 'First presentation recorded!')}
          </div>
          <div style="font-size:13px;font-weight:600;color:var(--cream-dim)">Recommended Drills:</div>
          <ul class="sim-bullet-list">
            ${(ev.suggestedExercises || ['Practice vocal pausing drills.']).map((ex) => `<li>${esc(ex)}</li>`).join('')}
          </ul>
        </div>

        <!-- Full Speech Transcript Replay -->
        <div class="card col gap-sm">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="section-title"><i class="bi bi-file-earmark-text"></i> Full Presentation Transcript</div>
            <button class="btn btn-ghost btn-sm" id="btn-listen-full-transcript">
              <i class="bi bi-volume-up"></i> Listen to Speech
            </button>
          </div>
          <div style="font-size:14px;color:var(--color-text);line-height:1.6;white-space:pre-wrap;padding:12px;background:var(--color-surface);border-radius:10px;border:1px solid var(--line)">
            ${esc(session.fullTranscript || 'No speech recorded.')}
          </div>
        </div>
      </div>
    `;

    $('#btn-listen-full-transcript').onclick = () => SpeechOutput.speak(session.fullTranscript);

    $('#btn-rep-hub').onclick = () => {
      WSState.viewState = 'hub';
      renderCurrentScreen();
    };

    $('#btn-rep-retry').onclick = () => {
      openStageConfigModal(stage.stageId);
    };

    $('#btn-rep-another').onclick = () => {
      WSState.viewState = 'hub';
      renderCurrentScreen();
    };

    // Dramatic score count-up
    const scoreNumEl = $('#ws-report-overall-score');
    if (scoreNumEl && overall > 0) {
      let cur = 0;
      const countInterval = setInterval(() => {
        cur += Math.ceil((overall - cur) / 6) || 1;
        if (cur >= overall) {
          cur = overall;
          clearInterval(countInterval);
          if (window.DragonMascot) {
            if (overall >= 70) {
              DragonMascot.celebrate({
                title: 'World Stage Triumph!',
                xp: Math.round(overall * 0.4),
                message: `You scored ${overall}/100! Your oratorical presence captivated the auditorium.`,
              });
            } else {
              DragonMascot.encourage({
                title: 'Stage Trial Completed',
                message: `You earned ${overall}/100. Every orator builds their stage presence through repeated trials.`,
                tip: 'Work on pacing and vocal projection to increase your audience approval.',
              });
            }
          }
        }
        scoreNumEl.textContent = cur;
      }, 40);
    }
  }
})();
