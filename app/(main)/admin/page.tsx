import { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";
import AdminPanel from "./admin-panel";

export const metadata: Metadata = constructMetadata({
  title: "Admin Dashboard",
  description: "Secure content management for Paw Sattva.",
  noIndex: true,
  pathname: "/admin",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedTab = first(params.tab);
  const initialTab = requestedTab === "blog" ? "blog" : "blog-list";

  return (
    <AdminPanel
      initialTab={initialTab}
      initialBlogPrefill={
        initialTab === "blog"
          ? {
              template: first(params.template),
              title: first(params.title),
              description: first(params.description),
              excerpt: first(params.excerpt),
              keywords: first(params.keywords),
              seoTitle: first(params.seoTitle),
              seoDescription: first(params.seoDescription || params.description),
              seoKeywords: first(params.seoKeywords),
              content: first(params.content),
              image: first(params.image),
            }
          : undefined
      }
    />
  );
}
