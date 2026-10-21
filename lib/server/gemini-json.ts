import { GoogleGenAI } from "@google/genai"

/**
 * One structured (JSON) Gemini call for admin tools, e.g. SEO drafts and pre-publish reviews.
 * Tries GEMINI_MODEL, then the lighter GEMINI_FALLBACK_MODEL. Route Handlers only.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest"
const GEMINI_FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL?.trim() === "none" ? "" : process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-flash-lite-latest"

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY?.trim())

export async function generateJson<T = Record<string, unknown>>({
  system, prompt, schema, temperature = 0.4, maxOutputTokens = 4000, label,
}: {
  system: string
  prompt: string
  schema: Record<string, unknown>
  temperature?: number
  maxOutputTokens?: number
  /** For log lines */
  label: string
}): Promise<T> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const models = [GEMINI_MODEL, ...(GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL ? [GEMINI_FALLBACK_MODEL] : [])]
  let lastError: unknown
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          temperature,
          maxOutputTokens,
        },
      })
      return JSON.parse(response.text ?? "") as T
    } catch (error) {
      lastError = error
      console.warn(`${label}: ${model} failed, ${model === models.at(-1) ? "giving up" : "trying the next model"}`)
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
