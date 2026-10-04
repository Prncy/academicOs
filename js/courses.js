/* ==========================================================================
   courses.js
   --------------------------------------------------------------------------
   All the logic for courses: validate, create, edit, delete, read.
   No screen code here. A course belongs to ONE year (course.yearId).
   Must load AFTER datastore.js (and works alongside years.js / programs.js).

   Course fields the student edits (SRS FR-C2):
     code, name, caWeight, examWeight, credits (optional)
   Fields set later by other phases: examScore, examMax (Phase 7), caMode.

   Functions that change data return a "result" object:
     success:  { ok: true, ... }
     failure:  { ok: false, errors: { code, name, weights, credits, general } }
   ========================================================================== */

const Courses = (function () {
  const MAX_CODE_LENGTH = 20;
  const MAX_NAME_LENGTH = 100;
  const MAX_CREDITS = 30;
  const DEFAULT_CA_WEIGHT = 40;   // SRS FR-CA1 example: CA 40%
  const DEFAULT_EXAM_WEIGHT = 60; //                    Exam 60%
  const SAVE_FAILED = "Could not save. Browser storage may be full or blocked.";

  /* ---------- Small helpers ---------- */

  // Turns form text into a number. Blank or non-numeric text gives NaN.
  // (Plain Number("") would give 0, which would silently accept a blank box.)
  function parseNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return NaN;
    return Number(value);
  }

  // A blank credits box means "no credits entered", stored as null.
  function parseCredits(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    return Number(value);
  }

  /* ---------- Validation ---------- */

  // Checks the form values and returns an object of error messages
  // (empty object = everything is fine).
  // excludeId lets a course keep its own code when editing.
  function validate(fields, yearId, excludeId) {
    const errors = {};

    // Code: required, short, and unique inside the same year (ASSUMPTION).
    const code = String(fields.code).trim();
    if (code === "") {
      errors.code = "Please enter a course code.";
    } else if (code.length > MAX_CODE_LENGTH) {
      errors.code = "Course code must be " + MAX_CODE_LENGTH + " characters or fewer.";
    } else {
      const lower = code.toLowerCase();
      const duplicate = DataStore.load().courses.some(function (c) {
        return c.yearId === yearId && c.id !== excludeId && c.code.toLowerCase() === lower;
      });
      if (duplicate) errors.code = "This year already has a course with this code.";
    }

    // Name: required, not too long.
    const name = String(fields.name).trim();
    if (name === "") {
      errors.name = "Please enter a course name.";
    } else if (name.length > MAX_NAME_LENGTH) {
      errors.name = "Course name must be " + MAX_NAME_LENGTH + " characters or fewer.";
    }

    // Weights: each 0-100, and together exactly 100 (business rule BR-2).
    const ca = parseNumber(fields.caWeight);
    const exam = parseNumber(fields.examWeight);
    const validWeight = function (n) { return Number.isFinite(n) && n >= 0 && n <= 100; };
    if (!validWeight(ca) || !validWeight(exam)) {
      errors.weights = "CA and Exam weights must each be a number from 0 to 100.";
    } else if (Math.abs(ca + exam - 100) > 0.0001) {
      errors.weights = "CA and Exam weights must add up to 100 (currently " + (ca + exam) + ").";
    }

    // Credits: optional; if given, a positive number up to MAX_CREDITS.
    const credits = parseCredits(fields.credits);
    if (credits !== null && (!Number.isFinite(credits) || credits <= 0 || credits > MAX_CREDITS)) {
      errors.credits = "Credits must be a number above 0 and up to " + MAX_CREDITS + ", or leave it blank.";
    }

    return errors;
  }

  /* ---------- Read ---------- */

  // All courses of one year, in the order they were added.
  function getForYear(yearId) {
    return DataStore.load().courses.filter(function (c) { return c.yearId === yearId; });
  }

  // One course by id, or null.
  function getById(courseId) {
    return DataStore.load().courses.find(function (c) { return c.id === courseId; }) || null;
  }

  // How many assessments of a type ("assignment" or "test") a course has.
  function countAssessments(courseId, type) {
    return DataStore.load().assessments.filter(function (a) {
      return a.courseId === courseId && a.type === type;
    }).length;
  }

  /* ---------- Create ---------- */

  function create(yearId, fields) {
    const data = DataStore.load();
    if (!data.years.some(function (y) { return y.id === yearId; })) {
      return { ok: false, errors: { general: "That year no longer exists." } };
    }

    const errors = validate(fields, yearId, null);
    if (Object.keys(errors).length > 0) return { ok: false, errors: errors };

    const course = {
      id: DataStore.generateId(),
      yearId: yearId,
      code: String(fields.code).trim(),
      name: String(fields.name).trim(),
      credits: parseCredits(fields.credits),
      caWeight: Number(fields.caWeight),
      examWeight: Number(fields.examWeight),
      caMode: "pooled", // default CA model (SRS D1); chosen per course in Phase 7
      examScore: null,
      examMax: null,
    };

    data.courses.push(course);
    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true, course: course };
  }

  /* ---------- Edit ---------- */

  // Edits the five form fields. The year, CA mode and exam score are untouched.
  function update(courseId, fields) {
    const data = DataStore.load();
    const course = data.courses.find(function (c) { return c.id === courseId; });
    if (!course) return { ok: false, errors: { general: "That course no longer exists." } };

    const errors = validate(fields, course.yearId, courseId);
    if (Object.keys(errors).length > 0) return { ok: false, errors: errors };

    course.code = String(fields.code).trim();
    course.name = String(fields.name).trim();
    course.credits = parseCredits(fields.credits);
    course.caWeight = Number(fields.caWeight);
    course.examWeight = Number(fields.examWeight);

    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true, course: course };
  }

  /* ---------- Delete (cascade) ---------- */

  // Deletes a course and its assessments in ONE save (never half-deleted).
  function remove(courseId) {
    const data = DataStore.load();
    if (!data.courses.some(function (c) { return c.id === courseId; })) {
      return { ok: false, errors: { general: "That course no longer exists." } };
    }

    data.assessments = data.assessments.filter(function (a) { return a.courseId !== courseId; });
    data.courses = data.courses.filter(function (c) { return c.id !== courseId; });

    if (!DataStore.save(data)) return { ok: false, errors: { general: SAVE_FAILED } };
    return { ok: true };
  }

  return {
    MAX_CODE_LENGTH, MAX_NAME_LENGTH, MAX_CREDITS, DEFAULT_CA_WEIGHT, DEFAULT_EXAM_WEIGHT,
    validate, getForYear, getById, countAssessments, create, update, remove,
  };
})();
