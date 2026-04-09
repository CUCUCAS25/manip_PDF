const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

// Logs ON by default (can disable via MANI_PDF_LOGS=0)
const LOG_ENABLED = process.env.MANI_PDF_LOGS !== "0";

let logFilePath = null;

function ensureLogFile() {
  if (!logFilePath) {
    // User request: log file at project root (workspace root).
    // Default to "<project-root>/mani-pdf.log".
    // Allow override with MANI_PDF_LOG_PATH.
    if (process.env.MANI_PDF_LOG_PATH) {
      logFilePath = process.env.MANI_PDF_LOG_PATH;
    } else {
      // In dev, app.getAppPath() points to "<project-root>/app"
      // so parent is "<project-root>".
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
    // best effort logging only
  }
  console.log(line);
}

module.exports = { log };
