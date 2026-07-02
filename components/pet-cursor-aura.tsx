"use client"

import { useEffect, useRef, useState } from "react"

type PointerMode = "none" | "fine" | "touch"

type TouchRipple = {
  id: number
  x: number
  y: number
  rotation: number
}

export default function PetCursorAura() {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const glowRef = useRef<HTMLDivElement | null>(null)
  const tailRef = useRef<HTMLDivElement | null>(null)
  const pawRef = useRef<HTMLDivElement | null>(null)
  const rippleIdRef = useRef(0)
  const [mode, setMode] = useState<PointerMode>("none")
  const [ripples, setRipples] = useState<TouchRipple[]>([])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const canUseFinePointer = window.matchMedia("(pointer: fine)").matches
    setMode(canUseFinePointer ? "fine" : "touch")
  }, [])

  useEffect(() => {
    if (mode !== "fine") return

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let dotX = mouseX
    let dotY = mouseY
    let glowX = mouseX
    let glowY = mouseY
    let tailX = mouseX
    let tailY = mouseY
    let pawX = mouseX
    let pawY = mouseY
    let frameId = 0

    const handleMove = (event: MouseEvent) => {
      mouseX = event.clientX
      mouseY = event.clientY
    }

    const animate = () => {
      dotX += (mouseX - dotX) * 0.34
      dotY += (mouseY - dotY) * 0.34
      glowX += (mouseX - glowX) * 0.1
      glowY += (mouseY - glowY) * 0.1
      tailX += (mouseX - tailX) * 0.075
      tailY += (mouseY - tailY) * 0.075
      pawX += (mouseX - pawX) * 0.18
      pawY += (mouseY - pawY) * 0.18

      const tailAngle = Math.atan2(mouseY - tailY, mouseX - tailX) * (180 / Math.PI)

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`
      }

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`
      }

      if (tailRef.current) {
        tailRef.current.style.transform = `translate3d(${tailX}px, ${tailY}px, 0) translate(-18%, -50%) rotate(${tailAngle}deg)`
      }

      if (pawRef.current) {
        pawRef.current.style.transform = `translate3d(${pawX}px, ${pawY}px, 0) translate(-50%, -50%) rotate(${tailAngle / 9}deg)`
      }

      frameId = requestAnimationFrame(animate)
    }

    window.addEventListener("mousemove", handleMove, { passive: true })
    frameId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      cancelAnimationFrame(frameId)
    }
  }, [mode])

  useEffect(() => {
    if (mode !== "touch") return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return

      const id = rippleIdRef.current + 1
      rippleIdRef.current = id

      const nextRipple: TouchRipple = {
        id,
        x: event.clientX,
        y: event.clientY,
        rotation: Math.round(Math.random() * 32 - 16),
      }

      setRipples((current) => [...current.slice(-5), nextRipple])
      window.setTimeout(() => {
        setRipples((current) => current.filter((ripple) => ripple.id !== id))
      }, 780)
    }

    window.addEventListener("pointerdown", handlePointerDown, { passive: true })

    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [mode])

  if (mode === "none") return null

  if (mode === "touch") {
    return (
      <>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
          {ripples.map((ripple) => (
            <div
              key={ripple.id}
              className="touch-paw-ripple absolute left-0 top-0 h-24 w-24"
              style={{
                transform: `translate3d(${ripple.x}px, ${ripple.y}px, 0) translate(-50%, -50%) rotate(${ripple.rotation}deg)`,
              }}
            >
              <span className="absolute inset-0 rounded-full border border-orange-300/45 bg-orange-300/10 shadow-[0_0_36px_rgba(249,115,22,0.24)]" />
              <span className="touch-paw-core absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-base shadow-[0_12px_34px_rgba(249,115,22,0.22)] backdrop-blur-xl dark:bg-black/35">
                🐾
              </span>
              <span className="touch-paw-tail absolute left-[52%] top-1/2 h-4 w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-300/35 to-transparent blur-md" />
            </div>
          ))}
        </div>

        <style jsx>{`
          @keyframes touchPawRipple {
            0% {
              opacity: 0;
              scale: 0.45;
              filter: blur(0px);
            }
            18% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              scale: 1.45;
              filter: blur(2px);
            }
          }

          @keyframes touchPawCore {
            0% { transform: translate(-50%, -50%) scale(0.72) rotate(-6deg); }
            45% { transform: translate(-50%, -50%) scale(1.05) rotate(5deg); }
            100% { transform: translate(-50%, -50%) scale(0.92) rotate(0deg); }
          }

          @keyframes touchPawTail {
            0% { opacity: 0; transform: translateY(-50%) translateX(-10px) scaleX(0.5); }
            35% { opacity: 1; }
            100% { opacity: 0; transform: translateY(-50%) translateX(18px) scaleX(1.15); }
          }

          .touch-paw-ripple {
            transform-origin: center;
            animation: touchPawRipple 780ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .touch-paw-core {
            animation: touchPawCore 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .touch-paw-tail {
            animation: touchPawTail 680ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}</style>
      </>
    )
  }

  return (
    <>
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9997] h-28 w-28 rounded-full bg-orange-300/18 blur-3xl mix-blend-multiply dark:bg-amber-300/10"
      />

      <div
        ref={tailRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-7 w-28 origin-left"
      >
        <div className="h-full w-full rounded-[999px] bg-gradient-to-r from-orange-300/35 via-amber-200/22 to-transparent blur-md" />
        <div className="absolute left-2 top-1/2 h-2 w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-400/35 to-transparent blur-sm" />
      </div>

      <div
        ref={pawRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9998] flex h-8 w-8 items-center justify-center rounded-full text-[15px] opacity-70 drop-shadow-[0_8px_20px_rgba(249,115,22,0.25)]"
      >
        🐾
      </div>

      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-5 w-5 rounded-full border border-white/80 bg-gradient-to-br from-orange-400 via-amber-300 to-yellow-200 shadow-[0_0_28px_rgba(249,115,22,0.38)] dark:border-white/30"
      >
        <span className="absolute inset-[-7px] rounded-full border border-orange-300/20 animate-ping" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
      </div>
    </>
  )
}
