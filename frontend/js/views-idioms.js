/* ==========================================================================
   LinGrow AI — Whispering Grove: Idioms & Phrasal Verbs (Level 4-5)
   4-Stage Pedagogical Flow:
   1. Discover: Short dialogue, literal vs. figurative, register, region note, separability
   2. Understand: Contextual MCQ with distractor rationales (LinGrow_QBank style)
   3. Use: Fill-in-the-blank, Sentence Rewrite, and Live Speech Speaking Task
   4. Master: Spaced-repetition review state (New -> Familiar -> Mastered)
   ========================================================================== */

window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};

function escapeHtml(s) {
  if (typeof s !== 'string') {
    if (s && typeof s === 'object' && s.text) s = s.text;
    else s = String(s ?? '');
  }
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
window.escapeHtml = escapeHtml;

VIEW_RENDERERS['idioms'] = async (mount) => {
  let stats = { total: 0, mastered: 0, familiar: 0, new: 0, reviewDue: 0, idiomsCount: 0, phrasalVerbsCount: 0 };
  let groupedVerbs = [];
  let expressions = [];

  try {
    const [sData, gData, eData] = await Promise.all([
      Api.getIdiomsStats().catch(() => ({})),
      Api.getGroupedBaseVerbs().catch(() => []),
      Api.getIdioms().catch(() => []),
    ]);
    stats = { ...stats, ...sData };
    groupedVerbs = Array.isArray(gData) ? gData : [];
    expressions = Array.isArray(eData) ? eData : [];
  } catch (err) {
    console.error('Error loading idioms data:', err);
  }

  renderIdiomsGrove(mount, expressions, stats, groupedVerbs);
};

function renderIdiomsGrove(mount, allExpressions, stats, groupedVerbs) {
  let currentFilter = {
    type: 'all',
    level: 'all',
    baseVerb: 'all',
    mastery: 'all',
    search: '',
  };

  function getFilteredItems() {
    return allExpressions.filter((item) => {
      if (currentFilter.type !== 'all' && item.type !== currentFilter.type) return false;
      if (currentFilter.level !== 'all' && item.level !== currentFilter.level) return false;
      if (currentFilter.baseVerb !== 'all' && (item.baseVerb || '').toLowerCase() !== currentFilter.baseVerb.toLowerCase()) return false;
      if (currentFilter.mastery !== 'all' && (item.userProgress?.mastery || 'new') !== currentFilter.mastery) return false;
      if (currentFilter.search) {
        const q = currentFilter.search.toLowerCase();
        const expr = (item.expression || '').toLowerCase();
        const fig = (item.stage1_discover?.figurativeMeaning || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        if (!expr.includes(q) && !fig.includes(q) && !cat.includes(q)) return false;
      }
      return true;
    });
  }

  function renderGroveView() {
    const items = getFilteredItems();
    const baseVerbsList = ['all', ...groupedVerbs.map((g) => g.baseVerb)];

    mount.innerHTML = `
      <div class="col gap-lg" id="idioms-main-container">
        <!-- Hero Banner -->
        <div class="card col gap-sm" style="background: linear-gradient(135deg, rgba(20, 45, 30, 0.85) 0%, rgba(12, 22, 18, 0.95) 100%); border: 1px solid rgba(80, 200, 120, 0.35); position: relative; overflow: hidden; padding: 24px;">
          <div style="position: absolute; right: -20px; top: -20px; font-size: 140px; opacity: 0.08; pointer-events: none;">🌿</div>
          <div class="row gap-sm" style="align-items: center;">
            <span class="pill sprout" style="font-weight: 700; letter-spacing: 0.5px;">Level 4 & 5 Curriculum</span>
            <span class="pill amber" style="font-weight: 700;">Dragon Academy Grove</span>
          </div>
          <h2 style="font-family: var(--font-fantasy, 'Cinzel', serif); font-size: 26px; color: var(--gold, #f5c542); margin: 4px 0;">
            🌿 The Whispering Grove: Idioms & Phrasal Verbs
          </h2>
          <p style="color: var(--cream-soft, #e2e8f0); max-width: 820px; font-size: 14px; line-height: 1.6; margin: 0;">
            Master high-impact figurative expressions and multi-meaning phrasal verbs essential for campus placements, corporate leadership, and natural English fluency. Each expression guides you through <strong>Discover</strong>, <strong>Understand</strong>, <strong>Use</strong>, and <strong>Master</strong>.
          </p>

          <!-- Quick Stats Bar -->
          <div class="grid grid-4" style="margin-top: 14px; gap: 10px;">
            <div style="background: rgba(255,255,255,0.05); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--cream-faint); letter-spacing: 0.8px;">Total Grove Expressions</div>
              <div style="font-size: 22px; font-weight: 800; color: #fff; margin-top: 2px;">${stats.total || allExpressions.length}</div>
            </div>
            <div style="background: rgba(46, 213, 115, 0.08); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(46, 213, 115, 0.25);">
              <div style="font-size: 11px; text-transform: uppercase; color: #2ed573; letter-spacing: 0.8px;">Mastered (SRS)</div>
              <div style="font-size: 22px; font-weight: 800; color: #2ed573; margin-top: 2px;">${stats.mastered || 0} ⭐</div>
            </div>
            <div style="background: rgba(70, 150, 255, 0.08); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(70, 150, 255, 0.25);">
              <div style="font-size: 11px; text-transform: uppercase; color: #70a1ff; letter-spacing: 0.8px;">Familiar / In Progress</div>
              <div style="font-size: 22px; font-weight: 800; color: #70a1ff; margin-top: 2px;">${stats.familiar || 0}</div>
            </div>
            <div style="background: rgba(255, 171, 0, 0.08); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255, 171, 0, 0.25);">
              <div style="font-size: 11px; text-transform: uppercase; color: #ffbe76; letter-spacing: 0.8px;">Needs Practice (New)</div>
              <div style="font-size: 22px; font-weight: 800; color: #ffbe76; margin-top: 2px;">${stats.new || allExpressions.length}</div>
            </div>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="card col gap-md" style="padding: 16px 20px;">
          <div class="row gap-md" style="align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <!-- Type Tabs -->
            <div class="row gap-xs" style="background: rgba(0,0,0,0.25); padding: 4px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <button class="btn btn-sm ${currentFilter.type === 'all' ? 'btn-primary' : 'btn-ghost'}" id="btn-type-all">All Expressions</button>
              <button class="btn btn-sm ${currentFilter.type === 'idiom' ? 'btn-primary' : 'btn-ghost'}" id="btn-type-idiom">Idioms</button>
              <button class="btn btn-sm ${currentFilter.type === 'phrasal_verb' ? 'btn-primary' : 'btn-ghost'}" id="btn-type-phrasal">Phrasal Verbs</button>
            </div>

            <!-- Level Selector -->
            <div class="row gap-xs" style="align-items: center;">
              <span style="font-size: 12px; color: var(--cream-soft); font-weight: 600;">Level:</span>
              <button class="btn btn-sm ${currentFilter.level === 'all' ? 'btn-secondary' : 'btn-ghost'}" id="btn-lvl-all">All</button>
              <button class="btn btn-sm ${currentFilter.level === 'Level 4' ? 'btn-secondary' : 'btn-ghost'}" id="btn-lvl-4">Level 4</button>
              <button class="btn btn-sm ${currentFilter.level === 'Level 5' ? 'btn-secondary' : 'btn-ghost'}" id="btn-lvl-5">Level 5</button>
            </div>

            <!-- Search Bar -->
            <div style="flex: 1; min-width: 200px; max-width: 320px;">
              <input type="text" id="idiom-search-input" class="input input-sm" placeholder="Search expression, meaning..." value="${escapeHtml(currentFilter.search)}" style="width: 100%; border-radius: 20px;">
            </div>
          </div>

          <!-- Base Verb Filter Row (For Phrasal Verbs) -->
          ${
            currentFilter.type !== 'idiom' && baseVerbsList.length > 1
              ? `
            <div class="row gap-xs" style="align-items: center; flex-wrap: wrap; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
              <span style="font-size: 12px; color: var(--cream-faint); margin-right: 6px; font-weight: 700;">Base Verb:</span>
              ${baseVerbsList
                .map(
                  (bv) => `
                <button class="btn btn-xs ${currentFilter.baseVerb.toLowerCase() === bv.toLowerCase() ? 'btn-primary' : 'btn-ghost'}" data-baseverb="${escapeHtml(bv)}">
                  ${bv === 'all' ? 'All Verbs' : bv}
                </button>
              `
                )
                .join('')}
            </div>
          `
              : ''
          }
        </div>

        <!-- Expressions Card Grid -->
        <div class="grid grid-2" id="idioms-grid" style="gap: 16px;">
          ${
            items.length
              ? items
                  .map((item) => {
                    const mastery = item.userProgress?.mastery || 'new';
                    const masteryBadge =
                      mastery === 'mastered'
                        ? '<span class="pill sprout" style="font-weight: 700;">Mastered ⭐</span>'
                        : mastery === 'familiar'
                        ? '<span class="pill amber" style="font-weight: 700;">Familiar</span>'
                        : '<span class="pill voice" style="font-weight: 700;">New Expression</span>';

                    const typeBadge =
                      item.type === 'idiom'
                        ? '<span class="pill voice" style="font-size: 11px;">Idiom</span>'
                        : '<span class="pill sprout" style="font-size: 11px;">Phrasal Verb</span>';

                    const sepBadge =
                      item.type === 'phrasal_verb'
                        ? item.isSeparable
                          ? '<span class="pill amber" style="font-size: 10px;" title="' + escapeHtml(item.separableNote || '') + '">Separable</span>'
                          : '<span class="pill voice" style="font-size: 10px;" title="' + escapeHtml(item.separableNote || '') + '">Inseparable</span>'
                        : '';

                    const meaningsBadge =
                      (item.multipleMeanings || []).length > 1
                        ? `<span class="pill" style="font-size: 10px; background: rgba(255,255,255,0.08);">${item.multipleMeanings.length} Meanings</span>`
                        : '';

                    return `
                      <div class="card col gap-sm idiom-card" data-id="${item._id}" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid ${mastery === 'mastered' ? '#2ed573' : mastery === 'familiar' ? '#f5c542' : '#8854d0'}; transition: transform 0.2s ease, border-color 0.2s ease;">
                        <div>
                          <div class="row gap-xs" style="justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <div class="row gap-xs" style="align-items: center; flex-wrap: wrap;">
                              ${typeBadge}
                              <span class="pill" style="font-size: 11px; background: rgba(255,255,255,0.06);">${escapeHtml(item.level)}</span>
                              ${sepBadge}
                              ${meaningsBadge}
                            </div>
                            ${masteryBadge}
                          </div>

                          <h3 style="font-family: var(--font-fantasy, 'Cinzel', serif); font-size: 19px; color: var(--gold, #f5c542); margin: 6px 0 4px 0;">
                            ${escapeHtml(item.expression)}
                          </h3>

                          <div style="font-size: 13px; color: var(--cream-soft); margin-bottom: 10px; line-height: 1.5;">
                            ${escapeHtml(item.stage1_discover?.figurativeMeaning || '')}
                          </div>

                          <div class="row gap-xs" style="align-items: center; flex-wrap: wrap;">
                            <span class="pill" style="font-size: 11px; background: rgba(255,255,255,0.05); color: var(--cream-faint);">
                              📂 ${escapeHtml(item.category || 'General')}
                            </span>
                            <span class="pill" style="font-size: 11px; background: rgba(255,255,255,0.05); color: var(--cream-faint);">
                              💬 ${escapeHtml(item.stage1_discover?.register || 'Professional')}
                            </span>
                          </div>
                        </div>

                        <div class="row gap-sm" style="margin-top: 14px; justify-content: flex-end; align-items: center;">
                          <button class="btn btn-primary btn-sm btn-open-quest" data-id="${item._id}">
                            ${mastery === 'new' ? 'Begin 4-Stage Quest' : 'Practice / Review'} →
                          </button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')
              : `
              <div class="card col gap-sm" style="grid-column: 1 / -1; text-align: center; padding: 48px 24px;">
                <div style="font-size: 42px;">🔍</div>
                <div style="font-weight: 700; font-size: 16px; color: var(--cream-soft);">No expressions match the selected filter.</div>
                <div style="font-size: 13px; color: var(--cream-faint);">Try clearing the search query or selecting "All Expressions".</div>
                <div>
                  <button class="btn btn-secondary btn-sm" id="btn-reset-filters" style="margin-top: 10px;">Reset All Filters</button>
                </div>
              </div>
            `
          }
        </div>
      </div>

      <!-- Container for 4-Stage Interactive Player -->
      <div id="idioms-player-container" style="display: none;"></div>
    `;

    attachGroveEventListeners();
  }

  function attachGroveEventListeners() {
    // Type Filter Buttons
    $('#btn-type-all')?.addEventListener('click', () => { currentFilter.type = 'all'; currentFilter.baseVerb = 'all'; renderGroveView(); });
    $('#btn-type-idiom')?.addEventListener('click', () => { currentFilter.type = 'idiom'; currentFilter.baseVerb = 'all'; renderGroveView(); });
    $('#btn-type-phrasal')?.addEventListener('click', () => { currentFilter.type = 'phrasal_verb'; renderGroveView(); });

    // Level Filter Buttons
    $('#btn-lvl-all')?.addEventListener('click', () => { currentFilter.level = 'all'; renderGroveView(); });
    $('#btn-lvl-4')?.addEventListener('click', () => { currentFilter.level = 'Level 4'; renderGroveView(); });
    $('#btn-lvl-5')?.addEventListener('click', () => { currentFilter.level = 'Level 5'; renderGroveView(); });

    // Search Input
    const searchInput = $('#idiom-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentFilter.search = e.target.value;
        const items = getFilteredItems();
        // Fast local re-render of grid without rebuilding header
        renderGroveView();
        const freshInput = $('#idiom-search-input');
        if (freshInput) {
          freshInput.focus();
          freshInput.setSelectionRange(freshInput.value.length, freshInput.value.length);
        }
      });
    }

    // Base Verb buttons
    mount.querySelectorAll('[data-baseverb]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        currentFilter.baseVerb = e.currentTarget.getAttribute('data-baseverb');
        renderGroveView();
      });
    });

    // Reset button
    $('#btn-reset-filters')?.addEventListener('click', () => {
      currentFilter = { type: 'all', level: 'all', baseVerb: 'all', mastery: 'all', search: '' };
      renderGroveView();
    });

    // Open Quest buttons
    mount.querySelectorAll('.btn-open-quest').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        open4StagePlayer(id);
      });
    });
  }

  // ==================== 4-STAGE INTERACTIVE PLAYER ====================
  async function open4StagePlayer(expressionId) {
    const mainContainer = $('#idioms-main-container');
    const playerContainer = $('#idioms-player-container');
    if (!mainContainer || !playerContainer) return;

    playerContainer.innerHTML = `<div class="card empty-state" style="padding: 40px;">${wave(6)}<div style="margin-top:14px">Loading 4-Stage Learning Quest…</div></div>`;
    mainContainer.style.display = 'none';
    playerContainer.style.display = 'block';

    let itemData = null;
    try {
      const res = await Api.getIdiomDetails(expressionId);
      itemData = res.expression;
      itemData.userProgress = res.progress;
    } catch (err) {
      toast('Failed to load expression details', 'amber');
      mainContainer.style.display = 'block';
      playerContainer.style.display = 'none';
      return;
    }

    let activeStage = 1; // 1: Discover, 2: Understand, 3: Use, 4: Master
    let stage2Result = null;
    let stage3Result = null;
    let selectedStage2Option = -1;
    let fillAnswer = '';
    let rewriteAnswer = '';
    let speechTranscript = '';
    let isListening = false;

    function renderActiveStage() {
      playerContainer.innerHTML = `
        <div class="col gap-lg" style="max-width: 900px; margin: 0 auto;">
          <!-- Top Bar -->
          <div class="row gap-md" style="justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-ghost btn-sm" id="btn-player-back">← Back to Grove</button>
            <div class="row gap-xs" style="align-items: center;">
              <span class="pill ${itemData.type === 'idiom' ? 'voice' : 'sprout'}">${itemData.type === 'idiom' ? 'Idiom' : 'Phrasal Verb'}</span>
              <span class="pill amber">${escapeHtml(itemData.level)}</span>
              <span class="pill" style="background: rgba(255,255,255,0.06);">${escapeHtml(itemData.category)}</span>
            </div>
          </div>

          <!-- Stage Progress Stepper -->
          <div class="card" style="padding: 16px 20px;">
            <div class="row" style="justify-content: space-between; align-items: center; position: relative;">
              <div style="position: absolute; left: 10%; right: 10%; height: 2px; background: rgba(255,255,255,0.1); z-index: 1;"></div>
              
              <div class="col" style="align-items: center; z-index: 2; cursor: pointer;" id="step-btn-1">
                <div style="width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; background: ${activeStage >= 1 ? 'var(--gold, #f5c542)' : 'rgba(255,255,255,0.1)'}; color: ${activeStage >= 1 ? '#000' : '#fff'}; border: 2px solid var(--gold, #f5c542);">1</div>
                <span style="font-size: 11px; margin-top: 4px; font-weight: 600; color: ${activeStage === 1 ? 'var(--gold)' : 'var(--cream-soft)'};">Discover</span>
              </div>

              <div class="col" style="align-items: center; z-index: 2; cursor: pointer;" id="step-btn-2">
                <div style="width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; background: ${activeStage >= 2 ? 'var(--gold, #f5c542)' : 'rgba(255,255,255,0.1)'}; color: ${activeStage >= 2 ? '#000' : '#fff'}; border: 2px solid ${activeStage >= 2 ? 'var(--gold, #f5c542)' : 'rgba(255,255,255,0.2)'};">2</div>
                <span style="font-size: 11px; margin-top: 4px; font-weight: 600; color: ${activeStage === 2 ? 'var(--gold)' : 'var(--cream-soft)'};">Understand</span>
              </div>

              <div class="col" style="align-items: center; z-index: 2; cursor: pointer;" id="step-btn-3">
                <div style="width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; background: ${activeStage >= 3 ? 'var(--gold, #f5c542)' : 'rgba(255,255,255,0.1)'}; color: ${activeStage >= 3 ? '#000' : '#fff'}; border: 2px solid ${activeStage >= 3 ? 'var(--gold, #f5c542)' : 'rgba(255,255,255,0.2)'};">3</div>
                <span style="font-size: 11px; margin-top: 4px; font-weight: 600; color: ${activeStage === 3 ? 'var(--gold)' : 'var(--cream-soft)'};">Use</span>
              </div>

              <div class="col" style="align-items: center; z-index: 2; cursor: pointer;" id="step-btn-4">
                <div style="width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; background: ${activeStage >= 4 ? 'var(--gold, #f5c542)' : 'rgba(255,255,255,0.1)'}; color: ${activeStage >= 4 ? '#000' : '#fff'}; border: 2px solid ${activeStage >= 4 ? 'var(--gold, #f5c542)' : 'rgba(255,255,255,0.2)'};">4</div>
                <span style="font-size: 11px; margin-top: 4px; font-weight: 600; color: ${activeStage === 4 ? 'var(--gold)' : 'var(--cream-soft)'};">Master</span>
              </div>
            </div>
          </div>

          <!-- Dynamic Stage Body -->
          <div id="stage-body-mount">
            ${renderStageBodyContent()}
          </div>
        </div>
      `;

      attachPlayerEventListeners();
    }

    function renderStageBodyContent() {
      if (activeStage === 1) return renderStage1Discover();
      if (activeStage === 2) return renderStage2Understand();
      if (activeStage === 3) return renderStage3Use();
      if (activeStage === 4) return renderStage4Master();
      return '';
    }

    // ---------------- STAGE 1: DISCOVER ----------------
    function renderStage1Discover() {
      const disc = itemData.stage1_discover || {};
      const dialogue = disc.dialogue || [];
      const meanings = itemData.multipleMeanings || [];

      return `
        <div class="card col gap-lg" style="padding: 24px;">
          <div>
            <div style="font-size: 12px; color: var(--cream-faint); text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Stage 1: Discover</div>
            <h2 style="font-family: var(--font-fantasy, 'Cinzel', serif); font-size: 28px; color: var(--gold, #f5c542); margin: 4px 0 8px 0;">
              "${escapeHtml(itemData.expression)}"
            </h2>
            <div style="font-size: 13px; color: var(--cream-soft); background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--gold);">
              📍 <strong>Scenario Context:</strong> ${escapeHtml(disc.scenarioContext || '')}
            </div>
          </div>

          <!-- Conversational Dialogue -->
          <div class="col gap-sm" style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);">
            <div class="row" style="justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: var(--cream-faint); text-transform: uppercase; font-weight: 700;">Contextual Dialogue</span>
              <button class="btn btn-ghost btn-xs" id="btn-listen-dialogue" style="color: var(--gold);">
                🔊 Listen Dialogue
              </button>
            </div>

            <div class="col gap-sm" style="margin-top: 8px;">
              ${dialogue
                .map((d, idx) => {
                  const isHighlight = d.text.toLowerCase().includes(itemData.expression.toLowerCase().split(' ')[0]);
                  return `
                    <div class="row gap-sm" style="align-items: flex-start;">
                      <div style="min-width: 90px; font-weight: 700; font-size: 12px; color: ${idx % 2 === 0 ? 'var(--gold)' : 'var(--amber)'}; padding-top: 6px;">
                        ${escapeHtml(d.speaker)}:
                      </div>
                      <div class="speech-bubble" style="background: ${isHighlight ? 'rgba(245, 197, 66, 0.12)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isHighlight ? 'rgba(245, 197, 66, 0.35)' : 'rgba(255,255,255,0.08)'}; padding: 10px 14px; border-radius: 10px; flex: 1; font-size: 14px; line-height: 1.5;">
                        ${escapeHtml(d.text)}
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <!-- Side-by-Side: Literal vs Figurative -->
          <div class="grid grid-2" style="gap: 14px;">
            <div class="card" style="background: rgba(255, 71, 87, 0.06); border: 1px solid rgba(255, 71, 87, 0.25); padding: 16px;">
              <div class="row gap-xs" style="align-items: center; color: #ff6b81; font-weight: 700; font-size: 13px; margin-bottom: 6px;">
                <span>❌ Literal Meaning (What it sounds like)</span>
              </div>
              <p style="font-size: 13px; color: var(--cream-soft); margin: 0; line-height: 1.5;">
                ${escapeHtml(disc.literalMeaning || '')}
              </p>
            </div>

            <div class="card" style="background: rgba(46, 213, 115, 0.08); border: 1px solid rgba(46, 213, 115, 0.3); padding: 16px;">
              <div class="row gap-xs" style="align-items: center; color: #2ed573; font-weight: 700; font-size: 13px; margin-bottom: 6px;">
                <span>✨ Figurative Meaning (What it actually means)</span>
              </div>
              <p style="font-size: 13px; color: #fff; margin: 0; line-height: 1.5; font-weight: 600;">
                ${escapeHtml(disc.figurativeMeaning || '')}
              </p>
            </div>
          </div>

          <!-- Register & Region Notes -->
          <div class="row gap-md" style="flex-wrap: wrap;">
            <div style="flex: 1; min-width: 240px; background: rgba(0,0,0,0.25); padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--cream-faint); font-weight: 700;">Communicative Register</div>
              <div style="font-size: 13px; color: var(--gold); margin-top: 3px; font-weight: 600;">
                👔 ${escapeHtml(disc.register || 'Semi-Formal / Professional')}
              </div>
            </div>

            ${
              disc.regionNote
                ? `
              <div style="flex: 2; min-width: 280px; background: rgba(0,0,0,0.25); padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border-subtle);">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--cream-faint); font-weight: 700;">Region & Usage Note</div>
                <div style="font-size: 13px; color: var(--cream-soft); margin-top: 3px; line-height: 1.4;">
                  🌐 ${escapeHtml(disc.regionNote)}
                </div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Phrasal Verb Special Section: Multiple Meanings & Separability -->
          ${
            itemData.type === 'phrasal_verb'
              ? `
            <div class="card col gap-sm" style="background: rgba(116, 185, 255, 0.05); border: 1px solid rgba(116, 185, 255, 0.25); padding: 16px;">
              <div class="row gap-sm" style="align-items: center;">
                <span class="pill amber" style="font-size: 11px; font-weight: 700;">Phrasal Verb Grammar Rule</span>
                <span style="font-size: 13px; font-weight: 600; color: #74b9ff;">
                  ${itemData.isSeparable ? '🔄 Separable Phrasal Verb' : '🔒 Inseparable Phrasal Verb'}
                </span>
              </div>
              <div style="font-size: 13px; color: var(--cream-soft); line-height: 1.5;">
                ${escapeHtml(itemData.separableNote || '')}
              </div>

              ${
                meanings.length > 1
                  ? `
                <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                  <div style="font-size: 12px; font-weight: 700; color: var(--cream-soft); margin-bottom: 6px;">Multiple Meanings of "${escapeHtml(itemData.expression)}":</div>
                  <div class="col gap-xs">
                    ${meanings
                      .map(
                        (m, mi) => `
                      <div style="font-size: 12px; color: var(--cream-faint);">
                        <strong style="color: var(--gold);">${mi + 1}.</strong> ${escapeHtml(m.meaning)} 
                        <em style="color: var(--cream-soft);">— e.g., "${escapeHtml(m.example)}"</em>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          `
              : ''
          }

          <!-- Next Button -->
          <div class="row" style="justify-content: flex-end; margin-top: 10px;">
            <button class="btn btn-primary" id="btn-goto-stage-2" style="padding: 10px 24px; font-weight: 700;">
              Ready for Stage 2: Understand →
            </button>
          </div>
        </div>
      `;
    }

    // ---------------- STAGE 2: UNDERSTAND (MCQ with LinGrow_QBank Distractor Rationales) ----------------
    function renderStage2Understand() {
      const qData = itemData.stage2_understand || {};
      const options = qData.options || [];

      return `
        <div class="card col gap-lg" style="padding: 24px;">
          <div>
            <div style="font-size: 12px; color: var(--cream-faint); text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Stage 2: Understand</div>
            <h2 style="font-family: var(--font-fantasy, 'Cinzel', serif); font-size: 22px; color: var(--gold, #f5c542); margin: 4px 0 12px 0;">
              What does this expression mean in context?
            </h2>
            <div style="font-size: 15px; font-weight: 600; color: #fff; line-height: 1.5; background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; border-left: 3px solid var(--amber);">
              ${escapeHtml(qData.question || `What does "${itemData.expression}" mean in this context?`)}
            </div>
          </div>

          <!-- MCQ Options List -->
          <div class="col gap-sm" id="stage2-options-list">
            ${options
              .map((opt, idx) => {
                const isSelected = selectedStage2Option === idx;
                let optBorder = 'border: 1px solid rgba(255,255,255,0.1)';
                let optBg = 'background: rgba(255,255,255,0.03)';
                if (isSelected) {
                  optBorder = 'border: 2px solid var(--gold)';
                  optBg = 'background: rgba(245, 197, 66, 0.1)';
                }
                if (stage2Result) {
                  if (idx === stage2Result.correctAnswer) {
                    optBorder = 'border: 2px solid #2ed573';
                    optBg = 'background: rgba(46, 213, 115, 0.15)';
                  } else if (isSelected && !stage2Result.isCorrect) {
                    optBorder = 'border: 2px solid #ff4757';
                    optBg = 'background: rgba(255, 71, 87, 0.15)';
                  }
                }

                return `
                  <button class="stage2-option-btn" data-idx="${idx}" ${stage2Result ? 'disabled' : ''} style="display: flex; align-items: flex-start; text-align: left; gap: 12px; padding: 14px; border-radius: 8px; ${optBorder}; ${optBg}; cursor: ${stage2Result ? 'default' : 'pointer'}; width: 100%; transition: all 0.2s ease;">
                    <span style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; background: rgba(255,255,255,0.1); color: var(--gold); flex-shrink: 0;">
                      ${String.fromCharCode(65 + idx)}
                    </span>
                    <span style="font-size: 14px; color: var(--cream-soft); flex: 1; line-height: 1.4;">
                      ${escapeHtml(opt)}
                    </span>
                  </button>
                `;
              })
              .join('')}
          </div>

          <!-- Evaluation Feedback with LinGrow_QBank Distractor Rationales -->
          ${
            stage2Result
              ? `
            <div class="card col gap-md" style="margin-top: 10px; background: ${stage2Result.isCorrect ? 'rgba(46, 213, 115, 0.08)' : 'rgba(255, 71, 87, 0.08)'}; border: 1px solid ${stage2Result.isCorrect ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 71, 87, 0.3)'}; padding: 18px;">
              <div class="row gap-sm" style="align-items: center;">
                <span style="font-size: 22px;">${stage2Result.isCorrect ? '🎉' : '💡'}</span>
                <div>
                  <div style="font-weight: 700; font-size: 15px; color: ${stage2Result.isCorrect ? '#2ed573' : '#ff4757'};">
                    ${stage2Result.isCorrect ? 'Excellent Analysis! +10 XP' : 'Not quite right — review the explanation below.'}
                  </div>
                  <div style="font-size: 13px; color: var(--cream-soft); margin-top: 2px;">
                    ${escapeHtml(stage2Result.explanation)}
                  </div>
                </div>
              </div>

              <!-- Distractor Rationales -->
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px; margin-top: 6px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--cream-faint); margin-bottom: 8px;">
                  Option Analysis & Distractor Rationales:
                </div>
                <div class="col gap-xs">
                  ${(stage2Result.distractorRationales || [])
                    .map(
                      (rat, ri) => `
                    <div style="font-size: 12px; line-height: 1.4; color: ${ri === stage2Result.correctAnswer ? '#2ed573' : 'var(--cream-soft)'};">
                      <strong>Option ${String.fromCharCode(65 + ri)}:</strong> ${escapeHtml(rat)}
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <div class="row" style="justify-content: flex-end; margin-top: 8px;">
                <button class="btn btn-primary" id="btn-goto-stage-3" style="padding: 9px 22px; font-weight: 700;">
                  Proceed to Stage 3: Use →
                </button>
              </div>
            </div>
          `
              : `
            <div class="row" style="justify-content: flex-end;">
              <button class="btn btn-primary" id="btn-submit-stage-2" ${selectedStage2Option === -1 ? 'disabled' : ''} style="padding: 10px 24px; font-weight: 700;">
                Check Answer
              </button>
            </div>
          `
          }
        </div>
      `;
    }

    // ---------------- STAGE 3: USE (Fill-in-blank + Sentence Rewrite + Speaking Task) ----------------
    function renderStage3Use() {
      const uData = itemData.stage3_use || {};
      const fill = uData.fillInBlank || {};
      const rewrite = uData.sentenceRewrite || {};
      const spk = uData.speakingPrompt || {};

      return `
        <div class="card col gap-lg" style="padding: 24px;">
          <div>
            <div style="font-size: 12px; color: var(--cream-faint); text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Stage 3: Use in Practice</div>
            <h2 style="font-family: var(--font-fantasy, 'Cinzel', serif); font-size: 22px; color: var(--gold, #f5c542); margin: 4px 0 6px 0;">
              Apply "${escapeHtml(itemData.expression)}"
            </h2>
            <p style="font-size: 13px; color: var(--cream-soft); margin: 0;">
              Complete the three application challenges below: Fill-in-the-blank, Sentence Rewrite, and Speaking Aloud.
            </p>
          </div>

          <!-- Challenge 1: Fill in the Blank -->
          <div class="col gap-sm" style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div class="row gap-xs" style="align-items: center;">
              <span class="pill amber" style="font-size: 10px; font-weight: 700;">Part A</span>
              <span style="font-size: 13px; font-weight: 700; color: #fff;">Fill in the Blank:</span>
            </div>
            <div style="font-size: 14px; color: var(--cream-soft); line-height: 1.5; margin: 4px 0;">
              ${escapeHtml(fill.sentence || '')}
            </div>
            <div class="row gap-sm" style="flex-wrap: wrap;">
              ${(fill.options || [])
                .map(
                  (opt) => `
                <button class="btn btn-sm btn-fill-opt ${fillAnswer === opt ? 'btn-primary' : 'btn-ghost'}" data-fill="${escapeHtml(opt)}">
                  ${escapeHtml(opt)}
                </button>
              `
                )
                .join('')}
            </div>
            ${fill.hint ? `<div style="font-size: 11px; color: var(--cream-faint); margin-top: 4px;">💡 Hint: ${escapeHtml(fill.hint)}</div>` : ''}
          </div>

          <!-- Challenge 2: Sentence Rewrite -->
          <div class="col gap-sm" style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div class="row gap-xs" style="align-items: center;">
              <span class="pill amber" style="font-size: 10px; font-weight: 700;">Part B</span>
              <span style="font-size: 13px; font-weight: 700; color: #fff;">Sentence Rewrite:</span>
            </div>
            <div style="font-size: 13px; color: var(--cream-faint);">
              Rewrite the sentence below by replacing the plain words with "<strong>${escapeHtml(rewrite.targetPhrase || itemData.expression)}</strong>":
            </div>
            <div style="font-size: 14px; color: var(--gold); font-weight: 600; padding: 8px 12px; background: rgba(0,0,0,0.25); border-radius: 6px;">
              "${escapeHtml(rewrite.plainSentence || '')}"
            </div>
            <textarea id="input-rewrite" class="input" rows="2" placeholder="Type your rewritten sentence here..." style="font-size: 13px;">${escapeHtml(rewriteAnswer)}</textarea>
            ${rewrite.hint ? `<div style="font-size: 11px; color: var(--cream-faint);">💡 Hint: ${escapeHtml(rewrite.hint)}</div>` : ''}
          </div>

          <!-- Challenge 3: Speaking Aloud Task -->
          <div class="col gap-sm" style="background: rgba(255,255,255,0.02); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div class="row gap-xs" style="align-items: center;">
              <span class="pill amber" style="font-size: 10px; font-weight: 700;">Part C</span>
              <span style="font-size: 13px; font-weight: 700; color: #fff;">Speak Aloud (Mic Capture):</span>
            </div>
            <div style="font-size: 13px; color: var(--cream-soft);">
              ${escapeHtml(spk.prompt || 'Speak the sentence aloud clearly into your microphone:')}
            </div>
            <div style="font-size: 14px; color: #fff; font-weight: 600; padding: 10px 14px; background: rgba(0,0,0,0.3); border-radius: 6px; border-left: 3px solid #2ed573;">
              "${escapeHtml(spk.referenceText || itemData.expression)}"
            </div>

            <div class="row gap-sm" style="align-items: center; margin-top: 6px;">
              <button class="btn ${isListening ? 'btn-danger' : 'btn-secondary'} btn-sm" id="btn-toggle-speech">
                ${isListening ? '⏹️ Stop Recording' : '🎤 Click to Speak'}
              </button>
              <span style="font-size: 12px; color: ${isListening ? '#ff4757' : 'var(--cream-faint)'};">
                ${isListening ? 'Listening… speak now!' : speechTranscript ? 'Spoken transcript captured!' : 'Ready to record.'}
              </span>
            </div>

            ${
              speechTranscript
                ? `
              <div style="font-size: 13px; color: var(--cream-soft); background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; margin-top: 6px;">
                <strong>You said:</strong> "${escapeHtml(speechTranscript)}"
              </div>
            `
                : ''
            }
          </div>

          <!-- Results Summary Card (If submitted) -->
          ${
            stage3Result
              ? `
            <div class="card col gap-md" style="background: ${stage3Result.isPassed ? 'rgba(46, 213, 115, 0.08)' : 'rgba(255, 171, 0, 0.08)'}; border: 1px solid ${stage3Result.isPassed ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 171, 0, 0.3)'}; padding: 18px;">
              <div class="row gap-md" style="justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 18px; font-weight: 800; color: ${stage3Result.isPassed ? '#2ed573' : '#ffbe76'};">
                    Practice Score: ${stage3Result.score} / 100
                  </div>
                  <div style="font-size: 13px; color: var(--cream-soft); margin-top: 2px;">
                    Fill-in: ${stage3Result.fillCorrect ? '✅ Correct' : '❌ Needs Review'} | Rewrite: ${stage3Result.rewriteScore}% | Speech: ${stage3Result.speechAccuracy}%
                  </div>
                </div>
                <div class="pill sprout" style="font-size: 13px; font-weight: 700;">+${stage3Result.xpEarned || 25} XP Earned!</div>
              </div>

              <div class="row" style="justify-content: flex-end; margin-top: 8px;">
                <button class="btn btn-primary" id="btn-goto-stage-4" style="padding: 9px 24px; font-weight: 700;">
                  View Mastery & Retention (Stage 4) →
                </button>
              </div>
            </div>
          `
              : `
            <div class="row" style="justify-content: flex-end; margin-top: 8px;">
              <button class="btn btn-primary" id="btn-submit-stage-3" style="padding: 10px 24px; font-weight: 700;">
                Submit Application & Grade
              </button>
            </div>
          `
          }
        </div>
      `;
    }

    // ---------------- STAGE 4: MASTER (Spaced-Repetition Review & Retention) ----------------
    function renderStage4Master() {
      const prog = itemData.userProgress || {};
      const mastery = stage3Result?.mastery || prog.mastery || 'new';

      return `
        <div class="card col gap-lg" style="padding: 28px; text-align: center;">
          <div style="font-size: 52px; margin-bottom: 4px;">
            ${mastery === 'mastered' ? '🏆' : mastery === 'familiar' ? '🌿' : '🌱'}
          </div>

          <div>
            <div style="font-size: 12px; color: var(--cream-faint); text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Stage 4: Mastery & Retention</div>
            <h2 style="font-family: var(--font-fantasy, 'Cinzel', serif); font-size: 26px; color: var(--gold, #f5c542); margin: 6px 0;">
              ${mastery === 'mastered' ? 'Expression Mastered!' : mastery === 'familiar' ? 'Expression Familiar!' : 'Journey Begun!'}
            </h2>
            <p style="font-size: 14px; color: var(--cream-soft); max-width: 600px; margin: 0 auto; line-height: 1.6;">
              ${
                mastery === 'mastered'
                  ? `Congratulations! You have demonstrated high accuracy across discovery, comprehension, and practical usage. "${escapeHtml(itemData.expression)}" is now marked as <strong>Mastered</strong> in your Grove archive.`
                  : `You have successfully practiced "${escapeHtml(itemData.expression)}". It is now in your <strong>Familiar</strong> active recall cycle. Practice it once more in 2 days to graduate to Mastered!`
              }
            </p>
          </div>

          <!-- Spaced-Repetition State Box -->
          <div style="max-width: 480px; margin: 0 auto; width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px;">
            <div class="row" style="justify-content: space-around; align-items: center;">
              <div class="col" style="align-items: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--cream-faint);">State</div>
                <div style="font-weight: 800; font-size: 15px; color: ${mastery === 'mastered' ? '#2ed573' : '#70a1ff'}; margin-top: 2px;">
                  ${mastery.toUpperCase()}
                </div>
              </div>
              <div style="width: 1px; height: 30px; background: rgba(255,255,255,0.1);"></div>
              <div class="col" style="align-items: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--cream-faint);">Next SRS Review</div>
                <div style="font-weight: 700; font-size: 14px; color: var(--gold); margin-top: 2px;">
                  ${mastery === 'mastered' ? 'In 7 Days' : 'In 2 Days'}
                </div>
              </div>
              <div style="width: 1px; height: 30px; background: rgba(255,255,255,0.1);"></div>
              <div class="col" style="align-items: center;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--cream-faint);">Total XP</div>
                <div style="font-weight: 800; font-size: 15px; color: #2ed573; margin-top: 2px;">
                  +${(stage2Result ? 10 : 0) + (stage3Result?.xpEarned || 25)} XP
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="row gap-md" style="justify-content: center; margin-top: 14px;">
            <button class="btn btn-secondary" id="btn-replay-quest">Review Again 🔄</button>
            <button class="btn btn-primary" id="btn-return-grove" style="padding: 10px 28px; font-weight: 700;">
              Return to Grove 🌿
            </button>
          </div>
        </div>
      `;
    }

    function attachPlayerEventListeners() {
      // Back Button
      $('#btn-player-back')?.addEventListener('click', () => {
        mainContainer.style.display = 'block';
        playerContainer.style.display = 'none';
        // Refresh grove data
        VIEW_RENDERERS['idioms'](mount);
      });

      // Stepper click navigation
      $('#step-btn-1')?.addEventListener('click', () => { activeStage = 1; renderActiveStage(); });
      $('#step-btn-2')?.addEventListener('click', () => { activeStage = 2; renderActiveStage(); });
      $('#step-btn-3')?.addEventListener('click', () => { activeStage = 3; renderActiveStage(); });
      $('#step-btn-4')?.addEventListener('click', () => { activeStage = 4; renderActiveStage(); });

      // Stage 1 Listen Button
      $('#btn-listen-dialogue')?.addEventListener('click', () => {
        const fullDialogue = (itemData.stage1_discover?.dialogue || []).map((d) => `${d.speaker} says: ${d.text}`).join('. ');
        if (typeof SpeechOutput !== 'undefined' && SpeechOutput.speak) {
          SpeechOutput.speak(fullDialogue);
        } else {
          toast('Playing audio simulation...', 'sprout');
        }
      });

      // Stage 1 -> Stage 2
      $('#btn-goto-stage-2')?.addEventListener('click', () => {
        activeStage = 2;
        renderActiveStage();
      });

      // Stage 2 Option Select
      playerContainer.querySelectorAll('.stage2-option-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          if (stage2Result) return;
          selectedStage2Option = Number(e.currentTarget.getAttribute('data-idx'));
          renderActiveStage();
        });
      });

      // Stage 2 Submit
      $('#btn-submit-stage-2')?.addEventListener('click', async () => {
        if (selectedStage2Option === -1) {
          toast('Please choose an answer option first', 'amber');
          return;
        }
        const submitBtn = $('#btn-submit-stage-2');
        if (submitBtn) submitBtn.disabled = true;

        try {
          const res = await Api.submitIdiomStage2(expressionId, selectedStage2Option);
          stage2Result = res;
          if (res.xpEarned > 0) {
            toast(`+${res.xpEarned} XP Earned!`, 'sprout');
            addStudentXP(res.xpEarned);
          }
          renderActiveStage();
        } catch (err) {
          apiError(err);
        }
      });

      // Stage 2 -> Stage 3
      $('#btn-goto-stage-3')?.addEventListener('click', () => {
        activeStage = 3;
        renderActiveStage();
      });

      // Stage 3 Fill Option clicks
      playerContainer.querySelectorAll('.btn-fill-opt').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          fillAnswer = e.currentTarget.getAttribute('data-fill');
          renderActiveStage();
        });
      });

      // Stage 3 Rewrite textarea change
      const rewriteInput = $('#input-rewrite');
      if (rewriteInput) {
        rewriteInput.addEventListener('input', (e) => {
          rewriteAnswer = e.target.value;
        });
      }

      // Stage 3 Speech Button
      const speechBtn = $('#btn-toggle-speech');
      if (speechBtn) {
        speechBtn.addEventListener('click', () => {
          if (isListening) {
            if (typeof SpeechInput !== 'undefined' && SpeechInput.stop) {
              SpeechInput.stop();
            }
            isListening = false;
            renderActiveStage();
          } else {
            if (typeof SpeechInput !== 'undefined' && SpeechInput.start) {
              isListening = true;
              renderActiveStage();
              SpeechInput.start(
                (transcript) => {
                  speechTranscript = transcript;
                  isListening = false;
                  renderActiveStage();
                },
                (err) => {
                  isListening = false;
                  toast('Microphone capture: ' + (err.message || 'error'), 'amber');
                  renderActiveStage();
                }
              );
            } else {
              // Simulated speech for testing environments
              speechTranscript = itemData.stage3_use?.speakingPrompt?.referenceText || itemData.expression;
              toast('Audio speech captured!', 'sprout');
              renderActiveStage();
            }
          }
        });
      }

      // Stage 3 Submit
      $('#btn-submit-stage-3')?.addEventListener('click', async () => {
        if (!fillAnswer) {
          toast('Please answer Part A (Fill-in-the-blank)', 'amber');
          return;
        }
        const submitBtn = $('#btn-submit-stage-3');
        if (submitBtn) submitBtn.disabled = true;

        try {
          const res = await Api.submitIdiomStage3(expressionId, {
            fillInBlankAnswer: fillAnswer,
            sentenceRewriteAnswer: rewriteAnswer,
            spokenTranscript: speechTranscript,
          });
          stage3Result = res;
          if (res.xpEarned > 0) {
            toast(`+${res.xpEarned} XP Earned! Great job!`, 'sprout');
            addStudentXP(res.xpEarned);
          }
          renderActiveStage();
        } catch (err) {
          apiError(err);
        }
      });

      // Stage 3 -> Stage 4
      $('#btn-goto-stage-4')?.addEventListener('click', () => {
        activeStage = 4;
        renderActiveStage();
      });

      // Stage 4 Buttons
      $('#btn-replay-quest')?.addEventListener('click', () => {
        activeStage = 1;
        selectedStage2Option = -1;
        stage2Result = null;
        stage3Result = null;
        fillAnswer = '';
        rewriteAnswer = '';
        speechTranscript = '';
        renderActiveStage();
      });

      $('#btn-return-grove')?.addEventListener('click', () => {
        mainContainer.style.display = 'block';
        playerContainer.style.display = 'none';
        VIEW_RENDERERS['idioms'](mount);
      });
    }

    renderActiveStage();
  }

  renderGroveView();
}
