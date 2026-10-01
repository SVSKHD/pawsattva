"use client"

import { Category } from "@/firebase/firestore"
import { CategoryTable } from "./CategoryTable"

interface CategoryListTabProps {
  categories: Category[]
  postCounts: Record<string, number>
  onCreate: () => void
  onEdit: (cat: Category) => void
  onDelete: (id: string, name: string) => void
}

export function CategoryListTab({ categories, postCounts, onCreate, onEdit, onDelete }: CategoryListTabProps) {
  return (
    <CategoryTable
      kind="category"
      items={categories.filter((c) => !c.parentId)}
      allCategories={categories}
      postCounts={postCounts}
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )
}
