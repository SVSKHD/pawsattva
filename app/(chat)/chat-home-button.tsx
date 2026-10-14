"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Home } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { imageUrlProblem } from "@/lib/image-hosts"

/** Floating way back to the home page, showing who is signed in. */
export function ChatHomeButton() {
  const { user } = useAuth()
  const [photoFailed, setPhotoFailed] = useState(false)
  const name = user?.displayName || user?.email?.split("@")[0] || ""
  const photo = user?.photoURL && !imageUrlProblem(user.photoURL) && !photoFailed ? user.photoURL : null

  return (
    <Link
      href="/"
      aria-label={name ? `Back to PawSattva home (signed in as ${name})` : "Back to PawSattva home"}
      title={name ? `Home · ${name}` : "Home"}
      className="paw-glass fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] flex h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-semibold text-foreground/80 transition hover:text-orange-600 active:scale-95 sm:right-5 sm:top-5"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white ring-2 ring-white dark:ring-zinc-900">
        {photo ? (
          <Image src={photo} alt="" width={36} height={36} className="h-full w-full object-cover" onError={() => setPhotoFailed(true)} />
        ) : name ? (
          name[0].toUpperCase()
        ) : (
          <Home className="h-4 w-4" />
        )}
        {/* Small home badge on the avatar so the button still reads as "home" on phones */}
        {(photo || name) && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-orange-600 shadow ring-1 ring-black/5 dark:bg-zinc-900">
            <Home className="h-2.5 w-2.5" />
          </span>
        )}
      </span>
      <span className="hidden sm:inline">Home</span>
    </Link>
  )
}
