"use client"

import { useState, useTransition, useEffect, useRef, useCallback } from "react"
import NextImage from "next/image"
import Paw from "../../pawsattva.png"
import {
  PlusCircle,
  FileText,
  FolderPlus,
  Save,
  Settings2,
  CheckCircle2,
  CircleDashed,
  Image as ImageIcon,
  UploadCloud,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  ChevronRight,
  BarChart3,
  Users,
  Heart,
  Share2,
  Eye,
  TrendingUp,
  Activity,
  MousePointerClick,
  CalendarDays,
  Zap,
  History,
  Mail,
  Phone,
  Dog,
  ShoppingBag,
  Clock,
  PawPrint
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Editor from "@/components/editor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import AdminLoader from "@/components/loader"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { db } from "@/firebase/firebase"
import {
  getBlogs,
  addBlog,
  updateBlog,
  deleteBlog,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getSubCategories,
  addSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getAdminUsers,
  getSubscriptions,
  getAppUsers,
  onUsersSnapshot,
  updateUserRole,
  updateUser,
  deleteUser,
  getPetFeeds,
  Blog,
  Category,
  SubCategory,
  UserProfile,
  PetFeedEntry,
  Subscription,
  PetFeed
} from "@/firebase/firestore"
import { serverTimestamp } from "firebase/firestore"

const postEngagement = [
  { title: "How to Train Your Puppy", views: 14200, likes: 1820, shares: 430, comments: 98 },
  { title: "Best Food for Cats", views: 9800, likes: 1100, shares: 220, comments: 54 },
  { title: "Puppy Health Guide", views: 7400, likes: 870, shares: 190, comments: 41 },
  { title: "Dog Grooming Basics", views: 5100, likes: 610, shares: 140, comments: 29 },
  { title: "Cat Behavior Explained", views: 3900, likes: 480, shares: 95, comments: 22 },
]

const recentEvents = [
  { type: "purchase", user: "Priya Sharma", target: "Bought Premium Puppy Kibble (5kg) — ₹1,850", time: "2 min ago", icon: ShoppingBag, color: "green" },
  { type: "like", user: "Arjun Menon", target: "Liked — How to Train Your Puppy", time: "11 min ago", icon: Heart, color: "rose" },
  { type: "signup", user: "Meera Kulkarni", target: "New account created", time: "28 min ago", icon: Users, color: "green" },
  { type: "purchase", user: "Rohit Patil", target: "Bought Senior Dog Wellness Pack — ₹4,500", time: "45 min ago", icon: ShoppingBag, color: "green" },
  { type: "like", user: "Divya Reddy", target: "Liked — Cat Behavior Explained", time: "1 hr ago", icon: Heart, color: "rose" },
  { type: "share", user: "Karan Verma", target: "Shared — Dog Grooming Basics", time: "1 hr 20 min ago", icon: Share2, color: "blue" },
  { type: "signup", user: "Sneha Lakshmi", target: "New account created", time: "2 hrs ago", icon: Users, color: "green" },
  { type: "click", user: "Anil Tiwari", target: "Clicked CTA — Adopt Now", time: "2 hrs 30 min ago", icon: MousePointerClick, color: "orange" },
]



const DRAFT_KEY = "pawsattva_blog_draft"

export default function AdminPanel() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Unauthorized access. Admin privileges required.")
      router.push("/")
    }
  }, [authLoading, isAdmin, router])



  const [activeTab, setActiveTab] = useState("blog-list")
  const [isPending, startTransition] = useTransition()
  const [savedDraft, setSavedDraft] = useState<{ savedAt: string } | null>(null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [authors, setAuthors] = useState<UserProfile[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [subscribers, setSubscribers] = useState<Subscription[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // User editing states
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState("")
  const [editUserEmail, setEditUserEmail] = useState("")
  const [editUserPhone, setEditUserPhone] = useState("")
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [petFeeds, setPetFeeds] = useState<PetFeed[]>([])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const cats = await getCategories()
      setCategories(cats)
      const snapshot = await getBlogs()
      setBlogs(snapshot as Blog[])
      const admins = await getAdminUsers()
      setAuthors(admins)
      const allUsers = await getAppUsers()
      setUsers(allUsers)
      const subs = await getSubscriptions()
      setSubscribers(subs)
      const feeds = await getPetFeeds()
      setPetFeeds(feeds)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data from database.")
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchData()
      // Real-time listener for users
      const unsubscribe = onUsersSnapshot((liveUsers) => {
        setUsers(liveUsers)
      })
      return () => unsubscribe()
    }
  }, [isAdmin])

  // Blog states
  const [blogTitle, setBlogTitle] = useState("")
  const [blogSlug, setBlogSlug] = useState("")
  const [blogKeywords, setBlogKeywords] = useState("")
  const [blogExcerpt, setBlogExcerpt] = useState("")
  const [blogImage, setBlogImage] = useState("")
  const [blogContent, setBlogContent] = useState("")
  const [blogCategory, setBlogCategory] = useState("")
  const [blogAuthorId, setBlogAuthorId] = useState("")
  const [blogStatus, setBlogStatus] = useState<"published" | "draft">("draft")
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null)

  // Category states
  const [categoryName, setCategoryName] = useState("")
  const [categoryDesc, setCategoryDesc] = useState("")
  const [categoryParentId, setCategoryParentId] = useState("")
  const [categoryStatus, setCategoryStatus] = useState<"published" | "draft">("published")
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  // List filter states
  const [searchQuery, setSearchQuery] = useState("")
  // ── Sub-Category states ──────────────────────────────────────────────────────
  const [pendingDeletionCheck, setPendingDeletionCheck] = useState<{ id: string, name: string, subs: Category[] } | null>(null)
  const hasDraftContent = useCallback(
    () => !!(blogTitle || blogContent || blogKeywords || blogCategory),
    [blogTitle, blogContent, blogKeywords, blogCategory]
  )

  const saveDraft = useCallback(() => {
    if (!blogTitle && !blogContent && !blogKeywords && !blogCategory) return
    const draft = {
      blogTitle, blogSlug, blogKeywords, blogExcerpt, blogImage,
      blogContent, blogCategory, blogAuthorId, blogStatus, editingBlogId,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    setSavedDraft({ savedAt: draft.savedAt })
  }, [blogTitle, blogSlug, blogKeywords, blogContent, blogCategory, blogStatus, editingBlogId])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    setSavedDraft(null)
  }, [])

  // Load any existing draft meta on first render
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw)
        if (d.savedAt) setSavedDraft({ savedAt: d.savedAt })
      } catch { }
    }
  }, [])

  // Debounced autosave — fires 2s after the user stops typing
  useEffect(() => {
    if (activeTab !== "blog" || editingBlogId) return // only autosave new blogs
    if (!hasDraftContent()) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      saveDraft()
    }, 2000)
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [blogTitle, blogSlug, blogKeywords, blogContent, blogCategory, blogStatus, activeTab, editingBlogId, hasDraftContent, saveDraft])

  // Save immediately when navigating away from the blog tab
  useEffect(() => {
    if (activeTab !== "blog" && !editingBlogId && hasDraftContent()) {
      saveDraft()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Save on browser close / refresh
  useEffect(() => {
    const handleUnload = () => {
      if (!editingBlogId && hasDraftContent()) saveDraft()
    }
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
      setBlogCategory(d.blogCategory || "")
      setBlogStatus(d.blogStatus || "draft")
      setEditingBlogId(d.editingBlogId || null)
      toast.success("Draft restored! Continue where you left off.")
    } catch {
      toast.error("Could not restore draft.")
    }
  }

  const discardDraft = () => {
    clearDraft()
    toast("Draft discarded.")
  }

  const formatDraftTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ── Protection Check ──────────────────────────────────────────────────────
  if (authLoading || (!isAdmin && !authLoading) || loadingData) {
    return <AdminLoader img={Paw} />
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setBlogTitle(title)
    if (!editingBlogId) {
      setBlogSlug(generateSlug(title))
    }
  }



  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blogTitle || !blogContent || !blogCategory) {
      toast.error("Please fill in all required fields.")
      return
    }

    try {
      const selectedAuthor = authors.find(a => a.id === blogAuthorId)
      const blogData = {
        title: blogTitle,
        slug: blogSlug,
        keywords: blogKeywords,
        excerpt: blogExcerpt,
        image: blogImage,
        content: blogContent,
        categoryId: blogCategory,
        authorId: blogAuthorId,
        authorName: selectedAuthor?.displayName || selectedAuthor?.email || "Unknown Author",
        status: blogStatus as 'published' | 'draft'
      }

      if (editingBlogId) {
        await updateBlog(editingBlogId, blogData)
        toast.success(`Blog post "${blogTitle}" has been updated.`)
        setEditingBlogId(null)
      } else {
        await addBlog(blogData)
        toast.success(`Blog post "${blogTitle}" has been saved as ${blogStatus}.`)
      }

      // Reset + clear draft
      setBlogTitle("")
      setBlogSlug("")
      setBlogKeywords("")
      setBlogExcerpt("")
      setBlogImage("")
      setBlogContent("")
      setBlogCategory("")
      setBlogAuthorId("")
      setBlogStatus("draft")
      clearDraft()
      fetchData() // Refresh list
    } catch (error) {
      console.error("Error saving blog:", error)
      toast.error("Failed to save blog post.")
    }
  }

  const handleEditBlog = (blog: Blog) => {
    setBlogTitle(blog.title)
    setBlogSlug(blog.slug)
    setBlogKeywords(blog.keywords || "")
    setBlogExcerpt(blog.excerpt || "")
    setBlogImage(blog.image || "")
    setBlogContent(blog.content)
    setBlogCategory(blog.categoryId)
    setBlogAuthorId(blog.authorId || "")
    setBlogStatus(blog.status)
    setEditingBlogId(blog.id)
    // Switch to form tab with transition
    startTransition(() => {
      setActiveTab("blog")
    })
  }

  const handleDeleteBlog = async (id: string) => {
    try {
      await deleteBlog(id)
      toast.success("Blog post has been deleted.")
      fetchData()
    } catch (error) {
      console.error("Error deleting blog:", error)
      toast.error("Failed to delete blog post.")
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName) {
      toast.error("Category name is required.")
      return
    }

    try {
      const catData = {
        name: categoryName,
        description: categoryDesc,
        parentId: (categoryParentId === "none" || !categoryParentId) ? undefined : categoryParentId,
        status: categoryStatus as 'published' | 'draft'
      }

      if (editingCategoryId) {
        await updateCategory(editingCategoryId, catData)
        toast.success(`Category "${categoryName}" has been updated.`)
        setEditingCategoryId(null)
      } else {
        await addCategory(catData)
        toast.success(`Category "${categoryName}" has been created as ${categoryStatus}.`)
      }

      setCategoryName("")
      setCategoryDesc("")
      setCategoryStatus("published")
      fetchData()
    } catch (error) {
      console.error("Error saving category:", error)
      toast.error("Failed to save category.")
    }
  }

  const handleEditCategory = (cat: any) => {
    setCategoryName(cat.name)
    setCategoryDesc(cat.description || "")
    setCategoryParentId(cat.parentId || "")
    setCategoryStatus(cat.status || "published")
    setEditingCategoryId(cat.id)
    startTransition(() => {
      setActiveTab("category")
    })
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    // Check for sub-categories
    const relatedSubs = categories.filter(c => c.parentId === id)
    if (relatedSubs.length > 0) {
      setPendingDeletionCheck({ id, name, subs: relatedSubs })
      return
    }

    try {
      await deleteCategory(id)
      toast.success("Category has been deleted.")
      fetchData()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error("Failed to delete category.")
    }
  }

  const confirmDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id)
      toast.success("Category and dependency info updated.")
      setPendingDeletionCheck(null)
      fetchData()
    } catch (error) {
      console.error("Error confirming deletion:", error)
      toast.error("Failed to delete category.")
    }
  }

  const filteredBlogs = blogs.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || "Unknown"
  }

  const handleToggleAdmin = async (userId: string, targetState: boolean) => {
    try {
      console.log(`[Admin] Attempting to update role for user ${userId} to ${targetState ? "Admin" : "User"}`);
      await updateUserRole(userId, targetState);
      toast.success(`User role updated successfully.`);
      fetchData();
    } catch (error: any) {
      console.error("Error updating user role:", error);
      const errorMessage = error?.message || (typeof error === 'string' ? error : "Unknown error");
      toast.error(`Failed to update user role: ${errorMessage}`);

      if (errorMessage.includes("permission-denied")) {
        console.warn("[Admin] Permission denied. Check your Firestore Security Rules.");
      }
    }
  }

  const handleDeleteUserAccount = async (userId: string) => {
    try {
      await deleteUser(userId)
      toast.success("User account has been deleted.")
      fetchData()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Failed to delete user account.")
    }
  }

  const handleEditUser = (u: UserProfile) => {
    setEditingUserId(u.id)
    setEditUserName(u.displayName || "")
    setEditUserEmail(u.email)
    setEditUserPhone(u.phone || "")
  }

  const handleSaveUser = async () => {
    if (!editingUserId) return
    try {
      await updateUser(editingUserId, {
        displayName: editUserName,
        email: editUserEmail,
        phone: editUserPhone,
      })
      toast.success("User updated successfully.")
      setEditingUserId(null)
      fetchData()
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Failed to update user.")
    }
  }

  const filteredUsers = users.filter(u =>
    (u.displayName || "").toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  const totalPetFeeds = users.reduce((sum, u) => sum + (u.petFeeds?.length || 0), 0)

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-12 space-y-8">

      {/* Header */}
      <div className="mt-20 flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 w-fit border border-orange-500/20 text-xs font-semibold tracking-widest uppercase">
          <Settings2 className="w-3.5 h-3.5" />
          Administration
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400">
          Content Hub
        </h1>
        <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
          Manage blog articles, categories, and view platform analytics.
        </p>
      </div>

      {/* Main Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          startTransition(() => {
            setActiveTab(val)
          })
        }}
        className="w-full space-y-6"
      >
        <TabsList className="flex flex-nowrap items-center h-auto bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/8 dark:border-white/10 p-1 gap-2 rounded-2xl overflow-x-auto scrollbar-hide w-full max-w-full justify-start md:justify-center md:inline-flex">
          <TabsTrigger value="blog-list" className="rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <FileText className="w-4 h-4 mr-1.5" />
            Blogs
          </TabsTrigger>
          <TabsTrigger value="blog" className="rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            {editingBlogId ? "Edit Blog" : "New Blog"}
          </TabsTrigger>
          <TabsTrigger value="category-list" className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <FolderPlus className="w-4 h-4 mr-1.5" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="category" className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            {editingCategoryId && !categories.find(c => c.id === editingCategoryId)?.parentId ? "Edit Cat" : "New Cat"}
          </TabsTrigger>
          <TabsTrigger value="sub-category-list" className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <Settings2 className="w-4 h-4 mr-1.5" />
            Sub-Cats
          </TabsTrigger>
          <TabsTrigger value="sub-category" className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            {editingCategoryId && categories.find(c => c.id === editingCategoryId)?.parentId ? "Edit Sub" : "New Sub"}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <Users className="w-4 h-4 mr-1.5" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 shrink-0">
            <Users className="w-4 h-4 mr-1.5" />
            Users
          </TabsTrigger>
        </TabsList>

        <div className="relative">
          <style>{`
            @keyframes tab-enter {
              from { opacity: 0; transform: translateY(8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            [data-state="active"].tab-panel {
              animation: tab-enter 0.22s cubic-bezier(0.4, 0, 0.2, 1) both;
            }
          `}</style>
          <div className="pointer-events-none absolute -inset-x-4 top-0 h-32 bg-orange-400/5 dark:bg-orange-500/5 blur-3xl rounded-full" />

          <TabsContent value="blog-list" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-2 pb-6">
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-2xl font-bold">Manage Blogs</CardTitle>
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search posts..."
                      className="pl-10 h-10 bg-white/50 dark:bg-black/50 border-white/20 dark:border-white/10 rounded-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                        <th className="px-6 md:px-8 py-4 font-semibold text-sm">Title & Category</th>
                        <th className="hidden md:table-cell px-8 py-4 font-semibold text-sm">Author</th>
                        <th className="hidden md:table-cell px-8 py-4 font-semibold text-sm">Status</th>
                        <th className="hidden lg:table-cell px-8 py-4 font-semibold text-sm">Date</th>
                        <th className="px-6 md:px-8 py-4 font-semibold text-sm text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredBlogs.length > 0 ? filteredBlogs.map((blog) => (
                        <tr key={blog.id} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 md:px-8 py-5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-foreground group-hover:text-orange-600 transition-colors uppercase tracking-tight">{blog.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  {getCategoryName(blog.categoryId)} <ChevronRight className="w-3 h-3" />
                                </span>
                                <span className="hidden sm:inline text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">/{blog.slug}</span>
                              </div>
                              <div className="md:hidden mt-2 flex flex-col gap-1.5">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                  <Users className="w-3 h-3" /> {blog.authorName || "Unknown Author"}
                                </span>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${blog.status === 'published'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                                  }`}>
                                  {blog.status}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-8 py-5">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                              <Users className="w-4 h-4 text-orange-500/60" />
                              {blog.authorName || "Unknown"}
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-8 py-5">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${blog.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                              }`}>
                              {blog.status === 'published' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleDashed className="w-3.5 h-3.5" />}
                              {blog.status}
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-8 py-5 text-sm text-muted-foreground font-medium">
                            {blog.date}
                          </td>
                          <td className="px-6 md:px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-all"
                                onClick={() => handleEditBlog(blog)}
                              >
                                <Edit className="w-4 h-4 md:mr-1.5" />
                                <span className="hidden md:inline">Edit</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4 md:mr-1.5" />
                                    <span className="hidden md:inline">Delete</span>
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent className="p-10 rounded-[2rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/90 dark:bg-black/90 shadow-2xl">

                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl p-2 font-bold font-roboto">Confirm Deletion</AlertDialogTitle>
                                    <hr className="border-black/20" />
                                    <AlertDialogDescription className="text-base text-muted-foreground font-roboto">
                                      Are you sure you want to permanently delete "{blog.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>

                                  <AlertDialogFooter className="mt-6 border-0 bg-transparent gap-3 px-0 pb-0">
                                    <AlertDialogCancel className="pt-2 h-11 rounded-xl bg-muted/50 border-0 hover:bg-muted transition-all">No, Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="p-2 h-11 rounded-xl bg-destructive hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 border-0"
                                      onClick={() => handleDeleteBlog(blog.id)}
                                    >
                                      Yes, Delete Permanently
                                    </AlertDialogAction>
                                  </AlertDialogFooter>

                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-8 py-20 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <MoreVertical className="w-8 h-8 opacity-20" />
                              <p className="font-medium">No blog posts found matching your search.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="p-8 flex items-center justify-between border-t border-border/40">
                <span className="text-sm text-muted-foreground font-medium">Showing {filteredBlogs.length} of {blogs.length} articles</span>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="blog" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-4">

            {/* ── Unsaved Draft Banner ───────────────────────────── */}
            {savedDraft && !hasDraftContent() && (
              <div className="mb-4 flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Unsaved draft found</p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-500/70">Last saved at {formatDraftTime(savedDraft.savedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 border-0 transition-all"
                    onClick={restoreDraft}
                  >
                    Restore
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 rounded-xl text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-all"
                    onClick={discardDraft}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}

            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-[2rem]">
              <form onSubmit={handleBlogSubmit} className="relative z-10">
                <CardHeader className="border-b border-border/40 bg-white/30 dark:bg-black/20 pb-8 pt-8 px-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-inner">
                      {editingBlogId ? <Edit className="w-8 h-8 text-orange-600" /> : <PlusCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />}
                    </div>
                    <div className="flex-1 flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-3xl font-bold text-foreground">
                          {editingBlogId ? 'Edit Blog Post' : 'Create New Blog Post'}
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground mt-1">
                          {editingBlogId ? 'Update your article details and save changes.' : 'Draft a new article. Select a category and appropriately set its publishing status.'}
                        </CardDescription>
                      </div>
                      {/* Live autosave indicator */}
                      {savedDraft && hasDraftContent() && !editingBlogId && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 font-semibold shrink-0 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Autosaved {formatDraftTime(savedDraft.savedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-8">
                      <div className="space-y-3 group">
                        <Label htmlFor="title" className="text-base font-semibold text-foreground/90 flex items-center justify-between">
                          Post Title
                          <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
                        </Label>
                        <Input
                          id="title"
                          placeholder="e.g. 10 Essential Tips for Puppy Training..."
                          value={blogTitle}
                          onChange={handleTitleChange}
                          className="h-14 text-lg bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-2xl shadow-sm transition-all group-hover:bg-white/60 dark:group-hover:bg-black/60 px-4"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3 group">
                          <Label htmlFor="slug" className="text-base font-semibold text-foreground/90">
                            URL Slug
                          </Label>
                          <Input
                            id="slug"
                            placeholder="url-friendly-slug"
                            value={blogSlug}
                            onChange={(e) => setBlogSlug(e.target.value)}
                            className="h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl px-4 font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-3 group">
                          <Label htmlFor="image" className="text-base font-semibold text-foreground/90">
                            Featured Image URL
                          </Label>
                          <Input
                            id="image"
                            placeholder="https://images.unsplash.com/..."
                            value={blogImage}
                            onChange={(e) => setBlogImage(e.target.value)}
                            className="h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl px-4"
                          />
                        </div>
                        <div className="space-y-3 group">
                          <Label htmlFor="keywords" className="text-base font-semibold text-foreground/90">
                            Keywords (SEO)
                          </Label>
                          <Input
                            id="keywords"
                            placeholder="pets, puppy, tips..."
                            value={blogKeywords}
                            onChange={(e) => setBlogKeywords(e.target.value)}
                            className="h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-xl px-4"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 group">
                        <Label htmlFor="excerpt" className="text-base font-semibold text-foreground/90">
                          Excerpt / Summary
                        </Label>
                        <Textarea
                          id="excerpt"
                          placeholder="A short summary for the blog list page..."
                          className="min-h-[100px] resize-y bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 rounded-2xl shadow-sm transition-all group-hover:bg-white/60 dark:group-hover:bg-black/60 p-4"
                          value={blogExcerpt}
                          onChange={(e) => setBlogExcerpt(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4 group">
                        <Label htmlFor="content" className="text-base font-semibold text-foreground/90 flex items-center justify-between">
                          Content Body
                          <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
                        </Label>
                        <Editor
                          value={blogContent}
                          onChange={setBlogContent}
                          placeholder="Write your amazing blog post here..."
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8 self-start">
                      <div className="rounded-[2rem] border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/40 p-6 backdrop-blur-xl shadow-xl">
                        <h3 className="font-bold text-xl border-b border-border/40 pb-4 mb-6 flex items-center gap-2 text-foreground/90">
                          <Settings2 className="w-5 h-5 text-orange-500" />
                          Publish Info
                        </h3>

                        <div className="space-y-4">
                          <Label htmlFor="category" className="text-sm font-semibold text-foreground/80 flex items-center justify-between">
                            Category
                            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Req</span>
                          </Label>
                          <Select value={blogCategory} onValueChange={setBlogCategory}>
                            <SelectTrigger id="category" className="h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10">
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id} className="rounded-lg my-1 cursor-pointer">
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-4 pt-6 mt-6 border-t border-border/40">
                          <Label htmlFor="author" className="text-sm font-semibold text-foreground/80 flex items-center justify-between">
                            Author
                            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Req</span>
                          </Label>
                          <Select value={blogAuthorId} onValueChange={setBlogAuthorId}>
                            <SelectTrigger id="author" className="h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30">
                              <SelectValue placeholder="Select an author" />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10">
                              {authors.map((admin) => (
                                <SelectItem key={admin.id} value={admin.id} className="rounded-lg my-1 cursor-pointer">
                                  {admin.displayName || admin.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-4 pt-6 mt-6 border-t border-border/40">
                          <Label htmlFor="status" className="text-sm font-semibold text-foreground/80">Visibility Status</Label>
                          <Select value={blogStatus} onValueChange={(val: "published" | "draft") => setBlogStatus(val)}>
                            <SelectTrigger id="status" className="h-12 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-xl focus:ring-orange-500/30">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10">
                              <SelectItem value="draft" className="rounded-lg my-1 cursor-pointer font-roboto">
                                <div className="flex items-center gap-2">
                                  <CircleDashed className="w-4 h-4 text-orange-500" />
                                  <span className="font-medium">Draft (Hidden)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="published" className="rounded-lg my-1 cursor-pointer font-roboto">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span className="font-medium">Published (Public)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-4 pt-6 mt-6 border-t border-border/40">
                          <Label className="text-sm font-semibold text-foreground/80 flex items-center justify-between">
                            Featured Image
                            <span className="text-xs text-muted-foreground font-normal">Optional</span>
                          </Label>
                          <div className="border-2 border-dashed border-orange-500/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-white/30 dark:bg-black/30 hover:bg-orange-500/5 hover:border-orange-500/50 transition-all cursor-pointer group shadow-inner">
                            <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm">
                              <UploadCloud className="w-7 h-7" />
                            </div>
                            <div className="text-sm text-center mt-2 leading-relaxed">
                              <span className="font-semibold text-orange-600 dark:text-orange-400 hover:underline">Click to upload</span><br />
                              or drag and drop
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">SVG, PNG, JPG (max 2MB)</p>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-4 border-t border-border/40 bg-white/20 dark:bg-black/20 p-8">
                  <Button type="button" variant="outline" className="h-12 px-8 rounded-xl bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/20 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-white/10 font-semibold shadow-sm text-foreground" onClick={() => {
                    setEditingBlogId(null);
                    setBlogTitle("");
                    setBlogExcerpt("");
                    setBlogImage("");
                    setBlogContent("");
                    setBlogCategory("");
                    setBlogAuthorId("");
                    setBlogStatus("draft");
                    startTransition(() => {
                      setActiveTab("blog-list")
                    })
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="h-12 px-10 gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 font-bold text-base border-0">
                    <Save className="w-5 h-5" />
                    {editingBlogId ? 'Update Article' : `Save ${blogStatus === 'draft' ? 'Draft' : 'Post'}`}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="category-list" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-4">
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-2xl font-bold">Manage Categories</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                        <th className="px-6 md:px-8 py-4 font-semibold text-sm">Category Name</th>
                        <th className="hidden md:table-cell px-8 py-4 font-semibold text-sm">Parent</th>
                        <th className="hidden lg:table-cell px-8 py-4 font-semibold text-sm">Description</th>
                        <th className="px-6 md:px-8 py-4 font-semibold text-sm text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {categories.filter(c => !c.parentId).map((cat: any) => (
                        <tr key={cat.id} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 md:px-8 py-5">
                            <span className="font-bold text-foreground group-hover:text-amber-600 transition-colors uppercase tracking-tight">{cat.name}</span>
                          </td>
                          <td className="hidden md:table-cell px-8 py-5 text-sm font-bold text-orange-600/70">
                            <span className="text-muted-foreground/50 font-normal">Top Level</span>
                          </td>
                          <td className="hidden lg:table-cell px-8 py-5 text-sm text-muted-foreground font-medium max-w-xs truncate">
                            {cat.description || "No description provided."}
                          </td>
                          <td className="px-6 md:px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-all"
                                onClick={() => handleEditCategory(cat)}
                              >
                                <Edit className="w-4 h-4 md:mr-1.5" />
                                <span className="hidden md:inline">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/40 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all shadow-sm"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              >
                                <Trash2 className="w-4 h-4 md:mr-1.5" />
                                <span className="hidden md:inline">Delete</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="p-8 flex items-center justify-between border-t border-border/40">
                <span className="text-sm text-muted-foreground font-medium">Total {categories.filter(c => !c.parentId).length} categories</span>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="sub-category-list" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-4">
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-2xl font-bold">Manage Sub-Categories</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                        <th className="px-6 md:px-8 py-4 font-semibold text-sm">Sub-Category</th>
                        <th className="hidden md:table-cell px-8 py-4 font-semibold text-sm">Parent Category</th>
                        <th className="hidden lg:table-cell px-8 py-4 font-semibold text-sm">Description</th>
                        <th className="px-6 md:px-8 py-4 font-semibold text-sm text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {categories.filter(c => c.parentId).map((cat: any) => (
                        <tr key={cat.id} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 md:px-8 py-5">
                            <span className="font-bold text-foreground group-hover:text-amber-600 transition-colors uppercase tracking-tight">{cat.name}</span>
                          </td>
                          <td className="hidden md:table-cell px-8 py-5 text-sm font-bold text-orange-600/70">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 w-fit">
                              <ChevronRight className="w-3.5 h-3.5" />
                              {getCategoryName(cat.parentId)}
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-8 py-5 text-sm text-muted-foreground font-medium max-w-xs truncate">
                            {cat.description || "No description provided."}
                          </td>
                          <td className="px-6 md:px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-all"
                                onClick={() => handleEditCategory(cat)}
                              >
                                <Edit className="w-4 h-4 md:mr-1.5" />
                                <span className="hidden md:inline">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/40 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all shadow-sm"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              >
                                <Trash2 className="w-4 h-4 md:mr-1.5" />
                                <span className="hidden md:inline">Delete</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="p-8 flex items-center justify-between border-t border-border/40">
                <span className="text-sm text-muted-foreground font-medium">Total {categories.filter(c => c.parentId).length} sub-categories</span>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="category" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-4">
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl overflow-hidden max-w-4xl mx-auto rounded-[2rem]">
              <form onSubmit={handleCategorySubmit} className="relative z-10">
                <CardHeader className="border-b border-border/40 bg-white/30 dark:bg-black/20 pb-8 pt-8 px-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-inner">
                      <FolderPlus className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-foreground">
                        Create New Category
                      </CardTitle>
                      <CardDescription className="text-base text-muted-foreground mt-1">
                        Add a new category to seamlessly group related blog posts together.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 p-8">
                  <div className="space-y-6">
                    <div className="space-y-3 group">
                      <Label htmlFor="catName" className="text-base font-semibold text-foreground/90 flex items-center justify-between">
                        Category Name
                        <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
                      </Label>
                      <Input
                        id="catName"
                        placeholder="e.g. Nutrition, Health & Wellness..."
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        className="h-14 text-lg bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 rounded-2xl shadow-sm transition-all group-hover:bg-white/60 dark:group-hover:bg-black/60 px-4"
                      />
                    </div>

                    <div className="space-y-3 group">
                      <Label htmlFor="catDesc" className="text-base font-semibold text-foreground/90 flex items-center justify-between">
                        Description
                        <span className="text-xs text-muted-foreground font-normal">Optional</span>
                      </Label>
                      <Textarea
                        id="catDesc"
                        placeholder="Briefly describe what this category is about..."
                        className="min-h-[100px] resize-y bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 text-base rounded-2xl shadow-sm transition-all group-hover:bg-white/60 dark:group-hover:bg-black/60 p-4"
                        value={categoryDesc}
                        onChange={(e) => setCategoryDesc(e.target.value)}
                      />
                    </div>

                    <div className="space-y-3 group">
                      <Label htmlFor="catStatus" className="text-base font-semibold text-foreground/90">Status</Label>
                      <Select value={categoryStatus} onValueChange={(val: "published" | "draft") => setCategoryStatus(val)}>
                        <SelectTrigger id="catStatus" className="h-14 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-2xl focus:ring-amber-500/30 shadow-sm">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10">
                          <SelectItem value="draft" className="rounded-lg my-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <CircleDashed className="w-5 h-5 text-orange-500" />
                              <span className="font-medium text-base">Draft (Hidden)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="published" className="rounded-lg my-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              <span className="font-medium text-base">Published (Public)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-4 border-t border-border/40 bg-white/20 dark:bg-black/20 p-8">
                  <Button type="button" variant="outline" className="h-12 px-8 rounded-xl bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/20 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-white/10 font-semibold shadow-sm text-foreground" onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryName("");
                    setCategoryDesc("");
                    setCategoryParentId("");
                    setCategoryStatus("published");
                    startTransition(() => {
                      setActiveTab("category-list")
                    })
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="h-12 px-10 gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 font-bold text-base border-0 rounded-xl">
                    <Save className="w-5 h-5" />
                    {editingCategoryId ? 'Update Category' : 'Save Category'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="sub-category" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-4">
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl overflow-hidden max-w-4xl mx-auto rounded-[2rem]">
              <form onSubmit={handleCategorySubmit} className="relative z-10">
                <CardHeader className="border-b border-border/40 bg-white/30 dark:bg-black/20 pb-8 pt-8 px-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-inner">
                      <FolderPlus className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-foreground">
                        {editingCategoryId ? "Edit Sub-Category" : "New Sub-Category"}
                      </CardTitle>
                      <CardDescription className="text-base text-muted-foreground mt-1">
                        Group content more granularly by adding a sub-category to a parent.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 p-8">
                  <div className="space-y-6">
                    <div className="space-y-3 group">
                      <Label htmlFor="subCatParent" className="text-base font-semibold text-foreground/90 flex items-center justify-between">
                        Parent Category
                        <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
                      </Label>
                      <Select value={categoryParentId} onValueChange={setCategoryParentId} required>
                        <SelectTrigger id="subCatParent" className="h-14 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-2xl focus:ring-amber-500/30 shadow-sm">
                          <SelectValue placeholder="Select Parent Category" />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10 max-h-[300px]">
                          {categories
                            .filter(c => !c.parentId && c.id !== editingCategoryId)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id} className="rounded-lg my-1 cursor-pointer">
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 group">
                      <Label htmlFor="subCatName" className="text-base font-semibold text-foreground/90 flex items-center justify-between">
                        Sub-Category Name
                        <span className="text-[10px] uppercase font-bold tracking-wider text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">Required</span>
                      </Label>
                      <Input
                        id="subCatName"
                        placeholder="e.g. Behavioral Training, Senior Health..."
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        className="h-14 text-lg bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 rounded-2xl shadow-sm transition-all group-hover:bg-white/60 dark:group-hover:bg-black/60 px-4"
                        required
                      />
                    </div>

                    <div className="space-y-3 group">
                      <Label htmlFor="subCatDesc" className="text-base font-semibold text-foreground/90">Description</Label>
                      <Textarea
                        id="subCatDesc"
                        placeholder="Briefly describe this sub-category..."
                        className="min-h-[100px] bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-2xl p-4 shadow-sm"
                        value={categoryDesc}
                        onChange={(e) => setCategoryDesc(e.target.value)}
                      />
                    </div>

                    <div className="space-y-3 group">
                      <Label htmlFor="subCatStatus" className="text-base font-semibold text-foreground/90">Status</Label>
                      <Select value={categoryStatus} onValueChange={(val: "published" | "draft") => setCategoryStatus(val)}>
                        <SelectTrigger id="subCatStatus" className="h-14 bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-2xl focus:ring-amber-500/30 shadow-sm">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-2xl bg-white/80 dark:bg-black/80 rounded-xl border border-white/20 dark:border-white/10">
                          <SelectItem value="draft" className="rounded-lg my-1 cursor-pointer">Draft</SelectItem>
                          <SelectItem value="published" className="rounded-lg my-1 cursor-pointer">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-4 border-t border-border/40 bg-white/20 dark:bg-black/20 p-8">
                  <Button type="button" variant="outline" className="h-12 px-8 rounded-xl" onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryName("");
                    setCategoryDesc("");
                    setCategoryParentId("");
                    startTransition(() => setActiveTab("sub-category-list"))
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="h-12 px-10 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold rounded-xl shadow-xl">
                    <Save className="w-5 h-5 mr-2" />
                    {editingCategoryId ? 'Update Sub-Category' : 'Save Sub-Category'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          {/* ── ANALYTICS TAB ── */}
          <TabsContent value="analytics" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-4 space-y-8">

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {[
                { label: "Total Users", value: users.length.toString(), icon: Users, color: "blue" },
                { label: "Subscribers", value: subscribers.length.toString(), icon: Mail, color: "purple" },
                { label: "Blog Posts", value: blogs.length.toString(), icon: FileText, color: "rose" },
                { label: "Pet Feeds", value: totalPetFeeds.toString(), icon: Dog, color: "orange" },
              ].map((stat) => (
                <Card key={stat.label} className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl rounded-[1.75rem] overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${stat.color === "blue" ? "bg-blue-500/10 text-blue-600" :
                        stat.color === "purple" ? "bg-violet-500/10 text-violet-600" :
                          stat.color === "rose" ? "bg-rose-500/10 text-rose-600" :
                            "bg-orange-500/10 text-orange-600"
                        }`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Post Engagement Table */}
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Post Engagement</CardTitle>
                    <CardDescription>Likes, shares & views per article</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                        <th className="px-6 md:px-8 py-4 font-semibold text-sm">Article</th>
                        <th className="px-4 md:px-6 py-4 font-semibold text-sm text-center">
                          <span className="flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Views</span></span>
                        </th>
                        <th className="hidden sm:table-cell px-6 py-4 font-semibold text-sm text-center">
                          <span className="flex items-center justify-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" /> <span className="hidden md:inline">Likes</span></span>
                        </th>
                        <th className="hidden md:table-cell px-6 py-4 font-semibold text-sm text-center">
                          <span className="flex items-center justify-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-blue-500" /> <span className="hidden lg:inline">Shares</span></span>
                        </th>
                        <th className="px-6 py-4 font-semibold text-sm text-center">Eng.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {postEngagement.map((row, i) => {
                        const total = row.views || 1
                        const engagePct = Math.round(((row.likes + row.shares + row.comments) / total) * 100)
                        return (
                          <tr key={i} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 md:px-8 py-4">
                              <span className="font-semibold text-foreground group-hover:text-violet-600 transition-colors text-xs md:text-sm line-clamp-1">{row.title}</span>
                            </td>
                            <td className="px-4 md:px-6 py-4 text-center text-xs md:text-sm font-medium text-muted-foreground">{row.views.toLocaleString()}</td>
                            <td className="hidden sm:table-cell px-6 py-4 text-center">
                              <span className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
                                <Heart className="w-3 h-3" />{row.likes.toLocaleString()}
                              </span>
                            </td>
                            <td className="hidden md:table-cell px-6 py-4 text-center">
                              <span className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-blue-600 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                                <Share2 className="w-3 h-3" />{row.shares.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="hidden xs:block w-12 md:w-20 h-2 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${Math.min(engagePct * 5, 100)}%` }} />
                                </div>
                                <span className="text-[10px] md:text-xs font-bold text-violet-600">{engagePct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Users with Pet Feeds */}
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Dog className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Users with Pet Feeds</CardTitle>
                    <CardDescription>Users who have submitted pet information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-2">
                <div className="space-y-3">
                  {users
                    .filter(u => u.petFeeds && u.petFeeds.length > 0)
                    .map((u, rank) => (
                      <div key={u.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 transition-all group">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${rank === 0
                          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-400/30"
                          : rank === 1
                            ? "bg-gradient-to-br from-zinc-300 to-zinc-400 text-white shadow-lg shadow-zinc-300/30"
                            : rank === 2
                              ? "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-lg shadow-orange-400/30"
                              : "bg-muted text-muted-foreground"
                          }`}>
                          {rank + 1}
                        </div>
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative">
                          {u.photoURL ? (
                            <NextImage src={u.photoURL} alt={u.displayName || ""} fill className="object-cover rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold">
                              {(u.displayName || u.email)[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{u.displayName || u.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.petFeeds!.length} {u.petFeeds!.length === 1 ? "pet" : "pets"} · {u.petFeeds!.map(f => f.petName).join(", ")}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-500/10 px-2.5 py-1 rounded-full shrink-0">
                          <Dog className="w-3 h-3" />
                          {u.petFeeds!.length}
                        </span>
                      </div>
                    ))}
                  {users.filter(u => u.petFeeds && u.petFeeds.length > 0).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Dog className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No pet feed submissions yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Events Feed */}
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Live Event Feed</CardTitle>
                    <CardDescription>Real-time user interactions across the platform</CardDescription>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-2">
                <div className="space-y-3">
                  {recentEvents.map((ev, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 transition-all group">
                      <div className={`p-2.5 rounded-xl shrink-0 ${ev.color === "rose" ? "bg-rose-500/10 text-rose-600" :
                        ev.color === "blue" ? "bg-blue-500/10 text-blue-600" :
                          ev.color === "green" ? "bg-emerald-500/10 text-emerald-600" :
                            ev.color === "orange" ? "bg-orange-500/10 text-orange-600" :
                              "bg-violet-500/10 text-violet-600"
                        }`}>
                        <ev.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{ev.user}</p>
                        <p className="text-xs text-muted-foreground truncate">{ev.target}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {ev.time}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </TabsContent>
          <TabsContent value="subscribers" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-4">
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold">Pack Subscribers</CardTitle>
                    <CardDescription className="text-base text-muted-foreground mt-1">
                      Manage all your pet parent community leads and sign-ups.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                        <th className="px-8 py-4 font-semibold text-sm">Subscriber</th>
                        <th className="px-8 py-4 font-semibold text-sm">Contact Details</th>
                        <th className="px-8 py-4 font-semibold text-sm">Pet Breed</th>
                        <th className="px-8 py-4 font-semibold text-sm text-right">Join Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {subscribers.map((sub: Subscription) => (
                        <tr key={sub.id} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold border border-orange-500/20 shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-all">
                                {sub.name ? sub.name[0].toUpperCase() : sub.email[0].toUpperCase()}
                              </div>
                              <span className="font-bold text-foreground">{sub.name || "Anonymous"}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                {sub.email}
                              </div>
                              {sub.phone && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Phone className="w-3.5 h-3.5" />
                                  {sub.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2 bg-orange-500/5 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-xl border border-orange-500/10 w-fit font-bold text-xs uppercase tracking-tight">
                              <Dog className="w-3.5 h-3.5" />
                              {sub.petBreed || "N/A"}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm text-muted-foreground font-medium text-right">
                            {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString() : "No Date"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {subscribers.length === 0 && (
                    <div className="p-20 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                      <p className="text-muted-foreground font-medium">No subscribers yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-8 flex items-center justify-between border-t border-border/40">
                <span className="text-sm text-muted-foreground font-medium">Total {subscribers.length} pet parents</span>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="tab-panel focus-visible:outline-none focus-visible:ring-0 relative z-10 pt-4 space-y-8">

            {/* ── All Registered Users with CRUD ── */}
            <Card className="border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl rounded-[2rem]">
              <CardHeader className="p-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold">All Users</CardTitle>
                    <CardDescription className="text-base text-muted-foreground mt-1">
                      Manage all registered users, edit profiles, and view pet feed submissions.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/30">
                      <Dog className="w-3 h-3" />
                      {totalPetFeeds} Pet Feeds
                    </span>
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-10 h-10 bg-white/50 dark:bg-black/50 border-white/20 dark:border-white/10 rounded-xl"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-white/20 dark:bg-black/10">
                        <th className="px-6 md:px-8 py-4 font-semibold text-sm">User</th>
                        <th className="hidden md:table-cell px-6 py-4 font-semibold text-sm">Contact</th>
                        <th className="hidden sm:table-cell px-6 py-4 font-semibold text-sm text-center">Pet Feeds</th>
                        <th className="px-6 py-4 font-semibold text-sm text-center">Role</th>
                        <th className="px-6 py-4 font-semibold text-sm text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredUsers.map((u: UserProfile) => (
                        <>
                          <tr key={u.id} className="group hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 md:px-8 py-5">
                              {editingUserId === u.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editUserName}
                                    onChange={(e) => setEditUserName(e.target.value)}
                                    placeholder="Display Name"
                                    className="h-9 text-sm bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-lg"
                                  />
                                  <Input
                                    value={editUserEmail}
                                    onChange={(e) => setEditUserEmail(e.target.value)}
                                    placeholder="Email"
                                    className="h-9 text-sm bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-lg"
                                  />
                                  <Input
                                    value={editUserPhone}
                                    onChange={(e) => setEditUserPhone(e.target.value)}
                                    placeholder="Phone"
                                    className="h-9 text-sm bg-white/50 dark:bg-black/50 border-white/40 dark:border-white/10 rounded-lg"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold border border-orange-500/20 shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-all overflow-hidden relative">
                                    {u.photoURL ? (
                                      <NextImage src={u.photoURL} alt={u.displayName || ""} fill className="object-cover" />
                                    ) : (
                                      <span>{u.displayName ? u.displayName[0].toUpperCase() : u.email[0].toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-foreground group-hover:text-orange-600 transition-colors">{u.displayName || "Anonymous User"}</span>
                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                    {u.phone && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Phone className="w-3 h-3" />
                                        {u.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="hidden md:table-cell px-6 py-5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                  {u.email}
                                </div>
                                {u.phone && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Phone className="w-3.5 h-3.5" />
                                    {u.phone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="hidden sm:table-cell px-6 py-5 text-center">
                              {u.petFeeds && u.petFeeds.length > 0 ? (
                                <button
                                  onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20 hover:bg-orange-500/20 transition-all cursor-pointer"
                                >
                                  <Dog className="w-3.5 h-3.5" />
                                  {u.petFeeds.length} {u.petFeeds.length === 1 ? "pet" : "pets"}
                                  <ChevronRight className={`w-3 h-3 transition-transform ${expandedUserId === u.id ? "rotate-90" : ""}`} />
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">No feeds</span>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold uppercase tracking-tight ${u.admin ? 'text-orange-600' : 'text-muted-foreground'}`}>{u.admin ? "Admin" : "User"}</span>
                                  <Switch
                                    checked={u.admin}
                                    onCheckedChange={(checked) => handleToggleAdmin(u.id, checked)}
                                    disabled={u.id === user?.uid}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {editingUserId === u.id ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-3 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-all border-emerald-500/20"
                                      onClick={handleSaveUser}
                                    >
                                      <Save className="w-4 h-4 mr-1.5" />
                                      Save
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-3 rounded-lg"
                                      onClick={() => setEditingUserId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-all"
                                      onClick={() => handleEditUser(u)}
                                    >
                                      <Edit className="w-4 h-4 md:mr-1.5" />
                                      <span className="hidden md:inline">Edit</span>
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={u.id === user?.uid}
                                          className="h-8 md:h-9 px-2 md:px-3 bg-white/50 dark:bg-black/50 border-white/20 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-all"
                                        >
                                          <Trash2 className="w-4 h-4 md:mr-1.5" />
                                          <span className="hidden md:inline">Delete</span>
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="rounded-[2rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/90 dark:bg-black/90 shadow-2xl">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-2xl font-bold font-roboto text-destructive">Delete User Account?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-base text-muted-foreground font-roboto">
                                            Are you sure you want to permanently delete "{u.displayName || u.email}"? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="mt-6 border-0 bg-transparent gap-3 px-0 pb-0">
                                          <AlertDialogCancel className="h-11 rounded-xl bg-muted/50 border-0 hover:bg-muted transition-all">Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 border-0 text-white"
                                            onClick={() => handleDeleteUserAccount(u.id)}
                                          >
                                            Delete User
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Expanded pet feed details */}
                          {expandedUserId === u.id && u.petFeeds && u.petFeeds.length > 0 && (
                            <tr key={`${u.id}-feeds`}>
                              <td colSpan={5} className="px-6 md:px-8 py-4 bg-orange-50/30 dark:bg-orange-950/10">
                                <div className="pl-4 md:pl-12 space-y-3">
                                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                    <PawPrint className="w-3.5 h-3.5" />
                                    Pet Feed Details
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {u.petFeeds.map((feed, idx) => (
                                      <div key={idx} className="p-4 rounded-2xl bg-white/60 dark:bg-black/30 border border-white/40 dark:border-white/10 shadow-sm space-y-2">
                                        <div className="flex items-center gap-2">
                                          <Dog className="w-4 h-4 text-orange-500" />
                                          <span className="font-bold text-foreground">{feed.petName}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-xs">
                                          <div>
                                            <span className="text-muted-foreground">Type:</span>
                                            <span className="ml-1 font-semibold">{feed.petType}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Breed:</span>
                                            <span className="ml-1 font-semibold">{feed.petBreed}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Meal Days:</span>
                                            <span className="ml-1 font-semibold">{feed.mealDays}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Reminders:</span>
                                            <span className="ml-1 font-semibold">{feed.reminders ? "Yes" : "No"}</span>
                                          </div>
                                        </div>
                                        {feed.createdAt && (
                                          <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(feed.createdAt).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="w-8 h-8 opacity-20" />
                              <p className="font-medium">No users found.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="p-8 flex items-center justify-between border-t border-border/40">
                <span className="text-sm text-muted-foreground font-medium">
                  Showing {filteredUsers.length} of {users.length} users
                </span>
                <span className="text-sm font-bold text-orange-600">
                  {totalPetFeeds} total pet feed submissions
                </span>
              </CardFooter>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Deletion with Dependencies Alert */}
      <AlertDialog open={!!pendingDeletionCheck} onOpenChange={(open) => !open && setPendingDeletionCheck(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-white/30 dark:border-white/10 backdrop-blur-3xl bg-white/95 dark:bg-black/95 shadow-2xl p-0 overflow-hidden max-w-lg">
          <div className="p-8 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-destructive/10 rounded-2xl border border-destructive/20 shadow-inner">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="text-2xl font-bold tracking-tight">Cannot Delete Category</AlertDialogTitle>
                <AlertDialogDescription className="text-base text-muted-foreground mt-1">
                  "{pendingDeletionCheck?.name}" has active sub-categories.
                </AlertDialogDescription>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Related Sub-Categories:</p>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {pendingDeletionCheck?.subs.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 group hover:bg-muted/50 transition-all">
                    <ChevronRight className="w-4 h-4 text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                    <span className="font-bold text-sm text-foreground/90">{sub.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground leading-relaxed italic">
              Please delete or reassign these sub-categories first before deleting the parent category.
            </p>
          </div>

          <AlertDialogFooter className="bg-muted/30 p-6 border-t border-border/40 gap-3">
            <AlertDialogCancel className="h-12 rounded-xl border-0 bg-transparent hover:bg-muted font-bold px-8" onClick={() => setPendingDeletionCheck(null)}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-12 rounded-xl bg-destructive hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 font-bold px-8 border-0"
              onClick={() => confirmDeleteCategory(pendingDeletionCheck?.id || "")}
            >
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
