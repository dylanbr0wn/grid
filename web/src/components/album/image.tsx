import { memo, useState } from "react";
import { PLACEHOLDER_IMG } from "../../lib/util";
import { AlbumImage, type AlbumImageProps } from "./album-image";

export type ImageWithFallbackProps = { imgs?: string[] } & AlbumImageProps;

export const ImageWithFallback = memo(function ImageWithFallback({
  src,
  alt,
  onLoad,
  onError,
  imgs,
  style,
  ...rest
}: ImageWithFallbackProps) {
  const [loaded, setLoaded] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  const srcSet = imgs || [src, PLACEHOLDER_IMG];

  return (
    <AlbumImage
      {...rest}
      src={srcSet[srcIndex] || PLACEHOLDER_IMG}
      alt={alt}
      crossOrigin="anonymous"
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
      }}
      onLoad={(ev) => {
        if (!loaded) setLoaded(true);
        onLoad?.(ev);
      }}
      onError={(e) => {
        e.stopPropagation();
        const nextSrc = srcIndex + 1;
        if (nextSrc < srcSet.length) {
          setSrcIndex(nextSrc);
        }
        onError?.(e);
      }}
    />
  );
});
