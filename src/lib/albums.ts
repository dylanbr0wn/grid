import { type } from "arktype";
import { generateId } from "./util";

/** Discriminator values for the four album types. */
export type AlbumTypes = "lastfm" | "placeholder" | "custom" | "custom_add" ;

export type BaseAlbum = {
  id: UniqueIdentifier;
  type: AlbumTypes;
};

/** ArkType schema for user-added albums (from MusicBrainz search). All metadata fields are optional. */
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

/** ArkType schema for the "+Add Album" button rendered at the end of the custom palette. */
export const customAddAlbum = type({
  "type": "'custom_add'",
  "id": "string",
})

export type CustomAddAlbum = type.infer<typeof customAddAlbum>;

/** ArkType schema for empty grid slots. Only carries an id and type. */
export const placeholderAlbum = type({
  "type": "'placeholder'",
  "id": "string",
})

export type PlaceholderAlbum = type.infer<typeof placeholderAlbum>;

export const uniqueIdentifier = type("string | number");

/**
 * ArkType schema for albums fetched from the Last.fm API.
 * Required fields: album, artist, plays, img, imgs.
 */
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
const CUSTOM_ADD_PREFIX = "custom_add";

/** Checks if an ID belongs to a placeholder album (prefix: "placeholder_"). */
export function isPlaceholderId(id: string | number): boolean {
  return typeof id === "string" && id.startsWith(PLACEHOLDER_PREFIX);
}

/** Creates a new placeholder album with a random unique ID. */
export function newPlaceholderAlbum(): PlaceholderAlbum {
  return {
    id: `${PLACEHOLDER_PREFIX}_${generateId()}`,
    type: "placeholder",
  };
}

/** Checks if an ID belongs to a custom-add button (prefix: "custom_add_"). */
export function isCustomAddId(id: string | number): boolean {
  return typeof id === "string" && id.startsWith(CUSTOM_ADD_PREFIX);
}

/** Creates a new custom-add button album with a random unique ID. */
export function newCustomAddAlbum(): CustomAddAlbum {
  return {
    id: `${CUSTOM_ADD_PREFIX}_${generateId()}`,
    type: "custom_add",
  };
}
