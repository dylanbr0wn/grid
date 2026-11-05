#!/usr/bin/env python3
"""Disposable Docker volume/restart/backup drill. Never targets Railway."""
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

image = sys.argv[1] if len(sys.argv) > 1 else "grid:dyl-248"
prefix = "grid-storage-drill-" + uuid.uuid4().hex[:10]
volumes = [prefix + suffix for suffix in ("-source", "-backup", "-restored")]
containers = []


def docker(*args, check=True):
    return subprocess.run(["docker", *args], check=check, capture_output=True, text=True)


def start(volume):
    result = docker("run", "-d", "--user", "0:0", "-v", volume + ":/data",
                    "-e", "RAILWAY_VOLUME_MOUNT_PATH=/data", "-e", "SNAPSHOT_DIR=/data/snapshots",
                    "-e", "SNAPSHOT_CAPACITY_BYTES=250000000", "-p", "127.0.0.1::8080", image)
    container = result.stdout.strip()
    containers.append(container)
    port = docker("port", container, "8080/tcp").stdout.strip().split(":")[-1]
    origin = "http://127.0.0.1:" + port
    for _ in range(100):
        try:
            if request(origin + "/api/health")[0] == 200:
                break
        except (OSError, urllib.error.URLError):
            time.sleep(0.1)
    else:
        raise AssertionError("container did not become healthy: " + docker("logs", container).stdout)
    uid = docker("exec", container, "awk", "/^Uid:/ {print $2}", "/proc/1/status").stdout.strip()
    assert uid == "65534", "Go must run unprivileged"
    assert request(origin + "/")[0] == 200
    return container, origin


def request(url, method="GET", data=None, headers=None):
    req = urllib.request.Request(url, method=method, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as response:
        return response.code, response.read()


def publish(origin):
    png = (Path(__file__).resolve().parents[1] / "web/tests/browser/fixtures/snapshot.png").read_bytes()
    boundary = "grid-storage-drill"
    body = ("--" + boundary + '\r\nContent-Disposition: form-data; name="image"; filename="grid.png"\r\nContent-Type: image/png\r\n\r\n').encode() + png + ("\r\n--" + boundary + "--\r\n").encode()
    key = base64.urlsafe_b64encode(int(time.time()).to_bytes(8, "big") + os.urandom(32)).decode().rstrip("=")
    status, raw = request(origin + "/api/snapshots", "POST", body,
                          {"Content-Type": "multipart/form-data; boundary=" + boundary, "Idempotency-Key": key})
    assert status == 201, (status, raw)
    return json.loads(raw), png


def verify(origin, share, png):
    status, got = request(origin + share["imageUrl"])
    assert status == 200 and got == png
    assert request(origin + share["publicUrl"])[0] == 200
    assert request(origin + share["downloadUrl"])[1] == png
    status, raw = request(origin + "/api/snapshots/" + share["id"] + "/management",
                          headers={"Authorization": "Bearer " + share["managementToken"]})
    assert status == 200 and json.loads(raw)["status"] == "active"


try:
    # Default non-root launch, root privilege drop, and missing mount rejection.
    assert docker("run", "--rm", image, "id", "-u").stdout.strip() == "65534"
    assert docker("run", "--rm", "--user", "0:0", image, "id", "-u").stdout.strip() == "65534"
    assert docker("run", "--rm", image, "./bin/grid", "-snapshot-check", check=False).returncode != 0
    assert docker("run", "--rm", "--user", "0:0", "-e", "RAILWAY_VOLUME_MOUNT_PATH=/app",
                  "-e", "SNAPSHOT_DIR=/app/snapshots", image, "./bin/grid", "-snapshot-check", check=False).returncode != 0
    for volume in volumes:
        docker("volume", "create", volume)
    source, backup, restored = volumes
    container, origin = start(source)
    live, png = publish(origin)
    revoked, _ = publish(origin)
    verify(origin, live, png)
    docker("stop", container)
    docker("run", "--rm", "--user", "0:0", "--entrypoint", "tar", "-v", source + ":/source:ro",
           "-v", backup + ":/backup", image, "-C", "/source", "-cf", "/backup/checkpoint.tar", ".")
    # Recreate the container with the same persistent volume.
    container, origin = start(source)
    verify(origin, live, png)
    assert request(origin + "/api/snapshots/" + revoked["id"], "DELETE",
                   headers={"Authorization": "Bearer " + revoked["managementToken"]})[0] == 204
    assert request(origin + revoked["imageUrl"])[0] == 404
    docker("stop", container)
    docker("run", "--rm", "--user", "0:0", "--entrypoint", "tar", "-v", backup + ":/backup:ro",
           "-v", restored + ":/restored", image, "-C", "/restored", "-xf", "/backup/checkpoint.tar")
    # Offline reconciliation: the current receipt replaces the backup's PNG.
    docker("run", "--rm", "--user", "0:0", "--entrypoint", "cp", "-v", source + ":/source:ro",
           "-v", restored + ":/restored", image, "-p", "/source/snapshots/" + revoked["id"] + ".snapshot",
           "/restored/snapshots/" + revoked["id"] + ".snapshot")
    result = docker("run", "--rm", "--user", "0:0", "-v", restored + ":/data",
                    "-e", "RAILWAY_VOLUME_MOUNT_PATH=/data", "-e", "SNAPSHOT_DIR=/data/snapshots",
                    image, "./bin/grid", "-snapshot-check")
    assert "snapshot storage ready" in result.stderr and "listening" not in result.stderr
    container, origin = start(restored)
    verify(origin, live, png)
    assert request(origin + revoked["publicUrl"])[0] == 404
    assert request(origin + revoked["imageUrl"])[0] == 404
    assert request(origin + revoked["downloadUrl"])[0] == 404
    print("PASS: UID, mount rejection, health/editor, exact PNG, management, container replacement, cold backup/restore, post-backup revocation")
    print("Disposable PNG SHA-256: " + hashlib.sha256(png).hexdigest())
finally:
    for container in containers:
        docker("rm", "-f", container, check=False)
    for volume in volumes:
        docker("volume", "rm", volume, check=False)
