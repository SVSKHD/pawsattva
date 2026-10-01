"use client"

import { ArrowLeft, Download, Lightbulb, List, PlusCircle, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"

interface BlogToolbarProps {
  activeTab: "blog" | "blog-list"
  onNavigate: (tab: "blog" | "blog-list") => void
  onOpenTips: () => void
  onOpenImport: () => void
  onOpenExport: () => void
}

/** Always-visible action bar for the blog tabs: navigation, Tips & keys, JSON import/export */
export function BlogToolbar({ activeTab, onNavigate, onOpenTips, onOpenImport, onOpenExport }: BlogToolbarProps) {
  const onEditor = activeTab === "blog"

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-orange-200/70 bg-white/70 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
      <div className="flex items-center rounded-xl bg-muted/60 p-1">
        <ToolbarTab active={!onEditor} onClick={() => onNavigate("blog-list")} icon={onEditor ? ArrowLeft : List}>
          All posts
        </ToolbarTab>
        <ToolbarTab active={onEditor} onClick={() => onNavigate("blog")} icon={PlusCircle}>
          Editor
        </ToolbarTab>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onOpenImport} className="rounded-xl">
          <Upload className="h-3.5 w-3.5" /> Import JSON
        </Button>
        {onEditor && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenExport} className="rounded-xl">
            <Download className="h-3.5 w-3.5" /> Export JSON
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onOpenTips}
          className="rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600"
        >
          <Lightbulb className="h-3.5 w-3.5" /> Tips &amp; keys
        </Button>
      </div>
    </div>
  )
}

function ToolbarTab({
  active, onClick, icon: Icon, children,
}: { active: boolean; onClick: () => void; icon: typeof List; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
        active ? "bg-white text-orange-700 shadow-sm dark:bg-zinc-900 dark:text-orange-300" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}
