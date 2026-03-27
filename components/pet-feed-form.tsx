"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useEffect } from "react"
import { savePetFeed, PetFeed } from "@/firebase/firestore"
import { Loader2, Dog, Phone, User, Heart, Calendar, Bell, Mail, PawPrint, CheckCircle2, ChevronRight, Sparkles } from "lucide-react"

export function PetFeedForm() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    petType: "",
    petBreed: "",
    otherType: "",
    otherBreed: "",
    petName: "",
    mealDays: 1,
    reminders: false,
    subscribe: true,
  })

  // Restore state from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("petFeedForm")
    const savedStep = localStorage.getItem("petFeedStep")

    if (savedData) {
      try {
        setFormData(JSON.parse(savedData))
      } catch (e) {
        console.error("Error parsing saved form data:", e)
      }
    }

    if (savedStep) {
      setStep(parseInt(savedStep))
    }
  }, [])

  // Persist state to localStorage
  useEffect(() => {
    if (!isSubmitted) {
      localStorage.setItem("petFeedForm", JSON.stringify(formData))
      localStorage.setItem("petFeedStep", step.toString())
    }
  }, [formData, step, isSubmitted])

  const petTypes = [
    "Dog", "Cat", "Rabbit", "Hamster", "Bird", "Fish", "Others"
  ]

  const breedMapping: Record<string, string[]> = {
    Dog: ["Labrador", "German Shepherd", "Golden Retriever", "Poodle", "Beagle", "Indian Pariah", "Others"],
    Cat: ["Persian", "Siamese", "Maine Coon", "Bengal", "Ragdoll", "Others"],
    Rabbit: ["Holland Lop", "Netherland Dwarf", "Mini Rex", "Others"],
    Hamster: ["Syrian", "Dwarf", "Roborovski", "Others"],
    Bird: ["Parrot", "Budgie", "Canary", "Cockatiel", "Others"],
    Fish: ["Goldfish", "Betta", "Guppy", "Tetra", "Others"],
  }

  const steps = [
    { title: "User Info", icon: User, desc: "About you" },
    { title: "Pet Info", icon: Dog, desc: "Your furry friend" },
    { title: "Preferences", icon: Calendar, desc: "Meal settings" },
    { title: "Complete", icon: CheckCircle2, desc: "All set!" },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const nextStep = () => {
    if (step === 0 && (!formData.name || !formData.phone)) {
      toast.error("Please provide your name and phone.")
      return
    }
    if (step === 1 && (!formData.petName || !formData.petType)) {
      toast.error("Please provide pet details.")
      return
    }
    if (step === 1 && formData.petType === "Others" && !formData.otherType) {
      toast.error("Please specify the pet type.")
      return
    }
    if (step === 1 && formData.petType !== "Others" && !formData.petBreed) {
      toast.error("Please provide pet breed.")
      return
    }
    if (step === 1 && formData.petBreed === "Others" && !formData.otherBreed) {
      toast.error("Please specify the breed.")
      return
    }
    setStep((s) => s + 1)
  }

  const prevStep = () => setStep((s) => s - 1)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const finalPetBreed = formData.petType === "Others"
        ? formData.otherType
        : (formData.petBreed === "Others" ? formData.otherBreed : formData.petBreed);

      const finalData = {
        ...formData,
        petType: formData.petType === "Others" ? "Other" : formData.petType,
        petBreed: finalPetBreed
      }
      await savePetFeed(finalData as any)
      toast.success("Pet feed details saved successfully!")
      localStorage.removeItem("petFeedForm")
      localStorage.removeItem("petFeedStep")
      setIsSubmitted(true)
      setStep(3)
    } catch (error) {
      console.error("Error saving pet feed:", error)
      toast.error("Failed to save pet feed details.")
    } finally {
      setLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-none bg-white/60 dark:bg-black/40 backdrop-blur-2xl shadow-2xl rounded-[3rem] overflow-hidden animate-in zoom-in duration-700 fill-mode-both">
        <CardContent className="p-8 md:p-12 text-center space-y-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 mb-6 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-black tracking-tight text-foreground">Plan Generated!</h2>
            <p className="text-lg text-muted-foreground font-medium max-w-md mx-auto">
              We've successfully created a tailored wellness journey for your best friend.
            </p>
          </div>

          <div className="p-8 rounded-[2rem] bg-orange-50/50 dark:bg-orange-950/20 border-2 border-orange-100/50 dark:border-orange-900/10 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <h3 className="text-xl font-black text-orange-800 dark:text-orange-400 mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 animate-pulse" /> Generated Schedule
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">Pet Name</p>
                <p className="text-lg font-bold">{formData.petName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">Type</p>
                <p className="text-lg font-bold">{formData.petType === "Others" ? formData.otherType : formData.petType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">Breed</p>
                <p className="text-lg font-bold truncate">
                  {formData.petType === "Others" ? "N/A" : (formData.petBreed === "Others" ? formData.otherBreed : formData.petBreed)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">Meal Coverage</p>
                <p className="text-lg font-bold">{formData.mealDays} Days</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  <p className="text-sm font-bold text-green-600">Active Plan</p>
                </div>
              </div>
            </div>
            <div className="mt-8 p-5 rounded-2xl bg-white/60 dark:bg-black/40 text-sm font-medium text-muted-foreground italic border border-white/40">
              "Our nutritionists are finalizing the specific daily recipes for {formData.petName}. Expect the full {formData.mealDays}-day digital guide in your inbox shortly!"
            </div>
          </div>

          <Button
            onClick={() => window.location.reload()}
            className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]"
          >
            Create Another Profile 🐾
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-none bg-white/60 dark:bg-black/40 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden">
      <CardHeader className="p-8 md:p-10 pb-0 text-center relative overflow-hidden">
        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-10 relative px-4">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2 z-0 mx-8" />
          {steps.map((s, idx) => {
            const Icon = s.icon
            const active = step >= idx
            const current = step === idx

            // Allow jumping back or to the next available step
            const canJump = idx <= step || (idx === step + 1 && (
              (step === 0 && formData.name && formData.phone) ||
              (step === 1 && formData.petName && formData.petBreed && (formData.petBreed !== "Others" || formData.otherBreed))
            ))

            return (
              <button
                key={idx}
                type="button"
                onClick={() => canJump && setStep(idx)}
                disabled={!canJump}
                className="relative z-10 flex flex-col items-center gap-2 group outline-none"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${active
                    ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-background border-muted text-muted-foreground"
                    } ${current ? "scale-125 ring-4 ring-orange-500/20" : ""} ${canJump && !current ? "group-hover:border-orange-500/50 group-hover:scale-110" : ""}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest hidden md:block transition-colors ${active ? "text-orange-600" : "text-muted-foreground"} ${canJump ? "group-hover:text-primary" : ""}`}>
                  {s.title}
                </span>
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <CardTitle className="text-3xl font-black tracking-tight">{steps[step].title}</CardTitle>
          <CardDescription className="text-base text-muted-foreground">{steps[step].desc}</CardDescription>
        </div>
      </CardHeader>

      <div className="relative overflow-hidden">
        <CardContent className="p-8 md:p-12 space-y-8 animate-in slide-in-from-right fade-in duration-500 fill-mode-both" key={step}>
          {step === 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Your Full Name</Label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    className="px-14 h-14 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 focus:ring-orange-500/20 text-lg shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="px-14 h-14 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 focus:ring-orange-500/20 text-lg shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <Label htmlFor="petName" className="text-sm font-semibold">What's your pet's name?</Label>
                  <div className="relative">
                    <Dog className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="petName"
                      name="petName"
                      placeholder="Fido, Whiskers, etc."
                      value={formData.petName}
                      onChange={handleChange}
                      className="px-14 h-14 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 focus:ring-orange-500/20 text-lg shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="petType" className="text-sm font-semibold">Pet Type</Label>
                  <Select
                    value={formData.petType}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, petType: val, petBreed: "" }))}
                  >
                    <div className="relative">
                      <PawPrint className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <SelectTrigger className="w-full px-14 h-14 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 focus:ring-orange-500/20 text-lg shadow-sm">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                    </div>
                    <SelectContent className="rounded-xl border-orange-100 shadow-2xl">
                      {petTypes.map(type => (
                        <SelectItem key={type} value={type} className="h-12 focus:bg-orange-50">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.petType === "Others" ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="otherType" className="text-sm font-semibold">Specify Pet Type</Label>
                    <div className="relative">
                      <PawPrint className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="otherType"
                        name="otherType"
                        placeholder="e.g. Turtle, Iguana..."
                        value={formData.otherType}
                        onChange={handleChange}
                        className="px-14 h-14 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 focus:ring-orange-500/20 text-lg shadow-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="petBreed" className="text-sm font-semibold">Pet Breed</Label>
                    {formData.petType ? (
                      <Select
                        value={formData.petBreed}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, petBreed: val }))}
                      >
                        <div className="relative">
                          <Heart className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                          <SelectTrigger className="w-full px-14 h-14 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 focus:ring-orange-500/20 text-lg shadow-sm">
                            <SelectValue placeholder="Breed" />
                          </SelectTrigger>
                        </div>
                        <SelectContent className="rounded-xl border-orange-100 shadow-2xl">
                          {(breedMapping[formData.petType] || ["Others"]).map(breed => (
                            <SelectItem key={breed} value={breed} className="h-12 focus:bg-orange-50">
                              {breed}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-14 rounded-xl bg-muted/40 flex items-center px-14 text-muted-foreground text-sm border border-dashed italic">
                        Select type first
                      </div>
                    )}
                  </div>
                )}

                {formData.petBreed === "Others" && formData.petType !== "Others" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="otherBreed" className="text-sm font-semibold">Specify {formData.petType} Breed</Label>
                    <div className="relative">
                      <Heart className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="otherBreed"
                        name="otherBreed"
                        placeholder="Enter breed name"
                        value={formData.otherBreed}
                        onChange={handleChange}
                        className="px-14 h-14 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 focus:ring-orange-500/20 text-lg shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="mealDays" className="text-sm font-semibold">Meal for how many days?</Label>
                <div className="relative">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="mealDays"
                    name="mealDays"
                    type="number"
                    min="1"
                    value={formData.mealDays}
                    onChange={handleChange}
                    className="px-14 h-14 rounded-xl bg-white/50 dark:bg-black/20 border-white/40 focus:ring-orange-500/20 text-lg shadow-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/10">
                  <div className="space-y-1">
                    <Label className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Bell className="w-4 h-4 text-orange-500" /> Daily Reminders
                    </Label>
                    <p className="text-sm text-muted-foreground">Get notifications for feeding schedules</p>
                  </div>
                  <Switch
                    checked={formData.reminders}
                    onCheckedChange={(checked) => handleSwitchChange("reminders", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/10">
                  <div className="space-y-1">
                    <Label className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Mail className="w-4 h-4 text-orange-500" /> Exclusive Tips
                    </Label>
                    <p className="text-sm text-muted-foreground">Subscribe to our newsletter for pet care advice</p>
                  </div>
                  <Switch
                    checked={formData.subscribe}
                    onCheckedChange={(checked) => handleSwitchChange("subscribe", checked)}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-8 md:p-10 pt-0 flex gap-4">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="h-14 px-8 rounded-2xl border-2 hover:bg-muted font-bold"
            >
              Back
            </Button>
          )}
          <Button
            onClick={step === 2 ? handleSubmit : nextStep}
            disabled={loading}
            className="flex-1 h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : step === 2 ? (
              "Complete Setup 🐾"
            ) : (
              "Continue"
            )}
          </Button>
        </CardFooter>
      </div>
    </Card>
  )
}
