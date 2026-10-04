"use client"

import { useState, useTransition, useEffect, useRef, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import Paw from "../../pawsattva.png"
import { Settings2, ChevronRight, Trash2 } from "lucide-react"

import { toast } from "sonner"
import AdminLoader from "@/components/loader"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"

import {
  addBlog, updateBlog, deleteBlog,
  approveBlog, requestBlogDelete, rejectBlogDeleteRequest,
  getCategories, addCategory, updateCategory, deleteCategory,
  getAdminUsers, getSubscriptions,
  onUsersSnapshot, onBlogsSnapshot, updateUserRole, updateUser, deleteUser, setUserBlacklisted,
  Blog, Category, UserProfile, Subscription
} from "@/firebase/firestore"

import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { AdminNav } from "./components/AdminNav"
import { BlogListTab } from "./components/BlogListTab"
import { BlogUrlGuide } from "./components/BlogUrlGuide"
import { BlogToolbar } from "./components/BlogToolbar"
import { BlogJsonDialog, type BlogJsonDialogMode } from "./components/BlogJsonDialog"
import type { BlogImportData } from "@/lib/blog-json"
import { imageUrlProblem } from "@/lib/image-hosts"

function TabLoading() {
  return (
    <div role="status" className="flex min-h-56 items-center justify-center rounded-3xl border border-orange-200/50 bg-orange-50/60 text-sm font-bold text-orange-700 dark:border-white/10 dark:bg-white/5 dark:text-orange-300">
      <span className="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Opening this workspace...
    </div>
  )
}

const ContentGoalsTab = dynamic(
  () => import("./components/ContentGoalsTab").then((mod) => mod.ContentGoalsTab),
  { loading: TabLoading }
)
const BlogFormTab = dynamic(
  () => import("./components/BlogFormTab").then((mod) => mod.BlogFormTab),
  { loading: TabLoading }
)
const PageSeoTab = dynamic(
  () => import("./components/PageSeoTab").then((mod) => mod.PageSeoTab),
  { loading: TabLoading }
)
const CategoryListTab = dynamic(
  () => import("./components/CategoryListTab").then((mod) => mod.CategoryListTab),
  { loading: TabLoading }
)
const SubCategoryListTab = dynamic(
  () => import("./components/SubCategoryListTab").then((mod) => mod.SubCategoryListTab),
  { loading: TabLoading }
)
const CategoryFormTab = dynamic(
  () => import("./components/CategoryFormTab").then((mod) => mod.CategoryFormTab),
  { loading: TabLoading }
)
const AnalyticsTab = dynamic(
  () => import("./components/AnalyticsTab").then((mod) => mod.AnalyticsTab),
  { loading: TabLoading }
)
const SubscribersTab = dynamic(
  () => import("./components/SubscribersTab").then((mod) => mod.SubscribersTab),
  { loading: TabLoading }
)
const VetHospitalsTab = dynamic(
  () => import("./components/VetHospitalsTab").then((mod) => mod.VetHospitalsTab),
  { loading: TabLoading }
)
const UsersTab = dynamic(
  () => import("./components/UsersTab").then((mod) => mod.UsersTab),
  { loading: TabLoading }
)

// ── Constants ────────────────────────────────────────────────────────────────

const DRAFT_KEY = "pawsattva_blog_draft"

// ── Component ────────────────────────────────────────────────────────────────

type BlogUrlPrefill = {
  template?: string
  title?: string
  description?: string
  excerpt?: string
  keywords?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  content?: string
  image?: string
}

export default function AdminPanel({
  initialTab = "blog-list",
  initialBlogPrefill,
}: {
  initialTab?: string
  initialBlogPrefill?: BlogUrlPrefill
}) {
  const { user, loading: authLoading, isAdmin, role } = useAuth()
  const router = useRouter()
  const [, startTransition] = useTransition()
  const isFullAdmin = role === "admin"
  const isAuthor = role === "author"
  const userId = user?.uid
  const allowedTabs = useMemo(
    () => isFullAdmin
      ? new Set([
        "content-goals", "page-seo", "blog-list", "blog", "category-list",
        "category", "sub-category-list", "sub-category", "users", "subscribers", "analytics",
        "vet-hospitals",
      ])
      : new Set(["blog-list", "blog", "category-list", "category", "sub-category-list", "sub-category"]),
    [isFullAdmin]
  )

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Unauthorized access. Admin privileges required.")
      router.push("/")
    }
  }, [authLoading, isAdmin, router])

  // ── Navigation state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(initialTab)
  const [blogTipsOpen, setBlogTipsOpen] = useState(false)
  const [blogJsonOpen, setBlogJsonOpen] = useState(false)
  const [blogJsonMode, setBlogJsonMode] = useState<BlogJsonDialogMode>("import")
  const openBlogJson = (mode: BlogJsonDialogMode) => {
    setBlogJsonMode(mode)
    setBlogJsonOpen(true)
  }

  const handleTabChange = (tab: string) => {
    startTransition(() => setActiveTab(allowedTabs.has(tab) ? tab : "blog-list"))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp restored/linked tabs after role changes
    if (!allowedTabs.has(activeTab)) setActiveTab("blog-list")
  }, [activeTab, allowedTabs])

  // ── Data state ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([])
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [authors, setAuthors] = useState<UserProfile[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [subscribers, setSubscribers] = useState<Subscription[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const authorsLoadedRef = useRef(false)
  const subscriptionsLoadedRef = useRef(false)

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    let categoriesReady = false
    let blogsReady = false

    const finishInitialLoad = () => {
      if (active && categoriesReady && blogsReady) setLoadingData(false)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- existing initial-load state reset
    setLoadingData(true)
    getCategories().then((nextCategories) => {
      if (!active) return
      setCategories(nextCategories)
      categoriesReady = true
      finishInitialLoad()
    }).catch(() => {
      if (!active) return
      toast.error("Failed to load categories from database.")
      setLoadingData(false)
    })

    const unsubBlogs = onBlogsSnapshot((nextBlogs) => {
      if (!active) return
      setBlogs(nextBlogs)
      blogsReady = true
      finishInitialLoad()
    }, () => {
      if (!active) return
      toast.error("Failed to load blog posts from database.")
      setLoadingData(false)
    })

    return () => {
      active = false
      unsubBlogs()
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isFullAdmin || (activeTab !== "users" && activeTab !== "analytics")) return
    return onUsersSnapshot(setUsers)
  }, [activeTab, isFullAdmin])

  useEffect(() => {
    if (!isAdmin || activeTab !== "blog" || authorsLoadedRef.current) return
    authorsLoadedRef.current = true
    getAdminUsers().then(setAuthors).catch(() => {
      authorsLoadedRef.current = false
      toast.error("Failed to load blog authors.")
    })
  }, [activeTab, isAdmin])

  useEffect(() => {
    const needsSubscribers = activeTab === "subscribers" || activeTab === "analytics"
    if (!isFullAdmin || !needsSubscribers || subscriptionsLoadedRef.current) return
    subscriptionsLoadedRef.current = true
    getSubscriptions().then(setSubscribers).catch(() => {
      subscriptionsLoadedRef.current = false
      toast.error("Failed to load subscribers.")
    })
  }, [activeTab, isFullAdmin])

  // ── Blog form state ───────────────────────────────────────────────────────
  const [blogTitle, setBlogTitle] = useState("")
  const [blogSlug, setBlogSlug] = useState("")
  const [blogKeywords, setBlogKeywords] = useState("")
  const [blogExcerpt, setBlogExcerpt] = useState("")
  const [blogSeoTitle, setBlogSeoTitle] = useState("")
  const [blogSeoDescription, setBlogSeoDescription] = useState("")
  const [blogSeoKeywords, setBlogSeoKeywords] = useState("")
  const [blogImage, setBlogImage] = useState("")
  const [blogContent, setBlogContent] = useState("")
  const [blogCategories, setBlogCategories] = useState<string[]>([])
  const [blogAuthorId, setBlogAuthorId] = useState("")
  const [blogStatus, setBlogStatus] = useState<"published" | "draft">("draft")
  const [instagramAutoPost, setInstagramAutoPost] = useState(false)
  const [instagramCaption, setInstagramCaption] = useState("")
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null)
  const [isSavingBlog, setIsSavingBlog] = useState(false)
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false)
  const urlPrefillAppliedRef = useRef(false)

  useEffect(() => {
    if (initialTab !== "blog" || urlPrefillAppliedRef.current || !initialBlogPrefill) return

    const title = initialBlogPrefill.title?.trim() || ""
    const description = initialBlogPrefill.description?.trim() || ""
    const excerpt = initialBlogPrefill.excerpt?.trim() || ""
    const keywords = initialBlogPrefill.keywords?.trim() || ""
    const seoTitle = initialBlogPrefill.seoTitle?.trim() || ""
    const seoDescription = initialBlogPrefill.seoDescription?.trim() || description
    const seoKeywords = initialBlogPrefill.seoKeywords?.trim() || keywords
    const content = initialBlogPrefill.content?.trim() || ""
    const image = initialBlogPrefill.image?.trim() || ""

    if (!title && !description && !excerpt && !keywords && !seoTitle && !seoDescription && !seoKeywords && !content && !image) return

    urlPrefillAppliedRef.current = true
    if (title) {
      setBlogTitle(title)
      setBlogSlug(
        title.toLowerCase().trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "")
      )
    }
    if (excerpt) setBlogExcerpt(excerpt)
    else if (description) setBlogExcerpt(description)
    if (keywords) setBlogKeywords(keywords)
    if (seoTitle) setBlogSeoTitle(seoTitle)
    else if (title) setBlogSeoTitle(title)
    if (seoDescription) setBlogSeoDescription(seoDescription)
    if (seoKeywords) setBlogSeoKeywords(seoKeywords)
    if (content) setBlogContent(content)
    if (image) setBlogImage(image)
    setBlogStatus("draft")
    setEditingBlogId(null)

    toast.success("Blog fields prefilled from the URL. Review them before publishing.")
  }, [initialBlogPrefill, initialTab])

  // ── Category form state ───────────────────────────────────────────────────
  const [categoryName, setCategoryName] = useState("")
  const [categoryDesc, setCategoryDesc] = useState("")
  const [categoryParentId, setCategoryParentId] = useState("")
  const [categoryStatus, setCategoryStatus] = useState<"published" | "draft">("published")
  const [categoryImage, setCategoryImage] = useState("")
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false)
  const [categoryImageUploadProgress, setCategoryImageUploadProgress] = useState(0)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [pendingDeletionCheck, setPendingDeletionCheck] = useState<{ id: string; name: string; subs: Category[] } | null>(null)

  // ── User edit state ───────────────────────────────────────────────────────
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState("")
  const [editUserEmail, setEditUserEmail] = useState("")
  const [editUserPhone, setEditUserPhone] = useState("")
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  // ── Draft autosave ────────────────────────────────────────────────────────
  const [savedDraft, setSavedDraft] = useState<{ savedAt: string } | null>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasDraftContent = useCallback(
    () => !!(blogTitle || blogContent || blogKeywords || blogCategories.length),
    [blogTitle, blogContent, blogKeywords, blogCategories]
  )

  const saveDraft = useCallback(() => {
    if (!blogTitle && !blogContent && !blogKeywords && !blogCategories.length) return
    const draft = {
      blogTitle, blogSlug, blogKeywords, blogExcerpt,
      blogSeoTitle, blogSeoDescription, blogSeoKeywords, blogImage,
      blogContent, blogCategories, blogAuthorId, blogStatus,
      instagramAutoPost, instagramCaption, editingBlogId,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    setSavedDraft({ savedAt: draft.savedAt })
  }, [blogTitle, blogSlug, blogKeywords, blogExcerpt, blogSeoTitle, blogSeoDescription, blogSeoKeywords, blogImage, blogContent, blogCategories, blogAuthorId, blogStatus, instagramAutoPost, instagramCaption, editingBlogId])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    setSavedDraft(null)
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- existing localStorage draft hydration
        if (d.savedAt) setSavedDraft({ savedAt: d.savedAt })
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (activeTab !== "blog" || editingBlogId) return
    if (!hasDraftContent()) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(saveDraft, 2000)
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current) }
  }, [blogTitle, blogSlug, blogKeywords, blogContent, blogCategories, blogStatus, activeTab, editingBlogId, hasDraftContent, saveDraft])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- existing autosave-on-tab-leave behavior
    if (activeTab !== "blog" && !editingBlogId && hasDraftContent()) saveDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    const handleUnload = () => { if (!editingBlogId && hasDraftContent()) saveDraft() }
    window.addEventListener("beforeunload", handleUnload)
    return () => window.removeEventListener("beforeunload", handleUnload)
  }, [editingBlogId, hasDraftContent, saveDraft])

  const restoreDraft = () => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      setBlogTitle(d.blogTitle || "")
      setBlogSlug(d.blogSlug || "")
      setBlogKeywords(d.blogKeywords || "")
      setBlogExcerpt(d.blogExcerpt || "")
      setBlogSeoTitle(d.blogSeoTitle || "")
      setBlogSeoDescription(d.blogSeoDescription || "")
      setBlogSeoKeywords(d.blogSeoKeywords || "")
      setBlogContent(d.blogContent || "")
      setBlogCategories(Array.isArray(d.blogCategories) ? d.blogCategories : d.blogCategory ? [d.blogCategory] : [])
      setBlogStatus(d.blogStatus || "draft")
      setInstagramAutoPost(Boolean(d.instagramAutoPost))
      setInstagramCaption(d.instagramCaption || "")
      setEditingBlogId(d.editingBlogId || null)
      toast.success("Draft restored!")
    } catch {
      toast.error("Could not restore draft.")
    }
  }

  const discardDraft = () => { clearDraft(); toast("Draft discarded.") }

  const formatDraftTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

  // ── Helpers ───────────────────────────────────────────────────────────────
  const generateSlug = (title: string) =>
    title.toLowerCase().trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")

  const getCategoryName = useCallback(
    (id: string) => categories.find(c => c.id === id)?.name || "Unknown",
    [categories]
  )

  const categoryPostCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const blog of blogs) {
      const ids = blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : []
      for (const id of new Set(ids)) counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  }, [blogs])

  const [blogSearchQuery, setBlogSearchQuery] = useState("")
  const filteredBlogsList = useMemo(() => {
    const query = blogSearchQuery.toLowerCase()
    return blogs
      .filter((blog) => !isAuthor || !userId || blog.authorId === userId)
      .filter((blog) => blog.title.toLowerCase().includes(query))
  }, [blogSearchQuery, blogs, isAuthor, userId])
  const filteredUsers = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase()
    if (!query) return users

    return users.filter((profile) => {
      const userFields = [
        profile.displayName,
        profile.email,
        profile.phone,
        profile.whatsappPhone,
      ]

      const userMatch = userFields.some((value) =>
        (value || "").toLowerCase().includes(query)
      )

      const petMatch = (profile.petFeeds ?? []).some((feed) =>
        [feed.petName, feed.petType, feed.petBreed]
          .some((value) => (value || "").toLowerCase().includes(query))
      )

      return userMatch || petMatch
    })
  }, [userSearchQuery, users])
  const totalPetFeeds = useMemo(
    () => users.reduce((sum, profile) => sum + (profile.petFeeds?.length || 0), 0),
    [users]
  )

  // ── Blog handlers ─────────────────────────────────────────────────────────
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setBlogTitle(title)
    if (!editingBlogId) setBlogSlug(generateSlug(title))
  }


  const loadSoftWaterPetsTemplate = () => {
    const title = "Water Softeners & Pets: How Softer Water Helps at Home"
    setBlogTitle(title)
    setBlogSlug("water-softeners-and-pets-how-softer-water-helps-at-home")
    setBlogKeywords(
      "hard water and pets, soft water for dogs, soft water for cats, hard water dog bathing, pet grooming hard water, water softener for pets, hard water dog coat, hard water cat coat, soft water for pet bathing, is soft water good for dogs, is softened water safe for pets, hard water effects on dog skin and coat"
    )
    setBlogExcerpt(
      "A practical PawSattva guide to how household water softening can support easier pet bathing, grooming, laundry and home care—while keeping drinking-water decisions separate."
    )
    setBlogSeoTitle("Hard Water & Pets: Is Soft Water Better for Dogs and Cats?")
    setBlogSeoDescription(
      "Hard water can affect bathing, coat care and grooming for dogs and cats. Learn how softer water may help, plus what pet owners should know about drinking water."
    )
    setBlogSeoKeywords(
      "hard water and pets, soft water for dogs, soft water for cats, hard water dog bathing, pet grooming hard water, water softener for pets, hard water dog coat, hard water cat coat, soft water for pet bathing, is soft water good for dogs, is softened water safe for pets, hard water effects on dog skin and coat"
    )
    setBlogContent(`
<p>Pet parents think carefully about food, exercise, grooming and veterinary care—but the <strong>water used around the home</strong> can also shape everyday pet-care routines. In homes with hard water, bathing a dog or cat, washing bedding, cleaning bowls and keeping bathrooms free from mineral scale can all feel more difficult.</p>

<p>A household water softener can help by reducing the hardness minerals—mainly calcium and magnesium—that cause scale and interfere with soap and shampoo performance. For pet households, the benefit is practical: <strong>easier bathing, better rinsing, less mineral residue and simpler home maintenance.</strong></p>

<p>This does <strong>not</strong> mean a water softener is a treatment for skin disease or that softened water should automatically replace a pet's drinking water. Persistent itching, redness, hair loss, ear problems or other health concerns should be discussed with a veterinarian.</p>

<h2>What is hard water?</h2>

<p>Hard water contains higher levels of dissolved calcium and magnesium. It is common in many groundwater and borewell supplies. At home, you may notice:</p>

<ul>
  <li>White or chalky scale on taps, tiles and shower heads</li>
  <li>Soap or shampoo that does not lather easily</li>
  <li>Residue on buckets, bowls or bathroom surfaces</li>
  <li>Stiff-feeling towels or laundry</li>
  <li>Frequent scale inside water heaters and plumbing fixtures</li>
</ul>

<h2>How can softer water help pets?</h2>

<h3>1. Easier bathing and shampoo lather</h3>

<p>Hardness minerals can reduce how efficiently soaps and shampoos lather. With softer water, pet shampoo generally mixes and rinses more easily, which can make bath time simpler and reduce the temptation to keep adding extra product just because lather is poor.</p>

<h3>2. Better rinsing from dense coats</h3>

<p>Long-haired, curly and double-coated pets can be difficult to rinse thoroughly. Softer water can make the washing process feel smoother because there is less mineral interference during rinsing. Good rinsing is still essential regardless of water type.</p>

<h3>3. Less mineral residue on the coat</h3>

<p>Hard water can leave mineral deposits on surfaces. Pet parents may also notice a rough, dull or coated feel after bathing. Softer water can reduce this mineral residue, helping the coat feel cleaner after proper shampooing and drying.</p>

<h3>4. More comfortable grooming routines</h3>

<p>A softer-water bath can make brushing, towel drying and post-bath grooming easier to manage, especially for pets with dense coats. This is a grooming benefit—not a medical claim.</p>

<h3>5. Cleaner pet towels and bedding</h3>

<p>Hard water affects laundry too. Pet towels, blankets and bedding can become stiff or hold detergent residue when water is very hard. Softer water can improve detergent performance and reduce mineral buildup during washing.</p>

<h3>6. Easier cleaning of bowls, tubs and pet areas</h3>

<p>Mineral scale can build up on stainless-steel bowls, bathroom fixtures, tubs and washing areas. Reducing hardness makes these areas easier to maintain and can lower the amount of scale left after repeated washing.</p>

<h3>7. Less scale around the home</h3>

<p>A household softener can also help protect plumbing fixtures, water heaters and appliances from hardness scale. For pet families, this means the same system can support both general household maintenance and pet-care routines.</p>

<h2>Dogs, cats and coat type: what owners may notice</h2>

<table>
  <thead>
    <tr>
      <th>Pet / coat type</th>
      <th>Common bath challenge</th>
      <th>Where softer water may help</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Short-coated dogs</strong></td>
      <td>Shampoo lather and residue</td>
      <td>Easier lathering and rinsing</td>
    </tr>
    <tr>
      <td><strong>Double-coated dogs</strong></td>
      <td>Dense coat takes longer to rinse</td>
      <td>More manageable rinsing and grooming</td>
    </tr>
    <tr>
      <td><strong>Long-haired dogs</strong></td>
      <td>Coat may feel rough or dull after washing</td>
      <td>Less mineral residue after bathing</td>
    </tr>
    <tr>
      <td><strong>Cats that require bathing</strong></td>
      <td>Bathing should be brief and gentle</td>
      <td>More efficient rinsing when a bath is genuinely needed</td>
    </tr>
    <tr>
      <td><strong>Senior or mobility-limited pets</strong></td>
      <td>Long bath sessions can be tiring</td>
      <td>A simpler wash-and-rinse routine can reduce handling time</td>
    </tr>
  </tbody>
</table>

<h2>What a water softener does—and what it does not do</h2>

<p>A water softener is designed to address <strong>hardness</strong>. It is not the same as an RO purifier, sediment filter or microbiological treatment system.</p>

<ul>
  <li><strong>It can:</strong> reduce calcium and magnesium hardness, reduce scale and improve soap performance.</li>
  <li><strong>It does not automatically:</strong> remove every contaminant, disinfect water or diagnose/treat pet skin conditions.</li>
</ul>

<h2>Bathing water and drinking water are separate decisions</h2>

<p>This is important for pet households. A softener can be useful for <strong>bathing, grooming, laundry and household cleaning</strong>, but a pet's drinking-water needs should be considered separately.</p>

<p>If your dog or cat has kidney disease, heart disease, urinary disease, is on a therapeutic diet, or has another medical condition, discuss drinking-water choices with your veterinarian.</p>

<h2>How to know if your home may benefit from a softener</h2>

<p>Before buying any system, look at the household evidence:</p>

<ul>
  <li>Visible white scale on bathroom fixtures</li>
  <li>Poor soap or shampoo lather</li>
  <li>Frequent scale in heaters or appliances</li>
  <li>Stiff laundry or detergent residue</li>
  <li>Borewell or groundwater supply</li>
  <li>A measured hardness test showing elevated hardness</li>
</ul>

<p>Testing the water is more useful than guessing. Once hardness is known, the softener size and regeneration setup can be selected for the actual household requirement.</p>

<h2>Automatic vs manual softeners for pet homes</h2>

<p><strong>Manual softeners</strong> require the user to manage regeneration. They can suit smaller or simpler applications where the household is comfortable handling the process.</p>

<p><strong>Automatic softeners</strong> handle regeneration using a programmed or metered control valve. For busy homes with pets, automatic regeneration can be easier because the system requires less day-to-day attention and provides more consistent soft-water availability.</p>

<h2>A practical PawSattva pet-home routine</h2>

<ol>
  <li><strong>Test the household water.</strong> Know the source and hardness level.</li>
  <li><strong>Observe bath time.</strong> Track lather, rinsing effort and coat feel after drying.</li>
  <li><strong>Keep grooming variables consistent.</strong> Use the same pet-safe shampoo when comparing changes.</li>
  <li><strong>Track the pet separately.</strong> Note diet, weight, body condition, activity and recurring health concerns.</li>
  <li><strong>Seek veterinary help for persistent symptoms.</strong> Do not assume every skin or coat issue is caused by water.</li>
</ol>

<h2>Where AquaKart can help</h2>

<p>If your home has confirmed hard water, <a href="https://aquakart.co.in/category/Softeners" target="_blank" rel="noopener"><strong>AquaKart offers household water-softening solutions</strong></a> for different capacities and use cases, including manual and automatic systems.</p>

<p>The right system depends on water hardness, daily consumption, number of bathrooms, flow requirement and regeneration preference. A properly sized softener is more important than simply choosing the largest unit.</p>

<h2>Where PawSattva fits in</h2>

<p>Water quality is only one part of a pet's overall wellness picture. Nutrition, body condition, exercise, grooming, environment and veterinary health all matter.</p>

<p>Use <a href="/pet-feed"><strong>PawSattva's Pet Feed & Wellness assessment</strong></a> to keep the pet-specific side of the picture organized while AquaKart helps with the household water side.</p>

<blockquote>
  <strong>PawSattva takeaway:</strong> softer water can make pet bathing, grooming, laundry and household cleaning easier—but it should be viewed as a home-care improvement, not as a treatment for disease.
</blockquote>

<h2>Final thought</h2>

<p>A good pet-friendly home is built from many small decisions. If hard water is making bathing, grooming and cleaning unnecessarily difficult, a properly selected water softener can improve the household routine for both people and pets. Pair that with good nutrition, regular grooming and veterinary care, and you have a much more complete wellness environment.</p>
    `.trim())
    setInstagramCaption(
      "Hard water can affect more than taps and tiles 🐾💧 Learn how softer water may make pet bathing, grooming, laundry and home care easier—plus what it does NOT mean for pet drinking water. Read the full PawSattva guide. #PetWellness #DogGrooming #CatCare #HardWater #WaterSoftener"
    )
    setBlogStatus("draft")
    setEditingBlogId(null)
    toast.success("Soft Water & Pets blog template loaded. Add a featured image, category and author, then publish.")
  }

  const loadMediumDogBreedsTemplate = () => {
    const title = "Medium-Sized Dog Breeds: A Practical Guide for Pet Parents"
    const keywords = "medium sized dog breeds, medium dog breeds, medium dogs for families, medium breed dog care, medium dog exercise, medium dog feeding, medium dogs for apartments, active medium dog breeds, medium dog grooming, medium dog nutrition"

    setBlogTitle(title)
    setBlogSlug("medium-sized-dog-breeds-practical-guide-for-pet-parents")
    setBlogKeywords(keywords)
    setBlogExcerpt(
      "Medium-sized dogs can offer a practical balance of strength, trainability and adaptability. Here is how to choose, feed, exercise and care for them well."
    )
    setBlogSeoTitle("Medium-Sized Dog Breeds: Care, Exercise & Feeding Guide")
    setBlogSeoDescription(
      "Explore medium-sized dog breeds, their exercise, feeding, grooming and space needs, plus practical tips for choosing the right companion for your home."
    )
    setBlogSeoKeywords(
      "medium sized dog breeds, medium dog breeds, medium breed dog care, medium dog exercise, medium dog feeding, medium dogs for families, medium dogs for apartments, active medium dog breeds, medium dog grooming, medium dog nutrition"
    )
    setBlogContent(`
<p>Medium-sized dogs are often described as a comfortable middle ground between small companion dogs and larger working or guardian breeds. They can be sturdy enough for active households while still being manageable in many homes, cars and everyday routines.</p>

<p>There is no single universal weight range that defines a “medium-sized” dog. Breed clubs, veterinary references and pet-care websites may use slightly different cut-offs, and individual dogs within the same breed can vary. For practical pet care, it is more useful to look at the dog's <strong>adult body size, body condition, activity level, coat type and lifestyle needs</strong> rather than relying on one number.</p>

<h2>What makes a dog “medium-sized”?</h2>

<p>In everyday use, medium-sized dogs sit between toy or small breeds and large breeds. What matters most is not the label itself, but how the dog's mature size affects:</p>

<ul>
  <li>Daily food requirement</li>
  <li>Exercise and enrichment needs</li>
  <li>Space inside the home</li>
  <li>Ease of travel and handling</li>
  <li>Grooming workload</li>
  <li>Training and behaviour management</li>
</ul>

<p>A lean, athletic medium dog may need far more exercise than a heavier but calmer dog of a similar weight. Size alone should never be used to predict temperament or activity.</p>

<h2>Examples of medium-sized dog breeds</h2>

<p>Dogs commonly described as medium-sized include breeds such as the <strong>Beagle, Cocker Spaniel, Border Collie, Australian Shepherd and English Springer Spaniel</strong>. Depending on the individual dog and the classification being used, some breeds may sit near the small-medium or medium-large boundary.</p>

<p>Mixed-breed dogs can also fall comfortably into this size group. For them, adult size, body condition and behaviour are more useful than trying to force the dog into a breed-based category.</p>

<h2>Why many families consider medium dogs</h2>

<h3>1. A manageable physical size</h3>

<p>Many medium dogs are large enough to enjoy active walks, outdoor play and training sessions without being as physically difficult to handle as some much larger breeds. At the same time, they are usually more substantial than toy breeds.</p>

<h3>2. Wide variety of temperaments</h3>

<p>The medium-size category includes scent hounds, spaniels, herding dogs and companion-type dogs. That means two dogs of similar size can have completely different personalities and daily needs.</p>

<h3>3. Adaptability to different homes</h3>

<p>Some medium-sized dogs can live comfortably in apartments when their exercise and enrichment needs are met. Others are much better suited to homes where they have more room and regular outdoor activity. <strong>Energy level matters more than floor area alone.</strong></p>

<h2>How to choose the right medium-sized dog</h2>

<p>Start with your real routine rather than choosing only by appearance.</p>

<ul>
  <li><strong>Activity:</strong> How much walking, play and training can you provide every day?</li>
  <li><strong>Time alone:</strong> How long will the dog regularly be left without company?</li>
  <li><strong>Children and other pets:</strong> Does the individual dog's temperament fit the household?</li>
  <li><strong>Grooming:</strong> Are you comfortable with brushing, coat maintenance and professional grooming if needed?</li>
  <li><strong>Training:</strong> Can you provide consistent boundaries, socialisation and mental enrichment?</li>
  <li><strong>Budget:</strong> Food, preventive care, grooming, equipment and veterinary costs all continue throughout the dog's life.</li>
</ul>

<h2>Exercise needs: size does not tell the whole story</h2>

<p>One of the biggest mistakes is assuming that every medium-sized dog needs the same amount of exercise. A working or herding breed may need substantial physical activity and structured mental work, while another medium dog may be satisfied with moderate walks and interactive play.</p>

<p>A good routine can include:</p>

<ul>
  <li>Daily walks suited to the dog's age and fitness</li>
  <li>Sniffing and exploration</li>
  <li>Short training sessions</li>
  <li>Food puzzles and enrichment toys</li>
  <li>Safe play with people or compatible dogs</li>
  <li>Rest and recovery between activities</li>
</ul>

<p>Puppies should not simply be exercised like miniature adults. Their activity should be age-appropriate and should avoid repetitive overloading while they are still growing.</p>

<h2>Feeding a medium-sized dog</h2>

<p>Feeding should be based on the individual dog, not only the breed name. Two medium dogs of similar size can have very different calorie needs because of age, neuter status, activity, body composition and health.</p>

<h3>Use body condition, not the feeding chart alone</h3>

<p>Commercial feeding guides are useful starting points, but the dog's body condition should guide adjustments. You should be able to monitor the ribs, waist and abdominal tuck and make gradual changes when needed.</p>

<h3>Choose a life-stage appropriate diet</h3>

<p>Puppies, healthy adults and senior dogs do not have identical nutritional needs. Use a complete and balanced diet appropriate for the dog's life stage and discuss special requirements with a veterinarian or qualified animal-nutrition professional.</p>

<h3>Watch treats and extras</h3>

<p>Treats, table foods, chews and training rewards all add calories. They can quietly push an otherwise appropriate diet above the dog's daily requirement.</p>

<h2>Grooming needs vary enormously</h2>

<p>Medium-sized does not mean medium-maintenance. Coat type is a better predictor of grooming work.</p>

<table>
  <thead>
    <tr>
      <th>Coat type</th>
      <th>Typical care focus</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Short coat</strong></td>
      <td>Regular brushing, skin checks and nail care</td>
    </tr>
    <tr>
      <td><strong>Double coat</strong></td>
      <td>Frequent brushing during shedding periods and thorough drying after baths</td>
    </tr>
    <tr>
      <td><strong>Long or feathered coat</strong></td>
      <td>Tangle prevention, brushing and extra attention around ears, legs and tail</td>
    </tr>
    <tr>
      <td><strong>Curly or continuously growing coat</strong></td>
      <td>Routine brushing and, for some dogs, scheduled professional grooming</td>
    </tr>
  </tbody>
</table>

<h2>Training matters more as strength increases</h2>

<p>A medium-sized dog can be physically powerful enough to pull an adult off balance, jump on visitors or become difficult to manage if basic training is ignored. Early training should focus on practical household skills such as:</p>

<ul>
  <li>Loose-leash walking</li>
  <li>Recall</li>
  <li>Waiting at doors</li>
  <li>Settling calmly</li>
  <li>Handling for grooming and veterinary care</li>
  <li>Appropriate greetings</li>
</ul>

<p>Reward-based, consistent training helps the dog understand what is expected without relying on intimidation.</p>

<h2>Apartment living with a medium-sized dog</h2>

<p>A medium dog can live successfully in an apartment when its physical and behavioural needs are met. A large house does not automatically create a well-exercised dog, and an apartment does not automatically create an inactive one.</p>

<p>Before choosing a dog for apartment life, consider barking tendency, energy level, access to safe walking areas, elevator or stair use, toilet routine and how easily the dog settles indoors.</p>

<h2>Health and preventive care</h2>

<p>Preventive care should be individualised with your veterinarian. Routine priorities generally include vaccination where appropriate, parasite control, dental care, healthy body condition, nail care and prompt attention to changes in appetite, mobility, skin, coat or behaviour.</p>

<p>Breed can influence health risks, but individual dogs should not be assumed to have a condition simply because of their breed. Ask about responsible breeding, family history and recommended screening when considering a pedigree puppy.</p>

<h2>Common mistakes with medium-sized dogs</h2>

<ul>
  <li>Choosing by appearance without researching temperament and energy</li>
  <li>Underestimating exercise or mental-enrichment needs</li>
  <li>Overfeeding because the dog “looks hungry”</li>
  <li>Allowing gradual weight gain to go unnoticed</li>
  <li>Skipping leash and recall training</li>
  <li>Assuming apartment living is impossible purely because of size</li>
  <li>Assuming every medium dog will be naturally good with children or other pets</li>
</ul>

<h2>A simple PawSattva checklist</h2>

<ol>
  <li><strong>Know the individual dog.</strong> Breed gives clues, not guarantees.</li>
  <li><strong>Match energy to lifestyle.</strong> Be realistic about daily exercise.</li>
  <li><strong>Feed to body condition.</strong> Adjust portions as the dog changes.</li>
  <li><strong>Train practical skills early.</strong> A manageable dog is easier to include in family life.</li>
  <li><strong>Plan grooming by coat type.</strong> Size alone does not predict coat maintenance.</li>
  <li><strong>Keep preventive care consistent.</strong> Small problems are easier to address early.</li>
</ol>

<h2>Where PawSattva can help</h2>

<p>If you already have a medium-sized dog, PawSattva can help you organise the nutrition side of everyday care. Use the <a href="/pet-feed"><strong>PawSattva Pet Feed & Wellness assessment</strong></a> to record your dog's breed, life stage, weight, activity and feeding routine.</p>

<blockquote>
  <strong>PawSattva takeaway:</strong> the best medium-sized dog is not the one that fits a number on a chart. It is the dog whose temperament, activity, care needs and long-term costs fit your household.
</blockquote>

<h2>Final thought</h2>

<p>Medium-sized dogs are incredibly diverse. Some are relaxed companions, while others are energetic workers that need daily challenges. Choosing well means looking beyond size and asking a better question: <strong>Can I meet this individual dog's physical, nutritional, behavioural and grooming needs for life?</strong></p>
    `.trim())
    setInstagramCaption(
      "Thinking about a medium-sized dog? 🐾 Size is only the beginning. Exercise, temperament, feeding, grooming and training needs can vary hugely between breeds. Read the new PawSattva guide. #MediumDogs #DogCare #PetNutrition #DogTraining #PawSattva"
    )
    setBlogStatus("draft")
    setEditingBlogId(null)
    toast.success("Medium-Sized Dog Breeds template loaded. Review the SEO, choose category/author and publish when ready.")
  }

  useEffect(() => {
    if (initialTab !== "blog" || !initialBlogPrefill?.template) return
    if (initialBlogPrefill.template === "soft-water-pets") loadSoftWaterPetsTemplate()
    else if (initialBlogPrefill.template === "medium-dog-breeds") loadMediumDogBreedsTemplate()
    else return

    const title = initialBlogPrefill.title?.trim()
    const description = initialBlogPrefill.description?.trim()
    const excerpt = initialBlogPrefill.excerpt?.trim()
    const keywords = initialBlogPrefill.keywords?.trim()
    const seoTitle = initialBlogPrefill.seoTitle?.trim()
    const seoDescription = initialBlogPrefill.seoDescription?.trim() || description
    const seoKeywords = initialBlogPrefill.seoKeywords?.trim() || keywords
    const content = initialBlogPrefill.content?.trim()
    const image = initialBlogPrefill.image?.trim()

    if (title) {
      setBlogTitle(title)
      setBlogSlug(generateSlug(title))
    }
    if (excerpt) setBlogExcerpt(excerpt)
    if (keywords) setBlogKeywords(keywords)
    if (seoTitle) setBlogSeoTitle(seoTitle)
    if (seoDescription) setBlogSeoDescription(seoDescription)
    if (seoKeywords) setBlogSeoKeywords(seoKeywords)
    if (content) setBlogContent(content)
    if (image) setBlogImage(image)

    // URL template requests should only hydrate once per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // JSON import from the Tips panel: start a fresh draft, apply a template if named, then the JSON fields
  const importBlogFromJson = (data: BlogImportData) => {
    resetBlogForm()
    if (data.template === "soft-water-pets") loadSoftWaterPetsTemplate()
    else if (data.template === "medium-dog-breeds") loadMediumDogBreedsTemplate()

    const description = data.description?.trim() || ""
    const keywords = data.keywords?.trim() || ""
    const title = data.title?.trim() || ""
    if (title) {
      setBlogTitle(title)
      setBlogSlug(generateSlug(title))
    }
    if (data.excerpt || description) setBlogExcerpt(data.excerpt?.trim() || description)
    if (keywords) setBlogKeywords(keywords)
    if (data.seoTitle || title) setBlogSeoTitle(data.seoTitle?.trim() || title)
    if (data.seoDescription || description) setBlogSeoDescription(data.seoDescription?.trim() || description)
    if (data.seoKeywords || keywords) setBlogSeoKeywords(data.seoKeywords?.trim() || keywords)
    if (data.content) setBlogContent(data.content.trim())
    if (data.image) setBlogImage(data.image.trim())
    setBlogStatus("draft")
    setEditingBlogId(null)
    handleTabChange("blog")
    toast.success("Blog imported from JSON. Pick a category and author, then review before publishing.")
  }

  // Shared by the Tips panel (writing checks) and the JSON export
  const blogFormValues = {
    title: blogTitle,
    excerpt: blogExcerpt,
    keywords: blogKeywords,
    seoTitle: blogSeoTitle,
    seoDescription: blogSeoDescription,
    seoKeywords: blogSeoKeywords,
    content: blogContent,
    image: blogImage,
  }

  const resetBlogForm = () => {
    setBlogTitle(""); setBlogSlug(""); setBlogKeywords(""); setBlogExcerpt("")
    setBlogSeoTitle(""); setBlogSeoDescription(""); setBlogSeoKeywords("")
    setBlogImage(""); setBlogContent(""); setBlogCategories([])
    setInstagramAutoPost(false); setInstagramCaption("")
    setBlogAuthorId(""); setBlogStatus("draft"); setEditingBlogId(null)
  }

  const handleBlogSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!blogTitle || !blogContent || blogCategories.length === 0) {
      toast.error("Please fill in all required fields and select at least one category.")
      return
    }
    const imageProblem = imageUrlProblem(blogImage)
    if (imageProblem) {
      toast.error(`Featured image: ${imageProblem}`)
      return
    }
    try {
      setIsSavingBlog(true)
      const selectedAuthor = authors.find(a => a.id === blogAuthorId)
      const nextStatus = isAuthor && blogStatus === "published" ? "pending_review" : blogStatus
      const blogData = {
        title: blogTitle, slug: blogSlug, keywords: blogKeywords,
        excerpt: blogExcerpt, image: blogImage, content: blogContent,
        seo: {
          title: blogSeoTitle.trim() || blogTitle.trim(),
          description: blogSeoDescription.trim() || blogExcerpt.trim(),
          keywords: (blogSeoKeywords.trim() || blogKeywords)
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean),
          canonicalUrl: `https://pawsattva.com/blog/${blogSlug}`,
          robots: "index,follow",
          image: blogImage,
          ogTitle: blogSeoTitle.trim() || blogTitle.trim(),
          ogDescription: blogSeoDescription.trim() || blogExcerpt.trim(),
          ogImage: blogImage,
          twitterTitle: blogSeoTitle.trim() || blogTitle.trim(),
          twitterDescription: blogSeoDescription.trim() || blogExcerpt.trim(),
          twitterImage: blogImage,
        },
        categoryId: blogCategories[0], categoryIds: blogCategories,
        authorId: isAuthor ? user?.uid : blogAuthorId,
        authorName: isAuthor ? (user?.displayName || user?.email || "Author") : selectedAuthor?.displayName || selectedAuthor?.email || "Unknown Author",
        status: nextStatus as Blog["status"],
        instagramAutoPost,
        instagramCaption: instagramCaption.trim(),
        ...(nextStatus === "pending_review" ? { reviewRequestedAt: new Date() } : {}),
        ...(instagramAutoPost && nextStatus === "published" ? { instagramPostStatus: "pending" as const } : {}),
      }
      let persistedBlogId = editingBlogId
      if (editingBlogId) {
        await updateBlog(editingBlogId, blogData)
        toast.success(`"${blogTitle}" updated.`)
      } else {
        const created = await addBlog(blogData)
        persistedBlogId = created.id
        toast.success(isAuthor && blogStatus === "published" ? `"${blogTitle}" sent to admin for publishing.` : `"${blogTitle}" saved as ${blogStatus}.`)
      }

      if (persistedBlogId && nextStatus === "published" && instagramAutoPost) {
        if (!blogImage) {
          toast.warning("Instagram sync skipped: featured image URL is required.")
        } else {
          const igRes = await fetch("/api/instagram/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: blogImage, caption: instagramCaption.trim() }),
          })
          const igData = await igRes.json().catch(() => ({}))
          if (igRes.ok && igData?.id) {
            await updateBlog(persistedBlogId, {
              instagramPostId: igData.id as string,
              instagramPostStatus: "posted",
              instagramPostError: "",
            })
            toast.success("Published to Instagram successfully.")
          } else {
            await updateBlog(persistedBlogId, {
              instagramPostStatus: "failed",
              instagramPostError: typeof igData?.error === "string" ? igData.error : "Instagram publish failed",
            })
            toast.warning("Blog published, but Instagram publish failed.")
          }
        }
      }

      resetBlogForm()
      clearDraft()
      handleTabChange("blog-list")
    } catch {
      toast.error("Failed to save blog post.")
    } finally {
      setIsSavingBlog(false)
    }
  }

  const handleFeaturedImageUpload = async (file: File) => {
    try {
      setUploadingFeaturedImage(true)
      const { uploadBlogImage } = await import("@/lib/image-upload")
      const result = await uploadBlogImage(file, { folder: "blog-featured-images", targetKB: 240 })
      setBlogImage(result.url)
      toast.success(
        result.wasCompressed
          ? `Image uploaded (${result.originalKB}KB → ${result.compressedKB}KB).`
          : `Image uploaded (${result.compressedKB}KB).`
      )
    } catch {
      toast.error("Image upload failed. Please try again.")
    } finally {
      setUploadingFeaturedImage(false)
    }
  }

  const handleEditBlog = (blog: Blog) => {
    setBlogTitle(blog.title); setBlogSlug(blog.slug)
    setBlogKeywords(blog.keywords || ""); setBlogExcerpt(blog.excerpt || "")
    setBlogSeoTitle(blog.seo?.title || blog.title)
    setBlogSeoDescription(blog.seo?.description || blog.excerpt || "")
    setBlogSeoKeywords(blog.seo?.keywords?.join(", ") || blog.keywords || "")
    setBlogImage(blog.image || ""); setBlogContent(blog.content)
    setInstagramAutoPost(Boolean(blog.instagramAutoPost)); setInstagramCaption(blog.instagramCaption || "")
    setBlogCategories(blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : [])
    setBlogAuthorId(blog.authorId || ""); setBlogStatus(blog.status === "published" || blog.status === "pending_review" ? "published" : "draft")
    setEditingBlogId(blog.id)
    handleTabChange("blog")
  }

  const handleDeleteBlog = async (id: string) => {
    try {
      if (isAuthor && user?.uid) {
        await requestBlogDelete(id, user.uid)
        toast.success("Delete request sent to admin.")
        return
      }
      await deleteBlog(id)
      toast.success("Blog post deleted.")
    } catch {
      toast.error("Failed to delete blog post.")
    }
  }

  const handleApproveBlog = async (id: string) => {
    if (!user?.uid) return
    try {
      await approveBlog(id, user.uid)
      toast.success("Blog approved and published.")
    } catch { toast.error("Failed to approve blog.") }
  }

  const handleRejectDeleteRequest = async (id: string) => {
    try {
      await rejectBlogDeleteRequest(id)
      toast.success("Delete request rejected.")
    } catch { toast.error("Failed to reject delete request.") }
  }

  // ── Category handlers ─────────────────────────────────────────────────────
  const resetCategoryForm = () => {
    setCategoryName(""); setCategoryDesc(""); setCategoryParentId("")
    setCategoryImage(""); setCategoryImageUploadProgress(0)
    setCategoryStatus("published"); setEditingCategoryId(null)
  }

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!categoryName) { toast.error("Category name is required."); return }
    try {
      const catData = {
        name: categoryName, description: categoryDesc,
        imageUrl: categoryImage || undefined,
        parentId: categoryParentId && categoryParentId !== "none" ? categoryParentId : undefined,
        status: categoryStatus as "published" | "draft",
      }
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, catData)
        toast.success(`"${categoryName}" updated.`)
        setEditingCategoryId(null)
      } else {
        await addCategory(catData)
        toast.success(`"${categoryName}" created.`)
      }
      resetCategoryForm()
      setCategories(await getCategories())
      handleTabChange(catData.parentId ? "sub-category-list" : "category-list")
    } catch {
      toast.error("Failed to save category.")
    }
  }

  const handleEditCategory = (cat: Category) => {
    setCategoryName(cat.name); setCategoryDesc(cat.description || "")
    setCategoryImage(cat.imageUrl || "")
    setCategoryParentId(cat.parentId || ""); setCategoryStatus(cat.status || "published")
    setEditingCategoryId(cat.id)
    handleTabChange(cat.parentId ? "sub-category" : "category")
  }

  const handleCategoryImageUpload = async (file: File, isSubCategory: boolean) => {
    try {
      setUploadingCategoryImage(true)
      setCategoryImageUploadProgress(0)
      const { uploadBlogImage } = await import("@/lib/image-upload")
      const result = await uploadBlogImage(file, {
        folder: isSubCategory ? "subcategory-images" : "category-images",
        targetKB: 180,
        onProgress: setCategoryImageUploadProgress,
      })
      setCategoryImage(result.url)
      toast.success(
        result.wasCompressed
          ? `Category image uploaded (${result.originalKB}KB → ${result.compressedKB}KB).`
          : `Category image uploaded (${result.compressedKB}KB).`
      )
    } catch {
      toast.error("Category image upload failed.")
    } finally {
      setUploadingCategoryImage(false)
      setCategoryImageUploadProgress(0)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    const relatedSubs = categories.filter(c => c.parentId === id)
    if (relatedSubs.length > 0) {
      setPendingDeletionCheck({ id, name, subs: relatedSubs }); return
    }
    try {
      await deleteCategory(id); toast.success("Category deleted.")
      setCategories(await getCategories())
    } catch { toast.error("Failed to delete category.") }
  }

  const confirmDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id); toast.success("Category deleted.")
      setPendingDeletionCheck(null)
      setCategories(await getCategories())
    } catch { toast.error("Failed to delete category.") }
  }

  // ── User handlers ─────────────────────────────────────────────────────────
  const handleEditUser = (u: UserProfile) => {
    setEditingUserId(u.id); setEditUserName(u.displayName || "")
    setEditUserEmail(u.email); setEditUserPhone(u.phone || "")
  }

  const handleSaveUser = async () => {
    if (!editingUserId) return
    try {
      await updateUser(editingUserId, { displayName: editUserName, email: editUserEmail, phone: editUserPhone })
      toast.success("User updated."); setEditingUserId(null)
    } catch { toast.error("Failed to update user.") }
  }

  const handleChangeUserRole = async (userId: string, nextRole: NonNullable<UserProfile["role"]>) => {
    try {
      await updateUserRole(userId, nextRole)
      toast.success("User role updated.")
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Failed to update user role: ${msg}`)
    }
  }

  const handleToggleUserBlacklist = async (profile: UserProfile, blacklisted: boolean) => {
    if (profile.id === user?.uid) { toast.error("You cannot blacklist your own account."); return }
    try {
      await setUserBlacklisted(profile, blacklisted)
      toast.success(blacklisted ? "User blacklisted." : "User removed from blacklist.")
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Failed to update blacklist: ${msg}`)
    }
  }

  const handleDeleteUserAccount = async (userId: string) => {
    try {
      await deleteUser(userId); toast.success("User deleted.")
    } catch { toast.error("Failed to delete user.") }
  }

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (authLoading || (!isAdmin && !authLoading) || loadingData) {
    return <AdminLoader img={Paw} />
  }

  return (
    <div className={`flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-8 pt-24 ${activeTab === "blog" ? "pb-4" : "pb-6 md:pb-12"}`}>

      {/* ── Mobile page header (desktop shows it above the sidebar menu; hidden on the editor) ── */}
      <div className={`mb-6 flex-col gap-2 md:hidden ${activeTab === "blog" ? "hidden" : "flex"}`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 w-fit border border-orange-500/20 text-xs font-semibold tracking-widest uppercase">
          <Settings2 className="w-3.5 h-3.5" />
          Administration
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400">
          Content Hub
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          {isFullAdmin
            ? "Plan content goals, manage articles, categories, and view platform analytics."
            : "Create posts and categories. Publishing and deletion are sent to admin for approval."}
        </p>
      </div>

      {/* ── Mobile nav ── */}
      <div className="md:hidden mb-6">
        <AdminNav activeTab={activeTab} onTabChange={handleTabChange} role={isAuthor ? "author" : "admin"} />
      </div>

      {/* ── Body: sidebar + content ── */}
      <div className="flex gap-4 sm:gap-6 md:gap-8 items-start">
        {/* Sidebar (desktop only) */}
        <AdminNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          role={isAuthor ? "author" : "admin"}
          header={
            <>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] font-semibold tracking-widest uppercase">
                <Settings2 className="w-3 h-3" />
                Administration
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400">
                Content Hub
              </h1>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {isFullAdmin
                  ? "Plan goals, manage articles & categories, view analytics."
                  : "Publishing and deletion are sent to admin for approval."}
              </p>
            </>
          }
        />

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <style>{`
            @keyframes tab-enter {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            .tab-panel { animation: tab-enter 0.25s ease-out; }
          `}</style>

          {(activeTab === "blog-list" || activeTab === "blog") && (
            <>
              <BlogToolbar
                activeTab={activeTab}
                onNavigate={handleTabChange}
                onOpenTips={() => setBlogTipsOpen(true)}
                onOpenImport={() => openBlogJson("import")}
                onOpenExport={() => openBlogJson("export")}
              />
              <BlogUrlGuide
                open={blogTipsOpen}
                onOpenChange={setBlogTipsOpen}
                values={blogFormValues}
                onOpenImport={() => openBlogJson("import")}
                showDraftTools={activeTab === "blog"}
              />
              <BlogJsonDialog
                open={blogJsonOpen}
                onOpenChange={setBlogJsonOpen}
                mode={activeTab === "blog" ? blogJsonMode : "import"}
                onModeChange={setBlogJsonMode}
                values={blogFormValues}
                onImportJson={importBlogFromJson}
                editorHasContent={hasDraftContent() || editingBlogId !== null}
              />
            </>
          )}

          {activeTab === "blog-list" && (
            <div className="tab-panel">
              <BlogListTab
                blogs={blogs}
                onCreate={() => handleTabChange("blog")}
                filteredBlogs={filteredBlogsList}
                searchQuery={blogSearchQuery}
                setSearchQuery={setBlogSearchQuery}
                getCategoryName={getCategoryName}
                handleEditBlog={handleEditBlog}
                handleDeleteBlog={handleDeleteBlog}
                handleApproveBlog={isFullAdmin ? handleApproveBlog : undefined}
                handleRejectDeleteRequest={isFullAdmin ? handleRejectDeleteRequest : undefined}
                isAuthor={isAuthor}
              />
            </div>
          )}

          {isFullAdmin && activeTab === "content-goals" && (
            <div className="tab-panel">
              <ContentGoalsTab currentUser={user} />
            </div>
          )}

          {activeTab === "blog" && (
            <div className="tab-panel">
              <BlogFormTab
                blogTitle={blogTitle}
                blogSlug={blogSlug} setBlogSlug={setBlogSlug}
                blogKeywords={blogKeywords} setBlogKeywords={setBlogKeywords}
                blogExcerpt={blogExcerpt} setBlogExcerpt={setBlogExcerpt}
                blogSeoTitle={blogSeoTitle} setBlogSeoTitle={setBlogSeoTitle}
                blogSeoDescription={blogSeoDescription} setBlogSeoDescription={setBlogSeoDescription}
                blogSeoKeywords={blogSeoKeywords} setBlogSeoKeywords={setBlogSeoKeywords}
                blogImage={blogImage} setBlogImage={setBlogImage}
                handleFeaturedImageUpload={handleFeaturedImageUpload}
                uploadingFeaturedImage={uploadingFeaturedImage}
                blogContent={blogContent} setBlogContent={setBlogContent}
                blogCategories={blogCategories} setBlogCategories={setBlogCategories}
                blogAuthorId={blogAuthorId} setBlogAuthorId={setBlogAuthorId}
                blogStatus={blogStatus} setBlogStatus={setBlogStatus}
                instagramAutoPost={instagramAutoPost} setInstagramAutoPost={setInstagramAutoPost}
                instagramCaption={instagramCaption} setInstagramCaption={setInstagramCaption}
                editingBlogId={editingBlogId}
                categories={categories}
                authors={authors}
                savedDraft={savedDraft}
                hasDraftContent={hasDraftContent}
                restoreDraft={restoreDraft}
                discardDraft={discardDraft}
                formatDraftTime={formatDraftTime}
                handleBlogSubmit={handleBlogSubmit}
                isSavingBlog={isSavingBlog}
                handleTitleChange={handleTitleChange}
                onLoadSoftWaterPetsTemplate={loadSoftWaterPetsTemplate}
                onCancel={() => { resetBlogForm(); handleTabChange("blog-list") }}
              />
            </div>
          )}

          {activeTab === "category-list" && (
            <div className="tab-panel space-y-4 sm:space-y-6">
              <CategoryListTab
                categories={categories}
                postCounts={categoryPostCounts}
                onCreate={() => { resetCategoryForm(); handleTabChange("category") }}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
              />
            </div>
          )}

          {activeTab === "category" && (
            <div className="tab-panel">
                <CategoryFormTab
                  isSubCategory={false}
                  categoryName={categoryName} setCategoryName={setCategoryName}
                  categoryDesc={categoryDesc} setCategoryDesc={setCategoryDesc}
                  categoryImage={categoryImage} setCategoryImage={setCategoryImage}
                  uploadingCategoryImage={uploadingCategoryImage}
                  categoryImageUploadProgress={categoryImageUploadProgress}
                  handleCategoryImageUpload={(file) => handleCategoryImageUpload(file, false)}
                  categoryParentId={categoryParentId} setCategoryParentId={setCategoryParentId}
                  categoryStatus={categoryStatus} setCategoryStatus={setCategoryStatus}
                  editingCategoryId={editingCategoryId}
                categories={categories}
                handleCategorySubmit={handleCategorySubmit}
                onCancel={() => { resetCategoryForm(); handleTabChange("category-list") }}
              />
            </div>
          )}

          {activeTab === "sub-category-list" && (
            <div className="tab-panel space-y-4 sm:space-y-6">
              <SubCategoryListTab
                categories={categories}
                postCounts={categoryPostCounts}
                onCreate={() => { resetCategoryForm(); handleTabChange("sub-category") }}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
              />
            </div>
          )}

          {activeTab === "sub-category" && (
            <div className="tab-panel">
                <CategoryFormTab
                  isSubCategory={true}
                  categoryName={categoryName} setCategoryName={setCategoryName}
                  categoryDesc={categoryDesc} setCategoryDesc={setCategoryDesc}
                  categoryImage={categoryImage} setCategoryImage={setCategoryImage}
                  uploadingCategoryImage={uploadingCategoryImage}
                  categoryImageUploadProgress={categoryImageUploadProgress}
                  handleCategoryImageUpload={(file) => handleCategoryImageUpload(file, true)}
                  categoryParentId={categoryParentId} setCategoryParentId={setCategoryParentId}
                  categoryStatus={categoryStatus} setCategoryStatus={setCategoryStatus}
                  editingCategoryId={editingCategoryId}
                categories={categories}
                handleCategorySubmit={handleCategorySubmit}
                onCancel={() => { resetCategoryForm(); handleTabChange("sub-category-list") }}
              />
            </div>
          )}

          {isFullAdmin && activeTab === "page-seo" && (
            <div className="tab-panel">
              <PageSeoTab />
            </div>
          )}

          {isFullAdmin && activeTab === "analytics" && (
            <div className="tab-panel">
              <AnalyticsTab
                users={users}
                subscribers={subscribers}
                blogs={blogs}
                totalPetFeeds={totalPetFeeds}
              />
            </div>
          )}

          {isFullAdmin && activeTab === "subscribers" && (
            <div className="tab-panel">
              <SubscribersTab subscribers={subscribers} />
            </div>
          )}

          {isFullAdmin && activeTab === "vet-hospitals" && (
            <div className="tab-panel">
              <VetHospitalsTab />
            </div>
          )}

          {isFullAdmin && activeTab === "users" && (
            <div className="tab-panel">
              <UsersTab
                users={users}
                filteredUsers={filteredUsers}
                totalPetFeeds={totalPetFeeds}
                userSearchQuery={userSearchQuery}
                setUserSearchQuery={setUserSearchQuery}
                editingUserId={editingUserId}
                editUserName={editUserName} setEditUserName={setEditUserName}
                editUserEmail={editUserEmail} setEditUserEmail={setEditUserEmail}
                editUserPhone={editUserPhone} setEditUserPhone={setEditUserPhone}
                expandedUserId={expandedUserId} setExpandedUserId={setExpandedUserId}
                currentUserId={user?.uid}
                handleEditUser={handleEditUser}
                handleSaveUser={handleSaveUser}
                setEditingUserId={setEditingUserId}
                handleChangeUserRole={handleChangeUserRole}
                handleDeleteUserAccount={handleDeleteUserAccount}
                handleToggleUserBlacklist={handleToggleUserBlacklist}
                currentUserEmail={user?.email ?? undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Category deletion guard dialog ── */}
      <AlertDialog open={!!pendingDeletionCheck} onOpenChange={(open) => !open && setPendingDeletionCheck(null)}>
        <AlertDialogContent className="rounded-[2rem] sm:rounded-[2.5rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/95 dark:bg-black/95 shadow-2xl p-0 overflow-hidden max-w-lg mx-4 sm:mx-auto">
          <div className="p-5 sm:p-8 pb-4 sm:pb-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="p-2.5 sm:p-3 bg-destructive/10 rounded-xl sm:rounded-2xl border border-destructive/20">
                <Trash2 className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl sm:text-2xl font-bold">Cannot Delete Category</AlertDialogTitle>
                <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground mt-1">
                  &quot;{pendingDeletionCheck?.name}&quot; has active sub-categories.
                </AlertDialogDescription>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80">Related Sub-Categories:</p>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                {pendingDeletionCheck?.subs.map(sub => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40"
                  >
                    <ChevronRight className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold">{sub.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <AlertDialogFooter className="p-5 sm:p-8 pt-0 gap-3 border-t border-border/40">
            <AlertDialogCancel className="h-11 rounded-xl bg-muted/50 border-0 hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <Button
              className="h-11 px-6 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold border-0"
              onClick={() => pendingDeletionCheck && confirmDeleteCategory(pendingDeletionCheck.id)}
            >
              Delete Anyway
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
