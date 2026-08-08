"use client"

import { useEffect, useMemo, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { CheckCircle2, Loader2, SearchCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  getPageSeoConfigs,
  type PageSeoConfig,
  type PageSeoKey,
  savePageSeoConfig,
} from "@/firebase/firestore"

const PAGE_OPTIONS: { key: PageSeoKey; label: string; pathname: string }[] = [
  { key: "home", label: "Home", pathname: "/" },
  { key: "blog", label: "Blogs", pathname: "/blog" },
  { key: "pet-feed", label: "Pet Care", pathname: "/pet-feed" },
]

const EMPTY_CONFIG: Omit<PageSeoConfig, "key"> = {
  title: "",
  description: "",
  keywords: [],
  image: "",
}

const normalizeKeywords = (value: string) =>
  [...new Set(value.split(",").map((keyword) => keyword.trim()).filter(Boolean))].slice(0, 10)

export function PageSeoTab() {
  const [selectedPage, setSelectedPage] = useState<PageSeoKey>("home")
  const [configs, setConfigs] = useState<Partial<Record<PageSeoKey, PageSeoConfig>>>({})
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [keywordText, setKeywordText] = useState("")
  const [image, setImage] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPageSeoConfigs()
      .then((items) => setConfigs(Object.fromEntries(items.map((item) => [item.key, item]))))
      .catch(() => toast.error("Unable to load page SEO settings."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const config = configs[selectedPage] || EMPTY_CONFIG
    setTitle(config.title)
    setDescription(config.description)
    setKeywordText(config.keywords.join(", "))
    setImage(config.image || "")
  }, [configs, selectedPage])

  const keywords = useMemo(() => normalizeKeywords(keywordText), [keywordText])
  const titleHealthy = title.trim().length >= 30 && title.trim().length <= 60
  const descriptionHealthy = description.trim().length >= 120 && description.trim().length <= 160
  const keywordsHealthy = keywords.length >= 3 && keywords.length <= 10
  const isHealthy = titleHealthy && descriptionHealthy && keywordsHealthy

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isHealthy) {
      toast.error("Complete the SEO health checks before saving.")
      return
    }

    setSaving(true)
    try {
      const config: PageSeoConfig = {
        key: selectedPage,
        title: title.trim(),
        description: description.trim(),
        keywords,
        image: image.trim(),
      }
      await savePageSeoConfig(config)
      setConfigs((current) => ({ ...current, [selectedPage]: config }))
      toast.success("Page SEO updated. Search metadata will use these values.")
    } catch (error) {
      console.error(error)
      toast.error("Unable to save page SEO settings.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
  }

  const currentPage = PAGE_OPTIONS.find((page) => page.key === selectedPage)!

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Page SEO</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Maintain search and social metadata for the main public pages. Existing defaults remain active until a healthy configuration is saved.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {PAGE_OPTIONS.map((page) => (
          <button
            key={page.key}
            type="button"
            onClick={() => setSelectedPage(page.key)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${selectedPage === page.key ? "border-orange-500 bg-orange-500/10 text-orange-700" : "border-border bg-background hover:bg-muted/50"}`}
          >
            <span className="block font-bold">{page.label}</span>
            <span className="text-xs text-muted-foreground">{page.pathname}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <Card className="rounded-3xl border-orange-100/70 bg-white/70 shadow-xl dark:border-white/10 dark:bg-black/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SearchCheck className="h-5 w-5 text-orange-500" /> {currentPage.label} metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SeoField label="SEO title" healthy={titleHealthy} hint={`${title.trim().length}/60 · recommended 30–60 characters`}>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} className="h-12 rounded-xl" />
            </SeoField>

            <SeoField label="Meta description" healthy={descriptionHealthy} hint={`${description.trim().length}/160 · recommended 120–160 characters`}>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={160} className="min-h-28 rounded-xl" />
            </SeoField>

            <SeoField label="Healthy keyword phrases" healthy={keywordsHealthy} hint={`${keywords.length}/10 unique phrases · enter 3–10, separated by commas`}>
              <Textarea
                value={keywordText}
                onChange={(event) => setKeywordText(event.target.value)}
                placeholder="pet nutrition, dog diet plan, cat wellness"
                className="min-h-24 rounded-xl"
              />
            </SeoField>

            <div className="space-y-2">
              <Label>Social sharing image URL <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={image} onChange={(event) => setImage(event.target.value)} placeholder="/og.png or https://…" className="h-12 rounded-xl" />
              <p className="text-xs text-muted-foreground">Recommended size: 1200 × 630 px. The default Paw Sattva image is used when blank.</p>
            </div>

            <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${isHealthy ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              <CheckCircle2 className="h-4 w-4" />
              {isHealthy ? "SEO fields are healthy and ready to publish." : "Complete all three health ranges before saving."}
            </div>

            <Button type="submit" disabled={saving || !isHealthy} className="h-11 rounded-xl px-6 font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save SEO settings
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

function SeoField({ label, healthy, hint, children }: { label: string; healthy: boolean; hint: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className={`text-xs font-medium ${healthy ? "text-emerald-600" : "text-amber-600"}`}>{hint}</span>
      </Label>
      {children}
    </div>
  )
}
