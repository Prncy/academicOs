# AcademicOS: Software Requirements Specification (SRS)

**Version:** 1.0 (draft, awaiting approval)
**Status markers used below:**
- **DECISION**: confirmed by the project owner.
- **ASSUMPTION**: proposed by the architect, needs confirmation before it is built.

---

## 1. Introduction

### 1.1 Purpose
This document defines WHAT AcademicOS must do. HOW it is built is in the System Design Document (SDD.md).

### 1.2 Product summary
AcademicOS is a personal academic management web app. A student creates programs, organizes them by academic year, adds courses, records assignments, tests and exams, calculates Continuous Assessment (CA), defines a grading scale, and sees GPA and academic progress in one place.

### 1.3 Scope
**In scope (v1):** single-user, client-only app with data stored in the browser.
**Out of scope (v1):** accounts or login, servers, databases, external APIs, university-portal integration, budget tracker, academic task manager, messaging integration.

### 1.4 Definitions
| Term | Meaning |
|---|---|
| Program | What the student studies (e.g. Bachelor of Computer Science) |
| Year | One academic year of a program (Year 1 to Year N) |
| Course | A subject within a year (code and name) |
| Assessment | An assignment or test with a score and a maximum mark |
| CA | Continuous Assessment: the coursework portion of a course grade |
| Grading scale | Table mapping a minimum percentage to a grade and a grade point |
| GPA | Grade Point Average, optionally weighted by course credits |

---

## 2. Overall Description

### 2.1 Users
One role: the student, who owns all data on their own device. There are no other roles and no permissions.

### 2.2 Operating environment
- **DECISION:** works when `index.html` is opened by double-clicking (no server, no build step).
- Current versions of Chrome, Edge, Firefox and Safari, on desktop and phone.

### 2.3 Constraints
- **DECISION:** HTML, CSS, vanilla JavaScript, browser localStorage only. No frameworks, backend, authentication, SQL or external APIs.
- **DECISION:** readable, modular, commented, beginner-friendly code. No single giant script.
- **DECISION:** reusable pages (`index.html`, `program.html`, `course.html`), never one HTML file per program, year or course.
- **DECISION:** developed in small phases; each phase keeps earlier features working and is tested before the next begins.

### 2.4 Navigation
Homepage, then Program, then Year (expands inside the program page), then Course.

---

## 3. Functional Requirements

### 3.1 Homepage (Phase 1)
- **FR-H1** Header with the AcademicOS name, a Settings entry and an About Me entry.
- **FR-H2** Personalized greeting using the stored name and time of day (morning, afternoon, evening).
- **FR-H3** On first visit, ask for the student's name once. **DECISION:** the name is required.
- **FR-H4** Program search bar.
- **FR-H5** Responsive grid of program cards.
- **FR-H6** Empty state ("No programs yet", with a "+ Create Your First Program" button) when no programs exist.

### 3.2 Programs (Phase 2)
- **FR-P1** Create a program with a name and a number of years. Years are generated automatically.
- **FR-P2** Edit a program. **DECISION:** name only in v1.
- **FR-P3** Delete a program after a confirmation. Deleting removes its years, courses and assessments.
- **FR-P4** Live, case-insensitive search by program name, with a "no matches" message.
- **FR-P5** Each card shows name, year count, progress and GPA (a dash until available), and Open, Edit and Delete buttons.
- **FR-P6** Validation: name required, trimmed, up to 80 characters, no duplicate names (case-insensitive); years a whole number from 1 to 8. **DECISION.**

### 3.3 Program page and years (Phase 3)
- **FR-Y1** Back button, program name, year count, years completed, total courses, overall GPA and progress bar.
- **FR-Y2** Years in an expandable list showing course count and year GPA.
- **FR-Y3** Each year has an `includeInGPA` setting the student can change. Defaults: Year 1 off, Year 2 off, Year 3 and later on. **DECISION.**
- **FR-Y4** **ASSUMPTION:** in programs of 1 or 2 years, all years default to on (otherwise no GPA could exist).
- **FR-Y5** **ASSUMPTION:** a year is "completed" automatically when it has at least one course and every course has a final result, with a manual override.

### 3.4 Courses (Phases 4 to 5)
- **FR-C1** Add, edit, delete and open courses within a year.
- **FR-C2** Course fields: code, name, CA weight, exam weight (sum to 100), credits (optional).
- **FR-C3** Course page summary: current CA, exam score, final percentage, grade, GPA.

### 3.5 Assessments (Phase 6)
- **FR-A1** Add, edit and delete assignments and tests with a title, a score and a maximum mark.
- **FR-A2** A score must be between 0 and the maximum; the maximum must be greater than 0.
- **FR-A3** Assessments need not be out of 100.

### 3.6 CA and exam (Phase 7)
- **FR-CA1** The student defines the CA/Exam split per course (e.g. 40/60).
- **FR-CA2** **ASSUMPTION:** two CA modes per course. *Pooled:* total scores divided by total maximums. *Weighted:* each assessment carries its own weight in marks. Both are stored so either can be chosen without a data migration.
- **FR-CA3** Exam score and exam maximum are entered per course.

### 3.7 Grading system (Phase 8)
- **FR-G1** Editable grading table (grade, minimum percentage, grade point), with the PRD defaults (A 80 = 4.0, B+ 75 = 3.5, B 70 = 3.0, C+ 65 = 2.5, C 60 = 2.0).
- **FR-G2** **ASSUMPTION:** an F band at 0% is included so every score maps to a grade.
- **FR-G3** Validation: unique grades, unique minimums, lowest minimum is 0.

### 3.8 GPA and progress (Phases 9 to 10)
- **FR-GPA1** Pipeline: scores, then course percentage, then grade, then grade point, then year GPA, then overall GPA.
- **FR-GPA2** Only years with `includeInGPA = true` count toward overall GPA.
- **FR-GPA3** **ASSUMPTION:** credit-weighted when every course in the calculation has credits; otherwise a plain average of grade points.
- **FR-PR1** Progress is calculated from stored data: years completed out of total years, total courses, and a progress bar.

### 3.9 Profile, settings, about (Phases 1 and 11)
- **FR-S1** Settings: student name, profile picture (resized before saving), grading system editor, clear all data (with confirmation).
- **FR-S2** About Me: static text about the developer and the app. No Contact section.

### 3.10 Backup (proposed)
- **FR-B1** **ASSUMPTION:** export all data to a JSON file and import it back, with validation. Proposed for Phase 11 because clearing browser data would otherwise erase everything.

---

## 4. Data Requirements
- All data is kept in one versioned object in localStorage (structure in SDD section 4).
- Derived values (percentages, grades, GPA, progress, counts) are never stored; they are always computed.
- Every entity has a unique ID.

---

## 5. Non-Functional Requirements
- **NFR-1 Reliability:** the app must open even if saved data is empty, corrupted or the wrong shape. Bad data is backed up, not silently destroyed.
- **NFR-2 Security:** all user-entered text is escaped or inserted as plain text before display (XSS). Imported data is validated. Data is stored unencrypted on the device, which is accepted for v1 and stated to the user in About.
- **NFR-3 Diagnosability:** if a required script fails to load or crashes at startup, the page shows a visible message naming the problem, so the failure is never silent.
- **NFR-4 Usability:** responsive from phone to desktop; every action gives visible feedback; destructive actions confirm first.
- **NFR-5 Accessibility:** semantic HTML, labelled controls, visible focus, full keyboard use, sufficient contrast.
- **NFR-6 Maintainability:** one file touches storage; formulas live in one pure-calculation file; UI files contain no formulas.
- **NFR-7 Performance:** instant at the expected size (a few programs, tens of courses).
- **NFR-8 Storage limits:** localStorage holds about 5 MB; the profile picture must be resized and size-capped.

---

## 6. Business Rules
- **BR-1** Percentages are always score divided by maximum; assessments are never assumed out of 100.
- **BR-2** CA weight plus exam weight must equal 100.
- **BR-3** Deleting a parent deletes its children, always after confirmation.
- **BR-4** Only years with `includeInGPA = true` feed the overall GPA.
- **BR-5** Grade boundaries must be unambiguous (no gaps or duplicates).

---

## 7. Phases and Acceptance
Each phase is built in stages. After every stage the project owner tests in a real browser with the console open, and the next stage does not start until it passes.

| Phase | Deliverable | Accepted when |
|---|---|---|
| 1 | Foundation and homepage | Page loads with no console errors; name prompt works; Settings, About and Create buttons respond; layout works on phone |
| 2 | Programs: create, edit, delete, search | All FR-P items work and survive a reload |
| 3 | Program page and years | FR-Y items work |
| 4 | Courses | FR-C1, FR-C2 |
| 5 | Course page | FR-C3 layout with placeholders |
| 6 | Assignments and tests | FR-A items |
| 7 | CA and exam calculation | FR-CA items verified against hand-calculated examples |
| 8 | Grading system | FR-G items |
| 9 | GPA | FR-GPA items verified against examples |
| 10 | Progress and dashboard | FR-PR1 |
| 11 | Settings, profile, backup | FR-S, FR-B |
| 12 | Polish, accessibility, cleanup | NFR-4, NFR-5 checklist passes |

---

## 8. Future Ideas (not v1)
Student budget tracker, academic task manager, messaging integration. They must not influence the v1 architecture.

---

## 9. Open Decisions
These ASSUMPTIONS are built as written unless the project owner changes them before the relevant phase.

| # | Question | Proposed default |
|---|---|---|
| D1 | CA model | Both pooled and weighted supported (FR-CA2) |
| D2 | Credits | Optional per course, plain-average fallback (FR-GPA3) |
| D3 | Year "completed" | Automatic with manual override (FR-Y5) |
| D4 | Fails, retakes, supplementary exams | Not supported in v1; F is just a grade band |
| D5 | JSON export and import | Included in Phase 11 (FR-B1) |
| D6 | Rounding at grade boundaries | Grade lookup uses the unrounded percentage; display shows 1 decimal |
