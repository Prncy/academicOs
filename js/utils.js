/* ==========================================================================
   utils.js
   --------------------------------------------------------------------------
   Small shared helpers with NO business logic (no GPA maths, no storage).
   ========================================================================== */

const Utils = (function () {
  // Turns user-typed text into HTML-safe text.
  // SECURITY: run user text through this before putting it inside innerHTML,
  // otherwise typing <script>...</script> as a name could run code (XSS).
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Reads a value from the page address, e.g. program.html?id=abc123
  //   getQueryParam("id")  ->  "abc123"   (or null if missing)
  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // "Good morning", "Good afternoon" or "Good evening".
  function getGreeting(date) {
    const hour = (date || new Date()).getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  // How credits are shown: "3 credits", "1 credit", or "No credits set".
  function formatCredits(credits) {
    if (credits === null || credits === undefined) return "No credits set";
    return credits + (credits === 1 ? " credit" : " credits");
  }

  // Turns "2026-03-14" into "14 Mar 2026". We split the text ourselves instead
  // of using new Date(), because Date can shift the day by timezone.
  function formatDate(isoDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate));
    if (!match) return String(isoDate);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Number(match[3]) + " " + months[Number(match[2]) - 1] + " " + match[1];
  }

  // Is this text a REAL calendar date like 2026-02-28 (year-month-day)?
  // "2026-02-30" is not real. minYear / maxYear limit the allowed years.
  function isValidDate(text, minYear, maxYear) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text));
    if (!match) return false;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    if (year < minYear || year > maxYear) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  return { escapeHtml, getQueryParam, getGreeting, formatCredits, formatDate, isValidDate };
})();
