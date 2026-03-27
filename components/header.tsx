"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Paw from "../app/pawsattva.png"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/pet-feed", label: "Pet Feed" },
];

import { useAuth } from "@/components/auth-provider";
import { auth } from "@/firebase/firebase";
import { signOut } from "firebase/auth";
import { LogOut, LayoutDashboard, User, Loader2, Menu, Home, BookOpen } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { useEffect, useState, useRef } from "react";

export function Header() {
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Always show at the top
      if (window.scrollY < 20) {
        setIsVisible(true);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        return;
      }

      // Hide while scrolling
      setIsVisible(false);

      // Show when scroll stops (after 300ms of inactivity)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(true);
      }, 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
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
      className={`mb-5 fixed top-0 left-0 right-0 z-50 px-4 pt-4 transition-all duration-500 ease-in-out ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-32 opacity-0"
        }`}
    >
      <header className="pointer-events-auto mx-auto w-full max-w-6xl rounded-4xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-all duration-300 ease-in-out">
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
              const isActive = pathname === link.href;
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
              <div className="flex items-center gap-3 bg-white/10 dark:bg-white/5 pl-3 pr-1 py-1 rounded-full border border-white/10">
                <div className="flex items-center gap-2 overflow-hidden">
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
                </div>
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
              <Link href="/login" className="hidden sm:block">
                <Button
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors font-semibold"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>

    {/* Mobile Bottom Navigation */}
    <nav className="md:hidden fixed bottom-6 left-4 right-4 z-[60]">
      <div className="flex items-center justify-around h-16 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-4">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">HOME</span>
        </Link>

        <Link
          href="/blog"
          className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${pathname.startsWith("/blog") ? "text-primary" : "text-muted-foreground"
            }`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">BLOG</span>
        </Link>

        <Drawer>
          <DrawerTrigger asChild>
            <button className="flex flex-col items-center justify-center p-2 text-muted-foreground hover:text-primary transition-all">
              <Menu className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">MORE</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="rounded-t-[2.5rem] border-t border-white/20 bg-white/85 backdrop-blur-2xl focus:outline-none">
            <DrawerHeader className="items-center pb-4 border-b border-black/5">
              <DrawerTitle className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <Image src={Paw} alt="Logo" fill className="object-contain" sizes="32px" />
                </div>
                <span className="text-lg font-[family-name:var(--font-pacifico)] bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                  Paw Sattva
                </span>
              </DrawerTitle>
            </DrawerHeader>
            <div className="grid grid-cols-2 gap-4 p-4 pb-12">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-center gap-2 text-base font-semibold p-4 rounded-2xl transition-all ${pathname === link.href
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-black/5 text-muted-foreground hover:bg-black/10 hover:text-foreground"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center justify-center gap-2 text-sm font-semibold p-4 rounded-2xl bg-orange-600/5 text-orange-600 border border-orange-600/10 hover:bg-orange-600/10 transition-all col-span-2"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Admin Dashboard
                </Link>
              )}
              {!user && (
                <Link href="/login" className="col-span-2 mt-2">
                  <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-orange-600 font-bold shadow-lg shadow-primary/20">
                    Sign In Now
                  </Button>
                </Link>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
    </>
  );
}
