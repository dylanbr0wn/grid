import { type } from 'arktype'
import 'server-only'
import { generateId, PLACEHOLDER_IMG } from './util'
import { getCoverArtUrl } from './music-brainz'
import { LastFmAlbum } from './albums'


const apiURL = 'http://ws.audioscrobbler.com/2.0/'

const albumInfo = type({
  artist: {
    mbid: 'string',
    name: 'string',
  },
  name: 'string',
  image: type({
    size: 'string',
    '#text': 'string',
  }).array(),
  mbid: 'string',
  playcount: 'string',
  '@attr': {
    rank: 'string',
  },
})

const weeklyAlbumChart = type({
  topalbums: {
    album: albumInfo.array(),
    '@attr': {
      user: 'string',
      total: 'string',
    },
  },
})

export async function fetchWeeklyAlbumChart(user: string) {
  const url = `${apiURL}?method=user.getTopAlbums&user=${user}&api_key=${process.env.LAST_FM_API_KEY}&format=json&period=7day&limit=100`
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    console.error(
      'Last.fm API response not ok:',
      response.status,
      await response.text(),
      url
    )
    throw new Error('Failed to fetch data from Last.fm')
  }

  const maybeWeeklyAlbumChart = await response.json()
  const out = weeklyAlbumChart(maybeWeeklyAlbumChart)

  if (out instanceof type.errors) {
    throw new Error(out.summary)
  }

  return out.topalbums.album
}

export async function fetchAlbums(user: string, sort: string) {
  let albums = await fetchWeeklyAlbumChart(user)

  if (sort === 'random') {
    albums = albums.sort(() => Math.random() - 0.5)
  } else if (sort === 'name') {
    albums = albums.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'artist') {
    albums = albums.sort((a, b) => a.artist.name.localeCompare(b.artist.name))
  } else if (sort === 'custom') {
    // do nothing, keep the order from the DB
  } else {
    // default to playcount
    albums = albums.sort((a, b) => parseInt(b.playcount) - parseInt(a.playcount))
  }

  return parseAlbums(albums)
}

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

    return {
      album: a.name,
      imgs,
      type: 'lastfm',
      mbid: a.mbid,
      artistMbid: a.artist.mbid,
      artist: a.artist.name,
      plays: parseInt(a.playcount),
      id: `${a.mbid}_${generateId()}` || `${a.artist.name}_${a.name}_${generateId()}`.replaceAll(' ', '-').toLowerCase(),
      img: large || getCoverArtUrl(a.mbid) || small || fallback || PLACEHOLDER_IMG,
      textColor: 'white',
      textBackground: false,
    }
  })
}
