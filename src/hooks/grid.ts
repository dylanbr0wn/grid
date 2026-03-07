import { UniqueIdentifier } from "@dnd-kit/core";

// import { useGridStore } from "../lib/session-store";
import { useAlbumsStore } from "../lib/albums-store";

// export function useGridRows() {
//   const rows = useGridStore((state) => state.rows);
//   const setRows = useGridStore((state) => state.setRows);
//   return { rows, setRows };
// }

// export function useGridColumns() {
//   const columns = useGridStore((state) => state.columns);
//   const setColumns = useGridStore((state) => state.setColumns);
//   return {
//     columns,
//     setColumns,
//   }
// }

/**
 * Returns the full albums and params state as a flat object, matching the
 * previous GridContext shape so all consumers continue to work unchanged.
 */
// export function useGrid() {
//   const store = useAlbumsStore();
//   const rows = useGridStore((s) => s.rows);
//   const columns = useGridStore((s) => s.columns);
//   const setColumns = useGridStore((s) => s.setColumns);
//   const setRows = useGridStore((s) => s.setRows);
//   const sort = useGridStore((s) => s.sort);
//   const setSort = useGridStore((s) => s.setSort);
//   const user = useGridStore((s) => s.user);
//   const setUser = useGridStore((s) => s.setUser);
//   const initialized = useGridStore((s) => s.initialized);
//   return { ...store, rows, columns, setColumns, setRows, sort, setSort, user, setUser, initialized };
// }
