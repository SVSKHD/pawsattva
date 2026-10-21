"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import type { User } from "firebase/auth"

/**
 * "Read aloud" for Paw GPT answers. Signed-in users hear a natural voice from /api/paw-gpt/speak
 * (Gemini TTS, or a custom ElevenLabs voice); the answer is sent in short pieces and each plays
 * while the next is being made, so it starts quickly. Guests, and any failure, fall back to the
 * browser's own speech. Only one answer speaks at a time.
 */

export type ReadAloudStatus = "idle" | "loading" | "speaking"

let active: { id: string; status: ReadAloudStatus; cancel: () => void } | null = null
const listeners = new Set<() => void>()

function setActive(next: typeof active) {
  active = next
  listeners.forEach((listener) => listener())
}

function setStatus(id: string, status: ReadAloudStatus) {
  if (active?.id !== id || active.status === status) return
  setActive({ ...active, status })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const browserSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window
const canPlayAudio = () => typeof window !== "undefined" && typeof Audio !== "undefined"

/** Markdown answer → plain text worth hearing (no symbols, table pipes or link targets). */
export function speakableText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?\s*:?-{2,}.*$/gm, " ")
    .replace(/\|/g, ", ")
    .replace(/^\s{0,3}#{1,6}\s+(.*)$/gm, "$1.")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[*_~`>#]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/(\.\s*){2,}/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

/** Sentence-aligned pieces; the first is short so the voice starts quickly. */
function chunks(text: string, first: number, rest: number) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]
  const out: string[] = []
  let current = ""
  for (const sentence of sentences) {
    const max = out.length === 0 ? first : rest
    if ((current + sentence).length > max && current) {
      out.push(current.trim())
      current = ""
    }
    current += sentence
  }
  if (current.trim()) out.push(current.trim())
  // A single very long "sentence" (e.g. a table read as one line) is split hard.
  return out.flatMap((part) => (part.length > 1400 ? part.match(/[\s\S]{1,1400}(?=\s|$)/g) ?? [part] : [part]))
}

// ── Natural voice (server) ───────────────────────────────────────────────────

class SpeakError extends Error {
  constructor(readonly status: number) {
    super(`speak ${status}`)
  }
}

/** Audio already made for recent answers, so replaying doesn't fetch (or bill) again. */
const audioCache = new Map<string, Promise<string>>()
const MAX_CACHED_PIECES = 60

function fetchPiece(user: User, key: string, text: string, signal: AbortSignal) {
  const cached = audioCache.get(key)
  if (cached) return cached
  const request = (async () => {
    const res = await fetch("/api/paw-gpt/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ text }),
      signal,
    })
    if (!res.ok) throw new SpeakError(res.status)
    return URL.createObjectURL(await res.blob())
  })()
  audioCache.set(key, request)
  // Failed or cancelled pieces are fetched again next time.
  request.catch(() => audioCache.delete(key))
  while (audioCache.size > MAX_CACHED_PIECES) {
    const [oldest, url] = audioCache.entries().next().value!
    audioCache.delete(oldest)
    void url.then((href) => URL.revokeObjectURL(href)).catch(() => {})
  }
  return request
}

function playUrl(audio: HTMLAudioElement, url: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      audio.onended = audio.onerror = null
      signal.removeEventListener("abort", onAbort)
    }
    const onAbort = () => {
      done()
      audio.pause()
      resolve()
    }
    audio.onended = () => {
      done()
      resolve()
    }
    audio.onerror = () => {
      done()
      reject(new Error("audio playback failed"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
    audio.src = url
    audio.play().catch((error) => {
      done()
      reject(error)
    })
  })
}

// An empty WAV. Playing it inside the tap "unlocks" the audio element on iOS Safari, which
// otherwise refuses to play audio that starts after the network request finishes.
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="

/** Must be called synchronously from the click. */
function unlockedAudio() {
  const audio = new Audio()
  audio.src = SILENCE
  audio.play().catch(() => {})
  return audio
}

/** Plays every piece in order, fetching the next while the current one plays. */
async function speakNatural(id: string, user: User, text: string, signal: AbortSignal, audio: HTMLAudioElement) {
  const pieces = chunks(text, 220, 700)
  signal.addEventListener("abort", () => audio.pause(), { once: true })
  const fetchAt = (index: number) => fetchPiece(user, `${id}:${index}:${pieces[index].length}`, pieces[index], signal)

  let next = fetchAt(0)
  for (let index = 0; index < pieces.length; index++) {
    let url: string
    try {
      url = await next
    } catch (error) {
      if (signal.aborted) return
      // Not set up / not allowed / busy: say the rest with the browser voice instead.
      const rest = pieces.slice(index).join(" ")
      if (browserSpeech()) return speakWithBrowser(id, rest, signal)
      throw error
    }
    if (signal.aborted) return
    if (index + 1 < pieces.length) next = fetchAt(index + 1)
    setStatus(id, "speaking")
    await playUrl(audio, url, signal)
    if (signal.aborted) return
  }
}

// ── Browser voice (fallback) ─────────────────────────────────────────────────

/** An Indian English voice when the device has one, otherwise the most natural English one. */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"))
  const natural = (voice: SpeechSynthesisVoice) => /natural|neural|premium|enhanced|google/i.test(voice.name)
  return (
    voices.find((voice) => voice.lang === "en-IN" && natural(voice)) ??
    voices.find((voice) => voice.lang === "en-IN") ??
    voices.find(natural) ??
    voices[0] ??
    null
  )
}

function speakWithBrowser(id: string, text: string, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const synth = window.speechSynthesis
    synth.cancel()
    // Chrome stops long utterances after ~15s, so queue sentence-sized pieces.
    const parts = chunks(text, 220, 220)
    if (!parts.length) return resolve()
    const voice = pickVoice()
    signal.addEventListener("abort", () => { synth.cancel(); resolve() }, { once: true })
    parts.forEach((part, index) => {
      const utterance = new SpeechSynthesisUtterance(part)
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang ?? "en-IN"
      utterance.onstart = () => setStatus(id, "speaking")
      if (index === parts.length - 1) utterance.onend = () => resolve()
      utterance.onerror = (event) => {
        // "interrupted"/"canceled" just mean another answer started or Stop was pressed.
        if (event.error !== "interrupted" && event.error !== "canceled") console.error("Read aloud failed:", event.error)
        resolve()
      }
      synth.speak(utterance)
    })
  })
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function stopActive() {
  active?.cancel()
  setActive(null)
}

export function useReadAloud(id: string, markdown: string, user: User | null) {
  const available = useSyncExternalStore(subscribe, () => browserSpeech() || canPlayAudio(), () => false)
  const status = useSyncExternalStore(subscribe, () => (active?.id === id ? active.status : "idle"), () => "idle" as const)

  const start = useCallback(() => {
    stopActive()
    const text = speakableText(markdown)
    if (!text) return
    const controller = new AbortController()
    setActive({ id, status: "loading", cancel: () => controller.abort() })

    const run = user && canPlayAudio()
      ? speakNatural(id, user, text, controller.signal, unlockedAudio())
      : speakWithBrowser(id, text, controller.signal)
    run
      .catch((error) => {
        console.error("Read aloud failed:", error)
      })
      .finally(() => {
        if (active?.id === id && !controller.signal.aborted) setActive(null)
      })
  }, [id, markdown, user])

  const stop = useCallback(() => {
    if (active?.id === id) stopActive()
  }, [id])

  // Stop talking when the answer leaves the screen (new chat, another pet, leaving the page).
  useEffect(() => () => {
    if (active?.id === id) stopActive()
  }, [id])

  return { available, status, toggle: status === "idle" ? start : stop }
}
