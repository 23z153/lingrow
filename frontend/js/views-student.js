window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
var VIEW_RENDERERS = window.VIEW_RENDERERS;

/* ---------------------------- DASHBOARD ---------------------------- */
VIEW_RENDERERS['dashboard'] = async (mount) => {
  const [progress, attempts, notifs, dailyRes, dueWeakWords] = await Promise.all([
    Api.myProgress(),
    Api.myReadAloudAttempts(),
    Api.notifications(),
    Api.getDailyWord().catch(() => null),
    Api.getWeakWordsDue(5).catch(() => []),
  ]);

  const recent = attempts.slice(0, 4);
  const dailyWord = dailyRes?.dailyWord || null;
  const dueCount = Array.isArray(dueWeakWords) ? dueWeakWords.length : 0;

  // Real-time automatic check: hours >= 12 is Afternoon/Evening -> automatically show Afternoon Challenge quiz
  const currentHour = new Date().getHours();
  const isAfternoon = currentHour >= 12;
  let activeNotifTab = isAfternoon ? 'quiz' : 'word';

  mount.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="card"><div class="eyebrow">Level</div><h2 style="font-size:24px" class="stat-tile-level">${progress.level}</h2></div>
      <div class="card"><div class="eyebrow">Total XP</div><h2 style="font-size:24px" id="dash-total-xp" class="stat-tile-xp">${progress.xp}</h2></div>
      <div class="card"><div class="eyebrow">Streak</div><h2 style="font-size:24px" class="stat-tile-streak">${progress.streak} days</h2></div>
      <div class="card"><div class="eyebrow">Badges</div><h2 style="font-size:24px" class="stat-tile-badges">${progress.badges.filter(b=>b.unlocked).length}/${progress.badges.length}</h2></div>
    </div>

    <!-- Weak Words Lab Callout -->
    <div class="card row gap-md" style="margin-bottom:20px;align-items:center;background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08));border:1px solid rgba(129,140,248,0.25);border-radius:14px;padding:16px 20px">
      <div style="font-size:28px;line-height:1">🎯</div>
      <div class="col" style="flex:1">
        <div style="font-weight:700;font-size:15px;color:var(--color-text)">
          Weak Words Lab
          ${dueCount > 0 ? `<span class="pill coral" style="font-size:11px;margin-left:6px">${dueCount} due for review</span>` : `<span class="pill sprout" style="font-size:11px;margin-left:6px">All caught up</span>`}
        </div>
        <div style="font-size:13px;color:var(--cream-dim);margin-top:2px">
          ${dueCount > 0 ? `You have ${dueCount} words waiting for spaced-repetition pronunciation drills.` : 'Great job! No words currently due for review. Continue practice to build mastery.'}
        </div>
      </div>
      <button class="btn btn-primary btn-sm" data-nav="weakwords" style="white-space:nowrap">
        Practice my weak words (${dueCount} due) ${ICONS.arrowRight}
      </button>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="section-title">${ICONS.mic} Recent Read Aloud attempts</div>
        ${recent.length ? recent.map(a=>`
          <div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)">
            <div class="col" style="flex:1">
              <div style="font-weight:700;font-size:15px">${esc(a.passage?.title||'Passage')}</div>
              <div style="font-size:13px;color:var(--cream-faint);margin-top:2px">${timeAgo(a.createdAt)}</div>
            </div>
            <div class="pill" style="color:${scoreColor(a.accuracy)};border-color:transparent">${a.accuracy}% accuracy</div>
          </div>`).join('') : `<div class="empty-state">No attempts yet — head to Read Aloud to get started.</div>`}
        <button class="btn btn-primary btn-sm" style="margin-top:14px" data-nav="read-aloud">Practice now ${ICONS.arrowRight}</button>
      </div>

      <div class="card col gap-sm" style="position:relative">
        <div class="row gap-xs" style="margin-bottom:8px;border-bottom:1px solid var(--line);padding-bottom:10px;flex-wrap:wrap">
          <button class="pill" style="cursor:pointer" id="tab-btn-word">&#x1F4A1; Morning Word</button>
          <button class="pill" style="cursor:pointer" id="tab-btn-quiz">&#x26A1; Afternoon Challenge ${isAfternoon ? '<span class="badge-dot" style="background:var(--amber);margin-left:4px"></span>' : ''}</button>
          <button class="pill" style="cursor:pointer" id="tab-btn-activity">${ICONS.message} Activity</button>
        </div>

        <div id="notif-tab-content"></div>
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <div class="section-title">${ICONS.trophy} Badges</div>
      <div class="grid grid-4">
        ${progress.badges.map(b=>`
          <div class="badge-card ${b.unlocked?'':'locked'}">
            <div class="badge-ic">${ICONS.trophy}</div>
            <div style="font-weight:700;font-size:14.5px">${esc(b.name)}</div>
            <div style="font-size:13px;color:var(--cream-faint);margin-top:4px">${esc(b.description)}</div>
          </div>`).join('')}
      </div>
    </div>
  `;

  mount.querySelectorAll('[data-nav]').forEach(b=> b.onclick = ()=> setView(b.dataset.nav));

  const contentDiv = $('#notif-tab-content');
  const btnWord = $('#tab-btn-word');
  const btnQuiz = $('#tab-btn-quiz');
  const btnActivity = $('#tab-btn-activity');

  function renderNotifTab() {
    [btnWord, btnQuiz, btnActivity].forEach(b => {
      b.style.borderColor = 'var(--color-border)';
      b.style.background = 'var(--color-surface-2)';
      b.style.color = 'var(--color-text-muted)';
      b.style.fontWeight = '600';
    });

    const activeBtn = activeNotifTab === 'word' ? btnWord : activeNotifTab === 'quiz' ? btnQuiz : btnActivity;
    activeBtn.style.borderColor = 'var(--color-streak)';
    activeBtn.style.background = 'var(--color-streak)';
    activeBtn.style.color = 'var(--color-on-bright)';
    activeBtn.style.fontWeight = '800';

    if (activeNotifTab === 'word') {
      if (!dailyWord) {
        contentDiv.innerHTML = `<div class="empty-state" style="color:var(--color-text)">No daily word available today.</div>`;
        return;
      }
      contentDiv.innerHTML = `
        <div class="col gap-xs" style="color:var(--color-text)">
          <div class="row gap-sm" style="align-items:center">
            <h3 style="font-size:22px;font-weight:700;color:var(--color-text)">${esc(dailyWord.word)}</h3>
            <span class="pill voice" style="font-size:12px;color:var(--color-text);border-color:var(--color-border)">${esc(dailyWord.partOfSpeech)}</span>
            <div class="spacer"></div>
            <span class="pill" style="font-size:11.5px;color:var(--color-text);border-color:var(--color-border)">Today's Word</span>
          </div>
          <div style="font-size:15px;color:var(--color-text);line-height:1.55;margin-top:4px">
            <strong style="color:var(--color-text)">Meaning:</strong> ${esc(dailyWord.meaning)}
          </div>
          <div style="font-size:14.5px;color:var(--color-text);line-height:1.55;margin-top:6px;padding:9px 13px;background:var(--color-surface-2);border-left:3px solid var(--amber);border-radius:6px">
            <b style="color:var(--amber)">&#x1F4A1; Why It's Relevant:</b> <span style="color:var(--color-text)">${esc(dailyWord.relevancy)}</span>
          </div>
          <div style="font-size:13.5px;color:var(--color-text);margin-top:6px;font-style:italic">
            "${esc(dailyWord.example)}"
          </div>
        </div>
      `;
    } else if (activeNotifTab === 'quiz') {
      if (!dailyWord) {
        contentDiv.innerHTML = `<div class="empty-state" style="color:var(--color-text)">No quiz available today.</div>`;
        return;
      }

      const isAnswered = dailyRes?.answered;
      const userAnswer = dailyRes?.userAnswer;

      if (isAnswered) {
        const isCorrect = userAnswer.isCorrect;
        contentDiv.innerHTML = `
          <div class="col gap-xs" style="color:var(--color-text)">
            <div class="row gap-sm">
              <span class="pill ${isCorrect ? 'sprout' : 'coral'}">${isCorrect ? '&#x2714; Challenge Completed (+10 XP)' : '&#x2716; Completed'}</span>
            </div>
            <div style="font-size:15.5px;font-weight:700;margin-top:6px;color:var(--color-text)">${esc(dailyWord.question.prompt)}</div>
            <div style="font-size:14.5px;color:var(--color-text);margin-top:4px">
              Your answer: <b style="color:${isCorrect ? 'var(--emerald)' : 'var(--coral)'}">${esc(dailyWord.question.options[userAnswer.selectedOption])}</b>
              ${!isCorrect ? ` &middot; Correct: <b style="color:var(--emerald)">${esc(dailyWord.question.options[dailyWord.question.correctAnswer])}</b>` : ''}
            </div>
            <div style="font-size:13.5px;color:var(--color-text);margin-top:6px;font-style:italic">
              &#x1F4A1; ${esc(dailyWord.question.explanation)}
            </div>
          </div>
        `;
      } else {
        contentDiv.innerHTML = `
          <form id="afternoon-quiz-form" class="col gap-xs">
            <div style="font-size:12.5px;color:var(--amber);text-transform:uppercase;letter-spacing:0.8px;font-weight:700">&#x26A1; Afternoon Practice Challenge</div>
            <div style="font-size:15.5px;font-weight:700;margin-top:2px;color:var(--color-text)">${esc(dailyWord.question.prompt)}</div>

            <div class="col gap-xs" style="margin-top:6px">
              ${dailyWord.question.options.map((opt, idx) => `
                <label class="row gap-sm" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer;font-size:14.5px;color:var(--color-text)" id="quiz-opt-lbl-${idx}">
                  <input type="radio" name="daily_quiz_opt" value="${idx}" style="accent-color:var(--amber)">
                  <span style="color:var(--color-text)">${esc(opt)}</span>
                </label>
              `).join('')}
            </div>

            <button class="btn btn-primary btn-sm" type="submit" style="margin-top:10px;align-self:flex-start" id="quiz-sub-btn">
              Submit Answer ${ICONS.arrowRight}
            </button>
          </form>
        `;

        const qForm = $('#afternoon-quiz-form');
        if (qForm) {
          qForm.onsubmit = async (e) => {
            e.preventDefault();
            const checked = qForm.querySelector('input[name="daily_quiz_opt"]:checked');
            if (!checked) {
              toast('Please select an option to submit', 'amber');
              return;
            }

            const subBtn = $('#quiz-sub-btn');
            subBtn.disabled = true;

            try {
              const res = await Api.answerDailyWord(parseInt(checked.value, 10));
              if (res.isCorrect) {
                toast('+10 XP Earned for today\'s word challenge!', 'sprout');
                const xpEl = $('#dash-total-xp');
                if (xpEl) xpEl.textContent = Number(xpEl.textContent || 0) + 10;
                addStudentXP(10);
              } else {
                toast('Keep trying! Check the explanation.', 'amber');
              }
              dailyRes.answered = true;
              dailyRes.userAnswer = {
                selectedOption: parseInt(checked.value, 10),
                isCorrect: res.isCorrect,
              };
              renderNotifTab();
            } catch (err) {
              apiError(err);
            } finally {
              if (subBtn) subBtn.disabled = false;
            }
          };
        }
      }
    } else {
      btnActivity.style.borderColor = 'var(--sprout)';
      btnActivity.style.background = 'var(--purple-glow)';
      contentDiv.innerHTML = notifs.length ? notifs.slice(0, 5).map(n => `
        <div class="row gap-sm" style="padding:9px 0;border-bottom:1px solid var(--line)">
          <span class="badge-dot" style="background:${n.read ? 'var(--cream-faint)' : 'var(--sprout)'}"></span>
          <div style="flex:1;font-size:13px">${esc(n.text)}</div>
          <div style="font-size:11px;color:var(--cream-faint)">${timeAgo(n.createdAt)}</div>
        </div>`).join('') : `<div class="empty-state">You're all caught up.</div>`;
    }
  }

  btnWord.onclick = () => { activeNotifTab = 'word'; renderNotifTab(); };
  btnQuiz.onclick = () => { activeNotifTab = 'quiz'; renderNotifTab(); };
  btnActivity.onclick = () => { activeNotifTab = 'activity'; renderNotifTab(); };

  renderNotifTab();
};


/* ---------------------------- READ ALOUD ---------------------------- */
VIEW_RENDERERS['read-aloud'] = async (mount) => {
  const passages = await Api.passages();
  mount.innerHTML = `
    <div class="row" style="margin-bottom:14px;align-items:center">
      <div>
        <div class="section-title" style="margin-bottom:2px">${ICONS.mic} Read Aloud</div>
        <div style="font-size:14px;color:var(--cream-dim)">Practice pronunciation and fluency with short English passages.</div>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" id="refresh-passages-btn">${ICONS.activity} Show different passages</button>
    </div>
    <div class="grid grid-3" id="passage-grid"></div>
    <div id="practice-area" style="margin-top:20px"></div>
  `;
  const grid = $('#passage-grid');
  passages.forEach(p => {
    const readingTime = p.estimatedReadingTime || `~${Math.max(1, Math.ceil((p.wordCount || 75) / 130))} min read`;
    grid.appendChild(el(`
      <div class="card" style="cursor:pointer" data-id="${p._id}">
        <div class="row gap-sm" style="margin-bottom:10px;align-items:center">
          <span class="pill ${levelColor(p.level)}">${p.level}</span>
          <div class="spacer"></div>
          <span style="font-size:12px;color:var(--cream-faint)">${readingTime}</span>
        </div>
        <h3 style="font-size:17px;margin-bottom:6px">${esc(p.title)}</h3>
        <div style="font-size:13.5px;color:var(--cream-faint)">${p.wordCount || 75} words</div>
      </div>`));
  });
  grid.querySelectorAll('[data-id]').forEach(card => {
    card.onclick = () => openReadAloudPractice(passages.find(p => p._id === card.dataset.id));
  });

  $('#refresh-passages-btn').onclick = () => setView('read-aloud');
};

function openReadAloudPractice(passage){
  const area = $('#practice-area');
  area.innerHTML = `
    <div class="card">
      <div class="row" style="margin-bottom:14px">
        <h3>${esc(passage.title)}</h3>
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" id="listen-ref">${ICONS.play} Listen to reference</button>
      </div>
      <div class="passage-box" id="passage-text">${esc(passage.text)}</div>
      <div class="row gap-md" style="margin-top:22px">
        <button class="rec-btn" id="rec-btn">${ICONS.mic}</button>
        <div class="col" style="flex:1">
          <div id="rec-status" style="font-weight:700;font-size:15px">Tap to start recording</div>
          <div id="rec-transcript" style="font-size:14px;color:var(--cream-dim);margin-top:4px;min-height:20px"></div>
        </div>
      </div>
      <div id="result-area" style="margin-top:18px"></div>
    </div>
  `;
  $('#listen-ref').onclick = ()=> SpeechOutput.speak(passage.text);

  let startTime = null;
  const recBtn = $('#rec-btn');
  recBtn.onclick = ()=>{
    if (!SpeechInput.supported){ toast('Speech recognition is not supported in this browser — try Chrome or Edge.', 'coral'); return; }
    if (!SpeechInput.listening){
      recBtn.classList.add('on'); recBtn.innerHTML = ICONS.stop;
      $('#rec-status').textContent = 'Listening…';
      startTime = Date.now();
      SpeechInput.start({
        onResult: ({final, interim}) => { $('#rec-transcript').textContent = (final + ' ' + interim).trim(); },
        onEnd: async (finalTranscript) => {
          recBtn.classList.remove('on'); recBtn.innerHTML = ICONS.mic;
          $('#rec-status').textContent = 'Processing…';
          const seconds = (Date.now() - startTime) / 1000;
          if (!finalTranscript){ $('#rec-status').textContent = 'No speech captured — tap to try again.'; return; }
          try{
            const { attempt, xpGain } = await Api.submitReadAloud({ passageId: passage._id, transcript: finalTranscript, seconds });
            renderReadAloudResult(attempt, xpGain);
            $('#rec-status').textContent = 'Tap to record again';
            addStudentXP(xpGain);

            // Trigger dragon celebration animation if passed, or failure encouragement if unresolved
            if (window.DragonMascot && (attempt.score >= 50 || xpGain > 0)) {
              DragonMascot.celebrate({
                title: 'Speaking Volcano Conquered!',
                xp: xpGain || 20,
                message: `Fluency: ${Math.round(attempt.score)}%! Your oral flame burns brighter!`,
              });
            } else if (window.DragonMascot && window.DragonMascot.encourage) {
              DragonMascot.encourage({
                title: 'Volcano Speech Trial Unresolved',
                message: `Fluency: ${Math.round(attempt.score)}%. Your vocal flame was hesitant. Review the mispronounced words below and roar again!`,
                tip: 'Speak clearly into the microphone at a steady, rhythmic pace without pausing mid-clause.',
                buttonText: '🔥 Rekindle Vocal Flame & Retry',
              });
            }

            // Silently sync mispronounced or skipped words to Weak Words Lab
            const missedWords = (attempt.wordScores || [])
              .filter(w => w.status === 'bad' || w.status === 'ok')
              .map(w => w.word);
            if (missedWords.length > 0) {
              Api.postWeakWordsBulk({ words: missedWords, source: 'read-aloud' }).catch(() => {});
            }
          } catch(err){ apiError(err); $('#rec-status').textContent = 'Tap to try again'; }
        },
        onError: (e)=>{ recBtn.classList.remove('on'); recBtn.innerHTML = ICONS.mic; $('#rec-status').textContent = 'Mic error: '+e; },
      });
    } else {
      SpeechInput.stop();
    }
  };
}

function renderReadAloudResult(attempt, xpGain){
  const wordsHTML = attempt.wordScores.map((w, idx) => `<span class="word ${w.status}" style="animation-delay:${idx * 35}ms">${esc(w.word)}</span>`).join(' ');
  const pScore = attempt.pronunciationScore !== undefined ? attempt.pronunciationScore : attempt.accuracy;
  const sScore = attempt.sentenceFormationScore !== undefined ? attempt.sentenceFormationScore : 85;
  const aScore = attempt.accentScore !== undefined ? attempt.accentScore : 88;
  const aClass = attempt.accentClassification || 'Neutral Professional Accent';
  const pSugg = attempt.pronunciationSuggestions || 'Pronunciation clarity is good. Practice enunciating technical terms clearly.';
  const sSugg = attempt.sentenceFormationSuggestions || 'Sentence formation closely matches the reference structure.';
  const imps = attempt.improvements && attempt.improvements.length ? attempt.improvements : [
    'Practice repeating difficult technical words slowly before reading at normal pace.',
    'Listen to the reference audio clip to mirror natural sentence rhythm and intonation.'
  ];
  const trainingCards = attempt.accentTraining || [];
  const drills = attempt.accentDrills || [];

  $('#result-area').innerHTML = `
    <div class="grid grid-4" style="margin-bottom:16px">
      <div class="card card-2" style="border-top:3px solid var(--purple)">
        <div class="eyebrow">&#x1F3AF; Pronunciation Score</div>
        <h3 style="color:${scoreColor(pScore)};font-size:26px;margin-top:4px">${pScore}%</h3>
        <div style="font-size:12px;color:var(--cream-faint);margin-top:2px">Word Articulation & Clarity</div>
      </div>
      <div class="card card-2" style="border-top:3px solid var(--amber)">
        <div class="eyebrow">&#x270F;&#xFE0F; Sentence Formation</div>
        <h3 style="color:${scoreColor(sScore)};font-size:26px;margin-top:4px">${sScore}%</h3>
        <div style="font-size:12px;color:var(--cream-faint);margin-top:2px">Syntax & Grammar Structure</div>
      </div>
      <div class="card card-2" style="border-top:3px solid var(--voice-blue)">
        <div class="eyebrow">&#x1F399;&#xFE0F; Accent Alignment</div>
        <h3 style="color:${scoreColor(aScore)};font-size:26px;margin-top:4px">${aScore}%</h3>
        <div style="font-size:12px;color:var(--cream-faint);margin-top:2px">Neutral Clarity Rating</div>
      </div>
      <div class="card card-2" style="border-top:3px solid var(--emerald)">
        <div class="eyebrow">&#x26A1; Overall Fluency & Speed</div>
        <h3 style="color:${scoreColor(attempt.fluency)};font-size:26px;margin-top:4px">${attempt.fluency}% <span style="font-size:14px;font-weight:normal;color:var(--cream-dim)">(${attempt.pace} wpm)</span></h3>
        <div style="font-size:12px;color:var(--cream-faint);margin-top:2px">Pace & Flow Composite</div>
      </div>
    </div>

    <div class="card card-2" style="margin-bottom:16px;background:var(--color-surface-2);border-left:4px solid var(--purple)">
      <div class="row gap-sm" style="align-items:center">
        <div>
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.8px;color:var(--purple);font-weight:700">&#x1F399;&#xFE0F; Speaker Accent Classification</div>
          <div style="font-size:17px;font-weight:700;margin-top:2px;color:var(--color-text)">${esc(aClass)}</div>
        </div>
        <div class="spacer"></div>
        <span class="pill voice" style="font-size:12.5px">${aScore >= 85 ? '&#x2714; High Interview Alignment' : '&#x1F3AF; Training Available'}</span>
      </div>
    </div>

    <div class="card card-2" style="margin-bottom:16px">
      <div class="eyebrow">&#x1F50D; Word-Level Pronunciation Breakdown</div>
      <div class="passage-box" style="font-family:var(--font-body);font-size:15.5px;margin-top:8px">${wordsHTML}</div>
      <div class="row gap-md" style="margin-top:8px;font-size:12.5px;color:var(--cream-dim)">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--emerald);margin-right:4px"></span> Correct</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--amber);margin-right:4px"></span> Near Match</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--coral);margin-right:4px"></span> Mispronounced / Missed</span>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:16px">
      <div class="card card-2">
        <div class="section-title" style="font-size:15px;margin-bottom:6px">${ICONS.mic} Pronunciation Suggestions</div>
        <p style="font-size:14.5px;line-height:1.55;color:var(--cream)">${esc(pSugg)}</p>
      </div>
      <div class="card card-2">
        <div class="section-title" style="font-size:15px;margin-bottom:6px">${ICONS.message} Sentence Formation Suggestions</div>
        <p style="font-size:14.5px;line-height:1.55;color:var(--cream)">${esc(sSugg)}</p>
      </div>
    </div>

    ${trainingCards.length ? `
    <div class="card card-2" style="margin-bottom:16px;border:1px solid var(--color-border);background:var(--color-surface)">
      <div class="row gap-sm" style="margin-bottom:12px;align-items:center">
        <div class="section-title" style="font-size:16px;margin:0">&#x1F9E0; Targeted Phonetic & Accent Training Cards</div>
        <div class="spacer"></div>
        <span class="pill sprout" style="font-size:11.5px">Listen to correct audio & mouth tips</span>
      </div>
      <div class="grid grid-2 gap-sm" id="phonetic-cards-container">
        ${trainingCards.map(tc => `
          <div class="card card-2" style="background:var(--color-surface-2);border:1px solid var(--color-border)">
            <div class="row gap-sm" style="align-items:center;margin-bottom:6px">
              <span style="font-size:16px;font-weight:700;color:var(--amber)">"${esc(tc.word)}"</span>
              <span style="font-family:monospace;font-size:13px;background:var(--color-surface-2);padding:2px 8px;border-radius:4px;color:var(--color-text)">${esc(tc.phonetic)}</span>
              <div class="spacer"></div>
              <button class="btn btn-ghost btn-sm" style="padding:4px 8px;font-size:12px" data-speak-word="${esc(tc.word)}">${ICONS.play} Listen</button>
            </div>
            <div style="font-size:13px;color:var(--emerald);font-weight:600;margin-top:4px">&#x1F3AF; ${esc(tc.stressPattern)}</div>
            <div style="font-size:13px;color:var(--cream-dim);margin-top:4px;line-height:1.45">&#x1F4A1; <b>Mouth Position:</b> ${esc(tc.mouthPositionTip)}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${drills.length ? `
    <div class="card card-2" style="margin-bottom:16px">
      <div class="section-title" style="font-size:15px;margin-bottom:8px">&#x26A1; Recommended Accent & Intonation Drills</div>
      <ul style="padding-left:20px;margin:0;font-size:14px;line-height:1.7;color:var(--cream)">
        ${drills.map(d => `<li>${esc(d)}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="card card-2" style="background:var(--color-surface-2);border:1px solid var(--color-border)">
      <div class="section-title" style="font-size:15px;margin-bottom:8px">&#x1F4A1; Actionable Steps to Improve</div>
      <ul style="padding-left:20px;margin:0;font-size:14px;line-height:1.7;color:var(--cream)">
        ${imps.map(imp => `<li>${esc(imp)}</li>`).join('')}
      </ul>
      <div style="font-size:13.5px;color:var(--cream-dim);margin-top:12px;padding-top:8px;border-top:1px solid var(--line);font-style:italic">
        <b>Local AI Assessment:</b> ${esc(attempt.feedback)}
      </div>
    </div>

    <div class="row gap-sm" style="margin-top:16px;align-items:center">
      <div class="pill sprout" style="font-size:14px;font-weight:700">+${xpGain} XP earned</div>
      <div class="spacer"></div>
      <span class="pill voice" style="font-size:12px">&#x1F9E0; Evaluated by LinGrow Local AI Engine</span>
    </div>
  `;

  $('#result-area').querySelectorAll('[data-speak-word]').forEach(btn => {
    btn.onclick = () => SpeechOutput.speak(btn.dataset.speakWord);
  });
}

/* ---------------------------- VOCABULARY ---------------------------- */
VIEW_RENDERERS['vocabulary'] = async (mount) => {
  let currentStep = 1; // 1: Flashcards, 2: Assessment, 3: Speak It, 4: Summary
  let vocabData = null;
  let allWords = [];
  let dailyWords = [];
  let wrongWords = [];
  let sessionXPEarned = 0;
  let quizQuestions = [];
  let assessmentResults = {};

  try {
    const [allRes, dailyRes] = await Promise.all([
      Api.vocab().catch(() => []),
      Api.dailyVocab().catch(() => ({ dailyWords: [], quizQuestions: [] })),
    ]);
    allWords = Array.isArray(allRes) ? allRes : [];
    vocabData = dailyRes || { dailyWords: [], quizQuestions: [] };
    dailyWords = Array.isArray(vocabData.dailyWords) && vocabData.dailyWords.length
      ? vocabData.dailyWords
      : allWords.slice(0, 5);
  } catch (e) {
    allWords = [];
    dailyWords = [];
  }

  function getMasteredCount() {
    return allWords.filter(w => w.mastered).length;
  }

  function renderStepperHTML() {
    const step1Class = currentStep === 1 ? 'current' : (currentStep > 1 ? 'done' : 'upcoming');
    const step2Class = currentStep === 2 ? 'current' : (currentStep > 2 ? 'done' : 'upcoming');
    const step3Class = currentStep === 3 ? 'current' : (currentStep > 3 ? 'done' : 'upcoming');

    return `
      <div class="vocab-stepper-wrap" aria-label="Vocabulary Learning Steps">
        <div class="vocab-step-badge ${step1Class}">
          <span class="step-num">${currentStep > 1 ? '✓' : '1'}</span>
          <span class="step-title">Step 1: Flashcards</span>
        </div>
        <div class="vocab-step-line ${currentStep > 1 ? 'done' : ''}"></div>
        <div class="vocab-step-badge ${step2Class}">
          <span class="step-num">${currentStep > 2 ? '✓' : '2'}</span>
          <span class="step-title">Step 2: Assessment</span>
        </div>
        <div class="vocab-step-line ${currentStep > 2 ? 'done' : ''}"></div>
        <div class="vocab-step-badge ${step3Class}">
          <span class="step-num">${currentStep > 3 ? '✓' : '3'}</span>
          <span class="step-title">Step 3: Speak It</span>
        </div>
      </div>
    `;
  }

  function renderVocabMain() {
    mount.innerHTML = `
      <!-- Header -->
      <div class="row" style="margin-bottom:14px;align-items:center">
        <div>
          <div class="section-title" style="margin-bottom:2px">${ICONS.book} Daily Vocabulary</div>
          <div style="font-size:14px;color:var(--cream-dim)">Learn new words, then test yourself.</div>
        </div>
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" id="btn-vocab-weakwords" style="border:1px dashed var(--purple);color:var(--purple);font-size:12px;margin-right:8px" title="Open Weak Words Lab">
          ${ICONS.target} Practice My Weak Words
        </button>
        <span class="pill sprout" style="font-size:12.5px" id="vocab-mastered-pill">${getMasteredCount()} / ${allWords.length} Words Mastered</span>
      </div>

      <!-- Linear Stepper -->
      ${renderStepperHTML()}

      <!-- Step Content Area -->
      <div id="vocab-step-container"></div>
      <div id="vocab-transition-container"></div>
    `;

    const weakBtn = $('#btn-vocab-weakwords');
    if (weakBtn) weakBtn.onclick = () => setView('weakwords');

    const container = $('#vocab-step-container');
    if (currentStep === 1) renderStep1Flashcards(container);
    else if (currentStep === 2) renderStep2Assessment(container);
    else if (currentStep === 3) renderStep3Spoken(container);
    else if (currentStep === 4) renderStep4Summary(container);
  }

  // --- STEP 1: Interactive Flashcards Deck ---
  function renderStep1Flashcards(area) {
    if (!dailyWords.length) {
      area.innerHTML = `
        <div class="card empty-state" style="padding:40px;text-align:center">
          <div style="font-size:16px;font-weight:700;margin-bottom:6px">No vocabulary words available right now</div>
          <div style="font-size:13.5px;color:var(--cream-dim);margin-bottom:14px">Click below to refresh today's starter words.</div>
          <button class="btn btn-primary btn-sm" id="reload-daily-vocab-btn">Refresh Words</button>
        </div>
      `;
      $('#reload-daily-vocab-btn').onclick = () => setView('vocabulary');
      return;
    }

    let currentIndex = 0;
    let isFlipped = false;
    const readWordIds = new Set();
    let transitionScheduled = false;

    function renderCardView() {
      const currentWord = dailyWords[currentIndex];
      readWordIds.add(currentWord._id);
      const allRead = readWordIds.size === dailyWords.length;
      const progressPercent = Math.round(((currentIndex + 1) / dailyWords.length) * 100);

      // Auto-open assessment when all cards viewed
      if (allRead && !transitionScheduled) {
        transitionScheduled = true;
        showAutoAssessmentTransition();
      }

      area.innerHTML = `
        <div class="card card-2" style="max-width:680px;margin:0 auto">
          <!-- Card Progress Header -->
          <div class="row gap-sm" style="align-items:center;margin-bottom:12px">
            <span class="pill voice" style="font-size:11.5px">Word ${currentIndex + 1} of ${dailyWords.length}</span>
            <span class="pill sprout" style="font-size:11.5px">${readWordIds.size}/${dailyWords.length} Read</span>
            <div class="spacer"></div>
            <span style="font-size:12.5px;color:var(--cream-faint)">Flip card to learn usage</span>
          </div>
          <div style="background:var(--color-border);border-radius:6px;height:6px;overflow:hidden;margin-bottom:16px">
            <div style="background:var(--purple);height:100%;width:${progressPercent}%;transition:width 0.3s ease"></div>
          </div>

          <!-- Main Flashcard Box -->
          <div class="flashcard" id="deck-card-element" style="min-height:220px;cursor:pointer;margin-bottom:18px">
            ${renderFlashcardContent(currentWord, isFlipped)}
          </div>

          <!-- Card Controls -->
          <div class="row gap-sm" style="align-items:center;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" id="deck-prev-btn" ${currentIndex === 0 ? 'disabled' : ''}>⬅️ Previous</button>
            <button class="btn btn-ghost btn-sm" id="deck-flip-btn">🔄 ${isFlipped ? 'Show Word' : 'Flip for Meaning'}</button>
            <button class="btn btn-ghost btn-sm" id="deck-listen-btn">${ICONS.play} Listen</button>
            <div class="spacer"></div>
            ${allRead ? `
              <button class="btn btn-primary btn-sm" id="deck-go-assessment-btn" style="font-weight:700">
                ⚡ Proceed to Assessment (+10 XP)
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" id="deck-next-btn">Next Word ➡️</button>
            `}
          </div>
        </div>
      `;

      const cardEl = $('#deck-card-element');
      function toggleFlip() {
        isFlipped = !isFlipped;
        const inner = cardEl ? cardEl.querySelector('.flashcard-3d-inner') : null;
        if (inner) {
          inner.classList.toggle('flipped', isFlipped);
        } else if (cardEl) {
          cardEl.innerHTML = renderFlashcardContent(currentWord, isFlipped);
        }
        const flipBtn = $('#deck-flip-btn');
        if (flipBtn) flipBtn.innerHTML = `🔄 ${isFlipped ? 'Show Word' : 'Flip for Meaning'}`;
      }

      if (cardEl) {
        cardEl.onclick = toggleFlip;
      }

      $('#deck-flip-btn').onclick = toggleFlip;

      $('#deck-listen-btn').onclick = () => {
        SpeechOutput.speak(`${currentWord.word}. ${currentWord.meaning}`);
      };

      $('#deck-prev-btn').onclick = () => {
        if (currentIndex > 0) {
          currentIndex--;
          isFlipped = false;
          renderCardView();
        }
      };

      const nextBtn = $('#deck-next-btn');
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (currentIndex < dailyWords.length - 1) {
            currentIndex++;
            isFlipped = false;
            renderCardView();
          }
        };
      }

      const goAssessBtn = $('#deck-go-assessment-btn');
      if (goAssessBtn) {
        goAssessBtn.onclick = () => {
          currentStep = 2;
          renderVocabMain();
        };
      }
    }

    function renderFlashcardContent(w, flipped) {
      return `
        <div class="flashcard-3d-scene ${w.mastered ? 'mastered-leaf-glow' : ''}">
          <div class="flashcard-3d-inner ${flipped ? 'flipped' : ''}">
            <div class="flashcard-face flashcard-front col gap-xs" style="text-align:center;padding:28px 20px">
              <span class="pill voice" style="align-self:center;font-size:11.5px">${esc(w.partOfSpeech || 'word')}</span>
              <div style="font-size:36px;font-weight:800;letter-spacing:-0.5px;color:var(--color-text);margin:14px 0">${esc(w.word)}</div>
              <div style="font-size:13.5px;color:var(--cream-dim)">Tap card or flip button to reveal definition &amp; example</div>
              ${w.mastered ? '<div class="pill emerald" style="align-self:center;margin-top:10px;font-size:11px">🍃 Mastered Word</div>' : ''}
            </div>
            <div class="flashcard-face flashcard-back col gap-sm" style="padding:22px">
              <div class="row gap-xs" style="align-items:center">
                <span class="pill voice" style="font-size:11px">${esc(w.partOfSpeech || 'word')}</span>
                <span class="pill sprout" style="font-size:11px">${esc(w.level || 'Intermediate')}</span>
                <div class="spacer"></div>
                ${w.mastered ? `<span class="pill emerald" style="font-size:11px">${ICONS.check} Mastered</span>` : ''}
              </div>
              <div style="font-size:24px;font-weight:800;color:var(--purple);margin:4px 0">${esc(w.word)}</div>
              <div style="font-size:15px;line-height:1.55;color:var(--color-text)"><b>Definition:</b> ${esc(w.meaning)}</div>
              <div style="font-size:14px;line-height:1.5;color:var(--cream-dim);background:var(--panel-2);padding:10px 14px;border-radius:8px;border-left:3px solid var(--purple)">
                <i>"${esc(w.example)}"</i>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function showAutoAssessmentTransition() {
      const container = $('#vocab-transition-container');
      if (!container) return;

      container.innerHTML = `
        <div class="vocab-transition-overlay" id="vocab-transition-modal">
          <div class="vocab-transition-card">
            <div style="font-size:36px">🎉</div>
            <h3 style="font-size:22px;font-weight:800;color:var(--color-text);margin:0">Flashcards complete!</h3>
            <p style="font-size:14.5px;color:var(--cream-dim);line-height:1.55;margin:0">
              Starting your assessment in <b id="vocab-countdown" style="color:var(--purple);font-size:16px">1.5</b>s…
            </p>
            <button class="btn btn-ghost btn-sm" id="skip-vocab-transition-btn" style="color:var(--cream-faint);margin-top:4px">
              Skip for now
            </button>
          </div>
        </div>
      `;

      let timeLeft = 1.5;
      const countEl = $('#vocab-countdown');
      const interval = setInterval(() => {
        timeLeft -= 0.5;
        if (countEl) countEl.textContent = timeLeft > 0 ? timeLeft.toFixed(1) : '0';
        if (timeLeft <= 0) {
          clearInterval(interval);
          closeModal();
          currentStep = 2;
          renderVocabMain();
        }
      }, 500);

      function closeModal() {
        clearInterval(interval);
        if (container) container.innerHTML = '';
      }

      const skipBtn = $('#skip-vocab-transition-btn');
      if (skipBtn) {
        skipBtn.onclick = () => {
          closeModal();
          toast('You can proceed to Assessment whenever you are ready.', 'voice');
        };
      }
    }

    renderCardView();
  }

  // --- STEP 2: Varied Assessment Quiz ---
  async function renderStep2Assessment(area) {
    area.innerHTML = `
      <div class="card card-2" style="text-align:center;padding:40px;max-width:680px;margin:0 auto">
        <div style="font-size:24px;margin-bottom:10px">⚡ Preparing Assessment Quiz…</div>
        <div style="font-size:14px;color:var(--cream-dim)">Generating varied multi-format questions for your flashcard words.</div>
      </div>
    `;

    if (!quizQuestions.length) {
      try {
        const ids = dailyWords.map(w => w._id);
        const res = await Api.generateVocabQuiz(ids);
        quizQuestions = res.quizQuestions || [];
      } catch (e) {
        quizQuestions = [];
      }
    }

    if (!quizQuestions.length) {
      area.innerHTML = `
        <div class="card empty-state" style="padding:32px;text-align:center;max-width:680px;margin:0 auto">
          <div>No assessment questions could be generated.</div>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" id="back-to-step1-btn">Back to Flashcards</button>
        </div>
      `;
      $('#back-to-step1-btn').onclick = () => { currentStep = 1; renderVocabMain(); };
      return;
    }

    function renderQuizQuestions() {
      const answeredCount = Object.keys(assessmentResults).length;
      const totalCount = quizQuestions.length;
      const isAllAnswered = answeredCount === totalCount;
      const correctCount = Object.values(assessmentResults).filter(r => r.isCorrect).length;

      area.innerHTML = `
        <div class="col gap-md" style="max-width:680px;margin:0 auto">
          <!-- Quiz Progress Banner -->
          <div class="card card-2" style="border:1px solid var(--amber)">
            <div class="row gap-sm" style="align-items:center;margin-bottom:6px">
              <div style="font-size:16px;font-weight:700;color:var(--amber)">⚡ Step 2: Varied Assessment Quiz</div>
              <div class="spacer"></div>
              <span class="pill sprout" style="font-size:12px;font-weight:700">+10 XP per Correct Answer</span>
            </div>
            <div style="font-size:13.5px;color:var(--cream-dim);margin-bottom:10px">
              ${answeredCount} of ${totalCount} Questions Answered
            </div>
            <div style="background:var(--color-border);border-radius:6px;height:6px;overflow:hidden">
              <div style="background:var(--amber);height:100%;width:${Math.round((answeredCount / totalCount) * 100)}%;transition:width 0.3s ease"></div>
            </div>
          </div>

          <!-- All Answered Celebration Card -->
          ${isAllAnswered ? `
            <div class="card card-2" style="text-align:center;padding:24px;border:1px solid var(--color-success);background:var(--color-success-soft)">
              <div style="font-size:32px;margin-bottom:6px">🎉</div>
              <h3 style="font-size:20px;color:var(--color-text);margin-bottom:6px">
                Assessment Score: ${correctCount} / ${totalCount} Correct (${Math.round((correctCount / totalCount) * 100)}%)
              </h3>
              <div class="pill sprout" style="font-size:14px;padding:6px 16px;margin-bottom:14px">
                +${sessionXPEarned} XP Earned
              </div>
              <div class="row gap-sm" style="justify-content:center">
                <button class="btn btn-primary" id="proceed-to-step3-btn" style="font-weight:700">
                  ➡️ Continue to Step 3: Speak It (+15 XP)
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Questions List -->
          <div class="col gap-md">
            ${quizQuestions.map((q, qIdx) => {
              const res = assessmentResults[qIdx];
              return `
                <div class="card card-2" id="vqa-card-${qIdx}">
                  <div class="row gap-sm" style="margin-bottom:8px;align-items:center">
                    <span class="pill voice" style="font-size:11px;font-weight:700">${esc(q.typeLabel || 'Question')}</span>
                    <span class="pill sprout" style="font-size:11px">+10 XP</span>
                    <div class="spacer"></div>
                    <span style="font-size:12px;color:var(--cream-dim)">Question ${qIdx + 1} of ${totalCount}</span>
                  </div>

                  <h3 style="font-size:17px;margin-bottom:12px;color:var(--color-text);line-height:1.45">
                    ${esc(q.prompt).replace(/\n/g, '<br>')}
                  </h3>

                  <div class="col gap-xs">
                    ${q.options.map((opt, oIdx) => {
                      let optStyle = 'text-align:left;justify-content:flex-start;padding:12px 14px;border:1px solid var(--line);font-size:14px;border-radius:10px';
                      if (res) {
                        if (oIdx === q.correctIndex) {
                          optStyle += ';border:2px solid var(--color-success);background:var(--color-success-soft);color:var(--color-success-text);font-weight:700';
                        } else if (res.selectedIdx === oIdx && !res.isCorrect) {
                          optStyle += ';border:2px solid var(--color-error);background:var(--color-error-soft);color:var(--color-error-text)';
                        }
                      }
                      return `
                        <button class="btn btn-ghost" style="${optStyle}" data-qidx="${qIdx}" data-oidx="${oIdx}" ${res ? 'disabled' : ''}>
                          <span style="font-weight:700;margin-right:8px;color:var(--cream-dim)">${['A', 'B', 'C', 'D'][oIdx] || oIdx + 1}.</span>
                          <span>${esc(opt)}</span>
                        </button>
                      `;
                    }).join('')}
                  </div>

                  <!-- Explanation -->
                  <div id="vqa-feedback-${qIdx}" style="margin-top:10px">
                    ${res ? `
                      <div class="pill ${res.isCorrect ? 'sprout' : 'coral'}" style="font-size:13px;display:inline-flex;align-items:center;gap:6px">
                        ${res.isCorrect ? '✔ Correct!' : '✖ Incorrect.'} ${esc(res.explanation || q.explanation)}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Attach option click handlers
      area.querySelectorAll('[data-qidx]').forEach((btn) => {
        btn.onclick = async () => {
          const qIdx = parseInt(btn.dataset.qidx, 10);
          const oIdx = parseInt(btn.dataset.oidx, 10);
          if (assessmentResults[qIdx]) return;

          const q = quizQuestions[qIdx];
          const selectedOpt = q.options[oIdx];

          try {
            const res = await Api.submitVocabAssessment({
              wordId: q.wordId,
              selectedIndex: oIdx,
              correctIndex: q.correctIndex,
              selectedOption: selectedOpt,
              explanation: q.explanation,
            });

            const isCorrect = res.isCorrect;
            const xp = res.xpEarned || (isCorrect ? 10 : 0);
            if (isCorrect) {
              sessionXPEarned += xp;
              addStudentXP(xp);
              toast(`Correct! +${xp} XP`, 'sprout');
            } else {
              if (q.word) wrongWords.push(q.word);
            }

            assessmentResults[qIdx] = {
              selectedIdx: oIdx,
              isCorrect,
              xpEarned: xp,
              explanation: q.explanation || res.explanation,
            };

            const masteredPill = $('#vocab-mastered-pill');
            if (masteredPill && res.masteredCount !== undefined) {
              masteredPill.textContent = `${res.masteredCount} / ${allWords.length} Words Mastered`;
            }

            renderQuizQuestions();
          } catch (err) {
            apiError(err);
          }
        };
      });

      const proceedBtn = $('#proceed-to-step3-btn');
      if (proceedBtn) {
        proceedBtn.onclick = () => {
          currentStep = 3;
          renderVocabMain();
        };
      }
    }

    renderQuizQuestions();
  }

  // --- STEP 3: Spoken Usage AI ---
  function renderStep3Spoken(area) {
    // Focus on words answered incorrectly, or the 2 hardest words
    const uniqueWrongWords = [...new Set(wrongWords)];
    let targetWords = [];
    if (uniqueWrongWords.length) {
      targetWords = dailyWords.filter(w => uniqueWrongWords.includes(w.word));
    }
    if (!targetWords.length) {
      targetWords = dailyWords.slice(-2);
    }

    let wordIdx = 0;

    function renderSpokenCard() {
      const w = targetWords[wordIdx];
      area.innerHTML = `
        <div class="card card-2" style="max-width:680px;margin:0 auto">
          <div class="row gap-xs" style="margin-bottom:12px;align-items:center">
            <span class="pill voice">${esc(w.partOfSpeech || 'noun')}</span>
            <span class="pill sprout">${esc(w.level || 'Intermediate')}</span>
            <div class="spacer"></div>
            <span style="font-size:12.5px;color:var(--cream-dim)">Spoken Challenge ${wordIdx + 1} of ${targetWords.length}</span>
          </div>

          <h2 style="font-size:26px;color:var(--color-text);margin-bottom:6px">${esc(w.word)}</h2>
          <p style="font-size:14.5px;color:var(--color-text);margin-bottom:14px"><b>Meaning:</b> ${esc(w.meaning)}</p>

          <div class="passage-box" style="margin-bottom:16px">
            <div class="eyebrow" style="margin-bottom:4px">🎯 Speaking Task</div>
            Speak an original, natural English sentence aloud using the word "<b>${esc(w.word)}</b>".
          </div>

          <div class="row gap-md" style="margin-top:14px">
            <button class="rec-btn" id="spoken-rec-btn">${ICONS.mic}</button>
            <div class="col" style="flex:1">
              <div id="spoken-rec-status" style="font-weight:700;font-size:14.5px">Tap mic to speak your sentence</div>
              <div id="spoken-rec-transcript" style="font-size:13.5px;color:var(--cream-dim);margin-top:4px"></div>
            </div>
          </div>
          <div id="spoken-rec-result" style="margin-top:14px"></div>

          <!-- Bottom Actions -->
          <div class="row gap-sm" style="margin-top:20px;border-top:1px solid var(--line);padding-top:16px;align-items:center">
            <button class="btn btn-ghost btn-sm" id="spoken-prev-btn" ${wordIdx === 0 ? 'disabled' : ''}>⬅️ Previous</button>
            ${wordIdx < targetWords.length - 1 ? `
              <button class="btn btn-ghost btn-sm" id="spoken-next-btn">Next Word ➡️</button>
            ` : ''}
            <div class="spacer"></div>
            <button class="btn btn-primary" id="finish-vocab-flow-btn" style="font-weight:700">
              🏁 Finish Vocabulary Flow
            </button>
          </div>
        </div>
      `;

      const prevBtn = $('#spoken-prev-btn');
      if (prevBtn) prevBtn.onclick = () => { if (wordIdx > 0) { wordIdx--; renderSpokenCard(); } };
      const nextBtn = $('#spoken-next-btn');
      if (nextBtn) nextBtn.onclick = () => { if (wordIdx < targetWords.length - 1) { wordIdx++; renderSpokenCard(); } };

      const finishBtn = $('#finish-vocab-flow-btn');
      if (finishBtn) {
        finishBtn.onclick = () => {
          currentStep = 4;
          renderVocabMain();
        };
      }

      const recBtn = $('#spoken-rec-btn');
      if (recBtn) {
        recBtn.onclick = () => {
          if (!SpeechInput.supported) { toast('Speech recognition not supported in browser.', 'coral'); return; }
          if (!SpeechInput.listening) {
            recBtn.classList.add('on');
            $('#spoken-rec-status').textContent = 'Listening…';
            SpeechInput.start({
              onResult: ({ final, interim }) => { $('#spoken-rec-transcript').textContent = (final + ' ' + interim).trim(); },
              onEnd: async (finalTranscript) => {
                recBtn.classList.remove('on');
                if (!finalTranscript) { $('#spoken-rec-status').textContent = 'No speech captured — try again'; return; }
                $('#spoken-rec-status').textContent = 'Evaluating with AI…';
                try {
                  const res = await Api.submitVocabAssessment({ wordId: w._id, answerType: 'spoken', spokenSentence: finalTranscript });
                  const xp = res.xpEarned || (res.isCorrect ? 15 : 0);
                  if (res.isCorrect) {
                    sessionXPEarned += xp;
                    addStudentXP(xp);
                  }
                  $('#spoken-rec-result').innerHTML = `
                    <div class="pill ${res.isCorrect ? 'sprout' : 'coral'}" style="font-size:13.5px">
                      ${res.isCorrect ? '✔ Passed!' : '⚠️ Needs Practice'} (Score: ${res.score || 80}/100, +${xp} XP)
                    </div>
                    <div style="font-size:13.5px;color:var(--color-text);margin-top:8px">${esc(res.feedback || 'Good sentence structure.')}</div>
                  `;
                  $('#spoken-rec-status').textContent = 'Done!';
                } catch (err) { apiError(err); }
              },
              onError: (e) => { recBtn.classList.remove('on'); $('#spoken-rec-status').textContent = 'Mic error: ' + e; }
            });
          } else SpeechInput.stop();
        };
      }
    }

    renderSpokenCard();
  }

  // --- STEP 4: Summary Screen ---
  function renderStep4Summary(area) {
    const uniqueWrongWords = [...new Set(wrongWords)];
    area.innerHTML = `
      <div class="card card-2" style="max-width:680px;margin:0 auto;text-align:center;padding:36px 24px">
        <div style="font-size:48px;margin-bottom:12px">🏆</div>
        <h2 style="font-size:26px;font-weight:800;color:var(--color-text);margin-bottom:8px">Vocabulary Session Complete!</h2>
        <p style="font-size:14.5px;color:var(--cream-dim);line-height:1.6;margin-bottom:20px">
          You practiced today's vocabulary set across flashcards, varied retention assessments, and spoken sentence usage.
        </p>

        <div class="grid grid-2 gap-sm" style="margin-bottom:24px">
          <div class="card" style="background:var(--panel-2);text-align:center;padding:16px">
            <div class="eyebrow">Session XP Earned</div>
            <div style="font-size:28px;font-weight:800;color:var(--purple);margin-top:4px">+${sessionXPEarned} XP</div>
          </div>
          <div class="card" style="background:var(--panel-2);text-align:center;padding:16px">
            <div class="eyebrow">Words Mastered</div>
            <div style="font-size:28px;font-weight:800;color:var(--emerald);margin-top:4px">${getMasteredCount()} / ${allWords.length}</div>
          </div>
        </div>

        ${uniqueWrongWords.length ? `
          <div class="card" style="background:var(--panel-2);text-align:left;margin-bottom:24px;border-left:3px solid var(--coral)">
            <div class="eyebrow" style="color:var(--coral);margin-bottom:6px">📝 Words to Revise</div>
            <div class="row gap-xs" style="flex-wrap:wrap">
              ${uniqueWrongWords.map(w => `<span class="pill coral">${esc(w)}</span>`).join('')}
            </div>
          </div>
        ` : `
          <div class="pill sprout" style="font-size:14px;padding:8px 18px;margin-bottom:24px">
            🌟 Perfect retention across all words!
          </div>
        `}

        <div class="row gap-sm" style="justify-content:center">
          <button class="btn btn-ghost" id="vocab-restart-btn">🔄 Review Deck</button>
          <button class="btn btn-primary" id="vocab-goto-dashboard-btn">Go to Dashboard ➡️</button>
        </div>
      </div>
    `;

    $('#vocab-restart-btn').onclick = () => {
      currentStep = 1;
      assessmentResults = {};
      renderVocabMain();
    };

    $('#vocab-goto-dashboard-btn').onclick = () => {
      setView('dashboard');
    };
  }

  renderVocabMain();
};

/* ---------------------------- PEER & GD PRACTICE ---------------------------- */
VIEW_RENDERERS['peer'] = async (mount) => {
  let activeSession = null;
  let activeGdRoom = null;
  let pollInterval = null;
  let currentPeerTab = 'gd'; // 'gd' | '1-on-1'

  async function renderPeerMain() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

    const [sessionsRes, gdRoomsRes] = await Promise.all([
      Api.myPeerSessions().catch(() => []),
      Api.getGdRooms().catch(() => [])
    ]);

    const sessions = Array.isArray(sessionsRes) ? sessionsRes : [];
    const gdRooms = Array.isArray(gdRoomsRes) ? gdRoomsRes : [];

    mount.innerHTML = `
      <div class="row" style="margin-bottom:18px;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div class="section-title" style="margin-bottom:2px">${ICONS.users} Peer Practice Hub</div>
          <div style="font-size:14px;color:var(--color-text-muted)">Join teacher-led Group Discussion (GD) lobbies or matched 1-on-1 voice calls.</div>
        </div>
        <div class="spacer"></div>
        <!-- Segmented Tab Toggle Button -->
        <div class="role-tabs" style="max-width:440px;margin-bottom:0;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:99px;padding:4px;display:inline-flex;gap:4px">
          <button class="role-tab ${currentPeerTab === 'gd' ? 'active' : ''}" id="peer-tab-gd" type="button" style="border:none;outline:none;border-radius:99px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s ease">
            👥 Group Discussions (${gdRooms.length})
          </button>
          <button class="role-tab ${currentPeerTab === '1-on-1' ? 'active' : ''}" id="peer-tab-1on1" type="button" style="border:none;outline:none;border-radius:99px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s ease">
            🎯 1-on-1 Practice
          </button>
        </div>
      </div>

      <!-- Teacher-Led GD Rooms Section -->
      <div id="peer-gd-section" style="${currentPeerTab === 'gd' ? '' : 'display:none;'}">
        <div class="card card-2" style="margin-bottom:24px;border:1px solid var(--color-border);background:var(--color-surface);padding:22px">
          <div class="row gap-sm" style="margin-bottom:12px;align-items:center">
            <div>
              <div style="font-size:17px;font-weight:700;color:var(--color-text)">👥 Teacher-Led Group Discussion (GD) Rooms (${gdRooms.length})</div>
              <div style="font-size:13.5px;color:var(--color-text-muted);margin-top:2px">
                Teachers create GD rooms with specified student limits. Enter the lobby, participate in live speech, and receive a comprehensive AI evaluation report.
              </div>
            </div>
            <div class="spacer"></div>
            <button class="btn btn-ghost btn-sm" id="refresh-gd-rooms-btn">🔄 Refresh Rooms</button>
          </div>

          <div class="grid grid-2 gap-md" id="gd-rooms-container" style="margin-top:14px">
            ${gdRooms.map((r) => {
              const currentCount = r.participants?.length || 0;
              const isFull = currentCount >= r.maxStudents;
              const userJoined = (r.participants || []).some(p => (p._id || p) === (S.user?._id || S.user?.id));
              let statusPill = `<span class="pill amber">⌛ Lobby Open</span>`;
              if (r.status === 'IN_PROGRESS') statusPill = `<span class="pill sprout">🔴 Live In-Progress</span>`;
              else if (r.status === 'COMPLETED') statusPill = `<span class="pill voice">✓ Completed</span>`;

              return `
                <div class="card card-2" style="background:var(--color-surface);border:1px solid var(--color-border);padding:18px">
                  <div class="row gap-sm" style="margin-bottom:8px">
                    <span class="pill voice">Max: ${r.maxStudents} Students</span>
                    ${statusPill}
                  </div>
                  <h3 style="font-size:18px;margin-bottom:6px;color:var(--color-text);line-height:1.35">${esc(r.topic)}</h3>
                  <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:12px">
                    Host: <b>${esc(r.teacher?.name || 'Teacher')}</b> &middot; Target: ${r.targetDurationMinutes || 5} Mins
                  </div>
                  <div class="row gap-sm" style="align-items:center">
                    <div style="font-size:13.5px;font-weight:700;color:var(--color-text)">👥 ${currentCount} / ${r.maxStudents} Joined</div>
                    <div class="spacer"></div>
                    ${r.status === 'COMPLETED' ? `
                      <button class="btn btn-ghost btn-sm" data-gd-report="${r._id}">📊 View AI Report</button>
                    ` : userJoined ? `
                      <button class="btn btn-primary btn-sm" data-gd-enter="${r._id}" class="btn-action" style="background:var(--color-success);color:var(--color-on-bright);font-weight:700">➡️ Enter Room</button>
                    ` : `
                      <button class="btn btn-primary btn-sm" data-gd-join="${r._id}" ${isFull ? 'disabled' : ''} style="font-weight:700">
                        ${isFull ? 'Room Full' : '🚪 Join Lobby'}
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          ${!gdRooms.length ? `<div class="empty-state" style="padding:28px 16px;text-align:center">No teacher GD rooms created yet. Ask your teacher to open a GD room lobby!</div>` : ''}
        </div>
      </div>

      <!-- 1-on-1 Peer Match Section -->
      <div id="peer-1on1-section" style="${currentPeerTab === '1-on-1' ? '' : 'display:none;'}">
        <div class="row" style="margin-bottom:14px;align-items:center">
          <div>
            <div style="font-size:17px;font-weight:700;color:var(--color-text)">🎯 1-on-1 Voice-Anonymized Practice</div>
            <div style="font-size:13.5px;color:var(--color-text-muted);margin-top:2px">
              Practice spontaneous conversational English with an anonymized classmate.
            </div>
          </div>
          <div class="spacer"></div>
          <span class="pill voice" style="font-size:12.5px">${ICONS.mic} Voice Anonymization Active</span>
        </div>

        <div class="grid grid-2 gap-md" id="peer-1on1-grid" style="margin-bottom:20px">
          <div class="card" id="peer-match-card" style="background:var(--color-surface);border:1px solid var(--color-border);padding:22px">
            <div class="section-title" style="margin-bottom:10px">${ICONS.target} Find Practice Partner</div>
            <div class="col gap-xs" style="margin-bottom:16px">
              <label class="field-label" style="font-size:13px;font-weight:600;color:var(--color-text)">Topic for Discussion</label>
              <select id="peer-topic-select" class="input-field" style="background:var(--color-surface-2);color:var(--color-text);padding:10px 12px;border-radius:8px;border:1px solid var(--color-border);font-size:14px">
                <option value="Everyday Life &amp; Personal Hobbies">Everyday Life &amp; Personal Hobbies</option>
                <option value="Campus Life &amp; Student Activities">Campus Life &amp; Student Activities</option>
                <option value="Placement Interview Practice">Placement Interview Mock Q&amp;A</option>
                <option value="General Free Speech">General Free Conversation</option>
              </select>
            </div>
            <button class="btn btn-primary" id="start-peer-btn" style="width:100%;font-weight:700">
              ${ICONS.users} Find Peer &amp; Start 1-on-1 Call
            </button>
          </div>

          <div class="card" style="background:var(--color-surface);border:1px solid var(--color-border);padding:22px">
            <div class="section-title" style="margin-bottom:10px">${ICONS.activity} Your Recent Peer Sessions</div>
            ${sessions && sessions.length ? `
              <div class="col gap-xs" style="max-height:220px;overflow-y:auto">
                ${sessions.map(s => `
                  <div class="row gap-sm" style="padding:10px 0;border-bottom:1px solid var(--color-border);align-items:center">
                    <div>
                      <div style="font-weight:700;font-size:14px;color:var(--color-text)">${esc(s.topic || 'Peer Practice Call')}</div>
                      <div style="font-size:12px;color:var(--color-text-muted)">Duration: ${s.durationSeconds || 120}s &middot; ${timeAgo(s.createdAt)}</div>
                    </div>
                    <div class="spacer"></div>
                    <span class="pill sprout" style="font-size:11px">Completed</span>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="empty-state" style="padding:24px 12px;text-align:center">No peer practice calls yet. Tap "Find Peer" to begin!</div>`}
          </div>
        </div>

        <div id="peer-room-area"></div>
      </div>
    `;

    // Tab toggle logic
    const tabGd = $('#peer-tab-gd');
    const tab1on1 = $('#peer-tab-1on1');
    const gdSection = $('#peer-gd-section');
    const on1Section = $('#peer-1on1-section');

    function switchTab(target) {
      currentPeerTab = target;
      if (target === 'gd') {
        tabGd?.classList.add('active');
        tab1on1?.classList.remove('active');
        if (gdSection) gdSection.style.display = 'block';
        if (on1Section) on1Section.style.display = 'none';
      } else {
        tab1on1?.classList.add('active');
        tabGd?.classList.remove('active');
        if (gdSection) gdSection.style.display = 'none';
        if (on1Section) on1Section.style.display = 'block';
      }
    }

    if (tabGd) tabGd.onclick = () => switchTab('gd');
    if (tab1on1) tab1on1.onclick = () => switchTab('1-on-1');

    // Attach Refresh & GD Action Listeners
    const refreshBtn = $('#refresh-gd-rooms-btn');
    if (refreshBtn) refreshBtn.onclick = () => renderPeerMain();

    mount.querySelectorAll('[data-gd-join], [data-gd-enter]').forEach((btn) => {
      btn.onclick = async () => {
        const roomId = btn.dataset.gdJoin || btn.dataset.gdEnter;
        try {
          const room = await Api.joinGdRoom(roomId);
          toast(`Joined GD Room Lobby: "${room.topic}"`, 'sprout');
          openGdLobbyOrRoom(room);
        } catch (err) {
          apiError(err);
        }
      };
    });

    mount.querySelectorAll('[data-gd-report]').forEach((btn) => {
      btn.onclick = async () => {
        try {
          const room = await Api.getGdReport(btn.dataset.gdReport);
          renderStudentGdReport(room);
        } catch (err) {
          apiError(err);
        }
      };
    });

    // 1-on-1 Match
    const startBtn = $('#start-peer-btn');
    const matchCard = $('#peer-match-card');
    if (startBtn) {
      startBtn.onclick = async () => {
        const topic = $('#peer-topic-select').value;
        startBtn.disabled = true;
        matchCard.innerHTML = `
          <div class="col gap-sm" style="text-align:center;padding:20px 0;align-items:center">
            <div class="badge-ic" style="font-size:32px;animation:pulse 1.5s infinite">${ICONS.users}</div>
            <h3 style="font-size:18px">Searching for an anonymized peer partner…</h3>
            <div style="font-size:13.5px;color:var(--cream-dim)">Topic: <b>${esc(topic)}</b></div>
            <div style="font-size:12.5px;color:var(--purple);margin-top:4px">&#x1F9E0; Applying Sub-Band Voice Anonymization Filter</div>
            <button class="btn btn-ghost btn-sm" id="cancel-queue-btn" style="margin-top:12px">Cancel Queue</button>
          </div>
        `;
        $('#cancel-queue-btn').onclick = async () => {
          try { await Api.leavePeerQueue(); } catch (e) {}
          renderPeerMain();
        };

        try {
          const res = await Api.joinPeerQueue(topic);
          if (res.matched && res.session) {
            openPeerRoom(res.session, topic);
          } else {
            setTimeout(async () => {
              const demoSession = {
                _id: 'demo_peer_' + Date.now(),
                topic: topic,
                roomToken: 'room_' + Math.random().toString(36).slice(2),
                participants: ['Peer Student', S.user?.name || 'You'],
                startedAt: new Date(),
              };
              openPeerRoom(demoSession, topic);
            }, 2500);
          }
        } catch (err) {
          apiError(err);
          renderPeerMain();
        }
      };
    }
  }

  function openGdLobbyOrRoom(room) {
    activeGdRoom = room;
    if (room.status === 'LOBBY') {
      renderGdLobbyView(mount, room);
    } else if (room.status === 'IN_PROGRESS') {
      renderGdActiveRoomView(mount, room);
    } else if (room.status === 'COMPLETED') {
      renderStudentGdReport(room);
    }
  }

  function renderGdLobbyView(container, room) {
    if (pollInterval) clearInterval(pollInterval);

    container.innerHTML = `
      <div style="max-width: 860px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 16px; animation: fadeIn 0.25s ease;">
        <div class="row" style="align-items: center;">
          <button class="btn btn-ghost btn-sm" id="leave-gd-lobby-btn">⬅️ Back to Rooms</button>
          <div class="spacer"></div>
          <span class="pill amber" style="font-weight: 700;">⌛ Lobby Open</span>
          <span class="pill voice" style="font-size: 12px;">Host: ${esc(room.teacher?.name || 'Teacher')}</span>
        </div>

        <div class="card" style="border: 2px solid var(--color-streak); background: var(--color-surface); padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <div class="eyebrow" style="color: var(--amber); font-weight: 700;">GROUP DISCUSSION TOPIC</div>
          <h2 style="font-size: 24px; font-weight: 800; margin: 6px 0 10px; color: var(--color-text); line-height: 1.35;">
            "${esc(room.topic)}"
          </h2>
          <div style="font-size: 13.5px; color: var(--color-text-muted);">
            Discussion target: <b>${room.targetDurationMinutes || 5} minutes</b> &middot; Room capacity: <b>${room.maxStudents} students</b>
          </div>

          <div class="card card-2" style="margin: 20px 0; background: var(--color-surface-2); text-align: center; padding: 28px 20px; border-radius: 14px; border: 1px solid var(--color-border);">
            <div style="font-size: 42px; margin-bottom: 8px;">👥</div>
            <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 6px; color: var(--color-text);">
              ${room.participants?.length || 0} of ${room.maxStudents} Students in Lobby
            </h3>
            <div style="font-size: 14.5px; color: var(--amber); font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--amber); animation: pulse 1.2s infinite;"></span>
              Waiting for teacher to start the live discussion session...
            </div>
          </div>

          <div class="eyebrow" style="margin-bottom: 10px;">Joined Classmates</div>
          <div class="grid grid-3 gap-sm" style="margin-bottom: 18px;">
            ${(room.participants || []).map((p) => {
              const isMe = (p._id || p) === (S.user?._id || S.user?.id);
              return `
                <div class="card card-2 row gap-sm" style="align-items: center; padding: 12px 14px; background: var(--color-surface-2); ${isMe ? 'border: 1.5px solid var(--color-primary); background: var(--color-primary-soft);' : 'border: 1px solid var(--color-border);'}">
                  ${avatarHTML(p.name || 'Student', 32)}
                  <div style="font-size: 14px; font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${esc(p.name || 'Student')}${isMe ? ' (You)' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="font-size: 13px; color: var(--color-text-muted); text-align: center; background: rgba(245, 158, 11, 0.08); padding: 12px 16px; border-radius: 8px; border-left: 3px solid var(--amber);">
            💡 <b>Pro Tip:</b> Prepare 2–3 structured bullet points about <i>"${esc(room.topic)}"</i> while waiting in the lobby!
          </div>
        </div>
      </div>
    `;

    $('#leave-gd-lobby-btn').onclick = async () => {
      if (pollInterval) clearInterval(pollInterval);
      try { await Api.leaveGdRoom(room._id); } catch (e) {}
      renderPeerMain();
    };

    // Poll room status every 2.5s to transition when teacher starts
    pollInterval = setInterval(async () => {
      try {
        const fresh = await Api.getGdRoom(room._id);
        if (fresh.status === 'IN_PROGRESS') {
          clearInterval(pollInterval);
          pollInterval = null;
          toast('Teacher started the Group Discussion! Entering room now...', 'sprout');
          renderGdActiveRoomView(container, fresh);
        } else if (fresh.participants?.length !== room.participants?.length) {
          room = fresh;
          renderGdLobbyView(container, room);
        }
      } catch (e) {}
    }, 2500);
  }

  function renderGdActiveRoomView(area, room) {
    if (pollInterval) clearInterval(pollInterval);
    const container = area || mount;

    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 16px; animation: fadeIn 0.25s ease;">
        <!-- Top Navigation Bar -->
        <div class="row" style="align-items: center; gap: 10px;">
          <button class="btn btn-ghost btn-sm" id="gd-back-rooms-btn">⬅️ Back to GD Rooms</button>
          <div class="spacer"></div>
          <span class="pill sprout" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--emerald); animation: pulse 1.2s infinite;"></span>
            Live GD In-Progress
          </span>
          <button class="btn btn-primary btn-sm" id="end-student-gd-btn" style="background: var(--color-streak); color: var(--color-on-bright); font-weight: 700;">
            ⏹️ Complete &amp; View Report (+25 XP)
          </button>
        </div>

        <!-- Topic & Room Meta Card -->
        <div class="card" style="border: 2px solid var(--color-success); background: var(--color-surface); padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <div class="eyebrow" style="color: var(--emerald); font-weight: 700;">DISCUSSION TOPIC</div>
          <h2 style="font-size: 24px; font-weight: 800; margin: 6px 0 10px; color: var(--color-text); line-height: 1.35;">
            "${esc(room.topic)}"
          </h2>
          <div class="row gap-md" style="font-size: 13.5px; color: var(--color-text-muted); align-items: center; flex-wrap: wrap;">
            <div>Host: <b>${esc(room.teacher?.name || 'Teacher')}</b></div>
            <div>&middot;</div>
            <div>Target: <b>${room.targetDurationMinutes || 5} Mins</b></div>
            <div class="spacer"></div>
            <div class="row gap-xs" style="align-items: center;">
              <span style="font-size: 12px; font-weight: 600; color: var(--color-text-muted); margin-right: 4px;">In room:</span>
              ${(room.participants || []).map((p) => {
                const isMe = (p._id || p) === (S.user?._id || S.user?.id);
                return `<span class="pill voice" style="font-size: 11.5px; ${isMe ? 'border: 1.5px solid var(--color-primary); font-weight: 700;' : ''}">${esc(p.name || 'Student')}${isMe ? ' (You)' : ''}</span>`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Live Transcripts Feed Card -->
        <div class="card card-2" style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 18px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <div class="row" style="align-items: center; margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 700; color: var(--color-text); display: flex; align-items: center; gap: 8px;">
              <span>💬 Live Speech Transcription Feed</span>
            </div>
            <div class="spacer"></div>
            <span id="gd-point-count" class="pill voice" style="font-size: 12px; font-weight: 600;">
              ${(room.transcripts || []).length} points recorded
            </span>
          </div>

          <div id="gd-transcript-feed" style="min-height: 280px; max-height: 420px; overflow-y: auto; background: var(--color-surface-2); padding: 16px; border-radius: 12px; border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 14px;">
            <!-- Injected by renderTranscripts -->
          </div>
        </div>

        <!-- Speech Mic Input Card -->
        <div class="card card-2" style="background: var(--color-surface); border: 1.5px solid var(--color-primary); padding: 16px 20px; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.08);">
          <div class="row gap-md" style="align-items: center;">
            <button class="rec-btn" id="gd-mic-btn" style="width: 52px; height: 52px; flex-shrink: 0;" title="Tap to speak your point">${ICONS.mic}</button>
            <div class="col" style="flex: 1; min-width: 0;">
              <div id="gd-mic-status" style="font-weight: 700; font-size: 15px; color: var(--color-text);">
                Tap mic to speak your point into the GD room
              </div>
              <div id="gd-mic-transcript" style="font-size: 14px; color: var(--color-primary); font-weight: 500; margin-top: 3px; min-height: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
            </div>
            <button class="btn btn-primary btn-sm" id="gd-send-now-btn" style="display: none; font-weight: 700; padding: 10px 18px; border-radius: 10px;">
              📤 Send Point
            </button>
          </div>
        </div>
      </div>
    `;

    function renderTranscripts(transcripts) {
      const feed = $('#gd-transcript-feed');
      const countEl = $('#gd-point-count');
      if (!feed) return;
      const list = transcripts || [];
      if (countEl) countEl.textContent = `${list.length} point${list.length === 1 ? '' : 's'} recorded`;

      if (!list.length) {
        feed.innerHTML = `
          <div style="margin: auto; text-align: center; color: var(--color-text-muted); padding: 36px 16px;">
            <div style="font-size: 38px; margin-bottom: 8px;">🎙️</div>
            <div style="font-weight: 600; font-size: 15px; color: var(--color-text);">No speech recorded yet</div>
            <div style="font-size: 13px; margin-top: 4px;">Tap the microphone below to contribute your opening argument!</div>
          </div>
        `;
        return;
      }

      const myId = S.user?._id || S.user?.id;
      const myName = (S.user?.name || '').trim().toLowerCase();

      feed.innerHTML = list.map((t) => {
        const isMe = (t.student && (t.student === myId || t.student?._id === myId)) ||
                     (t.studentName && t.studentName.trim().toLowerCase() === myName);
        const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        if (isMe) {
          return `
            <div class="msg-wrap user" style="align-self: flex-end; align-items: flex-end; max-width: 82%;">
              <div style="font-size: 12px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">
                <span>You</span>
                ${timeStr ? `<span style="font-size: 11px; opacity: 0.7;">${timeStr}</span>` : ''}
              </div>
              <div class="msg user" style="background: var(--purple); color: #FFFFFF; border-radius: 16px 16px 4px 16px; padding: 12px 18px; font-size: 14.5px; line-height: 1.55; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.22); word-break: break-word;">
                ${esc(t.text)}
              </div>
            </div>
          `;
        } else {
          return `
            <div class="msg-wrap ai" style="align-self: flex-start; align-items: flex-start; max-width: 82%;">
              <div style="font-size: 12px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                ${avatarHTML(t.studentName || 'Student', 22)}
                <span style="color: var(--amber); font-weight: 700;">${esc(t.studentName || 'Classmate')}</span>
                ${timeStr ? `<span style="font-size: 11px; opacity: 0.7;">${timeStr}</span>` : ''}
              </div>
              <div style="display: flex; align-items: flex-end; gap: 8px;">
                <div class="msg ai" style="background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 16px 16px 16px 4px; padding: 12px 18px; font-size: 14.5px; line-height: 1.55; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05); word-break: break-word;">
                  ${esc(t.text)}
                </div>
                <button class="msg-read-btn gd-read-btn" data-speak-text="${esc(t.text)}" title="Listen to classmate's point" aria-label="Listen aloud" style="padding: 7px 10px; font-size: 14px; border-radius: 10px; border: 1px solid var(--color-border); background: var(--color-surface); cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;">
                  🔊
                </button>
              </div>
            </div>
          `;
        }
      }).join('');

      // Wire up read-aloud buttons
      feed.querySelectorAll('.gd-read-btn').forEach((btn) => {
        btn.onclick = () => {
          const textToSpeak = btn.dataset.speakText;
          if (btn.classList.contains('speaking')) {
            SpeechOutput.stop();
            btn.classList.remove('speaking');
            btn.textContent = '🔊';
            return;
          }
          feed.querySelectorAll('.gd-read-btn.speaking').forEach((b) => {
            b.classList.remove('speaking');
            b.textContent = '🔊';
          });
          btn.classList.add('speaking');
          btn.textContent = '⏹️';
          SpeechOutput.speak(textToSpeak, {
            onEnd: () => {
              btn.classList.remove('speaking');
              btn.textContent = '🔊';
            },
            onError: () => {
              btn.classList.remove('speaking');
              btn.textContent = '🔊';
            }
          });
        };
      });

      feed.scrollTop = feed.scrollHeight;
    }

    // Immediately render current transcripts
    renderTranscripts(room.transcripts);

    // Back to Rooms button
    const backRoomsBtn = $('#gd-back-rooms-btn');
    if (backRoomsBtn) {
      backRoomsBtn.onclick = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        SpeechOutput.stop();
        if (SpeechInput.listening) SpeechInput.stop();
        renderPeerMain();
      };
    }

    const micBtn = $('#gd-mic-btn');
    const sendNowBtn = $('#gd-send-now-btn');
    let silenceTimer = null;
    let latestTranscript = '';

    function resetSilenceTimer() {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (SpeechInput.listening && latestTranscript.trim()) {
          SpeechInput.stop();
        }
      }, 1500); // 1.5s of silence auto-sends speech to room
    }

    if (sendNowBtn) {
      sendNowBtn.onclick = () => {
        if (SpeechInput.listening) SpeechInput.stop();
      };
    }

    micBtn.onclick = () => {
      if (!SpeechInput.supported) { toast('Speech recognition not supported in browser.', 'coral'); return; }
      if (!SpeechInput.listening) {
        micBtn.classList.add('on');
        $('#gd-mic-status').textContent = 'Listening... (Speak your point; stops & sends on pause or tap)';
        latestTranscript = '';
        SpeechInput.start({
          onResult: ({ final, interim }) => {
            latestTranscript = (final + ' ' + interim).trim();
            $('#gd-mic-transcript').textContent = latestTranscript;
            if (sendNowBtn) sendNowBtn.style.display = latestTranscript ? 'inline-flex' : 'none';
            resetSilenceTimer();
          },
          onEnd: async (finalTranscript) => {
            if (silenceTimer) clearTimeout(silenceTimer);
            micBtn.classList.remove('on');
            if (sendNowBtn) sendNowBtn.style.display = 'none';
            const textToSend = (finalTranscript || latestTranscript || '').trim();
            latestTranscript = '';
            $('#gd-mic-transcript').textContent = '';

            if (textToSend) {
              $('#gd-mic-status').textContent = '⚡ Transmitting point to room...';
              try {
                const res = await Api.submitGdSpeech(room._id, textToSend);
                toast('Point posted to GD feed!', 'sprout');
                if (res.transcripts) {
                  room.transcripts = res.transcripts;
                  renderTranscripts(room.transcripts);
                }
                $('#gd-mic-status').textContent = 'Tap mic to speak another point';
              } catch (err) {
                apiError(err);
                $('#gd-mic-status').textContent = 'Tap mic to speak your point into the GD room';
              }
            } else {
              $('#gd-mic-status').textContent = 'Tap mic to speak your point into the GD room';
            }
          },
          onError: (e) => {
            if (silenceTimer) clearTimeout(silenceTimer);
            micBtn.classList.remove('on');
            if (sendNowBtn) sendNowBtn.style.display = 'none';
            $('#gd-mic-status').textContent = 'Mic error: ' + e;
          }
        });
      } else {
        SpeechInput.stop();
      }
    };

    $('#end-student-gd-btn').onclick = async () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      SpeechOutput.stop();
      if (SpeechInput.listening) SpeechInput.stop();
      const btn = $('#end-student-gd-btn');
      btn.disabled = true;
      btn.textContent = 'Analyzing Speech with AI...';
      try {
        const finished = await Api.endGdRoom(room._id);
        toast('GD session completed! AI speech report generated (+25 XP)', 'sprout');
        addStudentXP(25);
        renderStudentGdReport(finished);
      } catch (err) {
        apiError(err);
        btn.disabled = false;
      }
    };

    // Live transcript sync: poll active room every 1000ms (1 second) for near-instant sync
    pollInterval = setInterval(async () => {
      try {
        const fresh = await Api.getGdRoom(room._id);
        if (fresh.status === 'COMPLETED') {
          clearInterval(pollInterval);
          pollInterval = null;
          toast('GD session concluded. Generating your AI report...', 'sprout');
          renderStudentGdReport(fresh);
        } else if (fresh.transcripts && fresh.transcripts.length !== (room.transcripts || []).length) {
          room = fresh;
          renderTranscripts(room.transcripts);
        }
      } catch (e) {}
    }, 1000);
  }

  function renderStudentGdReport(room, targetArea = mount) {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    SpeechOutput.stop();
    if (SpeechInput.listening) SpeechInput.stop();
    const area = targetArea || mount;
    const userId = S.user?._id || S.user?.id;
    const myReport = (room.reports || []).find((r) => (r.student?._id || r.student) === userId) || (room.reports && room.reports[0]);

    area.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 16px; animation: fadeIn 0.25s ease;">
        <div class="row" style="align-items: center; gap: 10px;">
          <button class="btn btn-ghost btn-sm" id="back-to-peer-btn">⬅️ Back to GD Rooms</button>
          <div class="spacer"></div>
          <span class="pill sprout" style="font-size: 13px; font-weight: 700;">🎉 GD Session Completed (+25 XP)</span>
        </div>

        <div class="card card-2" style="border: 2px solid var(--color-primary); background: var(--color-surface); padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <div class="row gap-sm" style="align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px;">
            <div>
              <div class="eyebrow" style="color: var(--color-primary); font-weight: 700;">SPEECH AI PERFORMANCE REPORT</div>
              <h2 style="font-size: 24px; font-weight: 800; margin: 4px 0 8px; color: var(--color-text);">Topic: "${esc(room.topic)}"</h2>
              <div style="font-size: 13.5px; color: var(--color-text-muted);">
                Host: <b>${esc(room.teacher?.name || 'Teacher')}</b> &middot; Total Participants: <b>${room.participants?.length || 0} students</b>
              </div>
            </div>
          </div>

          ${myReport ? `
            <div class="grid grid-2 gap-md" style="margin-bottom: 20px;">
              <div class="card card-2" style="text-align: center; padding: 24px; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: 12px;">
                <div class="eyebrow">Overall GD Score</div>
                <div style="font-size: 48px; font-weight: 900; color: ${scoreColor(myReport.overallScore)}; margin: 8px 0;">${myReport.overallScore}/100</div>
                <div class="pill sprout" style="display: inline-block;">+25 XP Awarded</div>
              </div>

              <div class="grid grid-2 gap-xs">
                <div class="card card-2" style="padding: 12px; background: var(--color-surface-2); border: 1px solid var(--color-border);"><div class="eyebrow">Clarity &amp; Fluency</div><h3 style="color:${scoreColor(myReport.clarityScore)};margin-top:4px">${myReport.clarityScore}%</h3></div>
                <div class="card card-2" style="padding: 12px; background: var(--color-surface-2); border: 1px solid var(--color-border);"><div class="eyebrow">Grammar Accuracy</div><h3 style="color:${scoreColor(myReport.grammarScore)};margin-top:4px">${myReport.grammarScore}%</h3></div>
                <div class="card card-2" style="padding: 12px; background: var(--color-surface-2); border: 1px solid var(--color-border);"><div class="eyebrow">Vocabulary</div><h3 style="color:${scoreColor(myReport.vocabularyScore)};margin-top:4px">${myReport.vocabularyScore}%</h3></div>
                <div class="card card-2" style="padding: 12px; background: var(--color-surface-2); border: 1px solid var(--color-border);"><div class="eyebrow">Interaction</div><h3 style="color:${scoreColor(myReport.interactionScore)};margin-top:4px">${myReport.interactionScore}%</h3></div>
              </div>
            </div>

            <!-- Key Strengths -->
            ${myReport.strengths && myReport.strengths.length ? `
              <div class="card card-2" style="margin-bottom: 14px; background: var(--color-success-soft); border-left: 4px solid var(--color-success); padding: 16px;">
                <div style="font-size: 15px; font-weight: 700; color: var(--emerald); margin-bottom: 8px;">🌟 Key Strengths Observed</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: var(--color-text); line-height: 1.6;">
                  ${myReport.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <!-- Sentence Corrections -->
            ${myReport.corrections && myReport.corrections.length ? `
              <div class="card card-2" style="margin-bottom: 14px; background: var(--color-error-soft); border-left: 4px solid var(--color-error); padding: 16px;">
                <div style="font-size: 15px; font-weight: 700; color: var(--coral); margin-bottom: 8px;">✏️ Sentence &amp; Grammar Refinements</div>
                ${myReport.corrections.map((c) => `
                  <div style="margin-bottom: 10px; font-size: 13.5px; background: var(--color-surface); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--color-border);">
                    <div style="color: var(--coral); font-weight: 600;"><b>Spoken:</b> "${esc(c.original)}"</div>
                    <div style="color: var(--emerald); font-weight: 600; margin-top: 4px;"><b>Improved:</b> "${esc(c.corrected)}"</div>
                    ${c.explanation ? `<div style="color: var(--color-text-muted); font-size: 12.5px; margin-top: 4px;">💡 ${esc(c.explanation)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Actionable Skill Suggestions -->
            ${myReport.suggestions && myReport.suggestions.length ? `
              <div class="card card-2" style="margin-bottom: 16px; background: var(--color-streak-soft); border-left: 4px solid var(--color-streak); padding: 16px;">
                <div style="font-size: 15px; font-weight: 700; color: var(--amber); margin-bottom: 8px;">💡 Targeted Skill Improvement Suggestions</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: var(--color-text); line-height: 1.6;">
                  ${myReport.suggestions.map((sug) => `<li>${esc(sug)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          ` : `
            <div class="empty-state" style="padding: 32px 16px; text-align: center;">No individual report available for this session.</div>
          `}
        </div>
      </div>
    `;

    const backBtn = $('#back-to-peer-btn');
    if (backBtn) backBtn.onclick = () => renderPeerMain();
  }

  function openPeerRoom(session, topic) {
    activeSession = session;
    currentPeerTab = '1-on-1';
    const roomArea = $('#peer-room-area');
    const matchGrid = $('#peer-1on1-grid') || $('#peer-match-card');
    if (matchGrid) matchGrid.style.display = 'none';

    roomArea.innerHTML = `
      <div style="max-width: 860px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 16px; animation: fadeIn 0.25s ease;">
        <div class="card card-2" style="border: 2px solid var(--color-primary); background: var(--color-surface); padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <div class="row gap-sm" style="align-items: center; margin-bottom: 14px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px;">
            <div>
              <div class="pill voice" style="font-size: 12px; font-weight: 700;">&#x1F507; Voice Anonymization Active</div>
              <h3 style="font-size: 20px; margin-top: 4px; color: var(--color-text);">Connected: Anonymized Voice Call</h3>
              <div style="font-size: 13.5px; color: var(--color-text-muted);">Discussion Topic: <b>${esc(topic)}</b></div>
            </div>
            <div class="spacer"></div>
            <button class="btn btn-coral btn-sm" id="end-peer-session-btn" style="font-weight: 700;">${ICONS.x} End Call &amp; Rate</button>
          </div>

          <div class="grid grid-2 gap-md" style="margin-bottom: 16px;">
            <div class="card card-2" style="text-align: center; padding: 20px; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: 12px;">
              <div class="avatar" style="width: 54px; height: 54px; margin: 0 auto 8px; background: var(--purple); font-size: 20px; font-weight: 700; color: #fff;">YOU</div>
              <div style="font-weight: 700; font-size: 15px; color: var(--color-text);">${esc(S.user?.name || 'You')} (Anonymized)</div>
              <div style="font-size: 12px; color: var(--emerald); margin-top: 2px;">&#x2714; Mic Connected</div>
            </div>
            <div class="card card-2" style="text-align: center; padding: 20px; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: 12px;">
              <div class="avatar" style="width: 54px; height: 54px; margin: 0 auto 8px; background: var(--amber); font-size: 20px; font-weight: 700; color: #fff;">PEER</div>
              <div style="font-weight: 700; font-size: 15px; color: var(--color-text);">Peer Student (Anonymized)</div>
              <div style="font-size: 12px; color: var(--emerald); margin-top: 2px;">&#x26A1; Voice Stream Filtered</div>
            </div>
          </div>

          <div class="card card-2" style="margin-bottom: 16px; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
            <div class="section-title" style="font-size: 14px; margin-bottom: 8px;">&#x1F4A1; Conversation Starter Prompts</div>
            <ul style="padding-left: 20px; margin: 0; font-size: 13.5px; color: var(--color-text); line-height: 1.6;">
              <li>"What is an exciting project, hobby, or goal you worked on recently?"</li>
              <li>"How do you prepare for campus placement interviews and group discussions?"</li>
              <li>"What is your favorite travel destination or memorable life experience?"</li>
            </ul>
          </div>

          <div class="card card-2" style="background: var(--color-surface-2); border: 1.5px solid var(--color-primary); border-radius: 12px; padding: 16px 20px;">
            <div class="row gap-md" style="align-items: center;">
              <button class="rec-btn" id="peer-mic-btn" style="width: 52px; height: 52px; flex-shrink: 0;">${ICONS.mic}</button>
              <div class="col" style="flex: 1; min-width: 0;">
                <div id="peer-status" style="font-weight: 700; font-size: 15px; color: var(--color-text);">Tap mic to speak to your peer</div>
                <div id="peer-transcript" style="font-size: 13.5px; color: var(--color-primary); margin-top: 3px; min-height: 18px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const micBtn = $('#peer-mic-btn');
    micBtn.onclick = () => {
      if (!SpeechInput.supported) { toast('Speech recognition not supported in browser.', 'coral'); return; }
      if (!SpeechInput.listening) {
        micBtn.classList.add('on');
        $('#peer-status').textContent = 'Speaking (Voice anonymized)...';
        SpeechInput.start({
          onResult: ({ final, interim }) => { $('#peer-transcript').textContent = (final + ' ' + interim).trim(); },
          onEnd: (finalTranscript) => {
            micBtn.classList.remove('on');
            $('#peer-status').textContent = 'Tap mic to speak again';
            if (finalTranscript) {
              toast('Spoken audio sent over anonymized channel');
            }
          },
          onError: (e) => { micBtn.classList.remove('on'); $('#peer-status').textContent = 'Mic error: ' + e; },
        });
      } else {
        SpeechInput.stop();
      }
    };

    $('#end-peer-session-btn').onclick = async () => {
      try {
        if (activeSession && activeSession._id && !activeSession._id.startsWith('demo_')) {
          await Api.endPeerSession(activeSession._id);
          await Api.ratePeerSession(activeSession._id, { score: 5, comment: 'Great peer practice call!' });
        }
      } catch (e) {}
      addStudentXP(25);
      toast('Peer session completed! +25 XP earned', 'sprout');
      renderPeerMain();
    };
  }

  await renderPeerMain();
};

/* ---------------------------- LISTENING ---------------------------- */
VIEW_RENDERERS['listening'] = async (mount) => {
  const clips = await Api.listeningClips();
  
  mount.innerHTML = `
    <div class="row" style="margin-bottom:14px;align-items:center">
      <div>
        <div class="section-title" style="margin-bottom:2px">${ICONS.headphones} Listening Comprehension</div>
        <div style="font-size:14px;color:var(--cream-dim)">Train your ear for natural spoken English.</div>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" id="refresh-listening-btn">${ICONS.activity} Show different audio clips</button>
    </div>
    <div class="col gap-md" id="listen-list"></div>
  `;
  const list = $('#listen-list');
  clips.forEach(c=>{
    const card = el(`
      <div class="card">
        <div class="row" style="margin-bottom:10px;align-items:center;flex-wrap:wrap;gap:8px">
          <div class="row gap-sm" style="align-items:center">
            <span class="pill ${levelColor(c.level)}">${c.level}</span>
          </div>
          <div class="spacer"></div>
          <!-- Tide Speed Levels (0.75x, 1.0x, 1.25x) -->
          <div class="tide-speed-selector row gap-xs" style="align-items:center;background:rgba(2,132,199,0.14);border:1px solid rgba(56,189,248,0.35);border-radius:20px;padding:3px 10px">
            <span style="font-size:11px;color:#38BDF8;font-weight:700">🌊 Tide:</span>
            <button class="tide-btn" data-speed="0.75" style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:11px;font-weight:700;padding:2px 5px" title="Low Tide: 0.75x Speed">0.75x</button>
            <button class="tide-btn active" data-speed="1.0" style="background:none;border:none;color:#38BDF8;cursor:pointer;font-size:11px;font-weight:700;padding:2px 5px" title="Mid Tide: Normal Speed">1.0x</button>
            <button class="tide-btn" data-speed="1.25" style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:11px;font-weight:700;padding:2px 5px" title="High Tide: 1.25x Speed">1.25x</button>
          </div>
          <button class="btn btn-ghost btn-sm" data-play>${ICONS.play} Play audio</button>
          <!-- Ocean Waveform Visualizer -->
          <div class="ocean-waveform" data-waveform style="display:none;align-items:center;gap:3px;height:20px;padding:0 6px">
            <span class="ocean-bar"></span><span class="ocean-bar"></span><span class="ocean-bar"></span><span class="ocean-bar"></span><span class="ocean-bar"></span>
          </div>
        </div>
        <h3 style="font-size:17px;margin-bottom:8px">${esc(c.title)}</h3>
        <p style="font-size:15px;color:var(--cream-dim);margin:0 0 14px">${esc(c.question)}</p>
        <div class="row gap-md">
          <button class="rec-btn" data-rec style="width:52px;height:52px">${ICONS.mic}</button>
          <div class="col" style="flex:1"><div data-status style="font-weight:700;font-size:14.5px">Play the audio, then record your answer</div><div data-transcript style="font-size:13.5px;color:var(--cream-dim);margin-top:4px"></div></div>
        </div>
        <div data-result style="margin-top:12px"></div>
      </div>`);

    let currentSpeed = 1.0;
    const tideBtns = card.querySelectorAll('.tide-btn');
    tideBtns.forEach(btn => {
      btn.onclick = () => {
        tideBtns.forEach(b => {
          b.style.color = '#94A3B8';
          b.classList.remove('active');
        });
        btn.style.color = '#38BDF8';
        btn.classList.add('active');
        currentSpeed = parseFloat(btn.dataset.speed) || 1.0;
      };
    });

    const waveformEl = card.querySelector('[data-waveform]');
    card.querySelector('[data-play]').onclick = () => {
      if (waveformEl) waveformEl.style.display = 'inline-flex';
      SpeechOutput.speak(c.script, {
        rate: currentSpeed,
        onEnd: () => {
          if (waveformEl) waveformEl.style.display = 'none';
        }
      });
    };
    const recBtn = card.querySelector('[data-rec]');
    let startTime;
    recBtn.onclick = ()=>{
      if (!SpeechInput.supported){ toast('Speech recognition not supported in this browser.', 'coral'); return; }
      if (!SpeechInput.listening){
        recBtn.classList.add('on'); startTime = Date.now();
        card.querySelector('[data-status]').textContent = 'Listening…';
        SpeechInput.start({
          onResult: ({final,interim})=>{ card.querySelector('[data-transcript]').textContent = (final+' '+interim).trim(); },
          onEnd: async (finalTranscript)=>{
            recBtn.classList.remove('on');
            if (!finalTranscript){ card.querySelector('[data-status]').textContent='No speech captured — try again'; return; }
            card.querySelector('[data-status]').textContent = 'Grading…';
            try{
              const { attempt } = await Api.submitListening({ clipId: c._id, answerTranscript: finalTranscript });
              card.querySelector('[data-result]').innerHTML = `<div class="pill" style="color:${scoreColor(attempt.score)};border-color:transparent">${attempt.score}/100</div><p style="font-size:14.5px;margin-top:8px">${esc(attempt.feedback)}</p>`;
              card.querySelector('[data-status]').textContent = 'Done — tap to try again';
            } catch(err){ apiError(err); }
          },
          onError:(e)=>{ recBtn.classList.remove('on'); card.querySelector('[data-status]').textContent='Mic error: '+e; },
        });
      } else SpeechInput.stop();
    };
    list.appendChild(card);
  });
  $('#refresh-listening-btn').onclick = () => setView('listening');
};

/* ---------------------------- STORY CONTINUATION ---------------------------- */
VIEW_RENDERERS['story'] = async (mount) => {
  let prompts = [];
  try {
    prompts = await Api.storyPrompts();
  } catch (err) {
    prompts = [];
  }

  let currentIndex = 0;
  renderStoryView();

  function renderStoryView() {
    const prompt = prompts.length && prompts[currentIndex]
      ? prompts[currentIndex]
      : prompts[0] || {
          prompt: 'You are walking home when you find a lost package with an incomplete address. Explain how you locate the recipient.',
          title: 'The Lost Package',
          theme: 'Everyday Life',
          level: 'Beginner',
          openingNarration: 'The evening streets were quiet as a cold breeze blew fallen leaves across the sidewalk. On the bottom step of an apartment block sat a brown cardboard parcel with a smeared postal stamp.',
          suggestedWords: ['examined', 'inquired', 'delivered'],
        };

    mount.innerHTML = `
      <div class="col gap-md">
        <!-- Header -->
        <div class="row" style="margin-bottom:8px;align-items:center">
          <div>
            <div class="section-title" style="margin:0">${ICONS.book} Story Continuation &amp; Speaking Practice</div>
            <div style="font-size:13.5px;color:var(--cream-dim)">Listen to the opening narration, prepare your thoughts, and record your spoken continuation.</div>
          </div>
          <div class="spacer"></div>
          <span class="pill voice" style="font-size:12.5px">${prompts.length ? `${currentIndex + 1} of ${prompts.length} Stories` : 'Curated Bank'}</span>
        </div>

        <!-- Active Story Card -->
        <div class="card">
          <div class="row gap-sm" style="margin-bottom:12px;align-items:center">
            <span class="pill voice">${esc(prompt.theme || 'Everyday Life')}</span>
            <span class="pill sprout">${esc(prompt.level || 'Beginner')}</span>
            <div class="spacer"></div>
            <div class="row gap-xs">
              <button class="btn btn-ghost btn-sm" id="prev-story-btn" ${currentIndex === 0 ? 'disabled' : ''}>⬅️ Previous Story</button>
              <button class="btn btn-ghost btn-sm" id="next-story-btn" ${currentIndex >= prompts.length - 1 ? 'disabled' : ''}>Next Story ➡️</button>
            </div>
          </div>

          <h3 style="font-size:22px;color:var(--color-text);margin-bottom:12px;font-weight:800">${esc(prompt.title)}</h3>

          ${prompt.openingNarration ? `
            <div style="background:var(--panel-2);padding:16px 18px;border-radius:12px;border:1px solid var(--white-border);margin-bottom:14px">
              <div class="eyebrow" style="margin-bottom:6px">📖 Opening Story Narration</div>
              <div style="font-size:15px;line-height:1.65;color:var(--color-text)">${esc(prompt.openingNarration)}</div>
              <button class="btn btn-outline btn-sm" id="play-narration-btn" style="margin-top:10px">🔊 Listen to Opening Narration</button>
            </div>
          ` : ''}

          <div class="passage-box" style="margin-bottom:14px">
            <div class="eyebrow" style="margin-bottom:6px">🎯 Your Narration Task</div>
            <div style="font-size:15px;line-height:1.55">${esc(prompt.prompt)}</div>
          </div>

          ${prompt.suggestedWords && prompt.suggestedWords.length ? `
            <div class="row gap-xs" style="align-items:center;margin-bottom:16px;flex-wrap:wrap">
              <span style="font-size:12.5px;color:var(--cream-dim);font-weight:600">Suggested vocabulary:</span>
              ${prompt.suggestedWords.map(w => `<span class="pill sprout" style="font-size:11.5px">${esc(w)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="row gap-md" style="margin-top:16px">
            <button class="rec-btn" id="story-rec">${ICONS.mic}</button>
            <div class="col" style="flex:1">
              <div id="story-status" style="font-weight:700;font-size:15px">Tap mic to speak your story continuation</div>
              <div id="story-transcript" style="font-size:14px;color:var(--cream-dim);margin-top:4px"></div>
            </div>
          </div>
          <div id="story-result" style="margin-top:18px"></div>
        </div>
      </div>
    `;

    // Prev / Next Handlers
    const prevBtn = $('#prev-story-btn');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderStoryView();
        }
      };
    }

    const nextBtn = $('#next-story-btn');
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (currentIndex < prompts.length - 1) {
          currentIndex++;
          renderStoryView();
        }
      };
    }

    // TTS
    const playBtn = $('#play-narration-btn');
    if (playBtn) {
      playBtn.onclick = () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(prompt.openingNarration);
          u.rate = 0.95;
          window.speechSynthesis.speak(u);
          toast('Playing opening story narration…', 'sprout');
        } else {
          toast('Text-to-speech not supported in browser', 'coral');
        }
      };
    }

    // Mic Recording & Scoring
    const recBtn = $('#story-rec');
    if (recBtn) {
      recBtn.onclick = () => {
        if (!SpeechInput.supported) {
          toast('Speech recognition not supported in browser.', 'coral');
          return;
        }
        if (!SpeechInput.listening) {
          recBtn.classList.add('on');
          $('#story-status').textContent = 'Listening to your story…';
          SpeechInput.start({
            onResult: ({ final, interim }) => {
              $('#story-transcript').textContent = (final + ' ' + interim).trim();
            },
            onEnd: async (finalTranscript) => {
              recBtn.classList.remove('on');
              if (!finalTranscript) {
                $('#story-status').textContent = 'No speech captured — tap to try again';
                return;
              }
              $('#story-status').textContent = 'Grading story with Local AI…';
              try {
                const res = await Api.submitStory({ promptId: prompt._id, transcript: finalTranscript });
                const report = res.attempt;
                $('#story-result').innerHTML = `
                  <div class="card card-2" style="background:var(--color-surface-2);border:1px solid var(--line);margin-top:14px">
                    <div class="row gap-sm" style="margin-bottom:12px;align-items:center">
                      <span class="pill sprout" style="font-size:14px;font-weight:700">Overall Score: ${report.scores.overall}/100</span>
                      <span class="pill voice" style="font-size:13px;font-weight:700">+20 XP Earned</span>
                    </div>
                    <div class="grid grid-4 gap-xs" style="margin-bottom:14px">
                      <div class="card" style="text-align:center;padding:8px">
                        <div class="eyebrow">Creativity</div>
                        <div style="font-size:18px;font-weight:700;color:var(--purple)">${report.scores.creativity}%</div>
                      </div>
                      <div class="card" style="text-align:center;padding:8px">
                        <div class="eyebrow">Coherence</div>
                        <div style="font-size:18px;font-weight:700;color:var(--emerald)">${report.scores.coherence}%</div>
                      </div>
                      <div class="card" style="text-align:center;padding:8px">
                        <div class="eyebrow">Vocabulary</div>
                        <div style="font-size:18px;font-weight:700;color:var(--amber)">${report.scores.vocabulary}%</div>
                      </div>
                      <div class="card" style="text-align:center;padding:8px">
                        <div class="eyebrow">Grammar Flow</div>
                        <div style="font-size:18px;font-weight:700;color:var(--voice-blue)">${report.scores.grammarFlow}%</div>
                      </div>
                    </div>
                    <div style="font-size:14px;color:var(--color-text);line-height:1.5">${esc(report.feedback)}</div>
                  </div>
                `;
                addStudentXP(20);
                $('#story-status').textContent = 'Done! Tap to record again.';
              } catch (err) {
                apiError(err);
                $('#story-status').textContent = 'Error evaluating story.';
              }
            },
            onError: (e) => {
              recBtn.classList.remove('on');
              $('#story-status').textContent = 'Mic error: ' + e;
            },
          });
        } else {
          SpeechInput.stop();
        }
      };
    }
  }
};

/* ---------------------------- DEBATE ---------------------------- */
// Pure helper functions for debate module (can also be unit tested)
function debateCountWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function debateCalculateScoreDeltas(current, previous) {
  if (!current || !previous) return null;
  const deltas = {};
  const metrics = ['logic', 'persuasion', 'clarity', 'vocabulary', 'structure', 'overall'];
  for (const m of metrics) {
    const curVal = current[m] ?? (m === 'logic' ? current.argument : m === 'persuasion' ? current.counterargument : 70);
    const prevVal = previous[m] ?? (m === 'logic' ? previous.argument : m === 'persuasion' ? previous.counterargument : 70);
    deltas[m] = Math.round(curVal - prevVal);
  }
  return deltas;
}

function debateFormatDeltaBadge(delta, suffix = '%') {
  if (delta === null || delta === undefined) return '';
  if (delta > 0) return `<span class="pill sprout" style="font-size:11px;padding:2px 6px;margin-left:4px;font-weight:700">+${delta}${suffix} 📈</span>`;
  if (delta < 0) return `<span class="pill coral" style="font-size:11px;padding:2px 6px;margin-left:4px;font-weight:700">${delta}${suffix} 📉</span>`;
  return `<span class="pill" style="font-size:11px;padding:2px 6px;margin-left:4px;color:var(--cream-dim)">0${suffix}</span>`;
}

VIEW_RENDERERS['debate'] = async (mount) => {
  // Available departments list
  const DEPARTMENTS = ['All', 'General', 'CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'MBA'];

  // Restore persisted department filter
  let activeDept = localStorage.getItem('lingrow_debate_dept') ||
    (typeof S !== 'undefined' && S.user && S.user.selectedDebateDept) ||
    'All';

  // Practice mode: 'manual' (Choose my side) vs 'assigned' (Assign me a side)
  let practiceMode = localStorage.getItem('lingrow_debate_mode') || 'manual';

  // Timers state & intervals
  let prepInterval = null;
  let speakInterval = null;
  let prepSecondsRemaining = 120; // 2 minutes prep timer
  let targetDurationSeconds = 120; // 60, 120, or 180 seconds
  let speakingStartTime = null;

  // Track previous attempt on same topic/stance for score delta comparisons
  let previousAttemptReport = null;

  function clearAllTimers() {
    if (prepInterval) { clearInterval(prepInterval); prepInterval = null; }
    if (speakInterval) { clearInterval(speakInterval); speakInterval = null; }
  }

  function formatTimer(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  }

  function renderDebateSvgChart(series) {
    const labels = series.labels || [];
    const n = labels.length;
    if (n === 0) {
      return '<div style="text-align:center;color:var(--cream-dim);padding:20px;font-size:13px">No historical scores available yet.</div>';
    }

    const width = 560;
    const height = 180;
    const padL = 36;
    const padR = 20;
    const padT = 16;
    const padB = 28;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const getY = (val) => padT + (100 - Math.max(0, Math.min(100, val))) * (plotH / 100);
    const getX = (idx) => n === 1 ? padL + plotW / 2 : padL + idx * (plotW / (n - 1));

    // Y Grid lines: 20, 40, 60, 80, 100
    const gridLevels = [20, 40, 60, 80, 100];
    const gridLinesSvg = gridLevels.map(lvl => {
      const y = getY(lvl);
      return `
        <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3" />
        <text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="var(--cream-dim)">${lvl}</text>
      `;
    }).join('');

    // X Labels
    const xLabelsSvg = labels.map((lbl, idx) => {
      const x = getX(idx);
      return `<text x="${x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="var(--cream-dim)">${lbl}</text>`;
    }).join('');

    // Metric configs
    const metrics = [
      { key: 'logic', color: '#8b5cf6' },
      { key: 'persuasion', color: '#10b981' },
      { key: 'clarity', color: '#06b6d4' },
      { key: 'vocabulary', color: '#f59e0b' },
      { key: 'structure', color: '#f43f5e' },
    ];

    const linesAndDotsSvg = metrics.map(m => {
      const data = series[m.key] || [];
      const validPoints = [];
      const dotsSvg = [];
      data.forEach((val, idx) => {
        if (typeof val === 'number' && !isNaN(val)) {
          const x = getX(idx);
          const y = getY(val);
          validPoints.push(`${x},${y}`);
          dotsSvg.push(`
            <circle cx="${x}" cy="${y}" r="3.5" fill="${m.color}" stroke="var(--ink)" stroke-width="1.5">
              <title>${m.key}: ${val}%</title>
            </circle>
          `);
        }
      });
      const polyline = validPoints.length > 1
        ? `<polyline points="${validPoints.join(' ')}" fill="none" stroke="${m.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />`
        : '';
      return polyline + dotsSvg.join('');
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-height:220px;display:block">
        ${gridLinesSvg}
        ${xLabelsSvg}
        ${linesAndDotsSvg}
      </svg>
    `;
  }

  async function showDebateHistoryDrawer() {
    let historyData = null;
    try {
      historyData = await Api.debateHistory();
    } catch (err) {
      toast('Failed to load debate history: ' + (err.message || 'Offline'), 'coral');
      return;
    }

    const { attempts = [], series = {}, averages = {}, weakestSkill = null } = historyData || {};

    const existingOverlay = document.querySelector('.debate-history-modal-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = el(`
      <div class="modal-overlay debate-history-modal-overlay" style="z-index:1200">
        <div class="modal" style="max-width:720px;width:95%;max-height:90vh;padding:24px;position:relative">
          <div class="row" style="align-items:center;margin-bottom:16px">
            <div>
              <h2 style="font-size:20px;margin:0;color:var(--cream-bright);display:flex;align-items:center;gap:8px">
                📊 Collegiate Debate Skill Trends
              </h2>
              <div style="font-size:13px;color:var(--cream-dim);margin-top:2px">
                Performance trajectory across your recent speeches.
              </div>
            </div>
            <div class="spacer"></div>
            <button class="icon-btn" id="btn-close-debate-history" style="font-size:18px;color:var(--cream-dim)">${ICONS.x}</button>
          </div>

          ${attempts.length === 0 ? `
            <div style="text-align:center;padding:40px 16px">
              <div style="font-size:42px;margin-bottom:12px">🎙️</div>
              <h3 style="font-size:17px;color:var(--cream-bright);margin-bottom:6px">No Debate Speeches Yet</h3>
              <p style="font-size:13.5px;color:var(--cream-dim);max-width:440px;margin:0 auto">
                Deliver your first collegiate speech in the Debate Arena to begin tracking your trend lines across logic, persuasion, clarity, vocabulary, and structure!
              </p>
            </div>
          ` : `
            <!-- Weakest Skill & Coaching Tip Card (Phase 4 Item 4) -->
            ${weakestSkill ? `
              <div style="background:linear-gradient(135deg, rgba(244,63,94,0.12), rgba(139,92,246,0.10));border:1.5px solid var(--coral);border-radius:12px;padding:14px 16px;margin-bottom:18px">
                <div class="row gap-sm" style="align-items:flex-start">
                  <span style="font-size:24px">🎯</span>
                  <div style="flex:1">
                    <div class="row" style="align-items:center;gap:8px">
                      <strong style="color:var(--coral);font-size:14.5px">Primary Growth Area: ${esc(weakestSkill.skill.toUpperCase())}</strong>
                      <span class="pill coral" style="font-size:11px;padding:2px 8px">${weakestSkill.average}% Recent Avg</span>
                    </div>
                    <div style="font-size:13.5px;color:var(--cream-bright);margin-top:4px;line-height:1.5">
                      💡 <strong>Collegiate Coaching Tip:</strong> ${esc(weakestSkill.tip)}
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- 5-Metric Average Tiles -->
            <div class="grid grid-5 gap-xs" style="margin-bottom:20px">
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Logic</div>
                <div style="font-size:17px;font-weight:700;color:var(--purple)">${averages.logic != null ? `${averages.logic}%` : 'N/A'}</div>
              </div>
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Persuasion</div>
                <div style="font-size:17px;font-weight:700;color:var(--emerald)">${averages.persuasion != null ? `${averages.persuasion}%` : 'N/A'}</div>
              </div>
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Clarity</div>
                <div style="font-size:17px;font-weight:700;color:var(--cyan)">${averages.clarity != null ? `${averages.clarity}%` : 'N/A'}</div>
              </div>
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Vocabulary</div>
                <div style="font-size:17px;font-weight:700;color:var(--amber)">${averages.vocabulary != null ? `${averages.vocabulary}%` : 'N/A'}</div>
              </div>
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Structure</div>
                <div style="font-size:17px;font-weight:700;color:var(--coral)">${averages.structure != null ? `${averages.structure}%` : 'N/A'}</div>
              </div>
            </div>

            <!-- SVG Multi-Metric Trend Chart -->
            <div style="background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px">
              <div class="row" style="align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                <strong style="font-size:13.5px;color:var(--cream-bright)">📈 Rubric Metric Trends (Last ${series.labels?.length || 0} Speeches)</strong>
                <div class="spacer"></div>
                <!-- Legend -->
                <div class="row gap-xs" style="flex-wrap:wrap;font-size:11.5px">
                  <span style="color:var(--purple);display:flex;align-items:center;gap:4px">● Logic</span>
                  <span style="color:var(--emerald);display:flex;align-items:center;gap:4px">● Persuasion</span>
                  <span style="color:var(--cyan);display:flex;align-items:center;gap:4px">● Clarity</span>
                  <span style="color:var(--amber);display:flex;align-items:center;gap:4px">● Vocab</span>
                  <span style="color:var(--coral);display:flex;align-items:center;gap:4px">● Structure</span>
                </div>
              </div>
              <div style="width:100%;overflow-x:auto">
                ${renderDebateSvgChart(series)}
              </div>
            </div>

            <!-- Recent Speeches History List -->
            <div>
              <div class="eyebrow" style="margin-bottom:10px">Recent Speeches (Chronological)</div>
              <div class="col gap-xs" style="max-height:220px;overflow-y:auto;padding-right:4px">
                ${attempts.map(a => {
                  const sc = a.scores || {};
                  const topicTitle = a.topic?.topic || 'Collegiate Debate Topic';
                  const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '';
                  return `
                    <div style="background:var(--card-sub);border:1px solid var(--line);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px">
                      <span class="pill ${a.stance === 'for' ? 'voice' : 'warn'}" style="font-size:10.5px;padding:2px 6px">
                        ${(a.stance || 'FOR').toUpperCase()}
                      </span>
                      <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:600;color:var(--cream-bright);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          ${esc(topicTitle)}
                        </div>
                        <div style="font-size:11px;color:var(--cream-dim)">
                          ${dateStr} • L:${sc.logic ?? sc.argument ?? 70}% P:${sc.persuasion ?? sc.counterargument ?? 70}% C:${sc.clarity ?? 70}% V:${sc.vocabulary ?? 70}% S:${sc.structure != null ? `${sc.structure}%` : 'N/A'}
                        </div>
                      </div>
                      <span class="pill sprout" style="font-size:12px;font-weight:700">
                        ${sc.overall ?? 70}%
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `}
        </div>
      </div>
    `);

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('#btn-close-debate-history');
    if (closeBtn) closeBtn.onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  function debateCancelSpeechSynthesis() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  window.addEventListener('hashchange', debateCancelSpeechSynthesis);
  window.addEventListener('popstate', debateCancelSpeechSynthesis);
  window.addEventListener('beforeunload', debateCancelSpeechSynthesis);

  renderDebateView();

  async function renderDebateView(overrideTopicData = null) {
    clearAllTimers();
    debateCancelSpeechSynthesis();
    if (typeof SpeechInput !== 'undefined' && SpeechInput.listening) {
      SpeechInput.stop();
    }

    mount.innerHTML = `<div class="card">${wave(5)}</div>`;

    let topicData = overrideTopicData;
    if (!topicData) {
      try {
        topicData = await Api.nextDebateTopic({
          assignStance: practiceMode === 'assigned',
          department: activeDept !== 'All' ? activeDept : '',
        });
      } catch (err) {
        // Level Gate UX (Phase 3 Item 6)
        if (err.status === 403 || err.locked) {
          const reqLevel = err.data?.requiredLevel || err.requiredLevel;
          const reqXp = err.data?.requiredXp ?? err.requiredXp;
          const curXp = err.data?.currentXp ?? err.currentXp ?? (typeof S !== 'undefined' && S.user ? S.user.xp : null);
          const hasServerData = Boolean(reqLevel && reqXp != null);
          const xpNeeded = hasServerData && curXp != null ? Math.max(0, reqXp - curXp) : null;

          mount.innerHTML = `
            <div class="col gap-md">
              <div class="card card-white-accent" style="text-align:center;padding:40px 24px">
                <div style="font-size:48px;margin-bottom:14px">🔒</div>
                <h2 style="font-size:22px;color:var(--cream-bright);margin-bottom:8px">Collegiate Debate Practice Locked</h2>
                <p style="font-size:14.5px;color:var(--cream-dim);max-width:520px;margin:0 auto 20px auto;line-height:1.6">
                  ${hasServerData
                    ? `Collegiate Debate requires <strong style="color:var(--cyan)">${esc(reqLevel)} Level</strong> or a minimum of <strong style="color:var(--emerald)">${reqXp} XP</strong> to unlock.`
                    : 'Collegiate Debate practice requires a higher level standing to unlock. Complete foundational reading and grammar modules to gain XP and unlock this arena.'}
                </p>
                ${hasServerData && xpNeeded != null ? `
                  <div class="card card-sub" style="max-width:380px;margin:0 auto 24px auto;padding:16px 20px">
                    <div class="row" style="font-size:14px;margin-bottom:8px">
                      <span>Your Current XP:</span>
                      <div class="spacer"></div>
                      <strong>${curXp} XP</strong>
                    </div>
                    <div class="row" style="font-size:14px;color:var(--amber)">
                      <span>XP Needed to Unlock:</span>
                      <div class="spacer"></div>
                      <strong>+${xpNeeded} XP</strong>
                    </div>
                  </div>
                ` : ''}
                <div class="row gap-sm" style="justify-content:center;flex-wrap:wrap">
                  <button class="btn btn-primary" data-nav="read-aloud">Practice Read Aloud (+XP) ${ICONS.arrowRight}</button>
                  <button class="btn btn-outline" data-nav="grammar">Practice Grammar</button>
                </div>
              </div>
            </div>
          `;
          return;
        }

        topicData = {
          topic: null,
          unattemptedRemaining: 0,
          totalTopicsCount: 0,
          suggestedStance: 'for',
          assignedStance: 'for',
        };
      }
    }

    const topic = topicData.topic || {
      _id: null,
      topic: 'Should social media platforms verify the identity of every user?',
      level: 'Advanced',
      difficulty: 'advanced',
      tags: ['Ethics', 'Privacy', 'Technology'],
      keyTerms: [
        { term: 'Algorithmic accountability', meaning: 'The principle that automated systems should be transparent and answerable for their impact.' },
        { term: 'Digital sovereignty', meaning: 'The control an individual or nation maintains over their digital data and presence.' },
      ],
      context: 'Identity verification could reduce online harassment and bot networks, but raises serious privacy and surveillance concerns.',
      forKeyPoints: ['Reduces fake bot accounts and online harassment', 'Increases user accountability for digital statements'],
      againstKeyPoints: ['Presents severe user privacy and data breach risks', 'Restricts freedom of speech for whistleblowers'],
    };

    // Determine initial stance based on practice mode and server recommendation
    let selectedStance = 'for';
    if (practiceMode === 'assigned') {
      selectedStance = (topicData.assignedStance || topicData.suggestedStance || 'for').toLowerCase();
    } else if (topicData.suggestedStance) {
      selectedStance = topicData.suggestedStance.toLowerCase();
    }

    const difficultyLabel = topic.difficulty || topic.level || 'Intermediate';
    const diffLower = String(difficultyLabel).toLowerCase();
    const difficultyClass = diffLower === 'beginner' ? 'sprout' : diffLower === 'advanced' ? 'purple' : 'voice';

    // Track input mode: Speech mic vs Typed input
    let isTypedInputMode = !SpeechInput.supported;

    mount.innerHTML = `
      <div class="col gap-md">
        <!-- Header & Stats Card -->
        <div class="card card-white-accent">
          <div class="row" style="align-items:center;flex-wrap:wrap;gap:10px">
            <div>
              <div class="section-title" style="margin:0">${ICONS.mic} Collegiate Debate Practice</div>
              <div style="font-size:13.5px;color:var(--cream-dim)">Structured reasoning, stance agility, and persuasive speaking with AI rubric evaluation.</div>
            </div>
            <div class="spacer"></div>
            <div class="row gap-xs" style="align-items:center">
              <span class="pill sprout" id="unseen-pill">⚡ ${topicData.unattemptedRemaining || 0} Topics Need Practice</span>
              ${topicData.fullyPracticedCount !== undefined ? `<span class="pill voice" title="Topics practiced on both FOR and AGAINST">✨ ${topicData.fullyPracticedCount} Fully Practiced</span>` : ''}
            </div>
          </div>

          <!-- Department Filter Bar (Item 5) -->
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--white-border)">
            <div class="row gap-xs" style="align-items:center;flex-wrap:wrap">
              <span class="eyebrow" style="margin-right:6px">Department:</span>
              <div class="row gap-xs" id="dept-pills-row" style="flex-wrap:wrap">
                ${DEPARTMENTS.map(dept => `
                  <button class="pill ${dept === activeDept ? 'sprout font-bold' : ''}" data-dept="${dept}" style="cursor:pointer;background:${dept === activeDept ? 'var(--emerald-glow)' : 'transparent'};border:1px solid ${dept === activeDept ? 'var(--emerald)' : 'var(--white-border)'};color:${dept === activeDept ? 'var(--cream-bright)' : 'var(--cream-dim)'};padding:4px 10px;border-radius:20px;font-size:12px">
                    ${dept}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Mastered Pool / Retry Banner (Item 4) -->
        ${topicData.retry ? `
          <div class="card" style="background:linear-gradient(135deg, rgba(245,158,11,0.12), rgba(16,185,129,0.08));border:1.5px solid var(--amber);padding:14px 18px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:24px">🏆</span>
              <div>
                <strong style="color:var(--amber);font-size:15px">Mastered Department Pool!</strong>
                <div style="font-size:13.5px;color:var(--cream-bright);margin-top:2px">
                  You have argued both sides of all available topics in this department!
                  ${topicData.previousBestScore ? `Challenge: <strong>Beat your previous score of ${topicData.previousBestScore}/100</strong> on this topic.` : 'Try this topic again to polish your delivery!'}
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Active Debate Card -->
        <div class="card">
          <div class="row gap-sm" style="margin-bottom:12px;align-items:center;flex-wrap:wrap">
            <span class="pill voice">Debate Arena</span>
            <span class="pill ${difficultyClass}">${esc(difficultyLabel)}</span>
            ${topic.department && topic.department !== 'General' ? `<span class="pill warn">${esc(topic.department)}</span>` : ''}
            ${topicData.bestScoreOnTopic != null ? `<span class="pill sprout" style="font-weight:700" title="Your best previous score on this topic">🎯 Your Best: ${topicData.bestScoreOnTopic}/100</span>` : ''}
            ${(topic.tags || []).map(tag => `<span class="pill" style="font-size:11px;border-color:var(--line);color:var(--cream-dim)">#${esc(tag)}</span>`).join('')}
            <div class="spacer"></div>
            <button class="btn btn-outline btn-sm" id="btn-toggle-debate-history" title="View your debate history and skill trends">📊 Skill Trends</button>
            <button class="btn btn-outline btn-sm" id="skip-topic-btn" title="Rotate to next available topic">🔄 Next Topic</button>
          </div>

          <h3 style="font-size:22px;color:var(--color-text);margin-bottom:12px;line-height:1.35">${esc(topic.topic)}</h3>

          ${topic.context ? `
            <div style="background:var(--panel-2);padding:14px 16px;border-radius:12px;border:1px solid var(--white-border);margin-bottom:16px">
              <div class="eyebrow" style="margin-bottom:4px">💡 Debate Background &amp; Context</div>
              <div style="font-size:14.5px;line-height:1.6;color:var(--color-text)">${esc(topic.context)}</div>
            </div>
          ` : ''}

          <!-- Key Terminology Card -->
          ${topic.keyTerms && topic.keyTerms.length > 0 ? `
            <div style="background:rgba(255,255,255,0.02);padding:12px 14px;border-radius:10px;border:1px solid var(--line);margin-bottom:16px">
              <div class="eyebrow" style="margin-bottom:8px">📚 Recommended Key Vocabulary &amp; Terms</div>
              <div class="grid grid-2 gap-xs">
                ${topic.keyTerms.map(kt => `
                  <div style="background:var(--card-sub);padding:8px 10px;border-radius:8px;font-size:13px;border-left:2px solid var(--cyan)">
                    <strong style="color:var(--cyan)">${esc(kt.term)}:</strong>
                    <span style="color:var(--cream-dim);margin-left:4px">${esc(kt.meaning)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Mode Toggle: Choose side vs Assign side -->
          <div style="background:var(--panel-2);padding:12px 16px;border-radius:12px;border:1px solid var(--white-border);margin-bottom:16px">
            <div class="row gap-md" style="align-items:center;flex-wrap:wrap">
              <div>
                <label class="field-label" style="margin:0;font-size:13.5px">Practice Mode:</label>
                <div style="font-size:12px;color:var(--cream-dim)">Choose your preferred stance or test your agility with an assigned stance.</div>
              </div>
              <div class="spacer"></div>
              <div class="row gap-xs">
                <button class="btn btn-sm ${practiceMode === 'manual' ? 'btn-primary' : 'btn-ghost'}" id="btn-mode-manual">
                  ✋ Choose My Side
                </button>
                <button class="btn btn-sm ${practiceMode === 'assigned' ? 'btn-primary' : 'btn-ghost'}" id="btn-mode-assigned">
                  🎲 Assign Me a Side
                </button>
              </div>
            </div>
          </div>

          <!-- Stance Selection & Status -->
          <div class="col gap-xs" style="margin-bottom:18px">
            <div class="row" style="align-items:center">
              <label class="field-label" style="margin-bottom:0">Debate Stance:</label>
              <div class="spacer"></div>
              ${practiceMode === 'assigned' ? `
                <span class="pill warn" style="font-size:12px;font-weight:700">🎲 Randomly Assigned (${selectedStance.toUpperCase()})</span>
              ` : `
                <span style="font-size:12px;color:var(--cream-dim)">Select which side you will defend:</span>
              `}
            </div>

            <div class="row gap-sm" style="margin-top:6px">
              <button class="btn ${selectedStance === 'for' ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-stance-for" data-stance="for" ${practiceMode === 'assigned' ? 'disabled style="cursor:not-allowed;opacity:0.8"' : ''}>
                👍 Argue FOR (Support)
              </button>
              <button class="btn ${selectedStance === 'against' ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-stance-against" data-stance="against" ${practiceMode === 'assigned' ? 'disabled style="cursor:not-allowed;opacity:0.8"' : ''}>
                👎 Argue AGAINST (Oppose)
              </button>
            </div>
          </div>

          <!-- Suggested Arguments Card -->
          <div id="stance-hints-box" style="background:var(--card-sub);padding:14px 16px;border-radius:10px;margin-bottom:18px;border-left:3px solid var(--cyan)">
            <div class="eyebrow" id="hints-title">
              ${selectedStance === 'for' ? 'Suggested Key Arguments (FOR)' : 'Suggested Key Arguments (AGAINST)'}
            </div>
            <ul id="hints-list" style="margin:6px 0 0 18px;padding:0;font-size:13.5px;color:var(--cream-dim);line-height:1.6">
              ${((selectedStance === 'for' ? topic.forKeyPoints : topic.againstKeyPoints) || ['Articulate your points with clear evidence and logical progression.']).map(p => `<li>${esc(p)}</li>`).join('')}
            </ul>
          </div>

          <!-- Timed Format Controls -->
          <div style="background:rgba(255,255,255,0.02);padding:12px 16px;border-radius:10px;border:1px solid var(--line);margin-bottom:18px">
            <div class="row gap-md" style="align-items:center;flex-wrap:wrap">
              <div>
                <span class="field-label" style="font-size:13px;display:block">Speaking Limit:</span>
                <div class="row gap-xs" style="margin-top:4px" id="limit-pills-row">
                  <button class="pill ${targetDurationSeconds === 60 ? 'sprout font-bold' : ''}" data-target-sec="60" style="cursor:pointer">1 Min (60s)</button>
                  <button class="pill ${targetDurationSeconds === 120 ? 'sprout font-bold' : ''}" data-target-sec="120" style="cursor:pointer">2 Min (120s)</button>
                  <button class="pill ${targetDurationSeconds === 180 ? 'sprout font-bold' : ''}" data-target-sec="180" style="cursor:pointer">3 Min (180s)</button>
                </div>
              </div>
              <div class="spacer"></div>
              <!-- Prep Timer Controls -->
              <div class="row gap-xs" style="align-items:center">
                <button class="btn btn-outline btn-sm" id="btn-prep-timer" title="Start 2-minute prep timer to structure your thoughts">
                  ⏱️ Prep Timer (2:00)
                </button>
                <button class="btn btn-ghost btn-sm" id="btn-skip-prep" style="display:none">
                  ⏭️ Skip Prep &amp; Speak
                </button>
                ${SpeechInput.supported ? `
                  <button class="btn btn-ghost btn-sm" id="btn-toggle-input-mode" title="Toggle between Speech Mic and Typed Text input">
                    ⌨️ Type Input
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Active Countdown Status Bar -->
            <div id="timer-countdown-bar" style="display:none;margin-top:10px;padding:8px 12px;background:var(--panel-2);border-radius:8px;border:1px solid var(--cyan);align-items:center;gap:8px">
              <span id="countdown-icon">⏳</span>
              <span id="countdown-text" style="font-size:13.5px;font-weight:700;color:var(--cyan)">Prep Remaining: 02:00</span>
              <div class="spacer"></div>
              <span id="countdown-sub" style="font-size:12px;color:var(--cream-dim)">Organize your opening hook and 3 arguments</span>
            </div>
          </div>

          <!-- Browser Support Alert (Phase 3 Item 2) -->
          ${!SpeechInput.supported ? `
            <div class="card" style="background:rgba(239,68,68,0.08);border:1px solid var(--coral);padding:12px 16px;margin-bottom:16px">
              <div class="row gap-sm" style="align-items:center">
                <span style="font-size:20px">🎙️</span>
                <div style="font-size:13.5px;color:var(--cream-bright)">
                  <strong>Speech Recognition is unavailable in this browser.</strong> (Chrome or Edge recommended).
                  You can type your collegiate argument in the text area below.
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Speech Mic Input Section -->
          <div id="speech-input-section" style="${isTypedInputMode ? 'display:none;' : ''}">
            <div class="row gap-md" style="margin-top:10px;align-items:center">
              <button class="rec-btn" id="debate-rec">${ICONS.mic}</button>
              <div class="col" style="flex:1">
                <div id="debate-status" style="font-weight:700;font-size:15px;color:var(--cream-bright)">
                  Tap mic to record your speech (or use Prep Timer above)
                </div>
                <div id="debate-live-transcript" style="font-size:14px;color:var(--cream-dim);margin-top:4px;max-height:80px;overflow-y:auto"></div>
              </div>
            </div>
          </div>

          <!-- Typed Text Input Section (Phase 3 Item 2) -->
          <div id="typed-input-section" style="${!isTypedInputMode ? 'display:none;' : ''}margin-top:12px">
            <div style="margin-bottom:8px;display:flex;align-items:center">
              <label class="field-label" style="margin:0;font-size:13.5px">Type Your Debate Argument:</label>
              <div class="spacer"></div>
              <span id="typed-word-counter" class="pill coral" style="font-size:12px">0 / 40 min words</span>
            </div>
            <textarea id="debate-typed-text" rows="5" placeholder="Draft your collegiate debate argument here... (minimum 40 words required for scoring)" style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;background:var(--panel-2);color:var(--cream-bright);border:1px solid var(--line);font-size:14.5px;line-height:1.6;resize:vertical"></textarea>
            <div class="row gap-sm" style="margin-top:10px;align-items:center">
              <button class="btn btn-primary btn-sm" id="btn-submit-typed" disabled>
                🚀 Submit Argument for Scoring
              </button>
              ${SpeechInput.supported ? `
                <button class="btn btn-ghost btn-sm" id="btn-back-to-mic">
                  🎙️ Switch to Microphone
                </button>
              ` : ''}
              <div class="spacer"></div>
              <span style="font-size:12px;color:var(--cream-dim)">Timer defaults to 120s standard when typing</span>
            </div>
          </div>

          <!-- Transcript Review Mode (Phase 3 Item 3) -->
          <div id="transcript-review-box" style="display:none;margin-top:16px;background:var(--panel-2);padding:14px 18px;border-radius:12px;border:1.5px solid var(--cyan)">
            <div class="row" style="align-items:center;margin-bottom:8px">
              <strong style="color:var(--cyan);font-size:14.5px">📝 Review &amp; Edit Your Speech Transcript</strong>
              <div class="spacer"></div>
              <span id="review-word-count-badge" class="pill sprout" style="font-size:12px">0 words</span>
            </div>
            <div style="font-size:13px;color:var(--cream-dim);margin-bottom:10px">
              Review and correct any misrecognitions before submitting for collegiate AI scoring.
            </div>
            <textarea id="debate-review-textarea" rows="4" style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;background:var(--card-sub);color:var(--cream-bright);border:1px solid var(--line);font-size:14.5px;line-height:1.6;resize:vertical"></textarea>
            <div id="review-error-box" style="display:none;margin-top:8px;padding:8px 12px;background:rgba(239,68,68,0.12);border:1px solid var(--coral);border-radius:6px;font-size:13px;color:var(--coral)"></div>
            <div class="row gap-sm" style="margin-top:14px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" id="btn-submit-review">
                🚀 Submit for Collegiate AI Evaluation
              </button>
              <button class="btn btn-outline btn-sm" id="btn-re-record">
                🔄 Discard &amp; Record Again
              </button>
            </div>
          </div>

          <!-- Evaluation Results Section -->
          <div id="debate-result" style="margin-top:20px"></div>
        </div>
      </div>
    `;

    // 1. Department Filter Click Handlers
    $$('#dept-pills-row button').forEach((btn) => {
      btn.onclick = async () => {
        const dept = btn.dataset.dept;
        activeDept = dept;
        localStorage.setItem('lingrow_debate_dept', dept);
        if (typeof S !== 'undefined' && S.user) S.user.selectedDebateDept = dept;
        try {
          await Api.saveDebatePreferences({ department: dept !== 'All' ? dept : '' });
        } catch (e) {}
        toast(`Switched department filter to ${dept}`, 'sprout');
        renderDebateView();
      };
    });

    // 2. Next / Skip Topic Handler
    $('#skip-topic-btn').onclick = () => {
      toast('Loading next unattempted topic…', 'sprout');
      previousAttemptReport = null;
      renderDebateView();
    };

    const btnHistory = $('#btn-toggle-debate-history');
    if (btnHistory) {
      btnHistory.onclick = showDebateHistoryDrawer;
    }

    // 3. Mode Toggle Handlers
    $('#btn-mode-manual').onclick = () => {
      practiceMode = 'manual';
      localStorage.setItem('lingrow_debate_mode', 'manual');
      toast('Switched to manual stance selection', 'sprout');
      renderDebateView(topicData);
    };

    $('#btn-mode-assigned').onclick = async () => {
      practiceMode = 'assigned';
      localStorage.setItem('lingrow_debate_mode', 'assigned');
      toast('Requesting randomly assigned stance…', 'voice');
      try {
        const fresh = await Api.nextDebateTopic({
          assignStance: true,
          department: activeDept !== 'All' ? activeDept : '',
        });
        renderDebateView(fresh);
      } catch (e) {
        renderDebateView();
      }
    };

    // 4. Stance Button Handlers (Only active in manual mode)
    const btnFor = $('#btn-stance-for');
    const btnAgainst = $('#btn-stance-against');
    const hintsTitle = $('#hints-title');
    const hintsList = $('#hints-list');

    function updateStanceUI() {
      if (selectedStance === 'for') {
        btnFor.className = 'btn btn-primary btn-sm';
        btnAgainst.className = 'btn btn-ghost btn-sm';
        hintsTitle.textContent = 'Suggested Key Arguments (FOR)';
        hintsList.innerHTML = (topic.forKeyPoints || []).map((p) => `<li>${esc(p)}</li>`).join('');
      } else {
        btnFor.className = 'btn btn-ghost btn-sm';
        btnAgainst.className = 'btn btn-primary btn-sm';
        hintsTitle.textContent = 'Suggested Key Arguments (AGAINST)';
        hintsList.innerHTML = (topic.againstKeyPoints || []).map((p) => `<li>${esc(p)}</li>`).join('');
      }
    }

    if (practiceMode === 'manual') {
      btnFor.onclick = () => { selectedStance = 'for'; updateStanceUI(); };
      btnAgainst.onclick = () => { selectedStance = 'against'; updateStanceUI(); };
    }

    // 5. Target Duration Selector
    $$('#limit-pills-row button').forEach((btn) => {
      btn.onclick = () => {
        targetDurationSeconds = Number(btn.dataset.targetSec) || 120;
        $$('#limit-pills-row button').forEach((b) => b.classList.remove('sprout', 'font-bold'));
        btn.classList.add('sprout', 'font-bold');
        toast(`Speaking limit set to ${formatTimer(targetDurationSeconds)}`, 'sprout');
      };
    });

    // 6. Prep Timer Handlers
    const btnPrepTimer = $('#btn-prep-timer');
    const btnSkipPrep = $('#btn-skip-prep');
    const timerBar = $('#timer-countdown-bar');
    const countdownIcon = $('#countdown-icon');
    const countdownText = $('#countdown-text');
    const countdownSub = $('#countdown-sub');

    btnPrepTimer.onclick = () => {
      prepSecondsRemaining = 120;
      timerBar.style.display = 'flex';
      btnPrepTimer.style.display = 'none';
      btnSkipPrep.style.display = 'inline-block';
      countdownIcon.textContent = '⏳';
      countdownText.style.color = 'var(--cyan)';
      countdownText.textContent = `Prep Remaining: ${formatTimer(prepSecondsRemaining)}`;
      countdownSub.textContent = 'Review key terms & outline your 3 main arguments';

      prepInterval = setInterval(() => {
        prepSecondsRemaining--;
        if (prepSecondsRemaining <= 0) {
          clearInterval(prepInterval);
          prepInterval = null;
          timerBar.style.display = 'none';
          btnPrepTimer.style.display = 'inline-block';
          btnSkipPrep.style.display = 'none';
          toast('Prep time complete! Tap the mic to begin speaking.', 'voice');
          $('#debate-status').textContent = 'Prep finished! Tap the mic to deliver your argument.';
        } else {
          countdownText.textContent = `Prep Remaining: ${formatTimer(prepSecondsRemaining)}`;
        }
      }, 1000);
    };

    btnSkipPrep.onclick = () => {
      if (prepInterval) { clearInterval(prepInterval); prepInterval = null; }
      timerBar.style.display = 'none';
      btnPrepTimer.style.display = 'inline-block';
      btnSkipPrep.style.display = 'none';
      toast('Prep skipped. Tap mic when ready to speak.', 'sprout');
    };

    // 7. Input Mode Switching (Speech Mic vs Typed Text)
    const btnToggleInputMode = $('#btn-toggle-input-mode');
    const speechSection = $('#speech-input-section');
    const typedSection = $('#typed-input-section');
    const btnBackToMic = $('#btn-back-to-mic');

    if (btnToggleInputMode) {
      btnToggleInputMode.onclick = () => {
        isTypedInputMode = true;
        speechSection.style.display = 'none';
        typedSection.style.display = 'block';
        toast('Switched to Typed Text mode', 'sprout');
      };
    }

    if (btnBackToMic) {
      btnBackToMic.onclick = () => {
        isTypedInputMode = false;
        typedSection.style.display = 'none';
        speechSection.style.display = 'block';
        toast('Switched to Speech Mic mode', 'sprout');
      };
    }

    // 8. Typed Text Input Word Counter & Submit Logic
    const typedTextarea = $('#debate-typed-text');
    const typedCounter = $('#typed-word-counter');
    const btnSubmitTyped = $('#btn-submit-typed');

    if (typedTextarea) {
      typedTextarea.oninput = () => {
        const words = debateCountWords(typedTextarea.value);
        typedCounter.textContent = `${words} / 40 min words`;
        if (words >= 40) {
          typedCounter.className = 'pill sprout';
          btnSubmitTyped.disabled = false;
        } else {
          typedCounter.className = 'pill coral';
          btnSubmitTyped.disabled = true;
        }
      };

      btnSubmitTyped.onclick = () => {
        const text = typedTextarea.value.trim();
        const words = debateCountWords(text);
        if (words < 40) {
          toast(`Argument too short (${words} words). Minimum 40 words required.`, 'coral');
          return;
        }
        openTranscriptReview(text, targetDurationSeconds);
      };
    }

    // 9. Speech Recording with Auto-Restart & Accumulation (Phase 3 Item 1)
    const recBtn = $('#debate-rec');
    let speakingCountdown = targetDurationSeconds;
    let actualElapsedDuration = 0;

    recBtn.onclick = () => {
      if (!SpeechInput.supported) {
        toast('Speech recognition not supported in browser. Use typing mode below.', 'coral');
        return;
      }

      if (!SpeechInput.listening) {
        debateCancelSpeechSynthesis();
        // Clear prep timer if active
        if (prepInterval) {
          clearInterval(prepInterval);
          prepInterval = null;
          timerBar.style.display = 'none';
          btnPrepTimer.style.display = 'inline-block';
          btnSkipPrep.style.display = 'none';
        }

        recBtn.classList.add('on');
        speakingStartTime = Date.now();
        speakingCountdown = targetDurationSeconds;

        timerBar.style.display = 'flex';
        countdownIcon.textContent = '🔴';
        countdownText.style.color = 'var(--coral)';
        countdownText.textContent = `Speaking: ${formatTimer(speakingCountdown)} remaining`;
        countdownSub.textContent = `Auto-stops at limit (${formatTimer(targetDurationSeconds)})`;

        // Start speaking countdown with auto-stop at zero
        speakInterval = setInterval(() => {
          speakingCountdown--;
          if (speakingCountdown <= 0) {
            clearInterval(speakInterval);
            speakInterval = null;
            toast("⏱️ Time's up! Stopping speech and opening review…", 'warn');
            SpeechInput.stop();
          } else {
            countdownText.textContent = `Speaking: ${formatTimer(speakingCountdown)} remaining`;
          }
        }, 1000);

        $('#debate-status').textContent = `Defending stance: ${selectedStance.toUpperCase()}… Deliver your speech clearly!`;

        SpeechInput.start({
          // Auto-restart callback: continue recognition as long as speakingCountdown > 0
          shouldContinue: () => speakingCountdown > 0,
          onResult: ({ final, interim }) => {
            $('#debate-live-transcript').textContent = (final + ' ' + interim).trim();
          },
          onEnd: (capturedTranscript) => {
            recBtn.classList.remove('on');
            if (speakInterval) { clearInterval(speakInterval); speakInterval = null; }
            timerBar.style.display = 'none';

            actualElapsedDuration = speakingStartTime
              ? Math.max(1, Math.round((Date.now() - speakingStartTime) / 1000))
              : Math.max(1, Math.round(debateCountWords(capturedTranscript) / 2.16));

            if (!capturedTranscript || !capturedTranscript.trim()) {
              $('#debate-status').textContent = 'No speech captured — tap mic to try again';
              return;
            }

            $('#debate-status').textContent = 'Speech complete! Review and refine below before scoring.';
            openTranscriptReview(capturedTranscript, actualElapsedDuration);
          },
          onError: (e) => {
            recBtn.classList.remove('on');
            if (speakInterval) { clearInterval(speakInterval); speakInterval = null; }
            timerBar.style.display = 'none';
            $('#debate-status').textContent = 'Mic error: ' + e;
          },
        });
      } else {
        SpeechInput.stop();
      }
    };

    // 10. Open Transcript Review Mode (Phase 3 Item 3)
    const reviewBox = $('#transcript-review-box');
    const reviewTextarea = $('#debate-review-textarea');
    const reviewBadge = $('#review-word-count-badge');
    const reviewErrBox = $('#review-error-box');
    const btnSubmitReview = $('#btn-submit-review');
    const btnReRecord = $('#btn-re-record');
    let activeElapsedSeconds = 120;
    let currentIdempotencyKey = null;

    function openTranscriptReview(rawTranscript, elapsedSec) {
      activeElapsedSeconds = elapsedSec || targetDurationSeconds || 120;
      if (!currentIdempotencyKey) {
        currentIdempotencyKey = 'deb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      }
      reviewTextarea.value = rawTranscript || '';
      updateReviewWordCount();
      reviewErrBox.style.display = 'none';
      reviewBox.style.display = 'block';
      reviewTextarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function updateReviewWordCount() {
      const words = debateCountWords(reviewTextarea.value);
      reviewBadge.textContent = `${words} words`;
      if (words >= 40) {
        reviewBadge.className = 'pill sprout';
      } else {
        reviewBadge.className = 'pill coral';
      }
    }

    reviewTextarea.oninput = () => {
      updateReviewWordCount();
      reviewErrBox.style.display = 'none';
    };

    btnReRecord.onclick = () => {
      currentIdempotencyKey = 'deb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      reviewBox.style.display = 'none';
      reviewErrBox.style.display = 'none';
      $('#debate-live-transcript').textContent = '';
      $('#debate-status').textContent = 'Ready to record. Tap mic when prepared.';
      toast('Transcript discarded. Ready to record again.', 'sprout');
    };

    // Submit Transcript for Evaluation with Retry & Error Resilience (Items 3, 4, 6, 7)
    btnSubmitReview.onclick = async () => {
      debateCancelSpeechSynthesis();
      const finalSubmissionText = reviewTextarea.value.trim();
      const words = debateCountWords(finalSubmissionText);

      if (words < 40) {
        reviewErrBox.textContent = `Argument is too short (${words} words). Minimum 40 words required for collegiate debate scoring.`;
        reviewErrBox.style.display = 'block';
        return;
      }

      if (!currentIdempotencyKey) {
        currentIdempotencyKey = 'deb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      }

      // Disable button and show loading state
      btnSubmitReview.disabled = true;
      btnReRecord.disabled = true;
      btnSubmitReview.innerHTML = `<span class="spinner" style="margin-right:8px"></span> Judging your speech with Collegiate AI...`;
      $('#debate-status').textContent = 'Collegiate AI evaluation in progress (evaluating rubric & delivery)...';

      try {
        const payload = {
          topicId: topic._id,
          stance: selectedStance,
          transcript: finalSubmissionText,
          durationSeconds: isTypedInputMode ? undefined : activeElapsedSeconds,
          targetDurationSeconds,
          mode: isTypedInputMode ? 'typed' : practiceMode === 'assigned' ? 'assigned' : 'timed',
          stanceAssigned: practiceMode === 'assigned',
          assignedStanceToken: practiceMode === 'assigned' ? topicData.assignedStanceToken : undefined,
          idempotencyKey: currentIdempotencyKey,
        };

        const res = await Api.submitDebate(payload);
        const report = res.attempt;
        currentIdempotencyKey = null; // Clean reset on success

        // Hide review box upon successful evaluation
        reviewBox.style.display = 'none';
        renderResultCard(report, topic, selectedStance, topicData, res.xpBreakdown, res.newBadges);
        addStudentXP(res.xpBreakdown ? res.xpBreakdown.total : Math.round(15 + (report.scores?.overall || 70) / 5));
        $('#debate-status').textContent = 'Evaluation complete! Tap below to try again with fixes or argue opposite side.';
        toast('Debate scored successfully!', 'sprout');
      } catch (err) {
        btnSubmitReview.disabled = false;
        btnReRecord.disabled = false;
        btnSubmitReview.innerHTML = `🚀 Submit for Collegiate AI Evaluation`;

        // 409 Conflict: if server returns the saved attempt, render it directly! (Phase 3 Item 6)
        const savedAttempt = err.data?.attempt || err.attempt;
        if (err.status === 409 && savedAttempt) {
          currentIdempotencyKey = null;
          reviewBox.style.display = 'none';
          renderResultCard(savedAttempt, topic, selectedStance, topicData, err.data?.xpBreakdown, err.data?.newBadges);
          toast('Duplicate argument: Retrieved previously evaluated speech.', 'sprout');
          return;
        }

        // On transient network or validation failure, keep currentIdempotencyKey intact for retry
        let errMsg = 'Failed to evaluate debate argument. Please try again.';
        if (err.status === 400) {
          if (err.data && err.data.code === 'TRANSCRIPT_TOO_SHORT') {
            errMsg = `Speech too short (${err.data.wordCount || words} words). Minimum 40 words required for scoring.`;
          } else {
            errMsg = err.message || 'Validation error in argument submission.';
          }
        } else if (err.status === 409) {
          errMsg = 'Duplicate argument detected: This exact speech was already submitted recently. Add fresh reasoning or argue the other side.';
        } else if (err.status === 429) {
          errMsg = 'Rate limit reached: Too many attempts submitted recently. Please pause for 2 minutes before submitting again.';
        } else {
          errMsg = `Network or service error (${err.message || 'Offline'}). Your transcript is preserved above so you can retry safely.`;
        }

        reviewErrBox.textContent = errMsg;
        reviewErrBox.style.display = 'block';
        $('#debate-status').textContent = 'Submission error — your transcript is saved in the review box above.';
      }
    };

    // 11. Render Results with 5 Rubric Metrics, Deltas, XP Breakdown & Badges (Phase 3 & 4)
    function renderResultCard(report, currentTopic, practicedStance, curTopicData, xpBreakdown = null, newBadges = null) {
      const oppositeStance = practicedStance === 'for' ? 'against' : 'for';
      const dm = report.deliveryMetrics || {};
      const fb = typeof report.feedback === 'object' && report.feedback !== null ? report.feedback : null;
      const scores = report.scores || {};

      // Calculate score delta if "Try again with these fixes" was executed
      const deltas = previousAttemptReport ? debateCalculateScoreDeltas(scores, previousAttemptReport.scores) : null;

      // Extract 2 strengths and 2 improvements
      const strengths = fb && Array.isArray(fb.strengths) ? fb.strengths.slice(0, 2) : ['Clear voice delivery and coherent perspective.'];
      const improvements = fb && Array.isArray(fb.improvements) ? fb.improvements.slice(0, 2) : ['Incorporate more cited factual evidence.', 'Elaborate on potential counterarguments.'];
      const rewrittenExcerpt = fb && (fb.rewrittenExcerpt || fb.recommendation) ? (fb.rewrittenExcerpt || fb.recommendation) : '';

      // Determine duration label (Timed vs Estimated vs Suspect)
      let durationLabel = 'Timed';
      if (dm.durationSuspect) {
        durationLabel = 'Suspect (Estimated)';
      } else if (dm.durationEstimated) {
        durationLabel = 'Estimated';
      }

      // Hide WPM and target adherence if durationEstimated or durationSuspect
      const hidePaceMetrics = dm.durationEstimated || dm.durationSuspect;

      $('#debate-result').innerHTML = `
        <div class="card card-2" style="background:var(--color-surface-2);border:1.5px solid var(--line);margin-top:18px">
          <!-- Newly Earned Badges Celebration Banner (Phase 4 Item 2) -->
          ${newBadges && newBadges.length > 0 ? `
            <div class="card card-emerald-accent" style="background:linear-gradient(135deg, rgba(16,185,129,0.18), rgba(139,92,246,0.14));border:1.5px solid var(--emerald);padding:14px 18px;margin-bottom:14px">
              <div class="row gap-sm" style="align-items:center">
                <span style="font-size:32px">🎖️</span>
                <div>
                  <div style="font-size:16px;font-weight:700;color:var(--emerald)">New Badge Unlocked!</div>
                  ${newBadges.map(b => `<div style="font-size:13.5px;color:var(--cream-bright);margin-top:2px"><strong>${esc(b.name)}:</strong> ${esc(b.description)}</div>`).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Heuristic Lower Confidence Notice (Phase 3 Item 4) -->
          ${report.evaluator === 'heuristic' ? `
            <div style="background:rgba(245,158,11,0.12);border:1px solid var(--amber);padding:10px 14px;border-radius:8px;margin-bottom:14px">
              <div class="row gap-sm" style="align-items:center">
                <span style="font-size:18px">⚡</span>
                <div style="font-size:12.5px;color:var(--cream-bright);line-height:1.4">
                  <strong>Evaluated by LinGrow Heuristic Engine:</strong> Local Ollama neural pipeline offline; offline rubric fallback active (confidence is lower than neural evaluation).
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Score Header, XP Breakdown & Delta (Phase 4 Item 1) -->
          <div class="row gap-sm" style="margin-bottom:14px;align-items:center;flex-wrap:wrap">
            <span class="pill sprout" style="font-size:16px;font-weight:700">
              Overall Score: ${scores.overall}/100
              ${deltas ? debateFormatDeltaBadge(deltas.overall, ' pts') : ''}
            </span>
            <span class="pill voice" style="font-size:13px;font-weight:700">
              +${xpBreakdown?.total ?? Math.round(15 + (scores.overall || 70) / 5)} XP Earned
            </span>
            ${xpBreakdown ? `
              <span class="pill" style="font-size:11.5px;color:var(--cream-dim);border-color:var(--line)">
                Base: ${xpBreakdown.base} XP
                ${xpBreakdown.improvementBonus ? ` • Improvement: +${xpBreakdown.improvementBonus} XP` : ''}
                ${xpBreakdown.stanceBonus ? ` • Stance Agility: +${xpBreakdown.stanceBonus} XP` : ''}
                ${xpBreakdown.capped ? ' (Capped at 50 XP max)' : ''}
              </span>
            ` : ''}
            <div class="spacer"></div>
            <button class="btn btn-outline btn-sm" id="btn-result-view-trends">📈 Skill Trends</button>
            <span class="pill warn" style="font-size:12px;font-weight:700">Stance: ${practicedStance.toUpperCase()}</span>
          </div>

          <!-- All 5 Rubric Metrics Grid (Phase 3 Item 4) -->
          <div class="grid grid-5 gap-xs" style="margin-bottom:16px">
            <div class="card" style="text-align:center;padding:10px 6px">
              <div class="eyebrow" style="font-size:11px">Logic</div>
              <div style="font-size:19px;font-weight:700;color:var(--purple)">
                ${scores.logic ?? scores.argument ?? 70}%
              </div>
              ${deltas ? debateFormatDeltaBadge(deltas.logic) : ''}
            </div>
            <div class="card" style="text-align:center;padding:10px 6px">
              <div class="eyebrow" style="font-size:11px">Persuasion</div>
              <div style="font-size:19px;font-weight:700;color:var(--emerald)">
                ${scores.persuasion ?? scores.counterargument ?? scores.persuasiveness ?? 70}%
              </div>
              ${deltas ? debateFormatDeltaBadge(deltas.persuasion) : ''}
            </div>
            <div class="card" style="text-align:center;padding:10px 6px">
              <div class="eyebrow" style="font-size:11px">Clarity</div>
              <div style="font-size:19px;font-weight:700;color:var(--cyan)">
                ${scores.clarity ?? 70}%
              </div>
              ${deltas ? debateFormatDeltaBadge(deltas.clarity) : ''}
            </div>
            <div class="card" style="text-align:center;padding:10px 6px">
              <div class="eyebrow" style="font-size:11px">Vocabulary</div>
              <div style="font-size:19px;font-weight:700;color:var(--amber)">
                ${scores.vocabulary ?? 70}%
              </div>
              ${deltas ? debateFormatDeltaBadge(deltas.vocabulary) : ''}
            </div>
            <div class="card" style="text-align:center;padding:10px 6px">
              <div class="eyebrow" style="font-size:11px">Structure</div>
              <div style="font-size:19px;font-weight:700;color:var(--coral)">
                ${scores.structure ?? 75}%
              </div>
              ${deltas ? debateFormatDeltaBadge(deltas.structure) : ''}
            </div>
          </div>

          <!-- Delivery Metrics Breakdown -->
          <div style="background:var(--panel-2);padding:12px 14px;border-radius:10px;border:1px solid var(--white-border);margin-bottom:16px">
            <div class="eyebrow" style="margin-bottom:6px">📊 Objective Delivery Metrics</div>
            <div class="row gap-md" style="flex-wrap:wrap;font-size:13px;color:var(--cream-bright)">
              <div>⏱️ <strong>Duration:</strong> ${dm.speechDurationSeconds || report.durationSeconds || 0}s <span style="font-size:11px;color:var(--cream-dim)">(${durationLabel})</span></div>
              ${!hidePaceMetrics ? `<div>⚡ <strong>Pace:</strong> ${dm.wpm || 0} WPM</div>` : ''}
              ${!hidePaceMetrics ? `<div>🎯 <strong>Target Adherence:</strong> ${dm.targetAdherencePercent || 0}%</div>` : ''}
              <div>💬 <strong>Filler Words:</strong> ${dm.fillerCount || 0} ${dm.fillerWords && dm.fillerWords.length > 0 ? `(${dm.fillerWords.map(w => esc(w)).join(', ')})` : '(None detected)'}</div>
            </div>
          </div>

          <!-- Structured Strengths, Improvements & Exemplar Rewrite (Phase 3 Item 4 & 7) -->
          <div style="margin-bottom:18px">
            <div class="col gap-sm" style="font-size:14px;line-height:1.6;color:var(--color-text)">
              <div>
                <strong style="color:var(--emerald)">✅ Strengths:</strong>
                <ul style="margin:4px 0 0 18px;padding:0;color:var(--cream-bright);font-size:13.5px">
                  ${strengths.map(s => `<li>${esc(s)}</li>`).join('')}
                </ul>
              </div>
              <div>
                <strong style="color:var(--coral)">⚠️ Areas for Improvement:</strong>
                <ul style="margin:4px 0 0 18px;padding:0;color:var(--cream-bright);font-size:13.5px">
                  ${improvements.map(i => `<li>${esc(i)}</li>`).join('')}
                </ul>
              </div>
              ${rewrittenExcerpt ? `
                <div style="background:var(--card-sub);padding:10px 14px;border-radius:8px;border-left:3px solid var(--cyan);margin-top:4px">
                  <strong style="color:var(--cyan);font-size:13px">💡 Exemplar Collegiate Rewrite:</strong>
                  <div style="font-size:13px;color:var(--cream-bright);margin-top:4px;font-style:italic">"${esc(rewrittenExcerpt)}"</div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Action Buttons: Face Rebuttal, Try Again Delta, Opposite Side, Next Topic (Phase 3 & 5) -->
          <div class="row gap-sm" style="flex-wrap:wrap;border-top:1px solid var(--line);padding-top:14px;align-items:center">
            <button class="btn btn-primary btn-sm" id="btn-face-rebuttal" style="background:linear-gradient(135deg, var(--coral), var(--purple));color:#fff;border:none">
              ⚔️ Face AI Rebuttal Round (60s)
            </button>
            <button class="btn btn-primary btn-sm" id="btn-try-again-fixes">
              🔁 Try Again with These Fixes
            </button>
            <button class="btn btn-outline btn-sm" id="btn-argue-opposite">
              🔄 Argue Opposite Side (${oppositeStance.toUpperCase()})
            </button>
            <button class="btn btn-ghost btn-sm" id="btn-next-topic-res">
              ➡️ Next Topic
            </button>
            <div class="spacer"></div>
            <span style="font-size:12px;color:var(--cream-dim)">Track score deltas and face the AI rebuttal to master debate!</span>
          </div>

          <!-- AI Rebuttal Round Container (Phase 5) -->
          <div id="debate-rebuttal-container" style="margin-top:16px;display:none"></div>
        </div>
      `;

      // Handler: View Trends
      const btnViewTrends = $('#btn-result-view-trends');
      if (btnViewTrends) {
        btnViewTrends.onclick = showDebateHistoryDrawer;
      }

      // Handler: Face AI Rebuttal Round (Phase 5)
      const btnFaceRebuttal = $('#btn-face-rebuttal');
      if (btnFaceRebuttal) {
        btnFaceRebuttal.onclick = async () => {
          btnFaceRebuttal.disabled = true;
          btnFaceRebuttal.innerHTML = `<span class="spinner" style="margin-right:6px"></span> AI Opponent Preparing Counter...`;

          try {
            const startRes = await Api.startDebateRebuttal(report._id);
            const container = $('#debate-rebuttal-container');
            container.style.display = 'block';
            btnFaceRebuttal.innerHTML = '⚔️ Rebuttal Round Active';
            btnFaceRebuttal.style.opacity = '0.7';

            container.innerHTML = `
              <div class="card card-white-accent" style="border:2px solid var(--purple);background:var(--color-surface-2);padding:20px;border-radius:14px;margin-top:14px">
                <div class="row gap-sm" style="align-items:center;margin-bottom:12px;flex-wrap:wrap">
                  <span class="pill purple" style="font-size:13px;font-weight:700">⚔️ Rebuttal Round 2</span>
                  <span class="pill warn" style="font-weight:700">AI Opponent: ${esc(startRes.counterStance.toUpperCase())}</span>
                  <span class="pill voice">⏱️ 60-Second Challenge</span>
                  <div class="spacer"></div>
                  <button class="btn btn-outline btn-sm" id="btn-tts-counter">🔊 Listen to Counter</button>
                </div>

                <!-- AI Counter Argument Display -->
                <div style="background:rgba(139,92,246,0.08);border:1.5px solid var(--purple);border-radius:10px;padding:14px 16px;margin-bottom:14px">
                  <div class="eyebrow" style="color:var(--purple);margin-bottom:4px">🤖 AI Opponent's Counter-Argument:</div>
                  <div style="font-size:14.5px;line-height:1.6;color:var(--cream-bright);font-style:italic">
                    "${esc(startRes.counterArgument)}"
                  </div>
                  ${startRes.counterKeyPoints && startRes.counterKeyPoints.length > 0 ? `
                    <div class="row gap-xs" style="margin-top:10px;flex-wrap:wrap;align-items:center">
                      <span class="eyebrow" style="font-size:10.5px;margin-right:4px">Points to Dismantle:</span>
                      ${startRes.counterKeyPoints.map(kp => `<span class="pill coral" style="font-size:11px">${esc(kp)}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>

                <!-- Rebuttal Speech & Input Box -->
                <div style="background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px">
                  <div class="row" style="align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
                    <div>
                      <strong style="color:var(--cream-bright);font-size:14px">Deliver Your 60s Rebuttal</strong>
                      <div style="font-size:12px;color:var(--cream-dim)">Directly dismantle the AI's claims with logic and evidence. Minimum 20 words.</div>
                    </div>
                    <div class="spacer"></div>
                    <button class="btn btn-ghost btn-sm" id="btn-toggle-rebuttal-mode" style="font-size:12px">⌨️ Switch to Typing Mode</button>
                  </div>

                  <!-- 60s Timer Countdown -->
                  <div id="reb-timer-bar" style="display:none;align-items:center;gap:10px;padding:8px 14px;background:rgba(244,63,94,0.15);border:1px solid var(--coral);border-radius:8px;margin-bottom:12px">
                    <span id="reb-timer-icon">🔴</span>
                    <strong id="reb-timer-text" style="color:var(--coral);font-size:13.5px">Speaking: 60s remaining</strong>
                    <div class="spacer"></div>
                    <span style="font-size:11px;color:var(--cream-dim)">Auto-stops at 60s limit</span>
                  </div>

                  <!-- Mic Mode -->
                  <div id="reb-mic-section" style="text-align:center;padding:12px 0">
                    <button class="rec-btn" id="reb-mic-btn" title="Tap to start 60s rebuttal speech">
                      ${ICONS.mic}
                    </button>
                    <div id="reb-mic-status" style="margin-top:8px;font-size:13px;color:var(--cream-dim)">
                      Tap mic to deliver your rebuttal against the AI.
                    </div>
                    <div id="reb-live-transcript" style="font-style:italic;font-size:13.5px;color:var(--cream-bright);margin-top:8px;min-height:20px"></div>
                  </div>

                  <!-- Typed Mode (Hidden by default) -->
                  <div id="reb-typed-section" style="display:none;margin-top:10px">
                    <textarea id="reb-typed-input" rows="4" placeholder="Type your collegiate rebuttal directly refuting the AI's points..." style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;background:var(--card-sub);color:var(--cream-bright);border:1px solid var(--line);font-size:14px;line-height:1.6"></textarea>
                    <div class="row" style="margin-top:8px">
                      <div class="spacer"></div>
                      <button class="btn btn-primary btn-sm" id="btn-reb-review-typed">Review &amp; Submit</button>
                    </div>
                  </div>
                </div>

                <!-- Review Box Before Submitting Rebuttal -->
                <div id="reb-review-box" style="display:none;background:var(--panel-2);padding:14px 16px;border-radius:12px;border:1.5px solid var(--cyan)">
                  <div class="row" style="align-items:center;margin-bottom:8px">
                    <strong style="color:var(--cyan);font-size:14px">📝 Review &amp; Edit Your Rebuttal Transcript</strong>
                    <div class="spacer"></div>
                    <span id="reb-word-count-badge" class="pill sprout" style="font-size:12px">0 words</span>
                  </div>
                  <textarea id="reb-review-textarea" rows="3" style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;background:var(--card-sub);color:var(--cream-bright);border:1px solid var(--line);font-size:14px;line-height:1.6"></textarea>
                  <div id="reb-error-box" style="display:none;margin-top:8px;padding:8px 12px;background:rgba(239,68,68,0.12);border:1px solid var(--coral);border-radius:6px;font-size:13px;color:var(--coral)"></div>
                  <div class="row gap-sm" style="margin-top:12px">
                    <button class="btn btn-primary btn-sm" id="btn-reb-submit-final">
                      🚀 Submit Rebuttal for Collegiate Evaluation
                    </button>
                    <button class="btn btn-outline btn-sm" id="btn-reb-rerecord">
                      🔄 Discard &amp; Try Again
                    </button>
                  </div>
                </div>

                <!-- Rebuttal Evaluation Card (Appears after submission) -->
                <div id="reb-result-area" style="margin-top:16px"></div>
              </div>
            `;

            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // TTS Speech Synthesis Handler
            const btnTts = container.querySelector('#btn-tts-counter');
            if (btnTts && window.speechSynthesis) {
              btnTts.onclick = () => {
                if (window.speechSynthesis.speaking) {
                  window.speechSynthesis.cancel();
                  btnTts.textContent = '🔊 Listen to Counter';
                } else {
                  const utterance = new SpeechSynthesisUtterance(startRes.counterArgument);
                  utterance.rate = 0.95;
                  utterance.onend = () => { btnTts.textContent = '🔊 Listen to Counter'; };
                  utterance.onerror = () => { btnTts.textContent = '🔊 Listen to Counter'; };
                  window.speechSynthesis.speak(utterance);
                  btnTts.textContent = '⏹️ Stop Audio';
                }
              };
            }

            // Input Mode Toggle
            let isRebTyped = !SpeechInput.supported;
            const btnToggleInput = container.querySelector('#btn-toggle-rebuttal-mode');
            const micSec = container.querySelector('#reb-mic-section');
            const typedSec = container.querySelector('#reb-typed-section');

            btnToggleInput.onclick = () => {
              isRebTyped = !isRebTyped;
              if (isRebTyped) {
                micSec.style.display = 'none';
                typedSec.style.display = 'block';
                btnToggleInput.textContent = '🎙️ Switch to Mic Mode';
              } else {
                micSec.style.display = 'block';
                typedSec.style.display = 'none';
                btnToggleInput.textContent = '⌨️ Switch to Typing Mode';
              }
            };

            // Review Box Elements
            const rebReviewBox = container.querySelector('#reb-review-box');
            const rebReviewTextarea = container.querySelector('#reb-review-textarea');
            const rebWordBadge = container.querySelector('#reb-word-count-badge');
            const rebErrBox = container.querySelector('#reb-error-box');
            const btnSubmitRebFinal = container.querySelector('#btn-reb-submit-final');
            const btnRebRerecord = container.querySelector('#btn-reb-rerecord');
            let rebDuration = 60;

            function openRebReview(text, duration) {
              rebDuration = duration || 60;
              rebReviewTextarea.value = text || '';
              updateRebWordCount();
              rebErrBox.style.display = 'none';
              rebReviewBox.style.display = 'block';
              rebReviewTextarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            function updateRebWordCount() {
              const words = debateCountWords(rebReviewTextarea.value);
              rebWordBadge.textContent = `${words} words`;
              rebWordBadge.className = words >= 20 ? 'pill sprout' : 'pill coral';
            }

            rebReviewTextarea.oninput = updateRebWordCount;

            // Typed Mode Review Trigger
            container.querySelector('#btn-reb-review-typed').onclick = () => {
              const text = container.querySelector('#reb-typed-input').value.trim();
              if (debateCountWords(text) < 20) {
                toast('Rebuttal too short. Minimum 20 words required.', 'coral');
                return;
              }
              openRebReview(text, 0);
            };

            // Mic Mode Recording Trigger (60s countdown)
            const rebMicBtn = container.querySelector('#reb-mic-btn');
            const rebTimerBar = container.querySelector('#reb-timer-bar');
            const rebTimerText = container.querySelector('#reb-timer-text');
            let rebCountdown = 60;
            let rebInterval = null;
            let rebStartTime = 0;

            rebMicBtn.onclick = () => {
              if (!SpeechInput.supported) {
                toast('Microphone not supported. Please use typing mode.', 'coral');
                return;
              }

              if (!SpeechInput.listening) {
                debateCancelSpeechSynthesis();
                rebMicBtn.classList.add('on');
                rebCountdown = 60;
                rebStartTime = Date.now();
                rebTimerBar.style.display = 'flex';
                rebTimerText.textContent = `Speaking: ${rebCountdown}s remaining`;

                rebInterval = setInterval(() => {
                  rebCountdown--;
                  if (rebCountdown <= 0) {
                    clearInterval(rebInterval);
                    rebInterval = null;
                    SpeechInput.stop();
                    toast('⏱️ Rebuttal limit reached! Opening review…', 'warn');
                  } else {
                    rebTimerText.textContent = `Speaking: ${rebCountdown}s remaining`;
                  }
                }, 1000);

                container.querySelector('#reb-mic-status').textContent = 'Defending stance against AI counter… Speak articulately!';

                SpeechInput.start({
                  shouldContinue: () => rebCountdown > 0,
                  onResult: ({ final, interim }) => {
                    container.querySelector('#reb-live-transcript').textContent = (final + ' ' + interim).trim();
                  },
                  onEnd: (captured) => {
                    rebMicBtn.classList.remove('on');
                    if (rebInterval) { clearInterval(rebInterval); rebInterval = null; }
                    rebTimerBar.style.display = 'none';
                    const elapsed = rebStartTime ? Math.max(1, Math.round((Date.now() - rebStartTime) / 1000)) : 60;
                    if (!captured || !captured.trim()) {
                      container.querySelector('#reb-mic-status').textContent = 'No speech detected — tap mic to try again.';
                      return;
                    }
                    container.querySelector('#reb-mic-status').textContent = 'Rebuttal complete! Review below.';
                    openRebReview(captured, elapsed);
                  },
                  onError: (e) => {
                    rebMicBtn.classList.remove('on');
                    if (rebInterval) { clearInterval(rebInterval); rebInterval = null; }
                    rebTimerBar.style.display = 'none';
                    container.querySelector('#reb-mic-status').textContent = 'Mic error: ' + e;
                  },
                });
              } else {
                SpeechInput.stop();
              }
            };

            btnRebRerecord.onclick = () => {
              rebReviewBox.style.display = 'none';
              container.querySelector('#reb-live-transcript').textContent = '';
              container.querySelector('#reb-mic-status').textContent = 'Ready to re-record rebuttal. Tap mic when prepared.';
            };

            // Submit Rebuttal to Server
            btnSubmitRebFinal.onclick = async () => {
              debateCancelSpeechSynthesis();
              const text = rebReviewTextarea.value.trim();
              const words = debateCountWords(text);
              if (words < 20) {
                rebErrBox.textContent = `Rebuttal is too short (${words} words). Minimum 20 words required.`;
                rebErrBox.style.display = 'block';
                return;
              }

              btnSubmitRebFinal.disabled = true;
              btnRebRerecord.disabled = true;
              btnSubmitRebFinal.innerHTML = `<span class="spinner" style="margin-right:8px"></span> Scoring Rebuttal...`;

              try {
                const subRes = await Api.submitDebateRebuttal({
                  rebuttalToken: startRes.rebuttalToken,
                  transcript: text,
                  durationSeconds: isRebTyped ? 0 : rebDuration,
                  mode: isRebTyped ? 'typed' : 'timed',
                  idempotencyKey: 'reb_' + Date.now(),
                });

                rebReviewBox.style.display = 'none';
                if (subRes.xpBreakdown?.rebuttalXp > 0) {
                  addStudentXP(subRes.xpBreakdown.rebuttalXp);
                }

                renderRebuttalResultCard(container.querySelector('#reb-result-area'), report, subRes.rebuttal, subRes.xpBreakdown, subRes.newBadges);
                toast('Rebuttal scored successfully!', 'sprout');
              } catch (subErr) {
                btnSubmitRebFinal.disabled = false;
                btnRebRerecord.disabled = false;
                btnSubmitRebFinal.innerHTML = `🚀 Submit Rebuttal for Collegiate Evaluation`;
                rebErrBox.textContent = subErr.message || 'Error submitting rebuttal. Your transcript is preserved above.';
                rebErrBox.style.display = 'block';
              }
            };
          } catch (err) {
            btnFaceRebuttal.disabled = false;
            btnFaceRebuttal.innerHTML = `⚔️ Face AI Rebuttal (60s)`;
            toast(err.message || 'Could not start rebuttal round.', 'coral');
          }
        };
      }

      function renderRebuttalResultCard(targetEl, openRep, reb, xpBk, newBdg) {
        const sc = reb.scores || {};
        const fb = reb.feedback || {};
        const compositeScore = Math.round(((openRep.scores?.overall || 70) + (sc.overall || 70)) / 2);

        targetEl.innerHTML = `
          <div class="card" style="background:var(--color-surface-1);border:1.5px solid var(--purple);border-radius:12px;padding:18px;margin-top:14px">
            ${newBdg && newBdg.length > 0 ? `
              <div class="card card-emerald-accent" style="background:linear-gradient(135deg, rgba(16,185,129,0.18), rgba(139,92,246,0.14));border:1.5px solid var(--emerald);padding:12px 16px;margin-bottom:14px">
                <div class="row gap-sm" style="align-items:center">
                  <span style="font-size:28px">🎖️</span>
                  <div>
                    <strong style="color:var(--emerald);font-size:15px">New Badge Unlocked!</strong>
                    ${newBdg.map(b => `<div style="font-size:13px;color:var(--cream-bright);margin-top:2px"><strong>${esc(b.name)}:</strong> ${esc(b.description)}</div>`).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Match Total & Rebuttal Header -->
            <div class="row gap-sm" style="align-items:center;margin-bottom:14px;flex-wrap:wrap">
              <span class="pill purple" style="font-size:15px;font-weight:700">
                Rebuttal Score: ${sc.overall}/100
              </span>
              <span class="pill sprout" style="font-size:13px;font-weight:700">
                🏆 Match Total: ${compositeScore}/100
              </span>
              <span class="pill voice" style="font-size:12px;font-weight:700">
                +${xpBk?.rebuttalXp ?? 0} Rebuttal XP Earned
              </span>
            </div>

            <!-- 5 Rebuttal Rubric Metrics Grid -->
            <div class="grid grid-5 gap-xs" style="margin-bottom:16px">
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Responsiveness</div>
                <div style="font-size:17px;font-weight:700;color:var(--purple)">${sc.responsiveness ?? 70}%</div>
              </div>
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Refutation</div>
                <div style="font-size:17px;font-weight:700;color:var(--coral)">${sc.refutation ?? 70}%</div>
              </div>
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Evidence</div>
                <div style="font-size:17px;font-weight:700;color:var(--cyan)">${sc.evidence ?? 70}%</div>
              </div>
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Clarity</div>
                <div style="font-size:17px;font-weight:700;color:var(--emerald)">${sc.clarity ?? 70}%</div>
              </div>
              <div class="card" style="text-align:center;padding:8px 4px">
                <div class="eyebrow" style="font-size:10px">Overall</div>
                <div style="font-size:17px;font-weight:700;color:var(--amber)">${sc.overall ?? 70}%</div>
              </div>
            </div>

            <!-- Strengths & Improvements -->
            <div class="col gap-xs" style="font-size:13.5px;color:var(--color-text);margin-bottom:14px">
              ${fb.strengths && fb.strengths.length > 0 ? `
                <div>
                  <strong style="color:var(--emerald)">✅ Rebuttal Strengths:</strong>
                  <ul style="margin:4px 0 0 16px;padding:0">
                    ${fb.strengths.map(s => `<li>${esc(s)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              ${fb.improvements && fb.improvements.length > 0 ? `
                <div style="margin-top:4px">
                  <strong style="color:var(--coral)">⚠️ Areas for Growth:</strong>
                  <ul style="margin:4px 0 0 16px;padding:0">
                    ${fb.improvements.map(i => `<li>${esc(i)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              ${fb.rewrittenExcerpt ? `
                <div style="background:var(--card-sub);padding:10px 14px;border-radius:8px;border-left:3px solid var(--purple);margin-top:6px">
                  <strong style="color:var(--purple);font-size:12.5px">💡 Collegiate Rebuttal Rewrite:</strong>
                  <div style="font-size:13px;color:var(--cream-bright);margin-top:2px;font-style:italic">"${esc(fb.rewrittenExcerpt)}"</div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }

      // Handler: Try Again with These Fixes (Phase 3 Item 5)
      $('#btn-try-again-fixes').onclick = () => {
        previousAttemptReport = report; // Store for delta calculation
        $('#debate-result').innerHTML = '';
        $('#debate-live-transcript').textContent = '';
        reviewBox.style.display = 'none';
        $('#debate-status').textContent = 'Re-practicing with feedback in mind. Tap mic or type when ready!';
        toast('Ready to retry! Score delta will be displayed after submission.', 'sprout');
      };

      // Handler: Next Topic
      $('#btn-next-topic-res').onclick = () => {
        toast('Loading next unattempted topic…', 'sprout');
        previousAttemptReport = null;
        renderDebateView();
      };

      // Handler: Argue Opposite Side
      $('#btn-argue-opposite').onclick = () => {
        selectedStance = oppositeStance;
        previousAttemptReport = null;
        practiceMode = 'manual';
        localStorage.setItem('lingrow_debate_mode', 'manual');

        updateStanceUI();
        btnFor.disabled = false;
        btnAgainst.disabled = false;
        btnFor.style.cursor = 'pointer';
        btnAgainst.style.cursor = 'pointer';
        btnFor.style.opacity = '1';
        btnAgainst.style.opacity = '1';

        $('#debate-live-transcript').textContent = '';
        $('#debate-result').innerHTML = '';
        reviewBox.style.display = 'none';
        $('#debate-status').textContent = `Ready to argue ${oppositeStance.toUpperCase()}! Review suggested arguments above and begin.`;
        toast(`Flipped to ${oppositeStance.toUpperCase()}! Defend the counter-perspective.`, 'sprout');
      };
    }
  }
};

/* ---------------------------- AI TUTOR CHAT ---------------------------- */
VIEW_RENDERERS['tutor'] = async (mount) => {
  let history = [];
  try { history = await Api.tutorHistory(); } catch (e) { history = []; }
  const user = (typeof S !== 'undefined' ? S.user : null) || {};
  let voiceChatActive = false;
  let readAloudActive = localStorage.getItem('lingrow_tutor_read_aloud') !== 'false';
  let showLiveFeed = false;
  let showRagDrawer = false;

  mount.innerHTML = `
    <div class="card tutor-card">
      <!-- Minimalist Header -->
      <div class="tutor-header-clean">
        <div class="tutor-coach-info">
          <div class="brand-mark" style="width:32px;height:32px;border-radius:10px;font-size:18px;background:linear-gradient(135deg,#F59E0B,#EF4444);color:#0F172A;display:flex;align-items:center;justify-content:center;flex-shrink:0">🐉</div>
          <div style="min-width:0">
            <div style="font-weight:700;font-size:15px;color:var(--color-text);line-height:1.2;white-space:nowrap">Ignis &middot; Dragon Mentor</div>
            <div style="font-size:11px;color:var(--emerald);display:flex;align-items:center;gap:4px;white-space:nowrap">
              <span class="status-dot ok" style="width:6px;height:6px"></span> Dragon Academy &middot; Online
            </div>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="tutor-act-group">
          <button class="icon-btn tutor-act-icon ${readAloudActive ? 'active' : ''}" id="toggle-read-aloud" title="Toggle Auto Read-Aloud (${readAloudActive ? 'ON' : 'OFF'})" aria-label="Auto Read Aloud">
            ${readAloudActive ? '🔊' : '🔇'}
          </button>
          <button class="icon-btn tutor-act-icon" id="toggle-voice-mode" title="Toggle Continuous Hands-Free Voice" aria-label="Auto Voice">
            🎙️
          </button>
          <button class="icon-btn tutor-act-icon" id="btn-toggle-feed" title="Placement & Tech Topics" aria-label="Placement Topics">
            🌐
          </button>
          <button class="icon-btn tutor-act-icon" id="btn-toggle-rag" title="Study Notes" aria-label="Study Notes">
            📚
          </button>
          <button class="icon-btn tutor-act-icon" id="btn-toggle-memory" title="AI Memory &amp; Learning Context" aria-label="AI Memory">
            🧠
          </button>
          <button class="icon-btn tutor-act-icon" id="btn-clear-chat" title="Clear Conversation" aria-label="Clear Chat">
            🗑️
          </button>
        </div>
      </div>

      <!-- Live Web Topics Drawer (Collapsible) -->
      <div id="live-web-feed" style="display:none;margin-bottom:10px;padding:10px 14px;background:var(--cyan-glow);border-left:3px solid var(--cyan);border-radius:10px;font-size:13px;color:var(--cream-bright)">
        <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px">
          🌐 Live Placement &amp; Tech Topics
        </div>
        <div id="live-web-feed-content" style="color:var(--cream-dim);font-size:12.5px;line-height:1.5">Fetching latest placement topics...</div>
      </div>

      <!-- Study Notes Management Drawer (Collapsible) -->
      <div id="rag-drawer" style="display:none;margin-bottom:10px;padding:12px 14px;background:var(--color-surface-2);border:1px solid var(--line);border-radius:10px;font-size:13px">
        <div class="row gap-sm" style="align-items:center;margin-bottom:8px;flex-wrap:wrap">
          <strong style="color:var(--cream-bright)">📄 Study Notes &amp; Syllabus Ingestion</strong>
          <div class="spacer"></div>
          <span style="font-size:11.5px;color:var(--cream-dim)">Ask questions against your uploaded study notes</span>
        </div>
        <div class="row gap-sm" style="margin-bottom:8px;flex-wrap:wrap">
          <input type="text" id="rag-doc-title" placeholder="Document Title (e.g. Operating Systems Unit 1)" style="flex:1;min-width:160px;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--panel-2);color:var(--cream-bright);font-size:13.5px">
          <button class="btn btn-primary btn-sm" id="btn-save-rag-doc" style="white-space:nowrap">Save &amp; Index</button>
        </div>
        <textarea id="rag-doc-text" placeholder="Paste notes, lecture transcript, or textbook summary text here..." rows="3" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--panel-2);color:var(--cream-bright);font-size:13.5px;resize:vertical"></textarea>
        <div id="rag-docs-list" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"></div>
      </div>

      <!-- AI Tutor Memory & Context Drawer (Collapsible) -->
      <div id="memory-drawer" style="display:none;margin-bottom:10px;padding:12px 14px;background:rgba(255,255,255,0.02);border:1px solid var(--line);border-radius:10px;font-size:13px">
        <div class="row gap-sm" style="align-items:center;margin-bottom:6px;flex-wrap:wrap">
          <strong style="color:var(--cream-bright)">🧠 AI Tutor Memory &amp; Learning Context</strong>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-xs" id="btn-clear-all-memories" style="color:var(--coral);font-size:11px">Clear Memories</button>
        </div>
        <div style="font-size:12px;color:var(--cream-dim);margin-bottom:10px">
          Your AI Tutor automatically remembers your target goals, learning focus, and preferences across sessions.
        </div>
        <div class="row gap-sm" style="margin-bottom:8px;flex-wrap:wrap">
          <input type="text" id="memory-input-fact" placeholder="Add custom context (e.g. Preparing for TCS technical interview, focus on concise answers)" style="flex:1;min-width:200px;padding:7px 10px;border-radius:6px;border:1px solid var(--line);background:var(--panel-2);color:var(--cream-bright);font-size:13px">
          <select id="memory-input-category" style="padding:7px 8px;border-radius:6px;border:1px solid var(--line);background:var(--panel-2);color:var(--cream-bright);font-size:12.5px">
            <option value="goal">Goal</option>
            <option value="preference">Preference</option>
            <option value="topic">Topic</option>
            <option value="weakness">Focus Area</option>
          </select>
          <button class="btn btn-primary btn-sm" id="btn-save-memory" style="white-space:nowrap">+ Remember</button>
        </div>
        <div id="memories-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
      </div>

      <!-- Main Chat Area -->
      <div class="chat-wrap">
        <div class="chat-log" id="chat-log">
          <!-- Empty State Hero with Quick Starters -->
          <div class="chat-empty-hero" id="chat-empty-hero" style="${history.length ? 'display:none' : ''}">
            <div class="chat-hero-icon" style="background:none;font-size:48px;display:flex;align-items:center;justify-content:center">🐉</div>
            <h2 class="chat-hero-title">Awaken Your English with Ignis, Your Dragon Mentor</h2>
            <p class="chat-hero-sub">Speak freely in English, ask for grammar breakdowns, expand your vocabulary, or practice interview dialogues.</p>
            <div class="chat-quick-prompts">
              <button class="chat-prompt-chip" data-prompt="Explain the difference between Past Simple and Present Perfect with simple real-world examples.">
                <span>🏰</span> <span>Grammar Castle: Tenses</span>
              </button>
              <button class="chat-prompt-chip" data-prompt="Give me 5 advanced adjectives for professional communication with example sentences.">
                <span>🌲</span> <span>Vocabulary Forest: Power Words</span>
              </button>
              <button class="chat-prompt-chip" data-prompt="Let's do a 5-minute mock technical interview for a software developer role. Ask me question 1.">
                <span>💼</span> <span>Startup Pitch &amp; Tech Interview</span>
              </button>
              <button class="chat-prompt-chip" data-prompt="Give me a surprise daily English quest to practice my speaking right now!">
                <span>🎲</span> <span>Daily Dragon Quest</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Clean Input Pill -->
        <div class="chat-input-row">
          <button class="icon-btn" id="chat-mic" title="Click to speak" aria-label="Voice input">${ICONS.mic}</button>
          <input type="text" id="chat-input" placeholder="Ask anything or practice speaking…">
          <button class="btn btn-primary btn-sm" id="chat-send" aria-label="Send message" style="border-radius:99px;padding:8px 16px">${ICONS.send}</button>
        </div>
      </div>
    </div>`;

  $('#btn-toggle-feed').onclick = () => {
    showLiveFeed = !showLiveFeed;
    $('#live-web-feed').style.display = showLiveFeed ? 'block' : 'none';
    $('#btn-toggle-feed').classList.toggle('active', showLiveFeed);
  };

  $('#btn-toggle-rag').onclick = () => {
    showRagDrawer = !showRagDrawer;
    $('#rag-drawer').style.display = showRagDrawer ? 'block' : 'none';
    $('#btn-toggle-rag').classList.toggle('active', showRagDrawer);
    if (showRagDrawer) loadRagDocuments();
  };

  $('#btn-save-rag-doc').onclick = async () => {
    const title = ($('#rag-doc-title').value || '').trim();
    const text = ($('#rag-doc-text').value || '').trim();
    if (!title || !text) {
      toast('Please provide a title and document text', 'coral');
      return;
    }
    try {
      await Api.tutorUploadDocument({ title, text, department: 'General' });
      toast('Document indexed successfully into study store!', 'sprout');
      $('#rag-doc-title').value = '';
      $('#rag-doc-text').value = '';
      loadRagDocuments();
    } catch (err) {
      toast(err.message || 'Failed to index document', 'coral');
    }
  };

  let showMemoryDrawer = false;
  async function loadStudentMemories() {
    const listEl = $('#memories-list');
    if (!listEl) return;
    try {
      const memories = await Api.tutorMemories();
      if (!memories || memories.length === 0) {
        listEl.innerHTML = '<span style="color:var(--cream-faint);font-size:12px">No saved context yet. Add a goal above or tell the AI about your goals in chat!</span>';
        return;
      }
      listEl.innerHTML = memories.map(m => `
        <span class="pill voice" style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;padding:3px 8px" data-id="${m._id}">
          <span style="opacity:0.75;text-transform:uppercase;font-size:9.5px;font-weight:700">${esc(m.category)}</span>
          <span>${esc(m.fact)}</span>
          <button class="del-memory-btn" data-id="${m._id}" style="background:none;border:none;color:var(--cream-dim);cursor:pointer;font-size:13px;padding:0;line-height:1" title="Delete memory">×</button>
        </span>
      `).join('');

      listEl.querySelectorAll('.del-memory-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          try {
            await Api.tutorDeleteMemory(btn.dataset.id);
            loadStudentMemories();
            toast('Memory removed', 'sprout');
          } catch (err) {
            toast('Failed to remove memory', 'coral');
          }
        };
      });
    } catch (e) {
      listEl.innerHTML = '<span style="color:var(--coral);font-size:12px">Failed to load memories</span>';
    }
  }

  $('#btn-toggle-memory').onclick = () => {
    showMemoryDrawer = !showMemoryDrawer;
    $('#memory-drawer').style.display = showMemoryDrawer ? 'block' : 'none';
    $('#btn-toggle-memory').classList.toggle('active', showMemoryDrawer);
    if (showMemoryDrawer) loadStudentMemories();
  };

  $('#btn-save-memory').onclick = async () => {
    const fact = ($('#memory-input-fact').value || '').trim();
    const category = $('#memory-input-category').value || 'goal';
    if (!fact) {
      toast('Please enter a memory or learning goal', 'coral');
      return;
    }
    try {
      await Api.tutorAddMemory({ fact, category });
      $('#memory-input-fact').value = '';
      loadStudentMemories();
      toast('Memory saved to AI Tutor context!', 'sprout');
    } catch (err) {
      toast(err.message || 'Failed to save memory', 'coral');
    }
  };

  $('#btn-clear-all-memories').onclick = async () => {
    if (!confirm('Clear all stored learning memories and goals?')) return;
    try {
      await Api.tutorClearMemories();
      loadStudentMemories();
      toast('All memories cleared', 'sprout');
    } catch (err) {
      toast(err.message || 'Failed to clear memories', 'coral');
    }
  };

  const log = $('#chat-log');

  function formatMarkdown(text) {
    if (!text) return '';
    let raw = text;
    // Auto-close open code fence if incomplete
    const fenceCount = (raw.match(/```/g) || []).length;
    if (fenceCount % 2 !== 0) {
      raw += '\n```';
    }
    let html = esc(raw);
    
    // 1. Multi-line Code blocks: ```lang\ncode\n```
    html = html.replace(/```([a-zA-Z0-9_\-\+]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="chat-code-block"><div class="chat-code-header">${esc(lang || 'code')}</div><code>${code.trim()}</code></pre>`;
    });
    
    // 2. Inline code: `code`
    html = html.replace(/`([^`\n]+)`/g, '<code class="chat-inline-code">$1</code>');
    
    // 3. Bold: **text** or __text__
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // 4. Italic: *text* or _text_
    html = html.replace(/(^|[^\*])\*([^\*\n]+)\*/g, '$1<em>$2</em>');
    html = html.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    
    // 5. Headings: ### Header
    html = html.replace(/^### (.*$)/gim, '<h4 class="chat-h4">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="chat-h3">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="chat-h2">$1</h2>');

    // 6. Blockquotes: > quote
    html = html.replace(/^\> (.*$)/gim, '<blockquote class="chat-blockquote">$1</blockquote>');

    // 7. Bullet / numbered lists
    html = html.replace(/^[\*\-]\s+(.+)$/gm, '<div class="chat-list-item">• $1</div>');
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="chat-list-item"><span class="chat-list-num">$1.</span> $2</div>');

    // 8. Paragraphs / Line breaks
    html = html.replace(/\n\n+/g, '<div class="chat-para-spacer"></div>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  function streamMessage(bubble, text, onDone) {
    const tokens = text.split(/(\s+|\n+)/);
    let index = 0;
    let current = '';

    function renderNext() {
      if (index >= tokens.length) {
        bubble.innerHTML = formatMarkdown(text);
        log.scrollTop = log.scrollHeight;
        if (typeof onDone === 'function') onDone();
        return;
      }

      const chunk = tokens[index];
      current += chunk;
      index++;

      bubble.innerHTML = formatMarkdown(current) + '<span class="streaming-cursor"></span>';
      log.scrollTop = log.scrollHeight;

      let delay = 16;
      if (chunk.includes('\n')) {
        delay = 70;
      } else if (/[.!?]$/.test(chunk.trim())) {
        delay = 95;
      } else if (/[,;:]$/.test(chunk.trim())) {
        delay = 45;
      }

      setTimeout(renderNext, delay);
    }

    renderNext();
  }

  function addMsg(role, text, correction = null, verification = null, sources = [], engine = null, draft = null, opts = {}, ragSources = [], route = null){
    const hero = $('#chat-empty-hero');
    if (hero) hero.style.display = 'none';

    const wrap = el(`<div class="msg-wrap ${role === 'user' ? 'user' : 'ai'}"></div>`);
    const bubble = el(`<div class="msg ${role === 'user' ? 'user' : 'ai'}"></div>`);

    let speakBtn = null;
    if (role === 'assistant') {
      const bubbleRow = el(`<div class="msg-bubble-row"></div>`);
      bubbleRow.appendChild(bubble);

      speakBtn = el(`<button class="msg-read-btn" title="Read this response aloud" aria-label="Read response aloud">🔊</button>`);
      speakBtn.onclick = () => {
        if (speakBtn.classList.contains('speaking')) {
          SpeechOutput.stop();
          speakBtn.classList.remove('speaking');
          speakBtn.textContent = '🔊';
          return;
        }
        mount.querySelectorAll('.msg-read-btn.speaking').forEach(b => {
          b.classList.remove('speaking');
          b.textContent = '🔊';
        });
        speakBtn.classList.add('speaking');
        speakBtn.textContent = '⏹️';
        SpeechOutput.speak(text, {
          onEnd: () => {
            speakBtn.classList.remove('speaking');
            speakBtn.textContent = '🔊';
          }
        });
      };
      bubbleRow.appendChild(speakBtn);
      wrap.appendChild(bubbleRow);
    } else {
      wrap.appendChild(bubble);
    }

    function appendExtras() {
      if (correction) {
        wrap.appendChild(el(`<div class="grammar-hint">💡 Grammar Tip: ${esc(correction)}</div>`));
      }
      if (role === 'assistant') {
        const pills = [];
        if (ragSources && ragSources.length > 0) {
          ragSources.forEach(r => {
            const scoreLabel = r.score != null ? ` (${r.score}% match)` : '';
            pills.push(`<span class="source-tag rag-tag" style="background:var(--color-primary-soft);border:1px solid var(--color-primary);color:var(--color-primary);font-weight:600;" title="${esc(r.textSnippet || '')}">📚 ${esc(r.title)}${r.section ? ` · ${esc(r.section)}` : ''}${scoreLabel}</span>`);
          });
        }
        if (sources && sources.length > 0) {
          sources.forEach(s => {
            pills.push(`<a href="${esc(s.url || '#')}" target="_blank" class="source-tag web-tag" style="background:var(--color-success-soft);border:1px solid var(--color-success);color:var(--color-success-text);font-weight:600;">🌐 ${esc(s.title || s.source || 'Web Source')}</a>`);
          });
        }
        if (pills.length > 0) {
          const sourceRow = el(`
            <div class="row gap-xs" style="margin-top:6px;flex-wrap:wrap;animation:fadeIn 0.3s ease">
              ${pills.join('')}
            </div>
          `);
          wrap.appendChild(sourceRow);
        }
      }
      log.scrollTop = log.scrollHeight;
    }

    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;

    if (role === 'assistant' && opts.stream) {
      streamMessage(bubble, text, () => {
        appendExtras();
        if (typeof opts.onStreamComplete === 'function') opts.onStreamComplete();
      });
    } else {
      bubble.innerHTML = role === 'assistant' ? formatMarkdown(text) : esc(text);
      appendExtras();
    }
  }

  history.forEach(m => addMsg(m.role, m.text, m.correction, m.verification, m.sources, m.engine, m.draft, {}, m.ragSources, m.pipelineRoute));

  // Quick prompt chip click listeners
  mount.querySelectorAll('.chat-prompt-chip').forEach(chip => {
    chip.onclick = () => {
      const promptText = chip.dataset.prompt;
      if (promptText) send(promptText);
    };
  });

  function startVoiceListening() {
    if (!SpeechInput.supported) return;
    $('#chat-mic').classList.add('on');
    SpeechInput.start({
      onResult: ({final, interim}) => { $('#chat-input').value = (final+' '+interim).trim(); },
      onEnd: (finalTranscript) => {
        $('#chat-mic').classList.remove('on');
        if (finalTranscript) send(finalTranscript);
      },
      onError: () => $('#chat-mic').classList.remove('on'),
    });
  }

  async function send(text){
    if (!text.trim()) return;
    addMsg('user', text);
    $('#chat-input').value = '';
    
    const typingEl = el(`
      <div class="msg-wrap ai">
        <div class="msg ai" style="display:inline-flex;align-items:center;gap:8px">
          <div class="typing-indicator-wrap">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
          <span style="font-size:13.5px;color:var(--cream-dim)">Thinking…</span>
        </div>
      </div>
    `);
    log.appendChild(typingEl);
    log.scrollTop = log.scrollHeight;

    try {
      let wrap = null;
      let bubble = null;
      let fullText = '';
      let hasCreatedBubble = false;

      function ensureBubble() {
        if (hasCreatedBubble) return;
        hasCreatedBubble = true;
        if (typingEl && typingEl.parentNode) typingEl.remove();

        wrap = el('<div class="msg-wrap ai"></div>');
        bubble = el('<div class="msg ai"></div>');
        const bubbleRow = el('<div class="msg-bubble-row"></div>');
        bubbleRow.appendChild(bubble);
        wrap.appendChild(bubbleRow);
        log.appendChild(wrap);
      }

      await Api.tutorMessageStream(text, {
        onToken: (token) => {
          ensureBubble();
          fullText += token;
          bubble.innerHTML = formatMarkdown(fullText) + '<span class="streaming-cursor"></span>';
          log.scrollTop = log.scrollHeight;
        },
        onDone: (event) => {
          ensureBubble();
          if (event.replyText) {
            fullText = event.replyText;
          }
          bubble.innerHTML = formatMarkdown(fullText);

          // Add speak button
          const bubbleRow = wrap ? wrap.querySelector('.msg-bubble-row') : null;
          if (bubbleRow) {
            const speakBtn = el('<button class="msg-read-btn" title="Read this response aloud" aria-label="Read response aloud">🔊</button>');
            speakBtn.onclick = () => {
              if (speakBtn.classList.contains('speaking')) {
                SpeechOutput.stop();
                speakBtn.classList.remove('speaking');
                speakBtn.textContent = '🔊';
                return;
              }
              mount.querySelectorAll('.msg-read-btn.speaking').forEach(b => {
                b.classList.remove('speaking');
                b.textContent = '🔊';
              });
              speakBtn.classList.add('speaking');
              speakBtn.textContent = '⏹️';
              SpeechOutput.speak(fullText, {
                onEnd: () => {
                  speakBtn.classList.remove('speaking');
                  speakBtn.textContent = '🔊';
                }
              });
            };
            bubbleRow.appendChild(speakBtn);
          }

          if (event.correction && wrap) {
            wrap.appendChild(el(`<div class="grammar-hint">💡 Grammar Tip: ${esc(event.correction)}</div>`));
          }

          const pills = [];
          if (event.ragSources && event.ragSources.length > 0) {
            event.ragSources.forEach(r => {
              const scoreLabel = r.score != null ? ` (${r.score}% match)` : '';
              pills.push(`<span class="source-tag rag-tag" style="background:var(--color-primary-soft);border:1px solid var(--color-primary);color:var(--color-primary);font-weight:600;" title="${esc(r.textSnippet || '')}">📚 ${esc(r.title)}${r.section ? ` · ${esc(r.section)}` : ''}${scoreLabel}</span>`);
            });
          }
          if (event.sources && event.sources.length > 0) {
            event.sources.forEach(s => {
              pills.push(`<a href="${esc(s.url || '#')}" target="_blank" class="source-tag web-tag" style="background:var(--color-success-soft);border:1px solid var(--color-success);color:var(--color-success-text);font-weight:600;">🌐 ${esc(s.title || s.source || 'Web Source')}</a>`);
            });
          }
          if (pills.length > 0 && wrap) {
            const sourceRow = el(`
              <div class="row gap-xs" style="margin-top:6px;flex-wrap:wrap;animation:fadeIn 0.3s ease">
                ${pills.join('')}
              </div>
            `);
            wrap.appendChild(sourceRow);
          }

          log.scrollTop = log.scrollHeight;

          if (readAloudActive) {
            SpeechOutput.speak(fullText, {
              onEnd: () => {
                if (voiceChatActive) startVoiceListening();
              }
            });
          } else if (voiceChatActive) {
            startVoiceListening();
          }
        },
        onError: (err) => {
          if (typingEl && typingEl.parentNode) typingEl.remove();
          apiError(err);
        }
      });
    } catch(err){
      if (typingEl && typingEl.parentNode) typingEl.remove();
      apiError(err);
    }
  }

  $('#chat-send').onclick = () => send($('#chat-input').value);
  $('#chat-input').onkeydown = (e) => { if (e.key === 'Enter') send($('#chat-input').value); };
  $('#chat-mic').onclick = startVoiceListening;

  $('#btn-clear-chat').onclick = async () => {
    if (!confirm('Are you sure you want to clear your conversation history? This cannot be undone.')) return;
    try {
      await Api.tutorClearHistory();
      history = [];
      log.innerHTML = '';
      const hero = el(`
        <div class="chat-empty-hero" id="chat-empty-hero">
          <div class="chat-hero-icon">${ICONS.message}</div>
          <h2 class="chat-hero-title">Practice English &amp; Tech with AI</h2>
          <p class="chat-hero-sub">Speak naturally, ask concept questions, or prepare for technical interviews with real-time coaching.</p>
          <div class="chat-quick-prompts">
            <button class="chat-prompt-chip" data-prompt="Can we do a 5-minute mock technical interview for a software developer role? Start with question 1.">
              <span>🎯</span> <span>Mock Technical Interview</span>
            </button>
            <button class="chat-prompt-chip" data-prompt="Help me improve my spoken English fluency. Let's talk about our daily routine.">
              <span>🗣️</span> <span>Daily Spoken English Practice</span>
            </button>
            <button class="chat-prompt-chip" data-prompt="Explain Object-Oriented Programming (OOP) principles with simple real-world examples.">
              <span>⚡</span> <span>Explain OOP Concepts</span>
            </button>
          </div>
        </div>
      `);
      log.appendChild(hero);
      hero.querySelectorAll('.chat-prompt-chip').forEach(chip => {
        chip.onclick = () => {
          const promptText = chip.dataset.prompt;
          if (promptText) send(promptText);
        };
      });
      toast('Conversation history cleared', 'sprout');
    } catch (err) {
      toast('Failed to clear conversation history', 'coral');
    }
  };

  $('#toggle-read-aloud').onclick = () => {
    readAloudActive = !readAloudActive;
    localStorage.setItem('lingrow_tutor_read_aloud', String(readAloudActive));
    const btn = $('#toggle-read-aloud');
    btn.classList.toggle('active', readAloudActive);
    btn.textContent = readAloudActive ? '🔊' : '🔇';
    btn.title = `Toggle Auto Read-Aloud (${readAloudActive ? 'ON' : 'OFF'})`;
    if (!readAloudActive) {
      SpeechOutput.stop();
      mount.querySelectorAll('.msg-read-btn.speaking').forEach(b => {
        b.classList.remove('speaking');
        b.textContent = '🔊';
      });
      toast('Auto Read-Aloud: OFF (Silent Mode)', 'info');
    } else {
      toast('Auto Read-Aloud: ON (Voice Active)', 'sprout');
    }
  };

  $('#toggle-voice-mode').onclick = () => {
    voiceChatActive = !voiceChatActive;
    const btn = $('#toggle-voice-mode');
    btn.classList.toggle('active', voiceChatActive);
    if (voiceChatActive) {
      toast('Continuous Voice Chat: ON (Auto-listening)', 'sprout');
      startVoiceListening();
    } else {
      toast('Continuous Voice Chat: OFF', 'info');
    }
  };
};


/* ---------------------------- LESSONS ---------------------------- */
VIEW_RENDERERS['lessons'] = async (mount) => {
  const lessons = await Api.lessons();
  mount.innerHTML = `<div class="col gap-md" id="lesson-list"></div>`;
  const list = $('#lesson-list');
  lessons.forEach(l=>{
    const card = el(`
      <div class="card">
        <div class="row">
          <div style="flex:1">
            <div class="pill ${levelColor(l.level)}" style="margin-bottom:8px">${l.level}</div>
            <h3 style="font-size:16px">${esc(l.title)}</h3>
          </div>
          <div style="width:120px">
            <div class="progress-track"><div class="progress-fill" style="width:${l.progressPct}%"></div></div>
            <div style="font-size:11px;color:var(--cream-faint);margin-top:4px;text-align:right">${l.progressPct}%</div>
          </div>
        </div>
        <div class="col gap-sm" style="margin-top:14px" data-sections></div>
      </div>`);
    const secWrap = card.querySelector('[data-sections]');
    l.sections.forEach((sec, idx)=>{
      const row = el(`
        <div class="row gap-sm" style="padding:8px 0;border-top:1px solid var(--line)">
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px">${esc(sec.heading)}</div>
            <div style="font-size:12.5px;color:var(--cream-dim);margin-top:2px">${esc(sec.content)}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-complete>${ICONS.check}</button>
        </div>`);
      row.querySelector('[data-complete]').onclick = async ()=>{
        try{ await Api.completeLessonSection(l._id, idx); toast('Section marked complete'); setView('lessons'); }
        catch(err){ apiError(err); }
      };
      secWrap.appendChild(row);
    });
    list.appendChild(card);
  });
};

/* ---------------------------- PROGRESS & LEADERBOARD ---------------------------- */
VIEW_RENDERERS['progress'] = async (mount) => {
  const [progress, dragonData, leaderboard] = await Promise.all([
    Api.myProgress(),
    Api.myDragonProgress().catch(() => null),
    Api.leaderboard(),
  ]);

  const evo = dragonData?.dragon || (window.DragonMascot ? window.DragonMascot.getEvolutionByXp(progress.xp || 0) : { stage: 2, name: 'Dragon Companion', title: 'Novice', percentToNext: 50, xpToNext: 150 });
  const evolutions = window.DragonMascot?.EVOLUTIONS || [
    { stage: 1, name: 'Dragon Egg', minXp: 0, nextXp: 250, title: 'Novice Hatchling' },
    { stage: 2, name: 'Baby Dragon', minXp: 250, nextXp: 500, title: 'Curious Fledgling' },
    { stage: 3, name: 'Young Dragon', minXp: 500, nextXp: 1000, title: 'Brave Apprentice' },
    { stage: 4, name: 'Fire Dragon', minXp: 1000, nextXp: 1500, title: 'Flame Keeper' },
    { stage: 5, name: 'Ancient Dragon', minXp: 1500, nextXp: 2500, title: 'Sky Guardian' },
    { stage: 6, name: 'Legendary Dragon', minXp: 2500, nextXp: 5000, title: 'Grand Drake Archon' },
  ];

  mount.innerHTML = `
    <!-- DRAGON PROGRESSION HERO -->
    <div class="dragon-hero-card" style="padding:28px;margin-bottom:24px">
      <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:24px">
        <div class="col" style="flex:1;min-width:260px">
          <div class="dragon-realm-badge"><span>🐉</span> DRAGON EVOLUTION SYSTEM</div>
          <h2 style="font-size:26px;font-weight:800;color:#FFFFFF;margin:0 0 8px">
            Your Dragon: ${esc(evo.name)} <span style="font-size:16px;color:#FBBF24">(${esc(evo.title)})</span>
          </h2>
          <p style="font-size:14px;color:#CBD5E1;line-height:1.6;margin:0 0 16px">
            As you practice speaking, vocabulary, and grammar, your dragon companion absorbs linguistic energy and evolves into legendary forms.
          </p>
          <div class="dragon-hero-progress-box" style="margin-bottom:0">
            <div class="dragon-xp-header">
              <span>Next Evolution: <b>${esc(evo.nextStageName || 'Max')}</b></span>
              <span><b>${evo.percentToNext}%</b> (${evo.xpToNext} XP remaining)</span>
            </div>
            <div class="dragon-xp-bar-outer">
              <div class="dragon-xp-bar-inner" style="width:${evo.percentToNext}%"></div>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;min-width:240px;max-width:320px;width:100%">
          ${window.DragonMascot && window.DragonMascot.renderArt ? window.DragonMascot.renderArt(evo.stage, { mode: 'hero', maxWidth: '300px' }) : (window.DragonMascot ? window.DragonMascot.renderSVG(evo.stage, 'excited', 170) : '')}
        </div>
      </div>
    </div>

    <!-- THE 6 EVOLUTION STAGES -->
    <div class="section-title" style="margin-bottom:14px">
      <span>🧬</span> The 6 Stages of Dragon Evolution
    </div>
    <div class="dragon-missions-grid" style="grid-template-columns:repeat(auto-fit, minmax(190px, 1fr));margin-bottom:28px">
      ${evolutions.map((e) => {
        const isCurrent = e.stage === evo.stage;
        const isUnlocked = (progress.xp || 0) >= e.minXp;
        return window.DragonMascot && window.DragonMascot.renderArt
          ? window.DragonMascot.renderArt(e.stage, { mode: 'card', isCurrent, isUnlocked })
          : `
          <div class="card col gap-xs ${isCurrent ? 'active' : ''}" style="text-align:center;padding:16px;border:1.5px solid ${isCurrent ? 'var(--dragon-gold)' : isUnlocked ? 'var(--color-primary)' : 'var(--color-border)'};background:${isCurrent ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(124,58,237,0.12))' : 'var(--color-surface)'};opacity:${isUnlocked ? '1' : '0.6'}">
            <div style="height:90px;display:flex;align-items:center;justify-content:center">
              ${window.DragonMascot ? window.DragonMascot.renderSVG(e.stage, isCurrent ? 'happy' : 'idle', 90) : ''}
            </div>
            <div style="font-weight:800;font-size:14px;color:var(--color-text)">Stage ${e.stage}: ${esc(e.name)}</div>
            <div style="font-size:11.5px;color:var(--color-text-muted)">${esc(e.title)}</div>
            <div class="pill ${isCurrent ? 'amber' : isUnlocked ? 'sprout' : ''}" style="font-size:10px;margin-top:6px">
              ${isCurrent ? '★ Current Form' : isUnlocked ? '✓ Unlocked' : `${e.minXp} XP Needed`}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="grid grid-2">
      <!-- DRAGON RIDER BADGES -->
      <div class="card">
        <div class="section-title"><span>🛡️</span> Dragon Rider Badges (${progress.badges.filter(b=>b.unlocked).length}/${progress.badges.length})</div>
        <div class="grid grid-2" style="gap:10px">
          ${progress.badges.map(b=>`
            <div class="badge-card ${b.unlocked?'':'locked'}" style="padding:12px">
              <div class="badge-ic" style="font-size:22px">🏆</div>
              <div style="font-weight:700;font-size:13px">${esc(b.name)}</div>
              <div style="font-size:11.5px;color:var(--color-text-muted);margin-top:3px">${esc(b.description)}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- REALM CHAMPIONS LEADERBOARD -->
      <div class="card">
        <div class="section-title"><span>👑</span> Dragon Riders Leaderboard</div>
        <div class="table-wrap">
          <table style="width:100%">
            <thead>
              <tr style="border-bottom:1px solid var(--line);font-size:11.5px;color:var(--color-text-muted)">
                <th style="padding:8px">Rank</th>
                <th style="padding:8px">Rider</th>
                <th style="padding:8px">Dragon Stage</th>
                <th style="padding:8px;text-align:right">Power (XP)</th>
              </tr>
            </thead>
            <tbody>
              ${leaderboard.map((u,i)=>{
                const isMe = u._id === S.user._id || u.id === S.user.id || u.email === S.user.email;
                const rankColor = i === 0 ? '#FACC15' : i === 1 ? '#CBD5E1' : i === 2 ? '#FDBA74' : 'var(--color-text-muted)';
                const stageName = u.dragonStage || 'Dragon Egg';
                return `
                  <tr class="leader-row ${isMe ? 'current-user' : 'tr-hover'}">
                    <td class="mono" style="width:36px;font-weight:800;color:${rankColor};text-align:center">${i+1}</td>
                    <td class="row gap-sm" style="padding:10px 8px;align-items:center">
                      ${avatarHTML(u.name, 28)}
                      <div>
                        <div style="font-weight:${isMe ? '700' : '600'};font-size:13.5px">${esc(u.name)} ${isMe ? '<span class="pill voice" style="font-size:9px;padding:1px 5px">You</span>' : ''}</div>
                        ${u.streak ? `<span style="font-size:11px;color:var(--dragon-fire)">🔥 ${u.streak}d streak</span>` : ''}
                      </div>
                    </td>
                    <td style="font-size:12px;color:var(--dragon-purple);font-weight:600">${esc(stageName)}</td>
                    <td class="mono" style="font-size:13px;font-weight:700;text-align:right;padding:10px 8px;color:var(--color-gem-text)">${u.xp} XP</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  // Wire up dragon evolution card clicks and "View Cinematic" triggers
  mount.querySelectorAll('[data-cinematic-stage]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const stage = Number(btn.dataset.cinematicStage) || 1;
      if (window.DragonMascot && window.DragonMascot.playEvolutionCinematic) {
        window.DragonMascot.playEvolutionCinematic(stage);
      }
    };
  });

  mount.querySelectorAll('.dragon-art-card:not(.locked)').forEach(card => {
    card.style.cursor = 'pointer';
    card.onclick = () => {
      const stage = Number(card.dataset.stage) || 1;
      if (window.DragonMascot && window.DragonMascot.playEvolutionCinematic) {
        window.DragonMascot.playEvolutionCinematic(stage);
      }
    };
  });
};

/* ---------------------------- GRAMMAR PRACTICE (SEQUENTIAL UNLOCK) ---------------------------- */

const GRAMMAR_CAT_ICONS = {
  'Sentence Foundations': '🏗️',
  'Parts of Speech': '🧩',
  'Nouns': '🏷️',
  'Pronouns': '👤',
  'Articles': '📰',
  'Determiners & Quantifiers': '🔢',
  'Adjectives': '🎨',
  'Verbs & Verb Forms': '🏃',
  'Be, Have & Do': '🔑',
  'Tenses': '⏳',
  'Tense Sentence Forms': '🔄',
  'Subject-Verb Agreement': '⚡',
  'Questions': '❓',
  'Negatives': '🚫',
  'Prepositions': '🎯',
  'Adverbs': '🚀',
  'Conjunctions': '🔗',
  'Sentence Construction': '📐',
  'Modal Verbs': '💡',
  'Gerunds & Infinitives': '🌀',
  'Phrases & Clauses': '📑',
  'Active & Passive Voice': '🗣️',
  'Basic Conditionals': '🔀',
  'Basic Reported Speech': '💬',
  'Punctuation & Capitalization': '✍️',
  'Common Beginner Errors': '⚠️',
};

VIEW_RENDERERS['grammar'] = async (mount) => {
  let topics = [];
  let progress = null;
  try {
    [topics, progress] = await Promise.all([
      Api.grammarTopics().catch(() => []),
      Api.grammarProgress().catch(() => null),
    ]);
  } catch (err) {
    topics = [];
  }
  renderGrammarView(mount, topics, progress);
};

function formatVideoEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return 'https://www.youtube.com/embed/' + id;
  }
  if (url.includes('youtube.com/watch')) {
    try {
      const id = new URL(url).searchParams.get('v');
      return 'https://www.youtube.com/embed/' + id;
    } catch (e) {
      return url;
    }
  }
  return url;
}

function renderGrammarView(mount, topics, progress) {
  const completedCount = (progress && progress.completedCount !== undefined)
    ? progress.completedCount
    : topics.filter(t => t.isCompleted || t.completed).length;
  const totalCount = (progress && progress.totalTopics) || topics.length;
  const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const passMark = (progress && progress.passPercent) || 50;
  
  // Find first unlocked topic that is not yet completed
  const firstActiveUnlocked = topics.find(t => !t.isLocked && !t.isCompleted && !t.completed);

  let filterLevel = 'all';
  let filterStatus = 'all';
  let searchQuery = '';

  const beginnerCount = topics.filter(t => t.level === 'Beginner').length;
  const intermediateCount = topics.filter(t => t.level === 'Intermediate').length;
  const advancedCount = topics.filter(t => t.level === 'Advanced').length;

  mount.innerHTML = `
    <div class="col gap-md">
      <!-- Sequential Progress Header -->
      <div class="card" id="grammar-header-card" style="padding:18px 22px;background:var(--color-surface-2);border:1px solid var(--line)">
        <div class="row gap-sm" style="align-items:center;justify-content:space-between;flex-wrap:wrap">
          <div class="row gap-xs" style="align-items:center">
            <span id="grammar-header-count" style="font-size:18px;font-weight:700">${completedCount} / ${totalCount} topics completed</span>
            <span id="grammar-header-pct" class="pill sprout" style="font-size:11px;font-weight:700">${progressPercent}% Complete</span>
          </div>
          <div class="row gap-xs" style="align-items:center">
            <span class="pill" style="font-size:11.5px;color:var(--cream-dim);border-color:var(--line)">Pass Mark: ${passMark}%</span>
            <span class="pill voice" style="font-size:11.5px;font-weight:700">+25 XP on first completion</span>
          </div>
        </div>
        <div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:12px">
          <div id="grammar-header-bar" style="width:${progressPercent}%;height:100%;background:var(--gradient-primary);border-radius:4px;transition:width 0.3s ease"></div>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card col gap-sm" style="padding:14px 18px;background:var(--color-surface);border:1px solid var(--line);border-radius:14px">
        <div class="row gap-sm" style="align-items:center;justify-content:space-between;flex-wrap:wrap">
          <div style="flex:1;min-width:240px;position:relative">
            <input type="text" id="grammar-search-input" class="input input-sm" placeholder="🔍 Search by topic, rule, category, or #topic..." style="width:100%;border-radius:20px;padding:8px 14px;font-size:13px">
          </div>
          <div class="row gap-xs" style="align-items:center;flex-wrap:wrap" id="grammar-level-btn-group">
            <button class="btn btn-xs btn-primary grammar-level-btn" data-level="all">All (${topics.length})</button>
            <button class="btn btn-xs btn-ghost grammar-level-btn" data-level="Beginner">Beginner (${beginnerCount})</button>
            <button class="btn btn-xs btn-ghost grammar-level-btn" data-level="Intermediate">Intermediate (${intermediateCount})</button>
            <button class="btn btn-xs btn-ghost grammar-level-btn" data-level="Advanced">Advanced (${advancedCount})</button>
          </div>
          <div class="row gap-xs" style="align-items:center" id="grammar-status-btn-group">
            <button class="btn btn-xs btn-secondary grammar-status-btn" data-status="all">All Status</button>
            <button class="btn btn-xs btn-ghost grammar-status-btn" data-status="unlocked">Unlocked</button>
            <button class="btn btn-xs btn-ghost grammar-status-btn" data-status="completed">Completed</button>
          </div>
        </div>
        <div class="row" style="justify-content:space-between;align-items:center;font-size:12px;color:var(--cream-faint);margin-top:2px">
          <span id="grammar-filtered-count">Showing ${topics.length} of ${topics.length} topics</span>
          <span>🏰 Sequential Curriculum (Topic 1 &rarr; Topic 243)</span>
        </div>
      </div>

      <!-- Topics Grid (Clean Syllabus Order, Sequential Unlocking) -->
      <div class="grid grid-2" id="grammar-grid"></div>

      <div id="grammar-active-area"></div>
    </div>
  `;

  function getFilteredTopics() {
    return topics.filter(t => {
      if (filterLevel !== 'all' && t.level !== filterLevel) return false;
      if (filterStatus === 'unlocked' && t.isLocked) return false;
      if (filterStatus === 'completed' && !(t.isCompleted || t.completed)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const catMatch = (t.category || '').toLowerCase().includes(q);
        const unitMatch = (t.unit || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const idMatch = String(t.order || t.topicId || '').includes(q.replace('#', ''));
        if (!titleMatch && !catMatch && !unitMatch && !descMatch && !idMatch) return false;
      }
      return true;
    });
  }

  function renderGridCards() {
    const grid = mount.querySelector('#grammar-grid');
    if (!grid) return;
    const filtered = getFilteredTopics();
    const countInfo = mount.querySelector('#grammar-filtered-count');
    if (countInfo) {
      countInfo.textContent = `Showing ${filtered.length} of ${topics.length} topics`;
    }

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="card empty-state" style="grid-column:1/-1;padding:36px 20px;text-align:center">
          <div style="font-size:32px;margin-bottom:8px">🔍</div>
          <div style="font-size:15px;font-weight:700">No grammar topics match your filter</div>
          <div style="font-size:13px;color:var(--cream-faint);margin-top:4px">Try adjusting your search query or switching levels.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(t => {
      const isDone = !!(t.isCompleted || t.completed);
      const isLocked = !!t.isLocked;
      const isCurrent = !isLocked && !isDone && (!firstActiveUnlocked || String(firstActiveUnlocked._id) === String(t._id));
      const hasVideo = !!t.videoUrl;
      const qCount = t.questionCount || (t.questions && t.questions.length) || 50;
      const orderNum = t.order || t.topicId || '';

      return `
        <div id="topic-card-${t._id}" class="grammar-topic-card ${isDone ? 'completed' : ''}" style="${isLocked ? 'opacity:0.62;background:var(--color-surface-1);border:1px dashed var(--line);' : isCurrent ? 'border:2px solid var(--purple);box-shadow:0 0 16px rgba(124, 58, 237, 0.25);' : ''}">
          <div>
            <div class="row gap-xs" style="margin-bottom:10px;flex-wrap:wrap;align-items:center">
              <span class="pill ${t.category === 'Tenses' ? 'amber' : t.category === 'Common Beginner Errors' ? 'coral' : 'sprout'}" style="font-size:11px">
                ${GRAMMAR_CAT_ICONS[t.category] || '📌'} ${esc(t.category)}
              </span>
              <span class="pill voice" style="font-size:10.5px">${t.level || 'Beginner'}</span>
              ${hasVideo ? '<span class="pill emerald" style="font-size:10.5px">📹 Video Lesson</span>' : ''}
              <div class="spacer"></div>
              <span id="badge-status-${t._id}">
                ${isDone
                  ? `<span class="pill emerald" style="font-size:11px;font-weight:700">${ICONS.check} ${t.bestScore}% Best</span>`
                  : isLocked
                    ? `<span class="pill" style="font-size:10.5px;color:var(--cream-dim);border-color:var(--line)"><i class="bi bi-lock-fill"></i> Locked</span>`
                    : `<span class="pill voice" style="font-size:10.5px;font-weight:700">Continue</span>`
                }
              </span>
            </div>
            <h3 style="font-size:17px;font-weight:700;line-height:1.35;margin-bottom:8px">
              ${orderNum ? `<span style="font-size:13px;color:var(--cream-faint);margin-right:4px">#${orderNum}</span>` : ''}${esc(t.title)}
            </h3>
            <p style="font-size:13px;color:var(--cream-dim);line-height:1.55;margin-bottom:14px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
              ${esc(t.description)}
            </p>
            <div id="unlock-msg-${t._id}">
              ${isLocked ? `
                <div style="font-size:12px;color:var(--coral);margin-bottom:12px;display:flex;align-items:center;gap:6px">
                  <i class="bi bi-lock-fill"></i> Complete "${esc(t.previousTopicTitle || 'previous topic')}" with &ge;${passMark}% to unlock
                </div>
              ` : ''}
            </div>
          </div>
          <div class="row gap-sm" style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line);align-items:center">
            <span style="font-size:12px;color:var(--cream-faint);display:inline-flex;align-items:center;gap:4px">
              📝 ${qCount} Questions Test
            </span>
            <div class="spacer"></div>
            <div id="btn-container-${t._id}">
              ${isLocked ? `
                <button class="btn btn-secondary btn-sm" disabled style="opacity:0.6;cursor:not-allowed">
                  <i class="bi bi-lock-fill"></i> Locked
                </button>
              ` : isDone ? `
                <button class="btn btn-secondary btn-sm" data-start-grammar="${t._id}">
                  Retake Test ${ICONS.refresh}
                </button>
              ` : `
                <button class="btn btn-primary btn-sm" data-start-grammar="${t._id}">
                  Study &amp; Take Test ${ICONS.arrowRight}
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-start-grammar]').forEach(btn => {
      btn.onclick = () => openGrammarQuiz(btn.dataset.startGrammar, mount, topics);
    });
  }

  // Initial card render
  renderGridCards();

  // Search input handler
  const searchInput = mount.querySelector('#grammar-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderGridCards();
    });
  }

  // Level filter buttons
  mount.querySelectorAll('.grammar-level-btn').forEach(btn => {
    btn.onclick = () => {
      mount.querySelectorAll('.grammar-level-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');
      filterLevel = btn.dataset.level;
      renderGridCards();
    };
  });

  // Status filter buttons
  mount.querySelectorAll('.grammar-status-btn').forEach(btn => {
    btn.onclick = () => {
      mount.querySelectorAll('.grammar-status-btn').forEach(b => {
        b.classList.remove('btn-secondary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-secondary');
      filterStatus = btn.dataset.status;
      renderGridCards();
    };
  });
}

async function openGrammarQuiz(topicId, mount, topics) {
  const activeArea = $('#grammar-active-area');
  const grid = $('#grammar-grid');
  grid.style.display = 'none';

  try {
    const topic = await Api.getGrammarTopic(topicId);
    const embedUrl = formatVideoEmbedUrl(topic.videoUrl);
    const qBankCount = topic.questionCount || (topic.questions && topic.questions.length) || 25;

    activeArea.innerHTML = `
      <div class="col gap-md">
        <!-- Top Navigation & Progress Header -->
        <div class="row gap-sm" style="align-items:center;justify-content:space-between;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" id="btn-back-grammar" style="padding:6px 12px;font-size:13px">
            &larr; Back to Topics
          </button>
          <div class="row gap-xs">
            <span class="pill sprout" style="font-size:11px">${esc(topic.category)}</span>
            <span class="pill voice" style="font-size:10.5px">${topic.level || 'Beginner'}</span>
          </div>
        </div>

        <!-- Topic Details & Embedded Video Section -->
        <div class="card col gap-md" style="padding:22px;border-left:4px solid var(--purple)">
          <div class="col gap-xs">
            <div style="font-size:11.5px;color:var(--purple);text-transform:uppercase;letter-spacing:1px;font-weight:800">
              Grammar Module
            </div>
            <h2 style="font-size:24px;font-weight:800;line-height:1.3">${esc(topic.title)}</h2>
            <p style="font-size:14px;color:var(--cream-dim);line-height:1.6;margin-top:4px">${esc(topic.description)}</p>
          </div>

          ${embedUrl ? `
            <div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;background:#000;box-shadow:0 8px 24px rgba(0,0,0,0.4)">
              <iframe src="${embedUrl}" title="${esc(topic.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:12px"></iframe>
            </div>
          ` : `
            <div class="card" style="background:var(--color-primary-soft);border:1px dashed var(--color-primary);padding:16px;text-align:center">
              <span style="font-size:13px;color:var(--cream-dim)">📺 No video provided for this topic. Read the rule summary below and start your test.</span>
            </div>
          `}

          <!-- Rule Summary Box -->
          <div class="rule-summary-box" style="background:var(--color-surface-2);padding:16px;border-radius:10px;border:1px solid var(--color-border)">
            <b style="color:var(--sprout);display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:14px">
              💡 Grammar Key Rules &amp; Summary:
            </b>
            <div style="font-size:13.5px;color:var(--cream-bright);line-height:1.65;white-space:pre-line">
              ${esc(topic.ruleSummary)}
            </div>
          </div>

          <div style="margin-top:8px">
            <button class="btn btn-primary" id="btn-start-test-10q" style="width:100%;padding:14px;font-size:16px;font-weight:700">
              🎯 Take Topic Test (${qBankCount} Questions) ${ICONS.arrowRight}
            </button>
          </div>
        </div>

        <div id="test-runner-area"></div>
      </div>
    `;

    // Ensure Top Back button ALWAYS re-fetches fresh topics and progress
    $('#btn-back-grammar').onclick = async () => {
      const [freshTopics, freshProg] = await Promise.all([
        Api.grammarTopics().catch(() => []),
        Api.grammarProgress().catch(() => null),
      ]);
      renderGrammarView(mount, freshTopics, freshProg);
    };

    $('#btn-start-test-10q').onclick = async () => {
      const runnerArea = $('#test-runner-area');
      const startBtn = $('#btn-start-test-10q');
      startBtn.disabled = true;
      startBtn.textContent = 'Loading Questions…';

      try {
        const testData = await Api.getGrammarTest(topic._id);
        render10QuestionTest(testData, runnerArea, mount, topics);
        startBtn.style.display = 'none';
      } catch (err) {
        apiError(err);
        startBtn.disabled = false;
        startBtn.textContent = '🎯 Take Topic Test';
      }
    };

  } catch (err) {
    apiError(err);
    grid.style.display = 'grid';
  }
}

function render10QuestionTest(testData, runnerArea, mount, topics) {
  const { topicId, title, questions } = testData;
  let selectedAnswers = new Array(questions.length).fill(-1);

  runnerArea.innerHTML = `
    <div class="col gap-md" style="margin-top:12px">
      <div class="card" style="border-left:4px solid var(--sprout);padding:16px 20px">
        <div class="row gap-xs" style="align-items:center">
          <span class="pill sprout" style="font-size:12px;font-weight:700">MCQ TEST</span>
          <div class="spacer"></div>
          <span style="font-size:13px;color:var(--cream-dim)">${questions.length} Questions</span>
        </div>
      </div>

      <!-- Interactive 4-Option MCQ Test Form -->
      <form id="grammar-form-10q" class="col gap-md">
        ${questions.map((q, qIdx) => {
          const letters = ['A', 'B', 'C', 'D'];
          return `
            <div class="card col gap-sm" style="padding:18px 20px">
              <div class="row gap-xs" style="align-items:flex-start">
                <span class="pill sprout" style="font-size:11px;padding:3px 8px;margin-right:6px">Question ${qIdx + 1} of ${questions.length}</span>
                <div style="font-weight:700;font-size:15.5px;line-height:1.45;flex:1">${esc(q.question)}</div>
              </div>
              <div class="col gap-xs" style="margin-top:12px">
                ${q.options.map((opt, optIdx) => `
                  <label class="quiz-option-card" id="opt-label-${qIdx}-${optIdx}">
                    <div class="quiz-option-letter">${letters[optIdx] || optIdx + 1}</div>
                    <input type="radio" name="q_${qIdx}" value="${optIdx}" style="display:none">
                    <span style="font-size:14.5px;line-height:1.4;flex:1">${esc(opt)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}

        <button class="btn btn-primary btn-action" type="submit" style="width:100%;max-width:340px;padding:14px;font-size:16px;font-weight:700;margin:12px auto 0 auto" id="submit-grammar-10q-btn">
          Submit Test ${ICONS.arrowRight}
        </button>
      </form>

      <div id="grammar-results-10q"></div>
    </div>
  `;

  // Handle choice highlighting
  questions.forEach((q, qIdx) => {
    const inputs = runnerArea.querySelectorAll(`input[name="q_${qIdx}"]`);
    inputs.forEach(inp => {
      inp.onchange = () => {
        selectedAnswers[qIdx] = parseInt(inp.value, 10);
        inputs.forEach((otherInp, oIdx) => {
          const lbl = $(`#opt-label-${qIdx}-${oIdx}`);
          if (lbl) {
            lbl.classList.toggle('selected', otherInp.checked);
          }
        });
      };
    });
  });

  $('#grammar-form-10q').onsubmit = async (e) => {
    e.preventDefault();
    const unanswered = selectedAnswers.findIndex(a => a === -1);
    if (unanswered !== -1) {
      toast(`Please answer question ${unanswered + 1} before submitting!`, 'amber');
      return;
    }

    const submitBtn = $('#submit-grammar-10q-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Evaluating test…';

    try {
      const questionIds = questions.map(q => q._id);
      const res = await Api.submitGrammar(topicId, selectedAnswers, questionIds);

      // Feedback animation: golden spark for correct answers, gentle shake for wrong
      if (Array.isArray(res.evaluatedAnswers)) {
        res.evaluatedAnswers.forEach((ans, qIdx) => {
          const correctLbl = runnerArea.querySelector(`#opt-label-${qIdx}-${ans.correctAnswer}`);
          if (correctLbl) {
            correctLbl.classList.add('correct-spark');
          }
          if (!ans.isCorrect && ans.selectedAnswer !== undefined && ans.selectedAnswer !== -1) {
            const wrongLbl = runnerArea.querySelector(`#opt-label-${qIdx}-${ans.selectedAnswer}`);
            if (wrongLbl) {
              wrongLbl.classList.add('wrong-shake');
            }
          }
        });
      }

      if (res.xpEarned > 0) {
        toast(`+${res.xpEarned} XP Earned! Excellent job!`, 'sprout');
        addStudentXP(res.xpEarned);
      }

      if (res.passed && window.DragonMascot && window.DragonMascot.celebrate) {
        DragonMascot.celebrate({
          title: 'Grammar Castle Trial Conquered!',
          xp: res.xpEarned || 25,
          message: `Accuracy: ${res.score}%! You mastered the rules and stoked your dragon flame!`,
        });
      } else if (!res.passed && window.DragonMascot && window.DragonMascot.encourage) {
        DragonMascot.encourage({
          title: 'Grammar Trial Unresolved',
          message: `Accuracy: ${res.score}%. The Castle Gates require at least 50% to unlock the next chamber! Review the answers below and rekindle your flame.`,
          tip: 'Carefully inspect each question explanation below to reinforce the grammatical pattern.',
          buttonText: '🔥 Review Mistakes & Retake Trial',
        });
      }

      // Update in-memory topic list state immediately
      const completedT = topics.find(t => String(t._id) === String(topicId));
      if (completedT) {
        completedT.bestScore = Math.max(completedT.bestScore || 0, res.score);
        if (res.passed) {
          completedT.isCompleted = true;
          completedT.completed = true;
          completedT.isLocked = false;
        }
      }
      if (res.passed) {
        const completedIdx = topics.findIndex(t => String(t._id) === String(topicId));
        if (completedIdx !== -1 && completedIdx + 1 < topics.length) {
          topics[completedIdx + 1].isLocked = false;
        }
      }

      // Update Header counter and progress bar immediately
      if (res.progress) {
        const countEl = $('#grammar-header-count');
        const pctEl = $('#grammar-header-pct');
        const barEl = $('#grammar-header-bar');
        const completedCount = res.progress.completedCount;
        const totalCount = res.progress.totalTopics;
        const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
        if (countEl) countEl.textContent = `${completedCount} / ${totalCount} topics completed`;
        if (pctEl) pctEl.textContent = `${pct}% Complete`;
        if (barEl) barEl.style.width = `${pct}%`;
      }

      const resultsDiv = $('#grammar-results-10q');
      const passed = !!res.passed;
      const passMark = res.passPercent || 50;
      const minCorrectNeeded = Math.ceil((passMark / 100) * res.totalQuestions);

      resultsDiv.innerHTML = `
        <div class="col gap-md" style="margin-top:20px">
          <!-- Clear Result Hero Banner -->
          <div class="result-hero-card col gap-xs" style="border-top:4px solid ${passed ? 'var(--emerald)' : 'var(--coral)'};background:var(--color-surface-2);padding:24px;border-radius:12px;text-align:center">
            ${passed ? `
              <span class="pill sprout" style="font-size:12px;font-weight:700;margin:0 auto 8px auto">✔ TOPIC PASSED &amp; UNLOCKED</span>
              <h2 style="font-size:42px;font-weight:800;color:var(--emerald);margin:4px 0">${res.score}%</h2>
              <div style="font-size:16px;color:var(--cream);font-weight:700">
                ${res.correctCount} of ${res.totalQuestions} questions correct
              </div>
              <div style="font-size:14px;color:var(--cream-dim);margin-top:4px">${esc(res.message)}</div>
              ${res.xpEarned > 0 ? `
                <div style="margin-top:10px">
                  <span class="pill sprout" style="font-size:13px;padding:6px 14px;font-weight:700">⚡ +${res.xpEarned} XP Awarded</span>
                </div>
              ` : ''}
            ` : `
              <span class="pill coral" style="font-size:12px;font-weight:700;margin:0 auto 8px auto">✖ PASS MARK NOT MET</span>
              <h2 style="font-size:42px;font-weight:800;color:var(--coral);margin:4px 0">${res.score}%</h2>
              <div style="font-size:16px;color:var(--cream);font-weight:700">
                ${res.correctCount} of ${res.totalQuestions} questions correct
              </div>
              <div style="font-size:14.5px;color:var(--coral);font-weight:600;margin-top:8px;line-height:1.5">
                Score ${res.score}%. Need ${passMark}% (${minCorrectNeeded}/${res.totalQuestions}) to unlock the next topic. Retry
              </div>
            `}
          </div>

          <div class="col gap-sm">
            <div class="section-title" style="font-size:17px;margin:10px 0 4px">Answer Review &amp; Detailed Explanations</div>
            ${res.evaluatedAnswers.map((ans, idx) => {
              const q = questions[idx];
              const isCorrect = ans.isCorrect;
              const letters = ['A', 'B', 'C', 'D'];
              return `
                <div class="card" style="padding:16px 18px;border-left:4px solid ${isCorrect ? 'var(--emerald)' : 'var(--coral)'};background:var(--color-surface-2)">
                  <div class="row gap-xs" style="margin-bottom:8px;flex-wrap:wrap;align-items:center">
                    <span class="pill ${isCorrect ? 'emerald' : 'coral'}" style="font-size:11px">
                      ${isCorrect ? '✔ Correct' : '✖ Incorrect'}
                    </span>
                    <span style="font-size:14px;font-weight:700">Q${idx + 1}: ${esc(ans.questionText || q.question)}</span>
                  </div>
                  <div style="font-size:14px;line-height:1.5;margin-bottom:6px">
                    Your choice: <b style="color:${isCorrect ? 'var(--emerald)' : 'var(--coral)'}">${letters[ans.selectedOption]} - ${esc(q.options[ans.selectedOption])}</b>
                    ${!isCorrect ? `<br><span style="color:var(--cream-dim)">Correct answer: <b style="color:var(--emerald)">${letters[ans.correctAnswer]} - ${esc(q.options[ans.correctAnswer])}</b></span>` : ''}
                  </div>
                  <div style="font-size:13px;color:var(--cream-dim);line-height:1.55;background:var(--color-surface-2);padding:10px 14px;border-radius:10px;margin-top:10px">
                    <strong style="color:var(--cyan)">💡 Explanation:</strong> ${esc(ans.explanation)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="row gap-sm" style="margin-top:14px;flex-wrap:wrap">
            <button class="btn btn-primary" id="btn-retry-grammar-10q" style="flex:1;min-width:150px">
              Retake Test ${ICONS.refresh}
            </button>
            <button class="btn btn-ghost" id="btn-finish-grammar-10q" style="flex:1;min-width:150px">
              Back to Topics
            </button>
          </div>
        </div>
      `;

      resultsDiv.scrollIntoView({ behavior: 'smooth' });

      $('#btn-retry-grammar-10q').onclick = () => {
        openGrammarQuiz(topicId, mount, topics);
      };
      
      // Bottom Back button ALWAYS re-fetches fresh topics and progress
      $('#btn-finish-grammar-10q').onclick = async () => {
        const [freshTopics, freshProg] = await Promise.all([
          Api.grammarTopics().catch(() => []),
          Api.grammarProgress().catch(() => null),
        ]);
        renderGrammarView(mount, freshTopics, freshProg);
      };

    } catch (err) {
      apiError(err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Test';
    }
  };
}

/* ---------------------------- DAILY SITUATIONAL PHRASES ---------------------------- */

VIEW_RENDERERS['situational'] = async (mount) => {
  let scenarios = [];
  try {
    scenarios = await Api.situationalScenarios();
  } catch (err) {
    scenarios = [];
  }
  renderSituationalView(mount, scenarios);
};

function renderSituationalView(mount, scenarios) {
  mount.innerHTML = `
    <div class="col gap-md">
      <div class="grid grid-2" id="situational-grid">
        ${scenarios.length ? scenarios.map(s => `
          <div class="card col gap-sm" style="position:relative;display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div class="row gap-sm" style="margin-bottom:8px">
                <span class="pill ${s.category === 'Campus Life' ? 'sprout' : s.category === 'Professional & Jobs' ? 'amber' : 'voice'}">${esc(s.category)}</span>
                <span class="pill voice" style="font-size:11px">${s.level || 'Beginner'}</span>
                <div class="spacer"></div>
                ${s.completed ? `<span class="pill sprout" style="color:var(--sprout)">${ICONS.check} ${s.bestScore}% Best</span>` : '<span class="pill" style="color:var(--cream-faint)">New</span>'}
              </div>
              <h3 style="font-size:17px;font-weight:700;margin-bottom:6px">${esc(s.title)}</h3>
              <p style="font-size:13px;color:var(--cream-dim);line-height:1.5;margin-bottom:12px">${esc(s.situationContext)}</p>
            </div>
            <div class="row gap-sm" style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line)">
              <span style="font-size:12px;color:var(--cream-faint)">${(s.phrases && s.phrases.length) || 0} Key Phrases &middot; ${(s.interactivePrompts && s.interactivePrompts.length) || 0} Prompts</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm" data-start-situational="${s._id}">
                ${s.completed ? 'Roleplay Again' : 'Start Scenario'} ${ICONS.arrowRight}
              </button>
            </div>
          </div>
        `).join('') : '<div class="card empty-state">No situational scenarios available.</div>'}
      </div>

      <div id="situational-active-area"></div>
    </div>
  `;

  mount.querySelectorAll('[data-start-situational]').forEach(btn => {
    btn.onclick = () => openSituationalScenario(btn.dataset.startSituational, mount, scenarios);
  });
}

async function openSituationalScenario(scenarioId, mount, scenarios) {
  const activeArea = $('#situational-active-area');
  const grid = $('#situational-grid');
  grid.style.display = 'none';

  try {
    const scenario = await Api.getSituationalScenario(scenarioId);
    let selectedAnswers = new Array(scenario.interactivePrompts.length).fill(-1);

    activeArea.innerHTML = `
      <div class="col gap-md">
        <button class="btn btn-ghost btn-sm" id="btn-back-situational" style="align-self:flex-start">
          &larr; Back to Scenarios
        </button>

        <div class="card" style="border-left:4px solid var(--amber);background:var(--card-bg)">
          <div class="row gap-sm" style="margin-bottom:8px">
            <span class="pill amber">${esc(scenario.category)}</span>
            <span class="pill voice">${scenario.level}</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">${esc(scenario.title)}</h2>
          <div style="font-size:13.5px;color:var(--cream-dim);line-height:1.6;margin-top:6px;padding:12px;background:var(--color-surface-2);border-radius:8px">
            <b style="color:var(--amber);display:block;margin-bottom:4px">&#x1F4CD; Scenario Situation:</b>
            ${esc(scenario.situationContext)}
          </div>
        </div>

        <div class="card col gap-sm">
          <div class="section-title">${ICONS.message} Key Phrases &amp; Audio Pronunciation</div>
          <div class="col gap-md" style="margin-top:10px">
            ${scenario.phrases.map((p, pIdx) => `
              <div class="card" style="padding:14px 16px;background:var(--color-surface-2);border:1px solid var(--line)">
                <div class="row gap-sm" style="margin-bottom:6px;align-items:center">
                  <span class="pill sprout" style="font-size:11px">${esc(p.speaker)}</span>
                  <div class="spacer"></div>
                  <button class="btn btn-ghost btn-sm" data-listen-phrase="${pIdx}">
                    ${ICONS.play} Listen Audio
                  </button>
                </div>
                <div style="font-size:15px;font-weight:700;color:var(--cream);margin-bottom:6px">
                  "${esc(p.englishText)}"
                </div>
                <div style="font-size:13px;color:var(--cream-dim);line-height:1.5">
                  <b>Explanation:</b> ${esc(p.explanation)}
                </div>
                ${p.keyTips ? `
                  <div style="font-size:12px;color:var(--amber);margin-top:6px;font-style:italic">
                    &#x1F4A1; Pro Tip: ${esc(p.keyTips)}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <form id="situational-form" class="card col gap-md">
          <div class="section-title">${ICONS.check} Roleplay Practice Quizzes</div>
          ${scenario.interactivePrompts.map((q, qIdx) => `
            <div class="col gap-sm" style="padding-top:10px;border-top:${qIdx > 0 ? '1px solid var(--line)' : 'none'}">
              <div style="font-weight:700;font-size:15px">
                <span style="color:var(--amber);margin-right:6px">Roleplay Q${qIdx + 1}.</span> ${esc(q.prompt)}
              </div>
              <div class="col gap-xs" style="margin-top:8px">
                ${q.options.map((opt, optIdx) => `
                  <label class="row gap-sm" style="padding:10px 14px;border:1px solid var(--line);border-radius:8px;cursor:pointer;transition:all .15s ease" id="s-opt-label-${qIdx}-${optIdx}">
                    <input type="radio" name="sq_${qIdx}" value="${optIdx}" style="accent-color:var(--amber)">
                    <span style="font-size:14px">${esc(opt)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}

          <button class="btn btn-primary" type="submit" style="align-self:flex-start;margin-top:12px" id="submit-situational-btn">
            Submit Roleplay ${ICONS.arrowRight}
          </button>
        </form>

        <div id="situational-results"></div>
      </div>
    `;

    $('#btn-back-situational').onclick = () => {
      grid.style.display = 'grid';
      activeArea.innerHTML = '';
    };

    // Attach Listen Audio buttons
    scenario.phrases.forEach((p, pIdx) => {
      const listenBtn = mount.querySelector(`[data-listen-phrase="${pIdx}"]`);
      if (listenBtn) {
        listenBtn.onclick = () => {
          if (typeof SpeechOutput !== 'undefined' && SpeechOutput.speak) {
            SpeechOutput.speak(p.englishText);
          } else {
            toast('Audio playback active', 'sprout');
          }
        };
      }
    });

    // Option selection styling
    scenario.interactivePrompts.forEach((q, qIdx) => {
      const inputs = mount.querySelectorAll(`input[name="sq_${qIdx}"]`);
      inputs.forEach(inp => {
        inp.onchange = () => {
          selectedAnswers[qIdx] = parseInt(inp.value, 10);
          inputs.forEach((otherInp, oIdx) => {
            const lbl = $(`#s-opt-label-${qIdx}-${oIdx}`);
            if (lbl) {
              lbl.style.borderColor = otherInp.checked ? 'var(--amber)' : 'var(--line)';
              lbl.style.background = otherInp.checked ? 'var(--color-streak-soft)' : 'transparent';
            }
          });
        };
      });
    });

    $('#situational-form').onsubmit = async (e) => {
      e.preventDefault();
      const unanswered = selectedAnswers.findIndex(a => a === -1);
      if (unanswered !== -1) {
        toast(`Please answer roleplay question ${unanswered + 1}`, 'amber');
        return;
      }

      const submitBtn = $('#submit-situational-btn');
      submitBtn.disabled = true;

      try {
        const res = await Api.submitSituational(scenario._id, selectedAnswers);
        if (res.xpEarned > 0) {
          toast(`+${res.xpEarned} XP Earned! Great roleplay!`, 'sprout');
          addStudentXP(res.xpEarned);
        }

        const resultsDiv = $('#situational-results');
        resultsDiv.innerHTML = `
          <div class="card col gap-md" style="margin-top:16px;border-top:3px solid ${scoreColor(res.score)}">
            <div class="row gap-md">
              <div class="col">
                <div style="font-size:12px;color:var(--cream-faint);text-transform:uppercase;letter-spacing:1px">Your Roleplay Result</div>
                <h2 style="font-size:26px;color:${scoreColor(res.score)}">${res.score}% Roleplay Score</h2>
                <div style="font-size:13.5px;color:var(--cream-dim);margin-top:4px">${res.correctCount} of ${res.totalQuestions} answers correct &middot; ${res.message}</div>
              </div>
            </div>

            <div class="col gap-sm" style="margin-top:10px">
              <h4 style="font-size:15px;font-weight:700">Detailed Feedback &amp; Explanations:</h4>
              ${res.evaluatedAnswers.map((ans, idx) => {
                const q = scenario.interactivePrompts[idx];
                return `
                  <div class="card" style="padding:12px 16px;background:var(--color-surface-2);border:1px solid ${ans.isCorrect ? 'var(--color-success)' : 'var(--color-error)'}">
                    <div class="row gap-sm" style="margin-bottom:6px">
                      <span style="font-weight:700;color:${ans.isCorrect ? 'var(--emerald)' : 'var(--coral)'}">${ans.isCorrect ? '&#x2714; Correct Choice' : '&#x2716; Needs Improvement'}</span>
                      <span style="font-size:13px;font-weight:600">Q${idx + 1}: ${esc(q.prompt)}</span>
                    </div>
                    <div style="font-size:13px;color:var(--cream-dim)">
                      Your answer: <b style="color:${ans.isCorrect ? 'var(--emerald)' : 'var(--coral)'}">${esc(q.options[ans.selectedOption])}</b>
                      ${!ans.isCorrect ? ` &middot; Recommended choice: <b style="color:var(--emerald)">${esc(q.options[ans.correctAnswer])}</b>` : ''}
                    </div>
                    <div style="font-size:12.5px;color:var(--cream-faint);margin-top:6px;font-style:italic">
                      &#x1F4A1; ${esc(ans.explanation)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="row gap-sm" style="margin-top:12px">
              <button class="btn btn-primary" id="btn-retry-situational">Try Again ${ICONS.refresh}</button>
              <button class="btn btn-ghost" id="btn-finish-situational">Back to Scenarios</button>
            </div>
          </div>
        `;

        resultsDiv.scrollIntoView({ behavior: 'smooth' });

        $('#btn-retry-situational').onclick = () => {
          openSituationalScenario(scenarioId, mount, scenarios);
        };
        $('#btn-finish-situational').onclick = async () => {
          const freshScenarios = await Api.situationalScenarios();
          renderSituationalView(mount, freshScenarios);
        };

      } catch (err) {
        apiError(err);
      } finally {
        submitBtn.disabled = false;
      }
    };

  } catch (err) {
    apiError(err);
  }
}

function renderLockedModuleView(mount, moduleTitle, minLevel, minXP) {
  const currentXP = S.user.xp || 0;
  const pct = Math.min(100, Math.round((currentXP / minXP) * 100));

  mount.innerHTML = `
    <div class="col gap-md align-center" style="max-width:600px;margin:40px auto;text-align:center">
      <div class="card col gap-md" style="padding:32px;border:1px solid var(--color-streak);background:var(--color-streak-soft);position:relative">
        <div style="font-size:48px;margin-bottom:8px">&#x1F512;</div>
        <span class="pill amber" style="align-self:center">${minLevel} Level Required</span>
        <h2 style="font-size:24px;font-weight:700">${esc(moduleTitle)} is Locked</h2>
        
        <p style="font-size:14px;color:var(--cream-dim);line-height:1.6">
          This advanced module unlocks when you reach <b>${minLevel} Level (${minXP} XP)</b>.
          Build your foundational skills first by practicing our recommended beginner modules!
        </p>

        <div class="col gap-xs" style="margin:14px 0">
          <div class="row" style="font-size:13px;color:var(--cream-faint);margin-bottom:4px">
            <span>XP Progress</span>
            <div class="spacer"></div>
            <b>${currentXP} / ${minXP} XP</b>
          </div>
          <div style="width:100%;height:10px;background:var(--color-border);border-radius:5px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, var(--amber), var(--sprout));border-radius:5px;transition:width 0.4s ease"></div>
          </div>
        </div>

        <div class="col gap-sm" style="margin-top:10px">
          <div style="font-size:12px;color:var(--amber);text-transform:uppercase;letter-spacing:0.8px;font-weight:700">Practice Beginner Modules to Level Up:</div>
          <div class="row gap-sm" style="justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-nav="grammar">${ICONS.edit} Start Grammar Practice (+25 XP)</button>
            <button class="btn btn-primary btn-sm" data-nav="situational">${ICONS.message} Start Situational Roleplay (+20 XP)</button>
          </div>
        </div>
      </div>
    </div>
  `;

  mount.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => setView(b.dataset.nav));
}

/* ================================ TESTS =================================
   Teacher-assigned tests, pulled from the question bank by topic. Timed,
   auto-submits when the clock runs out, and shows a full breakdown after.
   ========================================================================= */
let testTimerHandle = null;

VIEW_RENDERERS['tests'] = async (mount) => {
  const tests = await Api.availableTests();
  renderTestsListView(mount, tests);
};

function renderTestsListView(mount, tests) {
  clearInterval(testTimerHandle);
  mount.innerHTML = `
    <div class="col gap-md">
      <div class="row" style="background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 14px;flex-wrap:wrap;gap:8px">
        <div style="font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:6px">
          ${ICONS.mortarboard} Your Enrolled Class:
          <span class="pill voice" style="font-size:12px;font-weight:700">${esc(S.user.batch || 'General Batch')}</span>
        </div>
        <div class="spacer"></div>
        <span style="font-size:12px;color:var(--cream-faint)">Displaying tests assigned to your class & institutional tests</span>
      </div>

      <div class="grid grid-2" id="tests-grid">
        ${tests.length ? tests.map(t => `
          <div class="card col gap-sm" style="display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div class="row gap-sm" style="margin-bottom:8px">
                <span class="pill sprout">${esc(t.category)}</span>
                <span class="pill voice" style="font-size:11px">${t.level}</span>
                <div class="spacer"></div>
                ${t.attempted ? `<span class="pill sprout" style="color:var(--sprout)">${ICONS.check} ${t.bestScore}% Best</span>` : '<span class="pill" style="color:var(--cream-faint)">New</span>'}
              </div>
              <h3 style="font-size:17px;font-weight:700;margin-bottom:6px">${esc(t.title)}</h3>
              <div class="row gap-sm" style="font-size:12.5px;color:var(--cream-faint)">
                ${ICONS.clipboard} ${t.questionCount} questions &nbsp;·&nbsp; ${ICONS.timer} ${t.durationMinutes} min
              </div>
            </div>
            <div class="row gap-sm" style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line)">
              <button class="btn btn-primary btn-action btn-sm" data-start-test="${t._id}">${t.attempted ? 'Retake' : 'Start Test'} ${ICONS.arrowRight}</button>
            </div>
          </div>
        `).join('') : `<div class="card empty-state">No tests assigned yet. Check back once your teacher publishes one.</div>`}
      </div>
      <div id="test-active-area"></div>
    </div>
  `;
  mount.querySelectorAll('[data-start-test]').forEach(btn => {
    btn.onclick = () => startTest(btn.dataset.startTest, mount);
  });
}

async function startTest(testId, mount) {
  const grid = $('#tests-grid');
  const area = $('#test-active-area');
  area.innerHTML = `<div class="empty-state">${wave(5)}</div>`;
  try {
    const test = await Api.takeTest(testId);
    grid.style.display = 'none';

    let selectedAnswers = new Array(test.questions.length).fill(-1);
    let secondsLeft = test.durationMinutes * 60;
    const startedAt = Date.now();

    area.innerHTML = `
      <div class="col gap-md">
        <div class="card row" style="position:sticky;top:0;z-index:5;border-left:4px solid var(--amber)">
          <div><h2 style="font-size:18px;margin:0">${esc(test.title)}</h2><div style="font-size:12.5px;color:var(--cream-faint)">${esc(test.category)} &middot; ${test.questions.length} questions</div></div>
          <div class="spacer"></div>
          <div class="pill amber" id="test-timer" style="font-size:15px;font-weight:700">${ICONS.timer} --:--</div>
        </div>

        <form id="test-form" class="col gap-md">
          ${test.questions.map((q, qIdx) => `
            <div class="card col gap-sm">
              <div style="font-weight:700;font-size:15px"><span style="color:var(--sprout);margin-right:6px">Q${qIdx + 1}.</span> ${esc(q.question)}</div>
              <div class="col gap-xs" style="margin-top:8px">
                ${q.options.map((opt, optIdx) => `
                  <label class="row gap-sm" style="padding:10px 14px;border:1px solid var(--line);border-radius:8px;cursor:pointer" id="topt-label-${qIdx}-${optIdx}">
                    <input type="radio" name="tq_${qIdx}" value="${optIdx}" style="accent-color:var(--sprout)">
                    <span style="font-size:14px">${esc(opt)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
          <button class="btn btn-primary" type="submit" style="align-self:flex-start" id="test-submit-btn">Submit Test ${ICONS.arrowRight}</button>
        </form>

        <div id="test-results"></div>
      </div>
    `;

    test.questions.forEach((q, qIdx) => {
      mount.querySelectorAll(`input[name="tq_${qIdx}"]`).forEach(inp => {
        inp.onchange = () => {
          selectedAnswers[qIdx] = parseInt(inp.value, 10);
          mount.querySelectorAll(`input[name="tq_${qIdx}"]`).forEach((otherInp, oIdx) => {
            const lbl = $(`#topt-label-${qIdx}-${oIdx}`);
            if (lbl) {
              lbl.style.borderColor = otherInp.checked ? 'var(--sprout)' : 'var(--line)';
              lbl.style.background = otherInp.checked ? 'var(--purple-glow)' : 'transparent';
            }
          });
        };
      });
    });

    async function doSubmit(auto) {
      clearInterval(testTimerHandle);
      const submitBtn = $('#test-submit-btn');
      if (submitBtn) submitBtn.disabled = true;
      const timeTakenSeconds = Math.round((Date.now() - startedAt) / 1000);
      try {
        const res = await Api.submitTest(testId, selectedAnswers, timeTakenSeconds);
        if (res.xpEarned > 0) {
          toast(`+${res.xpEarned} XP Earned!`, 'sprout');
          addStudentXP(res.xpEarned);
        }
        if (auto) toast('Time\'s up — test auto-submitted', 'amber');
        renderTestResult(res, test);
      } catch (err) { apiError(err); if (submitBtn) submitBtn.disabled = false; }
    }

    function tick() {
      const m = Math.floor(secondsLeft / 60), s = secondsLeft % 60;
      const timerEl = $('#test-timer');
      if (timerEl) timerEl.innerHTML = `${ICONS.timer} ${m}:${String(s).padStart(2,'0')}`;
      if (secondsLeft <= 0) { doSubmit(true); return; }
      secondsLeft -= 1;
    }
    tick();
    testTimerHandle = setInterval(tick, 1000);

    $('#test-form').onsubmit = (e) => { e.preventDefault(); doSubmit(false); };
  } catch (err) { apiError(err); }
}

function renderTestResult(res, test) {
  clearInterval(testTimerHandle);
  const resultsDiv = $('#test-results');
  $('#test-form').style.display = 'none';
  resultsDiv.innerHTML = `
    <div class="card col gap-md" style="border-top:3px solid ${scoreColor(res.score)}">
      <div class="col">
        <div style="font-size:12px;color:var(--cream-faint);text-transform:uppercase;letter-spacing:1px">Test Result</div>
        <h2 style="font-size:26px;color:${scoreColor(res.score)}">${res.score}%</h2>
        <div style="font-size:13.5px;color:var(--cream-dim)">${res.correctCount} of ${res.totalQuestions} correct &middot; ${res.message}</div>
      </div>
      <div class="col gap-sm" style="margin-top:10px">
        ${res.evaluatedAnswers.map((ans, idx) => {
          const q = test.questions[idx];
          return `
            <div class="card" style="padding:12px 16px;background:var(--color-surface-2);border:1px solid ${ans.isCorrect ? 'var(--color-success)' : 'var(--color-error)'}">
              <div class="row gap-sm" style="margin-bottom:6px">
                <span style="font-weight:700;color:${ans.isCorrect ? 'var(--emerald)' : 'var(--coral)'}">${ans.isCorrect ? '&#x2714;' : '&#x2716;'}</span>
                <span style="font-size:13px;font-weight:600">Q${idx+1}: ${esc(q.question)}</span>
              </div>
              <div style="font-size:13px;color:var(--cream-dim)">
                Your answer: <b>${q.options[ans.selectedOption] ? esc(q.options[ans.selectedOption]) : '—'}</b>
                ${!ans.isCorrect ? ` &middot; Correct: <b style="color:var(--emerald)">${esc(q.options[ans.correctAnswer])}</b>` : ''}
              </div>
              ${ans.explanation ? `<div style="font-size:12.5px;color:var(--cream-faint);margin-top:6px;font-style:italic">&#x1F4A1; ${esc(ans.explanation)}</div>` : ''}
            </div>`;
        }).join('')}
      </div>
      <button class="btn btn-ghost" id="btn-finish-test" style="align-self:flex-start">Back to Tests</button>
    </div>
  `;
  resultsDiv.scrollIntoView({ behavior: 'smooth' });
  $('#btn-finish-test').onclick = async () => {
    const mount = $('#view-inner');
    const fresh = await Api.availableTests();
    renderTestsListView(mount, fresh);
  };
}




VIEW_RENDERERS['profile'] = async (mount) => {
  const [userData, progress, attempts] = await Promise.all([
    Api.me().catch(() => S.user),
    Api.myProgress().catch(() => ({ level: S.user.level || 'Beginner', xp: S.user.xp || 0, streak: S.user.streak || 0, badges: [] })),
    Api.myTestAttempts().catch(() => []),
  ]);

  if (userData) {
    S.user = { ...S.user, ...userData };
  }
  const u = S.user;
  const userClass = (u.batch || '').trim().toUpperCase();

  mount.innerHTML = `
    <div class="col gap-lg" style="max-width:960px;margin:0 auto">
      <!-- Profile Header Hero -->
      <div class="card" style="padding:28px 24px;background:var(--color-primary-soft);border:1px solid var(--color-border)">
        <div class="row gap-md" style="align-items:center;flex-wrap:wrap">
          ${avatarHTML(u.name, 72)}
          <div class="col" style="flex:1;min-width:240px">
            <div class="row gap-xs" style="align-items:center;margin-bottom:4px">
              <h2 style="font-size:24px;font-weight:700;color:var(--cream)">${esc(u.name)}</h2>
              <span class="pill sprout" style="font-size:11px;font-weight:700">Active Student</span>
              ${u.emailVerified ? `<span class="pill cyan" style="font-size:11px"><i class="bi bi-patch-check-fill"></i> Verified</span>` : ''}
            </div>
            <div style="font-size:13.5px;color:var(--cream-dim);margin-bottom:8px">
              <b>${esc(u.email)}</b>
            </div>
            <div class="row gap-xs" style="flex-wrap:wrap;align-items:center">
              <span class="pill ${levelColor(u.level || 'Beginner')}" style="font-weight:700;font-size:12px">
                Proficiency: ${esc(u.level || 'Beginner')}
              </span>
              <span class="pill cyan" style="font-weight:700;font-size:12px">
                ${ICONS.mortarboard} Enrolled Class: ${esc(userClass || 'Not Assigned')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Dragon Companion & Rider Identity Card -->
      ${(() => {
        const evo = window.DragonMascot ? window.DragonMascot.getEvolutionByXp(u.xp || 0) : { stage: 2, name: 'Dragon Companion', title: 'Novice Hatchling', percentToNext: 40, xpToNext: 120 };
        return `
        <div class="card row gap-md" style="align-items:center;padding:20px 24px;background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(245,158,11,0.08));border:1.5px solid var(--dragon-gold);border-radius:18px">
          <div>
            ${window.DragonMascot && window.DragonMascot.renderArt ? window.DragonMascot.renderArt(evo.stage, { mode: 'avatar', size: 96 }) : (window.DragonMascot ? window.DragonMascot.renderSVG(evo.stage, 'happy', 95) : '🐉')}
          </div>
          <div class="col" style="flex:1">
            <div class="row gap-xs" style="align-items:center;margin-bottom:4px">
              <span class="pill amber" style="font-size:11px;font-weight:800">STAGE ${evo.stage} EVOLUTION</span>
              <span style="font-size:12px;color:var(--color-text-muted)">&middot; ${esc(evo.title)}</span>
            </div>
            <h3 style="font-size:20px;font-weight:800;color:var(--color-text);margin:0 0 4px">Companion: ${esc(evo.name)}</h3>
            <p style="font-size:13px;color:var(--color-text-muted);margin:0 0 10px">
              Your dragon awakens as you master English across the 7 kingdoms.
            </p>
            <div class="dragon-xp-bar-outer" style="height:8px;max-width:320px;background:var(--color-surface-2)">
              <div class="dragon-xp-bar-inner" style="width:${evo.percentToNext}%"></div>
            </div>
            <div style="font-size:11.5px;color:var(--color-text-muted);margin-top:4px">
              ${evo.percentToNext}% &middot; ${evo.xpToNext} XP needed for next evolution
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="setView('progress')" style="white-space:nowrap;background:linear-gradient(135deg,#F59E0B,#D97706);border:none;color:#0F172A;font-weight:700">
            View Dragon Tree &rarr;
          </button>
        </div>`;
      })()}

      <!-- Quick Metrics Grid -->
      <div class="grid grid-4">
        <div class="card col gap-xs" style="text-align:center">
          <div class="eyebrow">Proficiency Level</div>
          <div style="font-size:22px;font-weight:800" class="stat-tile-level">${esc(u.level || 'Beginner')}</div>
        </div>
        <div class="card col gap-xs" style="text-align:center">
          <div class="eyebrow">Total XP</div>
          <div style="font-size:22px;font-weight:800" class="stat-tile-xp">${u.xp || 0} <span style="font-size:13px;font-weight:600">XP</span></div>
        </div>
        <div class="card col gap-xs" style="text-align:center">
          <div class="eyebrow">Daily Streak</div>
          <div style="font-size:22px;font-weight:800" class="stat-tile-streak">${u.streak || 0} <span style="font-size:13px;font-weight:600">days</span></div>
        </div>
        <div class="card col gap-xs" style="text-align:center">
          <div class="eyebrow">Tests Completed</div>
          <div style="font-size:22px;font-weight:800" class="stat-tile-badges">${attempts.length}</div>
        </div>
      </div>

      <!-- Account Credentials & Academic Details Table -->
      <div class="card col gap-sm">
        <div class="section-title">${ICONS.personBadge} Account Credentials & Details</div>
        <div class="table-wrap">
          <table style="width:100%">
            <tbody>
              <tr>
                <td style="width:200px;font-weight:600;color:var(--cream-faint);padding:10px 14px">Student ID (_id)</td>
                <td style="font-family:monospace;font-size:13px;color:var(--cream)">${esc(u._id || u.id || 'N/A')}</td>
              </tr>
              <tr>
                <td style="font-weight:600;color:var(--cream-faint);padding:10px 14px">College Email</td>
                <td style="font-size:13px;color:var(--cream)">${esc(u.email || '')}</td>
              </tr>
              <tr>
                <td style="font-weight:600;color:var(--cream-faint);padding:10px 14px">Enrolled Class</td>
                <td><span class="pill cyan" style="font-weight:700;font-size:12px">${ICONS.mortarboard} ${esc(userClass || 'Not Assigned')}</span></td>
              </tr>

              <tr>
                <td style="font-weight:600;color:var(--cream-faint);padding:10px 14px">Institution</td>
                <td style="font-size:13px;color:var(--cream)">${esc(u.institution || 'PSG Institute of Technology and Applied Research')}</td>
              </tr>
              <tr>
                <td style="font-weight:600;color:var(--cream-faint);padding:10px 14px">Email Verification</td>
                <td><span class="pill sprout" style="font-size:11px">Verified</span></td>
              </tr>
              <tr>
                <td style="font-weight:600;color:var(--cream-faint);padding:10px 14px">Account Status</td>
                <td><span class="pill sprout" style="font-size:11px">Active</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Test History -->
      <div class="card col gap-sm">
        <div class="section-title">${ICONS.clockHistory} Recent Test Attempts</div>
        ${attempts.length ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Test Title</th>
                  <th>Category</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${attempts.slice(0, 5).map(a => `
                  <tr>
                    <td style="font-weight:600">${esc(a.test?.title || 'Test')}</td>
                    <td><span class="pill" style="font-size:11px">${esc(a.test?.category || 'General')}</span></td>
                    <td>
                      <span class="pill" style="color:${scoreColor(a.score)};border-color:transparent;font-weight:700">
                        ${a.score}%
                      </span>
                    </td>
                    <td style="font-size:12px;color:var(--cream-faint)">${timeAgo(a.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state" style="padding:24px">
            No tests taken yet &mdash; visit the <b>Tests</b> tab to complete assigned quizzes!
          </div>
        `}
      </div>
    </div>
  `;
};
