/* ==========================================================================
   calculations.js
   --------------------------------------------------------------------------
   EVERY formula in AcademicOS lives in this one file.
   These are "pure functions": they only use the data you hand them and return
   an answer. They never read storage, never touch the page, and never change
   the data they receive. That is what makes them easy to test against
   hand-calculated examples (see docs/SDD.md section 7).

   Words used below:
     "marked"   an assessment that has a score and a maximum mark above 0
     CA         Continuous Assessment: the coursework part of the course
     caWeight / examWeight    how much of the course each part is worth
                              (they add up to 100, e.g. 40 and 60)

   Results use null for "can't be worked out yet" (for example no marked
   work). Zero is a real answer and is never confused with null.
   ========================================================================== */

const Calculations = (function () {
  /* ---------- Small helpers ---------- */

  function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  // Computers store decimals approximately: 0.29 * 100 gives 28.999999999999996.
  // That kind of noise could push a score just under a grade boundary, so every
  // result is cleaned to 9 decimal places first. This is NOT rounding for
  // display (0.0000000005 is far smaller than any real mark).
  function clean(value) {
    return Math.round(value * 1e9) / 1e9;
  }

  // Rounds a result for DISPLAY, e.g. round(77.4999, 1) -> 77.5. Never use the
  // rounded value for further maths or for finding a grade.
  function round(value, decimals) {
    if (!isNumber(value)) return null;
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  // Has this assessment been marked, and is it usable in a formula?
  function isMarked(assessment) {
    return isNumber(assessment.score) && isNumber(assessment.maxScore) && assessment.maxScore > 0;
  }

  /* ---------- One assessment ---------- */

  // 15 out of 20 -> 75. Returns null if it has not been marked.
  function assessmentPercent(assessment) {
    return isMarked(assessment) ? clean((assessment.score / assessment.maxScore) * 100) : null;
  }

  /* ---------- Continuous Assessment (CA) ---------- */

  // Works out the CA from a course's assignments and tests.
  //
  //   Pooled mode:   all marked work together.
  //                  percent = (total of scores) / (total of maximum marks) * 100
  //   Weighted mode: each item has a weight (its marks within the CA).
  //                  percent = sum(score/max * weight) / sum(weight) * 100,
  //                  counting only marked items that have a weight.
  //
  // Either way, "percent" is how well the student is doing on the work marked
  // so far, and "score" is that percent scaled to the CA's weight (e.g. 81.25%
  // of a 40-mark CA = 32.5). When everything is marked, "score" is the final
  // CA. Items that are not marked yet are left out, so they do not count as 0.
  function caResult(course, assessments) {
    const mode = course.caMode === "weighted" ? "weighted" : "pooled";
    const marked = assessments.filter(isMarked);

    let percent = null;
    let ignoredCount = 0;   // weighted mode: marked items with no usable weight
    let weightTotal = null; // weighted mode: sum of ALL weights entered

    if (mode === "pooled") {
      if (marked.length > 0) {
        const totalScore = marked.reduce(function (sum, a) { return sum + a.score; }, 0);
        const totalMax = marked.reduce(function (sum, a) { return sum + a.maxScore; }, 0);
        percent = (totalScore / totalMax) * 100;
      }
    } else {
      const hasWeight = function (a) { return isNumber(a.weight) && a.weight > 0; };
      weightTotal = assessments.filter(hasWeight).reduce(function (sum, a) { return sum + a.weight; }, 0);
      const usable = marked.filter(hasWeight);
      ignoredCount = marked.length - usable.length;
      if (usable.length > 0) {
        const earned = usable.reduce(function (sum, a) { return sum + (a.score / a.maxScore) * a.weight; }, 0);
        const available = usable.reduce(function (sum, a) { return sum + a.weight; }, 0);
        percent = (earned / available) * 100;
      }
    }

    percent = percent === null ? null : clean(percent);
    return {
      mode: mode,
      percent: percent,
      score: percent === null ? null : clean((percent / 100) * course.caWeight),
      outOf: course.caWeight,
      markedCount: marked.length,
      totalCount: assessments.length,
      ignoredCount: ignoredCount,
      weightTotal: weightTotal,
    };
  }

  /* ---------- Exam ---------- */

  // The exam: examScore out of examMax, scaled to the exam's weight.
  function examResult(course) {
    const entered = isNumber(course.examScore) && isNumber(course.examMax) && course.examMax > 0;
    const percent = entered ? clean((course.examScore / course.examMax) * 100) : null;
    return {
      entered: entered,
      percent: percent,
      score: percent === null ? null : clean((percent / 100) * course.examWeight),
      outOf: course.examWeight,
    };
  }

  /* ---------- Final percentage ---------- */

  // Final percentage = CA score + exam score (each already scaled to its
  // weight, so the total is out of 100).
  // A part is "needed" only if its weight is above 0: an exam-only course
  // (CA 0 / Exam 100) does not need any assignments, and vice versa.
  // If a needed part is missing, percent is null and "pending" says which.
  function finalResult(course, assessments) {
    const ca = caResult(course, assessments);
    const exam = examResult(course);

    const pending = [];
    const caNeeded = course.caWeight > 0;
    const examNeeded = course.examWeight > 0;
    if (caNeeded && ca.score === null) pending.push("CA");
    if (examNeeded && exam.score === null) pending.push("Exam");

    let percent = null;
    if (pending.length === 0) {
      percent = clean((caNeeded ? ca.score : 0) + (examNeeded ? exam.score : 0));
    }

    return { percent: percent, caScore: ca.score, examScore: exam.score, pending: pending };
  }

  return { round, assessmentPercent, caResult, examResult, finalResult };
})();
