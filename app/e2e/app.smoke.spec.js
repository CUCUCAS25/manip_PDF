const { test, expect, _electron: electron } = require("@playwright/test");
const electronPath = require("electron");
const path = require("path");
const fs = require("fs");

function getRepoPdfFixture() {
  // PDF fourni par le repo (USER).
  const p = path.resolve(process.cwd(), "..", "tests", "formulaire_test.pdf");
  if (!fs.existsSync(p)) {
    throw new Error(`Fixture PDF introuvable: ${p}`);
  }
  return p;
}

async function launchApp() {
  const pdfPath = getRepoPdfFixture();
  const app = await electron.launch({
    executablePath: electronPath,
    args: ["."],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      MANI_PDF_E2E_PDF_PATH: pdfPath
    }
  });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => !!window.maniPdfApi);
  return { app, page };
}

async function openPdfFromUi(page) {
  // L'état de session peut précharger des onglets: on veut un test stable.
  await page.evaluate(() => {
    try {
      window.localStorage?.clear?.();
      window.sessionStorage?.clear?.();
    } catch {}
  });
  // Fermer tous les onglets existants via leurs croix.
  const closeButtons = page.locator("#tabs .tab .tab-close");
  const n = await closeButtons.count();
  for (let i = 0; i < n; i++) {
    await page.locator("#tabs .tab .tab-close").first().click();
  }

  const welcomeOpen = page.locator("#welcomeOpenBtn");
  const headerOpen = page.locator("#openBtn");
  if (await welcomeOpen.isVisible().catch(() => false)) {
    await welcomeOpen.click();
  } else {
    await headerOpen.click();
  }

  await expect(page.locator("#tabs .tab")).toHaveCount(1, { timeout: 30000 });
  // Multi-pages: au moins 1 page rendue.
  await expect(page.locator("#pagesContainer .pdf-page").first()).toBeVisible({ timeout: 30000 });
  // La page active doit avoir ses overlays (annotationLayer)
  await expect(page.locator("#annotationLayer")).toHaveCount(1, { timeout: 30000 });
}

async function addTextAnnotation(page) {
  await page.locator("#addTextBtn").click();
  // Le bloc est créé sur la page active: on sélectionne le dernier.
  const annos = page.locator("#annotationLayer .annotation.text");
  await expect(annos).toHaveCount(1, { timeout: 15000 });
  return annos.nth(0);
}

test("app boots and shows title", async () => {
  const { app, page } = await launchApp();
  await expect(page.locator("h1")).toHaveText("Mani PDF Local");
  await app.close();
});

test("load PDF, remove tab, add and edit text", async () => {
  const { app, page } = await launchApp();
  await openPdfFromUi(page);

  // Vérifie que l'onglet a un bouton de fermeture, puis supprime.
  await expect(page.locator("#tabs .tab .tab-close")).toHaveCount(1);
  await page.locator("#tabs .tab .tab-close").click();
  await expect(page.locator("#tabs .tab")).toHaveCount(0);

  // Recharge pour tester ajout + édition
  await openPdfFromUi(page);

  const textNode = await addTextAnnotation(page);
  // Entrer en édition: double-click (fallback mousedown existe, mais dblclick est mieux).
  await textNode.dblclick({ position: { x: 20, y: 20 } });

  const editor = page.locator("#annotationLayer .annotation.text.editing textarea.text-editor");
  await expect(editor).toHaveCount(1);
  await editor.fill("Bonjour");

  // Cliquer hors annotation => sortir édition + désélection
  await page.locator(".viewer").click({ position: { x: 5, y: 5 } });
  await expect(page.locator("#annotationLayer .annotation.text.editing")).toHaveCount(0);

  // Re-sélectionner et vérifier que le texte est resté
  const textNode2 = page.locator(`#annotationLayer .annotation.text:has-text("Bonjour")`);
  await expect(textNode2).toHaveCount(1);

  await app.close();
});
