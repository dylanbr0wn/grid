import { memo } from "react";

export type AlbumImageProps = Omit<
  React.ComponentProps<"img">,
  "src"
> & {
  src: string;
};

/** Thin `<img>` wrapper replacing `next/image` for the Vite SPA. */
export const AlbumImage = memo(function AlbumImage({
  src,
  alt,
  ...rest
}: AlbumImageProps) {
  return <img src={src} alt={alt} {...rest} />;
});
