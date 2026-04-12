/**
 * Copie l'installateur NSIS produit dans app/dist/ vers la racine du dépôt : Editify-Setup.exe
 * (à côté de README.md). À lancer après electron-builder --win.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..");
const distDir = path.join(appDir, "dist");
const repoRoot = path.join(appDir, "..");
const destName = "Editify-Setup.exe";
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

const srcName = files.find((f) => /setup/i.test(f)) || files[0];
const src = path.join(distDir, srcName);

fs.copyFileSync(src, dest);
console.log(`[copy-installer-to-root] OK : ${path.relative(repoRoot, src)} -> ${destName}`);
