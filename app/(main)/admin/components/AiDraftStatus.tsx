import { CheckCircle2, CircleDashed, Eye, PenLine, Rocket, XCircle } from "lucide-react"
import { AI_DRAFT_STATUS_LABEL, type AiDraftStatus } from "@/lib/ai-drafts/types"
import { cn } from "@/lib/utils"

const STATUS_STYLE: Record<AiDraftStatus, { className: string; icon: typeof CheckCircle2 }> = {
  draft: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: CircleDashed },
  in_review: { className: "bg-sky-500/10 text-sky-700 dark:text-sky-400", icon: Eye },
  changes_requested: { className: "bg-orange-500/10 text-orange-700 dark:text-orange-400", icon: PenLine },
  approved: { className: "bg-violet-500/10 text-violet-700 dark:text-violet-400", icon: CheckCircle2 },
  rejected: { className: "bg-red-500/10 text-red-700 dark:text-red-400", icon: XCircle },
  published: { className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: Rocket },
}

export function AiDraftStatusBadge({ status, className }: { status: AiDraftStatus; className?: string }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.draft
  const Icon = style.icon
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", style.className, className)}>
      <Icon className="h-3 w-3" />
      {AI_DRAFT_STATUS_LABEL[status] ?? status}
    </span>
  )
}

export const toDate = (value: unknown): Date | null =>
  value && typeof (value as { toDate?: unknown }).toDate === "function" ? (value as { toDate: () => Date }).toDate() : null
