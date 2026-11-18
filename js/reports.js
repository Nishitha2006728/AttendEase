/* ==========================================================
   AttendEase - reports.js
   Attendance percentages, monthly summary, low-attendance
   highlighting and CSV export.

   Attendance % = (Present Days + Late Days) / Total Marked Days x 100
   ========================================================== */
(function (global) {
  'use strict';

  const Reports = {};

  function $(id) { return document.getElementById(id); }

  /* ---------- Setup ---------- */
  Reports.init = function () {
    $('repDept').innerHTML = '<option value="">All Departments</option>' +
      App.DEPARTMENTS.map(function (d) { return '<option value="' + App.esc(d.code) + '">' + App.esc(d.code) + '</option>'; }).join('');

    $('repMonth').addEventListener('change', Reports.render);
    $('repDept').addEventListener('change', Reports.render);
    $('exportCsvBtn').addEventListener('click', Reports.exportCSV);
  };

  // Fill the month drop-down with every month that has attendance data
  function refreshMonthOptions(attendance) {
    const select = $('repMonth');
    const previous = select.value;
    const months = {};
    Object.keys(attendance).forEach(function (date) { months[date.slice(0, 7)] = true; });
    const list = Object.keys(months).sort().reverse();

    select.innerHTML = '<option value="">All Time</option>' +
      list.map(function (m) { return '<option value="' + m + '">' + App.esc(App.formatMonth(m)) + '</option>'; }).join('');
    select.value = list.indexOf(previous) !== -1 ? previous : '';
  }

  /* ---------- Data ---------- */
  // Builds one row per student for the current filters
  function buildRows() {
    const attendance = App.getAttendance();
    const month = $('repMonth').value;
    const dept = $('repDept').value;
    const threshold = App.getSettings().threshold;

    return App.getStudents()
      .filter(function (s) { return !dept || s.dept === dept; })
      .sort(function (a, b) { return a.roll.localeCompare(b.roll, undefined, { numeric: true }); })
      .map(function (s) {
        const st = App.studentStats(s.id, attendance, month);
        let status = 'nodata';
        if (st.pct !== null) status = st.pct < threshold ? 'low' : 'good';
        return { student: s, stats: st, status: status };
      });
  }

  function statusText(status) {
    return status === 'low' ? 'Low' : status === 'good' ? 'Good' : 'No data';
  }

  /* ---------- Render ---------- */
  Reports.render = function () {
    const attendance = App.getAttendance();
    refreshMonthOptions(attendance);

    const month = $('repMonth').value;
    const threshold = App.getSettings().threshold;
    const rows = buildRows();

    $('repNote').textContent = 'Students below ' + threshold + '% are highlighted in red';

    renderStats(rows, attendance, month);
    renderStudentTable(rows);
    renderMonthly(attendance);
  };

  function renderStats(rows, attendance, month) {
    let attended = 0, total = 0, low = 0;
    rows.forEach(function (r) {
      attended += r.stats.present + r.stats.late;
      total += r.stats.total;
      if (r.status === 'low') low++;
    });
    const average = total ? (attended / total) * 100 : null;

    // Number of days on which attendance was recorded (within the chosen month)
    const days = Object.keys(attendance).filter(function (d) { return !month || d.slice(0, 7) === month; }).length;

    $('repStats').innerHTML =
      App.statCard('indigo', 'users', 'Students in Report', rows.length, month ? App.formatMonth(month) : 'All time') +
      App.statCard('purple', 'percent', 'Average Attendance', App.fmtPct(average), 'Present + late days') +
      App.statCard('red', 'alert', 'Below ' + App.getSettings().threshold + '%', low, low === 1 ? 'student needs attention' : 'students need attention') +
      App.statCard('green', 'calendar', 'Days Recorded', days, 'Days with saved attendance');
  }

  function renderStudentTable(rows) {
    const wrap = $('repTableWrap');
    const empty = $('repEmpty');

    if (!rows.length) {
      wrap.hidden = true;
      empty.hidden = false;
      empty.innerHTML = App.getStudents().length
        ? App.emptyHtml('🔍', 'No students in this department', 'Choose another department filter.')
        : App.emptyHtml('📄', 'No data to report', 'Add students and mark attendance to see reports.',
            '<button class="btn" type="button" data-goto="students">Go to Students</button>');
      $('repBody').innerHTML = '';
      return;
    }

    wrap.hidden = false;
    empty.hidden = true;
    $('repBody').innerHTML = rows.map(function (r) {
      const s = r.student, st = r.stats;
      const pct = st.pct === null ? 0 : st.pct;
      return '<tr class="' + (r.status === 'low' ? 'row-low' : '') + '">' +
        '<td><div class="person"><div class="avatar">' + App.esc(App.initials(s.name)) + '</div>' +
          '<div><div class="name">' + App.esc(s.name) + '</div><div class="meta">' + App.esc(s.roll) + '</div></div></div></td>' +
        '<td><span class="badge badge-dept">' + App.esc(s.dept) + '</span></td>' +
        '<td class="num">' + st.present + '</td>' +
        '<td class="num">' + st.absent + '</td>' +
        '<td class="num">' + st.late + '</td>' +
        '<td class="num">' + st.total + '</td>' +
        '<td><div class="pct"><div class="pct-bar"><span class="' + (r.status === 'low' ? 'low' : '') + '" style="width:' + pct + '%"></span></div><b>' + App.fmtPct(st.pct) + '</b></div></td>' +
        '<td><span class="badge badge-' + r.status + '">' + statusText(r.status) + '</span></td></tr>';
    }).join('');
  }

  // One row per month: days marked, present, late, absent, attendance %
  function renderMonthly(attendance) {
    const dept = $('repDept').value;
    const selected = $('repMonth').value;
    const ids = {};
    App.getStudents().forEach(function (s) { if (!dept || s.dept === dept) ids[s.id] = true; });

    const months = {};
    Object.keys(attendance).forEach(function (date) {
      const key = date.slice(0, 7);
      Object.keys(attendance[date]).forEach(function (id) {
        if (!ids[id]) return;
        const m = months[key] || (months[key] = { days: {}, present: 0, late: 0, absent: 0 });
        m.days[date] = true;
        m[attendance[date][id]]++;
      });
    });

    const keys = Object.keys(months).sort().reverse();
    const wrap = $('monthTableWrap');
    const empty = $('monthEmpty');

    if (!keys.length) {
      wrap.hidden = true;
      empty.hidden = false;
      empty.innerHTML = App.emptyHtml('🗓️', 'No monthly data', 'Save some attendance to see the monthly summary.');
      $('monthBody').innerHTML = '';
      return;
    }

    wrap.hidden = false;
    empty.hidden = true;
    const threshold = App.getSettings().threshold;
    $('monthBody').innerHTML = keys.map(function (key) {
      const m = months[key];
      const total = m.present + m.late + m.absent;
      const pct = total ? ((m.present + m.late) / total) * 100 : null;
      const low = pct !== null && pct < threshold;
      return '<tr' + (key === selected ? ' style="background:#eef2ff"' : '') + '>' +
        '<td><b>' + App.esc(App.formatMonth(key)) + '</b></td>' +
        '<td class="num">' + Object.keys(m.days).length + '</td>' +
        '<td class="num">' + m.present + '</td>' +
        '<td class="num">' + m.late + '</td>' +
        '<td class="num">' + m.absent + '</td>' +
        '<td><div class="pct"><div class="pct-bar"><span class="' + (low ? 'low' : '') + '" style="width:' + (pct || 0) + '%"></span></div><b>' + App.fmtPct(pct) + '</b></div></td></tr>';
    }).join('');
  }

  /* ---------- CSV export ---------- */
  function csvCell(value) {
    const text = String(value === undefined || value === null ? '' : value);
    // Quote cells containing commas, quotes or line breaks. Also neutralise
    // spreadsheet formulas (cells starting with = + - @) for safety.
    const safe = /^[=+\-@]/.test(text) ? "'" + text : text;
    return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  }

  Reports.exportCSV = function () {
    // Works from the dashboard too: make sure the filter controls are populated
    refreshMonthOptions(App.getAttendance());
    const rows = buildRows();
    if (!rows.length) {
      App.toast('There is no data to export.', 'error');
      return;
    }

    const month = $('repMonth').value;
    const dept = $('repDept').value;
    const header = ['Student Name', 'Roll Number', 'Email', 'Department', 'Semester', 'Present Days', 'Absent Days', 'Late Days', 'Total Marked Days', 'Attendance %', 'Status'];
    const lines = [header.map(csvCell).join(',')];

    rows.forEach(function (r) {
      const s = r.student, st = r.stats;
      lines.push([
        s.name, s.roll, s.email, s.dept, s.sem,
        st.present, st.absent, st.late, st.total,
        st.pct === null ? '' : (Math.round(st.pct * 10) / 10).toFixed(1),
        statusText(r.status)
      ].map(csvCell).join(','));
    });

    // "﻿" (BOM) makes Excel open the file with correct characters
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendease_report_' + (month || 'all-time') + (dept ? '_' + dept : '') + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    App.toast('Report exported as CSV (' + rows.length + ' students).', 'success');
  };

  global.Reports = Reports;
})(window);
