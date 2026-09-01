VIEW_RENDERERS['a-users'] = async (mount) => {
  const users = await Api.adminUsers();
  mount.innerHTML = `
    <div class="row" style="margin-bottom:16px">
      <button class="btn btn-primary btn-sm" id="new-user-btn">${ICONS.userplus} New user</button>
      <button class="btn btn-ghost btn-sm" id="bulk-user-btn">${ICONS.upload} Bulk import CSV</button>
      <div class="spacer"></div>
      <input type="search" id="user-search" placeholder="Search users…" style="width:220px">
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th></th></tr></thead>
        <tbody id="user-rows"></tbody>
      </table>
    </div>
    <div id="admin-modal-root"></div>
  `;
  function renderRows(list){
    const tbody = $('#user-rows'); tbody.innerHTML='';
    list.forEach(u=>{
      tbody.appendChild(el(`
        <tr class="tr-hover">
          <td class="row gap-sm">${avatarHTML(u.name,28)}<span>${esc(u.name)}</span></td>
          <td style="font-size:12.5px;color:var(--cream-dim)">${esc(u.email)}</td>
          <td><span class="pill ${u.role==='admin'?'coral':u.role==='teacher'?'voice':'sprout'}">${u.role}</span></td>
          <td>${esc(u.department||'—')}</td>
          <td><span class="pill ${u.status==='Active'?'sprout':'coral'}">${u.status}</span></td>
          <td class="row gap-sm">
            <button class="btn btn-ghost btn-sm" data-toggle="${u._id}" data-status="${u.status}">${u.status==='Active'?'Suspend':'Reactivate'}</button>
            <button class="btn btn-danger btn-sm" data-delete="${u._id}">Delete</button>
          </td>
        </tr>`));
    });
    tbody.querySelectorAll('[data-toggle]').forEach(btn=>{
      btn.onclick = async ()=>{
        try{ await Api.adminSetUserStatus(btn.dataset.toggle, btn.dataset.status==='Active'?'Suspended':'Active'); setView('a-users'); }
        catch(err){ apiError(err); }
      };
    });
    tbody.querySelectorAll('[data-delete]').forEach(btn=>{
      btn.onclick = async ()=>{
        if (!confirm('Delete this user permanently?')) return;
        try{ await Api.adminDeleteUser(btn.dataset.delete); toast('User deleted'); setView('a-users'); }
        catch(err){ apiError(err); }
      };
    });
  }
  renderRows(users);
  $('#user-search').oninput = (e)=>{
    const q = e.target.value.toLowerCase();
    renderRows(users.filter(u=> u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  };

  $('#new-user-btn').onclick = ()=> openModal(`
    <h3 style="margin-bottom:16px">Create user</h3>
    <div class="col gap-md">
      <div><label class="field-label">Name</label><input type="text" id="m-name"></div>
      <div><label class="field-label">Email</label><input type="email" id="m-email"></div>
      <div><label class="field-label">Password</label><input type="password" id="m-password"></div>
      <div><label class="field-label">Role</label><select id="m-role"><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></div>
      <div><label class="field-label">Department</label><input type="text" id="m-dept"></div>
      <button class="btn btn-primary" id="m-submit">Create</button>
    </div>`, ()=>{
      $('#m-submit').onclick = async ()=>{
        try{
          await Api.adminCreateUser({ name:$('#m-name').value, email:$('#m-email').value, password:$('#m-password').value, role:$('#m-role').value, department:$('#m-dept').value });
          closeModal(); toast('User created'); setView('a-users');
        } catch(err){ apiError(err); }
      };
    });

  $('#bulk-user-btn').onclick = ()=> openModal(`
    <h3 style="margin-bottom:10px">Bulk import users</h3>
    <p style="font-size:12.5px;color:var(--cream-dim);margin-bottom:12px">Paste CSV rows: <span class="mono">name,email,password,role,department</span> (one per line, header optional).</p>
    <textarea id="m-csv" rows="8" placeholder="Aarav Krishnan,aarav@college.edu,pass1234,student,CSE"></textarea>
    <button class="btn btn-primary" id="m-bulk-submit" style="margin-top:14px">Import</button>
    <div id="bulk-result" style="margin-top:12px;font-size:13px"></div>`, ()=>{
      $('#m-bulk-submit').onclick = async ()=>{
        const lines = $('#m-csv').value.split('\n').map(l=>l.trim()).filter(Boolean);
        const rows = lines
          .filter(l=> !/^name\s*,/i.test(l))
          .map(l=>{ const [name,email,password,role,department] = l.split(',').map(x=>x?.trim()); return { name, email, password, role, department }; });
        try{
          const res = await Api.adminBulkUsers(rows);
          $('#bulk-result').innerHTML = `Created ${res.created}, skipped ${res.skipped}${res.errors.length?`, ${res.errors.length} errors`:''}.`;
          setView('a-users');
        } catch(err){ apiError(err); }
      };
    });
};

VIEW_RENDERERS['a-content'] = async (mount) => {
  let qbStats = {};
  try {
    qbStats = await Api.getQuestionBankStats();
  } catch (err) { console.error('Failed to load QB stats', err); }

  const deptRowsHtml = Object.entries(qbStats).map(([dept, s]) => `
    <tr>
      <td><strong>${dept}</strong></td>
      <td><span class="pill sprout">${s.passages} Passages</span></td>
      <td><span class="pill voice">${s.clips} Listening Clips</span></td>
      <td><strong>${s.totalSets} Sets</strong></td>
      <td><span class="pill ${s.totalSets >= 100 ? 'sprout' : 'amber'}">${s.status}</span></td>
    </tr>
  `).join('');

  mount.innerHTML = `
    <div class="card" style="margin-bottom:20px;border-left:4px solid var(--sprout);background:rgba(143,209,79,0.04)">
      <div class="row" style="margin-bottom:12px;align-items:center">
        <div>
          <div class="section-title" style="margin-bottom:2px">${ICONS.library} Department Question Bank Manager (50+ Sets Engine)</div>
          <div style="font-size:12.5px;color:var(--cream-dim)">Scrapes and manages technical passages &amp; listening scripts per department for student random sampling.</div>
        </div>
        <div class="spacer"></div>
        <div class="row gap-sm">
          <select id="qb-dept-select" style="width:120px">
            <option value="">All Depts</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
            <option value="EEE">EEE</option>
            <option value="IT">IT</option>
            <option value="MBA">MBA</option>
          </select>
          <button class="btn btn-primary btn-sm" id="qb-run-scraper-btn">${ICONS.activity} Run Department Scraper</button>
        </div>
      </div>
      <div id="qb-scraper-log" style="font-size:12.5px;margin-bottom:12px;color:var(--sprout);font-weight:600"></div>
      <table>
        <thead><tr><th>Department</th><th>Read Aloud Bank</th><th>Listening Bank</th><th>Total Question Sets</th><th>Question Bank Status</th></tr></thead>
        <tbody>${deptRowsHtml || '<tr><td colspan="5">Loading stats…</td></tr>'}</tbody>
      </table>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="section-title">${ICONS.mic} Add Read Aloud passage</div>
        <div class="col gap-md">
          <input type="text" id="c-title" placeholder="Title">
          <select id="c-level"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
          <textarea id="c-text" rows="4" placeholder="Passage text…"></textarea>
          <button class="btn btn-primary btn-sm" id="c-add-passage">Add passage</button>
        </div>
      </div>
      <div class="card">
        <div class="section-title">${ICONS.book} Add vocabulary word</div>
        <div class="col gap-md">
          <input type="text" id="v-word" placeholder="Word">
          <input type="text" id="v-meaning" placeholder="Meaning">
          <input type="text" id="v-example" placeholder="Example sentence">
          <select id="v-level"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
          <button class="btn btn-primary btn-sm" id="c-add-vocab">Add word</button>
        </div>
      </div>
      <div class="card">
        <div class="section-title">${ICONS.podium} Add debate topic</div>
        <div class="col gap-md">
          <input type="text" id="d-topic" placeholder="Debate topic">
          <button class="btn btn-primary btn-sm" id="c-add-debate">Add topic</button>
        </div>
      </div>
      <div class="card">
        <div class="section-title">${ICONS.feather} Add story prompt</div>
        <div class="col gap-md">
          <textarea id="s-prompt" rows="3" placeholder="Story opening…"></textarea>
          <button class="btn btn-primary btn-sm" id="c-add-story">Add prompt</button>
        </div>
      </div>
    </div>
  `;

  $('#qb-run-scraper-btn').onclick = async () => {
    const dept = $('#qb-dept-select').value;
    const btn = $('#qb-run-scraper-btn');
    btn.disabled = true;
    $('#qb-scraper-log').textContent = 'Scraper running… fetching technical & department articles…';
    try {
      const res = await Api.triggerScraper(dept || null);
      toast('Department Scraper executed successfully!');
      $('#qb-scraper-log').textContent = res.message || 'Scrape completed successfully!';
      setTimeout(() => setView('a-content'), 1500);
    } catch (err) {
      apiError(err);
      btn.disabled = false;
      $('#qb-scraper-log').textContent = 'Error running scraper.';
    }
  };
  $('#c-add-passage').onclick = async ()=>{
    try{ await Api.adminAddPassage({ title:$('#c-title').value, level:$('#c-level').value, text:$('#c-text').value }); toast('Passage added'); $('#c-title').value=''; $('#c-text').value=''; }
    catch(err){ apiError(err); }
  };
  $('#c-add-vocab').onclick = async ()=>{
    try{ await Api.adminAddVocab({ word:$('#v-word').value, meaning:$('#v-meaning').value, example:$('#v-example').value, level:$('#v-level').value, partOfSpeech:'adjective' }); toast('Word added'); $('#v-word').value=''; $('#v-meaning').value=''; $('#v-example').value=''; }
    catch(err){ apiError(err); }
  };
  $('#c-add-debate').onclick = async ()=>{
    try{ await Api.adminAddDebateTopic({ topic:$('#d-topic').value }); toast('Topic added'); $('#d-topic').value=''; }
    catch(err){ apiError(err); }
  };
  $('#c-add-story').onclick = async ()=>{
    try{ await Api.adminAddStoryPrompt({ prompt:$('#s-prompt').value }); toast('Prompt added'); $('#s-prompt').value=''; }
    catch(err){ apiError(err); }
  };
};

VIEW_RENDERERS['a-health'] = async (mount) => {
  let stats = { students: 0, teachers: 0, attemptsLast30Days: 0, totalPassages: 0, totalVocab: 0, services: [] };
  let tutorLogs = [];
  let liveTasks = { readAloud: [], situational: [] };

  try {
    const [st, logs, tasks] = await Promise.all([
      Api.adminStats(),
      Api.adminTutorLogs(),
      Api.adminLiveTasks(),
    ]);
    stats = st;
    tutorLogs = logs;
    liveTasks = tasks;
  } catch (err) { console.error('Failed to load admin monitoring data', err); }

  const chatLogsHtml = tutorLogs.length
    ? tutorLogs.map((l) => `
        <div style="padding:10px 12px;border-bottom:1px solid var(--line);background:${l.role==='assistant'?'rgba(143,209,79,0.02)':'transparent'}">
          <div class="row gap-sm" style="margin-bottom:4px;align-items:center">
            <span class="pill ${l.role==='user'?'voice':'sprout'}" style="font-size:10px;font-weight:700">${l.role==='user'?'STUDENT QUESTION':'AI TUTOR RESPONSE'}</span>
            ${l.verification?.verdict ? `<span class="pill ${l.verification.wasCorrected?'amber':l.verification.isCorrect!==false?'sprout':'coral'}" style="font-size:9.5px;font-weight:700">${l.verification.wasCorrected?'🔄 AUTO-CORRECTED':l.verification.isCorrect!==false?'🛡️ VERIFIED':'⚠️ REVISED'}</span>` : ''}
            <strong>${esc(l.userName || 'Student')}</strong>
            <span style="font-size:11.5px;color:var(--cream-dim)">(${esc(l.userEmail || '')})</span>
            <span class="pill amber" style="font-size:10px">${l.department || 'CSE'}</span>
            <div class="spacer"></div>
            <span style="font-size:11px;color:var(--cream-faint)">${timeAgo(l.createdAt)}</span>
          </div>
          <div style="font-size:13px;color:var(--cream-bright);margin-bottom:4px">${esc(l.text)}</div>
          ${l.correction ? `<div style="font-size:12px;color:var(--coral);font-weight:600">💡 Auto-Correction: ${esc(l.correction)}</div>` : ''}
          ${l.sources && l.sources.length > 0 ? `<div style="font-size:11px;color:var(--teal)">🌐 Cited Sources: ${l.sources.map(s => esc(s.title)).join(' · ')}</div>` : ''}
          ${l.liveTaskSnapshot ? `<div style="font-size:11px;color:var(--cream-faint);margin-top:2px">Live Task Snapshot: ${l.liveTaskSnapshot.xp || 0} XP · ${l.liveTaskSnapshot.level || 'Beginner'} · ${l.liveTaskSnapshot.vocabMastered || 0} Vocab Mastered</div>` : ''}
        </div>
      `).join('')
    : '<div style="padding:16px;color:var(--cream-dim);font-size:13px">No student chatbot interactions logged yet.</div>';

  mount.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="card"><div class="eyebrow">Students</div><h2 style="font-size:22px">${stats.students}</h2></div>
      <div class="card"><div class="eyebrow">Teachers</div><h2 style="font-size:22px">${stats.teachers}</h2></div>
      <div class="card"><div class="eyebrow">Attempts (30d)</div><h2 style="font-size:22px">${stats.attemptsLast30Days}</h2></div>
      <div class="card"><div class="eyebrow">Content items</div><h2 style="font-size:22px">${stats.totalPassages + stats.totalVocab}</h2></div>
    </div>

    <div class="card" style="margin-bottom:20px;border-left:4px solid var(--sprout)">
      <div class="row" style="margin-bottom:12px;align-items:center">
        <div>
          <div class="section-title" style="margin:0">${ICONS.message} Live AI Chatbot &amp; Student Task Monitor</div>
          <div style="font-size:12.5px;color:var(--cream-dim)">Real-time feed of all student questions, live task snapshots, and AI responses.</div>
        </div>
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" id="refresh-admin-logs-btn">${ICONS.activity} Refresh Live Logs</button>
      </div>
      <div style="max-height:420px;overflow-y:auto;border:1px solid var(--line);border-radius:8px">
        ${chatLogsHtml}
      </div>
    </div>

    <div class="card">
      <div class="section-title">${ICONS.activity} Service &amp; Private Engine Status</div>
      ${stats.services.map(s=>`
        <div class="row gap-sm" style="padding:10px 0;border-bottom:1px solid var(--line)">
          <span class="status-dot ${s.status.includes('operational')?'ok':s.status.includes('not')?'off':'warn'}"></span>
          <div style="flex:1;font-size:13.5px">${esc(s.name)}</div>
          <div style="font-size:12px;color:var(--cream-faint)">${esc(s.status)}</div>
        </div>`).join('')}
    </div>
  `;

  $('#refresh-admin-logs-btn').onclick = () => setView('a-health');
};

/* modal helper shared across admin views */
function openModal(html, after){
  const root = $('#admin-modal-root') || document.body;
  const overlay = el(`<div class="modal-overlay"><div class="modal">${html}<button class="icon-btn" id="modal-close" style="position:absolute;top:20px;right:20px">${ICONS.x}</button></div></div>`);
  overlay.querySelector('.modal').style.position='relative';
  root.appendChild(overlay);
  $('#modal-close').onclick = closeModal;
  overlay.onclick = (e)=>{ if (e.target===overlay) closeModal(); };
  if (after) after();
}
function closeModal(){ const o = document.querySelector('.modal-overlay'); if (o) o.remove(); }
