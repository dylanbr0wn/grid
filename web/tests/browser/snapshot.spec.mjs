import { test, expect } from "@playwright/test";

async function setGrid(page, { columns = 2, rows = 2, sources = ["red", "blue"] } = {}) {
  await page.evaluate(async ({ columns, rows, sources }) => {
    const { useAlbumsStore } = await import("/src/lib/albums-store.ts");
    const { freezeGridSnapshot } = await import("/src/lib/export.ts");
    window.freezeGridSnapshot = freezeGridSnapshot;
    window.store = useAlbumsStore;
    const solid = (color) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 128, 128);
      return canvas.toDataURL();
    };
    const albums = Array.from({ length: columns * rows }, (_, i) => {
      if (i >= sources.length) return { type: "placeholder", id: `placeholder_${i}` };
      const img = /^(\/|https?:|data:)/.test(sources[i]) ? sources[i] : solid(sources[i]);
      return { type: i % 2 ? "custom" : "lastfm", mbid: `mbid-${i}`, id: `cover-${i}`, album: `Album ${i}`, artist: `Artist ${i}`, img, imgs: [img], plays: 1 };
    });
    useAlbumsStore.setState((state) => ({ columns, rows, albums: { ...state.albums, grid: { ...state.albums.grid, albums } } }));
  }, { columns, rows, sources });
  await expect(page.locator("#fm-grid [data-cover-sources]")).toHaveCount(sources.length);
}

async function readCapture(page) {
  return page.evaluate(async () => {
    const result = await window.snapshot.capture();
    if (result.status !== "ready") return result;
    const bitmap = await createImageBitmap(result.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
    window.capturedBlob = result.blob;
    return { status: result.status, type: result.blob.type, width: bitmap.width, height: bitmap.height, pixels: [pixel(64, 64), pixel(320, 64), pixel(64, 320)] };
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("grid-albums-storage", JSON.stringify({ state: { hasSeenWelcome: true }, version: 0 })));
  await page.goto("/");
  await expect(page.locator("#fm-grid")).toBeVisible();
});

test("mixed grid retains artwork, order, empty slots, labels and excludes controls", async ({ page }, testInfo) => {
  await setGrid(page);
  await expect(page.locator("#fm-grid img").first()).toHaveCSS("opacity", "1");
  await expect(page.locator("#fm-grid img").last()).toHaveCSS("opacity", "1");
  await page.evaluate(() => {
    window.store.getState().setTextColor("cover-1", "#00ff00");
    window.store.getState().setTextBackground("cover-1", true);
  });
  await expect(page.locator('#fm-grid [data-id="cover-1"] [data-cover-details] span').first()).toHaveCSS("color", "rgb(0, 255, 0)");
  const before = await page.locator("#fm-grid").screenshot();
  await page.evaluate(() => {
    const grid = document.getElementById("fm-grid");
    const control = document.createElement("div");
    control.className = "no-export";
    control.style.cssText = "position:absolute;inset:0;background:lime;z-index:100";
    grid.appendChild(control);
    window.snapshot = window.freezeGridSnapshot(grid);
    // Simulate editor changes and an incoming refresh after freezing.
    window.store.setState((state) => ({ albums: { ...state.albums, grid: { ...state.albums.grid, albums: [...state.albums.grid.albums].reverse() } } }));
    document.querySelectorAll("#fm-grid img").forEach((img) => { img.src = "/missing-after-freeze.png"; });
  });
  const captured = await readCapture(page);
  expect(captured).toEqual({ status: "ready", type: "image/png", width: 512, height: 512, pixels: [[255, 0, 0, 255], [0, 0, 255, 255], [0, 0, 0, 255]] });
  const labelInk = await page.evaluate(async () => {
    const bitmap = await createImageBitmap(window.capturedBlob);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 210, 256, 46).data;
    let white = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) white++;
    const custom = ctx.getImageData(256, 210, 256, 46).data;
    let green = 0;
    for (let i = 0; i < custom.length; i += 4) if (custom[i] < 30 && custom[i + 1] > 220 && custom[i + 2] < 30) green++;
    const reader = new FileReader();
    const url = await new Promise((resolve) => { reader.onload = () => resolve(reader.result); reader.readAsDataURL(window.capturedBlob); });
    window.snapshot.dispose();
    return { white, green, url };
  });
  expect(labelInk.white).toBeGreaterThan(30);
  expect(labelInk.green).toBeGreaterThan(30);
  await testInfo.attach("editor-before", { body: before, contentType: "image/png" });
  await testInfo.attach("frozen-png", { body: Buffer.from(labelInk.url.split(",")[1], "base64"), contentType: "image/png" });
});

test("10 by 10 output is exactly 2560 square at every DPR", async ({ page }) => {
  await setGrid(page, { columns: 10, rows: 10, sources: [] });
  await page.evaluate(() => { window.snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid")); });
  const capture = await readCapture(page);
  expect([capture.width, capture.height]).toEqual([2560, 2560]);
});

test("slow artwork waits and frozen labels settle after the live grid changes", async ({ page }, testInfo) => {
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const ctx = c.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0, 0, 128, 128);
    return c.toDataURL().split(",")[1];
  });
  await page.route("**/slow.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ contentType: "image/png", body: Buffer.from(png, "base64") });
  });
  await setGrid(page, { sources: ["/slow.png"] });
  await page.evaluate(() => {
    window.snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid"));
    document.querySelector("#fm-grid [data-cover-details]").textContent = "Refreshed title";
  });
  const result = await readCapture(page);
  expect(result.pixels[0]).toEqual([255, 255, 255, 255]);
  const darkInk = await page.evaluate(async () => {
    const bitmap = await createImageBitmap(window.capturedBlob);
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const ctx = c.getContext("2d"); ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 210, 256, 46).data;
    return [...data].filter((value, index) => index % 4 !== 3 && value < 30).length;
  });
  expect(darkInk).toBeGreaterThan(50);
  const bytes = await page.evaluate(async () => [...new Uint8Array(await window.capturedBlob.arrayBuffer())]);
  await testInfo.attach("slow-cover-png", { body: Buffer.from(bytes), contentType: "image/png" });
});

test("cross-origin covers require CORS, and retry can use a frozen fallback URL", async ({ page }) => {
  const body = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const ctx = c.getContext("2d"); ctx.fillStyle = "red"; ctx.fillRect(0, 0, 128, 128);
    return c.toDataURL().split(",")[1];
  });
  let allowCors = false;
  await page.route("https://covers.test/**", (route) => route.fulfill({
    contentType: "image/png", body: Buffer.from(body, "base64"),
    headers: { "Access-Control-Allow-Origin": allowCors ? "*" : "https://other-origin.test" },
  }));
  await setGrid(page, { sources: ["https://covers.test/primary.png"] });
  await page.evaluate(() => {
    window.store.setState((state) => ({ albums: { ...state.albums, grid: { ...state.albums.grid, albums: state.albums.grid.albums.map((album, i) => i === 0 ? { ...album, imgs: [album.img, "https://covers.test/fallback.png"] } : album) } } }));
  });
  await expect(page.locator("#fm-grid [data-cover-sources]")).toHaveAttribute("data-cover-sources", /fallback/);
  await page.evaluate(() => { window.snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid")); });
  expect((await readCapture(page)).status).toBe("artwork-failed");
  allowCors = true;
  await page.route("https://covers.test/primary.png", (route) => route.abort());
  expect((await readCapture(page)).pixels[0]).toEqual([255, 0, 0, 255]);
});

test("failed covers require consent and retry preserves the frozen composition", async ({ page }) => {
  let fail = true;
  await page.route("**/failed.png", (route) => fail ? route.abort() : route.fulfill({ path: "public/img/placeholder.png" }));
  await setGrid(page, { sources: ["/failed.png"] });
  await page.evaluate(() => { window.snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid")); });
  expect(await readCapture(page)).toEqual({ status: "artwork-failed", failedCovers: [{ index: 0, label: "Album 0 by Artist 0" }] });
  const consent = await page.evaluate(async () => {
    const result = await window.snapshot.capture({ allowPlaceholders: true });
    return { status: result.status, failures: result.failedCovers };
  });
  expect(consent).toEqual({ status: "ready", failures: [{ index: 0, label: "Album 0 by Artist 0" }] });
  fail = false;
  expect((await readCapture(page)).status).toBe("ready");
  expect(await page.evaluate(() => document.querySelectorAll('[aria-hidden="true"] > div[style*="256px"]').length)).toBe(0);
});

test("cancellation and oversized PNGs surface actionable errors and leave editor usable", async ({ page }) => {
  await setGrid(page);
  await expect(page.locator("#fm-grid img").last()).toHaveCSS("opacity", "1");
  const error = await page.evaluate(async () => {
    const snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid"));
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) { callback(new Blob([new Uint8Array(10_000_001)], { type: "image/png" })); };
    try { await snapshot.capture(); } catch (error) { return { code: error.code, message: error.message }; }
    finally { HTMLCanvasElement.prototype.toBlob = original; snapshot.dispose(); }
  });
  expect(error.code).toBe("too-large");
  expect(error.message).toContain("smaller grid");
  await page.route("**/cancel.png", (route) => route.abort());
  await setGrid(page, { sources: ["/cancel.png"] });
  const cancelled = await page.evaluate(async () => {
    const snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid"));
    const pending = snapshot.capture(); snapshot.dispose();
    try { await pending; } catch (error) { return error.code; }
  });
  expect(cancelled).toBe("disposed");
  await expect(page.getByRole("button", { name: "Clear Grid", exact: true })).toBeEnabled();
});

test("stalled artwork times out without blocking the editor", async ({ page }) => {
  const pendingRoutes = [];
  await page.route("**/stalled.png", (route) => { pendingRoutes.push(route); });
  await setGrid(page, { sources: ["/stalled.png"] });
  await page.clock.install();
  await page.evaluate(() => {
    window.snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid"));
    window.pendingCapture = window.snapshot.capture();
  });
  await expect.poll(() => pendingRoutes.length).toBeGreaterThan(0);
  await page.clock.fastForward(15_001);
  expect(await page.evaluate(() => window.pendingCapture)).toEqual({ status: "artwork-failed", failedCovers: [{ index: 0, label: "Album 0 by Artist 0" }] });
  await page.evaluate(() => window.snapshot.dispose());
  await Promise.all(pendingRoutes.map((route) => route.abort()));
  await expect(page.getByRole("button", { name: "Clear Grid", exact: true })).toBeEnabled();
});

test("empty artwork lists preserve the editor's placeholder choice", async ({ page }) => {
  await setGrid(page, { sources: ["red"] });
  await page.evaluate(() => {
    window.store.setState((state) => ({ albums: { ...state.albums, grid: { ...state.albums.grid, albums: state.albums.grid.albums.map((album, index) => index === 0 ? { ...album, imgs: [] } : album) } } }));
  });
  await expect(page.locator("#fm-grid img")).toHaveAttribute("src", "/img/placeholder.png");
  await expect(page.locator("#fm-grid img")).toHaveCSS("opacity", "1");
  await page.evaluate(() => { window.snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid")); });
  expect(await readCapture(page)).toEqual({ status: "artwork-failed", failedCovers: [{ index: 0, label: "Album 0 by Artist 0" }] });
});

test("unavailable placeholder artwork leaves a blank cover and permits retry", async ({ page }) => {
  await page.route("**/failed-cover.png", (route) => route.abort());
  await page.route("**/img/placeholder.png", (route) => route.abort());
  await setGrid(page, { sources: ["/failed-cover.png"] });
  await page.evaluate(() => { window.snapshot = window.freezeGridSnapshot(document.getElementById("fm-grid")); });
  expect((await readCapture(page)).status).toBe("artwork-failed");
  const result = await page.evaluate(async () => {
    const capture = await window.snapshot.capture({ allowPlaceholders: true });
    const bitmap = await createImageBitmap(capture.blob);
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d"); context.drawImage(bitmap, 0, 0);
    return { status: capture.status, failedCovers: capture.failedCovers, pixel: [...context.getImageData(64, 64, 1, 1).data] };
  });
  expect(result).toEqual({ status: "ready", failedCovers: [{ index: 0, label: "Album 0 by Artist 0" }], pixel: [0, 0, 0, 255] });
  await page.unroute("**/failed-cover.png");
  await page.route("**/failed-cover.png", (route) => route.fulfill({ path: "public/img/placeholder.png" }));
  expect((await readCapture(page)).status).toBe("ready");
});
