"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Loader2, MessageCircle, Phone } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getUserProfile, updateUser } from "@/firebase/firestore"

const isValidPhone = (value: string) => {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 15
}

export function ProfileOnboardingGate() {
  const { user, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState("")
  const [sameAsPhone, setSameAsPhone] = useState(true)
  const [whatsappPhone, setWhatsappPhone] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    if (authLoading || !user || pathname === "/login") {
      if (!user) {
        setCheckedUserId(null)
        setOpen(false)
      }
      return
    }

    if (checkedUserId === user.uid) return

    const loadProfile = async () => {
      try {
        const profile = await getUserProfile(user.uid)
        if (!active) return

        const profilePhone = profile?.phone?.trim() ?? ""
        const profileWhatsapp = profile?.whatsappPhone?.trim() ?? ""
        const profileSame = profile?.whatsappSameAsPhone ?? true

        setPhone(profilePhone)
        setSameAsPhone(profileSame)
        setWhatsappPhone(profileSame ? profilePhone : profileWhatsapp)

        const profileComplete =
          isValidPhone(profilePhone) &&
          (profileSame || isValidPhone(profileWhatsapp))

        setOpen(!profileComplete)
      } catch (error) {
        console.error("Unable to check profile contact details:", error)
      } finally {
        if (active) setCheckedUserId(user.uid)
      }
    }

    void loadProfile()
    return () => {
      active = false
    }
  }, [authLoading, checkedUserId, pathname, user])

  const handleSave = async () => {
    if (!user) return

    const cleanedPhone = phone.trim()
    const cleanedWhatsapp = sameAsPhone ? cleanedPhone : whatsappPhone.trim()

    if (!isValidPhone(cleanedPhone)) {
      toast.error("Please enter a valid phone number.")
      return
    }

    if (!sameAsPhone && !isValidPhone(cleanedWhatsapp)) {
      toast.error("Please enter a valid WhatsApp number.")
      return
    }

    setSaving(true)
    try {
      await updateUser(user.uid, {
        phone: cleanedPhone,
        whatsappPhone: cleanedWhatsapp,
        whatsappSameAsPhone: sameAsPhone,
      })
      setOpen(false)
      toast.success("Contact details saved.")
    } catch (error) {
      console.error("Unable to save contact details:", error)
      toast.error("Could not save your contact details. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!user || pathname === "/login") return null

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md rounded-[2rem] border-orange-100 bg-background/98 p-6 shadow-2xl backdrop-blur-xl sm:p-7"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
            <Phone className="h-7 w-7" />
          </span>
          <DialogTitle className="text-2xl font-black">One last step</DialogTitle>
          <DialogDescription className="max-w-sm text-balance leading-relaxed">
            Add your phone number so PawSattva can keep your pet profile and logger contact details together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone number</Label>
            <Input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(event) => {
                const value = event.target.value
                setPhone(value)
                if (sameAsPhone) setWhatsappPhone(value)
              }}
              disabled={saving}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-muted/30 p-4">
            <Checkbox
              checked={sameAsPhone}
              onCheckedChange={(checked) => {
                const next = checked === true
                setSameAsPhone(next)
                if (next) setWhatsappPhone(phone)
              }}
              disabled={saving}
              aria-label="Use the same number for WhatsApp"
            />
            <span>
              <span className="flex items-center gap-2 font-semibold">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Same number for WhatsApp
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Uncheck this if your WhatsApp number is different.
              </span>
            </span>
          </label>

          {!sameAsPhone && (
            <div className="space-y-2">
              <Label htmlFor="profile-whatsapp">WhatsApp number</Label>
              <Input
                id="profile-whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={whatsappPhone}
                onChange={(event) => setWhatsappPhone(event.target.value)}
                disabled={saving}
              />
            </div>
          )}

          <Button
            type="button"
            className="h-12 w-full rounded-xl font-bold"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save and continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
