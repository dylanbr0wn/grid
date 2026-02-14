import type {
  UniqueIdentifier,
} from "@dnd-kit/core";


export type AlbumTypes = "lastfm" | "placeholder" | "custom" ;

export type BaseAlbum = {
  id: UniqueIdentifier;
  type: AlbumTypes;
};
