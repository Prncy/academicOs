/* ==========================================================================
   years.js
   --------------------------------------------------------------------------
   Logic for academic years. For now it only builds the years of a new
   program; Phase 3 adds more (toggling includeInGPA, completion override).
   No screen code and no saving here: it just creates plain objects.
   Must load AFTER datastore.js.
   ========================================================================== */

const Years = (function () {
  // Should this year count toward the overall GPA by default?
  // SRS FR-Y3: Year 1 OFF, Year 2 OFF, Year 3 and later ON.
  // ASSUMPTION (FR-Y4): in a program of only 1-2 years that rule would turn
  // EVERY year off, so no GPA could ever exist. For those short programs we
  // default all years ON. The student can change any year later.
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

  return { createForProgram };
})();
