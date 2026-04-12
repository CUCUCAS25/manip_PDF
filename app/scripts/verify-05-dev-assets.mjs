/**
 * Vérifications statiques alignées sur docs/05-Dev.md (sans Electron).
 * - Ordre : i18n-data → text-html → text-ctx → utils → toast → sidebars → text-ctx-menu → shape-image-ctx-menu → split-workspace → renderer.js
 * - Présence des dictionnaires i18n (fr, en, es, pt)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");
const indexPath = path.join(appRoot, "src", "renderer", "index.html");
const i18nDataPath = path.join(appRoot, "src", "renderer", "renderer-i18n-data.js");

function fail(msg) {
  console.error("[verify-05-dev-assets]", msg);
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
const srcs = [];
for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
  srcs.push(m[1]);
}
const rel = (s) => s.replace(/^\.\//, "");
const idxData = srcs.findIndex((s) => rel(s) === "renderer-i18n-data.js");
const idxTextHtml = srcs.findIndex((s) => rel(s) === "renderer-text-html.js");
const idxTextCtx = srcs.findIndex((s) => rel(s) === "renderer-text-ctx.js");
const idxUtils = srcs.findIndex((s) => rel(s) === "renderer-utils.js");
const idxToast = srcs.findIndex((s) => rel(s) === "renderer-toast.js");
const idxSidebars = srcs.findIndex((s) => rel(s) === "renderer-sidebars.js");
const idxTextCtxMenu = srcs.findIndex((s) => rel(s) === "renderer-text-ctx-menu.js");
const idxShapeImageCtxMenu = srcs.findIndex((s) => rel(s) === "renderer-shape-image-ctx-menu.js");
const idxSplitWorkspace = srcs.findIndex((s) => rel(s) === "renderer-split-workspace.js");
const idxRenderer = srcs.findIndex((s) => rel(s) === "renderer.js");
if (idxData === -1) fail("index.html : script renderer-i18n-data.js introuvable.");
if (idxTextHtml === -1) fail("index.html : script renderer-text-html.js introuvable.");
if (idxTextCtx === -1) fail("index.html : script renderer-text-ctx.js introuvable.");
if (idxUtils === -1) fail("index.html : script renderer-utils.js introuvable.");
if (idxToast === -1) fail("index.html : script renderer-toast.js introuvable.");
if (idxSidebars === -1) fail("index.html : script renderer-sidebars.js introuvable.");
if (idxTextCtxMenu === -1) fail("index.html : script renderer-text-ctx-menu.js introuvable.");
if (idxShapeImageCtxMenu === -1)
  fail("index.html : script renderer-shape-image-ctx-menu.js introuvable.");
if (idxSplitWorkspace === -1) fail("index.html : script renderer-split-workspace.js introuvable.");
if (idxRenderer === -1) fail("index.html : script renderer.js introuvable.");
if (
  idxData >= idxTextHtml ||
  idxTextHtml >= idxTextCtx ||
  idxTextCtx >= idxUtils ||
  idxUtils >= idxToast ||
  idxToast >= idxSidebars ||
  idxSidebars >= idxTextCtxMenu ||
  idxTextCtxMenu >= idxShapeImageCtxMenu ||
  idxShapeImageCtxMenu >= idxSplitWorkspace ||
  idxSplitWorkspace >= idxRenderer
) {
  fail(
    "index.html : ordre attendu … → text-ctx → utils → toast → sidebars → text-ctx-menu → shape-image-ctx-menu → split-workspace → renderer.js."
  );
}

const i18nSrc = fs.readFileSync(i18nDataPath, "utf8");
if (!i18nSrc.includes("window.__EDITIFY_I18N")) {
  fail("renderer-i18n-data.js : assignation window.__EDITIFY_I18N attendue.");
}
for (const lang of ["fr:", "en:", "es:", "pt:"]) {
  if (!i18nSrc.includes(lang)) {
    fail(`renderer-i18n-data.js : bloc langue '${lang.slice(0, 2)}' attendu.`);
  }
}

console.log("[verify-05-dev-assets] OK — ordre scripts + dictionnaires i18n.");
