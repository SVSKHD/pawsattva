"use client"

import {
  AlertTriangle, BookOpenCheck, CheckCircle2, CircleDashed, FileJson, KeyRound, Lightbulb, Link2, ListChecks, Sparkles, Upload,
} from "lucide-react"

import {
  FloatingSidebar,
  FloatingSidebarCode,
  FloatingSidebarSection,
} from "@/components/floating-sidebar"
import { BLOG_FIELDS, BLOG_JSON_SAMPLE, buildPrefillUrl, type BlogFormValues } from "@/lib/blog-json"

interface BlogUrlGuideProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: BlogFormValues
  /** Opens the Import / Export dialog on its Import tab */
  onOpenImport: () => void
  /** Writing checks only make sense while editing */
  showDraftTools?: boolean
}

/** Floating "Tips" panel for the blog tabs: writing checks, accepted keys, URL & JSON format */
export function BlogUrlGuide({ open, onOpenChange, values, onOpenImport, showDraftTools = true }: BlogUrlGuideProps) {
  return (
    <FloatingSidebar
      open={open}
      onOpenChange={onOpenChange}
      triggerLabel="Tips"
      triggerIcon={Lightbulb}
      title="Blog tips & keys"
      description="Writing checks plus the keys accepted in prefill URLs and JSON imports."
    >
      <GuideContent
        values={values}
        showDraftTools={showDraftTools}
        onOpenImport={() => {
          onOpenChange(false)
          onOpenImport()
        }}
      />
    </FloatingSidebar>
  )
}

// Rendered only while the panel is open (client-side), so window is available
function GuideContent({
  values, onOpenImport, showDraftTools,
}: Pick<BlogUrlGuideProps, "values" | "onOpenImport"> & { showDraftTools: boolean }) {
  const origin = window.location.origin

  const examples = [
    {
      label: "Basic prefill",
      url: buildPrefillUrl(origin, {
        title: "Best Toys for Indoor Cats",
        description: "Keep your indoor cat active and happy with these vet-approved toys.",
        keywords: "cat toys, indoor cats, cat enrichment",
        content: "<h2>Why play matters</h2><p>Indoor cats need daily play to stay fit and stress-free.</p><h2>Top picks</h2><ul><li>Feather wands</li><li>Puzzle feeders</li><li>Crinkle balls</li></ul>",
      }),
    },
    {
      label: "With HTML content & image",
      url: buildPrefillUrl(origin, {
        title: "Monsoon Paw Care Guide",
        excerpt: "Simple steps to keep paws clean and infection-free this rainy season.",
        keywords: "monsoon, paw care, dog health",
        seoTitle: "Monsoon Paw Care: A Vet Guide for Dogs",
        image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200",
        content: "<h2>Why paws need extra care</h2><p>Wet ground traps dirt between toes.</p><h2>Daily routine</h2><ul><li>Wipe paws after walks</li><li>Dry between the toes</li></ul>",
      }),
    },
    { label: "Template only", url: buildPrefillUrl(origin, { template: "medium-dog-breeds" }) },
    {
      label: "Template + your own title",
      url: buildPrefillUrl(origin, { template: "soft-water-pets", title: "Is Hard Water Bad for Your Pets?" }),
    },
  ]

  return (
    <>
      {showDraftTools && (
        <FloatingSidebarSection title="Writing checks" icon={ListChecks}>
          <WritingChecks values={values} />
        </FloatingSidebarSection>
      )}

      <FloatingSidebarSection title="Accepted keys (URL & JSON)" icon={KeyRound}>
        <div className="overflow-hidden rounded-xl border border-border/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Key</th>
                <th className="px-3 py-2 font-semibold">Fills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {BLOG_FIELDS.map((field) => (
                <tr key={field.key}>
                  <td className="px-3 py-2 align-top font-mono text-[11px] font-semibold text-orange-700 dark:text-orange-300">{field.key}</td>
                  <td className="px-3 py-2 text-foreground/80">
                    {field.fills}
                    {field.fallback && (
                      <span className="block text-[10px] text-muted-foreground">defaults to {field.fallback}</span>
                    )}
                    {field.aliases && (
                      <span className="block text-[10px] text-muted-foreground">also: {field.aliases}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Needs at least <code>title</code>, <code>content</code> or <code>template</code>. Prefilled and imported posts always open as a{" "}
          <strong className="text-foreground">draft</strong>. With a <code>template</code>, the template loads first and your other keys override it. Categories and author are picked in the editor.
        </p>
      </FloatingSidebarSection>

      <FloatingSidebarSection
        title="JSON format"
        icon={FileJson}
        action={
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-orange-600"
          >
            <Upload className="h-3 w-3" />
            Import JSON
          </button>
        }
      >
        <FloatingSidebarCode value={BLOG_JSON_SAMPLE} label="Sample — paste into Import JSON" />
      </FloatingSidebarSection>

      <FloatingSidebarSection title="URL format" icon={Link2}>
        <FloatingSidebarCode value={`${origin}/admin/blog?title=…&excerpt=…&keywords=…`} />
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Same keys as the table above. The article body only fills when <code>content</code> is in the URL. Use Export → Copy prefill URL to get a link for the current draft.
        </p>
      </FloatingSidebarSection>

      <FloatingSidebarSection title="URL examples" icon={Sparkles}>
        <div className="space-y-2.5">
          {examples.map((example) => (
            <FloatingSidebarCode key={example.label} value={example.url} label={example.label} />
          ))}
        </div>
      </FloatingSidebarSection>

      <FloatingSidebarSection title="Encoding rules" icon={BookOpenCheck}>
        <ul className="grid grid-cols-2 gap-1.5 text-xs">
          {[
            ["space", "%20"],
            ["?", "%3F"],
            ["&", "%26"],
            ["/", "%2F"],
            ["#", "%23"],
            ["<  >", "%3C  %3E"],
          ].map(([char, code]) => (
            <li key={char} className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5">
              <span className="font-mono text-foreground/80">{char}</span>
              <span className="font-mono font-semibold text-orange-700 dark:text-orange-300">{code}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Always encode <code>content</code> HTML — an unencoded <code>&amp;</code> or <code>#</code> cuts the URL short.{" "}
          <code>encodeURIComponent()</code> and the Export tab handle this for you.
        </p>
      </FloatingSidebarSection>
    </>
  )
}

type CheckState = "good" | "warn" | "missing"

function WritingChecks({ values }: { values: BlogFormValues }) {
  const plain = values.content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  const words = plain ? plain.split(" ").length : 0
  const headings = (values.content.match(/<h2[\s>]/gi) || []).length
  const keywordCount = values.keywords.split(",").map((k) => k.trim()).filter(Boolean).length
  const seoTitle = values.seoTitle.trim() || values.title.trim()

  const range = (length: number, min: number, max: number): CheckState =>
    length === 0 ? "missing" : length >= min && length <= max ? "good" : "warn"

  const checks: { label: string; hint: string; state: CheckState; detail: string }[] = [
    { label: "Title", hint: "30–65 characters", state: range(values.title.trim().length, 30, 65), detail: `${values.title.trim().length} chars` },
    { label: "SEO title", hint: "50–60 characters", state: range(seoTitle.length, 50, 60), detail: `${seoTitle.length} chars` },
    { label: "SEO description", hint: "120–160 characters", state: range(values.seoDescription.trim().length, 120, 160), detail: `${values.seoDescription.trim().length} chars` },
    { label: "Excerpt", hint: "100–200 characters", state: range(values.excerpt.trim().length, 100, 200), detail: `${values.excerpt.trim().length} chars` },
    { label: "Keywords", hint: "3–8 comma-separated", state: range(keywordCount, 3, 8), detail: `${keywordCount}` },
    { label: "Featured image", hint: "Shown in the hero & social cards", state: values.image.trim() ? "good" : "missing", detail: values.image.trim() ? "set" : "none" },
    { label: "Length", hint: "600+ words reads as a full guide", state: words === 0 ? "missing" : words >= 600 ? "good" : "warn", detail: `${words} words` },
    { label: "Section headings", hint: "2+ H2s build the “On this page” list", state: headings === 0 ? "missing" : headings >= 2 ? "good" : "warn", detail: `${headings} H2` },
  ]

  const passed = checks.filter((check) => check.state === "good").length

  return (
    <div className="rounded-xl border border-border/70">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="text-xs font-semibold">{passed} of {checks.length} looking good</span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-orange-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all"
            style={{ width: `${(passed / checks.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="divide-y divide-border/60">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2.5 px-3 py-2">
            {check.state === "good" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : check.state === "warn" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{check.label}</p>
              <p className="text-[10px] text-muted-foreground">{check.hint}</p>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{check.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
