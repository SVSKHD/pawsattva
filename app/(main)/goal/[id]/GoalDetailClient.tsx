"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  Share2,
  ShieldAlert,
  Target,
  UserRound,
} from "lucide-react"
import { FaInstagram } from "react-icons/fa"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ContentGoal, onContentGoalSnapshot } from "@/firebase/firestore"
import { cn } from "@/lib/utils"

const DAY_MS = 24 * 60 * 60 * 1000

function toDate(value: unknown) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate()
  }
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function deadlineDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value: unknown, includeTime = false) {
  const parsed = typeof value === "string" ? deadlineDate(value) : toDate(value)
  if (!parsed) return "Not available"
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
}

function goalProgress(goal: ContentGoal) {
  if (goal.status === "completed") return 100
  const created = toDate(goal.createdAt)
  const deadline = deadlineDate(goal.deadline)
  if (!created || !deadline) return 0
  const total = Math.max(deadline.getTime() - created.getTime(), DAY_MS)
  const elapsed = Date.now() - created.getTime()
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

function deadlineStatus(goal: ContentGoal) {
  if (goal.status === "completed") return { label: "Completed", overdue: false }
  const deadline = deadlineDate(goal.deadline)
  if (!deadline) return { label: "Deadline unavailable", overdue: false }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((deadline.getTime() - today.getTime()) / DAY_MS)
  if (days < 0) return { label: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, overdue: true }
  if (days === 0) return { label: "Due today", overdue: false }
  if (days === 1) return { label: "1 day remaining", overdue: false }
  return { label: `${days} days remaining`, overdue: false }
}

function satisfiedIn(goal: ContentGoal) {
  const created = toDate(goal.createdAt)
  const completed = toDate(goal.completedAt)
  if (!created || !completed) return "Completed"
  const minutes = Math.max(1, Math.round((completed.getTime() - created.getTime()) / 60000))
  if (minutes < 60) return `Satisfied in ${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Satisfied in ${hours} hour${hours === 1 ? "" : "s"}`
  const days = Math.round(hours / 24)
  return `Satisfied in ${days} day${days === 1 ? "" : "s"}`
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/8 p-5 shadow-xl backdrop-blur-2xl">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
      <div>
        <p className="font-black">Opening private goal</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export function GoalDetailClient({ goalId }: { goalId: string }) {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()
  const [goal, setGoal] = useState<ContentGoal | null>(null)
  const [loadingGoal, setLoadingGoal] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/goal/${goalId}`)}`)
      return
    }
    if (!isAdmin) {
      return
    }

    return onContentGoalSnapshot(
      goalId,
      (nextGoal) => {
        setGoal(nextGoal)
        setLoadingGoal(false)
      },
      () => {
        setLoadError("This goal could not be loaded. Check the contentGoals Firestore permissions.")
        setLoadingGoal(false)
      }
    )
  }, [authLoading, goalId, isAdmin, router, user])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Private goal link copied.")
    } catch {
      toast.error("Could not copy the goal link.")
    }
  }

  if (authLoading) return <LoadingState message="Checking your login..." />
  if (!user) return <LoadingState message="Taking you to secure login..." />

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-xl items-center px-4 py-28">
        <div className="w-full rounded-[2rem] border border-rose-500/20 bg-white/60 p-7 text-center shadow-2xl backdrop-blur-3xl dark:bg-black/35 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black">Admin access required</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            You are logged in, but this goal is private to PawSattva administrators.
          </p>
          <Button asChild className="mt-6 rounded-xl">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loadingGoal) return <LoadingState message="Loading the latest goal progress..." />

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-xl items-center px-4 py-28">
        <div className="w-full rounded-[2rem] border border-amber-500/20 bg-white/60 p-7 text-center shadow-2xl backdrop-blur-3xl dark:bg-black/35 sm:p-10">
          <RefreshCcw className="mx-auto h-9 w-9 text-amber-600" />
          <h1 className="mt-4 text-2xl font-black">Unable to open goal</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{loadError}</p>
          <Button className="mt-6 rounded-xl" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-xl items-center px-4 py-28">
        <div className="w-full rounded-[2rem] border border-border/60 bg-white/60 p-7 text-center shadow-2xl backdrop-blur-3xl dark:bg-black/35 sm:p-10">
          <Target className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h1 className="mt-4 text-2xl font-black">Goal not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or the shared link is incorrect.</p>
          <Button asChild className="mt-6 rounded-xl">
            <Link href="/admin">Open Content Hub</Link>
          </Button>
        </div>
      </div>
    )
  }

  const completed = goal.status === "completed"
  const progress = goalProgress(goal)
  const deadline = deadlineStatus(goal)
  const TypeIcon = goal.type === "blog" ? BookOpen : FaInstagram

  return (
    <main className="relative overflow-hidden px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-8rem] top-16 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute right-[-8rem] top-1/3 h-96 w-96 rounded-full bg-orange-300/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" className="rounded-xl text-muted-foreground">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              Content Hub
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <LockKeyhole className="h-3 w-3" />
              Admin-only link
            </span>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={copyLink}>
              <Share2 className="h-3.5 w-3.5" />
              Copy link
            </Button>
          </div>
        </div>

        <article className="overflow-hidden rounded-[2rem] border border-white/40 bg-white/60 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-black/35">
          <div className={cn(
            "h-2 w-full",
            completed ? "bg-emerald-500" : deadline.overdue ? "bg-rose-500" : "bg-gradient-to-r from-orange-500 to-amber-400"
          )} />

          <div className="p-5 sm:p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider",
                goal.type === "blog"
                  ? "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                  : "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400"
              )}>
                <TypeIcon className="h-3.5 w-3.5" />
                {goal.type}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider",
                completed
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : deadline.overdue
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
              )}>
                {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                {completed ? "Satisfied" : "In progress"}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">{goal.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{goal.description}</p>

            <div className="mt-8 rounded-2xl border border-border/50 bg-background/55 p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    {completed ? "Goal result" : "Deadline progress"}
                  </p>
                  <p className={cn(
                    "mt-1 text-lg font-black",
                    completed ? "text-emerald-600" : deadline.overdue ? "text-rose-600" : "text-foreground"
                  )}>
                    {completed ? satisfiedIn(goal) : deadline.label}
                  </p>
                </div>
                <p className="text-3xl font-black tabular-nums">{progress}%</p>
              </div>
              <Progress
                value={progress}
                className={cn(
                  "mt-4 h-2.5",
                  completed && "[&_[data-slot=progress-indicator]]:bg-emerald-500",
                  deadline.overdue && "[&_[data-slot=progress-indicator]]:bg-rose-500"
                )}
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/50 bg-background/45 p-4">
                <CalendarClock className="h-5 w-5 text-orange-500" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Deadline</p>
                <p className="mt-1 text-sm font-bold">{formatDate(goal.deadline)}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/45 p-4">
                <UserRound className="h-5 w-5 text-sky-500" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Created by</p>
                <p className="mt-1 truncate text-sm font-bold">{goal.createdByName || "Admin"}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/45 p-4 sm:col-span-2 lg:col-span-1">
                <Edit3 className="h-5 w-5 text-emerald-500" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Last updated</p>
                <p className="mt-1 text-sm font-bold">{formatDate(goal.updatedAt, true)}</p>
                {goal.updatedByName && <p className="mt-0.5 truncate text-xs text-muted-foreground">by {goal.updatedByName}</p>}
              </div>
            </div>

            {completed && goal.completedAt && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/8 p-4 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-black">Goal satisfied</p>
                  <p className="mt-0.5 text-xs opacity-80">Completed on {formatDate(goal.completedAt, true)}</p>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  )
}
