import { test, expect } from "@playwright/test";

const id = "a".repeat(32), token = "b".repeat(42) + "A";
const savedLinksKey = "grid-shared-links-v1";
function publication(title = "") {
  const created = new Date();
  return { id, title, createdAt: created.toISOString(), expiresAt: new Date(+created + 90 * 86400000).toISOString(), imageBytes: 100,
    publicUrl: `/s/${id}`, imageUrl: `/api/snapshots/${id}/image`, downloadUrl: `/api/snapshots/${id}/download`, managementToken: token, managementUrl: `/manage/${id}#token=${token}` };
}

async function setGrid(page, source = "red") {
  await page.evaluate(async (source) => {
    const { useAlbumsStore } = await import("/src/lib/albums-store.ts");
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = source; ctx.fillRect(0, 0, 128, 128);
    const img = source.startsWith("/") ? source : canvas.toDataURL();
    useAlbumsStore.setState((state) => ({ columns: 1, rows: 1, albums: { ...state.albums, grid: { ...state.albums.grid, albums: [
      { type: "custom", id: "cover-0", mbid: "album-0", album: "Album zero", artist: "Artist zero", img, imgs: [img] },
    ] } } }));
  }, source);
  await expect(page.locator("#fm-grid [data-cover-sources]")).toHaveCount(1);
  if (!source.startsWith("/")) await expect(page.locator("#fm-grid img")).toHaveCSS("opacity", "1");
}

async function openPreview(page) {
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("img", { name: "Frozen grid preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create link", exact: true })).toBeEnabled();
}

async function imageHash(page) {
  return page.getByRole("img", { name: "Frozen grid preview" }).evaluate(async (img) => {
    const bytes = await (await fetch(img.src)).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))];
  });
}

async function requests(page) { return page.evaluate(() => window.publicationRequests); }
async function mockSuccess(page, title = "") {
  await page.route("**/api/snapshots", (route) => route.fulfill({ json: publication(title), status: 201 }));
}

test.beforeEach(async ({ page, context }) => {
  await context.addInitScript(() => {
    if (!localStorage.getItem("grid-albums-storage")) localStorage.setItem("grid-albums-storage", JSON.stringify({ state: { hasSeenWelcome: true }, version: 0 }));
    window.publicationRequests = [];
    const original = window.fetch;
    window.fetch = async (path, init) => {
      if (path === "/api/snapshots" && init?.method === "POST") {
        const image = await init.body.get("image").arrayBuffer();
        const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", image))];
        window.publicationRequests.push({ key: init.headers["Idempotency-Key"], title: init.body.get("title"), hash });
      }
      return original(path, init);
    };
  });
  await page.goto("/");
  await expect(page.locator("#fm-grid")).toBeVisible();
  await setGrid(page);
});

test("cancel and Escape never publish; optional title starts empty", async ({ page }) => {
  await openPreview(page);
  await expect(page.getByLabel("Title (optional)")).toHaveValue("");
  await expect(page.getByText(/expires after 90 days/)).toBeVisible();
  await expect(page.getByText(/cached previews after you revoke/)).toBeVisible();
  await page.getByLabel("Title (optional)").fill("No publication");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openPreview(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await requests(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Clear Grid", exact: true })).toBeEnabled();
});

test("Create link publishes exact preview and title once, records management and supports copy", async ({ page, context, request }, testInfo) => {
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let published;
  await page.route("**/api/snapshots", async (route) => {
    const response = await route.fetch({ url: "http://127.0.0.1:5175/api/snapshots" });
    published = await response.json();
    await held;
    await route.fulfill({ response });
  });
  await openPreview(page);
  const hash = await imageHash(page);
  await page.getByLabel("Title (optional)").fill("<Frozen> & named");
  await setGrid(page, "blue");
  await page.getByRole("button", { name: "Create link", exact: true }).evaluate((button) => { button.click(); button.click(); });
  await expect(page.getByRole("button", { name: "Creating link…" })).toBeDisabled();
  await expect(page.getByLabel("Title (optional)")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  release();
  await expect(page.getByRole("heading", { name: "Link created" })).toBeVisible();
  const sent = await requests(page);
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ hash, title: "<Frozen> & named" });
  const download = await request.get("http://127.0.0.1:5175" + published.downloadUrl);
  expect([...new Uint8Array(await crypto.subtle.digest("SHA-256", await download.body()))]).toEqual(hash);
  expect(published.title).toBe("<Frozen> & named");
  await expect(page.getByLabel("Public link", { exact: true })).toHaveValue(`http://127.0.0.1:5174${published.publicUrl}`);
  await expect(page.getByLabel("Private management link")).toHaveValue(`http://127.0.0.1:5174${published.managementUrl}`);
  const records = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), savedLinksKey);
  expect(records).toEqual([{ id: published.id, title: published.title, createdAt: published.createdAt, expiresAt: published.expiresAt, managementToken: published.managementToken }]);
  expect(await page.evaluate(async () => (await import("/src/lib/shared-links.ts")).readPendingPublication())).toBeNull();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy public link" }).click();
  await expect(page.getByText("Public link copied.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://127.0.0.1:5174${published.publicUrl}`);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("Denied"); }; });
  await page.getByRole("button", { name: "Copy management link" }).click();
  await expect(page.getByText(/Select the link and copy it manually/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("publication-success.png") });
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: "Clear Grid", exact: true })).toBeEnabled();
});

test("lost server reply recovers exact publication after close and reload", async ({ page, request }) => {
  let first, recovered, calls = 0;
  await page.route("**/api/snapshots", async (route) => {
    const response = await route.fetch({ url: "http://127.0.0.1:5175/api/snapshots" });
    if (++calls === 1) { first = await response.json(); await route.abort(); }
    else { recovered = await response.json(); await route.fulfill({ response }); }
  });
  await openPreview(page);
  await page.getByLabel("Title (optional)").fill("Recover me");
  await page.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("may have been created");
  const original = (await requests(page))[0];
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await setGrid(page, "blue");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByLabel("Title (optional)")).toHaveValue("Recover me");
  await expect(page.getByLabel("Title (optional)")).toBeDisabled();
  expect(await imageHash(page)).toEqual(original.hash);
  expect(await requests(page)).toEqual([]);
  await page.getByRole("button", { name: "Retry publication", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Link created" })).toBeVisible();
  expect((await requests(page))[0]).toEqual(original);
  expect(recovered).toEqual(first);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, savedLinksKey)).toBe(1);
  expect((await request.get("http://127.0.0.1:5175" + first.publicUrl)).status()).toBe(200);
});

test("failed artwork requires explicit placeholder choice or retry", async ({ page }) => {
  let failed = true;
  await page.route("**/broken.png", (route) => failed ? route.abort() : route.fulfill({ path: "public/img/placeholder.png" }));
  await setGrid(page, "/broken.png");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByText("Cover 1: Album zero by Artist zero")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create link", exact: true })).toHaveCount(0);
  expect(await requests(page)).toEqual([]);
  failed = false;
  await page.getByRole("button", { name: "Retry artwork and capture" }).click();
  await expect(page.getByRole("button", { name: "Create link", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.route("**/broken-again.png", (route) => route.abort());
  await setGrid(page, "/broken-again.png");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: "Preview with placeholders" }).click();
  await expect(page.getByText("These covers use placeholders or blank spaces:")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create link", exact: true })).toBeEnabled();
  await mockSuccess(page);
  await page.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Link created" })).toBeVisible();
});

for (const [status, message, canDiscard] of [[413, "smaller grid", true], [503, "Sharing is unavailable", false], [507, "Sharing storage is full", false], [410, "creation window closed", true], [409, "different content", false]]) {
  test(`HTTP ${status} gives an actionable outcome and preserves the grid`, async ({ page }) => {
    await page.route("**/api/snapshots", (route) => route.fulfill({ json: { error: "failure" }, status }));
    await openPreview(page);
    await page.getByRole("button", { name: "Create link", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(message);
    if (canDiscard) {
      await page.getByRole("button", { name: "Discard attempt" }).click();
      expect(await page.evaluate(async () => (await import("/src/lib/shared-links.ts")).readPendingPublication())).toBeNull();
    } else {
      await expect(page.getByRole("button", { name: "Discard attempt" })).toHaveCount(0);
      await page.getByRole("button", { name: "Close", exact: true }).click();
    }
    await expect(page.getByRole("button", { name: "Clear Grid", exact: true })).toBeEnabled();
    expect(await page.evaluate(async () => (await import("/src/lib/albums-store.ts")).useAlbumsStore.getState().albums.grid.albums[0].id)).toBe("cover-0");
  });
}

test("Retry-After survives reload and blocks early requests", async ({ page }) => {
  await page.route("**/api/snapshots", (route) => route.fulfill({ json: { error: "limited" }, status: 429, headers: { "Retry-After": "3" } }));
  await openPreview(page);
  await page.clock.install();
  await page.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(page.getByRole("button", { name: /Retry in/ })).toBeDisabled();
  const original = (await requests(page))[0];
  await page.reload();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("button", { name: /Retry in/ })).toBeDisabled();
  await mockSuccess(page);
  await page.clock.fastForward(3100);
  await expect(page.getByRole("button", { name: "Retry publication", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Retry publication", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Link created" })).toBeVisible();
  expect((await requests(page))[0]).toEqual(original);
});

test("post-success local storage failure preserves links and recovery request", async ({ page }) => {
  await mockSuccess(page);
  await openPreview(page);
  await page.evaluate((key) => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new Error("Quota"); return window.originalSetItem.call(this, name, value); };
  }, savedLinksKey);
  await page.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Link created" })).toBeVisible();
  await expect(page.getByText(/Copy and save the management link now/)).toBeVisible();
  await expect(page.getByLabel("Private management link")).toHaveValue(`http://127.0.0.1:5174/manage/${id}#token=${token}`);
  expect(await page.evaluate(async () => (await import("/src/lib/shared-links.ts")).readPendingPublication())).not.toBeNull();
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: "Retry publication", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Link created" })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).length, savedLinksKey)).toBe(1);
  const sent = await requests(page); expect(sent[1]).toEqual(sent[0]);
});

test("recovery-storage failure prevents uploading and leaves editor usable", async ({ page }) => {
  await openPreview(page);
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (names, mode, options) {
      if (mode === "readwrite") throw new DOMException("Quota exceeded", "QuotaExceededError");
      return transaction.call(this, names, mode, options);
    };
  });
  await page.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No link was requested");
  expect(await requests(page)).toEqual([]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Clear Grid", exact: true })).toBeEnabled();
});

test("oversized capture cannot publish and narrow preview fits viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await openPreview(page);
  await page.screenshot({ path: testInfo.outputPath("publication-preview-mobile.png") });
  expect(await page.getByRole("dialog").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = function (callback) { callback(new Blob([new Uint8Array(10_000_001)], { type: "image/png" })); }; });
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("smaller grid");
  await expect(page.getByRole("button", { name: "Create link", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await requests(page)).toEqual([]);
});

test("another tab cannot overwrite or silently submit an unresolved publication", async ({ page, context }) => {
  const other = await context.newPage();
  await other.goto("/");
  await setGrid(other, "blue");
  await openPreview(other);
  await page.route("**/api/snapshots", (route) => route.fulfill({ json: { error: "unavailable" }, status: 503 }));
  await openPreview(page);
  await page.getByLabel("Title (optional)").fill("First tab");
  await page.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Sharing is unavailable");
  const original = (await requests(page))[0];
  await other.getByLabel("Title (optional)").fill("Second tab");
  await other.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(other.getByLabel("Title (optional)")).toHaveValue("First tab");
  expect(await imageHash(other)).toEqual(original.hash);
  expect(await requests(other)).toEqual([]);
  await mockSuccess(other, "First tab");
  await other.getByRole("button", { name: "Retry publication", exact: true }).click();
  await expect(other.getByRole("heading", { name: "Link created" })).toBeVisible();
  expect((await requests(other))[0]).toEqual(original);
});

test("a stale retry must preview a replacement attempt from another tab before submitting", async ({ page, context }) => {
  await page.route("**/api/snapshots", (route) => route.fulfill({ json: { error: "unavailable" }, status: 503 }));
  await openPreview(page);
  await page.getByLabel("Title (optional)").fill("First publication");
  await page.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Sharing is unavailable");
  const original = (await requests(page))[0];

  const other = await context.newPage();
  await other.goto("/");
  await mockSuccess(other, "First publication");
  await other.getByRole("button", { name: "Share", exact: true }).click();
  await other.getByRole("button", { name: "Retry publication", exact: true }).click();
  await expect(other.getByRole("heading", { name: "Link created" })).toBeVisible();
  await other.getByRole("button", { name: "Done" }).click();

  await setGrid(other, "blue");
  await openPreview(other);
  await other.getByLabel("Title (optional)").fill("Replacement publication");
  await other.route("**/api/snapshots", (route) => route.fulfill({ json: { error: "unavailable" }, status: 503 }));
  await other.getByRole("button", { name: "Create link", exact: true }).click();
  await expect(other.getByRole("alert")).toContainText("Sharing is unavailable");
  const replacement = (await requests(other))[1];
  expect(replacement.key).not.toBe(original.key);

  await page.getByRole("button", { name: "Retry publication", exact: true }).click();
  await expect(page.getByLabel("Title (optional)")).toHaveValue("Replacement publication");
  expect(await imageHash(page)).toEqual(replacement.hash);
  expect(await requests(page)).toHaveLength(1);
  await mockSuccess(page, "Replacement publication");
  await page.getByRole("button", { name: "Retry publication", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Link created" })).toBeVisible();
  expect((await requests(page))[1]).toEqual(replacement);
});
