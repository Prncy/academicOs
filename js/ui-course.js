/* ==========================================================================
   ui-course.js
   --------------------------------------------------------------------------
   Everything that happens on the course page (course.html): the course
   heading, the summary placeholders, and the Assignments / Tests lists with
   their add / edit / delete pop-ups.
   Which course to show comes from the address: course.html?id=...
   It shows things and reacts to clicks; the real work (validation, saving)
   is done by assessments.js.
   Must load AFTER app.js, courses.js and assessments.js.
   ========================================================================== */

const CourseUI = (function () {
  const el = App.getEl; // el("x") finds the element with id "x" or throws a clear error

  let course = null;        // the course being shown
  let formType = null;      // "assignment" or "test": what the form is adding
  let editingId = null;     // null = the form is in "add" mode
  let deletingId = null;

  // Words used on screen for each type.
  const LABELS = {
    assignment: { singular: "assignment", plural: "assignments", dateWord: "Due" },
    test: { singular: "test", plural: "tests", dateWord: "Test date" },
  };

  function showNotFound() {
    el("course-view").hidden = true;
    el("not-found").hidden = false;
    document.title = "Course not found · AcademicOS";
  }

  /* ---------- Assignment / test lists ---------- */

  // One row. SECURITY: titles are typed by the user, so they go through
  // Utils.escapeHtml before entering an HTML string.
  function rowHtml(item) {
    const id = Utils.escapeHtml(item.id);
    const title = Utils.escapeHtml(item.title);
    const label = LABELS[item.type];
    const score = item.score === null
      ? "Not marked yet (out of " + item.maxScore + ")"
      : item.score + " / " + item.maxScore;
    const date = item.date === null ? "No date set" : label.dateWord + " " + Utils.formatDate(item.date);

    return (
      '<li class="assessment-row" data-assessment-id="' + id + '">' +
        '<div class="assessment-info">' +
          '<span class="assessment-title">' + title + "</span>" +
          '<span class="assessment-meta">' + score + " · " + date + "</span>" +
        "</div>" +
        '<div class="assessment-actions">' +
          '<button type="button" class="btn-secondary btn-small" data-action="edit" aria-label="Edit ' + title + '">Edit</button>' +
          '<button type="button" class="btn-danger btn-small" data-action="delete" aria-label="Delete ' + title + '">Delete</button>' +
        "</div>" +
      "</li>"
    );
  }

  function renderList(type) {
    const label = LABELS[type];
    const items = Assessments.getForCourse(course.id, type);
    el(label.plural + "-count").textContent = String(items.length);
    el(label.plural + "-list").innerHTML = items.length === 0
      ? '<p class="empty-courses">No ' + label.plural + ' yet.</p>'
      : '<ul class="assessment-list">' + items.map(rowHtml).join("") + "</ul>";
  }

  function renderAssessments() {
    renderList("assignment");
    renderList("test");
  }

  /* ---------- Add / edit form ---------- */

  function setError(elementId, message) {
    const element = el(elementId);
    element.textContent = message || "";
    element.hidden = !message;
  }

  function showFormErrors(errors) {
    setError("as-title-error", errors.title);
    setError("as-score-error", errors.score);
    setError("as-max-error", errors.maxScore);
    setError("as-date-error", errors.date);
    setError("as-weight-error", errors.weight);
    setError("as-general-error", errors.general);
  }

  // Opens the form. Pass an item to EDIT it, or null to ADD a new one of `type`.
  function openForm(type, item) {
    formType = type;
    editingId = item ? item.id : null;
    const label = LABELS[type];

    el("assessment-form-title").textContent = (item ? "Edit " : "Add ") + label.singular;
    el("as-submit").textContent = item ? "Save changes" : "Add " + label.singular;
    el("as-date-label").textContent = (type === "test" ? "Test date" : "Due date") + " (optional)";

    el("as-title").value = item ? item.title : "";
    el("as-score").value = item && item.score !== null ? item.score : "";
    el("as-max").value = item ? item.maxScore : "";
    el("as-date").value = item && item.date !== null ? item.date : "";
    el("as-weight").value = item && item.weight !== null ? item.weight : "";
    // The weight box only matters for "weighted" courses (Phase 7).
    el("weight-field").hidden = course.caMode !== "weighted";
    showFormErrors({});

    el("assessment-dialog").showModal();
    el("as-title").focus();
  }

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser reloading the page

    // If the weight box is hidden, keep whatever weight the item already has.
    const existing = editingId ? Assessments.getById(editingId) : null;
    const hiddenWeight = existing && existing.weight !== null ? String(existing.weight) : "";

    const fields = {
      title: el("as-title").value,
      score: el("as-score").value,
      maxScore: el("as-max").value,
      date: el("as-date").value,
      weight: el("weight-field").hidden ? hiddenWeight : el("as-weight").value,
    };
    const result = editingId
      ? Assessments.update(editingId, fields)
      : Assessments.create(course.id, formType, fields);

    if (!result.ok) {
      showFormErrors(result.errors); // keep the pop-up open and explain why
      return;
    }
    el("assessment-dialog").close();
    renderAssessments();
  }

  /* ---------- Delete ---------- */

  function openDeleteDialog(item) {
    deletingId = item.id;
    el("delete-as-name").textContent = item.title; // textContent = safe plain text
    el("delete-as-dialog").showModal();
  }

  function confirmDelete() {
    const result = Assessments.remove(deletingId);
    el("delete-as-dialog").close();
    deletingId = null;
    if (!result.ok) App.showInfo("Could not delete", result.errors.general);
    renderAssessments();
  }

  // One listener for every Edit / Delete button in both lists ("event
  // delegation"): the lists are redrawn often, so this is simpler than
  // attaching a listener to each button.
  function handlePanelClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = button.closest(".assessment-row");
    if (!row) return;

    const item = Assessments.getById(row.dataset.assessmentId);
    if (!item) { renderAssessments(); return; } // it no longer exists

    if (button.dataset.action === "edit") openForm(item.type, item);
    else if (button.dataset.action === "delete") openDeleteDialog(item);
  }

  /* ---------- Startup ---------- */

  function init() {
    // Course -> its year -> its program. If any link in the chain is missing
    // (a bad address, or something was deleted), show "not found".
    const id = Utils.getQueryParam("id");
    course = id ? Courses.getById(id) : null;
    const year = course ? Years.getById(course.yearId) : null;
    const program = year ? Programs.getById(year.programId) : null;
    if (!program) {
      showNotFound();
      return;
    }

    // textContent = the text is treated as plain text, never as HTML (safe).
    document.title = course.code + " · " + course.name + " · AcademicOS";
    el("course-code").textContent = course.code;
    el("course-title").textContent = course.name;
    el("course-subtitle").textContent = program.name + " · Year " + year.yearNumber;
    el("course-structure").textContent =
      "CA " + course.caWeight + "% · Exam " + course.examWeight + "% · " + Utils.formatCredits(course.credits);

    // The back link returns to THIS course's program.
    const back = el("back-link");
    back.textContent = "← Back to " + program.name;
    back.setAttribute("href", "program.html?id=" + encodeURIComponent(program.id));

    renderAssessments();
    el("course-view").hidden = false;

    el("add-assignment-btn").addEventListener("click", function () { openForm("assignment", null); });
    el("add-test-btn").addEventListener("click", function () { openForm("test", null); });
    el("assessment-panels").addEventListener("click", handlePanelClick);
    el("assessment-form").addEventListener("submit", handleSubmit);
    el("as-cancel").addEventListener("click", function () { el("assessment-dialog").close(); });
    el("delete-as-cancel").addEventListener("click", function () { el("delete-as-dialog").close(); });
    el("delete-as-confirm").addEventListener("click", confirmDelete);
  }

  init();

  return { renderAssessments };
})();
