"use client"

import { useEffect, useId, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

import { MiniRunner } from "@/components/pet-scene/running-pets"
import { PET_PALETTES, PetSprite, type PetColors } from "@/components/pet-scene/scene-art"

/** A different dog or cat for each step, so the steps read as a little pack. */
const DOG_COATS: PetColors[] = [PET_PALETTES.golden, PET_PALETTES.chocolate, PET_PALETTES.cream, PET_PALETTES.charcoal, PET_PALETTES.snow]
const CAT_COATS: PetColors[] = [PET_PALETTES.ginger, PET_PALETTES.silver, PET_PALETTES.charcoal, PET_PALETTES.snow, PET_PALETTES.cream]

/** Playful steps in the pet's own language. */
function stepLabels(petName: string | undefined, kind: "dog" | "cat", planning: boolean, general: boolean) {
  const name = petName || `your ${kind}`
  if (general) {
    // Not signed in: no pet record to read, just the question and the care guides.
    return kind === "cat"
      ? ["Pawing at your question", "Batting through cat care guides", "Stalking the vet-approved basics", "Pouncing on the details", "Purring out an answer"]
      : ["Sniffing out your question", "Digging through dog care guides", "Fetching the vet-approved basics", "Chasing down the details", "Wagging out an answer"]
  }
  if (planning) {
    return kind === "cat"
      ? ["Pawing through cat breeds", "Batting at the costs", "Stalking a first-week checklist", "Pouncing on the details", "Purring out an answer"]
      : ["Sniffing out the right breeds", "Digging into costs", "Fetching a first-week checklist", "Chasing down the details", "Wagging out an answer"]
  }
  return kind === "cat"
    ? [`Pawing through ${name}'s profile`, "Batting at the meal logs", "Stalking the weight chart", "Pouncing on the details", "Purring out an answer"]
    : [`Sniffing through ${name}'s profile`, "Digging up meal logs", "Fetching the weight chart", "Chasing down the details", "Wagging out an answer"]
}

/** A finished step's pet: a dog sits and woofs, a cat curls up for a nap. */
function RestingPet({ kind, colors }: { kind: "dog" | "cat"; colors: PetColors }) {
  return (
    <span className="relative flex h-7 w-11 items-end justify-center">
      <PetSprite kind={kind} colors={colors} sleepy={kind === "cat"} className="h-6 w-auto" />
      {kind === "dog" ? (
        <svg viewBox="0 0 34 18" aria-hidden className="paw-gpt-anim-woof absolute -right-4 -top-2 h-4 w-auto drop-shadow-sm">
          <path d="M3 1 h28 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 h-20 l-6 4 l1 -4 h-3 a2 2 0 0 1 -2 -2 v-9 a2 2 0 0 1 2 -2 z" fill="#f97316" />
          <text x={17} y={11} textAnchor="middle" fontSize={8} fontWeight={800} fill="#fff" fontFamily="system-ui, sans-serif">
            Woof!
          </text>
        </svg>
      ) : (
        <span aria-hidden className="absolute -right-2 -top-1.5 flex items-end gap-px text-[10px] font-black leading-none text-violet-500">
          <span className="paw-gpt-anim-zzz">z</span>
          <span className="paw-gpt-anim-zzz -mt-1" style={{ animationDelay: "0.9s" }}>z</span>
        </span>
      )}
    </span>
  )
}

/**
 * Paw GPT's thinking steps, without a card: one line with the current step and its pet on the
 * move (dogs gallop, cats walk). Clicking it shows every step nested underneath: done steps rest
 * (dogs woof, cats sleep), each with a different coat; tapping a step makes it the active one.
 * Steps advance by themselves and stay on the last one if the answer is slow.
 */
export function ThinkingSteps({
  petName,
  kind = "dog",
  planning = false,
  general = false,
}: {
  petName?: string
  kind?: "dog" | "cat"
  planning?: boolean
  /** No pet record (visitor not signed in): general-question wording */
  general?: boolean
}) {
  const steps = stepLabels(petName, kind, planning, general)
  const coats = kind === "cat" ? CAT_COATS : DOG_COATS
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const listId = useId()

  useEffect(() => {
    if (active >= steps.length - 1) return
    const timer = window.setTimeout(() => setActive((current) => Math.min(current + 1, steps.length - 1)), 1600)
    return () => window.clearTimeout(timer)
  }, [active, steps.length])

  return (
    <div className="w-full max-w-sm">
      {/* One line: the current step and its pet on the move. Click to see every step nested below. */}
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={listId}
        className="group inline-flex max-w-full items-center gap-2 rounded-full py-0.5 pr-2 text-left"
      >
        <span className="flex h-7 w-11 shrink-0 items-center justify-center overflow-hidden">
          <MiniRunner kind={kind} colors={coats[active % coats.length]} gait={kind === "cat" ? "walk" : "run"} className="h-7 w-auto" />
        </span>
        <span key={active} role="status" aria-live="polite" className="paw-gpt-anim-shimmer paw-gpt-anim-pop min-w-0 truncate text-[13px] font-semibold text-foreground/75">
          {steps[active]}
        </span>
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
          {active + 1}/{steps.length}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground ${expanded ? "rotate-180" : ""}`} />
      </button>

      <ol
        id={listId}
        hidden={!expanded}
        aria-label="What Paw GPT is doing"
        className="paw-gpt-anim-pop ml-[1.35rem] mt-1 space-y-0.5 border-l-2 border-orange-500/20 pl-3"
      >
        {steps.map((label, index) => {
          const state = index < active ? "done" : index === active ? "active" : "pending"
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-current={state === "active" ? "step" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-0.5 text-left transition ${
                  state === "active" ? "" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                }`}
              >
                {/* Only the moving pet is clipped (its ground strip); a resting pet's woof / zzz spill out */}
                <span className={`flex h-7 w-11 shrink-0 items-center justify-center rounded-lg ${state === "active" ? "overflow-hidden" : ""}`}>
                  {state === "active" ? (
                    <MiniRunner kind={kind} colors={coats[index % coats.length]} gait={kind === "cat" ? "walk" : "run"} className="h-7 w-auto" />
                  ) : state === "done" ? (
                    <RestingPet kind={kind} colors={coats[index % coats.length]} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                  )}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-[13px] ${
                    state === "active"
                      ? "paw-gpt-anim-shimmer font-semibold text-foreground/80"
                      : state === "done"
                        ? "font-medium text-foreground/60"
                        : "text-muted-foreground/70"
                  }`}
                >
                  {label}
                </span>
                {state === "done" && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="done" />}
                {state === "active" && (
                  <span aria-hidden className="flex shrink-0 items-end gap-0.5 pb-0.5">
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} className="paw-gpt-anim-dot h-1 w-1 rounded-full bg-orange-500" style={{ animationDelay: `${dot * 0.15}s` }} />
                    ))}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
