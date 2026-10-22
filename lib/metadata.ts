import { Metadata } from "next";

export const siteConfig = {
  name: "Paw Sattva",
  description:
    "Wellness • Balance • Harmony for your pets. Premium pet care, nutrition guides, and community.",
  url: "https://pawsattva.com",
  ogImage: "/og.png",
  links: {
    instagram: "https://instagram.com/pawsattva",
    facebook: "https://facebook.com/pawsattva",
  },
};

/**
 * "<title> | Paw Sattva" exactly once. The root layout's title template already appends the
 * brand, so pages that build the full title themselves must use this (`absolute`) or it doubles.
 * A brand suffix already typed into an admin SEO title is dropped first.
 */
export function brandedTitle(title: string) {
  const bare = title.replace(/\s*[|–—-]\s*paw\s?sattva\s*$/i, "").trim() || siteConfig.name;
  return { absolute: bare === siteConfig.name ? bare : `${bare} | ${siteConfig.name}` };
}

interface MetadataProps {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
  keywords?: string[];
  pathname?: string;
  canonicalUrl?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

export function constructMetadata({
  title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  icons = "/favicon.ico",
  noIndex = false,
  keywords = [],
  pathname,
  canonicalUrl,
  robots,
  ogTitle,
  ogDescription,
  ogImage,
  twitterTitle,
  twitterDescription,
  twitterImage,
}: MetadataProps = {}): Metadata {
  // A page's own title gets the brand exactly once (even if an admin SEO title already ends
  // with it); only the root default sets the template that child pages fill in.
  const fullTitle = title ? brandedTitle(title).absolute : siteConfig.name;

  const canonical = canonicalUrl || (pathname ? `${siteConfig.url}${pathname}` : undefined);
  const robotsValue = (robots || "").toLowerCase();
  const robotsNoIndex = noIndex || robotsValue.includes("noindex");
  const robotsNoFollow = robotsValue.includes("nofollow");

  return {
    metadataBase: new URL(siteConfig.url),
    title: title
      ? { absolute: fullTitle }
      : { default: fullTitle, template: `%s | ${siteConfig.name}` },
    description,
    keywords: [
      "pet care",
      "pet nutrition",
      "dog food",
      "cat food",
      "pet wellness",
      "Paw Sattva",
      ...keywords,
    ],
    authors: [{ name: siteConfig.name, url: siteConfig.url }],
    creator: siteConfig.name,
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: canonical || siteConfig.url,
      title: ogTitle || fullTitle,
      description: ogDescription || description,
      siteName: siteConfig.name,
      images: [{ url: ogImage || image, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: twitterTitle || fullTitle,
      description: twitterDescription || description,
      images: [twitterImage || ogImage || image],
      creator: "@pawsattva",
    },
    icons,
    ...(canonical && {
      alternates: { canonical },
    }),
    ...((robots || noIndex) && {
      robots: {
        index: !robotsNoIndex,
        follow: !robotsNoFollow,
        googleBot: { index: !robotsNoIndex, follow: !robotsNoFollow },
      },
    }),
  };
}
