import { useParamsStore } from "./session-store"

export type Sortable = {
  album?: string
  artist?: string
  plays?: number
}

export type SortType = 'playcount' | 'name' | 'artist' | 'random' | 'custom'

export function sortAlbums<T extends Sortable>(albums: T[], sort: SortType | undefined): T[] {
  switch (sort) {
    case 'name':
      return albums.toSorted((a, b) => {
        if (!a.album || !b.album) return 0
        return a.album.localeCompare(b.album)
      })
    case 'artist':
      return albums.toSorted((a, b) => {
        if (!a.artist || !b.artist) return 0
        return a.artist.localeCompare(b.artist)
      })
    case 'random':
      return albums.toSorted(() => Math.random() - 0.5)
    case 'custom':
      // do nothing, keep the order
      break
    case 'playcount':
    default:
      // default to playcount
      return albums.toSorted((a, b) => {
        if (b.plays === undefined || a.plays === undefined) return 0
        return b.plays - a.plays
      })
  }
  return albums
}

export function useSort(key: string = 'sort', defaultSort: SortType) {
  const [sort, setSort, { isPending }] = useParamsStore<SortType>(
    key,
    defaultSort
  )
  return { sort, setSort, isPending }
}
