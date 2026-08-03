"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { deletePetFeedDraft, getPetFeedDraft, PetFeed, savePetFeed, savePetFeedDraft } from "@/firebase/firestore"
import { BREEDS, PetType, STATUS_COPY, calculateBcs, getBreed, getLifeStage, getWeightStatus } from "@/lib/pet-wellness"
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Dog, Loader2, PawPrint, Printer, User, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

const DRAFT_KEY = "pawsattva.pet-feed.wellness.v1"
const STEP_KEY = `${DRAFT_KEY}.step`

const initialData = {
  name: "", phone: "", petName: "", petType: "Dog" as PetType, petBreed: "", ageValue: "", ageUnit: "years" as "months" | "years",
  sex: "unknown" as "male" | "female" | "unknown", neutered: false, weightKg: "", activityLevel: "moderate" as "low" | "moderate" | "high",
  ribsScore: 5, waistScore: 5, tuckScore: 5, foodType: "commercial" as "commercial" | "home-cooked" | "mixed" | "raw" | "other",
  foodBrand: "", dailyMeals: "2", dailyQuantity: "", treatsPerDay: "0", allergies: "", medicalConditions: "", foodDislikes: "",
  feedingConcerns: "", mealDays: "30", reminders: false, subscribe: true,
}

type FormData = typeof initialData
const fieldClass = "h-14 rounded-xl border-white/40 bg-white/70 text-base shadow-sm focus:ring-orange-500/20 dark:bg-black/20"
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
    if (user?.displayName) setFormData((current) => current.name ? current : { ...current, name: user.displayName ?? "" })
  }, [user])

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
  const bcs = calculateBcs(formData.ribsScore, formData.waistScore, formData.tuckScore)
  const status = getWeightStatus(bcs)
  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setFormData((current) => ({ ...current, [key]: value }))

  const validateStep = () => {
    if (step === 0 && (!formData.name.trim() || !/^\+?[0-9 ()-]{7,20}$/.test(formData.phone))) return "Enter a full name and valid phone number."
    if (step === 1 && (!formData.petName.trim() || !formData.petBreed || Number(formData.ageValue) <= 0 || Number(formData.weightKg) <= 0)) return "Complete the pet profile with valid positive age and weight values."
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
        neutered: formData.neutered, weightKg: Number(formData.weightKg), activityLevel: formData.activityLevel, breedImageUrl: selectedBreed?.imageUrl,
        breedReferenceRange: selectedBreed?.adultWeightRange, ribsScore: formData.ribsScore, waistScore: formData.waistScore, tuckScore: formData.tuckScore,
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
        {step === 0 && <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Pet parent’s full name"><Input className={fieldClass} value={formData.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" /></Field>
          <Field label="Phone number"><Input className={fieldClass} type="tel" value={formData.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></Field>
        </div>}
        {step === 1 && <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pet name"><Input className={fieldClass} value={formData.petName} onChange={(e) => set("petName", e.target.value)} /></Field>
            <Field label="Pet type"><Select value={formData.petType} onValueChange={(value: PetType) => { set("petType", value); set("petBreed", "") }}><SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Dog">Dog</SelectItem><SelectItem value="Cat">Cat</SelectItem></SelectContent></Select></Field>
            <Field label="Breed"><Select value={formData.petBreed} onValueChange={(value) => set("petBreed", value)}><SelectTrigger className={fieldClass}><SelectValue placeholder="Select breed" /></SelectTrigger><SelectContent>{BREEDS[formData.petType].map((breed) => <SelectItem key={breed.name} value={breed.name}>{breed.name}</SelectItem>)}</SelectContent></Select></Field>
            <div className="grid grid-cols-[1fr_130px] gap-2"><Field label="Age"><Input className={fieldClass} type="number" min="0.1" step="0.1" value={formData.ageValue} onChange={(e) => set("ageValue", e.target.value)} /></Field><Field label="Unit"><Select value={formData.ageUnit} onValueChange={(value: "months" | "years") => set("ageUnit", value)}><SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="months">Months</SelectItem><SelectItem value="years">Years</SelectItem></SelectContent></Select></Field></div>
            <Field label="Sex"><Select value={formData.sex} onValueChange={(value: FormData["sex"]) => set("sex", value)}><SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent></Select></Field>
            <Field label="Current weight (kg)"><Input className={fieldClass} type="number" min="0.1" step="0.1" value={formData.weightKg} onChange={(e) => set("weightKg", e.target.value)} /></Field>
            <Field label="Activity level"><Select value={formData.activityLevel} onValueChange={(value: FormData["activityLevel"]) => set("activityLevel", value)}><SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></Field>
            <Toggle label="Spayed/neutered" checked={formData.neutered} onChange={(value) => set("neutered", value)} />
          </div>
          {selectedBreed && <div className="grid overflow-hidden rounded-2xl border border-orange-100/70 bg-white/75 shadow-sm sm:grid-cols-[180px_1fr] dark:border-orange-900/20 dark:bg-black/20">
            <Image src={selectedBreed.imageUrl} alt={`${selectedBreed.name} breed reference`} width={360} height={176} className="h-44 w-full object-cover" />
            <div className="p-5"><p className="text-xl font-black text-foreground">{selectedBreed.name}</p><p className="mt-2 text-sm font-semibold">General adult weight reference: {selectedBreed.adultWeightRange ?? "No single reliable range for mixed/other breeds"}</p><p className="mt-2 text-xs text-muted-foreground">General information only—not a diagnostic target or guaranteed ideal weight for your pet.</p></div>
          </div>}
        </div>}
        {step === 2 && <div className="space-y-4">
          <p className="text-sm text-stone-700">Choose the description that best matches your pet today. Weight alone is not used for this estimate.</p>
          <div className="sticky top-24 z-20 rounded-2xl border border-orange-200 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-orange-900/40 dark:bg-zinc-950/95">
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Live body-condition estimate</p><p className="text-xl font-black capitalize">BCS {bcs}/9 · {status}</p></div><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">Updates instantly</span></div>
            <BcsMeter score={bcs} compact />
          </div>
          <Observation id="ribs" label="How easily can the ribs be felt?" value={formData.ribsScore} onChange={(value) => set("ribsScore", value)} options={["Very easy / prominent", "Easy with a light covering", "Difficult under a heavy covering"]} />
          <Observation id="waist" label="Waist visibility from above" value={formData.waistScore} onChange={(value) => set("waistScore", value)} options={["Very pronounced", "Clearly visible", "Absent or rounded"]} />
          <Observation id="tuck" label="Abdominal tuck from the side" value={formData.tuckScore} onChange={(value) => set("tuckScore", value)} options={["Severe tuck", "Visible tuck", "Little or no tuck"]} />
          <div className="rounded-2xl border border-orange-100/70 bg-white/70 p-5 shadow-sm"><p className="text-xl font-bold capitalize">Estimated BCS {bcs}/9 · {status}</p><p className="mt-2 text-sm">{STATUS_COPY[status].explanation} {STATUS_COPY[status].guidance}</p>{(bcs <= 2 || bcs >= 8) && <p className="mt-3 flex gap-2 text-sm font-semibold text-red-700"><AlertTriangle className="h-5 w-5 shrink-0" />Extreme scores should be reviewed promptly by a veterinarian.</p>}<p className="mt-3 text-xs text-muted-foreground">Owner-provided screening estimate only; this is not a veterinary diagnosis.</p></div>
        </div>}
        {step === 3 && <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Food type"><Select value={formData.foodType} onValueChange={(value: FormData["foodType"]) => set("foodType", value)}><SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="commercial">Commercial/packaged</SelectItem><SelectItem value="home-cooked">Home-cooked</SelectItem><SelectItem value="mixed">Mixed</SelectItem><SelectItem value="raw">Raw</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></Field>
          <Field label="Food brand or recipe"><Input className={fieldClass} value={formData.foodBrand} onChange={(e) => set("foodBrand", e.target.value)} /></Field>
          <Field label="Meals per day"><Input className={fieldClass} type="number" min="1" step="1" value={formData.dailyMeals} onChange={(e) => set("dailyMeals", e.target.value)} /></Field>
          <Field label="Total food quantity per day"><Input className={fieldClass} placeholder="e.g. 450 g or 3 cups" value={formData.dailyQuantity} onChange={(e) => set("dailyQuantity", e.target.value)} /></Field>
          <Field label="Treats per day"><Input className={fieldClass} type="number" min="0" step="1" value={formData.treatsPerDay} onChange={(e) => set("treatsPerDay", e.target.value)} /></Field>
          <Field label="Requested feeding-plan duration (days)"><Input className={fieldClass} type="number" min="1" step="1" value={formData.mealDays} onChange={(e) => set("mealDays", e.target.value)} /></Field>
          <TextField label="Allergies" value={formData.allergies} onChange={(value) => set("allergies", value)} />
          <TextField label="Known medical conditions" value={formData.medicalConditions} onChange={(value) => set("medicalConditions", value)} />
          <TextField label="Food dislikes" value={formData.foodDislikes} onChange={(value) => set("foodDislikes", value)} />
          <TextField label="Other feeding concerns" value={formData.feedingConcerns} onChange={(value) => set("feedingConcerns", value)} />
          <Toggle label="Feeding reminders" checked={formData.reminders} onChange={(value) => set("reminders", value)} />
          <Toggle label="Pet-care tips/subscription" checked={formData.subscribe} onChange={(value) => set("subscribe", value)} />
        </div>}
      </CardContent>
      <CardFooter className="flex gap-3 border-t border-border/40 p-7 md:p-10">
        {step > 0 && <Button variant="outline" className="h-12 rounded-xl" onClick={() => setStep((current) => current - 1)}><ChevronLeft /> Back</Button>}
        <Button className="h-12 flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 font-bold shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700" disabled={loading} onClick={step === 3 ? submit : next}>{loading ? <><Loader2 className="animate-spin" /> Saving assessment…</> : step === 3 ? "Create wellness report" : <>Continue <ChevronRight /></>}</Button>
      </CardFooter>
    </Card>
    <SupervisionCard />
  </div>
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-2"><Label>{label}</Label>{children}</div>
const TextField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <Field label={label}><textarea className="min-h-24 w-full rounded-xl border border-white/40 bg-white/70 p-3 text-sm shadow-sm dark:bg-black/20" value={value} onChange={(e) => onChange(e.target.value)} /></Field>
const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => <div className="flex min-h-14 items-center justify-between rounded-xl border border-white/40 bg-white/70 px-4 shadow-sm dark:bg-black/20"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>

function BcsMeter({ score, compact = false }: { score: number; compact?: boolean }) { return <div className={compact ? "" : "rounded-2xl bg-white p-4"}><div className="mb-2 grid grid-cols-4 text-center text-[10px] font-bold sm:text-xs"><span>Underweight</span><span>Ideal</span><span>Overweight</span><span>Obese</span></div><div className="grid grid-cols-9 gap-1">{Array.from({ length: 9 }, (_, index) => index + 1).map((value) => <div key={value} aria-current={value === score ? "true" : undefined} className={`rounded-lg py-2 text-center text-xs font-bold sm:text-sm ${value === score ? "scale-110 ring-4 ring-orange-600 ring-offset-2" : ""} ${value <= 3 ? "bg-sky-200 text-sky-950" : value <= 5 ? "bg-emerald-300 text-emerald-950" : value <= 7 ? "bg-amber-300 text-amber-950" : "bg-red-300 text-red-950"}`}>{value}</div>)}</div></div> }

function WellnessReport({ data, onReset }: { data: PetFeed; onReset: () => void }) {
  const status = data.weightStatus ?? "ideal"; const assessed = data.assessedAt ? new Date(data.assessedAt) : new Date()
  return <div className="space-y-6">
    <article className="wellness-report overflow-hidden rounded-[2rem] bg-[#faf6e9] text-stone-800 shadow-xl">
      <header className="bg-[#173f2c] p-7 text-white md:p-10"><div className="flex items-center gap-3"><PawPrint className="h-9 w-9" /><div><h2 className="text-3xl font-black">Paw Sattva</h2><p className="text-sm text-amber-100">Wellness · Balance · Harmony</p></div></div><p className="mt-6 text-xl font-bold capitalize">{data.lifeStage} wellness report</p><p className="text-sm text-white/75">Assessment date: {assessed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></header>
      <div className="grid gap-5 p-6 md:grid-cols-2 md:p-10">
        <ReportCard title="Pet summary"><ReportGrid items={[["Pet", data.petName], ["Breed", data.petBreed], ["Age", `${data.ageValue} ${data.ageUnit}`], ["Pet parent", data.name], ["Type", data.petType], ["Sex", data.sex], ["Spayed/neutered", data.neutered ? "Yes" : "No"]]} /></ReportCard>
        <ReportCard title="Key metrics"><ReportGrid items={[["Current weight", `${data.weightKg} kg`], ["General adult breed reference", data.breedReferenceRange ?? "Not available"], ["Body Condition Score", `${data.bodyConditionScore}/9`], ["Classification", status], ["Activity", data.activityLevel]]} /><p className="mt-3 text-xs text-stone-500">Adult breed ranges are informational, not guaranteed ideal weights.</p></ReportCard>
        <ReportCard title="Condition summary"><p className="text-2xl font-black capitalize text-emerald-900">{status}</p><p className="mt-2 text-sm">{STATUS_COPY[status].explanation}</p><p className="mt-3 text-sm font-semibold">{STATUS_COPY[status].guidance}</p>{(data.bodyConditionScore! <= 2 || data.bodyConditionScore! >= 8 || data.medicalConditions || data.dietaryConcerns) && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">Veterinary review is recommended for extreme BCS, sudden weight change, medical conditions, or feeding concerns.</p>}</ReportCard>
        <ReportCard title="Body condition meter"><BcsMeter score={data.bodyConditionScore ?? 5} /><div className="mt-2 flex justify-between text-xs"><span>1: Too thin</span><span>4–5: Ideal</span><span>9: Obese</span></div></ReportCard>
        <ReportCard title="Feeding snapshot"><ReportGrid items={[["Food type", data.foodType], ["Brand/recipe", data.foodBrand || "Not provided"], ["Meals/day", data.dailyMeals], ["Daily quantity", data.dailyQuantity], ["Treats/day", data.treatsPerDay], ["Concerns", data.dietaryConcerns || "None reported"], ["Plan duration", `${data.mealDays} days`]]} /></ReportCard>
        <ReportCard title="Growth history"><p className="text-sm">Baseline recorded: <strong>{data.weightKg} kg</strong> on {assessed.toLocaleDateString("en-IN")}.</p><p className="mt-3 text-sm text-stone-600">This is the first real measurement. A growth curve will appear after future check-ins; no earlier weights have been invented.</p></ReportCard>
      </div>
      <footer className="border-t border-emerald-900/10 p-6 text-center text-xs text-stone-600 md:px-10">This owner-provided report is an informational screening estimate, not a veterinary diagnosis. It does not provide medical treatment instructions.</footer>
    </article>
    <div className="flex flex-col gap-3 sm:flex-row"><Button className="h-12 flex-1 rounded-xl bg-[#173f2c]" onClick={() => window.print()}><Printer /> Print or save report as PDF</Button><Button className="h-12 rounded-xl" variant="outline" onClick={onReset}><CheckCircle2 /> Assess another pet</Button></div>
    <SupervisionCard />
  </div>
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-emerald-900/10 bg-white p-5"><h3 className="mb-4 text-lg font-black text-emerald-950">{title}</h3>{children}</section> }
function ReportGrid({ items }: { items: [string, unknown][] }) { return <dl className="grid grid-cols-2 gap-3">{items.map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 text-sm font-semibold capitalize">{String(value ?? "Not provided")}</dd></div>)}</dl> }
function SupervisionCard() { return <Card className="rounded-[2rem] border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50"><CardContent className="p-7 md:p-9"><p className="text-sm font-bold uppercase tracking-widest text-amber-700">Optional support</p><h2 className="mt-2 text-2xl font-black text-emerald-950">Need ongoing pet wellness supervision?</h2><p className="mt-3 max-w-2xl text-sm text-stone-700">Supervision can include progress check-ins, weight and BCS tracking, feeding-record reviews, and updated reports.</p><p className="mt-5 text-xl font-black text-emerald-900">Plans from ₹299 to ₹1,000/month</p><Button asChild className="mt-5 rounded-xl bg-[#173f2c]"><a href="https://instagram.com/pawsattva" target="_blank" rel="noreferrer">Enquire with Paw Sattva on Instagram</a></Button></CardContent></Card> }
