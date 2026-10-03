"use client"

import Link from "next/link"
import NextImage from "next/image"
import { usePathname } from "next/navigation"
import { BookOpen, Mail, ShieldOff, UserRound } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"

// Blacklisted accounts may still read blogs, but cannot interact with them.
const isBlogPath = (pathname: string | null) =>
  pathname === "/blog" || Boolean(pathname?.startsWith("/blog/"))

export function BlacklistGate({ children }: { children: React.ReactNode }) {
  const { user, isBlacklisted } = useAuth()
  const pathname = usePathname()

  if (!user || !isBlacklisted || isBlogPath(pathname)) return <>{children}</>

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-orange-50 via-background to-amber-50 px-4 py-10 dark:from-orange-950/20 dark:to-background">
      <div className="w-full max-w-md rounded-[2rem] border border-white/40 bg-white/70 p-8 text-center shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-black/50">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
          <ShieldOff className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-black">Account restricted</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Access to this account has been restricted, probably due to a violation
          of the community guidelines. If you think this is a mistake, please
          contact support.
        </p>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border bg-background/70 p-4 text-left">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500/10 text-lg font-bold text-orange-600">
            {user.photoURL ? (
              <NextImage
                src={user.photoURL}
                alt={user.displayName || "Account"}
                fill
                className="object-cover"
              />
            ) : (
              (user.displayName || user.email || "?")[0].toUpperCase()
            )}
          </span>
          <div className="min-w-0 space-y-1.5">
            <p className="flex items-center gap-2 text-base font-bold">
              <UserRound className="h-4 w-4 shrink-0 text-orange-500" />
              <span className="break-words">{user.displayName || "Unnamed user"}</span>
            </p>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 shrink-0 text-orange-500" />
              <span className="break-all">{user.email || "No email on record"}</span>
            </p>
          </div>
        </div>

        <Button asChild className="mt-6 h-11 w-full rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600">
          <Link href="/blog">
            <BookOpen className="mr-2 h-4 w-4" />
            Read our blogs
          </Link>
        </Button>
      </div>
    </main>
  )
}
