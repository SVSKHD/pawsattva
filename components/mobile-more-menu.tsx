"use client"

import Image from "next/image"
import Link from "next/link"
import { LayoutDashboard, User } from "lucide-react"
import Paw from "../app/pawsattva.png"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

const menuLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/pet-feed", label: "Pet Feed" },
]

interface MobileMoreMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
  isAdmin: boolean
  hasUser: boolean
}

export function MobileMoreMenu({
  open,
  onOpenChange,
  pathname,
  isAdmin,
  hasUser,
}: MobileMoreMenuProps) {
  const closeMenu = () => onOpenChange(false)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[2.5rem] border-t border-white/50 bg-white/98 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-md focus:outline-none dark:border-white/10 dark:bg-zinc-950/98">
        <DrawerHeader className="items-center border-b border-black/5 pb-4 dark:border-white/10">
          <DrawerTitle className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <Image src={Paw} alt="Paw Sattva logo" fill className="object-contain" sizes="32px" />
            </div>
            <span className="bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-lg font-[family-name:var(--font-pacifico)] text-transparent">
              Paw Sattva
            </span>
          </DrawerTitle>
        </DrawerHeader>

        <div className="grid grid-cols-2 gap-3 p-4 pb-8">
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className={`flex min-h-13 touch-manipulation items-center justify-center gap-2 rounded-2xl p-4 text-base font-semibold transition-[color,background-color,transform] duration-150 active:scale-95 ${pathname === link.href
                ? "border border-primary/20 bg-primary/10 text-primary"
                : "bg-black/5 text-muted-foreground hover:bg-black/10 hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10"
                }`}
            >
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={closeMenu}
              className="col-span-2 flex min-h-13 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-orange-600/10 bg-orange-600/5 p-4 text-sm font-semibold text-orange-600 transition-transform active:scale-[0.98]"
            >
              <LayoutDashboard className="h-5 w-5" />
              Admin Dashboard
            </Link>
          )}

          {hasUser ? (
            <Link
              href="/dashboard"
              onClick={closeMenu}
              className="col-span-2 flex min-h-13 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-orange-500/10 bg-orange-500/5 p-4 text-sm font-semibold text-orange-600 transition-transform active:scale-[0.98]"
            >
              <User className="h-5 w-5" />
              My Dashboard
            </Link>
          ) : (
            <Link href="/login" onClick={closeMenu} className="col-span-2 mt-1">
              <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-orange-600 font-bold shadow-lg shadow-primary/20">
                Sign In Now
              </Button>
            </Link>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
