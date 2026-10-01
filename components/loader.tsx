import type { CSSProperties } from "react"
import NextImage, { type StaticImageData } from "next/image"

interface AdminLoaderProps {
  img: string | StaticImageData
  title?: string
  subtitle?: string
}

// Seamless, repeat-x grass tiles (SVG data URIs) so blades stay crisp at any screen width
function grassTile(width: number, height: number, blades: number, colors: string[], seed: number) {
  let paths = ""
  for (let i = 0; i < blades; i++) {
    const n = Math.sin((i + 1) * 12.9898 + seed) * 43758.5453
    const r = n - Math.floor(n)
    const x = (i + 0.5) * (width / blades) + (r - 0.5) * 4
    const h = height * (0.55 + r * 0.45)
    const lean = (r - 0.5) * 10
    const color = colors[i % colors.length]
    paths += `<path d="M${x - 2.6} ${height} Q${x + lean / 2} ${height - h / 2} ${x + lean} ${height - h} Q${x + lean / 2 + 1.4} ${height - h / 2} ${x + 2.6} ${height}Z" fill="${color}"/>`
  }
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`
  )}")`
}

const FLOWERS = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="26" viewBox="0 0 340 26">` +
    `<circle cx="40" cy="12" r="3.2" fill="#fbbf24"/><circle cx="40" cy="12" r="1.2" fill="#fff7ed"/>` +
    `<circle cx="150" cy="16" r="2.8" fill="#fb923c"/><circle cx="150" cy="16" r="1" fill="#fff7ed"/>` +
    `<circle cx="250" cy="10" r="3" fill="#f9a8d4"/><circle cx="250" cy="10" r="1.1" fill="#fff7ed"/>` +
    `<circle cx="305" cy="18" r="2.4" fill="#fde68a"/>` +
  `</svg>`
)}")`

const GRASS_BACK = grassTile(150, 46, 22, ["#86efac", "#a7f3d0", "#6ee7b7"], 3)
const GRASS_MID = grassTile(120, 36, 20, ["#4ade80", "#22c55e", "#34d399"], 7)
const GRASS_FRONT = grassTile(96, 24, 18, ["#16a34a", "#15803d", "#22c55e"], 11)

type Pet = "dog" | "cat"

type Runner = {
  pet: Pet
  lane: "back" | "front"
  dir: "left" | "right"
  run: number // seconds to cross the screen
  hop: number // seconds per gallop stride
  delay: number // negative so the meadow starts already busy
  rest: string // resting spot when motion is reduced
}

// Dogs and cats galloping across the meadow in both directions
const RUNNERS: Runner[] = [
  { pet: "dog", lane: "front", dir: "right", run: 8, hop: 0.34, delay: -2, rest: "12vw" },
  { pet: "cat", lane: "front", dir: "left", run: 10, hop: 0.3, delay: -6, rest: "58vw" },
  { pet: "dog", lane: "front", dir: "left", run: 12.5, hop: 0.38, delay: -10.5, rest: "82vw" },
  { pet: "cat", lane: "back", dir: "right", run: 13, hop: 0.32, delay: -3.5, rest: "34vw" },
  { pet: "dog", lane: "back", dir: "right", run: 15.5, hop: 0.36, delay: -11, rest: "70vw" },
]

/**
 * Minimal branded loader shared by route transitions and protected screens:
 * the logo inside a single orbiting arc, the wordmark and one status line,
 * above a little meadow where dogs and cats hop across the grass.
 * It fades in after a short delay so quick loads never flash it, and animates
 * only transform/opacity so it stays smooth on mobile.
 */
export default function AdminLoader({
  img,
  title = "Loading PawSattva",
  subtitle = "Preparing a calm pet wellness space for you...",
}: AdminLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${title}. ${subtitle}`}
      className="paw-loader fixed inset-0 z-[70] flex min-h-dvh items-center justify-center overflow-hidden bg-[#fffaf4] px-6 pb-36 dark:bg-zinc-950"
    >
      <div aria-hidden="true" className="paw-loader-glow pointer-events-none absolute inset-0" />

      <div className="paw-loader-content relative flex flex-col items-center text-center">
        <div aria-hidden="true" className="relative h-28 w-28">
          <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full">
            <circle cx="56" cy="56" r="52" fill="none" strokeWidth="2" className="stroke-orange-100 dark:stroke-white/10" />
            <circle
              cx="56"
              cy="56"
              r="52"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="82 245"
              className="paw-loader-arc stroke-orange-500"
            />
          </svg>
          <div className="paw-loader-logo absolute inset-3 overflow-hidden rounded-full bg-white shadow-[0_10px_30px_rgba(249,115,22,0.16)] dark:bg-zinc-900">
            <NextImage
              src={img}
              alt=""
              fill
              priority
              sizes="88px"
              className="object-contain p-2"
            />
          </div>
        </div>

        <p className="mt-6 text-2xl font-[family-name:var(--font-pacifico)] text-orange-600">
          Paw Sattva
        </p>
        <p className="mt-2 max-w-xs text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {title}
        </p>
      </div>

      {/* Meadow: back grass → back lane → mid grass + ground → front lane → front tufts */}
      <div aria-hidden="true" className="paw-meadow pointer-events-none absolute inset-x-0 bottom-0 h-40 pb-[env(safe-area-inset-bottom)]">
        <div className="paw-grass paw-grass-sway-slow absolute inset-x-0 bottom-[30px] h-[46px]" style={{ backgroundImage: GRASS_BACK }} />

        {RUNNERS.filter((r) => r.lane === "back").map((r, i) => (
          <RunnerSprite key={`back-${i}`} runner={r} />
        ))}

        <div className="paw-grass paw-grass-sway absolute inset-x-0 bottom-[16px] h-9" style={{ backgroundImage: GRASS_MID }} />
        <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-b from-green-500 to-green-600 dark:from-green-800 dark:to-green-900" />
        <div className="paw-grass absolute inset-x-0 bottom-[14px] h-[26px] opacity-90" style={{ backgroundImage: FLOWERS }} />

        {RUNNERS.filter((r) => r.lane === "front").map((r, i) => (
          <RunnerSprite key={`front-${i}`} runner={r} />
        ))}

        <div className="paw-grass paw-grass-sway-fast absolute inset-x-0 -bottom-1 h-6" style={{ backgroundImage: GRASS_FRONT }} />
      </div>

      <span className="sr-only">{subtitle}</span>

      <style>{`
        .paw-loader-glow {
          background:
            radial-gradient(40% 35% at 50% 42%, rgba(251, 146, 60, 0.14), transparent 70%),
            radial-gradient(30% 30% at 62% 55%, rgba(52, 211, 153, 0.08), transparent 70%),
            linear-gradient(to bottom, transparent 70%, rgba(187, 247, 208, 0.35));
        }
        .paw-loader-content {
          opacity: 0;
          animation: paw-loader-in 420ms ease-out 180ms forwards;
        }
        .paw-loader-arc {
          transform-origin: 56px 56px;
          animation: paw-loader-spin 1.1s cubic-bezier(0.5, 0.15, 0.5, 0.85) infinite;
        }
        .paw-loader-logo {
          animation: paw-loader-breathe 2.4s ease-in-out infinite;
        }

        .paw-meadow {
          opacity: 0;
          animation: paw-loader-in 500ms ease-out 260ms forwards;
        }
        .dark .paw-meadow {
          filter: brightness(0.62) saturate(0.85);
        }
        .paw-grass {
          background-repeat: repeat-x;
          background-position: bottom left;
          transform-origin: bottom center;
        }
        .paw-grass-sway-slow { animation: paw-grass-sway 5.5s ease-in-out infinite; }
        .paw-grass-sway { animation: paw-grass-sway 4.2s ease-in-out infinite -1.3s; }
        .paw-grass-sway-fast { animation: paw-grass-sway 3.4s ease-in-out infinite -0.6s; }

        .paw-runner {
          position: absolute;
          left: 0;
          will-change: transform;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .paw-runner[data-dir="right"] { animation-name: paw-run-right; }
        .paw-runner[data-dir="left"] { animation-name: paw-run-left; }
        .paw-runner[data-lane="back"] { bottom: 30px; --w: 54px; opacity: 0.92; }
        .paw-runner[data-lane="front"] { bottom: 6px; --w: 84px; }
        @media (min-width: 768px) {
          .paw-runner[data-lane="back"] { --w: 64px; }
          .paw-runner[data-lane="front"] { --w: 100px; }
        }
        .paw-runner svg { display: block; width: var(--w); height: calc(var(--w) * 0.625); overflow: visible; }
        /* The pets are drawn facing right; mirror the ones running left */
        .paw-runner[data-dir="left"] .paw-face { transform: scaleX(-1); }
        .paw-hop {
          display: block;
          animation: paw-hop var(--hop) ease-in-out infinite;
          filter: drop-shadow(0 4px 4px rgba(15, 23, 42, 0.14));
        }
        .paw-face { display: block; }
        /* Gallop: diagonal leg pairs swing in opposite phase, tail wags, head nods */
        .pet-leg-a { animation: pet-leg var(--hop) ease-in-out infinite; }
        .pet-leg-b { animation: pet-leg var(--hop) ease-in-out infinite reverse; }
        .pet-leg-back { transform-origin: 21px 22px; }
        .pet-leg-front { transform-origin: 41px 22px; }
        .pet-tail { animation: pet-tail calc(var(--hop) * 0.9) ease-in-out infinite; transform-origin: 16px 17px; }
        .pet-head { animation: pet-head var(--hop) ease-in-out infinite; transform-origin: 43px 18px; }
        .paw-shadow {
          position: absolute;
          left: 50%;
          bottom: -1px;
          width: 60%;
          height: 6px;
          margin-left: -30%;
          border-radius: 999px;
          background: rgba(20, 83, 45, 0.28);
          filter: blur(1.5px);
          animation: paw-shadow var(--hop) cubic-bezier(0.3, 0, 0.7, 1) infinite;
        }

        @keyframes paw-loader-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes paw-loader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes paw-loader-breathe {
          50% { transform: scale(1.03); }
        }
        @keyframes paw-grass-sway {
          0%, 100% { transform: skewX(0deg); }
          50% { transform: skewX(-4deg); }
        }
        @keyframes paw-run-right {
          from { transform: translateX(-14vw); }
          to { transform: translateX(110vw); }
        }
        @keyframes paw-run-left {
          from { transform: translateX(110vw); }
          to { transform: translateX(-14vw); }
        }
        @keyframes paw-hop {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes pet-leg {
          0%, 100% { transform: rotate(32deg); }
          50% { transform: rotate(-32deg); }
        }
        @keyframes pet-tail {
          0%, 100% { transform: rotate(-14deg); }
          50% { transform: rotate(18deg); }
        }
        @keyframes pet-head {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-5deg); }
        }
        @keyframes paw-shadow {
          0%, 100% { transform: scaleX(1); opacity: 1; }
          50% { transform: scaleX(0.8); opacity: 0.6; }
        }

        @media (prefers-reduced-motion: reduce) {
          .paw-loader-content, .paw-meadow { opacity: 1; animation: none; }
          .paw-loader-arc, .paw-loader-logo, .paw-grass, .paw-hop, .paw-shadow,
          .pet-leg-a, .pet-leg-b, .pet-tail, .pet-head { animation: none; }
          .paw-runner { animation: none; transform: translateX(var(--rest)); }
        }
      `}</style>
    </div>
  )
}

function RunnerSprite({ runner }: { runner: Runner }) {
  const style = {
    animationDuration: `${runner.run}s`,
    animationDelay: `${runner.delay}s`,
    "--hop": `${runner.hop}s`,
    "--rest": runner.rest,
  } as CSSProperties
  return (
    <div className="paw-runner" data-dir={runner.dir} data-lane={runner.lane} style={style}>
      <span className="paw-shadow" />
      <span className="paw-hop">
        <span className="paw-face">
          <RunningPet pet={runner.pet} />
        </span>
      </span>
    </div>
  )
}

const PET_COLORS = {
  dog: { fur: "#E9A04C", far: "#C9792B", ear: "#9A4E1A", cream: "#FFEBCC", accent: "#E4475B" },
  cat: { fur: "#F2A24E", far: "#D57527", ear: "#F2A24E", cream: "#FFF4E2", accent: "#14B8A6" },
} as const

// A clean side-view dog or cat mid-gallop (faces right; viewBox 64x40)
function RunningPet({ pet }: { pet: Pet }) {
  const c = PET_COLORS[pet]
  const isCat = pet === "cat"
  const legWidth = isCat ? 3.8 : 4.6

  return (
    <svg viewBox="0 0 64 40" aria-hidden="true">
      {/* Far legs (darker, behind the body) */}
      <g className="pet-leg-b pet-leg-back">
        <path d="M21 22 L19 35.5" stroke={c.far} strokeWidth={legWidth} strokeLinecap="round" />
      </g>
      <g className="pet-leg-a pet-leg-front">
        <path d="M41 22 L43 35.5" stroke={c.far} strokeWidth={legWidth} strokeLinecap="round" />
      </g>

      {/* Tail */}
      <g className="pet-tail">
        {isCat ? (
          <>
            <path d="M17 18 C9 17 6 10 10.5 4" fill="none" stroke={c.fur} strokeWidth="3.4" strokeLinecap="round" />
            <path d="M17 18 C9 17 6 10 10.5 4" fill="none" stroke={c.far} strokeWidth="3.4" strokeDasharray="1.6 3.4" />
          </>
        ) : (
          <path d="M17 17 C11 15 8 10 9.5 5" fill="none" stroke={c.fur} strokeWidth="4.2" strokeLinecap="round" />
        )}
      </g>

      {/* Body */}
      <ellipse cx="31" cy="20" rx={isCat ? 13.5 : 14.5} ry={isCat ? 7 : 8} fill={c.fur} />
      <ellipse cx="32" cy="24" rx="9" ry="3.4" fill={c.cream} />
      <ellipse cx="27" cy="15.6" rx="7" ry="2.4" fill="#FFFFFF" opacity="0.25" />
      {isCat && (
        <path d="M26 13.6 L25 17 M30.5 13 L29.8 16.8 M35 13.6 L34.6 17" stroke={c.far} strokeWidth="1.5" strokeLinecap="round" />
      )}

      {/* Near legs */}
      <g className="pet-leg-a pet-leg-back">
        <path d="M22 22 L23.5 35.5" stroke={c.fur} strokeWidth={legWidth} strokeLinecap="round" />
        <ellipse cx="23.7" cy="36" rx="2.6" ry="1.5" fill={c.cream} />
      </g>
      <g className="pet-leg-b pet-leg-front">
        <path d="M40 22 L38.5 35.5" stroke={c.fur} strokeWidth={legWidth} strokeLinecap="round" />
        <ellipse cx="38.5" cy="36" rx="2.6" ry="1.5" fill={c.cream} />
      </g>

      {/* Head */}
      <g className="pet-head">
        {isCat && (
          <>
            <path d="M40.2 9.5 L40.8 2 L45.6 7.2 Z" fill={c.ear} />
            <path d="M46.2 6.6 L49.4 0.8 L51 8.6 Z" fill={c.ear} />
            <path d="M47.2 6.4 L49 3.2 L49.8 7.6 Z" fill="#FDA4AF" />
          </>
        )}
        <circle cx={isCat ? 45.5 : 46.5} cy="12.5" r={isCat ? 6.8 : 7.6} fill={c.fur} />
        <ellipse cx={isCat ? 51 : 53.4} cy="15" rx={isCat ? 3.8 : 5.4} ry={isCat ? 2.9 : 3.7} fill={c.cream} />
        {isCat ? (
          <>
            <path d="M53.6 13.6 L55 13.6 L54.3 14.6 Z" fill="#F472B6" stroke="#F472B6" strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M51.4 16.8 Q52.8 18.4 54.4 16.6" fill="none" stroke="#7C2D12" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M52 15.2 L58 14 M52 16.2 L58 16.6" stroke="#9A4A1C" strokeWidth="0.5" strokeLinecap="round" opacity="0.6" />
          </>
        ) : (
          <>
            <path d="M42 6.2 Q37.6 11 40 17.6 Q43.6 15.4 45 9 Z" fill={c.ear} />
            <circle cx="58.4" cy="13.4" r="1.5" fill="#3B2416" />
            <path d="M51.6 17.4 Q54.4 20.4 57.6 17.6" fill="none" stroke="#3B2416" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M53.4 18.6 Q54.6 21.6 56 18.8 Z" fill="#FB7185" />
          </>
        )}
        {/* Happy closed eye */}
        <path
          d={isCat ? "M45.6 11.6 Q47.4 9.6 49.2 11.6" : "M47.8 10.8 Q49.8 8.6 51.8 10.8"}
          fill="none"
          stroke="#2B1A10"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <ellipse cx={isCat ? 47.6 : 49.6} cy="15.4" rx="1.7" ry="1" fill="#FB7185" opacity="0.5" />
        {/* Collar */}
        <path d={isCat ? "M40.6 15.6 Q42.4 19.4 45 19" : "M40.4 16.4 Q42.4 20.6 45.4 20"} fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}
