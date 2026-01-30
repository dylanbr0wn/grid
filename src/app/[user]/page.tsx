import { EditorContext } from '@/components/editor/context'
import CustomPallete from '@/components/editor/custom'
import Grid from '@/components/editor/grid'
import Overlay from '@/components/editor/overlay'
import LastFM from '@/components/editor/lastfm'
import { SortType } from '@/lib/sort'

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

	return (
		<div className="flex h-full flex-col font-code relative">
			<EditorContext>
      <div className="h-full flex w-screen relative">
        <div className="shrink-0 flex flex-col h-full overflow-hidden border-neutral-800 border-r">
          <CustomPallete />
          <LastFM user={user} sort={sort as SortType} />
        </div>
        <div className="w-full h-full">
          <Grid />
        </div>
        <Overlay />
      </div>
    </EditorContext>
		</div>
	)
}
