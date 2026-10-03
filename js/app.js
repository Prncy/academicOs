/* ==========================================================================
   app.js
   --------------------------------------------------------------------------
   Shared code that EVERY page needs: startup check, the header buttons, the
   student's name, and the small "info" pop-up.
   Page-specific code lives in ui-home.js, ui-program.js, etc.
   Must load AFTER datastore.js and utils.js.
   ========================================================================== */

const App = (function () {
  // Finds an element by its id. If it is missing we THROW, so the red problem
  // box at the top of the page tells us exactly which id is wrong instead of
  // a button silently doing nothing.
  function getEl(id) {
    const element = document.getElementById(id);
    if (!element) throw new Error("Missing element #" + id + " in the HTML");
    return element;
  }

  // Adds a message to the red problem box (see the catcher in index.html).
  function report(message) {
    if (window.AcademicOSBoot) {
      window.AcademicOSBoot.problems.push(message);
      window.AcademicOSBoot.show();
    }
    console.error("AcademicOS: " + message);
  }

  // Returns the saved student name, or "" if none has been set yet.
  function getName() {
    return DataStore.load().profile.name || "";
  }

  // Saves the student's name. Returns true if it saved successfully.
  function setName(name) {
    const data = DataStore.load();
    data.profile.name = String(name).trim();
    return DataStore.save(data);
  }

  // Shows a small pop-up message. We use textContent (not innerHTML) so the
  // text is treated as plain text and can never run as code.
  function showInfo(title, message) {
    getEl("info-title").textContent = title;
    getEl("info-message").textContent = message;
    getEl("info-dialog").showModal();
  }

  // Startup: check that the files we need loaded, then connect the header.
  function init() {
    if (typeof DataStore === "undefined") { report("DataStore is missing (js/datastore.js did not load)."); return; }
    if (typeof Utils === "undefined") { report("Utils is missing (js/utils.js did not load)."); return; }

    DataStore.load(); // makes sure default data exists on first visit

    getEl("settings-btn").addEventListener("click", function () {
      showInfo("Settings", "Profile and grading system settings are coming in a later phase.");
    });
    getEl("about-btn").addEventListener("click", function () {
      showInfo("About Me", "Information about the developer and AcademicOS is coming in a later phase.");
    });
    getEl("info-close").addEventListener("click", function () {
      getEl("info-dialog").close();
    });
  }

  init();

  return { getEl, getName, setName, showInfo };
})();
