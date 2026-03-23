import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          {/* Placeholder for Logo */}
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white font-bold text-xl font-[family-name:var(--font-pacifico)]">
            P
          </div>
          <span className="text-2xl tracking-normal bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent font-[family-name:var(--font-pacifico)]">
            Petsattva
          </span>
        </Link>
        
        <nav className="ml-8 hidden md:flex items-center gap-6">
          <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Services
          </Link>
          <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            About Us
          </Link>
          <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Contact
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link href="/login" passHref>
            <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          </Link>
          <Button className="rounded-full shadow-sm">
            Book Appointment
          </Button>
        </div>
      </div>
    </header>
  );
}
