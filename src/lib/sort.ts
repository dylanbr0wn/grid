import { Album } from "@/components/album"
import { useParamsStore } from "./session-store"

export type SortType = 'playcount' | 'name' | 'artist' | 'random' | 'custom'

export function sortAlbums(albums: Album[], sort: SortType | undefined): Album[] {
  switch (sort) {
    case 'name':
      return albums.toSorted((a, b) => a.album.localeCompare(b.album))
    case 'artist':
      return albums.toSorted((a, b) => a.artist.localeCompare(b.artist))
    case 'random':
      return albums.toSorted(() => Math.random() - 0.5)
      break
    case 'custom':
      // do nothing, keep the order
      break
    case 'playcount':
    default:
      // default to playcount
      return albums.toSorted((a, b) => b.plays - a.plays)
  }
  return albums
}

export const sortOptions: { label: string; value: SortType }[] = [
	{ label: 'Plays', value: 'playcount' },
	{ label: 'Name', value: 'name' },
	{ label: 'Artist', value: 'artist' },
	{ label: 'Random', value: 'random' },
]

export function useSort() {
  const [sort, setSort, { isPending }] = useParamsStore<SortType>(
    'sort',
    'playcount'
  )
  return { sort, setSort, isPending }
}
