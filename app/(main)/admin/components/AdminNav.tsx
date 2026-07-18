"use client"

import { FileText, FolderPlus, Layers, Users, Mail, BarChart3, Target } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_GROUPS = [
  {
    label: "Content",
    items: [
      {
        label: "Content Goals",
        primaryValue: "content-goals",
        relatedValues: [],
        icon: Target,
        activeColor: "text-emerald-600 dark:text-emerald-400",
        activeBg: "bg-emerald-500/10",
        activeBorder: "border-emerald-500/20",
        dot: "bg-emerald-500",
      },
      {
        label: "Blog Posts",
        primaryValue: "blog-list",
        relatedValues: ["blog"],
        icon: FileText,
        activeColor: "text-orange-600 dark:text-orange-400",
        activeBg: "bg-orange-500/10",
        activeBorder: "border-orange-500/20",
        dot: "bg-orange-500",
      },
      {
        label: "Categories",
        primaryValue: "category-list",
        relatedValues: ["category"],
        icon: FolderPlus,
        activeColor: "text-amber-600 dark:text-amber-400",
        activeBg: "bg-amber-500/10",
        activeBorder: "border-amber-500/20",
        dot: "bg-amber-500",
      },
      {
        label: "Sub-Categories",
        primaryValue: "sub-category-list",
        relatedValues: ["sub-category"],
        icon: Layers,
        activeColor: "text-amber-600 dark:text-amber-400",
        activeBg: "bg-amber-500/10",
        activeBorder: "border-amber-500/20",
        dot: "bg-amber-400",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        label: "Users",
        primaryValue: "users",
        relatedValues: [],
        icon: Users,
        activeColor: "text-blue-600 dark:text-blue-400",
        activeBg: "bg-blue-500/10",
        activeBorder: "border-blue-500/20",
        dot: "bg-blue-500",
      },
      {
        label: "Subscribers",
        primaryValue: "subscribers",
        relatedValues: [],
        icon: Mail,
        activeColor: "text-violet-600 dark:text-violet-400",
        activeBg: "bg-violet-500/10",
        activeBorder: "border-violet-500/20",
        dot: "bg-violet-500",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Analytics",
        primaryValue: "analytics",
        relatedValues: [],
        icon: BarChart3,
        activeColor: "text-emerald-600 dark:text-emerald-400",
        activeBg: "bg-emerald-500/10",
        activeBorder: "border-emerald-500/20",
        dot: "bg-emerald-500",
      },
    ],
  },
]

interface AdminNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AdminNav({ activeTab, onTabChange }: AdminNavProps) {
  const isActive = (item: (typeof NAV_GROUPS)[0]["items"][0]) =>
    activeTab === item.primaryValue || item.relatedValues.includes(activeTab)

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .items-start > .admin-nav-desktop-sidebar + .admin-nav-mobile {
            display: none !important;
          }

          .items-start > .admin-nav-desktop-sidebar + .admin-nav-mobile + div {
            width: 100%;
            min-width: 0;
          }
        }
      `}</style>

      {/* ── Desktop sidebar ── */}
      <aside className="admin-nav-desktop-sidebar hidden md:flex flex-col w-52 shrink-0 gap-1 self-start sticky top-24">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 select-none">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(item)
              const Icon = item.icon
              return (
                <button
                  key={item.primaryValue}
                  type="button"
                  onClick={() => onTabChange(item.primaryValue)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border mb-0.5",
                    active
                      ? cn(item.activeBg, item.activeColor, item.activeBorder, "shadow-sm")
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  {active && (
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.dot)} />
                  )}
                  <Icon className={cn("w-4 h-4 shrink-0", !active && "opacity-60")} />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* ── Mobile top nav ── */}
      <div className="admin-nav-mobile md:hidden -mx-3 flex max-w-[calc(100vw-1.5rem)] snap-x snap-proximity items-center gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
        {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <button
              key={item.primaryValue}
              type="button"
              onClick={() => onTabChange(item.primaryValue)}
              className={cn(
                "flex min-h-11 min-w-max snap-start touch-manipulation items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border shrink-0 transition-[color,background-color,border-color,transform] duration-150 active:scale-95",
                active
                  ? cn(item.activeBg, item.activeColor, item.activeBorder, "shadow-sm")
                  : "text-muted-foreground border-transparent bg-black/5 dark:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
