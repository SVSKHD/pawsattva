"use client";

import { ViewTransition } from "react";
import Link, { useLinkStatus } from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Paw from "../app/pawsattva.png"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/pet-feed", label: "Pet Feed" },
];

const mobileNavIconClassName = "size-6 shrink-0 stroke-[1.9]";

import { useAuth } from "@/components/auth-provider";
import { auth } from "@/firebase/firebase";
import { signOut } from "firebase/auth";
import { LogOut, LayoutDashboard, User, Loader2, Menu, Home, BookOpen, PawPrint } from "lucide-react";

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
  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isRouteActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    let lastY = window.scrollY;
    const threshold = 8; // ignore micro-scrolls

    const handleScroll = () => {
      const y = window.scrollY;

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
        <header className="pointer-events-auto mx-auto w-full max-w-7xl rounded-4xl border border-white/50 bg-white/95 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-shadow duration-300 dark:border-white/10 dark:bg-zinc-950/95 md:bg-white/70 md:backdrop-blur-xl dark:md:bg-zinc-950/75">
          <div className="flex h-16 items-center px-6 md:px-10">
            <Link href="/" className="group flex shrink-0 items-center gap-2.5 transition-transform duration-300 hover:scale-105">
              {/* Logo Wrapper to ensure perfect centering */}
              <div className="relative flex size-10 shrink-0 items-center justify-center md:size-12">
                <Image
                  src={Paw}
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 767px) 40px, 48px"
                />
              </div>
              {/* Logo Text with baseline adjustment for Pacifico font */}
              <span className="text-xl md:text-[1.2rem] tracking-tight bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent font-[family-name:var(--font-pacifico)] leading-none p-1 group-hover:from-orange-500 group-hover:to-primary transition-colors duration-500">
                Paw Sattva
              </span>
            </Link>

            <nav className="ml-10 hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = isRouteActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative py-2 text-sm font-medium transition-all duration-300 ${isActive
                      ? "text-primary drop-shadow-[0_0_8px_rgba(234,88,12,0.3)]"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {link.label}
                    {/* Liquid Underline Effect for Active Link */}
                    {isActive && (
                      <ViewTransition name="active-nav-underline">
                        <span
                          className="absolute left-0 bottom-0 h-[2px] w-full rounded-full bg-primary"
                          style={{
                            boxShadow: "0 0 10px 1px rgba(234, 88, 12, 0.6)"
                          }}
                        />
                      </ViewTransition>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex h-10 w-[4.75rem] shrink-0 items-center justify-end gap-2 sm:w-auto md:gap-4">
              {isAdmin && (
                <Link href="/admin" className="hidden sm:flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground hover:text-orange-600 transition-colors items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Button>
                </Link>
              )}

              {loading ? (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 animate-pulse dark:bg-white/5 sm:w-auto sm:gap-2 sm:px-3">
                  <Loader2 className="size-4 animate-spin text-orange-500" />
                  <span className="hidden text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 sm:inline">Syncing</span>
                </div>
              ) : user ? (
                <div className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/10 p-1 dark:bg-white/5">
                  <Link
                    href="/dashboard"
                    aria-label="Open user profile"
                    className="flex size-8 shrink-0 items-center gap-2 overflow-hidden rounded-full transition-opacity hover:opacity-80 lg:w-auto lg:pr-2"
                  >
                    <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-primary text-[10px] font-bold text-white">
                      {user.photoURL ? (
                        <Image src={user.photoURL} alt="" fill sizes="32px" className="object-cover" />
                      ) : (
                        <User className="size-4" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate max-w-[80px] hidden lg:block">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="size-8 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </div>
              ) : (
                <Link
                  href="/login"
                  aria-label="Sign in"
                  className="flex size-10 min-w-10 shrink-0 items-center justify-center rounded-full px-0 font-semibold text-muted-foreground transition-colors hover:bg-white/20 hover:text-foreground dark:hover:bg-white/10 sm:w-auto sm:px-4"
                >
                  <User aria-hidden="true" className="size-4 sm:hidden" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
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
        <div className="mobile-liquid-glass pointer-events-auto mx-auto flex h-[4.5rem] w-full max-w-md items-stretch justify-around rounded-[1.65rem] px-1.5">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`mobile-nav-item relative flex min-h-12 min-w-16 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-1.5 transition-[color,transform] duration-150 active:scale-95 ${pathname === "/" ? "is-active text-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-300"
              }`}
          >
            <Home aria-hidden="true" className={mobileNavIconClassName} />
            <span className="text-[10px] font-bold mt-1">HOME</span>
            <NavPendingHint />
          </Link>

          <Link
            href="/blog"
            aria-current={pathname.startsWith("/blog") ? "page" : undefined}
            className={`mobile-nav-item relative flex min-h-12 min-w-16 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-1.5 transition-[color,transform] duration-150 active:scale-95 ${pathname.startsWith("/blog") ? "is-active text-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-300"
              }`}
          >
            <BookOpen aria-hidden="true" className={mobileNavIconClassName} />
            <span className="text-[10px] font-bold mt-1">BLOG</span>
            <NavPendingHint />
          </Link>

          <Link
            href="/pet-feed"
            aria-current={pathname.startsWith("/pet-feed") ? "page" : undefined}
            className={`mobile-nav-item relative flex min-h-12 min-w-16 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-1.5 transition-[color,transform] duration-150 active:scale-95 ${pathname.startsWith("/pet-feed") ? "is-active text-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-300"
              }`}
          >
            <PawPrint aria-hidden="true" className={mobileNavIconClassName} />
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
            className={`mobile-nav-item relative flex min-h-12 min-w-16 flex-1 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-1.5 transition-[color,transform] duration-150 active:scale-95 ${isMenuOpen ? "is-active text-zinc-950 dark:text-white" : "text-zinc-600 dark:text-zinc-300"}`}
          >
            <Menu aria-hidden="true" className={mobileNavIconClassName} />
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
