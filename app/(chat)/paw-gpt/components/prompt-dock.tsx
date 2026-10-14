"use client"

import { useEffect, useState } from "react"
import { Sparkles, X } from "lucide-react"

import { promptLibrary, type GptPet } from "./pet-data"

const OPEN_KEY = "paw-gpt-prompt-dock-open"

/** Remembers whether the prompt dock was left open. */
export function usePromptDockOpen() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved preference after hydration
      setOpen(window.localStorage.getItem(OPEN_KEY) !== "0")
    } catch {
      setOpen(true)
    }
  }, [])
  const update = (next: boolean) => {
    setOpen(next)
    try {
      window.localStorage.setItem(OPEN_KEY, next ? "1" : "0")
    } catch {
      // storage unavailable; the preference just lasts for this visit
    }
  }
  return [open, update] as const
}

/**
 * Ready-made questions above the composer, grouped by topic. Picking one fills the message
 * box (it isn't sent), so the pet parent can adjust it before spending one of the day's questions.
 */
export function PromptDock({
  pet,
  open,
  disabled,
  onPick,
  onClose,
}: {
  pet: GptPet
  open: boolean
  disabled: boolean
  onPick: (prompt: string) => void
  onClose: () => void
}) {
  const groups = promptLibrary(pet)
  const [groupId, setGroupId] = useState(groups[0].id)
  const group = groups.find((entry) => entry.id === groupId) ?? groups[0]

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <section aria-label="Suggested questions" className="paw-glass mx-auto mb-2 max-w-3xl rounded-[1.4rem] p-2">
          <div className="flex items-center gap-1.5 px-1">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-orange-500" />
            <div role="tablist" aria-label="Topics" className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
              {groups.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={entry.id === group.id}
                  onClick={() => setGroupId(entry.id)}
                  className={`h-7 shrink-0 rounded-full px-2.5 text-[11px] font-bold transition ${
                    entry.id === group.id ? "bg-orange-500 text-white" : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Hide suggested questions"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div role="tabpanel" className="mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
            {group.prompts.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={disabled}
                title={item.prompt}
                onClick={() => onPick(item.prompt)}
                className="h-8 shrink-0 rounded-full bg-orange-500/10 px-3 text-xs font-semibold text-orange-800 transition hover:bg-orange-500/20 active:scale-95 disabled:opacity-40 dark:text-orange-200"
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
