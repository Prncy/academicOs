/* ==========================================================================
   programs.js
   --------------------------------------------------------------------------
   All the logic for programs: validate, create, rename, delete, search.
   No screen code here. The UI file asks this file to do things and shows
   the result. Must load AFTER datastore.js and years.js.

   Functions that change data return a "result" object, so the screen knows
   what happened:
     success:  { ok: true, ... }
     failure:  { ok: false, errors: { name: "...", years: "...", general: "..." } }
   ========================================================================== */

const Programs = (function () {
  const MAX_NAME_LENGTH = 80;
  const MIN_YEARS = 1;
  const MAX_YEARS = 8;
  const SAVE_FAILED = "Could not save. Browser storage may be full or blocked.";

  /* ---------- Validation ---------- */

  // Returns an error message for a bad name, or "" if the name is fine.
  // excludeId lets a program keep its own name when renaming (otherwise it
  // would count as a duplicate of itself).
  function validateName(name, excludeId) {
    const cleanName = String(name).trim();
    if (cleanName === "") return "Please enter a program name.";
    if (cleanName.length > MAX_NAME_LENGTH) {
      return "Program name must be " + MAX_NAME_LENGTH + " characters or fewer.";
    }
    const lower = cleanName.toLowerCase();
    const duplicate = DataStore.load().programs.some(function (p) {
      return p.id !== excludeId && p.name.toLowerCase() === lower;
    });
    if (duplicate) return "You already have a program with this name.";
    return "";
  }

  // Returns an error message for a bad year count, or "" if it is fine.
  function validateYears(yearCount) {
    const years = Number(yearCount);
    if (yearCount === "" || yearCount === null || !Number.isInteger(years) || years < MIN_YEARS || years > MAX_YEARS) {
      return "Enter a whole number of years from " + MIN_YEARS + " to " + MAX_YEARS + ".";
    }
    return "";
  }

  /* ---------- Create / read ---------- */

  function getAll() {
    return DataStore.load().programs;
  }

  // Creates a program AND its years, then saves both together in one write.
  function create(name, yearCount) {
    const errors = {};
    const nameError = validateName(name, null);
    const yearsError = validateYears(yearCount);
    if (nameError) errors.name = nameError;
    if (yearsError) errors.years = yearsError;
    if (nameError || yearsError) return { ok: false, errors: errors };

    const data = DataStore.load();
    const now = new Date().toISOString();
    const program = {
      id: DataStore.generateId(),
      name: String(name).trim(),
      createdAt: now,
      updatedAt: now,
    };

    data.programs.push(program);
    data.years.push(...Years.createForProgram(program.id, Number(yearCount)));

    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true, program: program };
  }

  // How many years a program has (counted, not stored: see the SDD).
  function getYearCount(programId) {
    return DataStore.load().years.filter(function (y) {
      return y.programId === programId;
    }).length;
  }

  /* ---------- Edit ---------- */

  // v1 edits the NAME only (SRS FR-P2). Changing the year count could delete
  // years that already contain courses, so that is handled in a later phase.
  function rename(programId, newName) {
    const nameError = validateName(newName, programId);
    if (nameError) return { ok: false, errors: { name: nameError } };

    const data = DataStore.load();
    const program = data.programs.find(function (p) { return p.id === programId; });
    if (!program) return { ok: false, errors: { general: "That program no longer exists." } };

    program.name = String(newName).trim();
    program.updatedAt = new Date().toISOString();

    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true, program: program };
  }

  /* ---------- Delete (cascade) ---------- */

  // Deletes a program and EVERYTHING under it:
  // program -> its years -> their courses -> their assessments.
  // All changes are made on one copy of the data and saved once, so we never
  // end up half-deleted.
  function remove(programId) {
    const data = DataStore.load();
    if (!data.programs.some(function (p) { return p.id === programId; })) {
      return { ok: false, errors: { general: "That program no longer exists." } };
    }

    const yearIds = data.years
      .filter(function (y) { return y.programId === programId; })
      .map(function (y) { return y.id; });
    const courseIds = data.courses
      .filter(function (c) { return yearIds.includes(c.yearId); })
      .map(function (c) { return c.id; });

    data.assessments = data.assessments.filter(function (a) { return !courseIds.includes(a.courseId); });
    data.courses = data.courses.filter(function (c) { return !courseIds.includes(c.id); });
    data.years = data.years.filter(function (y) { return !yearIds.includes(y.id); });
    data.programs = data.programs.filter(function (p) { return p.id !== programId; });

    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true };
  }

  /* ---------- Search ---------- */

  // Case-insensitive "contains" match on the program name.
  function search(query) {
    const q = String(query).trim().toLowerCase();
    const all = getAll();
    if (q === "") return all;
    return all.filter(function (p) { return p.name.toLowerCase().includes(q); });
  }

  return {
    MAX_NAME_LENGTH, MIN_YEARS, MAX_YEARS,
    validateName, validateYears, getAll, create, getYearCount, rename, remove, search,
  };
})();
