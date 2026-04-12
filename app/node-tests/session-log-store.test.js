const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createSessionLogStore } = require("../src/lib/session-log-store.js");

test("append / getEntries / clear", () => {
  const log = createSessionLogStore({ maxEntries: 500 });
  log.append({ category: "job", message: "a" });
  log.append({ category: "info", message: "b" });
  const rows = log.getEntries();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].category, "job");
  assert.equal(rows[0].message, "a");
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(rows[0].ts));
  log.clear();
  assert.equal(log.getEntries().length, 0);
});

test("catégorie / message par défaut", () => {
  const log = createSessionLogStore({ maxEntries: 10 });
  log.append({});
  const r = log.getEntries()[0];
  assert.equal(r.category, "info");
  assert.equal(r.message, "");
});

test("troncature au-delà de maxEntries", () => {
  const log = createSessionLogStore({ maxEntries: 3 });
  log.append({ category: "x", message: "1" });
  log.append({ category: "x", message: "2" });
  log.append({ category: "x", message: "3" });
  log.append({ category: "x", message: "4" });
  const rows = log.getEntries();
  assert.equal(rows.length, 3);
  assert.equal(rows[0].message, "2");
  assert.equal(rows[2].message, "4");
});

test("maxEntries invalide -> défaut 500", () => {
  const log = createSessionLogStore({ maxEntries: 0 });
  for (let i = 0; i < 10; i++) log.append({ category: "x", message: String(i) });
  assert.ok(log.getEntries().length >= 10);
});
