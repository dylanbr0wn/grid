#!/bin/sh
set -eu

# Railway mounts volumes as root. Bootstrap only the dedicated child directory,
# then run Go with the same unprivileged identity as ordinary Docker launches.
if [ "$(id -u)" = 0 ]; then
    if [ -n "${SNAPSHOT_DIR:-}" ]; then
        mount_path=${RAILWAY_VOLUME_MOUNT_PATH:-}
        if [ -z "$mount_path" ] || [ "$mount_path" = / ] || [ "$SNAPSHOT_DIR" != "$mount_path/snapshots" ]; then
            echo 'Root bootstrap requires SNAPSHOT_DIR=$RAILWAY_VOLUME_MOUNT_PATH/snapshots' >&2
            exit 1
        fi
        if [ ! -d "$mount_path" ] || [ -L "$mount_path" ] || [ -L "$SNAPSHOT_DIR" ]; then
            echo 'Snapshot mount must exist and paths must not be symlinks' >&2
            exit 1
        fi
        if ! mountpoint -q -- "$mount_path"; then
            echo 'Snapshot volume is not mounted; refusing ephemeral storage' >&2
            exit 1
        fi
        mkdir -p -- "$SNAPSHOT_DIR"
        chown 65534:65534 -- "$SNAPSHOT_DIR"
        chmod 0700 -- "$SNAPSHOT_DIR"
    fi
    exec gosu 65534:65534 "$@"
fi

# Non-root launches retain the existing requirement for a writable directory.
exec "$@"
