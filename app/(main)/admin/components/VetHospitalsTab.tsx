"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  addVetHospital,
  deleteVetHospital,
  onVetHospitalsSnapshot,
  updateVetHospital,
  type VetHospital,
  type VetHospitalInput,
  type VetHospitalStatus,
} from "@/firebase/firestore"
import { WALK_CITIES, type HospitalType } from "@/lib/walks"
import { TablePagination, usePagination } from "./TablePagination"
import {
  ActionsCell, FilterTabs, IconAction, StatusPill, TableCard, TableEmpty, TableHeading, TableSearch,
  TableToolbar, filterSelectClass, rowClass, rowTitleClass, thClass, theadRowClass,
} from "./DataTable"

const HOSPITAL_TYPES: HospitalType[] = ["Vet hospital", "Vet clinic", "Animal shelter clinic"]
const ZONES = ["Central", "North", "South", "East", "West", "Outskirts"]

type StatusFilter = "all" | VetHospitalStatus

interface HospitalForm {
  cityId: string
  name: string
  area: string
  zone: string
  type: HospitalType
  summary: string
  phone: string
  open24h: boolean
  verifiedOn: string
  mapsQuery: string
  status: VetHospitalStatus
}

const emptyForm: HospitalForm = {
  cityId: "hyderabad",
  name: "",
  area: "",
  zone: "Central",
  type: "Vet hospital",
  summary: "",
  phone: "",
  open24h: false,
  verifiedOn: "",
  mapsQuery: "",
  status: "approved",
}

const toForm = (hospital: VetHospital): HospitalForm => ({
  cityId: hospital.cityId,
  name: hospital.name,
  area: hospital.area,
  zone: hospital.zone,
  type: hospital.type,
  summary: hospital.summary,
  phone: hospital.phone ?? "",
  open24h: Boolean(hospital.open24h),
  verifiedOn: hospital.verifiedOn ?? "",
  mapsQuery: hospital.mapsQuery ?? "",
  status: hospital.status,
})

const cityName = (cityId: string) =>
  WALK_CITIES.find((city) => city.id === cityId)?.name ?? cityId

export function VetHospitalsTab() {
  const { user } = useAuth()
  const [hospitals, setHospitals] = useState<VetHospital[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<HospitalForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [cityFilter, setCityFilter] = useState("hyderabad")
  const [query, setQuery] = useState("")
  const [pendingDelete, setPendingDelete] = useState<VetHospital | null>(null)

  useEffect(
    () =>
      onVetHospitalsSnapshot((next) => {
        setHospitals(next)
        setLoading(false)
      }),
    []
  )

  // City and search narrow the list first; the status tabs and their counts work on that.
  const matchingHospitals = useMemo(() => {
    const q = query.trim().toLowerCase()
    return hospitals
      .filter((hospital) => cityFilter === "all" || hospital.cityId === cityFilter)
      .filter(
        (hospital) =>
          !q ||
          [hospital.name, hospital.area, hospital.zone, hospital.phone, hospital.summary]
            .some((field) => field?.toLowerCase().includes(q))
      )
  }, [cityFilter, hospitals, query])

  const visibleHospitals = useMemo(
    () =>
      matchingHospitals
        .filter((hospital) => statusFilter === "all" || hospital.status === statusFilter)
        .sort(
          (a, b) =>
            Number(a.status === "approved") - Number(b.status === "approved") ||
            a.zone.localeCompare(b.zone) ||
            a.name.localeCompare(b.name)
        ),
    [matchingHospitals, statusFilter]
  )

  const pagination = usePagination(visibleHospitals)

  const approvedCount = hospitals.filter((hospital) => hospital.status === "approved").length
  const pendingCount = hospitals.length - approvedCount
  const statusCounts: Record<StatusFilter, number> = {
    all: matchingHospitals.length,
    approved: matchingHospitals.filter((hospital) => hospital.status === "approved").length,
    pending: matchingHospitals.filter((hospital) => hospital.status !== "approved").length,
  }

  const update = <K extends keyof HospitalForm>(key: K, value: HospitalForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.area.trim() || !form.zone.trim() || !form.summary.trim()) {
      toast.error("Name, area, zone and summary are required.")
      return
    }

    const optional = (value: string) => value.trim() || undefined
    const data: VetHospitalInput = {
      cityId: form.cityId,
      name: form.name.trim(),
      area: form.area.trim(),
      zone: form.zone.trim(),
      type: form.type,
      summary: form.summary.trim(),
      phone: optional(form.phone),
      open24h: form.open24h || undefined,
      verifiedOn: optional(form.verifiedOn),
      mapsQuery: optional(form.mapsQuery),
      status: form.status,
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateVetHospital(editingId, data)
        toast.success("Hospital updated.")
      } else {
        await addVetHospital({
          ...data,
          createdBy: user?.uid,
          createdByName: user?.displayName || user?.email || undefined,
        })
        toast.success(
          data.status === "approved"
            ? "Hospital added to the approved list."
            : "Hospital saved as pending."
        )
      }
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Failed to save hospital: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (hospital: VetHospital) => {
    setEditingId(hospital.id)
    setForm(toForm(hospital))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleToggleStatus = async (hospital: VetHospital) => {
    const status: VetHospitalStatus = hospital.status === "approved" ? "pending" : "approved"
    try {
      await updateVetHospital(hospital.id, { status })
      toast.success(status === "approved" ? `${hospital.name} approved.` : `${hospital.name} moved to pending.`)
    } catch {
      toast.error("Failed to update status.")
    }
  }

  const handleDelete = async (hospital: VetHospital) => {
    try {
      await deleteVetHospital(hospital.id)
      if (editingId === hospital.id) resetForm()
      toast.success("Hospital deleted.")
    } catch {
      toast.error("Failed to delete hospital.")
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-white/40 bg-white/40 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-black/40 sm:rounded-[2rem]">
        <CardHeader className="p-4 pb-3 sm:p-8 sm:pb-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <CardTitle className="text-xl font-bold sm:text-2xl">
                {editingId ? "Edit vet hospital" : "Add a vet hospital"}
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-base">
                Approved hospitals appear on the Walks page under Hospitals for their
                city within about 5 minutes.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {approvedCount} approved
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600">
                <Clock className="h-3.5 w-3.5" />
                {pendingCount} pending
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-8 sm:pt-0">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vet-name">Hospital name *</Label>
              <Input
                id="vet-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Name as shown on the hospital's signboard"
                className="h-11 rounded-xl bg-white/50 dark:bg-black/50"
              />
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Select value={form.cityId} onValueChange={(value) => update("cityId", value)}>
                <SelectTrigger className="h-11 rounded-xl bg-white/50 dark:bg-black/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WALK_CITIES.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value: HospitalType) => update("type", value)}>
                <SelectTrigger className="h-11 rounded-xl bg-white/50 dark:bg-black/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOSPITAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vet-area">Area *</Label>
              <Input
                id="vet-area"
                value={form.area}
                onChange={(event) => update("area", event.target.value)}
                placeholder="e.g. Banjara Hills"
                className="h-11 rounded-xl bg-white/50 dark:bg-black/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vet-zone">Zone *</Label>
              <Input
                id="vet-zone"
                list="vet-zone-options"
                value={form.zone}
                onChange={(event) => update("zone", event.target.value)}
                placeholder="Central, West, Outskirts…"
                className="h-11 rounded-xl bg-white/50 dark:bg-black/50"
              />
              <datalist id="vet-zone-options">
                {ZONES.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vet-summary">Summary *</Label>
              <Textarea
                id="vet-summary"
                value={form.summary}
                onChange={(event) => update("summary", event.target.value)}
                placeholder="Services, specialities, emergency care…"
                maxLength={300}
                className="min-h-24 rounded-xl bg-white/50 dark:bg-black/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vet-phone">Phone</Label>
              <Input
                id="vet-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="From the hospital's own listing"
                className="h-11 rounded-xl bg-white/50 dark:bg-black/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vet-verified">Details verified on</Label>
              <Input
                id="vet-verified"
                type="date"
                value={form.verifiedOn}
                onChange={(event) => update("verifiedOn", event.target.value)}
                className="h-11 rounded-xl bg-white/50 dark:bg-black/50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vet-maps">Google Maps search text</Label>
              <Input
                id="vet-maps"
                value={form.mapsQuery}
                onChange={(event) => update("mapsQuery", event.target.value)}
                placeholder="Optional. Defaults to “name, area, city”"
                className="h-11 rounded-xl bg-white/50 dark:bg-black/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox
                  checked={form.open24h}
                  onCheckedChange={(checked) => update("open24h", checked === true)}
                />
                Open 24×7
              </label>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: VetHospitalStatus) => update("status", value)}
                >
                  <SelectTrigger className="h-10 w-[140px] rounded-xl bg-white/50 dark:bg-black/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground md:col-span-2">
              Without a verified date the listing shows “Call before visiting”. Only add a
              phone number taken from the hospital itself.
            </p>

            <div className="flex gap-2 md:col-span-2">
              <Button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-orange-500 px-6 font-bold text-white hover:bg-orange-600"
              >
                {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {saving ? "Saving…" : editingId ? "Save changes" : "Add hospital"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <TableHeading
        title="Vet hospitals"
        subtitle={
          <>
            {approvedCount} approved
            {pendingCount > 0 && <> · <span className="font-semibold text-amber-600">{pendingCount} pending</span></>}
            {" "}· Pending listings stay hidden from visitors.
          </>
        }
      />

      <TableCard>
        <TableToolbar>
          <FilterTabs
            label="Filter by status"
            tabs={[{ id: "all", label: "All" }, { id: "approved", label: "Approved" }, { id: "pending", label: "Pending" }]}
            value={statusFilter}
            onChange={(next) => { setStatusFilter(next); pagination.reset() }}
            counts={statusCounts}
            alert={{ id: "pending", className: "bg-amber-500" }}
          />
          <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Select value={cityFilter} onValueChange={(value) => { setCityFilter(value); pagination.reset() }}>
              <SelectTrigger className={`w-full sm:w-40 ${filterSelectClass}`} aria-label="Filter by city">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {WALK_CITIES.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TableSearch
              value={query}
              onChange={(next) => { setQuery(next); pagination.reset() }}
              placeholder="Name, area, phone…"
              label="Search hospitals"
              className="sm:w-64 sm:flex-none"
            />
          </div>
        </TableToolbar>

        {loading ? (
          <p className="py-14 text-center text-sm text-muted-foreground">Loading hospitals…</p>
        ) : visibleHospitals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass}>Hospital</th>
                  <th className={`hidden md:table-cell ${thClass}`}>Location</th>
                  <th className={`hidden lg:table-cell ${thClass}`}>Details</th>
                  <th className={`hidden sm:table-cell ${thClass}`}>Status</th>
                  <th className={`w-px ${thClass}`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pagination.rows.map((hospital) => {
                  const approved = hospital.status === "approved"
                  return (
                    <tr
                      key={hospital.id}
                      onClick={() => handleEdit(hospital)}
                      className={`${rowClass} ${editingId === hospital.id ? "bg-orange-500/[0.06]" : ""}`}
                    >
                      <td className="max-w-0 px-4 py-3 sm:w-[38%]">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                            <Stethoscope className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className={rowTitleClass}>{hospital.name}</p>
                            <p className="truncate text-xs text-muted-foreground" title={hospital.summary}>
                              {hospital.type} · {hospital.summary}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-xs md:table-cell">
                        <p className="flex items-center gap-1.5 text-foreground/80">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {hospital.area}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {hospital.zone} · {cityName(hospital.cityId)}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="flex flex-wrap items-center gap-1">
                          {hospital.phone && (
                            <StatusPill tone="muted" icon={Phone}>{hospital.phone}</StatusPill>
                          )}
                          {hospital.open24h && <StatusPill tone="sky" icon={Clock}>24×7</StatusPill>}
                          {hospital.verifiedOn ? (
                            <StatusPill tone="emerald" icon={ShieldCheck}>Verified {hospital.verifiedOn}</StatusPill>
                          ) : (
                            <StatusPill tone="amber">Not verified</StatusPill>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <StatusPill tone={approved ? "emerald" : "amber"} icon={approved ? CheckCircle2 : Clock}>
                          {approved ? "Approved" : "Pending"}
                        </StatusPill>
                      </td>
                      <ActionsCell>
                        <IconAction
                          label={approved ? "Move to pending" : "Approve"}
                          tone={approved ? "amber" : "emerald"}
                          onClick={() => handleToggleStatus(hospital)}
                        >
                          {approved ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </IconAction>
                        <IconAction label="Edit" tone="orange" onClick={() => handleEdit(hospital)}>
                          <Pencil className="h-4 w-4" />
                        </IconAction>
                        <IconAction label="Delete" tone="red" onClick={() => setPendingDelete(hospital)}>
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
          <TableEmpty icon={Stethoscope} title="No hospitals match these filters">
            {(query || statusFilter !== "all" || cityFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => { setQuery(""); setStatusFilter("all"); setCityFilter("all") }}
              >
                Clear filters
              </Button>
            )}
          </TableEmpty>
        )}

        <TablePagination pagination={pagination} noun={visibleHospitals.length === 1 ? "hospital" : "hospitals"} />
      </TableCard>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this hospital?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will be removed from the list. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) void handleDelete(pendingDelete)
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
