/* ==========================================================================
   LinGrow AI — frontend app logic. Talks to the real backend via Api (js/api.js),
   uses SpeechInput/SpeechOutput (js/speech.js) for real mic capture and TTS.
   ========================================================================== */

window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
var VIEW_RENDERERS = window.VIEW_RENDERERS;
const S = { user: null, view: 'dashboard', cache: {}, levelConfig: null };

function $(sel, root=document){ return root.querySelector(sel); }
function el(html){
  const trimmed = (html || '').trim();
  if (trimmed.startsWith('<tr') || trimmed.startsWith('<td') || trimmed.startsWith('<th')) {
    const tbody = document.createElement('tbody');
    tbody.innerHTML = trimmed;
    return tbody.firstElementChild;
  }
  const t = document.createElement('template');
  t.innerHTML = trimmed;
  return t.content.firstElementChild;
}
function esc(s){
  if (typeof s !== 'string') {
    if (s && typeof s === 'object' && s.text) s = s.text;
    else s = String(s ?? '');
  }
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
window.esc = esc;
window.escapeHtml = esc;
function toast(msg, kind='sprout'){
  const wrap = $('#toast-wrap');
  if (!wrap) return;

  // Stack limit: cap at 4 toasts, removing oldest
  const existing = wrap.querySelectorAll('.toast');
  if (existing.length >= 4) {
    existing[0].remove();
  }

  const icons = {
    sprout: '✨',
    coral: '🔥',
    amber: '💡',
    voice: '🐉',
    info: '📜',
  };
  const icon = icons[kind] || '✨';

  const t = el(`
    <div class="toast toast-${kind}">
      <span class="toast-ic" style="font-size:16px;line-height:1;margin-right:8px">${icon}</span>
      <span class="toast-msg">${esc(msg)}</span>
    </div>
  `);
  wrap.appendChild(t);
  setTimeout(()=>{
    t.style.opacity='0';
    t.style.transform='translateY(6px)';
    t.style.transition='all .25s ease';
    setTimeout(()=>t.remove(),250);
  }, 3600);
}
function apiError(err){ toast(err.message || 'Something went wrong', 'coral'); console.error(err); }
const AVATAR_COLORS = ['#8B5CF6', '#22D3EE', '#10B981', '#F59E0B', '#F43F5E'];
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return h; }
function initials(name){ return (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function avatarHTML(name, size=38){
  const c = AVATAR_COLORS[Math.abs(hashStr(name||''))%AVATAR_COLORS.length];
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${c};color:var(--color-on-bright);font-size:${size*0.36}px">${initials(name)}</div>`;
}
function levelColor(level){ return level==='Beginner' ? 'cyan' : level==='Intermediate' ? 'purple' : 'amber'; }
function scoreColor(s){ return s>=80?'var(--color-success-text)': s>=60?'var(--color-streak-text)':'var(--color-error-text)'; }
function timeAgo(iso){
  const d = (Date.now() - new Date(iso).getTime())/1000;
  if (d<60) return 'just now';
  if (d<3600) return Math.floor(d/60)+'m ago';
  if (d<86400) return Math.floor(d/3600)+'h ago';
  return Math.floor(d/86400)+'d ago';
}


/* ---------------------------- THEME MANAGEMENT (LIGHT DEFAULT / DARK) ---------------------------- */
function initTheme() {
  const saved = localStorage.getItem('lingrow_theme');
  const theme = saved || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcons();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('lingrow_theme', next);
  updateThemeIcons();
}

function updateThemeIcons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const iconSvg = isDark ? (ICONS.sun || '') : (ICONS.moon || '');
  const title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const topIcon = document.getElementById('theme-toggle-icon');
  if (topIcon) {
    topIcon.className = '';
    topIcon.innerHTML = iconSvg;
    if (topIcon.parentElement) topIcon.parentElement.title = title;
  }
  const loginIcon = document.getElementById('login-theme-icon');
  if (loginIcon) {
    loginIcon.className = '';
    loginIcon.innerHTML = iconSvg;
    if (loginIcon.parentElement) loginIcon.parentElement.title = title;
  }
}
initTheme();

/* ---------------------------- LOGIN / REGISTER ---------------------------- */
let loginMode = 'login';
let loginRole = 'student';

function renderLogin(){
  const root = $('#login-screen');
  const verifyNoticeHTML = S.verifyEmailNotice
    ? `<div class="${S.verifyEmailNotice.ok ? 'success-box' : 'error-box'}">${esc(S.verifyEmailNotice.message)}</div>` : '';
  S.verifyEmailNotice = null; // one-shot — don't repeat it on subsequent re-renders
  root.innerHTML = `
  <div class="login-wrap">
    <div class="login-art">
      <div class="brand">
        <div class="brand-mark" style="background:linear-gradient(135deg,#F59E0B,#EF4444);color:#0F172A;font-size:18px">🐉</div>
        <div><div class="brand-name">LinGrow AI</div><div class="brand-sub">Dragon Academy Universe</div></div>
      </div>
      <div>
        <div class="login-tagline">Train Your Mind.<br/>Awaken Your Dragon.<br/>Master English.</div>
        <div class="login-wave-art" id="login-wave"></div>
      </div>
      <div class="login-art-desc" style="font-size:12px;color:var(--cream-faint);line-height:1.6;max-width:320px">
        An immersive fantasy English-learning universe. Master speaking, vocabulary, listening, and grammar through interactive quests, spaced-repetition drills, and intelligent AI mentorship.
      </div>
    </div>
    <div class="login-form-side">
      <div class="role-tabs" id="role-tabs">
        ${['student','teacher','admin'].map(r=>`<div class="role-tab ${r===loginRole?'active':''}" data-role="${r}">${r[0].toUpperCase()+r.slice(1)}</div>`).join('')}
      </div>
      <div id="login-error">${verifyNoticeHTML}</div>
      <form id="auth-form" class="col gap-md">
        <div><label class="field-label">Email Address</label><input type="email" id="f-email" placeholder="you@college.edu" required></div>
        <div><label class="field-label">Password</label><input type="password" id="f-password" placeholder="••••••••" required></div>
        <button class="btn btn-primary" type="submit" style="width:100%;margin-top:6px" id="auth-submit">
          Sign in ${ICONS.arrowRight}
        </button>
      </form>
      <div class="form-switch" style="font-size:12px;color:var(--cream-faint);line-height:1.5;text-align:center">
        ${ICONS.shield} Institutional Access: Student and teacher accounts are provisioned by your college administrator.
      </div>
      <div class="demo-note" style="font-size:12px;line-height:1.6">
        <b style="color:var(--cream)">Quick Demo Logins</b> (password: <code>password123</code>):<br/>
        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
          <button type="button" class="btn btn-secondary btn-sm demo-fill-btn" data-email="student2@lingrow.demo" data-role="student" style="font-size:11px;padding:3px 8px">student2 (Intermediate)</button>
          <button type="button" class="btn btn-secondary btn-sm demo-fill-btn" data-email="student@lingrow.demo" data-role="student" style="font-size:11px;padding:3px 8px">student (Advanced)</button>
          <button type="button" class="btn btn-secondary btn-sm demo-fill-btn" data-email="teacher@lingrow.demo" data-role="teacher" style="font-size:11px;padding:3px 8px">teacher</button>
          <button type="button" class="btn btn-secondary btn-sm demo-fill-btn" data-email="admin@lingrow.demo" data-role="admin" style="font-size:11px;padding:3px 8px">admin</button>
        </div>
      </div>
    </div>
  </div>`;

  const waveEl = $('#login-wave');
  const barCount = window.innerWidth <= 768 ? 16 : 24;
  for(let i = 0; i < barCount; i++){
    const pct = 25 + Math.round(Math.abs(Math.sin(i * 0.45)) * 70);
    waveEl.appendChild(el(`<span style="height:${pct}%;animation-delay:${(i*0.06).toFixed(2)}s"></span>`));
  }

  const lThemeBtn = $('#login-theme-toggle-btn');
  if (lThemeBtn) lThemeBtn.onclick = toggleTheme;
  updateThemeIcons();

  $all2('#role-tabs .role-tab').forEach(tab=>{
    tab.onclick = ()=>{ loginRole = tab.dataset.role; renderLogin(); };
  });
  $all2('.demo-fill-btn').forEach(btn => {
    btn.onclick = () => {
      $('#f-email').value = btn.dataset.email;
      $('#f-password').value = 'password123';
      loginRole = btn.dataset.role;
      $all2('#role-tabs .role-tab').forEach(t => t.classList.toggle('active', t.dataset.role === loginRole));
    };
  });
  $('#auth-form').onsubmit = async (e)=>{
    e.preventDefault();
    const btn = $('#auth-submit'); btn.disabled = true;
    $('#login-error').innerHTML = '';
    try{
      const res = await Api.login({ email: $('#f-email').value.trim(), password: $('#f-password').value.trim() });
      Api.setToken(res.token);
      S.user = res.user;
      enterApp();
    initGlobalChatbot();
    } catch(err){
      $('#login-error').innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
    } finally { btn.disabled = false; }
  };
}
function $all2(sel, root=document){ return [...root.querySelectorAll(sel)]; }

async function tryResumeSession(){
  if (!Api.token) return false;
  try{
    const res = await Api.me();
    S.user = res.user;
    return true;
  } catch(e){ Api.setToken(null); return false; }
}

async function logout(){
  await Api.logout(); // invalidates the refresh token server-side, then clears the local access token
  S.user = null;
  S.cache = {};
  $('#app').classList.remove('active');
  const loginScreen = $('#login-screen');
  if (loginScreen) {
    loginScreen.classList.remove('hidden');
    loginScreen.style.display = 'flex';
  }
  const fab = $('#global-chatbot-fab');
  if (fab) fab.style.display = 'none';
  const drawer = $('#global-chatbot-drawer');
  if (drawer) drawer.classList.remove('open');
  const overlay = $('#global-chatbot-overlay');
  if (overlay) overlay.style.display = 'none';
  const dragonWidget = $('#dragon-floating-companion');
  if (dragonWidget) dragonWidget.remove();
  loginMode='login';
  renderLogin();
}

/* ---------------------------- NAV DEFINITIONS & LEVEL ACCESS ---------------------------- */
const LEVEL_RANKS = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };

function getStudentLevel(user) {
  if (!user) return 'Beginner';
  if (user.level && LEVEL_RANKS[user.level]) return user.level;
  const unlocked = user.unlockedLevels || ['Beginner'];
  if (unlocked.includes('Advanced')) return 'Advanced';
  if (unlocked.includes('Intermediate')) return 'Intermediate';
  return 'Beginner';
}

function canAccessLevel(userLevel, requiredLevel) {
  if (!requiredLevel || requiredLevel === 'Beginner' || requiredLevel === 'All Levels') return true;
  const ranks = (S.levelConfig && S.levelConfig.ranks) || LEVEL_RANKS;
  const uRank = ranks[userLevel] || 1;
  const rRank = ranks[requiredLevel] || 1;
  return uRank >= rRank;
}

function isUserOnboarded(user) {
  if (!user) return false;
  if (user.role === 'teacher' || user.role === 'admin') return true;
  return user.onboardingCompleted === true && typeof user.level === 'string' && user.level.trim().length > 0;
}

async function loadLevelConfig() {
  if (S.levelConfig) return S.levelConfig;
  try {
    S.levelConfig = await Api.getLevelConfig();
  } catch (e) {
    console.warn('Could not fetch level config, using default mapping:', e);
    S.levelConfig = {
      ranks: { Beginner: 1, Intermediate: 2, Advanced: 3 },
      tiers: {
        Beginner: { id: 'Beginner', rank: 1, title: 'Hatchling', badge: 'HATCHLING' },
        Intermediate: { id: 'Intermediate', rank: 2, title: 'Flame Keeper', badge: 'FLAME_KEEPER' },
        Advanced: { id: 'Advanced', rank: 3, title: 'Sky Guardian', badge: 'SKY_GUARDIAN' }
      },
      modules: {
        grammar: 'Beginner', vocabulary: 'Beginner', listening: 'Beginner', story: 'Beginner',
        situational: 'Beginner', weakwords: 'Beginner', tutor: 'Beginner',
        'read-aloud': 'Intermediate', practice: 'Intermediate', simulator: 'Intermediate',
        idioms: 'Intermediate', peer: 'Intermediate', 'world-stage': 'Advanced', debate: 'Advanced'
      }
    };
  }

  // Reconcile NAV.student module minLevel with config
  if (S.levelConfig && S.levelConfig.modules && NAV && NAV.student) {
    NAV.student.forEach(g => {
      g.items.forEach(it => {
        if (S.levelConfig.modules[it.id]) {
          it.minLevel = S.levelConfig.modules[it.id];
        }
      });
    });
  }
  return S.levelConfig;
}

window.handleOnboardingRequired = function(data) {
  if (S.user && S.user.role === 'student') {
    S.user.onboardingCompleted = false;
    setView('onboarding');
    toast('Dragon Egg Trial required before entering academy chambers.', 'coral');
  }
};

window.showLevelLockedModal = function(data = {}) {
  const existing = document.getElementById('dragon-level-lock-modal');
  if (existing) existing.remove();

  const userLevel = S.user ? getStudentLevel(S.user) : 'Beginner';
  const requiredLevel = data.requiredLevel || 'Intermediate';
  const currentLevel = data.currentLevel || userLevel;
  const moduleName = data.moduleName || data.chamber || 'Ancient Chamber';
  const cfg = S.levelConfig || {};
  const reqTier = cfg.tiers?.[requiredLevel] || { title: requiredLevel === 'Advanced' ? 'Sky Guardian' : 'Flame Keeper' };
  const curTier = cfg.tiers?.[currentLevel] || { title: currentLevel === 'Advanced' ? 'Sky Guardian' : currentLevel === 'Intermediate' ? 'Flame Keeper' : 'Hatchling' };

  const modal = document.createElement('div');
  modal.id = 'dragon-level-lock-modal';
  modal.className = 'modal-overlay level-lock-modal-overlay';
  modal.innerHTML = `
    <div class="modal level-lock-modal" style="max-width:500px;text-align:center;padding:28px 24px;border:1px solid rgba(239,68,68,0.35);box-shadow:0 12px 40px rgba(0,0,0,0.5), 0 0 24px rgba(239,68,68,0.25);border-radius:18px">
      <div class="level-lock-icon-wrap" style="margin-bottom:14px">
        <span style="font-size:48px;display:inline-block;filter:drop-shadow(0 0 12px rgba(239,68,68,0.4))">🔒</span>
      </div>
      <div class="pill coral" style="font-size:10.5px;letter-spacing:0.06em;font-weight:800;margin-bottom:8px">ANCIENT RUNE SEALED</div>
      <h2 style="font-size:22px;font-family:var(--font-display);font-weight:800;margin-bottom:8px;color:var(--color-text)">
        ${esc(moduleName)} is Locked
      </h2>
      <p style="font-size:13.5px;color:var(--cream-dim);line-height:1.5;margin-bottom:20px">
        This realm is guarded by ancient draconic wards. To unseal this chamber, you must advance your rank to <strong>${esc(reqTier.title || requiredLevel)} (${esc(requiredLevel)})</strong>.
      </p>

      <div class="level-lock-tiers-box" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 16px;background:var(--color-surface-2);border:1px solid var(--line);border-radius:12px;margin-bottom:20px">
        <div style="flex:1;text-align:center">
          <div style="font-size:11px;color:var(--cream-faint);text-transform:uppercase;font-weight:700">Your Rank</div>
          <div style="font-size:14px;font-weight:800;color:var(--cyan);margin-top:2px">${esc(curTier.title || currentLevel)}</div>
          <div style="font-size:11px;color:var(--cream-dim)">${esc(currentLevel)}</div>
        </div>
        <div style="font-size:18px;color:var(--cream-dim)">&rarr;</div>
        <div style="flex:1;text-align:center">
          <div style="font-size:11px;color:var(--cream-faint);text-transform:uppercase;font-weight:700">Required Rank</div>
          <div style="font-size:14px;font-weight:800;color:var(--coral);margin-top:2px">${esc(reqTier.title || requiredLevel)}</div>
          <div style="font-size:11px;color:var(--cream-dim)">${esc(requiredLevel)}</div>
        </div>
      </div>

      <div style="font-size:12px;color:var(--cream-dim);background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);padding:10px 14px;border-radius:10px;margin-bottom:24px;text-align:left;line-height:1.45">
        💡 <b>Promotion Path:</b> Master foundational chambers in your current tier, ask your mentor or teacher to review your proficiency, or complete the Level-Up Trial when eligible.
      </div>

      <div class="row gap-sm" style="justify-content:center;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="lock-modal-close-btn" style="padding:8px 18px">Explore Unlocked Realms</button>
        <button class="btn btn-primary btn-sm" id="lock-modal-progress-btn" style="padding:8px 18px">View Rider Progression</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#lock-modal-close-btn').onclick = () => modal.remove();
  modal.querySelector('#lock-modal-progress-btn').onclick = () => {
    modal.remove();
    setView('progress');
  };
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
};

function addStudentXP(amount) {
  if (!S.user || S.user.role !== 'student') return;
  const oldXp = S.user.xp || 0;
  S.user.xp = oldXp + amount;
  renderTopbar();

  // Check if student crossed a dragon evolution stage threshold
  if (window.DragonMascot && window.DragonMascot.checkEvolution) {
    window.DragonMascot.checkEvolution(oldXp, S.user.xp);
  }
}

const NAV = {
  student: [
    { group:'Dragon Academy', items:[
      {id:'dashboard', label:'Dragon Kingdom', icon:'dashboard'},
      {id:'kingdoms', label:'The 7 Kingdoms', icon:'library', badge:'MAP'},
      {id:'adventures', label:'Adventure Quests', icon:'trophy', badge:'3-TIER'},
      {id:'world-stage', label:'World Stage', icon:'mic', minLevel:'Advanced', badge:'ORATORY'},
      {id:'tutor', label:'Ignis: Dragon Mentor', icon:'message', badge:'AI'},
    ]},
    { group:'Kingdom Realms', items:[
      {id:'weakwords', label:'Weak Words Lab', icon:'target', minLevel:'Beginner', badge:'LAB'},
      {id:'idioms', label:'Idioms & Phrasal Grove', icon:'feather', minLevel:'Intermediate', badge:'NEW'},
      {id:'grammar', label:'Grammar Castle', icon:'edit', minLevel:'Beginner'},
      {id:'vocabulary', label:'Vocabulary Forest', icon:'book', minLevel:'Beginner'},
      {id:'read-aloud', label:'Speaking Volcano (Read Aloud)', icon:'mic', minLevel:'Beginner'},
      {id:'listening', label:'Listening Ocean', icon:'headphones', minLevel:'Beginner'},
      {id:'situational', label:'Conversation Village', icon:'message', minLevel:'Beginner'},
      {id:'story', label:'Reading Grimoires & Stories', icon:'feather', minLevel:'Beginner'},
      {id:'simulator', label:'Communication Simulator', icon:'message', minLevel:'Intermediate', badge:'NEW'},
      {id:'peer', label:'Peer Practice Duels', icon:'users', minLevel:'Intermediate'},
      {id:'debate', label:'Dragon Debate Arena', icon:'podium', minLevel:'Advanced'},
    ]},
    { group:'Rider Progression', items:[
      {id:'progress', label:'Dragon Progression & Badges', icon:'trophy'},
      {id:'lessons', label:'Curriculum Scrolls', icon:'library'},
      {id:'tests', label:'Academy Trials', icon:'clipboard'},
      {id:'profile', label:'Dragon Rider Profile', icon:'user'},
    ]},
  ],
  teacher: [
    { group:'Teaching', items:[
      {id:'t-dashboard', label:'Class Overview', icon:'grid'},
      {id:'t-tests', label:'Tests', icon:'clipboard'},
      {id:'t-gd', label:'GD Rooms', icon:'users'},
    ]},
  ],
  admin: [
    { group:'Administration', items:[
      {id:'a-users', label:'User Management', icon:'userplus'},
      {id:'a-content', label:'Content Library', icon:'library'},
      {id:'a-health', label:'System Health', icon:'activity'},
    ]},
  ],
};
const VIEW_TITLES = {
  'dashboard':['Dragon Kingdom','Train Your Mind. Awaken Your Dragon. Master English.'],
  'onboarding':['The Dragon Egg Trial','Awaken Your Dragon Companion & Attune Your English Rank'],
  'kingdoms':['The 7 Dragon Kingdoms','Curriculum world map of enchanted English learning realms'],
  'adventures':['Special Adventure Experiences','Quests, detective cases, escape rooms & high-stakes simulations'],
  'weakwords':['Weak Words Lab','Spaced-repetition drills to master your mispronounced and tricky words'],
  'idioms':['The Whispering Grove: Idioms & Phrasal Verbs','Master high-impact figurative expressions and phrasal verbs for Level 4-5 fluency'],
  'world-stage':['Grand Dragon Amphitheater','Simulated public speaking in iconic auditoriums before intelligent AI audiences'],
  'simulator':['AI Real-World Communication Simulator','Interactive voice & text simulations across interviews, workplace, travel & negotiation'],
  'read-aloud':['Speaking Volcano (Read Aloud)','Pronunciation & vocal power training'],
  'vocabulary':['Vocabulary Forest','Build and master your working lexicon'],
  'grammar':['Grammar Castle','Master essential English grammar with interactive beginner exercises'],
  'situational':['Conversation Village','Master real-life campus & professional English conversations'],
  'listening':['Listening Ocean','Train your ear for natural speech, accents & rhythms'],
  'story':['Reading Grimoires & Stories','Advanced — improvisation, narrative & creativity'],
  'debate':['Dragon Debate Arena','Advanced — collegiate debate & persuasion vs AI Drake'],
  'peer':['Peer Practice Duels','Talk to a real classmate, voice-anonymized'],
  'tutor':['Ignis: Your Dragon Mentor','Your personal intelligent English teacher and companion'],
  'tests':['Academy Trials & Assessments','Assessments assigned by your mentor'],
  'lessons':['Curriculum Scrolls & Lessons','Structured academy lessons'],
  'progress':['Dragon Progression & Rider Hall','Awaken your dragon companion through real English mastery'],
  'profile':['Dragon Rider Profile','Your student profile, enrolled class & learning status'],
  't-dashboard':['Class Overview','Monitor your students'],
  't-tests':['Tests','Create and manage assessments'],
  't-gd':['Group Discussion Rooms','Create GD rooms, monitor lobbies & AI speech reports'],

  'a-users':['User Management','Create, import and manage accounts'],
  'a-content':['Content Library','Passages, vocabulary, topics & prompts'],
  'a-health':['System Health','Service status & platform stats'],
};

function closeMobileSidebar() {
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('sidebar-open');
}

function openMobileSidebar() {
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.classList.add('sidebar-open');
}

function renderShell(){
  const role = S.user.role;
  const userLevel = getStudentLevel(S.user);
  const unlocked = S.user.unlockedLevels || ['Beginner'];
  const sidebar = $('#sidebar');

  const BIOME_MAP = {
    'grammar': 'castle',
    'vocabulary': 'forest',
    'read-aloud': 'volcano',
    'listening': 'ocean',
    'story': 'grimoire',
    'simulator': 'workshop',
    'situational': 'village',
    'weakwords': 'flame-lab',
    'idioms': 'grove',
    'world-stage': 'amphitheater',
    'debate': 'arena',
  };

  // Build realm navigation with biome indicators and locked rune states
  const roleNav = NAV[role].map(g => {
    if (role !== 'student') return g;
    return {
      ...g,
      items: g.items.map(it => {
        const minLevel = (S.levelConfig?.modules && S.levelConfig.modules[it.id]) || it.minLevel || 'Beginner';
        const isLocked = !canAccessLevel(userLevel, minLevel);
        const biome = BIOME_MAP[it.id] || '';
        return { ...it, minLevel, isLocked, biome };
      })
    };
  });

  sidebar.innerHTML = `
    <div class="sidebar-header row" style="justify-content:space-between;align-items:center;width:100%;margin-bottom:8px">
      <div class="brand">
        <div class="brand-mark" style="background:linear-gradient(135deg,#F59E0B,#EF4444);color:#0F172A;font-size:17px">🐉</div>
        <div>
          <div class="brand-name">LinGrow AI</div>
          <div class="brand-sub">
            Dragon Academy${role === 'student' ? ` &middot; <span class="pill ${levelColor(userLevel)}" style="font-size:9.5px;padding:1px 5px">${userLevel}</span>` : ` &middot; ${role}`}
          </div>
        </div>
      </div>
      <button class="sidebar-close-btn icon-btn" id="sidebar-close-btn" aria-label="Close menu">${ICONS.x}</button>
    </div>
    ${roleNav.map(g=>`
      <div class="nav-group-label">${g.group}</div>
      ${g.items.map(it=> {
        const isLocked = !!it.isLocked;
        const biomeClass = it.biome ? `realm-item biome-${it.biome}` : '';
        return `
        <div class="nav-item ${biomeClass} ${it.id === S.view ? 'active' : ''} ${isLocked ? 'locked is-locked-nav' : ''}" 
             data-view="${it.id}" 
             data-locked="${isLocked ? 'true' : 'false'}"
             data-minlevel="${it.minLevel || ''}"
             title="${isLocked ? `Locked Realm: Requires ${it.minLevel} level to unlock` : it.label}">
          <span>${ICONS[it.icon] || '✨'}</span>
          <span style="flex:1">${it.label}</span>
          ${isLocked ? `
            <span class="rune-lock-shimmer pill" style="font-size:9px;padding:2px 5px;background:rgba(239,68,68,0.15);color:#EF4444;border-color:rgba(239,68,68,0.3)">🔒 ${it.minLevel}</span>
          ` : (it.minLevel && it.minLevel !== 'Beginner' ? `<span class="pill ${levelColor(it.minLevel)}" style="font-size:9px;padding:2px 5px">${it.minLevel}</span>` : it.badge ? `<span class="pill sprout" style="font-size:9.5px;padding:2px 6px;margin-left:4px">${it.badge}</span>` : '')}
        </div>
      `;}).join('')}
    `).join('')}
    <div class="sidebar-footer">
      <div class="user-chip" id="logout-trigger" style="cursor:pointer" title="My Profile / Account">
        ${avatarHTML(S.user.name)}
        <div><div class="user-name">${esc(S.user.name)}</div><div class="user-role">Sign out</div></div>
      </div>
    </div>
  `;
  $all2('.nav-item', sidebar).forEach(item=>{
    item.onclick = ()=> {
      if (S.user && S.user.role === 'student' && !isUserOnboarded(S.user)) {
        toast('Complete the Dragon Egg Trial before exploring academy chambers.', 'coral');
        setView('onboarding');
        closeMobileSidebar();
        return;
      }
      if (item.dataset.locked === 'true') {
        const reqLevel = item.dataset.minlevel || 'Intermediate';
        const label = item.querySelector('span:nth-child(2)')?.textContent || reqLevel;
        if (typeof window.showLevelLockedModal === 'function') {
          window.showLevelLockedModal({ requiredLevel: reqLevel, currentLevel: userLevel, moduleName: label });
        } else {
          toast(`🔒 ${label} requires ${reqLevel} rank to unlock.`, 'coral');
        }
        return;
      }
      setView(item.dataset.view);
      closeMobileSidebar();
    };
  });
  const closeBtn = $('#sidebar-close-btn');
  if (closeBtn) closeBtn.onclick = closeMobileSidebar;
  const overlay = $('#sidebar-overlay');
  if (overlay) overlay.onclick = closeMobileSidebar;

  $('#logout-trigger').onclick = logout;
}

function renderTopbar(){
  const [title, sub] = VIEW_TITLES[S.view] || ['',''];
  const topbar = $('#topbar');
  let right = '';
  if (S.user && S.user.role === 'student'){
    const userLevel = getStudentLevel(S.user);
    const tierTitle = S.levelConfig?.tiers?.[userLevel]?.title || (userLevel === 'Advanced' ? 'Sky Guardian' : userLevel === 'Intermediate' ? 'Flame Keeper' : 'Hatchling');
    const evo = window.DragonMascot ? window.DragonMascot.getEvolutionByXp(S.user.xp || 0) : { stage: 2, name: 'Dragon Companion', title: 'Curious Fledgling', percentToNext: 40, xpToNext: 150 };
    const streak = S.user.streak || 0;
    const streakScale = Math.min(1.5, 1 + streak * 0.06);
    right = `
      <div class="topbar-level-badge pill ${levelColor(userLevel)}" style="font-weight:800;font-size:11.5px;padding:5px 11px;cursor:pointer;display:inline-flex;align-items:center;gap:6px" onclick="setView('progress')" title="Learner Rank: ${esc(tierTitle)} (${esc(userLevel)})">
        <span>🛡️</span> <span>${esc(tierTitle)} &middot; ${esc(userLevel)}</span>
      </div>
      <div class="topbar-dragon-profile" title="Dragon Companion: ${esc(evo.name)} (${esc(evo.title)}) - Click for Progression" onclick="setView('progress')" style="cursor:pointer">
        <div class="topbar-dragon-avatar">
          <img src="${window.DragonMascot ? window.DragonMascot.getImage(evo.stage) : '/img/dragon/dragon-stage-2.jpg'}" alt="${esc(evo.name)}" class="topbar-dragon-img" />
          <span class="topbar-dragon-lvl">${evo.stage}</span>
        </div>
        <div class="topbar-dragon-info">
          <div class="topbar-dragon-name">${esc(evo.name)} <span class="topbar-dragon-title">&bull; ${esc(evo.title)}</span></div>
          <div class="topbar-dragon-xp-track" title="${evo.percentToNext}% toward next form (${evo.xpToNext} XP needed)">
            <div class="topbar-dragon-xp-fill" style="width:${evo.percentToNext}%"></div>
          </div>
        </div>
      </div>
      <div class="streak-chip" title="${streak} day streak! Flame power active">
        <span class="streak-flame-icon" style="transform:scale(${streakScale});display:inline-block;transform-origin:bottom center">🔥</span>
        <span>${streak}d</span>
      </div>
      <div class="xp-chip" title="${S.user.xp||0} Total XP">⚡<span>${S.user.xp||0} XP</span></div>
    `;
  }
  const banner = (S.user && !S.user.emailVerified) ? `
    <div id="verify-banner" style="grid-column:1/-1;width:100%;background:var(--color-streak-soft);color:var(--color-streak-text);border:1px solid var(--color-streak);border-radius:8px;padding:8px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;font-size:12px;flex-wrap:wrap">
      <span>Verify your email for full access.</span>
      <b id="verify-resend-trigger" style="cursor:pointer;text-decoration:underline">Resend</b>
      <span id="verify-resend-status" style="opacity:.8"></span>
    </div>` : '';

  topbar.innerHTML = `
    ${banner}
    <div class="topbar-content-row" style="display:flex;align-items:center;width:100%;gap:10px">
      <button class="mobile-menu-btn icon-btn" id="mobile-menu-btn" aria-label="Open Navigation Menu">${ICONS.menu}</button>
      <div class="topbar-headings" style="min-width:0;flex:1">
        <div class="topbar-title">${title}</div>
        <div class="topbar-sub">${sub}</div>
      </div>
      <div class="spacer"></div>
      ${right ? `<div class="topbar-chips row gap-xs">${right}</div>` : ''}
      <button class="sound-toggle-btn theme-toggle-btn" id="sound-toggle-btn" aria-label="Toggle UI Audio and Chimes" title="Toggle Sound">
        <span id="sound-toggle-icon" style="display:inline-flex;align-items:center;justify-content:center;font-size:14px">
          ${window.DragonMascot && window.DragonMascot.isSoundEnabled && window.DragonMascot.isSoundEnabled() ? '🔔' : '🔕'}
        </span>
      </button>
      <button class="theme-toggle-btn" id="theme-toggle-btn" aria-label="Toggle light or dark theme" title="Toggle theme">
        <span id="theme-toggle-icon" style="display:inline-flex;align-items:center;justify-content:center"></span>
      </button>
    </div>
  `;

  const menuBtn = $('#mobile-menu-btn');
  if (menuBtn) menuBtn.onclick = openMobileSidebar;
  const overlay = $('#sidebar-overlay');
  if (overlay) overlay.onclick = closeMobileSidebar;

  const soundBtn = $('#sound-toggle-btn');
  if (soundBtn) {
    soundBtn.onclick = () => {
      if (window.DragonMascot && window.DragonMascot.toggleSound) {
        const active = window.DragonMascot.toggleSound();
        const icon = $('#sound-toggle-icon');
        if (icon) icon.textContent = active ? '🔔' : '🔕';
        toast(active ? 'Dragon Chimes & Audio: Active 🔔' : 'Sound Muted 🔕', 'voice');
      }
    };
  }

  const themeBtn = $('#theme-toggle-btn');
  if (themeBtn) themeBtn.onclick = toggleTheme;
  updateThemeIcons();

  const resendTrigger = $('#verify-resend-trigger');
  if (resendTrigger) {
    resendTrigger.onclick = async () => {
      const status = $('#verify-resend-status');
      status.textContent = 'Sending…';
      try {
        const res = await Api.resendVerification();
        status.textContent = res.devVerifyUrl ? 'Sent (check console).' : 'Sent to inbox.';
      } catch (e) {
        status.textContent = e.message || 'Could not resend.';
      }
    };
  }
}

function markActiveNav(){
  $all2('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.view === S.view));
}

async function setView(view){
  const defaultHome = S.user?.role === 'student' ? 'dashboard' : S.user?.role === 'teacher' ? 't-dashboard' : 'a-users';

  // Fallback if view is undefined or renderer missing
  if (!view || typeof VIEW_RENDERERS[view] !== 'function') {
    if (view && view !== defaultHome && typeof VIEW_RENDERERS[defaultHome] === 'function') {
      console.warn(`View '${view}' is not registered in VIEW_RENDERERS. Falling back to '${defaultHome}'.`);
      view = defaultHome;
    } else if (typeof VIEW_RENDERERS['dashboard'] === 'function') {
      view = 'dashboard';
    }
  }

  // Level gating check for student role
  if (S.user && S.user.role === 'student') {
    if (!isUserOnboarded(S.user)) {
      view = 'onboarding';
    } else {
      const userLevel = getStudentLevel(S.user);
      const allStudentNav = NAV.student.flatMap(g => g.items);
      const item = allStudentNav.find(i => i.id === view);
      const minLevel = (S.levelConfig?.modules && S.levelConfig.modules[view]) || item?.minLevel;
      if (item && minLevel && minLevel !== 'Beginner' && !canAccessLevel(userLevel, minLevel)) {
        if (typeof window.showLevelLockedModal === 'function') {
          window.showLevelLockedModal({ requiredLevel: minLevel, currentLevel: userLevel, moduleName: item.label });
        } else {
          toast(`🔒 ${item.label} is locked in the ${minLevel} tier!`, 'coral');
        }
        return;
      }
    }
  }

  S.view = view;
  try {
    sessionStorage.setItem('lingrow_current_view', view);
    if (history.replaceState) history.replaceState(null, '', '#' + view);
  } catch(e){}
  markActiveNav();
  renderTopbar();
  updateGlobalChatbotVisibility(view);
  const mount = $('#view-inner');

  mount.className = 'view-inner view-enter-wipe';
  mount.innerHTML = `<div class="empty-state">${wave(6)}<div style="margin-top:14px">Loading…</div></div>`;
  try {
    if (typeof VIEW_RENDERERS[view] !== 'function') {
      // Small 150ms retry delay in case script tags are still finalizing
      await new Promise(r => setTimeout(r, 150));
      if (typeof VIEW_RENDERERS[view] !== 'function') {
        if (typeof VIEW_RENDERERS['dashboard'] === 'function') {
          console.warn(`Chamber '${view}' not found, redirecting to Dragon Kingdom.`);
          view = 'dashboard';
          S.view = 'dashboard';
          return await VIEW_RENDERERS['dashboard'](mount);
        }
        throw new Error(`The '${view}' chamber could not be unlocked.`);
      }
    }
    await VIEW_RENDERERS[view](mount);
  } catch (err) {
    console.error(`Error rendering view '${view}':`, err);
    const errMessage = err.message || 'Failed to load view';
    const isAuthErr = errMessage.toLowerCase().includes('auth') || errMessage.toLowerCase().includes('forbidden') || errMessage.toLowerCase().includes('unauthorized');
    mount.innerHTML = `
      <div class="card card-fantasy empty-state col gap-sm" style="padding:36px 24px;max-width:480px;margin:40px auto;text-align:center;border-radius:18px">
        <div style="font-size:36px">${isAuthErr ? '🔒' : '🐉'}</div>
        <h3 style="font-size:18px;font-weight:700;font-family:var(--font-display);color:var(--color-text)">${isAuthErr ? 'Access Restricted' : 'Dragon Chamber Sealed'}</h3>
        <p style="font-size:13.5px;color:var(--cream-dim);line-height:1.5;margin:4px 0 16px">${esc(errMessage)}</p>
        <div class="row gap-sm" style="justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="setView('${view}')">Retry Chamber</button>
          <button class="btn btn-secondary btn-sm" onclick="setView('dashboard')">Return to Dragon Kingdom</button>
          ${isAuthErr ? `<button class="btn btn-ghost btn-sm" onclick="logout()">Sign in as Admin</button>` : ''}
        </div>
      </div>`;
  }
}

async function enterApp(){
  await loadLevelConfig();
  const onboarded = isUserOnboarded(S.user);
  if (onboarded) {
    initGlobalChatbot();
  }
  const loginScreen = $('#login-screen');
  if (loginScreen) {
    loginScreen.innerHTML = '';
    loginScreen.classList.add('hidden');
    loginScreen.style.display = 'none';
  }
  $('#app').classList.add('active');
  renderShell();
  if (onboarded && window.DragonMascot && window.DragonMascot.initFloatingCompanion) {
    window.DragonMascot.initFloatingCompanion(S.user);
  }
  const home = S.user.role === 'student' ? (onboarded ? 'dashboard' : 'onboarding') : S.user.role === 'teacher' ? 't-dashboard' : 'a-users';
  const hashView = (location.hash || '').replace(/^#/, '').trim();
  const sessionView = sessionStorage.getItem('lingrow_current_view');
  let targetView = home;
  if (!onboarded && S.user.role === 'student') {
    targetView = 'onboarding';
  } else if (hashView && VIEW_RENDERERS[hashView]) {
    targetView = hashView;
  } else if (sessionView && VIEW_RENDERERS[sessionView]) {
    targetView = sessionView;
  }
  await setView(targetView);
}

async function handleEmailVerificationLink(){
  const params = new URLSearchParams(location.search);
  const token = params.get('verifyEmail');
  if (!token) return;
  // Strip the token from the URL right away so it can't be reused/leaked via history/referrer.
  params.delete('verifyEmail');
  history.replaceState({}, '', location.pathname + (params.toString() ? `?${params}` : ''));
  try {
    await Api.verifyEmail(token);
    if (S.user) S.user.emailVerified = true;
    S.verifyEmailNotice = { ok: true, message: 'Your email is verified.' };
  } catch (e) {
    S.verifyEmailNotice = { ok: false, message: e.message || 'That verification link is invalid or has expired.' };
  }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  initGlobalChatbot();
  const hasToken = !!localStorage.getItem('lingrow_token');
  if (!hasToken) {
    renderLogin();
  }
  await handleEmailVerificationLink();
  const resumed = await tryResumeSession();
  if (resumed) {
    enterApp();
  } else {
    renderLogin();
  }
});

window.addEventListener('hashchange', () => {
  if (!S.user) return;
  const rawHash = (location.hash || '').replace(/^#/, '').trim();
  const view = rawHash.split('?')[0];
  if (view && VIEW_RENDERERS[view]) {
    setView(view);
  }
});

// Prevent accidental F7 Caret Browsing activation
window.addEventListener('keydown', (e) => {
  if (e.key === 'F7') {
    e.preventDefault();
  }
});

// Clear any accidental text cursor / caret on touch or click outside inputs
document.addEventListener('pointerup', (e) => {
  if (!e.target.closest('input, textarea, select, [contenteditable="true"]')) {
    const sel = window.getSelection();
    if (sel && sel.type === 'Caret') {
      sel.removeAllRanges();
    }
  }
});

/* ---------------------------- GLOBAL CHATBOT CONTROLLER ---------------------------- */
let chatbotHistory = [];
let isMicRecording = false;
let isChatbotBound = false;

function updateGlobalChatbotVisibility(view) {
  if (!isChatbotBound) {
    initGlobalChatbot();
  }
  const fab = $('#global-chatbot-fab');
  if (!fab) return;
  const currentView = view || S.view;
  const isAuth = !!S.user;
  const isTutorPage = currentView === 'tutor' || currentView === 'onboarding' || (S.user?.role === 'student' && !isUserOnboarded(S.user));
  const shouldHide = !isAuth || isTutorPage || isMicRecording;
  fab.style.display = shouldHide ? 'none' : 'flex';
  if (shouldHide) {
    const drawer = $('#global-chatbot-drawer');
    const overlay = $('#global-chatbot-overlay');
    if (drawer && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('open');
      }
    }
  }
}

function initGlobalChatbot() {
  const fab = $('#global-chatbot-fab');
  const drawer = $('#global-chatbot-drawer');
  const overlay = $('#global-chatbot-overlay');
  const closeBtn = $('#chatbot-close-btn');
  const fullPageBtn = $('#chatbot-open-full-btn');
  const form = $('#chatbot-drawer-form');
  const input = $('#chatbot-drawer-input');
  const msgsContainer = $('#chatbot-drawer-messages');

  if (!drawer) return;

  let pipelineTimer = null;

  function updateChatbotAvatar(mood = 'idle') {
    const avatarEl = $('#chatbot-mascot-avatar');
    if (!avatarEl) return;
    const user = (typeof currentUser !== 'undefined' ? currentUser : null) || window.currentUser || { xp: 0 };
    const evo = window.DragonMascot ? window.DragonMascot.getEvolutionByXp(user.xp || 0) : { stage: 2, name: 'Ignis' };
    const imgUrl = window.DragonMascot ? window.DragonMascot.getImage(evo.stage) : '/img/dragon/dragon-stage-2.jpg';
    avatarEl.className = `chatbot-mascot-avatar ${mood && mood !== 'idle' ? mood : ''}`;
    avatarEl.innerHTML = `<img src="${imgUrl}" alt="${evo.name}" class="dragon-avatar-photo" />`;
  }

  function setChatbotMascotMood(mood = 'idle') {
    const avatarEl = $('#chatbot-mascot-avatar');
    if (avatarEl) {
      avatarEl.className = `chatbot-mascot-avatar ${mood && mood !== 'idle' ? mood : ''}`;
    }
    if (window.DragonMascot && window.DragonMascot.setMood) {
      try {
        window.DragonMascot.setMood(mood);
      } catch (_) {}
    }
  }

  function setPipelineStep(step) {
    const statusEl = $('#chatbot-pipeline-status');
    if (!statusEl) return;
    if (!step || step === 'hide') {
      statusEl.style.display = 'none';
      clearTimeout(pipelineTimer);
      return;
    }
    statusEl.style.display = 'block';
    const chips = statusEl.querySelectorAll('.pipeline-chip');
    const bar = statusEl.querySelector('.pipeline-ember-progress');
    const steps = ['routing', 'drafting', 'verifying', 'done'];
    const curIdx = steps.indexOf(step);

    chips.forEach((c) => {
      const s = c.getAttribute('data-step');
      const idx = steps.indexOf(s);
      c.classList.remove('active', 'completed');
      if (idx < curIdx) {
        c.classList.add('completed');
      } else if (idx === curIdx) {
        c.classList.add('active');
      }
    });

    const progressPercent = curIdx === 0 ? 25 : curIdx === 1 ? 55 : curIdx === 2 ? 80 : 100;
    if (bar) bar.style.width = `${progressPercent}%`;
  }

  function startPipelineAnimation() {
    clearTimeout(pipelineTimer);
    setPipelineStep('routing');
    pipelineTimer = setTimeout(() => {
      setPipelineStep('drafting');
      pipelineTimer = setTimeout(() => {
        setPipelineStep('verifying');
      }, 750);
    }, 400);
  }

  function finishPipelineAnimation() {
    clearTimeout(pipelineTimer);
    setPipelineStep('done');
    pipelineTimer = setTimeout(() => {
      setPipelineStep('hide');
    }, 1100);
  }

  function renderQuickChips() {
    const chipsContainer = $('#chatbot-quick-chips');
    if (!chipsContainer) return;
    const suggestions = [
      { label: '🔍 Check my grammar', text: 'Can you please check my sentence for grammar and clarity: ' },
      { label: '📝 Quiz me on this', text: 'Give me a quick 1-question quiz on what we just discussed.' },
      { label: '💡 Explain simpler', text: 'Could you explain that more simply with an easy everyday analogy?' },
      { label: '🎯 Drill weak words', text: 'Give me a practice sentence using one of my weak vocabulary words.' },
    ];

    chipsContainer.innerHTML = suggestions.map((s) => `
      <button type="button" class="quick-chip" data-quick-text="${esc(s.text)}">${s.label}</button>
    `).join('');

    chipsContainer.querySelectorAll('.quick-chip').forEach((btn) => {
      btn.onclick = () => {
        const inp = $('#chatbot-drawer-input');
        if (inp) {
          inp.value = btn.getAttribute('data-quick-text') || '';
          inp.focus();
        }
      };
    });
  }

  function openDrawer() {
    const d = $('#global-chatbot-drawer');
    const o = $('#global-chatbot-overlay');
    const inp = $('#chatbot-drawer-input');
    if (d) {
      d.classList.add('open');
      d.setAttribute('aria-hidden', 'false');
    }
    if (o) {
      o.style.display = 'block';
      o.classList.add('open');
    }
    updateChatbotAvatar('idle');
    renderQuickChips();
    if (inp) {
      setTimeout(() => inp.focus(), 100);
    }
    loadChatbotHistory();
  }

  function closeDrawer() {
    const d = $('#global-chatbot-drawer');
    const o = $('#global-chatbot-overlay');
    if (d) {
      d.classList.remove('open');
      d.setAttribute('aria-hidden', 'true');
    }
    if (o) {
      o.style.display = 'none';
      o.classList.remove('open');
    }
    setPipelineStep('hide');
    setChatbotMascotMood('idle');
  }

  window.openGlobalChatbot = openDrawer;
  window.closeGlobalChatbot = closeDrawer;

  if (fab) {
    fab.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const d = $('#global-chatbot-drawer');
      if (d && d.classList.contains('open')) closeDrawer();
      else openDrawer();
    };
  }

  if (!isChatbotBound) {
    isChatbotBound = true;

    // Document-level event delegation so clicks ALWAYS open/close the drawer
    document.addEventListener('click', (e) => {
      const clickedFab = e.target.closest('#global-chatbot-fab, .global-chatbot-fab');
      if (clickedFab) {
        e.preventDefault();
        e.stopPropagation();
        const d = $('#global-chatbot-drawer');
        if (d && d.classList.contains('open')) closeDrawer();
        else openDrawer();
        return;
      }
      const clickedClose = e.target.closest('#chatbot-close-btn');
      if (clickedClose) {
        e.preventDefault();
        closeDrawer();
        return;
      }
      const clickedOverlay = e.target.closest('#global-chatbot-overlay');
      if (clickedOverlay) {
        e.preventDefault();
        closeDrawer();
        return;
      }
    });

    if (closeBtn) closeBtn.onclick = closeDrawer;
    if (overlay) overlay.onclick = closeDrawer;

    window.addEventListener('keydown', (e) => {
      const d = $('#global-chatbot-drawer');
      if (e.key === 'Escape' && d && d.classList.contains('open')) {
        closeDrawer();
      }
    });

    if (fullPageBtn) {
      fullPageBtn.onclick = () => {
        closeDrawer();
        setView('tutor');
      };
    }

    if (msgsContainer) {
      msgsContainer.addEventListener('click', async (e) => {
        // 1. Speak single word
        const speakWordBtn = e.target.closest('[data-speak-word]');
        if (speakWordBtn) {
          e.preventDefault();
          const word = speakWordBtn.getAttribute('data-speak-word');
          if (word && window.SpeechOutput) {
            setChatbotMascotMood('speaking');
            window.SpeechOutput.speak(word, {
              onEnd: () => setChatbotMascotMood('idle'),
            });
          }
          return;
        }

        // 2. Speak whole message
        const speakMsgBtn = e.target.closest('[data-speak-msg]');
        if (speakMsgBtn) {
          e.preventDefault();
          const msg = speakMsgBtn.getAttribute('data-speak-msg');
          if (msg && window.SpeechOutput) {
            setChatbotMascotMood('speaking');
            window.SpeechOutput.speak(msg.slice(0, 320), {
              onEnd: () => setChatbotMascotMood('idle'),
            });
          }
          return;
        }

        // 3. Copy message text
        const copyBtn = e.target.closest('[data-copy-msg]');
        if (copyBtn) {
          e.preventDefault();
          const textToCopy = copyBtn.getAttribute('data-copy-msg');
          if (textToCopy && navigator.clipboard) {
            try {
              await navigator.clipboard.writeText(textToCopy);
              copyBtn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
              setTimeout(() => {
                copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
              }, 2000);
            } catch (_) {}
          }
          return;
        }

        // 4. Add to Vocabulary Forge
        const addVocabBtn = e.target.closest('[data-add-vocab]');
        if (addVocabBtn && !addVocabBtn.classList.contains('added')) {
          e.preventDefault();
          const word = addVocabBtn.getAttribute('data-add-vocab');
          if (word) {
            try {
              await Api.postWeakWordsBulk({ words: [word], source: 'ai-tutor' });
              addVocabBtn.classList.add('added');
              addVocabBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Added to Forge';
              setChatbotMascotMood('celebrating');
              if (window.DragonMascot && window.DragonMascot.playChime) {
                window.DragonMascot.playChime('correct');
              }
              setTimeout(() => setChatbotMascotMood('idle'), 2000);
            } catch (err) {
              addVocabBtn.innerHTML = '<i class="bi bi-check-circle"></i> Saved';
            }
          }
          return;
        }

        // 5. Expandable Verifier Details Toggle
        const verifierToggle = e.target.closest('[data-toggle-verifier]');
        if (verifierToggle) {
          e.preventDefault();
          const idx = verifierToggle.getAttribute('data-toggle-verifier');
          const details = $(`#verifier-details-${idx}`);
          if (details) {
            const isHidden = details.style.display === 'none';
            details.style.display = isHidden ? 'block' : 'none';
            const chevron = verifierToggle.querySelector('.bi-chevron-down, .bi-chevron-up');
            if (chevron) {
              chevron.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            }
          }
          return;
        }

        // 6. Interactive Inline Mini-Quiz Option
        const optBtn = e.target.closest('.quiz-opt-btn');
        if (optBtn) {
          e.preventDefault();
          const card = optBtn.closest('.card-quiz');
          if (!card || card.dataset.answered === 'true') return;
          card.dataset.answered = 'true';

          const selectedIdx = Number(optBtn.getAttribute('data-opt-idx'));
          const correctIdx = Number(card.getAttribute('data-correct') || 0);
          const explanation = card.getAttribute('data-explanation') || '';
          const feedbackEl = card.querySelector('.quiz-feedback');

          const allOpts = card.querySelectorAll('.quiz-opt-btn');
          allOpts.forEach((b) => (b.disabled = true));

          if (selectedIdx === correctIdx) {
            optBtn.classList.add('correct');
            if (feedbackEl) {
              feedbackEl.className = 'quiz-feedback correct';
              feedbackEl.innerHTML = `<span><i class="bi bi-check-circle-fill"></i> <strong>Spot on!</strong> ${esc(explanation)}</span> <span class="badge" style="background:#10B981;color:#fff">+10 XP</span>`;
              feedbackEl.style.display = 'flex';
            }
            setChatbotMascotMood('celebrating');
            if (window.DragonMascot && window.DragonMascot.playChime) {
              window.DragonMascot.playChime('victory');
            }
            const user = (typeof currentUser !== 'undefined' ? currentUser : null) || window.currentUser;
            if (user) {
              user.xp = (user.xp || 0) + 10;
              updateChatbotAvatar('happy');
            }
          } else {
            optBtn.classList.add('wrong');
            const correctBtn = allOpts[correctIdx];
            if (correctBtn) correctBtn.classList.add('correct');
            if (feedbackEl) {
              feedbackEl.className = 'quiz-feedback wrong';
              feedbackEl.innerHTML = `<span><i class="bi bi-x-circle-fill"></i> <strong>Not quite.</strong> ${esc(explanation)}</span>`;
              feedbackEl.style.display = 'flex';
            }
            setChatbotMascotMood('thinking');
          }
          setTimeout(() => setChatbotMascotMood('idle'), 2400);
          return;
        }
      });
    }

    if (form && input) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';

        chatbotHistory.push({ role: 'user', text });
        renderChatbotMessages();

        startPipelineAnimation();
        setChatbotMascotMood('thinking');

        const msgs = $('#chatbot-drawer-messages');
        const typingEl = document.createElement('div');
        typingEl.className = 'msg-wrap ai';
        typingEl.innerHTML = `<div class="msg ai" style="font-size:13px;color:var(--cream-dim);padding:8px 14px"><i class="bi bi-stars" style="color:#F59E0B"></i> Ignis is analyzing and drafting response…</div>`;
        if (msgs) {
          msgs.appendChild(typingEl);
          msgs.scrollTop = msgs.scrollHeight;
        }

        try {
          const res = await Api.tutorMessage(text);
          if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
          finishPipelineAnimation();
          setChatbotMascotMood('idle');

          let replyText = '';
          let structured = res ? res.structured : null;

          if (res) {
            if (typeof res.reply === 'object' && res.reply !== null) {
              replyText = res.reply.text || res.reply.message || '';
              if (!structured && res.reply.structured) structured = res.reply.structured;
            } else if (typeof res.reply === 'string') {
              replyText = res.reply;
            } else if (typeof res.message === 'string') {
              replyText = res.message;
            } else if (typeof res.text === 'string') {
              replyText = res.text;
            }
          }
          if (!replyText) {
            replyText = 'I am here to assist your English learning.';
          }

          chatbotHistory.push({
            role: 'assistant',
            text: replyText,
            structured: structured || null,
            verification: res?.verification || null,
            pipelineRoute: res?.pipelineRoute || null,
            engine: res?.engine || null,
            latencyMs: res?.latencyMs || null,
          });

          try {
            sessionStorage.setItem('lingrow_chatbot_drawer_history', JSON.stringify(chatbotHistory.slice(-25)));
          } catch (_) {}
          renderChatbotMessages();
        } catch (err) {
          if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
          setPipelineStep('hide');
          setChatbotMascotMood('idle');
          chatbotHistory.push({ role: 'assistant', text: 'Sorry, I encountered an error connecting to the AI Tutor. Please try again.' });
          renderChatbotMessages();
        }
      };
    }

    window.addEventListener('lingrow:recording', (e) => {
      isMicRecording = !!e.detail?.recording;
      updateGlobalChatbotVisibility();
    });
  }

  async function loadChatbotHistory() {
    try {
      const hist = await Api.tutorHistory();
      if (Array.isArray(hist) && hist.length) {
        chatbotHistory = hist.slice(-25).map((m) => {
          let t = m.text;
          if (t && typeof t === 'object') t = t.text || t.message || '';
          return {
            role: m.role || 'assistant',
            text: String(t || ''),
            structured: m.structured || null,
            verification: m.verification || null,
            pipelineRoute: m.pipelineRoute || null,
            engine: m.engine || null,
            latencyMs: m.latencyMs || null,
          };
        });
        try {
          sessionStorage.setItem('lingrow_chatbot_drawer_history', JSON.stringify(chatbotHistory));
        } catch (_) {}
      } else {
        const stored = sessionStorage.getItem('lingrow_chatbot_drawer_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          chatbotHistory = (Array.isArray(parsed) ? parsed : []).map((m) => {
            let t = m.text;
            if (t && typeof t === 'object') t = t.text || t.message || '';
            return {
              role: m.role || 'assistant',
              text: String(t || ''),
              structured: m.structured || null,
              verification: m.verification || null,
              pipelineRoute: m.pipelineRoute || null,
              engine: m.engine || null,
              latencyMs: m.latencyMs || null,
            };
          });
        } else {
          chatbotHistory = [];
        }
      }
    } catch (e) {
      const stored = sessionStorage.getItem('lingrow_chatbot_drawer_history');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          chatbotHistory = (Array.isArray(parsed) ? parsed : []).map((m) => {
            let t = m.text;
            if (t && typeof t === 'object') t = t.text || t.message || '';
            return {
              role: m.role || 'assistant',
              text: String(t || ''),
              structured: m.structured || null,
              verification: m.verification || null,
              pipelineRoute: m.pipelineRoute || null,
              engine: m.engine || null,
              latencyMs: m.latencyMs || null,
            };
          });
        } catch (_) {
          chatbotHistory = [];
        }
      } else {
        chatbotHistory = [];
      }
    }
    renderChatbotMessages();
  }

  function formatAssistantMessage(m, index) {
    let structured = m.structured;
    let text = m.text;
    if (text && typeof text === 'object') {
      if (!structured && (text.type || text.diff || text.vocab || text.quiz)) {
        structured = text;
      }
      text = text.text || text.message || '';
    }

    // Client-side JSON fallback parse if structured wasn't populated
    if (!structured && typeof text === 'string' && (text.startsWith('{') || text.includes('```json'))) {
      try {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const raw = match ? match[1].trim() : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
        structured = JSON.parse(raw);
      } catch (_) {}
    }

    let displayText = text;
    let diffHtml = '';
    let vocabHtml = '';
    let quizHtml = '';

    if (structured) {
      if (structured.message) displayText = structured.message;

      // 1. Grammar Diff
      if (structured.diff) {
        const d = structured.diff;
        diffHtml = `
          <div class="card-diff">
            <div class="card-diff-label"><i class="bi bi-spellcheck"></i> Grammar Polish</div>
            <div class="card-diff-content">
              <span class="diff-del">${esc(d.original || '')}</span>
              <span class="diff-ins">${esc(d.corrected || '')}</span>
            </div>
            ${d.rule ? `<div class="diff-rule"><i class="bi bi-lightbulb-fill"></i> ${esc(d.rule)}</div>` : ''}
          </div>
        `;
      }

      // 2. Vocab Card
      if (structured.vocab) {
        const v = structured.vocab;
        vocabHtml = `
          <div class="card-vocab">
            <div class="vocab-header">
              <span class="vocab-word">${esc(v.word || '')}</span>
              <span class="badge" style="background:rgba(245,158,11,0.15);color:#F59E0B;font-size:11px">Vocabulary</span>
            </div>
            ${v.phonetic ? `
              <div class="vocab-phonetic-wrap">
                <span>${esc(v.phonetic)}</span>
                <button type="button" class="vocab-speaker-btn" data-speak-word="${esc(v.word || '')}" title="Listen to pronunciation">
                  <i class="bi bi-volume-up-fill"></i>
                </button>
              </div>
            ` : ''}
            ${v.meaning ? `<div class="vocab-meaning">${esc(v.meaning)}</div>` : ''}
            ${v.example ? `<div class="vocab-example">"${esc(v.example)}"</div>` : ''}
            <button type="button" class="btn-add-forge" data-add-vocab="${esc(v.word || '')}">
              <i class="bi bi-plus-circle-fill"></i> Add to Vocabulary Forge
            </button>
          </div>
        `;
      }

      // 3. Mini-Quiz
      if (structured.quiz && Array.isArray(structured.quiz.options)) {
        const q = structured.quiz;
        const optsHtml = q.options.map((opt, oIdx) => `
          <button type="button" class="quiz-opt-btn" data-msg-idx="${index}" data-opt-idx="${oIdx}">
            <strong>${['A', 'B', 'C', 'D'][oIdx] || oIdx + 1}.</strong> ${esc(opt)}
          </button>
        `).join('');

        quizHtml = `
          <div class="card-quiz" id="quiz-card-${index}" data-correct="${q.answer ?? 0}" data-explanation="${esc(q.explanation || '')}">
            <div class="quiz-question"><i class="bi bi-patch-question-fill" style="color:#8B5CF6"></i> ${esc(q.question || 'Quick Question:')}</div>
            <div class="quiz-options">${optsHtml}</div>
            <div class="quiz-feedback" id="quiz-feedback-${index}" style="display:none"></div>
          </div>
        `;
      }
    }

    // Verifier Badge
    let verifierHtml = '';
    const verifierNotes = structured?.verifierNotes || m.verification?.feedback;
    const isCorrect = m.verification?.isCorrect ?? true;
    if (verifierNotes || m.verification) {
      const verdictText = isCorrect ? 'Verified by DeepSeek Verifier (Pass)' : 'Verified & Refined by Verifier';
      verifierHtml = `
        <div class="verifier-badge-wrap">
          <span class="verifier-badge-pill" data-toggle-verifier="${index}">
            <i class="bi bi-shield-check"></i> ${verdictText} <i class="bi bi-chevron-down" style="font-size:9px"></i>
          </span>
          <div class="verifier-details" id="verifier-details-${index}" style="display:none">
            <div>${esc(verifierNotes || 'Ground truth audit passed without contradictions.')}</div>
            ${m.pipelineRoute ? `<div style="margin-top:4px;font-size:10.5px;opacity:0.8"><i class="bi bi-diagram-3"></i> Route: ${esc(m.pipelineRoute)}${m.latencyMs ? ` • ${m.latencyMs}ms` : ''}</div>` : ''}
          </div>
        </div>
      `;
    }

    const safeBody = esc(displayText || '').replace(/\n/g, '<br>');

    return `
      <div class="msg-wrap ai" style="margin-bottom:12px">
        <div class="msg ai" style="font-size:14px;padding:12px 15px;line-height:1.55;background:var(--panel-2);border:1px solid var(--line);border-radius:14px">
          <div class="msg-content">${safeBody}</div>
          ${diffHtml}
          ${vocabHtml}
          ${quizHtml}
          ${verifierHtml}
        </div>
        <div class="msg-actions-bar">
          <button type="button" class="msg-action-btn" data-copy-msg="${esc(displayText)}" title="Copy message">
            <i class="bi bi-clipboard"></i> Copy
          </button>
          <button type="button" class="msg-action-btn" data-speak-msg="${esc(displayText)}" title="Listen to Ignis">
            <i class="bi bi-volume-up"></i> Speak
          </button>
        </div>
      </div>
    `;
  }

  function renderChatbotMessages() {
    const msgs = $('#chatbot-drawer-messages');
    if (!msgs) return;
    if (!chatbotHistory.length) {
      msgs.innerHTML = `
        <div style="text-align:center;padding:28px 12px;color:var(--cream-dim)">
          <div style="font-size:36px;margin-bottom:8px">🐉</div>
          <div style="font-weight:700;font-size:15px;color:var(--color-text);margin-bottom:4px">Greetings from Ignis!</div>
          <div style="font-size:13px;line-height:1.5;max-width:320px;margin:0 auto">I am your dragon mentor and language coach. Ask me to review grammar, explain vocabulary words, or quiz you on common idioms!</div>
        </div>
      `;
      return;
    }

    msgs.innerHTML = chatbotHistory.map((m, idx) => {
      if (m.role === 'user') {
        let t = m.text;
        if (t && typeof t === 'object') t = t.text || t.message || '';
        const safeText = esc(t || '').replace(/\n/g, '<br>');
        return `
          <div class="msg-wrap user" style="margin-bottom:8px">
            <div class="msg user" style="font-size:14px;padding:10px 14px;line-height:1.5">
              ${safeText}
            </div>
          </div>
        `;
      }
      return formatAssistantMessage(m, idx);
    }).join('');

    setTimeout(() => {
      msgs.scrollTop = msgs.scrollHeight;
    }, 50);
  }

  updateGlobalChatbotVisibility();
}
