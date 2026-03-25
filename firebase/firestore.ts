import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
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
  content: string;
  categoryId: string;
  status: 'published' | 'draft';
  date: any;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  status?: 'published' | 'draft';
  createdAt?: Timestamp;
}

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
