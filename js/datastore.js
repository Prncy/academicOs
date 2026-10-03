/* ==========================================================================
   datastore.js
   --------------------------------------------------------------------------
   The ONLY file in AcademicOS allowed to touch localStorage.
   Every other file asks this one to load or save data, so if we ever change
   how data is stored, we change it in one place.

   NOTE ON THE NAME: browsers already have a built-in thing called "Storage".
   Re-using that name for our own code can clash, so ours is "DataStore".

   All data lives in ONE object under ONE key:
     { schemaVersion, profile, gradingScale, programs, years, courses,
       assessments }                      (see docs/SDD.md section 4)
   ========================================================================== */

const DataStore = (function () {
  const STORAGE_KEY = "academicos:data";
  const BACKUP_KEY = "academicos:corrupt-backup"; // unreadable data is kept here
  const SCHEMA_VERSION = 1; // bump when the shape of the data changes (migrate)

  /* ---------- Defaults ---------- */

  // A brand-new, empty application state.
  function createDefaultData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: { name: "", pictureDataUrl: null },
      // ASSUMPTION (SRS FR-G2): an "F" band at 0% so every score maps to a grade.
      gradingScale: {
        bands: [
          { grade: "A", minPercent: 80, gradePoint: 4.0 },
          { grade: "B+", minPercent: 75, gradePoint: 3.5 },
          { grade: "B", minPercent: 70, gradePoint: 3.0 },
          { grade: "C+", minPercent: 65, gradePoint: 2.5 },
          { grade: "C", minPercent: 60, gradePoint: 2.0 },
          { grade: "F", minPercent: 0, gradePoint: 0.0 },
        ],
      },
      programs: [],
      years: [],
      courses: [],
      assessments: [],
    };
  }

  /* ---------- Validation and migration ---------- */

  // Does this look like data we can safely use?
  function isValidShape(data) {
    return (
      data !== null &&
      typeof data === "object" &&
      typeof data.schemaVersion === "number" &&
      data.profile !== null && typeof data.profile === "object" &&
      data.gradingScale !== null && typeof data.gradingScale === "object" &&
      Array.isArray(data.programs) &&
      Array.isArray(data.years) &&
      Array.isArray(data.courses) &&
      Array.isArray(data.assessments)
    );
  }

  // Upgrades old saved data to the current shape. Nothing to do on version 1.
  // Later: if (data.schemaVersion < 2) { ...upgrade...; data.schemaVersion = 2; }
  function migrate(data) {
    return data;
  }

  /* ---------- Public functions ---------- */

  // Can we use localStorage at all? (Some browsers block it in private mode.)
  function isAvailable() {
    try {
      localStorage.setItem("academicos:test", "1");
      localStorage.removeItem("academicos:test");
      return true;
    } catch (error) {
      return false;
    }
  }

  // Writes everything to localStorage. Returns true on success, false on
  // failure (for example, if the browser's storage is full).
  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("AcademicOS: could not save data.", error);
      return false;
    }
  }

  // Reads everything. Never throws: if anything goes wrong we fall back to a
  // fresh default state so the app still opens.
  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error("AcademicOS: cannot access localStorage.", error);
      return createDefaultData();
    }

    if (raw === null) { // first visit
      const fresh = createDefaultData();
      save(fresh);
      return fresh;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!isValidShape(parsed)) throw new Error("Saved data has an unexpected shape.");
      return migrate(parsed);
    } catch (error) {
      console.error("AcademicOS: saved data is corrupted.", error);
      try {
        localStorage.setItem(BACKUP_KEY, raw); // keep it instead of destroying it
      } catch (backupError) {
        console.error("AcademicOS: could not back up corrupted data.", backupError);
      }
      const fresh = createDefaultData();
      save(fresh);
      return fresh;
    }
  }

  // Creates a unique ID for a new program, year, course, etc.
  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    // Fallback for contexts without randomUUID (it needs a "secure" page).
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  // Deletes ALL AcademicOS data (used later by Settings > Clear data).
  function clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("AcademicOS: could not clear data.", error);
      return false;
    }
  }

  return { isAvailable, load, save, generateId, clearAll };
})();
