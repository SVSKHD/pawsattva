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
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : siteConfig.name;

  const canonical = canonicalUrl || (pathname ? `${siteConfig.url}${pathname}` : undefined);
  const robotsValue = (robots || "").toLowerCase();
  const robotsNoIndex = noIndex || robotsValue.includes("noindex");
  const robotsNoFollow = robotsValue.includes("nofollow");

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: fullTitle,
      template: `%s | ${siteConfig.name}`,
    },
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
