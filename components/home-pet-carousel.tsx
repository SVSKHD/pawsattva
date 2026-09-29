"use client";

import Image from "next/image";
import * as React from "react";
import { CheckCircle2, Heart } from "lucide-react";
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
    src: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=85&w=1800&auto=format&fit=crop",
    alt: "Happy dog outdoors",
    label: "Dogs",
    note: "Nutrition, movement and everyday wellness",
  },
  {
    src: "https://images.unsplash.com/photo-1574158622682-e40e69881006?q=85&w=1800&auto=format&fit=crop",
    alt: "Relaxed cat resting indoors",
    label: "Cats",
    note: "Calm routines, enrichment and balanced care",
  },
  {
    src: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?q=85&w=1800&auto=format&fit=crop",
    alt: "Rabbit sitting in soft natural light",
    label: "Small Pets",
    note: "Gentle care for every companion",
  },
  {
    src: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?q=85&w=1800&auto=format&fit=crop",
    alt: "Colourful companion bird",
    label: "Birds",
    note: "Wellness guidance beyond cats and dogs",
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
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5200);

    return () => window.clearInterval(id);
  }, [api, hovered]);

  return (
    <div
      className="relative animate-in fade-in zoom-in-95 duration-1000"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        className="w-full"
        aria-label="Paw Sattva pet carousel"
      >
        <CarouselContent className="ml-0">
          {petSlides.map((pet, index) => (
            <CarouselItem key={pet.label} className="pl-0">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] shadow-2xl shadow-primary/10 sm:aspect-square lg:h-[600px] lg:aspect-auto">
                <Image
                  src={pet.src}
                  alt={pet.alt}
                  fill
                  className="object-cover transition-transform duration-[1400ms] ease-out hover:scale-[1.03]"
                  priority={index === 0}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/5 to-transparent" />

                <div className="absolute left-5 right-5 bottom-5 sm:left-8 sm:right-8 sm:bottom-8">
                  <div className="liquid-card flex items-center gap-4 p-4 sm:p-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg sm:h-12 sm:w-12">
                      <Heart className="h-5 w-5 fill-current sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold leading-tight sm:text-lg">{pet.label}</h4>
                        <span className="hidden h-1 w-1 rounded-full bg-foreground/30 sm:block" />
                        <span className="hidden text-xs font-semibold uppercase tracking-wider text-foreground/60 sm:block">
                          Paw Sattva care
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-foreground/70 sm:text-sm">{pet.note}</p>
                    </div>
                  </div>
                </div>

                <div className="absolute right-5 top-5 hidden sm:block sm:right-8 sm:top-8">
                  <div className="liquid-card flex items-center gap-3 p-4 backdrop-blur-2xl">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-bold uppercase tracking-wider">Whole-pet wellness</span>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="left-3 h-10 w-10 border-white/50 bg-black/25 text-white backdrop-blur-md hover:bg-black/45 hover:text-white sm:left-5" />
        <CarouselNext className="right-3 h-10 w-10 border-white/50 bg-black/25 text-white backdrop-blur-md hover:bg-black/45 hover:text-white sm:right-5" />
      </Carousel>

      <div className="mt-5 flex items-center justify-center gap-2" aria-label="Choose pet slide">
        {petSlides.map((pet, index) => (
          <button
            key={pet.label}
            type="button"
            onClick={() => api?.scrollTo(index)}
            aria-label={`Show ${pet.label}`}
            aria-current={selected === index ? "true" : undefined}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              selected === index
                ? "w-8 bg-primary"
                : "w-2.5 bg-foreground/20 hover:bg-foreground/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
