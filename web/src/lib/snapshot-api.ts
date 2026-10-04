import { type } from "arktype";

const publicId = /^[A-Za-z0-9_-]{32}$/;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const token = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const metadata = type({
  id: publicId,
  title: "string",
  createdAt: timestamp,
  expiresAt: timestamp,
  imageBytes: "number.integer > 0",
}).onUndeclaredKey("reject");
const publication = type({
  id: publicId,
  title: "string",
  createdAt: timestamp,
  expiresAt: timestamp,
  imageBytes: "number.integer > 0",
  publicUrl: "string",
  imageUrl: "string",
  downloadUrl: "string",
  managementToken: token,
  managementUrl: "string",
}).onUndeclaredKey("reject");
const management = type({
  snapshot: metadata,
  status: "'active' | 'expired' | 'revoked'",
}).onUndeclaredKey("reject");

export type SnapshotMetadata = typeof metadata.infer;
export type SnapshotPublication = typeof publication.infer;
export type SnapshotManagement = typeof management.infer;

// Keep the status and delay so the publication UI can show actionable failures.
// Do not log request headers, response bodies, or publication credentials.
export class SnapshotAPIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter: number | null,
  ) {
    super(message);
  }
}

/** Generate once per explicit publication, then retain with the exact PNG/title.
 * Network failures must reuse this key. No API helper retries automatically.
 */
export function newPublicationKey(now = Date.now()): string {
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  new DataView(bytes.buffer).setBigUint64(0, BigInt(Math.floor(now / 1000)));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    referrerPolicy: "no-referrer",
    credentials: "omit",
    redirect: "error",
  });
  if (!response.ok) {
    const parsed = type("string.json.parse").to({ error: "string" })(await response.text());
    const delay = response.headers.get("Retry-After");
    throw new SnapshotAPIError(
      parsed instanceof type.errors ? `Snapshot API error: ${response.status}` : parsed.error,
      response.status,
      delay !== null && /^\d+$/.test(delay) ? Number(delay) : null,
    );
  }
  return response;
}

function validateMetadata(value: SnapshotMetadata): void {
  const created = Date.parse(value.createdAt);
  const expires = Date.parse(value.expiresAt);
  if (!Number.isFinite(created) || expires - created !== 90 * 24 * 60 * 60 * 1000 ||
    [...value.title].length > 200 || value.imageBytes > 10_000_000) {
    throw new Error("Snapshot data validation error");
  }
}

export async function publishSnapshot(image: Blob, title: string, key: string): Promise<SnapshotPublication> {
  if (!/^[A-Za-z0-9_-]{53}[AQgw]$/.test(key)) throw new Error("Invalid publication key");
  const body = new FormData();
  body.set("image", image, "grid.png");
  body.set("title", title);

  const response = await request("/api/snapshots", { method: "POST", headers: { "Idempotency-Key": key }, body });

  const result = type("string.json.parse").to(publication)(await response.text());
  if (result instanceof type.errors) throw new Error("Snapshot data validation error");
  validateMetadata(result);
  if (result.publicUrl !== `/s/${result.id}` ||
    result.imageUrl !== `/api/snapshots/${result.id}/image` ||
    result.downloadUrl !== `/api/snapshots/${result.id}/download` ||
    result.managementUrl !== `/manage/${result.id}#token=${result.managementToken}`) {
    throw new Error("Snapshot data validation error");
  }
  return result;
}

export async function fetchSnapshot(id: string): Promise<SnapshotMetadata> {
  if (!publicId.test(id)) throw new Error("Invalid snapshot ID");
  const response = await request(`/api/snapshots/${id}`);
  const result = type("string.json.parse").to(metadata)(await response.text());
  if (result instanceof type.errors || result.id !== id) throw new Error("Snapshot data validation error");
  validateMetadata(result);
  return result;
}

function authorization(id: string, credential: string): HeadersInit {
  if (!publicId.test(id) || !token.test(credential)) throw new Error("Invalid management credential");
  return { Authorization: `Bearer ${credential}` };
}

export async function fetchSnapshotManagement(id: string, credential: string): Promise<SnapshotManagement> {
  const headers = authorization(id, credential);
  const response = await request(`/api/snapshots/${id}/management`, { headers });
  const result = type("string.json.parse").to(management)(await response.text());
  if (result instanceof type.errors || result.snapshot.id !== id) throw new Error("Snapshot data validation error");
  validateMetadata(result.snapshot);
  return result;
}

export async function revokeSnapshot(id: string, credential: string): Promise<void> {
  const headers = authorization(id, credential);
  const response = await request(`/api/snapshots/${id}`, { method: "DELETE", headers });
  if (response.status !== 204) throw new Error("Snapshot data validation error");
}
