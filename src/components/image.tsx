'use client'
import Image from "next/image"
import { useState } from "react"

type ImageProps = React.ComponentProps<typeof Image>

export function ImageWithFallback(props: ImageProps) {
  const { src, alt, ...rest } = props
  const [imgSrc, setImgSrc] = useState(src)
  return (
    <Image
      src={imgSrc}
      alt={alt}
      {...rest}
      onError={() => {
        setImgSrc('/placeholder.png')
      }}
    />
  )
}
