import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const key = "grid-shared-links-v1";
const id = "a".repeat(32), token = "b".repeat(42) + "A";
const record = { id, managementToken: token, title: "Remembered grid", createdAt: "2026-10-04T00:00:00Z", expiresAt: "2027-01-02T00:00:00Z" };
const metadata = { id, title: "Server title", createdAt: record.createdAt, expiresAt: record.expiresAt, imageBytes: 100 };

async function seed(page, value = [record]) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem("grid-albums-storage", JSON.stringify({ state: { hasSeenWelcome: true }, version: 0 }));
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  }, { key, value });
}
async function mock(page, status = "active") {
  await page.route(`**/api/snapshots/${id}/management`, (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    return route.fulfill({ json: { snapshot: metadata, status } });
  });
}
async function openList(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Your shared links", exact: true }).click();
}

test("remembered links reconcile status, copy failures retain selectable credentials, deletion blocks public access", async ({ page, context }) => {
  await seed(page); await mock(page);
  await openList(page);
  await expect(page.getByRole("heading", { name: "Server title" })).toBeVisible();
  await expect(page.getByText("Status: active", { exact: true })).toBeVisible();
  await expect(page.getByText(/Clearing browser data loses this list/)).toBeVisible();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy management link" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://127.0.0.1:5174/manage/${id}#token=${token}`);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw Error("Denied"); }; });
  await page.getByRole("button", { name: "Copy public link" }).click();
  await expect(page.getByText(/copy it manually/)).toBeVisible();
  await expect(page.getByLabel("Private management link")).toHaveValue(new RegExp(token));
  await page.route(`**/api/snapshots/${id}`, (route) => route.fulfill({ status: 204 }));
  await page.getByRole("button", { name: "Delete snapshot", exact: true }).click();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(page.getByText("Status: revoked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete snapshot", exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).toEqual([record]);
});

test("lost deletion response preserves access and status check discovers prior deletion", async ({ page }) => {
  await seed(page); await mock(page); await openList(page);
  await page.route(`**/api/snapshots/${id}`, (route) => route.abort());
  await page.getByRole("button", { name: "Delete snapshot", exact: true }).click();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(page.getByRole("alert")).toContainText("may have succeeded");
  await expect(page.getByRole("button", { name: "Delete snapshot", exact: true })).toBeDisabled();
  await mock(page, "revoked");
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByText("Status: revoked", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Your shared links", exact: true }).click();
  await expect(page.getByText("Status: revoked", { exact: true })).toBeVisible();
});

for (const status of ["expired", "revoked"]) test(`stale record reconciles ${status} without removing credentials`, async ({ page }) => {
  await seed(page); await mock(page, status); await openList(page);
  await expect(page.getByText(`Status: ${status}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete snapshot", exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).toEqual([record]);
});

for (const status of [404, 503]) test(`management HTTP ${status} retains record and supports retry`, async ({ page }) => {
  await seed(page);
  await page.route(`**/api/snapshots/${id}/management`, (route) => route.fulfill({ status, json: { error: "Unavailable" } }));
  await openList(page);
  await expect(page.getByRole("alert")).toContainText(status === 404 ? "credential not found" : "Status unavailable");
  await expect(page.getByLabel("Private management link")).toHaveValue(new RegExp(token));
  await mock(page); await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByText("Status: active", { exact: true })).toBeVisible();
});

for (const value of ["malformed", JSON.stringify({ version: 2, shares: [record] }), [{ ...record, expiresAt: "bad" }]]) test(`malformed list ${JSON.stringify(value)} leaves editor usable`, async ({ page }) => {
  await seed(page, value); await openList(page);
  await expect(page.getByRole("alert")).toContainText("Saved links could not be read");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator("#fm-grid")).toBeVisible();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("img", { name: "Frozen grid preview" })).toBeVisible();
});

test("storage unavailable leaves editor usable", async ({ page }) => {
  await seed(page); await page.goto("/");
  await page.evaluate((key) => {
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (name) { if (name === key) throw Error("Denied"); return get.call(this, name); };
  }, key);
  await page.getByRole("button", { name: "Your shared links", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Saved links could not be read");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator("#fm-grid")).toBeVisible();
});

test("saved management link works in a fresh browser against real server, with no editor or credential leakage", async ({ page, request }, testInfo) => {
  const publicationKey = randomBytes(40);
  publicationKey.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));
  const created = await request.post("http://127.0.0.1:5175/api/snapshots", {
    headers: { "Idempotency-Key": publicationKey.toString("base64url") },
    multipart: { title: "Fresh browser grid", image: { name: "grid.png", mimeType: "image/png", buffer: readFileSync("tests/browser/fixtures/snapshot.png") } },
  });
  expect(created.status()).toBe(201);
  const publication = await created.json();
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.route("**/api/snapshots/**", (route) => route.fetch({ url: route.request().url().replace("127.0.0.1:5174", "127.0.0.1:5175") }).then((response) => route.fulfill({ response })));
  await page.goto(`/manage/${publication.id}#token=${token}`);
  await expect(page.getByRole("alert")).toContainText("credential not found");
  await expect(page.getByRole("heading", { name: publication.title, exact: true })).toHaveCount(0);
  await page.goto("about:blank");
  await page.goto(publication.managementUrl);
  await expect(page.getByText("Status: active", { exact: true })).toBeVisible();
  await expect(page.locator("#fm-grid")).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();
  expect(new URL(page.url()).hash).toBe(`#token=${publication.managementToken}`);
  await page.reload();
  await expect(page.getByText("Status: active", { exact: true })).toBeVisible();
  expect(requests.some((url) => url.includes(publication.managementToken) || url.includes("/api/users/") || url.includes("editor-main"))).toBe(false);
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(page.locator("main")).toHaveCSS("color", "oklch(0.87 0 0)");
  expect(await page.locator("main").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("management-mobile.png") });
  let publicHeaders;
  await page.context().route(`**${publication.publicUrl}`, async (route) => {
    publicHeaders = route.request().headers();
    await route.fulfill({ contentType: "text/html", body: "Public snapshot" });
  });
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Open public snapshot" }).click();
  const popup = await popupPromise;
  await expect(popup.getByText("Public snapshot")).toBeVisible();
  expect(publicHeaders.referer).toBeUndefined();
  expect(publicHeaders.authorization).toBeUndefined();
  await popup.close();
  await page.getByRole("button", { name: "Delete snapshot", exact: true }).click();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(page.getByText("Status: revoked", { exact: true })).toBeVisible();
  expect((await request.get("http://127.0.0.1:5175" + publication.publicUrl)).status()).toBe(404);
  // The saved link can still reconcile repeated deletion in another visit.
  await page.goto(publication.managementUrl);
  await expect(page.getByText("Status: revoked", { exact: true })).toBeVisible();
});

test("incomplete saved management link has a clear error", async ({ page }) => {
  await page.goto(`/manage/${id}#token=wrong`);
  await expect(page.getByRole("alert")).toContainText("Invalid management link");
  await expect(page.locator("#fm-grid")).toHaveCount(0);
});
