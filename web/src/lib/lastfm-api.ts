import { type } from "arktype";
import { lastFmAlbum } from "@/lib/albums";

export async function fetchLastFmAlbums(user: string) {
  const url = new URL(
    `/api/users/${encodeURIComponent(user)}/albums`,
    window.location.origin,
  );

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
