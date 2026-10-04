# Public snapshot viewer

`GET /s/:id` serves a Go-rendered HTML page for one unlisted snapshot. It displays the optional title, frozen PNG, expiry in UTC, and a Download PNG link. Empty or whitespace-only titles use "Shared album grid". Titles are escaped with `html/template` in text and attributes. The page contains no JavaScript, editor, album data, inferred creator name, Last.fm fetching, management link, or credential.

Images scale down to fit narrow screens and display at the grid's original logical width on larger screens. Both the displayed image and download use the existing lifecycle-checked API and its exact stored PNG. Display sizing never re-encodes the download. `HEAD` returns the same status and headers without a body.

## Social metadata and origin

Initial HTML includes Open Graph and Twitter title, description, image and image-alt tags, plus absolute page/image URLs and PNG dimensions. Crawlers need no JavaScript. Queries on the incoming link are excluded from metadata.

Set `SNAPSHOT_PUBLIC_ORIGIN=https://grid.dylanbrown.xyz` for deployment behind a TLS-terminating proxy. This must be an HTTP or HTTPS origin without credentials, a path, query, or fragment; a trailing slash is normalized. An invalid value fails startup. Use the actual public browser origin. The setting affects only crawler URLs; API creation responses and viewer image/download links remain relative to the browser origin.

Without that setting, local/direct serving uses the request's scheme and Host. Forwarded host/protocol headers never select metadata URLs. A proxy deployment must set the canonical origin to advertise HTTPS correctly and keep metadata independent of incoming Host values.

## Unavailable links and privacy

Expired, revoked, invalid, and unknown snapshots receive 404 HTML explaining that the link may have expired, been revoked, or never existed. Disabled or failed storage returns 503 HTML with a retry-later message. Unavailable pages contain no old title, image, download, or social-image metadata. Nested misses under `/s/` receive the same unavailable page; unsupported methods return 405 with `Allow: GET, HEAD`.

All viewer responses share the API's no-store browser/CDN/cache headers, no-referrer policy, noindex/nofollow/noarchive robots header, and nosniff header. HTML also includes a robots meta tag and a content security policy that blocks scripts, frames, forms, and external resources. There is no listing or sitemap entry. The image URL still checks expiry and revocation on every read. External chat preview caches and previously downloaded copies cannot be recalled.

Go handles `/s/:id` before production SPA fallback and before dev proxying to Vite. It reserves `/s/` paths while leaving the single-segment `/s` username route, other username routes, query-param Last.fm entry, API errors, and Vite HMR behavior intact.

## Verification

Go tests check initial metadata without JavaScript, title escaping, fallback titles, exact image/download bytes, HEADs, privacy/cache headers, unavailable storage, expiry after restart, revocation, origin configuration, forwarded-header exclusion, and routing coexistence. Store tests also cover the exact expiry boundary before cleanup.

Run `pnpm build` before `pnpm --filter web test:browser`. The browser suite starts isolated production and dev Go servers in addition to Vite. Temporary snapshot directories are deleted when those servers stop. Viewer tests disable JavaScript and check narrow and desktop layouts, decoded image dimensions, exact downloaded bytes, metadata, no editor requests, fallback titles, and revoked/unknown states at device pixel ratios 1, 2, and 3. The dev fixture intentionally points at an unreachable Vite server.

Publishing UI, creator management UI, Railway storage/backups, and deployed chat/CDN acceptance remain DYL-246 through DYL-249.
