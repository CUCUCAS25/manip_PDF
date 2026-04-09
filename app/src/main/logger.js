const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

/**
 * Journalisation désactivée par défaut (pas de fichier ni console).
 * Pour réactiver : définir MANI_PDF_LOG_VERBOSE=1
 * Fichier : MANI_PDF_LOG_PATH ou, par défaut, <racine-projet>/mani-pdf.log
 */
const LOG_ENABLED = process.env.MANI_PDF_LOG_VERBOSE === "1";

let logFilePath = null;

function ensureLogFile() {
  if (!logFilePath) {
    if (process.env.MANI_PDF_LOG_PATH) {
      logFilePath = process.env.MANI_PDF_LOG_PATH;
    } else {
      const projectRoot = path.resolve(app.getAppPath(), "..");
      logFilePath = path.join(projectRoot, "mani-pdf.log");
    }
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
  }
  return logFilePath;
}

function log(scope, message, data) {
  if (!LOG_ENABLED) return;
  const line = `[${new Date().toISOString()}] [pid:${process.pid}] [${scope}] ${message}${
    data ? ` | ${JSON.stringify(data)}` : ""
  }`;
  try {
    fs.appendFileSync(ensureLogFile(), `${line}\n`, "utf8");
  } catch {
    /* ignore */
  }
  console.log(line);
}

module.exports = { log };
