import { fetchGridData, GridAlbum } from '@/lib/lastfm'
import Grid from './grid'
import { redirect, RedirectType } from 'next/navigation'

export default async function Page({
	params,
  searchParams
}: {
	params: Promise<{ user: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const { user } = await params
  const {sort = "playcount"} = await searchParams

  if (sort && typeof sort !== 'string') {
    return <div>problem</div>
  }

	if (!user || typeof user !== 'string') {
		return <div>problem</div>
	}

 

	let data: GridAlbum[] = []
	try {
		data = await fetchGridData(user, sort as string)
    // await pushAlbumsToCache(data)
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
