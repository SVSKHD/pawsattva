"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

// Holding an arrow this long jumps all the way to the top / latest message
const LONG_PRESS_MS = 450

const buzz = () => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8)
}

/**
 * Up/down arrows for the conversation, which has no visible scrollbar: each press jumps to the
 * previous or next question you asked (and briefly lights it up); down also goes to the latest
 * message once past the last question. Holding an arrow jumps to the very top or bottom.
 * A counter shows which question you're at, and a dot on "down" means a reply arrived below.
 */
export function ScrollArrows({
  scrollRef,
  watch,
  className = "",
}: {
  scrollRef: RefObject<HTMLDivElement | null>
  /** Anything that changes the content height (messages), so the arrows re-check */
  watch: unknown
  className?: string
}) {
  const [state, setState] = useState({ up: false, down: false, current: 0, total: 0 })
  // Something new arrived below while you were reading further up
  const [fresh, setFresh] = useState(false)
  const frame = useRef(0)
  const press = useRef<{ timer: number; long: boolean } | null>(null)

  /** Your questions, top to bottom, with their offsets inside the scroll area. */
  const questions = useCallback(() => {
    const el = scrollRef.current
    if (!el) return []
    const top = el.getBoundingClientRect().top
    // Clear the floating top bar so a question doesn't land underneath it.
    const offset = parseFloat(getComputedStyle(el).paddingTop) || 0
    return [...el.querySelectorAll<HTMLElement>("[data-question]")].map((node) => ({
      node,
      top: node.getBoundingClientRect().top - top + el.scrollTop - offset,
    }))
  }, [scrollRef])

  const update = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      const up = el.scrollTop > 24
      const down = el.scrollHeight - el.scrollTop - el.clientHeight > 24
      const list = questions()
      const total = list.length
      // The question you're reading: the last one that has reached the top third of the view
      const reached = list.filter((q) => q.top <= el.scrollTop + el.clientHeight / 3).length
      const current = down ? Math.max(1, reached) : total
      if (!down) setFresh(false)
      setState((prev) =>
        prev.up === up && prev.down === down && prev.current === current && prev.total === total ? prev : { up, down, current, total }
      )
    })
  }, [scrollRef, questions])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    update()
    el.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      observer.disconnect()
      cancelAnimationFrame(frame.current)
    }
  }, [scrollRef, update])

  // New or growing messages change what's below; if they land out of view, flag "down"
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight > 160) setFresh(true)
      update()
    })
    return () => cancelAnimationFrame(id)
  }, [watch, update, scrollRef])

  /** Light up the question bubble we just landed on. */
  const flash = (node: HTMLElement) => {
    const bubble = node.firstElementChild as HTMLElement | null
    if (!bubble) return
    bubble.classList.remove("paw-gpt-anim-flash")
    void bubble.offsetWidth // restart the animation
    bubble.classList.add("paw-gpt-anim-flash")
    window.setTimeout(() => bubble.classList.remove("paw-gpt-anim-flash"), 1400)
  }

  const go = (direction: "up" | "down", all = false) => {
    const el = scrollRef.current
    if (!el) return
    buzz()
    if (all) {
      el.scrollTo({ top: direction === "up" ? 0 : el.scrollHeight, behavior: "smooth" })
      return
    }
    const list = questions()
    const now = el.scrollTop
    const target = direction === "up" ? [...list].reverse().find((q) => q.top < now - 8) : list.find((q) => q.top > now + 8)
    el.scrollTo({ top: target ? target.top : direction === "up" ? 0 : el.scrollHeight, behavior: "smooth" })
    if (target) window.setTimeout(() => flash(target.node), 260)
  }

  // Tap = next/previous question; hold = all the way
  const pressProps = (direction: "up" | "down") => ({
    onPointerDown: () => {
      const timer = window.setTimeout(() => {
        if (press.current) press.current.long = true
        go(direction, true)
      }, LONG_PRESS_MS)
      press.current = { timer, long: false }
    },
    onPointerUp: () => press.current && window.clearTimeout(press.current.timer),
    onPointerLeave: () => press.current && window.clearTimeout(press.current.timer),
    onPointerCancel: () => press.current && window.clearTimeout(press.current.timer),
    onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
    onClick: () => {
      const long = press.current?.long
      press.current = null
      if (!long) go(direction)
    },
  })

  if (!state.up && !state.down) return null

  // Orange (the app's accent) so they read clearly as controls over the conversation.
  const button =
    "relative flex h-9 w-9 select-none items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-90 active:bg-white/20 disabled:pointer-events-none disabled:opacity-40 [-webkit-touch-callout:none]"

  return (
    <div
      role="group"
      aria-label="Move through the conversation"
      className={`paw-gpt-anim-pop flex flex-col items-center rounded-full bg-gradient-to-b from-orange-400 to-orange-600 p-0.5 shadow-[0_8px_20px_-6px_rgba(249,115,22,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] ring-1 ring-white/40 dark:ring-white/10 ${className}`}
    >
      <button
        type="button"
        disabled={!state.up}
        aria-label="Previous question (hold for top)"
        title="Previous question · hold for top"
        className={button}
        {...pressProps("up")}
      >
        <ChevronUp className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {state.total > 1 ? (
        <span
          aria-live="polite"
          aria-label={`Question ${state.current} of ${state.total}`}
          className="flex h-5 min-w-7 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold leading-none tabular-nums text-white"
        >
          {state.current}/{state.total}
        </span>
      ) : (
        <span aria-hidden className="mx-auto h-px w-5 bg-white/35" />
      )}

      <button
        type="button"
        disabled={!state.down}
        aria-label={fresh ? "New reply below (hold for latest)" : "Next question (hold for latest)"}
        title="Next question · hold for latest"
        className={button}
        {...pressProps("down")}
      >
        <ChevronDown className={`h-5 w-5 ${fresh && state.down ? "paw-gpt-anim-nudge" : ""}`} strokeWidth={2.5} />
        {fresh && state.down && (
          <span aria-hidden className="absolute right-0.5 top-0.5 flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-white ring-2 ring-orange-500" />
          </span>
        )}
      </button>
    </div>
  )
}
