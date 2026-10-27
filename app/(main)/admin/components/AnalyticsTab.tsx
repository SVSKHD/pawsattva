"use client"

import { useMemo } from "react"
import NextImage from "next/image"
import {
  Users, Mail, FileText, Dog, TrendingUp, Heart, ThumbsDown, Eye,
  Activity, BarChart3, MessageCircle
} from "lucide-react"
import { Blog, Subscription, UserProfile } from "@/firebase/firestore"
import { PawGptUsageCard } from "./PawGptUsageCard"
import { PanelBar, TableCard, theadRowClass, thClass } from "./DataTable"
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

/** Stat tile card, same family as the shared admin kit cards */
const cardClass =
  "rounded-2xl border border-black/10 bg-white/70 shadow-sm ring-0 backdrop-blur-xl dark:border-white/10 dark:bg-black/40"

function LiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      {label}
    </span>
  )
}

interface AnalyticsTabProps {
  users: UserProfile[]
  subscribers: Subscription[]
  blogs: Blog[]
  totalPetFeeds: number
}

export function AnalyticsTab({ users, subscribers, blogs, totalPetFeeds }: AnalyticsTabProps) {
  void totalPetFeeds

  const nonAdminUsers = useMemo(
    () => users.filter((profile) => !(profile.admin || profile.role === "admin")),
    [users]
  )

  const userPetFeeds = useMemo(
    () =>
      nonAdminUsers.reduce(
        (sum, profile) => sum + (profile.petFeeds?.length ?? 0),
        0
      ),
    [nonAdminUsers]
  )

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
    [...nonAdminUsers]
      .filter(u => u.createdAt)
      .sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()
        const db = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()
        return db - da
      })
      .slice(0, 8),
    [nonAdminUsers]
  )

  const stats = [
    { label: "Total Users", value: nonAdminUsers.length, icon: Users, color: "bg-blue-500/10 text-blue-600" },
    { label: "Subscribers", value: subscribers.length, icon: Mail, color: "bg-violet-500/10 text-violet-600" },
    { label: "Blog Posts", value: blogs.length, icon: FileText, color: "bg-rose-500/10 text-rose-600" },
    { label: "Pet Feeds", value: userPetFeeds, icon: Dog, color: "bg-orange-500/10 text-orange-600" },
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
    <div className="space-y-5 sm:space-y-6">
      <PanelBar
        icon={BarChart3}
        title="Analytics"
        subtitle={`${nonAdminUsers.length.toLocaleString("en-IN")} users · ${publishedCount} published posts · ${totalViews.toLocaleString("en-IN")} views, updated live`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`${cardClass} py-4 sm:py-5`}>
            <div className="px-3.5 sm:px-5">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2.5 sm:mb-3 ${s.color}`}>
                <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-xl sm:text-3xl font-extrabold tracking-tight tabular-nums">{s.value.toLocaleString("en-IN")}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <PawGptUsageCard users={users} />

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <TableCard icon={BarChart3} title="Top posts" subtitle="Views, likes and comments for the most-read posts">
          <div className="h-[320px] px-2 pb-4 sm:px-4">
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
          </div>
        </TableCard>

        <TableCard icon={TrendingUp} title="6-month engagement trend" subtitle="Views, likes and comments by publish month">
          <div className="h-[320px] px-2 pb-4 sm:px-4">
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
          </div>
        </TableCard>
      </div>

      {/* Post engagement */}
      <TableCard icon={Heart} title="Post engagement" subtitle="Real-time likes and dislikes per article">
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass}>Article</th>
                  <th className={`${thClass} text-center`}>
                    <span className="flex items-center justify-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-sky-500" />
                      <span className="hidden sm:inline">Views</span>
                    </span>
                  </th>
                  <th className={`${thClass} text-center`}>
                    <span className="flex items-center justify-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="hidden sm:inline">Likes</span>
                    </span>
                  </th>
                  <th className={`${thClass} hidden text-center sm:table-cell`}>
                    <span className="flex items-center justify-center gap-1.5">
                      <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                      <span className="hidden md:inline">Dislikes</span>
                    </span>
                  </th>
                  <th className={`${thClass} text-center`}>Eng.</th>
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
                    <tr key={row.id} className="group transition-colors hover:bg-orange-500/[0.04]">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors text-xs md:text-sm line-clamp-1">
                          {row.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs md:text-sm font-medium text-muted-foreground">
                        {views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                          <Heart className="w-3 h-3" />{likes.toLocaleString()}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                          <ThumbsDown className="w-3 h-3" />{dislikes.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
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
        </div>
      </TableCard>

      {/* Users with pet feeds */}
      <TableCard icon={Dog} title="Users with pet feeds" subtitle="Pet parents who have submitted pet information">
        <div className="px-4 pb-5 sm:px-5">
          <div className="space-y-3">
            {nonAdminUsers.filter(u => u.petFeeds && u.petFeeds.length > 0).map((u, rank) => (
              <div
                key={u.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-orange-500/[0.04] transition-colors"
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
            {nonAdminUsers.filter(u => u.petFeeds && u.petFeeds.length > 0).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Dog className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No pet feed submissions yet.</p>
              </div>
            )}
          </div>
        </div>
      </TableCard>

      {/* Performance overview */}
      <TableCard icon={Activity} title="Performance overview" subtitle="Key blog metrics at a glance" actions={<LiveBadge label="Real-time" />}>
        <div className="px-4 pb-5 sm:px-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
              <p className="text-2xl font-extrabold text-sky-600">{avgViewsPerPost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Avg. Views / Post</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
              <p className="text-2xl font-extrabold text-emerald-600">{engagementRate}%</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Engagement Rate</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
              <p className="text-2xl font-extrabold text-violet-600">{publishedCount}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Published Posts</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
              <p className="text-2xl font-extrabold text-orange-600">
                {totalLikes + totalDislikes > 0 ? Math.round((totalLikes / (totalLikes + totalDislikes)) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Like Ratio</p>
            </div>
          </div>
        </div>
      </TableCard>

      {/* Recent signups */}
      <TableCard icon={Users} title="Recent signups" subtitle="Newest pet parents on the platform" actions={<LiveBadge label="Live" />}>
        <div className="px-4 pb-5 sm:px-5">
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
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-orange-500/[0.04] transition-colors"
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
        </div>
      </TableCard>
    </div>
  )
}
