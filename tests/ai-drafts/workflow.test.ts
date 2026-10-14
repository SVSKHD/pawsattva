import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { publishBlockers } from "@/lib/ai-drafts/readiness"
import { AI_DRAFT_STATUSES, AI_DRAFT_TRANSITIONS, canTransition, type AiDraftAction } from "@/lib/ai-drafts/types"
import { bearerToken, BodyTooLargeError, readBodyWithLimit } from "@/lib/server/http"

describe("workflow transitions", () => {
  it("only an approved draft can be published", () => {
    for (const status of AI_DRAFT_STATUSES) {
      assert.equal(canTransition(status, "publish"), status === "approved", status)
    }
  })

  it("published drafts are final", () => {
    for (const action of Object.keys(AI_DRAFT_TRANSITIONS) as AiDraftAction[]) {
      assert.equal(canTransition("published", action), false, action)
    }
  })

  it("follows Draft → In review → Approved → Published", () => {
    assert.ok(canTransition("draft", "start_review"))
    assert.ok(canTransition("in_review", "approve"))
    assert.ok(canTransition("approved", "publish"))
    assert.ok(canTransition("in_review", "request_changes"))
    assert.ok(canTransition("changes_requested", "reopen"))
    assert.ok(canTransition("rejected", "reopen"))
    assert.equal(canTransition("rejected", "approve"), false)
    assert.equal(canTransition("changes_requested", "approve"), false)
  })
})

describe("publishBlockers", () => {
  const ready = {
    title: "Dog teeth",
    content: "<p>x</p>",
    image: "https://images.unsplash.com/photo-1",
    slug: "dog-teeth",
    categoryIds: ["cat1"],
    authorId: "uid1",
    imageAttribution: { altText: "A dog", license: "Unsplash License" },
    imageRightsConfirmed: true,
  }

  it("is empty when everything is in place", () => {
    assert.deepEqual(publishBlockers(ready), [])
  })

  it("requires category, author, slug, alt text, allowed image host and a human license check", () => {
    assert.equal(publishBlockers({ ...ready, categoryIds: [] }).length, 1)
    assert.equal(publishBlockers({ ...ready, authorId: "" }).length, 1)
    assert.equal(publishBlockers({ ...ready, slug: "" }).length, 1)
    assert.equal(publishBlockers({ ...ready, imageAttribution: { license: "x" } }).length, 1)
    assert.equal(publishBlockers({ ...ready, image: "https://cdn.example.org/dog.jpg" }).length, 1)
    assert.equal(publishBlockers({ ...ready, imageRightsConfirmed: false }).length, 1)
    assert.equal(publishBlockers({ ...ready, imageAttribution: { altText: "x", attributionRequired: true } }).length, 1)
  })
})

describe("http helpers", () => {
  it("parses Bearer tokens (the old regex never matched a real header)", () => {
    const req = (value: string) => new Request("https://x.test", { headers: { authorization: value } })
    assert.equal(bearerToken(req("Bearer abc123")), "abc123")
    assert.equal(bearerToken(req("bearer   abc123  ")), "abc123")
    assert.equal(bearerToken(req("Basic abc123")), "")
    assert.equal(bearerToken(req("Bearer a b")), "")
    assert.equal(bearerToken(new Request("https://x.test")), "")
  })

  it("enforces the size limit while streaming, without trusting Content-Length", async () => {
    const chunk = new Uint8Array(64 * 1024)
    let sent = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += chunk.byteLength
        controller.enqueue(chunk)
        if (sent > 10 * 1024 * 1024) controller.close()
      },
    })
    const request = new Request("https://x.test", { method: "POST", body, duplex: "half" } as RequestInit)
    await assert.rejects(readBodyWithLimit(request, 256 * 1024), BodyTooLargeError)
    assert.ok(sent < 1024 * 1024, `stopped reading early (read ${sent} bytes)`)
  })

  it("reads bodies under the limit", async () => {
    const request = new Request("https://x.test", { method: "POST", body: '{"a":1}' })
    assert.equal(await readBodyWithLimit(request, 100), '{"a":1}')
  })
})
