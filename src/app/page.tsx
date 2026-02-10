import { EditorContext } from '@/components/editor/context'
import CustomPallete from '@/components/editor/custom'
import Grid from '@/components/editor/grid'
import Overlay from '@/components/editor/overlay'
import LastFM from '@/components/editor/lastfm'
import { SortType } from '@/lib/sort'
import { redirect, RedirectType } from 'next/navigation'
import { Separator } from '@base-ui-components/react'
import Menu from '@/components/menu'

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  let {
    sort = "playcount"
  } = sp

  const { lastfmUser } = sp

  if (sort && typeof sort !== 'string') {
    sort = 'playcount'
  }

  if (lastfmUser && typeof lastfmUser !== "string") {
    redirect('/', RedirectType.replace)
  }

	return (
		<div className="flex h-full flex-col font-code relative">
			<EditorContext>
      <div className="h-full flex w-screen relative">
        <div className="shrink-0 flex flex-col h-full overflow-hidden border-neutral-800 border-r">
          <CustomPallete />
          <Separator orientation="horizontal" className="h-px bg-neutral-800" />
          <LastFM user={lastfmUser} sort={sort as SortType} />
        </div>
        <div className="w-full h-full flex">
          <Menu />
          <Grid />
        </div>
        <Overlay />
      </div>
    </EditorContext>
		</div>
	)
}
