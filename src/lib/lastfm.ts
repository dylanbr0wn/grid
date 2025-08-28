import { type } from 'arktype'

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

	console.log(JSON.stringify(await response.clone().json(), null, 2))

	const out = weeklyAlbumChart(await response.json())

	if (out instanceof type.errors) {
		// hover out.summary to see validation errors
		throw new Error(out.summary)
	}
	console.log(out)

	return out.topalbums.album
}

// export async function fetchAlbumInfo(mbid: string) {
// 	const response = await fetch(
// 		`${apiURL}?method=album.getinfo&api_key=${process.env.LAST_FM_API_KEY}&mbid=${mbid}&format=json`
// 	)
// 	if (!response.ok) {
// 		throw new Error('Failed to fetch album info from Last.fm')
// 	}

// 	const out = album(await response.json())

// 	if (out instanceof type.errors) {
// 		// hover out.summary to see validation errors
// 		throw new Error(out.summary)
// 	}
// 	out.album.mbid = mbid

// 	return out.album
// }

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

	// const albumInfoPromises = Array.from(mbidMap.keys()).map((mbid) =>
	// 	fetchAlbumInfo(mbid)
	// )
	// const albumInfos = await Promise.allSettled(albumInfoPromises)
	// albumInfos.forEach((result) => {
	// 	if (result.status === 'fulfilled') {
	// 		const info = result.value
	// 		const album = mbidMap.get(info.mbid!)
	// 		if (album) {
	//       const image = info.image.find(i => i.size === "large") ?? info.image.find(i => i.size === "")
	// 			album.image = image?.['#text'] ?? ""
	// 		}
	// 		mbidMap.set(info.mbid!, album!)
	// 	} else {
	// 		console.error('Error fetching album info:', result.reason)
	// 	}
	// })

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
