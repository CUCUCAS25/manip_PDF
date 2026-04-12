/**
 * Journal RAM de session (jobs / actions sensibles / infos). Purge explicite à la fermeture
 * normale (beforeunload) - pas de persistance disque.
 * Dépend de `../lib/session-log-store.js` (chargé avant ce script).
 * `window.__editifySessionLog`
 */
(function () {
  "use strict";
  const g = typeof globalThis !== "undefined" ? globalThis : window;
  const mod = g.__editifySessionLogStore;
  if (!mod || typeof mod.createSessionLogStore !== "function") {
    return;
  }
  window.__editifySessionLog = mod.createSessionLogStore({ maxEntries: 500 });
})();
