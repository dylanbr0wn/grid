import { type } from 'arktype'

const apiURL = 'http://ws.audioscrobbler.com/2.0/'

const album = type({
	album: {
		artist: 'string',
		image: type({
			size: 'string',
			'#text': 'string',
		}).array(),
		"mbid?": 'string',
	},
})

const albumInfo = type({
	artist: {
		mbid: 'string',
		'#text': 'string',
	},
	mbid: 'string',
	playcount: 'string',
	url: 'string',
	name: 'string',
	'@attr': {
		rank: 'string',
	},
	"image?": "string"
})

const weeklyAlbumChart = type({
	weeklyalbumchart: {
		album: albumInfo.array(),
		'@attr': {
			user: 'string',
			from: 'string',
			to: 'string',
		},
	},
})

export async function fetchWeeklyAlbumChart(user: string) {
	const response = await fetch(
		`${apiURL}?method=user.getweeklyalbumchart&user=${user}&api_key=${process.env.LAST_FM_API_KEY}&format=json`
	)
	if (!response.ok) {
    console.error('Last.fm API response not ok:', response.status, await response.text(), `${apiURL}?method=user.getweeklyalbumchart&user=${user}&api_key=${process.env.LAST_FM_API_KEY}&format=json`)
		throw new Error('Failed to fetch data from Last.fm')
	}

	const out = weeklyAlbumChart(await response.json())

	if (out instanceof type.errors) {
		// hover out.summary to see validation errors
		throw new Error(out.summary)
	}

	return out.weeklyalbumchart.album
}

export async function fetchAlbumInfo(mbid: string) {
	const response = await fetch(
		`${apiURL}?method=album.getinfo&api_key=${process.env.LAST_FM_API_KEY}&mbid=${mbid}&format=json`
	)
	if (!response.ok) {
		throw new Error('Failed to fetch album info from Last.fm')
	}

	const out = album(await response.json())

	if (out instanceof type.errors) {
		// hover out.summary to see validation errors
		throw new Error(out.summary)
	}
	out.album.mbid = mbid

	return out.album
}

export async function fetchGridData(user: string) {
	const albums = await fetchWeeklyAlbumChart(user)

	const sortedAlbums = albums
		.toSorted((a, b) => parseInt(b.playcount) - parseInt(a.playcount))

	const mbidMap = new Map<string, (typeof sortedAlbums)[number]>()
	sortedAlbums.forEach((album) => {
    if (album.mbid !== "") {
      mbidMap.set(album.mbid, album)
    }
		
	})

	const albumInfoPromises = Array.from(mbidMap.keys()).map((mbid) =>
		fetchAlbumInfo(mbid)
	)
	const albumInfos = await Promise.allSettled(albumInfoPromises)
	albumInfos.forEach((result) => {
		if (result.status === 'fulfilled') {
			const info = result.value
			const album = mbidMap.get(info.mbid!)
			if (album) {
        const image = info.image.find(i => i.size === "large") ?? info.image.find(i => i.size === "")
				album.image = image?.['#text'] ?? ""
			}
			mbidMap.set(info.mbid!, album!)
		} else {
			console.error('Error fetching album info:', result.reason)
		}
	})

	return getGridData(mbidMap.values().toArray())
}

function getGridData(albums: (typeof albumInfo.infer)[]) {
  return albums.map(a => ({
    album: a.name,
    img: a.image!,
    artist: a.artist['#text'],
    id: a.mbid,
  }))
}