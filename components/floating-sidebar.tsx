"use client"

import { useState, type ReactNode } from "react"
import { Check, Copy, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface FloatingSidebarProps {
  /** Short label on the floating tab, e.g. "Tips" */
  triggerLabel: string
  triggerIcon: LucideIcon
  title: string
  description?: string
  side?: "left" | "right"
  children: ReactNode
  /** Optional controlled state */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/**
 * A floating edge tab that opens a slide-in side panel. Content is free-form;
 * use FloatingSidebarSection / FloatingSidebarCode to keep panels consistent.
 */
export function FloatingSidebar({
  triggerLabel,
  triggerIcon: TriggerIcon,
  title,
  description,
  side = "right",
  children,
  open,
  onOpenChange,
  className,
}: FloatingSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`Open ${title}`}
          className={cn(
            "group fixed top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 border border-orange-200 bg-white/95 px-2 py-3 text-orange-700 shadow-lg shadow-orange-950/10 backdrop-blur transition-all hover:bg-orange-50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/25 dark:border-white/10 dark:bg-zinc-900/95 dark:text-orange-300",
            side === "right" ? "right-0 rounded-l-2xl border-r-0 hover:pr-3" : "left-0 rounded-r-2xl border-l-0 hover:pl-3"
          )}
        >
          <TriggerIcon className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] [writing-mode:vertical-rl] rotate-180">
            {triggerLabel}
          </span>
        </button>
      </SheetTrigger>

      <SheetContent
        side={side}
        className={cn("w-full gap-0 p-0 sm:max-w-md", className)}
      >
        <SheetHeader className="border-b border-border/70 bg-gradient-to-br from-orange-50 via-white to-emerald-50 px-5 py-5 pr-12 dark:from-orange-950/30 dark:via-zinc-950 dark:to-emerald-950/20">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
              <TriggerIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-base font-bold">{title}</SheetTitle>
              {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

/** A titled block inside a FloatingSidebar */
export function FloatingSidebarSection({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon?: LucideIcon
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5 text-orange-500" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Monospace snippet with a one-click copy button */
export function FloatingSidebarCode({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(label ? `${label} copied` : "Copied to clipboard")
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Could not copy — select the text and copy it manually.")
    }
  }

  return (
    <div className="group relative rounded-xl border border-border/70 bg-muted/40">
      {label && (
        <p className="border-b border-border/60 px-3 py-1.5 text-[11px] font-semibold text-foreground/80">{label}</p>
      )}
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all px-3 py-2.5 pr-11 font-mono text-[11px] leading-relaxed text-foreground/80">
        {value}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={label ? `Copy ${label}` : "Copy"}
        className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition-colors hover:border-orange-300 hover:text-orange-600"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
