/**
 * Génère un .ico Windows à partir du PNG source (miniature_fond_blanc.png).
 * electron-builder préfère un .ico pour l'exécutable / installateur sous Windows.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..");

const srcPng = path.join(appDir, "public", "miniature_fond_blanc.png");
const outDir = path.join(appDir, "build-resources");
const outIco = path.join(outDir, "icon.ico");

function fail(msg) {
  console.error("[generate-win-icon]", msg);
  process.exit(1);
}

if (!fs.existsSync(srcPng)) {
  fail(`PNG introuvable: ${srcPng}`);
}
fs.mkdirSync(outDir, { recursive: true });

const buf = await pngToIco(srcPng);
fs.writeFileSync(outIco, buf);
console.log(`[generate-win-icon] OK: ${path.relative(appDir, outIco)}`);

