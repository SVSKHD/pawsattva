"use client"

import { useEffect } from "react"

const SURFACES = ".liquid-card, .liquid-glass, .liquid-sheen"

/**
 * Feeds the pointer position (--lx / --ly) to the liquid surface under it, so its highlight
 * follows the cursor (styles in globals.css). One listener for the whole app; desktop only.
 */
export function LiquidPointer() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let frame = 0
    let last: PointerEvent | null = null

    const update = () => {
      frame = 0
      if (!last) return
      const surface = (last.target as Element | null)?.closest?.<HTMLElement>(SURFACES)
      if (!surface) return
      const rect = surface.getBoundingClientRect()
      surface.style.setProperty("--lx", `${last.clientX - rect.left}px`)
      surface.style.setProperty("--ly", `${last.clientY - rect.top}px`)
    }

    const onMove = (event: PointerEvent) => {
      last = event
      if (!frame) frame = requestAnimationFrame(update)
    }

    document.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      document.removeEventListener("pointermove", onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
