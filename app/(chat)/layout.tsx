import Link from "next/link"
import { Home } from "lucide-react"

/** Full-screen chat pages: no site header, footer or bottom nav — just the chat and a way home. */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
 <>
      {children}
      <Link
        href="/"
        aria-label="Back to PawSattva home"
        title="Home"
        className="paw-glass fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-foreground/80 transition hover:text-orange-600 active:scale-95 sm:right-5 sm:top-5"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Home</span>
      </Link>
      </>
  )
}
