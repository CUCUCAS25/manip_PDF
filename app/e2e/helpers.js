/**
 * Attend que le nombre de nœuds .pdf-page corresponde à tab.pageCount
 * et que la barre latérale miniatures soit à jour (évite les courses avec Split, smoke, etc.).
 */
async function waitForPdfPagesRendered(page) {
  await page.waitForFunction(
    () => {
      const u = window.__maniE2E?.getUiState?.();
      if (!u || u.error || u.pageCount == null) return false;
      const n = document.querySelectorAll("#pagesContainer .pdf-page").length;
      if (n !== u.pageCount || n < 1) return false;
      const thumbs = document.querySelectorAll("#thumbsList .thumb-item").length;
      return thumbs === n;
    },
    null,
    { timeout: 45000 }
  );
}

module.exports = { waitForPdfPagesRendered };
