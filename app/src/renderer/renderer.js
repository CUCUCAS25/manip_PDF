const openBtn = document.getElementById("openBtn");
const fileInput = document.getElementById("fileInput");
const addTextBtn = document.getElementById("addTextBtn");
const addRectBtn = document.getElementById("addRectBtn");
const addImageBtn = document.getElementById("addImageBtn");
const imageInput = document.getElementById("imageInput");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const propWidth = document.getElementById("propWidth");
const propHeight = document.getElementById("propHeight");
const propRotation = document.getElementById("propRotation");
const propOpacity = document.getElementById("propOpacity");
const applyPropsBtn = document.getElementById("applyPropsBtn");
const mergeBtn = document.getElementById("mergeBtn");
const splitBtn = document.getElementById("splitBtn");
const compressBtn = document.getElementById("compressBtn");
const protectBtn = document.getElementById("protectBtn");
const unprotectBtn = document.getElementById("unprotectBtn");
const saveSessionBtn = document.getElementById("saveSessionBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const statusBar = document.getElementById("statusBar");
const tabs = document.getElementById("tabs");
const pdfViewer = document.getElementById("pdfViewer");
const annotationLayer = document.getElementById("annotationLayer");
const jobsPanel = document.getElementById("jobsPanel");
const sensitivePanel = document.getElementById("sensitivePanel");

const state = {
  tabs: [],
  activeTabId: null,
  selectedAnnotationId: null
};

function setStatus(message) {
  statusBar.textContent = message;
}

function renderJobs(jobs) {
  jobsPanel.innerHTML = "";
  if (!jobs?.length) {
    jobsPanel.textContent = "Aucun job.";
    return;
  }
  jobs
    .slice()
    .reverse()
    .forEach((job) => {
      const row = document.createElement("div");
      row.className = "job-item";
      const out = job.result?.output_path ? ` -> ${job.result.output_path}` : "";
      const err = job.error ? ` (${job.error})` : "";
      const text = document.createElement("span");
      text.textContent = `${job.type} | ${job.status} | ${job.progress}%${out}${err}`;
      row.appendChild(text);
      if (job.status === "queued") {
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.onclick = async () => {
          await window.maniPdfApi.cancelJob(job.id);
          await refreshJobs();
        };
        row.appendChild(cancelBtn);
      }
      if (job.status === "failed" || job.status === "cancelled") {
        const retryBtn = document.createElement("button");
        retryBtn.textContent = "Retry";
        retryBtn.onclick = async () => {
          await window.maniPdfApi.retryJob(job.id);
          await refreshJobs();
        };
        row.appendChild(retryBtn);
      }
      jobsPanel.appendChild(row);
    });
}

async function refreshJobs() {
  const result = await window.maniPdfApi.listJobs();
  if (result.ok) renderJobs(result.jobs);
}

function renderSensitiveActions(actions) {
  sensitivePanel.innerHTML = "";
  if (!actions?.length) {
    sensitivePanel.textContent = "Aucune action sensible.";
    return;
  }
  actions
    .slice()
    .reverse()
    .forEach((a) => {
      const row = document.createElement("div");
      row.className = "job-item";
      row.textContent = `${a.ts} | ${a.type} | ${a.status} | ${a.inputPath || "-"} -> ${a.outputPath || "-"}${a.error ? ` (${a.error})` : ""}`;
      sensitivePanel.appendChild(row);
    });
}

async function refreshSensitiveActions() {
  const result = await window.maniPdfApi.listSensitiveActions();
  if (result.ok) renderSensitiveActions(result.actions);
}

async function refreshPythonHealth() {
  const result = await window.maniPdfApi.pythonHealth();
  if (!result.ok) {
    setStatus("Service Python indisponible.");
    return;
  }
  if (result.pypdf === false) {
    setStatus("Attention: pypdf absent. Installez-le: python -m pip install pypdf");
  }
}

function getActiveTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || null;
}

function getSelectedAnnotation() {
  const tab = getActiveTab();
  if (!tab || !state.selectedAnnotationId) return null;
  return currentPageAnnotations(tab).find((a) => a.id === state.selectedAnnotationId) || null;
}

function renderTabs() {
  tabs.innerHTML = "";
  state.tabs.forEach((tab) => {
    const node = document.createElement("button");
    node.className = `tab ${tab.id === state.activeTabId ? "active" : ""}`;
    node.textContent = tab.name;
    node.onclick = () => {
      state.activeTabId = tab.id;
      updateViewer();
      renderTabs();
    };
    tabs.appendChild(node);
  });
}

function updateViewer() {
  const tab = getActiveTab();
  if (!tab) {
    pdfViewer.removeAttribute("src");
    annotationLayer.innerHTML = "";
    pageInfo.textContent = "Aucun PDF";
    return;
  }
  const page = tab.currentPage || 1;
  pdfViewer.src = `${tab.path}#page=${page}`;
  pageInfo.textContent = `Page ${page}`;
  renderAnnotations();
}

async function addPdfTab(filePath, fileName) {
  const result = await window.maniPdfApi.openPdf(filePath);
  if (!result.ok) {
    setStatus(result.error);
    return;
  }

  const tab = {
    id: `${Date.now()}-${Math.random()}`,
    name: fileName,
    path: result.path,
    currentPage: 1,
    annotationsByPage: {},
    undoStack: [],
    redoStack: []
  };
  state.tabs.push(tab);
  state.activeTabId = tab.id;
  renderTabs();
  updateViewer();
  setStatus(`PDF charge: ${fileName}`);
}

function buildDefaultOutputPath(basePath, suffix) {
  const dot = basePath.lastIndexOf(".");
  if (dot < 0) return `${basePath}-${suffix}.pdf`;
  return `${basePath.slice(0, dot)}-${suffix}${basePath.slice(dot)}`;
}

async function createMergeJob() {
  const pdfTabs = state.tabs.map((t) => t.path);
  if (pdfTabs.length < 2) {
    setStatus("Fusion: ouvrez au moins 2 PDF.");
    return;
  }
  const outputPath = buildDefaultOutputPath(pdfTabs[0], "merged");
  await window.maniPdfApi.createJob({
    type: "merge",
    payload: { inputs: pdfTabs, output_path: outputPath }
  });
  setStatus("Job fusion ajoute.");
  await refreshJobs();
}

async function createSplitJob() {
  const tab = getActiveTab();
  if (!tab) {
    setStatus("Split: aucun PDF actif.");
    return;
  }
  const range = window.prompt("Plage de pages (ex: 1-2)", "1-1") || "1-1";
  const [fromRaw, toRaw] = range.split("-");
  const fromPage = Math.max(1, Number(fromRaw) || 1);
  const toPage = Math.max(fromPage, Number(toRaw) || fromPage);
  const outputPath = buildDefaultOutputPath(tab.path, `split-${fromPage}-${toPage}`);
  await window.maniPdfApi.createJob({
    type: "split",
    payload: { input_path: tab.path, from_page: fromPage, to_page: toPage, output_path: outputPath }
  });
  setStatus("Job split ajoute.");
  await refreshJobs();
}

async function createCompressJob() {
  const tab = getActiveTab();
  if (!tab) {
    setStatus("Compression: aucun PDF actif.");
    return;
  }
  const outputPath = buildDefaultOutputPath(tab.path, "compressed");
  await window.maniPdfApi.createJob({
    type: "compress",
    payload: { input_path: tab.path, output_path: outputPath }
  });
  setStatus("Job compression ajoute.");
  await refreshJobs();
}

async function createProtectJob() {
  const tab = getActiveTab();
  if (!tab) {
    setStatus("Protect: aucun PDF actif.");
    return;
  }
  const password = window.prompt("Mot de passe de protection", "");
  if (!password) {
    setStatus("Protect annule (mot de passe requis).");
    return;
  }
  const outputPath = buildDefaultOutputPath(tab.path, "protected");
  await window.maniPdfApi.createJob({
    type: "protect",
    payload: { input_path: tab.path, output_path: outputPath, password }
  });
  setStatus("Job protect ajoute.");
  await refreshJobs();
}

async function createUnprotectJob() {
  const tab = getActiveTab();
  if (!tab) {
    setStatus("Unprotect: aucun PDF actif.");
    return;
  }
  const password = window.prompt("Mot de passe actuel", "");
  if (password === null) {
    setStatus("Unprotect annule.");
    return;
  }
  const outputPath = buildDefaultOutputPath(tab.path, "unprotected");
  await window.maniPdfApi.createJob({
    type: "unprotect",
    payload: { input_path: tab.path, output_path: outputPath, password }
  });
  setStatus("Job unprotect ajoute.");
  await refreshJobs();
}

function currentPageAnnotations(tab) {
  const page = String(tab.currentPage || 1);
  if (!tab.annotationsByPage[page]) tab.annotationsByPage[page] = [];
  return tab.annotationsByPage[page];
}

function captureSnapshot(tab) {
  const snapshot = JSON.stringify({
    annotationsByPage: tab.annotationsByPage
  });
  tab.undoStack.push(snapshot);
  if (tab.undoStack.length > 50) tab.undoStack.shift();
  tab.redoStack = [];
}

function applySnapshot(tab, snapshot) {
  const parsed = JSON.parse(snapshot);
  tab.annotationsByPage = parsed.annotationsByPage || {};
}

function renderAnnotations() {
  annotationLayer.innerHTML = "";
  const tab = getActiveTab();
  if (!tab) return;
  const annotations = currentPageAnnotations(tab);
  annotations.forEach((a) => {
    const node = document.createElement("div");
    node.className = `annotation ${a.type} ${state.selectedAnnotationId === a.id ? "selected" : ""}`;
    node.style.left = `${a.x}px`;
    node.style.top = `${a.y}px`;
    node.style.width = `${a.w}px`;
    node.style.height = `${a.h}px`;
    node.style.transform = `rotate(${a.rotation || 0}deg)`;
    node.style.opacity = String((a.opacity ?? 100) / 100);
    node.dataset.id = a.id;

    if (a.type === "text") {
      node.contentEditable = "true";
      node.textContent = a.text || "Texte";
      node.onblur = () => {
        captureSnapshot(tab);
        a.text = node.textContent || "Texte";
      };
    } else if (a.type === "image") {
      const img = document.createElement("img");
      img.src = a.src;
      node.appendChild(img);
    }

    node.onmousedown = (event) => startDrag(event, a.id);
    node.onclick = () => {
      state.selectedAnnotationId = a.id;
      syncPropertyInputs();
      renderAnnotations();
    };
    annotationLayer.appendChild(node);
  });
}

function startDrag(event, id) {
  event.preventDefault();
  const tab = getActiveTab();
  if (!tab) return;
  const item = currentPageAnnotations(tab).find((a) => a.id === id);
  if (!item) return;
  state.selectedAnnotationId = id;
  const startX = event.clientX;
  const startY = event.clientY;
  const originX = item.x;
  const originY = item.y;
  captureSnapshot(tab);

  const move = (ev) => {
    item.x = Math.max(0, originX + (ev.clientX - startX));
    item.y = Math.max(0, originY + (ev.clientY - startY));
    renderAnnotations();
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    syncPropertyInputs();
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

function addAnnotation(type, extra = {}) {
  const tab = getActiveTab();
  if (!tab) return;
  captureSnapshot(tab);
  const annotations = currentPageAnnotations(tab);
  const id = `${Date.now()}-${Math.random()}`;
  const annotation = {
    id,
    type,
    x: 80,
    y: 80,
    w: type === "text" ? 160 : 180,
    h: type === "text" ? 48 : 120,
    rotation: 0,
    opacity: 100,
    ...extra
  };
  annotations.push(annotation);
  state.selectedAnnotationId = id;
  syncPropertyInputs();
  renderAnnotations();
}

function deleteSelected() {
  const tab = getActiveTab();
  if (!tab || !state.selectedAnnotationId) return;
  const annotations = currentPageAnnotations(tab);
  const idx = annotations.findIndex((a) => a.id === state.selectedAnnotationId);
  if (idx < 0) return;
  captureSnapshot(tab);
  annotations.splice(idx, 1);
  state.selectedAnnotationId = null;
  syncPropertyInputs();
  renderAnnotations();
}

function undo() {
  const tab = getActiveTab();
  if (!tab || tab.undoStack.length === 0) return;
  const current = JSON.stringify({ annotationsByPage: tab.annotationsByPage });
  tab.redoStack.push(current);
  const snapshot = tab.undoStack.pop();
  applySnapshot(tab, snapshot);
  state.selectedAnnotationId = null;
  syncPropertyInputs();
  renderAnnotations();
}

function redo() {
  const tab = getActiveTab();
  if (!tab || tab.redoStack.length === 0) return;
  const current = JSON.stringify({ annotationsByPage: tab.annotationsByPage });
  tab.undoStack.push(current);
  const snapshot = tab.redoStack.pop();
  applySnapshot(tab, snapshot);
  state.selectedAnnotationId = null;
  syncPropertyInputs();
  renderAnnotations();
}

function syncPropertyInputs() {
  const item = getSelectedAnnotation();
  if (!item) return;
  propWidth.value = String(Math.round(item.w || 180));
  propHeight.value = String(Math.round(item.h || 120));
  propRotation.value = String(Math.round(item.rotation || 0));
  propOpacity.value = String(Math.round(item.opacity ?? 100));
}

function applySelectedProperties() {
  const tab = getActiveTab();
  const item = getSelectedAnnotation();
  if (!tab || !item) return;
  captureSnapshot(tab);
  item.w = Math.max(20, Number(propWidth.value) || item.w);
  item.h = Math.max(20, Number(propHeight.value) || item.h);
  item.rotation = Math.max(0, Math.min(360, Number(propRotation.value) || 0));
  item.opacity = Math.max(0, Math.min(100, Number(propOpacity.value) || 100));
  renderAnnotations();
}

function pageShift(delta) {
  const tab = getActiveTab();
  if (!tab) return;
  tab.currentPage = Math.max(1, (tab.currentPage || 1) + delta);
  updateViewer();
}

async function saveSession() {
  const payload = {
    savedAt: new Date().toISOString(),
    tabs: state.tabs,
    activeTabId: state.activeTabId
  };
  const result = await window.maniPdfApi.saveSession(payload);
  setStatus(result.ok ? "Session sauvegardee" : result.error);
}

async function loadSession() {
  const result = await window.maniPdfApi.loadSession();
  if (!result.ok) {
    setStatus(result.error);
    return;
  }
  if (result.data) {
    state.tabs = (result.data.tabs || []).map((t) => ({
      annotationsByPage: {},
      undoStack: [],
      redoStack: [],
      ...t
    }));
    state.activeTabId = result.data.activeTabId || (state.tabs[0] && state.tabs[0].id);
    renderTabs();
    updateViewer();
    setStatus(result.recovered ? "Session restauree depuis backup" : "Session restauree");
  }
}

openBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  await addPdfTab(file.path, file.name);
  fileInput.value = "";
});

saveSessionBtn.addEventListener("click", saveSession);
prevBtn.addEventListener("click", () => pageShift(-1));
nextBtn.addEventListener("click", () => pageShift(1));
addTextBtn.addEventListener("click", () => addAnnotation("text", { text: "Nouveau texte" }));
addRectBtn.addEventListener("click", () => addAnnotation("rect"));
addImageBtn.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const src = URL.createObjectURL(file);
  addAnnotation("image", { src });
  imageInput.value = "";
});
deleteSelectedBtn.addEventListener("click", deleteSelected);
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
applyPropsBtn.addEventListener("click", applySelectedProperties);
mergeBtn.addEventListener("click", createMergeJob);
splitBtn.addEventListener("click", createSplitJob);
compressBtn.addEventListener("click", createCompressJob);
protectBtn.addEventListener("click", createProtectJob);
unprotectBtn.addEventListener("click", createUnprotectJob);

window.maniPdfApi.onOpenFromMenu(async (filePath) => {
  const name = filePath.split("\\").pop() || "document.pdf";
  await addPdfTab(filePath, name);
});

window.maniPdfApi.onAutosaveRequested(saveSession);
window.maniPdfApi.onSaveRequested(saveSession);

loadSession();
refreshJobs();
refreshSensitiveActions();
refreshPythonHealth();
setInterval(refreshJobs, 1000);
setInterval(refreshSensitiveActions, 2000);
