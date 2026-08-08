import type { Metadata } from "next"
import type { ReactNode } from "react"
import { getManagedPageMetadata } from "@/lib/page-seo"

export async function generateMetadata(): Promise<Metadata> {
  return getManagedPageMetadata("blog", {
    title: "Blog — Pet Care Guides & Tips",
    description:
      "Read expert articles on pet nutrition, training, grooming, and wellness from the Paw Sattva community.",
    keywords: ["pet blog", "dog training tips", "cat health", "pet grooming", "pet articles"],
    pathname: "/blog",
  })
}

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
