"use client"

import { useEffect, useRef } from "react"

/**
 * Desktop-only pointer polish. Mobile touch feedback used to update React state
 * for every tap, competing with navigation on slower phones. Coarse pointers now
 * use native tap feedback and keep the main thread free for the requested action.
 */
export default function PetCursorAura() {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const glowRef = useRef<HTMLDivElement | null>(null)
  const tailRef = useRef<HTMLDivElement | null>(null)
  const pawRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const canUseFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches
    if (prefersReducedMotion || !canUseFinePointer) return

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
  }, [])

  return (
    <div className="pet-cursor-aura" aria-hidden="true">
      <div
        ref={glowRef}
        className="pointer-events-none fixed left-0 top-0 z-[9997] h-28 w-28 rounded-full bg-orange-300/18 blur-3xl mix-blend-multiply dark:bg-amber-300/10"
      />

      <div
        ref={tailRef}
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-7 w-28 origin-left"
      >
        <div className="h-full w-full rounded-[999px] bg-gradient-to-r from-orange-300/35 via-amber-200/22 to-transparent blur-md" />
        <div className="absolute left-2 top-1/2 h-2 w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-400/35 to-transparent blur-sm" />
      </div>

      <div
        ref={pawRef}
        className="pointer-events-none fixed left-0 top-0 z-[9998] flex h-8 w-8 items-center justify-center rounded-full text-[15px] opacity-70 drop-shadow-[0_8px_20px_rgba(249,115,22,0.25)]"
      >
        🐾
      </div>

      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-5 w-5 rounded-full border border-white/80 bg-gradient-to-br from-orange-400 via-amber-300 to-yellow-200 shadow-[0_0_28px_rgba(249,115,22,0.38)] dark:border-white/30"
      >
        <span className="absolute inset-[-7px] rounded-full border border-orange-300/20 animate-ping" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
      </div>
    </div>
  )
}
