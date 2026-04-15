"use client"

import NextImage from "next/image"
import {
  Users, Mail, FileText, Dog, TrendingUp, Eye, Heart,
  Share2, Activity, CalendarDays, ShoppingBag, MousePointerClick
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Blog, Subscription, UserProfile } from "@/firebase/firestore"

const POST_ENGAGEMENT = [
  { title: "How to Train Your Puppy", views: 14200, likes: 1820, shares: 430, comments: 98 },
  { title: "Best Food for Cats", views: 9800, likes: 1100, shares: 220, comments: 54 },
  { title: "Puppy Health Guide", views: 7400, likes: 870, shares: 190, comments: 41 },
  { title: "Dog Grooming Basics", views: 5100, likes: 610, shares: 140, comments: 29 },
  { title: "Cat Behavior Explained", views: 3900, likes: 480, shares: 95, comments: 22 },
]

const RECENT_EVENTS = [
  { type: "purchase", user: "Priya Sharma", target: "Bought Premium Puppy Kibble (5kg) — ₹1,850", time: "2 min ago", icon: ShoppingBag, color: "emerald" },
  { type: "like", user: "Arjun Menon", target: "Liked — How to Train Your Puppy", time: "11 min ago", icon: Heart, color: "rose" },
  { type: "signup", user: "Meera Kulkarni", target: "New account created", time: "28 min ago", icon: Users, color: "blue" },
  { type: "purchase", user: "Rohit Patil", target: "Bought Senior Dog Wellness Pack — ₹4,500", time: "45 min ago", icon: ShoppingBag, color: "emerald" },
  { type: "like", user: "Divya Reddy", target: "Liked — Cat Behavior Explained", time: "1 hr ago", icon: Heart, color: "rose" },
  { type: "share", user: "Karan Verma", target: "Shared — Dog Grooming Basics", time: "1 hr 20 min ago", icon: Share2, color: "blue" },
  { type: "signup", user: "Sneha Lakshmi", target: "New account created", time: "2 hrs ago", icon: Users, color: "emerald" },
  { type: "click", user: "Anil Tiwari", target: "Clicked CTA — Adopt Now", time: "2 hrs 30 min ago", icon: MousePointerClick, color: "orange" },
]

const EVENT_COLORS: Record<string, string> = {
  rose: "bg-rose-500/10 text-rose-600",
  blue: "bg-blue-500/10 text-blue-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  orange: "bg-orange-500/10 text-orange-600",
  violet: "bg-violet-500/10 text-violet-600",
}

interface AnalyticsTabProps {
  users: UserProfile[]
  subscribers: Subscription[]
  blogs: Blog[]
  totalPetFeeds: number
}

export function AnalyticsTab({ users, subscribers, blogs, totalPetFeeds }: AnalyticsTabProps) {
  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "bg-blue-500/10 text-blue-600" },
    { label: "Subscribers", value: subscribers.length, icon: Mail, color: "bg-violet-500/10 text-violet-600" },
    { label: "Blog Posts", value: blogs.length, icon: FileText, color: "bg-rose-500/10 text-rose-600" },
    { label: "Pet Feeds", value: totalPetFeeds, icon: Dog, color: "bg-orange-500/10 text-orange-600" },
  ]

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl rounded-[1.75rem]">
            <CardContent className="p-6">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-extrabold tracking-tight">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Post engagement */}
      <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Post Engagement</CardTitle>
              <CardDescription>Likes, shares & views per article</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                  <th className="px-6 md:px-8 py-4 font-semibold text-sm">Article</th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-sm text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Views</span>
                    </span>
                  </th>
                  <th className="hidden sm:table-cell px-6 py-4 font-semibold text-sm text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span className="hidden md:inline">Likes</span>
                    </span>
                  </th>
                  <th className="hidden md:table-cell px-6 py-4 font-semibold text-sm text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-blue-500" />
                      <span className="hidden lg:inline">Shares</span>
                    </span>
                  </th>
                  <th className="px-6 py-4 font-semibold text-sm text-center">Eng.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {POST_ENGAGEMENT.map((row, i) => {
                  const engagePct = Math.round(((row.likes + row.shares + row.comments) / (row.views || 1)) * 100)
                  return (
                    <tr key={i} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 md:px-8 py-4">
                        <span className="font-semibold text-foreground group-hover:text-violet-600 transition-colors text-xs md:text-sm line-clamp-1">
                          {row.title}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center text-xs md:text-sm font-medium text-muted-foreground">
                        {row.views.toLocaleString()}
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                          <Heart className="w-3 h-3" />{row.likes.toLocaleString()}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                          <Share2 className="w-3 h-3" />{row.shares.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="hidden xs:block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                              style={{ width: `${Math.min(engagePct * 5, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] md:text-xs font-bold text-violet-600">{engagePct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Users with pet feeds */}
      <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Dog className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Users with Pet Feeds</CardTitle>
              <CardDescription>Users who have submitted pet information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-2">
          <div className="space-y-3">
            {users.filter(u => u.petFeeds && u.petFeeds.length > 0).map((u, rank) => (
              <div
                key={u.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 transition-all"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${
                  rank === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white"
                  : rank === 1 ? "bg-gradient-to-br from-zinc-300 to-zinc-400 text-white"
                  : rank === 2 ? "bg-gradient-to-br from-orange-400 to-amber-600 text-white"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {rank + 1}
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative">
                  {u.photoURL
                    ? <NextImage src={u.photoURL} alt={u.displayName || ""} fill className="object-cover rounded-full" />
                    : <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold">
                        {(u.displayName || u.email)[0].toUpperCase()}
                      </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{u.displayName || u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.petFeeds!.length} {u.petFeeds!.length === 1 ? "pet" : "pets"} · {u.petFeeds!.map(f => f.petName).join(", ")}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-500/10 px-2.5 py-1 rounded-full shrink-0">
                  <Dog className="w-3 h-3" />{u.petFeeds!.length}
                </span>
              </div>
            ))}
            {users.filter(u => u.petFeeds && u.petFeeds.length > 0).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Dog className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No pet feed submissions yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent events */}
      <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Live Event Feed</CardTitle>
              <CardDescription>Real-time user interactions</CardDescription>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-2">
          <div className="space-y-3">
            {RECENT_EVENTS.map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 transition-all"
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${EVENT_COLORS[ev.color] || EVENT_COLORS.violet}`}>
                  <ev.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{ev.user}</p>
                  <p className="text-xs text-muted-foreground truncate">{ev.target}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {ev.time}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
