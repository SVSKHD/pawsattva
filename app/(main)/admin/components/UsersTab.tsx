"use client"

import NextImage from "next/image"
import {
  Users, Dog, Search, Edit, Trash2, Save, Phone, Mail,
  ChevronRight, PawPrint, Clock
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { UserProfile } from "@/firebase/firestore"

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
  handleToggleAdmin: (userId: string, targetState: boolean) => void
  handleDeleteUserAccount: (userId: string) => void
}

export function UsersTab({
  users, filteredUsers, totalPetFeeds,
  userSearchQuery, setUserSearchQuery,
  editingUserId, editUserName, setEditUserName,
  editUserEmail, setEditUserEmail, editUserPhone, setEditUserPhone,
  expandedUserId, setExpandedUserId,
  currentUserId,
  handleEditUser, handleSaveUser, setEditingUserId,
  handleToggleAdmin, handleDeleteUserAccount,
}: UsersTabProps) {
  return (
    <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
      <CardHeader className="p-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">All Users</CardTitle>
            <CardDescription className="text-base mt-1">
              Manage registered users, edit profiles, and view pet feed submissions.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/30">
              <Dog className="w-3 h-3" />
              {totalPetFeeds} Pet Feeds
            </span>
            <div className="relative w-full md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10 h-10 bg-white/50 dark:bg-black/50 border-white/20 dark:border-white/10 rounded-xl"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                <th className="px-6 md:px-8 py-4 font-semibold text-sm">User</th>
                <th className="hidden md:table-cell px-6 py-4 font-semibold text-sm">Contact</th>
                <th className="hidden sm:table-cell px-6 py-4 font-semibold text-sm text-center">Pet Feeds</th>
                <th className="px-6 py-4 font-semibold text-sm text-center">Role</th>
                <th className="px-6 py-4 font-semibold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredUsers.map((u) => (
                <>
                  <tr key={u.id} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                    {/* User cell */}
                    <td className="px-6 md:px-8 py-5">
                      {editingUserId === u.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editUserName}
                            onChange={(e) => setEditUserName(e.target.value)}
                            placeholder="Display Name"
                            className="h-9 text-sm bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-lg"
                          />
                          <Input
                            value={editUserEmail}
                            onChange={(e) => setEditUserEmail(e.target.value)}
                            placeholder="Email"
                            className="h-9 text-sm bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-lg"
                          />
                          <Input
                            value={editUserPhone}
                            onChange={(e) => setEditUserPhone(e.target.value)}
                            placeholder="Phone"
                            className="h-9 text-sm bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-all overflow-hidden relative shrink-0">
                            {u.photoURL
                              ? <NextImage src={u.photoURL} alt={u.displayName || ""} fill className="object-cover" />
                              : <span>{(u.displayName || u.email)[0].toUpperCase()}</span>}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold group-hover:text-orange-600 transition-colors">
                              {u.displayName || "Anonymous User"}
                            </span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                            {u.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />{u.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Contact cell */}
                    <td className="hidden md:table-cell px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />{u.email}
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" />{u.phone}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Pet feeds cell */}
                    <td className="hidden sm:table-cell px-6 py-5 text-center">
                      {u.petFeeds && u.petFeeds.length > 0 ? (
                        <button
                          onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                        >
                          <Dog className="w-3.5 h-3.5" />
                          {u.petFeeds.length} {u.petFeeds.length === 1 ? "pet" : "pets"}
                          <ChevronRight className={`w-3 h-3 transition-transform ${expandedUserId === u.id ? "rotate-90" : ""}`} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">No feeds</span>
                      )}
                    </td>

                    {/* Role cell */}
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-tight ${u.admin ? "text-orange-600" : "text-muted-foreground"}`}>
                          {u.admin ? "Admin" : "User"}
                        </span>
                        <Switch
                          checked={u.admin}
                          onCheckedChange={(checked) => handleToggleAdmin(u.id, checked)}
                          disabled={u.id === currentUserId}
                        />
                      </div>
                    </td>

                    {/* Actions cell */}
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingUserId === u.id ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg border-emerald-500/20 transition-all"
                              onClick={handleSaveUser}
                            >
                              <Save className="w-4 h-4 mr-1.5" />Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 rounded-lg"
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
                              className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-all"
                              onClick={() => handleEditUser(u)}
                            >
                              <Edit className="w-4 h-4 md:mr-1.5" />
                              <span className="hidden md:inline">Edit</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={u.id === currentUserId}
                                  className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4 md:mr-1.5" />
                                  <span className="hidden md:inline">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-[2rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/90 dark:bg-black/90 shadow-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-2xl font-bold text-destructive">Delete User Account?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-base text-muted-foreground">
                                    Permanently delete &quot;{u.displayName || u.email}&quot;? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-6 gap-3">
                                  <AlertDialogCancel className="h-11 rounded-xl bg-muted/50 border-0">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 border-0 text-white"
                                    onClick={() => handleDeleteUserAccount(u.id)}
                                  >
                                    Delete User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded pet feed details */}
                  {expandedUserId === u.id && u.petFeeds && u.petFeeds.length > 0 && (
                    <tr key={`${u.id}-feeds`}>
                      <td colSpan={5} className="px-6 md:px-8 py-4 bg-orange-50/30 dark:bg-orange-950/10">
                        <div className="pl-4 md:pl-12 space-y-3">
                          <p className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-2">
                            <PawPrint className="w-3.5 h-3.5" />
                            Pet Feed Details
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {u.petFeeds.map((feed, idx) => (
                              <div
                                key={idx}
                                className="p-4 rounded-2xl bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 shadow-sm space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Dog className="w-4 h-4 text-orange-500" />
                                  <span className="font-bold">{feed.petName}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  <div><span className="text-muted-foreground">Type:</span> <span className="font-semibold">{feed.petType}</span></div>
                                  <div><span className="text-muted-foreground">Breed:</span> <span className="font-semibold">{feed.petBreed}</span></div>
                                  <div><span className="text-muted-foreground">Meal Days:</span> <span className="font-semibold">{feed.mealDays}</span></div>
                                  <div><span className="text-muted-foreground">Reminders:</span> <span className="font-semibold">{feed.reminders ? "Yes" : "No"}</span></div>
                                </div>
                                {feed.createdAt && (
                                  <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(feed.createdAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 opacity-20" />
                      <p className="font-medium">No users found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <CardFooter className="p-8 flex items-center justify-between border-t border-border/40">
        <span className="text-sm text-muted-foreground font-medium">
          Showing <span className="font-bold text-foreground">{filteredUsers.length}</span> of {users.length} users
        </span>
        <span className="text-sm font-bold text-orange-600">
          {totalPetFeeds} total pet feed submissions
        </span>
      </CardFooter>
    </Card>
  )
}
