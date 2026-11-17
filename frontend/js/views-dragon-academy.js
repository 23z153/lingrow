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
  const [progress, dragonData, attempts, dailyRes, dueWeakWords, challengeRes] = await Promise.all([
    Api.myProgress().catch(() => ({ xp: 0, level: 'Beginner', streak: 0, badges: [] })),
    Api.myDragonProgress().catch(() => null),
    Api.myReadAloudAttempts().catch(() => []),
    Api.getDailyWord().catch(() => null),
    Api.getWeakWordsDue(5).catch(() => []),
    Api.getChallenges().catch(() => null),
  ]);

  const evo = dragonData?.dragon || DragonMascot.getEvolutionByXp(progress.xp || 0);
  const missions = dragonData?.missions || [];
  const completedMissions = missions.filter((m) => m.completed).length;
  const recent = (attempts || []).slice(0, 3);
  const dueCount = Array.isArray(dueWeakWords) ? dueWeakWords.length : 0;
  const dailyWord = dailyRes?.dailyWord || null;
  const challengeLevels = challengeRes?.levels || null;
  const unlockedTiers = challengeRes?.unlockedLevels || ['Beginner'];
  const highestTier = unlockedTiers.includes('Advanced') ? 'Advanced' : unlockedTiers.includes('Intermediate') ? 'Intermediate' : 'Beginner';

  const recommendations = highestTier === 'Advanced' ? [
    { icon: '🎙️', tag: 'World Stage', title: 'TED Global Amphitheater', desc: 'Deliver an executive oratory with real-time rhetorical feedback.', nav: 'world-stage' },
    { icon: '⚔️', tag: 'Debate Arena', title: 'Collegiate Stance Defense', desc: 'Engage in a live rebuttal battle vs Drake on societal automation.', nav: 'debate' },
    { icon: '💼', tag: 'Simulator', title: 'Hostile Boardroom Defense', desc: 'Defend your startup architecture before aggressive venture capitalists.', nav: 'simulator' },
    { icon: '🏰', tag: 'Grammar Castle', title: 'Advanced Inversion Syntax', desc: 'Master negative adverbial fronting and subjunctive precision.', nav: 'grammar' },
  ] : highestTier === 'Intermediate' ? [
    { icon: '💼', tag: 'Simulator', title: 'The Agile Sprint Standup', desc: 'Communicate progress and blockers clearly without rambling.', nav: 'simulator' },
    { icon: '📖', tag: 'Grimoires', title: 'Spontaneous Storytelling', desc: 'Continue unscripted narratives with vivid transitions and timing.', nav: 'story' },
    { icon: '🏰', tag: 'Grammar Castle', title: 'Conditionals in Action', desc: 'Master Zero, First, Second, and Third conditional sentences.', nav: 'grammar' },
    { icon: '⚔️', tag: 'Adventure', title: 'Escape Room Chamber #2', desc: 'Solve conditional portal puzzles to escape the dungeon.', nav: 'adventures' },
  ] : [
    { icon: '🏰', tag: 'Grammar Castle', title: 'Tenses & Subject Agreement', desc: 'Master core sentence syntax and avoid common Indian English errors.', nav: 'grammar' },
    { icon: '🌋', tag: 'Speaking Volcano', title: 'Read Aloud Articulation', desc: 'Read foundational passages aloud with real-time phoneme feedback.', nav: 'read-aloud' },
    { icon: '🎯', tag: 'Weak Words Lab', title: 'Daily 5 Spaced Repetition', desc: 'Target your tricky mispronounced words with SM-2 spaced repetition.', nav: 'weakwords' },
    { icon: '🕵️', tag: 'Adventure', title: 'English Detective Case #101', desc: 'Detect verb tense errors to solve the campus laboratory alibi.', nav: 'adventures' },
  ];

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

    <!-- 3-TIER DIFFICULTY & PROGRESSION SECTION -->
    <div class="dragon-section-header">
      <h2 class="dragon-section-title">
        <span>🏆</span> 3-Level Challenge & Difficulty Progression
      </h2>
      <button class="btn btn-ghost btn-sm" data-nav="adventures">Open Adventure Quests &rarr;</button>
    </div>

    <div class="dragon-levels-grid" style="margin-bottom:32px">
      <!-- BEGINNER TIER -->
      <div class="tier-level-card" style="--tier-accent:#10B981; --tier-glow:rgba(16,185,129,0.35);padding:18px">
        <div>
          <div class="tier-badge-row" style="margin-bottom:8px">
            <span class="tier-subtitle" style="font-size:11px">LEVEL 1 · FOUNDATIONS</span>
            <span class="tier-pill-unlocked" style="font-size:10.5px"><span>✓</span> UNLOCKED</span>
          </div>
          <div class="tier-title-row" style="margin-bottom:4px">
            <span style="font-size:22px">🌱</span>
            <h3 class="tier-name" style="font-size:17px">BEGINNER</h3>
          </div>
          <p class="tier-desc" style="font-size:12.5px;margin-bottom:12px;min-height:36px">
            Core grammar syntax, vocabulary, sentence construction, and daily spoken inquiry.
          </p>
        </div>
        <div>
          <div class="tier-progress-box" style="padding:8px 10px;margin-bottom:10px">
            <div class="tier-progress-header" style="font-size:11.5px;margin-bottom:4px">
              <span>${challengeLevels?.Beginner?.completed || 0} / ${challengeLevels?.Beginner?.total || 6} Completed</span>
              <span>${challengeLevels?.Beginner?.percent || 0}%</span>
            </div>
            <div class="tier-progress-bar-outer" style="height:6px">
              <div class="tier-progress-bar-inner" style="width:${challengeLevels?.Beginner?.percent || 0}%"></div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm w-full" data-nav="adventures" style="background:#10B981;border-color:#10B981;font-weight:700;font-size:12px">
            Play Challenges &rarr;
          </button>
        </div>
      </div>

      <!-- INTERMEDIATE TIER -->
      <div class="tier-level-card ${unlockedTiers.includes('Intermediate') ? '' : 'tier-locked'}" style="--tier-accent:#06B6D4; --tier-glow:rgba(6,182,212,0.35);padding:18px">
        <div>
          <div class="tier-badge-row" style="margin-bottom:8px">
            <span class="tier-subtitle" style="font-size:11px;color:#06B6D4">LEVEL 2 · FLUENCY & STORIES</span>
            ${unlockedTiers.includes('Intermediate')
              ? `<span class="tier-pill-unlocked" style="font-size:10.5px;color:#06B6D4;border-color:#06B6D4"><span>✓</span> UNLOCKED</span>`
              : `<span class="tier-pill-locked" style="font-size:10.5px"><span>🔒</span> LOCKED</span>`}
          </div>
          <div class="tier-title-row" style="margin-bottom:4px">
            <span style="font-size:22px">⚡</span>
            <h3 class="tier-name" style="font-size:17px">INTERMEDIATE</h3>
          </div>
          <p class="tier-desc" style="font-size:12.5px;margin-bottom:12px;min-height:36px">
            Complex grammar, phrasal verbs, collegiate speed battles, and spontaneous storytelling.
          </p>
        </div>
        <div>
          <div class="tier-progress-box" style="padding:8px 10px;margin-bottom:10px">
            <div class="tier-progress-header" style="font-size:11.5px;margin-bottom:4px">
              <span>${challengeLevels?.Intermediate?.completed || 0} / ${challengeLevels?.Intermediate?.total || 6} Completed</span>
              <span>${challengeLevels?.Intermediate?.percent || 0}%</span>
            </div>
            <div class="tier-progress-bar-outer" style="height:6px">
              <div class="tier-progress-bar-inner" style="width:${challengeLevels?.Intermediate?.percent || 0}%;background:#06B6D4"></div>
            </div>
          </div>
          ${unlockedTiers.includes('Intermediate') ? `
            <button class="btn btn-primary btn-sm w-full" data-nav="adventures" style="background:#06B6D4;border-color:#06B6D4;font-weight:700;font-size:12px">
              Play Challenges &rarr;
            </button>
          ` : `
            <div style="font-size:11px;color:#EF4444;font-weight:600;text-align:center;padding:4px 0">
              🔒 Requires 4 Beginner wins (${challengeLevels?.Beginner?.completed || 0}/4)
            </div>
          `}
        </div>
      </div>

      <!-- ADVANCED TIER -->
      <div class="tier-level-card ${unlockedTiers.includes('Advanced') ? '' : 'tier-locked'}" style="--tier-accent:#8B5CF6; --tier-glow:rgba(139,92,246,0.35);padding:18px">
        <div>
          <div class="tier-badge-row" style="margin-bottom:8px">
            <span class="tier-subtitle" style="font-size:11px;color:#8B5CF6">LEVEL 3 · ORATORY & ARENA</span>
            ${unlockedTiers.includes('Advanced')
              ? `<span class="tier-pill-unlocked" style="font-size:10.5px;color:#8B5CF6;border-color:#8B5CF6"><span>✓</span> UNLOCKED</span>`
              : `<span class="tier-pill-locked" style="font-size:10.5px"><span>🔒</span> LOCKED</span>`}
          </div>
          <div class="tier-title-row" style="margin-bottom:4px">
            <span style="font-size:22px">🔥</span>
            <h3 class="tier-name" style="font-size:17px">ADVANCED</h3>
          </div>
          <p class="tier-desc" style="font-size:12.5px;margin-bottom:12px;min-height:36px">
            Hostile boardroom pitches, executive rhetoric, negative inversions, and TED-style public oratory.
          </p>
        </div>
        <div>
          <div class="tier-progress-box" style="padding:8px 10px;margin-bottom:10px">
            <div class="tier-progress-header" style="font-size:11.5px;margin-bottom:4px">
              <span>${challengeLevels?.Advanced?.completed || 0} / ${challengeLevels?.Advanced?.total || 6} Completed</span>
              <span>${challengeLevels?.Advanced?.percent || 0}%</span>
            </div>
            <div class="tier-progress-bar-outer" style="height:6px">
              <div class="tier-progress-bar-inner" style="width:${challengeLevels?.Advanced?.percent || 0}%;background:#8B5CF6"></div>
            </div>
          </div>
          ${unlockedTiers.includes('Advanced') ? `
            <button class="btn btn-primary btn-sm w-full" data-nav="adventures" style="background:#8B5CF6;border-color:#8B5CF6;font-weight:700;font-size:12px">
              Play Challenges &rarr;
            </button>
          ` : `
            <div style="font-size:11px;color:#EF4444;font-weight:600;text-align:center;padding:4px 0">
              🔒 Requires 4 Intermediate wins (${challengeLevels?.Intermediate?.completed || 0}/4)
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- DAILY LEVEL-ADAPTED LEARNING RECOMMENDATIONS -->
    <div class="dragon-section-header" style="margin-top:8px">
      <h2 class="dragon-section-title">
        <span>🧭</span> Daily ${highestTier} Learning Recommendations
      </h2>
      <span class="pill sprout" style="font-size:11px;font-weight:700">TIER ADAPTED</span>
    </div>

    <div class="grid grid-4 gap-md" style="margin-bottom:32px">
      ${recommendations.map((r) => `
        <div class="card col gap-sm" style="padding:16px;background:var(--color-surface-2);border:1px solid var(--line);border-radius:12px;cursor:pointer;transition:transform .15s ease" data-nav="${r.nav}">
          <div class="row gap-xs" style="align-items:center;justify-content:space-between">
            <span style="font-size:24px">${r.icon}</span>
            <span class="pill" style="font-size:10.5px;background:rgba(255,255,255,0.05);color:var(--color-text)">${r.tag}</span>
          </div>
          <div>
            <div style="font-weight:800;font-size:14.5px;color:var(--color-text);margin-top:4px">${r.title}</div>
            <div style="font-size:12.5px;color:var(--color-text-muted);margin-top:2px;line-height:1.4">${r.desc}</div>
          </div>
          <button class="btn btn-primary btn-sm w-full" style="margin-top:auto;padding:6px 12px;font-size:12px">
            Start &rarr;
          </button>
        </div>
      `).join('')}
    </div>

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
   VIEW 3: THREE-LEVEL DIFFICULTY & ADVENTURE PROGRESSION SYSTEM
   -------------------------------------------------------------------------- */
const CHALLENGE_CATALOG = [
  /* LEVEL 1: BEGINNER (Core Foundations) */
  {
    id: 'detective-b1',
    level: 'Beginner',
    category: 'detective',
    title: 'English Detective: Case #101',
    subtitle: 'The Missing Classroom Key',
    desc: 'Examine three freshmen statements to discover the false alibi exposed by a basic past tense auxiliary error.',
    icon: '🕵️‍♂️',
    xp: 20,
    interactive: true,
    actionText: 'Investigate Case',
    badge: 'Grammar Deduction',
    data: {
      caseTitle: 'Case #101: The Missing Classroom Key',
      themeBadge: 'PAST TENSE SYNTAX INVESTIGATION',
      scenario: 'The teacher’s desk key was misplaced right before morning roll call. Three freshmen waiting outside the language lab gave these statements:',
      statements: [
        { speaker: 'Freshman Alex', quote: 'I waited at the library entrance until the bell rang. I didn’t see anyone enter the corridor.' },
        { speaker: 'Freshman Brian', quote: 'I was go to the cafeteria with my roommate before classes started.' },
        { speaker: 'Freshman Chloe', quote: 'I walked directly to my desk and unpacked my notebooks.' },
      ],
      question: 'Which student made a basic grammatical error indicating a fabricated excuse?',
      options: [
        { label: 'A) Alex ("didn’t see")', choice: 'Alex' },
        { label: 'B) Brian ("was go" — auxiliary was requires -ing or simple went)', choice: 'Brian' },
        { label: 'C) Chloe ("walked directly")', choice: 'Chloe' },
      ],
      correctChoice: 'Brian',
      explanation: 'Brian said "was go". In English, past continuous requires "was + verb-ing" (was going), or simple past (went). This grammatical slip exposes Brian’s false alibi!',
    },
  },
  {
    id: 'escape-b1',
    level: 'Beginner',
    category: 'escape-room',
    title: 'Escape the English Room: Chamber of Prepositions',
    subtitle: 'Elemental Preposition Gate',
    desc: 'Solve the spatial rune by placing the correct preposition to unlock the elemental stone gate.',
    icon: '🗝️',
    xp: 20,
    interactive: true,
    actionText: 'Enter Chamber',
    badge: 'Spatial Syntax',
    data: {
      chamberTitle: 'Chamber #1: Chamber of Prepositions',
      scenario: 'A heavy stone gate blocks the cavern path. Inscribe the correct spatial preposition into the glowing slot:',
      sentence: 'The student sat quietly _________ the shade of the ancient banyan tree.',
      options: [
        { label: 'A) in (enclosed spatial shade)', choice: 'in' },
        { label: 'B) between (requires two reference points)', choice: 'between' },
        { label: 'C) onto (indicates directional movement towards a surface)', choice: 'onto' },
      ],
      correctChoice: 'in',
      explanation: 'In English, we say "in the shade" because the shade is treated as a three-dimensional protective area of shelter.',
    },
  },
  {
    id: 'battle-b1',
    level: 'Beginner',
    category: 'word-battle',
    title: 'Word Battle Arena: Drake Hatchling Duel',
    subtitle: 'Foundational Vocabulary Clash',
    desc: 'Rapid-fire synonym match against the Drake Hatchling before the round timer runs out.',
    icon: '⚔️',
    xp: 20,
    interactive: true,
    actionText: 'Battle Hatchling',
    badge: 'Vocab Speed',
    data: {
      opponent: 'Drake Hatchling',
      targetWord: 'Courageous',
      question: 'Select the exact SYNONYM for "Courageous" before time expires:',
      options: [
        { label: 'Brave & Bold', choice: 'Brave' },
        { label: 'Fearful', choice: 'Fearful' },
        { label: 'Sluggish', choice: 'Sluggish' },
        { label: 'Silent', choice: 'Silent' },
      ],
      correctChoice: 'Brave',
      explanation: '"Courageous" means possessing or showing courage; brave and valorous.',
    },
  },
  {
    id: 'quest-b1',
    level: 'Beginner',
    category: 'random-quest',
    title: 'Destiny Quest: Foundational Articulation',
    subtitle: 'Phonetics & Spoken Introduction',
    desc: 'Spin the Destiny wheel for an oral articulation sprint and self-introduction exercise.',
    icon: '🎲',
    xp: 15,
    interactive: true,
    actionText: 'Roll Quest',
    badge: 'Impromptu Oral',
    data: {
      tasks: [
        'Say this tongue-twister 3 times cleanly without pausing: "Crisp clear crystal clouds over the castle!"',
        'Introduce yourself out loud in 3 complete sentences: your full name, your college department, and your favorite passion.',
        'State 3 objects you can see around you right now using complete sentences starting with "There is..." or "There are...".',
      ],
    },
  },
  {
    id: 'scenario-b1',
    level: 'Beginner',
    category: 'simulation',
    title: 'Campus Everyday Dialogue: Library Desk',
    subtitle: 'Polite Everyday Communication',
    desc: 'Practice courteous spoken inquiry with the campus librarian using polite modals (could/would/please).',
    icon: '📚',
    xp: 25,
    interactive: false,
    destination: 'situational',
    actionText: 'Practice Dialogue',
    badge: 'Polite Modals',
  },
  {
    id: 'pronounce-b1',
    level: 'Beginner',
    category: 'pronunciation',
    title: 'Voice Studio: Foundational Phonetics',
    subtitle: 'Ending Consonants & Vowel Clarity',
    desc: 'Read aloud a beginner passage with clear articulation of final -ed, -s, and diphthong sounds.',
    icon: '🎙️',
    xp: 25,
    interactive: false,
    destination: 'read-aloud',
    actionText: 'Start Reading',
    badge: 'Phoneme Accuracy',
  },

  /* LEVEL 2: INTERMEDIATE (Phrasal Verbs, Fluency, Stories) */
  {
    id: 'detective-i1',
    level: 'Intermediate',
    category: 'detective',
    title: 'English Detective: Case #104',
    subtitle: 'The Mystery of the Gilded Parchment',
    desc: 'Interrogate three scholars to spot the continuous stative verb error exposing the thief.',
    icon: '🕵️‍♂️',
    xp: 25,
    interactive: true,
    actionText: 'Launch Case',
    badge: 'Stative Verb Trap',
    data: {
      caseTitle: 'Case #104: The Mystery of the Gilded Parchment',
      themeBadge: 'STATIVE VERB TENSE DETECTION',
      scenario: 'At 10:00 PM last night, an ancient Dragon Codex was stolen from the Academy Vault. Three scholars were in the library wing:',
      statements: [
        { speaker: 'Scholar Aaron', quote: 'I was reading in the eastern archive until 10:30 PM. I haven’t seen anyone enter the corridor.' },
        { speaker: 'Scholar Brenda', quote: 'I arrived yesterday at 11:00 PM, after the vault had already been unlocked.' },
        { speaker: 'Scholar Cedric', quote: 'I was inspecting the lock when suddenly the alarm rang. I am knowing all the security codes by heart!' },
      ],
      question: 'Which scholar made a fundamental grammatical error indicating deceit?',
      options: [
        { label: 'A) Aaron ("haven’t seen")', choice: 'Aaron' },
        { label: 'B) Brenda ("arrived yesterday")', choice: 'Brenda' },
        { label: 'C) Cedric ("am knowing" — state verbs cannot be continuous!)', choice: 'Cedric' },
      ],
      correctChoice: 'Cedric',
      explanation: '"Know" is a stative verb representing mental cognition. In English grammar, stative verbs cannot be used in continuous/progressive tenses ("am knowing" is grammatically incorrect). Cedric is the culprit!',
    },
  },
  {
    id: 'escape-i1',
    level: 'Intermediate',
    category: 'escape-room',
    title: 'Escape the English Room: Chamber of Phrasals',
    subtitle: 'Linguistic Puzzle Solver',
    desc: 'Solve the phrasal verb riddle to shatter the rune binding the portal.',
    icon: '🗝️',
    xp: 25,
    interactive: true,
    actionText: 'Enter Room',
    badge: 'Phrasal Mastery',
    data: {
      chamberTitle: 'Chamber #2: Chamber of Phrasals',
      scenario: 'The stone portal is sealed by an enchanted linguistic rune. Complete the sentence with the correct phrasal verb:',
      sentence: 'The dragon refused to _________ the kingdom, standing firm against the storm.',
      options: [
        { label: 'A) give up on (abandon hope / cease caring)', choice: 'give up on' },
        { label: 'B) give in to (yield to pressure / surrender)', choice: 'give in to' },
        { label: 'C) take after (resemble an ancestor)', choice: 'take after' },
      ],
      correctChoice: 'give up on',
      explanation: '"Give up on" means to stop having faith, abandon, or stop trying to save someone or something.',
    },
  },
  {
    id: 'battle-i1',
    level: 'Intermediate',
    category: 'word-battle',
    title: 'Word Battle Arena: Drake Shadow Clash',
    subtitle: 'Collegiate Vocabulary Duel',
    desc: 'High-tempo battle against the Drake Shadow champion to select nuanced collegiate synonyms.',
    icon: '⚔️',
    xp: 25,
    interactive: true,
    actionText: 'Battle Shadow',
    badge: 'Collegiate Speed',
    data: {
      opponent: 'Drake Shadow Champion',
      targetWord: 'Resilient',
      question: 'Choose the exact SYNONYM for "Resilient" before the Drake strikes:',
      options: [
        { label: 'Fragile', choice: 'Fragile' },
        { label: 'Adaptable & Tough', choice: 'Adaptable & Tough' },
        { label: 'Hesitant', choice: 'Hesitant' },
        { label: 'Sluggish', choice: 'Sluggish' },
      ],
      correctChoice: 'Adaptable & Tough',
      explanation: '"Resilient" means able to recoil or bounce back rapidly from adversity; flexible, tough, and adaptable.',
    },
  },
  {
    id: 'quest-i1',
    level: 'Intermediate',
    category: 'random-quest',
    title: 'Destiny Quest: Grammar Nuance & Storytelling',
    subtitle: 'Distinction & Spontaneous Speech',
    desc: 'Explain tricky grammatical differences and narrate an unscripted spontaneous experience.',
    icon: '🎲',
    xp: 20,
    interactive: true,
    actionText: 'Roll Quest',
    badge: 'Fluency Sprint',
    data: {
      tasks: [
        'Explain the difference between "Affect" (verb) and "Effect" (noun) out loud in two simple sentences with examples.',
        'Use the phrasal verb "bring about" in a spoken sentence discussing positive technological change.',
        'Speak for 30 seconds describing a time you overcame an unexpected academic obstacle.',
      ],
    },
  },
  {
    id: 'sim-i1',
    level: 'Intermediate',
    category: 'simulation',
    title: 'Workplace Simulation: The Agile Standup',
    subtitle: 'Team Status & Blocker Communication',
    desc: 'Participate in an interactive sprint standup, communicating updates and blockers concisely without rambling.',
    icon: '💼',
    xp: 30,
    interactive: false,
    destination: 'simulator',
    actionText: 'Join Standup',
    badge: 'Workplace Agility',
  },
  {
    id: 'story-i1',
    level: 'Intermediate',
    category: 'story',
    title: 'Story Continuation: The Stalled Elevator',
    subtitle: 'Spontaneous Spoken Narration',
    desc: 'Listen to a narrative opening and continue the story spontaneously with rich descriptors and connective phrases.',
    icon: '📖',
    xp: 30,
    interactive: false,
    destination: 'story',
    actionText: 'Continue Story',
    badge: 'Narrative Flow',
  },

  /* LEVEL 3: ADVANCED (Executive Oratory, Inversions, High-Stakes Debate) */
  {
    id: 'detective-a1',
    level: 'Advanced',
    category: 'detective',
    title: 'English Detective: Case #108',
    subtitle: 'The Syndicate Infiltration',
    desc: 'Examine diplomatic council statements to detect an inverted negative adverb syntax violation.',
    icon: '🕵️‍♂️',
    xp: 35,
    interactive: true,
    actionText: 'Crack Case',
    badge: 'Inversion Syntax',
    data: {
      caseTitle: 'Case #108: The Syndicate Infiltration',
      themeBadge: 'NEGATIVE ADVERBIAL INVERSION EXPOSURE',
      scenario: 'The High Council’s encrypted vault key was leaked during an emergency assembly. Three senior ambassadors gave sworn statements:',
      statements: [
        { speaker: 'Ambassador Douglas', quote: 'Had we received the dispatch sooner, we would have fortified the perimeter immediately.' },
        { speaker: 'Ambassador Evelyn', quote: 'Under no circumstances the courier should leave the diplomatic bag unattended.' },
        { speaker: 'Ambassador Felix', quote: 'Scarcely had the assembly convened when the power grid malfunctioned.' },
      ],
      question: 'Which ambassador committed an advanced inversion syntax error indicating a fabricated testimony?',
      options: [
        { label: 'A) Douglas ("Had we received" — third conditional inversion is correct)', choice: 'Douglas' },
        { label: 'B) Evelyn ("Under no circumstances the courier should" — negative fronting requires auxiliary inversion!)', choice: 'Evelyn' },
        { label: 'C) Felix ("Scarcely had the assembly" — negative time inversion is correct)', choice: 'Felix' },
      ],
      correctChoice: 'Evelyn',
      explanation: 'When negative adverbials like "Under no circumstances" are fronted for rhetorical emphasis, subject-auxiliary inversion is mandatory: "Under no circumstances should the courier leave...". Evelyn’s error exposes her counterfeit memo!',
    },
  },
  {
    id: 'escape-a1',
    level: 'Advanced',
    category: 'escape-room',
    title: 'Escape Room: Vault of Mixed Conditionals',
    subtitle: 'Grand Sanctum Puzzle',
    desc: 'Solve the mixed third conditional key to unseal the Archmage’s inner sanctum.',
    icon: '🗝️',
    xp: 35,
    interactive: true,
    actionText: 'Unseal Vault',
    badge: 'Mixed Conditionals',
    data: {
      chamberTitle: 'Chamber #3: Vault of Conditionals & Inversions',
      scenario: 'The vault lock glows with dual temporal runes linking past historical cause to present reality:',
      sentence: 'If the dragon had not defended the fortress walls yesterday, our kingdom _________ in ruins today.',
      options: [
        { label: 'A) would be (Mixed conditional: past cause + present consequence)', choice: 'would be' },
        { label: 'B) would have been (Third conditional: past consequence only)', choice: 'would have been' },
        { label: 'C) will be (First conditional: future consequence)', choice: 'will be' },
      ],
      correctChoice: 'would be',
      explanation: 'This is a mixed conditional. The condition occurred in the past ("had not defended"), but the consequence directly impacts the present ("today"), requiring "would + base verb" (would be).',
    },
  },
  {
    id: 'battle-a1',
    level: 'Advanced',
    category: 'word-battle',
    title: 'Word Battle Arena: Elder Wyrm Showdown',
    subtitle: 'GRE & Executive Vocabulary Clash',
    desc: 'Face the legendary Elder Wyrm in a high-stakes duel testing sophisticated academic and rhetoric vocabulary.',
    icon: '⚔️',
    xp: 30,
    interactive: true,
    actionText: 'Face Elder Wyrm',
    badge: 'GRE Vocabulary',
    data: {
      opponent: 'Elder Wyrm Archmage',
      targetWord: 'Equivocal',
      question: 'Select the exact SYNONYM for "Equivocal" before the wyrm unleashes its breath:',
      options: [
        { label: 'Deliberately ambiguous and evasive', choice: 'Deliberately ambiguous and evasive' },
        { label: 'Impartial and fair', choice: 'Impartial and fair' },
        { label: 'Outspoken and loud', choice: 'Outspoken and loud' },
        { label: 'Fragile and fleeting', choice: 'Fragile and fleeting' },
      ],
      correctChoice: 'Deliberately ambiguous and evasive',
      explanation: '"Equivocal" describes speech or statements open to more than one interpretation; deliberately ambiguous, misleading, or elusive.',
    },
  },
  {
    id: 'quest-a1',
    level: 'Advanced',
    category: 'random-quest',
    title: 'Destiny Quest: Impromptu Persuasion Sprint',
    subtitle: 'Oratory & Critical Rhetoric',
    desc: 'Deliver an unscripted 45-second persuasive spoken argument with sophisticated transitions and zero filler words.',
    icon: '🎲',
    xp: 30,
    interactive: true,
    actionText: 'Roll Quest',
    badge: 'Executive Oratory',
    data: {
      tasks: [
        'Deliver an impromptu 45-second speech defending: "Why human creativity is amplified rather than replaced by artificial intelligence." Eliminate all filler words (um, uh, like).',
        'Rephrase this colloquial sentence into executive-level diplomatic English: "We messed up the deadline because the client kept changing their mind."',
        'Present a well-structured counter-argument to this thesis: "Remote work permanently damages corporate culture and team innovation."',
      ],
    },
  },
  {
    id: 'pitch-a1',
    level: 'Advanced',
    category: 'simulation',
    title: 'Startup Pitch Arena: Hostile Boardroom Defense',
    subtitle: 'High-Stakes Investor Q&A',
    desc: 'Step into the Dragon Boardroom to defend your venture metrics and handle aggressive VC interruptions.',
    icon: '💼',
    xp: 40,
    interactive: false,
    destination: 'simulator',
    actionText: 'Pitch Boardroom',
    badge: 'Executive Defense',
  },
  {
    id: 'worldstage-a1',
    level: 'Advanced',
    category: 'simulation',
    title: 'World Stage: The Global Keynote Oratory',
    subtitle: 'Auditorium Public Speaking',
    desc: 'Address a reactive virtual audience of 500 attendees, evaluated in real time for pitch variation, pacing, and presence.',
    icon: '🏛️',
    xp: 40,
    interactive: false,
    destination: 'world-stage',
    actionText: 'Step onto Stage',
    badge: 'Keynote Mastery',
  },
];

let activeTierFilter = 'all';

VIEW_RENDERERS['adventures'] = async (mount) => {
  let challengeData = null;
  try {
    challengeData = await Api.getChallenges();
  } catch (err) {
    console.warn('[challenges] Failed to load server challenge progress:', err);
  }

  const unlockedLevels = challengeData?.unlockedLevels || (S.user?.unlockedLevels && S.user.unlockedLevels.length ? S.user.unlockedLevels : ['Beginner']);
  const completedIds = new Set(challengeData?.completedChallengeIds || []);

  const levelsConfig = [
    {
      level: 'Beginner',
      title: 'BEGINNER',
      tag: 'LEVEL 1 · FOUNDATIONS',
      icon: '🌱',
      accent: '#10B981',
      soft: 'rgba(16, 185, 129, 0.15)',
      glow: 'rgba(16, 185, 129, 0.35)',
      desc: 'Fundamental grammar rules, core vocabulary, sentence construction, and simple conversational exercises.',
      unlocked: true,
      reqText: null,
    },
    {
      level: 'Intermediate',
      title: 'INTERMEDIATE',
      tag: 'LEVEL 2 · FLUENCY & STORIES',
      icon: '⚡',
      accent: '#06B6D4',
      soft: 'rgba(6, 182, 212, 0.15)',
      glow: 'rgba(6, 182, 212, 0.35)',
      desc: 'Complex grammar, phrasal verbs, contextual vocabulary, spontaneous storytelling, and workplace discussions.',
      unlocked: unlockedLevels.includes('Intermediate'),
      reqText: 'Complete at least 4 Beginner challenges to unlock',
    },
    {
      level: 'Advanced',
      title: 'ADVANCED',
      tag: 'LEVEL 3 · ORATORY & ARENA',
      icon: '🔥',
      accent: '#8B5CF6',
      soft: 'rgba(139, 92, 246, 0.15)',
      glow: 'rgba(139, 92, 246, 0.35)',
      desc: 'Professional communication, negative inversions, mixed conditionals, hostile investor pitches, and TED-style public oratory.',
      unlocked: unlockedLevels.includes('Advanced'),
      reqText: 'Complete at least 4 Intermediate challenges to unlock',
    },
  ];

  // Calculate per-level metrics
  levelsConfig.forEach((cfg) => {
    const list = CHALLENGE_CATALOG.filter((c) => c.level === cfg.level);
    const done = list.filter((c) => completedIds.has(c.id)).length;
    cfg.total = list.length;
    cfg.completed = done;
    cfg.percent = cfg.total > 0 ? Math.round((done / cfg.total) * 100) : 0;
  });

  mount.innerHTML = `
    <!-- HEADER -->
    <div style="margin-bottom:24px">
      <div class="row gap-sm" style="align-items:center;margin-bottom:8px">
        <button class="btn btn-ghost btn-sm" onclick="setView('dashboard')">&larr; Back to Dashboard</button>
        <span class="pill sprout" style="font-size:11px;font-weight:700">3-LEVEL DIFFICULTY & PROGRESSION</span>
      </div>
      <h1 style="font-size:28px;font-weight:900;margin:0 0 6px">Dragon Academy Adventure Challenges</h1>
      <p style="font-size:14.5px;color:var(--color-text-muted);margin:0">
        Master oral fluency through structured, progressive challenges. Each tier unlocks automatically as you prove your mastery.
      </p>
    </div>

    <!-- 3 VISUALLY DISTINCT LEVEL SECTIONS (HERO TIERS) -->
    <div class="dragon-levels-grid">
      ${levelsConfig.map((lvl) => `
        <div class="tier-level-card ${lvl.unlocked ? '' : 'tier-locked'}" style="--tier-accent:${lvl.accent}; --tier-glow:${lvl.glow}">
          <div>
            <div class="tier-badge-row">
              <span class="tier-subtitle">${lvl.tag}</span>
              ${lvl.unlocked
                ? `<span class="tier-pill-unlocked"><span>✓</span> UNLOCKED</span>`
                : `<span class="tier-pill-locked"><span>🔒</span> LOCKED</span>`}
            </div>

            <div class="tier-title-row">
              <span class="tier-icon">${lvl.icon}</span>
              <h3 class="tier-name">${lvl.title}</h3>
            </div>

            <p class="tier-desc">${lvl.desc}</p>

            ${!lvl.unlocked && lvl.reqText ? `
              <div class="tier-req-banner">
                <span>🔒</span> ${lvl.reqText}
              </div>
            ` : ''}
          </div>

          <div>
            <div class="tier-progress-box">
              <div class="tier-progress-header">
                <span>Progress: ${lvl.completed} / ${lvl.total} Completed</span>
                <span>${lvl.percent}%</span>
              </div>
              <div class="tier-progress-bar-outer">
                <div class="tier-progress-bar-inner" style="width: ${lvl.percent}%"></div>
              </div>
            </div>

            ${lvl.unlocked ? `
              <button class="btn btn-primary w-full" data-filter-tier="${lvl.level}" style="background:${lvl.accent};border-color:${lvl.accent};color:#FFFFFF;font-weight:700">
                <span>⚔️</span> ${lvl.completed === 0 ? 'Start Learning' : 'Explore Challenges'} &rarr;
              </button>
            ` : `
              <button class="btn btn-ghost w-full" disabled style="opacity:0.6;cursor:not-allowed">
                <span>🔒</span> Locked &middot; Complete Previous Tier
              </button>
            `}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- FILTER TABS -->
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:14px">
      <h2 style="font-size:20px;font-weight:800;margin:0">Available Challenges</h2>
      <div class="challenge-filter-tabs" id="challenge-filter-root">
        <button class="challenge-filter-btn ${activeTierFilter === 'all' ? 'active' : ''}" data-filter="all">All (${CHALLENGE_CATALOG.length})</button>
        <button class="challenge-filter-btn ${activeTierFilter === 'Beginner' ? 'active' : ''}" data-filter="Beginner">Beginner (${CHALLENGE_CATALOG.filter(c => c.level === 'Beginner').length})</button>
        <button class="challenge-filter-btn ${activeTierFilter === 'Intermediate' ? 'active' : ''}" data-filter="Intermediate">
          ${unlockedLevels.includes('Intermediate') ? '' : '🔒 '}Intermediate (${CHALLENGE_CATALOG.filter(c => c.level === 'Intermediate').length})
        </button>
        <button class="challenge-filter-btn ${activeTierFilter === 'Advanced' ? 'active' : ''}" data-filter="Advanced">
          ${unlockedLevels.includes('Advanced') ? '' : '🔒 '}Advanced (${CHALLENGE_CATALOG.filter(c => c.level === 'Advanced').length})
        </button>
      </div>
    </div>

    <!-- CHALLENGES GRID -->
    <div class="dragon-kingdoms-grid" style="grid-template-columns:repeat(auto-fit, minmax(310px, 1fr))" id="challenge-cards-grid">
      ${CHALLENGE_CATALOG
        .filter((c) => activeTierFilter === 'all' || c.level === activeTierFilter)
        .map((c) => {
          const isTierUnlocked = unlockedLevels.includes(c.level);
          const isDone = completedIds.has(c.id);

          return `
            <div class="kingdom-portal-card challenge-card ${isTierUnlocked ? '' : 'is-locked'}" data-challenge-id="${c.id}" style="padding:22px;${!isTierUnlocked ? 'border-style:dashed;' : ''}">
              <div>
                <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:12px">
                  <span class="pill" style="font-size:11.5px;background:var(--color-surface-2);color:var(--color-text);font-weight:600">
                    ${c.badge || c.category}
                  </span>
                  <span class="pill coral" style="font-size:11px;font-weight:800">+${c.xp} XP</span>
                </div>

                <div class="kingdom-header">
                  <div class="kingdom-icon-crest" style="border-color:var(--line);background:rgba(255,255,255,0.03)">${c.icon}</div>
                  <div>
                    <h3 class="kingdom-name" style="font-size:17px">${c.title}</h3>
                    <div class="kingdom-theme-tag">${c.subtitle}</div>
                  </div>
                </div>

                <div class="kingdom-desc" style="font-size:13px;line-height:1.55;min-height:42px">${c.desc}</div>
              </div>

              <div>
                ${!isTierUnlocked ? `
                  <div class="challenge-locked-overlay-tag" style="margin-bottom:10px;width:100%;justify-content:center">
                    <span>🔒</span> Locked &middot; Tier requirement not met
                  </div>
                ` : isDone ? `
                  <div class="row gap-xs" style="align-items:center;justify-content:space-between;margin-bottom:8px">
                    <span class="pill sprout" style="font-size:11.5px;font-weight:800">✓ Completed</span>
                    <button class="btn btn-ghost btn-sm challenge-launch-btn" data-id="${c.id}" style="font-size:12px;padding:4px 10px">Replay &rarr;</button>
                  </div>
                ` : `
                  <button class="kingdom-btn challenge-launch-btn" data-id="${c.id}" style="background:var(--color-primary);color:#FFFFFF;width:100%;justify-content:center;padding:10px 14px;font-size:13.5px">
                    ${c.actionText} <span>&rarr;</span>
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
    </div>

    <!-- Interactive Adventure Modal Root -->
    <div id="adventure-modal-root"></div>
  `;

  // Filter Buttons
  mount.querySelectorAll('.challenge-filter-btn').forEach((btn) => {
    btn.onclick = () => {
      activeTierFilter = btn.dataset.filter;
      VIEW_RENDERERS['adventures'](mount);
    };
  });

  // Hero Card "Start Learning / Explore" buttons
  mount.querySelectorAll('[data-filter-tier]').forEach((btn) => {
    btn.onclick = () => {
      activeTierFilter = btn.dataset.filterTier;
      VIEW_RENDERERS['adventures'](mount);
      const root = $('#challenge-cards-grid');
      if (root) root.scrollIntoView({ behavior: 'smooth' });
    };
  });

  // Attach Challenge Click Handlers
  mount.querySelectorAll('.challenge-card').forEach((card) => {
    const cid = card.dataset.challengeId;
    const challenge = CHALLENGE_CATALOG.find((c) => c.id === cid);
    if (!challenge) return;

    card.onclick = (e) => {
      // If clicking launch or card itself
      const isTierUnlocked = unlockedLevels.includes(challenge.level);
      if (!isTierUnlocked) {
        DragonMascot.say(`This challenge is sealed in the ${challenge.level} vault! Complete the previous tier challenges to unlock it!`, 'curious');
        return;
      }

      if (challenge.interactive) {
        openInteractiveChallengeModal(challenge, () => {
          VIEW_RENDERERS['adventures'](mount);
        });
      } else if (challenge.destination) {
        setView(challenge.destination);
      }
    };
  });
};

/* --------------------------------------------------------------------------
   INTERACTIVE CHALLENGE MODAL ENGINE
   -------------------------------------------------------------------------- */
function openInteractiveChallengeModal(challenge, onComplete) {
  const root = $('#adventure-modal-root');
  if (!root) return;

  const d = challenge.data || {};
  const accentColor = challenge.level === 'Beginner' ? '#10B981' : challenge.level === 'Intermediate' ? '#06B6D4' : '#8B5CF6';

  if (challenge.category === 'detective') {
    root.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(10,14,26,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
        <div class="card col gap-md" style="max-width:640px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid ${accentColor};box-shadow:0 20px 50px rgba(0,0,0,0.6)">
          <div class="row" style="justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:26px">${challenge.icon}</span>
              <div>
                <h2 style="font-size:18px;margin:0;font-weight:800">${d.caseTitle || challenge.title}</h2>
                <span class="pill" style="font-size:11px;color:${accentColor};background:rgba(255,255,255,0.05)">Investigation Case</span>
              </div>
            </div>
            <button class="icon-btn" onclick="$('#adventure-modal-root').innerHTML=''">&times;</button>
          </div>

          <div>
            <div class="pill coral" style="font-size:11px;margin-bottom:8px">${d.themeBadge || 'CRIME SCENE REPORT'}</div>
            <p style="font-size:14px;color:var(--color-text);line-height:1.6;margin-top:4px">
              ${d.scenario}
            </p>

            <div class="col gap-xs" style="background:var(--color-surface-2);border-radius:12px;padding:14px;margin:12px 0;font-size:13.5px">
              ${(d.statements || []).map((s) => `
                <div><strong>${s.speaker}:</strong> "${s.quote}"</div>
              `).join('')}
            </div>

            <p style="font-weight:700;font-size:14px;margin:12px 0 6px">${d.question}</p>
            <div class="col gap-xs" id="detective-options">
              ${(d.options || []).map((opt) => `
                <button class="btn btn-ghost" data-choice="${opt.choice}" style="text-align:left;justify-content:flex-start;padding:10px 14px">
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          </div>
          <div id="challenge-result" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    root.querySelectorAll('#detective-options button').forEach((btn) => {
      btn.onclick = async () => {
        const choice = btn.dataset.choice;
        const resEl = $('#challenge-result');
        if (choice === d.correctChoice) {
          btn.style.background = 'var(--color-success-soft)';
          btn.style.borderColor = 'var(--color-success)';

          // Record completion
          let serverRes = null;
          try {
            serverRes = await Api.completeChallenge(challenge.id, { score: 100 });
          } catch (e) {
            console.warn('[challenge] complete error:', e);
          }

          resEl.innerHTML = `
            <div style="background:var(--color-success-soft);color:var(--color-success-text);border:1px solid var(--color-success);border-radius:10px;padding:14px;font-size:14px;font-weight:600">
              🎉 Case Solved! ${d.explanation}
              <div style="margin-top:8px;font-weight:800;color:var(--dragon-gold);font-size:15px">+${challenge.xp} XP Awarded!</div>
              ${serverRes?.justUnlockedLevel ? `
                <div style="margin-top:10px;padding:8px;background:rgba(245,158,11,0.2);border-radius:8px;font-weight:900;color:#F59E0B">
                  🔥 TIER UNLOCKED! You have officially unlocked the ${serverRes.justUnlockedLevel} challenge tier!
                </div>
              ` : ''}
              <button class="btn btn-primary btn-sm" id="close-modal-refresh-btn" style="margin-top:12px">Continue Training &rarr;</button>
            </div>
          `;

          if (window.addStudentXP) window.addStudentXP(challenge.xp);
          if (window.DragonMascot && window.DragonMascot.celebrate) {
            DragonMascot.celebrate({
              title: 'Grammar Detective Victory!',
              xp: challenge.xp,
              message: `Brilliant deduction, Detective! ${d.explanation}`,
              onDismiss: () => { root.innerHTML = ''; if (onComplete) onComplete(); }
            });
          } else if (window.DragonMascot && window.DragonMascot.say) {
            DragonMascot.say('Brilliant deduction, Detective! You cracked the grammar alibi!', 'victory');
          }

          const closeBtn = $('#close-modal-refresh-btn');
          if (closeBtn) closeBtn.onclick = () => {
            root.innerHTML = '';
            if (onComplete) onComplete();
          };
        } else {
          resEl.innerHTML = `
            <div style="background:var(--color-error-soft);color:var(--color-error-text);border:1px solid var(--color-error);border-radius:10px;padding:12px;font-size:13.5px">
              ❌ Incorrect deduction. Re-read the statements closely for grammatical accuracy.
            </div>`;
          if (window.DragonMascot && window.DragonMascot.encourage) {
            DragonMascot.encourage({
              title: 'Detective Clue Missed!',
              message: 'The suspect slipped away! In English, state-verbs and auxiliary agreements require precise observation.',
              tip: 'Review whether the verb expresses a permanent state or dynamic action.',
              buttonText: '🔥 Re-examine Clues & Try Again',
            });
          }
        }
      };
    });
  } else if (challenge.category === 'escape-room') {
    root.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(10,14,26,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
        <div class="card col gap-md" style="max-width:640px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid ${accentColor};box-shadow:0 20px 50px rgba(0,0,0,0.6)">
          <div class="row" style="justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:26px">${challenge.icon}</span>
              <div>
                <h2 style="font-size:18px;margin:0;font-weight:800">${d.chamberTitle || challenge.title}</h2>
                <span class="pill" style="font-size:11px;color:${accentColor};background:rgba(255,255,255,0.05)">Linguistic Puzzle</span>
              </div>
            </div>
            <button class="icon-btn" onclick="$('#adventure-modal-root').innerHTML=''">&times;</button>
          </div>

          <div>
            <p style="font-size:14px;color:var(--color-text);line-height:1.6">
              ${d.scenario}
            </p>
            <div style="background:var(--color-surface-2);border-radius:12px;padding:18px;margin:14px 0;font-size:15px;font-weight:700;text-align:center;line-height:1.6;color:var(--color-text)">
              "${d.sentence}"
            </div>
            <div class="col gap-xs" id="escape-options">
              ${(d.options || []).map((opt) => `
                <button class="btn btn-ghost" data-choice="${opt.choice}" style="text-align:left;justify-content:flex-start;padding:10px 14px">
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          </div>
          <div id="challenge-result" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    root.querySelectorAll('#escape-options button').forEach((btn) => {
      btn.onclick = async () => {
        const choice = btn.dataset.choice;
        const resEl = $('#challenge-result');
        if (choice === d.correctChoice) {
          btn.style.background = 'var(--color-success-soft)';
          btn.style.borderColor = 'var(--color-success)';

          let serverRes = null;
          try {
            serverRes = await Api.completeChallenge(challenge.id, { score: 100 });
          } catch (e) {}

          resEl.innerHTML = `
            <div style="background:var(--color-success-soft);color:var(--color-success-text);border:1px solid var(--color-success);border-radius:10px;padding:14px;font-size:14px;font-weight:600">
              🚪 The stone portal swings open! ${d.explanation}
              <div style="margin-top:8px;font-weight:800;color:var(--dragon-gold);font-size:15px">+${challenge.xp} XP Awarded! You escaped the chamber!</div>
              ${serverRes?.justUnlockedLevel ? `
                <div style="margin-top:10px;padding:8px;background:rgba(245,158,11,0.2);border-radius:8px;font-weight:900;color:#F59E0B">
                  🔥 TIER UNLOCKED! You have officially unlocked the ${serverRes.justUnlockedLevel} challenge tier!
                </div>
              ` : ''}
              <button class="btn btn-primary btn-sm" id="close-modal-refresh-btn" style="margin-top:12px">Continue Training &rarr;</button>
            </div>
          `;

          if (window.addStudentXP) window.addStudentXP(challenge.xp);
          if (window.DragonMascot && window.DragonMascot.celebrate) {
            DragonMascot.celebrate({
              title: 'Phrasal Vault Unlocked!',
              xp: challenge.xp,
              message: `The enchanted chamber swings open! ${d.explanation}`,
              onDismiss: () => { root.innerHTML = ''; if (onComplete) onComplete(); }
            });
          } else if (window.DragonMascot && window.DragonMascot.say) {
            DragonMascot.say('The chamber is unlocked! Your linguistic mastery shattered the rune!', 'victory');
          }

          const closeBtn = $('#close-modal-refresh-btn');
          if (closeBtn) closeBtn.onclick = () => {
            root.innerHTML = '';
            if (onComplete) onComplete();
          };
        } else {
          resEl.innerHTML = `
            <div style="background:var(--color-error-soft);color:var(--color-error-text);border:1px solid var(--color-error);border-radius:10px;padding:12px;font-size:13.5px">
              ❌ The lock remains sealed. Review the grammatical nuance required by the context.
            </div>`;
          if (window.DragonMascot && window.DragonMascot.encourage) {
            DragonMascot.encourage({
              title: 'The Vault Lock Resists!',
              message: 'That rune did not turn the cylinder. Examine the phrasal verb or grammatical element closely!',
              tip: 'Think about prepositions and dependent verbs that pair naturally.',
              buttonText: '🔥 Turn Rune Dial & Try Again',
            });
          }
        }
      };
    });
  } else if (challenge.category === 'word-battle') {
    root.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(10,14,26,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
        <div class="card col gap-md" style="max-width:580px;width:100%;border:1px solid ${accentColor};box-shadow:0 20px 50px rgba(0,0,0,0.6)">
          <div class="row" style="justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:26px">${challenge.icon}</span>
              <div>
                <h2 style="font-size:18px;margin:0;font-weight:800">${challenge.title}</h2>
                <span class="pill" style="font-size:11px;color:${accentColor};background:rgba(255,255,255,0.05)">Arena Duel</span>
              </div>
            </div>
            <button class="icon-btn" onclick="$('#adventure-modal-root').innerHTML=''">&times;</button>
          </div>

          <div>
            <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:12px">
              <span>Rider vs <strong>${d.opponent}</strong></span>
              <span class="pill coral" style="font-size:11px">Speed Match</span>
            </div>

            <div style="background:var(--color-surface-2);border-radius:14px;padding:20px;text-align:center;margin-bottom:14px">
              <div style="font-size:12px;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.04em">Target Word</div>
              <h3 style="font-size:26px;font-weight:900;color:${accentColor};margin:4px 0">"${d.targetWord}"</h3>
              <div style="font-size:13.5px;color:var(--color-text-muted)">${d.question}</div>
            </div>

            <div class="grid grid-2 gap-sm" id="battle-options">
              ${(d.options || []).map((opt) => `
                <button class="btn btn-ghost" data-choice="${opt.choice}" style="padding:12px 10px;font-weight:700">
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          </div>
          <div id="challenge-result" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    root.querySelectorAll('#battle-options button').forEach((btn) => {
      btn.onclick = async () => {
        const choice = btn.dataset.choice;
        const resEl = $('#challenge-result');
        if (choice === d.correctChoice) {
          btn.style.background = 'var(--color-success-soft)';
          btn.style.borderColor = 'var(--color-success)';

          let serverRes = null;
          try {
            serverRes = await Api.completeChallenge(challenge.id, { score: 100 });
          } catch (e) {}

          resEl.innerHTML = `
            <div style="background:var(--color-success-soft);color:var(--color-success-text);border:1px solid var(--color-success);border-radius:10px;padding:14px;font-size:14px;font-weight:600">
              ⚡ Critical Strike! You defeated ${d.opponent}! ${d.explanation}
              <div style="margin-top:8px;font-weight:800;color:var(--dragon-gold);font-size:15px">+${challenge.xp} XP Awarded!</div>
              ${serverRes?.justUnlockedLevel ? `
                <div style="margin-top:10px;padding:8px;background:rgba(245,158,11,0.2);border-radius:8px;font-weight:900;color:#F59E0B">
                  🔥 TIER UNLOCKED! You have officially unlocked the ${serverRes.justUnlockedLevel} challenge tier!
                </div>
              ` : ''}
              <button class="btn btn-primary btn-sm" id="close-modal-refresh-btn" style="margin-top:12px">Continue Training &rarr;</button>
            </div>
          `;

          if (window.addStudentXP) window.addStudentXP(challenge.xp);
          if (window.DragonMascot && window.DragonMascot.celebrate) {
            DragonMascot.celebrate({
              title: 'Word Battle Arena Victory!',
              xp: challenge.xp,
              message: `The opponent is vanquished! ${d.explanation}`,
              onDismiss: () => { root.innerHTML = ''; if (onComplete) onComplete(); }
            });
          } else if (window.DragonMascot && window.DragonMascot.say) {
            DragonMascot.say(`Victory in the Word Battle Arena! You defeated ${d.opponent}!`, 'victory');
          }

          const closeBtn = $('#close-modal-refresh-btn');
          if (closeBtn) closeBtn.onclick = () => {
            root.innerHTML = '';
            if (onComplete) onComplete();
          };
        } else {
          resEl.innerHTML = `
            <div style="background:var(--color-error-soft);color:var(--color-error-text);border:1px solid var(--color-error);border-radius:10px;padding:12px;font-size:13.5px">
              💥 The attack missed. Re-evaluate the contextual meaning of the target word.
            </div>`;
          if (window.DragonMascot && window.DragonMascot.encourage) {
            DragonMascot.encourage({
              title: 'Word Strike Parried!',
              message: 'The attack was parried! Pay close attention to subtle differences in nuance and connotations.',
              tip: 'Recall common collocations and usage scenarios.',
              buttonText: '🔥 Strike Again with Full Focus',
            });
          }
        }
      };
    });
  } else if (challenge.category === 'random-quest') {
    const tasks = d.tasks || ['Speak clearly for 30 seconds on your career goals.'];
    const task = tasks[Math.floor(Math.random() * tasks.length)];

    root.innerHTML = `
      <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(10,14,26,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
        <div class="card col gap-md" style="max-width:560px;width:100%;border:1px solid ${accentColor};box-shadow:0 20px 50px rgba(0,0,0,0.6)">
          <div class="row" style="justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px">
            <div class="row gap-sm" style="align-items:center">
              <span style="font-size:26px">${challenge.icon}</span>
              <div>
                <h2 style="font-size:18px;margin:0;font-weight:800">${challenge.title}</h2>
                <span class="pill" style="font-size:11px;color:${accentColor};background:rgba(255,255,255,0.05)">Destiny Quest</span>
              </div>
            </div>
            <button class="icon-btn" onclick="$('#adventure-modal-root').innerHTML=''">&times;</button>
          </div>

          <div>
            <div class="pill sprout" style="font-size:11px;margin-bottom:8px">DESTINY QUEST OBJECTIVE</div>
            <div style="background:var(--color-surface-2);border-radius:14px;padding:20px;font-size:15px;line-height:1.6;font-weight:600;color:var(--color-text);margin:12px 0">
              ${task}
            </div>
            <div class="row gap-sm" style="justify-content:flex-end">
              <button class="btn btn-primary" id="complete-quest-btn" style="background:${accentColor};border-color:${accentColor};color:#FFFFFF;font-weight:700">
                <span>🔥</span> I Completed This Spoken Quest (+${challenge.xp} XP)
              </button>
            </div>
          </div>
          <div id="challenge-result" style="margin-top:8px"></div>
        </div>
      </div>
    `;

    root.querySelector('#complete-quest-btn').onclick = async () => {
      const btn = root.querySelector('#complete-quest-btn');
      btn.disabled = true;

      let serverRes = null;
      try {
        serverRes = await Api.completeChallenge(challenge.id, { score: 100 });
      } catch (e) {}

      $('#challenge-result').innerHTML = `
        <div style="background:var(--color-success-soft);color:var(--color-success-text);border:1px solid var(--color-success);border-radius:10px;padding:14px;font-size:14px;font-weight:600">
          🎉 Quest accomplished! Your dragon flame burns brighter!
          <div style="margin-top:8px;font-weight:800;color:var(--dragon-gold);font-size:15px">+${challenge.xp} XP Awarded!</div>
          ${serverRes?.justUnlockedLevel ? `
            <div style="margin-top:10px;padding:8px;background:rgba(245,158,11,0.2);border-radius:8px;font-weight:900;color:#F59E0B">
              🔥 TIER UNLOCKED! You have officially unlocked the ${serverRes.justUnlockedLevel} challenge tier!
            </div>
          ` : ''}
          <button class="btn btn-primary btn-sm" id="close-modal-refresh-btn" style="margin-top:12px">Continue Training &rarr;</button>
        </div>
      `;

      if (window.addStudentXP) window.addStudentXP(challenge.xp);
      if (window.DragonMascot && window.DragonMascot.celebrate) {
        DragonMascot.celebrate({
          title: 'Dragon Vocal Roar Unleashed!',
          xp: challenge.xp || 25,
          message: 'Well spoken, Dragon Rider! Your impromptu speech reverberates across the realm!',
          onDismiss: () => { root.innerHTML = ''; if (onComplete) onComplete(); }
        });
      } else if (window.DragonMascot && window.DragonMascot.say) {
        DragonMascot.say('Well spoken, Dragon Rider! Your impromptu fluency is growing sharper!', 'happy');
      }

      const closeBtn = $('#close-modal-refresh-btn');
      if (closeBtn) closeBtn.onclick = () => {
        root.innerHTML = '';
        if (onComplete) onComplete();
      };
    };
  }
}


