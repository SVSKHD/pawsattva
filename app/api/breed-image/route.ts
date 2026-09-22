import { NextRequest, NextResponse } from "next/server"

type BreedListResponse = {
  message: Record<string, string[]>
  status: string
}

type RandomImageResponse = {
  message: string
  status: string
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const aliases: Record<string, string> = {
  "german shepherd": "germanshepherd",
  "saint bernard": "stbernard",
  "great pyrenees": "pyrenees",
  "chesapeake bay retriever": "retriever/chesapeake",
  "flat coated retriever": "retriever/flatcoated",
  "jack russell terrier": "terrier/russell",
}

async function resolveBreedPath(label: string) {
  const normalized = normalize(label)
  if (aliases[normalized]) return aliases[normalized]

  const listResponse = await fetch("https://dog.ceo/api/breeds/list/all", {
    next: { revalidate: 86400 },
  })

  if (!listResponse.ok) return null

  const data = await listResponse.json() as BreedListResponse
  if (data.status !== "success") return null

  const candidates = new Map<string, string>()

  for (const [breed, subBreeds] of Object.entries(data.message)) {
    candidates.set(normalize(breed), breed)

    for (const subBreed of subBreeds) {
      const path = `${breed}/${subBreed}`
      candidates.set(normalize(`${subBreed} ${breed}`), path)
      candidates.set(normalize(`${breed} ${subBreed}`), path)
    }
  }

  return candidates.get(normalized) ?? null
}

export async function GET(request: NextRequest) {
  const breed = request.nextUrl.searchParams.get("breed")
  if (!breed) {
    return NextResponse.json({ error: "Breed is required." }, { status: 400 })
  }

  const breedPath = await resolveBreedPath(breed)
  if (!breedPath) {
    return NextResponse.json(
      { error: "No verified breed image source is available." },
      {
        status: 404,
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      }
    )
  }

  const encodedPath = breedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  const imageResponse = await fetch(
    `https://dog.ceo/api/breed/${encodedPath}/images/random`,
    { next: { revalidate: 604800 } }
  )

  if (!imageResponse.ok) {
    return NextResponse.json({ error: "Unable to load breed image." }, { status: 502 })
  }

  const imageData = await imageResponse.json() as RandomImageResponse
  if (imageData.status !== "success" || !imageData.message) {
    return NextResponse.json({ error: "Unable to load breed image." }, { status: 502 })
  }

  const response = NextResponse.redirect(imageData.message, 307)
  response.headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800")
  return response
}
