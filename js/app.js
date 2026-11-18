/* ==========================================================
   AttendEase - app.js  (core)
   - LocalStorage helpers      - Sample (demo) data
   - Utility functions         - Toasts, modals, confirm box
   - Page navigation           - Dashboard + Settings pages
   Other files (students.js, attendance.js, reports.js) add
   their own features on top of the global `App` object.
   ========================================================== */
(function (global) {
  'use strict';

  const App = {};

  /* ---------- Constants ---------- */
  App.VERSION = '1.0.0';
  App.KEYS = {
    students: 'attendease_students',
    attendance: 'attendease_attendance',
    settings: 'attendease_settings'
  };
  App.DEPARTMENTS = [
    { code: 'CSE', name: 'CSE – Computer Science' },
    { code: 'IT', name: 'IT – Information Technology' },
    { code: 'ECE', name: 'ECE – Electronics & Communication' },
    { code: 'EEE', name: 'EEE – Electrical & Electronics' },
    { code: 'ME', name: 'ME – Mechanical' },
    { code: 'CE', name: 'CE – Civil' }
  ];
  App.SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
  App.DEFAULT_SETTINGS = { threshold: 75 };

  const PAGES = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of attendance at a glance' },
    students: { title: 'Students', subtitle: 'Add, edit and manage student records' },
    attendance: { title: 'Attendance', subtitle: 'Mark and edit daily attendance' },
    reports: { title: 'Reports', subtitle: 'Attendance percentages and monthly summaries' },
    settings: { title: 'Settings / About', subtitle: 'Preferences and project information' }
  };
  let currentPage = 'dashboard';

  /* ---------- Storage helpers ----------
     LocalStorage is the single source of truth. If the browser blocks it
     (e.g. strict private mode) we fall back to a temporary in-memory copy
     so the app still opens instead of crashing. */
  const memoryFallback = {};

  function readStore(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : fallback;
    }
  }

  function writeStore(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      memoryFallback[key] = value;
      App.toast('Browser storage is unavailable – changes will be lost on refresh.', 'error');
      return false;
    }
  }

  App.getStudents = function () {
    const list = readStore(App.KEYS.students, []);
    return Array.isArray(list) ? list : [];
  };
  App.saveStudents = function (list) { return writeStore(App.KEYS.students, list); };

  // Attendance shape: { "2026-11-03": { "<studentId>": "present" | "absent" | "late" } }
  App.getAttendance = function () {
    const data = readStore(App.KEYS.attendance, {});
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  };
  App.saveAttendance = function (data) { return writeStore(App.KEYS.attendance, data); };

  App.getSettings = function () {
    const saved = readStore(App.KEYS.settings, {});
    return Object.assign({}, App.DEFAULT_SETTINGS, saved && typeof saved === 'object' ? saved : {});
  };
  App.saveSettings = function (settings) { return writeStore(App.KEYS.settings, settings); };

  /* ---------- Utility functions ---------- */
  App.esc = function (value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  App.uid = function () {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  // Date -> "YYYY-MM-DD" in LOCAL time (toISOString would use UTC and can be off by a day)
  App.dateToStr = function (d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  App.strToDate = function (s) {
    const p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };
  App.todayStr = function () { return App.dateToStr(new Date()); };

  App.formatDate = function (s) {
    return App.strToDate(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  App.formatMonth = function (ym) {
    const p = ym.split('-').map(Number);
    return new Date(p[0], p[1] - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };
  App.initials = function (name) {
    const parts = String(name).trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  };
  App.fmtPct = function (n) {
    return n === null || n === undefined ? '–' : (Math.round(n * 10) / 10) + '%';
  };
  App.semLabel = function (n) { return 'Semester ' + n; };

  // Attendance Percentage = (Present + Late) / Total Marked Days x 100
  // `month` is optional ("YYYY-MM"); when given only that month is counted.
  App.studentStats = function (studentId, attendance, month) {
    let present = 0, absent = 0, late = 0;
    Object.keys(attendance).forEach(function (date) {
      if (month && date.slice(0, 7) !== month) return;
      const status = attendance[date][studentId];
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
    });
    const total = present + absent + late;
    return { present: present, absent: absent, late: late, total: total, pct: total ? ((present + late) / total) * 100 : null };
  };

  App.icon = function (name) {
    const paths = {
      users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      cross: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
      percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
      alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
    };
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  };

  // Shared HTML for an empty-state box
  App.emptyHtml = function (icon, title, text, buttonHtml) {
    return '<div class="empty"><div class="empty-icon">' + icon + '</div><h4>' + App.esc(title) + '</h4><p>' + App.esc(text) + '</p>' + (buttonHtml || '') + '</div>';
  };

  /* ---------- Toast notifications ---------- */
  App.toast = function (message, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    container.appendChild(toast);

    function remove() {
      toast.classList.add('leaving');
      setTimeout(function () { toast.remove(); }, 300);
    }
    toast.addEventListener('click', remove);
    setTimeout(remove, 3800);
  };

  /* ---------- Modals ---------- */
  App.openModal = function (id) {
    const modal = document.getElementById(id);
    modal.classList.add('open');
    const first = modal.querySelector('input, select, button');
    if (first) setTimeout(function () { first.focus(); }, 30);
  };
  App.closeModal = function (id) {
    document.getElementById(id).classList.remove('open');
  };

  // Generic confirmation dialog. options: { title, message, confirmText }
  let confirmCallback = null;
  App.confirm = function (options, onConfirm) {
    document.getElementById('confirmTitle').textContent = options.title || 'Are you sure?';
    document.getElementById('confirmMessage').textContent = options.message || '';
    document.getElementById('confirmOkBtn').textContent = options.confirmText || 'Confirm';
    confirmCallback = onConfirm;
    App.openModal('confirmModal');
    document.getElementById('confirmCancelBtn').focus();
  };

  /* ---------- Navigation ---------- */
  App.showPage = function (name) {
    if (!PAGES[name]) name = 'dashboard';
    currentPage = name;

    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.toggle('active', p.id === 'page-' + name);
    });
    document.querySelectorAll('.nav-link').forEach(function (link) {
      const active = link.dataset.page === name;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    document.getElementById('pageTitle').textContent = PAGES[name].title;
    document.getElementById('pageSubtitle').textContent = PAGES[name].subtitle;
    document.title = PAGES[name].title + ' · AttendEase';
    closeSidebar();
    App.renderCurrent();
    global.scrollTo(0, 0);
  };

  App.renderCurrent = function () {
    if (currentPage === 'dashboard') App.renderDashboard();
    else if (currentPage === 'students' && global.Students) global.Students.render();
    else if (currentPage === 'attendance' && global.Attendance) global.Attendance.render();
    else if (currentPage === 'reports' && global.Reports) global.Reports.render();
    else if (currentPage === 'settings') App.renderSettings();
  };

  // Go to a page programmatically (updates the URL hash too)
  App.go = function (name) {
    if (global.location.hash !== '#' + name) global.location.hash = name;
    App.showPage(name);
  };

  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('show');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  }

  /* ---------- Demo / sample data ---------- */
  const SAMPLE_STUDENTS = [
    { name: 'Aarav Sharma', roll: '21CSE001', dept: 'CSE', sem: 5, rate: 0.95 },
    { name: 'Sneha Reddy', roll: '21CSE002', dept: 'CSE', sem: 5, rate: 0.88 },
    { name: 'Rohan Verma', roll: '21CSE003', dept: 'CSE', sem: 5, rate: 0.62 },
    { name: 'Ananya Iyer', roll: '21IT001', dept: 'IT', sem: 5, rate: 0.9 },
    { name: 'Karthik Nair', roll: '21IT002', dept: 'IT', sem: 5, rate: 0.82 },
    { name: 'Priya Patel', roll: '22ECE001', dept: 'ECE', sem: 3, rate: 0.7 },
    { name: 'Vikram Singh', roll: '22ECE002', dept: 'ECE', sem: 3, rate: 0.93 },
    { name: 'Meera Krishnan', roll: '22ME001', dept: 'ME', sem: 3, rate: 0.85 },
    { name: 'Arjun Rao', roll: '20ME002', dept: 'ME', sem: 7, rate: 0.97 },
    { name: 'Divya Menon', roll: '20EEE001', dept: 'EEE', sem: 7, rate: 0.78 }
  ];

  // Builds students + about 7 weeks of attendance (Mon-Sat, up to and including today).
  // The pattern is deterministic (no Math.random) so the demo looks the same every time.
  App.seedDemoData = function () {
    const now = Date.now();
    const students = SAMPLE_STUDENTS.map(function (s, i) {
      return {
        id: 'demo' + (i + 1),
        name: s.name, roll: s.roll,
        email: s.name.toLowerCase().replace(/\s+/g, '.') + '@college.edu',
        dept: s.dept, sem: s.sem,
        createdAt: now - (SAMPLE_STUDENTS.length - i) * 3600000
      };
    });

    const attendance = {};
    const today = new Date();
    for (let back = 0; back < 49; back++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
      if (day.getDay() === 0) continue; // skip Sundays
      const record = {};
      SAMPLE_STUDENTS.forEach(function (s, si) {
        const x = Math.sin((si + 1) * 997 + (back + 1) * 131) * 10000;
        const r = x - Math.floor(x); // pseudo-random number between 0 and 1
        if (r < s.rate - 0.08) record[students[si].id] = 'present';
        else if (r < s.rate) record[students[si].id] = 'late';
        else record[students[si].id] = 'absent';
      });
      attendance[App.dateToStr(day)] = record;
    }

    App.saveStudents(students);
    App.saveAttendance(attendance);
    App.saveSettings(Object.assign({}, App.DEFAULT_SETTINGS));
  };

  /* ---------- Dashboard page ---------- */
  App.renderDashboard = function () {
    const students = App.getStudents();
    const attendance = App.getAttendance();
    const today = App.todayStr();
    const todayRecord = attendance[today] || {};

    // Today's counts
    let present = 0, absent = 0, late = 0;
    students.forEach(function (s) {
      const st = todayRecord[s.id];
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
    });
    const marked = present + absent + late;
    const unmarked = students.length - marked;

    // Overall attendance across all recorded days
    let attended = 0, totalMarks = 0;
    students.forEach(function (s) {
      const st = App.studentStats(s.id, attendance);
      attended += st.present + st.late;
      totalMarks += st.total;
    });
    const overall = totalMarks ? (attended / totalMarks) * 100 : null;

    // Statistic cards
    document.getElementById('dashStats').innerHTML =
      statCard('indigo', 'users', 'Total Students', students.length, 'Registered students') +
      statCard('green', 'check', 'Present Today', marked ? present : '–', marked ? (late ? '+ ' + late + ' late' : 'Marked present') : 'Not marked yet') +
      statCard('red', 'cross', 'Absent Today', marked ? absent : '–', marked ? 'Marked absent' : 'Not marked yet') +
      statCard('purple', 'percent', 'Overall Attendance', App.fmtPct(overall), totalMarks ? 'Across all recorded days' : 'No records yet');

    document.getElementById('todayDateText').textContent = App.formatDate(today);

    // Today's summary (donut chart + legend)
    const summaryEl = document.getElementById('todaySummary');
    if (!students.length) {
      summaryEl.innerHTML = App.emptyHtml('👩‍🎓', 'No students yet', 'Add students to start tracking attendance.',
        '<button class="btn" type="button" data-goto="students">Add Students</button>');
    } else if (!marked) {
      summaryEl.innerHTML = App.emptyHtml('📝', "Today's attendance not marked", 'Open the Attendance page to record today.',
        '<button class="btn" type="button" data-goto="attendance">Mark Attendance</button>');
    } else {
      const n = students.length;
      const a = (present / n) * 100;
      const b = a + (late / n) * 100;
      const c = b + (absent / n) * 100;
      const gradient = 'conic-gradient(#22c55e 0 ' + a + '%, #f59e0b ' + a + '% ' + b + '%, #dc2626 ' + b + '% ' + c + '%, #d1d5e0 ' + c + '% 100%)';
      const rate = ((present + late) / marked) * 100;
      summaryEl.innerHTML =
        '<div class="today-wrap">' +
          '<div class="donut" style="background:' + gradient + '"><div class="donut-center"><b>' + App.fmtPct(rate) + '</b><span>attended</span></div></div>' +
          '<ul class="legend">' +
            '<li><span class="dot present"></span>Present<b>' + present + '</b></li>' +
            '<li><span class="dot late"></span>Late<b>' + late + '</b></li>' +
            '<li><span class="dot absent"></span>Absent<b>' + absent + '</b></li>' +
            '<li><span class="dot none"></span>Not marked<b>' + unmarked + '</b></li>' +
          '</ul>' +
        '</div>';
    }

    // Last 7 days bar chart
    const weekEl = document.getElementById('weekChart');
    if (!students.length) {
      weekEl.innerHTML = App.emptyHtml('📊', 'Nothing to chart', 'Attendance trends appear once you have students.');
    } else {
      let bars = '';
      let anyData = false;
      const threshold = App.getSettings().threshold;
      for (let back = 6; back >= 0; back--) {
        const d = new Date();
        d.setDate(d.getDate() - back);
        const key = App.dateToStr(d);
        const rec = attendance[key] || {};
        let p = 0, t = 0;
        students.forEach(function (s) {
          const st = rec[s.id];
          if (st) { t++; if (st === 'present' || st === 'late') p++; }
        });
        const rate = t ? (p / t) * 100 : null;
        if (rate !== null) anyData = true;
        const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
        bars += '<div class="week-col" title="' + App.esc(App.formatDate(key)) + ': ' + (rate === null ? 'no data' : App.fmtPct(rate)) + '">' +
          '<span class="week-val">' + (rate === null ? '–' : Math.round(rate) + '%') + '</span>' +
          '<div class="week-bar-track"><div class="week-bar' + (rate !== null && rate < threshold ? ' low' : '') + '" style="height:' + (rate || 0) + '%"></div></div>' +
          '<span class="week-day">' + day + '</span></div>';
      }
      weekEl.innerHTML = anyData ? '<div class="week-chart">' + bars + '</div>'
        : App.emptyHtml('📊', 'No attendance in the last 7 days', 'Mark attendance to see the weekly trend.');
    }

    // Recent students (5 most recently added)
    const recentEl = document.getElementById('recentStudents');
    if (!students.length) {
      recentEl.innerHTML = App.emptyHtml('🎓', 'No students yet', 'Newly added students will be listed here.');
    } else {
      const recent = students.slice().sort(function (x, y) { return (y.createdAt || 0) - (x.createdAt || 0); }).slice(0, 5);
      recentEl.innerHTML = '<ul class="list">' + recent.map(function (s) {
        return '<li><div class="avatar">' + App.esc(App.initials(s.name)) + '</div>' +
          '<div class="grow"><div class="name">' + App.esc(s.name) + '</div><div class="meta">' + App.esc(s.roll) + ' · ' + App.esc(s.dept) + '</div></div>' +
          '<span class="badge badge-dept">' + App.esc('Sem ' + s.sem) + '</span></li>';
      }).join('') + '</ul>';
    }
  };

  function statCard(color, icon, label, value, note) {
    return '<div class="card stat-card"><div class="stat-icon ' + color + '">' + App.icon(icon) + '</div>' +
      '<div><div class="stat-label">' + App.esc(label) + '</div><div class="stat-value">' + App.esc(value) + '</div>' +
      '<div class="stat-note">' + App.esc(note) + '</div></div></div>';
  }
  App.statCard = statCard;

  /* ---------- Settings / About page ---------- */
  App.renderSettings = function () {
    document.getElementById('aboutVersion').textContent = 'v' + App.VERSION;
    document.getElementById('sidebarVersion').textContent = 'v' + App.VERSION;
    document.getElementById('thresholdInput').value = App.getSettings().threshold;
    document.getElementById('err-threshold').textContent = '';
    document.getElementById('thresholdInput').classList.remove('invalid');
  };

  function bindSettings() {
    document.getElementById('settingsForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const input = document.getElementById('thresholdInput');
      const raw = input.value.trim();
      const value = Number(raw);
      const error = document.getElementById('err-threshold');
      if (raw === '' || !Number.isInteger(value) || value < 1 || value > 100) {
        error.textContent = 'Enter a whole number between 1 and 100.';
        input.classList.add('invalid');
        App.toast('Please correct the highlighted field.', 'error');
        return;
      }
      error.textContent = '';
      input.classList.remove('invalid');
      const settings = App.getSettings();
      settings.threshold = value;
      App.saveSettings(settings);
      App.toast('Settings saved. Minimum attendance is now ' + value + '%.', 'success');
    });

    document.getElementById('resetDataBtn').addEventListener('click', function () {
      App.confirm({
        title: 'Reset demo data?',
        message: 'All current students and attendance records will be replaced with the original sample data. This cannot be undone.',
        confirmText: 'Yes, reset'
      }, function () {
        App.seedDemoData();
        App.renderCurrent();
        App.toast('Demo data has been restored.', 'success');
      });
    });
  }

  /* ---------- Start-up ---------- */
  function init() {
    // First visit (nothing stored yet): load sample data so every page is populated
    let hasData = true;
    try { hasData = global.localStorage.getItem(App.KEYS.students) !== null; } catch (e) { hasData = false; }
    if (!hasData && !App.getStudents().length) App.seedDemoData();

    document.getElementById('todayLabel').textContent =
      new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('sidebarVersion').textContent = 'v' + App.VERSION;

    // Sidebar (mobile)
    document.getElementById('menuBtn').addEventListener('click', openSidebar);
    document.getElementById('overlay').addEventListener('click', closeSidebar);

    // Any element with data-goto="page" navigates (also works for buttons added later)
    document.addEventListener('click', function (e) {
      const target = e.target.closest('[data-goto]');
      if (target) { e.preventDefault(); App.go(target.dataset.goto); return; }
      // Sidebar links navigate immediately (no waiting for the hashchange event)
      const link = e.target.closest('.nav-link');
      if (link) { e.preventDefault(); App.go(link.dataset.page); }
    });

    // Dashboard quick actions
    document.getElementById('qaMark').addEventListener('click', function () { App.go('attendance'); });
    document.getElementById('qaAdd').addEventListener('click', function () {
      App.go('students');
      if (global.Students) global.Students.openForm();
    });
    document.getElementById('qaReports').addEventListener('click', function () { App.go('reports'); });
    document.getElementById('qaExport').addEventListener('click', function () {
      if (global.Reports) global.Reports.exportCSV();
    });

    // Confirm dialog buttons
    document.getElementById('confirmCancelBtn').addEventListener('click', function () {
      confirmCallback = null;
      App.closeModal('confirmModal');
    });
    document.getElementById('confirmOkBtn').addEventListener('click', function () {
      const cb = confirmCallback;
      confirmCallback = null;
      App.closeModal('confirmModal');
      if (cb) cb();
    });

    // Close modals by clicking the dark backdrop or pressing Escape
    document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
      backdrop.addEventListener('mousedown', function (e) {
        if (e.target === backdrop) {
          if (backdrop.id === 'confirmModal') confirmCallback = null;
          App.closeModal(backdrop.id);
        }
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        confirmCallback = null;
        document.querySelectorAll('.modal-backdrop.open').forEach(function (m) { App.closeModal(m.id); });
        closeSidebar();
      }
    });

    bindSettings();

    // Feature modules
    if (global.Students) global.Students.init();
    if (global.Attendance) global.Attendance.init();
    if (global.Reports) global.Reports.init();

    // Routing via URL hash (#students, #reports ...)
    global.addEventListener('hashchange', function () {
      App.showPage(global.location.hash.replace('#', ''));
    });
    App.showPage(global.location.hash.replace('#', '') || 'dashboard');
  }

  global.App = App;
  document.addEventListener('DOMContentLoaded', init);
})(window);
