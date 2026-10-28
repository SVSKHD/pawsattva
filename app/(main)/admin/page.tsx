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
  // Any tab can be linked or reloaded (?tab=page-seo); the panel falls back to the blog list
  // when it isn't one this person's role can open.
  const initialTab = /^[a-z-]{1,40}$/.test(requestedTab) ? requestedTab : "blog-list";

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
