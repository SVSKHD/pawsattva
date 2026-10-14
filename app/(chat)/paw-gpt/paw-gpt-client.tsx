"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { subDays } from "date-fns"
import { ArrowUp, Cat, ChevronDown, Dog, FileText, Heart, PawPrint, Plus, Sparkles, SquarePen, Square } from "lucide-react"
import { toast } from "sonner"

import { doc, onSnapshot } from "firebase/firestore"

import { db } from "@/firebase/db"
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
import {
  getPetLoggerEntries,
  getPetWeightEntries,
  savePetLoggerEntry,
  type PetLoggerEntry,
  type PetWeightEntry,
} from "@/lib/logger-store"
import {
  PAW_GPT_DAILY_LIMIT,
  PAW_GPT_DAILY_TOKEN_LIMIT,
  PAW_GPT_LIMITS,
  pawGptDayKey,
  pawGptUsagePath,
  type PawGptMessage,
} from "@/lib/paw-gpt"
import { PAW_GPT_PROVIDER, PawGptError, streamPawGptAnswer } from "@/lib/paw-gpt-stream"

import { toDateKey } from "@/app/(main)/logger/components/shared"
import { ChatMessage, HistoryTicker, type ChatItem, type Conversation } from "./components/chat-message"
import { phaseCopy, useDayPhase, type DayPhase } from "@/components/pet-scene/day-phase"
import { PetFriendsArt, SkyArt } from "@/components/pet-scene/scene-art"
import {
  buildPetContext,
  isCatPet,
  isFoodRelated,
  isPlanningPet,
  mergePets,
  PLANNING_PET_NAME,
  planningPet,
  petSubtitle,
  promptLibrary,
  reportPrompts,
  toLoggerPet,
  weightStatusOf,
  type GptPet,
} from "./components/pet-data"
import { MealDialog, type MealDraft } from "@/app/(main)/logger/components/meal-dialog"
import { mealLabels } from "@/app/(main)/logger/components/shared"
import { ProfileDock, ProfileSidebar, type ChatSummary, type PawGptQuota } from "./components/profile-dock"
import { PromptDock, usePromptDockOpen } from "./components/prompt-dock"
import { UsageLimitDialog } from "./components/usage-limit-dialog"
import { ChatHomeButton } from "../chat-home-button"
import { pickQuickReads, QuickViewDialog, useQuickReads, type QuickRead } from "./components/quick-reads"

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()))

const CHATS_KEY = "paw-gpt-chats"
/** Before conversations existed, each pet had one thread saved under this key. */
const LEGACY_THREADS_KEY = "paw-gpt-threads"
const MAX_SAVED_CHATS = 30
const MAX_SAVED_PER_CHAT = 40

/** This account's saved chats, migrating the old one-thread-per-pet format once. */
function loadChats(uid: string): Conversation[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(`${CHATS_KEY}:${uid}`) ?? "null")
    if (Array.isArray(saved)) return saved as Conversation[]

    const legacy = JSON.parse(window.localStorage.getItem(`${LEGACY_THREADS_KEY}:${uid}`) ?? "null") as Record<string, ChatItem[]> | null
    if (!legacy || typeof legacy !== "object") return []
    const migrated = Object.entries(legacy)
      .filter(([, items]) => Array.isArray(items) && items.length > 0)
      .map(([petName, items]) => {
        const times = items.map((item) => item.createdAt ?? 0).filter(Boolean)
        const updatedAt = times.length ? Math.max(...times) : Date.now()
        return { id: newId(), petName, items, createdAt: times.length ? Math.min(...times) : updatedAt, updatedAt }
      })
    window.localStorage.removeItem(`${LEGACY_THREADS_KEY}:${uid}`)
    return migrated
  } catch {
    return []
  }
}

/** 12345 → "12.3k" for the compact token counter. */
const compactTokens = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k` : String(value)

const petIcon = (pet: GptPet | null) =>
  isPlanningPet(pet) ? Heart : isCatPet(pet) ? Cat : pet?.profile || pet?.report ? Dog : PawPrint

export function PawGptClient() {
  const router = useRouter()
  const { user, loading: authLoading, isAdmin } = useAuth()
  const phase = useDayPhase()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pets, setPets] = useState<GptPet[]>([])
  const [entries, setEntries] = useState<PetLoggerEntry[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [weightsByPet, setWeightsByPet] = useState<Record<string, PetWeightEntry[]>>({})

  const [selectedPet, setSelectedPet] = useState("")
  const [chats, setChats] = useState<Conversation[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [promptsOpen, setPromptsOpen] = usePromptDockOpen()
  const [mealOpen, setMealOpen] = useState(false)
  // Blog posts to read while a slow answer is on its way; loaded on the first question.
  const allQuickReads = useQuickReads(streaming)
  // Kept here (not in the message) so the quick view stays open when the answer arrives.
  const [quickView, setQuickView] = useState<QuickRead | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [chatsOwner, setChatsOwner] = useState<string | null>(null)

  // Restore this account's earlier chats from the browser
  useEffect(() => {
    if (!user) return
    setChats(loadChats(user.uid))
    setActiveChatId(null)
    setChatsOwner(user.uid)
  }, [user])

  // Save finished turns only, so a reload never shows a half-written answer
  useEffect(() => {
    if (!user || chatsOwner !== user.uid || streaming) return
    const finished = chats
      .map((chat) => ({ ...chat, items: chat.items.filter((item) => !item.pending).slice(-MAX_SAVED_PER_CHAT) }))
      .filter((chat) => chat.items.length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SAVED_CHATS)
    try {
      window.localStorage.setItem(`${CHATS_KEY}:${user.uid}`, JSON.stringify(finished))
    } catch {
      // storage unavailable; history just lasts for this visit
    }
  }, [streaming, chats, chatsOwner, user])

  // ── Daily question limit (admins and authors are exempt) ──────────────────
  const exempt = isAdmin
  const [dayKey, setDayKey] = useState(() => pawGptDayKey())
  const [usageToday, setUsageToday] = useState<{ questions: number; tokens: number; passTokenLimit: number } | null>(null)
  useEffect(() => {
    // Roll over at midnight (India time) without a reload.
    const timer = window.setInterval(() => setDayKey(pawGptDayKey()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!user || exempt) return
    return onSnapshot(
      doc(db, pawGptUsagePath(user.uid, dayKey)),
      (snapshot) =>
        setUsageToday({
          questions: Number(snapshot.get("count") ?? 0),
          tokens: Number(snapshot.get("tokens") ?? 0),
          passTokenLimit: Number(snapshot.get("passTokenLimit") ?? 0),
        }),
      () => setUsageToday(null)
    )
  }, [user, exempt, dayKey])
  const quota: PawGptQuota | null = (() => {
    if (exempt || !usageToday) return null
    const hasPass = usageToday.passTokenLimit > 0
    const tokenLimit = hasPass ? usageToday.passTokenLimit : PAW_GPT_DAILY_TOKEN_LIMIT
    return {
      hasPass,
      // A Daily Pass removes the question cap; only its tokens count.
      questionsLeft: hasPass ? null : Math.max(0, PAW_GPT_DAILY_LIMIT - usageToday.questions),
      questionsUsed: usageToday.questions,
      tokensUsed: usageToday.tokens,
      tokenLimit,
      tokensLeft: Math.max(0, tokenLimit - usageToday.tokens),
    }
  })()
  const limitReached = Boolean(quota && (quota.questionsLeft === 0 || quota.tokensLeft === 0))
  const limitMessage = quota?.hasPass
    ? "You've used today's Daily Pass"
    : quota?.tokensLeft === 0
      ? `You've used today's ${PAW_GPT_DAILY_TOKEN_LIMIT.toLocaleString("en-IN")} tokens`
      : `You've used today's ${PAW_GPT_DAILY_LIMIT} questions`

  // The "you've been busy" dialog opens by itself the moment the allowance runs out.
  const [limitDialogOpen, setLimitDialogOpen] = useState(false)
  const [wasLimited, setWasLimited] = useState(false)
  if (limitReached !== wasLimited) {
    setWasLimited(limitReached)
    if (limitReached) setLimitDialogOpen(true)
  }

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
    if (selectedPet && selectedPet !== PLANNING_PET_NAME) void loadWeights(selectedPet)
  }, [loadWeights, selectedPet])

  const pet = selectedPet === PLANNING_PET_NAME ? planningPet : pets.find((item) => item.name === selectedPet) ?? null
  // Stable reference: the meal dialog resets its form whenever `pets` changes.
  const loggerPets = useMemo(() => pets.map(toLoggerPet), [pets])
  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId && chat.petName === selectedPet) ?? null,
    [chats, activeChatId, selectedPet]
  )
  const messages = useMemo(() => activeChat?.items ?? [], [activeChat])

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

  // Switching pets resumes that pet's latest chat (or starts a fresh one).
  const selectPet = (name: string) => {
    if (streaming) abortRef.current?.abort()
    setSelectedPet(name)
    const latest = chats.filter((chat) => chat.petName === name).sort((a, b) => b.updatedAt - a.updatedAt)[0]
    setActiveChatId(latest?.id ?? null)
    window.setTimeout(() => inputRef.current?.focus(), 50)
  }

  const updateItem = (chatId: string, id: string, patch: Partial<ChatItem> | ((item: ChatItem) => Partial<ChatItem>)) =>
    setChats((current) =>
      current.map((chat) =>
        chat.id !== chatId
          ? chat
          : {
              ...chat,
              updatedAt: Date.now(),
              items: chat.items.map((item) => (item.id === id ? { ...item, ...(typeof patch === "function" ? patch(item) : patch) } : item)),
            }
      )
    )

  const send = async (text: string, base?: ChatItem[]) => {
    const question = text.trim()
    if (!user || streaming || !question) return
    if (!pet) {
      toast.message(pets.length ? "Select a pet first" : "Add a pet or start planning one", {
        description: pets.length ? "Paw GPT answers from your pet's own record." : 'Choose "Planning a pet" to ask about getting one.',
      })
      setPickerOpen(true)
      return
    }
    if (question.length > PAW_GPT_LIMITS.maxMessageChars) {
      toast.error("That question is too long — try a shorter one.")
      return
    }
    if (limitReached) {
      setLimitDialogOpen(true)
      return
    }

    const petName = pet.name
    const now = Date.now()
    const userItem: ChatItem = { id: newId(), role: "user", content: question, createdAt: now }
    const answerId = newId()
    // Every question in this window belongs to the same conversation until "New chat".
    const chatId = activeChat?.id ?? newId()
    const previous = base ?? activeChat?.items ?? []
    const items = [...previous, userItem, { id: answerId, role: "assistant" as const, content: "", pending: true, createdAt: now }]

    setChats((current) =>
      current.some((chat) => chat.id === chatId)
        ? current.map((chat) => (chat.id === chatId ? { ...chat, items, updatedAt: now } : chat))
        : [{ id: chatId, petName, items, createdAt: now, updatedAt: now }, ...current]
    )
    setActiveChatId(chatId)
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
      const weights = pet.planning ? [] : await loadWeights(petName)
      const context = buildPetContext(pet, entries, weights, profile?.displayName || user.displayName || undefined)
      let tracked = false
      for await (const chunk of streamPawGptAnswer({ user, context, messages: history, signal: controller.signal, exempt })) {
        if (!tracked) {
          tracked = true
          void trackEvent("paw_gpt_question", { turn: Math.ceil(history.length / 2), provider: PAW_GPT_PROVIDER })
        }
        updateItem(chatId, answerId, (item) => ({ content: item.content + chunk }))
      }
      updateItem(chatId, answerId, (item) =>
        item.content.trim()
          ? { pending: false }
          : { pending: false, error: true, content: "Paw GPT didn't return an answer. Please try again." }
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        updateItem(chatId, answerId, (item) =>
          item.content.trim() ? { pending: false } : { pending: false, error: true, content: "Stopped." }
        )
      } else if (error instanceof PawGptError) {
        if (error.code) setLimitDialogOpen(true)
        // Keep whatever was already streamed and add the explanation after it.
        updateItem(chatId, answerId, (item) => ({
          pending: false,
          error: true,
          content: item.content.trim() ? `${item.content}\n\n_${error.message}_` : error.message,
        }))
      } else {
        console.error("Paw GPT request failed:", error)
        updateItem(chatId, answerId, {
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

  // Ask the failed question again in place of the failed turn
  const retry = (answerId: string) => {
    const thread = activeChat?.items ?? []
    const index = thread.findIndex((item) => item.id === answerId)
    const question = thread[index - 1]
    if (index < 1 || question?.role !== "user") return
    void send(question.content, thread.slice(0, index - 1))
  }

  // The current chat stays in history; the window starts empty.
  const startNewChat = () => {
    if (streaming) abortRef.current?.abort()
    setActiveChatId(null)
    window.setTimeout(() => inputRef.current?.focus(), 50)
  }

  const openChat = (chatId: string, messageId?: string) => {
    const chat = chats.find((entry) => entry.id === chatId)
    if (!chat) return
    if (streaming && chat.id !== activeChatId) abortRef.current?.abort()
    setSelectedPet(chat.petName)
    setActiveChatId(chat.id)
    if (messageId) {
      window.setTimeout(() => document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80)
    }
  }

  // "Log food" from an answer: same entry the Food Logger saves, for today. Added to the
  // loaded logs too, so Paw GPT's next answer already knows about it.
  const handleSaveMeal = async (draft: MealDraft) => {
    if (!user) return
    try {
      const saved = await savePetLoggerEntry({ ...draft, userId: user.uid, loggedOn: toDateKey(new Date()) })
      setEntries((current) => [saved, ...current])
      toast.success(`${mealLabels[saved.mealType]} logged for ${saved.petName}.`, {
        action: { label: "Open logger", onClick: () => router.push("/logger") },
      })
      void trackEvent("meal_logged", {
        meal_type: saved.mealType,
        quality: saved.feedQuality,
        with_details: Boolean(saved.quantity || saved.waterMl !== undefined || saved.treats || saved.notes),
      })
    } catch (error) {
      console.error("Unable to save the food log from Paw GPT:", error)
      toast.error("Could not save this food log.")
      // Keeps the dialog open so nothing typed is lost.
      throw error
    }
  }

  const clearHistory = () => {
    if (streaming) abortRef.current?.abort()
    setChats([])
    setActiveChatId(null)
    try {
      if (user) window.localStorage.removeItem(`${CHATS_KEY}:${user.uid}`)
    } catch {
      // storage unavailable; nothing saved to clear
    }
    toast.success("Chat history cleared.")
  }

  if (authLoading || !user) {
    return <AdminLoader img={Paw} title="Opening Paw GPT" />
  }

  const firstName = (profile?.displayName || user.displayName || "").split(" ")[0]
  const PetIcon = petIcon(pet)

  // What drifts by in the moving banner while an answer is on its way:
  // earlier questions in this chat, then the record Paw GPT is reading.
  const ticker = (() => {
    if (!pet) return []
    const asked = messages
      .filter((item) => item.role === "user")
      .slice(0, -1)
      .reverse()
      .slice(0, 6)
      .map((item) => `You asked: ${item.content}`)
    if (pet.planning) return [...asked, petSubtitle(pet)]
    const meals = entries.filter((entry) => entry.petName === pet.name).length
    const weighIns = weightsByPet[pet.name]?.length ?? 0
    const status = weightStatusOf(pet)
    return [
      ...asked,
      petSubtitle(pet),
      `${meals} meal${meals === 1 ? "" : "s"} logged in ${PAW_GPT_LIMITS.mealLogDays} days`,
      weighIns ? `${weighIns} weigh-in${weighIns === 1 ? "" : "s"} on record` : "No weigh-ins yet",
      status ? `Weight status: ${status}` : "",
    ].filter(Boolean)
  })()

  // One entry per conversation, newest first; each lists the questions asked in it
  const chatSummaries: ChatSummary[] = [...chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((chat) => ({
      id: chat.id,
      petName: chat.petName,
      updatedAt: chat.updatedAt,
      questions: chat.items.filter((item) => item.role === "user").map((item) => ({ id: item.id, text: item.content })),
    }))
    .filter((chat) => chat.questions.length > 0)

  const dockProps = {
    user,
    profile,
    pets,
    loading: loadingData,
    mealsLogged: entries.length,
    selectedPet: selectedPet === PLANNING_PET_NAME ? "Planning a pet" : selectedPet,
    onSelectPet: selectPet,
    chats: chatSummaries,
    activeChatId: activeChat?.id ?? null,
    streaming,
    onOpenChat: openChat,
    onNewChat: startNewChat,
    onClearHistory: clearHistory,
    quota,
  }

  // Before the first words arrive the thinking card carries the banner; after that, the header does
  const writing = streaming && Boolean(messages.at(-1)?.content)

  return (
    <div className="relative flex h-dvh flex-col">
      {/* Sky tint for the time of day */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b ${phaseCopy[phase].sky} to-transparent transition-colors duration-700`}
      />

      {/* Floating liquid-glass top bar, fixed at the top: the conversation scrolls underneath it
          (blurred through the glass) instead of a pill sitting in the middle of an answer.
          Phones: pets menu · pet · New chat · Home. Wider screens: the pets dock floats below it. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5">
        <div className="paw-liquid-glass pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-[1.75rem]">
        {/* Pet details on the left, New chat + profile on the right (phones add the pets menu first). */}
        <div className="flex h-14 items-center gap-2 px-2 sm:gap-3 sm:px-2.5">
          <ProfileSidebar {...dockProps} />

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_4px_12px_-4px_rgba(249,115,22,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] ${
                streaming ? "paw-gpt-anim-breathe" : ""
              }`}
            >
              {pet ? <PetIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-bold tracking-tight">
                {pet?.planning ? "Planning a pet" : pet?.name || "Paw GPT"}
              </span>
              <span className={`block truncate text-xs ${streaming ? "paw-gpt-anim-shimmer font-medium text-foreground/60" : "text-muted-foreground"}`}>
                {streaming
                  ? "Paw GPT is answering…"
                  : pet
                    ? petSubtitle(pet) || "Paw GPT"
                    : loadingData ? "Finding your pets…" : "Your pet's AI care companion"}
              </span>
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={startNewChat}
                aria-label="New chat"
                title="New chat"
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-orange-500/10 px-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-500/15 active:scale-95 sm:px-4 dark:text-orange-300"
              >
                <SquarePen className="h-4 w-4" />
                <span className="hidden sm:inline">New chat</span>
              </button>
            )}
            <ChatHomeButton />
          </div>
        </div>

        {/* While an answer is being written: earlier questions and record facts drift by */}
        <div className={`grid transition-[grid-template-rows,opacity] duration-500 ${writing && ticker.length ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0 overflow-hidden">
            <HistoryTicker items={ticker} className="border-t border-black/5 py-2 dark:border-white/10" />
          </div>
        </div>
        </div>
      </header>

      {/* Floating dock from tablet width up (below the top bar); phones use the sidebar in the bar. */}
      <ProfileDock {...dockProps} />

      {/* Greeting or conversation; padding clears the fixed top bar */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 pt-[calc(5.5rem+env(safe-area-inset-top))] sm:px-6">
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
            <div className="space-y-5">
              {messages.map((item, index) => (
                <ChatMessage
                  key={item.id}
                  item={item}
                  petName={pet?.name}
                  petKind={isCatPet(pet) ? "cat" : "dog"}
                  planning={Boolean(pet?.planning)}
                  onRetry={item.error && !streaming ? () => retry(item.id) : undefined}
                  onLogFood={
                    pet && !pet.planning && item.role === "assistant" && !item.error && isFoodRelated(item.content, messages[index - 1]?.content)
                      ? () => setMealOpen(true)
                      : undefined
                  }
                  quickReads={
                    item.pending && !item.content
                      ? pickQuickReads(allQuickReads, messages[index - 1]?.content ?? "", pet && !pet.planning ? (isCatPet(pet) ? "cat" : "dog") : null)
                      : undefined
                  }
                  onOpenQuickRead={setQuickView}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="relative px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-6 md:pb-5">
        {pet && (
          <PromptDock
            pet={pet}
            open={promptsOpen}
            disabled={limitReached || streaming}
            onClose={() => setPromptsOpen(false)}
            onPick={(prompt) => {
              setInput(prompt)
              window.setTimeout(() => {
                const el = inputRef.current
                if (!el) return
                el.focus()
                el.setSelectionRange(prompt.length, prompt.length)
              }, 0)
            }}
          />
        )}
        <div className="paw-glass mx-auto max-w-3xl rounded-[1.75rem] p-2 transition focus-within:ring-4 focus-within:ring-orange-500/15">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={PAW_GPT_LIMITS.maxMessageChars}
            disabled={limitReached}
            placeholder={
              limitReached
                ? `${limitMessage}. Ask again after midnight.`
                : pet?.planning
                  ? "Ask anything about getting a new pet…"
                  : pet
                    ? `Ask anything about ${pet.name}…`
                    : pets.length ? "Select your pet, then ask a question…" : "Add a pet, or choose Planning a pet…"
            }
            aria-label="Ask Paw GPT"
            className="block max-h-40 w-full resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
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
                <DropdownMenuItem onSelect={() => selectPet(PLANNING_PET_NAME)} className="rounded-lg px-2.5 py-2">
                  <Heart />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">Planning a pet</span>
                    <span className="block truncate text-xs text-muted-foreground">Choosing and preparing for one</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2">
                  <Link href="/pet-feed">
                    <Plus /> Add a pet
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {pet && (
              <button
                type="button"
                aria-pressed={promptsOpen}
                aria-label={promptsOpen ? "Hide suggested questions" : "Show suggested questions"}
                title="Suggested questions"
                onClick={() => setPromptsOpen(!promptsOpen)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                  promptsOpen ? "bg-orange-500/15 text-orange-700 dark:text-orange-300" : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Prompts</span>
              </button>
            )}

            {quota && (
              <button
                type="button"
                onClick={() => setLimitDialogOpen(true)}
                className={`ml-auto mr-1 flex min-w-0 flex-col items-end rounded-lg px-1 text-[11px] font-semibold leading-tight tabular-nums transition hover:bg-black/5 dark:hover:bg-white/10 ${
                  limitReached
                    ? "text-rose-600"
                    : (quota.questionsLeft !== null && quota.questionsLeft <= 2) || quota.tokensLeft < quota.tokenLimit * 0.2
                      ? "text-amber-600"
                      : quota.hasPass ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground"
                }`}
                aria-live="polite"
                title={`${quota.tokensUsed.toLocaleString("en-IN")} of ${quota.tokenLimit.toLocaleString("en-IN")} tokens used today. Tap for details.`}
              >
                <span className="whitespace-nowrap">
                  {quota.questionsLeft === null ? "Daily Pass" : `${quota.questionsLeft}/${PAW_GPT_DAILY_LIMIT} questions left`}
                </span>
                <span className="whitespace-nowrap font-medium opacity-80">
                  {compactTokens(quota.tokensUsed)}/{compactTokens(quota.tokenLimit)} tokens
                </span>
              </button>
            )}

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
                disabled={!input.trim() || limitReached}
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

      <QuickViewDialog read={quickView} onOpenChange={(open) => !open && setQuickView(null)} />

      {quota && (
        <UsageLimitDialog
          open={limitDialogOpen}
          onOpenChange={setLimitDialogOpen}
          quota={quota}
          petName={pet && !pet.planning ? pet.name : undefined}
          petKind={isCatPet(pet) ? "cat" : "dog"}
        />
      )}

      {/* Same dialog as the Food Logger: meal, food, quality, plus water, treats and notes on habits */}
      <MealDialog
        open={mealOpen}
        onOpenChange={setMealOpen}
        date={new Date()}
        pets={loggerPets}
        defaultPetName={pet?.name ?? ""}
        onSave={handleSaveMeal}
      />
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
        ) : pets.length === 0 && !pet ? (
          // No pets yet: add one, or plan one with Paw GPT
          <div className="mx-auto grid w-full max-w-lg gap-3 sm:grid-cols-2">
            <Link
              href="/pet-feed"
              className="paw-glass group flex flex-col items-center gap-2 rounded-[1.6rem] p-5 text-center transition hover:-translate-y-0.5 hover:ring-2 hover:ring-orange-400/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-sm font-black">I have a pet</span>
              <span className="text-xs leading-snug text-muted-foreground">
                Add them in Pet Feed and I&apos;ll answer from their profile, meals and weigh-ins.
              </span>
              <span className="mt-1 text-xs font-bold text-orange-600 group-hover:underline">Add your pet →</span>
            </Link>
            <button
              type="button"
              onClick={() => onSelectPet(PLANNING_PET_NAME)}
              className="paw-glass group flex flex-col items-center gap-2 rounded-[1.6rem] p-5 text-center transition hover:-translate-y-0.5 hover:ring-2 hover:ring-orange-400/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-500/25">
                <Heart className="h-5 w-5" />
              </span>
              <span className="text-sm font-black">Planning a pet?</span>
              <span className="text-xs leading-snug text-muted-foreground">
                Dog or cat, the right breed, costs in ₹ and a first-week checklist. Let&apos;s plan it together.
              </span>
              <span className="mt-1 text-xs font-bold text-rose-600 group-hover:underline">Start planning →</span>
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              {pet?.planning ? "Let's plan your new pet" : pet ? `Ask me about ${pet.name}` : "Who are we caring for today?"}
            </p>
            <div role="radiogroup" aria-label="Choose a pet" className="mt-3 flex flex-wrap justify-center gap-2">
              {[...pets, planningPet].map((item) => {
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
                    {item.planning ? "Planning a pet" : item.name}
                  </button>
                )
              })}
            </div>

            {pet && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {(pet.planning
                  ? promptLibrary(pet).flatMap((group) => group.prompts).slice(0, 4).map(({ label, prompt }) => ({ title: label, description: prompt, prompt }))
                  : reportPrompts(pet.name)
                ).map((item) => (
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
            {pet?.planning && pets.length === 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Already have your pet?{" "}
                <Link href="/pet-feed" className="font-semibold text-orange-600 hover:underline">
                  Add them in Pet Feed
                </Link>{" "}
                for answers based on their own record.
              </p>
            )}
            {pet && !pet.planning && !pet.profile && !pet.report && (
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
