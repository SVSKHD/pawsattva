"use client"

import { useMemo } from "react"
import NextImage from "next/image"
import {
  Users, Mail, FileText, Dog, TrendingUp, Heart, ThumbsDown, Eye,
  Activity, BarChart3, MessageCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Blog, Subscription, UserProfile } from "@/firebase/firestore"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from "recharts"

function getTimeAgo(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

interface AnalyticsTabProps {
  users: UserProfile[]
  subscribers: Subscription[]
  blogs: Blog[]
  totalPetFeeds: number
}

export function AnalyticsTab({ users, subscribers, blogs, totalPetFeeds }: AnalyticsTabProps) {
  const totalViews = blogs.reduce((sum, b) => sum + (b.views ?? 0), 0)
  const totalLikes = blogs.reduce((sum, b) => sum + (b.likes ?? 0), 0)
  const totalDislikes = blogs.reduce((sum, b) => sum + (b.dislikes ?? 0), 0)
  const publishedCount = blogs.filter(b => b.status === "published").length
  const avgViewsPerPost = publishedCount > 0 ? Math.round(totalViews / publishedCount) : 0
  const engagementRate = totalViews > 0 ? ((totalLikes + totalDislikes) / totalViews * 100).toFixed(1) : "0"

  const blogsByEngagement = [...blogs]
    .map((b) => ({ ...b, engagement: (b.views ?? 0) + (b.likes ?? 0) + (b.dislikes ?? 0) }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10)

  // Recent user signups (sorted by creation date)
  const recentUsers = useMemo(() =>
    [...users]
      .filter(u => u.createdAt)
      .sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()
        const db = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()
        return db - da
      })
      .slice(0, 8),
    [users]
  )

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "bg-blue-500/10 text-blue-600" },
    { label: "Subscribers", value: subscribers.length, icon: Mail, color: "bg-violet-500/10 text-violet-600" },
    { label: "Blog Posts", value: blogs.length, icon: FileText, color: "bg-rose-500/10 text-rose-600" },
    { label: "Pet Feeds", value: totalPetFeeds, icon: Dog, color: "bg-orange-500/10 text-orange-600" },
    { label: "Total Views", value: totalViews, icon: Eye, color: "bg-sky-500/10 text-sky-600" },
    { label: "Total Likes", value: totalLikes, icon: Heart, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Total Dislikes", value: totalDislikes, icon: ThumbsDown, color: "bg-rose-500/10 text-rose-500" },
    { label: "Total Comments", value: blogs.reduce((sum, b) => sum + (b.commentsCount ?? 0), 0), icon: MessageCircle, color: "bg-amber-500/10 text-amber-600" },
  ]

  const topPostsData = useMemo(
    () =>
      [...blogs]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 8)
        .map((b) => ({
          name: b.title.length > 22 ? `${b.title.slice(0, 22)}…` : b.title,
          views: b.views ?? 0,
          likes: b.likes ?? 0,
          comments: b.commentsCount ?? 0,
        })),
    [blogs]
  )

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; views: number; likes: number; comments: number }>()
    for (const post of blogs) {
      const date = new Date(post.date)
      if (Number.isNaN(date.getTime())) continue
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const current = map.get(key) || { month: key, views: 0, likes: 0, comments: 0 }
      current.views += post.views ?? 0
      current.likes += post.likes ?? 0
      current.comments += post.commentsCount ?? 0
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  }, [blogs])

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl rounded-2xl sm:rounded-[1.75rem]">
            <CardContent className="p-3.5 sm:p-6">
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2.5 sm:mb-4 ${s.color}`}>
                <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-xl sm:text-3xl font-extrabold tracking-tight">{s.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Post engagement */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-2xl sm:rounded-[2rem]">
          <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl font-bold">Top Posts (Views/Likes/Comments)</CardTitle>
            <CardDescription>Live ranking from current blog metrics</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] px-2 sm:px-4 pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPostsData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={64} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="likes" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="comments" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-2xl sm:rounded-[2rem]">
          <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl font-bold">6-Month Engagement Trend</CardTitle>
            <CardDescription>Views, likes and comments over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] px-2 sm:px-4 pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="likes" stroke="#10b981" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="comments" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Post engagement */}
      <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-2xl sm:rounded-[2rem]">
        <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold">Post Engagement</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Real-time likes & dislikes per article</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 font-semibold text-xs sm:text-sm">Article</th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-sm text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-sky-500" />
                      <span className="hidden sm:inline">Views</span>
                    </span>
                  </th>
                  <th className="px-4 md:px-6 py-4 font-semibold text-sm text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="hidden sm:inline">Likes</span>
                    </span>
                  </th>
                  <th className="hidden sm:table-cell px-6 py-4 font-semibold text-sm text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                      <span className="hidden md:inline">Dislikes</span>
                    </span>
                  </th>
                  <th className="px-6 py-4 font-semibold text-sm text-center">Eng.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {blogsByEngagement.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-muted-foreground">
                      No engagement data yet. Views, likes and dislikes will appear here.
                    </td>
                  </tr>
                ) : blogsByEngagement.map((row) => {
                  const views = row.views ?? 0
                  const likes = row.likes ?? 0
                  const dislikes = row.dislikes ?? 0
                  const total = likes + dislikes
                  const likePct = total > 0 ? Math.round((likes / total) * 100) : 0
                  return (
                    <tr key={row.id} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 md:px-8 py-4">
                        <span className="font-semibold text-foreground group-hover:text-violet-600 transition-colors text-xs md:text-sm line-clamp-1">
                          {row.title}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center text-xs md:text-sm font-medium text-muted-foreground">
                        {views.toLocaleString()}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                          <Heart className="w-3 h-3" />{likes.toLocaleString()}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                          <ThumbsDown className="w-3 h-3" />{dislikes.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="hidden xs:block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                              style={{ width: `${likePct}%` }}
                            />
                          </div>
                          <span className="text-[10px] md:text-xs font-bold text-violet-600">{total > 0 ? `${likePct}%` : "—"}</span>
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
      <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-2xl sm:rounded-[2rem]">
        <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
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
        <CardContent className="p-4 sm:p-8 pt-2">
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

      {/* Performance overview */}
      <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-2xl sm:rounded-[2rem]">
        <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Performance Overview</CardTitle>
              <CardDescription>Key metrics at a glance</CardDescription>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-time
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-8 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 text-center">
              <p className="text-2xl font-extrabold text-sky-600">{avgViewsPerPost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Avg. Views / Post</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 text-center">
              <p className="text-2xl font-extrabold text-emerald-600">{engagementRate}%</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Engagement Rate</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 text-center">
              <p className="text-2xl font-extrabold text-violet-600">{publishedCount}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Published Posts</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 text-center">
              <p className="text-2xl font-extrabold text-orange-600">
                {totalLikes + totalDislikes > 0 ? Math.round((totalLikes / (totalLikes + totalDislikes)) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Like Ratio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent signups */}
      <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-2xl sm:rounded-[2rem]">
        <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Recent Signups</CardTitle>
              <CardDescription>Newest users on the platform</CardDescription>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-8 pt-2">
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No recent signups.</p>
              </div>
            ) : recentUsers.map((u) => {
              const joined = u.createdAt?.toDate
                ? u.createdAt.toDate()
                : new Date(u.createdAt)
              const timeAgo = getTimeAgo(joined)
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative">
                    {u.photoURL
                      ? <NextImage src={u.photoURL} alt={u.displayName || ""} fill className="object-cover rounded-full" />
                      : <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">
                          {(u.displayName || u.email)[0].toUpperCase()}
                        </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{u.displayName || u.email.split("@")[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.admin && (
                      <span className="text-[10px] font-bold bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full">Admin</span>
                    )}
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
