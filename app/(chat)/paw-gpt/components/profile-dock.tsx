"use client"

import { memo, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import type { User as FirebaseUser } from "firebase/auth"
import { formatDistanceToNowStrict } from "date-fns"
import { CalendarDays, Cat, Check, ChevronDown, ChevronRight, Dog, GripVertical, History, Mail, Menu, MessageCircle, PawPrint, Phone, Plus, SquarePen, Trash2, User } from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { UserProfile } from "@/firebase/firestore"
import { imageUrlProblem } from "@/lib/image-hosts"
import { UsageMeter, type PawGptQuota } from "./usage-meter"

import { isCatPet, petSubtitle, weightStatusOf, type GptPet } from "./pet-data"

const POSITION_KEY = "paw-gpt-dock-position"
const EDGE = 8
const KEY_STEP = 24
const TOP_BAR = 72
// Where the dock waits while Paw GPT answers, and how long it stays after the last word
const PARKED_SPOT = { x: 16, y: TOP_BAR + EDGE + 8 }
const PARK_LINGER_MS = 1500
// Like the phone rail: drag past a screen edge to hide the dock there, only a grip showing
const DOCK_WIDTH = 304 // 19rem, as in the class below
// The visible strip of a hidden dock: just the glowing bar on the edge, like iOS's side-button hint
const PEEK = 16
// Height of that strip (min-h-36), which the hint beside it is centred on
const EDGE_TAB_HEIGHT = 144
// After hiding (or on arrival hidden), the full hint shows this long, then only on hover
const HINT_MS = 3000
const STOW_PULL = 24
const UNSTOW_PULL = 20

type Side = "left" | "right"
type Saved = { x: number; y: number; stowed?: Side | null }

const statusDot: Record<string, string> = {
  ideal: "bg-emerald-500",
  underweight: "bg-sky-500",
  overweight: "bg-amber-500",
  obese: "bg-rose-500",
}

type Position = { x: number; y: number }

/** Keeps the dock's drag handle fully on screen. */
function clampToViewport(next: Position, width = 300, handleHeight = 64): Position {
  return {
    x: Math.min(Math.max(EDGE, next.x), Math.max(EDGE, window.innerWidth - width - EDGE)),
    // Never above the chat's floating top bar (12px gap + 56px bar).
    y: Math.min(Math.max(TOP_BAR + EDGE, next.y), Math.max(TOP_BAR + EDGE, window.innerHeight - handleHeight - EDGE)),
  }
}

/** One conversation in the history list, with the questions asked in it (oldest first). */
export interface ChatSummary {
  id: string
  petName: string
  updatedAt: number
  questions: { id: string; text: string }[]
}

interface ProfileDockProps {
  user: FirebaseUser
  profile: UserProfile | null
  pets: GptPet[]
  loading: boolean
  mealsLogged: number
  selectedPet: string
  onSelectPet: (name: string) => void
  chats: ChatSummary[]
  activeChatId: string | null
  streaming: boolean
  onOpenChat: (chatId: string, questionId?: string) => void
  onNewChat: () => void
  onClearHistory: () => void
  /** Today's allowance, or null when unlimited (admins/authors) or still loading. */
  quota: PawGptQuota | null
}

export type { PawGptQuota } from "./usage-meter"

/**
 * Past chats as an accordion: each row is one conversation and expands to the questions
 * asked in it. Clearing asks for confirmation inline (the dock floats above dialogs).
 */
function ChatHistory({
  chats,
  activeChatId,
  onOpenChat,
  onNewChat,
  onClearHistory,
}: Pick<ProfileDockProps, "chats" | "activeChatId" | "onOpenChat" | "onNewChat" | "onClearHistory">) {
  const [expandedId, setExpandedId] = useState<string | null>(activeChatId)
  const [confirmingClear, setConfirmingClear] = useState(false)

  // Follow the chat on screen: a new or reopened chat expands in the list.
  const [shownActiveId, setShownActiveId] = useState(activeChatId)
  if (activeChatId !== shownActiveId) {
    setShownActiveId(activeChatId)
    if (activeChatId) setExpandedId(activeChatId)
  }

  return (
    <section aria-label="Chat history" className="mt-4">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Chats</p>
        <button type="button" onClick={onNewChat} className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700">
          <SquarePen className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {chats.length === 0 ? (
        <p className="px-1 py-1 text-xs text-muted-foreground">Your chats will appear here.</p>
      ) : (
        <ul className="space-y-1">
          {chats.map((chat) => {
            const open = expandedId === chat.id
            const active = chat.id === activeChatId
            const panelId = `chat-${chat.id}`
            return (
              <li key={chat.id} className={`overflow-hidden rounded-2xl transition ${open ? "bg-black/[0.03] dark:bg-white/[0.04]" : ""}`}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => {
                    setExpandedId(open ? null : chat.id)
                    if (!open) onOpenChat(chat.id)
                  }}
                  className="group flex w-full items-center gap-2.5 px-2 py-1.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active ? "bg-orange-500 text-white" : "bg-orange-500/10 text-orange-600 dark:text-orange-300"}`}>
                    <MessageCircle className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">{chat.questions[0]?.text}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {chat.petName} · {chat.questions.length} question{chat.questions.length === 1 ? "" : "s"} ·{" "}
                      {formatDistanceToNowStrict(chat.updatedAt, { addSuffix: true })}
                    </span>
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                </button>
                <div
                  id={panelId}
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  inert={!open}
                >
                  <ol className="min-h-0 overflow-hidden">
                    {chat.questions.map((question) => (
                      <li key={question.id}>
                        <button
                          type="button"
                          onClick={() => onOpenChat(chat.id, question.id)}
                          className="group flex w-full items-start gap-2 py-1.5 pl-11 pr-2 text-left text-xs text-foreground/80 transition hover:text-orange-700 dark:hover:text-orange-300"
                        >
                          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5" />
                          <span className="line-clamp-2">{question.text}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {chats.length > 0 && (
        <div className="mt-2 px-1">
          {confirmingClear ? (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 px-2.5 py-2 text-xs">
              <span className="flex-1 font-semibold text-rose-700 dark:text-rose-300">Delete all chats?</span>
              <button type="button" onClick={() => setConfirmingClear(false)} className="rounded-full px-2 py-1 font-semibold text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingClear(false)
                  setExpandedId(null)
                  onClearHistory()
                }}
                className="rounded-full bg-rose-600 px-2.5 py-1 font-bold text-white hover:bg-rose-700"
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear history
            </button>
          )}
        </div>
      )}
    </section>
  )
}

/** The owner's profile and pets as an accordion that can be dragged anywhere on screen. */
export function ProfileDock({
  user,
  profile,
  pets,
  loading,
  mealsLogged,
  selectedPet,
  onSelectPet,
  chats,
  activeChatId,
  streaming,
  onOpenChat,
  onNewChat,
  onClearHistory,
  quota,
}: ProfileDockProps) {
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ startX: number; startY: number; origin: Position; moved: boolean; stowed: Side | null } | null>(null)
  const moveFrame = useRef(0)
  const pendingMove = useRef<{ position: Position; hint: Side | null } | null>(null)
  useEffect(() => () => cancelAnimationFrame(moveFrame.current), [])
  const suppressClick = useRef(false)

  const clamp = useCallback(
    (next: Position) => clampToViewport(next, rootRef.current?.offsetWidth, handleRef.current?.offsetHeight),
    []
  )

  // The dock only renders in the browser (after sign-in resolves), so window is available here.
  // Restore the last spot (and whether it was hidden against an edge), or start top-left under the
  // header; open by default on wide screens.
  const [saved] = useState<Saved | null>(() => {
    try {
      const value = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? "null") as Saved | null
      return value && Number.isFinite(value.x) && Number.isFinite(value.y) ? value : null
    } catch {
      return null // storage unavailable or corrupt; fall back to the default spot
    }
  })
  const [position, setPosition] = useState<Position>(() =>
    clampToViewport(saved ?? { x: 16, y: window.innerWidth >= 1024 ? 112 : 96 })
  )
  // Hidden against a screen edge on purpose; stays that way (across visits) until dragged out
  const [stowed, setStowed] = useState<Side | null>(() => (saved?.stowed === "left" || saved?.stowed === "right" ? saved.stowed : null))
  // Mid-drag: the edge it would hide against if let go now
  const [stowHint, setStowHint] = useState<Side | null>(null)
  const [expanded, setExpanded] = useState(() => window.innerWidth >= 1024 && !stowed)
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const dockWidth = Math.min(DOCK_WIDTH, viewportWidth - 16)
  // No glide while following the pointer, or the dock would lag behind it
  const [dragging, setDragging] = useState(false)

  // While Paw GPT answers, the dock folds up into the top-left corner with a shining border, out of
  // the answer's way; a tap opens it right there. Shortly after the last word it goes back to where
  // it was, open again if it was open before (or was opened while it waited). A dock hidden against
  // an edge stays hidden; its grip shines instead.
  const [lingering, setLingering] = useState(false)
  const [wasStreaming, setWasStreaming] = useState(streaming)
  if (streaming !== wasStreaming) {
    setWasStreaming(streaming)
    if (!streaming) setLingering(true)
  }
  useEffect(() => {
    if (!lingering) return
    const timer = window.setTimeout(() => setLingering(false), PARK_LINGER_MS)
    return () => window.clearTimeout(timer)
  }, [lingering])
  const parked = (streaming || lingering) && !stowed
  const [wasParked, setWasParked] = useState(parked)
  const [expandedBeforePark, setExpandedBeforePark] = useState(expanded)
  if (parked !== wasParked) {
    setWasParked(parked)
    if (parked) {
      setExpandedBeforePark(expanded)
      setExpanded(false)
    } else {
      setExpanded(!stowed && (expandedBeforePark || expanded))
    }
  }
  // Hidden: all but a sliver past its edge. Mid-drag it follows the pointer instead.
  const stowedX = stowed === "left" ? PEEK - dockWidth : viewportWidth - PEEK
  const shownPosition = dragging
    ? position
    : stowed
      ? { x: stowedX, y: position.y }
      : parked ? clampToViewport(PARKED_SPOT) : position
  const hidden = stowed !== null && !dragging
  const gripSide = dragging ? stowHint : stowed
  const showGrip = hidden || (dragging && stowHint !== null)

  // The "Drag to see history" text beside the bar's glowing icon: on mouse hover, and briefly
  // whenever it hides.
  const [hovering, setHovering] = useState(false)
  const [hinting, setHinting] = useState(() => stowed !== null)
  useEffect(() => {
    if (!hinting) return
    const timer = window.setTimeout(() => setHinting(false), HINT_MS)
    return () => window.clearTimeout(timer)
  }, [hinting])
  const showHint = hidden && (hovering || hinting)

  const savePosition = (next: Position, side: Side | null = stowed) => {
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify({ ...next, stowed: side } satisfies Saved))
    } catch {
      // storage unavailable; the dock just starts in its default spot next time
    }
  }

  // Keep the dock on screen when the window changes size
  useEffect(() => {
    const onResize = () => {
      setViewportHeight(window.innerHeight)
      setViewportWidth(window.innerWidth)
      setPosition((current) => clamp(current))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [clamp])

  /** Left and right limits for the dock's x while it's free. */
  const bounds = () => ({ min: EDGE, max: Math.max(EDGE, viewportWidth - dockWidth - EDGE) })

  /** Where letting go at `rawX` would leave the dock: hidden against an edge, or free (null). */
  const stowSideFor = (rawX: number, state: NonNullable<typeof drag.current>): Side | null => {
    if (state.stowed) {
      const pulled = state.stowed === "left" ? rawX - state.origin.x : state.origin.x - rawX
      return pulled > UNSTOW_PULL ? null : state.stowed
    }
    const { min, max } = bounds()
    if (rawX < min - STOW_PULL) return "left"
    if (rawX > max + STOW_PULL) return "right"
    return null
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    // Parked in its corner it only opens and closes; it can be moved again once the answer is done
    if (event.button !== 0 || parked) return
    // A hidden dock ignores taps (like the phone rail); only dragging it out brings it back
    if (stowed) suppressClick.current = true
    drag.current = { startX: event.clientX, startY: event.clientY, origin: shownPosition, moved: false, stowed }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current
    if (!state) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved && Math.hypot(dx, dy) < 5) return
    if (!state.moved) {
      state.moved = true
      setDragging(true)
    }
    const raw = { x: state.origin.x + dx, y: state.origin.y + dy }
    const { min, max } = bounds()
    // Past an edge it follows with some resistance, hinting it can be hidden there. Coming out of
    // hiding it follows the pointer directly from where it was.
    const x = state.stowed
      ? Math.min(Math.max(raw.x, state.stowed === "left" ? state.origin.x : min), state.stowed === "right" ? state.origin.x : max)
      : raw.x < min ? min - (min - raw.x) * 0.6 : raw.x > max ? max + (raw.x - max) * 0.6 : raw.x
    // Pointer events can fire several times a frame; render only the latest, once per frame
    pendingMove.current = { position: { x, y: clamp(raw).y }, hint: stowSideFor(raw.x, state) }
    if (!moveFrame.current) {
      moveFrame.current = requestAnimationFrame(() => {
        moveFrame.current = 0
        const next = pendingMove.current
        if (!next) return
        setPosition(next.position)
        setStowHint(next.hint)
      })
    }
  }

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current
    drag.current = null
    cancelAnimationFrame(moveFrame.current)
    moveFrame.current = 0
    pendingMove.current = null
    if (!state?.moved) return
    setDragging(false)
    setStowHint(null)
    suppressClick.current = true
    const raw = { x: state.origin.x + event.clientX - state.startX, y: state.origin.y + event.clientY - state.startY }
    const side = stowSideFor(raw.x, state)
    const { min, max } = bounds()
    const next = side ? { x: side === "left" ? min : max, y: clamp(raw).y } : clamp(raw)
    setPosition(next)
    setStowed(side)
    if (side) {
      setExpanded(false)
      setHinting(true)
    }
    savePosition(next, side)
  }

  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (stowed) return
    setExpanded((open) => !open)
  }

  // Arrow keys move the dock for keyboard users
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, Position> = {
      ArrowUp: { x: 0, y: -KEY_STEP },
      ArrowDown: { x: 0, y: KEY_STEP },
      ArrowLeft: { x: -KEY_STEP, y: 0 },
      ArrowRight: { x: KEY_STEP, y: 0 },
    }
    const move = moves[event.key]
    if (!move || parked) return
    event.preventDefault()
    // Hidden against an edge: the arrow away from that edge brings it back
    if (stowed) {
      if ((stowed === "left" && event.key === "ArrowRight") || (stowed === "right" && event.key === "ArrowLeft")) {
        setStowed(null)
        savePosition(position, null)
      }
      return
    }
    const next = clamp({ x: position.x + move.x, y: position.y + move.y })
    setPosition(next)
    savePosition(next)
  }

  const name = profile?.displayName || user.displayName || user.email?.split("@")[0] || "Pet parent"
  const photo = profile?.photoURL || user.photoURL
  const bodyMaxHeight = Math.max(180, viewportHeight - shownPosition.y - 96)

  return (
    <>
    {/* Positioner: moves the dock with a transform, so dragging never re-lays out the page and stays
        on the GPU. It follows the pointer exactly while held, and glides into place when let go. */}
    <div
      data-tour={stowed ? undefined : "history"}
      className={`fixed left-0 top-0 z-40 hidden md:block ${
        dragging ? "will-change-transform" : "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      }`}
      style={{ transform: `translate3d(${shownPosition.x}px, ${shownPosition.y}px, 0)` }}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
    <div
      ref={rootRef}
      // Floating dock from tablet width up; phones use ProfileSidebar instead. The two squish classes
      // are the same animation under different names, so it replays on settling into the corner and back.
      className={`paw-glass relative w-[min(19rem,calc(100vw-1rem))] overflow-hidden rounded-[1.75rem] transition-[scale,translate] duration-200 ease-out ${
        parked ? "paw-gpt-anim-squish" : "paw-gpt-anim-squish-back"
      } ${parked ? "paw-gpt-anim-shine" : ""} ${
        // Held: lifts a little, with a lighter blur that's cheaper to redraw as it moves
        dragging ? "paw-dock-dragging scale-[1.03]" : ""
      } ${
        // Hidden: the glass disappears and only the glowing bar is left on the edge, which slides out a
        // little under the pointer, inviting a drag
        hidden ? `paw-dock-edge min-h-36 ${stowed === "left" ? "hover:translate-x-1.5" : "hover:-translate-x-1.5"}` : ""
      }`}
    >
      {/* Accordion header doubles as the drag handle */}
      <button
        ref={handleRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={
          stowed
            ? `${name}'s pets and chats, hidden against the ${stowed} edge. Drag it out, or press the ${stowed === "left" ? "right" : "left"} arrow key, to bring it back.`
            : parked
              ? `${name}'s pets and chats, waiting in the corner while Paw GPT answers. Click to ${expanded ? "collapse" : "expand"}.`
              : `${name}'s profile and pets. Click to ${expanded ? "collapse" : "expand"}; drag or use arrow keys to move, or drag past a screen edge to hide it.`
        }
        title={stowed ? "Drag to see your history" : undefined}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`flex w-full touch-none select-none items-center gap-2.5 px-3 py-2.5 text-left transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-orange-500/25 ${
          parked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        } ${hidden ? "[&>*]:opacity-0" : dragging && stowHint ? "opacity-50" : ""}`}
      >
        <GripVertical className={`h-4 w-4 shrink-0 text-muted-foreground/70 transition-opacity ${parked ? "opacity-30" : ""}`} />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-primary text-white ring-2 ring-white dark:ring-zinc-900">
          {photo && !imageUrlProblem(photo) ? (
            <Image src={photo} alt="" width={40} height={40} className="h-full w-full object-cover" draggable={false} />
          ) : (
            <User className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{name}</span>
          {streaming ? (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
              </span>
              <span className="paw-gpt-anim-shimmer truncate font-medium text-foreground/60">Answering about {selectedPet}…</span>
            </span>
          ) : (
            <span className="block truncate text-xs text-muted-foreground">
              {selectedPet ? `Asking about ${selectedPet}` : loading ? "Loading your pets…" : "Tap to choose a pet"}
            </span>
          )}
        </span>
        {parked && chats.length > 0 && !expanded && (
          <span
            title="Your chats are here: tap to open"
            className="paw-gpt-anim-pop inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-orange-500/10 px-2 text-[11px] font-bold tabular-nums text-orange-700 dark:text-orange-300"
          >
            <History className="h-3 w-3" />
            {chats.length}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Against an edge: a glowing orange bar on the visible strip (light runs down it while Paw GPT
          answers); drag it out to bring the dock back. Mid-drag it hints where the dock would hide. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute w-1.5 -translate-y-1/2 rounded-full transition-opacity duration-300 ${
          gripSide === "left" ? "right-[5px]" : "left-[5px]"
        } ${hidden ? "top-1/2" : "top-[2rem]"} ${
          streaming ? "paw-gpt-anim-grip" : "bg-gradient-to-b from-orange-400 to-orange-600"
        } ${hidden ? "h-28" : "h-12"} ${
          // Glows, and hops a few times each time it appears
          showGrip ? "paw-gpt-anim-grippy opacity-100" : "opacity-0"
        }`}
      />

      {/* Accordion body */}
      <div
        id={panelId}
        role="region"
        aria-label="Profile and pets"
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        inert={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="overflow-y-auto border-t border-black/5 px-3 pb-3 pt-3 dark:border-white/10" style={{ maxHeight: bodyMaxHeight }}>
            <DockBody
              user={user}
              profile={profile}
              pets={pets}
              loading={loading}
              mealsLogged={mealsLogged}
              selectedPet={selectedPet}
              onSelectPet={onSelectPet}
              chats={chats}
              activeChatId={activeChatId}
              onOpenChat={onOpenChat}
              onNewChat={onNewChat}
              onClearHistory={onClearHistory}
              quota={quota}
            />
          </div>
        </div>
      </div>
    </div>
    </div>

    {/* Beside the bar, on the screen (the dock clips its own overflow): a glowing history icon, always,
        as on the phone rail; and "Drag to see history" on hover or just after hiding. The icon is a
        drag handle too, a much bigger target than the bar. It stays mounted (just invisible) during
        the drag it started, so the pointer stays captured. */}
    {stowed && (
      <div
        aria-hidden
        // The walkthrough points here while the dock is hidden
        data-tour="history"
        className={`pointer-events-none fixed z-40 hidden -translate-y-1/2 items-center gap-2.5 transition-opacity duration-200 md:flex ${
          stowed === "right" ? "flex-row-reverse text-right" : ""
        } ${dragging ? "opacity-0" : ""}`}
        style={{ top: shownPosition.y + EDGE_TAB_HEIGHT / 2, [stowed]: PEEK + 8 }}
      >
        <span
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => {
            onPointerUp(event)
            // The click this ends lands on the icon, not the dock's header, so don't let it swallow
            // the header's next real click
            suppressClick.current = false
          }}
          onPointerCancel={(event) => {
            onPointerUp(event)
            suppressClick.current = false
          }}
          onPointerEnter={(event) => event.pointerType === "mouse" && setHovering(true)}
          onPointerLeave={() => setHovering(false)}
          className="paw-gpt-anim-breathe paw-liquid-press pointer-events-auto flex size-10 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_0_18px_rgba(249,115,22,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] hover:scale-110 active:cursor-grabbing"
        >
          <History className="size-[18px]" />
        </span>
        <span
          className={`paw-edge-label text-[15px] font-black leading-tight tracking-tight text-orange-700 transition-[opacity,translate] duration-300 dark:text-white ${
            showHint ? "translate-x-0 opacity-100" : `opacity-0 ${stowed === "left" ? "-translate-x-2" : "translate-x-2"}`
          }`}
        >
          Drag to see
          <br />
          history
        </span>
      </div>
    )}
    </>
  )
}

type DockBodyProps = Omit<ProfileDockProps, "streaming">

/**
 * What the dock and the mobile sidebar both show: contact, pets, chats and today's usage.
 * Memoised: its props don't change while the dock is dragged, so the lists don't re-render each frame.
 */
const DockBody = memo(function DockBody({
  user, profile, pets, loading, mealsLogged, selectedPet, onSelectPet,
  chats, activeChatId, onOpenChat, onNewChat, onClearHistory, quota,
}: DockBodyProps) {
  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : undefined
  return (
    <>
            <ul className="space-y-1.5 px-1 text-xs text-muted-foreground">
              {user.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                  <span className="truncate">{user.email}</span>
                </li>
              )}
              {profile?.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                  <span className="truncate">{profile.phone}</span>
                </li>
              )}
              <li className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                <span className="truncate">
                  {loading ? "…" : `${pets.length} pet${pets.length === 1 ? "" : "s"} · ${mealsLogged} meals logged in 60 days`}
                  {memberSince ? ` · since ${memberSince}` : ""}
                </span>
              </li>
            </ul>

            <div className="mb-1.5 mt-4 flex items-center justify-between px-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Your pets</p>
              <Link href="/pet-feed" className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700">
                <Plus className="h-3.5 w-3.5" /> Add
              </Link>
            </div>

            {loading ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">Loading…</p>
            ) : pets.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                No pets yet.{" "}
                <Link href="/pet-feed" className="font-semibold text-orange-600 hover:underline">
                  Add one in Pet Feed
                </Link>
                .
              </p>
            ) : (
              <div role="radiogroup" aria-label="Choose a pet" className="space-y-0.5">
                {pets.map((pet) => {
                  const active = pet.name === selectedPet
                  const Icon = isCatPet(pet) ? Cat : pet.profile || pet.report ? Dog : PawPrint
                  const status = weightStatusOf(pet)
                  return (
                    <button
                      key={pet.name}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onSelectPet(pet.name)}
                      className={`flex w-full items-center gap-2.5 rounded-2xl px-2 py-2 text-left transition ${
                        active ? "bg-orange-500/10 text-orange-800 dark:text-orange-200" : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          active ? "bg-orange-500 text-white" : "bg-black/5 text-muted-foreground dark:bg-white/10"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-bold">
                          <span className="truncate">{pet.name}</span>
                          {status && <span title={status} className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[status] ?? ""}`} />}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{petSubtitle(pet) || "Only in food logs"}</span>
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-orange-600" />}
                    </button>
                  )
                })}
              </div>
            )}

            <ChatHistory
              chats={chats}
              activeChatId={activeChatId}
              onOpenChat={onOpenChat}
              onNewChat={onNewChat}
              onClearHistory={onClearHistory}
            />

            {quota && <UsageMeter quota={quota} className="mt-4" />}

            <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
              Sharper answers come from more data: log meals and weights in the{" "}
              <Link href="/logger" className="font-semibold text-orange-600 hover:underline">
                Food Logger
              </Link>
              .
            </p>
    </>
  )
})

/**
 * Phones get the dock's contents as a left sidebar instead of a floating panel.
 * Choosing a pet or a chat closes it, so the conversation is right there.
 */
export function ProfileSidebar({
  trigger,
  triggerClassName,
  ...props
}: ProfileDockProps & {
  /** Button contents; defaults to a menu icon */
  trigger?: ReactNode
  /** Replaces the default round menu-button styling */
  triggerClassName?: string
}) {
  const { user, profile, selectedPet } = props
  const [open, setOpen] = useState(false)
  const name = profile?.displayName || user.displayName || user.email?.split("@")[0] || "Pet parent"
  const photo = profile?.photoURL || user.photoURL
  const close = <A extends unknown[]>(action: (...args: A) => void) => (...args: A) => {
    action(...args)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open your pets, chats and usage"
        // Phones only (wider screens have the floating dock).
        className={
          triggerClassName ??
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/80 ring-1 ring-black/5 transition hover:bg-black/[0.04] active:scale-95 md:hidden dark:ring-white/10 dark:hover:bg-white/10"
        }
      >
        {trigger ?? <Menu className="h-[18px] w-[18px]" />}
      </button>
      <SheetContent side="left" className="w-[min(22rem,88vw)] gap-0 overflow-y-auto p-0">
        <SheetHeader className="border-b border-black/5 p-4 dark:border-white/10">
          <div className="flex items-center gap-3 pr-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-primary text-white">
              {photo && !imageUrlProblem(photo) ? (
                <Image src={photo} alt="" width={44} height={44} className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0">
              <SheetTitle className="truncate text-base font-bold">{name}</SheetTitle>
              <SheetDescription className="truncate text-xs">
                {selectedPet ? `Asking about ${selectedPet}` : "Choose a pet to start"}
              </SheetDescription>
            </span>
          </div>
        </SheetHeader>
        <div className="p-3">
          <DockBody
            {...props}
            onSelectPet={close(props.onSelectPet)}
            onOpenChat={close(props.onOpenChat)}
            onNewChat={close(props.onNewChat)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
