# Snapshot publishing

Share is hidden by default. Set `VITE_ENABLE_SHARING=true` when starting Vite or building the web app to expose it. For Docker, pass `--build-arg VITE_ENABLE_SHARING=true`. This is a build-time flag: changing the running container's environment does not enable Share. Keep it off until persistent storage, backups, and creator management are ready. The flag controls the editor action; snapshot APIs remain gated by `SNAPSHOT_DIR`.

The editor's Share action freezes the grid immediately, then opens a preview of its fixed 2× PNG. It waits for artwork and lists unavailable covers by cover number and label. Retry keeps the frozen composition; Preview with placeholders requires explicit consent. Missing placeholder assets produce blank covers. The optional title starts empty and permits 200 Unicode characters. Editing the source grid after opening Share cannot change the preview or upload.

Only Create link sends a publication request. Cancel, Escape, and closing a preview send nothing. During upload, the dialog keeps its result reachable and disables repeat submissions and closing. Uploads time out after 30 seconds; a timeout is an unknown outcome and recovery uses the same request.

## Recovery and local records

Before the first upload, IndexedDB database `grid-publication-v1`, version 1, saves one pending publication in store `pending` under key `publication`. It contains the exact PNG Blob, title, secret publication key, and retry deadline. A failed browser-storage write prevents uploading. Transactions prevent another tab from overwriting an unresolved attempt. A tab that discovers an existing attempt switches to its preview and waits for an explicit Retry publication action.

Network failures, unreadable replies, and unavailable server storage can mean that creation succeeded. Reopening Share, including after a reload, restores the pending image/title and offers an explicit retry. The client never automatically sends a retry or replaces the key. HTTP retry delays persist with the request and disable premature retry. HTTP 400, 410, 413, and 415 permit an explicit Discard attempt action before a new capture. HTTP 409 retains the saved request for recovery. See the [API retry contract](snapshot-api.md#publication-retries-and-recovery).

Successful publication shows the public URL, expiry, and a distinct private management link. Both have copy actions; clipboard denial leaves selectable links and manual-copy instructions. Management credentials appear only in the private link's fragment, never in the public link.

Successful creations are deduplicated by public ID in the JSON array at localStorage key `grid-shared-links-v1`. Each record contains `id`, `title`, `createdAt`, `expiresAt`, and `managementToken`. The list permits 50 records and never silently removes an older credential. A full, malformed, or unwritable list leaves the successful result on screen with instructions to save the management link. The pending request remains available for recovery. The pending request is removed only after saving the management record. Existing `grid-albums-storage` behavior is unchanged.

Browser records and pending requests contain secrets. Clearing site data removes recovery access; creators should save their private management links. The management page/list UI is DYL-247. Railway durability and deployed release acceptance remain DYL-248 and DYL-249.

## Verification

`PLAYWRIGHT_CHANNEL=chrome pnpm --filter web test:browser publishing.spec.mjs` exercises the dialog at DPR 1, 2, and 3. Tests cover cancellation, exact preview/title publication through the Go API, repeated clicks, lost-reply recovery after reload, artwork retry and placeholder consent, oversized capture/upload, unavailable storage, capacity, throttling, closed retry windows, conflicts, clipboard failure, browser-storage failures before upload and after success, and narrow viewport layout. Run `pnpm build` first so production fixture assets are current.
