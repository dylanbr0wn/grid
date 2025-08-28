import { fetchGridData } from '@/lib/lastfm'
import Grid from './grid'
import Toolbar from './toolbar'
import { redirect, RedirectType } from 'next/navigation'

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const params = await searchParams

	if (!params.user || typeof params.user !== 'string') {
		return <div>problem</div>
	}

	if (
		!params.gridSize ||
		typeof params.gridSize !== 'string' ||
		isNaN(parseInt(params.gridSize))
	) {
		params.gridSize = '5'
	}

	let data: {
		album: string
		img: string
		artist: string
		id: string
	}[] = []
	try {
		data = await fetchGridData(params.user)
	} catch (e) {
		const error = e instanceof Error ? e.message : 'Unknown error'
    console.error(e)
		redirect(`/?error=${error}`, RedirectType.replace)
	}

	return (
		<div className="flex h-screen flex-col font-code">
			<Grid items={data} />
		</div>
	)
}
