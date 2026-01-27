import { fetchAlbums } from '@/lib/lastfm'
import { redirect, RedirectType } from 'next/navigation'
import { Album } from '../../components/album'
import Editor from '@/components/editor/editor'

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
			<Editor albums={albums} />
		</div>
	)
}
