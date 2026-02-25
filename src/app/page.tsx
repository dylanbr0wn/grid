import { EditorContext } from "@/components/editor/context";
import CustomPallete from "@/components/editor/custom";
import Grid from "@/components/editor/grid";
import Overlay from "@/components/editor/overlay";
import LastFM from "@/components/editor/lastfm";
import { Separator } from "@base-ui/react";
import Menu from "@/components/menu";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex h-full flex-col font-code relative">
      <EditorContext>
        <div className="h-full flex w-screen relative">
          <div className="shrink-0 flex flex-col h-full overflow-hidden border-neutral-800 border-r">
            <CustomPallete />
            <Separator
              orientation="horizontal"
              className="h-px bg-neutral-800"
            />
            <LastFM searchParams={sp} />
          </div>
          <div className="w-full h-full flex">
            <Menu />
            <Grid />
          </div>
          <Overlay />
        </div>
      </EditorContext>
    </div>
  );
}
