import { GoogleGenAI } from "@google/genai"
import { NextResponse } from "next/server"

import { authenticate, createRateLimiter } from "@/lib/server/paw-gpt-auth"

/**
 * Natural-sounding "Read aloud" for Paw GPT answers (signed-in users). The browser sends one
 * short piece of an answer at a time and plays it while the next one is made.
 *
 *   ElevenLabs — when ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are set. Use this for a custom
 *                (designed or cloned) brand voice. ELEVENLABS_MODEL_ID picks the model.
 *   Gemini     — otherwise, with GEMINI_API_KEY. PAW_GPT_TTS_VOICE picks one of Gemini's built-in
 *                voices (default "Sulafat", warm); PAW_GPT_TTS_STYLE sets how it speaks.
 *
 * Responds with audio (audio/mpeg or audio/wav), or 503 when no voice is configured so the
 * browser falls back to its own speech.
 */

export const maxDuration = 60

const MAX_CHARS = 1500
// A long report is ~15-25 pieces; this still stops someone using it as a free TTS service.
const rateLimited = createRateLimiter(120, 10 * 60 * 1000)

const GEMINI_TTS_MODEL = process.env.PAW_GPT_TTS_MODEL?.trim() || "gemini-2.5-flash-preview-tts"
const GEMINI_TTS_VOICE = process.env.PAW_GPT_TTS_VOICE?.trim() || "Sulafat"
const GEMINI_TTS_STYLE =
  process.env.PAW_GPT_TTS_STYLE?.trim() ||
  "Read this aloud in a warm, friendly and natural Indian English voice, like a caring vet talking to a pet parent. Keep a relaxed, conversational pace"

export async function POST(req: Request) {
  const elevenLabs = Boolean(process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_VOICE_ID?.trim())
  if (!elevenLabs && !process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json({ error: "Natural voice isn't set up." }, { status: 503 })
  }

  let auth
  try {
    auth = await authenticate(req)
  } catch (error) {
    console.error("Paw GPT speak: auth check failed:", error)
    return NextResponse.json({ error: "Could not verify your account." }, { status: 502 })
  }
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (rateLimited(auth.uid)) {
    return NextResponse.json({ error: "Too much read-aloud at once. Try again in a few minutes." }, { status: 429 })
  }

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  if (!text || text.length > MAX_CHARS) {
    return NextResponse.json({ error: "Nothing to read." }, { status: 400 })
  }

  try {
    const audio = elevenLabs ? await speakWithElevenLabs(text, req.signal) : await speakWithGemini(text, req.signal)
    return new Response(audio.data, {
      headers: { "Content-Type": audio.type, "Cache-Control": "private, max-age=86400" },
    })
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 499 })
    console.error(`Paw GPT speak failed (${elevenLabs ? "elevenlabs" : "gemini"}):`, error)
    return NextResponse.json({ error: "Could not read this answer aloud." }, { status: 502 })
  }
}

// ── ElevenLabs (custom / cloned voices) ──────────────────────────────────────

async function speakWithElevenLabs(text: string, signal: AbortSignal) {
  const voiceId = encodeURIComponent(process.env.ELEVENLABS_VOICE_ID!.trim())
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!.trim(), "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
    }),
    signal,
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`)
  return { data: await res.arrayBuffer(), type: "audio/mpeg" }
}

// ── Gemini text-to-speech ────────────────────────────────────────────────────

async function speakWithGemini(text: string, signal: AbortSignal) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const response = await ai.models.generateContent({
    model: GEMINI_TTS_MODEL,
    contents: [{ role: "user", parts: [{ text: `${GEMINI_TTS_STYLE}:\n\n${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } },
      abortSignal: signal,
    },
  })
  const part = response.candidates?.[0]?.content?.parts?.find((entry) => entry.inlineData?.data)
  if (!part?.inlineData?.data) throw new Error(`Gemini returned no audio (${response.candidates?.[0]?.finishReason ?? "no candidate"})`)

  // Raw 16-bit PCM, e.g. "audio/L16;codec=pcm;rate=24000"; browsers need a WAV header to play it.
  const rate = Number(part.inlineData.mimeType?.match(/rate=(\d+)/)?.[1] ?? 24000)
  const wav = pcmToWav(Buffer.from(part.inlineData.data, "base64"), rate)
  return { data: new Uint8Array(wav).buffer, type: "audio/wav" }
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44)
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write("data", 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}
