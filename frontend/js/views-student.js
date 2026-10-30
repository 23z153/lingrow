window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
var VIEW_RENDERERS = window.VIEW_RENDERERS;

/* ---------------------------- DASHBOARD ---------------------------- */
VIEW_RENDERERS['dashboard'] = async (mount) => {
  const [progress, attempts, notifs, dailyRes] = await Promise.all([
    Api.myProgress(),
    Api.myReadAloudAttempts(),
    Api.notifications(),
    Api.getDailyWord().catch(() => null),
  ]);

  const recent = attempts.slice(0, 4);
  const dailyWord = dailyRes?.dailyWord || null;

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
  const wordsHTML = attempt.wordScores.map(w=>`<span class="word ${w.status}">${esc(w.word)}</span>`).join(' ');
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
        <span class="pill sprout" style="font-size:12.5px" id="vocab-mastered-pill">${getMasteredCount()} / ${allWords.length} Words Mastered</span>
      </div>

      <!-- Linear Stepper -->
      ${renderStepperHTML()}

      <!-- Step Content Area -->
      <div id="vocab-step-container"></div>
      <div id="vocab-transition-container"></div>
    `;

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
      if (cardEl) {
        cardEl.onclick = () => {
          isFlipped = !isFlipped;
          cardEl.innerHTML = renderFlashcardContent(currentWord, isFlipped);
        };
      }

      $('#deck-flip-btn').onclick = () => {
        isFlipped = !isFlipped;
        cardEl.innerHTML = renderFlashcardContent(currentWord, isFlipped);
      };

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
      if (!flipped) {
        return `
          <div class="col gap-xs" style="text-align:center;padding:28px 20px">
            <span class="pill voice" style="align-self:center;font-size:11.5px">${esc(w.partOfSpeech || 'word')}</span>
            <div style="font-size:36px;font-weight:800;letter-spacing:-0.5px;color:var(--color-text);margin:14px 0">${esc(w.word)}</div>
            <div style="font-size:13.5px;color:var(--cream-dim)">Tap card or flip button to reveal definition &amp; example</div>
          </div>
        `;
      }
      return `
        <div class="col gap-sm" style="padding:22px">
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

  async function renderPeerMain() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

    const [sessionsRes, gdRoomsRes] = await Promise.all([
      Api.myPeerSessions().catch(() => []),
      Api.getGdRooms().catch(() => [])
    ]);

    const sessions = Array.isArray(sessionsRes) ? sessionsRes : [];
    const gdRooms = Array.isArray(gdRoomsRes) ? gdRoomsRes : [];

    mount.innerHTML = `
      <div class="row" style="margin-bottom:16px;align-items:center">
        <div>
          <div class="section-title" style="margin-bottom:2px">${ICONS.users} Peer Practice &amp; Teacher GD Rooms</div>
          <div style="font-size:14px;color:var(--cream-dim)">Join teacher-led Group Discussion (GD) lobbies or matched 1-on-1 voice calls.</div>
        </div>
        <div class="spacer"></div>
        <span class="pill voice" style="font-size:12.5px">${ICONS.mic} Voice Anonymization Active</span>
      </div>

      <!-- Teacher-Led GD Rooms Section -->
      <div class="card card-2" style="margin-bottom:24px;border:1px solid var(--purple)">
        <div class="row gap-sm" style="margin-bottom:12px;align-items:center">
          <div style="font-size:17px;font-weight:700;color:var(--color-text)">👥 Teacher-Led Group Discussion (GD) Rooms (${gdRooms.length})</div>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" id="refresh-gd-rooms-btn">🔄 Refresh Rooms</button>
        </div>
        <div style="font-size:14px;color:var(--cream-dim);margin-bottom:14px">
          Teachers create GD rooms with specified student limits. Enter the lobby, participate in live speech, and receive a comprehensive local AI evaluation report with personalized skill suggestions.
        </div>

        <div class="grid grid-2 gap-md" id="gd-rooms-container">
          ${gdRooms.map((r) => {
            const currentCount = r.participants?.length || 0;
            const isFull = currentCount >= r.maxStudents;
            const userJoined = (r.participants || []).some(p => (p._id || p) === (S.user?._id || S.user?.id));
            let statusPill = `<span class="pill amber">⌛ Lobby Open</span>`;
            if (r.status === 'IN_PROGRESS') statusPill = `<span class="pill sprout">🔴 Live In-Progress</span>`;
            else if (r.status === 'COMPLETED') statusPill = `<span class="pill voice">✓ Completed</span>`;

            return `
              <div class="card card-2" style="background:var(--color-surface);border:1px solid var(--color-border)">
                <div class="row gap-sm" style="margin-bottom:6px">
                  <span class="pill voice">Max: ${r.maxStudents} Students</span>
                  ${statusPill}
                </div>
                <h3 style="font-size:18px;margin-bottom:4px;color:var(--color-text)">${esc(r.topic)}</h3>
                <div style="font-size:13px;color:var(--cream-dim);margin-bottom:10px">
                  Host: <b>${esc(r.teacher?.name || 'Teacher')}</b> &middot; Target: ${r.targetDurationMinutes || 5} Mins
                </div>
                <div class="row gap-sm" style="align-items:center">
                  <div style="font-size:13.5px;font-weight:700;color:var(--cream)">👥 ${currentCount} / ${r.maxStudents} Joined</div>
                  <div class="spacer"></div>
                  ${r.status === 'COMPLETED' ? `
                    <button class="btn btn-ghost btn-sm" data-gd-report="${r._id}">📊 View AI Report</button>
                  ` : userJoined ? `
                    <button class="btn btn-primary btn-sm" data-gd-enter="${r._id}" class="btn-action" style="background:var(--color-success);color:var(--color-on-bright)">➡️ Enter Room</button>
                  ` : `
                    <button class="btn btn-primary btn-sm" data-gd-join="${r._id}" ${isFull ? 'disabled' : ''}>
                      ${isFull ? 'Room Full' : '🚪 Join Lobby'}
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${!gdRooms.length ? `<div class="empty-state">No teacher GD rooms created yet. Ask your teacher to open a GD room lobby!</div>` : ''}
      </div>

      <!-- 1-on-1 Peer Match Section -->
      <div class="grid grid-2" style="margin-bottom:20px">
        <div class="card" id="peer-match-card">
          <div class="section-title" style="margin-bottom:10px">${ICONS.target} 1-on-1 Voice-Anonymized Match</div>
          <div class="col gap-xs" style="margin-bottom:14px">
            <label class="field-label">Topic for Discussion</label>
            <select id="peer-topic-select" class="input-field" style="background:var(--color-surface-2);color:var(--color-text);padding:10px;border-radius:8px;border:1px solid var(--line)">
              <option value="Everyday Life &amp; Personal Hobbies">Everyday Life &amp; Personal Hobbies</option>
              <option value="Campus Life &amp; Student Activities">Campus Life &amp; Student Activities</option>
              <option value="Placement Interview Practice">Placement Interview Mock Q&amp;A</option>
              <option value="General Free Speech">General Free Conversation</option>
            </select>
          </div>
          <button class="btn btn-primary" id="start-peer-btn" style="width:100%">
            ${ICONS.users} Find Peer &amp; Start 1-on-1 Call
          </button>
        </div>

        <div class="card">
          <div class="section-title" style="margin-bottom:10px">${ICONS.activity} Your Recent Peer Sessions</div>
          ${sessions && sessions.length ? `
            <div class="col gap-xs" style="max-height:220px;overflow-y:auto">
              ${sessions.map(s => `
                <div class="row gap-sm" style="padding:8px 0;border-bottom:1px solid var(--line);align-items:center">
                  <div>
                    <div style="font-weight:700;font-size:14px">${esc(s.topic || 'Peer Practice Call')}</div>
                    <div style="font-size:12px;color:var(--cream-faint)">Duration: ${s.durationSeconds || 120}s &middot; ${timeAgo(s.createdAt)}</div>
                  </div>
                  <div class="spacer"></div>
                  <span class="pill sprout" style="font-size:11px">Completed</span>
                </div>
              `).join('')}
            </div>
          ` : `<div class="empty-state">No peer practice calls yet. Tap "Find Peer" to begin!</div>`}
        </div>
      </div>

      <div id="peer-room-area"></div>
    `;

    // Attach Refresh & GD Action Listeners
    $('#refresh-gd-rooms-btn').onclick = () => renderPeerMain();

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
    const roomArea = $('#peer-room-area');
    if (!roomArea) return;

    if (room.status === 'LOBBY') {
      renderGdLobbyView(roomArea, room);
    } else if (room.status === 'IN_PROGRESS') {
      renderGdActiveRoomView(roomArea, room);
    } else if (room.status === 'COMPLETED') {
      renderStudentGdReport(room);
    }
  }

  function renderGdLobbyView(area, room) {
    if (pollInterval) clearInterval(pollInterval);

    area.innerHTML = `
      <div class="card" style="border:2px solid var(--color-streak);background:var(--color-surface);margin-top:10px">
        <div class="row gap-sm" style="align-items:center;margin-bottom:12px">
          <div>
            <span class="pill amber" style="font-weight:700">⌛ Lobby Open</span>
            <h3 style="font-size:22px;margin-top:4px;color:var(--color-text)">GD Room: "${esc(room.topic)}"</h3>
            <div style="font-size:13.5px;color:var(--cream-dim)">Host Teacher: <b>${esc(room.teacher?.name || 'Teacher')}</b></div>
          </div>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" id="leave-gd-lobby-btn">🚪 Leave Lobby</button>
        </div>

        <div class="card card-2" style="margin-bottom:16px;background:var(--color-surface-2);text-align:center;padding:24px">
          <div style="font-size:32px;margin-bottom:8px">👥</div>
          <h4 style="font-size:18px;margin-bottom:4px;color:var(--color-text)">
            ${room.participants?.length || 0} of ${room.maxStudents} Students in Lobby
          </h4>
          <div style="font-size:14px;color:var(--amber);font-weight:600">
            Waiting for teacher to start the discussion session...
          </div>
        </div>

        <div class="eyebrow" style="margin-bottom:8px">Joined Participants</div>
        <div class="grid grid-3 gap-sm" style="margin-bottom:16px">
          ${(room.participants || []).map((p) => `
            <div class="card card-2 row gap-sm" style="align-items:center;padding:10px 14px">
              ${avatarHTML(p.name || 'Student', 28)}
              <div style="font-size:14px;font-weight:600;color:var(--color-text)">${esc(p.name || 'Student')}</div>
            </div>
          `).join('')}
        </div>

        <div style="font-size:12.5px;color:var(--cream-faint);text-align:center">
          💡 Tip: Prepare 2-3 main points about "${esc(room.topic)}" while waiting in the lobby!
        </div>
      </div>
    `;

    $('#leave-gd-lobby-btn').onclick = async () => {
      if (pollInterval) clearInterval(pollInterval);
      try { await Api.leaveGdRoom(room._id); } catch (e) {}
      renderPeerMain();
    };

    // Poll room status every 3s to transition when teacher starts
    pollInterval = setInterval(async () => {
      try {
        const fresh = await Api.getGdRoom(room._id);
        if (fresh.status === 'IN_PROGRESS') {
          clearInterval(pollInterval);
          pollInterval = null;
          toast('Teacher started the Group Discussion! Entering room now...', 'sprout');
          renderGdActiveRoomView(area, fresh);
        } else if (fresh.participants?.length !== room.participants?.length) {
          room = fresh;
          renderGdLobbyView(area, room);
        }
      } catch (e) {}
    }, 3000);
  }

  function renderGdActiveRoomView(area, room) {
    if (pollInterval) clearInterval(pollInterval);

    area.innerHTML = `
      <div class="card" style="border:2px solid var(--color-success);background:var(--color-surface);margin-top:10px">
        <div class="row gap-sm" style="align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px">
          <div>
            <span class="pill sprout" style="font-weight:700">🔴 Live GD In-Progress</span>
            <h3 style="font-size:22px;margin-top:4px;color:var(--color-text)">Topic: "${esc(room.topic)}"</h3>
            <div style="font-size:13.5px;color:var(--cream-dim)">
              Host: <b>${esc(room.teacher?.name || 'Teacher')}</b> &middot; Target: ${room.targetDurationMinutes || 5} Mins
            </div>
          </div>
          <div class="spacer"></div>
          <button class="btn btn-primary btn-sm" id="end-student-gd-btn" style="background:var(--color-streak);color:var(--color-on-bright);font-weight:700">
            ⏹️ Complete &amp; View AI Report (+25 XP)
          </button>
        </div>

        <!-- Participants Counter Bar -->
        <div class="card card-2" style="margin-bottom:16px;background:var(--color-success-soft);border:1px solid var(--color-success)">
          <div class="row gap-sm" style="align-items:center">
            <div style="font-size:15px;font-weight:700;color:var(--color-text)">👥 ${room.participants?.length || 0} Students Active in Room</div>
            <div class="spacer"></div>
            <div class="row gap-xs">
              ${(room.participants || []).map((p) => `<span class="pill voice" style="font-size:11.5px">${esc(p.name || 'Student')}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- Live Speech Mic Input -->
        <div class="row gap-md" style="align-items:center;margin-bottom:18px">
          <button class="rec-btn" id="gd-mic-btn" style="width:52px;height:52px">${ICONS.mic}</button>
          <div class="col" style="flex:1">
            <div id="gd-mic-status" style="font-weight:700;font-size:15px">Tap mic to speak your point into the GD room</div>
            <div id="gd-mic-transcript" style="font-size:14px;color:var(--cream-dim);margin-top:2px;min-height:20px"></div>
          </div>
        </div>

        <!-- Live Transcripts Feed -->
        <div class="eyebrow" style="margin-bottom:6px">Group Speech Transcript Feed</div>
        <div class="col gap-xs" id="gd-transcript-feed" style="max-height:240px;overflow-y:auto;background:var(--color-surface-2);padding:12px;border-radius:8px;border:1px solid var(--line)">
          ${(room.transcripts || []).map((t) => `
            <div style="padding:6px 0;border-bottom:1px dashed var(--line);font-size:13.5px">
              <b style="color:var(--amber)">${esc(t.studentName)}:</b> "${esc(t.text)}"
            </div>
          `).join('')}
          ${!room.transcripts?.length ? `<div style="color:var(--cream-faint);font-style:italic">No speech recorded yet. Speak your first point using the mic!</div>` : ''}
        </div>
      </div>
    `;

    const micBtn = $('#gd-mic-btn');
    micBtn.onclick = () => {
      if (!SpeechInput.supported) { toast('Speech recognition not supported in browser.', 'coral'); return; }
      if (!SpeechInput.listening) {
        micBtn.classList.add('on');
        $('#gd-mic-status').textContent = 'Listening... Speak your sentence clearly';
        SpeechInput.start({
          onResult: ({ final, interim }) => { $('#gd-mic-transcript').textContent = (final + ' ' + interim).trim(); },
          onEnd: async (finalTranscript) => {
            micBtn.classList.remove('on');
            $('#gd-mic-status').textContent = 'Tap mic to speak another point';
            if (finalTranscript && finalTranscript.trim()) {
              try {
                const res = await Api.submitGdSpeech(room._id, finalTranscript.trim());
                toast('Speech added to GD room transcript', 'sprout');
                const fresh = await Api.getGdRoom(room._id);
                renderGdActiveRoomView(area, fresh);
              } catch (err) {
                apiError(err);
              }
            }
          },
          onError: (e) => { micBtn.classList.remove('on'); $('#gd-mic-status').textContent = 'Mic error: ' + e; }
        });
      } else {
        SpeechInput.stop();
      }
    };

    $('#end-student-gd-btn').onclick = async () => {
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
  }

  function renderStudentGdReport(room) {
    const area = $('#peer-room-area') || mount;
    const userId = S.user?._id || S.user?.id;
    const myReport = (room.reports || []).find((r) => (r.student?._id || r.student) === userId) || (room.reports && room.reports[0]);

    area.innerHTML = `
      <div class="card card-2" style="border:2px solid var(--color-primary);background:var(--color-surface);margin-top:16px">
        <div class="row gap-sm" style="align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
          <div>
            <span class="pill sprout" style="font-size:13px;font-weight:700">🎉 GD Session Completed (+25 XP)</span>
            <h3 style="font-size:22px;margin-top:4px;color:var(--color-text)">Speech AI Performance Report</h3>
            <div style="font-size:13.5px;color:var(--cream-dim)">Topic: <b>"${esc(room.topic)}"</b></div>
          </div>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" id="back-to-peer-btn">⬅️ Back to Peer Hub</button>
        </div>

        ${myReport ? `
          <div class="grid grid-2 gap-md" style="margin-bottom:20px">
            <div class="card card-2" style="text-align:center;padding:24px;background:var(--color-surface-2)">
              <div class="eyebrow">Overall GD Score</div>
              <div style="font-size:48px;font-weight:900;color:${scoreColor(myReport.overallScore)};margin:8px 0">${myReport.overallScore}/100</div>
              <div class="pill sprout" style="display:inline-block">+25 XP Awarded</div>
            </div>

            <div class="grid grid-2 gap-xs">
              <div class="card card-2" style="padding:12px"><div class="eyebrow">Clarity &amp; Fluency</div><h3 style="color:${scoreColor(myReport.clarityScore)}">${myReport.clarityScore}%</h3></div>
              <div class="card card-2" style="padding:12px"><div class="eyebrow">Grammar Accuracy</div><h3 style="color:${scoreColor(myReport.grammarScore)}">${myReport.grammarScore}%</h3></div>
              <div class="card card-2" style="padding:12px"><div class="eyebrow">Vocabulary</div><h3 style="color:${scoreColor(myReport.vocabularyScore)}">${myReport.vocabularyScore}%</h3></div>
              <div class="card card-2" style="padding:12px"><div class="eyebrow">Interaction</div><h3 style="color:${scoreColor(myReport.interactionScore)}">${myReport.interactionScore}%</h3></div>
            </div>
          </div>

          <!-- Key Strengths -->
          ${myReport.strengths && myReport.strengths.length ? `
            <div class="card card-2" style="margin-bottom:14px;background:var(--color-success-soft);border-left:4px solid var(--color-success)">
              <div style="font-size:15px;font-weight:700;color:var(--emerald);margin-bottom:6px">🌟 Key Strengths Observed</div>
              <ul style="margin:0;padding-left:20px;font-size:14px;color:var(--cream);line-height:1.5">
                ${myReport.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Sentence Corrections -->
          ${myReport.corrections && myReport.corrections.length ? `
            <div class="card card-2" style="margin-bottom:14px;background:var(--color-error-soft);border-left:4px solid var(--color-error)">
              <div style="font-size:15px;font-weight:700;color:var(--coral);margin-bottom:6px">✏️ Sentence &amp; Grammar Refinements</div>
              ${myReport.corrections.map((c) => `
                <div style="margin-bottom:8px;font-size:13.5px">
                  <div style="color:var(--coral)"><b>Spoken:</b> "${esc(c.original)}"</div>
                  <div style="color:var(--emerald);margin-top:2px"><b>Improved:</b> "${esc(c.corrected)}"</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Actionable Skill Suggestions -->
          ${myReport.suggestions && myReport.suggestions.length ? `
            <div class="card card-2" style="margin-bottom:16px;background:var(--color-streak-soft);border-left:4px solid var(--color-streak)">
              <div style="font-size:15px;font-weight:700;color:var(--amber);margin-bottom:6px">💡 Targeted Skill Improvement Suggestions</div>
              <ul style="margin:0;padding-left:20px;font-size:14px;color:var(--cream);line-height:1.6">
                ${myReport.suggestions.map((sug) => `<li>${esc(sug)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        ` : `
          <div class="empty-state">No individual report available for this session.</div>
        `}
      </div>
    `;

    const backBtn = $('#back-to-peer-btn');
    if (backBtn) backBtn.onclick = () => renderPeerMain();
  }

  function openPeerRoom(session, topic) {
    activeSession = session;
    const roomArea = $('#peer-room-area');
    const matchCard = $('#peer-match-card');
    if (matchCard) matchCard.style.display = 'none';

    roomArea.innerHTML = `
      <div class="card" style="border:2px solid var(--color-primary);background:var(--color-surface);margin-top:10px">
        <div class="row gap-sm" style="align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
          <div>
            <div class="pill voice" style="font-size:12px">&#x1F507; Voice Anonymization Active</div>
            <h3 style="font-size:18px;margin-top:4px">Connected: Anonymized Voice Call</h3>
            <div style="font-size:13px;color:var(--cream-dim)">Discussion Topic: <b>${esc(topic)}</b></div>
          </div>
          <div class="spacer"></div>
          <button class="btn btn-coral btn-sm" id="end-peer-session-btn">${ICONS.x} End Call &amp; Rate</button>
        </div>

        <div class="grid grid-2 gap-md" style="margin-bottom:16px">
          <div class="card card-2" style="text-align:center;padding:16px;background:var(--color-surface-2)">
            <div class="avatar" style="width:54px;height:54px;margin:0 auto 8px;background:var(--purple);font-size:22px">YOU</div>
            <div style="font-weight:700;font-size:15px">${esc(S.user?.name || 'You')} (Anonymized)</div>
            <div style="font-size:12px;color:var(--emerald);margin-top:2px">&#x2714; Mic Connected</div>
          </div>
          <div class="card card-2" style="text-align:center;padding:16px;background:var(--color-surface-2)">
            <div class="avatar" style="width:54px;height:54px;margin:0 auto 8px;background:var(--amber);font-size:22px">PEER</div>
            <div style="font-weight:700;font-size:15px">Peer Student (Anonymized)</div>
            <div style="font-size:12px;color:var(--emerald);margin-top:2px">&#x26A1; Voice Stream Filtered</div>
          </div>
        </div>

        <div class="card card-2" style="margin-bottom:14px;background:var(--color-surface-2)">
          <div class="section-title" style="font-size:14px;margin-bottom:6px">&#x1F4A1; Conversation Starter Prompts</div>
          <ul style="padding-left:20px;margin:0;font-size:13.5px;color:var(--cream);line-height:1.6">
            <li>"What is an exciting project, hobby, or goal you worked on recently?"</li>
            <li>"How do you prepare for campus placement interviews and group discussions?"</li>
            <li>"What is your favorite travel destination or memorable life experience?"</li>
          </ul>
        </div>

        <div class="row gap-md" style="align-items:center">
          <button class="rec-btn" id="peer-mic-btn">${ICONS.mic}</button>
          <div class="col" style="flex:1">
            <div id="peer-status" style="font-weight:700;font-size:14.5px">Tap mic to speak to your peer</div>
            <div id="peer-transcript" style="font-size:13.5px;color:var(--cream-dim);margin-top:2px"></div>
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
        <div class="row" style="margin-bottom:10px;align-items:center">
          <div class="row gap-sm">
            <span class="pill ${levelColor(c.level)}">${c.level}</span>
            
          </div>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" data-play>${ICONS.play} Play audio</button>
        </div>
        <h3 style="font-size:17px;margin-bottom:8px">${esc(c.title)}</h3>
        <p style="font-size:15px;color:var(--cream-dim);margin:0 0 14px">${esc(c.question)}</p>
        <div class="row gap-md">
          <button class="rec-btn" data-rec style="width:52px;height:52px">${ICONS.mic}</button>
          <div class="col" style="flex:1"><div data-status style="font-weight:700;font-size:14.5px">Play the audio, then record your answer</div><div data-transcript style="font-size:13.5px;color:var(--cream-dim);margin-top:4px"></div></div>
        </div>
        <div data-result style="margin-top:12px"></div>
      </div>`);
    card.querySelector('[data-play]').onclick = ()=> SpeechOutput.speak(c.script);
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
VIEW_RENDERERS['debate'] = async (mount) => {
  renderDebateView();

  async function renderDebateView() {
    mount.innerHTML = `<div class="card">${wave(5)}</div>`;
    let topicData;
    try {
      topicData = await Api.nextDebateTopic();
    } catch (err) {
      topicData = { topic: null, unattemptedRemaining: 0, totalTopicsCount: 0 };
    }

    const topic = topicData.topic || {
      _id: null,
      topic: 'Should social media platforms verify the identity of every user?',
      level: 'Advanced',
      context: 'Identity verification could reduce online harassment and bot networks, but raises serious privacy and surveillance concerns.',
      forKeyPoints: ['Reduces fake bot accounts and online harassment', 'Increases user accountability for digital statements'],
      againstKeyPoints: ['Presents severe user privacy and data breach risks', 'Restricts freedom of speech for whistleblowers'],
    };

    mount.innerHTML = `
      <div class="col gap-md">
        <!-- Header -->
        <div class="card card-white-accent">
          <div class="row" style="align-items:center">
            <div>
              <div class="section-title" style="margin:0">${ICONS.mic} Debate Practice</div>
              <div style="font-size:13.5px;color:var(--cream-dim)">Structured reasoning and persuasive speaking. Choose a stance and deliver your argument.</div>
            </div>
            <div class="spacer"></div>
            <span class="pill sprout">⚡ ${topicData.unattemptedRemaining || 0} Unseen Topics Remaining</span>
          </div>
        </div>

        <!-- Active Debate Card -->
        <div class="card">
          <div class="row gap-sm" style="margin-bottom:12px;align-items:center">
            <span class="pill voice">Debate Arena</span>
            <span class="pill sprout">${esc(topic.level || 'Advanced')}</span>
            <div class="spacer"></div>
            <button class="btn btn-outline btn-sm" id="skip-topic-btn">🔄 Next Topic</button>
          </div>

          <h3 style="font-size:22px;color:var(--color-text);margin-bottom:12px;line-height:1.35">${esc(topic.topic)}</h3>

          ${topic.context ? `
            <div style="background:var(--panel-2);padding:14px 16px;border-radius:12px;border:1px solid var(--white-border);margin-bottom:16px">
              <div class="eyebrow" style="margin-bottom:4px">💡 Debate Background &amp; Context</div>
              <div style="font-size:14.5px;line-height:1.6;color:var(--color-text)">${esc(topic.context)}</div>
            </div>
          ` : ''}

          <!-- Stance Selection Buttons -->
          <div class="col gap-xs" style="margin-bottom:18px">
            <label class="field-label" style="margin-bottom:4px">Select Your Debate Stance:</label>
            <div class="row gap-sm">
              <button class="btn btn-primary btn-sm" id="btn-stance-for" data-stance="for">👍 Argue FOR (Support)</button>
              <button class="btn btn-ghost btn-sm" id="btn-stance-against" data-stance="against">👎 Argue AGAINST (Oppose)</button>
            </div>
          </div>

          <!-- Stance Hints Card -->
          <div id="stance-hints-box" style="background:var(--card-sub);padding:12px 16px;border-radius:10px;margin-bottom:18px;border-left:3px solid var(--cyan)">
            <div class="eyebrow" id="hints-title">Suggested Key Arguments (FOR)</div>
            <ul id="hints-list" style="margin:6px 0 0 18px;padding:0;font-size:13.5px;color:var(--cream-dim)">
              ${(topic.forKeyPoints || ['Dramatically improves system performance', 'Reduces operational overhead']).map((p) => `<li>${esc(p)}</li>`).join('')}
            </ul>
          </div>

          <div class="row gap-md" style="margin-top:10px">
            <button class="rec-btn" id="debate-rec">${ICONS.mic}</button>
            <div class="col" style="flex:1">
              <div id="debate-status" style="font-weight:700;font-size:15px">Choose your stance above, then tap mic to record your argument</div>
              <div id="debate-transcript" style="font-size:14px;color:var(--cream-dim);margin-top:4px"></div>
            </div>
          </div>

          <div id="debate-result" style="margin-top:20px"></div>
        </div>
      </div>
    `;

    // Skip / Next Topic Button
    $('#skip-topic-btn').onclick = () => {
      toast('Loading next unattempted topic…', 'sprout');
      renderDebateView();
    };

    let selectedStance = 'for';
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

    btnFor.onclick = () => { selectedStance = 'for'; updateStanceUI(); };
    btnAgainst.onclick = () => { selectedStance = 'against'; updateStanceUI(); };

    const recBtn = $('#debate-rec');
    recBtn.onclick = () => {
      if (!SpeechInput.supported) { toast('Speech recognition not supported in browser.', 'coral'); return; }
      if (!SpeechInput.listening) {
        recBtn.classList.add('on');
        $('#debate-status').textContent = 'Listening to your debate speech…';
        SpeechInput.start({
          onResult: ({ final, interim }) => {
            $('#debate-transcript').textContent = (final + ' ' + interim).trim();
          },
          onEnd: async (finalTranscript) => {
            recBtn.classList.remove('on');
            if (!finalTranscript) {
              $('#debate-status').textContent = 'No speech captured — tap to try again';
              return;
            }
            $('#debate-status').textContent = 'Evaluating argument with Local AI…';
            try {
              const res = await Api.submitDebate({ topicId: topic._id, stance: selectedStance, transcript: finalTranscript });
              const report = res.attempt;
              $('#debate-result').innerHTML = `
                <div class="card card-2" style="background:var(--color-surface-2);border:1px solid var(--line);margin-top:14px">
                  <div class="row gap-sm" style="margin-bottom:12px;align-items:center">
                    <span class="pill sprout" style="font-size:14px;font-weight:700">Overall Score: ${report.scores.overall}/100</span>
                    <span class="pill voice" style="font-size:13px;font-weight:700">+25 XP Earned</span>
                  </div>
                  <div class="grid grid-3 gap-xs" style="margin-bottom:14px">
                    <div class="card" style="text-align:center;padding:8px">
                      <div class="eyebrow">Clarity</div>
                      <div style="font-size:18px;font-weight:700;color:var(--purple)">${report.scores.clarity}%</div>
                    </div>
                    <div class="card" style="text-align:center;padding:8px">
                      <div class="eyebrow">Persuasiveness</div>
                      <div style="font-size:18px;font-weight:700;color:var(--emerald)">${report.scores.persuasiveness}%</div>
                    </div>
                    <div class="card" style="text-align:center;padding:8px">
                      <div class="eyebrow">Vocabulary</div>
                      <div style="font-size:18px;font-weight:700;color:var(--amber)">${report.scores.vocabulary}%</div>
                    </div>
                  </div>
                  <div style="font-size:14px;color:var(--color-text);line-height:1.5">${esc(report.feedback)}</div>
                </div>
              `;
              addStudentXP(25);
              $('#debate-status').textContent = 'Done! Tap to record again.';
            } catch (err) {
              apiError(err);
              $('#debate-status').textContent = 'Error evaluating debate argument.';
            }
          },
          onError: (e) => {
            recBtn.classList.remove('on');
            $('#debate-status').textContent = 'Mic error: ' + e;
          },
        });
      } else {
        SpeechInput.stop();
      }
    };
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
          <div class="brand-mark" style="width:28px;height:28px;border-radius:8px;font-size:13px;flex-shrink:0">${ICONS.message}</div>
          <div style="min-width:0">
            <div style="font-weight:700;font-size:14.5px;color:var(--color-text);line-height:1.2;white-space:nowrap">AI Coach</div>
            <div style="font-size:11px;color:var(--emerald);display:flex;align-items:center;gap:4px;white-space:nowrap">
              <span class="status-dot ok" style="width:6px;height:6px"></span> Online
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
  const [progress, leaderboard] = await Promise.all([Api.myProgress(), Api.leaderboard()]);
  mount.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="section-title">${ICONS.trophy} Badges</div>
        <div class="grid grid-2">
          ${progress.badges.map(b=>`
            <div class="badge-card ${b.unlocked?'':'locked'}">
              <div class="badge-ic">${ICONS.trophy}</div>
              <div style="font-weight:700;font-size:13px">${esc(b.name)}</div>
              <div style="font-size:11.5px;color:var(--color-text-muted);margin-top:3px">${esc(b.description)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="section-title">${ICONS.bolt} Leaderboard</div>
        <div class="table-wrap">
          <table style="width:100%">
            <tbody>
              ${leaderboard.map((u,i)=>{
                const isMe = u._id === S.user._id || u.id === S.user.id || u.email === S.user.email;
                const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
                const rankColor = i === 0 ? '#FACC15' : i === 1 ? '#CBD5E1' : i === 2 ? '#FDBA74' : 'var(--color-text-muted)';
                return `
                  <tr class="leader-row ${rankClass} ${isMe ? 'current-user' : 'tr-hover'}">
                    <td class="mono" style="width:36px;font-weight:800;color:${rankColor};text-align:center">${i+1}</td>
                    <td class="row gap-sm" style="padding:10px 14px">
                      ${avatarHTML(u.name, 30)}
                      <span style="font-weight:${isMe ? '700' : '500'}">${esc(u.name)} ${isMe ? '<span class="pill voice" style="font-size:10px;padding:1px 6px">You</span>' : ''}</span>
                    </td>
                    <td class="mono" style="font-size:13px;font-weight:700;text-align:right;padding:10px 14px;color:var(--color-gem-text)">${u.xp} XP</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
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

      <!-- Topics Grid (Clean Syllabus Order, Sequential Unlocking) -->
      <div class="grid grid-2" id="grammar-grid">
        ${topics.length ? topics.map(t => {
          const isDone = !!(t.isCompleted || t.completed);
          const isLocked = !!t.isLocked;
          const isCurrent = !isLocked && !isDone && (!firstActiveUnlocked || String(firstActiveUnlocked._id) === String(t._id));
          const hasVideo = !!t.videoUrl;
          const qCount = t.questionCount || (t.questions && t.questions.length) || 25;
          const orderNum = t.order || t.topicId || '';

          return `
            <div id="topic-card-${t._id}" class="grammar-topic-card ${isDone ? 'completed' : ''}" style="${isLocked ? 'opacity:0.62;background:var(--color-surface-1);border:1px dashed var(--line);' : isCurrent ? 'border:2px solid var(--purple);box-shadow:0 0 16px rgba(124, 58, 237, 0.25);' : ''}">
              <div>
                <div class="row gap-xs" style="margin-bottom:10px;flex-wrap:wrap;align-items:center">
                  <span class="pill ${t.category === 'Tenses' ? 'amber' : t.category === 'Common Pitfalls' ? 'coral' : 'sprout'}" style="font-size:11px">
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
        }).join('') : '<div class="card empty-state">No grammar topics available.</div>'}
      </div>

      <div id="grammar-active-area"></div>
    </div>
  `;

  mount.querySelectorAll('[data-start-grammar]').forEach(btn => {
    btn.onclick = () => openGrammarQuiz(btn.dataset.startGrammar, mount, topics);
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

      if (res.xpEarned > 0) {
        toast(`+${res.xpEarned} XP Earned! Excellent job!`, 'sprout');
        addStudentXP(res.xpEarned);
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
