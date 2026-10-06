"use client";

import Image from "next/image";
import * as React from "react";
import { ShimmerImage } from "@/components/shimmer-image";
import { Cat, CheckCircle2, Dog, Heart, PawPrint } from "lucide-react";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const petSlides = [
  {
    src: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?q=85&w=1800&auto=format&fit=crop",
    alt: "German Shepherd dog outdoors",
    label: "German Shepherd",
    kind: "Dog",
    note: "Smart, active and highly trainable companions",
  },
  {
    src: "https://images.unsplash.com/photo-1567752881298-894bb81f9379?q=85&w=1800&auto=format&fit=crop",
    alt: "Rottweiler dog portrait",
    label: "Rottweiler",
    kind: "Dog",
    note: "Strong, loyal and deeply family-oriented",
  },
  {
    src: "https://images.unsplash.com/photo-1605568427561-40dd23c2acea?q=85&w=1800&auto=format&fit=crop",
    alt: "Siberian Husky dog outdoors",
    label: "Siberian Husky",
    kind: "Dog",
    note: "Energetic, expressive and built for movement",
  },
  {
    src: "https://images.unsplash.com/photo-1574158622682-e40e69881006?q=85&w=1800&auto=format&fit=crop",
    alt: "Relaxed domestic cat resting indoors",
    label: "Cats",
    kind: "Cat",
    note: "Calm routines, enrichment and balanced nutrition",
  },
  {
    src: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?q=85&w=1800&auto=format&fit=crop",
    alt: "Close-up portrait of a domestic cat",
    label: "Cat Care",
    kind: "Cat",
    note: "Everyday care for curious indoor companions",
  },
];

export function HomePetCarousel() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [selected, setSelected] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    if (!api) return;

    const sync = () => setSelected(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    api.on("reInit", sync);

    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  React.useEffect(() => {
    if (!api || hovered) return;

    const id = window.setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => window.clearInterval(id);
  }, [api, hovered]);

  const activePet = petSlides[selected] ?? petSlides[0];

  return (
    <div
      className="relative min-w-0 animate-in fade-in zoom-in-95 duration-1000"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-gradient-to-br from-orange-200/35 via-transparent to-emerald-200/30 blur-2xl dark:from-orange-500/10 dark:to-emerald-500/10" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
            <PawPrint className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Meet the pack</p>
            <p className="text-sm font-semibold text-muted-foreground">Dogs & cats at Paw Sattva</p>
          </div>
        </div>

        <div className="hidden rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm backdrop-blur-sm sm:block">
          Swipe to explore
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-background/30 p-2 shadow-2xl shadow-primary/10 backdrop-blur-sm sm:rounded-[2.5rem] sm:p-3">
        <Carousel
          setApi={setApi}
          opts={{ loop: true, align: "start" }}
          className="w-full"
          aria-label="Paw Sattva dog and cat carousel"
        >
          <CarouselContent className="ml-0">
            {petSlides.map((pet, index) => (
              <CarouselItem key={pet.label} className="pl-0">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.6rem] sm:aspect-square sm:rounded-[2rem] lg:h-[560px] lg:aspect-auto">
                  <ShimmerImage
                    src={pet.src}
                    alt={pet.alt}
                    fill
                    className="object-cover transition-transform duration-[1400ms] ease-out hover:scale-[1.035]"
                    priority={index === 0}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/10" />

                  <div className="absolute left-4 top-4 flex items-center gap-2 sm:left-6 sm:top-6">
                    <div className="flex items-center gap-2 rounded-full border border-white/30 bg-black/25 px-3 py-2 text-xs font-bold text-white backdrop-blur-xl">
                      {pet.kind === "Dog" ? <Dog className="h-4 w-4" /> : <Cat className="h-4 w-4" />}
                      {pet.kind}
                    </div>
                    <div className="hidden items-center gap-1.5 rounded-full border border-white/30 bg-black/25 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl sm:flex">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      Wellness first
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                    <div className="max-w-lg">
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                        Paw Sattva companion guide
                      </p>
                      <h3 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        {pet.label}
                      </h3>
                      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-white/80 sm:text-base">
                        {pet.note}
                      </p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="left-4 top-[46%] h-10 w-10 border-white/40 bg-black/30 text-white backdrop-blur-md hover:bg-black/55 hover:text-white sm:left-6" />
          <CarouselNext className="right-4 top-[46%] h-10 w-10 border-white/40 bg-black/30 text-white backdrop-blur-md hover:bg-black/55 hover:text-white sm:right-6" />
        </Carousel>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {petSlides.map((pet, index) => (
          <button
            key={pet.label}
            type="button"
            onClick={() => api?.scrollTo(index)}
            aria-label={`Show ${pet.label}`}
            aria-current={selected === index ? "true" : undefined}
            className={`group min-w-0 rounded-2xl border p-1.5 text-left transition-all duration-300 ${
              selected === index
                ? "border-orange-400 bg-orange-50 shadow-md shadow-orange-500/10 dark:bg-orange-500/10"
                : "border-border/70 bg-background/70 hover:border-orange-300"
            }`}
          >
            <div className="relative aspect-square overflow-hidden rounded-xl">
              <Image
                src={pet.src}
                alt=""
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="96px"
              />
            </div>
            <span className="mt-1.5 hidden truncate px-1 text-[10px] font-bold sm:block">
              {pet.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
            <Heart className="h-4 w-4 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{activePet.label}</p>
            <p className="truncate text-xs text-muted-foreground">{activePet.note}</p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-bold text-muted-foreground">
          {selected + 1}/{petSlides.length}
        </span>
      </div>
    </div>
  );
}
