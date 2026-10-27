"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, Loader2, Sparkles, Wand2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"

/** Form keys the AI may fill, with the labels shown in the "Filled" summary */
const FIELD_LABELS: Record<string, string> = {
  petName: "Name", petType: "Pet type", petBreed: "Breed", ageValue: "Age", sex: "Sex", neutered: "Spayed/neutered",
  weightKg: "Weight", heightCm: "Height", activityLevel: "Activity", foodType: "Food type", foodBrand: "Brand",
  dailyMeals: "Meals", dailyQuantity: "Daily quantity", treatsPerDay: "Treats", allergies: "Allergies",
  medicalConditions: "Medical", foodDislikes: "Dislikes", feedingConcerns: "Concerns",
}

const EXAMPLE =
  "Bella is a 3 year old spayed female Labrador, about 28 kg and very active. She eats Royal Canin twice a day, around 350 g in total, plus 2 treats. Allergic to chicken."

/**
 * "Describe your pet and we'll fill the form": sends the parent's own words to /api/pet-feed/autofill
 * and hands back checked values for the profile and feeding steps. Everything stays editable.
 */
export function PetFeedAiAssist({ onFill }: { onFill: (fields: Record<string, string | boolean>) => void }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(true)
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [filled, setFilled] = useState<string[]>([])

  const fill = async () => {
    if (!user) return toast.error("Sign in to use AI fill.")
    if (description.trim().length < 8) return toast.error("Tell us a little about your pet first.")
    setLoading(true)
    try {
      const response = await fetch("/api/pet-feed/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ description }),
      })
      const result = (await response.json().catch(() => ({}))) as { fields?: Record<string, string | boolean>; error?: string }
      if (!response.ok || !result.fields) throw new Error(result.error || "AI couldn't read that right now. Please try again.")

      const keys = Object.keys(result.fields).filter((key) => key in FIELD_LABELS)
      if (keys.length === 0) {
        toast.info("We couldn't find form details in that. Try adding age, weight, breed or meals.")
        return
      }
      onFill(result.fields)
      setFilled(keys)
      toast.success(`Filled ${keys.length} ${keys.length === 1 ? "detail" : "details"} — please check them.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI couldn't read that right now.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="liquid-glass overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-foreground">Fill with AI</span>
          <span className="block text-xs text-muted-foreground">Describe your pet in your own words — we&apos;ll fill the profile and feeding details.</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1500}
            rows={3}
            placeholder={`e.g. ${EXAMPLE}`}
            aria-label="Describe your pet"
            className="w-full resize-y rounded-xl border border-orange-100/80 bg-white/85 p-3.5 text-sm leading-6 transition placeholder:text-muted-foreground/60 focus-visible:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 dark:border-orange-900/35 dark:bg-black/25"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fill}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-sm font-bold text-white shadow-[0_1px_2px_rgba(234,88,12,0.25)] transition-[scale,filter] duration-300 hover:brightness-105 active:scale-95 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {loading ? "Reading…" : "Fill the form"}
            </button>
            {!description && (
              <button
                type="button"
                onClick={() => setDescription(EXAMPLE)}
                className="h-10 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition hover:bg-orange-500/10 hover:text-orange-700"
              >
                Try the example
              </button>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground">Contact details and body-condition answers stay with you.</span>
          </div>

          {filled.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-emerald-500/10 p-2.5 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">Filled:</span>
              {filled.map((key) => (
                <span key={key} className="rounded-full bg-white/80 px-2 py-0.5 font-semibold text-emerald-800 dark:bg-black/30 dark:text-emerald-200">
                  {FIELD_LABELS[key]}
                </span>
              ))}
              <span className="text-emerald-700/80 dark:text-emerald-300/80">· check and edit anything below</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
