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
  Timestamp
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
  categoryId: string;
  authorId?: string;
  authorName?: string;
  status: 'published' | 'draft';
  date: any;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  admin: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  status?: 'published' | 'draft';
  createdAt?: Timestamp;
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
    return { id: snapshot.id, ...snapshot.data() } as Blog;
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

export const getBlogBySlug = async (slug: string): Promise<Blog | null> => {
  const q = query(collection(db, "blogs"), where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Blog;
};

// ── CATEGORY OPERATIONS ──────────────────────────────────────────────────────

export const getCategories = async () => {
  const snapshot = await getDocs(collection(db, "categories"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Category));
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
