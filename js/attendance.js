/* ==========================================================
   AttendEase - attendance.js
   Mark attendance for a chosen date, edit past records, save.
   ========================================================== */
(function (global) {
  'use strict';

  const Attendance = {};

  // Working state for the date currently on screen
  const state = {
    date: '',        // "YYYY-MM-DD"
    draft: {},       // { studentId: 'present' | 'absent' | 'late' } - not saved until "Save"
    hasRecord: false,// true if this date was saved before (so we are editing)
    dirty: false     // true if there are unsaved changes
  };

  const LABELS = { present: 'Present', absent: 'Absent', late: 'Late' };

  function $(id) { return document.getElementById(id); }

  /* ---------- Setup ---------- */
  Attendance.init = function () {
    const dateInput = $('attDate');
    dateInput.max = App.todayStr(); // attendance cannot be marked for future dates

    dateInput.addEventListener('change', onDateChange);
    $('markAllPresentBtn').addEventListener('click', markAllPresent);
    $('clearAllBtn').addEventListener('click', clearAll);
    $('saveAttendanceBtn').addEventListener('click', save);

    // Present / Late / Absent buttons (event delegation)
    $('attBody').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-status]');
      if (!btn) return;
      setStatus(btn.dataset.id, btn.dataset.status);
    });
  };

  /* ---------- Render (called every time the page is shown) ---------- */
  Attendance.render = function () {
    const dateInput = $('attDate');
    dateInput.max = App.todayStr();
    if (!state.date) state.date = App.todayStr();
    dateInput.value = state.date;
    loadDate(state.date);
  };

  function loadDate(date) {
    state.date = date;
    $('attDate').value = date; // keep the date picker in sync
    const saved = App.getAttendance()[date] || null;
    const students = App.getStudents();

    state.draft = {};
    students.forEach(function (s) {
      if (saved && saved[s.id]) state.draft[s.id] = saved[s.id];
    });
    state.hasRecord = !!saved;
    state.dirty = false;
    renderTable();
  }

  function renderTable() {
    const students = App.getStudents().sort(function (a, b) {
      return a.roll.localeCompare(b.roll, undefined, { numeric: true });
    });
    const wrap = $('attTableWrap');
    const empty = $('attEmpty');

    updateBanner();

    if (!students.length) {
      wrap.hidden = true;
      $('attSummary').innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = App.emptyHtml('🎓', 'No students to mark', 'Register students first, then come back to mark attendance.',
        '<button class="btn" type="button" data-goto="students">Go to Students</button>');
      setButtonsDisabled(true);
      return;
    }

    setButtonsDisabled(false);
    wrap.hidden = false;
    empty.hidden = true;

    $('attBody').innerHTML = students.map(function (s) {
      return '<tr data-row="' + App.esc(s.id) + '">' +
        '<td><div class="person"><div class="avatar">' + App.esc(App.initials(s.name)) + '</div><div class="name">' + App.esc(s.name) + '</div></div></td>' +
        '<td><b>' + App.esc(s.roll) + '</b></td>' +
        '<td><span class="badge badge-dept">' + App.esc(s.dept) + '</span></td>' +
        '<td>' + segmentHtml(s.id) + '</td>' +
        '<td data-status-cell>' + badgeHtml(state.draft[s.id]) + '</td></tr>';
    }).join('');

    updateSummary();
  }

  function segmentHtml(id) {
    const current = state.draft[id];
    return '<div class="seg-group" role="group" aria-label="Attendance status">' +
      ['present', 'late', 'absent'].map(function (status) {
        const active = current === status;
        return '<button type="button" class="seg ' + status + (active ? ' active' : '') + '" data-id="' + App.esc(id) +
          '" data-status="' + status + '" aria-pressed="' + active + '">' + LABELS[status] + '</button>';
      }).join('') + '</div>';
  }

  function badgeHtml(status) {
    return status
      ? '<span class="badge badge-' + status + '">' + LABELS[status] + '</span>'
      : '<span class="badge badge-none">Not marked</span>';
  }

  function updateBanner() {
    const banner = $('attBanner');
    const label = App.formatDate(state.date);
    if (state.hasRecord) {
      banner.className = 'banner edit';
      banner.textContent = 'Attendance for ' + label + ' was already recorded – you are editing it. Click "Save Attendance" to apply your changes.';
    } else {
      banner.className = 'banner';
      banner.textContent = 'No attendance saved for ' + label + ' yet. Mark each student, then click "Save Attendance".';
    }
  }

  function updateSummary() {
    const students = App.getStudents();
    let present = 0, late = 0, absent = 0;
    students.forEach(function (s) {
      const st = state.draft[s.id];
      if (st === 'present') present++;
      else if (st === 'late') late++;
      else if (st === 'absent') absent++;
    });
    const unmarked = students.length - present - late - absent;
    $('attSummary').innerHTML =
      '<span class="chip present">Present<b>' + present + '</b></span>' +
      '<span class="chip late">Late<b>' + late + '</b></span>' +
      '<span class="chip absent">Absent<b>' + absent + '</b></span>' +
      '<span class="chip">Not marked<b>' + unmarked + '</b></span>';
  }

  function setButtonsDisabled(disabled) {
    ['markAllPresentBtn', 'clearAllBtn', 'saveAttendanceBtn'].forEach(function (id) { $(id).disabled = disabled; });
  }

  /* ---------- Actions ---------- */
  // Update one row in place (keeps keyboard focus on the clicked button)
  function setStatus(id, status) {
    state.draft[id] = status;
    state.dirty = true;
    const row = $('attBody').querySelector('tr[data-row="' + id + '"]');
    if (row) {
      row.querySelectorAll('.seg').forEach(function (b) {
        const active = b.dataset.status === status;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active);
      });
      row.querySelector('[data-status-cell]').innerHTML = badgeHtml(status);
    }
    updateSummary();
  }

  function markAllPresent() {
    App.getStudents().forEach(function (s) { state.draft[s.id] = 'present'; });
    state.dirty = true;
    renderTable();
    App.toast('All students marked present. Click "Save Attendance" to keep it.', 'info');
  }

  function clearAll() {
    state.draft = {};
    state.dirty = true;
    renderTable();
  }

  function save() {
    const students = App.getStudents();
    if (!students.length) return;

    const record = {};
    students.forEach(function (s) {
      if (state.draft[s.id]) record[s.id] = state.draft[s.id];
    });
    const markedCount = Object.keys(record).length;

    if (!markedCount) {
      App.toast('Mark at least one student before saving.', 'error');
      return;
    }

    const attendance = App.getAttendance();
    attendance[state.date] = record;
    App.saveAttendance(attendance);

    const unmarked = students.length - markedCount;
    const wasEdit = state.hasRecord;
    state.hasRecord = true;
    state.dirty = false;
    updateBanner();

    App.toast('Attendance for ' + App.formatDate(state.date) + (wasEdit ? ' updated' : ' saved') + ' (' + markedCount + ' marked' +
      (unmarked ? ', ' + unmarked + ' not marked' : '') + ').', unmarked ? 'info' : 'success');
  }

  function onDateChange() {
    const input = $('attDate');
    const newDate = input.value;

    if (!newDate) { input.value = state.date; return; }
    if (newDate > App.todayStr()) {
      App.toast('Attendance cannot be marked for a future date.', 'error');
      input.value = state.date;
      return;
    }
    if (newDate === state.date) return;

    if (state.dirty) {
      App.confirm({
        title: 'Discard unsaved changes?',
        message: 'You have unsaved attendance changes for ' + App.formatDate(state.date) + '. Switching the date will discard them.',
        confirmText: 'Discard & switch'
      }, function () { loadDate(newDate); });
      // Show the old date until the user confirms (loadDate then sets the new one)
      input.value = state.date;
    } else {
      loadDate(newDate);
    }
  }

  global.Attendance = Attendance;
})(window);
