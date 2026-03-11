# API Routes

The app has two API routes that proxy external music APIs. Both are server-side only — API keys never reach the client.

## `GET /api/lastfm`

Fetches a user's top 100 albums from the past 7 days via the Last.fm API.

### Parameters

| Param | Source | Type | Description |
| --------------- | -------------- | ------- | ------------------------------------------- |
| `lastfm-user` | query string | string | Last.fm username (required, max 254 chars) |
| `lastfm-sort` | query string | string | Sort mode: `playcount` \| `name` \| `artist` \| `random` \| `custom` |

### Response

**200 OK** — JSON array of `LastFmAlbum` objects:

```json
[
  {
    "id": "radiohead-ok-computer",
    "type": "lastfm",
    "album": "OK Computer",
    "artist": "Radiohead",
    "plays": 42,
    "mbid": "...",
    "img": "https://lastfm.freetls.fastly.net/...",
    "imgs": ["https://...", "https://...", "/img/placeholder.png"],
    "textColor": "white",
    "textBackground": false
  }
]
```

**400** — Invalid `user` or `sort` parameter (ArkType validation error)
**404** — Last.fm user not found
**500** — Last.fm API error or response validation failure

### Image Resolution Cascade

Each album's `img` is resolved using the first available URL from:

1. Large image from Last.fm response
2. Cover Art Archive URL (built from MusicBrainz ID)
3. Small image from Last.fm response
4. Fallback/empty image from Last.fm response
5. `/img/placeholder.png`

The `imgs` array contains all non-empty URLs in this priority order for client-side fallback.

---

## `GET /api/search`

Searches MusicBrainz for album release groups. Used by the "Add Album" dialog in the custom palette.

### Parameters

| Param | Source | Type | Description |
| -------- | -------------- | ------- | ----------------------------------------- |
| `query` | query string | string | Search term (album name, artist, etc.) |
| `limit` | query string | number | Results per page, 1–100 (default: 25) |
| `offset` | query string | number | Pagination offset, ≥ 0 (default: 0) |

### Response

**200 OK** — JSON array of `CustomAlbum` objects:

```json
[
  {
    "id": "custom-abc123-x7k9m2n",
    "type": "custom",
    "mbid": "abc123",
    "album": "OK Computer",
    "artist": "Radiohead",
    "artistMbid": "a74b1b7f-...",
    "img": "https://coverartarchive.org/release-group/abc123/front-500",
    "imgs": ["https://coverartarchive.org/.../front-500", "/img/placeholder.png"]
  }
]
```

**400** — Invalid `limit` or `offset` parameter
**500** — MusicBrainz API error or response validation failure

### Notes

- MusicBrainz requires a `User-Agent` header; the server sets `grid-app/0.1 ( https://grid.dylanbrown.xyz )`
- Cover art URLs point to the [Cover Art Archive](https://coverartarchive.org/) CDN; images are fetched directly by the client
