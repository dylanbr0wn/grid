import { type } from 'arktype'
import 'server-only'


export const apiURL = 'http://ws.audioscrobbler.com/2.0/'

export const albumInfo = type({
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

export const weeklyAlbumChart = type("string.json.parse").to(type({
  topalbums: {
    album: albumInfo.array(),
    '@attr': {
      user: 'string',
      total: 'string',
    },
  },
}))
