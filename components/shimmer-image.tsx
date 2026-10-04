"use client"

import { useCallback, useState } from "react"
import Image, { type ImageProps } from "next/image"
import { PawPrint } from "lucide-react"

import { cn } from "@/lib/utils"

type ShimmerImageProps = Omit<ImageProps, "onLoad" | "onError"> & {
  /** Shown softly on the shimmer while the image loads, e.g. the post title */
  caption?: string
  /** Size of the paw + caption treatment; thumbnails only get the shimmer */
  captionSize?: "sm" | "lg"
}

/**
 * next/image with a shimmer placeholder that fades out once the photo arrives,
 * so the card or hero has shape (and its title) before the image finishes loading.
 * Expects a `fill` image inside a positioned parent.
 */
export function ShimmerImage({
  caption,
  captionSize = "sm",
  className,
  alt,
  ...props
}: ShimmerImageProps) {
  const [loaded, setLoaded] = useState(false)

  // A cached image can finish loading before hydration, so onLoad never fires.
  const imageRef = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) setLoaded(true)
  }, [])

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "image-shimmer pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100"
        )}
      >
        {caption && (
          <>
            <PawPrint
              className={cn(
                "text-orange-400/70 dark:text-orange-300/50",
                captionSize === "lg" ? "h-9 w-9" : "h-6 w-6"
              )}
            />
            <span
              className={cn(
                "line-clamp-2 max-w-md font-bold text-orange-900/45 dark:text-orange-100/40",
                captionSize === "lg" ? "text-lg sm:text-xl" : "text-xs"
              )}
            >
              {caption}
            </span>
          </>
        )}
      </div>
      {/* The fade lives on a wrapper so the image keeps its own hover/parallax transitions */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0"
        )}
      >
        <Image
          ref={imageRef}
          alt={alt}
          {...props}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={className}
        />
      </div>
    </>
  )
}
