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

  const title = first(params.title);
  const description = first(params.description || params.excerpt);
  const keywords = first(params.keywords);
  const content = first(params.content);
  const image = first(params.image);

  if (title) next.set("title", title);
  if (description) next.set("description", description);
  if (keywords) next.set("keywords", keywords);
  if (content) next.set("content", content);
  if (image) next.set("image", image);

  redirect(`/admin?${next.toString()}`);
}
