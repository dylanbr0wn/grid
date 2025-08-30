import { fetchGridData } from '@/lib/lastfm'
import Grid from './grid'
import { redirect, RedirectType } from 'next/navigation'

export default async function Page({
	params,
}: {
	params: Promise<{ user: string }>
}) {
	const { user } = await params

	if (!user || typeof user !== 'string') {
		return <div>problem</div>
	}

	let data: {
		album: string
		img: string
		artist: string
		id: string
	}[] = []
	try {
		data = await fetchGridData(user)
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
