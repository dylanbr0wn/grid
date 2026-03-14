import { EditorContext } from "@/components/editor/context";
import Grid from "@/components/editor/grid";
import Overlay from "@/components/album/album-overlay";
import { Separator } from "@base-ui/react";
import Menu from "@/components/menu";
import CustomAlbums from "@/components/editor/custom-albums";
import { WelcomeDialog } from "@/components/welcome-dialog";
import LastFMAlbums from "@/components/editor/lastfm-albums";


export default function Page() {
  return (
    <div className="flex h-full flex-col font-code relative">
      <EditorContext>
        <div className="h-full flex w-screen relative">
          <div className="shrink-0 flex flex-col h-screen overflow-hidden border-neutral-800 border-r">
            <CustomAlbums />
            <Separator
              orientation="horizontal"
              className="h-px bg-neutral-800"
            />
            <LastFMAlbums />
          </div>
          <div className="w-full h-full flex">
            <Menu />
            <Grid />
          </div>
          <Overlay />
        </div>
        <WelcomeDialog />
      </EditorContext>
    </div>
  );
}
