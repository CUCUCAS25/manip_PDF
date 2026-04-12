/**
 * Attend que le nombre de nœuds .pdf-page corresponde à tab.pageCount
 * puis que les miniatures soient alignées (deux phases pour éviter les courses rendu / thumbs).
 */
async function waitForPdfPagesRendered(page) {
  await page.waitForFunction(
    () => {
      const u = window.__maniE2E?.getUiState?.();
      if (!u || u.error || u.pageCount == null) return false;
      const n = document.querySelectorAll("#pagesContainer .pdf-page").length;
      return n === u.pageCount && n >= 1;
    },
    null,
    { timeout: 90000 }
  );
  await page.waitForFunction(
    () => {
      const u = window.__maniE2E?.getUiState?.();
      if (!u || u.pageCount == null) return false;
      const n = document.querySelectorAll("#pagesContainer .pdf-page").length;
      const thumbs = document.querySelectorAll("#thumbsList .thumb-item").length;
      return n === u.pageCount && thumbs === n && n >= 1;
    },
    null,
    { timeout: 90000 }
  );
}

module.exports = { waitForPdfPagesRendered };
