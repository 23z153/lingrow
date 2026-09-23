const VIEW_RENDERERS = {};

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
      <div class="card"><div class="eyebrow">Level</div><h2 style="font-size:24px">${progress.level}</h2></div>
      <div class="card"><div class="eyebrow">Total XP</div><h2 style="font-size:24px" id="dash-total-xp">${progress.xp}</h2></div>
      <div class="card"><div class="eyebrow">Streak</div><h2 style="font-size:24px">${progress.streak} days</h2></div>
      <div class="card"><div class="eyebrow">Badges</div><h2 style="font-size:24px">${progress.badges.filter(b=>b.unlocked).length}/${progress.badges.length}</h2></div>
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
      b.style.borderColor = 'var(--line)';
      b.style.background = 'transparent';
      b.style.color = '#FFFFFF';
    });

    if (activeNotifTab === 'word') {
      btnWord.style.borderColor = 'var(--purple)';
      btnWord.style.background = 'var(--purple)';
      btnWord.style.color = '#FFFFFF';
      if (!dailyWord) {
        contentDiv.innerHTML = `<div class="empty-state" style="color:#FFFFFF">No daily word available today.</div>`;
        return;
      }
      contentDiv.innerHTML = `
        <div class="col gap-xs" style="color:#FFFFFF">
          <div class="row gap-sm" style="align-items:center">
            <h3 style="font-size:22px;font-weight:700;color:#FFFFFF">${esc(dailyWord.word)}</h3>
            <span class="pill voice" style="font-size:12px;color:#FFFFFF;border-color:rgba(255,255,255,0.25)">${esc(dailyWord.partOfSpeech)}</span>
            <div class="spacer"></div>
            <span class="pill" style="font-size:11.5px;color:#FFFFFF;border-color:rgba(255,255,255,0.25)">Today's Word</span>
          </div>
          <div style="font-size:15px;color:#FFFFFF;line-height:1.55;margin-top:4px">
            <strong style="color:#FFFFFF">Meaning:</strong> ${esc(dailyWord.meaning)}
          </div>
          <div style="font-size:14.5px;color:#FFFFFF;line-height:1.55;margin-top:6px;padding:9px 13px;background:rgba(255,255,255,0.06);border-left:3px solid var(--amber);border-radius:6px">
            <b style="color:var(--amber)">&#x1F4A1; Why It's Relevant:</b> <span style="color:#FFFFFF">${esc(dailyWord.relevancy)}</span>
          </div>
          <div style="font-size:13.5px;color:#FFFFFF;margin-top:6px;font-style:italic">
            "${esc(dailyWord.example)}"
          </div>
        </div>
      `;
    } else if (activeNotifTab === 'quiz') {
      btnQuiz.style.borderColor = 'var(--amber)';
      btnQuiz.style.background = 'var(--amber)';
      btnQuiz.style.color = '#0F172A';
      if (!dailyWord) {
        contentDiv.innerHTML = `<div class="empty-state" style="color:#FFFFFF">No quiz available today.</div>`;
        return;
      }

      const isAnswered = dailyRes?.answered;
      const userAnswer = dailyRes?.userAnswer;

      if (isAnswered) {
        const isCorrect = userAnswer.isCorrect;
        contentDiv.innerHTML = `
          <div class="col gap-xs" style="color:#FFFFFF">
            <div class="row gap-sm">
              <span class="pill ${isCorrect ? 'sprout' : 'coral'}">${isCorrect ? '&#x2714; Challenge Completed (+10 XP)' : '&#x2716; Completed'}</span>
            </div>
            <div style="font-size:15.5px;font-weight:700;margin-top:6px;color:#FFFFFF">${esc(dailyWord.question.prompt)}</div>
            <div style="font-size:14.5px;color:#FFFFFF;margin-top:4px">
              Your answer: <b style="color:${isCorrect ? 'var(--emerald)' : 'var(--coral)'}">${esc(dailyWord.question.options[userAnswer.selectedOption])}</b>
              ${!isCorrect ? ` &middot; Correct: <b style="color:var(--emerald)">${esc(dailyWord.question.options[dailyWord.question.correctAnswer])}</b>` : ''}
            </div>
            <div style="font-size:13.5px;color:#FFFFFF;margin-top:6px;font-style:italic">
              &#x1F4A1; ${esc(dailyWord.question.explanation)}
            </div>
          </div>
        `;
      } else {
        contentDiv.innerHTML = `
          <form id="afternoon-quiz-form" class="col gap-xs">
            <div style="font-size:12.5px;color:var(--amber);text-transform:uppercase;letter-spacing:0.8px;font-weight:700">&#x26A1; Afternoon Practice Challenge</div>
            <div style="font-size:15.5px;font-weight:700;margin-top:2px;color:#FFFFFF">${esc(dailyWord.question.prompt)}</div>

            <div class="col gap-xs" style="margin-top:6px">
              ${dailyWord.question.options.map((opt, idx) => `
                <label class="row gap-sm" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer;font-size:14.5px;color:#FFFFFF" id="quiz-opt-lbl-${idx}">
                  <input type="radio" name="daily_quiz_opt" value="${idx}" style="accent-color:var(--amber)">
                  <span style="color:#FFFFFF">${esc(opt)}</span>
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
  const dept = S.user?.department || 'CSE';
  mount.innerHTML = `
    <div class="row" style="margin-bottom:14px;align-items:center">
      <div>
        <div class="section-title" style="margin-bottom:2px">${ICONS.mic} Read Aloud (${dept} Department Bank)</div>
        <div style="font-size:14px;color:var(--cream-dim)">Showing 5 randomly selected technical passages from your department's 50+ question bank pool.</div>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" id="refresh-passages-btn">${ICONS.activity} Refresh 5 Questions</button>
    </div>
    <div class="grid grid-3" id="passage-grid"></div>
    <div id="practice-area" style="margin-top:20px"></div>
  `;
  const grid = $('#passage-grid');
  passages.forEach(p=>{
    grid.appendChild(el(`
      <div class="card" style="cursor:pointer" data-id="${p._id}">
        <div class="row gap-sm" style="margin-bottom:10px">
          <span class="pill ${levelColor(p.level)}">${p.level}</span>
          <span class="pill sprout">${p.department || dept}</span>
        </div>
        <h3 style="font-size:17px;margin-bottom:6px">${esc(p.title)}</h3>
        <div style="font-size:13.5px;color:var(--cream-faint)">${p.wordCount} words</div>
      </div>`));
  });
  grid.querySelectorAll('[data-id]').forEach(card=>{
    card.onclick = ()=> openReadAloudPractice(passages.find(p=>p._id===card.dataset.id));
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
  $('#result-area').innerHTML = `
    <div class="grid grid-3" style="margin-bottom:14px">
      <div class="card card-2"><div class="eyebrow">Accuracy</div><h3 style="color:${scoreColor(attempt.accuracy)}">${attempt.accuracy}%</h3></div>
      <div class="card card-2"><div class="eyebrow">Fluency</div><h3 style="color:${scoreColor(attempt.fluency)}">${attempt.fluency}%</h3></div>
      <div class="card card-2"><div class="eyebrow">Pace</div><h3>${attempt.pace} wpm</h3></div>
    </div>
    <div class="card card-2"><div class="eyebrow">Word-level accuracy</div><div class="passage-box" style="font-family:var(--font-body);font-size:15.5px">${wordsHTML}</div></div>
    <div class="card card-2" style="margin-top:14px"><div class="eyebrow">Coach feedback</div><p style="font-size:15px;line-height:1.6">${esc(attempt.feedback)}</p></div>
    <div class="pill sprout" style="margin-top:14px">+${xpGain} XP earned</div>
  `;
}

/* ---------------------------- VOCABULARY ---------------------------- */
VIEW_RENDERERS['vocabulary'] = async (mount) => {
  const words = await Api.vocab();
  mount.innerHTML = `<div class="grid grid-3" id="vocab-grid"></div>`;
  const grid = $('#vocab-grid');
  words.forEach(w=>{
    const card = el(`
      <div class="flashcard" data-id="${w._id}" data-flipped="0">
        <div class="face-front">
          <div class="pill ${levelColor(w.level)}" style="margin-bottom:8px">${w.level}</div>
          <div class="word-main">${esc(w.word)}</div>
          <div class="word-sub">Tap to reveal meaning</div>
          ${w.mastered ? `<div class="pill sprout" style="margin-top:8px">${ICONS.check} Mastered</div>` : ''}
        </div>
      </div>`);
    card.onclick = (e)=>{
      if (e.target.closest('button')) return;
      const flipped = card.dataset.flipped === '1';
      if (!flipped){
        card.dataset.flipped='1';
        card.innerHTML = `
          <div style="font-weight:700;font-size:14px;color:var(--cream-faint)">${esc(w.partOfSpeech)}</div>
          <div style="font-size:15px;margin:8px 0">${esc(w.meaning)}</div>
          <div style="font-size:14px;color:var(--cream-dim);font-style:italic">"${esc(w.example)}"</div>
          <div class="row gap-sm" style="margin-top:12px">
            <button class="btn btn-ghost btn-sm" data-listen>${ICONS.play}</button>
            <button class="btn btn-primary btn-sm" data-know>I know this</button>
          </div>`;
        card.querySelector('[data-listen]').onclick = (ev)=>{ ev.stopPropagation(); SpeechOutput.speak(`${w.word}. ${w.example}`); };
        card.querySelector('[data-know]').onclick = async (ev)=>{
          ev.stopPropagation();
          try{ await Api.reviewVocab(w._id, true); toast(`Marked "${w.word}" as mastered (+5 XP)`); addStudentXP(5); }
          catch(err){ apiError(err); }
        };
      }
    };
    grid.appendChild(card);
  });
};

/* ---------------------------- LISTENING ---------------------------- */
VIEW_RENDERERS['listening'] = async (mount) => {
  const clips = await Api.listeningClips();
  const dept = S.user?.department || 'CSE';
  mount.innerHTML = `
    <div class="row" style="margin-bottom:14px;align-items:center">
      <div>
        <div class="section-title" style="margin-bottom:2px">${ICONS.headphones} Listening Comprehension (${dept} Department Bank)</div>
        <div style="font-size:14px;color:var(--cream-dim)">Showing 5 randomly sampled audio scripts from your department's 50+ question bank pool.</div>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" id="refresh-listening-btn">${ICONS.activity} Refresh 5 Questions</button>
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
            <span class="pill sprout">${c.department || dept}</span>
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
  const prompts = await Api.storyPrompts();
  const prompt = prompts[Math.floor(Math.random()*prompts.length)];
  mount.innerHTML = `
    <div class="card">
      <div class="pill voice" style="margin-bottom:10px">Advanced</div>
      <div class="passage-box">${esc(prompt.prompt)}</div>
      <div class="row gap-md" style="margin-top:22px">
        <button class="rec-btn" id="story-rec">${ICONS.mic}</button>
        <div class="col" style="flex:1"><div id="story-status" style="font-weight:700;font-size:15px">Continue the story out loud</div><div id="story-transcript" style="font-size:14px;color:var(--cream-dim);margin-top:4px"></div></div>
      </div>
      <div id="story-result" style="margin-top:18px"></div>
    </div>`;
  let startTime;
  const recBtn = $('#story-rec');
  recBtn.onclick = ()=>{
    if (!SpeechInput.supported){ toast('Speech recognition not supported in this browser.', 'coral'); return; }
    if (!SpeechInput.listening){
      recBtn.classList.add('on'); startTime = Date.now();
      $('#story-status').textContent = 'Listening…';
      SpeechInput.start({
        onResult: ({final,interim})=>{ $('#story-transcript').textContent = (final+' '+interim).trim(); },
        onEnd: async (finalTranscript)=>{
          recBtn.classList.remove('on');
          if (!finalTranscript){ $('#story-status').textContent='No speech captured — try again'; return; }
          $('#story-status').textContent = 'Scoring your continuation…';
          try{
            const { attempt } = await Api.submitStory({ promptId: prompt._id, transcript: finalTranscript });
            const s = attempt.scores;
            $('#story-result').innerHTML = `
              <div class="grid grid-4" style="margin-bottom:14px">
                ${['creativity','coherence','vocabulary','grammarFlow'].map(k=>`<div class="card card-2"><div class="eyebrow">${k}</div><h3 style="color:${scoreColor(s[k])}">${s[k]}</h3></div>`).join('')}
              </div>
              <div class="card card-2"><div class="eyebrow">Feedback</div><p style="font-size:15px">${esc(attempt.feedback)}</p></div>`;
            $('#story-status').textContent = 'Done';
            addStudentXP(Math.round(15 + s.overall/5));
          } catch(err){ apiError(err); }
        },
        onError:(e)=>{ recBtn.classList.remove('on'); $('#story-status').textContent='Mic error: '+e; },
      });
    } else SpeechInput.stop();
  };
};

/* ---------------------------- DEBATE ---------------------------- */
VIEW_RENDERERS['debate'] = async (mount) => {
  const topics = await Api.debateTopics();
  const topic = topics[Math.floor(Math.random()*topics.length)];
  mount.innerHTML = `
    <div class="card">
      <div class="pill voice" style="margin-bottom:10px">Advanced</div>
      <h3 style="margin-bottom:16px">${esc(topic.topic)}</h3>
      <div class="row gap-sm" style="margin-bottom:18px">
        <button class="btn btn-ghost btn-sm active-stance" data-stance="for">Argue FOR</button>
        <button class="btn btn-ghost btn-sm" data-stance="against">Argue AGAINST</button>
      </div>
      <div class="row gap-md">
        <button class="rec-btn" id="debate-rec">${ICONS.mic}</button>
        <div class="col" style="flex:1"><div id="debate-status" style="font-weight:700;font-size:15px">Choose a stance, then record your argument</div><div id="debate-transcript" style="font-size:14px;color:var(--cream-dim);margin-top:4px"></div></div>
      </div>
      <div id="debate-result" style="margin-top:18px"></div>
    </div>`;
  let stance = 'for';
  mount.querySelectorAll('[data-stance]').forEach(btn=>{
    btn.onclick = ()=>{ stance = btn.dataset.stance; mount.querySelectorAll('[data-stance]').forEach(b=>b.classList.remove('btn-primary')); btn.classList.add('btn-primary'); };
  });
  let startTime;
  const recBtn = $('#debate-rec');
  recBtn.onclick = ()=>{
    if (!SpeechInput.supported){ toast('Speech recognition not supported in this browser.', 'coral'); return; }
    if (!SpeechInput.listening){
      recBtn.classList.add('on'); startTime = Date.now();
      $('#debate-status').textContent = 'Listening…';
      SpeechInput.start({
        onResult: ({final,interim})=>{ $('#debate-transcript').textContent = (final+' '+interim).trim(); },
        onEnd: async (finalTranscript)=>{
          recBtn.classList.remove('on');
          if (!finalTranscript){ $('#debate-status').textContent='No speech captured — try again'; return; }
          $('#debate-status').textContent = 'Judging your argument…';
          try{
            const { attempt } = await Api.submitDebate({ topicId: topic._id, stance, transcript: finalTranscript });
            const s = attempt.scores;
            $('#debate-result').innerHTML = `
              <div class="grid grid-4" style="margin-bottom:14px">
                ${['clarity','logic','vocabulary','counterargument'].map(k=>`<div class="card card-2"><div class="eyebrow">${k}</div><h3 style="color:${scoreColor(s[k])}">${s[k]}</h3></div>`).join('')}
              </div>
              <div class="card card-2"><div class="eyebrow">Overall: ${s.overall}</div><p style="font-size:15px">${esc(attempt.feedback)}</p></div>`;
            $('#debate-status').textContent = 'Done';
            addStudentXP(Math.round(15 + s.overall/5));
          } catch(err){ apiError(err); }
        },
        onError:(e)=>{ recBtn.classList.remove('on'); $('#debate-status').textContent='Mic error: '+e; },
      });
    } else SpeechInput.stop();
  };
};

/* ---------------------------- PEER PRACTICE ---------------------------- */
VIEW_RENDERERS['peer'] = async (mount) => {
  const sessions = await Api.myPeerSessions();
  mount.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="section-title">${ICONS.mask} Find a practice partner</div>
        <p style="font-size:14.5px;color:var(--cream-dim);margin:0 0 16px;line-height:1.6">Your voice is anonymized before it reaches your partner (and theirs before it reaches you) — a real deployment routes audio through a server-side voice-conversion service so neither of you hears the other's real voice.</p>
        <label class="field-label">Topic (optional)</label>
        <input type="text" id="peer-topic" placeholder="e.g. Favourite way to spend a weekend" style="margin-bottom:14px">
        <button class="btn btn-primary" id="peer-find">${ICONS.users} Find a partner</button>
        <div id="peer-status" style="margin-top:14px;font-size:14px;color:var(--cream-dim)"></div>
      </div>
      <div class="card">
        <div class="section-title">${ICONS.grid} Past sessions</div>
        ${sessions.length ? sessions.map(s=>`
          <div class="row" style="padding:10px 0;border-bottom:1px solid var(--line)">
            <div style="flex:1;font-size:14.5px">${esc(s.topic||'Open conversation')}</div>
            <div class="pill ${s.status==='ended'?'muted':'sprout'}">${s.status}</div>
          </div>`).join('') : `<div class="empty-state">No sessions yet.</div>`}
      </div>
    </div>
  `;
  $('#peer-find').onclick = async ()=>{
    $('#peer-status').textContent = 'Searching for a partner…';
    try{
      const res = await Api.joinPeerQueue($('#peer-topic').value);
      if (res.matched){
        $('#peer-status').innerHTML = `<div class="pill sprout">Matched!</div> Connected anonymously. In the full app this opens a live voice-anonymized call here.`;
      } else {
        $('#peer-status').textContent = `You're #${res.position} in the queue — waiting for another student to join.`;
      }
    } catch(err){ apiError(err); }
  };
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
            <div style="font-weight:700;font-size:14.5px;color:#FFFFFF;line-height:1.2;white-space:nowrap">AI Coach</div>
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
      <div id="rag-drawer" style="display:none;margin-bottom:10px;padding:12px 14px;background:rgba(255,255,255,0.02);border:1px solid var(--line);border-radius:10px;font-size:13px">
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
      await Api.tutorUploadDocument({ title, text, department: user.department || 'CSE' });
      toast('Document indexed successfully into study store!', 'sprout');
      $('#rag-doc-title').value = '';
      $('#rag-doc-text').value = '';
      loadRagDocuments();
    } catch (err) {
      toast(err.message || 'Failed to index document', 'coral');
    }
  };

  const log = $('#chat-log');

  function formatMarkdown(text) {
    if (!text) return '';
    let html = esc(text);
    
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

  function addMsg(role, text, correction = null, verification = null, sources = [], engine = null, draft = null, opts = {}){
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
      if (role === 'assistant' && sources && sources.length > 0) {
        const sourceRow = el(`
          <div class="row gap-xs" style="margin-top:4px;flex-wrap:wrap;animation:fadeIn 0.3s ease">
            ${sources.map(s => `<a href="${esc(s.url || '#')}" target="_blank" class="source-tag">🔗 ${esc(s.title || s.source)}</a>`).join('')}
          </div>
        `);
        wrap.appendChild(sourceRow);
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

  history.forEach(m => addMsg(m.role, m.text, m.correction, m.verification, m.sources, m.engine, m.draft));

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
          if (!fullText && event.replyText) {
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

          if (event.sources && event.sources.length > 0 && wrap) {
            const sourceRow = el(`
              <div class="row gap-xs" style="margin-top:4px;flex-wrap:wrap;animation:fadeIn 0.3s ease">
                ${event.sources.map(s => `<a href="${esc(s.url || '#')}" target="_blank" class="source-tag">🔗 ${esc(s.title || s.source)}</a>`).join('')}
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

  $('#btn-clear-chat').onclick = () => {
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
    toast('Chat cleared', 'info');
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
              <div style="font-size:11.5px;color:var(--cream-faint);margin-top:3px">${esc(b.description)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="section-title">${ICONS.bolt} Leaderboard</div>
        ${leaderboard.map((u,i)=>`
          <div class="row gap-sm" style="padding:9px 0;border-bottom:1px solid var(--line)">
            <div class="mono" style="width:20px;color:var(--cream-faint)">${i+1}</div>
            ${avatarHTML(u.name, 30)}
            <div style="flex:1;font-size:13.5px">${esc(u.name)}</div>
            <div class="mono" style="font-size:12.5px">${u.xp} XP</div>
          </div>`).join('')}
      </div>
    </div>`;
};

/* ---------------------------- GRAMMAR PRACTICE ---------------------------- */
let currentGrammarCategory = 'All';

const GRAMMAR_CAT_ICONS = {
  'All': '✨',
  'Subject-Verb Agreement': '⚡',
  'Tenses': '⏳',
  'Articles & Nouns': '🏷️',
  'Prepositions': '🎯',
  'Common Pitfalls': '⚠️',
};

VIEW_RENDERERS['grammar'] = async (mount) => {
  const topics = await Api.grammarTopics();
  renderGrammarView(mount, topics);
};

function renderGrammarView(mount, topics) {
  const categories = ['All', 'Subject-Verb Agreement', 'Tenses', 'Articles & Nouns', 'Prepositions', 'Common Pitfalls'];

  const filtered = currentGrammarCategory === 'All'
    ? topics
    : topics.filter(t => t.category === currentGrammarCategory);

  mount.innerHTML = `
    <div class="col gap-md">
      <!-- Category Chips Scroll Bar -->
      <div class="grammar-cat-scroll">
        ${categories.map(cat => `
          <button class="grammar-cat-pill ${currentGrammarCategory === cat ? 'active' : ''}" data-cat="${cat}">
            <span>${GRAMMAR_CAT_ICONS[cat] || '📌'}</span>
            <span>${cat}</span>
          </button>
        `).join('')}
      </div>

      <!-- Topics Grid -->
      <div class="grid grid-2" id="grammar-grid">
        ${filtered.length ? filtered.map(t => {
          const isDone = t.completed;
          return `
            <div class="grammar-topic-card ${isDone ? 'completed' : ''}">
              <div>
                <div class="row gap-xs" style="margin-bottom:10px;flex-wrap:wrap">
                  <span class="pill ${t.category === 'Tenses' ? 'amber' : t.category === 'Common Pitfalls' ? 'coral' : 'sprout'}" style="font-size:11px">
                    ${esc(t.category)}
                  </span>
                  <span class="pill voice" style="font-size:10.5px">${t.level}</span>
                  <div class="spacer"></div>
                  ${isDone
                    ? `<span class="pill emerald" style="font-size:11px">${ICONS.check} ${t.bestScore}% Best</span>`
                    : `<span class="pill" style="font-size:10.5px;color:var(--cyan);border-color:rgba(34,211,238,0.3)">⚡ +20 XP</span>`
                  }
                </div>
                <h3 style="font-size:17px;font-weight:700;line-height:1.35;margin-bottom:8px">${esc(t.title)}</h3>
                <p style="font-size:13px;color:var(--cream-dim);line-height:1.55;margin-bottom:14px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
                  ${esc(t.description)}
                </p>
              </div>
              <div class="row gap-sm" style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line);align-items:center">
                <span style="font-size:12px;color:var(--cream-faint);display:inline-flex;align-items:center;gap:4px">
                  📝 ${t.questions.length} Questions
                </span>
                <div class="spacer"></div>
                <button class="btn btn-primary btn-sm" data-start-grammar="${t._id}">
                  ${isDone ? 'Practice Again' : 'Start Practice'} ${ICONS.arrowRight}
                </button>
              </div>
            </div>
          `;
        }).join('') : `<div class="card empty-state">No grammar topics found in this category.</div>`}
      </div>

      <div id="grammar-active-area"></div>
    </div>
  `;

  mount.querySelectorAll('[data-cat]').forEach(btn => {
    btn.onclick = () => {
      currentGrammarCategory = btn.dataset.cat;
      renderGrammarView(mount, topics);
    };
  });

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
    let selectedAnswers = new Array(topic.questions.length).fill(-1);

    activeArea.innerHTML = `
      <div class="col gap-md">
        <!-- Top Navigation & Progress Header -->
        <div class="row gap-sm" style="align-items:center;justify-content:space-between;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" id="btn-back-grammar" style="padding:6px 12px;font-size:13px">
            &larr; Back to Topics
          </button>
          <div class="row gap-xs">
            <span class="pill sprout" style="font-size:11px">${esc(topic.category)}</span>
            <span class="pill voice" style="font-size:10.5px">${topic.level}</span>
          </div>
        </div>

        <!-- Rule Summary Card -->
        <div class="card" style="border-left:4px solid var(--sprout);padding:18px">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:10px">${esc(topic.title)}</h2>
          <div class="rule-summary-box">
            <b style="color:var(--sprout);display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:13.5px">
              💡 Grammar Rule &amp; Tip:
            </b>
            ${esc(topic.ruleSummary)}
          </div>
        </div>

        <!-- Interactive Question Cards Form -->
        <form id="grammar-form" class="col gap-md">
          ${topic.questions.map((q, qIdx) => {
            const letters = ['A', 'B', 'C', 'D'];
            return `
              <div class="card col gap-sm" style="padding:16px 18px">
                <div class="row gap-xs" style="align-items:flex-start">
                  <span class="pill sprout" style="font-size:11px;padding:2px 7px;margin-right:6px">Q${qIdx + 1}</span>
                  <div style="font-weight:700;font-size:15px;line-height:1.45;flex:1">${esc(q.question)}</div>
                </div>
                <div class="col gap-xs" style="margin-top:10px">
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

          <button class="btn btn-primary" type="submit" style="width:100%;max-width:320px;padding:13px;font-size:15px;margin:10px auto 0 auto" id="submit-grammar-btn">
            Submit Answers ${ICONS.arrowRight}
          </button>
        </form>

        <div id="grammar-results"></div>
      </div>
    `;

    $('#btn-back-grammar').onclick = () => {
      grid.style.display = 'grid';
      activeArea.innerHTML = '';
    };

    // Option selection highlighting
    topic.questions.forEach((q, qIdx) => {
      const inputs = mount.querySelectorAll(`input[name="q_${qIdx}"]`);
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

    $('#grammar-form').onsubmit = async (e) => {
      e.preventDefault();
      const unanswered = selectedAnswers.findIndex(a => a === -1);
      if (unanswered !== -1) {
        toast(`Please answer question ${unanswered + 1} before submitting`, 'amber');
        return;
      }

      const submitBtn = $('#submit-grammar-btn');
      submitBtn.disabled = true;

      try {
        const res = await Api.submitGrammar(topic._id, selectedAnswers);
        if (res.xpEarned > 0) {
          toast(`+${res.xpEarned} XP Earned! Great job!`, 'sprout');
          addStudentXP(res.xpEarned);
        }

        const resultsDiv = $('#grammar-results');
        resultsDiv.innerHTML = `
          <div class="col gap-md" style="margin-top:18px">
            <div class="result-hero-card col gap-xs" style="border-top:4px solid ${scoreColor(res.score)}">
              <div style="font-size:11.5px;color:var(--cream-faint);text-transform:uppercase;letter-spacing:1px;font-weight:800">Practice Complete</div>
              <h2 style="font-size:32px;font-weight:800;color:${scoreColor(res.score)};margin:4px 0">${res.score}%</h2>
              <div style="font-size:14px;color:var(--cream);font-weight:600">
                ${res.correctCount} of ${res.totalQuestions} questions correct
              </div>
              <div style="font-size:13px;color:var(--cream-dim);margin-top:2px">${res.message}</div>
              ${res.xpEarned > 0 ? `
                <div style="margin-top:8px">
                  <span class="pill sprout" style="font-size:12px;padding:5px 12px">⚡ +${res.xpEarned} XP Earned</span>
                </div>
              ` : ''}
            </div>

            <div class="col gap-sm">
              <div class="section-title" style="font-size:16px;margin:8px 0 4px">Detailed Feedback &amp; Explanations</div>
              ${res.evaluatedAnswers.map((ans, idx) => {
                const q = topic.questions[idx];
                const isCorrect = ans.isCorrect;
                return `
                  <div class="card" style="padding:14px 16px;border-left:4px solid ${isCorrect ? 'var(--emerald)' : 'var(--coral)'};background:rgba(255,255,255,0.02)">
                    <div class="row gap-xs" style="margin-bottom:8px;flex-wrap:wrap">
                      <span class="pill ${isCorrect ? 'emerald' : 'coral'}" style="font-size:11px">
                        ${isCorrect ? '✔ Correct' : '✖ Incorrect'}
                      </span>
                      <span style="font-size:13.5px;font-weight:700">Q${idx + 1}: ${esc(q.question)}</span>
                    </div>
                    <div style="font-size:13.5px;line-height:1.5;margin-bottom:6px">
                      Your answer: <b style="color:${isCorrect ? 'var(--emerald)' : 'var(--coral)'}">${esc(q.options[ans.selectedOption])}</b>
                      ${!isCorrect ? `<br><span style="color:var(--cream-dim)">Correct answer: <b style="color:var(--emerald)">${esc(q.options[ans.correctAnswer])}</b></span>` : ''}
                    </div>
                    <div style="font-size:12.5px;color:var(--cream-dim);line-height:1.55;background:rgba(0,0,0,0.25);padding:10px 12px;border-radius:10px;margin-top:8px">
                      <strong style="color:var(--cyan)">💡 Explanation:</strong> ${esc(ans.explanation)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="row gap-sm" style="margin-top:12px;flex-wrap:wrap">
              <button class="btn btn-primary" id="btn-retry-grammar" style="flex:1;min-width:140px">
                Try Again ${ICONS.refresh}
              </button>
              <button class="btn btn-ghost" id="btn-finish-grammar" style="flex:1;min-width:140px">
                Back to Topics
              </button>
            </div>
          </div>
        `;

        resultsDiv.scrollIntoView({ behavior: 'smooth' });

        $('#btn-retry-grammar').onclick = () => {
          openGrammarQuiz(topicId, mount, topics);
        };
        $('#btn-finish-grammar').onclick = async () => {
          const freshTopics = await Api.grammarTopics();
          renderGrammarView(mount, freshTopics);
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

/* ---------------------------- DAILY SITUATIONAL PHRASES ---------------------------- */
let currentSituationalCategory = 'All';

VIEW_RENDERERS['situational'] = async (mount) => {
  const scenarios = await Api.situationalScenarios();
  renderSituationalView(mount, scenarios);
};

function renderSituationalView(mount, scenarios) {
  const categories = ['All', 'Campus Life', 'Professional & Jobs', 'Social & Daily'];

  const filtered = currentSituationalCategory === 'All'
    ? scenarios
    : scenarios.filter(s => s.category === currentSituationalCategory);

  mount.innerHTML = `
    <div class="col gap-md">
      <div class="card row gap-sm overflow-x" style="padding:10px 14px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch">
        ${categories.map(cat => `
          <button class="pill ${currentSituationalCategory === cat ? 'sprout' : ''}" style="cursor:pointer;flex-shrink:0;white-space:nowrap;border:1px solid ${currentSituationalCategory === cat ? 'var(--sprout)' : 'var(--line)'}" data-scat="${cat}">
            ${cat}
          </button>
        `).join('')}
      </div>

      <div class="grid grid-2" id="situational-grid">
        ${filtered.length ? filtered.map(s => `
          <div class="card col gap-sm" style="position:relative;display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div class="row gap-sm" style="margin-bottom:8px">
                <span class="pill ${s.category === 'Campus Life' ? 'sprout' : s.category === 'Professional & Jobs' ? 'amber' : 'voice'}">${esc(s.category)}</span>
                <span class="pill voice" style="font-size:11px">${s.level}</span>
                <div class="spacer"></div>
                ${s.completed ? `<span class="pill sprout" style="color:var(--sprout)">${ICONS.check} ${s.bestScore}% Best</span>` : '<span class="pill" style="color:var(--cream-faint)">New</span>'}
              </div>
              <h3 style="font-size:17px;font-weight:700;margin-bottom:6px">${esc(s.title)}</h3>
              <p style="font-size:13px;color:var(--cream-dim);line-height:1.5;margin-bottom:12px">${esc(s.situationContext)}</p>
            </div>
            <div class="row gap-sm" style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line)">
              <span style="font-size:12px;color:var(--cream-faint)">${s.phrases.length} Key Phrases &middot; ${s.interactivePrompts.length} Prompts</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm" data-start-situational="${s._id}">
                ${s.completed ? 'Roleplay Again' : 'Start Scenario'} ${ICONS.arrowRight}
              </button>
            </div>
          </div>
        `).join('') : `<div class="card empty-state">No scenarios found in this category.</div>`}
      </div>

      <div id="situational-active-area"></div>
    </div>
  `;

  mount.querySelectorAll('[data-scat]').forEach(btn => {
    btn.onclick = () => {
      currentSituationalCategory = btn.dataset.scat;
      renderSituationalView(mount, scenarios);
    };
  });

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
          <div style="font-size:13.5px;color:var(--cream-dim);line-height:1.6;margin-top:6px;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px">
            <b style="color:var(--amber);display:block;margin-bottom:4px">&#x1F4CD; Scenario Situation:</b>
            ${esc(scenario.situationContext)}
          </div>
        </div>

        <div class="card col gap-sm">
          <div class="section-title">${ICONS.message} Key Phrases &amp; Audio Pronunciation</div>
          <div class="col gap-md" style="margin-top:10px">
            ${scenario.phrases.map((p, pIdx) => `
              <div class="card" style="padding:14px 16px;background:rgba(255,255,255,0.02);border:1px solid var(--line)">
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
              lbl.style.background = otherInp.checked ? 'rgba(244,183,64,0.08)' : 'transparent';
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
                  <div class="card" style="padding:12px 16px;background:rgba(255,255,255,0.02);border:1px solid ${ans.isCorrect ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)'}">
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
      <div class="card col gap-md" style="padding:32px;border:1px solid var(--amber);background:rgba(244,183,64,0.04);position:relative">
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
          <div style="width:100%;height:10px;background:rgba(255,255,255,0.08);border-radius:5px;overflow:hidden">
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
              <button class="btn btn-primary btn-sm" data-start-test="${t._id}">${t.attempted ? 'Retake' : 'Start Test'} ${ICONS.arrowRight}</button>
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
            <div class="card" style="padding:12px 16px;background:rgba(255,255,255,0.02);border:1px solid ${ans.isCorrect ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)'}">
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



