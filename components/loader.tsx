import NextImage, { type StaticImageData } from "next/image"
import { Cat, Dog, Sparkles } from "lucide-react"

interface AdminLoaderProps {
  img: string | StaticImageData
  title?: string
  subtitle?: string
}

/**
 * CSS-first branded loader shared by route transitions and protected screens.
 * Uses transform/opacity animation only so it stays smooth on mobile.
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
      className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center overflow-hidden bg-[#fffaf4] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] dark:bg-zinc-950 md:pb-5"
    >
      <div aria-hidden="true" className="loader-orb loader-orb-one" />
      <div aria-hidden="true" className="loader-orb loader-orb-two" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-orange-200/70 bg-white/95 p-5 text-center shadow-[0_28px_70px_rgba(124,45,18,0.15)] dark:border-white/10 dark:bg-zinc-900/95 sm:p-8">
        <div className="relative mx-auto mb-5 flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44">
          <div className="loader-logo-ring absolute inset-0 rounded-full border border-orange-300/80" />
          <div className="loader-logo-ring-secondary absolute inset-3 rounded-full border border-emerald-300/70" />
          <div className="relative h-32 w-32 overflow-hidden rounded-full border border-orange-100 bg-white p-1 shadow-[0_14px_36px_rgba(249,115,22,0.18)] dark:border-white/10 dark:bg-zinc-800 sm:h-36 sm:w-36">
            <NextImage
              src={img}
              alt="Paw Sattva logo"
              fill
              priority
              sizes="144px"
              className="loader-logo object-contain p-1.5"
            />
          </div>
        </div>

        <div aria-hidden="true" className="relative mx-auto mb-5 h-16 max-w-xs overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 via-white to-emerald-50 ring-1 ring-orange-100 dark:from-orange-500/10 dark:via-white/5 dark:to-emerald-500/10 dark:ring-white/10">
          <div className="loader-runner-track absolute inset-x-4 bottom-3 h-px bg-gradient-to-r from-orange-200 via-amber-200 to-emerald-200 dark:opacity-40" />
          <div className="loader-dog-run absolute left-2 top-3 flex items-center gap-1 text-orange-600">
            <Dog className="h-7 w-7" strokeWidth={2.2} />
            <span className="text-[10px] font-black uppercase tracking-[0.14em]">zoom</span>
          </div>
          <div className="loader-cat-run absolute right-2 top-7 flex items-center gap-1 text-emerald-600">
            <Cat className="h-6 w-6" strokeWidth={2.2} />
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        <p className="text-3xl font-[family-name:var(--font-pacifico)] text-orange-600 sm:text-4xl">
          Paw Sattva
        </p>
        <h2 className="mt-4 text-lg font-extrabold text-zinc-900 dark:text-white">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-300">
          {subtitle}
        </p>

        <div aria-hidden="true" className="mt-6 h-2.5 overflow-hidden rounded-full bg-orange-100 dark:bg-white/10">
          <div className="loader-progress h-full w-2/5 rounded-full bg-gradient-to-r from-orange-600 via-amber-400 to-emerald-500" />
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700/65 dark:text-orange-200/70">
          Your tap worked • pets are on the way
        </p>
      </div>
      <span className="sr-only">Loading, please wait.</span>
    </div>
  )
}
