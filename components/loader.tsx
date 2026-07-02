"use client"

import NextImage, { StaticImageData } from "next/image"
import { useEffect, useState } from "react"

interface AdminLoaderProps {
  img: string | StaticImageData
  title?: string
  subtitle?: string
}

const AdminLoader = ({
  img,
  title = "Loading PawSattva",
  subtitle = "Preparing a calm pet wellness space for you...",
}: AdminLoaderProps) => {
  const [dots, setDots] = useState(".")

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDots((current) => (current.length >= 3 ? "." : `${current}.`))
    }, 460)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,251,247,0.96),_rgba(255,247,237,0.98)_42%,_rgba(250,250,249,1)_100%)] px-4 backdrop-blur-3xl dark:bg-[radial-gradient(circle_at_top,_rgba(39,28,20,0.96),_rgba(13,13,13,0.98)_55%,_rgba(0,0,0,1)_100%)]">
      {/* ambient premium wash */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl loader-breathe dark:bg-orange-500/10" />
        <div className="absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl loader-breathe [animation-delay:420ms] dark:bg-amber-400/10" />
        <div className="absolute bottom-[-6rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/25 blur-3xl loader-breathe [animation-delay:820ms] dark:bg-emerald-400/10" />
      </div>

      <div className="relative w-full max-w-[26rem] rounded-[2rem] border border-white/55 bg-white/58 p-6 shadow-[0_28px_90px_rgba(124,45,18,0.16)] backdrop-blur-3xl dark:border-white/10 dark:bg-black/36 sm:p-8">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/60 via-white/10 to-orange-200/10 dark:from-white/10 dark:via-transparent dark:to-orange-500/5" />
        <div className="pointer-events-none absolute -inset-px rounded-[2rem] border border-white/40 dark:border-white/10" />

        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-6 flex h-32 w-32 items-center justify-center sm:h-36 sm:w-36">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300/35 via-amber-200/30 to-emerald-200/20 blur-2xl loader-breathe" />
            <div className="absolute inset-[-14px] rounded-full border border-dashed border-orange-300/45 loader-spin-slow dark:border-orange-300/20" />
            <div className="absolute inset-[-24px] rounded-full border border-amber-300/30 loader-spin-reverse dark:border-amber-300/15" />

            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white/75 p-4 shadow-[0_18px_50px_rgba(249,115,22,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 sm:h-32 sm:w-32">
              <NextImage
                src={img}
                alt="Paw Sattva Logo"
                fill
                priority
                className="object-contain p-2 drop-shadow-[0_10px_28px_rgba(249,115,22,0.28)] loader-float"
              />
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2 text-lg" aria-hidden="true">
            <span className="loader-paw-step">🐾</span>
            <span className="loader-paw-step [animation-delay:160ms]">🐾</span>
            <span className="loader-paw-step [animation-delay:320ms]">🐾</span>
          </div>

          <h2 className="bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 bg-clip-text text-3xl font-[family-name:var(--font-pacifico)] tracking-wide text-transparent sm:text-4xl">
            Paw Sattva
          </h2>

          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-orange-700/65 dark:text-orange-200/65">
            Wellness • Balance • Harmony
          </p>

          <div className="mt-6 rounded-2xl border border-orange-200/55 bg-white/45 px-4 py-3 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-extrabold text-zinc-800 dark:text-white">{title}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500 dark:text-zinc-300">{subtitle}</p>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-bold text-orange-500 dark:text-orange-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]" />
            <span>Just a moment{dots}</span>
          </div>

          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-orange-100/80 shadow-inner dark:bg-white/10">
            <div className="loader-shimmer h-full w-1/2 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loaderFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.035); }
        }

        @keyframes loaderBreathe {
          0%, 100% { transform: scale(1); opacity: 0.72; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        @keyframes loaderPawStep {
          0%, 100% { transform: translateY(0) rotate(-4deg) scale(0.92); opacity: 0.45; }
          50% { transform: translateY(-7px) rotate(5deg) scale(1.06); opacity: 1; }
        }

        @keyframes loaderShimmer {
          0% { transform: translateX(-130%); }
          55% { transform: translateX(90%); }
          100% { transform: translateX(240%); }
        }

        @keyframes loaderSpinSlow {
          to { transform: rotate(360deg); }
        }

        @keyframes loaderSpinReverse {
          to { transform: rotate(-360deg); }
        }

        .loader-float { animation: loaderFloat 3s ease-in-out infinite; }
        .loader-breathe { animation: loaderBreathe 3.8s ease-in-out infinite; }
        .loader-paw-step { animation: loaderPawStep 1.45s ease-in-out infinite; }
        .loader-shimmer { animation: loaderShimmer 1.85s ease-in-out infinite; }
        .loader-spin-slow { animation: loaderSpinSlow 13s linear infinite; }
        .loader-spin-reverse { animation: loaderSpinReverse 18s linear infinite; }
      `}</style>
    </div>
  )
}

export default AdminLoader
