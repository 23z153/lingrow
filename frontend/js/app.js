/* ==========================================================================
   LinGrow AI — frontend app logic. Talks to the real backend via Api (js/api.js),
   uses SpeechInput/SpeechOutput (js/speech.js) for real mic capture and TTS.
   ========================================================================== */

window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
var VIEW_RENDERERS = window.VIEW_RENDERERS;
const S = { user: null, view: 'dashboard', cache: {} };

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

/* ---------------------------- NAV DEFINITIONS ---------------------------- */
const LEVEL_RANKS = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };

function getStudentLevel(user) {
  if (!user) return 'Beginner';
  const unlocked = user.unlockedLevels || ['Beginner'];
  if (unlocked.includes('Advanced')) return 'Advanced';
  if (unlocked.includes('Intermediate')) return 'Intermediate';
  if (user.level && LEVEL_RANKS[user.level]) return user.level;
  const xp = user.xp || 0;
  if (xp >= 1500) return 'Advanced';
  if (xp >= 500) return 'Intermediate';
  return 'Beginner';
}

function addStudentXP(amount) {
  if (!S.user || S.user.role !== 'student') return;
  const oldXp = S.user.xp || 0;
  const oldRank = LEVEL_RANKS[getStudentLevel(S.user)] || 1;
  S.user.xp = oldXp + amount;
  if (S.user.xp >= 1500 && (!S.user.level || S.user.level === 'Intermediate')) S.user.level = 'Advanced';
  else if (S.user.xp >= 500 && !S.user.level) S.user.level = 'Intermediate';

  const newRank = LEVEL_RANKS[getStudentLevel(S.user)] || 1;
  renderTopbar();

  // Check if student crossed a dragon evolution stage threshold
  if (window.DragonMascot && window.DragonMascot.checkEvolution) {
    window.DragonMascot.checkEvolution(oldXp, S.user.xp);
  }

  if (newRank > oldRank) {
    toast(`🎉 Leveled up to ${S.user.level}! New practice exercises unlocked!`, 'sprout');
    renderShell();
    initGlobalChatbot();
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
        const isLocked = it.minLevel && it.minLevel !== 'Beginner' && !unlocked.includes(it.minLevel);
        const biome = BIOME_MAP[it.id] || '';
        return { ...it, isLocked, biome };
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
      if (item.dataset.locked === 'true') {
        const reqLevel = item.dataset.minlevel || 'higher';
        const msg = `This realm is protected by ancient dragon runes! Attain ${reqLevel} rank to unseal the gates.`;
        if (window.DragonMascot && window.DragonMascot.say) {
          window.DragonMascot.say(msg, 'thinking');
        } else {
          toast(msg, 'amber');
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
    const evo = window.DragonMascot ? window.DragonMascot.getEvolutionByXp(S.user.xp || 0) : { stage: 2, name: 'Dragon Companion', title: 'Curious Fledgling', percentToNext: 40, xpToNext: 150 };
    const streak = S.user.streak || 0;
    const streakScale = Math.min(1.5, 1 + streak * 0.06);
    right = `
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
    const unlocked = S.user.unlockedLevels && S.user.unlockedLevels.length ? S.user.unlockedLevels : ['Beginner'];
    const allStudentNav = NAV.student.flatMap(g => g.items);
    const item = allStudentNav.find(i => i.id === view);
    if (item && item.minLevel && item.minLevel !== 'Beginner' && !unlocked.includes(item.minLevel)) {
      const prevTier = item.minLevel === 'Advanced' ? 'Intermediate' : 'Beginner';
      toast(`🔒 ${item.label} is locked in the ${item.minLevel} tier! Complete 4 ${prevTier} activities to unlock.`, 'coral');
      view = 'dashboard';
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
  initGlobalChatbot();
  const loginScreen = $('#login-screen');
  if (loginScreen) {
    loginScreen.innerHTML = '';
    loginScreen.classList.add('hidden');
    loginScreen.style.display = 'none';
  }
  $('#app').classList.add('active');
  renderShell();
  if (window.DragonMascot && window.DragonMascot.initFloatingCompanion) {
    window.DragonMascot.initFloatingCompanion(S.user);
  }
  const home = S.user.role === 'student' ? 'dashboard' : S.user.role === 'teacher' ? 't-dashboard' : 'a-users';
  const hashView = (location.hash || '').replace(/^#/, '').trim();
  const sessionView = sessionStorage.getItem('lingrow_current_view');
  let targetView = home;
  if (hashView && VIEW_RENDERERS[hashView]) {
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
  const isTutorPage = currentView === 'tutor';
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

    if (form && input) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';

        chatbotHistory.push({ role: 'user', text });
        renderChatbotMessages();

        const msgs = $('#chatbot-drawer-messages');
        const typingEl = document.createElement('div');
        typingEl.className = 'msg-wrap ai';
        typingEl.innerHTML = `<div class="msg ai" style="font-size:13px;color:var(--cream-dim);padding:8px 14px">AI Tutor is thinking…</div>`;
        if (msgs) {
          msgs.appendChild(typingEl);
          msgs.scrollTop = msgs.scrollHeight;
        }

        try {
          const res = await Api.tutorMessage(text);
          if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
          let replyText = '';
          if (res) {
            if (typeof res.reply === 'object' && res.reply !== null) {
              replyText = res.reply.text || res.reply.message || '';
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
          chatbotHistory.push({ role: 'assistant', text: replyText });
          try {
            sessionStorage.setItem('lingrow_chatbot_drawer_history', JSON.stringify(chatbotHistory.slice(-25)));
          } catch (_) {}
          renderChatbotMessages();
        } catch (err) {
          if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
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
          return { role: m.role || 'assistant', text: String(t || '') };
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
            return { role: m.role || 'assistant', text: String(t || '') };
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
            return { role: m.role || 'assistant', text: String(t || '') };
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

  function renderChatbotMessages() {
    const msgs = $('#chatbot-drawer-messages');
    if (!msgs) return;
    if (!chatbotHistory.length) {
      msgs.innerHTML = `
        <div style="text-align:center;padding:28px 12px;color:var(--cream-dim)">
          <div style="font-size:32px;margin-bottom:8px">👋</div>
          <div style="font-weight:700;font-size:15px;color:var(--color-text);margin-bottom:4px">Welcome to your AI Tutor!</div>
          <div style="font-size:13px;line-height:1.5">Ask questions about grammar, vocabulary, pronunciation, or practice English conversation.</div>
        </div>
      `;
      return;
    }

    msgs.innerHTML = chatbotHistory.map((m) => {
      let t = m.text;
      if (t && typeof t === 'object') t = t.text || t.message || '';
      const safeText = esc(t || '').replace(/\n/g, '<br>');
      return `
        <div class="msg-wrap ${m.role === 'user' ? 'user' : 'ai'}" style="margin-bottom:8px">
          <div class="msg ${m.role === 'user' ? 'user' : 'ai'}" style="font-size:14px;padding:10px 14px;line-height:1.5">
            ${safeText}
          </div>
        </div>
      `;
    }).join('');
    setTimeout(() => {
      msgs.scrollTop = msgs.scrollHeight;
    }, 50);
  }

  updateGlobalChatbotVisibility();
}
