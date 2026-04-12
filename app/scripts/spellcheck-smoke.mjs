/**
 * Fumée hors Electron : vérifie que dictionary-* (ESM) + nspell détectent une faute FR.
 * Usage : node scripts/spellcheck-smoke.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nspell = require("nspell");

const m = await import("dictionary-fr");
const spell = nspell(m.default);
const bad = "trste";
const ok = spell.correct(bad);
const sug = spell.suggest(bad).slice(0, 5);
console.log("[spellcheck-smoke] correct(%s) => %s (attendu: false)", JSON.stringify(bad), ok);
console.log("[spellcheck-smoke] suggestions:", sug);
if (ok) {
  console.error("[spellcheck-smoke] ECHEC: la faute aurait dû être détectée.");
  process.exit(1);
}
process.exit(0);
