import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let vite;
let fetchLastFmAlbums;
let searchReleases;
let store;
let importLastFmUser;
const originalFetch = globalThis.fetch;
const storage = new Map();

before(async () => {
  globalThis.window = { location: { origin: "http://grid.test", pathname: "/", search: "" } };
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const root = fileURLToPath(new URL("..", import.meta.url));
  vite = await createServer({
    root,
    configFile: false,
    server: { hmr: false, watch: null },
    resolve: { alias: { "@": `${root}/src` } },
  });
  ({ fetchLastFmAlbums } = await vite.ssrLoadModule("/src/lib/lastfm-api.ts"));
  ({ searchReleases } = await vite.ssrLoadModule("/src/lib/music-brainz.ts"));
  ({ useAlbumsStore: store } = await vite.ssrLoadModule("/src/lib/albums-store.ts"));
  ({ importLastFmUser } = await vite.ssrLoadModule("/src/lib/lastfm-user.ts"));
});

after(async () => {
  globalThis.fetch = originalFetch;
  delete globalThis.window;
  delete globalThis.localStorage;
  await vite?.close();
});

const lastfm = { type: "lastfm", id: "one", album: "One", artist: "Artist", img: "/img/placeholder.png", imgs: [], plays: 10 };
const custom = { type: "custom", id: "custom-mbid", mbid: "mbid", album: "Custom", artist: "Artist", img: "/img/placeholder.png", imgs: [] };

test("Last.fm uses encoded username path without server sorting", async () => {
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "http://grid.test/api/users/user%20%26%3F/albums");
    return Response.json([lastfm]);
  };
  assert.deepEqual(await fetchLastFmAlbums("user &?"), [lastfm]);
});

test("Last.fm import sorts locally and autofills only empty grid slots", async () => {
  const second = { ...lastfm, id: "two", album: "A", plays: 1 };
  globalThis.fetch = async () => Response.json([lastfm, second]);
  store.getState().setSort("lastfm", "name");
  store.getState().setAutofill(true);
  store.getState().setAlbums((prev) => ({ ...prev, grid: { ...prev.grid, albums: [custom, ...prev.grid.albums.slice(1)] } }));
  await importLastFmUser("testuser");
  const state = store.getState();
  assert.equal(state.user, "testuser");
  assert.equal(state.albums.grid.albums[0].id, custom.id);
  assert.equal(state.albums.grid.albums[1].id, second.id);
  assert.equal(state.albums.grid.albums[2].id, lastfm.id);
  assert.equal(state.albums.grid.albums.length, 25);
  assert.deepEqual(state.albums.lastfm.albums, []);
});

test("MusicBrainz search sends raw query and filters to Go and validates albums", async () => {
  globalThis.fetch = async (path) => {
    const url = new URL(path, "http://grid.test");
    assert.equal(url.pathname, "/api/release-groups");
    assert.deepEqual(Object.fromEntries(url.searchParams), { query: 'in "rainbows" & more', type: "album", field: "title", limit: "10", offset: "5" });
    return Response.json([custom]);
  };
  assert.deepEqual(await searchReleases('in "rainbows" & more', { type: "album", field: "title", limit: 10, offset: 5 }), [custom]);
});

test("empty search does not request upstream data", async () => {
  globalThis.fetch = () => assert.fail("empty search fetched");
  assert.deepEqual(await searchReleases(""), []);
});

test("API failures preserve the error envelope and reject malformed success data", async () => {
  for (const request of [() => fetchLastFmAlbums("user"), () => searchReleases("query")]) {
    for (const status of [400, 404, 502, 503]) {
      globalThis.fetch = async () => Response.json({ error: "upstream unavailable" }, { status });
      await assert.rejects(request, /upstream unavailable/);
    }
    globalThis.fetch = async () => new Response("bad gateway", { status: 502 });
    await assert.rejects(request, /502/);
    for (const payload of [{}, [{ type: "placeholder", id: "placeholder_x" }]]) {
      globalThis.fetch = async () => Response.json(payload);
      await assert.rejects(request, /validation error/);
    }
  }
});

test("repeated release groups get independent editor IDs and preserve the add sentinel", () => {
  const state = store.getState();
  state.addCustomAlbum(custom);
  state.addCustomAlbum(custom);
  const albums = store.getState().albums.custom.albums;
  assert.equal(albums.length, 3);
  assert.notEqual(albums[0].id, albums[1].id);
  assert.notEqual(albums[0].id, custom.id);
  assert.equal(albums[0].mbid, custom.mbid);
  assert.equal(albums.at(-1).type, "custom_add");
  const persisted = JSON.parse(storage.get("grid-albums-storage"));
  assert.deepEqual(persisted.state.albums.custom.albums, albums);
  assert.equal(persisted.state.albums.grid, undefined);
});
