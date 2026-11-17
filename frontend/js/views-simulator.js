/* ==========================================================================
   LinGrow AI — AI Real-World Communication Simulator View
   Implements 5 environments:
     1. AI Job Interview Simulator
     2. AI Office Simulator
     3. AI Travel Companion
     4. AI Emergency Communication (with educational disclaimer)
     5. AI Negotiation Trainer
   Features:
     - Voice & Text multi-turn contextual conversations
     - Learning Mode (real-time feedback) & Challenge Mode
     - 100-point performance evaluation with verified delivery metrics
     - Replay system, history review, XP integration & streak tracking
   ========================================================================== */

(function () {
  window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};

  // Simulator view state
  const SimState = {
    viewState: 'hub', // 'hub' | 'select' | 'live' | 'report'
    environments: [],
    scenarios: [],
    stats: null,
    history: [],
    selectedEnv: null,
    selectedScenario: null,
    activeSession: null,
    evaluation: null,
    // Live session runtime
    isRecording: false,
    recordStartTime: 0,
    recordedDurationSeconds: 0,
    timerInterval: null,
    remainingSeconds: 600,
    hintOpen: false,
    currentHint: null,
  };

  /**
   * Main Simulator view router
   */
  VIEW_RENDERERS['simulator'] = async function (root) {
    root.innerHTML = `
      <div class="col gap-lg" id="sim-container">
        <div class="loading-state" style="padding:48px;text-align:center">
          <div class="spinner" style="margin:0 auto 16px"></div>
          <div style="font-size:14px;color:var(--cream-dim)">Initializing Real-World Communication Simulator...</div>
        </div>
      </div>
    `;

    try {
      await loadInitialData();
      renderCurrentScreen();
    } catch (err) {
      console.error('[simulator] Failed to initialize:', err);
      root.innerHTML = `
        <div class="error-box" style="margin:24px 0">
          Failed to load simulator: ${esc(err.message || 'Unknown error')}.
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="VIEW_RENDERERS['simulator']($('#view-inner'))">Retry</button>
        </div>
      `;
    }
  };

  async function loadInitialData() {
    const [envs, stats, history] = await Promise.all([
      Api.simulationEnvironments(),
      Api.simulationStats().catch(() => ({ totalSessions: 0, avgScore: 0, envCounts: {} })),
      Api.simulationHistory().catch(() => []),
    ]);

    SimState.environments = envs || [];
    SimState.stats = stats;
    SimState.history = history || [];
  }

  function renderCurrentScreen() {
    const root = $('#sim-container') || $('#view-inner');
    if (!root) return;

    if (SimState.viewState === 'hub') {
      renderHub(root);
    } else if (SimState.viewState === 'select') {
      renderScenarioSelect(root);
    } else if (SimState.viewState === 'live') {
      renderLiveSession(root);
    } else if (SimState.viewState === 'report') {
      renderReportScreen(root);
    }
  }

  // --------------------------------------------------------------------------
  // SCREEN 1: SIMULATOR HUB / DASHBOARD
  // --------------------------------------------------------------------------
  function renderHub(root) {
    const s = SimState.stats || { totalSessions: 0, avgScore: 0, envCounts: {} };
    const hist = SimState.history || [];

    const envThemeIcons = {
      interview: 'bi-person-badge',
      office: 'bi-briefcase',
      travel: 'bi-airplane',
      emergency: 'bi-shield-exclamation',
      negotiation: 'bi-graph-up-arrow',
    };

    const envThemeColors = {
      interview: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))',
      office: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(59,130,246,0.1))',
      travel: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(20,184,166,0.1))',
      emergency: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.1))',
      negotiation: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))',
    };

    root.innerHTML = `
      <div class="col gap-lg">
        <!-- Hero Introduction Banner -->
        <div class="sim-hero card">
          <div class="sim-hero-content">
            <div class="sim-hero-badge"><i class="bi bi-stars"></i> Interactive AI Practice</div>
            <h2 class="sim-hero-title">AI Real-World Communication Simulator</h2>
            <p class="sim-hero-desc">
              Immerse yourself in high-stakes job interviews, agile workplace standups, international border control, and dynamic salary negotiations. Practice with adaptive AI characters that speak, listen, and offer instant linguistic corrections.
            </p>
            <div class="sim-hero-metrics">
              <div class="sim-metric-item">
                <span class="sim-metric-val">${s.totalSessions || 0}</span>
                <span class="sim-metric-lbl">Simulations Done</span>
              </div>
              <div class="sim-metric-sep"></div>
              <div class="sim-metric-item">
                <span class="sim-metric-val" style="color:var(--sprout)">${s.avgScore || 0}%</span>
                <span class="sim-metric-lbl">Average Score</span>
              </div>
              <div class="sim-metric-sep"></div>
              <div class="sim-metric-item">
                <span class="sim-metric-val" style="color:var(--amber)">${s.streak || 0} <i class="bi bi-fire"></i></span>
                <span class="sim-metric-lbl">Day Streak</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Five Simulation Environments Grid -->
        <div>
          <div class="section-title" style="margin-bottom:12px">
            <i class="bi bi-grid-fill"></i> Choose Simulation Environment
          </div>
          <div class="sim-env-grid">
            ${SimState.environments.map((env) => `
              <div class="sim-env-card card" data-env="${esc(env.id)}" style="background:${envThemeColors[env.id] || 'var(--color-surface)'}">
                <div class="sim-env-header">
                  <div class="sim-env-icon-box">
                    <i class="bi ${envThemeIcons[env.id] || 'bi-chat-dots'}"></i>
                  </div>
                  <span class="pill ${env.id === 'emergency' ? 'coral' : 'sprout'}">${esc(env.badge || 'Available')}</span>
                </div>
                <h3 class="sim-env-title">${esc(env.title)}</h3>
                <div class="sim-env-subtitle">${esc(env.subtitle)}</div>
                <p class="sim-env-desc">${esc(env.description)}</p>
                ${env.disclaimer ? `<div class="sim-env-disclaimer"><i class="bi bi-info-circle"></i> ${esc(env.disclaimer)}</div>` : ''}
                <div class="sim-env-footer">
                  <span class="sim-env-count"><b>${env.scenarioCount || 3}</b> Scenarios</span>
                  <button class="btn btn-primary btn-sm btn-open-env" data-env="${esc(env.id)}">
                    Explore <i class="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Recent Simulation History -->
        <div class="card col gap-sm">
          <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
            <span><i class="bi bi-clock-history"></i> Recent Simulations & Replays</span>
            <span style="font-size:12px;color:var(--cream-faint);font-weight:400">${hist.length} total sessions recorded</span>
          </div>
          ${hist.length > 0 ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Scenario & Character</th>
                    <th>Environment</th>
                    <th>Mode</th>
                    <th>Overall Score</th>
                    <th>Date</th>
                    <th style="text-align:right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${hist.slice(0, 8).map((session) => `
                    <tr>
                      <td>
                        <div style="font-weight:600;color:var(--color-text)">${esc(session.scenarioTitle || session.scenarioId)}</div>
                        <div style="font-size:12px;color:var(--cream-faint)">with ${esc(session.character?.name || 'AI Specialist')} (${esc(session.character?.role || 'Interviewer')})</div>
                      </td>
                      <td>
                        <span class="pill" style="font-size:11px;text-transform:capitalize">${esc(session.environment)}</span>
                      </td>
                      <td>
                        <span class="pill ${session.feedbackMode === 'learning' ? 'cyan' : 'purple'}" style="font-size:11px">
                          ${session.feedbackMode === 'learning' ? 'Learning' : 'Challenge'}
                        </span>
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
                        <button class="btn btn-ghost btn-sm btn-replay-session" data-session-id="${session._id}">
                          <i class="bi bi-journal-text"></i> Review & Replay
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state" style="padding:32px 16px;text-align:center">
              <i class="bi bi-chat-quote" style="font-size:32px;color:var(--cream-faint);margin-bottom:8px;display:inline-block"></i>
              <div style="font-weight:600">No simulations completed yet</div>
              <div style="font-size:13px;color:var(--cream-dim);margin-top:4px">
                Choose an environment above to start practicing real-world conversations!
              </div>
            </div>
          `}
        </div>
      </div>
    `;

    // Bind environment cards click
    $all2('.btn-open-env, .sim-env-card', root).forEach((el) => {
      el.onclick = (e) => {
        const envId = el.dataset.env || el.closest('.sim-env-card')?.dataset.env;
        if (envId) {
          openEnvironment(envId);
        }
      };
    });

    // Bind replay buttons
    $all2('.btn-replay-session', root).forEach((btn) => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const sid = btn.dataset.sessionId;
        await openReplaySession(sid);
      };
    });
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: SCENARIO SELECTION & CONFIGURATION
  // --------------------------------------------------------------------------
  async function openEnvironment(envId) {
    SimState.selectedEnv = SimState.environments.find((e) => e.id === envId) || { id: envId, title: envId };
    SimState.viewState = 'select';
    renderCurrentScreen();

    const root = $('#sim-container') || $('#view-inner');
    const listContainer = $('#sim-scenarios-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div style="padding:32px;text-align:center">
        <div class="spinner" style="margin:0 auto 12px"></div>
        <div style="font-size:13px;color:var(--cream-dim)">Loading scenarios for ${esc(SimState.selectedEnv.title)}...</div>
      </div>
    `;

    try {
      const scenarios = await Api.simulationScenarios({ environment: envId });
      SimState.scenarios = scenarios || [];
      renderScenarioCards(listContainer);
    } catch (err) {
      listContainer.innerHTML = `<div class="error-box">Failed to load scenarios: ${esc(err.message)}</div>`;
    }
  }

  function renderScenarioSelect(root) {
    const env = SimState.selectedEnv || { id: 'interview', title: 'Simulation Environment' };

    root.innerHTML = `
      <div class="col gap-md">
        <!-- Breadcrumb & Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <button class="btn btn-ghost btn-sm" id="btn-back-hub" style="margin-bottom:6px">
              <i class="bi bi-chevron-left"></i> All Environments
            </button>
            <h2 style="font-size:22px;font-weight:700;margin:0">${esc(env.title)}</h2>
            <div style="font-size:13px;color:var(--cream-dim)">${esc(env.description || '')}</div>
          </div>
        </div>

        ${env.disclaimer ? `
          <div class="warning-box" style="margin:0">
            <i class="bi bi-exclamation-triangle-fill" style="margin-right:6px"></i>
            <b>${esc(env.disclaimer)}</b>
          </div>
        ` : ''}

        <!-- Scenarios List Grid -->
        <div id="sim-scenarios-list" class="sim-scenarios-grid"></div>
      </div>
    `;

    $('#btn-back-hub').onclick = () => {
      SimState.viewState = 'hub';
      renderCurrentScreen();
    };
  }

  function renderScenarioCards(container) {
    if (!SimState.scenarios || SimState.scenarios.length === 0) {
      container.innerHTML = `<div class="empty-state">No scenarios found for this environment.</div>`;
      return;
    }

    container.innerHTML = SimState.scenarios.map((sc) => `
      <div class="card sim-scenario-card" data-scenario-id="${esc(sc.scenarioId)}">
        <div class="sim-sc-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="pill ${levelColor(sc.level)}" style="font-size:11px">${esc(sc.level || 'All Levels')}</span>
            <span class="pill" style="font-size:11px"><i class="bi bi-clock"></i> ${sc.defaultDurationMinutes || 10} min</span>
          </div>
          ${sc.userStats?.completedCount > 0 ? `
            <span class="pill sprout" style="font-size:11px">
              <i class="bi bi-check-circle-fill"></i> Best: ${sc.userStats.bestScore}%
            </span>
          ` : ''}
        </div>
        <h4 class="sim-sc-title">${esc(sc.title)}</h4>
        <p class="sim-sc-desc">${esc(sc.description)}</p>

        <!-- Characters preview -->
        <div class="sim-sc-characters">
          <span style="font-size:12px;color:var(--cream-faint);font-weight:600">Interviewer:</span>
          ${(sc.characters || []).map((c) => `
            <div class="sim-character-chip">
              ${avatarHTML(c.name, 22)}
              <span>${esc(c.name)} <small>(${esc(c.role)})</small></span>
            </div>
          `).join('')}
        </div>

        <!-- Learning objectives -->
        ${sc.learningObjectives && sc.learningObjectives.length ? `
          <div class="sim-sc-objectives">
            <div style="font-size:11px;font-weight:700;color:var(--cream-faint);text-transform:uppercase;letter-spacing:0.5px">Goals:</div>
            <ul>
              ${sc.learningObjectives.slice(0, 2).map((obj) => `<li>${esc(obj)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div style="margin-top:auto;padding-top:12px">
          <button class="btn btn-primary btn-sm btn-configure-scenario" style="width:100%" data-scenario-id="${esc(sc.scenarioId)}">
            Configure & Start <i class="bi bi-play-circle-fill"></i>
          </button>
        </div>
      </div>
    `).join('');

    $all2('.btn-configure-scenario, .sim-scenario-card', container).forEach((btn) => {
      btn.onclick = (e) => {
        const scId = btn.dataset.scenarioId || btn.closest('.sim-scenario-card')?.dataset.scenarioId;
        if (scId) {
          openConfigModal(scId);
        }
      };
    });
  }

  function openConfigModal(scenarioId) {
    const existing = document.getElementById('sim-config-modal');
    if (existing) existing.remove();

    const sc = SimState.scenarios.find((s) => s.scenarioId === scenarioId);
    if (!sc) return;
    SimState.selectedScenario = sc;

    const modalHTML = `
      <div class="modal-backdrop" id="sim-config-modal">
        <div class="modal-card" style="max-width:540px">
          <div class="modal-header">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--sprout);text-transform:uppercase">Configure Simulation</div>
              <h3 style="font-size:18px;margin:2px 0 0">${esc(sc.title)}</h3>
            </div>
            <button class="icon-btn" id="modal-close-btn"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body col gap-md">
            <!-- AI Character Selection -->
            <div>
              <label class="field-label">AI Character & Role</label>
              <div class="sim-char-select-grid">
                ${(sc.characters || []).map((c, i) => `
                  <label class="sim-char-option ${i === 0 ? 'selected' : ''}">
                    <input type="radio" name="sim-char" value="${esc(c.characterId)}" ${i === 0 ? 'checked' : ''} style="display:none">
                    <div style="display:flex;align-items:center;gap:10px">
                      ${avatarHTML(c.name, 36)}
                      <div>
                        <div style="font-weight:700;font-size:14px;color:var(--color-text)">${esc(c.name)}</div>
                        <div style="font-size:12px;color:var(--cream-dim)">${esc(c.role)}</div>
                        <div style="font-size:11px;color:var(--cream-faint);margin-top:2px">${esc(c.personality)}</div>
                      </div>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Proficiency Level -->
            <div>
              <label class="field-label">English Proficiency Level</label>
              <div class="segmented-control" id="sim-level-seg">
                <button type="button" class="seg-btn" data-val="Beginner">Beginner</button>
                <button type="button" class="seg-btn active" data-val="Intermediate">Intermediate</button>
                <button type="button" class="seg-btn" data-val="Advanced">Advanced</button>
              </div>
            </div>

            <!-- Feedback Mode -->
            <div>
              <label class="field-label">Feedback Experience</label>
              <div class="segmented-control" id="sim-feedback-seg">
                <button type="button" class="seg-btn active" data-val="learning">
                  <i class="bi bi-lightbulb"></i> Learning Mode (In-turn corrections)
                </button>
                <button type="button" class="seg-btn" data-val="challenge">
                  <i class="bi bi-stopwatch"></i> Challenge Mode (Real pressure)
                </button>
              </div>
              <div style="font-size:12px;color:var(--cream-faint);margin-top:4px" id="feedback-mode-hint">
                Learning Mode provides sentence corrections and vocabulary upgrades after every turn.
              </div>
            </div>

            <!-- Communication Mode & Duration -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label class="field-label">Interaction Mode</label>
                <select id="sim-mode-select" class="field-select">
                  <option value="voice" selected>Voice (Mic + Audio)</option>
                  <option value="text">Text Only</option>
                </select>
              </div>
              <div>
                <label class="field-label">Duration</label>
                <select id="sim-duration-select" class="field-select">
                  <option value="5">5 Minutes</option>
                  <option value="10" selected>10 Minutes</option>
                  <option value="15">15 Minutes</option>
                </select>
              </div>
            </div>

            <!-- Learning Objective -->
            <div>
              <label class="field-label">Personal Goal / Focus (Optional)</label>
              <input type="text" id="sim-objective-input" class="field-input" placeholder="e.g. Master answering without hesitation..." value="${esc(sc.learningObjectives?.[0] || '')}" />
            </div>
          </div>
          <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="btn-start-simulation">
              Begin Simulation <i class="bi bi-play-fill"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el(modalHTML));

    // Modal event handlers
    const modalEl = $('#sim-config-modal');
    const closeModal = () => modalEl && modalEl.remove();

    $('#modal-close-btn').onclick = closeModal;
    $('#modal-cancel-btn').onclick = closeModal;

    // Segmented controls
    $all2('#sim-level-seg .seg-btn').forEach((b) => {
      b.onclick = () => {
        $all2('#sim-level-seg .seg-btn').forEach((btn) => btn.classList.remove('active'));
        b.classList.add('active');
      };
    });

    $all2('#sim-feedback-seg .seg-btn').forEach((b) => {
      b.onclick = () => {
        $all2('#sim-feedback-seg .seg-btn').forEach((btn) => btn.classList.remove('active'));
        b.classList.add('active');
        const hintEl = $('#feedback-mode-hint');
        if (hintEl) {
          hintEl.textContent = b.dataset.val === 'learning'
            ? 'Learning Mode provides sentence corrections and vocabulary upgrades after every turn.'
            : 'Challenge Mode runs uninterrupted without corrections until the full final evaluation.';
        }
      };
    });

    // Character radio selection
    $all2('.sim-char-option').forEach((label) => {
      label.onclick = () => {
        $all2('.sim-char-option').forEach((l) => l.classList.remove('selected'));
        label.classList.add('selected');
        const input = label.querySelector('input');
        if (input) input.checked = true;
      };
    });

    // Start Simulation handler
    $('#btn-start-simulation').onclick = async () => {
      const charInput = $('input[name="sim-char"]:checked');
      const characterId = charInput ? charInput.value : sc.characters[0]?.characterId;
      const level = $('#sim-level-seg .seg-btn.active')?.dataset.val || 'Intermediate';
      const feedbackMode = $('#sim-feedback-seg .seg-btn.active')?.dataset.val || 'learning';
      const mode = $('#sim-mode-select').value || 'voice';
      const targetDurationMinutes = parseInt($('#sim-duration-select').value, 10) || 10;
      const learningObjective = $('#sim-objective-input').value.trim();

      const startBtn = $('#btn-start-simulation');
      startBtn.disabled = true;
      startBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;margin-right:6px"></span> Launching...`;

      try {
        const payload = {
          scenarioId: sc.scenarioId,
          characterId,
          level,
          feedbackMode,
          mode,
          targetDurationMinutes,
          learningObjective,
        };

        const res = await Api.createSimulationSession(payload);
        closeModal();

        SimState.activeSession = res.session;
        SimState.selectedScenario = res.scenario || sc;
        SimState.remainingSeconds = targetDurationMinutes * 60;
        SimState.viewState = 'live';
        renderCurrentScreen();

        // Speak the initial greeting if voice mode
        if (mode === 'voice' && res.initialGreeting?.text) {
          setTimeout(() => {
            SpeechOutput.speak(res.initialGreeting.text);
          }, 400);
        }
      } catch (err) {
        apiError(err);
        startBtn.disabled = false;
        startBtn.textContent = 'Begin Simulation';
      }
    };
  }

  // --------------------------------------------------------------------------
  // SCREEN 3: LIVE INTERACTIVE SIMULATION
  // --------------------------------------------------------------------------
  function renderLiveSession(root) {
    const session = SimState.activeSession;
    const scenario = SimState.selectedScenario;
    if (!session || !scenario) {
      SimState.viewState = 'hub';
      renderCurrentScreen();
      return;
    }

    const char = session.character || { name: 'AI Specialist', role: 'Interviewer', avatar: 'user' };

    root.innerHTML = `
      <div class="sim-live-wrap col gap-md">
        <!-- Live Header Bar -->
        <div class="card sim-live-header">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn btn-ghost btn-sm" id="btn-abort-session" title="Leave Simulation">
              <i class="bi bi-chevron-left"></i> Exit
            </button>
            <div style="display:flex;align-items:center;gap:10px">
              ${avatarHTML(char.name, 40)}
              <div>
                <div style="font-weight:700;font-size:15px;color:var(--color-text)">
                  ${esc(char.name)} <span class="pill" style="font-size:10px">${esc(char.role)}</span>
                </div>
                <div style="font-size:12px;color:var(--cream-dim)">${esc(scenario.title)}</div>
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="pill ${session.feedbackMode === 'learning' ? 'cyan' : 'purple'}" style="font-size:11px">
              ${session.feedbackMode === 'learning' ? 'Learning Mode' : 'Challenge Mode'}
            </span>
            <div class="sim-timer-box" id="sim-countdown">
              <i class="bi bi-clock"></i> <span id="timer-display">10:00</span>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-finish-simulation">
              <i class="bi bi-flag-fill"></i> Finish & Report
            </button>
          </div>
        </div>

        ${scenario.environment === 'emergency' ? `
          <div class="warning-box" style="margin:0;font-size:12px">
            <i class="bi bi-exclamation-triangle-fill"></i> <b>EDUCATIONAL DRILL:</b> Does not connect to real emergency services.
          </div>
        ` : ''}

        <!-- Messages Chat Stream -->
        <div class="sim-chat-container card" id="sim-chat-stream">
          <!-- Rendered messages -->
        </div>

        <!-- Hint Overlay Drawer (Hidden by default) -->
        <div id="sim-hint-drawer" class="sim-hint-drawer" style="display:none">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:700;font-size:13px;color:var(--amber)">
              <i class="bi bi-lightbulb-fill"></i> Suggested Sentence Starters
            </div>
            <button class="icon-btn" id="btn-close-hint"><i class="bi bi-x"></i></button>
          </div>
          <div id="sim-hint-content" style="margin-top:6px;font-size:13px"></div>
        </div>

        <!-- Interactive Student Input Dock -->
        <div class="card sim-input-dock">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:6px">
              <button class="btn btn-ghost btn-sm" id="btn-request-hint" title="Get a hint">
                <i class="bi bi-lightbulb"></i> Hint
              </button>
              <button class="btn btn-ghost btn-sm" id="btn-toggle-input-mode">
                <i class="bi bi-keyboard"></i> <span id="toggle-mode-text">${session.mode === 'voice' ? 'Switch to Typing' : 'Switch to Voice'}</span>
              </button>
            </div>
            <div id="sim-speech-status" style="font-size:12px;color:var(--cream-faint)">
              Ready to respond
            </div>
          </div>

          <!-- Voice Input Section -->
          <div id="sim-voice-controls" class="sim-voice-controls" style="${session.mode === 'voice' ? 'display:flex' : 'display:none'}">
            <button class="sim-mic-btn" id="btn-sim-mic" aria-label="Toggle Microphone Recording">
              <i class="bi bi-mic-fill" id="sim-mic-icon"></i>
            </button>
            <div class="sim-voice-guide">
              <div id="sim-voice-headline" style="font-weight:600;font-size:14px">Click the mic to speak</div>
              <div id="sim-voice-interim" style="font-size:12px;color:var(--cream-faint);min-height:18px">
                Speak clearly into your microphone
              </div>
            </div>
          </div>

          <!-- Text Input Section -->
          <form id="sim-text-form" class="sim-text-form" style="${session.mode === 'text' ? 'display:flex' : 'display:none'}">
            <textarea id="sim-text-input" class="field-input" rows="2" placeholder="Type your response in English here... (Press Enter to send)" style="resize:none"></textarea>
            <button type="submit" class="btn btn-primary" id="btn-send-text">
              <i class="bi bi-send-fill"></i>
            </button>
          </form>
        </div>
      </div>
    `;

    // Start timer countdown
    startSessionTimer();

    // Render messages stream
    renderChatMessages();

    // Event Listeners
    setupLiveSessionListeners();
  }

  function startSessionTimer() {
    if (SimState.timerInterval) clearInterval(SimState.timerInterval);

    const updateDisplay = () => {
      const displayEl = $('#timer-display');
      if (!displayEl) return;
      const m = Math.floor(SimState.remainingSeconds / 60);
      const s = SimState.remainingSeconds % 60;
      displayEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    updateDisplay();
    SimState.timerInterval = setInterval(() => {
      if (SimState.remainingSeconds > 0) {
        SimState.remainingSeconds--;
        updateDisplay();
      } else {
        clearInterval(SimState.timerInterval);
        toast('Simulation time ended! Finalizing performance report...', 'amber');
        finishLiveSimulation();
      }
    }, 1000);
  }

  function renderChatMessages() {
    const stream = $('#sim-chat-stream');
    if (!stream) return;

    const msgs = SimState.activeSession?.messages || [];
    const char = SimState.activeSession?.character || { name: 'Interviewer' };

    stream.innerHTML = msgs.map((m, idx) => {
      if (m.sender === 'ai') {
        return `
          <div class="sim-msg-row sim-msg-ai">
            <div class="sim-msg-avatar">${avatarHTML(char.name, 32)}</div>
            <div class="sim-msg-bubble sim-bubble-ai">
              <div class="sim-msg-header">
                <b>${esc(char.name)}</b>
                <button class="icon-btn btn-listen-msg" data-text="${esc(m.text)}" title="Listen to audio">
                  <i class="bi bi-volume-up"></i>
                </button>
              </div>
              <div class="sim-msg-text">${esc(m.text)}</div>
            </div>
          </div>
        `;
      } else if (m.sender === 'student') {
        return `
          <div class="sim-msg-row sim-msg-student">
            <div class="sim-msg-bubble sim-bubble-student">
              <div class="sim-msg-header">
                <span class="pill" style="font-size:10px">You</span>
                ${m.audioDurationSeconds > 0 ? `
                  <span style="font-size:11px;color:var(--cream-faint)">
                    <i class="bi bi-mic"></i> ${m.audioDurationSeconds.toFixed(1)}s
                  </span>
                ` : ''}
              </div>
              <div class="sim-msg-text">${esc(m.text)}</div>

              <!-- Learning Mode In-Turn Feedback Card -->
              ${m.feedback && SimState.activeSession.feedbackMode === 'learning' ? `
                <div class="sim-feedback-card">
                  <div class="sim-fb-title"><i class="bi bi-magic"></i> Learning Feedback</div>
                  ${m.feedback.correctedSentence && m.feedback.correctedSentence !== m.text ? `
                    <div class="sim-fb-item">
                      <span class="sim-fb-label">Better phrasing:</span>
                      <span class="sim-fb-val sprout">${esc(m.feedback.correctedSentence)}</span>
                    </div>
                  ` : ''}
                  ${m.feedback.grammarMistakes && m.feedback.grammarMistakes.length ? `
                    <div class="sim-fb-item">
                      <span class="sim-fb-label">Grammar tip:</span>
                      <span class="sim-fb-val coral">${esc(m.feedback.grammarMistakes[0])}</span>
                    </div>
                  ` : ''}
                  ${m.feedback.vocabularySuggestions && m.feedback.vocabularySuggestions.length ? `
                    <div class="sim-fb-item">
                      <span class="sim-fb-label">Vocabulary:</span>
                      <span class="sim-fb-val">${esc(m.feedback.vocabularySuggestions[0])}</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
            <div class="sim-msg-avatar">${avatarHTML(S.user?.name || 'You', 32)}</div>
          </div>
        `;
      }
      return '';
    }).join('');

    // Scroll to bottom
    stream.scrollTop = stream.scrollHeight;

    // Listen buttons
    $all2('.btn-listen-msg', stream).forEach((b) => {
      b.onclick = () => {
        const text = b.dataset.text;
        SpeechOutput.speak(text);
      };
    });
  }

  function setupLiveSessionListeners() {
    // Abort button
    $('#btn-abort-session').onclick = () => {
      if (confirm('Are you sure you want to exit? Your progress in this simulation will be saved.')) {
        cleanupLiveState();
        SimState.viewState = 'hub';
        renderCurrentScreen();
      }
    };

    // Finish & Evaluate
    $('#btn-finish-simulation').onclick = () => {
      if (confirm('Complete this simulation and generate your 100-point performance report?')) {
        finishLiveSimulation();
      }
    };

    // Toggle Input Mode (Voice vs Typing)
    $('#btn-toggle-input-mode').onclick = () => {
      const isVoice = $('#sim-voice-controls').style.display !== 'none';
      if (isVoice) {
        if (SpeechInput.listening) SpeechInput.stop();
        $('#sim-voice-controls').style.display = 'none';
        $('#sim-text-form').style.display = 'flex';
        $('#toggle-mode-text').textContent = 'Switch to Voice';
        $('#sim-speech-status').textContent = 'Typing mode active';
      } else {
        $('#sim-text-form').style.display = 'none';
        $('#sim-voice-controls').style.display = 'flex';
        $('#toggle-mode-text').textContent = 'Switch to Typing';
        $('#sim-speech-status').textContent = 'Microphone ready';
      }
    };

    // Request Hint
    $('#btn-request-hint').onclick = async () => {
      const hintDrawer = $('#sim-hint-drawer');
      const hintContent = $('#sim-hint-content');
      hintDrawer.style.display = 'block';
      hintContent.innerHTML = `<span class="spinner" style="width:12px;height:12px;display:inline-block;margin-right:6px"></span> Thinking of suggestions...`;

      try {
        const hintData = await Api.getSimulationHint(SimState.activeSession._id);
        hintContent.innerHTML = `
          <div style="margin-bottom:6px"><b>Tip:</b> ${esc(hintData.hint)}</div>
          <div style="font-weight:600;margin-top:6px">Try starting with:</div>
          <ul style="margin:4px 0 0 18px;padding:0">
            ${(hintData.suggestedStarters || []).map((s) => `
              <li style="margin-bottom:4px;cursor:pointer;color:var(--sprout)" class="clickable-starter">${esc(s)}</li>
            `).join('')}
          </ul>
        `;

        $all2('.clickable-starter', hintContent).forEach((li) => {
          li.onclick = () => {
            const textarea = $('#sim-text-input');
            if (textarea) textarea.value = li.textContent.trim() + ' ';
            hintDrawer.style.display = 'none';
            // Switch to text mode if in voice
            $('#sim-voice-controls').style.display = 'none';
            $('#sim-text-form').style.display = 'flex';
            $('#toggle-mode-text').textContent = 'Switch to Voice';
            textarea.focus();
          };
        });
      } catch (err) {
        hintContent.textContent = 'Could not load hint right now.';
      }
    };

    $('#btn-close-hint').onclick = () => {
      $('#sim-hint-drawer').style.display = 'none';
    };

    // Text Form Submission
    const textInput = $('#sim-text-input');
    if (textInput) {
      textInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          $('#sim-text-form').dispatchEvent(new Event('submit', { cancelable: true }));
        }
      };
    }

    $('#sim-text-form').onsubmit = async (e) => {
      e.preventDefault();
      const input = $('#sim-text-input');
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      await sendTurn(text, 0, false);
    };

    // Microphone Toggle Interaction
    const micBtn = $('#btn-sim-mic');
    micBtn.onclick = () => {
      if (!SpeechInput.supported) {
        toast('Speech recognition not supported in this browser. Please use text typing.', 'coral');
        return;
      }

      if (SpeechInput.listening) {
        // Stop recording and send utterance
        SpeechInput.stop();
        micBtn.classList.remove('recording');
        $('#sim-voice-headline').textContent = 'Processing speech...';
        $('#sim-speech-status').textContent = 'Analyzing response...';
      } else {
        // Start speech capture
        SpeechOutput.stop();
        SimState.recordStartTime = Date.now();
        micBtn.classList.add('recording');
        $('#sim-voice-headline').textContent = 'Listening... Speak now';
        $('#sim-speech-status').textContent = 'Recording speech';

        let lastTranscript = '';

        SpeechInput.start({
          onResult: ({ final, interim }) => {
            lastTranscript = final || interim;
            const interimEl = $('#sim-voice-interim');
            if (interimEl) {
              interimEl.textContent = lastTranscript || 'Listening...';
            }
          },
          onEnd: async (finalText) => {
            micBtn.classList.remove('recording');
            const durationSec = Math.max(1, (Date.now() - SimState.recordStartTime) / 1000);
            const textToSend = (finalText || lastTranscript || '').trim();

            if (textToSend) {
              $('#sim-voice-headline').textContent = 'Sending response...';
              await sendTurn(textToSend, durationSec, true);
            } else {
              $('#sim-voice-headline').textContent = 'No speech detected';
              $('#sim-voice-interim').textContent = 'Click the mic and speak again';
              $('#sim-speech-status').textContent = 'Ready to respond';
            }
          },
          onError: (err) => {
            micBtn.classList.remove('recording');
            $('#sim-voice-headline').textContent = 'Click the mic to speak';
            $('#sim-speech-status').textContent = 'Mic idle';
            toast(typeof err === 'string' ? err : 'Microphone error', 'coral');
          },
        });
      }
    };
  }

  async function sendTurn(utterance, audioDurationSeconds = 0, measuredDuration = false) {
    const session = SimState.activeSession;
    if (!session) return;

    // Optimistically show student turn
    session.messages.push({
      sender: 'student',
      text: utterance,
      audioDurationSeconds,
      measuredDuration,
      timestamp: new Date(),
    });
    renderChatMessages();

    // Show AI typing indicator
    const stream = $('#sim-chat-stream');
    const typingIndicator = el(`
      <div class="sim-msg-row sim-msg-ai" id="sim-typing-indicator">
        <div class="sim-msg-avatar">${avatarHTML(session.character?.name || 'AI', 32)}</div>
        <div class="sim-msg-bubble sim-bubble-ai parchment-bubble" style="padding:10px 16px">
          <div class="typing-embers"><span class="ember-flicker">🔥</span><span class="ember-flicker">🔥</span><span class="ember-flicker">🔥</span> <span style="font-size:12px;color:var(--color-flame);margin-left:6px;font-style:italic">Ignis is formulating speech…</span></div>
        </div>
      </div>
    `);
    stream.appendChild(typingIndicator);
    stream.scrollTop = stream.scrollHeight;

    if (window.DragonMascot && window.DragonMascot.setMood) {
      window.DragonMascot.setMood('thinking');
    }

    try {
      const res = await Api.sendSimulationTurn(session._id, {
        utterance,
        audioDurationSeconds,
        measuredDuration,
      });

      typingIndicator.remove();
      if (window.DragonMascot && window.DragonMascot.setMood) {
        window.DragonMascot.setMood('idle');
      }

      // Update state with AI response
      SimState.activeSession = res.session;
      renderChatMessages();

      // Speak response if voice was used
      if (session.mode === 'voice' && res.aiReply?.text) {
        SpeechOutput.speak(res.aiReply.text);
      }

      $('#sim-voice-headline').textContent = 'Click the mic to speak';
      $('#sim-voice-interim').textContent = 'Speak clearly into your microphone';
      $('#sim-speech-status').textContent = 'Your turn to reply';
    } catch (err) {
      typingIndicator.remove();
      apiError(err);
      $('#sim-voice-headline').textContent = 'Error sending message';
      $('#sim-speech-status').textContent = 'Retry speaking';
    }
  }

  async function finishLiveSimulation() {
    cleanupLiveState();
    const session = SimState.activeSession;
    if (!session) return;

    const root = $('#sim-container') || $('#view-inner');
    root.innerHTML = `
      <div class="card" style="padding:48px;text-align:center">
        <div class="spinner" style="margin:0 auto 16px"></div>
        <h3 style="font-size:18px;margin:0 0 8px">Evaluating Simulation Performance...</h3>
        <p style="color:var(--cream-dim);font-size:13px;max-width:440px;margin:0 auto">
          Our AI scoring engine is evaluating your grammar, vocabulary, communication clarity, and speech delivery.
        </p>
      </div>
    `;

    try {
      const res = await Api.endSimulationSession(session._id);
      SimState.activeSession = res.session;
      SimState.evaluation = res.evaluation;
      SimState.viewState = 'report';

      // Update local student XP & topbar
      if (res.xpAwarded) {
        addStudentXP(res.xpAwarded);
        toast(`+${res.xpAwarded} XP awarded for completing simulation!`, 'sprout');
      }

      // TODO (Weak Words Lab Integration): The Communication Simulator evaluates conversational turns,
      // intent relevance, and grammar corrections rather than per-word pronunciation alignment.
      // When word-level pronunciation analysis is added to SimulationSession,
      // send detected mispronunciations to Api.postWeakWordsBulk({ words: mispronouncedList, source: 'simulator' }).

      renderCurrentScreen();
    } catch (err) {
      apiError(err);
      SimState.viewState = 'hub';
      renderCurrentScreen();
    }
  }

  function cleanupLiveState() {
    if (SimState.timerInterval) {
      clearInterval(SimState.timerInterval);
      SimState.timerInterval = null;
    }
    if (SpeechInput.listening) {
      SpeechInput.stop();
    }
    SpeechOutput.stop();
  }

  // --------------------------------------------------------------------------
  // SCREEN 4: PERFORMANCE REPORT & REPLAY
  // --------------------------------------------------------------------------
  async function openReplaySession(sessionId) {
    const root = $('#sim-container') || $('#view-inner');
    root.innerHTML = `
      <div class="card" style="padding:48px;text-align:center">
        <div class="spinner" style="margin:0 auto 16px"></div>
        <div style="font-size:14px;color:var(--cream-dim)">Loading session transcript and evaluation report...</div>
      </div>
    `;

    try {
      const res = await Api.getSimulationSession(sessionId);
      SimState.activeSession = res.session;
      SimState.selectedScenario = res.scenario;
      SimState.evaluation = res.session.evaluation;
      SimState.viewState = 'report';
      renderCurrentScreen();
    } catch (err) {
      apiError(err);
      SimState.viewState = 'hub';
      renderCurrentScreen();
    }
  }

  function renderReportScreen(root) {
    const session = SimState.activeSession;
    const scenario = SimState.selectedScenario || { title: session?.scenarioTitle || 'Simulation' };
    const ev = SimState.evaluation || session?.evaluation;

    if (!ev) {
      root.innerHTML = `
        <div class="error-box">
          No evaluation report found for this session.
          <button class="btn btn-primary btn-sm" onclick="SimState.viewState='hub';renderCurrentScreen()">Return to Hub</button>
        </div>
      `;
      return;
    }

    const overall = ev.overallScore || 0;
    const grade = overall >= 85 ? 'Exceptional' : overall >= 70 ? 'Proficient' : overall >= 50 ? 'Developing' : 'Needs Practice';
    const gradeColor = overall >= 85 ? 'var(--sprout)' : overall >= 70 ? 'var(--cyan)' : overall >= 50 ? 'var(--amber)' : 'var(--coral)';
    const cats = ev.categoryScores || {};
    const delivery = ev.deliveryMetrics || {};

    root.innerHTML = `
      <div class="col gap-lg">
        <!-- Top Navigation -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <button class="btn btn-ghost btn-sm" id="btn-rep-hub" style="margin-bottom:6px">
              <i class="bi bi-chevron-left"></i> Simulator Hub
            </button>
            <h2 style="font-size:22px;font-weight:700;margin:0">Simulation Performance Report</h2>
            <div style="font-size:13px;color:var(--cream-dim)">
              ${esc(scenario.title)} &middot; with ${esc(session.character?.name || 'AI Specialist')}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" id="btn-retry-scenario">
              <i class="bi bi-arrow-repeat"></i> Retry Scenario
            </button>
            <button class="btn btn-primary btn-sm" id="btn-next-scenario">
              Next Scenario <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- Overall Score & Key Takeaways Grid -->
        <div class="sim-report-hero-grid">
          <div class="card sim-score-gauge-card">
            <div class="sim-gauge-circle" style="border-color:${gradeColor}">
              <div class="sim-gauge-number" style="color:${gradeColor}">${overall}</div>
              <div class="sim-gauge-out">/ 100</div>
            </div>
            <div class="sim-gauge-grade" style="color:${gradeColor}">${grade}</div>
            <div style="font-size:12px;color:var(--cream-faint);margin-top:4px">
              100-Point Weighted Rubric
            </div>
          </div>

          <div class="card col gap-sm">
            <div class="section-title"><i class="bi bi-bar-chart-line-fill"></i> Skill Category Breakdown</div>
            <div class="sim-cat-breakdown">
              <div class="sim-cat-row">
                <div class="sim-cat-header"><span>Grammar Accuracy (20%)</span><b>${cats.grammar || 0}/20</b></div>
                <div class="progress-bar"><div class="progress-fill sprout" style="width:${((cats.grammar || 0) / 20) * 100}%"></div></div>
              </div>
              <div class="sim-cat-row">
                <div class="sim-cat-header"><span>Vocabulary Usage (15%)</span><b>${cats.vocabulary || 0}/15</b></div>
                <div class="progress-bar"><div class="progress-fill cyan" style="width:${((cats.vocabulary || 0) / 15) * 100}%"></div></div>
              </div>
              <div class="sim-cat-row">
                <div class="sim-cat-header"><span>Sentence Formation (15%)</span><b>${cats.sentenceFormation || 0}/15</b></div>
                <div class="progress-bar"><div class="progress-fill purple" style="width:${((cats.sentenceFormation || 0) / 15) * 100}%"></div></div>
              </div>
              <div class="sim-cat-row">
                <div class="sim-cat-header"><span>Communication Clarity (15%)</span><b>${cats.clarity || 0}/15</b></div>
                <div class="progress-bar"><div class="progress-fill amber" style="width:${((cats.clarity || 0) / 15) * 100}%"></div></div>
              </div>
              <div class="sim-cat-row">
                <div class="sim-cat-header"><span>Response Relevance (15%)</span><b>${cats.relevance || 0}/15</b></div>
                <div class="progress-bar"><div class="progress-fill cyan" style="width:${((cats.relevance || 0) / 15) * 100}%"></div></div>
              </div>
              <div class="sim-cat-row">
                <div class="sim-cat-header"><span>Fluency & Delivery (20%)</span><b>${cats.fluencyAndDelivery || 0}/20</b></div>
                <div class="progress-bar"><div class="progress-fill sprout" style="width:${((cats.fluencyAndDelivery || 0) / 20) * 100}%"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Verified Speech & Delivery Metrics -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div class="section-title"><i class="bi bi-mic"></i> Speech & Audio Delivery Metrics</div>
            <span class="pill ${delivery.isMeasured ? 'sprout' : 'amber'}" style="font-size:11px">
              ${delivery.isMeasured ? '✓ Verified Audio Measurements' : 'Estimated from Transcript'}
            </span>
          </div>
          <div class="sim-metrics-grid">
            <div class="sim-stat-box">
              <div class="sim-stat-val">${delivery.measuredWpm || 0} <small>WPM</small></div>
              <div class="sim-stat-lbl">Speaking Pace</div>
              <div style="font-size:11px;color:var(--cream-faint);margin-top:2px">${esc(delivery.pauseEstimate || 'Normal rhythm')}</div>
            </div>
            <div class="sim-stat-box">
              <div class="sim-stat-val">${delivery.speechDurationSeconds || 0}s</div>
              <div class="sim-stat-lbl">Total Speaking Time</div>
              <div style="font-size:11px;color:var(--cream-faint);margin-top:2px">${session.messages.filter(m=>m.sender==='student').length} conversation turns</div>
            </div>
            <div class="sim-stat-box">
              <div class="sim-stat-val" style="color:${delivery.fillerCount > 3 ? 'var(--coral)' : 'var(--sprout)'}">
                ${delivery.fillerCount || 0}
              </div>
              <div class="sim-stat-lbl">Filler Words Detected</div>
              <div style="font-size:11px;color:var(--cream-faint);margin-top:2px">
                ${delivery.fillerWordsDetected?.length ? esc(delivery.fillerWordsDetected.join(', ')) : 'None detected!'}
              </div>
            </div>
          </div>
        </div>

        <!-- Strengths & Recommendations -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card col gap-sm">
            <div class="section-title sprout"><i class="bi bi-check-circle-fill"></i> Strengths</div>
            <ul class="sim-bullet-list">
              ${(ev.strengths || ['Good conversational engagement.']).map((s) => `<li>${esc(s)}</li>`).join('')}
            </ul>
          </div>
          <div class="card col gap-sm">
            <div class="section-title amber"><i class="bi bi-lightbulb-fill"></i> Personalized Recommendations</div>
            <ul class="sim-bullet-list">
              ${(ev.personalizedRecommendations || ['Practice regularly to build natural fluency.']).map((r) => `<li>${esc(r)}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Identified Mistakes & Grammar Corrections -->
        ${ev.identifiedMistakes && ev.identifiedMistakes.length > 0 ? `
          <div class="card col gap-sm">
            <div class="section-title coral"><i class="bi bi-exclamation-circle-fill"></i> Identified Grammatical Mistakes & Corrections</div>
            <div class="col gap-xs">
              ${ev.identifiedMistakes.map((m) => `
                <div class="sim-mistake-box">
                  <div style="font-size:13px;color:var(--color-text)"><b>Original:</b> "${esc(m.sentence)}"</div>
                  <div style="font-size:13px;color:var(--sprout);margin-top:2px"><b>Correction:</b> "${esc(m.correction)}"</div>
                  <div style="font-size:12px;color:var(--cream-dim);margin-top:4px"><i class="bi bi-info-circle"></i> ${esc(m.explanation)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Complete Conversation Replay Accordion -->
        <div class="card col gap-sm">
          <div class="section-title"><i class="bi bi-journal-text"></i> Full Conversation Replay</div>
          <div class="sim-replay-stream col gap-xs">
            ${session.messages.map((m) => `
              <div class="sim-replay-item ${m.sender === 'ai' ? 'ai-item' : 'student-item'}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-weight:700;font-size:12px">${m.sender === 'ai' ? esc(session.character?.name || 'Interviewer') : 'You'}</span>
                  ${m.sender === 'ai' ? `
                    <button class="icon-btn btn-listen-replay" data-text="${esc(m.text)}"><i class="bi bi-volume-up"></i></button>
                  ` : ''}
                </div>
                <div style="font-size:13px;color:var(--color-text)">${esc(m.text)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Listen buttons in replay
    $all2('.btn-listen-replay', root).forEach((b) => {
      b.onclick = () => SpeechOutput.speak(b.dataset.text);
    });

    $('#btn-rep-hub').onclick = () => {
      SimState.viewState = 'hub';
      renderCurrentScreen();
    };

    $('#btn-retry-scenario').onclick = () => {
      openConfigModal(scenario.scenarioId);
    };

    $('#btn-next-scenario').onclick = () => {
      if (ev.suggestedNextScenario?.scenarioId) {
        openConfigModal(ev.suggestedNextScenario.scenarioId);
      } else {
        SimState.viewState = 'hub';
        renderCurrentScreen();
      }
    };
  }
})();
