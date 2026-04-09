const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const http = require("node:http");
const { log } = require("./logger");

// Ensure logs go to project root by default.
// (Logger also has its own default, but this makes it explicit.)
try {
  process.env.MANI_PDF_LOG_PATH = process.env.MANI_PDF_LOG_PATH || path.join(app.getAppPath(), "..", "mani-pdf.log");
} catch {
  // ignore
}

let mainWindow = null;
let autosaveInterval = null;
let pythonProcess = null;
const sessionStatePath = path.join(app.getPath("userData"), "session-state.json");
const sensitiveLogPath = path.join(app.getPath("userData"), "sensitive-actions.json");
const jobsStatePath = path.join(app.getPath("userData"), "jobs-state.json");
const jobs = [];
let activeJobId = null;
let sensitiveActions = [];

function loadSensitiveLog() {
  log("main", "loadSensitiveLog:start");
  try {
    if (fs.existsSync(sensitiveLogPath)) {
      sensitiveActions = JSON.parse(fs.readFileSync(sensitiveLogPath, "utf8"));
      if (!Array.isArray(sensitiveActions)) sensitiveActions = [];
    }
  } catch {
    sensitiveActions = [];
  }
  log("main", "loadSensitiveLog:done", { count: sensitiveActions.length });
}

function appendSensitiveAction(entry) {
  log("main", "appendSensitiveAction", entry);
  sensitiveActions.push(entry);
  if (sensitiveActions.length > 200) sensitiveActions = sensitiveActions.slice(-200);
  fs.writeFileSync(sensitiveLogPath, JSON.stringify(sensitiveActions, null, 2), "utf8");
}

function loadJobs() {
  log("main", "loadJobs:start");
  try {
    if (!fs.existsSync(jobsStatePath)) return;
    const parsed = JSON.parse(fs.readFileSync(jobsStatePath, "utf8"));
    if (!Array.isArray(parsed)) return;
    jobs.length = 0;
    parsed.forEach((j) => {
      if (j.status === "running") j.status = "queued";
      jobs.push(j);
    });
  } catch {
    jobs.length = 0;
  }
  log("main", "loadJobs:done", { count: jobs.length });
}

function persistJobs() {
  log("main", "persistJobs", { count: jobs.length });
  fs.writeFileSync(jobsStatePath, JSON.stringify(jobs, null, 2), "utf8");
}

function createWindow() {
  log("main", "createWindow");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

function createMenu() {
  log("main", "createMenu");
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open PDF",
          click: async () => {
            if (!mainWindow) return;
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openFile"],
              filters: [{ name: "PDF", extensions: ["pdf"] }]
            });
            if (!result.canceled && result.filePaths[0]) {
              log("main", "menu:openPdf:selected", { path: result.filePaths[0] });
              mainWindow.webContents.send("pdf:open-from-menu", result.filePaths[0]);
            }
          }
        },
        {
          label: "Save Session",
          click: () => {
            if (!mainWindow) return;
            mainWindow.webContents.send("session:save-requested");
          }
        },
        { type: "separator" },
        { role: "quit" }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function startAutosave() {
  log("main", "startAutosave");
  if (autosaveInterval) clearInterval(autosaveInterval);
  autosaveInterval = setInterval(() => {
    if (!mainWindow) return;
    mainWindow.webContents.send("session:autosave-requested");
  }, 30000);
}

function startPythonService() {
  const scriptPath = path.join(__dirname, "..", "..", "python", "pdf_service.py");
  log("main", "startPythonService", { scriptPath });
  pythonProcess = spawn("python", [scriptPath], { stdio: ["ignore", "pipe", "pipe"] });
  pythonProcess.stdout.on("data", (buf) => log("python", "stdout", { line: buf.toString().trim() }));
  pythonProcess.stderr.on("data", (buf) => log("python", "stderr", { line: buf.toString().trim() }));
}

function stopPythonService() {
  log("main", "stopPythonService");
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

function validateWithPython(pdfPath) {
  log("main", "validateWithPython:request", { pdfPath });
  return new Promise((resolve) => {
    const body = JSON.stringify({ path: pdfPath });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 8765,
        path: "/validate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        },
        timeout: 1000
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data || "{}");
            log("main", "validateWithPython:response", parsed);
            resolve(parsed);
          } catch {
            resolve({ ok: false, error: "Reponse validation invalide." });
          }
        });
      }
    );

    req.on("error", () => resolve({ ok: true }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: true });
    });
    req.write(body);
    req.end();
  });
}

function postToPython(route, payload) {
  log("main", "postToPython:request", { route, payload });
  return new Promise((resolve) => {
    const body = JSON.stringify(payload || {});
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 8765,
        path: route,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        },
        timeout: 20000
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data || "{}"));
          } catch {
            resolve({ ok: false, error: "Reponse Python invalide." });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Timeout service Python." });
    });
    req.write(body);
    req.end();
  });
}

function getPythonHealth() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 8765,
        path: "/health",
        method: "GET",
        timeout: 1500
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data || "{}"));
          } catch {
            resolve({ ok: false, error: "Reponse health invalide." });
          }
        });
      }
    );
    req.on("error", () => resolve({ ok: false, error: "Service Python indisponible." }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Timeout health check." });
    });
    req.end();
  });
}

async function processJobQueue() {
  if (activeJobId) return;
  const next = jobs.find((j) => j.status === "queued");
  if (!next) return;
  log("jobs", "process:start", { id: next.id, type: next.type });
  activeJobId = next.id;
  next.status = "running";
  next.progress = 10;
  persistJobs();

  let route = "/validate";
  if (next.type === "merge") route = "/merge";
  if (next.type === "split") route = "/split";
  if (next.type === "compress") route = "/compress";
  if (next.type === "protect") route = "/protect";
  if (next.type === "unprotect") route = "/unprotect";

  try {
    const result = await postToPython(route, next.payload);
    if (result.ok) {
      next.status = "succeeded";
      next.progress = 100;
      next.result = result;
    } else {
      next.status = "failed";
      next.progress = 100;
      next.error = result.error || "Erreur inconnue";
    }
  } catch (error) {
    next.status = "failed";
    next.progress = 100;
    next.error = error.message;
  } finally {
    log("jobs", "process:end", { id: next.id, status: next.status, error: next.error || null });
    if (next.type === "protect" || next.type === "unprotect") {
      appendSensitiveAction({
        ts: new Date().toISOString(),
        type: next.type,
        status: next.status,
        inputPath: next.payload?.input_path || null,
        outputPath: next.payload?.output_path || null,
        error: next.error || null
      });
    }
    activeJobId = null;
    persistJobs();
  }
}

ipcMain.handle("pdf:open", async (_, pdfPath) => {
  log("ipc", "pdf:open", { pdfPath });
  try {
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      return { ok: false, error: "Le fichier PDF n'existe pas." };
    }
    const stat = fs.statSync(pdfPath);
    if (stat.size === 0) {
      return { ok: false, error: "Le fichier PDF est vide ou corrompu." };
    }
    const validation = await validateWithPython(pdfPath);
    if (!validation.ok) {
      return validation;
    }
    return { ok: true, path: pdfPath };
  } catch (error) {
    return { ok: false, error: `Impossible d'ouvrir le PDF: ${error.message}` };
  }
});

ipcMain.handle("dialog:openPdf", async () => {
  log("ipc", "dialog:openPdf:start");
  if (!mainWindow) return { ok: false, error: "Fenetre principale indisponible." };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, cancelled: true };
  log("ipc", "dialog:openPdf:selected", { path: result.filePaths[0] });
  return { ok: true, path: result.filePaths[0] };
});

ipcMain.handle("session:save", async (_, payload) => {
  log("ipc", "session:save", { tabs: payload?.tabs?.length || 0 });
  try {
    fs.writeFileSync(sessionStatePath, JSON.stringify(payload, null, 2), "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Echec sauvegarde session: ${error.message}` };
  }
});

ipcMain.handle("session:load", async () => {
  log("ipc", "session:load");
  try {
    if (!fs.existsSync(sessionStatePath)) return { ok: true, data: null };
    const content = fs.readFileSync(sessionStatePath, "utf8");
    return { ok: true, data: JSON.parse(content) };
  } catch (error) {
    try {
      const backupPath = `${sessionStatePath}.corrupted.${Date.now()}`;
      fs.copyFileSync(sessionStatePath, backupPath);
      fs.writeFileSync(sessionStatePath, JSON.stringify({ tabs: [], activeTabId: null }, null, 2), "utf8");
      return { ok: true, data: { tabs: [], activeTabId: null }, recovered: true };
    } catch {
      return { ok: false, error: `Echec chargement session: ${error.message}` };
    }
  }
});

ipcMain.handle("job:create", async (_, input) => {
  log("ipc", "job:create", input);
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  jobs.push({
    id,
    type: input.type,
    payload: input.payload || {},
    status: "queued",
    progress: 0,
    error: null,
    result: null,
    createdAt: Date.now(),
    retryCount: 0
  });
  persistJobs();
  return { ok: true, id };
});

ipcMain.handle("job:list", async () => ({ ok: true, jobs }));
ipcMain.handle("python:health", async () => getPythonHealth());
ipcMain.handle("job:cancel", async (_, id) => {
  const job = jobs.find((j) => j.id === id);
  if (!job) return { ok: false, error: "Job introuvable." };
  if (job.status === "succeeded" || job.status === "failed") return { ok: false, error: "Job deja termine." };
  if (job.status === "running") return { ok: false, error: "Annulation d'un job running non supportee." };
  job.status = "cancelled";
  job.progress = 100;
  persistJobs();
  return { ok: true };
});
ipcMain.handle("job:retry", async (_, id) => {
  const job = jobs.find((j) => j.id === id);
  if (!job) return { ok: false, error: "Job introuvable." };
  if (job.status !== "failed" && job.status !== "cancelled") {
    return { ok: false, error: "Retry autorise seulement pour failed/cancelled." };
  }
  job.status = "queued";
  job.progress = 0;
  job.error = null;
  job.result = null;
  job.retryCount = (job.retryCount || 0) + 1;
  persistJobs();
  return { ok: true };
});
ipcMain.handle("sensitive:list", async () => ({ ok: true, actions: sensitiveActions }));
ipcMain.handle("log:renderer", async (_, payload) => {
  log("renderer", payload?.message || "event", payload?.data || null);
  return { ok: true };
});

app.whenReady().then(() => {
  log("main", "app:ready");
  loadSensitiveLog();
  loadJobs();
  createWindow();
  createMenu();
  startAutosave();
  startPythonService();
  setInterval(processJobQueue, 500);
});

app.on("window-all-closed", () => {
  log("main", "app:window-all-closed");
  stopPythonService();
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (err) => {
  log("fatal", "uncaughtException", { message: err.message, stack: err.stack });
});

process.on("unhandledRejection", (reason) => {
  const r =
    reason instanceof Error ? { message: reason.message, stack: reason.stack } : { reason: String(reason) };
  log("fatal", "unhandledRejection", r);
});
