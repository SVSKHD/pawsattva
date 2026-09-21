"use client"

import { ReactNode, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { useAuthDialog } from "@/components/auth-dialog-provider"
import { useAuth } from "@/components/auth-provider"

export function PetCareAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { requestSignIn } = useAuthDialog()
  const requestedRef = useRef(false)

  useEffect(() => {
    if (authLoading) return
    if (user) {
      requestedRef.current = false
      return
    }
    if (requestedRef.current) return

    requestedRef.current = true
    requestSignIn({
      title: "Sign in to start Pet Care",
      description:
        "Continue with Google so we can prefill your details, securely save your progress, and keep your pet care plan connected to your account.",
      successMessage: "Signed in. Your Pet Care plan is ready to continue.",
      dismissible: false,
    })
  }, [authLoading, requestSignIn, user])

  if (authLoading) {
    return (
      <div className="flex min-h-[22rem] items-center justify-center" aria-label="Checking sign-in status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[22rem] items-center justify-center rounded-[2rem] border border-orange-100/70 bg-white/60 p-8 text-center shadow-sm backdrop-blur-xl dark:border-orange-900/30 dark:bg-black/30">
        <div className="max-w-sm space-y-2">
          <p className="text-lg font-bold text-foreground">Google sign-in required</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sign in to access PetFeed, prefill your contact details, and securely save your progress.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
