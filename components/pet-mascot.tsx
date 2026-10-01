export type Mascot = "dog" | "cat"

interface PetMascotProps {
  mascot: Mascot
  size?: number
  /**
   * Prefix for the animatable part classes (`${prefix}-tail`, `-body`, `-leg-left`,
   * `-leg-right`, `-paw`) so each place that shows the mascot can animate it its own way.
   * Pivot points (viewBox units): tail 32 74 · legs 39 78 / 57 78 · waving paw 62 64.
   */
  animationPrefix?: string
  /** Draws the soft ground shadow under the mascot */
  groundShadow?: boolean
  className?: string
  label?: string
}

const PALETTE = {
  dog: {
    fur: "#EDA650",
    shade: "#C9792B",
    ear: "#A4561E",
    cream: "#FFEBCC",
    collar: "#E4475B",
    trim: "#3B2416",
  },
  cat: {
    fur: "#F7A94F",
    shade: "#DB7A2A",
    ear: "#E08A35",
    cream: "#FFF4E2",
    collar: "#14B8A6",
    trim: "#9A4A1C",
  },
} as const

/**
 * The Paw Sattva dog / cat mascot: a chibi, softly shaded pet drawn as inline SVG.
 * Depth comes from layered translucent highlights and shadows (no gradient ids),
 * so any number of mascots can share a page safely.
 */
export function PetMascot({
  mascot,
  size = 88,
  animationPrefix = "pet-guide",
  groundShadow = true,
  className,
  label,
}: PetMascotProps) {
  const isCat = mascot === "cat"
  const c = PALETTE[mascot]
  const part = (name: string) => `${animationPrefix}-${name}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      {groundShadow && <ellipse cx="48" cy="89" rx="24" ry="4.5" fill="rgba(15,23,42,0.16)" />}

      {/* Tail (behind the body) */}
      <g className={part("tail")}>
        {isCat ? (
          <>
            <path d="M33 76 C14 77 7 58 15 47 C19 41 26 43 25 50" fill="none" stroke={c.fur} strokeWidth="7.5" strokeLinecap="round" />
            <path d="M33 76 C14 77 7 58 15 47 C19 41 26 43 25 50" fill="none" stroke={c.shade} strokeWidth="7.5" strokeLinecap="butt" strokeDasharray="3.2 6.5" />
          </>
        ) : (
          <>
            <path d="M33 75 C20 73 14 62 19 50" fill="none" stroke={c.shade} strokeWidth="10" strokeLinecap="round" />
            <path d="M32 73 C22 71 17 62 20 52" fill="none" stroke={c.fur} strokeWidth="5" strokeLinecap="round" />
          </>
        )}
      </g>

      <g className={part("body")}>
        {/* Ears sit behind the head */}
        {isCat ? (
          <>
            <path d="M27 27 L29.5 9 Q31.5 6 34 8.5 L46 20 Z" fill={c.fur} />
            <path d="M69 27 L66.5 9 Q64.5 6 62 8.5 L50 20 Z" fill={c.fur} />
            <path d="M30.5 22 L31.8 12.5 L40 20 Z" fill="#FDA4AF" />
            <path d="M65.5 22 L64.2 12.5 L56 20 Z" fill="#FDA4AF" />
          </>
        ) : (
          <>
            <path d="M31 19 C19 21 14 38 20 48 C24 54 32 48 34 39 Z" fill={c.ear} />
            <path d="M65 19 C77 21 82 38 76 48 C72 54 64 48 62 39 Z" fill={c.ear} />
            <path d="M27 25 C22 30 21 37 22 42" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round" />
          </>
        )}

        {/* Body with soft 3D shading */}
        <ellipse cx="48" cy="70" rx="20" ry="17" fill={c.fur} />
        <ellipse cx="52.5" cy="77" rx="13.5" ry="9" fill={c.shade} opacity="0.45" />
        <ellipse cx="40" cy="63" rx="7.5" ry="4.5" fill="#FFFFFF" opacity="0.22" transform="rotate(-18 40 63)" />
        <ellipse cx="48" cy="74" rx="10" ry="10.5" fill={c.cream} />

        {/* Feet */}
        <g className={part("leg-left")}>
          <ellipse cx="39" cy="84" rx="6.8" ry="5.2" fill={c.cream} />
          <path d="M37 86.5 V84 M41 86.5 V84" stroke={c.shade} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        </g>
        <g className={part("leg-right")}>
          <ellipse cx="57" cy="84" rx="6.8" ry="5.2" fill={c.cream} />
          <path d="M55 86.5 V84 M59 86.5 V84" stroke={c.shade} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        </g>

        {/* Collar + tag / bell */}
        <path d="M32 54 Q48 64 64 54" fill="none" stroke={c.collar} strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="48" cy="62.5" r="3.7" fill="#FBBF24" />
        {isCat ? (
          <path d="M46.2 63.2 H49.8 M48 63.2 V65" stroke="#B45309" strokeWidth="0.9" strokeLinecap="round" />
        ) : (
          <path d="M46.6 62.2 L48 63.6 L49.4 62.2" fill="none" stroke="#B45309" strokeWidth="0.9" strokeLinecap="round" />
        )}
        <circle cx="46.8" cy="61.4" r="1" fill="#FFFFFF" opacity="0.8" />

        {/* Head */}
        <circle cx="48" cy="36" r="22" fill={c.fur} />
        <ellipse cx="53" cy="42.5" rx="15.5" ry="12" fill={c.shade} opacity="0.3" />
        <ellipse cx="39.5" cy="25" rx="9" ry="4.8" fill="#FFFFFF" opacity="0.3" transform="rotate(-22 39.5 25)" />

        {isCat ? (
          <path d="M42.5 17.5 L43.4 22.5 M48 15.5 V21.5 M53.5 17.5 L52.6 22.5" stroke={c.shade} strokeWidth="2.2" strokeLinecap="round" />
        ) : (
          <path d="M45 15.2 Q48 13.8 51 15.2 L52.2 33 Q48 35 43.8 33 Z" fill={c.cream} opacity="0.95" />
        )}

        {/* Muzzle */}
        {isCat ? (
          <>
            <ellipse cx="44.2" cy="45.5" rx="5.6" ry="4.6" fill={c.cream} />
            <ellipse cx="51.8" cy="45.5" rx="5.6" ry="4.6" fill={c.cream} />
            <ellipse cx="48" cy="49.5" rx="4" ry="2.8" fill={c.cream} />
          </>
        ) : (
          <ellipse cx="48" cy="45.5" rx="11.5" ry="8.5" fill={c.cream} />
        )}

        {/* Rosy cheeks */}
        <ellipse cx="33" cy="43.5" rx="4.6" ry="2.8" fill="#FB7185" opacity="0.5" />
        <ellipse cx="63" cy="43.5" rx="4.6" ry="2.8" fill="#FB7185" opacity="0.5" />

        {/* Happy smiling eyes ^ ^ */}
        <path d="M34.6 37.5 Q39 30.8 43.4 37.5" fill="none" stroke={c.trim} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M52.6 37.5 Q57 30.8 61.4 37.5" fill="none" stroke={c.trim} strokeWidth="2.8" strokeLinecap="round" />

        {/* Nose and big open smile with tongue */}
        {isCat ? (
          <>
            <path d="M45.8 42 Q48 41.2 50.2 42 L48 44.6 Z" fill="#F472B6" stroke="#F472B6" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M48 44.6 V46.4" stroke={c.trim} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M43.6 46.2 Q48 54 52.4 46.2 Q48 47.8 43.6 46.2 Z" fill="#7C2D12" stroke="#7C2D12" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M45.6 49.6 Q48 53 50.4 49.6 Q48 50.6 45.6 49.6 Z" fill="#FB7185" />
            <path d="M38 45 L28.5 43.2 M38 47.2 L28.5 48.4 M58 45 L67.5 43.2 M58 47.2 L67.5 48.4" stroke={c.trim} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
          </>
        ) : (
          <>
            <path d="M44.4 40.4 Q48 38.8 51.6 40.4 Q50.6 44 48 44.4 Q45.4 44 44.4 40.4 Z" fill={c.trim} />
            <ellipse cx="46.8" cy="40.8" rx="1.3" ry="0.6" fill="#FFFFFF" opacity="0.7" />
            <path d="M48 44.4 V46.2" stroke={c.trim} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M41.6 46 Q48 57 54.4 46 Q48 48.2 41.6 46 Z" fill={c.trim} stroke={c.trim} strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M44.6 50.6 Q48 56.4 51.4 50.6 Q48 51.8 44.6 50.6 Z" fill="#FB7185" />
          </>
        )}

        {/* Waving paw with toe beans */}
        <g className={part("paw")}>
          <path d="M62 65 Q70 61 72.5 51" fill="none" stroke={c.fur} strokeWidth="8.5" strokeLinecap="round" />
          <circle cx="72.8" cy="48" r="5.8" fill={c.cream} />
          <ellipse cx="72.8" cy="49.6" rx="2.2" ry="1.6" fill="#FB7185" opacity="0.85" />
          <circle cx="70.2" cy="45.6" r="1" fill="#FB7185" opacity="0.85" />
          <circle cx="72.8" cy="44.5" r="1" fill="#FB7185" opacity="0.85" />
          <circle cx="75.4" cy="45.6" r="1" fill="#FB7185" opacity="0.85" />
        </g>
      </g>
    </svg>
  )
}
