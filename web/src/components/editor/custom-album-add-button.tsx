import { useAlbumsStore } from "@/lib/albums-store";
import { CUSTOM_CONTAINER_KEY } from "@/lib/util";
import { Disabled } from "@dnd-kit/sortable/dist/types";
import CustomAlbumAddDialog from "./custom-album-add-dialog";
import { Sortable } from "../sortable";

function isDisabled(disabled?: boolean | Disabled | undefined): boolean {
  return typeof disabled === "boolean"
    ? disabled
    : (disabled?.droppable ?? false);
}

type CustomAddButtonProps = {
  id: string;
  disabled?: boolean | Disabled;
};

export default function CustomAddButton({
  id,
  disabled,
}: CustomAddButtonProps) {
  const albums = useAlbumsStore(
    (state) => state.albums[CUSTOM_CONTAINER_KEY].albums,
  );

  if (isDisabled(disabled) || albums.length > 1) {
    return <CustomAlbumAddDialog />;
  }

  return (
    <Sortable
      key={id}
      id={id}
      sortData={{}}
      disabled={{
        draggable: true,
        droppable: isDisabled(disabled),
      }}
    >
      <CustomAlbumAddDialog />
    </Sortable>
  );
}
