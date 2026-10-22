"use client"

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react"

const POSITION_KEY = "paw-gpt-rail-position"
const EDGE = 8
// Movement before a press becomes a drag; below this it stays a tap on the button underneath
const DRAG_THRESHOLD = 6

type Position = { x: number; y: number }

/** iOS safe-area insets (status bar / Dynamic Island, home indicator), read once via a probe element */
function safeAreaInsets() {
  const probe = document.createElement("div")
  probe.style.cssText =
    "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)"
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const insets = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 }
  probe.remove()
  return insets
}

/**
 * Phone-only floating pill that can be dragged anywhere on screen.
 * Taps still reach the buttons inside; a drag never triggers them. The spot is remembered per device.
 */
export function FloatingRail({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const insets = useRef({ top: 0, bottom: 0 })
  const drag = useRef<{ startX: number; startY: number; origin: Position; pointerId: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  // null = default spot (right edge, vertically centred) until the user moves it
  const [position, setPosition] = useState<Position | null>(null)
  const [dragging, setDragging] = useState(false)

  const clamp = useCallback((next: Position): Position => {
    const el = ref.current
    const width = el?.offsetWidth ?? 52
    const height = el?.offsetHeight ?? 160
    const minY = insets.current.top + EDGE
    const maxY = window.innerHeight - insets.current.bottom - height - EDGE
    return {
      x: Math.min(Math.max(next.x, EDGE), window.innerWidth - width - EDGE),
      y: Math.min(Math.max(next.y, minY), Math.max(minY, maxY)),
    }
  }, [])

  // Restore the saved spot once we can measure; keep the pill on screen when the viewport changes
  useEffect(() => {
    insets.current = safeAreaInsets()
    try {
      const saved = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? "null") as Position | null
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPosition(clamp(saved))
    } catch {
      // storage unavailable or corrupt; stay in the default spot
    }
    const onResize = () => setPosition((current) => (current ? clamp(current) : current))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [clamp])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: rect.left, y: rect.top },
      pointerId: event.pointerId,
      moved: false,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      // Capture only once it's a real drag, so plain taps still land on the button under the finger
      state.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    setPosition(clamp({ x: state.origin.x + dx, y: state.origin.y + dy }))
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    if (!state.moved) return
    suppressClick.current = true
    setDragging(false)
    const next = clamp({ x: state.origin.x + event.clientX - state.startX, y: state.origin.y + event.clientY - state.startY })
    setPosition(next)
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable; it just starts in the default spot next time
    }
  }

  // The click that follows a drag must not open a link or button
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      className={`fixed z-30 touch-none select-none md:hidden ${position ? "left-0 top-0" : "right-2 top-1/2 -translate-y-1/2"}`}
      style={position ? { transform: `translate3d(${position.x}px, ${position.y}px, 0)` } : undefined}
    >
      {/* .paw-liquid-glass sets position: relative, so positioning stays on the wrapper above */}
      <nav
        aria-label={label}
        className={`paw-liquid-glass flex w-[52px] flex-col items-center gap-1.5 rounded-full p-1.5 transition-[scale,box-shadow] duration-200 ${
          dragging ? "scale-105 cursor-grabbing shadow-[0_18px_40px_-10px_rgba(24,24,27,0.35)]" : "cursor-grab"
        }`}
      >
        {/* Grip: hints that the pill can be moved */}
        <span aria-hidden className="mt-0.5 h-1 w-5 rounded-full bg-foreground/15" />
        {children}
      </nav>
    </div>
  )
}
