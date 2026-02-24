import { UniqueIdentifier } from "@dnd-kit/core";
import { use } from "react";

import { useParamsStore } from "../lib/session-store"
import { GridContext } from "@/context/grid";

export function useGridRows() {
  const [rows, setRows, query, mutation] = useParamsStore<number>('rows', 5)
  return { rows, setRows, isPending: query.isPending || mutation.isPending };
}

export function useGridColumns() {
  const [rows, setRows, query, mutation] = useParamsStore<number>('columns', 5)
  return { columns: rows, setColumns: setRows, isPending: query.isPending || mutation.isPending };
}

export function useGrid() {
  return use(GridContext);
}

export function useContainer(id: UniqueIdentifier) {
  const { albums } = useGrid()

  const container = albums[id]

    return {
      container,
    }
}

