"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Cat, Copy, Dog, ExternalLink, MessageCircle, Share2, X } from "lucide-react"
import { FaInstagram } from "react-icons/fa"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/metadata"

type Mascot = "dog" | "cat"

export function SocialPetGuide() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mascot, setMascot] = useState<Mascot>("dog")
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const savedMascot = sessionStorage.getItem("pawsattva.social-guide.mascot")
    const nextMascot: Mascot = savedMascot === "cat" ? "cat" : savedMascot === "dog" ? "dog" : Math.random() > 0.5 ? "cat" : "dog"
    setMascot(nextMascot)
    sessionStorage.setItem("pawsattva.social-guide.mascot", nextMascot)

    if (!sessionStorage.getItem("pawsattva.social-guide.greeted")) {
      setOpen(true)
      sessionStorage.setItem("pawsattva.social-guide.greeted", "true")
    }
  }, [])

  const isBlogPost = pathname.startsWith("/blog/")
  const MascotIcon = mascot === "dog" ? Dog : Cat
  const friendIcon = mascot === "dog" ? Cat : Dog
  const FriendIcon = friendIcon

  const switchMascot = () => {
    const nextMascot = mascot === "dog" ? "cat" : "dog"
    setMascot(nextMascot)
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

  return (
    <aside
      aria-label="Paw Sattva social guide"
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 z-[70] flex max-w-[calc(100vw-1.5rem)] flex-col items-end md:bottom-6 md:right-6"
    >
      <style>{`
        @keyframes pet-guide-bob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-7px) rotate(2deg); }
        }
        @keyframes pet-guide-wave {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(10deg); }
        }
        .pet-guide-bob { animation: pet-guide-bob 2.2s ease-in-out infinite; }
        .pet-guide-friend { animation: pet-guide-wave 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pet-guide-bob, .pet-guide-friend { animation: none; }
        }
      `}</style>

      {open && (
        <div className="mb-3 w-[min(22rem,calc(100vw-1.5rem))] rounded-[1.75rem] border border-orange-100/80 bg-background/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={switchMascot}
              className="pet-guide-bob relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/25"
              aria-label={`Switch to the ${mascot === "dog" ? "cat" : "dog"} guide`}
            >
              <MascotIcon className="h-8 w-8" />
              <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white">
                <FriendIcon className="pet-guide-friend h-4 w-4" />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-[family-name:var(--font-pacifico)] text-lg text-orange-600">
                    Hello from Paw Sattva!
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    I’m your {mascot} guide. Follow our social pages, explore helpful blogs, or share something useful with another pet parent.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Minimize social guide"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
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
              {sharing ? "Sharing…" : isBlogPost ? "Share Blog" : "Share Page"}
            </Button>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Tap the pet badge to switch between the dog and cat.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close Paw Sattva social guide" : "Open Paw Sattva social guide"}
        className="group flex items-center gap-2 rounded-full border border-white/70 bg-background/95 p-2 pr-4 shadow-xl backdrop-blur-xl transition-transform hover:scale-105 active:scale-95 dark:border-white/10"
      >
        <span className="pet-guide-bob flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md">
          <MascotIcon className="h-7 w-7" />
        </span>
        <span className="text-left">
          <span className="block text-xs font-black uppercase tracking-wider text-orange-600">Say hello</span>
          <span className="block text-[11px] text-muted-foreground">Social & blog guide</span>
        </span>
      </button>
    </aside>
  )
}
