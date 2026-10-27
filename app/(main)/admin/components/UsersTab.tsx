"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import NextImage from "next/image"
import {
  Ban,
  CalendarDays,
  Cat,
  CheckCircle2,
  Clock,
  Dog,
  Mail,
  MessageCircle,
  PawPrint,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  onRestrictedEmailsSnapshot,
  restrictEmail,
  setUserBlacklisted,
  unrestrictEmail,
} from "@/firebase/firestore"
import type { PetFeedEntry, RestrictedEmail, UserProfile } from "@/firebase/firestore"
import { normalizeEmail } from "@/firebase/restricted-email"
import { TablePagination, usePagination } from "./TablePagination"
import {
  ActionButton, ActionsCell, EmptyCell, FilterTabs, IconAction, SortHeader, StatusPill, TableCard, TableEmpty,
  TableSearch, TableToolbar, filterSelectClass, nextSort, rowClass, rowTitleClass,
  thClass, theadRowClass, type SortState,
} from "./DataTable"

type UserView = "all" | "new" | "pets" | "restricted" | "admins"
type SortKey = "joined" | "name" | "pets"

interface UsersTabProps {
  users: UserProfile[]
  filteredUsers: UserProfile[]
  totalPetFeeds: number
  userSearchQuery: string
  setUserSearchQuery: (v: string) => void
  editingUserId: string | null
  editUserName: string
  setEditUserName: (v: string) => void
  editUserEmail: string
  setEditUserEmail: (v: string) => void
  editUserPhone: string
  setEditUserPhone: (v: string) => void
  expandedUserId: string | null
  setExpandedUserId: (v: string | null) => void
  currentUserId: string | undefined
  handleEditUser: (u: UserProfile) => void
  handleSaveUser: () => void
  setEditingUserId: (v: string | null) => void
  handleChangeUserRole: (
    userId: string,
    role: NonNullable<UserProfile["role"]>
  ) => void
  handleDeleteUserAccount: (userId: string) => void
  handleToggleUserBlacklist: (profile: UserProfile, blacklisted: boolean) => void
  currentUserEmail?: string
}

const NEW_USER_DAYS = 30

const toDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (typeof value === "object" && value !== null) {
    if ("toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
      const date = (value as { toDate: () => Date }).toDate()
      return Number.isNaN(date.getTime()) ? null : date
    }

    if ("seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
      const date = new Date((value as { seconds: number }).seconds * 1000)
      return Number.isNaN(date.getTime()) ? null : date
    }
  }

  const date = new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value: unknown, fallback = "Not recorded") => {
  const date = toDate(value)
  if (!date) return fallback

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const daysSince = (value: unknown) => {
  const date = toDate(value)
  if (!date) return null
  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  )
}

const relativeAge = (value: unknown) => {
  const days = daysSince(value)
  if (days === null) return "No join date"
  if (days === 0) return "Today"
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months} month${months === 1 ? "" : "s"} ago`
  }
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? "" : "s"} ago`
}

const isNewUser = (profile: UserProfile) => {
  const age = daysSince(profile.createdAt)
  return age !== null && age <= NEW_USER_DAYS
}

const normalizedPetType = (feed: PetFeedEntry) =>
  (feed.petType || "").trim().toLowerCase()

const isCat = (feed: PetFeedEntry) => normalizedPetType(feed).includes("cat")

const PetTypeIcon = ({
  feed,
  className = "h-4 w-4",
}: {
  feed: PetFeedEntry
  className?: string
}) =>
  isCat(feed) ? (
    <Cat className={className} />
  ) : normalizedPetType(feed).includes("dog") ? (
    <Dog className={className} />
  ) : (
    <PawPrint className={className} />
  )

const getRole = (
  profile: UserProfile
): NonNullable<UserProfile["role"]> =>
  profile.role === "author"
    ? "author"
    : profile.admin
      ? "admin"
      : "user"

const whatsappNumber = (profile: UserProfile) =>
  profile.whatsappSameAsPhone ? profile.phone : profile.whatsappPhone

function Avatar({ profile, size = "h-9 w-9" }: { profile: UserProfile; size?: string }) {
  return (
    <div className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500/10 text-sm font-bold text-orange-600`}>
      {profile.photoURL ? (
        <NextImage
          src={profile.photoURL}
          alt={profile.displayName || "User"}
          fill
          className="object-cover"
        />
      ) : (
        (profile.displayName || profile.email || "?")[0].toUpperCase()
      )}
    </div>
  )
}

export function UsersTab({
  users,
  filteredUsers,
  totalPetFeeds,
  userSearchQuery,
  setUserSearchQuery,
  editingUserId,
  editUserName,
  setEditUserName,
  editUserEmail,
  setEditUserEmail,
  editUserPhone,
  setEditUserPhone,
  expandedUserId,
  setExpandedUserId,
  currentUserId,
  handleEditUser,
  handleSaveUser,
  setEditingUserId,
  handleChangeUserRole,
  handleDeleteUserAccount,
  handleToggleUserBlacklist,
  currentUserEmail,
}: UsersTabProps) {
  void totalPetFeeds

  const [restrictedEmails, setRestrictedEmails] = useState<RestrictedEmail[]>([])
  const [newRestrictedEmail, setNewRestrictedEmail] = useState("")
  const [restrictingEmail, setRestrictingEmail] = useState(false)

  useEffect(() => onRestrictedEmailsSnapshot(setRestrictedEmails), [])

  const restrictedEmailSet = useMemo(
    () => new Set(restrictedEmails.map((entry) => normalizeEmail(entry.email))),
    [restrictedEmails]
  )

  // A user counts as restricted if their profile is blacklisted or their email is on the list.
  const isRestricted = useCallback(
    ({ blacklisted, email }: UserProfile) =>
      blacklisted === true ||
      (Boolean(email) && restrictedEmailSet.has(normalizeEmail(email))),
    [restrictedEmailSet]
  )

  const sortedRestrictedEmails = useMemo(
    () =>
      [...restrictedEmails].sort(
        (a, b) =>
          (toDate(b.lastLoginAt)?.getTime() ?? 0) - (toDate(a.lastLoginAt)?.getTime() ?? 0) ||
          (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)
      ),
    [restrictedEmails]
  )

  const admins = useMemo(
    () => users.filter((profile) => getRole(profile) === "admin"),
    [users]
  )

  const nonAdminUsers = useMemo(
    () => users.filter((profile) => getRole(profile) !== "admin"),
    [users]
  )

  const handleRestrictEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = normalizeEmail(newRestrictedEmail)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.")
      return
    }
    if (currentUserEmail && normalizeEmail(currentUserEmail) === email) {
      toast.error("You cannot restrict your own email.")
      return
    }
    if (admins.some((admin) => admin.email && normalizeEmail(admin.email) === email)) {
      toast.error("Remove the admin role before restricting this email.")
      return
    }

    setRestrictingEmail(true)
    try {
      const profile = users.find((entry) => entry.email && normalizeEmail(entry.email) === email)
      if (profile) {
        await setUserBlacklisted(profile, true)
      } else {
        await restrictEmail(email)
      }
      setNewRestrictedEmail("")
      toast.success(`${email} is now restricted.`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Failed to restrict email: ${msg}`)
    } finally {
      setRestrictingEmail(false)
    }
  }

  const handleUnrestrictEmail = async (entry: RestrictedEmail) => {
    try {
      const profile = users.find(
        (user) => user.email && normalizeEmail(user.email) === normalizeEmail(entry.email)
      )
      if (profile) {
        await setUserBlacklisted(profile, false)
      } else {
        await unrestrictEmail(entry.email)
      }
      toast.success(`${entry.email} is no longer restricted.`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Failed to remove restriction: ${msg}`)
    }
  }

  const [view, setView] = useState<UserView>("all")
  const [breedFilter, setBreedFilter] = useState("all")
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "joined", dir: "desc" })
  const [pendingAction, setPendingAction] = useState<{ type: "blacklist" | "delete"; profile: UserProfile } | null>(null)

  const userPetCount = useMemo(
    () => nonAdminUsers.reduce((sum, profile) => sum + (profile.petFeeds?.length ?? 0), 0),
    [nonAdminUsers]
  )

  const breeds = useMemo(
    () =>
      Array.from(
        new Set(
          nonAdminUsers.flatMap((profile) =>
            (profile.petFeeds ?? [])
              .map((feed) => feed.petBreed?.trim())
              .filter((breed): breed is string => Boolean(breed))
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [nonAdminUsers]
  )

  // Search comes from the parent; tabs narrow it further. Admins only show on their own tab.
  const inView = useCallback(
    (profile: UserProfile, which: UserView) => {
      const admin = getRole(profile) === "admin"
      if (which === "admins") return admin
      if (admin) return false
      if (which === "new") return isNewUser(profile)
      if (which === "pets") return Boolean(profile.petFeeds?.length)
      if (which === "restricted") return isRestricted(profile)
      return true
    },
    [isRestricted]
  )

  const counts = useMemo(() => {
    const tally = { all: 0, new: 0, pets: 0, restricted: 0, admins: 0 }
    for (const profile of filteredUsers) {
      for (const which of Object.keys(tally) as UserView[]) {
        if (inView(profile, which)) tally[which]++
      }
    }
    return tally
  }, [filteredUsers, inView])

  const rows = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1
    return filteredUsers
      .filter((profile) => inView(profile, view))
      .filter(
        (profile) =>
          breedFilter === "all" ||
          (profile.petFeeds ?? []).some(
            (feed) => feed.petBreed?.trim().toLowerCase() === breedFilter.toLowerCase()
          )
      )
      .sort((a, b) => {
        if (sort.key === "name") {
          const aName = (a.displayName || a.email || "").toLowerCase()
          const bName = (b.displayName || b.email || "").toLowerCase()
          return aName.localeCompare(bName) * direction
        }
        if (sort.key === "pets") {
          return ((a.petFeeds?.length ?? 0) - (b.petFeeds?.length ?? 0)) * direction
        }
        return ((toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0)) * direction
      })
  }, [breedFilter, filteredUsers, inView, sort, view])

  const pagination = usePagination(rows, 10)

  const onSort = (key: SortKey) => {
    setSort((current) => nextSort(current, key, key === "name" ? "asc" : "desc"))
    pagination.reset()
  }

  const selectedUser = useMemo(
    () => users.find((profile) => profile.id === expandedUserId) ?? null,
    [expandedUserId, users]
  )

  const editingUser = useMemo(
    () => users.find((profile) => profile.id === editingUserId) ?? null,
    [editingUserId, users]
  )

  const tabs: { id: UserView; label: string }[] = [
    { id: "all", label: "All users" },
    { id: "new", label: "New" },
    { id: "pets", label: "With pets" },
    { id: "restricted", label: "Restricted" },
    { id: "admins", label: "Admins" },
  ]

  const hasFilters = Boolean(userSearchQuery) || breedFilter !== "all"

  return (
    <>
      <div className="space-y-4">
        <TableCard
          icon={Users}
          title="Users"
          subtitle={
            <>
              {nonAdminUsers.length} users · {admins.length} {admins.length === 1 ? "admin" : "admins"} ·{" "}
              {userPetCount} pets registered
              {counts.restricted > 0 && (
                <> · <span className="font-semibold text-red-600">{counts.restricted} restricted</span></>
              )}
            </>
          }
        >
          <TableToolbar>
            <FilterTabs
              label="Filter users"
              tabs={tabs}
              value={view}
              onChange={(next) => { setView(next); pagination.reset() }}
              counts={counts}
              alert={{ id: "restricted", className: "bg-red-500" }}
            />

            <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Select value={breedFilter} onValueChange={(value) => { setBreedFilter(value); pagination.reset() }}>
                <SelectTrigger className={`w-full sm:w-40 ${filterSelectClass}`} aria-label="Filter by breed">
                  <SelectValue placeholder="Breed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All breeds</SelectItem>
                  {breeds.map((breed) => (
                    <SelectItem key={breed} value={breed}>
                      {breed}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <TableSearch
                value={userSearchQuery}
                onChange={(next) => { setUserSearchQuery(next); pagination.reset() }}
                placeholder="Name, email, phone, pet…"
                label="Search users"
                className="sm:w-64 sm:flex-none"
              />
            </div>
          </TableToolbar>

          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={theadRowClass}>
                    <SortHeader label="User" sortKey="name" sort={sort} onSort={onSort} />
                    <th className={`hidden lg:table-cell ${thClass}`}>Contact</th>
                    <SortHeader label="Pets" sortKey="pets" sort={sort} onSort={onSort} className="hidden min-w-[9rem] md:table-cell" />
                    <th className={`hidden sm:table-cell ${thClass}`}>Status</th>
                    <SortHeader label="Joined" sortKey="joined" sort={sort} onSort={onSort} className="hidden xl:table-cell" />
                    <th className={thClass}>Role</th>
                    <th className={`w-px ${thClass}`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {pagination.rows.map((profile) => {
                    const pets = profile.petFeeds ?? []
                    const restricted = isRestricted(profile)
                    const isSelf = profile.id === currentUserId
                    const whatsapp = whatsappNumber(profile)

                    return (
                      <tr key={profile.id} onClick={() => setExpandedUserId(profile.id)} className={rowClass}>
                        {/* User */}
                        <td className="max-w-0 px-4 py-3 sm:w-[32%]">
                          <div className="flex items-center gap-3">
                            <Avatar profile={profile} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5">
                                <span className={rowTitleClass}>{profile.displayName || "Unnamed user"}</span>
                                {isSelf && (
                                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">You</span>
                                )}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="hidden whitespace-nowrap px-4 py-3 text-xs lg:table-cell">
                          {profile.phone || whatsapp ? (
                            <div className="space-y-1">
                              {profile.phone && (
                                <p className="flex items-center gap-1.5 text-foreground/80">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  {profile.phone}
                                </p>
                              )}
                              {whatsapp && (
                                <p className="flex items-center gap-1.5 text-foreground/80">
                                  <MessageCircle className="h-3 w-3 text-emerald-600" />
                                  {profile.whatsappSameAsPhone ? "Same as phone" : whatsapp}
                                </p>
                              )}
                            </div>
                          ) : (
                            <EmptyCell />
                          )}
                        </td>

                        {/* Pets */}
                        <td className="hidden min-w-[9rem] px-4 py-3 md:table-cell">
                          {pets.length ? (
                            <div className="flex max-w-[260px] flex-wrap items-center gap-1">
                              {pets.slice(0, 2).map((feed, index) => (
                                <StatusPill
                                  key={`${feed.petName}-${index}`}
                                  tone={isCat(feed) ? "violet" : "orange"}
                                  title={[feed.petName, feed.petBreed || feed.petType].filter(Boolean).join(" · ")}
                                  className="max-w-[120px]"
                                >
                                  <PetTypeIcon feed={feed} className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{feed.petName || "Unnamed"}</span>
                                </StatusPill>
                              ))}
                              {pets.length > 2 && (
                                <span className="text-[11px] font-semibold text-muted-foreground">+{pets.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <EmptyCell />
                          )}
                        </td>

                        {/* Status */}
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {restricted ? (
                            <StatusPill tone="red" icon={Ban}>Restricted</StatusPill>
                          ) : isNewUser(profile) ? (
                            <StatusPill tone="sky" icon={Sparkles}>New</StatusPill>
                          ) : (
                            <StatusPill tone="emerald" icon={CheckCircle2}>Active</StatusPill>
                          )}
                        </td>

                        {/* Joined */}
                        <td className="hidden whitespace-nowrap px-4 py-3 xl:table-cell">
                          <p className="text-foreground/80">{formatDate(profile.createdAt, "—")}</p>
                          <p className="text-[11px] text-muted-foreground">{relativeAge(profile.createdAt)}</p>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          <Select
                            value={getRole(profile)}
                            onValueChange={(value: NonNullable<UserProfile["role"]>) =>
                              handleChangeUserRole(profile.id, value)
                            }
                            disabled={isSelf}
                          >
                            <SelectTrigger
                              aria-label={`Role for ${profile.displayName || profile.email}`}
                              className="h-8 w-[100px] rounded-lg bg-white/70 text-xs font-semibold capitalize dark:bg-black/30"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="author">Author</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        <ActionsCell>
                          <IconAction label="Edit details" tone="orange" onClick={() => handleEditUser(profile)}>
                            <Pencil className="h-4 w-4" />
                          </IconAction>
                          <IconAction
                            label={restricted ? "Remove restriction" : "Restrict user"}
                            tone={restricted ? "emerald" : "red"}
                            active={restricted}
                            onClick={() => setPendingAction({ type: "blacklist", profile })}
                            disabled={isSelf}
                          >
                            {restricted ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </IconAction>
                          <IconAction
                            label="Delete account"
                            tone="red"
                            onClick={() => setPendingAction({ type: "delete", profile })}
                            disabled={isSelf}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconAction>
                        </ActionsCell>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <TableEmpty
              icon={Users}
              title={hasFilters ? "No users match these filters" : view === "restricted" ? "No restricted users" : "No users here yet"}
            >
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => { setUserSearchQuery(""); setBreedFilter("all") }}
                >
                  Clear filters
                </Button>
              )}
            </TableEmpty>
          )}

          <TablePagination pagination={pagination} noun={rows.length === 1 ? "user" : "users"} />
        </TableCard>

        {/* Restricted emails: block addresses before or after they sign up */}
        <TableCard
          icon={Ban}
          title={
            <span className="inline-flex items-center gap-2">
              Restricted emails
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">{sortedRestrictedEmails.length}</span>
            </span>
          }
          subtitle="Anyone signing in with these emails is restricted instantly, even on a new account."
          actions={
            <form onSubmit={handleRestrictEmail} className="flex w-full gap-2 sm:w-auto">
              <Input
                type="email"
                value={newRestrictedEmail}
                onChange={(event) => setNewRestrictedEmail(event.target.value)}
                placeholder="email@example.com"
                aria-label="Email to restrict"
                className="h-9 flex-1 rounded-xl bg-white/70 text-sm dark:bg-black/30 sm:w-64 sm:flex-none"
              />
              <ActionButton
                type="submit"
                variant="primary"
                icon={Ban}
                disabled={restrictingEmail || !newRestrictedEmail.trim()}
              >
                Restrict
              </ActionButton>
            </form>
          }
        >
          {sortedRestrictedEmails.length ? (
            <ul className="divide-y divide-border/40 border-t border-border/50">
              {sortedRestrictedEmails.map((entry) => {
                const linkedUser = users.find(
                  (profile) =>
                    profile.email && normalizeEmail(profile.email) === normalizeEmail(entry.email)
                )
                const attempts = entry.loginAttempts ?? 0

                return (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{entry.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {linkedUser?.displayName || entry.displayName || "No account yet"}
                      </p>
                    </div>
                    <p className={`hidden shrink-0 text-xs sm:block ${entry.lastLoginAt ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
                      {entry.lastLoginAt
                        ? `Tried signing in ${formatDate(entry.lastLoginAt)} · ${attempts} ${attempts === 1 ? "time" : "times"}`
                        : `Restricted ${formatDate(entry.createdAt, "recently")}`}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnrestrictEmail(entry)}
                      className="h-8 shrink-0 rounded-lg text-xs text-emerald-600 hover:bg-emerald-600 hover:text-white"
                    >
                      Unblock
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="border-t border-border/50 px-4 py-6 text-center text-xs text-muted-foreground">No restricted emails.</p>
          )}
        </TableCard>
      </div>

      {/* Edit details */}
      <Dialog open={Boolean(editingUserId)} onOpenChange={(open) => !open && setEditingUserId(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              {editingUser ? `Update contact details for ${editingUser.displayName || editingUser.email}.` : "Update contact details."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => { event.preventDefault(); handleSaveUser() }}
            className="space-y-3"
          >
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Display name</span>
              <Input value={editUserName} onChange={(event) => setEditUserName(event.target.value)} className="rounded-xl" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Email</span>
              <Input type="email" value={editUserEmail} onChange={(event) => setEditUserEmail(event.target.value)} className="rounded-xl" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Phone</span>
              <Input type="tel" value={editUserPhone} onChange={(event) => setEditUserPhone(event.target.value)} className="rounded-xl" />
            </label>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setEditingUserId(null)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-orange-500 text-white hover:bg-orange-600">
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Restrict / delete confirmation */}
      <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent size="sm">
          {pendingAction && (() => {
            const { type, profile } = pendingAction
            const name = profile.displayName || profile.email
            const restricted = isRestricted(profile)
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {type === "delete" ? "Delete this account?" : restricted ? "Remove restriction?" : "Restrict this user?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {type === "delete"
                      ? `“${name}” will be permanently deleted. This can't be undone.`
                      : restricted
                        ? `“${name}” will regain normal access to the web app.`
                        : `“${name}” will stay signed in but lose all access except reading blogs. Their email is restricted too, so a new login with it stays blocked.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant={type === "blacklist" && restricted ? "default" : "destructive"}
                    onClick={() =>
                      type === "delete"
                        ? handleDeleteUserAccount(profile.id)
                        : handleToggleUserBlacklist(profile, !restricted)
                    }
                  >
                    {type === "delete" ? "Delete account" : restricted ? "Remove restriction" : "Restrict user"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )
          })()}
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => !open && setExpandedUserId(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[2rem] p-0 sm:max-w-4xl">
          {selectedUser && (
            <>
              <div className="border-b border-border/50 bg-gradient-to-br from-orange-50 to-amber-50 p-6 dark:from-orange-950/30 dark:to-background sm:p-8">
                <DialogHeader>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 text-2xl font-black text-white shadow-lg">
                      {selectedUser.photoURL ? (
                        <NextImage
                          src={selectedUser.photoURL}
                          alt={selectedUser.displayName || "User"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <UserRound className="h-9 w-9" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <DialogTitle className="text-2xl font-black sm:text-3xl">
                          {selectedUser.displayName || "Anonymous User"}
                        </DialogTitle>
                        {isNewUser(selectedUser) && (
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                            New user
                          </span>
                        )}
                        {isRestricted(selectedUser) && (
                          <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-600">
                            Blacklisted
                          </span>
                        )}
                      </div>
                      <DialogDescription className="mt-1">
                        Full account and registered pet details
                      </DialogDescription>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-bold">
                          <CalendarDays className="h-3.5 w-3.5 text-orange-500" />
                          Joined {formatDate(selectedUser.createdAt, "Unknown")}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-bold capitalize">
                          {getRole(selectedUser)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-bold">
                          <PawPrint className="h-3.5 w-3.5 text-orange-500" />
                          {selectedUser.petFeeds?.length ?? 0} pets
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="space-y-7 p-6 sm:p-8">
                <section>
                  <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Contact details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <Mail className="mb-2 h-4 w-4 text-orange-500" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Email
                      </p>
                      <p className="mt-1 break-all text-sm font-bold">
                        {selectedUser.email}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <Phone className="mb-2 h-4 w-4 text-orange-500" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Phone
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {selectedUser.phone || "Not recorded"}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <MessageCircle className="mb-2 h-4 w-4 text-emerald-600" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        WhatsApp
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {selectedUser.whatsappSameAsPhone
                          ? selectedUser.phone || "Same as phone"
                          : selectedUser.whatsappPhone || "Not recorded"}
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Registered pets
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Dog and cat icons are based on the saved pet type.
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-black text-orange-600">
                      {selectedUser.petFeeds?.length ?? 0} total
                    </span>
                  </div>

                  {selectedUser.petFeeds?.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedUser.petFeeds.map((feed, index) => (
                        <div
                          key={`${feed.petName}-${index}`}
                          className="rounded-[1.5rem] border bg-card p-5 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                isCat(feed)
                                  ? "bg-violet-500/10 text-violet-600"
                                  : "bg-orange-500/10 text-orange-600"
                              }`}
                            >
                              <PetTypeIcon
                                feed={feed}
                                className="h-6 w-6"
                              />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-black">
                                  {feed.petName || "Unnamed pet"}
                                </h4>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                                  {feed.petType || "Pet"}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
                                {feed.petBreed || "Breed not recorded"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl bg-muted/40 p-3">
                              <span className="text-muted-foreground">Age</span>
                              <p className="mt-0.5 font-bold">
                                {feed.ageValue
                                  ? `${feed.ageValue} ${feed.ageUnit || ""}`
                                  : "Not recorded"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-muted/40 p-3">
                              <span className="text-muted-foreground">Weight</span>
                              <p className="mt-0.5 font-bold">
                                {feed.weightKg
                                  ? `${feed.weightKg} kg`
                                  : "Not recorded"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-muted/40 p-3">
                              <span className="text-muted-foreground">
                                Body condition
                              </span>
                              <p className="mt-0.5 font-bold capitalize">
                                {feed.bodyConditionScore
                                  ? `${feed.bodyConditionScore}/9 · ${feed.weightStatus || "assessed"}`
                                  : "Not assessed"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-muted/40 p-3">
                              <span className="text-muted-foreground">
                                Feeding
                              </span>
                              <p className="mt-0.5 font-bold">
                                {feed.dailyMeals
                                  ? `${feed.dailyMeals} meals/day`
                                  : `${feed.mealDays || 0} plan days`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                            {feed.foodType && (
                              <span className="rounded-full border px-2.5 py-1 capitalize">
                                {feed.foodType}
                              </span>
                            )}
                            {feed.activityLevel && (
                              <span className="rounded-full border px-2.5 py-1 capitalize">
                                {feed.activityLevel} activity
                              </span>
                            )}
                            {feed.sex && (
                              <span className="rounded-full border px-2.5 py-1 capitalize">
                                {feed.sex}
                              </span>
                            )}
                          </div>

                          {feed.createdAt && (
                            <p className="mt-4 flex items-center gap-1.5 border-t pt-3 text-[10px] font-semibold text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Pet added {formatDate(feed.createdAt)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center rounded-[1.5rem] border border-dashed py-10 text-center">
                      <PawPrint className="h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 font-bold">No pets added yet</p>
                      <p className="text-sm text-muted-foreground">
                        This account does not have a saved pet profile.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
