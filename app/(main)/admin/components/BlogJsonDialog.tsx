"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, CircleDashed, Copy, Download, FileJson, Link2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BLOG_JSON_SAMPLE,
  SAFE_URL_LENGTH,
  buildPrefillUrl,
  parseBlogJson,
  serializeBlog,
  type BlogFormValues,
  type BlogImportData,
} from "@/lib/blog-json"

export type BlogJsonDialogMode = "import" | "export"

interface BlogJsonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: BlogJsonDialogMode
  onModeChange: (mode: BlogJsonDialogMode) => void
  values: BlogFormValues
  onImportJson: (data: BlogImportData) => void
  /** Ask before replacing an editor that already has content */
  editorHasContent: boolean
}

const PREVIEW_FIELDS: { key: keyof BlogImportData; label: string }[] = [
  { key: "template", label: "Template" },
  { key: "title", label: "Title" },
  { key: "excerpt", label: "Excerpt" },
  { key: "description", label: "Description" },
  { key: "keywords", label: "Keywords" },
  { key: "seoTitle", label: "SEO title" },
  { key: "seoDescription", label: "SEO description" },
  { key: "seoKeywords", label: "SEO keywords" },
  { key: "image", label: "Featured image" },
  { key: "content", label: "Content" },
]

const wordCount = (html: string) => {
  const plain = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  return plain ? plain.split(" ").length : 0
}

export function BlogJsonDialog({
  open, onOpenChange, mode, onModeChange, values, onImportJson, editorHasContent,
}: BlogJsonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-orange-500" />
            Import / Export blog JSON
          </DialogTitle>
          <DialogDescription>
            Paste JSON to fill the editor, or copy the current post as JSON. Keys match the URL prefill params — see Tips &amp; keys.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => onModeChange(v as BlogJsonDialogMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="import"><Upload className="h-3.5 w-3.5" /> Import</TabsTrigger>
            <TabsTrigger value="export"><Download className="h-3.5 w-3.5" /> Export</TabsTrigger>
          </TabsList>
          <TabsContent value="import" className="mt-4">
            <ImportPane
              editorHasContent={editorHasContent}
              onImport={(data) => {
                onImportJson(data)
                onOpenChange(false)
              }}
            />
          </TabsContent>
          <TabsContent value="export" className="mt-4">
            <ExportPane values={values} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ImportPane({ onImport, editorHasContent }: { onImport: (data: BlogImportData) => void; editorHasContent: boolean }) {
  const [text, setText] = useState("")
  const [confirming, setConfirming] = useState(false)
  const result = useMemo(() => (text.trim() ? parseBlogJson(text) : null), [text])

  const runImport = () => {
    if (!result?.ok) return
    if (editorHasContent && !confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    setText("")
    onImport(result.data)
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setConfirming(false)
        }}
        placeholder='{ "title": "…", "content": "<h2>…</h2>" }'
        spellCheck={false}
        aria-invalid={result ? !result.ok : undefined}
        className="min-h-56 w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 font-mono text-xs leading-relaxed outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
      />

      {result && !result.ok && (
        <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          {result.error}
        </p>
      )}

      {result?.ok && (
        <div className="rounded-xl border border-border/70 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Will fill</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {PREVIEW_FIELDS.map(({ key, label }) => {
              const value = result.data[key]
              return (
                <li key={key} className="flex items-center gap-1.5">
                  {value
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : <CircleDashed className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  <span className={value ? "font-medium" : "text-muted-foreground"}>{label}</span>
                  {key === "content" && value && (
                    <span className="text-muted-foreground">({wordCount(value).toLocaleString()} words)</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {confirming && (
        <p className="flex items-start gap-1.5 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          This replaces what&apos;s in the editor and starts a new draft. Click Import again to confirm.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={runImport}
          disabled={!result?.ok}
          className="flex-1 rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600"
        >
          <Upload className="h-4 w-4" />
          {confirming ? "Replace & import" : "Import into editor"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setText(BLOG_JSON_SAMPLE)}>
          Use sample
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Imported posts always open as a <strong className="text-foreground">draft</strong>. Categories and author are picked in the editor.
      </p>
    </div>
  )
}

function ExportPane({ values }: { values: BlogFormValues }) {
  const [includeContent, setIncludeContent] = useState(true)
  const json = serializeBlog(values)
  const isEmpty = json === "{}"
  const url = buildPrefillUrl(window.location.origin, {
    ...values,
    content: includeContent ? values.content : "",
  })

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Could not copy — select the text and copy it manually.")
    }
  }

  const download = () => {
    const blob = new Blob([json], { type: "application/json" })
    const href = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = href
    link.download = `${values.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "blog"}.json`
    link.click()
    URL.revokeObjectURL(href)
  }

  if (isEmpty) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        The editor is empty. Write or import a post first, then export it here.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5 font-mono text-[11px] leading-relaxed">
        {json}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => copy(json, "JSON")} className="flex-1 rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600">
          <Copy className="h-4 w-4" /> Copy JSON
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={download}>
          <Download className="h-4 w-4" /> Download .json
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold"><Link2 className="h-3.5 w-3.5 text-orange-500" /> Prefill URL</p>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={includeContent}
              onChange={(event) => setIncludeContent(event.target.checked)}
              className="h-3.5 w-3.5 accent-orange-500"
            />
            Include content
          </label>
        </div>
        <Button type="button" variant="outline" size="sm" className="w-full rounded-xl" onClick={() => copy(url, "Prefill URL")}>
          <Copy className="h-3.5 w-3.5" /> Copy prefill URL ({url.length.toLocaleString()} chars)
        </Button>
        {url.length > SAFE_URL_LENGTH && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" /> Too long for some browsers — untick content or share the JSON instead.
          </p>
        )}
      </div>
    </div>
  )
}
