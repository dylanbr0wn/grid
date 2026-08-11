import { CustomAlbum, LastFmAlbum } from "./albums";
import { getCoverArtUrl } from "./cover-art";
import { PLACEHOLDER_IMG } from "./util";

const REFRESH_PARAM = "refresh";

type RefreshableAlbum = CustomAlbum | LastFmAlbum;

function withRefreshParam(src: string, refreshId: string) {
  if (!src || src === PLACEHOLDER_IMG || src.startsWith("data:")) {
    return src;
  }

  try {
    const isAbsolute = /^[a-z][a-z\d+\-.]*:/i.test(src);
    const url = new URL(src, "https://grid.local");
    url.searchParams.set(REFRESH_PARAM, refreshId);

    return isAbsolute
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}${REFRESH_PARAM}=${refreshId}`;
  }
}

function withoutRefreshParam(src: string) {
  if (!src || src === PLACEHOLDER_IMG || src.startsWith("data:")) {
    return src;
  }

  try {
    const isAbsolute = /^[a-z][a-z\d+\-.]*:/i.test(src);
    const url = new URL(src, "https://grid.local");
    url.searchParams.delete(REFRESH_PARAM);

    return isAbsolute
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return src;
  }
}

function uniqueUrls(urls: (string | undefined)[]) {
  return Array.from(
    new Set(
      urls
        .filter((url): url is string => Boolean(url))
        .map(withoutRefreshParam),
    ),
  );
}

export function refreshAlbumImages<T extends RefreshableAlbum>(album: T): T {
  const refreshId = Date.now().toString(36);
  const coverArtUrl = album.mbid ? getCoverArtUrl(album.mbid) : undefined;
  const imgs = uniqueUrls([
    album.img,
    coverArtUrl,
    ...(album.imgs ?? []),
    PLACEHOLDER_IMG,
  ]).map((src) => withRefreshParam(src, refreshId));

  return {
    ...album,
    img: imgs[0] ?? album.img,
    imgs,
  };
}
