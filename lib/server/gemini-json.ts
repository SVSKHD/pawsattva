import { ApiError as GeminiApiError, GoogleGenAI, type ThinkingLevel } from "@google/genai"

/**
 * One structured (JSON) Gemini call for admin tools, e.g. SEO drafts and pre-publish reviews.
 * Tries GEMINI_MODEL, then the lighter GEMINI_FALLBACK_MODEL. Route Handlers only.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest"
const GEMINI_FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL?.trim() === "none" ? "" : process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-flash-lite-latest"

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY?.trim())

export async function generateJson<T = Record<string, unknown>>({
  system, prompt, schema, temperature = 0.4, maxOutputTokens = 4000, label, thinkingLevel, timeoutMs,
}: {
  system: string
  prompt: string
  schema: Record<string, unknown>
  temperature?: number
  maxOutputTokens?: number
  /** For log lines */
  label: string
  /** e.g. "low" for quick, user-facing calls; models that don't take it fall back to their default */
  thinkingLevel?: string
  /** Gives up on a model after this long and tries the next one */
  timeoutMs?: number
}): Promise<T> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const models = [GEMINI_MODEL, ...(GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL ? [GEMINI_FALLBACK_MODEL] : [])]
  const call = (model: string, thinking?: string) =>
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        temperature,
        maxOutputTokens,
        ...(timeoutMs ? { abortSignal: AbortSignal.timeout(timeoutMs) } : {}),
        ...(thinking ? { thinkingConfig: { thinkingLevel: thinking.toUpperCase() as ThinkingLevel } } : {}),
      },
    })
  let lastError: unknown
  for (const model of models) {
    try {
      let response
      try {
        response = await call(model, thinkingLevel)
      } catch (error) {
        // Older models (e.g. a pinned 2.5) only take a thinking budget, not a level
        if (!thinkingLevel || !(error instanceof GeminiApiError) || error.status !== 400 || !/think/i.test(error.message)) throw error
        response = await call(model)
      }
      return JSON.parse(response.text ?? "") as T
    } catch (error) {
      lastError = error
      const reason = error instanceof Error ? error.message.slice(0, 200) : String(error)
      console.warn(`${label}: ${model} failed (${reason}), ${model === models.at(-1) ? "giving up" : "trying the next model"}`)
    }
  }
  throw lastError
}

/** Cuts at a word boundary so a long line never ends mid-word */
export const clip = (value: unknown, max: number) => {
  const clean = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max + 1)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : clean.slice(0, max)).replace(/[\s,;:–-]+$/, "")
}

/** Lower-cased, de-duplicated keyword phrases */
export const keywordList = (value: unknown, max: number) =>
  Array.isArray(value)
    ? [...new Set(value.filter((k): k is string => typeof k === "string").map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, max)
    : []
