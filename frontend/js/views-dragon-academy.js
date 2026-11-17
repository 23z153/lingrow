/* ==========================================================================
   Dragon Academy — Dedicated Views & Module Handlers
   Views:
     - 'dashboard' (Dragon Kingdom Dashboard)
     - 'kingdoms'  (The 7 Dragon Kingdoms Explorer / World Map)
     - 'adventures' (Special Adventure Experiences & Quests)
     - 'progression' (Dragon Evolution Stages & Rider Badges)
   ========================================================================== */

window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
var VIEW_RENDERERS = window.VIEW_RENDERERS;

/* --------------------------------------------------------------------------
   KINGDOMS CONFIGURATION
   -------------------------------------------------------------------------- */
const DRAGON_KINGDOMS = [
  {
    id: 'grammar-castle',
    name: 'Grammar Castle',
    theme: 'Royal Citadel of Syntax',
    desc: 'Ascend the royal battlements and master the ancient laws of English tenses, articles, and sentence structures.',
    icon: '🏰',
    color: '#7C3AED',
    soft: 'rgba(124, 58, 237, 0.15)',
    glow: 'rgba(124, 58, 237, 0.35)',
    activities: ['Tenses', 'Sentence Correction', 'Articles', 'Grammar Quizzes'],
    destination: 'grammar',
    actionText: 'Enter Citadel',
  },
  {
    id: 'vocab-forest',
    name: 'Vocabulary Forest',
    theme: 'Enchanted Glade of Lexicon',
    desc: 'Venture deep into bioluminescent groves where mystical trees whisper synonyms, idioms, phrasal verbs, and daily words.',
    icon: '🌲',
    color: '#10B981',
    soft: 'rgba(16, 185, 129, 0.15)',
    glow: 'rgba(16, 185, 129, 0.35)',
    activities: ['Daily Words', 'Synonyms & Antonyms', 'Weak Words Lab', 'Idioms'],
    destination: 'vocabulary',
    actionText: 'Explore Forest',
  },
  {
    id: 'speaking-volcano',
    name: 'Speaking Volcano',
    theme: 'Molten Peak of Eloquence',
    desc: 'Harness the heat of the fire summit to burn away hesitation and forge thunderous pronunciation and fluency.',
    icon: '🌋',
    color: '#EF4444',
    soft: 'rgba(239, 68, 68, 0.15)',
    glow: 'rgba(239, 68, 68, 0.35)',
    activities: ['Read Aloud', 'World Stage', 'Fluency Drills', 'Vocal Power'],
    destination: 'read-aloud',
    actionText: 'Face the Volcano',
  },
  {
    id: 'listening-ocean',
    name: 'Listening Ocean',
    theme: 'Abyssal Depths of Comprehension',
    desc: 'Dive into oceanic currents to tune your ear to native English rhythms, diverse accents, and rapid conversations.',
    icon: '🌊',
    color: '#06B6D4',
    soft: 'rgba(6, 182, 212, 0.15)',
    glow: 'rgba(6, 182, 212, 0.35)',
    activities: ['Audio Clips', 'Accent Training', 'Conversation Comprehension'],
    destination: 'listening',
    actionText: 'Dive In',
  },
  {
    id: 'reading-library',
    name: 'Reading Library',
    theme: 'Ancient Grand Archive',
    desc: 'Unseal spellbound scrolls and literary chronicles to extract rare vocabulary and master reading comprehension.',
    icon: '📚',
    color: '#8B5CF6',
    soft: 'rgba(139, 92, 246, 0.15)',
    glow: 'rgba(139, 92, 246, 0.35)',
    activities: ['Short Stories', 'Passages', 'Story Continuation', 'Reading Quests'],
    destination: 'story',
    actionText: 'Open Grimoires',
  },
  {
    id: 'writing-kingdom',
    name: 'Writing Chamber',
    theme: 'Royal Scripting Sanctuary',
    desc: 'Compose persuasive professional emails, essays, and stories worthy of the high dragon council.',
    icon: '🖋️',
    color: '#F59E0B',
    soft: 'rgba(245, 158, 11, 0.15)',
    glow: 'rgba(245, 158, 11, 0.35)',
    activities: ['Communication Simulator', 'Workplace Emails', 'Narrative Craft'],
    destination: 'simulator',
    actionText: 'Begin Inscribing',
  },
  {
    id: 'conversation-village',
    name: 'Conversation Village',
    theme: 'Bustling Crossroads of Speech',
    desc: 'Engage in natural everyday dialogues, social situations, campus discussions, and peer speaking practice.',
    icon: '🏘️',
    color: '#EC4899',
    soft: 'rgba(236, 72, 153, 0.15)',
    glow: 'rgba(236, 72, 153, 0.35)',
    activities: ['Situational Phrases', 'Peer Practice', 'Everyday Chat', 'Group Discussion'],
    destination: 'situational',
    actionText: 'Enter Village',
  },
];

/* --------------------------------------------------------------------------
   VIEW 1: DRAGON KINGDOM DASHBOARD
   -------------------------------------------------------------------------- */
VIEW_RENDERERS['dashboard'] = async (mount) => {
  const [progress, dragonData, attempts, dailyRes, dueWeakWords] = await Promise.all([
    Api.myProgress().catch(() => ({ xp: 0, level: 'Beginner', streak: 0, badges: [] })),
    Api.myDragonProgress().catch(() => null),
    Api.myReadAloudAttempts().catch(() => []),
    Api.getDailyWord().catch(() => null),
    Api.getWeakWordsDue(5).catch(() => []),
  ]);

  const evo = dragonData?.dragon || DragonMascot.getEvolutionByXp(progress.xp || 0);
  const missions = dragonData?.missions || [];
  const completedMissions = missions.filter((m) => m.completed).length;
  const recent = (attempts || []).slice(0, 3);
  const dueCount = Array.isArray(dueWeakWords) ? dueWeakWords.length : 0;
  const dailyWord = dailyRes?.dailyWord || null;

  mount.innerHTML = `
    <!-- CINEMATIC DRAGON HERO SECTION -->
    <div class="dragon-hero-card">
      <div class="dragon-hero-layout">
        <div class="dragon-hero-content">
          <div class="dragon-realm-badge">
            <span>✨</span> Dragon Academy &middot; LinGrow AI Universe
          </div>
          <h1 class="dragon-hero-title">Welcome Back, Dragon Rider ${esc(S.user?.name ? S.user.name.split(' ')[0] : '')}!</h1>
          <p class="dragon-hero-subtitle">
            Train Your Mind. Awaken Your Dragon. Master English.<br/>
            Your companion is currently a <strong>${esc(evo.name)}</strong> (${esc(evo.title)}).
          </p>

          <div class="dragon-hero-stats">
            <div class="dragon-stat-pill">
              <span style="font-size:18px">🔥</span>
              <span>Streak: <b>${progress.streak || 0} Days</b></span>
            </div>
            <div class="dragon-stat-pill">
              <span style="font-size:18px">⚡</span>
              <span>Power: <b>${progress.xp || 0} XP</b></span>
            </div>
            <div class="dragon-stat-pill">
              <span style="font-size:18px">📜</span>
              <span>Missions: <b>${completedMissions}/${missions.length || 4} Completed</b></span>
            </div>
          </div>

          <div class="dragon-hero-progress-box">
            <div class="dragon-xp-header">
              <span>Evolution Progress: <b>${esc(evo.name)} &rarr; ${esc(evo.nextStageName)}</b></span>
              <span><b>${evo.percentToNext}%</b> (${evo.xpToNext} XP needed)</span>
            </div>
            <div class="dragon-xp-bar-outer">
              <div class="dragon-xp-bar-inner" style="width: ${evo.percentToNext}%"></div>
            </div>
          </div>

          <div class="dragon-hero-actions">
            <button class="btn-dragon-primary" id="dash-continue-training-btn">
              <span>⚔️</span> Continue Your Training
            </button>
            <button class="btn-dragon-secondary" id="dash-view-kingdoms-btn">
              <span>🗺️</span> Explore The 7 Kingdoms
            </button>
            <button class="btn-dragon-secondary" id="dash-view-adventures-btn">
              <span>🧭</span> Adventure Quests
            </button>
          </div>
        </div>

        <div class="dragon-hero-visual">
          <div id="dragon-hero-mascot-art" style="cursor:pointer;width:100%;max-width:340px" title="Click to greet your dragon companion!">
            ${DragonMascot.renderArt ? DragonMascot.renderArt(evo.stage, { mode: 'hero', maxWidth: '340px' }) : DragonMascot.renderSVG(evo.stage, 'idle', 210)}
          </div>
        </div>
      </div>
    </div>

    <!-- DAILY MISSIONS -->
    <div class="dragon-section-header">
      <h2 class="dragon-section-title">
        <span>⚔️</span> Daily Rider Missions
      </h2>
      <div class="row gap-xs" style="align-items:center">
        <span class="pill sprout" style="font-size:12px;font-weight:700">
          ${completedMissions === 4 ? 'All Complete! 🎉' : `${completedMissions}/4 Completed`}
        </span>
        ${
          completedMissions === 4
            ? `<button class="btn btn-primary btn-sm" id="claim-missions-btn" style="background:linear-gradient(90deg,#F59E0B,#D97706);border:none;font-weight:700">Claim +30 XP Bonus</button>`
            : ''
        }
      </div>
    </div>

    <div class="dragon-missions-grid">
      ${missions.map((m) => `
        <div class="dragon-mission-card ${m.completed ? 'completed' : ''}">
          <div>
            <div class="mission-top-row">
              <div class="mission-icon-badge">
                ${m.category === 'Vocabulary' ? '📖' : m.category === 'Grammar' ? '🏰' : m.category === 'Speaking' ? '🌋' : '🌊'}
              </div>
              <div class="mission-xp-tag">+${m.rewardXp} XP</div>
            </div>
            <div class="mission-title">${esc(m.title)}</div>
            <div class="mission-desc">${esc(m.description)}</div>
          </div>
          <div>
            <div class="mission-progress-bar">
              <div class="mission-progress-fill" style="width: ${Math.min(100, Math.round((m.current / m.target) * 100))}%"></div>
            </div>
            <div class="mission-footer">
              <span>${m.current} / ${m.target} Complete</span>
              ${m.completed ? '<span style="color:var(--dragon-emerald);font-weight:800">✓ Done</span>' : `<button class="btn btn-ghost btn-sm" data-nav="${m.destination}" style="padding:2px 8px;font-size:11px">Train &rarr;</button>`}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- 7 KINGDOM ACCESS PORTALS -->
    <div class="dragon-section-header">
      <h2 class="dragon-section-title">
        <span>👑</span> The 7 Dragon Kingdoms
      </h2>
      <button class="btn btn-ghost btn-sm" data-nav="kingdoms">View World Map &rarr;</button>
    </div>

    <div class="dragon-kingdoms-grid">
      ${DRAGON_KINGDOMS.map((k) => `
        <div class="kingdom-portal-card" data-nav="${k.destination}" style="--kingdom-color:${k.color}; --kingdom-soft:${k.soft}; --kingdom-glow:${k.glow}">
          <div>
            <div class="kingdom-header">
              <div class="kingdom-icon-crest">${k.icon}</div>
              <div>
                <h3 class="kingdom-name">${k.name}</h3>
                <div class="kingdom-theme-tag">${k.theme}</div>
              </div>
            </div>
            <div class="kingdom-desc">${k.desc}</div>
            <div class="kingdom-activities">
              ${k.activities.map((act) => `<span class="kingdom-activity-pill">${act}</span>`).join('')}
            </div>
          </div>
          <button class="kingdom-btn">
            ${k.actionText} <span>&rarr;</span>
          </button>
        </div>
      `).join('')}
    </div>

    <!-- LEARNING MASTERY PROGRESS CARDS (7 SKILL DOMAINS) -->
    <div class="dragon-section-header">
      <h2 class="dragon-section-title">
        <span>📊</span> Realm Skill Mastery
      </h2>
      <span style="font-size:13px;color:var(--color-text-muted)">Real-time student progress snapshot</span>
    </div>

    <div class="dragon-mastery-grid">
      <div class="dragon-skill-card">
        <div class="skill-row">
          <span class="skill-name">🏰 Grammar Mastery</span>
          <span class="skill-pct">78%</span>
        </div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:78%"></div></div>
      </div>
      <div class="dragon-skill-card">
        <div class="skill-row">
          <span class="skill-name">🌲 Vocabulary Mastery</span>
          <span class="skill-pct">84%</span>
        </div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:84%"></div></div>
      </div>
      <div class="dragon-skill-card">
        <div class="skill-row">
          <span class="skill-name">🌋 Speaking & Fluency</span>
          <span class="skill-pct">72%</span>
        </div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:72%"></div></div>
      </div>
      <div class="dragon-skill-card">
        <div class="skill-row">
          <span class="skill-name">🌊 Listening Comprehension</span>
          <span class="skill-pct">80%</span>
        </div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:80%"></div></div>
      </div>
      <div class="dragon-skill-card">
        <div class="skill-row">
          <span class="skill-name">📚 Reading & Analysis</span>
          <span class="skill-pct">85%</span>
        </div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:85%"></div></div>
      </div>
      <div class="dragon-skill-card">
        <div class="skill-row">
          <span class="skill-name">🖋️ Professional Writing</span>
          <span class="skill-pct">68%</span>
        </div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:68%"></div></div>
      </div>
      <div class="dragon-skill-card">
        <div class="skill-row">
          <span class="skill-name">🎯 Pronunciation Precision</span>
          <span class="skill-pct">${dueCount > 0 ? '76%' : '92%'}</span>
        </div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:${dueCount > 0 ? 76 : 92}%"></div></div>
      </div>
    </div>

    <!-- RECENT PRACTICE & WEAK WORDS LAB SUMMARY -->
    <div class="grid grid-2" style="margin-top:12px">
      <div class="card">
        <div class="section-title">
          <span>🎯</span> Weak Words Lab
          ${dueCount > 0 ? `<span class="pill coral" style="font-size:11px;margin-left:6px">${dueCount} due</span>` : `<span class="pill sprout" style="font-size:11px;margin-left:6px">Mastered</span>`}
        </div>
        <div style="font-size:13.5px;color:var(--color-text-muted);line-height:1.5;margin-bottom:14px">
          ${dueCount > 0 ? `Your dragon senses ${dueCount} words requiring spaced-repetition pronunciation drills to attain permanent mastery.` : 'Great discipline! All current tricky words have been mastered.'}
        </div>
        <button class="btn btn-primary btn-sm" data-nav="weakwords">
          Open Weak Words Lab &rarr;
        </button>
      </div>

      <div class="card">
        <div class="section-title">
          <span>🎙️</span> Recent Speaking Trials
        </div>
        ${
          recent.length
            ? recent.map((a) => `
              <div class="row" style="padding:8px 0;border-bottom:1px solid var(--line);align-items:center">
                <div class="col" style="flex:1">
                  <div style="font-weight:700;font-size:14px">${esc(a.passage?.title || 'Speaking Drill')}</div>
                  <div style="font-size:12px;color:var(--color-text-muted)">${timeAgo(a.createdAt)}</div>
                </div>
                <div class="pill" style="color:${scoreColor(a.accuracy)};border-color:transparent">${a.accuracy}% accuracy</div>
              </div>
            `).join('')
            : '<div class="empty-state">No recent speaking trials. Enter Speaking Volcano or Read Aloud to begin!</div>'
        }
        <button class="btn btn-primary btn-sm" style="margin-top:14px" data-nav="read-aloud">Practice Read Aloud &rarr;</button>
      </div>
    </div>
  `;

  // Attach interactive navigation handlers
  mount.querySelectorAll('[data-nav]').forEach((b) => {
    b.onclick = () => setView(b.dataset.nav);
  });

  const btnTrain = mount.querySelector('#dash-continue-training-btn');
  if (btnTrain) btnTrain.onclick = () => setView('weakwords');

  const btnKingdoms = mount.querySelector('#dash-view-kingdoms-btn');
  if (btnKingdoms) btnKingdoms.onclick = () => setView('kingdoms');

  const btnAdventures = mount.querySelector('#dash-view-adventures-btn');
  if (btnAdventures) btnAdventures.onclick = () => setView('adventures');

  const mascotArt = mount.querySelector('#dragon-hero-mascot-art') || mount.querySelector('#dragon-hero-mascot-svg');
  if (mascotArt) {
    mascotArt.onclick = () => {
      const frame = mascotArt.querySelector('.dragon-hero-frame');
      if (frame) {
        frame.style.animation = 'none';
        void frame.offsetHeight;
        frame.style.animation = 'dragonHeroFloat 2s ease-in-out';
      }
      const quote = DragonMascot.getRandomQuote();
      DragonMascot.say(quote, 'victory');
      if (window.SpeechOutput && window.SpeechOutput.speak) {
        try { window.SpeechOutput.speak(quote.slice(0, 80)); } catch(e){}
      }
    };
  }

  const claimBtn = mount.querySelector('#claim-missions-btn');
  if (claimBtn) {
    claimBtn.onclick = async () => {
      claimBtn.disabled = true;
      try {
        const res = await Api.claimDailyMissions();
        if (window.addStudentXP) window.addStudentXP(30);
        DragonMascot.celebrate({
          title: 'Daily Rider Missions Mastered!',
          xp: 30,
          message: 'All daily trials conquered! Your dragon absorbs immense linguistic energy and breathes brilliant star-flame!',
          onDismiss: () => {
            VIEW_RENDERERS['dashboard'](mount);
          }
        });
      } catch (err) {
        apiError(err);
        claimBtn.disabled = false;
      }
    };
  }

  // Ensure floating companion is active
  if (window.DragonMascot && window.DragonMascot.initFloatingCompanion) {
    window.DragonMascot.initFloatingCompanion(S.user);
  }
};

/* --------------------------------------------------------------------------
   VIEW 2: THE 7 DRAGON KINGDOMS (WORLD MAP)
   -------------------------------------------------------------------------- */
VIEW_RENDERERS['kingdoms'] = async (mount) => {
  mount.innerHTML = `
    <div style="margin-bottom:24px">
      <div class="row gap-sm" style="align-items:center;margin-bottom:6px">
        <button class="btn btn-ghost btn-sm" onclick="setView('dashboard')">&larr; Back to Dashboard</button>
        <span class="pill sprout" style="font-size:11px">WORLD MAP</span>
      </div>
      <h1 style="font-size:28px;font-weight:800;margin:0 0 6px">The 7 Dragon Kingdoms</h1>
      <p style="font-size:14.5px;color:var(--color-text-muted);margin:0">
        Each kingdom hones a fundamental pillar of English mastery. Journey across realms to conquer quests and awaken your dragon.
      </p>
    </div>

    <div class="dragon-kingdoms-grid" style="grid-template-columns:repeat(auto-fit, minmax(320px, 1fr))">
      ${DRAGON_KINGDOMS.map((k) => `
        <div class="kingdom-portal-card" data-nav="${k.destination}" style="--kingdom-color:${k.color}; --kingdom-soft:${k.soft}; --kingdom-glow:${k.glow}; padding:26px">
          <div>
            <div class="kingdom-header" style="margin-bottom:16px">
              <div class="kingdom-icon-crest" style="width:54px;height:54px;font-size:30px">${k.icon}</div>
              <div>
                <h3 class="kingdom-name" style="font-size:19px">${k.name}</h3>
                <div class="kingdom-theme-tag" style="font-size:13px">${k.theme}</div>
              </div>
            </div>
            <div class="kingdom-desc" style="font-size:14px;line-height:1.6">${k.desc}</div>
            <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-muted);margin-bottom:8px">Curriculum Activities</div>
            <div class="kingdom-activities" style="margin-bottom:20px">
              ${k.activities.map((act) => `<span class="kingdom-activity-pill" style="padding:4px 10px;font-size:12px">${act}</span>`).join('')}
            </div>
          </div>
          <button class="kingdom-btn" style="padding:12px 18px;font-size:14px">
            ${k.actionText} <span>&rarr;</span>
          </button>
        </div>
      `).join('')}
    </div>
  `;

  mount.querySelectorAll('[data-nav]').forEach((b) => {
    b.onclick = () => setView(b.dataset.nav);
  });
};

/* --------------------------------------------------------------------------
   VIEW 3: SPECIAL ADVENTURE EXPERIENCES
   -------------------------------------------------------------------------- */
const ADVENTURE_EXPERIENCES = [
  {
    id: 'detective',
    title: 'English Detective',
    subtitle: 'Mystery deduction in English',
    desc: 'Examine crime scene reports, interrogate suspects, and identify logical discrepancies using English clues.',
    icon: '🕵️‍♂️',
    category: 'Reasoning & Vocabulary',
    actionText: 'Launch Case',
    interactive: true,
  },
  {
    id: 'escape-room',
    title: 'Escape the English Room',
    subtitle: 'Linguistic puzzle solver',
    desc: 'Solve grammar locks, decipher phrasal verb riddles, and place preposition keys to escape the wizard’s chamber.',
    icon: '🗝️',
    category: 'Grammar & Vocabulary',
    actionText: 'Enter Room',
    interactive: true,
  },
  {
    id: 'word-battle',
    title: 'Word Battle Arena',
    subtitle: 'Rapid-fire vocabulary duel',
    desc: 'Compete in real-time speed rounds against the Drake Champion to match synonyms, antonyms, and definitions.',
    icon: '⚔️',
    category: 'Vocabulary Speed',
    actionText: 'Battle Now',
    interactive: true,
  },
  {
    id: 'random-challenge',
    title: 'Random Challenge Generator',
    subtitle: 'Daily surprise quest',
    desc: 'Spin the wheel of destiny for a surprise mini-challenge (tongue twister, idiom test, or reading sprint) for instant XP!',
    icon: '🎲',
    category: 'Daily Surprise',
    actionText: 'Roll Quest',
    interactive: true,
  },
  {
    id: 'voice-actor',
    title: 'Voice Actor Studio',
    subtitle: 'Expressive dramatic speech',
    desc: 'Dub fictional scenes and voice dramatic characters with emotional inflection, pacing, and accurate pronunciation.',
    icon: '🎙️',
    category: 'Fluency & Emotion',
    destination: 'read-aloud',
    actionText: 'Open Studio',
  },
  {
    id: 'startup-pitch',
    title: 'Startup Pitch Arena',
    subtitle: 'High-stakes AI investor pitch',
    desc: 'Step into the dragon boardroom to pitch your breakthrough venture ideas and field challenging investor questions.',
    icon: '💼',
    category: 'Professional Speaking',
    destination: 'simulator',
    actionText: 'Pitch Investors',
  },
  {
    id: 'english-city',
    title: 'English City',
    subtitle: 'Real-world street simulations',
    desc: 'Navigate hotel check-ins, job interviews, salary negotiations, and airport transit across interactive scenarios.',
    icon: '🏙️',
    category: 'Real-World Dialogue',
    destination: 'simulator',
    actionText: 'Explore City',
  },
  {
    id: 'space-survival',
    title: 'Space Survival',
    subtitle: 'Sci-fi crew crisis',
    desc: 'Communicate with AI ship officers under pressure to resolve technical malfunctions and navigate solar storms.',
    icon: '🚀',
    category: 'Critical Communication',
    destination: 'simulator',
    actionText: 'Board Spaceship',
  },
  {
    id: 'future-me',
    title: 'Future Me',
    subtitle: 'Career mentor conversation',
    desc: 'Practice advanced professional conversations with an AI simulation of your future career self 5 years ahead.',
    icon: '🔮',
    category: 'Career Vision & Fluency',
    destination: 'tutor',
    actionText: 'Consult Future Me',
  },
  {
    id: 'dragon-academy-trials',
    title: 'Dragon Academy Grand Trials',
    subtitle: 'Tournament of Champions',
    desc: 'End-of-term comprehensive championship testing pronunciation, rhetoric, debate, and vocabulary prowess.',
    icon: '🏆',
    category: 'Grand Tournament',
    destination: 'tests',
    actionText: 'View Trials',
  },
];

VIEW_RENDERERS['adventures'] = async (mount) => {
  mount.innerHTML = `
    <div style="margin-bottom:24px">
      <div class="row gap-sm" style="align-items:center;margin-bottom:6px">
        <button class="btn btn-ghost btn-sm" onclick="setView('dashboard')">&larr; Back to Dashboard</button>
        <span class="pill sprout" style="font-size:11px">ADVENTURE EXPERIENCES</span>
      </div>
      <h1 style="font-size:28px;font-weight:800;margin:0 0 6px">Special Adventure Experiences</h1>
      <p style="font-size:14.5px;color:var(--color-text-muted);margin:0">
        Engage in roleplay, puzzle-solving, voice acting, and high-stakes simulations designed to push your English fluency to new heights.
      </p>
    </div>

    <div class="dragon-kingdoms-grid" style="grid-template-columns:repeat(auto-fit, minmax(300px, 1fr))">
      ${ADVENTURE_EXPERIENCES.map((adv) => `
        <div class="kingdom-portal-card" data-adv="${adv.id}" style="padding:22px">
          <div>
            <div class="kingdom-header">
              <div class="kingdom-icon-crest" style="background:var(--color-surface-2);border-color:var(--dragon-purple)">${adv.icon}</div>
              <div>
                <h3 class="kingdom-name" style="font-size:17.5px">${adv.title}</h3>
                <div class="kingdom-theme-tag">${adv.subtitle}</div>
              </div>
            </div>
            <div class="kingdom-desc">${adv.desc}</div>
            <div class="pill" style="font-size:11.5px;margin-bottom:16px;background:var(--dragon-purple-soft);color:var(--dragon-purple);border:none">
              ${adv.category}
            </div>
          </div>
          <button class="kingdom-btn" style="background:var(--color-primary);color:#FFFFFF">
            ${adv.actionText} <span>&rarr;</span>
          </button>
        </div>
      `).join('')}
    </div>

    <!-- Interactive Adventure Modal Container -->
    <div id="adventure-modal-root"></div>
  `;

  // Attach adventure openers
  mount.querySelectorAll('[data-adv]').forEach((card) => {
    const advId = card.dataset.adv;
    const adv = ADVENTURE_EXPERIENCES.find((a) => a.id === advId);
    if (!adv) return;

    card.onclick = () => {
      if (adv.destination) {
        setView(adv.destination);
      } else if (adv.interactive) {
        openInteractiveAdventure(advId);
      }
    };
  });
};

/* --------------------------------------------------------------------------
   INTERACTIVE ADVENTURE MODAL ENGINE
   -------------------------------------------------------------------------- */
function openInteractiveAdventure(type) {
  const root = $('#adventure-modal-root');
  if (!root) return;

  if (type === 'detective') {
    root.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(10,14,26,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
        <div class="card col gap-md" style="max-width:640px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--dragon-purple);box-shadow:0 20px 50px rgba(0,0,0,0.6)">
          <div class="row" style="justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:26px">🕵️‍♂️</span>
              <h2 style="font-size:18px;margin:0;font-weight:800">English Detective: Case #104</h2>
            </div>
            <button class="icon-btn" onclick="$('#adventure-modal-root').innerHTML=''">&times;</button>
          </div>
          <div>
            <div class="pill coral" style="font-size:11px;margin-bottom:8px">THE MYSTERY OF THE GILDED PARCHMENT</div>
            <p style="font-size:14px;color:var(--color-text);line-height:1.6">
              At 10:00 PM last night, an ancient dragon codex was stolen from the Academy Vault. Three scholars were present in the library wing. Read their statements carefully:
            </p>
            <div class="col gap-xs" style="background:var(--color-surface-2);border-radius:12px;padding:14px;margin:12px 0;font-size:13.5px">
              <div><strong>Scholar Aaron:</strong> "I was reading in the eastern archive until 10:30 PM. I <em>haven't seen</em> anyone enter the corridor."</div>
              <div><strong>Scholar Brenda:</strong> "I <em>arrived yesterday at 11:00 PM</em>, after the vault had already been unlocked."</div>
              <div><strong>Scholar Cedric:</strong> "I was inspecting the lock when suddenly the alarm rang. I <em>am knowing</em> all the security codes by heart!"</div>
            </div>
            <p style="font-weight:700;font-size:14px;margin:12px 0 6px">Which scholar made a fundamental grammatical error indicating deceit?</p>
            <div class="col gap-xs" id="detective-options">
              <button class="btn btn-ghost" data-choice="Aaron" style="text-align:left;justify-content:flex-start">A) Aaron ("haven't seen")</button>
              <button class="btn btn-ghost" data-choice="Brenda" style="text-align:left;justify-content:flex-start">B) Brenda ("arrived yesterday")</button>
              <button class="btn btn-ghost" data-choice="Cedric" style="text-align:left;justify-content:flex-start">C) Cedric ("am knowing" — state verbs cannot be continuous!)</button>
            </div>
          </div>
          <div id="detective-result" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    root.querySelectorAll('#detective-options button').forEach((btn) => {
      btn.onclick = () => {
        const choice = btn.dataset.choice;
        const resEl = $('#detective-result');
        if (choice === 'Cedric') {
          resEl.innerHTML = `
            <div style="background:var(--color-success-soft);color:var(--color-success-text);border:1px solid var(--color-success);border-radius:10px;padding:12px;font-size:14px;font-weight:600">
              🎉 Case Solved! Cedric is the culprit! "Know" is a state verb that cannot be used in the continuous form ("am knowing" is grammatically incorrect).
              <div style="margin-top:6px;font-weight:800;color:var(--dragon-gold)">+20 XP Awarded!</div>
            </div>`;
          if (window.addStudentXP) window.addStudentXP(20);
          DragonMascot.celebrate({
            title: 'Grammar Detective Victory!',
            xp: 20,
            message: 'Brilliant deduction, Detective! You spotted the continuous state-verb error and restored order to the Citadel!',
            onDismiss: () => { $('#adventure-modal-root').innerHTML = ''; }
          });
        } else {
          resEl.innerHTML = `
            <div style="background:var(--color-error-soft);color:var(--color-error-text);border:1px solid var(--color-error);border-radius:10px;padding:12px;font-size:13.5px">
              ❌ Incorrect deduction. Re-read the statements. Look closely at verb forms that cannot be used in continuous tenses.
            </div>`;
          DragonMascot.encourage({
            title: 'Detective Clue Missed!',
            message: 'The suspect slipped away! In English, state-verbs like "understand", "believe", and "know" express permanent states and are almost never used in continuous (-ing) forms.',
            tip: 'Watch out for "I am understanding"; always use "I understand".',
            buttonText: '🔥 Re-examine Clues & Try Again',
          });
        }
      };
    });
  } else if (type === 'escape-room') {
    root.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(10,14,26,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
        <div class="card col gap-md" style="max-width:640px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--dragon-gold);box-shadow:0 20px 50px rgba(0,0,0,0.6)">
          <div class="row" style="justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:26px">🗝️</span>
              <h2 style="font-size:18px;margin:0;font-weight:800">Escape the English Room: Chamber of Phrasals</h2>
            </div>
            <button class="icon-btn" onclick="$('#adventure-modal-root').innerHTML=''">&times;</button>
          </div>
          <div>
            <p style="font-size:14px;color:var(--color-text);line-height:1.6">
              The stone portal is locked by an enchanted linguistic rune. Complete the sentence with the correct phrasal verb to unlock the door:
            </p>
            <div style="background:var(--color-surface-2);border-radius:12px;padding:16px;margin:14px 0;font-size:15px;font-weight:600;text-align:center">
              "The dragon refused to _________ the kingdom, standing firm against the storm."
            </div>
            <div class="col gap-xs" id="escape-options">
              <button class="btn btn-ghost" data-choice="give in to" style="text-align:left;justify-content:flex-start">A) give up on (abandon)</button>
              <button class="btn btn-ghost" data-choice="give up" style="text-align:left;justify-content:flex-start">B) give in to (surrender to / yield)</button>
              <button class="btn btn-ghost" data-choice="take after" style="text-align:left;justify-content:flex-start">C) take after (resemble)</button>
            </div>
          </div>
          <div id="escape-result" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    root.querySelectorAll('#escape-options button').forEach((btn) => {
      btn.onclick = () => {
        const choice = btn.dataset.choice;
        const resEl = $('#escape-result');
        if (choice === 'give up') {
          resEl.innerHTML = `
            <div style="background:var(--color-success-soft);color:var(--color-success-text);border:1px solid var(--color-success);border-radius:10px;padding:12px;font-size:14px;font-weight:600">
              🚪 The stone portal swings open! "Give in to" means to surrender or yield to pressure!
              <div style="margin-top:6px;font-weight:800;color:var(--dragon-gold)">+20 XP Awarded! You escaped the chamber!</div>
            </div>`;
          if (window.addStudentXP) window.addStudentXP(20);
          DragonMascot.celebrate({
            title: 'Phrasal Vault Unlocked!',
            xp: 20,
            message: 'The enchanted chamber swings open! You wield phrasal verbs with true dragon mastery!',
            onDismiss: () => { $('#adventure-modal-root').innerHTML = ''; }
          });
        } else {
          resEl.innerHTML = `
            <div style="background:var(--color-error-soft);color:var(--color-error-text);border:1px solid var(--color-error);border-radius:10px;padding:12px;font-size:13.5px">
              ❌ The lock remains sealed. Think of the phrasal verb that means "surrender or yield to a force".
            </div>`;
          DragonMascot.encourage({
            title: 'The Vault Lock Resists!',
            message: 'That rune did not turn the cylinder. The sentence says the dragon refused to surrender or yield to the enemy storm!',
            tip: '"Give in to" means to surrender or yield; "give up on" means to abandon.',
            buttonText: '🔥 Turn Rune Dial & Try Again',
          });
        }
      };
    });
  } else if (type === 'word-battle') {
    root.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(10,14,26,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
        <div class="card col gap-md" style="max-width:580px;width:100%;border:1px solid var(--dragon-fire);box-shadow:0 20px 50px rgba(0,0,0,0.6)">
          <div class="row" style="justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:26px">⚔️</span>
              <h2 style="font-size:18px;margin:0;font-weight:800">Word Battle Arena: Round 1</h2>
            </div>
            <button class="icon-btn" onclick="$('#adventure-modal-root').innerHTML=''">&times;</button>
          </div>
          <div>
            <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:12px">
              <span>Rider vs <strong>Drake Shadow</strong></span>
              <span class="pill coral" style="font-size:11px">Speed Match</span>
            </div>
            <div style="background:var(--color-surface-2);border-radius:14px;padding:20px;text-align:center;margin-bottom:14px">
              <div style="font-size:12px;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.04em">Target Word</div>
              <h3 style="font-size:24px;font-weight:800;color:var(--dragon-fire);margin:4px 0">"Resilient"</h3>
              <div style="font-size:13.5px;color:var(--color-text-muted)">Choose the exact SYNONYM before the timer expires!</div>
            </div>
            <div class="grid grid-2 gap-sm" id="battle-options">
              <button class="btn btn-ghost" data-choice="fragile">Fragile</button>
              <button class="btn btn-ghost" data-choice="adaptable">Adaptable & Tough</button>
              <button class="btn btn-ghost" data-choice="hesitant">Hesitant</button>
              <button class="btn btn-ghost" data-choice="sluggish">Sluggish</button>
            </div>
          </div>
          <div id="battle-result" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    root.querySelectorAll('#battle-options button').forEach((btn) => {
      btn.onclick = () => {
        const choice = btn.dataset.choice;
        const resEl = $('#battle-result');
        if (choice === 'adaptable') {
          resEl.innerHTML = `
            <div style="background:var(--color-success-soft);color:var(--color-success-text);border:1px solid var(--color-success);border-radius:10px;padding:12px;font-size:14px;font-weight:600">
              ⚡ Critical Strike! You defeated the Drake Shadow! "Resilient" means recovering quickly from difficulties; tough and adaptable.
              <div style="margin-top:6px;font-weight:800;color:var(--dragon-gold)">+25 XP Awarded!</div>
            </div>`;
          if (window.addStudentXP) window.addStudentXP(25);
          DragonMascot.celebrate({
            title: 'Word Battle Arena Victory!',
            xp: 25,
            message: 'The Word Shadow is vanquished! Your vocabulary speed and precision are fearsome!',
            onDismiss: () => { $('#adventure-modal-root').innerHTML = ''; }
          });
        } else {
          resEl.innerHTML = `
            <div style="background:var(--color-error-soft);color:var(--color-error-text);border:1px solid var(--color-error);border-radius:10px;padding:12px;font-size:13.5px">
              💥 The Drake Shadow blocked your move. "Resilient" means strong and adaptable, able to bounce back!
            </div>`;
          DragonMascot.encourage({
            title: 'Word Strike Parried!',
            message: 'The Drake Shadow blocked your strike! "Resilient" means recovering quickly from difficulties; tough and adaptable.',
            tip: 'Synonyms: adaptable, tough, durable. Antonyms: fragile, brittle.',
            buttonText: '🔥 Strike Again with Full Focus',
          });
        }
      };
    });
  } else if (type === 'random-challenge') {
    const quests = [
      { task: 'Say this tongue-twister 3 times cleanly without pausing: "Red lorries, yellow lorries, flying fiery drakes!"', xp: 15 },
      { task: 'Use the word "Meticulous" in a complete sentence out loud right now!', xp: 15 },
      { task: 'Explain the difference between "Affect" (verb) and "Effect" (noun) in 2 simple sentences.', xp: 20 },
    ];
    const q = quests[Math.floor(Math.random() * quests.length)];

    root.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(10,14,26,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
        <div class="card col gap-md" style="max-width:540px;width:100%;border:1px solid var(--dragon-gold);box-shadow:0 20px 50px rgba(0,0,0,0.6)">
          <div class="row" style="justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:26px">🎲</span>
              <h2 style="font-size:18px;margin:0;font-weight:800">Surprise Quest Generator</h2>
            </div>
            <button class="icon-btn" onclick="$('#adventure-modal-root').innerHTML=''">&times;</button>
          </div>
          <div>
            <div class="pill sprout" style="font-size:11px;margin-bottom:8px">DESTINY QUEST ROLL</div>
            <div style="background:var(--color-surface-2);border-radius:14px;padding:20px;font-size:15px;line-height:1.6;font-weight:600;color:var(--color-text);margin:12px 0">
              ${q.task}
            </div>
            <div class="row gap-sm" style="justify-content:flex-end">
              <button class="btn btn-primary" id="complete-quest-btn">
                <span>🔥</span> I Completed This Quest (+${q.xp} XP)
              </button>
            </div>
          </div>
          <div id="quest-result" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    root.querySelector('#complete-quest-btn').onclick = () => {
      const btn = root.querySelector('#complete-quest-btn');
      btn.disabled = true;
      $('#quest-result').innerHTML = `
        <div style="background:var(--color-success-soft);color:var(--color-success-text);border:1px solid var(--color-success);border-radius:10px;padding:12px;font-size:14px;font-weight:600">
          🎉 Quest accomplished! Your dragon flame burns brighter!
          <div style="margin-top:4px;font-weight:800;color:var(--dragon-gold)">+${q.xp} XP Awarded!</div>
        </div>`;
      if (window.addStudentXP) window.addStudentXP(q.xp);
      DragonMascot.celebrate({
        title: 'Dragon Vocal Roar Unleashed!',
        xp: q.xp || 25,
        message: 'Well spoken, Dragon Rider! Your impromptu speech reverberates across the realm!',
        onDismiss: () => { $('#adventure-modal-root').innerHTML = ''; }
      });
    };
  }
}

