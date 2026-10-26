window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
var VIEW_RENDERERS = window.VIEW_RENDERERS;

VIEW_RENDERERS['t-dashboard'] = async (mount) => {
  const students = await Api.teacherStudents();

  mount.innerHTML = `
    <div class="card">
      <div class="row" style="margin-bottom:14px;flex-wrap:wrap;gap:10px;align-items:center">
        <div class="section-title" style="margin:0">${ICONS.grid} <span id="student-total-count">${students.length}</span> students</div>
        <div class="spacer"></div>
        <div class="row gap-xs" style="align-items:center">
          <label class="field-label" style="margin:0;font-size:12px;color:var(--cream-dim);display:flex;align-items:center;gap:4px">
            <i class="bi bi-filter"></i> Class:
          </label>
          <select id="teacher-class-filter" style="width:160px;min-height:36px;padding:6px 10px;font-size:13px;font-weight:700">
            <option value="">All 10 Classes</option>
            <option value="CSE-A">CSE-A</option>
            <option value="CSE-B">CSE-B</option>
            <option value="CSE-C">CSE-C</option>
            <option value="IT-A">IT-A</option>
            <option value="IT-B">IT-B</option>
            <option value="MECHANICAL">MECHANICAL</option>
            <option value="CIVIL">CIVIL</option>
            <option value="ECE-A">ECE-A</option>
            <option value="ECE-B">ECE-B</option>
            <option value="EEE">EEE</option>
          </select>
        </div>
        <input type="search" id="student-search" placeholder="Search students…" style="width:200px;min-height:36px;padding:6px 10px;font-size:13px">
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Enrolled Class</th><th>Level</th><th>Streak</th><th>XP</th><th>Status</th><th>Last active</th><th></th></tr></thead>
          <tbody id="student-rows"></tbody>
        </table>
      </div>
    </div>
    <div id="student-detail" style="margin-top:20px"></div>
  `;

  function filterAndRender() {
    const q = ($('#student-search')?.value || '').toLowerCase();
    const batchFilter = $('#teacher-class-filter')?.value || '';
    const filtered = students.filter(s => {
      const matchText = s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchBatch = !batchFilter || (s.batch === batchFilter);
      return matchText && matchBatch;
    });
    renderRows(filtered);
    const countEl = $('#student-total-count');
    if (countEl) countEl.textContent = filtered.length;
  }

  function renderRows(list){
    const tbody = $('#student-rows');
    tbody.innerHTML = '';
    (list || []).forEach(s=>{
      tbody.insertAdjacentHTML('beforeend', `
        <tr class="tr-hover">
          <td class="row gap-sm">${avatarHTML(s.name,28)}<span>${esc(s.name)}</span></td>
          <td><span class="pill voice" style="font-size:11.5px;font-weight:700"><i class="bi bi-mortarboard-fill"></i> ${esc(s.batch || 'Unassigned')}</span></td>
          <td><span class="pill ${levelColor(s.level)}">${s.level}</span></td>
          <td>${s.streak} 🔥</td>
          <td class="mono">${s.xp}</td>
          <td><span class="pill ${s.status==='Active'?'sprout':'coral'}">${s.status}</span></td>
          <td style="font-size:12px;color:var(--cream-faint)">${timeAgo(s.updatedAt)}</td>
          <td><button class="btn btn-ghost btn-sm" data-view-student="${s._id}">View</button></td>
        </tr>`);
    });
    tbody.querySelectorAll('[data-view-student]').forEach(btn=>{
      btn.onclick = ()=> openStudentDetail(btn.dataset.viewStudent);
    });
  }
  renderRows(students);
  $('#student-search').oninput = filterAndRender;
  $('#teacher-class-filter').onchange = filterAndRender;
};

/* =============================== TESTS =================================
   Teacher builds a test by picking a topic; the backend auto-pulls that
   many questions from the grammar question bank for that topic/category.
   ========================================================================= */
VIEW_RENDERERS['t-tests'] = async (mount) => {
  const [tests, topicsData, classesData] = await Promise.all([
    Api.teacherTests(),
    Api.teacherTopics().catch(() => ({ topics: [], grouped: {} })),
    Api.teacherClasses().catch(() => ({ assignedClasses: ['CSE-A', 'CSE-B', 'CSE-C', 'IT-A', 'IT-B', 'MECHANICAL', 'CIVIL', 'ECE-A', 'ECE-B', 'EEE'], classList: [] })),
  ]);
  renderTeacherTestsView(mount, tests, topicsData, classesData);
};

function renderTeacherTestsView(mount, tests, topicsData = { topics: [], grouped: {} }, classesData = { assignedClasses: [], classList: [] }) {
  const classesList = (classesData.classList && classesData.classList.length > 0)
    ? classesData.classList
    : (classesData.assignedClasses || ['CSE-A', 'CSE-B', 'CSE-C', 'IT-A', 'IT-B', 'MECHANICAL', 'CIVIL', 'ECE-A', 'ECE-B', 'EEE']).map((c) => ({ name: c, studentCount: 0 }));

  const groupedTopics = topicsData.grouped || {};

  mount.innerHTML = `
    <div class="col gap-md">
      <div class="card">
        <div class="row" style="margin-bottom:14px">
          <div class="section-title" style="margin:0">${ICONS.clipboard} Create a test</div>
        </div>
        <form id="create-test-form" class="grid grid-2" style="gap:16px">
          <div>
            <label class="field-label">Test Title</label>
            <input type="text" id="ct-title" placeholder="e.g. Unit 1 Sentence Structure Test" required>
          </div>

          <div>
            <label class="field-label">Topic (Select from 243 Topics in Question Bank)</label>
            <select id="ct-topic" required style="font-weight:600">
              <option value="">-- Choose from 243 Topics --</option>
              ${Object.entries(groupedTopics).map(([unitName, unitTopics]) => `
                <optgroup label="${esc(unitName)}">
                  ${unitTopics.map(t => `<option value="${t.topicId}">${t.topicId}. ${esc(t.title)} (25 questions)</option>`).join('')}
                </optgroup>
              `).join('')}
            </select>
          </div>

          <div style="position:relative">
            <label class="field-label"><i class="bi bi-mortarboard-fill"></i> Select Classes to Assign (Multiple Allowed)</label>
            <div id="class-dropdown-wrapper" style="position:relative">
              <button type="button" id="class-dropdown-trigger" style="width:100%;min-height:42px;padding:8px 12px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;color:var(--cream);display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:13.5px;font-weight:600;text-align:left;transition:border-color .15s ease">
                <span id="class-dropdown-label" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;overflow:hidden">
                  <span style="color:var(--cream-faint)">-- Select One or More Classes --</span>
                </span>
                <i class="bi bi-chevron-down" style="font-size:12px;opacity:0.7;flex-shrink:0;margin-left:8px"></i>
              </button>

              <div id="class-dropdown-menu" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#1E293B;border:1px solid var(--line-strong);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,0.65);z-index:100;max-height:270px;overflow-y:auto;padding:8px">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px 8px;border-bottom:1px solid var(--line);margin-bottom:6px">
                  <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--cyan);cursor:pointer;user-select:none">
                    <input type="checkbox" id="class-select-all" style="accent-color:var(--cyan);width:15px;height:15px;cursor:pointer">
                    Select All Classes
                  </label>
                  <span id="class-selected-counter" style="font-size:11px;color:var(--cream-faint);font-weight:600">0 selected</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:2px">
                  ${classesList.map(c => `
                    <label class="class-dropdown-item" style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:8px;cursor:pointer;user-select:none;transition:background .12s ease">
                      <div style="display:flex;align-items:center;gap:9px">
                        <input type="checkbox" value="${esc(c.name)}" class="class-checkbox" style="accent-color:var(--purple);width:16px;height:16px;cursor:pointer">
                        <span style="font-size:13.5px;font-weight:700;color:var(--cream)">${esc(c.name)}</span>
                      </div>
                      <span style="font-size:11.5px;color:var(--cream-faint)">${c.studentCount} ${c.studentCount === 1 ? 'student' : 'students'}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="field-label">Number of Questions (Each topic has 25 questions)</label>
            <input type="number" id="ct-count" min="1" max="25" value="25" required>
          </div>

          <div>
            <label class="field-label">Duration (minutes)</label>
            <input type="number" id="ct-duration" min="1" value="20" required>
          </div>

          <div>
            <label class="field-label">Difficulty / Level</label>
            <select id="ct-level">
              <option value="All">All Levels (Comprehensive)</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div id="ct-bank-hint" style="grid-column:1/-1;font-size:12.5px;color:var(--sprout);font-weight:600"></div>
          <button class="btn btn-primary" type="submit" style="grid-column:1/-1;justify-self:start">Create test ${ICONS.arrowRight}</button>
        </form>
      </div>

      <div class="card">
        <div class="section-title" style="margin-bottom:14px">${ICONS.grid} Your tests</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Topic</th><th>Assigned Classes</th><th>Questions</th><th>Status</th><th>Attempts</th><th>Avg score</th><th></th></tr></thead>
            <tbody id="test-rows"></tbody>
          </table>
        </div>
        ${!tests.length ? `<div class="empty-state">No tests created yet — build one above.</div>` : ''}
      </div>

      <div id="test-results-area"></div>
    </div>
  `;





  function renderRows(list) {
    const tbody = $('#test-rows');
    tbody.innerHTML = '';
    (list || []).forEach(t => {
      const classBadges = (t.batches && t.batches.length)
        ? t.batches.map(b => `<span class="pill voice" style="font-size:10.5px;margin:2px 3px 2px 0;display:inline-block"><i class="bi bi-people-fill"></i> ${esc(b)}</span>`).join('')
        : (t.batch ? `<span class="pill voice" style="font-size:10.5px"><i class="bi bi-people-fill"></i> ${esc(t.batch)}</span>` : '<span class="pill" style="font-size:10.5px;color:var(--cream-faint)">All Classes</span>');

      tbody.insertAdjacentHTML('beforeend', `
        <tr class="tr-hover">
          <td>${esc(t.title)}</td>
          <td><span class="pill sprout">${esc(t.category)}</span></td>
          <td>${classBadges}</td>
          <td class="mono">${t.questionCount}</td>
          <td><span class="pill ${t.status === 'published' ? 'sprout' : t.status === 'closed' ? 'coral' : ''}">${t.status}</span></td>
          <td class="mono">${t.attempts}</td>
          <td class="mono">${t.avgScore !== null ? t.avgScore + '%' : '—'}</td>
          <td class="row gap-xs">
            <button class="btn btn-ghost btn-sm" data-results="${t._id}">Results</button>
            <button class="btn btn-ghost btn-sm" data-toggle="${t._id}" data-status="${t.status}">${t.status === 'published' ? 'Close' : 'Publish'}</button>
          </td>
        </tr>`);
    });
    tbody.querySelectorAll('[data-results]').forEach(btn => { btn.onclick = () => openTestResults(btn.dataset.results); });
    tbody.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.onclick = async () => {
        const nextStatus = btn.dataset.status === 'published' ? 'closed' : 'published';
        try {
          await Api.updateTest(btn.dataset.toggle, { status: nextStatus });
          toast(nextStatus === 'published' ? 'Test published' : 'Test closed');
          const fresh = await Api.teacherTests();
          renderRows(fresh);
        } catch (err) { apiError(err); }
      };
    });
  }
  renderRows(tests);

  const topicSelect = $('#ct-topic');
  if (topicSelect) {
    topicSelect.onchange = (e) => {
      const tid = Number(e.target.value);
      const allTopics = topicsData.topics || [];
      const chosen = allTopics.find(t => t.topicId === tid);
      if (chosen) {
        $('#ct-bank-hint').innerHTML = `<i class="bi bi-check-circle-fill"></i> Selected: <strong>${esc(chosen.title)}</strong> (${esc(chosen.unit)}) &middot; 25 Questions Available.`;
        if (chosen.level) $('#ct-level').value = chosen.level;
      } else {
        $('#ct-bank-hint').textContent = '';
      }
    };
  }

    // Class Dropdown Multi-Select Logic
  const classTrigger = $('#class-dropdown-trigger');
  const classMenu = $('#class-dropdown-menu');
  const classSelectAll = $('#class-select-all');
  const classCounter = $('#class-selected-counter');
  const classLabel = $('#class-dropdown-label');
  const classCheckboxes = mount.querySelectorAll('.class-checkbox');

  function updateClassSelectionDisplay() {
    const selected = Array.from(classCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
    if (classCounter) classCounter.textContent = `${selected.length} selected`;

    if (classSelectAll) {
      classSelectAll.checked = selected.length === classCheckboxes.length && classCheckboxes.length > 0;
      classSelectAll.indeterminate = selected.length > 0 && selected.length < classCheckboxes.length;
    }

    if (classLabel) {
      if (selected.length === 0) {
        classLabel.innerHTML = '<span style="color:var(--cream-faint)">-- Select One or More Classes --</span>';
      } else if (selected.length === classCheckboxes.length) {
        classLabel.innerHTML = `<span class="pill sprout" style="font-size:11px;padding:2px 8px;margin:0"><i class="bi bi-check-all"></i> All Classes (${selected.length})</span>`;
      } else if (selected.length <= 3) {
        classLabel.innerHTML = selected.map(c => `<span class="pill voice" style="font-size:11px;padding:2px 7px;margin:1px 0"><i class="bi bi-people-fill"></i> ${esc(c)}</span>`).join(' ');
      } else {
        classLabel.innerHTML = `<span class="pill voice" style="font-size:11px;padding:2px 8px"><i class="bi bi-people-fill"></i> ${selected.length} Classes</span> <span style="font-size:11.5px;color:var(--cream-faint);overflow:hidden;text-overflow:ellipsis;max-width:180px;white-space:nowrap">(${esc(selected.join(', '))})</span>`;
      }
    }
  }

  if (classTrigger && classMenu) {
    classTrigger.onclick = (e) => {
      e.stopPropagation();
      const isOpen = classMenu.style.display === 'block';
      classMenu.style.display = isOpen ? 'none' : 'block';
    };

    classMenu.onclick = (e) => {
      e.stopPropagation();
    };

    const docClickHandler = (e) => {
      if (classMenu && !classMenu.contains(e.target) && e.target !== classTrigger) {
        classMenu.style.display = 'none';
      }
    };
    document.addEventListener('click', docClickHandler);
  }

  if (classSelectAll) {
    classSelectAll.onchange = (e) => {
      classCheckboxes.forEach(cb => { cb.checked = e.target.checked; });
      updateClassSelectionDisplay();
    };
  }

  classCheckboxes.forEach(cb => {
    cb.onchange = updateClassSelectionDisplay;
  });

  $('#create-test-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const selectedClasses = Array.from(classCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
      if (selectedClasses.length === 0) {
        toast('Please select at least one class to assign the test to.');
        if (classMenu) classMenu.style.display = 'block';
        btn.disabled = false;
        return;
      }

      const topicId = Number($('#ct-topic').value);
      if (!topicId) {
        toast('Please select a topic from the question bank.');
        btn.disabled = false;
        return;
      }

      const res = await Api.createTest({
        title: $('#ct-title').value,
        topicId,
        level: $('#ct-level').value,
        numQuestions: Number($('#ct-count').value),
        durationMinutes: Number($('#ct-duration').value),
        batches: selectedClasses,
        batch: selectedClasses.join(', '),
      });
      toast(res.message);
      const fresh = await Api.teacherTests();
      renderTeacherTestsView(mount, fresh, topicsData, classesData);
    } catch (err) { apiError(err); btn.disabled = false; }
  };
}

async function openTestResults(testId) {
  const area = $('#test-results-area');
  area.innerHTML = `<div class="empty-state">${wave(5)}</div>`;
  try {
    const { test, attempts, avgScore, totalAttempts, questionStats } = await Api.teacherTestResults(testId);
    area.innerHTML = `
      <div class="card">
        <div class="row" style="margin-bottom:10px">
          <h3 style="margin:0">${esc(test.title)} — Results</h3>
          <div class="spacer"></div>
          <div class="pill amber">${totalAttempts} attempts</div>
          <div class="pill sprout">Avg ${avgScore}%</div>
        </div>
        <div class="grid grid-2" style="align-items:start">
          <div>
            <div class="eyebrow">Student scores</div>
            ${attempts.length ? attempts.map(a => `
              <div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">
                <div style="flex:1;font-size:13px">${esc(a.user?.name || 'Unknown')} <span style="color:var(--cream-faint);font-size:11.5px">${esc(a.user?.batch || '')}</span></div>
                <div class="pill" style="color:${scoreColor(a.score)};border-color:transparent">${a.score}%</div>
              </div>
            `).join('') : `<div class="empty-state">No attempts yet</div>`}
          </div>
          <div>
            <div class="eyebrow">Toughest questions (most missed)</div>
            ${questionStats.slice().sort((a,b)=>b.wrongCount-a.wrongCount).slice(0,8).map(q => `
              <div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:13px">
                <div>${esc(q.question)}</div>
                <div style="font-size:11.5px;color:var(--cream-faint)">Missed by ${q.wrongCount} of ${q.totalAnswered || 0}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    area.scrollIntoView({ behavior: 'smooth' });
  } catch (err) { apiError(err); }
}

async function openStudentDetail(id){
  const detail = $('#student-detail');
  detail.innerHTML = `<div class="empty-state">${wave(5)}</div>`;
  try{
    const { student, readAloud, debates, stories } = await Api.teacherStudentDetail(id);
    detail.innerHTML = `
      <div class="card">
        <div class="row gap-sm" style="margin-bottom:16px">
          ${avatarHTML(student.name, 44)}
          <div><h3>${esc(student.name)}</h3><div style="font-size:12.5px;color:var(--cream-faint)">${esc(student.email)} · ${esc(student.batch||student.department||'')}</div></div>
          <div class="spacer"></div>
          <div class="pill amber">${student.xp} XP</div>
        </div>
        <div class="grid grid-2">
          <div>
            <div class="eyebrow">Read Aloud attempts</div>
            ${readAloud.length ? readAloud.map(a=>`
              <div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">
                <div style="flex:1;font-size:13px">${esc(a.passage?.title||'Passage')}</div>
                <div class="pill" style="color:${scoreColor(a.accuracy)};border-color:transparent">${a.accuracy}%</div>
              </div>
              <textarea placeholder="Add feedback for this attempt…" data-comment-type="readaloud" data-comment-id="${a._id}" style="margin:6px 0 12px">${esc(a.teacherComment||'')}</textarea>
            `).join('') : `<div class="empty-state">No attempts yet</div>`}
          </div>
          <div>
            <div class="eyebrow">Debate attempts</div>
            ${debates.length ? debates.map(a=>`
              <div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">
                <div style="flex:1;font-size:13px">${esc(a.topic?.topic||'Topic')}</div>
                <div class="pill" style="color:${scoreColor(a.scores.overall)};border-color:transparent">${a.scores.overall}</div>
              </div>
              <textarea placeholder="Add feedback for this debate…" data-comment-type="debate" data-comment-id="${a._id}" style="margin:6px 0 12px">${esc(a.teacherComment||'')}</textarea>
            `).join('') : `<div class="empty-state">No attempts yet</div>`}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="save-comments" style="margin-top:10px">Save feedback</button>
      </div>`;
    $('#save-comments').onclick = async ()=>{
      const areas = detail.querySelectorAll('textarea[data-comment-type]');
      try{
        await Promise.all([...areas].map(a=> Api.teacherComment(a.dataset.commentType, a.dataset.commentId, a.value)));
        toast('Feedback saved');
      } catch(err){ apiError(err); }
    };
  } catch(err){ apiError(err); }
}

/* =============================== GD ROOMS ===============================
   Teacher creates Group Discussion (GD) rooms, configures student capacity,
   monitors lobby/live discussion, and views local AI speech reports.
   ========================================================================= */
VIEW_RENDERERS['t-gd'] = async (mount) => {
  let rooms = [];
  try {
    rooms = await Api.getGdRooms();
  } catch (err) {
    rooms = [];
  }

  renderGdView();

  function renderGdView() {
    mount.innerHTML = `
      <div class="col gap-md">
        <!-- Create Room Card -->
        <div class="card">
          <div class="row" style="margin-bottom:14px">
            <div class="section-title" style="margin:0">${ICONS.users} Create a Group Discussion (GD) Room</div>
          </div>
          <form id="create-gd-form" class="grid grid-2" style="gap:14px">
            <div>
              <label class="field-label">Discussion Topic</label>
              <input type="text" id="gd-topic-input" placeholder="e.g., Impact of AI on Modern Engineering Careers" required list="gd-topic-suggestions">
              <datalist id="gd-topic-suggestions">
                <option value="Impact of AI on Modern Careers">
                <option value="Is Remote Work Better Than Office Work?">
                <option value="Campus Placements vs Higher Studies">
                <option value="Climate Change Solutions & Engineering">
                <option value="Ethics of Generative AI Technology">
              </datalist>
            </div>
            <div>
              <label class="field-label">Number of Students Allowed</label>
              <select id="gd-max-students">
                <option value="2">2 Students (Pair Discussion)</option>
                <option value="3">3 Students</option>
                <option value="4" selected>4 Students (Standard GD Group)</option>
                <option value="5">5 Students</option>
                <option value="6">6 Students</option>
                <option value="8">8 Students (Large Panel)</option>
              </select>
            </div>
            <div>
              <label class="field-label">Target Duration (Minutes)</label>
              <select id="gd-duration">
                <option value="3">3 Minutes (Quick Drill)</option>
                <option value="5" selected>5 Minutes (Standard GD)</option>
                <option value="10">10 Minutes (Extended GD)</option>
                <option value="15">15 Minutes (Full Session)</option>
              </select>
            </div>
            <div style="grid-column:1/-1">
              <button class="btn btn-primary" type="submit">${ICONS.plus} Create GD Room &amp; Open Lobby</button>
            </div>
          </form>
        </div>

        <!-- Active & Past GD Rooms Card -->
        <div class="card">
          <div class="section-title" style="margin-bottom:14px">${ICONS.grid} Managed GD Rooms (${rooms.length})</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Participants</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="gd-room-rows">
                ${rooms.map((r) => `
                  <tr class="tr-hover">
                    <td style="font-weight:600;color:#FFFFFF">${esc(r.topic)}</td>
                    <td class="mono">${r.participants?.length || 0} / ${r.maxStudents} Students</td>
                    <td>
                      <span class="pill ${r.status === 'LOBBY' ? 'amber' : r.status === 'IN_PROGRESS' ? 'sprout' : 'voice'}">
                        ${r.status === 'LOBBY' ? '⌛ Lobby Open' : r.status === 'IN_PROGRESS' ? '🔴 Live In-Progress' : '✓ Completed'}
                      </span>
                    </td>
                    <td style="font-size:12.5px;color:var(--cream-dim)">
                      ${(r.participants || []).map((p) => esc(p.name)).join(', ') || 'No students in lobby yet'}
                    </td>
                    <td style="font-size:12px;color:var(--cream-faint)">${timeAgo(r.createdAt)}</td>
                    <td class="row gap-xs">
                      ${r.status === 'LOBBY' ? `
                        <button class="btn btn-primary btn-sm" data-start-gd="${r._id}">▶ Start GD</button>
                      ` : r.status === 'IN_PROGRESS' ? `
                        <button class="btn btn-ghost btn-sm" data-view-gd="${r._id}">👁️ Monitor</button>
                        <button class="btn btn-primary btn-sm" data-end-gd="${r._id}" style="background:var(--coral);border-color:var(--coral)">⏹️ End &amp; AI Report</button>
                      ` : `
                        <button class="btn btn-ghost btn-sm" data-report-gd="${r._id}">📊 AI Report</button>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${!rooms.length ? `<div class="empty-state">No Group Discussion rooms created yet. Use the form above to open a room.</div>` : ''}
        </div>

        <div id="gd-details-area"></div>
      </div>
    `;

    // Attach Event Listeners for Creation
    $('#create-gd-form').onsubmit = async (e) => {
      e.preventDefault();
      const topic = $('#gd-topic-input').value;
      const maxStudents = $('#gd-max-students').value;
      const targetDurationMinutes = $('#gd-duration').value;
      try {
        const newRoom = await Api.createGdRoom({ topic, maxStudents, targetDurationMinutes });
        toast(`Opened GD Room Lobby: "${newRoom.topic}"`, 'sprout');
        rooms = await Api.getGdRooms();
        renderGdView();
      } catch (err) {
        apiError(err);
      }
    };

    // Attach Action Listeners
    mount.querySelectorAll('[data-start-gd]').forEach((btn) => {
      btn.onclick = async () => {
        try {
          await Api.startGdRoom(btn.dataset.startGd);
          toast('Started Group Discussion Session! Students entering room now...', 'sprout');
          rooms = await Api.getGdRooms();
          renderGdView();
        } catch (err) {
          apiError(err);
        }
      };
    });

    mount.querySelectorAll('[data-end-gd]').forEach((btn) => {
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = 'Generating AI Reports...';
        try {
          const finished = await Api.endGdRoom(btn.dataset.endGd);
          toast('GD Session completed! AI reports generated.', 'sprout');
          rooms = await Api.getGdRooms();
          renderGdView();
          renderTeacherGdReport(finished);
        } catch (err) {
          apiError(err);
          btn.disabled = false;
        }
      };
    });

    mount.querySelectorAll('[data-view-gd], [data-report-gd]').forEach((btn) => {
      btn.onclick = async () => {
        const roomId = btn.dataset.viewGd || btn.dataset.reportGd;
        try {
          const room = await Api.getGdRoom(roomId);
          renderTeacherGdReport(room);
        } catch (err) {
          apiError(err);
        }
      };
    });
  }

  function renderTeacherGdReport(room) {
    const area = $('#gd-details-area');
    if (!area) return;

    area.innerHTML = `
      <div class="card card-2" style="margin-top:20px;border:1px solid var(--purple)">
        <div class="row gap-sm" style="margin-bottom:12px;align-items:center">
          <div>
            <h3 style="font-size:20px;margin:0;color:#FFFFFF">📊 Group Discussion AI Report &amp; Class Matrix</h3>
            <div style="font-size:14px;color:var(--cream-dim)">Topic: <b>"${esc(room.topic)}"</b> | Host: ${esc(room.teacher?.name || 'Teacher')}</div>
          </div>
          <div class="spacer"></div>
          <span class="pill sprout">${room.participants?.length || 0} Students in Room</span>
        </div>

        ${room.reports && room.reports.length ? `
          <div class="eyebrow" style="margin-top:14px;margin-bottom:8px">Participant Performance Overview</div>
          <div class="table-wrap" style="margin-bottom:20px">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Overall Score</th>
                  <th>Clarity</th>
                  <th>Grammar</th>
                  <th>Vocabulary</th>
                  <th>Interaction</th>
                </tr>
              </thead>
              <tbody>
                ${room.reports.map((rep) => `
                  <tr>
                    <td style="font-weight:700">${esc(rep.studentName)}</td>
                    <td><span class="pill sprout" style="font-size:13.5px">${rep.overallScore}%</span></td>
                    <td class="mono">${rep.clarityScore}%</td>
                    <td class="mono">${rep.grammarScore}%</td>
                    <td class="mono">${rep.vocabularyScore}%</td>
                    <td class="mono">${rep.interactionScore}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="eyebrow" style="margin-bottom:10px">Individual Student Feedback &amp; Skill Improvement Suggestions</div>
          <div class="col gap-md">
            ${room.reports.map((rep) => `
              <div class="card card-2" style="background:var(--card-bg);border:1px solid var(--line)">
                <div class="row gap-sm" style="margin-bottom:8px;align-items:center">
                  ${avatarHTML(rep.studentName, 32)}
                  <div style="font-size:16px;font-weight:700;color:#FFFFFF">${esc(rep.studentName)}</div>
                  <div class="spacer"></div>
                  <span class="pill amber" style="font-weight:700">Overall: ${rep.overallScore}/100</span>
                </div>

                <!-- Strengths -->
                ${rep.strengths && rep.strengths.length ? `
                  <div style="margin-bottom:10px">
                    <div style="font-size:13px;font-weight:700;color:var(--emerald);margin-bottom:4px">🌟 Key Strengths:</div>
                    <ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--cream)">
                      ${rep.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}

                <!-- Corrections -->
                ${rep.corrections && rep.corrections.length ? `
                  <div style="margin-bottom:10px">
                    <div style="font-size:13px;font-weight:700;color:var(--coral);margin-bottom:4px">✏️ Sentence &amp; Grammar Corrections:</div>
                    ${rep.corrections.map((c) => `
                      <div class="card" style="padding:10px;margin-bottom:6px;background:rgba(244,63,94,0.08);border-left:3px solid var(--coral)">
                        <div style="font-size:13px;color:var(--coral)"><b>Spoken:</b> "${esc(c.original)}"</div>
                        <div style="font-size:13px;color:var(--emerald);margin-top:2px"><b>Improved:</b> "${esc(c.corrected)}"</div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                <!-- Targeted Suggestions -->
                ${rep.suggestions && rep.suggestions.length ? `
                  <div>
                    <div style="font-size:13px;font-weight:700;color:var(--amber);margin-bottom:4px">💡 Skill Improvement Suggestions:</div>
                    <ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--cream)">
                      ${rep.suggestions.map((sug) => `<li>${esc(sug)}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">No AI reports generated yet for this room. End the live session above to process speech analysis.</div>
        `}
      </div>
    `;

    area.scrollIntoView({ behavior: 'smooth' });
  }
};

