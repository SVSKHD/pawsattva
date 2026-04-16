"use client"

import { Users, Mail, Phone, Dog } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Subscription } from "@/firebase/firestore"

interface SubscribersTabProps {
  subscribers: Subscription[]
}

export function SubscribersTab({ subscribers }: SubscribersTabProps) {
  return (
    <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-2xl sm:rounded-[2rem]">
      <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4">
        <CardTitle className="text-xl sm:text-2xl font-bold">Pack Subscribers</CardTitle>
        <CardDescription className="text-xs sm:text-base mt-1">
          All pet parent community leads and sign-ups.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                <th className="px-3 sm:px-8 py-3 sm:py-4 font-semibold text-xs sm:text-sm">Subscriber</th>
                <th className="hidden md:table-cell px-4 sm:px-8 py-3 sm:py-4 font-semibold text-xs sm:text-sm">Contact</th>
                <th className="hidden sm:table-cell px-4 sm:px-8 py-3 sm:py-4 font-semibold text-xs sm:text-sm">Pet Breed</th>
                <th className="px-3 sm:px-8 py-3 sm:py-4 font-semibold text-xs sm:text-sm text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                  <td className="px-3 sm:px-8 py-3 sm:py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-all shrink-0">
                        {(sub.name || sub.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{sub.name || "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{sub.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-8 py-3 sm:py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {sub.email}
                      </div>
                      {sub.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {sub.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 sm:px-8 py-3 sm:py-5">
                    <div className="flex items-center gap-2 bg-orange-500/5 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-xl border border-orange-500/10 w-fit font-bold text-xs uppercase tracking-tight">
                      <Dog className="w-3.5 h-3.5" />
                      {sub.petBreed || "N/A"}
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-3 sm:py-5 text-xs sm:text-sm text-muted-foreground font-medium text-right">
                    {sub.subscribedAt
                      ? new Date(sub.subscribedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {subscribers.length === 0 && (
            <div className="p-20 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground font-medium">No subscribers yet.</p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 sm:p-8 border-t border-border/40">
        <span className="text-sm text-muted-foreground font-medium">
          Total <span className="font-bold text-foreground">{subscribers.length}</span> pet parents
        </span>
      </CardFooter>
    </Card>
  )
}
