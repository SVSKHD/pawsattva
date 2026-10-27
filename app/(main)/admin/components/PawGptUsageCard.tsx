"use client"

import { useEffect, useMemo, useState } from "react"
import { collectionGroup, onSnapshot, query, Timestamp, where } from "firebase/firestore"
import { Bot } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

import { db } from "@/firebase/db"
import { auth } from "@/firebase/firebase"
import type { UserProfile } from "@/firebase/firestore"
import { TableCard, theadRowClass, thClass } from "./DataTable"
import { PAW_GPT_DAILY_LIMIT, PAW_GPT_DAILY_PASS, PAW_GPT_DAILY_TOKEN_LIMIT, pawGptDayKey } from "@/lib/paw-gpt"

const DAYS = 14

interface UsageRow {
  uid: string
  day: string
  questions: number
  tokens: number
  inputTokens: number
  outputTokens: number
  /** > 0 when a Daily Pass is active for that day */
  passTokenLimit: number
}

const fmt = (value: number) => Math.round(value).toLocaleString("en-IN")
const compact = (value: number) =>
  value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)

/** "2026-10-5" → "5 Oct" */
const dayLabel = (key: string) => {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })
}

/**
 * Paw GPT usage across all users from users/{uid}/pawGptUsage/{day}
 * (collection-group read, full admins only — see firestore.rules).
 */
export function PawGptUsageCard({ users }: { users: UserProfile[] }) {
  const [rows, setRows] = useState<UsageRow[] | null>(null)
  // When the data arrived; the day buckets are built from this, not the render time.
  const [loadedAt, setLoadedAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [givingPassTo, setGivingPassTo] = useState<string | null>(null)

  // Support / goodwill: today's Daily Pass for one user, granted by the server.
  const givePass = async (uid: string, name: string) => {
    if (!window.confirm(`Give ${name} today's Daily Pass (unlimited questions, up to ${fmt(PAW_GPT_DAILY_PASS.tokenLimit)} tokens)?`)) return
    setGivingPassTo(uid)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch("/api/admin/paw-gpt/daily-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Could not give the Daily Pass.")
      toast.success(data?.granted ? `Daily Pass given to ${name}.` : `${name} already has today's pass.`)
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not give the Daily Pass.")
    } finally {
      setGivingPassTo(null)
    }
  }

  useEffect(() => {
    const since = Timestamp.fromMillis(Date.now() - (DAYS + 1) * 86_400_000)
    return onSnapshot(
      query(collectionGroup(db, "pawGptUsage"), where("updatedAt", ">=", since)),
      (snapshot) => {
        setError(null)
        setLoadedAt(Date.now())
        setRows(snapshot.docs.map((entry) => ({
          uid: entry.ref.parent.parent?.id ?? "",
          day: entry.id,
          questions: Number(entry.get("count") ?? 0),
          tokens: Number(entry.get("tokens") ?? 0),
          inputTokens: Number(entry.get("inputTokens") ?? 0),
          outputTokens: Number(entry.get("outputTokens") ?? 0),
          passTokenLimit: Number(entry.get("passTokenLimit") ?? 0),
        })))
      },
      (failure) => {
        console.error("Paw GPT usage query failed:", failure)
        setError(
          failure.message.includes("index")
            ? "Create the Firestore index for this view (firebase/firestore.indexes.json, or the link in the browser console)."
            : "Couldn't load Paw GPT usage. Check that the latest Firestore rules are deployed."
        )
        setLoadedAt(Date.now())
        setRows([])
      }
    )
  }, [])

  const usersById = useMemo(() => new Map(users.map((profile) => [profile.id, profile])), [users])

  const summary = useMemo(() => {
    if (!rows) return null
    const today = pawGptDayKey(new Date(loadedAt))
    const dayKeys = Array.from({ length: DAYS }, (_, index) => pawGptDayKey(new Date(loadedAt - (DAYS - 1 - index) * 86_400_000)))
    const byDay = new Map(dayKeys.map((key) => [key, { day: dayLabel(key), input: 0, output: 0, questions: 0, users: 0 }]))
    for (const row of rows) {
      const bucket = byDay.get(row.day)
      if (!bucket) continue
      // tokens = input + output; anything recorded without the split shows as input.
      bucket.input += Math.max(0, row.tokens - row.outputTokens)
      bucket.output += row.outputTokens
      bucket.questions += row.questions
      bucket.users += 1
    }

    const todayRows = rows.filter((row) => row.day === today)
    const isStaff = (uid: string) => usersById.get(uid)?.admin === true
    const sum = (list: UsageRow[], key: keyof Pick<UsageRow, "questions" | "tokens" | "inputTokens" | "outputTokens">) =>
      list.reduce((total, row) => total + row[key], 0)
    const periodRows = rows.filter((row) => byDay.has(row.day))

    return {
      chart: [...byDay.values()],
      today: {
        questions: sum(todayRows, "questions"),
        tokens: sum(todayRows, "tokens"),
        users: todayRows.length,
        atLimit: todayRows.filter((row) =>
          !isStaff(row.uid) &&
          (row.passTokenLimit > 0
            ? row.tokens >= row.passTokenLimit
            : row.questions >= PAW_GPT_DAILY_LIMIT || row.tokens >= PAW_GPT_DAILY_TOKEN_LIMIT)
        ).length,
        passes: todayRows.filter((row) => row.passTokenLimit > 0).length,
      },
      period: {
        questions: sum(periodRows, "questions"),
        tokens: sum(periodRows, "tokens"),
        inputTokens: sum(periodRows, "inputTokens"),
        outputTokens: sum(periodRows, "outputTokens"),
      },
      topToday: [...todayRows].sort((a, b) => b.tokens - a.tokens).slice(0, 8),
      isStaff,
    }
  }, [rows, usersById, loadedAt])

  const perQuestion = summary && summary.period.questions ? summary.period.tokens / summary.period.questions : 0

  return (
    <TableCard
      icon={Bot}
      title="Paw GPT usage"
      subtitle={`Per day, India time. Pet parents get ${PAW_GPT_DAILY_LIMIT} questions and ${fmt(PAW_GPT_DAILY_TOKEN_LIMIT)} tokens; staff are counted, not limited.`}
    >
      <div className="space-y-6 pb-5">
        {error && <p className="mx-4 rounded-xl sm:mx-5 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">{error}</p>}

        {!summary ? (
          <div className="space-y-3 px-4 sm:px-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-20 rounded-2xl" />)}</div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 px-4 sm:px-5 lg:grid-cols-4">
              {[
                { label: "Tokens today", value: fmt(summary.today.tokens) },
                { label: "Questions today", value: fmt(summary.today.questions) },
                {
                  label: summary.today.passes ? `Users today · ${summary.today.passes} with Daily Pass` : "Users today",
                  value: `${summary.today.users}${summary.today.atLimit ? ` · ${summary.today.atLimit} at limit` : ""}`,
                },
                { label: `Avg tokens / question (${DAYS}d)`, value: perQuestion ? fmt(perQuestion) : "—" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-xl font-extrabold tracking-tight tabular-nums">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="px-4 sm:px-5">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Last {DAYS} days: {fmt(summary.period.tokens)} tokens ({fmt(summary.period.inputTokens)} input · {fmt(summary.period.outputTokens)} output) over {fmt(summary.period.questions)} questions
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.chart}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={compact} width={48} />
                    <Tooltip formatter={(value) => fmt(Number(value))} />
                    <Legend />
                    <Bar dataKey="input" name="Input tokens" stackId="tokens" fill="#f97316" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="output" name="Output tokens" stackId="tokens" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <p className="mb-2 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:px-5">Top users today</p>
              {summary.topToday.length === 0 ? (
                <p className="px-4 text-sm text-muted-foreground sm:px-5">No Paw GPT questions yet today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`${theadRowClass} border-t`}>
                        <th className={thClass}>User</th>
                        <th className={`${thClass} text-right`}>Questions</th>
                        <th className={`${thClass} text-right`}>Tokens</th>
                        <th className={`${thClass} hidden text-right sm:table-cell`}>In / out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {summary.topToday.map((row) => {
                        const profile = usersById.get(row.uid)
                        const staff = summary.isStaff(row.uid)
                        const hasPass = row.passTokenLimit > 0
                        const share = Math.min(1, row.tokens / (hasPass ? row.passTokenLimit : PAW_GPT_DAILY_TOKEN_LIMIT))
                        return (
                          <tr key={row.uid} className="transition-colors hover:bg-orange-500/[0.04]">
                            <td className="max-w-0 px-4 py-2.5">
                              <p className="truncate font-semibold">
                                {profile?.displayName || profile?.email || row.uid}
                                {staff && <span className="ml-1.5 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-400">Staff</span>}
                                {hasPass && <span className="ml-1.5 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-400">Daily Pass</span>}
                              </p>
                              {!staff && (
                                <div className="mt-1 flex items-center gap-2">
                                  <div className="h-1 w-full max-w-40 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                                    <div className={`h-full rounded-full ${share >= 1 ? "bg-rose-500" : share >= 0.8 ? "bg-amber-500" : hasPass ? "bg-violet-500" : "bg-orange-500"}`} style={{ width: `${share * 100}%` }} />
                                  </div>
                                  {!hasPass && (
                                    <button
                                      type="button"
                                      disabled={givingPassTo === row.uid}
                                      onClick={() => void givePass(row.uid, profile?.displayName || profile?.email || "this user")}
                                      className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-500/30 transition hover:bg-violet-500/10 disabled:opacity-50 dark:text-violet-300"
                                    >
                                      {givingPassTo === row.uid ? "Giving…" : "Give Daily Pass"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{staff || hasPass ? row.questions : `${row.questions}/${PAW_GPT_DAILY_LIMIT}`}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{fmt(row.tokens)}</td>
                            <td className="hidden px-4 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                              {fmt(row.inputTokens)} / {fmt(row.outputTokens)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </TableCard>
  )
}
