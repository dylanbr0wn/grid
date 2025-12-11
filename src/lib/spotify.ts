// /Users/dylan/vault/grid/grid/src/lib/spotify.ts
// Minimal helper to fetch a user's recently played tracks from Spotify Web API.
// Requires a valid OAuth access token with user-read-recently-played scope.

export type Artist = {
  id: string | null;
  name: string;
};

export type AlbumImage = {
  url: string;
  height: number | null;
  width: number | null;
};

export type Album = {
  id: string | null;
  name: string;
  images: AlbumImage[];
};

export type Track = {
  id: string | null;
  name: string;
  durationMs: number;
  explicit: boolean;
  artists: Artist[];
  album: Album;
  externalUrl?: string;
};

export type RecentlyPlayedItem = {
  playedAt: string; // ISO timestamp
  context?: {
    type: string | null;
    href?: string | null;
    externalUrl?: string | null;
  } | null;
  track: Track;
};

export type RecentlyPlayedResult = {
  items: RecentlyPlayedItem[];
  next?: string | null;
  cursors?: {
    after?: string;
    before?: string;
  } | null;
  limit: number;
  href: string;
};

/**
 * Fetch user's recently played tracks from Spotify.
 *
 * @param accessToken - Spotify OAuth access token (must include user-read-recently-played)
 * @param opts.limit - number of items (1..50). Defaults to 20.
 * @param opts.after - unix timestamp in milliseconds. Returns items played after this time.
 * @param opts.before - unix timestamp in milliseconds. Returns items played before this time.
 */
export async function getRecentlyPlayed(
  accessToken: string,
  opts?: { limit?: number; after?: number; before?: number }
): Promise<RecentlyPlayedResult> {
  if (!accessToken) throw new Error('accessToken is required');

  const params = new URLSearchParams();
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.after != null) params.set('after', String(opts.after));
  if (opts?.before != null) params.set('before', String(opts.before));

  const url = `https://api.spotify.com/v1/me/player/recently-played${params.toString() ? '?' + params.toString() : ''}`;
  console.log("Fetching Spotify recently played:", url);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 401) {
    throw new Error('Unauthorized: invalid or expired access token');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify API error: ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json();

  // Normalize items to simplified types
  const items: RecentlyPlayedItem[] = (json.items || []).map((it: any) => {
    const t = it.track || {};
    return {
      playedAt: it.played_at,
      context: it.context
        ? {
            type: it.context.type ?? null,
            href: it.context.href ?? null,
            externalUrl: it.context.external_urls?.spotify ?? null,
          }
        : null,
      track: {
        id: t.id ?? null,
        name: t.name ?? '',
        durationMs: t.duration_ms ?? 0,
        explicit: t.explicit ?? false,
        artists: (t.artists || []).map((a: any) => ({ id: a.id ?? null, name: a.name ?? '' })),
        album: {
          id: t.album?.id ?? null,
          name: t.album?.name ?? '',
          images: (t.album?.images || []).map((img: any) => ({
            url: img.url,
            height: img.height ?? null,
            width: img.width ?? null,
          })),
        },
        externalUrl: t.external_urls?.spotify ?? undefined,
      },
    };
  });

  return {
    items,
    next: json.next ?? null,
    cursors: json.cursors ?? null,
    limit: json.limit ?? opts?.limit ?? items.length,
    href: json.href ?? url,
  };
}

export async function getRecentlyPlayedSince(
  accessToken: string,
  sinceMs: number,
  opts?: { perRequestLimit?: number; maxPages?: number }
): Promise<RecentlyPlayedResult> {
  if (!accessToken) throw new Error('accessToken is required');
  if (!Number.isFinite(sinceMs) || sinceMs < 0) throw new Error('sinceMs must be a valid timestamp in ms');

  const perRequestLimit = Math.min(Math.max(opts?.perRequestLimit ?? 50, 1), 50); // 1..50
  const maxPages = Math.max(opts?.maxPages ?? 200, 1);

  const collected: RecentlyPlayedItem[] = [];
  let before: number | undefined = undefined; // undefined => most recent
  let pages = 0;
  let firstHref: string | undefined = undefined;

  while (pages < maxPages) {
    pages++;

    const res = await getRecentlyPlayed(accessToken, {
      limit: perRequestLimit,
      before,
    });
    console.log(before, res.items, res.cursors, res.next)

    if (!firstHref) firstHref = res.href;

    if (!res.items || res.items.length === 0) {
      console.log('No more items, stopping pagination.');
      break;
    }

    // Filter items to only those after sinceMs (API may return older items)
    const newItems = res.items.filter((it) => {
      const playedAtMs = new Date(it.playedAt).getTime();
      return playedAtMs > sinceMs;
    });

    collected.push(...newItems);

    // If no new items were added, we can stop
    if (newItems.length === 0) {
      console.log('No new items after sinceMs, stopping pagination.');
      break;
    }

    // Prepare for next iteration
    const beforeMs = Number(res.cursors?.before);
    if (!beforeMs || isNaN(beforeMs)) {
      console.log('No valid before cursor, stopping pagination.');
      break;
    }
    before = beforeMs;

    // If the API indicates there is no next page, stop.
    if (!res.next) break;
  }

  return {
    items: collected,
    next: null,
    cursors: null,
    limit: collected.length,
    href: firstHref ?? 'https://api.spotify.com/v1/me/player/recently-played',
  };
}

/**
 * Convenience: fetch recently played tracks from the last 7 days.
 *
 * @param accessToken - Spotify OAuth access token
 * @param opts.perRequestLimit - page size per request (1..50), default 50
 * @param opts.maxPages - safety limit for pages to fetch, default 200
 */
export async function getRecentlyPlayedLastWeek(
  accessToken: string,
  opts?: { perRequestLimit?: number; maxPages?: number }
): Promise<RecentlyPlayedResult> {
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const sinceMs = Date.now() - oneWeekMs;
  return getRecentlyPlayedSince(accessToken, sinceMs, opts);
}

/*
Example usage:

(async () => {
  const token = process.env.SPOTIFY_ACCESS_TOKEN!;
  const res = await getRecentlyPlayed(token, { limit: 10 });
  console.log(res.items.map(i => ({ playedAt: i.playedAt, name: i.track.name })));
})();
*/

export type UserProfile = {
  id: string | null;
  displayName: string;
  email?: string | undefined;
  href: string;
  externalUrl?: string | undefined;
  images: AlbumImage[];
  followers?: { total: number } | null;
  product?: string | null;
  country?: string | null;
  uri?: string | null;
};

/**
 * Fetch the current user's Spotify profile.
 *
 * @param accessToken - Spotify OAuth access token (any user scope; email requires user-read-email)
 */
export async function getCurrentUserProfile(accessToken: string): Promise<UserProfile> {
  if (!accessToken) throw new Error('accessToken is required');

  const url = 'https://api.spotify.com/v1/me';

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 401) {
    throw new Error('Unauthorized: invalid or expired access token');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify API error: ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json();

  return {
    id: json.id ?? null,
    displayName: json.display_name ?? '',
    email: json.email ?? undefined,
    href: json.href ?? '',
    externalUrl: json.external_urls?.spotify ?? undefined,
    images: (json.images || []).map((img: any) => ({
      url: img.url,
      height: img.height ?? null,
      width: img.width ?? null,
    })),
    followers: json.followers ? { total: json.followers.total ?? 0 } : null,
    product: json.product ?? null,
    country: json.country ?? null,
    uri: json.uri ?? null,
  };
}
