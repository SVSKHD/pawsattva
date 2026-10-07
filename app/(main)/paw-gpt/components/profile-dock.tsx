"use client"

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import type { User as FirebaseUser } from "firebase/auth"
import { formatDistanceToNowStrict } from "date-fns"
import { CalendarDays, Cat, Check, ChevronDown, ChevronRight, Dog, GripVertical, Mail, MessageCircle, PawPrint, Phone, Plus, User } from "lucide-react"

import type { UserProfile } from "@/firebase/firestore"
import { imageUrlProblem } from "@/lib/image-hosts"

import { isCatPet, petSubtitle, weightStatusOf, type GptPet } from "./pet-data"

const POSITION_KEY = "paw-gpt-dock-position"
const EDGE = 8
const KEY_STEP = 24

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
    y: Math.min(Math.max(EDGE, next.y), Math.max(EDGE, window.innerHeight - handleHeight - EDGE)),
  }
}

export interface HistoryEntry {
  id: string
  petName: string
  question: string
  askedAt?: number
}

interface ProfileDockProps {
  user: FirebaseUser
  profile: UserProfile | null
  pets: GptPet[]
  loading: boolean
  mealsLogged: number
  selectedPet: string
  onSelectPet: (name: string) => void
  history: HistoryEntry[]
  streaming: boolean
  onOpenHistory: (entry: HistoryEntry) => void
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
  history,
  streaming,
  onOpenHistory,
}: ProfileDockProps) {
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ startX: number; startY: number; origin: Position; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const clamp = useCallback(
    (next: Position) => clampToViewport(next, rootRef.current?.offsetWidth, handleRef.current?.offsetHeight),
    []
  )

  // The dock only renders in the browser (after sign-in resolves), so window is available here.
  // Restore the last spot, or start top-left under the header; open by default on wide screens.
  const [position, setPosition] = useState<Position>(() => {
    const wide = window.innerWidth >= 1024
    try {
      const saved = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? "null") as Position | null
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return clampToViewport(saved)
    } catch {
      // storage unavailable or corrupt; fall back to the default spot
    }
    return clampToViewport({ x: 16, y: wide ? 112 : 96 })
  })
  const [expanded, setExpanded] = useState(() => window.innerWidth >= 1024)
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)

  const savePosition = (next: Position) => {
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable; the dock just starts in its default spot next time
    }
  }

  // Keep the dock on screen when the window changes size
  useEffect(() => {
    const onResize = () => {
      setViewportHeight(window.innerHeight)
      setPosition((current) => clamp(current))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [clamp])

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    drag.current = { startX: event.clientX, startY: event.clientY, origin: position, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved && Math.hypot(dx, dy) < 5) return
    state.moved = true
    setPosition(clamp({ x: state.origin.x + dx, y: state.origin.y + dy }))
  }

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    drag.current = null
    if (!state?.moved) return
    suppressClick.current = true
    const next = clamp({ x: state.origin.x + event.clientX - state.startX, y: state.origin.y + event.clientY - state.startY })
    setPosition(next)
    savePosition(next)
  }

  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
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
    if (!move) return
    event.preventDefault()
    const next = clamp({ x: position.x + move.x, y: position.y + move.y })
    setPosition(next)
    savePosition(next)
  }

  const name = profile?.displayName || user.displayName || user.email?.split("@")[0] || "Pet parent"
  const photo = profile?.photoURL || user.photoURL
  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : undefined
  const bodyMaxHeight = Math.max(180, viewportHeight - position.y - 96)

  return (
    <div
      ref={rootRef}
      className="paw-glass fixed z-[60] w-[min(19rem,calc(100vw-1rem))] overflow-hidden rounded-[1.75rem]"
      style={{ left: position.x, top: position.y }}
    >
      {/* Accordion header doubles as the drag handle */}
      <button
        ref={handleRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${name}'s profile and pets. Click to ${expanded ? "collapse" : "expand"}; drag or use arrow keys to move.`}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex w-full cursor-grab touch-none select-none items-center gap-2.5 px-3 py-2.5 text-left active:cursor-grabbing focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-orange-500/25"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/70" />
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
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
      </button>

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

            {history.length > 0 && (
              <>
                <p className="mb-1.5 mt-4 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Recent questions</p>
                <ul className="space-y-0.5">
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => onOpenHistory(entry)}
                        className="group flex w-full items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left transition hover:bg-black/5 active:scale-[0.98] dark:hover:bg-white/5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-300">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">{entry.question}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {entry.petName}
                            {entry.askedAt ? ` · ${formatDistanceToNowStrict(entry.askedAt, { addSuffix: true })}` : ""}
                          </span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
              Sharper answers come from more data: log meals and weights in the{" "}
              <Link href="/logger" className="font-semibold text-orange-600 hover:underline">
                Food Logger
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
