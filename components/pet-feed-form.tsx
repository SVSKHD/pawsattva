"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { deletePetFeedDraft, getPetFeedDraft, getUserProfile, PetFeed, savePetFeed, savePetFeedDraft } from "@/firebase/firestore"
import { BREEDS, PetType, STATUS_COPY, calculateBcs, getBreed, getLifeStage, getWeightContext, getWeightStatus } from "@/lib/pet-wellness"
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Dog, Loader2, PawPrint, Printer, Stethoscope, User, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

const DRAFT_KEY = "pawsattva.pet-feed.wellness.v2"
const STEP_KEY = `${DRAFT_KEY}.step`

const initialData = {
  name: "", phone: "", petName: "", petType: "Dog" as PetType, petBreed: "", ageValue: "", ageUnit: "years" as "months" | "years",
  sex: "unknown" as "male" | "female" | "unknown", neutered: false, weightKg: "", heightCm: "", activityLevel: "moderate" as "low" | "moderate" | "high",
  ribsScore: 0, waistScore: 0, tuckScore: 0, bcsAssessmentStarted: false, foodType: "commercial" as "commercial" | "home-cooked" | "mixed" | "raw" | "other",
  foodBrand: "", dailyMeals: "2", dailyQuantity: "", treatsPerDay: "0", allergies: "", medicalConditions: "", foodDislikes: "",
  feedingConcerns: "", mealDays: "30", reminders: false, subscribe: true,
}

type FormData = typeof initialData
const controlClass = "!h-14 w-full rounded-xl border border-orange-100/80 bg-white/85 px-4 text-base shadow-sm transition-colors placeholder:text-muted-foreground/55 focus-visible:border-orange-300 focus-visible:ring-2 focus-visible:ring-orange-500/20 dark:border-orange-900/35 dark:bg-black/25"
const textareaClass = "min-h-28 w-full resize-y rounded-xl border border-orange-100/80 bg-white/85 p-4 text-base shadow-sm transition-colors placeholder:text-muted-foreground/55 focus-visible:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 dark:border-orange-900/35 dark:bg-black/25"
const steps = [
  { title: "Pet Parent", description: "About you", icon: User },
  { title: "Pet Profile", description: "Your companion", icon: Dog },
  { title: "Body Condition", description: "Live BCS estimate", icon: PawPrint },
  { title: "Feeding Details", description: "Daily routine", icon: UtensilsCrossed },
]

const Observation = ({ id, label, value, onChange, options }: { id: string; label: string; value: number; onChange: (value: number) => void; options: string[] }) => (
  <fieldset className="space-y-3 rounded-2xl border border-orange-100/70 bg-white/70 p-4 shadow-sm dark:border-orange-900/20 dark:bg-black/20">
    <legend className="px-1 font-semibold text-foreground">{label}</legend>
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option, index) => {
        const score = index === 0 ? 2 : index === 1 ? 5 : 8
        return <label key={option} className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${value === score ? "border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100" : "border-border bg-background/60"}`}>
          <input className="mr-2" type="radio" name={id} checked={value === score} onChange={() => onChange(score)} />{option}
        </label>
      })}
    </div>
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
  const [draftStatus, setDraftStatus] = useState<"local" | "saving" | "saved">("local")

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
      setFormData({ ...initialData, ...draft.data } as FormData)
      if (draft.step >= 0 && draft.step < steps.length) setStep(draft.step)
      setDraftStatus("saved")
      toast.info("Your saved Pet Feed assessment has been resumed.")
    }).catch((error) => console.error("Unable to resume Pet Feed draft:", error))
      .finally(() => { if (active) setAccountDraftReady(true) })
    return () => { active = false }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    let active = true

    getUserProfile(user.uid)
      .then((profile) => {
        if (!active) return
        const profileName = profile?.displayName || user.displayName || ""
        const profilePhone = profile?.phone || user.phoneNumber || ""

        setFormData((current) => ({
          ...current,
          name: current.name || profileName,
          phone: current.phone || profilePhone,
        }))
      })
      .catch((error) => {
        console.error("Unable to prefill Pet Care profile:", error)
        if (active && user.displayName) {
          setFormData((current) => current.name ? current : { ...current, name: user.displayName ?? "" })
        }
      })

    return () => { active = false }
  }, [user?.displayName, user?.phoneNumber, user?.uid])

  useEffect(() => {
    if (!submitted) { localStorage.setItem(DRAFT_KEY, JSON.stringify(formData)); localStorage.setItem(STEP_KEY, String(step)) }
  }, [formData, step, submitted])

  useEffect(() => {
    if (!draftReady || !accountDraftReady || submitted || !user?.uid) return
    setDraftStatus("saving")
    const timer = window.setTimeout(() => {
      savePetFeedDraft(user.uid, { data: formData, step })
        .then(() => setDraftStatus("saved"))
        .catch((error) => { setDraftStatus("local"); console.error("Unable to save Pet Feed draft:", error) })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [accountDraftReady, draftReady, formData, step, submitted, user?.uid])

  const selectedBreed = useMemo(() => formData.petBreed ? getBreed(formData.petType, formData.petBreed) : null, [formData.petBreed, formData.petType])
  const ageMonths = formData.ageValue && Number(formData.ageValue) > 0
    ? (formData.ageUnit === "years" ? Number(formData.ageValue) * 12 : Number(formData.ageValue))
    : null
  const lifeStage = ageMonths ? getLifeStage(formData.petType, ageMonths) : null
  const weightContext = getWeightContext(Number(formData.weightKg), selectedBreed?.adultWeightRange)
  const bcsAnswered = formData.bcsAssessmentStarted && formData.ribsScore > 0 && formData.waistScore > 0 && formData.tuckScore > 0
  const bcs = calculateBcs(formData.ribsScore, formData.waistScore, formData.tuckScore)
  const status = getWeightStatus(bcs)
  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setFormData((current) => ({ ...current, [key]: value }))
  const setObservation = (key: "ribsScore" | "waistScore" | "tuckScore", value: number) =>
    setFormData((current) => ({ ...current, [key]: value, bcsAssessmentStarted: true }))

  const validateStep = () => {
    if (step === 0 && (!formData.name.trim() || !/^\+?[0-9 ()-]{7,20}$/.test(formData.phone))) return "Enter a full name and valid phone number."
    if (step === 1 && (!formData.petName.trim() || !formData.petBreed || Number(formData.ageValue) <= 0 || Number(formData.weightKg) <= 0 || (formData.heightCm !== "" && Number(formData.heightCm) <= 0))) return "Complete the pet profile with valid positive age and weight values. Height must be positive when provided."
    if (step === 2 && !bcsAnswered) return "Answer all three body-condition questions to calculate the BCS."
    if (step === 3 && (Number(formData.dailyMeals) <= 0 || Number(formData.treatsPerDay) < 0 || Number(formData.mealDays) <= 0 || !formData.dailyQuantity.trim())) return "Enter valid feeding values; negative or empty numeric values are not allowed."
    return null
  }

  const next = () => { const error = validateStep(); if (error) return toast.error(error); setStep((current) => Math.min(3, current + 1)) }

  const submit = async () => {
    const error = validateStep(); if (error) return toast.error(error)
    setLoading(true)
    try {
      const ageValue = Number(formData.ageValue)
      const ageMonths = formData.ageUnit === "years" ? Math.round(ageValue * 12) : Math.round(ageValue)
      const assessedAt = new Date().toISOString()
      const dietaryConcerns = [formData.allergies && `Allergies: ${formData.allergies}`, formData.medicalConditions && `Medical: ${formData.medicalConditions}`, formData.foodDislikes && `Dislikes: ${formData.foodDislikes}`, formData.feedingConcerns].filter(Boolean).join(" · ")
      const payload: PetFeed = {
        userId: user?.uid, name: formData.name.trim(), phone: formData.phone.trim(), petName: formData.petName.trim(), petType: formData.petType,
        petBreed: formData.petBreed, ageValue, ageUnit: formData.ageUnit, ageMonths, lifeStage: getLifeStage(formData.petType, ageMonths), sex: formData.sex,
        neutered: formData.neutered, weightKg: Number(formData.weightKg), heightCm: formData.heightCm ? Number(formData.heightCm) : undefined, activityLevel: formData.activityLevel, breedImageUrl: selectedBreed?.imageUrl,
        breedReferenceRange: selectedBreed?.adultWeightRange, breedHeightReferenceRange: selectedBreed?.adultHeightRange, ribsScore: formData.ribsScore, waistScore: formData.waistScore, tuckScore: formData.tuckScore,
        bodyConditionScore: bcs, weightStatus: status, foodType: formData.foodType, foodBrand: formData.foodBrand.trim(), dailyMeals: Number(formData.dailyMeals),
        dailyQuantity: formData.dailyQuantity.trim(), treatsPerDay: Number(formData.treatsPerDay), allergies: formData.allergies.trim(), medicalConditions: formData.medicalConditions.trim(),
        foodDislikes: formData.foodDislikes.trim(), dietaryConcerns, mealDays: Number(formData.mealDays), reminders: formData.reminders, subscribe: formData.subscribe,
        assessmentVersion: "bcs-owner-v1", assessedAt,
      }
      await savePetFeed(payload)
      if (user?.uid) await deletePetFeedDraft(user.uid)
      localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(STEP_KEY)
      setSubmitted(payload); toast.success("Wellness assessment saved.")
    } catch (cause) { console.error(cause); toast.error("Unable to save the assessment. Please try again.") } finally { setLoading(false) }
  }

  if (submitted) return <WellnessReport data={submitted} onReset={() => { setSubmitted(null); setStep(0); setFormData({ ...initialData, name: user?.displayName ?? "" }) }} />

  return <div className="space-y-6">
    <Card className="overflow-hidden rounded-[2.5rem] border-white/40 bg-white/60 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/40">
      <CardHeader className="p-7 pb-2 text-center md:p-10 md:pb-2">
        <div className="relative mb-8 flex items-start justify-between" aria-label={`Step ${step + 1} of 4`}>
          <div className="absolute left-[10%] right-[10%] top-5 h-0.5 bg-muted" />
          {steps.map((item, index) => {
            const Icon = item.icon
            const active = index <= step
            return <button type="button" key={item.title} onClick={() => index < step && setStep(index)} disabled={index > step} className="relative z-10 flex w-1/4 flex-col items-center gap-2 disabled:cursor-default">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${active ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/25" : "border-muted bg-background text-muted-foreground"} ${index === step ? "scale-110 ring-4 ring-orange-500/15" : ""}`}><Icon className="h-5 w-5" /></span>
              <span className={`hidden text-[10px] font-bold uppercase tracking-wider sm:block ${active ? "text-orange-600" : "text-muted-foreground"}`}>{item.title}</span>
            </button>
          })}
        </div>
        <CardTitle className="text-3xl font-black tracking-tight">{steps[step].title}</CardTitle>
        <p className="text-sm text-muted-foreground">{steps[step].description}</p>
        <p className="mt-2 text-xs font-medium text-muted-foreground" aria-live="polite">{user ? (draftStatus === "saving" ? "Saving your progress…" : draftStatus === "saved" ? "Progress saved to your account" : "Progress saved on this device") : "Progress saved on this device · Sign in to resume on another device"}</p>
      </CardHeader>
      <CardContent className="space-y-5 p-7 md:p-10">
        {step === 0 && <div className="grid items-end gap-5 sm:grid-cols-2">
          <InputField label="Pet parent’s full name" value={formData.name} onChange={(value) => set("name", value)} autoComplete="name" />
          <InputField label="Phone number" type="tel" value={formData.phone} onChange={(value) => set("phone", value)} autoComplete="tel" />
        </div>}
        {step === 1 && <div className="space-y-5">
          <div className="grid items-end gap-5 sm:grid-cols-2">
            <InputField label="Pet name" value={formData.petName} onChange={(value) => set("petName", value)} />
            <SelectField label="Pet type" value={formData.petType} onChange={(value) => { set("petType", value as PetType); set("petBreed", "") }} options={[["Dog", "Dog"], ["Cat", "Cat"]]} />
            <SelectField label="Breed" value={formData.petBreed} onChange={(value) => set("petBreed", value)} placeholder="Select breed" options={BREEDS[formData.petType].map((breed) => [breed.name, breed.name])} />
            <InputField label="Age" type="number" min="0.1" step="0.1" value={formData.ageValue} onChange={(value) => set("ageValue", value)} />
            <SelectField label="Age unit" value={formData.ageUnit} onChange={(value) => set("ageUnit", value as FormData["ageUnit"])} options={[["months", "Months"], ["years", "Years"]]} />
            <SelectField label="Sex" value={formData.sex} onChange={(value) => set("sex", value as FormData["sex"])} options={[["male", "Male"], ["female", "Female"], ["unknown", "Unknown"]]} />
            <InputField label="Current weight (kg)" type="number" min="0.1" step="0.1" value={formData.weightKg} onChange={(value) => set("weightKg", value)} />
            <InputField label="Height at shoulder (cm)" type="number" min="0.1" step="0.1" value={formData.heightCm} onChange={(value) => set("heightCm", value)} optional hint="Helpful for larger breeds, but not required for the report." />
            <SelectField label="Activity level" value={formData.activityLevel} onChange={(value) => set("activityLevel", value as FormData["activityLevel"])} options={[["low", "Low"], ["moderate", "Moderate"], ["high", "High"]]} />
            <Toggle label="Spayed/neutered" checked={formData.neutered} onChange={(value) => set("neutered", value)} />
          </div>
          {selectedBreed && <div className="grid overflow-hidden rounded-2xl border border-orange-100/70 bg-white/75 shadow-sm sm:grid-cols-[180px_1fr] dark:border-orange-900/20 dark:bg-black/20">
            <Image src={selectedBreed.imageUrl} alt={`${selectedBreed.name} breed reference`} width={360} height={176} className="h-44 w-full object-cover" />
            <div className="p-5"><div className="flex flex-wrap items-center gap-2"><p className="text-xl font-black text-foreground">{selectedBreed.name}</p><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">References filled automatically</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">General adult weight</p><p className="mt-1 text-sm font-bold">{selectedBreed.adultWeightRange ?? "Not available"}</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">General adult shoulder height</p><p className="mt-1 text-sm font-bold">{selectedBreed.adultHeightRange ?? "Not available"}</p></div></div><p className="mt-3 text-xs text-muted-foreground">These are general adult references—not your pet’s current measurements, diagnostic targets, or guaranteed ideal values. Enter measured weight and optional height above.</p></div>
          </div>}
          {selectedBreed && <div className="rounded-2xl border border-orange-200 bg-white/90 p-4 shadow-lg dark:border-orange-900/40 dark:bg-black/30">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Dynamic wellness context</p><p className="text-xl font-black capitalize">{lifeStage ? `${lifeStage} · ${formData.weightKg || "—"} kg` : "Enter age and weight"}</p></div>
              <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">Updates instantly</span>
            </div>
            {weightContext && lifeStage && (lifeStage === "adult" || lifeStage === "senior") ? <div className="mb-5 rounded-xl bg-muted/50 p-3">
              <div className="mb-3 flex flex-col justify-between gap-1 text-xs font-semibold sm:flex-row"><span className="text-base font-black text-foreground">{weightContext.label}</span><span>Current {formData.weightKg} kg · Adult reference {weightContext.min}–{weightContext.max} kg</span></div>
              <WeightReferenceMeter score={weightContext.meterScore} />
              <p className="mt-3 text-[11px] text-muted-foreground">This meter changes immediately with weight, age and breed. It compares against a general adult reference only and does not diagnose body fat or obesity.</p>
            </div> : <p className="mb-5 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">{lifeStage === "puppy" || lifeStage === "kitten" ? "Growing pets are not compared with adult weight ranges. Body condition is assessed in the next step." : "Enter a valid age and weight to see life-stage and weight context."}</p>}
            <div className="mb-3"><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Owner-assisted body condition</p><p className="text-lg font-black capitalize">{bcsAnswered ? `BCS ${bcs}/9 · ${status}` : "BCS pending · Complete the next step"}</p></div>
            <BcsMeter score={bcsAnswered ? bcs : undefined} compact />
            <p className="mt-3 text-xs text-muted-foreground">BCS updates from rib feel, waist visibility and abdominal tuck—not from weight or age alone.</p>
          </div>}
        </div>}
        {step === 2 && <div className="space-y-4">
          <p className="text-sm text-stone-700">Choose the description that best matches your pet today. Weight alone is not used for this estimate.</p>
          <Observation id="ribs" label="How easily can the ribs be felt?" value={formData.ribsScore} onChange={(value) => setObservation("ribsScore", value)} options={["Very easy / prominent", "Easy with a light covering", "Difficult under a heavy covering"]} />
          <Observation id="waist" label="Waist visibility from above" value={formData.waistScore} onChange={(value) => setObservation("waistScore", value)} options={["Very pronounced", "Clearly visible", "Absent or rounded"]} />
          <Observation id="tuck" label="Abdominal tuck from the side" value={formData.tuckScore} onChange={(value) => setObservation("tuckScore", value)} options={["Severe tuck", "Visible tuck", "Little or no tuck"]} />
          <div className="rounded-2xl border border-orange-100/70 bg-white/70 p-5 shadow-sm">{bcsAnswered ? <><p className="text-xl font-bold capitalize">Estimated BCS {bcs}/9 · {status}</p><p className="mt-2 text-sm">{STATUS_COPY[status].explanation} {STATUS_COPY[status].guidance}</p>{(bcs <= 2 || bcs >= 8) && <p className="mt-3 flex gap-2 text-sm font-semibold text-red-700"><AlertTriangle className="h-5 w-5 shrink-0" />Extreme scores should be reviewed promptly by a veterinarian.</p>}</> : <p className="font-semibold text-muted-foreground">Answer all three observations to calculate the BCS.</p>}<p className="mt-3 text-xs text-muted-foreground">Owner-provided screening estimate only; this is not a veterinary diagnosis.</p></div>
        </div>}
        {step === 3 && <div className="grid items-end gap-5 sm:grid-cols-2">
          <SelectField label="Food type" value={formData.foodType} onChange={(value) => set("foodType", value as FormData["foodType"])} options={[["commercial", "Commercial/packaged"], ["home-cooked", "Home-cooked"], ["mixed", "Mixed"], ["raw", "Raw"], ["other", "Other"]]} />
          <InputField label="Food brand or recipe" value={formData.foodBrand} onChange={(value) => set("foodBrand", value)} optional />
          <InputField label="Meals per day" type="number" min="1" step="1" value={formData.dailyMeals} onChange={(value) => set("dailyMeals", value)} />
          <InputField label="Total food quantity per day" placeholder="e.g. 450 g or 3 cups" value={formData.dailyQuantity} onChange={(value) => set("dailyQuantity", value)} />
          <InputField label="Treats per day" type="number" min="0" step="1" value={formData.treatsPerDay} onChange={(value) => set("treatsPerDay", value)} />
          <InputField label="Requested feeding-plan duration (days)" type="number" min="1" step="1" value={formData.mealDays} onChange={(value) => set("mealDays", value)} />
          <TextField label="Allergies" placeholder="Chicken, wheat, dairy, etc." value={formData.allergies} onChange={(value) => set("allergies", value)} />
          <TextField label="Known medical conditions" placeholder="Kidney disease, skin issues, diabetes, etc." value={formData.medicalConditions} onChange={(value) => set("medicalConditions", value)} />
          <TextField label="Food dislikes" placeholder="Foods your pet refuses or avoids." value={formData.foodDislikes} onChange={(value) => set("foodDislikes", value)} />
          <TextField label="Other feeding concerns" placeholder="Vomiting, loose stools, picky eating, appetite changes, etc." value={formData.feedingConcerns} onChange={(value) => set("feedingConcerns", value)} />
          <Toggle label="Feeding reminders" hint="Remind me to review and log feeding regularly." checked={formData.reminders} onChange={(value) => set("reminders", value)} />
          <Toggle label="Pet-care tips/subscription" hint="Receive helpful Paw Sattva care updates." checked={formData.subscribe} onChange={(value) => set("subscribe", value)} />
        </div>}
      </CardContent>
      <CardFooter className="flex gap-3 border-t border-border/40 p-7 md:p-10">
        {step > 0 && <Button variant="outline" className="h-14 rounded-xl px-5" onClick={() => setStep((current) => current - 1)}><ChevronLeft /> Back</Button>}
        <Button className="h-14 flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 font-bold shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700" disabled={loading} onClick={step === 3 ? submit : next}>{loading ? <><Loader2 className="animate-spin" /> Saving assessment…</> : step === 3 ? "Create wellness report" : <>Continue <ChevronRight /></>}</Button>
      </CardFooter>
    </Card>
    <SupervisionCard />
  </div>
}

const Field = ({
  label,
  children,
  optional = false,
  hint,
}: {
  label: string
  children: React.ReactNode
  optional?: boolean
  hint?: string
}) => (
  <div className="min-w-0 space-y-2">
    <div className="flex min-h-5 items-center justify-between gap-2">
      <Label className="text-sm font-semibold leading-none text-foreground">{label}</Label>
      {optional && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Optional
        </span>
      )}
    </div>
    {children}
    {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
  </div>
)

const InputField = ({
  label,
  value,
  onChange,
  optional = false,
  hint,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  label: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
  hint?: string
}) => (
  <Field label={label} optional={optional} hint={hint}>
    <Input
      {...props}
      className={controlClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </Field>
)

const SelectField = ({
  label,
  value,
  onChange,
  options,
  optional = false,
  hint,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: [string, string][]
  optional?: boolean
  hint?: string
  placeholder?: string
}) => (
  <Field label={label} optional={optional} hint={hint}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={controlClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
)

const TextField = ({
  label,
  value,
  onChange,
  optional = true,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
  placeholder?: string
}) => (
  <Field label={label} optional={optional}>
    <Textarea
      className={textareaClass}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </Field>
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
  <div className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-orange-100/80 bg-white/85 px-4 py-3 shadow-sm dark:border-orange-900/35 dark:bg-black/25">
    <div className="min-w-0">
      <Label className="text-sm font-semibold leading-none text-foreground">{label}</Label>
      {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
)

function WeightReferenceMeter({ score }: { score: number }) { return <div><div className="mb-2 grid grid-cols-3 text-center text-[10px] font-bold sm:text-xs"><span>Below adult range</span><span>Within adult range</span><span>Above adult range</span></div><div className="grid grid-cols-9 gap-1">{Array.from({ length: 9 }, (_, index) => index + 1).map((value) => <div key={value} aria-current={value === score ? "true" : undefined} className={`h-9 rounded-lg ${value === score ? "scale-110 ring-4 ring-orange-600 ring-offset-2" : ""} ${value <= 3 ? "bg-sky-200" : value <= 6 ? "bg-emerald-300" : "bg-amber-300"}`}><span className="sr-only">Weight reference position {value} of 9</span></div>)}</div></div> }

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
