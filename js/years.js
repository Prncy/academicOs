/* ==========================================================================
   years.js
   --------------------------------------------------------------------------
   Logic for academic years: build them for a new program, read them, change
   their settings. No screen code here.
   Must load AFTER datastore.js.
   ========================================================================== */

const Years = (function () {
  const SAVE_FAILED = "Could not save. Browser storage may be full or blocked.";

  /* ---------- Creating years ---------- */

  // Should this year count toward the overall GPA by default?
  // SRS FR-Y3: Year 1 OFF, Year 2 OFF, Year 3 and later ON.
  // ASSUMPTION (FR-Y4): in a program of only 1-2 years that rule would turn
  // EVERY year off, so no GPA could ever exist. For those short programs we
  // default all years ON. The student can change any year.
  function defaultIncludeInGPA(yearNumber, totalYears) {
    if (totalYears < 3) return true;
    return yearNumber >= 3;
  }

  // Builds the year objects for a program: Year 1 ... Year N.
  function createForProgram(programId, totalYears) {
    const years = [];
    for (let n = 1; n <= totalYears; n++) {
      years.push({
        id: DataStore.generateId(),
        programId: programId,
        yearNumber: n,
        includeInGPA: defaultIncludeInGPA(n, totalYears),
        completedOverride: null, // null = automatic (see SDD section 4)
      });
    }
    return years;
  }

  /* ---------- Reading ---------- */

  // All years of one program, in order (Year 1, Year 2, ...).
  function getForProgram(programId) {
    return DataStore.load().years
      .filter(function (y) { return y.programId === programId; })
      .sort(function (a, b) { return a.yearNumber - b.yearNumber; });
  }

  // How many courses a year has (counted, not stored).
  function countCourses(yearId) {
    return DataStore.load().courses.filter(function (c) {
      return c.yearId === yearId;
    }).length;
  }

  // Is this year completed?
  // true/false = the student chose it manually. null = automatic.
  // Automatic completion ("every course has a final result") needs the
  // calculation files from later phases, so until then automatic means
  // "not completed".
  function isCompleted(year) {
    if (year.completedOverride === true) return true;
    return false;
  }

  /* ---------- Changing settings ---------- */

  // Finds a year, applies a change to it, and saves. Shared by the setters.
  function updateYear(yearId, applyChange) {
    const data = DataStore.load();
    const year = data.years.find(function (y) { return y.id === yearId; });
    if (!year) return { ok: false, errors: { general: "That year no longer exists." } };

    applyChange(year);

    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true };
  }

  // Turns "include this year in the overall GPA" on or off.
  function setIncludeInGPA(yearId, value) {
    return updateYear(yearId, function (year) { year.includeInGPA = Boolean(value); });
  }

  // value: true (completed), false (not completed) or null (automatic).
  function setCompletedOverride(yearId, value) {
    if (value !== true && value !== false && value !== null) {
      return { ok: false, errors: { general: "Invalid completion setting." } };
    }
    return updateYear(yearId, function (year) { year.completedOverride = value; });
  }

  return {
    createForProgram, getForProgram, countCourses, isCompleted,
    setIncludeInGPA, setCompletedOverride,
  };
})();
