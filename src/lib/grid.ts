import { useParamsStore } from "./session-store"

export function useGridSize() {
  const [rows, setRows] = useParamsStore<number>('rows', 5)
  const [columns, setColumns] = useParamsStore<number>('cols', 5)
  return { rows, setRows, columns, setColumns }
}