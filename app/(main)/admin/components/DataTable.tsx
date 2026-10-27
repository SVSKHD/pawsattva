"use client"

import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react"

/**
 * Shared building blocks for every admin tab so they look and behave the same.
 *
 * Every tab is one card: a header bar (icon, title, one-line summary, actions on the right),
 * then a toolbar row (filter tabs, selects, search), then the content and TablePagination.
 * Tabs without a table (goals, SEO, analytics, editors) open with the same `PanelBar`.
 */

type IconType = ComponentType<{ className?: string }>

/** Title, summary and actions: the top bar of a TableCard, or a standalone bar via PanelBar */
function HeaderBar({
  icon: Icon, title, subtitle, actions,
}: { icon?: IconType; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-4 sm:px-5">
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-400/15 text-orange-600 ring-1 ring-orange-500/15 dark:text-orange-300">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">{actions}</div>}
    </div>
  )
}

const cardClass =
  "overflow-hidden rounded-2xl border border-black/10 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/40"

/** Standalone header card for tabs whose body isn't a single table; `children` is an optional toolbar row */
export function PanelBar({
  icon, title, subtitle, actions, children,
}: { icon?: IconType; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className={cardClass}>
      <HeaderBar icon={icon} title={title} subtitle={subtitle} actions={actions} />
      {children && <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/20 px-3 py-2.5">{children}</div>}
    </div>
  )
}

const ACTION_BUTTON_VARIANTS = {
  primary:
    "border-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600",
  secondary:
    "border border-black/10 bg-white/80 text-foreground hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-white/10 dark:bg-black/30 dark:hover:bg-orange-500/10 dark:hover:text-orange-300",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
}

/** The one button style for header and toolbar actions across the admin */
export function ActionButton({
  variant = "secondary", icon: Icon, className = "", children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof ACTION_BUTTON_VARIANTS; icon?: IconType }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition disabled:pointer-events-none disabled:opacity-50 sm:text-sm ${ACTION_BUTTON_VARIANTS[variant]} ${className}`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}

/**
 * Pick from a short list with arrows instead of a dropdown (rows per page, small option sets).
 * The arrow keys step too.
 */
export function ArrowStepper<T extends string | number>({
  value, options, onChange, label, format = String,
}: { value: T; options: readonly T[]; onChange: (value: T) => void; label: string; format?: (value: T) => string }) {
  const index = Math.max(0, options.indexOf(value))
  const step = (delta: number) => {
    const next = options[index + delta]
    if (next !== undefined) onChange(next)
  }
  return (
    <div
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={format(value)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); step(-1) }
        if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); step(1) }
      }}
      className="inline-flex h-8 items-center rounded-xl border border-black/10 bg-white/80 p-0.5 outline-none focus-visible:ring-4 focus-visible:ring-orange-500/15 dark:border-white/10 dark:bg-black/30"
    >
      <button type="button" tabIndex={-1} onClick={() => step(-1)} disabled={index === 0} aria-label={`Fewer ${label.toLowerCase()}`}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-orange-500/10 hover:text-orange-600 disabled:opacity-30">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-8 px-1 text-center text-xs font-bold tabular-nums text-foreground">{format(value)}</span>
      <button type="button" tabIndex={-1} onClick={() => step(1)} disabled={index === options.length - 1} aria-label={`More ${label.toLowerCase()}`}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-orange-500/10 hover:text-orange-600 disabled:opacity-30">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/** Page heading above a table, with an optional primary action on the right */
export function TableHeading({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold capitalize sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** Gradient "New …" button used as the heading action */
export const primaryActionClass =
  "h-9 sm:h-10 rounded-xl border-0 bg-gradient-to-r from-orange-500 to-amber-500 px-4 font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600"

/** The card every list lives in; pass `title` to give it the shared header bar */
export function TableCard({
  icon, title, subtitle, actions, children,
}: { icon?: IconType; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className={cardClass}>
      {title && <HeaderBar icon={icon} title={title} subtitle={subtitle} actions={actions} />}
      {children}
    </div>
  )
}

export function TableToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-y border-border/50 bg-muted/20 px-3 py-2.5 first:border-t-0">{children}</div>
}

/** Segmented tabs with live counts; `alert` paints one tab's count as a coloured badge when non-zero */
export function FilterTabs<T extends string>({
  tabs, value, onChange, counts, alert, label,
}: {
  tabs: { id: T; label: string; icon?: IconType }[]
  value: T
  onChange: (value: T) => void
  counts?: Partial<Record<T, number>>
  alert?: { id: T; className: string }
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex max-w-full items-center overflow-x-auto rounded-xl bg-muted/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map(({ id, label: tabLabel, icon: TabIcon }) => {
        const count = counts?.[id]
        const alerting = alert?.id === id && (count ?? 0) > 0
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={value === id}
            onClick={() => onChange(id)}
            className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
              value === id ? "bg-white text-orange-700 shadow-sm dark:bg-zinc-900 dark:text-orange-300" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TabIcon && <TabIcon className="h-3.5 w-3.5" />}
            {tabLabel}
            {count !== undefined && (
              <span className={`text-[10px] tabular-nums ${alerting ? `rounded-full px-1.5 text-white ${alert?.className}` : "text-muted-foreground"}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TableSearch({
  value, onChange, placeholder, label, className = "",
}: { value: string; onChange: (value: string) => void; placeholder: string; label: string; className?: string }) {
  return (
    <div className={`relative min-w-[200px] flex-1 ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 w-full rounded-xl border border-black/10 bg-white/70 pl-9 pr-8 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-black/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/** Trigger class for a Select used as a toolbar filter */
export const filterSelectClass = "h-9 rounded-xl border-black/10 bg-white/80 text-xs font-semibold dark:border-white/10 dark:bg-black/30"

export const theadRowClass = "border-b border-border/50 bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground"
export const thClass = "whitespace-nowrap px-4 py-2.5 font-semibold"
export const rowClass = "group cursor-pointer transition-colors hover:bg-orange-500/[0.04]"
export const rowTitleClass = "truncate font-semibold text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-300"

export type SortState<K extends string> = { key: K; dir: "asc" | "desc" }

export function SortHeader<K extends string>({
  label, sortKey, sort, onSort, className = "",
}: { label: string; sortKey: K; sort: SortState<K>; onSort: (key: K) => void; className?: string }) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th className={`${thClass} ${className}`} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  )
}

/** Next sort state when a header is clicked: same column flips, a new column starts at `firstDir` */
export const nextSort = <K extends string>(current: SortState<K>, key: K, firstDir: "asc" | "desc" = "desc"): SortState<K> =>
  current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: firstDir }

export function ActionsCell({ children }: { children: ReactNode }) {
  return (
    <td className="px-3 py-3">
      <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </td>
  )
}

const ACTION_TONES = {
  orange: "hover:bg-orange-500/10 hover:text-orange-600",
  red: "hover:bg-red-500/10 hover:text-red-600",
  emerald: "hover:bg-emerald-500/10 hover:text-emerald-600",
  amber: "hover:bg-amber-500/10 hover:text-amber-600",
  muted: "hover:bg-muted hover:text-foreground",
}

export function IconAction({
  label, onClick, tone, disabled, active, children,
}: {
  label: string
  onClick: () => void
  tone: keyof typeof ACTION_TONES
  disabled?: boolean
  /** Keeps the tone colour showing, e.g. a toggle that is currently on */
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition disabled:pointer-events-none disabled:opacity-30 ${
        active ? "text-red-600" : "text-muted-foreground"
      } ${ACTION_TONES[tone]}`}
    >
      {children}
    </button>
  )
}

const PILL_TONES = {
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  sky: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  red: "bg-red-500/10 text-red-700 dark:text-red-400",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  orange: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  muted: "bg-muted text-muted-foreground",
}

export type PillTone = keyof typeof PILL_TONES

export function StatusPill({
  tone, icon: Icon, title, className = "", children,
}: { tone: PillTone; icon?: ComponentType<{ className?: string }>; title?: string; className?: string; children: ReactNode }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL_TONES[tone]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}

export function TableEmpty({
  icon: Icon, title, description, children,
}: { icon: ComponentType<{ className?: string }>; title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
      {children}
    </div>
  )
}

/** Muted dash for an empty cell */
export const EmptyCell = () => <span className="text-xs text-muted-foreground/60">—</span>
