import "server-only"

import type { Metadata } from "next"
import { getPageSeoConfig, PageSeoKey } from "@/firebase/firestore"
import { constructMetadata } from "@/lib/metadata"

interface PageMetadataDefaults {
  title: string
  description: string
  keywords: string[]
  pathname: string
  image?: string
}

const isHealthyConfig = (title: string, description: string, keywords: string[]) =>
  title.trim().length >= 30 &&
  title.trim().length <= 60 &&
  description.trim().length >= 120 &&
  description.trim().length <= 160 &&
  keywords.length >= 3 &&
  keywords.length <= 10

export async function getManagedPageMetadata(
  key: PageSeoKey,
  defaults: PageMetadataDefaults
): Promise<Metadata> {
  try {
    const config = await getPageSeoConfig(key)
    if (config && isHealthyConfig(config.title, config.description, config.keywords)) {
      return constructMetadata({
        title: config.title,
        description: config.description,
        keywords: config.keywords,
        image: config.image || defaults.image,
        pathname: defaults.pathname,
      })
    }
  } catch (error) {
    console.error(`Unable to load managed SEO for ${key}:`, error)
  }

  return constructMetadata(defaults)
}
