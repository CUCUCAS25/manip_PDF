const welcomeScreen = document.getElementById("welcomeScreen");
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
const propHalo = document.getElementById("propHalo");
const presetPenBtn = document.getElementById("presetPenBtn");
const presetHighlighterBtn = document.getElementById("presetHighlighterBtn");
const applyPropsBtn = document.getElementById("applyPropsBtn");
const applyBgBtn = document.getElementById("applyBgBtn");
const mergeBtn = document.getElementById("mergeBtn");
const splitBtn = document.getElementById("splitBtn");
const compressBtn = document.getElementById("compressBtn");
const protectBtn = document.getElementById("protectBtn");
const unprotectBtn = document.getElementById("unprotectBtn");
const fitWidthBtn = document.getElementById("fitWidthBtn");
const fitPageBtn = document.getElementById("fitPageBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomInfo = document.getElementById("zoomInfo");
const saveSessionBtn = document.getElementById("saveSessionBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const tabs = document.getElementById("tabs");
const viewer = document.querySelector(".viewer");
const pagesContainer = document.getElementById("pagesContainer");
const thumbsList = document.getElementById("thumbsList");
const changesList = document.getElementById("changesList");
const changesCount = document.getElementById("changesCount");
const textPropsPanel = document.getElementById("textPropsPanel");
const propTextColorLabel = document.getElementById("propTextColorLabel");
const propBgColorLabel = document.getElementById("propBgColorLabel");
let pdfCanvas = null;
let annotationLayer = null;
let dropOverlay = null;
const jobsPanel = document.getElementById("jobsPanel");
const sensitivePanel = document.getElementById("sensitivePanel");
const toolTip = document.getElementById("toolTip");
const shapeModal = document.getElementById("shapeModal");
const shapeGrid = document.getElementById("shapeGrid");
const closeShapeModalBtn = document.getElementById("closeShapeModalBtn");
// Langue : menu natif Options > Langue + barre d'outils custom.
let activeTooltipTarget = null;
const pdfToolsBtn = document.getElementById("pdfToolsBtn");
const pdfToolsMenu = document.getElementById("pdfToolsMenu");
const toolbarFileBtn = document.getElementById("toolbarFileBtn");
const toolbarFileMenu = document.getElementById("toolbarFileMenu");
const toolbarOptionsBtn = document.getElementById("toolbarOptionsBtn");
const toolbarOptionsMenu = document.getElementById("toolbarOptionsMenu");
const toolbarOpenPdfBtn = document.getElementById("toolbarOpenPdfBtn");
const toolbarSaveSessionBtn = document.getElementById("toolbarSaveSessionBtn");
const toolbarQuitBtn = document.getElementById("toolbarQuitBtn");
const toolbarCloseBtn = document.getElementById("toolbarCloseBtn");
const appToolbar = document.getElementById("appToolbar");
const toolbarF10Hint = document.getElementById("toolbarF10Hint");

const state = {
  tabs: [],
  activeTabId: null,
  selectedAnnotationId: null,
  editingAnnotationId: null,
  zoomMode: "page-width",
  zoomScale: 1,
  language: "fr",
  // E7: tracking simple du "risque de perte" (modifs non sauvegardées).
  isDirty: false,
  // Clipboard annotations (Ctrl+C / Ctrl+X / Ctrl+V)
  clipboard: null,
  lastPointer: null // { page, x, y }
};
let autosaveDebounce = null;
let interactionMode = null; // "drag" | "resize" | null
let suppressClickUntil = 0;
let activePointerCleanup = null;
let pendingZoomAnchor = null;
let activePdfRenderToken = 0;
let activePdfRenderTasks = [];
let pendingSingleClickRenderTimer = null;
let lastTextClickAt = 0;
let lastTextClickId = null;
let lastTextMouseDownAt = 0;
let lastTextMouseDownId = null;
const lastAutoGrowHeightById = new Map();
let measureTextNode = null;

// ---------------------------
// Sidebars (miniatures + ajouts)
// ---------------------------
let sidebarUpdateTimer = null;
function scheduleSidebarUpdate() {
  if (sidebarUpdateTimer) clearTimeout(sidebarUpdateTimer);
  sidebarUpdateTimer = setTimeout(() => {
    sidebarUpdateTimer = null;
    try {
      renderThumbnails();
      renderChanges();
    } catch {}
  }, 60);
}

function annotationTypeLabel(a) {
  if (!a) return "Élément";
  if (a.type === "text") return "Fenêtre texte";
  if (a.type === "image") return "Image";
  const map = {
    rect: "Rectangle",
    ellipse: "Ellipse",
    triangle: "Triangle",
    line: "Ligne",
    diamond: "Losange",
    pentagon: "Pentagone",
    hexagon: "Hexagone",
    octagon: "Octogone",
    star: "Étoile",
    arrow: "Flèche",
    heart: "Cœur",
    cross: "Croix",
    parallelogram: "Parallélogramme",
    trapezoid: "Trapèze"
  };
  return map[a.type] || String(a.type);
}

function annotationSummary(a) {
  if (!a) return "";
  if (a.type === "text") {
    const raw = String(a.text || "").trim();
    if (!raw) return "(texte vide)";
    const parts = raw.split(/\s+/).filter(Boolean);
    const words = parts.slice(0, 3);
    return words.join(" ") + (parts.length > 3 ? "…" : "");
  }
  if (a.type === "image") {
    const name = a.fileName || a.name || null;
    return name ? `Image: ${name}` : "Image ajoutée";
  }
  return `Forme: ${annotationTypeLabel(a)}`;
}

function getAllAnnotationsWithPage(tab) {
  const out = [];
  if (!tab?.annotationsByPage) return out;
  Object.keys(tab.annotationsByPage).forEach((page) => {
    const arr = tab.annotationsByPage[page] || [];
    arr.forEach((a) => out.push({ page: Number(page) || 1, a }));
  });
  out.sort((x, y) => x.page - y.page);
  return out;
}

function renderChanges() {
  if (!changesList) return;
  const tab = getActiveTab();
  changesList.innerHTML = "";
  if (!tab) {
    if (changesCount) changesCount.textContent = "0";
    return;
  }
  const list = getAllAnnotationsWithPage(tab);
  if (changesCount) changesCount.textContent = String(list.length);
  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Aucun ajout sur ce document.";
    changesList.appendChild(empty);
    return;
  }
  list.forEach(({ page, a }) => {
    const row = document.createElement("div");
    row.className = `change-item ${state.selectedAnnotationId === a.id ? "selected" : ""}`;
    row.dataset.id = a.id;
    row.dataset.page = String(page);
    const top = document.createElement("div");
    top.className = "change-topline";
    const type = document.createElement("div");
    type.className = "change-type";
    type.textContent = annotationTypeLabel(a);
    const p = document.createElement("div");
    p.className = "change-page";
    p.textContent = `Page ${page}`;
    top.appendChild(type);
    top.appendChild(p);
    const sum = document.createElement("div");
    sum.className = "change-summary";
    sum.textContent = annotationSummary(a);
    row.appendChild(top);
    row.appendChild(sum);
    row.addEventListener("click", () => {
      try {
        // Important: définir la sélection AVANT le changement de page,
        // pour que le renderAnnotations déclenché par setActivePage la prenne en compte.
        state.selectedAnnotationId = a.id;
        state.editingAnnotationId = null;
        setActivePage(page);
        const pageNode = pagesContainer?.querySelector?.(`.pdf-page[data-page="${page}"]`);
        pageNode?.scrollIntoView?.({ block: "start", inline: "nearest" });
        syncPropertyInputs();
        renderAnnotations();
        requestAnimationFrame(() => {
          try {
            const node = annotationLayer?.querySelector?.(`[data-id="${a.id}"]`);
            node?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }
    });
    row.oncontextmenu = (ev) => {
      try {
        ev.preventDefault();
      } catch {}
      try {
        // Le clic droit doit aussi sélectionner et naviguer (listener "click" sur la ligne).
        row.click();
      } catch {}
      try {
        const menu = ensureChangesContextMenu();
        menu.classList.remove("hidden");
        const margin = 8;
        const x = clamp((ev.clientX ?? 0) + 2, margin, window.innerWidth - 240 - margin);
        const y = clamp((ev.clientY ?? 0) + 2, margin, window.innerHeight - 80 - margin);
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
      } catch {}
    };
    changesList.appendChild(row);
  });
  // Ne pas appeler scheduleSidebarUpdate() ici : il rappelle renderChanges() après 60 ms en boucle,
  // ce qui recrée tout le DOM des lignes et annule le « click » (mousedown sans mouseup sur le même nœud).
  // Les mises à jour sont déjà déclenchées depuis renderAnnotations / setActivePage / rendu PDF.
}

function drawThumbOverlay(ctx, annos, scale) {
  if (!ctx || !annos?.length) return;
  ctx.save();
  ctx.globalAlpha = 0.9;
  annos.forEach((a) => {
    const x = (a.x || 0) * scale;
    const y = (a.y || 0) * scale;
    const w = (a.w || 20) * scale;
    const h = (a.h || 20) * scale;
    if (a.type === "text") {
      ctx.strokeStyle = "rgba(0,122,204,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(0,122,204,0.9)";
      ctx.font = "10px Arial";
      ctx.fillText("T", x + 2, y + 10);
    } else if (a.type === "image") {
      ctx.strokeStyle = "rgba(33,150,243,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(33,150,243,0.9)";
      ctx.font = "10px Arial";
      ctx.fillText("IMG", x + 2, y + 10);
    } else {
      ctx.strokeStyle = "rgba(255,120,0,0.95)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
    }
  });
  ctx.restore();
}

function renderThumbnails() {
  if (!thumbsList || !pagesContainer) return;
  const tab = getActiveTab();
  thumbsList.innerHTML = "";
  if (!tab) return;
  const pages = Array.from(pagesContainer.querySelectorAll(".pdf-page"));
  if (pages.length === 0) return;

  pages.forEach((pageNode) => {
    const pageNumber = Number(pageNode.dataset.page) || 1;
    const srcCanvas = pageNode.querySelector("canvas.pdf-canvas");
    if (!srcCanvas) return;

    const item = document.createElement("div");
    item.className = `thumb-item ${tab.currentPage === pageNumber ? "active" : ""}`;
    item.dataset.page = String(pageNumber);

    const thumb = document.createElement("canvas");
    thumb.className = "thumb-canvas";
    const targetW = 56;
    const ratio = srcCanvas.width > 0 ? targetW / srcCanvas.width : 1;
    thumb.width = Math.max(10, Math.floor(srcCanvas.width * ratio));
    thumb.height = Math.max(10, Math.floor(srcCanvas.height * ratio));
    const ctx = thumb.getContext("2d");
    try {
      ctx.drawImage(srcCanvas, 0, 0, thumb.width, thumb.height);
      const annos = tab.annotationsByPage?.[String(pageNumber)] || [];
      drawThumbOverlay(ctx, annos, ratio);
    } catch {}

    const meta = document.createElement("div");
    meta.className = "thumb-meta";
    const title = document.createElement("div");
    title.className = "thumb-title";
    title.textContent = `Page ${pageNumber}`;
    const annosCount = (tab.annotationsByPage?.[String(pageNumber)] || []).length;
    const sub = document.createElement("div");
    sub.className = "thumb-sub";
    sub.textContent = annosCount ? `${annosCount} ajout(s)` : "Aucun ajout";
    meta.appendChild(title);
    meta.appendChild(sub);

    item.appendChild(thumb);
    item.appendChild(meta);
    item.onclick = () => {
      try {
        setActivePage(pageNumber);
        pageNode.scrollIntoView({ block: "start", inline: "nearest" });
        renderThumbnails();
        renderChanges();
      } catch {}
    };
    thumbsList.appendChild(item);
  });
}

// ---------------------------
// E7: Toast manager (renderer)
// ---------------------------
let toastRoot = null;
const activeToastsById = new Map(); // id -> { node, timeout }

function ensureToastRoot() {
  if (toastRoot && document.body.contains(toastRoot)) return toastRoot;
  toastRoot = document.createElement("div");
  toastRoot.className = "toast-root";
  toastRoot.setAttribute("aria-label", "Notifications");
  document.body.appendChild(toastRoot);
  return toastRoot;
}

function dismissToast(id) {
  const entry = activeToastsById.get(id);
  if (!entry) return;
  activeToastsById.delete(id);
  try {
    if (entry.timeout) clearTimeout(entry.timeout);
  } catch {}
  try {
    entry.node?.remove?.();
  } catch {}
}

function showToast({ message, actionLabel, onAction, timeoutMs = 6500 }) {
  const root = ensureToastRoot();
  const id = `t_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const node = document.createElement("div");
  node.className = "toast";
  node.dataset.toastId = id;

  const msg = document.createElement("div");
  msg.className = "toast-msg";
  msg.textContent = message || "";
  node.appendChild(msg);

  if (actionLabel && typeof onAction === "function") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-action";
    btn.textContent = actionLabel;
    btn.onclick = () => {
      try {
        onAction();
      } finally {
        dismissToast(id);
      }
    };
    node.appendChild(btn);
  }

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "Fermer");
  close.textContent = "✕";
  close.onclick = () => dismissToast(id);
  node.appendChild(close);

  root.appendChild(node);
  const timeout = setTimeout(() => dismissToast(id), Math.max(1200, Number(timeoutMs) || 6500));
  activeToastsById.set(id, { node, timeout });
  return id;
}

// ---------------------------------------
// E7: Undo fermeture onglet (in-memory)
// ---------------------------------------
let pendingTabUndo = null; // { tab, index, wasActive, prevActiveTabId, toastId }

function hasUnsavedRiskForTab(tab) {
  if (!tab) return false;
  if (state.editingAnnotationId) return true;
  return Boolean(tab.dirty);
}

function cancelPointerInteraction() {
  try {
    if (activePointerCleanup) activePointerCleanup();
  } catch {}
  activePointerCleanup = null;
  interactionMode = null;
}

function newAnnotationId() {
  return `${Date.now()}-${Math.random()}`;
}

function deepClone(obj) {
  // Suffisant ici: nos annotations sont sérialisables (pas de fonctions, pas de cycles).
  return JSON.parse(JSON.stringify(obj));
}

function cloneForClipboard(item) {
  // On ne conserve pas la position (x/y) ni l'id: le collage se fait au curseur.
  // On garde toutes les autres props pour reproduire l'état à l'instant du copier/couper.
  try {
    const cloned = deepClone(item);
    delete cloned.id;
    delete cloned.x;
    delete cloned.y;
    return cloned;
  } catch {
    try {
      const out = {};
      Object.keys(item || {}).forEach((k) => {
        if (k === "id" || k === "x" || k === "y") return;
        out[k] = item[k];
      });
      return out;
    } catch {
      return null;
    }
  }
}

function getSelectedAnnotationFromActivePage(tab) {
  if (!tab || !state.selectedAnnotationId) return null;
  return currentPageAnnotations(tab).find((a) => a.id === state.selectedAnnotationId) || null;
}

function findAnnotationLocation(tab, id) {
  if (!tab?.annotationsByPage || !id) return null;
  const pages = Object.keys(tab.annotationsByPage);
  for (const page of pages) {
    const arr = tab.annotationsByPage[page] || [];
    const idx = arr.findIndex((a) => a.id === id);
    if (idx >= 0) return { page: Number(page) || 1, arr, idx, item: arr[idx] };
  }
  return null;
}

function getSelectedAnnotationFromTab(tab) {
  const id = state.selectedAnnotationId;
  if (!tab || !id) return null;
  return findAnnotationLocation(tab, id)?.item || null;
}

function capturePointerInPage(event) {
  try {
    let pageNode = event?.target?.closest?.(".pdf-page");
    if (!pageNode) {
      // Fallback: clic sur un "vide" du viewer => on se base sur la page active.
      pageNode = pagesContainer?.querySelector?.(".pdf-page.active") || null;
      if (!pageNode) return;
    }
    const page = Number(pageNode.dataset.page) || 1;
    const canvas = pageNode.querySelector?.("canvas.pdf-canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp((event.clientX ?? 0) - rect.left, 0, Math.max(0, rect.width));
    const y = clamp((event.clientY ?? 0) - rect.top, 0, Math.max(0, rect.height));
    // Stocker en "coordonnées canvas" (px) : cohérent avec annotations.
    // rect.{width,height} sont en CSS px, mais le canvas est en px réels. On scale.
    const sx = rect.width > 0 ? canvas.width / rect.width : 1;
    const sy = rect.height > 0 ? canvas.height / rect.height : 1;
    state.lastPointer = { page, x: x * sx, y: y * sy };
  } catch {}
}

document.addEventListener(
  "mousedown",
  (e) => {
    if (e.button !== 0) return;
    if (!e.target?.closest?.(".viewer")) return;
    capturePointerInPage(e);
  },
  true
);

// ---------------------------
// Context menu (sidebar "Ajouts")
// ---------------------------
let changesContextMenu = null;
function ensureChangesContextMenu() {
  if (changesContextMenu) return changesContextMenu;
  const node = document.createElement("div");
  node.id = "changesContextMenu";
  node.className = "menu hidden";
  node.setAttribute("role", "menu");
  const del = document.createElement("button");
  del.type = "button";
  del.setAttribute("role", "menuitem");
  del.textContent = "🗑️ Supprimer";
  del.onclick = () => {
    try {
      hideChangesContextMenu();
      deleteSelected();
    } catch {}
  };
  node.appendChild(del);
  document.body.appendChild(node);
  changesContextMenu = node;
  return node;
}

function hideChangesContextMenu() {
  try {
    changesContextMenu?.classList?.add?.("hidden");
  } catch {}
}

document.addEventListener(
  "mousedown",
  (e) => {
    if (e.button !== 0) return;
    if (!e.target?.closest?.("#changesContextMenu")) hideChangesContextMenu();
  },
  true
);

function ensureMeasureTextNode() {
  if (measureTextNode) return measureTextNode;
  const node = document.createElement("div");
  node.style.position = "fixed";
  node.style.left = "-10000px";
  node.style.top = "-10000px";
  node.style.visibility = "hidden";
  node.style.whiteSpace = "pre-wrap";
  node.style.wordBreak = "break-word";
  node.style.overflowWrap = "break-word";
  node.style.pointerEvents = "none";
  node.style.margin = "0";
  node.style.border = "0";
  node.style.boxSizing = "border-box";
  document.body.appendChild(node);
  measureTextNode = node;
  return node;
}

function getRequiredTextHeight(item) {
  if (!item || item.type !== "text") return 20;
  const padding = item.padding ?? 6;
  const fontSize = item.fontSize ?? 14;
  // Hauteur minimale d'une ligne, même si texte vide
  const minLine = Math.ceil(fontSize * 1.45 + 2 * padding);
  const text = item.text || "";
  if (!text) return Math.max(20, minLine);

  const m = ensureMeasureTextNode();
  // Largeur du cadre = limites gauche/droite imposées par l'utilisateur
  const w = Math.max(20, Math.floor(item.w || 20));
  m.style.width = `${w}px`;
  m.style.padding = `${padding}px`;
  m.style.fontFamily = item.fontFamily || "Arial";
  m.style.fontSize = `${fontSize}px`;
  m.style.lineHeight = "1.35";
  m.textContent = text;
  const needed = Math.ceil(m.scrollHeight || 0);
  return Math.max(20, minLine, needed);
}

function getRequiredTextHeightForWidth(item, width) {
  if (!item || item.type !== "text") return 20;
  const padding = item.padding ?? 6;
  const fontSize = item.fontSize ?? 14;
  const minLine = Math.ceil(fontSize * 1.45 + 2 * padding);
  const text = item.text || "";
  if (!text) return Math.max(20, minLine);

  const m = ensureMeasureTextNode();
  const w = Math.max(20, Math.floor(width || 20));
  m.style.width = `${w}px`;
  m.style.padding = `${padding}px`;
  m.style.fontFamily = item.fontFamily || "Arial";
  m.style.fontSize = `${fontSize}px`;
  m.style.lineHeight = "1.35";
  m.textContent = text;
  const needed = Math.ceil(m.scrollHeight || 0);
  return Math.max(20, minLine, needed);
}

function getMinWidthToFitHeight(item, height, maxWidth) {
  // Retourne la largeur minimale telle que le texte tienne dans "height".
  // Si impossible (même à maxWidth), retourne maxWidth.
  const h = Math.max(20, Math.floor(height || 20));
  const maxW = Math.max(20, Math.floor(maxWidth || item?.w || 20));
  let lo = 20;
  let hi = maxW;

  const fitsAtMax = getRequiredTextHeightForWidth(item, maxW) <= h + 1;
  if (!fitsAtMax) return maxW;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const need = getRequiredTextHeightForWidth(item, mid);
    if (need <= h + 1) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function scheduleAutoGrowText(tab, item, node, source = "render") {
  if (!tab || !item || item.type !== "text" || !node) return;
  requestAnimationFrame(() => {
    try {
      const ta = node.querySelector?.("textarea.text-editor");
      if (ta) {
        // Ajuste le textarea à son contenu (pas de scrollbar).
        ta.style.height = "auto";
        ta.style.height = `${Math.ceil(ta.scrollHeight)}px`;
      }

      const required = getRequiredTextHeight(item);
      // IMPORTANT: ne rien faire si ça tient déjà (pas de changement à la sélection).
      if (required <= (item.h || 0) + 1) return;

      const last = lastAutoGrowHeightById.get(item.id) || 0;
      if (required <= last + 1) return;

      const zone = getSafeZoneSize();
      const maxH = Math.max(20, zone.height - (item.y || 0));
      const nextH = clamp(required, 20, maxH);
      if (nextH > (item.h || 0)) {
        item.h = nextH;
        lastAutoGrowHeightById.set(item.id, nextH);

        renderAnnotations();
        scheduleAutoSave();
      }
    } catch {}
  });
}

const I18N = {
  fr: { language: "🌐 Langue: FR", open: "📂 Ouvrir PDF", addText: "🔤 + Texte", addShape: "🔷 + Forme", addImage: "🖼️ + Image", del: "🗑️ Supprimer", width: "Largeur", height: "Hauteur", rotation: "Rotation", opacity: "Opacite (%)", txt: "Txt", bg: "Fond", pad: "Marges", font: "Police", size: "Taille", apply: "✅ Appliquer", fitW: "↔️ Fit largeur", fitP: "🗐 Fit page", noPdf: "Aucun PDF", ready: "Pret", choose: "Choisir la langue:\n1. Francais\n2. English\n3. Espanol\n4. Portugues", f10Toolbar: "Appelez la barre de menu avec F10 (afficher / masquer)." },
  en: { language: "🌐 Language: EN", open: "📂 Open PDF", addText: "🔤 + Text", addShape: "🔷 + Shape", addImage: "🖼️ + Image", del: "🗑️ Delete", width: "Width", height: "Height", rotation: "Rotation", opacity: "Opacity (%)", txt: "Text", bg: "Background", pad: "Padding", font: "Font", size: "Size", apply: "✅ Apply", fitW: "↔️ Fit width", fitP: "🗐 Fit page", noPdf: "No PDF", ready: "Ready", choose: "Choose language:\n1. Francais\n2. English\n3. Espanol\n4. Portugues", f10Toolbar: "Press F10 to show or hide the menu toolbar." },
  es: { language: "🌐 Idioma: ES", open: "📂 Abrir PDF", addText: "🔤 + Texto", addShape: "🔷 + Forma", addImage: "🖼️ + Imagen", del: "🗑️ Borrar", width: "Ancho", height: "Alto", rotation: "Rotacion", opacity: "Opacidad (%)", txt: "Texto", bg: "Fondo", pad: "Margen", font: "Fuente", size: "Tamano", apply: "✅ Aplicar", fitW: "↔️ Ajustar ancho", fitP: "🗐 Ajustar pagina", noPdf: "Sin PDF", ready: "Listo", choose: "Elige idioma:\n1. Francais\n2. English\n3. Espanol\n4. Portugues", f10Toolbar: "Pulse F10 para mostrar u ocultar la barra de menu." },
  pt: { language: "🌐 Idioma: PT", open: "📂 Abrir PDF", addText: "🔤 + Texto", addShape: "🔷 + Forma", addImage: "🖼️ + Imagem", del: "🗑️ Excluir", width: "Largura", height: "Altura", rotation: "Rotacao", opacity: "Opacidade (%)", txt: "Texto", bg: "Fundo", pad: "Margem", font: "Fonte", size: "Tamanho", apply: "✅ Aplicar", fitW: "↔️ Ajustar largura", fitP: "🗐 Ajustar pagina", noPdf: "Nenhum PDF", ready: "Pronto", choose: "Escolha o idioma:\n1. Francais\n2. English\n3. Espanol\n4. Portugues", f10Toolbar: "Pressione F10 para mostrar ou ocultar a barra de menu." }
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
  // Choix de langue via menu natif (Options > Langue) : pas de bouton "Langue" dans l'UI.
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
  if (toolbarF10Hint) {
    const hint = t("f10Toolbar");
    toolbarF10Hint.textContent = hint;
    toolbarF10Hint.title = hint;
  }
}

function setLanguage(lang) {
  const next = String(lang || "fr").toLowerCase();
  if (!I18N[next]) return;
  state.language = next;
  applyLanguage();
  setStatus(t("ready"));
}

function getSafeZoneSize() {
  const rect = annotationLayer?.getBoundingClientRect?.();
  if (!rect) return { width: 0, height: 0 };
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
  // E10/NFR-06: éviter d'afficher des chemins complets dans l'UI.
  const safe = (() => {
    try {
      const m = String(message ?? "");
      return m.replace(/[A-Za-z]:\\[^\\s]+/g, "[chemin]");
    } catch {
      return String(message ?? "");
    }
  })();
  // Historique minimal pour tests/diagnostic (sans données sensibles).
  try {
    const arr = (window.__maniStatusHistory = window.__maniStatusHistory || []);
    arr.push(safe);
    if (arr.length > 60) arr.splice(0, arr.length - 60);
  } catch {}
  if (statusText) statusText.textContent = safe;
  else statusBar.textContent = safe;
}

function captureZoomAnchor() {
  if (!viewer) return null;
  return {
    centerX: (viewer.scrollLeft || 0) + viewer.clientWidth / 2,
    centerY: (viewer.scrollTop || 0) + viewer.clientHeight / 2,
    prevScrollW: viewer.scrollWidth || 0,
    prevScrollH: viewer.scrollHeight || 0
  };
}

function applyZoomAnchorIfAny() {
  if (!pendingZoomAnchor || !viewer) return;
  const { centerX, centerY, prevScrollW, prevScrollH } = pendingZoomAnchor;
  pendingZoomAnchor = null;
  const nextScrollW = viewer.scrollWidth || 0;
  const nextScrollH = viewer.scrollHeight || 0;
  if (prevScrollW <= 0 || prevScrollH <= 0 || nextScrollW <= 0 || nextScrollH <= 0) return;

  const rx = nextScrollW / prevScrollW;
  const ry = nextScrollH / prevScrollH;
  if (!Number.isFinite(rx) || !Number.isFinite(ry) || rx <= 0 || ry <= 0) return;

  const targetCenterX = centerX * rx;
  const targetCenterY = centerY * ry;
  const nextLeft = targetCenterX - viewer.clientWidth / 2;
  const nextTop = targetCenterY - viewer.clientHeight / 2;

  viewer.scrollLeft = Math.max(0, Math.min(nextLeft, Math.max(0, nextScrollW - viewer.clientWidth)));
  viewer.scrollTop = Math.max(0, Math.min(nextTop, Math.max(0, nextScrollH - viewer.clientHeight)));
}

function updateWelcomeVisibility() {
  if (!welcomeScreen) return;
  if (state.tabs.length > 0) {
    welcomeScreen.classList.add("hidden");
  } else {
    welcomeScreen.classList.remove("hidden");
  }
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
    const label = document.createElement("span");
    label.textContent = tab.name;
    node.appendChild(label);

    const closeBtn = document.createElement("span");
    closeBtn.className = "tab-close";
    closeBtn.textContent = "✕";
    closeBtn.title = "Retirer ce PDF";
    closeBtn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeTab(tab.id);
    };
    node.appendChild(closeBtn);
    node.onclick = () => {
      state.activeTabId = tab.id;
      updateViewer();
      renderTabs();
    };
    tabs.appendChild(node);
  });
}

function removeTab(tabId) {
  const idx = state.tabs.findIndex((t) => t.id === tabId);
  if (idx < 0) return;
  const removed = state.tabs[idx];

  // E7-S2: confirmation uniquement si risque de perte (modifs non sauvegardées).
  if (hasUnsavedRiskForTab(removed)) {
    const ok = window.confirm("Ce PDF a des modifications non sauvegardées. Le retirer ?");
    if (!ok) return;
  }

  // Une seule annulation possible à la fois (MVP): on invalide l'ancienne.
  if (pendingTabUndo?.toastId) dismissToast(pendingTabUndo.toastId);
  pendingTabUndo = null;

  const wasActive = state.activeTabId === tabId;
  const prevActiveTabId = state.activeTabId;
  state.tabs.splice(idx, 1);

  if (state.activeTabId === tabId) {
    state.activeTabId = state.tabs[0]?.id || null;
    state.selectedAnnotationId = null;
    state.editingAnnotationId = null;
  }

  renderTabs();
  updateViewer();
  updateWelcomeVisibility();
  scheduleAutoSave();

  // E7-S1: toast "PDF retiré" + Annuler (5-8s)
  pendingTabUndo = {
    tab: removed,
    index: idx,
    wasActive,
    prevActiveTabId,
    toastId: null
  };
  const toastId = showToast({
    message: "PDF retiré",
    actionLabel: "Annuler",
    onAction: () => {
      if (!pendingTabUndo) return;
      const entry = pendingTabUndo;
      pendingTabUndo = null;
      const safeIndex = clamp(entry.index, 0, state.tabs.length);
      state.tabs.splice(safeIndex, 0, entry.tab);
      if (entry.wasActive) state.activeTabId = entry.tab.id;
      else state.activeTabId = entry.prevActiveTabId || state.activeTabId;
      state.selectedAnnotationId = null;
      state.editingAnnotationId = null;

      renderTabs();
      updateViewer();
      updateWelcomeVisibility();
      scheduleAutoSave();
    },
    timeoutMs: 6500
  });
  pendingTabUndo.toastId = toastId;
  setTimeout(() => {
    if (pendingTabUndo?.toastId !== toastId) return;
    pendingTabUndo = null;
  }, 7000);
}

function updateViewer() {
  const tab = getActiveTab();
  if (!tab) {
    if (pagesContainer) pagesContainer.innerHTML = "";
    pageInfo.textContent = t("noPdf");
    return;
  }
  renderPdfDocument(tab.path).catch((err) => {
    setStatus("Erreur rendu PDF.");

  });
  pageInfo.textContent = `Page ${tab.currentPage || 1}`;
}

function clampZoomScale(value) {
  return clamp(Number(value) || 1, 0.25, 4);
}

function updateZoomUI() {
  if (!zoomInfo) return;
  const pct = Math.round((state.zoomScale || 1) * 100);
  zoomInfo.textContent = `${pct}%`;
}

function setZoomScale(next, source = "ui") {
  const prev = state.zoomScale || 1;
  pendingZoomAnchor = captureZoomAnchor();
  state.zoomScale = clampZoomScale(next);
  if (prev === state.zoomScale) return;
  updateZoomUI();

  if (getActiveTab()) updateViewer();
}

function zoomByWheelDelta(deltaY) {
  // deltaY < 0 => wheel up => zoom in
  const direction = deltaY < 0 ? 1 : -1;
  const step = 1.1;
  const next = (state.zoomScale || 1) * (direction > 0 ? step : 1 / step);
  setZoomScale(next, "ctrl+wheel");
}

function setZoomMode(mode) {
  state.zoomMode = mode === "page-fit" ? "page-fit" : "page-width";
  // Le viewer embarque deja un auto-fit conteneur; on garde le mode en etat
  // pour UX sans forcer un rechargement du PDF (plus stable).
  setStatus(state.zoomMode === "page-fit" ? "Affichage ajuste a la page" : "Affichage ajuste a la largeur");
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getPdfJs() {
  // Chargé via pdfjs-bridge.mjs (module)
  const startedAt = Date.now();
  while (Date.now() - startedAt < 2500) {
    const lib = window.pdfjsLib;
    if (lib) return lib;
    // petite attente pour laisser le module se charger
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("pdfjsLib non chargé (pdfjs-bridge.mjs).");
}

const pdfRenderCache = {
  path: null,
  base64: null,
  doc: null
};

async function loadPdfDocument(pdfPath) {
  if (pdfRenderCache.path === pdfPath && pdfRenderCache.doc) return pdfRenderCache.doc;
  const pdfjs = await getPdfJs();
  const read = await window.maniPdfApi.readPdfBytes(pdfPath);
  if (!read.ok) throw new Error(read.error || "Lecture PDF impossible.");
  const data = base64ToUint8Array(read.base64);
  const loadingTask = pdfjs.getDocument({ data, disableFontFace: true });
  const doc = await loadingTask.promise;
  pdfRenderCache.path = pdfPath;
  pdfRenderCache.base64 = read.base64;
  pdfRenderCache.doc = doc;
  return doc;
}

function ensureOverlaysOn(pageNode) {
  if (!pageNode) return;
  if (!annotationLayer) {
    annotationLayer = document.createElement("div");
    annotationLayer.id = "annotationLayer";
  }
  if (!dropOverlay) {
    dropOverlay = document.createElement("div");
    dropOverlay.id = "dropOverlay";
    dropOverlay.setAttribute("aria-hidden", "true");
  }
  pageNode.appendChild(annotationLayer);
  pageNode.appendChild(dropOverlay);
  attachDropOverlayListeners(dropOverlay);
}

function setActivePage(pageNumber) {
  const tab = getActiveTab();
  if (!tab || !pagesContainer) return;
  tab.currentPage = pageNumber;
  pageInfo.textContent = `Page ${pageNumber}`;

  pagesContainer.querySelectorAll(".pdf-page").forEach((p) => p.classList.remove("active"));
  const active = pagesContainer.querySelector(`.pdf-page[data-page="${pageNumber}"]`);
  if (active) active.classList.add("active");

  ensureOverlaysOn(active);
  pdfCanvas = active?.querySelector?.("canvas") || null;

  if (pdfCanvas && annotationLayer) {
    annotationLayer.style.width = `${pdfCanvas.width}px`;
    annotationLayer.style.height = `${pdfCanvas.height}px`;
  }
  if (pdfCanvas && dropOverlay) {
    dropOverlay.style.width = `${pdfCanvas.width}px`;
    dropOverlay.style.height = `${pdfCanvas.height}px`;
  }

  enforceSafeZoneForActiveTab();
  renderAnnotations();
  scheduleSidebarUpdate();
}

async function renderPdfDocument(pdfPath) {
  if (!pagesContainer) return;
  const tab = getActiveTab();
  if (!tab) return;

  // Annuler les renders en cours (zoom/resize rapides)
  activePdfRenderToken += 1;
  const token = activePdfRenderToken;
  try {
    activePdfRenderTasks.forEach((t) => t?.cancel?.());
  } catch {}
  activePdfRenderTasks = [];

  const doc = await loadPdfDocument(pdfPath);
  const count = doc.numPages || 1;
  tab.pageCount = count;
  const containerWidth = Math.max(1, Math.floor((viewer?.clientWidth || 1) - 24));

  pagesContainer.innerHTML = "";
  // E12: progression de rendu (status bar)
  try {
    setStatus(`Rendu pages 0/${count}…`);
  } catch {}
  let lastProgressAt = 0;

  for (let pageNumber = 1; pageNumber <= count; pageNumber += 1) {
    if (token !== activePdfRenderToken) return;
    // Throttle: éviter de spammer la status bar sur gros PDFs.
    const now = Date.now();
    if (pageNumber === 1 || pageNumber === count || now - lastProgressAt > 140) {
      lastProgressAt = now;
      try {
        setStatus(`Rendu pages ${pageNumber}/${count}…`);
      } catch {}
    }
    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const baseScale = containerWidth / baseViewport.width;
    const scale = baseScale * (state.zoomScale || 1);
    const viewport = page.getViewport({ scale: Number.isFinite(scale) && scale > 0 ? scale : 1 });

    const pageNode = document.createElement("div");
    pageNode.className = "pdf-page";
    pageNode.dataset.page = String(pageNumber);

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-canvas";
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    pageNode.style.width = `${canvas.width}px`;
    pageNode.style.height = `${canvas.height}px`;
    pageNode.appendChild(canvas);

    pageNode.addEventListener("mousedown", () => setActivePage(pageNumber));

    pagesContainer.appendChild(pageNode);

    const ctx = canvas.getContext("2d", { alpha: false });
    const task = page.render({ canvasContext: ctx, viewport });
    activePdfRenderTasks.push(task);
    try {
      await task.promise;
    } finally {
      // cleanup best-effort
      activePdfRenderTasks = activePdfRenderTasks.filter((t) => t !== task);
    }
  }

  setActivePage(tab.currentPage || 1);
  applyZoomAnchorIfAny();
  scheduleSidebarUpdate();
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
  // E10-S1: onboarding minimal après ouverture
  try {
    setTimeout(() => {
      // Ne pas spammer si l'utilisateur a déjà des interactions.
      if (!getActiveTab()) return;
      setStatus('PDF chargé — Cliquez sur 🔤 + Texte pour annoter');
    }, 250);
  } catch {}

}

async function promptOpenPdf() {

  const selected = await window.maniPdfApi.openPdfDialog();
  if (!selected.ok) {
    if (!selected.cancelled) setStatus(selected.error || "Selection annulee.");

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
  // E7-S2: toute mutation des annotations rend l'onglet "dirty".
  tab.dirty = true;
}

function applySnapshot(tab, snapshot) {
  const parsed = JSON.parse(snapshot);
  tab.annotationsByPage = parsed.annotationsByPage || {};
}

function renderAnnotations() {
  if (!annotationLayer) return;
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
      // En mode édition, forcer le mode texte pour éviter des comportements HTML.
      // "plaintext-only" est supporté par Chromium; fallback sur "true" si ignoré.
      node.setAttribute("contenteditable", isEditing ? "plaintext-only" : "false");
      // IMPORTANT: sous Electron, l'attribut seul peut être insuffisant selon les builds.
      // On force aussi la propriété DOM.
      try {
        node.contentEditable = isEditing ? "true" : "false";
      } catch {}
      if (isEditing) node.classList.add("editing");
      // Placeholder visuel uniquement (CSS). Ne jamais le stocker dans a.text.
      node.textContent = a.text ? a.text : "";
      node.dataset.placeholder = "Nouveau texte";
      node.style.color = a.textColor || "#111111";
      // Par défaut pas de fond: on veut un rendu "écrit sur le document".
      node.style.backgroundColor = a.bgColor ? a.bgColor : "transparent";
      // E9: halo/contour optionnel pour lisibilité.
      // Par défaut activé si non spécifié.
      const haloOn = a.halo !== false;
      node.style.textShadow = haloOn
        ? "0 0 2px rgba(255, 255, 255, 0.85), 0 0 3px rgba(0, 0, 0, 0.25)"
        : "none";
      node.style.padding = `${a.padding ?? 6}px`;
      node.style.fontFamily = a.fontFamily || "Arial";
      node.style.fontSize = `${a.fontSize ?? 14}px`;
      // En mode édition, c'est le textarea qui doit recevoir le focus (pas le div).
      node.tabIndex = isEditing ? -1 : 0;

      node.onblur = () => {

        // Ne PAS quitter automatiquement l'édition sur blur: Electron peut provoquer
        // des blur intempestifs (menus/scroll/clic) et ça empêche de saisir.
        // La sortie d'édition est gérée par le clic "hors zone" (listener global).
        try {
          captureSnapshot(tab);
          a.text = node.textContent || "";
          scheduleAutoSave();
        } catch {}
      };
      if (isEditing) {
        // Mode édition robuste: textarea (plus fiable que contenteditable sous Electron)
        node.setAttribute("contenteditable", "false");
        try {
          node.contentEditable = "false";
        } catch {}
        node.innerHTML = "";
        const ta = document.createElement("textarea");
        ta.className = "text-editor";
        ta.value = a.text || "";
        ta.spellcheck = false;
        ta.wrap = "soft";
        ta.addEventListener(
          "input",
          () => {
            a.text = ta.value || "";
            // Garder le DOM en place: on ne rerender pas pendant la saisie.
            scheduleAutoSave();
            scheduleAutoGrowText(tab, a, node, "input");
          },
          { capture: true }
        );
        ta.addEventListener(
          "blur",
          () => {
            // On ne sort pas de l'édition ici (géré par clic hors zone).
            try {
              captureSnapshot(tab);
              a.text = ta.value || "";
              scheduleAutoSave();
            } catch {}
          },
          { capture: true }
        );
        // Empêcher la logique de drag de capter le mousedown pendant l'édition.
        ta.addEventListener(
          "mousedown",
          (event) => {
            event.stopPropagation();
          },
          { capture: true }
        );
        node.appendChild(ta);
        // Forcer le focus sur le textarea après insertion DOM.
        requestAnimationFrame(() => {
          try {
            ta.focus();
          } catch {}
        });
      }
      node.ondblclick = (event) => {
        if (interactionMode && interactionMode !== "drag-pending") return;
        if (event.target.closest(".resize-handle")) return;
        // CRITIQUE: évite que le listener global "clic hors zone" annule l'édition
        // dans le même cycle d'événement.
        try {
          event.preventDefault();
        } catch {}
        event.stopPropagation();
        cancelPointerInteraction();
        if (pendingSingleClickRenderTimer) {
          clearTimeout(pendingSingleClickRenderTimer);
          pendingSingleClickRenderTimer = null;
        }
        state.selectedAnnotationId = a.id;
        state.editingAnnotationId = a.id;
        renderAnnotations();
        requestAnimationFrame(() => {
          const editNode = annotationLayer.querySelector(`[data-id="${a.id}"]`);
          if (editNode) {
            // Focus textarea si présent, sinon fallback sur le node
            const ta = editNode.querySelector("textarea.text-editor");
            if (ta) ta.focus();
            else editNode.focus();
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

      // Fallback ultra-robuste: on observe que "click/dblclick" ne se déclenche
      // pas toujours sous Electron quand on amorce un drag (même léger).
      // On passe donc en édition sur "double mousedown" rapide.
      if (a.type === "text" && !event.target.closest(".resize-handle")) {
        const now = Date.now();
        const isSecondDown = lastTextMouseDownId === a.id && now - lastTextMouseDownAt <= 320;

        lastTextMouseDownAt = now;
        lastTextMouseDownId = a.id;
        if (isSecondDown) {

          // CRITIQUE: sinon le mousedown "bulle" et le listener global
          // considère le clic comme "hors zone" (car le DOM est rerender),
          // ce qui annule immédiatement l'édition.
          try {
            event.preventDefault();
          } catch {}
          event.stopPropagation();
          state.selectedAnnotationId = a.id;
          state.editingAnnotationId = a.id;
          cancelPointerInteraction();
          if (pendingSingleClickRenderTimer) {
            clearTimeout(pendingSingleClickRenderTimer);
            pendingSingleClickRenderTimer = null;
          }
          renderAnnotations();
          requestAnimationFrame(() => {
            const editNode = annotationLayer?.querySelector?.(`[data-id="${a.id}"]`);
            const ta = editNode?.querySelector?.("textarea.text-editor");
            if (ta) ta.focus();
            else editNode?.focus?.();
          });
          return;
        }
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
      if (a.type === "text") {
        const now = Date.now();
        const isSecondClick = lastTextClickId === a.id && now - lastTextClickAt <= 320;
        lastTextClickAt = now;
        lastTextClickId = a.id;

        // Fallback robuste: Electron/Chromium peut ne pas émettre "dblclick"
        // si le DOM est rerender ou si un drag est amorcé.
        if (isSecondClick) {

          if (pendingSingleClickRenderTimer) {
            clearTimeout(pendingSingleClickRenderTimer);
            pendingSingleClickRenderTimer = null;
          }
          state.editingAnnotationId = a.id;
          cancelPointerInteraction();
          renderAnnotations();
          requestAnimationFrame(() => {
            const editNode = annotationLayer?.querySelector?.(`[data-id="${a.id}"]`);
            const ta = editNode?.querySelector?.("textarea.text-editor");
            if (ta) ta.focus();
            else editNode?.focus?.();
          });
          return;
        }

        if (pendingSingleClickRenderTimer) clearTimeout(pendingSingleClickRenderTimer);
        pendingSingleClickRenderTimer = setTimeout(() => {
          pendingSingleClickRenderTimer = null;
          renderAnnotations();
        }, 260);
        return;
      }
      renderAnnotations();
    };

    if (
      state.selectedAnnotationId === a.id &&
      !(a.type === "text" && state.editingAnnotationId === a.id)
    ) {
      const handles = [
        { mode: "tl", className: "resize-handle tl" },
        { mode: "t", className: "resize-handle top-middle" },
        { mode: "tr", className: "resize-handle tr" },
        { mode: "l", className: "resize-handle left-middle" },
        { mode: "r", className: "resize-handle right-middle" },
        { mode: "bl", className: "resize-handle bl" },
        { mode: "b", className: "resize-handle bottom-middle" },
        { mode: "br", className: "resize-handle br" }
      ];
      handles.forEach((h) => {
        const handle = document.createElement("div");
        handle.className = h.className;
        handle.dataset.mode = h.mode;
        handle.onmousedown = (event) => startResize(event, a.id, h.mode);
        node.appendChild(handle);
      });
    }
    annotationLayer.appendChild(node);
    if (a.type === "text") {
      scheduleAutoGrowText(tab, a, node, "render");
    }
  });
  scheduleSidebarUpdate();
}

function startDrag(event, id) {
  if (event.button !== 0) return;
  if (interactionMode) return;

  if (state.editingAnnotationId === id) return;
  if (event.target.classList?.contains("resize-handle")) return;
  const tab = getActiveTab();
  if (!tab) return;
  const item = currentPageAnnotations(tab).find((a) => a.id === id);
  if (!item) return;
  state.selectedAnnotationId = id;
  // Ne pas preventDefault ici: sinon Chromium ne déclenche souvent pas le dblclick.
  interactionMode = "drag-pending";
  const startX = event.clientX;
  const startY = event.clientY;
  const originX = item.x;
  const originY = item.y;
  const startScrollLeft = viewer?.scrollLeft || 0;
  const startScrollTop = viewer?.scrollTop || 0;
  let lastClientX = startX;
  let lastClientY = startY;
  captureSnapshot(tab);
  let hasMoved = false;

  const applyDragAt = (clientX, clientY) => {
    const dx = clientX - startX + ((viewer?.scrollLeft || 0) - startScrollLeft);
    const dy = clientY - startY + ((viewer?.scrollTop || 0) - startScrollTop);
    const dist2 = dx * dx + dy * dy;
    if (!hasMoved) {
      // seuil anti "clic = drag" (permet dblclick fiable)
      // 12px: évite qu'un léger tremblement annule le click/dblclick
      if (dist2 < 144) return;
      hasMoved = true;
      interactionMode = "drag";
      try {
        // On ne doit empêcher le comportement par défaut qu'une fois le drag confirmé.
        // (Sinon dblclick devient flaky sous Chromium/Electron.)
      } catch {}
    }
    const zone = getSafeZoneSize();
    const maxX = Math.max(0, zone.width - item.w);
    const maxY = Math.max(0, zone.height - item.h);
    item.x = clamp(originX + dx, 0, maxX);
    item.y = clamp(originY + dy, 0, maxY);
    renderAnnotations();
  };

  const move = (ev) => {
    lastClientX = ev.clientX;
    lastClientY = ev.clientY;
    if (hasMoved) {
      try {
        ev.preventDefault();
      } catch {}
    }
    applyDragAt(ev.clientX, ev.clientY);
  };

  // Si l'utilisateur scroll pendant le drag, l'élément doit rester sous le curseur.
  const onScroll = () => {
    if (!hasMoved) return;
    applyDragAt(lastClientX, lastClientY);
  };

  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    viewer?.removeEventListener?.("scroll", onScroll);
    interactionMode = null;
    // Ne pas bloquer le click si on n'a pas réellement dragué.
    suppressClickUntil = Date.now() + (hasMoved ? 180 : 0);
    activePointerCleanup = null;
    syncPropertyInputs();
    scheduleAutoSave();
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
  viewer?.addEventListener?.("scroll", onScroll, { passive: true });
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
  const originX = item.x;
  const originY = item.y;
  const originW = item.w;
  const originH = item.h;
  captureSnapshot(tab);

  const move = (ev) => {
    const zone = getSafeZoneSize();
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const minW = 20;

    let nextX = originX;
    let nextY = originY;
    let nextW = originW;
    let nextH = originH;

    const affectsLeft = mode === "l" || mode === "tl" || mode === "bl";
    const affectsRight = mode === "r" || mode === "tr" || mode === "br";
    const affectsTop = mode === "t" || mode === "tl" || mode === "tr";
    const affectsBottom = mode === "b" || mode === "bl" || mode === "br";

    if (affectsRight) nextW = originW + dx;
    if (affectsBottom) nextH = originH + dy;
    if (affectsLeft) {
      nextX = originX + dx;
      nextW = originW - dx;
    }
    if (affectsTop) {
      nextY = originY + dy;
      nextH = originH - dy;
    }

    // Enforce min sizes by adjusting the anchored edge.
    let minH = 20;
    if (item.type === "text") {
      // La fenêtre ne peut pas être plus petite que le texte qu'elle contient.
      // IMPORTANT: si on est en resize horizontal pur (gauche/droite), on ne doit
      // pas "partir vers le bas" : on bloque la largeur au lieu d'augmenter la hauteur.
      const horizontalOnly = (affectsLeft || affectsRight) && !affectsTop && !affectsBottom;
      if (!horizontalOnly) {
        minH = Math.max(minH, getRequiredTextHeightForWidth(item, nextW));
      }
    }
    if (nextW < minW) {
      if (affectsLeft) nextX -= minW - nextW;
      nextW = minW;
    }
    if (nextH < minH) {
      if (affectsTop) nextY -= minH - nextH;
      nextH = minH;
    }

    // Blocage largeur pour texte si réduire la largeur imposerait d'augmenter la hauteur
    // (cas "resize gauche/droite" où l'utilisateur force au delà du minimum).
    if (item.type === "text") {
      const horizontalOnly = (affectsLeft || affectsRight) && !affectsTop && !affectsBottom;
      if (horizontalOnly) {
        // Après les clamps, nextH correspond à la hauteur stable du cadre.
        // On calcule la largeur minimale qui permet au texte de tenir dans nextH.
        const maxWAllowed = Math.max(minW, zone.width - clamp(nextX, 0, zone.width));
        const minWidthToFit = getMinWidthToFitHeight(item, nextH, Math.min(maxWAllowed, Math.max(nextW, originW)));
        if (nextW < minWidthToFit) {
          if (affectsLeft) {
            nextX -= (minWidthToFit - nextW);
          }
          nextW = minWidthToFit;
        }
      }
    }

    // Clamp within safe zone
    nextX = clamp(nextX, 0, Math.max(0, zone.width - nextW));
    nextY = clamp(nextY, 0, Math.max(0, zone.height - nextH));
    nextW = clamp(nextW, minW, Math.max(minW, zone.width - nextX));
    nextH = clamp(nextH, minH, Math.max(minH, zone.height - nextY));

    item.x = nextX;
    item.y = nextY;
    item.w = nextW;
    item.h = nextH;
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
  const id = newAnnotationId();
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
    bgColor: null,
    padding: 6,
    fontFamily: "Arial",
    fontSize: 14,
    text: type === "text" ? "" : undefined,
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

function pasteClipboardIntoActivePage() {
  const tab = getActiveTab();
  if (!tab || !state.clipboard) return;
  const data = deepClone(state.clipboard);
  data.id = newAnnotationId();

  // Page cible = page active (la position du curseur est supposée être sur cette page).
  const targetPage = String(tab.currentPage || 1);
  if (!tab.annotationsByPage[targetPage]) tab.annotationsByPage[targetPage] = [];

  const zone = getSafeZoneSize();
  const p = state.lastPointer && Number(state.lastPointer.page) === Number(tab.currentPage || 1) ? state.lastPointer : null;
  const cx = p ? p.x : zone.width / 2;
  const cy = p ? p.y : zone.height / 2;

  // Positionner top-left proche du curseur, sans sortir de la page.
  data.x = cx - (data.w || 20) / 2;
  data.y = cy - (data.h || 20) / 2;
  fitAnnotationToSafeZone(data, zone);

  captureSnapshot(tab);
  tab.annotationsByPage[targetPage].push(data);
  state.selectedAnnotationId = data.id;
  state.editingAnnotationId = null;
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
  const found = findAnnotationLocation(tab, state.selectedAnnotationId);
  if (!found) return;
  captureSnapshot(tab);
  found.arr.splice(found.idx, 1);
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
  const isText = !!item && item.type === "text";
  if (textPropsPanel) {
    textPropsPanel.classList.toggle("hidden", !isText);
  }
  if (!item) return;
  propWidth.value = String(Math.round(item.w || 180));
  propHeight.value = String(Math.round(item.h || 120));
  propRotation.value = String(Math.round(item.rotation || 0));
  propOpacity.value = String(Math.round(item.opacity ?? 100));
  if (isText) {
    propTextColor.value = item.textColor || "#111111";

    // Fond transparent par défaut: on affiche une "case vide".
    // input[type=color] ne supporte pas une valeur vide, donc on met un fallback,
    // et on pilote l'apparence via une classe CSS.
    const bgIsTransparent = !item.bgColor;
    propBgColor.value = bgIsTransparent ? "#ffffff" : item.bgColor;
    propBgColorLabel?.classList?.toggle?.("is-transparent", bgIsTransparent);

    // Le champ Fond n'est appliqué que si l'utilisateur le modifie explicitement.
    propBgColor.dataset.touched = "0";
    propPadding.value = String(Math.round(item.padding ?? 6));
    propFontFamily.value = item.fontFamily || "Arial";
    propFontSize.value = String(Math.round(item.fontSize ?? 14));
    if (propHalo) propHalo.checked = item.halo !== false;
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

    // Couleur "Txt" = couleur du texte (toujours).
    // (La couleur de fond est gérée uniquement via le champ "Fond".)
    if (hasSelection || !hasSelection) {
      item.textColor = propTextColor.value || "#111111";
    }

    // Le champ "Fond" reste un override explicite du fond du bloc.
    if (propBgColor.dataset.touched === "1") {
      item.bgColor = propBgColor.value ? propBgColor.value : null;
    }

    item.padding = Math.max(0, Math.min(64, Number(propPadding.value) || 0));
    item.fontFamily = propFontFamily.value || "Arial";
    item.fontSize = Math.max(8, Math.min(96, Number(propFontSize.value) || 14));
    if (propHalo) item.halo = !!propHalo.checked;
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
  const next = (tab.currentPage || 1) + delta;
  const max = tab.pageCount ? Math.max(1, tab.pageCount) : next;
  tab.currentPage = clamp(next, 1, max);
  setActivePage(tab.currentPage);
  const active = pagesContainer?.querySelector?.(`.pdf-page[data-page="${tab.currentPage}"]`);
  active?.scrollIntoView?.({ block: "start", inline: "nearest" });
}

async function saveSession() {
  const payload = {
    savedAt: new Date().toISOString(),
    tabs: state.tabs,
    activeTabId: state.activeTabId
  };
  const result = await window.maniPdfApi.saveSession(payload);
  setStatus(result.ok ? "Session sauvegardee" : result.error);
  if (result.ok) {
    try {
      state.tabs.forEach((t) => {
        t.dirty = false;
      });
    } catch {}
  }
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

// Ouverture PDF via menu natif (File > Open PDF) et raccourci clavier (Ctrl+O).

saveSessionBtn?.addEventListener?.("click", saveSession);
prevBtn?.addEventListener?.("click", () => pageShift(-1));
nextBtn?.addEventListener?.("click", () => pageShift(1));
addTextBtn?.addEventListener?.("click", () => addAnnotation("text"));
addShapeBtn?.addEventListener?.("click", openShapePicker);
addImageBtn?.addEventListener?.("click", () => imageInput?.click?.());
imageInput?.addEventListener?.("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const src = URL.createObjectURL(file);
  addAnnotation("image", { src, fileName: file.name || null });
  imageInput.value = "";
});
deleteSelectedBtn?.addEventListener?.("click", deleteSelected);
undoBtn?.addEventListener?.("click", undo);
redoBtn?.addEventListener?.("click", redo);
applyPropsBtn?.addEventListener?.("click", applySelectedProperties);
applyBgBtn?.addEventListener?.("click", () => {
  try {
    propBgColor.dataset.touched = "1";
    propBgColorLabel?.classList?.remove?.("is-transparent");
  } catch {}
  applySelectedProperties();
});
propWidth?.addEventListener?.("input", applySelectedPropertiesLive);
propHeight?.addEventListener?.("input", applySelectedPropertiesLive);
propRotation?.addEventListener?.("input", applySelectedPropertiesLive);
propOpacity?.addEventListener?.("input", applySelectedPropertiesLive);
propTextColor?.addEventListener?.("input", applySelectedPropertiesLive);

function markBgTouchedAndApply() {
  try {
    propBgColor.dataset.touched = "1";
    // Si l'utilisateur touche "Fond", ce n'est plus transparent.
    propBgColorLabel?.classList?.remove?.("is-transparent");
  } catch {}
  // Important: toucher -> puis appliquer, sinon applySelectedProperties ignore le fond.
  applySelectedPropertiesLive();
}

// Sous Electron, le picker peut déclencher "change" plutôt que "input".
propBgColor?.addEventListener?.("input", markBgTouchedAndApply);
propBgColor?.addEventListener?.("change", markBgTouchedAndApply);
propPadding?.addEventListener?.("input", applySelectedPropertiesLive);
propFontFamily?.addEventListener?.("change", applySelectedPropertiesLive);
propFontSize?.addEventListener?.("input", applySelectedPropertiesLive);
propHalo?.addEventListener?.("change", applySelectedPropertiesLive);

// E9: Presets (appliqués au champ texte sélectionné)
function applyTextPreset(preset) {
  const tab = getActiveTab();
  const item = getSelectedAnnotation();
  if (!tab || !item || item.type !== "text") return;
  captureSnapshot(tab);
  if (preset === "pen") {
    item.bgColor = null;
    item.halo = true;
    // Ne pas "toucher" le color picker (override explicite).
    try {
      propBgColor.dataset.touched = "0";
    } catch {}
  } else if (preset === "highlighter") {
    // Fond semi-transparent (ne passe pas par color picker HTML).
    item.bgColor = "rgba(255, 230, 90, 0.45)";
    item.halo = false;
    try {
      propBgColor.dataset.touched = "0";
    } catch {}
  }
  syncPropertyInputs();
  renderAnnotations();
  scheduleAutoSave();
}
presetPenBtn?.addEventListener?.("click", () => applyTextPreset("pen"));
presetHighlighterBtn?.addEventListener?.("click", () => applyTextPreset("highlighter"));
mergeBtn?.addEventListener?.("click", createMergeJob);
splitBtn?.addEventListener?.("click", createSplitJob);
compressBtn?.addEventListener?.("click", createCompressJob);
protectBtn?.addEventListener?.("click", createProtectJob);
unprotectBtn?.addEventListener?.("click", createUnprotectJob);
fitWidthBtn?.addEventListener?.("click", () => setZoomMode("page-width"));
fitPageBtn?.addEventListener?.("click", () => setZoomMode("page-fit"));
zoomOutBtn?.addEventListener?.("click", () => setZoomScale((state.zoomScale || 1) / 1.1, "btn-"));
zoomInBtn?.addEventListener?.("click", () => setZoomScale((state.zoomScale || 1) * 1.1, "btn+"));
closeShapeModalBtn?.addEventListener?.("click", closeShapePicker);
shapeModal?.addEventListener?.("mousedown", (event) => {
  if (event.target === shapeModal) closeShapePicker();
});
shapeGrid?.addEventListener?.("click", (event) => {
  const btn = event.target.closest("button[data-shape]");
  if (!btn) return;
  addShapeByType(btn.dataset.shape);
});

// Visibilité barre HTML : visible si fenêtre en vrai plein écran (F11), sinon masquée.
// F10 inverse l'état (XOR) : permet d'afficher la barre hors plein écran ou de la masquer dedans.
let electronWindowFullscreen = false;
let htmlToolbarF10Flip = false;

function htmlToolbarShouldBeVisible() {
  return electronWindowFullscreen !== htmlToolbarF10Flip;
}

function updateAppToolbarDom(_source = "unknown") {
  if (!appToolbar) {
    return;
  }
  const visible = htmlToolbarShouldBeVisible();
  appToolbar.classList.toggle("hidden", !visible);
  if (!visible) {
    try {
      closeAllFlyoutMenus();
    } catch {}
  }
}

function toggleHtmlToolbarF10(source) {
  htmlToolbarF10Flip = !htmlToolbarF10Flip;
  updateAppToolbarDom(`f10:${source}`);
}

async function syncFullscreenFromMain() {
  try {
    const r = await window.maniPdfApi?.getWindowFullscreen?.();
    electronWindowFullscreen = Boolean(r?.full);
  } catch {
    /* ignore */
  }
  updateAppToolbarDom("syncFullscreenFromMain");
}

// E8: menus déroulants (Outils PDF + barre custom Fichier / Options)
function closeToolbarFileMenu() {
  if (!toolbarFileMenu || !toolbarFileBtn) return;
  toolbarFileMenu.classList.add("hidden");
  toolbarFileBtn.setAttribute("aria-expanded", "false");
}
function closeToolbarOptionsMenu() {
  if (!toolbarOptionsMenu || !toolbarOptionsBtn) return;
  toolbarOptionsMenu.classList.add("hidden");
  toolbarOptionsBtn.setAttribute("aria-expanded", "false");
}
function closePdfToolsMenu() {
  if (!pdfToolsMenu || !pdfToolsBtn) return;
  pdfToolsMenu.classList.add("hidden");
  pdfToolsBtn.setAttribute("aria-expanded", "false");
}
function closeAllFlyoutMenus() {
  closePdfToolsMenu();
  closeToolbarFileMenu();
  closeToolbarOptionsMenu();
}
function togglePdfToolsMenu() {
  if (!pdfToolsMenu || !pdfToolsBtn) return;
  const isOpen = !pdfToolsMenu.classList.contains("hidden");
  if (isOpen) {
    closePdfToolsMenu();
    return;
  }
  closeToolbarFileMenu();
  closeToolbarOptionsMenu();
  pdfToolsMenu.classList.remove("hidden");
  pdfToolsBtn.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    try {
      pdfToolsMenu.querySelector("button[role='menuitem']")?.focus?.();
    } catch {}
  });
}
function toggleToolbarFileMenu() {
  if (!toolbarFileMenu || !toolbarFileBtn) return;
  const isOpen = !toolbarFileMenu.classList.contains("hidden");
  if (isOpen) {
    closeToolbarFileMenu();
    return;
  }
  closePdfToolsMenu();
  closeToolbarOptionsMenu();
  toolbarFileMenu.classList.remove("hidden");
  toolbarFileBtn.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    try {
      toolbarFileMenu.querySelector("button[role='menuitem']")?.focus?.();
    } catch {}
  });
}
function toggleToolbarOptionsMenu() {
  if (!toolbarOptionsMenu || !toolbarOptionsBtn) return;
  const isOpen = !toolbarOptionsMenu.classList.contains("hidden");
  if (isOpen) {
    closeToolbarOptionsMenu();
    return;
  }
  closePdfToolsMenu();
  closeToolbarFileMenu();
  toolbarOptionsMenu.classList.remove("hidden");
  toolbarOptionsBtn.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    try {
      toolbarOptionsMenu.querySelector("button[role='menuitem']")?.focus?.();
    } catch {}
  });
}
async function quitApplication() {
  try {
    await window.maniPdfApi?.quitApp?.();
  } catch {
    try {
      window.close();
    } catch {}
  }
}
pdfToolsBtn?.addEventListener?.("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  togglePdfToolsMenu();
});
toolbarFileBtn?.addEventListener?.("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleToolbarFileMenu();
});
toolbarOptionsBtn?.addEventListener?.("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleToolbarOptionsMenu();
});
toolbarOpenPdfBtn?.addEventListener?.("click", (e) => {
  e.preventDefault();
  closeAllFlyoutMenus();
  promptOpenPdf();
});
toolbarSaveSessionBtn?.addEventListener?.("click", (e) => {
  e.preventDefault();
  closeAllFlyoutMenus();
  saveSession().catch(() => {});
});
toolbarQuitBtn?.addEventListener?.("click", (e) => {
  e.preventDefault();
  closeAllFlyoutMenus();
  quitApplication();
});
toolbarCloseBtn?.addEventListener?.("click", (e) => {
  e.preventDefault();
  closeAllFlyoutMenus();
  quitApplication();
});
toolbarOptionsMenu?.addEventListener?.("click", (e) => {
  const btn = e.target?.closest?.(".toolbar-lang-btn[data-lang]");
  if (!btn) return;
  try {
    setLanguage(btn.dataset.lang);
  } catch {}
  closeAllFlyoutMenus();
});
document.addEventListener("click", (e) => {
  const inside =
    e.target?.closest?.("#pdfToolsMenu") ||
    e.target?.closest?.("#pdfToolsBtn") ||
    e.target?.closest?.("#toolbarFileMenu") ||
    e.target?.closest?.("#toolbarFileBtn") ||
    e.target?.closest?.("#toolbarOptionsMenu") ||
    e.target?.closest?.("#toolbarOptionsBtn");
  if (inside) return;
  closeAllFlyoutMenus();
});
pdfToolsMenu?.addEventListener?.("click", (e) => {
  const item = e.target?.closest?.("button[role='menuitem']");
  if (!item) return;
  closePdfToolsMenu();
});

window.maniPdfApi?.onFullscreenChanged?.((full) => {
  electronWindowFullscreen = Boolean(full);
  updateAppToolbarDom("ipc:fullscreen-changed");
});

window.maniPdfApi?.onToolbarF10Toggle?.(() => {
  toggleHtmlToolbarF10("main-before-input");
});

window.maniPdfApi?.onOpenFromMenu?.(async (filePath) => {

  const name = filePath.split("\\").pop() || "document.pdf";
  await addPdfTab(filePath, name);
});

// Options > Langue (menu natif)
window.maniPdfApi?.onSetLanguage?.((lang) => {
  try {
    setLanguage(lang);
  } catch {}
});

window.maniPdfApi?.onAutosaveRequested?.(saveSession);
window.maniPdfApi?.onSaveRequested?.(saveSession);

// Quitte le mode edition texte uniquement si clic en dehors de la case texte en edition.
document.addEventListener("mousedown", (event) => {
  // Clic gauche uniquement: on ne veut pas casser le menu contextuel.
  if (event.button !== 0) return;
  // Si on n'édite pas, un clic dans le document hors annotation doit désélectionner.
  if (!state.editingAnnotationId) {
    if (!state.selectedAnnotationId) return;
    const inViewer = !!event.target?.closest?.(".viewer");
    if (!inViewer) return;
    const clickedId = event.target?.closest?.("[data-id]")?.getAttribute?.("data-id") || null;
    if (clickedId) return;
    state.selectedAnnotationId = null;
    syncPropertyInputs();
    renderAnnotations();
    return;
  }
  const editingNode = annotationLayer?.querySelector?.(`[data-id="${state.editingAnnotationId}"]`);
  if (!editingNode) return;
  // IMPORTANT: si l'événement provient de l'annotation en édition (même avant rerender),
  // le composedPath contient l'ancien node avec le bon data-id. Ça évite de quitter
  // l'édition immédiatement quand on bascule en édition sur mousedown/dblclick.
  try {
    const path = event.composedPath?.() || [];
    const editingId = String(state.editingAnnotationId);
    const hit = path.some((el) => {
      try {
        return el?.getAttribute?.("data-id") === editingId;
      } catch {
        return false;
      }
    });
    if (hit) return;
  } catch {}
  if (editingNode.contains(event.target)) return;

  // On clique hors du champ texte: on sort du mode édition et on persiste le contenu.
  const tab = getActiveTab();
  if (tab) {
    try {
      const id = state.editingAnnotationId;
      const item = findAnnotationLocation(tab, id)?.item || null;
      const ta = editingNode.querySelector?.("textarea.text-editor");
      if (item && item.type === "text" && ta) {
        captureSnapshot(tab);
        item.text = ta.value || "";
      }
    } catch {}
    scheduleAutoSave();
  }

  state.editingAnnotationId = null;
  // Si on clique hors cadre, la fenêtre ne doit plus être sélectionnée (plus de contour bleu).
  // Mais si on clique sur une AUTRE annotation, on laisse le gestionnaire de click
  // appliquer la sélection correspondante.
  try {
    const clickedId = event.target?.closest?.("[data-id]")?.getAttribute?.("data-id") || null;
    if (!clickedId) {
      state.selectedAnnotationId = null;
    }
  } catch {
    state.selectedAnnotationId = null;
  }
  try {
    document.activeElement?.blur?.();
  } catch {}
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
document.addEventListener(
  "keydown",
  (event) => {
  if (event.key === "F10") {
    event.preventDefault();
    event.stopPropagation();
    toggleHtmlToolbarF10("renderer-keydown");
    return;
  }

  if (event.key === "Escape" && !shapeModal.classList.contains("hidden")) {
    event.preventDefault();
    closeShapePicker();
    return;
  }

  if (event.key === "Escape") {
    const anyFlyout =
      (pdfToolsMenu && !pdfToolsMenu.classList.contains("hidden")) ||
      (toolbarFileMenu && !toolbarFileMenu.classList.contains("hidden")) ||
      (toolbarOptionsMenu && !toolbarOptionsMenu.classList.contains("hidden"));
    if (anyFlyout) {
      event.preventDefault();
      closeAllFlyoutMenus();
      return;
    }
  }

  // E6-S2: en mode édition texte, ESC doit terminer l'édition (sans perdre le texte).
  if (event.key === "Escape" && state.editingAnnotationId) {
    event.preventDefault();
    const tab = getActiveTab();
    if (tab) {
      try {
        const id = state.editingAnnotationId;
        const annos = currentPageAnnotations(tab);
        const item = annos.find((a) => a.id === id);
        const editingNode = annotationLayer?.querySelector?.(`[data-id="${id}"]`);
        const ta = editingNode?.querySelector?.("textarea.text-editor");
        if (item && item.type === "text" && ta) {
          captureSnapshot(tab);
          item.text = ta.value || "";
          scheduleAutoSave();
        }
      } catch {}
    }
    state.editingAnnotationId = null;
    state.selectedAnnotationId = null;
    try {
      document.activeElement?.blur?.();
    } catch {}
    syncPropertyInputs();
    renderAnnotations();
    return;
  }

  if (isTypingContext(event.target) || state.editingAnnotationId) return;

  const key = event.key.toLowerCase();

  // Clipboard (Ctrl+C / Ctrl+X / Ctrl+V) pour annotations
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === "c") {
    const tab = getActiveTab();
    const item = getSelectedAnnotationFromActivePage(tab);
    if (!tab || !item) return;
    event.preventDefault();
    // On copie toutes les props au moment du Ctrl+C
    const copy = cloneForClipboard(item);
    if (!copy) return;
    state.clipboard = copy;
    setStatus("Élément copié");
    return;
  }
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === "x") {
    const tab = getActiveTab();
    const annotations = tab ? currentPageAnnotations(tab) : null;
    const item = getSelectedAnnotationFromActivePage(tab);
    if (!tab || !annotations || !item) return;
    event.preventDefault();
    const cut = cloneForClipboard(item);
    if (!cut) return;
    state.clipboard = cut;
    const idx = annotations.findIndex((a) => a.id === item.id);
    if (idx >= 0) {
      captureSnapshot(tab);
      annotations.splice(idx, 1);
      state.selectedAnnotationId = null;
      state.editingAnnotationId = null;
      syncPropertyInputs();
      renderAnnotations();
      scheduleAutoSave();
    }
    setStatus("Élément coupé");
    return;
  }
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === "v") {
    if (!state.clipboard) return;
    event.preventDefault();
    pasteClipboardIntoActivePage();
    setStatus("Élément collé");
    return;
  }

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
  },
  true
);

window.addEventListener("resize", () => {
  // En plein écran / redimensionnement, recalculer le rendu PDF pour éviter
  // les marges “figées” (canvas basé sur l'ancienne largeur).
  if (window.__maniPdfResizeDebounce) clearTimeout(window.__maniPdfResizeDebounce);
  window.__maniPdfResizeDebounce = setTimeout(() => {
    if (!getActiveTab()) return;
    updateViewer();
  }, 120);
});
window.addEventListener("blur", () => {
  if (activePointerCleanup) activePointerCleanup();
});

window.addEventListener(
  "wheel",
  (event) => {
    if (!event.ctrlKey) return;
    // Limiter au viewer pour éviter de casser le scroll ailleurs
    const inViewer = event.target?.closest?.(".viewer");
    if (!inViewer) return;
    event.preventDefault();
    zoomByWheelDelta(event.deltaY);
  },
  { passive: false }
);

function insertTextAtCaret(text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function trySetCaretFromPoint(container, clientX, clientY) {
  if (!container) return false;
  try {
    // Standard moderne
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (!pos) return false;
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    }
  } catch {}
  return false;
}

function attachDropOverlayListeners(node) {
  if (!node || !node.addEventListener) return;
  if (node.dataset?.dndAttached === "1") return;
  if (!annotationLayer) return;
  node.dataset.dndAttached = "1";

  const allowDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  const overlayAllow = (event) => {
    allowDrop(event);
    const active = Boolean(state.editingAnnotationId);
    if (!active) return;
  };

  node.addEventListener("dragenter", overlayAllow, true);
  node.addEventListener("dragover", overlayAllow, true);
  node.addEventListener(
    "drop",
    (event) => {
      allowDrop(event);
      const textPlain = event.dataTransfer?.getData("text/plain") || "";
      const text = textPlain.trim();

      if (!state.editingAnnotationId) return;
      const editingNode = annotationLayer.querySelector?.(`[data-id="${state.editingAnnotationId}"]`);
      if (!editingNode) return;
      editingNode.focus();
      trySetCaretFromPoint(editingNode, event.clientX, event.clientY);
      if (text) insertTextAtCaret(text);
    },
    true
  );
}

function setupDragAndDrop() {
  try {
  // Important sous Electron: sans preventDefault, certains drops (fichiers)
  // peuvent être refusés ou provoquer un comportement par défaut indésirable.
  const allowDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  let dragDepth = 0;

  // IMPORTANT: on attache aussi en capture=true car certains plugins/embeds
  // peuvent interrompre la propagation en bubbling.
  document.addEventListener(
    "dragenter",
    (event) => {
      dragDepth += 1;
      allowDrop(event);
      if (dragDepth === 1) {
        document.body.classList.add("dnd-active");
      }
    },
    true
  );
  document.addEventListener(
    "dragover",
    (event) => {
      allowDrop(event);
    },
    true
  );
  document.addEventListener(
    "dragleave",
    (event) => {
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        document.body.classList.remove("dnd-active");
      }
    },
    true
  );
  document.addEventListener(
    "drop",
    (event) => {
      allowDrop(event);
      dragDepth = 0;
      document.body.classList.remove("dnd-active");
    },
    true
  );

  // PDF rendu en canvas => plus besoin d'attacher des listeners spécifiques au viewer.
  } catch {
    /* ignore */
  }
}

applyLanguage();
syncFullscreenFromMain().catch(() => {});
updateZoomUI();
updateWelcomeVisibility();
if (!window.maniPdfApi?.isE2E?.()) {
  loadSession();
} else {
  // En E2E, on évite la restauration de session (flaky) pour des tests stables.
  state.tabs = [];
  state.activeTabId = null;
  updateWelcomeVisibility();
}
refreshJobs();
refreshSensitiveActions();
refreshPythonHealth();
setupDragAndDrop();
setInterval(refreshJobs, 1000);
setInterval(refreshSensitiveActions, 2000);

// E2E helpers (best-effort, sans dépendance au main process)
try {
  window.__maniE2E = window.__maniE2E || {};
  window.__maniE2E.resetUiState = () => {
    try {
      state.tabs = [];
      state.activeTabId = null;
      state.selectedAnnotationId = null;
      state.editingAnnotationId = null;
      cancelPointerInteraction();
      if (pagesContainer) pagesContainer.innerHTML = "";
      renderTabs();
      updateViewer();
      updateWelcomeVisibility();
      syncPropertyInputs();
      setStatus("Pret");
      return true;
    } catch {
      return false;
    }
  };
  window.__maniE2E.getUiState = () => {
    try {
      const tab = getActiveTab();
      const page = String(tab?.currentPage || 1);
      const annos = tab?.annotationsByPage?.[page] || [];
      return {
        activeTabId: state.activeTabId,
        currentPage: tab?.currentPage || 1,
        selectedAnnotationId: state.selectedAnnotationId,
        editingAnnotationId: state.editingAnnotationId,
        clipboard: state.clipboard,
        annotationsOnCurrentPageCount: annos.length
      };
    } catch {
      return { error: true };
    }
  };
  window.__maniE2E.copySelected = () => {
    try {
      const tab = getActiveTab();
      const item = getSelectedAnnotationFromActivePage(tab);
      if (!tab || !item) return false;
      const copy = cloneForClipboard(item);
      if (!copy) return false;
      state.clipboard = copy;
      return true;
    } catch {
      return false;
    }
  };
  window.__maniE2E.cutSelected = () => {
    try {
      const tab = getActiveTab();
      const annotations = tab ? currentPageAnnotations(tab) : null;
      const item = getSelectedAnnotationFromActivePage(tab);
      if (!tab || !annotations || !item) return false;
      const cut = cloneForClipboard(item);
      if (!cut) return false;
      state.clipboard = cut;
      const idx = annotations.findIndex((a) => a.id === item.id);
      if (idx >= 0) {
        captureSnapshot(tab);
        annotations.splice(idx, 1);
        state.selectedAnnotationId = null;
        state.editingAnnotationId = null;
        syncPropertyInputs();
        renderAnnotations();
        scheduleAutoSave();
      }
      return true;
    } catch {
      return false;
    }
  };
  window.__maniE2E.paste = () => {
    try {
      if (!state.clipboard) return false;
      pasteClipboardIntoActivePage();
      return true;
    } catch {
      return false;
    }
  };
} catch {}
