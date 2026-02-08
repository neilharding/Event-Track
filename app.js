(function () {
  'use strict';

  // ── Storage helpers ──
  const STORAGE_KEY = 'event-schedule-sessions';

  function loadSessions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function saveSessions(sessions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── Seed from embedded schedule ──
  const SEED_VERSION_KEY = 'event-schedule-seed-version';
  const CURRENT_SEED = '2026-02-06-mtca-v1';
  let sessions = loadSessions();
  if (typeof MTCA_SCHEDULE !== 'undefined' && localStorage.getItem(SEED_VERSION_KEY) !== CURRENT_SEED) {
    // Preserve any existing stars
    const starredIds = new Set(sessions.filter(s => s.starred).map(s => s.title));
    sessions = MTCA_SCHEDULE.map(s => ({
      ...s,
      id: generateId(),
      starred: starredIds.has(s.title),
    }));
    saveSessions(sessions);
    localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED);
  }

  let activeDay = 'all';

  // ── DOM refs ──
  const scheduleList = document.getElementById('schedule-list');
  const emptyState = document.getElementById('empty-state');
  const dayFilter = document.getElementById('day-filter');
  const addBtn = document.getElementById('add-btn');

  // Add modal
  const addModal = document.getElementById('add-modal');

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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatDayTab(dateStr) {
    if (!dateStr) return '?';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr.length > 3 ? dateStr.slice(0, 3) : dateStr;
    }
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  }

  // ── Render ──
  function render() {
    sessions.sort((a, b) => {
      if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
      return (a.start || '').localeCompare(b.start || '');
    });

    // Build day tabs
    const starCount = sessions.filter(s => s.starred).length;
    const days = [...new Set(sessions.map(s => s.date).filter(Boolean))].sort();
    dayFilter.innerHTML = '<button class="day-btn' + (activeDay === 'all' ? ' active' : '') + '" data-day="all">All</button>';
    days.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'day-btn' + (activeDay === d ? ' active' : '');
      btn.dataset.day = d;
      btn.textContent = formatDayTab(d);
      dayFilter.appendChild(btn);
    });
    const starBtn = document.createElement('button');
    starBtn.className = 'day-btn starred-btn' + (activeDay === 'starred' ? ' active' : '');
    starBtn.dataset.day = 'starred';
    starBtn.innerHTML = '&#9733; ' + starCount;
    dayFilter.appendChild(starBtn);

    // Filter
    let filtered;
    if (activeDay === 'starred') {
      filtered = sessions.filter(s => s.starred);
    } else if (activeDay === 'all') {
      filtered = sessions;
    } else {
      filtered = sessions.filter(s => s.date === activeDay);
    }

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      emptyState.style.display = '';
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
        const roomType = [s.type, s.location].filter(Boolean).join(' \u00b7 ');
        html += `
          <div class="session-card" data-id="${s.id}">
            <div class="session-time">
              <div class="start">${formatTime(s.start)}</div>
              <div class="end">${formatTime(s.end)}</div>
            </div>
            <div class="session-info">
              <div class="speaker">${esc(s.speaker)}</div>
              <div class="room">${esc(roomType)}</div>
              <div class="title">${esc(s.title)}</div>
            </div>
            <button class="session-starred ${s.starred ? 'active' : ''}" data-star="${s.id}">&#9733;</button>
          </div>`;
      });
      html += `</div>`;
    });

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

  // ── Add Session Modal ──
  addBtn.addEventListener('click', () => {
    manualTitle.value = '';
    manualDate.value = '';
    manualStart.value = '';
    manualEnd.value = '';
    manualLocation.value = '';
    manualSpeaker.value = '';
    manualNotes.value = '';
    openModal(addModal);
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

  // ── Edit Session ──
  scheduleList.addEventListener('click', e => {
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

  // ── Tab Switching ──
  const tabBar = document.querySelector('.tab-bar');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBar.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tab = btn.dataset.tab;
    tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
    if (tab === 'awards') renderAwards();
  });

  // ── Awards Rendering ──
  const awardsList = document.getElementById('awards-list');

  function renderAwards() {
    if (typeof MTCA_AWARDS === 'undefined' || awardsList.children.length > 0) return;

    let html = '';
    let currentType = '';

    MTCA_AWARDS.forEach((cat, i) => {
      const baseType = cat.type.startsWith('GROUP') ? 'GROUP' : cat.type;
      if (baseType !== currentType) {
        currentType = baseType;
        html += `<div class="award-type-heading">${esc(currentType)}</div>`;
      }
      const badgeClass = cat.type.startsWith('GROUP') ? 'GROUP' : cat.type;
      html += `<div class="award-category" data-award="${i}">`;
      html += `<div class="award-category-header">`;
      html += `<span class="award-type-badge ${esc(badgeClass)}">${esc(cat.type)}</span>`;
      html += `<span class="award-level">${esc(cat.level)}</span>`;
      html += `</div>`;
      if (cat.performers) {
        html += `<div class="award-performers" style="padding:0 12px 8px">`;
        cat.performers.forEach(p => {
          html += `<div class="award-performer">`;
          html += `<span class="award-performer-name">${esc(p.speaker)}</span>`;
          html += `<span class="award-performer-title">${esc(p.title)}</span>`;
          html += `</div>`;
        });
        html += `</div>`;
      } else {
        Object.keys(cat.days).forEach(day => {
          html += `<div class="award-day-group">`;
          html += `<div class="award-day-label">${esc(day)}</div>`;
          html += `<div class="award-performers">`;
          cat.days[day].forEach(p => {
            html += `<div class="award-performer">`;
            html += `<span class="award-performer-name">${esc(p.speaker)}</span>`;
            html += `<span class="award-performer-title">${esc(p.title)}</span>`;
            html += `</div>`;
          });
          html += `</div></div>`;
        });
      }
      html += `</div>`;
    });

    awardsList.innerHTML = html;
  }

  // ── Initial render ──
  render();
  renderAwards();
})();
