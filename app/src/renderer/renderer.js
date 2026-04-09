const openBtn = document.getElementById("openBtn");
const languageBtn = document.getElementById("languageBtn");
const welcomeScreen = document.getElementById("welcomeScreen");
const welcomeOpenBtn = document.getElementById("welcomeOpenBtn");
const addTextBtn = document.getElementById("addTextBtn");
const addShapeBtn = document.getElementById("addShapeBtn");
const addImageBtn = document.getElementById("addImageBtn");
const imageInput = document.getElementById("imageInput");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const propWidth = document.getElementById("propWidth");
const propHeight = document.getElementById("propHeight");
const propRotation = document.getElementById("propRotation");
const propOpacity = document.getElementById("propOpacity");
const propTextColor = document.getElementById("propTextColor");
const propBgColor = document.getElementById("propBgColor");
const propPadding = document.getElementById("propPadding");
const propFontFamily = document.getElementById("propFontFamily");
const propFontSize = document.getElementById("propFontSize");
const applyPropsBtn = document.getElementById("applyPropsBtn");
const mergeBtn = document.getElementById("mergeBtn");
const splitBtn = document.getElementById("splitBtn");
const compressBtn = document.getElementById("compressBtn");
const protectBtn = document.getElementById("protectBtn");
const unprotectBtn = document.getElementById("unprotectBtn");
const fitWidthBtn = document.getElementById("fitWidthBtn");
const fitPageBtn = document.getElementById("fitPageBtn");
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
const toolTip = document.getElementById("toolTip");
const shapeModal = document.getElementById("shapeModal");
const shapeGrid = document.getElementById("shapeGrid");
const closeShapeModalBtn = document.getElementById("closeShapeModalBtn");
const languageModal = document.getElementById("languageModal");
const languageGrid = document.getElementById("languageGrid");
const closeLanguageModalBtn = document.getElementById("closeLanguageModalBtn");
let activeTooltipTarget = null;

const state = {
  tabs: [],
  activeTabId: null,
  selectedAnnotationId: null,
  editingAnnotationId: null,
  zoomMode: "page-width",
  language: "fr"
};
let autosaveDebounce = null;
let interactionMode = null; // "drag" | "resize" | null
let suppressClickUntil = 0;
let activePointerCleanup = null;

const I18N = {
  fr: { language: "🌐 Langue: FR", open: "📂 Ouvrir PDF", addText: "🔤 + Texte", addShape: "🔷 + Forme", addImage: "🖼️ + Image", del: "🗑️ Supprimer", width: "Largeur", height: "Hauteur", rotation: "Rotation", opacity: "Opacite (%)", txt: "Txt", bg: "Fond", pad: "Marges", font: "Police", size: "Taille", apply: "✅ Appliquer", fitW: "↔️ Fit largeur", fitP: "🗐 Fit page", noPdf: "Aucun PDF", ready: "Pret", choose: "Choisir la langue:\n1. Francais\n2. English\n3. Espanol\n4. Portugues" },
  en: { language: "🌐 Language: EN", open: "📂 Open PDF", addText: "🔤 + Text", addShape: "🔷 + Shape", addImage: "🖼️ + Image", del: "🗑️ Delete", width: "Width", height: "Height", rotation: "Rotation", opacity: "Opacity (%)", txt: "Text", bg: "Background", pad: "Padding", font: "Font", size: "Size", apply: "✅ Apply", fitW: "↔️ Fit width", fitP: "🗐 Fit page", noPdf: "No PDF", ready: "Ready", choose: "Choose language:\n1. Francais\n2. English\n3. Espanol\n4. Portugues" },
  es: { language: "🌐 Idioma: ES", open: "📂 Abrir PDF", addText: "🔤 + Texto", addShape: "🔷 + Forma", addImage: "🖼️ + Imagen", del: "🗑️ Borrar", width: "Ancho", height: "Alto", rotation: "Rotacion", opacity: "Opacidad (%)", txt: "Texto", bg: "Fondo", pad: "Margen", font: "Fuente", size: "Tamano", apply: "✅ Aplicar", fitW: "↔️ Ajustar ancho", fitP: "🗐 Ajustar pagina", noPdf: "Sin PDF", ready: "Listo", choose: "Elige idioma:\n1. Francais\n2. English\n3. Espanol\n4. Portugues" },
  pt: { language: "🌐 Idioma: PT", open: "📂 Abrir PDF", addText: "🔤 + Texto", addShape: "🔷 + Forma", addImage: "🖼️ + Imagem", del: "🗑️ Excluir", width: "Largura", height: "Altura", rotation: "Rotacao", opacity: "Opacidade (%)", txt: "Texto", bg: "Fundo", pad: "Margem", font: "Fonte", size: "Tamanho", apply: "✅ Aplicar", fitW: "↔️ Ajustar largura", fitP: "🗐 Ajustar pagina", noPdf: "Nenhum PDF", ready: "Pronto", choose: "Escolha o idioma:\n1. Francais\n2. English\n3. Espanol\n4. Portugues" }
};

function t(key) {
  return I18N[state.language]?.[key] || I18N.fr[key] || key;
}

function setLabelPrefix(inputId, value) {
  const input = document.getElementById(inputId);
  const label = input?.closest("label");
  if (!label || !label.firstChild) return;
  label.firstChild.nodeValue = `${value} `;
}

function applyLanguage() {
  languageBtn.textContent = t("language");
  openBtn.textContent = t("open");
  addTextBtn.textContent = t("addText");
  addShapeBtn.textContent = t("addShape");
  addImageBtn.textContent = t("addImage");
  deleteSelectedBtn.textContent = t("del");
  fitWidthBtn.textContent = t("fitW");
  fitPageBtn.textContent = t("fitP");
  applyPropsBtn.textContent = t("apply");
  setLabelPrefix("propWidth", t("width"));
  setLabelPrefix("propHeight", t("height"));
  setLabelPrefix("propRotation", t("rotation"));
  setLabelPrefix("propOpacity", t("opacity"));
  setLabelPrefix("propTextColor", t("txt"));
  setLabelPrefix("propBgColor", t("bg"));
  setLabelPrefix("propPadding", t("pad"));
  setLabelPrefix("propFontFamily", t("font"));
  setLabelPrefix("propFontSize", t("size"));
  if (!getActiveTab()) pageInfo.textContent = t("noPdf");
}

function pickLanguage() {
  languageModal.classList.remove("hidden");
}

function closeLanguagePicker() {
  languageModal.classList.add("hidden");
}

function setLanguage(lang) {
  if (!I18N[lang]) return;
  state.language = lang;
  applyLanguage();
  if (statusBar.textContent) statusBar.textContent = t("ready");
  closeLanguagePicker();
}

function getSafeZoneSize() {
  const rect = annotationLayer.getBoundingClientRect();
  return {
    width: Math.max(0, Math.floor(rect.width)),
    height: Math.max(0, Math.floor(rect.height))
  };
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function fitAnnotationToSafeZone(item, zone) {
  const minW = 20;
  const minH = 20;
  item.w = clamp(item.w, minW, Math.max(minW, zone.width));
  item.h = clamp(item.h, minH, Math.max(minH, zone.height));
  item.x = clamp(item.x, 0, Math.max(0, zone.width - item.w));
  item.y = clamp(item.y, 0, Math.max(0, zone.height - item.h));
}

function scaleAnnotationsForZoneChange(tab, zone) {
  if (!tab) return false;
  const pageKey = String(tab.currentPage || 1);
  if (!tab.viewportByPage) tab.viewportByPage = {};
  const prev = tab.viewportByPage[pageKey];
  tab.viewportByPage[pageKey] = { width: zone.width, height: zone.height };

  if (!prev || prev.width <= 0 || prev.height <= 0) return false;
  if (prev.width === zone.width && prev.height === zone.height) return false;

  const sx = zone.width / prev.width;
  const sy = zone.height / prev.height;
  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return false;

  const annotations = currentPageAnnotations(tab);
  if (!annotations.length) return false;

  annotations.forEach((item) => {
    item.x *= sx;
    item.y *= sy;
    item.w *= sx;
    item.h *= sy;
    if (item.type === "text") {
      const scale = Math.min(sx, sy);
      if (Number.isFinite(scale) && scale > 0) {
        item.fontSize = clamp((item.fontSize ?? 14) * scale, 8, 96);
        item.padding = clamp((item.padding ?? 6) * scale, 0, 64);
      }
    }
    fitAnnotationToSafeZone(item, zone);
  });
  return true;
}

function enforceSafeZoneForActiveTab() {
  const tab = getActiveTab();
  if (!tab) return;
  const zone = getSafeZoneSize();
  const annotations = currentPageAnnotations(tab);
  let changed = false;
  if (scaleAnnotationsForZoneChange(tab, zone)) {
    changed = true;
  }
  annotations.forEach((item) => {
    const before = `${item.x}|${item.y}|${item.w}|${item.h}`;
    fitAnnotationToSafeZone(item, zone);
    const after = `${item.x}|${item.y}|${item.w}|${item.h}`;
    if (before !== after) changed = true;
  });
  if (changed) {
    syncPropertyInputs();
    renderAnnotations();
  }
}

function setStatus(message) {
  statusBar.textContent = message;
}

function updateWelcomeVisibility() {
  if (!welcomeScreen) return;
  if (state.tabs.length > 0) {
    welcomeScreen.classList.add("hidden");
  } else {
    welcomeScreen.classList.remove("hidden");
  }
}

function log(message, data) {
  // Renderer logs forwarded to main process (app.log)
  try {
    console.log("[renderer]", message, data || "");
  } catch {}
  window.maniPdfApi.log(message, data).catch(() => {});
}

function scheduleAutoSave() {
  if (autosaveDebounce) clearTimeout(autosaveDebounce);
  autosaveDebounce = setTimeout(() => {
    saveSession().catch(() => {});
  }, 600);
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
  log("refreshJobs:start");
  const result = await window.maniPdfApi.listJobs();
  if (result.ok) renderJobs(result.jobs);
  log("refreshJobs:end", { ok: result.ok, count: result.jobs?.length || 0 });
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
  log("refreshSensitiveActions:start");
  const result = await window.maniPdfApi.listSensitiveActions();
  if (result.ok) renderSensitiveActions(result.actions);
  log("refreshSensitiveActions:end", { ok: result.ok, count: result.actions?.length || 0 });
}

async function refreshPythonHealth() {
  log("refreshPythonHealth:start");
  const result = await window.maniPdfApi.pythonHealth();
  if (!result.ok) {
    setStatus("Service Python indisponible.");
    return;
  }
  if (result.pypdf === false) {
    setStatus("Attention: pypdf absent. Installez-le: python -m pip install pypdf");
  }
  log("refreshPythonHealth:end", result);
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
    pageInfo.textContent = t("noPdf");
    return;
  }
  const page = tab.currentPage || 1;
  // Eviter les params de zoom non supportes selon moteurs PDF embarques:
  // certains rendent la zone blanche/invisible.
  pdfViewer.src = `${tab.path}#page=${page}`;
  pageInfo.textContent = `Page ${page}`;
  enforceSafeZoneForActiveTab();
  renderAnnotations();
}

function setZoomMode(mode) {
  state.zoomMode = mode === "page-fit" ? "page-fit" : "page-width";
  // Le viewer embarque deja un auto-fit conteneur; on garde le mode en etat
  // pour UX sans forcer un rechargement du PDF (plus stable).
  setStatus(state.zoomMode === "page-fit" ? "Affichage ajuste a la page" : "Affichage ajuste a la largeur");
}

async function addPdfTab(filePath, fileName) {
  log("addPdfTab:start", { filePath, fileName });
  const result = await window.maniPdfApi.openPdf(filePath);
  if (!result.ok) {
    setStatus(result.error);
    log("addPdfTab:failed", result);
    return;
  }

  const tab = {
    id: `${Date.now()}-${Math.random()}`,
    name: fileName,
    path: result.path,
    currentPage: 1,
    annotationsByPage: {},
    viewportByPage: {},
    undoStack: [],
    redoStack: []
  };
  state.tabs.push(tab);
  state.activeTabId = tab.id;
  renderTabs();
  updateViewer();
  updateWelcomeVisibility();
  setStatus(`PDF charge: ${fileName}`);
  log("addPdfTab:success", { tabId: tab.id });
}

async function promptOpenPdf() {
  log("openBtn:click");
  const selected = await window.maniPdfApi.openPdfDialog();
  if (!selected.ok) {
    if (!selected.cancelled) setStatus(selected.error || "Selection annulee.");
    log("openBtn:dialog-result", selected);
    return;
  }
  const name = selected.path.split("\\").pop() || "document.pdf";
  await addPdfTab(selected.path, name);
}

function buildDefaultOutputPath(basePath, suffix) {
  const dot = basePath.lastIndexOf(".");
  if (dot < 0) return `${basePath}-${suffix}.pdf`;
  return `${basePath.slice(0, dot)}-${suffix}${basePath.slice(dot)}`;
}

async function createMergeJob() {
  log("createMergeJob:start");
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
  log("createSplitJob:start");
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
  log("createCompressJob:start");
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
  log("createProtectJob:start");
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
  log("createUnprotectJob:start");
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
      const isEditing = state.editingAnnotationId === a.id;
      node.contentEditable = isEditing ? "true" : "false";
      if (isEditing) node.classList.add("editing");
      node.textContent = a.text || "Nouveau texte";
      node.style.color = a.textColor || "#111111";
      node.style.backgroundColor = a.bgColor || "#fff8a6";
      node.style.padding = `${a.padding ?? 6}px`;
      node.style.fontFamily = a.fontFamily || "Arial";
      node.style.fontSize = `${a.fontSize ?? 14}px`;
      node.onblur = () => {
        captureSnapshot(tab);
        a.text = node.textContent || "";
        state.editingAnnotationId = null;
        renderAnnotations();
        scheduleAutoSave();
      };
      node.ondblclick = (event) => {
        if (interactionMode) return;
        if (event.target.closest(".resize-handle")) return;
        event.stopPropagation();
        state.selectedAnnotationId = a.id;
        state.editingAnnotationId = a.id;
        // Si on est encore sur le texte placeholder, on le vide pour laisser l'utilisateur taper.
        if (!a.text || a.text === "Nouveau texte" || a.isPlaceholder) {
          a.text = "";
          a.isPlaceholder = false;
        }
        renderAnnotations();
        requestAnimationFrame(() => {
          const editNode = annotationLayer.querySelector(`[data-id="${a.id}"]`);
          if (editNode) {
            editNode.focus();
          }
        });
      };
    } else if (a.type === "image") {
      const img = document.createElement("img");
      img.src = a.src;
      node.appendChild(img);
    }

    node.onmousedown = (event) => {
      // En mode edition texte, laisser le comportement natif du navigateur
      // pour autoriser la selection partielle avec la souris.
      if (a.type === "text" && state.editingAnnotationId === a.id) {
        event.stopPropagation();
        return;
      }
      startDrag(event, a.id);
    };
    node.onclick = () => {
      if (Date.now() < suppressClickUntil || interactionMode) return;
      // Si on clique dans le bloc texte en cours d'edition (fond inclus),
      // on garde strictement le mode edition sans re-render.
      if (a.type === "text" && state.editingAnnotationId === a.id) {
        return;
      }
      state.selectedAnnotationId = a.id;
      // Ne pas quitter le mode edition si on clique dans la case texte.
      syncPropertyInputs();
      renderAnnotations();
    };

    if (
      state.selectedAnnotationId === a.id &&
      !(a.type === "text" && state.editingAnnotationId === a.id)
    ) {
      const br = document.createElement("div");
      br.className = "resize-handle";
      br.dataset.mode = "br";
      br.onmousedown = (event) => startResize(event, a.id, "br");
      node.appendChild(br);

      const right = document.createElement("div");
      right.className = "resize-handle right-middle";
      right.dataset.mode = "r";
      right.onmousedown = (event) => startResize(event, a.id, "r");
      node.appendChild(right);

      const bottom = document.createElement("div");
      bottom.className = "resize-handle bottom-middle";
      bottom.dataset.mode = "b";
      bottom.onmousedown = (event) => startResize(event, a.id, "b");
      node.appendChild(bottom);
    }
    annotationLayer.appendChild(node);
  });
}

function startDrag(event, id) {
  if (event.button !== 0) return;
  if (interactionMode) return;
  event.preventDefault();
  if (state.editingAnnotationId === id) return;
  if (event.target.classList?.contains("resize-handle")) return;
  const tab = getActiveTab();
  if (!tab) return;
  const item = currentPageAnnotations(tab).find((a) => a.id === id);
  if (!item) return;
  state.selectedAnnotationId = id;
  interactionMode = "drag";
  const startX = event.clientX;
  const startY = event.clientY;
  const originX = item.x;
  const originY = item.y;
  captureSnapshot(tab);

  const move = (ev) => {
    const zone = getSafeZoneSize();
    const maxX = Math.max(0, zone.width - item.w);
    const maxY = Math.max(0, zone.height - item.h);
    item.x = clamp(originX + (ev.clientX - startX), 0, maxX);
    item.y = clamp(originY + (ev.clientY - startY), 0, maxY);
    renderAnnotations();
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    interactionMode = null;
    suppressClickUntil = Date.now() + 180;
    activePointerCleanup = null;
    syncPropertyInputs();
    scheduleAutoSave();
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
  activePointerCleanup = up;
}

function startResize(event, id, mode = "br") {
  if (event.button !== 0) return;
  if (interactionMode) return;
  event.preventDefault();
  event.stopPropagation();
  const tab = getActiveTab();
  if (!tab) return;
  const item = currentPageAnnotations(tab).find((a) => a.id === id);
  if (!item) return;
  state.selectedAnnotationId = id;
  interactionMode = "resize";
  const startX = event.clientX;
  const startY = event.clientY;
  const originW = item.w;
  const originH = item.h;
  const originFontSize = item.fontSize ?? 14;
  const originPadding = item.padding ?? 6;
  const originUsableW = Math.max(1, originW - 2 * originPadding);
  const originUsableH = Math.max(1, originH - 2 * originPadding);
  const fixedX = originW;
  const fixedY = originH;
  captureSnapshot(tab);

  const move = (ev) => {
    const zone = getSafeZoneSize();
    let nextW = item.w;
    let nextH = item.h;

    if (mode === "r" || mode === "br") {
      nextW = Math.max(20, fixedX + (ev.clientX - startX));
    }
    if (mode === "b" || mode === "br") {
      nextH = Math.max(20, fixedY + (ev.clientY - startY));
    }

    const maxAllowedW = Math.max(20, zone.width - item.x);
    const maxAllowedH = Math.max(20, zone.height - item.y);
    item.w = clamp(nextW, 20, maxAllowedW);
    item.h = clamp(nextH, 20, maxAllowedH);
    if (item.type === "text") {
      // Auto-fit MVP: resize plus petit => font-size reduit pour rester lisible.
      const padding = item.padding ?? 6;
      const usableW = item.w - 2 * padding;
      const usableH = item.h - 2 * padding;
      if (usableW <= 0 || usableH <= 0) {
        item.fontSize = 8;
      } else {
        const ratioW = usableW / originUsableW;
        const ratioH = usableH / originUsableH;
        const next = Math.floor(originFontSize * Math.min(ratioW, ratioH));
        item.fontSize = Math.max(8, Math.min(96, next));
      }
    }
    syncPropertyInputs();
    renderAnnotations();
  };
  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    interactionMode = null;
    suppressClickUntil = Date.now() + 180;
    activePointerCleanup = null;
    scheduleAutoSave();
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
  activePointerCleanup = up;
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
    textColor: "#111111",
    bgColor: "#fff8a6",
    padding: 6,
    fontFamily: "Arial",
    fontSize: 14,
    isPlaceholder: type === "text" && (!extra.text || extra.text === "Nouveau texte"),
    ...extra
  };
  const zone = getSafeZoneSize();
  fitAnnotationToSafeZone(annotation, zone);
  annotations.push(annotation);
  state.selectedAnnotationId = id;
  syncPropertyInputs();
  renderAnnotations();
  scheduleAutoSave();
}

function openShapePicker() {
  shapeModal.classList.remove("hidden");
}

function closeShapePicker() {
  shapeModal.classList.add("hidden");
}

function addShapeByType(shapeType) {
  if (!shapeType) return;
  if (shapeType === "line") {
    addAnnotation("line", { h: 20 });
  } else {
    addAnnotation(shapeType);
  }
  closeShapePicker();
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
  scheduleAutoSave();
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
  scheduleAutoSave();
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
  scheduleAutoSave();
}

function syncPropertyInputs() {
  const item = getSelectedAnnotation();
  if (!item) return;
  propWidth.value = String(Math.round(item.w || 180));
  propHeight.value = String(Math.round(item.h || 120));
  propRotation.value = String(Math.round(item.rotation || 0));
  propOpacity.value = String(Math.round(item.opacity ?? 100));
  propTextColor.value = item.textColor || "#111111";
  propBgColor.value = item.bgColor || "#fff8a6";
  propPadding.value = String(Math.round(item.padding ?? 6));
  if (item.type === "text") {
    propFontFamily.value = item.fontFamily || "Arial";
    propFontSize.value = String(Math.round(item.fontSize ?? 14));
  }
}

function applySelectedProperties() {
  const tab = getActiveTab();
  const item = getSelectedAnnotation();
  if (!tab || !item) return;
  captureSnapshot(tab);
  const zone = getSafeZoneSize();
  const maxAllowedW = Math.max(20, zone.width - item.x);
  const maxAllowedH = Math.max(20, zone.height - item.y);
  item.w = clamp(Number(propWidth.value) || item.w, 20, maxAllowedW);
  item.h = clamp(Number(propHeight.value) || item.h, 20, maxAllowedH);
  item.rotation = Math.max(0, Math.min(360, Number(propRotation.value) || 0));
  item.opacity = Math.max(0, Math.min(100, Number(propOpacity.value) || 100));
  if (item.type === "text") {
    const selection = window.getSelection();
    const hasSelection =
      selection &&
      !selection.isCollapsed &&
      selection.anchorNode &&
      annotationLayer.contains(selection.anchorNode);

    // Règle demandée:
    // - texte sélectionné + changement de couleur => couleur du texte
    // - clic simple sur le bloc + changement de couleur => couleur de fond
    if (hasSelection) {
      item.textColor = propTextColor.value || "#111111";
    } else {
      item.bgColor = propTextColor.value || "#fff8a6";
    }

    // Le champ "Fond" reste un override explicite du fond du bloc.
    if (propBgColor.value) {
      item.bgColor = propBgColor.value;
    }

    item.padding = Math.max(0, Math.min(64, Number(propPadding.value) || 0));
    item.fontFamily = propFontFamily.value || "Arial";
    item.fontSize = Math.max(8, Math.min(96, Number(propFontSize.value) || 14));
  }
  renderAnnotations();
  scheduleAutoSave();
}

function applySelectedPropertiesLive() {
  const item = getSelectedAnnotation();
  if (!item) return;
  applySelectedProperties();
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
      viewportByPage: {},
      undoStack: [],
      redoStack: [],
      ...t
    }));
    state.activeTabId = result.data.activeTabId || (state.tabs[0] && state.tabs[0].id);
    renderTabs();
    updateViewer();
    updateWelcomeVisibility();
    setStatus(result.recovered ? "Session restauree depuis backup" : "Session restauree");
  }
}

openBtn.addEventListener("click", promptOpenPdf);
languageBtn.addEventListener("click", pickLanguage);
welcomeOpenBtn.addEventListener("click", promptOpenPdf);

saveSessionBtn.addEventListener("click", saveSession);
prevBtn.addEventListener("click", () => pageShift(-1));
nextBtn.addEventListener("click", () => pageShift(1));
addTextBtn.addEventListener("click", () => addAnnotation("text", { text: "Nouveau texte" }));
addShapeBtn.addEventListener("click", openShapePicker);
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
propWidth.addEventListener("input", applySelectedPropertiesLive);
propHeight.addEventListener("input", applySelectedPropertiesLive);
propRotation.addEventListener("input", applySelectedPropertiesLive);
propOpacity.addEventListener("input", applySelectedPropertiesLive);
propTextColor.addEventListener("input", applySelectedPropertiesLive);
propBgColor.addEventListener("input", applySelectedPropertiesLive);
propPadding.addEventListener("input", applySelectedPropertiesLive);
propFontFamily.addEventListener("change", applySelectedPropertiesLive);
propFontSize.addEventListener("input", applySelectedPropertiesLive);
mergeBtn.addEventListener("click", createMergeJob);
splitBtn.addEventListener("click", createSplitJob);
compressBtn.addEventListener("click", createCompressJob);
protectBtn.addEventListener("click", createProtectJob);
unprotectBtn.addEventListener("click", createUnprotectJob);
fitWidthBtn.addEventListener("click", () => setZoomMode("page-width"));
fitPageBtn.addEventListener("click", () => setZoomMode("page-fit"));
closeShapeModalBtn.addEventListener("click", closeShapePicker);
shapeModal.addEventListener("mousedown", (event) => {
  if (event.target === shapeModal) closeShapePicker();
});
shapeGrid.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-shape]");
  if (!btn) return;
  addShapeByType(btn.dataset.shape);
});
closeLanguageModalBtn.addEventListener("click", closeLanguagePicker);
languageModal.addEventListener("mousedown", (event) => {
  if (event.target === languageModal) closeLanguagePicker();
});
languageGrid.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-lang]");
  if (!btn) return;
  setLanguage(btn.dataset.lang);
});

window.maniPdfApi.onOpenFromMenu(async (filePath) => {
  log("onOpenFromMenu", { filePath });
  const name = filePath.split("\\").pop() || "document.pdf";
  await addPdfTab(filePath, name);
});

window.maniPdfApi.onAutosaveRequested(saveSession);
window.maniPdfApi.onSaveRequested(saveSession);

// Quitte le mode edition texte uniquement si clic en dehors de la case texte en edition.
document.addEventListener("mousedown", (event) => {
  if (!state.editingAnnotationId) return;
  const editingNode = annotationLayer.querySelector(`[data-id="${state.editingAnnotationId}"]`);
  if (!editingNode) return;
  if (editingNode.contains(event.target)) return;
  state.editingAnnotationId = null;
  renderAnnotations();
});

function showToolTip(event) {
  const target = event.target.closest("[data-tooltip]");
  if (!target) return;
  const text = target.getAttribute("data-tooltip");
  if (!text) return;
  if (activeTooltipTarget && activeTooltipTarget !== target) {
    activeTooltipTarget.classList.remove("tooltip-target-active");
  }
  activeTooltipTarget = target;
  activeTooltipTarget.classList.add("tooltip-target-active");
  toolTip.textContent = text;
  toolTip.classList.remove("hidden");

  // Positionner le tooltip pour ne pas masquer l'outil:
  // 1) sous le bouton (prioritaire)
  // 2) au-dessus si pas assez de place
  // 3) clamp horizontal dans la fenêtre
  const rect = target.getBoundingClientRect();
  const margin = 8;
  const tipWidth = 320;
  const tipHeight = 48;
  const showBelow = rect.bottom + tipHeight + margin <= window.innerHeight;
  const top = showBelow ? rect.bottom + 6 : Math.max(margin, rect.top - tipHeight - 6);
  const left = Math.max(margin, Math.min(window.innerWidth - tipWidth - margin, rect.left));
  toolTip.style.top = `${top}px`;
  toolTip.style.left = `${left}px`;
}

function hideToolTip() {
  toolTip.classList.add("hidden");
  if (activeTooltipTarget) {
    activeTooltipTarget.classList.remove("tooltip-target-active");
    activeTooltipTarget = null;
  }
}

function isTypingContext(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

document.addEventListener("mouseover", showToolTip);
document.addEventListener("mouseout", (event) => {
  if (!event.target.closest("[data-tooltip]")) return;
  hideToolTip();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !shapeModal.classList.contains("hidden")) {
    event.preventDefault();
    closeShapePicker();
    return;
  }
  if (event.key === "Escape" && !languageModal.classList.contains("hidden")) {
    event.preventDefault();
    closeLanguagePicker();
    return;
  }

  if (isTypingContext(event.target) || state.editingAnnotationId) {
    return;
  }

  const key = event.key.toLowerCase();

  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelected();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === "z") {
    event.preventDefault();
    undo();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && (key === "y" || (event.shiftKey && key === "z"))) {
    event.preventDefault();
    redo();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && key === "s") {
    event.preventDefault();
    saveSession();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && key === "o") {
    event.preventDefault();
    promptOpenPdf();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    pageShift(-1);
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    pageShift(1);
  }
});

window.addEventListener("resize", () => {
  enforceSafeZoneForActiveTab();
});
window.addEventListener("blur", () => {
  if (activePointerCleanup) activePointerCleanup();
});

log("app:init");
applyLanguage();
updateWelcomeVisibility();
loadSession();
refreshJobs();
refreshSensitiveActions();
refreshPythonHealth();
setInterval(refreshJobs, 1000);
setInterval(refreshSensitiveActions, 2000);
