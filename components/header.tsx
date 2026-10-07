"use client";

import { ViewTransition } from "react";
import Link, { useLinkStatus } from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Paw from "../app/pawsattva.png"
import { imageUrlProblem } from "@/lib/image-hosts"

// `secondary` links fold into the "More" menu until there's room for all of them (xl)
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/walks", label: "Walks" },
  { href: "/pet-feed", label: "Pet Feed" },
  { href: "/paw-gpt", label: "Paw GPT", secondary: true },
  { href: "/logger", label: "Logger", secondary: true },
  { href: "/consultation", label: "Consultation", secondary: true },
];

import { useAuth } from "@/components/auth-provider";
import { useAuthDialog } from "@/components/auth-dialog-provider";
import { auth } from "@/firebase/firebase";
import { signOut } from "firebase/auth";
import { LogOut, LayoutDashboard, User, Menu, Home, BookOpen, PawPrint, ChevronDown, CalendarDays, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useEffect, useState } from "react";

const MobileMoreMenu = dynamic(
  () => import("@/components/mobile-more-menu").then((mod) => mod.MobileMoreMenu),
  { ssr: false }
);

function NavPendingHint() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={`nav-pending-hint ${pending ? "is-pending" : ""}`}
    />
  );
}

export function Header() {
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuth();
  const { requestSignIn } = useAuthDialog();
  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isRouteActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    let lastY = window.scrollY;
    const threshold = 8; // ignore micro-scrolls

    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 12);

      // Always visible near the top
      if (y < 20) {
        setIsVisible(true);
        lastY = y;
        return;
      }

      // Scroll UP → show (user wants navigation)
      if (y < lastY - threshold) {
        setIsVisible(true);
      }
      // Scroll DOWN → hide (user is reading)
      else if (y > lastY + threshold) {
        setIsVisible(false);
      }

      lastY = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 px-3 pt-3 transition-[transform,opacity] duration-300 ease-out sm:px-4 sm:pt-4 ${isVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-32 opacity-0"
          }`}
      >
        <header
          className={`pointer-events-auto mx-auto w-full max-w-7xl rounded-[1.75rem] border bg-white/90 backdrop-blur-xl transition-[box-shadow,background-color,border-color] duration-300 dark:bg-zinc-950/85 ${
            isScrolled
              ? "border-black/[0.06] shadow-[0_8px_30px_rgba(24,24,27,0.12)] dark:border-white/10"
              : "border-white/70 shadow-[0_2px_12px_rgba(24,24,27,0.06)] dark:border-white/5"
          }`}
        >
          <div className="flex h-16 items-center gap-3 pl-3 pr-3 sm:pl-4 md:pr-4">
            <Link href="/" aria-label="Paw Sattva home" className="group flex shrink-0 items-center gap-2 rounded-full pr-2">
              {/* Logo: fixed 44/48px badge so it never touches the 64px bar, even on hover */}
              <span className="relative block size-11 shrink-0 rounded-full drop-shadow-sm transition-transform duration-300 group-hover:scale-105 md:size-12">
                <Image
                  src={Paw}
                  alt=""
                  fill
                  className="object-contain"
                  priority
                  sizes="48px"
                />
              </span>
              {/* Logo Text with baseline adjustment for Pacifico font */}
              <span className="text-lg md:text-xl tracking-tight bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent font-[family-name:var(--font-pacifico)] leading-none p-1 group-hover:from-orange-500 group-hover:to-primary transition-colors duration-500">
                Paw Sattva
              </span>
            </Link>

            {/* Desktop nav: pill tabs, the active pill slides between links */}
            <nav aria-label="Primary" className="mx-auto hidden items-center gap-0.5 rounded-full bg-muted/60 p-1 md:flex dark:bg-white/5">
              {navLinks.map((link) => {
                const isActive = isRouteActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 lg:px-4 ${
                      link.secondary ? "hidden xl:inline-flex" : "inline-flex"
                    } ${isActive ? "text-orange-700 dark:text-orange-300" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {isActive && (
                      <ViewTransition name="active-nav-pill">
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-orange-500/15 dark:bg-zinc-800 dark:ring-orange-400/20"
                        />
                      </ViewTransition>
                    )}
                    <span className="relative">{link.label}</span>
                  </Link>
                );
              })}

              {/* Secondary links when there isn't room for all of them */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors xl:hidden ${
                      navLinks.some((l) => l.secondary && isRouteActive(l.href))
                        ? "bg-white text-orange-700 shadow-sm dark:bg-zinc-800 dark:text-orange-300"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    More <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} className="w-48 rounded-xl p-1.5">
                  {navLinks.filter((l) => l.secondary).map((link) => (
                    <DropdownMenuItem key={link.href} asChild className="rounded-lg px-2.5 py-2 font-medium">
                      <Link href={link.href} aria-current={isRouteActive(link.href) ? "page" : undefined}>
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
              {loading ? (
                <span aria-label="Checking your account" className="h-9 w-9 animate-pulse rounded-full bg-muted" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Account menu"
                      className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 py-1 pl-1 pr-2.5 transition hover:border-orange-300 hover:shadow-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-primary text-white">
                        {user.photoURL && !imageUrlProblem(user.photoURL) ? (
                          <Image src={user.photoURL} alt="" width={32} height={32} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </span>
                      <span className="hidden max-w-[110px] truncate text-sm font-semibold lg:block">
                        {user.displayName?.split(" ")[0] || user.email?.split("@")[0]}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={10} className="w-60 rounded-xl p-1.5">
                    <DropdownMenuLabel className="px-2.5 py-2">
                      <p className="truncate text-sm font-semibold">{user.displayName || "Your account"}</p>
                      {user.email && <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2">
                      <Link href="/dashboard"><User /> Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2">
                      <Link href="/logger"><CalendarDays /> Food logger</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2">
                      <Link href="/paw-gpt"><Sparkles /> Paw GPT</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2">
                        <Link href="/admin"><LayoutDashboard /> Content Hub</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => void handleSignOut()} className="rounded-lg px-2.5 py-2">
                      <LogOut /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  type="button"
                  onClick={() => requestSignIn()}
                  className="h-9 rounded-full bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600"
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Primary mobile navigation"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="pointer-events-auto mx-auto flex h-[4.5rem] w-full max-w-md items-stretch justify-around rounded-[1.6rem] border border-white/70 bg-white/95 px-1.5 shadow-[0_10px_32px_rgba(24,24,27,0.18)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`mobile-nav-item relative flex min-h-12 min-w-16 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-1.5 transition-[color,background-color,transform] duration-150 active:scale-95 ${pathname === "/" ? "bg-orange-500/10 text-primary" : "text-muted-foreground"
              }`}
          >
            <Home className="h-5.5 w-5.5" />
            <span className="text-[10px] font-bold mt-1">HOME</span>
            <NavPendingHint />
          </Link>

          <Link
            href="/blog"
            aria-current={pathname.startsWith("/blog") ? "page" : undefined}
            className={`mobile-nav-item relative flex min-h-12 min-w-16 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-1.5 transition-[color,background-color,transform] duration-150 active:scale-95 ${pathname.startsWith("/blog") ? "bg-orange-500/10 text-primary" : "text-muted-foreground"
              }`}
          >
            <BookOpen className="h-5.5 w-5.5" />
            <span className="text-[10px] font-bold mt-1">BLOG</span>
            <NavPendingHint />
          </Link>

          <Link
            href="/pet-feed"
            aria-current={pathname.startsWith("/pet-feed") ? "page" : undefined}
            className={`mobile-nav-item relative flex min-h-12 min-w-16 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-1.5 transition-[color,background-color,transform] duration-150 active:scale-95 ${pathname.startsWith("/pet-feed") ? "bg-orange-500/10 text-primary" : "text-muted-foreground"
              }`}
          >
            <PawPrint className="h-5.5 w-5.5" />
            <span className="mt-1 text-[10px] font-bold">PET PLAN</span>
            <NavPendingHint />
          </Link>

          <button
            type="button"
            aria-label="Open more navigation options"
            aria-expanded={isMenuOpen}
            onPointerDown={() => void import("@/components/mobile-more-menu")}
            onFocus={() => void import("@/components/mobile-more-menu")}
            onClick={() => setIsMenuOpen(true)}
            className={`mobile-nav-item flex min-h-12 min-w-16 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-muted-foreground transition-[color,background-color,transform] duration-150 active:scale-95 ${isMenuOpen ? "bg-orange-500/10 text-primary" : ""}`}
          >
            <Menu className="h-5.5 w-5.5" />
            <span className="text-[10px] font-bold mt-1">MORE</span>
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <MobileMoreMenu
          open={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          pathname={pathname}
          isAdmin={isAdmin}
          hasUser={Boolean(user)}
        />
      )}
    </>
  );
}
