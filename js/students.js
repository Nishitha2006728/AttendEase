/* ==========================================================
   AttendEase - students.js
   Student management: list, search, filter, add, edit, delete.
   ========================================================== */
(function (global) {
  'use strict';

  const Students = {};
  let editingId = null; // null = adding a new student, otherwise the id being edited

  function $(id) { return document.getElementById(id); }

  /* ---------- Setup ---------- */
  Students.init = function () {
    fillSelect($('studentDeptFilter'), 'All Departments', App.DEPARTMENTS.map(function (d) { return { value: d.code, label: d.code }; }));
    fillSelect($('studentSemFilter'), 'All Semesters', App.SEMESTERS.map(function (n) { return { value: String(n), label: App.semLabel(n) }; }));
    fillSelect($('stDept'), 'Select department', App.DEPARTMENTS.map(function (d) { return { value: d.code, label: d.name }; }));
    fillSelect($('stSem'), 'Select semester', App.SEMESTERS.map(function (n) { return { value: String(n), label: 'Year ' + Math.ceil(n / 2) + ' – Semester ' + n }; }));

    $('studentSearch').addEventListener('input', Students.render);
    $('studentDeptFilter').addEventListener('change', Students.render);
    $('studentSemFilter').addEventListener('change', Students.render);
    $('addStudentBtn').addEventListener('click', function () { Students.openForm(); });
    $('studentCancelBtn').addEventListener('click', function () { App.closeModal('studentModal'); });
    $('studentForm').addEventListener('submit', onSubmit);

    // Edit / Delete buttons inside the table (event delegation)
    $('studentsBody').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit') Students.openForm(btn.dataset.id);
      if (btn.dataset.action === 'delete') confirmDelete(btn.dataset.id);
    });

    // "Clear filters" / "Add student" buttons inside the empty state
    $('studentsEmpty').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'clear') {
        $('studentSearch').value = '';
        $('studentDeptFilter').value = '';
        $('studentSemFilter').value = '';
        Students.render();
      }
      if (btn.dataset.action === 'add') Students.openForm();
    });
  };

  function fillSelect(select, placeholder, options) {
    select.innerHTML = '<option value="">' + App.esc(placeholder) + '</option>' +
      options.map(function (o) { return '<option value="' + App.esc(o.value) + '">' + App.esc(o.label) + '</option>'; }).join('');
  }

  /* ---------- Render the table ---------- */
  Students.render = function () {
    const all = App.getStudents();
    const query = $('studentSearch').value.trim().toLowerCase();
    const dept = $('studentDeptFilter').value;
    const sem = $('studentSemFilter').value;

    const list = all.filter(function (s) {
      const matchesText = !query || s.name.toLowerCase().includes(query) || s.roll.toLowerCase().includes(query);
      const matchesDept = !dept || s.dept === dept;
      const matchesSem = !sem || String(s.sem) === sem;
      return matchesText && matchesDept && matchesSem;
    }).sort(function (a, b) { return a.roll.localeCompare(b.roll, undefined, { numeric: true }); });

    $('studentCount').textContent = all.length
      ? 'Showing ' + list.length + ' of ' + all.length + ' student' + (all.length === 1 ? '' : 's')
      : '';

    const wrap = $('studentsTableWrap');
    const empty = $('studentsEmpty');

    if (!list.length) {
      wrap.hidden = true;
      empty.hidden = false;
      empty.innerHTML = all.length
        ? App.emptyHtml('🔍', 'No matching students', 'Try a different search or clear the filters.',
            '<button class="btn btn-secondary" type="button" data-action="clear">Clear filters</button>')
        : App.emptyHtml('🎓', 'No students registered', 'Add your first student to get started.',
            '<button class="btn" type="button" data-action="add">+ Add Student</button>');
      $('studentsBody').innerHTML = '';
      return;
    }

    wrap.hidden = false;
    empty.hidden = true;
    $('studentsBody').innerHTML = list.map(function (s) {
      return '<tr>' +
        '<td><div class="person"><div class="avatar">' + App.esc(App.initials(s.name)) + '</div><div class="name">' + App.esc(s.name) + '</div></div></td>' +
        '<td><b>' + App.esc(s.roll) + '</b></td>' +
        '<td>' + App.esc(s.email) + '</td>' +
        '<td><span class="badge badge-dept">' + App.esc(s.dept) + '</span></td>' +
        '<td>Year ' + Math.ceil(s.sem / 2) + ' · Sem ' + App.esc(s.sem) + '</td>' +
        '<td><div class="actions">' +
          '<button class="action-btn edit" type="button" data-action="edit" data-id="' + App.esc(s.id) + '" aria-label="Edit ' + App.esc(s.name) + '">Edit</button>' +
          '<button class="action-btn delete" type="button" data-action="delete" data-id="' + App.esc(s.id) + '" aria-label="Delete ' + App.esc(s.name) + '">Delete</button>' +
        '</div></td></tr>';
    }).join('');
  };

  /* ---------- Add / Edit form ---------- */
  Students.openForm = function (id) {
    editingId = id || null;
    clearErrors();
    const form = $('studentForm');
    form.reset();

    if (editingId) {
      const s = App.getStudents().find(function (x) { return x.id === editingId; });
      if (!s) { App.toast('Student not found.', 'error'); return; }
      $('studentModalTitle').textContent = 'Edit Student';
      $('studentSubmitBtn').textContent = 'Save Changes';
      $('stName').value = s.name;
      $('stRoll').value = s.roll;
      $('stEmail').value = s.email;
      $('stDept').value = s.dept;
      $('stSem').value = String(s.sem);
    } else {
      $('studentModalTitle').textContent = 'Add Student';
      $('studentSubmitBtn').textContent = 'Add Student';
    }
    App.openModal('studentModal');
  };

  function readForm() {
    return {
      name: $('stName').value.trim().replace(/\s+/g, ' '),
      roll: $('stRoll').value.trim().toUpperCase(),
      email: $('stEmail').value.trim().toLowerCase(),
      dept: $('stDept').value,
      sem: $('stSem').value
    };
  }

  // Returns an object like { name: 'message', roll: 'message' } (empty = valid)
  Students.validate = function (data, ignoreId) {
    const errors = {};

    if (!data.name) errors.name = 'Student name is required.';
    else if (data.name.length < 2) errors.name = 'Name must be at least 2 characters.';
    else if (!/^[A-Za-z][A-Za-z .'\-]*$/.test(data.name)) errors.name = 'Use letters, spaces, dots, hyphens or apostrophes only.';

    if (!data.roll) errors.roll = 'Roll number is required.';
    else if (!/^[A-Z0-9][A-Z0-9\-\/]{1,19}$/.test(data.roll)) errors.roll = 'Use 2–20 letters, digits, "-" or "/".';
    else {
      const duplicate = App.getStudents().some(function (s) {
        return s.id !== ignoreId && s.roll.toUpperCase() === data.roll;
      });
      if (duplicate) errors.roll = 'This roll number is already registered.';
    }

    if (!data.email) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = 'Enter a valid email address.';

    if (!data.dept) errors.dept = 'Please select a department.';
    if (!data.sem) errors.sem = 'Please select a year / semester.';

    return errors;
  };

  const FIELD_MAP = { name: 'stName', roll: 'stRoll', email: 'stEmail', dept: 'stDept', sem: 'stSem' };

  function clearErrors() {
    Object.keys(FIELD_MAP).forEach(function (key) {
      $('err-' + key).textContent = '';
      $(FIELD_MAP[key]).classList.remove('invalid');
    });
  }

  function showErrors(errors) {
    clearErrors();
    let firstField = null;
    Object.keys(errors).forEach(function (key) {
      $('err-' + key).textContent = errors[key];
      $(FIELD_MAP[key]).classList.add('invalid');
      if (!firstField) firstField = $(FIELD_MAP[key]);
    });
    if (firstField) firstField.focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    const data = readForm();
    const errors = Students.validate(data, editingId);

    if (Object.keys(errors).length) {
      showErrors(errors);
      App.toast('Please fix the errors in the form.', 'error');
      return;
    }

    const students = App.getStudents();
    if (editingId) {
      const s = students.find(function (x) { return x.id === editingId; });
      if (!s) { App.toast('Student not found.', 'error'); return; }
      s.name = data.name; s.roll = data.roll; s.email = data.email;
      s.dept = data.dept; s.sem = Number(data.sem);
      App.saveStudents(students);
      App.toast('Student "' + s.name + '" updated successfully.', 'success');
    } else {
      students.push({
        id: App.uid(), name: data.name, roll: data.roll, email: data.email,
        dept: data.dept, sem: Number(data.sem), createdAt: Date.now()
      });
      App.saveStudents(students);
      App.toast('Student "' + data.name + '" added successfully.', 'success');
    }

    App.closeModal('studentModal');
    editingId = null;
    Students.render();
  }

  /* ---------- Delete ---------- */
  function confirmDelete(id) {
    const s = App.getStudents().find(function (x) { return x.id === id; });
    if (!s) return;
    App.confirm({
      title: 'Delete student?',
      message: 'Delete "' + s.name + '" (' + s.roll + ')? Their attendance records will also be removed. This cannot be undone.',
      confirmText: 'Delete'
    }, function () { deleteStudent(id, s.name); });
  }

  function deleteStudent(id, name) {
    App.saveStudents(App.getStudents().filter(function (s) { return s.id !== id; }));

    // Remove this student's attendance entries (and any date left with no entries)
    const attendance = App.getAttendance();
    Object.keys(attendance).forEach(function (date) {
      delete attendance[date][id];
      if (!Object.keys(attendance[date]).length) delete attendance[date];
    });
    App.saveAttendance(attendance);

    App.toast('Student "' + name + '" deleted.', 'success');
    Students.render();
  }

  global.Students = Students;
})(window);
