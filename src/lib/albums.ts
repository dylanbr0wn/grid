import { type } from "arktype";
import { generateId } from "./util";

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

export type CustomAlbum = type.infer<typeof customAlbum>;

export const placeholderAlbum = type({
  "type": "'placeholder'",
  "id": "string",
})

export type PlaceholderAlbum = type.infer<typeof placeholderAlbum>;

export const uniqueIdentifier = type("string | number");

export const lastFmAlbum = type({
  "type": "'lastfm'",
  "id": uniqueIdentifier,
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



type UniqueIdentifier = type.infer<typeof uniqueIdentifier>;

export type LastFmAlbum = type.infer<typeof lastFmAlbum>;

const PLACEHOLDER_PREFIX = "placeholder";

export function isPlaceholderId(id: string | number): boolean {
  return typeof id === "string" && id.startsWith(PLACEHOLDER_PREFIX);
}

export function newPlaceholderAlbum(): PlaceholderAlbum {
  return {
    id: `${PLACEHOLDER_PREFIX}_${generateId()}`,
    type: "placeholder",
  };
}

export function newCustomAlbum(): CustomAlbum {
  return {
    id: `custom_${generateId()}`,
    type: "custom",
  };
}
