"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-50 w-full pt-4 px-4 pb-2 bg-gradient-to-b from-background/80 to-transparent pointer-events-none">
      <header className="pointer-events-auto mx-auto w-full max-w-6xl rounded-2xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] supports-[backdrop-filter]:bg-background/30 transition-all duration-300 ease-in-out">
        <div className="flex h-16 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105 duration-300">
            {/* Logo Bubble */}
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white font-bold text-xl font-[family-name:var(--font-pacifico)] shadow-[0_0_15px_rgba(234,88,12,0.4)]">
              P
            </div>
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
                  className={`relative py-2 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-primary drop-shadow-[0_0_8px_rgba(234,88,12,0.3)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                  {/* Liquid Underline Effect for Active Link */}
                  {isActive && (
                    <span 
                      className="absolute left-0 bottom-0 h-[2px] w-full rounded-full bg-primary" 
                      style={{
                        boxShadow: "0 0 10px 1px rgba(234, 88, 12, 0.6)"
                      }} 
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <Link href="/login" passHref>
              <Button 
                variant="ghost" 
                className="inline-flex rounded-full text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
              >
                Sign In
              </Button>
            </Link>
            {/* 
            <Button className="rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-all duration-300">
              Book Appointment
            </Button> 
            */}
          </div>
        </div>
      </header>
    </div>
  );
}
