"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { subDays } from "date-fns"
import { ArrowUp, Cat, ChevronDown, CircleHelp, Dog, FileText, Heart, Home, LogIn, PawPrint, Plus, Sparkles, SquarePen, Square, User } from "lucide-react"
import { toast } from "sonner"

import { doc, onSnapshot } from "firebase/firestore"

import { db } from "@/firebase/db"
import { getUserPetFeeds, getUserProfile, type UserProfile } from "@/firebase/firestore"
import { trackEvent } from "@/firebase/analytics"
import { useAuth } from "@/components/auth-provider"
import { imageUrlProblem } from "@/lib/image-hosts"
import { useAuthDialog } from "@/components/auth-dialog-provider"
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
  PAW_GPT_GUEST_LIMIT,
  PAW_GPT_LIMITS,
  PAW_GPT_SUBSCRIPTION,
  pawGptDayKey,
  pawGptSubscriptionPath,
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
  GUEST_PET_NAME,
  GUEST_PROMPTS,
  guestPet,
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
import { FloatingRail } from "./components/floating-rail"
import { ProfileDock, ProfileSidebar, type ChatSummary, type PawGptQuota } from "./components/profile-dock"
import { PromptDock, usePromptDockOpen } from "./components/prompt-dock"
import { UsageLimitDialog } from "./components/usage-limit-dialog"
import { WalkthroughDialog, walkthroughSeen } from "./components/walkthrough-dialog"
import { ChatHomeButton } from "../chat-home-button"
import { pickQuickReads, QuickViewDialog, relatedReads, useQuickReads, type QuickRead } from "./components/quick-reads"
import { ReadsPanel, type ReadsPanelContent } from "./components/reads-panel"
import { ScrollArrows } from "./components/scroll-arrows"

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

export function PawGptClient({ initialQuestion }: { initialQuestion?: string }) {
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
  // Visitors who aren't signed in get a few free general questions, then sign in for more.
  const guest = !authLoading && !user
  const { requestSignIn } = useAuthDialog()
  // Free guest questions left, as last reported by the server (null until the first answer).
  const [guestLeft, setGuestLeft] = useState<number | null>(null)
  // Whose chats these are in this browser: the account, or "guest" before signing in.
  const owner = user?.uid ?? (guest ? "guest" : null)

  // Restore this account's (or this browser's guest) earlier chats
  useEffect(() => {
    if (!owner) return
    setChats(loadChats(owner))
    setActiveChatId(null)
    setChatsOwner(owner)
  }, [owner])

  // Save finished turns only, so a reload never shows a half-written answer
  useEffect(() => {
    if (!owner || chatsOwner !== owner || streaming) return
    const finished = chats
      .map((chat) => ({ ...chat, items: chat.items.filter((item) => !item.pending).slice(-MAX_SAVED_PER_CHAT) }))
      .filter((chat) => chat.items.length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SAVED_CHATS)
    try {
      window.localStorage.setItem(`${CHATS_KEY}:${owner}`, JSON.stringify(finished))
    } catch {
      // storage unavailable; history just lasts for this visit
    }
  }, [streaming, chats, chatsOwner, owner])

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
  // Paw GPT Plus: when it runs out (ms since epoch), 0 for none
  const [plusUntil, setPlusUntil] = useState(0)
  useEffect(() => {
    if (!user || exempt) return
    return onSnapshot(
      doc(db, pawGptSubscriptionPath(user.uid)),
      (snapshot) => setPlusUntil(snapshot.get("activeUntil")?.toMillis?.() ?? 0),
      () => setPlusUntil(0)
    )
  }, [user, exempt])
  const quota: PawGptQuota | null = (() => {
    if (exempt || !usageToday) return null
    const subscribed = plusUntil > Date.now()
    const hasPass = usageToday.passTokenLimit > 0 || subscribed
    const tokenLimit = subscribed
      ? Math.max(usageToday.passTokenLimit, PAW_GPT_SUBSCRIPTION.dailyTokenLimit)
      : hasPass ? usageToday.passTokenLimit : PAW_GPT_DAILY_TOKEN_LIMIT
    return {
      hasPass,
      subscribed,
      // A Daily Pass or Plus removes the question cap; only its tokens count.
      questionsLeft: hasPass ? null : Math.max(0, PAW_GPT_DAILY_LIMIT - usageToday.questions),
      questionsUsed: usageToday.questions,
      tokensUsed: usageToday.tokens,
      tokenLimit,
      tokensLeft: Math.max(0, tokenLimit - usageToday.tokens),
    }
  })()
  const limitReached = Boolean(quota && (quota.questionsLeft === 0 || quota.tokensLeft === 0))
  const limitMessage = quota?.subscribed
    ? `You've used today's ${PAW_GPT_SUBSCRIPTION.name} tokens`
    : quota?.hasPass
    ? "You've used today's Daily Pass"
    : quota?.tokensLeft === 0
      ? `You've used today's ${PAW_GPT_DAILY_TOKEN_LIMIT.toLocaleString("en-IN")} tokens`
      : `You've used today's ${PAW_GPT_DAILY_LIMIT} questions`

  // The "you've been busy" dialog opens by itself the moment the allowance runs out.
  const [limitDialogOpen, setLimitDialogOpen] = useState(false)
  // "How Paw GPT works": opens by itself on a first visit, and from the help buttons any time
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)
  useEffect(() => {
    // Wait until we know who's here, and not when arriving with a question to ask (?q=)
    if (authLoading || initialQuestion || walkthroughSeen()) return
    const timer = window.setTimeout(() => setWalkthroughOpen(true), 900)
    return () => window.clearTimeout(timer)
  }, [authLoading, initialQuestion])
  const [wasLimited, setWasLimited] = useState(false)
  if (limitReached !== wasLimited) {
    setWasLimited(limitReached)
    if (limitReached) setLimitDialogOpen(true)
  }

  // Out of free guest questions: sign in (stays on this page) to keep asking.
  const promptSignIn = useCallback(
    () =>
      requestSignIn({
        title: "Sign in to keep asking Paw GPT",
        description: `You've used your ${PAW_GPT_GUEST_LIMIT} free questions. Sign in with Google — it's free — for ${PAW_GPT_DAILY_LIMIT} questions a day, answered from your own pet's profile, meals and weigh-ins.`,
        successMessage: "You're signed in. Ask away!",
      }),
    [requestSignIn]
  )
  const guestLimitReached = guest && guestLeft === 0

  // Profile, saved assessments and recent food logs. Guests have none: they ask in general.
  useEffect(() => {
    if (!user) {
      setProfile(null)
      setPets([])
      setEntries([])
      setWeightsByPet({})
      setSelectedPet(authLoading ? "" : GUEST_PET_NAME)
      setLoadingData(authLoading)
      return
    }
    setSelectedPet("")
    setLoadingData(true)
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
  }, [user, authLoading])

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
    if (selectedPet && selectedPet !== PLANNING_PET_NAME && selectedPet !== GUEST_PET_NAME) void loadWeights(selectedPet)
  }, [loadWeights, selectedPet])

  const pet = guest
    ? guestPet
    : selectedPet === PLANNING_PET_NAME ? planningPet : pets.find((item) => item.name === selectedPet) ?? null
  // Stable reference: the meal dialog resets its form whenever `pets` changes.
  const loggerPets = useMemo(() => pets.map(toLoggerPet), [pets])
  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId && chat.petName === selectedPet) ?? null,
    [chats, activeChatId, selectedPet]
  )
  const messages = useMemo(() => activeChat?.items ?? [], [activeChat])

  // ── Reading panel (laptops and up) ───────────────────────────────────────────
  // When an answer is slow, related blog posts open on the right half like an artifact, and
  // stay until the person closes them. A later slow question refreshes the list.
  const lastItem = messages.at(-1)
  const waitingForAnswer = streaming && lastItem?.role === "assistant" && Boolean(lastItem.pending) && !lastItem.content
  const waitingQuestion = waitingForAnswer ? messages.at(-2)?.content ?? "" : ""
  const readsKind: "dog" | "cat" | null = pet && !pet.planning ? (isCatPet(pet) ? "cat" : "dog") : null
  const [readsPanel, setReadsPanel] = useState<ReadsPanelContent | null>(null)
  useEffect(() => {
    if (!waitingForAnswer || !allQuickReads.length) return
    const timer = window.setTimeout(() => {
      setReadsPanel({ question: waitingQuestion, ...relatedReads(allQuickReads, waitingQuestion, readsKind) })
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [waitingForAnswer, waitingQuestion, allQuickReads, readsKind])
  const closeReadsPanel = () => setReadsPanel(null)

  // Keep the newest message in view while answers stream in
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (nearBottom || streaming) el.scrollTo({ top: el.scrollHeight })
  }, [messages, streaming])

  // Answers keep revealing for a moment after the stream ends; stay pinned to the bottom while they
  // grow, unless you've scrolled up to read something.
  const contentRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 0
  useEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!el || !content) return
    let pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    const onScroll = () => {
      pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    }
    const observer = new ResizeObserver(() => {
      if (pinned) el.scrollTo({ top: el.scrollHeight })
    })
    el.addEventListener("scroll", onScroll, { passive: true })
    observer.observe(content)
    return () => {
      el.removeEventListener("scroll", onScroll)
      observer.disconnect()
    }
  }, [hasMessages, authLoading])

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
    if ((!user && !guest) || streaming || !question) return
    if (guestLimitReached) {
      promptSignIn()
      return
    }
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
      const context = buildPetContext(pet, entries, weights, profile?.displayName || user?.displayName || undefined)
      let tracked = false
      // Chunks arrive every few characters; render at most once per frame so long answers
      // don't re-parse the whole Markdown on every chunk.
      let buffered = ""
      let frame = 0
      const flush = () => {
        frame = 0
        if (!buffered) return
        const text = buffered
        buffered = ""
        updateItem(chatId, answerId, (item) => ({ content: item.content + text }))
      }
      try {
        for await (const chunk of streamPawGptAnswer({
          user,
          context,
          messages: history,
          signal: controller.signal,
          exempt,
          onGuestRemaining: setGuestLeft,
        })) {
          if (!tracked) {
            tracked = true
            void trackEvent("paw_gpt_question", { turn: Math.ceil(history.length / 2), provider: PAW_GPT_PROVIDER, guest: !user })
          }
          buffered += chunk
          if (!frame) frame = requestAnimationFrame(flush)
        }
      } finally {
        // Whatever arrived before the end, a stop or an error is shown before the outcome below.
        cancelAnimationFrame(frame)
        flush()
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
        if (error.code === "sign-in-required") {
          setGuestLeft(0)
          promptSignIn()
        } else if (error.code) setLimitDialogOpen(true)
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

  // A question from the home page (?q=): ask it as soon as a pet is chosen. With one pet
  // that happens straight away; otherwise it waits in the composer while they pick.
  const pendingQuestion = useRef(initialQuestion)
  const [questionShown, setQuestionShown] = useState(false)
  useEffect(() => {
    const question = pendingQuestion.current
    if (!question || (!user && !guest) || loadingData) return
    if (!questionShown) {
      setQuestionShown(true)
      setInput(question)
      // Drop ?q= so a reload doesn't ask it again
      window.history.replaceState(null, "", "/paw-gpt")
    }
    if (!pet) return
    pendingQuestion.current = undefined
    void send(inputRef.current?.value || question)
    // send is recreated every render; this should only react to the pet/data becoming ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, guest, loadingData, pet, questionShown])

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
      if (owner) window.localStorage.removeItem(`${CHATS_KEY}:${owner}`)
    } catch {
      // storage unavailable; nothing saved to clear
    }
    toast.success("Chat history cleared.")
  }

  if (authLoading) {
    return <AdminLoader img={Paw} title="Opening Paw GPT" />
  }

  const firstName = (profile?.displayName || user?.displayName || "").split(" ")[0]
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

  // Who we're talking about (left) and New chat / Sign in / Home (right): the top bar on wider screens,
  // the bar above the composer on phones
  const barIdentity = (
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
          {pet?.guest ? "Paw GPT" : pet?.planning ? "Planning a pet" : pet?.name || "Paw GPT"}
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
  )
  const barActions = (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      {messages.length > 0 && (
        <button
          type="button"
          onClick={startNewChat}
          aria-label="New chat"
          title="New chat"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-orange-500/10 px-3 text-sm font-semibold text-orange-700 paw-liquid-press hover:bg-orange-500/15 sm:px-4 dark:text-orange-300"
        >
          <SquarePen className="h-4 w-4" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      )}
      {guest && (
        <button
          type="button"
          onClick={() =>
            requestSignIn({
              title: "Sign in to Paw GPT",
              description: `Free with Google: ${PAW_GPT_DAILY_LIMIT} questions a day, answered from your own pet's profile, meals and weigh-ins.`,
            })
          }
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-orange-500 px-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 active:scale-95 sm:px-4"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign in</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => setWalkthroughOpen(true)}
        data-tour="help"
        aria-label="How Paw GPT works"
        title="How Paw GPT works"
        className="paw-liquid-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/70 hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-300"
      >
        <CircleHelp className="h-[18px] w-[18px]" />
      </button>
      <ChatHomeButton />
    </div>
  )

  return (
    <div className="relative flex h-dvh flex-col">
      {/* Sky tint for the time of day */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b ${phaseCopy[phase].sky} to-transparent transition-colors duration-700`}
      />
      {/* Liquid ambience: soft colour drifting behind the glass, a little livelier while answering */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          className={`paw-gpt-anim-blob absolute -left-32 top-[18%] size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.2),transparent_65%)] transition-opacity duration-1000 ${
            streaming ? "opacity-100" : "opacity-50"
          }`}
        />
        <span
          className={`paw-gpt-anim-blob absolute -right-40 bottom-[8%] size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.14),transparent_65%)] transition-opacity duration-1000 ${
            streaming ? "opacity-100" : "opacity-40"
          }`}
          style={{ animationDelay: "-8s", animationDuration: "28s" }}
        />
        <span
          className={`paw-gpt-anim-blob absolute left-1/3 top-[55%] size-[22rem] rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.12),transparent_65%)] transition-opacity duration-1000 ${
            streaming ? "opacity-90" : "opacity-0"
          }`}
          style={{ animationDelay: "-15s", animationDuration: "18s" }}
        />
      </div>

      {/* Wider screens: floating liquid-glass top bar; the conversation scrolls underneath it (blurred
          through the glass), and the pets dock floats below it. Phones keep their controls at the bottom instead. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 hidden px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:block">
        <div className="paw-liquid-glass pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-[1.75rem]">
        <div className="flex h-14 items-center gap-3 px-2.5">
          {barIdentity}
          {barActions}
        </div>

        {/* While an answer is being written: earlier questions and record facts drift by */}
        <div className={`grid transition-[grid-template-rows,opacity] duration-500 ${writing && ticker.length ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0 overflow-hidden">
            <HistoryTicker items={ticker} className="border-t border-black/5 py-2 dark:border-white/10" />
          </div>
        </div>
        </div>
      </header>

      {/* Phones: nothing sits under the status bar / Dynamic Island; the conversation just softly blurs out there */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[calc(env(safe-area-inset-top)+1.5rem)] bg-white/40 backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_55%,transparent)] md:hidden dark:bg-zinc-950/40"
      />

      {/* Phones: a small draggable floating rail instead of a top bar (which would sit under the
          Dynamic Island). Home, New chat, and your avatar, which opens your pets, chats and usage. */}
      <FloatingRail label="Paw GPT" beacon={streaming}>
        <Link
          href="/"
          aria-label="Back to PawSattva home"
          className="flex size-10 items-center justify-center rounded-full text-foreground/75 transition active:scale-90 active:bg-orange-500/10"
        >
          <Home className="size-[19px]" />
        </Link>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={startNewChat}
            aria-label="New chat"
            className="flex size-10 items-center justify-center rounded-full text-foreground/75 transition active:scale-90 active:bg-orange-500/10"
          >
            <SquarePen className="size-[18px]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setWalkthroughOpen(true)}
          data-tour="help"
          aria-label="How Paw GPT works"
          className="flex size-10 items-center justify-center rounded-full text-foreground/75 transition active:scale-90 active:bg-orange-500/10"
        >
          <CircleHelp className="size-[19px]" />
        </button>
        {user ? (
          <ProfileSidebar
            {...dockProps}
            user={user}
            triggerClassName="relative flex size-10 items-center justify-center rounded-full transition active:scale-90"
            trigger={
              <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white ring-2 ring-white shadow-[0_0_14px_rgba(249,115,22,0.35)] dark:ring-zinc-900">
                {user.photoURL && !imageUrlProblem(user.photoURL) ? (
                  <Image src={user.photoURL} alt="" width={36} height={36} className="size-full object-cover" />
                ) : (
                  <User className="size-4" />
                )}
              </span>
            }
          />
        ) : (
          <button
            type="button"
            onClick={promptSignIn}
            aria-label="Sign in"
            className="flex size-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_0_14px_rgba(249,115,22,0.45)] transition active:scale-90"
          >
            <LogIn className="size-[18px]" />
          </button>
        )}
      </FloatingRail>

      {/* Floating dock from tablet width up (below the top bar); phones use the sidebar in the bar. */}
      {user && <ProfileDock {...dockProps} user={user} />}

      {/* Greeting or conversation; padding clears the fixed top bar */}
      {/* Not keyed by question: a new list must not close the article being read */}
      {readsPanel && <ReadsPanel content={readsPanel} waiting={waitingForAnswer} onClose={closeReadsPanel} />}

      <div
        ref={scrollRef}
        // No visible scrollbar (wheel, trackpad and touch still scroll); the arrows above the composer navigate.
        className={`relative flex-1 overflow-y-auto px-3 pt-[calc(1rem+env(safe-area-inset-top))] transition-[padding] duration-300 [scrollbar-width:none] sm:px-6 md:pt-[calc(5.5rem+env(safe-area-inset-top))] [&::-webkit-scrollbar]:hidden ${
          readsPanel ? "lg:pr-[50vw]" : ""
        }`}
      >
        {messages.length === 0 ? (
          <Greeting
            phase={phase}
            firstName={firstName}
            pets={pets}
            pet={pet}
            loading={loadingData}
            onSelectPet={selectPet}
            onPrompt={(prompt) => void send(prompt)}
            guestLeft={guest ? guestLeft ?? PAW_GPT_GUEST_LIMIT : null}
            onSignIn={promptSignIn}
            onShowWalkthrough={() => setWalkthroughOpen(true)}
          />
        ) : (
          // Full width on phones: the floating rail tucks away while you scroll instead of reserving a lane
          <div ref={contentRef} className="mx-auto max-w-3xl pb-16 md:pb-6">
            <div className="space-y-5">
              {messages.map((item, index) => (
                <ChatMessage
                  key={item.id}
                  item={item}
                  question={item.role === "assistant" ? messages[index - 1]?.content : undefined}
                  petName={pet?.planning ? undefined : pet?.name}
                  petKind={isCatPet(pet) ? "cat" : "dog"}
                  planning={Boolean(pet?.planning)}
                  general={Boolean(pet?.guest)}
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
      <form
        onSubmit={handleSubmit}
        className={`relative px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 transition-[padding] duration-300 sm:px-6 md:pb-5 ${
          readsPanel ? "lg:pr-[50vw]" : ""
        }`}
      >
        {messages.length > 0 && (
          <ScrollArrows
            scrollRef={scrollRef}
            watch={messages}
            className={`absolute bottom-full right-3 z-10 mb-2 sm:right-6 ${readsPanel ? "lg:right-[calc(50vw+0.75rem)]" : ""}`}
          />
        )}
        {pet && !pet.guest && (
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
        <div data-tour="composer" className="paw-glass relative mx-auto max-w-3xl overflow-hidden rounded-[1.75rem] p-2 transition focus-within:ring-4 focus-within:ring-orange-500/15">
          {/* While answering: light flowing along the top edge */}
          <span aria-hidden className={`pointer-events-none absolute inset-x-8 top-0 h-[2px] overflow-hidden rounded-full transition-opacity duration-500 ${streaming ? "opacity-100" : "opacity-0"}`}>
            {streaming && <span className="paw-gpt-anim-flow absolute inset-0" />}
          </span>
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
                : guestLimitReached
                  ? "Sign in to keep asking Paw GPT…"
                : pet?.guest
                  ? "Ask anything about dogs and cats…"
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
            {guest ? (
              // Guests: free questions left, and signing in for answers about their own pet
              <button
                type="button"
                onClick={promptSignIn}
                data-tour="pet-picker"
                className={`inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                  guestLimitReached
                    ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600"
                    : "bg-orange-500/10 text-orange-700 hover:bg-orange-500/15 dark:text-orange-300"
                }`}
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {guestLimitReached
                    ? "Sign in for more questions"
                    : `${guestLeft ?? PAW_GPT_GUEST_LIMIT}/${PAW_GPT_GUEST_LIMIT} free questions · Sign in for more`}
                </span>
              </button>
            ) : (
            <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  data-tour="pet-picker"
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
            )}

            {pet && !pet.guest && (
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
                data-tour="usage"
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
                className="paw-gpt-anim-morph paw-liquid-press flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim() || limitReached}
                className="paw-gpt-anim-morph paw-liquid-press flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-40"
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

      <WalkthroughDialog
        open={walkthroughOpen}
        onOpenChange={setWalkthroughOpen}
        guest={guest}
        petName={pet && !pet.planning && !pet.guest ? pet.name : pets[0]?.name}
        petKind={isCatPet(pet ?? pets[0] ?? null) ? "cat" : "dog"}
      />

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
  guestLeft,
  onSignIn,
  onShowWalkthrough,
}: {
  phase: DayPhase
  firstName: string
  pets: GptPet[]
  pet: GptPet | null
  loading: boolean
  onSelectPet: (name: string) => void
  onPrompt: (prompt: string) => void
  /** Not signed in: free questions left (null when signed in) */
  guestLeft: number | null
  onSignIn: () => void
  onShowWalkthrough: () => void
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
        {guestLeft !== null ? (
          // Not signed in: general questions, a few for free
          <>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
              {guestLeft > 0
                ? `Try Paw GPT · ${guestLeft} free question${guestLeft === 1 ? "" : "s"} left`
                : "You've used your free questions"}
            </p>
            {guestLeft > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {GUEST_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onPrompt(prompt)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-500/25 paw-liquid-press hover:bg-orange-500/10 dark:text-orange-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-5 text-xs text-muted-foreground">
              <button type="button" onClick={onSignIn} className="font-semibold text-orange-600 hover:underline">
                Sign in
              </button>{" "}
              for {PAW_GPT_DAILY_LIMIT} free questions a day, answered from your own pet&apos;s profile, meals and weigh-ins.
            </p>
          </>
        ) : loading ? (
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
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-500/25 paw-liquid-press hover:bg-orange-500/10 dark:text-orange-300"
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

      <button
        type="button"
        onClick={onShowWalkthrough}
        className="paw-gpt-anim-rise paw-liquid-press mt-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-300"
        style={{ animationDelay: "260ms" }}
      >
        <CircleHelp className="h-3.5 w-3.5" />
        New here? See how Paw GPT works
      </button>
    </div>
  )
}
