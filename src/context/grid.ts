import { AlbumTypes, CustomAlbum, LastFmAlbum, PlaceholderAlbum } from "@/lib/albums";
import { UniqueIdentifier } from "@dnd-kit/core";
import { createContext } from "react";

export type Container = {
  title: string;
  albums: (PlaceholderAlbum | LastFmAlbum | CustomAlbum)[];
  allowedTypes: AlbumTypes[];
  maxLength?: number;
  minLength?: number;
};

export type ContainerMap = Record<UniqueIdentifier, Container>;

export type SetAlbumFunc = (
  id: UniqueIdentifier,
  album:
    | LastFmAlbum
    | CustomAlbum
    | ((album: LastFmAlbum | CustomAlbum) => LastFmAlbum | CustomAlbum)
) => void;

type GridContextType = {
  setTextBackground: (id: UniqueIdentifier, background: boolean) => void;
  setTextColor: (id: UniqueIdentifier, color: string) => void;
  setAlbum: SetAlbumFunc;
  setAlbums: React.Dispatch<React.SetStateAction<ContainerMap>>;
  addCustomAlbum: (album: CustomAlbum) => void;
  setRows: (rows: number) => void;
  setColumns: (columns: number) => void;
  albums: ContainerMap;
  activeAlbum?: LastFmAlbum | null;
  rows: number;
  columns: number;
};

export const GridContext = createContext<GridContextType>({
  setTextBackground: () => {},
  setTextColor: () => {},
  setAlbum: () => {},
  setAlbums: () => {},
  addCustomAlbum: () => {},
  albums: {},
  rows: 0,
  columns: 0,
  setRows: () => {},
  setColumns: () => {},
});
