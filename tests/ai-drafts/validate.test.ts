import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { findUnsafeHtml, sanitizeArticleHtml, titleFingerprint, urlProblem, validateEdit, validateSubmission } from "@/lib/ai-drafts/validate"
import { validDraft } from "./fixtures"

describe("validateSubmission", () => {
  it("accepts the documented payload", () => {
    const result = validateSubmission(validDraft())
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.title, "How to Brush Your Dog's Teeth at Home")
    assert.deepEqual(result.data.keywords, ["dog dental care", "how to brush dog teeth", "dog oral hygiene"])
  })

  it("requires all six fields", () => {
    for (const field of ["title", "excerpt", "keywords", "seoTitle", "image", "content"]) {
      const payload: Record<string, unknown> = validDraft()
      delete payload[field]
      const result = validateSubmission(payload)
      assert.equal(result.ok, false, `missing ${field} should fail`)
      if (!result.ok) assert.ok(result.issues.some((issue) => issue.field === field), `issue for ${field}`)
    }
  })

  it("refuses fields that would set publication state", () => {
    for (const field of ["status", "published", "publishedAt", "approved", "role", "moderation", "imageRightsConfirmed", "slug"]) {
      const result = validateSubmission({ ...validDraft(), [field]: field === "status" ? "published" : true })
      assert.equal(result.ok, false, field)
      if (!result.ok) assert.match(result.issues.find((issue) => issue.field === field)?.message ?? "", /moderator/)
    }
  })

  it("refuses unknown fields and non-object bodies", () => {
    assert.equal(validateSubmission({ ...validDraft(), extra: 1 }).ok, false)
    assert.equal(validateSubmission([validDraft()]).ok, false)
    assert.equal(validateSubmission("x").ok, false)
    assert.equal(validateSubmission(null).ok, false)
  })

  it("checks types and lengths", () => {
    assert.equal(validateSubmission({ ...validDraft(), title: 42 }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), title: "short" }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), title: "x".repeat(161) }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), keywords: "dog dental care" }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), keywords: [] }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), keywords: Array.from({ length: 21 }, (_, i) => `keyword ${i}`) }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), keywords: ["a,b"] }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), title: "<b>Bold</b> dog teeth guide" }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), content: "<p>Too short.</p>" }).ok, false)
  })

  it("dedupes keywords case-insensitively", () => {
    const result = validateSubmission({ ...validDraft(), keywords: ["Dog care", "dog care", "cat care"] })
    assert.ok(result.ok)
    if (result.ok) assert.deepEqual(result.data.keywords, ["Dog care", "cat care"])
  })

  it("rejects unsafe image URLs", () => {
    const bad = [
      "http://example.com/a.jpg",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "https://user:pass@example.com/a.jpg",
      "https://127.0.0.1/a.jpg",
      "https://[::1]/a.jpg",
      "https://localhost/a.jpg",
      "https://metadata.google.internal/a.jpg",
      "https://example.com:8443/a.jpg",
      "/relative.jpg",
    ]
    for (const image of bad) assert.equal(validateSubmission({ ...validDraft(), image }).ok, false, image)
  })

  it("warns, but does not fail, when the image host is not yet allowed for publishing", () => {
    const result = validateSubmission({ ...validDraft(), image: "https://cdn.example.org/dog.jpg" })
    assert.ok(result.ok)
    if (result.ok) assert.ok(result.warnings.some((warning) => /replaced or uploaded/.test(warning)))
  })

  it("rejects malicious HTML outright", () => {
    const attacks = [
      '<p>Hi</p><script>alert(1)</script>',
      '<img src="https://images.unsplash.com/x.jpg" onerror="alert(1)">',
      '<a href="javascript:alert(1)">x</a>',
      '<a href = " JaVaScRiPt:alert(1)">x</a>',
      '<a href="&#106;avascript:alert(1)">x</a>',
      '<iframe src="https://evil.example"></iframe>',
      '<svg><animate onbegin="alert(1)"/></svg>',
      '<form action="https://evil.example"><input></form>',
      '<style>body{display:none}</style>',
      '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
      '<!-- <script> -->',
    ]
    for (const attack of attacks) {
      const result = validateSubmission({ ...validDraft(), content: validDraft().content + attack })
      assert.equal(result.ok, false, attack)
      if (!result.ok) assert.equal(result.kind, "unsafe", attack)
    }
  })

  it("validates image attribution metadata", () => {
    const ok = validateSubmission({
      ...validDraft(),
      imageAttribution: {
        sourceUrl: "https://unsplash.com/photos/abc",
        creator: "Jane Doe",
        license: "Unsplash License",
        licenseUrl: "https://unsplash.com/license",
        attributionText: "Photo by Jane Doe on Unsplash",
        attributionRequired: false,
        altText: "A dog having its teeth brushed",
      },
    })
    assert.ok(ok.ok)
    assert.equal(validateSubmission({ ...validDraft(), imageAttribution: { sourceUrl: "javascript:alert(1)" } }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), imageAttribution: { rightsConfirmed: true } }).ok, false)
    assert.equal(validateSubmission({ ...validDraft(), imageAttribution: { attributionRequired: true } }).ok, false)
  })
})

describe("sanitizeArticleHtml", () => {
  it("keeps article structure and strips presentation/unknown markup", () => {
    const { html } = sanitizeArticleHtml(
      '<h1 class="x">Title</h1><p style="color:red">Text <span>inline</span></p><table><tr><td colspan="2">cell</td></tr></table>'
    )
    assert.match(html, /^<h2>Title<\/h2>/)
    assert.doesNotMatch(html, /class=|style=|<span/)
    assert.match(html, /<td colspan="2">cell<\/td>/)
  })

  it("hardens external links and keeps internal ones", () => {
    const { html } = sanitizeArticleHtml('<a href="https://example.com" onclick="x">ext</a> <a href="/pet-feed">int</a>')
    assert.match(html, /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer nofollow">ext<\/a>/)
    assert.match(html, /<a href="\/pet-feed">int<\/a>/)
  })

  it("drops non-https images and javascript: links as a second line of defence", () => {
    const { html } = sanitizeArticleHtml('<img src="http://x.com/a.jpg"><a href="javascript:alert(1)">x</a>')
    assert.doesNotMatch(html, /<img|javascript/i)
  })

  it("findUnsafeHtml leaves ordinary article HTML alone", () => {
    assert.deepEqual(findUnsafeHtml(validDraft().content), [])
    assert.deepEqual(findUnsafeHtml("<p>Brush gently, then offer a treat. Use a soft brush.</p>"), [])
  })
})

describe("helpers", () => {
  it("titleFingerprint ignores case, punctuation and spacing", () => {
    assert.equal(titleFingerprint("How to Brush Your Dog's Teeth"), titleFingerprint("  how to brush your dog s teeth!! "))
    assert.notEqual(titleFingerprint("Dog teeth"), titleFingerprint("Cat teeth"))
  })

  it("urlProblem allows http for source links only when asked", () => {
    assert.equal(urlProblem("http://example.com/page", { httpsOnly: false }), null)
    assert.notEqual(urlProblem("http://example.com/page", { httpsOnly: true }), null)
  })
})

describe("validateEdit", () => {
  it("accepts partial edits and moderator-only fields", () => {
    const result = validateEdit({ revision: 3, slug: "dog-teeth", categoryIds: ["abc", "abc"], imageRightsConfirmed: true })
    assert.ok(result.ok)
    if (result.ok) assert.deepEqual(result.data, { slug: "dog-teeth", categoryIds: ["abc"], imageRightsConfirmed: true })
  })

  it("rejects status changes, bad slugs and unsafe content", () => {
    assert.equal(validateEdit({ revision: 1, status: "published" }).ok, false)
    assert.equal(validateEdit({ revision: 1, slug: "Bad Slug" }).ok, false)
    assert.equal(validateEdit({ revision: 1, categoryIds: ["../x"] }).ok, false)
    const unsafe = validateEdit({ revision: 1, content: validDraft().content + "<script>x</script>" })
    assert.equal(unsafe.ok, false)
    if (!unsafe.ok) assert.equal(unsafe.kind, "unsafe")
  })
})
