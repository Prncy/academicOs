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

  return { escapeHtml, getQueryParam, getGreeting };
})();
