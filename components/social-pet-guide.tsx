"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useAppPathname } from "@/lib/use-app-pathname"
import { BookOpen, ExternalLink, Share2, Sparkles, X } from "lucide-react"
import { FaFacebook, FaInstagram } from "react-icons/fa"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/metadata"
import { PetMascot, type Mascot } from "@/components/pet-mascot"

const MASCOT_KEY = "pawsattva.social-guide.mascot"
const GREETED_KEY = "pawsattva.social-guide.greeted"

function readSession(key: string) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {}
}

/**
 * The corner pet: sits still in the corner (no walking off the edge), greets once per visit with
 * a speech bubble pointing at it, and tucks half out of the way while the page is scrolled so it
 * never sits on top of what someone is reading. Tapping it opens a small menu.
 */
export function SocialPetGuide() {
  const pathname = useAppPathname()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [mascot, setMascot] = useState<Mascot>("dog")
  const [sharing, setSharing] = useState(false)
  const [greetingVisible, setGreetingVisible] = useState(false)
  const [tucked, setTucked] = useState(false)
  const shellRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const showGuide = () => setMounted(true)
    let cancelGuide = () => {}

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(showGuide, { timeout: 1200 })
      cancelGuide = () => window.cancelIdleCallback(idleId)
    } else {
      const timer = setTimeout(showGuide, 650)
      cancelGuide = () => clearTimeout(timer)
    }

    return cancelGuide
  }, [])

  // Pick the mascot and greet once per visit, a moment after it appears.
  useEffect(() => {
    if (!mounted) return

    const savedMascot = readSession(MASCOT_KEY)
    const nextMascot: Mascot = savedMascot === "cat" ? "cat" : savedMascot === "dog" ? "dog" : Math.random() > 0.5 ? "cat" : "dog"
    setMascot(nextMascot)
    writeSession(MASCOT_KEY, nextMascot)

    if (readSession(GREETED_KEY)) return
    writeSession(GREETED_KEY, "1")
    const show = window.setTimeout(() => setGreetingVisible(true), 1500)
    const hide = window.setTimeout(() => setGreetingVisible(false), 9500)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [mounted])

  // Tuck away while scrolling down; come back when scrolling up or after a pause.
  useEffect(() => {
    if (!mounted) return
    let lastY = window.scrollY
    let timer = 0
    const onScroll = () => {
      const y = window.scrollY
      if (y > lastY + 4) setTucked(true)
      else if (y < lastY - 4) setTucked(false)
      lastY = y
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setTucked(false), 1200)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.clearTimeout(timer)
    }
  }, [mounted])

  // Close the menu with Escape or a tap anywhere else.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [open])

  // A new page starts with the menu closed.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isBlogPost = pathname.startsWith("/blog/")
  const switchMascot = () => {
    const nextMascot = mascot === "dog" ? "cat" : "dog"
    setMascot(nextMascot)
    writeSession(MASCOT_KEY, nextMascot)
  }

  const shareCurrentPage = async () => {
    setSharing(true)
    const url = window.location.href
    const title = document.title || "Paw Sattva"
    const text = isBlogPost
      ? "Here is a helpful Paw Sattva pet-care article."
      : "Discover pet-care guidance from Paw Sattva."

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success(isBlogPost ? "Blog link copied!" : "Page link copied!")
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      try {
        await navigator.clipboard.writeText(url)
        toast.success("Link copied!")
      } catch {
        toast.error("Unable to share this link.")
      }
    } finally {
      setSharing(false)
    }
  }

  if (!mounted) return null

  const showBubble = greetingVisible && !open && !tucked

  return (
    <aside
      ref={shellRef}
      aria-label="Paw Sattva greeting guide"
      data-open={open}
      data-tucked={tucked && !open}
      className="pet-guide-shell fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-2 z-[70] flex max-w-[calc(100vw-1rem)] flex-col items-end md:bottom-5 md:right-5"
    >
      <style>{`
        @keyframes pet-guide-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pet-guide-paw {
          0%, 100% { transform: rotate(-20deg); }
          45% { transform: rotate(22deg) translateY(-2px); }
        }
        @keyframes pet-guide-tail {
          0%, 100% { transform: rotate(-16deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes pet-guide-pop {
          from { opacity: 0; transform: translateY(6px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pet-guide-shell {
          pointer-events: none;
        }
        .pet-guide-shell button,
        .pet-guide-shell a {
          pointer-events: auto;
        }
        .pet-guide-pet {
          transition: transform 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease;
        }
        .pet-guide-pet:hover { transform: scale(1.05); }
        .pet-guide-pet:active { transform: scale(0.95); }
        .pet-guide-shell[data-tucked="true"] .pet-guide-pet {
          transform: translateX(55%) rotate(-8deg);
          opacity: 0.6;
        }
        .pet-guide-body {
          animation: pet-guide-bob 2.6s ease-in-out infinite;
          transform-origin: center bottom;
        }
        .pet-guide-paw {
          animation: pet-guide-paw 1.4s ease-in-out infinite;
          transform-origin: 62px 64px;
        }
        .pet-guide-tail {
          animation: pet-guide-tail 1.3s ease-in-out infinite;
          transform-origin: 32px 74px;
        }
        .pet-guide-pop {
          animation: pet-guide-pop 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
          transform-origin: bottom right;
        }
        .pet-guide-shadow {
          filter: drop-shadow(0 10px 12px rgba(15,23,42,0.18));
        }
        @media (prefers-reduced-motion: reduce) {
          .pet-guide-body, .pet-guide-paw, .pet-guide-tail, .pet-guide-pop { animation: none; }
          .pet-guide-pet { transition: none; }
        }
      `}</style>

      {open && (
        <div
          role="dialog"
          aria-label="Paw Sattva shortcuts"
          className="pet-guide-pop mb-2 w-[min(20rem,calc(100vw-1rem))] rounded-3xl border border-orange-100/80 bg-background/95 p-3.5 shadow-xl backdrop-blur-md dark:border-white/10"
        >
          <div className="flex items-start justify-between gap-3 px-0.5">
            <div>
              <p className="font-[family-name:var(--font-pacifico)] text-lg leading-tight text-orange-600">
                Hi, I’m your {mascot} guide!
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Where would you like to go?</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-1 -mt-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close greeting guide"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Button asChild className="mt-3 h-11 w-full justify-start rounded-xl border-0 bg-orange-500 font-semibold text-white hover:bg-orange-600">
            <Link href="/paw-gpt">
              <Sparkles className="h-4 w-4" />
              Ask Paw GPT
            </Link>
          </Button>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-10 justify-start rounded-xl">
              <Link href="/blog">
                <BookOpen className="h-4 w-4 text-orange-600" />
                Blogs
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 justify-start rounded-xl"
              onClick={shareCurrentPage}
              disabled={sharing}
            >
              <Share2 className="h-4 w-4 text-emerald-600" />
              {sharing ? "Sharing…" : "Share"}
            </Button>
            <Button asChild variant="outline" className="h-10 justify-start rounded-xl">
              <a href={siteConfig.links.instagram} target="_blank" rel="noreferrer">
                <FaInstagram className="h-4 w-4 text-pink-600" />
                Instagram
                <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10 justify-start rounded-xl">
              <a href={siteConfig.links.facebook} target="_blank" rel="noreferrer">
                <FaFacebook className="h-4 w-4 text-blue-600" />
                Facebook
                <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
              </a>
            </Button>
          </div>

          <button
            type="button"
            onClick={switchMascot}
            className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Switch to the {mascot === "dog" ? "cat" : "dog"}
          </button>
        </div>
      )}

      {showBubble && (
        <div className="pet-guide-pop relative mb-1 mr-3 flex max-w-[15rem] items-start gap-1 rounded-2xl border border-orange-100 bg-white py-2.5 pl-3.5 pr-1.5 shadow-lg dark:border-white/10 dark:bg-zinc-900">
          <button type="button" onClick={() => setOpen(true)} className="min-w-0 text-left">
            <span className="block text-sm font-bold text-orange-600">Hi there! 👋</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">Tap me for Paw GPT, blogs and socials.</span>
          </button>
          <button
            type="button"
            onClick={() => setGreetingVisible(false)}
            aria-label="Dismiss greeting"
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {/* Tail pointing down at the pet */}
          <span
            aria-hidden
            className="absolute -bottom-[7px] right-6 h-3.5 w-3.5 rotate-45 border-b border-r border-orange-100 bg-white dark:border-white/10 dark:bg-zinc-900"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current)
          setGreetingVisible(false)
        }}
        aria-expanded={open}
        aria-label={open ? "Close Paw Sattva greeting guide" : "Open Paw Sattva greeting guide"}
        className="pet-guide-pet rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        <PetMascot mascot={mascot} size={80} label={`Animated ${mascot} mascot`} className="pet-guide-shadow h-16 w-16 md:h-20 md:w-20" />
      </button>
    </aside>
  )
}
