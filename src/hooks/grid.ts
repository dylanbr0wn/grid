import { UniqueIdentifier } from "@dnd-kit/core";

import { useGridParams } from "../lib/session-store";
import { useAlbumsStore } from "../lib/albums-store";

export function useGridRows() {
  const rows = useGridParams((state) => state.rows);
  const setRows = useGridParams((state) => state.setRows);
  return { rows, setRows };
}

export function useGridColumns() {
  const columns = useGridParams((state) => state.columns);
  const setColumns = useGridParams((state) => state.setColumns);
  return {
    columns,
    setColumns,
  }
}

/**
 * Returns the full albums and params state as a flat object, matching the
 * previous GridContext shape so all consumers continue to work unchanged.
 */
export function useGrid() {
  const store = useAlbumsStore();
  const rows = useGridParams((s) => s.rows);
  const columns = useGridParams((s) => s.columns);
  const setColumns = useGridParams((s) => s.setColumns);
  const setRows = useGridParams((s) => s.setRows);
  const sort = useGridParams((s) => s.sort);
  const setSort = useGridParams((s) => s.setSort);
  const user = useGridParams((s) => s.user);
  const setUser = useGridParams((s) => s.setUser);
  return { ...store, rows, columns, setColumns, setRows, sort, setSort, user, setUser };
}

export function useContainer(id: UniqueIdentifier) {
  const container = useAlbumsStore((s) => s.albums[id]);
  return { container };
}

