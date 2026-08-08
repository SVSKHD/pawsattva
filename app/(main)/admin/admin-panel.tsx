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
  getCategories, addCategory, updateCategory, deleteCategory,
  getAdminUsers, getSubscriptions,
  onUsersSnapshot, onBlogsSnapshot, updateUserRole, updateUser, deleteUser,
  Blog, Category, UserProfile, Subscription
} from "@/firebase/firestore"

import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { AdminNav } from "./components/AdminNav"
import { BlogListTab } from "./components/BlogListTab"

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
const UsersTab = dynamic(
  () => import("./components/UsersTab").then((mod) => mod.UsersTab),
  { loading: TabLoading }
)

// ── Constants ────────────────────────────────────────────────────────────────

const DRAFT_KEY = "pawsattva_blog_draft"

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Unauthorized access. Admin privileges required.")
      router.push("/")
    }
  }, [authLoading, isAdmin, router])

  // ── Navigation state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("blog-list")

  const handleTabChange = (tab: string) => {
    startTransition(() => setActiveTab(tab))
  }

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
    if (!isAdmin || (activeTab !== "users" && activeTab !== "analytics")) return
    return onUsersSnapshot(setUsers)
  }, [activeTab, isAdmin])

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
    if (!isAdmin || !needsSubscribers || subscriptionsLoadedRef.current) return
    subscriptionsLoadedRef.current = true
    getSubscriptions().then(setSubscribers).catch(() => {
      subscriptionsLoadedRef.current = false
      toast.error("Failed to load subscribers.")
    })
  }, [activeTab, isAdmin])

  // ── Blog form state ───────────────────────────────────────────────────────
  const [blogTitle, setBlogTitle] = useState("")
  const [blogSlug, setBlogSlug] = useState("")
  const [blogKeywords, setBlogKeywords] = useState("")
  const [blogExcerpt, setBlogExcerpt] = useState("")
  const [blogImage, setBlogImage] = useState("")
  const [blogContent, setBlogContent] = useState("")
  const [blogCategories, setBlogCategories] = useState<string[]>([])
  const [blogAuthorId, setBlogAuthorId] = useState("")
  const [blogStatus, setBlogStatus] = useState<"published" | "draft">("draft")
  const [instagramAutoPost, setInstagramAutoPost] = useState(false)
  const [instagramCaption, setInstagramCaption] = useState("")
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null)
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false)

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
      blogTitle, blogSlug, blogKeywords, blogExcerpt, blogImage,
      blogContent, blogCategories, blogAuthorId, blogStatus,
      instagramAutoPost, instagramCaption, editingBlogId,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    setSavedDraft({ savedAt: draft.savedAt })
  }, [blogTitle, blogSlug, blogKeywords, blogExcerpt, blogImage, blogContent, blogCategories, blogAuthorId, blogStatus, instagramAutoPost, instagramCaption, editingBlogId])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    setSavedDraft(null)
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw)
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

  const [blogSearchQuery, setBlogSearchQuery] = useState("")
  const filteredBlogsList = useMemo(() => {
    const query = blogSearchQuery.toLowerCase()
    return blogs.filter((blog) => blog.title.toLowerCase().includes(query))
  }, [blogSearchQuery, blogs])
  const filteredUsers = useMemo(() => {
    const query = userSearchQuery.toLowerCase()
    return users.filter((profile) =>
      (profile.displayName || "").toLowerCase().includes(query) ||
      profile.email.toLowerCase().includes(query)
    )
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

  const resetBlogForm = () => {
    setBlogTitle(""); setBlogSlug(""); setBlogKeywords(""); setBlogExcerpt("")
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
    try {
      const selectedAuthor = authors.find(a => a.id === blogAuthorId)
      const blogData = {
        title: blogTitle, slug: blogSlug, keywords: blogKeywords,
        excerpt: blogExcerpt, image: blogImage, content: blogContent,
        categoryId: blogCategories[0], categoryIds: blogCategories,
        authorId: blogAuthorId,
        authorName: selectedAuthor?.displayName || selectedAuthor?.email || "Unknown Author",
        status: blogStatus as "published" | "draft",
        instagramAutoPost,
        instagramCaption: instagramCaption.trim(),
        instagramPostStatus: instagramAutoPost && blogStatus === "published" ? "pending" as const : undefined,
      }
      let persistedBlogId = editingBlogId
      if (editingBlogId) {
        await updateBlog(editingBlogId, blogData)
        toast.success(`"${blogTitle}" updated.`)
      } else {
        const created = await addBlog(blogData)
        persistedBlogId = created.id
        toast.success(`"${blogTitle}" saved as ${blogStatus}.`)
      }

      if (persistedBlogId && blogStatus === "published" && instagramAutoPost) {
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
    setBlogImage(blog.image || ""); setBlogContent(blog.content)
    setInstagramAutoPost(Boolean(blog.instagramAutoPost)); setInstagramCaption(blog.instagramCaption || "")
    setBlogCategories(blog.categoryIds?.length ? blog.categoryIds : blog.categoryId ? [blog.categoryId] : [])
    setBlogAuthorId(blog.authorId || ""); setBlogStatus(blog.status)
    setEditingBlogId(blog.id)
    handleTabChange("blog")
  }

  const handleDeleteBlog = async (id: string) => {
    try {
      await deleteBlog(id)
      toast.success("Blog post deleted.")
    } catch {
      toast.error("Failed to delete blog post.")
    }
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

  const handleToggleAdmin = async (userId: string, targetState: boolean) => {
    try {
      await updateUserRole(userId, targetState)
      toast.success("User role updated.")
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Failed to update user role: ${msg}`)
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
    <div className="flex-1 w-full max-w-7xl mx-auto px-3 py-6 sm:px-4 sm:py-8 md:px-8 md:py-12">

      {/* ── Page header ── */}
      <div className="mt-20 sm:mt-20 mb-6 sm:mb-8 flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 w-fit border border-orange-500/20 text-xs font-semibold tracking-widest uppercase">
          <Settings2 className="w-3.5 h-3.5" />
          Administration
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400">
          Content Hub
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
          Plan content goals, manage articles, categories, and view platform analytics.
        </p>
      </div>

      {/* ── Mobile nav ── */}
      <div className="md:hidden mb-6">
        <AdminNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* ── Body: sidebar + content ── */}
      <div className="flex gap-4 sm:gap-6 md:gap-8 items-start">
        {/* Sidebar (desktop only) */}
        <AdminNav activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <style>{`
            @keyframes tab-enter {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .tab-panel { animation: tab-enter 0.25s ease-out; }
          `}</style>

          {activeTab === "blog-list" && (
            <div className="tab-panel space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Blog Posts</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    <span className="font-semibold text-emerald-600">{blogs.filter(b => b.status === "published").length} published</span>
                    {" · "}
                    <span className="font-semibold text-amber-600">{blogs.filter(b => b.status === "draft").length} drafts</span>
                  </p>
                </div>
                <Button
                  onClick={() => handleTabChange("blog")}
                  className="h-9 sm:h-10 px-3 sm:px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold border-0 shadow-lg shadow-orange-500/20 text-xs sm:text-sm shrink-0"
                >
                  + New Post
                </Button>
              </div>
              <BlogListTab
                blogs={blogs}
                filteredBlogs={filteredBlogsList}
                searchQuery={blogSearchQuery}
                setSearchQuery={setBlogSearchQuery}
                getCategoryName={getCategoryName}
                handleEditBlog={handleEditBlog}
                handleDeleteBlog={handleDeleteBlog}
              />
            </div>
          )}

          {activeTab === "content-goals" && (
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
                handleTitleChange={handleTitleChange}
                onCancel={() => { resetBlogForm(); handleTabChange("blog-list") }}
              />
            </div>
          )}

          {activeTab === "category-list" && (
            <div className="tab-panel space-y-4 sm:space-y-6">
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={() => { resetCategoryForm(); handleTabChange("category") }}
                  className="h-9 sm:h-10 px-3 sm:px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold border-0 shadow-lg shadow-orange-500/20 text-xs sm:text-sm"
                >
                  + New Category
                </Button>
              </div>
              <CategoryListTab
                categories={categories}
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
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={() => { resetCategoryForm(); handleTabChange("sub-category") }}
                  className="h-9 sm:h-10 px-3 sm:px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold border-0 shadow-lg shadow-orange-500/20 text-xs sm:text-sm"
                >
                  + New Sub-Category
                </Button>
              </div>
              <SubCategoryListTab
                categories={categories}
                getCategoryName={getCategoryName}
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

          {activeTab === "page-seo" && (
            <div className="tab-panel">
              <PageSeoTab />
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="tab-panel">
              <AnalyticsTab
                users={users}
                subscribers={subscribers}
                blogs={blogs}
                totalPetFeeds={totalPetFeeds}
              />
            </div>
          )}

          {activeTab === "subscribers" && (
            <div className="tab-panel">
              <SubscribersTab subscribers={subscribers} />
            </div>
          )}

          {activeTab === "users" && (
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
                handleToggleAdmin={handleToggleAdmin}
                handleDeleteUserAccount={handleDeleteUserAccount}
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
