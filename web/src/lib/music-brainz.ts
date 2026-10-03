import { type } from "arktype";
import { customAlbum } from "./albums";

export type SearchReleaseType = "all" | "album" | "ep" | "single";
export type SearchReleaseField = "all" | "title" | "artist";

export type SearchReleasesOptions = {
  limit?: number;
  offset?: number;
  type?: SearchReleaseType;
  field?: SearchReleaseField;
};

export async function searchReleases(
  query: string,
  options: SearchReleasesOptions = {},
) {
  if (query.length === 0) return [];

  const params = new URLSearchParams({
    query,
    type: options.type ?? "all",
    field: options.field ?? "all",
    limit: String(options.limit ?? 25),
    offset: String(options.offset ?? 0),
  });
  const response = await fetch(`/api/release-groups?${params}`);
  if (!response.ok) {
    const parseError = type("string.json.parse").to({ error: "string" });
    const error = parseError(await response.text());
    throw new Error(
      error instanceof type.errors
        ? `Search API error: ${response.status} ${response.statusText}`
        : `Search API error: ${error.error}`,
    );
  }

  const parseJson = type("string.json.parse").to(customAlbum.array());
  const albums = parseJson(await response.text());
  if (albums instanceof type.errors) {
    throw new Error(`Search API response validation error: ${albums.summary}`);
  }
  return albums;
}
