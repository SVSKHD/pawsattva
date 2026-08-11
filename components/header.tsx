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
  { href: "/consultation", label: "Consultation" },
];

import { useAuth } from "@/components/auth-provider";
import { useAuthDialog } from "@/components/auth-dialog-provider";
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
  const { requestSignIn } = useAuthDialog();
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
            <Link href="/" className="flex items-center gap-2.5 group transition-transform hover:scale-105 duration-300">
              {/* Logo Wrapper to ensure perfect centering */}
              <div className="relative w-10 h-10 md:w-15 md:h-15 sm:h-15 sm:w-15 flex items-center justify-center">
                <Image
                  src={Paw}
                  alt="Logo"
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 40px, (max-width: 1200px) 60px, 60px"
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

            <div className="ml-auto flex items-center gap-2 md:gap-4">
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
                <div className="flex items-center gap-2 bg-white/5 dark:bg-white/5 pl-3 pr-4 py-1.5 rounded-full border border-white/10 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Syncing</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-3 bg-white/10 dark:bg-white/5 pl-1 pr-1 py-1 rounded-full border border-white/10">
                  <Link href="/dashboard" className="flex items-center gap-2 pl-2 pr-1 overflow-hidden hover:opacity-80 transition-opacity">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                      {user.photoURL ? (
                        <Image src={user.photoURL} alt="Avatar" width={24} height={24} className="rounded-full" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
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
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => requestSignIn()}
                  className="hidden rounded-full text-muted-foreground transition-colors hover:bg-white/20 hover:text-foreground dark:hover:bg-white/10 sm:inline-flex font-semibold"
                >
                  Sign In
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
