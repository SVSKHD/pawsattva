import type { Metadata } from "next";
import { Footprints, MapPinned, PawPrint, Sparkles } from "lucide-react";
import { getManagedPageMetadata } from "@/lib/page-seo";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const cities = [
  { id: "hyderabad", name: "Hyderabad" },
  { id: "bengaluru", name: "Bengaluru" },
  { id: "mumbai", name: "Mumbai" },
  { id: "delhi-ncr", name: "Delhi NCR" },
  { id: "chennai", name: "Chennai" },
  { id: "pune", name: "Pune" },
];

export async function generateMetadata(): Promise<Metadata> {
  return getManagedPageMetadata("walks", {
    title: "Pet Walks & Pet-Friendly Places",
    description:
      "Discover Paw Sattva's city-wise guide to pet walks and pet-friendly outdoor places. Location recommendations are coming soon.",
    keywords: ["pet walks", "dog walking places", "pet friendly places India", "Paw Sattva walks"],
    pathname: "/walks",
  });
}

function CityPlaceholder({ city }: { city: string }) {
  return (
    <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
      <div className="liquid-card relative overflow-hidden p-7 sm:p-10">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orange-200/45 blur-3xl dark:bg-orange-500/10" />
        <div className="relative">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
            <MapPinned className="h-7 w-7" />
          </div>
          <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">
            {city}
          </Badge>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Walk locations are coming next.
          </h2>
          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-muted-foreground sm:text-base">
            This city is ready in the Paw Sattva Walks structure. We can now add parks,
            lakes, trails, pet-friendly cafés and walking routes without changing the page layout.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Morning walks", "Open spaces", "Pet-friendly stops"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border/70 bg-background/60 px-4 py-4 text-sm font-semibold shadow-sm"
              >
                <PawPrint className="mb-2 h-4 w-4 text-orange-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="liquid-card flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Footprints className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold">Location list placeholder</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Real locations, distance, walk type and notes will appear here when we add the city data.
        </p>
        <div className="mt-6 w-full space-y-3" aria-hidden="true">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-2xl bg-muted/70" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WalksPage() {
  return (
    <div className="min-h-screen bg-background">
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
              A simple city-wise home for discovering enjoyable pet walks and pet-friendly places.
              We&apos;ll add verified locations next.
            </p>
          </div>

          <Tabs defaultValue={cities[0].id} className="mt-10 sm:mt-14">
            <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="mx-auto flex h-auto w-max min-w-full justify-start gap-2 rounded-2xl bg-muted/70 p-2 sm:min-w-0 sm:justify-center">
                {cities.map((city) => (
                  <TabsTrigger
                    key={city.id}
                    value={city.id}
                    className="h-10 min-w-max rounded-xl px-4 text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    {city.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="mt-7">
              {cities.map((city) => (
                <TabsContent key={city.id} value={city.id} className="mt-0">
                  <CityPlaceholder city={city.name} />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
