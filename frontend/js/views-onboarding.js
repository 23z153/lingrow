/* ==========================================================================
   Dragon Academy — Dragon Egg Trial (Onboarding View)
   Themed onboarding experience allowing students to either complete an
   adaptive placement challenge or self-select their starting proficiency tier.
   ========================================================================== */

window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
var VIEW_RENDERERS = window.VIEW_RENDERERS;

VIEW_RENDERERS['onboarding'] = async (mount) => {
  // Ensure level configuration is cached
  const cfg = (typeof loadLevelConfig === 'function') ? await loadLevelConfig() : (S.levelConfig || {});
  const tiers = cfg.tiers || {
    Beginner: { id: 'Beginner', rank: 1, title: 'Hatchling', stageName: 'Fledgling Dragon', badge: 'HATCHLING' },
    Intermediate: { id: 'Intermediate', rank: 2, title: 'Flame Keeper', stageName: 'Wyvern', badge: 'FLAME_KEEPER' },
    Advanced: { id: 'Advanced', rank: 3, title: 'Sky Guardian', stageName: 'Astral Dragon', badge: 'SKY_GUARDIAN' }
  };

  // Internal state machine: 'INTRO' | 'PLACEMENT' | 'PLACEMENT_RESULT' | 'SELF_SELECT' | 'SUMMARY'
  let state = 'INTRO';
  let placementAttempt = null;
  let userAnswers = {}; // { [questionId]: selectedOptionIndex }
  let currentQuestionIdx = 0; // 0..11 questions, 12 is speech sentence
  let timerInterval = null;
  let timeRemainingSec = 1800; // 30 minutes default
  let speechTranscript = '';
  let isRecording = false;
  let isManualTyping = false;
  let placementResult = null;
  let chosenLevel = 'Beginner';
  let finalResult = null;

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function startTimer(expiresAtISO) {
    stopTimer();
    const expireTime = expiresAtISO ? new Date(expiresAtISO).getTime() : Date.now() + 1800000;
    const updateCountdown = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((expireTime - now) / 1000));
      timeRemainingSec = diffSec;
      const timerEl = document.getElementById('trial-timer-display');
      if (timerEl) {
        timerEl.textContent = formatTime(timeRemainingSec);
        if (timeRemainingSec <= 120) {
          timerEl.style.color = '#EF4444';
          timerEl.style.fontWeight = '800';
        }
      }
      if (diffSec <= 0) {
        stopTimer();
        toast('Time for this placement trial has expired. Submitting current progress...', 'amber');
        handleSubmitPlacement();
      }
    };
    updateCountdown();
    timerInterval = setInterval(updateCountdown, 1000);
  }

  /* --------------------------------------------------------------------------
     RENDER STATE: INTRO (CHOOSE PATH)
     -------------------------------------------------------------------------- */
  function renderIntro() {
    stopTimer();
    mount.innerHTML = `
      <div class="trial-container animate-fade-in" style="max-width:880px;margin:24px auto;padding:0 16px">
        <div class="trial-hero-card card-fantasy" style="padding:36px 28px;text-align:center;border-radius:20px;margin-bottom:28px">
          <div class="pill sprout" style="font-size:11px;font-weight:800;letter-spacing:0.06em;margin-bottom:12px">
            ✨ DRAGON ACADEMY ONBOARDING
          </div>
          <h1 style="font-size:32px;font-family:var(--font-display);font-weight:900;margin-bottom:10px;color:var(--color-text)">
            The Dragon Egg Trial
          </h1>
          <p style="font-size:15px;color:var(--cream-dim);line-height:1.6;max-width:620px;margin:0 auto 24px">
            Welcome, initiate! Before you enter the English realms, your dormant dragon egg must be awakened. Discover your linguistic attunement to harmonize with your dragon companion.
          </p>
          <div style="display:inline-flex;align-items:center;gap:10px;padding:8px 16px;background:var(--color-surface-2);border:1px solid var(--line);border-radius:30px;font-size:13px;color:var(--cream)">
            <span>🥚 Dragon Egg Status:</span>
            <b style="color:var(--cyan)">Dormant &middot; Awaiting Attunement</b>
          </div>
        </div>

        <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--cream-faint);margin-bottom:14px;text-align:center">
          Choose Your Path of Attunement
        </div>

        <div class="trial-paths-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:20px;margin-bottom:24px">
          <!-- PATH A: PLACEMENT CHALLENGE -->
          <div class="trial-path-card card-fantasy" style="padding:28px 24px;border-radius:18px;display:flex;flex-direction:column;border:2px solid rgba(16,185,129,0.3);position:relative;background:var(--color-surface)">
            <div style="position:absolute;top:16px;right:16px">
              <span class="pill sprout" style="font-size:10px;font-weight:800">RECOMMENDED</span>
            </div>
            <div style="font-size:36px;margin-bottom:12px">⚡</div>
            <h3 style="font-size:20px;font-family:var(--font-display);font-weight:800;margin-bottom:8px;color:var(--color-text)">
              Dragon Placement Trial
            </h3>
            <p style="font-size:13.5px;color:var(--cream-dim);line-height:1.55;margin-bottom:16px;flex:1">
              Answer 12 adaptive challenges across grammar, vocabulary, and reading comprehension, followed by an optional spoken reading incantation. Your dragon companion will hatch attuned to your exact strength.
            </p>
            <div style="font-size:12px;color:var(--cream-faint);margin-bottom:20px;display:flex;align-items:center;gap:6px">
              <span>⏱️ Est. Time: 10–15 mins</span> &bull; <span>12 Questions</span> &bull; <span>1 Optional Spoken Step</span>
            </div>
            <button class="btn btn-primary" id="start-placement-btn" style="width:100%;padding:12px;font-weight:700">
              Begin Placement Trial &rarr;
            </button>
          </div>

          <!-- PATH B: SELF SELECTION -->
          <div class="trial-path-card card-fantasy" style="padding:28px 24px;border-radius:18px;display:flex;flex-direction:column;border:2px solid var(--line);background:var(--color-surface)">
            <div style="font-size:36px;margin-bottom:12px">🔮</div>
            <h3 style="font-size:20px;font-family:var(--font-display);font-weight:800;margin-bottom:8px;color:var(--color-text)">
              Attune by Self-Selection
            </h3>
            <p style="font-size:13.5px;color:var(--cream-dim);line-height:1.55;margin-bottom:16px;flex:1">
              Directly select your starting dragon rank (Hatchling, Flame Keeper, or Sky Guardian). Ideal if you already know your current proficiency tier and want to enter the academy immediately.
            </p>
            <div style="font-size:12px;color:var(--cream-faint);margin-bottom:20px;display:flex;align-items:center;gap:6px">
              <span>⚡ Instant Access</span> &bull; <span>3 Themed Dragon Tiers</span>
            </div>
            <button class="btn btn-secondary" id="start-self-select-btn" style="width:100%;padding:12px;font-weight:700">
              Choose Your Tier &rarr;
            </button>
          </div>
        </div>

        <div style="text-align:center;font-size:12px;color:var(--cream-faint)">
          🛡️ Teachers and administrators can adjust your dragon tier at any time based on your academy performance.
        </div>
      </div>
    `;

    mount.querySelector('#start-placement-btn').onclick = handleStartPlacement;
    mount.querySelector('#start-self-select-btn').onclick = () => {
      state = 'SELF_SELECT';
      renderSelfSelect();
    };
  }

  /* --------------------------------------------------------------------------
     HANDLE START PLACEMENT
     -------------------------------------------------------------------------- */
  async function handleStartPlacement() {
    const btn = mount.querySelector('#start-placement-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #FFF;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px"></span> Summoning Trial...`;
    }

    try {
      const res = await Api.startPlacement();
      placementAttempt = res;
      userAnswers = {};
      currentQuestionIdx = 0;
      speechTranscript = '';
      isRecording = false;
      isManualTyping = false;
      state = 'PLACEMENT';
      startTimer(res.expiresAt);
      renderPlacementQuestion();
    } catch (err) {
      toast(err.message || 'Could not start placement trial.', 'coral');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Begin Placement Trial →';
      }
    }
  }

  /* --------------------------------------------------------------------------
     RENDER STATE: PLACEMENT QUESTIONS & SPEECH STEP
     -------------------------------------------------------------------------- */
  function renderPlacementQuestion() {
    const questions = placementAttempt?.questions || [];
    const totalSteps = questions.length + 1; // 12 questions + 1 optional speech step
    const isSpeechStep = currentQuestionIdx === questions.length;
    const progressPct = Math.round(((currentQuestionIdx + 1) / totalSteps) * 100);

    let stepContent = '';

    if (!isSpeechStep) {
      const q = questions[currentQuestionIdx];
      const selectedIndex = userAnswers[q.id];

      stepContent = `
        <div class="question-header row" style="justify-content:space-between;align-items:center;margin-bottom:16px">
          <span class="pill sprout" style="font-size:11px;font-weight:800;text-transform:uppercase">
            ${esc(q.category || q.section || 'General English')}
          </span>
          <span style="font-size:12.5px;color:var(--cream-faint)">
            Question ${currentQuestionIdx + 1} of ${questions.length}
          </span>
        </div>

        <div class="question-prompt" style="font-size:17.5px;font-weight:600;line-height:1.6;color:var(--color-text);margin-bottom:24px">
          ${esc(q.prompt || q.question || q.text || '')}
        </div>

        <div class="options-list col gap-sm" style="margin-bottom:28px">
          ${(q.options || []).map((opt, idx) => {
            const isSelected = selectedIndex === idx;
            const letter = String.fromCharCode(65 + idx);
            return `
              <button type="button" class="option-btn card ${isSelected ? 'selected' : ''}" data-idx="${idx}" style="padding:14px 18px;text-align:left;display:flex;align-items:center;gap:14px;border:2px solid ${isSelected ? 'var(--cyan)' : 'var(--line)'};background:${isSelected ? 'rgba(6,182,212,0.1)' : 'var(--color-surface)'};border-radius:12px;cursor:pointer;transition:all .15s ease">
                <span class="option-letter" style="width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;background:${isSelected ? 'var(--cyan)' : 'var(--color-surface-2)'};color:${isSelected ? '#0F172A' : 'var(--cream)'}">
                  ${letter}
                </span>
                <span class="option-text" style="font-size:14.5px;line-height:1.45;color:var(--color-text);flex:1">
                  ${esc(opt)}
                </span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // Step 13: Optional Speech Sentence Incantation
      const sentence = placementAttempt?.speechSentence || (placementAttempt?.readAloudSentence && placementAttempt.readAloudSentence.sentence) || "Clear communication and courage define the master of words.";
      const speechSupported = typeof window !== 'undefined' && (window.SpeechInput?.supported || window.SpeechRecognition || window.webkitSpeechRecognition);

      stepContent = `
        <div class="speech-header row" style="justify-content:space-between;align-items:center;margin-bottom:16px">
          <span class="pill purple" style="font-size:11px;font-weight:800;text-transform:uppercase">
            🎙️ SPOKEN INCANTATION (OPTIONAL)
          </span>
          <span style="font-size:12.5px;color:var(--cyan);font-weight:700">
            Final Step (13 of 13)
          </span>
        </div>

        <div style="font-size:14.5px;color:var(--cream-dim);line-height:1.6;margin-bottom:20px">
          Read this ancient dragon incantation aloud. The council will evaluate your spoken pronunciation and articulation. If your microphone is unavailable, you may type the words or safely skip without penalty.
        </div>

        <div class="incantation-box card" style="padding:22px;background:var(--color-surface-2);border:2px dashed rgba(139,92,246,0.4);border-radius:16px;text-align:center;margin-bottom:24px">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--purple);font-weight:800;margin-bottom:8px">INCANTATION SCROLL</div>
          <div style="font-size:18px;font-family:var(--font-display);font-weight:700;line-height:1.6;color:var(--color-text)">
            &ldquo;${esc(sentence)}&rdquo;
          </div>
        </div>

        <div class="speech-action-wrap col gap-sm" style="align-items:center;margin-bottom:24px">
          <button type="button" class="rec-btn ${isRecording ? 'on' : ''}" id="speech-rec-btn" style="width:68px;height:68px;border-radius:50%;border:none;cursor:pointer;font-size:24px;display:flex;align-items:center;justify-content:center;transition:transform .15s ease">
            ${isRecording ? '⏹️' : '🎙️'}
          </button>
          <div style="font-size:12.5px;font-weight:700;color:${isRecording ? 'var(--coral)' : 'var(--cream-dim)'}">
            ${isRecording ? 'Listening... Speak clearly into your microphone' : (speechTranscript ? 'Recording captured! Click mic to record again' : (speechSupported ? 'Click to start spoken recording' : 'Microphone unavailable in this browser — type below'))}
          </div>
        </div>

        <div class="transcript-display card" style="padding:14px 18px;background:var(--color-surface);border:1px solid var(--line);border-radius:12px;margin-bottom:20px">
          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:11px;font-weight:700;color:var(--cream-faint);text-transform:uppercase">CAPTURED TRANSCRIPT</div>
            <button type="button" class="btn btn-ghost btn-sm" id="toggle-manual-speech-btn" style="font-size:11.5px;padding:3px 10px;color:var(--cyan)">
              ${isManualTyping ? '🎙️ Switch to Microphone' : '✏️ Type / Edit Incantation'}
            </button>
          </div>
          ${isManualTyping ? `
            <textarea id="speech-transcript-input" rows="2" style="width:100%;font-size:14px;padding:10px 12px;border-radius:8px;background:var(--color-surface-2);color:var(--color-text);border:1px solid var(--line);resize:vertical;font-family:inherit;box-sizing:border-box" placeholder="Type or paste the incantation here...">${esc(speechTranscript)}</textarea>
            <div style="font-size:11.5px;color:var(--cream-faint);margin-top:4px">Tip: You can edit or paste the incantation directly. It will be evaluated when you submit.</div>
          ` : `
            <div id="speech-transcript-text" style="font-size:13.5px;line-height:1.5;color:${speechTranscript ? 'var(--color-text)' : 'var(--cream-faint)'};font-style:${speechTranscript ? 'normal' : 'italic'}">
              ${speechTranscript ? esc(speechTranscript) : 'No speech captured yet. Click the mic button to speak, or click "Type / Edit Incantation" above.'}
            </div>
          `}
        </div>
      `;
    }

    mount.innerHTML = `
      <div class="trial-container animate-fade-in" style="max-width:760px;margin:20px auto;padding:0 16px">
        <!-- TOP STATUS ROW: TIMER & PROGRESS -->
        <div class="trial-status-card card" style="padding:14px 20px;border-radius:14px;background:var(--color-surface);border:1px solid var(--line);margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div class="row gap-sm" style="align-items:center">
            <span style="font-size:18px">🥚</span>
            <div>
              <div style="font-size:13px;font-weight:800;color:var(--color-text)">Placement Attunement Trial</div>
              <div style="font-size:11.5px;color:var(--cream-faint)">Step ${currentQuestionIdx + 1} of ${totalSteps}</div>
            </div>
          </div>
          <div class="row gap-md" style="align-items:center">
            <div style="display:flex;align-items:center;gap:6px;font-size:13px;background:var(--color-surface-2);padding:6px 12px;border-radius:20px;border:1px solid var(--line)">
              <span>⏳</span>
              <span id="trial-timer-display" style="font-family:var(--font-mono, monospace);font-weight:700">${formatTime(timeRemainingSec)}</span>
            </div>
            <button class="btn btn-ghost btn-sm" id="cancel-trial-btn" style="font-size:11.5px">Exit to Options</button>
          </div>
        </div>

        <!-- PROGRESS BAR -->
        <div style="height:6px;width:100%;background:var(--line);border-radius:4px;overflow:hidden;margin-bottom:24px">
          <div style="height:100%;width:${progressPct}%;background:linear-gradient(90deg,var(--cyan),var(--purple));transition:width .25s ease"></div>
        </div>

        <!-- MAIN QUESTION CARD -->
        <div class="card card-fantasy" style="padding:28px 24px;border-radius:18px;margin-bottom:24px;background:var(--color-surface)">
          ${stepContent}

          <!-- NAVIGATION CONTROLS -->
          <div class="row gap-sm" style="justify-content:space-between;align-items:center;margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">
            <button class="btn btn-secondary btn-sm" id="prev-step-btn" ${currentQuestionIdx === 0 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <div class="row gap-sm">
              ${isSpeechStep ? `
                <button class="btn btn-ghost btn-sm" id="skip-speech-btn">
                  Skip Speech (No Penalty)
                </button>
                <button class="btn btn-primary" id="submit-placement-btn" style="padding:8px 20px;font-weight:700">
                  Submit Trial &rarr;
                </button>
              ` : `
                <button class="btn btn-primary btn-sm" id="next-step-btn" style="padding:8px 18px">
                  ${currentQuestionIdx === questions.length - 1 ? 'Go to Spoken Step &rarr;' : 'Next Question &rarr;'}
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind event handlers
    const cancelBtn = mount.querySelector('#cancel-trial-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        if (confirm('Cancel placement trial and return to selection menu? Your current attempt remains active until submitted.')) {
          stopTimer();
          state = 'INTRO';
          renderIntro();
        }
      };
    }

    if (!isSpeechStep) {
      mount.querySelectorAll('.option-btn').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const q = questions[currentQuestionIdx];
          userAnswers[q.id] = idx;
          renderPlacementQuestion();
        };
      });

      const nextBtn = mount.querySelector('#next-step-btn');
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (currentQuestionIdx < questions.length) {
            currentQuestionIdx++;
            renderPlacementQuestion();
          }
        };
      }
    } else {
      // Speech Step Bindings
      const recBtn = mount.querySelector('#speech-rec-btn');
      if (recBtn) {
        recBtn.onclick = () => {
          if (!isRecording) {
            startSpeechRecording();
          } else {
            stopSpeechRecording();
          }
        };
      }

      const toggleManualBtn = mount.querySelector('#toggle-manual-speech-btn');
      if (toggleManualBtn) {
        toggleManualBtn.onclick = () => {
          if (isRecording) stopSpeechRecording();
          isManualTyping = !isManualTyping;
          renderPlacementQuestion();
        };
      }

      const transcriptInput = mount.querySelector('#speech-transcript-input');
      if (transcriptInput) {
        transcriptInput.oninput = (e) => {
          speechTranscript = e.target.value;
        };
      }

      const skipBtn = mount.querySelector('#skip-speech-btn');
      if (skipBtn) {
        skipBtn.onclick = () => {
          stopSpeechRecording();
          speechTranscript = '';
          handleSubmitPlacement();
        };
      }

      const submitBtn = mount.querySelector('#submit-placement-btn');
      if (submitBtn) {
        submitBtn.onclick = () => {
          stopSpeechRecording();
          handleSubmitPlacement();
        };
      }
    }

    const prevBtn = mount.querySelector('#prev-step-btn');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentQuestionIdx > 0) {
          stopSpeechRecording();
          currentQuestionIdx--;
          renderPlacementQuestion();
        }
      };
    }
  }

  /* --------------------------------------------------------------------------
     SPEECH RECORDING LOGIC VIA SpeechInput
     -------------------------------------------------------------------------- */
  function getSpeechEngine() {
    return (typeof window !== 'undefined' && window.SpeechInput) || (typeof SpeechInput !== 'undefined' ? SpeechInput : null);
  }

  function startSpeechRecording() {
    const engine = getSpeechEngine();
    if (!engine) {
      toast('Speech input engine not found in browser. You can type the incantation or skip.', 'amber');
      isManualTyping = true;
      renderPlacementQuestion();
      return;
    }

    if (!engine.supported) {
      toast('Speech recognition is not supported in this browser (Chrome or Edge recommended). You can type the incantation or skip without penalty.', 'amber');
      isManualTyping = true;
      renderPlacementQuestion();
      return;
    }

    isRecording = true;
    const recBtn = mount.querySelector('#speech-rec-btn');
    if (recBtn) recBtn.classList.add('on');

    engine.start({
      onResult: ({ final, interim }) => {
        const text = final || interim || '';
        speechTranscript = text;
        const disp = mount.querySelector('#speech-transcript-text');
        if (disp) {
          disp.textContent = text || 'Listening...';
          disp.style.fontStyle = 'normal';
          disp.style.color = 'var(--color-text)';
        }
      },
      onError: (err) => {
        console.warn('Speech error during placement:', err);
        isRecording = false;
        if (recBtn) recBtn.classList.remove('on');
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          toast('Microphone access denied. Please allow microphone permissions in your browser URL bar, or type the incantation.', 'coral');
          isManualTyping = true;
          renderPlacementQuestion();
        } else if (err === 'no-speech') {
          toast('No speech detected. Please speak closer to your microphone or click to try again.', 'amber');
        } else {
          toast('Speech recognition: ' + (err || 'Audio error') + '. You can speak again, type, or skip without penalty.', 'amber');
        }
      },
      onEnd: () => {
        isRecording = false;
        if (recBtn) recBtn.classList.remove('on');
      }
    });
  }

  function stopSpeechRecording() {
    const engine = getSpeechEngine();
    if (engine && isRecording) {
      engine.stop();
    }
    isRecording = false;
  }

  /* --------------------------------------------------------------------------
     SUBMIT PLACEMENT TRIAL TO BACKEND
     -------------------------------------------------------------------------- */
  async function handleSubmitPlacement() {
    stopTimer();
    stopSpeechRecording();

    if (isManualTyping) {
      const transcriptInput = mount.querySelector('#speech-transcript-input');
      if (transcriptInput) {
        speechTranscript = transcriptInput.value;
      }
    }

    mount.innerHTML = `
      <div class="trial-container" style="max-width:540px;margin:80px auto;text-align:center;padding:0 16px">
        <div class="card card-fantasy" style="padding:48px 24px;border-radius:20px">
          <div style="font-size:48px;margin-bottom:16px;animation:pulse 1.5s infinite">🐉</div>
          <h2 style="font-size:22px;font-family:var(--font-display);font-weight:800;margin-bottom:10px;color:var(--color-text)">
            The Council is Evaluating Your Trial
          </h2>
          <p style="font-size:14px;color:var(--cream-dim);line-height:1.6;margin-bottom:24px">
            Analyzing your grammatical precision, vocabulary depth, and reading comprehension...
          </p>
          <div class="spinner" style="margin:0 auto;width:32px;height:32px;border:3px solid var(--line);border-top-color:var(--cyan);border-radius:50%;animation:spin 0.8s linear infinite"></div>
        </div>
      </div>
    `;

    try {
      // Ensure answers are provided as array of { questionId, selectedIndex }
      const answersArray = Array.isArray(userAnswers)
        ? userAnswers
        : Object.entries(userAnswers || {}).map(([questionId, selectedIndex]) => ({
            questionId,
            selectedIndex: Number(selectedIndex),
          }));

      const payload = {
        attemptId: placementAttempt?.attemptId,
        answers: answersArray,
        speechTranscript: speechTranscript.trim() ? speechTranscript.trim() : undefined,
      };

      const res = await Api.submitPlacement(payload);
      placementResult = res;
      chosenLevel = res.recommendedLevel || 'Beginner';
      state = 'PLACEMENT_RESULT';
      renderPlacementResult();
    } catch (err) {
      toast(err.message || 'Failed to submit placement test.', 'coral');
      state = 'PLACEMENT';
      renderPlacementQuestion();
    }
  }

  /* --------------------------------------------------------------------------
     RENDER STATE: PLACEMENT RESULT & LEVEL SELECTION
     -------------------------------------------------------------------------- */
  function renderPlacementResult() {
    const res = placementResult;
    const recLevel = res.recommendedLevel || 'Beginner';
    const allowed = [];
    if (recLevel === 'Advanced') allowed.push('Advanced', 'Intermediate');
    else if (recLevel === 'Intermediate') allowed.push('Intermediate', 'Beginner');
    else allowed.push('Beginner');
    const recTier = res.currentTier || tiers[recLevel] || { title: recLevel };

    mount.innerHTML = `
      <div class="trial-container animate-fade-in" style="max-width:820px;margin:24px auto;padding:0 16px">
        <!-- HERO RESULT -->
        <div class="trial-hero-card card-fantasy" style="padding:32px 24px;text-align:center;border-radius:20px;margin-bottom:24px;background:var(--color-surface)">
          <div class="pill sprout" style="font-size:11px;font-weight:800;letter-spacing:0.06em;margin-bottom:10px">
            TRIAL RESULTS VERIFIED
          </div>
          <h1 style="font-size:28px;font-family:var(--font-display);font-weight:900;margin-bottom:8px;color:var(--color-text)">
            Recommended Rank: ${esc(recTier.title || recLevel)} (${esc(recLevel)})
          </h1>
          <p style="font-size:14px;color:var(--cream-dim);line-height:1.6;max-width:580px;margin:0 auto 20px">
            ${esc(res.explanation || 'Based on your written accuracy, you are recommended for this tier.')}
          </p>

          <!-- SCORE BREAKDOWN CHIPS -->
          <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-bottom:8px">
            <div class="card" style="padding:10px 18px;background:var(--color-surface-2);border-radius:12px;border:1px solid var(--line);min-width:140px">
              <div style="font-size:11px;color:var(--cream-faint);text-transform:uppercase;font-weight:700">Written Score</div>
              <div style="font-size:20px;font-weight:900;color:var(--cyan)">${res.writtenScore || 0}%</div>
            </div>
            <div class="card" style="padding:10px 18px;background:var(--color-surface-2);border-radius:12px;border:1px solid var(--line);min-width:140px">
              <div style="font-size:11px;color:var(--cream-faint);text-transform:uppercase;font-weight:700">Speech Articulation</div>
              <div style="font-size:20px;font-weight:900;color:var(--purple)">${res.speechScore !== null && res.speechScore !== undefined ? res.speechScore + '%' : 'Skipped'}</div>
            </div>
            <div class="card" style="padding:10px 18px;background:var(--color-surface-2);border-radius:12px;border:1px solid var(--line);min-width:140px">
              <div style="font-size:11px;color:var(--cream-faint);text-transform:uppercase;font-weight:700">Assessment Rank</div>
              <div style="font-size:20px;font-weight:900;color:var(--emerald)">${esc(recLevel)}</div>
            </div>
          </div>
        </div>

        <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--cream-faint);margin-bottom:12px;text-align:center">
          Confirm Your Starting Level
        </div>
        <div style="font-size:12.5px;color:var(--cream-dim);text-align:center;margin-bottom:20px">
          You may accept your recommended rank or choose to start one tier lower for extra foundational practice.
        </div>

        <!-- TIER CHOICES -->
        <div class="tier-selection-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(230px, 1fr));gap:16px;margin-bottom:28px">
          ${['Beginner', 'Intermediate', 'Advanced'].map(lvl => {
            const t = tiers[lvl] || { title: lvl };
            const isAllowed = allowed.includes(lvl);
            const isSelected = chosenLevel === lvl;
            const isRecommended = recLevel === lvl;

            return `
              <div class="tier-choice-card card ${isSelected ? 'selected' : ''} ${!isAllowed ? 'tier-locked disabled' : ''}" data-level="${lvl}" style="padding:20px;border-radius:16px;border:2px solid ${isSelected ? 'var(--cyan)' : isAllowed ? 'var(--line)' : 'rgba(239,68,68,0.2)'};background:${isSelected ? 'rgba(6,182,212,0.08)' : isAllowed ? 'var(--color-surface)' : 'var(--color-surface-2)'};opacity:${isAllowed ? '1' : '0.65'};cursor:${isAllowed ? 'pointer' : 'not-allowed'};display:flex;flex-direction:column;position:relative">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <span class="pill ${levelColor(lvl)}" style="font-size:10px;font-weight:800">${lvl.toUpperCase()}</span>
                  ${isRecommended ? `<span class="pill sprout" style="font-size:9.5px;font-weight:800">RECOMMENDED</span>` : ''}
                  ${!isAllowed ? `<span class="pill coral" style="font-size:9.5px">🔒 LOCKED</span>` : ''}
                </div>
                <h4 style="font-size:17px;font-family:var(--font-display);font-weight:800;margin-bottom:4px;color:var(--color-text)">
                  ${esc(t.title || lvl)}
                </h4>
                <div style="font-size:11.5px;color:var(--cream-faint);margin-bottom:12px">
                  ${lvl === 'Beginner' ? 'Core syntax, vocabulary & daily conversation' : lvl === 'Intermediate' ? 'Modals, fluent reading aloud & workplace drills' : 'Diplomacy, debate arena & nuanced rhetoric'}
                </div>
                <div style="margin-top:auto;padding-top:10px;border-top:1px solid var(--line);font-size:11px;color:${isAllowed ? 'var(--cyan)' : 'var(--coral)'};font-weight:700;text-align:center">
                  ${isAllowed ? (isSelected ? '✓ Selected Level' : 'Click to Select') : 'Above Recommendation'}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="text-align:center;margin-bottom:24px">
          <button class="btn btn-primary" id="confirm-placement-level-btn" style="padding:14px 36px;font-size:15px;font-weight:800;box-shadow:0 8px 24px rgba(16,185,129,0.3)">
            Confirm & Awaken Dragon &rarr;
          </button>
        </div>
      </div>
    `;

    // Bind tier card selection
    mount.querySelectorAll('.tier-choice-card').forEach(card => {
      card.onclick = () => {
        const lvl = card.dataset.level;
        if (allowed.includes(lvl)) {
          chosenLevel = lvl;
          renderPlacementResult();
        } else {
          toast('You cannot select a level higher than your placement recommendation.', 'coral');
        }
      };
    });

    const confirmBtn = mount.querySelector('#confirm-placement-level-btn');
    if (confirmBtn) {
      confirmBtn.onclick = handleFinalLevelSelection;
    }
  }

  /* --------------------------------------------------------------------------
     RENDER STATE: SELF-SELECT
     -------------------------------------------------------------------------- */
  function renderSelfSelect() {
    mount.innerHTML = `
      <div class="trial-container animate-fade-in" style="max-width:880px;margin:24px auto;padding:0 16px">
        <div class="trial-hero-card card-fantasy" style="padding:32px 24px;text-align:center;border-radius:20px;margin-bottom:24px;background:var(--color-surface)">
          <div class="row gap-sm" style="justify-content:center;margin-bottom:10px">
            <button class="btn btn-ghost btn-sm" id="self-back-btn">&larr; Back to Trial Options</button>
            <span class="pill purple" style="font-size:11px;font-weight:800">DIRECT ATTUNEMENT</span>
          </div>
          <h1 style="font-size:30px;font-family:var(--font-display);font-weight:900;margin-bottom:8px;color:var(--color-text)">
            Choose Your Dragon Tier
          </h1>
          <p style="font-size:14.5px;color:var(--cream-dim);line-height:1.6;max-width:600px;margin:0 auto 12px">
            Select the rank that matches your comfort level. Your dragon will hatch harmonized to your chosen realm.
          </p>
        </div>

        <div class="tier-selection-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:20px;margin-bottom:28px">
          ${[
            {
              id: 'Beginner',
              title: 'Hatchling',
              icon: '🌱',
              accent: '#10B981',
              desc: 'Hatch your journey! Build foundations in grammar, essential vocabulary, everyday listening, and guided pronunciation.',
              kingdoms: ['Grammar Castle', 'Vocabulary Forest', 'Listening Ocean', 'Reading Grimoires', 'Conversation Village', 'Weak Words Lab', 'Ignis Mentor']
            },
            {
              id: 'Intermediate',
              title: 'Flame Keeper',
              icon: '⚡',
              accent: '#06B6D4',
              desc: 'Ignite vocal power! Tackle modals, conditionals, fluent reading aloud, and real-world workplace scenarios.',
              kingdoms: ['All Beginner Kingdoms', 'Speaking Volcano', 'Scriptor’s Workshop', 'Idioms Grove', 'Peer Practice Duels']
            },
            {
              id: 'Advanced',
              title: 'Sky Guardian',
              icon: '🌌',
              accent: '#8B5CF6',
              desc: 'Command cosmic fluency! Master high-stakes diplomacy, debate combat, oratory rhetoric, and nuanced syntax.',
              kingdoms: ['All Kingdoms Unlocked', 'World Stage', 'Dragon Debate Arena']
            }
          ].map(t => {
            const isSelected = chosenLevel === t.id;
            return `
              <div class="self-tier-card card ${isSelected ? 'selected' : ''}" data-level="${t.id}" style="padding:24px 20px;border-radius:18px;border:2px solid ${isSelected ? t.accent : 'var(--line)'};background:${isSelected ? 'var(--color-surface-2)' : 'var(--color-surface)'};cursor:pointer;display:flex;flex-direction:column;box-shadow:${isSelected ? `0 8px 24px ${t.accent}33` : 'none'};transition:all .15s ease">
                <div style="font-size:36px;margin-bottom:8px">${t.icon}</div>
                <div class="pill ${levelColor(t.id)}" style="font-size:10px;font-weight:800;align-self:flex-start;margin-bottom:6px">${t.id.toUpperCase()}</div>
                <h3 style="font-size:20px;font-family:var(--font-display);font-weight:800;margin-bottom:8px;color:var(--color-text)">
                  ${esc(t.title)}
                </h3>
                <p style="font-size:13px;color:var(--cream-dim);line-height:1.5;margin-bottom:14px;flex:1">
                  ${esc(t.desc)}
                </p>
                <div style="font-size:11px;font-weight:700;color:var(--cream-faint);text-transform:uppercase;margin-bottom:6px">Unlocked Realms</div>
                <div style="font-size:11.5px;color:var(--cream-dim);line-height:1.45;margin-bottom:16px">
                  ${t.kingdoms.map(k => `&bull; ${esc(k)}`).join('<br/>')}
                </div>
                <div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line);font-size:12px;color:${isSelected ? t.accent : 'var(--cream-faint)'};font-weight:800;text-align:center">
                  ${isSelected ? '✓ Selected Tier' : 'Click to Select'}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="text-align:center;margin-bottom:24px">
          <button class="btn btn-primary" id="confirm-self-level-btn" style="padding:14px 36px;font-size:15px;font-weight:800;box-shadow:0 8px 24px rgba(16,185,129,0.3)">
            Confirm & Awaken Dragon &rarr;
          </button>
        </div>
      </div>
    `;

    mount.querySelector('#self-back-btn').onclick = () => {
      state = 'INTRO';
      renderIntro();
    };

    mount.querySelectorAll('.self-tier-card').forEach(card => {
      card.onclick = () => {
        chosenLevel = card.dataset.level;
        renderSelfSelect();
      };
    });

    const confirmBtn = mount.querySelector('#confirm-self-level-btn');
    if (confirmBtn) {
      confirmBtn.onclick = handleFinalLevelSelection;
    }
  }

  /* --------------------------------------------------------------------------
     HANDLE FINAL LEVEL SELECTION (PERSIST TO BACKEND)
     -------------------------------------------------------------------------- */
  async function handleFinalLevelSelection() {
    const btn = mount.querySelector('#confirm-placement-level-btn') || mount.querySelector('#confirm-self-level-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #FFF;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px"></span> Awakening Dragon...`;
    }

    try {
      const isPlacement = !!(placementResult && placementAttempt && placementAttempt.attemptId);
      const payload = {
        path: isPlacement ? 'placement' : 'self',
        level: chosenLevel,
      };
      if (isPlacement) {
        payload.attemptId = placementAttempt.attemptId;
      }

      const res = await Api.selectOnboardingLevel(payload);
      finalResult = res;

      // Update local state in app
      if (S.user) {
        S.user.level = res.level;
        S.user.onboardingCompleted = true;
        S.user.unlockedLevels = res.unlockedLevels || ['Beginner'];
      }

      // Trigger Dragon Mascot celebration
      if (window.DragonMascot && window.DragonMascot.celebrate) {
        const curTierTitle = res.currentTier?.title || chosenLevel;
        window.DragonMascot.celebrate({
          title: `Dragon Companion Awakened!`,
          message: `Your companion has bonded with you as a ${curTierTitle} (${res.level}). The gates of the academy are now open!`,
          xp: 25,
          onDismiss: () => {
            renderSummary();
          }
        });
      }

      // Render the unlocked kingdoms summary screen
      state = 'SUMMARY';
      renderSummary();
    } catch (err) {
      toast(err.message || 'Could not complete level attunement.', 'coral');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirm & Awaken Dragon →';
      }
    }
  }

  /* --------------------------------------------------------------------------
     RENDER STATE: SUMMARY & UNLOCKED KINGDOMS
     -------------------------------------------------------------------------- */
  function renderSummary() {
    const userLevel = (S.user && S.user.level) || chosenLevel || 'Beginner';
    const tierMeta = tiers[userLevel] || { title: userLevel };

    const unlockedKingdoms = userLevel === 'Advanced' ? [
      { name: 'World Stage', icon: '🎙️', desc: 'Simulated public speaking in iconic auditoriums.' },
      { name: 'Dragon Debate Arena', icon: '⚔️', desc: 'High-stakes collegiate debate combat vs AI Drake.' },
      { name: 'Speaking Volcano', icon: '🌋', desc: 'Pronunciation drills & fluent reading aloud.' },
      { name: 'Scriptor’s Workshop', icon: '💼', desc: 'Real-world workplace & pitch simulations.' },
      { name: 'Idioms & Phrasal Grove', icon: '🌿', desc: 'Master high-impact figurative expressions.' },
      { name: 'Grammar Castle', icon: '🏰', desc: 'Tenses, inversion syntax, modals & conditionals.' },
      { name: 'Vocabulary Forest', icon: '🌲', desc: 'Bioluminescent lexicon trees & daily words.' },
      { name: 'Listening Ocean', icon: '🌊', desc: 'Multi-accent audio comprehension.' },
      { name: 'Reading Grimoires', icon: '📚', desc: 'Interactive stories & improvisation.' },
      { name: 'Conversation Village', icon: '🏘️', desc: 'Real-life campus & professional dialogues.' },
      { name: 'Weak Words Lab', icon: '🎯', desc: 'SM-2 spaced repetition for tricky words.' },
      { name: 'Ignis: Dragon Mentor', icon: '🐉', desc: '24/7 intelligent personalized AI tutor.' }
    ] : userLevel === 'Intermediate' ? [
      { name: 'Speaking Volcano', icon: '🌋', desc: 'Pronunciation drills & fluent reading aloud.' },
      { name: 'Scriptor’s Workshop', icon: '💼', desc: 'Workplace emails & communication simulations.' },
      { name: 'Idioms & Phrasal Grove', icon: '🌿', desc: 'Master figurative expressions & phrasal verbs.' },
      { name: 'Peer Practice Duels', icon: '👥', desc: 'Voice-anonymized practice with peers.' },
      { name: 'Grammar Castle', icon: '🏰', desc: 'Modals, conditionals & foundational syntax.' },
      { name: 'Vocabulary Forest', icon: '🌲', desc: 'Daily words & working lexicon.' },
      { name: 'Listening Ocean', icon: '🌊', desc: 'Audio clips & rhythm comprehension.' },
      { name: 'Reading Grimoires', icon: '📚', desc: 'Interactive narrative scrolls.' },
      { name: 'Conversation Village', icon: '🏘️', desc: 'Campus & social dialogue practice.' },
      { name: 'Weak Words Lab', icon: '🎯', desc: 'Targeted mispronunciation drills.' },
      { name: 'Ignis: Dragon Mentor', icon: '🐉', desc: 'Intelligent English guidance.' }
    ] : [
      { name: 'Grammar Castle', icon: '🏰', desc: 'Foundations of tenses, prepositions & articles.' },
      { name: 'Vocabulary Forest', icon: '🌲', desc: 'Daily words, synonyms & working lexicon.' },
      { name: 'Listening Ocean', icon: '🌊', desc: 'Clear, paced audio clips with comprehension tests.' },
      { name: 'Reading Grimoires', icon: '📚', desc: 'Foundational reading comprehension passages.' },
      { name: 'Conversation Village', icon: '🏘️', desc: 'Everyday campus greetings & social phrases.' },
      { name: 'Weak Words Lab', icon: '🎯', desc: 'Spaced repetition for challenging words.' },
      { name: 'Ignis: Dragon Mentor', icon: '🐉', desc: 'Your personal intelligent English companion.' }
    ];

    mount.innerHTML = `
      <div class="trial-container animate-fade-in" style="max-width:860px;margin:28px auto;padding:0 16px">
        <div class="trial-hero-card card-fantasy" style="padding:36px 24px;text-align:center;border-radius:20px;margin-bottom:28px;background:var(--color-surface)">
          <div style="font-size:52px;margin-bottom:12px">🎉</div>
          <div class="pill sprout" style="font-size:11px;font-weight:800;letter-spacing:0.06em;margin-bottom:10px">
            ONBOARDING COMPLETED
          </div>
          <h1 style="font-size:32px;font-family:var(--font-display);font-weight:900;margin-bottom:8px;color:var(--color-text)">
            Welcome to the Dragon Academy!
          </h1>
          <p style="font-size:15px;color:var(--cream-dim);line-height:1.6;max-width:620px;margin:0 auto 24px">
            You are now bonded as a <strong>${esc(tierMeta.title || userLevel)} (${esc(userLevel)})</strong>. Your companion dragon has awakened, and your unlocked kingdoms are ready for exploration.
          </p>

          <button class="btn btn-primary" id="enter-academy-btn" style="padding:14px 40px;font-size:16px;font-weight:800;box-shadow:0 8px 24px rgba(16,185,129,0.35)">
            Enter Dragon Academy &rarr;
          </button>
        </div>

        <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--cream-faint);margin-bottom:14px">
          Your Unlocked Kingdoms (${unlockedKingdoms.length} Realms)
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:14px;margin-bottom:32px">
          ${unlockedKingdoms.map(k => `
            <div class="card" style="padding:16px;border-radius:12px;background:var(--color-surface);border:1px solid var(--line);display:flex;align-items:flex-start;gap:12px">
              <span style="font-size:24px">${k.icon}</span>
              <div>
                <div style="font-weight:800;font-size:14px;color:var(--color-text)">${esc(k.name)}</div>
                <div style="font-size:12px;color:var(--cream-dim);margin-top:2px;line-height:1.4">${esc(k.desc)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    mount.querySelector('#enter-academy-btn').onclick = () => {
      // Re-render shell to show unlocked nav, topbar level badge, and initiate floating companion
      if (typeof renderShell === 'function') renderShell();
      if (typeof renderTopbar === 'function') renderTopbar();
      if (typeof initGlobalChatbot === 'function') initGlobalChatbot();
      if (window.DragonMascot && window.DragonMascot.initFloatingCompanion && S.user) {
        window.DragonMascot.initFloatingCompanion(S.user);
      }
      setView('dashboard');
    };
  }

  // Initial render: launch INTRO
  renderIntro();
};
