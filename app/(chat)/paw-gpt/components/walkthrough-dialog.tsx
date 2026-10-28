"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleHelp,
  Copy,
  FileText,
  Heart,
  History,
  LogIn,
  MessageCircle,
  Sparkles,
  Square,
  Stethoscope,
  Utensils,
  Volume2,
} from "lucide-react"

import { PET_PALETTES, PetSprite } from "@/components/pet-scene/scene-art"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { PAW_GPT_DAILY_LIMIT, PAW_GPT_DAILY_TOKEN_LIMIT, PAW_GPT_GUEST_LIMIT } from "@/lib/paw-gpt"

const SEEN_KEY = "paw-gpt-walkthrough-v1"

/** Whether this browser has already seen (or skipped) the walkthrough. */
export function walkthroughSeen() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "done"
  } catch {
    return true // storage unavailable: don't pop it up on every visit
  }
}

function markWalkthroughSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "done")
  } catch {
    // storage unavailable; it may show again next visit
  }
}

interface Step {
  title: string
  body: ReactNode
  /** Shown in the dialog, and instead of the spotlight when the step's control isn't on screen */
  art: ReactNode
  /** data-tour="…" of the real control to spotlight for this step */
  target?: string
}

type Rect = { x: number; y: number; width: number; height: number }

/** Where a spotlight target is on screen (clipped to the viewport), or null when it isn't showing. */
function findTarget(name: string): Rect | null {
  let best: Rect | null = null
  let bestArea = 0
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const rect = element.getBoundingClientRect()
    const left = Math.max(rect.left, 0)
    const top = Math.max(rect.top, 0)
    const width = Math.min(rect.right, window.innerWidth) - left
    const height = Math.min(rect.bottom, window.innerHeight) - top
    const style = getComputedStyle(element)
    // Several elements can carry the same name (the dock and the phone rail); use the one you can see
    if (width > 4 && height > 4 && width * height > bestArea && style.visibility !== "hidden" && Number(style.opacity) > 0.05) {
      best = { x: left, y: top, width, height }
      bestArea = width * height
    }
  }
  return best
}

/**
 * "How Paw GPT works": a short step-by-step tour. Steps about a control on screen spotlight the real
 * thing (the page dims around it and a card explains it); the others, or a control that isn't
 * showing right now, use a dialog with a small animated mock-up. Guests get the free-questions
 * version; the history step points at the floating dock on tablets and laptops, the rail on phones.
 */
export function WalkthroughDialog({
  open,
  onOpenChange,
  guest,
  petName,
  petKind = "dog",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  guest: boolean
  /** The selected pet, to make the examples about them */
  petName?: string
  petKind?: "dog" | "cat"
}) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<"next" | "back">("next")
  // Only rendered once opened in the browser, so matchMedia is available
  const wide = open && window.matchMedia("(min-width: 768px)").matches
  const steps = buildSteps({ guest, wide, petName: petName || (petKind === "cat" ? "Mithu" : "Bruno"), petKind })
  const last = step === steps.length - 1
  const current = steps[Math.min(step, steps.length - 1)]

  // Every opening starts from the first step
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep(0)
      setDirection("next")
    }
  }

  // Where this step's control is, measured after it renders and kept up to date as things move
  const [spot, setSpot] = useState<{ step: number; rect: Rect | null } | null>(null)
  const target = current.target
  useEffect(() => {
    if (!open || !target) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setSpot({ step, rect: findTarget(target) }))
    }
    measure()
    // Floating panels glide into place; catch where they settle
    const settle = window.setTimeout(measure, 450)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [open, step, target])
  const measuring = Boolean(open && target && spot?.step !== step)
  const spotRect = target && spot?.step === step ? spot.rect : null

  const close = () => {
    markWalkthroughSeen()
    onOpenChange(false)
  }
  const go = (next: number) => {
    if (next < 0 || next >= steps.length) return
    setDirection(next > step ? "next" : "back")
    setStep(next)
  }

  // Arrow keys step through it; Escape closes the spotlight (the dialog handles its own)
  useEffect(() => {
    if (!open) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "ArrowRight") go(step + 1)
      else if (event.key === "ArrowLeft") go(step - 1)
      else if (event.key === "Escape" && spotRect) close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const controls = <TourControls steps={steps} step={step} last={last} onGo={go} onClose={close} />
  const enter = direction === "next" ? "paw-gpt-anim-step-next" : "paw-gpt-anim-step-back"

  return (
    <>
      <Dialog open={open && !measuring && !spotRect} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
        <DialogContent className="max-h-[92vh] gap-0 overflow-hidden overflow-y-auto rounded-[2rem] p-0 sm:max-w-md">
          {/* The mock-up for this step */}
          <div
            aria-hidden
            className="relative flex h-48 items-center justify-center overflow-hidden rounded-t-[2rem] bg-gradient-to-b from-orange-100 via-orange-50 to-transparent px-6 dark:from-orange-950/50 dark:via-orange-950/20"
          >
            <span className="paw-gpt-anim-blob absolute -left-10 -top-10 size-40 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.25),transparent_65%)]" />
            <span
              className="paw-gpt-anim-blob absolute -bottom-12 -right-8 size-44 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.18),transparent_65%)]"
              style={{ animationDelay: "-9s" }}
            />
            <div key={step} className={`relative w-full ${enter}`}>
              {current.art}
            </div>
          </div>

          <div className="px-6 pb-6 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              Step {step + 1} of {steps.length}
            </p>
            <div key={step} className={enter}>
              <DialogTitle className="mt-1 text-xl font-black tracking-tight">{current.title}</DialogTitle>
              <DialogDescription asChild>
                <div className="mt-1.5 min-h-[4.5rem] text-sm leading-relaxed text-muted-foreground">{current.body}</div>
              </DialogDescription>
            </div>
            {controls}
          </div>
        </DialogContent>
      </Dialog>

      {open && spotRect && (
        <Spotlight rect={spotRect} step={step} total={steps.length} title={current.title} body={current.body} enter={enter}>
          {controls}
        </Spotlight>
      )}
    </>
  )
}

/** Progress dots and Back / Skip / Next, shared by the dialog and the spotlight card. */
function TourControls({
  steps,
  step,
  last,
  onGo,
  onClose,
}: {
  steps: Step[]
  step: number
  last: boolean
  onGo: (step: number) => void
  onClose: () => void
}) {
  return (
    <>
      {/* Progress: one dot per step, the current one stretched into a pill */}
      <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Walkthrough steps">
        {steps.map((item, index) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={index === step}
            aria-label={`Step ${index + 1}: ${item.title}`}
            onClick={() => onGo(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === step ? "w-6 bg-orange-500" : index < step ? "w-2 bg-orange-300 dark:bg-orange-700" : "w-2 bg-black/10 dark:bg-white/15"
            }`}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => onGo(step - 1)} className="paw-liquid-press h-11 rounded-2xl px-4 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onClose} className="paw-liquid-press h-11 rounded-2xl px-4 text-sm font-semibold text-muted-foreground">
            Skip
          </Button>
        )}
        <Button
          type="button"
          autoFocus
          onClick={() => (last ? onClose() : onGo(step + 1))}
          className="paw-liquid-press ml-auto h-11 rounded-2xl border-0 bg-orange-500 px-5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:bg-orange-600"
        >
          {last ? (
            <>
              Start asking <Sparkles className="h-4 w-4" />
            </>
          ) : (
            <>
              Next <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </>
  )
}

const SPOT_PAD = 8
const CARD_GAP = 14
// Room the card needs above or below the control before it goes beside it instead
const CARD_ROOM = 250

/**
 * Dims the page around the real control and lights it up with a glowing, gently pulsing ring; a card
 * beside it explains it. The ring glides from one control to the next. Clicks on the page are held
 * back while the tour is showing.
 */
function Spotlight({
  rect,
  step,
  total,
  title,
  body,
  enter,
  children,
}: {
  rect: Rect
  step: number
  total: number
  title: string
  body: ReactNode
  enter: string
  children: ReactNode
}) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const hole = {
    left: rect.x - SPOT_PAD,
    top: rect.y - SPOT_PAD,
    width: rect.width + SPOT_PAD * 2,
    height: rect.height + SPOT_PAD * 2,
  }
  const cardWidth = Math.min(340, viewportWidth - 32)
  const clampX = (x: number) => Math.min(Math.max(16, x), viewportWidth - cardWidth - 16)
  const below = viewportHeight - (hole.top + hole.height) - CARD_GAP
  const above = hole.top - CARD_GAP
  const besideRight = hole.left + hole.width + CARD_GAP
  // Below or above the control when there's room, otherwise beside it (a tall, open dock)
  const card: { left: number; top?: number; bottom?: number } =
    below >= CARD_ROOM
      ? { left: clampX(rect.x + rect.width / 2 - cardWidth / 2), top: hole.top + hole.height + CARD_GAP }
      : above >= CARD_ROOM
        ? { left: clampX(rect.x + rect.width / 2 - cardWidth / 2), bottom: viewportHeight - hole.top + CARD_GAP }
        : {
            left: clampX(besideRight + cardWidth <= viewportWidth - 16 ? besideRight : hole.left - CARD_GAP - cardWidth),
            top: Math.min(Math.max(16, rect.y + rect.height / 2 - 140), viewportHeight - 300),
          }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="paw-gpt-tour-title" className="fixed inset-0 z-[70]">
      {/* Holds back clicks on the page while the tour is showing */}
      <div className="absolute inset-0" />
      {/* The lit-up control: a hole in the dimmed page, with a glowing ring that pulses */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-[1.6rem] transition-[left,top,width,height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          ...hole,
          boxShadow: "0 0 0 9999px rgba(12, 8, 4, 0.62), 0 0 0 2px rgba(251, 146, 60, 0.95), 0 0 28px 6px rgba(249, 115, 22, 0.5)",
        }}
      >
        <span className="paw-gpt-anim-spot absolute inset-0 rounded-[inherit]" />
      </div>

      {/* Solid, not glass: over the dimmed page, see-through text would be hard to read */}
      <div
        key={step}
        className={`absolute rounded-[1.6rem] bg-white p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/20 dark:bg-zinc-900 dark:ring-white/10 ${enter}`}
        style={{ ...card, width: cardWidth }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
          Step {step + 1} of {total}
        </p>
        <h2 id="paw-gpt-tour-title" className="mt-1 text-lg font-black tracking-tight">
          {title}
        </h2>
        <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</div>
        {children}
      </div>
    </div>
  )
}


function buildSteps({ guest, wide, petName, petKind }: { guest: boolean; wide: boolean; petName: string; petKind: "dog" | "cat" }): Step[] {
  const other = petKind === "dog" ? "cat" : "dog"
  return [
    {
      title: "Meet Paw GPT",
      body: guest
        ? "Your AI companion for dog and cat care. Ask about food, health, behaviour or grooming, and get practical answers in seconds."
        : "Your AI companion for dog and cat care. It answers from your own pet's profile, meals and weigh-ins, not generic advice.",
      art: (
        <div className="flex items-end justify-center gap-2">
          <PetSprite kind={petKind} colors={PET_PALETTES.golden} className="paw-gpt-anim-float h-28 w-auto" />
          <span className="paw-gpt-anim-breathe mb-16 flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_6px_18px_-6px_rgba(249,115,22,0.7)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <PetSprite kind={other} colors={PET_PALETTES.ginger} className="paw-gpt-anim-float h-20 w-auto -scale-x-100" />
        </div>
      ),
    },
    guest
      ? {
          title: `${PAW_GPT_GUEST_LIMIT} free questions to try`,
          target: "pet-picker",
          body: (
            <>
              Ask anything right away. <strong className="text-foreground">Sign in with Google</strong> for {PAW_GPT_DAILY_LIMIT} free questions
              a day, answered from your own pet&apos;s record.
            </>
          ),
          art: (
            <div className="flex flex-col items-center gap-3">
              <MockChip active icon={<LogIn className="h-3.5 w-3.5" />}>
                {PAW_GPT_GUEST_LIMIT}/{PAW_GPT_GUEST_LIMIT} free questions · Sign in for more
              </MockChip>
              <span className="paw-gpt-anim-breathe inline-flex h-10 items-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white shadow-md shadow-orange-500/30">
                <LogIn className="h-4 w-4" /> Sign in
              </span>
            </div>
          ),
        }
      : {
          title: "Pick who you're asking about",
          target: "pet-picker",
          body: (
            <>
              Choose your pet, or <strong className="text-foreground">Planning a pet</strong> if you&apos;re still deciding. Paw GPT reads that
              pet&apos;s breed, age, weight and food diary before it answers.
            </>
          ),
          art: (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <MockChip active pulse>{petName}</MockChip>
              <MockChip>Simba</MockChip>
              <MockChip icon={<Heart className="h-3.5 w-3.5" />}>Planning a pet</MockChip>
            </div>
          ),
        },
    {
      title: "Ask anything",
      target: "composer",
      body: guest ? (
        "Type your question and press Enter. Try one of the suggestions on the home screen if you're not sure where to start."
      ) : (
        <>
          Type a question and press Enter. Tap <strong className="text-foreground">Prompts</strong> for ready-made ones, like a weekly diet
          report or a weight check for {petName}.
        </>
      ),
      art: (
        <div className="paw-glass mx-auto w-full max-w-xs rounded-[1.4rem] p-2 text-left">
          <p className="px-2 py-1.5 text-[13px]">
            <Typewriter text={guest ? "How often should a puppy eat?" : `Is ${petName} eating enough protein?`} />
          </p>
          <div className="flex items-center gap-1.5 px-1 pt-1">
            <MockChip small active>{guest ? "Dogs & cats" : petName}</MockChip>
            {!guest && (
              <MockChip small pulse icon={<Sparkles className="h-3 w-3" />}>
                Prompts
              </MockChip>
            )}
            <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-orange-500 text-white">
              <ArrowUp className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Watch it think, then answer",
      body: (
        <>
          You&apos;ll see what Paw GPT is checking while it thinks, then the answer writes itself in. Changed your mind? Tap{" "}
          <strong className="text-foreground">Stop</strong> any time.
        </>
      ),
      art: (
        <div className="mx-auto flex w-full max-w-xs flex-col gap-2 text-left">
          <p className="paw-gpt-anim-shimmer text-[13px] font-semibold text-foreground/75">Reading {guest ? "dog care guides" : `${petName}'s food diary`}…</p>
          <div className="paw-glass rounded-[1.2rem] rounded-tl-md px-3 py-2.5 text-[13px] leading-snug">
            {(guest ? "Puppies under 6 months do best on 3 to 4 small meals a day." : `${petName} is getting about 22% protein, which is right for an adult.`)
              .split(" ")
              .map((word, index) => (
                <span key={index} className="paw-gpt-anim-word" style={{ animationDelay: `${index * 90}ms` }}>
                  {word}{" "}
                </span>
              ))}
          </div>
          <span className="flex size-7 items-center justify-center self-end rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <Square className="h-3 w-3 fill-current" />
          </span>
        </div>
      ),
    },
    {
      title: "Do more with every answer",
      body: guest ? (
        <>
          <strong className="text-foreground">Copy</strong> an answer or have it <strong className="text-foreground">read aloud</strong>. Ask
          for a <strong className="text-foreground">report</strong> to get tables and next steps.
        </>
      ) : (
        <>
          <strong className="text-foreground">Copy</strong> it, have it <strong className="text-foreground">read aloud</strong>, or log a meal
          straight from a food answer. Ask for a <strong className="text-foreground">report</strong> for tables and next steps.
        </>
      ),
      art: (
        <div className="flex flex-col items-center gap-3">
          <div className="paw-glass inline-flex items-center divide-x divide-black/5 overflow-hidden rounded-full text-xs font-semibold text-muted-foreground dark:divide-white/10">
            <span className="inline-flex h-9 items-center gap-1.5 px-3">
              <Copy className="h-3.5 w-3.5" /> Copy
            </span>
            <span className="inline-flex h-9 items-center gap-1.5 px-3">
              <Volume2 className="h-3.5 w-3.5" /> Read aloud
            </span>
            {!guest && (
              <span className="inline-flex h-9 items-center gap-1.5 px-3 text-orange-700 dark:text-orange-300">
                <Utensils className="h-3.5 w-3.5" /> Log food
              </span>
            )}
          </div>
          <MockChip pulse icon={<FileText className="h-3.5 w-3.5" />}>
            {guest ? "Puppy feeding report" : `${petName}'s weekly report`}
          </MockChip>
        </div>
      ),
    },
    // Guests have no saved chats or daily counter yet
    ...(guest ? [] : signedInSteps({ wide })),
    {
      title: "Come back to this tour any time",
      target: "help",
      body: (
        <>
          Tap the <strong className="text-foreground">?</strong> button whenever you want a refresher on how Paw GPT works.
        </>
      ),
      art: (
        <span className="paw-gpt-anim-breathe mx-auto flex size-14 items-center justify-center rounded-full bg-background text-orange-600 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
          <CircleHelp className="h-7 w-7" />
        </span>
      ),
    },
    {
      title: "Helpful, not a vet",
      body: (
        <>
          Paw GPT gives general guidance{guest ? "" : ` from ${petName}'s logs`}, not a diagnosis. For anything urgent, like vomiting, breathing
          trouble or not eating, <strong className="text-foreground">talk to a vet</strong> through Paw Sattva consultations.
        </>
      ),
      art: (
        <div className="flex items-center justify-center gap-3">
          <PetSprite kind={petKind} colors={PET_PALETTES.cream} className="paw-gpt-anim-float h-24 w-auto" />
          <span className="paw-gpt-anim-breathe flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_6px_18px_-6px_rgba(16,185,129,0.7)]">
            <Stethoscope className="h-6 w-6" />
          </span>
        </div>
      ),
    },
  ]
}

/** Steps about things only signed-in owners have: saved chats and the daily allowance. */
function signedInSteps({ wide }: { wide: boolean }): Step[] {
  return [
    {
      title: "Your chats are always close",
      target: "history",
      body: wide ? (
        <>
          Pets, past chats and today&apos;s usage live in this floating panel. Drag it anywhere, or past a screen edge to hide it: a{" "}
          <strong className="text-foreground">glowing bar and history icon</strong> stay there, so drag it back out when you need it.
          While Paw GPT answers, it tucks into the corner.
        </>
      ) : (
        <>
          Tap your picture on this floating rail for pets, past chats and today&apos;s usage. Drag the rail past the edge to hide it: a{" "}
          <strong className="text-foreground">glowing bar and history icon</strong> show where it is.
        </>
      ),
      art: <HistoryArt wide={wide} />,
    },
    {
      title: "Today's allowance",
      target: "usage",
      body: (
        <>
          You get <strong className="text-foreground">{PAW_GPT_DAILY_LIMIT} free questions a day</strong>. This shows how many are left and
          the tokens used; tap it for details. It all resets at midnight.
        </>
      ),
      art: (
        <div className="paw-glass mx-auto flex w-fit flex-col items-end rounded-2xl px-4 py-2.5 text-xs font-semibold tabular-nums text-muted-foreground">
          <span>
            {PAW_GPT_DAILY_LIMIT - 1}/{PAW_GPT_DAILY_LIMIT} questions left
          </span>
          <span className="opacity-80">tokens used of {Math.round(PAW_GPT_DAILY_TOKEN_LIMIT / 1000)}K</span>
        </div>
      ),
    },
  ]
}

function MockChip({
  children,
  active = false,
  pulse = false,
  small = false,
  icon,
}: {
  children: ReactNode
  active?: boolean
  /** Breathes, to point at the control the step is about */
  pulse?: boolean
  small?: boolean
  icon?: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${small ? "h-7 px-2.5 text-[11px]" : "h-9 px-3.5 text-xs"} ${
        active ? "bg-orange-500 text-white shadow-md shadow-orange-500/25" : "bg-background/80 text-foreground ring-1 ring-black/10 dark:ring-white/15"
      } ${pulse ? "paw-gpt-anim-breathe" : ""}`}
    >
      {icon}
      {children}
    </span>
  )
}

/** Types the text out once, then holds it. */
function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= text.length) return
    const timer = window.setTimeout(() => setShown((count) => count + 1), 45)
    return () => window.clearTimeout(timer)
  }, [shown, text])
  return (
    <>
      {text.slice(0, shown)}
      <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse rounded-full bg-orange-500" />
    </>
  )
}

/** The history dock (or phone rail) sliding to the edge, leaving the glowing bar and history icon. */
function HistoryArt({ wide }: { wide: boolean }) {
  return (
    <div className="relative mx-auto h-32 w-full max-w-xs overflow-hidden rounded-2xl bg-white/60 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      {/* The panel (or rail) slides off the left edge and back, on a loop */}
      <div className={`paw-gpt-anim-stow absolute left-2 top-3 ${wide ? "w-40" : "w-11"}`}>
        {wide ? (
          <div className="paw-glass rounded-2xl p-2">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
              <span className="h-2 w-16 rounded-full bg-black/10 dark:bg-white/15" />
            </div>
            {[0, 1, 2].map((row) => (
              <div key={row} className="mt-2 flex items-center gap-1.5">
                <MessageCircle className="h-3 w-3 text-orange-500" />
                <span className="h-1.5 rounded-full bg-black/10 dark:bg-white/15" style={{ width: `${70 - row * 14}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="paw-liquid-glass flex flex-col items-center gap-1.5 rounded-full p-1.5">
            <span className="mt-0.5 h-1 w-5 rounded-full bg-orange-400" />
            <span className="size-7 rounded-full bg-black/10 dark:bg-white/15" />
            <span className="size-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
          </div>
        )}
      </div>
      {/* What's left on the edge while it's hidden */}
      <div className="paw-gpt-anim-edge-hint absolute left-1 top-1/2 flex items-center gap-2">
        <span className="paw-gpt-anim-grippy h-16 w-1.5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600" />
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_0_16px_rgba(249,115,22,0.6)]">
          <History className="h-4 w-4" />
        </span>
        {wide && <span className="paw-edge-label text-xs font-black leading-tight text-orange-700 dark:text-white">Drag to see<br />history</span>}
      </div>
    </div>
  )
}
