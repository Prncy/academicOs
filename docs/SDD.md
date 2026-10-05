# AcademicOS: System Design Document (SDD)

**Version:** 1.0 (draft, awaiting approval)
**Companion to:** SRS.md (requirement IDs such as FR-P1 refer to it)

---

## 1. Design Principles
1. **Simple and readable first.** A student developer must be able to follow every file.
2. **One job per file.** Storage, formulas, data logic and screen code never mix.
3. **Compute, don't store.** Only raw inputs are saved; every result is calculated on demand.
4. **Never fail silently.** Errors are caught and shown or logged with a clear message.
5. **Verify in a real browser.** Automated tests help, but a stage is only accepted after the owner's own browser test (section 9).

---

## 2. Architecture

```
   Pages          index.html   program.html   course.html
                        |
   Screen code    ui-home.js   ui-program.js  ui-course.js     (show things, handle clicks)
                        |
   Data logic     programs.js  years.js  courses.js  assessments.js  grading.js
                        |
   Formulas       calculations.js        (pure functions: data in, numbers out; no DOM, no storage)
                        |
   Storage        datastore.js           (the ONLY file that touches localStorage)

   Shared         utils.js (escape, URL params, formatting)    app.js (startup, header, profile)
```

**Dependency rule:** arrows only point downward. A file may use files below it, never above it. `calculations.js` uses nothing.

---

## 3. File Structure and Responsibilities

```
AcademicOS/
  index.html  program.html  course.html  settings.html (later)  about.html (later)
  css/style.css
  js/  datastore.js  utils.js  years.js  programs.js  courses.js
       assessments.js  grading.js  calculations.js  app.js
       ui-home.js  ui-program.js  ui-course.js
  docs/  SRS.md  SDD.md
  assets/
```

Files are created only in the phase that needs them. Each file exposes **one namespaced object** (e.g. `DataStore`, `Programs`) and nothing else global.

| File | Owns | Must NOT |
|---|---|---|
| datastore.js | load, save, defaults, schema check, migration, ID generation, corrupt-data backup | know about screens or formulas |
| utils.js | HTML escaping, URL parameter reader, greeting, number formatting | contain business rules |
| years.js | build years for a program, includeInGPA toggle, completion override | touch the screen |
| programs.js | program validation, create, rename, cascade delete, search | touch the screen |
| courses.js, assessments.js | CRUD and validation | touch the screen |
| grading.js | grading scale read, edit, validate | calculate course results |
| calculations.js | every formula (section 7) | read storage or touch the screen |
| app.js | startup checks, header buttons, profile name, shared pop-up | hold page-specific logic |
| ui-*.js | render one page, handle its clicks | contain formulas or touch localStorage |

### 3.1 Naming rule (lesson learned)
Browsers already define global names such as `Storage`, `Event`, `Location` and `History`. Declaring our own module with one of those names can clash. Our storage module is therefore named `DataStore`, and new module names are checked against the browser's built-in names before use.

### 3.2 Script loading
Plain `<script>` tags in a fixed order, each file using only files listed before it:
`datastore.js, utils.js, (data logic files), calculations.js, app.js, ui-page.js`.
Plain scripts are used instead of ES modules because modules do not run from a double-clicked `file://` page.

---

## 4. Data Design

### 4.1 Storage
One localStorage key (`academicos:data`) holds one object. Entities are flat arrays linked by IDs. A second key (`academicos:corrupt-backup`) keeps unreadable data for recovery.

### 4.2 Root object
```
{
  schemaVersion: 1,
  profile:      { name, pictureDataUrl },
  gradingScale: { bands: [ { grade, minPercent, gradePoint } ] },
  programs:     [ { id, name, createdAt, updatedAt } ],
  years:        [ { id, programId, yearNumber, includeInGPA, completedOverride } ],
  courses:      [ { id, yearId, code, name, credits, caWeight, examWeight,
                    caMode, examScore, examMax, examDate } ],
  assessments:  [ { id, courseId, type, title, score, maxScore, weight, date } ]
}
```
- `completedOverride`: null means automatic. `credits`, `examScore`, `examMax`, `score`, `weight`, `date` may be null. `date` is `YYYY-MM-DD`; older records without it are read as null, so no schema version bump is needed.
- `caMode` is `"pooled"` or `"weighted"`. `type` is `"assignment"` or `"test"`.
- The exam belongs to its course (one per course), so it is part of the course record.

### 4.3 Rules
- IDs are generated (UUID, with a fallback), never array positions.
- Deleting a parent removes all descendants in one save (program, then years, then courses, then assessments).
- The year count of a program is counted from `years`, not stored.
- `schemaVersion` plus a `migrate()` step makes later changes safe.
- Not stored: percentages, CA, final %, grade, grade point, GPA, progress.

---

## 5. Key Flows

**Startup (every page):** scripts load, `app.js` runs a startup check (are all required modules present?), `DataStore.load()` returns valid data, the page's `ui-*.js` renders. If a required module is missing or startup throws, a visible banner states which one (NFR-3).

**Create program:** form submit, `Programs.create()` validates, builds program and years, saves once, returns `{ok}` or `{ok:false, errors}`, the screen shows errors or closes the form and re-renders.

**Delete program:** confirm pop-up, `Programs.remove()` removes the program and all descendants in a single save, re-render.

**Routing:** `program.html?id=...` and `course.html?id=...`. A missing or unknown ID redirects home with a message.

**Rendering approach:** read from storage, render, repeat. No in-memory store or framework.

---

## 6. UI Design
- **Pages:** homepage, program, course, plus settings and about.
- **Pop-ups:** native `<dialog>` for forms and confirmations (name prompt, create/edit, delete, info).
- **Look:** light theme with design tokens (colors, spacing, radius) at the top of the CSS. Chalkboard green and highlighter yellow; Georgia headings, system body font; no external fonts or libraries.
- **Cards and lists:** responsive grid; accordion for years.
- **Feedback:** inline error messages under fields; confirmation before destructive actions.
- **Accessibility:** skip link, labelled inputs, visible focus, keyboard operation, a `hidden`-attribute rule that cannot be overridden by other CSS.

---

## 7. Calculation Design (calculations.js)

All functions are pure. Notation: *p = score ÷ max × 100* for one assessment.

1. **Assessment percentage:** `score / maxScore * 100`.
2. **CA earned (marks out of the CA weight):**
   - *Pooled:* `(sum of scores / sum of maximums) * caWeight`.
   - *Weighted:* `sum(score / max * weight) / sum(weight)`, over marked items that have a weight, scaled to `caWeight`. **Clarified in Phase 7:** dividing by the weights of the marked items (instead of adding raw contributions) keeps the "current CA" meaningful while some work is unmarked. When every item is marked and the weights add up to `caWeight`, both versions give the same answer. A warning shows if the weights do not add up to `caWeight`.
   - **ASSUMPTION:** only assessments that have a score are counted for the "current CA".
3. **Exam earned:** `(examScore / examMax) * examWeight`.
4. **Final percentage:** CA earned plus exam earned; "pending" until the exam score exists.
   - **Floating-point noise:** every result is cleaned to 9 decimal places (so 0.29 x 100 is exactly 29) before comparing or displaying. This is not display rounding.
5. **Grade:** the first band, sorted highest minimum first, whose `minPercent` is at or below the final percentage (unrounded, per D6).
6. **Year GPA:** over that year's courses that have a grade point. Credit-weighted `sum(gradePoint * credits) / sum(credits)` if every included course has credits; otherwise the plain average.
7. **Overall GPA:** the same formula over all courses in years with `includeInGPA = true` (courses pooled, not an average of year GPAs).
8. **Year completed:** override if set; otherwise it has at least one course and all its courses have a final grade.
9. **Progress:** years completed out of total years, plus total course count.

Each function gets test cases with hand-calculated expected values, including zero scores, no assessments, no courses, and weights that do not sum correctly.

---

## 8. Error Handling and Security
- **Storage:** every read and write is wrapped in try/catch. A failed save returns `false` and the screen tells the user. Corrupt data is copied to the backup key before defaults replace it.
- **Validation:** all user input is validated in the data-logic files (not only in the HTML), returning clear messages.
- **XSS:** user text is inserted with `textContent`, or run through `Utils.escapeHtml` before any `innerHTML`.
- **Imported data (Phase 11):** shape-checked and version-checked before replacing anything; the user confirms.
- **Privacy:** data never leaves the device; no network requests are made.
- **Diagnosability:** console messages use an `AcademicOS:` prefix; startup failures show a visible banner.

---

## 9. Testing Strategy
1. **Stage gate (most important):** after each stage the project owner opens the page in a real browser with the console open (F12), runs the stage checklist, and reports any red console error. The next stage does not start until the stage passes.
2. **Automated checks:** logic tests for data and calculation files, and a simulated-browser run of page flows. These catch regressions but **do not replace** the real-browser stage gate.
3. **Calculation tests:** hand-calculated cases before any formula is accepted.
4. **Storage tests:** empty, corrupted, wrong-shape and storage-full cases.
5. **Manual checklist per phase:** keyboard use, phone width, reload persistence.

---

## 10. Build Plan (stages)

| Stage | Contents | Owner check |
|---|---|---|
| 1.1 | `datastore.js`, `utils.js`, minimal `index.html` that runs a self-check and prints module status on the page | Page shows all modules OK, no console errors |
| 1.2 | Full homepage layout and styling | Looks right at desktop and phone widths |
| 1.3 | `app.js`, `ui-home.js`: greeting, name prompt, Settings/About/Create pop-ups | Every button responds |
| 2.1 | `years.js`, `programs.js` | (logic tested automatically) |
| 2.2 | Program UI: form, cards, search, edit, delete | Full create/edit/delete/search run-through |
| 3+ | One logical feature per stage, same pattern | Stage checklist |

Stage 1.1 exists specifically so that a failure to load scripts shows up immediately and visibly, before any feature depends on it.

---

## 11. Risks
| Risk | Mitigation |
|---|---|
| Scripts silently fail in a real browser (the problem that triggered the restart) | Visible startup self-check, `DataStore` naming, real-browser stage gate |
| Late changes to the data shape | `schemaVersion` and `migrate()` |
| Silent calculation errors | Hand-calculated test cases |
| Data loss when the browser is cleared | JSON export and import (D5) |
| Profile picture exceeds storage | Resize and cap before saving |
