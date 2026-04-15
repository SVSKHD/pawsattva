"use client"

import { FolderPlus, Save, CheckCircle2, CircleDashed } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Category } from "@/firebase/firestore"

interface CategoryFormTabProps {
  isSubCategory: boolean
  categoryName: string
  setCategoryName: (v: string) => void
  categoryDesc: string
  setCategoryDesc: (v: string) => void
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
  categoryParentId, setCategoryParentId,
  categoryStatus, setCategoryStatus,
  editingCategoryId,
  categories,
  handleCategorySubmit,
  onCancel,
}: CategoryFormTabProps) {
  const isEditing = !!editingCategoryId
  const parentCategories = categories.filter(c => !c.parentId && c.id !== editingCategoryId)

  return (
    <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl overflow-hidden max-w-3xl mx-auto rounded-[2rem]">
      <form onSubmit={handleCategorySubmit}>
        <CardHeader className="border-b border-border/40 bg-white/30 dark:bg-black/20 pb-6 pt-6 px-8">
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

        <CardContent className="p-8 space-y-6">
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

        <CardFooter className="flex justify-end gap-3 border-t border-border/40 bg-white/20 dark:bg-black/20 p-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 px-7 rounded-xl bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/20 font-semibold"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-11 px-9 gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/20 font-bold border-0"
          >
            <Save className="w-4 h-4" />
            {isEditing
              ? `Update ${isSubCategory ? "Sub-Category" : "Category"}`
              : `Save ${isSubCategory ? "Sub-Category" : "Category"}`}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
