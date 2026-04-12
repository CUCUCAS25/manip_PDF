/**
 * Utilitaires HTML / texte pour annotations (sanitization XSS partielle, extrait plain, bornes DOM, surlignage orthographe).
 * Chargé avant `renderer.js` ; expose `window.__editifyTextHtml` pour garder `renderer.js` plus lisible.
 */
(function () {
  "use strict";

  function stripTagsForPlain(html) {
    return String(html || "")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();
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

  function plainTextForAnnotationItem(item) {
    if (!item || item.type !== "text") return "";
    if (item.textHtml && String(item.textHtml).trim()) {
      const div = document.createElement("div");
      div.innerHTML = sanitizeTextHtml(item.textHtml);
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

  window.__editifyTextHtml = {
    stripTagsForPlain,
    sanitizeTextHtml,
    plainTextForAnnotationItem,
    getTextBoundaryInRoot,
    wrapSpellMisspellingsInDisplayRoot,
    applySpellHighlightsToTextDisplayNode
  };
})();
