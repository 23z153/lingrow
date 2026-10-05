window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
var VIEW_RENDERERS = window.VIEW_RENDERERS;

VIEW_RENDERERS['a-users'] = async (mount) => {
  let users = [];
  try {
    const res = await Api.adminUsers();
    users = Array.isArray(res) ? res : [];
  } catch (err) {
    console.error('Failed to load admin users:', err);
    throw err;
  }
  mount.innerHTML = `
    <div class="row" style="margin-bottom:16px">
      <button class="btn btn-primary btn-sm" id="new-user-btn">${ICONS.userplus} New user</button>
      <button class="btn btn-ghost btn-sm" id="bulk-user-btn">${ICONS.upload} Bulk import CSV</button>
      <div class="spacer"></div>
      <input type="search" id="user-search" placeholder="Search users…" style="width:220px">
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th></th></tr></thead>
          <tbody id="user-rows"></tbody>
        </table>
      </div>
    </div>
    <div id="admin-modal-root"></div>
  `;
  function renderRows(list){
    const tbody = $('#user-rows'); tbody.innerHTML='';
    (list || []).forEach(u=>{
      const status = u.status || 'Active';
      tbody.insertAdjacentHTML('beforeend', `
        <tr class="tr-hover">
          <td class="row gap-sm">${avatarHTML(u.name,28)}<span>${esc(u.name)}</span></td>
          <td style="font-size:12.5px;color:var(--cream-dim)">${esc(u.email)}</td>
          <td><span class="pill ${u.role==='admin'?'coral':u.role==='teacher'?'voice':'sprout'}">${u.role}</span></td>
          <td>${esc(u.department||'—')}</td>
          <td><span class="pill ${status==='Active'?'sprout':'coral'}">${status}</span></td>
          <td class="row gap-sm">
            <button class="btn btn-ghost btn-sm" data-toggle="${u._id}" data-status="${status}">${status==='Active'?'Suspend':'Reactivate'}</button>
            <button class="btn btn-danger btn-sm" data-delete="${u._id}">Delete</button>
          </td>
        </tr>`);
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
  let grammarTopics = [];
  try {
    const [stats, gTopics] = await Promise.all([
      Api.getQuestionBankStats(),
      Api.adminGrammarTopics(),
    ]);
    qbStats = stats;
    grammarTopics = gTopics;
  } catch (err) { console.error('Failed to load admin content data', err); }

  const deptRowsHtml = Object.entries(qbStats).map(([dept, s]) => `
    <tr>
      <td><strong>${dept}</strong></td>
      <td><span class="pill sprout">${s.passages} Passages</span></td>
      <td><span class="pill voice">${s.clips} Listening Clips</span></td>
      <td><strong>${s.totalSets} Sets</strong></td>
      <td><span class="pill ${s.totalSets >= 100 ? 'sprout' : 'amber'}">${s.status}</span></td>
    </tr>
  `).join('');

  const grammarRowsHtml = grammarTopics.map(t => `
    <tr class="tr-hover">
      <td><strong>${esc(t.title)}</strong></td>
      <td><span class="pill sprout" style="font-size:11px">${esc(t.category)}</span></td>
      <td><span class="pill voice" style="font-size:10.5px">${t.level}</span></td>
      <td>${t.videoUrl ? `<span class="pill emerald" style="font-size:10.5px">📹 Video Attached</span>` : `<span style="color:var(--cream-faint);font-size:12px">No video</span>`}</td>
      <td><strong>${t.questions.length} MCQs</strong></td>
      <td class="row gap-xs">
        <button class="btn btn-primary btn-sm" data-manage-qb="${t._id}">Manage Question Bank</button>
        <button class="btn btn-ghost btn-sm" data-edit-topic="${t._id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-delete-topic="${t._id}">Delete</button>
      </td>
    </tr>
  `).join('');

  mount.innerHTML = `
    <!-- Beginner Topics & Question Bank Manager -->
    <div class="card" style="margin-bottom:20px;border-left:4px solid var(--sprout)">
      <div class="row" style="margin-bottom:12px;align-items:center">
        <div>
          <div class="section-title" style="margin-bottom:2px">${ICONS.book} Beginner &amp; Grammar Topics &amp; 10-Question Bank Manager</div>
          <div style="font-size:12.5px;color:var(--cream-dim)">Manage topics (Tenses, Articles, Prepositions, etc.), video URLs, descriptions, and 4-option MCQ Question Banks.</div>
        </div>
        <div class="spacer"></div>
        <button class="btn btn-primary btn-sm" id="admin-add-grammar-topic-btn">+ Add New Topic</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Topic Title</th><th>Category</th><th>Level</th><th>Video Status</th><th>Question Bank</th><th>Actions</th></tr>
          </thead>
          <tbody>${grammarRowsHtml || '<tr><td colspan="6">No topics found. Click "+ Add New Topic" to create one.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;border-left:4px solid var(--purple);background:var(--purple-glow)">
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
      <div class="table-wrap">
        <table>
          <thead><tr><th>Department</th><th>Read Aloud Bank</th><th>Listening Bank</th><th>Total Question Sets</th><th>Question Bank Status</th></tr></thead>
          <tbody>${deptRowsHtml || '<tr><td colspan="5">Loading stats…</td></tr>'}</tbody>
        </table>
      </div>
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
    <div id="admin-modal-root"></div>
  `;

  // Attach Topic Management Handlers
  $('#admin-add-grammar-topic-btn').onclick = () => openTopicEditModal(null, () => setView('a-content'));

  mount.querySelectorAll('[data-edit-topic]').forEach(btn => {
    btn.onclick = () => {
      const t = grammarTopics.find(x => x._id === btn.dataset.editTopic);
      if (t) openTopicEditModal(t, () => setView('a-content'));
    };
  });

  mount.querySelectorAll('[data-delete-topic]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Are you sure you want to delete this topic and its question bank?')) return;
      try {
        await Api.adminDeleteGrammarTopic(btn.dataset.deleteTopic);
        toast('Topic deleted successfully');
        setView('a-content');
      } catch (err) { apiError(err); }
    };
  });

  mount.querySelectorAll('[data-manage-qb]').forEach(btn => {
    btn.onclick = () => {
      const t = grammarTopics.find(x => x._id === btn.dataset.manageQb);
      if (t) openQuestionBankModal(t, () => setView('a-content'));
    };
  });

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

/* Modal helper for creating/editing beginner topics */
function openTopicEditModal(topic, onSave) {
  const isEdit = !!topic;
  const categories = ['Tenses', 'Subject-Verb Agreement', 'Articles & Nouns', 'Prepositions', 'Common Pitfalls', 'Basic Sentences & Verbs', 'Vocabulary & Idioms'];

  openModal(`
    <h3 style="margin-bottom:16px">${isEdit ? 'Edit Beginner Topic' : 'Create New Beginner Topic'}</h3>
    <div class="col gap-md">
      <div>
        <label class="field-label">Topic Title</label>
        <input type="text" id="mt-title" value="${esc(topic?.title || '')}" placeholder="e.g. Mastering Tenses: Present, Past & Future">
      </div>
      <div class="row gap-md">
        <div style="flex:1">
          <label class="field-label">Category</label>
          <select id="mt-category">
            ${categories.map(c => `<option value="${c}" ${topic?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1">
          <label class="field-label">Level</label>
          <select id="mt-level">
            <option value="Beginner" ${topic?.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
            <option value="Intermediate" ${topic?.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="Advanced" ${topic?.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
          </select>
        </div>
      </div>
      <div>
        <label class="field-label">Video URL (YouTube embed or watch link)</label>
        <input type="text" id="mt-video" value="${esc(topic?.videoUrl || '')}" placeholder="https://www.youtube.com/embed/84jVz0D-KkY">
      </div>
      <div>
        <label class="field-label">Topic Description</label>
        <textarea id="mt-description" rows="3" placeholder="Overview of topic, learning objectives, and scope…">${esc(topic?.description || '')}</textarea>
      </div>
      <div>
        <label class="field-label">Rule Summary &amp; Grammar Tips</label>
        <textarea id="mt-rules" rows="3" placeholder="Key rules, examples, and bullet points…">${esc(topic?.ruleSummary || '')}</textarea>
      </div>
      <button class="btn btn-primary" id="mt-save-btn" style="margin-top:10px">${isEdit ? 'Save Changes' : 'Create Topic'}</button>
    </div>
  `, () => {
    $('#mt-save-btn').onclick = async () => {
      const payload = {
        title: $('#mt-title').value.trim(),
        category: $('#mt-category').value,
        level: $('#mt-level').value,
        videoUrl: $('#mt-video').value.trim(),
        description: $('#mt-description').value.trim(),
        ruleSummary: $('#mt-rules').value.trim(),
      };
      if (!payload.title || !payload.description || !payload.ruleSummary) {
        toast('Title, Description and Rule Summary are required', 'amber');
        return;
      }
      try {
        if (isEdit) {
          await Api.adminUpdateGrammarTopic(topic._id, payload);
          toast('Topic updated successfully');
        } else {
          await Api.adminCreateGrammarTopic(payload);
          toast('Topic created successfully');
        }
        closeModal();
        if (onSave) onSave();
      } catch (err) { apiError(err); }
    };
  });
}

/* Modal helper for managing Question Bank for a topic */
function openQuestionBankModal(topic, onChange) {
  function renderContent() {
    const qListHtml = topic.questions.map((q, idx) => `
      <div class="card" style="padding:14px;margin-bottom:10px;border-left:3px solid var(--sprout);background:rgba(255,255,255,0.02)">
        <div class="row gap-xs" style="align-items:flex-start;margin-bottom:6px">
          <span class="pill sprout" style="font-size:10.5px">Q${idx + 1}</span>
          <strong style="font-size:14px;flex:1">${esc(q.question)}</strong>
          <button class="btn btn-danger btn-sm" style="padding:2px 8px;font-size:11px" data-del-q="${q._id}">Delete</button>
        </div>
        <div style="font-size:12.5px;color:var(--cream-dim);margin-bottom:6px">
          Options: ${q.options.map((opt, oIdx) => `<span style="${oIdx === q.correctAnswer ? 'color:var(--emerald);font-weight:700' : ''}">${['A','B','C','D'][oIdx]}: ${esc(opt)}</span>`).join(' · ')}
        </div>
        <div style="font-size:12px;color:var(--cream-faint)">💡 Explanation: ${esc(q.explanation)}</div>
      </div>
    `).join('');

    openModal(`
      <h3 style="margin-bottom:6px">Question Bank: ${esc(topic.title)}</h3>
      <p style="font-size:12.5px;color:var(--cream-dim);margin-bottom:14px">Total Questions in Bank: <strong>${topic.questions.length}</strong> (Students take 10 randomized MCQs per test attempt).</p>

      <div class="card col gap-sm" style="padding:16px;margin-bottom:16px;background:rgba(34,211,238,0.04);border:1px solid var(--cyan)">
        <div style="font-size:14px;font-weight:700;color:var(--cyan)">Import Question File</div>
        <div style="font-size:12.5px;color:var(--cream-dim);line-height:1.5">Upload a CSV or JSON file with question, optionA, optionB, optionC, optionD, correctAnswer, and explanation. Correct answers may use A-D or 0-3.</div>
        <input type="file" id="mq-import-file" accept=".csv,application/json,.json,text/csv">
        <div class="row gap-sm" style="align-items:center;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="mq-import-btn">Import Questions</button>
          <span id="mq-import-status" style="font-size:12px;color:var(--cream-dim)"></span>
        </div>
      </div>

      <!-- Add New Question Form -->
      <div class="card col gap-sm" style="padding:16px;margin-bottom:16px;background:rgba(139,92,246,0.05);border:1px solid var(--purple)">
        <div style="font-size:14px;font-weight:700;color:var(--purple)">+ Add New MCQ Question</div>
        <div>
          <label class="field-label">Question Text</label>
          <input type="text" id="mq-question" placeholder="e.g. She ___ to class every morning.">
        </div>
        <div class="grid grid-2" style="gap:8px">
          <div><label class="field-label">Option A</label><input type="text" id="mq-opt-0" placeholder="Option A text"></div>
          <div><label class="field-label">Option B</label><input type="text" id="mq-opt-1" placeholder="Option B text"></div>
          <div><label class="field-label">Option C</label><input type="text" id="mq-opt-2" placeholder="Option C text"></div>
          <div><label class="field-label">Option D</label><input type="text" id="mq-opt-3" placeholder="Option D text"></div>
        </div>
        <div class="row gap-md">
          <div style="flex:1">
            <label class="field-label">Correct Option</label>
            <select id="mq-correct">
              <option value="0">Option A</option>
              <option value="1">Option B</option>
              <option value="2">Option C</option>
              <option value="3">Option D</option>
            </select>
          </div>
        </div>
        <div>
          <label class="field-label">Explanation</label>
          <input type="text" id="mq-explanation" placeholder="Explanation for correct choice…">
        </div>
        <button class="btn btn-primary btn-sm" id="mq-add-btn" style="margin-top:6px">+ Add Question to Bank</button>
      </div>

      <div style="max-height:280px;overflow-y:auto;padding-right:4px">
        ${qListHtml || '<div style="font-size:13px;color:var(--cream-dim)">No questions in this question bank yet. Add one above!</div>'}
      </div>
    `, () => {
      $('#mq-import-btn').onclick = async () => {
        const file = $('#mq-import-file').files[0];
        const status = $('#mq-import-status');
        if (!file) {
          toast('Choose a CSV or JSON question file first', 'amber');
          return;
        }

        try {
          const questions = await parseQuestionImportFile(file);
          if (!questions.length) throw new Error('No question rows found in this file');
          status.textContent = `Importing ${questions.length} questions…`;
          const res = await Api.adminImportGrammarQuestions(topic._id, questions);
          status.textContent = `Added ${res.created}; skipped ${res.skipped}.`;
          toast(`${res.created} questions added to the bank`, 'sprout');
          closeModal();
          openQuestionBankModal(res.topic, onChange);
          if (onChange) onChange();
        } catch (err) {
          status.textContent = err.message || 'Import failed.';
          apiError(err);
        }
      };

      $('#mq-add-btn').onclick = async () => {
        const question = $('#mq-question').value.trim();
        const options = [
          $('#mq-opt-0').value.trim(),
          $('#mq-opt-1').value.trim(),
          $('#mq-opt-2').value.trim(),
          $('#mq-opt-3').value.trim(),
        ];
        const correctAnswer = parseInt($('#mq-correct').value, 10);
        const explanation = $('#mq-explanation').value.trim();

        if (!question || options.some(o => !o) || !explanation) {
          toast('Question text, all 4 options, and explanation are required', 'amber');
          return;
        }

        try {
          const updatedTopic = await Api.adminAddGrammarQuestion(topic._id, { question, options, correctAnswer, explanation });
          toast('Question added to Question Bank!');
          closeModal();
          openQuestionBankModal(updatedTopic, onChange);
          if (onChange) onChange();
        } catch (err) { apiError(err); }
      };

      document.querySelectorAll('[data-del-q]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Delete this question from question bank?')) return;
          try {
            const updatedTopic = await Api.adminDeleteGrammarQuestion(topic._id, btn.dataset.delQ);
            toast('Question deleted');
            closeModal();
            openQuestionBankModal(updatedTopic, onChange);
            if (onChange) onChange();
          } catch (err) { apiError(err); }
        };
      });
    });
  }

  renderContent();
}

async function parseQuestionImportFile(file) {
  const text = (await file.text()).replace(/^\uFEFF/, '');
  if (file.name.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('JSON files must contain an array of questions');
    return parsed;
  }

  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, (row[index] || '').trim()])));
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

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
        <div style="padding:10px 12px;border-bottom:1px solid var(--line);background:${l.role==='assistant'?'rgba(139,92,246,0.03)':'transparent'}">
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
