import { Metadata } from "next"
import { constructMetadata } from "@/lib/metadata"
import AdminPanel from "../admin-panel"

export const metadata: Metadata = constructMetadata({
  title: "Create Blog",
  description: "Prefilled PawSattva blog editor.",
  noIndex: true,
  pathname: "/admin/blog",
})

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || ""

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  return (
    <AdminPanel
      initialTab="blog"
      initialBlogPrefill={{
        title: first(params.title),
        description: first(params.description || params.excerpt),
        keywords: first(params.keywords),
        content: first(params.content),
        image: first(params.image),
      }}
    />
  )
}
