"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Copy, ExternalLink, MessageCircle, Share2, X } from "lucide-react"
import { FaInstagram } from "react-icons/fa"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/metadata"

type Mascot = "dog" | "cat"

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
      className="pet-guide-shell fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-3 z-[70] flex max-w-[calc(100vw-1.5rem)] flex-col items-start md:bottom-6 md:left-6"
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
          transform-origin: 16px 38px;
          will-change: transform;
        }
        .pet-guide-tail {
          animation: pet-guide-tail 1.2s ease-in-out infinite;
          transform-origin: 20px 50px;
          will-change: transform;
        }
        .pet-guide-leg-left {
          animation: pet-guide-leg-left 1s ease-in-out infinite;
          transform-origin: 38px 82px;
        }
        .pet-guide-leg-right {
          animation: pet-guide-leg-right 1s ease-in-out infinite reverse;
          transform-origin: 70px 82px;
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

      <div className="relative min-h-32 min-w-64">
        {greetingVisible && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pet-guide-greeting absolute bottom-20 left-14 z-10 rounded-[1.35rem] border border-orange-100 bg-white/95 px-4 py-3 text-left shadow-lg md:backdrop-blur-sm dark:border-white/10 dark:bg-zinc-950/95"
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
          className="pet-guide-walk absolute bottom-0 left-0 rounded-[2rem] p-2 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <MascotCharacter mascot={mascot} />
          <span className="sr-only">Animated {mascot} saying hi</span>
        </button>
      </div>
    </aside>
  )
}

function MascotCharacter({ mascot }: { mascot: Mascot }) {
  const isCat = mascot === "cat"

  return (
    <svg
      width="118"
      height="118"
      viewBox="0 0 118 118"
      role="img"
      aria-label={`Animated ${mascot} mascot`}
      className="pet-guide-shadow"
    >
      <ellipse cx="58" cy="101" rx="42" ry="9" fill="rgba(15,23,42,0.18)" />
      <g className="pet-guide-tail">
        <path
          d={isCat ? "M28 68 C7 56 15 32 32 39 C19 45 21 57 35 61" : "M28 68 C9 57 13 39 27 35 C31 48 39 55 36 66"}
          fill="none"
          stroke={isCat ? "#f59e0b" : "#92400e"}
          strokeWidth="10"
          strokeLinecap="round"
        />
      </g>
      <g className="pet-guide-body">
        <ellipse cx="58" cy="70" rx="34" ry="29" fill={isCat ? "#fbbf24" : "#d97706"} />
        <ellipse cx="68" cy="78" rx="17" ry="13" fill={isCat ? "#fde68a" : "#fed7aa"} opacity="0.9" />
        <g className="pet-guide-leg-left">
          <rect x="35" y="86" width="13" height="20" rx="7" fill={isCat ? "#f59e0b" : "#b45309"} />
        </g>
        <g className="pet-guide-leg-right">
          <rect x="70" y="86" width="13" height="20" rx="7" fill={isCat ? "#f59e0b" : "#b45309"} />
        </g>
        <circle cx="58" cy="43" r="26" fill={isCat ? "#fbbf24" : "#d97706"} />
        {isCat ? (
          <>
            <path d="M37 23 L45 6 L52 28 Z" fill="#f59e0b" />
            <path d="M79 23 L71 6 L64 28 Z" fill="#f59e0b" />
            <path d="M42 22 L46 13 L49 26 Z" fill="#fde68a" opacity="0.9" />
            <path d="M74 22 L70 13 L67 26 Z" fill="#fde68a" opacity="0.9" />
          </>
        ) : (
          <>
            <ellipse cx="35" cy="37" rx="10" ry="19" fill="#92400e" transform="rotate(25 35 37)" />
            <ellipse cx="81" cy="37" rx="10" ry="19" fill="#92400e" transform="rotate(-25 81 37)" />
          </>
        )}
        <ellipse cx="58" cy="50" rx="16" ry="12" fill={isCat ? "#fffbeb" : "#fed7aa"} />
        <circle cx="49" cy="39" r="3" fill="#1f2937" />
        <circle cx="67" cy="39" r="3" fill="#1f2937" />
        <path d="M58 46 L54 51 L62 51 Z" fill={isCat ? "#ef4444" : "#3f1f0f"} />
        <path d="M50 55 Q58 61 66 55" fill="none" stroke="#3f1f0f" strokeWidth="3" strokeLinecap="round" />
        {isCat && (
          <>
            <path d="M40 50 H27 M42 55 H29 M76 50 H89 M74 55 H87" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        <g className="pet-guide-paw">
          <rect x="82" y="54" width="13" height="28" rx="8" fill={isCat ? "#f59e0b" : "#b45309"} />
          <circle cx="88.5" cy="53" r="7" fill={isCat ? "#fde68a" : "#fed7aa"} />
        </g>
        <circle cx="42" cy="49" r="3" fill="#fef3c7" opacity="0.55" />
        <circle cx="74" cy="49" r="3" fill="#fef3c7" opacity="0.55" />
      </g>
    </svg>
  )
}
