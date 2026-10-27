"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  // Plain h-10 (not a group variant) so a caller's h-auto can replace it
  "group/tabs-list relative isolate inline-flex h-10 w-fit items-center justify-center rounded-xl p-1 text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "liquid-glass",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const indicatorVariants = {
  default:
    "rounded-[calc(var(--radius-xl,0.75rem)-2px)] bg-white shadow-[0_1px_2px_rgba(24,24,27,0.06),0_3px_8px_-4px_rgba(24,24,27,0.12)] ring-1 ring-black/[0.04] dark:bg-zinc-800 dark:ring-white/10",
  line: "!top-auto bottom-0 !h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400",
}

/**
 * Keeps a pill (or underline) under the active trigger and slides it with a springy, liquid
 * stretch whenever the selection changes — for every Tabs in the app.
 */
function useLiquidIndicator(listRef: React.RefObject<HTMLDivElement | null>) {
  const indicatorRef = React.useRef<HTMLSpanElement>(null)

  React.useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    let current: HTMLElement | null = null
    let settleTimer = 0

    const place = (animate: boolean) => {
      const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      if (!active) {
        indicator.style.opacity = "0"
        return
      }
      const moved = current !== null && current !== active
      indicator.style.transition = animate && moved ? "" : "none"
      indicator.style.width = `${active.offsetWidth}px`
      indicator.style.height = `${active.offsetHeight}px`
      indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
      indicator.style.opacity = "1"
      if (animate && moved) {
        // Restart the stretch so quick double switches still wobble
        indicator.removeAttribute("data-moving")
        void indicator.offsetWidth
        indicator.setAttribute("data-moving", "")
        window.clearTimeout(settleTimer)
        settleTimer = window.setTimeout(() => indicator.removeAttribute("data-moving"), 520)
        active.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
      }
      current = active
    }

    place(false)
    const mutations = new MutationObserver(() => place(true))
    mutations.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-state"] })
    const resize = new ResizeObserver(() => place(false))
    resize.observe(list)
    list.querySelectorAll('[role="tab"]').forEach((tab) => resize.observe(tab))

    return () => {
      mutations.disconnect()
      resize.disconnect()
      window.clearTimeout(settleTimer)
    }
  }, [listRef])

  return indicatorRef
}

function TabsList({
  className,
  variant = "default",
  indicatorClassName,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & { indicatorClassName?: string }) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const indicatorRef = useLiquidIndicator(listRef)

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <span
        ref={indicatorRef}
        aria-hidden
        data-slot="tabs-indicator"
        className={cn(
          "liquid-tab-indicator pointer-events-none absolute left-0 top-0 -z-10 opacity-0",
          indicatorVariants[variant ?? "default"],
          indicatorClassName
        )}
      />
      {children}
    </TabsPrimitive.List>
  )
}

/**
 * Horizontal scroll area for a TabsList that can outgrow the screen (phones, iPads). No
 * scrollbar: the edges fade and round arrow buttons appear only on the side that has more.
 */
function TabsScroller({ className, children }: { className?: string; children: React.ReactNode }) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [edges, setEdges] = React.useState({ start: false, end: false })

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const start = el.scrollLeft > 4
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    el.addEventListener("scroll", update, { passive: true })
    // Also fires once straight away, which sets the initial arrows
    const resize = new ResizeObserver(update)
    resize.observe(el)
    if (el.firstElementChild) resize.observe(el.firstElementChild)
    return () => {
      el.removeEventListener("scroll", update)
      resize.disconnect()
    }
  }, [])

  const scrollBy = (direction: -1 | 1) => {
    const el = scrollRef.current
    el?.scrollBy({ left: direction * Math.max(160, el.clientWidth * 0.6), behavior: "smooth" })
  }

  const fade = 40
  const mask = `linear-gradient(90deg, ${edges.start ? `transparent, #000 ${fade}px` : "#000"}, ${
    edges.end ? `#000 calc(100% - ${fade}px), transparent` : "#000"
  })`

  return (
    <div data-slot="tabs-scroller" className={cn("relative", className)}>
      <div
        ref={scrollRef}
        className="overflow-x-auto overscroll-x-contain rounded-[inherit] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {children}
      </div>
      <ScrollArrow side="start" visible={edges.start} onClick={() => scrollBy(-1)} />
      <ScrollArrow side="end" visible={edges.end} onClick={() => scrollBy(1)} />
    </div>
  )
}

function ScrollArrow({ side, visible, onClick }: { side: "start" | "end"; visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden={!visible}
      aria-label={side === "start" ? "Scroll tabs back" : "Scroll tabs forward"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.06] bg-white/95 text-foreground/70 shadow-[0_1px_2px_rgba(24,24,27,0.06),0_4px_12px_-4px_rgba(24,24,27,0.18)] backdrop-blur transition-[opacity,scale,color] duration-300 hover:text-orange-600 active:scale-90 dark:border-white/10 dark:bg-zinc-900/95",
        side === "start" ? "left-1" : "right-1",
        visible ? "opacity-100" : "pointer-events-none scale-75 opacity-0"
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
        <path
          d={side === "start" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap text-foreground/60 transition-[color,scale] duration-300 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-orange-500/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-[state=active]:text-foreground dark:data-[state=active]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsScroller, TabsTrigger, TabsContent, tabsListVariants }
