# Snapshot storage

DYL-243 adds `internal/snapshot`, a directory-backed store for immutable PNGs and minimal metadata. DYL-244 adds [publication and management APIs](snapshot-api.md) and durable retry recovery. Viewer pages remain DYL-245.

## Configuration and ownership

Set `SNAPSHOT_DIR` to an existing, dedicated directory writable by the Go service. For example, create a local directory outside the checkout and set `SNAPSHOT_DIR=/absolute/path/to/snapshots` in the root `.env`. The service opens the directory in both development and production. It never creates it or substitutes a temporary directory. An inaccessible directory, failed lock, unsupported filesystem operation, corrupt record, or unexpected entry fails startup.

Leaving `SNAPSHOT_DIR` unset disables storage. Setting `SNAPSHOT_CAPACITY_BYTES` without a directory is an error. The optional capacity must be a positive decimal integer and defaults to **250,000,000 image bytes**. The package's `Config.Capacity` uses zero for the same default. Each image is limited to **10,000,000 bytes**. The store validates complete PNGs, with dimensions up to 2560 × 2560, and titles of at most 200 Unicode characters. It stores the supplied bytes exactly, without re-encoding or storing album data or source URLs.

Use a persistent mount for hosted sharing. Setting a path does not prove that the mount survives deployment; Railway mount and backup configuration remain DYL-248. The directory must reside on a local filesystem that supports advisory `flock`, atomic rename, file sync, and directory sync. Storage supports Linux and macOS; enabling it on other operating systems fails explicitly. One process owns the directory through a nonblocking exclusive lock on `.lock`. Other processes must not modify the directory, including while the service is running. Never remove the lock file while an owner may be running.

## Version 1 schema

Each committed record is named `<public-id>.snapshot`. A single file contains:

1. A four-byte unsigned big-endian length for the JSON header.
2. That UTF-8 JSON header, limited to 4096 bytes.
3. The exact PNG bytes, with no trailing data.

Header fields are `version`, `id`, `title`, `createdAt`, `expiresAt`, `imageBytes`, `managementHash`, and `imageHash`. Times use UTC RFC 3339 JSON timestamps. Original `Put` records use version `1`. API publications through `PutWithKey` use version `2`, adding `retryUntil` as an integer Unix timestamp and an optional `revoked` boolean. Version 2 keeps the same file framing and metadata. The store reads both versions; older binaries cannot read version 2 records, so restore a compatible binary and backup together if rolling back. Expiry is creation plus exactly 90 × 24 hours. SHA-256 checksums and byte counts verify records during startup and reads. Invalid or unsupported committed records fail closed and remain on disk for investigation. Recovery does not silently delete damaged publications.

Public IDs contain 24 cryptographically random bytes encoded as unpadded base64url. Management tokens independently contain 32 random bytes. `Put` returns the token once; `PutWithKey` can recover the same token from its secret publication key on retries; the file holds only its SHA-256 hash. `Get` returns public `Metadata` and PNG bytes and never returns that hash or token. `Revoke` compares the token hash in constant time. A public ID cannot authorize revocation. Absent records accept repeated revocation as an idempotent no-op. Live records reject incorrect credentials. Creation and expiry times, IDs, titles, and images are immutable.

Files are created with mode `0600`. Protect the directory and backups because they contain unlisted snapshots and management-token hashes. This store does not implement accounts, HTTP caching, or an upload rate limit. The API applies cache policies and process-local upload limits.

## Publication, deletion, and recovery

Publication holds the store mutex for validation, capacity checking, and commit. It writes a `.pending-<id>` file exclusively, syncs the complete file, renames it to `<id>.snapshot`, and syncs the directory before returning success. Metadata and image commit together. A successful result survives process restart with the same metadata and image bytes.

`Get` checks revocation and the expiry time on every access, including at the exact expiry boundary. It rejects expired records even if no cleanup has run. Revocation and cleanup rename a committed file to `.deleted-<id>` and sync the directory before unlinking it and syncing the directory again. The rename removes the record from the readable namespace; restart recovery never republishes deletion files. Successful revocation reclaims the image bytes before returning.

Cleanup runs at startup, before every publication, and hourly in the Go service. Restart recovery removes recognized pending and deletion files, syncs the directory, validates committed records, rebuilds accounting from their image sizes, and reclaims expired records before accepting work. Cleanup and repeated revocation are safe to repeat.

Any filesystem mutation error or failed record verification fences the store: subsequent reads and mutations return `ErrUnavailable` until the process restarts or the owner closes and reopens it. This prevents an uncertain commit or failed cleanup from admitting more writes. An error after rename may leave a complete publication on disk, even though the caller received no success or management token. Recovery accounts for that record, and its normal expiry reclaims it. Callers must treat such an error as an uncertain outcome and must not silently retry it. A failed revocation may require a retry after reopening if its rename never happened.

## Capacity semantics

The capacity counts live committed PNG bytes. Record headers, directory entries, and the lock file require additional disk space. During a serialized publication, existing image bytes plus the pending PNG fit under the cap. An I/O error stops further operations, and reopening removes pending/deletion files before any new publication. Repeated failed writes cannot accumulate unaccounted temporary images.

Expired images are removed before capacity checks. At capacity, `Put` returns `ErrCapacity`; existing live records remain readable. Lowering the cap below existing use also preserves those records and rejects new writes until enough space is reclaimed. An interrupted or failed deletion cannot free capacity for another write until recovery succeeds. This limit is not a disk quota and does not bound traffic, hosting cost, filesystem overhead, or backups. Leave space for those costs on the volume.

## Package usage

Open with `snapshot.Open(snapshot.Config{Directory: path})` and close the returned store when releasing ownership. `Put(title, png)` returns `Publication`, `Get(id)` returns `Metadata` and exact PNG bytes, `Revoke(id, managementToken)` deletes an authorized publication, and `Cleanup()` reclaims expired records. Concurrent calls on the same store are safe. Readers receive their own image slice. An already returned image cannot be recalled after expiry or revocation; future origin reads are denied.

## Durable API retry receipts

`PutWithKey(title, png, key)` atomically derives and commits one publication per secret timestamped key. Matching retries return the original metadata and management token without charging capacity again, including after an uncertain commit or process restart. Conflicting content returns `ErrConflict`. New publications accept keys for 24 hours from their timestamp, with at most five minutes of forward clock skew. Active records can be recovered through expiry. Invalid keys return `ErrKey`; revoked, expired, and unknown stale keys return `ErrGone`. See the API contract for key encoding and domain-separated derivation.

If a keyed snapshot is revoked before its creation window closes, the store writes and syncs a header-only pending record with `revoked: true`, atomically replaces the committed file, and syncs the directory. That replacement is the durable read barrier and removes the image bytes. Only after success does accounting reclaim them. The receipt retains the original metadata and hashes, and is removed at `retryUntil` by cleanup. An uncertain replacement fences all operations; reopening distinguishes the retained image from a committed revocation receipt and never republishes the receipt as an image. Once the window closes, revocation uses the normal durable deletion path because the key can no longer create a record.

Receipts count zero image bytes but take at most 4100 bytes of file framing and header each. API global attempt limits bound their creation during a process lifetime, and cleanup reclaims them after the 24-hour window. Counters reset on restart; filesystem headers/receipts are still overhead outside the image cap. Expired records continue to be deleted entirely because their creation windows closed long before their 90-day expiry.

`Manage(id, token)` authenticates with the management hash, verifies the stored record, and returns only public metadata plus `active`, `revoked`, or `expired` status. Cleanup may remove inactive metadata, after which management reads return `ErrNotFound`. Legacy version 1 publications retain their original random-token and immediate-deletion behavior.
