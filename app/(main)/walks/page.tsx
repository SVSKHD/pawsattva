import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  ArrowUpRight, Building2, Clock, Coffee, Dog, Footprints, MapPin, Navigation, Phone, ShieldAlert, ShieldCheck, Sparkles,
  Stethoscope, Trees, Waves,
} from "lucide-react";
import { getManagedPageMetadata } from "@/lib/page-seo";
import { ManagedJsonLd } from "@/components/managed-json-ld";
import { Tabs, TabsContent, TabsList, TabsScroller, TabsTrigger } from "@/components/ui/tabs";
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

/** Each place type gets its own tint, so the tabs and cards read at a glance */
const CATEGORY_ACCENT: Record<PlaceCategory, { blob: string; soft: string }> = {
  parks: {
    blob: "from-emerald-400 to-teal-500",
    soft: "from-emerald-500/12 via-emerald-500/5",
  },
  cafes: {
    blob: "from-amber-400 to-orange-500",
    soft: "from-amber-500/14 via-amber-500/5",
  },
  hospitals: {
    blob: "from-sky-400 to-blue-500",
    soft: "from-sky-500/12 via-sky-500/5",
  },
  breeders: {
    blob: "from-violet-400 to-fuchsia-500",
    soft: "from-violet-500/12 via-violet-500/5",
  },
};

/** Contact-style listings (call first) rather than places with pet-entry rules */
const isContactCategory = (category: PlaceCategory) => category === "hospitals" || category === "breeders";

const TYPE_ICON: Partial<Record<PlaceType, typeof Trees>> = {
  "Lake promenade": Waves,
  "Lakeside outing": Waves,
};

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const isVerified = (spot: WalkSpot, category: PlaceCategory) =>
  isContactCategory(category) ? Boolean(spot.verifiedOn) : Boolean(spot.petPolicy && spot.petPolicy !== "unverified");

function StatusBadge({ spot, category }: { spot: WalkSpot; category: PlaceCategory }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold";
  if (!isVerified(spot, category)) {
    return (
      <span className={`${base} bg-amber-500/10 text-amber-700 dark:text-amber-300`}>
        <ShieldAlert className="h-3.5 w-3.5" />
        {isContactCategory(category) ? "Call before visiting" : "Pet rules not yet verified"}
      </span>
    );
  }
  return (
    <span className={`${base} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {isContactCategory(category)
        ? `Details checked ${spot.verifiedOn}`
        : spot.petPolicy === "leash-only" ? "Pets on leash" : "Pets allowed"}
      {!isContactCategory(category) && spot.verifiedOn && <span className="font-normal opacity-70">· {spot.verifiedOn}</span>}
    </span>
  );
}

function SpotCard({ spot, city, category, index }: { spot: WalkSpot; city: WalkCity; category: PlaceCategory; index: number }) {
  const Icon = TYPE_ICON[spot.type] ?? CATEGORY_ICON[category];
  const accent = CATEGORY_ACCENT[category];
  return (
    <article
      className="liquid-card liquid-rise group flex h-full flex-col overflow-hidden transition-[translate,box-shadow] duration-500 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(24,24,27,0.04),0_14px_32px_-16px_rgba(24,24,27,0.22)]"
      style={{ "--i": index } as CSSProperties}
    >
      <div className={`flex items-start gap-3 bg-gradient-to-br ${accent.soft} to-transparent p-5 pb-4`}>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-gradient-to-br text-white shadow-sm transition-[border-radius,rotate] duration-500 group-hover:rotate-[-6deg] group-hover:rounded-[45%_55%_60%_40%/50%_45%_55%_50%] ${accent.blob}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{spot.type}</p>
          <h3 className="mt-0.5 text-base font-extrabold leading-snug">{spot.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {spot.area}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <p className="flex-1 text-sm leading-6 text-muted-foreground">{spot.summary}</p>

        {spot.breeds && spot.breeds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {spot.breeds.map((breed) => (
              <span key={breed} className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                {breed}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge spot={spot} category={category} />
          {spot.open24h && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
              <Clock className="h-3.5 w-3.5" /> Open 24×7
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2 border-t border-border/60 pt-4">
          <a
            href={mapsUrl(spot, city)}
            target="_blank"
            rel="noopener noreferrer"
            data-track="place_maps_click"
            data-track-city={city.id}
            data-track-category={category}
            data-track-place-id={spot.id}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 text-sm font-bold text-white shadow-[0_1px_2px_rgba(234,88,12,0.25)] transition-[scale,filter] duration-300 hover:brightness-105 active:scale-95"
          >
            <Navigation className="h-4 w-4" /> Directions
          </a>
          {spot.phone && (
            <a
              href={`tel:${spot.phone.replace(/\s+/g, "")}`}
              aria-label={`Call ${spot.name}: ${spot.phone}`}
              className="liquid-glass inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-bold transition-[scale] duration-300 active:scale-95"
            >
              <Phone className="h-4 w-4 text-orange-600" />
              <span className="hidden sm:inline">Call</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function CategoryList({ city, category }: { city: WalkCity; category: (typeof PLACE_CATEGORIES)[number] }) {
  const places = city[category.id];
  const Icon = CATEGORY_ICON[category.id];
  const accent = CATEGORY_ACCENT[category.id];

  if (places.length === 0) {
    return (
      <div className="liquid-card liquid-rise mx-auto flex max-w-xl flex-col items-center overflow-hidden p-10 text-center">
        <div
          aria-hidden
          className={`liquid-blob pointer-events-none absolute -top-16 left-1/2 -z-10 h-48 w-48 -translate-x-1/2 bg-gradient-to-br opacity-20 blur-2xl ${accent.blob}`}
        />
        <div className={`liquid-blob mb-5 flex h-16 w-16 items-center justify-center bg-gradient-to-br text-white shadow-sm ${accent.blob}`}>
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
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-sm font-bold text-white shadow-[0_1px_2px_rgba(234,88,12,0.25)] transition-[scale,filter] duration-300 hover:brightness-105 active:scale-95"
        >
          Search “{category.mapsSearch(city.name)}” on Maps
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  const zones = [...new Set(places.map((spot) => spot.zone))];
  const zoneId = (zone: string) => `${city.id}-${category.id}-${slug(zone)}`;
  const verified = places.filter((spot) => isVerified(spot, category.id)).length;

  return (
    <div className="space-y-8">
      <div className="liquid-card liquid-rise flex flex-col gap-4 overflow-hidden p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className={`liquid-blob flex h-14 w-14 shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-sm ${accent.blob}`}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">{category.heading(city.name)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <strong className="text-foreground">{places.length}</strong> {places.length === 1 ? "place" : "places"} across{" "}
              <strong className="text-foreground">{zones.length}</strong> {zones.length === 1 ? "zone" : "zones"}
              {verified > 0 && <> · <strong className="text-emerald-600 dark:text-emerald-400">{verified}</strong> verified</>}
            </p>
          </div>
        </div>

        {zones.length > 1 && (
          <nav aria-label="Jump to zone" className="flex flex-wrap gap-2">
            {zones.map((zone) => (
              <a
                key={zone}
                href={`#${zoneId(zone)}`}
                className="liquid-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-foreground/80 transition-[scale,color] duration-300 hover:text-orange-700 active:scale-95 dark:hover:text-orange-300"
              >
                {zone}
                <span className="tabular-nums text-muted-foreground">{places.filter((spot) => spot.zone === zone).length}</span>
              </a>
            ))}
          </nav>
        )}
      </div>

      {verified < places.length && (
        <p className="flex items-start gap-2.5 rounded-2xl border border-amber-300/50 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {category.id === "hospitals"
            ? "Hours and emergency services change — always call before you go."
            : category.id === "breeders"
              ? "Visit in person, meet the parents and ask for health and vaccination records before you commit."
              : "Pet rules change and differ by gate. Check at the entrance — keep your pet leashed and carry poop bags."}
        </p>
      )}

      {zones.map((zone) => {
        const inZone = places.filter((spot) => spot.zone === zone);
        return (
          <section key={zone} id={zoneId(zone)} aria-labelledby={`${zoneId(zone)}-title`} className="scroll-mt-44">
            <h3
              id={`${zoneId(zone)}-title`}
              className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"
            >
              <Footprints className="h-4 w-4 text-orange-500" />
              {zone}
              <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              <span className="tabular-nums">{inZone.length}</span>
            </h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {inZone.map((spot, index) => (
                <SpotCard key={spot.id} spot={spot} city={city} category={category.id} index={index} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CityPlaces({ city }: { city: WalkCity }) {
  return (
    <Tabs defaultValue="parks" className="gap-0">
      {/* Sticks under the header while you scroll a long list */}
      <div className="sticky top-3 z-30 -mx-4 mb-8 px-4 md:top-24">
        <TabsScroller className="liquid-glass rounded-[1.4rem] bg-white/85 dark:bg-zinc-900/85">
          <TabsList
            className="h-auto w-max min-w-full justify-start gap-1 rounded-[1.4rem] border-0 bg-transparent p-1.5 shadow-none backdrop-blur-none sm:justify-center"
            indicatorClassName="rounded-[1.05rem] !bg-gradient-to-r from-orange-500 to-amber-500 !ring-0 shadow-[0_1px_2px_rgba(234,88,12,0.3),0_4px_10px_-4px_rgba(234,88,12,0.35)]"
          >
            {PLACE_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICON[category.id];
              const count = city[category.id].length;
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="h-11 flex-none gap-2 rounded-[1.05rem] px-4 text-sm font-bold data-[state=active]:text-white dark:data-[state=active]:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                  <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground transition-colors [[data-state=active]>&]:bg-white/25 [[data-state=active]>&]:text-white">
                    {count || "Soon"}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </TabsScroller>
      </div>
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
  const all = cities.flatMap((city) => PLACE_CATEGORIES.flatMap((category) => city[category.id].map((spot) => ({ spot, category: category.id }))));
  const stats = [
    { label: "Places listed", value: all.length, icon: MapPin },
    { label: "Cities", value: cities.length, icon: Building2, note: `${cities.filter((city) => placeCount(city) > 0).length} live` },
    { label: "Zones", value: new Set(all.map(({ spot }) => spot.zone)).size, icon: Footprints },
    { label: "Place types", value: PLACE_CATEGORIES.length, icon: Sparkles, note: "parks to vets" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ManagedJsonLd pageKey="walks" />
      {/* No overflow-hidden here: it would stop the category tabs from sticking */}
      <section className="relative isolate px-4 pb-16 pt-10 md:pt-32 lg:pb-24">
        {/* Slowly morphing liquid shapes behind the glass */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="liquid-blob mobile-ambient-orb absolute -left-24 top-16 h-80 w-80 bg-gradient-to-br from-orange-300/50 to-amber-200/40 blur-3xl dark:from-orange-500/20 dark:to-amber-500/10" />
          <div className="liquid-blob mobile-ambient-orb absolute -right-24 top-48 h-96 w-96 bg-gradient-to-br from-emerald-200/50 to-sky-200/40 blur-3xl [animation-delay:-5s] dark:from-emerald-500/15 dark:to-sky-500/10" />
          <div className="liquid-blob mobile-ambient-orb absolute left-1/3 top-[34rem] h-72 w-72 bg-gradient-to-br from-violet-200/40 to-fuchsia-200/30 blur-3xl [animation-delay:-9s] dark:from-violet-500/10 dark:to-fuchsia-500/10" />
        </div>

        <div className="container relative mx-auto max-w-7xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
            <div className="liquid-rise text-center lg:text-left">
              <span className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
                <Sparkles className="h-4 w-4" />
                Paw Sattva Walks
              </span>
              <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Better walks,{" "}
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">city by city.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-muted-foreground sm:text-lg lg:mx-0">
                Parks to walk, cafés that welcome pets, vets nearby and trusted breeder contacts. Starting with Hyderabad — more cities soon.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:gap-4">
              {stats.map(({ label, value, icon: StatIcon, note }, index) => (
                <div key={label} className="liquid-card liquid-rise p-4 sm:p-5" style={{ "--i": index + 1 } as CSSProperties}>
                  <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-300">
                      <StatIcon className="h-4 w-4" />
                    </span>
                    {label}
                  </dt>
                  <dd className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">{value}</span>
                    {note && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <Tabs defaultValue={cities[0].id} className="mt-12 gap-0 sm:mt-16">
            <TabsScroller className="liquid-glass mx-auto w-fit max-w-full rounded-2xl">
              <TabsList className="flex h-auto w-max min-w-full justify-start gap-1 rounded-2xl border-0 bg-transparent p-1.5 shadow-none backdrop-blur-none">
                {cities.map((city) => {
                  const total = placeCount(city);
                  return (
                    <TabsTrigger
                      key={city.id}
                      value={city.id}
                      className="h-10 min-w-max flex-none gap-2 rounded-xl px-4 text-sm font-bold data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-300"
                    >
                      <MapPin className="h-4 w-4" />
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
            </TabsScroller>

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
