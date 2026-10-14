import { before, describe, it } from "node:test"
import assert from "node:assert/strict"

import { validDraft } from "./fixtures"

// These run the real route handler without Firebase credentials, so every case below
// must be decided before the handler touches Firestore.
const KEY = "test-key-0123456789abcdef"
let POST: (request: Request) => Promise<Response>

before(async () => {
  process.env.PAWSATTVA_DRAFT_API_KEY = KEY
  delete process.env.FIREBASE_PROJECT_ID
  delete process.env.FIREBASE_CLIENT_EMAIL
  delete process.env.FIREBASE_PRIVATE_KEY
  ;({ POST } = await import("@/app/api/integrations/ai/blog-drafts/route"))
})

let ipCounter = 0
const send = (body: unknown, { token = KEY as string | null, contentType = "application/json", ip }: { token?: string | null; contentType?: string; ip?: string } = {}) =>
  POST(new Request("https://pawsattva.com/api/integrations/ai/blog-drafts", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-nf-client-connection-ip": ip ?? `10.0.0.${++ipCounter}`,
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }))

const json = async (response: Response) => (await response.json()) as { success: boolean; error?: { code: string; details?: { field: string }[] } }

describe("POST /api/integrations/ai/blog-drafts", () => {
  it("401 without a token", async () => {
    const response = await send(validDraft(), { token: null })
    assert.equal(response.status, 401)
    assert.equal((await json(response)).error?.code, "UNAUTHORIZED")
    assert.match(response.headers.get("www-authenticate") ?? "", /^Bearer/)
  })

  it("401 with a wrong token", async () => {
    const response = await send(validDraft(), { token: "wrong" })
    assert.equal(response.status, 401)
  })

  it("429 after repeated bad tokens from one IP", async () => {
    const ip = "203.0.113.9"
    for (let i = 0; i < 10; i++) assert.equal((await send({}, { token: "nope", ip })).status, 401)
    const blocked = await send(validDraft(), { ip })
    assert.equal(blocked.status, 429)
  })

  it("415 for non-JSON content", async () => {
    assert.equal((await send("title=x", { contentType: "text/plain" })).status, 415)
  })

  it("400 for malformed JSON", async () => {
    const response = await send("{not json")
    assert.equal(response.status, 400)
    assert.equal((await json(response)).error?.code, "INVALID_JSON")
  })

  it("400 for an invalid payload, with field details", async () => {
    const response = await send({ ...validDraft(), keywords: "one" })
    assert.equal(response.status, 400)
    const body = await json(response)
    assert.equal(body.error?.code, "VALIDATION_FAILED")
    assert.ok(body.error?.details?.some((detail) => detail.field === "keywords"))
  })

  it("400 when the payload tries to set publication status", async () => {
    const response = await send({ ...validDraft(), status: "published", publishedAt: "2026-01-01" })
    assert.equal(response.status, 400)
    const fields = (await json(response)).error?.details?.map((detail) => detail.field)
    assert.deepEqual(fields?.sort(), ["publishedAt", "status"])
  })

  it("400 UNSAFE_HTML for script injection", async () => {
    const response = await send({ ...validDraft(), content: validDraft().content + "<script>alert(1)</script>" })
    assert.equal(response.status, 400)
    assert.equal((await json(response)).error?.code, "UNSAFE_HTML")
  })

  it("413 for an oversized payload", async () => {
    const response = await send({ ...validDraft(), content: "<p>" + "a".repeat(300 * 1024) + "</p>" })
    assert.equal(response.status, 413)
    assert.equal((await json(response)).error?.code, "PAYLOAD_TOO_LARGE")
  })

  it("400 for a bad Idempotency-Key", async () => {
    const response = await POST(new Request("https://pawsattva.com/api/integrations/ai/blog-drafts", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}`, "idempotency-key": "x" },
      body: JSON.stringify(validDraft()),
    }))
    assert.equal(response.status, 400)
  })

  it("503 (not a crash or a leak) when Firebase credentials are missing", async () => {
    const response = await send(validDraft())
    assert.equal(response.status, 503)
    const text = await response.text()
    assert.doesNotMatch(text, /FIREBASE_|PRIVATE|test-key/)
  })
})
