"use client"

import Link from "next/link"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import type { ReactNode } from "react"
import { signInWithPopup } from "firebase/auth"
import type { User } from "firebase/auth"
import Image from "next/image"
import { CalendarHeart, Heart, Loader2, MessageCircle, PawPrint, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import PawLogo from "@/app/pawsattva.png"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { auth, googleProvider } from "@/firebase/firebase"

type SignInContinuation = (user: User) => void | Promise<void>

export interface SignInDialogOptions {
  title?: string
  description?: string
  successMessage?: string
  dismissible?: boolean
  onSuccess?: SignInContinuation
}

interface SignInDialogState {
  title: string
  description: string
  successMessage: string
  dismissible: boolean
}

interface AuthDialogContextValue {
  requestSignIn: (options?: SignInDialogOptions) => void
}

const defaultDialogState: SignInDialogState = {
  title: "Continue with Paw Sattva",
  description:
    "Sign in with Google without leaving this page. We’ll bring you straight back to what you were doing.",
  successMessage: "Signed in with Google. Resuming your activity…",
  dismissible: true,
}

const SIGN_IN_PERKS = [
  { icon: Heart, text: "Save your pet's feed plan and progress" },
  { icon: CalendarHeart, text: "Track meals and weight in the logger" },
  { icon: MessageCircle, text: "Comment and react on every guide" },
]

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null)

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "Google sign-in failed. Please try again."
  }

  const code = String(error.code).toLowerCase()
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) {
    return "Sign-in was cancelled. Your activity is still here when you’re ready."
  }
  if (code.includes("popup-blocked")) {
    return "Your browser blocked the Google sign-in window. Please allow pop-ups and try again."
  }
  if (code.includes("network")) {
    return "We couldn’t reach Google. Check your connection and try again."
  }

  return "Google sign-in failed. Please try again."
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [dialogState, setDialogState] = useState(defaultDialogState)
  const continuationRef = useRef<SignInContinuation | null>(null)

  const runContinuation = useCallback(async (continuation: SignInContinuation | null, user: User) => {
    if (!continuation) return

    try {
      await continuation(user)
    } catch (error) {
      console.error("Unable to resume the activity after sign-in.", error)
      toast.error("You’re signed in, but we couldn’t finish that activity. Please try it once more.")
    }
  }, [])

  const requestSignIn = useCallback(
    (options: SignInDialogOptions = {}) => {
      const continuation = options.onSuccess ?? null
      const currentUser = auth.currentUser

      if (currentUser) {
        void runContinuation(continuation, currentUser)
        return
      }

      continuationRef.current = continuation
      setDialogState({
        title: options.title ?? defaultDialogState.title,
        description: options.description ?? defaultDialogState.description,
        successMessage: options.successMessage ?? defaultDialogState.successMessage,
        dismissible: options.dismissible ?? defaultDialogState.dismissible,
      })
      setOpen(true)
    },
    [runContinuation]
  )

  const closeDialog = useCallback(() => {
    continuationRef.current = null
    setOpen(false)
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && (signingIn || !dialogState.dismissible)) return
      if (!nextOpen) continuationRef.current = null
      setOpen(nextOpen)
    },
    [dialogState.dismissible, signingIn]
  )

  const handleGoogleSignIn = async () => {
    setSigningIn(true)

    try {
      const credential = await signInWithPopup(auth, googleProvider)
      const continuation = continuationRef.current
      continuationRef.current = null
      setOpen(false)
      toast.success(dialogState.successMessage)
      await runContinuation(continuation, credential.user)
    } catch (error) {
      console.error("Google sign-in failed.", error)
      toast.error(getErrorMessage(error))
    } finally {
      setSigningIn(false)
    }
  }

  const contextValue = useMemo(() => ({ requestSignIn }), [requestSignIn])

  return (
    <AuthDialogContext.Provider value={contextValue}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={dialogState.dismissible && !signingIn}
          // Above the fixed mobile nav (z-80) and pet guide (z-70), so nothing floats over the dialog
          overlayClassName="z-[100] bg-black/35"
          className="z-[100] max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto overflow-x-hidden rounded-[2rem] border-0 bg-background p-0 shadow-2xl shadow-orange-950/20 ring-0 sm:max-w-[25rem]"
          onEscapeKeyDown={(event) => {
            if (signingIn || !dialogState.dismissible) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (signingIn || !dialogState.dismissible) event.preventDefault()
          }}
        >
          {/* Brand band */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 px-6 pb-12 pt-8 dark:from-orange-700 dark:via-orange-600 dark:to-amber-500">
            <PawPrint aria-hidden className="absolute -left-3 top-4 h-16 w-16 -rotate-12 text-white/15" />
            <PawPrint aria-hidden className="absolute right-6 top-14 h-10 w-10 rotate-12 text-white/20" />
            <PawPrint aria-hidden className="absolute -bottom-2 left-1/3 h-12 w-12 rotate-[24deg] text-white/10" />
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-white shadow-xl shadow-orange-900/20 ring-4 ring-white/40">
              <Image src={PawLogo} alt="" width={60} height={60} className="h-15 w-15 object-contain" priority />
            </div>
          </div>

          {/* Body lifts over the band */}
          <div className="relative -mt-6 rounded-t-[1.75rem] bg-background px-6 pb-6 pt-7 sm:px-7">
            <DialogHeader className="items-center gap-2 pr-0 text-center sm:pr-0">
              <DialogTitle className="text-balance text-2xl font-black leading-tight tracking-tight">
                {dialogState.title}
              </DialogTitle>
              <DialogDescription className="text-balance text-sm leading-relaxed">
                {dialogState.description}
              </DialogDescription>
            </DialogHeader>

            <ul className="mt-5 space-y-2.5">
              {SIGN_IN_PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm font-medium">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="outline"
              className="mt-6 h-12 w-full gap-3 rounded-2xl border-2 bg-background text-base font-bold shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-orange-300 hover:bg-background hover:shadow-md active:translate-y-0"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
            >
              {signingIn ? <Loader2 className="h-5 w-5 animate-spin text-orange-500" /> : <GoogleIcon />}
              {signingIn ? "Finish in the Google window…" : "Continue with Google"}
            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              You&apos;ll come straight back to this page.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3 border-t pt-4 text-sm font-semibold">
              <Link href="/blog" onClick={closeDialog} className="rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-orange-600">
                Browse blogs
              </Link>
              <span aria-hidden className="h-1 w-1 rounded-full bg-border" />
              <Link href="/" onClick={closeDialog} className="rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-orange-600">
                Back to home
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthDialogContext.Provider>
  )
}

export function useAuthDialog() {
  const context = useContext(AuthDialogContext)
  if (!context) {
    throw new Error("useAuthDialog must be used within AuthDialogProvider")
  }
  return context
}
