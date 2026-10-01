"use client"

import { Category } from "@/firebase/firestore"
import { CategoryTable } from "./CategoryTable"

interface SubCategoryListTabProps {
  categories: Category[]
  postCounts: Record<string, number>
  onCreate: () => void
  onEdit: (cat: Category) => void
  onDelete: (id: string, name: string) => void
}

export function SubCategoryListTab({ categories, postCounts, onCreate, onEdit, onDelete }: SubCategoryListTabProps) {
  return (
    <CategoryTable
      kind="sub-category"
      items={categories.filter((c) => c.parentId)}
      allCategories={categories}
      postCounts={postCounts}
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
}
