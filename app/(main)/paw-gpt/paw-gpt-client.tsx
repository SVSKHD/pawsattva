"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { subDays } from "date-fns"
import { ArrowUp, Cat, ChevronDown, Dog, FileText, PawPrint, Plus, RotateCcw, Square } from "lucide-react"
import { toast } from "sonner"

import { getUserPetFeeds, getUserProfile, type UserProfile } from "@/firebase/firestore"
import { trackEvent } from "@/firebase/analytics"
import { useAuth } from "@/components/auth-provider"
import AdminLoader from "@/components/loader"
import Paw from "../../pawsattva.png"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getPetLoggerEntries, getPetWeightEntries, type PetLoggerEntry, type PetWeightEntry } from "@/lib/logger-store"
import { PAW_GPT_LIMITS, type PawGptMessage } from "@/lib/paw-gpt"

import { toDateKey } from "../logger/components/shared"
import { ChatMessage, type ChatItem } from "./components/chat-message"
import { phaseCopy, useDayPhase, type DayPhase } from "@/components/pet-scene/day-phase"
import { PetFriendsArt, SkyArt } from "@/components/pet-scene/scene-art"
import { buildPetContext, isCatPet, mergePets, petSubtitle, reportPrompts, type GptPet } from "./components/pet-data"
import { ProfileDock } from "./components/profile-dock"

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()))

const petIcon = (pet: GptPet | null) => (isCatPet(pet) ? Cat : pet?.profile || pet?.report ? Dog : PawPrint)

export function PawGptClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const phase = useDayPhase()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pets, setPets] = useState<GptPet[]>([])
  const [entries, setEntries] = useState<PetLoggerEntry[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [weightsByPet, setWeightsByPet] = useState<Record<string, PetWeightEntry[]>>({})

  const [selectedPet, setSelectedPet] = useState("")
  const [threads, setThreads] = useState<Record<string, ChatItem[]>>({})
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?returnTo=/paw-gpt")
  }, [authLoading, router, user])

  // Profile, saved assessments and recent food logs
  useEffect(() => {
    if (!user) return
    let active = true
    const end = new Date()
    Promise.allSettled([
      getUserProfile(user.uid),
      getUserPetFeeds(user.uid),
      getPetLoggerEntries(user.uid, toDateKey(subDays(end, PAW_GPT_LIMITS.mealLogDays)), toDateKey(end)),
    ])
      .then(([profileResult, reportsResult, entriesResult]) => {
        if (!active) return
        const userProfile = profileResult.status === "fulfilled" ? profileResult.value : null
        const reports = reportsResult.status === "fulfilled" ? reportsResult.value : []
        const logs = entriesResult.status === "fulfilled" ? entriesResult.value : []
        if (profileResult.status === "rejected") console.error("Unable to load profile:", profileResult.reason)
        if (reportsResult.status === "rejected") console.error("Unable to load pet reports:", reportsResult.reason)
        if (entriesResult.status === "rejected") console.error("Unable to load food logs:", entriesResult.reason)
        if (profileResult.status === "rejected" && entriesResult.status === "rejected") {
          toast.error("Could not load your pets. Refresh to try again.")
        }

        const loggedNames = Array.from(new Set(logs.map((entry) => entry.petName.trim()).filter(Boolean))).sort()
        const merged = mergePets(userProfile?.petFeeds ?? [], reports, loggedNames)
        setProfile(userProfile)
        setEntries(logs)
        setPets(merged)
        if (merged.length === 1) setSelectedPet(merged[0].name)
      })
      .finally(() => {
        if (active) setLoadingData(false)
      })
    return () => {
      active = false
    }
  }, [user])

  // Weight history for the selected pet, fetched once per pet
  const loadWeights = useCallback(
    async (petName: string) => {
      if (!user) return []
      if (weightsByPet[petName]) return weightsByPet[petName]
      const end = new Date()
      try {
        const weights = await getPetWeightEntries(
          user.uid,
          petName,
          toDateKey(subDays(end, PAW_GPT_LIMITS.weightDays)),
          toDateKey(end)
        )
        setWeightsByPet((current) => ({ ...current, [petName]: weights }))
        return weights
      } catch (error) {
        console.error("Unable to load weight history:", error)
        return []
      }
    },
    [user, weightsByPet]
  )

  useEffect(() => {
    if (selectedPet) void loadWeights(selectedPet)
  }, [loadWeights, selectedPet])

  const pet = pets.find((item) => item.name === selectedPet) ?? null
  const messages = useMemo(() => threads[selectedPet] ?? [], [threads, selectedPet])

  // Keep the newest message in view while answers stream in
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (nearBottom || streaming) el.scrollTo({ top: el.scrollHeight })
  }, [messages, streaming])

  // Grow the textarea with its content, up to a limit
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const selectPet = (name: string) => {
    if (streaming) abortRef.current?.abort()
    setSelectedPet(name)
    window.setTimeout(() => inputRef.current?.focus(), 50)
  }

  const updateItem = (petName: string, id: string, patch: Partial<ChatItem> | ((item: ChatItem) => Partial<ChatItem>)) =>
    setThreads((current) => ({
      ...current,
      [petName]: (current[petName] ?? []).map((item) =>
        item.id === id ? { ...item, ...(typeof patch === "function" ? patch(item) : patch) } : item
      ),
    }))

  const send = async (text: string) => {
    const question = text.trim()
    if (!user || streaming || !question) return
    if (!pet) {
      toast.message("Select a pet first", { description: "Paw GPT answers from your pet's own record." })
      setPickerOpen(true)
      return
    }
    if (question.length > PAW_GPT_LIMITS.maxMessageChars) {
      toast.error("That question is too long — try a shorter one.")
      return
    }

    const petName = pet.name
    const userItem: ChatItem = { id: newId(), role: "user", content: question }
    const answerId = newId()
    const previous = threads[petName] ?? []

    setThreads((current) => ({
      ...current,
      [petName]: [...previous, userItem, { id: answerId, role: "assistant", content: "", pending: true }],
    }))
    setInput("")
    setStreaming(true)

    // Completed turns only, newest last, starting on a user turn
    const history: PawGptMessage[] = [...previous, userItem]
      .filter((item) => !item.error && !item.pending && item.content.trim())
      .map(({ role, content }) => ({ role, content }))
      .slice(-(PAW_GPT_LIMITS.maxMessages - 1))
    while (history[0]?.role === "assistant") history.shift()

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const weights = await loadWeights(petName)
      const context = buildPetContext(pet, entries, weights, profile?.displayName || user.displayName || undefined)
      const res = await fetch("/api/paw-gpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ context, messages: history }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null)
        updateItem(petName, answerId, {
          content: data?.error || "Paw GPT could not answer right now. Please try again.",
          error: true,
          pending: false,
        })
        return
      }

      void trackEvent("paw_gpt_question", { turn: Math.ceil(history.length / 2) })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) updateItem(petName, answerId, (item) => ({ content: item.content + chunk }))
      }
      updateItem(petName, answerId, (item) =>
        item.content.trim()
          ? { pending: false }
          : { pending: false, error: true, content: "Paw GPT didn't return an answer. Please try again." }
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        updateItem(petName, answerId, (item) =>
          item.content.trim() ? { pending: false } : { pending: false, error: true, content: "Stopped." }
        )
      } else {
        console.error("Paw GPT request failed:", error)
        updateItem(petName, answerId, {
          pending: false,
          error: true,
          content: "Could not reach Paw GPT. Check your connection and try again.",
        })
      }
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void send(input)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(input)
    }
  }

  const resetThread = () => {
    if (streaming) abortRef.current?.abort()
    setThreads((current) => ({ ...current, [selectedPet]: [] }))
  }

  if (authLoading || !user) {
    return <AdminLoader img={Paw} title="Opening Paw GPT" />
  }

  const firstName = (profile?.displayName || user.displayName || "").split(" ")[0]
  const PetIcon = petIcon(pet)

  return (
    <div className="relative flex h-[calc(100dvh-6rem-env(safe-area-inset-bottom))] flex-col md:h-[100dvh]">
      {/* Sky tint for the time of day */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b ${phaseCopy[phase].sky} to-transparent transition-colors duration-700`}
      />

      <ProfileDock
        user={user}
        profile={profile}
        pets={pets}
        loading={loadingData}
        mealsLogged={entries.length}
        selectedPet={selectedPet}
        onSelectPet={selectPet}
      />

      {/* Greeting or conversation */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 pt-24 sm:px-6 md:pt-28">
        {messages.length === 0 ? (
          <Greeting
            phase={phase}
            firstName={firstName}
            pets={pets}
            pet={pet}
            loading={loadingData}
            onSelectPet={selectPet}
            onPrompt={(prompt) => void send(prompt)}
          />
        ) : (
          <div className="mx-auto max-w-3xl pb-6">
            <div className="sticky top-0 z-10 -mx-2 mb-4 flex items-center justify-between gap-2 bg-gradient-to-b from-background via-background/90 to-transparent px-2 pb-3 pt-1">
              <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <PetIcon className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                <span className="truncate">
                  Chatting about <strong className="text-foreground">{pet?.name}</strong>
                </span>
              </p>
              <button
                type="button"
                onClick={resetThread}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              >
                <RotateCcw className="h-3.5 w-3.5" /> New chat
              </button>
            </div>
            <div className="space-y-6">
              {messages.map((item) => (
                <ChatMessage key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="relative px-3 pb-3 pt-2 sm:px-6 md:pb-5">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-black/[0.06] bg-background/90 p-2 shadow-[0_10px_36px_rgba(24,24,27,0.12)] backdrop-blur-xl transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-500/10 dark:border-white/10">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={PAW_GPT_LIMITS.maxMessageChars}
            placeholder={pet ? `Ask anything about ${pet.name}…` : "Select your pet, then ask a question…"}
            aria-label="Ask Paw GPT"
            className="block max-h-40 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={loadingData}
                  className={`inline-flex h-8 max-w-[60%] items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                    pet
                      ? "bg-orange-500/10 text-orange-700 hover:bg-orange-500/15 dark:text-orange-300"
                      : "bg-orange-500 text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600"
                  }`}
                >
                  <PetIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{pet ? pet.name : "Select pet"}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-60 rounded-xl p-1.5">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Ask about</DropdownMenuLabel>
                {pets.map((item) => {
                  const Icon = petIcon(item)
                  return (
                    <DropdownMenuItem key={item.name} onSelect={() => selectPet(item.name)} className="rounded-lg px-2.5 py-2">
                      <Icon />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{item.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{petSubtitle(item) || "Only in food logs"}</span>
                      </span>
                    </DropdownMenuItem>
                  )
                })}
                {pets.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2">
                  <Link href="/pet-feed">
                    <Plus /> Add a pet
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {streaming ? (
              <button
                type="button"
                aria-label="Stop answering"
                onClick={() => abortRef.current?.abort()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
          Paw GPT gives general guidance from your logs, not a diagnosis. For anything urgent,{" "}
          <Link href="/consultation" className="font-semibold text-orange-600 hover:underline">
            talk to a vet
          </Link>
          .
        </p>
      </form>
    </div>
  )
}

function Greeting({
  phase,
  firstName,
  pets,
  pet,
  loading,
  onSelectPet,
  onPrompt,
}: {
  phase: DayPhase
  firstName: string
  pets: GptPet[]
  pet: GptPet | null
  loading: boolean
  onSelectPet: (name: string) => void
  onPrompt: (prompt: string) => void
}) {
  const copy = phaseCopy[phase]

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center pb-6 text-center">
      <div className="paw-gpt-anim-rise relative w-[min(26rem,88vw)]">
        <SkyArt phase={phase} className="absolute -top-14 right-0 h-24 w-28 sm:-top-16 sm:h-28 sm:w-32" />
        <PetFriendsArt sleepy={phase === "night"} className="w-full text-foreground" />
      </div>

      <h1 className="paw-gpt-anim-rise mt-4 text-3xl font-black tracking-tight sm:text-4xl" style={{ animationDelay: "80ms" }}>
        {copy.greeting}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="paw-gpt-anim-rise mt-2 max-w-md text-sm text-muted-foreground" style={{ animationDelay: "140ms" }}>
        {copy.line}
      </p>

      <div className="paw-gpt-anim-rise mt-6 w-full" style={{ animationDelay: "200ms" }}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Finding your pets…</p>
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">Add your pet and I&apos;ll answer from their profile, meals and weigh-ins.</p>
            <Link
              href="/pet-feed"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-orange-500 px-5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" /> Add your first pet
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              {pet ? `Ask me about ${pet.name}` : "Who are we caring for today?"}
            </p>
            <div role="radiogroup" aria-label="Choose a pet" className="mt-3 flex flex-wrap justify-center gap-2">
              {pets.map((item) => {
                const Icon = petIcon(item)
                const active = item.name === pet?.name
                return (
                  <button
                    key={item.name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelectPet(item.name)}
                    className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${
                      active
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                        : "bg-background/80 text-foreground ring-1 ring-black/10 backdrop-blur hover:ring-orange-300 dark:ring-white/15"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </button>
                )
              })}
            </div>

            {pet && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {reportPrompts(pet.name).map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    title={item.description}
                    onClick={() => onPrompt(item.prompt)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-500/25 transition hover:bg-orange-500/10 dark:text-orange-300"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {item.title}
                  </button>
                ))}
              </div>
            )}
            {pet && !pet.profile && !pet.report && (
              <p className="mt-4 text-xs text-muted-foreground">
                {pet.name} only appears in your food logs.{" "}
                <Link href="/pet-feed" className="font-semibold text-orange-600 hover:underline">
                  Add an assessment
                </Link>{" "}
                for breed, age and weight-based advice.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
