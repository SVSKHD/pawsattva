/** URL slug for a category name — /category/[slug] looks categories up by this, so links must use it too */
export function categorySlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const categoryHref = (name: string) => `/category/${categorySlug(name)}`
