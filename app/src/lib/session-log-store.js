/**
 * Journal RAM de session - logique pure (Node + renderer via script global).
 * @param {{ maxEntries?: number }} [options]
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.__editifySessionLogStore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  "use strict";

  /**
   * @param {{ maxEntries?: number }} [options]
   */
  function createSessionLogStore(options) {
    const maxEntries =
      options && typeof options.maxEntries === "number" && options.maxEntries > 0
        ? options.maxEntries
        : 500;
    /** @type {{ ts: string, category: string, message: string }[]} */
    let entries = [];

    /**
     * @param {{ category?: string, message?: string }} row
     */
    function append(row) {
      const ts = new Date().toISOString();
      entries.push({
        ts,
        category: String((row && row.category) || "info"),
        message: String((row && row.message) || "")
      });
      if (entries.length > maxEntries) {
        entries.splice(0, entries.length - maxEntries);
      }
    }

    function getEntries() {
      return entries.slice();
    }

    function clear() {
      entries = [];
    }

    return { append, getEntries, clear };
  }

  return { createSessionLogStore };
});
