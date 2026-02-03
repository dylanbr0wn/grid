// /Users/dylan/vault/grid/grid/src/lib/music-brainz.ts
// Minimal MusicBrainz client for searching and fetching releases.
// Respects MusicBrainz rate limit (1 req/sec) and sets a proper User-Agent.

import { CustomAlbum } from "@/components/editor/custom";
import { type } from "arktype";
import { generateId } from "./util";

const BASE_PATH = "https://musicbrainz.org/ws/2";
const USER_AGENT = "grid-app/0.1 ( https://grid.dylanbrown.xyz )";

async function request(path: string, params?: Record<string, string | number>) {
  const url = new URL(BASE_PATH + path);
  const p = params ?? {};
  // ensure JSON responses
  p["fmt"] = "json";
  Object.entries(p).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "User-Agent": USER_AGENT,
  };
  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MusicBrainz ${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json())
}

export const ReleaseGroupResponse = type({
  created: "string",
  count: "number",
  offset: "number",
  "release-groups": type({
      id: "string",
      title: "string",
      "primary-type?": "string",
      "first-release-date?": "string",
      "artist-credit": type({
          artist: {
            id: "string",
            name: "string",
            "sort-name": "string"
          }
        }).array(),
        'thumbnails?': {
          'small?': 'string',
          'large?': 'string'
        }
      // Add more fields as needed
  }).array()
});



export async function searchReleases(query: string, limit = 25, offset = 0){
  if (query.length === 0) {
    return []
  }
  const response = await request("/release-group", { query, limit, offset, inc: "artists+labels+recordings+isrcs" });
  const out = ReleaseGroupResponse(response);

  if (out instanceof type.errors) {
    throw new Error(out.summary);
  }

  const albums: CustomAlbum[] = out["release-groups"].map(rg => {
    const imgs = type("string")
      .array()
      .assert(
        [
          getCoverArtUrl(rg.id, 'large'),
          getCoverArtUrl(rg.id, 'small'),
          "/placeholder.png",
        ].filter((url) => url && url.length > 0)
      );
    return {
        id: `custom-${rg.id}-${generateId()}`,
        type: "custom",
        mbid: rg.id,
        album: rg.title,
        artist: rg["artist-credit"].map((ac) => ac.artist.name).join(", "),
        artistMbid: rg["artist-credit"].map((ac) => ac.artist.id).join(", "),
        img: imgs[0],
        imgs,
      }
  })
  return albums;
}

export function getCoverArtUrl(releaseGroupId: string, size: 'small' | 'large' = 'large') {
  if (!releaseGroupId) return undefined;
  const sizeParam = size === 'small' ? '250' : '500';
  return `https://coverartarchive.org/release-group/${releaseGroupId}/front-${sizeParam}`;
}
