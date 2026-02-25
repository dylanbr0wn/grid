import type {
  UniqueIdentifier,
} from "@dnd-kit/core";
import { type } from "arktype";


export type AlbumTypes = "lastfm" | "placeholder" | "custom" ;

export type BaseAlbum = {
  id: UniqueIdentifier;
  type: AlbumTypes;
};

export const customAlbum = type({
  "type": "'custom'",
  "id": "string",
  "mbid?": "string",
  "album?": "string",
  "artist?": "string",
  "img?": "string",
  "imgs?": type("string").array(),
  "plays?": "number",
  "artistMbid?": "string",
  "textColor?": "string",
  "textBackground?": "boolean",
})

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

export const placeholderAlbum = type({
  "type": "'placeholder'",
  "id": "string",
})

export type PlaceholderAlbum = BaseAlbum & {
  type: "placeholder";
};

export const lastFmAlbum = type({
  "type": "'lastfm'",
  "id": "string",
  "mbid?": "string",
  "album": "string",
  "artist": "string",
  "img": "string",
  "imgs": type("string").array(),
  "plays": "number",
  "artistMbid?": "string",
  "textColor?": "string",
  "textBackground?": "boolean",
})

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
