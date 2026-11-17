/* ==========================================================================
   Dragon Academy — Central Dragon Companion & Mascot Component (DragonMascot)
   Theme: Train Your Mind. Awaken Your Dragon. Master English.
   ========================================================================== */

(function (window) {
  'use strict';

  const EVOLUTIONS = [
    {
      stage: 1,
      name: 'Awakening Dragon',
      minXp: 0,
      nextXp: 250,
      title: 'Novice Hatchling',
      badge: 'AWAKENING',
      image: '/img/dragon/dragon-stage-1.jpg',
      quote: 'From the egg a spark is born! Every new word feeds our first flame.',
    },
    {
      stage: 2,
      name: 'First Flame Dragon',
      minXp: 250,
      nextXp: 500,
      title: 'Curious Fledgling',
      badge: 'FIRST_FLAME',
      image: '/img/dragon/dragon-stage-2.jpg',
      quote: 'The flame is ignited! Speak with pride, Dragon Rider!',
    },
    {
      stage: 3,
      name: 'Young Flame Dragon',
      minXp: 500,
      nextXp: 1000,
      title: 'Brave Apprentice',
      badge: 'APPRENTICE',
      image: '/img/dragon/dragon-stage-3.jpg',
      quote: 'Our wings are growing strong! Challenge the harder lessons!',
    },
    {
      stage: 4,
      name: 'Ember Dragon',
      minXp: 1000,
      nextXp: 1500,
      title: 'Flame Keeper',
      badge: 'EMBER',
      image: '/img/dragon/dragon-stage-4.jpg',
      quote: 'We soar above the clouds! Grammar and vocabulary obey your command.',
    },
    {
      stage: 5,
      name: 'Astral Dragon',
      minXp: 1500,
      nextXp: 2500,
      title: 'Sky Guardian',
      badge: 'ASTRAL',
      image: '/img/dragon/dragon-stage-5.jpg',
      quote: 'Ancient runes awaken! Your English resonates through the cosmos.',
    },
    {
      stage: 6,
      name: 'Celestial Sovereign',
      minXp: 2500,
      nextXp: 5000,
      title: 'Grand Drake Archon',
      badge: 'CELESTIAL',
      image: '/img/dragon/dragon-stage-6.jpg',
      quote: 'Ultimate mastery attained! You speak with the authority of the dragon kings.',
    },
  ];

  function getImage(stage = 2) {
    const s = typeof stage === 'object' ? stage.stage : Number(stage) || 2;
    const clamped = Math.min(6, Math.max(1, s));
    return `/img/dragon/dragon-stage-${clamped}.jpg`;
  }

  function getEvolutionByXp(xp = 0) {
    let current = EVOLUTIONS[0];
    for (const evo of EVOLUTIONS) {
      if (xp >= evo.minXp) current = evo;
    }
    const nextEvo = EVOLUTIONS.find((e) => e.stage === current.stage + 1) || null;
    const stageMin = current.minXp;
    const stageTarget = nextEvo ? nextEvo.minXp : current.nextXp;
    const stageRange = Math.max(1, stageTarget - stageMin);
    const stageProgress = Math.min(100, Math.round(((xp - stageMin) / stageRange) * 100));

    return {
      ...current,
      currentXp: xp,
      xpToNext: nextEvo ? Math.max(0, nextEvo.minXp - xp) : 0,
      nextStageName: nextEvo ? nextEvo.name : 'Max Mastery',
      percentToNext: stageProgress,
      image: getImage(current.stage),
    };
  }

  /**
   * Render real dragon illustration in various presentation modes:
   * - 'hero': large widescreen showcase with glowing runes, halo ring, and starlight breath
   * - 'avatar': circular framed portal for buttons, profiles, and badges
   * - 'card': presentation card for evolution progression grid
   */
  function renderArt(stage = 2, options = {}) {
    const stageNum = typeof stage === 'object' ? stage.stage : Number(stage) || 2;
    const s = Math.min(6, Math.max(1, stageNum));
    const evo = EVOLUTIONS.find((e) => e.stage === s) || EVOLUTIONS[1];
    const mode = options.mode || 'hero';
    const imgUrl = getImage(s);
    const className = options.className || '';
    const mood = options.mood || 'idle';
    const showFlame = options.showFlame !== false;

    if (mode === 'avatar') {
      const size = options.size || 68;
      return `
        <div class="dragon-art-avatar stage-${s} mood-${mood} ${className}" style="width:${size}px;height:${size}px;" title="${evo.name} (${evo.title})">
          <img src="${imgUrl}" alt="${evo.name}" class="dragon-avatar-photo" />
          <div class="dragon-avatar-aura-ring"></div>
        </div>
      `;
    }

    if (mode === 'card') {
      const isUnlocked = options.isUnlocked !== false;
      const isCurrent = !!options.isCurrent;
      return `
        <div class="dragon-art-card stage-${s} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''} ${className}">
          <div class="dragon-card-photo-wrap">
            <img src="${imgUrl}" alt="${evo.name}" class="dragon-card-photo" loading="lazy" />
            <div class="dragon-card-gradient-overlay"></div>
            ${isCurrent ? '<span class="dragon-card-current-tag">★ Current Form</span>' : ''}
            <span class="dragon-card-stage-pill">Stage ${s}</span>
          </div>
          <div class="dragon-card-details">
            <div class="dragon-card-name">${evo.name}</div>
            <div class="dragon-card-title">${evo.title}</div>
            <div class="dragon-card-xp-req ${isCurrent ? 'active' : isUnlocked ? 'unlocked' : 'locked'}">
              ${isCurrent ? 'Active Companion' : isUnlocked ? '✓ Unlocked' : `${evo.minXp} XP Required`}
            </div>
          </div>
        </div>
      `;
    }

    // Default 'hero' widescreen presentation
    const maxWidth = options.maxWidth || '340px';
    return `
      <div class="dragon-art-hero stage-${s} mood-${mood} ${className}" style="max-width:${maxWidth};" id="${options.id || ''}">
        <div class="dragon-hero-frame">
          <div class="dragon-runic-halo"></div>
          <img src="${imgUrl}" alt="${evo.name}" class="dragon-hero-photo" />
          <div class="dragon-hero-flame-glow"></div>
          ${showFlame ? '<div class="dragon-animated-flame-stars"></div>' : ''}
        </div>
        <div class="dragon-hero-label-tag">
          <span class="dragon-hero-stage-badge">Level ${s}</span>
          <span class="dragon-hero-form-name">${evo.name}</span>
        </div>
      </div>
    `;
  }

  /**
   * Generates high-fidelity SVG illustration (backward compatibility fallback)
   */
  function renderSVG(stage = 2, mood = 'idle', size = 180, className = '') {
    const stageNum = typeof stage === 'object' ? stage.stage : Number(stage) || 2;
    const safeMood = ['idle', 'happy', 'thinking', 'excited', 'sleeping', 'encouraging', 'victory'].includes(mood) ? mood : 'idle';
    const s = size;
    const gradId = `dragonGrad_${stageNum}_${safeMood}`;
    const auraId = `dragonAura_${stageNum}_${safeMood}`;

    let primaryGrad = '<stop offset="0%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#3B82F6"/>';
    let wingGrad = '<stop offset="0%" stop-color="#C084FC"/><stop offset="100%" stop-color="#6366F1"/>';
    let eyeColor = '#38BDF8';
    let flameColor = '#F59E0B';
    let hornColor = '#FBBF24';

    if (stageNum === 1) {
      primaryGrad = '<stop offset="0%" stop-color="#4F46E5"/><stop offset="60%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#1E1B4B"/>';
      flameColor = '#A78BFA';
      hornColor = '#F59E0B';
    } else if (stageNum === 2) {
      primaryGrad = '<stop offset="0%" stop-color="#818CF8"/><stop offset="100%" stop-color="#4338CA"/>';
      wingGrad = '<stop offset="0%" stop-color="#A5B4FC"/><stop offset="100%" stop-color="#4F46E5"/>';
      eyeColor = '#38BDF8';
    } else if (stageNum === 3) {
      primaryGrad = '<stop offset="0%" stop-color="#6366F1"/><stop offset="100%" stop-color="#312E81"/>';
      wingGrad = '<stop offset="0%" stop-color="#818CF8"/><stop offset="100%" stop-color="#4338CA"/>';
      eyeColor = '#34D399';
    } else if (stageNum === 4) {
      primaryGrad = '<stop offset="0%" stop-color="#F97316"/><stop offset="100%" stop-color="#991B1B"/>';
      wingGrad = '<stop offset="0%" stop-color="#FBBF24"/><stop offset="100%" stop-color="#B91C1C"/>';
      eyeColor = '#FDE047';
      flameColor = '#EF4444';
      hornColor = '#F59E0B';
    } else if (stageNum === 5) {
      primaryGrad = '<stop offset="0%" stop-color="#10B981"/><stop offset="60%" stop-color="#047857"/><stop offset="100%" stop-color="#064E3B"/>';
      wingGrad = '<stop offset="0%" stop-color="#34D399"/><stop offset="100%" stop-color="#059669"/>';
      eyeColor = '#67E8F9';
      flameColor = '#10B981';
      hornColor = '#E2E8F0';
    } else if (stageNum >= 6) {
      primaryGrad = '<stop offset="0%" stop-color="#F59E0B"/><stop offset="50%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#312E81"/>';
      wingGrad = '<stop offset="0%" stop-color="#FDE047"/><stop offset="100%" stop-color="#7C3AED"/>';
      eyeColor = '#FDE047';
      flameColor = '#F59E0B';
      hornColor = '#FEF08A';
    }

    let eyeShape = `<ellipse cx="106" cy="85" rx="5" ry="6" fill="${eyeColor}" class="dragon-eye" /><circle cx="107.5" cy="83.5" r="2" fill="#FFFFFF"/>`;
    let mouthPath = 'M 108 98 Q 116 102 122 96';

    if (stageNum === 1) {
      return `
      <svg class="dragon-mascot dragon-stage-1 mood-${safeMood} ${className}" viewBox="0 0 200 200" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">${primaryGrad}</linearGradient>
          <radialGradient id="${auraId}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${flameColor}" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="${flameColor}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="115" r="70" fill="url(#${auraId})" class="dragon-aura-pulse" />
        <ellipse cx="100" cy="170" rx="55" ry="12" fill="rgba(10,14,26,0.35)" />
        <path d="M 100 35 C 135 35 155 75 155 125 C 155 160 132 172 100 172 C 68 172 45 160 45 125 C 45 75 65 35 100 35 Z" fill="url(#${gradId})" stroke="rgba(255,255,255,0.2)" stroke-width="2.5" class="dragon-egg-shell"/>
        <path d="M 95 65 L 108 85 L 98 102 L 115 120 L 102 142" stroke="${hornColor}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" class="dragon-egg-crack" />
        <circle cx="106" cy="98" r="4.5" fill="${flameColor}" class="dragon-egg-glow-core" />
      </svg>`;
    }

    const wingSpan = stageNum >= 5 ? 180 : stageNum >= 4 ? 160 : stageNum === 3 ? 140 : 120;
    return `
    <svg class="dragon-mascot dragon-stage-${stageNum} mood-${safeMood} ${className}" viewBox="0 0 200 200" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">${primaryGrad}</linearGradient>
        <linearGradient id="${gradId}_wing" x1="0%" y1="0%" x2="100%" y2="100%">${wingGrad}</linearGradient>
        <radialGradient id="${auraId}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${flameColor}" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="${flameColor}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="115" r="75" fill="url(#${auraId})" class="dragon-aura-pulse" />
      <ellipse cx="100" cy="178" rx="55" ry="10" fill="rgba(10,14,26,0.35)" />
      <g class="dragon-wing dragon-wing-left">
        <path d="M 68 105 Q ${100 - wingSpan * 0.4} 60 52 42 Q 62 65 58 85 Q 68 95 68 105 Z" fill="url(#${gradId}_wing)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
      </g>
      <path d="M 60 148 Q 30 160 22 142 Q 18 128 32 132 Q 45 136 65 142" fill="url(#${gradId})" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" class="dragon-tail" />
      <path d="M 72 110 C 65 135 70 165 95 168 C 125 170 135 145 130 115 C 125 90 95 88 72 110 Z" fill="url(#${gradId})" stroke="rgba(255,255,255,0.2)" stroke-width="2" class="dragon-torso"/>
      <g class="dragon-head-group">
        <path d="M 85 68 Q 65 40 60 30 Q 75 48 88 62" fill="${hornColor}" class="dragon-horn" />
        <path d="M 108 62 Q 115 35 125 22 Q 120 45 115 58" fill="${hornColor}" class="dragon-horn" />
        <path d="M 78 72 C 78 55 102 50 118 62 C 132 72 135 85 128 102 C 120 115 95 112 85 98 C 78 88 78 78 78 72 Z" fill="url(#${gradId})" stroke="rgba(255,255,255,0.2)" stroke-width="2" class="dragon-head"/>
        <path d="M 112 85 Q 134 90 128 102 Q 116 108 108 102 Z" fill="url(#${gradId})" />
        ${eyeShape}
        <path d="${mouthPath}" stroke="rgba(15,23,42,0.65)" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>
      <g class="dragon-wing dragon-wing-right">
        <path d="M 110 112 Q ${110 + wingSpan * 0.42} 65 148 48 Q 135 72 142 92 Q 130 102 110 112 Z" fill="url(#${gradId}_wing)" stroke="rgba(255,255,255,0.22)" stroke-width="2" />
      </g>
      <ellipse cx="85" cy="165" rx="8" ry="6" fill="url(#${gradId})" />
      <ellipse cx="115" cy="165" rx="9" ry="6" fill="url(#${gradId})" />
    </svg>`;
  }

  const MOTIVATIONAL_MESSAGES = [
    'Every mistake is a spark of wisdom! Keep breathing fire into your English.',
    'Your accent is unique — clarity, rhythm, and confidence are your true dragon wings!',
    'Small daily practice builds mighty linguistic flames. Let’s train today!',
    'Hear that? Your pronunciation is growing sharper with every single drill!',
    'Mastering English is a grand adventure. I am right by your side, Dragon Rider.',
    'Five minutes of vocal practice today keeps hesitation at bay!',
    'Feed your dragon with new vocabulary! The 7 Kingdoms await your voice.',
  ];

  function getRandomQuote() {
    return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
  }

  /**
   * Floating interactive companion widget
   */
  let floatingEl = null;
  let bubbleTimeout = null;

  function initFloatingCompanion(user) {
    if (floatingEl) floatingEl.remove();
    if (!user || user.role !== 'student') return;

    const evo = getEvolutionByXp(user.xp || 0);

    const wrap = document.createElement('div');
    wrap.id = 'dragon-floating-companion';
    wrap.className = 'dragon-floating-wrap';
    wrap.setAttribute('aria-label', 'Your Dragon Companion');
    wrap.innerHTML = `
      <div class="dragon-speech-bubble" id="dragon-bubble" style="display:none">
        <div class="dragon-bubble-text" id="dragon-bubble-text">Greetings, Dragon Rider! Ready for today’s quest?</div>
        <div class="dragon-bubble-arrow"></div>
      </div>
      <div class="dragon-avatar-btn" id="dragon-avatar-btn" title="Click to interact with your Dragon Companion">
        <div class="dragon-avatar-portal">
          <img src="${getImage(evo.stage)}" alt="${evo.name}" class="dragon-avatar-img" />
          <div class="dragon-avatar-flame-ring"></div>
        </div>
        <span class="dragon-level-badge">${evo.stage}</span>
        <span class="dragon-glow-ring"></span>
      </div>
    `;

    document.body.appendChild(wrap);
    floatingEl = wrap;

    const btn = wrap.querySelector('#dragon-avatar-btn');
    const bubble = wrap.querySelector('#dragon-bubble');
    const bubbleText = wrap.querySelector('#dragon-bubble-text');
    const avatarPortal = wrap.querySelector('.dragon-avatar-portal');

    btn.onclick = (e) => {
      e.stopPropagation();

      // Trigger breathing flame animation
      avatarPortal.classList.add('breathe-flame');
      setTimeout(() => avatarPortal.classList.remove('breathe-flame'), 1400);

      const msg = getRandomQuote();
      bubbleText.textContent = msg;
      bubble.style.display = 'block';
      bubble.classList.remove('fade-out');

      if (window.SpeechOutput && window.SpeechOutput.speak) {
        try {
          window.SpeechOutput.speak(msg.slice(0, 85));
        } catch (e) {}
      }

      clearTimeout(bubbleTimeout);
      bubbleTimeout = setTimeout(() => {
        bubble.classList.add('fade-out');
        setTimeout(() => {
          bubble.style.display = 'none';
        }, 350);
      }, 5500);
    };

    // Initial greeting after 3 seconds on load
    setTimeout(() => {
      if (document.body.contains(wrap)) {
        bubble.style.display = 'block';
        bubbleText.textContent = `Welcome, ${user.name ? user.name.split(' ')[0] : 'Rider'}! Ready to awaken your dragon flame?`;
        bubbleTimeout = setTimeout(() => {
          bubble.classList.add('fade-out');
          setTimeout(() => {
            bubble.style.display = 'none';
          }, 350);
        }, 6000);
      }
    }, 2800);
  }

  function say(message, mood = 'happy') {
    if (!floatingEl) return;
    const bubble = floatingEl.querySelector('#dragon-bubble');
    const bubbleText = floatingEl.querySelector('#dragon-bubble-text');
    const avatarPortal = floatingEl.querySelector('.dragon-avatar-portal');
    if (!bubble || !bubbleText) return;

    bubbleText.textContent = message;
    bubble.style.display = 'block';
    bubble.classList.remove('fade-out');

    if (avatarPortal) {
      avatarPortal.classList.add('breathe-flame');
      setTimeout(() => avatarPortal.classList.remove('breathe-flame'), 1400);
    }

    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
      bubble.classList.add('fade-out');
      setTimeout(() => {
        bubble.style.display = 'none';
      }, 350);
    }, 5500);
  }

  /**
   * Helper function to escape HTML
   */
  function esc(s) {
    return (s || '')
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Particle burst animation engine for Task Completion Celebration
   */
  function initCelebrationParticles(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || window.innerWidth;
    canvas.height = rect.height || window.innerHeight;

    const colors = ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#FDE047', '#FEF08A'];
    const particles = [];
    const count = 75;

    // Center burst origin (where dragon flame expands)
    const originX = canvas.width / 2;
    const originY = canvas.height * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      particles.push({
        x: originX + (Math.random() - 0.5) * 60,
        y: originY + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.012 + 0.008,
        isStar: Math.random() > 0.4,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.1,
      });
    }

    let animId = null;
    let frame = 0;

    function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
    }

    function renderLoop() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (let p of particles) {
        if (p.alpha <= 0) continue;
        alive++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // subtle gravity
        p.alpha -= p.decay;
        p.rot += p.rotSpeed;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        if (p.isStar) {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          drawStar(0, 0, 5, p.size * 1.5, p.size * 0.6);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (alive > 0 && frame < 320) {
        animId = requestAnimationFrame(renderLoop);
      }
    }

    renderLoop();
  }

  /**
   * TASK COMPLETION CELEBRATION ANIMATION
   * Triggers a cinematic full-screen celebratory modal with the dragon exhaling an animated
   * cosmic starlight rainbow flame, floating particles, and XP burst!
   */
  function celebrate(config = {}) {
    const {
      title = 'Task Completed!',
      xp = 20,
      message = 'Your linguistic fire burns brighter! Keep up the brilliant momentum.',
      stage = (window.S && window.S.user ? getEvolutionByXp(window.S.user.xp || 0).stage : 2),
      buttonText = 'Continue Training',
      onDismiss = null,
      autoDismissMs = 0,
    } = config;

    const s = Math.min(6, Math.max(1, Number(stage) || 2));
    const evo = EVOLUTIONS.find((e) => e.stage === s) || EVOLUTIONS[1];
    const imgUrl = getImage(s);

    const existing = document.getElementById('dragon-celebration-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dragon-celebration-overlay';
    overlay.className = 'dragon-celebration-overlay active';
    overlay.innerHTML = `
      <div class="dragon-celebration-modal">
        <canvas id="celebration-particles-canvas" class="celebration-particles-canvas"></canvas>
        <button class="celebration-close-x" id="celebration-close-btn" aria-label="Close celebration">&times;</button>

        <div class="celebration-content">
          <div class="celebration-badge-pill">
            <span class="sparkle-icon">✨</span>
            <span class="badge-text">QUEST VERIFIED & COMPLETED</span>
            <span class="sparkle-icon">✨</span>
          </div>

          <h2 class="celebration-heading">${esc(title)}</h2>

          <!-- The Real Dragon Art with Expanding Animated Starlight Cosmic Flame -->
          <div class="celebration-dragon-display stage-${s}">
            <div class="celebration-dragon-halo"></div>
            <div class="celebration-flame-breath-aura"></div>
            <img src="${imgUrl}" alt="${evo.name}" class="celebration-dragon-img" />
            <div class="celebration-starlight-vortex"></div>
          </div>

          <!-- XP Burst Badge -->
          ${
            xp > 0
              ? `
            <div class="celebration-xp-pill">
              <span class="xp-icon">⚡</span>
              <span class="xp-text">+${xp} Dragon Power XP</span>
            </div>
          `
              : ''
          }

          <p class="celebration-message">
            "${esc(message)}"
          </p>
          <div class="celebration-ignis-tag">— Ignis, Dragon Mentor</div>

          <div class="celebration-actions">
            <button class="btn-dragon-celebrate" id="celebration-action-btn">
              <span>🔥</span> ${esc(buttonText)}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Audio / Speech celebration
    if (window.SpeechOutput && window.SpeechOutput.speak) {
      try {
        const spoken = xp > 0 ? `Dragon flame stoked! Plus ${xp} XP!` : 'Glorious victory, Dragon Rider!';
        window.SpeechOutput.speak(spoken);
      } catch (e) {}
    }

    // Launch celebratory particle confetti
    const canvas = overlay.querySelector('#celebration-particles-canvas');
    initCelebrationParticles(canvas);

    function dismiss() {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof onDismiss === 'function') onDismiss();
      }, 350);
    }

    overlay.querySelector('#celebration-close-btn').onclick = dismiss;
    overlay.querySelector('#celebration-action-btn').onclick = dismiss;
    overlay.onclick = (e) => {
      if (e.target === overlay) dismiss();
    };

    if (autoDismissMs > 0) {
      setTimeout(dismiss, autoDismissMs);
    }
  }

  window.DragonMascot = {
    EVOLUTIONS,
    getImage,
    getEvolutionByXp,
    renderArt,
    renderSVG,
    initFloatingCompanion,
    celebrate,
    say,
    getRandomQuote,
  };
})(window);
