import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [port, mode] = process.argv.slice(2);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const directory = mkdtempSync(join(tmpdir(), "grid-viewer-"));
const storage = join(directory, "snapshots");
mkdirSync(storage);
const binary = join(directory, "grid");
execFileSync("go", ["build", "-o", binary, "."], { cwd: root, stdio: "inherit" });
// The dev viewer must work even when Vite is unreachable.
const args = mode === "dev" ? ["-dev", "-vite", "http://127.0.0.1:1"] : [];
const child = spawn(binary, args, {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: port, SNAPSHOT_DIR: storage, SNAPSHOT_PUBLIC_ORIGIN: `http://127.0.0.1:${port}`, SNAPSHOT_UPLOADS_PER_IP: "100", SNAPSHOT_UPLOADS_GLOBAL: "1000", SNAPSHOT_TRUSTED_PROXIES: "", LAST_FM_API_KEY: "" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  rmSync(directory, { recursive: true, force: true });
  process.exit(code ?? 0);
});
