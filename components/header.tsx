"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAppPathname } from "@/lib/use-app-pathname";
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

// Phone bottom bar; every other page lives in the menu behind the last tab
const mobileTabs = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/blog", label: "Blog", Icon: BookOpen },
  { href: "/paw-gpt", label: "Paw GPT", Icon: Sparkles },
  { href: "/pet-feed", label: "Pet Feed", Icon: PawPrint },
];

// iOS-style ease: quick start, long soft settle
const barEase = "ease-[cubic-bezier(0.32,0.72,0,1)]";
const COMPACT_BAR_PX = 232;
const BAR_TAB_COUNT = mobileTabs.length + 1; // + the menu tab

// Compact mode only uses transforms and clip-path (no layout work per frame), so it stays smooth on phones:
// the pill's background is clipped inward and each tab slides toward the centre by its share of the lost width.
function compactTabShift(index: number) {
  const fromCenter = (BAR_TAB_COUNT - 1) / 2 - index;
  return `translateX(calc(${fromCenter} * (100% - ${COMPACT_BAR_PX / BAR_TAB_COUNT}px)))`;
}
const barClipFull = "inset(0px 0px 0px 0px round 999px)";
const barClipCompact = `inset(4px calc(50% - ${COMPACT_BAR_PX / 2}px) 4px calc(50% - ${COMPACT_BAR_PX / 2}px) round 999px)`;

// Each tab sits in a circle that glows orange when it's the current page (or the open menu)
const tabCircle =
  `flex size-11 items-center justify-center rounded-full transition-[color,background-color,box-shadow,scale] duration-500 ${barEase} group-active:scale-90 motion-reduce:transition-none`;
const tabCircleActive =
  "bg-orange-500/15 text-primary shadow-[0_0_0_1px_rgba(249,115,22,0.18),0_0_18px_rgba(249,115,22,0.35)]";
const tabCircleIdle = "text-muted-foreground group-active:bg-orange-500/10";
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

export function Header() {
  const pathname = useAppPathname();
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
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const y = Math.min(Math.max(window.scrollY, 0), Math.max(maxY, 0));
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

  // Compact bottom bar while reading (scrolling down); full size near the top, on scroll up, or with the menu open
  const isBarCompact = !isVisible && !isMenuOpen;
  const tabCircleSize = isBarCompact ? "scale-[0.82]" : "scale-100";

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Top header is desktop/tablet only; phones navigate from the bottom bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 hidden px-4 pt-4 transition-[transform,opacity] duration-300 ease-out md:block ${isVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-32 opacity-0"
          }`}
      >
        <header
          className={`pointer-events-auto mx-auto w-full max-w-7xl rounded-[1.75rem] border bg-white/90 backdrop-blur-xl transition-[box-shadow,background-color,border-color] duration-300 dark:bg-zinc-950/85 ${
            isScrolled
              ? "border-black/[0.06] shadow-[0_8px_30px_rgba(24,24,27,0.12)] dark:border-white/10"
              : "border-white/70 shadow-[0_2px_12px_rgba(24,24,27,0.06)] dark:border-white/5"
          }`}
        >
          <div className="flex h-16 items-center gap-3 pl-4 pr-4">
            <Link href="/" aria-label="Paw Sattva home" className="group flex shrink-0 items-center gap-2 rounded-full pr-2">
              {/* Logo: fixed 48px badge so it never touches the 64px bar, even on hover */}
              <span className="relative block size-12 shrink-0 rounded-full drop-shadow-sm transition-transform duration-300 group-hover:scale-105">
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

      {/* Phone navigation: floating bottom bar in thumb reach; the last tab opens the full menu.
          Scrolling down tucks it into a compact pill (tabs pulled together); scrolling up restores it. */}
      <nav
        aria-label="Primary mobile navigation"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="relative h-14 w-full">
          {/* Background pill; drop-shadow follows the clipped shape, so the shadow shrinks with it */}
          <div aria-hidden className="absolute inset-0 [filter:drop-shadow(0_0_0.5px_rgba(24,24,27,0.18))_drop-shadow(0_8px_18px_rgba(24,24,27,0.16))]">
            <div
              className={`size-full bg-white/95 transition-[clip-path] duration-500 ${barEase} motion-reduce:transition-none dark:bg-zinc-900/95`}
              style={{ clipPath: isBarCompact ? barClipCompact : barClipFull }}
            />
          </div>

          <div className="absolute inset-0 flex">
            {mobileTabs.map(({ href, label, Icon }, index) => {
              const isActive = isRouteActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={`mobile-nav-item group pointer-events-auto flex h-full flex-1 touch-manipulation items-center justify-center transition-transform duration-500 ${barEase} will-change-transform motion-reduce:transition-none`}
                  style={{ transform: isBarCompact ? compactTabShift(index) : "translateX(0px)" }}
                >
                  <span className={`${tabCircle} ${tabCircleSize} ${isActive ? tabCircleActive : tabCircleIdle}`}>
                    <Icon className="size-[22px]" strokeWidth={isActive ? 2.3 : 1.75} />
                  </span>
                </Link>
              );
            })}

            <button
              type="button"
              aria-label={user ? "Open menu and account" : "Open menu"}
              aria-expanded={isMenuOpen}
              onPointerDown={() => void import("@/components/mobile-more-menu")}
              onFocus={() => void import("@/components/mobile-more-menu")}
              onClick={() => setIsMenuOpen(true)}
              className={`mobile-nav-item group pointer-events-auto flex h-full flex-1 touch-manipulation items-center justify-center transition-transform duration-500 ${barEase} will-change-transform motion-reduce:transition-none`}
              style={{ transform: isBarCompact ? compactTabShift(mobileTabs.length) : "translateX(0px)" }}
            >
              <span className={`${tabCircle} ${tabCircleSize} ${isMenuOpen ? tabCircleActive : tabCircleIdle}`}>
                {user ? (
                  <span
                    className={`flex size-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-primary text-white ring-2 transition-shadow ${
                      isMenuOpen ? "ring-orange-500" : "ring-white dark:ring-zinc-900"
                    }`}
                  >
                    {user.photoURL && !imageUrlProblem(user.photoURL) ? (
                      <Image src={user.photoURL} alt="" width={32} height={32} className="size-full object-cover" />
                    ) : (
                      <User className="size-4" />
                    )}
                  </span>
                ) : (
                  <Menu className="size-[22px]" strokeWidth={isMenuOpen ? 2.3 : 1.75} />
                )}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {isMenuOpen && (
        <MobileMoreMenu
          open={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          pathname={pathname}
          isAdmin={isAdmin}
          user={user}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}
