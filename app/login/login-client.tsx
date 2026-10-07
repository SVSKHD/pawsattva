"use client"

import { useEffect, useState, type PointerEvent } from "react"
import { useRouter } from "next/navigation"
import { FirebaseError } from "firebase/app"
import { signInWithPopup } from "firebase/auth"
import { CalendarDays, Loader2, PawPrint, ShieldCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { auth, googleProvider } from "@/firebase/firebase"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { phaseCopy, useDayPhase, type DayPhase } from "@/components/pet-scene/day-phase"
import { PetParade } from "@/components/pet-scene/pet-parade"
import { PetFriendsArt, SkyArt } from "@/components/pet-scene/scene-art"

function getSafeReturnTo() {
  if (typeof window === "undefined") return "/"
  const requestedPath = new URLSearchParams(window.location.search).get("returnTo")
  return requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/"
}

// Closing the Google popup is a choice, not an error worth a red toast
const DISMISSED_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"])

function getErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "auth/popup-blocked") {
    return "Your browser blocked the Google window. Allow pop-ups for this site and try again."
  }
  if (error instanceof FirebaseError && error.code === "auth/network-request-failed") {
    return "No connection. Check your internet and try again."
  }
  return "Google sign-in failed. Please try again."
}

// Full-page sky behind the glass for each part of the day
const backdrops: Record<DayPhase, string> = {
  morning: "from-amber-100 via-orange-50 to-rose-100 dark:from-amber-950 dark:via-zinc-950 dark:to-rose-950",
  afternoon: "from-sky-100 via-cyan-50 to-amber-50 dark:from-sky-950 dark:via-zinc-950 dark:to-amber-950",
  evening: "from-orange-200 via-rose-100 to-violet-200 dark:from-orange-950 dark:via-rose-950 dark:to-violet-950",
  night: "from-indigo-200 via-violet-100 to-slate-200 dark:from-indigo-950 dark:via-slate-950 dark:to-violet-950",
}

const perks = [
  { icon: Sparkles, title: "Paw GPT", text: "Reports and answers from your pet's own data" },
  { icon: CalendarDays, title: "Food Logger", text: "Meals, water and weekly weigh-ins" },
  { icon: PawPrint, title: "Pet plan", text: "Breed-aware diet and body-condition checks" },
]

export function LoginClient() {
  const [signingIn, setSigningIn] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const phase = useDayPhase()
  const copy = phaseCopy[phase]

  useEffect(() => {
    if (!authLoading && user) router.replace(getSafeReturnTo())
  }, [user, authLoading, router])

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success("Signed in with Google!")
      router.replace(getSafeReturnTo())
    } catch (error: unknown) {
      if (error instanceof FirebaseError && DISMISSED_CODES.has(error.code)) return
      console.error(error)
      toast.error(getErrorMessage(error))
    } finally {
      setSigningIn(false)
    }
  }

  const busy = signingIn || authLoading || Boolean(user)
  const buttonLabel = user ? "Taking you back…" : signingIn ? "Waiting for Google…" : "Sign in with Google"

  // A soft light follows the pointer across the glass; CSS variables avoid re-rendering on every move
  const followPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`)
  }

  return (
    <div className={`relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-br ${backdrops[phase]} transition-colors duration-700`}>
      {/* Behind the glass: colour blobs and the pet parade */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-orange-300/40 blur-[110px] dark:bg-orange-500/15" />
        <div className="absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-sky-300/35 blur-[110px] dark:bg-indigo-500/15" />
        <div className="absolute left-1/3 top-0 h-72 w-72 rounded-full bg-rose-200/40 blur-[110px] dark:bg-rose-500/10" />
      </div>
      <PetParade sleepy={phase === "night"} className="-z-10 pt-20 opacity-90" />

      <Header />

      <main className="relative flex flex-1 items-center justify-center px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-22 sm:px-6 md:pb-10 md:pt-28">
        {/* Frosted glass panel */}
        <div
          onPointerMove={followPointer}
          className="paw-gpt-anim-rise group/glass relative grid w-full max-w-5xl overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/25 shadow-[0_30px_80px_rgba(24,24,27,0.18),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-lg backdrop-saturate-150 md:grid-cols-[1.1fr_1fr] dark:border-white/10 dark:bg-zinc-900/45 dark:shadow-[0_30px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          {/* Sheen and pointer light */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent dark:from-white/10" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/glass:opacity-100"
            style={{
              background:
                "radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.35), transparent 45%)",
            }}
          />

          {/* Scene: pets, sun or moon, greeting */}
          <section className="relative flex flex-col items-center justify-center px-6 pb-5 pt-12 text-center sm:px-10 md:pb-12 md:pt-20">
            <div className="relative w-full max-w-[15rem] sm:max-w-[22rem]">
              <SkyArt phase={phase} className="absolute -top-10 -right-6 h-16 w-20 sm:-top-16 sm:right-0 sm:h-28 sm:w-32" />
              <PetFriendsArt sleepy={phase === "night"} className="w-full text-foreground" />
            </div>
            <h1 className="mt-3 text-balance text-2xl font-black tracking-tight sm:mt-5 sm:text-4xl">
              {copy.greeting}!
              <span className="block text-orange-600 dark:text-orange-400">Your pets missed you.</span>
            </h1>
            <p className="mt-2 hidden max-w-sm text-sm text-muted-foreground sm:block">{copy.line}</p>
          </section>

          {/* Sign in */}
          <section className="relative flex flex-col justify-center border-white/50 bg-white/50 px-6 pb-8 pt-6 sm:px-10 md:border-l md:py-12 dark:border-white/10 dark:bg-zinc-950/35">
            <h2 className="text-center font-[family-name:var(--font-pacifico)] text-3xl font-normal tracking-tight sm:text-4xl md:text-left">
              Welcome back
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground md:text-left">
              Sign in with your Google account to continue
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={busy}
              aria-busy={busy}
              className="group mt-5 flex h-13 sm:mt-7 w-full items-center justify-center gap-3 rounded-2xl border border-white/80 bg-white/90 text-sm font-bold text-zinc-800 shadow-[0_6px_20px_rgba(24,24,27,0.08)] transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-white hover:shadow-[0_12px_28px_rgba(234,88,12,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/25 active:translate-y-0 disabled:pointer-events-none disabled:opacity-70 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin text-orange-500" /> : <GoogleIcon />}
              {buttonLabel}
            </button>

            <ul className="mt-8 space-y-4">
              {perks.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-orange-600 shadow-sm ring-1 ring-white/80 dark:bg-white/10 dark:text-orange-400 dark:ring-white/10">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm">
                    <span className="block font-bold">{title}</span>
                    <span className="block text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground md:justify-start">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Your pet data stays private to your account.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 transition-transform group-hover:scale-110" aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
