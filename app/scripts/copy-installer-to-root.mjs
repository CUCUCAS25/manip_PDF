/**
 * Copie l'installateur NSIS produit dans app/dist/ vers la racine du dépôt : EditraDoc-Setup.exe
 * (à côté de README.md). À lancer après electron-builder --win.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..");
const distDir = path.join(appDir, "dist");
const repoRoot = path.join(appDir, "..");
const destName = "EditraDoc-Setup.exe";
const dest = path.join(repoRoot, destName);

function fail(msg) {
  console.error("[copy-installer-to-root]", msg);
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fail(`Dossier introuvable : ${distDir}. Lancez d'abord npm run dist:win.`);
}

const files = fs.readdirSync(distDir).filter((f) => f.endsWith(".exe"));
if (!files.length) {
  fail(`Aucun fichier .exe dans ${distDir}.`);
}

// Préférence : le setup du produit courant, sinon le plus récent.
const setupFiles = files.filter((f) => /setup/i.test(f));
const preferred =
  setupFiles.find((f) => /editradoc/i.test(f)) ||
  setupFiles
    .map((name) => ({ name, mtimeMs: fs.statSync(path.join(distDir, name)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.name ||
  files
    .map((name) => ({ name, mtimeMs: fs.statSync(path.join(distDir, name)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.name;

const srcName = preferred;
const src = path.join(distDir, srcName);

fs.copyFileSync(src, dest);
console.log(`[copy-installer-to-root] OK : ${path.relative(repoRoot, src)} -> ${destName}`);
