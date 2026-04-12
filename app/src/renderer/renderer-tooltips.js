/**
 * Infobulles `[data-tooltip]` (survol) - positionnement et état actif sur la cible.
 * `window.__editifyTooltips` - `bind({ toolTip })` depuis `renderer.js` après référence DOM `#toolTip`.
 */
(function () {
  "use strict";

  /**
   * @typedef {object} TooltipsDeps
   * @property {HTMLElement | null} toolTip
   */

  /** @type {TooltipsDeps | null} */
  let deps = null;

  let activeTooltipTarget = null;
  let wired = false;

  /** @param {TooltipsDeps} next */
  function bind(next) {
    if (!next?.toolTip) {
      throw new Error("[editify] __editifyTooltips.bind() requiert l’élément #toolTip.");
    }
    deps = next;
    if (!wired) {
      wired = true;
      wireTooltipsOnce();
    }
  }

  function requireDeps() {
    if (!deps?.toolTip) {
      throw new Error("[editify] __editifyTooltips.bind() doit être appelé depuis renderer.js.");
    }
    return deps;
  }

  function showToolTip(event) {
    const d = requireDeps();
    const target = event.target.closest("[data-tooltip]");
    if (!target) return;
    const text = target.getAttribute("data-tooltip");
    if (!text) return;
    if (activeTooltipTarget && activeTooltipTarget !== target) {
      activeTooltipTarget.classList.remove("tooltip-target-active");
    }
    activeTooltipTarget = target;
    activeTooltipTarget.classList.add("tooltip-target-active");
    d.toolTip.textContent = text;
    d.toolTip.classList.remove("hidden");

    const rect = target.getBoundingClientRect();
    const margin = 8;
    const tipWidth = 320;
    const tipHeight = 48;
    const showBelow = rect.bottom + tipHeight + margin <= window.innerHeight;
    const top = showBelow ? rect.bottom + 6 : Math.max(margin, rect.top - tipHeight - 6);
    const left = Math.max(margin, Math.min(window.innerWidth - tipWidth - margin, rect.left));
    d.toolTip.style.top = `${top}px`;
    d.toolTip.style.left = `${left}px`;
  }

  function hideToolTip() {
    const d = requireDeps();
    d.toolTip.classList.add("hidden");
    if (activeTooltipTarget) {
      activeTooltipTarget.classList.remove("tooltip-target-active");
      activeTooltipTarget = null;
    }
  }

  function wireTooltipsOnce() {
    document.addEventListener("mouseover", showToolTip);
    document.addEventListener("mouseout", (event) => {
      if (!event.target.closest("[data-tooltip]")) return;
      hideToolTip();
    });
  }

  window.__editifyTooltips = {
    bind,
    hideToolTip
  };
})();
