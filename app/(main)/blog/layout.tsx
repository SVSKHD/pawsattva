import { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Blog — Pet Care Guides & Tips",
  description:
    "Read expert articles on pet nutrition, training, grooming, and wellness from the Paw Sattva community.",
  keywords: ["pet blog", "dog training tips", "cat health", "pet grooming", "pet articles"],
  pathname: "/blog",
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
