import NextImage, { StaticImageData } from "next/image"
const AdminLoader = ({ img }: { img: string | StaticImageData }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white/85 backdrop-blur-3xl dark:bg-black/90">
            {/* soft ambient background */}
            <div className="absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-500/10 animate-pulse" />
                <div className="absolute left-[42%] top-[46%] h-[16rem] w-[16rem] rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-400/10 animate-pulse [animation-delay:400ms]" />
                <div className="absolute left-[55%] top-[55%] h-[14rem] w-[14rem] rounded-full bg-yellow-100/40 blur-3xl dark:bg-yellow-300/10 animate-pulse [animation-delay:800ms]" />
            </div>

            <div className="relative flex flex-col items-center justify-center">
                {/* outer animated ring */}
                <div className="relative flex items-center justify-center">
                    <div className="absolute h-72 w-72 md:h-96 md:w-96 rounded-full border border-orange-300/40 dark:border-orange-400/20 animate-[spin_10s_linear_infinite]" />
                    <div className="absolute h-64 w-64 md:h-80 md:w-80 rounded-full border-2 border-dashed border-amber-400/50 dark:border-amber-300/30 animate-[spin_14s_linear_infinite_reverse]" />
                    <div className="absolute h-56 w-56 md:h-72 md:w-72 rounded-full bg-gradient-to-br from-orange-400/20 via-amber-300/20 to-yellow-200/20 blur-xl animate-pulse" />

                    {/* logo container */}
                    <div className="relative h-56 w-56 md:h-72 md:w-72 animate-[float_3.5s_ease-in-out_infinite]">
                        <div className="absolute inset-0 rounded-full bg-orange-400/20 blur-2xl animate-pulse" />
                        <div className="absolute inset-0 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden flex items-center justify-center p-0">
                            <div className="relative w-full h-full">
                                <NextImage
                                    src={img}
                                    alt="Paw Sattva Logo"
                                    fill
                                    priority
                                    className="object-contain drop-shadow-[0_8px_30px_rgba(255,140,0,0.3)] transform-gpu hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                        </div>
                        <div className="absolute inset-[-18px] rounded-full ring-1 ring-orange-400/30 ring-offset-0 dark:ring-orange-300/20" />
                    </div>
                </div>

                {/* brand text */}
                <div className="mt-10 text-center">
                    <h2 className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-3xl font-[family-name:var(--font-pacifico)] tracking-wide text-transparent md:text-5xl animate-pulse">
                        Paw Sattva
                    </h2>

                    <p className="mt-3 text-sm md:text-base font-medium tracking-[0.25em] uppercase text-orange-700/70 dark:text-orange-200/70">
                        Wellness • Balance • Harmony
                    </p>

                    {/* elegant loading bar */}
                    <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-orange-100 dark:bg-white/10">
                        <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 animate-[loader_1.8s_ease-in-out_infinite]" />
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.04);
          }
        }

        @keyframes loader {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(140%);
          }
          100% {
            transform: translateX(320%);
          }
        }
      `}</style>
        </div>
    )
}

export default AdminLoader
