const path = require("node:path");

/**
 * Vérifie que le PDF de sortie est dans le même dossier que le PDF source.
 * Limite l'écriture arbitraire si le payload IPC était altéré (défense en profondeur).
 * @param {unknown} inputPath
 * @param {unknown} outputPath
 * @returns {boolean}
 */
function isOutputPdfInSameDirectoryAsInput(inputPath, outputPath) {
  if (
    !inputPath ||
    !outputPath ||
    typeof inputPath !== "string" ||
    typeof outputPath !== "string"
  ) {
    return false;
  }
  if (!outputPath.toLowerCase().endsWith(".pdf")) return false;
  try {
    const inDir = path.normalize(path.dirname(path.resolve(inputPath)));
    const outDir = path.normalize(path.dirname(path.resolve(outputPath)));
    return inDir === outDir;
  } catch {
    return false;
  }
}

module.exports = { isOutputPdfInSameDirectoryAsInput };
