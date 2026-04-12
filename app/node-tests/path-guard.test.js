const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const { isOutputPdfInSameDirectoryAsInput } = require("../src/main/lib/path-guard.js");

test("sortie .pdf dans le même dossier que l’entrée -> true", () => {
  const dir = os.tmpdir();
  const inputPath = path.join(dir, "source.pdf");
  const outputPath = path.join(dir, "out.pdf");
  assert.equal(isOutputPdfInSameDirectoryAsInput(inputPath, outputPath), true);
});

test("sortie dans un sous-dossier -> false", () => {
  const dir = os.tmpdir();
  const inputPath = path.join(dir, "source.pdf");
  const outputPath = path.join(dir, "nested", "out.pdf");
  assert.equal(isOutputPdfInSameDirectoryAsInput(inputPath, outputPath), false);
});

test("extension sortie non .pdf -> false", () => {
  const dir = os.tmpdir();
  const inputPath = path.join(dir, "source.pdf");
  const outputPath = path.join(dir, "out.txt");
  assert.equal(isOutputPdfInSameDirectoryAsInput(inputPath, outputPath), false);
});

test("entrées invalides -> false", () => {
  assert.equal(isOutputPdfInSameDirectoryAsInput("", "/x/y.pdf"), false);
  assert.equal(isOutputPdfInSameDirectoryAsInput("/a/b.pdf", null), false);
  assert.equal(isOutputPdfInSameDirectoryAsInput(1, "/a/b.pdf"), false);
});
