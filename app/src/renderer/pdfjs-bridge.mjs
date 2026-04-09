try {
  const pdfjsLib = await import("../../node_modules/pdfjs-dist/build/pdf.mjs");

  // Expose to the classic (non-module) renderer.js
  window.pdfjsLib = pdfjsLib;

  // Worker path for Electron file:// context
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  } catch {
    // fallback: disable worker (slower but should still render)
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  }

  try {
    await window.maniPdfApi?.log?.("pdfjs:bridge:loaded", {
      workerSrc: pdfjsLib?.GlobalWorkerOptions?.workerSrc || null
    });
  } catch {
    // ignore
  }
} catch (error) {
  try {
    await window.maniPdfApi?.log?.("pdfjs:bridge:failed", {
      message: error?.message || String(error)
    });
  } catch {
    // ignore
  }
}

