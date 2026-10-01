"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Copy, ExternalLink, MessageCircle, Share2, X } from "lucide-react"
import { FaInstagram } from "react-icons/fa"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/metadata"
import { PetMascot, type Mascot } from "@/components/pet-mascot"

export function SocialPetGuide() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [mascot, setMascot] = useState<Mascot>("dog")
  const [sharing, setSharing] = useState(false)
  const [greetingVisible, setGreetingVisible] = useState(true)

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

  useEffect(() => {
    if (!mounted) return

    const savedMascot = sessionStorage.getItem("pawsattva.social-guide.mascot")
    const nextMascot: Mascot = savedMascot === "cat" ? "cat" : savedMascot === "dog" ? "dog" : Math.random() > 0.5 ? "cat" : "dog"
    setMascot(nextMascot)
    sessionStorage.setItem("pawsattva.social-guide.mascot", nextMascot)

    const timer = window.setTimeout(() => setGreetingVisible(false), 9000)
    return () => window.clearTimeout(timer)
  }, [mounted])

  const isBlogPost = pathname.startsWith("/blog/")
  const switchMascot = () => {
    const nextMascot = mascot === "dog" ? "cat" : "dog"
    setMascot(nextMascot)
    setGreetingVisible(true)
    sessionStorage.setItem("pawsattva.social-guide.mascot", nextMascot)
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

  return (
    <aside
      aria-label="Paw Sattva greeting guide"
      data-open={open}
      className="pet-guide-shell fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-3 z-[70] flex max-w-[calc(100vw-1.5rem)] flex-col items-end md:bottom-6 md:right-6"
    >
      <style>{`
        @keyframes pet-guide-walk {
          0%, 100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(10px) translateY(-3px); }
          50% { transform: translateX(18px) translateY(0); }
          75% { transform: translateX(9px) translateY(-3px); }
        }
        @keyframes pet-guide-body {
          0%, 100% { transform: rotate(-2deg) translateY(0); }
          50% { transform: rotate(2deg) translateY(-5px); }
        }
        @keyframes pet-guide-paw {
          0%, 100% { transform: rotate(-20deg); }
          45% { transform: rotate(22deg) translateY(-2px); }
        }
        @keyframes pet-guide-tail {
          0%, 100% { transform: rotate(-16deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes pet-guide-leg-left {
          0%, 100% { transform: rotate(18deg); }
          50% { transform: rotate(-18deg); }
        }
        @keyframes pet-guide-leg-right {
          0%, 100% { transform: rotate(-18deg); }
          50% { transform: rotate(18deg); }
        }
        @keyframes pet-guide-bubble {
          0% { opacity: 0; transform: translateY(8px) scale(0.96); }
          18%, 82% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(4px) scale(0.98); }
        }
        .pet-guide-shell {
          contain: layout paint style;
          pointer-events: none;
          transform: translateZ(0);
        }
        .pet-guide-shell button,
        .pet-guide-shell a {
          pointer-events: auto;
        }
        .pet-guide-panel {
          contain: content;
        }
        .pet-guide-walk {
          animation: pet-guide-walk 5.4s ease-in-out infinite;
          will-change: transform;
          transform: translateZ(0);
        }
        .pet-guide-body {
          animation: pet-guide-body 2.1s ease-in-out infinite;
          transform-origin: center bottom;
          will-change: transform;
        }
        .pet-guide-paw {
          animation: pet-guide-paw 1.35s ease-in-out infinite;
          transform-origin: 62px 64px;
          will-change: transform;
        }
        .pet-guide-tail {
          animation: pet-guide-tail 1.2s ease-in-out infinite;
          transform-origin: 32px 74px;
          will-change: transform;
        }
        .pet-guide-leg-left {
          animation: pet-guide-leg-left 1s ease-in-out infinite;
          transform-origin: 39px 78px;
        }
        .pet-guide-leg-right {
          animation: pet-guide-leg-right 1s ease-in-out infinite reverse;
          transform-origin: 57px 78px;
        }
        .pet-guide-greeting {
          animation: pet-guide-bubble 9s ease-in-out both;
          will-change: opacity, transform;
        }
        .pet-guide-shadow {
          filter: drop-shadow(0 16px 18px rgba(15,23,42,0.2));
        }
        .pet-guide-shell[data-open="true"] .pet-guide-walk {
          animation-play-state: paused;
        }
        @media (max-width: 767px) {
          .pet-guide-walk {
            animation-duration: 7s;
          }
          .pet-guide-body,
          .pet-guide-leg-left,
          .pet-guide-leg-right {
            animation: none;
          }
          .pet-guide-paw,
          .pet-guide-tail {
            animation-duration: 1.8s;
          }
          .pet-guide-shadow {
            filter: drop-shadow(0 10px 12px rgba(15,23,42,0.18));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pet-guide-walk, .pet-guide-body, .pet-guide-paw, .pet-guide-tail, .pet-guide-leg-left, .pet-guide-leg-right, .pet-guide-greeting { animation: none; }
        }
      `}</style>

      {open && (
        <div className="pet-guide-panel mb-3 w-[min(22rem,calc(100vw-1.5rem))] rounded-[1.75rem] border border-orange-100/80 bg-background/95 p-4 shadow-xl md:backdrop-blur-md dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-pacifico)] text-xl text-orange-600">
                Hi, I’m your {mascot} guide!
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                I can point users to Paw Sattva socials, blogs, and sharing. The AI assistant can come later.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close greeting guide"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-11 justify-start rounded-xl">
              <a href={siteConfig.links.instagram} target="_blank" rel="noreferrer">
                <FaInstagram className="h-4 w-4 text-pink-600" />
                Instagram
                <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11 justify-start rounded-xl">
              <a href={siteConfig.links.facebook} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                Facebook
                <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11 justify-start rounded-xl">
              <Link href="/blog">
                <Copy className="h-4 w-4 text-orange-600" />
                Browse Blogs
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-start rounded-xl"
              onClick={shareCurrentPage}
              disabled={sharing}
            >
              <Share2 className="h-4 w-4 text-emerald-600" />
              {sharing ? "Sharing..." : isBlogPost ? "Share Blog" : "Share Page"}
            </Button>
          </div>

          <Button type="button" variant="ghost" className="mt-3 h-9 w-full rounded-xl text-xs" onClick={switchMascot}>
            Switch to {mascot === "dog" ? "cat" : "dog"} greeting
          </Button>
        </div>
      )}

      <div className="relative min-h-24 min-w-44">
        {greetingVisible && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pet-guide-greeting absolute bottom-16 right-12 z-10 rounded-[1.35rem] border border-orange-100 bg-white/95 px-4 py-3 text-left shadow-lg md:backdrop-blur-sm dark:border-white/10 dark:bg-zinc-950/95"
          >
            <span className="block font-[family-name:var(--font-pacifico)] text-xl leading-none text-orange-600">
              Hi! I’m here.
            </span>
            <span className="mt-1 block text-xs font-semibold text-muted-foreground">
              Tap me for blogs and socials.
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => { setOpen((current) => !current); setGreetingVisible(false) }}
          aria-expanded={open}
          aria-label={open ? "Close Paw Sattva greeting guide" : "Open Paw Sattva greeting guide"}
          className="pet-guide-walk absolute bottom-0 right-0 rounded-[2rem] p-1.5 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <MascotCharacter mascot={mascot} />
          <span className="sr-only">Animated {mascot} saying hi</span>
        </button>
      </div>
    </aside>
  )
}

function MascotCharacter({ mascot }: { mascot: Mascot }) {
  return (
    <PetMascot
      mascot={mascot}
      size={88}
      label={`Animated ${mascot} mascot`}
      className="pet-guide-shadow"
    />
  )
}
