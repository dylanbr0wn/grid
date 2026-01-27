import { Album } from "../album";
import Sidebar from "./sidebar";
import Grid from "./grid";
import { EditorContext } from "./context";
import Overlay from "./overlay";

type GridProps = {
  albums: Album[];
};

export default function Editor({ albums: initialAlbums }: GridProps) {
  return (
    <EditorContext initialAlbums={initialAlbums}>
      <div className="h-full flex w-screen relative">
        <div className="shrink-0 flex flex-col h-full overflow-hidden border-neutral-800 border-r">
          <Sidebar />
        </div>
        <div className="w-full h-full">
          <Grid />
        </div>
        <Overlay />
      </div>
    </EditorContext>
  );
}
