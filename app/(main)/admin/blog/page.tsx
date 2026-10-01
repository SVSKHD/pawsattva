import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export default async function AdminBlogRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  next.set("tab", "blog");

  const template = first(params.template);
  const title = first(params.title);
  const description = first(params.description);
  const excerpt = first(params.excerpt);
  const keywords = first(params.keywords);
  const seoTitle = first(params.seoTitle);
  const seoDescription = first(params.seoDescription);
  const seoKeywords = first(params.seoKeywords);
  const content = first(params.content);
  const image = first(params.image);

  if (template) next.set("template", template);
  if (title) next.set("title", title);
  if (description) next.set("description", description);
  if (excerpt) next.set("excerpt", excerpt);
  if (keywords) next.set("keywords", keywords);
  if (seoTitle) next.set("seoTitle", seoTitle);
  if (seoDescription) next.set("seoDescription", seoDescription);
  if (seoKeywords) next.set("seoKeywords", seoKeywords);
  if (content) next.set("content", content);
  if (image) next.set("image", image);

  redirect(`/admin?${next.toString()}`);
}
