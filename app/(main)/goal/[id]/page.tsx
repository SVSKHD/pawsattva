import type { Metadata } from "next"

import { constructMetadata } from "@/lib/metadata"
import { GoalDetailClient } from "./GoalDetailClient"

export const metadata: Metadata = constructMetadata({
  title: "Private Content Goal",
  description: "Admin-only PawSattva content goal progress.",
  noIndex: true,
})

export default async function GoalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <GoalDetailClient goalId={id} />
}
