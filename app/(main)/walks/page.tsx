import type { Metadata } from "next";
import {
  ArrowUpRight, Clock, Coffee, Dog, Footprints, MapPin, Phone, ShieldAlert, ShieldCheck, Sparkles, Stethoscope, Trees, Waves,
} from "lucide-react";
import { getManagedPageMetadata } from "@/lib/page-seo";
import { ManagedJsonLd } from "@/components/managed-json-ld";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PLACE_CATEGORIES, WALK_CITIES, mapsSearchUrl, mapsUrl, placeCount,
  type PlaceCategory, type PlaceType, type WalkCity, type WalkSpot,
} from "@/lib/walks";
import { getApprovedVetHospitals } from "@/firebase/firestore";

// Approved hospitals are added from the admin panel, so refresh the page periodically.
export const revalidate = 300;

/** Static city data plus admin-approved vet hospitals from Firestore */
async function loadCities(): Promise<WalkCity[]> {
  try {
    const hospitals = await getApprovedVetHospitals();
    return WALK_CITIES.map((city) => {
      const extra: WalkSpot[] = hospitals
        .filter((hospital) => hospital.cityId === city.id)
        .map((hospital) => ({
          id: `vet-${hospital.id}`,
          name: hospital.name,
          area: hospital.area,
          zone: hospital.zone,
          type: hospital.type,
          summary: hospital.summary,
          phone: hospital.phone,
          open24h: hospital.open24h,
          verifiedOn: hospital.verifiedOn,
          mapsQuery: hospital.mapsQuery,
        }))
        .sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name));
      return extra.length ? { ...city, hospitals: [...city.hospitals, ...extra] } : city;
    });
  } catch (error) {
    console.error("Unable to load approved vet hospitals:", error);
    return WALK_CITIES;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return getManagedPageMetadata("walks", {
    title: "Pet Walks, Pet-Friendly Cafés & Vet Hospitals",
    description:
      "Paw Sattva's city-wise guide to parks, pet-friendly cafés and vet hospitals for you and your pet — starting with Hyderabad.",
    keywords: ["pet walks", "dog walking places", "dog walk Hyderabad", "pet friendly cafe Hyderabad", "vet hospital Hyderabad", "Paw Sattva walks"],
    pathname: "/walks",
  });
}

const CATEGORY_ICON: Record<PlaceCategory, typeof Trees> = {
  parks: Trees,
  cafes: Coffee,
  hospitals: Stethoscope,
  breeders: Dog,
};

/** Contact-style listings (call first) rather than places with pet-entry rules */
const isContactCategory = (category: PlaceCategory) => category === "hospitals" || category === "breeders";

const TYPE_ICON: Partial<Record<PlaceType, typeof Trees>> = {
  "Lake promenade": Waves,
  "Lakeside outing": Waves,
};

function StatusBadge({ spot, category }: { spot: WalkSpot; category: PlaceCategory }) {
  if (isContactCategory(category)) {
    return spot.verifiedOn ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <ShieldCheck className="h-3.5 w-3.5" /> Details checked {spot.verifiedOn}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
        <ShieldAlert className="h-3.5 w-3.5" /> Call before visiting
      </span>
    );
  }
  if (!spot.petPolicy || spot.petPolicy === "unverified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
        <ShieldAlert className="h-3.5 w-3.5" /> Pet rules not yet verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
      <ShieldCheck className="h-3.5 w-3.5" />
      {spot.petPolicy === "leash-only" ? "Pets on leash" : "Pets allowed"}
      {spot.verifiedOn && <span className="font-normal opacity-70">· checked {spot.verifiedOn}</span>}
    </span>
  );
}

function SpotCard({ spot, city, category }: { spot: WalkSpot; city: WalkCity; category: PlaceCategory }) {
  const Icon = TYPE_ICON[spot.type] ?? CATEGORY_ICON[category];
  return (
    <article className="liquid-card flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-300">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug">{spot.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {spot.area} · {spot.type}
          </p>
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{spot.summary}</p>
      {spot.breeds && spot.breeds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {spot.breeds.map((breed) => (
            <span key={breed} className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
              {breed}
            </span>
          ))}
        </div>
      )}
      {(spot.phone || spot.open24h) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {spot.open24h && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300">
              <Clock className="h-3.5 w-3.5" /> Open 24×7
            </span>
          )}
          {spot.phone && (
            <a href={`tel:${spot.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 hover:bg-muted/70">
              <Phone className="h-3.5 w-3.5" /> {spot.phone}
            </a>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge spot={spot} category={category} />
        <a
          href={mapsUrl(spot, city)}
          target="_blank"
          rel="noopener noreferrer"
          data-track="place_maps_click"
          data-track-city={city.id}
          data-track-category={category}
          data-track-place-id={spot.id}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          Open in Maps
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}

function CategoryList({ city, category }: { city: WalkCity; category: (typeof PLACE_CATEGORIES)[number] }) {
  const places = city[category.id];
  const Icon = CATEGORY_ICON[category.id];

  if (places.length === 0) {
    return (
      <div className="liquid-card mx-auto flex max-w-xl flex-col items-center p-10 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
          <Icon className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-extrabold tracking-tight">{category.emptyTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.emptyText}</p>
        <a
          href={mapsSearchUrl(category.mapsSearch(city.name))}
          target="_blank"
          rel="noopener noreferrer"
          data-track="place_maps_click"
          data-track-city={city.id}
          data-track-category={category.id}
          data-track-place-id="maps-search"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600"
        >
          Search “{category.mapsSearch(city.name)}” on Maps
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  const zones = [...new Set(places.map((spot) => spot.zone))];
  const needsCheck = isContactCategory(category.id)
    ? places.some((spot) => !spot.verifiedOn)
    : places.some((spot) => !spot.petPolicy || spot.petPolicy === "unverified");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">{category.heading(city.name)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {places.length} {places.length === 1 ? "place" : "places"} across {zones.length} {zones.length === 1 ? "zone" : "zones"}
          </p>
        </div>
        {needsCheck && (
          <p className="flex max-w-md items-start gap-2 rounded-2xl border border-amber-300/50 bg-amber-50/70 px-4 py-2.5 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {category.id === "hospitals"
              ? "Hours and emergency services change — always call before you go."
              : category.id === "breeders"
                ? "Visit in person, meet the parents and ask for health and vaccination records before you commit."
                : "Pet rules change and differ by gate. Check at the entrance — keep your pet leashed and carry poop bags."}
          </p>
        )}
      </div>

      {zones.map((zone) => (
        <section key={zone} aria-labelledby={`${city.id}-${category.id}-${zone}`}>
          <h3
            id={`${city.id}-${category.id}-${zone}`}
            className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"
          >
            <Footprints className="h-4 w-4 text-orange-500" />
            {zone}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places
              .filter((spot) => spot.zone === zone)
              .map((spot) => (
                <SpotCard key={spot.id} spot={spot} city={city} category={category.id} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CityPlaces({ city }: { city: WalkCity }) {
  return (
    <Tabs defaultValue="parks" className="gap-0">
      <TabsList variant="line" className="mb-7 h-auto w-full justify-start gap-1 overflow-x-auto border-b border-border/70 p-0">
        {PLACE_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICON[category.id];
          const count = city[category.id].length;
          return (
            <TabsTrigger key={category.id} value={category.id} className="h-11 flex-none gap-2 px-4 text-sm font-bold">
              <Icon className="h-4 w-4" />
              {category.label}
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                {count || "Soon"}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      {PLACE_CATEGORIES.map((category) => (
        <TabsContent key={category.id} value={category.id} className="mt-0">
          <CategoryList city={city} category={category} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default async function WalksPage() {
  const cities = await loadCities();

  return (
    <div className="min-h-screen bg-background">
      <ManagedJsonLd pageKey="walks" />
      <section className="relative overflow-hidden px-4 pb-14 pt-28 sm:pt-32 lg:pb-20">
        <div className="pointer-events-none absolute left-[-8rem] top-16 h-80 w-80 rounded-full bg-orange-200/40 blur-[110px] dark:bg-orange-500/10" />
        <div className="pointer-events-none absolute right-[-8rem] top-40 h-80 w-80 rounded-full bg-emerald-200/35 blur-[110px] dark:bg-emerald-500/10" />

        <div className="container relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-5 rounded-full border-none bg-orange-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              <Sparkles className="mr-2 h-4 w-4" />
              Paw Sattva Walks
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Better walks, city by city.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-muted-foreground sm:text-lg">
              Parks to walk, cafés that welcome pets, vets nearby and trusted breeder contacts. Starting with Hyderabad — more cities soon.
            </p>
          </div>

          <Tabs defaultValue={cities[0].id} className="mt-10 sm:mt-14">
            <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="mx-auto flex h-auto w-max min-w-full justify-start gap-2 rounded-2xl bg-muted/70 p-2 sm:min-w-0 sm:justify-center">
                {cities.map((city) => {
                  const total = placeCount(city);
                  return (
                    <TabsTrigger
                      key={city.id}
                      value={city.id}
                      className="h-10 min-w-max gap-2 rounded-xl px-4 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    >
                      {city.name}
                      {total > 0 ? (
                        <span className="rounded-full bg-orange-500/15 px-1.5 text-[11px] tabular-nums text-orange-700 dark:text-orange-300">
                          {total}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Soon</span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <div className="mt-8">
              {cities.map((city) => (
                <TabsContent key={city.id} value={city.id} className="mt-0">
                  <CityPlaces city={city} />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
