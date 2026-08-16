import { LAST_FM_SORT_KEY, LAST_FM_USER_KEY } from "@/lib/util";
import { type } from "arktype";
import { lastFmAlbum } from "@/lib/albums";
import { SortType } from "@/lib/sort";

export async function fetchLastFmAlbums(user: string, sort: SortType) {
  const url = new URL("/api/lastfm", window.location.origin);
  if (user) {
    url.searchParams.set(LAST_FM_USER_KEY, user);
  }
  if (sort) {
    url.searchParams.set(LAST_FM_SORT_KEY, sort);
  }

  const response = await fetch(url);

  if (!response.ok) {
    const parseError = type("string.json.parse").to({ error: "string" });
    const body = await response.text();
    const errorData = parseError(body);
    if (errorData instanceof type.errors) {
      console.warn(
        "Last.fm API error response validation error:",
        errorData.summary,
        body,
        url,
      );
      throw new Error(
        `Last.fm API error: ${response.status} ${response.statusText}`,
      );
    }
    console.warn("Last.fm error:", response.status, errorData.error, url);
    throw new Error("Last.fm error: " + errorData.error);
  }

  const parseJson = type("string.json.parse").to(lastFmAlbum.array());

  const data = parseJson(await response.text());

  if (data instanceof type.errors) {
    console.warn("Album data validation error:", data.summary);
    throw new Error(`Album data validation error: ${data.summary}`);
  }
  console.debug("Fetched and validated albums from Last.fm API:", data);
  return data;
}
