(function () {
  'use strict';

  // ── Storage helpers ──
  const STORAGE_KEY = 'event-schedule-sessions';
  const SETTINGS_KEY = 'event-schedule-settings';

  function loadSessions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function saveSessions(sessions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch { return {}; }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── State ──
  let sessions = loadSessions();
  let activeDay = 'all';

  // ── DOM refs ──
  const scheduleList = document.getElementById('schedule-list');
  const emptyState = document.getElementById('empty-state');
  const dayFilter = document.getElementById('day-filter');
  const addBtn = document.getElementById('add-btn');
  const settingsBtn = document.getElementById('settings-btn');

  // Settings modal
  const settingsModal = document.getElementById('settings-modal');
  const apiKeyInput = document.getElementById('api-key-input');
  const eventNameInput = document.getElementById('event-name-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  // Add modal
  const addModal = document.getElementById('add-modal');
  const tabs = document.querySelectorAll('.tab');
  const tabAi = document.getElementById('tab-ai');
  const tabManual = document.getElementById('tab-manual');

  // AI controls
  const aiInput = document.getElementById('ai-input');
  const aiParseBtn = document.getElementById('ai-parse-btn');
  const aiStatus = document.getElementById('ai-status');
  const aiResults = document.getElementById('ai-results');
  const aiResultsList = document.getElementById('ai-results-list');
  const aiAddAllBtn = document.getElementById('ai-add-all-btn');

  // Manual controls
  const manualTitle = document.getElementById('manual-title');
  const manualDate = document.getElementById('manual-date');
  const manualStart = document.getElementById('manual-start');
  const manualEnd = document.getElementById('manual-end');
  const manualLocation = document.getElementById('manual-location');
  const manualSpeaker = document.getElementById('manual-speaker');
  const manualNotes = document.getElementById('manual-notes');
  const manualAddBtn = document.getElementById('manual-add-btn');

  // Edit modal
  const editModal = document.getElementById('edit-modal');
  const editId = document.getElementById('edit-id');
  const editTitle = document.getElementById('edit-title');
  const editDate = document.getElementById('edit-date');
  const editStart = document.getElementById('edit-start');
  const editEnd = document.getElementById('edit-end');
  const editLocation = document.getElementById('edit-location');
  const editSpeaker = document.getElementById('edit-speaker');
  const editNotes = document.getElementById('edit-notes');
  const editSaveBtn = document.getElementById('edit-save-btn');
  const editDeleteBtn = document.getElementById('edit-delete-btn');

  // ── Formatting helpers ──
  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  function formatDateHeading(dateStr) {
    if (!dateStr) return 'No Date';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatDayTab(dateStr) {
    if (!dateStr) return '?';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  }

  // ── Render ──
  function render() {
    // Sort sessions by date then start time
    sessions.sort((a, b) => {
      if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
      return (a.start || '').localeCompare(b.start || '');
    });

    // Update header with event name
    const settings = loadSettings();
    document.querySelector('header h1').textContent = settings.eventName || 'Event Schedule';

    // Build day tabs
    const days = [...new Set(sessions.map(s => s.date).filter(Boolean))].sort();
    dayFilter.innerHTML = '<button class="day-btn' + (activeDay === 'all' ? ' active' : '') + '" data-day="all">All</button>';
    days.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'day-btn' + (activeDay === d ? ' active' : '');
      btn.dataset.day = d;
      btn.textContent = formatDayTab(d);
      dayFilter.appendChild(btn);
    });

    // Filter
    const filtered = activeDay === 'all' ? sessions : sessions.filter(s => s.date === activeDay);

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      emptyState.style.display = '';
      // Remove day groups
      scheduleList.querySelectorAll('.day-group').forEach(el => el.remove());
      return;
    }

    emptyState.style.display = 'none';

    // Group by date
    const groups = {};
    filtered.forEach(s => {
      const key = s.date || 'no-date';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    // Build HTML
    let html = '';
    Object.keys(groups).sort().forEach(dateKey => {
      html += `<div class="day-group">`;
      html += `<h2>${formatDateHeading(dateKey === 'no-date' ? '' : dateKey)}</h2>`;
      groups[dateKey].forEach(s => {
        const metaParts = [];
        if (s.speaker) metaParts.push(`<span>${esc(s.speaker)}</span>`);
        if (s.location) metaParts.push(`<span>${esc(s.location)}</span>`);
        html += `
          <div class="session-card" data-id="${s.id}">
            <div class="session-time">
              <div class="start">${formatTime(s.start)}</div>
              <div class="end">${formatTime(s.end)}</div>
            </div>
            <div class="session-info">
              <div class="title">${esc(s.title)}</div>
              <div class="meta">${metaParts.join('')}</div>
            </div>
            <button class="session-starred ${s.starred ? 'active' : ''}" data-star="${s.id}">&#9733;</button>
          </div>`;
      });
      html += `</div>`;
    });

    // Preserve empty state element
    scheduleList.querySelectorAll('.day-group').forEach(el => el.remove());
    scheduleList.insertAdjacentHTML('beforeend', html);
  }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Modal helpers ──
  function openModal(modal) {
    modal.classList.remove('hidden');
  }
  function closeModal(modal) {
    modal.classList.add('hidden');
  }

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) closeModal(m);
    });
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(document.getElementById(btn.dataset.close));
    });
  });

  // ── Settings ──
  settingsBtn.addEventListener('click', () => {
    const s = loadSettings();
    apiKeyInput.value = s.apiKey || '';
    eventNameInput.value = s.eventName || '';
    openModal(settingsModal);
  });

  saveSettingsBtn.addEventListener('click', () => {
    const s = loadSettings();
    s.apiKey = apiKeyInput.value.trim();
    s.eventName = eventNameInput.value.trim();
    saveSettings(s);
    closeModal(settingsModal);
    render();
  });

  // ── Add Session Modal ──
  addBtn.addEventListener('click', () => {
    // Reset forms
    aiInput.value = '';
    aiStatus.classList.add('hidden');
    aiResults.classList.add('hidden');
    aiResultsList.innerHTML = '';
    manualTitle.value = '';
    manualDate.value = '';
    manualStart.value = '';
    manualEnd.value = '';
    manualLocation.value = '';
    manualSpeaker.value = '';
    manualNotes.value = '';
    openModal(addModal);
  });

  // Tabs
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      if (t.dataset.tab === 'ai') {
        tabAi.classList.add('active');
        tabManual.classList.remove('active');
      } else {
        tabManual.classList.add('active');
        tabAi.classList.remove('active');
      }
    });
  });

  // ── Manual Add ──
  manualAddBtn.addEventListener('click', () => {
    const title = manualTitle.value.trim();
    if (!title) { manualTitle.focus(); return; }
    sessions.push({
      id: generateId(),
      title,
      date: manualDate.value,
      start: manualStart.value,
      end: manualEnd.value,
      location: manualLocation.value.trim(),
      speaker: manualSpeaker.value.trim(),
      notes: manualNotes.value.trim(),
      starred: false,
    });
    saveSessions(sessions);
    closeModal(addModal);
    render();
  });

  // ── Claude AI Parse ──
  let parsedSessions = [];

  aiParseBtn.addEventListener('click', async () => {
    const text = aiInput.value.trim();
    if (!text) { aiInput.focus(); return; }

    const settings = loadSettings();
    if (!settings.apiKey) {
      aiStatus.textContent = 'Please set your Anthropic API key in Settings first.';
      aiStatus.className = 'status error';
      aiStatus.classList.remove('hidden');
      return;
    }

    aiParseBtn.disabled = true;
    aiStatus.textContent = 'Asking Claude to parse sessions...';
    aiStatus.className = 'status loading';
    aiStatus.classList.remove('hidden');
    aiResults.classList.add('hidden');

    try {
      const result = await callClaude(settings.apiKey, text);
      parsedSessions = result;

      if (parsedSessions.length === 0) {
        aiStatus.textContent = 'Claude could not find any sessions in that text. Try adding more detail.';
        aiStatus.className = 'status error';
        aiStatus.classList.remove('hidden');
      } else {
        aiStatus.textContent = `Found ${parsedSessions.length} session(s).`;
        aiStatus.className = 'status success';
        aiStatus.classList.remove('hidden');

        aiResultsList.innerHTML = '';
        parsedSessions.forEach(s => {
          const div = document.createElement('div');
          div.className = 'ai-session-preview';
          const meta = [s.date, formatTime(s.start) + (s.end ? ' - ' + formatTime(s.end) : ''), s.location, s.speaker].filter(Boolean).join(' \u00b7 ');
          div.innerHTML = `<div class="preview-title">${esc(s.title)}</div><div class="preview-meta">${esc(meta)}</div>`;
          aiResultsList.appendChild(div);
        });
        aiResults.classList.remove('hidden');
      }
    } catch (err) {
      aiStatus.textContent = 'Error: ' + err.message;
      aiStatus.className = 'status error';
      aiStatus.classList.remove('hidden');
    }

    aiParseBtn.disabled = false;
  });

  aiAddAllBtn.addEventListener('click', () => {
    parsedSessions.forEach(s => {
      sessions.push({ ...s, id: generateId(), starred: false });
    });
    saveSessions(sessions);
    parsedSessions = [];
    closeModal(addModal);
    render();
  });

  async function callClaude(apiKey, text) {
    const systemPrompt = `You are a schedule parser. The user will give you text describing one or more event sessions. Extract each session and return a JSON array. Each object must have these fields:
- "title": string (session/talk title)
- "date": string in YYYY-MM-DD format (use your best guess for the year if not stated; assume the current or next occurrence)
- "start": string in HH:MM 24-hour format
- "end": string in HH:MM 24-hour format (if not given, leave as empty string)
- "location": string (room/hall/track, or empty string)
- "speaker": string (speaker name, or empty string)
- "notes": string (any extra info, or empty string)

Return ONLY valid JSON. No markdown, no explanation, just the array.`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`API error ${resp.status}: ${errBody}`);
    }

    const data = await resp.json();
    const content = data.content?.[0]?.text || '[]';

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    return JSON.parse(jsonStr);
  }

  // ── Edit Session ──
  scheduleList.addEventListener('click', e => {
    // Star toggle
    const starBtn = e.target.closest('[data-star]');
    if (starBtn) {
      e.stopPropagation();
      const id = starBtn.dataset.star;
      const session = sessions.find(s => s.id === id);
      if (session) {
        session.starred = !session.starred;
        saveSessions(sessions);
        render();
      }
      return;
    }

    // Card click -> edit
    const card = e.target.closest('.session-card');
    if (!card) return;
    const id = card.dataset.id;
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    editId.value = session.id;
    editTitle.value = session.title || '';
    editDate.value = session.date || '';
    editStart.value = session.start || '';
    editEnd.value = session.end || '';
    editLocation.value = session.location || '';
    editSpeaker.value = session.speaker || '';
    editNotes.value = session.notes || '';
    openModal(editModal);
  });

  editSaveBtn.addEventListener('click', () => {
    const id = editId.value;
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return;

    sessions[idx] = {
      ...sessions[idx],
      title: editTitle.value.trim(),
      date: editDate.value,
      start: editStart.value,
      end: editEnd.value,
      location: editLocation.value.trim(),
      speaker: editSpeaker.value.trim(),
      notes: editNotes.value.trim(),
    };
    saveSessions(sessions);
    closeModal(editModal);
    render();
  });

  editDeleteBtn.addEventListener('click', () => {
    const id = editId.value;
    sessions = sessions.filter(s => s.id !== id);
    saveSessions(sessions);
    closeModal(editModal);
    render();
  });

  // ── Day Filter ──
  dayFilter.addEventListener('click', e => {
    const btn = e.target.closest('.day-btn');
    if (!btn) return;
    activeDay = btn.dataset.day;
    render();
  });

  // ── Initial render ──
  render();
})();
