import { Metadata } from "next";

export const siteConfig = {
  name: "Paw Sattva",
  description: "Wellness • Balance • Harmony for your pets. Premium pet care, nutrition guides, and community.",
  url: "https://pawsattva.com", // TODO: Update with actual production URL
  ogImage: "/og.png", // Ensure this exists in /public
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
}

export function constructMetadata({
  title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  icons = "/favicon.ico",
  noIndex = false,
}: MetadataProps = {}): Metadata {
  return {
    title: {
      default: title ? `${title} | ${siteConfig.name}` : siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    openGraph: {
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.name,
      description,
      images: [
        {
          url: image,
        },
      ],
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.name,
      description,
      images: [image],
      creator: "@pawsattva",
    },
    icons,
    // metadataBase: new URL(siteConfig.url), // Uncomment when URL is finalized
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
