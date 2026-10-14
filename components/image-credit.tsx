import type { ImageAttribution } from "@/lib/ai-drafts/types"
import { cn } from "@/lib/utils"

/** Credit/license line for a featured image. Renders nothing when there is nothing to credit. */
export function ImageCredit({ attribution, className }: { attribution: ImageAttribution | null | undefined; className?: string }) {
  if (!attribution) return null
  const credit = attribution.attributionText || (attribution.creator ? `Photo: ${attribution.creator}` : "")
  if (!credit && !attribution.license) return null
  const link = "underline underline-offset-2 hover:text-foreground"
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {credit}
      {attribution.sourceUrl && (
        <>{credit && " · "}<a href={attribution.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className={link}>Source</a></>
      )}
      {attribution.license && (
        <>
          {(credit || attribution.sourceUrl) && " · "}
          {attribution.licenseUrl
            ? <a href={attribution.licenseUrl} target="_blank" rel="noopener noreferrer nofollow" className={link}>{attribution.license}</a>
            : attribution.license}
        </>
      )}
    </p>
  )
}
