"use client"

import { FolderPlus, Save, CheckCircle2, CircleDashed, UploadCloud, Trash2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { useState } from "react"

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

  return (
    <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl overflow-hidden max-w-3xl mx-auto rounded-2xl sm:rounded-[2rem]">
      <form onSubmit={handleCategorySubmit}>
        <CardHeader className="border-b border-border/40 bg-white/30 dark:bg-black/20 pb-4 sm:pb-6 pt-4 sm:pt-6 px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <FolderPlus className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                {isEditing
                  ? `Edit ${isSubCategory ? "Sub-Category" : "Category"}`
                  : `New ${isSubCategory ? "Sub-Category" : "Category"}`}
              </CardTitle>
              <CardDescription className="mt-0.5">
                {isSubCategory
                  ? "Group content more granularly by nesting under a parent category."
                  : "Add a new top-level category to group related blog posts."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          {/* Parent selector — only for sub-categories */}
          {isSubCategory && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center justify-between">
                Parent Category
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
              </Label>
              <Select value={categoryParentId} onValueChange={setCategoryParentId} required>
                <SelectTrigger className="h-13 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-amber-500/30">
                  <SelectValue placeholder="Select Parent Category" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10 max-h-[300px]">
                  {parentCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-lg my-1 cursor-pointer">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center justify-between">
              {isSubCategory ? "Sub-Category Name" : "Category Name"}
              <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
            </Label>
            <Input
              placeholder={isSubCategory
                ? "e.g. Behavioral Training, Senior Health..."
                : "e.g. Nutrition, Health & Wellness..."}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="h-13 text-base bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 rounded-xl px-4"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center justify-between">
              Description
              <span className="text-xs text-muted-foreground font-normal">Optional</span>
            </Label>
            <Textarea
              placeholder="Briefly describe what this category is about..."
              className="min-h-[90px] resize-y bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 rounded-xl p-4"
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Category Image</Label>
            <Input
              placeholder="https://example.com/category-image.jpg"
              value={categoryImage}
              onChange={(e) => setCategoryImage(e.target.value)}
              className="h-11 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 rounded-xl px-4"
            />
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 cursor-pointer hover:bg-amber-500/15 transition-colors">
              <UploadCloud className="w-3.5 h-3.5" />
              {uploadingCategoryImage ? `Uploading... ${categoryImageUploadProgress}%` : "Upload image (auto-compress)"}
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
            {uploadingCategoryImage && (
              <div className="space-y-1">
                <Progress value={categoryImageUploadProgress} className="h-2" />
                <p className="text-[11px] text-muted-foreground">Upload progress: {categoryImageUploadProgress}%</p>
              </div>
            )}
            {categoryImage && /^https?:\/\/.+/i.test(categoryImage) && (
              <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={categoryImage} alt="Category preview" className="max-h-40 w-full object-contain" />
                <div className="p-2 border-t border-black/10 dark:border-white/10 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setConfirmDeleteImage(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Status</Label>
            <Select value={categoryStatus} onValueChange={(val: "published" | "draft") => setCategoryStatus(val)}>
              <SelectTrigger className="h-13 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-amber-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10">
                <SelectItem value="draft" className="rounded-lg my-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CircleDashed className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">Draft (Hidden)</span>
                  </div>
                </SelectItem>
                <SelectItem value="published" className="rounded-lg my-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium">Published (Public)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-border/40 bg-white/20 dark:bg-black/20 p-4 sm:p-6">
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/20 font-semibold w-full sm:w-auto"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-10 sm:h-11 px-6 sm:px-9 gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/20 font-bold border-0 w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            {isEditing
              ? `Update ${isSubCategory ? "Sub-Category" : "Category"}`
              : `Save ${isSubCategory ? "Sub-Category" : "Category"}`}
          </Button>
        </CardFooter>
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
    </Card>
  )
}
