import { NextRequest, NextResponse } from "next/server"
import { BREEDS, PetType } from "@/lib/pet-wellness"

type WikiSearchPage = {
  title?: string
  description?: string | null
  excerpt?: string
  thumbnail?: {
    url?: string
    width?: number
    height?: number
    mimetype?: string
  } | null
}

type WikiSearchResponse = {
  pages?: WikiSearchPage[]
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const stripHtml = (value = "") => value.replace(/<[^>]+>/g, " ")

const isPetType = (value: string | null): value is PetType =>
  value === "Dog" || value === "Cat"

const scorePage = (page: WikiSearchPage, breed: string, type: PetType) => {
  if (!page.thumbnail?.url) return -1

  const species = type.toLowerCase()
  const breedName = normalize(breed)
  const title = normalize(page.title ?? "")
  const context = normalize(`${page.description ?? ""} ${stripHtml(page.excerpt)}`)

  // Require explicit species/breed context so ambiguous searches such as
  // Boxer, Brittany, Papillon or Chihuahua cannot resolve to an unrelated page.
  const hasSpecies = context.includes(species)
  const hasBreedContext =
    context.includes("breed") ||
    context.includes("breeds") ||
    context.includes("breed of")

  if (!hasSpecies || !hasBreedContext) return -1

  let score = 0
  if (title === breedName) score += 100
  if (title.includes(breedName) || breedName.includes(title)) score += 65
  if (context.includes(breedName)) score += 25
  if (context.includes(`${species} breed`) || context.includes(`breed of ${species}`)) score += 25

  return score
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")
  const breed = request.nextUrl.searchParams.get("breed")?.trim()

  if (!isPetType(type) || !breed) {
    return NextResponse.json({ error: "Valid pet type and breed are required." }, { status: 400 })
  }

  const knownBreed = BREEDS[type].some((item) => item.name === breed)
  if (!knownBreed || breed === "Mixed/Other") {
    return NextResponse.json({ error: "No breed photo available." }, { status: 404 })
  }

  const query = `${breed} ${type.toLowerCase()} breed`
  const searchUrl = new URL("https://en.wikipedia.org/w/rest.php/v1/search/page")
  searchUrl.searchParams.set("q", query)
  searchUrl.searchParams.set("limit", "5")

  try {
    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PawSattva/1.0 (breed-picker)",
      },
      next: { revalidate: 2592000 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Breed image source unavailable." }, { status: 502 })
    }

    const data = await response.json() as WikiSearchResponse
    const candidates = (data.pages ?? [])
      .map((page) => ({ page, score: scorePage(page, breed, type) }))
      .filter((entry) => entry.score >= 65)
      .sort((a, b) => b.score - a.score)

    const thumbnail = candidates[0]?.page.thumbnail?.url
    if (!thumbnail) {
      return NextResponse.json(
        { error: "No validated breed photo found." },
        {
          status: 404,
          headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
        }
      )
    }

    const imageUrl = new URL(thumbnail.startsWith("//") ? `https:${thumbnail}` : thumbnail)
    if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "upload.wikimedia.org") {
      return NextResponse.json({ error: "Unexpected image host." }, { status: 502 })
    }

    const redirect = NextResponse.redirect(imageUrl, 307)
    redirect.headers.set("Cache-Control", "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800")
    return redirect
  } catch (error) {
    console.error("Unable to resolve verified breed photo:", error)
    return NextResponse.json({ error: "Breed image source unavailable." }, { status: 502 })
  }
}
