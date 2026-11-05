# Railway snapshot storage and recovery

DYL-248 prepares the container and operating procedure. Repository checks and local Docker drills do not prove Railway persistence or backups. Record provider evidence separately before enabling publication. DYL-249 owns release acceptance.

## Service configuration

Use the existing Grid service, one replica, its Dockerfile, and `/api/health`. Attach a persistent volume at `/data`, with 5 GB as the operating ceiling. Do not write snapshots under `/app`, into the image, or in a pre-deploy command. Railway mounts the volume at runtime. These settings apply after this version's entrypoint is deployed:

| Variable | Value |
| --- | --- |
| `RAILWAY_RUN_UID` | `0` |
| `SNAPSHOT_DIR` | `/data/snapshots` |
| `SNAPSHOT_CAPACITY_BYTES` | `250000000` |
| `SNAPSHOT_PUBLIC_ORIGIN` | `https://grid.dylanbrown.xyz` |
| `SNAPSHOT_UPLOADS_PER_IP` | `10` |
| `SNAPSHOT_UPLOADS_GLOBAL` | `120` |
| `VITE_ENABLE_SHARING` | Leave false until infrastructure checks pass; true requires a new web build |

The PNG limit is fixed at 10,000,000 bytes. There is no environment variable that raises it. Leave `SNAPSHOT_TRUSTED_PROXIES` unset until the final proxy's peer addresses and sanitized `X-Real-IP` behavior have been verified. The shared peer limit is deliberately conservative in the meantime. Never trust arbitrary forwarded headers or a whole private network just to avoid throttling.

Railway's [volume guidance](https://docs.railway.com/volumes) says mounts are root-owned and recommends `RAILWAY_RUN_UID=0` for non-root images. Grid's entrypoint uses root only to create `/data/snapshots`, set its owner to `65534:65534`, and restrict it to mode `0700`. It then uses `gosu` to replace itself with the unprivileged process. The normal image still defaults to `USER 65534:65534`.

Root bootstrap requires an existing mount, verified with `mountpoint`, and exactly `$RAILWAY_VOLUME_MOUNT_PATH/snapshots`. Missing mounts, symlink paths, and other directory choices fail startup instead of creating ephemeral storage. Existing record files must already be readable and writable by UID 65534, including after restore. Bootstrap never recursively changes volume ownership. Store files use `0600`; keep archives and quarantined records private too. Avoid custom start commands that bypass the entrypoint.

`SNAPSHOT_DIR` unset leaves the editor and existing APIs available, logs that sharing is disabled, and returns 503 for snapshot requests. Configured but broken storage fails startup. Keep the Share build flag false while infrastructure is unconfigured. `/api/health` remains the editor's healthcheck and is not a durability assertion.

## Backups

Choose daily and weekly volume backups. Railway currently documents daily backups every 24 hours retained for 6 days, and weekly backups every 7 days retained for 27 days. Enable both in the attached volume's Backups tab and verify they appear there. This is the intended schedule, not a claim that it has been configured. See [Railway backups](https://docs.railway.com/volumes/backups) for current retention and restore behavior.

Before a manual checkpoint, stop the writer or disable ingress and drain requests, stop the process, and then capture the volume. Do not copy a changing directory as an application-consistent backup. Keep the original volume and a compatible binary revision. Restoring an older binary that cannot read version 2 records is unsupported. Scheduled volume backups may include interrupted writes; store recovery validates records and removes pending/deleted files before serving. A damaged committed record fails closed and needs investigation.

Backups contain unlisted images and management hashes. They can retain previously deleted images until backup retention ends. Keep them access restricted. Snapshot image limits do not bound backup size or cost.

## Restore without resurrecting revoked shares

An older backup does not know about newer revocations. There is no permanent revocation ledger outside the snapshot directory. Never bring restored data online directly.

1. Block public ingress and publication for the service, including its Railway domain and custom domain. Hiding Share alone does not disable the API. Stop the writer. Retain a cold copy of the newest authoritative directory and the original volume. Record the backup timestamp and compatible code revision.
2. Restore into an isolated service with no public networking, or keep the production service stopped while the restored volume is examined offline. Railway stages a restored volume and retains the previous volume. Do not press Deploy into publicly reachable HTTP serving before reconciliation. A maintenance start command can run `/bin/sh /app/entrypoint.sh ./bin/grid -snapshot-check` with networking disabled; it exits without starting HTTP.
3. Reconcile every backup record against the newest authoritative directory while both are offline. Quarantine a backup record outside `SNAPSHOT_DIR` if its ID is absent from current data or its current record is a revocation receipt. Preserve any current revocation receipts in the restored directory so still-valid publication keys cannot recreate their shares. Only retain a backup's active record when current data independently confirms it is still active. Compare immutable metadata and image hashes for matching IDs; stop on disagreement. Never use public-link possession as proof of current authorization.
4. If authoritative current state is unavailable or incomplete, quarantine **all** restored records and receipts outside `SNAPSHOT_DIR`. Do not guess which shares were revoked. This deliberately loses access to old links instead of republishing potentially revoked images. Wait at least 24 hours plus five minutes from the latest possible pre-incident publication, with a trustworthy UTC clock, before reopening publication. Otherwise a lost receipt could allow a recent publication key to recreate a revoked share. Retaining current receipts also protects normal reconciled restores during this window.
5. Ensure the remaining directory and files belong to UID 65534 and modes are `0700`/`0600`. Run `./bin/grid -snapshot-check` through the container entrypoint against the actual mounted data. This exclusively locks the directory, validates all records, cleans expired snapshots using the current clock, reports aggregate usage, and exits. It is a mutating recovery check, so preserve the cold copy first. Never run it alongside the service. Unexpected files, corrupt records, or lock contention must fail. No HTTP socket opens in this mode.
6. Before public serving resumes, verify reconciled revoked/expired IDs cannot be read, surviving PNG bytes match, and surviving management tokens still authenticate in the isolated service. Confirm capacity accounting. Restore the normal command, enable ingress, verify the original URLs, and check the backup schedules on the replacement volume. Keep the prior volume until the recovery has been accepted.

Expiry is checked at each read, independently of cleanup. Startup removes expired records before listening; cleanup also runs before writes and hourly. A correct current clock is required. Do not change production retention or the system clock for a test.

## Monitoring and rollback

Startup and hourly cleanup log `image_bytes`, `capacity_bytes`, and `records` without IDs or credentials. Watch for `snapshot cleanup failed`, startup recovery errors, 503 storage failures, 507 capacity responses, 429 upload limits, missing scheduled backups, and unexpected process restarts. A storage I/O or verification failure fences reads and writes until recovery; an alert needs investigation, not a retry loop.

Use Railway volume metrics for total disk use, including metadata and retry receipts, and Railway usage for storage, backup, and outbound traffic cost. The 250 MB image cap reserves substantial space under 5 GB but is not a disk quota or spending cap. Review alerts and billing routinely. When the image cap is full, creation returns 507 and existing live reads continue; expiry/revocation reclaim space. A physically full filesystem may instead fence all storage operations. Alert and intervene well before the volume fills. Avoid deleting a volume or its backups to resolve capacity pressure.

For a code rollback, keep the mounted volume and compatible record-format support. Stop the current owner before replacing it. To temporarily disable sharing while retaining data, remove `SNAPSHOT_DIR` and `SNAPSHOT_CAPACITY_BYTES` together, rebuild with Share hidden, and redeploy; the editor can continue, but snapshot reads return 503. Do not point the app at an empty fallback directory. Restoring a backup as part of rollback still requires the reconciliation above.

## Evidence to record

Record commit/image digest, project/service/environment, volume ID/mount/size, UID observed in the running process, effective non-secret configuration, backup schedule/retention, backup IDs/times, restore target, reconciliation decisions, and check outputs. Use disposable test shares and keep their credentials out of logs and tickets.

For live verification: publish a disposable share, record the PNG checksum and both URLs privately, restart and redeploy, then verify the same bytes and management access. Create and restore a checkpoint in an isolated environment, include expired and post-backup-revoked fixtures, and verify the deny cases before enabling ingress. Record local checks separately from Railway evidence and DYL-249 chat-preview/browser acceptance.

## Local verification, 2026-11-04

`pnpm test`, `pnpm lint`, `pnpm build`, and the Docker image build passed. The full Go HTTP suite required local socket access outside the restricted sandbox. `TestColdBackupRestore` verifies a separate restored directory, exact image/metadata and management access, expired-file reclamation at startup, explicit offline reconciliation of a post-backup revocation, and capacity-full reads.

Run the container drill with:

```bash
docker build -t grid:dyl-248 .
python3 deploy/test-container.py grid:dyl-248
```

The drill passed against local Docker. It creates and removes its own disposable volumes and containers. It verifies default and bootstrapped UID 65534, absent-mount rejection, disabled maintenance-check failure, editor/health responses, publication, exact image/download bytes, management access after container replacement, cold tar backup/restore, offline replacement of a post-backup-revoked record with its current receipt, and denied public page/image/download access after restore. It runs the maintenance check without HTTP serving. Expired-backup handling is covered by the Go test with controlled time, without changing production retention.

Railway read-only inspection confirmed the existing `comfortable-imagination` / `production` / `grid` service deployed the merged DYL-247 build, uses Dockerfile builds from `main`, one replica, and `/api/health`. Production volume creation, variables, scheduled backups, restart/deployment survival, and a provider restore have not been changed or verified by these local checks. Keep DYL-248 open until that evidence is recorded.
