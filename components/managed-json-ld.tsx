import { getPageSeoConfig, type PageSeoKey } from "@/firebase/firestore"

export async function ManagedJsonLd({ pageKey }: { pageKey: PageSeoKey }) {
  const config = await getPageSeoConfig(pageKey).catch(() => null)
  const schema = config?.schemaJson?.trim()
  if (!schema) return null

  try {
    const parsed = JSON.parse(schema)
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(parsed).replace(/</g, "\\u003c"),
        }}
      />
    )
  } catch {
    return null
  }
}
