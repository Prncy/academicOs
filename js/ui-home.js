/* ==========================================================================
   ui-home.js
   --------------------------------------------------------------------------
   Everything that happens on the homepage (index.html) and nowhere else:
   the greeting, the program cards, the create/edit/delete pop-ups, search.
   It shows things and reacts to clicks; the real work (validation, saving,
   deleting) is done by programs.js.
   Must load AFTER app.js and programs.js.
   ========================================================================== */

const HomeUI = (function () {
  // Short name for App.getEl: el("greeting") finds the element with that id,
  // or throws a clear error if the HTML does not have it.
  const el = App.getEl;

  // Which program the form / delete pop-up is currently working on.
  // editingId === null means the form is in "create" mode.
  let editingId = null;
  let deletingId = null;

  /* ---------- Greeting ---------- */

  function renderGreeting() {
    const name = App.getName();
    const greeting = Utils.getGreeting();
    el("greeting").textContent = name ? greeting + ", " + name + " 👋" : greeting + " 👋";
  }

  /* ---------- Program cards ---------- */

  // Builds the HTML for one card.
  // SECURITY: program names are typed by the user, so every piece of user text
  // goes through Utils.escapeHtml before it enters an HTML string.
  function cardHtml(program) {
    const name = Utils.escapeHtml(program.name);
    const id = Utils.escapeHtml(program.id);
    const years = Programs.getYearCount(program.id);
    const yearsLabel = years + " Academic " + (years === 1 ? "Year" : "Years");

    return (
      '<article class="program-card" data-id="' + id + '">' +
        "<h3>" + name + "</h3>" +
        '<p class="card-years">' + yearsLabel + "</p>" +
        '<dl class="card-stats">' +
          "<div><dt>Progress</dt><dd>—</dd></div>" +
          "<div><dt>GPA</dt><dd>—</dd></div>" +
        "</dl>" +
        '<div class="card-actions">' +
          '<button type="button" class="btn-primary btn-small" data-action="open">Open Program</button>' +
          '<button type="button" class="btn-secondary btn-small" data-action="edit" aria-label="Edit ' + name + '">Edit</button>' +
          '<button type="button" class="btn-danger btn-small" data-action="delete" aria-label="Delete ' + name + '">Delete</button>' +
        "</div>" +
      "</article>"
    );
  }

  // Decides what the programs area shows: empty state, "no matches", or cards.
  function renderPrograms() {
    const total = Programs.getAll().length;
    const search = el("program-search");

    if (total === 0) search.value = ""; // nothing to search, so clear old text
    const matches = Programs.search(search.value);

    el("empty-state").hidden = total !== 0;
    el("new-program-btn").hidden = total === 0; // the empty state has its own button
    search.disabled = total === 0;
    el("no-results").hidden = !(total > 0 && matches.length === 0);
    el("programs-grid").hidden = matches.length === 0;
    el("programs-grid").innerHTML = matches.map(cardHtml).join("");
  }

  // One listener on the whole grid handles every card's buttons ("event
  // delegation"). Cards are rebuilt often, so this is simpler than attaching
  // a listener to each button.
  function handleGridClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.closest(".program-card").dataset.id;
    const program = Programs.getAll().find(function (p) { return p.id === id; });
    if (!program) {
      renderPrograms(); // it no longer exists; just refresh
      return;
    }

    const action = button.dataset.action;
    if (action === "open") {
      App.showInfo("Coming in Phase 3", "The program page with its academic years is built in the next phase.");
    } else if (action === "edit") {
      openProgramForm(program);
    } else if (action === "delete") {
      openDeleteDialog(program);
    }
  }

  /* ---------- Create / edit form ---------- */

  function setError(elementId, message) {
    const element = el(elementId);
    element.textContent = message || "";
    element.hidden = !message;
  }

  function showFormErrors(errors) {
    setError("program-name-error", errors.name);
    setError("program-years-error", errors.years);
    setError("program-general-error", errors.general);
  }

  // Opens the form. Pass a program to EDIT it, or nothing to CREATE one.
  function openProgramForm(program) {
    editingId = program ? program.id : null;

    el("program-form-title").textContent = program ? "Edit program" : "Create a program";
    el("program-submit").textContent = program ? "Save changes" : "Create program";
    el("program-name").value = program ? program.name : "";
    el("program-years").value = "4";
    el("years-field").hidden = Boolean(program); // v1 edits the name only
    showFormErrors({});

    el("program-dialog").showModal();
    el("program-name").focus();
  }

  function handleProgramSubmit(event) {
    event.preventDefault(); // stop the browser reloading the page

    const name = el("program-name").value;
    const result = editingId
      ? Programs.rename(editingId, name)
      : Programs.create(name, el("program-years").value);

    if (!result.ok) {
      showFormErrors(result.errors); // keep the pop-up open and explain why
      return;
    }

    if (!editingId) el("program-search").value = ""; // so the new card is visible
    el("program-dialog").close();
    renderPrograms();
  }

  /* ---------- Delete ---------- */

  function openDeleteDialog(program) {
    deletingId = program.id;
    el("delete-name").textContent = program.name; // textContent = safe plain text
    el("delete-dialog").showModal();
  }

  function confirmDelete() {
    const result = Programs.remove(deletingId);
    el("delete-dialog").close();
    deletingId = null;
    if (!result.ok) App.showInfo("Could not delete", result.errors.general);
    renderPrograms();
  }

  /* ---------- First-run name prompt ---------- */

  function setupNameDialog() {
    const dialog = el("name-dialog");
    const input = el("name-input");
    const error = el("name-error");

    // Esc normally closes a dialog; block it so the name is not skipped.
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
    });

    el("name-form").addEventListener("submit", function (event) {
      event.preventDefault();

      const name = input.value.trim();
      if (name === "") {
        error.textContent = "Enter a name to continue.";
        error.hidden = false;
        input.focus();
        return;
      }

      if (App.setName(name)) {
        error.hidden = true;
        dialog.close();
        renderGreeting();
      } else {
        error.textContent = "Could not save your name. Browser storage may be full or blocked.";
        error.hidden = false;
      }
    });

    if (App.getName() === "") {
      dialog.showModal();
      input.focus();
    }
  }

  /* ---------- Wiring ---------- */

  function init() {
    renderGreeting();
    renderPrograms();
    setupNameDialog();

    el("create-program-btn").addEventListener("click", function () { openProgramForm(); });
    el("new-program-btn").addEventListener("click", function () { openProgramForm(); });
    el("program-form").addEventListener("submit", handleProgramSubmit);
    el("program-cancel").addEventListener("click", function () { el("program-dialog").close(); });
    el("delete-cancel").addEventListener("click", function () { el("delete-dialog").close(); });
    el("delete-confirm").addEventListener("click", confirmDelete);
    el("programs-grid").addEventListener("click", handleGridClick);
    el("program-search").addEventListener("input", renderPrograms);
  }

  init();

  return { renderGreeting, renderPrograms };
})();
