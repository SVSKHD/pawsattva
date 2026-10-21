"use client"

import { useMemo, useState } from "react"
import { Dog, Mail, Phone, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Subscription } from "@/firebase/firestore"
import { TablePagination, usePagination } from "./TablePagination"
import {
  EmptyCell, FilterTabs, SortHeader, StatusPill, TableCard, TableEmpty, TableHeading, TableSearch,
  TableToolbar, nextSort, rowTitleClass, thClass, theadRowClass, type SortState,
} from "./DataTable"

interface SubscribersTabProps {
  subscribers: Subscription[]
}

type View = "all" | "phone" | "breed"
type SortKey = "name" | "joined"

const joinedTime = (sub: Subscription) => {
  const time = new Date(sub.subscribedAt?.toDate ? sub.subscribedAt.toDate() : sub.subscribedAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

const inView = (sub: Subscription, view: View) =>
  view === "phone" ? Boolean(sub.phone) : view === "breed" ? Boolean(sub.petBreed) : true

export function SubscribersTab({ subscribers }: SubscribersTabProps) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<View>("all")
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "joined", dir: "desc" })

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return subscribers
    return subscribers.filter((sub) =>
      [sub.name, sub.email, sub.phone, sub.petBreed].some((field) => field?.toLowerCase().includes(q))
    )
  }, [query, subscribers])

  const counts: Record<View, number> = {
    all: matching.length,
    phone: matching.filter((sub) => inView(sub, "phone")).length,
    breed: matching.filter((sub) => inView(sub, "breed")).length,
  }

  const rows = useMemo(() => {
    const direction = sort.dir === "asc" ? 1 : -1
    return matching
      .filter((sub) => inView(sub, view))
      .sort((a, b) =>
        sort.key === "name"
          ? (a.name || a.email).localeCompare(b.name || b.email) * direction
          : (joinedTime(a) - joinedTime(b)) * direction
      )
  }, [matching, sort, view])

  const pagination = usePagination(rows)
  const onSort = (key: SortKey) => {
    setSort((current) => nextSort(current, key, key === "name" ? "asc" : "desc"))
    pagination.reset()
  }

  return (
    <div className="space-y-4">
      <TableHeading
        title="Pack subscribers"
        subtitle={`${subscribers.length} pet parents signed up for community updates.`}
      />

      <TableCard>
        <TableToolbar>
          <FilterTabs
            label="Filter subscribers"
            tabs={[{ id: "all", label: "All" }, { id: "phone", label: "With phone" }, { id: "breed", label: "With breed" }]}
            value={view}
            onChange={(next) => { setView(next); pagination.reset() }}
            counts={counts}
          />
          <TableSearch
            value={query}
            onChange={(next) => { setQuery(next); pagination.reset() }}
            placeholder="Name, email, phone, breed…"
            label="Search subscribers"
            className="ml-auto sm:max-w-xs"
          />
        </TableToolbar>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={theadRowClass}>
                  <SortHeader label="Subscriber" sortKey="name" sort={sort} onSort={onSort} />
                  <th className={`hidden md:table-cell ${thClass}`}>Contact</th>
                  <th className={`hidden sm:table-cell ${thClass}`}>Pet breed</th>
                  <SortHeader label="Joined" sortKey="joined" sort={sort} onSort={onSort} className="text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pagination.rows.map((sub) => (
                  <tr key={sub.id} className="transition-colors hover:bg-orange-500/[0.04]">
                    <td className="max-w-0 px-4 py-3 sm:w-[35%]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-sm font-bold text-orange-600">
                          {(sub.name || sub.email || "?")[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className={rowTitleClass}>{sub.name || "Unnamed"}</p>
                          <p className="truncate text-xs text-muted-foreground md:hidden">{sub.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-xs md:table-cell">
                      <p className="flex items-center gap-1.5 text-foreground/80">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {sub.email}
                      </p>
                      {sub.phone && (
                        <p className="mt-1 flex items-center gap-1.5 text-foreground/80">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {sub.phone}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {sub.petBreed ? <StatusPill tone="orange" icon={Dog}>{sub.petBreed}</StatusPill> : <EmptyCell />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                      {joinedTime(sub)
                        ? new Date(joinedTime(sub)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : query ? (
          <TableEmpty icon={Users} title={`No subscribers match “${query}”`}>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setQuery("")}>Clear search</Button>
          </TableEmpty>
        ) : (
          <TableEmpty icon={Users} title="No subscribers yet" />
        )}

        <TablePagination pagination={pagination} noun={rows.length === 1 ? "subscriber" : "subscribers"} />
      </TableCard>
    </div>
  )
}
