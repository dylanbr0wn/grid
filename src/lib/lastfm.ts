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

	// console.log(JSON.stringify(await response.clone().json(), null, 2))

	const out = weeklyAlbumChart(await response.json())

	if (out instanceof type.errors) {
		// hover out.summary to see validation errors
		throw new Error(out.summary)
	}
	// console.log(out)

	return out.topalbums.album
}

export async function fetchGridData(user: string) {
	const albums = await fetchWeeklyAlbumChart(user)

	const sortedAlbums = albums.toSorted(
		(a, b) => parseInt(b['@attr'].rank) - parseInt(b['@attr'].rank)
	)

	const mbidMap = new Map<string, (typeof sortedAlbums)[number]>()
	sortedAlbums.forEach((album) => {
		if (album.mbid !== '') {
			mbidMap.set(album.mbid, album)
		}
	})

	return getGridData(sortedAlbums)
}

function getGridData(albums: (typeof albumInfo.infer)[]) {
	return albums.map((a) => {
		const image =
			a.image.find((i) => i.size === 'large') ??
			a.image.find((i) => i.size === '')

		return {
			album: a.name,
			img: image?.['#text'] ?? '',
			artist: a.artist.name,
			id: a.mbid || `${a.artist.name}_${a.name}`.replaceAll(' ', '-').toLowerCase(),
		}
	})
}
