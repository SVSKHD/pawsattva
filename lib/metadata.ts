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
  pathname?: string; // e.g. "/blog" for canonical URL
}

export function constructMetadata({
  title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  icons = "/favicon.ico",
  noIndex = false,
  keywords = [],
  pathname,
}: MetadataProps = {}): Metadata {
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : siteConfig.name;

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
      url: pathname ? `${siteConfig.url}${pathname}` : siteConfig.url,
      title: fullTitle,
      description,
      siteName: siteConfig.name,
      images: [{ url: image, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
      creator: "@pawsattva",
    },
    icons,
    ...(pathname && {
      alternates: { canonical: `${siteConfig.url}${pathname}` },
    }),
    ...(noIndex && {
      robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    }),
  };
}
