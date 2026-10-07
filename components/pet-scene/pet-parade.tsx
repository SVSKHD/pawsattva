import type { CSSProperties } from "react"

import { PET_PALETTES, PetSprite } from "@/components/pet-scene/scene-art"

const palettes = Object.values(PET_PALETTES)

const ROWS = [
  { size: "h-16 sm:h-24", duration: 70, reverse: false, shift: 0 },
  { size: "h-12 sm:h-16", duration: 95, reverse: true, shift: 3 },
  { size: "h-20 sm:h-28", duration: 60, reverse: false, shift: 5 },
  { size: "h-14 sm:h-20", duration: 85, reverse: true, shift: 2 },
]

const PETS_PER_ROW = 9

/**
 * Rows of dogs and cats drifting across the page, meant to sit behind frosted glass.
 * Each row holds its pets twice and slides by half its width for a seamless loop.
 * Pets are drawn once with no inner animation, so only the row transforms move (GPU-cheap).
 */
export function PetParade({ sleepy = false, className }: { sleepy?: boolean; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 flex flex-col justify-around overflow-hidden ${className ?? ""}`}>
      {ROWS.map((row, rowIndex) => {
        const pets = Array.from({ length: PETS_PER_ROW }, (_, index) => {
          const n = index + row.shift
          return {
            kind: n % 2 === 0 ? ("dog" as const) : ("cat" as const),
            colors: palettes[(n * 3 + rowIndex) % palettes.length],
            // Uneven gaps look like a crowd rather than a pattern
            gap: ["mr-10", "mr-16", "mr-8", "mr-20", "mr-12"][n % 5],
          }
        })
        return (
          <div key={rowIndex} className="overflow-hidden">
            <div
              className="pet-parade-track"
              data-reverse={row.reverse ? "" : undefined}
              style={{ "--parade-duration": `${row.duration}s` } as CSSProperties}
            >
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-end">
                  {pets.map((pet, index) => (
                    <PetSprite
                      key={index}
                      kind={pet.kind}
                      colors={pet.colors}
                      sleepy={sleepy}
                      className={`${row.size} w-auto shrink-0 ${pet.gap} ${row.reverse ? "-scale-x-100" : ""}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
