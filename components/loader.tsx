import NextImage, { type StaticImageData } from "next/image"

interface AdminLoaderProps {
  img: string | StaticImageData
  title?: string
  subtitle?: string
}

/**
 * CSS-only loader shared by route transitions and protected screens. Keeping the
 * animation to transforms and opacity avoids JavaScript timers and costly mobile
 * blur repaints while still giving immediate, branded feedback.
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
      className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center overflow-hidden bg-[#fffaf4] px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] dark:bg-zinc-950 md:pb-5"
    >
      <div aria-hidden="true" className="loader-orb loader-orb-one" />
      <div aria-hidden="true" className="loader-orb loader-orb-two" />

      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-orange-200/70 bg-white p-6 text-center shadow-[0_24px_60px_rgba(124,45,18,0.14)] dark:border-white/10 dark:bg-zinc-900 sm:p-8">
        <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center">
          <div className="loader-logo-ring absolute h-28 w-28 rounded-full border border-orange-300/70" />
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-orange-100 bg-orange-50 p-3 shadow-[0_12px_30px_rgba(249,115,22,0.16)] dark:border-white/10 dark:bg-zinc-800">
            <NextImage
              src={img}
              alt="Paw Sattva logo"
              fill
              priority
              sizes="96px"
              className="loader-logo object-contain p-2"
            />
          </div>
        </div>

        <div aria-hidden="true" className="mb-4 flex h-7 items-center justify-center gap-5 text-lg text-orange-500">
          <span className="loader-step">🐾</span>
          <span className="loader-step [animation-delay:180ms]">🐾</span>
          <span className="loader-step [animation-delay:360ms]">🐾</span>
        </div>

        <p className="text-2xl font-[family-name:var(--font-pacifico)] text-orange-600 sm:text-3xl">
          Paw Sattva
        </p>
        <h2 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-5 text-zinc-500 dark:text-zinc-300">
          {subtitle}
        </p>

        <div aria-hidden="true" className="mt-6 h-2 overflow-hidden rounded-full bg-orange-100 dark:bg-white/10">
          <div className="loader-progress h-full w-2/5 rounded-full bg-gradient-to-r from-orange-600 via-amber-400 to-emerald-500" />
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700/65 dark:text-orange-200/70">
          Your tap worked • almost there
        </p>
      </div>
      <span className="sr-only">Loading, please wait.</span>
    </div>
  )
}
