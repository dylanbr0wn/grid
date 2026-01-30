'use client'
import Image from "next/image"
import { memo, useState } from "react"

type ImageProps = {srcSet?: string[]} & React.ComponentProps<typeof Image>

export const ImageWithFallback = memo(function ImageWithFallback(props: ImageProps) {
  const { src, alt, ...rest } = props
  const [srcIndex, setSrcIndex] = useState(0)

  const srcSet = props.srcSet || [src, '/placeholder.png']

  return (
    <Image
      src={srcSet[srcIndex]}
      alt={alt}
      {...rest}
      unoptimized
      onError={() => {
        const nextSrc = srcIndex + 1
        if (nextSrc >= srcSet.length) return
        setSrcIndex(nextSrc)
      }}
    />
  )
})
