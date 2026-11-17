/* ==========================================================================
   Dragon Academy — Central Dragon Companion & Mascot Component (DragonMascot)
   Theme: Train Your Mind. Awaken Your Dragon. Master English.
   Stack: Vanilla JS (ES6+), HTML5, CSS3. Zero frameworks.
   ========================================================================== */

(function (window) {
  'use strict';

  /* ===== 1. DRAGON EVOLUTIONS & PROGRESSION METRICS ===== */
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
      biome: 'Grammar Castle',
      element: 'Primal Spark',
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
      biome: 'Vocabulary Forest',
      element: 'Starlight Fire',
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
      biome: 'Speaking Volcano',
      element: 'Magma Crest',
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
      biome: 'Listening Ocean',
      element: 'Runic Inferno',
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
      biome: 'Reading Grimoires',
      element: 'Cosmic Constellation',
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
      biome: 'World Stage Arena',
      element: 'Eternal Celestial Aurora',
    },
  ];

  function getImage(stage = 2) {
    const s = typeof stage === 'object' ? stage.stage : Number(stage) || 2;
    const clamped = Math.min(6, Math.max(1, s));
    return `/img/dragon/dragon-stage-${clamped}.jpg`;
  }

  function getEvolutionByXp(xp = 0) {
    const safeXp = Math.max(0, Number(xp) || 0);
    let current = EVOLUTIONS[0];
    for (const evo of EVOLUTIONS) {
      if (safeXp >= evo.minXp) current = evo;
    }
    const nextEvo = EVOLUTIONS.find((e) => e.stage === current.stage + 1) || null;
    const stageMin = current.minXp;
    const stageTarget = nextEvo ? nextEvo.minXp : current.nextXp;
    const stageRange = Math.max(1, stageTarget - stageMin);
    const stageProgress = Math.min(100, Math.round(((safeXp - stageMin) / stageRange) * 100));

    return {
      ...current,
      currentXp: safeXp,
      xpToNext: nextEvo ? Math.max(0, nextEvo.minXp - safeXp) : 0,
      nextStageName: nextEvo ? nextEvo.name : 'Max Mastery',
      percentToNext: stageProgress,
      image: getImage(current.stage),
    };
  }

  function esc(s) {
    return (s || '')
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ===== 2. WEB AUDIO SYNTHESIZER (UI CHIMES & SOUND FX) ===== */
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function isSoundEnabled() {
    return localStorage.getItem('lingrow_sfx_enabled') === 'true';
  }

  function toggleSound(force) {
    const current = isSoundEnabled();
    const next = force !== undefined ? !!force : !current;
    localStorage.setItem('lingrow_sfx_enabled', next ? 'true' : 'false');
    if (next) {
      playChime('correct');
    }
    window.dispatchEvent(new CustomEvent('lingrow:sound_toggled', { detail: { enabled: next } }));
    return next;
  }

  function playTone(freq, type = 'sine', startTime = 0, duration = 0.25, gainVal = 0.12) {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, ctx.currentTime + startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration + 0.05);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playChime(chimeType = 'victory') {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (chimeType === 'victory') {
      // Triumphant pentatonic arpeggio (C5, E5, G5, C6)
      playTone(523.25, 'triangle', 0.0, 0.22, 0.14);
      playTone(659.25, 'triangle', 0.1, 0.24, 0.14);
      playTone(783.99, 'triangle', 0.2, 0.28, 0.16);
      playTone(1046.5, 'sine', 0.32, 0.55, 0.20);
    } else if (chimeType === 'rekindle') {
      // Soft gentle minor cadence (E4, G4)
      playTone(329.63, 'sine', 0.0, 0.35, 0.12);
      playTone(392.00, 'sine', 0.14, 0.45, 0.10);
    } else if (chimeType === 'evolution') {
      // Fanfare arpeggio with rich harmonics
      playTone(261.63, 'triangle', 0.0, 0.3, 0.15);
      playTone(392.00, 'triangle', 0.12, 0.3, 0.15);
      playTone(523.25, 'triangle', 0.24, 0.3, 0.18);
      playTone(659.25, 'triangle', 0.36, 0.35, 0.18);
      playTone(783.99, 'triangle', 0.48, 0.4, 0.20);
      playTone(1046.5, 'sine', 0.62, 0.8, 0.25);
    } else if (chimeType === 'correct') {
      // Crisp 2-tone ping
      playTone(880.0, 'sine', 0.0, 0.16, 0.12);
      playTone(1318.5, 'sine', 0.08, 0.28, 0.14);
    } else if (chimeType === 'click') {
      // Subtle parchment tap
      playTone(1200, 'sine', 0.0, 0.04, 0.05);
    }
  }

  /* ===== 3. OBJECT-POOLED 60 FPS PARTICLE ENGINE ===== */
  const POOL_CAPACITY = 150;
  const particlePool = [];
  for (let i = 0; i < POOL_CAPACITY; i++) {
    particlePool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      color: '#FFFFFF',
      alpha: 0,
      decay: 0,
      isStar: false,
      rot: 0,
      rotSpeed: 0,
      flickerOffset: 0,
    });
  }

  let activeParticleSystem = null;

  // Visibility handler to automatically pause particle loops when the tab is hidden
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!activeParticleSystem) return;
      if (document.hidden) {
        if (activeParticleSystem.animId) {
          cancelAnimationFrame(activeParticleSystem.animId);
          activeParticleSystem.animId = null;
        }
      } else {
        if (!activeParticleSystem.animId && activeParticleSystem.running) {
          activeParticleSystem.animId = requestAnimationFrame(activeParticleSystem.loop);
        }
      }
    });
  }

  function startParticleEngine(canvas, mode = 'celebrate') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || window.innerWidth;
    canvas.height = rect.height || window.innerHeight;

    // Reset pool
    for (let i = 0; i < POOL_CAPACITY; i++) {
      particlePool[i].active = false;
    }

    const isCelebration = mode === 'celebrate' || mode === 'evolution';
    const count = isCelebration ? (mode === 'evolution' ? 140 : 100) : 70;
    const colors = isCelebration
      ? ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#38BDF8', '#10B981', '#FDE047', '#FEF08A']
      : ['#EF4444', '#F97316', '#F59E0B', '#DC2626', '#7C3AED', '#FEF08A'];

    const originX = canvas.width / 2;
    const originY = isCelebration ? canvas.height * 0.42 : canvas.height + 20;

    for (let i = 0; i < count; i++) {
      const p = particlePool[i];
      p.active = true;
      if (isCelebration) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2.5;
        p.x = originX + (Math.random() - 0.5) * 50;
        p.y = originY + (Math.random() - 0.5) * 50;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 2.0;
        p.size = Math.random() * 5 + 3;
        p.color = colors[i % colors.length];
        p.alpha = 1.0;
        p.decay = Math.random() * 0.012 + 0.007;
        p.isStar = Math.random() > 0.35;
        p.rot = Math.random() * Math.PI;
        p.rotSpeed = (Math.random() - 0.5) * 0.12;
      } else {
        // Embers mode: rising warm embers
        p.x = Math.random() * canvas.width;
        p.y = canvas.height + Math.random() * 60;
        p.vx = (Math.random() - 0.5) * 1.6;
        p.vy = -(Math.random() * 2.4 + 1.2);
        p.size = Math.random() * 4.5 + 2;
        p.color = colors[i % colors.length];
        p.alpha = Math.random() * 0.7 + 0.3;
        p.decay = 0.0035;
        p.isStar = false;
        p.rot = 0;
        p.rotSpeed = 0;
        p.flickerOffset = Math.random() * Math.PI * 2;
      }
    }

    let frame = 0;
    const maxFrames = isCelebration ? 340 : 380;

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

    const system = {
      animId: null,
      running: true,
      loop: null,
    };

    system.loop = function renderFrame() {
      if (!system.running) return;
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (let i = 0; i < count; i++) {
        const p = particlePool[i];
        if (!p.active) continue;

        if (isCelebration) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.085; // gentle gravity
          p.alpha -= p.decay;
          p.rot += p.rotSpeed;

          if (p.alpha <= 0) {
            p.active = false;
            continue;
          }
          alive++;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 9;

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
        } else {
          // Embers
          p.y += p.vy;
          p.x += p.vx + Math.sin(frame * 0.05 + p.flickerOffset) * 0.8;
          p.alpha -= p.decay;

          if (p.alpha <= 0 || p.y < -20) {
            if (frame < maxFrames - 60) {
              p.y = canvas.height + 10;
              p.x = Math.random() * canvas.width;
              p.alpha = Math.random() * 0.7 + 0.3;
            } else {
              p.active = false;
              continue;
            }
          }
          alive++;

          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (alive > 0 && frame < maxFrames) {
        system.animId = requestAnimationFrame(system.loop);
      } else {
        system.running = false;
        activeParticleSystem = null;
      }
    };

    activeParticleSystem = system;
    system.animId = requestAnimationFrame(system.loop);
  }

  /* ===== 4. XP COUNT-UP ANIMATOR ===== */
  function animateCountUp(element, start = 0, target = 20, durationMs = 1100) {
    if (!element) return;
    const startVal = Number(start) || 0;
    const targetVal = Number(target) || 0;
    const diff = targetVal - startVal;
    if (diff === 0) {
      element.textContent = `+${targetVal} Dragon Power XP`;
      return;
    }
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + diff * ease);
      element.textContent = `+${current} Dragon Power XP`;
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  /* ===== 5. REUSABLE DRAGON ARTWORK PRESENTATION ===== */
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
        <div class="dragon-art-avatar stage-${s} mood-${mood} ${className}" style="width:${size}px;height:${size}px;" title="${evo.name} (${evo.title})" data-stage="${s}">
          <img src="${imgUrl}" alt="${evo.name}" class="dragon-avatar-photo" />
          <div class="dragon-avatar-aura-ring"></div>
        </div>
      `;
    }

    if (mode === 'card') {
      const isUnlocked = options.isUnlocked !== false;
      const isCurrent = !!options.isCurrent;
      return `
        <div class="dragon-art-card stage-${s} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''} ${className}" data-stage="${s}">
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
            ${
              isUnlocked
                ? `<button class="dragon-card-cinematic-btn" data-cinematic-stage="${s}" title="Watch Awakening Cinematic" style="margin-top:8px;background:none;border:none;color:var(--color-flame);font-size:11.5px;cursor:pointer;font-weight:700">✨ View Cinematic</button>`
                : ''
            }
          </div>
        </div>
      `;
    }

    // Default 'hero' widescreen showcase
    const maxWidth = options.maxWidth || '340px';
    return `
      <div class="dragon-art-hero stage-${s} mood-${mood} ${className}" style="max-width:${maxWidth};" id="${options.id || ''}" data-stage="${s}">
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
   * SVG Fallback illustration (for legacy support)
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

  /* ===== 6. MENTOR QUOTES & REACTIVE MOOD MANAGEMENT ===== */
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

  let currentMood = 'idle';

  /**
   * Set dragon mood across active components:
   * moods: 'idle', 'happy', 'thinking', 'listening', 'celebrating', 'encouraging'
   */
  function setMood(mood = 'idle', targetEl = null) {
    const validMoods = ['idle', 'happy', 'thinking', 'listening', 'celebrating', 'encouraging'];
    const safeMood = validMoods.includes(mood) ? mood : 'idle';
    currentMood = safeMood;

    const elements = targetEl ? [targetEl] : document.querySelectorAll('.dragon-art-hero, .dragon-avatar-btn, .dragon-floating-wrap, .dragon-art-avatar');
    elements.forEach((el) => {
      validMoods.forEach((m) => el.classList.remove(`mood-${m}`));
      el.classList.add(`mood-${safeMood}`);
    });

    if (safeMood === 'happy') {
      playChime('correct');
    }
  }

  function getMood() {
    return currentMood;
  }

  // Hook SpeechInput microphone state automatically!
  if (typeof window !== 'undefined') {
    window.addEventListener('lingrow:recording', (e) => {
      const isListening = e.detail && e.detail.recording;
      setMood(isListening ? 'listening' : 'idle');
    });
  }

  /* ===== 7. FLOATING INTERACTIVE COMPANION ===== */
  let floatingEl = null;
  let bubbleTimeout = null;

  function initFloatingCompanion(user) {
    if (floatingEl) floatingEl.remove();
    if (!user || user.role !== 'student') return;

    const evo = getEvolutionByXp(user.xp || 0);

    const wrap = document.createElement('div');
    wrap.id = 'dragon-floating-companion';
    wrap.className = `dragon-floating-wrap mood-${currentMood}`;
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
        <span class="dragon-listening-pulse-ring"></span>
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

      if (isSoundEnabled()) {
        playChime('click');
        if (window.SpeechOutput && window.SpeechOutput.speak) {
          try {
            window.SpeechOutput.speak(msg.slice(0, 85));
          } catch (e) {}
        }
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

    setMood(mood);
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
        setMood('idle');
      }, 350);
    }, 5500);
  }

  /* ===== 8. TASK COMPLETION CELEBRATION ===== */
  function celebrate(config = {}) {
    if (config.failed || config.success === false || config.isFailure) {
      return encourage(config);
    }

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

    const existingCelebration = document.getElementById('dragon-celebration-overlay');
    if (existingCelebration) existingCelebration.remove();
    const existingFailure = document.getElementById('dragon-failure-overlay');
    if (existingFailure) existingFailure.remove();
    const existingCinematic = document.getElementById('dragon-evolution-cinematic');
    if (existingCinematic) existingCinematic.remove();

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

          <!-- Animated XP Burst Badge -->
          ${
            xp > 0
              ? `
            <div class="celebration-xp-pill">
              <span class="xp-icon">⚡</span>
              <span class="xp-text" id="celebration-xp-text">+0 Dragon Power XP</span>
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
    setMood('celebrating');

    // Synthesized victory chime
    playChime('victory');

    // Audio / Speech celebration (only if enabled)
    if (isSoundEnabled() && window.SpeechOutput && window.SpeechOutput.speak) {
      try {
        const spoken = xp > 0 ? `Dragon flame stoked! Plus ${xp} XP!` : 'Glorious victory, Dragon Rider!';
        window.SpeechOutput.speak(spoken);
      } catch (e) {}
    }

    // Launch pooled celebratory particle confetti
    const canvas = overlay.querySelector('#celebration-particles-canvas');
    startParticleEngine(canvas, 'celebrate');

    // Staged XP count-up animation
    const xpTextEl = overlay.querySelector('#celebration-xp-text');
    if (xpTextEl && xp > 0) {
      setTimeout(() => {
        animateCountUp(xpTextEl, 0, xp, 1100);
      }, 200);
    }

    function dismiss() {
      overlay.classList.add('fade-out');
      setMood('idle');
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

  /* ===== 9. TASK FAILURE & REKINDLE ENCOURAGEMENT ===== */
  function encourage(config = {}) {
    const {
      title = 'Trial Unresolved!',
      message = 'Every dragon falters before soaring high. Rekindle your flame and try again!',
      tip = '',
      stage = (window.S && window.S.user ? getEvolutionByXp(window.S.user.xp || 0).stage : 2),
      buttonText = '🔥 Rekindle Flame & Retry',
      secondaryText = 'Return to Training',
      onRetry = null,
      onDismiss = null,
      autoDismissMs = 0,
    } = config;

    const s = Math.min(6, Math.max(1, Number(stage) || 2));
    const evo = EVOLUTIONS.find((e) => e.stage === s) || EVOLUTIONS[1];
    const imgUrl = getImage(s);

    const existingCelebration = document.getElementById('dragon-celebration-overlay');
    if (existingCelebration) existingCelebration.remove();
    const existingFailure = document.getElementById('dragon-failure-overlay');
    if (existingFailure) existingFailure.remove();
    const existingCinematic = document.getElementById('dragon-evolution-cinematic');
    if (existingCinematic) existingCinematic.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dragon-failure-overlay';
    overlay.className = 'dragon-failure-overlay active';
    overlay.innerHTML = `
      <div class="dragon-failure-modal">
        <canvas id="failure-embers-canvas" class="failure-embers-canvas"></canvas>
        <button class="celebration-close-x" id="failure-close-btn" aria-label="Close dialog">&times;</button>

        <div class="failure-content">
          <div class="failure-badge-pill">
            <span class="ember-spark">🔥</span>
            <span class="badge-text">REKINDLE YOUR FLAME &bull; KEEP FIGHTING</span>
            <span class="ember-spark">🔥</span>
          </div>

          <h2 class="failure-heading">${esc(title)}</h2>

          <!-- The Real Dragon Art with Rekindling Ember Flame & Smoke Animation -->
          <div class="failure-dragon-display stage-${s}">
            <div class="failure-flame-rekindle-aura"></div>
            <img src="${imgUrl}" alt="${evo.name}" class="failure-dragon-img" />
            <div class="failure-smoke-overlay"></div>
          </div>

          <p class="failure-message">
            "${esc(message)}"
          </p>

          ${
            tip
              ? `
            <div class="failure-tip-box">
              <span class="tip-icon">💡</span>
              <div class="tip-text"><b>Dragon Mentor Tip:</b> ${esc(tip)}</div>
            </div>
          `
              : ''
          }

          <div class="celebration-ignis-tag" style="color:#F97316;margin-bottom:16px">— Ignis, Dragon Mentor</div>

          <div class="failure-actions">
            <button class="btn-dragon-rekindle" id="failure-retry-btn">
              <span>🔥</span> ${esc(buttonText)}
            </button>
            ${
              secondaryText
                ? `
              <button class="btn-dragon-secondary" id="failure-dismiss-btn" style="margin-top:8px">
                ${esc(secondaryText)}
              </button>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setMood('encouraging');

    // Synthesized soft rekindle chime
    playChime('rekindle');

    // Audio / Speech encouragement (only if enabled)
    if (isSoundEnabled() && window.SpeechOutput && window.SpeechOutput.speak) {
      try {
        window.SpeechOutput.speak('Do not despair, Dragon Rider! Rekindle your flame and try again!');
      } catch (e) {}
    }

    // Launch pooled rising ember particle effect
    const canvas = overlay.querySelector('#failure-embers-canvas');
    startParticleEngine(canvas, 'embers');

    function dismiss(isRetry = false) {
      overlay.classList.add('fade-out');
      setMood('idle');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (isRetry && typeof onRetry === 'function') {
          onRetry();
        } else if (!isRetry && typeof onDismiss === 'function') {
          onDismiss();
        }
      }, 350);
    }

    overlay.querySelector('#failure-close-btn').onclick = () => dismiss(false);
    overlay.querySelector('#failure-retry-btn').onclick = () => dismiss(true);
    const dismissBtn = overlay.querySelector('#failure-dismiss-btn');
    if (dismissBtn) {
      dismissBtn.onclick = () => dismiss(false);
    }
    overlay.onclick = (e) => {
      if (e.target === overlay) dismiss(false);
    };

    if (autoDismissMs > 0) {
      setTimeout(() => dismiss(false), autoDismissMs);
    }
  }

  /* ===== 10. EVOLUTION CINEMATIC SEQUENCE ===== */
  /**
   * Triggers a cinematic full-screen evolution modal when XP crosses a stage threshold:
   * 1. Screen dims into celestial void.
   * 2. Energy gathering spiral converges.
   * 3. White-gold flash.
   * 4. New dragon form revealed with majestic title card & lore inscription.
   * 5. Star-fire confetti burst.
   * 6. Skippable via Esc or button; persisted in localStorage so it only plays once per stage automatically.
   */
  function playEvolutionCinematic(options = {}) {
    const stageNum = typeof options === 'number' ? options : options.stage || 2;
    const s = Math.min(6, Math.max(1, Number(stageNum) || 2));
    const evo = EVOLUTIONS.find((e) => e.stage === s) || EVOLUTIONS[1];
    const fromStage = options.fromStage || (s > 1 ? s - 1 : 1);
    const onComplete = options.onComplete || null;

    const existingCinematic = document.getElementById('dragon-evolution-cinematic');
    if (existingCinematic) existingCinematic.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dragon-evolution-cinematic';
    overlay.className = 'dragon-evolution-overlay active';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Dragon Metamorphosis: ${evo.name}`);

    overlay.innerHTML = `
      <div class="dragon-evolution-modal stage-${s}">
        <canvas id="evolution-particles-canvas" class="celebration-particles-canvas"></canvas>
        <div class="evolution-flash" id="evolution-flash"></div>
        <div class="evolution-energy-spiral"></div>

        <button class="evolution-skip-btn" id="evolution-skip-btn" title="Skip Cinematic (Escape)">
          Skip Cinematic <kbd>Esc</kbd>
        </button>

        <div class="evolution-content" id="evolution-content">
          <div class="evolution-badge-pill">
            <span class="sparkle-icon">✨</span>
            <span class="badge-text">CELESTIAL METAMORPHOSIS</span>
            <span class="sparkle-icon">✨</span>
          </div>

          <div class="evolution-stage-tag">STAGE ${s} UNLOCKED</div>
          <h1 class="evolution-title">${esc(evo.name)}</h1>
          <div class="evolution-subtitle">${esc(evo.title)} &bull; ${esc(evo.element)}</div>

          <!-- Huge Runic Illuminated Dragon Portal -->
          <div class="evolution-dragon-portal stage-${s}">
            <div class="evolution-halo-ring"></div>
            <div class="evolution-aura-pulse"></div>
            <img src="${getImage(s)}" alt="${esc(evo.name)}" class="evolution-dragon-img" />
          </div>

          <!-- Lore Parchment Inscription -->
          <div class="evolution-quote-card">
            <div class="evolution-quote-text">"${esc(evo.quote)}"</div>
            <div class="evolution-quote-author">— Ancient Inscription of ${esc(evo.biome)}</div>
          </div>

          <div class="evolution-actions">
            <button class="btn-dragon-celebrate" id="evolution-embrace-btn" style="min-width:240px">
              <span>🔥</span> Embrace Your Dragon Power
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Save to seen evolutions in localStorage
    try {
      const seenRaw = localStorage.getItem('lingrow_seen_evolutions') || '[]';
      const seen = JSON.parse(seenRaw);
      if (!seen.includes(s)) {
        seen.push(s);
        localStorage.setItem('lingrow_seen_evolutions', JSON.stringify(seen));
      }
    } catch (e) {}

    // Synthesized evolution fanfare
    playChime('evolution');

    if (isSoundEnabled() && window.SpeechOutput && window.SpeechOutput.speak) {
      try {
        window.SpeechOutput.speak(`Behold, Dragon Rider! Your companion has evolved into ${evo.name}!`);
      } catch (e) {}
    }

    // Launch pooled celebratory star-fire particles
    const canvas = overlay.querySelector('#evolution-particles-canvas');
    startParticleEngine(canvas, 'evolution');

    function dismissCinematic() {
      overlay.classList.add('fade-out');
      window.removeEventListener('keydown', handleKey);
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof onComplete === 'function') onComplete(s);
      }, 350);
    }

    function handleKey(e) {
      if (e.key === 'Escape') {
        dismissCinematic();
      }
    }
    window.addEventListener('keydown', handleKey);

    overlay.querySelector('#evolution-skip-btn').onclick = dismissCinematic;
    overlay.querySelector('#evolution-embrace-btn').onclick = dismissCinematic;
    overlay.onclick = (e) => {
      if (e.target === overlay) dismissCinematic();
    };
  }

  /**
   * Helper that compares old XP vs new XP and triggers evolution cinematic
   * if a new stage threshold was crossed!
   */
  function checkEvolution(oldXp = 0, newXp = 0) {
    const oldEvo = getEvolutionByXp(oldXp);
    const newEvo = getEvolutionByXp(newXp);

    if (newEvo.stage > oldEvo.stage) {
      try {
        const seenRaw = localStorage.getItem('lingrow_seen_evolutions') || '[]';
        const seen = JSON.parse(seenRaw);
        if (!seen.includes(newEvo.stage)) {
          playEvolutionCinematic({
            stage: newEvo.stage,
            fromStage: oldEvo.stage,
          });
          return true;
        }
      } catch (e) {
        playEvolutionCinematic({
          stage: newEvo.stage,
          fromStage: oldEvo.stage,
        });
        return true;
      }
    }
    return false;
  }

  /* ===== 11. GLOBAL API EXPORT ===== */
  window.DragonMascot = {
    EVOLUTIONS,
    getImage,
    getEvolutionByXp,
    renderArt,
    renderSVG,
    initFloatingCompanion,
    celebrate,
    encourage,
    failure: encourage,
    showFailure: encourage,
    say,
    getRandomQuote,
    // Phase 2 additions:
    setMood,
    getMood,
    playEvolutionCinematic,
    checkEvolution,
    playChime,
    toggleSound,
    isSoundEnabled,
    animateCountUp,
    startParticleEngine,
  };
})(window);
