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
const thumbsBar = document.getElementById("thumbsBar");
const changesBar = document.getElementById("changesBar");
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

/** Logs diagnostics (console + IPC si dispo). Ne doit jamais lever. */
function logText(tag, payload) {
  try {
    if (typeof console !== "undefined" && typeof console.info === "function") {
      console.info(`[editify:${tag}]`, payload);
    }
    try {
      globalThis.maniPdfApi?.log?.(tag, payload && typeof payload === "object" ? payload : { v: payload });
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

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
/** Annule les rafraîchissements async du menu orthographe quand le menu se ferme. */
let spellCtxMenuSeq = 0;

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
  if (!a) return t("annElem");
  if (a.type === "text") return t("annTextWin");
  if (a.type === "image") return t("annImage");
  const k = SHAPE_TYPE_KEYS[a.type];
  return k ? t(k) : String(a.type);
}

function annotationSummary(a) {
  if (!a) return "";
  if (a.type === "text") {
    const raw = String(plainTextForAnnotationItem(a) || "").trim();
    if (!raw) return t("emptyTextPreview");
    const parts = raw.split(/\s+/).filter(Boolean);
    const words = parts.slice(0, 3);
    return words.join(" ") + (parts.length > 3 ? "…" : "");
  }
  if (a.type === "image") {
    const name = a.fileName || a.name || null;
    return name ? tr("imageNamed", { name }) : t("imageAdded");
  }
  return tr("shapeSummaryPrefix", { label: annotationTypeLabel(a) });
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
    p.textContent = tr("changePageLine", { n: String(page) });
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
    sub.textContent = annosCount ? tr("thumbAddsCount", { n: String(annosCount) }) : t("noAdds");
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

/** Persiste le texte en cours si l’utilisateur ouvre le menu sur une autre annotation. */
function commitActiveTextEditIfNeeded(targetAnnotationId) {
  const tab = getActiveTab();
  if (!tab || !state.editingAnnotationId) return;
  if (state.editingAnnotationId === targetAnnotationId) return;
  const id = state.editingAnnotationId;
  const editingNode = annotationLayer?.querySelector?.(`[data-id="${id}"]`);
  const item = findAnnotationLocation(tab, id)?.item;
  const ed = editingNode ? getAnnotationTextEditor(editingNode) : null;
  if (item && item.type === "text" && ed) {
    try {
      captureSnapshot(tab);
      syncTextFromEditor(item, ed);
    } catch {}
    scheduleAutoSave();
  }
  state.editingAnnotationId = null;
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
      if (
        e.target?.closest?.(
          "#textAnnotationCtxMenu,#shapeAnnotationCtxMenu,#imageAnnotationCtxMenu,#changesContextMenu,#maniColorModal"
        )
      )
        return;
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
  del.id = "changesCtxDeleteBtn";
  del.setAttribute("role", "menuitem");
  del.textContent = t("del");
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
        setStatus(t("stLinkOpenFailed"));
      }
    } catch {
      setStatus(t("stLinkOpenFailed"));
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

/**
 * True si le pointeur est dans le rectangle d'un menu flottant (y compris les « gaps » flex où target peut être le PDF derrière).
 */
function pointerEventInsideElementBox(event, el) {
  try {
    if (!el || el.classList.contains("hidden")) return false;
    const r = el.getBoundingClientRect();
    const x = event.clientX ?? 0;
    const y = event.clientY ?? 0;
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  } catch {
    return false;
  }
}

/** Clic sur la modale nuancier : ne doit pas fermer les popups Forme / Texte / Image. */
function eventTargetsManiColorModal(event) {
  try {
    if (event.target?.closest?.("#maniColorModal")) return true;
    const path = event.composedPath?.() || [];
    for (const n of path) {
      if (n instanceof Element && (n.id === "maniColorModal" || n.closest?.("#maniColorModal"))) return true;
    }
  } catch {}
  return false;
}

document.addEventListener(
  "mousedown",
  (e) => {
    if (e.button !== 0) return;
    const inManiColor = eventTargetsManiColorModal(e);
    const textCtxEl = document.getElementById("textAnnotationCtxMenu");
    const shapeCtxEl = document.getElementById("shapeAnnotationCtxMenu");
    const imageCtxEl = document.getElementById("imageAnnotationCtxMenu");
    const blankCtxEl = document.getElementById("blankCanvasCtxMenu");
    const changesEl = document.getElementById("changesContextMenu");

    if (!e.target?.closest?.("#changesContextMenu") && !pointerEventInsideElementBox(e, changesEl)) hideChangesContextMenu();
    if (
      !e.target?.closest?.("#textAnnotationCtxMenu") &&
      !pointerEventInsideElementBox(e, textCtxEl) &&
      !inManiColor
    ) {
      hideTextAnnotationCtxMenu();
    }
    if (
      !e.target?.closest?.("#shapeAnnotationCtxMenu") &&
      !pointerEventInsideElementBox(e, shapeCtxEl) &&
      !inManiColor
    ) {
      try {
        logText("ctxShapeDismissMouseDown", {
          tag: e.target?.nodeName,
          id: e.target?.id,
          x: e.clientX,
          y: e.clientY,
          inMenuBox: pointerEventInsideElementBox(e, shapeCtxEl),
          inManiColor
        });
      } catch {
        /* ignore */
      }
      hideShapeAnnotationCtxMenu();
    }
    if (
      !e.target?.closest?.("#imageAnnotationCtxMenu") &&
      !pointerEventInsideElementBox(e, imageCtxEl) &&
      !inManiColor
    ) {
      hideImageAnnotationCtxMenu();
    }
    if (!e.target?.closest?.("#blankCanvasCtxMenu") && !pointerEventInsideElementBox(e, blankCtxEl)) hideBlankCanvasCtxMenu();
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
  spellCtxMenuSeq += 1;
  try {
    logText("ctxTextMenuHide", { hadTarget: Boolean(textCtxMenuTargetId) });
  } catch {
    /* ignore */
  }
  try {
    ensureTextAnnotationCtxMenuEl()?.classList?.add?.("hidden");
  } catch {}
  textCtxMenuTargetId = null;
  globalThis.__maniCtxTextBackup = undefined;
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
  try {
    window.syncManiColorSwatches?.();
  } catch {
    /* ignore */
  }
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
  commitActiveTextEditIfNeeded(annotationId);
  cancelPointerInteraction();
  const menu = ensureTextAnnotationCtxMenuEl();
  if (!menu) return;
  const tab = getActiveTab();
  if (!tab) return;
  const loc = findAnnotationLocation(tab, annotationId);
  if (!loc || loc.item.type !== "text") return;
  hideShapeAnnotationCtxMenu();
  hideImageAnnotationCtxMenu();
  hideChangesContextMenu();
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
  // Ne pas re-render si on édite déjà ce texte : sinon le DOM de l’éditeur est recréé et la sélection est perdue.
  if (state.editingAnnotationId !== annotationId) {
    renderAnnotations();
  }
  syncCtxTextFormatButtons();
  void refreshTextSpellContextMenu();
}

function getPlainSelectionOffsetsInEditor(ed) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !ed.contains(sel.anchorNode)) {
    return { start: 0, end: 0, collapsed: true };
  }
  const range = sel.getRangeAt(0);
  const pre = document.createRange();
  pre.selectNodeContents(ed);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  pre.selectNodeContents(ed);
  pre.setEnd(range.endContainer, range.endOffset);
  const end = pre.toString().length;
  return { start, end, collapsed: start === end };
}

function textNodeFormatHit(textNode, ed, kind) {
  let el = textNode.parentElement;
  while (el && el !== ed) {
    const tag = el.tagName;
    if (kind === "bold" && /^(B|STRONG)$/i.test(tag)) return true;
    if (kind === "italic" && /^(I|EM|CITE)$/i.test(tag)) return true;
    if (kind === "underline" && /^U$/i.test(tag)) return true;
    el = el.parentElement;
  }
  const pe = textNode.parentElement;
  if (!pe) return false;
  const st = getComputedStyle(pe);
  if (kind === "bold") {
    const w = st.fontWeight;
    return Number.parseInt(w, 10) >= 600;
  }
  if (kind === "italic") return st.fontStyle === "italic";
  if (kind === "underline") return String(st.textDecorationLine || "").includes("underline");
  return false;
}

function getFormatCoverage(ed, kind) {
  if (!ed) return "none";
  let total = 0;
  let hit = 0;
  const tw = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const t = n.nodeValue || "";
    if (!t.length) continue;
    total += t.length;
    if (textNodeFormatHit(n, ed, kind)) hit += t.length;
  }
  if (total === 0) return "none";
  if (hit === 0) return "none";
  if (hit === total) return "full";
  return "partial";
}

function getFormatCoverageFromSanitizedHtml(html, kind) {
  const div = document.createElement("div");
  div.setAttribute("style", "position:fixed;left:-9999px;top:0;");
  div.innerHTML = sanitizeTextHtml(html || "");
  document.body.appendChild(div);
  const cov = getFormatCoverage(div, kind);
  document.body.removeChild(div);
  return cov;
}

function setFmtBtnState(id, cov) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.remove("fmt-state-none", "fmt-state-partial", "fmt-state-full");
  btn.classList.add(
    cov === "full" ? "fmt-state-full" : cov === "partial" ? "fmt-state-partial" : "fmt-state-none"
  );
}

function syncCtxTextFormatButtons() {
  const tab = getActiveTab();
  if (!tab || !textCtxMenuTargetId) return;
  const loc = findAnnotationLocation(tab, textCtxMenuTargetId);
  if (!loc || loc.item.type !== "text") return;
  const host = annotationLayer?.querySelector(`[data-id="${textCtxMenuTargetId}"]`);
  const ed = getAnnotationTextEditor(host);
  const kinds = [
    ["ctxTextBold", "bold"],
    ["ctxTextItalic", "italic"],
    ["ctxTextUnderline", "underline"]
  ];
  for (const [id, kind] of kinds) {
    const cov = ed
      ? getFormatCoverage(ed, kind)
      : getFormatCoverageFromSanitizedHtml(loc.item.textHtml || loc.item.text || "", kind);
    setFmtBtnState(id, cov);
  }
}

function replacePlainTextRangeInEditor(ed, start, end, replacement) {
  if (!ed || start < 0 || end <= start) return false;
  const a = getTextBoundaryInRoot(ed, start);
  const b = getTextBoundaryInRoot(ed, end);
  if (!a || !b) return false;
  const range = document.createRange();
  try {
    range.setStart(a.node, a.offset);
    range.setEnd(b.node, b.offset);
  } catch {
    return false;
  }
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
  return true;
}

function replacePlainRangeInTextItem(item, start, end, replacement) {
  const plain = plainTextForAnnotationItem(item);
  if (start < 0 || end > plain.length) return false;
  const next = plain.slice(0, start) + replacement + plain.slice(end);
  item.text = next;
  delete item.textHtml;
  delete item._spellErrors;
  return true;
}

async function applySpellSuggestionToContextTarget(replacement) {
  const ctx = globalThis.__maniSpellCtx;
  const tab = getActiveTab();
  if (!ctx || !textCtxMenuTargetId || !tab || ctx.replaceStart < 0 || !replacement) return;
  const loc = findAnnotationLocation(tab, textCtxMenuTargetId);
  if (!loc?.item || loc.item.type !== "text") return;
  const item = loc.item;
  captureSnapshot(tab);
  const host = annotationLayer?.querySelector(`[data-id="${textCtxMenuTargetId}"]`);
  const ed = getAnnotationTextEditor(host);
  if (ed) {
    replacePlainTextRangeInEditor(ed, ctx.replaceStart, ctx.replaceEnd, replacement);
    syncTextFromEditor(item, ed);
  } else {
    replacePlainRangeInTextItem(item, ctx.replaceStart, ctx.replaceEnd, replacement);
  }
  scheduleAutoSave();
  renderAnnotations();
  void refreshTextSpellContextMenu();
}

async function refreshTextSpellContextMenu() {
  const tab = getActiveTab();
  if (!tab || !textCtxMenuTargetId) return;
  const loc = findAnnotationLocation(tab, textCtxMenuTargetId);
  if (!loc || loc.item.type !== "text") return;
  const item = loc.item;
  const lang = getSpellcheckBcp47FromUiLang(state.language);
  const api = window.maniPdfApi;
  const statusEl = document.getElementById("ctxSpellStatus");
  const wordRow = document.getElementById("ctxSpellWordRow");
  const wordLbl = document.getElementById("ctxSpellWordLabel");
  const wordVal = document.getElementById("ctxSpellWordValue");
  const sugEl = document.getElementById("ctxSpellSuggestions");
  const addBtn = document.getElementById("ctxSpellAddDict");
  const remBtn = document.getElementById("ctxSpellRemoveDict");
  if (!api?.spellcheckAnalyze || !sugEl) return;

  const mySeq = ++spellCtxMenuSeq;
  if (statusEl) statusEl.textContent = t("ctxSpellLoading");
  if (wordLbl) wordLbl.textContent = `${t("ctxSpellWord")} :`;
  sugEl.innerHTML = "";
  if (addBtn) addBtn.classList.add("hidden");
  if (remBtn) remBtn.classList.add("hidden");
  if (wordRow) wordRow.classList.add("hidden");

  const hostPre = annotationLayer?.querySelector(`[data-id="${textCtxMenuTargetId}"]`);
  const edPre = getAnnotationTextEditor(hostPre);
  let plain = plainTextForAnnotationItem(item);
  if (edPre) {
    const rngPlain = document.createRange();
    rngPlain.selectNodeContents(edPre);
    plain = String(rngPlain.toString() || "").replace(/\r\n/g, "\n");
  }
  let res;
  try {
    res = await api.spellcheckAnalyze({ lang, text: plain });
  } catch {
    res = { ok: false, errors: [] };
  }
  if (mySeq !== spellCtxMenuSeq) return;
  const errors = res?.ok && Array.isArray(res.errors) ? res.errors : [];
  logText("spellcheck:ctx", {
    ok: Boolean(res?.ok),
    reason: res?.reason,
    errorsCount: errors.length,
    plainLen: plain.length
  });

  const host = annotationLayer?.querySelector(`[data-id="${textCtxMenuTargetId}"]`);
  const ed = getAnnotationTextEditor(host);
  let selStart = 0;
  let selEnd = 0;
  let hasSel = false;
  if (ed) {
    const o = getPlainSelectionOffsetsInEditor(ed);
    selStart = o.start;
    selEnd = o.end;
    hasSel = !o.collapsed;
  }

  let targetErr = null;
  let dictWord = null;

  let selectedSingleWord = false;
  if (hasSel && selEnd > selStart) {
    const rawSel = plain.slice(selStart, selEnd);
    const trimmed = rawSel.trim();
    if (trimmed.length > 0 && !/\s/.test(trimmed)) {
      selectedSingleWord = true;
      dictWord = trimmed.replace(/^['']+|['']+$/gu, "");
      targetErr =
        errors.find((e) => e.word === dictWord || (e.start >= selStart && e.end <= selEnd + 1)) || null;
    }
  }
  if (!targetErr && errors.length > 0 && !(selectedSingleWord && dictWord)) {
    targetErr = errors[0];
  }
  if (dictWord == null && targetErr) {
    dictWord = targetErr.word;
  }

  globalThis.__maniSpellCtx = {
    replaceStart: targetErr ? targetErr.start : -1,
    replaceEnd: targetErr ? targetErr.end : -1,
    targetWord: targetErr ? targetErr.word : null,
    dictWord: dictWord || (targetErr ? targetErr.word : null)
  };

  if (statusEl) {
    if (!res?.ok) {
      statusEl.textContent = t("ctxSpellDictUnavailable");
    } else {
      statusEl.textContent = errors.length === 0 ? t("ctxSpellNoIssue") : "";
    }
  }

  if (targetErr && wordRow && wordVal) {
    wordRow.classList.remove("hidden");
    wordVal.textContent = targetErr.word;
  }

  if (targetErr && Array.isArray(targetErr.suggestions) && targetErr.suggestions.length) {
    const lab = document.createElement("div");
    lab.className = "ctx-spell-sug-label";
    lab.textContent = t("ctxSpellReplace");
    sugEl.appendChild(lab);
    targetErr.suggestions.forEach((sug) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = sug;
      b.addEventListener("click", () => {
        void applySpellSuggestionToContextTarget(sug);
      });
      sugEl.appendChild(b);
    });
  }

  const dw = globalThis.__maniSpellCtx?.dictWord;
  if (dw && addBtn && remBtn && api.spellcheckIsCustomWord) {
    try {
      const r = await api.spellcheckIsCustomWord(dw);
      if (mySeq !== spellCtxMenuSeq) return;
      addBtn.classList.add("hidden");
      remBtn.classList.add("hidden");
      if (r?.ok && r.inDictionary) {
        remBtn.textContent = t("ctxSpellRemoveDict");
        remBtn.classList.remove("hidden");
        remBtn.onclick = async () => {
          await api.spellcheckRemoveWord(dw);
          void refreshTextSpellContextMenu();
          runBackgroundSpellScanForTextAnnotations();
        };
      } else if (targetErr) {
        addBtn.textContent = t("ctxSpellAddDict");
        addBtn.classList.remove("hidden");
        addBtn.onclick = async () => {
          await api.spellcheckAddWord(dw);
          void refreshTextSpellContextMenu();
          runBackgroundSpellScanForTextAnnotations();
        };
      }
    } catch {
      /* ignore */
    }
  }
}

function runBackgroundSpellScanForTextAnnotations() {
  const tab = getActiveTab();
  const api = window.maniPdfApi;
  if (!tab || !api?.spellcheckAnalyze) return;
  const lang = getSpellcheckBcp47FromUiLang(state.language);
  const page = String(tab.currentPage || 1);
  const list = tab.annotationsByPage[page] || [];
  list.forEach((a) => {
    if (a.type !== "text") return;
    const plain = plainTextForAnnotationItem(a);
    api.spellcheckAnalyze({ lang, text: plain }).then((res) => {
      const errors = res?.ok && Array.isArray(res.errors) ? res.errors : [];
      logText("spellcheck:scan", {
        id: a.id,
        ok: Boolean(res?.ok),
        reason: res?.reason,
        errorsCount: errors.length,
        plainLen: plain.length
      });
      a._spellErrors = errors.map((e) => ({ start: e.start, end: e.end }));
      const n = errors.length;
      const node = annotationLayer?.querySelector(`[data-id="${a.id}"]`);
      if (!node || a.type !== "text") return;
      if (state.editingAnnotationId === a.id) {
        delete node.dataset.spellIssues;
        return;
      }
      if (n > 0) node.dataset.spellIssues = String(n);
      else delete node.dataset.spellIssues;
      if (!node.querySelector?.(".text-editor")) {
        if (a.textHtml && String(a.textHtml).trim()) {
          node.innerHTML = sanitizeTextHtml(a.textHtml);
        } else {
          node.textContent = a.text ? a.text : "";
        }
        applySpellHighlightsToTextDisplayNode(node, a);
      }
    });
  });
}

function ctxMenuExecFormat(cmd) {
  if (!textCtxMenuTargetId) return;
  const tid = textCtxMenuTargetId;
  if (state.editingAnnotationId !== tid) {
    state.editingAnnotationId = tid;
    state.selectedAnnotationId = tid;
    renderAnnotations();
  }
  const host = annotationLayer?.querySelector?.(`[data-id="${tid}"]`);
  const ed = getAnnotationTextEditor(host);
  if (!ed || ed.contentEditable !== "true") return;
  ed.focus();
  const sel = window.getSelection();
  if (!sel) return;
  if (sel.isCollapsed) {
    const range = document.createRange();
    range.selectNodeContents(ed);
    sel.removeAllRanges();
    sel.addRange(range);
  } else if (!ed.contains(sel.anchorNode) || !ed.contains(sel.focusNode)) {
    return;
  }
  try {
    document.execCommand(cmd, false, null);
  } catch {}
  const tab = getActiveTab();
  const loc = tab ? findAnnotationLocation(tab, tid) : null;
  if (loc?.item) {
    captureSnapshot(tab);
    syncTextFromEditor(loc.item, ed);
    scheduleAutoSave();
  }
  syncCtxTextFormatButtons();
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
      const c = btn.dataset.cmd;
      if (c) ctxMenuExecFormat(c);
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
    logText("ctxShapeMenuHide", { hadTarget: Boolean(shapeCtxMenuTargetId) });
  } catch {
    /* ignore */
  }
  try {
    ensureShapeAnnotationCtxMenuEl()?.classList?.add?.("hidden");
  } catch {}
  shapeCtxMenuTargetId = null;
  globalThis.__maniCtxShapeBackup = undefined;
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
  commitActiveTextEditIfNeeded(annotationId);
  cancelPointerInteraction();
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
  renderAnnotations();
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
  try {
    window.syncManiColorSwatches?.();
  } catch {
    /* ignore */
  }
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
  commitActiveTextEditIfNeeded(annotationId);
  cancelPointerInteraction();
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
  renderAnnotations();
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
    shapeBackdropOp: "Opacite fond (%)",
    ctxSpellTitle: "Orthographe",
    ctxSpellWord: "Mot",
    ctxSpellReplace: "Remplacer par",
    ctxSpellAddDict: "Ajouter au dictionnaire",
    ctxSpellRemoveDict: "Retirer du dictionnaire",
    ctxSpellNoIssue: "Aucune erreur detectee.",
    ctxSpellDictUnavailable: "Correcteur indisponible (dictionnaire non charge).",
    ctxSpellLoading: "Verification…",
    welcomeSubtitleHtml:
      "Ouvre un PDF via la barre <strong>Fichier</strong> (visible en plein ecran, ou avec <strong>F10</strong>) ou le menu <strong>Fichier &gt; Ouvrir PDF</strong> pour commencer.",
    thumbAddsCount: "{{n}} ajout(s)",
    changePageLine: "Page {{n}}",
    annElem: "Element",
    annTextWin: "Fenetre texte",
    annImage: "Image",
    shapeRect: "Rectangle",
    shapeEllipse: "Ellipse",
    shapeTriangle: "Triangle",
    shapeLine: "Ligne",
    shapeDiamond: "Losange",
    shapePentagon: "Pentagone",
    shapeHexagon: "Hexagone",
    shapeOctagon: "Octogone",
    shapeStar: "Etoile",
    shapeArrow: "Fleche",
    shapeHeart: "Coeur",
    shapeCross: "Croix",
    shapeParallelogram: "Parallelogramme",
    shapeTrapezoid: "Trapeze",
    emptyTextPreview: "(texte vide)",
    imageAdded: "Image ajoutee",
    imageNamed: "Image: {{name}}",
    shapeSummaryPrefix: "Forme: {{label}}",
    splitWorkspaceTitle: "Split — repartition des pages",
    splitWorkspaceHint:
      "Miniatures par page. Glissez entre les groupes (Shift / Ctrl pour la selection). Valider pour creer un PDF par groupe. Brouillon enregistre automatiquement.",
    splitAddGroup: "+ Groupe",
    splitValidate: "Valider",
    splitGroupLabel: "Groupe",
    splitDeleteGroup: "Supprimer",
    splitGroupNameAria: "Nom du groupe",
    splitThumbPage: "p. {{n}}",
    splitGroupNumbered: "groupe {{n}}",
    splitDefaultBaseName: "groupe",
    shapePickerTitle: "Choisir une forme",
    shapeBtnRect: "Rectangle",
    shapeBtnEllipse: "Ellipse",
    shapeBtnTriangle: "Triangle",
    shapeBtnLine: "Ligne",
    shapeBtnDiamond: "Losange",
    shapeBtnPentagon: "Pentagone",
    shapeBtnHexagon: "Hexagone",
    shapeBtnOctagon: "Octogone",
    shapeBtnStar: "Etoile",
    shapeBtnArrow: "Fleche",
    shapeBtnHeart: "Coeur",
    shapeBtnCross: "Croix",
    shapeBtnParallelogram: "Parallelogramme",
    shapeBtnTrapezoid: "Trapeze",
    ctxMenuText: "Texte",
    ctxMenuShape: "Forme",
    ctxMenuImage: "Image",
    ctxBlankTitle: "Ajouter",
    blankAddText: "Ajouter texte",
    blankAddShape: "Ajouter forme",
    blankAddImage: "Ajouter image",
    maniColorTitle: "Couleur",
    maniColorValidate: "Valider",
    maniColorEyedropper: "Pipette",
    propMargins: "Marges",
    closeAria: "Fermer",
    ttToolbarFile: "Fichier : ouvrir, enregistrer sous, quitter.",
    ttToolbarOpenPdf: "Ouvre un fichier PDF.",
    ttToolbarSaveAs: "Enregistre un nouveau PDF (Ctrl+S).",
    ttToolbarQuit: "Ferme l'application.",
    ttToolbarOptions: "Options : langue, etc.",
    ttMerge: "Fusionne les PDFs ouverts en un seul fichier.",
    ttSplit: "Divise le PDF actif en plusieurs groupes de pages.",
    ttCompress: "Cree une version compressee du PDF actif.",
    ttProtect: "Protege le PDF actif avec un mot de passe.",
    ttUnprotect: "Retire la protection d'un PDF avec son mot de passe.",
    ttAboutMenu: "Informations sur Editify.",
    ttAboutBtn: "A propos d'Editify",
    ttCloseApp: "Fermer l'application",
    ttAddText: "Ajoute une zone de texte modifiable sur la page active.",
    ttAddShape: "Ajoute une forme : clique puis choisis la forme dans la liste.",
    ttAddImage: "Insere une image locale dans le document.",
    ttDelete: "Supprime l'element actuellement selectionne.",
    ttUndo: "Annule la derniere modification.",
    ttRedo: "Retablit la modification annulee.",
    ttFitWidth: "Ajuste le PDF a la largeur de la fenetre.",
    ttFitPage: "Ajuste le PDF entier dans la fenetre.",
    ttValidateTextColor: "Applique la couleur de texte selectionnee.",
    ttValidateBg: "Applique la couleur de fond selectionnee.",
    ttApplyProps: "Applique les proprietes au champ texte selectionne.",
    ttPrevPage: "Affiche la page precedente.",
    ttNextPage: "Affiche la page suivante.",
    ttZoomOut: "Dezoome le document. Raccourci : Ctrl + molette.",
    ttZoomIn: "Zoome le document. Raccourci : Ctrl + molette.",
    stLinkOpenFailed: "Impossible d'ouvrir le lien automatiquement. Copiez/collez l'URL.",
    stSessionRecovered: "Session reparee.",
    stPythonUnavailable: "Service Python indisponible.",
    stPythonMissingPypdf: "Attention : pypdf absent. Installez-le : python -m pip install pypdf",
    stPdfRenderError: "Erreur rendu PDF.",
    stZoomFitPage: "Affichage ajuste a la page",
    stZoomFitWidth: "Affichage ajuste a la largeur",
    stRendering: "Rendu pages {{a}}/{{b}}…",
    stPdfLoadedHint: "PDF charge — Cliquez sur + Texte pour annoter",
    stPdfLoadedNamed: "PDF charge : {{name}}",
    stPdfLoadedHint2: "PDF charge — Cliquez sur + Texte pour annoter",
    stSelectionCancelled: "Selection annulee.",
    stSplitNoPdf: "Split : aucun PDF actif.",
    stSplitNotReady: "Split : document non pret.",
    stSplitNoPages: "Split : aucun groupe avec des pages.",
    stMergeNeedTwo: "Fusion : ouvrez au moins 2 PDF.",
    stCompressNoPdf: "Compression : aucun PDF actif.",
    stProtectNoPdf: "Protect : aucun PDF actif.",
    stProtectCancelled: "Protect annule (mot de passe requis).",
    stUnprotectNoPdf: "Unprotect : aucun PDF actif.",
    stUnprotectCancelled: "Unprotect annule.",
    stSaveAsNoPdf: "Enregistrer sous : aucun PDF actif.",
    stSaveAsCancelled: "Enregistrer sous annule.",
    stExporting: "Export PDF…",
    stExported: "PDF exporte.",
    stExportFailed: "Export PDF echoue.",
    stCopied: "Element copie",
    stCut: "Element coupe",
    stPasted: "Element colle",
    stJobRefused: "Job refuse.",
    stMergeJobAdded: "Job fusion ajoute.",
    stSplitJobAdded: "Job split (groupes) ajoute.",
    stCompressJobAdded: "Job compression ajoute.",
    stProtectJobAdded: "Job protect ajoute.",
    stUnprotectJobAdded: "Job unprotect ajoute.",
    ctxRotationDeg: "Rotation (°)",
    ctxOpacityPctLabel: "Opacite (%)",
    ctxShapeFillClear: "Remplissage transparent",
    ctxShapeStrokeClear: "Contour transparent",
    ctxShapeBackdropClear: "Fond transparent",
    ctxMenuColor: "Couleur",
    ctxStrokeWidthPx: "Epaisseur (px)",
    ctxShapeBackdropShort: "Fond derriere",
    ctxTextBgClear: "Fond transparent",
    promptProtectPassword: "Mot de passe de protection",
    promptUnprotectPassword: "Mot de passe actuel",
    ctxFmtBold: "Gras",
    ctxFmtItalic: "Italique",
    ctxFmtUnderline: "Souligne",
    ariaWorkbench: "Espace de travail",
    ariaNavPages: "Navigation pages",
    ariaZoom: "Controles de zoom",
    toastAria: "Notifications",
    ariaAppToolbar: "Barre d'outils application",
    shapeModalAria: "Choix de forme",
    maniColorRgbAria: "Valeurs RGB"
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
    shapeBackdropOp: "Backdrop opacity (%)",
    ctxSpellTitle: "Spelling",
    ctxSpellWord: "Word",
    ctxSpellReplace: "Replace with",
    ctxSpellAddDict: "Add to dictionary",
    ctxSpellRemoveDict: "Remove from dictionary",
    ctxSpellNoIssue: "No spelling issues.",
    ctxSpellDictUnavailable: "Spell checker unavailable (dictionary not loaded).",
    ctxSpellLoading: "Checking…",
    welcomeSubtitleHtml:
      "Open a PDF via the <strong>File</strong> toolbar (visible in full screen, or with <strong>F10</strong>) or <strong>File &gt; Open PDF</strong> to get started.",
    thumbAddsCount: "{{n}} add(s)",
    changePageLine: "Page {{n}}",
    annElem: "Item",
    annTextWin: "Text box",
    annImage: "Image",
    shapeRect: "Rectangle",
    shapeEllipse: "Ellipse",
    shapeTriangle: "Triangle",
    shapeLine: "Line",
    shapeDiamond: "Diamond",
    shapePentagon: "Pentagon",
    shapeHexagon: "Hexagon",
    shapeOctagon: "Octagon",
    shapeStar: "Star",
    shapeArrow: "Arrow",
    shapeHeart: "Heart",
    shapeCross: "Cross",
    shapeParallelogram: "Parallelogram",
    shapeTrapezoid: "Trapezoid",
    emptyTextPreview: "(empty text)",
    imageAdded: "Image added",
    imageNamed: "Image: {{name}}",
    shapeSummaryPrefix: "Shape: {{label}}",
    splitWorkspaceTitle: "Split — page groups",
    splitWorkspaceHint:
      "Thumbnails per page. Drag between groups (Shift / Ctrl to select). Validate to create one PDF per group. Draft saved automatically.",
    splitAddGroup: "+ Group",
    splitValidate: "Validate",
    splitGroupLabel: "Group",
    splitDeleteGroup: "Remove",
    splitGroupNameAria: "Group name",
    splitThumbPage: "p. {{n}}",
    splitGroupNumbered: "group {{n}}",
    splitDefaultBaseName: "group",
    shapePickerTitle: "Choose a shape",
    shapeBtnRect: "Rectangle",
    shapeBtnEllipse: "Ellipse",
    shapeBtnTriangle: "Triangle",
    shapeBtnLine: "Line",
    shapeBtnDiamond: "Diamond",
    shapeBtnPentagon: "Pentagon",
    shapeBtnHexagon: "Hexagon",
    shapeBtnOctagon: "Octagon",
    shapeBtnStar: "Star",
    shapeBtnArrow: "Arrow",
    shapeBtnHeart: "Heart",
    shapeBtnCross: "Cross",
    shapeBtnParallelogram: "Parallelogram",
    shapeBtnTrapezoid: "Trapezoid",
    ctxMenuText: "Text",
    ctxMenuShape: "Shape",
    ctxMenuImage: "Image",
    ctxBlankTitle: "Add",
    blankAddText: "Add text",
    blankAddShape: "Add shape",
    blankAddImage: "Add image",
    maniColorTitle: "Color",
    maniColorValidate: "Apply",
    maniColorEyedropper: "Eyedropper",
    propMargins: "Padding",
    closeAria: "Close",
    ttToolbarFile: "File: open, save as, quit.",
    ttToolbarOpenPdf: "Open a PDF file.",
    ttToolbarSaveAs: "Save a new PDF (Ctrl+S).",
    ttToolbarQuit: "Quit the application.",
    ttToolbarOptions: "Options: language, etc.",
    ttMerge: "Merge open PDFs into one file.",
    ttSplit: "Split the active PDF into several page groups.",
    ttCompress: "Create a compressed copy of the active PDF.",
    ttProtect: "Protect the active PDF with a password.",
    ttUnprotect: "Remove protection with the password.",
    ttAboutMenu: "About Editify.",
    ttAboutBtn: "About Editify",
    ttCloseApp: "Close the application",
    ttAddText: "Add an editable text area on the active page.",
    ttAddShape: "Add a shape: click then pick from the list.",
    ttAddImage: "Insert a local image into the document.",
    ttDelete: "Delete the currently selected item.",
    ttUndo: "Undo the last change.",
    ttRedo: "Redo the undone change.",
    ttFitWidth: "Fit the PDF to the window width.",
    ttFitPage: "Fit the whole PDF in the window.",
    ttValidateTextColor: "Apply the selected text color.",
    ttValidateBg: "Apply the selected background color.",
    ttApplyProps: "Apply properties to the selected text box.",
    ttPrevPage: "Show the previous page.",
    ttNextPage: "Show the next page.",
    ttZoomOut: "Zoom out. Shortcut: Ctrl + wheel.",
    ttZoomIn: "Zoom in. Shortcut: Ctrl + wheel.",
    stLinkOpenFailed: "Could not open the link automatically. Copy/paste the URL.",
    stSessionRecovered: "Session repaired.",
    stPythonUnavailable: "Python service unavailable.",
    stPythonMissingPypdf: "Warning: pypdf missing. Install: python -m pip install pypdf",
    stPdfRenderError: "PDF rendering error.",
    stZoomFitPage: "View fitted to page",
    stZoomFitWidth: "View fitted to width",
    stRendering: "Rendering pages {{a}}/{{b}}…",
    stPdfLoadedHint: "PDF loaded — click + Text to annotate",
    stPdfLoadedNamed: "PDF loaded: {{name}}",
    stPdfLoadedHint2: "PDF loaded — click + Text to annotate",
    stSelectionCancelled: "Selection cancelled.",
    stSplitNoPdf: "Split: no active PDF.",
    stSplitNotReady: "Split: document not ready.",
    stSplitNoPages: "Split: no group with pages.",
    stMergeNeedTwo: "Merge: open at least 2 PDFs.",
    stCompressNoPdf: "Compression: no active PDF.",
    stProtectNoPdf: "Protect: no active PDF.",
    stProtectCancelled: "Protect cancelled (password required).",
    stUnprotectNoPdf: "Unprotect: no active PDF.",
    stUnprotectCancelled: "Unprotect cancelled.",
    stSaveAsNoPdf: "Save as: no active PDF.",
    stSaveAsCancelled: "Save as cancelled.",
    stExporting: "Exporting PDF…",
    stExported: "PDF exported.",
    stExportFailed: "PDF export failed.",
    stCopied: "Item copied",
    stCut: "Item cut",
    stPasted: "Item pasted",
    stJobRefused: "Job refused.",
    stMergeJobAdded: "Merge job queued.",
    stSplitJobAdded: "Split job queued.",
    stCompressJobAdded: "Compress job queued.",
    stProtectJobAdded: "Protect job queued.",
    stUnprotectJobAdded: "Unprotect job queued.",
    ctxRotationDeg: "Rotation (°)",
    ctxOpacityPctLabel: "Opacity (%)",
    ctxShapeFillClear: "Clear fill",
    ctxShapeStrokeClear: "Clear outline",
    ctxShapeBackdropClear: "Clear backdrop",
    ctxMenuColor: "Color",
    ctxStrokeWidthPx: "Width (px)",
    ctxShapeBackdropShort: "Backdrop",
    ctxTextBgClear: "Transparent background",
    promptProtectPassword: "Protection password",
    promptUnprotectPassword: "Current password",
    ctxFmtBold: "Bold",
    ctxFmtItalic: "Italic",
    ctxFmtUnderline: "Underline",
    ariaWorkbench: "Workbench",
    ariaNavPages: "Page navigation",
    ariaZoom: "Zoom controls",
    toastAria: "Notifications",
    ariaAppToolbar: "Application toolbar",
    shapeModalAria: "Shape picker",
    maniColorRgbAria: "RGB values"
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
    shapeBackdropOp: "Opacidad fondo (%)",
    ctxSpellTitle: "Ortografia",
    ctxSpellWord: "Palabra",
    ctxSpellReplace: "Sustituir por",
    ctxSpellAddDict: "Anadir al diccionario",
    ctxSpellRemoveDict: "Quitar del diccionario",
    ctxSpellNoIssue: "Sin errores detectados.",
    ctxSpellDictUnavailable: "Corrector no disponible (diccionario no cargado).",
    ctxSpellLoading: "Comprobando…",
    welcomeSubtitleHtml:
      "Abre un PDF desde la barra <strong>Archivo</strong> (visible a pantalla completa, o con <strong>F10</strong>) o <strong>Archivo &gt; Abrir PDF</strong> para empezar.",
    thumbAddsCount: "{{n}} anadido(s)",
    changePageLine: "Pagina {{n}}",
    annElem: "Elemento",
    annTextWin: "Cuadro de texto",
    annImage: "Imagen",
    shapeRect: "Rectangulo",
    shapeEllipse: "Elipse",
    shapeTriangle: "Triangulo",
    shapeLine: "Linea",
    shapeDiamond: "Rombo",
    shapePentagon: "Pentagono",
    shapeHexagon: "Hexagono",
    shapeOctagon: "Octogono",
    shapeStar: "Estrella",
    shapeArrow: "Flecha",
    shapeHeart: "Corazon",
    shapeCross: "Cruz",
    shapeParallelogram: "Paralelogramo",
    shapeTrapezoid: "Trapecio",
    emptyTextPreview: "(texto vacio)",
    imageAdded: "Imagen anadida",
    imageNamed: "Imagen: {{name}}",
    shapeSummaryPrefix: "Forma: {{label}}",
    splitWorkspaceTitle: "Split — grupos de paginas",
    splitWorkspaceHint:
      "Miniaturas por pagina. Arrastre entre grupos (Mayus / Ctrl para seleccion). Validar para crear un PDF por grupo. Borrador guardado automaticamente.",
    splitAddGroup: "+ Grupo",
    splitValidate: "Validar",
    splitGroupLabel: "Grupo",
    splitDeleteGroup: "Eliminar",
    splitGroupNameAria: "Nombre del grupo",
    splitThumbPage: "p. {{n}}",
    splitGroupNumbered: "grupo {{n}}",
    splitDefaultBaseName: "grupo",
    shapePickerTitle: "Elegir una forma",
    shapeBtnRect: "Rectangulo",
    shapeBtnEllipse: "Elipse",
    shapeBtnTriangle: "Triangulo",
    shapeBtnLine: "Linea",
    shapeBtnDiamond: "Rombo",
    shapeBtnPentagon: "Pentagono",
    shapeBtnHexagon: "Hexagono",
    shapeBtnOctagon: "Octogono",
    shapeBtnStar: "Estrella",
    shapeBtnArrow: "Flecha",
    shapeBtnHeart: "Corazon",
    shapeBtnCross: "Cruz",
    shapeBtnParallelogram: "Paralelogramo",
    shapeBtnTrapezoid: "Trapecio",
    ctxMenuText: "Texto",
    ctxMenuShape: "Forma",
    ctxMenuImage: "Imagen",
    ctxBlankTitle: "Anadir",
    blankAddText: "Anadir texto",
    blankAddShape: "Anadir forma",
    blankAddImage: "Anadir imagen",
    maniColorTitle: "Color",
    maniColorValidate: "Aplicar",
    maniColorEyedropper: "Cuentagotas",
    propMargins: "Margenes",
    closeAria: "Cerrar",
    ttToolbarFile: "Archivo: abrir, guardar como, salir.",
    ttToolbarOpenPdf: "Abre un archivo PDF.",
    ttToolbarSaveAs: "Guarda un PDF nuevo (Ctrl+S).",
    ttToolbarQuit: "Cierra la aplicacion.",
    ttToolbarOptions: "Opciones: idioma, etc.",
    ttMerge: "Fusiona los PDF abiertos en un solo archivo.",
    ttSplit: "Divide el PDF activo en varios grupos de paginas.",
    ttCompress: "Crea una version comprimida del PDF activo.",
    ttProtect: "Protege el PDF activo con contrasena.",
    ttUnprotect: "Quita la proteccion con la contrasena.",
    ttAboutMenu: "Informacion sobre Editify.",
    ttAboutBtn: "Acerca de Editify",
    ttCloseApp: "Cerrar la aplicacion",
    ttAddText: "Anade un area de texto editable en la pagina activa.",
    ttAddShape: "Anade una forma: clic y elige en la lista.",
    ttAddImage: "Inserta una imagen local en el documento.",
    ttDelete: "Elimina el elemento seleccionado.",
    ttUndo: "Deshace el ultimo cambio.",
    ttRedo: "Rehace el cambio deshecho.",
    ttFitWidth: "Ajusta el PDF al ancho de la ventana.",
    ttFitPage: "Ajusta el PDF entero en la ventana.",
    ttValidateTextColor: "Aplica el color de texto seleccionado.",
    ttValidateBg: "Aplica el color de fondo seleccionado.",
    ttApplyProps: "Aplica las propiedades al cuadro de texto seleccionado.",
    ttPrevPage: "Muestra la pagina anterior.",
    ttNextPage: "Muestra la pagina siguiente.",
    ttZoomOut: "Aleja. Atajo: Ctrl + rueda.",
    ttZoomIn: "Acerca. Atajo: Ctrl + rueda.",
    stLinkOpenFailed: "No se pudo abrir el enlace automaticamente. Copie/pega la URL.",
    stSessionRecovered: "Sesion reparada.",
    stPythonUnavailable: "Servicio Python no disponible.",
    stPythonMissingPypdf: "Atencion: falta pypdf. Instale: python -m pip install pypdf",
    stPdfRenderError: "Error al renderizar el PDF.",
    stZoomFitPage: "Vista ajustada a la pagina",
    stZoomFitWidth: "Vista ajustada al ancho",
    stRendering: "Renderizando paginas {{a}}/{{b}}…",
    stPdfLoadedHint: "PDF cargado — pulse + Texto para anotar",
    stPdfLoadedNamed: "PDF cargado: {{name}}",
    stPdfLoadedHint2: "PDF cargado — pulse + Texto para anotar",
    stSelectionCancelled: "Seleccion cancelada.",
    stSplitNoPdf: "Split: ningun PDF activo.",
    stSplitNotReady: "Split: documento no listo.",
    stSplitNoPages: "Split: ningun grupo con paginas.",
    stMergeNeedTwo: "Fusion: abra al menos 2 PDF.",
    stCompressNoPdf: "Compresion: ningun PDF activo.",
    stProtectNoPdf: "Proteger: ningun PDF activo.",
    stProtectCancelled: "Proteccion cancelada (sin contrasena).",
    stUnprotectNoPdf: "Desproteger: ningun PDF activo.",
    stUnprotectCancelled: "Desproteccion cancelada.",
    stSaveAsNoPdf: "Guardar como: ningun PDF activo.",
    stSaveAsCancelled: "Guardar como cancelado.",
    stExporting: "Exportando PDF…",
    stExported: "PDF exportado.",
    stExportFailed: "Exportacion PDF fallida.",
    stCopied: "Elemento copiado",
    stCut: "Elemento cortado",
    stPasted: "Elemento pegado",
    stJobRefused: "Trabajo rechazado.",
    stMergeJobAdded: "Trabajo fusion encolado.",
    stSplitJobAdded: "Trabajo split encolado.",
    stCompressJobAdded: "Trabajo compresion encolado.",
    stProtectJobAdded: "Trabajo proteger encolado.",
    stUnprotectJobAdded: "Trabajo desproteger encolado.",
    ctxRotationDeg: "Rotacion (°)",
    ctxOpacityPctLabel: "Opacidad (%)",
    ctxShapeFillClear: "Relleno transparente",
    ctxShapeStrokeClear: "Borde transparente",
    ctxShapeBackdropClear: "Fondo transparente",
    ctxMenuColor: "Color",
    ctxStrokeWidthPx: "Grosor (px)",
    ctxShapeBackdropShort: "Fondo",
    ctxTextBgClear: "Fondo transparente",
    promptProtectPassword: "Contrasena de proteccion",
    promptUnprotectPassword: "Contrasena actual",
    ctxFmtBold: "Negrita",
    ctxFmtItalic: "Cursiva",
    ctxFmtUnderline: "Subrayado",
    ariaWorkbench: "Area de trabajo",
    ariaNavPages: "Navegacion de paginas",
    ariaZoom: "Controles de zoom",
    toastAria: "Notificaciones",
    ariaAppToolbar: "Barra de herramientas",
    shapeModalAria: "Elegir forma",
    maniColorRgbAria: "Valores RGB"
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
    shapeBackdropOp: "Opacidade fundo (%)",
    ctxSpellTitle: "Ortografia",
    ctxSpellWord: "Palavra",
    ctxSpellReplace: "Substituir por",
    ctxSpellAddDict: "Adicionar ao dicionario",
    ctxSpellRemoveDict: "Remover do dicionario",
    ctxSpellNoIssue: "Nenhum erro detetado.",
    ctxSpellDictUnavailable: "Corretor indisponivel (dicionario nao carregado).",
    ctxSpellLoading: "A verificar…",
    welcomeSubtitleHtml:
      "Abra um PDF pela barra <strong>Ficheiro</strong> (visivel em ecra inteiro, ou com <strong>F10</strong>) ou <strong>Ficheiro &gt; Abrir PDF</strong> para comecar.",
    thumbAddsCount: "{{n}} adicao(oes)",
    changePageLine: "Pagina {{n}}",
    annElem: "Elemento",
    annTextWin: "Caixa de texto",
    annImage: "Imagem",
    shapeRect: "Retangulo",
    shapeEllipse: "Elipse",
    shapeTriangle: "Triangulo",
    shapeLine: "Linha",
    shapeDiamond: "Losango",
    shapePentagon: "Pentagono",
    shapeHexagon: "Hexagono",
    shapeOctagon: "Octogono",
    shapeStar: "Estrela",
    shapeArrow: "Seta",
    shapeHeart: "Coracao",
    shapeCross: "Cruz",
    shapeParallelogram: "Paralelogramo",
    shapeTrapezoid: "Trapezio",
    emptyTextPreview: "(texto vazio)",
    imageAdded: "Imagem adicionada",
    imageNamed: "Imagem: {{name}}",
    shapeSummaryPrefix: "Forma: {{label}}",
    splitWorkspaceTitle: "Split — grupos de paginas",
    splitWorkspaceHint:
      "Miniaturas por pagina. Arraste entre grupos (Shift / Ctrl para selecionar). Validar para criar um PDF por grupo. Rascunho guardado automaticamente.",
    splitAddGroup: "+ Grupo",
    splitValidate: "Validar",
    splitGroupLabel: "Grupo",
    splitDeleteGroup: "Remover",
    splitGroupNameAria: "Nome do grupo",
    splitThumbPage: "p. {{n}}",
    splitGroupNumbered: "grupo {{n}}",
    splitDefaultBaseName: "grupo",
    shapePickerTitle: "Escolher uma forma",
    shapeBtnRect: "Retangulo",
    shapeBtnEllipse: "Elipse",
    shapeBtnTriangle: "Triangulo",
    shapeBtnLine: "Linha",
    shapeBtnDiamond: "Losango",
    shapeBtnPentagon: "Pentagono",
    shapeBtnHexagon: "Hexagono",
    shapeBtnOctagon: "Octogono",
    shapeBtnStar: "Estrela",
    shapeBtnArrow: "Seta",
    shapeBtnHeart: "Coracao",
    shapeBtnCross: "Cruz",
    shapeBtnParallelogram: "Paralelogramo",
    shapeBtnTrapezoid: "Trapezio",
    ctxMenuText: "Texto",
    ctxMenuShape: "Forma",
    ctxMenuImage: "Imagem",
    ctxBlankTitle: "Adicionar",
    blankAddText: "Adicionar texto",
    blankAddShape: "Adicionar forma",
    blankAddImage: "Adicionar imagem",
    maniColorTitle: "Cor",
    maniColorValidate: "Aplicar",
    maniColorEyedropper: "Conta-gotas",
    propMargins: "Margens",
    closeAria: "Fechar",
    ttToolbarFile: "Ficheiro: abrir, guardar como, sair.",
    ttToolbarOpenPdf: "Abre um ficheiro PDF.",
    ttToolbarSaveAs: "Guarda um PDF novo (Ctrl+S).",
    ttToolbarQuit: "Fecha a aplicacao.",
    ttToolbarOptions: "Opcoes: idioma, etc.",
    ttMerge: "Junta os PDF abertos num so ficheiro.",
    ttSplit: "Divide o PDF ativo em varios grupos de paginas.",
    ttCompress: "Cria uma versao comprimida do PDF ativo.",
    ttProtect: "Protege o PDF ativo com palavra-passe.",
    ttUnprotect: "Remove a protecao com a palavra-passe.",
    ttAboutMenu: "Informacoes sobre o Editify.",
    ttAboutBtn: "Sobre o Editify",
    ttCloseApp: "Fechar a aplicacao",
    ttAddText: "Adiciona uma area de texto editavel na pagina ativa.",
    ttAddShape: "Adiciona uma forma: clique e escolha na lista.",
    ttAddImage: "Insere uma imagem local no documento.",
    ttDelete: "Remove o elemento selecionado.",
    ttUndo: "Anula a ultima alteracao.",
    ttRedo: "Refaz a alteracao anulada.",
    ttFitWidth: "Ajusta o PDF a largura da janela.",
    ttFitPage: "Ajusta o PDF inteiro na janela.",
    ttValidateTextColor: "Aplica a cor de texto selecionada.",
    ttValidateBg: "Aplica a cor de fundo selecionada.",
    ttApplyProps: "Aplica as propriedades a caixa de texto selecionada.",
    ttPrevPage: "Mostra a pagina anterior.",
    ttNextPage: "Mostra a pagina seguinte.",
    ttZoomOut: "Afasta. Atalho: Ctrl + roda.",
    ttZoomIn: "Aproxima. Atalho: Ctrl + roda.",
    stLinkOpenFailed: "Nao foi possivel abrir a ligacao automaticamente. Copie/cole o URL.",
    stSessionRecovered: "Sessao reparada.",
    stPythonUnavailable: "Servico Python indisponivel.",
    stPythonMissingPypdf: "Aviso: falta pypdf. Instale: python -m pip install pypdf",
    stPdfRenderError: "Erro ao renderizar o PDF.",
    stZoomFitPage: "Vista ajustada a pagina",
    stZoomFitWidth: "Vista ajustada a largura",
    stRendering: "A renderizar paginas {{a}}/{{b}}…",
    stPdfLoadedHint: "PDF carregado — clique + Texto para anotar",
    stPdfLoadedNamed: "PDF carregado: {{name}}",
    stPdfLoadedHint2: "PDF carregado — clique + Texto para anotar",
    stSelectionCancelled: "Selecao cancelada.",
    stSplitNoPdf: "Split: nenhum PDF ativo.",
    stSplitNotReady: "Split: documento nao pronto.",
    stSplitNoPages: "Split: nenhum grupo com paginas.",
    stMergeNeedTwo: "Fusao: abra pelo menos 2 PDF.",
    stCompressNoPdf: "Compressao: nenhum PDF ativo.",
    stProtectNoPdf: "Proteger: nenhum PDF ativo.",
    stProtectCancelled: "Proteccao cancelada (palavra-passe necessaria).",
    stUnprotectNoPdf: "Desproteger: nenhum PDF ativo.",
    stUnprotectCancelled: "Desproteccao cancelada.",
    stSaveAsNoPdf: "Guardar como: nenhum PDF ativo.",
    stSaveAsCancelled: "Guardar como cancelado.",
    stExporting: "A exportar PDF…",
    stExported: "PDF exportado.",
    stExportFailed: "Exportacao PDF falhou.",
    stCopied: "Elemento copiado",
    stCut: "Elemento cortado",
    stPasted: "Elemento colado",
    stJobRefused: "Trabalho recusado.",
    stMergeJobAdded: "Trabalho fusao em fila.",
    stSplitJobAdded: "Trabalho split em fila.",
    stCompressJobAdded: "Trabalho compressao em fila.",
    stProtectJobAdded: "Trabalho proteger em fila.",
    stUnprotectJobAdded: "Trabalho desproteger em fila.",
    ctxRotationDeg: "Rotacao (°)",
    ctxOpacityPctLabel: "Opacidade (%)",
    ctxShapeFillClear: "Preenchimento transparente",
    ctxShapeStrokeClear: "Contorno transparente",
    ctxShapeBackdropClear: "Fundo transparente",
    ctxMenuColor: "Cor",
    ctxStrokeWidthPx: "Espessura (px)",
    ctxShapeBackdropShort: "Fundo",
    ctxTextBgClear: "Fundo transparente",
    promptProtectPassword: "Palavra-passe de protecao",
    promptUnprotectPassword: "Palavra-passe actual",
    ctxFmtBold: "Negrito",
    ctxFmtItalic: "Italico",
    ctxFmtUnderline: "Sublinhado",
    ariaWorkbench: "Area de trabalho",
    ariaNavPages: "Navegacao de paginas",
    ariaZoom: "Controles de zoom",
    toastAria: "Notificacoes",
    ariaAppToolbar: "Barra de ferramentas",
    shapeModalAria: "Escolher forma",
    maniColorRgbAria: "Valores RGB"
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

  /** Contour en pixels écran (pas en unités viewBox) : évite bords latéraux plus épais quand la forme est étirée. */
  const setStrokeAttrs = (el) => {
    if (strokePaint === "none") {
      el.setAttribute("stroke", "none");
      el.setAttribute("stroke-width", "0");
      el.removeAttribute("vector-effect");
    } else {
      el.setAttribute("stroke", strokePaint);
      el.setAttribute("stroke-width", String(Math.max(0.001, swPx)));
      el.setAttribute("vector-effect", "non-scaling-stroke");
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
    if (sa < 0.001) {
      ln.setAttribute("stroke", "none");
      ln.setAttribute("stroke-width", "0");
    } else {
      ln.setAttribute("stroke", hexToRgba(sc, sa));
      ln.setAttribute("stroke-width", String(Math.max(0.001, swLine)));
      ln.setAttribute("vector-effect", "non-scaling-stroke");
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
  if (item.textHtml && String(item.textHtml).trim()) {
    const div = document.createElement("div");
    div.innerHTML = sanitizeTextHtml(item.textHtml);
    // Aligné sur Range.toString() / getPlainSelectionOffsetsInEditor (pas innerText sur nœud détaché).
    const rng = document.createRange();
    rng.selectNodeContents(div);
    return String(rng.toString() || "").replace(/\r\n/g, "\n");
  }
  return String(item.text || "");
}

/**
 * Borne DOM pour un index dans la chaîne alignée sur Range.toString() (texte + BR → un caractère \n).
 * Même repère que plainTextForAnnotationItem / getPlainSelectionOffsetsInEditor.
 */
function getTextBoundaryInRoot(root, charIndex) {
  if (charIndex < 0) return null;
  const full = (() => {
    const r = document.createRange();
    r.selectNodeContents(root);
    return String(r.toString() || "").replace(/\r\n/g, "\n");
  })();
  if (charIndex > full.length) return null;

  let acc = 0;

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.nodeValue.length;
      if (charIndex < acc + len) {
        return { node, offset: charIndex - acc };
      }
      if (charIndex === acc + len) {
        return { node, offset: len };
      }
      acc += len;
      return null;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "BR") {
        if (charIndex === acc) {
          const parent = node.parentNode;
          const idx = Array.prototype.indexOf.call(parent.childNodes, node);
          return { node: parent, offset: idx };
        }
        if (charIndex === acc + 1) {
          const parent = node.parentNode;
          const idx = Array.prototype.indexOf.call(parent.childNodes, node);
          return { node: parent, offset: idx + 1 };
        }
        acc += 1;
        return null;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        const b = walk(node.childNodes[i]);
        if (b) return b;
      }
    }
    return null;
  }

  return walk(root);
}

function wrapSpellMisspellingsInDisplayRoot(root, ranges) {
  if (!root || !ranges?.length) return;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const { start, end } = sorted[i];
    if (start >= end || start < 0) continue;
    const a = getTextBoundaryInRoot(root, start);
    const b = getTextBoundaryInRoot(root, end);
    if (!a || !b) continue;
    const range = document.createRange();
    try {
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
    } catch {
      continue;
    }
    const span = document.createElement("span");
    span.className = "mani-spell-miss";
    span.setAttribute("role", "presentation");
    try {
      range.surroundContents(span);
    } catch {
      try {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      } catch {
        /* ignore */
      }
    }
  }
}

function applySpellHighlightsToTextDisplayNode(node, item) {
  if (!node || item.type !== "text") return;
  const plain = plainTextForAnnotationItem(item);
  const ranges = item._spellErrors;
  if (!plain || !ranges?.length) return;
  const rng = document.createRange();
  rng.selectNodeContents(node);
  const live = String(rng.toString() || "").replace(/\r\n/g, "\n");
  const p = plain.replace(/\r\n/g, "\n");
  if (live !== p) return;
  wrapSpellMisspellingsInDisplayRoot(node, ranges);
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
  delete a._spellErrors;
}

function getAnnotationTextEditor(root) {
  return root?.querySelector?.(".text-editor");
}

function t(key) {
  return I18N[state.language]?.[key] || I18N.fr[key] || key;
}

/** Remplace {{var}} dans une chaîne i18n. */
function tr(templateKey, vars) {
  let s = t(templateKey);
  if (vars && typeof vars === "object") {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{{${k}}}`).join(String(v));
    }
  }
  return s;
}

const SHAPE_TYPE_KEYS = {
  rect: "shapeRect",
  ellipse: "shapeEllipse",
  triangle: "shapeTriangle",
  line: "shapeLine",
  diamond: "shapeDiamond",
  pentagon: "shapePentagon",
  hexagon: "shapeHexagon",
  octagon: "shapeOctagon",
  star: "shapeStar",
  arrow: "shapeArrow",
  heart: "shapeHeart",
  cross: "shapeCross",
  parallelogram: "shapeParallelogram",
  trapezoid: "shapeTrapezoid"
};

const SHAPE_GRID_ICONS = {
  rect: "⬛",
  ellipse: "⚪",
  triangle: "🔺",
  line: "➖",
  diamond: "💠",
  pentagon: "🔷",
  hexagon: "⬢",
  octagon: "🛑",
  star: "⭐",
  arrow: "➡️",
  heart: "❤️",
  cross: "✚",
  parallelogram: "▱",
  trapezoid: "⏢"
};

/** Clés I18N `shapeBtnRect`… dérivées des types (évite la duplication avec SHAPE_TYPE_KEYS). */
const SHAPE_BTN_I18N_KEYS = Object.fromEntries(
  Object.keys(SHAPE_TYPE_KEYS).map((k) => [
    k,
    `shapeBtn${k.charAt(0).toUpperCase()}${k.slice(1)}`
  ])
);

/** data-tooltip → clé I18N `tt*`. */
const TOOLTIP_BY_ELEMENT_ID = {
  toolbarFileBtn: "ttToolbarFile",
  toolbarOpenPdfBtn: "ttToolbarOpenPdf",
  toolbarSaveAsBtn: "ttToolbarSaveAs",
  toolbarQuitBtn: "ttToolbarQuit",
  toolbarOptionsBtn: "ttToolbarOptions",
  mergeBtn: "ttMerge",
  splitBtn: "ttSplit",
  compressBtn: "ttCompress",
  protectBtn: "ttProtect",
  unprotectBtn: "ttUnprotect",
  toolbarAboutMenuItem: "ttAboutMenu",
  toolbarAboutBtn: "ttAboutBtn",
  toolbarCloseBtn: "ttCloseApp",
  addTextBtn: "ttAddText",
  addShapeBtn: "ttAddShape",
  addImageBtn: "ttAddImage",
  deleteSelectedBtn: "ttDelete",
  undoBtn: "ttUndo",
  redoBtn: "ttRedo",
  fitWidthBtn: "ttFitWidth",
  fitPageBtn: "ttFitPage",
  validateTextColorBtn: "ttValidateTextColor",
  applyBgBtn: "ttValidateBg",
  applyPropsBtn: "ttApplyProps",
  prevBtn: "ttPrevPage",
  nextBtn: "ttNextPage",
  zoomOutBtn: "ttZoomOut",
  zoomInBtn: "ttZoomIn"
};

function applyShapeGridLanguage() {
  if (!shapeGrid) return;
  shapeGrid.querySelectorAll("button[data-shape]").forEach((btn) => {
    const shape = btn.getAttribute("data-shape");
    const key = shape ? SHAPE_BTN_I18N_KEYS[shape] : null;
    if (!key) return;
    const icon = SHAPE_GRID_ICONS[shape] || "";
    btn.textContent = `${icon} ${t(key)}`.trim();
  });
}

function applyDataTooltipsFromMap() {
  for (const [id, i18nKey] of Object.entries(TOOLTIP_BY_ELEMENT_ID)) {
    const el = document.getElementById(id);
    if (el) el.setAttribute("data-tooltip", t(i18nKey));
  }
}

/** Libellés des menus contextuels d’annotation et du menu « canvas vierge ». */
function applyContextMenusLanguage() {
  const setEl = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  };
  setEl("ctxTextMenuTitle", "ctxMenuText");
  setEl("ctxShapeMenuTitle", "ctxMenuShape");
  setEl("ctxImageMenuTitle", "ctxMenuImage");
  setEl("blankCanvasMenuTitle", "ctxBlankTitle");
  setEl("ctxLblTextRotation", "ctxRotationDeg");
  setEl("ctxLblTextOpacity", "ctxOpacityPctLabel");
  setEl("ctxLblFont", "font");
  setEl("ctxLblSize", "size");
  setEl("ctxLblColor", "ctxMenuColor");
  setEl("ctxLblBg", "bg");
  setEl("ctxLblShapeRotation", "ctxRotationDeg");
  setEl("ctxLblShapeOpacity", "ctxOpacityPctLabel");
  setEl("ctxLblShapeFill", "shapeFill");
  setEl("ctxLblShapeFillOp", "shapeFillOp");
  setEl("ctxLblShapeStroke", "shapeStroke");
  setEl("ctxLblShapeStrokeOp", "shapeStrokeOp");
  setEl("ctxLblShapeStrokeW", "ctxStrokeWidthPx");
  setEl("ctxLblShapeBackdrop", "ctxShapeBackdropShort");
  setEl("ctxLblShapeBackdropOp", "shapeBackdropOp");
  setEl("ctxLblImageRotation", "ctxRotationDeg");
  setEl("ctxLblImageOpacity", "ctxOpacityPctLabel");
  const tbg = document.getElementById("ctxTextBgClear");
  if (tbg) tbg.textContent = t("ctxTextBgClear");
  setEl("ctxShapeFillClear", "ctxShapeFillClear");
  setEl("ctxShapeStrokeClear", "ctxShapeStrokeClear");
  setEl("ctxShapeBackdropClear", "ctxShapeBackdropClear");
  if (blankAddTextBtn) blankAddTextBtn.textContent = `🔤 ${t("blankAddText")}`;
  if (blankAddShapeBtn) blankAddShapeBtn.textContent = `🔷 ${t("blankAddShape")}`;
  if (blankAddImageBtn) blankAddImageBtn.textContent = `🖼️ ${t("blankAddImage")}`;
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
    const wsub = document.getElementById("welcomeSubtitle");
    if (wsub) wsub.innerHTML = t("welcomeSubtitleHtml");
  } catch {}
  setLabelPrefix("propWidth", t("width"));
  setLabelPrefix("propHeight", t("height"));
  setLabelPrefix("propRotation", t("rotation"));
  setLabelPrefix("propOpacity", t("opacity"));
  setLabelPrefix("propTextColor", t("txt"));
  setLabelPrefix("propBgColor", t("bg"));
  try {
    const propMarginsLabel = document.getElementById("propMarginsLabel");
    if (propMarginsLabel) propMarginsLabel.textContent = t("propMargins");
    const propFontFamilyLabel = document.getElementById("propFontFamilyLabel");
    if (propFontFamilyLabel) propFontFamilyLabel.textContent = t("font");
    const propFontSizeLabel = document.getElementById("propFontSizeLabel");
    if (propFontSizeLabel) propFontSizeLabel.textContent = t("size");
  } catch {
    /* ignore */
  }
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
  try {
    const st = document.getElementById("ctxSpellTitleEl");
    if (st) st.textContent = t("ctxSpellTitle");
    const wl = document.getElementById("ctxSpellWordLabel");
    if (wl) wl.textContent = `${t("ctxSpellWord")} :`;
    const ad = document.getElementById("ctxSpellAddDict");
    if (ad) ad.textContent = t("ctxSpellAddDict");
    const rd = document.getElementById("ctxSpellRemoveDict");
    if (rd) rd.textContent = t("ctxSpellRemoveDict");
  } catch {
    /* ignore */
  }
  try {
    applyContextMenusLanguage();
  } catch {
    /* ignore */
  }
  applyDataTooltipsFromMap();
  applyShapeGridLanguage();
  try {
    const smt = document.getElementById("shapeModalTitleEl");
    if (smt) smt.textContent = t("shapePickerTitle");
    if (shapeModal) shapeModal.setAttribute("aria-label", t("shapeModalAria"));
  } catch {
    /* ignore */
  }
  try {
    const swt = document.getElementById("splitWorkspaceTitle");
    if (swt) swt.textContent = t("splitWorkspaceTitle");
    const swh = document.getElementById("splitWorkspaceHint");
    if (swh) swh.textContent = t("splitWorkspaceHint");
    if (splitWorkspaceAddGroupBtn) splitWorkspaceAddGroupBtn.textContent = t("splitAddGroup");
    if (splitWorkspaceValidateBtn) splitWorkspaceValidateBtn.textContent = t("splitValidate");
    splitWorkspaceCloseBtn?.setAttribute("aria-label", t("closeAria"));
  } catch {
    /* ignore */
  }
  try {
    const mct = document.getElementById("maniColorModalTitle");
    if (mct) mct.textContent = t("maniColorTitle");
    const mcv = document.getElementById("maniColorValidateBtn");
    if (mcv) mcv.textContent = t("maniColorValidate");
    const mce = document.getElementById("maniColorEyedropper");
    if (mce) {
      mce.setAttribute("title", t("maniColorEyedropper"));
      mce.setAttribute("aria-label", t("maniColorEyedropper"));
    }
    document.getElementById("maniColorModalClose")?.setAttribute("aria-label", t("closeAria"));
    document.querySelector("#maniColorModal .mani-color-rgb-grid")?.setAttribute("aria-label", t("maniColorRgbAria"));
  } catch {
    /* ignore */
  }
  try {
    const del = document.getElementById("changesCtxDeleteBtn");
    if (del) del.textContent = t("del");
  } catch {
    /* ignore */
  }
  try {
    document.getElementById("ctxTextBold")?.setAttribute("title", t("ctxFmtBold"));
    document.getElementById("ctxTextItalic")?.setAttribute("title", t("ctxFmtItalic"));
    document.getElementById("ctxTextUnderline")?.setAttribute("title", t("ctxFmtUnderline"));
  } catch {
    /* ignore */
  }
  try {
    thumbsBar?.setAttribute("aria-label", t("thumbs"));
    changesBar?.setAttribute("aria-label", t("changes"));
    document.querySelector(".workbench")?.setAttribute("aria-label", t("ariaWorkbench"));
    document.querySelector(".status-pages")?.setAttribute("aria-label", t("ariaNavPages"));
    document.querySelector(".status-zoom")?.setAttribute("aria-label", t("ariaZoom"));
    appToolbar?.setAttribute("aria-label", t("ariaAppToolbar"));
    aboutPopover?.setAttribute("aria-label", t("aboutTitle"));
    toolbarAboutBtn?.setAttribute("aria-label", t("about"));
    aboutCloseBtn?.setAttribute("aria-label", t("closeAria"));
    closeShapeModalBtn?.setAttribute("aria-label", t("closeAria"));
  } catch {
    /* ignore */
  }
  try {
    if (toastRoot) toastRoot.setAttribute("aria-label", t("toastAria"));
  } catch {
    /* ignore */
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
  try {
    renderThumbnails();
    renderChanges();
    if (splitWorkspaceState && splitWorkspaceOverlay && !splitWorkspaceOverlay.classList.contains("hidden")) {
      renderSplitWorkspace();
    }
  } catch {
    /* ignore */
  }
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
  // Toutes les formes géométriques : taille minimale 1×1 (aligné branche test).
  let minW = 20;
  let minH = 20;
  if (SHAPE_TYPES.has(item.type)) {
    minW = 1;
    minH = 1;
  }
  const prevW = item.w;
  const prevH = item.h;
  item.w = clamp(item.w, minW, Math.max(minW, zone.width));
  item.h = clamp(item.h, minH, Math.max(minH, zone.height));
  item.x = clamp(item.x, 0, Math.max(0, zone.width - item.w));
  item.y = clamp(item.y, 0, Math.max(0, zone.height - item.h));
  if (SHAPE_TYPES.has(item.type) && (prevW !== item.w || prevH !== item.h)) {
    try {
      logText("shapeFitZone", {
        type: item.type,
        id: item.id,
        prevW,
        prevH,
        w: item.w,
        h: item.h,
        minW,
        minH,
        zw: zone.width,
        zh: zone.height
      });
    } catch {
      /* ignore */
    }
  }
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
    if (r.recovered) setStatus(t("stSessionRecovered"));
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
    setStatus(t("stPythonUnavailable"));
    return;
  }
  if (result.pypdf === false) {
    setStatus(t("stPythonMissingPypdf"));
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
    setStatus(t("stPdfRenderError"));

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
  setStatus(state.zoomMode === "page-fit" ? t("stZoomFitPage") : t("stZoomFitWidth"));
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
    setStatus(tr("stRendering", { a: "0", b: String(count) }));
  } catch {}
  let lastProgressAt = 0;

  for (let pageNumber = 1; pageNumber <= count; pageNumber += 1) {
    if (token !== activePdfRenderToken) return;
    // Throttle: éviter de spammer la status bar sur gros PDFs.
    const now = Date.now();
    if (pageNumber === 1 || pageNumber === count || now - lastProgressAt > 140) {
      lastProgressAt = now;
      try {
        setStatus(tr("stRendering", { a: String(pageNumber), b: String(count) }));
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
    setStatus(t("stPdfLoadedHint"));
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
  setStatus(tr("stPdfLoadedNamed", { name: fileName }));
  // E10-S1: onboarding minimal après ouverture
  try {
    setTimeout(() => {
      // Ne pas spammer si l'utilisateur a déjà des interactions.
      if (!getActiveTab()) return;
      setStatus(t("stPdfLoadedHint2"));
    }, 250);
  } catch {}

}

async function promptOpenPdf() {

  const selected = await window.maniPdfApi.openPdfDialog();
  if (!selected.ok) {
    if (!selected.cancelled) setStatus(selected.error || t("stSelectionCancelled"));

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
    const msg = typeof r?.error === "string" && r.error ? r.error : t("stJobRefused");
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
  return s || t("splitDefaultBaseName");
}

function createSplitWorkspaceState(tab) {
  const n = Math.max(1, Number(tab.pageCount) || 1);
  const allPages = Array.from({ length: n }, (_, i) => i + 1);
  return {
    tabPath: tab.path,
    pageCount: n,
    groups: [
      { id: "g1", name: tr("splitGroupNumbered", { n: "1" }), pages: [...allPages] },
      { id: "g2", name: tr("splitGroupNumbered", { n: "2" }), pages: [] }
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
          name: typeof g.name === "string" ? g.name : tr("splitGroupNumbered", { n: String(i + 1) }),
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
  meta.textContent = tr("splitThumbPage", { n: String(page) });
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
    span.textContent = t("splitGroupLabel");
    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "split-group-name";
    inp.value = g.name;
    inp.setAttribute("aria-label", t("splitGroupNameAria"));
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
      del.textContent = t("splitDeleteGroup");
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
  splitWorkspaceState.groups.push({ id: `g${num}`, name: tr("splitGroupNumbered", { n: String(num) }), pages: [] });
  renderSplitWorkspace();
  scheduleSplitWorkspaceAutosave();
}

function openSplitWorkspace() {
  const tab = getActiveTab();
  if (!tab) {
    setStatus(t("stSplitNoPdf"));
    return;
  }
  if (!Number(tab.pageCount) || tab.pageCount < 1) {
    setStatus(t("stSplitNotReady"));
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
    setStatus(t("stSplitNoPages"));
    return;
  }
  const enqueued = await enqueuePdfJob(
    "split_groups",
    { input_path: tab.path, groups: exports },
    t("stSplitJobAdded")
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
    setStatus(t("stMergeNeedTwo"));
    return;
  }
  const outputPath = buildDefaultOutputPath(pdfTabs[0], "merged");
  await enqueuePdfJob("merge", { inputs: pdfTabs, output_path: outputPath }, t("stMergeJobAdded"));
}

function createSplitJob() {
  openSplitWorkspace();
}

async function createCompressJob() {

  const tab = getActiveTab();
  if (!tab) {
    setStatus(t("stCompressNoPdf"));
    return;
  }
  const outputPath = buildDefaultOutputPath(tab.path, "compressed");
  await enqueuePdfJob("compress", { input_path: tab.path, output_path: outputPath }, t("stCompressJobAdded"));
}

async function createProtectJob() {

  const tab = getActiveTab();
  if (!tab) {
    setStatus(t("stProtectNoPdf"));
    return;
  }
  const password = window.prompt(t("promptProtectPassword"), "");
  if (!password) {
    setStatus(t("stProtectCancelled"));
    return;
  }
  const outputPath = buildDefaultOutputPath(tab.path, "protected");
  await enqueuePdfJob(
    "protect",
    { input_path: tab.path, output_path: outputPath, password },
    t("stProtectJobAdded")
  );
}

async function createUnprotectJob() {

  const tab = getActiveTab();
  if (!tab) {
    setStatus(t("stUnprotectNoPdf"));
    return;
  }
  const password = window.prompt(t("promptUnprotectPassword"), "");
  if (password === null) {
    setStatus(t("stUnprotectCancelled"));
    return;
  }
  const outputPath = buildDefaultOutputPath(tab.path, "unprotected");
  await enqueuePdfJob(
    "unprotect",
    { input_path: tab.path, output_path: outputPath, password },
    t("stUnprotectJobAdded")
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
        applySpellHighlightsToTextDisplayNode(node, a);
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
    let minW = 20;
    let minH = 20;
    if (SHAPE_TYPES.has(item.type)) {
      minW = 1;
      minH = 1;
    }

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
    if (SHAPE_TYPES.has(item.type)) {
      try {
        logText("shapeResizeEnd", {
          type: item.type,
          id: item.id,
          w: item.w,
          h: item.h,
          minLogical: 1
        });
      } catch {
        /* ignore */
      }
    }
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
  try {
    window.syncManiColorSwatches?.();
  } catch {
    /* ignore */
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

/**
 * Même effet que les boutons « Valider » du panneau (clic programmatique = mêmes handlers que l'utilisateur).
 * À l'ouverture du nuancier (mani-color-open), la sélection peut être perdue : on la sauvegarde.
 */
function clickManiColorValidateButtonForInputId(id) {
  const map = {
    propShapeFill: "validateShapeFillBtn",
    propShapeStroke: "validateShapeStrokeBtn",
    propShapeBackdrop: "validateShapeBackdropBtn",
    propTextColor: "validateTextColorBtn",
    propBgColor: "applyBgBtn",
    ctxTextColor: "ctxValidateTextColorBtn",
    ctxTextBg: "ctxValidateTextBgBtn",
    ctxShapeFill: "ctxValidateShapeFillBtn",
    ctxShapeStroke: "ctxValidateShapeStrokeBtn",
    ctxShapeBackdrop: "ctxValidateShapeBackdropBtn"
  };
  const btnId = map[id];
  if (!btnId) {
    logText("maniColorValidateClickMapMiss", { id });
    return false;
  }
  const btn = document.getElementById(btnId);
  if (!btn) {
    logText("maniColorValidateBtnMissing", { id, btnId });
    return false;
  }
  btn.click();
  logText("maniColorValidateBtnClicked", { id, btnId });
  return true;
}

function applyManiColorAfterPicker(inputEl) {
  try {
    const id = inputEl?.id || "";
    const hex = String(inputEl?.value || "").trim();
    logText("maniColorApply", {
      id,
      v: hex,
      selectedId: state.selectedAnnotationId,
      backup: globalThis.__maniColorSelectionBackup,
      shapeCtx: shapeCtxMenuTargetId,
      textCtx: textCtxMenuTargetId,
      propShapeFillEl: Boolean(propShapeFill),
      propShapeStrokeWEl: Boolean(propShapeStrokeWidth)
    });
    try {
      window.maniPdfApi?.log?.("maniColorApply", {
        id,
        selectedId: state.selectedAnnotationId,
        backup: globalThis.__maniColorSelectionBackup
      });
    } catch {
      /* ignore */
    }
    if (!id) return;

    if (id === "propBgColor" && propBgColor) {
      propBgColor.dataset.touched = "1";
    }
    if (id === "ctxTextBg") {
      const bg = document.getElementById("ctxTextBg");
      if (bg) bg.dataset.ctxTouched = "1";
    }
    if (id === "ctxShapeBackdrop") {
      const bd = document.getElementById("ctxShapeBackdrop");
      if (bd) bd.dataset.ctxTouched = "1";
    }

    if (id === "ctxTextColor" || id === "ctxTextBg") {
      if (!textCtxMenuTargetId && globalThis.__maniCtxTextBackup) {
        textCtxMenuTargetId = globalThis.__maniCtxTextBackup;
        logText("maniColorRestoreTextCtx", { textCtxMenuTargetId });
      }
      try {
        ensureTextAnnotationCtxMenuEl()?.classList?.remove?.("hidden");
      } catch {
        /* ignore */
      }
      logText("maniColorBranchCtxText", { id, textCtxMenuTargetId, hex });
      try {
        if (!clickManiColorValidateButtonForInputId(id)) {
          logText("maniColorCtxTextFallbackApply", { id });
          applyTextCtxMenuBoxProps();
        }
        window.maniPdfApi?.log?.("maniColor ctx text applied", { id, via: "clickOrFallback" });
      } catch (e) {
        try {
          applyTextCtxMenuBoxProps();
        } catch {
          /* ignore */
        }
      }
      globalThis.__maniCtxTextBackup = undefined;
      return;
    }
    if (id.startsWith("ctxShape")) {
      if (!shapeCtxMenuTargetId && globalThis.__maniCtxShapeBackup) {
        shapeCtxMenuTargetId = globalThis.__maniCtxShapeBackup;
        logText("maniColorRestoreShapeCtx", { shapeCtxMenuTargetId });
      }
      try {
        ensureShapeAnnotationCtxMenuEl()?.classList?.remove?.("hidden");
      } catch {
        /* ignore */
      }
      logText("maniColorBranchCtxShape", { id, shapeCtxMenuTargetId, hex });
      try {
        if (!clickManiColorValidateButtonForInputId(id)) {
          logText("maniColorCtxShapeFallbackApply", { id });
          applyShapeCtxMenuProps();
        }
        window.maniPdfApi?.log?.("maniColor ctx shape applied", { id, via: "clickOrFallback" });
      } catch (e) {
        try {
          applyShapeCtxMenuProps();
        } catch {
          /* ignore */
        }
      }
      globalThis.__maniCtxShapeBackup = undefined;
      return;
    }

    const tab = getActiveTab();
    if (!tab) {
      logText("maniColorNoTab", { id });
      return;
    }

    const beforeSel = state.selectedAnnotationId;
    if (!getSelectedAnnotation() && globalThis.__maniColorSelectionBackup != null && globalThis.__maniColorSelectionBackup !== "") {
      state.selectedAnnotationId = globalThis.__maniColorSelectionBackup;
      logText("maniColorRestoreSel", { from: beforeSel, to: state.selectedAnnotationId });
    }
    globalThis.__maniColorSelectionBackup = undefined;

    const item = getSelectedAnnotation();
    logText("maniColorBeforeApplySelected", {
      hasItem: Boolean(item),
      type: item?.type,
      branchShape: Boolean(item && SHAPE_TYPES.has(item.type) && propShapeFill && propShapeFillOpacity)
    });

    if (!item) {
      logText("maniColorNoItem", { id, selectedId: state.selectedAnnotationId });
      return;
    }

    try {
      if (!clickManiColorValidateButtonForInputId(id)) {
        applySelectedProperties();
      }
      const after = getSelectedAnnotation();
      window.maniPdfApi?.log?.("maniColor panel validate click", {
        id,
        type: item.type,
        textColor: after?.type === "text" ? after.textColor : undefined,
        fillColor: after && SHAPE_TYPES.has(after.type) ? after.fillColor : undefined,
        propTextVal: id === "propTextColor" ? propTextColor?.value : undefined
      });
      logText("maniColorPanelDone", {
        id,
        type: item.type,
        textColor: after?.type === "text" ? after.textColor : undefined,
        fillColor: after && SHAPE_TYPES.has(after.type) ? after.fillColor : undefined
      });
    } catch (e) {
      try {
        applySelectedProperties();
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    logText("maniColorCommitErr", { err: String(e) });
  }
}

document.addEventListener("mani-color-open", (ev) => {
  globalThis.__maniColorSelectionBackup = state.selectedAnnotationId;
  globalThis.__maniCtxShapeBackup = shapeCtxMenuTargetId;
  globalThis.__maniCtxTextBackup = textCtxMenuTargetId;
  logText("maniColorPickerOpen", {
    backup: globalThis.__maniColorSelectionBackup,
    shapeCtxBackup: globalThis.__maniCtxShapeBackup,
    textCtxBackup: globalThis.__maniCtxTextBackup,
    field: ev.detail?.inputId
  });
});

globalThis.maniAfterColorCommit = applyManiColorAfterPicker;

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
// Champs hidden + nuancier : input/change déclenchés au commit ; « Valider » panneau / modale pour figer sur l'annotation.
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
/** Ferme uniquement les menus déroulants Fichier / Options / Outils PDF (barre du haut). */
function closeToolbarDropdownMenus() {
  closePdfToolsMenu();
  closeToolbarFileMenu();
  closeToolbarOptionsMenu();
}

function closeAllFlyoutMenus() {
  closeToolbarDropdownMenus();
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
  // Important : ne pas appeler closeAllFlyoutMenus() ici — ça fermait aussi les popups Forme/Texte/Image
  // au simple clic dans un champ (événement click après mousedown). Les menus d’annotation sont gérés au mousedown (capture).
  closeToolbarDropdownMenus();
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
try {
  window.initManiColorPickers?.();
} catch {
  /* ignore */
}
try {
  window.wireManiFloatingCtxMenus?.();
} catch {
  /* ignore */
}
applyLanguage();
applySpellcheckLanguageBestEffort();
wireTextAnnotationCtxMenu();
document.addEventListener("selectionchange", () => {
  try {
    if (!textCtxMenuTargetId) return;
    const menu = ensureTextAnnotationCtxMenuEl();
    if (!menu || menu.classList.contains("hidden")) return;
    syncCtxTextFormatButtons();
    void refreshTextSpellContextMenu();
  } catch {
    /* ignore */
  }
});
setInterval(() => {
  try {
    runBackgroundSpellScanForTextAnnotations();
  } catch {
    /* ignore */
  }
}, 6000);
setTimeout(() => {
  try {
    runBackgroundSpellScanForTextAnnotations();
  } catch {
    /* ignore */
  }
}, 800);
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
      setStatus(t("ready"));
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
  window.__maniE2E.setLanguage = (lang) => {
    try {
      setLanguage(String(lang || "fr"));
      return state.language;
    } catch {
      return null;
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
  /**
   * E2E : texte avec contenu initial (plain et/ou HTML).
   * @param {{ plain?: string, textHtml?: string }} opts
   */
  window.__maniE2E.injectTextForTest = (opts) => {
    try {
      const tab = getActiveTab();
      if (!tab) return null;
      captureSnapshot(tab);
      const annotations = currentPageAnnotations(tab);
      const id = newAnnotationId();
      const plain = opts?.plain != null ? String(opts.plain) : "hello";
      const html = opts?.textHtml != null ? String(opts.textHtml).trim() : "";
      const ann = {
        id,
        type: "text",
        x: 100,
        y: 100,
        w: 260,
        h: 100,
        rotation: 0,
        opacity: 100,
        textColor: "#111111",
        bgColor: null,
        padding: 6,
        fontFamily: "Arial",
        fontSize: 14,
        text: plain,
        ...(html ? { textHtml: html } : {})
      };
      annotations.push(ann);
      state.selectedAnnotationId = id;
      state.editingAnnotationId = null;
      syncPropertyInputs();
      renderAnnotations();
      scheduleAutoSave();
      return id;
    } catch {
      return null;
    }
  };
  /** E2E : applique Gras / Italique / Souligné au bloc (même chemin que le menu contextuel). */
  window.__maniE2E.applyCtxFormatToSelectedText = (cmd) => {
    try {
      const id = state.selectedAnnotationId;
      if (!id) return false;
      textCtxMenuTargetId = id;
      ctxMenuExecFormat(cmd);
      return true;
    } catch {
      return false;
    }
  };
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
  /** E2E : désélectionne (pour tester clic droit sans sélection préalable). */
  window.__maniE2E.clearSelectionForTest = () => {
    try {
      state.selectedAnnotationId = null;
      state.editingAnnotationId = null;
      syncPropertyInputs();
      renderAnnotations();
      return true;
    } catch {
      return false;
    }
  };
  window.__maniE2E.setAnnotationLogicalSizeForTest = (annotationId, w, h) => {
    try {
      const tab = getActiveTab();
      if (!tab || !annotationId) return false;
      const loc = findAnnotationLocation(tab, annotationId);
      if (!loc?.item) return false;
      const item = loc.item;
      if (!SHAPE_TYPES.has(item.type)) return false;
      captureSnapshot(tab);
      item.w = Math.max(1, Math.floor(Number(w) || 1));
      item.h = Math.max(1, Math.floor(Number(h) || 1));
      fitAnnotationToSafeZone(item, getSafeZoneSize());
      renderAnnotations();
      scheduleAutoSave();
      return true;
    } catch {
      return false;
    }
  };
  window.__maniE2E.getAnnotationProps = (annotationId) => {
    try {
      const tab = getActiveTab();
      if (!tab || !annotationId) return null;
      const loc = findAnnotationLocation(tab, annotationId);
      if (!loc?.item) return null;
      const a = loc.item;
      const base = {
        type: a.type,
        rotation: a.rotation,
        opacity: a.opacity,
        w: a.w,
        h: a.h
      };
      if (a.type === "text") {
        return {
          ...base,
          text: a.text,
          textHtml: a.textHtml ?? null,
          textColor: a.textColor,
          bgColor: a.bgColor ?? null
        };
      }
      if (SHAPE_TYPES.has(a.type)) {
        return {
          ...base,
          fillColor: a.fillColor,
          strokeColor: a.strokeColor,
          fillAlpha: a.fillAlpha,
          strokeWidth: a.strokeWidth
        };
      }
      return base;
    } catch {
      return null;
    }
  };
  /** E2E : applique la couleur via le même pipeline que le nuancier (sans modale). */
  window.__maniE2E.applyPanelColorForTest = (inputId, hex) => {
    try {
      const el = document.getElementById(inputId);
      if (!el) return false;
      el.value = String(hex || "").trim();
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof globalThis.maniAfterColorCommit === "function") {
        globalThis.maniAfterColorCommit(el);
      } else {
        clickManiColorValidateButtonForInputId(inputId);
      }
      return true;
    } catch {
      return false;
    }
  };
} catch {}
