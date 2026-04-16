"use client"

import { Edit, Trash2, CheckCircle2, CircleDashed } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Category } from "@/firebase/firestore"

interface CategoryListTabProps {
  categories: Category[]
  onEdit: (cat: Category) => void
  onDelete: (id: string, name: string) => void
}

function CategoryTable({
  title,
  color,
  Icon,
  borderColor,
  bgColor,
  headerBg,
  items,
  onEdit,
  onDelete,
}: {
  title: string
  color: string
  Icon: React.ElementType
  borderColor: string
  bgColor: string
  headerBg: string
  items: Category[]
  onEdit: (cat: Category) => void
  onDelete: (id: string, name: string) => void
}) {
  return (
    <div className={`rounded-2xl sm:rounded-[1.75rem] border ${borderColor} bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl overflow-hidden`}>
      <div className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-4 ${headerBg} border-b ${borderColor}`}>
        <div className={`w-1 h-6 rounded-full ${bgColor}`} />
        <Icon className={`w-4 h-4 ${color}`} />
        <span className={`font-bold ${color} text-xs sm:text-sm uppercase tracking-widest`}>{title}</span>
        <span className={`ml-auto text-xs font-bold bg-opacity-15 ${color} px-2.5 py-0.5 rounded-full border ${borderColor} ${bgColor.replace("bg-", "bg-")}/15`}>
          {items.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/30 bg-white/10 dark:bg-black/10">
              <th className="px-3 sm:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Category Name</th>
              <th className="hidden lg:table-cell px-4 sm:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Description</th>
              <th className="px-3 sm:px-8 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {items.length > 0 ? items.map((cat) => (
              <tr key={cat.id} className={`group hover:${headerBg} transition-colors`}>
                <td className={`px-3 sm:px-8 py-3 sm:py-4 font-bold text-sm sm:text-base uppercase tracking-tight ${color.replace("text-", "group-hover:text-")}`}>
                  {cat.name}
                </td>
                <td className="hidden lg:table-cell px-4 sm:px-8 py-4 text-sm text-muted-foreground max-w-xs truncate">
                  {cat.description || "—"}
                </td>
                <td className="px-3 sm:px-8 py-3 sm:py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 bg-white/50 dark:bg-black/50 border-white/20 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-all"
                      onClick={() => onEdit(cat)}
                    >
                      <Edit className="w-4 h-4 md:mr-1.5" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 bg-white/50 dark:bg-black/50 border-white/40 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4 md:mr-1.5" />
                          <span className="hidden md:inline">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl sm:rounded-[2rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/90 dark:bg-black/90 shadow-2xl p-5 sm:p-10 mx-4 sm:mx-auto">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-bold">Confirm Deletion</AlertDialogTitle>
                          <hr className="border-black/20" />
                          <AlertDialogDescription className="text-base text-muted-foreground">
                            Delete &quot;{cat.name}&quot;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 gap-3">
                          <AlertDialogCancel className="h-11 rounded-xl bg-muted/50 border-0">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 border-0"
                            onClick={() => onDelete(cat.id, cat.name)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="px-4 sm:px-8 py-10 text-center text-muted-foreground text-sm font-medium">
                  No {title.toLowerCase()} categories.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CategoryListTab({ categories, onEdit, onDelete }: CategoryListTabProps) {
  const published = categories.filter(c => !c.parentId && c.status === "published")
  const drafts = categories.filter(c => !c.parentId && c.status === "draft")

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Manage Categories</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-semibold text-emerald-600">{published.length} published</span>
          {" · "}
          <span className="font-semibold text-amber-600">{drafts.length} drafts</span>
        </p>
      </div>

      <CategoryTable
        title="Published"
        color="text-emerald-700 dark:text-emerald-400"
        Icon={CheckCircle2}
        borderColor="border-emerald-500/20"
        bgColor="bg-emerald-500"
        headerBg="bg-emerald-500/5"
        items={published}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <CategoryTable
        title="Drafts"
        color="text-amber-700 dark:text-amber-400"
        Icon={CircleDashed}
        borderColor="border-amber-500/20"
        bgColor="bg-amber-500"
        headerBg="bg-amber-500/5"
        items={drafts}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}
