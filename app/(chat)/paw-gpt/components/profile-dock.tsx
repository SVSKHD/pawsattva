"use client"

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import type { User as FirebaseUser } from "firebase/auth"
import { formatDistanceToNowStrict } from "date-fns"
import { CalendarDays, Cat, Check, ChevronDown, ChevronRight, Dog, GripVertical, Mail, Menu, MessageCircle, PawPrint, Phone, Plus, SquarePen, Trash2, User } from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { UserProfile } from "@/firebase/firestore"
import { imageUrlProblem } from "@/lib/image-hosts"
import { UsageMeter, type PawGptQuota } from "./usage-meter"

import { isCatPet, petSubtitle, weightStatusOf, type GptPet } from "./pet-data"

const POSITION_KEY = "paw-gpt-dock-position"
const EDGE = 8
const KEY_STEP = 24
const TOP_BAR = 72

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
  const bodyMaxHeight = Math.max(180, viewportHeight - position.y - 96)

  return (
    <div
      ref={rootRef}
      // Floating dock from tablet width up; phones use ProfileSidebar instead.
      className="paw-glass fixed z-40 hidden w-[min(19rem,calc(100vw-1rem))] overflow-hidden rounded-[1.75rem] md:block"
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
  )
}

type DockBodyProps = Omit<ProfileDockProps, "streaming">

/** What the dock and the mobile sidebar both show: contact, pets, chats and today's usage. */
function DockBody({
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
}

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
