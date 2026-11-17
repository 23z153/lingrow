/* ==========================================================================
   Dragon Academy — Central Dragon Companion & Mascot Component (DragonMascot)
   Theme: Train Your Mind. Awaken Your Dragon. Master English.
   ========================================================================== */

(function (window) {
  'use strict';

  const EVOLUTIONS = [
    { stage: 1, name: 'Dragon Egg', minXp: 0, nextXp: 250, title: 'Novice Hatchling', badge: 'EGG' },
    { stage: 2, name: 'Baby Dragon', minXp: 250, nextXp: 500, title: 'Curious Fledgling', badge: 'FLEDGLING' },
    { stage: 3, name: 'Young Dragon', minXp: 500, nextXp: 1000, title: 'Brave Apprentice', badge: 'APPRENTICE' },
    { stage: 4, name: 'Fire Dragon', minXp: 1000, nextXp: 1500, title: 'Flame Keeper', badge: 'WARRIOR' },
    { stage: 5, name: 'Ancient Dragon', minXp: 1500, nextXp: 2500, title: 'Sky Guardian', badge: 'SAGE' },
    { stage: 6, name: 'Legendary Dragon', minXp: 2500, nextXp: 5000, title: 'Grand Drake Archon', badge: 'LEGEND' },
  ];

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
    };
  }

  /**
   * Generates high-fidelity SVG illustration for a dragon stage and mood
   */
  function renderSVG(stage = 2, mood = 'idle', size = 180, className = '') {
    const stageNum = typeof stage === 'object' ? stage.stage : Number(stage) || 2;
    const safeMood = ['idle', 'happy', 'thinking', 'excited', 'sleeping', 'encouraging', 'victory'].includes(mood) ? mood : 'idle';
    const s = size;

    // Palette gradients
    const gradId = `dragonGrad_${stageNum}_${safeMood}`;
    const auraId = `dragonAura_${stageNum}_${safeMood}`;

    // Color tuning per stage
    let primaryGrad = '<stop offset="0%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#3B82F6"/>';
    let wingGrad = '<stop offset="0%" stop-color="#C084FC"/><stop offset="100%" stop-color="#6366F1"/>';
    let eyeColor = '#38BDF8';
    let flameColor = '#F59E0B';
    let hornColor = '#FBBF24';

    if (stageNum === 1) {
      // Dragon Egg
      primaryGrad = '<stop offset="0%" stop-color="#4F46E5"/><stop offset="60%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#1E1B4B"/>';
      flameColor = '#A78BFA';
      hornColor = '#F59E0B';
    } else if (stageNum === 2) {
      // Baby Dragon
      primaryGrad = '<stop offset="0%" stop-color="#818CF8"/><stop offset="100%" stop-color="#4338CA"/>';
      wingGrad = '<stop offset="0%" stop-color="#A5B4FC"/><stop offset="100%" stop-color="#4F46E5"/>';
      eyeColor = '#38BDF8';
    } else if (stageNum === 3) {
      // Young Dragon
      primaryGrad = '<stop offset="0%" stop-color="#6366F1"/><stop offset="100%" stop-color="#312E81"/>';
      wingGrad = '<stop offset="0%" stop-color="#818CF8"/><stop offset="100%" stop-color="#4338CA"/>';
      eyeColor = '#34D399';
    } else if (stageNum === 4) {
      // Fire Dragon
      primaryGrad = '<stop offset="0%" stop-color="#F97316"/><stop offset="100%" stop-color="#991B1B"/>';
      wingGrad = '<stop offset="0%" stop-color="#FBBF24"/><stop offset="100%" stop-color="#B91C1C"/>';
      eyeColor = '#FDE047';
      flameColor = '#EF4444';
      hornColor = '#F59E0B';
    } else if (stageNum === 5) {
      // Ancient Dragon
      primaryGrad = '<stop offset="0%" stop-color="#10B981"/><stop offset="60%" stop-color="#047857"/><stop offset="100%" stop-color="#064E3B"/>';
      wingGrad = '<stop offset="0%" stop-color="#34D399"/><stop offset="100%" stop-color="#059669"/>';
      eyeColor = '#67E8F9';
      flameColor = '#10B981';
      hornColor = '#E2E8F0';
    } else if (stageNum >= 6) {
      // Legendary Dragon
      primaryGrad = '<stop offset="0%" stop-color="#F59E0B"/><stop offset="50%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#312E81"/>';
      wingGrad = '<stop offset="0%" stop-color="#FDE047"/><stop offset="100%" stop-color="#7C3AED"/>';
      eyeColor = '#FDE047';
      flameColor = '#F59E0B';
      hornColor = '#FEF08A';
    }

    // Special mood overrides
    let eyeShape = `<ellipse cx="106" cy="85" rx="5" ry="6" fill="${eyeColor}" class="dragon-eye" /><circle cx="107.5" cy="83.5" r="2" fill="#FFFFFF"/>`;
    let mouthPath = 'M 108 98 Q 116 102 122 96';
    let extraSparks = '';
    let sleepingZzz = '';

    if (safeMood === 'sleeping') {
      eyeShape = `<path d="M 102 87 Q 106 91 110 87" stroke="${eyeColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
      mouthPath = 'M 108 97 Q 114 97 120 97';
      sleepingZzz = `
        <g class="dragon-zzz" style="opacity:0.85">
          <text x="135" y="60" fill="${flameColor}" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="14">Z</text>
          <text x="145" y="48" fill="${flameColor}" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="11">z</text>
          <text x="153" y="38" fill="${flameColor}" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="9">z</text>
        </g>`;
    } else if (safeMood === 'happy' || safeMood === 'excited') {
      eyeShape = `<path d="M 101 88 Q 106 82 111 88" stroke="${eyeColor}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="106" cy="86" rx="2" ry="2" fill="#FFFFFF"/>`;
      mouthPath = 'M 107 96 Q 115 106 123 96 Z';
      extraSparks = `
        <circle cx="140" cy="55" r="3" fill="${flameColor}" class="dragon-spark spark-1"/>
        <circle cx="70" cy="50" r="2.5" fill="#FDE047" class="dragon-spark spark-2"/>
        <circle cx="150" cy="110" r="2" fill="${flameColor}" class="dragon-spark spark-3"/>`;
    } else if (safeMood === 'thinking') {
      eyeShape = `<ellipse cx="106" cy="83" rx="4.5" ry="5" fill="${eyeColor}"/><circle cx="107" cy="81.5" r="1.5" fill="#FFFFFF"/>`;
      mouthPath = 'M 109 98 Q 115 97 121 99';
      extraSparks = `
        <g class="dragon-rune-orb" style="transform-origin: 135px 75px; animation: dragonRuneFloat 3s ease-in-out infinite;">
          <circle cx="135" cy="75" r="8" fill="url(#${auraId})" opacity="0.6"/>
          <circle cx="135" cy="75" r="4" fill="${hornColor}"/>
        </g>`;
    } else if (safeMood === 'victory') {
      mouthPath = 'M 106 95 Q 115 108 124 95 Z';
      extraSparks = `
        <polygon points="115,25 119,37 131,37 122,44 125,56 115,49 105,56 108,44 99,37 111,37" fill="#FBBF24" opacity="0.95" class="dragon-crown-star" />
        <circle cx="50" cy="40" r="3" fill="#F59E0B" class="dragon-spark spark-1"/>
        <circle cx="160" cy="40" r="3" fill="#F59E0B" class="dragon-spark spark-2"/>
        <circle cx="35" cy="90" r="2.5" fill="#38BDF8" class="dragon-spark spark-3"/>
        <circle cx="175" cy="90" r="2.5" fill="#38BDF8" class="dragon-spark spark-4"/>`;
    }

    // Stage 1 is the Mystical Dragon Egg
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
        <!-- Magical Ambient Glow -->
        <circle cx="100" cy="115" r="70" fill="url(#${auraId})" class="dragon-aura-pulse" />
        <ellipse cx="100" cy="170" rx="55" ry="12" fill="rgba(10,14,26,0.35)" />
        <!-- Egg Body -->
        <path d="M 100 35 C 135 35 155 75 155 125 C 155 160 132 172 100 172 C 68 172 45 160 45 125 C 45 75 65 35 100 35 Z" fill="url(#${gradId})" stroke="rgba(255,255,255,0.2)" stroke-width="2.5" class="dragon-egg-shell"/>
        <!-- Golden Rune Cracks with Inner Glow -->
        <path d="M 95 65 L 108 85 L 98 102 L 115 120 L 102 142" stroke="${hornColor}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" class="dragon-egg-crack" />
        <path d="M 108 85 L 122 80 L 132 94" stroke="${hornColor}" stroke-width="2" fill="none" stroke-linecap="round" class="dragon-egg-crack-branch" />
        <!-- Pulsing Dragon Eye glowing through crack -->
        <circle cx="106" cy="98" r="4.5" fill="${flameColor}" class="dragon-egg-glow-core" />
        <circle cx="107" cy="97" r="2" fill="#FFFFFF"/>
        <!-- Floating Sparks -->
        ${extraSparks}
        ${sleepingZzz}
      </svg>`;
    }

    // Full Dragon (Stages 2-6)
    const wingSpan = stageNum >= 5 ? 180 : stageNum >= 4 ? 160 : stageNum === 3 ? 140 : 120;
    const hornScale = stageNum >= 5 ? 1.3 : stageNum >= 4 ? 1.15 : stageNum === 3 ? 1.0 : 0.85;

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
      <!-- Shadow & Aura -->
      <circle cx="100" cy="115" r="75" fill="url(#${auraId})" class="dragon-aura-pulse" />
      <ellipse cx="100" cy="178" rx="55" ry="10" fill="rgba(10,14,26,0.35)" />

      <!-- Dragon Left Wing (Behind) -->
      <g class="dragon-wing dragon-wing-left">
        <path d="M 68 105 Q ${100 - wingSpan * 0.4} 60 52 42 Q 62 65 58 85 Q 68 95 68 105 Z" fill="url(#${gradId}_wing)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
      </g>

      <!-- Dragon Tail -->
      <path d="M 60 148 Q 30 160 22 142 Q 18 128 32 132 Q 45 136 65 142" fill="url(#${gradId})" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" class="dragon-tail" />
      <!-- Tail Flame -->
      <path d="M 22 142 Q 15 132 18 122 Q 26 128 28 138 Z" fill="${flameColor}" class="dragon-tail-flame" />

      <!-- Dragon Body & Chest -->
      <path d="M 72 110 C 65 135 70 165 95 168 C 125 170 135 145 130 115 C 125 90 95 88 72 110 Z" fill="url(#${gradId})" stroke="rgba(255,255,255,0.2)" stroke-width="2" class="dragon-torso"/>
      <!-- Chest Plates (Soft contrast) -->
      <path d="M 85 115 Q 102 115 115 118 Q 112 135 106 148 Q 98 158 88 152 Q 82 135 85 115 Z" fill="rgba(255,255,255,0.18)" />

      <!-- Dragon Head -->
      <g class="dragon-head-group">
        <!-- Dragon Horn Left -->
        <path d="M 85 68 Q 65 ${40 / hornScale} 60 ${30 / hornScale} Q 75 48 88 62" fill="${hornColor}" class="dragon-horn" />
        <!-- Dragon Horn Right (Primary) -->
        <path d="M 108 62 Q 115 ${35 / hornScale} 125 ${22 / hornScale} Q 120 45 115 58" fill="${hornColor}" class="dragon-horn" />

        <!-- Head Shape -->
        <path d="M 78 72 C 78 55 102 50 118 62 C 132 72 135 85 128 102 C 120 115 95 112 85 98 C 78 88 78 78 78 72 Z" fill="url(#${gradId})" stroke="rgba(255,255,255,0.2)" stroke-width="2" class="dragon-head"/>

        <!-- Snout -->
        <path d="M 112 85 Q 134 90 128 102 Q 116 108 108 102 Z" fill="url(#${gradId})" />
        <circle cx="124" cy="92" r="1.5" fill="rgba(15,23,42,0.4)" />

        <!-- Eye -->
        ${eyeShape}

        <!-- Mouth -->
        <path d="${mouthPath}" stroke="rgba(15,23,42,0.65)" stroke-width="2" fill="${mouthPath.includes('Z') ? '#EF4444' : 'none'}" stroke-linecap="round" />

        <!-- Crown / Spikes for Stages 4+ -->
        ${
          stageNum >= 4
            ? `<path d="M 76 65 L 72 58 L 80 62" stroke="${hornColor}" stroke-width="2" fill="${hornColor}" />
               <path d="M 92 56 L 90 48 L 97 54" stroke="${hornColor}" stroke-width="2" fill="${hornColor}" />`
            : ''
        }
      </g>

      <!-- Dragon Right Wing (Foreground) -->
      <g class="dragon-wing dragon-wing-right">
        <path d="M 110 112 Q ${110 + wingSpan * 0.42} 65 148 48 Q 135 72 142 92 Q 130 102 110 112 Z" fill="url(#${gradId}_wing)" stroke="rgba(255,255,255,0.22)" stroke-width="2" />
        <!-- Wing Ribs -->
        <path d="M 115 108 Q 132 80 148 48" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" fill="none"/>
      </g>

      <!-- Dragon Paws / Feet -->
      <ellipse cx="85" cy="165" rx="8" ry="6" fill="url(#${gradId})" />
      <ellipse cx="115" cy="165" rx="9" ry="6" fill="url(#${gradId})" />

      <!-- Floating Runes / Sparks / Sleep -->
      ${extraSparks}
      ${sleepingZzz}
    </svg>`;
  }

  /**
   * Dragon motivational quotes pool
   */
  const MOTIVATIONAL_MESSAGES = [
    'Every mistake is a spark of wisdom! Keep breathing fire into your English.',
    'Your accent is unique — clarity, rhythm, and confidence are your true dragon wings!',
    'Small daily practice builds mighty linguistic flames. Let’s train today!',
    'Hear that? Your pronunciation is growing sharper with every single drill!',
    'Mastering English is a grand adventure. I am right by your side, Dragon Rider.',
    'Five minutes of vocal practice today keeps hesitation at bay!',
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
        <div class="dragon-avatar-svg" id="dragon-floating-svg">
          ${renderSVG(evo.stage, 'idle', 68)}
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
    const svgWrap = wrap.querySelector('#dragon-floating-svg');

    let currentMood = 'idle';

    btn.onclick = (e) => {
      e.stopPropagation();
      const moods = ['happy', 'excited', 'thinking', 'encouraging', 'idle'];
      currentMood = moods[(moods.indexOf(currentMood) + 1) % moods.length];
      svgWrap.innerHTML = renderSVG(evo.stage, currentMood, 68);

      const msg = getRandomQuote();
      bubbleText.textContent = msg;
      bubble.style.display = 'block';
      bubble.classList.remove('fade-out');

      if (window.SpeechOutput && window.SpeechOutput.speak) {
        // Soft motivational voice line if enabled
        try {
          // Keep speech gentle and only speak short phrase
          window.SpeechOutput.speak(msg.slice(0, 80));
        } catch (e) {}
      }

      clearTimeout(bubbleTimeout);
      bubbleTimeout = setTimeout(() => {
        bubble.classList.add('fade-out');
        setTimeout(() => {
          bubble.style.display = 'none';
          currentMood = 'idle';
          svgWrap.innerHTML = renderSVG(evo.stage, 'idle', 68);
        }, 350);
      }, 5500);
    };

    // Initial greeting after 3 seconds on first load
    setTimeout(() => {
      if (document.body.contains(wrap)) {
        bubble.style.display = 'block';
        bubbleText.textContent = `Welcome, ${user.name ? user.name.split(' ')[0] : 'Rider'}! Ready to awaken your dragon flame?`;
        bubbleTimeout = setTimeout(() => {
          bubble.classList.add('fade-out');
          setTimeout(() => { bubble.style.display = 'none'; }, 350);
        }, 6000);
      }
    }, 2800);
  }

  function say(message, mood = 'happy') {
    if (!floatingEl) return;
    const bubble = floatingEl.querySelector('#dragon-bubble');
    const bubbleText = floatingEl.querySelector('#dragon-bubble-text');
    const svgWrap = floatingEl.querySelector('#dragon-floating-svg');
    if (!bubble || !bubbleText || !svgWrap) return;

    bubbleText.textContent = message;
    bubble.style.display = 'block';
    bubble.classList.remove('fade-out');

    if (window.S && window.S.user) {
      const evo = getEvolutionByXp(window.S.user.xp || 0);
      svgWrap.innerHTML = renderSVG(evo.stage, mood, 68);
    }

    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
      bubble.classList.add('fade-out');
      setTimeout(() => {
        bubble.style.display = 'none';
        if (window.S && window.S.user) {
          const evo = getEvolutionByXp(window.S.user.xp || 0);
          svgWrap.innerHTML = renderSVG(evo.stage, 'idle', 68);
        }
      }, 350);
    }, 5500);
  }

  window.DragonMascot = {
    EVOLUTIONS,
    getEvolutionByXp,
    renderSVG,
    initFloatingCompanion,
    say,
    getRandomQuote,
  };
})(window);

