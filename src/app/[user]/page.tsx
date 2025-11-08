import { fetchAlbums } from '@/lib/lastfm'
import Grid from './grid'
import { redirect, RedirectType } from 'next/navigation'
import { Album } from './album'

export default async function Page({
	params,
  searchParams
}: {
	params: Promise<{ user: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const { user } = await params
  let { sort = "playcount" } = await searchParams

  if (sort && typeof sort !== 'string') {
    sort = 'playcount'
  }

	if (!user || typeof user !== 'string') {
		redirect(`/?error=Invalid user`, RedirectType.replace)
	}

	let albums: Album[] = []
	try {
		albums = await fetchAlbums(user, sort as string)
	} catch (e) {
		const error = e instanceof Error ? e.message : 'Unknown error'
		redirect(`/?error=${error}`, RedirectType.replace)
	}

	return (
		<div className="flex h-full flex-col font-code relative">
			<Grid albums={albums} />
		</div>
	)
}
