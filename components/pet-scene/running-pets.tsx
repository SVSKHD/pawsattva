import type { CSSProperties } from "react"

import { PET_PALETTES, type PetColors } from "@/components/pet-scene/scene-art"

const INK = "#3f2a1d"
/** One gallop stride, in seconds. Legs, bob, ground and dust all share it so they stay in step. */
const STRIDE = 0.42

const legStyle = (delay: number): CSSProperties => ({ animationDelay: `${-delay * STRIDE}s` })

/**
 * One leg pivoting at the hip or shoulder. `far` legs sit behind the body, a shade darker.
 * Drawn hanging down from (x, y); the CSS swings it from that top edge.
 */
function Leg({ x, y, length, width, color, phase }: { x: number; y: number; length: number; width: number; color: string; phase: number }) {
  return (
    <g className="paw-gpt-anim-leg" style={legStyle(phase)}>
      <rect x={x - width / 2} y={y} width={width} height={length} rx={width / 2} fill={color} />
      <ellipse cx={x + 1.5} cy={y + length - 1} rx={width / 2 + 1.5} ry={2.4} fill={color} />
    </g>
  )
}

/** A dog galloping to the right, drawn around its body centre. */
function RunningDog({ x, y, colors }: { x: number; y: number; colors: PetColors }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="paw-gpt-anim-bob">
        {/* far legs */}
        <Leg x={-17} y={2} length={19} width={7} color={colors.dark} phase={0.55} />
        <Leg x={15} y={2} length={19} width={7} color={colors.dark} phase={0.05} />
        {/* tail */}
        <path d="M-27 -5 Q-40 -12 -40 -25" stroke={colors.fur} strokeWidth={6} strokeLinecap="round" fill="none" className="paw-gpt-anim-tail" />
        {/* body */}
        <ellipse cx={0} cy={0} rx={30} ry={13} fill={colors.fur} />
        <ellipse cx={4} cy={5} rx={20} ry={6} fill={colors.light} opacity={0.75} />
        {/* near legs */}
        <Leg x={-21} y={3} length={20} width={7.5} color={colors.fur} phase={0.25} />
        <Leg x={19} y={3} length={20} width={7.5} color={colors.fur} phase={0.75} />
        {/* head */}
        <g transform="translate(31 -12)">
          <circle cx={0} cy={0} r={12} fill={colors.fur} />
          <ellipse cx={11} cy={4} rx={9} ry={6.5} fill={colors.light} />
          <ellipse cx={19} cy={2.5} rx={3} ry={2.4} fill={INK} />
          <path d="M12 8 q4 3 8 0" stroke={INK} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <circle cx={4} cy={-3} r={2.1} fill={INK} />
          <circle cx={4.7} cy={-3.7} r={0.7} fill="#fff" />
          <ellipse cx={-6} cy={-5} rx={5} ry={10} fill={colors.dark} className="paw-gpt-anim-ear" />
          {/* tongue */}
          <path d="M14 9 q1 6 4 5 q2 -1 0 -5" fill="#fb7185" />
        </g>
      </g>
    </g>
  )
}

/** A cat galloping to the right: slimmer, longer legs, pointed ears and a tall tail. */
function RunningCat({ x, y, colors }: { x: number; y: number; colors: PetColors }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="paw-gpt-anim-bob" style={{ animationDelay: `${-0.3 * STRIDE}s` }}>
        <Leg x={-15} y={1} length={17} width={5.5} color={colors.dark} phase={0.6} />
        <Leg x={13} y={1} length={17} width={5.5} color={colors.dark} phase={0.1} />
        <path d="M-24 -3 C-38 -6 -42 -24 -32 -32" stroke={colors.fur} strokeWidth={5} strokeLinecap="round" fill="none" className="paw-gpt-anim-tail" />
        <ellipse cx={0} cy={0} rx={26} ry={10} fill={colors.fur} />
        <ellipse cx={3} cy={4} rx={16} ry={4.5} fill={colors.light} opacity={0.7} />
        <Leg x={-18} y={2} length={18} width={6} color={colors.fur} phase={0.3} />
        <Leg x={16} y={2} length={18} width={6} color={colors.fur} phase={0.8} />
        <g transform="translate(27 -10)">
          <path d="M-8 -6 L-6 -18 L1 -9 Z" fill={colors.fur} />
          <path d="M3 -8 L9 -19 L11 -6 Z" fill={colors.fur} />
          <path d="M5 -9 L8.5 -15 L9.5 -8 Z" fill="#fda4af" />
          <circle cx={0} cy={0} r={10} fill={colors.fur} />
          <ellipse cx={7} cy={3} rx={5} ry={4} fill={colors.light} />
          <path d="M10.5 1.5 l2 1.5 l-2 1.5 z" fill="#fb7185" />
          <ellipse cx={3} cy={-2} rx={1.8} ry={2.4} fill={INK} />
          <path d="M8 4 l9 -1 M8 5.5 l9 1.5" stroke={INK} strokeWidth={0.7} strokeLinecap="round" opacity={0.6} />
        </g>
      </g>
    </g>
  )
}

/** A walk is the same stride, slowed down (and without kicking up dust). */
const WALK_STRIDE = 0.95

/**
 * One pet moving in place on a strip of ground, small enough to sit inside a pill
 * (Paw GPT's thinking indicator). `gait` "run" gallops, "walk" strolls. Pure CSS
 * (paw-gpt-anim-*), so it stops for reduced motion.
 */
export function MiniRunner({
  kind = "dog",
  colors,
  gait = "run",
  className,
}: {
  kind?: "dog" | "cat"
  colors?: PetColors
  gait?: "run" | "walk"
  className?: string
}) {
  const stride = gait === "walk" ? WALK_STRIDE : STRIDE
  return (
    <svg viewBox="-58 14 124 68" className={className} aria-hidden style={{ "--paw-stride": `${stride}s` } as CSSProperties}>
      {/* ground scrolling under the paws */}
      <line x1={-58} y1={76} x2={66} y2={76} stroke="#9a3412" strokeOpacity={0.2} strokeWidth={2} />
      <g className="paw-gpt-anim-ground">
        {Array.from({ length: 7 }, (_, index) => (
          <rect key={index} x={-58 + index * 28} y={79.5} width={12} height={2.5} rx={1.25} fill="#9a3412" opacity={0.2} />
        ))}
      </g>
      {gait === "run" && <circle cx={-52} cy={73} r={3.5} fill="#d6a77a" className="paw-gpt-anim-dust" />}
      {kind === "cat" ? (
        <RunningCat x={-4} y={55} colors={colors ?? PET_PALETTES.ginger} />
      ) : (
        <RunningDog x={-6} y={52} colors={colors ?? PET_PALETTES.golden} />
      )}
    </svg>
  )
}