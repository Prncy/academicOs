/* ==========================================================================
   ui-program.js
   --------------------------------------------------------------------------
   Everything that happens on the program page (program.html): the stats, the
   progress bar, the list of academic years, and the courses inside each year.
   Which program to show comes from the address: program.html?id=...
   It shows things and reacts to clicks; the real work (validation, saving)
   is done by programs.js, years.js and courses.js.
   Must load AFTER app.js, programs.js and courses.js.
   ========================================================================== */

const ProgramUI = (function () {
  const el = App.getEl; // el("x") finds the element with id "x" or throws a clear error

  let program = null;          // the program being shown
  let courseFormYearId = null; // the year the course form is adding to
  let editingCourseId = null;  // null = the course form is in "add" mode
  let deletingCourseId = null;

  function showNotFound() {
    el("program-view").hidden = true;
    el("not-found").hidden = false;
    document.title = "Program not found · AcademicOS";
  }

  /* ---------- Stats and progress bar ---------- */

  function renderStats() {
    const stats = Programs.getStats(program.id);

    el("stat-years").textContent = stats.yearsCompleted + " / " + stats.totalYears;
    el("stat-courses").textContent = String(stats.totalCourses);
    el("stat-gpa").textContent = "—"; // real GPA arrives in Phase 9

    el("progress-fill").style.width = stats.progressPercent + "%";
    el("progress").setAttribute("aria-valuenow", String(stats.progressPercent));
    el("progress-label").textContent =
      stats.yearsCompleted + " / " + stats.totalYears + " Years Completed";
  }

  /* ---------- Years and courses ---------- */

  // One course card.
  // SECURITY: course codes and names are typed by the user, so they go through
  // Utils.escapeHtml before entering an HTML string.
  function courseHtml(course) {
    const id = Utils.escapeHtml(course.id);
    const code = Utils.escapeHtml(course.code);
    const name = Utils.escapeHtml(course.name);
    const credits = course.credits === null
      ? "No credits set"
      : course.credits + (course.credits === 1 ? " credit" : " credits");

    return (
      '<article class="course-card" data-course-id="' + id + '">' +
        '<p class="course-code">' + code + "</p>" +
        '<h4 class="course-name">' + name + "</h4>" +
        '<p class="course-meta">CA ' + course.caWeight + "% · Exam " + course.examWeight + "% · " + credits + "</p>" +
        '<div class="card-actions">' +
          '<button type="button" class="btn-primary btn-small" data-action="open-course" aria-label="Open ' + code + '">Open</button>' +
          '<button type="button" class="btn-secondary btn-small" data-action="edit-course" aria-label="Edit ' + code + '">Edit</button>' +
          '<button type="button" class="btn-danger btn-small" data-action="delete-course" aria-label="Delete ' + code + '">Delete</button>' +
        "</div>" +
      "</article>"
    );
  }

  // One year, as a native <details> element: the browser handles open/close
  // itself, with keyboard support, so we need no extra code.
  function yearHtml(year, isOpen) {
    const id = Utils.escapeHtml(year.id);
    const courses = Courses.getForYear(year.id);
    const coursesLabel = courses.length + (courses.length === 1 ? " Course" : " Courses");
    const status = year.completedOverride === true ? "done"
      : year.completedOverride === false ? "notdone" : "auto";

    function option(value, label) {
      return '<option value="' + value + '"' + (status === value ? " selected" : "") + ">" + label + "</option>";
    }

    const courseArea = courses.length === 0
      ? '<p class="empty-courses">No courses yet. Click "+ Add Course" to add one.</p>'
      : '<div class="courses-grid">' + courses.map(courseHtml).join("") + "</div>";

    return (
      '<details class="year" data-year-id="' + id + '"' + (isOpen ? " open" : "") + ">" +
        "<summary>" +
          '<span class="year-title">Year ' + year.yearNumber + "</span>" +
          (Years.isCompleted(year) ? '<span class="badge-done">Completed</span>' : "") +
          '<span class="year-meta">' + coursesLabel + " · GPA: —</span>" +
        "</summary>" +
        '<div class="year-body">' +
          '<div class="year-settings">' +
            '<label class="toggle"><input type="checkbox" data-action="gpa-toggle"' +
              (year.includeInGPA ? " checked" : "") + "> Include in overall GPA</label>" +
            '<label class="status">Status ' +
              '<select data-action="completion">' +
                option("auto", "Automatic") + option("done", "Completed") + option("notdone", "Not completed") +
              "</select></label>" +
          "</div>" +
          '<div class="year-courses-header">' +
            "<h3>Courses</h3>" +
            '<button type="button" class="btn-primary btn-small" data-action="add-course">+ Add Course</button>' +
          "</div>" +
          courseArea +
        "</div>" +
      "</details>"
    );
  }

  // Draws all the years. openIds = which years should be open. When it is not
  // given (first draw) only Year 1 is open.
  function renderYears(openIds) {
    const years = Years.getForProgram(program.id);
    el("years-list").innerHTML = years.map(function (year) {
      const isOpen = openIds ? openIds.includes(year.id) : year.yearNumber === 1;
      return yearHtml(year, isOpen);
    }).join("");
  }

  // Which years are open right now (so a re-draw does not close them).
  function getOpenIds() {
    return Array.prototype.map.call(
      el("years-list").querySelectorAll("details[open]"),
      function (details) { return details.dataset.yearId; }
    );
  }

  // Re-draws the years (keeping the same ones open) and the stats.
  function refresh() {
    renderYears(getOpenIds());
    renderStats();
  }

  /* ---------- Course form (add / edit) ---------- */

  function setError(elementId, message) {
    const element = el(elementId);
    element.textContent = message || "";
    element.hidden = !message;
  }

  function showCourseErrors(errors) {
    setError("course-code-error", errors.code);
    setError("course-name-error", errors.name);
    setError("course-weights-error", errors.weights);
    setError("course-credits-error", errors.credits);
    setError("course-general-error", errors.general);
  }

  // Opens the form. Pass a course to EDIT it, or null to ADD to the given year.
  function openCourseForm(yearId, course) {
    const year = Years.getForProgram(program.id).find(function (y) { return y.id === yearId; });
    if (!year) { refresh(); return; } // the year vanished; just refresh

    courseFormYearId = yearId;
    editingCourseId = course ? course.id : null;

    el("course-form-title").textContent = course ? "Edit course" : "Add course to Year " + year.yearNumber;
    el("course-submit").textContent = course ? "Save changes" : "Add course";
    el("course-code").value = course ? course.code : "";
    el("course-name").value = course ? course.name : "";
    el("course-ca").value = course ? course.caWeight : Courses.DEFAULT_CA_WEIGHT;
    el("course-exam").value = course ? course.examWeight : Courses.DEFAULT_EXAM_WEIGHT;
    el("course-credits").value = course && course.credits !== null ? course.credits : "";
    showCourseErrors({});

    el("course-dialog").showModal();
    el("course-code").focus();
  }

  function handleCourseSubmit(event) {
    event.preventDefault(); // stop the browser reloading the page

    const fields = {
      code: el("course-code").value,
      name: el("course-name").value,
      caWeight: el("course-ca").value,
      examWeight: el("course-exam").value,
      credits: el("course-credits").value,
    };
    const result = editingCourseId
      ? Courses.update(editingCourseId, fields)
      : Courses.create(courseFormYearId, fields);

    if (!result.ok) {
      showCourseErrors(result.errors); // keep the pop-up open and explain why
      return;
    }
    el("course-dialog").close();
    refresh();
  }

  /* ---------- Delete course ---------- */

  function openDeleteCourseDialog(course) {
    deletingCourseId = course.id;
    el("delete-course-name").textContent = course.code + ": " + course.name; // textContent = safe
    el("delete-course-dialog").showModal();
  }

  function confirmDeleteCourse() {
    const result = Courses.remove(deletingCourseId);
    el("delete-course-dialog").close();
    deletingCourseId = null;
    if (!result.ok) App.showInfo("Could not delete", result.errors.general);
    refresh();
  }

  /* ---------- Clicks and changes inside the years list ---------- */

  // One listener for every button in the list ("event delegation"): the list
  // is redrawn often, so this is simpler than attaching listeners to buttons.
  function handleClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    if (action === "add-course") {
      openCourseForm(button.closest(".year").dataset.yearId, null);
      return;
    }

    const card = button.closest(".course-card");
    if (!card) return;
    const course = Courses.getById(card.dataset.courseId);
    if (!course) { refresh(); return; } // it no longer exists

    if (action === "open-course") {
      App.showInfo("Coming in Phase 5", "The course page, with assignments, tests and your results, is built in Phase 5.");
    } else if (action === "edit-course") {
      openCourseForm(course.yearId, course);
    } else if (action === "delete-course") {
      openDeleteCourseDialog(course);
    }
  }

  // One listener for every checkbox and drop-down in the list.
  function handleChange(event) {
    const control = event.target;
    const yearElement = control.closest(".year");
    if (!yearElement || !control.dataset.action) return;
    const yearId = yearElement.dataset.yearId;

    if (control.dataset.action === "gpa-toggle") {
      const result = Years.setIncludeInGPA(yearId, control.checked);
      if (!result.ok) {
        control.checked = !control.checked; // undo, since it did not save
        App.showInfo("Could not save", result.errors.general);
      }
    } else if (control.dataset.action === "completion") {
      const choices = { auto: null, done: true, notdone: false };
      const result = Years.setCompletedOverride(yearId, choices[control.value]);
      if (!result.ok) App.showInfo("Could not save", result.errors.general);
      refresh();
    }
  }

  /* ---------- Startup ---------- */

  function init() {
    const id = Utils.getQueryParam("id");
    program = id ? Programs.getById(id) : null;
    if (!program) {
      showNotFound();
      return;
    }

    const yearCount = Programs.getYearCount(program.id);
    document.title = program.name + " · AcademicOS";
    el("program-title").textContent = program.name; // textContent = safe plain text
    el("program-subtitle").textContent = yearCount + " Academic " + (yearCount === 1 ? "Year" : "Years");
    el("program-view").hidden = false;

    renderStats();
    renderYears(null);

    el("years-list").addEventListener("click", handleClick);
    el("years-list").addEventListener("change", handleChange);
    el("course-form").addEventListener("submit", handleCourseSubmit);
    el("course-cancel").addEventListener("click", function () { el("course-dialog").close(); });
    el("delete-course-cancel").addEventListener("click", function () { el("delete-course-dialog").close(); });
    el("delete-course-confirm").addEventListener("click", confirmDeleteCourse);
  }

  init();

  return { renderStats, renderYears };
})();
