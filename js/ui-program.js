/* ==========================================================================
   ui-program.js
   --------------------------------------------------------------------------
   Everything that happens on the program page (program.html): the stats, the
   progress bar, and the list of academic years.
   Which program to show comes from the address: program.html?id=...
   Must load AFTER app.js and programs.js.
   ========================================================================== */

const ProgramUI = (function () {
  const el = App.getEl; // el("x") finds the element with id "x" or throws a clear error

  let program = null; // the program being shown

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

  /* ---------- Years list ---------- */

  // Builds one year as a native <details> element: the browser handles
  // open/close itself, with keyboard support, so we need no extra code.
  function yearHtml(year, isOpen) {
    const id = Utils.escapeHtml(year.id);
    const courses = Years.countCourses(year.id);
    const coursesLabel = courses + (courses === 1 ? " Course" : " Courses");
    const status = year.completedOverride === true ? "done"
      : year.completedOverride === false ? "notdone" : "auto";

    function option(value, label) {
      return '<option value="' + value + '"' + (status === value ? " selected" : "") + ">" + label + "</option>";
    }

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
          '<p class="empty-courses">No courses yet. Adding courses comes in Phase 4.</p>' +
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

  // One listener for every checkbox and drop-down in the list ("event delegation").
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
      renderYears(getOpenIds()); // redraw, keeping the same years open
      renderStats();
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
    el("years-list").addEventListener("change", handleChange);
  }

  init();

  return { renderStats, renderYears };
})();
