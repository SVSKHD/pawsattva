"use client"

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react"

const POSITION_KEY = "paw-gpt-rail-position"
const EDGE = 8
// Movement before a press becomes a drag; below this it stays a tap on the button underneath
const DRAG_THRESHOLD = 6
const RAIL_WIDTH = 52
// How much of a tucked pill stays on screen: enough for the grip and a thumb
const PEEK = 18
// Drag this far past a screen edge and let go to park the pill there
const PARK_PULL = 24
// A parked pill comes back only when dragged at least this far towards the middle
const UNPARK_PULL = 20

type Position = { x: number; y: number }
type Side = "left" | "right"
type Saved = Position & { parked?: Side | null }

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
 * Dragged past a screen edge it parks there, only an orange grip showing, until it's dragged out again.
 */
export function FloatingRail({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const insets = useRef({ top: 0, bottom: 0 })
  const drag = useRef<{ startX: number; startY: number; origin: Position; pointerId: number; moved: boolean; parked: Side | null } | null>(null)
  const suppressClick = useRef(false)
  // null = default spot (right edge, vertically centred) until the user moves it
  const [position, setPosition] = useState<Position | null>(null)
  const [dragging, setDragging] = useState(false)
  // Hidden against an edge on purpose; stays that way (across visits) until dragged out
  const [parked, setParked] = useState<Side | null>(null)
  // Mid-drag: the edge it would park against if let go now
  const [parkHint, setParkHint] = useState<Side | null>(null)
  // While the conversation scrolls the pill slides mostly off its edge, so it never covers what you read
  const [tucked, setTucked] = useState(false)
  const tuckTimer = useRef(0)

  useEffect(() => {
    // Scroll events don't bubble, but they do reach a capturing listener on the document
    const onScroll = () => {
      if (drag.current) return
      setTucked(true)
      window.clearTimeout(tuckTimer.current)
      tuckTimer.current = window.setTimeout(() => setTucked(false), 1100)
    }
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true })
      window.clearTimeout(tuckTimer.current)
    }
  }, [])

  // Tuck all the way to whichever screen edge the pill sits nearer to (the default spot is the right
  // edge), leaving just the orange grip peeking out.
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth
  const railX = position?.x ?? viewportWidth - RAIL_WIDTH - EDGE
  const tuckLeft = parked ? parked === "left" : railX + RAIL_WIDTH / 2 < viewportWidth / 2
  const tuckBy = tuckLeft ? -(railX + RAIL_WIDTH - PEEK) : viewportWidth - railX - PEEK
  const hidden = (parked !== null || tucked) && !dragging
  const gripSide = dragging ? parkHint : tuckLeft ? "left" : "right"
  const showGrip = hidden || (dragging && parkHint !== null)

  /** Left and right limits for the pill's x while it's free. */
  const bounds = useCallback(() => {
    const width = ref.current?.offsetWidth ?? RAIL_WIDTH
    return { min: EDGE, max: window.innerWidth - width - EDGE }
  }, [])

  const clamp = useCallback(
    (next: Position): Position => {
      const height = ref.current?.offsetHeight ?? 160
      const { min, max } = bounds()
      const minY = insets.current.top + EDGE
      const maxY = window.innerHeight - insets.current.bottom - height - EDGE
      return {
        x: Math.min(Math.max(next.x, min), max),
        y: Math.min(Math.max(next.y, minY), Math.max(minY, maxY)),
      }
    },
    [bounds]
  )

  /** Where letting go at `rawX` would leave the pill: parked against an edge, or free (null). */
  const parkSideFor = (rawX: number, start: NonNullable<typeof drag.current>): Side | null => {
    if (start.parked) {
      const pulled = start.parked === "left" ? rawX - start.origin.x : start.origin.x - rawX
      return pulled > UNPARK_PULL ? null : start.parked
    }
    const { min, max } = bounds()
    if (rawX < min - PARK_PULL) return "left"
    if (rawX > max + PARK_PULL) return "right"
    return null
  }

  // Restore the saved spot once we can measure; keep the pill on screen when the viewport changes
  useEffect(() => {
    insets.current = safeAreaInsets()
    try {
      const saved = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? "null") as Saved | null
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        setPosition(clamp(saved))
        if (saved.parked === "left" || saved.parked === "right") setParked(saved.parked)
      }
    } catch {
      // storage unavailable or corrupt; stay in the default spot
    }
    const onResize = () => setPosition((current) => (current ? clamp(current) : current))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [clamp])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    suppressClick.current = false
    // Touching a pill tucked by scrolling just brings it back; it doesn't press the half-hidden button
    if (tucked && !parked) {
      window.clearTimeout(tuckTimer.current)
      setTucked(false)
      suppressClick.current = true
      return
    }
    // A parked pill ignores taps; only dragging it out brings it back
    if (parked) suppressClick.current = true
    // Start from where the pill is drawn (a parked one sits mostly off screen)
    const visual = navRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: visual.left, y: event.currentTarget.getBoundingClientRect().top },
      pointerId: event.pointerId,
      moved: false,
      parked,
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
    const raw = { x: state.origin.x + dx, y: state.origin.y + dy }
    // Past an edge it follows the finger with some resistance, hinting it can be tucked away there
    const { min, max } = bounds()
    const x = raw.x < min ? min - (min - raw.x) * 0.6 : raw.x > max ? max + (raw.x - max) * 0.6 : raw.x
    setPosition({ x, y: clamp(raw).y })
    setParkHint(parkSideFor(raw.x, state))
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    if (!state.moved) return
    suppressClick.current = true
    setDragging(false)
    setParkHint(null)
    const raw = { x: state.origin.x + event.clientX - state.startX, y: state.origin.y + event.clientY - state.startY }
    const side = parkSideFor(raw.x, state)
    const { min, max } = bounds()
    const next = side ? { x: side === "left" ? min : max, y: clamp(raw).y } : clamp(raw)
    setPosition(next)
    setParked(side)
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify({ ...next, parked: side } satisfies Saved))
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
        ref={navRef}
        aria-label={label}
        className={`paw-liquid-glass flex w-[52px] flex-col items-center gap-1.5 rounded-full p-1.5 duration-300 ease-out ${
          // No translate transition mid-drag, or the pill would lag behind the finger
          dragging
            ? "scale-105 cursor-grabbing shadow-[0_18px_40px_-10px_rgba(24,24,27,0.35)] transition-[scale,box-shadow]"
            : "cursor-grab transition-[translate,scale,box-shadow]"
        } ${dragging && parkHint ? "ring-2 ring-orange-400/70" : ""}`}
        style={hidden ? { translate: `${tuckBy}px 0` } : undefined}
      >
        {/* Orange grip: hints that the pill can be moved */}
        <span
          aria-hidden
          className={`mt-0.5 h-1.5 w-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.55)] transition-opacity duration-200 ${
            hidden ? "opacity-0" : ""
          }`}
        />
        <div
          inert={hidden || undefined}
          className={`flex flex-col items-center gap-1.5 transition-opacity duration-200 ${hidden ? "opacity-0" : dragging && parkHint ? "opacity-50" : ""}`}
        >
          {children}
        </div>
        {/* Against an edge: a vertical orange grip on the visible sliver. Tucked by scrolling, a tap brings
            the pill back; parked, it has to be dragged out. */}
        <span
          aria-hidden
          className={`absolute top-1/2 h-12 w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.6)] transition-opacity duration-300 ${
            gripSide === "left" ? "right-[6px]" : "left-[6px]"
          } ${showGrip ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
      </nav>
    </div>
  )
}
