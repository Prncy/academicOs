/* ==========================================================================
   assessments.js
   --------------------------------------------------------------------------
   All the logic for assignments and tests ("assessments"): validate, create,
   edit, delete, read. No screen code here. An assessment belongs to ONE course.
   Must load AFTER datastore.js.

   Fields (SRS FR-A1 to FR-A5):
     type        "assignment" or "test"  (fixed once created)
     title       required, unique within the course and type
     maxScore    required, above 0
     score       optional (blank = not marked yet), between 0 and maxScore
     weight      optional, only used by "weighted" courses (Phase 7)
     date        optional, "YYYY-MM-DD" (due date / test date)

   Functions that change data return a "result" object:
     success:  { ok: true, assessment: {...} }
     failure:  { ok: false, errors: { title, maxScore, score, weight, date, general } }
   ========================================================================== */

const Assessments = (function () {
  const TYPES = ["assignment", "test"];
  const MAX_TITLE_LENGTH = 60;
  const MAX_SCORE_LIMIT = 10000;
  const MIN_YEAR = 2000; // ASSUMPTION (SRS FR-A5): dates between 2000 and 2100
  const MAX_YEAR = 2100;
  const SAVE_FAILED = "Could not save. Browser storage may be full or blocked.";

  /* ---------- Small helpers ---------- */

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === "";
  }

  // Blank or non-numeric text gives NaN (plain Number("") would give 0).
  function parseNumber(value) {
    return isBlank(value) ? NaN : Number(value);
  }

  // Blank means "not set", stored as null.
  function parseOptionalNumber(value) {
    return isBlank(value) ? null : Number(value);
  }

  function parseDate(value) {
    return isBlank(value) ? null : String(value).trim();
  }

  // Is this text a REAL calendar date like 2026-02-28? ("2026-02-30" is not.)
  function isValidDate(text) {
    return Utils.isValidDate(text, MIN_YEAR, MAX_YEAR);
  }

  /* ---------- Validation ---------- */

  // Returns an object of error messages (empty object = everything is fine).
  // excludeId lets an assessment keep its own title when editing.
  function validate(fields, courseId, type, excludeId) {
    const errors = {};

    // Title
    const title = String(fields.title).trim();
    if (title === "") {
      errors.title = "Please enter a title.";
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.title = "Title must be " + MAX_TITLE_LENGTH + " characters or fewer.";
    } else {
      const lower = title.toLowerCase();
      const duplicate = DataStore.load().assessments.some(function (a) {
        return a.courseId === courseId && a.type === type && a.id !== excludeId && a.title.toLowerCase() === lower;
      });
      if (duplicate) errors.title = "This course already has a " + type + " with this title.";
    }

    // Maximum mark: required, above 0 (so we never divide by zero).
    const max = parseNumber(fields.maxScore);
    const maxValid = Number.isFinite(max) && max > 0 && max <= MAX_SCORE_LIMIT;
    if (!maxValid) errors.maxScore = "Maximum mark must be a number above 0 (up to " + MAX_SCORE_LIMIT + ").";

    // Score: optional; 0 up to the maximum mark (FR-A2).
    const score = parseOptionalNumber(fields.score);
    if (score !== null) {
      if (!Number.isFinite(score) || score < 0) {
        errors.score = "Score must be a number from 0 upward, or leave it blank.";
      } else if (maxValid && score > max) {
        errors.score = "Score cannot be more than the maximum mark (" + max + ").";
      }
    }

    // Weight: optional; above 0 and up to 100.
    const weight = parseOptionalNumber(fields.weight);
    if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 100)) {
      errors.weight = "Weight must be a number above 0 and up to 100, or leave it blank.";
    }

    // Date: optional, a real date.
    const date = parseDate(fields.date);
    if (date !== null && !isValidDate(date)) {
      errors.date = "Enter a real date (year " + MIN_YEAR + " to " + MAX_YEAR + "), or leave it blank.";
    }

    return errors;
  }

  /* ---------- Read ---------- */

  // A course's assessments, in the order they were added. Pass a type
  // ("assignment" or "test") to get only that kind.
  function getForCourse(courseId, type) {
    return DataStore.load().assessments.filter(function (a) {
      return a.courseId === courseId && (!type || a.type === type);
    });
  }

  function getById(assessmentId) {
    return DataStore.load().assessments.find(function (a) { return a.id === assessmentId; }) || null;
  }

  /* ---------- Create ---------- */

  function create(courseId, type, fields) {
    if (!TYPES.includes(type)) return { ok: false, errors: { general: "Unknown assessment type." } };

    const data = DataStore.load();
    if (!data.courses.some(function (c) { return c.id === courseId; })) {
      return { ok: false, errors: { general: "That course no longer exists." } };
    }

    const errors = validate(fields, courseId, type, null);
    if (Object.keys(errors).length > 0) return { ok: false, errors: errors };

    const assessment = {
      id: DataStore.generateId(),
      courseId: courseId,
      type: type,
      title: String(fields.title).trim(),
      score: parseOptionalNumber(fields.score),
      maxScore: Number(fields.maxScore),
      weight: parseOptionalNumber(fields.weight),
      date: parseDate(fields.date),
    };

    data.assessments.push(assessment);
    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true, assessment: assessment };
  }

  /* ---------- Edit ---------- */

  // Edits title, score, max mark, weight and date. Course and type stay fixed.
  function update(assessmentId, fields) {
    const data = DataStore.load();
    const assessment = data.assessments.find(function (a) { return a.id === assessmentId; });
    if (!assessment) return { ok: false, errors: { general: "That item no longer exists." } };

    const errors = validate(fields, assessment.courseId, assessment.type, assessmentId);
    if (Object.keys(errors).length > 0) return { ok: false, errors: errors };

    assessment.title = String(fields.title).trim();
    assessment.score = parseOptionalNumber(fields.score);
    assessment.maxScore = Number(fields.maxScore);
    assessment.weight = parseOptionalNumber(fields.weight);
    assessment.date = parseDate(fields.date);

    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true, assessment: assessment };
  }

  /* ---------- Delete ---------- */

  function remove(assessmentId) {
    const data = DataStore.load();
    if (!data.assessments.some(function (a) { return a.id === assessmentId; })) {
      return { ok: false, errors: { general: "That item no longer exists." } };
    }
    data.assessments = data.assessments.filter(function (a) { return a.id !== assessmentId; });
    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true };
  }

  return {
    TYPES, MAX_TITLE_LENGTH, MAX_SCORE_LIMIT,
    validate, getForCourse, getById, create, update, remove,
  };
})();
