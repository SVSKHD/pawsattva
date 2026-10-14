import { imageUrlProblem } from "@/lib/image-hosts"
import type { AiBlogDraft } from "./types"

type ReadinessInput = Pick<
  AiBlogDraft,
  "title" | "content" | "image" | "slug" | "categoryIds" | "authorId" | "imageAttribution" | "imageRightsConfirmed"
>

/**
 * Everything that must be true before an approved draft can become a public blog post.
 * The moderator UI shows these live; the publish route re-checks them on the server.
 */
export function publishBlockers(draft: ReadinessInput): string[] {
  const blockers: string[] = []
  if (!draft.slug) blockers.push("Set a URL slug.")
  if (!draft.categoryIds?.length) blockers.push("Choose at least one category.")
  if (!draft.authorId) blockers.push("Choose an author.")
  const imageProblem = imageUrlProblem(draft.image)
  if (!draft.image) blockers.push("Add a featured image.")
  else if (imageProblem) blockers.push(`Featured image: ${imageProblem}`)
  if (!draft.imageAttribution?.altText) blockers.push("Add alt text for the featured image.")
  if (draft.imageAttribution?.attributionRequired && !draft.imageAttribution.attributionText && !draft.imageAttribution.creator) {
    blockers.push("The image license requires a credit line.")
  }
  if (!draft.imageRightsConfirmed) blockers.push("Confirm you have checked the image license and may reuse it.")
  return blockers
}
