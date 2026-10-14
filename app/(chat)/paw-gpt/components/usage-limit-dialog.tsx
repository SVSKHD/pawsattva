"use client"

import { Check, Clock, Ticket } from "lucide-react"

import { PET_PALETTES, PetSprite } from "@/components/pet-scene/scene-art"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { PAW_GPT_DAILY_LIMIT, PAW_GPT_DAILY_PASS, PAW_GPT_DAILY_TOKEN_LIMIT } from "@/lib/paw-gpt"
import { UsageMeter, type PawGptQuota } from "./usage-meter"

/**
 * Payments aren't connected yet. When a provider is added, set NEXT_PUBLIC_PAW_GPT_PAYMENTS=on
 * and implement onBuyPass: create an order on the server, open the provider's checkout, verify
 * the payment on the server, then call grantDailyPass() (lib/server/paw-gpt-pass.ts).
 */
const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAW_GPT_PAYMENTS === "on"

/** Time until midnight in India, when the free allowance comes back. */
function untilIndiaMidnight(now = Date.now()) {
  const offset = 330 * 60_000
  const nextMidnight = Math.floor((now + offset) / 86_400_000 + 1) * 86_400_000 - offset
  const minutes = Math.max(1, Math.round((nextMidnight - now) / 60_000))
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

const inr = (value: number) => value.toLocaleString("en-IN")

export function UsageLimitDialog({
  open,
  onOpenChange,
  quota,
  petName,
  petKind,
  onBuyPass,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quota: PawGptQuota
  petName?: string
  petKind: "dog" | "cat"
  onBuyPass?: () => void
}) {
  const passUsedUp = quota.hasPass
  const reason = passUsedUp
    ? `You've used all ${inr(quota.tokenLimit)} tokens in today's Daily Pass.`
    : quota.tokensLeft === 0
      ? `You've used today's ${inr(PAW_GPT_DAILY_TOKEN_LIMIT)} free tokens.`
      : `You've asked all ${PAW_GPT_DAILY_LIMIT} free questions for today.`
  const other = petKind === "dog" ? "cat" : "dog"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[2rem] p-0 sm:max-w-md">
        {/* Pets having a well-earned nap */}
        <div aria-hidden className="relative flex h-32 items-end justify-center gap-3 overflow-hidden rounded-t-[2rem] bg-gradient-to-b from-violet-200/70 via-orange-100 to-orange-50 pb-3 dark:from-violet-950/60 dark:via-orange-950/30 dark:to-transparent">
          <span className="paw-gpt-anim-zzz absolute left-[38%] top-5 text-lg font-black text-violet-500/70">z</span>
          <span className="paw-gpt-anim-zzz absolute left-[44%] top-3 text-sm font-black text-violet-500/60" style={{ animationDelay: "0.8s" }}>z</span>
          <PetSprite kind={petKind} colors={PET_PALETTES.golden} sleepy className="h-24 w-auto" />
          <PetSprite kind={other} colors={PET_PALETTES.ginger} sleepy className="h-[4.5rem] w-auto -scale-x-100" />
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          <div className="text-center">
            <DialogTitle className="text-xl font-black tracking-tight">
              {passUsedUp ? `Big day for ${petName || "your pet"}!` : `You and ${petName || "your pet"} have been busy!`}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm">
              {reason} {passUsedUp ? "" : "Need more today?"}
            </DialogDescription>
          </div>

          <UsageMeter quota={quota} showNote={false} />

          {!passUsedUp && (
            <div className="rounded-3xl border-2 border-violet-500/30 bg-violet-500/[0.06] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-black">
                    <Ticket className="h-4 w-4 text-violet-600" /> Daily Pass
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">One-time payment, no subscription</p>
                </div>
                <p className="text-2xl font-black tracking-tight">₹{PAW_GPT_DAILY_PASS.priceInr}</p>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {[
                  "Unlimited questions until midnight",
                  `Up to ${inr(PAW_GPT_DAILY_PASS.tokenLimit)} tokens today`,
                  "Reports, diet plans and follow-ups for every pet",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    {line}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                disabled={!PAYMENTS_ENABLED || !onBuyPass}
                onClick={onBuyPass}
                className="mt-4 h-11 w-full rounded-2xl border-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold text-white hover:from-violet-700 hover:to-fuchsia-700"
              >
                {PAYMENTS_ENABLED ? `Get the Daily Pass · ₹${PAW_GPT_DAILY_PASS.priceInr}` : "Payments are coming soon"}
              </Button>
              {!PAYMENTS_ENABLED && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">We&apos;re setting up secure payments. Your free questions return at midnight.</p>
              )}
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Free questions are back in {untilIndiaMidnight()} (midnight, India time)
          </p>

          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 w-full rounded-2xl text-sm font-semibold">
            I&apos;ll come back tomorrow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
