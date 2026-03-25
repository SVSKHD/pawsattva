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
];

import { useAuth } from "@/components/auth-provider";
import { auth } from "@/firebase/firebase";
import { signOut } from "firebase/auth";
import { LogOut, LayoutDashboard, User, Loader2 } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="absolute top-0 z-50 w-full pt-4 px-4 pb-2 bg-gradient-to-b from-background/40 to-transparent pointer-events-none">
      <header className="pointer-events-auto mx-auto w-full max-w-6xl rounded-2xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out">
        <div className="flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105 duration-300">
            {/* Logo Bubble */}
            <Image src={Paw} alt="Logo" width={48} height={48} className="object-contain" />
            {/* Logo Text */}
            <span className="text-2xl tracking-normal bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent font-[family-name:var(--font-pacifico)] group-hover:from-orange-500 group-hover:to-primary transition-colors duration-500">
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
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground hover:text-orange-600 transition-colors hidden sm:flex items-center gap-2"
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
              <Link href="/login">
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
  );
}
