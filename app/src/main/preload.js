const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("maniPdfApi", {
  isE2E: () => {
    try {
      return Boolean(process?.env?.MANI_PDF_E2E);
    } catch {
      return false;
    }
  },
  openPdf: (path) => ipcRenderer.invoke("pdf:open", path),
  readPdfBytes: (path) => ipcRenderer.invoke("pdf:read-bytes", path),
  openPdfDialog: () => {
    // Mode tests e2e: bypass le dialogue natif pour stabilité.
    // Retourne le fichier défini via env MANI_PDF_E2E_PDF_PATH.
    try {
      const e2ePath = process?.env?.MANI_PDF_E2E_PDF_PATH;
      if (e2ePath && typeof e2ePath === "string") {
        return Promise.resolve({ ok: true, path: e2ePath });
      }
    } catch {}
    return ipcRenderer.invoke("dialog:openPdf");
  },
  saveSession: (payload) => ipcRenderer.invoke("session:save", payload),
  loadSession: () => ipcRenderer.invoke("session:load"),
  savePdfAsDialog: (suggestedName) => ipcRenderer.invoke("dialog:savePdfAs", suggestedName),
  exportPdfWithAnnotations: (payload) => ipcRenderer.invoke("pdf:export-with-annotations", payload),
  createJob: (input) => ipcRenderer.invoke("job:create", input),
  listJobs: () => ipcRenderer.invoke("job:list"),
  pythonHealth: () => ipcRenderer.invoke("python:health"),
  cancelJob: (id) => ipcRenderer.invoke("job:cancel", id),
  retryJob: (id) => ipcRenderer.invoke("job:retry", id),
  listSensitiveActions: () => ipcRenderer.invoke("sensitive:list"),
  log: (message, data) => ipcRenderer.invoke("log:renderer", { message, data }),
  onOpenFromMenu: (cb) => ipcRenderer.on("pdf:open-from-menu", (_, path) => cb(path)),
  onSetLanguage: (cb) => ipcRenderer.on("app:set-language", (_, lang) => cb(lang)),
  onAutosaveRequested: (cb) => ipcRenderer.on("session:autosave-requested", cb),
  onSaveAsRequested: (cb) => ipcRenderer.on("pdf:save-as-requested", cb),
  quitApp: () => ipcRenderer.invoke("app:quit"),
  getWindowFullscreen: () => ipcRenderer.invoke("window:is-fullscreen"),
  onFullscreenChanged: (cb) => ipcRenderer.on("window:fullscreen-changed", (_, full) => cb(full)),
  onToolbarF10Toggle: (cb) => ipcRenderer.on("toolbar:f10-toggle", () => cb()),
  onPdfToolAction: (cb) => ipcRenderer.on("app:pdf-tool", (_, action) => cb(action))
});
