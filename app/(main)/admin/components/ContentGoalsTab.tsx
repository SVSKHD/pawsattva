"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "firebase/auth"
import {
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Edit3,
  Grid2X2,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  UserRound,
} from "lucide-react"
import { FaInstagram } from "react-icons/fa"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  addContentGoal,
  ContentGoal,
  ContentGoalType,
  deleteContentGoal,
  onContentGoalsSnapshot,
  updateContentGoal,
} from "@/firebase/firestore"

type GoalFilter = "all" | ContentGoalType
type GoalView = "board" | "list"

interface ContentGoalsTabProps {
  currentUser: User | null
}

interface GoalFormState {
  title: string
  description: string
  deadline: string
  type: ContentGoalType
}

const EMPTY_FORM: GoalFormState = {
  title: "",
  description: "",
  deadline: "",
  type: "blog",
}

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

function formatDate(value: string) {
  const parsed = deadlineDate(value)
  if (!parsed) return "No deadline"
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function deadlineLabel(goal: ContentGoal) {
  if (goal.status === "completed") return "Satisfied"
  const deadline = deadlineDate(goal.deadline)
  if (!deadline) return "No deadline"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((deadline.getTime() - today.getTime()) / DAY_MS)
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
  if (days === 0) return "Due today"
  if (days === 1) return "1 day left"
  return `${days} days left`
}

function timelineProgress(goal: ContentGoal) {
  if (goal.status === "completed") return 100
  const created = toDate(goal.createdAt)
  const deadline = deadlineDate(goal.deadline)
  if (!created || !deadline) return 0
  const total = Math.max(deadline.getTime() - created.getTime(), DAY_MS)
  const elapsed = Date.now() - created.getTime()
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

function satisfiedIn(goal: ContentGoal) {
  const created = toDate(goal.createdAt)
  const completed = toDate(goal.completedAt)
  if (!created || !completed) return "just now"
  const minutes = Math.max(1, Math.round((completed.getTime() - created.getTime()) / 60000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"}`
}

function isOverdue(goal: ContentGoal) {
  const deadline = deadlineDate(goal.deadline)
  if (!deadline || goal.status === "completed") return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return deadline.getTime() < today.getTime()
}

export function ContentGoalsTab({ currentUser }: ContentGoalsTabProps) {
  const [goals, setGoals] = useState<ContentGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<GoalFilter>("all")
  const [view, setView] = useState<GoalView>("board")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<ContentGoal | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<ContentGoal | null>(null)
  const [form, setForm] = useState<GoalFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyGoalId, setBusyGoalId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onContentGoalsSnapshot(
      (nextGoals) => {
        setGoals(nextGoals)
        setLoading(false)
      },
      () => {
        setLoading(false)
        toast.error("Could not load content goals.")
      }
    )
    return unsubscribe
  }, [])

  const filteredGoals = useMemo(
    () => goals.filter(goal => filter === "all" || goal.type === filter),
    [filter, goals]
  )
  const activeGoals = filteredGoals.filter(goal => goal.status === "active")
  const completedGoals = filteredGoals.filter(goal => goal.status === "completed")
  const overdueCount = goals.filter(isOverdue).length

  const actor = {
    id: currentUser?.uid || "unknown-admin",
    name: currentUser?.displayName || currentUser?.email || "Admin",
  }

  const openCreateDialog = () => {
    setEditingGoal(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (goal: ContentGoal) => {
    setEditingGoal(goal)
    setForm({
      title: goal.title,
      description: goal.description,
      deadline: goal.deadline,
      type: goal.type,
    })
    setDialogOpen(true)
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open && !saving) {
      setEditingGoal(null)
      setForm(EMPTY_FORM)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim() || !form.description.trim() || !form.deadline) {
      toast.error("Title, description, and deadline are required.")
      return
    }

    setSaving(true)
    try {
      if (editingGoal) {
        await updateContentGoal(editingGoal.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          deadline: form.deadline,
          type: form.type,
          updatedBy: actor.id,
          updatedByName: actor.name,
        })
        toast.success("Goal updated for every admin.")
      } else {
        await addContentGoal({
          title: form.title.trim(),
          description: form.description.trim(),
          deadline: form.deadline,
          type: form.type,
          status: "active",
          createdBy: actor.id,
          createdByName: actor.name,
          updatedBy: actor.id,
          updatedByName: actor.name,
        })
        toast.success("Content goal created.")
      }
      setDialogOpen(false)
      setEditingGoal(null)
      setForm(EMPTY_FORM)
    } catch {
      toast.error(editingGoal ? "Could not update the goal." : "Could not create the goal.")
    } finally {
      setSaving(false)
    }
  }

  const toggleGoalStatus = async (goal: ContentGoal) => {
    const nextStatus = goal.status === "completed" ? "active" : "completed"
    setBusyGoalId(goal.id)
    try {
      await updateContentGoal(goal.id, {
        status: nextStatus,
        updatedBy: actor.id,
        updatedByName: actor.name,
      })
      toast.success(nextStatus === "completed" ? "Goal marked as satisfied!" : "Goal reopened.")
    } catch {
      toast.error("Could not change the goal status.")
    } finally {
      setBusyGoalId(null)
    }
  }

  const handleDelete = async () => {
    if (!goalToDelete) return
    setBusyGoalId(goalToDelete.id)
    try {
      await deleteContentGoal(goalToDelete.id)
      toast.success("Content goal deleted.")
      setGoalToDelete(null)
    } catch {
      toast.error("Could not delete the goal.")
    } finally {
      setBusyGoalId(null)
    }
  }

  const GoalCard = ({ goal, compact = false }: { goal: ContentGoal; compact?: boolean }) => {
    const completed = goal.status === "completed"
    const overdue = isOverdue(goal)
    const TypeIcon = goal.type === "blog" ? BookOpen : FaInstagram

    return (
      <article
        className={cn(
          "group relative overflow-hidden rounded-2xl border bg-white/55 p-4 shadow-lg backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:shadow-xl dark:bg-black/35 sm:p-5",
          completed
            ? "border-emerald-500/20"
            : overdue
              ? "border-rose-500/25"
              : goal.type === "blog"
                ? "border-orange-500/20"
                : "border-fuchsia-500/20",
          compact && "sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5"
        )}
      >
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                goal.type === "blog"
                  ? "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                  : "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400"
              )}
            >
              <TypeIcon className="h-3 w-3" />
              {goal.type}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
                completed
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : overdue
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
              )}
            >
              {completed ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
              {deadlineLabel(goal)}
            </span>
          </div>

          <h3 className={cn("text-base font-black tracking-tight sm:text-lg", completed && "text-foreground/70")}>
            {goal.title}
          </h3>
          <p className={cn("mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm", compact && "sm:line-clamp-2")}>
            {goal.description}
          </p>

          <div className="mt-4 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2 sm:text-xs">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span>Deadline: <strong className="text-foreground/75">{formatDate(goal.deadline)}</strong></span>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Created by <strong className="text-foreground/75">{goal.createdByName || "Admin"}</strong></span>
            </div>
          </div>

          {completed ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/8 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Satisfied in {satisfiedIn(goal)}
            </div>
          ) : (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Time used</span>
                <span>{timelineProgress(goal)}%</span>
              </div>
              <Progress
                value={timelineProgress(goal)}
                className={cn("h-1.5", overdue && "[&_[data-slot=progress-indicator]]:bg-rose-500")}
              />
            </div>
          )}

          {goal.updatedByName && goal.updatedByName !== goal.createdByName && (
            <p className="mt-2 text-[10px] text-muted-foreground">Last edited by {goal.updatedByName}</p>
          )}
        </div>

        <div className={cn("mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3", compact && "sm:mt-0 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0")}>
          <Button
            type="button"
            size="sm"
            onClick={() => toggleGoalStatus(goal)}
            disabled={busyGoalId === goal.id}
            className={cn(
              "h-8 rounded-lg border-0 px-3 text-xs font-bold",
              completed
                ? "bg-muted text-foreground hover:bg-muted/80"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {busyGoalId === goal.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : completed ? (
              <RotateCcw className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {completed ? "Reopen" : "Mark satisfied"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-lg border-white/40 bg-white/50 text-amber-600 hover:bg-amber-600 hover:text-white dark:bg-black/30"
            onClick={() => openEditDialog(goal)}
            aria-label={`Edit ${goal.title}`}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-lg border-white/40 bg-white/50 text-destructive hover:bg-destructive hover:text-white dark:bg-black/30"
            onClick={() => setGoalToDelete(goal)}
            aria-label={`Delete ${goal.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </article>
    )
  }

  const EmptyGoals = ({ status }: { status?: "active" | "completed" }) => (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-5 py-12 text-center">
      <Target className="mx-auto h-8 w-8 text-muted-foreground/30" />
      <p className="mt-3 text-sm font-bold">No {status === "completed" ? "satisfied" : status || "matching"} goals</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {status === "completed" ? "Satisfied goals will appear here." : "Create a goal to give the content team a clear target."}
      </p>
    </div>
  )

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-black sm:text-2xl">Content Goals</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Shared targets for the full admin team. Any admin can create, update, satisfy, reopen, or delete a goal.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="h-10 w-full rounded-xl border-0 bg-gradient-to-r from-emerald-600 to-teal-500 px-5 font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-600 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New Goal
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "Active", value: goals.filter(goal => goal.status === "active").length, Icon: CircleDashed, style: "text-sky-600 bg-sky-500/10 border-sky-500/15" },
          { label: "Satisfied", value: goals.filter(goal => goal.status === "completed").length, Icon: CheckCircle2, style: "text-emerald-600 bg-emerald-500/10 border-emerald-500/15" },
          { label: "Overdue", value: overdueCount, Icon: Clock3, style: "text-rose-600 bg-rose-500/10 border-rose-500/15" },
        ].map(({ label, value, Icon, style }) => (
          <div key={label} className={cn("rounded-2xl border p-3 backdrop-blur-xl sm:p-4", style)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider sm:text-xs">{label}</span>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <p className="mt-2 text-2xl font-black sm:text-3xl">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/40 p-2.5 backdrop-blur-2xl dark:border-white/10 dark:bg-black/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-1">
          {([
            ["all", "All goals"],
            ["blog", "Blog"],
            ["instagram", "Instagram"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-xl px-3 py-2 text-[11px] font-bold transition-all sm:text-xs",
                filter === value
                  ? "bg-foreground text-background shadow-md"
                  : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
              )}
            >
              {label}
              <span className="ml-1.5 opacity-60">
                {value === "all" ? goals.length : goals.filter(goal => goal.type === value).length}
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/40 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("board")}
            className={cn("h-8 rounded-lg px-3 text-xs", view === "board" && "bg-background shadow-sm")}
          >
            <Grid2X2 className="h-3.5 w-3.5" />
            Board
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("list")}
            className={cn("h-8 rounded-lg px-3 text-xs", view === "list" && "bg-background shadow-sm")}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border/50 bg-muted/10">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyGoals />
      ) : view === "board" ? (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <CircleDashed className="h-4 w-4 text-sky-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">Active</h3>
              <span className="ml-auto rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400">{activeGoals.length}</span>
            </div>
            {activeGoals.length > 0 ? activeGoals.map(goal => <GoalCard key={goal.id} goal={goal} />) : <EmptyGoals status="active" />}
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Satisfied</h3>
              <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{completedGoals.length}</span>
            </div>
            {completedGoals.length > 0 ? completedGoals.map(goal => <GoalCard key={goal.id} goal={goal} />) : <EmptyGoals status="completed" />}
          </section>
        </div>
      ) : (
        <div className="space-y-3">
          {[...activeGoals, ...completedGoals].map(goal => <GoalCard key={goal.id} goal={goal} compact />)}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border-white/30 bg-white/95 p-5 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-black/95 sm:max-w-lg sm:p-7">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-xl font-black sm:text-2xl">
              {editingGoal ? "Edit content goal" : "Create content goal"}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Your changes are visible to every admin immediately."
                : "Set a clear Blog or Instagram target for the admin team."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Title</Label>
              <Input
                id="goal-title"
                value={form.title}
                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                placeholder="Publish 5 breed-care articles"
                maxLength={120}
                className="h-11 rounded-xl bg-white/60 dark:bg-black/30"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-description">Description</Label>
              <Textarea
                id="goal-description"
                value={form.description}
                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                placeholder="Describe the result the team should reach..."
                maxLength={500}
                className="min-h-28 resize-y rounded-xl bg-white/60 dark:bg-black/30"
              />
              <p className="text-right text-[10px] text-muted-foreground">{form.description.length}/500</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="goal-type">Content type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: ContentGoalType) => setForm(current => ({ ...current, type: value }))}
                >
                  <SelectTrigger id="goal-type" className="h-11 w-full rounded-xl bg-white/60 dark:bg-black/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-deadline">Deadline</Label>
                <Input
                  id="goal-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={event => setForm(current => ({ ...current, deadline: event.target.value }))}
                  className="h-11 rounded-xl bg-white/60 dark:bg-black/30"
                />
              </div>
            </div>
            <DialogFooter className="mx-0 -mb-2 mt-6 rounded-2xl border border-border/50 bg-muted/30 p-3 sm:flex-row">
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => handleDialogChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl border-0 bg-emerald-600 font-bold text-white hover:bg-emerald-700" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingGoal ? "Save changes" : "Create goal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!goalToDelete} onOpenChange={open => !open && setGoalToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-black/95 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Delete content goal?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{goalToDelete?.title}&quot; will be removed for every admin. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl border-0 bg-destructive text-white hover:bg-destructive/90"
              disabled={busyGoalId === goalToDelete?.id}
            >
              {busyGoalId === goalToDelete?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
