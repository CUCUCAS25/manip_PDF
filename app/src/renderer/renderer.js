/**
 * Renderer principal — Editify (Electron, pas Node).
 *
 * Architecture:
 * - Un fichier par rôle historique: état UI (`state`), rendu PDF (pdf.js via bridge), calque d'annotations HTML,
 *   file d'attente de jobs PDF via IPC (`maniPdfApi` défini dans preload, pas d'accès fs direct).
 * - Le service Python écoute sur 127.0.0.1:8765; le processus principal relaie les jobs après validation des chemins.
 * - Annotations: rectangles logiques (x,y,w,h) + rotation CSS ; redimensionnement projeté dans le repère local.
 * - Texte enrichi: `sanitizeTextHtml` réduit le risque XSS avant insertion dans le DOM.
 * - Split pages: état local + brouillon `localStorage` ; export uniquement via job `split_groups` validé côté main.
 */
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
const validateTextColorBtn = document.getElementById("validateTextColorBtn");
const propPadding = document.getElementById("propPadding");
const propFontFamily = document.getElementById("propFontFamily");
const propFontSize = document.getElementById("propFontSize");
const applyPropsBtn = document.getElementById("applyPropsBtn");
const applyBgBtn = document.getElementById("applyBgBtn");
const mergeBtn = document.getElementById("mergeBtn");
const splitBtn = document.getElementById("splitBtn");
const splitWorkspaceOverlay = document.getElementById("splitWorkspaceOverlay");
const splitWorkspaceCloseBtn = document.getElementById("splitWorkspaceCloseBtn");
const splitWorkspaceGroups = document.getElementById("splitWorkspaceGroups");
const splitWorkspaceAddGroupBtn = document.getElementById("splitWorkspaceAddGroupBtn");
const splitWorkspaceValidateBtn = document.getElementById("splitWorkspaceValidateBtn");
const toolbarAboutBtn = document.getElementById("toolbarAboutBtn");
const aboutPopover = document.getElementById("aboutPopover");
const aboutCloseBtn = document.getElementById("aboutCloseBtn");
const aboutTitleEl = document.getElementById("aboutTitle");
const aboutCreditsEl = document.getElementById("aboutCredits");
const aboutVersion = document.getElementById("aboutVersion");
const blankCanvasCtxMenu = document.getElementById("blankCanvasCtxMenu");
const blankAddTextBtn = document.getElementById("blankAddTextBtn");
const blankAddShapeBtn = document.getElementById("blankAddShapeBtn");
const blankAddImageBtn = document.getElementById("blankAddImageBtn");
const compressBtn = document.getElementById("compressBtn");
const protectBtn = document.getElementById("protectBtn");
const unprotectBtn = document.getElementById("unprotectBtn");
const fitWidthBtn = document.getElementById("fitWidthBtn");
const fitPageBtn = document.getElementById("fitPageBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomInfo = document.getElementById("zoomInfo");
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

/** @type {{ tabPath: string, pageCount: number, groups: { id: string, name: string, pages: number[] }[], nextGroupId: number, selected: Set<number>, anchorPage: number | null } | null} */
let splitWorkspaceState = null;
let splitAutosaveTimer = null;
/** @type {{ page: number, groupId: string, startX: number, startY: number, dragging: boolean, didDrag: boolean, noDrag: boolean, shift: boolean, ctrl: boolean } | null} */
let splitPointer = null;
let splitDragGhost = null;
/** @type {number[] | null} */
let splitDragPages = null;
let splitDragOffsetX = 44;
let splitDragOffsetY = 56;
let splitDropHoverEl = null;
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
const toolbarAboutMenuItem = document.getElementById("toolbarAboutMenuItem");
const toolbarOpenPdfBtn = document.getElementById("toolbarOpenPdfBtn");
const toolbarSaveAsBtn = document.getElementById("toolbarSaveAsBtn");
const toolbarQuitBtn = document.getElementById("toolbarQuitBtn");
const menuLangLabel = document.getElementById("menuLangLabel");
const menuToolsLabel = document.getElementById("menuToolsLabel");
const menuInfoLabel = document.getElementById("menuInfoLabel");
const thumbsTitle = document.getElementById("thumbsTitle");
const changesTitle = document.getElementById("changesTitle");
const aboutRgpd = document.getElementById("aboutRgpd");
const toolbarCloseBtn = document.getElementById("toolbarCloseBtn");
const appToolbar = document.getElementById("appToolbar");
const toolbarF10Hint = document.getElementById("toolbarF10Hint");
const shapePropsPanel = document.getElementById("shapePropsPanel");
const propShapeFill = document.getElementById("propShapeFill");
const propShapeFillOpacity = document.getElementById("propShapeFillOpacity");
const propShapeStroke = document.getElementById("propShapeStroke");
const propShapeStrokeOpacity = document.getElementById("propShapeStrokeOpacity");
const propShapeStrokeWidth = document.getElementById("propShapeStrokeWidth");
const propShapeBackdrop = document.getElementById("propShapeBackdrop");
const propShapeBackdropOpacity = document.getElementById("propShapeBackdropOpacity");
const validateShapeFillBtn = document.getElementById("validateShapeFillBtn");
const validateShapeStrokeBtn = document.getElementById("validateShapeStrokeBtn");
const validateShapeBackdropBtn = document.getElementById("validateShapeBackdropBtn");

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

function loadPreferredLanguage() {
  try {
    const raw = localStorage.getItem("editify:lang");
    const next = String(raw || "").toLowerCase();
    if (I18N[next]) state.language = next;
  } catch {
    /* ignore */
  }
}
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
    const raw = String(plainTextForAnnotationItem(a) || "").trim();
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
    empty.textContent = t("noAddsDoc");
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
    title.textContent = `${t("pageWord")} ${pageNumber}`;
    const annosCount = (tab.annotationsByPage?.[String(pageNumber)] || []).length;
    const sub = document.createElement("div");
    sub.className = "thumb-sub";
    sub.textContent = annosCount ? `${annosCount} ajout(s)` : t("noAdds");
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

// Capture "position curseur" même sans clic, tant que la souris survole le viewer.
// Objectif: insertion des nouveaux éléments au plus proche du curseur (WYSIWYG).
let lastPointerMoveAt = 0;
document.addEventListener(
  "mousemove",
  (e) => {
    try {
      if (interactionMode) return;
      if (!e.target?.closest?.(".viewer")) return;
      const now = Date.now();
      if (now - lastPointerMoveAt < 40) return; // throttle ~25Hz
      lastPointerMoveAt = now;
      capturePointerInPage(e);
    } catch {}
  },
  true
);

// Clic droit sur zone vierge du canvas => menu "Ajouts rapides".
document.addEventListener(
  "contextmenu",
  (e) => {
    try {
      // Ne pas interférer avec les menus contextuels existants.
      if (e.target?.closest?.("#textAnnotationCtxMenu,#shapeAnnotationCtxMenu,#imageAnnotationCtxMenu,#changesContextMenu")) return;
      showBlankCanvasCtxMenu(e);
    } catch {}
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

// ---------------------------
// Context menu (canvas vierge) : ajouts rapides
// ---------------------------
function hideBlankCanvasCtxMenu() {
  try {
    blankCanvasCtxMenu?.classList?.add?.("hidden");
  } catch {}
}

function showBlankCanvasCtxMenu(event) {
  if (!blankCanvasCtxMenu) return;
  const tab = getActiveTab();
  if (!tab) return;
  // Ne pas ouvrir si clic droit sur une annotation (menus dédiés).
  if (event?.target?.closest?.(".annotation")) return;
  if (!event?.target?.closest?.(".viewer")) return;
  try {
    event.preventDefault();
    event.stopPropagation();
  } catch {}
  // Met à jour la position curseur pour insérer au bon endroit.
  capturePointerInPage(event);
  closeAllFlyoutMenus();
  hideChangesContextMenu();
  hideTextAnnotationCtxMenu();
  hideShapeAnnotationCtxMenu();
  hideImageAnnotationCtxMenu();

  // Positionner le menu à l'écran (clamp pour éviter overflow).
  try {
    const menuW = 240;
    const menuH = 160;
    const margin = 10;
    const x = clamp((event.clientX ?? 0) + 2, margin, window.innerWidth - menuW - margin);
    const y = clamp((event.clientY ?? 0) + 2, margin, window.innerHeight - menuH - margin);
    blankCanvasCtxMenu.style.left = `${x}px`;
    blankCanvasCtxMenu.style.top = `${y}px`;
  } catch {}
  blankCanvasCtxMenu.classList.remove("hidden");
}

// ---------------------------
// À propos (popover)
// ---------------------------
function hideAboutPopover() {
  try {
    aboutPopover?.classList?.add?.("hidden");
  } catch {}
}

function wireAboutExternalLinksOnce() {
  if (!aboutPopover) return;
  if (aboutPopover.dataset.wiredLinks === "1") return;
  aboutPopover.dataset.wiredLinks = "1";
  aboutPopover.addEventListener("click", async (e) => {
    const a = e.target?.closest?.("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (!href) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const r = await window.maniPdfApi?.openExternal?.(href);
      if (!r?.ok) {
        setStatus("Impossible d'ouvrir le lien automatiquement. Copiez/collez l'URL.");
      }
    } catch {
      setStatus("Impossible d'ouvrir le lien automatiquement. Copiez/collez l'URL.");
    }
  });
}

function showAboutPopover() {
  if (!aboutPopover || !toolbarAboutBtn) return;
  try {
    // Version affichée (statique côté renderer).
    if (aboutVersion) aboutVersion.textContent = "v1.0.0";
  } catch {}
  closeAllFlyoutMenus();
  const r = toolbarAboutBtn.getBoundingClientRect();
  const margin = 10;
  const x = clamp(Math.floor(r.left), margin, window.innerWidth - 520 - margin);
  const y = clamp(Math.floor(r.bottom + 8), margin, window.innerHeight - 220 - margin);
  aboutPopover.style.left = `${x}px`;
  aboutPopover.style.top = `${y}px`;
  aboutPopover.classList.remove("hidden");
  wireAboutExternalLinksOnce();
}

function showAboutPopoverNearOptions() {
  if (!aboutPopover || !toolbarOptionsBtn) return;
  try {
    if (aboutVersion) aboutVersion.textContent = "v1.0.0";
  } catch {}
  closeAllFlyoutMenus();
  const r = toolbarOptionsBtn.getBoundingClientRect();
  const margin = 10;
  const x = clamp(Math.floor(r.left), margin, window.innerWidth - 520 - margin);
  const y = clamp(Math.floor(r.bottom + 8), margin, window.innerHeight - 220 - margin);
  aboutPopover.style.left = `${x}px`;
  aboutPopover.style.top = `${y}px`;
  aboutPopover.classList.remove("hidden");
  wireAboutExternalLinksOnce();
}

document.addEventListener(
  "mousedown",
  (e) => {
    if (e.button !== 0) return;
    if (!e.target?.closest?.("#changesContextMenu")) hideChangesContextMenu();
    if (!e.target?.closest?.("#textAnnotationCtxMenu")) hideTextAnnotationCtxMenu();
    if (!e.target?.closest?.("#shapeAnnotationCtxMenu")) hideShapeAnnotationCtxMenu();
    if (!e.target?.closest?.("#imageAnnotationCtxMenu")) hideImageAnnotationCtxMenu();
    if (!e.target?.closest?.("#blankCanvasCtxMenu")) hideBlankCanvasCtxMenu();
    if (!e.target?.closest?.("#aboutPopover") && e.target !== toolbarAboutBtn) hideAboutPopover();
  },
  true
);

// ---------------------------
// Menu contextuel (fenêtre texte sur le PDF)
// ---------------------------
let textAnnotationCtxMenuEl = null;
let textCtxMenuTargetId = null;

function ensureTextAnnotationCtxMenuEl() {
  if (textAnnotationCtxMenuEl) return textAnnotationCtxMenuEl;
  textAnnotationCtxMenuEl = document.getElementById("textAnnotationCtxMenu");
  return textAnnotationCtxMenuEl;
}

function hideTextAnnotationCtxMenu() {
  try {
    ensureTextAnnotationCtxMenuEl()?.classList?.add?.("hidden");
  } catch {}
  textCtxMenuTargetId = null;
}

function syncTextCtxMenuFieldsFromItem(item) {
  const rot = document.getElementById("ctxTextRotation");
  const op = document.getElementById("ctxTextOpacity");
  if (rot) rot.value = String(Math.round(item.rotation || 0));
  if (op) op.value = String(Math.round(item.opacity ?? 100));
  const font = document.getElementById("ctxTextFont");
  const size = document.getElementById("ctxTextSize");
  const col = document.getElementById("ctxTextColor");
  const bg = document.getElementById("ctxTextBg");
  if (font) font.value = item.fontFamily || "Arial";
  if (size) size.value = String(Math.round(item.fontSize ?? 14));
  if (col) col.value = item.textColor || "#111111";
  const bgTr = !item.bgColor;
  if (bg) bg.value = bgTr ? "#ffffff" : item.bgColor;
  document.getElementById("ctxTextBgLabel")?.classList?.toggle?.("is-transparent", bgTr);
}

function applyTextCtxMenuBoxProps() {
  const tab = getActiveTab();
  if (!tab || !textCtxMenuTargetId) return;
  const loc = findAnnotationLocation(tab, textCtxMenuTargetId);
  if (!loc || loc.item.type !== "text") return;
  const item = loc.item;
  captureSnapshot(tab);
  const font = document.getElementById("ctxTextFont");
  const size = document.getElementById("ctxTextSize");
  const col = document.getElementById("ctxTextColor");
  const bg = document.getElementById("ctxTextBg");
  if (font) item.fontFamily = font.value || item.fontFamily;
  if (size) item.fontSize = Math.max(8, Math.min(96, Number(size.value) || 14));
  if (col) item.textColor = col.value || item.textColor;
  const rot = document.getElementById("ctxTextRotation");
  const op = document.getElementById("ctxTextOpacity");
  if (rot) item.rotation = Math.max(0, Math.min(360, Number(rot.value) || 0));
  if (op) item.opacity = Math.max(0, Math.min(100, Number(op.value) || 100));
  if (bg && bg.dataset.ctxTouched === "1") {
    item.bgColor = bg.value ? bg.value : null;
  }
  if (propFontFamily) propFontFamily.value = item.fontFamily || "Arial";
  if (propFontSize) propFontSize.value = String(Math.round(item.fontSize ?? 14));
  if (propTextColor) propTextColor.value = item.textColor || "#111111";
  if (propBgColor) {
    const t = !item.bgColor;
    propBgColor.value = t ? "#ffffff" : item.bgColor;
    propBgColorLabel?.classList?.toggle?.("is-transparent", t);
    propBgColor.dataset.touched = item.bgColor ? "1" : "0";
  }
  renderAnnotations();
  scheduleAutoSave();
}

function openTextAnnotationCtxMenu(event, annotationId) {
  const menu = ensureTextAnnotationCtxMenuEl();
  if (!menu) return;
  const tab = getActiveTab();
  if (!tab) return;
  const loc = findAnnotationLocation(tab, annotationId);
  if (!loc || loc.item.type !== "text") return;
  hideShapeAnnotationCtxMenu();
  hideImageAnnotationCtxMenu();
  textCtxMenuTargetId = annotationId;
  state.selectedAnnotationId = annotationId;
  syncPropertyInputs();
  syncTextCtxMenuFieldsFromItem(loc.item);
  const bgEl = document.getElementById("ctxTextBg");
  if (bgEl) bgEl.dataset.ctxTouched = "0";

  menu.classList.remove("hidden");
  menu.style.minWidth = "260px";
  void menu.offsetWidth;
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = rect.width || 260;
  const h = rect.height || 220;
  let mx = event.clientX;
  let my = event.clientY;
  mx = Math.min(mx, vw - w - 8);
  my = Math.min(my, vh - h - 8);
  menu.style.left = `${Math.max(8, mx)}px`;
  menu.style.top = `${Math.max(8, my)}px`;
}

function ctxMenuExecFormat(cmd) {
  if (!textCtxMenuTargetId || state.editingAnnotationId !== textCtxMenuTargetId) return;
  const host = annotationLayer?.querySelector?.(`[data-id="${textCtxMenuTargetId}"]`);
  const ed = getAnnotationTextEditor(host);
  if (!ed || ed.contentEditable !== "true") return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  if (!ed.contains(sel.anchorNode) || !ed.contains(sel.focusNode)) return;
  ed.focus();
  try {
    document.execCommand(cmd, false, null);
  } catch {}
  const tab = getActiveTab();
  const loc = tab ? findAnnotationLocation(tab, textCtxMenuTargetId) : null;
  if (loc?.item) {
    captureSnapshot(tab);
    syncTextFromEditor(loc.item, ed);
    scheduleAutoSave();
  }
}

let textCtxMenuWired = false;
function wireTextAnnotationCtxMenu() {
  if (textCtxMenuWired) return;
  const menu = ensureTextAnnotationCtxMenuEl();
  const dst = document.getElementById("ctxTextFont");
  if (!menu || !dst || !propFontFamily) return;
  if (!dst.options.length) {
    dst.innerHTML = propFontFamily.innerHTML;
  }
  const size = document.getElementById("ctxTextSize");
  const bg = document.getElementById("ctxTextBg");
  const validateColBtn = document.getElementById("ctxValidateTextColorBtn");
  const validateBgBtn = document.getElementById("ctxValidateTextBgBtn");
  const clearBg = document.getElementById("ctxTextBgClear");
  const bindLive = (id, fn) => {
    const el = document.getElementById(id);
    el?.addEventListener?.("input", fn);
    el?.addEventListener?.("change", fn);
  };
  bindLive("ctxTextRotation", () => applyTextCtxMenuBoxProps());
  bindLive("ctxTextOpacity", () => applyTextCtxMenuBoxProps());
  dst.addEventListener("change", () => applyTextCtxMenuBoxProps());
  size?.addEventListener?.("input", () => applyTextCtxMenuBoxProps());
  validateColBtn?.addEventListener?.("click", () => applyTextCtxMenuBoxProps());
  validateBgBtn?.addEventListener?.("click", () => {
    try {
      if (bg) bg.dataset.ctxTouched = "1";
      document.getElementById("ctxTextBgLabel")?.classList?.remove?.("is-transparent");
    } catch {}
    applyTextCtxMenuBoxProps();
  });
  clearBg?.addEventListener?.("click", () => {
    const tab = getActiveTab();
    if (!tab || !textCtxMenuTargetId) return;
    const loc = findAnnotationLocation(tab, textCtxMenuTargetId);
    if (!loc?.item) return;
    captureSnapshot(tab);
    loc.item.bgColor = null;
    if (bg) {
      bg.value = "#ffffff";
      bg.dataset.ctxTouched = "0";
    }
    document.getElementById("ctxTextBgLabel")?.classList?.add?.("is-transparent");
    if (propBgColor) {
      propBgColor.value = "#ffffff";
      propBgColor.dataset.touched = "0";
      propBgColorLabel?.classList?.add?.("is-transparent");
    }
    renderAnnotations();
    scheduleAutoSave();
  });
  ["ctxTextBold", "ctxTextItalic", "ctxTextUnderline"].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd) ctxMenuExecFormat(cmd);
    });
  });
  textCtxMenuWired = true;
}

// ---------------------------
// Menu contextuel (forme sélectionnée)
// ---------------------------
let shapeAnnotationCtxMenuEl = null;
let shapeCtxMenuTargetId = null;

function ensureShapeAnnotationCtxMenuEl() {
  if (shapeAnnotationCtxMenuEl) return shapeAnnotationCtxMenuEl;
  shapeAnnotationCtxMenuEl = document.getElementById("shapeAnnotationCtxMenu");
  return shapeAnnotationCtxMenuEl;
}

function hideShapeAnnotationCtxMenu() {
  try {
    ensureShapeAnnotationCtxMenuEl()?.classList?.add?.("hidden");
  } catch {}
  shapeCtxMenuTargetId = null;
}

let imageAnnotationCtxMenuEl = null;
let imageCtxMenuTargetId = null;

function ensureImageAnnotationCtxMenuEl() {
  if (!imageAnnotationCtxMenuEl) imageAnnotationCtxMenuEl = document.getElementById("imageAnnotationCtxMenu");
  return imageAnnotationCtxMenuEl;
}

function hideImageAnnotationCtxMenu() {
  try {
    ensureImageAnnotationCtxMenuEl()?.classList?.add?.("hidden");
  } catch {}
  imageCtxMenuTargetId = null;
}

function syncImageCtxMenuFromItem(item) {
  const rot = document.getElementById("ctxImageRotation");
  const op = document.getElementById("ctxImageOpacity");
  if (rot) rot.value = String(Math.round(item.rotation || 0));
  if (op) op.value = String(Math.round(item.opacity ?? 100));
}

function applyImageCtxMenuProps() {
  const tab = getActiveTab();
  if (!tab || !imageCtxMenuTargetId) return;
  const loc = findAnnotationLocation(tab, imageCtxMenuTargetId);
  if (!loc || loc.item.type !== "image") return;
  const item = loc.item;
  captureSnapshot(tab);
  const rot = document.getElementById("ctxImageRotation");
  const op = document.getElementById("ctxImageOpacity");
  if (rot) item.rotation = Math.max(0, Math.min(360, Number(rot.value) || 0));
  if (op) item.opacity = Math.max(0, Math.min(100, Number(op.value) || 100));
  renderAnnotations();
  scheduleAutoSave();
}

function openImageAnnotationCtxMenu(event, annotationId) {
  const menu = ensureImageAnnotationCtxMenuEl();
  if (!menu) return;
  const tab = getActiveTab();
  if (!tab) return;
  const loc = findAnnotationLocation(tab, annotationId);
  if (!loc || loc.item.type !== "image") return;
  hideTextAnnotationCtxMenu();
  hideShapeAnnotationCtxMenu();
  hideChangesContextMenu();
  imageCtxMenuTargetId = annotationId;
  state.selectedAnnotationId = annotationId;
  syncPropertyInputs();
  syncImageCtxMenuFromItem(loc.item);
  menu.classList.remove("hidden");
  menu.style.minWidth = "240px";
  void menu.offsetWidth;
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = rect.width || 240;
  const h = rect.height || 100;
  let mx = event.clientX;
  let my = event.clientY;
  mx = Math.min(mx, vw - w - 8);
  my = Math.min(my, vh - h - 8);
  menu.style.left = `${Math.max(8, mx)}px`;
  menu.style.top = `${Math.max(8, my)}px`;
}

let imageCtxMenuWired = false;
function wireImageAnnotationCtxMenu() {
  if (imageCtxMenuWired) return;
  if (!ensureImageAnnotationCtxMenuEl()) return;
  const bindLive = (id, fn) => {
    const el = document.getElementById(id);
    el?.addEventListener?.("input", fn);
    el?.addEventListener?.("change", fn);
  };
  bindLive("ctxImageRotation", () => applyImageCtxMenuProps());
  bindLive("ctxImageOpacity", () => applyImageCtxMenuProps());
  imageCtxMenuWired = true;
}

function syncShapeCtxMenuFromItem(item) {
  mergeShapeStyleFields(item);
  const rotEl = document.getElementById("ctxShapeRotation");
  const opEl = document.getElementById("ctxShapeOpacity");
  if (rotEl) rotEl.value = String(Math.round(item.rotation || 0));
  if (opEl) opEl.value = String(Math.round(item.opacity ?? 100));
  const fill = document.getElementById("ctxShapeFill");
  const fillOp = document.getElementById("ctxShapeFillOp");
  const stroke = document.getElementById("ctxShapeStroke");
  const strokeOp = document.getElementById("ctxShapeStrokeOp");
  const strokeW = document.getElementById("ctxShapeStrokeW");
  const bd = document.getElementById("ctxShapeBackdrop");
  const bdOp = document.getElementById("ctxShapeBackdropOp");
  if (fill) fill.value = item.fillColor || "#000000";
  if (fillOp) fillOp.value = String(Math.round((Number(item.fillAlpha) ?? 0) * 100));
  if (stroke) stroke.value = item.strokeColor || "#000000";
  if (strokeOp) strokeOp.value = String(Math.round((Number(item.strokeAlpha) ?? 1) * 100));
  if (strokeW) strokeW.value = String(Math.max(0, Math.floor(Number(item.strokeWidth) || 0)));
  const bdTr = !item.backdropColor || (Number(item.backdropAlpha) ?? 0) < 0.001;
  if (bd) bd.value = bdTr ? "#ffffff" : item.backdropColor;
  if (bdOp) bdOp.value = String(Math.round((Number(item.backdropAlpha) ?? 0) * 100));
}

function applyShapeCtxMenuProps() {
  const tab = getActiveTab();
  if (!tab || !shapeCtxMenuTargetId) return;
  const loc = findAnnotationLocation(tab, shapeCtxMenuTargetId);
  if (!loc || !SHAPE_TYPES.has(loc.item.type)) return;
  const item = loc.item;
  captureSnapshot(tab);
  mergeShapeStyleFields(item);

  const prevFill = item.fillColor;
  const prevStroke = item.strokeColor;
  const prevBackdrop = item.backdropColor;

  const fill = document.getElementById("ctxShapeFill");
  const fillOp = document.getElementById("ctxShapeFillOp");
  const stroke = document.getElementById("ctxShapeStroke");
  const strokeOp = document.getElementById("ctxShapeStrokeOp");
  const strokeW = document.getElementById("ctxShapeStrokeW");
  const bd = document.getElementById("ctxShapeBackdrop");
  const bdOp = document.getElementById("ctxShapeBackdropOp");

  if (fill) item.fillColor = fill.value || item.fillColor;
  if (fillOp) {
    let op = clamp(Number(fillOp.value) / 100, 0, 1);
    if (op < 0.001 && item.fillColor !== prevFill) {
      op = defaultShapeFillAlphaAfterClear(item.type);
      fillOp.value = String(Math.round(op * 100));
    }
    item.fillAlpha = op;
  }

  if (stroke) item.strokeColor = stroke.value || item.strokeColor;
  if (strokeOp) {
    let op = clamp(Number(strokeOp.value) / 100, 0, 1);
    if (op < 0.001 && item.strokeColor !== prevStroke) {
      op = 1;
      strokeOp.value = "100";
      if ((Number(item.strokeWidth) || 0) < 1) {
        item.strokeWidth = 2;
        if (strokeW) strokeW.value = "2";
      }
    }
    item.strokeAlpha = op;
  }
  if (strokeW) item.strokeWidth = clamp(Math.floor(Number(strokeW.value) || 0), 0, 24);

  const rotM = document.getElementById("ctxShapeRotation");
  const opM = document.getElementById("ctxShapeOpacity");
  if (rotM) item.rotation = Math.max(0, Math.min(360, Number(rotM.value) || 0));
  if (opM) item.opacity = Math.max(0, Math.min(100, Number(opM.value) || 100));

  if (bd && bd.dataset.ctxTouched === "1") {
    item.backdropColor = bd.value || null;
  }
  if (bdOp) {
    let op = clamp(Number(bdOp.value) / 100, 0, 1);
    const colorPicked =
      bd &&
      bd.dataset.ctxTouched === "1" &&
      item.backdropColor &&
      item.backdropColor !== prevBackdrop;
    if (op < 0.001 && colorPicked) {
      op = 0.3;
      bdOp.value = "30";
    }
    item.backdropAlpha = op;
  }

  if ((Number(item.backdropAlpha) || 0) < 0.001) {
    item.backdropColor = null;
  } else if (!item.backdropColor && bd) {
    item.backdropColor = bd.value || "#ffffff";
  }
  if (propShapeFill) propShapeFill.value = item.fillColor || "#000000";
  if (propShapeFillOpacity) propShapeFillOpacity.value = String(Math.round((Number(item.fillAlpha) ?? 0) * 100));
  if (propShapeStroke) propShapeStroke.value = item.strokeColor || "#000000";
  if (propShapeStrokeOpacity) propShapeStrokeOpacity.value = String(Math.round((Number(item.strokeAlpha) ?? 1) * 100));
  if (propShapeStrokeWidth) propShapeStrokeWidth.value = String(Math.max(0, Math.floor(Number(item.strokeWidth) || 0)));
  if (propShapeBackdrop) propShapeBackdrop.value = !item.backdropColor ? "#ffffff" : item.backdropColor;
  if (propShapeBackdropOpacity) propShapeBackdropOpacity.value = String(Math.round((Number(item.backdropAlpha) ?? 0) * 100));
  renderAnnotations();
  scheduleAutoSave();
}

function openShapeAnnotationCtxMenu(event, annotationId) {
  const menu = ensureShapeAnnotationCtxMenuEl();
  if (!menu) return;
  const tab = getActiveTab();
  if (!tab) return;
  const loc = findAnnotationLocation(tab, annotationId);
  if (!loc || !SHAPE_TYPES.has(loc.item.type)) return;
  hideTextAnnotationCtxMenu();
  hideImageAnnotationCtxMenu();
  hideChangesContextMenu();
  shapeCtxMenuTargetId = annotationId;
  state.selectedAnnotationId = annotationId;
  syncPropertyInputs();
  syncShapeCtxMenuFromItem(loc.item);
  const bd = document.getElementById("ctxShapeBackdrop");
  if (bd) bd.dataset.ctxTouched = "0";

  menu.classList.remove("hidden");
  menu.style.minWidth = "280px";
  void menu.offsetWidth;
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = rect.width || 280;
  const h = rect.height || 320;
  let mx = event.clientX;
  let my = event.clientY;
  mx = Math.min(mx, vw - w - 8);
  my = Math.min(my, vh - h - 8);
  menu.style.left = `${Math.max(8, mx)}px`;
  menu.style.top = `${Math.max(8, my)}px`;
}

let shapeCtxMenuWired = false;
function wireShapeAnnotationCtxMenu() {
  if (shapeCtxMenuWired) return;
  const menu = ensureShapeAnnotationCtxMenuEl();
  if (!menu) return;
  const bindLive = (id, fn) => {
    const el = document.getElementById(id);
    el?.addEventListener?.("input", fn);
    el?.addEventListener?.("change", fn);
  };
  bindLive("ctxShapeFillOp", () => applyShapeCtxMenuProps());
  bindLive("ctxShapeStrokeOp", () => applyShapeCtxMenuProps());
  bindLive("ctxShapeStrokeW", () => applyShapeCtxMenuProps());
  bindLive("ctxShapeRotation", () => applyShapeCtxMenuProps());
  bindLive("ctxShapeOpacity", () => applyShapeCtxMenuProps());
  document.getElementById("ctxValidateShapeFillBtn")?.addEventListener?.("click", () => applyShapeCtxMenuProps());
  document.getElementById("ctxValidateShapeStrokeBtn")?.addEventListener?.("click", () => applyShapeCtxMenuProps());
  const bd = document.getElementById("ctxShapeBackdrop");
  document.getElementById("ctxValidateShapeBackdropBtn")?.addEventListener?.("click", () => {
    try {
      if (bd) bd.dataset.ctxTouched = "1";
    } catch {}
    applyShapeCtxMenuProps();
  });
  bindLive("ctxShapeBackdropOp", () => applyShapeCtxMenuProps());

  document.getElementById("ctxShapeFillClear")?.addEventListener?.("click", () => {
    const tab = getActiveTab();
    if (!tab || !shapeCtxMenuTargetId) return;
    const loc = findAnnotationLocation(tab, shapeCtxMenuTargetId);
    if (!loc?.item || !SHAPE_TYPES.has(loc.item.type)) return;
    captureSnapshot(tab);
    loc.item.fillAlpha = 0;
    syncShapeCtxMenuFromItem(loc.item);
    syncPropertyInputs();
    renderAnnotations();
    scheduleAutoSave();
  });
  document.getElementById("ctxShapeStrokeClear")?.addEventListener?.("click", () => {
    const tab = getActiveTab();
    if (!tab || !shapeCtxMenuTargetId) return;
    const loc = findAnnotationLocation(tab, shapeCtxMenuTargetId);
    if (!loc?.item || !SHAPE_TYPES.has(loc.item.type)) return;
    captureSnapshot(tab);
    loc.item.strokeAlpha = 0;
    syncShapeCtxMenuFromItem(loc.item);
    syncPropertyInputs();
    renderAnnotations();
    scheduleAutoSave();
  });
  document.getElementById("ctxShapeBackdropClear")?.addEventListener?.("click", () => {
    const tab = getActiveTab();
    if (!tab || !shapeCtxMenuTargetId) return;
    const loc = findAnnotationLocation(tab, shapeCtxMenuTargetId);
    if (!loc?.item || !SHAPE_TYPES.has(loc.item.type)) return;
    captureSnapshot(tab);
    loc.item.backdropColor = null;
    loc.item.backdropAlpha = 0;
    if (bd) {
      bd.value = "#ffffff";
      bd.dataset.ctxTouched = "0";
    }
    syncShapeCtxMenuFromItem(loc.item);
    syncPropertyInputs();
    renderAnnotations();
    scheduleAutoSave();
  });
  shapeCtxMenuWired = true;
}

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
  const text = plainTextForAnnotationItem(item);
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
  const text = plainTextForAnnotationItem(item);
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
      const ed = getAnnotationTextEditor(node);
      if (ed) {
        ed.style.height = "auto";
        ed.style.minHeight = "1.2em";
        ed.style.height = `${Math.ceil(ed.scrollHeight)}px`;
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
  fr: {
    appName: "Editify",
    welcomeTitle: "Bienvenue dans Editify",
    language: "🌐 Langue: FR",
    open: "📂 Ouvrir PDF",
    addText: "🔤 + Texte",
    addShape: "🔷 + Forme",
    addImage: "🖼️ + Image",
    del: "🗑️ Supprimer",
    undo: "↶ Annuler",
    redo: "↷ Rétablir",
    merge: "🧩 Fusion",
    split: "✂️ Diviser",
    compress: "🗜️ Compression",
    protect: "🔒 Protéger",
    unprotect: "🔓 Déprotéger",
    fileMenu: "Fichier ▾",
    optionsMenu: "Options ▾",
    menuLang: "Langue",
    menuTools: "Outils PDF",
    menuInfo: "Infos",
    openPdf: "📂 Ouvrir PDF",
    saveAs: "💾 Enregistrer sous…",
    quit: "✕ Quitter",
    about: "❔ À propos",
    thumbs: "Miniatures",
    changes: "Ajouts",
    pageWord: "Page",
    noAdds: "Aucun ajout",
    noAddsDoc: "Aucun ajout sur ce document.",
    jobsNone: "Aucun job.",
    sensitiveNone: "Aucune action sensible.",
    aboutTitle: "À propos",
    aboutCreditsHtml:
      'Créé par <strong>Rafael VALENTE ABRANTES</strong> (<a href="https://www.linkedin.com/in/rafael-v-7845423ba/" rel="noreferrer">LinkedIn</a>) et <strong>Matthias DE FORNI</strong> (<a href="https://www.linkedin.com/in/matthias-de-forni-a5450931/" rel="noreferrer">LinkedIn</a>) dans le cadre du stage de Rafael.',
    rgpdHtml: "<strong>RGPD</strong> : l’application est <strong>100% locale</strong> — aucune donnée ne quitte le poste de l’utilisateur (pas d’envoi vers un serveur).",
    prevPage: "◀ Page -",
    nextPage: "Page + ▶",
    cancel: "Annuler",
    retry: "Relancer",
    width: "Largeur",
    height: "Hauteur",
    rotation: "Rotation",
    opacity: "Opacite (%)",
    txt: "Txt",
    bg: "Fond",
    pad: "Marges",
    font: "Police",
    size: "Taille",
    apply: "✅ Appliquer",
    validate: "✅ Valider",
    fitW: "↔️ Ajuster largeur",
    fitP: "🗐 Ajuster page",
    noPdf: "Aucun PDF",
    ready: "Pret",
    choose: "Choisir la langue:\n1. Francais\n2. English\n3. Espanol\n4. Portugues",
    f10Toolbar: "Appelez la barre de menu avec F10 (afficher / masquer).",
    shapeFill: "Remplissage",
    shapeFillOp: "Opacite remplissage (%)",
    shapeStroke: "Contour",
    shapeStrokeOp: "Opacite contour (%)",
    shapeStrokeW: "Epaisseur contour (px)",
    shapeBackdrop: "Fond derriere la forme",
    shapeBackdropOp: "Opacite fond (%)"
  },
  en: {
    menuLang: "Language",
    menuTools: "PDF tools",
    menuInfo: "Info",
    openPdf: "📂 Open PDF",
    saveAs: "💾 Save as…",
    quit: "✕ Quit",
    about: "❔ About",
    thumbs: "Thumbnails",
    changes: "Changes",
    pageWord: "Page",
    noAdds: "No adds",
    noAddsDoc: "No adds on this document.",
    jobsNone: "No jobs.",
    sensitiveNone: "No sensitive actions.",
    aboutTitle: "About",
    aboutCreditsHtml:
      'Created by <strong>Rafael VALENTE ABRANTES</strong> (<a href="https://www.linkedin.com/in/rafael-v-7845423ba/" rel="noreferrer">LinkedIn</a>) and <strong>Matthias DE FORNI</strong> (<a href="https://www.linkedin.com/in/matthias-de-forni-a5450931/" rel="noreferrer">LinkedIn</a>) as part of Rafael’s internship.',
    rgpdHtml: "<strong>GDPR</strong>: the app is <strong>100% local</strong> — no data leaves the user's device (no server upload).",
    prevPage: "◀ Page -",
    nextPage: "Page + ▶",
    cancel: "Cancel",
    retry: "Retry",
    appName: "Editify",
    welcomeTitle: "Welcome to Editify",
    language: "🌐 Language: EN",
    open: "📂 Open PDF",
    addText: "🔤 + Text",
    addShape: "🔷 + Shape",
    addImage: "🖼️ + Image",
    del: "🗑️ Delete",
    undo: "↶ Undo",
    redo: "↷ Redo",
    merge: "🧩 Merge",
    split: "✂️ Split",
    compress: "🗜️ Compress",
    protect: "🔒 Protect",
    unprotect: "🔓 Unprotect",
    fileMenu: "File ▾",
    optionsMenu: "Options ▾",
    width: "Width",
    height: "Height",
    rotation: "Rotation",
    opacity: "Opacity (%)",
    txt: "Text",
    bg: "Background",
    pad: "Padding",
    font: "Font",
    size: "Size",
    apply: "✅ Apply",
    validate: "✅ Apply",
    fitW: "↔️ Fit width",
    fitP: "🗐 Fit page",
    noPdf: "No PDF",
    ready: "Ready",
    choose: "Choose language:\n1. Francais\n2. English\n3. Espanol\n4. Portugues",
    f10Toolbar: "Press F10 to show or hide the menu toolbar.",
    shapeFill: "Fill",
    shapeFillOp: "Fill opacity (%)",
    shapeStroke: "Outline",
    shapeStrokeOp: "Outline opacity (%)",
    shapeStrokeW: "Outline width (px)",
    shapeBackdrop: "Backdrop behind shape",
    shapeBackdropOp: "Backdrop opacity (%)"
  },
  es: {
    menuLang: "Idioma",
    menuTools: "Herramientas PDF",
    menuInfo: "Info",
    openPdf: "📂 Abrir PDF",
    saveAs: "💾 Guardar como…",
    quit: "✕ Salir",
    about: "❔ Acerca de",
    thumbs: "Miniaturas",
    changes: "Cambios",
    pageWord: "Página",
    noAdds: "Sin añadidos",
    noAddsDoc: "Sin añadidos en este documento.",
    jobsNone: "Sin trabajos.",
    sensitiveNone: "Sin acciones sensibles.",
    aboutTitle: "Acerca de",
    aboutCreditsHtml:
      'Creado por <strong>Rafael VALENTE ABRANTES</strong> (<a href="https://www.linkedin.com/in/rafael-v-7845423ba/" rel="noreferrer">LinkedIn</a>) y <strong>Matthias DE FORNI</strong> (<a href="https://www.linkedin.com/in/matthias-de-forni-a5450931/" rel="noreferrer">LinkedIn</a>) en el marco de la práctica de Rafael.',
    rgpdHtml: "<strong>RGPD</strong>: la aplicación es <strong>100% local</strong> — ningún dato sale del dispositivo del usuario (sin envío a un servidor).",
    prevPage: "◀ Página -",
    nextPage: "Página + ▶",
    cancel: "Cancelar",
    retry: "Reintentar",
    appName: "Editify",
    welcomeTitle: "Bienvenido a Editify",
    language: "🌐 Idioma: ES",
    open: "📂 Abrir PDF",
    addText: "🔤 + Texto",
    addShape: "🔷 + Forma",
    addImage: "🖼️ + Imagen",
    del: "🗑️ Borrar",
    undo: "↶ Deshacer",
    redo: "↷ Rehacer",
    merge: "🧩 Unir",
    split: "✂️ Dividir",
    compress: "🗜️ Comprimir",
    protect: "🔒 Proteger",
    unprotect: "🔓 Desproteger",
    fileMenu: "Archivo ▾",
    optionsMenu: "Opciones ▾",
    width: "Ancho",
    height: "Alto",
    rotation: "Rotación",
    opacity: "Opacidad (%)",
    txt: "Texto",
    bg: "Fondo",
    pad: "Margen",
    font: "Fuente",
    size: "Tamaño",
    apply: "✅ Aplicar",
    validate: "✅ Aplicar",
    fitW: "↔️ Ajustar ancho",
    fitP: "🗐 Ajustar página",
    noPdf: "Sin PDF",
    ready: "Listo",
    choose: "Elige idioma:\n1. Francais\n2. English\n3. Espanol\n4. Portugues",
    f10Toolbar: "Pulse F10 para mostrar u ocultar la barra de menú.",
    shapeFill: "Relleno",
    shapeFillOp: "Opacidad relleno (%)",
    shapeStroke: "Borde",
    shapeStrokeOp: "Opacidad borde (%)",
    shapeStrokeW: "Grosor borde (px)",
    shapeBackdrop: "Fondo detrás de la forma",
    shapeBackdropOp: "Opacidad fondo (%)"
  },
  pt: {
    menuLang: "Idioma",
    menuTools: "Ferramentas PDF",
    menuInfo: "Info",
    openPdf: "📂 Abrir PDF",
    saveAs: "💾 Salvar como…",
    quit: "✕ Sair",
    about: "❔ Sobre",
    thumbs: "Miniaturas",
    changes: "Alterações",
    pageWord: "Página",
    noAdds: "Sem adições",
    noAddsDoc: "Sem adições neste documento.",
    jobsNone: "Sem jobs.",
    sensitiveNone: "Sem ações sensíveis.",
    aboutTitle: "Sobre",
    aboutCreditsHtml:
      'Criado por <strong>Rafael VALENTE ABRANTES</strong> (<a href="https://www.linkedin.com/in/rafael-v-7845423ba/" rel="noreferrer">LinkedIn</a>) e <strong>Matthias DE FORNI</strong> (<a href="https://www.linkedin.com/in/matthias-de-forni-a5450931/" rel="noreferrer">LinkedIn</a>) no âmbito do estágio do Rafael.',
    rgpdHtml: "<strong>RGPD</strong>: o aplicativo é <strong>100% local</strong> — nenhum dado sai do computador do usuário (sem envio para servidor).",
    prevPage: "◀ Página -",
    nextPage: "Página + ▶",
    cancel: "Cancelar",
    retry: "Tentar novamente",
    appName: "Editify",
    welcomeTitle: "Bem-vindo ao Editify",
    language: "🌐 Idioma: PT",
    open: "📂 Abrir PDF",
    addText: "🔤 + Texto",
    addShape: "🔷 + Forma",
    addImage: "🖼️ + Imagem",
    del: "🗑️ Excluir",
    undo: "↶ Desfazer",
    redo: "↷ Refazer",
    merge: "🧩 Mesclar",
    split: "✂️ Dividir",
    compress: "🗜️ Comprimir",
    protect: "🔒 Proteger",
    unprotect: "🔓 Desproteger",
    fileMenu: "Arquivo ▾",
    optionsMenu: "Opções ▾",
    width: "Largura",
    height: "Altura",
    rotation: "Rotação",
    opacity: "Opacidade (%)",
    txt: "Texto",
    bg: "Fundo",
    pad: "Margem",
    font: "Fonte",
    size: "Tamanho",
    apply: "✅ Aplicar",
    validate: "✅ Aplicar",
    fitW: "↔️ Ajustar largura",
    fitP: "🗐 Ajustar página",
    noPdf: "Nenhum PDF",
    ready: "Pronto",
    choose: "Escolha o idioma:\n1. Francais\n2. English\n3. Espanol\n4. Portugues",
    f10Toolbar: "Pressione F10 para mostrar ou ocultar a barra de menu.",
    shapeFill: "Preenchimento",
    shapeFillOp: "Opacidade preenchimento (%)",
    shapeStroke: "Contorno",
    shapeStrokeOp: "Opacidade contorno (%)",
    shapeStrokeW: "Espessura contorno (px)",
    shapeBackdrop: "Fundo atrás da forma",
    shapeBackdropOp: "Opacidade fundo (%)"
  }
};

const SHAPE_TYPES = new Set([
  "rect",
  "ellipse",
  "triangle",
  "line",
  "diamond",
  "pentagon",
  "hexagon",
  "octagon",
  "star",
  "arrow",
  "heart",
  "cross",
  "parallelogram",
  "trapezoid"
]);

/** Points polygone (viewBox 0 0 100 100), alignés sur SHAPE_PCT / clip-path CSS (export PDF). */
const SHAPE_POLYGON_POINTS = {
  triangle: "50,0 0,100 100,100",
  diamond: "50,0 100,50 50,100 0,50",
  pentagon: "50,0 95,35 78,100 22,100 5,35",
  hexagon: "25,0 75,0 100,50 75,100 25,100 0,50",
  octagon: "30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30",
  star: "50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35",
  arrow: "0,35 70,35 70,15 100,50 70,85 70,65 0,65",
  // Cœur : contour polygonal stable et symétrique (approximation de courbes + "creux" en haut).
  heart: "50,92 62,82 74,70 84,56 90,42 88,30 80,20 68,16 58,20 50,32 42,20 32,16 20,20 12,30 10,42 16,56 26,70 38,82",
  cross: "35,0 65,0 65,35 100,35 100,65 65,65 65,100 35,100 35,65 0,65 0,35 35,35",
  parallelogram: "18,0 100,0 82,100 0,100",
  trapezoid: "18,0 82,0 100,100 0,100"
};

const SHAPE_DEFAULTS = {
  rect: { fillColor: "#007acc", fillAlpha: 0.2, strokeColor: "#007acc", strokeWidth: 0 },
  ellipse: { fillColor: "#ff7800", fillAlpha: 0.2, strokeColor: "#ff7800", strokeWidth: 0 },
  triangle: { fillColor: "#7d53ff", fillAlpha: 0.25, strokeColor: "#7d53ff", strokeWidth: 0 },
  line: { fillColor: "#000000", fillAlpha: 0, strokeColor: "#00a86b", strokeWidth: 3 },
  diamond: { fillColor: "#d10068", fillAlpha: 0.25, strokeColor: "#d10068", strokeWidth: 0 },
  pentagon: { fillColor: "#0077c2", fillAlpha: 0.22, strokeColor: "#0077c2", strokeWidth: 0 },
  hexagon: { fillColor: "#2e8b57", fillAlpha: 0.25, strokeColor: "#2e8b57", strokeWidth: 0 },
  octagon: { fillColor: "#d84315", fillAlpha: 0.22, strokeColor: "#d84315", strokeWidth: 0 },
  star: { fillColor: "#ffd700", fillAlpha: 0.3, strokeColor: "#d4a017", strokeWidth: 0 },
  arrow: { fillColor: "#2196f3", fillAlpha: 0.3, strokeColor: "#1976d2", strokeWidth: 0 },
  heart: { fillColor: "#e91e63", fillAlpha: 0.3, strokeColor: "#c2185b", strokeWidth: 0 },
  cross: { fillColor: "#ffc107", fillAlpha: 0.3, strokeColor: "#ff8f00", strokeWidth: 0 },
  parallelogram: { fillColor: "#7b1fa2", fillAlpha: 0.24, strokeColor: "#7b1fa2", strokeWidth: 0 },
  trapezoid: { fillColor: "#0288d1", fillAlpha: 0.22, strokeColor: "#0288d1", strokeWidth: 0 }
};

function shapeStyleDefaults(type) {
  return SHAPE_DEFAULTS[type] || SHAPE_DEFAULTS.rect;
}

function mergeShapeStyleFields(a) {
  if (!a || !SHAPE_TYPES.has(a.type)) return;
  const d = shapeStyleDefaults(a.type);
  if (a.fillColor == null || a.fillColor === undefined) a.fillColor = d.fillColor;
  if (a.fillAlpha == null || a.fillAlpha === undefined) a.fillAlpha = d.fillAlpha;
  if (a.strokeColor == null || a.strokeColor === undefined) a.strokeColor = d.strokeColor;
  if (a.strokeWidth == null || a.strokeWidth === undefined) a.strokeWidth = d.strokeWidth;
  if (a.strokeAlpha == null || a.strokeAlpha === undefined) a.strokeAlpha = 1;
  if (a.backdropColor === undefined) a.backdropColor = null;
  if (a.backdropAlpha == null || a.backdropAlpha === undefined) a.backdropAlpha = 0;
}

/** Opacité de remplissage par défaut après « transparent » puis nouveau choix de couleur (types avec fillAlpha 0 au défaut, ex. ligne). */
function defaultShapeFillAlphaAfterClear(type) {
  let def = shapeStyleDefaults(type).fillAlpha ?? 0.3;
  if (def < 0.02) def = 0.3;
  return def;
}

function hexToRgba(hex, alpha01) {
  const a = clamp(Number(alpha01) || 0, 0, 1);
  const raw = String(hex || "#000000").replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw.slice(0, 6);
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(0,0,0,${a})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Rendu forme en SVG (contour suivant la géométrie réelle, comme le PDF — plus de clip-path qui masque le border).
 */
function renderShapeVectorDOM(host, a) {
  host.replaceChildren();
  host.style.background = "transparent";
  host.style.border = "none";
  host.style.clipPath = "none";
  host.style.borderRadius = "0";

  const w = Math.max(1, Number(a.w) || 100);
  const h = Math.max(1, Number(a.h) || 100);
  const m = Math.min(w, h);

  const backdrop = document.createElement("div");
  backdrop.className = "shape-backdrop";
  const bdA = clamp(Number(a.backdropAlpha) || 0, 0, 1);
  const bdC = a.backdropColor;
  if (bdA > 0.001 && bdC && String(bdC).trim()) {
    backdrop.style.backgroundColor = hexToRgba(bdC, bdA);
  } else {
    backdrop.style.display = "none";
  }
  host.appendChild(backdrop);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("shape-svg");

  const fa = clamp(Number.isFinite(Number(a.fillAlpha)) ? Number(a.fillAlpha) : 0.3, 0, 1);
  const fillCol = a.fillColor || "#000000";
  const fillPaint = fa < 0.001 ? "none" : hexToRgba(fillCol, fa);

  const swPx = Math.max(0, Number(a.strokeWidth) || 0);
  const strokeA = clamp(Number.isFinite(Number(a.strokeAlpha)) ? Number(a.strokeAlpha) : 1, 0, 1);
  const strokeCol = a.strokeColor || "#333333";
  const strokePaint = swPx < 0.001 || strokeA < 0.001 ? "none" : hexToRgba(strokeCol, strokeA);
  const swVb = m > 0 ? (swPx / m) * 100 : 0;

  const setStrokeAttrs = (el) => {
    if (strokePaint === "none") {
      el.setAttribute("stroke", "none");
      el.setAttribute("stroke-width", "0");
    } else {
      el.setAttribute("stroke", strokePaint);
      el.setAttribute("stroke-width", String(Math.max(0.01, swVb)));
      el.setAttribute("stroke-linejoin", "round");
      el.setAttribute("stroke-linecap", "round");
    }
  };

  if (a.type === "line") {
    const swLine = Math.max(0, Number(a.strokeWidth) || 3);
    const sa = clamp(Number.isFinite(Number(a.strokeAlpha)) ? Number(a.strokeAlpha) : 1, 0, 1);
    const sc = a.strokeColor || "#00a86b";
    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln.setAttribute("x1", "0");
    ln.setAttribute("y1", "12");
    ln.setAttribute("x2", "100");
    ln.setAttribute("y2", "12");
    const swLineVb = m > 0 ? (swLine / m) * 100 : 1;
    if (sa < 0.001) {
      ln.setAttribute("stroke", "none");
      ln.setAttribute("stroke-width", "0");
    } else {
      ln.setAttribute("stroke", hexToRgba(sc, sa));
      ln.setAttribute("stroke-width", String(Math.max(0.05, swLineVb)));
      ln.setAttribute("stroke-linecap", "square");
    }
    svg.appendChild(ln);
  } else if (a.type === "rect") {
    const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("x", "0");
    r.setAttribute("y", "0");
    r.setAttribute("width", "100");
    r.setAttribute("height", "100");
    r.setAttribute("fill", fillPaint);
    setStrokeAttrs(r);
    svg.appendChild(r);
  } else if (a.type === "ellipse") {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    el.setAttribute("cx", "50");
    el.setAttribute("cy", "50");
    el.setAttribute("rx", "50");
    el.setAttribute("ry", "50");
    el.setAttribute("fill", fillPaint);
    setStrokeAttrs(el);
    svg.appendChild(el);
  } else {
    const pts = SHAPE_POLYGON_POINTS[a.type];
    if (pts) {
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("points", pts);
      poly.setAttribute("fill", fillPaint);
      setStrokeAttrs(poly);
      svg.appendChild(poly);
    }
  }

  host.appendChild(svg);
}

function stripTagsForPlain(html) {
  return String(html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function plainTextForAnnotationItem(item) {
  if (!item || item.type !== "text") return "";
  if (item.text != null && String(item.text).length > 0) return String(item.text);
  if (item.textHtml) return stripTagsForPlain(item.textHtml);
  return "";
}

/** Réduit le XSS sur le HTML produit par contentEditable (pas un sanitizer complet type DOMPurify). */
function sanitizeTextHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = String(html || "");
  div.querySelectorAll("script,style,iframe,object,embed,link").forEach((el) => el.remove());
  div.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes || [])) {
      const n = attr.name || "";
      if (n.toLowerCase().startsWith("on")) el.removeAttribute(n);
    }
  });
  return div.innerHTML;
}

function syncTextFromEditor(a, editorEl) {
  if (!a || !editorEl) return;
  a.textHtml = sanitizeTextHtml(editorEl.innerHTML);
  a.text = editorEl.innerText || "";
}

function getAnnotationTextEditor(root) {
  return root?.querySelector?.(".text-editor");
}

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
  undoBtn.textContent = t("undo");
  redoBtn.textContent = t("redo");
  fitWidthBtn.textContent = t("fitW");
  fitPageBtn.textContent = t("fitP");
  applyPropsBtn.textContent = t("apply");
  if (validateTextColorBtn) validateTextColorBtn.textContent = t("validate");
  if (applyBgBtn) applyBgBtn.textContent = t("validate");
  if (validateShapeFillBtn) validateShapeFillBtn.textContent = t("validate");
  if (validateShapeStrokeBtn) validateShapeStrokeBtn.textContent = t("validate");
  if (validateShapeBackdropBtn) validateShapeBackdropBtn.textContent = t("validate");
  if (toolbarFileBtn) toolbarFileBtn.textContent = t("fileMenu");
  if (toolbarOptionsBtn) toolbarOptionsBtn.textContent = t("optionsMenu");
  if (menuLangLabel) menuLangLabel.textContent = t("menuLang");
  if (menuToolsLabel) menuToolsLabel.textContent = t("menuTools");
  if (menuInfoLabel) menuInfoLabel.textContent = t("menuInfo");
  if (toolbarOpenPdfBtn) toolbarOpenPdfBtn.textContent = t("openPdf");
  if (toolbarSaveAsBtn) toolbarSaveAsBtn.textContent = t("saveAs");
  if (toolbarQuitBtn) toolbarQuitBtn.textContent = t("quit");
  if (toolbarAboutMenuItem) toolbarAboutMenuItem.textContent = t("about");
  if (thumbsTitle) thumbsTitle.textContent = t("thumbs");
  if (changesTitle) changesTitle.textContent = t("changes");
  if (prevBtn) prevBtn.textContent = t("prevPage");
  if (nextBtn) nextBtn.textContent = t("nextPage");
  try {
    if (aboutRgpd) aboutRgpd.innerHTML = t("rgpdHtml");
  } catch {}
  try {
    if (aboutTitleEl) aboutTitleEl.textContent = t("aboutTitle");
    if (aboutCreditsEl) aboutCreditsEl.innerHTML = t("aboutCreditsHtml");
  } catch {}
  // Menu "Outils PDF" (barre Options).
  try {
    if (mergeBtn) mergeBtn.textContent = t("merge");
    if (splitBtn) splitBtn.textContent = t("split");
    if (compressBtn) compressBtn.textContent = t("compress");
    if (protectBtn) protectBtn.textContent = t("protect");
    if (unprotectBtn) unprotectBtn.textContent = t("unprotect");
  } catch {}
  // Nom produit / écran d'accueil.
  try {
    document.title = t("appName");
    const at = document.getElementById("appTitle");
    if (at) at.textContent = t("appName");
    const wt = document.getElementById("welcomeTitle");
    if (wt) wt.textContent = t("welcomeTitle");
  } catch {}
  setLabelPrefix("propWidth", t("width"));
  setLabelPrefix("propHeight", t("height"));
  setLabelPrefix("propRotation", t("rotation"));
  setLabelPrefix("propOpacity", t("opacity"));
  setLabelPrefix("propTextColor", t("txt"));
  setLabelPrefix("propBgColor", t("bg"));
  setLabelPrefix("propPadding", t("pad"));
  setLabelPrefix("propFontFamily", t("font"));
  setLabelPrefix("propFontSize", t("size"));
  const sfl = document.getElementById("shapeFillLabel");
  const sfol = document.getElementById("shapeFillOpLabel");
  const ssl = document.getElementById("shapeStrokeLabel");
  const ssol = document.getElementById("shapeStrokeOpLabel");
  const sswl = document.getElementById("shapeStrokeWLabel");
  const sbd = document.getElementById("shapeBackdropLabel");
  const sbdol = document.getElementById("shapeBackdropOpLabel");
  if (sfl) sfl.textContent = t("shapeFill");
  if (sfol) sfol.textContent = t("shapeFillOp");
  if (ssl) ssl.textContent = t("shapeStroke");
  if (ssol) ssol.textContent = t("shapeStrokeOp");
  if (sswl) sswl.textContent = t("shapeStrokeW");
  if (sbd) sbd.textContent = t("shapeBackdrop");
  if (sbdol) sbdol.textContent = t("shapeBackdropOp");
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
  try {
    localStorage.setItem("editify:lang", next);
  } catch {
    /* ignore */
  }
  applyLanguage();
  applySpellcheckLanguageBestEffort();
  setStatus(t("ready"));
}

function getSpellcheckBcp47FromUiLang(uiLang) {
  const l = String(uiLang || "fr").toLowerCase();
  if (l === "fr") return "fr-FR";
  if (l === "en") return "en-US";
  if (l === "es") return "es-ES";
  if (l === "pt") return "pt-PT";
  return "fr-FR";
}

function applySpellcheckLanguageBestEffort() {
  const bcp47 = getSpellcheckBcp47FromUiLang(state.language);
  try {
    document.documentElement.lang = bcp47;
  } catch {}

  // Applique immédiatement aux éditeurs de texte ouverts (édition en cours).
  try {
    const editors = document.querySelectorAll("#annotationLayer .text-editor");
    editors.forEach((ed) => {
      try {
        ed.spellcheck = true;
        ed.setAttribute("lang", bcp47);
      } catch {}
    });
  } catch {}

  // Active le dictionnaire côté Electron (si supporté).
  try {
    window.maniPdfApi?.setSpellcheckLanguages?.([bcp47]);
  } catch {
    /* ignore */
  }
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
    autosaveDebounce = null;
    saveSession().catch(() => {});
  }, 600);
}

function cloneForSession(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

async function saveSession() {
  try {
    if (window.maniPdfApi?.isE2E?.()) return;
    const tabsPayload = state.tabs.map((t) => ({
      id: t.id,
      name: t.name,
      path: t.path,
      currentPage: t.currentPage || 1,
      annotationsByPage: cloneForSession(t.annotationsByPage || {}),
      viewportByPage: cloneForSession(t.viewportByPage || {}),
      undoStack: Array.isArray(t.undoStack) ? cloneForSession(t.undoStack) : [],
      redoStack: Array.isArray(t.redoStack) ? cloneForSession(t.redoStack) : []
    }));
    await window.maniPdfApi.saveSession({
      tabs: tabsPayload,
      activeTabId: state.activeTabId
    });
  } catch {
    /* ignore */
  }
}

async function loadSession() {
  try {
    if (window.maniPdfApi?.isE2E?.()) return;
    const r = await window.maniPdfApi.loadSession();
    if (!r?.ok || !r.data?.tabs?.length) return;
    const restored = [];
    for (const row of r.data.tabs) {
      if (!row?.path) continue;
      const open = await window.maniPdfApi.openPdf(row.path);
      if (!open.ok) continue;
      restored.push({
        id: row.id || `${Date.now()}-${Math.random()}`,
        name: row.name || "document.pdf",
        path: open.path,
        currentPage: Math.max(1, row.currentPage || 1),
        annotationsByPage:
          row.annotationsByPage && typeof row.annotationsByPage === "object" ? row.annotationsByPage : {},
        viewportByPage: row.viewportByPage && typeof row.viewportByPage === "object" ? row.viewportByPage : {},
        undoStack: Array.isArray(row.undoStack) ? row.undoStack : [],
        redoStack: Array.isArray(row.redoStack) ? row.redoStack : []
      });
    }
    if (!restored.length) return;
    state.tabs = restored;
    state.activeTabId = restored.some((t) => t.id === r.data.activeTabId)
      ? r.data.activeTabId
      : restored[0].id;
    state.selectedAnnotationId = null;
    state.editingAnnotationId = null;
    renderTabs();
    updateViewer();
    updateWelcomeVisibility();
    syncPropertyInputs();
    scheduleSidebarUpdate();
    if (r.recovered) setStatus("Session réparée.");
  } catch {
    /* ignore */
  }
}

function renderJobs(jobs) {
  jobsPanel.innerHTML = "";
  if (!jobs?.length) {
    jobsPanel.textContent = t("jobsNone");
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
        cancelBtn.textContent = t("cancel");
        cancelBtn.onclick = async () => {
          await window.maniPdfApi.cancelJob(job.id);
          await refreshJobs();
        };
        row.appendChild(cancelBtn);
      }
      if (job.status === "failed" || job.status === "cancelled") {
        const retryBtn = document.createElement("button");
        retryBtn.textContent = t("retry");
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
    sensitivePanel.textContent = t("sensitiveNone");
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
  pageInfo.textContent = `${t("pageWord")} ${tab.currentPage || 1}`;
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
  pageInfo.textContent = `${t("pageWord")} ${pageNumber}`;

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
  if (token !== activePdfRenderToken) return;
  try {
    setStatus("PDF chargé — Cliquez sur 🔤 + Texte pour annoter");
  } catch {
    /* ignore */
  }
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

/**
 * Enfile un job PDF (validation des chemins dans le main process). Affiche l'erreur utilisateur si refus.
 * @returns {Promise<boolean>} true si le job est accepté
 */
async function enqueuePdfJob(type, payload, successStatus) {
  const r = await window.maniPdfApi.createJob({ type, payload });
  if (!r?.ok) {
    const msg = typeof r?.error === "string" && r.error ? r.error : "Job refuse.";
    setStatus(msg);
    return false;
  }
  setStatus(successStatus);
  await refreshJobs();
  return true;
}

// --- Split par groupes (UI overlay) : état runtime + persistance brouillon locale ---
function splitWorkspaceDraftKey(pdfPath) {
  return `maniSplitDraft:${pdfPath}`;
}

function sanitizeSplitBaseName(name) {
  const s = String(name || "").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return s || "groupe";
}

function createSplitWorkspaceState(tab) {
  const n = Math.max(1, Number(tab.pageCount) || 1);
  const allPages = Array.from({ length: n }, (_, i) => i + 1);
  return {
    tabPath: tab.path,
    pageCount: n,
    groups: [
      { id: "g1", name: "groupe 1", pages: [...allPages] },
      { id: "g2", name: "groupe 2", pages: [] }
    ],
    nextGroupId: 3,
    selected: new Set(),
    anchorPage: null
  };
}

function normalizeSplitState(st, tab) {
  const n = Math.max(1, Number(tab.pageCount) || 1);
  const seen = new Set();
  for (const g of st.groups) {
    g.pages = g.pages.map((p) => Number(p)).filter((p) => Number.isFinite(p) && p >= 1 && p <= n);
    g.pages = g.pages.filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
  }
  const missing = [];
  for (let p = 1; p <= n; p++) {
    if (!seen.has(p)) missing.push(p);
  }
  if (missing.length && st.groups.length) {
    st.groups[0].pages.push(...missing);
    st.groups[0].pages.sort((a, b) => a - b);
  }
}

function loadSplitWorkspaceDraft(tab) {
  try {
    const raw = localStorage.getItem(splitWorkspaceDraftKey(tab.path));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.tabPath !== tab.path) return null;
    const n = Math.max(1, Number(tab.pageCount) || 1);
    if (Number(data.pageCount) !== n) return null;
    const groups = Array.isArray(data.groups)
      ? data.groups.map((g, i) => ({
          id: typeof g.id === "string" ? g.id : `g${i + 1}`,
          name: typeof g.name === "string" ? g.name : `groupe ${i + 1}`,
          pages: Array.isArray(g.pages) ? g.pages.map((p) => Number(p)) : []
        }))
      : [];
    if (groups.length < 2) return null;
    const st = {
      tabPath: tab.path,
      pageCount: n,
      groups,
      nextGroupId: Math.max(3, Number(data.nextGroupId) || 3),
      selected: new Set(),
      anchorPage: null
    };
    normalizeSplitState(st, tab);
    return st;
  } catch {
    return null;
  }
}

function scheduleSplitWorkspaceAutosave() {
  if (!splitWorkspaceState) return;
  try {
    clearTimeout(splitAutosaveTimer);
  } catch {
    /* ignore */
  }
  splitAutosaveTimer = setTimeout(() => {
    try {
      const st = splitWorkspaceState;
      if (!st) return;
      const payload = {
        tabPath: st.tabPath,
        pageCount: st.pageCount,
        groups: st.groups.map((g) => ({
          id: g.id,
          name: g.name,
          pages: [...g.pages]
        })),
        nextGroupId: st.nextGroupId
      };
      localStorage.setItem(splitWorkspaceDraftKey(st.tabPath), JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, 320);
}

function buildSplitThumbCanvas(pageNum) {
  const pageNode = pagesContainer?.querySelector?.(`.pdf-page[data-page="${pageNum}"]`);
  const srcCanvas = pageNode?.querySelector?.("canvas.pdf-canvas");
  if (!srcCanvas) return null;
  const targetW = 88;
  const ratio = srcCanvas.width > 0 ? targetW / srcCanvas.width : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(10, Math.floor(srcCanvas.width * ratio));
  canvas.height = Math.max(10, Math.floor(srcCanvas.height * ratio));
  const ctx = canvas.getContext("2d");
  try {
    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height);
  } catch {
    /* ignore */
  }
  return canvas;
}

function getOrderedPagesFromList(pageNums) {
  const st = splitWorkspaceState;
  if (!st) return [];
  const set = new Set(pageNums);
  const out = [];
  for (const g of st.groups) {
    for (const p of g.pages) {
      if (set.has(p)) out.push(p);
    }
  }
  return out;
}

function getOrderedSelectedPages() {
  return getOrderedPagesFromList([...splitWorkspaceState.selected]);
}

function findGroupContainingPage(page) {
  const st = splitWorkspaceState;
  if (!st) return null;
  return st.groups.find((g) => g.pages.includes(page)) || null;
}

function applySplitShiftRange(groupId, pageA, pageB) {
  const st = splitWorkspaceState;
  const g = st.groups.find((x) => x.id === groupId);
  if (!g) return;
  const ia = g.pages.indexOf(pageA);
  const ib = g.pages.indexOf(pageB);
  if (ia < 0 || ib < 0) return;
  const lo = Math.min(ia, ib);
  const hi = Math.max(ia, ib);
  st.selected.clear();
  for (let i = lo; i <= hi; i++) st.selected.add(g.pages[i]);
}

function handleSplitThumbClick(page, groupId, ev) {
  const st = splitWorkspaceState;
  if (!st) return;
  if (ev.shiftKey) {
    if (st.anchorPage != null) {
      const ag = findGroupContainingPage(st.anchorPage);
      if (ag && ag.id === groupId) {
        applySplitShiftRange(groupId, st.anchorPage, page);
        renderSplitWorkspace();
        scheduleSplitWorkspaceAutosave();
        return;
      }
    }
    st.selected.clear();
    st.selected.add(page);
    st.anchorPage = page;
  } else if (ev.ctrlKey || ev.metaKey) {
    if (st.selected.has(page)) st.selected.delete(page);
    else st.selected.add(page);
    st.anchorPage = page;
  } else {
    st.selected.clear();
    st.selected.add(page);
    st.anchorPage = page;
  }
  renderSplitWorkspace();
  scheduleSplitWorkspaceAutosave();
}

function updateSplitDropHover(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const body = el?.closest?.(".split-group-body");
  if (splitDropHoverEl && splitDropHoverEl !== body) {
    splitDropHoverEl.classList.remove("split-drop-hover");
  }
  if (body) {
    body.classList.add("split-drop-hover");
    splitDropHoverEl = body;
  }
}

function clearSplitDropHover() {
  if (splitDropHoverEl) {
    splitDropHoverEl.classList.remove("split-drop-hover");
    splitDropHoverEl = null;
  }
}

function removeSplitGhost() {
  if (splitDragGhost) {
    try {
      splitDragGhost.remove();
    } catch {
      /* ignore */
    }
    splitDragGhost = null;
  }
  splitDragPages = null;
}

function startSplitDrag(page, _groupId, clientX, clientY) {
  const st = splitWorkspaceState;
  if (!st) return;
  const pages = st.selected.has(page) ? getOrderedSelectedPages() : [page];
  splitDragPages = pages;
  const ordered = getOrderedPagesFromList(pages);
  const ghost = document.createElement("div");
  ghost.className = "split-drag-ghost";
  ghost.setAttribute("aria-hidden", "true");
  const c = buildSplitThumbCanvas(ordered[0]);
  if (c) {
    ghost.appendChild(c);
    splitDragOffsetX = Math.floor(c.width / 2);
    splitDragOffsetY = Math.floor(c.height / 2);
  } else {
    splitDragOffsetX = 44;
    splitDragOffsetY = 56;
  }
  if (ordered.length > 1) {
    const badge = document.createElement("div");
    badge.textContent = String(ordered.length);
    badge.style.cssText =
      "position:absolute;right:4px;top:4px;background:#007acc;color:#fff;border-radius:10px;padding:2px 6px;font-size:11px;font-weight:700;z-index:2;";
    ghost.appendChild(badge);
  }
  document.body.appendChild(ghost);
  splitDragGhost = ghost;
  splitDragGhost.style.left = `${clientX - splitDragOffsetX}px`;
  splitDragGhost.style.top = `${clientY - splitDragOffsetY}px`;
}

function applySplitDrop(ordered, targetGroupId, beforePage) {
  const st = splitWorkspaceState;
  if (!st) return;
  const tg = st.groups.find((g) => g.id === targetGroupId);
  if (!tg) return;
  const orig = [...tg.pages];
  let insertPos = orig.length;
  if (beforePage != null && Number.isFinite(Number(beforePage))) {
    const bp = Number(beforePage);
    const ix = orig.indexOf(bp);
    insertPos = ix >= 0 ? ix : orig.length;
  }
  for (const g of st.groups) {
    g.pages = g.pages.filter((p) => !ordered.includes(p));
  }
  const tg2 = st.groups.find((g) => g.id === targetGroupId);
  if (!tg2) return;
  let pos = insertPos;
  for (let i = 0; i < insertPos && i < orig.length; i++) {
    if (ordered.includes(orig[i])) pos -= 1;
  }
  const maxPos = tg2.pages.length;
  pos = Math.max(0, Math.min(maxPos, pos));
  tg2.pages.splice(pos, 0, ...ordered);
}

function finishSplitDrag(clientX, clientY) {
  const st = splitWorkspaceState;
  const ordered = splitDragPages ? getOrderedPagesFromList(splitDragPages) : [];
  if (!st || !ordered.length) return;
  const el = document.elementFromPoint(clientX, clientY);
  const thumb = el?.closest?.(".split-thumb");
  const body = el?.closest?.(".split-group-body");
  let targetGroupId = null;
  let beforePage = null;
  if (thumb) {
    targetGroupId = thumb.dataset.groupId || null;
    beforePage = Number(thumb.dataset.page);
  } else if (body) {
    targetGroupId = body.dataset.groupId || null;
  }
  if (!targetGroupId) return;
  applySplitDrop(ordered, targetGroupId, Number.isFinite(beforePage) ? beforePage : null);
  st.selected.clear();
}

function onSplitThumbPointerDown(ev, page, groupId) {
  if (ev.button !== 0) return;
  const noDrag = Boolean(ev.shiftKey || ev.ctrlKey || ev.metaKey);
  splitPointer = {
    page,
    groupId,
    startX: ev.clientX,
    startY: ev.clientY,
    dragging: false,
    didDrag: false,
    noDrag,
    shift: ev.shiftKey,
    ctrl: ev.ctrlKey || ev.metaKey
  };

  const move = (e) => {
    if (!splitPointer) return;
    const dx = e.clientX - splitPointer.startX;
    const dy = e.clientY - splitPointer.startY;
    if (!splitPointer.noDrag && !splitPointer.dragging && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      splitPointer.dragging = true;
      splitPointer.didDrag = true;
      startSplitDrag(splitPointer.page, splitPointer.groupId, e.clientX, e.clientY);
    }
    if (splitPointer.dragging && splitDragGhost) {
      splitDragGhost.style.left = `${e.clientX - splitDragOffsetX}px`;
      splitDragGhost.style.top = `${e.clientY - splitDragOffsetY}px`;
    }
    updateSplitDropHover(e.clientX, e.clientY);
  };

  const up = (e) => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    if (splitPointer?.dragging) {
      finishSplitDrag(e.clientX, e.clientY);
      renderSplitWorkspace();
      scheduleSplitWorkspaceAutosave();
    } else if (splitPointer && !splitPointer.didDrag) {
      handleSplitThumbClick(page, groupId, {
        shiftKey: splitPointer.shift,
        ctrlKey: splitPointer.ctrl,
        metaKey: splitPointer.ctrl
      });
    }
    splitPointer = null;
    clearSplitDropHover();
    removeSplitGhost();
  };

  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
}

function createSplitThumbEl(page, groupId) {
  const wrap = document.createElement("div");
  wrap.className = "split-thumb";
  if (splitWorkspaceState?.selected.has(page)) wrap.classList.add("split-thumb-selected");
  wrap.dataset.page = String(page);
  wrap.dataset.groupId = groupId;
  const cw = document.createElement("div");
  cw.className = "split-thumb-canvas-wrap";
  const canvas = buildSplitThumbCanvas(page);
  if (canvas) cw.appendChild(canvas);
  else {
    const ph = document.createElement("div");
    ph.textContent = "…";
    ph.style.padding = "24px 8px";
    ph.style.textAlign = "center";
    cw.appendChild(ph);
  }
  const meta = document.createElement("div");
  meta.className = "split-thumb-meta";
  meta.textContent = `p. ${page}`;
  wrap.appendChild(cw);
  wrap.appendChild(meta);
  wrap.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onSplitThumbPointerDown(e, page, groupId);
  });
  return wrap;
}

function renderSplitWorkspace() {
  if (!splitWorkspaceGroups || !splitWorkspaceState) return;
  const st = splitWorkspaceState;
  splitWorkspaceGroups.innerHTML = "";
  for (let gi = 0; gi < st.groups.length; gi += 1) {
    const g = st.groups[gi];
    const section = document.createElement("section");
    section.className = "split-group";
    section.dataset.groupId = g.id;
    const header = document.createElement("div");
    header.className = "split-group-header";
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = "Groupe";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "split-group-name";
    inp.value = g.name;
    inp.setAttribute("aria-label", "Nom du groupe");
    inp.addEventListener("input", () => {
      g.name = inp.value;
      scheduleSplitWorkspaceAutosave();
    });
    label.appendChild(span);
    label.appendChild(inp);
    header.appendChild(label);
    // Suppression possible uniquement pour les groupes ajoutés (pas les 2 premiers).
    if (gi >= 2) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "split-group-delete";
      del.textContent = "Supprimer";
      del.addEventListener("click", () => {
        try {
          // Remettre les pages dans le groupe 1 pour éviter toute perte.
          const g1 = st.groups[0];
          g1.pages.push(...g.pages);
          g1.pages = Array.from(new Set(g1.pages)).sort((a, b) => a - b);
          // Retirer le groupe.
          st.groups = st.groups.filter((x) => x.id !== g.id);
          st.selected.clear();
        } catch {}
        renderSplitWorkspace();
        scheduleSplitWorkspaceAutosave();
      });
      header.appendChild(del);
    }
    section.appendChild(header);
    const body = document.createElement("div");
    body.className = "split-group-body";
    body.dataset.groupId = g.id;
    for (const page of g.pages) {
      body.appendChild(createSplitThumbEl(page, g.id));
    }
    section.appendChild(body);
    splitWorkspaceGroups.appendChild(section);
  }
}

function addSplitGroup() {
  if (!splitWorkspaceState) return;
  const num = splitWorkspaceState.nextGroupId;
  splitWorkspaceState.nextGroupId += 1;
  splitWorkspaceState.groups.push({ id: `g${num}`, name: `groupe ${num}`, pages: [] });
  renderSplitWorkspace();
  scheduleSplitWorkspaceAutosave();
}

function openSplitWorkspace() {
  const tab = getActiveTab();
  if (!tab) {
    setStatus("Split: aucun PDF actif.");
    return;
  }
  if (!Number(tab.pageCount) || tab.pageCount < 1) {
    setStatus("Split: document non pret.");
    return;
  }
  splitWorkspaceState = loadSplitWorkspaceDraft(tab) || createSplitWorkspaceState(tab);
  normalizeSplitState(splitWorkspaceState, tab);
  splitWorkspaceOverlay?.classList.remove("hidden");
  splitWorkspaceOverlay?.setAttribute("aria-hidden", "false");
  renderSplitWorkspace();
  scheduleSplitWorkspaceAutosave();
  try {
    splitWorkspaceValidateBtn?.focus?.();
  } catch {
    /* ignore */
  }
}

function closeSplitWorkspace() {
  scheduleSplitWorkspaceAutosave();
  splitWorkspaceOverlay?.classList.add("hidden");
  splitWorkspaceOverlay?.setAttribute("aria-hidden", "true");
  splitWorkspaceState = null;
  removeSplitGhost();
  clearSplitDropHover();
}

async function validateSplitWorkspace() {
  const st = splitWorkspaceState;
  const tab = getActiveTab();
  if (!st || !tab || tab.path !== st.tabPath) return;
  const exports = [];
  let idx = 0;
  for (const g of st.groups) {
    if (!g.pages.length) continue;
    idx += 1;
    const safe = sanitizeSplitBaseName(g.name);
    const outputPath = buildDefaultOutputPath(tab.path, `split-${idx}-${safe}`);
    exports.push({ output_path: outputPath, page_indices: [...g.pages] });
  }
  if (!exports.length) {
    setStatus("Split: aucun groupe avec des pages.");
    return;
  }
  const enqueued = await enqueuePdfJob(
    "split_groups",
    { input_path: tab.path, groups: exports },
    "Job split (groupes) ajoute."
  );
  if (!enqueued) return;
  try {
    localStorage.removeItem(splitWorkspaceDraftKey(tab.path));
  } catch {
    /* ignore */
  }
  closeSplitWorkspace();
}

async function createMergeJob() {

  const pdfTabs = state.tabs.map((t) => t.path);
  if (pdfTabs.length < 2) {
    setStatus("Fusion: ouvrez au moins 2 PDF.");
    return;
  }
  const outputPath = buildDefaultOutputPath(pdfTabs[0], "merged");
  await enqueuePdfJob("merge", { inputs: pdfTabs, output_path: outputPath }, "Job fusion ajoute.");
}

function createSplitJob() {
  openSplitWorkspace();
}

async function createCompressJob() {

  const tab = getActiveTab();
  if (!tab) {
    setStatus("Compression: aucun PDF actif.");
    return;
  }
  const outputPath = buildDefaultOutputPath(tab.path, "compressed");
  await enqueuePdfJob("compress", { input_path: tab.path, output_path: outputPath }, "Job compression ajoute.");
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
  await enqueuePdfJob(
    "protect",
    { input_path: tab.path, output_path: outputPath, password },
    "Job protect ajoute."
  );
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
  await enqueuePdfJob(
    "unprotect",
    { input_path: tab.path, output_path: outputPath, password },
    "Job unprotect ajoute."
  );
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
    node.style.transformOrigin = "0 0";
    node.style.transform = `rotate(${a.rotation || 0}deg)`;
    node.style.opacity = String((a.opacity ?? 100) / 100);
    node.dataset.id = a.id;

    if (a.type === "text") {
      const isEditing = state.editingAnnotationId === a.id;
      node.setAttribute("contenteditable", "false");
      try {
        node.contentEditable = "false";
      } catch {}
      if (isEditing) node.classList.add("editing");
      node.dataset.placeholder = "Nouveau texte";
      node.style.color = a.textColor || "#111111";
      node.style.backgroundColor = a.bgColor ? a.bgColor : "transparent";
      const haloOn = a.halo !== false;
      node.style.textShadow = haloOn
        ? "0 0 2px rgba(255, 255, 255, 0.85), 0 0 3px rgba(0, 0, 0, 0.25)"
        : "none";
      node.style.padding = `${a.padding ?? 6}px`;
      node.style.fontFamily = a.fontFamily || "Arial";
      node.style.fontSize = `${a.fontSize ?? 14}px`;
      node.tabIndex = isEditing ? -1 : 0;

      if (!isEditing) {
        if (a.textHtml && String(a.textHtml).trim()) {
          node.innerHTML = sanitizeTextHtml(a.textHtml);
        } else {
          node.textContent = a.text ? a.text : "";
        }
      } else {
        node.innerHTML = "";
        const ed = document.createElement("div");
        ed.className = "text-editor";
        ed.setAttribute("role", "textbox");
        ed.setAttribute("aria-multiline", "true");
        ed.contentEditable = "true";
        ed.spellcheck = true;
        try {
          ed.setAttribute("lang", getSpellcheckBcp47FromUiLang(state.language));
        } catch {}
        if (a.textHtml && String(a.textHtml).trim()) {
          ed.innerHTML = sanitizeTextHtml(a.textHtml);
        } else {
          ed.textContent = a.text || "";
        }
        ed.addEventListener(
          "input",
          () => {
            syncTextFromEditor(a, ed);
            scheduleAutoSave();
            scheduleAutoGrowText(tab, a, node, "input");
          },
          { capture: true }
        );
        ed.addEventListener(
          "blur",
          () => {
            try {
              captureSnapshot(tab);
              syncTextFromEditor(a, ed);
              scheduleAutoSave();
            } catch {}
          },
          { capture: true }
        );
        ed.addEventListener(
          "mousedown",
          (event) => {
            event.stopPropagation();
          },
          { capture: true }
        );
        node.appendChild(ed);
        requestAnimationFrame(() => {
          try {
            ed.focus();
          } catch {}
        });
      }

      node.oncontextmenu = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openTextAnnotationCtxMenu(event, a.id);
      };

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
          const ed = getAnnotationTextEditor(editNode);
          if (ed) ed.focus();
          else editNode?.focus?.();
        });
      };
    } else if (a.type === "image") {
      const img = document.createElement("img");
      img.src = a.src;
      node.appendChild(img);
    } else if (SHAPE_TYPES.has(a.type)) {
      mergeShapeStyleFields(a);
      node.classList.add("shape-vector");
      renderShapeVectorDOM(node, a);
    }

    if (SHAPE_TYPES.has(a.type)) {
      node.oncontextmenu = (event) => {
        if (state.selectedAnnotationId !== a.id) return;
        event.preventDefault();
        event.stopPropagation();
        hideChangesContextMenu();
        hideTextAnnotationCtxMenu();
        hideImageAnnotationCtxMenu();
        openShapeAnnotationCtxMenu(event, a.id);
      };
    }
    if (a.type === "image") {
      node.oncontextmenu = (event) => {
        if (state.selectedAnnotationId !== a.id) return;
        event.preventDefault();
        event.stopPropagation();
        hideChangesContextMenu();
        hideTextAnnotationCtxMenu();
        hideShapeAnnotationCtxMenu();
        openImageAnnotationCtxMenu(event, a.id);
      };
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
            const ed2 = getAnnotationTextEditor(editNode);
            if (ed2) ed2.focus();
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
            const ed2 = getAnnotationTextEditor(editNode);
            if (ed2) ed2.focus();
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

/**
 * Redimensionne l'annotation : les deltas écran sont exprimés dans le repère local
 * tourné de `item.rotation` (cohérent avec `transform-origin: 0 0` sur `.annotation`).
 */
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
    // Deltas dans le repère local non pivoté (CSS rotate), pour un étirement cohérent avec la rotation.
    const rot = Number(item.rotation) || 0;
    const rad = (rot * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const dlx = dx * c + dy * s;
    const dly = -dx * s + dy * c;
    const minW = 20;

    let nextX = originX;
    let nextY = originY;
    let nextW = originW;
    let nextH = originH;

    const affectsLeft = mode === "l" || mode === "tl" || mode === "bl";
    const affectsRight = mode === "r" || mode === "tr" || mode === "br";
    const affectsTop = mode === "t" || mode === "tl" || mode === "tr";
    const affectsBottom = mode === "b" || mode === "bl" || mode === "br";

    if (affectsRight) nextW = originW + dlx;
    if (affectsBottom) nextH = originH + dly;
    if (affectsLeft) {
      nextX = originX + dlx;
      nextW = originW - dlx;
    }
    if (affectsTop) {
      nextY = originY + dly;
      nextH = originH - dly;
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

function computeInsertPositionForNewAnnotation(tab, annotation, zone) {
  const p = state.lastPointer && Number(state.lastPointer.page) === Number(tab.currentPage || 1) ? state.lastPointer : null;
  const cx = p ? p.x : zone.width / 2;
  const cy = p ? p.y : zone.height / 2;
  // Positionner top-left proche du curseur, sans sortir de la page.
  annotation.x = cx - (annotation.w || 20) / 2;
  annotation.y = cy - (annotation.h || 20) / 2;
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
  if (SHAPE_TYPES.has(type)) {
    mergeShapeStyleFields(annotation);
  }
  const zone = getSafeZoneSize();
  computeInsertPositionForNewAnnotation(tab, annotation, zone);
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
  const isShape = !!item && SHAPE_TYPES.has(item.type);
  if (textPropsPanel) {
    textPropsPanel.classList.toggle("hidden", !isText);
  }
  if (shapePropsPanel) {
    shapePropsPanel.classList.toggle("hidden", !isShape);
  }
  if (!item) return;
  if (propWidth && propHeight && propRotation && propOpacity) {
    propWidth.value = String(Math.round(item.w || 180));
    propHeight.value = String(Math.round(item.h || 120));
    propRotation.value = String(Math.round(item.rotation || 0));
    propOpacity.value = String(Math.round(item.opacity ?? 100));
  }
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
  }
  if (isShape && propShapeFill && propShapeFillOpacity && propShapeStroke && propShapeStrokeWidth) {
    mergeShapeStyleFields(item);
    propShapeFill.value = item.fillColor || "#000000";
    propShapeFillOpacity.value = String(Math.round((Number(item.fillAlpha) ?? 0.3) * 100));
    propShapeStroke.value = item.strokeColor || "#000000";
    propShapeStrokeWidth.value = String(Math.max(0, Math.floor(Number(item.strokeWidth) || 0)));
    if (propShapeStrokeOpacity) propShapeStrokeOpacity.value = String(Math.round((Number(item.strokeAlpha) ?? 1) * 100));
    if (propShapeBackdrop && propShapeBackdropOpacity) {
      const bdTr = !item.backdropColor || (Number(item.backdropAlpha) ?? 0) < 0.001;
      propShapeBackdrop.value = bdTr ? "#ffffff" : item.backdropColor;
      propShapeBackdropOpacity.value = String(Math.round((Number(item.backdropAlpha) ?? 0) * 100));
    }
  }
}

function applySelectedProperties() {
  const tab = getActiveTab();
  const item = getSelectedAnnotation();
  if (!tab || !item) return;
  captureSnapshot(tab);
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
  } else if (SHAPE_TYPES.has(item.type) && propShapeFill && propShapeFillOpacity && propShapeStroke && propShapeStrokeWidth) {
    const prevFill = item.fillColor;
    const prevStroke = item.strokeColor;
    const prevBackdrop = item.backdropColor;

    item.fillColor = propShapeFill.value || item.fillColor;
    let fillA = clamp(Number(propShapeFillOpacity.value) / 100, 0, 1);
    if (fillA < 0.001 && item.fillColor !== prevFill) {
      fillA = defaultShapeFillAlphaAfterClear(item.type);
      propShapeFillOpacity.value = String(Math.round(fillA * 100));
    }
    item.fillAlpha = fillA;

    item.strokeColor = propShapeStroke.value || item.strokeColor;
    let strokeA = propShapeStrokeOpacity ? clamp(Number(propShapeStrokeOpacity.value) / 100, 0, 1) : 1;
    if (strokeA < 0.001 && item.strokeColor !== prevStroke) {
      strokeA = 1;
      if (propShapeStrokeOpacity) propShapeStrokeOpacity.value = "100";
      if ((Number(item.strokeWidth) || 0) < 1) {
        const w = 2;
        item.strokeWidth = w;
        if (propShapeStrokeWidth) propShapeStrokeWidth.value = String(w);
      }
    }
    if (propShapeStrokeOpacity) item.strokeAlpha = strokeA;

    item.strokeWidth = clamp(Math.floor(Number(propShapeStrokeWidth.value) || 0), 0, 24);
    if (propShapeBackdrop && propShapeBackdropOpacity) {
      let bda = clamp(Number(propShapeBackdropOpacity.value) / 100, 0, 1);
      const newBd = propShapeBackdrop.value;
      if (bda < 0.001 && newBd && newBd !== prevBackdrop) {
        bda = 0.3;
        propShapeBackdropOpacity.value = "30";
      }
      item.backdropAlpha = bda;
      if (item.backdropAlpha < 0.001) {
        item.backdropColor = null;
      } else {
        item.backdropColor = newBd || item.backdropColor || "#ffffff";
      }
    }
  }
  renderAnnotations();
  scheduleAutoSave();
}

function applySelectedPropertiesLive() {
  const item = getSelectedAnnotation();
  if (!item) return;
  applySelectedProperties();
}

/** Comportement historique (36f53ac) : toucher « Fond » puis appliquer (sinon applySelectedProperties ignore le fond). */
function markBgTouchedAndApply() {
  try {
    propBgColor.dataset.touched = "1";
    propBgColorLabel?.classList?.remove?.("is-transparent");
  } catch {}
  applySelectedPropertiesLive();
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

function buildSuggestedSaveAsName(tab) {
  try {
    const name = String(tab?.name || "document.pdf");
    const base = name.toLowerCase().endsWith(".pdf") ? name.slice(0, -4) : name;
    return `${base}_modifie.pdf`;
  } catch {
    return "document_modifie.pdf";
  }
}

async function toBase64FromUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function savePdfAs() {
  const tab = getActiveTab();
  if (!tab) {
    setStatus("Enregistrer sous: aucun PDF actif.");
    return;
  }
  const suggested = buildSuggestedSaveAsName(tab);
  const r = await window.maniPdfApi.savePdfAsDialog(suggested);
  if (!r?.ok) {
    if (!r?.cancelled) setStatus(r?.error || "Enregistrer sous annulé.");
    return;
  }

  const canvases = {};
  try {
    pagesContainer?.querySelectorAll?.(".pdf-page").forEach((node) => {
      const page = Number(node.dataset.page) || 1;
      const c = node.querySelector("canvas.pdf-canvas");
      if (!c) return;
      canvases[String(page)] = { w: c.width || 0, h: c.height || 0 };
    });
  } catch {}

  const annotationsByPage = {};
  try {
    Object.keys(tab.annotationsByPage || {}).forEach((k) => {
      const arr = tab.annotationsByPage[k] || [];
      annotationsByPage[k] = arr.map((a) => {
        const c = { ...a };
        if (SHAPE_TYPES.has(c.type)) mergeShapeStyleFields(c);
        if (c.type === "text" && c.textHtml) {
          try {
            const d = document.createElement("div");
            d.innerHTML = sanitizeTextHtml(c.textHtml);
            c.text = d.textContent || "";
          } catch {
            c.text = stripTagsForPlain(String(c.textHtml || ""));
          }
        }
        return c;
      });
    });
  } catch {}

  // Images: convertir les object URLs en base64 (pour que Python puisse les réinjecter).
  try {
    for (const pageKey of Object.keys(annotationsByPage)) {
      const arr = annotationsByPage[pageKey] || [];
      for (const a of arr) {
        if (a.type === "image" && a.src) {
          a.src_base64 = await toBase64FromUrl(a.src);
        }
      }
    }
  } catch {}

  setStatus("Export PDF…");
  const exportResult = await window.maniPdfApi.exportPdfWithAnnotations({
    input_path: tab.path,
    output_path: r.path,
    canvases_px_by_page: canvases,
    annotations_by_page: annotationsByPage
  });
  setStatus(exportResult?.ok ? "PDF exporté." : exportResult?.error || "Export PDF échoué.");
}

// Ouverture PDF via menu natif (File > Open PDF) et raccourci clavier (Ctrl+O).

prevBtn?.addEventListener?.("click", () => pageShift(-1));
nextBtn?.addEventListener?.("click", () => pageShift(1));
addTextBtn?.addEventListener?.("click", () => addAnnotation("text"));
addShapeBtn?.addEventListener?.("click", openShapePicker);
addImageBtn?.addEventListener?.("click", () => imageInput?.click?.());
blankAddTextBtn?.addEventListener?.("click", () => {
  hideBlankCanvasCtxMenu();
  addAnnotation("text");
});
blankAddShapeBtn?.addEventListener?.("click", () => {
  hideBlankCanvasCtxMenu();
  openShapePicker();
});
blankAddImageBtn?.addEventListener?.("click", () => {
  hideBlankCanvasCtxMenu();
  imageInput?.click?.();
});
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
validateTextColorBtn?.addEventListener?.("click", () => applySelectedProperties());
applyBgBtn?.addEventListener?.("click", () => {
  try {
    propBgColor.dataset.touched = "1";
    propBgColorLabel?.classList?.remove?.("is-transparent");
  } catch {}
  applySelectedProperties();
});
// couleur_forme_ok (36f53ac) : application live sur les pickers natifs (input type="color").
// Sans cela, seul « Valider » applique — régression si les boutons ne sont pas utilisés ou sous Electron.
propTextColor?.addEventListener?.("input", applySelectedPropertiesLive);
propBgColor?.addEventListener?.("input", markBgTouchedAndApply);
propBgColor?.addEventListener?.("change", markBgTouchedAndApply);
propShapeFill?.addEventListener?.("input", applySelectedPropertiesLive);
propShapeFill?.addEventListener?.("change", applySelectedPropertiesLive);
propShapeStroke?.addEventListener?.("input", applySelectedPropertiesLive);
propShapeStroke?.addEventListener?.("change", applySelectedPropertiesLive);
propShapeBackdrop?.addEventListener?.("input", applySelectedPropertiesLive);
propShapeBackdrop?.addEventListener?.("change", applySelectedPropertiesLive);
propWidth?.addEventListener?.("input", applySelectedPropertiesLive);
propHeight?.addEventListener?.("input", applySelectedPropertiesLive);
propRotation?.addEventListener?.("input", applySelectedPropertiesLive);
propOpacity?.addEventListener?.("input", applySelectedPropertiesLive);
propShapeFillOpacity?.addEventListener?.("input", applySelectedPropertiesLive);
propShapeStrokeWidth?.addEventListener?.("input", applySelectedPropertiesLive);
propShapeStrokeOpacity?.addEventListener?.("input", applySelectedPropertiesLive);
propShapeBackdropOpacity?.addEventListener?.("input", applySelectedPropertiesLive);

validateShapeFillBtn?.addEventListener?.("click", () => applySelectedProperties());
validateShapeStrokeBtn?.addEventListener?.("click", () => applySelectedProperties());
validateShapeBackdropBtn?.addEventListener?.("click", () => applySelectedProperties());

propPadding?.addEventListener?.("input", applySelectedPropertiesLive);
propFontFamily?.addEventListener?.("change", applySelectedPropertiesLive);
propFontSize?.addEventListener?.("input", applySelectedPropertiesLive);
mergeBtn?.addEventListener?.("click", () => {
  closeAllFlyoutMenus();
  void createMergeJob();
});
splitBtn?.addEventListener?.("click", () => {
  closeAllFlyoutMenus();
  createSplitJob();
});
splitWorkspaceCloseBtn?.addEventListener?.("click", () => closeSplitWorkspace());
splitWorkspaceAddGroupBtn?.addEventListener?.("click", () => addSplitGroup());
splitWorkspaceValidateBtn?.addEventListener?.("click", () => void validateSplitWorkspace());
splitWorkspaceOverlay?.addEventListener?.("click", (e) => {
  if (e.target === splitWorkspaceOverlay) closeSplitWorkspace();
});
toolbarAboutBtn?.addEventListener?.("click", () => {
  if (!aboutPopover) return;
  const isOpen = !aboutPopover.classList.contains("hidden");
  if (isOpen) hideAboutPopover();
  else showAboutPopover();
});
aboutCloseBtn?.addEventListener?.("click", () => hideAboutPopover());
toolbarAboutMenuItem?.addEventListener?.("click", () => {
  try {
    closeToolbarOptionsMenu();
  } catch {}
  showAboutPopoverNearOptions();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!splitWorkspaceOverlay || splitWorkspaceOverlay.classList.contains("hidden")) return;
  closeSplitWorkspace();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!blankCanvasCtxMenu || blankCanvasCtxMenu.classList.contains("hidden")) return;
  hideBlankCanvasCtxMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!aboutPopover || aboutPopover.classList.contains("hidden")) return;
  hideAboutPopover();
});
compressBtn?.addEventListener?.("click", () => {
  closeAllFlyoutMenus();
  void createCompressJob();
});
protectBtn?.addEventListener?.("click", () => {
  closeAllFlyoutMenus();
  void createProtectJob();
});
unprotectBtn?.addEventListener?.("click", () => {
  closeAllFlyoutMenus();
  void createUnprotectJob();
});
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
  hideChangesContextMenu();
  hideBlankCanvasCtxMenu();
  hideTextAnnotationCtxMenu();
  hideShapeAnnotationCtxMenu();
  hideImageAnnotationCtxMenu();
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
toolbarSaveAsBtn?.addEventListener?.("click", (e) => {
  e.preventDefault();
  closeAllFlyoutMenus();
  savePdfAs().catch(() => {});
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

window.maniPdfApi?.onSaveAsRequested?.(() => savePdfAs().catch(() => {}));
window.maniPdfApi?.onAutosaveRequested?.(() => {
  saveSession().catch(() => {});
});

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
      const ed = getAnnotationTextEditor(editingNode);
      if (item && item.type === "text" && ed) {
        captureSnapshot(tab);
        syncTextFromEditor(item, ed);
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
        const edEsc = getAnnotationTextEditor(editingNode);
        if (item && item.type === "text" && edEsc) {
          captureSnapshot(tab);
          syncTextFromEditor(item, edEsc);
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
    savePdfAs().catch(() => {});
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

loadPreferredLanguage();
applyLanguage();
applySpellcheckLanguageBestEffort();
wireTextAnnotationCtxMenu();
wireShapeAnnotationCtxMenu();
wireImageAnnotationCtxMenu();
try {
  window.maniPdfApi?.onPdfToolAction?.((action) => {
    closeAllFlyoutMenus();
    if (action === "merge") void createMergeJob();
    else if (action === "split") createSplitJob();
    else if (action === "compress") void createCompressJob();
    else if (action === "protect") void createProtectJob();
    else if (action === "unprotect") void createUnprotectJob();
  });
} catch {
  /* ignore */
}
try {
  window.maniPdfApi?.onAboutRequested?.(() => {
    showAboutPopoverNearOptions();
  });
} catch {
  /* ignore */
}
syncFullscreenFromMain().catch(() => {});
updateZoomUI();
updateWelcomeVisibility();
loadSession().catch(() => {});
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
        pageCount: tab?.pageCount ?? null,
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
  /** E2E uniquement : ajoute une forme sur la page active (meme pipeline que le modal). */
  window.__maniE2E.injectShapeForTest = (shapeType) => {
    try {
      const tab = getActiveTab();
      if (!tab) return null;
      if (shapeType === "line") {
        addAnnotation("line", { h: 20 });
      } else if (SHAPE_TYPES.has(shapeType)) {
        addAnnotation(shapeType);
      } else {
        return null;
      }
      return state.selectedAnnotationId;
    } catch {
      return null;
    }
  };
  /** E2E uniquement : image PNG 1x1 par defaut si dataUrl omis. */
  window.__maniE2E.injectImageForTest = (dataUrl) => {
    try {
      const tab = getActiveTab();
      if (!tab) return null;
      captureSnapshot(tab);
      const annotations = currentPageAnnotations(tab);
      const id = newAnnotationId();
      const src =
        dataUrl ||
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      annotations.push({
        id,
        type: "image",
        x: 130,
        y: 130,
        w: 100,
        h: 75,
        rotation: 11,
        opacity: 92,
        src,
        fileName: "e2e.png"
      });
      state.selectedAnnotationId = id;
      renderAnnotations();
      scheduleAutoSave();
      return id;
    } catch {
      return null;
    }
  };
  window.__maniE2E.getAnnotationProps = (annotationId) => {
    try {
      const tab = getActiveTab();
      if (!tab || !annotationId) return null;
      const loc = findAnnotationLocation(tab, annotationId);
      if (!loc?.item) return null;
      const a = loc.item;
      return {
        type: a.type,
        rotation: a.rotation,
        opacity: a.opacity,
        w: a.w,
        h: a.h
      };
    } catch {
      return null;
    }
  };
} catch {}
