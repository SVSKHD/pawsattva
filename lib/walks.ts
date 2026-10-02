/**
 * City-wise places for /walks: parks, pet-friendly cafés and vet hospitals.
 *
 * Only add a place once someone from the team has checked it. Keep `petPolicy`
 * "unverified" until pet rules are confirmed on the ground; then set "allowed" or
 * "leash-only" and fill `verifiedOn` (YYYY-MM-DD) — the page shows this.
 * Vet hospitals and breeders show "Call before visiting" until `verifiedOn` is set; add
 * `phone`, `open24h` and `breeds` only from the place itself (breeders: check registration first).
 */

export type ParkType = "Lake promenade" | "Urban park" | "Garden" | "Lakeside outing"
export type CafeType = "Pet café" | "Pet-friendly café" | "Pet-friendly restaurant"
export type HospitalType = "Vet hospital" | "Vet clinic" | "Animal shelter clinic"
export type BreederType = "Registered breeder" | "Breed club" | "Kennel"
export type PlaceType = ParkType | CafeType | HospitalType | BreederType
export type PetPolicy = "unverified" | "allowed" | "leash-only"

export interface WalkSpot {
  id: string
  name: string
  area: string
  zone: string
  type: PlaceType
  summary: string
  /** Parks and cafés: whether pets are allowed inside */
  petPolicy?: PetPolicy
  verifiedOn?: string
  /** Hospitals and breeders: only from their own listing */
  phone?: string
  open24h?: boolean
  /** Breeders: the breeds they work with, e.g. ["Labrador Retriever", "Beagle"] */
  breeds?: string[]
  /** Search text for the Google Maps link; defaults to "<name>, <area>, <city>" */
  mapsQuery?: string
}

export interface WalkCity {
  id: string
  name: string
  parks: WalkSpot[]
  cafes: WalkSpot[]
  hospitals: WalkSpot[]
  breeders: WalkSpot[]
}

export type PlaceCategory = "parks" | "cafes" | "hospitals" | "breeders"

/** Sub-tabs shown inside every city, with a Maps search fallback while a list is empty */
export const PLACE_CATEGORIES: {
  id: PlaceCategory
  label: string
  heading: (city: string) => string
  emptyTitle: string
  emptyText: string
  mapsSearch: (city: string) => string
}[] = [
  {
    id: "parks",
    label: "Parks",
    heading: (city) => `Parks & walks in ${city}`,
    emptyTitle: "Parks are coming soon",
    emptyText: "We're checking walking spots in this city before listing them.",
    mapsSearch: (city) => `parks in ${city}`,
  },
  {
    id: "cafes",
    label: "Cafés",
    heading: (city) => `Pet-friendly cafés in ${city}`,
    emptyTitle: "Pet-friendly cafés are coming soon",
    emptyText: "We only list cafés after confirming they welcome pets. Until then, search nearby — and call ahead to check.",
    mapsSearch: (city) => `pet friendly cafe in ${city}`,
  },
  {
    id: "hospitals",
    label: "Hospitals",
    heading: (city) => `Vet hospitals in ${city}`,
    emptyTitle: "Vet hospital list is coming soon",
    emptyText: "We're verifying addresses, hours and emergency availability. In an emergency, search for the nearest open vet now and call before you leave.",
    mapsSearch: (city) => `24 hour veterinary hospital in ${city}`,
  },
  {
    id: "breeders",
    label: "Breeders",
    heading: (city) => `Breeder contacts in ${city}`,
    emptyTitle: "Breeder contacts are coming soon",
    emptyText:
      "We only list breeders after checking their registration and how they raise their animals. Meet the parents, ask for health and vaccination records — and consider adopting from a local shelter too.",
    mapsSearch: (city) => `KCI registered dog breeder in ${city}`,
  },
]

export const placeCount = (city: WalkCity) =>
  city.parks.length + city.cafes.length + city.hospitals.length + city.breeders.length

export const mapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

export const WALK_CITIES: WalkCity[] = [
  {
    id: "hyderabad",
    name: "Hyderabad",
    parks: [
      {
        id: "necklace-road",
        name: "Necklace Road",
        area: "Khairatabad",
        zone: "Central",
        type: "Lake promenade",
        summary: "Long, flat promenade along Hussain Sagar — easy to pace a walk with open lake views.",
        petPolicy: "unverified",
      },
      {
        id: "tank-bund",
        name: "Tank Bund",
        area: "Lower Tank Bund",
        zone: "Central",
        type: "Lake promenade",
        summary: "The historic road on the other side of Hussain Sagar with a wide walkway. Busy with traffic later in the day.",
        petPolicy: "unverified",
        mapsQuery: "Tank Bund Road, Hyderabad",
      },
      {
        id: "sanjeevaiah-park",
        name: "Sanjeevaiah Park",
        area: "Necklace Road",
        zone: "Central",
        type: "Urban park",
        summary: "Large green park on the shore of Hussain Sagar with shaded paths.",
        petPolicy: "unverified",
      },
      {
        id: "indira-park",
        name: "Indira Park",
        area: "Domalguda",
        zone: "Central",
        type: "Urban park",
        summary: "One of the city's older large parks, near Lower Tank Bund, with lawns and tree cover.",
        petPolicy: "unverified",
      },
      {
        id: "jalagam-vengal-rao-park",
        name: "Jalagam Vengal Rao Park",
        area: "Banjara Hills",
        zone: "West",
        type: "Urban park",
        summary: "Compact neighbourhood park on Road No. 1 with a walking loop.",
        petPolicy: "unverified",
      },
      {
        id: "durgam-cheruvu",
        name: "Durgam Cheruvu Lakefront",
        area: "Madhapur",
        zone: "West",
        type: "Lake promenade",
        summary: "Lakeside walkway beneath the cable bridge, close to the IT corridor.",
        petPolicy: "unverified",
        mapsQuery: "Durgam Cheruvu, Madhapur, Hyderabad",
      },
      {
        id: "botanical-garden-kothaguda",
        name: "Botanical Garden",
        area: "Kondapur",
        zone: "West",
        type: "Garden",
        summary: "Wooded garden with long trails off the Kothaguda–Gachibowli road.",
        petPolicy: "unverified",
        mapsQuery: "Botanical Garden Kothaguda Kondapur Hyderabad",
      },
      {
        id: "gandipet",
        name: "Gandipet (Osman Sagar)",
        area: "Gandipet",
        zone: "Outskirts",
        type: "Lakeside outing",
        summary: "Reservoir on the western edge of the city — better as a weekend outing than a daily walk.",
        petPolicy: "unverified",
        mapsQuery: "Osman Sagar Gandipet Hyderabad",
      },
      {
        id: "shamirpet-lake",
        name: "Shamirpet Lake",
        area: "Shamirpet",
        zone: "Outskirts",
        type: "Lakeside outing",
        summary: "Quiet lake north of the city with open surroundings; plan it as a half-day trip.",
        petPolicy: "unverified",
      },
    ],
    cafes: [],
    hospitals: [],
    breeders: [],
  },
  { id: "bengaluru", name: "Bengaluru", parks: [], cafes: [], hospitals: [], breeders: [] },
  { id: "mumbai", name: "Mumbai", parks: [], cafes: [], hospitals: [], breeders: [] },
  { id: "delhi-ncr", name: "Delhi NCR", parks: [], cafes: [], hospitals: [], breeders: [] },
  { id: "chennai", name: "Chennai", parks: [], cafes: [], hospitals: [], breeders: [] },
  { id: "pune", name: "Pune", parks: [], cafes: [], hospitals: [], breeders: [] },
]

export const mapsUrl = (spot: WalkSpot, city: WalkCity) =>
  mapsSearchUrl(spot.mapsQuery ?? `${spot.name}, ${spot.area}, ${city.name}`)
