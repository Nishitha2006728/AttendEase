# AttendEase – Student Attendance Management System

> *Smart and Simple Student Attendance Management.*

AttendEase is a modern, browser-based attendance system for colleges, built as a Software Engineering and Software Design (SESD) project. It runs entirely in the browser – no backend, no database server, no paid services. All data is stored in the browser's **LocalStorage**.

**Tech stack:** HTML5 · CSS3 · Vanilla JavaScript · Browser LocalStorage  
**Version:** 1.0.0

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Total students, present / absent today, overall attendance %, today's summary donut, 7-day trend chart, recent students, quick actions |
| **Students** | Add, edit, delete; search by name or roll number; filter by department and semester; duplicate roll numbers blocked; delete confirmation |
| **Attendance** | Pick a date, mark Present / Late / Absent per student, Mark All Present, Clear All, Save, re-open any past date to edit it |
| **Reports** | Per-student present / absent / late days and attendance %, month and department filters, monthly summary table, students below 75% highlighted, CSV export |
| **Settings / About** | App info, version, tech stack, editable minimum-attendance threshold, reset demo data (with confirmation) |

**Attendance formula**

```
Attendance % = (Present Days + Late Days) / Total Marked Days × 100
```

Late counts as attended. A student is flagged **Low** when their percentage is below the threshold (default **75%**, adjustable in Settings).

Other details: form validation with inline messages, success / error toast notifications, empty states on every page, responsive layout (desktop, tablet, mobile with slide-in sidebar), and sample data (10 students + about 7 weeks of attendance) loaded on first open.

---

## Project Structure

```
AttendEase/
├── index.html          # Page layout (sidebar, pages, modals)
├── css/
│   └── style.css       # All styling and responsive rules
├── js/
│   ├── app.js          # Core: storage, helpers, toasts, modals, navigation, dashboard, settings, demo data
│   ├── students.js     # Student CRUD, search, filters, validation
│   ├── attendance.js   # Daily attendance marking and editing
│   └── reports.js      # Percentages, monthly summary, CSV export
├── assets/
│   └── logo.svg
└── README.md
```

`app.js` must be loaded first – it creates the global `App` object that the other three files use.

### How data is stored

| LocalStorage key | Contents |
|---|---|
| `attendease_students` | Array of `{ id, name, roll, email, dept, sem, createdAt }` |
| `attendease_attendance` | Object `{ "YYYY-MM-DD": { studentId: "present" \| "absent" \| "late" } }` |
| `attendease_settings` | Object `{ threshold: 75 }` |

---

## Setup and Running Locally

No installation is needed.

**Option 1 – Open directly**
1. Unzip `AttendEase.zip`.
2. Double-click `index.html` (opens in Chrome, Edge, Firefox or Safari).

**Option 2 – Local server (optional)**
```bash
cd AttendEase
python -m http.server 8000      # or: npx serve
```
Then open <http://localhost:8000>.

**Notes**
- Data lives in *your* browser only. Another browser or device starts with the sample data.
- Clearing site data erases your records. Use **Settings → Reset Demo Data** to restore the samples.

---

## Deploying

### Netlify (drag and drop – easiest)
1. Create a free account at <https://app.netlify.com>.
2. Go to **Sites → Add new site → Deploy manually**.
3. Drag the **AttendEase folder** (the one containing `index.html`) onto the upload area.
4. Netlify gives you a live URL such as `https://your-site-name.netlify.app`. You can rename it under **Site configuration → Change site name**.

### Netlify (via GitHub)
1. Push the project to a GitHub repository.
2. **Add new site → Import an existing project** → choose the repository.
3. Leave the build command empty and set the publish directory to `.` (the root). Click **Deploy**.

### Vercel (dashboard)
1. Push the project to GitHub and sign in at <https://vercel.com>.
2. **Add New → Project** → import the repository.
3. Framework Preset: **Other**. Leave Build Command and Output Directory empty. Click **Deploy**.

### Vercel (CLI)
```bash
npm install -g vercel
cd AttendEase
vercel          # follow the prompts (accept defaults)
vercel --prod   # publish to production
```

---

## Testing Checklist

- [ ] First open shows 10 students and populated dashboard / reports
- [ ] Add a student → appears in table and in "Recent Students"
- [ ] Add a student with an existing roll number → error shown
- [ ] Submit an empty / invalid form → inline errors and error toast
- [ ] Edit a student, then delete one (confirmation appears)
- [ ] Search by name and by roll number; use department / semester filters
- [ ] Mark attendance for today → Dashboard cards update
- [ ] Choose a past date, change statuses, save → Reports update
- [ ] Reports: month and department filters; red highlight below 75%
- [ ] Export CSV opens correctly in Excel
- [ ] Refresh the browser → data is still there
- [ ] Settings → Reset Demo Data asks for confirmation
- [ ] Resize the window / open on a phone → sidebar becomes a slide-in menu

---

## Short Project Description (for SESD submission)

**Project title:** AttendEase – Student Attendance Management System

**Problem statement:** Manual, paper-based attendance in colleges is slow, easy to get wrong, and makes it hard to see which students are falling below the required attendance percentage (typically 75%).

**Solution:** AttendEase is a lightweight web application that digitises attendance. Staff can register students, record daily attendance as Present, Absent or Late, edit earlier records, and instantly view each student's attendance percentage, a monthly summary, and a highlighted list of students below the required threshold. Reports can be exported to CSV for sharing or record keeping.

**Design approach:** The application follows a modular, layered structure. `app.js` provides the shared data-access layer (LocalStorage), utilities and UI helpers; `students.js`, `attendance.js` and `reports.js` each own one feature module and communicate through the shared `App` object. Business rules (duplicate roll-number check, form validation, percentage calculation) are kept in dedicated functions separate from the rendering code. Attendance is stored as a date-keyed map of student statuses, which makes editing a date and calculating monthly statistics straightforward.

**Key features:** student CRUD with validation, date-wise attendance marking and editing, percentage reports with month and department filters, low-attendance alerts, CSV export, dashboard statistics and charts, responsive UI, persistent LocalStorage data.

**Technologies:** HTML5, CSS3, Vanilla JavaScript, LocalStorage (no frameworks, no backend, no paid services).

**Possible future enhancements:** teacher login, a backend database (Node.js + MongoDB or MySQL), email alerts for low attendance, subject-wise attendance, PDF reports.

---

© AttendEase v1.0.0 – built for academic use.
