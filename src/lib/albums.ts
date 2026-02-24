import type {
  UniqueIdentifier,
} from "@dnd-kit/core";


export type AlbumTypes = "lastfm" | "placeholder" | "custom" ;

export type BaseAlbum = {
  id: UniqueIdentifier;
  type: AlbumTypes;
};

export type CustomAlbum = BaseAlbum & {
  type: "custom";
  album?: string;
  mbid?: string;
  img?: string;
  imgs?: string[];
  plays?: number;
  artist?: string;
  artistMbid?: string;
  textColor?: string;
  textBackground?: boolean;
};

export type PlaceholderAlbum = BaseAlbum & {
  type: "placeholder";
};

export type LastFmAlbum = {
  id: UniqueIdentifier;
  type: "lastfm";
  album: string;
  mbid?: string;
  img: string;
  plays: number;
  imgs: string[];

  artist: string;
  artistMbid?: string;

  textColor?: string;
  textBackground?: boolean;
};
