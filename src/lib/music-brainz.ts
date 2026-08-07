"server only";

import { type } from "arktype";
import { generateId, PLACEHOLDER_IMG } from "./util";
import { customAlbum, CustomAlbum } from "./albums";
import { getCoverArtUrl } from "./cover-art";

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



export type SearchReleaseType = "all" | "album" | "ep" | "single";
export type SearchReleaseField = "all" | "title" | "artist";

export type SearchReleasesOptions = {
  limit?: number;
  offset?: number;
  type?: SearchReleaseType;
  field?: SearchReleaseField;
};

const PRIMARY_TYPE_QUERY: Record<Exclude<SearchReleaseType, "all">, string> = {
  album: "Album",
  ep: "EP",
  single: "Single",
};

/** Escape Lucene special chars inside a quoted phrase. */
function escapeLucenePhrase(term: string): string {
  return term.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g, "\\$&");
}

export function buildReleaseGroupQuery(
  query: string,
  options: Pick<SearchReleasesOptions, "type" | "field"> = {},
): string {
  const field = options.field ?? "all";
  const releaseType = options.type ?? "all";

  let lucene =
    field === "title"
      ? `releasegroup:"${escapeLucenePhrase(query)}"`
      : field === "artist"
        ? `artist:"${escapeLucenePhrase(query)}"`
        : query;

  if (releaseType !== "all") {
    lucene = `${lucene} AND primarytype:${PRIMARY_TYPE_QUERY[releaseType]}`;
  }

  return lucene;
}

export async function searchReleases(
  query: string,
  options: SearchReleasesOptions = {},
) {
  if (query.length === 0) {
    return [];
  }

  const limit = options.limit ?? 25;
  const offset = options.offset ?? 0;
  const luceneQuery = buildReleaseGroupQuery(query, options);

  const response = await request("/release-group", {
    query: luceneQuery,
    limit,
    offset,
  });
  const out = ReleaseGroupResponse(response);

  if (out instanceof type.errors) {
    throw new Error(out.summary);
  }

  const albums: CustomAlbum[] = out["release-groups"].map((rg) => {
    const imgs = type("string")
      .array()
      .assert(
        [
          getCoverArtUrl(rg.id, "large"),
          PLACEHOLDER_IMG,
        ].filter((url) => url && url.length > 0),
      );
    return {
      id: `custom-${rg.id}-${generateId()}`,
      type: "custom",
      mbid: rg.id,
      album: rg.title,
      artist: rg["artist-credit"].map((ac) => ac.artist.name).join(", "),
      artistMbid: rg["artist-credit"].map((ac) => ac.artist.id).join(", "),
      img: getCoverArtUrl(rg.id, "large") ?? PLACEHOLDER_IMG,
      imgs,
    };
  });
  return customAlbum.array().assert(albums);
}
