import { LastFmAlbum, lastFmAlbum } from "@/lib/albums";
import { albumInfo, apiURL, weeklyAlbumChart } from "@/lib/lastfm";
import { getCoverArtUrl } from "@/lib/music-brainz";
import { generateId, PLACEHOLDER_IMG } from "@/lib/util";
import { type } from "arktype";
import { NextRequest } from "next/server";

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
      id: `${a.mbid || `${a.artist.name}_${a.name}`}_${generateId()}`.replaceAll(' ', '-').toLowerCase(),
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


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const user = searchParams.get("user") || "";
    const sort = searchParams.get("sort") || "weekly";
    if (typeof user !== "string" || typeof sort !== "string") {
      return new Response(JSON.stringify({ error: "Invalid query parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = `${apiURL}?method=user.getTopAlbums&user=${user}&api_key=${process.env.LAST_FM_API_KEY}&format=json&period=7day&limit=100`
      const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      const safeUrl = new URL(url)
      safeUrl.searchParams.set('api_key', 'REDACTED')
      console.error(
        'Last.fm API response not ok:',
        response.status,
        await response.text(),
        url
      )
      if (response.status === 404) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Last.fm API error: ${response.status} ${response.statusText}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

      const out = weeklyAlbumChart(await response.text())

      if (out instanceof type.errors) {
        console.error('Last.fm API response validation error:', out.summary, await response.text(), url)
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
