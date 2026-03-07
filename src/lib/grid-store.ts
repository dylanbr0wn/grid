"use client";
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type GridParams = {
  user: string | undefined;
  setUser: (user: string | undefined) => void;

  autofill: boolean;
  setAutofill: (autofill: boolean) => void;

  columns: number;
  setColumns: (columns: number) => void;

  rows: number;
  setRows: (rows: number) => void;

  initialized: boolean;
  setInitialized: (initialized: boolean) => void;
}

export const useGridStore = create<GridParams>()(
  persist((set) => ({
    user: undefined,
    autofill: false,
    rows: 5,
    columns: 5,
    initialized: false,
    setInitialized: (initialized: boolean) => set({ initialized }),
    setRows: (rows: number) => set({ rows }),
    setColumns: (columns: number) => set({ columns }),
    setAutofill: (autofill: boolean) => set({ autofill }),
    setUser: (user: string | undefined) => set({ user }),
  }),
    {
      name: 'grid-params-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    },
  )
)
