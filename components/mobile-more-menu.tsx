"use client"

import Image from "next/image"
import Link from "next/link"
import type { User as FirebaseUser } from "firebase/auth"
import {
  CalendarDays,
  Footprints,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  User,
  X,
} from "lucide-react"
import Paw from "../app/pawsattva.png"
import { useAuthDialog } from "@/components/auth-dialog-provider"
import { imageUrlProblem } from "@/lib/image-hosts"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"

// Home, Blog, Paw GPT and Pet Feed are already tabs in the bottom bar
const menuLinks = [
  { href: "/walks", label: "Walks", Icon: Footprints },
  { href: "/logger", label: "Food Logger", Icon: CalendarDays },
  { href: "/consultation", label: "Consultation", Icon: Stethoscope },
]

interface MobileMoreMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
  isAdmin: boolean
  user: FirebaseUser | null
  onSignOut: () => Promise<void>
}

// Phone menu: rises from the bottom bar as a floating card, so everything stays in thumb reach
export function MobileMoreMenu({
  open,
  onOpenChange,
  pathname,
  isAdmin,
  user,
  onSignOut,
}: MobileMoreMenuProps) {
  const { requestSignIn } = useAuthDialog()
  const closeMenu = () => onOpenChange(false)

  const handleSignIn = () => {
    closeMenu()
    window.setTimeout(() => requestSignIn(), 120)
  }

  const handleSignOut = () => {
    closeMenu()
    void onSignOut()
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* after:hidden drops vaul's overscroll filler, which shows as a white strip under a floating sheet */}
      <DrawerContent className="overflow-hidden border-black/[0.06] bg-white/95 shadow-[0_16px_48px_rgba(24,24,27,0.22)] backdrop-blur-xl after:hidden focus:outline-none data-[vaul-drawer-direction=bottom]:inset-x-2 data-[vaul-drawer-direction=bottom]:bottom-[max(0.5rem,env(safe-area-inset-bottom))] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] data-[vaul-drawer-direction=bottom]:rounded-[1.75rem] data-[vaul-drawer-direction=bottom]:border dark:border-white/10 dark:bg-zinc-950/95">
        <div className="flex h-14 shrink-0 items-center gap-1.5 pl-2 pr-2">
          <span className="relative size-10 shrink-0">
            <Image src={Paw} alt="" fill className="object-contain" sizes="40px" />
          </span>
          <DrawerTitle className="flex-1 bg-gradient-to-r from-primary to-orange-600 bg-clip-text p-1 font-[family-name:var(--font-pacifico)] text-lg leading-none text-transparent">
            Paw Sattva
          </DrawerTitle>
          <DrawerDescription className="sr-only">Site navigation and account</DrawerDescription>
          <DrawerClose
            aria-label="Close menu"
            className="mobile-nav-item flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black/[0.05] text-foreground transition-transform active:scale-90 dark:bg-white/10"
          >
            <X className="size-[18px]" strokeWidth={2.25} />
          </DrawerClose>
        </div>

        <div className="overflow-y-auto overscroll-contain px-2 pb-2">
          <nav aria-label="Site" className="flex flex-col py-1">
            {menuLinks.map(({ href, label, Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={`mobile-nav-item flex h-12 touch-manipulation items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold transition-colors active:bg-black/5 dark:active:bg-white/5 ${
                    active ? "bg-orange-500/10 text-primary" : "text-foreground"
                  }`}
                >
                  <Icon className={`size-5 ${active ? "" : "text-muted-foreground"}`} strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-1 border-t border-black/[0.06] pt-2 dark:border-white/10">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="mobile-nav-item flex h-14 touch-manipulation items-center gap-3 rounded-2xl px-3 transition-colors active:bg-black/5 dark:active:bg-white/5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-primary text-white">
                    {user.photoURL && !imageUrlProblem(user.photoURL) ? (
                      <Image src={user.photoURL} alt="" width={32} height={32} className="size-full object-cover" />
                    ) : (
                      <User className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{user.displayName || "My Dashboard"}</span>
                    <span className="block truncate text-xs text-muted-foreground">View your dashboard</span>
                  </span>
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={closeMenu}
                    className="mobile-nav-item flex h-12 touch-manipulation items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold transition-colors active:bg-black/5 dark:active:bg-white/5"
                  >
                    <LayoutDashboard className="size-5 text-muted-foreground" strokeWidth={1.75} />
                    Content Hub
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mobile-nav-item flex h-12 w-full touch-manipulation items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold text-red-600 transition-colors active:bg-red-500/10 dark:text-red-400"
                >
                  <LogOut className="size-5" strokeWidth={1.75} />
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="flex h-12 w-full touch-manipulation items-center justify-center rounded-full bg-orange-500 text-[15px] font-bold text-white shadow-sm shadow-orange-500/25 transition-transform active:scale-[0.98]"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
