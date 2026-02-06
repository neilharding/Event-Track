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
  const eventNameInput = document.getElementById('event-name-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  // Add modal
  const addModal = document.getElementById('add-modal');
  const tabs = document.querySelectorAll('.tab');
  const tabCsv = document.getElementById('tab-csv');
  const tabManual = document.getElementById('tab-manual');

  // CSV controls
  const csvFile = document.getElementById('csv-file');
  const csvStatus = document.getElementById('csv-status');
  const csvResults = document.getElementById('csv-results');
  const csvResultsList = document.getElementById('csv-results-list');
  const csvAddAllBtn = document.getElementById('csv-add-all-btn');

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
    // If it's a day name like "Saturday" rather than a YYYY-MM-DD date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatDayTab(dateStr) {
    if (!dateStr) return '?';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Abbreviate day name: "Saturday" -> "Sat"
      return dateStr.length > 3 ? dateStr.slice(0, 3) : dateStr;
    }
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
        if (s.type) metaParts.push(`<span>${esc(s.type)}</span>`);
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
    eventNameInput.value = s.eventName || '';
    openModal(settingsModal);
  });

  saveSettingsBtn.addEventListener('click', () => {
    const s = loadSettings();
    s.eventName = eventNameInput.value.trim();
    saveSettings(s);
    closeModal(settingsModal);
    render();
  });

  // ── Add Session Modal ──
  addBtn.addEventListener('click', () => {
    // Reset forms
    csvFile.value = '';
    csvStatus.classList.add('hidden');
    csvResults.classList.add('hidden');
    csvResultsList.innerHTML = '';
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
      if (t.dataset.tab === 'csv') {
        tabCsv.classList.add('active');
        tabManual.classList.remove('active');
      } else {
        tabManual.classList.add('active');
        tabCsv.classList.remove('active');
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

  // ── CSV Upload ──
  let parsedSessions = [];

  // Day-of-week names used as section headers in the spreadsheet
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function parseTimeToHHMM(raw) {
    if (!raw) return '';
    raw = raw.trim();
    // Already in HH:MM 24h format
    if (/^\d{1,2}:\d{2}$/.test(raw)) return raw.padStart(5, '0');
    // AM/PM format: "8:15 AM", "12:30 PM", "9:00AM"
    const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h.toString().padStart(2, '0') + ':' + m;
    }
    return raw;
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

    // Find the header row — skip day-label rows like "SATURDAY" or "FRIDAY"
    let headerIdx = 0;
    let currentDay = '';
    for (let i = 0; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      const first = (cols[0] || '').trim().toLowerCase();
      if (DAY_NAMES.includes(first) && cols.filter(c => c.trim()).length <= 1) {
        currentDay = cols[0].trim();
        headerIdx = i + 1;
        continue;
      }
      break;
    }

    if (headerIdx >= lines.length) throw new Error('Could not find header row in CSV.');

    const headers = parseCSVRow(lines[headerIdx]).map(h => h.trim().toLowerCase());
    const colMap = {};
    headers.forEach((h, i) => {
      if (h === 'title' || h === 'name' || h === 'session') colMap.title = i;
      else if (h === 'time' || h === 'start' || h === 'start time' || h === 'start_time' || h === 'from') colMap.time = i;
      else if (h === 'end' || h === 'end time' || h === 'end_time' || h === 'to') colMap.end = i;
      else if (h === 'student' || h === 'speaker' || h === 'presenter' || h === 'performer' || h === 'author') colMap.student = i;
      else if (h === 'type' || h === 'category' || h === 'style') colMap.type = i;
      else if (h === 'room' || h === 'location' || h === 'hall' || h === 'venue' || h === 'track') colMap.room = i;
      else if (h === 'date' || h === 'day') colMap.date = i;
      else if (h === 'notes' || h === 'description' || h === 'details') colMap.notes = i;
    });

    if (colMap.title === undefined) throw new Error('CSV must have a "Title" (or "Name" / "Session") column.');

    const results = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      const first = (cols[0] || '').trim().toLowerCase();

      // Check for day-label rows mid-file (multi-day spreadsheets)
      if (DAY_NAMES.includes(first) && cols.filter(c => c.trim()).length <= 1) {
        currentDay = cols[0].trim();
        continue;
      }

      const get = key => (colMap[key] !== undefined ? (cols[colMap[key]] || '').trim() : '');
      const title = get('title');
      if (!title) continue;

      // Use explicit date column if present, otherwise fall back to the day label
      const dateVal = get('date') || currentDay;

      results.push({
        title,
        date: dateVal,
        start: parseTimeToHHMM(get('time')),
        end: parseTimeToHHMM(get('end')),
        location: get('room'),
        speaker: get('student'),
        type: get('type'),
        notes: get('notes'),
      });
    }
    return results;
  }

  function parseCSVRow(line) {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { cols.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    cols.push(cur);
    return cols;
  }

  csvFile.addEventListener('change', () => {
    const file = csvFile.files[0];
    if (!file) return;

    csvStatus.classList.add('hidden');
    csvResults.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = () => {
      try {
        parsedSessions = parseCSV(reader.result);
        if (parsedSessions.length === 0) {
          csvStatus.textContent = 'No sessions found in the CSV. Make sure there is data below the header row.';
          csvStatus.className = 'status error';
          csvStatus.classList.remove('hidden');
          return;
        }

        csvStatus.textContent = `Found ${parsedSessions.length} session(s).`;
        csvStatus.className = 'status success';
        csvStatus.classList.remove('hidden');

        csvResultsList.innerHTML = '';
        parsedSessions.forEach(s => {
          const div = document.createElement('div');
          div.className = 'csv-session-preview';
          const timeStr = formatTime(s.start) + (s.end ? ' - ' + formatTime(s.end) : '');
          const meta = [s.date, timeStr, s.type, s.location, s.speaker].filter(Boolean).join(' \u00b7 ');
          div.innerHTML = `<div class="preview-title">${esc(s.title)}</div><div class="preview-meta">${esc(meta)}</div>`;
          csvResultsList.appendChild(div);
        });
        csvResults.classList.remove('hidden');
      } catch (err) {
        csvStatus.textContent = 'Error: ' + err.message;
        csvStatus.className = 'status error';
        csvStatus.classList.remove('hidden');
      }
    };
    reader.readAsText(file);
  });

  csvAddAllBtn.addEventListener('click', () => {
    parsedSessions.forEach(s => {
      sessions.push({ ...s, id: generateId(), starred: false });
    });
    saveSessions(sessions);
    parsedSessions = [];
    closeModal(addModal);
    render();
  });

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
