import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  arrayUnion,
  increment
} from "firebase/firestore";
import { db } from "../firebase/firebase";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface Blog {
  id: string;
  title: string;
  slug: string;
  keywords: string;
  excerpt?: string;
  content: string;
  image?: string;
  categoryId: string;          // legacy single-category (kept for backward compat)
  categoryIds?: string[];      // multi-category support (primary field going forward)
  authorId?: string;
  authorName?: string;
  likes?: number;
  dislikes?: number;
  views?: number;
  commentsCount?: number;
  status: 'published' | 'draft';
  instagramAutoPost?: boolean;
  instagramCaption?: string;
  instagramPostId?: string;
  instagramPostStatus?: 'pending' | 'posted' | 'failed';
  instagramPostError?: string;
  date: any;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BlogComment {
  id: string;
  blogId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  content: string;
  createdAt?: Timestamp;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  admin: boolean;
  petFeeds?: PetFeedEntry[];
  createdAt?: any;
}

export interface PetFeedEntry {
  petName: string;
  petType: string;
  petBreed: string;
  mealDays: number;
  reminders: boolean;
  subscribe: boolean;
  createdAt?: any;
}

export interface Category {
  parentId?: string;
  id: string;
  name: string;
  description?: string;
  status?: 'published' | 'draft';
  createdAt?: Timestamp;
  imageUrl?: string;
  image?: boolean
}

export interface SubCategory {
  id: string;
  name: string;
  description?: string;
  parentCategoryId: string;
  status?: 'published' | 'draft';
  createdAt?: Timestamp;
}

export interface Subscription {
  id: string;
  email: string;
  name: string;
  phone: string;
  petBreed: string;
  subscribedAt: any;
}

export interface PetFeed {
  id?: string;
  userId?: string;
  name: string;
  phone: string;
  petType: string;
  petBreed: string;
  petName: string;
  mealDays: number;
  reminders: boolean;
  subscribe: boolean;
  createdAt?: any;
}

// ── USER OPERATIONS ──────────────────────────────────────────────────────────

export const getAdminUsers = async () => {
  const usersQuery = query(collection(db, "users"), where("admin", "==", true));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as UserProfile));
};

export const getAppUsers = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as UserProfile));
};

// Real-time listener for users
export const onUsersSnapshot = (callback: (users: UserProfile[]) => void) => {
  return onSnapshot(collection(db, "users"), (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as UserProfile));
    callback(users);
  });
};

export const updateUserRole = async (userId: string, isAdmin: boolean) => {
  const docRef = doc(db, "users", userId);
  return await updateDoc(docRef, { admin: isAdmin });
};

export const updateUser = async (userId: string, data: Partial<UserProfile>) => {
  const docRef = doc(db, "users", userId);
  return await updateDoc(docRef, data);
};

export const deleteUser = async (userId: string) => {
  const docRef = doc(db, "users", userId);
  return await deleteDoc(docRef);
};

// ── BLOG OPERATIONS ──────────────────────────────────────────────────────────

export const getBlogs = async () => {
  const blogsQuery = query(collection(db, "blogs"), orderBy("date", "desc"));
  const snapshot = await getDocs(blogsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Format date for the UI
    date: doc.data().date?.toDate ? doc.data().date.toDate().toISOString().split('T')[0] : doc.data().date
  } as Blog));
};

export const getBlog = async (id: string) => {
  const docRef = doc(db, "blogs", id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : data.date
    } as Blog;
  }
  return null;
};

export const addBlog = async (blog: Omit<Blog, "id" | "date">) => {
  return await addDoc(collection(db, "blogs"), {
    ...blog,
    date: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateBlog = async (id: string, blog: Partial<Blog>) => {
  const docRef = doc(db, "blogs", id);
  return await updateDoc(docRef, {
    ...blog,
    updatedAt: serverTimestamp(),
  });
};

export const deleteBlog = async (id: string) => {
  const docRef = doc(db, "blogs", id);
  return await deleteDoc(docRef);
};

// Real-time listener for blogs
export const onBlogsSnapshot = (callback: (blogs: Blog[]) => void) => {
  const blogsQuery = query(collection(db, "blogs"), orderBy("date", "desc"));
  return onSnapshot(blogsQuery, (snapshot) => {
    const blogs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate ? d.data().date.toDate().toISOString().split('T')[0] : d.data().date
    } as Blog));
    callback(blogs);
  });
};

export const incrementBlogLikes = async (blogId: string) => {
  const docRef = doc(db, "blogs", blogId);
  return await updateDoc(docRef, { likes: increment(1) });
};

export const incrementBlogDislikes = async (blogId: string) => {
  const docRef = doc(db, "blogs", blogId);
  return await updateDoc(docRef, { dislikes: increment(1) });
};

export const incrementBlogViews = async (blogId: string) => {
  const docRef = doc(db, "blogs", blogId);
  return await updateDoc(docRef, { views: increment(1) });
};

export const addBlogComment = async (blogId: string, payload: Omit<BlogComment, "id" | "blogId" | "createdAt">) => {
  const commentRef = collection(db, "blogs", blogId, "comments");
  await addDoc(commentRef, {
    ...payload,
    blogId,
    createdAt: serverTimestamp(),
  });

  const blogRef = doc(db, "blogs", blogId);
  await updateDoc(blogRef, {
    commentsCount: increment(1),
    updatedAt: serverTimestamp(),
  });
};

export const onBlogCommentsSnapshot = (
  blogId: string,
  callback: (comments: BlogComment[]) => void
) => {
  const commentsQuery = query(
    collection(db, "blogs", blogId, "comments"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(commentsQuery, (snapshot) => {
    const comments = snapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
    } as BlogComment));
    callback(comments);
  });
};

export const getBlogBySlug = async (slug: string): Promise<Blog | null> => {
  const q = query(collection(db, "blogs"), where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  const data = docData.data();
  return {
    id: docData.id,
    ...data,
    date: data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : data.date
  } as Blog;
};

// ── CATEGORY OPERATIONS ──────────────────────────────────────────────────────

export const getCategories = async () => {
  const snapshot = await getDocs(collection(db, "categories"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Category));
};

export const getCategory = async (id: string) => {
  const docRef = doc(db, "categories", id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Category;
  }
  return null;
};

export const addCategory = async (category: Omit<Category, "id">) => {
  return await addDoc(collection(db, "categories"), {
    ...category,
    createdAt: serverTimestamp(),
  });
};

export const updateCategory = async (id: string, category: Partial<Category>) => {
  const docRef = doc(db, "categories", id);
  return await updateDoc(docRef, category);
};

export const deleteCategory = async (id: string) => {
  const docRef = doc(db, "categories", id);
  return await deleteDoc(docRef);
};

// ── SUB-CATEGORY OPERATIONS ─────────────────────────────────────────────────

export const getSubCategories = async () => {
  const snapshot = await getDocs(collection(db, "subcategories"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as SubCategory));
};

export const getSubCategoriesByParent = async (parentCategoryId: string) => {
  const q = query(collection(db, "subcategories"), where("parentCategoryId", "==", parentCategoryId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as SubCategory));
};

export const getSubCategory = async (id: string) => {
  const docRef = doc(db, "subcategories", id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as SubCategory;
  }
  return null;
};

export const addSubCategory = async (subCategory: Omit<SubCategory, "id">) => {
  return await addDoc(collection(db, "subcategories"), {
    ...subCategory,
    createdAt: serverTimestamp(),
  });
};

export const updateSubCategory = async (id: string, subCategory: Partial<SubCategory>) => {
  const docRef = doc(db, "subcategories", id);
  return await updateDoc(docRef, subCategory);
};

export const deleteSubCategory = async (id: string) => {
  const docRef = doc(db, "subcategories", id);
  return await deleteDoc(docRef);
};

// ── SUBSCRIPTION OPERATIONS ──────────────────────────────────────────────────

export const getSubscriptions = async () => {
  const q = query(collection(db, "subscriptions"), orderBy("subscribedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    subscribedAt: doc.data().subscribedAt?.toDate ? doc.data().subscribedAt.toDate().toISOString() : doc.data().subscribedAt
  } as Subscription));
};

export const addSubscription = async (sub: Omit<Subscription, "id" | "subscribedAt">) => {
  return await addDoc(collection(db, "subscriptions"), {
    ...sub,
    subscribedAt: serverTimestamp(),
  });
};

// ── PET FEED OPERATIONS ─────────────────────────────────────────────────────

export const getPetFeeds = async () => {
  const q = query(collection(db, "petFeeds"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
  } as PetFeed));
};

export const savePetFeed = async (data: PetFeed) => {
  // Save to petFeeds collection
  const feedDoc = await addDoc(collection(db, "petFeeds"), {
    ...data,
    createdAt: serverTimestamp(),
  });

  // Also save pet feed entry under user's document if userId is provided
  if (data.userId) {
    const userDocRef = doc(db, "users", data.userId);
    await updateDoc(userDocRef, {
      phone: data.phone,
      petFeeds: arrayUnion({
        petName: data.petName,
        petType: data.petType,
        petBreed: data.petBreed,
        mealDays: data.mealDays,
        reminders: data.reminders,
        subscribe: data.subscribe,
        createdAt: new Date().toISOString(),
      }),
    });
  }

  return feedDoc;
};
