"use client"

import { useId } from "react"

import type { DayPhase } from "@/components/pet-scene/day-phase"

export interface PetColors {
  fur: string
  dark: string
  light: string
}

/** Coat colours used across the pet illustrations. */
export const PET_PALETTES = {
  golden: { fur: "#f59e0b", dark: "#b45309", light: "#fef3c7" },
  cream: { fur: "#fde7c4", dark: "#92400e", light: "#fffbeb" },
  chocolate: { fur: "#92400e", dark: "#451a03", light: "#fcd34d" },
  charcoal: { fur: "#52525b", dark: "#27272a", light: "#e4e4e7" },
  ginger: { fur: "#fb923c", dark: "#c2410c", light: "#ffedd5" },
  silver: { fur: "#a8a29e", dark: "#57534e", light: "#f5f5f4" },
  snow: { fur: "#f4f4f5", dark: "#a1a1aa", light: "#ffffff" },
} satisfies Record<string, PetColors>

const INK = "#3f2a1d"

interface PetDrawingProps {
  x: number
  y?: number
  scale?: number
  colors: PetColors
  sleepy: boolean
  /** Skip the tail and blink animations (used for background crowds) */
  still?: boolean
}

/** A sitting dog drawn around (0, 0) = centre of its paws on the ground. */
function Dog({ x, y = 215, scale = 1, colors, sleepy, still = false }: PetDrawingProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M-42 -40 Q-70 -60 -72 -95"
        stroke={colors.fur}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
        className={sleepy || still ? undefined : "paw-gpt-anim-wag"}
        style={{ transformOrigin: "100% 100%" }}
      />
      <ellipse cx={-10} cy={-48} rx={46} ry={42} fill={colors.fur} />
      <ellipse cx={-6} cy={-38} rx={26} ry={27} fill={colors.light} />
      <rect x={-32} y={-40} width={18} height={38} rx={9} fill={colors.fur} />
      <rect x={-2} y={-40} width={18} height={38} rx={9} fill={colors.fur} />
      <ellipse cx={-23} cy={-3} rx={11} ry={6} fill={colors.light} />
      <ellipse cx={7} cy={-3} rx={11} ry={6} fill={colors.light} />

      <circle cx={0} cy={-112} r={40} fill={colors.fur} />
      <rect x={-26} y={-76} width={52} height={7} rx={3.5} fill="#ea580c" />
      <circle cx={0} cy={-66} r={4} fill="#facc15" />
      <ellipse cx={-36} cy={-110} rx={13} ry={27} transform="rotate(18 -36 -110)" fill={colors.dark} />
      <ellipse cx={36} cy={-110} rx={13} ry={27} transform="rotate(-18 36 -110)" fill={colors.dark} />
      <ellipse cx={0} cy={-96} rx={22} ry={16} fill={colors.light} />
      <circle cx={-24} cy={-100} r={5} fill="#fb7185" opacity={0.35} />
      <circle cx={24} cy={-100} r={5} fill="#fb7185" opacity={0.35} />

      {sleepy ? (
        <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none">
          <path d="M-19 -120 Q-14 -116 -9 -120" />
          <path d="M9 -120 Q14 -116 19 -120" />
        </g>
      ) : (
        <g className={still ? undefined : "paw-gpt-anim-blink"}>
          <circle cx={-14} cy={-120} r={4.5} fill="#1f2937" />
          <circle cx={14} cy={-120} r={4.5} fill="#1f2937" />
          <circle cx={-12.5} cy={-121.5} r={1.5} fill="#fff" />
          <circle cx={15.5} cy={-121.5} r={1.5} fill="#fff" />
        </g>
      )}

      {!sleepy && <ellipse cx={0} cy={-87} rx={4.5} ry={6.5} fill="#f87171" />}
      <ellipse cx={0} cy={-104} rx={7} ry={5} fill={INK} />
      <path d="M-7 -94 Q0 -88 7 -94" stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none" />
    </g>
  )
}

/** A sitting cat drawn around (0, 0) = centre of its paws on the ground. */
function Cat({ x, y = 215, scale = 1, colors, sleepy, still = false }: PetDrawingProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M28 -10 Q62 -20 60 -60 Q58 -80 44 -84"
        stroke={colors.fur}
        strokeWidth={11}
        strokeLinecap="round"
        fill="none"
        className={still ? undefined : "paw-gpt-anim-sway"}
        style={{ transformOrigin: "0% 100%" }}
      />
      <ellipse cx={0} cy={-40} rx={36} ry={38} fill={colors.fur} />
      <ellipse cx={0} cy={-30} rx={20} ry={24} fill={colors.light} />
      <rect x={-20} y={-36} width={15} height={34} rx={7.5} fill={colors.fur} />
      <rect x={5} y={-36} width={15} height={34} rx={7.5} fill={colors.fur} />
      <ellipse cx={-12.5} cy={-3} rx={9} ry={5} fill={colors.light} />
      <ellipse cx={12.5} cy={-3} rx={9} ry={5} fill={colors.light} />

      <path d="M-31 -108 L-26 -146 L-5 -126 Z" fill={colors.fur} />
      <path d="M31 -108 L26 -146 L5 -126 Z" fill={colors.fur} />
      <path d="M-25 -114 L-23 -137 L-11 -124 Z" fill="#fda4af" />
      <path d="M25 -114 L23 -137 L11 -124 Z" fill="#fda4af" />
      <circle cx={0} cy={-100} r={34} fill={colors.fur} />
      <g stroke={colors.dark} strokeWidth={3} strokeLinecap="round">
        <path d="M-7 -129 L-7 -120" />
        <path d="M0 -131 L0 -121" />
        <path d="M7 -129 L7 -120" />
      </g>
      <ellipse cx={0} cy={-84} rx={14} ry={9} fill={colors.light} />
      <circle cx={-21} cy={-88} r={4.5} fill="#fb7185" opacity={0.35} />
      <circle cx={21} cy={-88} r={4.5} fill="#fb7185" opacity={0.35} />

      {sleepy ? (
        <g stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none">
          <path d="M-17 -101 Q-12 -97 -7 -101" />
          <path d="M7 -101 Q12 -97 17 -101" />
        </g>
      ) : (
        <g className={still ? undefined : "paw-gpt-anim-blink"}>
          <ellipse cx={-12} cy={-102} rx={4.5} ry={6} fill="#1f2937" />
          <ellipse cx={12} cy={-102} rx={4.5} ry={6} fill="#1f2937" />
          <circle cx={-10.5} cy={-104} r={1.5} fill="#fff" />
          <circle cx={13.5} cy={-104} r={1.5} fill="#fff" />
        </g>
      )}

      <path d="M-4 -89 L4 -89 L0 -84 Z" fill="#f472b6" />
      <path d="M-6 -81 Q-3 -78 0 -81 Q3 -78 6 -81" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <g stroke={INK} strokeWidth={1.2} strokeLinecap="round" opacity={0.55}>
        <path d="M-14 -86 L-40 -90" />
        <path d="M-14 -82 L-40 -80" />
        <path d="M14 -86 L40 -90" />
        <path d="M14 -82 L40 -80" />
      </g>
    </g>
  )
}

/** One pet on its own, cropped tight, for crowds such as the login page parade. */
export function PetSprite({
  kind,
  colors,
  sleepy = false,
  className,
}: {
  kind: "dog" | "cat"
  colors: PetColors
  sleepy?: boolean
  className?: string
}) {
  return kind === "dog" ? (
    <svg viewBox="-90 -158 146 164" className={className} aria-hidden>
      <Dog x={0} y={0} colors={colors} sleepy={sleepy} still />
    </svg>
  ) : (
    <svg viewBox="-46 -152 122 158" className={className} aria-hidden>
      <Cat x={0} y={0} colors={colors} sleepy={sleepy} still />
    </svg>
  )
}

/** Two dogs and two cats sitting together; at night they doze off. */
export function PetFriendsArt({ sleepy, className }: { sleepy: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 430 230" className={className} role="img" aria-label={sleepy ? "Dogs and cats asleep" : "Dogs and cats sitting together"}>
      <ellipse cx={215} cy={218} rx={190} ry={10} fill="currentColor" opacity={0.08} />
      <Dog x={55} scale={0.6} sleepy={sleepy} colors={{ fur: "#fde7c4", dark: "#92400e", light: "#fffbeb" }} />
      <Dog x={160} sleepy={sleepy} colors={{ fur: "#f59e0b", dark: "#b45309", light: "#fef3c7" }} />
      <Cat x={240} scale={0.55} sleepy={sleepy} colors={{ fur: "#fb923c", dark: "#c2410c", light: "#ffedd5" }} />
      <Cat x={315} scale={0.95} sleepy={sleepy} colors={{ fur: "#a8a29e", dark: "#57534e", light: "#f5f5f4" }} />
      {sleepy && (
        <g fill="#818cf8" fontWeight={800} fontFamily="inherit">
          <text x={190} y={80} fontSize={18} className="paw-gpt-anim-zzz">z</text>
          <text x={340} y={95} fontSize={15} className="paw-gpt-anim-zzz" style={{ animationDelay: "1.2s" }}>z</text>
          <text x={80} y={120} fontSize={12} className="paw-gpt-anim-zzz" style={{ animationDelay: "0.6s" }}>z</text>
        </g>
      )}
    </svg>
  )
}

function Cloud({ x, y, scale = 1, fill, delay = "0s" }: { x: number; y: number; scale?: number; fill: string; delay?: string }) {
  return (
    <g className="paw-gpt-anim-drift" style={{ animationDelay: delay }}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
        <ellipse cx={0} cy={0} rx={22} ry={11} />
        <circle cx={-8} cy={-6} r={10} />
        <circle cx={8} cy={-9} r={13} />
      </g>
    </g>
  )
}

function Star({ x, y, size, delay }: { x: number; y: number; size: number; delay: string }) {
  const s = size
  return (
    <path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
      fill="#fde68a"
      className="paw-gpt-anim-twinkle"
      style={{ animationDelay: delay }}
    />
  )
}

/** Sun for the day, a setting sun for the evening, a moon and stars at night. */
export function SkyArt({ phase, className }: { phase: DayPhase; className?: string }) {
  // useId output can contain characters that break url(#…) references
  const id = `sky${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  if (phase === "night") {
    return (
      <svg viewBox="0 0 160 140" className={className} role="img" aria-label="Moon and stars">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0} />
          </radialGradient>
          <mask id={`${id}-crescent`}>
            <rect width={160} height={140} fill="#fff" />
            <circle cx={96} cy={52} r={28} fill="#000" />
          </mask>
        </defs>
        <circle cx={80} cy={64} r={56} fill={`url(#${id}-glow)`} />
        <g className="paw-gpt-anim-float">
          <g mask={`url(#${id}-crescent)`}>
            <circle cx={80} cy={64} r={32} fill="#fef3c7" />
            <circle cx={66} cy={76} r={4} fill="#fde68a" />
            <circle cx={60} cy={58} r={2.5} fill="#fde68a" />
          </g>
        </g>
        <Star x={128} y={30} size={6} delay="0s" />
        <Star x={24} y={34} size={5} delay="0.8s" />
        <Star x={138} y={96} size={4} delay="1.4s" />
        <Star x={30} y={104} size={3.5} delay="0.4s" />
        <Star x={112} y={122} size={3} delay="1.9s" />
        <Cloud x={40} y={118} scale={0.9} fill="#c7d2fe" delay="-3s" />
      </svg>
    )
  }

  const evening = phase === "evening"
  const [core, edge] =
    phase === "morning" ? ["#fef08a", "#fb923c"] : evening ? ["#fdba74", "#e11d48"] : ["#fef9c3", "#facc15"]
  const sunY = evening ? 98 : phase === "morning" ? 70 : 62

  return (
    <svg
      viewBox="0 0 160 140"
      className={className}
      role="img"
      aria-label={evening ? "Setting sun" : phase === "morning" ? "Rising sun" : "Bright sun"}
    >
      <defs>
        <radialGradient id={`${id}-sun`} cx="40%" cy="38%">
          <stop offset="0%" stopColor={core} />
          <stop offset="100%" stopColor={edge} />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={edge} stopOpacity={0.35} />
          <stop offset="100%" stopColor={edge} stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}-horizon`}>
          <rect width={160} height={evening ? 104 : 140} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-horizon)`}>
        <circle cx={80} cy={sunY} r={62} fill={`url(#${id}-glow)`} />
        <g className="paw-gpt-anim-spin">
          {Array.from({ length: 12 }, (_, index) => (
            <rect
              key={index}
              x={78}
              y={sunY - 56}
              width={4}
              height={14}
              rx={2}
              fill={edge}
              opacity={0.75}
              transform={`rotate(${index * 30} 80 ${sunY})`}
            />
          ))}
        </g>
        <circle cx={80} cy={sunY} r={30} fill={`url(#${id}-sun)`} />
      </g>
      {evening && <path d="M8 104 H152" stroke="#fb7185" strokeWidth={3} strokeLinecap="round" opacity={0.6} />}
      <Cloud x={34} y={evening ? 92 : 104} fill={evening ? "#fecdd3" : "#ffffff"} />
      <Cloud x={128} y={evening ? 70 : 40} scale={0.75} fill={evening ? "#fbcfe8" : "#ffffff"} delay="-4s" />
    </svg>
  )
}
