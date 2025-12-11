/**
 * apple.ts
 *
 * Utilities to get a user's recently played songs from Apple Music.
 *
 * - Use authorizeAndGetUserToken() in a browser environment with MusicKit JS to prompt the user to sign in and get a user token.
 * - Or, if you already have a user token (obtained via MusicKit JS or your own auth flow), call fetchRecentlyPlayedREST().
 *
 * Notes:
 * - You must provide a valid Apple Music Developer Token (server-generated JWT).
 * - In browser flow MusicKit JS must be loaded (https://js-cdn.music.apple.com/musickit/v1/musickit.js).
 */

export type AppleTrack = {
  id: string;
  name: string;
  artistName?: string;
  albumName?: string;
  artwork?: {
    width: number;
    height: number;
    url: string; // templated url with {w} and {h} possible
  };
  url?: string;
  playParams?: Record<string, any>;
};


/**
 * Fetch the "recently played" for the user using Apple Music REST API.
 * Can be used from server or client if you have a user token.
 *
 * Endpoint: GET https://api.music.apple.com/v1/me/recent/played
 *
 * @param developerToken - Apple Music developer token (JWT) used as Bearer authorization
 * @param userToken - Music-User-Token for the signed-in Apple Music user
 * @param limit - maximum items to return (default 25)
 * @returns array of simplified AppleTrack objects
 */
export async function fetchRecentlyPlayedREST(
  developerToken: string,
  userToken: string,
  limit = 25
): Promise<AppleTrack[]> {
  'use server';
  if (!developerToken) throw new Error('developerToken is required');
  if (!userToken) throw new Error('userToken is required');

  const url = `https://api.music.apple.com/v1/me/recent/played?limit=${encodeURIComponent(String(limit))}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': userToken,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apple Music API error ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (!Array.isArray(data.data)) return [];

  const tracks: AppleTrack[] = data.data.map((item: any) => {
    const attr = item.attributes || {};
    const artwork = attr.artwork
      ? {
          width: attr.artwork.width || 0,
          height: attr.artwork.height || 0,
          url: attr.artwork.url || '',
        }
      : undefined;

    return {
      id: item.id,
      name: attr.name || attr.title || '',
      artistName: attr.artistName,
      albumName: attr.albumName || (attr.album && attr.album.name),
      albumId: attr.isrc,
      artwork,
      url: attr.url,
      playParams: attr.playParams,
    };
  });

  return tracks;
}
