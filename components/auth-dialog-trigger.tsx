"use client"

import type { ComponentProps, MouseEventHandler } from "react"

import { useAuthDialog } from "@/components/auth-dialog-provider"
import { Button } from "@/components/ui/button"

interface AuthDialogTriggerProps extends ComponentProps<typeof Button> {
  signInTitle?: string
  signInDescription?: string
}

export function AuthDialogTrigger({
  signInTitle,
  signInDescription,
  onClick,
  ...buttonProps
}: AuthDialogTriggerProps) {
  const { requestSignIn } = useAuthDialog()

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event)
    if (event.defaultPrevented) return

    requestSignIn({
      title: signInTitle,
      description: signInDescription,
    })
  }

  return <Button {...buttonProps} onClick={handleClick} />
}
