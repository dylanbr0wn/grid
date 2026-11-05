import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let vite, links;
const originalStorage = globalThis.localStorage;
const data = new Map();
before(async () => {
  vite = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), configFile: false, server: { hmr: false, watch: null } });
  links = await vite.ssrLoadModule("/src/lib/shared-links.ts");
  globalThis.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
});
after(async () => { globalThis.localStorage = originalStorage; await vite?.close(); });
const result = { id: "a".repeat(32), title: "My grid", createdAt: "2026-10-04T00:00:00Z", expiresAt: "2027-01-02T00:00:00Z", managementToken: "b".repeat(42) + "A" };

test("creation records are separate from grid persistence and deduplicate recovery", () => {
  data.clear(); data.set("grid-albums-storage", "editor state");
  links.rememberShare(result); links.rememberShare(result);
  assert.deepEqual(JSON.parse(data.get(links.SHARED_LINKS_KEY)), [result]);
  assert.equal(data.get("grid-albums-storage"), "editor state");
});

test("a full or malformed list preserves existing credentials", () => {
  const records = Array.from({ length: 50 }, (_, i) => ({ ...result, id: String(i).padStart(32, "a") }));
  const full = JSON.stringify(records);
  data.set(links.SHARED_LINKS_KEY, full);
  assert.throws(() => links.rememberShare(result), /full/);
  assert.equal(data.get(links.SHARED_LINKS_KEY), full);
  links.rememberShare(records[0]);
  assert.equal(JSON.parse(data.get(links.SHARED_LINKS_KEY)).length, 50);
  data.set(links.SHARED_LINKS_KEY, "unreadable");
  assert.throws(() => links.rememberShare(result), /could not be read/);
  assert.equal(data.get(links.SHARED_LINKS_KEY), "unreadable");
});

test("reading rejects unknown versions and invalid lifecycle dates without overwriting credentials", () => {
  for (const invalid of [{ version: 2, shares: [result] }, [{ ...result, expiresAt: "bad" }], [{ ...result, expiresAt: result.createdAt }]]) {
    const raw = JSON.stringify(invalid);
    data.set(links.SHARED_LINKS_KEY, raw);
    assert.throws(() => links.readSharedLinks(), /could not be read/);
    assert.equal(data.get(links.SHARED_LINKS_KEY), raw);
  }
  data.set(links.SHARED_LINKS_KEY, JSON.stringify([result]));
  assert.deepEqual(links.readSharedLinks(), [result]);
});
