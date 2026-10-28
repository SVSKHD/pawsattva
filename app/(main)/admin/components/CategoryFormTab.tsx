"use client"

import { FolderPlus, FolderPen, Save, CheckCircle2, CircleDashed, UploadCloud, Trash2, ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
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
import { Category } from "@/firebase/firestore"
import { useState, type ReactNode } from "react"
import { ActionButton, FilterTabs } from "./DataTable"

interface CategoryFormTabProps {
  isSubCategory: boolean
  categoryName: string
  setCategoryName: (v: string) => void
  categoryDesc: string
  setCategoryDesc: (v: string) => void
  categoryImage: string
  setCategoryImage: (v: string) => void
  uploadingCategoryImage: boolean
  categoryImageUploadProgress: number
  handleCategoryImageUpload: (file: File) => Promise<void>
  categoryParentId: string
  setCategoryParentId: (v: string) => void
  categoryStatus: "published" | "draft"
  setCategoryStatus: (v: "published" | "draft") => void
  editingCategoryId: string | null
  categories: Category[]
  handleCategorySubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

/** Shared admin field look: inputs, textareas and select triggers */
const fieldClass =
  "h-10 rounded-xl border-black/10 bg-white/80 px-3 text-sm shadow-none dark:border-white/10 dark:bg-black/30 focus-visible:border-orange-400 focus-visible:ring-4 focus-visible:ring-orange-500/10"
const triggerClass = `${fieldClass} w-full data-[size=default]:h-10`

const STATUS_TABS = [
  { id: "draft" as const, label: "Draft", icon: CircleDashed },
  { id: "published" as const, label: "Published", icon: CheckCircle2 },
]

export function CategoryFormTab({
  isSubCategory,
  categoryName, setCategoryName,
  categoryDesc, setCategoryDesc,
  categoryImage, setCategoryImage,
  uploadingCategoryImage, categoryImageUploadProgress, handleCategoryImageUpload,
  categoryParentId, setCategoryParentId,
  categoryStatus, setCategoryStatus,
  editingCategoryId,
  categories,
  handleCategorySubmit,
  onCancel,
}: CategoryFormTabProps) {
  const isEditing = !!editingCategoryId
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(false)
  const parentCategories = categories.filter(c => !c.parentId && c.id !== editingCategoryId)
  const noun = isSubCategory ? "sub-category" : "category"
  const HeaderIcon = isEditing ? FolderPen : FolderPlus
  const hasPreview = Boolean(categoryImage) && /^https?:\/\/.+/i.test(categoryImage)

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-black/10 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
      <form onSubmit={handleCategorySubmit}>
        {/* Header bar — mirrors the shared kit's HeaderBar */}
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-4 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-400/15 text-orange-600 ring-1 ring-orange-500/15 dark:text-orange-300">
            <HeaderIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
              {isEditing ? "Edit" : "New"} {noun}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {isSubCategory
                ? "Nest under a parent category to group posts more finely."
                : "A top-level category that groups related blog posts."}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            <ActionButton onClick={onCancel}>Cancel</ActionButton>
            <ActionButton type="submit" variant="primary" icon={Save}>
              {isEditing ? "Update" : "Save"} {noun}
            </ActionButton>
          </div>
        </div>

        <div className="space-y-5 border-t border-border/50 p-4 sm:p-5">
          {/* Parent selector — only for sub-categories */}
          {isSubCategory && (
            <Field label="Parent category" required>
              <Select value={categoryParentId} onValueChange={setCategoryParentId} required>
                <SelectTrigger className={triggerClass} aria-label="Parent category">
                  <SelectValue placeholder="Select a parent category" />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label={isSubCategory ? "Sub-category name" : "Category name"} htmlFor={`${noun}-name`} required>
            <Input
              id={`${noun}-name`}
              placeholder={isSubCategory
                ? "e.g. Behavioral Training, Senior Health..."
                : "e.g. Nutrition, Health & Wellness..."}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className={fieldClass}
              required
            />
          </Field>

          <Field label="Description" htmlFor={`${noun}-desc`} hint="Optional">
            <Textarea
              id={`${noun}-desc`}
              placeholder="Briefly describe what this category is about..."
              className={`${fieldClass} h-auto min-h-[90px] resize-y py-2.5`}
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
            />
          </Field>

          <Field label="Category image" htmlFor={`${noun}-image`} hint="Optional">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`${noun}-image`}
                placeholder="https://example.com/category-image.jpg"
                value={categoryImage}
                onChange={(e) => setCategoryImage(e.target.value)}
                className={`${fieldClass} min-w-0 flex-1`}
              />
              <label
                className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white/80 px-3.5 text-xs font-bold transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-white/10 dark:bg-black/30 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 sm:text-sm ${
                  uploadingCategoryImage ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <UploadCloud className="h-4 w-4" />
                {uploadingCategoryImage ? `Uploading ${categoryImageUploadProgress}%` : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingCategoryImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await handleCategoryImageUpload(file)
                    e.currentTarget.value = ""
                  }}
                />
              </label>
            </div>
            {uploadingCategoryImage && (
              <Progress value={categoryImageUploadProgress} className="h-1.5" />
            )}
            {hasPreview ? (
              <div className="overflow-hidden rounded-xl border border-black/10 bg-muted/20 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={categoryImage} alt="Category preview" className="max-h-40 w-full object-contain" />
                <div className="flex justify-end border-t border-black/10 p-2 dark:border-white/10">
                  <ActionButton
                    icon={Trash2}
                    onClick={() => setConfirmDeleteImage(true)}
                    className="h-8 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    Remove
                  </ActionButton>
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" /> Paste an image URL or upload one; uploads are compressed automatically.
              </p>
            )}
          </Field>

          <Field label="Status">
            <div className="flex flex-wrap items-center gap-3">
              <FilterTabs label="Status" tabs={STATUS_TABS} value={categoryStatus} onChange={setCategoryStatus} />
              <span className="text-[11px] text-muted-foreground">
                {categoryStatus === "published" ? "Visible on the public site." : "Hidden from the public site."}
              </span>
            </div>
          </Field>
        </div>
      </form>

      <AlertDialog open={confirmDeleteImage} onOpenChange={setConfirmDeleteImage}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove category image?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the selected image from this form only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setCategoryImage("")
                setConfirmDeleteImage(false)
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

function Field({
  label, htmlFor, required, hint, children,
}: { label: string; htmlFor?: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && (
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-orange-600 dark:text-orange-300">Required</span>
        )}
        {hint && <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground/80">{hint}</span>}
      </Label>
      {children}
    </div>
  )
}
