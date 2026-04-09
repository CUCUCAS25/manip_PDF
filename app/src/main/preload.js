const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("maniPdfApi", {
  openPdf: (path) => ipcRenderer.invoke("pdf:open", path),
  readPdfBytes: (path) => ipcRenderer.invoke("pdf:read-bytes", path),
  openPdfDialog: () => ipcRenderer.invoke("dialog:openPdf"),
  saveSession: (payload) => ipcRenderer.invoke("session:save", payload),
  loadSession: () => ipcRenderer.invoke("session:load"),
  createJob: (input) => ipcRenderer.invoke("job:create", input),
  listJobs: () => ipcRenderer.invoke("job:list"),
  pythonHealth: () => ipcRenderer.invoke("python:health"),
  cancelJob: (id) => ipcRenderer.invoke("job:cancel", id),
  retryJob: (id) => ipcRenderer.invoke("job:retry", id),
  listSensitiveActions: () => ipcRenderer.invoke("sensitive:list"),
  log: (message, data) => ipcRenderer.invoke("log:renderer", { message, data }),
  onOpenFromMenu: (cb) => ipcRenderer.on("pdf:open-from-menu", (_, path) => cb(path)),
  onAutosaveRequested: (cb) => ipcRenderer.on("session:autosave-requested", cb),
  onSaveRequested: (cb) => ipcRenderer.on("session:save-requested", cb)
});
