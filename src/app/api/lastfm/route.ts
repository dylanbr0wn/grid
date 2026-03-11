import { LastFmAlbum, lastFmAlbum } from "@/lib/albums";
import { albumInfo, apiURL, weeklyAlbumChart } from "@/lib/lastfm";
import { getCoverArtUrl } from "@/lib/music-brainz";
import { sortType } from "@/lib/sort";
import { LAST_FM_SORT_KEY, LAST_FM_USER_KEY, PLACEHOLDER_IMG } from "@/lib/util";
import { type } from "arktype";
import { NextRequest } from "next/server";

/**
 * Transforms raw Last.fm API album data into internal `LastFmAlbum` objects.
 * Resolves cover art using a priority cascade:
 * large → Cover Art Archive → small → fallback → placeholder.
 */
function parseAlbums(albums: (typeof albumInfo.infer)[]): LastFmAlbum[] {
  return albums.map((a) => {
    const large =
      a.image.find((i) => i.size === 'large')?.['#text'] ?? ''
    const small = a.image.find((i) => i.size === 'small')?.['#text'] ?? ''
    const fallback = a.image.find((i) => i.size === '')?.['#text'] ?? ''

    const imgs = type("string").array().assert(
      [
        large,
        getCoverArtUrl(a.mbid),
        small,
        fallback,
        PLACEHOLDER_IMG
      ].filter((url) => url && url.length > 0)
    )

    const out = lastFmAlbum({
      album: a.name,
      imgs,
      type: 'lastfm',
      mbid: a.mbid,
      artistMbid: a.artist.mbid,
      artist: a.artist.name,
      plays: parseInt(a.playcount),
      id: `${a.mbid || `${a.artist.name}_${a.name}`}`.replaceAll(' ', '-').toLowerCase(),
      img: large || getCoverArtUrl(a.mbid) || small || fallback || PLACEHOLDER_IMG,
      textColor: 'white',
      textBackground: false,
    })
    if (out instanceof type.errors) {
      console.error('Album validation error:', out.summary, a)
      throw new Error(`Album validation error: ${out.summary}`)
    }

    return out
  })
}

const userParam = type("string < 255")

/**
 * GET /api/lastfm — Fetches a user's top 100 albums from the past 7 days.
 * Query params: `lastfm-user` (username), `lastfm-sort` (sort mode).
 * Returns a sorted JSON array of `LastFmAlbum` objects.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const user = userParam(searchParams.get(LAST_FM_USER_KEY))
    const sort = sortType(searchParams.get(LAST_FM_SORT_KEY));
    if (user instanceof type.errors) {
      return new Response(JSON.stringify({ error: user.summary }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (sort instanceof type.errors) {
      return new Response(JSON.stringify({ error: sort.summary }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(apiURL)
    url.searchParams.set('method', 'user.getTopAlbums')
    url.searchParams.set('user', user)
    url.searchParams.set('api_key', process.env.LAST_FM_API_KEY || '')
    url.searchParams.set('format', 'json')
    url.searchParams.set('period', '7day')
    url.searchParams.set('limit', '100')

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      const safeUrl = new URL(url)
      safeUrl.searchParams.set('api_key', 'REDACTED')
      console.error(
        'Last.fm API response not ok:',
        response.status,
        await response.text(),
        safeUrl
      )
      if (response.status === 404) {
        return new Response(JSON.stringify({ error: `User ${user} not found` }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Last.fm API error: ${response.status} ${response.statusText}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await response.text()

    const out = weeklyAlbumChart(body)

    if (out instanceof type.errors) {
      const safeUrl = new URL(url)
      safeUrl.searchParams.set('api_key', 'REDACTED')
      console.error('Last.fm API response validation error:', out.summary, body, safeUrl)
      return new Response(JSON.stringify({ error: `Last.fm API response validation error: ${out.summary}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let albums = parseAlbums(out.topalbums.album)

    if (sort === 'random') {
      albums = albums.sort(() => Math.random() - 0.5)
    } else if (sort === 'name') {
      albums = albums.sort((a, b) => a.album.localeCompare(b.album))
    } else if (sort === 'artist') {
      albums = albums.sort((a, b) => a.artist.localeCompare(b.artist))
    } else if (sort === 'custom') {
      // do nothing, keep the order from the DB
    } else {
      // default to playcount
      albums = albums.sort((a, b) => b.plays - a.plays)
    }

    return new Response(JSON.stringify(albums), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in Last.fm API:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
