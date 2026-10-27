"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { PetFeedAiAssist } from "@/components/pet-feed-ai-assist"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { deletePetFeedDraft, getPetFeedDraft, getUserProfile, PetFeed, savePetFeed, savePetFeedDraft } from "@/firebase/firestore"
import { BREEDS, BreedReference, PetType, STATUS_COPY, calculateBcs, getBreed, getBreedImageSource, getLifeStage, getWeightContext, getWeightStatus } from "@/lib/pet-wellness"
import { AlertCircle, AlertTriangle, Cat, Check, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, CloudCheck, Dog, Footprints, Loader2, Minus, Package, PawPrint, Plus, Shuffle, Sofa, Sparkles, Zap, Beef, CookingPot, Printer, Stethoscope, User, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const DRAFT_KEY = "pawsattva.pet-feed.wellness.v2"
const STEP_KEY = `${DRAFT_KEY}.step`

const initialData = {
  name: "", email: "", phone: "", whatsappSameAsPhone: true, whatsappPhone: "", receiveUpdates: false, petName: "", petType: "Dog" as PetType, petBreed: "", ageValue: "", ageUnit: "years" as "months" | "years",
  sex: "unknown" as "male" | "female" | "unknown", neutered: false, weightKg: "", heightCm: "", activityLevel: "moderate" as "low" | "moderate" | "high",
  ribsScore: 0, waistScore: 0, tuckScore: 0, bcsAssessmentStarted: false, foodType: "commercial" as "commercial" | "home-cooked" | "mixed" | "raw" | "other",
  foodBrand: "", dailyMeals: "2", dailyQuantity: "", treatsPerDay: "0", allergies: "", medicalConditions: "", foodDislikes: "",
  feedingConcerns: "", mealDays: "30", reminders: false,
}

type FormData = typeof initialData
type FieldErrors = Partial<Record<keyof FormData, string>>
const controlClass = "paw-field-glass !h-14 w-full rounded-xl border px-4 text-base placeholder:text-muted-foreground/55 focus-visible:ring-0 aria-invalid:ring-0"
const textareaClass = "paw-field-glass min-h-28 w-full resize-y rounded-xl border p-4 text-base placeholder:text-muted-foreground/55 focus-visible:ring-0"
const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 ease-[var(--pf-ease)] active:scale-95 ${
    active
      ? "border-orange-500 bg-orange-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_14px_-6px_rgba(249,115,22,0.6)]"
      : "paw-field-glass text-muted-foreground hover:text-foreground"
  }`
const steps = [
  { title: "Pet Parent", description: "About you", icon: User },
  { title: "Pet Profile", description: "Your companion", icon: Dog },
  { title: "Body Condition", description: "Live BCS estimate", icon: PawPrint },
  { title: "Feeding Details", description: "Daily routine", icon: UtensilsCrossed },
]
const phonePattern = /^\+?[0-9 ()-]{7,20}$/

/** What is missing or invalid on a step, per field, in the order the fields appear. */
function stepErrors(step: number, data: FormData): FieldErrors {
  const errors: FieldErrors = {}
  if (step === 0) {
    if (!data.name.trim()) errors.name = "Enter your full name."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = "Enter a valid email address."
    if (!phonePattern.test(data.phone)) errors.phone = "Enter a valid phone number, e.g. +91 98765 43210."
    if (!data.whatsappSameAsPhone && !phonePattern.test(data.whatsappPhone)) errors.whatsappPhone = "Enter a valid WhatsApp number."
  }
  if (step === 1) {
    if (!data.petName.trim()) errors.petName = "What’s your pet called?"
    if (!data.petBreed) errors.petBreed = "Pick the closest breed."
    if (!(Number(data.ageValue) > 0)) errors.ageValue = "Enter an age above 0."
    if (!(Number(data.weightKg) > 0)) errors.weightKg = "Enter the current weight in kg."
    if (data.heightCm !== "" && !(Number(data.heightCm) > 0)) errors.heightCm = "Height must be above 0, or leave it empty."
  }
  if (step === 2) {
    if (!data.bcsAssessmentStarted || !data.ribsScore) errors.ribsScore = "Choose the closest description."
    if (!data.waistScore) errors.waistScore = "Choose the closest description."
    if (!data.tuckScore) errors.tuckScore = "Choose the closest description."
  }
  if (step === 3) {
    if (!(Number(data.dailyMeals) > 0)) errors.dailyMeals = "At least 1 meal a day."
    if (Number(data.treatsPerDay) < 0) errors.treatsPerDay = "Treats can’t be negative."
    if (!data.dailyQuantity.trim()) errors.dailyQuantity = "Roughly how much in a day? e.g. 300 g or 2 cups."
    if (!(Number(data.mealDays) > 0)) errors.mealDays = "Enter how many days the plan should cover."
  }
  return errors
}

const fieldId = (key: keyof FormData) => `pet-feed-${key}`

/** Adds or removes `token` from a comma-separated list, ignoring case. */
const hasToken = (text: string, token: string) => text.split(",").some((item) => item.trim().toLowerCase() === token.toLowerCase())
const toggleToken = (text: string, token: string) => {
  const items = text.split(",").map((item) => item.trim()).filter(Boolean)
  return (hasToken(text, token) ? items.filter((item) => item.toLowerCase() !== token.toLowerCase()) : [...items, token]).join(", ")
}

const OBSERVATION_TAGS = [
  { label: "Lean side", className: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200" },
  { label: "Ideal", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" },
  { label: "Heavier side", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" },
]

const Observation = ({ id, number, label, value, onChange, options, error }: { id: string; number: number; label: string; value: number; onChange: (value: number) => void; options: string[]; error?: string }) => (
  <fieldset id={id} data-invalid={error ? true : undefined} className="pet-feed-field paw-field-glass scroll-mt-28 space-y-3 rounded-2xl border p-4">
    <legend className="sr-only">{label}</legend>
    <div aria-hidden className="flex items-center gap-2.5">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${value ? "bg-emerald-500 text-white" : "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"}`}>
        {value ? <Check className="h-4 w-4" /> : number}
      </span>
      <span className="font-semibold text-foreground">{label}</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option, index) => {
        const score = index === 0 ? 2 : index === 1 ? 5 : 8
        const checked = value === score
        const tag = OBSERVATION_TAGS[index]
        return <label key={option} data-selected={checked} className={`paw-field-glass relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 text-sm ${checked ? "text-orange-950 dark:text-orange-100" : ""}`}>
          <input className="sr-only" type="radio" name={id} checked={checked} onChange={() => onChange(score)} />
          <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.className}`}>{tag.label}</span>
          <span className="pr-5 font-medium leading-snug">{option}</span>
          {checked && (
            <span aria-hidden className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white duration-300 animate-in zoom-in-50">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
        </label>
      })}
    </div>
    {error && <FieldError message={error} />}
  </fieldset>
)

export function PetFeedForm() {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState<PetFeed | null>(null)
  const [formData, setFormData] = useState<FormData>(initialData)
  const [draftReady, setDraftReady] = useState(false)
  const [accountDraftReady, setAccountDraftReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [draftStatus, setDraftStatus] = useState<"local" | "saving" | "saved">("local")
  // Errors show only after a Continue that failed, then update live as fields are fixed.
  const [showErrors, setShowErrors] = useState(false)
  const [direction, setDirection] = useState<"forward" | "back">("forward")
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setFormData({ ...initialData, ...JSON.parse(saved) })
      const savedStep = Number(localStorage.getItem(STEP_KEY))
      if (Number.isInteger(savedStep) && savedStep >= 0 && savedStep < steps.length) setStep(savedStep)
    } catch { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(STEP_KEY) }
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!user?.uid) { setAccountDraftReady(true); return }
    let active = true
    setAccountDraftReady(false)
    getPetFeedDraft(user.uid).then((draft) => {
      if (!active || !draft) return
      setFormData({
        ...initialData,
        ...draft.data,
        name: user.displayName || "",
        email: user.email || "",
      } as FormData)
      if (draft.step >= 0 && draft.step < steps.length) setStep(draft.step)
      setDraftStatus("saved")
      toast.info("Your saved Pet Feed assessment has been resumed.")
    }).catch((error) => console.error("Unable to resume Pet Feed draft:", error))
      .finally(() => { if (active) setAccountDraftReady(true) })
    return () => { active = false }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || !accountDraftReady) return
    let active = true
    setProfileReady(false)

    getUserProfile(user.uid)
      .then((profile) => {
        if (!active) return

        // Auth identity must always match the account that is currently signed in.
        // Phone is the only contact field sourced from the saved PawSattva profile.
        setFormData((current) => ({
          ...current,
          name: user.displayName || profile?.displayName || "",
          email: user.email || profile?.email || "",
          phone: profile?.phone || user.phoneNumber || current.phone || "",
          whatsappSameAsPhone: profile?.whatsappSameAsPhone ?? current.whatsappSameAsPhone,
          whatsappPhone: profile?.whatsappPhone || current.whatsappPhone || "",
          receiveUpdates: profile?.receiveUpdates ?? current.receiveUpdates,
        }))
      })
      .catch((error) => {
        console.error("Unable to prefill Pet Care profile:", error)
        if (!active) return

        setFormData((current) => ({
          ...current,
          name: user.displayName || "",
          email: user.email || "",
          phone: user.phoneNumber || current.phone || "",
        }))
      })
      .finally(() => {
        if (active) setProfileReady(true)
      })

    return () => { active = false }
  }, [accountDraftReady, user?.displayName, user?.email, user?.phoneNumber, user?.uid])

  useEffect(() => {
    if (!submitted) { localStorage.setItem(DRAFT_KEY, JSON.stringify(formData)); localStorage.setItem(STEP_KEY, String(step)) }
  }, [formData, step, submitted])

  useEffect(() => {
    if (!draftReady || !accountDraftReady || !profileReady || submitted || !user?.uid) return
    setDraftStatus("saving")
    const timer = window.setTimeout(() => {
      savePetFeedDraft(user.uid, { data: formData, step })
        .then(() => setDraftStatus("saved"))
        .catch((error) => { setDraftStatus("local"); console.error("Unable to save Pet Feed draft:", error) })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [accountDraftReady, draftReady, formData, profileReady, step, submitted, user?.uid])

  const selectedBreed = useMemo(() => formData.petBreed ? getBreed(formData.petType, formData.petBreed) : null, [formData.petBreed, formData.petType])
  const ageMonths = formData.ageValue && Number(formData.ageValue) > 0
    ? (formData.ageUnit === "years" ? Number(formData.ageValue) * 12 : Number(formData.ageValue))
    : null
  const lifeStage = ageMonths ? getLifeStage(formData.petType, ageMonths) : null
  const weightContext = getWeightContext(Number(formData.weightKg), selectedBreed?.adultWeightRange)
  const bcsAnswered = formData.bcsAssessmentStarted && formData.ribsScore > 0 && formData.waistScore > 0 && formData.tuckScore > 0
  const bcsAnsweredCount = [formData.ribsScore, formData.waistScore, formData.tuckScore].filter((score) => score > 0).length
  const bcs = calculateBcs(formData.ribsScore, formData.waistScore, formData.tuckScore)
  const status = getWeightStatus(bcs)
  const errors = showErrors ? stepErrors(step, formData) : {}
  const petLabel = formData.petName.trim() || "your pet"
  const stepDescriptions = ["A few details so we can reach you", `Tell us about ${petLabel}`, `How ${petLabel} looks and feels today`, `What ${petLabel} eats each day`]
  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setFormData((current) => ({ ...current, [key]: value }))
  const setObservation = (key: "ribsScore" | "waistScore" | "tuckScore", value: number) =>
    setFormData((current) => ({ ...current, [key]: value, bcsAssessmentStarted: true }))
  const setWhatsappSameAsPhone = (checked: boolean) =>
    setFormData((current) => ({
      ...current,
      whatsappSameAsPhone: checked,
      whatsappPhone: checked ? current.phone : (current.whatsappPhone || current.phone),
    }))
  const setPetType = (petType: PetType) => setFormData((current) => (current.petType === petType ? current : { ...current, petType, petBreed: "" }))

  // AI values are already checked on the server; a new pet type without a breed clears the old breed
  const applyAiFill = (fields: Record<string, string | boolean>) =>
    setFormData((current) => {
      const typeChanged = fields.petType !== undefined && fields.petType !== current.petType
      return { ...current, ...(typeChanged && !fields.petBreed ? { petBreed: "" } : {}), ...(fields as Partial<FormData>) }
    })

  /** Highlights every problem on the step and takes the person to the first one. */
  const validateStep = () => {
    const found = Object.keys(stepErrors(step, formData)) as (keyof FormData)[]
    if (!found.length) return true
    setShowErrors(true)
    toast.error(found.length === 1 ? "One field needs a look." : `${found.length} fields need a look.`)
    window.requestAnimationFrame(() => {
      const element = document.getElementById(fieldId(found[0]))
      element?.scrollIntoView({ behavior: "smooth", block: "center" })
      if (element instanceof HTMLInputElement || element instanceof HTMLButtonElement) element.focus({ preventScroll: true })
    })
    return false
  }

  const goTo = (target: number) => {
    setDirection(target < step ? "back" : "forward")
    setStep(Math.min(steps.length - 1, Math.max(0, target)))
    setShowErrors(false)
    // Long steps leave the person at the bottom; bring the new step's top into view.
    if (cardRef.current && cardRef.current.getBoundingClientRect().top < 0) cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const previous = () => goTo(step - 1)
  const next = () => { if (validateStep()) goTo(step + 1) }

  const submit = async () => {
    if (!validateStep()) return
    setLoading(true)
    try {
      const ageValue = Number(formData.ageValue)
      const ageMonths = formData.ageUnit === "years" ? Math.round(ageValue * 12) : Math.round(ageValue)
      const assessedAt = new Date().toISOString()
      const dietaryConcerns = [formData.allergies && `Allergies: ${formData.allergies}`, formData.medicalConditions && `Medical: ${formData.medicalConditions}`, formData.foodDislikes && `Dislikes: ${formData.foodDislikes}`, formData.feedingConcerns].filter(Boolean).join(" · ")
      const payload: PetFeed = {
        userId: user?.uid,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        whatsappSameAsPhone: formData.whatsappSameAsPhone,
        whatsappPhone: (formData.whatsappSameAsPhone ? formData.phone : formData.whatsappPhone).trim(),
        receiveUpdates: formData.receiveUpdates,
        petName: formData.petName.trim(),
        petType: formData.petType,
        petBreed: formData.petBreed, ageValue, ageUnit: formData.ageUnit, ageMonths, lifeStage: getLifeStage(formData.petType, ageMonths), sex: formData.sex,
        neutered: formData.neutered, weightKg: Number(formData.weightKg), heightCm: formData.heightCm ? Number(formData.heightCm) : undefined, activityLevel: formData.activityLevel, breedImageUrl: selectedBreed ? getBreedImageSource(formData.petType, selectedBreed) ?? undefined : undefined,
        breedReferenceRange: selectedBreed?.adultWeightRange, breedHeightReferenceRange: selectedBreed?.adultHeightRange, ribsScore: formData.ribsScore, waistScore: formData.waistScore, tuckScore: formData.tuckScore,
        bodyConditionScore: bcs, weightStatus: status, foodType: formData.foodType, foodBrand: formData.foodBrand.trim(), dailyMeals: Number(formData.dailyMeals),
        dailyQuantity: formData.dailyQuantity.trim(), treatsPerDay: Number(formData.treatsPerDay), allergies: formData.allergies.trim(), medicalConditions: formData.medicalConditions.trim(),
        foodDislikes: formData.foodDislikes.trim(), dietaryConcerns, mealDays: Number(formData.mealDays), reminders: formData.reminders, subscribe: formData.receiveUpdates,
        assessmentVersion: "bcs-owner-v1", assessedAt,
      }
      await savePetFeed(payload)
      if (user?.uid) await deletePetFeedDraft(user.uid)
      localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(STEP_KEY)
      setSubmitted(payload); toast.success("Wellness assessment saved.")
    } catch (cause) { console.error(cause); toast.error("Unable to save the assessment. Please try again.") } finally { setLoading(false) }
  }

  // Enter in a single-line field moves on, like a native form (the breed search lives in a portal and is skipped).
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (event.key !== "Enter" || !(target instanceof HTMLInputElement) || target.type === "checkbox" || !event.currentTarget.contains(target)) return
    event.preventDefault()
    if (step === steps.length - 1) void submit()
    else next()
  }

  if (submitted) return <WellnessReport data={submitted} onReset={() => { setSubmitted(null); setStep(0); setFormData({ ...initialData, name: formData.name, email: formData.email, phone: formData.phone }) }} />

  const petSummary = [
    formData.petName.trim(),
    formData.petBreed,
    Number(formData.ageValue) > 0 && `${formData.ageValue} ${formData.ageUnit === "years" ? "yr" : "mo"}`,
    Number(formData.weightKg) > 0 && `${formData.weightKg} kg`,
  ].filter(Boolean).join(" · ")

  return <div className="space-y-6">
    <Card ref={cardRef} className="paw-liquid-glass scroll-mt-24 overflow-hidden rounded-[2.5rem]">
      <div className="h-1.5 bg-orange-500/10" role="progressbar" aria-label="Assessment progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
        <div className="h-full rounded-r-full bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.6)] transition-[width] duration-700 ease-[var(--pf-ease)]" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <CardHeader className="p-7 pb-2 text-center md:p-10 md:pb-2">
        <div className="relative mb-8" aria-label={`Step ${step + 1} of ${steps.length}`}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous step"
            onClick={previous}
            disabled={step === 0}
            className="paw-glass absolute left-0 top-0 z-20 h-10 w-10 rounded-full transition-[transform,opacity,color] duration-300 ease-[var(--pf-ease)] hover:-translate-x-0.5 hover:text-orange-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="relative mx-12 flex items-start justify-between">
            <div className="absolute left-[12.5%] right-[12.5%] top-5 h-0.5 bg-muted">
              <div className="h-full bg-orange-500 transition-[width] duration-700 ease-[var(--pf-ease)]" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
            </div>
            {steps.map((item, index) => {
              const Icon = index < step ? Check : item.icon
              const active = index <= step
              return <button type="button" key={item.title} onClick={() => index < step && goTo(index)} disabled={index > step} aria-label={`${item.title}${index < step ? " (done)" : ""}`} className="group relative z-10 flex w-1/4 flex-col items-center gap-2 disabled:cursor-default">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${active ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/25" : "border-muted bg-background text-muted-foreground"} ${index === step ? "scale-110 ring-4 ring-orange-500/15" : ""} ${index < step ? "group-hover:scale-105 group-hover:bg-orange-600" : ""}`}><Icon className="h-5 w-5" /></span>
                <span className={`hidden text-[10px] font-bold uppercase tracking-wider sm:block ${active ? "text-orange-600" : "text-muted-foreground"}`}>{item.title}</span>
              </button>
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next step"
            onClick={next}
            disabled={step === steps.length - 1}
            className="paw-glass absolute right-0 top-0 z-20 h-10 w-10 rounded-full transition-[transform,opacity,color] duration-300 ease-[var(--pf-ease)] hover:translate-x-0.5 hover:text-orange-600 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div key={step} className="paw-fade space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600">Step {step + 1} of {steps.length}</p>
          <CardTitle className="text-3xl font-black tracking-tight">{steps[step].title}</CardTitle>
          <p className="text-sm text-muted-foreground">{stepDescriptions[step]}</p>
        </div>
        {step > 0 && petSummary && (
          <div className="paw-glass paw-fade mx-auto mt-3 inline-flex max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-semibold">
            {selectedBreed ? (
              <BreedPhoto breed={selectedBreed} petType={formData.petType} className="h-7 w-7 rounded-full" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50">
                {formData.petType === "Cat" ? <Cat className="h-4 w-4" /> : <Dog className="h-4 w-4" />}
              </span>
            )}
            <span className="truncate">{petSummary}</span>
          </div>
        )}
        <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground" aria-live="polite">
          {draftStatus === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CloudCheck className="h-3.5 w-3.5 text-emerald-600" />}
          {user ? (draftStatus === "saving" ? "Saving your progress…" : draftStatus === "saved" ? "Progress saved to your account" : "Progress saved on this device") : "Progress saved on this device · Sign in to resume on another device"}
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-7 md:p-10" onKeyDown={onKeyDown}>
        {/* Hidden rather than unmounted, so the description survives moving between steps */}
        <div className={step === 1 || step === 3 ? "" : "hidden"}>
          <PetFeedAiAssist onFill={applyAiFill} />
        </div>
        <div key={step} data-direction={direction} className="pet-feed-step">
        {step === 0 && <div className="space-y-5">
          <div className="grid items-start gap-5 md:grid-cols-3">
            <InputField id={fieldId("name")} label="Pet parent’s full name" value={formData.name} onChange={(value) => set("name", value)} autoComplete="name" readOnly={Boolean(user?.displayName)} hint="Matched to your signed-in Google account." error={errors.name} />
            <InputField id={fieldId("email")} label="Email address" type="email" value={formData.email} onChange={(value) => set("email", value)} autoComplete="email" readOnly={Boolean(user?.email)} hint="Matched to your signed-in Google account." error={errors.email} />
            <InputField id={fieldId("phone")} label="Phone number" type="tel" inputMode="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={(value) => set("phone", value)} autoComplete="tel" hint="Prefilled when a phone number is already saved on your PawSattva profile." error={errors.phone} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ConsentCheckbox
              checked={formData.whatsappSameAsPhone}
              onCheckedChange={setWhatsappSameAsPhone}
              label="WhatsApp number is the same as phone number"
              description={formData.phone ? `We'll use ${formData.phone} for WhatsApp.` : "We'll use the phone number above for WhatsApp."}
            />
            <ConsentCheckbox
              checked={formData.receiveUpdates}
              onCheckedChange={(checked) => set("receiveUpdates", checked)}
              label="Would you like to receive updates from PawSattva?"
              description="Receive useful wellness updates, feeding reminders, and PawSattva news. You can change this preference later."
            />
          </div>

          {!formData.whatsappSameAsPhone && (
            <div className="paw-fade grid gap-5 md:grid-cols-2">
              <InputField
                id={fieldId("whatsappPhone")}
                label="WhatsApp number"
                type="tel"
                inputMode="tel"
                value={formData.whatsappPhone}
                onChange={(value) => set("whatsappPhone", value)}
                autoComplete="tel"
                hint="Enter the number you want PawSattva to use for WhatsApp."
                error={errors.whatsappPhone}
              />
            </div>
          )}
        </div>}
        {step === 1 && <div className="space-y-5">
          <ChoiceGroup
            id={fieldId("petType")}
            label="Pet type"
            value={formData.petType}
            onChange={setPetType}
            columns="grid-cols-2"
            options={[
              { value: "Dog", label: "Dog", hint: "Puppies to seniors", icon: <Dog className="h-5 w-5" /> },
              { value: "Cat", label: "Cat", hint: "Kittens to seniors", icon: <Cat className="h-5 w-5" /> },
            ]}
          />
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <InputField id={fieldId("petName")} label="Pet name" placeholder={formData.petType === "Cat" ? "e.g. Mithai" : "e.g. Bruno"} value={formData.petName} onChange={(value) => set("petName", value)} error={errors.petName} />
            <BreedSelectField id={fieldId("petBreed")} label="Breed" value={formData.petBreed} onChange={(value) => set("petBreed", value)} placeholder="Search and select breed" breeds={BREEDS[formData.petType]} petType={formData.petType} error={errors.petBreed} />
            <AgeField
              id={fieldId("ageValue")}
              value={formData.ageValue}
              unit={formData.ageUnit}
              onChange={(value) => set("ageValue", value)}
              onUnitChange={(unit) => set("ageUnit", unit)}
              hint={lifeStage ? `Life stage: ${lifeStage}` : undefined}
              error={errors.ageValue}
            />
            <ChoiceGroup
              id={fieldId("sex")}
              label="Sex"
              value={formData.sex}
              onChange={(value) => set("sex", value)}
              compact
              options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "unknown", label: "Not sure" }]}
            />
            <InputField id={fieldId("weightKg")} label="Current weight" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" suffix="kg" value={formData.weightKg} onChange={(value) => set("weightKg", value)} error={errors.weightKg} hint={selectedBreed?.adultWeightRange ? `Adult ${selectedBreed.name} reference: ${selectedBreed.adultWeightRange}` : undefined} />
            <InputField id={fieldId("heightCm")} label="Height at shoulder" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0" suffix="cm" value={formData.heightCm} onChange={(value) => set("heightCm", value)} optional hint="Helpful for larger breeds, but not required for the report." error={errors.heightCm} />
          </div>
          <ChoiceGroup
            id={fieldId("activityLevel")}
            label="Activity level"
            value={formData.activityLevel}
            onChange={(value) => set("activityLevel", value)}
            columns="sm:grid-cols-3"
            options={[
              { value: "low", label: "Low", hint: "Mostly resting, short strolls", icon: <Sofa className="h-5 w-5" /> },
              { value: "moderate", label: "Moderate", hint: "Daily walks and some play", icon: <Footprints className="h-5 w-5" /> },
              { value: "high", label: "High", hint: "Runs, long play, very busy", icon: <Zap className="h-5 w-5" /> },
            ]}
          />
          <Toggle label="Spayed/neutered" hint="Neutered pets often need fewer calories." checked={formData.neutered} onChange={(value) => set("neutered", value)} />
          {selectedBreed && <section aria-label="Pet snapshot" className="paw-field-glass paw-fade overflow-hidden rounded-2xl border">
            <div className="flex items-center gap-4 p-4">
              <BreedPhoto breed={selectedBreed} petType={formData.petType} className="h-16 w-16 rounded-2xl ring-1 ring-orange-100 dark:ring-white/10" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">{formData.petName.trim() ? `${formData.petName.trim()}’s snapshot` : "Snapshot"}</p>
                <p className="truncate text-lg font-black leading-tight text-foreground">{selectedBreed.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lifeStage && <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">{lifeStage}</span>}
                  {Number(formData.weightKg) > 0 && <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">{formData.weightKg} kg</span>}
                  {selectedBreed.adultWeightRange && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Adult {selectedBreed.adultWeightRange}</span>}
                  {selectedBreed.adultHeightRange && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Height {selectedBreed.adultHeightRange}</span>}
                </div>
              </div>
            </div>
            <div className="border-t border-white/70 bg-orange-500/[0.04] px-4 py-3.5 dark:border-white/5" aria-live="polite">
              {weightContext && (lifeStage === "adult" || lifeStage === "senior") ? <>
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold text-foreground">{weightContext.label}</span>
                  <span className="text-xs text-muted-foreground">Breed range {weightContext.min}–{weightContext.max} kg</span>
                </div>
                <WeightRangeBar min={weightContext.min} max={weightContext.max} position={weightContext.position} />
                <p className="mt-2.5 text-[11px] text-muted-foreground">A general breed reference, not a target. Body condition in the next step matters more.</p>
              </> : <p className="text-xs leading-relaxed text-muted-foreground">
                {lifeStage === "puppy" || lifeStage === "kitten"
                  ? `${formData.petName.trim() || "Your pet"} is still growing, so we skip adult weight ranges. The body condition check comes next.`
                  : !lifeStage || !(Number(formData.weightKg) > 0)
                    ? `Add age and weight to see how ${petLabel} compares with the breed’s adult range.`
                    : "There’s no adult weight reference for this breed yet. The body condition check in the next step still works."}
              </p>}
            </div>
          </section>}
        </div>}
        {step === 2 && <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-orange-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-orange-950/20">
            <p className="text-sm text-stone-700 dark:text-stone-300">Gently feel and look at {petLabel}, then choose what fits best today. Weight alone is not used for this estimate.</p>
            <span className="w-fit shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-700 shadow-sm dark:bg-black/30 dark:text-orange-300">{bcsAnsweredCount} of 3 answered</span>
          </div>
          <Observation id={fieldId("ribsScore")} number={1} label="How easily can the ribs be felt?" value={formData.ribsScore} onChange={(value) => setObservation("ribsScore", value)} options={["Very easy / prominent", "Easy with a light covering", "Difficult under a heavy covering"]} error={errors.ribsScore} />
          <Observation id={fieldId("waistScore")} number={2} label="Waist visibility from above" value={formData.waistScore} onChange={(value) => setObservation("waistScore", value)} options={["Very pronounced", "Clearly visible", "Absent or rounded"]} error={errors.waistScore} />
          <Observation id={fieldId("tuckScore")} number={3} label="Abdominal tuck from the side" value={formData.tuckScore} onChange={(value) => setObservation("tuckScore", value)} options={["Severe tuck", "Visible tuck", "Little or no tuck"]} error={errors.tuckScore} />
          <div className="paw-field-glass rounded-2xl border p-5" aria-live="polite">
            {bcsAnswered ? <div className="paw-fade"><p className="text-xl font-bold capitalize">Estimated BCS {bcs}/9 · {status}</p><div className="mt-4"><BcsMeter score={bcs} compact /></div><p className="mt-4 text-sm">{STATUS_COPY[status].explanation} {STATUS_COPY[status].guidance}</p>{(bcs <= 2 || bcs >= 8) && <p className="mt-3 flex gap-2 text-sm font-semibold text-red-700"><AlertTriangle className="h-5 w-5 shrink-0" />Extreme scores should be reviewed promptly by a veterinarian.</p>}</div> : <><p className="font-semibold text-muted-foreground">Answer all three observations to calculate the BCS.</p><div className="mt-4"><BcsMeter compact /></div></>}
            <p className="mt-3 text-xs text-muted-foreground">Owner-provided screening estimate only; this is not a veterinary diagnosis.</p>
          </div>
        </div>}
        {step === 3 && <div className="space-y-5">
          <ChoiceGroup
            id={fieldId("foodType")}
            label="Food type"
            value={formData.foodType}
            onChange={(value) => set("foodType", value)}
            columns="grid-cols-2 sm:grid-cols-3"
            options={[
              { value: "commercial", label: "Packaged", hint: "Kibble or wet food", icon: <Package className="h-5 w-5" /> },
              { value: "home-cooked", label: "Home-cooked", hint: "Made in your kitchen", icon: <CookingPot className="h-5 w-5" /> },
              { value: "mixed", label: "Mixed", hint: "Some of both", icon: <Shuffle className="h-5 w-5" /> },
              { value: "raw", label: "Raw", hint: "Raw meat based", icon: <Beef className="h-5 w-5" /> },
              { value: "other", label: "Other", hint: "Something else", icon: <Sparkles className="h-5 w-5" /> },
            ]}
          />
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <InputField id={fieldId("foodBrand")} label="Food brand or recipe" placeholder={formData.foodType === "home-cooked" ? "e.g. rice, chicken and carrots" : "e.g. Royal Canin Maxi Adult"} value={formData.foodBrand} onChange={(value) => set("foodBrand", value)} optional />
            <InputField id={fieldId("dailyQuantity")} label="Total food per day" placeholder="e.g. 450 g or 3 cups" value={formData.dailyQuantity} onChange={(value) => set("dailyQuantity", value)} hint="All meals together; treats are counted separately." error={errors.dailyQuantity} />
            <StepperField id={fieldId("dailyMeals")} label="Meals per day" value={formData.dailyMeals} onChange={(value) => set("dailyMeals", value)} min={1} max={8} error={errors.dailyMeals} />
            <StepperField id={fieldId("treatsPerDay")} label="Treats per day" value={formData.treatsPerDay} onChange={(value) => set("treatsPerDay", value)} min={0} max={30} error={errors.treatsPerDay} />
            <InputField id={fieldId("mealDays")} label="Feeding-plan duration" type="number" inputMode="numeric" min="1" step="1" suffix="days" value={formData.mealDays} onChange={(value) => set("mealDays", value)} error={errors.mealDays}>
              <QuickPicks label="Plan duration" options={["7", "14", "30", "60", "90"]} format={(days) => `${days} days`} isActive={(days) => formData.mealDays === days} onPick={(days) => set("mealDays", days)} />
            </InputField>
            <Toggle label="Feeding reminders" hint="Remind me to review and log feeding regularly." checked={formData.reminders} onChange={(value) => set("reminders", value)} />
            <TextField id={fieldId("allergies")} label="Allergies" placeholder="Tap common ones or type your own" value={formData.allergies} onChange={(value) => set("allergies", value)} picks={["Chicken", "Beef", "Wheat", "Dairy", "Soy", "Egg", "Fish"]} />
            <TextField id={fieldId("medicalConditions")} label="Known medical conditions" placeholder="Kidney disease, skin issues, diabetes, etc." value={formData.medicalConditions} onChange={(value) => set("medicalConditions", value)} picks={["Skin issues", "Sensitive stomach", "Joint pain", "Kidney", "Diabetes"]} />
            <TextField id={fieldId("foodDislikes")} label="Food dislikes" placeholder="Foods your pet refuses or avoids." value={formData.foodDislikes} onChange={(value) => set("foodDislikes", value)} />
            <TextField id={fieldId("feedingConcerns")} label="Other feeding concerns" placeholder="Vomiting, loose stools, picky eating, appetite changes, etc." value={formData.feedingConcerns} onChange={(value) => set("feedingConcerns", value)} picks={["Picky eating", "Eats too fast", "Vomiting", "Loose stools", "Begs a lot"]} />
          </div>
        </div>}
        </div>
      </CardContent>
      <CardFooter className="flex gap-3 border-t border-border/40 p-7 md:p-10">
        {step > 0 && <Button type="button" variant="ghost" className="paw-field-glass h-14 rounded-xl border px-5" onClick={previous}><ChevronLeft /> Back</Button>}
        <Button type="button" className="paw-cta h-14 flex-1 rounded-xl font-bold text-white hover:text-white" disabled={loading} onClick={step === steps.length - 1 ? submit : next}>{loading ? <><Loader2 className="animate-spin" /> Saving assessment…</> : step === steps.length - 1 ? <>Create {formData.petName.trim() ? `${formData.petName.trim()}’s` : "wellness"} report <CheckCircle2 /></> : <><span className="truncate">Next: {steps[step + 1].title}</span> <ChevronRight /></>}</Button>
      </CardFooter>
    </Card>
    <SupervisionCard />
  </div>
}

const FieldError = ({ id, message }: { id?: string; message: string }) => (
  <p id={id} className="flex items-start gap-1.5 text-xs font-medium leading-relaxed text-red-600 duration-200 animate-in fade-in slide-in-from-top-1 dark:text-red-400">
    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
    {message}
  </p>
)

const Field = ({
  id,
  label,
  children,
  optional = false,
  hint,
  error,
}: {
  id?: string
  label: string
  children: React.ReactNode
  optional?: boolean
  hint?: string
  error?: string
}) => (
  <div className="pet-feed-field min-w-0 scroll-mt-28 space-y-2">
    <div className="flex min-h-5 items-center justify-between gap-2">
      <Label htmlFor={id} className="text-sm font-semibold leading-none text-foreground">{label}</Label>
      {optional && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Optional
        </span>
      )}
    </div>
    {children}
    {error ? <FieldError id={id && `${id}-error`} message={error} /> : hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
  </div>
)

const InputField = ({
  id,
  label,
  value,
  onChange,
  optional = false,
  hint,
  error,
  suffix,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "children"> & {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
  hint?: string
  error?: string
  /** Unit shown inside the field, e.g. "kg" */
  suffix?: string
  /** Extras under the input, e.g. quick picks */
  children?: React.ReactNode
}) => (
  <Field id={id} label={label} optional={optional} hint={hint} error={error}>
    <div className="relative">
      <Input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${controlClass} ${suffix ? "pr-16" : ""} ${props.readOnly ? "cursor-default" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">{suffix}</span>}
    </div>
    {children}
  </Field>
)

type Choice<T extends string> = { value: T; label: string; hint?: string; icon?: React.ReactNode }

/** Big tappable radio cards (or compact pills) instead of a dropdown, for short lists. */
function ChoiceGroup<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  columns = "grid-cols-3",
  compact = false,
}: {
  id: string
  label: string
  value: T
  onChange: (value: T) => void
  options: Choice<T>[]
  columns?: string
  compact?: boolean
}) {
  return (
    <fieldset id={id} className="pet-feed-field min-w-0 scroll-mt-28">
      <legend className="mb-2 text-sm font-semibold leading-none text-foreground">{label}</legend>
      <div className={`grid gap-2 ${columns}`}>
        {options.map((option) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              data-selected={checked}
              className={`paw-field-glass relative flex cursor-pointer items-center gap-3 rounded-xl border ${compact ? "h-14 justify-center px-2 text-center" : "min-h-16 p-3"}`}
            >
              <input type="radio" name={id} value={option.value} checked={checked} onChange={() => onChange(option.value)} className="sr-only" />
              {option.icon && (
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ease-[var(--pf-ease)] ${checked ? "scale-105 bg-orange-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_14px_-6px_rgba(249,115,22,0.6)]" : "bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-300"}`}>
                  {option.icon}
                </span>
              )}
              <span className={`min-w-0 ${compact ? "" : "pr-5"}`}>
                <span className={`block text-sm font-semibold ${checked ? "text-orange-950 dark:text-orange-100" : "text-foreground"}`}>{option.label}</span>
                {option.hint && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{option.hint}</span>}
              </span>
              {checked && !compact && (
                <span aria-hidden className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white duration-200 animate-in zoom-in-50">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Age number with its unit beside it, so "3" and "years" are read together. */
const AgeField = ({
  id,
  value,
  unit,
  onChange,
  onUnitChange,
  hint,
  error,
}: {
  id: string
  value: string
  unit: FormData["ageUnit"]
  onChange: (value: string) => void
  onUnitChange: (unit: FormData["ageUnit"]) => void
  hint?: string
  error?: string
}) => (
  <Field id={id} label="Age" hint={hint} error={error}>
    <div className="flex gap-2">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min="0.1"
        step="0.1"
        placeholder="0"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${controlClass} min-w-0 flex-1`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div role="radiogroup" aria-label="Age unit" className="paw-field-glass flex h-14 shrink-0 gap-1 rounded-xl border p-1">
        {(["years", "months"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={unit === option}
            onClick={() => onUnitChange(option)}
            className={`rounded-lg px-3 text-sm font-semibold capitalize transition-all duration-300 ease-[var(--pf-ease)] ${unit === option ? "bg-orange-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_14px_-6px_rgba(249,115,22,0.6)]" : "text-muted-foreground hover:bg-orange-500/10 hover:text-foreground"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  </Field>
)

/** A whole number with − / + buttons, for small counts like meals and treats. */
const StepperField = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  min: number
  max: number
  error?: string
}) => {
  const count = Number(value) || 0
  const change = (next: number) => onChange(String(Math.min(max, Math.max(min, next))))
  const stepButton = "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 transition hover:bg-orange-100 active:scale-90 disabled:pointer-events-none disabled:opacity-35 dark:bg-orange-950/40 dark:text-orange-300"
  return (
    <Field id={id} label={label} error={error}>
      <div data-invalid={error ? true : undefined} className="paw-field-glass flex h-14 items-center gap-2 rounded-xl border px-1.5">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={count <= min} onClick={() => change(count - 1)} className={stepButton}>
          <Minus className="h-4 w-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent text-center text-lg font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={count >= max} onClick={() => change(count + 1)} className={stepButton}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </Field>
  )
}

const QuickPicks = ({
  label,
  options,
  isActive,
  onPick,
  format = (option) => option,
}: {
  label: string
  options: string[]
  isActive: (option: string) => boolean
  onPick: (option: string) => void
  format?: (option: string) => string
}) => (
  <div role="group" aria-label={`Quick picks: ${label}`} className="flex flex-wrap gap-1.5">
    {options.map((option) => {
      const active = isActive(option)
      return (
        <button key={option} type="button" aria-pressed={active} onClick={() => onPick(option)} className={chipClass(active)}>
          {active && <Check className="-ml-0.5 mr-1 inline h-3 w-3" />}
          {format(option)}
        </button>
      )
    })}
  </div>
)

const BreedPhoto = ({
  breed,
  petType,
  className,
}: {
  breed: BreedReference
  petType: PetType
  className: string
}) => {
  // Remembering which photo failed (rather than a flag) resets it when the breed changes.
  const source = getBreedImageSource(petType, breed)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const failed = source !== null && failedSource === source
  const initials = breed.name
    .split(/[\s/-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`}>
      {source && !failed ? (
        // Verified local assets only; lazy loading keeps the 100-row picker light.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source}
          alt={`${breed.name} breed`}
          title={breed.thumbnail ? undefined : "Photo: Wikipedia / Wikimedia Commons"}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <span
          aria-label={`${breed.name} breed placeholder`}
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50 text-orange-700 dark:from-orange-950/35 dark:via-amber-950/25 dark:to-emerald-950/20 dark:text-orange-300"
        >
          <span className="flex flex-col items-center justify-center leading-none">
            <span className="text-[11px] font-black tracking-tight">{initials || "PET"}</span>
            <PawPrint className="mt-1 h-3.5 w-3.5 opacity-70" />
          </span>
        </span>
      )}
    </span>
  )
}

const BreedSelectField = ({
  id,
  label,
  value,
  onChange,
  breeds,
  petType,
  placeholder,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  breeds: BreedReference[]
  petType: PetType
  placeholder?: string
  error?: string
}) => {
  const [open, setOpen] = useState(false)
  const selected = breeds.find((breed) => breed.name === value)
  const groups = Array.from(new Set(breeds.map((breed) => breed.group)))

  return (
    <Field id={id} label={label} error={error}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${controlClass} justify-between overflow-hidden pr-3 font-normal`}
          >
            {selected ? (
              <span className="flex min-w-0 items-center gap-3">
                <BreedPhoto
                  breed={selected}
                  petType={petType}
                  className="h-9 w-12 rounded-lg border border-white/70 shadow-sm dark:border-white/10"
                />
                <span className="truncate">{selected.name}</span>
              </span>
            ) : (
              <span className="truncate text-muted-foreground">{placeholder ?? "Select breed"}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[var(--radix-popover-trigger-width)] gap-0 p-0"
        >
          <Command>
            <CommandInput placeholder={`Search ${breeds.length} breeds...`} />
            <CommandList className="max-h-80">
              <CommandEmpty>No matching breed found.</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group} heading={group}>
                  {breeds
                    .filter((breed) => breed.group === group)
                    .map((breed) => (
                      <CommandItem
                        key={breed.name}
                        value={breed.name}
                        data-checked={value === breed.name}
                        onSelect={() => {
                          onChange(breed.name)
                          setOpen(false)
                        }}
                        className="min-h-14 py-2"
                      >
                        <BreedPhoto
                          breed={breed}
                          petType={petType}
                          className="h-11 w-14 rounded-lg border border-border/60 shadow-sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{breed.name}</span>
                          <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                            {breed.group}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
            <div className="border-t border-border/60 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
              Breed-matched photos use verified local PawSattva assets first, then validated Wikipedia/Wikimedia thumbnails.
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </Field>
  )
}

const TextField = ({
  id,
  label,
  value,
  onChange,
  optional = true,
  placeholder,
  picks,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
  placeholder?: string
  /** Common answers that can be tapped in and out of the comma-separated text */
  picks?: string[]
}) => (
  <Field id={id} label={label} optional={optional}>
    {picks && <QuickPicks label={label} options={picks} isActive={(pick) => hasToken(value, pick)} onPick={(pick) => onChange(toggleToken(value, pick))} />}
    <Textarea
      id={id}
      className={textareaClass}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </Field>
)

const ConsentCheckbox = ({
  checked,
  onCheckedChange,
  label,
  description,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  description: string
}) => (
  <label data-selected={checked} className="pet-feed-field paw-field-glass group flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      className="mt-0.5 size-5 rounded-md border-orange-200 data-checked:border-orange-500 data-checked:bg-orange-500"
    />
    <span className="min-w-0">
      <span className="block text-sm font-semibold leading-snug text-foreground">{label}</span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
    </span>
  </label>
)

const Toggle = ({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  hint?: string
}) => (
  <label data-selected={checked} className="pet-feed-field paw-field-glass flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3">
    <span className="min-w-0">
      <span className="block text-sm font-semibold leading-none text-foreground">{label}</span>
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>}
    </span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
)

/** Where the weight sits against the breed's adult range (the green band), on a scale of half the minimum to 1.5× the maximum. */
function WeightRangeBar({ min, max, position }: { min: number; max: number; position: number }) {
  const domainMin = Math.max(0, min * 0.5)
  const domainMax = max * 1.5
  const at = (kg: number) => ((kg - domainMin) / (domainMax - domainMin)) * 100
  return (
    <div className="relative h-2.5 rounded-full bg-gradient-to-r from-sky-200 via-emerald-200 to-amber-200 dark:from-sky-900/60 dark:via-emerald-900/60 dark:to-amber-900/60">
      <div className="absolute inset-y-0 rounded-full bg-emerald-400/70 dark:bg-emerald-500/60" style={{ left: `${at(min)}%`, right: `${100 - at(max)}%` }} />
      <div
        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-orange-500 shadow-md transition-[left] duration-500 ease-out dark:border-zinc-900"
        style={{ left: `${position}%` }}
      >
        <span className="sr-only">Current weight position</span>
      </div>
    </div>
  )
}

function BcsMeter({ score, compact = false }: { score?: number; compact?: boolean }) { return <div className={compact ? "" : "rounded-2xl bg-white p-4"}><div className="mb-2 grid grid-cols-4 text-center text-[10px] font-bold sm:text-xs"><span>Underweight</span><span>Ideal</span><span>Overweight</span><span>Obese</span></div><div className="grid grid-cols-9 gap-1">{Array.from({ length: 9 }, (_, index) => index + 1).map((value) => <div key={value} aria-current={value === score ? "true" : undefined} className={`rounded-lg py-2 text-center text-xs font-bold sm:text-sm ${value === score ? "scale-110 ring-4 ring-orange-600 ring-offset-2" : score === undefined ? "opacity-65" : ""} ${value <= 3 ? "bg-sky-200 text-sky-950" : value <= 5 ? "bg-emerald-300 text-emerald-950" : value <= 7 ? "bg-amber-300 text-amber-950" : "bg-red-300 text-red-950"}`}>{value}</div>)}</div></div> }

function WellnessReport({ data, onReset }: { data: PetFeed; onReset: () => void }) {
  const status = data.weightStatus ?? "ideal"; const assessed = data.assessedAt ? new Date(data.assessedAt) : new Date()
  const dietPlan = getDietPlan(status)
  return <div className="space-y-6">
    <article className="wellness-report overflow-hidden rounded-[2rem] bg-[#faf6e9] text-stone-800 shadow-xl">
      <header className="bg-[#173f2c] p-7 text-white md:p-10"><div className="flex items-center gap-3"><PawPrint className="h-9 w-9" /><div><h2 className="text-3xl font-black">Paw Sattva</h2><p className="text-sm text-amber-100">Wellness · Balance · Harmony</p></div></div><p className="mt-6 text-xl font-bold capitalize">{data.lifeStage} wellness report</p><p className="text-sm text-white/75">Assessment date: {assessed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></header>
      <div className="grid gap-5 p-6 md:grid-cols-2 md:p-10">
        <ReportCard title="Pet summary"><ReportGrid items={[["Pet", data.petName], ["Breed", data.petBreed], ["Age", `${data.ageValue} ${data.ageUnit}`], ["Pet parent", data.name], ["Type", data.petType], ["Sex", data.sex], ["Spayed/neutered", data.neutered ? "Yes" : "No"], ["Shoulder height", data.heightCm ? `${data.heightCm} cm` : "Not recorded"]]} /></ReportCard>
        <ReportCard title="Key metrics"><ReportGrid items={[["Current weight", `${data.weightKg} kg`], ["General adult weight reference", data.breedReferenceRange ?? "Not available"], ["General adult height reference", data.breedHeightReferenceRange ?? "Not available"], ["Body Condition Score", `${data.bodyConditionScore}/9`], ["Classification", status], ["Activity", data.activityLevel]]} /><p className="mt-3 text-xs text-stone-500">Adult breed ranges are informational, not guaranteed ideal weight or height values.</p></ReportCard>
        <ReportCard title="Condition summary"><p className="text-2xl font-black capitalize text-emerald-900">{status}</p><p className="mt-2 text-sm">{STATUS_COPY[status].explanation}</p><p className="mt-3 text-sm font-semibold">{STATUS_COPY[status].guidance}</p>{(data.bodyConditionScore! <= 2 || data.bodyConditionScore! >= 8 || data.medicalConditions || data.dietaryConcerns) && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Veterinary review is recommended for extreme BCS, sudden weight change, medical conditions, or feeding concerns.</p>}</ReportCard>
        <ReportCard title="Body condition meter"><BcsMeter score={data.bodyConditionScore ?? 5} /><div className="mt-2 flex justify-between text-xs"><span>1: Too thin</span><span>4–5: Ideal</span><span>9: Obese</span></div></ReportCard>
        <ReportCard title="Feeding snapshot"><ReportGrid items={[["Food type", data.foodType], ["Brand/recipe", data.foodBrand || "Not provided"], ["Meals/day", data.dailyMeals], ["Daily quantity", data.dailyQuantity], ["Treats/day", data.treatsPerDay], ["Concerns", data.dietaryConcerns || "None reported"], ["Plan duration", `${data.mealDays} days`]]} /></ReportCard>
        <ReportCard title="Growth history"><p className="text-sm">Baseline recorded: <strong>{data.weightKg} kg</strong> on {assessed.toLocaleDateString("en-IN")}.</p><p className="mt-3 text-sm text-stone-600">This is the first real measurement. A growth curve will appear after future check-ins; no earlier weights have been invented.</p></ReportCard>
      </div>
      <footer className="border-t border-emerald-900/10 p-6 text-center text-xs text-stone-600 md:px-10">This owner-provided report is an informational screening estimate, not a veterinary diagnosis. It does not provide medical treatment instructions.</footer>
    </article>
    <Card className="overflow-hidden rounded-[2rem] border-orange-200 bg-gradient-to-br from-white via-orange-50 to-emerald-50 shadow-xl">
      <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">Diet next step</p>
          <h2 className="mt-2 text-2xl font-black text-emerald-950">{dietPlan.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-700">{dietPlan.description}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {dietPlan.points.map((point) => (
              <div key={point} className="rounded-2xl border border-white bg-white/80 p-4 text-sm font-semibold text-stone-700 shadow-sm">
                {point}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-emerald-900/5 p-4 text-sm font-semibold text-emerald-950">
            Initial pet diet guidance can be offered free for early users. Later, Paw Sattva can move detailed diet plans and follow-ups into subscription plans.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 md:min-w-64">
          <Button asChild className="h-12 rounded-xl bg-[#173f2c]">
            <Link href={`/consultation?pet=${encodeURIComponent(data.petName)}&status=${encodeURIComponent(status)}`}>
              <Stethoscope /> Ask for diet consultation
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl bg-white/70">
            <Link href="/pet-feed">Log food and track again</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
    <div className="flex flex-col gap-3 sm:flex-row"><Button className="h-12 flex-1 rounded-xl bg-[#173f2c]" onClick={() => window.print()}><Printer /> Print or save report as PDF</Button><Button className="h-12 rounded-xl" variant="outline" onClick={onReset}><CheckCircle2 /> Assess another pet</Button></div>
    <SupervisionCard />
  </div>
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-emerald-900/10 bg-white p-5"><h3 className="mb-4 text-lg font-black text-emerald-950">{title}</h3>{children}</section> }
function ReportGrid({ items }: { items: [string, unknown][] }) { return <dl className="grid grid-cols-2 gap-3">{items.map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 text-sm font-semibold capitalize">{String(value ?? "Not provided")}</dd></div>)}</dl> }
function getDietPlan(status: PetFeed["weightStatus"]) {
  if (status === "underweight") {
    return {
      title: "Weight-gain diet review recommended",
      description: "The report suggests your pet may need a carefully planned weight-gain diet. We can use the saved pet profile, food history, allergies, medical notes and feeding routine so you do not have to repeat the same history during consultation.",
      points: ["Check appetite and health history", "Plan safe calories and protein", "Track weight-gain progress"],
    }
  }
  if (status === "overweight" || status === "obese") {
    return {
      title: status === "obese" ? "Weight-loss diet support is important" : "Weight-management diet support is recommended",
      description: "The report suggests extra body covering. Paw Sattva can guide a portion-aware diet discussion using your existing assessment details, then move into reminders and food logging for follow-up.",
      points: ["Reduce excess calories safely", "Review treats and meal portions", "Monitor BCS over time"],
    }
  }
  return {
    title: "Maintenance diet support can keep progress steady",
    description: "The report looks balanced today. A maintenance plan can keep meals consistent and use future food logs to spot changes early.",
    points: ["Maintain routine", "Log food changes", "Review monthly progress"],
  }
}

function SupervisionCard() { return <Card className="rounded-[2rem] border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50"><CardContent className="p-7 md:p-9"><p className="text-sm font-bold uppercase tracking-widest text-amber-700">Optional support</p><h2 className="mt-2 text-2xl font-black text-emerald-950">Need ongoing pet wellness supervision?</h2><p className="mt-3 max-w-2xl text-sm text-stone-700">Supervision can include diet consultation, progress check-ins, weight and BCS tracking, feeding-record reviews, and updated reports.</p><p className="mt-5 text-xl font-black text-emerald-900">Initial diet help can be free for early users; subscription plans can follow later.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Button asChild className="rounded-xl bg-[#173f2c]"><Link href="/consultation">Open consultation page</Link></Button><Button asChild variant="outline" className="rounded-xl bg-white/70"><a href="https://instagram.com/pawsattva" target="_blank" rel="noreferrer">Enquire on Instagram</a></Button></div></CardContent></Card> }
