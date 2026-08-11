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
import { Loader2, PawPrint, RotateCcw } from "lucide-react"
import { toast } from "sonner"

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
          className="max-w-md rounded-[2rem] border-orange-100 bg-background/95 p-7 shadow-2xl backdrop-blur-xl"
          onEscapeKeyDown={(event) => {
            if (signingIn || !dialogState.dismissible) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (signingIn || !dialogState.dismissible) event.preventDefault()
          }}
        >
          <DialogHeader className="items-center text-center">
            <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
              <PawPrint className="h-7 w-7" />
            </span>
            <DialogTitle className="text-2xl font-black">{dialogState.title}</DialogTitle>
            <DialogDescription className="max-w-sm text-balance leading-relaxed">
              {dialogState.description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 dark:bg-orange-950/30 dark:text-orange-200">
            <RotateCcw className="h-3.5 w-3.5" />
            Your current page and activity will be preserved.
          </div>

          <div className="mt-1 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full gap-3 rounded-xl bg-background font-semibold shadow-sm"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
            >
              {signingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
              {signingIn ? "Signing in…" : "Continue with Google"}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button asChild type="button" variant="ghost" className="rounded-xl">
                <Link href="/" onClick={closeDialog}>Back to Home</Link>
              </Button>
              <Button asChild type="button" variant="ghost" className="rounded-xl">
                <Link href="/blog" onClick={closeDialog}>Browse Blogs</Link>
              </Button>
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
