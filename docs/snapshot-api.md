# Snapshot API

DYL-244 connects the immutable PNG store to Go/Fiber and adds validated client helpers in `web/src/lib/snapshot-api.ts`. DYL-245 adds the [public viewer](snapshot-viewer.md) at `/s/:id`. The publishing dialog and management page remain DYL-246 and DYL-247. All URLs returned by the API are relative to the Go/browser origin, so request Host or forwarded-host headers never determine API links. Viewer social metadata uses absolute URLs.

## Resources

| Method | Route | Result |
| --- | --- | --- |
| POST | `/api/snapshots` | Create or recover one publication, including management access |
| GET, HEAD | `/api/snapshots/:id` | Public metadata |
| GET, HEAD | `/api/snapshots/:id/image` | Exact PNG bytes, `image/png` |
| GET, HEAD | `/api/snapshots/:id/download` | Same bytes with an attachment filename `grid-:id.png` |
| GET, HEAD | `/api/snapshots/:id/management` | Authorized metadata and lifecycle status |
| DELETE | `/api/snapshots/:id` | Authorized revocation, 204 with no body |

There is no listing route. Storage must be enabled through `SNAPSHOT_DIR`; otherwise these resources return 503.

Creation takes `multipart/form-data` with exactly one `image` part and at most one `title` part. Omit title or send an empty string for no title. Unknown or duplicate fields, remote URLs, JSON album data, malformed multipart data, and compressed request bodies are rejected. A title must be valid UTF-8 with at most 200 Unicode characters. Titles remain literal text and Go's JSON encoder escapes HTML characters. The public viewer also renders titles as escaped text.

The service checks the actual PNG, fully decodes it within the store, and accepts only widths and heights of 256 × an integer from 1 through 10. This matches fixed 2× capture of 128-pixel cells and does not change the editor's rows/columns contract. Images may use at most 10,000,000 bytes. The total request may use at most 10,016,384 bytes, including multipart framing and title. The native listener and net/http development adapter both enforce the request bound, including unknown-length bodies. PNG bytes are stored unchanged.

A successful creation or successful recovery returns 201 and `Location: /api/snapshots/:id`, with this shape:

```json
{
  "id": "<32-character public ID>",
  "title": "My grid",
  "createdAt": "<UTC RFC3339 timestamp>",
  "expiresAt": "<creation plus 90 days>",
  "imageBytes": 12345,
  "publicUrl": "/s/<id>",
  "imageUrl": "/api/snapshots/<id>/image",
  "downloadUrl": "/api/snapshots/<id>/download",
  "managementToken": "<43-character secret>",
  "managementUrl": "/manage/<id>#token=<secret>"
}
```

Public metadata contains only `id`, `title`, `createdAt`, `expiresAt`, and `imageBytes`. It never includes token hashes, publication keys, or management URLs. It contains no source identity, cover URL, or album data.

Management requests send `Authorization: Bearer <managementToken>`. Query-string credentials are never accepted. The management link keeps the credential in its URL fragment, which is not sent in HTTP requests or referrers. Future management UI must read the fragment locally, clear it from the visible URL, and send the token only in the authorization header. A management GET returns `{"snapshot": <public metadata>, "status": "active"}`. Status can also be `revoked` while its retry receipt exists, or `expired` before cleanup. Cleaned-up records return 404. No response returns other snapshots or authorization data.

Missing/invalid credentials and unknown snapshots use the same 404 error. DELETE of a missing record with a syntactically valid credential is an idempotent 204; it cannot affect any live record. A wrong token for a retained record returns 404. Successful revocation immediately rejects public reads and reclaims image bytes.

## Publication retries and recovery

Generate a fresh secret **once for each explicit publication** with `newPublicationKey()`. The key is canonical unpadded base64url encoding of 40 bytes: an eight-byte unsigned big-endian Unix timestamp in seconds followed by 32 cryptographically random bytes. Send it only in the `Idempotency-Key` header. Keep it secret just like the management credential.

Before sending, the publishing UI must retain that key, the exact finished PNG, and the exact title so it can recover after a lost response. This persistence and UI are DYL-246. The API helper requires the caller to provide the key and never retries or replaces it automatically.

Storage derives the public ID and management token independently with SHA-256 and separate `grid-publication-id-v1:` / `grid-management-token-v1:` prefixes over the decoded key. The first 24 ID digest bytes and all 32 token digest bytes are encoded as base64url. Knowledge of the public ID does not reveal either secret. Disk stores only the management-token hash and image hash, not the key or token.

The first successful commit fixes the PNG, title, creation time, and expiry. Concurrent or later identical requests recover that result and the same token, with no second image or capacity charge. A key reused with different PNG bytes or a different title returns 409. Recovery also works when a commit reached disk but the process failed before sending success, and after reopening the store.

An unknown key can create a publication for **24 hours from its embedded timestamp**. A timestamp more than five minutes ahead of the service clock returns 400. Once a publication exists, identical retries can recover it until its 90-day expiry, even after the creation window closes. Revocation or expiry returns 410 on a publication retry. A revoked publication retains a small header-only receipt until its creation window closes; cleanup can then remove it because the old key can no longer create anything. Revocation does not retain PNG bytes. Old keys whose records have been cleaned up still return 410. Keys are not reusable after deletion.

A capacity failure does not bind the key. Retry with that same key while its creation window remains open. Never automatically generate a new key after any failed/lost response, 409, or 410. A 503 after filesystem failure can mean the outcome is unknown; wait for store recovery and retry the exact request/key to reconcile it. If recovery finds no record after the window has closed, 410 makes that failure explicit. The user may then choose a new publication.

## Throttling and proxy configuration

By default each process permits **10 publication attempts per client IP per hour** and **120 attempts globally per hour**. Set positive integers in `SNAPSHOT_UPLOADS_PER_IP` and `SNAPSHOT_UPLOADS_GLOBAL` to change these ceilings. Fixed windows start on the first attempt after a window ends. Per-IP counts share the global window boundary. All creation requests that reach the handler count, including invalid requests and identical retries. The global ceiling also bounds the in-memory IP map. Counters reset on process restart; these are single-process upload controls, not a distributed quota or a bound on hosting cost. Bodies are bounded before parsing, but native Fiber buffers them before the handler's rate check. Edge traffic controls remain useful for deployments.

Default IP identity is the direct TCP peer. Untrusted `X-Real-IP` and `X-Forwarded-For` headers cannot bypass limits. Behind Railway, a CDN, or another proxy, all clients may share the proxy's limit until it is explicitly configured. `SNAPSHOT_TRUSTED_PROXIES` accepts comma-separated IP addresses or CIDR ranges. Only those TCP peers may supply a sanitized **single-client-IP** `X-Real-IP` header. The final trusted proxy must overwrite this header from verified client identity, stripping inbound user values. Do not allow arbitrary internet peers or broad private networks by default. The service does not guess Railway proxy addresses or trust a whole forwarded chain. Confirm the deployed proxy and header behavior during DYL-248/DYL-249.

Fiber's [configuration documentation](https://docs.gofiber.io/api/fiber/) describes the body limit and proxy trust settings used here.

## Errors and caching

Every failure uses `{"error":"message"}`. Client helpers validate successful responses with arktype and retain HTTP status and `Retry-After` through `SnapshotAPIError`.

| Status | Meaning and client action |
| --- | --- |
| 400 | Invalid image, grid dimensions, title, multipart request, or key/clock. Correct input before another explicit attempt. |
| 404 | Snapshot unavailable or management credential incorrect. Expired/revoked public reads also use this response. |
| 409 | This key already committed different content. Recover the original exact request. |
| 410 | Retry cannot create/recover this publication. Show the expired/revoked/closed-window outcome. |
| 413 | Image or request too large. Capture a smaller grid before another explicit attempt. |
| 415 | Encoded request body unsupported. Send raw multipart data. |
| 429 | Upload limit reached. Show the error and wait the `Retry-After` seconds before retrying with the same key. |
| 507 | Snapshot capacity full. Show the storage-full error and retry later with the same key. |
| 503 | Sharing disabled or storage unavailable. After recovery, reconcile an uncertain publication with the same key. |

All snapshot responses, including errors and HEADs, use `Cache-Control: private, no-store, max-age=0`, `CDN-Cache-Control: no-store`, and `Surrogate-Control: no-store`. They also use `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow, noarchive`, and `X-Content-Type-Options: nosniff`. Conditional and range request headers never skip the lifecycle check or produce a 304; live image reads return the full exact PNG. Viewer HTML follows the same cache policy. CDN deployments must honor these headers and remove any cache-everything rule for these routes. External chat caches and copies already downloaded cannot be recalled.

No API logger records credentials, request headers, multipart bodies, or creation response bodies. Client helpers do not log them either. If adding request tracing or proxy logs, redact `Authorization` and `Idempotency-Key` and omit creation response bodies. Never place credentials in query strings, public metadata, or preview tags.

## Verification

API tests cover input validation, size limits through both serving modes, exact PNG reads/downloads, title escaping, management authorization/status, storage capacity, lifecycle, restart recovery, duplicate/conflicting retries, cache headers, and IP/global rate limits. Storage tests cover concurrent retries, exact expiry boundaries, receipt cleanup, and injected commit/revocation failures. Client tests cover request shapes, credential placement, malformed response rejection, actionable errors, and explicit retries after a lost response. The [viewer checks](snapshot-viewer.md) cover public HTML and browser viewing/downloads. Deployed CDN/persistence acceptance remains DYL-248/DYL-249.
