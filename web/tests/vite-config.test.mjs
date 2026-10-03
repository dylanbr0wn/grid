import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadConfigFromFile } from "vite";

const webRoot = fileURLToPath(new URL("..", import.meta.url));

test("HMR port follows Go's root .env and exported PORT precedence", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "grid-vite-config-"));
  const root = path.join(fixture, "web");
  const previousPort = process.env.PORT;
  try {
    await mkdir(root);
    await writeFile(path.join(root, "package.json"), '{"type":"module"}');
    await copyFile(path.join(webRoot, "vite.config.ts"), path.join(root, "vite.config.ts"));
    await symlink(path.join(webRoot, "node_modules"), path.join(root, "node_modules"));
    const getPort = async () => {
      const result = await loadConfigFromFile({ command: "serve", mode: "development" }, path.join(root, "vite.config.ts"), root);
      assert.ok(result);
      assert.equal(result.config.server.host, "127.0.0.1");
      return result.config.server.hmr.clientPort;
    };
    delete process.env.PORT;
    assert.equal(await getPort(), 8080);
    await writeFile(path.join(fixture, ".env"), "PORT=18082\n");
    assert.equal(await getPort(), 18082);
    process.env.PORT = "18083";
    assert.equal(await getPort(), 18083);
  } finally {
    if (previousPort === undefined) delete process.env.PORT;
    else process.env.PORT = previousPort;
    await rm(fixture, { recursive: true, force: true });
  }
});
