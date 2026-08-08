"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"
import { signInWithPopup } from "firebase/auth"
import { Loader2, PawPrint } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { auth, googleProvider } from "@/firebase/firebase"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Google sign-in failed."
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

export function PetCareAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [signingIn, setSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success("Signed in with Google!")
    } catch (error: unknown) {
      console.error(error)
      toast.error(getErrorMessage(error))
    } finally {
      setSigningIn(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[22rem] items-center justify-center" aria-label="Checking sign-in status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div aria-hidden={!user} className={!user ? "pointer-events-none select-none blur-[2px]" : undefined}>
        {children}
      </div>
      <Dialog open={!user}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md rounded-[2rem] border-orange-100 bg-background/95 p-7 shadow-2xl backdrop-blur-xl"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="items-center text-center">
            <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <PawPrint className="h-7 w-7" />
            </span>
            <DialogTitle className="text-2xl font-black">Sign in to start Pet Care</DialogTitle>
            <DialogDescription className="max-w-sm text-balance">
              Continue with Google so we can prefill your details, securely save your progress, and keep your pet care plan connected to your account.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-3">
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
                <Link href="/">Back to Home</Link>
              </Button>
              <Button asChild type="button" variant="ghost" className="rounded-xl">
                <Link href="/blog">Browse Blogs</Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
