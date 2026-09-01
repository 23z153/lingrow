/* ==========================================================================
   LinGrow AI — frontend app logic. Talks to the real backend via Api (js/api.js),
   uses SpeechInput/SpeechOutput (js/speech.js) for real mic capture and TTS.
   ========================================================================== */

const S = { user: null, view: 'dashboard', cache: {} };

function $(sel, root=document){ return root.querySelector(sel); }
function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }
function esc(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg, kind='sprout'){
  const wrap = $('#toast-wrap');
  const t = el(`<div class="toast"><span style="color:var(--${kind})">${ICONS.check}</span><span>${esc(msg)}</span></div>`);
  wrap.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(6px)'; t.style.transition='all .25s ease'; setTimeout(()=>t.remove(),250); }, 3200);
}
function apiError(err){ toast(err.message || 'Something went wrong', 'coral'); console.error(err); }
const AVATAR_COLORS = ['#8FD14F','#8C7BFF','#FF7A59','#F4B740','#5FA83A'];
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return h; }
function initials(name){ return (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function avatarHTML(name, size=38){
  const c = AVATAR_COLORS[Math.abs(hashStr(name||''))%AVATAR_COLORS.length];
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${c};font-size:${size*0.36}px">${initials(name)}</div>`;
}
function levelColor(level){ return level==='Beginner' ? 'sprout' : level==='Intermediate' ? 'amber' : 'voice'; }
function scoreColor(s){ return s>=80?'var(--sprout)': s>=60?'var(--amber)':'var(--coral)'; }
function timeAgo(iso){
  const d = (Date.now() - new Date(iso).getTime())/1000;
  if (d<60) return 'just now';
  if (d<3600) return Math.floor(d/60)+'m ago';
  if (d<86400) return Math.floor(d/3600)+'h ago';
  return Math.floor(d/86400)+'d ago';
}

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
        <div class="brand-mark">${ICONS.mic}</div>
        <div><div class="brand-name">LinGrow AI</div><div class="brand-sub">Speaking Practice Platform</div></div>
      </div>
      <div>
        <div class="login-tagline">Speak more.<br/>Hesitate less.<br/>Grow every day.</div>
        <div class="login-wave-art" id="login-wave"></div>
      </div>
      <div style="font-size:12px;color:var(--cream-faint);line-height:1.6;max-width:320px">
        Full-stack build: Node.js/Express API, MongoDB database, JWT auth, and Claude-powered AI tutoring &amp; scoring. Mic input and audio playback use your browser's built-in speech engine.
      </div>
    </div>
    <div class="login-form-side">
      <div class="role-tabs" id="role-tabs">
        ${['student','teacher','admin'].map(r=>`<div class="role-tab ${r===loginRole?'active':''}" data-role="${r}">${r[0].toUpperCase()+r.slice(1)}</div>`).join('')}
      </div>
      <div id="login-error">${verifyNoticeHTML}</div>
      <form id="auth-form" class="col gap-md">
        ${loginMode==='register' ? `
        <div><label class="field-label">Full name</label><input type="text" id="f-name" placeholder="Aarav Krishnan" required></div>
        ` : ''}
        <div><label class="field-label">Email</label><input type="email" id="f-email" placeholder="you@college.edu" required></div>
        <div><label class="field-label">Password</label><input type="password" id="f-password" placeholder="••••••••" required></div>
        ${loginMode==='register' ? `
        <div><label class="field-label">Department</label><input type="text" id="f-dept" placeholder="CSE"></div>
        ` : ''}
        <button class="btn btn-primary" type="submit" style="width:100%;margin-top:6px" id="auth-submit">
          ${loginMode==='login' ? 'Sign in' : 'Create account'} ${ICONS.arrowRight}
        </button>
      </form>
      <div class="form-switch">
        ${loginMode==='login' ? `New here? <b id="to-register">Create an account</b>` : `Already have an account? <b id="to-login">Sign in</b>`}
      </div>
      <div class="demo-note">
        <b style="color:var(--cream)">Demo logins</b> (after running <code>npm run seed</code> on the backend):<br/>
        student@lingrow.demo &middot; teacher@lingrow.demo &middot; admin@lingrow.demo — password: <code>password123</code>
      </div>
    </div>
  </div>`;

  const waveEl = $('#login-wave');
  for(let i=0;i<24;i++){
    const h = 14 + Math.abs(Math.sin(i*0.5))*56;
    waveEl.appendChild(el(`<span style="height:${h}px;animation-delay:${(i*0.06).toFixed(2)}s"></span>`));
  }

  $all2('#role-tabs .role-tab').forEach(tab=>{
    tab.onclick = ()=>{ loginRole = tab.dataset.role; renderLogin(); };
  });
  const toReg = $('#to-register'); if (toReg) toReg.onclick = ()=>{ loginMode='register'; renderLogin(); };
  const toLog = $('#to-login'); if (toLog) toLog.onclick = ()=>{ loginMode='login'; renderLogin(); };

  $('#auth-form').onsubmit = async (e)=>{
    e.preventDefault();
    const btn = $('#auth-submit'); btn.disabled = true;
    $('#login-error').innerHTML = '';
    try{
      let res;
      if (loginMode==='login'){
        res = await Api.login({ email: $('#f-email').value, password: $('#f-password').value });
      } else {
        res = await Api.register({
          name: $('#f-name').value, email: $('#f-email').value, password: $('#f-password').value,
          role: loginRole, department: $('#f-dept') ? $('#f-dept').value : '',
        });
      }
      Api.setToken(res.token);
      S.user = res.user;
      enterApp();
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
  loginMode='login';
  renderLogin();
}

/* ---------------------------- NAV DEFINITIONS ---------------------------- */
const NAV = {
  student: [
    { group:'Practice', items:[
      {id:'dashboard', label:'Dashboard', icon:'dashboard', minXP: 0},
      {id:'grammar', label:'Grammar Practice', icon:'edit', minLevel:'Beginner', minXP: 0},
      {id:'situational', label:'Daily Situational Phrases', icon:'message', minLevel:'Beginner', minXP: 0},
      {id:'read-aloud', label:'Read Aloud', icon:'mic', minLevel:'Intermediate', minXP: 100},
      {id:'vocabulary', label:'Vocabulary', icon:'book', minLevel:'Intermediate', minXP: 150},
      {id:'listening', label:'Listening', icon:'headphones', minLevel:'Intermediate', minXP: 200},
      {id:'peer', label:'Peer Practice', icon:'users', minLevel:'Intermediate', minXP: 300},
      {id:'story', label:'Story Continuation', icon:'feather', minLevel:'Advanced', minXP: 500},
      {id:'debate', label:'Debate Practice', icon:'podium', minLevel:'Advanced', minXP: 750},
    ]},
    { group:'Social & Growth', items:[
      {id:'tutor', label:'AI Tutor Chat', icon:'message', minXP: 0},
      {id:'tests', label:'Tests', icon:'clipboard', minXP: 0},
      {id:'lessons', label:'Lessons', icon:'library', minXP: 0},
      {id:'progress', label:'Progress & Badges', icon:'trophy', minXP: 0},
    ]},
  ],
  teacher: [
    { group:'Teaching', items:[
      {id:'t-dashboard', label:'Class Overview', icon:'grid'},
      {id:'t-tests', label:'Tests', icon:'clipboard'},
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
  'dashboard':['Dashboard','Your practice at a glance'],
  'read-aloud':['Read Aloud','Pronunciation & fluency practice'],
  'vocabulary':['Vocabulary','Build your working vocabulary'],
  'grammar':['Grammar Practice','Master essential English grammar with interactive beginner exercises'],
  'situational':['Daily Situational Phrases','Master real-life campus & professional English conversations'],
  'listening':['Listening Comprehension','Train your ear for natural speech'],
  'story':['Story Continuation','Advanced — improvisation & creativity'],
  'debate':['Debate Practice','Advanced — argument & persuasion'],
  'peer':['Peer Practice','Talk to a real classmate, voice-anonymized'],
  'tutor':['AI Tutor Chat','Free-form conversation practice'],
  'tests':['Tests','Assessments assigned by your teacher'],
  'lessons':['Lessons','Structured curriculum'],
  'progress':['Progress & Badges','Your growth over time'],
  't-dashboard':['Class Overview','Monitor your students'],
  't-tests':['Tests','Create and manage assessments'],
  'a-users':['User Management','Create, import and manage accounts'],
  'a-content':['Content Library','Passages, vocabulary, topics & prompts'],
  'a-health':['System Health','Service status & platform stats'],
};

function renderShell(){
  const role = S.user.role;
  const userXP = S.user.xp || 0;
  const sidebar = $('#sidebar');
  sidebar.innerHTML = `
    <div class="brand">
      <div class="brand-mark">${ICONS.mic}</div>
      <div><div class="brand-name">LinGrow AI</div><div class="brand-sub">${role}</div></div>
    </div>
    ${NAV[role].map(g=>`
      <div class="nav-group-label">${g.group}</div>
      ${g.items.map(it=> {
        const isLocked = role === 'student' && it.minXP && userXP < it.minXP;
        return `
          <div class="nav-item ${isLocked ? 'locked' : ''}" data-view="${it.id}">
            <span>${isLocked ? '&#x1F512;' : ICONS[it.icon]}</span>
            <span style="flex:1">${it.label}</span>
            ${isLocked ? `<span class="pill" style="font-size:9px;padding:2px 5px;color:var(--cream-faint)">${it.minLevel}</span>` : it.badge ? `<span class="pill sprout" style="font-size:9.5px;padding:2px 6px;margin-left:4px">${it.badge}</span>` : ''}
          </div>
        `;
      }).join('')}
    `).join('')}
    <div class="sidebar-footer">
      <div class="user-chip" id="logout-trigger" style="cursor:pointer">
        ${avatarHTML(S.user.name)}
        <div><div class="user-name">${esc(S.user.name)}</div><div class="user-role">Sign out</div></div>
      </div>
    </div>
  `;
  $all2('.nav-item', sidebar).forEach(item=>{
    item.onclick = ()=> setView(item.dataset.view);
  });
  $('#logout-trigger').onclick = logout;
}

function renderTopbar(){
  const [title, sub] = VIEW_TITLES[S.view] || ['',''];
  const topbar = $('#topbar');
  let right = '';
  if (S.user.role === 'student'){
    right = `
      <div class="streak-chip">${ICONS.flame}<span>${S.user.streak||0} day streak</span></div>
      <div class="xp-chip">${ICONS.bolt}<span>${S.user.xp||0} XP</span></div>
    `;
  }
  const banner = !S.user.emailVerified ? `
    <div id="verify-banner" style="grid-column:1/-1;background:#fff8e1;color:#7a5b00;border:1px solid #f0d98a;border-radius:8px;padding:8px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;font-size:13px">
      <span>Verify your email to keep full access to your account.</span>
      <b id="verify-resend-trigger" style="cursor:pointer;text-decoration:underline">Resend link</b>
      <span id="verify-resend-status" style="opacity:.8"></span>
    </div>` : '';
  topbar.innerHTML = `
    ${banner}
    <div style="display:flex;align-items:center;width:100%">
      <div><div class="topbar-title">${title}</div><div class="topbar-sub">${sub}</div></div>
      <div class="spacer"></div>
      ${right}
    </div>
  `;
  const resendTrigger = $('#verify-resend-trigger');
  if (resendTrigger) {
    resendTrigger.onclick = async () => {
      const status = $('#verify-resend-status');
      status.textContent = 'Sending…';
      try {
        const res = await Api.resendVerification();
        status.textContent = res.devVerifyUrl ? 'Sent (dev mode — check the server console for the link).' : 'Sent — check your inbox.';
      } catch (e) {
        status.textContent = e.message || 'Could not resend right now.';
      }
    };
  }
}

function markActiveNav(){
  $all2('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.view === S.view));
}

async function setView(view){
  S.view = view;
  markActiveNav();
  renderTopbar();
  const mount = $('#view-inner');

  // Level gating check for student role
  if (S.user.role === 'student') {
    const allStudentNav = NAV.student.flatMap(g => g.items);
    const item = allStudentNav.find(i => i.id === view);
    const userXP = S.user.xp || 0;
    if (item && item.minXP && userXP < item.minXP) {
      const title = VIEW_TITLES[view]?.[0] || item.label;
      renderLockedModuleView(mount, title, item.minLevel, item.minXP);
      return;
    }
  }

  mount.innerHTML = `<div class="empty-state">${wave(6)}<div style="margin-top:14px">Loading…</div></div>`;
  try {
    await VIEW_RENDERERS[view](mount);
  } catch (err) {
    apiError(err);
    mount.innerHTML = `<div class="empty-state">Couldn't load this view. Is the backend running at ${API_BASE || location.origin}?</div>`;
  }
}

async function enterApp(){
  $('#login-screen').innerHTML = '';
  $('#app').classList.add('active');
  renderShell();
  const home = S.user.role === 'student' ? 'dashboard' : S.user.role === 'teacher' ? 't-dashboard' : 'a-users';
  await setView(home);
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
  renderLogin();
  await handleEmailVerificationLink();
  const resumed = await tryResumeSession();
  if (resumed) enterApp();
  else if (S.verifyEmailNotice) renderLogin(); // show the verification result on the login screen if not signed in
});
