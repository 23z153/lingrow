/* ==========================================================================
   LinGrow AI — Weak Words Lab View
   Spaced-repetition pronunciation drills for mispronounced & tricky words.
   ========================================================================== */

(function () {
  window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};

  const WWState = {
    words: [],
    counts: { new: 0, learning: 0, almost: 0, mastered: 0, due: 0, total: 0 },
    activeDrillQueue: [],
    drillIndex: 0,
    drillStep: 1, // 1: Listen/Word, 2: Pronounce Word, 3: Read Sentence, 4: Summary
    sessionResults: [], // { word, correct, xpAwarded, becameMastered }
    totalSessionXP: 0,
    activeDrillWord: null,
  };

  /**
   * Main Weak Words view entry
   */
  VIEW_RENDERERS['weakwords'] = async function (root) {
    root.innerHTML = `
      <div class="col gap-md" id="ww-container">
        <div class="empty-state">
          <div class="spinner" style="margin:0 auto 12px"></div>
          <div>Loading Weak Words Lab…</div>
        </div>
      </div>
    `;

    try {
      await loadWeakWordsData();
      renderWeakWordsHub(root);
    } catch (err) {
      console.error('[weakwords] Init error:', err);
      root.innerHTML = `
        <div class="card empty-state col gap-sm" style="text-align:center;padding:36px">
          <div style="font-size:32px">⚠️</div>
          <h3>Failed to load Weak Words Lab</h3>
          <p style="color:var(--cream-dim)">${esc(err.message || 'Network error')}</p>
          <button class="btn btn-primary btn-sm" onclick="VIEW_RENDERERS['weakwords']($('#view-inner'))">Retry</button>
        </div>
      `;
    }
  };

  async function loadWeakWordsData() {
    const data = await Api.getWeakWords();
    WWState.words = data.words || [];
    WWState.counts = data.counts || { new: 0, learning: 0, almost: 0, mastered: 0, due: 0, total: 0 };
  }

  // --------------------------------------------------------------------------
  // SCREEN 1: WEAK WORDS LAB HUB
  // --------------------------------------------------------------------------
  function renderWeakWordsHub(root) {
    const c = WWState.counts;
    const words = WWState.words;

    root.innerHTML = `
      <div class="col gap-lg" id="ww-hub">
        <!-- Hero Header -->
        <div class="ww-hero">
          <div class="row gap-sm" style="align-items:center;margin-bottom:8px">
            <span class="pill voice" style="font-size:11px;font-weight:700">SPACED REPETITION LAB</span>
            <div class="spacer"></div>
            <span class="pill ${c.due > 0 ? 'coral' : 'sprout'}" style="font-weight:700">
              ${c.due > 0 ? `🔥 ${c.due} Words Due Today` : '✓ All Reviews Up-to-Date'}
            </span>
          </div>
          <h2 style="font-size:26px;font-weight:800;color:var(--color-text);margin:0 0 6px">
            Weak Words Lab
          </h2>
          <p style="color:var(--cream-dim);font-size:14px;max-width:680px;line-height:1.5;margin:0">
            Automatically collects the technical and conversational words you mispronounce or skip across Read Aloud,
            World Stage, and Simulator sessions. Review them in rapid spaced-repetition drills until permanent mastery.
          </p>

          <!-- Stage Breakdown Cards -->
          <div class="ww-stage-grid">
            <div class="ww-stage-card new">
              <span class="ww-stage-lbl">1. New</span>
              <div class="ww-stage-val" style="color:#06B6D4">${c.new}</div>
              <span style="font-size:11.5px;color:var(--cream-dim);margin-top:2px">Needs initial drill</span>
            </div>
            <div class="ww-stage-card learning">
              <span class="ww-stage-lbl">2. Learning</span>
              <div class="ww-stage-val" style="color:#F59E0B">${c.learning}</div>
              <span style="font-size:11.5px;color:var(--cream-dim);margin-top:2px">1-2 day intervals</span>
            </div>
            <div class="ww-stage-card almost">
              <span class="ww-stage-lbl">3. Almost</span>
              <div class="ww-stage-val" style="color:#8B5CF6">${c.almost}</div>
              <span style="font-size:11.5px;color:var(--cream-dim);margin-top:2px">Streak 2 (4 days)</span>
            </div>
            <div class="ww-stage-card mastered">
              <span class="ww-stage-lbl">4. Mastered</span>
              <div class="ww-stage-val" style="color:#10B981">${c.mastered}</div>
              <span style="font-size:11.5px;color:var(--cream-dim);margin-top:2px">Permanently retained</span>
            </div>
          </div>
        </div>

        <!-- Daily 5 Launch Action -->
        <div class="ww-launch-box">
          <div class="col" style="flex:1">
            <div style="font-weight:700;font-size:16px;color:var(--color-text)">
              ⚡ Daily 5 Spaced Repetition Drill
            </div>
            <div style="font-size:13.5px;color:var(--cream-dim);margin-top:3px">
              ${c.due > 0 ? `You have ${c.due} words ready for review. Practice 5 words in under 2 minutes to earn XP and level up!` : 'No words due for review right now! You can still launch a practice drill on any existing word.'}
            </div>
          </div>
          <button class="btn btn-primary" id="btn-start-daily5" style="font-size:14px;padding:10px 22px">
            ${c.due > 0 ? `Start Daily 5 Drill (${Math.min(5, c.due)} due)` : 'Practice 5 Random Words'} ${ICONS.arrowRight}
          </button>
        </div>

        <!-- Word List & Manual Add Section -->
        <div class="card col gap-md">
          <div class="row gap-md" style="align-items:center;flex-wrap:wrap">
            <div>
              <div class="section-title" style="margin:0">${ICONS.book} Word Collection (${words.length})</div>
              <div style="font-size:12.5px;color:var(--cream-dim)">Track pronunciation streaks, stages, and spaced review dates.</div>
            </div>
            <div class="spacer"></div>
            <!-- Search Filter -->
            <input type="search" id="ww-search-input" placeholder="Search saved words…" style="width:200px" />
          </div>

          <!-- Add Word Manually Form -->
          <form id="ww-add-form" class="row gap-sm" style="align-items:center;background:var(--color-surface-2);padding:12px 16px;border-radius:12px">
            <input type="text" id="ww-new-word-input" class="field-input" placeholder="Add a tricky word manually (e.g. 'hierarchy', 'asynchronous')…" style="flex:1" required />
            <button type="submit" class="btn btn-outline btn-sm"><i class="bi bi-plus-lg"></i> Add Word</button>
          </form>

          <!-- Table of Words -->
          ${words.length ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Word & Phonetic</th>
                    <th>Stage & Mastery</th>
                    <th>Streak</th>
                    <th>Misses</th>
                    <th>Source</th>
                    <th>Next Review</th>
                    <th style="text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody id="ww-table-body">
                  ${renderWordRows(words)}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state" style="padding:32px;text-align:center">
              <div style="font-size:32px;margin-bottom:8px">🎯</div>
              <div style="font-weight:700;font-size:16px">Your Weak Words Lab is currently clean!</div>
              <div style="font-size:13.5px;color:var(--cream-dim);max-width:400px;margin:4px auto 14px">
                Words you stumble on in Read Aloud or other practice sessions will automatically collect here.
              </div>
            </div>
          `}
        </div>
      </div>
      <div id="ww-drill-container"></div>
    `;

    setupHubListeners();
  }

  function renderWordRows(list) {
    return list.map((w) => {
      const stagePills = {
        new: '<span class="pill" style="color:#06B6D4;border-color:rgba(6,182,212,0.4)">New</span>',
        learning: '<span class="pill amber">Learning</span>',
        almost: '<span class="pill purple">Almost</span>',
        mastered: '<span class="pill sprout">Mastered</span>',
      };

      const isDue = w.stage !== 'mastered' && new Date(w.nextReviewAt) <= new Date();

      return `
        <tr class="tr-hover" id="row-${esc(w._id)}">
          <td>
            <div style="font-weight:700;font-size:15px;color:var(--color-text)">${esc(w.word)}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#818CF8">${esc(w.phonetic || `/${w.word}/`)}</div>
          </td>
          <td>
            <div class="col gap-xs">
              ${stagePills[w.stage] || stagePills.new}
              <div class="ww-bar-wrap" title="${w.stage.toUpperCase()} Stage">
                <div class="ww-bar-fill stage-${w.stage}"></div>
              </div>
            </div>
          </td>
          <td>
            <span class="mono" style="font-weight:700">${w.correctStreak}</span>
            <span style="font-size:11px;color:var(--cream-dim)">/ 3</span>
          </td>
          <td>
            <span class="pill coral" style="font-size:11px;font-weight:700">${w.missCount}x</span>
          </td>
          <td>
            <span class="pill voice" style="font-size:10.5px">${esc(w.source || 'manual')}</span>
          </td>
          <td style="font-size:12px;color:var(--cream-dim)">
            ${isDue ? '<span style="color:#EF4444;font-weight:700">Ready now</span>' : timeAgo(w.nextReviewAt)}
          </td>
          <td style="text-align:right">
            <div class="row gap-xs" style="justify-content:flex-end">
              <button class="btn btn-ghost btn-sm btn-practice-single" data-id="${esc(w._id)}" title="Drill this word now">
                ${ICONS.play} Drill
              </button>
              <button class="icon-btn btn-delete-word" data-id="${esc(w._id)}" title="Remove word" style="color:#94A3B8">
                ${ICONS.x}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function setupHubListeners() {
    // Start Daily 5
    const dailyBtn = $('#btn-start-daily5');
    if (dailyBtn) {
      dailyBtn.onclick = async () => {
        dailyBtn.disabled = true;
        try {
          let dueWords = await Api.getWeakWordsDue(5);
          if (!dueWords || dueWords.length === 0) {
            // Fallback: pick up to 5 non-mastered words or random
            dueWords = WWState.words.filter((w) => w.stage !== 'mastered').slice(0, 5);
            if (!dueWords.length) dueWords = WWState.words.slice(0, 5);
          }
          if (!dueWords.length) {
            toast('Add at least one word to start a drill session.', 'coral');
            return;
          }
          startDrillSession(dueWords);
        } catch (err) {
          apiError(err);
        } finally {
          dailyBtn.disabled = false;
        }
      };
    }

    // Single Word Drill buttons
    document.querySelectorAll('.btn-practice-single').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const targetWord = WWState.words.find((w) => w._id === id);
        if (targetWord) startDrillSession([targetWord]);
      };
    });

    // Delete word buttons
    document.querySelectorAll('.btn-delete-word').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if (confirm('Remove this word from your Weak Words collection?')) {
          try {
            await Api.deleteWeakWord(id);
            const row = $(`#row-${id}`);
            if (row) row.remove();
            WWState.words = WWState.words.filter((w) => w._id !== id);
            toast('Word removed.', 'sprout');
          } catch (err) {
            apiError(err);
          }
        }
      };
    });

    // Manual add word form
    const addForm = $('#ww-add-form');
    if (addForm) {
      addForm.onsubmit = async (e) => {
        e.preventDefault();
        const input = $('#ww-new-word-input');
        const word = input.value.trim();
        if (!word) return;

        input.disabled = true;
        try {
          await Api.postWeakWordsBulk({ words: [word], source: 'manual' });
          input.value = '';
          toast(`"${word}" added to Weak Words Lab!`, 'sprout');
          await loadWeakWordsData();
          renderWeakWordsHub($('#ww-container') || $('#view-inner'));
        } catch (err) {
          apiError(err);
        } finally {
          input.disabled = false;
        }
      };
    }

    // Search filter
    const searchInput = $('#ww-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = WWState.words.filter((w) => w.word.toLowerCase().includes(q));
        const tbody = $('#ww-table-body');
        if (tbody) tbody.innerHTML = renderWordRows(filtered);
      };
    }
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: DRILL SESSION MODAL FLOW
  // --------------------------------------------------------------------------
  function startDrillSession(wordsToDrill) {
    WWState.activeDrillQueue = wordsToDrill;
    WWState.drillIndex = 0;
    WWState.drillStep = 1;
    WWState.sessionResults = [];
    WWState.totalSessionXP = 0;
    renderDrillStep();
  }

  function renderDrillStep() {
    const container = $('#ww-drill-container');
    if (!container) return;

    if (WWState.drillIndex >= WWState.activeDrillQueue.length) {
      renderDrillSummary(container);
      return;
    }

    const currentWord = WWState.activeDrillQueue[WWState.drillIndex];
    WWState.activeDrillWord = currentWord;
    const progressLabel = `Word ${WWState.drillIndex + 1} of ${WWState.activeDrillQueue.length}`;

    container.innerHTML = `
      <div class="ww-drill-overlay" id="ww-drill-modal-wrap">
        <div class="ww-drill-modal" role="dialog" aria-modal="true">
          <!-- Topbar -->
          <div class="ww-drill-topbar">
            <span class="pill voice" style="font-weight:700">${progressLabel}</span>
            <div style="font-size:13px;color:var(--cream-dim)">
              Stage: <strong style="color:var(--color-text)">${currentWord.stage.toUpperCase()}</strong>
              &bull; Streak: <strong>${currentWord.correctStreak}/3</strong>
            </div>
            <button class="icon-btn" id="btn-close-drill" title="Exit drill">${ICONS.x}</button>
          </div>

          <!-- Body -->
          <div class="ww-drill-body">
            <!-- Step Badge -->
            <span class="pill" style="font-size:11px;font-weight:700;margin-bottom:14px;background:var(--color-surface-2)">
              ${WWState.drillStep === 1 || WWState.drillStep === 2 ? 'STEP 1: WORD PRONUNCIATION' : 'STEP 2: CONTEXTUAL PRACTICE'}
            </span>

            <!-- Target Word & Phonetic -->
            <div class="ww-word-display">${esc(currentWord.word)}</div>
            <div class="ww-phonetic-pill">${esc(currentWord.phonetic || `/${currentWord.word}/`)}</div>

            <!-- Audio Pronunciation Buttons -->
            <div class="row gap-sm" style="margin-bottom:20px">
              <button class="btn btn-outline btn-sm" id="btn-listen-normal">
                ${ICONS.play} Listen (Normal)
              </button>
              <button class="btn btn-outline btn-sm" id="btn-listen-slow">
                ${ICONS.play} Listen (Slow 0.6x)
              </button>
            </div>

            <!-- Contextual Sentence Box (Shown in Step 3) -->
            ${WWState.drillStep === 3 ? `
              <div class="ww-sentence-box">
                ${formatHighlightedSentence(currentWord.exampleSentence, currentWord.word)}
              </div>
              <div style="font-size:13px;color:var(--cream-dim);margin-bottom:8px">
                Read the complete sentence aloud.
              </div>
            ` : ''}

            <!-- Microphone Center Button -->
            <button class="ww-mic-circle" id="btn-drill-mic" aria-label="Hold or tap to speak">
              <i class="bi bi-mic-fill" id="drill-mic-icon"></i>
            </button>
            <div style="font-size:13px;color:var(--cream-dim)" id="drill-instruction">
              ${WWState.drillStep === 3 ? 'Tap microphone and read the sentence above' : 'Tap microphone and pronounce the word clearly'}
            </div>

            <!-- Interim / Speech Live Feedback -->
            <div style="min-height:24px;margin-top:10px;font-size:14px;color:#818CF8;font-style:italic" id="drill-interim-text"></div>

            <!-- Result Feedback Box -->
            <div id="drill-feedback-box" style="display:none;width:100%"></div>

            <!-- Fallback Self-Mark Controls (if Web Speech not supported) -->
            <div id="drill-fallback-controls" style="display:${SpeechInput.supported ? 'none' : 'flex'};gap:10px;margin-top:16px">
              <button class="btn btn-primary btn-sm" id="btn-self-correct">✓ I said it correctly</button>
              <button class="btn btn-outline btn-sm" id="btn-self-wrong">✗ I mispronounced it</button>
            </div>

            <!-- Skip Button -->
            <div class="row" style="margin-top:20px;justify-content:center">
              <button class="btn btn-ghost btn-sm" id="btn-skip-word" style="color:var(--cream-dim)">
                Skip word &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    setupDrillListeners(currentWord);
  }

  function formatHighlightedSentence(sentence, targetWord) {
    if (!sentence) return `Practice saying "${esc(targetWord)}" in a sentence.`;
    const regex = new RegExp(`\\b(${escapeRegExp(targetWord)})\\b`, 'gi');
    return esc(sentence).replace(regex, '<span class="ww-sentence-highlight">$1</span>');
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function setupDrillListeners(currentWord) {
    // Close modal
    $('#btn-close-drill').onclick = () => {
      if (confirm('Leave current drill session? Completed word reviews have been saved.')) {
        closeDrillModal();
      }
    };

    // Listen Normal (rate 1.0)
    $('#btn-listen-normal').onclick = () => {
      SpeechOutput.speak(currentWord.word, { rate: 1.0 });
    };

    // Listen Slow (rate 0.6)
    $('#btn-listen-slow').onclick = () => {
      SpeechOutput.speak(currentWord.word, { rate: 0.6 });
    };

    // Skip word
    $('#btn-skip-word').onclick = () => {
      WWState.drillIndex++;
      WWState.drillStep = 1;
      renderDrillStep();
    };

    // Self-mark fallback buttons
    const selfCorrectBtn = $('#btn-self-correct');
    const selfWrongBtn = $('#btn-self-wrong');
    if (selfCorrectBtn) selfCorrectBtn.onclick = () => handleDrillEvaluation(true, currentWord);
    if (selfWrongBtn) selfWrongBtn.onclick = () => handleDrillEvaluation(false, currentWord);

    // Microphone speech capture
    const micBtn = $('#btn-drill-mic');
    micBtn.onclick = () => {
      if (!SpeechInput.supported) {
        toast('Speech recognition not supported in browser. Use self-mark buttons below.', 'amber');
        return;
      }

      if (SpeechInput.listening) {
        SpeechInput.stop();
        micBtn.classList.remove('recording');
        $('#drill-instruction').textContent = 'Processing speech…';
      } else {
        SpeechOutput.stop();
        micBtn.classList.add('recording');
        $('#drill-instruction').textContent = 'Listening… Speak clearly into microphone';
        $('#drill-interim-text').textContent = '';

        let lastCaptured = '';

        SpeechInput.start({
          onResult: ({ final, interim }) => {
            lastCaptured = (final || interim || '').trim();
            const el = $('#drill-interim-text');
            if (el) el.textContent = `"${lastCaptured}"`;
          },
          onEnd: (fullFinal) => {
            micBtn.classList.remove('recording');
            const spokenText = (fullFinal || lastCaptured || '').trim();
            $('#drill-instruction').textContent = 'Tap microphone to speak again';

            if (!spokenText) {
              toast('No speech detected. Tap microphone and try again.', 'amber');
              return;
            }

            evaluateSpokenUtterance(spokenText, currentWord);
          },
          onError: (err) => {
            micBtn.classList.remove('recording');
            $('#drill-instruction').textContent = 'Microphone ready';
            toast(typeof err === 'string' ? err : 'Microphone error', 'coral');
          },
        });
      }
    };
  }

  /**
   * Compares the spoken utterance against the target word or sentence
   */
  function evaluateSpokenUtterance(spokenText, currentWord) {
    const cleanSpoken = spokenText.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const cleanTarget = currentWord.word.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    if (WWState.drillStep === 1 || WWState.drillStep === 2) {
      // Step 2 Word matching: checks if spoken matches or contains target word
      const wordsArray = cleanSpoken.split(/\s+/);
      const isMatch =
        cleanSpoken === cleanTarget ||
        wordsArray.includes(cleanTarget) ||
        wordsArray.some((w) => w.length > 3 && (w.startsWith(cleanTarget.slice(0, 4)) || cleanTarget.startsWith(w.slice(0, 4))));

      if (isMatch) {
        showFeedback(true, `Great job! "${currentWord.word}" pronounced correctly. Proceeding to sentence practice…`);
        setTimeout(() => {
          WWState.drillStep = 3;
          renderDrillStep();
        }, 1200);
      } else {
        showFeedback(false, `Heard: "${spokenText}". Target: "${currentWord.word}". Tap mic to retry or skip.`);
      }
    } else if (WWState.drillStep === 3) {
      // Step 3 Sentence matching: checks that target word was enunciated inside sentence
      const isMatch = cleanSpoken.includes(cleanTarget) || cleanSpoken.split(/\s+/).some((w) => w.slice(0, 4) === cleanTarget.slice(0, 4));

      if (isMatch) {
        showFeedback(true, `Perfect sentence articulation! Recording review score…`);
        handleDrillEvaluation(true, currentWord);
      } else {
        showFeedback(false, `Ensure you enunciate "${currentWord.word}" clearly within the sentence. Try once more.`);
      }
    }
  }

  function showFeedback(correct, msg) {
    const box = $('#drill-feedback-box');
    if (!box) return;
    box.style.display = 'block';
    box.innerHTML = `
      <div class="ww-feedback-badge ${correct ? 'correct' : 'wrong'}">
        <span>${correct ? '✓' : '✗'}</span>
        <span>${esc(msg)}</span>
      </div>
    `;
  }

  async function handleDrillEvaluation(correct, currentWord) {
    try {
      const res = await Api.submitWeakWordResult(currentWord._id, { correct });
      const xp = res.xpAwarded || 0;
      WWState.totalSessionXP += xp;
      if (xp > 0) addStudentXP(xp);

      WWState.sessionResults.push({
        word: currentWord.word,
        correct,
        xpAwarded: xp,
        becameMastered: res.becameMastered,
        stage: res.word?.stage || (correct ? 'mastered' : 'learning'),
      });

      // Show floating XP pop
      if (xp > 0) {
        toast(`+${xp} XP gained! ${res.becameMastered ? '🎉 Word Mastered!' : ''}`, 'sprout');
      }

      if (res.badgeUnlocked) {
        triggerConfettiCelebration(res.badgeUnlocked.name);
      }

      setTimeout(() => {
        WWState.drillIndex++;
        WWState.drillStep = 1;
        renderDrillStep();
      }, 900);
    } catch (err) {
      apiError(err);
      WWState.drillIndex++;
      WWState.drillStep = 1;
      renderDrillStep();
    }
  }

  // --------------------------------------------------------------------------
  // SCREEN 3: DRILL SESSION SUMMARY
  // --------------------------------------------------------------------------
  function renderDrillSummary(container) {
    const results = WWState.sessionResults;
    const totalCount = results.length;
    const correctCount = results.filter((r) => r.correct).length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const masteredInSession = results.filter((r) => r.becameMastered).length;

    container.innerHTML = `
      <div class="ww-drill-overlay" id="ww-drill-modal-wrap">
        <div class="ww-drill-modal" style="max-width:540px;text-align:center;padding:36px 30px">
          <div style="font-size:44px;margin-bottom:8px">🎉</div>
          <h2 style="font-size:24px;font-weight:800;color:var(--color-text);margin:0 0 6px">
            Drill Session Complete!
          </h2>
          <p style="color:var(--cream-dim);font-size:14px;margin:0 0 20px">
            Excellent work! Your spaced-repetition memory retention and pronunciation mastery have been updated.
          </p>

          <!-- Metrics Grid -->
          <div class="grid grid-3" style="gap:10px;margin-bottom:24px">
            <div class="card card-2 col" style="padding:14px;background:var(--color-surface-2)">
              <div style="font-size:11px;color:var(--cream-dim);font-weight:700">ACCURACY</div>
              <div style="font-size:24px;font-weight:800;color:${accuracy >= 80 ? '#10B981' : '#F59E0B'}">${accuracy}%</div>
              <div style="font-size:11px;color:var(--cream-dim)">${correctCount}/${totalCount} Words</div>
            </div>
            <div class="card card-2 col" style="padding:14px;background:var(--color-surface-2)">
              <div style="font-size:11px;color:var(--cream-dim);font-weight:700">XP EARNED</div>
              <div style="font-size:24px;font-weight:800;color:#6366F1">+${WWState.totalSessionXP}</div>
              <div style="font-size:11px;color:var(--cream-dim)">Student XP</div>
            </div>
            <div class="card card-2 col" style="padding:14px;background:var(--color-surface-2)">
              <div style="font-size:11px;color:var(--cream-dim);font-weight:700">MASTERED</div>
              <div style="font-size:24px;font-weight:800;color:#10B981">${masteredInSession}</div>
              <div style="font-size:11px;color:var(--cream-dim)">Permanently Retained</div>
            </div>
          </div>

          <!-- Words Practiced List -->
          <div class="col gap-xs" style="text-align:left;max-height:160px;overflow-y:auto;margin-bottom:24px">
            ${results.map((r) => `
              <div class="row gap-sm" style="align-items:center;padding:8px 12px;background:var(--color-surface-2);border-radius:8px">
                <span style="color:${r.correct ? '#10B981' : '#EF4444'};font-weight:800">${r.correct ? '✓' : '✗'}</span>
                <span style="font-weight:700;font-size:14px;flex:1">${esc(r.word)}</span>
                ${r.becameMastered ? '<span class="pill sprout" style="font-size:10px">Mastered</span>' : ''}
                <span class="pill" style="font-size:10.5px">+${r.xpAwarded} XP</span>
              </div>
            `).join('')}
          </div>

          <button class="btn btn-primary" id="btn-finish-drill" style="width:100%;padding:12px">
            Return to Weak Words Lab
          </button>
        </div>
      </div>
    `;

    if (masteredInSession > 0) {
      triggerConfettiCelebration();
    }

    $('#btn-finish-drill').onclick = async () => {
      closeDrillModal();
      await loadWeakWordsData();
      renderWeakWordsHub($('#ww-container') || $('#view-inner'));
    };
  }

  function closeDrillModal() {
    SpeechOutput.stop();
    if (SpeechInput.listening) SpeechInput.stop();
    const container = $('#ww-drill-container');
    if (container) container.innerHTML = '';
  }

  function triggerConfettiCelebration(badgeName) {
    if (badgeName) {
      toast(`🏆 Badge Unlocked: ${badgeName}!`, 'sprout');
    }
    const modalWrap = $('#ww-drill-modal-wrap');
    if (!modalWrap) return;

    const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'ww-confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 0.8}s`;
      modalWrap.appendChild(piece);
      setTimeout(() => piece.remove(), 3200);
    }
  }
})();

