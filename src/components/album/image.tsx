'use client'
import Image from "next/image"
import { memo, useState } from "react"
import { PLACEHOLDER_IMG } from "../../lib/util"

export type ImageWithFallbackProps = {imgs?: string[]} & React.ComponentProps<typeof Image>

export const ImageWithFallback = memo(function ImageWithFallback({ src, alt, onLoad, imgs, ...rest }: ImageWithFallbackProps) {
  const [loaded, setLoaded] = useState(false)
  const [srcIndex, setSrcIndex] = useState(0)

  const srcSet = imgs || [src, PLACEHOLDER_IMG]

  return (
    <Image
      blurDataURL={PLACEHOLDER_IMG}
      src={srcSet[srcIndex] || PLACEHOLDER_IMG}
      alt={alt}
      onLoad={(ev) => {
        if (!loaded)
        setLoaded(true)

        onLoad?.(ev)
      }}
      style={{
        opacity: loaded ? 1 : 0,
      }}
      unoptimized
      crossOrigin="anonymous"
      onError={(e) => {
        e.stopPropagation();
        const nextSrc = srcIndex + 1
        if (nextSrc < srcSet.length) {
          setSrcIndex(nextSrc)
        }
      }}
      {...rest}
    />
  )
})
