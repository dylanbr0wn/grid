import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

test.use({ javaScriptEnabled: false });
const image = await readFile(new URL("./fixtures/snapshot.png", import.meta.url));

async function publish(request, origin, title) {
  const key = Buffer.alloc(40);
  key.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));
  randomBytes(32).copy(key, 8);
  const response = await request.post(`${origin}/api/snapshots`, {
    headers: { "Idempotency-Key": key.toString("base64url") },
    multipart: { title, image: { name: "grid.png", mimeType: "image/png", buffer: image } },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

for (const [mode, port] of [["production", 5175], ["dev", 5176]]) {
  const origin = `http://127.0.0.1:${port}`;

  test(`${mode}: no-JS viewer fits a narrow screen and downloads the exact PNG`, async ({ page, request }, testInfo) => {
    const title = '<script>alert("title")</script> & my album grid';
    const publication = await publish(request, origin, title);
    const requests = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.setViewportSize({ width: 320, height: 700 });
    const response = await page.goto(origin + publication.publicUrl + "?lastfm-user=do-not-fetch");
    expect(response.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByRole("img", { name: title })).toBeVisible();
    // evaluate remains available to automation when page JavaScript is disabled.
    const dimensions = await page.getByRole("img").evaluate((img) => ({ loaded: img.complete, width: img.naturalWidth, height: img.naturalHeight, displayedWidth: img.getBoundingClientRect().width, scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(dimensions).toMatchObject({ loaded: true, width: 2560, height: 512 });
    expect(dimensions.displayedWidth).toBeLessThanOrEqual(288);
    expect(dimensions.scroll).toBe(dimensions.viewport);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", origin + publication.imageUrl);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", origin + publication.publicUrl);
    expect(await page.content()).not.toContain(publication.managementToken);
    expect(requests.every((url) => url.startsWith(origin))).toBe(true);
    expect(requests.some((url) => /\/api\/users\/|\/src\/|\/assets\/|\/management/.test(url))).toBe(false);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`grid-${publication.id}.png`);
    expect(await readFile(await download.path())).toEqual(image);
    await page.screenshot({ path: testInfo.outputPath(`${mode}-viewer-mobile.png`), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("img")).toHaveCSS("width", "1280px");
    await page.screenshot({ path: testInfo.outputPath(`${mode}-viewer-desktop.png`), fullPage: true });
  });

  test(`${mode}: fallback title and revoked/unknown links show no stale image`, async ({ page, request }) => {
    const publication = await publish(request, origin, "");
    await page.goto(origin + publication.publicUrl);
    await expect(page.getByRole("heading", { name: "Shared album grid" })).toBeVisible();
    const revoked = await request.delete(`${origin}/api/snapshots/${publication.id}`, { headers: { Authorization: `Bearer ${publication.managementToken}` } });
    expect(revoked.status()).toBe(204);
    for (const path of [publication.publicUrl, "/s/unknown"]) {
      const response = await page.goto(origin + path);
      expect(response.status()).toBe(404);
      expect(response.headers()["cache-control"]).toContain("no-store");
      await expect(page.getByRole("heading", { name: "Snapshot unavailable" })).toBeVisible();
      await expect(page.getByText("This link may have expired, been revoked, or never existed.")).toBeVisible();
      await expect(page.getByRole("img")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Download PNG" })).toHaveCount(0);
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
    }
    for (const path of [publication.imageUrl, publication.downloadUrl]) {
      const response = await request.get(origin + path, { headers: { "If-None-Match": "*", Range: "bytes=0-3" } });
      expect(response.status()).toBe(404);
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["x-robots-tag"]).toContain("noindex");
    }
  });
}
