import { NextResponse } from "next/server"

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_JSON"
  | "VALIDATION_FAILED"
  | "UNSAFE_HTML"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "NOT_CONFIGURED"
  | "INTERNAL_ERROR"

export interface FieldIssue {
  field: string
  message: string
}

const NO_STORE = { "Cache-Control": "no-store" }

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { details?: FieldIssue[]; headers?: Record<string, string> } = {}
) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(extra.details?.length ? { details: extra.details } : {}) } },
    { status, headers: { ...NO_STORE, ...extra.headers } }
  )
}

export function apiOk<T extends Record<string, unknown>>(body: T, status = 200) {
  return NextResponse.json({ success: true, ...body }, { status, headers: NO_STORE })
}

export class BodyTooLargeError extends Error {}

/**
 * Reads the request body while counting bytes, aborting as soon as the limit is passed.
 * Content-Length is checked first as a fast path, but it is never trusted on its own
 * (it can be absent with chunked encoding, or simply wrong).
 */
export async function readBodyWithLimit(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError()
  if (!request.body) return ""

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel().catch(() => {})
      throw new BodyTooLargeError()
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged)
}

/** Netlify sets x-nf-client-connection-ip; fall back to the first x-forwarded-for hop. */
export function clientIp(request: Request) {
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

/** Extracts the token from an `Authorization: Bearer <token>` header. */
export function bearerToken(request: Request) {
  const match = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(request.headers.get("authorization") ?? "")
  return match?.[1] ?? ""
}
