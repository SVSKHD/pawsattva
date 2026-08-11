"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { useAuthDialog } from "@/components/auth-dialog-provider"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/firebase/db"
import { signOut } from "firebase/auth"
import { auth } from "@/firebase/firebase"
import { UserProfile } from "@/firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  User,
  Mail,
  Phone,
  Dog,
  Calendar,
  Bell,
  PawPrint,
  LogOut,
  ChevronRight,
  Sparkles,
  Clock,
  Shield,
  Plus,
  Heart,
  Loader2,
} from "lucide-react"

export default function DashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const { requestSignIn } = useAuthDialog()
  const router = useRouter()
  const requestedSignInRef = useRef(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (user) {
      requestedSignInRef.current = false
      return
    }
    if (requestedSignInRef.current) return

    requestedSignInRef.current = true
    requestSignIn({
      title: "Sign in to open your dashboard",
      description:
        "Continue with Google without leaving this page. We’ll open your saved pet details and plans as soon as you return.",
      successMessage: "Signed in. Loading your dashboard…",
      dismissible: false,
    })
  }, [authLoading, requestSignIn, user])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return
      try {
        const docRef = doc(db, "users", user.uid)
        const snapshot = await getDoc(docRef)
        if (snapshot.exists()) {
          setProfile({ id: snapshot.id, ...snapshot.data() } as UserProfile)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoadingProfile(false)
      }
    }
    if (user) fetchProfile()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (authLoading || loadingProfile || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center animate-pulse">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-semibold">Loading your dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  const petFeeds = profile?.petFeeds || []
  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt.seconds ? profile.createdAt.seconds * 1000 : profile.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "N/A"

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:px-8 md:py-12 space-y-8">

      {/* Hero Profile Section */}
      <div className="mt-20 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-[2px]">
        <div className="rounded-[2.4rem] bg-white/95 dark:bg-black/90 backdrop-blur-2xl p-8 md:p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/5 rounded-full -ml-24 -mb-24 blur-3xl" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-2xl shadow-orange-500/30 overflow-hidden transition-transform group-hover:scale-105">
                {user.photoURL ? (
                  <Image src={user.photoURL} alt="Avatar" width={112} height={112} className="rounded-3xl object-cover" />
                ) : (
                  <User className="w-14 h-14" />
                )}
              </div>
              {isAdmin && (
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-violet-500/30 border-2 border-white dark:border-black">
                  Admin
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                  {user.displayName || "Pet Parent"}
                </h1>
                <p className="text-muted-foreground font-medium mt-1 flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
                {profile?.phone && (
                  <p className="text-muted-foreground font-medium mt-1 flex items-center justify-center md:justify-start gap-2">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {joinDate}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                  <PawPrint className="w-3.5 h-3.5" />
                  {petFeeds.length} {petFeeds.length === 1 ? "Pet" : "Pets"}
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20">
                    <Shield className="w-3.5 h-3.5" />
                    Administrator
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 shrink-0">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="h-11 px-6 rounded-xl border-2 border-destructive/20 text-destructive hover:bg-destructive/10 font-semibold transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              {isAdmin && (
                <Link href="/admin">
                  <Button
                    className="w-full h-11 px-6 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-500/20 transition-all"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "My Pets", value: petFeeds.length.toString(), icon: Dog, color: "orange" },
          { label: "Active Plans", value: petFeeds.length > 0 ? petFeeds.length.toString() : "0", icon: Sparkles, color: "amber" },
          { label: "Reminders", value: petFeeds.filter(f => f.reminders).length.toString(), icon: Bell, color: "blue" },
          { label: "Subscribed", value: petFeeds.filter(f => f.subscribe).length > 0 ? "Yes" : "No", icon: Heart, color: "rose" },
        ].map((stat) => (
          <Card key={stat.label} className="border-white/40 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform">
            <CardContent className="p-5">
              <div className={`p-2.5 rounded-xl w-fit mb-3 ${
                stat.color === "orange" ? "bg-orange-500/10 text-orange-600" :
                stat.color === "amber" ? "bg-amber-500/10 text-amber-600" :
                stat.color === "blue" ? "bg-blue-500/10 text-blue-600" :
                "bg-rose-500/10 text-rose-600"
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pet Feed Section */}
      <Card className="border-white/40 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-2xl shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                <PawPrint className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">My Pets</CardTitle>
                <CardDescription>Your registered pet profiles and meal plans</CardDescription>
              </div>
            </div>
            <Link href="/pet-feed">
              <Button className="h-11 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/20 transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Add New Pet
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          {petFeeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {petFeeds.map((feed, idx) => (
                <div
                  key={idx}
                  className="group relative p-6 rounded-[1.5rem] bg-gradient-to-br from-white to-orange-50/30 dark:from-white/5 dark:to-orange-950/10 border-2 border-orange-100/60 dark:border-orange-900/20 shadow-lg hover:shadow-xl hover:border-orange-300/60 transition-all duration-300 overflow-hidden"
                >
                  {/* Decorative */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform duration-700" />

                  <div className="relative z-10 space-y-4">
                    {/* Pet Header */}
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg">
                        {feed.breedImageUrl ? <Image src={feed.breedImageUrl} alt={`${feed.petBreed || feed.petType} reference`} width={56} height={56} className="h-full w-full object-cover" /> : <Dog className="m-3.5 h-7 w-7" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-extrabold text-foreground tracking-tight">{feed.petName}</h3>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {feed.petType} · {feed.petBreed}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-white/40 dark:border-white/5">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Age / Weight</p>
                        <p className="text-sm font-extrabold text-foreground mt-0.5">{feed.ageValue ? `${feed.ageValue} ${feed.ageUnit}` : "Not recorded"} · {feed.weightKg ? `${feed.weightKg} kg` : "—"}{feed.heightCm ? ` · ${feed.heightCm} cm` : ""}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-white/40 dark:border-white/5">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Body condition</p>
                        <p className="text-sm font-extrabold capitalize text-foreground mt-0.5">{feed.bodyConditionScore ? `${feed.bodyConditionScore}/9 · ${feed.weightStatus}` : "Not assessed"}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-white/40 dark:border-white/5">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Meal Plan</p>
                        <p className="text-base font-extrabold text-foreground mt-0.5">{feed.mealDays} Days</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-white/40 dark:border-white/5">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Reminders</p>
                        <p className="text-base font-extrabold text-foreground mt-0.5">{feed.reminders ? "Enabled" : "Disabled"}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    {feed.createdAt && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 font-semibold pt-1">
                        <Clock className="w-3 h-3" />
                        Added {new Date(feed.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-5">
              <div className="mx-auto w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center border-2 border-dashed border-orange-500/20">
                <Dog className="w-10 h-10 text-orange-500/40" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-foreground">No pets registered yet</h3>
                <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                  Create your first pet profile and get a personalized meal plan tailored for your furry friend.
                </p>
              </div>
              <Link href="/pet-feed">
                <Button className="h-12 px-8 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold shadow-xl shadow-orange-500/20 transition-all mt-4">
                  <Plus className="w-5 h-5 mr-2" />
                  Register Your First Pet 🐾
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
        {petFeeds.length > 0 && (
          <CardFooter className="p-8 pt-0 flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">
              {petFeeds.length} {petFeeds.length === 1 ? "pet" : "pets"} registered
            </span>
            <Link href="/pet-feed" className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors">
              Add another pet <ChevronRight className="w-4 h-4" />
            </Link>
          </CardFooter>
        )}
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/pet-feed" className="group">
          <Card className="border-white/40 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl shadow-lg rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                <PawPrint className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-foreground">Pet Feed Plan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create a new feeding plan</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/blog" className="group">
          <Card className="border-white/40 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl shadow-lg rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-foreground">Pet Care Blog</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tips & wellness articles</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
        {isAdmin && (
          <Link href="/admin" className="group">
            <Card className="border-white/40 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl shadow-lg rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Admin Panel</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage content & users</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}
