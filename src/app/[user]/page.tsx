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
	let { user } = await params
  let {sort = "playcount"} = await searchParams

  if (sort && typeof sort !== 'string') {
    sort = 'playcount'
  }

	if (!user || typeof user !== 'string') {
		redirect(`/?error=Invalid user`, RedirectType.replace)
	}

	let data: GridAlbum[] = []
	try {
		data = await fetchGridData(user, sort as string)
	} catch (e) {
		const error = e instanceof Error ? e.message : 'Unknown error'
		redirect(`/?error=${error}`, RedirectType.replace)
	}

	return (
		<div className="flex h-full flex-col font-code relative">
			<Grid items={data} />
		</div>
	)
}
