import { type } from 'arktype'
import 'server-only'

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

export async function fetchGridData(user: string) {
	let albums = await fetchWeeklyAlbumChart(user)

	// albums.sort(
	// 	(a, b) => parseInt(a['@attr'].rank) - parseInt(b['@attr'].rank)
	// )

	return getGridData(albums)
}

export type GridAlbum = {
  album: string
  imgs: {
    small?: string
    large?: string
    fallback: string
  }
  artist: string
  plays: number
  id: string
}

function getGridData(albums: (typeof albumInfo.infer)[]):GridAlbum[] {
	return albums.map((a) => {
		const large =
			a.image.find((i) => i.size === 'large')
    const small = a.image.find((i) => i.size === 'small')
    const fallback = a.image.find((i) => i.size === '')

		return {
			album: a.name,
			imgs: {
        small: small?.['#text'],
        large: large?.['#text'] ?? '',
        fallback: fallback?.['#text'] ?? '',
      },
			artist: a.artist.name,
      plays: parseInt(a.playcount),
			id: a.mbid || `${a.artist.name}_${a.name}`.replaceAll(' ', '-').toLowerCase(),
		}
	})
}
