import { fetchGridData, GridAlbum } from '@/lib/lastfm'
import Grid from './grid'
import { redirect, RedirectType } from 'next/navigation'
import { pushAlbumsToCache } from '@/lib/db'

export default async function Page({
	params,
}: {
	params: Promise<{ user: string }>
}) {
	const { user } = await params

	if (!user || typeof user !== 'string') {
		return <div>problem</div>
	}

	let data: GridAlbum[] = []
	try {
		data = await fetchGridData(user)
    await pushAlbumsToCache(data)
	} catch (e) {
		const error = e instanceof Error ? e.message : 'Unknown error'
    console.error(e)
		redirect(`/?error=${error}`, RedirectType.replace)
	}

	return (
		<div className="flex h-full flex-col font-code relative">
			<Grid items={data} />
		</div>
	)
}
