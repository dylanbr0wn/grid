"use client";
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { SortType } from './sort';

type GridParams = {
  user: string | undefined;
  setUser: (user: string | undefined) => void;

  sort: SortType;
  setSort: (sort: SortType) => void;

  autofill: boolean;
  setAutofill: (autofill: boolean) => void;

  columns: number;
  setColumns: (columns: number) => void;

  rows: number;
  setRows: (rows: number) => void;
}

export const useGridParams = create<GridParams>()(
  persist((set) => ({
    user: '',
    sort: 'playcount',
    autofill: false,
    rows: 5,
    columns: 5,
    setRows: (rows: number) => set({ rows }),
    setColumns: (columns: number) => set({ columns }),
    setAutofill: (autofill: boolean) => set({ autofill }),
    setUser: (user: string | undefined) => set({ user }),
    setSort: (sort: SortType) => set({ sort }),
  }),
    {
      name: 'grid-params-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    },
  )
)
