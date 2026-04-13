/**
 * Hook electron-builder: force l'icône de l'exécutable Windows (EditraDoc.exe)
 * via rcedit, sans dépendre de winCodeSign (qui peut nécessiter des droits symlink).
 */

const path = require("node:path");
const fs = require("node:fs");
const process = require("node:process");

/** @param {import("electron-builder").AfterPackContext} context */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  // rcedit est un module ESM -> import dynamique côté CJS.
  const { rcedit } = await import("rcedit");

  const exeName =
    context.packager.appInfo.productFilename +
    (context.packager.appInfo.productFilename.toLowerCase().endsWith(".exe") ? "" : ".exe");
  const exePath = path.join(context.appOutDir, exeName);

  const iconPath = path.join(context.appOutDir, "resources", "app.asar.unpacked", "public", "editraDoc.ico");
  const iconFallback = path.join(context.packager.projectDir, "build-resources", "icon.ico");

  const picked = fs.existsSync(iconPath) ? iconPath : fs.existsSync(iconFallback) ? iconFallback : null;
  if (!picked) {
    throw new Error(`[afterPack-set-win-icon] Icône introuvable (attendu: ${iconPath} ou ${iconFallback})`);
  }
  if (!fs.existsSync(exePath)) {
    throw new Error(`[afterPack-set-win-icon] Exe introuvable: ${exePath}`);
  }

  await rcedit(exePath, { icon: picked });
  process.stdout.write(
    `[afterPack-set-win-icon] OK: ${path.basename(exePath)} icon <- ${path.basename(picked)}\n`
  );
};

