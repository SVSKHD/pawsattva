"use client";

import * as React from "react";
import { Activity, Quote } from "lucide-react";

const quotes = [
  "Healthy pets should feel curious, playful and ready for their day.",
  "Good nutrition should support energy, movement and everyday joy.",
  "Wellness is more than a full bowl — it is how your pet feels and thrives.",
  "Feed for vitality, care for balance, and make every day more active.",
];

export function HomeHeroCopy() {
  const [quoteIndex, setQuoteIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setQuoteIndex((current) => (current + 1) % quotes.length);
        setVisible(true);
      }, 220);
    }, 4200);

    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <div className="space-y-5">
        <h1 className="text-5xl font-extrabold leading-[1.04] tracking-tight lg:text-7xl">
          We prefer pets{" "}
          <span className="relative inline-block text-orange-600">
            healthy & active
            <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-orange-300/70" />
          </span>
          , not lethargic.
        </h1>

        <div className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-orange-200/60 bg-orange-50/70 px-4 py-4 text-left shadow-sm backdrop-blur-sm lg:mx-0 dark:border-orange-500/15 dark:bg-orange-500/5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
            <Activity className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold leading-6 text-foreground/80 sm:text-base">
            Nutrition-led care for pets who should feel bright, engaged and full of life.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl lg:mx-0" aria-live="polite">
        <div className="flex min-h-[76px] items-start gap-3">
          <Quote className="mt-1 h-5 w-5 shrink-0 text-orange-500/70" />
          <p
            className={`text-lg font-medium italic leading-relaxed text-muted-foreground transition-all duration-300 sm:text-xl ${
              visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }`}
          >
            “{quotes[quoteIndex]}”
          </p>
        </div>

        <div className="mt-3 flex justify-center gap-1.5 lg:justify-start">
          {quotes.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setQuoteIndex(index);
                setVisible(true);
              }}
              aria-label={`Show wellness quote ${index + 1}`}
              aria-current={quoteIndex === index ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                quoteIndex === index ? "w-6 bg-orange-500" : "w-1.5 bg-foreground/15"
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
