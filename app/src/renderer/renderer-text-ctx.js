/**
 * Helpers menu contextuel texte : sélection, couverture de format, remplacement de plages.
 * Dépend de `renderer-text-html.js`. Les fonctions async orthographe et câblage DOM restent dans `renderer.js`.
 */
(function () {
  "use strict";

  if (!window.__editifyTextHtml) {
    throw new Error("[editify] renderer-text-html.js doit précéder renderer-text-ctx.js.");
  }
  const { getTextBoundaryInRoot, plainTextForAnnotationItem, sanitizeTextHtml } =
    window.__editifyTextHtml;

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

  window.__editifyTextCtxHelpers = {
    getPlainSelectionOffsetsInEditor,
    textNodeFormatHit,
    getFormatCoverage,
    getFormatCoverageFromSanitizedHtml,
    setFmtBtnState,
    replacePlainTextRangeInEditor,
    replacePlainRangeInTextItem
  };
})();
