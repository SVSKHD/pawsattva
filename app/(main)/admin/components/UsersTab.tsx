"use client"

import { useEffect, useMemo, useState } from "react"
import NextImage from "next/image"
import {
  CalendarDays,
  Cat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dog,
  Edit,
  Mail,
  MessageCircle,
  PawPrint,
  Phone,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { PetFeedEntry, UserProfile } from "@/firebase/firestore"

type UserAgeFilter = "all" | "new" | "old"

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
}

const PAGE_SIZE = 5
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
}: UsersTabProps) {
  const [ageFilter, setAgeFilter] = useState<UserAgeFilter>("all")
  const [breedFilter, setBreedFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  const breeds = useMemo(
    () =>
      Array.from(
        new Set(
          users.flatMap((profile) =>
            (profile.petFeeds ?? [])
              .map((feed) => feed.petBreed?.trim())
              .filter((breed): breed is string => Boolean(breed))
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [users]
  )

  const visibleUsers = useMemo(() => {
    return [...filteredUsers]
      .filter((profile) => {
        if (ageFilter === "new") return isNewUser(profile)
        if (ageFilter === "old") {
          const age = daysSince(profile.createdAt)
          return age !== null && age > NEW_USER_DAYS
        }
        return true
      })
      .filter((profile) => {
        if (breedFilter === "all") return true
        return (profile.petFeeds ?? []).some(
          (feed) =>
            feed.petBreed?.trim().toLowerCase() === breedFilter.toLowerCase()
        )
      })
      .sort((a, b) => {
        const aDate = toDate(a.createdAt)?.getTime() ?? 0
        const bDate = toDate(b.createdAt)?.getTime() ?? 0
        return bDate - aDate
      })
  }, [ageFilter, breedFilter, filteredUsers])

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE))
  const pageUsers = useMemo(
    () =>
      visibleUsers.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [currentPage, visibleUsers]
  )

  const selectedUser = useMemo(
    () => users.find((profile) => profile.id === expandedUserId) ?? null,
    [expandedUserId, users]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [ageFilter, breedFilter, userSearchQuery])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const openUser = (
    event: React.MouseEvent<HTMLTableRowElement>,
    profile: UserProfile
  ) => {
    const target = event.target as HTMLElement
    if (
      target.closest(
        "button, input, a, [role='combobox'], [role='option'], [data-radix-collection-item]"
      )
    ) {
      return
    }
    setExpandedUserId(profile.id)
  }

  const start = visibleUsers.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0
  const end = Math.min(currentPage * PAGE_SIZE, visibleUsers.length)

  return (
    <>
      <Card className="rounded-2xl border-white/40 bg-white/40 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-black/40 sm:rounded-[2rem]">
        <CardHeader className="p-4 pb-4 sm:p-8 sm:pb-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <CardTitle className="text-xl font-bold sm:text-2xl">
                  All Users
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-base">
                  Search users, filter by join age or breed, and click any row to
                  see the full profile and registered pets.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {users.length} users
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-600">
                  <PawPrint className="h-3.5 w-3.5" />
                  {totalPetFeeds} pets
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_150px_minmax(180px,240px)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, phone, pet or breed..."
                  className="h-11 rounded-xl border-white/20 bg-white/50 pl-10 dark:border-white/10 dark:bg-black/50"
                  value={userSearchQuery}
                  onChange={(event) => setUserSearchQuery(event.target.value)}
                />
              </div>

              <Select
                value={ageFilter}
                onValueChange={(value: UserAgeFilter) => setAgeFilter(value)}
              >
                <SelectTrigger className="h-11 rounded-xl bg-white/50 dark:bg-black/50">
                  <SelectValue placeholder="User age" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="new">New · ≤30 days</SelectItem>
                  <SelectItem value="old">Old · &gt;30 days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={breedFilter} onValueChange={setBreedFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-white/50 dark:bg-black/50">
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
            </div>

            <p className="text-[11px] font-medium text-muted-foreground">
              “New” means joined within the last {NEW_USER_DAYS} days. Users
              without a stored join date remain visible under All.
            </p>
          </div>
        </CardHeader>

        <CardContent className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                  <th className="px-6 py-4 text-xs font-semibold sm:text-sm">
                    User
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold sm:text-sm">
                    Joined
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold sm:text-sm">
                    Pets
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-semibold sm:text-sm">
                    Role
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold sm:text-sm">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/40">
                {pageUsers.map((profile) => {
                  const pets = profile.petFeeds ?? []
                  const joinAge = daysSince(profile.createdAt)

                  return (
                    <tr
                      key={profile.id}
                      onClick={(event) => openUser(event, profile)}
                      className="group cursor-pointer transition-colors hover:bg-orange-500/[0.04] dark:hover:bg-orange-500/[0.06]"
                    >
                      <td className="px-6 py-4">
                        {editingUserId === profile.id ? (
                          <div className="max-w-sm space-y-2">
                            <Input
                              value={editUserName}
                              onChange={(event) =>
                                setEditUserName(event.target.value)
                              }
                              placeholder="Display Name"
                              className="h-9 rounded-lg bg-white/50 text-sm dark:bg-black/50"
                            />
                            <Input
                              value={editUserEmail}
                              onChange={(event) =>
                                setEditUserEmail(event.target.value)
                              }
                              placeholder="Email"
                              className="h-9 rounded-lg bg-white/50 text-sm dark:bg-black/50"
                            />
                            <Input
                              value={editUserPhone}
                              onChange={(event) =>
                                setEditUserPhone(event.target.value)
                              }
                              placeholder="Phone"
                              className="h-9 rounded-lg bg-white/50 text-sm dark:bg-black/50"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-500/20 bg-orange-500/10 font-bold text-orange-600">
                              {profile.photoURL ? (
                                <NextImage
                                  src={profile.photoURL}
                                  alt={profile.displayName || "User"}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <span>
                                  {(profile.displayName || profile.email || "?")[0].toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="max-w-[220px] truncate font-bold group-hover:text-orange-600">
                                  {profile.displayName || "Anonymous User"}
                                </span>
                                {isNewUser(profile) && (
                                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-600">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="max-w-[280px] truncate text-xs text-muted-foreground">
                                {profile.email}
                              </p>
                              {profile.phone && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {profile.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-sm font-bold">
                            <CalendarDays className="h-4 w-4 text-orange-500" />
                            {formatDate(profile.createdAt, "Unknown")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {joinAge === null
                              ? "Join date unavailable"
                              : joinAge === 0
                                ? "Joined today"
                                : `${joinAge} day${joinAge === 1 ? "" : "s"} ago`}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {pets.length ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1">
                                {pets.slice(0, 4).map((feed, index) => (
                                  <span
                                    key={`${feed.petName}-${index}`}
                                    title={`${feed.petName} · ${feed.petBreed || feed.petType}`}
                                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-orange-100 text-orange-600 dark:bg-orange-950"
                                  >
                                    <PetTypeIcon
                                      feed={feed}
                                      className="h-3.5 w-3.5"
                                    />
                                  </span>
                                ))}
                              </div>
                              <span className="text-sm font-black">
                                {pets.length} {pets.length === 1 ? "pet" : "pets"}
                              </span>
                            </div>

                            <div className="flex max-w-[310px] flex-wrap gap-1">
                              {Array.from(
                                new Set(
                                  pets
                                    .map((feed) => feed.petBreed?.trim())
                                    .filter(Boolean)
                                )
                              )
                                .slice(0, 3)
                                .map((breed) => (
                                  <span
                                    key={breed}
                                    className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground"
                                  >
                                    {breed}
                                  </span>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs italic text-muted-foreground/60">
                            <PawPrint className="h-3.5 w-3.5" />
                            No pets added
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-tight ${
                              getRole(profile) !== "user"
                                ? "text-orange-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {getRole(profile)}
                          </span>
                          <Select
                            value={getRole(profile)}
                            onValueChange={(
                              value: NonNullable<UserProfile["role"]>
                            ) =>
                              handleChangeUserRole(profile.id, value)
                            }
                            disabled={profile.id === currentUserId}
                          >
                            <SelectTrigger className="h-9 w-[112px] rounded-xl bg-white/50 text-xs font-bold dark:bg-black/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="author">Author</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingUserId === profile.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-lg border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                                onClick={handleSaveUser}
                              >
                                <Save className="mr-1.5 h-4 w-4" />
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 rounded-lg"
                                onClick={() => setEditingUserId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-lg bg-white/50 text-orange-600 hover:bg-orange-600 hover:text-white dark:bg-black/50"
                                onClick={() => handleEditUser(profile)}
                              >
                                <Edit className="mr-1.5 h-4 w-4" />
                                Edit
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={profile.id === currentUserId}
                                    className="h-9 rounded-lg bg-white/50 text-destructive hover:bg-destructive hover:text-white dark:bg-black/50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2rem] border-white/30 bg-white/95 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-black/95">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete User Account?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Permanently delete “
                                      {profile.displayName || profile.email}”?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-white hover:bg-destructive/90"
                                      onClick={() =>
                                        handleDeleteUserAccount(profile.id)
                                      }
                                    >
                                      Delete User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {pageUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-20 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 opacity-20" />
                        <p className="font-medium">
                          No users match these filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Showing{" "}
              <span className="font-bold text-foreground">
                {start}–{end}
              </span>{" "}
              of{" "}
              <span className="font-bold text-foreground">
                {visibleUsers.length}
              </span>{" "}
              matching users
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              5 users per page · {totalPetFeeds} total pet profiles
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              disabled={currentPage <= 1}
              onClick={() =>
                setCurrentPage((page) => Math.max(1, page - 1))
              }
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <span className="min-w-20 text-center text-xs font-bold">
              Page {currentPage} / {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

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
