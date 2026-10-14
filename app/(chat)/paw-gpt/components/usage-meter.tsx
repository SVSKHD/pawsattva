import { Ticket } from "lucide-react"

import { PAW_GPT_DAILY_LIMIT } from "@/lib/paw-gpt"
import { cn } from "@/lib/utils"

/** Today's allowance for a pet parent (admins/authors have none: they're unlimited). */
export interface PawGptQuota {
  /** Daily Pass active: no question cap, a bigger token allowance */
  hasPass: boolean
  /** null with a Daily Pass (unlimited questions) */
  questionsLeft: number | null
  questionsUsed: number
  tokensUsed: number
  tokenLimit: number
  tokensLeft: number
}

const fmt = (value: number) => value.toLocaleString("en-IN")

/** Questions and tokens used today, each with a progress bar. */
export function UsageMeter({ quota, className, showNote = true }: { quota: PawGptQuota; className?: string; showNote?: boolean }) {
  const rows = [
    quota.hasPass
      ? { label: "Questions", value: `${quota.questionsUsed} · unlimited`, share: 0 }
      : { label: "Questions", value: `${quota.questionsUsed} / ${PAW_GPT_DAILY_LIMIT}`, share: quota.questionsUsed / PAW_GPT_DAILY_LIMIT },
    { label: "Tokens", value: `${fmt(quota.tokensUsed)} / ${fmt(quota.tokenLimit)}`, share: quota.tokensUsed / quota.tokenLimit },
  ]
  const done = quota.questionsLeft === 0 || quota.tokensLeft === 0

  return (
    <section aria-label="Today's Paw GPT usage" className={cn("rounded-2xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Today&apos;s usage</p>
        {quota.hasPass && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
            <Ticket className="h-3 w-3" /> Daily Pass
          </span>
        )}
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const share = Math.min(1, Math.max(0, row.share))
          return (
            <div key={row.label}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="font-semibold text-foreground/80">{row.label}</span>
                <span className="tabular-nums text-muted-foreground">{row.value}</span>
              </div>
              <div
                role="progressbar"
                aria-label={`${row.label} used today`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(share * 100)}
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    share >= 1 ? "bg-rose-500" : share >= 0.8 ? "bg-amber-500" : quota.hasPass ? "bg-violet-500" : "bg-orange-500"
                  }`}
                  style={{ width: `${share * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {showNote && (
        <p className={`mt-2 text-[11px] leading-snug ${done ? "font-semibold text-rose-600" : "text-muted-foreground"}`}>
          {done
            ? "You've reached today's limit. It resets at midnight (India time)."
            : "Tokens measure how much text Paw GPT reads and writes, including your pet's record. Resets at midnight."}
        </p>
      )}
    </section>
  )
}
